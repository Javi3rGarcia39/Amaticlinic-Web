import { IsOptional, IsString } from 'class-validator';

export class UpdateHistorialDto {
  @IsOptional() @IsString()
  diagnostico?: string;

  @IsOptional() @IsString()
  tratamiento?: string;
}
