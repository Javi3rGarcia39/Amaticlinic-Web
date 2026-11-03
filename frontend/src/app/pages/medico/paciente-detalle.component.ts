import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { HistorialMedico, Paciente } from '../../core/models/models';

@Component({
  selector: 'app-paciente-detalle',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-3xl mx-auto px-4 py-8" *ngIf="paciente as p">
      <button (click)="volver()" class="text-sm text-primary mb-4 hover:underline">&larr; Volver a pacientes</button>

      <div class="card mb-6">
        <h1 class="text-xl font-bold text-gray-800">{{ p.nombre }} {{ p.apellido }}</h1>
        <div class="grid grid-cols-2 gap-3 mt-4 text-sm">
          <p><span class="text-gray-500">Telefono:</span> {{ p.telefono || '-' }}</p>
          <p><span class="text-gray-500">Correo:</span> {{ p.correo || '-' }}</p>
          <p><span class="text-gray-500">Fecha de nacimiento:</span> {{ p.fechaNacimiento || '-' }}</p>
          <p><span class="text-gray-500">Tipo de sangre:</span> {{ p.tipoSangre || '-' }}</p>
          <p class="col-span-2"><span class="text-gray-500">Alergias:</span> {{ p.alergias || 'Ninguna registrada' }}</p>
          <p class="col-span-2"><span class="text-gray-500">Contacto de emergencia:</span> {{ p.contactoEmergenciaNombre || '-' }} ({{ p.contactoEmergenciaTelefono || '-' }})</p>
        </div>
      </div>

      <h2 class="text-lg font-semibold text-gray-800 mb-3">Historial clinico</h2>
      <div class="space-y-3">
        <div class="card" *ngFor="let h of historial">
          <p class="font-medium text-gray-800">{{ h.diagnostico }}</p>
          <p class="text-sm text-gray-500 mt-1">{{ h.tratamiento || 'Sin tratamiento registrado' }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ h.fechaRegistro | date: 'medium' }} · Dr(a). {{ h.nombreMedico }}</p>
        </div>
        <p *ngIf="historial.length === 0" class="text-gray-500 text-sm">Este paciente aun no tiene historial clinico.</p>
      </div>
    </main>
  `,
})
export class PacienteDetalleComponent implements OnInit {
  paciente: Paciente | null = null;
  historial: HistorialMedico[] = [];

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.obtenerPaciente(id).subscribe((p) => (this.paciente = p));
    this.api.listarHistorialPorPaciente(id).subscribe((h) => (this.historial = h));
  }

  volver() {
    this.router.navigate(['/medico/pacientes']);
  }
}
