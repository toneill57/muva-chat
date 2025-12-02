-- Migration: Fix accommodation lookup to use hotels.accommodation_units instead of accommodation_units_public
-- Problem: reservation_accommodations.accommodation_unit_id contains UUIDs from hotels.accommodation_units
--          but get_accommodation_units_by_ids was searching in accommodation_units_public (wrong table)
-- Solution: Rewrite RPC to query hotels.accommodation_units (the correct source)

-- Drop existing function (specify argument types to avoid ambiguity)
DROP FUNCTION IF EXISTS public.get_accommodation_units_by_ids(p_unit_ids uuid[], p_tenant_id uuid);

-- Recreate function to query hotels.accommodation_units (correct table)
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
  -- Query hotels.accommodation_units (where reservation UUIDs actually exist)
  RETURN QUERY
  SELECT
    au.id,
    au.name::text,
    au.unit_number::text,
    au.unit_type::varchar
  FROM hotels.accommodation_units au
  WHERE au.id = ANY(p_unit_ids)
    AND au.tenant_id = p_tenant_id::varchar;  -- Multi-tenant security
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_accommodation_units_by_ids(uuid[], uuid) TO authenticated, anon, service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_accommodation_units_by_ids IS
'Retrieves accommodation unit details from hotels.accommodation_units by UUID array.
CRITICAL: Must query hotels.accommodation_units (not accommodation_units_public) because
reservation_accommodations.accommodation_unit_id references hotels.accommodation_units.id';
