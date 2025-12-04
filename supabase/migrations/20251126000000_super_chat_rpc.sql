-- Super Chat RPC: Combined search for tourism + accommodations
-- This function powers the MUVA Super Chat at the root URL (/)
-- It searches across:
--   1. muva_content (tourism info: beaches, restaurants, activities)
--   2. accommodation_units_public (all active tenants' accommodations)

CREATE OR REPLACE FUNCTION search_super_chat(
  query_embedding vector(1024),
  match_threshold double precision DEFAULT 0.2,
  match_count integer DEFAULT 8
) RETURNS TABLE(
  result_type text,
  tenant_id uuid,
  tenant_name text,
  tenant_subdomain text,
  id uuid,
  title text,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- Tourism content (muva_content)
  SELECT
    'tourism'::text as result_type,
    NULL::uuid as tenant_id,
    'MUVA'::text as tenant_name,
    NULL::text as tenant_subdomain,
    mc.id,
    COALESCE(mc.title, mc.section_title, 'Información turística')::text as title,
    mc.content,
    (1 - (mc.embedding_fast <=> query_embedding))::float as similarity,
    jsonb_build_object(
      'category', mc.category,
      'subcategory', mc.subcategory,
      'document_type', mc.document_type,
      'business_info', mc.business_info
    ) as metadata
  FROM muva_content mc
  WHERE mc.embedding_fast IS NOT NULL
    AND (1 - (mc.embedding_fast <=> query_embedding)) > match_threshold

  UNION ALL

  -- Accommodations from all active tenants
  SELECT
    'accommodation'::text as result_type,
    aup.tenant_id,
    tr.business_name as tenant_name,
    tr.subdomain as tenant_subdomain,
    aup.unit_id as id,
    aup.name as title,
    aup.description as content,
    (1 - (aup.embedding_fast <=> query_embedding))::float as similarity,
    jsonb_build_object(
      'unit_type', aup.unit_type,
      'pricing', aup.pricing,
      'amenities', aup.amenities,
      'photos', aup.photos,
      'highlights', aup.highlights
    ) as metadata
  FROM accommodation_units_public aup
  JOIN tenant_registry tr ON tr.tenant_id = aup.tenant_id
  WHERE aup.embedding_fast IS NOT NULL
    AND aup.is_active = true
    AND aup.is_bookable = true
    AND tr.is_active = true
    AND (1 - (aup.embedding_fast <=> query_embedding)) > match_threshold

  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION search_super_chat TO authenticated, anon;

COMMENT ON FUNCTION search_super_chat IS 'Combined vector search for MUVA Super Chat - searches tourism content and accommodations from all active tenants';
