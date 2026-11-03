import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { DiaSemana, Horario, Medico } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]
import { pedirMotivo } from '../../shared/eliminacion'; // [Eliminacion]
import { NotificacionService } from '../../core/services/notificacion.service';

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

@Component({
  selector: 'app-recepcionista-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-5xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Horarios</h1>
        <button class="btn-primary" (click)="abrirFormularioNuevo()">+ Nuevo horario</button>
      </div>

      <div class="card mb-6" *ngIf="mostrarFormulario">
        <h2 class="font-semibold text-gray-800 mb-4">{{ form.id ? 'Editar' : 'Nuevo' }} horario</h2>
        <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label-field">Medico</label>
            <!-- [Horarios] Al editar no se cambia de medico (se edita el dia y las horas) -->
            <select class="input-field" [(ngModel)]="form.idMedico" (ngModelChange)="alCambiarMedico()" [disabled]="!!form.id">
              <option [ngValue]="null">Selecciona un medico</option>
              <option *ngFor="let m of medicos" [ngValue]="m.id">Dr(a). {{ m.nombre }} {{ m.apellido }}</option>
            </select>
          </div>
          <div>
            <label class="label-field">Dia de la semana</label>
            <!-- [Horarios] Solo los dias que el medico aun no tiene asignados -->
            <select class="input-field" [(ngModel)]="form.diaSemana" [disabled]="!form.idMedico || !diasDisponibles().length">
              <option [ngValue]="null">{{ !form.idMedico ? 'Primero elige el medico' : diasDisponibles().length ? 'Selecciona un dia' : 'Sin dias libres' }}</option>
              <option *ngFor="let d of diasDisponibles()" [ngValue]="d">{{ d }}</option>
            </select>
            <p *ngIf="form.idMedico && diasOcupados().length" class="mt-1 text-xs text-gray-500">
              {{ diasDisponibles().length ? 'Ya atiende: ' + diasOcupados().join(', ') + '.' : 'Este medico ya tiene horario los 7 dias. Edita uno de sus horarios.' }}
            </p>
          </div>
          <div><label class="label-field">Hora inicio</label><input class="input-field" type="time" [(ngModel)]="form.horaInicio" /></div>
          <div><label class="label-field">Hora fin</label><input class="input-field" type="time" [(ngModel)]="form.horaFin" /></div>
        </div>
        <div class="flex gap-3 mt-5">
          <button class="btn-primary" (click)="guardar()" [disabled]="cargando">{{ cargando ? 'Guardando...' : 'Guardar' }}</button>
          <button class="btn-secondary" (click)="mostrarFormulario = false">Cancelar</button>
        </div>
      </div>

      <div class="card overflow-x-auto" [appListaLarga]="horarios.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Medico</th>
              <th class="py-2 pr-4">Dia</th>
              <th class="py-2 pr-4">Horario</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0" *ngFor="let h of horarios">
              <td class="py-2 pr-4 font-medium text-gray-800">{{ h.nombreMedico }}</td>
              <td class="py-2 pr-4">{{ h.diaSemana }}</td>
              <td class="py-2 pr-4">{{ h.horaInicio }} - {{ h.horaFin }}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <button class="text-sm text-primary hover:underline mr-3" (click)="editar(h)">Editar</button>
                <button class="text-sm text-red-700 hover:underline" (click)="eliminar(h)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  `,
})
export class RecepcionistaHorariosComponent implements OnInit {
  horarios: Horario[] = [];
  medicos: Medico[] = [];
  dias = DIAS;
  mostrarFormulario = false;
  form: { id?: number; idMedico: number | null; diaSemana: DiaSemana | null; horaInicio: string; horaFin: string } = {
    idMedico: null, diaSemana: null, horaInicio: '', horaFin: '',
  };
  cargando = false;
  error = '';

  constructor(private api: ApiService, private avisos: NotificacionService) {}

  ngOnInit() {
    this.cargar();
    this.api.listarMedicos().subscribe((m) => (this.medicos = m));
  }

  cargar() {
    this.api.listarHorarios().subscribe((h) => (this.horarios = h));
  }

  // [Horarios] Dias que el medico elegido ya tiene (sin contar el horario que se esta editando)
  diasOcupados(): DiaSemana[] {
    if (!this.form.idMedico) return [];
    const ocupados = this.horarios
      .filter((h) => h.idMedico === this.form.idMedico && h.id !== this.form.id)
      .map((h) => h.diaSemana);
    return DIAS.filter((d) => ocupados.includes(d));
  }

  diasDisponibles(): DiaSemana[] {
    const ocupados = this.diasOcupados();
    return DIAS.filter((d) => !ocupados.includes(d));
  }

  alCambiarMedico() {
    if (this.form.diaSemana && !this.diasDisponibles().includes(this.form.diaSemana)) this.form.diaSemana = null;
  }

  abrirFormularioNuevo() {
    this.form = { idMedico: null, diaSemana: null, horaInicio: '', horaFin: '' };
    this.error = '';
    this.mostrarFormulario = true;
  }

  editar(h: Horario) {
    this.form = { id: h.id, idMedico: h.idMedico, diaSemana: h.diaSemana, horaInicio: h.horaInicio, horaFin: h.horaFin };
    this.error = '';
    this.mostrarFormulario = true;
  }

  guardar() {
    this.cargando = true;
    this.error = '';
    const payload = {
      idMedico: this.form.idMedico,
      diaSemana: this.form.diaSemana,
      horaInicio: this.form.horaInicio,
      horaFin: this.form.horaFin,
    };
    const obs = this.form.id ? this.api.actualizarHorario(this.form.id, payload) : this.api.crearHorario(payload);
    obs.subscribe({
      next: () => {
        this.cargando = false;
        this.mostrarFormulario = false;
        this.cargar();
      },
      error: (e) => {
        this.cargando = false;
        this.error = e?.error?.error ?? 'No se pudo guardar el horario';
      },
    });
  }

  eliminar(h: Horario) {
    // [Eliminacion] Va a la papelera; se puede restaurar
    const motivo = pedirMotivo(`Eliminar el horario del ${h.diaSemana} de ${h.nombreMedico}?`);
    if (motivo === null) return;
    this.api.eliminarHorario(h.id, motivo).subscribe({
      next: () => {
        this.avisos.exito('El horario se movio a la papelera');
        this.cargar();
      },
      error: (e) => this.avisos.error(e?.error?.error ?? 'No se pudo eliminar'),
    });
  }
}
