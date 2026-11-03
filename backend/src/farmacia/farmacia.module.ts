import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Medicamento } from './entities/medicamento.entity';
import { Receta } from './entities/receta.entity';
import { DetalleReceta } from './entities/detalle-receta.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { Cita } from '../citas/cita.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { MedicamentosService } from './medicamentos.service';
import { RecetasService } from './recetas.service';
import { MedicamentosController } from './medicamentos.controller';
import { RecetasController } from './recetas.controller';
import { FarmaciaController } from './farmacia.controller';
import { LoteMedicamento } from './entities/lote-medicamento.entity'; // [Lotes]
import { LotesService } from './lotes.service';

// [Farmacia] Modulo de farmacia: catalogo, inventario (kardex), receta electronica y despacho
@Module({
  imports: [
    TypeOrmModule.forFeature([Medicamento, Receta, DetalleReceta, MovimientoInventario, LoteMedicamento, Cita, Medico, Paciente, Usuario]),
    NotificacionesModule,
  ],
  controllers: [MedicamentosController, RecetasController, FarmaciaController],
  providers: [MedicamentosService, RecetasService, LotesService],
  exports: [MedicamentosService, RecetasService, LotesService],
})
export class FarmaciaModule {}
