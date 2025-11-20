-- Migration: Revert get_accommodation_unit_by_motopress_id to return hotels.accommodation_units.id
-- Problem: Previous migration incorrectly changed to return accommodation_units_public.unit_id
-- Truth: guest_reservations.accommodation_unit_id FK points to hotels.accommodation_units.id (legacy field)
--
-- Documentation Reference: DATA_POPULATION_TIMELINE.md line 295, 340, 849
-- - Line 295: "accommodation_unit_id (UUID FK) - First room (legacy field)"
-- - Line 340: "accommodation_unit_id (UUID FK) - Links to hotels.accommodation_units"
-- - Line 849: "Foreign key target for guest_reservations"
--
-- Architecture:
-- - guest_reservations.accommodation_unit_id → hotels.accommodation_units.id (legacy, single room)
-- - reservation_accommodations.accommodation_unit_id → hotels.accommodation_units.id (multi-room support)
-- - Both FKs point to SAME table: hotels.accommodation_units
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
  -- Query hotels.accommodation_units (correct source per documentation)
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

GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID from hotels.accommodation_units.
Returns hotels.accommodation_units.id to match FK in guest_reservations and reservation_accommodations.
Per DATA_POPULATION_TIMELINE.md: Both tables reference hotels.accommodation_units, not accommodation_units_public.';
