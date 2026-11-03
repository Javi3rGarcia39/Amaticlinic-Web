import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar.component';
import { RecetaCardComponent } from '../../shared/receta-card.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Receta } from '../../core/models/models';
import { imprimirReceta } from '../../shared/imprimir-receta'; // [Impresion]

// [Farmacia] El paciente consulta e imprime sus recetas para presentarlas en farmacia
@Component({
  selector: 'app-mis-recetas',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RecetaCardComponent],
  template: `
    <app-navbar />
    <main class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-1 no-print">Mis recetas</h1>
      <p class="text-gray-500 mb-6 no-print">Presenta el codigo de la receta en farmacia para recibir tus medicamentos.</p>

      <div class="space-y-4">
        <app-receta-card *ngFor="let r of recetas" [receta]="r">
          <div class="flex items-center justify-between pt-4 no-print">
            <p class="text-sm text-gray-500" *ngIf="r.estado === 'Emitida' && !r.vencida">Pendiente de retirar en farmacia.</p>
            <p class="text-sm text-amber-700" *ngIf="r.estado === 'Parcial' && !r.vencida">Tienes medicamentos pendientes de retirar.</p>
            <p class="text-sm text-red-700" *ngIf="r.vencida">La receta vencio; solicita una nueva a tu medico.</p>
            <span *ngIf="r.estado === 'Despachada' || r.estado === 'Anulada'"></span>
            <button *ngIf="r.estado !== 'Anulada'" class="btn-secondary text-sm" (click)="imprimir(r)">Imprimir / guardar PDF</button>
          </div>
        </app-receta-card>
        <p *ngIf="recetas.length === 0" class="text-gray-500">Todavia no tienes recetas.</p>
      </div>
    </main>
  `,
})
export class MisRecetasComponent implements OnInit {
  recetas: Receta[] = [];

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    const idPaciente = this.auth.user()?.idPerfil;
    if (idPaciente) this.api.recetasPorPaciente(idPaciente).subscribe((r) => (this.recetas = r));
  }

  // [Impresion] Misma receta con formato de documento que imprime el medico
  imprimir(r: Receta) {
    imprimirReceta(r);
  }
}
