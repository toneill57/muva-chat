-- Migration: Fix match_unit_manual_chunks RPC - Remove Incorrect Mapping
-- Date: 2025-10-24
-- Purpose: Remove public schema mapping that breaks manual chunk search
-- Reference: docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md
--
-- PROBLEM:
-- - Manual chunks have accommodation_unit_id pointing to hotels.accommodation_units (CORRECT per ADR-001)
-- - RPC was mapping hotel ID → public ID and searching with public ID (WRONG)
-- - Result: 0 chunks found because chunks have hotel IDs, not public IDs
--
-- SOLUTION:
-- - Remove all mapping logic
-- - Search directly with the hotel ID passed as parameter
-- - Manual chunks are PRIVATE data and should stay in hotels schema

CREATE OR REPLACE FUNCTION match_unit_manual_chunks(
  query_embedding vector,
  p_accommodation_unit_id uuid,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 3
) RETURNS TABLE(
  id uuid,
  manual_id uuid,
  chunk_content text,
  chunk_index integer,
  section_title text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
BEGIN
  -- NO MAPPING - Search directly with hotel ID
  -- Manual chunks reference hotels.accommodation_units (per ADR-001)
  -- The p_accommodation_unit_id passed from guest session is already a hotel ID

  RETURN QUERY
  SELECT
    aumc.id,
    aumc.manual_id,
    aumc.chunk_content,
    aumc.chunk_index,
    aumc.section_title,
    1 - (aumc.embedding_balanced <=> query_embedding) AS similarity
  FROM accommodation_units_manual_chunks aumc
  WHERE aumc.accommodation_unit_id = p_accommodation_unit_id
    AND 1 - (aumc.embedding_balanced <=> query_embedding) > match_threshold
  ORDER BY aumc.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_unit_manual_chunks IS
  'Search manual chunks directly using hotel UUID (no mapping). Manual chunks contain private operational data and reference hotels.accommodation_units per ADR-001.';
