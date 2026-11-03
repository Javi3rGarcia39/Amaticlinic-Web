import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medico } from '../medicos/medico.entity';
import { Horario } from '../horarios/horario.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Cita } from '../citas/cita.entity';
import { PublicoController } from './publico.controller';

// [Landing]
@Module({
  imports: [TypeOrmModule.forFeature([Medico, Horario, Paciente, Cita])],
  controllers: [PublicoController],
})
export class PublicoModule {}
