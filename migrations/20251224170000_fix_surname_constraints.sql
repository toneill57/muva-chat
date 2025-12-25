-- Fix surname constraints to allow apostrophes and hyphens (common in international names)
-- Examples: O'Neill, Mary-Anne, D'Angelo, Jean-Pierre

ALTER TABLE guest_reservations
DROP CONSTRAINT IF EXISTS check_first_surname_format;

ALTER TABLE guest_reservations
DROP CONSTRAINT IF EXISTS check_second_surname_format;

-- Add updated constraints allowing apostrophes and hyphens
ALTER TABLE guest_reservations
ADD CONSTRAINT check_first_surname_format
CHECK (first_surname IS NULL OR first_surname ~ '^[A-ZÁÉÍÓÚÑ ''-]{1,50}$');

ALTER TABLE guest_reservations
ADD CONSTRAINT check_second_surname_format
CHECK (second_surname IS NULL OR second_surname ~ '^[A-ZÁÉÍÓÚÑ ''-]{0,50}$');

COMMENT ON CONSTRAINT check_first_surname_format ON guest_reservations IS 'Allows uppercase letters, accents, spaces, apostrophes, and hyphens';
COMMENT ON CONSTRAINT check_second_surname_format ON guest_reservations IS 'Allows uppercase letters, accents, spaces, apostrophes, and hyphens (optional field)';
