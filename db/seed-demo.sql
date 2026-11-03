-- ============================================================================
-- [Demo] Datos de demostracion para AmatiClinic
--
-- REQUISITOS (en este orden):
--   1. Backend iniciado al menos una vez (crea las tablas)
--   2. db\seed-usuarios.sql
--   3. db\seed-farmacia.sql
--
-- Uso desde la carpeta raiz del proyecto:
--   CMD:        docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\seed-demo.sql
--   PowerShell: Get-Content db/seed-demo.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
--   pgAdmin:    abrir el archivo en el Query Tool y ejecutar (F5)
--
-- Agrega:
--   * 1 recepcionista y 5 medicos mas (con horarios), 10 pacientes mas
--   * 7 medicamentos mas, entradas de proveedor y un ajuste en el inventario
--   * ~40 citas: completadas (con historial medico), canceladas, modificadas y proximas
--   * Recetas despachadas (con su salida en el kardex) y recetas pendientes para farmacia
--   * Notificaciones de las citas proximas
-- Todos los usuarios nuevos tienen la contrasena: admin123
-- Las fechas se calculan desde HOY, asi que los datos siempre se ven actuales.
-- Si ya se cargo antes, no vuelve a crear citas ni recetas (no duplica).
-- ============================================================================

-- [Mejoras] Fechas en hora de Guatemala (PostgreSQL en Docker usa UTC por defecto)
SET TIME ZONE 'America/Guatemala';

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Verifica que los seeds anteriores ya se ejecutaron
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM citas_medicas.usuario WHERE correo = 'dr.lopez@amaticlinic.com') THEN
    RAISE EXCEPTION 'Primero ejecuta db\seed-usuarios.sql';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM citas_medicas.medicamento WHERE nombre = 'Amoxicilina')
     OR NOT EXISTS (SELECT 1 FROM citas_medicas.usuario WHERE correo = 'farmacia@amaticlinic.com') THEN
    RAISE EXCEPTION 'Primero ejecuta db\seed-farmacia.sql';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Usuarios nuevos (hash bcrypt de 'admin123')
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.usuario (nombre, apellido, correo, telefono, password, tipo_usuario)
SELECT v.nombre, v.apellido, v.correo, v.telefono,
       '$2b$10$ibUrwvD9pLbpODx1FcQ1cecw64fQ761gHIUCjUMTrZlaCGws/eSAG',
       v.tipo::citas_medicas.usuario_tipo_usuario_enum
FROM (VALUES
  ('Karla',     'Lopez',     'recepcion@amaticlinic.com',     '55500001', 'Recepcionista'),
  ('Gabriela',  'Mendez',    'dra.mendez@amaticlinic.com',    '55510004', 'Medico'),
  ('Roberto',   'Castillo',  'dr.castillo@amaticlinic.com',   '55510005', 'Medico'),
  ('Patricia',  'Figueroa',  'dra.figueroa@amaticlinic.com',  '55510006', 'Medico'),
  ('Luis',      'Morales',   'dr.morales@amaticlinic.com',    '55510007', 'Medico'),
  ('Silvia',    'Rodas',     'dra.rodas@amaticlinic.com',     '55510008', 'Medico'),
  ('Sofia',     'Ramirez',   'sofia.ramirez@correo.com',      '55520003', 'Paciente'),
  ('Carlos',    'Mendoza',   'carlos.mendoza@correo.com',     '55520004', 'Paciente'),
  ('Andrea',    'Lopez',     'andrea.lopez@correo.com',       '55520005', 'Paciente'),
  ('Jose',      'Perez',     'jose.perez@correo.com',         '55520006', 'Paciente'),
  ('Lucia',     'Castillo',  'lucia.castillo@correo.com',     '55520007', 'Paciente'),
  ('Miguel',    'Santos',    'miguel.santos@correo.com',      '55520008', 'Paciente'),
  ('Valeria',   'Cruz',      'valeria.cruz@correo.com',       '55520009', 'Paciente'),
  ('Fernando',  'Ortiz',     'fernando.ortiz@correo.com',     '55520010', 'Paciente'),
  ('Gabriela',  'Reyes',     'gabriela.reyes@correo.com',     '55520011', 'Paciente'),
  ('Diego',     'Alvarez',   'diego.alvarez@correo.com',      '55520012', 'Paciente')
) AS v(nombre, apellido, correo, telefono, tipo)
ON CONFLICT (correo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Perfiles de medico
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.medico (id_usuario, especialidad, anos_experiencia, descripcion, consultorio, rating)
SELECT u.id_usuario, v.especialidad, v.anos, v.descripcion, v.consultorio, v.rating
FROM (VALUES
  ('dra.mendez@amaticlinic.com',   'Ginecologia',       12, 'Control prenatal, salud reproductiva y chequeos anuales.', 'Consultorio 103', 4.85),
  ('dr.castillo@amaticlinic.com',  'Dermatologia',       9, 'Enfermedades de la piel, alergias cutaneas y acne.',       'Consultorio 104', 4.60),
  ('dra.figueroa@amaticlinic.com', 'Medicina Interna',  18, 'Manejo de diabetes, hipertension y enfermedades cronicas.', 'Consultorio 202', 4.75),
  ('dr.morales@amaticlinic.com',   'Traumatologia',     11, 'Lesiones deportivas, fracturas y dolor articular.',        'Consultorio 203', 4.50),
  ('dra.rodas@amaticlinic.com',    'Nutricion',          6, 'Planes de alimentacion y control de peso.',                'Consultorio 105', 4.90)
) AS v(correo, especialidad, anos, descripcion, consultorio, rating)
JOIN citas_medicas.usuario u ON u.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM citas_medicas.medico m WHERE m.id_usuario = u.id_usuario);

-- ---------------------------------------------------------------------------
-- 3. Horarios de los medicos nuevos
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.horario (id_medico, dia_semana, hora_inicio, hora_fin)
SELECT m.id_medico, d.dia::citas_medicas.horario_dia_semana_enum, v.inicio::time, v.fin::time
FROM (VALUES
  ('dra.mendez@amaticlinic.com',   'Martes,Jueves',                                 '09:00', '17:00'),
  ('dr.castillo@amaticlinic.com',  'Lunes,Miercoles,Viernes',                       '08:00', '13:00'),
  ('dra.figueroa@amaticlinic.com', 'Lunes,Martes,Miercoles,Jueves,Viernes,Sabado',  '07:00', '12:00'),
  ('dr.morales@amaticlinic.com',   'Lunes,Martes,Miercoles,Jueves,Viernes',         '14:00', '19:00'),
  ('dra.rodas@amaticlinic.com',    'Martes,Jueves,Sabado',                          '08:00', '12:00')
) AS v(correo, dias, inicio, fin)
JOIN citas_medicas.usuario u ON u.correo = v.correo
JOIN citas_medicas.medico m ON m.id_usuario = u.id_usuario
CROSS JOIN LATERAL unnest(string_to_array(v.dias, ',')) AS d(dia)
WHERE NOT EXISTS (
  SELECT 1 FROM citas_medicas.horario h
  WHERE h.id_medico = m.id_medico AND h.dia_semana::text = d.dia
);

-- ---------------------------------------------------------------------------
-- 4. Perfiles de paciente (telefono y correo iguales a los de su cuenta)
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.paciente
  (id_usuario, documento_identidad, fecha_nacimiento, telefono, correo, direccion, tipo_sangre, alergias,
   contacto_emergencia_nombre, contacto_emergencia_telefono)
SELECT u.id_usuario, v.dpi, v.nacimiento::date, u.telefono, u.correo, v.direccion, v.sangre, v.alergias, v.contacto, v.tel
FROM (VALUES
  ('sofia.ramirez@correo.com',  '2987654320101', '1992-03-15', 'Zona 11, Guatemala',          'O+',  'Ninguna',    'Mario Ramirez',    '55529003'),
  ('carlos.mendoza@correo.com', '1876543210101', '1979-07-22', 'Zona 1, Amatitlan',           'A+',  'Sulfas',     'Elena de Mendoza', '55529004'),
  ('andrea.lopez@correo.com',   '3456789120101', '2001-11-05', 'San Miguel Petapa',           'B+',  'Ninguna',    'Rosa Lopez',       '55529005'),
  ('jose.perez@correo.com',     '1234567890101', '1965-01-30', 'Villa Canales',               'O-',  'Ibuprofeno', 'Marta Perez',      '55529006'),
  ('lucia.castillo@correo.com', '3012345670101', '1998-06-18', 'Zona 12, Guatemala',          'AB+', 'Polen',      'Hugo Castillo',    '55529007'),
  ('miguel.santos@correo.com',  '2765432100101', '1987-09-09', 'Mixco',                       'O+',  'Ninguna',    'Ana Santos',       '55529008'),
  ('valeria.cruz@correo.com',   '3698521470101', '2010-04-27', 'Zona 2, Amatitlan',           'A-',  'Penicilina', 'Claudia Cruz',     '55529009'),
  ('fernando.ortiz@correo.com', '1122334450101', '1955-12-12', 'Barcenas, Villa Nueva',       'B-',  'Ninguna',    'Irma de Ortiz',    '55529010'),
  ('gabriela.reyes@correo.com', '2589631470101', '1994-02-14', 'Zona 7, Guatemala',           'O+',  'Mariscos',   'Jorge Reyes',      '55529011'),
  ('diego.alvarez@correo.com',  '3147258690101', '2005-08-03', 'Palin, Escuintla',            'A+',  'Ninguna',    'Sandra Alvarez',   '55529012')
) AS v(correo, dpi, nacimiento, direccion, sangre, alergias, contacto, tel)
JOIN citas_medicas.usuario u ON u.correo = v.correo
WHERE NOT EXISTS (SELECT 1 FROM citas_medicas.paciente p WHERE p.id_usuario = u.id_usuario);

-- ---------------------------------------------------------------------------
-- 5. Medicamentos nuevos (con su entrada inicial en el kardex)
-- ---------------------------------------------------------------------------
INSERT INTO citas_medicas.medicamento
  (nombre, principio_activo, presentacion, concentracion, stock, stock_minimo, precio, requiere_receta)
SELECT v.nombre, v.principio, v.presentacion, v.concentracion, v.stock, v.minimo, v.precio, v.receta
FROM (VALUES
  ('Cetirizina',        'Cetirizina',          'Tableta',  '10 mg',   80, 20,  1.20, false),
  ('Ciprofloxacino',    'Ciprofloxacino',      'Tableta',  '500 mg',  40, 15,  3.50, true),
  ('Prednisona',        'Prednisona',          'Tableta',  '5 mg',    50, 15,  0.90, true),
  ('Atorvastatina',     'Atorvastatina',       'Tableta',  '20 mg',   60, 20,  2.75, true),
  ('Enalapril',         'Enalapril maleato',   'Tableta',  '10 mg',   70, 20,  0.85, true),
  ('Hidrocortisona',    'Hidrocortisona',      'Crema',    '1 %',     12,  5, 28.00, false),
  ('Clindamicina gel',  'Clindamicina',        'Gel',      '1 %',      4,  5, 65.00, true)
) AS v(nombre, principio, presentacion, concentracion, stock, minimo, precio, receta)
WHERE NOT EXISTS (SELECT 1 FROM citas_medicas.medicamento m WHERE lower(m.nombre) = lower(v.nombre));

INSERT INTO citas_medicas.movimiento_inventario (id_medicamento, tipo, cantidad, stock_resultante, motivo, id_usuario, fecha)
SELECT m.id_medicamento, 'Entrada', m.stock, m.stock, 'Stock inicial',
       (SELECT id_usuario FROM citas_medicas.usuario WHERE correo = 'farmacia@amaticlinic.com'),
       current_date - 60
FROM citas_medicas.medicamento m
WHERE m.nombre IN ('Cetirizina','Ciprofloxacino','Prednisona','Atorvastatina','Enalapril','Hidrocortisona','Clindamicina gel')
  AND NOT EXISTS (SELECT 1 FROM citas_medicas.movimiento_inventario mi WHERE mi.id_medicamento = m.id_medicamento);

-- Las entradas "Stock inicial" del seed de farmacia se fechan hace 60 dias para que el kardex quede en orden
UPDATE citas_medicas.movimiento_inventario
SET fecha = current_date - 60
WHERE motivo = 'Stock inicial' AND fecha > current_date - 60;

-- ---------------------------------------------------------------------------
-- 6. Funciones auxiliares temporales (se borran solas al terminar la sesion)
-- ---------------------------------------------------------------------------
CREATE FUNCTION pg_temp.dia(d date) RETURNS text LANGUAGE sql AS $$
  SELECT (ARRAY['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'])[extract(isodow FROM d)::int]
$$;

-- Crea una cita en el dia mas cercano (hacia atras si el desfase es negativo) en que el medico atiende
CREATE FUNCTION pg_temp.cita(p_pac text, p_med text, p_desfase int, p_slot int, p_estado text, p_motivo text)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_pac int; v_med int; d date; h record; v_ini time; v_id int; paso int; intentos int := 0;
BEGIN
  SELECT p.id_paciente INTO v_pac FROM citas_medicas.paciente p
    JOIN citas_medicas.usuario u ON u.id_usuario = p.id_usuario WHERE u.correo = p_pac;
  SELECT m.id_medico INTO v_med FROM citas_medicas.medico m
    JOIN citas_medicas.usuario u ON u.id_usuario = m.id_usuario WHERE u.correo = p_med;
  IF v_pac IS NULL OR v_med IS NULL THEN
    RAISE EXCEPTION 'No existe el paciente % o el medico %', p_pac, p_med;
  END IF;

  d := current_date + p_desfase;
  paso := CASE WHEN p_desfase < 0 THEN -1 ELSE 1 END;
  LOOP
    SELECT * INTO h FROM citas_medicas.horario
      WHERE id_medico = v_med AND dia_semana::text = pg_temp.dia(d) ORDER BY hora_inicio LIMIT 1;
    EXIT WHEN FOUND;
    d := d + paso; intentos := intentos + 1;
    IF intentos > 14 THEN RAISE EXCEPTION 'El medico % no tiene horarios', p_med; END IF;
  END LOOP;

  v_ini := h.hora_inicio + make_interval(mins => 30 * p_slot);
  WHILE EXISTS (SELECT 1 FROM citas_medicas.cita
                WHERE id_medico = v_med AND fecha = d AND hora_inicio = v_ini AND estado <> 'Cancelada') LOOP
    v_ini := v_ini + interval '30 minutes';
  END LOOP;

  INSERT INTO citas_medicas.cita (id_paciente, id_medico, id_horario, fecha, hora_inicio, hora_fin, estado, motivo_consulta)
  VALUES (v_pac, v_med, h.id_horario, d, v_ini, v_ini + interval '30 minutes',
          p_estado::citas_medicas.cita_estado_enum, p_motivo)
  RETURNING id_cita INTO v_id;
  RETURN v_id;
END $$;

-- Registra el historial medico de una cita completada
CREATE FUNCTION pg_temp.historial(p_cita int, p_diag text, p_trat text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO citas_medicas.historial_medico (id_paciente, id_medico, diagnostico, tratamiento, fecha_registro)
  SELECT c.id_paciente, c.id_medico, p_diag, p_trat, c.fecha + c.hora_fin
  FROM citas_medicas.cita c WHERE c.id_cita = p_cita
$$;

-- Crea la receta de una cita (codigo RX-XXXXXX unico, vigencia 30 dias)
CREATE FUNCTION pg_temp.receta(p_cita int, p_estado text, p_indicaciones text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_codigo text; v_id int; alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  LOOP
    SELECT 'RX-' || string_agg(substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1), '')
      INTO v_codigo FROM generate_series(1, 6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM citas_medicas.receta WHERE codigo = v_codigo);
  END LOOP;
  INSERT INTO citas_medicas.receta (codigo, id_cita, id_paciente, id_medico, fecha_emision, fecha_vencimiento, estado, indicaciones_generales)
  SELECT v_codigo, c.id_cita, c.id_paciente, c.id_medico, c.fecha + c.hora_fin, c.fecha + 30,
         p_estado::citas_medicas.receta_estado_enum, p_indicaciones
  FROM citas_medicas.cita c WHERE c.id_cita = p_cita
  RETURNING id_receta INTO v_id;
  RETURN v_id;
END $$;

-- Agrega un medicamento a la receta; si la receta esta Despachada descuenta stock y registra la salida
CREATE FUNCTION pg_temp.item(p_receta int, p_med text, p_dosis text, p_frec text, p_dias int, p_cant int, p_indic text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_med int; v_stock int; r record;
BEGIN
  SELECT id_medicamento INTO v_med FROM citas_medicas.medicamento WHERE lower(nombre) = lower(p_med) AND activo LIMIT 1;
  IF v_med IS NULL THEN RAISE EXCEPTION 'No existe el medicamento %', p_med; END IF;
  SELECT * INTO r FROM citas_medicas.receta WHERE id_receta = p_receta;

  INSERT INTO citas_medicas.detalle_receta (id_receta, id_medicamento, dosis, frecuencia, duracion_dias, cantidad, cantidad_despachada, indicaciones)
  VALUES (p_receta, v_med, p_dosis, p_frec, p_dias, p_cant, CASE WHEN r.estado = 'Despachada' THEN p_cant ELSE 0 END, p_indic);

  IF r.estado = 'Despachada' THEN
    UPDATE citas_medicas.medicamento SET stock = stock - p_cant WHERE id_medicamento = v_med RETURNING stock INTO v_stock;
    IF v_stock < 0 THEN RAISE EXCEPTION 'Stock insuficiente de %', p_med; END IF;
    INSERT INTO citas_medicas.movimiento_inventario (id_medicamento, tipo, cantidad, stock_resultante, motivo, id_receta, id_usuario, fecha)
    VALUES (v_med, 'Salida', -p_cant, v_stock, 'Despacho de receta ' || r.codigo, p_receta,
            (SELECT id_usuario FROM citas_medicas.usuario WHERE correo = 'farmacia@amaticlinic.com'),
            r.fecha_emision + interval '1 hour');
  END IF;
END $$;

-- Movimiento manual de inventario (entrada de proveedor o ajuste)
CREATE FUNCTION pg_temp.movimiento(p_med text, p_tipo text, p_cant int, p_motivo text, p_dias_atras int)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_med int; v_stock int;
BEGIN
  UPDATE citas_medicas.medicamento SET stock = stock + p_cant WHERE lower(nombre) = lower(p_med)
    RETURNING id_medicamento, stock INTO v_med, v_stock;
  INSERT INTO citas_medicas.movimiento_inventario (id_medicamento, tipo, cantidad, stock_resultante, motivo, id_usuario, fecha)
  VALUES (v_med, p_tipo::citas_medicas.movimiento_inventario_tipo_enum, p_cant, v_stock, p_motivo,
          (SELECT id_usuario FROM citas_medicas.usuario WHERE correo = 'farmacia@amaticlinic.com'),
          current_date - p_dias_atras + time '09:30');
END $$;

-- ---------------------------------------------------------------------------
-- 7. Citas, historial, recetas e inventario (en orden cronologico)
-- ---------------------------------------------------------------------------
DO $$
DECLARE c int; r int;
BEGIN
  -- No duplica si ya se cargo antes
  IF EXISTS (SELECT 1 FROM citas_medicas.cita ci
             JOIN citas_medicas.paciente p ON p.id_paciente = ci.id_paciente
             JOIN citas_medicas.usuario u ON u.id_usuario = p.id_usuario
             WHERE u.correo = 'sofia.ramirez@correo.com') THEN
    RAISE NOTICE 'Los datos de demostracion ya estaban cargados; no se agregaron citas ni recetas.';
    RETURN;
  END IF;

  -- ===== Hace 4 a 6 semanas =====
  c := pg_temp.cita('carlos.mendoza@correo.com', 'dr.lopez@amaticlinic.com', -45, 0, 'Completada', 'Chequeo general anual');
  PERFORM pg_temp.historial(c, 'Paciente sano. Examen fisico y laboratorios dentro de lo normal.', 'Mantener actividad fisica y dieta balanceada. Control en 1 anio.');

  c := pg_temp.cita('jose.perez@correo.com', 'dr.ramirez@amaticlinic.com', -40, 0, 'Completada', 'Evaluacion cardiologica por mareos');
  PERFORM pg_temp.historial(c, 'Presion arterial elevada (150/95). Electrocardiograma normal.', 'Monitoreo de presion en casa durante 3 semanas y reducir consumo de sal.');

  c := pg_temp.cita('fernando.ortiz@correo.com', 'dra.figueroa@amaticlinic.com', -35, 1, 'Completada', 'Control de diabetes');
  PERFORM pg_temp.historial(c, 'Diabetes mellitus tipo 2. Glucosa en ayunas 168 mg/dl.', 'Metformina 850 mg dos veces al dia con las comidas. Dieta baja en azucares.');
  r := pg_temp.receta(c, 'Despachada', 'Tomar con alimentos. Control de glucosa en 1 mes.');
  PERFORM pg_temp.item(r, 'Metformina', '1 tableta', 'cada 12 horas', 15, 30, 'Con el desayuno y la cena');

  PERFORM pg_temp.movimiento('Ibuprofeno', 'Ajuste', -2, 'Blister danado en bodega', 28);

  -- ===== Hace 2 a 3 semanas =====
  c := pg_temp.cita('sofia.ramirez@correo.com', 'dra.mendez@amaticlinic.com', -20, 0, 'Completada', 'Control ginecologico anual');
  PERFORM pg_temp.historial(c, 'Control ginecologico normal.', 'Papanicolaou tomado. Repetir control en 1 anio.');

  c := pg_temp.cita('carlos.mendoza@correo.com', 'dr.lopez@amaticlinic.com', -18, 1, 'Completada', 'Dolor de garganta y fiebre');
  PERFORM pg_temp.historial(c, 'Faringoamigdalitis bacteriana.', 'Amoxicilina 500 mg cada 8 horas por 7 dias. Acetaminofen si hay fiebre.');
  r := pg_temp.receta(c, 'Despachada', 'Completar todo el tratamiento aunque desaparezcan los sintomas.');
  PERFORM pg_temp.item(r, 'Amoxicilina',  '1 capsula', 'cada 8 horas', 7, 21, NULL);
  PERFORM pg_temp.item(r, 'Acetaminofen', '1 tableta', 'cada 8 horas', 5, 15, 'Solo si hay fiebre o dolor');

  c := pg_temp.cita('jose.perez@correo.com', 'dr.ramirez@amaticlinic.com', -15, 0, 'Completada', 'Resultados de monitoreo de presion');
  PERFORM pg_temp.historial(c, 'Hipertension arterial grado 1.', 'Iniciar Losartan 50 mg diario. Control en 1 mes.');
  r := pg_temp.receta(c, 'Despachada', 'Tomar todos los dias a la misma hora. Evitar el ibuprofeno (alergia).');
  PERFORM pg_temp.item(r, 'Losartan', '1 tableta', 'cada 24 horas', 30, 30, 'Por la manana');

  PERFORM pg_temp.movimiento('Azitromicina', 'Entrada', 30, 'Compra a proveedor - Factura 4587', 14);

  c := pg_temp.cita('fernando.ortiz@correo.com', 'dra.figueroa@amaticlinic.com', -12, 2, 'Completada', 'Control de diabetes');
  PERFORM pg_temp.historial(c, 'Diabetes mellitus tipo 2 en mejoria. Glucosa en ayunas 132 mg/dl.', 'Continuar Metformina. Agregar caminata de 30 minutos diarios.');
  r := pg_temp.receta(c, 'Despachada', 'Continuar el mismo tratamiento.');
  PERFORM pg_temp.item(r, 'Metformina', '1 tableta', 'cada 12 horas', 10, 20, 'Con el desayuno y la cena');

  c := pg_temp.cita('lucia.castillo@correo.com', 'dr.castillo@amaticlinic.com', -10, 1, 'Completada', 'Ronchas y comezon en los brazos');
  PERFORM pg_temp.historial(c, 'Dermatitis alergica de contacto.', 'Antihistaminico oral 10 dias y crema de hidrocortisona 2 veces al dia.');
  r := pg_temp.receta(c, 'Despachada', 'Evitar perfumes y detergentes fuertes.');
  PERFORM pg_temp.item(r, 'Loratadina',     '1 tableta',      'cada 24 horas', 10, 10, NULL);
  PERFORM pg_temp.item(r, 'Hidrocortisona', 'Capa delgada',   'cada 12 horas', 7,  1,  'Aplicar solo en la zona afectada');

  c := pg_temp.cita('maria.hernandez@correo.com', 'dra.figueroa@amaticlinic.com', -9, 0, 'Completada', 'Acidez y dolor de estomago');
  PERFORM pg_temp.historial(c, 'Gastritis aguda.', 'Omeprazol 20 mg en ayunas por 14 dias. Evitar picante, cafe y alcohol.');
  r := pg_temp.receta(c, 'Despachada', 'Tomar 30 minutos antes del desayuno.');
  PERFORM pg_temp.item(r, 'Omeprazol', '1 capsula', 'cada 24 horas', 14, 14, 'En ayunas');

  -- ===== Ultima semana =====
  c := pg_temp.cita('miguel.santos@correo.com', 'dr.morales@amaticlinic.com', -8, 0, 'Completada', 'Dolor de rodilla despues de jugar futbol');
  PERFORM pg_temp.historial(c, 'Esguince de rodilla derecha grado I.', 'Reposo relativo, hielo 20 minutos 3 veces al dia y antiinflamatorio por 5 dias.');
  r := pg_temp.receta(c, 'Despachada', 'No hacer deporte por 2 semanas.');
  PERFORM pg_temp.item(r, 'Diclofenaco', '1 tableta', 'cada 8 horas', 5, 15, 'Despues de comer');

  c := pg_temp.cita('andrea.lopez@correo.com', 'dra.mendez@amaticlinic.com', -7, 2, 'Cancelada', 'Consulta ginecologica');

  -- Receta PENDIENTE: paciente alergica a la penicilina, se le receto Azitromicina
  c := pg_temp.cita('valeria.cruz@correo.com', 'dra.perez@amaticlinic.com', -6, 2, 'Completada', 'Tos y congestion nasal');
  PERFORM pg_temp.historial(c, 'Infeccion respiratoria alta. Alergia a penicilina.', 'Azitromicina 3 dias y antihistaminico 7 dias. Abundantes liquidos.');
  r := pg_temp.receta(c, 'Emitida', 'Abundantes liquidos y reposo.');
  PERFORM pg_temp.item(r, 'Azitromicina', '1 tableta', 'cada 24 horas', 3, 3, NULL);
  PERFORM pg_temp.item(r, 'Loratadina',   '1 tableta', 'cada 24 horas', 7, 7, NULL);

  c := pg_temp.cita('gabriela.reyes@correo.com', 'dra.rodas@amaticlinic.com', -5, 1, 'Completada', 'Plan de alimentacion');
  PERFORM pg_temp.historial(c, 'Sobrepeso (IMC 27.4).', 'Plan de alimentacion de 1800 kcal y actividad fisica 4 veces por semana. Control en 1 mes.');

  -- Receta PENDIENTE con poco stock (Clindamicina gel)
  c := pg_temp.cita('andrea.lopez@correo.com', 'dr.castillo@amaticlinic.com', -4, 0, 'Completada', 'Granos en la cara');
  PERFORM pg_temp.historial(c, 'Acne leve.', 'Gel de clindamicina por la noche durante 6 semanas. Limpieza facial 2 veces al dia.');
  r := pg_temp.receta(c, 'Emitida', 'No exponerse al sol sin bloqueador.');
  PERFORM pg_temp.item(r, 'Clindamicina gel', 'Capa delgada', 'cada 24 horas', 42, 2, 'Por la noche, con la cara limpia');

  -- Receta ANULADA (el medico la corrigio)
  c := pg_temp.cita('diego.alvarez@correo.com', 'dr.morales@amaticlinic.com', -3, 1, 'Completada', 'Dolor en la espalda baja');
  PERFORM pg_temp.historial(c, 'Lumbalgia mecanica.', 'Antiinflamatorio 5 dias, calor local y ejercicios de estiramiento.');
  r := pg_temp.receta(c, 'Anulada', 'Receta anulada: dosis incorrecta.');
  PERFORM pg_temp.item(r, 'Diclofenaco', '2 tabletas', 'cada 8 horas', 5, 30, NULL);

  c := pg_temp.cita('carlos.mendoza@correo.com', 'dra.figueroa@amaticlinic.com', -2, 3, 'Completada', 'Dolor al orinar');
  PERFORM pg_temp.historial(c, 'Infeccion de vias urinarias. Alergia a sulfas.', 'Ciprofloxacino 500 mg cada 12 horas por 7 dias. Tomar 2 litros de agua al dia.');
  r := pg_temp.receta(c, 'Emitida', 'Tomar abundante agua.');
  PERFORM pg_temp.item(r, 'Ciprofloxacino', '1 tableta', 'cada 12 horas', 7, 14, NULL);

  -- Cita COMPLETADA SIN RECETA: para la demo del medico (Juan es alergico a la penicilina)
  c := pg_temp.cita('juan.garcia@correo.com', 'dr.lopez@amaticlinic.com', -1, 3, 'Completada', 'Dolor de oido y fiebre');
  PERFORM pg_temp.historial(c, 'Otitis media aguda. Paciente alergico a la penicilina.', 'Pendiente de receta.');

  -- ===== Proximas citas =====
  PERFORM pg_temp.cita('juan.garcia@correo.com',     'dr.lopez@amaticlinic.com',     1,  2, 'Agendada',   'Control de otitis');
  PERFORM pg_temp.cita('sofia.ramirez@correo.com',   'dr.lopez@amaticlinic.com',     2,  0, 'Agendada',   'Dolor de cabeza frecuente');
  PERFORM pg_temp.cita('diego.alvarez@correo.com',   'dra.figueroa@amaticlinic.com', 2,  1, 'Agendada',   'Examen medico para el trabajo');
  PERFORM pg_temp.cita('carlos.mendoza@correo.com',  'dr.ramirez@amaticlinic.com',   3,  1, 'Agendada',   'Chequeo del corazon');
  PERFORM pg_temp.cita('diego.alvarez@correo.com',   'dr.lopez@amaticlinic.com',     3,  4, 'Cancelada',  'Dolor de estomago');
  PERFORM pg_temp.cita('fernando.ortiz@correo.com',  'dra.figueroa@amaticlinic.com', 4,  0, 'Agendada',   'Control mensual de diabetes');
  PERFORM pg_temp.cita('jose.perez@correo.com',      'dr.ramirez@amaticlinic.com',   5,  0, 'Agendada',   'Control de presion arterial');
  PERFORM pg_temp.cita('lucia.castillo@correo.com',  'dr.castillo@amaticlinic.com',  6,  2, 'Agendada',   'Revision de dermatitis');
  PERFORM pg_temp.cita('valeria.cruz@correo.com',    'dra.perez@amaticlinic.com',    7,  1, 'Agendada',   'Control de tos');
  PERFORM pg_temp.cita('maria.hernandez@correo.com', 'dra.mendez@amaticlinic.com',   8,  3, 'Agendada',   'Control ginecologico');
  PERFORM pg_temp.cita('gabriela.reyes@correo.com',  'dra.rodas@amaticlinic.com',    9,  0, 'Agendada',   'Seguimiento de plan de alimentacion');
  PERFORM pg_temp.cita('miguel.santos@correo.com',   'dr.morales@amaticlinic.com',   10, 1, 'Agendada',   'Revision de rodilla');
  PERFORM pg_temp.cita('gabriela.reyes@correo.com',  'dra.mendez@amaticlinic.com',   11, 2, 'Modificada', 'Consulta ginecologica (cambio de horario)');
  PERFORM pg_temp.cita('andrea.lopez@correo.com',    'dr.castillo@amaticlinic.com',  12, 1, 'Agendada',   'Control de acne');
  PERFORM pg_temp.cita('maria.hernandez@correo.com', 'dra.figueroa@amaticlinic.com', 13, 2, 'Agendada',   'Control de gastritis');
  PERFORM pg_temp.cita('sofia.ramirez@correo.com',   'dra.rodas@amaticlinic.com',    14, 1, 'Agendada',   'Asesoria nutricional');

  -- ===== Notificaciones de las citas de los pacientes de demostracion =====
  INSERT INTO citas_medicas.notificacion (id_cita, tipo, mensaje, fecha_envio)
  SELECT ci.id_cita,
         (CASE WHEN ci.id_cita % 3 = 0 THEN 'telefono' ELSE 'correo' END)::citas_medicas.notificacion_tipo_enum,
         CASE ci.estado
           WHEN 'Cancelada'  THEN 'Su cita del ' || to_char(ci.fecha, 'DD/MM/YYYY') || ' con Dr(a). ' || um.nombre || ' ' || um.apellido || ' fue cancelada.'
           WHEN 'Modificada' THEN 'Su cita fue reprogramada para el ' || to_char(ci.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(ci.hora_inicio, 'HH24:MI') || ' con Dr(a). ' || um.nombre || ' ' || um.apellido || '.'
           ELSE 'Su cita fue agendada para el ' || to_char(ci.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(ci.hora_inicio, 'HH24:MI') || ' con Dr(a). ' || um.nombre || ' ' || um.apellido || ' (' || m.consultorio || ').'
         END,
         LEAST(now(), ci.fecha - 3 + time '08:00')
  FROM citas_medicas.cita ci
  JOIN citas_medicas.medico m ON m.id_medico = ci.id_medico
  JOIN citas_medicas.usuario um ON um.id_usuario = m.id_usuario
  JOIN citas_medicas.paciente p ON p.id_paciente = ci.id_paciente
  JOIN citas_medicas.usuario up ON up.id_usuario = p.id_usuario
  WHERE up.correo IN ('juan.garcia@correo.com','maria.hernandez@correo.com','sofia.ramirez@correo.com','carlos.mendoza@correo.com',
                      'andrea.lopez@correo.com','jose.perez@correo.com','lucia.castillo@correo.com','miguel.santos@correo.com',
                      'valeria.cruz@correo.com','fernando.ortiz@correo.com','gabriela.reyes@correo.com','diego.alvarez@correo.com')
    AND (ci.fecha >= current_date OR ci.estado = 'Cancelada')
    AND NOT EXISTS (SELECT 1 FROM citas_medicas.notificacion n WHERE n.id_cita = ci.id_cita);

  RAISE NOTICE 'Datos de demostracion cargados correctamente.';
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Resumen
-- ---------------------------------------------------------------------------
SELECT 'Usuarios' AS tabla, count(*) AS registros FROM citas_medicas.usuario
UNION ALL SELECT 'Medicos',       count(*) FROM citas_medicas.medico
UNION ALL SELECT 'Pacientes',     count(*) FROM citas_medicas.paciente
UNION ALL SELECT 'Horarios',      count(*) FROM citas_medicas.horario
UNION ALL SELECT 'Citas',         count(*) FROM citas_medicas.cita
UNION ALL SELECT 'Historial',     count(*) FROM citas_medicas.historial_medico
UNION ALL SELECT 'Recetas',       count(*) FROM citas_medicas.receta
UNION ALL SELECT 'Medicamentos',  count(*) FROM citas_medicas.medicamento
UNION ALL SELECT 'Movimientos',   count(*) FROM citas_medicas.movimiento_inventario
UNION ALL SELECT 'Notificaciones',count(*) FROM citas_medicas.notificacion;
