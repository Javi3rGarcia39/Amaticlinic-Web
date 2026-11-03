import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Cita } from '../../core/models/models';

@Component({
  selector: 'app-mis-citas',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Mis citas</h1>

      <div class="space-y-3">
        <div class="card flex items-center justify-between" *ngFor="let c of citas">
          <div>
            <p class="font-semibold text-gray-800">Dr(a). {{ c.nombreMedico }} — {{ c.especialidad }}</p>
            <p class="text-sm text-gray-500">{{ c.fecha }} · {{ c.horaInicio }} - {{ c.horaFin }}</p>
            <p class="text-sm text-gray-400" *ngIf="c.motivoConsulta">{{ c.motivoConsulta }}</p>
            <!-- [Seguros] Costo de la consulta -->
            <p class="text-sm text-gray-700 mt-1" *ngIf="c.totalPagar !== null && c.estado !== 'Cancelada'">
              Total Q{{ c.totalPagar | number: '1.2-2' }}<span *ngIf="c.montoDescuento > 0" class="text-emerald-700"> (ahorras Q{{ c.montoDescuento | number: '1.2-2' }} con {{ c.seguroAplicado }})</span>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="badge"
                  [class.bg-green-100]="c.estado === 'Agendada'" [class.text-green-700]="c.estado === 'Agendada'"
                  [class.bg-blue-100]="c.estado === 'Modificada'" [class.text-blue-700]="c.estado === 'Modificada'"
                  [class.bg-gray-100]="c.estado === 'Completada'" [class.text-gray-700]="c.estado === 'Completada'"
                  [class.bg-red-100]="c.estado === 'Cancelada'" [class.text-red-700]="c.estado === 'Cancelada'">
              {{ c.estado }}
            </span>
            <button *ngIf="c.estado === 'Agendada' || c.estado === 'Modificada'"
                    class="btn-secondary text-sm" (click)="cancelar(c)">Cancelar</button>
          </div>
        </div>
        <p *ngIf="citas.length === 0" class="text-gray-500">Todavia no tienes citas registradas.</p>
      </div>
    </main>
  `,
})
export class MisCitasComponent implements OnInit {
  citas: Cita[] = [];

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    const idPaciente = this.auth.user()?.idPerfil;
    if (idPaciente) this.api.listarCitasPorPaciente(idPaciente).subscribe((c) => (this.citas = c));
  }

  cancelar(c: Cita) {
    if (!confirm('Deseas cancelar esta cita?')) return;
    this.api.cancelarCita(c.id).subscribe(() => this.cargar());
  }
}
