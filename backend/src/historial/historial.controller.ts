import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, Query } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { CreateHistorialDto } from './dto/create-historial.dto';
import { UpdateHistorialDto } from './dto/update-historial.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

function toResponse(h: any) {
  return {
    id: h.id,
    idPaciente: h.paciente.id,
    nombrePaciente: `${h.paciente.usuario.nombre} ${h.paciente.usuario.apellido}`,
    idMedico: h.medico.id,
    nombreMedico: `${h.medico.usuario.nombre} ${h.medico.usuario.apellido}`,
    especialidad: h.medico.especialidad,
    diagnostico: h.diagnostico,
    tratamiento: h.tratamiento,
    fechaRegistro: h.fechaRegistro,
  };
}

@Controller('api/historial')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialController {
  constructor(private readonly historialService: HistorialService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  @Roles(TipoUsuario.Medico)
  async crear(@Body() dto: CreateHistorialDto) {
    return toResponse(await this.historialService.registrar(dto));
  }

  @Get()
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente)
  async listar() {
    return (await this.historialService.listar()).map(toResponse);
  }

  @Get('paciente/:idPaciente')
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente)
  async listarPorPaciente(@Param('idPaciente', ParseIntPipe) idPaciente: number) {
    return (await this.historialService.listarPorPaciente(idPaciente)).map(toResponse);
  }

  @Get(':id')
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente)
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toResponse(await this.historialService.obtener(id));
  }

  @Put(':id')
  @Roles(TipoUsuario.Medico)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHistorialDto) {
    return toResponse(await this.historialService.actualizar(id, dto));
  }

  @Delete(':id')
  @Roles(TipoUsuario.Medico)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('historial', id, u.correo, motivo);
    return;
  }
}
