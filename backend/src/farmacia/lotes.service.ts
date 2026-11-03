import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { LoteMedicamento } from './entities/lote-medicamento.entity';
import { Medicamento } from './entities/medicamento.entity';
import { MetodoInventario } from '../catalogos/catalogos.service';
import { fechaLocal, redondear, sumarDias } from '../common/utils/fechas';

export interface Consumo {
  lote: LoteMedicamento;
  cantidad: number;
}

export interface DatosLote {
  codigo?: string;
  fechaVencimiento?: string | null;
  costoUnitario?: number;
  proveedor?: string | null;
  fechaIngreso?: Date;
}

// Costo estimado para el stock que existia antes de manejar lotes (no se conocia el costo real)
const FACTOR_COSTO_ESTIMADO = 0.7;
export const DIAS_POR_VENCER = 60;

// [Lotes] Manejo de lotes y metodos de salida FIFO / LIFO.
//  - FIFO: sale primero el lote que ingreso primero (lo mas antiguo).
//  - LIFO: sale primero el lote que ingreso de ultimo (lo mas reciente).
// En ambos casos los lotes vencidos NO se despachan; solo se pueden dar de baja con un ajuste.
// Todos los metodos reciben el EntityManager de la transaccion del llamador, que ya tiene
// bloqueada la fila del medicamento, asi que no hay carreras entre despachos.
@Injectable()
export class LotesService {
  constructor(@InjectRepository(LoteMedicamento) private repo: Repository<LoteMedicamento>) {}

  static estadoLote(l: { fechaVencimiento: string | null; cantidadDisponible: number }): 'Agotado' | 'Vencido' | 'PorVencer' | 'Vigente' {
    if (l.cantidadDisponible <= 0) return 'Agotado';
    if (!l.fechaVencimiento) return 'Vigente';
    const hoy = fechaLocal();
    if (l.fechaVencimiento < hoy) return 'Vencido';
    if (l.fechaVencimiento <= sumarDias(hoy, DIAS_POR_VENCER)) return 'PorVencer';
    return 'Vigente';
  }

  private ordenar(metodo: MetodoInventario): 'ASC' | 'DESC' {
    return metodo === 'LIFO' ? 'DESC' : 'ASC';
  }

  /** Codigo automatico: L-AAMMDD-NNN */
  private async generarCodigo(manager: EntityManager, idMedicamento: number): Promise<string> {
    const hoy = fechaLocal().replace(/-/g, '').slice(2);
    const n = await manager.count(LoteMedicamento, { where: { medicamento: { id: idMedicamento } } });
    return `L-${hoy}-${String(n + 1).padStart(3, '0')}`;
  }

  async ultimoCosto(manager: EntityManager, med: Medicamento): Promise<number> {
    const ultimo = await manager
      .createQueryBuilder(LoteMedicamento, 'l')
      .where('l.id_medicamento = :id', { id: med.id })
      .orderBy('l.fecha_ingreso', 'DESC')
      .addOrderBy('l.id_lote', 'DESC')
      .getOne();
    return ultimo ? Number(ultimo.costoUnitario) : redondear(Number(med.precio) * FACTOR_COSTO_ESTIMADO);
  }

  async crearLote(manager: EntityManager, med: Medicamento, cantidad: number, datos: DatosLote): Promise<LoteMedicamento> {
    if (cantidad <= 0) throw new BadRequestException('La cantidad del lote debe ser mayor a 0');
    if (datos.fechaVencimiento && datos.fechaVencimiento < fechaLocal()) {
      throw new BadRequestException('No se puede ingresar un lote que ya esta vencido');
    }
    const codigo = datos.codigo?.trim() || (await this.generarCodigo(manager, med.id));
    const repetido = await manager
      .createQueryBuilder(LoteMedicamento, 'l')
      .where('l.id_medicamento = :id', { id: med.id })
      .andWhere('LOWER(l.codigo) = :c', { c: codigo.toLowerCase() })
      .getCount();
    if (repetido) throw new ConflictException(`El lote ${codigo} ya existe para ${med.nombre}`);

    const costo = datos.costoUnitario !== undefined && datos.costoUnitario !== null
      ? redondear(datos.costoUnitario)
      : await this.ultimoCosto(manager, med);

    return manager.save(
      manager.create(LoteMedicamento, {
        medicamento: { id: med.id } as Medicamento,
        codigo,
        fechaIngreso: datos.fechaIngreso ?? new Date(),
        fechaVencimiento: datos.fechaVencimiento || null,
        costoUnitario: costo,
        cantidadInicial: cantidad,
        cantidadDisponible: cantidad,
        proveedor: datos.proveedor?.trim() || null,
      }),
    );
  }

  /**
   * Garantiza que la suma de los lotes sea igual al stock del medicamento.
   * Cubre el stock que existia antes de manejar lotes y los cambios hechos directo en la base
   * (por ejemplo con los scripts SQL de datos de prueba).
   */
  async sincronizar(manager: EntityManager, med: Medicamento): Promise<void> {
    const fila = await manager
      .createQueryBuilder(LoteMedicamento, 'l')
      .select('COALESCE(SUM(l.cantidad_disponible), 0)', 'suma')
      .addSelect('COUNT(*)', 'total')
      .where('l.id_medicamento = :id', { id: med.id })
      .getRawOne();
    const suma = Number(fila?.suma ?? 0);
    const diferencia = med.stock - suma;

    if (diferencia > 0) {
      const sinLotes = Number(fila?.total ?? 0) === 0;
      await manager.save(
        manager.create(LoteMedicamento, {
          medicamento: { id: med.id } as Medicamento,
          codigo: sinLotes ? 'INICIAL' : `SALDO-${fechaLocal().replace(/-/g, '')}-${Date.now() % 1000}`,
          fechaIngreso: sinLotes ? new Date(2000, 0, 1) : new Date(),
          fechaVencimiento: null,
          costoUnitario: await this.ultimoCosto(manager, med),
          cantidadInicial: diferencia,
          cantidadDisponible: diferencia,
          proveedor: 'Saldo previo al control por lotes',
        }),
      );
    } else if (diferencia < 0) {
      // Hay mas en lotes que en el stock: se corrigen los lotes mas antiguos
      let sobrante = -diferencia;
      const lotes = await manager
        .createQueryBuilder(LoteMedicamento, 'l')
        .where('l.id_medicamento = :id', { id: med.id })
        .andWhere('l.cantidad_disponible > 0')
        .orderBy('l.fecha_ingreso', 'ASC')
        .addOrderBy('l.id_lote', 'ASC')
        .getMany();
      for (const l of lotes) {
        if (sobrante <= 0) break;
        const quitar = Math.min(sobrante, l.cantidadDisponible);
        await manager.update(LoteMedicamento, l.id, { cantidadDisponible: l.cantidadDisponible - quitar });
        sobrante -= quitar;
      }
    }
  }

  /** Lotes con existencia en el orden en que deben salir */
  async lotesEnOrden(manager: EntityManager, idMedicamento: number, metodo: MetodoInventario, incluirVencidos: boolean) {
    const qb = manager
      .createQueryBuilder(LoteMedicamento, 'l')
      .setLock('pessimistic_write')
      .where('l.id_medicamento = :id', { id: idMedicamento })
      .andWhere('l.cantidad_disponible > 0')
      .orderBy('l.fecha_ingreso', this.ordenar(metodo))
      .addOrderBy('l.id_lote', this.ordenar(metodo));
    if (!incluirVencidos) {
      qb.andWhere('(l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= :hoy)', { hoy: fechaLocal() });
    }
    return qb.getMany();
  }

  /** Unidades que se pueden despachar (excluye lotes vencidos) */
  async disponibleVendible(manager: EntityManager, idMedicamento: number): Promise<number> {
    const fila = await manager
      .createQueryBuilder(LoteMedicamento, 'l')
      .select('COALESCE(SUM(l.cantidad_disponible), 0)', 'suma')
      .where('l.id_medicamento = :id', { id: idMedicamento })
      .andWhere('(l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= :hoy)', { hoy: fechaLocal() })
      .getRawOne();
    return Number(fila?.suma ?? 0);
  }

  /**
   * Descuenta la cantidad de los lotes segun el metodo. Devuelve cuanto salio de cada lote.
   * No modifica medicamento.stock: eso lo hace el llamador.
   */
  async consumir(
    manager: EntityManager,
    med: Medicamento,
    cantidad: number,
    metodo: MetodoInventario,
    opciones: { incluirVencidos?: boolean; idLote?: number } = {},
  ): Promise<Consumo[]> {
    let lotes: LoteMedicamento[];
    if (opciones.idLote) {
      const lote = await manager.findOne(LoteMedicamento, {
        where: { id: opciones.idLote, medicamento: { id: med.id } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lote) throw new NotFoundException('El lote no existe o no pertenece a este medicamento');
      lotes = [lote];
    } else {
      lotes = await this.lotesEnOrden(manager, med.id, metodo, !!opciones.incluirVencidos);
    }

    const disponible = lotes.reduce((s, l) => s + l.cantidadDisponible, 0);
    if (disponible < cantidad) {
      throw new ConflictException(
        opciones.idLote
          ? `El lote solo tiene ${disponible} unidades`
          : `Stock insuficiente de ${med.nombre}: se necesitan ${cantidad} y hay ${disponible} disponibles`,
      );
    }

    const consumos: Consumo[] = [];
    let pendiente = cantidad;
    for (const lote of lotes) {
      if (pendiente <= 0) break;
      const sale = Math.min(pendiente, lote.cantidadDisponible);
      lote.cantidadDisponible -= sale;
      await manager.update(LoteMedicamento, lote.id, { cantidadDisponible: lote.cantidadDisponible });
      consumos.push({ lote, cantidad: sale });
      pendiente -= sale;
    }
    return consumos;
  }

  listarPorMedicamento(idMedicamento: number, incluirAgotados = false) {
    const qb = this.repo
      .createQueryBuilder('l')
      .where('l.id_medicamento = :id', { id: idMedicamento })
      .orderBy('l.fecha_ingreso', 'ASC')
      .addOrderBy('l.id_lote', 'ASC');
    if (!incluirAgotados) qb.andWhere('l.cantidad_disponible > 0');
    return qb.getMany();
  }
}
