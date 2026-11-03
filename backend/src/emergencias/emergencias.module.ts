import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emergencia } from './emergencia.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Cita } from '../citas/cita.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { EmergenciasService } from './emergencias.service';
import { EmergenciasController } from './emergencias.controller';

// [Emergencias]
@Module({
  imports: [
    TypeOrmModule.forFeature([Emergencia, Usuario, Medico, Paciente, Cita, HistorialMedico]),
    UsuariosModule,
    PacientesModule,
    NotificacionesModule,
  ],
  controllers: [EmergenciasController],
  providers: [EmergenciasService],
  exports: [EmergenciasService],
})
export class EmergenciasModule {}
