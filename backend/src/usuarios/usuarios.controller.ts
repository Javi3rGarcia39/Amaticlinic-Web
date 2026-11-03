import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RegistroDto } from '../auth/dto/registro.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

function toResponse(u: any) {
  const { password, ...rest } = u;
  return rest;
}

@Controller('api/usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuario.Recepcionista)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  async crear(@Body() dto: CreateUsuarioDto) {
    const usuario = await this.usuariosService.crearDesdeRequest(dto);
    return toResponse(usuario);
  }

  @Post('registro')
  async registrar(@Body() dto: RegistroDto) {
    const usuario = await this.usuariosService.crear({
      nombre: dto.nombre,
      apellido: dto.apellido,
      correo: dto.correo,
      telefono: dto.telefono,
      password: dto.password,
      tipoUsuario: dto.tipoUsuario ?? TipoUsuario.Paciente,
    });
    return toResponse(usuario);
  }

  @Get()
  async listar() {
    const usuarios = await this.usuariosService.listar();
    return usuarios.map(toResponse);
  }

  @Get('correo/:correo')
  async obtenerPorCorreo(@Param('correo') correo: string) {
    const usuario = await this.usuariosService.buscarPorCorreo(correo);
    return usuario ? toResponse(usuario) : null;
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toResponse(await this.usuariosService.obtener(id));
  }

  @Put(':id')
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return toResponse(await this.usuariosService.actualizar(id, dto));
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('usuario', id, u.correo, motivo);
    return;
  }
}
