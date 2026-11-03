import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitasService } from './citas.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario, EstadoCita } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

export function toCitaResponse(c: any) {
  return {
    id: c.id,
    idPaciente: c.paciente.id,
    nombrePaciente: `${c.paciente.usuario.nombre} ${c.paciente.usuario.apellido}`,
    idMedico: c.medico.id,
    nombreMedico: `${c.medico.usuario.nombre} ${c.medico.usuario.apellido}`,
    especialidad: c.medico.especialidad,
    consultorio: c.medico.consultorio,
    fecha: c.fecha,
    horaInicio: c.horaInicio,
    horaFin: c.horaFin,
    estado: c.estado,
    motivoConsulta: c.motivoConsulta,
    esEmergencia: !!c.esEmergencia, // [Emergencias]
    // [Seguros] Costo de la consulta
    costoConsulta: c.costoConsulta !== null && c.costoConsulta !== undefined ? Number(c.costoConsulta) : null,
    porcentajeDescuento: Number(c.porcentajeDescuento ?? 0),
    montoDescuento: Number(c.montoDescuento ?? 0),
    totalPagar: c.totalPagar !== null && c.totalPagar !== undefined ? Number(c.totalPagar) : null,
    seguroAplicado: c.seguroAplicado ?? null,
  };
}

@Controller('api/citas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  @Roles(TipoUsuario.Paciente, TipoUsuario.Recepcionista)
  async agendar(@Body() dto: CreateCitaDto) {
    return toCitaResponse(await this.citasService.agendar(dto));
  }

  // [Seguros] Costo de la consulta con el descuento del seguro del paciente
  @Get('cotizar')
  cotizar(@Query('idMedico', ParseIntPipe) idMedico: number, @Query('idPaciente', ParseIntPipe) idPaciente: number) {
    return this.citasService.cotizar(idMedico, idPaciente);
  }

  @Get()
  async listarTodas() {
    return (await this.citasService.listarTodas()).map(toCitaResponse);
  }

  @Get('medico/:idMedico/fecha')
  async listarPorMedicoYFecha(@Param('idMedico', ParseIntPipe) idMedico: number, @Query('fecha') fecha: string) {
    return (await this.citasService.listarPorMedicoYFecha(idMedico, fecha)).map(toCitaResponse);
  }

  @Get('medico/:idMedico')
  async listarPorMedico(@Param('idMedico', ParseIntPipe) idMedico: number) {
    return (await this.citasService.listarPorMedico(idMedico)).map(toCitaResponse);
  }

  @Get('paciente/:idPaciente')
  async listarPorPaciente(@Param('idPaciente', ParseIntPipe) idPaciente: number) {
    return (await this.citasService.listarPorPaciente(idPaciente)).map(toCitaResponse);
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toCitaResponse(await this.citasService.obtener(id));
  }

  @Put(':id/cancelar')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async cancelar(@Param('id', ParseIntPipe) id: number) {
    return toCitaResponse(await this.citasService.cambiarEstado(id, EstadoCita.Cancelada, 'Cancelada por el usuario'));
  }

  @Put(':id/completar')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async completar(@Param('id', ParseIntPipe) id: number) {
    return toCitaResponse(await this.citasService.completar(id));
  }

  @Put(':id/reprogramar')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async reprogramar(
    @Param('id', ParseIntPipe) id: number,
    @Query('nuevoIdHorario', ParseIntPipe) nuevoIdHorario: number,
    @Query('nuevaFecha') nuevaFecha: string,
  ) {
    return toCitaResponse(await this.citasService.reprogramar(id, nuevoIdHorario, nuevaFecha));
  }

  @Delete(':id')
  @Roles(TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('cita', id, u.correo, motivo);
    return;
  }
}
