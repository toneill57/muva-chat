-- Migration: Fix match_accommodations_public to return clean chunks
-- Description: Remove metadata concatenation - send ONLY the chunk description to LLM
--              Metadata is already available in separate JSONB field
-- Problem: Extra concatenation dilutes chunk content and LLM loses important info
-- Created: 2025-10-16

-- Drop existing function
DROP FUNCTION IF EXISTS match_accommodations_public(vector(1024), UUID, FLOAT, INT);

-- Recreate with CLEAN chunks (description only)
CREATE OR REPLACE FUNCTION match_accommodations_public(
  query_embedding vector(1024),
  p_tenant_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  source_file TEXT,
  pricing JSONB,
  photos JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aup.unit_id AS id,
    -- CLEAN CHUNK: Return ONLY the description (already contains accommodation name as prefix)
    -- All metadata is available in separate JSONB field below
    COALESCE(aup.description, '')::TEXT AS content,
    -- Calculate cosine similarity
    1 - (aup.embedding_fast <=> query_embedding) AS similarity,
    -- Source identifier
    ('unit_' || COALESCE(aup.unit_number, '') || '_' || aup.name)::TEXT AS source_file,
    -- Pricing information for display
    aup.pricing AS pricing,
    -- Photos for rich responses
    aup.photos AS photos,
    -- Complete metadata (includes section_type, section_title, original_accommodation, etc.)
    jsonb_build_object(
      'unit_id', aup.unit_id,
      'name', aup.name,
      'unit_type', aup.unit_type,
      'unit_number', aup.unit_number,
      'short_description', aup.short_description,
      'highlights', aup.highlights,
      'amenities', aup.amenities,
      'virtual_tour_url', aup.virtual_tour_url,
      'is_bookable', aup.is_bookable
    ) || COALESCE(aup.metadata, '{}'::jsonb) AS metadata
  FROM accommodation_units_public aup
  WHERE
    aup.tenant_id = p_tenant_id
    AND aup.is_active = true
    AND aup.is_bookable = true
    AND 1 - (aup.embedding_fast <=> query_embedding) > match_threshold
  ORDER BY aup.embedding_fast <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION match_accommodations_public IS
'Vector similarity search for PUBLIC chat with CLEAN semantic chunks.
Returns description-only content (no metadata concatenation) for better LLM context.
Metadata available separately in metadata JSONB field.
Uses HNSW index for ultra-fast searches (<50ms typical).';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION match_accommodations_public TO authenticated, anon;
