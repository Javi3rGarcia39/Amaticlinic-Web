import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';

@Controller('api/estadisticas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('paciente/:idPaciente')
  paraPaciente(@Param('idPaciente', ParseIntPipe) idPaciente: number) {
    return this.estadisticasService.paraPaciente(idPaciente);
  }

  @Get('medico/:idMedico')
  paraMedico(@Param('idMedico', ParseIntPipe) idMedico: number) {
    return this.estadisticasService.paraMedico(idMedico);
  }

  // [Dashboard] Panel de recepcion
  @Get('recepcion')
  @Roles(TipoUsuario.Recepcionista)
  recepcion() {
    return this.estadisticasService.recepcion();
  }
}
