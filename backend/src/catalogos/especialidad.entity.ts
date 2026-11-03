import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

// [Catalogo] Especialidades medicas con su precio de consulta.
// Antes la especialidad era texto libre en "medico"; ahora el medico apunta a este catalogo.
@Entity({ name: 'especialidad', schema: 'citas_medicas' })
export class Especialidad extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_especialidad' })
  id: number;

  @Column({ length: 60, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'precio_consulta', type: 'numeric', precision: 10, scale: 2, default: 0 })
  precioConsulta: number;

  @Column({ default: true })
  activo: boolean;
}
