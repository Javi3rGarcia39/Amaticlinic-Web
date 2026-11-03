import { Column, Entity, PrimaryColumn } from 'typeorm';

// [Configuracion] Parametros generales de la clinica (clave / valor)
//   metodo_inventario  -> FIFO | LIFO  (orden en que salen los lotes de farmacia)
//   precio_emergencia  -> costo de la atencion de emergencia
@Entity({ name: 'configuracion', schema: 'citas_medicas' })
export class Configuracion {
  @PrimaryColumn({ length: 50 })
  clave: string;

  @Column({ length: 200 })
  valor: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;
}

export const CONFIG_METODO_INVENTARIO = 'metodo_inventario';
export const CONFIG_PRECIO_EMERGENCIA = 'precio_emergencia';

export const CONFIG_POR_DEFECTO: Record<string, { valor: string; descripcion: string }> = {
  [CONFIG_METODO_INVENTARIO]: { valor: 'FIFO', descripcion: 'Orden de salida de los lotes: FIFO (primero en entrar, primero en salir) o LIFO (ultimo en entrar, primero en salir)' },
  [CONFIG_PRECIO_EMERGENCIA]: { valor: '350', descripcion: 'Costo de la atencion de emergencia en quetzales' },
};
