import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudEliminacion } from './entities/solicitud-eliminacion.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { PapeleraService } from './papelera.service';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion';

// [Eliminacion] Solicitudes de los pacientes para eliminar sus datos personales.
@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(SolicitudEliminacion) private repo: Repository<SolicitudEliminacion>,
    @InjectRepository(Paciente) private pacienteRepo: Repository<Paciente>,
    private papelera: PapeleraService,
  ) {}

  private async pacienteDe(correo: string): Promise<Paciente> {
    const p = await this.pacienteRepo.findOne({ where: { usuario: { correo }, ...NO_ELIMINADO } });
    if (!p) throw new NotFoundException('Paciente no encontrado');
    return p;
  }

  async crear(correo: string, motivo: string) {
    const paciente = await this.pacienteDe(correo);
    const pendiente = await this.repo.count({ where: { paciente: { id: paciente.id }, estado: 'Pendiente' } });
    if (pendiente) throw new ConflictException('Ya tienes una solicitud pendiente; recepcion la revisara pronto');
    return this.repo.save(this.repo.create({ paciente, motivo: motivo.trim(), estado: 'Pendiente' }));
  }

  async mias(correo: string) {
    const paciente = await this.pacienteDe(correo);
    return this.repo.find({ where: { paciente: { id: paciente.id } }, order: { fechaSolicitud: 'DESC' } });
  }

  listar() {
    return this.repo.find({ order: { fechaSolicitud: 'DESC' } });
  }

  private async pendiente(id: number) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Solicitud no encontrada');
    if (s.estado !== 'Pendiente') throw new ConflictException(`La solicitud ya fue ${s.estado.toLowerCase()}`);
    return s;
  }

  /** Aprueba: se anonimiza el paciente (datos personales fuera, registros clinicos conservados) */
  async aprobar(id: number, quien: string, observacion?: string) {
    const s = await this.pendiente(id);
    const solicitante = `${s.paciente.usuario.nombre} ${s.paciente.usuario.apellido} (paciente #${s.paciente.id})`;
    await this.papelera.anonimizar(s.paciente, quien, `Solicitud #${s.id}: ${s.motivo}`, solicitante);
    Object.assign(s, { estado: 'Aprobada', fechaResolucion: new Date(), resueltoPor: quien, observacion: observacion?.trim() || null });
    await this.repo.save(s);
    return this.repo.findOne({ where: { id } });
  }

  async rechazar(id: number, quien: string, observacion?: string) {
    if (!observacion?.trim()) throw new BadRequestException('Indica al paciente por que se rechaza la solicitud');
    const s = await this.pendiente(id);
    Object.assign(s, { estado: 'Rechazada', fechaResolucion: new Date(), resueltoPor: quien, observacion: observacion.trim() });
    await this.repo.save(s);
    await this.papelera.registrar('paciente', s.paciente.id, `Solicitud #${s.id} de paciente #${s.paciente.id}`, 'Solicitud rechazada', quien, null, observacion);
    return s;
  }
}

/** Respuesta sin datos de mas */
export function toSolicitudResponse(s: SolicitudEliminacion) {
  return {
    id: s.id,
    idPaciente: s.paciente.id,
    paciente: `${s.paciente.usuario.nombre} ${s.paciente.usuario.apellido}`,
    correo: s.paciente.anonimizado ? null : s.paciente.usuario.correo,
    anonimizado: s.paciente.anonimizado,
    motivo: s.motivo,
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud,
    fechaResolucion: s.fechaResolucion,
    resueltoPor: s.resueltoPor,
    observacion: s.observacion,
  };
}
