-- Migration: Fix UUID comparison in get_accommodation_unit_by_motopress_id
-- Error: "operator does not exist: uuid = text"
-- Problem: Line 42 casts p_tenant_id to text but aup.tenant_id is UUID
-- Solution: Remove unnecessary cast
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
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id = p_tenant_id  -- FIXED: No cast, UUID = UUID
    AND aup.name LIKE '% - Overview'
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID from accommodation_units_public.
Returns unit_id to match FK constraint in reservation_accommodations.';
