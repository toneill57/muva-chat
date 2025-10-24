-- Migration: Fix Manual Chunks FK to Hotels Schema
-- Date: October 24, 2025
-- ADR: docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md
--
-- Problem: accommodation_units_manual_chunks.accommodation_unit_id has FK to
--          accommodation_units_public.unit_id, but manual chunks contain sensitive
--          data that should reference hotels.accommodation_units (private schema).
--
-- Solution:
--   1. Drop current FK constraint
--   2. Remap orphaned chunks to correct hotels.accommodation_units IDs
--   3. Add new FK constraint to hotels schema

-- ============================================================================
-- STEP 1: Drop Current FK Constraint
-- ============================================================================

ALTER TABLE accommodation_units_manual_chunks
DROP CONSTRAINT IF EXISTS accommodation_units_manual_chunks_accommodation_unit_id_fkey;

-- ============================================================================
-- STEP 2: Remap Orphaned Chunks to Hotels Schema
-- ============================================================================
-- Match chunks to correct hotel units by section_title patterns
-- Tenant: Simmerdown (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)

-- Natural Mystic
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '980a0d29-95db-4ec0-a390-590eb23b033d'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Natural Mystic%';

-- Misty Morning
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Misty Morning%';

-- One Love
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '265b2421-526d-4e71-b87c-6f0f7c2b7d4e'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%One Love%';

-- Sunshine
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '51ac0aaa-683d-49fe-ae40-af48e6ba0096'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Sunshine%';

-- Summertime
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '8300f006-5fc7-475c-9f59-edba707bad62'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Summertime%';

-- Simmer Highs
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '23449de1-d3c4-4f91-bd9e-4b8cea1ba44a'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Simmer Highs%';

-- Jammin'
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '690d3332-2bf5-44e9-b40c-9adc271ec68f'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Jammin%';

-- Dreamland
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Dreamland%';

-- Kaya
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '6a945198-180d-496a-9f56-16a2f954a16f'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Kaya%';

-- Groovin'
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '007fabb8-4373-4d8a-bbd0-d60eb42e862b'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Groovin%';

-- ============================================================================
-- STEP 3: Validation (Pre-FK Constraint)
-- ============================================================================

-- Verify remap before adding FK constraint
DO $$
DECLARE
  v_total_chunks INT;
  v_orphaned_chunks INT;
  v_remapped INT;
BEGIN
  -- Count total and orphaned chunks
  SELECT
    COUNT(*),
    COUNT(CASE WHEN ha.id IS NULL THEN 1 END)
  INTO v_total_chunks, v_orphaned_chunks
  FROM accommodation_units_manual_chunks aumc
  LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
  WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';

  -- Count chunks updated in this migration
  SELECT COUNT(*)
  INTO v_remapped
  FROM accommodation_units_manual_chunks
  WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
    AND updated_at > NOW() - INTERVAL '1 minute';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMAP VALIDATION (Part 1 of 2)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total chunks (Simmerdown): %', v_total_chunks;
  RAISE NOTICE 'Remapped chunks: %', v_remapped;
  RAISE NOTICE 'Orphaned chunks: %', v_orphaned_chunks;
  RAISE NOTICE '========================================';

  IF v_orphaned_chunks > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % orphaned chunks remain', v_orphaned_chunks;
  END IF;

  RAISE NOTICE 'SUCCESS: All chunks remapped. Ready for FK constraint (migration 20251024040000)';
END $$;
