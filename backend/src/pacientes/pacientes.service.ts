import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paciente } from './paciente.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { CatalogosService } from '../catalogos/catalogos.service'; // [Seguros]
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Injectable()
export class PacientesService {
  constructor(
    @InjectRepository(Paciente) private repo: Repository<Paciente>,
    private usuariosService: UsuariosService,
    private catalogos: CatalogosService,
  ) {}

  async crear(dto: CreatePacienteDto): Promise<Paciente> {
    const usuario = await this.usuariosService.obtener(dto.idUsuario);
    const paciente = this.repo.create({
      ...dto,
      usuario,
      // [Paciente] Si no se envian, se toman el telefono y correo de la cuenta de usuario
      telefono: dto.telefono || usuario.telefono,
      correo: dto.correo || usuario.correo,
    });
    return this.repo.save(paciente);
  }

  async obtener(id: number): Promise<Paciente> {
    const paciente = await this.repo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    return paciente;
  }

  buscarPorUsuario(idUsuario: number): Promise<Paciente | null> {
    return this.repo.findOne({ where: { usuario: { id: idUsuario }, ...NO_ELIMINADO } }); // [Eliminacion]
  }

  listar(): Promise<Paciente[]> {
    return this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
  }

  async actualizar(id: number, dto: UpdatePacienteDto): Promise<Paciente> {
    const paciente = await this.obtener(id);
    const { idSeguro, ...datos } = dto;
    Object.keys(datos).forEach((key) => {
      if ((datos as any)[key] !== undefined) (paciente as any)[key] = (datos as any)[key];
    });
    // [Seguros] Asignar, cambiar o quitar el seguro
    if (idSeguro === null) {
      paciente.seguro = null;
      paciente.numeroPoliza = null;
    } else if (idSeguro !== undefined) {
      const seguro = await this.catalogos.obtenerSeguro(idSeguro);
      if (!seguro.activo) throw new BadRequestException(`El seguro ${seguro.nombre} esta desactivado`);
      paciente.seguro = seguro;
    }
    return this.repo.save(paciente);
  }
}
