-- Migration: Rename misleading "country" columns to "city" (FASE 11.7)
-- Date: 2025-10-09
-- Reason: origin_country_code and destination_country_code say "country" but accept CITY codes (DIVIPOLA 5 digits)
--         This caused confusion 3 times during PHASE 11.6
--         Fields accept BOTH Colombian city codes (DIVIPOLA 5 digits) AND international country codes (SIRE 1-3 digits)
--         But primary use case is cities, so "city" is more accurate than "country"

-- Rename origin_country_code → origin_city_code
ALTER TABLE guest_reservations
  RENAME COLUMN origin_country_code TO origin_city_code;

-- Rename destination_country_code → destination_city_code
ALTER TABLE guest_reservations
  RENAME COLUMN destination_country_code TO destination_city_code;

-- Update comments to clarify field purpose
COMMENT ON COLUMN guest_reservations.origin_city_code IS
  'SIRE Field 11 - Procedencia: City/country guest came FROM before arriving at hotel. Accepts DIVIPOLA city code (5 digits) or SIRE country code (1-3 digits). Example: 11001 (Bogotá) or 249 (USA)';

COMMENT ON COLUMN guest_reservations.destination_city_code IS
  'SIRE Field 12 - Destino: City/country guest is going TO after leaving hotel (NOT the hotel''s city). Accepts DIVIPOLA city code (5 digits) or SIRE country code (1-3 digits). Example: 05001 (Medellín) or 249 (USA)';
