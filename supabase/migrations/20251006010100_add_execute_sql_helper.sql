-- Migration: Add execute_sql helper function
-- Date: 2025-10-06
-- Purpose: Utility function to execute raw SQL (for admin/service_role only)
--
-- Usage: Used by scripts/fix-function-search-path.ts to apply security fixes
--
-- Security: Only callable by service_role (backend with SUPABASE_SERVICE_ROLE_KEY)

CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador (postgres)
SET search_path = public, pg_temp -- 🔒 Security fix: immutable search_path
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Security check: Only allow service_role to execute
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'execute_sql() can only be called by service_role';
  END IF;

  -- Execute the query and return results as JSONB
  EXECUTE query INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to service_role only
REVOKE ALL ON FUNCTION public.execute_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.execute_sql(text) IS
  'Execute raw SQL query (service_role only). Used by admin scripts for database maintenance.';
