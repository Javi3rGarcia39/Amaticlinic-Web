import { Directive, Input } from '@angular/core';

// [ListasLargas] Cuando una tabla tiene mas de 20 registros, su contenedor queda con una altura
// maxima y una barra de desplazamiento propia; el encabezado de la tabla se queda fijo arriba.
// Con 20 registros o menos la tabla se ve completa, como antes.
// Uso: <div class="card overflow-x-auto" [appListaLarga]="citas.length"> <table>...</table> </div>
// Los estilos (.lista-larga) estan en styles.css.
@Directive({
  selector: '[appListaLarga]',
  standalone: true,
  host: {
    '[class.lista-larga]': 'activa',
    // Con barra propia, el contenedor se puede enfocar para desplazarlo con el teclado
    '[attr.tabindex]': 'activa ? 0 : null',
    '[attr.role]': 'activa ? "region" : null',
    '[attr.aria-label]': 'activa ? "Lista con " + cantidad + " registros, desplazable" : null',
  },
})
export class ListaLargaDirective {
  @Input('appListaLarga') cantidad = 0;
  @Input() limite = 20;

  get activa(): boolean {
    return this.cantidad > this.limite;
  }
}
