import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Especialidad } from './especialidad.entity';
import { Seguro } from './seguro.entity';
import { Configuracion } from './configuracion.entity';
import { Medico } from '../medicos/medico.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { CatalogosService } from './catalogos.service';
import { ConfiguracionController, EspecialidadesController, SegurosController } from './catalogos.controller';

// [Catalogo] [Seguros] [Configuracion] Global para que citas, farmacia y emergencias usen los precios
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Especialidad, Seguro, Configuracion, Medico, Paciente])],
  controllers: [EspecialidadesController, SegurosController, ConfiguracionController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
