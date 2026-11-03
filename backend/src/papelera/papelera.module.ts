import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { Horario } from '../horarios/horario.entity';
import { Cita } from '../citas/cita.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { Especialidad } from '../catalogos/especialidad.entity';
import { Seguro } from '../catalogos/seguro.entity';
import { RegistroEliminacion } from './entities/registro-eliminacion.entity';
import { SolicitudEliminacion } from './entities/solicitud-eliminacion.entity';
import { PapeleraService } from './papelera.service';
import { SolicitudesService } from './solicitudes.service';
import { PapeleraController, SolicitudesController } from './papelera.controller';

// [Eliminacion] Global: los controladores de citas, pacientes, medicos, etc. mandan aqui sus "Eliminar"
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario, Paciente, Medico, Horario, Cita, HistorialMedico, Especialidad, Seguro, RegistroEliminacion, SolicitudEliminacion,
    ]),
  ],
  controllers: [PapeleraController, SolicitudesController],
  providers: [PapeleraService, SolicitudesService],
  exports: [PapeleraService],
})
export class PapeleraModule {}
