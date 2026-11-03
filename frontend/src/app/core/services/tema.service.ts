import { Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const CLAVE = 'amaticlinic.tema';

// [ModoOscuro] Guarda y aplica el tema de la aplicacion.
// - La primera vez usa el modo del sistema operativo (prefers-color-scheme).
// - Cuando el usuario elige un tema con el boton, se recuerda en este navegador.
// - El tema se aplica poniendo o quitando la clase "dark" en <html>; los estilos estan en styles.css.
// index.html aplica la misma regla antes de que cargue Angular para que la pagina no parpadee en claro.
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly tema = signal<Tema>(this.inicial());

  constructor() {
    this.aplicar(this.tema());
    // Si el usuario aun no eligio, sigue los cambios del sistema operativo
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
      if (!this.guardado()) this.establecer(e.matches ? 'oscuro' : 'claro', false);
    });
  }

  get oscuro(): boolean {
    return this.tema() === 'oscuro';
  }

  alternar() {
    this.establecer(this.oscuro ? 'claro' : 'oscuro', true);
  }

  establecer(tema: Tema, recordar: boolean) {
    this.tema.set(tema);
    this.aplicar(tema);
    if (recordar) {
      try {
        localStorage.setItem(CLAVE, tema);
      } catch {
        // navegacion privada o almacenamiento bloqueado: el tema dura mientras la pagina este abierta
      }
    }
  }

  private aplicar(tema: Tema) {
    const html = document.documentElement;
    html.classList.toggle('dark', tema === 'oscuro');
    html.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }

  private guardado(): Tema | null {
    try {
      const v = localStorage.getItem(CLAVE);
      return v === 'oscuro' || v === 'claro' ? v : null;
    } catch {
      return null;
    }
  }

  private inicial(): Tema {
    return this.guardado() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
  }
}
