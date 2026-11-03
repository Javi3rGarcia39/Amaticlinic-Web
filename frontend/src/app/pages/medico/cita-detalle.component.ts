import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Cita, Receta } from '../../core/models/models';
import { RecetaCardComponent } from '../../shared/receta-card.component'; // [Farmacia]
import { imprimirReceta } from '../../shared/imprimir-receta'; // [Impresion]

@Component({
  selector: 'app-cita-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, RecetaCardComponent],
  template: `
    <app-navbar />
    <main class="max-w-2xl mx-auto px-4 py-8" *ngIf="cita as c">
      <button (click)="volver()" class="text-sm text-primary mb-4 hover:underline">Volver</button>
      <div class="card space-y-3">
        <h1 class="text-xl font-bold text-gray-800">Detalle de la cita</h1>
        <p><span class="text-gray-500">Paciente:</span> <span class="font-medium">{{ c.nombrePaciente }}</span></p>
        <p><span class="text-gray-500">Fecha:</span> {{ c.fecha }}</p>
        <p><span class="text-gray-500">Horario:</span> {{ c.horaInicio }} - {{ c.horaFin }}</p>
        <p><span class="text-gray-500">Motivo de consulta:</span> {{ c.motivoConsulta || 'No especificado' }}</p>
        <p><span class="text-gray-500">Estado:</span> <span class="badge bg-primary/10 text-primary">{{ c.estado }}</span>
          <span *ngIf="c.esEmergencia" class="badge bg-red-100 text-red-700 ml-1">Emergencia</span></p>
        <!-- [Seguros] Cobro de la consulta -->
        <p *ngIf="c.totalPagar !== null">
          <span class="text-gray-500">Cobro:</span> Q{{ c.totalPagar | number: '1.2-2' }}
          <span *ngIf="c.montoDescuento > 0" class="text-sm text-gray-500">(consulta Q{{ c.costoConsulta | number: '1.2-2' }} menos {{ c.porcentajeDescuento }}% de {{ c.seguroAplicado }})</span>
        </p>

        <div class="flex gap-3 pt-4" *ngIf="c.estado === 'Agendada' || c.estado === 'Modificada'">
          <button class="btn-primary" (click)="completar()">Marcar como completada</button>
          <button class="btn-secondary" (click)="cancelar()">Cancelar cita</button>
        </div>
      </div>

      <!-- [Farmacia] Receta de la consulta -->
      <div class="mt-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-800">Receta</h2>
          <a *ngIf="c.estado === 'Completada' && !recetaVigente()" [routerLink]="['/medico/citas', c.id, 'receta']" class="btn-primary text-sm">
            Emitir receta
          </a>
        </div>
        <p *ngIf="c.estado !== 'Completada' && recetas.length === 0" class="text-sm text-gray-500">
          Marca la cita como completada para poder emitir la receta.
        </p>
        <p *ngIf="c.estado === 'Completada' && recetas.length === 0" class="text-sm text-gray-500">Esta consulta aun no tiene receta.</p>
        <app-receta-card *ngFor="let r of recetas" [receta]="r" [mostrarAlergias]="true">
          <!-- [Impresion] Imprimir la receta y anular si aun no se despacha -->
          <div class="flex flex-wrap items-center gap-3 pt-4" *ngIf="r.estado !== 'Anulada'">
            <button class="btn-secondary text-sm" (click)="imprimir(r)">Imprimir / PDF</button>
            <button *ngIf="r.estado === 'Emitida'" class="text-sm text-red-700 hover:underline ml-auto" (click)="anularReceta(r)">Anular receta</button>
          </div>
        </app-receta-card>
        <div *ngIf="errorReceta" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ errorReceta }}</div>
      </div>
    </main>
  `,
})
export class CitaDetalleComponent implements OnInit {
  cita: Cita | null = null;
  recetas: Receta[] = []; // [Farmacia]
  errorReceta = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.obtenerCita(id).subscribe((c) => (this.cita = c));
    this.cargarRecetas(id);
  }

  // [Farmacia]
  cargarRecetas(idCita: number) {
    this.api.recetasPorCita(idCita).subscribe((r) => (this.recetas = r));
  }

  recetaVigente(): Receta | undefined {
    return this.recetas.find((r) => r.estado !== 'Anulada');
  }

  // [Impresion]
  imprimir(r: Receta) {
    imprimirReceta(r);
  }

  anularReceta(r: Receta) {
    const motivo = prompt(`Motivo para anular la receta ${r.codigo}:`);
    if (motivo === null || !this.cita) return;
    this.errorReceta = '';
    this.api.anularReceta(r.id, motivo).subscribe({
      next: () => this.cargarRecetas(this.cita!.id),
      error: (e) => (this.errorReceta = e?.error?.error ?? 'No se pudo anular la receta'),
    });
  }

  completar() {
    if (!this.cita) return;
    this.api.completarCita(this.cita.id).subscribe((c) => (this.cita = c));
  }

  cancelar() {
    if (!this.cita || !confirm('Deseas cancelar esta cita?')) return;
    this.api.cancelarCita(this.cita.id).subscribe((c) => (this.cita = c));
  }

  // Regresa a la pantalla anterior (agenda, emergencias o recetas); si no hay, a la agenda
  volver() {
    if (window.history.length > 1) window.history.back();
    else this.router.navigate(['/medico/citas']);
  }
}
