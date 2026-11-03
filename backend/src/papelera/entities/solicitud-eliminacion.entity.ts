import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Paciente } from '../../pacientes/paciente.entity';

export type EstadoSolicitud = 'Pendiente' | 'Aprobada' | 'Rechazada';

// [Eliminacion] Solicitud de un paciente para que se borren sus datos personales.
// Recepcion la aprueba (se anonimiza el paciente) o la rechaza indicando el motivo.
@Entity({ name: 'solicitud_eliminacion', schema: 'citas_medicas' })
export class SolicitudEliminacion {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  id: number;

  @ManyToOne(() => Paciente, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_paciente' })
  paciente: Paciente;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ length: 20, default: 'Pendiente' })
  estado: EstadoSolicitud;

  @CreateDateColumn({ name: 'fecha_solicitud', type: 'timestamp' })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_resolucion', type: 'timestamp', nullable: true })
  fechaResolucion: Date | null;

  @Column({ name: 'resuelto_por', type: 'varchar', length: 100, nullable: true })
  resueltoPor: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;
}
