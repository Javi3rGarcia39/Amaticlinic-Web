import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { BotonTemaComponent } from './boton-tema.component'; // [ModoOscuro]
import { LogoComponent } from './logo.component'; // [Logo]

interface NavLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, BotonTemaComponent, LogoComponent],
  template: `
    <header class="bg-primary-dark text-white sticky top-0 z-10 no-print">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <!-- [Landing] El logo lleva a la pagina de inicio -->
        <a routerLink="/" class="flex items-center gap-2" aria-label="AmatiClinic, pagina de inicio">
          <app-logo [tamano]="34" /> <!-- [Logo] -->
        </a>
        <nav class="hidden lg:flex items-center gap-1">
          <a *ngFor="let link of links()" [routerLink]="link.path" routerLinkActive="bg-white/15"
             class="px-3 py-1.5 rounded-md text-sm hover:bg-white/10 transition">
            {{ link.label }}
          </a>
        </nav>
        <div class="flex items-center gap-3">
          <app-boton-tema /> <!-- [ModoOscuro] -->
          <span class="hidden sm:block text-sm text-white/80">{{ auth.user()?.nombre }} · {{ auth.user()?.rol }}</span>
          <button (click)="auth.logout()" class="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition">
            Salir
          </button>
        </div>
      </div>
      <nav class="lg:hidden flex overflow-x-auto gap-1 px-4 pb-2">
        <a *ngFor="let link of links()" [routerLink]="link.path" routerLinkActive="bg-white/15"
           class="px-3 py-1.5 rounded-md text-xs whitespace-nowrap hover:bg-white/10 transition">
          {{ link.label }}
        </a>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  constructor(public auth: AuthService) {}

  links = computed<NavLink[]>(() => {
    const rol = this.auth.user()?.rol;
    if (rol === 'Paciente') {
      return [
        { path: '/paciente/dashboard', label: 'Inicio' },
        { path: '/paciente/agendar', label: 'Agendar cita' },
        { path: '/paciente/mis-citas', label: 'Mis citas' },
        { path: '/paciente/medicos', label: 'Medicos' },
        { path: '/paciente/recetas', label: 'Mis recetas' }, // [Farmacia]
        { path: '/paciente/mis-datos', label: 'Mis datos' }, // [Eliminacion]
      ];
    }
    if (rol === 'Medico') {
      return [
        { path: '/medico/dashboard', label: 'Inicio' },
        { path: '/medico/citas', label: 'Mi agenda' },
        { path: '/medico/emergencias', label: 'Emergencias' }, // [Emergencias]
        { path: '/medico/pacientes', label: 'Pacientes' },
        { path: '/medico/historial', label: 'Historial' },
        { path: '/medico/recetas', label: 'Recetas' }, // [Farmacia]
      ];
    }
    if (rol === 'Recepcionista') {
      return [
        { path: '/recepcionista/dashboard', label: 'Inicio' },
        { path: '/recepcionista/citas', label: 'Citas' },
        { path: '/recepcionista/emergencias', label: 'Emergencias' }, // [Emergencias]
        { path: '/recepcionista/medicos', label: 'Medicos' },
        { path: '/recepcionista/horarios', label: 'Horarios' },
        { path: '/recepcionista/pacientes', label: 'Pacientes' },
        { path: '/recepcionista/catalogos', label: 'Catalogos' }, // [Catalogo]
        { path: '/recepcionista/papelera', label: 'Papelera' }, // [Eliminacion]
      ];
    }
    // [Farmacia] menu del farmaceutico
    if (rol === 'Farmaceutico') {
      return [
        { path: '/farmacia/dashboard', label: 'Inicio' },
        { path: '/farmacia/despacho', label: 'Despachar recetas' },
        { path: '/farmacia/inventario', label: 'Inventario' },
        { path: '/farmacia/valuacion', label: 'Valuacion' }, // [Lotes]
        { path: '/farmacia/movimientos', label: 'Movimientos' },
      ];
    }
    return [];
  });
}
