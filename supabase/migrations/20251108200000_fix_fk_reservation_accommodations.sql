-- Migration: Fix FK constraint on reservation_accommodations
-- Issue: FK points to wrong table (accommodation_units instead of accommodation_units_public)
-- Error: "Key (accommodation_unit_id)=(UUID) is not present in table 'accommodation_units'"
--
-- Root Cause: A later migration (one of 060250, 061806, 070058, 085423) recreated the FK incorrectly
-- Solution: Drop and recreate FK pointing to accommodation_units_public where data actually exists
--
-- Date: 2025-11-08
-- Related: Reservation sync failing - Part 6 (Final Fix)

-- Drop the incorrect FK constraint
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT IF EXISTS reservation_accommodations_accommodation_unit_id_fkey;

-- Clean up orphaned accommodation_unit_ids (set to NULL if they don't exist in accommodation_units_public)
-- This allows the sync to re-link them correctly
UPDATE reservation_accommodations ra
SET accommodation_unit_id = NULL
WHERE accommodation_unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accommodation_units_public aup
    WHERE aup.unit_id = ra.accommodation_unit_id
  );

-- Create FK constraint pointing to accommodation_units_public (correct table)
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES public.accommodation_units_public(unit_id)
  ON DELETE SET NULL;

-- Comment
COMMENT ON CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  ON reservation_accommodations IS
  'FK to accommodation_units_public.unit_id (NOT accommodation_units.id).
  This table contains the actual accommodation data from MotoPress sync.';
