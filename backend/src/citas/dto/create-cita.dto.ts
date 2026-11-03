import { IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCitaDto {
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  @IsInt()
  idPaciente: number;

  @IsNotEmpty({ message: 'El ID del medico es obligatorio' })
  @IsInt()
  idMedico: number;

  @IsNotEmpty({ message: 'El ID del horario es obligatorio' })
  @IsInt()
  idHorario: number;

  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  @Matches(FECHA_REGEX, { message: 'fecha debe tener formato YYYY-MM-DD' })
  fecha: string;

  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio: string;

  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin: string;

  @IsOptional() @IsString()
  motivoConsulta?: string;
}
