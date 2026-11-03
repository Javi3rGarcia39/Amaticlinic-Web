import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Lote, Medicamento, ResumenFarmacia } from '../../core/models/models';
import { DatoColumna, GraficaColumnasComponent } from '../../shared/grafica-columnas.component';
import { BarrasHorizontalesComponent, DatoBarra } from '../../shared/barras-horizontales.component';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// [Farmacia] Panel de inicio del farmaceutico
// [Dashboard] [Lotes] [Seguros] Ventas, margen, valor del inventario y lotes por vencer
@Component({
  selector: 'app-farmacia-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, GraficaColumnasComponent, BarrasHorizontalesComponent],
  template: `
    <app-navbar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-gray-800 mb-1">Farmacia</h1>
      <p class="text-gray-500 mb-6">Hola, {{ auth.user()?.nombre }}. Este es el estado de la farmacia hoy.</p>

      <ng-container *ngIf="r() as resumen">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <a routerLink="/farmacia/despacho" class="card hover:border-primary/40">
            <p class="text-sm text-gray-500">Recetas por despachar</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">{{ resumen.recetasPendientes }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ resumen.recetasDespachadasHoy }} despachadas hoy ({{ resumen.unidadesDespachadasHoy }} unidades)</p>
          </a>
          <div class="card">
            <p class="text-sm text-gray-500">Ventas de 30 dias</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">Q{{ resumen.ventas30Dias | number: '1.2-2' }}</p>
            <p class="text-xs text-gray-500 mt-1">Margen Q{{ resumen.margen30Dias | number: '1.2-2' }}, descuentos de seguros Q{{ resumen.descuentosSeguro30Dias | number: '1.2-2' }}</p>
          </div>
          <a routerLink="/farmacia/valuacion" class="card hover:border-primary/40">
            <p class="text-sm text-gray-500">Valor del inventario</p>
            <p class="text-3xl font-bold text-gray-900 mt-1 tabular-nums">Q{{ resumen.valorInventario | number: '1.2-2' }}</p>
            <p class="text-xs text-gray-500 mt-1">A costo de cada lote, metodo {{ resumen.metodoInventario }}</p>
          </a>
          <a routerLink="/farmacia/inventario" class="card hover:border-primary/40" [class.border-red-200]="resumen.lotesVencidos > 0">
            <p class="text-sm text-gray-500">Alertas</p>
            <p class="text-3xl font-bold mt-1 tabular-nums" [ngClass]="resumen.medicamentosStockBajo || resumen.lotesVencidos ? 'text-red-700' : 'text-gray-900'">
              {{ resumen.medicamentosStockBajo + resumen.lotesVencidos + resumen.lotesPorVencer }}
            </p>
            <p class="text-xs text-gray-500 mt-1">{{ resumen.medicamentosStockBajo }} con stock bajo, {{ resumen.lotesVencidos }} lotes vencidos, {{ resumen.lotesPorVencer }} por vencer</p>
          </a>
        </div>

        <div class="grid gap-6 lg:grid-cols-3 mb-6">
          <section class="card lg:col-span-2">
            <h2 class="font-semibold text-gray-800">Ventas por dia</h2>
            <p class="text-sm text-gray-500 mb-4">Ultimos 14 dias, en quetzales cobrados (con descuentos)</p>
            <app-grafica-columnas [datos]="ventasDia()" formato="moneda" titulo="Ventas por dia" [alto]="170" />
          </section>
          <section class="card">
            <h2 class="font-semibold text-gray-800">Mas despachados</h2>
            <p class="text-sm text-gray-500 mb-4">Unidades, ultimos 30 dias</p>
            <app-barras-horizontales [datos]="masDespachados()" titulo="Medicamentos mas despachados" vacio="Aun no hay despachos registrados." />
          </section>
        </div>
      </ng-container>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="card">
          <h2 class="font-semibold text-gray-800 mb-3">Reabastecer pronto</h2>
          <table class="w-full text-sm" *ngIf="stockBajo().length">
            <thead>
              <tr class="text-left text-gray-500 border-b">
                <th class="py-2 pr-4">Medicamento</th>
                <th class="py-2 pr-4 text-right">Stock</th>
                <th class="py-2 text-right">Minimo</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b last:border-0" *ngFor="let m of stockBajo()">
                <td class="py-2 pr-4">{{ m.nombre }} <span class="text-gray-500">{{ m.presentacion }} {{ m.concentracion }}</span></td>
                <td class="py-2 pr-4 text-right font-semibold" [class.text-red-700]="m.stock === 0">{{ m.stock }}</td>
                <td class="py-2 text-right text-gray-500">{{ m.stockMinimo }}</td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="!stockBajo().length" class="text-sm text-gray-500">Todos los medicamentos estan sobre su stock minimo.</p>
        </section>

        <section class="card">
          <h2 class="font-semibold text-gray-800 mb-3">Lotes vencidos o por vencer</h2>
          <ul class="divide-y" *ngIf="riesgo().length">
            <li *ngFor="let l of riesgo()" class="py-2 flex items-center justify-between gap-3 text-sm">
              <span class="min-w-0">
                <span class="block text-gray-900 truncate">{{ l.medicamento }}</span>
                <span class="block text-xs text-gray-500">Lote {{ l.codigo }}, {{ l.cantidadDisponible }} unidades</span>
              </span>
              <span class="badge shrink-0" [ngClass]="l.estado === 'Vencido' ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-800'">
                {{ l.estado === 'Vencido' ? 'Vencio' : 'Vence' }} {{ l.fechaVencimiento | date: 'dd/MM/yyyy' }}
              </span>
            </li>
          </ul>
          <p *ngIf="!riesgo().length" class="text-sm text-gray-500">Ningun lote vence en los proximos 60 dias.</p>
        </section>
      </div>
    </main>
  `,
})
export class FarmaciaDashboardComponent implements OnInit {
  r = signal<ResumenFarmacia | null>(null);
  stockBajo = signal<Medicamento[]>([]);
  riesgo = signal<Lote[]>([]);

  constructor(public auth: AuthService, private api: ApiService) {}

  ventasDia = computed<DatoColumna[]>(() =>
    (this.r()?.ventasPorDia ?? []).map((d, i, arr) => {
      const [y, m, dd] = d.fecha.split('-').map(Number);
      const f = new Date(y, m - 1, dd);
      return {
        etiqueta: `${DIAS[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]}`,
        corta: `${f.getDate()}`,
        valor: d.ventas,
        resaltar: i === arr.length - 1,
        detalle: [`${d.unidades} unidades`],
      };
    }),
  );

  masDespachados = computed<DatoBarra[]>(() =>
    (this.r()?.masDespachados30Dias ?? []).map((m) => ({ etiqueta: m.medicamento, valor: m.unidades })),
  );

  ngOnInit() {
    this.api.resumenFarmacia().subscribe((r) => this.r.set(r));
    this.api.medicamentosStockBajo().subscribe((m) => this.stockBajo.set(m));
    this.api.lotesEnRiesgo().subscribe((l) => this.riesgo.set(l.slice(0, 8)));
  }
}
