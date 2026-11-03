-- ============================================================================
-- [Mejoras] Datos para las mejoras recomendadas por el ingeniero:
--   * Catalogo de especialidades con precio de consulta
--   * Seguros con % de descuento en consultas y en medicamentos (asignados a pacientes)
--   * Lotes de medicamentos con costo y vencimiento (para FIFO / LIFO)
--   * Emergencias de ejemplo en la cola
--
-- REQUISITOS: backend NUEVO iniciado al menos una vez (crea las tablas nuevas) y
--             haber cargado antes seed-usuarios.sql y seed-farmacia.sql (seed-demo.sql es opcional).
--
-- Uso desde la carpeta raiz del proyecto:
--   CMD:        docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-mejoras.sql
--   PowerShell: Get-Content db/seed-mejoras.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
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
  IF to_regclass('citas_medicas.especialidad') IS NULL OR to_regclass('citas_medicas.lote_medicamento') IS NULL THEN
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
         CASE WHEN c2.es_emergencia
              THEN COALESCE((SELECT valor::numeric FROM citas_medicas.configuracion WHERE clave = 'precio_emergencia'), 350)
              ELSE COALESCE(e.precio_consulta, 0) END AS costo,
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

-- ---------------------------------------------------------------------------
-- 4. Lotes de medicamentos (solo para los que aun no tienen lotes)
--    Lote A: antiguo y mas barato. Lote B: reciente y mas caro.
--    Asi FIFO y LIFO dan costos distintos. Algunos lotes vencidos o por vencer para las alertas.
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.lote_medicamento
  (id_medicamento, codigo, fecha_ingreso, fecha_vencimiento, costo_unitario, cantidad_inicial, cantidad_disponible, proveedor)
SELECT m.id_medicamento, l.codigo, l.ingreso, l.vence, l.costo, l.cantidad, l.cantidad, l.proveedor
FROM citas_medicas.medicamento m
CROSS JOIN LATERAL (
  SELECT
    -- Reparto del stock actual entre los dos lotes
    CASE
      WHEN m.nombre = 'Amoxicilina jarabe' THEN LEAST(3, m.stock)
      WHEN m.stock >= 2 THEN m.stock * 2 / 5
      ELSE 0
    END AS a
) reparto
CROSS JOIN LATERAL (VALUES
  ('A-' || to_char(current_date - 75, 'YYMMDD'),
   (current_date - 75)::timestamp + time '09:00',
   CASE
     WHEN m.nombre = 'Amoxicilina jarabe' THEN current_date - 12          -- vencido
     WHEN m.nombre = 'Loratadina'         THEN current_date + 40          -- por vencer
     ELSE current_date + 300 END,
   ROUND(m.precio * 0.55, 2), reparto.a, 'Distribuidora Farmaceutica Central'),
  ('B-' || to_char(current_date - 12, 'YYMMDD'),
   (current_date - 12)::timestamp + time '10:30',
   CASE
     WHEN m.nombre = 'Suero oral'         THEN current_date + 25          -- por vencer
     ELSE current_date + 540 END,
   ROUND(m.precio * 0.65, 2), m.stock - reparto.a, 'Laboratorios del Pacifico')
) AS l(codigo, ingreso, vence, costo, cantidad, proveedor)
WHERE m.stock > 0
  AND l.cantidad > 0
  AND NOT EXISTS (SELECT 1 FROM citas_medicas.lote_medicamento x WHERE x.id_medicamento = m.id_medicamento);

-- ---------------------------------------------------------------------------
-- 4b. Despachos hechos antes de las mejoras: se les calcula precio, descuento del seguro y costo,
--     para que aparezcan en las ventas, el margen y la valuacion.
-- ---------------------------------------------------------------------------
UPDATE citas_medicas.movimiento_inventario mv
SET precio_unitario      = m.precio,
    descuento_porcentaje = COALESCE(s.descuento_medicamentos, 0),
    monto_venta          = ROUND(-mv.cantidad * m.precio * (1 - COALESCE(s.descuento_medicamentos, 0) / 100), 2),
    costo_unitario       = COALESCE(mv.costo_unitario, ROUND(m.precio * 0.55, 2))
FROM citas_medicas.medicamento m,
     citas_medicas.receta r
     JOIN citas_medicas.paciente p ON p.id_paciente = r.id_paciente
     LEFT JOIN citas_medicas.seguro s ON s.id_seguro = p.id_seguro AND s.activo
WHERE mv.tipo = 'Salida'
  AND mv.precio_unitario IS NULL
  AND m.id_medicamento = mv.id_medicamento
  AND r.id_receta = mv.id_receta;

UPDATE citas_medicas.receta r
SET subtotal = x.bruto,
    monto_descuento = x.bruto - x.neto,
    total = x.neto,
    porcentaje_descuento = x.pct,
    seguro_aplicado = CASE WHEN x.pct > 0 THEN x.seguro END
FROM (
  SELECT mv.id_receta,
         ROUND(SUM(-mv.cantidad * mv.precio_unitario), 2) AS bruto,
         ROUND(SUM(mv.monto_venta), 2) AS neto,
         MAX(mv.descuento_porcentaje) AS pct,
         MAX(s.nombre) AS seguro
  FROM citas_medicas.movimiento_inventario mv
  JOIN citas_medicas.receta r2 ON r2.id_receta = mv.id_receta
  JOIN citas_medicas.paciente p ON p.id_paciente = r2.id_paciente
  LEFT JOIN citas_medicas.seguro s ON s.id_seguro = p.id_seguro
  WHERE mv.tipo = 'Salida' AND mv.monto_venta IS NOT NULL
  GROUP BY mv.id_receta
) x
WHERE r.id_receta = x.id_receta AND r.total = 0;

-- ---------------------------------------------------------------------------
-- 5. Emergencias de ejemplo (solo si no hay ninguna)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_recep int; v_med int; v_pac int; v_cita int; v_precio numeric; v_pct numeric; v_seguro text;
BEGIN
  IF EXISTS (SELECT 1 FROM citas_medicas.emergencia) THEN
    RAISE NOTICE 'Ya hay emergencias registradas; no se agregaron ejemplos.';
    RETURN;
  END IF;

  SELECT id_usuario INTO v_recep FROM citas_medicas.usuario WHERE correo = 'admin@amaticlinic.com';

  -- En espera: muy urgente
  SELECT p.id_paciente INTO v_pac FROM citas_medicas.paciente p JOIN citas_medicas.usuario u USING (id_usuario)
   WHERE u.correo IN ('miguel.santos@correo.com', 'maria.hernandez@correo.com') ORDER BY u.correo LIMIT 1;
  IF v_pac IS NOT NULL THEN
    INSERT INTO citas_medicas.emergencia (id_paciente, nivel, motivo, presion_arterial, frecuencia_cardiaca, temperatura, saturacion,
                                          estado, fecha_llegada, id_registrado_por)
    VALUES (v_pac, 'Naranja', 'Dolor abdominal intenso desde hace 3 horas, con vomito', '135/85', 112, 38.4, 96,
            'EnEspera', now() - interval '18 minutes', v_recep);
  END IF;

  -- En espera: urgente
  SELECT p.id_paciente INTO v_pac FROM citas_medicas.paciente p JOIN citas_medicas.usuario u USING (id_usuario)
   WHERE u.correo IN ('diego.alvarez@correo.com', 'juan.garcia@correo.com') ORDER BY u.correo LIMIT 1;
  IF v_pac IS NOT NULL THEN
    INSERT INTO citas_medicas.emergencia (id_paciente, nivel, motivo, presion_arterial, frecuencia_cardiaca, temperatura, saturacion,
                                          estado, fecha_llegada, id_registrado_por)
    VALUES (v_pac, 'Amarillo', 'Corte en la mano con sangrado moderado', '120/78', 88, 36.8, 98,
            'EnEspera', now() - interval '35 minutes', v_recep);
  END IF;

  -- Atendida hoy (con su cita de emergencia e historial)
  SELECT p.id_paciente, s.descuento_consulta, s.nombre INTO v_pac, v_pct, v_seguro
    FROM citas_medicas.paciente p JOIN citas_medicas.usuario u USING (id_usuario)
    LEFT JOIN citas_medicas.seguro s ON s.id_seguro = p.id_seguro
   WHERE u.correo IN ('andrea.lopez@correo.com', 'sofia.ramirez@correo.com') ORDER BY u.correo LIMIT 1;
  SELECT m.id_medico INTO v_med FROM citas_medicas.medico m JOIN citas_medicas.usuario u USING (id_usuario)
   WHERE u.correo = 'dr.lopez@amaticlinic.com';
  SELECT COALESCE((SELECT valor::numeric FROM citas_medicas.configuracion WHERE clave = 'precio_emergencia'), 350) INTO v_precio;
  v_pct := COALESCE(v_pct, 0);

  IF v_pac IS NOT NULL AND v_med IS NOT NULL THEN
    INSERT INTO citas_medicas.cita (id_paciente, id_medico, id_horario, fecha, hora_inicio, hora_fin, estado, motivo_consulta,
                                    es_emergencia, costo_consulta, porcentaje_descuento, monto_descuento, total_pagar, seguro_aplicado)
    VALUES (v_pac, v_med, NULL, (now() - interval '2 hours')::date,
            (now() - interval '2 hours')::time(0), (now() - interval '100 minutes')::time(0), 'Completada',
            'EMERGENCIA (Menos urgente): Reaccion alergica leve en brazos', true,
            v_precio, v_pct, ROUND(v_precio * v_pct / 100, 2), v_precio - ROUND(v_precio * v_pct / 100, 2), v_seguro)
    RETURNING id_cita INTO v_cita;

    INSERT INTO citas_medicas.historial_medico (id_paciente, id_medico, diagnostico, tratamiento, fecha_registro)
    VALUES (v_pac, v_med, '[Emergencia] Urticaria aguda por contacto', 'Antihistaminico oral por 5 dias. Evitar el detergente nuevo.',
            now() - interval '100 minutes');

    INSERT INTO citas_medicas.emergencia (id_paciente, nivel, motivo, presion_arterial, frecuencia_cardiaca, temperatura, saturacion,
                                          estado, fecha_llegada, id_medico, fecha_atencion, fecha_alta, diagnostico, tratamiento,
                                          destino, id_cita, id_registrado_por)
    VALUES (v_pac, 'Verde', 'Reaccion alergica leve en brazos', '118/76', 80, 36.6, 99,
            'Atendida', now() - interval '140 minutes', v_med, now() - interval '2 hours', now() - interval '100 minutes',
            'Urticaria aguda por contacto', 'Antihistaminico oral por 5 dias. Evitar el detergente nuevo.', 'Alta', v_cita, v_recep);
  END IF;

  RAISE NOTICE 'Emergencias de ejemplo cargadas.';
END $$;

COMMIT;

-- Resumen
SELECT 'Especialidades' AS dato, count(*)::text AS valor FROM citas_medicas.especialidad
UNION ALL SELECT 'Seguros', count(*)::text FROM citas_medicas.seguro
UNION ALL SELECT 'Pacientes con seguro', count(*)::text FROM citas_medicas.paciente WHERE id_seguro IS NOT NULL
UNION ALL SELECT 'Lotes', count(*)::text FROM citas_medicas.lote_medicamento
UNION ALL SELECT 'Emergencias', count(*)::text FROM citas_medicas.emergencia
UNION ALL SELECT 'Metodo de inventario', valor FROM citas_medicas.configuracion WHERE clave = 'metodo_inventario';
