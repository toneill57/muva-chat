-- ================================================================
-- SIRE COMPLIANCE MIGRATION VALIDATION QUERIES
-- ================================================================
-- Purpose: Verify successful migration of SIRE compliance fields
-- to guest_reservations table
-- Date: October 2025
-- ================================================================

-- ================================================================
-- QUERY 1: Schema Validation
-- ================================================================
-- Expected: 9 rows showing SIRE fields with correct data types
-- All fields should exist with appropriate types (varchar, date, text)
-- ================================================================

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  character_maximum_length
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

-- ================================================================
-- QUERY 2: Data Completeness Check
-- ================================================================
-- Expected: Counts should match compliance submissions data
-- with_document, with_birthdate, with_surname should be > 0 if
-- any compliance submissions exist
-- ================================================================

SELECT
  COUNT(*) FILTER (WHERE document_number IS NOT NULL) as with_document,
  COUNT(*) FILTER (WHERE birth_date IS NOT NULL) as with_birthdate,
  COUNT(*) FILTER (WHERE first_surname IS NOT NULL) as with_surname,
  COUNT(*) FILTER (WHERE given_names IS NOT NULL) as with_given_names,
  COUNT(*) FILTER (WHERE nationality_code IS NOT NULL) as with_nationality,
  COUNT(*) FILTER (WHERE origin_country_code IS NOT NULL) as with_origin,
  COUNT(*) FILTER (WHERE destination_country_code IS NOT NULL) as with_destination,
  COUNT(*) as total_reservations
FROM guest_reservations;

-- ================================================================
-- QUERY 3: Constraint Violations Check
-- ================================================================
-- Expected: 0 rows (no violations)
-- This query identifies any data that violates SIRE constraints
-- ================================================================

SELECT id, document_type, document_number, 'Invalid document_type (must be 3, 5, 10, or 46)' as issue
FROM guest_reservations
WHERE document_type IS NOT NULL
  AND document_type NOT IN ('3', '5', '10', '46')

UNION ALL

SELECT id, document_type, nationality_code, 'Invalid nationality_code format (must be numeric)' as issue
FROM guest_reservations
WHERE nationality_code IS NOT NULL
  AND nationality_code !~ '^[0-9]+$'

UNION ALL

SELECT id, document_type, origin_country_code, 'Invalid origin_country_code format (must be numeric)' as issue
FROM guest_reservations
WHERE origin_country_code IS NOT NULL
  AND origin_country_code !~ '^[0-9]+$'

UNION ALL

SELECT id, document_type, destination_country_code, 'Invalid destination_country_code format (must be numeric)' as issue
FROM guest_reservations
WHERE destination_country_code IS NOT NULL
  AND destination_country_code !~ '^[0-9]+$'

UNION ALL

SELECT id, document_type, document_number, 'Missing document_number when document_type exists' as issue
FROM guest_reservations
WHERE document_type IS NOT NULL
  AND (document_number IS NULL OR document_number = '')

ORDER BY id;

-- ================================================================
-- QUERY 4: Migration Completeness Check
-- ================================================================
-- Expected: 0 rows (all compliance data migrated)
-- This query finds successful compliance submissions that weren't
-- migrated to guest_reservations
-- ================================================================

SELECT
  gr.id,
  gr.guest_name,
  gr.document_number as reservations_doc,
  cs.data->>'numero_identificacion' as submissions_doc,
  cs.submitted_at,
  cs.status
FROM guest_reservations gr
LEFT JOIN compliance_submissions cs ON cs.guest_id = gr.id
WHERE cs.status = 'success'
  AND gr.document_number IS NULL
ORDER BY cs.submitted_at DESC;

-- ================================================================
-- QUERY 5: Index Validation
-- ================================================================
-- Expected: At least 2 indexes (document, nationality)
-- Verifies performance optimization indexes are in place
-- ================================================================

SELECT 
  indexname, 
  indexdef,
  tablename
FROM pg_indexes
WHERE tablename = 'guest_reservations'
  AND indexname LIKE 'idx_guest_reservations_%'
ORDER BY indexname;

-- ================================================================
-- QUERY 6 (BONUS): Data Quality Summary
-- ================================================================
-- Provides overall health metrics for SIRE compliance data
-- ================================================================

WITH sire_completeness AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (
      WHERE document_number IS NOT NULL
        AND birth_date IS NOT NULL
        AND first_surname IS NOT NULL
        AND nationality_code IS NOT NULL
    ) as complete_records,
    COUNT(*) FILTER (WHERE document_number IS NOT NULL) as partial_records
  FROM guest_reservations
)
SELECT
  total,
  complete_records,
  partial_records,
  ROUND(100.0 * complete_records / NULLIF(total, 0), 2) as complete_percentage,
  ROUND(100.0 * partial_records / NULLIF(total, 0), 2) as partial_percentage
FROM sire_completeness;

-- ================================================================
-- END OF VALIDATION QUERIES
-- ================================================================
