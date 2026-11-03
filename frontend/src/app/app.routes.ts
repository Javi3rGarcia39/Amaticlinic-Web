import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

import { LoginComponent } from './pages/login/login.component';
import { RegistroComponent } from './pages/registro/registro.component';
import { LandingComponent } from './pages/landing/landing.component'; // [Landing]

import { PacienteDashboardComponent } from './pages/paciente/dashboard.component';
import { AgendarCitaComponent } from './pages/paciente/agendar-cita.component';
import { MisCitasComponent } from './pages/paciente/mis-citas.component';
import { PacienteMedicosComponent } from './pages/paciente/medicos.component';

import { MedicoDashboardComponent } from './pages/medico/dashboard.component';
import { MedicoCitasComponent } from './pages/medico/citas.component';
import { CitaDetalleComponent } from './pages/medico/cita-detalle.component';
import { MedicoPacientesComponent } from './pages/medico/pacientes.component';
import { PacienteDetalleComponent } from './pages/medico/paciente-detalle.component';
import { MedicoHistorialComponent } from './pages/medico/historial.component';

import { RecepcionistaDashboardComponent } from './pages/recepcionista/dashboard.component';
import { RecepcionistaCitasComponent } from './pages/recepcionista/citas.component';
import { RecepcionistaMedicosComponent } from './pages/recepcionista/medicos.component';
import { RecepcionistaHorariosComponent } from './pages/recepcionista/horarios.component';
import { RecepcionistaPacientesComponent } from './pages/recepcionista/pacientes.component';

// [Farmacia]
import { EmitirRecetaComponent } from './pages/medico/emitir-receta.component';
import { MedicoRecetasComponent } from './pages/medico/recetas.component';
import { MisRecetasComponent } from './pages/paciente/mis-recetas.component';
import { FarmaciaDashboardComponent } from './pages/farmacia/dashboard.component';
import { FarmaciaDespachoComponent } from './pages/farmacia/despacho.component';
import { FarmaciaInventarioComponent } from './pages/farmacia/inventario.component';
import { FarmaciaMovimientosComponent } from './pages/farmacia/movimientos.component';

// [Mejoras]
import { RecepcionistaCatalogosComponent } from './pages/recepcionista/catalogos.component';
import { RecepcionistaEmergenciasComponent } from './pages/recepcionista/emergencias.component';
// [Eliminacion]
import { RecepcionistaPapeleraComponent } from './pages/recepcionista/papelera.component';
import { PacienteMisDatosComponent } from './pages/paciente/mis-datos.component';
import { MedicoEmergenciasComponent } from './pages/medico/emergencias.component';
import { FarmaciaValuacionComponent } from './pages/farmacia/valuacion.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },

  // Paciente
  { path: 'paciente/dashboard', component: PacienteDashboardComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },
  { path: 'paciente/agendar', component: AgendarCitaComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },
  { path: 'paciente/mis-citas', component: MisCitasComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },
  { path: 'paciente/medicos', component: PacienteMedicosComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },

  // Medico
  { path: 'medico/dashboard', component: MedicoDashboardComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/citas', component: MedicoCitasComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/citas/:id', component: CitaDetalleComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/pacientes', component: MedicoPacientesComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/pacientes/:id', component: PacienteDetalleComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/historial', component: MedicoHistorialComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },

  // Recepcionista
  { path: 'recepcionista/dashboard', component: RecepcionistaDashboardComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'recepcionista/citas', component: RecepcionistaCitasComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'recepcionista/medicos', component: RecepcionistaMedicosComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'recepcionista/horarios', component: RecepcionistaHorariosComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'recepcionista/pacientes', component: RecepcionistaPacientesComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },

  // [Farmacia] Receta electronica (medico y paciente)
  { path: 'medico/citas/:id/receta', component: EmitirRecetaComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'medico/recetas', component: MedicoRecetasComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'paciente/recetas', component: MisRecetasComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },

  // [Farmacia] Panel del farmaceutico
  { path: 'farmacia/dashboard', component: FarmaciaDashboardComponent, canActivate: [authGuard], data: { roles: ['Farmaceutico'] } },
  { path: 'farmacia/despacho', component: FarmaciaDespachoComponent, canActivate: [authGuard], data: { roles: ['Farmaceutico'] } },
  { path: 'farmacia/inventario', component: FarmaciaInventarioComponent, canActivate: [authGuard], data: { roles: ['Farmaceutico'] } },
  { path: 'farmacia/movimientos', component: FarmaciaMovimientosComponent, canActivate: [authGuard], data: { roles: ['Farmaceutico'] } },

  // [Mejoras] Catalogos, emergencias y valuacion del inventario
  { path: 'recepcionista/catalogos', component: RecepcionistaCatalogosComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  // [Eliminacion] Papelera de recepcion y datos del paciente
  { path: 'recepcionista/papelera', component: RecepcionistaPapeleraComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'paciente/mis-datos', component: PacienteMisDatosComponent, canActivate: [authGuard], data: { roles: ['Paciente'] } },
  { path: 'recepcionista/emergencias', component: RecepcionistaEmergenciasComponent, canActivate: [authGuard], data: { roles: ['Recepcionista'] } },
  { path: 'medico/emergencias', component: MedicoEmergenciasComponent, canActivate: [authGuard], data: { roles: ['Medico'] } },
  { path: 'farmacia/valuacion', component: FarmaciaValuacionComponent, canActivate: [authGuard], data: { roles: ['Farmaceutico'] } },

  // [Landing] La pagina publica es la de inicio
  { path: '', component: LandingComponent, pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
