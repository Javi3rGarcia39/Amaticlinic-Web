import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Horario } from '../horarios/horario.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { Receta } from '../farmacia/entities/receta.entity';
import { MovimientoInventario } from '../farmacia/entities/movimiento-inventario.entity';
import { EmergenciasService } from '../emergencias/emergencias.service';
import { EstadoCita, EstadoReceta, TipoMovimiento } from '../common/enums';
import { aMinutos, desdeFecha, diaSemanaDe, fechaLocal, redondear, sumarDias } from '../common/utils/fechas';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

const ACTIVAS = [EstadoCita.Agendada, EstadoCita.Modificada];

function resumenCita(c: Cita) {
  return {
    id: c.id,
    fecha: c.fecha,
    horaInicio: c.horaInicio?.slice(0, 5),
    horaFin: c.horaFin?.slice(0, 5),
    estado: c.estado,
    motivoConsulta: c.motivoConsulta,
    esEmergencia: !!c.esEmergencia,
    idPaciente: c.paciente?.id,
    nombrePaciente: c.paciente ? `${c.paciente.usuario.nombre} ${c.paciente.usuario.apellido}` : null,
    idMedico: c.medico?.id,
    nombreMedico: c.medico ? `${c.medico.usuario.nombre} ${c.medico.usuario.apellido}` : null,
    especialidad: c.medico?.especialidad,
    consultorio: c.medico?.consultorio,
    totalPagar: c.totalPagar !== null && c.totalPagar !== undefined ? Number(c.totalPagar) : null,
  };
}

function finDeMes(hoy: string): string {
  const d = desdeFecha(hoy);
  return fechaLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function ordenCita(a: Cita, b: Cita) {
  return a.fecha === b.fecha ? aMinutos(a.horaInicio) - aMinutos(b.horaInicio) : a.fecha.localeCompare(b.fecha);
}

// [Dashboard] Indicadores de los paneles de cada rol (todas las fechas en hora local)
@Injectable()
export class EstadisticasService {
  constructor(
    @InjectRepository(Cita) private citaRepo: Repository<Cita>,
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    @InjectRepository(Paciente) private pacienteRepo: Repository<Paciente>,
    @InjectRepository(Horario) private horarioRepo: Repository<Horario>,
    @InjectRepository(HistorialMedico) private historialRepo: Repository<HistorialMedico>,
    @InjectRepository(Receta) private recetaRepo: Repository<Receta>,
    @InjectRepository(MovimientoInventario) private movRepo: Repository<MovimientoInventario>,
    private emergencias: EmergenciasService,
  ) {}

  // ------------------------------------------------------------------ paciente
  async paraPaciente(idPaciente: number) {
    const hoy = fechaLocal();
    const inicioMes = hoy.slice(0, 8) + '01';
    const finMes = finDeMes(hoy);

    const [citas, paciente, recetas, historial, medicos] = await Promise.all([
      this.citaRepo.find({ where: { paciente: { id: idPaciente }, ...NO_ELIMINADO } }), // [Eliminacion]
      this.pacienteRepo.findOne({ where: { id: idPaciente } }),
      this.recetaRepo.find({ where: { paciente: { id: idPaciente } } }),
      this.historialRepo.find({ where: { paciente: { id: idPaciente }, ...NO_ELIMINADO }, order: { fechaRegistro: 'DESC' }, take: 3 }),
      this.medicoRepo.count({ where: NO_ELIMINADO }),
    ]);

    const activas = citas.filter((c) => ACTIVAS.includes(c.estado) && c.fecha >= hoy).sort(ordenCita);
    const proxima = activas[0];
    const diasProximaCita = proxima ? Math.round((desdeFecha(proxima.fecha).getTime() - desdeFecha(hoy).getTime()) / 86400000) : 0;
    const completadas = citas.filter((c) => c.estado === EstadoCita.Completada);
    const recetasPendientes = recetas.filter(
      (r) => (r.estado === EstadoReceta.Emitida || r.estado === EstadoReceta.Parcial) && r.fechaVencimiento >= hoy,
    );

    return {
      // Indicadores anteriores (se mantienen por compatibilidad)
      citasProgramadas: activas.length,
      diasProximaCita,
      medicosDisponibles: medicos,
      citasEsteMes: citas.filter((c) => c.fecha >= inicioMes && c.fecha <= finMes).length,
      citasProximas: citas.filter((c) => c.fecha > hoy).length,
      citasConfirmadas: citas.filter((c) => ACTIVAS.includes(c.estado)).length,
      citasPendientes: citas.filter((c) => c.estado === EstadoCita.Agendada && c.fecha >= hoy).length,
      citasPasadas: citas.filter((c) => c.fecha < hoy).length,
      citasTotales: citas.length,
      // [Dashboard] Nuevos
      proximaCita: proxima ? resumenCita(proxima) : null,
      proximasCitas: activas.slice(0, 4).map(resumenCita),
      consultasCompletadas: completadas.length,
      recetasPendientes: recetasPendientes.length,
      recetasPendientesCodigos: recetasPendientes.map((r) => r.codigo),
      ultimosDiagnosticos: historial.map((h) => ({
        id: h.id,
        fecha: h.fechaRegistro,
        diagnostico: h.diagnostico,
        tratamiento: h.tratamiento,
        medico: `${h.medico.usuario.nombre} ${h.medico.usuario.apellido}`,
        especialidad: h.medico.especialidad,
      })),
      seguro: paciente?.seguro?.activo
        ? {
            nombre: paciente.seguro.nombre,
            poliza: paciente.numeroPoliza,
            descuentoConsulta: Number(paciente.seguro.descuentoConsulta),
            descuentoMedicamentos: Number(paciente.seguro.descuentoMedicamentos),
          }
        : null,
      totalPagadoConsultas: redondear(completadas.reduce((s, c) => s + Number(c.totalPagar ?? 0), 0)),
      ahorroSeguro: redondear(
        completadas.reduce((s, c) => s + Number(c.montoDescuento ?? 0), 0) +
          recetas.reduce((s, r) => s + Number(r.montoDescuento ?? 0), 0),
      ),
    };
  }

  // ------------------------------------------------------------------ medico
  async paraMedico(idMedico: number) {
    const hoy = fechaLocal();
    const inicioMes = hoy.slice(0, 8) + '01';
    const finMes = finDeMes(hoy);
    const hace28 = sumarDias(hoy, -27);

    const [citas, recetasMes, emergencias] = await Promise.all([
      this.citaRepo.find({ where: { medico: { id: idMedico }, ...NO_ELIMINADO } }), // [Eliminacion]
      this.recetaRepo
        .createQueryBuilder('r')
        .where('r.id_medico = :id', { id: idMedico })
        .andWhere('r.fecha_emision >= :d', { d: desdeFecha(inicioMes) })
        .getCount(),
      this.emergencias.resumen(),
    ]);

    const activas = citas.filter((c) => ACTIVAS.includes(c.estado) && c.fecha >= hoy).sort(ordenCita);
    const proxima = activas[0];
    const diasProximaCita = proxima ? Math.round((desdeFecha(proxima.fecha).getTime() - desdeFecha(hoy).getTime()) / 86400000) : 0;
    const delMes = citas.filter((c) => c.fecha >= inicioMes && c.fecha <= finMes);
    const completadasMes = delMes.filter((c) => c.estado === EstadoCita.Completada);

    // Proximos 7 dias: citas activas por dia
    const semana = Array.from({ length: 7 }, (_, i) => {
      const f = sumarDias(hoy, i);
      const delDia = citas.filter((c) => c.fecha === f && c.estado !== EstadoCita.Cancelada);
      return { fecha: f, diaSemana: diaSemanaDe(f), citas: delDia.length };
    });

    // Ultimas 4 semanas: consultas completadas por semana
    const actividad = Array.from({ length: 4 }, (_, i) => {
      const desde = sumarDias(hace28, i * 7);
      const hasta = sumarDias(desde, 6);
      return {
        desde,
        hasta,
        completadas: citas.filter((c) => c.estado === EstadoCita.Completada && c.fecha >= desde && c.fecha <= hasta).length,
      };
    });

    return {
      citasProgramadas: activas.length,
      diasProximaCita,
      citasEsteMes: delMes.length,
      citasTotales: citas.length,
      // [Dashboard] Nuevos
      citasHoy: citas.filter((c) => c.fecha === hoy && c.estado !== EstadoCita.Cancelada).sort(ordenCita).map(resumenCita),
      proximasCitas: activas.filter((c) => c.fecha > hoy).slice(0, 5).map(resumenCita),
      atendidasMes: completadasMes.length,
      pacientesAtendidosMes: new Set(completadasMes.map((c) => c.paciente.id)).size,
      canceladasMes: delMes.filter((c) => c.estado === EstadoCita.Cancelada).length,
      recetasEmitidasMes: recetasMes,
      ingresosMes: redondear(completadasMes.reduce((s, c) => s + Number(c.totalPagar ?? 0), 0)),
      emergenciasEnEspera: emergencias.enEspera,
      emergenciasPorNivel: emergencias.porNivel,
      semana,
      actividad,
    };
  }

  // ------------------------------------------------------------------ recepcion
  async recepcion() {
    const hoy = fechaLocal();
    const desde14 = sumarDias(hoy, -13);
    const hasta7 = sumarDias(hoy, 6);
    const desde30 = sumarDias(hoy, -29);
    const inicioSemana = sumarDias(hoy, -((desdeFecha(hoy).getDay() + 6) % 7));
    const finSemana = sumarDias(inicioSemana, 6);

    const [citas, medicos, horarios, pacientes, conSeguro, emergencias, farmacia, recetasPendientes] = await Promise.all([
      this.citaRepo.find({ where: { fecha: Between(desde30 < desde14 ? desde30 : desde14, hasta7), ...NO_ELIMINADO } }), // [Eliminacion]
      this.medicoRepo.find({ where: NO_ELIMINADO }),
      this.horarioRepo.find({ where: NO_ELIMINADO }),
      this.pacienteRepo.count({ where: NO_ELIMINADO }),
      this.pacienteRepo.createQueryBuilder('p').where('p.id_seguro IS NOT NULL').andWhere('p.eliminado_en IS NULL').getCount(),
      this.emergencias.resumen(),
      this.movRepo
        .createQueryBuilder('mov')
        .select('COALESCE(SUM(COALESCE(mov.monto_venta, 0)), 0)', 'ventas')
        .addSelect('COALESCE(SUM(-mov.cantidad * COALESCE(mov.precio_unitario, 0)), 0)', 'bruto')
        .where('mov.tipo = :t', { t: TipoMovimiento.Salida })
        .andWhere('mov.fecha >= :d', { d: desdeFecha(desde30) })
        .getRawOne(),
      this.recetaRepo.count({ where: { estado: In([EstadoReceta.Emitida, EstadoReceta.Parcial]) } }),
    ]);

    const deHoy = citas.filter((c) => c.fecha === hoy);
    const contar = (lista: Cita[], estado: EstadoCita) => lista.filter((c) => c.estado === estado).length;

    // Serie diaria: 14 dias atras y 7 adelante
    const porDia = [] as { fecha: string; total: number; completadas: number; canceladas: number; pendientes: number }[];
    for (let f = desde14; f <= hasta7; f = sumarDias(f, 1)) {
      const d = citas.filter((c) => c.fecha === f);
      porDia.push({
        fecha: f,
        total: d.length,
        completadas: contar(d, EstadoCita.Completada),
        canceladas: contar(d, EstadoCita.Cancelada),
        pendientes: d.filter((c) => ACTIVAS.includes(c.estado)).length,
      });
    }

    // Ultimos 30 dias
    const ultimos30 = citas.filter((c) => c.fecha >= desde30 && c.fecha <= hoy);
    const especialidades = new Map<string, number>();
    ultimos30
      .filter((c) => c.estado !== EstadoCita.Cancelada)
      .forEach((c) => especialidades.set(c.medico.especialidad, (especialidades.get(c.medico.especialidad) ?? 0) + 1));
    const completadas30 = ultimos30.filter((c) => c.estado === EstadoCita.Completada);
    const seguros = new Map<string, { citas: number; descuento: number }>();
    completadas30
      .filter((c) => c.seguroAplicado)
      .forEach((c) => {
        const s = seguros.get(c.seguroAplicado) ?? { citas: 0, descuento: 0 };
        s.citas++;
        s.descuento += Number(c.montoDescuento ?? 0);
        seguros.set(c.seguroAplicado, s);
      });

    // Ocupacion de la semana actual: espacios de 30 min ocupados vs disponibles
    const ocupacion = medicos.map((m) => {
      let capacidad = 0;
      for (let f = inicioSemana; f <= finSemana; f = sumarDias(f, 1)) {
        horarios
          .filter((h) => h.medico.id === m.id && h.diaSemana === diaSemanaDe(f))
          .forEach((h) => (capacidad += Math.floor((aMinutos(h.horaFin) - aMinutos(h.horaInicio)) / 30)));
      }
      const ocupadas = citas.filter(
        (c) => c.medico.id === m.id && c.fecha >= inicioSemana && c.fecha <= finSemana && c.estado !== EstadoCita.Cancelada && !c.esEmergencia,
      ).length;
      return {
        idMedico: m.id,
        medico: `${m.usuario.nombre} ${m.usuario.apellido}`,
        especialidad: m.especialidad,
        citas: ocupadas,
        capacidad,
        porcentaje: capacidad ? Math.round((ocupadas / capacidad) * 100) : 0,
      };
    });

    const bruto = redondear(completadas30.reduce((s, c) => s + Number(c.costoConsulta ?? 0), 0));
    const descuentos = redondear(completadas30.reduce((s, c) => s + Number(c.montoDescuento ?? 0), 0));
    const ventasFarmacia = redondear(Number(farmacia?.ventas ?? 0));

    return {
      hoy: {
        fecha: hoy,
        total: deHoy.length,
        completadas: contar(deHoy, EstadoCita.Completada),
        pendientes: deHoy.filter((c) => ACTIVAS.includes(c.estado)).length,
        canceladas: contar(deHoy, EstadoCita.Cancelada),
        proximas: deHoy.filter((c) => ACTIVAS.includes(c.estado)).sort(ordenCita).slice(0, 6).map(resumenCita),
      },
      totales: {
        medicos: medicos.length,
        pacientes,
        pacientesConSeguro: conSeguro,
        recetasPendientesFarmacia: recetasPendientes,
      },
      emergencias,
      porDia,
      porEspecialidad: [...especialidades.entries()].map(([especialidad, total]) => ({ especialidad, citas: total })).sort((a, b) => b.citas - a.citas),
      porEstado30: Object.values(EstadoCita).map((estado) => ({ estado, citas: contar(ultimos30, estado) })),
      ocupacionSemana: ocupacion.sort((a, b) => b.porcentaje - a.porcentaje),
      ingresos30: {
        consultasBruto: bruto,
        descuentosSeguro: descuentos,
        consultasNeto: redondear(bruto - descuentos),
        farmaciaNeto: ventasFarmacia,
        descuentosFarmacia: redondear(Number(farmacia?.bruto ?? 0) - ventasFarmacia),
        total: redondear(bruto - descuentos + ventasFarmacia),
      },
      porSeguro30: [...seguros.entries()]
        .map(([seguro, v]) => ({ seguro, citas: v.citas, descuento: redondear(v.descuento) }))
        .sort((a, b) => b.descuento - a.descuento),
    };
  }
}
