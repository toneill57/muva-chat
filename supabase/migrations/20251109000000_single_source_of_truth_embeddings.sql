-- Migration: Single Source of Truth - Add Embedding Columns to hotels.accommodation_units
-- Objective: Consolidate hotels.accommodation_units as the ONLY source of truth for:
--   1. Operational data (reservations, MotoPress integration, pricing)
--   2. Public embeddings (for public chat at /)
--   3. Guest embeddings (for guest chat at /guest-chat)
--
-- Deprecates: accommodation_units_public, accommodation_units_manual_chunks

-- ============================================================================
-- STEP 1: Add Embedding Columns to hotels.accommodation_units
-- ============================================================================

-- Public embeddings (for public chat - semantic chunks like "Overview", "Amenities")
ALTER TABLE hotels.accommodation_units
  ADD COLUMN IF NOT EXISTS embedding_public_fast vector(256),  -- Matryoshka tier 1 (fast)
  ADD COLUMN IF NOT EXISTS embedding_public_full vector(1536); -- Matryoshka tier 2 (full)

-- Guest embeddings (for guest chat - manual chunks from accommodation manuals)
ALTER TABLE hotels.accommodation_units
  ADD COLUMN IF NOT EXISTS embedding_guest_fast vector(256),   -- Matryoshka tier 1 (fast)
  ADD COLUMN IF NOT EXISTS embedding_guest_full vector(1536);  -- Matryoshka tier 2 (full)

-- Add description fields for both contexts
ALTER TABLE hotels.accommodation_units
  ADD COLUMN IF NOT EXISTS public_description text,  -- Consolidated public description
  ADD COLUMN IF NOT EXISTS guest_description text;   -- Private description for guests (from manual)

-- Add index for vector search on public embeddings
CREATE INDEX IF NOT EXISTS idx_accommodation_units_embedding_public_fast
  ON hotels.accommodation_units
  USING ivfflat (embedding_public_fast vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_accommodation_units_embedding_public_full
  ON hotels.accommodation_units
  USING ivfflat (embedding_public_full vector_cosine_ops)
  WITH (lists = 100);

-- Add index for vector search on guest embeddings
CREATE INDEX IF NOT EXISTS idx_accommodation_units_embedding_guest_fast
  ON hotels.accommodation_units
  USING ivfflat (embedding_guest_fast vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_accommodation_units_embedding_guest_full
  ON hotels.accommodation_units
  USING ivfflat (embedding_guest_full vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================================
-- STEP 2: Update RPC for Public Chat (match_accommodations_public)
-- ============================================================================

-- Drop old function and recreate to use hotels.accommodation_units
DROP FUNCTION IF EXISTS public.match_accommodations_public(vector, uuid, double precision, integer);

CREATE OR REPLACE FUNCTION public.match_accommodations_public(
  query_embedding vector,
  p_tenant_id uuid,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 4
)
RETURNS TABLE(
  id uuid,
  content text,
  similarity double precision,
  source_file text,
  pricing jsonb,
  photos jsonb,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    -- Use public_description (consolidated from all chunks)
    COALESCE(au.public_description, au.full_description, '')::TEXT AS content,
    -- Calculate cosine similarity using public_fast embedding
    1 - (au.embedding_public_fast <=> query_embedding) AS similarity,
    -- Source identifier
    ('unit_' || COALESCE(au.unit_number, '') || '_' || au.name)::TEXT AS source_file,
    -- Pricing information
    au.pricing AS pricing,
    -- Photos for rich responses
    au.images AS photos,
    -- Complete metadata
    jsonb_build_object(
      'unit_id', au.id,
      'name', au.name,
      'unit_type', au.unit_type,
      'unit_number', au.unit_number,
      'short_description', au.short_description,
      'capacity', au.capacity,
      'bed_configuration', au.bed_configuration,
      'amenities_list', au.amenities_list,
      'status', au.status,
      'is_featured', au.is_featured
    ) AS metadata
  FROM hotels.accommodation_units au
  WHERE
    au.tenant_id = p_tenant_id::varchar
    AND au.status = 'active'
    AND au.embedding_public_fast IS NOT NULL  -- Only units with embeddings
    AND 1 - (au.embedding_public_fast <=> query_embedding) > match_threshold
  ORDER BY au.embedding_public_fast <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_accommodations_public(vector, uuid, double precision, integer)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.match_accommodations_public IS
'Vector search for public chat (/) using hotels.accommodation_units as single source of truth.
Uses embedding_public_fast for Matryoshka tier 1 search.';

-- ============================================================================
-- STEP 3: Create RPC for Guest Chat (match_accommodations_guest)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_accommodations_guest(
  query_embedding vector,
  p_tenant_id uuid,
  p_guest_unit_id uuid,  -- Filter to only the guest's accommodation
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 4
)
RETURNS TABLE(
  id uuid,
  content text,
  similarity double precision,
  source_file text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    -- Use guest_description (from accommodation manual)
    COALESCE(au.guest_description, au.full_description, '')::TEXT AS content,
    -- Calculate cosine similarity using guest_fast embedding
    1 - (au.embedding_guest_fast <=> query_embedding) AS similarity,
    -- Source identifier
    ('guest_unit_' || COALESCE(au.unit_number, '') || '_' || au.name)::TEXT AS source_file,
    -- Metadata for guest context
    jsonb_build_object(
      'unit_id', au.id,
      'name', au.name,
      'unit_number', au.unit_number,
      'amenities_list', au.amenities_list
    ) AS metadata
  FROM hotels.accommodation_units au
  WHERE
    au.tenant_id = p_tenant_id::varchar
    AND au.id = p_guest_unit_id  -- CRITICAL: Only search guest's own unit
    AND au.embedding_guest_fast IS NOT NULL  -- Only if guest embeddings exist
    AND 1 - (au.embedding_guest_fast <=> query_embedding) > match_threshold
  ORDER BY au.embedding_guest_fast <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_accommodations_guest(vector, uuid, uuid, double precision, integer)
  TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.match_accommodations_guest IS
'Vector search for guest chat (/guest-chat) using hotels.accommodation_units.
Uses embedding_guest_fast for Matryoshka tier 1 search.
SECURITY: Only searches the guest''s own accommodation unit.';

-- ============================================================================
-- STEP 4: Mark Old Tables as DEPRECATED
-- ============================================================================

COMMENT ON TABLE public.accommodation_units_public IS
'DEPRECATED: This table is no longer used. Use hotels.accommodation_units instead.
Kept temporarily for migration verification. Will be dropped in future migration.';

COMMENT ON TABLE public.accommodation_units_manual_chunks IS
'DEPRECATED: This table is no longer used. Use hotels.accommodation_units.guest_description instead.
Kept temporarily for migration verification. Will be dropped in future migration.';

-- ============================================================================
-- STEP 5: Add Migration Metadata
-- ============================================================================

-- Track migration state
CREATE TABLE IF NOT EXISTS public.migration_metadata (
  migration_name text PRIMARY KEY,
  applied_at timestamptz DEFAULT now(),
  description text,
  deprecated_tables text[],
  notes text
);

INSERT INTO public.migration_metadata (migration_name, description, deprecated_tables, notes)
VALUES (
  '20251109000000_single_source_of_truth_embeddings',
  'Consolidate hotels.accommodation_units as single source of truth for embeddings',
  ARRAY['accommodation_units_public', 'accommodation_units_manual_chunks'],
  'Requires re-sync of accommodations to populate embeddings. Old tables marked as DEPRECATED but not dropped yet.'
)
ON CONFLICT (migration_name) DO NOTHING;
