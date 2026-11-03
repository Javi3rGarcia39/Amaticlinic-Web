import { Type } from 'class-transformer';
import {
  IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested,
} from 'class-validator';
import { DestinoEmergencia, NivelTriage } from '../../common/enums';

// [Emergencias] Registro rapido de un paciente que no tiene cuenta
export class PacienteNuevoDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' }) @Length(1, 50)
  nombre: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' }) @Length(1, 50)
  apellido: string;

  @IsOptional() @IsString() @Length(0, 50)
  documentoIdentidad?: string;

  @IsOptional() @IsString() @Length(0, 20)
  telefono?: string;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fechaNacimiento debe tener formato YYYY-MM-DD' })
  fechaNacimiento?: string;

  @IsOptional() @IsString()
  alergias?: string;

  @IsOptional() @IsString() @Length(0, 100)
  contactoEmergenciaNombre?: string;

  @IsOptional() @IsString() @Length(0, 20)
  contactoEmergenciaTelefono?: string;
}

export class RegistrarEmergenciaDto {
  // Paciente existente o, si no tiene cuenta, sus datos basicos
  @IsOptional() @Type(() => Number) @IsInt()
  idPaciente?: number;

  @IsOptional() @ValidateNested() @Type(() => PacienteNuevoDto)
  pacienteNuevo?: PacienteNuevoDto;

  @IsEnum(NivelTriage, { message: 'El nivel debe ser Rojo, Naranja, Amarillo o Verde' })
  nivel: NivelTriage;

  @IsNotEmpty({ message: 'El motivo de la emergencia es obligatorio' }) @IsString()
  motivo: string;

  @IsOptional() @Matches(/^\d{2,3}\/\d{2,3}$/, { message: 'La presion debe tener formato 120/80' })
  presionArterial?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(250)
  frecuenciaCardiaca?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(30) @Max(45)
  temperatura?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(40) @Max(100)
  saturacion?: number;
}

export class CambiarNivelDto {
  @IsEnum(NivelTriage)
  nivel: NivelTriage;
}

export class AtenderEmergenciaDto {
  @IsNotEmpty({ message: 'El diagnostico es obligatorio' }) @IsString()
  diagnostico: string;

  @IsOptional() @IsString()
  tratamiento?: string;

  @IsEnum(DestinoEmergencia, { message: 'El destino debe ser Alta, Observacion o Referido' })
  destino: DestinoEmergencia;

  @IsOptional() @IsString()
  observaciones?: string;
}

export class RetirarEmergenciaDto {
  @IsOptional() @IsString()
  motivo?: string;
}
