-- ============================================
-- MUVA Chat - Integrations Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 9
-- ============================================
--
-- This file contains DDL for integration tables (sync, logs, staff chat, etc.)
--
-- CRITICAL: sire_export_logs references auth.users (cross-schema FK)
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - tenant_registry table
-- - auth.users table (Supabase Auth)
-- - staff_users, calendar_events, accommodation_units_public tables
--
-- ============================================

DROP TABLE IF EXISTS tenant_compliance_credentials CASCADE;
DROP TABLE IF EXISTS staff_messages CASCADE;
DROP TABLE IF EXISTS staff_conversations CASCADE;
DROP TABLE IF EXISTS property_relationships CASCADE;
DROP TABLE IF EXISTS airbnb_motopress_comparison CASCADE;
DROP TABLE IF EXISTS sire_export_logs CASCADE;
DROP TABLE IF EXISTS job_logs CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS integration_configs CASCADE;

-- ============================================
-- Table: integration_configs
-- Description: Integration configuration settings
-- Row Count: 3
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_type VARCHAR NOT NULL,
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT integration_configs_pkey PRIMARY KEY (id),
  CONSTRAINT integration_configs_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_integration_configs_tenant ON integration_configs(tenant_id);
CREATE INDEX idx_integration_configs_type ON integration_configs(integration_type);

-- ============================================
-- Table: sync_history
-- Description: Synchronization operation history
-- Row Count: 85
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE sync_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  integration_type VARCHAR NOT NULL,
  sync_type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB,
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,

  CONSTRAINT sync_history_pkey PRIMARY KEY (id),
  CONSTRAINT sync_history_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_history_tenant ON sync_history(tenant_id);
CREATE INDEX idx_sync_history_type ON sync_history(integration_type);
CREATE INDEX idx_sync_history_status ON sync_history(status);

-- ============================================
-- Table: job_logs
-- Description: Background job execution logs
-- Row Count: 39
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE job_logs (
  log_id UUID NOT NULL DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT job_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT job_logs_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_job_logs_tenant ON job_logs(tenant_id);
CREATE INDEX idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX idx_job_logs_status ON job_logs(status);

-- ============================================
-- Table: sire_export_logs
-- Description: SIRE export operation logs
-- Row Count: 0
-- Dependencies: **CROSS-SCHEMA** auth.users
-- ============================================

CREATE TABLE sire_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id UUID,
  export_type TEXT NOT NULL,
  export_date DATE NOT NULL,
  movement_type CHAR(1),
  record_count INTEGER NOT NULL,
  file_name TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sire_export_logs_pkey PRIMARY KEY (id),
  
  -- Cross-schema FK to Supabase Auth
  CONSTRAINT sire_export_logs_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sire_export_logs_tenant ON sire_export_logs(tenant_id);
CREATE INDEX idx_sire_export_logs_date ON sire_export_logs(export_date);
CREATE INDEX idx_sire_export_logs_status ON sire_export_logs(status);

COMMENT ON TABLE sire_export_logs IS 'SIRE export logs with cross-schema FK to auth.users';
COMMENT ON COLUMN sire_export_logs.user_id IS 'References auth.users.id (Supabase Auth schema)';

-- ============================================
-- Table: airbnb_motopress_comparison
-- Description: Airbnb/MotoPress data comparison
-- Row Count: 0
-- Dependencies: tenant_registry, accommodation_units_public, calendar_events
-- ============================================

CREATE TABLE airbnb_motopress_comparison (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  motopress_booking_id TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  accommodation_unit_id UUID,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  total_price NUMERIC,
  currency TEXT DEFAULT 'COP'::text,
  synced_from_motopress_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  matched_with_ics BOOLEAN DEFAULT false,
  ics_event_id UUID,
  data_differences JSONB,
  match_confidence NUMERIC,
  raw_motopress_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT airbnb_motopress_comparison_pkey PRIMARY KEY (id),
  CONSTRAINT airbnb_motopress_comparison_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  CONSTRAINT airbnb_motopress_comparison_accommodation_unit_id_fkey FOREIGN KEY (accommodation_unit_id) 
    REFERENCES accommodation_units_public(unit_id) ON DELETE SET NULL,
  CONSTRAINT airbnb_motopress_comparison_ics_event_id_fkey FOREIGN KEY (ics_event_id) 
    REFERENCES calendar_events(id) ON DELETE SET NULL
);

CREATE INDEX idx_airbnb_motopress_tenant ON airbnb_motopress_comparison(tenant_id);

-- ============================================
-- Table: staff_conversations
-- Description: Staff internal conversations
-- Row Count: 43
-- Dependencies: staff_users, tenant_registry
-- ============================================

CREATE TABLE staff_conversations (
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  title TEXT,
  category VARCHAR,
  status VARCHAR DEFAULT 'active'::character varying,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,

  CONSTRAINT staff_conversations_pkey PRIMARY KEY (conversation_id),
  CONSTRAINT staff_conversations_staff_id_fkey FOREIGN KEY (staff_id) 
    REFERENCES staff_users(staff_id) ON DELETE CASCADE,
  CONSTRAINT staff_conversations_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_staff_conversations_staff ON staff_conversations(staff_id);
CREATE INDEX idx_staff_conversations_tenant ON staff_conversations(tenant_id);

-- ============================================
-- Table: staff_messages
-- Description: Staff conversation messages
-- Row Count: 58
-- Dependencies: staff_conversations
-- ============================================

CREATE TABLE staff_messages (
  message_id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_index INTEGER NOT NULL,
  role VARCHAR NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT staff_messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT staff_messages_conversation_id_fkey FOREIGN KEY (conversation_id) 
    REFERENCES staff_conversations(conversation_id) ON DELETE CASCADE
);

CREATE INDEX idx_staff_messages_conversation ON staff_messages(conversation_id);
CREATE INDEX idx_staff_messages_index ON staff_messages(conversation_id, message_index);

-- ============================================
-- Table: property_relationships
-- Description: Property relationships (parent/child units)
-- Row Count: 1
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE property_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parent_unit_id UUID NOT NULL,
  child_unit_id UUID NOT NULL,
  relationship_type VARCHAR NOT NULL,
  block_child_on_parent BOOLEAN DEFAULT true,
  block_parent_on_all_children BOOLEAN DEFAULT false,
  blocking_priority INTEGER DEFAULT 0,
  blocking_conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT property_relationships_pkey PRIMARY KEY (id),
  CONSTRAINT property_relationships_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_property_relationships_tenant ON property_relationships(tenant_id);
CREATE INDEX idx_property_relationships_parent ON property_relationships(parent_unit_id);
CREATE INDEX idx_property_relationships_child ON property_relationships(child_unit_id);

-- ============================================
-- Table: tenant_compliance_credentials
-- Description: Tenant compliance system credentials
-- Row Count: 0
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE tenant_compliance_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  sire_username VARCHAR,
  sire_password_encrypted TEXT,
  tra_rnt_token VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT tenant_compliance_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_compliance_credentials_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_tenant_compliance_tenant_unique ON tenant_compliance_credentials(tenant_id);

COMMENT ON TABLE tenant_compliance_credentials IS 'Tenant compliance credentials (SIRE, TRA) - encrypted storage';

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE airbnb_motopress_comparison ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_compliance_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================
-- END Integrations Schema
-- ============================================
--
-- Summary:
-- - 9 tables created
-- - 14 foreign keys (including 1 cross-schema to auth.users)
-- - RLS enabled on all tables
--
-- Next: Data migration (DML)
-- ============================================
