import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'error' | 'exito' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

// [Interceptores] Avisos flotantes (toasts) que muestran los interceptores y las pantallas
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  readonly avisos = signal<Aviso[]>([]);
  private siguiente = 1;

  mostrar(mensaje: string, tipo: TipoAviso = 'info', duracionMs = 5000) {
    // Evita repetir el mismo aviso si llegan varios errores iguales al mismo tiempo
    if (this.avisos().some((a) => a.mensaje === mensaje)) return;
    const aviso = { id: this.siguiente++, tipo, mensaje };
    this.avisos.update((lista) => [...lista, aviso].slice(-4));
    if (duracionMs > 0) setTimeout(() => this.cerrar(aviso.id), duracionMs);
  }

  error(mensaje: string) {
    this.mostrar(mensaje, 'error', 7000);
  }

  exito(mensaje: string) {
    this.mostrar(mensaje, 'exito', 4000);
  }

  cerrar(id: number) {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }
}
