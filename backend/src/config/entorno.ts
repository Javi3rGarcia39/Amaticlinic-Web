import { Logger } from '@nestjs/common';

// [Despliegue] Diferencias entre desarrollo (tu computadora + Docker) y produccion (Vercel + Neon).
// Todo se controla con variables de entorno: el codigo es el mismo en los dos entornos.
//   Desarrollo: backend/.env            (ver .env.example)
//   Produccion: variables en Vercel     (ver .env.production.example)

/** true en Vercel (produccion y vistas previas) o si NODE_ENV=production */
export const ES_PRODUCCION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

/**
 * Origenes que pueden llamar al API, separados por coma en CORS_ORIGINS.
 * Se permite * para las direcciones de vista previa de Vercel, por ejemplo:
 *   CORS_ORIGINS=https://amaticlinic.vercel.app,https://amaticlinic-*.vercel.app
 */
export function origenesCors(): (string | RegExp)[] {
  const valor = process.env.CORS_ORIGINS || 'http://localhost:4200';
  return valor
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .map((o) =>
      o.includes('*')
        ? new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+') + '$')
        : o,
    );
}

/** Revisa que las variables necesarias existan; en produccion detiene el arranque si falta alguna */
export function validarEntorno(): void {
  const log = new Logger('Entorno');
  const faltan: string[] = [];
  if (!process.env.JWT_SECRET) faltan.push('JWT_SECRET');
  if (ES_PRODUCCION && !process.env.DATABASE_URL && !process.env.DB_HOST) faltan.push('DATABASE_URL');

  if (faltan.length) {
    const msg = `Faltan variables de entorno: ${faltan.join(', ')}`;
    if (ES_PRODUCCION) throw new Error(msg);
    log.warn(msg + ' (revisa backend/.env)');
  }
  if (ES_PRODUCCION && (process.env.JWT_SECRET ?? '').length < 32) {
    log.warn('JWT_SECRET es corto: en produccion usa una cadena aleatoria de 32 caracteres o mas');
  }
  log.log(`Entorno: ${ES_PRODUCCION ? 'produccion' : 'desarrollo'}, zona horaria ${process.env.TZ}`);
}
