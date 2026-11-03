import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// [Eliminacion]
export class EliminarDefinitivoDto {
  @IsString()
  @IsNotEmpty({ message: 'Indica quien solicito la eliminacion definitiva' })
  @MaxLength(150)
  solicitadoPor: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class CrearSolicitudDto {
  @IsString()
  @IsNotEmpty({ message: 'Cuentanos brevemente el motivo de tu solicitud' })
  @MaxLength(1000)
  motivo: string;
}

export class ResolverSolicitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}
