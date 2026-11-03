import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistorialMedico } from './historial.entity';
import { PacientesService } from '../pacientes/pacientes.service';
import { MedicosService } from '../medicos/medicos.service';
import { CreateHistorialDto } from './dto/create-historial.dto';
import { UpdateHistorialDto } from './dto/update-historial.dto';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(HistorialMedico) private repo: Repository<HistorialMedico>,
    private pacientesService: PacientesService,
    private medicosService: MedicosService,
  ) {}

  async registrar(dto: CreateHistorialDto): Promise<HistorialMedico> {
    const paciente = await this.pacientesService.obtener(dto.idPaciente);
    const medico = await this.medicosService.obtener(dto.idMedico);
    const historial = this.repo.create({
      paciente,
      medico,
      diagnostico: dto.diagnostico,
      tratamiento: dto.tratamiento,
    });
    return this.repo.save(historial);
  }

  async obtener(id: number): Promise<HistorialMedico> {
    const historial = await this.repo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!historial) throw new NotFoundException('Historial no encontrado');
    return historial;
  }

  listar(): Promise<HistorialMedico[]> {
    return this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
  }

  listarPorPaciente(idPaciente: number): Promise<HistorialMedico[]> {
    return this.repo.find({ where: { paciente: { id: idPaciente }, ...NO_ELIMINADO }, order: { fechaRegistro: 'DESC' } }); // [Eliminacion]
  }

  async actualizar(id: number, dto: UpdateHistorialDto): Promise<HistorialMedico> {
    const historial = await this.obtener(id);
    if (dto.diagnostico !== undefined) historial.diagnostico = dto.diagnostico;
    if (dto.tratamiento !== undefined) historial.tratamiento = dto.tratamiento;
    return this.repo.save(historial);
  }
}
