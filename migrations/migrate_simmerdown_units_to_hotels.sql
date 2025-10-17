-- ============================================================================
-- Migration: Copy Accommodation Units from public → hotels schema
-- ============================================================================
-- Purpose: Migrate accommodation units for Simmerdown from public.accommodation_units
--          to hotels.accommodation_units with dynamic hotel_id lookup
--
-- Tenant: SimmerDown Guest House
-- Tenant ID: b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
--
-- Changes:
-- - Maps motopress_instance_id → motopress_unit_id
-- - Dynamically sets hotel_id via JOIN with public.hotels
-- - Preserves all embeddings, descriptions, and metadata
-- ============================================================================

INSERT INTO hotels.accommodation_units (
  id,
  tenant_id,
  hotel_id,
  name,
  motopress_unit_id,
  motopress_type_id,
  description,
  short_description,
  capacity,
  bed_configuration,
  size_m2,
  floor_number,
  view_type,
  images,
  tourism_features,
  booking_policies,
  unique_features,
  accessibility_features,
  location_details,
  status,
  is_featured,
  display_order,
  embedding_fast,
  embedding_balanced,
  unit_type,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.tenant_id,
  h.id AS hotel_id,  -- 🎯 Dynamic lookup via JOIN
  au.name,
  au.motopress_instance_id AS motopress_unit_id,  -- Column rename
  au.motopress_type_id,
  au.description,
  au.short_description,
  au.capacity,
  au.bed_configuration,
  au.size_m2,
  au.floor_number,
  au.view_type,
  au.images,
  au.tourism_features,
  au.booking_policies,
  au.unique_features,
  au.accessibility_features,
  au.location_details,
  au.status,
  au.is_featured,
  au.display_order,
  au.embedding_fast,
  au.embedding_balanced,
  au.unit_type,
  au.created_at,
  NOW() AS updated_at
FROM public.accommodation_units au
INNER JOIN public.hotels h ON h.tenant_id = au.tenant_id
WHERE au.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
ON CONFLICT (id) DO UPDATE SET
  hotel_id = EXCLUDED.hotel_id,
  motopress_unit_id = EXCLUDED.motopress_unit_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Verification query (run after migration)
-- SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
