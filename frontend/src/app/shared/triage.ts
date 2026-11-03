import { NivelTriage } from '../core/models/models';

// [Emergencias] Colores y textos de los niveles de triage (se usan en recepcion, medico y paneles)
export const NIVELES: { nivel: NivelTriage; etiqueta: string; tiempo: string }[] = [
  { nivel: 'Rojo', etiqueta: 'Inmediato', tiempo: 'Riesgo para la vida' },
  { nivel: 'Naranja', etiqueta: 'Muy urgente', tiempo: 'Antes de 10 min' },
  { nivel: 'Amarillo', etiqueta: 'Urgente', tiempo: 'Antes de 1 hora' },
  { nivel: 'Verde', etiqueta: 'Menos urgente', tiempo: 'Antes de 2 horas' },
];

/** Barra / fondo solido del nivel */
export function colorNivel(n: NivelTriage): string {
  return { Rojo: 'bg-red-600', Naranja: 'bg-orange-500', Amarillo: 'bg-yellow-400', Verde: 'bg-green-500' }[n];
}

/** Etiqueta suave del nivel (texto oscuro sobre fondo claro, siempre legible) */
export function etiquetaNivel(n: NivelTriage): string {
  return {
    Rojo: 'bg-red-50 text-red-800 border-red-200',
    Naranja: 'bg-orange-50 text-orange-800 border-orange-200',
    Amarillo: 'bg-yellow-50 text-yellow-900 border-yellow-300',
    Verde: 'bg-green-50 text-green-800 border-green-200',
  }[n];
}

export function textoEspera(min: number): string {
  if (min < 1) return 'recien llegado';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}

export const ESTADOS_EMERGENCIA: Record<string, string> = {
  EnEspera: 'En espera',
  EnAtencion: 'En atencion',
  Atendida: 'Atendida',
  Retirada: 'Se retiro',
};
