-- Migration: Update match_accommodations_public to include metadata fields
-- Description: Merge accommodation_units_public.metadata JSONB into the response
--              so fields like view_type, floor_number, capacity, etc. are available to chat
-- Created: 2025-10-16

-- Drop existing function
DROP FUNCTION IF EXISTS match_accommodations_public(vector(1024), UUID, FLOAT, INT);

-- Recreate with metadata included in response
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
    -- Construct rich content for LLM context
    (
      aup.name || E'\n\n' ||
      COALESCE(aup.description, '') || E'\n\n' ||
      'Type: ' || COALESCE(aup.unit_type, 'N/A') || E'\n' ||
      'Unit Number: ' || COALESCE(aup.unit_number, 'N/A') || E'\n' ||
      'Highlights: ' || COALESCE(
        (SELECT string_agg(value::text, ', ')
         FROM jsonb_array_elements_text(aup.highlights)),
        'None'
      ) || E'\n' ||
      'Amenities: ' || COALESCE(aup.amenities::text, '{}')
    )::TEXT AS content,
    -- Calculate cosine similarity
    1 - (aup.embedding_fast <=> query_embedding) AS similarity,
    -- Source identifier
    ('unit_' || aup.unit_number || '_' || aup.name)::TEXT AS source_file,
    -- Pricing information for display
    aup.pricing AS pricing,
    -- Photos for rich responses
    aup.photos AS photos,
    -- UPDATED: Merge constructed metadata WITH table metadata column
    -- This ensures fields like view_type, floor_number from aup.metadata are available
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
    -- The || operator merges the two JSONB objects, with aup.metadata fields taking precedence
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
'Vector similarity search for PUBLIC chat system using Matryoshka Tier 1 embeddings (1024d).
Returns marketing-focused accommodation data with pricing, photos, AND metadata fields (view_type, floor_number, capacity, etc.).
Uses HNSW index for ultra-fast searches (<50ms typical).';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION match_accommodations_public TO authenticated, anon;
