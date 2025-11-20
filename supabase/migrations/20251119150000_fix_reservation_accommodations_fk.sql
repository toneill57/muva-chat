-- Fix FK constraint in reservation_accommodations to point to hotels.accommodation_units
--
-- PROBLEM: FK was pointing to accommodation_units_public.unit_id (chunks for embeddings)
-- SOLUTION: FK should point to hotels.accommodation_units.id (master data)
--
-- This fixes the issue where MotoPress sync was inserting NULL values because:
-- 1. RPC get_accommodation_unit_by_motopress_id() returns hotels.accommodation_units.id
-- 2. FK was expecting accommodation_units_public.unit_id (different table)
-- 3. Mapper was using unit.public_unit_id (non-existent field)

-- Drop existing FK constraint
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT IF EXISTS reservation_accommodations_accommodation_unit_id_fkey;

-- Add correct FK pointing to hotels.accommodation_units
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES hotels.accommodation_units(id)
  ON DELETE SET NULL;

-- Add comment for future reference
COMMENT ON CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  ON reservation_accommodations IS
  'FK to hotels.accommodation_units (master accommodation data), NOT accommodation_units_public (chunks for embeddings). Updated 2025-11-19 to fix MotoPress sync NULL issue.';
