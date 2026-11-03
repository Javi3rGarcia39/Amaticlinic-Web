import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from '../citas/cita.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Horario } from '../horarios/horario.entity';
import { HistorialMedico } from '../historial/historial.entity';
import { Receta } from '../farmacia/entities/receta.entity';
import { MovimientoInventario } from '../farmacia/entities/movimiento-inventario.entity';
import { EmergenciasModule } from '../emergencias/emergencias.module';
import { EstadisticasService } from './estadisticas.service';
import { EstadisticasController } from './estadisticas.controller';

@Module({
  imports: [
    // [Dashboard] Mas entidades para los indicadores de cada rol
    TypeOrmModule.forFeature([Cita, Medico, Paciente, Horario, HistorialMedico, Receta, MovimientoInventario]),
    EmergenciasModule,
  ],
  controllers: [EstadisticasController],
  providers: [EstadisticasService],
})
export class EstadisticasModule {}
