-- Data Migration: Populate guest_reservations with compliance_submissions data
-- Date: 2025-10-07
-- Purpose: Backfill SIRE fields from successfully submitted compliance data
-- Run after: 20251007000000_add_sire_fields_to_guest_reservations.sql

-- ============================================================================
-- PREVIEW: Count records that will be updated
-- ============================================================================

SELECT 
  COUNT(*) as total_eligible_updates,
  COUNT(DISTINCT cs.guest_id) as unique_guests
FROM compliance_submissions cs
INNER JOIN guest_reservations gr ON gr.id = cs.guest_id
WHERE cs.status = 'success'
  AND cs.data IS NOT NULL
  AND cs.data->'sire_data' IS NOT NULL;

-- ============================================================================
-- MAIN MIGRATION: Update guest_reservations with compliance data
-- ============================================================================

WITH compliance_data AS (
  SELECT 
    cs.guest_id,
    cs.data->'sire_data'->>'tipo_documento' as document_type,
    cs.data->'sire_data'->>'numero_documento' as document_number,
    (cs.data->'sire_data'->>'fecha_nacimiento')::DATE as birth_date,
    cs.data->'sire_data'->>'primer_apellido' as first_surname,
    cs.data->'sire_data'->>'segundo_apellido' as second_surname,
    cs.data->'sire_data'->>'nombres' as given_names,
    cs.data->'sire_data'->>'codigo_nacionalidad' as nationality_code,
    cs.data->'sire_data'->>'codigo_pais_procedencia' as origin_country_code,
    cs.data->'sire_data'->>'codigo_pais_destino' as destination_country_code,
    cs.submitted_at,
    ROW_NUMBER() OVER (
      PARTITION BY cs.guest_id 
      ORDER BY cs.submitted_at DESC
    ) as rn
  FROM compliance_submissions cs
  WHERE cs.status = 'success'
    AND cs.data IS NOT NULL
    AND cs.data->'sire_data' IS NOT NULL
)
UPDATE guest_reservations gr
SET
  document_type = cd.document_type,
  document_number = cd.document_number,
  birth_date = cd.birth_date,
  first_surname = cd.first_surname,
  second_surname = cd.second_surname,
  given_names = cd.given_names,
  nationality_code = cd.nationality_code,
  origin_country_code = cd.origin_country_code,
  destination_country_code = cd.destination_country_code,
  updated_at = NOW()
FROM compliance_data cd
WHERE gr.id = cd.guest_id
  AND cd.rn = 1  -- Use most recent submission per guest
  AND (
    -- Only update if fields are currently NULL (don't overwrite manual edits)
    gr.document_number IS NULL 
    OR gr.first_surname IS NULL
    OR gr.given_names IS NULL
  );

-- ============================================================================
-- VERIFICATION: Check migration results
-- ============================================================================

SELECT 
  'Before Migration' as status,
  COUNT(*) as total_reservations,
  COUNT(document_number) as with_document,
  COUNT(first_surname) as with_surname,
  COUNT(nationality_code) as with_nationality
FROM guest_reservations;

-- Show sample of migrated records
SELECT 
  id,
  full_name,
  email,
  document_type,
  document_number,
  first_surname || ' ' || COALESCE(second_surname, '') || ', ' || given_names as parsed_name,
  nationality_code
FROM guest_reservations
WHERE document_number IS NOT NULL
LIMIT 5;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To undo migration (set SIRE fields back to NULL):
/*
UPDATE guest_reservations
SET
  document_type = NULL,
  document_number = NULL,
  birth_date = NULL,
  first_surname = NULL,
  second_surname = NULL,
  given_names = NULL,
  nationality_code = NULL,
  origin_country_code = NULL,
  destination_country_code = NULL
WHERE updated_at > '2025-10-07 00:00:00'  -- Adjust timestamp
  AND document_number IS NOT NULL;
*/
