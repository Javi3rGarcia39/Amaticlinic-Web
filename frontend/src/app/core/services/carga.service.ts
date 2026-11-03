import { Injectable, computed, signal } from '@angular/core';

// [Interceptores] Cuenta las peticiones HTTP en curso para mostrar la barra de carga
@Injectable({ providedIn: 'root' })
export class CargaService {
  private pendientes = signal(0);
  readonly activa = computed(() => this.pendientes() > 0);

  iniciar() {
    this.pendientes.update((n) => n + 1);
  }

  terminar() {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
