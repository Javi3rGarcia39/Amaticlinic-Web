import { IsInt, IsOptional, IsString, Length, ValidateIf } from 'class-validator';

export class UpdatePacienteDto {
  @IsOptional() @IsString() @Length(0, 50)
  documentoIdentidad?: string;

  @IsOptional() @IsString()
  fechaNacimiento?: string;

  @IsOptional() @IsString() @Length(0, 20)
  telefono?: string;

  @IsOptional() @IsString() @Length(0, 100)
  correo?: string;

  @IsOptional() @IsString() @Length(0, 150)
  direccion?: string;

  @IsOptional() @IsString() @Length(0, 10)
  tipoSangre?: string;

  @IsOptional() @IsString()
  alergias?: string;

  @IsOptional() @IsString() @Length(0, 100)
  contactoEmergenciaNombre?: string;

  @IsOptional() @IsString() @Length(0, 20)
  contactoEmergenciaTelefono?: string;

  // [Seguros] id del seguro; null quita el seguro del paciente
  @ValidateIf((o) => o.idSeguro !== null && o.idSeguro !== undefined)
  @IsInt()
  idSeguro?: number | null;

  @IsOptional() @IsString() @Length(0, 50)
  numeroPoliza?: string;
}
