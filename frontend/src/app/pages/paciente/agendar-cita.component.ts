import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Cita, Cobro, DiaDisponible, Disponibilidad, Especialidad, Medico, SlotAgenda } from '../../core/models/models';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DIAS_RANGO = 60;

interface Celda {
  fecha: string;
  numero: number;
  delMes: boolean;
  dia: DiaDisponible | null;
}

function clave(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function desdeClave(k: string) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// [Disponibilidad] Agendar en pasos: especialidad -> medico -> dia (solo los que atiende) -> hora libre -> confirmar.
// [Seguros] Antes de confirmar se muestra el costo con el descuento del seguro del paciente.
@Component({
  selector: 'app-agendar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, RouterLink],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Agendar una cita</h1>
      <p class="text-gray-500 mb-6">Solo se muestran los dias que atiende el medico y los horarios que siguen libres.</p>

      <!-- Confirmacion -->
      <div *ngIf="confirmada() as c" class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 class="font-semibold text-emerald-900">Cita agendada</h2>
        <p class="mt-1 text-sm text-emerald-900">
          {{ fechaLarga(c.fecha) }} a las {{ c.horaInicio.slice(0, 5) }} con Dr(a). {{ c.nombreMedico }} ({{ c.consultorio || c.especialidad }}).
          <ng-container *ngIf="c.totalPagar !== null">Total a pagar: <strong>Q{{ c.totalPagar | number: '1.2-2' }}</strong>.</ng-container>
        </p>
        <div class="mt-3 flex flex-wrap gap-3">
          <a routerLink="/paciente/mis-citas" class="btn-primary text-sm">Ver mis citas</a>
          <button class="btn-secondary text-sm" (click)="confirmada.set(null)">Agendar otra</button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div class="space-y-6">
          <!-- Paso 1 y 2: especialidad y medico -->
          <section class="card">
            <h2 class="font-semibold text-gray-800">Medico</h2>
            <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Especialidad">
              <button type="button" class="px-3 py-1.5 rounded-full text-sm border"
                      [ngClass]="idEspecialidad() === null ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary'"
                      [attr.aria-pressed]="idEspecialidad() === null" (click)="idEspecialidad.set(null)">Todas</button>
              <button type="button" *ngFor="let e of especialidadesConMedicos()" class="px-3 py-1.5 rounded-full text-sm border"
                      [ngClass]="idEspecialidad() === e.id ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:border-primary'"
                      [attr.aria-pressed]="idEspecialidad() === e.id" (click)="idEspecialidad.set(e.id)">
                {{ e.nombre }}
              </button>
            </div>
            <div class="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Medicos">
              <button type="button" *ngFor="let m of medicosFiltrados()" role="radio" [attr.aria-checked]="medico()?.id === m.id"
                      class="text-left rounded-lg border px-4 py-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      [ngClass]="medico()?.id === m.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-gray-200 hover:border-primary/50'"
                      (click)="elegirMedico(m)">
                <span class="block font-medium text-gray-900">Dr(a). {{ m.nombre }} {{ m.apellido }}</span>
                <span class="block text-sm text-gray-500">{{ m.especialidad }}<ng-container *ngIf="m.consultorio">, {{ m.consultorio }}</ng-container></span>
                <span class="block text-sm text-gray-700 mt-1">Consulta Q{{ m.precioConsulta | number: '1.2-2' }}</span>
              </button>
            </div>
            <p *ngIf="!medicosFiltrados().length" class="mt-4 text-sm text-gray-500">No hay medicos en esta especialidad.</p>
          </section>

          <!-- Paso 3: calendario -->
          <section class="card" *ngIf="medico() as m">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="font-semibold text-gray-800">Dia</h2>
                <p class="text-sm text-gray-500" *ngIf="disponibilidad() as d">
                  Atiende: {{ d.diasAtencion.length ? diasOrdenados(d.diasAtencion) : 'sin horario configurado' }}.
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button class="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 text-lg disabled:opacity-30" (click)="moverMes(-1)" [disabled]="!puedeRetroceder()" aria-label="Mes anterior">‹</button>
                <span class="w-36 text-center font-medium text-gray-800">{{ tituloMes() }}</span>
                <button class="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 text-lg disabled:opacity-30" (click)="moverMes(1)" [disabled]="!puedeAvanzar()" aria-label="Mes siguiente">›</button>
              </div>
            </div>

            <p *ngIf="cargandoDisp()" class="py-8 text-center text-sm text-gray-500">Buscando dias disponibles...</p>
            <ng-container *ngIf="!cargandoDisp() && disponibilidad() as d">
              <p *ngIf="!d.dias.length" class="py-8 text-center text-sm text-gray-500">Este medico aun no tiene horario de atencion. Elige otro medico.</p>
              <div *ngIf="d.dias.length" class="mt-4">
                <div class="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
                  <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
                </div>
                <div class="grid grid-cols-7 gap-1">
                  <ng-container *ngFor="let c of celdas()">
                    <span *ngIf="!c.delMes" class="h-14"></span>
                    <button *ngIf="c.delMes" type="button"
                            class="h-14 rounded-lg text-sm flex flex-col items-center justify-center border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            [disabled]="!c.dia || c.dia.libres === 0"
                            [ngClass]="claseDia(c)"
                            [attr.aria-label]="etiquetaDia(c)"
                            [attr.aria-pressed]="fecha() === c.fecha"
                            (click)="elegirDia(c.dia!)">
                      <span class="font-medium">{{ c.numero }}</span>
                      <span *ngIf="c.dia && c.dia.libres > 0" class="text-[10px] leading-none mt-0.5" [ngClass]="fecha() === c.fecha ? 'text-white/90' : 'text-primary'">{{ c.dia.libres }} libres</span>
                      <span *ngIf="c.dia && c.dia.libres === 0" class="text-[10px] leading-none mt-0.5">Lleno</span>
                    </button>
                  </ng-container>
                </div>
                <p class="mt-3 text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-accent/20 border border-accent"></span>Atiende y hay horarios</span>
                  <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200"></span>Lleno o no atiende</span>
                </p>
              </div>
            </ng-container>
          </section>

          <!-- Paso 4: hora -->
          <section class="card" *ngIf="diaElegido() as dia">
            <h2 class="font-semibold text-gray-800">Hora del {{ fechaLarga(dia.fecha) }}</h2>
            <p class="text-sm text-gray-500">Consultas de {{ disponibilidad()?.duracionMinutos }} minutos, de {{ dia.horaInicio }} a {{ dia.horaFin }}.</p>
            <div class="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Horarios">
              <button type="button" *ngFor="let s of dia.slots" role="radio" [attr.aria-checked]="slot() === s"
                      [disabled]="s.estado !== 'libre'"
                      class="text-sm px-2 py-2 rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      [ngClass]="slot() === s ? 'bg-primary text-white border-primary' : s.estado === 'libre' ? 'bg-white border-gray-300 hover:border-primary text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-300 line-through cursor-not-allowed'"
                      [title]="s.estado === 'ocupado' ? 'Ocupado' : s.estado === 'pasado' ? 'Ya paso' : 'Libre'"
                      (click)="slot.set(s)">
                {{ s.horaInicio }}
              </button>
            </div>
          </section>
        </div>

        <!-- Resumen y confirmacion -->
        <aside class="card lg:sticky lg:top-20">
          <h2 class="font-semibold text-gray-800">Resumen</h2>
          <dl class="mt-3 space-y-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-gray-500">Medico</dt><dd class="text-right text-gray-900">{{ medico() ? 'Dr(a). ' + medico()!.nombre + ' ' + medico()!.apellido : 'Sin elegir' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-gray-500">Dia</dt><dd class="text-right text-gray-900">{{ fecha() ? fechaLarga(fecha()!) : 'Sin elegir' }}</dd></div>
            <div class="flex justify-between gap-3"><dt class="text-gray-500">Hora</dt><dd class="text-right text-gray-900">{{ slot() ? slot()!.horaInicio + ' a ' + slot()!.horaFin : 'Sin elegir' }}</dd></div>
          </dl>

          <div *ngIf="cobro() as c" class="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">Consulta</span><span class="tabular-nums">Q{{ c.costo | number: '1.2-2' }}</span></div>
            <div *ngIf="c.descuento > 0" class="flex justify-between text-emerald-700">
              <span>Descuento {{ c.seguro }} ({{ c.porcentaje }}%)</span><span class="tabular-nums whitespace-nowrap">-Q{{ c.descuento | number: '1.2-2' }}</span>
            </div>
            <div class="flex justify-between font-semibold text-gray-900 text-base pt-1"><span>Total a pagar</span><span class="tabular-nums">Q{{ c.total | number: '1.2-2' }}</span></div>
            <p *ngIf="!c.seguro" class="text-xs text-gray-500 pt-1">Si tienes un seguro con convenio, registralo en recepcion para obtener descuento.</p>
          </div>

          <label class="label-field mt-4" for="motivo">Motivo de la consulta (opcional)</label>
          <textarea id="motivo" class="input-field" rows="3" [(ngModel)]="motivoConsulta" placeholder="Ej. dolor de garganta desde hace 3 dias"></textarea>

          <div *ngIf="error()" class="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error() }}</div>

          <button class="btn-primary w-full mt-4" [disabled]="!puedeConfirmar() || guardando()" (click)="confirmar()">
            {{ guardando() ? 'Agendando...' : 'Confirmar cita' }}
          </button>
        </aside>
      </div>
    </main>
  `,
})
export class AgendarCitaComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private avisos = inject(NotificacionService);

  especialidades = signal<Especialidad[]>([]);
  medicos = signal<Medico[]>([]);
  idEspecialidad = signal<number | null>(null);
  medico = signal<Medico | null>(null);
  disponibilidad = signal<Disponibilidad | null>(null);
  cargandoDisp = signal(false);
  mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fecha = signal<string | null>(null);
  slot = signal<SlotAgenda | null>(null);
  cobro = signal<Cobro | null>(null);
  guardando = signal(false);
  error = signal('');
  confirmada = signal<Cita | null>(null);
  motivoConsulta = '';

  especialidadesConMedicos = computed(() => {
    const ids = new Set(this.medicos().map((m) => m.idEspecialidad));
    return this.especialidades().filter((e) => ids.has(e.id));
  });

  medicosFiltrados = computed(() => {
    const id = this.idEspecialidad();
    return id === null ? this.medicos() : this.medicos().filter((m) => m.idEspecialidad === id);
  });

  porFecha = computed(() => new Map((this.disponibilidad()?.dias ?? []).map((d) => [d.fecha, d])));
  diaElegido = computed(() => (this.fecha() ? this.porFecha().get(this.fecha()!) ?? null : null));

  celdas = computed<Celda[]>(() => {
    const inicio = this.mes();
    const desfase = (inicio.getDay() + 6) % 7; // lunes primero
    const ultimo = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    const total = Math.ceil((desfase + ultimo) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const f = new Date(inicio.getFullYear(), inicio.getMonth(), i - desfase + 1);
      const k = clave(f);
      return { fecha: k, numero: f.getDate(), delMes: f.getMonth() === inicio.getMonth(), dia: this.porFecha().get(k) ?? null };
    });
  });

  tituloMes = computed(() => `${MESES[this.mes().getMonth()]} ${this.mes().getFullYear()}`);

  ngOnInit() {
    this.api.listarEspecialidades().subscribe((e) => this.especialidades.set(e));
    this.api.listarMedicos().subscribe((m) => {
      this.medicos.set(m);
      const param = Number(this.route.snapshot.queryParamMap.get('idMedico'));
      const pre = m.find((x) => x.id === param);
      if (pre) {
        this.idEspecialidad.set(pre.idEspecialidad);
        this.elegirMedico(pre);
      }
    });
  }

  elegirMedico(m: Medico) {
    if (this.medico()?.id === m.id) return;
    this.medico.set(m);
    this.fecha.set(null);
    this.slot.set(null);
    this.error.set('');
    this.cargarDisponibilidad(true);
    const idPaciente = this.auth.user()?.idPerfil;
    this.cobro.set(null);
    if (idPaciente) this.api.cotizarCita(m.id, idPaciente).subscribe((c) => this.cobro.set(c));
  }

  private cargarDisponibilidad(saltarAProxima: boolean) {
    const m = this.medico();
    if (!m) return;
    this.cargandoDisp.set(true);
    this.api.disponibilidadMedico(m.id, undefined, DIAS_RANGO).subscribe({
      next: (d) => {
        this.disponibilidad.set(d);
        this.cargandoDisp.set(false);
        if (saltarAProxima && d.proximaFechaDisponible) {
          const f = desdeClave(d.proximaFechaDisponible);
          this.mes.set(new Date(f.getFullYear(), f.getMonth(), 1));
        }
        // Si el dia elegido se lleno mientras tanto, se limpia la seleccion
        const elegido = this.fecha() ? d.dias.find((x) => x.fecha === this.fecha()) : null;
        if (this.fecha() && (!elegido || !elegido.libres)) {
          this.fecha.set(null);
          this.slot.set(null);
        } else if (elegido && this.slot()) {
          this.slot.set(elegido.slots.find((s) => s.horaInicio === this.slot()!.horaInicio && s.estado === 'libre') ?? null);
        }
      },
      error: () => this.cargandoDisp.set(false),
    });
  }

  elegirDia(d: DiaDisponible) {
    this.fecha.set(d.fecha);
    this.slot.set(null);
    this.error.set('');
  }

  moverMes(paso: number) {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + paso, 1));
  }

  puedeRetroceder() {
    const hoy = new Date();
    return this.mes() > new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  }

  puedeAvanzar() {
    const hasta = this.disponibilidad()?.hasta;
    if (!hasta) return false;
    const h = desdeClave(hasta);
    return this.mes() < new Date(h.getFullYear(), h.getMonth(), 1);
  }

  claseDia(c: Celda): string {
    if (this.fecha() === c.fecha) return 'bg-primary border-primary text-white';
    if (c.dia && c.dia.libres > 0) return 'bg-accent/10 border-accent/60 text-gray-900 hover:bg-accent/25';
    if (c.dia) return 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed';
    return 'border-transparent text-gray-300 cursor-not-allowed';
  }

  etiquetaDia(c: Celda): string {
    const base = this.fechaLarga(c.fecha);
    if (!c.dia) return `${base}: el medico no atiende`;
    return c.dia.libres ? `${base}: ${c.dia.libres} horarios libres` : `${base}: sin horarios libres`;
  }

  diasOrdenados(dias: string[]): string {
    const orden = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    return [...dias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b)).join(', ').toLowerCase();
  }

  fechaLarga(f: string): string {
    const d = desdeClave(f);
    return `${DIAS_LARGOS[d.getDay()].toLowerCase()} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
  }

  puedeConfirmar() {
    return !!(this.medico() && this.diaElegido() && this.slot());
  }

  confirmar() {
    const m = this.medico();
    const d = this.diaElegido();
    const s = this.slot();
    if (!m || !d || !s) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .agendarCita({
        idPaciente: this.auth.user()?.idPerfil,
        idMedico: m.id,
        idHorario: d.idHorario,
        fecha: d.fecha,
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
        motivoConsulta: this.motivoConsulta,
      })
      .subscribe({
        next: (cita) => {
          this.guardando.set(false);
          this.confirmada.set(cita);
          this.avisos.exito('Cita agendada');
          this.motivoConsulta = '';
          this.slot.set(null);
          this.cargarDisponibilidad(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(e?.error?.error ?? 'No se pudo agendar la cita');
          // Puede que alguien haya tomado el horario: se recarga la disponibilidad
          this.cargarDisponibilidad(false);
        },
      });
  }
}
