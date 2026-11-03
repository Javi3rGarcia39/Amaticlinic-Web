import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Medicamento } from './medicamento.entity';
import { Receta } from './receta.entity';
import { LoteMedicamento } from './lote-medicamento.entity'; // [Lotes]
import { Usuario } from '../../usuarios/usuario.entity';
import { TipoMovimiento } from '../../common/enums';

// [Farmacia] Kardex: cada entrada, salida o ajuste de inventario queda registrado con su responsable
@Entity({ name: 'movimiento_inventario', schema: 'citas_medicas' })
export class MovimientoInventario {
  @PrimaryGeneratedColumn({ name: 'id_movimiento' })
  id: number;

  @ManyToOne(() => Medicamento, { eager: true })
  @JoinColumn({ name: 'id_medicamento' })
  medicamento: Medicamento;

  @Column({ type: 'enum', enum: TipoMovimiento })
  tipo: TipoMovimiento;

  // Positiva en entradas, negativa en salidas; en ajustes puede ser cualquiera
  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'stock_resultante', type: 'int' })
  stockResultante: number;

  @Column({ type: 'text', nullable: true })
  motivo: string;

  // Solo en salidas por despacho
  @ManyToOne(() => Receta, { nullable: true })
  @JoinColumn({ name: 'id_receta' })
  receta: Receta;

  @ManyToOne(() => Usuario, { eager: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @CreateDateColumn({ type: 'timestamp' })
  fecha: Date;

  // [Lotes] Lote afectado y su costo unitario (permite valuar el inventario y el costo de ventas)
  @ManyToOne(() => LoteMedicamento, { nullable: true })
  @JoinColumn({ name: 'id_lote' })
  lote: LoteMedicamento | null;

  @Column({ name: 'costo_unitario', type: 'numeric', precision: 10, scale: 2, nullable: true })
  costoUnitario: number | null;

  // [Seguros] En salidas por despacho: precio de venta, % de descuento del seguro y monto cobrado
  @Column({ name: 'precio_unitario', type: 'numeric', precision: 10, scale: 2, nullable: true })
  precioUnitario: number | null;

  @Column({ name: 'descuento_porcentaje', type: 'numeric', precision: 5, scale: 2, default: 0 })
  descuentoPorcentaje: number;

  @Column({ name: 'monto_venta', type: 'numeric', precision: 10, scale: 2, nullable: true })
  montoVenta: number | null;
}
