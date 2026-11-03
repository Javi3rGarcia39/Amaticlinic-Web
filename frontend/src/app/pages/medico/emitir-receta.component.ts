import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { AlertaAlergia, Cita, Medicamento, Paciente, Receta } from '../../core/models/models';

interface LineaReceta {
  idMedicamento: number | null;
  dosis: string;
  frecuencia: string;
  duracionDias: number;
  cantidad: number;
  indicaciones: string;
}

function lineaVacia(): LineaReceta {
  return { idMedicamento: null, dosis: '1 tableta', frecuencia: 'cada 8 horas', duracionDias: 5, cantidad: 15, indicaciones: '' };
}

// [Farmacia] El medico emite la receta electronica al terminar la consulta
@Component({
  selector: 'app-emitir-receta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar />
    <main class="max-w-4xl mx-auto px-4 py-8" *ngIf="cita">
      <a [routerLink]="['/medico/citas', cita.id]" class="text-sm text-primary hover:underline">&larr; Volver a la cita</a>
      <h1 class="text-2xl font-bold text-gray-800 mt-3 mb-1">Emitir receta</h1>
      <p class="text-gray-500 mb-6">{{ cita.nombrePaciente }} · consulta del {{ cita.fecha }}</p>

      <div *ngIf="recetaVigente" class="card text-sm">
        Esta cita ya tiene la receta <span class="font-mono font-semibold">{{ recetaVigente.codigo }}</span>
        ({{ recetaVigente.estado }}). Para emitir otra, primero anule la actual desde el detalle de la cita.
      </div>

      <div *ngIf="!recetaVigente && cita.estado !== 'Completada'" class="card text-sm text-amber-800 bg-amber-50 border-amber-200">
        La cita debe estar <strong>Completada</strong> para poder emitir una receta.
      </div>

      <ng-container *ngIf="!recetaVigente && cita.estado === 'Completada'">
        <div class="card mb-4 text-sm" [class.bg-red-50]="!!paciente?.alergias" [class.border-red-200]="!!paciente?.alergias">
          <span class="font-semibold">Alergias del paciente:</span>
          {{ paciente?.alergias || 'Ninguna registrada' }}
        </div>

        <div class="card space-y-5">
          <div *ngFor="let l of lineas; let i = index" class="border border-gray-100 rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-gray-700">Medicamento {{ i + 1 }}</p>
              <button *ngIf="lineas.length > 1" class="text-sm text-red-700 hover:underline" (click)="quitar(i)">Quitar</button>
            </div>
            <div>
              <label class="label-field">Medicamento</label>
              <select class="input-field" [(ngModel)]="l.idMedicamento" (ngModelChange)="revisarAlergias()">
                <option [ngValue]="null">Selecciona un medicamento</option>
                <option *ngFor="let m of medicamentos" [ngValue]="m.id">
                  {{ m.nombre }} {{ m.presentacion }} {{ m.concentracion }} — stock {{ m.stock }}
                </option>
              </select>
              <p *ngIf="sinStock(l)" class="text-xs text-amber-700 mt-1">
                Hay menos unidades en farmacia que las recetadas; el paciente podria recibir un despacho parcial.
              </p>
            </div>
            <div class="grid sm:grid-cols-4 gap-3">
              <div><label class="label-field">Dosis</label><input class="input-field" [(ngModel)]="l.dosis" /></div>
              <div><label class="label-field">Frecuencia</label><input class="input-field" [(ngModel)]="l.frecuencia" /></div>
              <div><label class="label-field">Dias</label><input class="input-field" type="number" min="1" [(ngModel)]="l.duracionDias" /></div>
              <div><label class="label-field">Unidades a entregar</label><input class="input-field" type="number" min="1" [(ngModel)]="l.cantidad" /></div>
            </div>
            <div>
              <label class="label-field">Indicaciones (opcional)</label>
              <input class="input-field" [(ngModel)]="l.indicaciones" placeholder="Ej. tomar despues de comer" />
            </div>
          </div>

          <button class="btn-secondary" (click)="agregar()">+ Agregar medicamento</button>

          <div>
            <label class="label-field">Indicaciones generales (opcional)</label>
            <textarea class="input-field" rows="2" [(ngModel)]="indicacionesGenerales"></textarea>
          </div>

          <div *ngIf="alertas.length" class="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <p class="font-semibold mb-1">Alerta de alergia</p>
            <ul class="list-disc ml-5">
              <li *ngFor="let a of alertas">{{ a.medicamento }} ({{ a.principioActivo }}) coincide con la alergia "{{ a.alergeno }}"</li>
            </ul>
            <label class="flex items-center gap-2 mt-3">
              <input type="checkbox" [(ngModel)]="confirmarAlergias" />
              Confirmo que conozco la alergia y deseo recetar de todas formas
            </label>
          </div>

          <div *ngIf="error" class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>

          <button class="btn-primary w-full" [disabled]="!puedeEmitir() || guardando" (click)="emitir()">
            {{ guardando ? 'Emitiendo...' : 'Emitir receta' }}
          </button>
        </div>
      </ng-container>
    </main>
  `,
})
export class EmitirRecetaComponent implements OnInit {
  cita: Cita | null = null;
  paciente: Paciente | null = null;
  medicamentos: Medicamento[] = [];
  recetaVigente: Receta | null = null;
  lineas: LineaReceta[] = [lineaVacia()];
  indicacionesGenerales = '';
  alertas: AlertaAlergia[] = [];
  confirmarAlergias = false;
  guardando = false;
  error = '';

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.obtenerCita(id).subscribe((c) => {
      this.cita = c;
      this.api.obtenerPaciente(c.idPaciente).subscribe((p) => (this.paciente = p));
    });
    this.api.recetasPorCita(id).subscribe((rs) => (this.recetaVigente = rs.find((r) => r.estado !== 'Anulada') ?? null));
    this.api.listarMedicamentos().subscribe((m) => (this.medicamentos = m));
  }

  agregar() {
    this.lineas.push(lineaVacia());
  }

  quitar(i: number) {
    this.lineas.splice(i, 1);
    this.revisarAlergias();
  }

  sinStock(l: LineaReceta): boolean {
    const m = this.medicamentos.find((x) => x.id === l.idMedicamento);
    return !!m && m.stock < l.cantidad;
  }

  // Consulta al backend si algun medicamento elegido choca con las alergias del paciente
  revisarAlergias() {
    const ids = this.lineas.map((l) => l.idMedicamento).filter((x): x is number => x !== null);
    this.confirmarAlergias = false;
    if (!this.cita || !ids.length) {
      this.alertas = [];
      return;
    }
    this.api.verificarAlergias(this.cita.idPaciente, ids).subscribe((r) => (this.alertas = r.alertas));
  }

  puedeEmitir(): boolean {
    const completas = this.lineas.every(
      (l) => l.idMedicamento !== null && l.dosis.trim() && l.frecuencia.trim() && l.duracionDias > 0 && l.cantidad > 0,
    );
    return completas && (this.alertas.length === 0 || this.confirmarAlergias);
  }

  emitir() {
    if (!this.cita) return;
    this.error = '';
    this.guardando = true;
    this.api
      .emitirReceta({
        idCita: this.cita.id,
        indicacionesGenerales: this.indicacionesGenerales,
        confirmarAlergias: this.confirmarAlergias,
        detalles: this.lineas.map((l) => ({ ...l, indicaciones: l.indicaciones || undefined })),
      })
      .subscribe({
        next: () => this.router.navigate(['/medico/citas', this.cita!.id]),
        error: (e) => {
          this.guardando = false;
          const err = e?.error;
          this.error = err?.error ?? (Array.isArray(err?.errors) ? err.errors.join(', ') : 'No se pudo emitir la receta');
        },
      });
  }
}
