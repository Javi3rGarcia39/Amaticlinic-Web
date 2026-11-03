import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { HorariosService } from './horarios.service';
import { CreateHorarioDto } from './dto/create-horario.dto';
import { UpdateHorarioDto } from './dto/update-horario.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

function toResponse(h: any) {
  return {
    id: h.id,
    idMedico: h.medico.id,
    nombreMedico: `Dr. ${h.medico.usuario.nombre} ${h.medico.usuario.apellido}`,
    especialidad: h.medico.especialidad,
    diaSemana: h.diaSemana,
    horaInicio: h.horaInicio,
    horaFin: h.horaFin,
  };
}

@Controller('api/horarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorariosController {
  constructor(private readonly horariosService: HorariosService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  @Roles(TipoUsuario.Recepcionista)
  async crear(@Body() dto: CreateHorarioDto) {
    return toResponse(await this.horariosService.crear(dto));
  }

  @Get()
  async listar() {
    return (await this.horariosService.listar()).map(toResponse);
  }

  @Get('slots-disponibles')
  slotsDisponibles(@Query('idMedico', ParseIntPipe) idMedico: number, @Query('fecha') fecha: string) {
    return this.horariosService.slotsDisponibles(idMedico, fecha);
  }

  // [Disponibilidad] Dias y espacios libres del medico (por defecto: proximos 30 dias, espacios de 30 min)
  @Get('medico/:idMedico/disponibilidad')
  disponibilidad(
    @Param('idMedico', ParseIntPipe) idMedico: number,
    @Query('desde') desde?: string,
    @Query('dias') dias?: string,
    @Query('duracion') duracion?: string,
  ) {
    return this.horariosService.disponibilidad(idMedico, desde, dias ? Number(dias) : 30, duracion ? Number(duracion) : 30);
  }

  @Get('medico/:idMedico')
  async listarPorMedico(@Param('idMedico', ParseIntPipe) idMedico: number) {
    return (await this.horariosService.listarPorMedico(idMedico)).map(toResponse);
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toResponse(await this.horariosService.obtener(id));
  }

  @Put(':id')
  @Roles(TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHorarioDto) {
    return toResponse(await this.horariosService.actualizar(id, dto));
  }

  @Delete(':id')
  @Roles(TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('horario', id, u.correo, motivo);
    return;
  }
}
