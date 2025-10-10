-- Migration: Add 4 remaining SIRE fields to complete 13 official fields
-- Date: 2025-10-09
-- Purpose: Complete SIRE compliance with all 13 mandatory fields
-- Phase: FASE 11.2 - Database Completion

-- ============================================================================
-- CONTEXT: 13 Campos Oficiales SIRE
-- ============================================================================
-- Ya tenemos 9/13 campos. Faltan:
-- 1. codigo_hotel (SCH registration code)
-- 2. codigo_ciudad (DIVIPOLA city code)
-- 9. tipo_movimiento (E=Entrada, S=Salida)
-- 10. fecha_movimiento (Check-in/Check-out date)

-- ============================================================================
-- STEP 1: Add 4 missing SIRE columns
-- ============================================================================

-- Campo 1: Código del Hotel (SCH - Sistema de Certificación Hotelera)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS hotel_sire_code VARCHAR(6);

-- Campo 2: Código de Ciudad (DIVIPOLA)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS hotel_city_code VARCHAR(6);

-- Campo 9: Tipo de Movimiento (E=Entrada, S=Salida)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS movement_type CHAR(1);

-- Campo 10: Fecha del Movimiento (dd/mm/yyyy en SIRE, pero guardamos como DATE)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS movement_date DATE;

-- ============================================================================
-- STEP 2: Add validation constraints
-- ============================================================================

-- Hotel SIRE code: 4-6 numeric digits
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_hotel_sire_code_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_hotel_sire_code_format
  CHECK (hotel_sire_code IS NULL OR hotel_sire_code ~ '^\d{4,6}$');

-- Hotel city code: 5-6 numeric digits (DIVIPOLA format)
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_hotel_city_code_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_hotel_city_code_format
  CHECK (hotel_city_code IS NULL OR hotel_city_code ~ '^\d{5,6}$');

-- Movement type: only 'E' (Entrada) or 'S' (Salida)
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_movement_type;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_movement_type
  CHECK (movement_type IS NULL OR movement_type IN ('E', 'S'));

-- ============================================================================
-- STEP 3: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.guest_reservations.hotel_sire_code IS 'Código SCH del hotel (4-6 dígitos, asignado por Sistema de Certificación Hotelera)';
COMMENT ON COLUMN public.guest_reservations.hotel_city_code IS 'Código DIVIPOLA de la ciudad donde está ubicado el hotel (5-6 dígitos)';
COMMENT ON COLUMN public.guest_reservations.movement_type IS 'Tipo de movimiento SIRE: E=Entrada (check-in), S=Salida (check-out)';
COMMENT ON COLUMN public.guest_reservations.movement_date IS 'Fecha del movimiento (check-in para E, check-out para S)';

-- ============================================================================
-- STEP 4: Create indexes for SIRE reporting
-- ============================================================================

-- Index for filtering by movement type (Entrada vs Salida)
DROP INDEX IF EXISTS idx_guest_reservations_movement_type;
CREATE INDEX idx_guest_reservations_movement_type
  ON public.guest_reservations(movement_type)
  WHERE movement_type IS NOT NULL;

-- Index for SIRE reports by date range
DROP INDEX IF EXISTS idx_guest_reservations_movement_date;
CREATE INDEX idx_guest_reservations_movement_date
  ON public.guest_reservations(movement_date)
  WHERE movement_date IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETE - Now we have all 13 SIRE fields
-- ============================================================================

-- Summary of 13 SIRE fields in guest_reservations:
-- 1. hotel_sire_code ✅ (NEW)
-- 2. hotel_city_code ✅ (NEW)
-- 3. document_type ✅ (Existing)
-- 4. document_number ✅ (Existing)
-- 5. nationality_code ✅ (Existing)
-- 6. first_surname ✅ (Existing)
-- 7. second_surname ✅ (Existing)
-- 8. given_names ✅ (Existing)
-- 9. movement_type ✅ (NEW)
-- 10. movement_date ✅ (NEW)
-- 11. origin_country_code ✅ (Existing)
-- 12. destination_country_code ✅ (Existing)
-- 13. birth_date ✅ (Existing)

-- Next steps:
-- 1. Update TypeScript types: mcp__supabase__generate_typescript_types
-- 2. Update sire-formatters.ts with 4 new formatters
-- 3. Update ComplianceConfirmation.tsx to show all 13 fields
-- 4. Update updateReservationWithComplianceData() to populate new fields
