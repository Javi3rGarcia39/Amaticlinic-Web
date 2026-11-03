-- ============================================================================
-- [Farmacia] Datos iniciales del modulo de farmacia
-- Ejecutar DESPUES de arrancar el backend al menos una vez (TypeORM crea las tablas).
--
-- Uso (desde la carpeta raiz del proyecto, en PowerShell):
--   Get-Content db/seed-farmacia.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
--
-- Crea:
--   * Usuario Farmaceutico  ->  farmacia@amaticlinic.com / admin123
--   * Catalogo de 12 medicamentos con su stock inicial registrado en el kardex
-- Es seguro ejecutarlo mas de una vez (no duplica datos).
-- ============================================================================

-- [Mejoras] Fechas en hora de Guatemala (PostgreSQL en Docker usa UTC por defecto)
SET TIME ZONE 'America/Guatemala';

-- [Farmacia] Usuario farmaceutico (mismo hash bcrypt de 'admin123' que el recepcionista)
INSERT INTO citas_medicas.usuario (nombre, apellido, correo, telefono, password, tipo_usuario)
VALUES ('Lucia', 'Morales', 'farmacia@amaticlinic.com', '55530000',
        '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Farmaceutico')
ON CONFLICT (correo) DO NOTHING;

-- [Farmacia] Catalogo de medicamentos (Amoxicilina e Ibuprofeno sirven para probar la alerta de alergias)
INSERT INTO citas_medicas.medicamento
  (nombre, principio_activo, presentacion, concentracion, stock, stock_minimo, precio, requiere_receta)
SELECT v.nombre, v.principio_activo, v.presentacion, v.concentracion, v.stock, v.stock_minimo, v.precio, v.requiere_receta
FROM (VALUES
  ('Acetaminofen',     'Paracetamol',               'Tableta',    '500 mg',        200, 40, 0.75, false),
  ('Ibuprofeno',       'Ibuprofeno',                'Tableta',    '400 mg',        150, 30, 1.25, false),
  ('Amoxicilina',      'Amoxicilina',               'Capsula',    '500 mg',         90, 30, 2.50, true),
  ('Azitromicina',     'Azitromicina',              'Tableta',    '500 mg',         24, 10, 9.00, true),
  ('Loratadina',       'Loratadina',                'Tableta',    '10 mg',         120, 20, 1.00, false),
  ('Omeprazol',        'Omeprazol',                 'Capsula',    '20 mg',         100, 25, 1.50, true),
  ('Metformina',       'Metformina',                'Tableta',    '850 mg',         60, 30, 1.10, true),
  ('Losartan',         'Losartan potasico',         'Tableta',    '50 mg',          45, 30, 1.80, true),
  ('Salbutamol',       'Salbutamol',                'Inhalador',  '100 mcg/dosis',   6,  5, 45.00, true),
  ('Amoxicilina jarabe','Amoxicilina',              'Suspension', '250 mg/5 ml',     8, 10, 38.00, true),
  ('Diclofenaco',      'Diclofenaco sodico',        'Tableta',    '50 mg',          80, 20, 1.40, true),
  ('Suero oral',       'Sales de rehidratacion oral','Sobre',     '27.9 g',         15, 20, 6.50, false)
) AS v(nombre, principio_activo, presentacion, concentracion, stock, stock_minimo, precio, requiere_receta)
WHERE NOT EXISTS (
  SELECT 1 FROM citas_medicas.medicamento m
  WHERE lower(m.nombre) = lower(v.nombre) AND lower(m.presentacion) = lower(v.presentacion)
);

-- [Farmacia] El stock inicial tambien queda registrado en el kardex (una sola vez por medicamento)
INSERT INTO citas_medicas.movimiento_inventario (id_medicamento, tipo, cantidad, stock_resultante, motivo, id_usuario)
SELECT m.id_medicamento, 'Entrada', m.stock, m.stock, 'Stock inicial',
       (SELECT id_usuario FROM citas_medicas.usuario WHERE correo = 'farmacia@amaticlinic.com')
FROM citas_medicas.medicamento m
WHERE m.stock > 0
  AND NOT EXISTS (SELECT 1 FROM citas_medicas.movimiento_inventario x WHERE x.id_medicamento = m.id_medicamento);
