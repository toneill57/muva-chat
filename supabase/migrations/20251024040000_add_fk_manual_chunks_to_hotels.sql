-- Migration: Add FK Constraint from Manual Chunks to Hotels Schema (Part 2 of 2)
-- Date: October 24, 2025
-- ADR: docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md
-- Prerequisite: 20251024030000_fix_manual_chunks_fk_to_hotels.sql (remap completed)

-- ============================================================================
-- STEP 1: Add FK Constraint to Hotels Schema
-- ============================================================================

ALTER TABLE accommodation_units_manual_chunks
ADD CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey
FOREIGN KEY (accommodation_unit_id)
REFERENCES hotels.accommodation_units(id)
ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Add Index for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_manual_chunks_accommodation_unit_id
ON accommodation_units_manual_chunks(accommodation_unit_id);

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
DECLARE
  v_total_chunks INT;
  v_orphaned_chunks INT;
  v_constraint_exists BOOLEAN;
BEGIN
  -- Verify FK constraint exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'accommodation_units_manual_chunks_accommodation_unit_id_fkey'
      AND table_name = 'accommodation_units_manual_chunks'
      AND constraint_type = 'FOREIGN KEY'
  ) INTO v_constraint_exists;

  -- Count total and orphaned chunks
  SELECT
    COUNT(*),
    COUNT(CASE WHEN ha.id IS NULL THEN 1 END)
  INTO v_total_chunks, v_orphaned_chunks
  FROM accommodation_units_manual_chunks aumc
  LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FK CONSTRAINT VALIDATION (Part 2 of 2)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FK constraint exists: %', v_constraint_exists;
  RAISE NOTICE 'Total chunks: %', v_total_chunks;
  RAISE NOTICE 'Orphaned chunks: %', v_orphaned_chunks;
  RAISE NOTICE '========================================';

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'FK constraint was not created';
  END IF;

  IF v_orphaned_chunks > 0 THEN
    RAISE EXCEPTION 'UNEXPECTED: FK constraint exists but % orphaned chunks found', v_orphaned_chunks;
  END IF;

  RAISE NOTICE 'SUCCESS: FK constraint active, all chunks valid';
END $$;
