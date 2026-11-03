import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ConEliminacion } from '../common/entidades/con-eliminacion'; // [Eliminacion]

// [Seguros] Aseguradoras con convenio: cada una define un % de descuento en consultas y otro en medicamentos
@Entity({ name: 'seguro', schema: 'citas_medicas' })
export class Seguro extends ConEliminacion { // [Eliminacion] borrado logico
  @PrimaryGeneratedColumn({ name: 'id_seguro' })
  id: number;

  @Column({ length: 100, unique: true })
  nombre: string;

  @Column({ name: 'descuento_consulta', type: 'numeric', precision: 5, scale: 2, default: 0 })
  descuentoConsulta: number;

  @Column({ name: 'descuento_medicamentos', type: 'numeric', precision: 5, scale: 2, default: 0 })
  descuentoMedicamentos: number;

  @Column({ length: 20, nullable: true })
  telefono: string | null;

  @Column({ default: true })
  activo: boolean;
}
