// [Farmacia] Tipos de movimiento del kardex de inventario
export enum TipoMovimiento {
  Entrada = 'Entrada', // ingreso de mercaderia
  Salida = 'Salida',   // despacho de receta
  Ajuste = 'Ajuste',   // correccion manual (merma, conteo fisico, vencimiento)
}
