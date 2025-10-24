-- REMAP MANUAL CHUNKS TO HOTELS SCHEMA
-- Simple SQL version for direct execution via MCP
-- Tenant: Simmerdown (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)

-- This script remaps orphaned chunks to correct hotel units by matching unit names

-- Step 1: Update chunks for "Natural Mystic"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '980a0d29-95db-4ec0-a390-590eb23b033d'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Natural Mystic%';

-- Step 2: Update chunks for "Misty Morning"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Misty Morning%';

-- Step 3: Update chunks for "One Love"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '265b2421-526d-4e71-b87c-6f0f7c2b7d4e'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%One Love%';

-- Step 4: Update chunks for "Sunshine"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '51ac0aaa-683d-49fe-ae40-af48e6ba0096'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Sunshine%';

-- Step 5: Update chunks for "Summertime"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '8300f006-5fc7-475c-9f59-edba707bad62'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Summertime%';

-- Step 6: Update chunks for "Simmer Highs"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '23449de1-d3c4-4f91-bd9e-4b8cea1ba44a'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Simmer Highs%';

-- Step 7: Update chunks for "Jammin'"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '690d3332-2bf5-44e9-b40c-9adc271ec68f'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Jammin%';

-- Step 8: Update chunks for "Dreamland"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Dreamland%';

-- Step 9: Update chunks for "Kaya"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '6a945198-180d-496a-9f56-16a2f954a16f'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Kaya%';

-- Step 10: Update chunks for "Groovin'"
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '007fabb8-4373-4d8a-bbd0-d60eb42e862b'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Groovin%';

-- Validation query: Check that all chunks now point to valid hotel units
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN ha.id IS NULL THEN 1 END) as orphaned_chunks
FROM accommodation_units_manual_chunks aumc
LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Expected: orphaned_chunks = 0
