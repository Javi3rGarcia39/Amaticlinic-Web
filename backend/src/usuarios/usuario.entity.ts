import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoUsuario } from '../common/enums';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'usuario', schema: 'citas_medicas' })
export class Usuario extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  id: number;

  @Column({ length: 50 })
  nombre: string;

  @Column({ length: 50 })
  apellido: string;

  @Column({ length: 100, unique: true })
  correo: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100 })
  password: string;

  @Column({ name: 'tipo_usuario', type: 'enum', enum: TipoUsuario })
  tipoUsuario: TipoUsuario;
}
