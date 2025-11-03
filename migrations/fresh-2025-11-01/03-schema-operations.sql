-- ============================================
-- MUVA Chat - Operations Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 6
-- ============================================
--
-- This file contains DDL for operational tables managing
-- hotels, staff, and accommodation units.
--
-- CRITICAL: staff_users has self-referencing FK (created_by)
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - pgvector extension
-- - tenant_registry table
--
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS hotel_operations CASCADE;
DROP TABLE IF EXISTS accommodation_units_manual CASCADE;
DROP TABLE IF EXISTS accommodation_units_public CASCADE;
DROP TABLE IF EXISTS accommodation_units CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS hotels CASCADE;

-- ============================================
-- Table: hotels
-- Description: Hotel/property definitions
-- Row Count: 3
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  short_description TEXT,
  address JSONB,
  contact_info JSONB,
  check_in_time TIME DEFAULT '15:00:00'::time without time zone,
  check_out_time TIME DEFAULT '12:00:00'::time without time zone,
  policies JSONB,
  hotel_amenities JSONB DEFAULT '[]'::jsonb,
  motopress_property_id INTEGER,
  full_description TEXT,
  tourism_summary TEXT,
  policies_summary TEXT,
  embedding_fast vector(1024),
  embedding_balanced vector(1536),
  images JSONB DEFAULT '[]'::jsonb,
  status VARCHAR DEFAULT 'active'::character varying,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT hotels_pkey PRIMARY KEY (id),
  CONSTRAINT hotels_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  CONSTRAINT hotels_status_check CHECK (status::text = ANY (ARRAY['active'::text, 'inactive'::text, 'maintenance'::text]))
);

CREATE INDEX idx_hotels_tenant_status ON hotels(tenant_id, status);
CREATE INDEX idx_hotels_motopress ON hotels(motopress_property_id) WHERE motopress_property_id IS NOT NULL;
CREATE INDEX idx_hotels_name ON hotels USING gin (to_tsvector('spanish'::regconfig, name::text));
CREATE INDEX idx_hotels_embedding_fast ON hotels USING hnsw (embedding_fast vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_hotels_embedding_balanced ON hotels USING hnsw (embedding_balanced vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE hotels IS 'Hotel/property definitions with Matryoshka embeddings';
COMMENT ON COLUMN hotels.tenant_id IS 'FK a tenant_registry - permite múltiples hoteles por cliente';
COMMENT ON COLUMN hotels.embedding_fast IS 'Embedding Tier 1 (1024d) para búsquedas turísticas ultra-rápidas';
COMMENT ON COLUMN hotels.embedding_balanced IS 'Embedding Tier 2 (1536d) para búsquedas de políticas balanceadas';

-- ============================================
-- Table: staff_users
-- Description: Staff user accounts
-- Row Count: 6
-- Dependencies: tenant_registry, **SELF-REFERENCING** (created_by)
-- ============================================

CREATE TABLE staff_users (
  staff_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL,
  username VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  permissions JSONB DEFAULT '{"admin_panel": false, "sire_access": true, "reports_access": false, "modify_operations": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,

  CONSTRAINT staff_users_pkey PRIMARY KEY (staff_id),
  CONSTRAINT staff_users_username_key UNIQUE (username),
  CONSTRAINT staff_users_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE NO ACTION,
  CONSTRAINT staff_users_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES staff_users(staff_id) ON DELETE NO ACTION,
  CONSTRAINT staff_users_role_check CHECK (role::text = ANY (ARRAY['ceo'::text, 'admin'::text, 'housekeeper'::text]))
);

CREATE INDEX idx_staff_users_tenant ON staff_users(tenant_id) WHERE is_active = true;
CREATE INDEX idx_staff_users_username ON staff_users(username) WHERE is_active = true;
CREATE INDEX idx_staff_users_role ON staff_users(tenant_id, role);

COMMENT ON TABLE staff_users IS 'Staff user accounts with self-referencing created_by FK';
COMMENT ON COLUMN staff_users.created_by IS 'Self-referencing FK - handle with NULL during initial INSERT, then UPDATE';

-- ============================================
-- Table: accommodation_units
-- Description: Internal accommodation unit definitions (legacy)
-- Row Count: 2
-- Dependencies: hotels, tenant_registry
-- ============================================

CREATE TABLE accommodation_units (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  hotel_id UUID,
  motopress_type_id INTEGER,
  motopress_instance_id INTEGER,
  name VARCHAR NOT NULL,
  unit_number VARCHAR,
  description TEXT,
  short_description TEXT,
  unit_type VARCHAR,
  capacity JSONB,
  bed_configuration JSONB,
  size_m2 INTEGER,
  floor_number INTEGER,
  view_type VARCHAR,
  tourism_features JSONB,
  booking_policies JSONB,
  unique_features JSONB,
  accessibility_features JSONB,
  location_details JSONB,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 1,
  status VARCHAR DEFAULT 'active'::character varying,
  embedding_fast vector(1024),
  embedding_balanced vector(1536),
  images JSONB,
  tenant_id UUID,
  accommodation_type_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT accommodation_units_pkey PRIMARY KEY (id),
  CONSTRAINT accommodation_units_hotel_id_fkey FOREIGN KEY (hotel_id) 
    REFERENCES hotels(id) ON DELETE NO ACTION,
  CONSTRAINT accommodation_units_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE NO ACTION
);

COMMENT ON TABLE accommodation_units IS 'Internal accommodation units (legacy, 2 rows) - use accommodation_units_public for new data';

-- ============================================
-- Table: accommodation_units_public
-- Description: Public-facing accommodation units (primary)
-- Row Count: 151
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE accommodation_units_public (
  unit_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit_number TEXT,
  unit_type VARCHAR(50),
  description TEXT NOT NULL,
  short_description TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  amenities JSONB DEFAULT '{}'::jsonb,
  pricing JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  virtual_tour_url TEXT,
  embedding_fast vector(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_bookable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  embedding vector(1536),

  CONSTRAINT accommodation_units_public_pkey PRIMARY KEY (unit_id),
  CONSTRAINT accommodation_units_public_tenant_name_key UNIQUE (tenant_id, name),
  CONSTRAINT accommodation_units_public_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE NO ACTION
);

CREATE INDEX idx_accommodation_public_tenant ON accommodation_units_public(tenant_id) WHERE is_active = true;
CREATE INDEX idx_accommodation_public_type ON accommodation_units_public(tenant_id, unit_type);
CREATE INDEX idx_accommodation_public_embedding_fast_hnsw ON accommodation_units_public 
  USING hnsw (embedding_fast vector_cosine_ops);
CREATE INDEX accommodation_units_public_embedding_idx ON accommodation_units_public 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE accommodation_units_public IS 'Public accommodation units (151 rows) - primary table for guest-facing data';
COMMENT ON COLUMN accommodation_units_public.description IS 'Complete accommodation description (no chunking - used by match_accommodations_public RPC)';
COMMENT ON COLUMN accommodation_units_public.embedding IS 'Matryoshka Tier 2 embedding (1536 dimensions) for balanced search performance. HNSW indexed.';
COMMENT ON COLUMN accommodation_units_public.embedding_fast IS 'Matryoshka 1024d for fast searches';
COMMENT ON COLUMN accommodation_units_public.metadata IS 'JSON metadata for accommodation (source_type, uploaded_at, etc.)';

-- ============================================
-- Table: accommodation_units_manual
-- Description: Manual content for accommodation units
-- Row Count: 8
-- Dependencies: accommodation_units_public
-- ============================================

CREATE TABLE accommodation_units_manual (
  unit_id UUID NOT NULL,
  manual_content TEXT,
  detailed_instructions TEXT,
  house_rules_specific TEXT,
  emergency_info TEXT,
  wifi_password TEXT,
  safe_code TEXT,
  appliance_guides JSONB DEFAULT '{}'::jsonb,
  local_tips TEXT,
  embedding vector(3072),
  embedding_balanced vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT accommodation_units_manual_pkey PRIMARY KEY (unit_id),
  CONSTRAINT accommodation_units_manual_unit_id_fkey FOREIGN KEY (unit_id) 
    REFERENCES accommodation_units_public(unit_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_accommodation_manual_embedding_balanced_hnsw ON accommodation_units_manual 
  USING hnsw (embedding_balanced vector_cosine_ops);

COMMENT ON TABLE accommodation_units_manual IS 'Manual instructions and content for accommodation units';

-- ============================================
-- Table: hotel_operations
-- Description: Operational knowledge base for staff
-- Row Count: 10
-- Dependencies: tenant_registry, staff_users
-- ============================================

CREATE TABLE hotel_operations (
  operation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  embedding_balanced vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  access_level VARCHAR(20) DEFAULT 'all_staff'::character varying,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,

  CONSTRAINT hotel_operations_pkey PRIMARY KEY (operation_id),
  CONSTRAINT hotel_operations_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE NO ACTION,
  CONSTRAINT hotel_operations_created_by_fkey FOREIGN KEY (created_by) 
    REFERENCES staff_users(staff_id) ON DELETE NO ACTION,
  CONSTRAINT hotel_operations_access_level_check CHECK (access_level::text = ANY (ARRAY['all_staff'::text, 'admin_only'::text, 'ceo_only'::text]))
);

CREATE INDEX idx_hotel_operations_tenant ON hotel_operations(tenant_id) WHERE is_active = true;
CREATE INDEX idx_hotel_operations_tenant_access ON hotel_operations(tenant_id, access_level);
CREATE INDEX idx_hotel_operations_category ON hotel_operations(tenant_id, category);
CREATE INDEX idx_hotel_operations_embedding_balanced ON hotel_operations 
  USING ivfflat (embedding_balanced vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_hotel_operations_embedding_balanced_hnsw ON hotel_operations 
  USING hnsw (embedding_balanced vector_cosine_ops);

COMMENT ON TABLE hotel_operations IS 'Operational knowledge base for staff with access control';

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_units_public ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_units_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_operations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- END Operations Schema
-- ============================================
--
-- Summary:
-- - 6 tables created
-- - 11 foreign keys (including 1 self-referencing on staff_users)
-- - 29 indexes (including 8 vector indexes)
-- - Vector dimensions: 1024 (fast), 1536 (balanced), 3072 (full)
-- - RLS enabled on all tables
--
-- Next: 04-schema-reservations.sql
-- ============================================

-- ==========================================
-- Nov 1 Optimization: FK Indexes (3 total)
-- ==========================================
-- These indexes improve JOIN performance for foreign key relationships

-- FK index 1: accommodation_units -> hotels (frequent JOINs)
CREATE INDEX IF NOT EXISTS idx_accommodation_units_hotel_id ON accommodation_units(hotel_id);

-- FK index 2: hotel_operations -> staff_users (created_by lookups)
CREATE INDEX IF NOT EXISTS idx_hotel_operations_staff_user_id ON hotel_operations(created_by);

COMMENT ON INDEX idx_accommodation_units_hotel_id IS 'Nov 1 optimization: FK index for hotel JOINs';
COMMENT ON INDEX idx_hotel_operations_staff_user_id IS 'Nov 1 optimization: FK index for staff user lookups';

-- Note: accommodation_units tenant_id already has idx_accommodation_units_tenant
-- Note: hotel_operations tenant_id already has idx_hotel_operations_tenant

