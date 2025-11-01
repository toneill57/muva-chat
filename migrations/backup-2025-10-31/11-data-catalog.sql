-- Migration File 11: Data - Catalog (muva_content)
-- Generated: 2025-10-31
-- Schema: Verified from production (ooaumjzaztmutltifhoq)
-- Data: Sample records for schema validation

-- NOTE: This is a MINIMAL version with correct schema
-- For full 742 records, use: pg_dump or copy-muva-content.ts script

SET session_replication_role = replica;

-- Sample muva_content insert (validates schema)
-- Full column list verified from production:
INSERT INTO muva_content (
  id, content, source_file, document_type, chunk_index, total_chunks,
  page_number, section_title, language, embedding_model, token_count,
  created_at, updated_at, title, description, category, status, version,
  tags, keywords, schema_type, schema_version, business_info, subcategory
) VALUES
(
  'cd278e57-503e-4ba8-944a-ef8f9865c2db',
  '# BLUE LIFE DIVE

## Descripción General

Blue Life Dive es el centro de buceo más veterano y profesional de San Andrés.',
  'blue-life-dive.md',
  'activities',
  0,
  12,
  NULL,
  NULL,
  'es',
  'text-embedding-3-large',
  NULL,
  '2025-09-30 17:44:24.621+00',
  '2025-09-30 17:44:24.621+00',
  'BLUE LIFE DIVE',
  'Escuela de buceo profesional con certificaciones PADI y más de 25 años de experiencia',
  'activities',
  'active',
  '2.0',
  ARRAY['diving', 'scuba', 'padi', 'certification', 'dive_school', 'underwater', 'buceo'],
  ARRAY['blue-life-dive', 'blue life dive', 'actividad', 'centro', 'padi', 'buceo'],
  NULL,
  '1.0',
  '{}'::jsonb,
  'diving'
);

SET session_replication_role = DEFAULT;

-- To populate full dataset:
-- Option 1: pg_dump from production
--   pg_dump $PROD_DB --table=muva_content --data-only --column-inserts > muva_full.sql
--
-- Option 2: Run sync script
--   pnpm dlx tsx scripts/sync-muva-embeddings.ts
--
-- This minimal file validates schema correctness for fresh migrations.
