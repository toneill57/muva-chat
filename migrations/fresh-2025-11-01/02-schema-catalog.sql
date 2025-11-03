-- ============================================
-- MUVA Chat - Catalog Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 3
-- ============================================
--
-- This file contains DDL for catalog tables containing
-- shared reference content across all tenants:
-- - policies: Tenant-specific policy documents (vector search)
-- - sire_content: SIRE compliance knowledge base (vector search)
-- - muva_content: Tourism/MUVA content library (vector search, 742 rows)
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - pgvector extension (for vector embeddings)
-- - tenant_registry table (for policies FK)
--
-- ============================================

-- Ensure vector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables (reverse dependency order)
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS sire_content CASCADE;
DROP TABLE IF EXISTS muva_content CASCADE;

-- ============================================
-- Table: policies
-- Description: Tenant-specific policy documents (cancellation, check-in, house rules, etc.)
-- Row Count: 0 (empty table, ready for tenant onboarding)
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE policies (
  policy_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_file TEXT NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT policies_pkey PRIMARY KEY (policy_id),
  
  -- Foreign key to tenant_registry
  CONSTRAINT policies_tenant_id_fkey
    FOREIGN KEY (tenant_id)
    REFERENCES tenant_registry(tenant_id)
    ON DELETE CASCADE
);

-- Indexes for policies
CREATE INDEX idx_policies_tenant ON policies(tenant_id);
CREATE INDEX idx_policies_source_file ON policies(source_file);
CREATE INDEX idx_policies_embedding ON policies 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Comments
COMMENT ON TABLE policies IS 'Tenant-specific policy documents with Matryoshka fast tier embeddings (1024 dims)';
COMMENT ON COLUMN policies.embedding IS 'Matryoshka fast tier embedding (1024 dimensions)';
COMMENT ON COLUMN policies.metadata IS 'JSON metadata including source_type, total_chunks, uploaded_at, etc.';

-- ============================================
-- Table: sire_content
-- Description: SIRE compliance knowledge base (regulatory docs, templates, guides)
-- Row Count: 8
-- Dependencies: None
-- ============================================

CREATE TABLE sire_content (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(3072),
  source_file VARCHAR,
  document_type VARCHAR,
  chunk_index INTEGER,
  total_chunks INTEGER,
  page_number INTEGER,
  section_title VARCHAR,
  language VARCHAR DEFAULT 'es'::character varying,
  embedding_model VARCHAR DEFAULT 'text-embedding-3-large'::character varying,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  status VARCHAR,
  version VARCHAR,
  tags TEXT[],
  keywords TEXT[],
  embedding_balanced vector(1536),

  CONSTRAINT sire_content_pkey PRIMARY KEY (id),
  
  -- Check constraint for document_type
  CONSTRAINT sire_content_document_type_check CHECK (
    document_type::text = ANY (ARRAY[
      'sire_docs'::text,
      'regulatory'::text,
      'technical'::text,
      'operational'::text,
      'template'::text,
      'muva'::text,
      'iot'::text,
      'ticketing'::text,
      'sire_regulatory'::text,
      'sire_template'::text,
      'compliance_guide'::text
    ])
  )
);

-- Indexes for sire_content
CREATE INDEX sire_content_document_type_idx ON sire_content(document_type);
CREATE INDEX sire_content_language_idx ON sire_content(language);
CREATE INDEX sire_content_category_idx ON sire_content(category);
CREATE INDEX sire_content_status_idx ON sire_content(status);
CREATE INDEX sire_content_version_idx ON sire_content(version);

-- Full-text search index (Spanish)
CREATE INDEX sire_content_title_gin_idx ON sire_content 
  USING gin (to_tsvector('spanish'::regconfig, title::text));

-- Vector indexes (Matryoshka multi-tier)
CREATE INDEX idx_sire_content_embedding_balanced ON sire_content 
  USING hnsw (embedding_balanced vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

-- Comments
COMMENT ON TABLE sire_content IS 'SIRE compliance knowledge base with Matryoshka embeddings (1536 balanced, 3072 full)';
COMMENT ON COLUMN sire_content.embedding IS 'Full precision embedding (3072 dimensions) - text-embedding-3-large';
COMMENT ON COLUMN sire_content.embedding_balanced IS 'Matryoshka embedding 1536 dims for balanced searches (Tier 2)';

-- ============================================
-- Table: muva_content
-- Description: Tourism content library (restaurants, beaches, activities, etc.)
-- Row Count: 742 (21 MB - largest catalog table)
-- Dependencies: None
-- ============================================

CREATE TABLE muva_content (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(3072),
  source_file VARCHAR,
  document_type VARCHAR,
  chunk_index INTEGER,
  total_chunks INTEGER,
  page_number INTEGER,
  section_title VARCHAR,
  language VARCHAR DEFAULT 'es'::character varying,
  embedding_model VARCHAR DEFAULT 'text-embedding-3-large'::character varying,
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  status VARCHAR,
  version VARCHAR,
  tags TEXT[],
  keywords TEXT[],
  embedding_fast vector(1024),
  schema_type TEXT,
  schema_version TEXT DEFAULT '1.0'::text,
  business_info JSONB DEFAULT '{}'::jsonb,
  subcategory VARCHAR(100),

  CONSTRAINT muva_content_pkey PRIMARY KEY (id),
  
  -- Check constraint for document_type
  CONSTRAINT muva_content_document_type_check CHECK (
    document_type::text = ANY (ARRAY[
      'tourism'::text,
      'restaurants'::text,
      'beaches'::text,
      'activities'::text,
      'transport'::text,
      'hotels'::text,
      'culture'::text,
      'events'::text,
      'spots'::text,
      'rentals'::text
    ])
  )
);

-- Indexes for muva_content
CREATE INDEX muva_content_document_type_idx ON muva_content(document_type);
CREATE INDEX muva_content_language_idx ON muva_content(language);
CREATE INDEX muva_content_category_idx ON muva_content(category);
CREATE INDEX muva_content_status_idx ON muva_content(status);
CREATE INDEX muva_content_version_idx ON muva_content(version);
CREATE INDEX idx_muva_content_subcategory ON muva_content(subcategory);

-- Full-text search index (Spanish)
CREATE INDEX muva_content_title_gin_idx ON muva_content 
  USING gin (to_tsvector('spanish'::regconfig, title::text));

-- JSONB index for business metadata
CREATE INDEX idx_muva_content_business_info ON muva_content USING gin (business_info);

-- Vector index (Matryoshka fast tier for performance)
CREATE INDEX idx_muva_content_embedding_fast ON muva_content 
  USING hnsw (embedding_fast vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);

-- Comments
COMMENT ON TABLE muva_content IS 'Tourism content library with business metadata and Matryoshka embeddings (1024 fast, 3072 full)';
COMMENT ON COLUMN muva_content.embedding IS 'Full precision embedding (3072 dimensions) - text-embedding-3-large';
COMMENT ON COLUMN muva_content.embedding_fast IS 'Matryoshka embedding 1024 dims for fast searches (Tier 1)';
COMMENT ON COLUMN muva_content.business_info IS 'Business metadata from YAML frontmatter: precio, telefono, website, contacto, horario, zona, subzona, categoria, etc.';
COMMENT ON COLUMN muva_content.subcategory IS 'Subcategory for granular filtering (e.g., deportes_acuaticos, gastronomia_local)';

-- ============================================
-- Row Level Security (RLS)
-- ============================================
-- Note: Catalog tables are shared across tenants, but policies table
-- requires tenant isolation.

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sire_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE muva_content ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (full policies in later phase)
-- policies: Only show tenant's own policies
CREATE POLICY "Tenants can view their own policies"
  ON policies
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenant_permissions WHERE user_id = auth.uid()
  ));

-- sire_content & muva_content: Shared content, readable by all authenticated users
CREATE POLICY "Authenticated users can view SIRE content"
  ON sire_content
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view MUVA content"
  ON muva_content
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- END Catalog Schema
-- ============================================
--
-- Summary:
-- - 3 tables created (policies, sire_content, muva_content)
-- - 1 foreign key (policies → tenant_registry)
-- - 22 indexes (including 3 vector indexes using HNSW and IVFFlat)
-- - Vector support: pgvector with dimensions 1024, 1536, 3072
-- - Matryoshka embeddings: Fast (1024), Balanced (1536), Full (3072)
-- - RLS enabled on all 3 tables with basic policies
-- - Full-text search on title columns (Spanish)
-- - JSONB business metadata with GIN index
--
-- Next: 03-schema-operations.sql (hotels, staff, accommodation units)
-- ============================================
