import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { TipoUsuario } from '../../common/enums';

export class RegistroDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @Length(1, 50)
  nombre: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @Length(1, 50)
  apellido: string;

  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @IsEmail({}, { message: 'Debe ser un correo valido' })
  @Length(1, 100)
  correo: string;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  telefono?: string;

  @IsNotEmpty({ message: 'La contrasena es obligatoria' })
  @Length(6, 100, { message: 'La contrasena debe tener entre 6 y 100 caracteres' })
  password: string;

  @IsOptional()
  @IsEnum(TipoUsuario)
  tipoUsuario?: TipoUsuario;
}
