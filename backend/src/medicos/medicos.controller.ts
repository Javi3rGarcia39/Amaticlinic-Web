import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from '../papelera/papelera.service'; // [Eliminacion]
import { CurrentUser } from '../common/decorators/current-user.decorator';

export function toMedicoResponse(m: any) {
  const usuario = m.usuario;
  return {
    id: m.id,
    idUsuario: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    telefono: usuario.telefono,
    especialidad: m.especialidad,
    idEspecialidad: m.especialidadCatalogo?.id ?? null, // [Catalogo]
    precioConsulta: Number(m.especialidadCatalogo?.precioConsulta ?? 0),
    consultorio: m.consultorio,
    anosExperiencia: m.anosExperiencia,
    descripcion: m.descripcion,
    rating: m.rating,
  };
}

@Controller('api/medicos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicosController {
  constructor(private readonly medicosService: MedicosService,
    private readonly papelera: PapeleraService, // [Eliminacion]
  ) {}

  @Post()
  @Roles(TipoUsuario.Recepcionista)
  async crear(@Body() dto: CreateMedicoDto) {
    return toMedicoResponse(await this.medicosService.crear(dto));
  }

  @Get()
  async listar() {
    return (await this.medicosService.listar()).map(toMedicoResponse);
  }

  @Get('buscar')
  async buscar(@Query('query') query?: string, @Query('especialidad') especialidad?: string) {
    return (await this.medicosService.buscar(query, especialidad)).map(toMedicoResponse);
  }

  @Get('especialidad/:especialidad')
  async buscarPorEspecialidad(@Param('especialidad') especialidad: string) {
    return (await this.medicosService.buscarPorEspecialidad(especialidad)).map(toMedicoResponse);
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return toMedicoResponse(await this.medicosService.obtener(id));
  }

  @Put(':id')
  @Roles(TipoUsuario.Medico, TipoUsuario.Recepcionista)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMedicoDto) {
    return toMedicoResponse(await this.medicosService.actualizar(id, dto));
  }

  @Delete(':id')
  @Roles(TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] No se borra de la base: va a la papelera
    await this.papelera.eliminar('medico', id, u.correo, motivo);
    return;
  }
}
