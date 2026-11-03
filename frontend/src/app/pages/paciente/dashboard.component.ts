import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { PanelPaciente } from '../../core/models/models';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// [Dashboard] Panel del paciente: proxima cita con su costo, seguro y ahorro, recetas por retirar
// y sus ultimos diagnosticos.
@Component({
  selector: 'app-paciente-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Hola, {{ auth.user()?.nombre }}</h1>
      <p class="text-gray-500 mb-6">Tu salud en AmatiClinic, en un vistazo.</p>

      <ng-container *ngIf="p() as d; else cargando">
        <div class="grid gap-6 lg:grid-cols-3 mb-6">
          <!-- Proxima cita -->
          <section class="lg:col-span-2 rounded-xl bg-primary-dark text-white p-6">
            <ng-container *ngIf="d.proximaCita as c; else sinCita">
              <p class="text-sm text-white/70">Tu proxima cita, {{ d.diasProximaCita === 0 ? 'hoy' : d.diasProximaCita === 1 ? 'manana' : 'en ' + d.diasProximaCita + ' dias' }}</p>
              <p class="mt-2 text-3xl font-bold leading-tight">{{ fechaLarga(c.fecha) }}, {{ c.horaInicio }}</p>
              <p class="mt-2 text-white/85">Dr(a). {{ c.nombreMedico }}, {{ c.especialidad }}<ng-container *ngIf="c.consultorio"> en {{ c.consultorio }}</ng-container></p>
              <p *ngIf="c.motivoConsulta" class="mt-1 text-sm text-white/70">Motivo: {{ c.motivoConsulta }}</p>
              <div class="mt-5 flex flex-wrap items-center gap-3">
                <span *ngIf="c.totalPagar !== null" class="rounded-lg bg-white/10 px-3 py-2 text-sm">A pagar en la consulta: <strong class="tabular-nums">Q{{ c.totalPagar | number: '1.2-2' }}</strong></span>
                <a routerLink="/paciente/mis-citas" class="px-4 py-2 rounded-lg bg-accent text-primary-dark font-semibold text-sm hover:bg-white">Ver mis citas</a>
              </div>
              <p *ngIf="d.proximasCitas.length > 1" class="mt-4 text-sm text-white/70">Despues: {{ siguientes() }}</p>
            </ng-container>
            <ng-template #sinCita>
              <p class="text-xl font-semibold">No tienes citas programadas</p>
              <p class="mt-1 text-white/75">Elige especialidad y medico, y reserva un horario libre.</p>
              <a routerLink="/paciente/agendar" class="mt-5 inline-block px-4 py-2 rounded-lg bg-accent text-primary-dark font-semibold text-sm hover:bg-white">Agendar una cita</a>
            </ng-template>
          </section>

          <!-- Seguro -->
          <section class="card">
            <h2 class="font-semibold text-gray-800">Tu seguro</h2>
            <ng-container *ngIf="d.seguro as s; else sinSeguro">
              <p class="mt-2 text-lg font-semibold text-gray-900">{{ s.nombre }}</p>
              <p *ngIf="s.poliza" class="text-sm text-gray-500">Poliza {{ s.poliza }}</p>
              <dl class="mt-4 space-y-1.5 text-sm">
                <div class="flex justify-between"><dt class="text-gray-600">Descuento en consultas</dt><dd class="font-medium">{{ s.descuentoConsulta }}%</dd></div>
                <div class="flex justify-between"><dt class="text-gray-600">Descuento en medicamentos</dt><dd class="font-medium">{{ s.descuentoMedicamentos }}%</dd></div>
                <div class="flex justify-between border-t pt-2 mt-2"><dt class="text-gray-600">Has ahorrado</dt><dd class="font-semibold text-emerald-700 tabular-nums">Q{{ d.ahorroSeguro | number: '1.2-2' }}</dd></div>
              </dl>
            </ng-container>
            <ng-template #sinSeguro>
              <p class="mt-2 text-sm text-gray-600">No tienes un seguro registrado. Si tu aseguradora tiene convenio, presenta tu poliza en recepcion y el descuento se aplicara solo.</p>
            </ng-template>
          </section>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="card">
            <h2 class="font-semibold text-gray-800">Recetas por retirar</h2>
            <p class="mt-2 text-3xl font-bold tabular-nums" [ngClass]="d.recetasPendientes ? 'text-gray-900' : 'text-gray-400'">{{ d.recetasPendientes }}</p>
            <p *ngIf="d.recetasPendientes" class="text-sm text-gray-600 mt-1">Presenta {{ d.recetasPendientesCodigos.length === 1 ? 'el codigo' : 'los codigos' }} <span class="font-mono">{{ d.recetasPendientesCodigos.join(', ') }}</span> en farmacia.</p>
            <p *ngIf="!d.recetasPendientes" class="text-sm text-gray-500 mt-1">No tienes medicamentos pendientes.</p>
            <a routerLink="/paciente/recetas" class="mt-3 inline-block text-sm text-primary hover:underline">Ver mis recetas</a>
          </section>

          <section class="card lg:col-span-2">
            <h2 class="font-semibold text-gray-800">Ultimos diagnosticos</h2>
            <ul class="mt-3 divide-y">
              <li *ngFor="let h of d.ultimosDiagnosticos" class="py-3 text-sm">
                <p class="text-gray-900">{{ h.diagnostico }}</p>
                <p *ngIf="h.tratamiento" class="text-gray-600">{{ h.tratamiento }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ h.fecha | date: 'dd/MM/yyyy' }}, Dr(a). {{ h.medico }} ({{ h.especialidad }})</p>
              </li>
            </ul>
            <p *ngIf="!d.ultimosDiagnosticos.length" class="mt-3 text-sm text-gray-500">Aun no tienes consultas registradas.</p>
            <p class="mt-3 text-xs text-gray-500">{{ d.consultasCompletadas }} {{ d.consultasCompletadas === 1 ? 'consulta completada' : 'consultas completadas' }}. Total pagado en consultas: Q{{ d.totalPagadoConsultas | number: '1.2-2' }}.</p>
          </section>
        </div>
      </ng-container>
      <ng-template #cargando><p class="text-gray-500">Cargando tu resumen...</p></ng-template>
    </main>
  `,
})
export class PacienteDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  p = signal<PanelPaciente | null>(null);

  ngOnInit() {
    const id = this.auth.user()?.idPerfil;
    if (id) this.api.panelPaciente(id).subscribe((d) => this.p.set(d));
  }

  fechaLarga(k: string) {
    const [y, m, d] = k.split('-').map(Number);
    const f = new Date(y, m - 1, d);
    const texto = `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  siguientes() {
    return (this.p()?.proximasCitas ?? [])
      .slice(1)
      .map((c) => `${this.fechaLarga(c.fecha).toLowerCase()} con Dr(a). ${c.nombreMedico}`)
      .join('; ');
  }
}
