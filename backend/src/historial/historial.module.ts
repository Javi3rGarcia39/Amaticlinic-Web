import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialMedico } from './historial.entity';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';
import { PacientesModule } from '../pacientes/pacientes.module';
import { MedicosModule } from '../medicos/medicos.module';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialMedico]), PacientesModule, MedicosModule],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}
