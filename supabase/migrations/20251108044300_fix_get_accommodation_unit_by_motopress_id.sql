-- Migration: Fix get_accommodation_unit_by_motopress_id to read from accommodation_units_public
-- Issue: RPC was reading from hotels.accommodation_units which doesn't exist in staging
-- Result: saveReservationAccommodations returns empty, trigger links to wrong tenant's data
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix - Part 3

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

-- Recreate to read from accommodation_units_public (where data actually is in staging)
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
SET search_path = ''
AS $$
BEGIN
  -- Search in accommodation_units_public for Overview chunks
  -- Match by tenant_id AND motopress_room_type_id in metadata
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id::text = p_tenant_id::text
    AND aup.name LIKE '% - Overview'  -- Only Overview chunks
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

-- Comment
COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) IS
'Universal accommodation lookup function for staging environment.
Searches accommodation_units_public (Overview chunks) by motopress_room_type_id.
Used by saveReservationAccommodations during MotoPress sync.';
