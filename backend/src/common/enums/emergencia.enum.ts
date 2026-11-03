// [Emergencias] Nivel de triage (escala de colores tipo Manchester, simplificada)
export enum NivelTriage {
  Rojo = 'Rojo',         // inmediato
  Naranja = 'Naranja',   // muy urgente (10 min)
  Amarillo = 'Amarillo', // urgente (60 min)
  Verde = 'Verde',       // menos urgente (120 min)
}

export const PRIORIDAD_TRIAGE: Record<NivelTriage, number> = {
  [NivelTriage.Rojo]: 1,
  [NivelTriage.Naranja]: 2,
  [NivelTriage.Amarillo]: 3,
  [NivelTriage.Verde]: 4,
};

export const ETIQUETA_TRIAGE: Record<NivelTriage, string> = {
  [NivelTriage.Rojo]: 'Inmediato',
  [NivelTriage.Naranja]: 'Muy urgente',
  [NivelTriage.Amarillo]: 'Urgente',
  [NivelTriage.Verde]: 'Menos urgente',
};

// Tiempo maximo de espera recomendado por nivel (minutos)
export const ESPERA_MAXIMA_TRIAGE: Record<NivelTriage, number> = {
  [NivelTriage.Rojo]: 0,
  [NivelTriage.Naranja]: 10,
  [NivelTriage.Amarillo]: 60,
  [NivelTriage.Verde]: 120,
};

export enum EstadoEmergencia {
  EnEspera = 'EnEspera',
  EnAtencion = 'EnAtencion',
  Atendida = 'Atendida',
  Retirada = 'Retirada', // el paciente se fue antes de ser atendido
}

export enum DestinoEmergencia {
  Alta = 'Alta',
  Observacion = 'Observacion',
  Referido = 'Referido',
}
