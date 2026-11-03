import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @IsEmail({}, { message: 'Debe ser un correo valido' })
  correo: string;

  @IsNotEmpty({ message: 'La contrasena es obligatoria' })
  password: string;
}
