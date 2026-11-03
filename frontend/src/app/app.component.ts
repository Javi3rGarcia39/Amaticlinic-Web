import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CargaService } from './core/services/carga.service';
import { NotificacionService } from './core/services/notificacion.service';
import { TemaService } from './core/services/tema.service'; // [ModoOscuro]

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <!-- [Interceptores] Barra de carga global -->
    <div class="fixed top-0 inset-x-0 h-0.5 z-50 overflow-hidden no-print" *ngIf="carga.activa()" role="progressbar" aria-label="Cargando">
      <div class="h-full w-1/3 bg-accent animate-barra-carga motion-reduce:animate-none motion-reduce:w-full"></div>
    </div>

    <router-outlet />

    <!-- [Interceptores] Avisos flotantes -->
    <div class="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 space-y-2 no-print" aria-live="polite">
      <div *ngFor="let a of avisos.avisos()" role="status"
           class="flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-sm border"
           [ngClass]="{
             'bg-red-50 border-red-200 text-red-800': a.tipo === 'error',
             'bg-emerald-50 border-emerald-200 text-emerald-800': a.tipo === 'exito',
             'bg-white border-gray-200 text-gray-800': a.tipo === 'info'
           }">
        <p class="flex-1">{{ a.mensaje }}</p>
        <button class="text-current/60 hover:text-current leading-none text-lg" (click)="avisos.cerrar(a.id)" aria-label="Cerrar aviso">×</button>
      </div>
    </div>
  `,
})
export class AppComponent {
  carga = inject(CargaService);
  avisos = inject(NotificacionService);
  private tema = inject(TemaService); // [ModoOscuro]
}
