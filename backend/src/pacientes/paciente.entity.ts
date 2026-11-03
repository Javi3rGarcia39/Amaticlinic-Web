import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';
import { Seguro } from '../catalogos/seguro.entity'; // [Seguros]
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

@Entity({ name: 'paciente', schema: 'citas_medicas' })
export class Paciente extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_paciente' })
  id: number;

  @OneToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'documento_identidad', length: 50, nullable: true })
  documentoIdentidad: string;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento: string;

  @Column({ length: 20, nullable: true })
  telefono: string;

  @Column({ length: 100, nullable: true })
  correo: string;

  @Column({ length: 150, nullable: true })
  direccion: string;

  @Column({ name: 'tipo_sangre', length: 10, nullable: true })
  tipoSangre: string;

  @Column({ type: 'text', nullable: true })
  alergias: string;

  @Column({ name: 'contacto_emergencia_nombre', length: 100, nullable: true })
  contactoEmergenciaNombre: string;

  @Column({ name: 'contacto_emergencia_telefono', length: 20, nullable: true })
  contactoEmergenciaTelefono: string;

  // [Seguros] Seguro medico del paciente (opcional) y numero de poliza
  @ManyToOne(() => Seguro, { eager: true, nullable: true })
  @JoinColumn({ name: 'id_seguro' })
  seguro: Seguro | null;

  @Column({ name: 'numero_poliza', length: 50, nullable: true })
  numeroPoliza: string | null;

  // [Eliminacion] true cuando se borraron sus datos personales por solicitud (se conservan historial y recetas)
  @Column({ default: false })
  anonimizado: boolean;
}
