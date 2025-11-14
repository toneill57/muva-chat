-- Migration: Fix get_accommodation_unit_by_id to resolve chunk IDs to real units
-- Problem: guest_reservations.accommodation_unit_id points to accommodation_units_public (chunks)
--          but RPC searches hotels.accommodation_units (real units) → returns 0 results
-- Solution: Check if unit_id is a chunk, resolve to real unit via motopress_unit_id
--
-- Example:
--   Reservation points to: d8abb241-1586-458f-be0d-f2f9bf60fe32 (chunk "Simmer Highs - Overview")
--   Chunk has metadata.motopress_unit_id: 335
--   Real unit with motopress_unit_id 335: 7aaed98f-d30a-5135-bee7-e6c85bb717c2 ("Simmer Highs")

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
  v_motopress_unit_id INTEGER;
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
  -- Get motopress_unit_id from chunk metadata
  SELECT (metadata->>'motopress_unit_id')::INTEGER
  INTO v_motopress_unit_id
  FROM accommodation_units_public
  WHERE unit_id = p_unit_id
    AND tenant_id = p_tenant_id::uuid;

  -- If we found a motopress_unit_id, resolve to real unit
  IF v_motopress_unit_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      au.id,
      au.name,
      au.unit_number,
      au.view_type
    FROM hotels.accommodation_units au
    WHERE au.motopress_unit_id = v_motopress_unit_id
      AND au.tenant_id = p_tenant_id;
  END IF;

  RETURN;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id" IS
'Get accommodation unit by ID from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema correctly.
FALLBACK: If unit_id not found in real units, checks if it is a chunk ID in accommodation_units_public
          and resolves to real unit via metadata.motopress_unit_id.
Used by guest-auth.ts to fetch accommodation details during My-stay login.
Returns clean accommodation names without " - Overview" suffix.';
