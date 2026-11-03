import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional() @IsString() @Length(0, 50)
  nombre?: string;

  @IsOptional() @IsString() @Length(0, 50)
  apellido?: string;

  @IsOptional() @IsEmail() @Length(0, 100)
  correo?: string;

  @IsOptional() @IsString() @Length(0, 20)
  telefono?: string;

  @IsOptional() @Length(6, 100)
  password?: string;
}
