import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { DestinoEmergencia, Emergencia } from '../../core/models/models';
import { colorNivel, etiquetaNivel, textoEspera } from '../../shared/triage';

// [Emergencias] Medico: toma al siguiente paciente de la cola y pasa directo al diagnostico.
// Al finalizar se genera una cita completada para poder emitir la receta.
@Component({
  selector: 'app-medico-emergencias',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Emergencias</h1>
          <p class="text-gray-500">Atiende primero a quien esta mas grave. La cola se actualiza sola cada 30 segundos.</p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_1.2fr] items-start">
        <!-- Cola -->
        <section class="card !p-0 overflow-hidden">
          <h2 class="px-5 py-3 border-b font-semibold text-gray-800">Cola ({{ enEspera() }} en espera)</h2>
          <p *ngIf="!cola().length" class="px-5 py-10 text-center text-gray-500">No hay pacientes en emergencias.</p>
          <ol>
            <li *ngFor="let e of cola(); let i = index" class="flex gap-3 px-5 py-4 border-b last:border-0"
                [ngClass]="{ 'bg-primary/5': actual()?.id === e.id }">
              <span class="w-1.5 rounded-full shrink-0" [ngClass]="colorNivel(e.nivel)" aria-hidden="true"></span>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-gray-900">{{ e.nombrePaciente }}</p>
                  <span class="text-xs px-2 py-0.5 rounded border" [ngClass]="etiquetaNivel(e.nivel)">{{ e.nivelEtiqueta }}</span>
                </div>
                <p class="text-sm text-gray-700">{{ e.motivo }}</p>
                <p class="text-xs mt-1" [ngClass]="e.excedeEspera ? 'text-red-700 font-semibold' : 'text-gray-500'">
                  {{ e.estado === 'EnEspera' ? 'Esperando ' + espera(e.minutosEspera) : 'En atencion con Dr(a). ' + e.nombreMedico }}
                </p>
              </div>
              <div class="shrink-0 self-center">
                <button *ngIf="e.estado === 'EnEspera'" class="btn-primary text-sm" (click)="tomar(e)" [disabled]="!!actual()">Atender</button>
                <button *ngIf="e.estado === 'EnAtencion' && e.idMedico === idMedico" class="btn-secondary text-sm" (click)="actual.set(e)">Continuar</button>
              </div>
            </li>
          </ol>
        </section>

        <!-- Atencion -->
        <section class="card" *ngIf="actual() as e; else sinPaciente">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-gray-500">Atendiendo</p>
              <h2 class="text-xl font-semibold text-gray-900">{{ e.nombrePaciente }}</h2>
              <p class="text-sm text-gray-600">
                <ng-container *ngIf="e.edad !== null">{{ e.edad }} anos</ng-container>
                <ng-container *ngIf="e.tipoSangre">, sangre {{ e.tipoSangre }}</ng-container>
                <ng-container *ngIf="e.seguro">, seguro {{ e.seguro }}</ng-container>
              </p>
            </div>
            <span class="text-xs px-2 py-1 rounded border" [ngClass]="etiquetaNivel(e.nivel)">{{ e.nivelEtiqueta }}</span>
          </div>

          <p *ngIf="e.alergias && e.alergias !== 'Ninguna'" class="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <strong>Alergias:</strong> {{ e.alergias }}
          </p>

          <div class="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <p class="text-gray-900"><span class="text-gray-500">Motivo:</span> {{ e.motivo }}</p>
            <dl class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div class="rounded-md bg-white border px-2 py-1.5"><dt class="text-xs text-gray-500">Presion</dt><dd class="font-medium">{{ e.presionArterial || '-' }}</dd></div>
              <div class="rounded-md bg-white border px-2 py-1.5"><dt class="text-xs text-gray-500">Pulso</dt><dd class="font-medium">{{ e.frecuenciaCardiaca ?? '-' }}</dd></div>
              <div class="rounded-md bg-white border px-2 py-1.5"><dt class="text-xs text-gray-500">Temperatura</dt><dd class="font-medium">{{ e.temperatura ? e.temperatura + ' °C' : '-' }}</dd></div>
              <div class="rounded-md bg-white border px-2 py-1.5"><dt class="text-xs text-gray-500">Saturacion</dt><dd class="font-medium" [class.text-red-700]="e.saturacion !== null && e.saturacion < 92">{{ e.saturacion !== null ? e.saturacion + '%' : '-' }}</dd></div>
            </dl>
          </div>

          <form class="mt-5 space-y-4" (ngSubmit)="finalizar(e)">
            <div>
              <label class="label-field" for="dx">Diagnostico</label>
              <textarea id="dx" name="dx" class="input-field" rows="2" [(ngModel)]="diagnostico" required></textarea>
            </div>
            <div>
              <label class="label-field" for="tx">Tratamiento aplicado e indicaciones</label>
              <textarea id="tx" name="tx" class="input-field" rows="3" [(ngModel)]="tratamiento"></textarea>
            </div>
            <fieldset>
              <legend class="label-field">Destino</legend>
              <div class="flex flex-wrap gap-2">
                <label *ngFor="let d of destinos" class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer"
                       [ngClass]="destino === d.valor ? 'border-primary bg-primary/5' : 'border-gray-200'">
                  <input type="radio" name="destino" [value]="d.valor" [(ngModel)]="destino" /> {{ d.texto }}
                </label>
              </div>
            </fieldset>
            <div>
              <label class="label-field" for="obs">Observaciones (opcional)</label>
              <input id="obs" name="obs" class="input-field" [(ngModel)]="observaciones" />
            </div>
            <div *ngIf="error()" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error() }}</div>
            <button type="submit" class="btn-primary" [disabled]="!diagnostico.trim() || guardando()">{{ guardando() ? 'Guardando...' : 'Finalizar atencion' }}</button>
          </form>
        </section>

        <ng-template #sinPaciente>
          <section class="card" *ngIf="cerrada() as c; else vacio">
            <h2 class="font-semibold text-gray-900">Atencion registrada</h2>
            <p class="text-sm text-gray-600 mt-1">{{ c.nombrePaciente }}: {{ c.diagnostico }}. Quedo en su historial medico.</p>
            <div class="mt-4 flex flex-wrap gap-3">
              <a [routerLink]="['/medico/citas', c.idCita, 'receta']" class="btn-primary text-sm">Emitir receta</a>
              <a [routerLink]="['/medico/citas', c.idCita]" class="btn-secondary text-sm">Ver la cita</a>
              <button class="text-sm text-primary hover:underline" (click)="cerrada.set(null)">Volver a la cola</button>
            </div>
          </section>
          <ng-template #vacio>
            <section class="card text-center py-12 text-gray-500">
              <p>Elige "Atender" en el primer paciente de la cola.</p>
            </section>
          </ng-template>
        </ng-template>
      </div>
    </main>
  `,
})
export class MedicoEmergenciasComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private avisos = inject(NotificacionService);

  colorNivel = colorNivel;
  etiquetaNivel = etiquetaNivel;
  espera = textoEspera;
  readonly idMedico = this.auth.user()?.idPerfil ?? null;
  readonly destinos: { valor: DestinoEmergencia; texto: string }[] = [
    { valor: 'Alta', texto: 'Alta a casa' },
    { valor: 'Observacion', texto: 'Queda en observacion' },
    { valor: 'Referido', texto: 'Referido a hospital' },
  ];

  cola = signal<Emergencia[]>([]);
  actual = signal<Emergencia | null>(null);
  cerrada = signal<Emergencia | null>(null);
  guardando = signal(false);
  error = signal('');
  diagnostico = '';
  tratamiento = '';
  destino: DestinoEmergencia = 'Alta';
  observaciones = '';
  private timer: any;

  enEspera = computed(() => this.cola().filter((e) => e.estado === 'EnEspera').length);

  ngOnInit() {
    this.refrescar(false);
    this.timer = setInterval(() => this.refrescar(true), 30000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  refrescar(silencioso: boolean) {
    this.api.colaEmergencias(silencioso).subscribe((c) => {
      this.cola.set(c);
      // Si el medico ya tenia un paciente en atencion (por ejemplo, recargo la pagina), lo retoma
      if (!this.actual()) {
        const mio = c.find((e) => e.estado === 'EnAtencion' && e.idMedico === this.idMedico);
        if (mio) this.actual.set(mio);
      }
    });
  }

  tomar(e: Emergencia) {
    this.error.set('');
    this.api.tomarEmergencia(e.id).subscribe({
      next: (tomada) => {
        this.cerrada.set(null);
        this.actual.set(tomada);
        this.diagnostico = '';
        this.tratamiento = '';
        this.destino = 'Alta';
        this.observaciones = '';
        this.refrescar(true);
      },
      error: (err) => {
        this.avisos.error(err?.error?.error ?? 'No se pudo tomar al paciente');
        this.refrescar(false);
      },
    });
  }

  finalizar(e: Emergencia) {
    this.guardando.set(true);
    this.error.set('');
    this.api
      .atenderEmergencia(e.id, {
        diagnostico: this.diagnostico,
        tratamiento: this.tratamiento || undefined,
        destino: this.destino,
        observaciones: this.observaciones || undefined,
      })
      .subscribe({
        next: (r) => {
          this.guardando.set(false);
          this.actual.set(null);
          this.cerrada.set(r.emergencia);
          this.avisos.exito('Atencion de emergencia registrada');
          this.refrescar(false);
        },
        error: (err) => {
          this.guardando.set(false);
          this.error.set(err?.error?.error ?? 'No se pudo registrar la atencion');
        },
      });
  }
}
