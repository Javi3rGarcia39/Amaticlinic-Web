// [Farmacia] Utilidades compartidas por los servicios de farmacia

/** Fecha local en formato YYYY-MM-DD (evita el desfase de toISOString con la zona horaria de Guatemala). */
export function fechaLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Minusculas y sin tildes, para comparar textos escritos a mano (alergias). */
export function normalizar(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Familias de medicamentos con reaccion cruzada conocida: si el paciente es alergico al grupo,
// cualquier principio activo del grupo dispara la alerta.
const FAMILIAS: Record<string, string[]> = {
  penicilina: ['penicilina', 'amoxicilina', 'ampicilina', 'dicloxacilina', 'oxacilina'],
  cefalosporina: ['cefalexina', 'cefuroxima', 'ceftriaxona', 'cefadroxilo', 'cefixima'],
  sulfa: ['sulfametoxazol', 'sulfadiazina'],
  aine: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'ketorolaco', 'acido acetilsalicilico', 'aspirina', 'meloxicam'],
  antiinflamatorio: ['ibuprofeno', 'naproxeno', 'diclofenaco', 'ketorolaco', 'acido acetilsalicilico', 'aspirina', 'meloxicam'],
};

const SIN_ALERGIAS = /^(ningun|ninguna|ninguno|no |no$|sin |nada|n\/a|na$|negad)/;

export interface AlertaAlergia {
  idMedicamento: number;
  medicamento: string;
  principioActivo: string;
  alergeno: string;
}

/**
 * Compara las alergias registradas del paciente (texto libre) contra el principio activo y el nombre
 * de cada medicamento, incluyendo familias con reaccion cruzada (ej. penicilina -> amoxicilina).
 */
export function detectarAlergias(
  alergiasPaciente: string,
  medicamentos: { id: number; nombre: string; principioActivo: string }[],
): AlertaAlergia[] {
  const tokens = normalizar(alergiasPaciente)
    .split(/[,;\n/]| y /)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !SIN_ALERGIAS.test(t));

  const alertas: AlertaAlergia[] = [];
  for (const med of medicamentos) {
    const activo = normalizar(med.principioActivo);
    const texto = `${activo} ${normalizar(med.nombre)}`;
    for (const token of tokens) {
      const raiz = token.replace(/s$/, ''); // "penicilinas" -> "penicilina"
      const familia = Object.entries(FAMILIAS).find(([clave]) => raiz.includes(clave))?.[1] ?? [];
      const coincide =
        texto.includes(raiz) ||
        (activo.length >= 4 && raiz.includes(activo)) ||
        familia.some((f) => texto.includes(f));
      if (coincide) {
        alertas.push({ idMedicamento: med.id, medicamento: med.nombre, principioActivo: med.principioActivo, alergeno: token });
        break;
      }
    }
  }
  return alertas;
}
