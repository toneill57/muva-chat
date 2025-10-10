-- SOLUCIÓN PERMANENTE: Crear función RPC que ejecute DDL
-- Ejecuta esto UNA VEZ en Supabase Dashboard
-- Luego Claude NUNCA MÁS necesitará pedirte ejecutar SQL

CREATE OR REPLACE FUNCTION execute_ddl(sql_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL ejecutado correctamente';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Solo el service_role puede ejecutar esta función
REVOKE ALL ON FUNCTION execute_ddl(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_ddl(TEXT) TO service_role;

COMMENT ON FUNCTION execute_ddl(TEXT) IS
  'Helper function para ejecutar DDL desde código. SOLO para service_role. Permite a Claude Code ejecutar migraciones sin intervención manual.';
