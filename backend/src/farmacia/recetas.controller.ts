import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { AnularRecetaDto, CreateRecetaDto, DespacharRecetaDto, VerificarAlergiasDto } from './dto/receta.dto';
import { toRecetaResponse } from './farmacia.mappers';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EstadoReceta, TipoUsuario } from '../common/enums';

// [Farmacia] Receta electronica
@Controller('api/recetas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecetasController {
  constructor(private readonly service: RecetasService) {}

  @Post()
  @Roles(TipoUsuario.Medico)
  async emitir(@Body() dto: CreateRecetaDto, @CurrentUser() user: any) {
    return toRecetaResponse(await this.service.emitir(dto, user.correo));
  }

  @Post('verificar-alergias')
  @Roles(TipoUsuario.Medico)
  verificarAlergias(@Body() dto: VerificarAlergiasDto) {
    return this.service.verificarAlergias(dto);
  }

  @Get()
  @Roles(TipoUsuario.Farmaceutico, TipoUsuario.Recepcionista)
  async listar(@Query('estado') estado?: EstadoReceta) {
    return (await this.service.listar(estado)).map(toRecetaResponse);
  }

  @Get('codigo/:codigo')
  @Roles(TipoUsuario.Farmaceutico, TipoUsuario.Medico)
  async porCodigo(@Param('codigo') codigo: string) {
    return toRecetaResponse(await this.service.porCodigo(codigo));
  }

  @Get('paciente/:idPaciente')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Medico, TipoUsuario.Farmaceutico)
  async porPaciente(@Param('idPaciente', ParseIntPipe) idPaciente: number, @CurrentUser() user: any) {
    return (await this.service.porPaciente(idPaciente, user)).map(toRecetaResponse);
  }

  @Get('medico/:idMedico')
  @Roles(TipoUsuario.Medico)
  async porMedico(@Param('idMedico', ParseIntPipe) idMedico: number) {
    return (await this.service.porMedico(idMedico)).map(toRecetaResponse);
  }

  @Get('cita/:idCita')
  @Roles(TipoUsuario.Medico, TipoUsuario.Paciente)
  async porCita(@Param('idCita', ParseIntPipe) idCita: number, @CurrentUser() user: any) {
    return (await this.service.porCita(idCita, user)).map(toRecetaResponse);
  }

  @Get(':id')
  @Roles(TipoUsuario.Paciente, TipoUsuario.Medico, TipoUsuario.Farmaceutico, TipoUsuario.Recepcionista)
  async obtener(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return toRecetaResponse(await this.service.obtener(id, user));
  }

  @Put(':id/despachar')
  @Roles(TipoUsuario.Farmaceutico)
  async despachar(@Param('id', ParseIntPipe) id: number, @Body() dto: DespacharRecetaDto, @CurrentUser() user: any) {
    const r = await this.service.despachar(id, dto, user.correo);
    return { ...r, receta: toRecetaResponse(r.receta) };
  }

  @Put(':id/anular')
  @Roles(TipoUsuario.Medico)
  async anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularRecetaDto, @CurrentUser() user: any) {
    return toRecetaResponse(await this.service.anular(id, dto, user.correo));
  }
}
