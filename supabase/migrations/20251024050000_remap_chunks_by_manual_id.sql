-- Migration: Remap Manual Chunks by manual_id (Corrected Approach)
-- Date: October 24, 2025
-- ADR: docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md
--
-- Context: Previous migration (20251024030000) only mapped chunks with unit name in section_title,
--          leaving 205 orphaned chunks. This migration maps ALL chunks by their manual_id.
--
-- Strategy: Map entire manuals (all chunks with same manual_id) to correct hotel unit

-- ============================================================================
-- REMAP BY MANUAL_ID
-- ============================================================================

-- Natural Mystic (manual_id from "Manual Operativo - Habitación Natural Mystic")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '980a0d29-95db-4ec0-a390-590eb23b033d'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = '45be817b-007d-48e2-b52b-d653bed94aa6';

-- Misty Morning (manual_id from "Manual Operativo - Apartamento Misty Morning")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '11c6bdba-c595-432e-9b3f-abcb5eb1a8a4'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = '83620eb3-bb24-44cc-a58f-90d10582bfab';

-- One Love (manual_id from "Manual Operativo - Apartamento One Love")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '265b2421-526d-4e71-b87c-6f0f7c2b7d4e'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = 'a964049c-e287-488e-bcaf-fc66d09880c3';

-- Sunshine (manual_id from "Manual Operativo - Apartamento Sunshine")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '51ac0aaa-683d-49fe-ae40-af48e6ba0096'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = '7762f13c-35e1-4f7c-aad2-9e9f1f142c91';

-- Summertime (manual_id from "Manual Operativo - Apartamento Summertime")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '8300f006-5fc7-475c-9f59-edba707bad62'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = 'e0bb9573-7eeb-485b-88c5-e6bb4b5746ee';

-- Simmer Highs (manual_id from "Manual Operativo - Apartamento Simmer Highs")
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '23449de1-d3c4-4f91-bd9e-4b8cea1ba44a'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = 'a3b97c1f-3c75-4650-a04c-393ba218d228';

-- Jammin' (manual_id identified by "Tips Específicos Jammin'" section)
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '690d3332-2bf5-44e9-b40c-9adc271ec68f'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = 'b05067f6-c0c4-48a2-b701-65e24363de08';

-- Generic Simmer Down manual (16 chunks with general info)
-- Assign to Dreamland as reference unit (could be duplicated to all units in future)
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND manual_id = '6466ad66-f87c-4343-a33c-e264b82f05f0';

-- ============================================================================
-- VALIDATION
-- ============================================================================

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
  RAISE NOTICE 'REMAP BY MANUAL_ID - VALIDATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total chunks (Simmerdown): %', v_total_chunks;
  RAISE NOTICE 'Remapped in this migration: %', v_remapped;
  RAISE NOTICE 'Orphaned chunks remaining: %', v_orphaned_chunks;
  RAISE NOTICE '========================================';

  IF v_orphaned_chunks > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % orphaned chunks remain', v_orphaned_chunks;
  END IF;

  RAISE NOTICE 'SUCCESS: All chunks remapped. Ready for FK constraint (migration 20251024040000)';
END $$;
