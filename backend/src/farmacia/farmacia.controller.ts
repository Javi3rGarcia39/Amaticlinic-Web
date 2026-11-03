import { Controller, Get, UseGuards } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TipoUsuario } from '../common/enums';

// [Farmacia] Indicadores del panel del farmaceutico
@Controller('api/farmacia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FarmaciaController {
  constructor(private readonly recetas: RecetasService) {}

  @Get('resumen')
  @Roles(TipoUsuario.Farmaceutico)
  resumen() {
    return this.recetas.resumen();
  }
}
