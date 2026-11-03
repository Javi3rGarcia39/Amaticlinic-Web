import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

import { Usuario } from './usuarios/usuario.entity';
import { Medico } from './medicos/medico.entity';
import { Paciente } from './pacientes/paciente.entity';
import { Horario } from './horarios/horario.entity';
import { Cita } from './citas/cita.entity';
import { HistorialMedico } from './historial/historial.entity';
import { Notificacion } from './notificaciones/notificacion.entity';
// [Farmacia] Entidades del modulo de farmacia
import { Medicamento } from './farmacia/entities/medicamento.entity';
import { Receta } from './farmacia/entities/receta.entity';
import { DetalleReceta } from './farmacia/entities/detalle-receta.entity';
import { MovimientoInventario } from './farmacia/entities/movimiento-inventario.entity';

import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MedicosModule } from './medicos/medicos.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { HorariosModule } from './horarios/horarios.module';
import { CitasModule } from './citas/citas.module';
import { HistorialModule } from './historial/historial.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { FarmaciaModule } from './farmacia/farmacia.module'; // [Farmacia]
// [Mejoras] Catalogos, seguros, lotes, emergencias y pagina publica
import { Especialidad } from './catalogos/especialidad.entity';
import { Seguro } from './catalogos/seguro.entity';
import { Configuracion } from './catalogos/configuracion.entity';
import { LoteMedicamento } from './farmacia/entities/lote-medicamento.entity';
import { Emergencia } from './emergencias/emergencia.entity';
import { CatalogosModule } from './catalogos/catalogos.module';
import { EmergenciasModule } from './emergencias/emergencias.module';
import { PublicoModule } from './publico/publico.module';
// [Eliminacion] Papelera, bitacora y solicitudes de eliminacion
import { RegistroEliminacion } from './papelera/entities/registro-eliminacion.entity';
import { SolicitudEliminacion } from './papelera/entities/solicitud-eliminacion.entity';
import { PapeleraModule } from './papelera/papelera.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // [Despliegue] Dos formas de conectarse, segun el entorno:
      //  - Desarrollo: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD y DB_DATABASE (PostgreSQL en Docker)
      //  - Produccion: DATABASE_URL, la cadena completa que entrega Neon (con SSL)
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const url = config.get<string>('DATABASE_URL');
        const zona = config.get('DB_TIMEZONE', process.env.TZ || 'America/Guatemala');
        // La zona horaria se manda al conectar solo en desarrollo. En Neon se deja fija en la base con
        // db/produccion-inicial.sql (ALTER DATABASE), porque la conexion con pool de Neon no acepta ese parametro.
        const zonaEnConexion = config.get('DB_TZ_EN_CONEXION', url ? 'false' : 'true') === 'true';
        return {
          type: 'postgres' as const,
          ...(url
            ? { url }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: parseInt(config.get('DB_PORT', '5432'), 10),
                username: config.get<string>('DB_USERNAME', 'postgres'),
                password: config.get<string>('DB_PASSWORD', 'postgres'),
                database: config.get<string>('DB_DATABASE', 'citas_medicas'),
              }),
          // [Despliegue] Neon exige conexion cifrada; Docker local no la usa
          ssl: config.get('DB_SSL', url ? 'true' : 'false') === 'true',
          entities: [
            Usuario, Medico, Paciente, Horario, Cita, HistorialMedico, Notificacion,
            Medicamento, Receta, DetalleReceta, MovimientoInventario, // [Farmacia]
            Especialidad, Seguro, Configuracion, LoteMedicamento, Emergencia, // [Mejoras]
            RegistroEliminacion, SolicitudEliminacion, // [Eliminacion]
          ],
          // [Mejoras] La sesion de PostgreSQL usa la misma zona horaria que Node (America/Guatemala).
          // Sin esto, PostgreSQL en Docker trabaja en UTC y las fechas que genera la base (now(),
          // CreateDateColumn) quedaban 6 horas adelantadas respecto a las que genera el backend.
          extra: {
            ...(zonaEnConexion ? { options: `-c TimeZone=${zona}` } : {}),
            // [Despliegue] En Vercel cada instancia abre pocas conexiones para no agotar las de Neon
            max: parseInt(config.get('DB_POOL_MAX', url ? '3' : '10'), 10),
          },
          // En desarrollo crea/actualiza las tablas automaticamente a partir de las entidades.
          // En produccion se recomienda usar migraciones (ver README) en lugar de synchronize.
          // [Despliegue] En produccion se deja en true solo para el primer despliegue (crea las tablas)
          // y despues se cambia DB_SYNCHRONIZE=false en Vercel.
          synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
          // [Despliegue] En Vercel no conviene esperar 9 reintentos de 3 s: falla rapido y muestra el error
          retryAttempts: url ? 2 : 9,
          retryDelay: url ? 1000 : 3000,
        };
      },
    }),
    AuthModule,
    UsuariosModule,
    MedicosModule,
    PacientesModule,
    HorariosModule,
    CitasModule,
    HistorialModule,
    NotificacionesModule,
    EstadisticasModule,
    FarmaciaModule, // [Farmacia]
    CatalogosModule, // [Mejoras]
    EmergenciasModule,
    PublicoModule,
    PapeleraModule, // [Eliminacion]
  ],
})
export class AppModule {}
