import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Medico } from './medico.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';
import { TipoUsuario } from '../common/enums';
import { CatalogosService } from '../catalogos/catalogos.service'; // [Catalogo]
import { Especialidad } from '../catalogos/especialidad.entity';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Injectable()
export class MedicosService {
  constructor(
    @InjectRepository(Medico) private repo: Repository<Medico>,
    private usuariosService: UsuariosService,
    private catalogos: CatalogosService,
  ) {}

  // [Catalogo] Resuelve la especialidad del catalogo a partir del id o del nombre
  private async resolverEspecialidad(dto: { idEspecialidad?: number; especialidad?: string }): Promise<Especialidad> {
    if (dto.idEspecialidad) {
      const esp = await this.catalogos.obtenerEspecialidad(dto.idEspecialidad);
      if (!esp.activo) throw new BadRequestException(`La especialidad ${esp.nombre} esta desactivada`);
      return esp;
    }
    if (dto.especialidad?.trim()) return this.catalogos.buscarOCrearEspecialidad(dto.especialidad);
    throw new BadRequestException('La especialidad es obligatoria');
  }

  async crear(dto: CreateMedicoDto): Promise<Medico> {
    const especialidad = await this.resolverEspecialidad(dto);
    const existente = await this.usuariosService.buscarPorCorreo(dto.correo);
    if (existente) throw new BadRequestException('El correo ya esta registrado');

    const usuario = await this.usuariosService.crear({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      telefono: dto.telefono,
      password: dto.password && dto.password.length > 0 ? dto.password : Math.random().toString(36).slice(-10),
      tipoUsuario: TipoUsuario.Medico,
    });

    const medico = this.repo.create({
      usuario,
      especialidad: especialidad.nombre.slice(0, 50),
      especialidadCatalogo: especialidad,
      consultorio: dto.consultorio,
      anosExperiencia: dto.anosExperiencia ?? 0,
      descripcion: dto.descripcion ?? '',
    });
    return this.repo.save(medico);
  }

  async obtener(id: number): Promise<Medico> {
    const medico = await this.repo.findOne({ where: { id, ...NO_ELIMINADO } }); // [Eliminacion]
    if (!medico) throw new NotFoundException('Medico no encontrado');
    return medico;
  }

  buscarPorUsuario(idUsuario: number): Promise<Medico | null> {
    return this.repo.findOne({ where: { usuario: { id: idUsuario }, ...NO_ELIMINADO } }); // [Eliminacion]
  }

  listar(): Promise<Medico[]> {
    return this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
  }

  async buscar(query?: string, especialidad?: string): Promise<Medico[]> {
    const medicos = await this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
    return medicos.filter((m) => {
      let matches = true;
      if (especialidad && especialidad !== 'Todas las especialidades') {
        matches = m.especialidad.toLowerCase() === especialidad.toLowerCase();
      }
      if (query && matches) {
        const q = query.toLowerCase();
        matches =
          m.usuario.nombre.toLowerCase().includes(q) ||
          m.usuario.apellido.toLowerCase().includes(q) ||
          m.especialidad.toLowerCase().includes(q);
      }
      return matches;
    });
  }

  async buscarPorEspecialidad(especialidad: string): Promise<Medico[]> {
    const medicos = await this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
    return medicos.filter((m) => m.especialidad.toLowerCase() === especialidad.toLowerCase());
  }

  async actualizar(id: number, dto: UpdateMedicoDto): Promise<Medico> {
    const medico = await this.obtener(id);
    const especialidad = await this.resolverEspecialidad(dto);
    const usuario = medico.usuario;

    usuario.nombre = dto.nombre;
    usuario.apellido = dto.apellido;
    usuario.telefono = dto.telefono;

    if (usuario.correo !== dto.correo) {
      const existente = await this.usuariosService.buscarPorCorreo(dto.correo);
      if (existente) throw new BadRequestException('El correo ya esta registrado');
      usuario.correo = dto.correo;
    }

    if (dto.password) {
      usuario.password = await bcrypt.hash(dto.password, 10);
    }

    await this.usuariosService.guardar(usuario);

    medico.especialidad = especialidad.nombre.slice(0, 50);
    medico.especialidadCatalogo = especialidad;
    medico.consultorio = dto.consultorio;
    if (dto.anosExperiencia !== undefined) medico.anosExperiencia = dto.anosExperiencia;
    if (dto.descripcion !== undefined) medico.descripcion = dto.descripcion;

    return this.repo.save(medico);
  }
}
