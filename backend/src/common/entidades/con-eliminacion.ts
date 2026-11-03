import { Column, IsNull } from 'typeorm';

// [Eliminacion] Borrado logico. Por regla de la clinica nada se borra de la base al pulsar "Eliminar":
// el registro se marca con la fecha, quien lo hizo y el motivo, deja de verse en las pantallas y
// queda en la Papelera (Recepcion > Papelera), desde donde se puede restaurar.
// Solo se borra definitivamente cuando alguien lo solicita (ver src/papelera).
export abstract class ConEliminacion {
  @Column({ name: 'eliminado_en', type: 'timestamp', nullable: true })
  eliminadoEn: Date | null;

  @Column({ name: 'eliminado_por', type: 'varchar', length: 100, nullable: true })
  eliminadoPor: string | null;

  @Column({ name: 'motivo_eliminacion', type: 'text', nullable: true })
  motivoEliminacion: string | null;
}

/** Condicion para consultar solo registros que no estan en la papelera */
export const NO_ELIMINADO = { eliminadoEn: IsNull() };
