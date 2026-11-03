import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Paciente, Seguro } from '../../core/models/models';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]
import { pedirMotivo } from '../../shared/eliminacion'; // [Eliminacion]

@Component({
  selector: 'app-recepcionista-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-5xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Pacientes</h1>

      <div class="card mb-6" *ngIf="editando as p">
        <h2 class="font-semibold text-gray-800 mb-4">Editar paciente: {{ p.nombre }} {{ p.apellido }}</h2>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="label-field">Telefono</label><input class="input-field" [(ngModel)]="form.telefono" /></div>
          <div><label class="label-field">Correo</label><input class="input-field" [(ngModel)]="form.correo" /></div>
          <div><label class="label-field">Documento de identidad</label><input class="input-field" [(ngModel)]="form.documentoIdentidad" /></div>
          <div><label class="label-field">Fecha de nacimiento</label><input class="input-field" type="date" [(ngModel)]="form.fechaNacimiento" /></div>
          <div><label class="label-field">Tipo de sangre</label><input class="input-field" [(ngModel)]="form.tipoSangre" /></div>
          <div><label class="label-field">Direccion</label><input class="input-field" [(ngModel)]="form.direccion" /></div>
          <div class="sm:col-span-2"><label class="label-field">Alergias</label><textarea class="input-field" rows="2" [(ngModel)]="form.alergias"></textarea></div>
          <div><label class="label-field">Contacto de emergencia</label><input class="input-field" [(ngModel)]="form.contactoEmergenciaNombre" /></div>
          <div><label class="label-field">Telefono de emergencia</label><input class="input-field" [(ngModel)]="form.contactoEmergenciaTelefono" /></div>
          <!-- [Seguros] Seguro con convenio y numero de poliza -->
          <div>
            <label class="label-field">Seguro medico</label>
            <select class="input-field" [(ngModel)]="form.idSeguro">
              <option [ngValue]="null">Sin seguro</option>
              <option *ngFor="let s of seguros" [ngValue]="s.id">{{ s.nombre }} ({{ s.descuentoConsulta }}% consultas, {{ s.descuentoMedicamentos }}% medicamentos)</option>
            </select>
          </div>
          <div>
            <label class="label-field">Numero de poliza</label>
            <input class="input-field" [(ngModel)]="form.numeroPoliza" [disabled]="!form.idSeguro" maxlength="50" />
          </div>
        </div>
        <div *ngIf="error" class="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>
        <div class="flex gap-3 mt-5">
          <button class="btn-primary" (click)="guardar()" [disabled]="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
          <button class="btn-secondary" (click)="editando = null">Cancelar</button>
        </div>
      </div>

      <div class="card overflow-x-auto" [appListaLarga]="pacientes.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Nombre</th>
              <th class="py-2 pr-4">Telefono</th>
              <th class="py-2 pr-4">Correo</th>
              <th class="py-2 pr-4">Documento</th>
              <th class="py-2 pr-4">Seguro</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0" *ngFor="let p of pacientes">
              <td class="py-2 pr-4 font-medium text-gray-800">{{ p.nombre }} {{ p.apellido }}</td>
              <td class="py-2 pr-4">{{ p.telefono || '-' }}</td>
              <td class="py-2 pr-4">{{ p.correo || '-' }}</td>
              <td class="py-2 pr-4">{{ p.documentoIdentidad || '-' }}</td>
              <td class="py-2 pr-4">
                <span *ngIf="p.nombreSeguro; else sinSeguro" [class.text-gray-400]="!p.seguroActivo">{{ p.nombreSeguro }}</span>
                <ng-template #sinSeguro><span class="text-gray-400">-</span></ng-template>
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                <button class="text-sm text-primary hover:underline mr-3" (click)="editar(p)">Editar</button>
                <button class="text-sm text-red-700 hover:underline" (click)="eliminar(p)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  `,
})
export class RecepcionistaPacientesComponent implements OnInit {
  pacientes: Paciente[] = [];
  seguros: Seguro[] = [];
  editando: Paciente | null = null;
  form: Partial<Paciente> = {};
  cargando = false;
  error = '';

  constructor(private api: ApiService, private avisos: NotificacionService) {}

  ngOnInit() {
    this.cargar();
    this.api.listarSeguros().subscribe((s) => (this.seguros = s));
  }

  cargar() {
    this.api.listarPacientes().subscribe((p) => (this.pacientes = p));
  }

  editar(p: Paciente) {
    this.editando = p;
    this.form = { ...p };
    this.error = '';
  }

  guardar() {
    if (!this.editando) return;
    this.cargando = true;
    const datos = { ...this.form, numeroPoliza: this.form.idSeguro ? this.form.numeroPoliza : undefined };
    this.api.actualizarPaciente(this.editando.id, datos).subscribe({
      next: () => {
        this.cargando = false;
        this.editando = null;
        this.avisos.exito('Paciente actualizado');
        this.cargar();
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.error ?? 'No se pudo guardar el paciente';
      },
    });
  }

  eliminar(p: Paciente) {
    // [Eliminacion] Va a la papelera; se puede restaurar
    const motivo = pedirMotivo(`Eliminar a ${p.nombre} ${p.apellido}?`);
    if (motivo === null) return;
    this.api.eliminarPaciente(p.id, motivo).subscribe({
      next: () => {
        this.avisos.exito(`${p.nombre} ${p.apellido} se movio a la papelera`);
        this.cargar();
      },
      error: (e) => this.avisos.error(e?.error?.error ?? 'No se pudo eliminar'),
    });
  }
}
