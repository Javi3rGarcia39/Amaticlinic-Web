import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medico } from '../medicos/medico.entity';
import { DiaSemana } from '../common/enums';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'horario', schema: 'citas_medicas' })
export class Horario extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_horario' })
  id: number;

  @ManyToOne(() => Medico, { eager: true })
  @JoinColumn({ name: 'id_medico' })
  medico: Medico;

  @Column({ name: 'dia_semana', type: 'enum', enum: DiaSemana })
  diaSemana: DiaSemana;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;
}
