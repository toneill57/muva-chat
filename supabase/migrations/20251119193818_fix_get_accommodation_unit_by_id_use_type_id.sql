-- Migration: Fix get_accommodation_unit_by_id to use motopress_type_id instead of motopress_unit_id
-- Problem: hotels.accommodation_units.motopress_unit_id is NULL, should use motopress_type_id
-- Impact: Guest auth can't find accommodation → no header display, no manual access
-- Date: 2025-11-19

CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"(
  "p_unit_id" "uuid",
  "p_tenant_id" character varying
)
RETURNS TABLE(
  "id" "uuid",
  "name" character varying,
  "unit_number" character varying,
  "view_type" character varying
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'hotels', 'pg_temp'
AS $$
DECLARE
  v_motopress_type_id INTEGER;
BEGIN
  -- First, try direct lookup in hotels.accommodation_units
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.unit_number,
    au.view_type
  FROM hotels.accommodation_units au
  WHERE au.id = p_unit_id
    AND au.tenant_id = p_tenant_id;

  -- If found, we're done
  IF FOUND THEN
    RETURN;
  END IF;

  -- Not found in real units, check if it's a chunk ID
  -- Get motopress_unit_id from chunk metadata (this is actually the TYPE ID)
  SELECT (metadata->>'motopress_unit_id')::INTEGER
  INTO v_motopress_type_id
  FROM accommodation_units_public
  WHERE unit_id = p_unit_id
    AND tenant_id = p_tenant_id::uuid;

  -- If we found a motopress ID, resolve to real unit using motopress_type_id
  IF v_motopress_type_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      au.id,
      au.name,
      au.unit_number,
      au.view_type
    FROM hotels.accommodation_units au
    WHERE au.motopress_type_id = v_motopress_type_id  -- FIXED: use motopress_type_id instead of motopress_unit_id
      AND au.tenant_id = p_tenant_id;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id" IS
'Get accommodation unit by ID from hotels.accommodation_units.
CRITICAL: Uses motopress_type_id (NOT motopress_unit_id) because motopress_unit_id is NULL in hotels table.
FALLBACK: If unit_id not found in real units, checks if it is a chunk ID in accommodation_units_public
          and resolves to real unit via metadata.motopress_unit_id → hotels.motopress_type_id.
Used by guest-auth.ts to fetch accommodation details during My-stay login.
Returns clean accommodation names without " - Overview" suffix.';
