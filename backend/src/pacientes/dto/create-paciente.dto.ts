import { IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreatePacienteDto {
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  @IsInt()
  idUsuario: number;

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
}
