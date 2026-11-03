import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { HistorialMedico, Paciente } from '../../core/models/models';

@Component({
  selector: 'app-medico-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Historial clinico</h1>

      <div class="card mb-8">
        <h2 class="font-semibold text-gray-800 mb-4">Registrar nueva consulta</h2>

        <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {{ error }}
        </div>
        <div *ngIf="exito" class="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {{ exito }}
        </div>

        <div class="grid gap-4">
          <div>
            <label class="label-field">Paciente</label>
            <select class="input-field" [(ngModel)]="idPaciente">
              <option [ngValue]="null">Selecciona un paciente</option>
              <option *ngFor="let p of pacientes" [ngValue]="p.id">{{ p.nombre }} {{ p.apellido }}</option>
            </select>
          </div>
          <div>
            <label class="label-field">Diagnostico</label>
            <textarea class="input-field" rows="2" [(ngModel)]="diagnostico"></textarea>
          </div>
          <div>
            <label class="label-field">Tratamiento</label>
            <textarea class="input-field" rows="2" [(ngModel)]="tratamiento"></textarea>
          </div>
          <button class="btn-primary" [disabled]="!idPaciente || !diagnostico || cargando" (click)="registrar()">
            {{ cargando ? 'Guardando...' : 'Registrar' }}
          </button>
        </div>
      </div>

      <h2 class="font-semibold text-gray-800 mb-3">Historial reciente</h2>
      <div class="space-y-3">
        <div class="card" *ngFor="let h of historial">
          <p class="font-medium text-gray-800">{{ h.nombrePaciente }}</p>
          <p class="text-sm text-gray-600 mt-1">{{ h.diagnostico }}</p>
          <p class="text-sm text-gray-500" *ngIf="h.tratamiento">{{ h.tratamiento }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ h.fechaRegistro | date: 'medium' }}</p>
        </div>
      </div>
    </main>
  `,
})
export class MedicoHistorialComponent implements OnInit {
  pacientes: Paciente[] = [];
  historial: HistorialMedico[] = [];
  idPaciente: number | null = null;
  diagnostico = '';
  tratamiento = '';
  cargando = false;
  error = '';
  exito = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.api.listarPacientes().subscribe((p) => (this.pacientes = p));
    this.cargarHistorial();
  }

  cargarHistorial() {
    this.api.listarHistorial().subscribe((h) => (this.historial = h));
  }

  registrar() {
    this.error = '';
    this.exito = '';
    this.cargando = true;
    const idMedico = this.auth.user()?.idPerfil;
    this.api
      .crearHistorial({ idPaciente: this.idPaciente, idMedico, diagnostico: this.diagnostico, tratamiento: this.tratamiento })
      .subscribe({
        next: () => {
          this.exito = 'Registro guardado correctamente.';
          this.diagnostico = '';
          this.tratamiento = '';
          this.idPaciente = null;
          this.cargando = false;
          this.cargarHistorial();
        },
        error: (e) => {
          this.error = e?.error?.error ?? 'No se pudo registrar el historial';
          this.cargando = false;
        },
      });
  }
}
