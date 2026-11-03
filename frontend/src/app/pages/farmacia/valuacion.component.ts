import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Lote, ValuacionInventario } from '../../core/models/models';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]

type Orden = 'valor' | 'nombre' | 'margen' | 'vencidas';

// [Lotes] Valuacion del inventario: cuanto vale lo que hay en bodega (a costo de cada lote),
// cuanto costo lo vendido en 30 dias y el margen obtenido. Tambien lista los lotes en riesgo.
@Component({
  selector: 'app-farmacia-valuacion',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Valuacion del inventario</h1>
          <p class="text-gray-500" *ngIf="v() as d">
            Metodo de salida actual: <strong>{{ d.metodo }}</strong>.
            {{ d.metodo === 'FIFO' ? 'Lo que queda en bodega son los lotes mas recientes.' : 'Lo que queda en bodega son los lotes mas antiguos.' }}
          </p>
        </div>
        <button class="btn-secondary text-sm no-print" (click)="imprimir()">Imprimir</button>
      </div>

      <ng-container *ngIf="v() as d">
        <!-- Totales -->
        <dl class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="card">
            <dt class="text-sm text-gray-500">Valor del inventario (a costo)</dt>
            <dd class="text-2xl font-bold text-gray-900 tabular-nums mt-1">Q{{ d.totales.valorInventario | number: '1.2-2' }}</dd>
            <dd class="text-xs text-gray-500 mt-1">{{ d.totales.unidades }} unidades. A precio de venta: Q{{ d.totales.valorVenta | number: '1.2-2' }}</dd>
          </div>
          <div class="card">
            <dt class="text-sm text-gray-500">Ventas de 30 dias</dt>
            <dd class="text-2xl font-bold text-gray-900 tabular-nums mt-1">Q{{ d.totales.ventas30 | number: '1.2-2' }}</dd>
            <dd class="text-xs text-gray-500 mt-1">Ya con descuentos de seguros</dd>
          </div>
          <div class="card">
            <dt class="text-sm text-gray-500">Costo de lo vendido (30 dias)</dt>
            <dd class="text-2xl font-bold text-gray-900 tabular-nums mt-1">Q{{ d.totales.costoVentas30 | number: '1.2-2' }}</dd>
            <dd class="text-xs text-gray-500 mt-1">Segun el costo del lote del que salio</dd>
          </div>
          <div class="card">
            <dt class="text-sm text-gray-500">Margen (30 dias)</dt>
            <dd class="text-2xl font-bold tabular-nums mt-1" [ngClass]="d.totales.margen30 >= 0 ? 'text-emerald-700' : 'text-red-700'">Q{{ d.totales.margen30 | number: '1.2-2' }}</dd>
            <dd class="text-xs text-gray-500 mt-1">Ventas menos costo</dd>
          </div>
        </dl>

        <!-- Lotes en riesgo -->
        <section class="card mb-6" *ngIf="riesgo().length">
          <h2 class="font-semibold text-gray-800">Lotes vencidos o por vencer (60 dias)</h2>
          <p class="text-sm text-gray-500 mb-3">{{ d.totales.unidadesVencidas }} unidades vencidas y {{ d.totales.unidadesPorVencer }} por vencer. Los vencidos no se despachan; dalos de baja en Inventario.</p>
          <div class="overflow-x-auto" [appListaLarga]="riesgo().length"> <!-- [ListasLargas] -->
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b">
                  <th class="py-2 pr-4">Medicamento</th><th class="py-2 pr-4">Lote</th><th class="py-2 pr-4">Vence</th>
                  <th class="py-2 pr-4 text-right">Unidades</th><th class="py-2 pr-4 text-right">Valor</th><th class="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let l of riesgo()" class="border-b last:border-0">
                  <td class="py-2 pr-4 font-medium text-gray-800">{{ l.medicamento }}</td>
                  <td class="py-2 pr-4">{{ l.codigo }}</td>
                  <td class="py-2 pr-4">{{ l.fechaVencimiento | date: 'dd/MM/yyyy' }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">{{ l.cantidadDisponible }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">Q{{ l.valor | number: '1.2-2' }}</td>
                  <td class="py-2"><span class="badge" [ngClass]="l.estado === 'Vencido' ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-800'">{{ l.estado === 'Vencido' ? 'Vencido' : 'Por vencer' }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Detalle por medicamento -->
        <section class="card overflow-x-auto">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 class="font-semibold text-gray-800">Detalle por medicamento</h2>
            <label class="text-sm text-gray-600 no-print">Ordenar por
              <select class="ml-2 border border-gray-300 rounded-md px-2 py-1 text-sm" [ngModel]="orden()" (ngModelChange)="orden.set($event)">
                <option value="valor">Valor en bodega</option>
                <option value="margen">Margen de 30 dias</option>
                <option value="vencidas">Unidades vencidas</option>
                <option value="nombre">Nombre</option>
              </select>
            </label>
          </div>
          <div [appListaLarga]="detalle().length"> <!-- [ListasLargas] -->
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-gray-500 border-b">
                  <th class="py-2 pr-4">Medicamento</th>
                  <th class="py-2 pr-4 text-right">Stock</th>
                  <th class="py-2 pr-4 text-right">Lotes</th>
                  <th class="py-2 pr-4 text-right">Costo prom.</th>
                  <th class="py-2 pr-4 text-right">Valor en bodega</th>
                  <th class="py-2 pr-4 text-right">Vendidas 30 d</th>
                  <th class="py-2 pr-4 text-right">Ventas 30 d</th>
                  <th class="py-2 pr-4 text-right">Costo 30 d</th>
                  <th class="py-2 text-right">Margen 30 d</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let m of detalle()" class="border-b last:border-0">
                  <td class="py-2 pr-4">
                    <p class="font-medium text-gray-800">{{ m.medicamento }}</p>
                    <p class="text-xs text-gray-500">{{ m.presentacion }}<span *ngIf="m.unidadesVencidas" class="text-red-700">, {{ m.unidadesVencidas }} vencidas</span></p>
                  </td>
                  <td class="py-2 pr-4 text-right tabular-nums">{{ m.stock }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">{{ m.lotes }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">Q{{ m.costoPromedio | number: '1.2-2' }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums font-medium">Q{{ m.valorInventario | number: '1.2-2' }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">{{ m.unidadesVendidas30 }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">Q{{ m.ventas30 | number: '1.2-2' }}</td>
                  <td class="py-2 pr-4 text-right tabular-nums">Q{{ m.costoVentas30 | number: '1.2-2' }}</td>
                  <td class="py-2 text-right tabular-nums" [ngClass]="m.margen30 < 0 ? 'text-red-700' : 'text-gray-900'">Q{{ m.margen30 | number: '1.2-2' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </ng-container>
      <p *ngIf="!v()" class="text-gray-500">Calculando valuacion...</p>
    </main>
  `,
})
export class FarmaciaValuacionComponent implements OnInit {
  private api = inject(ApiService);
  v = signal<ValuacionInventario | null>(null);
  riesgo = signal<Lote[]>([]);
  orden = signal<Orden>('valor');

  detalle = computed(() => {
    const lista = [...(this.v()?.detalle ?? [])];
    switch (this.orden()) {
      case 'nombre': return lista.sort((a, b) => a.medicamento.localeCompare(b.medicamento));
      case 'margen': return lista.sort((a, b) => b.margen30 - a.margen30);
      case 'vencidas': return lista.sort((a, b) => b.unidadesVencidas - a.unidadesVencidas);
      default: return lista.sort((a, b) => b.valorInventario - a.valorInventario);
    }
  });

  ngOnInit() {
    this.api.valuacionInventario().subscribe((d) => this.v.set(d));
    this.api.lotesEnRiesgo().subscribe((l) => this.riesgo.set(l));
  }

  imprimir() {
    window.print();
  }
}
