import { IsEnum, IsInt, IsNotEmpty, Matches } from 'class-validator';
import { DiaSemana } from '../../common/enums';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export class CreateHorarioDto {
  @IsNotEmpty({ message: 'El ID del medico es obligatorio' })
  @IsInt()
  idMedico: number;

  @IsNotEmpty({ message: 'El dia de la semana es obligatorio' })
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  @IsNotEmpty({ message: 'La hora de inicio es obligatoria' })
  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio: string;

  @IsNotEmpty({ message: 'La hora de fin es obligatoria' })
  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin: string;
}
