import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Especialidad } from '../catalogos/especialidad.entity'; // [Catalogo]
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'medico', schema: 'citas_medicas' })
export class Medico extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_medico' })
  id: number;

  @OneToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  // Nombre de la especialidad (se mantiene sincronizado con el catalogo para compatibilidad)
  @Column({ length: 50 })
  especialidad: string;

  // [Catalogo] Especialidad del catalogo (define el precio de la consulta)
  @ManyToOne(() => Especialidad, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_especialidad' })
  especialidadCatalogo: Especialidad | null;

  @Column({ name: 'anos_experiencia', type: 'int', nullable: true, default: 0 })
  anosExperiencia: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ length: 50, nullable: true })
  consultorio: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  rating: number;
}
