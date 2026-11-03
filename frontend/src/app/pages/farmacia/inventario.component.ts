import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar.component';
import { ApiService } from '../../core/services/api.service';
import { Lote, Medicamento, MetodoInventario } from '../../core/models/models';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ListaLargaDirective } from '../../shared/lista-larga.directive'; // [ListasLargas]

interface FormMedicamento {
  id?: number;
  nombre: string;
  principioActivo: string;
  presentacion: string;
  concentracion: string;
  stock: number;
  stockMinimo: number;
  precio: number;
  requiereReceta: boolean;
  // [Lotes] Lote del stock inicial
  codigoLote: string;
  fechaVencimiento: string;
  costoUnitario: number | null;
}

function formVacio(): FormMedicamento {
  return {
    nombre: '', principioActivo: '', presentacion: 'Tableta', concentracion: '', stock: 0, stockMinimo: 10, precio: 0,
    requiereReceta: true, codigoLote: '', fechaVencimiento: '', costoUnitario: null,
  };
}

const ESTADO_LOTE: Record<string, { texto: string; clase: string }> = {
  Vigente: { texto: 'Vigente', clase: 'bg-emerald-50 text-emerald-700' },
  PorVencer: { texto: 'Por vencer', clase: 'bg-amber-50 text-amber-800' },
  Vencido: { texto: 'Vencido', clase: 'bg-red-100 text-red-700' },
  Agotado: { texto: 'Agotado', clase: 'bg-gray-100 text-gray-500' },
};

// [Farmacia] Catalogo e inventario: altas, edicion, entradas de mercaderia y ajustes
// [Lotes] Cada entrada es un lote con costo y vencimiento; las salidas siguen el metodo FIFO o LIFO
@Component({
  selector: 'app-farmacia-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, ListaLargaDirective],
  template: `
    <app-navbar />
    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 class="text-2xl font-bold text-gray-800">Inventario</h1>
        <button class="btn-primary" (click)="nuevo()">+ Nuevo medicamento</button>
      </div>

      <!-- [Lotes] Metodo de salida -->
      <div class="card mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="max-w-xl">
          <p class="font-semibold text-gray-800">Orden de salida de los lotes</p>
          <p class="text-sm text-gray-500">
            <ng-container *ngIf="metodo === 'FIFO'">FIFO: al despachar sale primero el lote que entro primero (el mas antiguo).</ng-container>
            <ng-container *ngIf="metodo === 'LIFO'">LIFO: al despachar sale primero el lote que entro de ultimo (el mas reciente).</ng-container>
            Los lotes vencidos nunca se despachan.
          </p>
        </div>
        <div class="inline-flex rounded-lg border p-0.5 text-sm" role="radiogroup" aria-label="Metodo de inventario">
          <button role="radio" class="px-4 py-2 rounded-md font-medium" [attr.aria-checked]="metodo === 'FIFO'"
                  [ngClass]="metodo === 'FIFO' ? 'bg-primary text-white' : 'text-gray-600'" (click)="cambiarMetodo('FIFO')">FIFO</button>
          <button role="radio" class="px-4 py-2 rounded-md font-medium" [attr.aria-checked]="metodo === 'LIFO'"
                  [ngClass]="metodo === 'LIFO' ? 'bg-primary text-white' : 'text-gray-600'" (click)="cambiarMetodo('LIFO')">LIFO</button>
        </div>
      </div>

      <div *ngIf="error" class="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</div>
      <div *ngIf="mensaje" class="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{{ mensaje }}</div>

      <!-- Alta / edicion -->
      <div class="card mb-6" *ngIf="form">
        <h2 class="font-semibold text-gray-800 mb-4">{{ form.id ? 'Editar' : 'Nuevo' }} medicamento</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label class="label-field">Nombre</label><input class="input-field" [(ngModel)]="form.nombre" /></div>
          <div><label class="label-field">Principio activo</label><input class="input-field" [(ngModel)]="form.principioActivo" /></div>
          <div><label class="label-field">Presentacion</label><input class="input-field" [(ngModel)]="form.presentacion" /></div>
          <div><label class="label-field">Concentracion</label><input class="input-field" [(ngModel)]="form.concentracion" placeholder="500 mg" /></div>
          <div *ngIf="!form.id"><label class="label-field">Stock inicial</label><input class="input-field" type="number" min="0" [(ngModel)]="form.stock" /></div>
          <div><label class="label-field">Stock minimo</label><input class="input-field" type="number" min="0" [(ngModel)]="form.stockMinimo" /></div>
          <div><label class="label-field">Precio (Q)</label><input class="input-field" type="number" min="0" step="0.01" [(ngModel)]="form.precio" /></div>
          <label class="flex items-center gap-2 text-sm mt-6"><input type="checkbox" [(ngModel)]="form.requiereReceta" /> Requiere receta</label>
          <!-- [Lotes] Datos del primer lote -->
          <ng-container *ngIf="!form.id && form.stock > 0">
            <div><label class="label-field">Codigo de lote</label><input class="input-field" [(ngModel)]="form.codigoLote" placeholder="Automatico si lo dejas vacio" /></div>
            <div><label class="label-field">Vence el</label><input class="input-field" type="date" [(ngModel)]="form.fechaVencimiento" [min]="hoy" /></div>
            <div><label class="label-field">Costo unitario (Q)</label><input class="input-field" type="number" min="0" step="0.01" [(ngModel)]="form.costoUnitario" /></div>
          </ng-container>
        </div>
        <p *ngIf="form.id" class="text-xs text-gray-500 mt-3">El stock no se edita aqui: usa Entrada o Ajuste para que quede registrado en el kardex.</p>
        <div class="flex gap-3 mt-5">
          <button class="btn-primary" (click)="guardar()">Guardar</button>
          <button class="btn-secondary" (click)="form = null">Cancelar</button>
        </div>
      </div>

      <!-- Entrada / ajuste de stock -->
      <div class="card mb-6" *ngIf="operacion && seleccionado">
        <h2 class="font-semibold text-gray-800 mb-1">{{ operacion === 'entrada' ? 'Entrada de mercaderia' : 'Ajuste de inventario' }}</h2>
        <p class="text-sm text-gray-500 mb-4">{{ seleccionado.nombre }} {{ seleccionado.presentacion }} {{ seleccionado.concentracion }} — stock actual {{ seleccionado.stock }}</p>
        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="label-field">{{ operacion === 'entrada' ? 'Unidades recibidas' : 'Unidades (+ suma, - resta)' }}</label>
            <input class="input-field" type="number" [(ngModel)]="cantidadOp" />
          </div>
          <div class="sm:col-span-2">
            <label class="label-field">Motivo {{ operacion === 'ajuste' ? '(obligatorio)' : '' }}</label>
            <input class="input-field" [(ngModel)]="motivoOp" [placeholder]="operacion === 'entrada' ? 'Compra a proveedor, factura #...' : 'Merma, vencimiento, conteo fisico...'" />
          </div>
          <!-- [Lotes] La entrada crea un lote nuevo -->
          <ng-container *ngIf="operacion === 'entrada'">
            <div><label class="label-field">Costo unitario (Q)</label><input class="input-field" type="number" min="0" step="0.01" [(ngModel)]="lote.costoUnitario" /></div>
            <div><label class="label-field">Vence el</label><input class="input-field" type="date" [(ngModel)]="lote.fechaVencimiento" [min]="hoy" /></div>
            <div><label class="label-field">Codigo de lote</label><input class="input-field" [(ngModel)]="lote.codigoLote" placeholder="Automatico si lo dejas vacio" /></div>
            <div class="sm:col-span-3"><label class="label-field">Proveedor</label><input class="input-field" [(ngModel)]="lote.proveedor" /></div>
          </ng-container>
          <!-- [Lotes] Un ajuste negativo puede salir de un lote especifico (ej. dar de baja un vencido) -->
          <div *ngIf="operacion === 'ajuste' && cantidadOp < 0" class="sm:col-span-3">
            <label class="label-field">Lote a descontar</label>
            <select class="input-field" [(ngModel)]="idLoteOp">
              <option [ngValue]="null">Segun el metodo {{ metodo }}</option>
              <option *ngFor="let l of lotesSeleccionado" [ngValue]="l.id">{{ l.codigo }}: {{ l.cantidadDisponible }} u., {{ l.fechaVencimiento ? 'vence ' + l.fechaVencimiento : 'sin vencimiento' }} ({{ estadoLote[l.estado].texto }})</option>
            </select>
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button class="btn-primary" (click)="aplicarOperacion()">Registrar</button>
          <button class="btn-secondary" (click)="operacion = null">Cancelar</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <input class="input-field max-w-xs" placeholder="Buscar por nombre o principio activo" [(ngModel)]="buscar" (ngModelChange)="cargar()" />
        <label class="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" [(ngModel)]="verInactivos" (ngModelChange)="cargar()" /> Mostrar desactivados
        </label>
      </div>

      <div class="card overflow-x-auto" [appListaLarga]="medicamentos.length"> <!-- [ListasLargas] -->
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b">
              <th class="py-2 pr-4">Medicamento</th>
              <th class="py-2 pr-4">Principio activo</th>
              <th class="py-2 pr-4 text-right">Stock</th>
              <th class="py-2 pr-4 text-right">Minimo</th>
              <th class="py-2 pr-4 text-right">Precio</th>
              <th class="py-2"></th>
            </tr>
          </thead>
          <tbody>
            <ng-container *ngFor="let m of medicamentos">
            <tr class="border-b last:border-0" [class.opacity-50]="!m.activo">
              <td class="py-2 pr-4">
                <p class="font-medium text-gray-800">{{ m.nombre }}</p>
                <p class="text-xs text-gray-500">{{ m.presentacion }} {{ m.concentracion }}{{ m.requiereReceta ? ' · con receta' : ' · venta libre' }}</p>
              </td>
              <td class="py-2 pr-4">{{ m.principioActivo }}</td>
              <td class="py-2 pr-4 text-right">
                <span class="font-semibold" [class.text-red-700]="m.stockBajo">{{ m.stock }}</span>
                <span *ngIf="m.stockBajo && m.activo" class="badge bg-red-100 text-red-700 ml-2">Bajo</span>
              </td>
              <td class="py-2 pr-4 text-right text-gray-500">{{ m.stockMinimo }}</td>
              <td class="py-2 pr-4 text-right">Q {{ m.precio | number: '1.2-2' }}</td>
              <td class="py-2 text-right whitespace-nowrap">
                <ng-container *ngIf="m.activo; else inactivo">
                  <button class="text-sm text-primary hover:underline mr-3" (click)="verLotes(m)" [attr.aria-expanded]="lotesAbiertos === m.id">Lotes</button>
                  <button class="text-sm text-primary hover:underline mr-3" (click)="abrirOperacion(m, 'entrada')">Entrada</button>
                  <button class="text-sm text-primary hover:underline mr-3" (click)="abrirOperacion(m, 'ajuste')">Ajuste</button>
                  <button class="text-sm text-primary hover:underline mr-3" (click)="editar(m)">Editar</button>
                  <button class="text-sm text-red-700 hover:underline" (click)="desactivar(m)">Desactivar</button>
                </ng-container>
                <ng-template #inactivo>
                  <button class="text-sm text-primary hover:underline" (click)="reactivar(m)">Reactivar</button>
                </ng-template>
              </td>
            </tr>
            <!-- [Lotes] Detalle de lotes del medicamento -->
            <tr *ngIf="lotesAbiertos === m.id" class="bg-gray-50 border-b">
              <td colspan="6" class="px-3 py-3">
                <p class="text-xs text-gray-500 mb-2">Lotes con existencia, en el orden en que ingresaron. Con {{ metodo }} sale primero el {{ metodo === 'FIFO' ? 'de arriba' : 'de abajo' }}.</p>
                <table class="w-full text-xs bg-white rounded-lg border">
                  <thead>
                    <tr class="text-left text-gray-500 border-b">
                      <th class="py-1.5 px-2">Lote</th><th class="py-1.5 px-2">Ingreso</th><th class="py-1.5 px-2">Vence</th>
                      <th class="py-1.5 px-2 text-right">Disponible</th><th class="py-1.5 px-2 text-right">Costo u.</th>
                      <th class="py-1.5 px-2 text-right">Valor</th><th class="py-1.5 px-2">Estado</th><th class="py-1.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let l of lotesSeleccionado" class="border-b last:border-0">
                      <td class="py-1.5 px-2 font-medium text-gray-800">{{ l.codigo }}<span class="block font-normal text-gray-500">{{ l.proveedor }}</span></td>
                      <td class="py-1.5 px-2">{{ l.fechaIngreso | date: 'dd/MM/yyyy' }}</td>
                      <td class="py-1.5 px-2">{{ l.fechaVencimiento ? (l.fechaVencimiento | date: 'dd/MM/yyyy') : '-' }}</td>
                      <td class="py-1.5 px-2 text-right tabular-nums">{{ l.cantidadDisponible }} / {{ l.cantidadInicial }}</td>
                      <td class="py-1.5 px-2 text-right tabular-nums">Q{{ l.costoUnitario | number: '1.2-2' }}</td>
                      <td class="py-1.5 px-2 text-right tabular-nums">Q{{ l.valor | number: '1.2-2' }}</td>
                      <td class="py-1.5 px-2"><span class="badge" [ngClass]="estadoLote[l.estado].clase">{{ estadoLote[l.estado].texto }}</span></td>
                      <td class="py-1.5 px-2 text-right">
                        <button *ngIf="l.estado === 'Vencido'" class="text-red-700 hover:underline" (click)="darDeBaja(m, l)">Dar de baja</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p *ngIf="!lotesSeleccionado.length" class="text-xs text-gray-500 py-2">Sin lotes con existencia.</p>
              </td>
            </tr>
            </ng-container>
          </tbody>
        </table>
        <p *ngIf="!medicamentos.length" class="text-gray-500 py-4">No hay medicamentos para mostrar.</p>
      </div>
    </main>
  `,
})
export class FarmaciaInventarioComponent implements OnInit {
  medicamentos: Medicamento[] = [];
  buscar = '';
  verInactivos = false;
  form: FormMedicamento | null = null;
  seleccionado: Medicamento | null = null;
  operacion: 'entrada' | 'ajuste' | null = null;
  cantidadOp = 0;
  motivoOp = '';
  error = '';
  mensaje = '';
  // [Lotes]
  readonly estadoLote = ESTADO_LOTE;
  readonly hoy = new Date().toLocaleDateString('en-CA');
  metodo: MetodoInventario = 'FIFO';
  lote: { codigoLote: string; fechaVencimiento: string; costoUnitario: number | null; proveedor: string } = { codigoLote: '', fechaVencimiento: '', costoUnitario: null, proveedor: '' };
  idLoteOp: number | null = null;
  lotesAbiertos: number | null = null;
  lotesSeleccionado: Lote[] = [];

  constructor(private api: ApiService, private avisos: NotificacionService) {}

  ngOnInit() {
    this.cargar();
    this.api.configuracion().subscribe((c) => (this.metodo = c.metodoInventario));
  }

  cambiarMetodo(m: MetodoInventario) {
    if (m === this.metodo) return;
    this.api.cambiarMetodoInventario(m).subscribe((r) => {
      this.metodo = r.metodoInventario;
      this.avisos.exito(`Metodo cambiado a ${r.metodoInventario}`);
    });
  }

  verLotes(m: Medicamento) {
    if (this.lotesAbiertos === m.id) {
      this.lotesAbiertos = null;
      return;
    }
    this.lotesAbiertos = m.id;
    this.cargarLotes(m.id);
  }

  private cargarLotes(id: number) {
    this.lotesSeleccionado = [];
    this.api.lotesMedicamento(id).subscribe((r) => (this.lotesSeleccionado = r.lotes));
  }

  darDeBaja(m: Medicamento, l: Lote) {
    if (!confirm(`Dar de baja ${l.cantidadDisponible} unidades vencidas del lote ${l.codigo}?`)) return;
    this.api.ajusteLote(m.id, { cantidad: -l.cantidadDisponible, motivo: `Baja de lote vencido ${l.codigo}`, idLote: l.id }).subscribe({
      next: () => {
        this.avisos.exito(`Lote ${l.codigo} dado de baja`);
        this.cargar();
        this.cargarLotes(m.id);
      },
      error: (e) => this.mostrarError(e, 'No se pudo dar de baja el lote'),
    });
  }

  cargar() {
    this.api.listarMedicamentos(this.buscar.trim(), this.verInactivos).subscribe((m) => (this.medicamentos = m));
  }

  private limpiarAvisos() {
    this.error = '';
    this.mensaje = '';
  }

  private mostrarError(e: any, porDefecto: string) {
    const err = e?.error;
    this.error = err?.error ?? (Array.isArray(err?.errors) ? err.errors.join(', ') : porDefecto);
  }

  nuevo() {
    this.limpiarAvisos();
    this.operacion = null;
    this.form = formVacio();
  }

  editar(m: Medicamento) {
    this.limpiarAvisos();
    this.operacion = null;
    this.form = { ...m, concentracion: m.concentracion ?? '', codigoLote: '', fechaVencimiento: '', costoUnitario: null };
  }

  guardar() {
    if (!this.form) return;
    this.limpiarAvisos();
    const { id, stock, codigoLote, fechaVencimiento, costoUnitario, ...datos } = this.form;
    // [Lotes] Los datos del lote solo se envian al crear con stock inicial
    const lote = stock > 0
      ? { codigoLote: codigoLote || undefined, fechaVencimiento: fechaVencimiento || undefined, costoUnitario: costoUnitario ?? undefined }
      : {};
    const peticion = id ? this.api.actualizarMedicamento(id, datos) : this.api.crearMedicamento({ ...datos, stock, ...lote });
    peticion.subscribe({
      next: (m) => {
        this.mensaje = `${m.nombre} guardado.`;
        this.form = null;
        this.cargar();
      },
      error: (e) => this.mostrarError(e, 'No se pudo guardar el medicamento'),
    });
  }

  abrirOperacion(m: Medicamento, tipo: 'entrada' | 'ajuste') {
    this.limpiarAvisos();
    this.form = null;
    this.seleccionado = m;
    this.operacion = tipo;
    this.cantidadOp = tipo === 'entrada' ? 10 : 0;
    this.motivoOp = '';
    this.lote = { codigoLote: '', fechaVencimiento: '', costoUnitario: null, proveedor: '' };
    this.idLoteOp = null;
    if (tipo === 'ajuste') this.api.lotesMedicamento(m.id).subscribe((r) => (this.lotesSeleccionado = r.lotes));
  }

  aplicarOperacion() {
    if (!this.seleccionado || !this.operacion) return;
    this.limpiarAvisos();
    const m = this.seleccionado;
    const peticion = this.operacion === 'entrada'
      ? this.api.entradaLote(m.id, {
          cantidad: this.cantidadOp,
          motivo: this.motivoOp || undefined,
          codigoLote: this.lote.codigoLote || undefined,
          fechaVencimiento: this.lote.fechaVencimiento || undefined,
          costoUnitario: this.lote.costoUnitario ?? undefined,
          proveedor: this.lote.proveedor || undefined,
        })
      : this.api.ajusteLote(m.id, { cantidad: this.cantidadOp, motivo: this.motivoOp, idLote: this.cantidadOp < 0 ? this.idLoteOp ?? undefined : undefined });
    peticion.subscribe({
      next: (act) => {
        this.mensaje = `${act.nombre}: stock actualizado a ${act.stock} unidades.`;
        this.operacion = null;
        this.cargar();
        if (this.lotesAbiertos === act.id) this.cargarLotes(act.id);
      },
      error: (e) => this.mostrarError(e, 'No se pudo registrar el movimiento'),
    });
  }

  desactivar(m: Medicamento) {
    if (!confirm(`Desactivar ${m.nombre}? Ya no podra recetarse, pero conserva su historial.`)) return;
    this.limpiarAvisos();
    this.api.desactivarMedicamento(m.id).subscribe({
      next: () => this.cargar(),
      error: (e) => this.mostrarError(e, 'No se pudo desactivar'),
    });
  }

  reactivar(m: Medicamento) {
    this.limpiarAvisos();
    this.api.actualizarMedicamento(m.id, { activo: true }).subscribe({
      next: () => this.cargar(),
      error: (e) => this.mostrarError(e, 'No se pudo reactivar'),
    });
  }
}
