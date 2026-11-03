import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Emergencia, NivelTriage, Paciente } from '../../core/models/models';
import { ESTADOS_EMERGENCIA, NIVELES, colorNivel, etiquetaNivel, textoEspera } from '../../shared/triage';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]

// [Emergencias] Recepcion: registra al paciente que llega sin cita (existente o nuevo), le asigna un
// nivel de triage con sus signos vitales y ve la cola en tiempo real (se refresca cada 30 s).
@Component({
  selector: 'app-recepcionista-emergencias',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Emergencias</h1>
          <p class="text-gray-500">Se atiende por prioridad y luego por orden de llegada.</p>
        </div>
        <p class="text-sm text-gray-500" aria-live="polite">{{ enEspera() }} en espera, {{ enAtencion() }} en atencion</p>
      </div>

      <div class="grid gap-6 lg:grid-cols-[420px_1fr] items-start">
        <!-- ================= Registro ================= -->
        <form class="card space-y-5" (ngSubmit)="registrar()">
          <h2 class="font-semibold text-gray-800">Registrar llegada</h2>

          <fieldset>
            <legend class="label-field">Paciente</legend>
            <div class="inline-flex rounded-lg border p-0.5 text-sm" role="tablist">
              <button type="button" role="tab" class="px-3 py-1.5 rounded-md" [attr.aria-selected]="modo() === 'existente'"
                      [ngClass]="modo() === 'existente' ? 'bg-primary text-white' : 'text-gray-600'" (click)="modo.set('existente')">Ya registrado</button>
              <button type="button" role="tab" class="px-3 py-1.5 rounded-md" [attr.aria-selected]="modo() === 'nuevo'"
                      [ngClass]="modo() === 'nuevo' ? 'bg-primary text-white' : 'text-gray-600'" (click)="modo.set('nuevo')">Paciente nuevo</button>
            </div>

            <div *ngIf="modo() === 'existente'" class="mt-3">
              <input class="input-field" type="search" name="buscar" placeholder="Buscar por nombre o DPI" [ngModel]="buscar()" (ngModelChange)="buscar.set($event)" aria-label="Buscar paciente" />
              <div class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y" *ngIf="!pacienteSel()">
                <button type="button" *ngFor="let p of resultados()" class="w-full text-left px-3 py-2 hover:bg-primary/5 text-sm" (click)="pacienteSel.set(p)">
                  <span class="font-medium text-gray-800">{{ p.nombre }} {{ p.apellido }}</span>
                  <span class="block text-xs text-gray-500">{{ p.documentoIdentidad || 'Sin DPI' }}<ng-container *ngIf="p.alergias && p.alergias !== 'Ninguna'">. Alergias: {{ p.alergias }}</ng-container></span>
                </button>
                <p *ngIf="!resultados().length" class="px-3 py-3 text-sm text-gray-500">Sin resultados. Si no tiene cuenta, usa "Paciente nuevo".</p>
              </div>
              <div *ngIf="pacienteSel() as p" class="mt-2 flex items-start justify-between gap-3 rounded-lg bg-primary/5 border border-primary/30 px-3 py-2 text-sm">
                <div>
                  <p class="font-medium text-gray-900">{{ p.nombre }} {{ p.apellido }}</p>
                  <p class="text-xs text-gray-600">{{ p.documentoIdentidad || 'Sin DPI' }}<ng-container *ngIf="p.nombreSeguro">. Seguro: {{ p.nombreSeguro }}</ng-container></p>
                  <p *ngIf="p.alergias && p.alergias !== 'Ninguna'" class="text-xs text-red-700 font-medium">Alergias: {{ p.alergias }}</p>
                </div>
                <button type="button" class="text-primary hover:underline shrink-0" (click)="pacienteSel.set(null)">Cambiar</button>
              </div>
            </div>

            <div *ngIf="modo() === 'nuevo'" class="mt-3 grid grid-cols-2 gap-3">
              <div><label class="label-field" for="nNombre">Nombre</label><input id="nNombre" name="nNombre" class="input-field" [(ngModel)]="nuevo.nombre" /></div>
              <div><label class="label-field" for="nApellido">Apellido</label><input id="nApellido" name="nApellido" class="input-field" [(ngModel)]="nuevo.apellido" /></div>
              <div><label class="label-field" for="nDpi">DPI</label><input id="nDpi" name="nDpi" class="input-field" [(ngModel)]="nuevo.documentoIdentidad" inputmode="numeric" /></div>
              <div><label class="label-field" for="nTel">Telefono</label><input id="nTel" name="nTel" class="input-field" [(ngModel)]="nuevo.telefono" inputmode="tel" /></div>
              <div><label class="label-field" for="nNac">Fecha de nacimiento</label><input id="nNac" name="nNac" class="input-field" type="date" [(ngModel)]="nuevo.fechaNacimiento" /></div>
              <div><label class="label-field" for="nAle">Alergias</label><input id="nAle" name="nAle" class="input-field" [(ngModel)]="nuevo.alergias" placeholder="Ninguna" /></div>
              <p class="col-span-2 text-xs text-gray-500">Se crea su ficha de paciente; luego puede completar su correo en Pacientes.</p>
            </div>
          </fieldset>

          <fieldset>
            <legend class="label-field">Prioridad</legend>
            <div class="grid grid-cols-2 gap-2" role="radiogroup">
              <button type="button" *ngFor="let n of niveles" role="radio" [attr.aria-checked]="nivel() === n.nivel"
                      class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition"
                      [ngClass]="nivel() === n.nivel ? 'border-gray-800 ring-1 ring-gray-800 bg-gray-50' : 'border-gray-200 hover:border-gray-400'"
                      (click)="nivel.set(n.nivel)">
                <span class="w-2.5 h-8 rounded" [ngClass]="colorNivel(n.nivel)"></span>
                <span><span class="block font-medium text-gray-900">{{ n.etiqueta }}</span><span class="block text-xs text-gray-500">{{ n.tiempo }}</span></span>
              </button>
            </div>
          </fieldset>

          <div>
            <label class="label-field" for="motivo">Motivo</label>
            <textarea id="motivo" name="motivo" class="input-field" rows="2" [(ngModel)]="motivo" placeholder="Que le pasa y desde cuando"></textarea>
          </div>

          <fieldset>
            <legend class="label-field">Signos vitales (opcional)</legend>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-gray-600" for="pa">Presion (mmHg)</label><input id="pa" name="pa" class="input-field" [(ngModel)]="signos.presionArterial" placeholder="120/80" /></div>
              <div><label class="text-xs text-gray-600" for="fc">Pulso (lpm)</label><input id="fc" name="fc" class="input-field" type="number" [(ngModel)]="signos.frecuenciaCardiaca" /></div>
              <div><label class="text-xs text-gray-600" for="tmp">Temperatura (°C)</label><input id="tmp" name="tmp" class="input-field" type="number" step="0.1" [(ngModel)]="signos.temperatura" /></div>
              <div><label class="text-xs text-gray-600" for="sat">Saturacion (%)</label><input id="sat" name="sat" class="input-field" type="number" [(ngModel)]="signos.saturacion" /></div>
            </div>
          </fieldset>

          <div *ngIf="error()" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error() }}</div>
          <button type="submit" class="btn-primary w-full" [disabled]="!puedeRegistrar() || guardando()">{{ guardando() ? 'Registrando...' : 'Registrar en la cola' }}</button>
        </form>

        <!-- ================= Cola ================= -->
        <div class="space-y-6 min-w-0">
          <section class="card !p-0 overflow-hidden">
            <h2 class="px-5 py-3 border-b font-semibold text-gray-800">Cola de atencion</h2>
            <p *ngIf="!cola().length" class="px-5 py-8 text-center text-gray-500">No hay pacientes esperando.</p>
            <ol>
              <li *ngFor="let e of cola()" class="flex gap-4 px-5 py-4 border-b last:border-0">
                <span class="w-1.5 rounded-full shrink-0" [ngClass]="colorNivel(e.nivel)" aria-hidden="true"></span>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-gray-900">{{ e.nombrePaciente }}</p>
                    <span class="text-xs px-2 py-0.5 rounded border" [ngClass]="etiquetaNivel(e.nivel)">{{ e.nivelEtiqueta }}</span>
                    <span *ngIf="e.estado === 'EnAtencion'" class="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Con Dr(a). {{ e.nombreMedico }}</span>
                  </div>
                  <p class="text-sm text-gray-700 mt-0.5">{{ e.motivo }}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    <ng-container *ngIf="e.edad !== null">{{ e.edad }} anos. </ng-container>
                    <ng-container *ngIf="e.presionArterial">PA {{ e.presionArterial }}. </ng-container>
                    <ng-container *ngIf="e.frecuenciaCardiaca">Pulso {{ e.frecuenciaCardiaca }}. </ng-container>
                    <ng-container *ngIf="e.temperatura">Temp. {{ e.temperatura }} °C. </ng-container>
                    <ng-container *ngIf="e.saturacion">Sat. {{ e.saturacion }}%.</ng-container>
                  </p>
                  <p *ngIf="e.alergias && e.alergias !== 'Ninguna'" class="text-xs text-red-700 font-medium mt-0.5">Alergias: {{ e.alergias }}</p>
                </div>
                <div class="text-right shrink-0 flex flex-col items-end gap-2">
                  <p class="text-sm" [ngClass]="e.excedeEspera ? 'text-red-700 font-semibold' : 'text-gray-600'">
                    {{ e.estado === 'EnEspera' ? 'Espera ' + espera(e.minutosEspera) : 'Atendido a los ' + espera(e.minutosEspera) }}
                  </p>
                  <div class="flex items-center gap-2" *ngIf="e.estado === 'EnEspera'">
                    <select class="text-xs border border-gray-300 rounded-md px-1.5 py-1" [ngModel]="e.nivel" (ngModelChange)="cambiarNivel(e, $event)" aria-label="Cambiar prioridad">
                      <option *ngFor="let n of niveles" [value]="n.nivel">{{ n.etiqueta }}</option>
                    </select>
                    <button class="text-xs text-red-700 hover:underline" (click)="retirar(e)">Se retiro</button>
                  </div>
                </div>
              </li>
            </ol>
          </section>

          <section class="card overflow-x-auto">
            <h2 class="font-semibold text-gray-800 mb-3">Registradas hoy</h2>
            <div [appListaLarga]="hoy().length"> <!-- [ListasLargas] -->
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500 border-b">
                    <th class="py-2 pr-3">Llegada</th>
                    <th class="py-2 pr-3">Paciente</th>
                    <th class="py-2 pr-3">Prioridad</th>
                    <th class="py-2 pr-3">Estado</th>
                    <th class="py-2">Medico y diagnostico</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let e of hoy()" class="border-b last:border-0 align-top">
                    <td class="py-2 pr-3 whitespace-nowrap">{{ e.fechaLlegada | date: 'HH:mm' }}</td>
                    <td class="py-2 pr-3">{{ e.nombrePaciente }}</td>
                    <td class="py-2 pr-3"><span class="text-xs px-2 py-0.5 rounded border whitespace-nowrap" [ngClass]="etiquetaNivel(e.nivel)">{{ e.nivelEtiqueta }}</span></td>
                    <td class="py-2 pr-3 whitespace-nowrap">{{ estados[e.estado] }}</td>
                    <td class="py-2 text-gray-600">
                      <ng-container *ngIf="e.nombreMedico">Dr(a). {{ e.nombreMedico }}</ng-container>
                      <span *ngIf="e.diagnostico" class="block text-xs">{{ e.diagnostico }} ({{ e.destino }})</span>
                      <span *ngIf="e.estado === 'Retirada'" class="block text-xs">{{ e.observaciones }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p *ngIf="!hoy().length" class="text-sm text-gray-500 py-3">Aun no hay emergencias hoy.</p>
          </section>
        </div>
      </div>
    </main>
  `,
})
export class RecepcionistaEmergenciasComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private avisos = inject(NotificacionService);

  readonly niveles = NIVELES;
  readonly estados = ESTADOS_EMERGENCIA;
  colorNivel = colorNivel;
  etiquetaNivel = etiquetaNivel;
  espera = textoEspera;

  modo = signal<'existente' | 'nuevo'>('existente');
  pacientes = signal<Paciente[]>([]);
  buscar = signal('');
  pacienteSel = signal<Paciente | null>(null);
  nivel = signal<NivelTriage | null>(null);
  cola = signal<Emergencia[]>([]);
  hoy = signal<Emergencia[]>([]);
  guardando = signal(false);
  error = signal('');
  motivo = '';
  nuevo = { nombre: '', apellido: '', documentoIdentidad: '', telefono: '', fechaNacimiento: '', alergias: '' };
  signos: { presionArterial: string; frecuenciaCardiaca: number | null; temperatura: number | null; saturacion: number | null } = {
    presionArterial: '', frecuenciaCardiaca: null, temperatura: null, saturacion: null,
  };
  private timer: any;

  enEspera = computed(() => this.cola().filter((e) => e.estado === 'EnEspera').length);
  enAtencion = computed(() => this.cola().filter((e) => e.estado === 'EnAtencion').length);

  resultados = computed(() => {
    const q = this.buscar().trim().toLowerCase();
    const lista = this.pacientes();
    if (!q) return lista.slice(0, 8);
    return lista
      .filter((p) => `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) || (p.documentoIdentidad ?? '').includes(q))
      .slice(0, 8);
  });

  ngOnInit() {
    this.api.listarPacientes().subscribe((p) => this.pacientes.set(p));
    this.refrescar(false);
    this.timer = setInterval(() => this.refrescar(true), 30000);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  refrescar(silencioso: boolean) {
    this.api.colaEmergencias(silencioso).subscribe((c) => this.cola.set(c));
    if (!silencioso) this.api.historialEmergencias().subscribe((h) => this.hoy.set(h));
  }

  puedeRegistrar() {
    const paciente = this.modo() === 'existente' ? !!this.pacienteSel() : !!(this.nuevo.nombre.trim() && this.nuevo.apellido.trim());
    return paciente && !!this.nivel() && !!this.motivo.trim();
  }

  registrar() {
    if (!this.puedeRegistrar()) return;
    this.guardando.set(true);
    this.error.set('');
    const limpio = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    const datos: any = {
      nivel: this.nivel(),
      motivo: this.motivo,
      ...limpio(this.signos),
      ...(this.modo() === 'existente' ? { idPaciente: this.pacienteSel()!.id } : { pacienteNuevo: limpio(this.nuevo) }),
    };
    this.api.registrarEmergencia(datos).subscribe({
      next: (e) => {
        this.guardando.set(false);
        this.avisos.exito(`${e.nombrePaciente} quedo en la cola (${e.nivelEtiqueta})`);
        this.pacienteSel.set(null);
        this.nivel.set(null);
        this.motivo = '';
        this.buscar.set('');
        this.nuevo = { nombre: '', apellido: '', documentoIdentidad: '', telefono: '', fechaNacimiento: '', alergias: '' };
        this.signos = { presionArterial: '', frecuenciaCardiaca: null, temperatura: null, saturacion: null };
        if (this.modo() === 'nuevo') this.api.listarPacientes().subscribe((p) => this.pacientes.set(p));
        this.refrescar(false);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(e?.error?.error ?? 'No se pudo registrar la emergencia');
      },
    });
  }

  cambiarNivel(e: Emergencia, nivel: NivelTriage) {
    this.api.cambiarNivelEmergencia(e.id, nivel).subscribe(() => {
      this.avisos.exito('Prioridad actualizada');
      this.refrescar(false);
    });
  }

  retirar(e: Emergencia) {
    if (!confirm(`¿${e.nombrePaciente} se retiro sin ser atendido?`)) return;
    this.api.retirarEmergencia(e.id).subscribe(() => this.refrescar(false));
  }
}
