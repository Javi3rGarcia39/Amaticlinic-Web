import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Paciente } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]

@Component({
  selector: 'app-medico-pacientes',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-5xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Pacientes</h1>
      <div class="card overflow-x-auto" [appListaLarga]="pacientes.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Nombre</th>
              <th class="py-2 pr-4">Telefono</th>
              <th class="py-2 pr-4">Correo</th>
              <th class="py-2 pr-4">Tipo de sangre</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0" *ngFor="let p of pacientes">
              <td class="py-2 pr-4 font-medium text-gray-800">{{ p.nombre }} {{ p.apellido }}</td>
              <td class="py-2 pr-4">{{ p.telefono || '-' }}</td>
              <td class="py-2 pr-4">{{ p.correo || '-' }}</td>
              <td class="py-2 pr-4">{{ p.tipoSangre || '-' }}</td>
              <td class="py-2 text-right">
                <a [routerLink]="['/medico/pacientes', p.id]" class="text-primary text-sm hover:underline">Ver detalle</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  `,
})
export class MedicoPacientesComponent implements OnInit {
  pacientes: Paciente[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.listarPacientes().subscribe((p) => (this.pacientes = p));
  }
}
