-- Fix: Add tenant_id parameter to get_accommodation_units_by_ids for multi-tenant security
-- Problem: Endpoint calls RPC with p_tenant_id but function doesn't accept it

-- Drop old version (no tenant_id parameter)
DROP FUNCTION IF EXISTS public.get_accommodation_units_by_ids(uuid[]);

-- Create new version with tenant_id parameter
CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_ids(
  p_unit_ids uuid[],
  p_tenant_id uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  unit_number text,
  unit_type character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  -- Query hotels.accommodation_units with tenant security
  RETURN QUERY
  SELECT
    au.id,
    au.name::text,
    au.unit_number::text,
    au.unit_type::varchar
  FROM hotels.accommodation_units au
  WHERE au.id = ANY(p_unit_ids)
    AND au.tenant_id = p_tenant_id::varchar;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_accommodation_units_by_ids(uuid[], uuid) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_accommodation_units_by_ids IS
'Retrieves accommodation unit details from hotels.accommodation_units by UUID array.
Includes tenant_id parameter for multi-tenant security.';
