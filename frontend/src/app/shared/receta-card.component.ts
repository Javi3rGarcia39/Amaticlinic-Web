import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoReceta, Receta } from '../core/models/models';

// [Farmacia] Tarjeta reutilizable de receta (medico, paciente y farmacia). El contenido extra
// (botones, formularios de despacho) se proyecta con <ng-content>.
@Component({
  selector: 'app-receta-card',
  // [Farmacia] host en bloque para que space-y-* separe las tarjetas
  host: { class: 'block' },
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="flex items-start justify-between gap-4 mb-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500">Receta medica</p>
          <p class="text-xl font-bold text-gray-800 font-mono">{{ receta.codigo }}</p>
        </div>
        <div class="text-right">
          <span class="badge" [ngClass]="claseEstado(receta.estado)">{{ receta.estado }}</span>
          <span *ngIf="receta.vencida" class="badge bg-red-100 text-red-700 ml-1">Vencida</span>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
        <p><span class="text-gray-500">Paciente:</span> {{ receta.nombrePaciente }}</p>
        <p><span class="text-gray-500">Medico:</span> Dr(a). {{ receta.nombreMedico }} — {{ receta.especialidad }}</p>
        <p><span class="text-gray-500">Emitida:</span> {{ receta.fechaEmision | date: 'dd/MM/yyyy HH:mm' }}</p>
        <p><span class="text-gray-500">Valida hasta:</span> {{ receta.fechaVencimiento }}</p>
        <p *ngIf="mostrarAlergias && receta.alergiasPaciente" class="sm:col-span-2 text-red-700">
          <span class="font-semibold">Alergias registradas:</span> {{ receta.alergiasPaciente }}
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Medicamento</th>
              <th class="py-2 pr-4 hidden sm:table-cell">Indicacion</th>
              <th class="py-2 pr-2 sm:pr-4 text-right">Cant.</th>
              <th class="py-2 text-right whitespace-nowrap" *ngIf="mostrarDespacho">Entregado</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b last:border-0 align-top" *ngFor="let d of receta.detalles">
              <td class="py-2 pr-4">
                <p class="font-medium text-gray-800">{{ d.medicamento }}</p>
                <p class="text-xs text-gray-500">{{ d.presentacion }} {{ d.concentracion }} · {{ d.principioActivo }}</p>
                <!-- [Farmacia] En movil la indicacion va debajo del medicamento -->
                <p class="sm:hidden text-gray-700 mt-1">{{ d.dosis }} {{ d.frecuencia }} por {{ d.duracionDias }} dia(s)</p>
                <p *ngIf="d.indicaciones" class="sm:hidden text-xs text-gray-500">{{ d.indicaciones }}</p>
              </td>
              <td class="py-2 pr-4 hidden sm:table-cell">
                {{ d.dosis }} {{ d.frecuencia }} por {{ d.duracionDias }} dia(s)
                <p *ngIf="d.indicaciones" class="text-xs text-gray-500">{{ d.indicaciones }}</p>
              </td>
              <td class="py-2 pr-2 sm:pr-4 text-right">{{ d.cantidad }}</td>
              <td class="py-2 text-right whitespace-nowrap" *ngIf="mostrarDespacho"
                  [class.text-green-700]="d.pendiente === 0" [class.text-amber-700]="d.pendiente > 0 && d.cantidadDespachada > 0">
                {{ d.cantidadDespachada }} / {{ d.cantidad }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p *ngIf="receta.indicacionesGenerales" class="text-sm mt-3">
        <span class="text-gray-500">Indicaciones generales:</span> {{ receta.indicacionesGenerales }}
      </p>

      <ng-content></ng-content>
    </div>
  `,
})
export class RecetaCardComponent {
  @Input({ required: true }) receta!: Receta;
  @Input() mostrarAlergias = false;
  @Input() mostrarDespacho = true;

  claseEstado(estado: EstadoReceta): string {
    switch (estado) {
      case 'Emitida': return 'bg-blue-100 text-blue-700';
      case 'Parcial': return 'bg-amber-100 text-amber-800';
      case 'Despachada': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }
}
