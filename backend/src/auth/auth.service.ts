import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { MedicosService } from '../medicos/medicos.service';
import { PacientesService } from '../pacientes/pacientes.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { TipoUsuario } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private medicosService: MedicosService,
    private pacientesService: PacientesService,
    private jwtService: JwtService,
  ) {}

  private async construirRespuesta(usuario: any) {
    const token = await this.jwtService.signAsync({
      sub: usuario.correo,
      tipoUsuario: usuario.tipoUsuario,
    });

    let idPerfil: number | null = null;
    if (usuario.tipoUsuario === TipoUsuario.Medico) {
      const medico = await this.medicosService.buscarPorUsuario(usuario.id);
      idPerfil = medico?.id ?? null;
    } else if (usuario.tipoUsuario === TipoUsuario.Paciente) {
      const paciente = await this.pacientesService.buscarPorUsuario(usuario.id);
      idPerfil = paciente?.id ?? null;
    }

    return {
      token,
      idUsuario: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      rol: usuario.tipoUsuario,
      idPerfil,
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.buscarPorCorreo(dto.correo);
    if (!usuario) throw new UnauthorizedException('Credenciales invalidas');

    const passwordOk = await bcrypt.compare(dto.password, usuario.password);
    if (!passwordOk) throw new UnauthorizedException('Credenciales invalidas');
    // [Eliminacion] Una cuenta en la papelera o anonimizada ya no puede entrar
    if (usuario.eliminadoEn) throw new UnauthorizedException('Esta cuenta fue eliminada. Comunicate con recepcion si necesitas recuperarla.');

    return this.construirRespuesta(usuario);
  }

  async registrar(dto: RegistroDto) {
    const existente = await this.usuariosService.buscarPorCorreo(dto.correo);
    if (existente) throw new BadRequestException('El correo ya esta registrado');

    const usuario = await this.usuariosService.crear({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      telefono: dto.telefono,
      password: dto.password,
      tipoUsuario: dto.tipoUsuario ?? TipoUsuario.Paciente,
    });

    if (usuario.tipoUsuario === TipoUsuario.Paciente){
      // [Paciente] El perfil se crea con el telefono y correo del registro
      await this.pacientesService.crear({
        idUsuario: usuario.id,
        telefono: dto.telefono,
        correo: dto.correo,
      });
    }

    return this.construirRespuesta(usuario);
  }
}
