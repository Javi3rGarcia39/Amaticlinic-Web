import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Paciente } from '../pacientes/paciente.entity';
import { Medico } from '../medicos/medico.entity';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'historial_medico', schema: 'citas_medicas' })
export class HistorialMedico extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_historial' })
  id: number;

  @ManyToOne(() => Paciente, { eager: true })
  @JoinColumn({ name: 'id_paciente' })
  paciente: Paciente;

  @ManyToOne(() => Medico, { eager: true })
  @JoinColumn({ name: 'id_medico' })
  medico: Medico;

  @Column({ type: 'text' })
  diagnostico: string;

  @Column({ type: 'text', nullable: true })
  tratamiento: string;

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;
}
