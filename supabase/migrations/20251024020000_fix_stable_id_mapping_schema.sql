-- Migration: Fix Stable ID Mapping Schema
-- Date: 2025-10-24
-- Purpose: Correct column references for motopress_unit_id (it's a direct column, not in metadata)

-- ============================================================
-- PART 1: Fixed Enhanced ID Mapping Function (v2)
-- ============================================================

CREATE OR REPLACE FUNCTION map_hotel_to_public_accommodation_id_v2(
  p_hotel_unit_id uuid,
  p_tenant_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
DECLARE
  v_motopress_id integer;
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- PRIORITY 1: Search by motopress_unit_id (MOST STABLE)
  -- motopress_unit_id is a direct column (integer), not in metadata
  SELECT motopress_unit_id, name INTO v_motopress_id, v_hotel_name
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id
    AND tenant_id::text = p_tenant_id;

  IF v_motopress_id IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'motopress_unit_id' = v_motopress_id::text
    LIMIT 1;

    IF v_public_unit_id IS NOT NULL THEN
      RETURN v_public_unit_id;
    END IF;
  END IF;

  -- PRIORITY 2: Search by name (FALLBACK)
  IF v_hotel_name IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'original_accommodation' = v_hotel_name
      AND name LIKE v_hotel_name || ' - Overview'
    LIMIT 1;
  END IF;

  -- PRIORITY 3: Return original ID if no mapping found
  RETURN COALESCE(v_public_unit_id, p_hotel_unit_id);
END;
$$;

COMMENT ON FUNCTION map_hotel_to_public_accommodation_id_v2 IS
  'Maps hotel UUID to public UUID prioritizing stable motopress_unit_id (integer column) over name matching. Returns: (1) match by motopress_unit_id, (2) fallback to name match, (3) original ID if no match.';

-- ============================================================
-- Note: match_unit_manual_chunks doesn't need changes
-- (it just calls the mapping function)
-- ============================================================
