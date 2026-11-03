// [Mejoras] Utilidades de fecha y hora en hora LOCAL del servidor (Guatemala).
// toISOString() usa UTC y despues de las 6 pm devuelve el dia siguiente; por eso se evita.

import { DiaSemana } from '../enums';

export const DIAS_SEMANA: DiaSemana[] = [
  DiaSemana.Domingo, DiaSemana.Lunes, DiaSemana.Martes, DiaSemana.Miercoles,
  DiaSemana.Jueves, DiaSemana.Viernes, DiaSemana.Sabado,
];

/** YYYY-MM-DD en hora local */
export function fechaLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Convierte YYYY-MM-DD a Date local (medianoche) */
export function desdeFecha(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = desdeFecha(fecha);
  d.setDate(d.getDate() + dias);
  return fechaLocal(d);
}

export function diaSemanaDe(fecha: string): DiaSemana {
  return DIAS_SEMANA[desdeFecha(fecha).getDay()];
}

/** 'HH:mm[:ss]' -> minutos desde medianoche */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** minutos -> 'HH:mm' */
export function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

/** Hora local actual 'HH:mm' */
export function horaLocal(d: Date = new Date()): string {
  return aHora(d.getHours() * 60 + d.getMinutes());
}

/** Redondea a 2 decimales (montos en quetzales) */
export function redondear(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
