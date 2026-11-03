import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Receta } from './receta.entity';
import { Medicamento } from './medicamento.entity';

// [Farmacia] Cada medicamento recetado, con su posologia y lo despachado hasta ahora
@Entity({ name: 'detalle_receta', schema: 'citas_medicas' })
export class DetalleReceta {
  @PrimaryGeneratedColumn({ name: 'id_detalle' })
  id: number;

  @ManyToOne(() => Receta, (r) => r.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_receta' })
  receta: Receta;

  @ManyToOne(() => Medicamento, { eager: true })
  @JoinColumn({ name: 'id_medicamento' })
  medicamento: Medicamento;

  // Ej. "1 tableta"
  @Column({ length: 100 })
  dosis: string;

  // Ej. "cada 8 horas"
  @Column({ length: 100 })
  frecuencia: string;

  @Column({ name: 'duracion_dias', type: 'int' })
  duracionDias: number;

  // Unidades a entregar (tabletas, frascos...)
  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'cantidad_despachada', type: 'int', default: 0 })
  cantidadDespachada: number;

  @Column({ type: 'text', nullable: true })
  indicaciones: string;
}
