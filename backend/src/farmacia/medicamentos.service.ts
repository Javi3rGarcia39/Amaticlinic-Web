import {
  BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Medicamento } from './entities/medicamento.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { LoteMedicamento } from './entities/lote-medicamento.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { AjusteStockDto, CreateMedicamentoDto, EntradaStockDto, UpdateMedicamentoDto } from './dto/medicamento.dto';
import { TipoMovimiento } from '../common/enums';
import { LotesService, DIAS_POR_VENCER } from './lotes.service';
import { CatalogosService } from '../catalogos/catalogos.service';
import { fechaLocal, redondear, sumarDias } from '../common/utils/fechas';

// [Farmacia] Catalogo de medicamentos e inventario. Toda variacion de stock pasa por aqui y deja
// un registro en el kardex (movimiento_inventario) con el usuario responsable.
// [Lotes] Las entradas crean lotes y las salidas consumen lotes en orden FIFO o LIFO.
@Injectable()
export class MedicamentosService {
  constructor(
    @InjectRepository(Medicamento) private repo: Repository<Medicamento>,
    @InjectRepository(MovimientoInventario) private movRepo: Repository<MovimientoInventario>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    @InjectRepository(LoteMedicamento) private loteRepo: Repository<LoteMedicamento>,
    private dataSource: DataSource,
    private lotes: LotesService,
    private catalogos: CatalogosService,
  ) {}

  private async usuarioActual(correo: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { correo } });
    if (!usuario) throw new UnauthorizedException('Usuario de la sesion no encontrado');
    return usuario;
  }

  listar(buscar?: string, incluirInactivos = false): Promise<Medicamento[]> {
    const qb = this.repo.createQueryBuilder('m').orderBy('m.nombre', 'ASC');
    if (!incluirInactivos) qb.andWhere('m.activo = true');
    if (buscar?.trim()) {
      qb.andWhere('(LOWER(m.nombre) LIKE :q OR LOWER(m.principioActivo) LIKE :q)', {
        q: `%${buscar.trim().toLowerCase()}%`,
      });
    }
    return qb.getMany();
  }

  async obtener(id: number): Promise<Medicamento> {
    const med = await this.repo.findOne({ where: { id } });
    if (!med) throw new NotFoundException('Medicamento no encontrado');
    return med;
  }

  stockBajo(): Promise<Medicamento[]> {
    return this.repo
      .createQueryBuilder('m')
      .where('m.activo = true')
      .andWhere('m.stock <= m.stockMinimo')
      .orderBy('m.stock', 'ASC')
      .getMany();
  }

  // Regla: no puede haber dos medicamentos activos con el mismo nombre, presentacion y concentracion
  private async validarDuplicado(nombre: string, presentacion: string, concentracion: string | undefined, excluirId?: number) {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.activo = true')
      .andWhere('LOWER(m.nombre) = :n', { n: nombre.trim().toLowerCase() })
      .andWhere('LOWER(m.presentacion) = :p', { p: presentacion.trim().toLowerCase() })
      .andWhere("LOWER(COALESCE(m.concentracion, '')) = :c", { c: (concentracion ?? '').trim().toLowerCase() });
    if (excluirId) qb.andWhere('m.id <> :id', { id: excluirId });
    if (await qb.getCount()) {
      throw new ConflictException(`Ya existe el medicamento ${nombre} ${presentacion} ${concentracion ?? ''}`.trim());
    }
  }

  async crear(dto: CreateMedicamentoDto, correo: string): Promise<Medicamento> {
    await this.validarDuplicado(dto.nombre, dto.presentacion, dto.concentracion);
    const usuario = await this.usuarioActual(correo);

    return this.dataSource.transaction(async (manager) => {
      const med = await manager.save(
        manager.create(Medicamento, {
          nombre: dto.nombre.trim(),
          principioActivo: dto.principioActivo.trim(),
          presentacion: dto.presentacion.trim(),
          concentracion: dto.concentracion?.trim(),
          stock: dto.stock ?? 0,
          stockMinimo: dto.stockMinimo ?? 10,
          precio: dto.precio ?? 0,
          requiereReceta: dto.requiereReceta ?? true,
        }),
      );
      // El stock inicial tambien queda en el kardex, como primer lote
      if (med.stock > 0) {
        const lote = await this.lotes.crearLote(manager, med, med.stock, {
          codigo: dto.codigoLote,
          fechaVencimiento: dto.fechaVencimiento,
          costoUnitario: dto.costoUnitario,
        });
        await manager.save(
          manager.create(MovimientoInventario, {
            medicamento: med, tipo: TipoMovimiento.Entrada, cantidad: med.stock,
            stockResultante: med.stock, motivo: 'Stock inicial', usuario,
            lote, costoUnitario: lote.costoUnitario,
          }),
        );
      }
      return med;
    });
  }

  async actualizar(id: number, dto: UpdateMedicamentoDto): Promise<Medicamento> {
    const med = await this.obtener(id);
    const nombre = dto.nombre ?? med.nombre;
    const presentacion = dto.presentacion ?? med.presentacion;
    const concentracion = dto.concentracion ?? med.concentracion;
    if (dto.activo !== false) await this.validarDuplicado(nombre, presentacion, concentracion, id);

    Object.entries(dto).forEach(([k, v]) => {
      if (v !== undefined) (med as any)[k] = typeof v === 'string' ? v.trim() : v;
    });
    return this.repo.save(med);
  }

  // Los medicamentos tienen recetas y kardex asociados: se desactivan en lugar de borrarse
  async desactivar(id: number): Promise<Medicamento> {
    const med = await this.obtener(id);
    med.activo = false;
    return this.repo.save(med);
  }

  private async bloquear(manager: EntityManager, id: number): Promise<Medicamento> {
    // Bloqueo de fila: evita que una entrada y un despacho simultaneos pisen el stock
    const med = await manager.findOne(Medicamento, { where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!med) throw new NotFoundException('Medicamento no encontrado');
    return med;
  }

  // [Lotes] Cada entrada de mercaderia es un lote nuevo con su costo y vencimiento
  async registrarEntrada(id: number, dto: EntradaStockDto, correo: string): Promise<Medicamento> {
    const usuario = await this.usuarioActual(correo);
    return this.dataSource.transaction(async (manager) => {
      const med = await this.bloquear(manager, id);
      if (!med.activo) throw new BadRequestException('No se puede ingresar stock a un medicamento desactivado');
      await this.lotes.sincronizar(manager, med);

      const lote = await this.lotes.crearLote(manager, med, dto.cantidad, {
        codigo: dto.codigoLote,
        fechaVencimiento: dto.fechaVencimiento,
        costoUnitario: dto.costoUnitario,
        proveedor: dto.proveedor,
      });
      med.stock += dto.cantidad;
      await manager.update(Medicamento, med.id, { stock: med.stock });
      await manager.save(
        manager.create(MovimientoInventario, {
          medicamento: med, tipo: TipoMovimiento.Entrada, cantidad: dto.cantidad,
          stockResultante: med.stock, motivo: dto.motivo?.trim() || 'Ingreso de mercaderia', usuario,
          lote, costoUnitario: lote.costoUnitario,
        }),
      );
      return med;
    });
  }

  // [Lotes] Ajuste positivo: crea un lote. Ajuste negativo: sale de un lote indicado (ej. vencido)
  // o, si no se indica, de los lotes en el orden del metodo configurado (incluye vencidos).
  async registrarAjuste(id: number, dto: AjusteStockDto, correo: string): Promise<Medicamento> {
    if (dto.cantidad === 0) throw new BadRequestException('El ajuste debe ser distinto de 0');
    const usuario = await this.usuarioActual(correo);
    const metodo = await this.catalogos.metodoInventario();

    return this.dataSource.transaction(async (manager) => {
      const med = await this.bloquear(manager, id);
      if (med.stock + dto.cantidad < 0) {
        throw new BadRequestException(`El ajuste dejaria el stock en negativo (stock actual: ${med.stock})`);
      }
      await this.lotes.sincronizar(manager, med);

      if (dto.cantidad > 0) {
        const lote = await this.lotes.crearLote(manager, med, dto.cantidad, { codigo: undefined, proveedor: 'Ajuste de inventario' });
        med.stock += dto.cantidad;
        await manager.update(Medicamento, med.id, { stock: med.stock });
        await manager.save(
          manager.create(MovimientoInventario, {
            medicamento: med, tipo: TipoMovimiento.Ajuste, cantidad: dto.cantidad,
            stockResultante: med.stock, motivo: dto.motivo.trim(), usuario, lote, costoUnitario: lote.costoUnitario,
          }),
        );
        return med;
      }

      const consumos = await this.lotes.consumir(manager, med, -dto.cantidad, metodo, {
        incluirVencidos: true,
        idLote: dto.idLote,
      });
      for (const c of consumos) {
        med.stock -= c.cantidad;
        await manager.save(
          manager.create(MovimientoInventario, {
            medicamento: med, tipo: TipoMovimiento.Ajuste, cantidad: -c.cantidad,
            stockResultante: med.stock, motivo: dto.motivo.trim(), usuario,
            lote: c.lote, costoUnitario: c.lote.costoUnitario,
          }),
        );
      }
      await manager.update(Medicamento, med.id, { stock: med.stock });
      return med;
    });
  }

  movimientos(idMedicamento?: number): Promise<MovimientoInventario[]> {
    // QueryBuilder para traer solo el codigo de la receta (y no todas sus relaciones eager)
    const qb = this.movRepo
      .createQueryBuilder('mov')
      .leftJoinAndSelect('mov.medicamento', 'med')
      .leftJoinAndSelect('mov.usuario', 'u')
      .leftJoinAndSelect('mov.lote', 'lote')
      .leftJoin('mov.receta', 'r')
      .addSelect(['r.id', 'r.codigo'])
      .orderBy('mov.fecha', 'DESC')
      .addOrderBy('mov.id', 'DESC')
      .limit(300);
    if (idMedicamento) qb.where('med.id = :id', { id: idMedicamento });
    return qb.getMany();
  }

  // ------------------------------------------------------------------ [Lotes] consultas

  /** Lotes de un medicamento (primero sincroniza por si hay stock sin lote) */
  async lotesDe(id: number, incluirAgotados = false): Promise<{ medicamento: Medicamento; lotes: LoteMedicamento[] }> {
    const medicamento = await this.dataSource.transaction(async (manager) => {
      const med = await this.bloquear(manager, id);
      await this.lotes.sincronizar(manager, med);
      return med;
    });
    return { medicamento, lotes: await this.lotes.listarPorMedicamento(id, incluirAgotados) };
  }

  /** Sincroniza los lotes de todos los medicamentos (uso interno de los reportes) */
  private async sincronizarTodos() {
    const meds = await this.repo.find({ where: { activo: true } });
    for (const m of meds) {
      await this.dataSource.transaction(async (manager) => {
        const med = await this.bloquear(manager, m.id);
        await this.lotes.sincronizar(manager, med);
      });
    }
  }

  // [Lotes] Valuacion del inventario: valor de lo que queda en bodega (lotes * costo),
  // costo de lo despachado y margen de los ultimos 30 dias.
  async valuacion() {
    await this.sincronizarTodos();
    const metodo = await this.catalogos.metodoInventario();
    const hoy = fechaLocal();
    const limiteVencer = sumarDias(hoy, DIAS_POR_VENCER);

    const meds = await this.repo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
    const lotes = await this.loteRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.medicamento', 'm')
      .where('l.cantidad_disponible > 0')
      .getMany();

    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    const ventas = await this.movRepo
      .createQueryBuilder('mov')
      .select('mov.id_medicamento', 'id')
      .addSelect('COALESCE(SUM(-mov.cantidad), 0)', 'unidades')
      .addSelect('COALESCE(SUM(-mov.cantidad * COALESCE(mov.costo_unitario, 0)), 0)', 'costo')
      .addSelect('COALESCE(SUM(COALESCE(mov.monto_venta, 0)), 0)', 'venta')
      .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
      .andWhere('mov.fecha >= :d', { d: desde })
      .groupBy('mov.id_medicamento')
      .getRawMany();
    const ventasPorMed = new Map(ventas.map((v) => [Number(v.id), v]));

    const detalle = meds.map((m) => {
      const suyos = lotes.filter((l) => l.medicamento.id === m.id);
      const valor = suyos.reduce((s, l) => s + l.cantidadDisponible * Number(l.costoUnitario), 0);
      const vencidas = suyos.filter((l) => l.fechaVencimiento && l.fechaVencimiento < hoy).reduce((s, l) => s + l.cantidadDisponible, 0);
      const porVencer = suyos
        .filter((l) => l.fechaVencimiento && l.fechaVencimiento >= hoy && l.fechaVencimiento <= limiteVencer)
        .reduce((s, l) => s + l.cantidadDisponible, 0);
      const v = ventasPorMed.get(m.id);
      const costoVentas = Number(v?.costo ?? 0);
      const venta = Number(v?.venta ?? 0);
      return {
        idMedicamento: m.id,
        medicamento: m.nombre,
        presentacion: `${m.presentacion} ${m.concentracion ?? ''}`.trim(),
        stock: m.stock,
        lotes: suyos.length,
        costoPromedio: m.stock > 0 ? redondear(valor / m.stock) : 0,
        valorInventario: redondear(valor),
        valorVenta: redondear(m.stock * Number(m.precio)),
        unidadesVencidas: vencidas,
        unidadesPorVencer: porVencer,
        unidadesVendidas30: Number(v?.unidades ?? 0),
        costoVentas30: redondear(costoVentas),
        ventas30: redondear(venta),
        margen30: redondear(venta - costoVentas),
      };
    });

    const suma = (k: keyof (typeof detalle)[number]) => redondear(detalle.reduce((s, d) => s + Number(d[k]), 0));
    return {
      metodo,
      totales: {
        valorInventario: suma('valorInventario'),
        valorVenta: suma('valorVenta'),
        unidades: suma('stock'),
        unidadesVencidas: suma('unidadesVencidas'),
        unidadesPorVencer: suma('unidadesPorVencer'),
        costoVentas30: suma('costoVentas30'),
        ventas30: suma('ventas30'),
        margen30: suma('margen30'),
      },
      detalle,
    };
  }

  /** Lotes vencidos o por vencer (para alertas del panel) */
  async lotesEnRiesgo() {
    const hoy = fechaLocal();
    const limite = sumarDias(hoy, DIAS_POR_VENCER);
    return this.loteRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.medicamento', 'm')
      .where('l.cantidad_disponible > 0')
      .andWhere('l.fecha_vencimiento IS NOT NULL')
      .andWhere('l.fecha_vencimiento <= :limite', { limite })
      .andWhere('m.activo = true')
      .orderBy('l.fecha_vencimiento', 'ASC')
      .getMany();
  }
}
