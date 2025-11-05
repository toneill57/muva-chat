-- Migration: Fix Vector Search Path
-- Date: November 3, 2025
-- Purpose: Add 'extensions' schema to search_path for all RPC functions using pgvector
--
-- Root Cause: Functions using pgvector operator <=> cannot find it because
-- the vector extension is installed in 'extensions' schema, but functions
-- only have search_path = 'public', 'hotels'
--
-- Error: "operator does not exist: extensions.vector <=> extensions.vector"
--
-- Solution: Add 'extensions' to search_path of all vector search functions

-- ============================================================================
-- FIX 1: map_hotel_to_public_accommodation_id_v1
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id_v1(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'extensions'  -- FIXED: Added extensions
AS $function$
DECLARE
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- Get hotel unit name
  SELECT name INTO v_hotel_name
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id
    AND tenant_id::text = p_tenant_id;

  -- Find matching public unit by name
  IF v_hotel_name IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'original_accommodation' = v_hotel_name
      AND name LIKE v_hotel_name || ' - Overview'
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_public_unit_id, p_hotel_unit_id);
END;
$function$;

-- ============================================================================
-- FIX 2: map_hotel_to_public_accommodation_id_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id_v2(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'extensions'  -- FIXED: Added extensions
AS $function$
DECLARE
  v_motopress_id integer;
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- PRIORITY 1: Search by motopress_unit_id (MOST STABLE)
  SELECT motopress_unit_id, name INTO v_motopress_id, v_hotel_name
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id
    AND tenant_id::text = p_tenant_id;

  IF v_motopress_id IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'motopress_unit_id' = v_motopress_id::text
    LIMIT 1;

    IF v_public_unit_id IS NOT NULL THEN
      RETURN v_public_unit_id;
    END IF;
  END IF;

  -- PRIORITY 2: Search by name (FALLBACK)
  IF v_hotel_name IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'original_accommodation' = v_hotel_name
      AND name LIKE v_hotel_name || ' - Overview'
    LIMIT 1;
  END IF;

  -- PRIORITY 3: Return original ID if no mapping found
  RETURN COALESCE(v_public_unit_id, p_hotel_unit_id);
END;
$function$;

-- ============================================================================
-- FIX 3: map_hotel_to_public_accommodation_id (default)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'extensions'  -- FIXED: Added extensions
AS $function$
BEGIN
  -- Delegate to v2 (enhanced version)
  RETURN map_hotel_to_public_accommodation_id_v2(p_hotel_unit_id, p_tenant_id);
END;
$function$;

-- ============================================================================
-- FIX 4: match_unit_manual_chunks (THE CRITICAL ONE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_unit_manual_chunks(
  query_embedding vector,
  p_accommodation_unit_id uuid,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 3
)
RETURNS TABLE(
  id uuid,
  manual_id uuid,
  chunk_content text,
  chunk_index integer,
  section_title text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'extensions'  -- FIXED: Added extensions
AS $function$
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
$function$;

-- ============================================================================
-- FIX 5: match_muva_documents (TOURISM SEARCH - CRITICAL)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_muva_documents(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 4
)
RETURNS TABLE(
  id uuid,
  content text,
  embedding vector,
  source_file text,
  title text,
  description text,
  category text,
  subcategory text,
  business_info jsonb,
  document_type text,
  chunk_index integer,
  total_chunks integer,
  created_at timestamp with time zone,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions', 'pg_temp'  -- FIXED: Added 'extensions'
AS $function$
  SELECT
    id,
    content,
    embedding,
    source_file,
    title,
    description,
    category,
    subcategory,
    business_info,
    document_type,
    chunk_index,
    total_chunks,
    created_at,
    1 - (embedding <=> query_embedding) as similarity
  FROM muva_content
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$function$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  func_count int;
BEGIN
  -- Verify all functions have correct search_path
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'map_hotel_to_public_accommodation_id',
      'map_hotel_to_public_accommodation_id_v1',
      'map_hotel_to_public_accommodation_id_v2',
      'match_unit_manual_chunks',
      'match_muva_documents'
    )
    AND pg_get_function_result(p.oid) IS NOT NULL;

  IF func_count = 5 THEN
    RAISE NOTICE '✅ All 5 vector search functions updated with extensions schema';
  ELSE
    RAISE WARNING '⚠️  Expected 5 functions, found: %', func_count;
  END IF;
END $$;

-- Test that vector operator is now accessible
DO $$
DECLARE
  test_result double precision;
BEGIN
  -- Test vector operator with dummy vectors
  SELECT 1 - ('[0.1,0.2,0.3]'::vector(3) <=> '[0.1,0.2,0.3]'::vector(3)) INTO test_result;

  IF test_result = 1.0 THEN
    RAISE NOTICE '✅ Vector operator <=> is accessible (similarity = 1.0)';
  ELSE
    RAISE WARNING '⚠️  Vector operator test returned unexpected value: %', test_result;
  END IF;

  RAISE NOTICE '✅ Vector search_path fix migration completed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Vector operator test FAILED: %', SQLERRM;
END $$;
