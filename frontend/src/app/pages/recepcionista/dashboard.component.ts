import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { PanelRecepcion } from '../../core/models/models';
import { DatoColumna, GraficaColumnasComponent } from '../../shared/grafica-columnas.component';
import { BarrasHorizontalesComponent, DatoBarra } from '../../shared/barras-horizontales.component';
import { colorNivel } from '../../shared/triage';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fecha(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// [Dashboard] Panel de recepcion: actividad de hoy, citas por dia, demanda por especialidad,
// ocupacion de los medicos, emergencias e ingresos de los ultimos 30 dias.
@Component({
  selector: 'app-recepcionista-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, GraficaColumnasComponent, BarrasHorizontalesComponent],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Panel de recepcion</h1>
          <p class="text-gray-500">{{ hoyTexto }}</p>
        </div>
        <div class="flex gap-2">
          <a routerLink="/recepcionista/emergencias" class="btn-primary text-sm">Registrar emergencia</a>
          <a routerLink="/recepcionista/citas" class="btn-secondary text-sm">Ver citas</a>
        </div>
      </div>

      <ng-container *ngIf="p() as d; else cargando">
        <!-- Indicadores -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="card">
            <p class="text-sm text-gray-500">Citas de hoy</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.hoy.total }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.hoy.pendientes }} por atender, {{ d.hoy.completadas }} completadas, {{ d.hoy.canceladas }} canceladas</p>
          </div>
          <a routerLink="/recepcionista/emergencias" class="card block hover:border-primary/40" [class.border-red-200]="d.emergencias.enEspera > 0">
            <p class="text-sm text-gray-500">Emergencias en espera</p>
            <p class="text-3xl font-bold mt-1 tabular-nums" [ngClass]="d.emergencias.enEspera ? 'text-red-700' : 'text-gray-900'">{{ d.emergencias.enEspera }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.emergencias.atendidasHoy }} atendidas hoy, espera promedio {{ d.emergencias.esperaPromedioMinutos }} min</p>
          </a>
          <div class="card">
            <p class="text-sm text-gray-500">Ingresos de 30 dias</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">Q{{ d.ingresos30.total | number: '1.0-0' }}</p>
            <p class="text-xs text-gray-500 mt-1">Consultas y farmacia, ya con descuentos</p>
          </div>
          <div class="card">
            <p class="text-sm text-gray-500">Pacientes</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ d.totales.pacientes }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ d.totales.pacientesConSeguro }} con seguro, {{ d.totales.medicos }} medicos</p>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-3 mb-6">
          <section class="card lg:col-span-2">
            <h2 class="font-semibold text-gray-800">Citas por dia</h2>
            <!-- [ModoOscuro] "Hoy" se resalta en verde oscuro (modo claro) o verde de acento (modo oscuro) -->
            <p class="text-sm text-gray-500 mb-4">Ultimas 2 semanas y la proxima (sin canceladas). Hoy resaltado.</p>
            <app-grafica-columnas [datos]="serieDias()" titulo="Citas por dia" [alto]="180" />
          </section>

          <section class="card">
            <h2 class="font-semibold text-gray-800">Por atender hoy</h2>
            <ul class="mt-3 divide-y">
              <li *ngFor="let c of d.hoy.proximas" class="py-2.5 flex gap-3 text-sm">
                <span class="w-12 font-semibold text-gray-900 tabular-nums">{{ c.horaInicio }}</span>
                <span class="min-w-0">
                  <span class="block text-gray-900 truncate">{{ c.nombrePaciente }}</span>
                  <span class="block text-xs text-gray-500 truncate">Dr(a). {{ c.nombreMedico }}, {{ c.especialidad }}</span>
                </span>
              </li>
            </ul>
            <p *ngIf="!d.hoy.proximas.length" class="mt-3 text-sm text-gray-500">No quedan citas pendientes hoy.</p>
          </section>
        </div>

        <div class="grid gap-6 lg:grid-cols-2 mb-6">
          <section class="card">
            <h2 class="font-semibold text-gray-800">Demanda por especialidad</h2>
            <p class="text-sm text-gray-500 mb-4">Citas de los ultimos 30 dias</p>
            <app-barras-horizontales [datos]="especialidades()" titulo="Citas por especialidad" />
          </section>
          <section class="card">
            <h2 class="font-semibold text-gray-800">Ocupacion de esta semana</h2>
            <p class="text-sm text-gray-500 mb-4">Espacios de 30 min agendados sobre los disponibles en su horario</p>
            <app-barras-horizontales [datos]="ocupacion()" [maximo]="100" titulo="Ocupacion por medico" />
          </section>
        </div>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="card">
            <h2 class="font-semibold text-gray-800">Ingresos de 30 dias</h2>
            <dl class="mt-3 text-sm space-y-2">
              <div class="flex justify-between"><dt class="text-gray-600">Consultas (precio de lista)</dt><dd class="tabular-nums">Q{{ d.ingresos30.consultasBruto | number: '1.2-2' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-600">Descuentos de seguros</dt><dd class="tabular-nums text-emerald-700">-Q{{ d.ingresos30.descuentosSeguro | number: '1.2-2' }}</dd></div>
              <div class="flex justify-between font-medium"><dt>Consultas cobradas</dt><dd class="tabular-nums">Q{{ d.ingresos30.consultasNeto | number: '1.2-2' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-600">Farmacia cobrada</dt><dd class="tabular-nums">Q{{ d.ingresos30.farmaciaNeto | number: '1.2-2' }}</dd></div>
              <div class="flex justify-between"><dt class="text-gray-600">Descuentos en farmacia</dt><dd class="tabular-nums text-emerald-700">-Q{{ d.ingresos30.descuentosFarmacia | number: '1.2-2' }}</dd></div>
              <div class="flex justify-between font-semibold text-base border-t pt-2"><dt>Total</dt><dd class="tabular-nums">Q{{ d.ingresos30.total | number: '1.2-2' }}</dd></div>
            </dl>
          </section>
          <section class="card">
            <h2 class="font-semibold text-gray-800">Descuento por seguro</h2>
            <p class="text-sm text-gray-500 mb-4">En consultas completadas, ultimos 30 dias</p>
            <app-barras-horizontales [datos]="seguros()" titulo="Descuento por seguro" vacio="Ninguna consulta con seguro en este periodo." />
          </section>
          <section class="card">
            <h2 class="font-semibold text-gray-800">Emergencias en espera por prioridad</h2>
            <ul class="mt-3 space-y-2 text-sm">
              <li *ngFor="let n of d.emergencias.porNivel" class="flex items-center gap-3">
                <span class="w-2.5 h-6 rounded" [ngClass]="colorNivel(n.nivel)"></span>
                <span class="flex-1 text-gray-800">{{ n.etiqueta }}</span>
                <span class="tabular-nums font-medium">{{ n.enEspera }}</span>
              </li>
            </ul>
            <h3 class="font-semibold text-gray-800 mt-5">Estado de las citas (30 dias)</h3>
            <ul class="mt-2 space-y-1 text-sm">
              <li *ngFor="let e of d.porEstado30" class="flex justify-between"><span class="text-gray-600">{{ e.estado }}</span><span class="tabular-nums">{{ e.citas }}</span></li>
            </ul>
          </section>
        </div>
      </ng-container>
      <ng-template #cargando><p class="text-gray-500">Cargando indicadores...</p></ng-template>
    </main>
  `,
})
export class RecepcionistaDashboardComponent implements OnInit {
  private api = inject(ApiService);
  p = signal<PanelRecepcion | null>(null);
  colorNivel = colorNivel;
  hoyTexto = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  serieDias = computed<DatoColumna[]>(() =>
    (this.p()?.porDia ?? []).map((d) => {
      const f = fecha(d.fecha);
      return {
        etiqueta: `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`,
        corta: `${f.getDate()}`,
        valor: d.total - d.canceladas,
        resaltar: d.fecha === this.p()!.hoy.fecha,
        detalle: [`${d.completadas} completadas`, `${d.pendientes} pendientes`, `${d.canceladas} canceladas`],
      };
    }),
  );

  especialidades = computed<DatoBarra[]>(() => (this.p()?.porEspecialidad ?? []).map((e) => ({ etiqueta: e.especialidad, valor: e.citas })));

  ocupacion = computed<DatoBarra[]>(() =>
    (this.p()?.ocupacionSemana ?? [])
      .filter((o) => o.capacidad > 0)
      .map((o) => ({ etiqueta: o.medico, sub: `${o.especialidad}, ${o.citas} de ${o.capacidad}`, valor: o.porcentaje, texto: `${o.porcentaje}%` })),
  );

  seguros = computed<DatoBarra[]>(() =>
    (this.p()?.porSeguro30 ?? []).map((s) => ({
      etiqueta: s.seguro,
      sub: `${s.citas} ${s.citas === 1 ? 'consulta' : 'consultas'}`,
      valor: s.descuento,
      texto: `Q${s.descuento.toFixed(0)}`,
    })),
  );

  ngOnInit() {
    this.api.panelRecepcion().subscribe((d) => this.p.set(d));
  }
}
