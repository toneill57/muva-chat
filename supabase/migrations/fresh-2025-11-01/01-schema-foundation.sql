-- ============================================
-- MUVA Chat - Foundation Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 5 (depth 0-1)
-- ============================================
--
-- This file contains the DDL for the 5 core foundation tables
-- that form the basis of the MUVA Chat multi-tenant architecture.
--
-- Execution order:
-- 1. tenant_registry (root table)
-- 2. sire_countries (SIRE catalog)
-- 3. sire_cities (SIRE catalog)
-- 4. sire_document_types (SIRE catalog)
-- 5. user_tenant_permissions (cross-schema FK to auth.users)
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - auth schema exists (Supabase Auth)
-- - pgcrypto extension (for gen_random_uuid())
--
-- ============================================

-- Drop existing tables (reverse dependency order)
DROP TABLE IF EXISTS user_tenant_permissions CASCADE;
DROP TABLE IF EXISTS sire_document_types CASCADE;
DROP TABLE IF EXISTS sire_cities CASCADE;
DROP TABLE IF EXISTS sire_countries CASCADE;
DROP TABLE IF EXISTS tenant_registry CASCADE;

-- ============================================
-- Table: tenant_registry
-- Description: Multi-tenant root table (subdomain-based routing)
-- Row Count: 3
-- Dependencies: None
-- ============================================

CREATE TABLE tenant_registry (
  tenant_id UUID NOT NULL DEFAULT gen_random_uuid(),
  nit VARCHAR(20) NOT NULL,
  razon_social VARCHAR(255) NOT NULL,
  nombre_comercial VARCHAR(255) NOT NULL,
  schema_name VARCHAR(63) NOT NULL,
  tenant_type VARCHAR(50) DEFAULT 'hotel'::character varying,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  slug VARCHAR(50),
  subscription_tier VARCHAR(20) DEFAULT 'free'::character varying,
  features JSONB DEFAULT '{"muva_access": false, "premium_chat": false, "guest_chat_enabled": true, "staff_chat_enabled": true}'::jsonb,
  subdomain TEXT NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  social_media_links JSONB DEFAULT '{}'::jsonb,
  seo_meta_description TEXT,
  seo_keywords TEXT[],
  landing_page_content JSONB DEFAULT '{"hero": {"title": "", "cta_link": "/chat", "cta_text": "Get Started", "subtitle": ""}, "about": {"title": "About Us", "content": ""}, "contact": {"email": "", "phone": "", "title": "Contact Us", "address": ""}, "gallery": {"title": "Gallery", "images": []}, "services": {"items": [], "title": "Our Services"}}'::jsonb,
  logo_url TEXT,
  business_name TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6'::character varying,
  chat_cta_link TEXT DEFAULT '/with-me'::text,

  CONSTRAINT tenant_registry_pkey PRIMARY KEY (tenant_id),
  CONSTRAINT tenant_registry_subdomain_key UNIQUE (subdomain),
  CONSTRAINT tenant_registry_schema_name_key UNIQUE (schema_name),
  CONSTRAINT tenant_registry_nit_key UNIQUE (nit),
  CONSTRAINT tenant_registry_slug_key UNIQUE (slug)
);

-- Indexes for tenant_registry
CREATE INDEX tenant_registry_subdomain_idx ON tenant_registry(subdomain);
CREATE INDEX idx_tenant_registry_slug ON tenant_registry(slug);
CREATE INDEX idx_tenant_subscription_tier ON tenant_registry(subscription_tier);
CREATE INDEX idx_tenant_features ON tenant_registry USING gin(features);
CREATE INDEX idx_tenant_registry_email ON tenant_registry(email) WHERE email IS NOT NULL;
CREATE INDEX idx_tenant_registry_social_media ON tenant_registry USING gin(social_media_links) WHERE social_media_links IS NOT NULL;
CREATE INDEX idx_tenant_registry_seo_keywords ON tenant_registry USING gin(seo_keywords) WHERE seo_keywords IS NOT NULL;

-- Comments
COMMENT ON TABLE tenant_registry IS 'Multi-tenant registration and configuration. Root table for subdomain-based tenant isolation.';
COMMENT ON COLUMN tenant_registry.subdomain IS 'Unique subdomain identifier (e.g., simmerdown, banzai) used for tenant routing';
COMMENT ON COLUMN tenant_registry.schema_name IS 'PostgreSQL schema name for tenant data isolation (legacy, not actively used)';
COMMENT ON COLUMN tenant_registry.features IS 'Feature flags: muva_access, premium_chat, guest_chat_enabled, staff_chat_enabled';
COMMENT ON COLUMN tenant_registry.nit IS 'Colombian tax identification number (Número de Identificación Tributaria)';

-- ============================================
-- Table: sire_countries
-- Description: SIRE country catalog (Colombian tourism ministry)
-- Row Count: 45
-- Dependencies: None
-- ============================================

CREATE TABLE sire_countries (
  iso_code VARCHAR(3) NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_es VARCHAR(100),
  alpha2_code VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT now(),
  sire_code VARCHAR(3),

  CONSTRAINT sire_countries_pkey PRIMARY KEY (iso_code)
);

-- Indexes for sire_countries
CREATE INDEX idx_sire_countries_name ON sire_countries(name);
CREATE INDEX idx_sire_countries_name_es ON sire_countries(name_es);
CREATE INDEX idx_sire_countries_sire_code ON sire_countries(sire_code);

-- Comments
COMMENT ON TABLE sire_countries IS 'SIRE country catalog. CRITICAL: sire_code values differ from ISO (e.g., USA=249, NOT 840)';
COMMENT ON COLUMN sire_countries.sire_code IS 'SIRE-specific country code (NOT ISO 3166-1 numeric). Example: 249=USA, 057=Colombia';

-- ============================================
-- Table: sire_cities
-- Description: SIRE city catalog (Colombian municipalities)
-- Row Count: 42
-- Dependencies: None (no FK in current schema)
-- ============================================

CREATE TABLE sire_cities (
  code VARCHAR(6) NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  region VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT sire_cities_pkey PRIMARY KEY (code)
);

-- Indexes for sire_cities
CREATE INDEX idx_sire_cities_name ON sire_cities(name);
CREATE INDEX idx_sire_cities_department ON sire_cities(department);

-- Comments
COMMENT ON TABLE sire_cities IS 'SIRE city catalog (Colombian municipalities and departments)';
COMMENT ON COLUMN sire_cities.code IS 'DANE municipality code (6-digit)';

-- ============================================
-- Table: sire_document_types
-- Description: SIRE document type catalog
-- Row Count: 4
-- Dependencies: None
-- ============================================

CREATE TABLE sire_document_types (
  code VARCHAR(2) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT sire_document_types_pkey PRIMARY KEY (code)
);

-- Comments
COMMENT ON TABLE sire_document_types IS 'SIRE document type catalog (CC, CE, PA, etc.)';
COMMENT ON COLUMN sire_document_types.code IS 'SIRE document type code (2-char)';

-- ============================================
-- Table: user_tenant_permissions
-- Description: User access control across tenants
-- Row Count: 1
-- Dependencies: tenant_registry, auth.users (cross-schema)
-- ============================================

CREATE TABLE user_tenant_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer'::character varying,
  permissions JSONB DEFAULT '{}'::jsonb,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT user_tenant_permissions_pkey PRIMARY KEY (id),
  CONSTRAINT user_tenant_permissions_user_id_tenant_id_key UNIQUE (user_id, tenant_id),

  -- Cross-schema FK to Supabase Auth
  CONSTRAINT user_tenant_permissions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  CONSTRAINT user_tenant_permissions_granted_by_fkey
    FOREIGN KEY (granted_by)
    REFERENCES auth.users(id)
    ON DELETE NO ACTION,

  -- FK to tenant_registry
  CONSTRAINT user_tenant_permissions_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES tenant_registry(tenant_id)
    ON DELETE CASCADE
);

-- Indexes for user_tenant_permissions
CREATE INDEX idx_user_tenant_permissions_user_id ON user_tenant_permissions(user_id);
CREATE INDEX idx_user_tenant_permissions_tenant_id ON user_tenant_permissions(tenant_id);
CREATE INDEX idx_user_tenant_permissions_role ON user_tenant_permissions(role);
CREATE INDEX idx_user_tenant_permissions_active ON user_tenant_permissions(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE user_tenant_permissions IS 'User access control across tenants. Implements RBAC with role and permissions columns.';
COMMENT ON COLUMN user_tenant_permissions.user_id IS 'References auth.users.id (Supabase Auth schema)';
COMMENT ON COLUMN user_tenant_permissions.role IS 'Role: admin, editor, viewer, etc.';
COMMENT ON COLUMN user_tenant_permissions.permissions IS 'Granular permissions JSONB (optional, role-based by default)';

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Note: Full RLS policies will be created in later migration phases.
-- Enabling RLS now to ensure security by default.

ALTER TABLE tenant_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenant_permissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (minimal - full policies in later phase)
CREATE POLICY "Users can view their own tenant permissions"
  ON user_tenant_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- END Foundation Schema
-- ============================================
--
-- Summary:
-- - 5 tables created
-- - 3 foreign keys (including 2 cross-schema to auth.users)
-- - 26 indexes (including unique constraints)
-- - RLS enabled on 2 tables
--
-- Next: Apply remaining table schemas (Part 4-8)
-- ============================================
