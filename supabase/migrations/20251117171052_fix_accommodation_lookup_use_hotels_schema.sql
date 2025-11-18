-- Migration: Fix get_accommodation_unit_by_motopress_id to use hotels.accommodation_units
-- Problem: Sync uses accommodation_units_public (DEPRECATED) causing UUID mismatch
-- Solution: Query hotels.accommodation_units (Single Source of Truth)
--
-- Impact: Aligns with architecture, fixes accommodation_unit: null in reservations list
-- Performance: Slightly faster (no JSONB parsing, direct column lookup, indexed)

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

-- Recreate to query hotels.accommodation_units (correct source)
CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  -- Query hotels.accommodation_units (Single Source of Truth)
  RETURN QUERY
  SELECT
    au.id,
    au.name::text,
    au.motopress_type_id,
    au.motopress_unit_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::varchar
    AND au.motopress_type_id = p_motopress_type_id
  LIMIT 1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID from hotels.accommodation_units (Single Source of Truth).
Previously queried accommodation_units_public (deprecated table), causing UUID mismatch.
Now correctly returns hotels.accommodation_units.id which matches reservation_accommodations.accommodation_unit_id.';
