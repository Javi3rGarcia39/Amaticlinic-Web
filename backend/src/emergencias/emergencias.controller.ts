import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { EmergenciasService, toEmergenciaResponse } from './emergencias.service';
import { AtenderEmergenciaDto, CambiarNivelDto, RegistrarEmergenciaDto, RetirarEmergenciaDto } from './dto/emergencia.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TipoUsuario } from '../common/enums';

// [Emergencias] Recepcion registra y el medico atiende (pasa directo al diagnostico)
@Controller('api/emergencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergenciasController {
  constructor(private readonly service: EmergenciasService) {}

  @Post()
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  async registrar(@Body() dto: RegistrarEmergenciaDto, @CurrentUser() user: any) {
    return toEmergenciaResponse(await this.service.registrar(dto, user.correo));
  }

  @Get('cola')
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  async cola() {
    return (await this.service.cola()).map(toEmergenciaResponse);
  }

  @Get('historial')
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  async historial(@Query('desde') desde?: string) {
    return (await this.service.historial(desde)).map(toEmergenciaResponse);
  }

  @Get('resumen')
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  resumen() {
    return this.service.resumen();
  }

  @Get(':id')
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return toEmergenciaResponse(await this.service.obtener(id));
  }

  @Put(':id/nivel')
  @Roles(TipoUsuario.Recepcionista, TipoUsuario.Medico)
  async nivel(@Param('id', ParseIntPipe) id: number, @Body() dto: CambiarNivelDto) {
    return toEmergenciaResponse(await this.service.cambiarNivel(id, dto.nivel));
  }

  @Put(':id/tomar')
  @Roles(TipoUsuario.Medico)
  async tomar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return toEmergenciaResponse(await this.service.tomar(id, user.correo));
  }

  @Put(':id/atender')
  @Roles(TipoUsuario.Medico)
  async atender(@Param('id', ParseIntPipe) id: number, @Body() dto: AtenderEmergenciaDto, @CurrentUser() user: any) {
    const r = await this.service.atender(id, dto, user.correo);
    return { emergencia: toEmergenciaResponse(r.emergencia), idCita: r.idCita };
  }

  @Put(':id/retirar')
  @Roles(TipoUsuario.Recepcionista)
  async retirar(@Param('id', ParseIntPipe) id: number, @Body() dto: RetirarEmergenciaDto) {
    return toEmergenciaResponse(await this.service.retirar(id, dto.motivo));
  }
}
