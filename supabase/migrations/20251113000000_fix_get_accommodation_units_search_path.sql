-- Migration: Fix get_accommodation_units search_path
-- Problem: RPC has search_path='public', 'pg_temp' but queries hotels.accommodation_units
-- Result: Function returns 0 rows because it cannot see the hotels schema
-- Solution: Add 'hotels' to search_path

CREATE OR REPLACE FUNCTION "public"."get_accommodation_units"(
  "p_hotel_id" "uuid" DEFAULT NULL::"uuid",
  "p_tenant_id" "text" DEFAULT NULL::"text"
)
RETURNS TABLE(
  "id" "uuid",
  "name" character varying,
  "unit_number" character varying,
  "description" "text",
  "short_description" "text",
  "capacity" "jsonb",
  "bed_configuration" "jsonb",
  "view_type" character varying,
  "status" character varying,
  "is_featured" boolean,
  "display_order" integer,
  "hotel_id" "uuid",
  "tenant_id" character varying,
  "unique_features" "jsonb",
  "accessibility_features" "jsonb",
  "location_details" "jsonb",
  "embedding_fast" "public"."vector",
  "embedding_balanced" "public"."vector",
  "base_price_low_season" integer,
  "base_price_high_season" integer,
  "amenities_list" "jsonb",
  "unit_amenities" "text"
)
LANGUAGE "plpgsql"
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ FIXED: Added 'hotels'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id, au.name, au.unit_number, au.description, au.short_description,
    au.capacity, au.bed_configuration, au.view_type, au.status, au.is_featured, au.display_order,
    au.hotel_id, au.tenant_id, au.unique_features, au.accessibility_features, au.location_details,
    au.embedding_fast, au.embedding_balanced, au.base_price_low_season, au.base_price_high_season,
    au.amenities_list, au.unit_amenities
  FROM hotels.accommodation_units au
  WHERE (p_hotel_id IS NULL OR au.hotel_id = p_hotel_id)
    AND (p_tenant_id IS NULL OR au.tenant_id = p_tenant_id)
  ORDER BY au.display_order ASC;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_units" IS
'Returns accommodation units from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema.
Used by manual chunks system, accommodations API, and reservations.';
