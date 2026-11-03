import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// [Eliminacion] Bitacora: quien elimino, restauro o borro definitivamente cada registro, cuando y por que.
// No guarda nombres de pacientes en las citas o el historial (solo el numero de paciente) y,
// si un paciente se anonimiza, su nombre tambien se borra de aqui.
@Entity({ name: 'registro_eliminacion', schema: 'citas_medicas' })
export class RegistroEliminacion {
  @PrimaryGeneratedColumn({ name: 'id_registro' })
  id: number;

  @Column({ length: 20 })
  tipo: string;

  @Column({ name: 'id_elemento', type: 'int' })
  idElemento: number;

  @Column({ length: 255 })
  descripcion: string;

  // Eliminado | Restaurado | Eliminado definitivamente | Anonimizado | Solicitud rechazada
  @Column({ length: 30 })
  accion: string;

  @Column({ length: 100 })
  usuario: string;

  @Column({ name: 'solicitado_por', type: 'varchar', length: 150, nullable: true })
  solicitadoPor: string | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;
}
