import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Length, Max, Min, ValidateNested,
} from 'class-validator';

// [Farmacia] DTOs de la receta electronica

export class DetalleRecetaDto {
  @Type(() => Number) @IsInt({ message: 'idMedicamento debe ser un numero entero' })
  idMedicamento: number;

  @IsNotEmpty({ message: 'La dosis es obligatoria' }) @Length(1, 100)
  dosis: string;

  @IsNotEmpty({ message: 'La frecuencia es obligatoria' }) @Length(1, 100)
  frecuencia: string;

  @Type(() => Number) @IsInt() @Min(1, { message: 'La duracion debe ser de al menos 1 dia' }) @Max(365)
  duracionDias: number;

  @Type(() => Number) @IsInt() @Min(1, { message: 'La cantidad debe ser mayor a 0' })
  cantidad: number;

  @IsOptional() @IsString()
  indicaciones?: string;
}

export class CreateRecetaDto {
  @Type(() => Number) @IsInt({ message: 'idCita debe ser un numero entero' })
  idCita: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'La receta debe incluir al menos un medicamento' })
  @ValidateNested({ each: true })
  @Type(() => DetalleRecetaDto)
  detalles: DetalleRecetaDto[];

  @IsOptional() @IsString()
  indicacionesGenerales?: string;

  // El medico confirma explicitamente que conoce la alerta de alergia y aun asi receta
  @IsOptional() @IsBoolean()
  confirmarAlergias?: boolean;
}

export class VerificarAlergiasDto {
  @Type(() => Number) @IsInt()
  idPaciente: number;

  @IsArray() @Type(() => Number) @IsInt({ each: true })
  idsMedicamento: number[];
}

export class ItemDespachoDto {
  @Type(() => Number) @IsInt()
  idDetalle: number;

  @Type(() => Number) @IsInt() @Min(1, { message: 'La cantidad a despachar debe ser mayor a 0' })
  cantidad: number;
}

export class DespacharRecetaDto {
  // Si no se envian items, se despacha todo lo pendiente que tenga stock
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemDespachoDto)
  items?: ItemDespachoDto[];
}

export class AnularRecetaDto {
  @IsOptional() @IsString()
  motivo?: string;
}
