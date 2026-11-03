import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DatoColumna {
  etiqueta: string;       // texto completo (tooltip y tabla)
  corta: string;          // texto del eje
  valor: number;
  resaltar?: boolean;     // por ejemplo, "hoy"
  detalle?: string[];     // lineas extra en el tooltip
}

// [ModoOscuro] En modo oscuro la columna resaltada usa el verde de acento y el tooltip un gris mas claro.
// [Dashboard] Columnas de una sola serie (sin librerias): columnas de max 24 px con esquina
// redondeada solo arriba, cuadricula tenue, valor solo en el maximo y en la columna resaltada,
// tooltip al pasar el mouse o con el teclado y tabla oculta para lectores de pantalla.
@Component({
  selector: 'app-grafica-columnas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <figure class="relative pt-4" (mouseleave)="activo.set(null)">
      <div class="relative" [style.height.px]="alto">
        <!-- Cuadricula -->
        <div *ngFor="let t of ticks()" class="absolute inset-x-0 flex items-center" [style.bottom.%]="(t / escala()) * 100">
          <span class="w-9 pr-2 text-right text-[10px] text-gray-400 tabular-nums -translate-y-1/2 shrink-0">{{ fmtCorto(t) }}</span>
          <span class="flex-1 border-t border-gray-100"></span>
        </div>
        <!-- Columnas -->
        <div class="absolute inset-y-0 right-0 left-9 flex items-end gap-0.5">
          <button *ngFor="let d of datos; let i = index" type="button"
                  class="relative flex-1 h-full flex items-end justify-center focus:outline-none group"
                  (mouseenter)="activo.set(i)" (focus)="activo.set(i)" (blur)="activo.set(null)"
                  [attr.aria-label]="d.etiqueta + ': ' + fmt(d.valor)">
            <span *ngIf="mostrarValor(d)" class="absolute text-[10px] font-medium text-gray-700 tabular-nums whitespace-nowrap"
                  [style.bottom]="'calc(' + pct(d.valor) + '% + 3px)'">{{ fmtCorto(d.valor) }}</span>
            <span class="block w-full rounded-t-[4px] transition-opacity"
                  [style.max-width.px]="24"
                  [style.height.%]="pct(d.valor)"
                  [style.min-height.px]="d.valor > 0 ? 2 : 0"
                  [ngClass]="d.resaltar ? 'bg-primary-dark dark:bg-accent' : 'bg-primary'"
                  [class.opacity-60]="activo() !== null && activo() !== i"></span>
            <span class="absolute inset-x-0 bottom-0 h-full group-focus-visible:ring-2 group-focus-visible:ring-primary/40 rounded"></span>
          </button>
        </div>
        <!-- Tooltip -->
        <div *ngIf="activo() !== null && datos[activo()!] as d"
             class="absolute z-10 -translate-x-1/2 pointer-events-none rounded-md bg-gray-900 dark:bg-gray-700 text-white text-xs px-2.5 py-1.5 shadow-lg whitespace-nowrap"
             [style.left]="'calc(2.25rem + (100% - 2.25rem) * ' + ((activo()! + 0.5) / datos.length) + ')'"
             [style.bottom]="'calc(' + pct(d.valor) + '% + 18px)'">
          <p class="font-semibold">{{ d.etiqueta }}</p>
          <p class="tabular-nums">{{ fmt(d.valor) }}</p>
          <p *ngFor="let l of d.detalle" class="text-white/75">{{ l }}</p>
        </div>
      </div>
      <!-- Eje X -->
      <div class="ml-9 flex gap-0.5 mt-1 border-t border-gray-200 pt-1">
        <span *ngFor="let d of datos; let i = index" class="flex-1 text-center text-[10px] leading-tight"
              [ngClass]="d.resaltar ? 'text-gray-900 font-semibold' : 'text-gray-500'">{{ i % saltoEtiqueta() === 0 || d.resaltar ? d.corta : '' }}</span>
      </div>
      <!-- Tabla accesible -->
      <table class="sr-only">
        <caption>{{ titulo }}</caption>
        <tr *ngFor="let d of datos"><th scope="row">{{ d.etiqueta }}</th><td>{{ fmt(d.valor) }}</td></tr>
      </table>
    </figure>
  `,
})
export class GraficaColumnasComponent {
  @Input({ required: true }) datos: DatoColumna[] = [];
  @Input() titulo = '';
  @Input() alto = 160;
  @Input() formato: 'numero' | 'moneda' = 'numero';

  activo = signal<number | null>(null);

  escala = () => {
    const max = Math.max(1, ...this.datos.map((d) => d.valor));
    const paso = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map((m) => m * paso).find((v) => v >= max) ?? max;
    return nice;
  };

  ticks = () => {
    const e = this.escala();
    return [0, e / 2, e];
  };

  saltoEtiqueta = () => (this.datos.length > 14 ? 3 : this.datos.length > 8 ? 2 : 1);

  pct(v: number) {
    return (v / this.escala()) * 100;
  }

  mostrarValor(d: DatoColumna) {
    const max = Math.max(...this.datos.map((x) => x.valor));
    return d.valor > 0 && (d.resaltar || d.valor === max);
  }

  fmt(v: number) {
    return this.formato === 'moneda'
      ? `Q${v.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : v.toLocaleString('es-GT');
  }

  fmtCorto(v: number) {
    const pre = this.formato === 'moneda' ? 'Q' : '';
    if (v >= 1000) return `${pre}${(v / 1000).toLocaleString('es-GT', { maximumFractionDigits: 1 })}K`;
    return `${pre}${Math.round(v * 10) / 10}`;
  }
}
