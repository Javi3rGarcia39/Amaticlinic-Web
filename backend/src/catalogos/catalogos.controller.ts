import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator'; // [Eliminacion]
import { PapeleraService } from '../papelera/papelera.service';
import { CatalogosService } from './catalogos.service';
import { EspecialidadDto, MetodoInventarioDto, PrecioEmergenciaDto, SeguroDto } from './dto/catalogos.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';
import { Especialidad } from './especialidad.entity';
import { Seguro } from './seguro.entity';

export function toEspecialidadResponse(e: Especialidad, medicos?: number) {
  return {
    id: e.id,
    nombre: e.nombre,
    descripcion: e.descripcion,
    precioConsulta: Number(e.precioConsulta),
    activo: e.activo,
    ...(medicos !== undefined ? { medicos } : {}),
  };
}

export function toSeguroResponse(s: Seguro, pacientes?: number) {
  return {
    id: s.id,
    nombre: s.nombre,
    descuentoConsulta: Number(s.descuentoConsulta),
    descuentoMedicamentos: Number(s.descuentoMedicamentos),
    telefono: s.telefono,
    activo: s.activo,
    ...(pacientes !== undefined ? { pacientes } : {}),
  };
}

// [Catalogo] Especialidades: la lista es publica (la usa la landing y el registro); editar es de recepcion
@Controller('api/especialidades')
export class EspecialidadesController {
  constructor(private readonly catalogos: CatalogosService, private readonly papelera: PapeleraService) {}

  @Get()
  async listar(@Query('todas') todas?: string) {
    const [lista, conteo] = await Promise.all([
      this.catalogos.listarEspecialidades(todas === 'true'),
      this.catalogos.conteoMedicosPorEspecialidad(),
    ]);
    return lista.map((e) => toEspecialidadResponse(e, conteo.get(e.id) ?? 0));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async crear(@Body() dto: EspecialidadDto) {
    return toEspecialidadResponse(await this.catalogos.crearEspecialidad(dto));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: EspecialidadDto) {
    return toEspecialidadResponse(await this.catalogos.actualizarEspecialidad(id, dto));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] Con medicos asignados se desactiva; sin medicos va a la papelera
    const esp = await this.catalogos.obtenerEspecialidad(id);
    const r = await this.catalogos.eliminarEspecialidad(id, u.correo, motivo);
    await this.papelera.registrar('especialidad', id, esp.nombre, r.eliminada ? 'Eliminado' : 'Desactivado', u.correo, null, motivo);
    return r;
  }
}

// [Seguros] Aseguradoras con convenio
@Controller('api/seguros')
export class SegurosController {
  constructor(private readonly catalogos: CatalogosService, private readonly papelera: PapeleraService) {}

  @Get()
  async listar(@Query('todos') todos?: string) {
    const [lista, conteo] = await Promise.all([
      this.catalogos.listarSeguros(todos === 'true'),
      this.catalogos.conteoPacientesPorSeguro(),
    ]);
    return lista.map((s) => toSeguroResponse(s, conteo.get(s.id) ?? 0));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async crear(@Body() dto: SeguroDto) {
    return toSeguroResponse(await this.catalogos.crearSeguro(dto));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: SeguroDto) {
    return toSeguroResponse(await this.catalogos.actualizarSeguro(id, dto));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TipoUsuario.Recepcionista)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() u: any, @Query('motivo') motivo?: string) {
    // [Eliminacion] Con pacientes asignados se desactiva; sin pacientes va a la papelera
    const seguro = await this.catalogos.obtenerSeguro(id);
    const r = await this.catalogos.eliminarSeguro(id, u.correo, motivo);
    await this.papelera.registrar('seguro', id, seguro.nombre, r.eliminado ? 'Eliminado' : 'Desactivado', u.correo, null, motivo);
    return r;
  }
}

// [Configuracion] Parametros generales
@Controller('api/configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracionController {
  constructor(private readonly catalogos: CatalogosService, private readonly papelera: PapeleraService) {}

  @Get()
  async obtener() {
    return {
      metodoInventario: await this.catalogos.metodoInventario(),
      precioEmergencia: await this.catalogos.precioEmergencia(),
    };
  }

  @Put('metodo-inventario')
  @Roles(TipoUsuario.Farmaceutico, TipoUsuario.Recepcionista)
  async metodo(@Body() dto: MetodoInventarioDto) {
    return { metodoInventario: await this.catalogos.cambiarMetodoInventario(dto.metodo) };
  }

  @Put('precio-emergencia')
  @Roles(TipoUsuario.Recepcionista)
  async precioEmergencia(@Body() dto: PrecioEmergenciaDto) {
    return { precioEmergencia: await this.catalogos.cambiarPrecioEmergencia(dto.precio) };
  }
}
