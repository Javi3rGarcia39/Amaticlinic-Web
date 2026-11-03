import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Cita } from '../../core/models/models';

// [Agenda] Vista de calendario (mes / semana) para la agenda del medico
// [Agenda] Vista de lista con filtro por rango de fechas, estado y paciente (se puede imprimir)

type Vista = 'mes' | 'semana' | 'lista';

interface Grupo {
  key: string;
  titulo: string;
  citas: Cita[];
}

interface Dia {
  fecha: Date;
  key: string; // YYYY-MM-DD en hora local
  numero: number;
  delMes: boolean;
  esHoy: boolean;
  citas: Cita[];
}

interface Bloque {
  cita: Cita;
  top: number;
  alto: number;
  izquierda: number; // %
  ancho: number; // %
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

// [Agenda] Fechas siempre en hora local (toISOString usa UTC y en Guatemala cambia de dia despues de las 6 pm)
function claveLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function desdeClave(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function sumarDias(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function inicioSemana(d: Date): Date {
  return sumarDias(d, -((d.getDay() + 6) % 7)); // la semana empieza el lunes
}
function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

@Component({
  selector: 'app-medico-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Encabezado: el selector de fecha lleva el calendario al dia elegido -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Mi agenda</h1>
          <!-- [Agenda] Solo aparece al imprimir la lista -->
          <p class="hidden print:block text-sm text-gray-600">Dr(a). {{ nombreMedico }} · Impreso el {{ impresoEl }}</p>
        </div>
        <div class="flex items-center gap-2 no-print" *ngIf="vista !== 'lista'">
          <button class="btn-secondary text-sm" (click)="irAHoy()">Hoy</button>
          <input class="input-field w-44" type="date" aria-label="Ir a la fecha"
                 [ngModel]="seleccion" (ngModelChange)="irAFecha($event)" />
        </div>
      </div>

      <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>

      <div class="grid gap-6" [ngClass]="{ 'lg:grid-cols-[1fr_320px]': vista !== 'lista' }">
        <!-- ================= Calendario ================= -->
        <section class="card !p-0 overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b">
            <div class="flex items-center gap-1" *ngIf="vista !== 'lista'; else tituloLista">
              <button class="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 text-lg" (click)="mover(-1)" [attr.aria-label]="vista === 'mes' ? 'Mes anterior' : 'Semana anterior'">‹</button>
              <button class="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 text-lg" (click)="mover(1)" [attr.aria-label]="vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente'">›</button>
              <h2 class="text-lg font-semibold text-gray-800 ml-2">{{ titulo }}</h2>
            </div>
            <ng-template #tituloLista>
              <h2 class="text-lg font-semibold text-gray-800">Citas del {{ rangoTexto }}</h2>
            </ng-template>
            <div class="inline-flex rounded-lg border p-0.5 text-sm no-print" role="tablist">
              <button class="px-3 py-1.5 rounded-md" [class.bg-primary]="vista === 'mes'" [class.text-white]="vista === 'mes'"
                      [class.text-gray-600]="vista !== 'mes'" (click)="cambiarVista('mes')">Mes</button>
              <button class="px-3 py-1.5 rounded-md" [class.bg-primary]="vista === 'semana'" [class.text-white]="vista === 'semana'"
                      [class.text-gray-600]="vista !== 'semana'" (click)="cambiarVista('semana')">Semana</button>
              <button class="px-3 py-1.5 rounded-md" [class.bg-primary]="vista === 'lista'" [class.text-white]="vista === 'lista'"
                      [class.text-gray-600]="vista !== 'lista'" (click)="cambiarVista('lista')">Lista</button>
            </div>
          </div>

          <p *ngIf="cargando" class="p-6 text-gray-500">Cargando agenda...</p>

          <!-- ---------- Vista mensual ---------- -->
          <div *ngIf="!cargando && vista === 'mes'">
            <div class="grid grid-cols-7 text-xs font-medium text-gray-500 border-b bg-gray-50">
              <div *ngFor="let d of diasSemana" class="px-2 py-2 text-center">{{ d }}</div>
            </div>
            <div class="grid grid-cols-7">
              <button *ngFor="let dia of celdas; let i = index" type="button"
                      class="relative flex flex-col items-stretch justify-start min-h-[64px] sm:min-h-[104px] border-b border-r p-1 sm:p-1.5 text-left transition-colors hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      [class.border-r-0]="(i + 1) % 7 === 0"
                      [class.bg-gray-50]="!dia.delMes"
                      [ngClass]="{ 'bg-primary/10': dia.key === seleccion }"
                      (click)="seleccionar(dia)"
                      [attr.aria-label]="etiquetaDia(dia)">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm"
                      [class.text-gray-400]="!dia.delMes"
                      [class.text-gray-800]="dia.delMes && !dia.esHoy"
                      [class.bg-primary]="dia.esHoy" [class.text-white]="dia.esHoy" [class.font-semibold]="dia.esHoy">
                  {{ dia.numero }}
                </span>

                <!-- Escritorio: hasta 3 citas por dia -->
                <div class="hidden sm:block space-y-1 mt-0.5">
                  <div *ngFor="let c of dia.citas.slice(0, 3)" class="truncate rounded px-1.5 py-0.5 text-[11px] leading-4 border-l-2"
                       [ngClass]="claseEstado(c.estado)">
                    {{ hora(c.horaInicio) }} {{ nombreCorto(c.nombrePaciente) }}
                  </div>
                  <div *ngIf="dia.citas.length > 3" class="text-[11px] text-gray-500 px-1">+{{ dia.citas.length - 3 }} mas</div>
                </div>

                <!-- Movil: solo un contador -->
                <span *ngIf="dia.citas.length" class="sm:hidden absolute bottom-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] leading-[18px] text-center">
                  {{ dia.citas.length }}
                </span>
              </button>
            </div>
          </div>

          <!-- ---------- Vista semanal ---------- -->
          <div *ngIf="!cargando && vista === 'semana'" class="overflow-x-auto">
            <div class="min-w-[720px]">
              <div class="grid grid-cols-[56px_repeat(7,1fr)] border-b bg-gray-50">
                <div></div>
                <button *ngFor="let dia of semana" type="button" class="py-2 text-center hover:bg-primary/5"
                        [ngClass]="{ 'bg-primary/10': dia.key === seleccion }" (click)="seleccionar(dia)">
                  <span class="block text-xs text-gray-500">{{ diasSemana[(dia.fecha.getDay() + 6) % 7] }}</span>
                  <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm mt-0.5"
                        [class.bg-primary]="dia.esHoy" [class.text-white]="dia.esHoy" [class.text-gray-800]="!dia.esHoy">{{ dia.numero }}</span>
                </button>
              </div>
              <div class="grid grid-cols-[56px_repeat(7,1fr)]">
                <div class="relative" [style.height.px]="horas.length * ALTO_HORA">
                  <div *ngFor="let h of horas; let i = index" class="absolute right-2 text-[11px] text-gray-400" [ngClass]="{ '-translate-y-2': i > 0 }" [style.top.px]="i * ALTO_HORA">
                    {{ h }}:00
                  </div>
                </div>
                <div *ngFor="let dia of semana" class="relative border-l" [style.height.px]="horas.length * ALTO_HORA"
                     [ngClass]="{ 'bg-primary/5': dia.key === seleccion }">
                  <div *ngFor="let h of horas; let i = index" class="absolute inset-x-0 border-t border-gray-100" [style.top.px]="i * ALTO_HORA"></div>
                  <a *ngFor="let b of bloques(dia)" [routerLink]="['/medico/citas', b.cita.id]"
                     class="absolute rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight overflow-hidden hover:shadow-md hover:z-10 transition-shadow"
                     [ngClass]="claseEstado(b.cita.estado)"
                     [style.top.px]="b.top" [style.height.px]="b.alto"
                     [style.left]="'calc(' + b.izquierda + '% + 2px)'" [style.width]="'calc(' + b.ancho + '% - 4px)'"
                     [title]="hora(b.cita.horaInicio) + ' - ' + hora(b.cita.horaFin) + ' · ' + b.cita.nombrePaciente + ' · ' + b.cita.estado">
                    <!-- Citas cortas en una sola linea; las largas muestran hora y nombre completo -->
                    <span *ngIf="b.alto < 44; else dosLineas" class="block truncate">
                      <span class="font-semibold">{{ hora(b.cita.horaInicio) }}</span> {{ nombreCorto(b.cita.nombrePaciente) }}
                    </span>
                    <ng-template #dosLineas>
                      <span class="font-semibold">{{ hora(b.cita.horaInicio) }} - {{ hora(b.cita.horaFin) }}</span>
                      <span class="block truncate">{{ b.cita.nombrePaciente }}</span>
                    </ng-template>
                  </a>
                </div>
              </div>
            </div>
          </div>


          <!-- ---------- [Agenda] Vista de lista con filtros ---------- -->
          <div *ngIf="!cargando && vista === 'lista'">
            <div class="px-4 py-4 border-b bg-gray-50 no-print">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label class="text-sm text-gray-600">
                  Desde
                  <input class="input-field mt-1" type="date" [(ngModel)]="desde" [max]="hasta || null" />
                </label>
                <label class="text-sm text-gray-600">
                  Hasta
                  <input class="input-field mt-1" type="date" [(ngModel)]="hasta" [min]="desde || null" />
                </label>
                <label class="text-sm text-gray-600">
                  Estado
                  <select class="input-field mt-1" [(ngModel)]="estadoFiltro">
                    <option value="">Todos</option>
                    <option *ngFor="let e of estados" [value]="e">{{ e }}</option>
                  </select>
                </label>
                <label class="text-sm text-gray-600">
                  Paciente
                  <input class="input-field mt-1" type="search" placeholder="Buscar por nombre..." [(ngModel)]="buscar" />
                </label>
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-3 text-sm">
                <span class="text-gray-500 mr-1">Rapido:</span>
                <button class="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50" (click)="rangoRapido('hoy')">Hoy</button>
                <button class="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50" (click)="rangoRapido('semana')">Esta semana</button>
                <button class="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50" (click)="rangoRapido('mes')">Este mes</button>
                <button class="px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50" (click)="rangoRapido('proximos')">Proximos 30 dias</button>
                <button class="ml-auto btn-secondary text-sm" (click)="imprimirLista()" [disabled]="totalLista === 0">Imprimir lista</button>
              </div>
            </div>

            <!-- Resumen del rango -->
            <div class="flex flex-wrap gap-2 px-4 py-3 border-b text-xs">
              <span class="px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">{{ totalLista }} {{ totalLista === 1 ? 'cita' : 'citas' }}</span>
              <ng-container *ngFor="let e of estados">
                <span *ngIf="conteo(e) > 0" class="px-2 py-1 rounded-md border-l-[3px] no-underline" [ngClass]="claseEstado(e)">{{ conteo(e) }} {{ e | lowercase }}</span>
              </ng-container>
            </div>

            <p *ngIf="!desde || !hasta" class="p-6 text-gray-500">Elige las fechas Desde y Hasta.</p>
            <p *ngIf="desde && hasta && totalLista === 0" class="p-6 text-gray-500">No hay citas que coincidan con los filtros.</p>

            <section *ngFor="let g of grupos" class="border-b last:border-b-0">
              <h3 class="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-50">
                {{ g.titulo }} <span class="font-normal text-gray-500">· {{ g.citas.length }} {{ g.citas.length === 1 ? 'cita' : 'citas' }}</span>
              </h3>
              <a *ngFor="let c of g.citas" [routerLink]="['/medico/citas', c.id]"
                 class="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 hover:bg-primary/5">
                <span class="w-24 shrink-0 text-sm font-medium text-gray-800">{{ hora(c.horaInicio) }} - {{ hora(c.horaFin) }}</span>
                <span class="flex-1 min-w-0">
                  <span class="block text-sm text-gray-800 truncate">{{ c.nombrePaciente }}</span>
                  <span *ngIf="c.motivoConsulta" class="block text-xs text-gray-500 truncate">{{ c.motivoConsulta }}</span>
                </span>
                <span class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-md border-l-[3px]" [ngClass]="claseEstado(c.estado)">{{ c.estado }}</span>
              </a>
            </section>
          </div>

          <!-- Leyenda -->
          <div *ngIf="vista !== 'lista'" class="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-t text-xs text-gray-600">
            <span *ngFor="let e of estados" class="inline-flex items-center gap-1.5">
              <span class="w-3.5 h-3.5 rounded-sm border-l-[3px] no-underline" [ngClass]="claseEstado(e)"></span>{{ e }}
            </span>
          </div>
        </section>

        <!-- ================= Detalle del dia seleccionado ================= -->
        <aside *ngIf="vista !== 'lista'" class="card h-fit lg:sticky lg:top-6">
          <p class="text-xs uppercase tracking-wide text-gray-500">{{ diaSemanaLargo }}</p>
          <h2 class="text-lg font-semibold text-gray-800">{{ fechaLarga }}</h2>
          <p class="text-sm text-gray-500 mb-4">
            {{ citasDia.length }} {{ citasDia.length === 1 ? 'cita' : 'citas' }}
            <ng-container *ngIf="pendientesDia > 0"> · {{ pendientesDia }} por atender</ng-container>
          </p>

          <div class="space-y-2">
            <a *ngFor="let c of citasDia" [routerLink]="['/medico/citas', c.id]"
               class="block rounded-lg border-l-4 px-3 py-2 hover:shadow-sm transition-shadow" [ngClass]="claseEstado(c.estado)">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-sm">{{ hora(c.horaInicio) }} - {{ hora(c.horaFin) }}</span>
                <span class="text-[11px] font-medium">{{ c.estado }}</span>
              </div>
              <p class="text-sm text-gray-800 mt-0.5">{{ c.nombrePaciente }}</p>
              <p *ngIf="c.motivoConsulta" class="text-xs text-gray-500 truncate">{{ c.motivoConsulta }}</p>
            </a>
          </div>
          <p *ngIf="!cargando && citasDia.length === 0" class="text-sm text-gray-500">No hay citas para este dia.</p>
        </aside>
      </div>
    </main>
  `,
})
export class MedicoCitasComponent implements OnInit {
  readonly diasSemana = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
  readonly estados = ['Agendada', 'Modificada', 'Completada', 'Cancelada'];
  readonly ALTO_HORA = 60;

  vista: Vista = 'mes';
  seleccion = claveLocal(new Date()); // dia seleccionado (tambien es el valor del selector de fecha)
  referencia = new Date(); // mes o semana que se esta mostrando
  cargando = true;
  error = '';

  celdas: Dia[] = [];
  semana: Dia[] = [];
  horas: number[] = [];
  titulo = '';
  private porDia = new Map<string, Cita[]>();
  private todas: Cita[] = [];

  // [Agenda] Filtros de la vista de lista (por defecto: la semana actual)
  desde = claveLocal(inicioSemana(new Date()));
  hasta = claveLocal(sumarDias(inicioSemana(new Date()), 6));
  estadoFiltro = '';
  buscar = '';
  private bloquesCache = new Map<string, Bloque[]>();

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    const idMedico = this.auth.user()?.idPerfil;
    if (!idMedico) return;
    // Se cargan todas las citas del medico una vez y se agrupan por dia
    this.api.listarCitasPorMedico(idMedico).subscribe({
      next: (citas) => {
        this.porDia.clear();
        this.todas = citas;
        for (const c of citas) {
          const lista = this.porDia.get(c.fecha) ?? [];
          lista.push(c);
          this.porDia.set(c.fecha, lista);
        }
        this.porDia.forEach((l) => l.sort((a, b) => minutos(a.horaInicio) - minutos(b.horaInicio)));
        this.cargando = false;
        this.actualizar();
      },
      error: () => {
        this.cargando = false;
        this.error = 'No se pudo cargar la agenda.';
        this.actualizar();
      },
    });
    this.actualizar();
  }

  // ---------------- Navegacion ----------------
  mover(paso: number) {
    const r = this.referencia;
    this.referencia = this.vista === 'mes' ? new Date(r.getFullYear(), r.getMonth() + paso, 1) : sumarDias(r, 7 * paso);
    this.actualizar();
  }

  irAHoy() {
    this.irAFecha(claveLocal(new Date()));
  }

  irAFecha(key: string) {
    if (!key) return;
    this.seleccion = key;
    this.referencia = desdeClave(key);
    this.actualizar();
  }

  seleccionar(dia: Dia) {
    this.seleccion = dia.key;
    if (!dia.delMes && this.vista === 'mes') this.referencia = dia.fecha;
    this.actualizar();
  }

  cambiarVista(v: Vista) {
    this.vista = v;
    this.referencia = desdeClave(this.seleccion);
    this.actualizar();
  }

  // ---------------- Calculo de la cuadricula ----------------
  private actualizar() {
    const hoy = claveLocal(new Date());
    const crearDia = (fecha: Date, delMes = true): Dia => {
      const key = claveLocal(fecha);
      return { fecha, key, numero: fecha.getDate(), delMes, esHoy: key === hoy, citas: this.porDia.get(key) ?? [] };
    };
    const r = this.referencia;

    if (this.vista === 'mes') {
      const primero = new Date(r.getFullYear(), r.getMonth(), 1);
      const inicio = inicioSemana(primero);
      const ultimo = new Date(r.getFullYear(), r.getMonth() + 1, 0);
      const totalCeldas = Math.ceil((((primero.getDay() + 6) % 7) + ultimo.getDate()) / 7) * 7;
      this.celdas = Array.from({ length: totalCeldas }, (_, i) => {
        const f = sumarDias(inicio, i);
        return crearDia(f, f.getMonth() === r.getMonth());
      });
      this.titulo = `${MESES[r.getMonth()]} ${r.getFullYear()}`;
    } else {
      const inicio = inicioSemana(r);
      this.semana = Array.from({ length: 7 }, (_, i) => crearDia(sumarDias(inicio, i)));
      const fin = this.semana[6].fecha;
      this.titulo =
        inicio.getMonth() === fin.getMonth()
          ? `${inicio.getDate()} - ${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${fin.getFullYear()}`
          : `${inicio.getDate()} ${MESES_CORTOS[inicio.getMonth()]} - ${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${fin.getFullYear()}`;
      this.calcularHoras();
    }
  }

  // Rango de horas de la vista semanal: 7:00 a 18:00 por defecto, ampliado si hay citas fuera de ese rango
  private calcularHoras() {
    let desde = 7;
    let hasta = 18;
    for (const d of this.semana) {
      for (const c of d.citas) {
        desde = Math.min(desde, Math.floor(minutos(c.horaInicio) / 60));
        hasta = Math.max(hasta, Math.ceil(minutos(c.horaFin) / 60));
      }
    }
    this.horas = Array.from({ length: hasta - desde }, (_, i) => desde + i);
    this.bloquesCache.clear();
  }

  // Posicion de cada cita en la columna del dia; las que se traslapan se reparten el ancho
  bloques(dia: Dia): Bloque[] {
    const cache = this.bloquesCache.get(dia.key);
    if (cache) return cache;
    const base = (this.horas[0] ?? 7) * 60;
    const carriles: number[] = [];
    const items = dia.citas.map((c) => {
      const ini = minutos(c.horaInicio);
      const fin = Math.max(minutos(c.horaFin), ini + 20);
      let carril = carriles.findIndex((finCarril) => finCarril <= ini);
      if (carril === -1) {
        carril = carriles.length;
        carriles.push(fin);
      } else {
        carriles[carril] = fin;
      }
      return { c, ini, fin, carril };
    });
    const total = Math.max(carriles.length, 1);
    const res = items.map(({ c, ini, fin, carril }) => ({
      cita: c,
      top: ((ini - base) / 60) * this.ALTO_HORA,
      alto: Math.max(((fin - ini) / 60) * this.ALTO_HORA - 2, 24),
      izquierda: (carril / total) * 100,
      ancho: 100 / total,
    }));
    this.bloquesCache.set(dia.key, res);
    return res;
  }

  // ---------------- [Agenda] Vista de lista ----------------
  get filtradas(): Cita[] {
    if (!this.desde || !this.hasta) return [];
    const texto = this.buscar.trim().toLowerCase();
    return this.todas
      .filter(
        (c) =>
          c.fecha >= this.desde &&
          c.fecha <= this.hasta &&
          (!this.estadoFiltro || c.estado === this.estadoFiltro) &&
          (!texto || (c.nombrePaciente ?? '').toLowerCase().includes(texto)),
      )
      .sort((a, b) => (a.fecha === b.fecha ? minutos(a.horaInicio) - minutos(b.horaInicio) : a.fecha < b.fecha ? -1 : 1));
  }

  get grupos(): Grupo[] {
    const grupos: Grupo[] = [];
    for (const c of this.filtradas) {
      let g = grupos[grupos.length - 1];
      if (!g || g.key !== c.fecha) {
        const d = desdeClave(c.fecha);
        g = { key: c.fecha, titulo: `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`, citas: [] };
        grupos.push(g);
      }
      g.citas.push(c);
    }
    return grupos;
  }

  get totalLista(): number {
    return this.filtradas.length;
  }

  conteo(estado: string): number {
    return this.filtradas.filter((c) => c.estado === estado).length;
  }

  get rangoTexto(): string {
    const f = (k: string) => {
      const d = desdeClave(k);
      return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
    };
    if (!this.desde || !this.hasta) return 'rango seleccionado';
    return this.desde === this.hasta ? f(this.desde) : `${f(this.desde)} al ${f(this.hasta)}`;
  }

  rangoRapido(tipo: 'hoy' | 'semana' | 'mes' | 'proximos') {
    const hoy = new Date();
    switch (tipo) {
      case 'hoy':
        this.desde = this.hasta = claveLocal(hoy);
        break;
      case 'semana':
        this.desde = claveLocal(inicioSemana(hoy));
        this.hasta = claveLocal(sumarDias(inicioSemana(hoy), 6));
        break;
      case 'mes':
        this.desde = claveLocal(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        this.hasta = claveLocal(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
        break;
      case 'proximos':
        this.desde = claveLocal(hoy);
        this.hasta = claveLocal(sumarDias(hoy, 30));
        break;
    }
  }

  // Imprime la lista filtrada (el menu y los filtros se ocultan con la clase no-print)
  imprimirLista() {
    const d = new Date();
    this.impresoEl = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setTimeout(() => window.print());
  }

  impresoEl = '';

  get nombreMedico(): string {
    const u = this.auth.user();
    return u ? `${u.nombre} ${u.apellido}` : '';
  }

  // ---------------- Panel del dia ----------------
  get citasDia(): Cita[] {
    return this.porDia.get(this.seleccion) ?? [];
  }

  get pendientesDia(): number {
    return this.citasDia.filter((c) => c.estado === 'Agendada' || c.estado === 'Modificada').length;
  }

  get diaSemanaLargo(): string {
    return DIAS_LARGOS[desdeClave(this.seleccion).getDay()];
  }

  get fechaLarga(): string {
    const d = desdeClave(this.seleccion);
    return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
  }

  // ---------------- Utilidades de presentacion ----------------
  claseEstado(estado: string): string {
    switch (estado) {
      case 'Agendada':
        return 'bg-primary/10 text-primary border-primary';
      case 'Modificada':
        return 'bg-amber-50 text-amber-800 border-amber-500';
      case 'Completada':
        return 'bg-emerald-50 text-emerald-800 border-emerald-500';
      case 'Cancelada':
        return 'bg-gray-100 text-gray-500 border-gray-300 line-through';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  hora(h: string): string {
    return h?.slice(0, 5) ?? '';
  }

  nombreCorto(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/);
    return partes.length > 1 ? `${partes[0]} ${partes[1][0]}.` : partes[0];
  }

  etiquetaDia(dia: Dia): string {
    const n = dia.citas.length;
    return `${dia.numero} de ${MESES[dia.fecha.getMonth()].toLowerCase()}, ${n} ${n === 1 ? 'cita' : 'citas'}`;
  }
}
