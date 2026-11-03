import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Emergencia } from './emergencia.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Cita } from '../citas/cita.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PacientesService } from '../pacientes/pacientes.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CatalogosService } from '../catalogos/catalogos.service';
import { AtenderEmergenciaDto, RegistrarEmergenciaDto } from './dto/emergencia.dto';
import {
  ESPERA_MAXIMA_TRIAGE, EstadoCita, EstadoEmergencia, ETIQUETA_TRIAGE, NivelTriage, PRIORIDAD_TRIAGE,
  TipoNotificacion, TipoUsuario,
} from '../common/enums';
import { aHora, aMinutos, fechaLocal, horaLocal } from '../common/utils/fechas';

const ACTIVAS = [EstadoEmergencia.EnEspera, EstadoEmergencia.EnAtencion];

function edad(fechaNacimiento: string | null | undefined): number | null {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento + 'T00:00:00');
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  if (hoy.getMonth() < n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() < n.getDate())) e--;
  return e;
}

export function toEmergenciaResponse(e: Emergencia) {
  const fin = e.fechaAtencion ?? (ACTIVAS.includes(e.estado) ? new Date() : e.fechaAlta ?? new Date());
  const minutosEspera = Math.max(0, Math.round((new Date(fin).getTime() - new Date(e.fechaLlegada).getTime()) / 60000));
  const p = e.paciente;
  return {
    id: e.id,
    idPaciente: p.id,
    nombrePaciente: `${p.usuario.nombre} ${p.usuario.apellido}`,
    documentoIdentidad: p.documentoIdentidad,
    edad: edad(p.fechaNacimiento),
    alergias: p.alergias || null,
    tipoSangre: p.tipoSangre || null,
    telefono: p.telefono || p.usuario.telefono || null,
    seguro: p.seguro?.activo ? p.seguro.nombre : null,
    nivel: e.nivel,
    nivelEtiqueta: ETIQUETA_TRIAGE[e.nivel],
    prioridad: PRIORIDAD_TRIAGE[e.nivel],
    esperaMaxima: ESPERA_MAXIMA_TRIAGE[e.nivel],
    motivo: e.motivo,
    presionArterial: e.presionArterial,
    frecuenciaCardiaca: e.frecuenciaCardiaca,
    temperatura: e.temperatura !== null && e.temperatura !== undefined ? Number(e.temperatura) : null,
    saturacion: e.saturacion,
    estado: e.estado,
    fechaLlegada: e.fechaLlegada,
    minutosEspera,
    excedeEspera: ACTIVAS.includes(e.estado) && e.estado === EstadoEmergencia.EnEspera && minutosEspera > ESPERA_MAXIMA_TRIAGE[e.nivel],
    idMedico: e.medico?.id ?? null,
    nombreMedico: e.medico ? `${e.medico.usuario.nombre} ${e.medico.usuario.apellido}` : null,
    fechaAtencion: e.fechaAtencion,
    fechaAlta: e.fechaAlta,
    diagnostico: e.diagnostico,
    tratamiento: e.tratamiento,
    destino: e.destino,
    observaciones: e.observaciones,
    idCita: e.cita?.id ?? null,
    registradoPor: e.registradoPor ? `${e.registradoPor.nombre} ${e.registradoPor.apellido}` : null,
  };
}

// [Emergencias] Cola de atencion por prioridad de triage y luego por orden de llegada
@Injectable()
export class EmergenciasService {
  constructor(
    @InjectRepository(Emergencia) private repo: Repository<Emergencia>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Medico) private medicoRepo: Repository<Medico>,
    private usuariosService: UsuariosService,
    private pacientesService: PacientesService,
    private notificaciones: NotificacionesService,
    private catalogos: CatalogosService,
    private dataSource: DataSource,
  ) {}

  private async usuarioActual(correo: string): Promise<Usuario> {
    const u = await this.usuarioRepo.findOne({ where: { correo } });
    if (!u) throw new UnauthorizedException('Usuario de la sesion no encontrado');
    return u;
  }

  private async medicoActual(correo: string): Promise<Medico> {
    const u = await this.usuarioActual(correo);
    const m = await this.medicoRepo.findOne({ where: { usuario: { id: u.id } } });
    if (!m) throw new ForbiddenException('Solo un medico puede atender emergencias');
    return m;
  }

  async obtener(id: number): Promise<Emergencia> {
    const e = await this.repo.findOne({ where: { id }, relations: { cita: true } });
    if (!e) throw new NotFoundException('Emergencia no encontrada');
    return e;
  }

  // ------------------------------------------------------------------ registro (recepcion)
  async registrar(dto: RegistrarEmergenciaDto, correo: string): Promise<Emergencia> {
    if (!dto.idPaciente && !dto.pacienteNuevo) {
      throw new BadRequestException('Indica un paciente registrado o los datos del paciente nuevo');
    }
    const registradoPor = await this.usuarioActual(correo);

    let paciente: Paciente;
    if (dto.idPaciente) {
      paciente = await this.pacientesService.obtener(dto.idPaciente);
    } else {
      const n = dto.pacienteNuevo;
      if (n.documentoIdentidad?.trim()) {
        const existente = await this.dataSource
          .getRepository(Paciente)
          .findOne({ where: { documentoIdentidad: n.documentoIdentidad.trim() } });
        if (existente) {
          throw new ConflictException(
            `Ya existe un paciente con el documento ${n.documentoIdentidad}: ${existente.usuario.nombre} ${existente.usuario.apellido}. Buscalo en la lista.`,
          );
        }
      }
      // Cuenta provisional: el paciente puede actualizar su correo y contrasena despues en recepcion
      const correoProvisional = `emergencia.${Date.now()}.${randomBytes(2).toString('hex')}@amaticlinic.local`;
      const usuario = await this.usuariosService.crear({
        nombre: n.nombre.trim(),
        apellido: n.apellido.trim(),
        correo: correoProvisional,
        telefono: n.telefono,
        password: randomBytes(9).toString('base64url'),
        tipoUsuario: TipoUsuario.Paciente,
      });
      paciente = await this.pacientesService.crear({
        idUsuario: usuario.id,
        documentoIdentidad: n.documentoIdentidad?.trim(),
        fechaNacimiento: n.fechaNacimiento,
        telefono: n.telefono,
        alergias: n.alergias,
        contactoEmergenciaNombre: n.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: n.contactoEmergenciaTelefono,
      });
    }

    const activa = await this.repo.count({ where: { paciente: { id: paciente.id }, estado: In(ACTIVAS) } });
    if (activa) throw new ConflictException('Este paciente ya esta en la cola de emergencias');

    const guardada = await this.repo.save(
      this.repo.create({
        paciente,
        nivel: dto.nivel,
        motivo: dto.motivo.trim(),
        presionArterial: dto.presionArterial ?? null,
        frecuenciaCardiaca: dto.frecuenciaCardiaca ?? null,
        temperatura: dto.temperatura ?? null,
        saturacion: dto.saturacion ?? null,
        estado: EstadoEmergencia.EnEspera,
        registradoPor,
      }),
    );
    return this.obtener(guardada.id);
  }

  // ------------------------------------------------------------------ consultas
  /** Cola activa: primero los que ya estan en atencion, luego por prioridad y orden de llegada */
  async cola(): Promise<Emergencia[]> {
    const lista = await this.repo.find({ where: { estado: In(ACTIVAS) } });
    return lista.sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === EstadoEmergencia.EnAtencion ? -1 : 1;
      const p = PRIORIDAD_TRIAGE[a.nivel] - PRIORIDAD_TRIAGE[b.nivel];
      return p !== 0 ? p : new Date(a.fechaLlegada).getTime() - new Date(b.fechaLlegada).getTime();
    });
  }

  /** Historial de emergencias (por defecto las de hoy) */
  historial(desde?: string): Promise<Emergencia[]> {
    const inicio = new Date((desde || fechaLocal()) + 'T00:00:00');
    return this.repo.find({
      where: { fechaLlegada: MoreThanOrEqual(inicio) },
      order: { fechaLlegada: 'DESC' },
      relations: { cita: true },
    });
  }

  async resumen() {
    const inicioHoy = new Date(fechaLocal() + 'T00:00:00');
    const [cola, hoy] = await Promise.all([this.cola(), this.repo.find({ where: { fechaLlegada: MoreThanOrEqual(inicioHoy) } })]);
    const tomadas = hoy.filter((e) => e.fechaAtencion);
    const esperaPromedio = tomadas.length
      ? Math.max(0, Math.round(
          tomadas.reduce((s, e) => s + (new Date(e.fechaAtencion).getTime() - new Date(e.fechaLlegada).getTime()) / 60000, 0) /
            tomadas.length,
        ))
      : 0;
    const porNivel = Object.values(NivelTriage).map((nivel) => ({
      nivel,
      etiqueta: ETIQUETA_TRIAGE[nivel],
      enEspera: cola.filter((e) => e.nivel === nivel && e.estado === EstadoEmergencia.EnEspera).length,
    }));
    return {
      enEspera: cola.filter((e) => e.estado === EstadoEmergencia.EnEspera).length,
      enAtencion: cola.filter((e) => e.estado === EstadoEmergencia.EnAtencion).length,
      atendidasHoy: hoy.filter((e) => e.estado === EstadoEmergencia.Atendida).length,
      registradasHoy: hoy.length,
      esperaPromedioMinutos: esperaPromedio,
      porNivel,
    };
  }

  // ------------------------------------------------------------------ flujo del medico
  async cambiarNivel(id: number, nivel: NivelTriage): Promise<Emergencia> {
    const e = await this.obtener(id);
    if (!ACTIVAS.includes(e.estado)) throw new BadRequestException('Solo se puede cambiar el nivel de una emergencia activa');
    e.nivel = nivel;
    await this.repo.save(e);
    return this.obtener(id);
  }

  /** El medico toma al paciente de la cola */
  async tomar(id: number, correo: string): Promise<Emergencia> {
    const medico = await this.medicoActual(correo);
    return this.dataSource.transaction(async (manager) => {
      const e = await manager
        .createQueryBuilder(Emergencia, 'e')
        .setLock('pessimistic_write')
        .where('e.id_emergencia = :id', { id })
        .getOne();
      if (!e) throw new NotFoundException('Emergencia no encontrada');
      const completa = await manager.findOne(Emergencia, { where: { id } });
      if (completa.estado === EstadoEmergencia.EnAtencion) {
        if (completa.medico?.id === medico.id) return completa;
        throw new ConflictException(`El paciente ya esta siendo atendido por Dr(a). ${completa.medico?.usuario.nombre} ${completa.medico?.usuario.apellido}`);
      }
      if (completa.estado !== EstadoEmergencia.EnEspera) throw new BadRequestException('Esta emergencia ya no esta en espera');
      await manager.update(Emergencia, id, { estado: EstadoEmergencia.EnAtencion, medico, fechaAtencion: new Date() });
      return manager.findOne(Emergencia, { where: { id } });
    });
  }

  /** Registra el diagnostico y cierra la atencion. Genera una cita completada y el historial medico. */
  async atender(id: number, dto: AtenderEmergenciaDto, correo: string) {
    const medico = await this.medicoActual(correo);
    const precio = await this.catalogos.precioEmergencia();

    const idCita = await this.dataSource.transaction(async (manager) => {
      const bloqueo = await manager
        .createQueryBuilder(Emergencia, 'e')
        .setLock('pessimistic_write')
        .where('e.id_emergencia = :id', { id })
        .getOne();
      if (!bloqueo) throw new NotFoundException('Emergencia no encontrada');
      const e = await manager.findOne(Emergencia, { where: { id } });

      if (e.estado === EstadoEmergencia.Atendida) throw new ConflictException('Esta emergencia ya fue atendida');
      if (e.estado === EstadoEmergencia.Retirada) throw new BadRequestException('El paciente se retiro antes de ser atendido');
      if (e.estado === EstadoEmergencia.EnAtencion && e.medico && e.medico.id !== medico.id) {
        throw new ForbiddenException('Esta emergencia la esta atendiendo otro medico');
      }

      const inicioAtencion = e.fechaAtencion ?? new Date();
      const ini = aMinutos(horaLocal(new Date(inicioAtencion)));
      const fin = Math.max(aMinutos(horaLocal()), ini + 15);
      const costo = CatalogosService.aplicarDescuento(precio, e.paciente.seguro, 'consulta');

      const cita = await manager.save(
        manager.create(Cita, {
          paciente: e.paciente,
          medico,
          horario: null,
          fecha: fechaLocal(new Date(inicioAtencion)),
          horaInicio: aHora(ini),
          horaFin: aHora(Math.min(fin, 23 * 60 + 59)),
          estado: EstadoCita.Completada,
          motivoConsulta: `EMERGENCIA (${ETIQUETA_TRIAGE[e.nivel]}): ${e.motivo}`,
          esEmergencia: true,
          costoConsulta: costo.costo,
          porcentajeDescuento: costo.porcentaje,
          montoDescuento: costo.descuento,
          totalPagar: costo.total,
          seguroAplicado: costo.seguro,
        }),
      );

      await manager.save(
        manager.create(HistorialMedico, {
          paciente: e.paciente,
          medico,
          diagnostico: `[Emergencia] ${dto.diagnostico.trim()}`,
          tratamiento: dto.tratamiento?.trim() || null,
        }),
      );

      await manager.update(Emergencia, id, {
        estado: EstadoEmergencia.Atendida,
        medico,
        fechaAtencion: inicioAtencion,
        fechaAlta: new Date(),
        diagnostico: dto.diagnostico.trim(),
        tratamiento: dto.tratamiento?.trim() || null,
        destino: dto.destino,
        observaciones: dto.observaciones?.trim() || null,
        cita,
      });
      return cita.id;
    });

    const cita = await this.dataSource.getRepository(Cita).findOne({ where: { id: idCita } });
    await this.notificaciones.enviar(
      cita,
      TipoNotificacion.correo,
      `Atencion de emergencia registrada. Total: Q${Number(cita.totalPagar ?? 0).toFixed(2)}.`,
    );
    return { emergencia: await this.obtener(id), idCita };
  }

  async retirar(id: number, motivo?: string): Promise<Emergencia> {
    const e = await this.obtener(id);
    if (!ACTIVAS.includes(e.estado)) throw new BadRequestException('Esta emergencia ya fue cerrada');
    e.estado = EstadoEmergencia.Retirada;
    e.fechaAlta = new Date();
    e.observaciones = motivo?.trim() || 'El paciente se retiro antes de ser atendido';
    await this.repo.save(e);
    return this.obtener(id);
  }
}
