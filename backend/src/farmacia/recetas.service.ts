import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Receta } from './entities/receta.entity';
import { DetalleReceta } from './entities/detalle-receta.entity';
import { Medicamento } from './entities/medicamento.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { Cita } from '../citas/cita.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { AnularRecetaDto, CreateRecetaDto, DespacharRecetaDto, VerificarAlergiasDto } from './dto/receta.dto';
import { EstadoCita, EstadoReceta, TipoMovimiento, TipoNotificacion, TipoUsuario } from '../common/enums';
import { detectarAlergias, fechaLocal } from './farmacia.utils';
import { LotesService } from './lotes.service'; // [Lotes]
import { CatalogosService } from '../catalogos/catalogos.service'; // [Seguros]
import { redondear, sumarDias } from '../common/utils/fechas';
import { DIAS_POR_VENCER } from './lotes.service';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

const DIAS_VIGENCIA_RECETA = 30;

export interface UsuarioSesion {
  correo: string;
  tipoUsuario: string;
}

// [Farmacia] Receta electronica: emision por el medico, control de alergias, despacho transaccional
// con descuento de inventario y anulacion.
@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(Receta) private repo: Repository<Receta>,
    @InjectRepository(Medicamento) private medRepo: Repository<Medicamento>,
    @InjectRepository(MovimientoInventario) private movRepo: Repository<MovimientoInventario>,
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    @InjectRepository(Paciente) private pacienteRepo: Repository<Paciente>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    private dataSource: DataSource,
    private notificacionesService: NotificacionesService,
    private lotes: LotesService,
    private catalogos: CatalogosService,
  ) {}

  // ---------------------------------------------------------------- helpers

  private async usuarioActual(correo: string): Promise<Usuario> {
    const usuario = await this.usuarioRepo.findOne({ where: { correo } });
    if (!usuario) throw new UnauthorizedException('Usuario de la sesion no encontrado');
    return usuario;
  }

  private async medicoActual(correo: string): Promise<Medico> {
    const usuario = await this.usuarioActual(correo);
    const medico = await this.medicoRepo.findOne({ where: { usuario: { id: usuario.id } } });
    if (!medico) throw new ForbiddenException('El usuario de la sesion no tiene perfil de medico');
    return medico;
  }

  private async generarCodigo(): Promise<string> {
    // Sin 0/O/1/I para que el codigo sea facil de dictar o escribir en farmacia
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let intento = 0; intento < 5; intento++) {
      const bytes = randomBytes(6);
      const codigo = 'RX-' + Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join('');
      if ((await this.repo.count({ where: { codigo } })) === 0) return codigo;
    }
    throw new ConflictException('No se pudo generar un codigo de receta unico, intente de nuevo');
  }

  /** Un paciente solo puede ver sus propias recetas; medicos, farmacia y recepcion ven todas. */
  private verificarAcceso(receta: Receta, usuario: UsuarioSesion) {
    if (usuario.tipoUsuario === TipoUsuario.Paciente && receta.paciente.usuario.correo !== usuario.correo) {
      throw new ForbiddenException('No tiene permiso para ver esta receta');
    }
  }

  // ---------------------------------------------------------------- consultas

  async obtener(id: number, usuario?: UsuarioSesion): Promise<Receta> {
    const receta = await this.repo.findOne({ where: { id } });
    if (!receta) throw new NotFoundException('Receta no encontrada');
    if (usuario) this.verificarAcceso(receta, usuario);
    return receta;
  }

  async porCodigo(codigo: string): Promise<Receta> {
    const receta = await this.repo.findOne({ where: { codigo: codigo.trim().toUpperCase() } });
    if (!receta) throw new NotFoundException(`No existe una receta con codigo ${codigo}`);
    return receta;
  }

  listar(estado?: EstadoReceta): Promise<Receta[]> {
    return this.repo.find({
      where: estado ? { estado } : {},
      order: { fechaEmision: 'DESC' },
    });
  }

  async porPaciente(idPaciente: number, usuario: UsuarioSesion): Promise<Receta[]> {
    if (usuario.tipoUsuario === TipoUsuario.Paciente) {
      const paciente = await this.pacienteRepo.findOne({ where: { id: idPaciente } });
      if (!paciente || paciente.usuario.correo !== usuario.correo) {
        throw new ForbiddenException('Solo puede consultar sus propias recetas');
      }
    }
    return this.repo.find({ where: { paciente: { id: idPaciente } }, order: { fechaEmision: 'DESC' } });
  }

  porMedico(idMedico: number): Promise<Receta[]> {
    return this.repo.find({ where: { medico: { id: idMedico } }, order: { fechaEmision: 'DESC' } });
  }

  async porCita(idCita: number, usuario: UsuarioSesion): Promise<Receta[]> {
    const recetas = await this.repo.find({ where: { cita: { id: idCita } }, order: { fechaEmision: 'DESC' } });
    recetas.forEach((r) => this.verificarAcceso(r, usuario));
    return recetas;
  }

  async verificarAlergias(dto: VerificarAlergiasDto) {
    const paciente = await this.pacienteRepo.findOne({ where: { id: dto.idPaciente } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    const medicamentos = dto.idsMedicamento.length ? await this.medRepo.findBy({ id: In(dto.idsMedicamento) }) : [];
    return {
      alergiasPaciente: paciente.alergias || null,
      alertas: detectarAlergias(paciente.alergias, medicamentos),
    };
  }

  // ---------------------------------------------------------------- emision

  async emitir(dto: CreateRecetaDto, correo: string): Promise<Receta> {
    const medico = await this.medicoActual(correo);

    const cita = await this.citaRepo.findOne({ where: { id: dto.idCita, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!cita) throw new NotFoundException('Cita no encontrada');

    // Regla 1: solo el medico que atendio la cita puede recetar
    if (cita.medico.id !== medico.id) {
      throw new ForbiddenException('Solo el medico que atendio la cita puede emitir la receta');
    }
    // Regla 2: la consulta debe haberse realizado
    if (cita.estado !== EstadoCita.Completada) {
      throw new BadRequestException('La cita debe estar Completada para emitir una receta');
    }
    // Regla 3: una sola receta vigente por cita
    const existente = await this.repo.findOne({
      where: { cita: { id: cita.id }, estado: Not(EstadoReceta.Anulada) },
    });
    if (existente) {
      throw new ConflictException(`Esta cita ya tiene una receta vigente (${existente.codigo}). Anulela para emitir otra.`);
    }

    // Regla 4: medicamentos existentes, activos y sin repetir
    const ids = dto.detalles.map((d) => d.idMedicamento);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Un medicamento aparece mas de una vez en la receta; unifique la cantidad');
    }
    const medicamentos = await this.medRepo.findBy({ id: In(ids) });
    const porId = new Map(medicamentos.map((m) => [m.id, m]));
    for (const id of ids) {
      const med = porId.get(id);
      if (!med) throw new NotFoundException(`Medicamento ${id} no encontrado`);
      if (!med.activo) throw new BadRequestException(`El medicamento ${med.nombre} esta desactivado`);
    }

    // Regla 5: alerta de alergias (el medico puede confirmar conscientemente y continuar)
    const alertas = detectarAlergias(cita.paciente.alergias, medicamentos);
    if (alertas.length && !dto.confirmarAlergias) {
      const detalle = alertas.map((a) => `${a.medicamento} (alergia registrada: "${a.alergeno}")`).join('; ');
      throw new ConflictException(`ALERTA DE ALERGIA: ${detalle}. Confirme para emitir la receta de todas formas.`);
    }

    const vence = new Date();
    vence.setDate(vence.getDate() + DIAS_VIGENCIA_RECETA);

    const receta = this.repo.create({
      codigo: await this.generarCodigo(),
      cita,
      paciente: cita.paciente,
      medico,
      fechaVencimiento: fechaLocal(vence),
      estado: EstadoReceta.Emitida,
      indicacionesGenerales: dto.indicacionesGenerales?.trim() || null,
      detalles: dto.detalles.map((d) =>
        Object.assign(new DetalleReceta(), {
          medicamento: porId.get(d.idMedicamento),
          dosis: d.dosis.trim(),
          frecuencia: d.frecuencia.trim(),
          duracionDias: d.duracionDias,
          cantidad: d.cantidad,
          cantidadDespachada: 0,
          indicaciones: d.indicaciones?.trim() || null,
        }),
      ),
    });
    const guardada = await this.repo.save(receta);

    await this.notificacionesService.enviar(
      cita,
      TipoNotificacion.correo,
      `Receta ${guardada.codigo} emitida. Presentela en farmacia antes del ${guardada.fechaVencimiento}.`,
    );
    return this.obtener(guardada.id);
  }

  // ---------------------------------------------------------------- anulacion

  async anular(id: number, dto: AnularRecetaDto, correo: string): Promise<Receta> {
    const medico = await this.medicoActual(correo);
    const receta = await this.obtener(id);

    if (receta.medico.id !== medico.id) {
      throw new ForbiddenException('Solo el medico que emitio la receta puede anularla');
    }
    if (receta.estado !== EstadoReceta.Emitida) {
      throw new BadRequestException(
        `No se puede anular una receta en estado ${receta.estado}: solo las que aun no se han despachado`,
      );
    }
    receta.estado = EstadoReceta.Anulada;
    await this.repo.update(id, { estado: EstadoReceta.Anulada });
    await this.notificacionesService.enviar(
      receta.cita,
      TipoNotificacion.correo,
      `Receta ${receta.codigo} anulada.${dto.motivo ? ' Motivo: ' + dto.motivo : ''}`,
    );
    return this.obtener(id);
  }

  // ---------------------------------------------------------------- despacho

  async despachar(id: number, dto: DespacharRecetaDto, correo: string) {
    const usuario = await this.usuarioActual(correo);
    const metodo = await this.catalogos.metodoInventario(); // [Lotes] FIFO o LIFO

    const resultado = await this.dataSource.transaction(async (manager) => {
      // Bloquea la receta: dos farmaceuticos no pueden despachar la misma receta a la vez
      const bloqueada = await manager
        .createQueryBuilder(Receta, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id })
        .getOne();
      if (!bloqueada) throw new NotFoundException('Receta no encontrada');

      const receta = await manager.findOne(Receta, { where: { id } });

      if (receta.estado === EstadoReceta.Anulada) {
        throw new BadRequestException('La receta fue anulada y no puede despacharse');
      }
      if (receta.estado === EstadoReceta.Despachada) {
        throw new ConflictException('La receta ya fue despachada por completo');
      }
      if (receta.fechaVencimiento < fechaLocal()) {
        throw new BadRequestException(`La receta vencio el ${receta.fechaVencimiento}; el paciente necesita una nueva`);
      }

      // Plan de despacho: lo que el farmaceutico indica, o todo lo pendiente
      type Plan = { detalle: DetalleReceta; cantidad: number; explicito: boolean };
      let plan: Plan[];
      if (dto.items?.length) {
        const vistos = new Set<number>();
        plan = dto.items.map((item) => {
          const detalle = receta.detalles.find((d) => d.id === item.idDetalle);
          if (!detalle) throw new BadRequestException(`El detalle ${item.idDetalle} no pertenece a esta receta`);
          if (vistos.has(item.idDetalle)) throw new BadRequestException('Un detalle aparece repetido en el despacho');
          vistos.add(item.idDetalle);
          const pendiente = detalle.cantidad - detalle.cantidadDespachada;
          if (item.cantidad > pendiente) {
            throw new BadRequestException(
              `De ${detalle.medicamento.nombre} solo quedan ${pendiente} unidades pendientes de entregar`,
            );
          }
          return { detalle, cantidad: item.cantidad, explicito: true };
        });
      } else {
        plan = receta.detalles
          .filter((d) => d.cantidad > d.cantidadDespachada)
          .map((d) => ({ detalle: d, cantidad: d.cantidad - d.cantidadDespachada, explicito: false }));
      }

      // Bloquea los medicamentos en orden de id (orden fijo = sin interbloqueos entre despachos)
      const idsMed = [...new Set(plan.map((p) => p.detalle.medicamento.id))].sort((a, b) => a - b);
      const meds = new Map<number, Medicamento>();
      const vendibles = new Map<number, number>();
      for (const idMed of idsMed) {
        const med = await manager.findOne(Medicamento, { where: { id: idMed }, lock: { mode: 'pessimistic_write' } });
        await this.lotes.sincronizar(manager, med); // [Lotes] stock sin lote -> lote
        meds.set(idMed, med);
        vendibles.set(idMed, await this.lotes.disponibleVendible(manager, idMed));
      }

      // [Seguros] Descuento en medicamentos segun el seguro del paciente
      const seguro = receta.paciente.seguro;
      const porcentaje = seguro?.activo ? Number(seguro.descuentoMedicamentos) || 0 : 0;

      const entregados: { medicamento: string; cantidad: number; precioUnitario: number; subtotal: number }[] = [];
      const faltantes: { medicamento: string; cantidad: number }[] = [];
      const lotesUsados: { medicamento: string; lote: string; vencimiento: string | null; cantidad: number }[] = [];
      let subtotal = 0;

      for (const p of plan) {
        const med = meds.get(p.detalle.medicamento.id);
        const vendible = vendibles.get(med.id);
        const aEntregar = Math.min(p.cantidad, vendible);

        // Si el farmaceutico pidio una cantidad exacta y no alcanza, se rechaza todo el despacho
        if (p.explicito && aEntregar < p.cantidad) {
          const vencidas = med.stock - vendible;
          throw new ConflictException(
            `Stock insuficiente de ${med.nombre}: se solicitaron ${p.cantidad} y hay ${vendible} disponibles` +
              (vencidas > 0 ? ` (${vencidas} unidades vencidas no se pueden despachar)` : ''),
          );
        }
        if (aEntregar > 0) {
          const consumos = await this.lotes.consumir(manager, med, aEntregar, metodo);
          const precio = Number(med.precio);
          for (const c of consumos) {
            med.stock -= c.cantidad;
            const bruto = c.cantidad * precio;
            await manager.save(
              manager.create(MovimientoInventario, {
                medicamento: med,
                tipo: TipoMovimiento.Salida,
                cantidad: -c.cantidad,
                stockResultante: med.stock,
                motivo: `Despacho de receta ${receta.codigo}`,
                receta: { id: receta.id } as Receta,
                usuario,
                lote: c.lote,
                costoUnitario: c.lote.costoUnitario,
                precioUnitario: precio,
                descuentoPorcentaje: porcentaje,
                montoVenta: redondear(bruto - (bruto * porcentaje) / 100),
              }),
            );
            lotesUsados.push({ medicamento: med.nombre, lote: c.lote.codigo, vencimiento: c.lote.fechaVencimiento, cantidad: c.cantidad });
          }
          vendibles.set(med.id, vendible - aEntregar);
          await manager.update(Medicamento, med.id, { stock: med.stock });
          p.detalle.cantidadDespachada += aEntregar;
          await manager.update(DetalleReceta, p.detalle.id, { cantidadDespachada: p.detalle.cantidadDespachada });
          const sub = redondear(aEntregar * precio);
          subtotal += sub;
          entregados.push({ medicamento: med.nombre, cantidad: aEntregar, precioUnitario: precio, subtotal: sub });
        }
        if (aEntregar < p.cantidad) faltantes.push({ medicamento: med.nombre, cantidad: p.cantidad - aEntregar });
      }

      if (!entregados.length) {
        throw new ConflictException('No hay stock disponible para ninguno de los medicamentos pendientes');
      }

      // [Seguros] Cobro de este despacho (se acumula en la receta)
      subtotal = redondear(subtotal);
      const descuento = redondear((subtotal * porcentaje) / 100);
      const cobro = { subtotal, porcentaje, descuento, total: redondear(subtotal - descuento), seguro: porcentaje > 0 ? seguro.nombre : null };

      // Despacho completo o parcial (la receta puede volver a farmacia por lo faltante)
      const completa = receta.detalles.every((d) => d.cantidadDespachada >= d.cantidad);
      const estado = completa ? EstadoReceta.Despachada : EstadoReceta.Parcial;
      await manager.update(Receta, receta.id, {
        estado,
        subtotal: redondear(Number(receta.subtotal ?? 0) + cobro.subtotal),
        montoDescuento: redondear(Number(receta.montoDescuento ?? 0) + cobro.descuento),
        total: redondear(Number(receta.total ?? 0) + cobro.total),
        porcentajeDescuento: porcentaje,
        seguroAplicado: cobro.seguro,
      });

      const alertasStock = [...meds.values()]
        .filter((m) => m.stock <= m.stockMinimo)
        .map((m) => ({ medicamento: m.nombre, stock: m.stock, stockMinimo: m.stockMinimo }));

      return { entregados, faltantes, alertasStock, estado, cobro, lotesUsados };
    });

    const receta = await this.obtener(id);
    const textoCobro = resultado.cobro.total > 0 ? ` Total cobrado: Q${resultado.cobro.total.toFixed(2)}.` : '';
    await this.notificacionesService.enviar(
      receta.cita,
      TipoNotificacion.correo,
      (resultado.estado === EstadoReceta.Despachada
        ? `Receta ${receta.codigo} despachada por completo.`
        : `Receta ${receta.codigo} despachada parcialmente; regrese a farmacia por lo pendiente.`) + textoCobro,
    );
    return {
      receta,
      entregados: resultado.entregados,
      faltantes: resultado.faltantes,
      alertasStock: resultado.alertasStock,
      cobro: resultado.cobro,
      metodo,
      lotesUsados: resultado.lotesUsados,
    };
  }

  // ---------------------------------------------------------------- resumen del panel de farmacia

  async resumen() {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);

    const [medicamentosActivos, stockBajo, pendientes, despachoHoy, masDespachados] = await Promise.all([
      this.medRepo.count({ where: { activo: true } }),
      this.medRepo.createQueryBuilder('m').where('m.activo = true').andWhere('m.stock <= m.stockMinimo').getCount(),
      this.repo.count({
        where: { estado: In([EstadoReceta.Emitida, EstadoReceta.Parcial]), fechaVencimiento: MoreThanOrEqual(fechaLocal()) },
      }),
      this.movRepo
        .createQueryBuilder('mov')
        .select('COUNT(DISTINCT mov.id_receta)', 'recetas')
        .addSelect('COALESCE(SUM(-mov.cantidad), 0)', 'unidades')
        .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
        .andWhere('mov.fecha >= :d', { d: inicioHoy })
        .getRawOne(),
      this.movRepo
        .createQueryBuilder('mov')
        .innerJoin('mov.medicamento', 'med')
        .select('med.nombre', 'medicamento')
        .addSelect('SUM(-mov.cantidad)', 'unidades')
        .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
        .andWhere('mov.fecha >= :d', { d: hace30 })
        .groupBy('med.nombre')
        .orderBy('unidades', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);

    // [Lotes] [Seguros] Ventas, costo, valor del inventario y lotes en riesgo
    const hace14 = new Date();
    hace14.setHours(0, 0, 0, 0);
    hace14.setDate(hace14.getDate() - 13);
    const hoy = fechaLocal();
    const [ventas30, porDia, inventario, metodo] = await Promise.all([
      this.movRepo
        .createQueryBuilder('mov')
        .select('COALESCE(SUM(COALESCE(mov.monto_venta, 0)), 0)', 'neto')
        .addSelect('COALESCE(SUM(-mov.cantidad * COALESCE(mov.precio_unitario, 0)), 0)', 'bruto')
        .addSelect('COALESCE(SUM(-mov.cantidad * COALESCE(mov.costo_unitario, 0)), 0)', 'costo')
        .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
        .andWhere('mov.fecha >= :d', { d: hace30 })
        .getRawOne(),
      this.movRepo
        .createQueryBuilder('mov')
        .select("TO_CHAR(mov.fecha, 'YYYY-MM-DD')", 'fecha')
        .addSelect('COALESCE(SUM(-mov.cantidad), 0)', 'unidades')
        .addSelect('COALESCE(SUM(COALESCE(mov.monto_venta, 0)), 0)', 'ventas')
        .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
        .andWhere('mov.fecha >= :d', { d: hace14 })
        .groupBy("TO_CHAR(mov.fecha, 'YYYY-MM-DD')")
        .getRawMany(),
      this.dataSource.query(
        `SELECT COALESCE(SUM(l.cantidad_disponible * l.costo_unitario), 0) AS valor,
                COUNT(*) FILTER (WHERE l.fecha_vencimiento < $1) AS vencidos,
                COUNT(*) FILTER (WHERE l.fecha_vencimiento >= $1 AND l.fecha_vencimiento <= $2) AS por_vencer
           FROM citas_medicas.lote_medicamento l
           JOIN citas_medicas.medicamento m ON m.id_medicamento = l.id_medicamento AND m.activo
          WHERE l.cantidad_disponible > 0`,
        [hoy, sumarDias(hoy, DIAS_POR_VENCER)],
      ),
      this.catalogos.metodoInventario(),
    ]);
    const mapaDia = new Map(porDia.map((d) => [d.fecha, d]));
    const ventasPorDia = Array.from({ length: 14 }, (_, i) => {
      const f = sumarDias(fechaLocal(hace14), i);
      const d = mapaDia.get(f);
      return { fecha: f, unidades: Number(d?.unidades ?? 0), ventas: redondear(Number(d?.ventas ?? 0)) };
    });
    const neto = redondear(Number(ventas30?.neto ?? 0));
    const bruto = redondear(Number(ventas30?.bruto ?? 0));
    const costo = redondear(Number(ventas30?.costo ?? 0));

    return {
      medicamentosActivos,
      medicamentosStockBajo: stockBajo,
      recetasPendientes: pendientes,
      recetasDespachadasHoy: Number(despachoHoy?.recetas ?? 0),
      unidadesDespachadasHoy: Number(despachoHoy?.unidades ?? 0),
      masDespachados30Dias: masDespachados.map((r) => ({ medicamento: r.medicamento, unidades: Number(r.unidades) })),
      metodoInventario: metodo,
      ventas30Dias: neto,
      descuentosSeguro30Dias: redondear(bruto - neto),
      costoVentas30Dias: costo,
      margen30Dias: redondear(neto - costo),
      valorInventario: redondear(Number(inventario[0]?.valor ?? 0)),
      lotesVencidos: Number(inventario[0]?.vencidos ?? 0),
      lotesPorVencer: Number(inventario[0]?.por_vencer ?? 0),
      ventasPorDia,
    };
  }
}
