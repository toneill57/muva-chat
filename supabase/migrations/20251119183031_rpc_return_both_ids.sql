-- Migration: Fix RPC to return BOTH IDs (hotels and public) for dual FK support
-- Problem: guest_reservations.accommodation_unit_id → hotels.accommodation_units.id
--          reservation_accommodations.accommodation_unit_id → accommodation_units_public.unit_id
--          Same RPC used for both, but they need DIFFERENT IDs
--
-- Solution: Return both IDs so mapper can use correct one for each table
--
-- Date: 2025-11-19

DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,                    -- hotels.accommodation_units.id (for guest_reservations FK)
  public_unit_id uuid,        -- accommodation_units_public.unit_id (for reservation_accommodations FK)
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
DECLARE
  v_hotels_id uuid;
  v_unit_name text;
  v_public_unit_id uuid;
BEGIN
  -- Step 1: Find in hotels.accommodation_units by motopress_type_id
  SELECT au.id, au.name
  INTO v_hotels_id, v_unit_name
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::varchar
    AND au.motopress_type_id = p_motopress_type_id
  LIMIT 1;

  -- Step 2: Find matching Overview chunk in accommodation_units_public
  IF v_unit_name IS NOT NULL THEN
    SELECT aup.unit_id
    INTO v_public_unit_id
    FROM accommodation_units_public aup
    WHERE aup.tenant_id = p_tenant_id
      AND aup.name LIKE v_unit_name || ' - Overview'
    LIMIT 1;
  END IF;

  -- Return both IDs
  IF v_hotels_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_hotels_id as id,
      v_public_unit_id as public_unit_id,
      v_unit_name as name,
      p_motopress_type_id as motopress_type_id,
      NULL::integer as motopress_unit_id;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID.
Returns BOTH IDs:
- id: hotels.accommodation_units.id (for guest_reservations.accommodation_unit_id FK)
- public_unit_id: accommodation_units_public.unit_id (for reservation_accommodations.accommodation_unit_id FK)
Dual FK architecture requires different IDs for legacy and junction tables.';
