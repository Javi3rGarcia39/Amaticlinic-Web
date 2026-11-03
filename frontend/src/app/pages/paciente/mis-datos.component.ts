import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { SolicitudEliminacion } from '../../core/models/models';

// [Eliminacion] El paciente puede pedir que se borren sus datos personales.
// Recepcion revisa la solicitud: si la aprueba, se anonimizan sus datos y su cuenta se cierra;
// si la rechaza, aqui se muestra el motivo.
@Component({
  selector: 'app-paciente-mis-datos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Mis datos y privacidad</h1>
      <p class="text-gray-500 mb-6">Tus datos solo se borran cuando tu lo solicitas.</p>

      <section class="card mb-6">
        <h2 class="font-semibold text-gray-800">Solicitar que se borren mis datos</h2>
        <p class="mt-2 text-sm text-gray-600">Si recepcion aprueba tu solicitud:</p>
        <ul class="mt-2 space-y-1.5 text-sm text-gray-700 list-disc pl-5">
          <li>Se borran tus datos personales: nombre, documento, telefono, correo, direccion y contacto de emergencia.</li>
          <li>Se cancelan tus citas futuras y tu cuenta se cierra.</li>
          <li>Tu historial medico y tus recetas se conservan sin tu nombre, como lo exige el expediente clinico.</li>
        </ul>

        <div *ngIf="pendiente() as p; else formulario" class="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu solicitud del {{ p.fechaSolicitud | date: 'dd/MM/yyyy' }} esta en revision. Recepcion te respondera pronto.
        </div>
        <ng-template #formulario>
          <form class="mt-5 space-y-3" (ngSubmit)="solicitar()">
            <div>
              <label class="label-field" for="motivo">Motivo</label>
              <textarea id="motivo" name="motivo" class="input-field" rows="3" [(ngModel)]="motivo" required
                        placeholder="Cuentanos brevemente por que quieres que borremos tus datos"></textarea>
            </div>
            <button type="submit" class="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    [disabled]="!motivo.trim() || enviando()">
              {{ enviando() ? 'Enviando...' : 'Solicitar eliminacion de mis datos' }}
            </button>
          </form>
        </ng-template>
      </section>

      <section class="card" *ngIf="solicitudes().length">
        <h2 class="font-semibold text-gray-800 mb-3">Mis solicitudes</h2>
        <ul class="divide-y">
          <li *ngFor="let s of solicitudes()" class="py-3 text-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-gray-900">{{ s.fechaSolicitud | date: 'dd/MM/yyyy HH:mm' }}</p>
              <span class="badge" [ngClass]="claseEstado(s.estado)">{{ s.estado }}</span>
            </div>
            <p class="text-gray-600 mt-1">{{ s.motivo }}</p>
            <p *ngIf="s.observacion" class="text-gray-600 mt-1"><span class="text-gray-500">Respuesta de recepcion:</span> {{ s.observacion }}</p>
          </li>
        </ul>
      </section>
    </main>
  `,
})
export class PacienteMisDatosComponent implements OnInit {
  private api = inject(ApiService);
  private avisos = inject(NotificacionService);

  solicitudes = signal<SolicitudEliminacion[]>([]);
  enviando = signal(false);
  motivo = '';

  pendiente = computed(() => this.solicitudes().find((s) => s.estado === 'Pendiente') ?? null);

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.misSolicitudesEliminacion().subscribe((s) => this.solicitudes.set(s));
  }

  solicitar() {
    if (!confirm('¿Enviar la solicitud para borrar tus datos personales? Recepcion la revisara.')) return;
    this.enviando.set(true);
    this.api.solicitarEliminacion(this.motivo.trim()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.motivo = '';
        this.avisos.exito('Solicitud enviada. Recepcion la revisara.');
        this.cargar();
      },
      error: (e) => {
        this.enviando.set(false);
        this.avisos.error(e?.error?.error ?? 'No se pudo enviar la solicitud');
      },
    });
  }

  claseEstado(estado: string) {
    return { Pendiente: 'bg-amber-100 text-amber-800', Aprobada: 'bg-emerald-50 text-emerald-800', Rechazada: 'bg-gray-100 text-gray-700' }[estado] ?? 'bg-gray-100 text-gray-700';
  }
}
