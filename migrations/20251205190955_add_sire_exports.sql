-- Migration: Add sire_exports table for tracking TXT file generations
-- Purpose: Track each TXT export for audit trail and duplicate detection

-- ============================================================================
-- TABLE: sire_exports
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sire_exports') THEN
    CREATE TABLE sire_exports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR NOT NULL,

      -- Export metadata
      export_date DATE NOT NULL,                       -- Date when export was generated
      date_range_from DATE,                            -- Start of date range for reservations
      date_range_to DATE,                              -- End of date range for reservations
      movement_type VARCHAR(1),                        -- 'E', 'S', or NULL for both

      -- Statistics
      reservation_count INTEGER DEFAULT 0,             -- Number of reservations included
      guest_count INTEGER DEFAULT 0,                   -- Total persons (titular + companions)
      line_count INTEGER DEFAULT 0,                    -- Total lines in TXT (guests × movements)
      excluded_count INTEGER DEFAULT 0,                -- Number of guests excluded (incomplete data)

      -- File info
      txt_filename VARCHAR(100),                       -- e.g., 'SIRE_2025-12-05_E.txt'
      txt_content_hash VARCHAR(64),                    -- SHA-256 hash to detect duplicates
      file_size_bytes INTEGER,                         -- Size of generated file

      -- Status tracking
      status VARCHAR(20) DEFAULT 'generated',          -- 'generated', 'downloaded', 'uploaded', 'confirmed'
      uploaded_at TIMESTAMPTZ,                         -- When uploaded to SIRE portal
      confirmed_at TIMESTAMPTZ,                        -- When SIRE confirmed receipt
      sire_reference VARCHAR(50),                      -- Reference number from SIRE (if available)

      -- Audit
      generated_by VARCHAR(100),                       -- User who generated the export
      notes TEXT,                                      -- Any notes about this export
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    RAISE NOTICE 'Created table: sire_exports';
  ELSE
    RAISE NOTICE 'Table sire_exports already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sire_exports_tenant_date') THEN
    CREATE INDEX idx_sire_exports_tenant_date ON sire_exports(tenant_id, export_date DESC);
    RAISE NOTICE 'Created index: idx_sire_exports_tenant_date';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sire_exports_status') THEN
    CREATE INDEX idx_sire_exports_status ON sire_exports(status);
    RAISE NOTICE 'Created index: idx_sire_exports_status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sire_exports_hash') THEN
    CREATE INDEX idx_sire_exports_hash ON sire_exports(txt_content_hash);
    RAISE NOTICE 'Created index: idx_sire_exports_hash';
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE sire_exports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tenant_isolation_sire_exports ON sire_exports;
DROP POLICY IF EXISTS service_role_full_access_sire_exports ON sire_exports;

-- Tenant isolation policy
CREATE POLICY tenant_isolation_sire_exports ON sire_exports
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Service role full access
CREATE POLICY service_role_full_access_sire_exports ON sire_exports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_sire_exports_updated_at'
  ) THEN
    CREATE TRIGGER set_sire_exports_updated_at
      BEFORE UPDATE ON sire_exports
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: set_sire_exports_updated_at';
  END IF;
END $$;

-- ============================================================================
-- JUNCTION TABLE: sire_export_guests (track which guests were included)
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sire_export_guests') THEN
    CREATE TABLE sire_export_guests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      export_id UUID NOT NULL REFERENCES sire_exports(id) ON DELETE CASCADE,
      guest_id UUID NOT NULL REFERENCES reservation_guests(id) ON DELETE CASCADE,
      reservation_id UUID NOT NULL REFERENCES guest_reservations(id) ON DELETE CASCADE,
      movement_type VARCHAR(1) NOT NULL,               -- 'E' or 'S'
      line_number INTEGER,                             -- Position in TXT file
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

      CONSTRAINT uq_export_guest_movement UNIQUE(export_id, guest_id, movement_type)
    );

    CREATE INDEX idx_sire_export_guests_export ON sire_export_guests(export_id);
    CREATE INDEX idx_sire_export_guests_guest ON sire_export_guests(guest_id);

    RAISE NOTICE 'Created table: sire_export_guests';
  ELSE
    RAISE NOTICE 'Table sire_export_guests already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE sire_exports IS 'Tracks each TXT file generation for SIRE compliance audit trail';
COMMENT ON COLUMN sire_exports.txt_content_hash IS 'SHA-256 hash to detect duplicate exports';
COMMENT ON COLUMN sire_exports.status IS 'generated=created, downloaded=by user, uploaded=to SIRE, confirmed=by SIRE';
COMMENT ON TABLE sire_export_guests IS 'Junction table tracking which guests were included in each export';
