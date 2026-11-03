import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards, Query } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

export function toPacienteResponse(p: any) {
  return {
    id: p.id,
    idUsuario: p.usuario.id,
    nombre: p.usuario.nombre,
    apellido: p.usuario.apellido,
    telefono: p.telefono,
    correo: p.correo,
    documentoIdentidad: p.documentoIdentidad,
    fechaNacimiento: p.fechaNacimiento,
    direccion: p.direccion,
    tipoSangre: p.tipoSangre,
    alergias: p.alergias,
    contactoEmergenciaNombre: p.contactoEmergenciaNombre,
    contactoEmergenciaTelefono: p.contactoEmergenciaTelefono,
    // [Seguros]
    idSeguro: p.seguro?.id ?? null,
    nombreSeguro: p.seguro?.nombre ?? null,
    seguroActivo: p.seguro?.activo ?? false,
    descuentoConsulta: p.seguro?.activo ? Number(p.seguro.descuentoConsulta) : 0,
    descuentoMedicamentos: p.seguro?.activo ? Number(p.seguro.descuentoMedicamentos) : 0,
    numeroPoliza: p.numeroPoliza ?? null,
  };
}

@Controller('api/pacientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  @Roles(TipoUsuario.Recepcionista)
  async crear(@Body() dto: CreatePacienteDto) {
    return toPacienteResponse(await this.pacientesService.crear(dto));
  }

  @Get()
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente, TipoUsuario.Recepcionista)
  async listar() {
    return (await this.pacientesService.listar()).map(toPacienteResponse);
  }

  @Get(':id')
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente, TipoUsuario.Recepcionista)
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toPacienteResponse(await this.pacientesService.obtener(id));
  }

  @Put(':id')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Recepcionista)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePacienteDto) {
    return toPacienteResponse(await this.pacientesService.actualizar(id, dto));
  }

  @Delete(':id')
  @Roles(TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('paciente', id, u.correo, motivo);
    return;
  }
}
