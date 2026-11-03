import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHistorialDto {
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  @IsInt()
  idPaciente: number;

  @IsNotEmpty({ message: 'El ID del medico es obligatorio' })
  @IsInt()
  idMedico: number;

  @IsNotEmpty({ message: 'El diagnostico es obligatorio' })
  @IsString()
  diagnostico: string;

  @IsOptional() @IsString()
  tratamiento?: string;
}
