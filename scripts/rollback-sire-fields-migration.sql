-- ================================================================
-- ROLLBACK SCRIPT: SIRE Compliance Fields Migration
-- ================================================================
-- WARNING: This will DROP all SIRE compliance fields from guest_reservations
-- USE ONLY IF MIGRATION FAILS OR NEEDS TO BE REVERTED
-- 
-- This script will:
-- 1. Drop all SIRE-related indexes
-- 2. Drop all 9 SIRE compliance columns
-- 3. Verify rollback completed successfully
--
-- Date: October 2025
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Drop Indexes
-- ================================================================
-- Remove performance indexes before dropping columns
-- ================================================================

DROP INDEX IF EXISTS idx_guest_reservations_document;
DROP INDEX IF EXISTS idx_guest_reservations_nationality;
DROP INDEX IF EXISTS idx_guest_reservations_birth_date;
DROP INDEX IF EXISTS idx_guest_reservations_origin_country;
DROP INDEX IF EXISTS idx_guest_reservations_destination_country;

-- ================================================================
-- STEP 2: Drop SIRE Compliance Fields
-- ================================================================
-- Removes all 9 SIRE-related columns from guest_reservations
-- ================================================================

ALTER TABLE guest_reservations
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS document_number,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS first_surname,
  DROP COLUMN IF EXISTS second_surname,
  DROP COLUMN IF EXISTS given_names,
  DROP COLUMN IF EXISTS nationality_code,
  DROP COLUMN IF EXISTS origin_country_code,
  DROP COLUMN IF EXISTS destination_country_code;

-- ================================================================
-- STEP 3: Verify Rollback
-- ================================================================
-- This query should return 0 if rollback was successful
-- ================================================================

DO $$
DECLARE
  remaining_columns INT;
BEGIN
  SELECT COUNT(*)
  INTO remaining_columns
  FROM information_schema.columns
  WHERE table_name = 'guest_reservations'
    AND column_name IN (
      'document_type',
      'document_number',
      'birth_date',
      'first_surname',
      'second_surname',
      'given_names',
      'nationality_code',
      'origin_country_code',
      'destination_country_code'
    );
  
  IF remaining_columns > 0 THEN
    RAISE EXCEPTION 'Rollback verification failed: % SIRE columns still exist', remaining_columns;
  ELSE
    RAISE NOTICE 'Rollback successful: All SIRE columns removed';
  END IF;
END $$;

-- ================================================================
-- STEP 4: Final Verification Query
-- ================================================================
-- Run this to confirm no SIRE columns remain
-- Should return 0 rows
-- ================================================================

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'guest_reservations'
  AND column_name IN (
    'document_type',
    'document_number',
    'birth_date',
    'first_surname',
    'second_surname',
    'given_names',
    'nationality_code',
    'origin_country_code',
    'destination_country_code'
  )
ORDER BY column_name;
-- Should return 0 rows

COMMIT;

-- ================================================================
-- ROLLBACK COMPLETE
-- ================================================================
-- If you see "Rollback successful" message, the migration has been
-- fully reverted and guest_reservations is back to pre-migration state.
--
-- NOTE: This does NOT delete compliance_submissions table or data.
-- Compliance submissions remain intact for potential re-migration.
-- ================================================================
