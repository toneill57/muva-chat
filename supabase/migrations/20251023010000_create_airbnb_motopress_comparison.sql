-- Migration: Create Airbnb-MotoPress Comparison Table
-- Purpose: Store Airbnb reservations reported by MotoPress API for double-check validation
-- Date: 2025-10-23
--
-- Background:
-- MotoPress syncs Airbnb ICS feeds internally. When we fetch bookings from MotoPress API,
-- we receive BOTH direct MotoPress bookings AND Airbnb reservations (duplicates).
-- This table stores the Airbnb reservations from MotoPress for comparison with direct ICS sync.

-- ============================================================================
-- Table: airbnb_motopress_comparison
-- ============================================================================

CREATE TABLE IF NOT EXISTS airbnb_motopress_comparison (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,

  -- MotoPress Booking Data
  motopress_booking_id text NOT NULL,  -- MotoPress internal booking ID (e.g., "33280")
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  accommodation_unit_id uuid REFERENCES accommodation_units_public(unit_id),

  -- Guest Capacity
  adults int DEFAULT 1,
  children int DEFAULT 0,

  -- Pricing
  total_price numeric(10, 2),
  currency text DEFAULT 'COP',

  -- Comparison Metadata
  synced_from_motopress_at timestamptz NOT NULL DEFAULT now(),
  matched_with_ics boolean DEFAULT false,
  ics_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL,  -- Link to direct ICS sync

  -- Discrepancy Detection
  data_differences jsonb,  -- JSON with differences: {"price": {"motopress": 1000, "ics": 1100}}
  match_confidence numeric(3, 2),  -- 0.00 to 1.00 (1.00 = perfect match)

  -- Raw Data for Debugging
  raw_motopress_data jsonb NOT NULL,  -- Full MotoPress booking JSON

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(tenant_id, motopress_booking_id, check_in_date, accommodation_unit_id)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_airbnb_motopress_comparison_tenant
  ON airbnb_motopress_comparison(tenant_id);

CREATE INDEX idx_airbnb_motopress_comparison_dates
  ON airbnb_motopress_comparison(check_in_date, check_out_date);

CREATE INDEX idx_airbnb_motopress_comparison_unit
  ON airbnb_motopress_comparison(accommodation_unit_id);

CREATE INDEX idx_airbnb_motopress_comparison_matched
  ON airbnb_motopress_comparison(matched_with_ics)
  WHERE matched_with_ics = false;

-- ============================================================================
-- Trigger: Update updated_at on modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_airbnb_motopress_comparison_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_airbnb_motopress_comparison_updated_at
  BEFORE UPDATE ON airbnb_motopress_comparison
  FOR EACH ROW
  EXECUTE FUNCTION update_airbnb_motopress_comparison_updated_at();

-- ============================================================================
-- RLS (Row Level Security) - Multi-tenant isolation
-- ============================================================================

ALTER TABLE airbnb_motopress_comparison ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their own comparison data
CREATE POLICY airbnb_motopress_comparison_tenant_isolation
  ON airbnb_motopress_comparison
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM tenant_registry
      WHERE tenant_id = airbnb_motopress_comparison.tenant_id
    )
  );

-- Policy: Service role has full access (for sync scripts)
CREATE POLICY airbnb_motopress_comparison_service_role
  ON airbnb_motopress_comparison
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE airbnb_motopress_comparison IS
  'Stores Airbnb reservations reported by MotoPress API for double-check validation against direct ICS sync';

COMMENT ON COLUMN airbnb_motopress_comparison.motopress_booking_id IS
  'MotoPress internal booking ID (numeric string)';

COMMENT ON COLUMN airbnb_motopress_comparison.matched_with_ics IS
  'TRUE if matched with a calendar_event from direct Airbnb ICS sync';

COMMENT ON COLUMN airbnb_motopress_comparison.ics_event_id IS
  'Foreign key to calendar_events.id - links to corresponding ICS event if match found';

COMMENT ON COLUMN airbnb_motopress_comparison.data_differences IS
  'JSON object with detected differences between MotoPress and ICS data';

COMMENT ON COLUMN airbnb_motopress_comparison.match_confidence IS
  'Confidence score (0.00-1.00) for the match between MotoPress and ICS data';

COMMENT ON COLUMN airbnb_motopress_comparison.raw_motopress_data IS
  'Full JSON of MotoPress booking for debugging and auditing';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON airbnb_motopress_comparison TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON airbnb_motopress_comparison TO service_role;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Table airbnb_motopress_comparison created successfully';
  RAISE NOTICE '📊 Purpose: Double-check Airbnb data between MotoPress API and direct ICS sync';
END $$;
