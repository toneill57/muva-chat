-- Migration: Fix get_accommodation_unit_by_motopress_id to search accommodation_units_public by name
-- Problem: FK points to accommodation_units_public.unit_id, but motopress_type_id is NULL in metadata
-- Solution: Search by original_accommodation name in metadata as fallback
--
-- Real FK discovered: reservation_accommodations.accommodation_unit_id → accommodation_units_public.unit_id
-- Data shows: motopress_type_id in metadata is NULL, so we must search by name
--
-- Date: 2025-11-19

DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

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
DECLARE
  v_unit_name text;
BEGIN
  -- First, try to find the unit in hotels.accommodation_units by motopress_type_id
  -- This gives us the name to search in accommodation_units_public
  SELECT au.name INTO v_unit_name
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::varchar
    AND au.motopress_type_id = p_motopress_type_id
  LIMIT 1;

  -- If found in hotels, search for matching Overview chunk in accommodation_units_public
  IF v_unit_name IS NOT NULL THEN
    RETURN QUERY
    SELECT DISTINCT
      aup.unit_id as id,
      (aup.metadata->>'original_accommodation')::text as name,
      p_motopress_type_id as motopress_type_id,
      NULL::integer as motopress_unit_id
    FROM accommodation_units_public aup
    WHERE aup.tenant_id = p_tenant_id
      AND aup.name LIKE v_unit_name || ' - Overview'
    LIMIT 1;
  END IF;

  -- If nothing found, return empty
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID.
Step 1: Find name in hotels.accommodation_units by motopress_type_id
Step 2: Find matching Overview chunk in accommodation_units_public by name
Returns accommodation_units_public.unit_id to match FK constraint in reservation_accommodations.';
