-- Migration: Manual Analytics System
-- Description: Track usage metrics for accommodation manuals (uploads, views, search hits, deletions)
-- Created: 2025-11-09

-- =============================================
-- 0. CREATE TABLE: accommodation_manuals (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS accommodation_manuals (
  -- Identificadores
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_unit_id   UUID NOT NULL,  -- References hotels.accommodation_units(id)
  tenant_id               UUID NOT NULL,  -- References tenant_registry(tenant_id)

  -- Metadata del archivo
  filename                VARCHAR NOT NULL,
  file_type               VARCHAR NOT NULL,          -- 'markdown'
  chunk_count             INTEGER NOT NULL DEFAULT 0,

  -- Estado de procesamiento
  status                  VARCHAR NOT NULL DEFAULT 'processing',  -- 'processing' | 'completed' | 'failed'
  error_message           TEXT,                      -- Si status = 'failed'
  processed_at            TIMESTAMPTZ,               -- Cuando se completó

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for accommodation_manuals
CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_unit ON accommodation_manuals(accommodation_unit_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_tenant ON accommodation_manuals(tenant_id);

-- =============================================
-- 1. CREATE TABLE: accommodation_manual_analytics
-- =============================================

CREATE TABLE IF NOT EXISTS accommodation_manual_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID REFERENCES accommodation_manuals(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,  -- Tracking only, no FK constraint
  event_type TEXT NOT NULL CHECK (event_type IN ('upload', 'view', 'search_hit', 'delete')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================

-- Index for queries by manual_id
CREATE INDEX IF NOT EXISTS idx_manual_analytics_manual_id ON accommodation_manual_analytics(manual_id);

-- Index for queries by event_type
CREATE INDEX IF NOT EXISTS idx_manual_analytics_event_type ON accommodation_manual_analytics(event_type);

-- Index for queries by tenant_id (multi-tenant support)
CREATE INDEX IF NOT EXISTS idx_manual_analytics_tenant_id ON accommodation_manual_analytics(tenant_id);

-- Index for queries by accommodation_unit_id
CREATE INDEX IF NOT EXISTS idx_manual_analytics_unit_id ON accommodation_manual_analytics(accommodation_unit_id);

-- Composite index for time-series queries (tenant + created_at)
CREATE INDEX IF NOT EXISTS idx_manual_analytics_tenant_created ON accommodation_manual_analytics(tenant_id, created_at DESC);

-- Composite index for unit analytics (unit + event + created_at)
CREATE INDEX IF NOT EXISTS idx_manual_analytics_unit_event_created ON accommodation_manual_analytics(accommodation_unit_id, event_type, created_at DESC);

-- =============================================
-- 3. HELPER FUNCTION: Log Analytics Event
-- =============================================

CREATE OR REPLACE FUNCTION log_manual_analytics_event(
  p_manual_id UUID,
  p_tenant_id UUID,
  p_accommodation_unit_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Validate event_type
  IF p_event_type NOT IN ('upload', 'view', 'search_hit', 'delete') THEN
    RAISE EXCEPTION 'Invalid event_type: %. Must be one of: upload, view, search_hit, delete', p_event_type;
  END IF;

  -- Insert analytics event
  INSERT INTO accommodation_manual_analytics (
    manual_id,
    tenant_id,
    accommodation_unit_id,
    event_type,
    metadata,
    created_at
  ) VALUES (
    p_manual_id,
    p_tenant_id,
    p_accommodation_unit_id,
    p_event_type,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- =============================================
-- 4. COMMENT ON TABLE AND COLUMNS
-- =============================================

COMMENT ON TABLE accommodation_manual_analytics IS 'Analytics events for accommodation manuals tracking usage patterns';
COMMENT ON COLUMN accommodation_manual_analytics.manual_id IS 'Reference to the manual (nullable for delete events where manual is already gone)';
COMMENT ON COLUMN accommodation_manual_analytics.tenant_id IS 'Tenant who owns the manual';
COMMENT ON COLUMN accommodation_manual_analytics.accommodation_unit_id IS 'Accommodation unit the manual belongs to';
COMMENT ON COLUMN accommodation_manual_analytics.event_type IS 'Type of event: upload, view, search_hit, delete';
COMMENT ON COLUMN accommodation_manual_analytics.metadata IS 'Additional event data (e.g., search query, user agent, etc.)';
COMMENT ON COLUMN accommodation_manual_analytics.created_at IS 'Timestamp when the event occurred';
