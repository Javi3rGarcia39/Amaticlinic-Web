import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { Usuario } from '../usuarios/usuario.entity';
import { Cita } from '../citas/cita.entity';
import { DestinoEmergencia, EstadoEmergencia, NivelTriage } from '../common/enums';

// [Emergencias] Atencion sin cita: recepcion registra al paciente con su nivel de triage,
// queda en una cola y el medico pasa directo al diagnostico. Al finalizar se genera
// una cita completada (para el historial, la receta y el cobro).
@Entity({ name: 'emergencia', schema: 'citas_medicas' })
export class Emergencia {
  @PrimaryGeneratedColumn({ name: 'id_emergencia' })
  id: number;

  @ManyToOne(() => Paciente, { eager: true, nullable: false })
  @JoinColumn({ name: 'id_paciente' })
  paciente: Paciente;

  @Column({ type: 'enum', enum: NivelTriage })
  nivel: NivelTriage;

  @Column({ type: 'text' })
  motivo: string;

  // Signos vitales tomados en el triage
  @Column({ name: 'presion_arterial', length: 15, nullable: true })
  presionArterial: string | null;

  @Column({ name: 'frecuencia_cardiaca', type: 'int', nullable: true })
  frecuenciaCardiaca: number | null;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  temperatura: number | null;

  @Column({ type: 'int', nullable: true })
  saturacion: number | null;

  @Column({ type: 'enum', enum: EstadoEmergencia, default: EstadoEmergencia.EnEspera })
  estado: EstadoEmergencia;

  @CreateDateColumn({ name: 'fecha_llegada', type: 'timestamp' })
  fechaLlegada: Date;

  @ManyToOne(() => Medico, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_medico' })
  medico: Medico | null;

  @Column({ name: 'fecha_atencion', type: 'timestamp', nullable: true })
  fechaAtencion: Date | null;

  @Column({ name: 'fecha_alta', type: 'timestamp', nullable: true })
  fechaAlta: Date | null;

  @Column({ type: 'text', nullable: true })
  diagnostico: string | null;

  @Column({ type: 'text', nullable: true })
  tratamiento: string | null;

  @Column({ type: 'enum', enum: DestinoEmergencia, nullable: true })
  destino: DestinoEmergencia | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @ManyToOne(() => Cita, { nullable: true })
  @JoinColumn({ name: 'id_cita' })
  cita: Cita | null;

  @ManyToOne(() => Usuario, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_registrado_por' })
  registradoPor: Usuario | null;
}
