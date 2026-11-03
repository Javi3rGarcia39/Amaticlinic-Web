import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { TipoUsuario } from '../../common/enums';

export class CreateUsuarioDto {
  @IsNotEmpty() @Length(1, 50)
  nombre: string;

  @IsNotEmpty() @Length(1, 50)
  apellido: string;

  @IsNotEmpty() @IsEmail() @Length(1, 100)
  correo: string;

  @IsOptional() @IsString() @Length(0, 20)
  telefono?: string;

  @IsNotEmpty()
  password: string;

  @IsOptional() @IsEnum(TipoUsuario)
  rol?: TipoUsuario;
}
