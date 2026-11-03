# Despliegue de AmatiClinic: desarrollo y producción

<!-- [Despliegue] Guía para publicar el proyecto en Vercel + Neon sin mezclar desarrollo con producción -->

El código es el mismo en todos los entornos; lo que cambia son las **variables de entorno** y la **base de datos**.

| Entorno | Para qué | Dónde corre | Base de datos | Rama de Git |
|---|---|---|---|---|
| Desarrollo | Programar y probar en tu computadora | `npm run start:dev` y `npm start` | PostgreSQL en Docker | Tu rama (por ejemplo `Alexsis-...`) |
| Vista previa (opcional) | Revisar los cambios del equipo antes de publicarlos | Vercel, "Preview" | Neon, rama `desarrollo` | `develop` |
| Producción | La versión pública | Vercel, "Production" | Neon, rama principal | `main` |

Regla del equipo: **a `main` solo llega lo que ya se probó**. Cada push a `main` se publica solo en producción.

```
tu rama  ──PR──▶  develop  ──PR──▶  main  ──▶  producción (Vercel)
(local)          (vista previa)
```

## Qué se configuró en el código (marcado con `[Despliegue]`)

| Archivo | Qué hace |
|---|---|
| `backend/src/config/entorno.ts` | Distingue desarrollo de producción, lee `CORS_ORIGINS` y detiene el arranque en producción si falta `JWT_SECRET` o `DATABASE_URL` |
| `backend/src/config/zona-horaria.ts` | Fija la hora de Guatemala (los servidores de Vercel trabajan en UTC) |
| `backend/src/app.module.ts` | En desarrollo usa `DB_HOST`, `DB_PORT`...; en producción usa `DATABASE_URL` con SSL |
| `backend/.env.example` | Variables de desarrollo (se copia a `.env`) |
| `backend/.env.production.example` | Lista de variables de producción (los valores reales van en Vercel, nunca en GitHub) |
| `db/produccion-inicial.sql` | Crea el esquema y deja la base de Neon en hora de Guatemala |
| `frontend/src/environments/` | `environment.ts` (desarrollo, localhost) y `environment.prod.ts` (producción) |
| `frontend/scripts/configurar-entorno.js` | En Vercel escribe la dirección del backend a partir de `API_URL` |
| `frontend/vercel.json` | Comando de compilación, carpeta de salida y rutas de Angular (evita el 404 al recargar) |

## Paso 0. Crear la rama `develop` (una sola vez)

```
git checkout main
git pull
git checkout -b develop
git push -u origin develop
```

Desde entonces cada quien trabaja en su rama, hace Pull Request hacia `develop` y, cuando todo funciona, se hace un Pull Request de `develop` hacia `main`.

## Paso 1. Base de datos de producción en Neon

1. Entra a https://neon.com y crea una cuenta (puedes usar tu cuenta de GitHub). El plan gratis no pide tarjeta.
2. Crea un proyecto llamado `amaticlinic`, con PostgreSQL 16 y la región **AWS US East** (la más cercana a Guatemala).
3. Pulsa **Connect** y copia dos cadenas de conexión:
   - **Pooled** (con *Connection pooling* activado; el host lleva `-pooler`): es la del backend.
   - **Directa** (con *Connection pooling* desactivado): es para cargar los scripts SQL.
4. Desde la carpeta del proyecto, en CMD, prepara la base con la cadena **directa**:

        docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA" < db\produccion-inicial.sql

   Se usa el `psql` de tu contenedor de Docker, así que no hay que instalar nada más. Debe estar encendido (`docker start amaticlinic-postgres`).

## Paso 2. Backend en Vercel

1. Entra a https://vercel.com con tu cuenta de GitHub y pulsa **Add New > Project**.
2. Importa el repositorio `amaticlinic_desarrollo_web`.
3. **Root Directory:** `backend`. Vercel reconoce NestJS solo.
4. En **Environment Variables** agrega (ver `backend/.env.production.example`):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La cadena **pooled** de Neon |
   | `JWT_SECRET` | Una cadena larga y aleatoria (32 caracteres o más) |
   | `JWT_EXPIRES_IN` | `8h` |
   | `DB_SYNCHRONIZE` | `true` (solo para este primer despliegue) |
   | `CORS_ORIGINS` | Por ahora `http://localhost:4200`; en el paso 4 se cambia |

5. Pulsa **Deploy** y anota la dirección que te da, por ejemplo `https://amaticlinic-api.vercel.app`.
6. Abre `https://amaticlinic-api.vercel.app/api/publico/inicio`. La primera vez tarda unos segundos porque crea las tablas; debe responder un JSON (con listas vacías).

## Paso 3. Datos iniciales en producción

Con la cadena **directa** de Neon, en el mismo orden que en desarrollo:

    docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA" < db\seed-usuarios.sql
    docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA" < db\seed-farmacia.sql
    docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA" < db\seed-demo.sql
    docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA" < db\seed-mejoras.sql

Luego, en Vercel (proyecto del backend) cambia `DB_SYNCHRONIZE` a `false` y vuelve a desplegar (**Deployments > ... > Redeploy**). Así el backend ya no revisa las tablas cada vez que arranca.

## Paso 4. Frontend en Vercel

1. **Add New > Project** e importa **el mismo repositorio**.
2. **Root Directory:** `frontend`. El resto lo toma de `frontend/vercel.json`.
3. Variable de entorno:

   | Variable | Valor |
   |---|---|
   | `API_URL` | `https://amaticlinic-api.vercel.app/api` (la del paso 2, terminada en `/api`) |

4. **Deploy**. Anota la dirección, por ejemplo `https://amaticlinic.vercel.app`.
5. Vuelve al proyecto del **backend** y cambia `CORS_ORIGINS` a:

        https://amaticlinic.vercel.app,https://amaticlinic-*.vercel.app

   y vuelve a desplegar el backend. El `*` permite también las direcciones de vista previa del frontend.

En los dos proyectos revisa que la rama de producción sea `main` (**Settings > Environments > Production**, o **Settings > Git** según la versión del panel).

## Paso 5 (opcional). Vista previa con `develop`

Para probar en internet sin tocar los datos de producción:

1. En Neon crea una rama de base de datos llamada `desarrollo` (**Branches > New branch**). Es una copia de producción que se puede modificar sin riesgo.
2. En el backend de Vercel agrega `DATABASE_URL` otra vez, pero marcando solo **Preview** y con la cadena pooled de la rama `desarrollo`.
3. En el frontend de Vercel agrega `API_URL` marcando solo **Preview**, con la dirección del backend para la rama `develop`: `https://amaticlinic-api-git-develop-TU-USUARIO.vercel.app/api` (aparece en **Deployments** al hacer push a `develop`).

Cada push a `develop` genera una vista previa que usa la base `desarrollo`. Producción solo cambia con `main`.

## Cuando el código agrega tablas o columnas

<!-- [Eliminacion] -->
Producción tiene `DB_SYNCHRONIZE=false`, así que las tablas nuevas no se crean solas. Después de unir a `main` un cambio que agrega tablas o columnas (por ejemplo, la papelera):

1. En el backend de Vercel cambia `DB_SYNCHRONIZE` a `true` y haz **Redeploy**.
2. Abre una vez `https://TU-BACKEND.vercel.app/api/publico/inicio` (al arrancar crea lo que falta).
3. Regresa `DB_SYNCHRONIZE` a `false` y vuelve a hacer **Redeploy**.

Los datos existentes no se tocan: las columnas nuevas se agregan vacías.

## Antes de mostrarlo

- Es una aplicación de salud con dirección pública: usa **solo datos ficticios**.
- Los usuarios de prueba tienen la contraseña `admin123`; cualquiera con el link podría entrar. Para una demostración está bien, pero no la uses con información real.
- El plan gratis de Neon apaga la base tras 5 minutos sin uso: la primera petición después de un rato tarda un poco más.

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| En el navegador sale un error de CORS | Falta la dirección del frontend en `CORS_ORIGINS` del backend; agrégala y vuelve a desplegar |
| El build del frontend falla con "Falta la variable API_URL" | Agrega `API_URL` en el proyecto del frontend en Vercel |
| El backend no arranca: "Faltan variables de entorno" | Agrega la variable que menciona el mensaje (Runtime Logs del proyecto) |
| `schema "citas_medicas" does not exist` | No se ejecutó `db/produccion-inicial.sql` (paso 1) |
| Las horas salen 6 horas adelantadas | Ejecuta `db/produccion-inicial.sql` con la cadena directa |
| Al recargar una página sale 404 | Falta `frontend/vercel.json` o el Root Directory no es `frontend` |
