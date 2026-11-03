import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

// [Catalogo] Especialidades
export class EspecialidadDto {
  @IsNotEmpty({ message: 'El nombre de la especialidad es obligatorio' })
  @Length(2, 60)
  nombre: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @Type(() => Number) @IsNumber() @Min(0, { message: 'El precio no puede ser negativo' })
  precioConsulta: number;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

// [Seguros] Aseguradoras
export class SeguroDto {
  @IsNotEmpty({ message: 'El nombre del seguro es obligatorio' })
  @Length(2, 100)
  nombre: string;

  @Type(() => Number) @IsNumber() @Min(0) @Max(100, { message: 'El descuento no puede ser mayor a 100%' })
  descuentoConsulta: number;

  @Type(() => Number) @IsNumber() @Min(0) @Max(100, { message: 'El descuento no puede ser mayor a 100%' })
  descuentoMedicamentos: number;

  @IsOptional() @IsString() @Length(0, 20)
  telefono?: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

// [Configuracion]
export class MetodoInventarioDto {
  @IsIn(['FIFO', 'LIFO'], { message: 'El metodo debe ser FIFO o LIFO' })
  metodo: 'FIFO' | 'LIFO';
}

export class PrecioEmergenciaDto {
  @Type(() => Number) @IsNumber() @Min(0)
  precio: number;
}
