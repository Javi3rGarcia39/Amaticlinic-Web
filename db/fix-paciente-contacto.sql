-- ============================================================================
-- [Paciente] Completa telefono y correo de los pacientes registrados antes de la correccion.
-- Copia los datos de su cuenta de usuario solo donde el perfil los tiene vacios.
--
-- Uso desde la carpeta raiz del proyecto:
--   CMD:        docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas < db\fix-paciente-contacto.sql
--   PowerShell: Get-Content db/fix-paciente-contacto.sql | docker exec -i amaticlinic-postgres psql -U postgres -d citas_medicas
-- Tambien se puede pegar en el Query Tool de pgAdmin.
-- ============================================================================

-- [Mejoras] Fechas en hora de Guatemala (PostgreSQL en Docker usa UTC por defecto)
SET TIME ZONE 'America/Guatemala';

UPDATE citas_medicas.paciente p
SET telefono = COALESCE(NULLIF(p.telefono, ''), u.telefono),
    correo   = COALESCE(NULLIF(p.correo, ''),   u.correo)
FROM citas_medicas.usuario u
WHERE u.id_usuario = p.id_usuario
  AND (p.telefono IS NULL OR p.telefono = '' OR p.correo IS NULL OR p.correo = '');

-- Verificacion
SELECT p.id_paciente, u.nombre, u.apellido, p.telefono, p.correo
FROM citas_medicas.paciente p
JOIN citas_medicas.usuario u ON u.id_usuario = p.id_usuario
ORDER BY p.id_paciente;
