import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { Horario } from '../horarios/horario.entity';
import { EstadoCita } from '../common/enums';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'cita', schema: 'citas_medicas' })
export class Cita extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_cita' })
  id: number;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'id_paciente' })
  paciente: Paciente;

  @ManyToOne(() => Medico, { eager: true })
  @JoinColumn({ name: 'id_medico' })
  medico: Medico;

  @ManyToOne(() => Horario, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_horario' })
  horario: Horario | null;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ type: 'enum', enum: EstadoCita, default: EstadoCita.Agendada })
  estado: EstadoCita;

  @Column({ name: 'motivo_consulta', type: 'text', nullable: true })
  motivoConsulta: string;

  // [Emergencias] Las atenciones de emergencia generan una cita sin horario
  @Column({ name: 'es_emergencia', default: false })
  esEmergencia: boolean;

  // [Seguros] Costo de la consulta y descuento del seguro (se calculan al agendar)
  @Column({ name: 'costo_consulta', type: 'numeric', precision: 10, scale: 2, nullable: true })
  costoConsulta: number | null;

  @Column({ name: 'porcentaje_descuento', type: 'numeric', precision: 5, scale: 2, default: 0 })
  porcentajeDescuento: number;

  @Column({ name: 'monto_descuento', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montoDescuento: number;

  @Column({ name: 'total_pagar', type: 'numeric', precision: 10, scale: 2, nullable: true })
  totalPagar: number | null;

  @Column({ name: 'seguro_aplicado', length: 100, nullable: true })
  seguroAplicado: string | null;
}
