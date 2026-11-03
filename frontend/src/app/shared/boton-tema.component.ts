import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemaService } from '../core/services/tema.service';

// [ModoOscuro] Boton para cambiar entre modo claro y oscuro.
// Se usa sobre fondos oscuros (barra de navegacion, encabezado de la pagina de inicio, login y registro).
// Muestra la luna en modo claro y el sol en modo oscuro (el icono indica a que modo se cambia).
@Component({
  selector: 'app-boton-tema',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" (click)="tema.alternar()"
            class="inline-flex items-center justify-center w-9 h-9 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            [attr.aria-label]="tema.oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            [attr.title]="tema.oscuro ? 'Modo claro' : 'Modo oscuro'"
            [attr.aria-pressed]="tema.oscuro">
      <!-- Sol -->
      <svg *ngIf="tema.oscuro" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <!-- Luna -->
      <svg *ngIf="!tema.oscuro" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  `,
})
export class BotonTemaComponent {
  tema = inject(TemaService);
}
