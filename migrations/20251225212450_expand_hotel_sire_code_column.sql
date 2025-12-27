-- Expand hotel_sire_code column to accommodate Colombian NIT (9-10 digits)
-- Previous: varchar(6) - too small for NIT without verification digit
-- New: varchar(15) - safe margin for NIT codes
-- Also drop the outdated constraint that expected 4-6 digits

-- Expand column type
ALTER TABLE guest_reservations
ALTER COLUMN hotel_sire_code TYPE varchar(15);

-- Drop outdated constraint (NIT can be 9+ digits, not 4-6)
ALTER TABLE guest_reservations
DROP CONSTRAINT IF EXISTS check_hotel_sire_code_format;
