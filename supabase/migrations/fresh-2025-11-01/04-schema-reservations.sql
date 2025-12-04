-- ============================================
-- MUVA Chat - Reservations Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 14
-- ============================================
--
-- This file contains DDL for reservation and guest conversation tables.
--
-- CRITICAL: calendar_events has self-referencing FKs (parent_event_id, merged_into_id)
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - pgvector extension
-- - tenant_registry, accommodation_units, accommodation_units_public tables
--
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS airbnb_mphb_imported_reservations CASCADE;
DROP TABLE IF EXISTS calendar_sync_logs CASCADE;
DROP TABLE IF EXISTS ics_feed_configurations CASCADE;
DROP TABLE IF EXISTS calendar_event_conflicts CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS compliance_submissions CASCADE;
DROP TABLE IF EXISTS conversation_attachments CASCADE;
DROP TABLE IF EXISTS conversation_memory CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS guest_conversations CASCADE;
DROP TABLE IF EXISTS reservation_accommodations CASCADE;
DROP TABLE IF EXISTS guest_reservations CASCADE;
DROP TABLE IF EXISTS prospective_sessions CASCADE;

-- ============================================
-- Table: prospective_sessions
-- Description: Prospective guest sessions before reservation
-- Row Count: 412
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE prospective_sessions (
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cookie_id TEXT NOT NULL,
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  travel_intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  utm_tracking JSONB NOT NULL DEFAULT '{}'::jsonb,
  referrer TEXT,
  landing_page TEXT,
  converted_to_reservation_id UUID,
  conversion_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + '7 days'::interval),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR NOT NULL DEFAULT 'active'::character varying,

  CONSTRAINT prospective_sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT prospective_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_prospective_sessions_tenant ON prospective_sessions(tenant_id);
CREATE INDEX idx_prospective_sessions_cookie ON prospective_sessions(cookie_id);
CREATE INDEX idx_prospective_sessions_status ON prospective_sessions(status) WHERE status = 'active';

-- ============================================
-- Table: guest_reservations
-- Description: Guest reservation records
-- Row Count: 104
-- Dependencies: accommodation_units (nullable)
-- ============================================

CREATE TABLE guest_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL DEFAULT 'ONEILL SAID SAS'::character varying,
  guest_name VARCHAR NOT NULL,
  phone_full VARCHAR NOT NULL DEFAULT 'N/A'::character varying,
  phone_last_4 VARCHAR NOT NULL DEFAULT '0000'::character varying,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  reservation_code VARCHAR,
  status VARCHAR DEFAULT 'active'::character varying,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  accommodation_unit_id UUID,
  guest_email VARCHAR,
  guest_country VARCHAR,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  total_price NUMERIC,
  currency VARCHAR DEFAULT 'COP'::character varying,
  check_in_time TIME DEFAULT '15:00:00'::time without time zone,
  check_out_time TIME DEFAULT '12:00:00'::time without time zone,
  booking_source VARCHAR DEFAULT 'manual'::character varying,
  booking_notes TEXT,
  external_booking_id VARCHAR,
  accommodation_unit_id_key TEXT,
  document_type VARCHAR,
  document_number VARCHAR,
  birth_date DATE,
  first_surname VARCHAR,
  second_surname VARCHAR,
  given_names VARCHAR,
  nationality_code VARCHAR,
  origin_city_code VARCHAR,
  destination_city_code VARCHAR,
  hotel_sire_code VARCHAR,
  hotel_city_code VARCHAR,
  movement_type CHAR(1),
  movement_date DATE,

  CONSTRAINT guest_reservations_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_guest_reservations_tenant ON guest_reservations(tenant_id);
CREATE INDEX idx_guest_reservations_dates ON guest_reservations(check_in_date, check_out_date);
CREATE INDEX idx_guest_reservations_phone ON guest_reservations(phone_last_4);

-- ============================================
-- Table: reservation_accommodations
-- Description: Links reservations to accommodation units
-- Row Count: 93
-- Dependencies: guest_reservations
-- ============================================

CREATE TABLE reservation_accommodations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  accommodation_unit_id UUID,
  motopress_accommodation_id INTEGER,
  motopress_type_id INTEGER,
  room_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT reservation_accommodations_pkey PRIMARY KEY (id),
  CONSTRAINT reservation_accommodations_reservation_id_fkey FOREIGN KEY (reservation_id) 
    REFERENCES guest_reservations(id) ON DELETE CASCADE
);

CREATE INDEX idx_reservation_accommodations_reservation ON reservation_accommodations(reservation_id);

-- ============================================
-- Table: guest_conversations
-- Description: Guest conversation threads
-- Row Count: 112
-- Dependencies: guest_reservations
-- ============================================

CREATE TABLE guest_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  tenant_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  message_count INTEGER DEFAULT 0,
  compressed_history JSONB DEFAULT '[]'::jsonb,
  favorites JSONB DEFAULT '[]'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT guest_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT guest_conversations_guest_id_fkey FOREIGN KEY (guest_id) 
    REFERENCES guest_reservations(id) ON DELETE CASCADE
);

CREATE INDEX idx_guest_conversations_guest ON guest_conversations(guest_id);
CREATE INDEX idx_guest_conversations_tenant ON guest_conversations(tenant_id);

-- ============================================
-- Table: chat_conversations (Legacy)
-- Description: Legacy chat conversations table
-- Row Count: 2
-- Dependencies: guest_reservations (nullable)
-- ============================================

CREATE TABLE chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  user_type VARCHAR NOT NULL,
  reservation_id UUID,
  tenant_id VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active'::character varying,
  guest_phone_last_4 VARCHAR,
  check_in_date DATE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id)
);

-- ============================================
-- Table: chat_messages
-- Description: Chat message records
-- Row Count: 319
-- Dependencies: guest_conversations
-- ============================================

CREATE TABLE chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID,
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  entities JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  tenant_id VARCHAR,

  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) 
    REFERENCES guest_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- ============================================
-- Table: conversation_memory
-- Description: Conversation memory summaries
-- Row Count: 10
-- Dependencies: prospective_sessions, tenant_registry
-- ============================================

CREATE TABLE conversation_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  summary_text TEXT NOT NULL,
  message_range TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 10,
  embedding_fast vector(1024),
  key_entities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT conversation_memory_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_memory_session_id_fkey FOREIGN KEY (session_id) 
    REFERENCES prospective_sessions(session_id) ON DELETE CASCADE,
  CONSTRAINT conversation_memory_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_conversation_memory_session ON conversation_memory(session_id);

-- ============================================
-- Table: conversation_attachments
-- Description: File attachments in conversations
-- Row Count: 0
-- Dependencies: guest_conversations
-- ============================================

CREATE TABLE conversation_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_id UUID,
  file_type VARCHAR NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type VARCHAR,
  original_filename VARCHAR,
  ocr_text TEXT,
  vision_analysis JSONB,
  analysis_type VARCHAR,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT conversation_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_attachments_conversation_id_fkey FOREIGN KEY (conversation_id) 
    REFERENCES guest_conversations(id) ON DELETE CASCADE
);

-- ============================================
-- Table: compliance_submissions
-- Description: SIRE/TRA compliance submissions
-- Row Count: 0
-- Dependencies: guest_reservations
-- ============================================

CREATE TABLE compliance_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL,
  tenant_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  data JSONB NOT NULL,
  sire_response JSONB,
  tra_response JSONB,
  error_message TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  submitted_by VARCHAR DEFAULT 'guest'::character varying,

  CONSTRAINT compliance_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_submissions_guest_id_fkey FOREIGN KEY (guest_id) 
    REFERENCES guest_reservations(id) ON DELETE CASCADE
);

-- ============================================
-- Table: calendar_events
-- Description: Calendar events from ICS feeds
-- Row Count: 74
-- Dependencies: accommodation_units_public (nullable), **SELF-REFERENCING**
-- ============================================

CREATE TABLE calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,
  source VARCHAR NOT NULL,
  external_uid VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  check_in_time TIME DEFAULT '15:00:00'::time without time zone,
  check_out_time TIME DEFAULT '11:00:00'::time without time zone,
  summary TEXT,
  description TEXT,
  reservation_code VARCHAR,
  guest_name VARCHAR,
  guest_email VARCHAR,
  guest_phone VARCHAR,
  guest_phone_last4 VARCHAR,
  total_guests INTEGER,
  adults INTEGER,
  children INTEGER,
  total_price NUMERIC,
  currency VARCHAR DEFAULT 'COP'::character varying,
  source_priority INTEGER NOT NULL DEFAULT 5,
  last_modified TIMESTAMPTZ,
  sequence_number INTEGER DEFAULT 0,
  sync_generation TIMESTAMPTZ,
  ics_dtstamp TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR NOT NULL DEFAULT 'active'::character varying,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  parent_event_id UUID,
  merged_into_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT calendar_events_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_events_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  CONSTRAINT calendar_events_parent_event_id_fkey FOREIGN KEY (parent_event_id) 
    REFERENCES calendar_events(id) ON DELETE SET NULL,
  CONSTRAINT calendar_events_merged_into_id_fkey FOREIGN KEY (merged_into_id) 
    REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_calendar_events_tenant_unit ON calendar_events(tenant_id, accommodation_unit_id);
CREATE INDEX idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX idx_calendar_events_external_uid ON calendar_events(external_uid);

COMMENT ON TABLE calendar_events IS 'Calendar events with self-referencing parent_event_id and merged_into_id';
COMMENT ON COLUMN calendar_events.parent_event_id IS 'Self-referencing FK - handle with NULL during INSERT';
COMMENT ON COLUMN calendar_events.merged_into_id IS 'Self-referencing FK - handle with NULL during INSERT';

-- ============================================
-- Table: calendar_event_conflicts
-- Description: Calendar event conflicts
-- Row Count: 0
-- Dependencies: calendar_events (3 FKs)
-- ============================================

CREATE TABLE calendar_event_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_1_id UUID NOT NULL,
  event_2_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  conflict_type VARCHAR NOT NULL,
  overlap_start DATE,
  overlap_end DATE,
  conflict_severity VARCHAR DEFAULT 'medium'::character varying,
  resolution_strategy VARCHAR,
  winning_event_id UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT calendar_event_conflicts_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_event_conflicts_event_1_id_fkey FOREIGN KEY (event_1_id) 
    REFERENCES calendar_events(id) ON DELETE CASCADE,
  CONSTRAINT calendar_event_conflicts_event_2_id_fkey FOREIGN KEY (event_2_id) 
    REFERENCES calendar_events(id) ON DELETE CASCADE,
  CONSTRAINT calendar_event_conflicts_winning_event_id_fkey FOREIGN KEY (winning_event_id) 
    REFERENCES calendar_events(id) ON DELETE SET NULL
);

-- ============================================
-- Table: ics_feed_configurations
-- Description: ICS feed configurations
-- Row Count: 9
-- Dependencies: tenant_registry, accommodation_units_public (nullable)
-- ============================================

CREATE TABLE ics_feed_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,
  feed_name VARCHAR NOT NULL,
  feed_url TEXT NOT NULL,
  source_platform VARCHAR NOT NULL,
  feed_type VARCHAR NOT NULL DEFAULT 'import'::character varying,
  auth_type VARCHAR DEFAULT 'none'::character varying,
  auth_credentials JSONB,
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  sync_priority INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR,
  last_sync_error TEXT,
  last_sync_error_details JSONB,
  last_etag VARCHAR,
  last_modified VARCHAR,
  total_syncs INTEGER DEFAULT 0,
  successful_syncs INTEGER DEFAULT 0,
  failed_syncs INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  events_imported_total INTEGER DEFAULT 0,
  events_imported_last INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT ics_feed_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT ics_feed_configurations_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_ics_feed_configurations_tenant ON ics_feed_configurations(tenant_id);
CREATE INDEX idx_ics_feed_configurations_active ON ics_feed_configurations(is_active) WHERE is_active = true;

-- ============================================
-- Table: calendar_sync_logs
-- Description: Calendar sync operation logs
-- Row Count: 0
-- Dependencies: ics_feed_configurations
-- ============================================

CREATE TABLE calendar_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  feed_config_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status VARCHAR NOT NULL DEFAULT 'running'::character varying,
  events_found INTEGER DEFAULT 0,
  events_added INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  events_skipped INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  errors JSONB,
  warnings JSONB,
  http_response_time_ms INTEGER,
  parse_time_ms INTEGER,
  db_write_time_ms INTEGER,
  total_memory_mb NUMERIC,
  request_headers JSONB,
  response_headers JSONB,
  response_status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT calendar_sync_logs_pkey PRIMARY KEY (id),
  CONSTRAINT calendar_sync_logs_feed_config_id_fkey FOREIGN KEY (feed_config_id) 
    REFERENCES ics_feed_configurations(id) ON DELETE CASCADE
);

-- ============================================
-- Table: airbnb_mphb_imported_reservations
-- Description: Imported Airbnb/MotoPress reservations
-- Row Count: 0
-- Dependencies: accommodation_units (nullable)
-- ============================================

CREATE TABLE airbnb_mphb_imported_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  motopress_booking_id INTEGER NOT NULL,
  motopress_accommodation_id INTEGER,
  motopress_type_id INTEGER,
  guest_name VARCHAR NOT NULL,
  guest_email VARCHAR,
  phone_full VARCHAR,
  phone_last_4 VARCHAR,
  guest_country VARCHAR,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  check_in_time VARCHAR,
  check_out_time VARCHAR,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  total_price NUMERIC,
  currency VARCHAR DEFAULT 'COP'::character varying,
  accommodation_unit_id UUID,
  comparison_status VARCHAR DEFAULT 'pending'::character varying,
  direct_airbnb_reservation_id VARCHAR,
  given_names VARCHAR,
  first_surname VARCHAR,
  second_surname VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_compared_at TIMESTAMPTZ,
  booking_notes TEXT,
  raw_motopress_data JSONB,

  CONSTRAINT airbnb_mphb_imported_reservations_pkey PRIMARY KEY (id)
);

-- ============================================
-- Row Level Security
-- ========================================== 
-- Nov 1 Optimization: FK Indexes (7 total) 
-- ========================================== 
-- These indexes improve JOIN performance and support efficient foreign key lookups

-- FK index 1: guest_reservations -> tenant_registry (already has idx_guest_reservations_tenant)
-- Verified existing

-- FK index 2: prospective_sessions -> tenant_registry 
CREATE INDEX IF NOT EXISTS idx_prospective_sessions_tenant_fk ON prospective_sessions(tenant_id);

-- FK index 3: prospective_sessions -> guest_reservations (converted_to_reservation_id)
CREATE INDEX IF NOT EXISTS idx_prospective_sessions_reservation_fk ON prospective_sessions(converted_to_reservation_id);

-- FK index 4: guest_conversations -> guest_reservations
CREATE INDEX IF NOT EXISTS idx_guest_conversations_reservation_fk ON guest_conversations(reservation_id);

-- FK index 5: chat_conversations -> guest_reservations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_reservation_fk ON chat_conversations(reservation_id);

-- FK index 6: chat_messages -> guest_conversations
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_fk ON chat_messages(conversation_id);

-- FK index 7: reservation_accommodations -> guest_reservations (already has idx_reservation_accommodations_reservation)
-- Verified existing

COMMENT ON INDEX idx_prospective_sessions_tenant_fk IS 'Nov 1 optimization: FK index for tenant isolation queries';
COMMENT ON INDEX idx_prospective_sessions_reservation_fk IS 'Nov 1 optimization: FK index for conversion tracking';
COMMENT ON INDEX idx_guest_conversations_reservation_fk IS 'Nov 1 optimization: FK index for reservation lookups';
COMMENT ON INDEX idx_chat_conversations_reservation_fk IS 'Nov 1 optimization: FK index for reservation chat lookups';
COMMENT ON INDEX idx_chat_messages_conversation_fk IS 'Nov 1 optimization: FK index for message queries';

-- ============================================

ALTER TABLE prospective_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ics_feed_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_mphb_imported_reservations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- END Reservations Schema
-- ============================================
--
-- Summary:
-- - 14 tables created
-- - 15 foreign keys (including 2 self-referencing on calendar_events)
-- - 1 vector column (conversation_memory.embedding_fast)
-- - RLS enabled on all tables
--
-- Next: 05-schema-embeddings.sql
-- ============================================
