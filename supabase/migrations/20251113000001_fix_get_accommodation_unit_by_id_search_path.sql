-- Migration: Fix get_accommodation_unit_by_id search_path
-- Problem: RPC has search_path='public' but queries hotels.accommodation_units
-- Result: May resolve to wrong table/view, causing accommodation names to show with " - Overview" suffix
-- Solution: Add 'hotels' to search_path (same fix as get_accommodation_units plural)
--
-- Related:
--   - 20251113000000_fix_get_accommodation_units_search_path.sql (plural version)
--   - Issue: My-stay header shows "Alojamiento Simmer Highs - Overview" instead of "Alojamiento Simmer Highs"
--   - Impact: Breaks manual chunks lookup due to incorrect name mapping

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
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ FIXED: Added 'hotels' and 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.unit_number,
    au.view_type
  FROM hotels.accommodation_units au
  WHERE au.id = p_unit_id
    AND au.tenant_id = p_tenant_id;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id" IS
'Get accommodation unit by ID from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema correctly.
Used by guest-auth.ts to fetch accommodation details during My-stay login.
Returns clean accommodation names without " - Overview" suffix.';
