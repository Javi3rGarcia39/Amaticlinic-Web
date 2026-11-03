import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { PanelMedico } from '../../core/models/models';
import { DatoColumna, GraficaColumnasComponent } from '../../shared/grafica-columnas.component';
import { colorNivel } from '../../shared/triage';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fecha(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// [Dashboard] Panel del medico: agenda de hoy, emergencias esperando, carga de la semana y actividad del mes
@Component({
  selector: 'app-medico-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, GraficaColumnasComponent],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Bienvenido, Dr(a). {{ auth.user()?.nombre }}</h1>
      <p class="text-gray-500 mb-6">{{ hoyTexto }}</p>

      <ng-container *ngIf="p() as d; else cargando">
        <!-- Emergencias esperando -->
        <a *ngIf="d.emergenciasEnEspera > 0" routerLink="/medico/emergencias"
           class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 hover:bg-red-100/60">
          <div>
            <p class="font-semibold text-red-800">{{ d.emergenciasEnEspera }} {{ d.emergenciasEnEspera === 1 ? 'paciente espera' : 'pacientes esperan' }} en emergencias</p>
            <p class="text-sm text-red-800/80">
              <ng-container *ngFor="let n of nivelesConEspera(); let last = last">{{ n.enEspera }} {{ n.etiqueta | lowercase }}{{ last ? '' : ', ' }}</ng-container>
            </p>
          </div>
          <span class="btn-primary text-sm">Ir a emergencias</span>
        </a>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="card">
            <p class="text-sm text-gray-500">Citas de hoy</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.citasHoy.length }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ pendientesHoy() }} por atender</p>
          </div>
          <div class="card">
            <p class="text-sm text-gray-500">Proxima cita</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.citasProgramadas ? (d.diasProximaCita === 0 ? 'Hoy' : 'En ' + d.diasProximaCita + ' d') : '-' }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.citasProgramadas }} citas programadas</p>
          </div>
          <div class="card">
            <p class="text-sm text-gray-500">Atendidas este mes</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.atendidasMes }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.pacientesAtendidosMes }} pacientes, Q{{ d.ingresosMes | number: '1.2-2' }} cobrados</p>
          </div>
          <div class="card">
            <p class="text-sm text-gray-500">Recetas este mes</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.recetasEmitidasMes }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.canceladasMes }} citas canceladas en el mes</p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3 mb-6">
          <section class="card lg:col-span-2">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Agenda de hoy</h2>
              <a routerLink="/medico/citas" class="text-sm text-primary hover:underline">Ver calendario</a>
            </div>
            <ol class="mt-3 divide-y">
              <li *ngFor="let c of d.citasHoy">
                <a [routerLink]="['/medico/citas', c.id]" class="flex items-center gap-4 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg">
                  <span class="w-28 shrink-0 font-semibold text-gray-900 tabular-nums whitespace-nowrap">{{ c.horaInicio }} - {{ c.horaFin }}</span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-gray-900 truncate">{{ c.nombrePaciente }}</span>
                    <span class="block text-xs text-gray-500 truncate">{{ c.motivoConsulta || 'Sin motivo indicado' }}</span>
                  </span>
                  <span class="text-xs px-2 py-0.5 rounded-md border-l-[3px] shrink-0" [ngClass]="claseEstado(c.estado)">{{ c.esEmergencia ? 'Emergencia' : c.estado }}</span>
                </a>
              </li>
            </ol>
            <p *ngIf="!d.citasHoy.length" class="mt-3 text-sm text-gray-500">No tienes citas hoy.</p>
          </section>

          <section class="card">
            <h2 class="font-semibold text-gray-800">Proximos 7 dias</h2>
            <p class="text-sm text-gray-500 mb-4">Citas agendadas por dia</p>
            <app-grafica-columnas [datos]="semana()" titulo="Citas de los proximos 7 dias" [alto]="150" />
          </section>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="card lg:col-span-2">
            <h2 class="font-semibold text-gray-800">Proximas citas</h2>
            <ul class="mt-3 divide-y">
              <li *ngFor="let c of d.proximasCitas" class="py-2.5 flex items-center gap-4 text-sm">
                <span class="w-36 shrink-0 text-gray-900 whitespace-nowrap">{{ corta(c.fecha) }}, {{ c.horaInicio }}</span>
                <span class="flex-1 min-w-0 truncate text-gray-800">{{ c.nombrePaciente }}</span>
                <span class="text-xs text-gray-500 truncate max-w-[40%]">{{ c.motivoConsulta }}</span>
              </li>
            </ul>
            <p *ngIf="!d.proximasCitas.length" class="mt-3 text-sm text-gray-500">No hay citas programadas despues de hoy.</p>
          </section>
          <section class="card">
            <h2 class="font-semibold text-gray-800">Consultas completadas</h2>
            <p class="text-sm text-gray-500 mb-4">Por semana, ultimas 4 semanas</p>
            <app-grafica-columnas [datos]="actividad()" titulo="Consultas completadas por semana" [alto]="150" />
          </section>
        </div>
      </ng-container>
      <ng-template #cargando><p class="text-gray-500">Cargando tu resumen...</p></ng-template>
    </main>
  `,
})
export class MedicoDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  p = signal<PanelMedico | null>(null);
  colorNivel = colorNivel;
  hoyTexto = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });

  pendientesHoy = computed(() => (this.p()?.citasHoy ?? []).filter((c) => c.estado === 'Agendada' || c.estado === 'Modificada').length);
  nivelesConEspera = computed(() => (this.p()?.emergenciasPorNivel ?? []).filter((n) => n.enEspera > 0));

  semana = computed<DatoColumna[]>(() =>
    (this.p()?.semana ?? []).map((d, i) => {
      const f = fecha(d.fecha);
      return { etiqueta: `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`, corta: i === 0 ? 'Hoy' : DIAS[f.getDay()], valor: d.citas, resaltar: i === 0 };
    }),
  );

  actividad = computed<DatoColumna[]>(() =>
    (this.p()?.actividad ?? []).map((a, i, arr) => {
      const d = fecha(a.desde);
      const h = fecha(a.hasta);
      return {
        etiqueta: `${d.getDate()} ${MESES[d.getMonth()]} al ${h.getDate()} ${MESES[h.getMonth()]}`,
        corta: i === arr.length - 1 ? 'Esta' : `${d.getDate()} ${MESES[d.getMonth()]}`,
        valor: a.completadas,
        resaltar: i === arr.length - 1,
      };
    }),
  );

  ngOnInit() {
    const id = this.auth.user()?.idPerfil;
    if (id) this.api.panelMedico(id).subscribe((d) => this.p.set(d));
  }

  corta(k: string) {
    const f = fecha(k);
    return `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`;
  }

  claseEstado(estado: string) {
    return {
      Agendada: 'bg-primary/10 text-primary border-primary',
      Modificada: 'bg-amber-50 text-amber-800 border-amber-500',
      Completada: 'bg-emerald-50 text-emerald-800 border-emerald-500',
      Cancelada: 'bg-gray-100 text-gray-500 border-gray-300',
    }[estado] ?? 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
