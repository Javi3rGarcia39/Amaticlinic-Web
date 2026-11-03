import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Medico } from '../../core/models/models';

@Component({
  selector: 'app-paciente-medicos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-4">Medicos</h1>

      <div class="flex gap-3 mb-6">
        <input class="input-field max-w-xs" placeholder="Buscar por nombre o especialidad..."
               [(ngModel)]="query" (ngModelChange)="buscar()" />
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        <div class="card" *ngFor="let m of medicos">
          <p class="font-semibold text-gray-800">Dr(a). {{ m.nombre }} {{ m.apellido }}</p>
          <p class="text-sm text-primary font-medium">{{ m.especialidad }}</p>
          <p class="text-sm text-gray-500 mt-2">{{ m.descripcion || 'Sin descripcion' }}</p>
          <p class="text-xs text-gray-400 mt-2">{{ m.anosExperiencia }} anos de experiencia · Consultorio {{ m.consultorio }}</p>
          <button class="btn-primary w-full mt-4" (click)="agendarCon(m)">Agendar cita</button>
        </div>
      </div>

      <p *ngIf="medicos.length === 0" class="text-gray-500">No se encontraron medicos.</p>
    </main>
  `,
})
export class PacienteMedicosComponent implements OnInit {
  medicos: Medico[] = [];
  query = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.buscar();
  }

  buscar() {
    this.api.buscarMedicos(this.query).subscribe((m) => (this.medicos = m));
  }

  agendarCon(m: Medico) {
    this.router.navigate(['/paciente/agendar'], { queryParams: { idMedico: m.id } });
  }
}
