-- Migration: Add Calendar Sync Schema
-- Description: Complete schema for multi-source ICS calendar synchronization
-- Date: 2025-10-22
-- Author: MUVA Engineering Team

-- ============================================================================
-- 1. CALENDAR EVENTS TABLE
-- ============================================================================
-- Primary table for all calendar events from multiple sources
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,

  -- Event Identification
  source VARCHAR(50) NOT NULL CHECK (source IN (
    'airbnb', 'booking.com', 'vrbo', 'motopress',
    'motopress_api', 'manual', 'generic_ics'
  )),
  external_uid VARCHAR(255) NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN (
    'reservation', 'block', 'maintenance', 'parent_block'
  )),

  -- Temporal Data
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- Inclusive (converted from ICS exclusive)
  check_in_time TIME DEFAULT '15:00:00',
  check_out_time TIME DEFAULT '11:00:00',

  -- Event Data
  summary TEXT,
  description TEXT,
  reservation_code VARCHAR(50),
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),
  guest_phone_last4 VARCHAR(4),
  total_guests INTEGER,
  adults INTEGER,
  children INTEGER,
  total_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'COP',

  -- Sync Metadata
  source_priority INTEGER NOT NULL DEFAULT 5 CHECK (source_priority BETWEEN 1 AND 10),
  last_modified TIMESTAMPTZ,
  sequence_number INTEGER DEFAULT 0,
  sync_generation TIMESTAMPTZ,
  ics_dtstamp TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'pending', 'cancelled', 'completed'
  )),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,

  -- Relationships
  parent_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  merged_into_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_event_per_source UNIQUE(tenant_id, source, external_uid),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_guest_count CHECK (
    (total_guests IS NULL) OR
    (total_guests >= 0 AND total_guests <= 50)
  ),
  CONSTRAINT valid_price CHECK (
    (total_price IS NULL) OR
    (total_price >= 0)
  )
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_dates
  ON public.calendar_events(accommodation_unit_id, start_date, end_date)
  WHERE status = 'active' AND NOT is_deleted;

CREATE INDEX idx_calendar_events_tenant_active
  ON public.calendar_events(tenant_id, status)
  WHERE NOT is_deleted;

CREATE INDEX idx_calendar_events_reservation_code
  ON public.calendar_events(reservation_code)
  WHERE reservation_code IS NOT NULL;

CREATE INDEX idx_calendar_events_source
  ON public.calendar_events(source, external_uid);

CREATE INDEX idx_calendar_events_parent
  ON public.calendar_events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

-- ============================================================================
-- 2. ICS FEED CONFIGURATIONS TABLE
-- ============================================================================
-- Configuration for each ICS feed to sync
CREATE TABLE IF NOT EXISTS public.ics_feed_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,

  -- Feed Configuration
  feed_name VARCHAR(100) NOT NULL,
  feed_url TEXT NOT NULL,
  source_platform VARCHAR(50) NOT NULL CHECK (source_platform IN (
    'airbnb', 'booking.com', 'vrbo', 'motopress', 'generic'
  )),
  feed_type VARCHAR(20) NOT NULL DEFAULT 'import' CHECK (feed_type IN (
    'import', 'export', 'bidirectional'
  )),

  -- Authentication (if needed)
  auth_type VARCHAR(20) DEFAULT 'none' CHECK (auth_type IN (
    'none', 'basic', 'bearer', 'api_key', 'custom'
  )),
  auth_credentials JSONB, -- Encrypted in application layer

  -- Sync Settings
  is_active BOOLEAN DEFAULT TRUE,
  sync_interval_minutes INTEGER DEFAULT 60 CHECK (
    sync_interval_minutes BETWEEN 15 AND 1440 -- 15 min to 24 hours
  ),
  sync_priority INTEGER DEFAULT 5 CHECK (sync_priority BETWEEN 1 AND 10),

  -- Sync State
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20) CHECK (last_sync_status IN (
    'success', 'partial', 'failed', 'running', NULL
  )),
  last_sync_error TEXT,
  last_sync_error_details JSONB,
  last_etag VARCHAR(255),
  last_modified VARCHAR(255),

  -- Statistics
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  events_imported_total INTEGER DEFAULT 0,
  events_imported_last INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_feed_per_accommodation UNIQUE(tenant_id, accommodation_unit_id, feed_url),
  CONSTRAINT valid_sync_interval CHECK (sync_interval_minutes > 0)
);

-- Indexes for feed management
CREATE INDEX idx_ics_feeds_active
  ON public.ics_feed_configurations(tenant_id, is_active)
  WHERE is_active = TRUE;

CREATE INDEX idx_ics_feeds_next_sync
  ON public.ics_feed_configurations(
    last_sync_at,
    sync_interval_minutes
  )
  WHERE is_active = TRUE;

CREATE INDEX idx_ics_feeds_failures
  ON public.ics_feed_configurations(consecutive_failures)
  WHERE consecutive_failures > 3;

-- ============================================================================
-- 3. PROPERTY RELATIONSHIPS TABLE
-- ============================================================================
-- Define parent-child relationships between accommodations
CREATE TABLE IF NOT EXISTS public.property_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Relationship Definition
  parent_unit_id UUID NOT NULL,
  child_unit_id UUID NOT NULL,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'room_in_apartment', 'suite_in_hotel', 'adjacent_units',
    'shared_amenity', 'custom'
  )),

  -- Blocking Rules
  block_child_on_parent BOOLEAN DEFAULT TRUE,
  block_parent_on_all_children BOOLEAN DEFAULT FALSE,
  blocking_priority INTEGER DEFAULT 0 CHECK (blocking_priority BETWEEN 0 AND 10),

  -- Conditional Rules (JSONB for flexibility)
  blocking_conditions JSONB,
  /* Example conditions:
  {
    "min_guests": 4,
    "date_ranges": [
      {"start": "2025-12-20", "end": "2026-01-10"}
    ],
    "day_of_week": ["friday", "saturday"],
    "advance_days": 7
  }
  */

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_property_relationship UNIQUE(parent_unit_id, child_unit_id),
  CONSTRAINT no_self_relationship CHECK(parent_unit_id != child_unit_id)
);

-- Indexes for relationship queries
CREATE INDEX idx_property_relationships_parent
  ON public.property_relationships(parent_unit_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_property_relationships_child
  ON public.property_relationships(child_unit_id)
  WHERE is_active = TRUE;

CREATE INDEX idx_property_relationships_tenant
  ON public.property_relationships(tenant_id);

-- ============================================================================
-- 4. CALENDAR SYNC LOGS TABLE
-- ============================================================================
-- Detailed logging of sync operations
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_config_id UUID NOT NULL REFERENCES public.ics_feed_configurations(id) ON DELETE CASCADE,

  -- Sync Execution
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'success', 'partial', 'failed', 'timeout'
  )),
  events_found INTEGER DEFAULT 0,
  events_added INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,

  -- Error Tracking
  errors JSONB, -- Array of error objects
  warnings JSONB, -- Array of warning messages

  -- Performance Metrics
  http_response_time_ms INTEGER,
  parse_time_ms INTEGER,
  db_write_time_ms INTEGER,
  total_memory_mb DECIMAL(10,2),

  -- Request/Response Details
  request_headers JSONB,
  response_headers JSONB,
  response_status_code INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for log queries
CREATE INDEX idx_sync_logs_feed
  ON public.calendar_sync_logs(feed_config_id, started_at DESC);

CREATE INDEX idx_sync_logs_status
  ON public.calendar_sync_logs(status, started_at DESC);

CREATE INDEX idx_sync_logs_errors
  ON public.calendar_sync_logs(feed_config_id)
  WHERE status = 'failed';

-- Index for recent logs (removed NOW() predicate due to immutability requirement)
CREATE INDEX idx_sync_logs_recent
  ON public.calendar_sync_logs(started_at DESC);

-- ============================================================================
-- 5. CALENDAR EVENT CONFLICTS TABLE
-- ============================================================================
-- Track and resolve conflicts between events
CREATE TABLE IF NOT EXISTS public.calendar_event_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Conflicting Events
  event_1_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  event_2_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Conflict Details
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
    'overlapping_dates', 'duplicate_uid', 'parent_child_conflict',
    'double_booking', 'boundary_overlap', 'data_mismatch'
  )),
  overlap_start DATE,
  overlap_end DATE,
  conflict_severity VARCHAR(20) DEFAULT 'medium' CHECK (conflict_severity IN (
    'low', 'medium', 'high', 'critical'
  )),

  -- Resolution
  resolution_strategy VARCHAR(50) CHECK (resolution_strategy IN (
    'priority_based', 'time_based', 'manual', 'merged',
    'split', 'ignored', NULL
  )),
  winning_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(50), -- 'system', 'manual', 'rule:{name}'

  -- Metadata
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_conflict_pair UNIQUE(event_1_id, event_2_id),
  CONSTRAINT different_events CHECK(event_1_id != event_2_id)
);

-- Indexes for conflict management
CREATE INDEX idx_conflicts_unresolved
  ON public.calendar_event_conflicts(tenant_id, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_conflicts_events
  ON public.calendar_event_conflicts(event_1_id, event_2_id);

CREATE INDEX idx_conflicts_severity
  ON public.calendar_event_conflicts(conflict_severity, detected_at DESC)
  WHERE resolved_at IS NULL;

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ics_feeds_updated_at
  BEFORE UPDATE ON public.ics_feed_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_relationships_updated_at
  BEFORE UPDATE ON public.property_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check for overlapping events
CREATE OR REPLACE FUNCTION public.check_event_overlap(
  p_accommodation_unit_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
  event_id UUID,
  event_type VARCHAR,
  start_date DATE,
  end_date DATE,
  source VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.event_type,
    e.start_date,
    e.end_date,
    e.source
  FROM public.calendar_events e
  WHERE e.accommodation_unit_id = p_accommodation_unit_id
    AND e.status = 'active'
    AND NOT e.is_deleted
    AND (e.id != p_exclude_event_id OR p_exclude_event_id IS NULL)
    AND e.start_date <= p_end_date
    AND e.end_date >= p_start_date;
END;
$$ LANGUAGE plpgsql;

-- Function to propagate parent bookings to child properties
CREATE OR REPLACE FUNCTION public.propagate_parent_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_child_record RECORD;
BEGIN
  -- Only process new reservations on parent properties
  IF NEW.event_type = 'reservation' AND NEW.status = 'active' THEN
    -- Find all child properties
    FOR v_child_record IN
      SELECT pr.child_unit_id, pr.blocking_priority
      FROM public.property_relationships pr
      WHERE pr.parent_unit_id = NEW.accommodation_unit_id
        AND pr.is_active = TRUE
        AND pr.block_child_on_parent = TRUE
    LOOP
      -- Insert blocking event for child property
      INSERT INTO public.calendar_events (
        tenant_id,
        accommodation_unit_id,
        source,
        external_uid,
        event_type,
        start_date,
        end_date,
        summary,
        description,
        parent_event_id,
        source_priority,
        status
      ) VALUES (
        NEW.tenant_id,
        v_child_record.child_unit_id,
        NEW.source,
        'parent-block-' || NEW.id,
        'parent_block',
        NEW.start_date,
        NEW.end_date,
        'Blocked - Parent property booked',
        'Auto-blocked due to parent property reservation',
        NEW.id,
        v_child_record.blocking_priority,
        'active'
      )
      ON CONFLICT (tenant_id, source, external_uid)
      DO UPDATE SET
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        last_seen_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for parent-child blocking
CREATE TRIGGER propagate_parent_bookings
  AFTER INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION propagate_parent_booking();

-- Function to clean up old sync logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.calendar_sync_logs
  WHERE started_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate availability for a date range
CREATE OR REPLACE FUNCTION public.get_availability(
  p_accommodation_unit_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  date DATE,
  is_available BOOLEAN,
  event_type VARCHAR,
  event_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS date
  ),
  events AS (
    SELECT
      e.id,
      e.event_type,
      e.start_date,
      e.end_date
    FROM public.calendar_events e
    WHERE e.accommodation_unit_id = p_accommodation_unit_id
      AND e.status = 'active'
      AND NOT e.is_deleted
      AND e.start_date <= p_end_date
      AND e.end_date >= p_start_date
  )
  SELECT
    ds.date,
    CASE WHEN e.id IS NULL THEN TRUE ELSE FALSE END AS is_available,
    e.event_type,
    e.id AS event_id
  FROM date_series ds
  LEFT JOIN events e ON ds.date BETWEEN e.start_date AND e.end_date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ics_feed_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Tenants can view their own calendar events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid()::text = tenant_id::text);

CREATE POLICY "Tenants can insert their own calendar events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid()::text = tenant_id::text);

CREATE POLICY "Tenants can update their own calendar events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid()::text = tenant_id::text)
  WITH CHECK (auth.uid()::text = tenant_id::text);

CREATE POLICY "Tenants can delete their own calendar events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid()::text = tenant_id::text);

-- RLS Policies for ics_feed_configurations
CREATE POLICY "Tenants can manage their own ICS feeds"
  ON public.ics_feed_configurations FOR ALL
  USING (auth.uid()::text = tenant_id::text)
  WITH CHECK (auth.uid()::text = tenant_id::text);

-- RLS Policies for property_relationships
CREATE POLICY "Tenants can manage their own property relationships"
  ON public.property_relationships FOR ALL
  USING (auth.uid()::text = tenant_id::text)
  WITH CHECK (auth.uid()::text = tenant_id::text);

-- RLS Policies for calendar_sync_logs
CREATE POLICY "Tenants can view their own sync logs"
  ON public.calendar_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ics_feed_configurations f
      WHERE f.id = calendar_sync_logs.feed_config_id
        AND f.tenant_id::text = auth.uid()::text
    )
  );

-- RLS Policies for calendar_event_conflicts
CREATE POLICY "Tenants can manage their own conflicts"
  ON public.calendar_event_conflicts FOR ALL
  USING (auth.uid()::text = tenant_id::text)
  WITH CHECK (auth.uid()::text = tenant_id::text);

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE public.calendar_events IS
  'Central table for all calendar events from multiple sources (Airbnb, Booking.com, etc.)';

COMMENT ON TABLE public.ics_feed_configurations IS
  'Configuration and state management for ICS calendar feed synchronization';

COMMENT ON TABLE public.property_relationships IS
  'Parent-child relationships between accommodation units for automatic blocking';

COMMENT ON TABLE public.calendar_sync_logs IS
  'Detailed logging of calendar synchronization operations for debugging and monitoring';

COMMENT ON TABLE public.calendar_event_conflicts IS
  'Tracking and resolution of conflicts between calendar events';

-- Column comments
COMMENT ON COLUMN public.calendar_events.source IS
  'Platform source of the calendar event (airbnb, booking.com, vrbo, etc.)';

COMMENT ON COLUMN public.calendar_events.external_uid IS
  'Unique identifier from the source platform (e.g., Airbnb UID)';

COMMENT ON COLUMN public.calendar_events.event_type IS
  'Type of calendar event: reservation (confirmed booking), block (unavailable), maintenance, parent_block (auto-blocked due to parent)';

COMMENT ON COLUMN public.calendar_events.source_priority IS
  'Priority for conflict resolution (1=highest, 10=lowest). MotoPress API=1, Airbnb=3, Manual=5';

COMMENT ON COLUMN public.ics_feed_configurations.consecutive_failures IS
  'Number of consecutive sync failures. Used for circuit breaker pattern';

COMMENT ON COLUMN public.property_relationships.blocking_conditions IS
  'JSON conditions for conditional blocking (e.g., minimum guests, specific date ranges)';

-- ============================================================================
-- 9. SAMPLE DATA FOR TESTING (OPTIONAL - Comment out in production)
-- ============================================================================

/*
-- Sample tenant for testing
INSERT INTO public.ics_feed_configurations (
  tenant_id,
  accommodation_unit_id,
  feed_name,
  feed_url,
  source_platform,
  sync_interval_minutes
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Airbnb - Sunset Villa',
  'https://www.airbnb.com/calendar/ical/12345678.ics?s=abcdef',
  'airbnb',
  60
);

-- Sample property relationship
INSERT INTO public.property_relationships (
  tenant_id,
  parent_unit_id,
  child_unit_id,
  relationship_type,
  block_child_on_parent
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid, -- Simmer Highs
  '00000000-0000-0000-0000-000000000002'::uuid, -- Kaya
  'room_in_apartment',
  TRUE
);
*/

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ics_feed_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_relationships TO authenticated;
GRANT SELECT ON public.calendar_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_conflicts TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================