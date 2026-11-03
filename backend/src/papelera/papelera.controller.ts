import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TipoUsuario } from '../common/enums';
import { PapeleraService } from './papelera.service';
import { SolicitudesService, toSolicitudResponse } from './solicitudes.service';
import { CrearSolicitudDto, EliminarDefinitivoDto, ResolverSolicitudDto } from './dto/papelera.dto';

// [Eliminacion] Papelera (solo recepcion)
@Controller('api/papelera')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(TipoUsuario.Recepcionista)
export class PapeleraController {
  constructor(private readonly papelera: PapeleraService) {}

  @Get()
  listar() {
    return this.papelera.listar();
  }

  @Get('bitacora')
  bitacora() {
    return this.papelera.bitacora();
  }

  @Put(':tipo/:id/restaurar')
  restaurar(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number, @CurrentUser() u: any) {
    return this.papelera.restaurar(tipo, id, u.correo);
  }

  @Post(':tipo/:id/eliminar-definitivo')
  eliminarDefinitivo(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EliminarDefinitivoDto,
    @CurrentUser() u: any,
  ) {
    return this.papelera.eliminarDefinitivo(tipo, id, u.correo, dto.solicitadoPor, dto.motivo);
  }
}

// [Eliminacion] Solicitudes de eliminacion de datos (el paciente las crea, recepcion las resuelve)
@Controller('api/solicitudes-eliminacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudes: SolicitudesService) {}

  @Post()
  @Roles(TipoUsuario.Paciente)
  async crear(@Body() dto: CrearSolicitudDto, @CurrentUser() u: any) {
    return toSolicitudResponse(await this.solicitudes.crear(u.correo, dto.motivo));
  }

  @Get('mias')
  @Roles(TipoUsuario.Paciente)
  async mias(@CurrentUser() u: any) {
    return (await this.solicitudes.mias(u.correo)).map(toSolicitudResponse);
  }

  @Get()
  @Roles(TipoUsuario.Recepcionista)
  async listar() {
    return (await this.solicitudes.listar()).map(toSolicitudResponse);
  }

  @Put(':id/aprobar')
  @Roles(TipoUsuario.Recepcionista)
  async aprobar(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolverSolicitudDto, @CurrentUser() u: any) {
    return toSolicitudResponse(await this.solicitudes.aprobar(id, u.correo, dto.observacion));
  }

  @Put(':id/rechazar')
  @Roles(TipoUsuario.Recepcionista)
  async rechazar(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolverSolicitudDto, @CurrentUser() u: any) {
    return toSolicitudResponse(await this.solicitudes.rechazar(id, u.correo, dto.observacion));
  }
}
