-- Migration: Add reservation_guests table for SIRE compliance
-- Purpose: Store individual guest data (titular + companions) for SIRE TXT export
-- Each person in a reservation gets their own row with 13 SIRE fields
-- Decision: NO migration of existing data - only new reservations will use this table

-- ============================================================================
-- TABLE: reservation_guests
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reservation_guests') THEN
    CREATE TABLE reservation_guests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL,
      tenant_id VARCHAR NOT NULL,

      -- Guest identification within reservation
      guest_order INTEGER NOT NULL DEFAULT 1,          -- 1=titular, 2+=companions
      is_primary_guest BOOLEAN NOT NULL DEFAULT false, -- true for titular only
      guest_type VARCHAR(10) DEFAULT 'adult',          -- 'adult', 'child', 'infant'
      guest_name VARCHAR(200),                         -- Full display name (convenience)

      -- 13 SIRE fields (individual per person)
      -- Fields 1-2 (hotel_sire_code, hotel_city_code) come from tenant_registry
      document_type VARCHAR(2),                        -- Field 3: '3', '5', '10', '46'
      document_number VARCHAR(20),                     -- Field 4: No hyphens, alphanumeric
      first_surname VARCHAR(50),                       -- Field 6: UPPERCASE
      second_surname VARCHAR(50),                      -- Field 7: UPPERCASE or empty
      given_names VARCHAR(100),                        -- Field 8: UPPERCASE
      birth_date DATE,                                 -- Field 13: For DD/MM/YYYY
      nationality_code VARCHAR(3),                     -- Field 5: SIRE code (249=USA, 169=COL)
      origin_city_code VARCHAR(6),                     -- Field 11: DIVIPOLA or SIRE country
      destination_city_code VARCHAR(6),                -- Field 12: DIVIPOLA or SIRE country
      -- Fields 9-10 (movement_type, movement_date) derived from check_in/check_out

      -- Metadata
      sire_status VARCHAR(20) DEFAULT 'pending',       -- 'pending', 'complete', 'exported'
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

      -- Foreign key constraint
      CONSTRAINT fk_reservation_guests_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES guest_reservations(id)
        ON DELETE CASCADE,

      -- Ensure unique guest order per reservation
      CONSTRAINT uq_reservation_guests_order
        UNIQUE(reservation_id, guest_order)
    );

    RAISE NOTICE 'Created table: reservation_guests';
  ELSE
    RAISE NOTICE 'Table reservation_guests already exists, skipping creation';
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservation_guests_reservation') THEN
    CREATE INDEX idx_reservation_guests_reservation ON reservation_guests(reservation_id);
    RAISE NOTICE 'Created index: idx_reservation_guests_reservation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservation_guests_tenant') THEN
    CREATE INDEX idx_reservation_guests_tenant ON reservation_guests(tenant_id);
    RAISE NOTICE 'Created index: idx_reservation_guests_tenant';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservation_guests_status') THEN
    CREATE INDEX idx_reservation_guests_status ON reservation_guests(sire_status);
    RAISE NOTICE 'Created index: idx_reservation_guests_status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservation_guests_nationality') THEN
    CREATE INDEX idx_reservation_guests_nationality ON reservation_guests(nationality_code);
    RAISE NOTICE 'Created index: idx_reservation_guests_nationality';
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS tenant_isolation_reservation_guests ON reservation_guests;
DROP POLICY IF EXISTS service_role_full_access_reservation_guests ON reservation_guests;

-- Tenant isolation policy
CREATE POLICY tenant_isolation_reservation_guests ON reservation_guests
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Service role full access
CREATE POLICY service_role_full_access_reservation_guests ON reservation_guests
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
    WHERE tgname = 'set_reservation_guests_updated_at'
  ) THEN
    CREATE TRIGGER set_reservation_guests_updated_at
      BEFORE UPDATE ON reservation_guests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    RAISE NOTICE 'Created trigger: set_reservation_guests_updated_at';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE reservation_guests IS 'Individual guest records for SIRE compliance. One row per person (titular + companions).';
COMMENT ON COLUMN reservation_guests.guest_order IS '1 = titular (primary guest), 2+ = companions';
COMMENT ON COLUMN reservation_guests.is_primary_guest IS 'True only for the titular guest (guest_order = 1)';
COMMENT ON COLUMN reservation_guests.document_type IS 'SIRE document type: 3=Passport, 5=Cedula Extranjeria, 10=Mercosur, 46=Diplomatic';
COMMENT ON COLUMN reservation_guests.nationality_code IS 'SIRE country code (NOT ISO 3166-1). USA=249, Colombia=169';
COMMENT ON COLUMN reservation_guests.sire_status IS 'pending=missing fields, complete=ready for export, exported=already in TXT';
