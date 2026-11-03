// [Despliegue] Zona horaria de la aplicacion.
// Todo el backend calcula "hoy", "ahora" y los horarios de los medicos con la hora local de Node.
// En tu computadora Node ya usa la hora de Guatemala, pero en Vercel los servidores trabajan en UTC
// (6 horas adelante) y no se permite definir la variable TZ en el panel; por eso se fija aqui.
// Este archivo se importa PRIMERO en main.ts, antes de que se cree cualquier fecha.
process.env.TZ = process.env.APP_TIMEZONE || 'America/Guatemala';

export const ZONA_HORARIA = process.env.TZ;
