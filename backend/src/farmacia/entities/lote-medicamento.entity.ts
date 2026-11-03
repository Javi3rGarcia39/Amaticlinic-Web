import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicamento } from './medicamento.entity';

// [Lotes] Cada ingreso de mercaderia es un lote con su costo y fecha de vencimiento.
// El stock del medicamento siempre es la suma de cantidad_disponible de sus lotes.
// Al despachar, los lotes se consumen en orden FIFO o LIFO segun la configuracion.
@Entity({ name: 'lote_medicamento', schema: 'citas_medicas' })
export class LoteMedicamento {
  @PrimaryGeneratedColumn({ name: 'id_lote' })
  id: number;

  @ManyToOne(() => Medicamento, { nullable: false })
  @JoinColumn({ name: 'id_medicamento' })
  medicamento: Medicamento;

  @Column({ length: 40 })
  codigo: string;

  @Column({ name: 'fecha_ingreso', type: 'timestamp', default: () => 'now()' })
  fechaIngreso: Date;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string | null;

  @Column({ name: 'costo_unitario', type: 'numeric', precision: 10, scale: 2, default: 0 })
  costoUnitario: number;

  @Column({ name: 'cantidad_inicial', type: 'int' })
  cantidadInicial: number;

  @Column({ name: 'cantidad_disponible', type: 'int' })
  cantidadDisponible: number;

  @Column({ length: 100, nullable: true })
  proveedor: string | null;
}
