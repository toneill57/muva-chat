-- Fix ALL vector search functions by adding 'extensions' to search_path
-- This fixes the error: operator does not exist: extensions.vector <=> extensions.vector

-- Critical functions for guest chat
CREATE OR REPLACE FUNCTION public.match_hotel_general_info(query_embedding vector, p_tenant_id character varying, similarity_threshold double precision DEFAULT 0.3, match_count integer DEFAULT 5)
 RETURNS TABLE(info_id uuid, info_title character varying, info_content text, info_type character varying, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gi.info_id,
    gi.info_title,
    gi.info_content,
    gi.info_type,
    1 - (gi.embedding_balanced <=> query_embedding) as similarity
  FROM hotels.guest_information gi
  WHERE gi.tenant_id = p_tenant_id
    AND gi.info_type IN ('faq', 'arrival')
    AND gi.is_active = true
    AND gi.embedding_balanced IS NOT NULL
    AND 1 - (gi.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY gi.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_guest_accommodations(query_embedding_fast vector, query_embedding_balanced vector, p_guest_unit_id uuid, p_tenant_id uuid, match_threshold double precision DEFAULT 0.15, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, name text, content text, similarity double precision, source_table text, is_guest_unit boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_public_unit_id uuid;
BEGIN
  v_public_unit_id := map_hotel_to_public_accommodation_id(p_guest_unit_id, p_tenant_id::text);

  RETURN QUERY
  SELECT
    aup.unit_id as id,
    aup.name,
    aup.description as content,
    1 - (aup.embedding_fast <=> query_embedding_fast) as similarity,
    'accommodation_units_public'::TEXT as source_table,
    (aup.unit_id = v_public_unit_id) as is_guest_unit
  FROM accommodation_units_public aup
  WHERE aup.tenant_id = p_tenant_id
    AND aup.is_active = true
    AND 1 - (aup.embedding_fast <=> query_embedding_fast) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_accommodations_hybrid(query_embedding_fast vector, query_embedding_balanced vector, p_tenant_id uuid, match_threshold double precision DEFAULT 0.2, match_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, content text, similarity_fast double precision, similarity_balanced double precision, similarity_combined double precision, source_file text, pricing jsonb, photos jsonb, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    aup.unit_id AS id,
    COALESCE(aup.description, '')::TEXT AS content,
    (1 - (aup.embedding_fast <=> query_embedding_fast))::FLOAT AS similarity_fast,
    (1 - (aup.embedding <=> query_embedding_balanced))::FLOAT AS similarity_balanced,
    (0.7 * (1 - (aup.embedding <=> query_embedding_balanced)) +
     0.3 * (1 - (aup.embedding_fast <=> query_embedding_fast)))::FLOAT AS similarity_combined,
    ('unit_' || COALESCE(aup.unit_number, '') || '_' || aup.name)::TEXT AS source_file,
    aup.pricing AS pricing,
    aup.photos AS photos,
    jsonb_build_object(
      'unit_id', aup.unit_id,
      'name', aup.name,
      'unit_type', aup.unit_type,
      'unit_number', aup.unit_number,
      'short_description', aup.short_description,
      'highlights', aup.highlights,
      'amenities', aup.amenities,
      'virtual_tour_url', aup.virtual_tour_url,
      'is_active', aup.is_active,
      'is_bookable', aup.is_bookable,
      'tier_1_similarity', (1 - (aup.embedding_fast <=> query_embedding_fast)),
      'tier_2_similarity', (1 - (aup.embedding <=> query_embedding_balanced))
    ) || COALESCE(aup.metadata, '{}'::jsonb) AS metadata
  FROM accommodation_units_public aup
  WHERE
    aup.tenant_id = p_tenant_id
    AND (1 - (aup.embedding_fast <=> query_embedding_fast)) > match_threshold
  ORDER BY similarity_combined DESC
  LIMIT match_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_muva_documents_public(query_embedding vector, match_threshold double precision DEFAULT 0.2, match_count integer DEFAULT 5)
 RETURNS TABLE(id uuid, content text, similarity double precision, source_file text, title text, description text, category text, subcategory text, business_info jsonb, document_type text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  SELECT
    id,
    content,
    1 - (embedding_fast <=> query_embedding) AS similarity,
    source_file,
    title,
    description,
    category,
    subcategory,
    business_info,
    document_type
  FROM muva_content
  WHERE embedding_fast IS NOT NULL
    AND 1 - (embedding_fast <=> query_embedding) > match_threshold
  ORDER BY embedding_fast <=> query_embedding
  LIMIT match_count;
$function$;

CREATE OR REPLACE FUNCTION public.match_accommodations_public(query_embedding vector, p_tenant_id uuid, match_threshold double precision DEFAULT 0.3, match_count integer DEFAULT 4)
 RETURNS TABLE(id uuid, content text, similarity double precision, source_file text, pricing jsonb, photos jsonb, metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    aup.unit_id AS id,
    COALESCE(aup.description, '')::TEXT AS content,
    1 - (aup.embedding_fast <=> query_embedding) AS similarity,
    ('unit_' || COALESCE(aup.unit_number, '') || '_' || aup.name)::TEXT AS source_file,
    aup.pricing AS pricing,
    aup.photos AS photos,
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
$function$;

CREATE OR REPLACE FUNCTION public.match_guest_information_balanced(query_embedding vector, p_tenant_id text, similarity_threshold double precision DEFAULT 0.3, match_count integer DEFAULT 5)
 RETURNS TABLE(info_id uuid, info_title character varying, info_content text, info_type character varying, similarity double precision)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gi.info_id,
    gi.info_title,
    gi.info_content,
    gi.info_type,
    1 - (gi.embedding_balanced <=> query_embedding) as similarity
  FROM hotels.guest_information gi
  WHERE gi.tenant_id = p_tenant_id
    AND gi.embedding_balanced IS NOT NULL
    AND gi.is_active = true
    AND 1 - (gi.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY gi.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$function$;
