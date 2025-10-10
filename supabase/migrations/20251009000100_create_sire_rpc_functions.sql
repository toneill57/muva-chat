-- Migration: Create SIRE RPC functions for data retrieval and export
-- Date: 2025-10-09
-- Purpose: Phase 10.1 - Complete SIRE database layer with RPC functions
-- Impact: Enables efficient SIRE TXT file generation and guest data retrieval

-- ============================================================================
-- STEP 1: Guest Data Retrieval Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sire_guest_data(
  p_reservation_id UUID
)
RETURNS TABLE (
  -- Core reservation fields
  reservation_id UUID,
  reservation_code TEXT,
  tenant_id TEXT,
  guest_name TEXT,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT,
  
  -- SIRE Field 1-2: Hotel identification
  hotel_sire_code TEXT,
  hotel_city_code TEXT,
  
  -- SIRE Field 3-4: Document identification
  document_type TEXT,
  document_type_name TEXT,
  document_number TEXT,
  
  -- SIRE Field 5: Nationality (SIRE country code)
  nationality_code TEXT,
  nationality_name TEXT,
  
  -- SIRE Field 6-8: Guest name (separated per SIRE spec)
  first_surname TEXT,
  second_surname TEXT,
  given_names TEXT,
  
  -- SIRE Field 9-10: Movement tracking
  movement_type TEXT,
  movement_date DATE,
  
  -- SIRE Field 11: Origin (procedencia)
  origin_city_code TEXT,
  origin_city_name TEXT,
  
  -- SIRE Field 12: Destination (destino)
  destination_city_code TEXT,
  destination_city_name TEXT,
  
  -- SIRE Field 13: Birth date
  birth_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Core fields
    gr.id,
    gr.reservation_code,
    gr.tenant_id,
    gr.guest_name,
    gr.check_in_date,
    gr.check_out_date,
    gr.status,
    
    -- Hotel identification
    gr.hotel_sire_code,
    gr.hotel_city_code,
    
    -- Document identification with lookup
    gr.document_type,
    sdt.name AS document_type_name,
    gr.document_number,
    
    -- Nationality with lookup
    gr.nationality_code,
    sc_nat.name_es AS nationality_name,
    
    -- Guest names
    gr.first_surname,
    gr.second_surname,
    gr.given_names,
    
    -- Movement
    gr.movement_type,
    gr.movement_date,
    
    -- Origin with lookup (handles both cities and countries)
    gr.origin_city_code,
    COALESCE(
      dcit_orig.name,  -- Colombian city name
      sc_orig.name_es   -- International country name
    ) AS origin_city_name,
    
    -- Destination with lookup (handles both cities and countries)
    gr.destination_city_code,
    COALESCE(
      dcit_dest.name,  -- Colombian city name
      sc_dest.name_es   -- International country name
    ) AS destination_city_name,
    
    -- Birth date
    gr.birth_date
  FROM guest_reservations gr
  
  -- Join catalog tables for human-readable names
  LEFT JOIN sire_document_types sdt ON gr.document_type = sdt.code
  LEFT JOIN sire_countries sc_nat ON gr.nationality_code = sc_nat.sire_code
  LEFT JOIN sire_cities dcit_orig ON gr.origin_city_code = dcit_orig.code
  LEFT JOIN sire_countries sc_orig ON gr.origin_city_code = sc_orig.iso_code
  LEFT JOIN sire_cities dcit_dest ON gr.destination_city_code = dcit_dest.code
  LEFT JOIN sire_countries sc_dest ON gr.destination_city_code = sc_dest.sire_code
  
  WHERE gr.id = p_reservation_id;
END;
$$;

-- Security grants
REVOKE ALL ON FUNCTION get_sire_guest_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sire_guest_data(UUID) TO service_role;

COMMENT ON FUNCTION get_sire_guest_data(UUID) IS
  'Retrieves complete SIRE guest data for a reservation with human-readable catalog lookups. Used for guest data confirmation UI and individual SIRE exports.';

-- ============================================================================
-- STEP 2: Bulk Monthly Export Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sire_monthly_export(
  p_tenant_id TEXT,
  p_year INTEGER,
  p_month INTEGER,
  p_movement_type CHAR(1) DEFAULT NULL  -- 'E' for check-in, 'S' for check-out, NULL for both
)
RETURNS TABLE (
  reservation_id UUID,
  reservation_code TEXT,
  
  -- SIRE Fields in TXT export order
  hotel_sire_code TEXT,
  hotel_city_code TEXT,
  document_type TEXT,
  document_number TEXT,
  nationality_code TEXT,
  first_surname TEXT,
  second_surname TEXT,
  given_names TEXT,
  movement_type TEXT,
  movement_date DATE,
  origin_city_code TEXT,
  destination_city_code TEXT,
  birth_date DATE,
  
  -- Metadata for validation
  guest_name TEXT,
  check_in_date DATE,
  check_out_date DATE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month')::DATE;
  
  RETURN QUERY
  SELECT
    gr.id,
    gr.reservation_code,
    
    -- SIRE fields
    gr.hotel_sire_code,
    gr.hotel_city_code,
    gr.document_type,
    gr.document_number,
    gr.nationality_code,
    gr.first_surname,
    gr.second_surname,
    COALESCE(gr.second_surname, '') AS second_surname_coalesced,
    gr.given_names,
    gr.movement_type,
    gr.movement_date,
    gr.origin_city_code,
    gr.destination_city_code,
    gr.birth_date,
    
    -- Metadata
    gr.guest_name,
    gr.check_in_date,
    gr.check_out_date,
    gr.status
  FROM guest_reservations gr
  WHERE gr.tenant_id = p_tenant_id
    AND gr.movement_date >= v_start_date
    AND gr.movement_date < v_end_date
    AND (p_movement_type IS NULL OR gr.movement_type = p_movement_type)
    AND gr.status != 'cancelled'  -- Exclude cancelled reservations
    -- Ensure all SIRE mandatory fields are present
    AND gr.hotel_sire_code IS NOT NULL
    AND gr.document_type IS NOT NULL
    AND gr.document_number IS NOT NULL
    AND gr.nationality_code IS NOT NULL
    AND gr.first_surname IS NOT NULL
    AND gr.given_names IS NOT NULL
    AND gr.movement_type IS NOT NULL
    AND gr.movement_date IS NOT NULL
  ORDER BY gr.movement_date ASC, gr.created_at ASC;
END;
$$;

-- Security grants
REVOKE ALL ON FUNCTION get_sire_monthly_export(TEXT, INTEGER, INTEGER, CHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_monthly_export(TEXT, INTEGER, INTEGER, CHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sire_monthly_export(TEXT, INTEGER, INTEGER, CHAR) TO service_role;

COMMENT ON FUNCTION get_sire_monthly_export(TEXT, INTEGER, INTEGER, CHAR) IS
  'Retrieves all SIRE-compliant reservations for monthly TXT export. Filters by movement_date (check-in or check-out) and ensures all mandatory SIRE fields are present. Used for automated monthly SIRE reporting.';

-- ============================================================================
-- STEP 3: SIRE Data Completeness Check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sire_data_completeness(
  p_reservation_id UUID
)
RETURNS TABLE (
  is_complete BOOLEAN,
  missing_fields TEXT[],
  validation_errors TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reservation RECORD;
  v_missing TEXT[] := '{}';
  v_errors TEXT[] := '{}';
BEGIN
  -- Fetch reservation
  SELECT * INTO v_reservation
  FROM guest_reservations
  WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY['reservation_not_found']::TEXT[], ARRAY['Reservation does not exist']::TEXT[];
    RETURN;
  END IF;
  
  -- Check mandatory SIRE fields
  IF v_reservation.hotel_sire_code IS NULL THEN
    v_missing := array_append(v_missing, 'hotel_sire_code');
  END IF;
  
  IF v_reservation.hotel_city_code IS NULL THEN
    v_missing := array_append(v_missing, 'hotel_city_code');
  END IF;
  
  IF v_reservation.document_type IS NULL THEN
    v_missing := array_append(v_missing, 'document_type');
  END IF;
  
  IF v_reservation.document_number IS NULL THEN
    v_missing := array_append(v_missing, 'document_number');
  END IF;
  
  IF v_reservation.nationality_code IS NULL THEN
    v_missing := array_append(v_missing, 'nationality_code');
  END IF;
  
  IF v_reservation.first_surname IS NULL THEN
    v_missing := array_append(v_missing, 'first_surname');
  END IF;
  
  IF v_reservation.given_names IS NULL THEN
    v_missing := array_append(v_missing, 'given_names');
  END IF;
  
  IF v_reservation.movement_type IS NULL THEN
    v_missing := array_append(v_missing, 'movement_type');
  END IF;
  
  IF v_reservation.movement_date IS NULL THEN
    v_missing := array_append(v_missing, 'movement_date');
  END IF;
  
  -- Optional fields (origin, destination, birth_date, second_surname) not checked
  
  -- Additional validation checks
  IF v_reservation.document_type IS NOT NULL AND v_reservation.document_type NOT IN ('3', '5', '10', '46') THEN
    v_errors := array_append(v_errors, 'Invalid document_type: must be 3, 5, 10, or 46');
  END IF;
  
  IF v_reservation.movement_type IS NOT NULL AND v_reservation.movement_type NOT IN ('E', 'S') THEN
    v_errors := array_append(v_errors, 'Invalid movement_type: must be E or S');
  END IF;
  
  IF v_reservation.nationality_code IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sire_countries WHERE sire_code = v_reservation.nationality_code
  ) THEN
    v_errors := array_append(v_errors, format('Unknown nationality_code: %s', v_reservation.nationality_code));
  END IF;
  
  -- Return result
  RETURN QUERY SELECT
    (array_length(v_missing, 1) IS NULL AND array_length(v_errors, 1) IS NULL) AS is_complete,
    v_missing,
    v_errors;
END;
$$;

-- Security grants
REVOKE ALL ON FUNCTION check_sire_data_completeness(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_sire_data_completeness(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_sire_data_completeness(UUID) TO service_role;

COMMENT ON FUNCTION check_sire_data_completeness(UUID) IS
  'Validates SIRE data completeness for a reservation. Returns is_complete flag, list of missing mandatory fields, and validation errors. Used before TXT export to ensure data quality.';

-- ============================================================================
-- STEP 4: SIRE Statistics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sire_statistics(
  p_tenant_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_reservations BIGINT,
  sire_complete_reservations BIGINT,
  sire_incomplete_reservations BIGINT,
  completion_rate NUMERIC,
  
  -- Breakdown by movement type
  check_ins_complete BIGINT,
  check_outs_complete BIGINT,
  
  -- Top nationalities
  top_nationalities JSONB,
  
  -- Missing field statistics
  missing_hotel_code BIGINT,
  missing_document BIGINT,
  missing_nationality BIGINT,
  missing_names BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total BIGINT;
  v_complete BIGINT;
  v_top_nationalities JSONB;
BEGIN
  -- Count total reservations in period
  SELECT COUNT(*) INTO v_total
  FROM guest_reservations
  WHERE tenant_id = p_tenant_id
    AND movement_date >= p_start_date
    AND movement_date <= p_end_date
    AND status != 'cancelled';
  
  -- Count complete SIRE reservations
  SELECT COUNT(*) INTO v_complete
  FROM guest_reservations
  WHERE tenant_id = p_tenant_id
    AND movement_date >= p_start_date
    AND movement_date <= p_end_date
    AND status != 'cancelled'
    AND hotel_sire_code IS NOT NULL
    AND document_type IS NOT NULL
    AND document_number IS NOT NULL
    AND nationality_code IS NOT NULL
    AND first_surname IS NOT NULL
    AND given_names IS NOT NULL
    AND movement_type IS NOT NULL
    AND movement_date IS NOT NULL;
  
  -- Get top 5 nationalities
  SELECT jsonb_agg(row_to_json(t)) INTO v_top_nationalities
  FROM (
    SELECT
      sc.name_es AS country,
      COUNT(*) AS count
    FROM guest_reservations gr
    LEFT JOIN sire_countries sc ON gr.nationality_code = sc.sire_code
    WHERE gr.tenant_id = p_tenant_id
      AND gr.movement_date >= p_start_date
      AND gr.movement_date <= p_end_date
      AND gr.status != 'cancelled'
      AND gr.nationality_code IS NOT NULL
    GROUP BY sc.name_es
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) t;
  
  -- Return aggregated statistics
  RETURN QUERY
  SELECT
    v_total,
    v_complete,
    v_total - v_complete AS incomplete,
    CASE WHEN v_total > 0 THEN ROUND((v_complete::NUMERIC / v_total * 100), 2) ELSE 0 END AS rate,
    
    -- Movement type breakdown
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND movement_type = 'E' AND status != 'cancelled' AND hotel_sire_code IS NOT NULL AND document_type IS NOT NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND movement_type = 'S' AND status != 'cancelled' AND hotel_sire_code IS NOT NULL AND document_type IS NOT NULL),
    
    v_top_nationalities,
    
    -- Missing fields
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND hotel_sire_code IS NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND (document_type IS NULL OR document_number IS NULL)),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND nationality_code IS NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND (first_surname IS NULL OR given_names IS NULL));
END;
$$;

-- Security grants
REVOKE ALL ON FUNCTION get_sire_statistics(TEXT, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sire_statistics(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sire_statistics(TEXT, DATE, DATE) TO service_role;

COMMENT ON FUNCTION get_sire_statistics(TEXT, DATE, DATE) IS
  'Generates SIRE compliance statistics for a tenant in a date range. Returns completion rates, top nationalities, and missing field counts. Used for compliance dashboards and monitoring.';

-- ============================================================================
-- STEP 5: Create Performance Indexes
-- ============================================================================

-- Index for monthly export queries (most common query pattern)
DROP INDEX IF EXISTS idx_guest_reservations_sire_export;
CREATE INDEX idx_guest_reservations_sire_export
  ON guest_reservations(tenant_id, movement_date, movement_type, status)
  WHERE movement_date IS NOT NULL AND status != 'cancelled';

-- Index for SIRE code lookups on origin/destination
DROP INDEX IF EXISTS idx_guest_reservations_origin_destination;
CREATE INDEX idx_guest_reservations_origin_destination
  ON guest_reservations(origin_city_code, destination_city_code)
  WHERE origin_city_code IS NOT NULL OR destination_city_code IS NOT NULL;

-- Index for hotel SIRE code filtering
DROP INDEX IF EXISTS idx_guest_reservations_hotel_sire_code;
CREATE INDEX idx_guest_reservations_hotel_sire_code
  ON guest_reservations(hotel_sire_code)
  WHERE hotel_sire_code IS NOT NULL;

-- ============================================================================
-- STEP 6: Add Table Constraints (if not exists)
-- ============================================================================

-- Ensure tenant_id is NOT NULL (critical for RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'guest_reservations_tenant_id_not_null'
  ) THEN
    ALTER TABLE guest_reservations ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of RPC Functions Created:
-- 1. get_sire_guest_data(reservation_id) - Individual guest SIRE data with catalog lookups
-- 2. get_sire_monthly_export(tenant_id, year, month, movement_type) - Bulk export for monthly reporting
-- 3. check_sire_data_completeness(reservation_id) - Validation before export
-- 4. get_sire_statistics(tenant_id, start_date, end_date) - Compliance monitoring

-- Performance Indexes Created:
-- 1. idx_guest_reservations_sire_export - Optimizes monthly export queries
-- 2. idx_guest_reservations_origin_destination - Optimizes geographic lookups
-- 3. idx_guest_reservations_hotel_sire_code - Optimizes hotel filtering

-- Next Steps:
-- 1. Test RPC functions with sample data
-- 2. Verify RLS policies (next migration)
-- 3. Update TypeScript types: mcp__supabase__generate_typescript_types
-- 4. Create SIRE TXT export script using these functions
-- 5. Run security advisors to verify no issues
