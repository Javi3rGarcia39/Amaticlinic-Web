import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Horario } from './horario.entity';
import { Cita } from '../citas/cita.entity';
import { HorariosService } from './horarios.service';
import { HorariosController } from './horarios.controller';
import { MedicosModule } from '../medicos/medicos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Horario, Cita]), MedicosModule],
  controllers: [HorariosController],
  providers: [HorariosService],
  exports: [HorariosService],
})
export class HorariosModule {}
