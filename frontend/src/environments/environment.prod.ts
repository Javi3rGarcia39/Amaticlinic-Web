// [Despliegue] Entorno de PRODUCCION (ng build). En Vercel, scripts/configurar-entorno.js
// reemplaza apiUrl con la variable API_URL antes de compilar.
// Si compilas en tu computadora sin API_URL, apunta al backend local.
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080/api',
};
