-- ============================================================================
-- [Despliegue] Preparacion de la base de PRODUCCION (Neon). Se ejecuta UNA vez,
-- antes del primer despliegue del backend.
--   * Crea el esquema citas_medicas
--   * Deja la base y el usuario en hora de Guatemala (Neon trabaja en UTC y su
--     conexion con pool no permite mandar la zona horaria al conectarse)
--
-- Uso desde la carpeta raiz del proyecto (CMD), con la cadena DIRECTA de Neon
-- (la que NO lleva -pooler en el host):
--   docker exec -i amaticlinic-postgres psql "CADENA_DIRECTA_DE_NEON" < db\produccion-inicial.sql
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS citas_medicas;

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'America/Guatemala');
  EXECUTE format('ALTER ROLE %I SET timezone TO %L', current_user, 'America/Guatemala');
END $$;

SELECT current_database() AS base, current_user AS usuario, 'America/Guatemala' AS zona_horaria_configurada;
