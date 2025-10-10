-- Migration: Add SIRE compliance fields to guest_reservations
-- Date: 2025-10-07
-- Purpose: Persist SIRE data extracted from compliance chat into reservations
-- Phase: FASE 10 - Database Migration

-- ============================================================================
-- STEP 1: Add 9 SIRE columns (all nullable for gradual adoption)
-- ============================================================================

-- SIRE Identity Fields
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS document_type VARCHAR(2);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS document_number VARCHAR(15);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS birth_date DATE;

-- SIRE Name Fields (separated per SIRE requirements, with accents)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS first_surname VARCHAR(50);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS second_surname VARCHAR(50);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS given_names VARCHAR(50);

-- SIRE Country Codes (numeric, supports ISO 3166-1 + DIVIPOLA for cities)
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS nationality_code VARCHAR(3);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS origin_country_code VARCHAR(6);
ALTER TABLE public.guest_reservations ADD COLUMN IF NOT EXISTS destination_country_code VARCHAR(6);

-- ============================================================================
-- STEP 2: Add validation constraints
-- ============================================================================

-- Document type must be one of 4 official SIRE codes
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_document_type;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_document_type
  CHECK (document_type IS NULL OR document_type IN ('3', '5', '10', '46'));

-- Document number: alphanumeric uppercase, 6-15 characters
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_document_number_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_document_number_format
  CHECK (document_number IS NULL OR (LENGTH(document_number) BETWEEN 6 AND 15 AND document_number ~ '^[A-Z0-9]+$'));

-- First surname: letters with accents, uppercase, max 50 chars
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_first_surname_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_first_surname_format
  CHECK (first_surname IS NULL OR first_surname ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

-- Second surname: letters with accents, uppercase, max 50 chars (optional, can be empty)
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_second_surname_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_second_surname_format
  CHECK (second_surname IS NULL OR second_surname ~ '^[A-ZÁÉÍÓÚÑ ]{0,50}$');

-- Given names: letters with accents, uppercase, max 50 chars
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_given_names_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_given_names_format
  CHECK (given_names IS NULL OR given_names ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

-- Nationality code: 1-3 numeric digits
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_nationality_code_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_nationality_code_format
  CHECK (nationality_code IS NULL OR nationality_code ~ '^\d{1,3}$');

-- Origin country code: 1-6 numeric digits (supports DIVIPOLA city codes)
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_origin_code_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_origin_code_format
  CHECK (origin_country_code IS NULL OR origin_country_code ~ '^\d{1,6}$');

-- Destination country code: 1-6 numeric digits
ALTER TABLE public.guest_reservations DROP CONSTRAINT IF EXISTS check_destination_code_format;
ALTER TABLE public.guest_reservations ADD CONSTRAINT check_destination_code_format
  CHECK (destination_country_code IS NULL OR destination_country_code ~ '^\d{1,6}$');

-- ============================================================================
-- STEP 3: Create indexes for common queries
-- ============================================================================

-- Index for compliance audits (search by document number)
DROP INDEX IF EXISTS idx_guest_reservations_document;
CREATE INDEX idx_guest_reservations_document ON public.guest_reservations(document_number) WHERE document_number IS NOT NULL;

-- Index for reports by nationality
DROP INDEX IF EXISTS idx_guest_reservations_nationality;
CREATE INDEX idx_guest_reservations_nationality ON public.guest_reservations(nationality_code) WHERE nationality_code IS NOT NULL;

-- ============================================================================
-- STEP 4: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.guest_reservations.document_type IS 'SIRE document type code: 3=Pasaporte, 5=Cédula, 10=PEP, 46=Permiso';
COMMENT ON COLUMN public.guest_reservations.document_number IS 'Document ID (alphanumeric uppercase, 6-15 chars)';
COMMENT ON COLUMN public.guest_reservations.birth_date IS 'Guest birth date (YYYY-MM-DD format)';
COMMENT ON COLUMN public.guest_reservations.first_surname IS 'First surname (UPPERCASE with accents, max 50 chars)';
COMMENT ON COLUMN public.guest_reservations.second_surname IS 'Second surname (UPPERCASE with accents, optional)';
COMMENT ON COLUMN public.guest_reservations.given_names IS 'Given names (UPPERCASE with accents, max 50 chars)';
COMMENT ON COLUMN public.guest_reservations.nationality_code IS 'Nationality country code (1-3 numeric digits, SIRE catalog)';
COMMENT ON COLUMN public.guest_reservations.origin_country_code IS 'Origin country/city code (1-6 digits, supports DIVIPOLA)';
COMMENT ON COLUMN public.guest_reservations.destination_country_code IS 'Destination country/city code (1-6 digits, supports DIVIPOLA)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Run data migration script: scripts/migrate-compliance-data-to-reservations.sql
-- 2. Update TypeScript types: mcp__supabase__generate_typescript_types
-- 3. Update API endpoints to persist SIRE data on reservation creation
