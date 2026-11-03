import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { Horario } from '../horarios/horario.entity';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { PacientesModule } from '../pacientes/pacientes.module';
import { MedicosModule } from '../medicos/medicos.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cita, Horario]),
    PacientesModule,
    MedicosModule,
    NotificacionesModule,
  ],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
