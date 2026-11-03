import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DatoBarra {
  etiqueta: string;
  sub?: string;
  valor: number;
  texto?: string; // valor ya formateado (si no, se usa el numero)
}

// [Dashboard] Barras horizontales de una sola serie: etiqueta a la izquierda, valor al final,
// barra de 10 px con extremo redondeado sobre una pista gris.
@Component({
  selector: 'app-barras-horizontales',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul class="space-y-3" [attr.aria-label]="titulo">
      <li *ngFor="let d of datos" class="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm"
          [title]="d.etiqueta + ': ' + (d.texto ?? d.valor)">
        <span class="min-w-0">
          <span class="block truncate text-gray-800">{{ d.etiqueta }}</span>
          <span *ngIf="d.sub" class="block truncate text-xs text-gray-500">{{ d.sub }}</span>
        </span>
        <span class="h-2.5 rounded-r-[4px] bg-gray-100 overflow-hidden">
          <span class="block h-full rounded-r-[4px] bg-primary" [style.width.%]="ancho(d.valor)"></span>
        </span>
        <span class="text-right tabular-nums text-gray-900 font-medium w-14">{{ d.texto ?? d.valor }}</span>
      </li>
    </ul>
    <p *ngIf="!datos.length" class="text-sm text-gray-500">{{ vacio }}</p>
  `,
})
export class BarrasHorizontalesComponent {
  @Input({ required: true }) datos: DatoBarra[] = [];
  @Input() titulo = '';
  @Input() maximo: number | null = null; // por ejemplo 100 para porcentajes
  @Input() vacio = 'Sin datos para este periodo.';

  ancho(v: number) {
    const max = this.maximo ?? Math.max(1, ...this.datos.map((d) => d.valor));
    return Math.min(100, (v / max) * 100);
  }
}
