import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Especialidad, Medico } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]
import { pedirMotivo } from '../../shared/eliminacion'; // [Eliminacion]
import { NotificacionService } from '../../core/services/notificacion.service';

interface MedicoForm {
  id?: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  idEspecialidad: number | null; // [Catalogo]
  consultorio: string;
  anosExperiencia: number | null;
  descripcion: string;
  password: string;
}

function formVacio(): MedicoForm {
  return {
    nombre: '', apellido: '', correo: '', telefono: '', idEspecialidad: null,
    consultorio: '', anosExperiencia: null, descripcion: '', password: '',
  };
}

@Component({
  selector: 'app-recepcionista-medicos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Medicos</h1>
        <button class="btn-primary" (click)="abrirFormularioNuevo()">+ Nuevo medico</button>
      </div>

      <div class="card mb-6" *ngIf="mostrarFormulario">
        <h2 class="font-semibold text-gray-800 mb-4">{{ form.id ? 'Editar' : 'Nuevo' }} medico</h2>
        <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="label-field">Nombre</label><input class="input-field" [(ngModel)]="form.nombre" /></div>
          <div><label class="label-field">Apellido</label><input class="input-field" [(ngModel)]="form.apellido" /></div>
          <div><label class="label-field">Correo</label><input class="input-field" type="email" [(ngModel)]="form.correo" /></div>
          <div><label class="label-field">Telefono</label><input class="input-field" [(ngModel)]="form.telefono" /></div>
          <!-- [Catalogo] La especialidad se elige del catalogo (define el precio de la consulta) -->
          <div>
            <label class="label-field">Especialidad</label>
            <select class="input-field" [(ngModel)]="form.idEspecialidad">
              <option [ngValue]="null" disabled>Selecciona una especialidad</option>
              <option *ngFor="let e of especialidades" [ngValue]="e.id">{{ e.nombre }} (Q{{ e.precioConsulta | number: '1.2-2' }})</option>
            </select>
          </div>
          <div><label class="label-field">Consultorio</label><input class="input-field" [(ngModel)]="form.consultorio" /></div>
          <div><label class="label-field">Anos de experiencia</label><input class="input-field" type="number" [(ngModel)]="form.anosExperiencia" /></div>
          <div><label class="label-field">Contrasena {{ form.id ? '(dejar en blanco para no cambiar)' : '' }}</label><input class="input-field" type="password" [(ngModel)]="form.password" /></div>
          <div class="sm:col-span-2"><label class="label-field">Descripcion</label><textarea class="input-field" rows="2" [(ngModel)]="form.descripcion"></textarea></div>
        </div>
        <div class="flex gap-3 mt-5">
          <button class="btn-primary" (click)="guardar()" [disabled]="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
          <button class="btn-secondary" (click)="mostrarFormulario = false">Cancelar</button>
        </div>
      </div>

      <div class="card overflow-x-auto" [appListaLarga]="medicos.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Nombre</th>
              <th class="py-2 pr-4">Especialidad</th>
              <th class="py-2 pr-4 text-right">Consulta</th>
              <th class="py-2 pr-4">Correo</th>
              <th class="py-2 pr-4">Consultorio</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0" *ngFor="let m of medicos">
              <td class="py-2 pr-4 font-medium text-gray-800">Dr(a). {{ m.nombre }} {{ m.apellido }}</td>
              <td class="py-2 pr-4">{{ m.especialidad }}</td>
              <td class="py-2 pr-4 text-right tabular-nums">Q{{ m.precioConsulta | number: '1.2-2' }}</td>
              <td class="py-2 pr-4">{{ m.correo }}</td>
              <td class="py-2 pr-4">{{ m.consultorio }}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <button class="text-sm text-primary hover:underline mr-3" (click)="editar(m)">Editar</button>
                <button class="text-sm text-red-700 hover:underline" (click)="eliminar(m)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  `,
})
export class RecepcionistaMedicosComponent implements OnInit {
  medicos: Medico[] = [];
  especialidades: Especialidad[] = [];
  mostrarFormulario = false;
  form: MedicoForm = formVacio();
  cargando = false;
  error = '';

  constructor(private api: ApiService, private avisos: NotificacionService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarMedicos().subscribe((m) => (this.medicos = m));
    this.api.listarEspecialidades().subscribe((e) => (this.especialidades = e));
  }

  abrirFormularioNuevo() {
    this.form = formVacio();
    this.error = '';
    this.mostrarFormulario = true;
  }

  editar(m: Medico) {
    this.form = {
      id: m.id, nombre: m.nombre, apellido: m.apellido, correo: m.correo, telefono: m.telefono,
      idEspecialidad: m.idEspecialidad, consultorio: m.consultorio, anosExperiencia: m.anosExperiencia,
      descripcion: m.descripcion, password: '',
    };
    this.error = '';
    this.mostrarFormulario = true;
  }

  guardar() {
    if (!this.form.idEspecialidad) {
      this.error = 'Selecciona la especialidad del medico';
      return;
    }
    this.cargando = true;
    this.error = '';
    const payload = { ...this.form };
    const obs = this.form.id
      ? this.api.actualizarMedico(this.form.id, payload)
      : this.api.crearMedico(payload);

    obs.subscribe({
      next: () => {
        this.cargando = false;
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.error ?? 'No se pudo guardar el medico';
      },
    });
  }

  eliminar(m: Medico) {
    // [Eliminacion] Va a la papelera junto con sus horarios; se puede restaurar
    const motivo = pedirMotivo(`Eliminar al Dr(a). ${m.nombre} ${m.apellido}?`);
    if (motivo === null) return;
    this.api.eliminarMedico(m.id, motivo).subscribe({
      next: () => {
        this.avisos.exito(`Dr(a). ${m.nombre} ${m.apellido} se movio a la papelera`);
        this.cargar();
      },
      error: (e) => this.avisos.error(e?.error?.error ?? 'No se pudo eliminar'),
    });
  }
}
