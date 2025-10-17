-- ============================================================================
-- Migration: Create Missing Accommodation Units from Manual References
-- ============================================================================
-- Purpose: Create 8 additional accommodation units in hotels.accommodation_units
--          based on manual file references (apartments + rooms)
--
-- Note: These units exist as operational manuals but were never created in DB
-- ============================================================================

-- Get hotel_id dynamically
DO $$
DECLARE
  v_hotel_id UUID;
  v_tenant_id UUID := 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
BEGIN
  -- Get hotel_id for Simmerdown
  SELECT id INTO v_hotel_id
  FROM public.hotels
  WHERE tenant_id = v_tenant_id;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Hotel not found for tenant_id: %', v_tenant_id;
  END IF;

  -- Insert 8 missing accommodation units
  -- Apartments (4 units)
  INSERT INTO hotels.accommodation_units (
    id, tenant_id, hotel_id, name, unit_type, status, motopress_unit_id, created_at, updated_at
  ) VALUES
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Summertime', 'apartment', 'active', 2, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Simmer Highs', 'apartment', 'active', 3, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'One Love', 'apartment', 'active', 4, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Misty Morning', 'apartment', 'active', 5, NOW(), NOW()),

    -- Rooms (4 units)
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Natural Mystic', 'room', 'active', 6, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Kaya', 'room', 'active', 7, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Jammin', 'room', 'active', 8, NOW(), NOW()),
    (gen_random_uuid(), v_tenant_id, v_hotel_id, 'Dreamland', 'room', 'active', 9, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Created 8 accommodation units for Simmerdown';
END $$;

-- Verification query
SELECT id, name, unit_type, motopress_unit_id
FROM hotels.accommodation_units
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
ORDER BY motopress_unit_id;
