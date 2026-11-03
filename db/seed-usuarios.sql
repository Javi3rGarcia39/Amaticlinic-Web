-- ============================================================================
-- Datos iniciales: usuarios de prueba, uno o mas por cada rol, con perfil y horarios
-- Ejecutar DESPUES de arrancar el backend al menos una vez (TypeORM crea las tablas).
--
-- Uso desde la carpeta raiz del proyecto:
--   CMD:        docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-usuarios.sql
--   PowerShell: Get-Content db/seed-usuarios.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
--
-- Todos los usuarios tienen la contrasena: admin123
-- Es seguro ejecutarlo mas de una vez (no duplica datos).
-- ============================================================================

-- [Mejoras] Fechas en hora de Guatemala (PostgreSQL en Docker usa UTC por defecto)
SET TIME ZONE 'America/Guatemala';

-- Asegura el esquema (por si la base es nueva)
CREATE SCHEMA IF NOT EXISTS citas_medicas;

-- ---------------------------------------------------------------------------
-- 1. Usuarios (hash bcrypt de 'admin123')
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.usuario (nombre, apellido, correo, telefono, password, tipo_usuario) VALUES
  ('Admin',  'AmatiClinic', 'admin@amaticlinic.com',     '55500000', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Recepcionista'),
  ('Carlos', 'Lopez',       'dr.lopez@amaticlinic.com',  '55510001', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Medico'),
  ('Ana',    'Perez',       'dra.perez@amaticlinic.com', '55510002', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Medico'),
  ('Jorge',  'Ramirez',     'dr.ramirez@amaticlinic.com','55510003', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Medico'),
  ('Juan',   'Garcia',      'juan.garcia@correo.com',    '55520001', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Paciente'),
  ('Maria',  'Hernandez',   'maria.hernandez@correo.com','55520002', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Paciente'),
  ('Lucia',  'Morales',     'farmacia@amaticlinic.com',  '55530000', '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG', 'Farmaceutico')
ON CONFLICT (correo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Perfil de medico
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.medico (id_usuario, especialidad, anos_experiencia, descripcion, consultorio, rating)
SELECT u.id_usuario, v.especialidad, v.anos, v.descripcion, v.consultorio, v.rating
FROM (VALUES
  ('dr.lopez@amaticlinic.com',   'Medicina General', 10, 'Atencion de consulta general y control de enfermedades cronicas.', 'Consultorio 101', 4.80),
  ('dra.perez@amaticlinic.com',  'Pediatria',         8, 'Atencion integral de ninos y adolescentes.',                         'Consultorio 102', 4.90),
  ('dr.ramirez@amaticlinic.com', 'Cardiologia',      15, 'Diagnostico y tratamiento de enfermedades del corazon.',             'Consultorio 201', 4.70)
) AS v(correo, especialidad, anos, descripcion, consultorio, rating)
JOIN citas_medicas.usuario u ON u.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM citas_medicas.medico m WHERE m.id_usuario = u.id_usuario);

-- ---------------------------------------------------------------------------
-- 3. Perfil de paciente (Juan es alergico a la penicilina: sirve para probar la alerta de farmacia)
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.paciente
  (id_usuario, documento_identidad, fecha_nacimiento, telefono, correo, direccion, tipo_sangre, alergias,
   contacto_emergencia_nombre, contacto_emergencia_telefono)
SELECT u.id_usuario, v.dpi, v.nacimiento::date, u.telefono, u.correo, v.direccion, v.sangre, v.alergias, v.contacto, v.tel_contacto
FROM (VALUES
  ('juan.garcia@correo.com',     '2456789010101', '1995-04-12', 'Zona 1, Amatitlan',      'O+', 'Penicilina',  'Rosa Garcia',     '55529001'),
  ('maria.hernandez@correo.com', '3012456780101', '1988-09-30', 'Villa Nueva, Guatemala', 'A+', 'Ninguna',     'Pedro Hernandez', '55529002')
) AS v(correo, dpi, nacimiento, direccion, sangre, alergias, contacto, tel_contacto)
JOIN citas_medicas.usuario u ON u.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM citas_medicas.paciente p WHERE p.id_usuario = u.id_usuario);

-- ---------------------------------------------------------------------------
-- 4. Horarios: cada medico atiende de lunes a viernes, 08:00 - 16:00
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.horario (id_medico, dia_semana, hora_inicio, hora_fin)
SELECT m.id_medico, d.dia::citas_medicas.horario_dia_semana_enum, '08:00', '16:00'
FROM citas_medicas.medico m
JOIN citas_medicas.usuario u ON u.id_usuario = m.id_usuario
CROSS JOIN (VALUES ('Lunes'), ('Martes'), ('Miercoles'), ('Jueves'), ('Viernes')) AS d(dia)
WHERE u.correo IN ('dr.lopez@amaticlinic.com', 'dra.perez@amaticlinic.com', 'dr.ramirez@amaticlinic.com')
  AND NOT EXISTS (
    SELECT 1 FROM citas_medicas.horario h
    WHERE h.id_medico = m.id_medico AND h.dia_semana::text = d.dia
  );

-- Resumen
SELECT u.correo, u.tipo_usuario FROM citas_medicas.usuario u ORDER BY u.tipo_usuario, u.correo;
