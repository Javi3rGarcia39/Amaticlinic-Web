# AmatiClinic — Parte 4 de 4: Operación clínica: lotes, emergencias y paneles

Sistema de gestión de citas médicas. Backend NestJS 10 + TypeORM, frontend Angular 17 + Tailwind, PostgreSQL 16 en Docker.

Rama de GitHub de esta parte: **`parte-4-operacion-clinica`**

| Parte | Rama | Contenido |
|---|---|---|
| 1 | `nucleo` | Núcleo de citas |
| 2 | `farmacia` | Farmacia y receta electrónica |
| 3 | `catalogos-seguros` | Catálogos, seguros y experiencia del paciente |
| 4 (esta) | `operacion-clinica` | Operación clínica: lotes, emergencias y paneles |

Cada parte es el proyecto completo y funcional hasta esa etapa, y las partes se suben en orden (1, 2, 3, 4).

## Qué agrega esta parte

Completa las recomendaciones del ingeniero.

| Mejora | Qué hace | Dónde |
|---|---|---|
| FIFO / LIFO | Tabla `lote_medicamento` con costo y vencimiento; el método se elige en Farmacia > Inventario y decide qué lote sale primero | `backend/src/farmacia/lotes.service.ts`, `pages/farmacia/inventario.component.ts` |
| Valuación del inventario | Valor del inventario, costo de ventas y margen según el método | `pages/farmacia/valuacion.component.ts` |
| Seguros en medicamentos | Al despachar se aplica el % de medicamentos del seguro del paciente | `backend/src/farmacia/recetas.service.ts` |
| Emergencias | Atención sin cita con triage (rojo, naranja, amarillo, verde). Recepción registra y el médico pasa directo al diagnóstico y la receta | `backend/src/emergencias`, `pages/recepcionista/emergencias.component.ts`, `pages/medico/emergencias.component.ts` |
| Mejorar dashboard | Paneles nuevos con gráficas para recepción, médico, paciente y farmacia | `backend/src/estadisticas`, `pages/*/dashboard.component.ts`, `shared/grafica-columnas.component.ts` |
| Configuración | Precio de la emergencia (Recepción > Catálogos) y método de inventario | `backend/src/catalogos/configuracion.entity.ts` |

**Datos de prueba:** `db/seed-mejoras.sql` (lotes con vencimiento, emergencias de ejemplo; también incluye lo de `seed-catalogos.sql`)

## Cómo subirla a GitHub

Esta parte va encima de la parte 3 (`parte-3-catalogos-seguros`). Espera a que esa rama esté unida a `main`.

1. Acepta la invitación del repositorio que te llegó por correo y clónalo (solo la primera vez):

        git clone https://github.com/USUARIO/REPOSITORIO.git
        cd REPOSITORIO

2. Trae lo último de `main` y crea tu rama:

        git checkout main
        git pull
        git checkout -b parte-4-operacion-clinica

3. Copia **el contenido** de la carpeta `amaticlinic` de este zip (no la carpeta) dentro de `REPOSITORIO` y acepta **reemplazar** los archivos.
   Este zip trae el proyecto completo hasta la parte 4, así que git solo marcará como cambios lo que agrega esta parte (`git status` para verlo).
4. Sube la rama:

        git add -A
        git commit -m "Parte 4: operación clínica: lotes, emergencias y paneles"
        git push -u origin parte-4-operacion-clinica

5. En GitHub abre un **Pull Request** de `parte-4-operacion-clinica` hacia `main` y haz **Merge**.

Si no quieren esperar el merge anterior, crea tu rama desde la del compañero: `git fetch` y luego `git checkout -b parte-4-operacion-clinica origin/parte-3-catalogos-seguros`. En ese caso el Pull Request se une a `main` después del de la parte 3.

`node_modules`, `dist` y `backend/.env` no se suben (están en `.gitignore`). Cada quien crea su propio `backend/.env` a partir de `backend/.env.example`.

## Cómo ejecutarla

Requisitos: Node.js 18 o 20 y Docker Desktop.

### 1. Base de datos
Desde esta carpeta:

    docker compose up -d

Si ya tienes un contenedor llamado `amaticlinic-postgres`, usa `docker start amaticlinic-postgres` en lugar de lo anterior.

Si el backend falla con `schema "citas_medicas" does not exist` (base nueva):

    docker exec -it amaticlinic-postgres psql -U postgres -d citas_medicas -c "CREATE SCHEMA IF NOT EXISTS citas_medicas;"

### 2. Backend (http://localhost:8080)

    cd backend
    copy .env.example .env
    npm install
    npm run start:dev

La primera vez TypeORM crea las tablas. Ajusta `DB_PASSWORD` en `.env` si tu contenedor usa otra contraseña.

### 3. Datos de prueba (con el backend ya iniciado), en este orden
CMD, desde esta carpeta:

    docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-usuarios.sql
    docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-farmacia.sql
    docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-demo.sql
    docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-mejoras.sql

(En PowerShell: `Get-Content db/seed-usuarios.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas`)

`seed-mejoras.sql` ya incluye lo de `seed-catalogos.sql`; si vienes de la parte 3 basta con ejecutar `seed-mejoras.sql`.

Los scripts se pueden ejecutar más de una vez sin duplicar datos.

Usuarios (contraseña `admin123` para todos):

| Rol | Correo |
|---|---|
| Recepcionista | admin@amaticlinic.com |
| Médico (Medicina General) | dr.lopez@amaticlinic.com |
| Médica (Medicina Interna) | dra.figueroa@amaticlinic.com |
| Paciente (alérgico a penicilina, con seguro) | juan.garcia@correo.com |
| Paciente (con seguro) | fernando.ortiz@correo.com |
| Farmacéutica | farmacia@amaticlinic.com |

### 4. Frontend (http://localhost:4200)

    cd frontend
    npm install
    npm start

La página de inicio (http://localhost:4200) es pública; desde ahí se inicia sesión o se crea una cuenta.

## Roles
Recepcionista, Médico, Paciente y Farmacéutico.

Los cambios están marcados en el código con comentarios entre corchetes, por ejemplo `[Farmacia]`, `[Agenda]`, `[Catalogo]`, `[Seguros]`, `[Lotes]` o `[Emergencias]`.
