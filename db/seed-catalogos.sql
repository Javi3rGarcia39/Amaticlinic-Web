-- ============================================================================
-- [Catalogo] [Seguros] Datos de la parte 3:
--   * Catalogo de especialidades con precio de consulta
--   * Seguros con % de descuento en consultas y en medicamentos (asignados a pacientes)
--   * Costo de las citas que ya existian
--
-- REQUISITOS: backend de la parte 3 iniciado al menos una vez (crea las tablas nuevas) y
--             haber cargado antes seed-usuarios.sql (seed-farmacia.sql y seed-demo.sql son opcionales).
--
-- Uso desde la carpeta raiz del proyecto:
--   CMD:        docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-catalogos.sql
--   PowerShell: Get-Content db/seed-catalogos.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
--
-- Los nombres de los seguros son ficticios. Es seguro ejecutarlo mas de una vez.
-- ============================================================================

-- [Mejoras] Fechas en hora de Guatemala (PostgreSQL en Docker usa UTC por defecto)
SET TIME ZONE 'America/Guatemala';

-- [Mejoras] Deja la base en hora de Guatemala para cualquier conexion (pgAdmin, psql, backend)
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Guatemala');
END $$;

BEGIN;

DO $$
BEGIN
  IF to_regclass('citas_medicas.especialidad') IS NULL THEN
    RAISE EXCEPTION 'Primero inicia el backend nuevo (npm run start:dev) para que cree las tablas nuevas';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Especialidades con precio (actualiza el precio si ya existen)
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.especialidad (nombre, descripcion, precio_consulta, activo) VALUES
  ('Medicina General', 'Consulta general, chequeos y control de enfermedades comunes.',              150.00, true),
  ('Pediatria',        'Atencion de ninos y adolescentes, control de crecimiento y vacunas.',        200.00, true),
  ('Cardiologia',      'Diagnostico y control de presion arterial y enfermedades del corazon.',     350.00, true),
  ('Ginecologia',      'Salud de la mujer, control prenatal y chequeo anual.',                       300.00, true),
  ('Dermatologia',     'Enfermedades de la piel, alergias cutaneas y acne.',                         275.00, true),
  ('Medicina Interna', 'Manejo integral de diabetes, hipertension y enfermedades cronicas.',         250.00, true),
  ('Traumatologia',    'Lesiones deportivas, fracturas y dolor de huesos y articulaciones.',         300.00, true),
  ('Nutricion',        'Planes de alimentacion, control de peso y nutricion clinica.',               175.00, true)
ON CONFLICT (nombre) DO UPDATE
  SET precio_consulta = EXCLUDED.precio_consulta,
      descripcion = COALESCE(citas_medicas.especialidad.descripcion, EXCLUDED.descripcion)
  WHERE citas_medicas.especialidad.precio_consulta = 0;

-- Medicos que aun no estan vinculados al catalogo
UPDATE citas_medicas.medico m
SET id_especialidad = e.id_especialidad
FROM citas_medicas.especialidad e
WHERE m.id_especialidad IS NULL AND lower(e.nombre) = lower(m.especialidad);

-- ---------------------------------------------------------------------------
-- 2. Seguros (ficticios) y asignacion a pacientes
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.seguro (nombre, descuento_consulta, descuento_medicamentos, telefono, activo) VALUES
  ('Seguros Volcan',        20.00, 15.00, '22001100', true),
  ('Aseguradora Quetzal',   25.00, 10.00, '22002200', true),
  ('Salud Plus Guatemala',  30.00, 20.00, '22003300', true),
  ('Seguro Familiar Maya',  15.00, 25.00, '22004400', true),
  ('VidaSegura',            10.00, 10.00, '22005500', true)
ON CONFLICT (nombre) DO NOTHING;

UPDATE citas_medicas.paciente p
SET id_seguro = s.id_seguro, numero_poliza = v.poliza
FROM (VALUES
  ('juan.garcia@correo.com',     'Aseguradora Quetzal',  'AQ-458210'),
  ('sofia.ramirez@correo.com',   'Seguros Volcan',       'SV-102938'),
  ('carlos.mendoza@correo.com',  'Salud Plus Guatemala', 'SP-776512'),
  ('jose.perez@correo.com',      'Seguro Familiar Maya', 'FM-300144'),
  ('fernando.ortiz@correo.com',  'VidaSegura',           'VS-990021'),
  ('lucia.castillo@correo.com',  'Seguros Volcan',       'SV-102977'),
  ('valeria.cruz@correo.com',    'Aseguradora Quetzal',  'AQ-458299')
) AS v(correo, seguro, poliza)
JOIN citas_medicas.usuario u ON u.correo = v.correo
JOIN citas_medicas.seguro s ON s.nombre = v.seguro
WHERE p.id_usuario = u.id_usuario AND p.id_seguro IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Costo de las citas que quedaron sin precio (o en 0 porque aun no habia precios)
-- ---------------------------------------------------------------------------
UPDATE citas_medicas.cita c
SET costo_consulta = sub.costo,
    porcentaje_descuento = sub.pct,
    monto_descuento = ROUND(sub.costo * sub.pct / 100, 2),
    total_pagar = sub.costo - ROUND(sub.costo * sub.pct / 100, 2),
    seguro_aplicado = sub.seguro
FROM (
  SELECT c2.id_cita,
         COALESCE(e.precio_consulta, 0) AS costo,
         COALESCE(s.descuento_consulta, 0) AS pct,
         s.nombre AS seguro
  FROM citas_medicas.cita c2
  JOIN citas_medicas.medico m ON m.id_medico = c2.id_medico
  LEFT JOIN citas_medicas.especialidad e ON e.id_especialidad = m.id_especialidad
  JOIN citas_medicas.paciente p ON p.id_paciente = c2.id_paciente
  LEFT JOIN citas_medicas.seguro s ON s.id_seguro = p.id_seguro AND s.activo
) sub
WHERE c.id_cita = sub.id_cita
  AND (c.costo_consulta IS NULL OR c.costo_consulta = 0);

COMMIT;

-- Resumen
SELECT 'Especialidades' AS dato, count(*)::text AS valor FROM citas_medicas.especialidad
UNION ALL SELECT 'Seguros', count(*)::text FROM citas_medicas.seguro
UNION ALL SELECT 'Pacientes con seguro', count(*)::text FROM citas_medicas.paciente WHERE id_seguro IS NOT NULL
UNION ALL SELECT 'Citas con costo', count(*)::text FROM citas_medicas.cita WHERE costo_consulta IS NOT NULL;
