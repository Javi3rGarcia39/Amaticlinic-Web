import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Usuario } from './usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { TipoUsuario } from '../common/enums';
import { NO_ELIMINADO } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {}

  async crear(dto: { nombre: string; apellido: string; correo: string; telefono?: string; password: string; tipoUsuario: TipoUsuario }): Promise<Usuario> {
    const usuario = this.repo.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
    });
    return this.repo.save(usuario);
  }

  async crearDesdeRequest(dto: CreateUsuarioDto): Promise<Usuario> {
    return this.crear({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      telefono: dto.telefono,
      password: dto.password,
      tipoUsuario: dto.rol ?? TipoUsuario.Paciente,
    });
  }

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { correo } });
  }

  async obtener(id: number): Promise<Usuario> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ where: NO_ELIMINADO }); // [Eliminacion]
  }

  async actualizar(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.obtener(id);
    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.apellido !== undefined) usuario.apellido = dto.apellido;
    if (dto.correo !== undefined) usuario.correo = dto.correo;
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono;
    if (dto.password) usuario.password = await bcrypt.hash(dto.password, 10);
    return this.repo.save(usuario);
  }

  guardar(usuario: Usuario): Promise<Usuario> {
    return this.repo.save(usuario);
  }
}
