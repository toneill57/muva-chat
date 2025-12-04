-- ============================================
-- MUVA Chat - Embeddings Schema (DDL)
-- Generated: 2025-10-31
-- Source: Production (ooaumjzaztmutltifhoq)
-- Tables: 4
-- ============================================
--
-- This file contains DDL for embedding tables with vector columns.
--
-- CRITICAL: Requires pgvector extension
--
-- Prerequisites:
-- - PostgreSQL 15+
-- - pgvector extension
-- - tenant_registry, accommodation_units_public, accommodation_units_manual tables
--
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS tenant_muva_content CASCADE;
DROP TABLE IF EXISTS tenant_knowledge_embeddings CASCADE;
DROP TABLE IF EXISTS accommodation_units_manual_chunks CASCADE;
DROP TABLE IF EXISTS code_embeddings CASCADE;

-- ============================================
-- Table: code_embeddings
-- Description: Code embeddings for semantic code search
-- Row Count: 4,333 (74 MB - LARGE TABLE)
-- Dependencies: None
-- ============================================

CREATE TABLE code_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT code_embeddings_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_code_embeddings_file_path ON code_embeddings(file_path);
CREATE INDEX idx_code_embeddings_embedding_hnsw ON code_embeddings 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE code_embeddings IS 'Code embeddings for semantic code search (4,333 rows, 74 MB)';
COMMENT ON COLUMN code_embeddings.embedding IS 'Matryoshka Tier 2 embedding (1536 dimensions)';

-- ============================================
-- Table: accommodation_units_manual_chunks
-- Description: Chunked manual content with embeddings
-- Row Count: 219
-- Dependencies: tenant_registry, accommodation_units_public, accommodation_units_manual
-- ============================================

CREATE TABLE accommodation_units_manual_chunks (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  accommodation_unit_id UUID NOT NULL,
  manual_id UUID NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  section_title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding vector(3072),
  embedding_balanced vector(1536),
  embedding_fast vector(1024),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT accommodation_units_manual_chunks_pkey PRIMARY KEY (id),
  CONSTRAINT accommodation_units_manual_chunks_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey FOREIGN KEY (accommodation_unit_id) 
    REFERENCES accommodation_units_public(unit_id) ON DELETE CASCADE,
  CONSTRAINT accommodation_units_manual_chunks_manual_id_fkey FOREIGN KEY (manual_id) 
    REFERENCES accommodation_units_manual(unit_id) ON DELETE CASCADE
);

CREATE INDEX idx_manual_chunks_tenant ON accommodation_units_manual_chunks(tenant_id);
CREATE INDEX idx_manual_chunks_unit ON accommodation_units_manual_chunks(accommodation_unit_id);
CREATE INDEX idx_manual_chunks_manual ON accommodation_units_manual_chunks(manual_id);
CREATE INDEX idx_manual_chunks_embedding_fast_hnsw ON accommodation_units_manual_chunks 
  USING hnsw (embedding_fast vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_manual_chunks_embedding_balanced_hnsw ON accommodation_units_manual_chunks 
  USING hnsw (embedding_balanced vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE accommodation_units_manual_chunks IS 'Chunked manual content with Matryoshka embeddings (219 rows)';
COMMENT ON COLUMN accommodation_units_manual_chunks.embedding IS 'Full precision embedding (3072 dimensions)';
COMMENT ON COLUMN accommodation_units_manual_chunks.embedding_balanced IS 'Matryoshka Tier 2 (1536 dimensions)';
COMMENT ON COLUMN accommodation_units_manual_chunks.embedding_fast IS 'Matryoshka Tier 1 (1024 dimensions)';

-- ============================================
-- Table: tenant_knowledge_embeddings
-- Description: Tenant-specific knowledge embeddings
-- Row Count: 0
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE tenant_knowledge_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT tenant_knowledge_embeddings_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_knowledge_embeddings_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_knowledge_tenant ON tenant_knowledge_embeddings(tenant_id);
CREATE INDEX idx_tenant_knowledge_embedding_hnsw ON tenant_knowledge_embeddings 
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

COMMENT ON TABLE tenant_knowledge_embeddings IS 'Tenant-specific knowledge embeddings';
COMMENT ON COLUMN tenant_knowledge_embeddings.embedding IS 'Matryoshka Tier 2 embedding (1536 dimensions)';

-- ============================================
-- Table: tenant_muva_content
-- Description: Tenant-specific MUVA tourism content
-- Row Count: 0
-- Dependencies: tenant_registry
-- ============================================

CREATE TABLE tenant_muva_content (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  document_type TEXT,
  business_info JSONB,
  metadata JSONB,
  embedding vector,
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT tenant_muva_content_pkey PRIMARY KEY (id),
  CONSTRAINT tenant_muva_content_tenant_id_fkey FOREIGN KEY (tenant_id) 
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_muva_content_tenant ON tenant_muva_content(tenant_id);
CREATE INDEX idx_tenant_muva_content_type ON tenant_muva_content(document_type);

COMMENT ON TABLE tenant_muva_content IS 'Tenant-specific MUVA tourism content (empty, ready for tenant data)';

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_units_manual_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_muva_content ENABLE ROW LEVEL SECURITY;

-- ============================================
-- END Embeddings Schema
-- ============================================
--
-- Summary:
-- - 4 tables created
-- - 5 foreign keys
-- - 11 vector columns with dimensions: 1024, 1536, 3072
-- - 7 vector indexes (HNSW for performance)
-- - RLS enabled on all tables
--
-- Next: 06-schema-integrations.sql
-- ============================================
