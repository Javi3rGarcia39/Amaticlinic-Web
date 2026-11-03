import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ElementoPapelera, RegistroEliminacion, SolicitudEliminacion, TipoElemento } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive';

type Pestana = 'papelera' | 'solicitudes' | 'bitacora';

const FILTROS: { valor: TipoElemento | 'todos' | 'catalogos'; texto: string }[] = [
  { valor: 'todos', texto: 'Todo' },
  { valor: 'cita', texto: 'Citas' },
  { valor: 'paciente', texto: 'Pacientes' },
  { valor: 'medico', texto: 'Medicos' },
  { valor: 'horario', texto: 'Horarios' },
  { valor: 'historial', texto: 'Historial' },
  { valor: 'usuario', texto: 'Usuarios' },
  { valor: 'catalogos', texto: 'Catalogos' },
];

interface Dialogo {
  modo: 'definitivo' | 'aprobar' | 'rechazar';
  elemento?: ElementoPapelera;
  solicitud?: SolicitudEliminacion;
}

// [Eliminacion] Papelera de recepcion: lo que se elimina en el sistema no se borra de la base, queda aqui.
//  - Restaurar: vuelve a las pantallas.
//  - Eliminar definitivamente: solo si alguien lo solicita (se registra quien). Un paciente con historial,
//    recetas o citas no se borra: se eliminan sus datos personales y se conservan sus registros clinicos.
//  - Solicitudes: pedidos de los pacientes para borrar sus datos (aprobar anonimiza; rechazar pide el motivo).
//  - Bitacora: quien hizo cada accion, cuando y por que.
@Component({
  selector: 'app-recepcionista-papelera',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Papelera</h1>
      <p class="text-gray-500 mb-6 max-w-3xl">
        Lo que se elimina en el sistema no se borra de la base de datos: queda aqui. Puedes restaurarlo o,
        solo si alguien lo solicita, borrarlo definitivamente.
      </p>

      <div class="inline-flex flex-wrap rounded-lg border bg-white p-0.5 text-sm mb-6" role="tablist">
        <button role="tab" class="px-4 py-2 rounded-md" [attr.aria-selected]="pestana() === 'papelera'"
                [ngClass]="pestana() === 'papelera' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('papelera')">
          Elementos eliminados <span class="tabular-nums">({{ elementos().length }})</span>
        </button>
        <button role="tab" class="px-4 py-2 rounded-md inline-flex items-center gap-2" [attr.aria-selected]="pestana() === 'solicitudes'"
                [ngClass]="pestana() === 'solicitudes' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('solicitudes')">
          Solicitudes de pacientes
          <span *ngIf="pendientes()" class="min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-semibold inline-flex items-center justify-center tabular-nums">{{ pendientes() }}</span>
        </button>
        <button role="tab" class="px-4 py-2 rounded-md" [attr.aria-selected]="pestana() === 'bitacora'"
                [ngClass]="pestana() === 'bitacora' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('bitacora')">Bitacora</button>
      </div>

      <!-- ===================== Elementos eliminados ===================== -->
      <section *ngIf="pestana() === 'papelera'">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button *ngFor="let f of filtros" type="button" class="px-3 py-1.5 rounded-full border text-sm"
                  [ngClass]="filtro() === f.valor ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'"
                  (click)="filtro.set(f.valor)">
            {{ f.texto }} <span class="tabular-nums opacity-75">{{ cuenta(f.valor) }}</span>
          </button>
          <input class="input-field !w-64 ml-auto" type="search" placeholder="Buscar" [ngModel]="buscar()" (ngModelChange)="buscar.set($event)" aria-label="Buscar en la papelera" />
        </div>

        <div class="card overflow-x-auto" [appListaLarga]="visibles().length">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Tipo</th>
                <th class="py-2 pr-4">Elemento</th>
                <th class="py-2 pr-4">Eliminado</th>
                <th class="py-2 pr-4">Motivo</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of visibles()" class="border-b last:border-0 align-top">
                <td class="py-3 pr-4"><span class="badge bg-gray-100 text-gray-700">{{ e.etiqueta }}</span></td>
                <td class="py-3 pr-4 min-w-0">
                  <p class="font-medium text-gray-900">{{ e.titulo }}</p>
                  <p class="text-xs text-gray-500">{{ e.detalle }}</p>
                </td>
                <td class="py-3 pr-4 whitespace-nowrap">
                  <p class="text-gray-800">{{ e.eliminadoEn | date: 'dd/MM/yyyy HH:mm' }}</p>
                  <p class="text-xs text-gray-500">{{ e.eliminadoPor }}</p>
                </td>
                <td class="py-3 pr-4 text-gray-700 max-w-xs">{{ e.motivo || '-' }}</td>
                <td class="py-3 text-right whitespace-nowrap">
                  <button class="btn-secondary !px-3 !py-1.5 text-sm mr-2" (click)="restaurar(e)" [disabled]="ocupado()">Restaurar</button>
                  <button class="text-sm text-red-700 hover:underline" (click)="abrir({ modo: 'definitivo', elemento: e })">Eliminar definitivamente</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="!visibles().length" class="py-8 text-center text-gray-500">{{ elementos().length ? 'Nada coincide con el filtro.' : 'La papelera esta vacia.' }}</p>
        </div>
      </section>

      <!-- ===================== Solicitudes ===================== -->
      <section *ngIf="pestana() === 'solicitudes'">
        <p class="text-sm text-gray-600 mb-4 max-w-3xl">
          Al aprobar se borran los datos personales del paciente (nombre, documento, telefono, correo y direccion),
          se cancelan sus citas futuras y su cuenta se cierra. Su historial, recetas y citas pasadas se conservan sin su nombre.
        </p>
        <div class="card overflow-x-auto" [appListaLarga]="solicitudes().length">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Fecha</th>
                <th class="py-2 pr-4">Paciente</th>
                <th class="py-2 pr-4">Motivo</th>
                <th class="py-2 pr-4">Estado</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of solicitudes()" class="border-b last:border-0 align-top">
                <td class="py-3 pr-4 whitespace-nowrap">{{ s.fechaSolicitud | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="py-3 pr-4">
                  <p class="font-medium text-gray-900">{{ s.paciente }}</p>
                  <p class="text-xs text-gray-500">{{ s.correo || 'Paciente #' + s.idPaciente }}</p>
                </td>
                <td class="py-3 pr-4 text-gray-700 max-w-sm">{{ s.motivo }}</td>
                <td class="py-3 pr-4">
                  <span class="badge" [ngClass]="claseEstado(s.estado)">{{ s.estado }}</span>
                  <p *ngIf="s.estado !== 'Pendiente'" class="text-xs text-gray-500 mt-1">
                    {{ s.fechaResolucion | date: 'dd/MM/yyyy' }}, {{ s.resueltoPor }}<ng-container *ngIf="s.observacion">: {{ s.observacion }}</ng-container>
                  </p>
                </td>
                <td class="py-3 text-right whitespace-nowrap">
                  <ng-container *ngIf="s.estado === 'Pendiente'">
                    <button class="btn-primary !px-3 !py-1.5 text-sm mr-2" (click)="abrir({ modo: 'aprobar', solicitud: s })">Aprobar</button>
                    <button class="text-sm text-red-700 hover:underline" (click)="abrir({ modo: 'rechazar', solicitud: s })">Rechazar</button>
                  </ng-container>
                </td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="!solicitudes().length" class="py-8 text-center text-gray-500">No hay solicitudes de pacientes.</p>
        </div>
      </section>

      <!-- ===================== Bitacora ===================== -->
      <section *ngIf="pestana() === 'bitacora'">
        <div class="card overflow-x-auto" [appListaLarga]="bitacora().length">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Fecha</th>
                <th class="py-2 pr-4">Accion</th>
                <th class="py-2 pr-4">Registro</th>
                <th class="py-2 pr-4">Usuario</th>
                <th class="py-2 pr-4">Solicitado por</th>
                <th class="py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of bitacora()" class="border-b last:border-0 align-top">
                <td class="py-2.5 pr-4 whitespace-nowrap">{{ b.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td class="py-2.5 pr-4 whitespace-nowrap"><span class="badge" [ngClass]="claseAccion(b.accion)">{{ b.accion }}</span></td>
                <td class="py-2.5 pr-4 text-gray-800">{{ b.descripcion }}</td>
                <td class="py-2.5 pr-4 text-gray-600">{{ b.usuario }}</td>
                <td class="py-2.5 pr-4 text-gray-600">{{ b.solicitadoPor || '-' }}</td>
                <td class="py-2.5 text-gray-600 max-w-xs">{{ b.motivo || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="!bitacora().length" class="py-8 text-center text-gray-500">Aun no hay movimientos.</p>
        </div>
      </section>
    </main>

    <!-- ===================== Dialogo ===================== -->
    <div *ngIf="dialogo() as d" class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4" (click)="cerrar()">
      <div class="card w-full max-w-lg !p-6" role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo" (click)="$event.stopPropagation()">
        <ng-container *ngIf="d.modo === 'definitivo' && d.elemento as e">
          <h2 id="titulo-dialogo" class="text-lg font-semibold text-gray-900">Eliminar definitivamente</h2>
          <p class="mt-1 text-sm text-gray-700"><strong>{{ e.etiqueta }}:</strong> {{ e.titulo }}</p>
          <p class="mt-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Se borra de la base de datos y no se puede deshacer. Hazlo solo si alguien lo solicito.
          </p>
          <p *ngIf="e.tipo === 'paciente'" class="mt-2 text-sm text-gray-600">
            Si el paciente tiene historial, recetas o citas, esos registros clinicos se conservan: solo se borran sus datos personales.
          </p>
        </ng-container>
        <ng-container *ngIf="d.modo === 'aprobar' && d.solicitud as s">
          <h2 id="titulo-dialogo" class="text-lg font-semibold text-gray-900">Aprobar la solicitud de {{ s.paciente }}</h2>
          <p class="mt-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Se borraran sus datos personales, se cancelaran sus citas futuras y su cuenta se cerrara. No se puede deshacer.
          </p>
        </ng-container>
        <ng-container *ngIf="d.modo === 'rechazar' && d.solicitud as s">
          <h2 id="titulo-dialogo" class="text-lg font-semibold text-gray-900">Rechazar la solicitud de {{ s.paciente }}</h2>
          <p class="mt-1 text-sm text-gray-600">El paciente vera el motivo en "Mis datos".</p>
        </ng-container>

        <form class="mt-4 space-y-3" (ngSubmit)="confirmar(d)">
          <div *ngIf="d.modo === 'definitivo'">
            <label class="label-field" for="solicitado">¿Quien lo solicito?</label>
            <input id="solicitado" name="solicitado" class="input-field" [(ngModel)]="solicitadoPor" required placeholder="Ej. El paciente, por escrito en ventanilla" />
          </div>
          <div>
            <label class="label-field" for="nota">{{ d.modo === 'definitivo' ? 'Motivo (opcional)' : d.modo === 'rechazar' ? 'Motivo del rechazo' : 'Observacion (opcional)' }}</label>
            <textarea id="nota" name="nota" class="input-field" rows="2" [(ngModel)]="nota"></textarea>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
                    [ngClass]="d.modo === 'rechazar' ? 'bg-primary hover:bg-primary-dark' : 'bg-red-600 hover:bg-red-700'"
                    [disabled]="ocupado() || (d.modo === 'definitivo' && !solicitadoPor.trim()) || (d.modo === 'rechazar' && !nota.trim())">
              {{ ocupado() ? 'Procesando...' : d.modo === 'definitivo' ? 'Eliminar definitivamente' : d.modo === 'aprobar' ? 'Aprobar y borrar datos' : 'Rechazar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RecepcionistaPapeleraComponent implements OnInit {
  private api = inject(ApiService);
  private avisos = inject(NotificacionService);

  filtros = FILTROS;
  pestana = signal<Pestana>('papelera');
  elementos = signal<ElementoPapelera[]>([]);
  solicitudes = signal<SolicitudEliminacion[]>([]);
  bitacora = signal<RegistroEliminacion[]>([]);
  filtro = signal<TipoElemento | 'todos' | 'catalogos'>('todos');
  buscar = signal('');
  dialogo = signal<Dialogo | null>(null);
  ocupado = signal(false);
  solicitadoPor = '';
  nota = '';

  pendientes = computed(() => this.solicitudes().filter((s) => s.estado === 'Pendiente').length);

  visibles = computed(() => {
    const q = this.buscar().trim().toLowerCase();
    return this.elementos().filter((e) => this.coincideTipo(e, this.filtro()) && (!q || `${e.titulo} ${e.detalle} ${e.motivo ?? ''}`.toLowerCase().includes(q)));
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.papelera().subscribe((e) => this.elementos.set(e));
    this.api.solicitudesEliminacion().subscribe((s) => this.solicitudes.set(s));
    this.api.bitacoraEliminacion().subscribe((b) => this.bitacora.set(b));
  }

  private coincideTipo(e: ElementoPapelera, f: TipoElemento | 'todos' | 'catalogos') {
    return f === 'todos' || (f === 'catalogos' ? e.tipo === 'especialidad' || e.tipo === 'seguro' : e.tipo === f);
  }

  cuenta(f: TipoElemento | 'todos' | 'catalogos') {
    return this.elementos().filter((e) => this.coincideTipo(e, f)).length;
  }

  restaurar(e: ElementoPapelera) {
    this.ocupado.set(true);
    this.api.restaurarElemento(e.tipo, e.id).subscribe({
      next: (r) => {
        this.ocupado.set(false);
        const extra = r.horariosRestaurados ? ` con ${r.horariosRestaurados} horario(s)` : '';
        this.avisos.exito(`Se restauro ${e.titulo}${extra}`);
        this.cargar();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisos.error(err?.error?.error ?? 'No se pudo restaurar');
      },
    });
  }

  abrir(d: Dialogo) {
    this.solicitadoPor = '';
    this.nota = '';
    this.dialogo.set(d);
  }

  cerrar() {
    if (!this.ocupado()) this.dialogo.set(null);
  }

  confirmar(d: Dialogo) {
    this.ocupado.set(true);
    const fin = (mensaje: string) => {
      this.ocupado.set(false);
      this.dialogo.set(null);
      this.avisos.exito(mensaje);
      this.cargar();
    };
    const fallo = (err: any) => {
      this.ocupado.set(false);
      this.avisos.error(err?.error?.error ?? 'No se pudo completar la accion');
    };
    if (d.modo === 'definitivo' && d.elemento) {
      const e = d.elemento;
      this.api.eliminarDefinitivo(e.tipo, e.id, this.solicitadoPor.trim(), this.nota.trim()).subscribe({
        next: (r) => fin(r.resultado === 'anonimizado'
          ? 'El paciente tenia registros clinicos: se borraron sus datos personales y se conservaron sus registros'
          : `Se elimino definitivamente: ${e.titulo}`),
        error: fallo,
      });
    } else if (d.modo === 'aprobar' && d.solicitud) {
      this.api.aprobarSolicitud(d.solicitud.id, this.nota.trim()).subscribe({ next: () => fin('Solicitud aprobada: datos del paciente eliminados'), error: fallo });
    } else if (d.modo === 'rechazar' && d.solicitud) {
      this.api.rechazarSolicitud(d.solicitud.id, this.nota.trim()).subscribe({ next: () => fin('Solicitud rechazada'), error: fallo });
    }
  }

  claseEstado(estado: string) {
    return { Pendiente: 'bg-amber-100 text-amber-800', Aprobada: 'bg-emerald-50 text-emerald-800', Rechazada: 'bg-gray-100 text-gray-700' }[estado] ?? 'bg-gray-100 text-gray-700';
  }

  claseAccion(accion: string) {
    if (accion === 'Restaurado') return 'bg-emerald-50 text-emerald-800';
    if (accion === 'Eliminado definitivamente' || accion === 'Anonimizado') return 'bg-red-50 text-red-800';
    return 'bg-gray-100 text-gray-700';
  }
}
