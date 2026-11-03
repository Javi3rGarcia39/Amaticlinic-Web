import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { RecetaCardComponent } from '../../shared/receta-card.component';
import { ApiService } from '../../core/services/api.service';
import { Receta, ResultadoDespacho } from '../../core/models/models';

// [Farmacia] Busqueda de recetas por codigo y despacho de medicamentos
@Component({
  selector: 'app-farmacia-despacho',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, RecetaCardComponent],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Despachar recetas</h1>

      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Busqueda y cola de pendientes -->
        <section class="space-y-4">
          <div class="card">
            <label class="label-field">Codigo de receta</label>
            <div class="flex gap-2">
              <input class="input-field font-mono uppercase" [(ngModel)]="codigo" placeholder="RX-XXXXXX" (keyup.enter)="buscar()" />
              <button class="btn-primary" (click)="buscar()" [disabled]="!codigo.trim()">Buscar</button>
            </div>
          </div>

          <div class="card">
            <h2 class="font-semibold text-gray-800 mb-3">Pendientes ({{ pendientes.length }})</h2>
            <div class="space-y-2">
              <button *ngFor="let r of pendientes" (click)="seleccionar(r)"
                      class="w-full text-left border rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                      [class.border-primary]="seleccionada?.id === r.id">
                <p class="font-mono text-sm font-semibold">{{ r.codigo }}</p>
                <p class="text-xs text-gray-500">{{ r.nombrePaciente }} · {{ r.estado }}{{ r.vencida ? ' · vencida' : '' }}</p>
              </button>
              <p *ngIf="!pendientes.length" class="text-sm text-gray-500">No hay recetas pendientes.</p>
            </div>
          </div>
        </section>

        <!-- Receta seleccionada -->
        <section class="lg:col-span-2 space-y-4">
          <div *ngIf="error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>

          <div *ngIf="resultado" class="card border-green-200 bg-green-50 text-sm space-y-2">
            <p class="font-semibold text-green-800">Despacho registrado — receta {{ resultado.receta.estado }}</p>
            <p *ngIf="resultado.entregados.length">
              Entregado: <span *ngFor="let e of resultado.entregados; let last = last">{{ e.cantidad }} {{ e.medicamento }}{{ last ? '' : ', ' }}</span>
            </p>
            <p *ngIf="resultado.faltantes.length" class="text-amber-800">
              Pendiente por falta de stock:
              <span *ngFor="let f of resultado.faltantes; let last = last">{{ f.cantidad }} {{ f.medicamento }}{{ last ? '' : ', ' }}</span>
            </p>
            <p *ngIf="resultado.alertasStock.length" class="text-red-700">
              Stock bajo:
              <span *ngFor="let a of resultado.alertasStock; let last = last">{{ a.medicamento }} ({{ a.stock }} uds){{ last ? '' : ', ' }}</span>
            </p>
            <!-- [Lotes] De que lote salio cada medicamento -->
            <p class="text-gray-700">
              Lotes usados ({{ resultado.metodo }}):
              <span *ngFor="let l of resultado.lotesUsados; let last = last">{{ l.cantidad }} {{ l.medicamento }} del lote {{ l.lote }}{{ l.vencimiento ? ' (vence ' + l.vencimiento + ')' : '' }}{{ last ? '' : '; ' }}</span>
            </p>
            <!-- [Seguros] Cobro de este despacho -->
            <div class="mt-2 pt-2 border-t border-green-200 max-w-xs space-y-1">
              <div class="flex justify-between"><span>Subtotal</span><span class="tabular-nums">Q{{ resultado.cobro.subtotal | number: '1.2-2' }}</span></div>
              <div *ngIf="resultado.cobro.descuento > 0" class="flex justify-between text-emerald-800">
                <span>Descuento {{ resultado.cobro.seguro }} ({{ resultado.cobro.porcentaje }}%)</span><span class="tabular-nums whitespace-nowrap">-Q{{ resultado.cobro.descuento | number: '1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-semibold text-gray-900 text-base"><span>Total a cobrar</span><span class="tabular-nums">Q{{ resultado.cobro.total | number: '1.2-2' }}</span></div>
            </div>
          </div>

          <!-- [Seguros] Seguro del paciente y total estimado de lo pendiente -->
          <div *ngIf="seleccionada as r" class="card text-sm flex flex-wrap items-center justify-between gap-3">
            <p class="text-gray-700">
              <ng-container *ngIf="r.seguroPaciente; else sinSeguro">Seguro <strong>{{ r.seguroPaciente }}</strong>: {{ r.descuentoMedicamentosPaciente }}% de descuento en medicamentos.</ng-container>
              <ng-template #sinSeguro>El paciente no tiene seguro con convenio.</ng-template>
            </p>
            <p *ngIf="estimado(r) as e" class="text-gray-900">Pendiente por cobrar: <strong class="tabular-nums">Q{{ e | number: '1.2-2' }}</strong></p>
          </div>

          <app-receta-card *ngIf="seleccionada as r" [receta]="r" [mostrarAlergias]="true">
            <ng-container *ngIf="(r.estado === 'Emitida' || r.estado === 'Parcial') && !r.vencida; else noDespachable">
              <h3 class="font-semibold text-gray-800 mt-5 mb-2">Cantidades a entregar</h3>
              <div class="space-y-2">
                <div *ngFor="let d of pendientesDe(r)" class="flex items-center gap-3 text-sm">
                  <!-- [Farmacia] Etiqueta flexible + input de ancho fijo (input-field trae w-full) -->
                  <span class="flex-1 min-w-0">
                    <span class="font-medium">{{ d.medicamento }}</span>
                    <span class="text-gray-500"> — pendiente {{ d.pendiente }}, stock {{ d.stockDisponible }}</span>
                    <span *ngIf="d.stockDisponible === 0" class="ml-2 text-xs font-medium text-red-700 bg-red-50 rounded px-1.5 py-0.5">Sin stock</span>
                  </span>
                  <div class="w-24 shrink-0">
                    <input class="input-field" type="number" min="0" [max]="d.pendiente" [disabled]="d.stockDisponible === 0" [(ngModel)]="cantidades[d.id]" />
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap gap-3 pt-4">
                <button class="btn-primary" [disabled]="procesando || !hayCantidades()" (click)="despacharIndicado(r)">Despachar cantidades indicadas</button>
                <button class="btn-secondary" [disabled]="procesando" (click)="despacharTodo(r)">Despachar todo lo disponible</button>
              </div>
            </ng-container>
            <ng-template #noDespachable>
              <p class="text-sm text-gray-500 pt-4">
                {{ r.vencida ? 'La receta esta vencida; el paciente necesita una nueva.' : 'Esta receta no tiene medicamentos pendientes de despacho.' }}
              </p>
            </ng-template>
          </app-receta-card>

          <p *ngIf="!seleccionada" class="text-gray-500">Busca una receta por codigo o elige una de la lista de pendientes.</p>
        </section>
      </div>
    </main>
  `,
})
export class FarmaciaDespachoComponent implements OnInit {
  codigo = '';
  pendientes: Receta[] = [];
  seleccionada: Receta | null = null;
  cantidades: Record<number, number> = {};
  resultado: ResultadoDespacho | null = null;
  procesando = false;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.cargarPendientes();
  }

  cargarPendientes() {
    this.api.listarRecetas().subscribe(
      (rs) => (this.pendientes = rs.filter((r) => r.estado === 'Emitida' || r.estado === 'Parcial')),
    );
  }

  buscar() {
    this.error = '';
    this.resultado = null;
    this.api.recetaPorCodigo(this.codigo.trim()).subscribe({
      next: (r) => this.seleccionar(r),
      error: (e) => {
        this.seleccionada = null;
        this.error = e?.error?.error ?? 'Receta no encontrada';
      },
    });
  }

  seleccionar(r: Receta) {
    this.seleccionada = r;
    this.error = '';
    // Sugerencia: entregar lo pendiente hasta donde alcance el stock
    this.cantidades = {};
    for (const d of this.pendientesDe(r)) this.cantidades[d.id] = Math.min(d.pendiente, d.stockDisponible);
  }

  pendientesDe(r: Receta) {
    return r.detalles.filter((d) => d.pendiente > 0);
  }

  hayCantidades(): boolean {
    return Object.values(this.cantidades).some((c) => c > 0);
  }

  despacharIndicado(r: Receta) {
    const items = Object.entries(this.cantidades)
      .filter(([, c]) => c > 0)
      .map(([idDetalle, cantidad]) => ({ idDetalle: Number(idDetalle), cantidad }));
    this.ejecutar(r, items);
  }

  despacharTodo(r: Receta) {
    this.ejecutar(r);
  }

  private ejecutar(r: Receta, items?: { idDetalle: number; cantidad: number }[]) {
    this.procesando = true;
    this.error = '';
    this.resultado = null;
    this.api.despacharReceta(r.id, items).subscribe({
      next: (res) => {
        this.procesando = false;
        this.resultado = res;
        this.seleccionar(res.receta);
        this.cargarPendientes();
      },
      error: (e) => {
        this.procesando = false;
        this.error = e?.error?.error ?? 'No se pudo despachar la receta';
      },
    });
  }

  // [Seguros] Total estimado de lo pendiente (precio x pendiente, menos el descuento del seguro)
  estimado(r: Receta): number {
    const bruto = r.detalles.reduce((s, d) => s + d.pendiente * (d.precioUnitario ?? 0), 0);
    return Math.round(bruto * (1 - (r.descuentoMedicamentosPaciente ?? 0) / 100) * 100) / 100;
  }
}
