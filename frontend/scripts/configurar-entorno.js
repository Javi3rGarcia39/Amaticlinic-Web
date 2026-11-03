// [Despliegue] Escribe la direccion del backend de produccion antes de compilar en Vercel.
// Vercel ejecuta "npm run build:vercel", que corre este script y luego "ng build".
// La direccion sale de la variable API_URL configurada en el proyecto del frontend en Vercel
// (Settings > Environment Variables), asi no queda escrita en el codigo.
//   Produccion: API_URL=https://amaticlinic-api.vercel.app/api
// En desarrollo no se usa: "npm start" toma src/environments/environment.ts (localhost).
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || '').trim().replace(/\/+$/, '');
const archivo = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

if (!apiUrl) {
  if (process.env.VERCEL) {
    console.error('Falta la variable API_URL en Vercel (por ejemplo https://amaticlinic-api.vercel.app/api).');
    process.exit(1);
  }
  console.log('API_URL no definida: se usa la direccion que ya tiene environment.prod.ts');
  process.exit(0);
}
if (!/^https?:\/\//.test(apiUrl)) {
  console.error(`API_URL debe empezar con https:// (se recibio "${apiUrl}")`);
  process.exit(1);
}

fs.writeFileSync(
  archivo,
  `// Generado por scripts/configurar-entorno.js a partir de API_URL\nexport const environment = {\n  production: true,\n  apiUrl: '${apiUrl}',\n};\n`,
);
console.log(`environment.prod.ts -> ${apiUrl}`);
