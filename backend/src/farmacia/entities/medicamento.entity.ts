import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// [Farmacia] Catalogo de medicamentos con control de existencias
@Entity({ name: 'medicamento', schema: 'citas_medicas' })
export class Medicamento {
  @PrimaryGeneratedColumn({ name: 'id_medicamento' })
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ name: 'principio_activo', length: 100 })
  principioActivo: string;

  // Tableta, Capsula, Jarabe, Inyectable, Crema...
  @Column({ length: 50 })
  presentacion: string;

  // Ej. "500 mg", "250 mg/5 ml"
  @Column({ length: 50, nullable: true })
  concentracion: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'stock_minimo', type: 'int', default: 10 })
  stockMinimo: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  precio: number;

  @Column({ name: 'requiere_receta', default: true })
  requiereReceta: boolean;

  // Los medicamentos no se borran (tienen historial); se desactivan
  @Column({ default: true })
  activo: boolean;
}
