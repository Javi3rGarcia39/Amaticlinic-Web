import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { NotificacionService } from '../../core/services/notificacion.service';
import { Especialidad, Seguro } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]
import { pedirMotivo } from '../../shared/eliminacion'; // [Eliminacion]

type Pestana = 'especialidades' | 'seguros' | 'emergencia';

// [Catalogo] [Seguros] Recepcion administra las especialidades (con su precio de consulta),
// los seguros con convenio y el precio de la atencion de emergencia.
@Component({
  selector: 'app-recepcionista-catalogos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-5xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800">Catalogos y precios</h1>
      <p class="text-gray-500 mb-6">Lo que cambies aqui se aplica a las citas nuevas; las citas ya agendadas conservan su precio.</p>

      <div class="inline-flex rounded-lg border bg-white p-0.5 text-sm mb-6" role="tablist">
        <button role="tab" class="px-4 py-2 rounded-md" [attr.aria-selected]="pestana() === 'especialidades'"
                [ngClass]="pestana() === 'especialidades' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('especialidades')">Especialidades</button>
        <button role="tab" class="px-4 py-2 rounded-md" [attr.aria-selected]="pestana() === 'seguros'"
                [ngClass]="pestana() === 'seguros' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('seguros')">Seguros</button>
        <button role="tab" class="px-4 py-2 rounded-md" [attr.aria-selected]="pestana() === 'emergencia'"
                [ngClass]="pestana() === 'emergencia' ? 'bg-primary text-white' : 'text-gray-600'" (click)="pestana.set('emergencia')">Emergencias</button>
      </div>

      <!-- ===================== Especialidades ===================== -->
      <section *ngIf="pestana() === 'especialidades'">
        <form class="card mb-6 grid gap-4 sm:grid-cols-[1fr_10rem] items-end" (ngSubmit)="guardarEspecialidad()">
          <h2 class="sm:col-span-2 font-semibold text-gray-800">{{ esp.id ? 'Editar especialidad' : 'Nueva especialidad' }}</h2>
          <div>
            <label class="label-field" for="espNombre">Nombre</label>
            <input id="espNombre" name="espNombre" class="input-field" [(ngModel)]="esp.nombre" required maxlength="60" />
          </div>
          <div>
            <label class="label-field" for="espPrecio">Precio de consulta (Q)</label>
            <input id="espPrecio" name="espPrecio" class="input-field" type="number" min="0" step="0.01" [(ngModel)]="esp.precioConsulta" required />
          </div>
          <div class="sm:col-span-2">
            <label class="label-field" for="espDesc">Descripcion (se muestra en la pagina de inicio)</label>
            <input id="espDesc" name="espDesc" class="input-field" [(ngModel)]="esp.descripcion" maxlength="200" />
          </div>
          <label *ngIf="esp.id" class="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="espActivo" [(ngModel)]="esp.activo" /> Activa (si la desactivas no se pueden asignar medicos nuevos)
          </label>
          <div *ngIf="errorEsp()" class="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ errorEsp() }}</div>
          <div class="sm:col-span-2 flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="!esp.nombre.trim() || esp.precioConsulta === null">{{ esp.id ? 'Guardar cambios' : 'Agregar especialidad' }}</button>
            <button type="button" *ngIf="esp.id" class="btn-secondary" (click)="nuevaEspecialidad()">Cancelar</button>
          </div>
        </form>

        <div class="card overflow-x-auto" [appListaLarga]="especialidades().length"> <!-- [ListasLargas] -->
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Especialidad</th>
                <th class="py-2 pr-4 text-right">Consulta</th>
                <th class="py-2 pr-4 text-right">Medicos</th>
                <th class="py-2 pr-4">Estado</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let e of especialidades()" class="border-b last:border-0" [class.text-gray-400]="!e.activo">
                <td class="py-2.5 pr-4">
                  <p class="font-medium" [class.text-gray-800]="e.activo">{{ e.nombre }}</p>
                  <p class="text-xs text-gray-500">{{ e.descripcion }}</p>
                </td>
                <td class="py-2.5 pr-4 text-right tabular-nums">Q{{ e.precioConsulta | number: '1.2-2' }}</td>
                <td class="py-2.5 pr-4 text-right tabular-nums">{{ e.medicos }}</td>
                <td class="py-2.5 pr-4"><span class="badge" [ngClass]="e.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">{{ e.activo ? 'Activa' : 'Inactiva' }}</span></td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  <button class="text-sm text-primary hover:underline mr-3" (click)="editarEspecialidad(e)">Editar</button>
                  <button *ngIf="e.activo" class="text-sm text-red-700 hover:underline" (click)="eliminarEspecialidad(e)">{{ e.medicos ? 'Desactivar' : 'Eliminar' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================== Seguros ===================== -->
      <section *ngIf="pestana() === 'seguros'">
        <form class="card mb-6 grid gap-4 sm:grid-cols-2" (ngSubmit)="guardarSeguro()">
          <h2 class="sm:col-span-2 font-semibold text-gray-800">{{ seg.id ? 'Editar seguro' : 'Nuevo seguro con convenio' }}</h2>
          <div>
            <label class="label-field" for="segNombre">Nombre de la aseguradora</label>
            <input id="segNombre" name="segNombre" class="input-field" [(ngModel)]="seg.nombre" required maxlength="100" />
          </div>
          <div>
            <label class="label-field" for="segTel">Telefono</label>
            <input id="segTel" name="segTel" class="input-field" [(ngModel)]="seg.telefono" maxlength="20" />
          </div>
          <div>
            <label class="label-field" for="segCons">Descuento en consultas (%)</label>
            <input id="segCons" name="segCons" class="input-field" type="number" min="0" max="100" step="0.5" [(ngModel)]="seg.descuentoConsulta" required />
          </div>
          <div>
            <label class="label-field" for="segMed">Descuento en medicamentos (%)</label>
            <input id="segMed" name="segMed" class="input-field" type="number" min="0" max="100" step="0.5" [(ngModel)]="seg.descuentoMedicamentos" required />
          </div>
          <label *ngIf="seg.id" class="sm:col-span-2 inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="segActivo" [(ngModel)]="seg.activo" /> Convenio activo (si lo desactivas, sus pacientes dejan de recibir descuento)
          </label>
          <div *ngIf="errorSeg()" class="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ errorSeg() }}</div>
          <div class="sm:col-span-2 flex gap-3">
            <button type="submit" class="btn-primary" [disabled]="!seg.nombre.trim()">{{ seg.id ? 'Guardar cambios' : 'Agregar seguro' }}</button>
            <button type="button" *ngIf="seg.id" class="btn-secondary" (click)="nuevoSeguro()">Cancelar</button>
          </div>
        </form>

        <div class="card overflow-x-auto" [appListaLarga]="seguros().length"> <!-- [ListasLargas] -->
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Seguro</th>
                <th class="py-2 pr-4 text-right">Consultas</th>
                <th class="py-2 pr-4 text-right">Medicamentos</th>
                <th class="py-2 pr-4 text-right">Pacientes</th>
                <th class="py-2 pr-4">Estado</th>
                <th class="py-2"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of seguros()" class="border-b last:border-0" [class.text-gray-400]="!s.activo">
                <td class="py-2.5 pr-4">
                  <p class="font-medium" [class.text-gray-800]="s.activo">{{ s.nombre }}</p>
                  <p *ngIf="s.telefono" class="text-xs text-gray-500">Tel. {{ s.telefono }}</p>
                </td>
                <td class="py-2.5 pr-4 text-right tabular-nums">{{ s.descuentoConsulta }}%</td>
                <td class="py-2.5 pr-4 text-right tabular-nums">{{ s.descuentoMedicamentos }}%</td>
                <td class="py-2.5 pr-4 text-right tabular-nums">{{ s.pacientes }}</td>
                <td class="py-2.5 pr-4"><span class="badge" [ngClass]="s.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'">{{ s.activo ? 'Activo' : 'Inactivo' }}</span></td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  <button class="text-sm text-primary hover:underline mr-3" (click)="editarSeguro(s)">Editar</button>
                  <button *ngIf="s.activo" class="text-sm text-red-700 hover:underline" (click)="eliminarSeguro(s)">{{ s.pacientes ? 'Desactivar' : 'Eliminar' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="!seguros().length" class="text-sm text-gray-500 py-4">Aun no hay seguros con convenio.</p>
        </div>
      </section>

      <!-- ===================== Emergencias ===================== -->
      <section *ngIf="pestana() === 'emergencia'" class="card max-w-md">
        <h2 class="font-semibold text-gray-800">Precio de la atencion de emergencia</h2>
        <p class="text-sm text-gray-500 mt-1">Se cobra al cerrar cada emergencia; el seguro del paciente aplica su descuento de consultas.</p>
        <label class="label-field mt-4" for="precioEm">Precio (Q)</label>
        <div class="flex gap-3">
          <input id="precioEm" class="input-field" type="number" min="0" step="0.01" [(ngModel)]="precioEmergencia" />
          <button class="btn-primary shrink-0" (click)="guardarPrecioEmergencia()">Guardar</button>
        </div>
      </section>
    </main>
  `,
})
export class RecepcionistaCatalogosComponent implements OnInit {
  private api = inject(ApiService);
  private avisos = inject(NotificacionService);

  pestana = signal<Pestana>('especialidades');
  especialidades = signal<Especialidad[]>([]);
  seguros = signal<Seguro[]>([]);
  errorEsp = signal('');
  errorSeg = signal('');
  esp: { id?: number; nombre: string; descripcion: string; precioConsulta: number | null; activo: boolean } = this.espVacia();
  seg: { id?: number; nombre: string; telefono: string; descuentoConsulta: number; descuentoMedicamentos: number; activo: boolean } = this.segVacio();
  precioEmergencia: number | null = null;

  ngOnInit() {
    this.cargar();
    this.api.configuracion().subscribe((c) => (this.precioEmergencia = c.precioEmergencia));
  }

  cargar() {
    this.api.listarEspecialidades(true).subscribe((e) => this.especialidades.set(e));
    this.api.listarSeguros(true).subscribe((s) => this.seguros.set(s));
  }

  // ---------- especialidades
  private espVacia() {
    return { nombre: '', descripcion: '', precioConsulta: null as number | null, activo: true };
  }
  nuevaEspecialidad() {
    this.esp = this.espVacia();
    this.errorEsp.set('');
  }
  editarEspecialidad(e: Especialidad) {
    this.esp = { id: e.id, nombre: e.nombre, descripcion: e.descripcion ?? '', precioConsulta: e.precioConsulta, activo: e.activo };
    this.errorEsp.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  guardarEspecialidad() {
    this.errorEsp.set('');
    const datos = { nombre: this.esp.nombre, descripcion: this.esp.descripcion, precioConsulta: Number(this.esp.precioConsulta), activo: this.esp.activo };
    const obs = this.esp.id ? this.api.actualizarEspecialidad(this.esp.id, datos) : this.api.crearEspecialidad(datos);
    obs.subscribe({
      next: () => {
        this.avisos.exito(this.esp.id ? 'Especialidad actualizada' : 'Especialidad agregada');
        this.nuevaEspecialidad();
        this.cargar();
      },
      error: (e) => this.errorEsp.set(e?.error?.error ?? 'No se pudo guardar la especialidad'),
    });
  }
  eliminarEspecialidad(e: Especialidad) {
    // [Eliminacion] Con medicos se desactiva; sin medicos va a la papelera
    if (e.medicos && !confirm(`${e.nombre} tiene medicos asignados: se desactivara (no se borra). ¿Continuar?`)) return;
    const motivo = e.medicos ? '' : pedirMotivo(`Eliminar la especialidad ${e.nombre}?`);
    if (motivo === null) return;
    this.api.eliminarEspecialidad(e.id, motivo).subscribe({
      next: (r) => {
        this.avisos.exito(r.desactivada ? `${e.nombre} se desactivo porque tiene medicos asignados` : `${e.nombre} se movio a la papelera`);
        this.cargar();
      },
      error: (err) => this.avisos.error(err?.error?.error ?? 'No se pudo eliminar'),
    });
  }

  // ---------- seguros
  private segVacio() {
    return { nombre: '', telefono: '', descuentoConsulta: 0, descuentoMedicamentos: 0, activo: true };
  }
  nuevoSeguro() {
    this.seg = this.segVacio();
    this.errorSeg.set('');
  }
  editarSeguro(s: Seguro) {
    this.seg = { id: s.id, nombre: s.nombre, telefono: s.telefono ?? '', descuentoConsulta: s.descuentoConsulta, descuentoMedicamentos: s.descuentoMedicamentos, activo: s.activo };
    this.errorSeg.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  guardarSeguro() {
    this.errorSeg.set('');
    const datos = {
      nombre: this.seg.nombre, telefono: this.seg.telefono, activo: this.seg.activo,
      descuentoConsulta: Number(this.seg.descuentoConsulta), descuentoMedicamentos: Number(this.seg.descuentoMedicamentos),
    };
    const obs = this.seg.id ? this.api.actualizarSeguro(this.seg.id, datos) : this.api.crearSeguro(datos);
    obs.subscribe({
      next: () => {
        this.avisos.exito(this.seg.id ? 'Seguro actualizado' : 'Seguro agregado');
        this.nuevoSeguro();
        this.cargar();
      },
      error: (e) => this.errorSeg.set(e?.error?.error ?? 'No se pudo guardar el seguro'),
    });
  }
  eliminarSeguro(s: Seguro) {
    // [Eliminacion] Con pacientes se desactiva; sin pacientes va a la papelera
    if (s.pacientes && !confirm(`${s.nombre} tiene pacientes asignados: se desactivara (no se borra). ¿Continuar?`)) return;
    const motivo = s.pacientes ? '' : pedirMotivo(`Eliminar el convenio con ${s.nombre}?`);
    if (motivo === null) return;
    this.api.eliminarSeguro(s.id, motivo).subscribe({
      next: (r) => {
        this.avisos.exito(r.desactivado ? `${s.nombre} se desactivo porque tiene pacientes asignados` : `${s.nombre} se movio a la papelera`);
        this.cargar();
      },
      error: (err) => this.avisos.error(err?.error?.error ?? 'No se pudo eliminar'),
    });
  }

  guardarPrecioEmergencia() {
    if (this.precioEmergencia === null || this.precioEmergencia < 0) return;
    this.api.cambiarPrecioEmergencia(Number(this.precioEmergencia)).subscribe((r) => {
      this.precioEmergencia = r.precioEmergencia;
      this.avisos.exito('Precio de emergencia guardado');
    });
  }
}
