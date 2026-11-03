// [Eliminacion] Confirmacion comun para los botones "Eliminar".
// Nada se borra de la base al eliminar: el registro va a la Papelera (Recepcion > Papelera) y se puede restaurar.
// Devuelve el motivo escrito (puede ser vacio) o null si el usuario cancela.
export function pedirMotivo(que: string): string | null {
  const r = window.prompt(
    `${que}\n\nNo se borra de la base de datos: se mueve a la Papelera y se puede restaurar.\n\nMotivo (opcional):`,
    '',
  );
  return r === null ? null : r.trim();
}
