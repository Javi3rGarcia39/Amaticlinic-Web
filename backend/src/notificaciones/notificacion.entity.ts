import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cita } from '../citas/cita.entity';
import { TipoNotificacion } from '../common/enums';

@Entity({ name: 'notificacion', schema: 'citas_medicas' })
export class Notificacion {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  id: number;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: 'id_cita' })
  cita: Cita;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ type: 'text' })
  mensaje: string;

  @CreateDateColumn({ name: 'fecha_envio', type: 'timestamp' })
  fechaEnvio: Date;
}
