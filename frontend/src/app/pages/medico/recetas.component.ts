import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { RecetaCardComponent } from '../../shared/receta-card.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Receta } from '../../core/models/models';
import { imprimirReceta } from '../../shared/imprimir-receta'; // [Impresion]

// [Farmacia] Recetas emitidas por el medico, con opcion de anular las no despachadas
// [Impresion] Boton para imprimir / guardar PDF y filtros por fecha de emision y paciente
@Component({
  selector: 'app-medico-recetas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, RecetaCardComponent],
  template: `
    <app-navbar />
    <main class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-1">Recetas emitidas</h1>
      <p class="text-sm text-gray-500 mb-5">Para emitir una receta, abre una cita completada desde tu agenda.</p>

      <!-- [Impresion] Filtros -->
      <div class="card mb-5">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label class="text-sm text-gray-600">
            Desde
            <input class="input-field mt-1" type="date" [(ngModel)]="desde" [max]="hasta || null" />
          </label>
          <label class="text-sm text-gray-600">
            Hasta
            <input class="input-field mt-1" type="date" [(ngModel)]="hasta" [min]="desde || null" />
          </label>
          <label class="text-sm text-gray-600">
            Estado
            <select class="input-field mt-1" [(ngModel)]="filtro">
              <option value="">Todos</option>
              <option value="Emitida">Emitidas</option>
              <option value="Parcial">Parciales</option>
              <option value="Despachada">Despachadas</option>
              <option value="Anulada">Anuladas</option>
            </select>
          </label>
          <label class="text-sm text-gray-600">
            Paciente o codigo
            <input class="input-field mt-1" type="search" placeholder="Buscar..." [(ngModel)]="buscar" />
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2 mt-3 text-sm">
          <span class="text-gray-500 mr-1">Rapido:</span>
          <button class="px-2.5 py-1 rounded-full border hover:bg-gray-50" (click)="rango(0)">Hoy</button>
          <button class="px-2.5 py-1 rounded-full border hover:bg-gray-50" (click)="rango(7)">Ultimos 7 dias</button>
          <button class="px-2.5 py-1 rounded-full border hover:bg-gray-50" (click)="rango(30)">Ultimos 30 dias</button>
          <button class="px-2.5 py-1 rounded-full text-primary hover:underline" (click)="limpiar()">Limpiar filtros</button>
          <span class="ml-auto text-gray-500">{{ filtradas().length }} de {{ recetas.length }} recetas</span>
        </div>
      </div>

      <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>

      <div class="space-y-4">
        <app-receta-card *ngFor="let r of filtradas()" [receta]="r">
          <div class="flex flex-wrap items-center gap-3 pt-4">
            <a [routerLink]="['/medico/citas', r.idCita]" class="btn-secondary text-sm">Ver cita</a>
            <button *ngIf="r.estado !== 'Anulada'" class="btn-secondary text-sm" (click)="imprimir(r)">Imprimir / PDF</button>
            <button *ngIf="r.estado === 'Emitida'" class="text-sm text-red-700 hover:underline ml-auto" (click)="anular(r)">Anular receta</button>
          </div>
        </app-receta-card>
        <p *ngIf="filtradas().length === 0" class="text-gray-500">No hay recetas que coincidan con los filtros.</p>
      </div>
    </main>
  `,
})
export class MedicoRecetasComponent implements OnInit {
  recetas: Receta[] = [];
  filtro = '';
  desde = '';
  hasta = '';
  buscar = '';
  error = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    const idMedico = this.auth.user()?.idPerfil;
    if (idMedico) this.api.recetasPorMedico(idMedico).subscribe((r) => (this.recetas = r));
  }

  filtradas(): Receta[] {
    const texto = this.buscar.trim().toLowerCase();
    return this.recetas.filter((r) => {
      const dia = this.diaLocal(r.fechaEmision);
      return (
        (!this.filtro || r.estado === this.filtro) &&
        (!this.desde || dia >= this.desde) &&
        (!this.hasta || dia <= this.hasta) &&
        (!texto || r.nombrePaciente.toLowerCase().includes(texto) || r.codigo.toLowerCase().includes(texto))
      );
    });
  }

  // [Impresion] Atajos de rango: ultimos N dias hasta hoy
  rango(dias: number) {
    const hoy = new Date();
    this.hasta = this.clave(hoy);
    this.desde = this.clave(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias));
  }

  limpiar() {
    this.desde = this.hasta = this.buscar = this.filtro = '';
  }

  imprimir(r: Receta) {
    imprimirReceta(r);
  }

  anular(r: Receta) {
    const motivo = prompt(`Motivo para anular la receta ${r.codigo}:`);
    if (motivo === null) return;
    this.error = '';
    this.api.anularReceta(r.id, motivo).subscribe({
      next: () => this.cargar(),
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo anular la receta'),
    });
  }

  // La fecha de emision viene en UTC; se compara con el dia local
  private diaLocal(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso.slice(0, 10) : this.clave(d);
  }

  private clave(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
