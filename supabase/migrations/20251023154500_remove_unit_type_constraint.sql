-- Migration: Remove unit_type constraint
-- Date: 2025-10-23
-- Purpose: Allow any unit_type value from MotoPress without guessing

-- Drop the constraint that limits unit_type to 'room', 'apartment', 'suite'
ALTER TABLE hotels.accommodation_units
DROP CONSTRAINT IF EXISTS accommodation_units_unit_type_check;

-- Now unit_type can be any VARCHAR value from MotoPress
COMMENT ON COLUMN hotels.accommodation_units.unit_type IS
'Unit type as provided by MotoPress (e.g., "1 - 2 personas", "5 - 10 personas", etc.). No constraints - uses exact value from source system.';
