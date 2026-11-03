import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Cita } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]
import { pedirMotivo } from '../../shared/eliminacion'; // [Eliminacion]
import { NotificacionService } from '../../core/services/notificacion.service';

@Component({
  selector: 'app-recepcionista-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Citas</h1>

      <div class="card overflow-x-auto" [appListaLarga]="citas.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Paciente</th>
              <th class="py-2 pr-4">Medico</th>
              <th class="py-2 pr-4">Fecha</th>
              <th class="py-2 pr-4">Horario</th>
              <th class="py-2 pr-4">Estado</th>
              <th class="py-2 pr-4 text-right">Total</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0" *ngFor="let c of citas">
              <td class="py-2 pr-4 font-medium text-gray-800">{{ c.nombrePaciente }}</td>
              <td class="py-2 pr-4">{{ c.nombreMedico }}</td>
              <td class="py-2 pr-4">{{ c.fecha }}</td>
              <td class="py-2 pr-4">{{ c.horaInicio }} - {{ c.horaFin }}</td>
              <td class="py-2 pr-4">
                <span class="badge bg-primary/10 text-primary">{{ c.estado }}</span>
                <span *ngIf="c.esEmergencia" class="badge bg-red-100 text-red-700 ml-1">Emergencia</span>
              </td>
              <!-- [Seguros] -->
              <td class="py-2 pr-4 text-right tabular-nums whitespace-nowrap">
                {{ c.totalPagar !== null ? 'Q' + (c.totalPagar | number: '1.2-2') : '-' }}
                <span *ngIf="c.montoDescuento > 0" class="block text-xs text-emerald-700">{{ c.seguroAplicado }} -{{ c.porcentajeDescuento }}%</span>
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                <button *ngIf="c.estado === 'Agendada' || c.estado === 'Modificada'"
                        class="text-sm text-red-600 hover:underline mr-3" (click)="cancelar(c)">Cancelar</button>
                <button class="text-sm text-red-700 hover:underline" (click)="eliminar(c)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="citas.length === 0" class="text-gray-500 py-4">No hay citas registradas.</p>
      </div>
    </main>
  `,
})
export class RecepcionistaCitasComponent implements OnInit {
  citas: Cita[] = [];

  constructor(private api: ApiService, private avisos: NotificacionService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarCitas().subscribe((c) => (this.citas = c));
  }

  cancelar(c: Cita) {
    if (!confirm('Cancelar esta cita?')) return;
    this.api.cancelarCita(c.id).subscribe(() => this.cargar());
  }

  eliminar(c: Cita) {
    // [Eliminacion] Ya no es definitivo: va a la papelera
    const motivo = pedirMotivo(`Eliminar la cita de ${c.nombrePaciente} del ${c.fecha}?`);
    if (motivo === null) return;
    this.api.eliminarCita(c.id, motivo).subscribe({
      next: () => {
        this.avisos.exito('La cita se movio a la papelera');
        this.cargar();
      },
      error: (e) => this.avisos.error(e?.error?.error ?? 'No se pudo eliminar'),
    });
  }
}
