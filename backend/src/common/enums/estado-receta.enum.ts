// [Farmacia] Ciclo de vida de una receta electronica
export enum EstadoReceta {
  Emitida = 'Emitida',       // creada por el medico, sin despachar
  Parcial = 'Parcial',       // se despacho una parte (faltaba stock)
  Despachada = 'Despachada', // entregada por completo
  Anulada = 'Anulada',       // anulada por el medico antes de despachar
}
