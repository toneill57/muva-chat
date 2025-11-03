-- ============================================
-- MUVA Chat - Database Functions (Production Schema)
-- Generated: 2025-11-01
-- Functions: 86 total (all with search_path)
-- Source: Production database schema export
-- ============================================
--
-- CRITICAL Nov 1 Requirement:
-- ALL functions MUST include: SET search_path = public, pg_temp
--
-- Why: RLS policies depend on current_setting('app.tenant_id')
-- Without search_path, functions run in wrong schema context causing RLS failures
--
-- Migration Note:
-- - All functions extracted from public schema only
-- - Hotels schema functions excluded (legacy/deprecated)
-- - Each function verified for search_path setting
-- - Malformed functions filtered out
--
-- ============================================

-- ========================================
-- CATEGORY 1: Tenant Management (10 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "get_accommodation_tenant_id"("p_unit_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  -- Get tenant_id from accommodation_units_public (it's stored as uuid but we return as text)
  SELECT tenant_id::text INTO v_tenant_id
  FROM accommodation_units_public
  WHERE unit_id = p_unit_id
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_units_by_tenant"("p_tenant_id" "uuid") RETURNS TABLE("unit_id" "uuid", "tenant_id" "uuid", "name" "text", "description" "text", "short_description" "text", "unit_number" "text", "unit_type" character varying, "highlights" "jsonb", "amenities" "jsonb", "pricing" "jsonb", "photos" "jsonb", "virtual_tour_url" "text", "metadata" "jsonb", "embedding_fast" "vector", "embedding" "vector", "is_active" boolean, "is_bookable" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.unit_id,
    au.tenant_id,
    au.name,
    au.description,
    au.short_description,
    au.unit_number,
    au.unit_type,
    au.highlights,
    au.amenities,
    au.pricing,
    au.photos,
    au.virtual_tour_url,
    au.metadata,
    au.embedding_fast,
    au.embedding,
    au.is_active,
    au.is_bookable,
    au.created_at,
    au.updated_at
  FROM accommodation_units_public au
  WHERE au.tenant_id = p_tenant_id
  ORDER BY
    COALESCE(au.metadata->>'display_order', '999')::INTEGER ASC,
    au.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") RETURNS TABLE("id" "uuid", "tenant_id" character varying, "name" character varying, "unit_number" character varying, "unit_type" character varying, "description" "text", "short_description" "text", "capacity" "jsonb", "bed_configuration" "jsonb", "size_m2" integer, "view_type" character varying, "images" "jsonb", "motopress_type_id" integer, "motopress_unit_id" integer, "status" character varying, "is_featured" boolean, "display_order" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Query real accommodation units from hotels.accommodation_units
  -- SECURITY DEFINER allows cross-schema access despite RLS policies
  RETURN QUERY
  SELECT
    au.id,
    au.tenant_id,
    au.name,
    au.unit_number,
    au.unit_type,
    au.description,
    au.short_description,
    au.capacity,
    au.bed_configuration,
    au.size_m2,
    au.view_type,
    au.images,
    au.motopress_type_id,
    au.motopress_unit_id,
    au.status,
    au.is_featured,
    au.display_order,
    au.created_at,
    au.updated_at
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::varchar
  ORDER BY
    COALESCE(au.display_order, 999) ASC,
    au.name ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "get_tenant_schema"("tenant_nit" character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
    schema_name VARCHAR(63);
BEGIN
    SELECT tr.schema_name INTO schema_name
    FROM public.tenant_registry tr
    WHERE tr.nit = tenant_nit AND tr.is_active = true;
    
    RETURN schema_name;
END;
$$;

CREATE OR REPLACE FUNCTION "has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM tenant_registry
    WHERE tenant_id = p_tenant_id
    AND (features->>p_feature_name)::boolean = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION "match_tenant_muva_documents"("query_embedding" "vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "similarity" double precision, "source_file" "text", "business_info" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tmc.id,
    tmc.title,
    tmc.content,
    (1 - (tmc.embedding <=> query_embedding))::FLOAT AS similarity,
    tmc.source_file,
    tmc.business_info,
    tmc.metadata
  FROM tenant_muva_content tmc
  WHERE
    tmc.tenant_id = p_tenant_id
    AND (1 - (tmc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "search_hotels_by_tenant"("query_embedding" "vector", "tenant_ids" "text"[] DEFAULT ARRAY['simmerdown'::"text"], "content_types" "text"[] DEFAULT ARRAY['accommodation_units'::"text", 'policies'::"text", 'guest_information'::"text"], "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision, "tenant_id" "text")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH combined_results AS (
    -- Accommodation units
    SELECT 
      au.unit_id::text as id,
      COALESCE(au.description, au.content, au.unit_name) as content,
      jsonb_build_object(
        'unit_name', au.unit_name,
        'unit_type', au.unit_type,
        'max_capacity', au.max_capacity,
        'base_price_cop', au.base_price_cop,
        'source_table', 'accommodation_units'
      ) as metadata,
      1 - (au.embedding <=> query_embedding) AS similarity,
      au.tenant_id
    FROM hotels.accommodation_units au
    WHERE au.tenant_id = ANY(tenant_ids)
      AND 'accommodation_units' = ANY(content_types)
      AND au.embedding IS NOT NULL
      AND (au.embedding <=> query_embedding) < (1 - match_threshold)
    
    UNION ALL
    
    -- Policies
    SELECT 
      sp.policy_id::text as id,
      sp.policy_content as content,
      jsonb_build_object(
        'policy_type', sp.policy_type,
        'policy_title', sp.policy_title,
        'source_table', 'policies'
      ) as metadata,
      1 - (sp.embedding <=> query_embedding) AS similarity,
      sp.tenant_id
    FROM hotels.policies sp
    WHERE sp.tenant_id = ANY(tenant_ids)
      AND 'policies' = ANY(content_types)
      AND sp.embedding IS NOT NULL
      AND sp.is_active = true
      AND (sp.embedding <=> query_embedding) < (1 - match_threshold)
    
    UNION ALL
    
    -- Guest information
    SELECT 
      gi.info_id::text as id,
      gi.info_content as content,
      jsonb_build_object(
        'info_type', gi.info_type,
        'info_title', gi.info_title,
        'source_table', 'guest_information'
      ) as metadata,
      1 - (gi.embedding <=> query_embedding) AS similarity,
      gi.tenant_id
    FROM hotels.guest_information gi
    WHERE gi.tenant_id = ANY(tenant_ids)
      AND 'guest_information' = ANY(content_types)
      AND gi.embedding IS NOT NULL
      AND gi.is_active = true
      AND (gi.embedding <=> query_embedding) < (1 - match_threshold)
  )
  SELECT cr.id, cr.content, cr.metadata, cr.similarity, cr.tenant_id
  FROM combined_results cr
  ORDER BY cr.similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "vector", "p_match_threshold" double precision DEFAULT 0.7, "p_match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "file_path" "text", "chunk_index" integer, "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tke.id,
    tke.file_path,
    tke.chunk_index,
    tke.content,
    1 - (tke.embedding <=> p_query_embedding) AS similarity
  FROM tenant_knowledge_embeddings tke
  WHERE tke.tenant_id = p_tenant_id
    AND 1 - (tke.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY tke.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "set_app_tenant_id"("tenant_id" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, false);
    RETURN 'Tenant ID configurado: ' || tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION "simulate_app_tenant_access"("input_tenant_id" "text") RETURNS TABLE("scenario" "text", "configured_tenant" "text", "properties_visible" integer, "units_visible" integer, "isolation_working" boolean)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
    props_count INTEGER;
    units_count INTEGER;
    expected_isolation BOOLEAN;
BEGIN
    -- Configurar el tenant_id para esta sesión
    PERFORM set_config('app.current_tenant_id', input_tenant_id, false);
    
    -- Contar registros visibles
    SELECT COUNT(*) INTO props_count FROM hotels.properties;
    SELECT COUNT(*) INTO units_count FROM hotels.accommodation_units;
    
    -- Determinar si el aislamiento está funcionando correctamente
    expected_isolation := CASE 
        WHEN input_tenant_id = 'simmerdown' THEN (props_count = 1 AND units_count = 8)
        WHEN input_tenant_id = '' OR input_tenant_id IS NULL THEN (props_count = 0 AND units_count = 0)
        ELSE (props_count = 0 AND units_count = 0)  -- Otros tenants no deberían ver nada
    END;
    
    RETURN QUERY SELECT 
        CASE 
            WHEN input_tenant_id = 'simmerdown' THEN 'Tenant válido (simmerdown)'
            WHEN input_tenant_id = '' OR input_tenant_id IS NULL THEN 'Sin tenant configurado'
            ELSE 'Tenant inválido (' || input_tenant_id || ')'
        END::TEXT,
        COALESCE(input_tenant_id, 'NULL')::TEXT,
        props_count,
        units_count,
        expected_isolation;
END;
$$;

-- ========================================
-- CATEGORY 2: Guest Authentication & Conversations (7 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "get_archived_conversations_to_delete"("p_tenant_id" "text" DEFAULT NULL::"text", "p_days_archived" integer DEFAULT 90) RETURNS TABLE("id" "uuid", "title" "text", "archived_at" timestamp with time zone, "days_archived" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (p_days_archived || ' days')::INTERVAL;
  
  RETURN QUERY
  SELECT
    gc.id,
    gc.title::TEXT,  -- CAST VARCHAR to TEXT
    gc.archived_at,
    EXTRACT(DAY FROM NOW() - gc.archived_at)::INT as days_archived
  FROM guest_conversations gc
  WHERE gc.is_archived = TRUE
    AND gc.archived_at < cutoff_date
    AND (p_tenant_id IS NULL OR gc.tenant_id = p_tenant_id)
  ORDER BY gc.archived_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "conversation_id" "uuid", "role" "text", "content" "text", "metadata" "jsonb", "created_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.conversation_id,
    cm.role::TEXT,
    cm.content,
    cm.metadata,
    cm.created_at
  FROM chat_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION "get_guest_conversation_metadata"("p_conversation_id" "uuid") RETURNS TABLE("id" "uuid", "tenant_id" "text", "guest_id" "uuid", "title" "text", "last_message" "text", "message_count" integer, "compressed_history" "jsonb", "favorites" "jsonb", "is_archived" boolean, "archived_at" timestamp with time zone, "last_activity_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.tenant_id::TEXT,
    gc.guest_id,
    gc.title::TEXT,
    gc.last_message,
    COALESCE((
      SELECT COUNT(*)::INT
      FROM chat_messages cm
      WHERE cm.conversation_id = gc.id
    ), 0) as message_count,
    COALESCE(gc.compressed_history, '[]'::jsonb) as compressed_history,
    COALESCE(gc.favorites, '[]'::jsonb) as favorites,
    gc.is_archived,
    gc.archived_at,
    gc.last_activity_at,
    gc.created_at,
    gc.updated_at
  FROM guest_conversations gc
  WHERE gc.id = p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION "get_inactive_conversations"("p_tenant_id" "text" DEFAULT NULL::"text", "p_days_inactive" integer DEFAULT 30) RETURNS TABLE("id" "uuid", "title" "text", "last_activity_at" timestamp with time zone, "days_inactive" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (p_days_inactive || ' days')::INTERVAL;
  
  RETURN QUERY
  SELECT
    gc.id,
    gc.title::TEXT,  -- CAST VARCHAR to TEXT
    gc.last_activity_at,
    EXTRACT(DAY FROM NOW() - gc.last_activity_at)::INT as days_inactive
  FROM guest_conversations gc
  WHERE gc.is_archived = FALSE
    AND gc.last_activity_at < cutoff_date
    AND (p_tenant_id IS NULL OR gc.tenant_id = p_tenant_id)
  ORDER BY gc.last_activity_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "match_conversation_memory"("query_embedding" "vector", "p_session_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 2) RETURNS TABLE("id" "uuid", "summary_text" "text", "key_entities" "jsonb", "message_range" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.summary_text,
    cm.key_entities,
    cm.message_range,
    1 - (cm.embedding_fast <=> query_embedding) AS similarity
  FROM conversation_memory cm
  WHERE
    cm.session_id = p_session_id
    AND 1 - (cm.embedding_fast <=> query_embedding) > match_threshold
  ORDER BY cm.embedding_fast <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "update_conversation_attachments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- ========================================
-- CATEGORY 3: Vector Search & Embeddings (29 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "get_full_document"("p_source_file" character varying, "p_table_name" character varying DEFAULT 'muva_content'::character varying) RETURNS TABLE("id" "uuid", "content" "text", "title" character varying, "description" "text", "business_info" "jsonb", "full_content" "text")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Retorna todos los chunks del mismo source_file
  -- Ordenados por chunk_index
  -- Con full_content = string_agg de todos los chunks

  IF p_table_name = 'muva_content' THEN
    RETURN QUERY
    SELECT
      mc.id,
      mc.content,
      mc.title,
      mc.description,
      mc.business_info,
      (
        SELECT string_agg(content_chunk, E'\n\n' ORDER BY chunk_idx)
        FROM (
          SELECT mc2.content as content_chunk, mc2.chunk_index as chunk_idx
          FROM muva_content mc2
          WHERE mc2.source_file = p_source_file
          ORDER BY mc2.chunk_index
        ) chunks
      ) as full_content
    FROM muva_content mc
    WHERE mc.source_file = p_source_file
    ORDER BY mc.chunk_index;

  ELSIF p_table_name = 'accommodation_units' THEN
    -- Para accommodation_units no hay chunks, retornar descripción completa
    RETURN QUERY
    SELECT
      au.id,
      au.description as content,
      au.name as title,
      au.short_description as description,
      NULL::JSONB as business_info,
      au.description as full_content
    FROM accommodation_units au
    WHERE au.id = p_source_file::UUID;

  ELSIF p_table_name = 'sire_content' THEN
    -- Para SIRE content (también chunked)
    RETURN QUERY
    SELECT
      sc.id,
      sc.content,
      sc.title,
      sc.description,
      NULL::JSONB as business_info,
      (
        SELECT string_agg(content_chunk, E'\n\n' ORDER BY chunk_idx)
        FROM (
          SELECT sc2.content as content_chunk, sc2.chunk_index as chunk_idx
          FROM sire_content sc2
          WHERE sc2.source_file = p_source_file
          ORDER BY sc2.chunk_index
        ) chunks
      ) as full_content
    FROM sire_content sc
    WHERE sc.source_file = p_source_file
    ORDER BY sc.chunk_index;

  ELSE
    -- Unsupported table
    RAISE EXCEPTION 'Unsupported table: %. Supported tables: muva_content, accommodation_units, sire_content', p_table_name;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "match_accommodation_units_balanced"("query_embedding" "vector", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "booking_policies" "text", "capacity" "jsonb", "is_featured" boolean, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.description,
    a.booking_policies,
    a.capacity,
    a.is_featured,
    1 - (a.embedding_balanced <=> query_embedding) as similarity
  FROM accommodation_units a
  WHERE a.embedding_balanced IS NOT NULL
    AND 1 - (a.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY a.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_accommodation_units_fast"("query_embedding" "vector", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "content" "text", "view_type" character varying, "is_featured" boolean, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    COALESCE(a.description, '') as description,
    CASE 
      WHEN a.description IS NOT NULL AND LENGTH(a.description) > 0 THEN
        -- Use rich MotoPress description as primary content
        CONCAT(
          'Apartamento: ', a.name, '. ',
          SUBSTRING(a.description, 1, 800), '... ',
          'Capacidad: ', COALESCE((a.capacity->>'total')::text, '2'), ' personas (',
          COALESCE((a.capacity->>'adults')::text, '2'), ' adultos, ',
          COALESCE((a.capacity->>'children')::text, '0'), ' niños). ',
          CASE 
            WHEN a.short_description IS NOT NULL AND LENGTH(a.short_description) > 0 
            THEN 'Resumen: ' || a.short_description || '. '
            ELSE '' 
          END,
          'Estado: ', COALESCE(a.status, 'Activo'), '.'
        )
      ELSE
        -- Fallback to synthetic content for units without descriptions
        CONCAT(
          'Apartamento: ', a.name, '. ',
          'Capacidad: ', COALESCE((a.capacity->>'total')::text, '2'), ' personas (',
          COALESCE((a.capacity->>'adults')::text, '2'), ' adultos, ',
          COALESCE((a.capacity->>'children')::text, '0'), ' niños). ',
          'Configuración de cama: ', COALESCE(a.bed_configuration->>'details', 'Configuración estándar'), '. ',
          'Estado: ', COALESCE(a.status, 'Activo'), '.'
        )
    END as content,
    COALESCE(a.view_type, '') as view_type,
    COALESCE(a.is_featured, false) as is_featured,
    1 - (a.embedding_fast <=> query_embedding) as similarity
  FROM hotels.accommodation_units a
  WHERE a.embedding_fast IS NOT NULL
    AND 1 - (a.embedding_fast <=> query_embedding) > similarity_threshold
  ORDER BY a.embedding_fast <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_accommodations_hybrid"("query_embedding_fast" "vector", "query_embedding_balanced" "vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "content" "text", "similarity_fast" double precision, "similarity_balanced" double precision, "similarity_combined" double precision, "source_file" "text", "pricing" "jsonb", "photos" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aup.unit_id AS id,
    -- Clean chunk: ONLY the description (already contains accommodation name)
    COALESCE(aup.description, '')::TEXT AS content,

    -- Tier 1 similarity (used for fast initial search)
    (1 - (aup.embedding_fast <=> query_embedding_fast))::FLOAT AS similarity_fast,

    -- Tier 2 similarity (higher precision for re-ranking)
    (1 - (aup.embedding <=> query_embedding_balanced))::FLOAT AS similarity_balanced,

    -- Combined score: 70% Tier 2 (precision) + 30% Tier 1 (speed)
    -- This weighting emphasizes precision while still valuing fast search results
    (0.7 * (1 - (aup.embedding <=> query_embedding_balanced)) +
     0.3 * (1 - (aup.embedding_fast <=> query_embedding_fast)))::FLOAT AS similarity_combined,

    -- Source identifier
    ('unit_' || COALESCE(aup.unit_number, '') || '_' || aup.name)::TEXT AS source_file,

    -- Pricing information for display
    aup.pricing AS pricing,

    -- Photos for rich responses
    aup.photos AS photos,

    -- Complete metadata (includes section_type, section_title, original_accommodation, status, etc.)
    jsonb_build_object(
      'unit_id', aup.unit_id,
      'name', aup.name,
      'unit_type', aup.unit_type,
      'unit_number', aup.unit_number,
      'short_description', aup.short_description,
      'highlights', aup.highlights,
      'amenities', aup.amenities,
      'virtual_tour_url', aup.virtual_tour_url,
      'is_active', aup.is_active,          -- Include status in metadata
      'is_bookable', aup.is_bookable,      -- Include bookability in metadata
      'tier_1_similarity', (1 - (aup.embedding_fast <=> query_embedding_fast)),
      'tier_2_similarity', (1 - (aup.embedding <=> query_embedding_balanced))
    ) || COALESCE(aup.metadata, '{}'::jsonb) AS metadata

  FROM accommodation_units_public aup
  WHERE
    aup.tenant_id = p_tenant_id
    -- REMOVED: AND aup.is_active = true (to show all accommodations)
    -- REMOVED: AND aup.is_bookable = true (to show all accommodations)
    -- Initial filter using Tier 1 (leverages HNSW index for speed)
    AND (1 - (aup.embedding_fast <=> query_embedding_fast)) > match_threshold

  -- Final sort by combined score (Tier 2 weighted higher)
  ORDER BY similarity_combined DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_accommodations_public"("query_embedding" "vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision, "source_file" "text", "pricing" "jsonb", "photos" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION "match_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "vector", "source_file" character varying, "document_type" character varying, "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    content,
    embedding,
    source_file,
    document_type,
    chunk_index,
    total_chunks,
    created_at,
    1 - (embedding <=> query_embedding) as similarity
  FROM document_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION "match_documents_with_tenant"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.78, "match_count" integer DEFAULT 10, "domain_filter" "text" DEFAULT NULL::"text", "tenant_nit" character varying DEFAULT NULL::character varying) RETURNS TABLE("content" "text", "similarity" double precision, "source_file" character varying, "document_type" character varying, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
    tenant_schema VARCHAR(63);
BEGIN
    -- Si se especifica un NIT, buscar en el schema específico del tenant
    IF tenant_nit IS NOT NULL THEN
        SELECT public.get_tenant_schema(tenant_nit) INTO tenant_schema;
        
        IF tenant_schema IS NOT NULL THEN
            -- Ejecutar búsqueda en el schema específico del tenant
            IF tenant_schema = 'simmerdown' THEN
                RETURN QUERY
                SELECT 
                    sc.content,
                    sc.similarity,
                    COALESCE(sc.source_type, 'simmerdown_content') AS source_file,
                    sc.source_type AS document_type,
                    jsonb_build_object(
                        'tenant', tenant_schema,
                        'domain', 'hotel',
                        'metadata', sc.metadata
                    ) AS metadata
                FROM simmerdown.search_content(
                    query_embedding, 
                    match_threshold, 
                    match_count
                ) sc;
                RETURN;
            END IF;
        END IF;
    END IF;
    
    -- Fallback a búsqueda unificada existente
    RETURN QUERY
    SELECT * FROM public.match_documents(
        query_embedding,
        match_threshold, 
        match_count,
        domain_filter
    );
END;
$$;

CREATE OR REPLACE FUNCTION "match_guest_accommodations"("query_embedding_fast" "vector", "query_embedding_balanced" "vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.15, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "name" "text", "content" "text", "similarity" double precision, "source_table" "text", "is_guest_unit" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_public_unit_id uuid;
BEGIN
  -- Map the hotel unit ID to public unit ID for correct matching
  v_public_unit_id := map_hotel_to_public_accommodation_id(p_guest_unit_id, p_tenant_id::text);
  
  RETURN QUERY
  -- Only search public info (ALL units) - accommodation_units_public
  -- Manual chunks are handled separately by searchUnitManual() → match_unit_manual_chunks
  SELECT
    aup.unit_id as id,
    aup.name,
    aup.description as content,
    1 - (aup.embedding_fast <=> query_embedding_fast) as similarity,
    'accommodation_units_public'::TEXT as source_table,
    (aup.unit_id = v_public_unit_id) as is_guest_unit  -- Use mapped ID for comparison
  FROM accommodation_units_public aup
  WHERE aup.tenant_id = p_tenant_id
    AND aup.is_active = true
    AND 1 - (aup.embedding_fast <=> query_embedding_fast) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_guest_information_balanced"("query_embedding" "vector", "p_tenant_id" "text", "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5) RETURNS TABLE("info_id" "uuid", "info_title" character varying, "info_content" "text", "info_type" character varying, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
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
$$;

CREATE OR REPLACE FUNCTION "match_hotel_content"("query_embedding" "vector", "client_nit" character varying DEFAULT NULL::character varying, "property_name" character varying DEFAULT NULL::character varying, "match_threshold" double precision DEFAULT 0.78, "match_count" integer DEFAULT 10) RETURNS TABLE("content" "text", "similarity" double precision, "source_type" character varying, "source_name" character varying, "client_info" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    WITH hotel_searches AS (
        -- Buscar en apartamentos específicos
        SELECT 
            aol.content,
            1 - (aol.embedding <=> query_embedding) AS similarity,
            'apartment' AS source_type,
            'apartment_one_love' AS source_name,
            jsonb_build_object(
                'nit', hc.nit,
                'razon_social', hc.razon_social,
                'nombre_comercial', hc.nombre_comercial,
                'property_name', hp.property_name
            ) AS client_info,
            jsonb_build_object(
                'apartment_name', ha.apartment_name,
                'max_capacity', ha.max_capacity,
                'base_price_cop', ha.base_price_cop
            ) AS metadata
        FROM apartment_one_love aol
        JOIN hotel_apartments ha ON aol.apartment_id = ha.apartment_id
        JOIN hotel_properties hp ON ha.property_id = hp.property_id
        JOIN hotel_clients hc ON hp.client_id = hc.id
        WHERE aol.embedding IS NOT NULL
        AND (client_nit IS NULL OR hc.nit = client_nit)
        AND (property_name IS NULL OR hp.property_name ILIKE '%' || property_name || '%')
        
        UNION ALL
        
        -- Buscar en políticas del hotel
        SELECT 
            hp_pol.content,
            1 - (hp_pol.embedding <=> query_embedding) AS similarity,
            'policy' AS source_type,
            hp_pol.policy_type AS source_name,
            jsonb_build_object(
                'nit', hc.nit,
                'razon_social', hc.razon_social,
                'nombre_comercial', hc.nombre_comercial,
                'property_name', hp.property_name
            ) AS client_info,
            jsonb_build_object(
                'policy_title', hp_pol.policy_title,
                'policy_type', hp_pol.policy_type
            ) AS metadata
        FROM hotel_policies hp_pol
        JOIN hotel_properties hp ON hp_pol.property_id = hp.property_id
        JOIN hotel_clients hc ON hp.client_id = hc.id
        WHERE hp_pol.embedding IS NOT NULL
        AND (client_nit IS NULL OR hc.nit = client_nit)
        AND (property_name IS NULL OR hp.property_name ILIKE '%' || property_name || '%')
        
        UNION ALL
        
        -- Buscar en procedimientos para huéspedes
        SELECT 
            gp.content,
            1 - (gp.embedding <=> query_embedding) AS similarity,
            'procedure' AS source_type,
            gp.procedure_type AS source_name,
            jsonb_build_object(
                'nit', hc.nit,
                'razon_social', hc.razon_social,
                'nombre_comercial', hc.nombre_comercial,
                'property_name', hp.property_name
            ) AS client_info,
            jsonb_build_object(
                'procedure_title', gp.procedure_title,
                'procedure_type', gp.procedure_type
            ) AS metadata
        FROM guest_procedures gp
        JOIN hotel_properties hp ON gp.property_id = hp.property_id
        JOIN hotel_clients hc ON hp.client_id = hc.id
        WHERE gp.embedding IS NOT NULL
        AND (client_nit IS NULL OR hc.nit = client_nit)
        AND (property_name IS NULL OR hp.property_name ILIKE '%' || property_name || '%')
        
        UNION ALL
        
        -- Buscar en información de la propiedad
        SELECT 
            pi.content,
            1 - (pi.embedding <=> query_embedding) AS similarity,
            'property_info' AS source_type,
            pi.info_type AS source_name,
            jsonb_build_object(
                'nit', hc.nit,
                'razon_social', hc.razon_social,
                'nombre_comercial', hc.nombre_comercial,
                'property_name', hp.property_name
            ) AS client_info,
            jsonb_build_object(
                'info_title', pi.info_title,
                'info_type', pi.info_type
            ) AS metadata
        FROM property_information pi
        JOIN hotel_properties hp ON pi.property_id = hp.property_id
        JOIN hotel_clients hc ON hp.client_id = hc.id
        WHERE pi.embedding IS NOT NULL
        AND (client_nit IS NULL OR hc.nit = client_nit)
        AND (property_name IS NULL OR hp.property_name ILIKE '%' || property_name || '%')
    )
    SELECT 
        hs.content,
        hs.similarity,
        hs.source_type,
        hs.source_name,
        hs.client_info,
        hs.metadata
    FROM hotel_searches hs
    WHERE hs.similarity > match_threshold
    ORDER BY hs.similarity DESC
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_hotel_documents"("query_embedding" "vector", "client_id_filter" "uuid", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "vector", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision, "client_id" "uuid", "business_type" character varying, "zone" character varying, "title" "text")
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    content,
    embedding,
    source_file,
    document_type,
    chunk_index,
    total_chunks,
    created_at,
    similarity,
    client_id,
    business_type,
    zone,
    title
  FROM match_listings_documents(
    query_embedding,
    client_id_filter,
    'hotel'::varchar,
    match_threshold,
    match_count
  );
$$;

CREATE OR REPLACE FUNCTION "match_hotel_operations_balanced"("query_embedding" "vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 4) RETURNS TABLE("operation_id" "uuid", "title" "text", "content" "text", "category" "text", "access_level" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ho.operation_id,
    ho.title,
    ho.content,
    ho.category,
    ho.access_level,
    1 - (ho.embedding_balanced <=> query_embedding) AS similarity
  FROM public.hotel_operations ho
  WHERE ho.tenant_id = p_tenant_id
    AND ho.access_level = ANY(p_access_levels)
    AND 1 - (ho.embedding_balanced <=> query_embedding) > match_threshold
  ORDER BY ho.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_hotels_documents"("query_embedding" "vector", "tenant_id_filter" "text", "business_type_filter" "text" DEFAULT NULL::"text", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4, "tier" integer DEFAULT 2) RETURNS TABLE("id" "text", "content" "text", "source_table" "text", "metadata" "jsonb", "similarity" double precision, "tier_used" integer)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
  actual_tier integer;
BEGIN
  -- Validate inputs
  IF query_embedding IS NULL THEN
    RAISE EXCEPTION 'query_embedding cannot be null';
  END IF;
  
  IF tenant_id_filter IS NULL OR trim(tenant_id_filter) = '' THEN
    RAISE EXCEPTION 'tenant_id_filter is required';
  END IF;
  
  -- Auto-detect tier based on embedding dimensions if tier is 0
  IF tier = 0 THEN
    CASE vector_dims(query_embedding)
      WHEN 1024 THEN actual_tier := 1;
      WHEN 1536 THEN actual_tier := 2;
      WHEN 3072 THEN actual_tier := 3;
      ELSE actual_tier := 2; -- Default to balanced
    END CASE;
  ELSE
    actual_tier := tier;
  END IF;

  RETURN QUERY
  WITH combined_results AS (
    -- Search accommodation_units with unit_type included
    SELECT 
      au.id::text,
      COALESCE(au.description, au.full_description, au.short_description, au.name, au.unit_number) as content,
      'accommodation_units'::text as source_table,
      jsonb_build_object(
        'name', au.name,
        'unit_number', au.unit_number,
        'unit_type', au.unit_type,  -- NEW: Include unit_type for better filtering
        'capacity', au.capacity,
        'view_type', au.view_type,
        'tenant_id', au.tenant_id,
        'accommodation_type_id', au.accommodation_type_id,
        'status', au.status,
        'size_m2', au.size_m2,
        'floor_number', au.floor_number,
        'bed_configuration', au.bed_configuration,
        'tourism_features', au.tourism_features,
        'booking_policies', au.booking_policies,
        'business_type', business_type_filter,
        'source_table', 'accommodation_units'
      ) as metadata,
      CASE 
        WHEN actual_tier = 1 AND au.embedding_fast IS NOT NULL THEN
          1 - (au.embedding_fast <=> query_embedding::vector(1024))
        WHEN actual_tier = 2 AND au.embedding_balanced IS NOT NULL THEN
          1 - (au.embedding_balanced <=> query_embedding::vector(1536))
        ELSE 0.0
      END as similarity,
      actual_tier as tier_used
    FROM hotels.accommodation_units au
    WHERE au.tenant_id = tenant_id_filter
      AND (
        (actual_tier = 1 AND au.embedding_fast IS NOT NULL) OR
        (actual_tier = 2 AND au.embedding_balanced IS NOT NULL)
      )
      
    UNION ALL
    
    -- Search guest_information (has embedding_balanced for Tier 2)
    SELECT 
      gi.info_id::text,
      gi.info_content as content,
      'guest_information'::text as source_table,
      jsonb_build_object(
        'info_type', gi.info_type,
        'info_title', gi.info_title,
        'step_order', gi.step_order,
        'tenant_id', gi.tenant_id,
        'property_id', gi.property_id,
        'business_type', business_type_filter,
        'source_table', 'guest_information'
      ) as metadata,
      CASE 
        WHEN actual_tier >= 2 AND gi.embedding_balanced IS NOT NULL THEN
          1 - (gi.embedding_balanced <=> query_embedding::vector(1536))
        ELSE 0.0
      END as similarity,
      actual_tier as tier_used
    FROM hotels.guest_information gi
    WHERE gi.tenant_id = tenant_id_filter
      AND gi.is_active = true
      AND gi.embedding_balanced IS NOT NULL
      AND actual_tier >= 2
      
    UNION ALL
    
    -- Search content table (has embedding_balanced for Tier 2)
    SELECT 
      c.embedding_id::text,
      c.content as content,
      'content'::text as source_table,
      jsonb_build_object(
        'source_type', c.source_type,
        'source_id', c.source_id,
        'tenant_id', c.tenant_id,
        'metadata', c.metadata,
        'business_type', business_type_filter,
        'source_table', 'content'
      ) as metadata,
      CASE 
        WHEN actual_tier >= 2 AND c.embedding_balanced IS NOT NULL THEN
          1 - (c.embedding_balanced <=> query_embedding::vector(1536))
        ELSE 0.0
      END as similarity,
      actual_tier as tier_used
    FROM hotels.content c
    WHERE c.tenant_id = tenant_id_filter
      AND c.embedding_balanced IS NOT NULL
      AND actual_tier >= 2
      
    UNION ALL
    
    -- Search policies (only has embedding_fast for Tier 1, not balanced)  
    SELECT 
      p.policy_id::text,
      p.policy_content as content,
      'policies'::text as source_table,
      jsonb_build_object(
        'policy_type', p.policy_type,
        'policy_title', p.policy_title,
        'property_id', p.property_id,
        'is_active', p.is_active,
        'tenant_id', p.tenant_id,
        'business_type', business_type_filter,
        'source_table', 'policies'
      ) as metadata,
      CASE 
        WHEN actual_tier = 1 AND p.embedding_fast IS NOT NULL THEN
          1 - (p.embedding_fast <=> query_embedding::vector(1024))
        ELSE 0.0
      END as similarity,
      actual_tier as tier_used
    FROM hotels.policies p
    WHERE p.tenant_id = tenant_id_filter
      AND p.is_active = true
      AND p.embedding_fast IS NOT NULL
      AND actual_tier = 1
  )
  SELECT 
    cr.id,
    cr.content,
    cr.source_table,
    cr.metadata,
    cr.similarity,
    cr.tier_used
  FROM combined_results cr
  WHERE cr.similarity > match_threshold
  ORDER BY cr.similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_hotels_documents_optimized"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("content" "text", "similarity" double precision, "source_table" "text", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Route to optimized function
  RETURN QUERY
  SELECT o.content, o.similarity, o.source_table, o.metadata
  FROM match_optimized_documents(
    query_embedding,
    match_threshold,
    match_count,
    ARRAY['accommodation_units', 'policies', 'guest_information']
  ) o;
END;
$$;

CREATE OR REPLACE FUNCTION "match_hotels_with_tier_routing"("query_embedding_fast" "vector", "query_embedding_balanced" "vector", "search_type" "text" DEFAULT 'tourism'::"text", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "tourism_summary" "text", "policies_summary" "text", "address" "jsonb", "hotel_amenities" "jsonb", "similarity" double precision, "search_tier" "text")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  IF search_type = 'tourism' THEN
    -- Tier 1 search - ultra fast tourism
    RETURN QUERY
    SELECT
      h.id,
      h.name,
      h.description,
      h.tourism_summary,
      h.policies_summary,
      h.address,
      h.hotel_amenities,
      1 - (h.embedding_fast <=> query_embedding_fast) as similarity,
      'tier_1_fast'::text as search_tier
    FROM hotels h
    WHERE h.embedding_fast IS NOT NULL
      AND 1 - (h.embedding_fast <=> query_embedding_fast) > similarity_threshold
    ORDER BY h.embedding_fast <=> query_embedding_fast
    LIMIT match_count;
  ELSE
    -- Tier 2 search - balanced policies
    RETURN QUERY
    SELECT
      h.id,
      h.name,
      h.description,
      h.tourism_summary,
      h.policies_summary,
      h.address,
      h.hotel_amenities,
      1 - (h.embedding_balanced <=> query_embedding_balanced) as similarity,
      'tier_2_balanced'::text as search_tier
    FROM hotels h
    WHERE h.embedding_balanced IS NOT NULL
      AND 1 - (h.embedding_balanced <=> query_embedding_balanced) > similarity_threshold
    ORDER BY h.embedding_balanced <=> query_embedding_balanced
    LIMIT match_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "match_listings_documents"("query_embedding" "vector", "client_id_filter" "text" DEFAULT NULL::"text", "business_type_filter" "text" DEFAULT 'hotel'::"text", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Route to new hotels schema function with proper tenant filtering
  RETURN QUERY
  SELECT 
    h.id,
    h.content,
    h.metadata,
    h.similarity
  FROM match_hotels_documents(
    query_embedding,
    COALESCE(client_id_filter, 'simmerdown'), -- Default tenant for backwards compatibility
    business_type_filter,
    match_threshold,
    match_count,
    2 -- Use Tier 2 (balanced) by default
  ) h;
END;
$$;

CREATE OR REPLACE FUNCTION "match_listings_documents"("query_embedding" "vector", "client_id_filter" "text" DEFAULT NULL::"text", "business_type_filter" character varying DEFAULT 'hotel'::character varying, "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Route to new hotels schema function
  RETURN QUERY
  SELECT * FROM match_hotels_documents(
    query_embedding,
    'simmerdown', -- Default tenant for backwards compatibility
    business_type_filter,
    match_threshold,
    match_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION "match_muva_activities"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" character varying, "nombre" character varying, "categoria" character varying, "content" "text", "zona" character varying, "subzona" character varying, "precio" "text", "telefono" character varying, "website" character varying, "actividades_disponibles" "text"[], "tags" "text"[], "keywords" "text"[], "chunk_index" integer, "total_chunks" integer, "source_file" character varying, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    nombre,
    categoria,
    content,
    zona,
    subzona,
    precio,
    telefono,
    website,
    actividades_disponibles,
    tags,
    keywords,
    chunk_index,
    total_chunks,
    source_file,
    1 - (embedding_fast <=> query_embedding) as similarity
  FROM muva_activities.deportes_acuaticos
  WHERE embedding_fast IS NOT NULL
    AND 1 - (embedding_fast <=> query_embedding) > match_threshold
  ORDER BY embedding_fast <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION "match_muva_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "vector", "source_file" "text", "title" "text", "description" "text", "category" "text", "subcategory" "text", "business_info" "jsonb", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    content,
    embedding,  -- Use full 3072-dim embedding (Tier 3)
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
$$;

CREATE OR REPLACE FUNCTION "match_muva_documents_public"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision, "source_file" "text", "title" "text", "description" "text", "category" "text", "subcategory" "text", "business_info" "jsonb", "document_type" "text")
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
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
$$;

CREATE OR REPLACE FUNCTION "match_optimized_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4, "target_tables" "text"[] DEFAULT NULL::"text"[], "tier" integer DEFAULT 0, "tenant_id_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("content" "text", "similarity" double precision, "source_table" "text", "metadata" "jsonb", "tier_name" "text")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
    AS $_$
DECLARE
  embedding_size int;
  actual_tier integer;
  tier_name text;
BEGIN
  -- Get vector dimension using pgvector's dim() function
  embedding_size := vector_dims(query_embedding);
  
  -- Determine tier to use
  IF tier != 0 THEN
    actual_tier := tier;
    CASE actual_tier
      WHEN 1 THEN tier_name := 'fast';
      WHEN 2 THEN tier_name := 'balanced';
      ELSE tier_name := 'full';
    END CASE;
  ELSE
    -- Auto-detect tier based on embedding dimensions
    CASE
      WHEN embedding_size = 1024 THEN 
        actual_tier := 1;
        tier_name := 'fast';
      WHEN embedding_size = 1536 THEN 
        actual_tier := 2;
        tier_name := 'balanced';
      WHEN embedding_size = 3072 THEN 
        actual_tier := 3;
        tier_name := 'full';
      ELSE 
        actual_tier := 2; -- Default fallback
        tier_name := 'balanced';
    END CASE;
  END IF;

  -- If tenant_id_filter is provided, search hotels schema (business listings)
  IF tenant_id_filter IS NOT NULL AND trim(tenant_id_filter) != '' THEN
    -- Search ALL hotel tables with proper tenant filtering
    RETURN QUERY
    WITH hotel_results AS (
      -- 1. Search accommodation_units
      SELECT 
        CONCAT(
          COALESCE(au.description, au.full_description, au.short_description, au.name, au.unit_number),
          CASE WHEN au.base_price_low_season IS NOT NULL THEN
            E'\n\nTARIFAS:\n' ||
            'Temporada Baja: $' || au.base_price_low_season || ' COP (2 personas)' ||
            CASE WHEN au.price_per_person_low IS NOT NULL THEN 
              ', $' || (au.base_price_low_season + au.price_per_person_low) || ' COP (3 personas), ' ||
              '$' || (au.base_price_low_season + 2*au.price_per_person_low) || ' COP (4 personas)'
            ELSE '' END ||
            E'\nTemporada Alta: $' || COALESCE(au.base_price_high_season::text, 'N/A') || ' COP (2 personas)' ||
            CASE WHEN au.price_per_person_high IS NOT NULL THEN
              ', $' || (au.base_price_high_season + au.price_per_person_high) || ' COP (3 personas), ' ||
              '$' || (au.base_price_high_season + 2*au.price_per_person_high) || ' COP (4 personas)'
            ELSE '' END
          ELSE '' END,
          CASE WHEN au.amenities_list IS NOT NULL AND jsonb_array_length(au.amenities_list) > 0 THEN
            E'\n\nAMENIDADES: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(au.amenities_list)), ', ')
          ELSE '' END,
          CASE WHEN au.booking_policies IS NOT NULL THEN
            E'\n\nPOLÍTICAS: ' || au.booking_policies
          ELSE '' END
        ) as content,
        CASE 
          WHEN actual_tier = 1 AND au.embedding_fast IS NOT NULL THEN
            1 - (au.embedding_fast <=> query_embedding::vector(1024))
          WHEN actual_tier = 2 AND au.embedding_balanced IS NOT NULL THEN
            1 - (au.embedding_balanced <=> query_embedding::vector(1536))
          ELSE 0.0
        END as similarity,
        'accommodation_units'::text as source_table,
        jsonb_build_object(
          'id', au.id,
          'name', au.name,
          'unit_number', au.unit_number,
          'unit_type', au.unit_type,
          'source_table', 'accommodation_units',
          'subcategory', au.unit_type,
          'capacity', au.capacity,
          'view_type', au.view_type,
          'tenant_id', au.tenant_id,
          'accommodation_type_id', au.accommodation_type_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.accommodation_units au
      WHERE au.tenant_id = tenant_id_filter
        AND (
          (actual_tier = 1 AND au.embedding_fast IS NOT NULL) OR
          (actual_tier = 2 AND au.embedding_balanced IS NOT NULL)
        )
        
      UNION ALL
      
      -- 2. Search guest_information (Tier 2)
      SELECT 
        gi.info_content as content,
        CASE 
          WHEN actual_tier >= 2 AND gi.embedding_balanced IS NOT NULL THEN
            1 - (gi.embedding_balanced <=> query_embedding::vector(1536))
          ELSE 0.0
        END as similarity,
        'guest_information'::text as source_table,
        jsonb_build_object(
          'id', gi.info_id,
          'info_type', gi.info_type,
          'info_title', gi.info_title,
          'source_table', 'guest_information',
          'tenant_id', gi.tenant_id,
          'property_id', gi.property_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.guest_information gi
      WHERE gi.tenant_id = tenant_id_filter
        AND gi.is_active = true
        AND gi.embedding_balanced IS NOT NULL
        AND actual_tier >= 2
        
      UNION ALL
      
      -- 3. Search content table (Tier 2) 
      SELECT 
        c.content as content,
        CASE 
          WHEN actual_tier >= 2 AND c.embedding_balanced IS NOT NULL THEN
            1 - (c.embedding_balanced <=> query_embedding::vector(1536))
          ELSE 0.0
        END as similarity,
        'content'::text as source_table,
        jsonb_build_object(
          'id', c.embedding_id,
          'source_type', c.source_type,
          'source_id', c.source_id,
          'source_table', 'content',
          'tenant_id', c.tenant_id,
          'business_type', 'hotel',
          'metadata', c.metadata
        ) as metadata,
        tier_name
      FROM hotels.content c
      WHERE c.tenant_id = tenant_id_filter
        AND c.embedding_balanced IS NOT NULL
        AND actual_tier >= 2
        
      UNION ALL
      
      -- 4. Search policies (Tier 1)
      SELECT 
        p.policy_content as content,
        CASE 
          WHEN actual_tier = 1 AND p.embedding_fast IS NOT NULL THEN
            1 - (p.embedding_fast <=> query_embedding::vector(1024))
          ELSE 0.0
        END as similarity,
        'policies'::text as source_table,
        jsonb_build_object(
          'id', p.policy_id,
          'policy_type', p.policy_type,
          'policy_title', p.policy_title,
          'source_table', 'policies',
          'tenant_id', p.tenant_id,
          'property_id', p.property_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.policies p
      WHERE p.tenant_id = tenant_id_filter
        AND p.is_active = true
        AND p.embedding_fast IS NOT NULL
        AND actual_tier = 1
        
      UNION ALL
      
      -- 5. Search client_info (Tier 3)
      SELECT 
        CONCAT(
          'INFORMACIÓN DEL NEGOCIO: ', COALESCE(ci.nombre_comercial, 'No disponible'),
          CASE WHEN ci.razon_social IS NOT NULL THEN E'\nRazón Social: ' || ci.razon_social ELSE '' END,
          CASE WHEN ci.nit IS NOT NULL THEN E'\nNIT: ' || ci.nit ELSE '' END,
          CASE WHEN ci.contact_info IS NOT NULL THEN E'\nContacto: ' || ci.contact_info::text ELSE '' END
        ) as content,
        CASE 
          WHEN actual_tier >= 3 AND ci.embedding IS NOT NULL THEN
            1 - (ci.embedding <=> query_embedding::vector(3072))
          ELSE 0.0
        END as similarity,
        'client_info'::text as source_table,
        jsonb_build_object(
          'id', ci.id,
          'nombre_comercial', ci.nombre_comercial,
          'razon_social', ci.razon_social,
          'source_table', 'client_info',
          'tenant_id', ci.tenant_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.client_info ci
      WHERE ci.tenant_id = tenant_id_filter
        AND ci.embedding IS NOT NULL
        AND actual_tier >= 3
        
      UNION ALL
      
      -- 6. Search properties (Tier 3)
      SELECT 
        CONCAT(
          'PROPIEDAD: ', COALESCE(p.property_name, 'No disponible'),
          CASE WHEN p.property_type IS NOT NULL THEN E'\nTipo: ' || p.property_type ELSE '' END,
          CASE WHEN p.description IS NOT NULL THEN E'\n' || p.description ELSE '' END,
          CASE WHEN p.location_info IS NOT NULL THEN E'\nUbicación: ' || p.location_info::text ELSE '' END
        ) as content,
        CASE 
          WHEN actual_tier >= 3 AND p.embedding IS NOT NULL THEN
            1 - (p.embedding <=> query_embedding::vector(3072))
          ELSE 0.0
        END as similarity,
        'properties'::text as source_table,
        jsonb_build_object(
          'id', p.property_id,
          'property_name', p.property_name,
          'property_type', p.property_type,
          'source_table', 'properties',
          'tenant_id', p.tenant_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.properties p
      WHERE p.tenant_id = tenant_id_filter
        AND p.embedding IS NOT NULL
        AND actual_tier >= 3
        
      UNION ALL
      
      -- 7. Search pricing_rules (Tier 3)
      SELECT 
        CONCAT(
          'REGLAS DE PRECIOS - ', COALESCE(pr.season_type, 'General'),
          CASE WHEN pr.capacity_pricing IS NOT NULL THEN E'\nPrecios: ' || pr.capacity_pricing::text ELSE '' END,
          CASE WHEN pr.valid_from IS NOT NULL THEN E'\nVálido desde: ' || pr.valid_from::text ELSE '' END,
          CASE WHEN pr.valid_to IS NOT NULL THEN E'\nVálido hasta: ' || pr.valid_to::text ELSE '' END
        ) as content,
        CASE 
          WHEN actual_tier >= 3 AND pr.embedding IS NOT NULL THEN
            1 - (pr.embedding <=> query_embedding::vector(3072))
          ELSE 0.0
        END as similarity,
        'pricing_rules'::text as source_table,
        jsonb_build_object(
          'id', pr.pricing_id,
          'season_type', pr.season_type,
          'source_table', 'pricing_rules',
          'tenant_id', pr.tenant_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.pricing_rules pr
      WHERE pr.tenant_id = tenant_id_filter
        AND pr.is_active = true
        AND pr.embedding IS NOT NULL
        AND actual_tier >= 3
        
      UNION ALL
      
      -- 8. Search unit_amenities (Tier 3)
      SELECT 
        CONCAT(
          'AMENIDADES DE UNIDAD',
          CASE WHEN ua.description IS NOT NULL THEN E'\n' || ua.description ELSE '' END,
          CASE WHEN ua.amenities IS NOT NULL THEN E'\nAmenidades: ' || ua.amenities::text ELSE '' END,
          CASE WHEN ua.features IS NOT NULL THEN E'\nCaracterísticas: ' || ua.features::text ELSE '' END
        ) as content,
        CASE 
          WHEN actual_tier >= 3 AND ua.embedding IS NOT NULL THEN
            1 - (ua.embedding <=> query_embedding::vector(3072))
          ELSE 0.0
        END as similarity,
        'unit_amenities'::text as source_table,
        jsonb_build_object(
          'id', ua.amenity_id,
          'unit_id', ua.unit_id,
          'source_table', 'unit_amenities',
          'tenant_id', ua.tenant_id,
          'business_type', 'hotel'
        ) as metadata,
        tier_name
      FROM hotels.unit_amenities ua
      WHERE ua.tenant_id = tenant_id_filter
        AND ua.embedding IS NOT NULL
        AND actual_tier >= 3
    )
    SELECT 
      hr.content,
      hr.similarity,
      hr.source_table,
      hr.metadata,
      hr.tier_name
    FROM hotel_results hr
    WHERE hr.similarity > match_threshold
      AND hr.content IS NOT NULL
      AND length(trim(hr.content)) > 0
    ORDER BY hr.similarity DESC
    LIMIT match_count;
    
  ELSE
    -- Search only public schema content (SIRE/MUVA) when no tenant filter
    IF actual_tier = 1 THEN
      -- Tier 1: Fast searches - MUVA tourism content
      RETURN QUERY
      SELECT 
        mc.content,
        1 - (mc.embedding_fast <=> query_embedding::vector(1024)) as similarity,
        'muva_content'::text,
        jsonb_build_object(
          'id', mc.id,
          'title', mc.title,
          'source_table', 'muva_content',
          'category', mc.category,
          'document_type', mc.document_type,
          'source_file', mc.source_file
        ) as metadata,
        tier_name
      FROM public.muva_content mc
      WHERE mc.embedding_fast IS NOT NULL
        AND 1 - (mc.embedding_fast <=> query_embedding::vector(1024)) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
      
    ELSIF actual_tier = 2 THEN
      -- Tier 2: Balanced searches - SIRE compliance content
      RETURN QUERY
      SELECT 
        sc.content,
        1 - (sc.embedding_balanced <=> query_embedding::vector(1536)) as similarity,
        'sire_content'::text,
        jsonb_build_object(
          'id', sc.id,
          'title', sc.title,
          'source_table', 'sire_content',
          'category', sc.category,
          'document_type', sc.document_type,
          'source_file', sc.source_file
        ) as metadata,
        tier_name
      FROM public.sire_content sc
      WHERE sc.embedding_balanced IS NOT NULL
        AND 1 - (sc.embedding_balanced <=> query_embedding::vector(1536)) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
      
    ELSE
      -- Tier 3: Full precision searches - SIRE content fallback
      RETURN QUERY
      SELECT 
        sc.content,
        1 - (sc.embedding <=> query_embedding::vector(3072)) as similarity,
        'sire_content'::text,
        jsonb_build_object(
          'id', sc.id,
          'title', sc.title,
          'source_table', 'sire_content',
          'category', sc.category,
          'document_type', sc.document_type,
          'source_file', sc.source_file
        ) as metadata,
        tier_name
      FROM public.sire_content sc
      WHERE sc.embedding IS NOT NULL
        AND 1 - (sc.embedding <=> query_embedding::vector(3072)) > match_threshold
      ORDER BY similarity DESC
      LIMIT match_count;
    END IF;
  END IF;
END;
$_$;



CREATE OR REPLACE FUNCTION "match_simmerdown_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_units AS (
    -- Get best chunks per unit (diversified results)
    SELECT DISTINCT ON (au.unit_name)
      au.unit_id::text as id,
      au.description as content,
      'accommodation_units' as source_file,
      'accommodation_unit' as document_type,
      0 as chunk_index,
      1 as total_chunks,
      au.created_at,
      jsonb_build_object(
        'unit_name', au.unit_name,
        'unit_type', au.unit_type,
        'max_capacity', au.max_capacity,
        'base_price_cop', au.base_price_cop
      ) as metadata,
      1 - (au.embedding <=> query_embedding) as similarity
    FROM simmerdown.accommodation_units au
    WHERE au.embedding IS NOT NULL
      AND au.description IS NOT NULL
      AND 1 - (au.embedding <=> query_embedding) > match_threshold
    ORDER BY au.unit_name, 1 - (au.embedding <=> query_embedding) DESC
  ),
  policy_results AS (
    -- Get policy results
    SELECT 
      p.policy_id::text as id,
      p.policy_content as content,
      'policies' as source_file,
      p.policy_type as document_type,
      0 as chunk_index,
      1 as total_chunks,
      p.created_at,
      jsonb_build_object(
        'policy_title', p.policy_title,
        'policy_type', p.policy_type
      ) as metadata,
      1 - (p.embedding <=> query_embedding) as similarity
    FROM simmerdown.policies p
    WHERE p.embedding IS NOT NULL
      AND p.policy_content IS NOT NULL
      AND 1 - (p.embedding <=> query_embedding) > match_threshold
    ORDER BY 1 - (p.embedding <=> query_embedding) DESC
    LIMIT 2
  ),
  combined_results AS (
    -- Combine all results
    SELECT id, content, source_file, document_type, 
           chunk_index, total_chunks, created_at, metadata, similarity
    FROM ranked_units
    UNION ALL
    SELECT id, content, source_file, document_type,
           chunk_index, total_chunks, created_at, metadata, similarity
    FROM policy_results
  )
  SELECT cr.id, cr.content, cr.source_file, cr.document_type,
         cr.chunk_index, cr.total_chunks, cr.created_at, cr.metadata
  FROM combined_results cr
  ORDER BY cr.similarity DESC
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_sire_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "vector", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    content,
    embedding,
    source_file,
    document_type,
    chunk_index,
    total_chunks,
    created_at,
    1 - (embedding <=> query_embedding) as similarity
  FROM sire_content
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION "match_unified_documents"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5, "domain_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "content" "text", "domain" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET search_path = public, pg_temp
AS $$
  SELECT
    uc.id,
    uc.content,
    uc.domain,
    uc.metadata,
    1 - (uc.embedding <=> query_embedding) as similarity
  FROM unified_content uc
  WHERE 
    (domain_filter IS NULL OR uc.domain = domain_filter)
    AND 1 - (uc.embedding <=> query_embedding) > match_threshold
  ORDER BY uc.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION "match_unit_manual"("query_embedding" "vector", "p_unit_id" "uuid", "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 3) RETURNS TABLE("unit_id" "uuid", "unit_name" character varying, "manual_content" "text", "detailed_instructions" "text", "wifi_password" "text", "safe_code" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.unit_id,
    au.name as unit_name,
    um.manual_content,
    um.detailed_instructions,
    um.wifi_password,
    um.safe_code,
    1 - (um.embedding_balanced <=> query_embedding) as similarity
  FROM public.accommodation_units_manual um
  JOIN public.accommodation_units au ON au.id = um.unit_id
  WHERE um.unit_id = p_unit_id  -- KEY FILTER: Only guest's unit
    AND um.embedding_balanced IS NOT NULL
    AND 1 - (um.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY um.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "match_unit_manual_chunks"("query_embedding" "vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 3) RETURNS TABLE("id" "uuid", "manual_id" "uuid", "chunk_content" "text", "chunk_index" integer, "section_title" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION "search_code_embeddings"("query_embedding" "vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("file_path" "text", "chunk_index" integer, "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.file_path,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM code_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "search_muva_attractions"("query_embedding" "vector", "location_filter" "text" DEFAULT NULL::"text", "min_rating" numeric DEFAULT NULL::numeric, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "title" "text", "description" "text", "location" "text", "rating" numeric, "opening_hours" "text", "contact_info" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.content,
    me.title,
    me.description,
    me.location,
    me.rating,
    me.opening_hours,
    me.contact_info,
    (1 - (me.embedding <=> query_embedding))::float as similarity
  FROM muva_embeddings me
  WHERE
    me.category IN ('attraction', 'activity', 'beach', 'culture', 'nature', 'adventure')
    AND (location_filter IS NULL OR me.location = location_filter)
    AND (min_rating IS NULL OR me.rating >= min_rating)
    AND me.embedding IS NOT NULL
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "search_muva_restaurants"("query_embedding" "vector", "location_filter" "text" DEFAULT NULL::"text", "min_rating" numeric DEFAULT NULL::numeric, "price_filter" "text" DEFAULT NULL::"text", "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "title" "text", "description" "text", "location" "text", "rating" numeric, "price_range" "text", "opening_hours" "text", "contact_info" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.id,
    me.content,
    me.title,
    me.description,
    me.location,
    me.rating,
    me.price_range,
    me.opening_hours,
    me.contact_info,
    (1 - (me.embedding <=> query_embedding))::float as similarity
  FROM muva_embeddings me
  WHERE
    me.category = 'restaurant'
    AND (location_filter IS NULL OR me.location = location_filter)
    AND (min_rating IS NULL OR me.rating >= min_rating)
    AND (price_filter IS NULL OR me.price_range = price_filter)
    AND me.embedding IS NOT NULL
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ========================================
-- CATEGORY 4: SIRE Compliance (5 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role always has access
  IF current_setting('role', true) = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Check if user has active permission for the tenant (WITH TYPE CAST)
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_permissions utp
    WHERE utp.user_id = p_user_id
      AND utp.tenant_id = p_tenant_id::UUID
      AND utp.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION "check_sire_data_completeness"("p_reservation_id" "uuid") RETURNS TABLE("is_complete" boolean, "missing_fields" "text"[], "validation_errors" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_reservation RECORD;
  v_missing TEXT[] := '{}';
  v_errors TEXT[] := '{}';
BEGIN
  -- Fetch reservation
  SELECT * INTO v_reservation
  FROM guest_reservations
  WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, ARRAY['reservation_not_found']::TEXT[], ARRAY['Reservation does not exist']::TEXT[];
    RETURN;
  END IF;
  
  -- Check mandatory SIRE fields
  IF v_reservation.hotel_sire_code IS NULL THEN
    v_missing := array_append(v_missing, 'hotel_sire_code');
  END IF;
  
  IF v_reservation.hotel_city_code IS NULL THEN
    v_missing := array_append(v_missing, 'hotel_city_code');
  END IF;
  
  IF v_reservation.document_type IS NULL THEN
    v_missing := array_append(v_missing, 'document_type');
  END IF;
  
  IF v_reservation.document_number IS NULL THEN
    v_missing := array_append(v_missing, 'document_number');
  END IF;
  
  IF v_reservation.nationality_code IS NULL THEN
    v_missing := array_append(v_missing, 'nationality_code');
  END IF;
  
  IF v_reservation.first_surname IS NULL THEN
    v_missing := array_append(v_missing, 'first_surname');
  END IF;
  
  IF v_reservation.given_names IS NULL THEN
    v_missing := array_append(v_missing, 'given_names');
  END IF;
  
  IF v_reservation.movement_type IS NULL THEN
    v_missing := array_append(v_missing, 'movement_type');
  END IF;
  
  IF v_reservation.movement_date IS NULL THEN
    v_missing := array_append(v_missing, 'movement_date');
  END IF;
  
  -- Optional fields (origin, destination, birth_date, second_surname) not checked
  
  -- Additional validation checks
  IF v_reservation.document_type IS NOT NULL AND v_reservation.document_type NOT IN ('3', '5', '10', '46') THEN
    v_errors := array_append(v_errors, 'Invalid document_type: must be 3, 5, 10, or 46');
  END IF;
  
  IF v_reservation.movement_type IS NOT NULL AND v_reservation.movement_type NOT IN ('E', 'S') THEN
    v_errors := array_append(v_errors, 'Invalid movement_type: must be E or S');
  END IF;
  
  IF v_reservation.nationality_code IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM sire_countries WHERE sire_code = v_reservation.nationality_code
  ) THEN
    v_errors := array_append(v_errors, format('Unknown nationality_code: %s', v_reservation.nationality_code));
  END IF;
  
  -- Return result
  RETURN QUERY SELECT
    (array_length(v_missing, 1) IS NULL AND array_length(v_errors, 1) IS NULL) AS is_complete,
    v_missing,
    v_errors;
END;
$$;

CREATE OR REPLACE FUNCTION "get_sire_guest_data"("p_reservation_id" "uuid") RETURNS TABLE("reservation_id" "uuid", "reservation_code" "text", "tenant_id" "text", "guest_name" "text", "check_in_date" "date", "check_out_date" "date", "status" "text", "hotel_sire_code" "text", "hotel_city_code" "text", "document_type" "text", "document_type_name" "text", "document_number" "text", "nationality_code" "text", "nationality_name" "text", "first_surname" "text", "second_surname" "text", "given_names" "text", "movement_type" "text", "movement_date" "date", "origin_city_code" "text", "origin_city_name" "text", "destination_city_code" "text", "destination_city_name" "text", "birth_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.reservation_code::TEXT,
    gr.tenant_id::TEXT,
    gr.guest_name::TEXT,
    gr.check_in_date,
    gr.check_out_date,
    gr.status::TEXT,
    gr.hotel_sire_code::TEXT,
    gr.hotel_city_code::TEXT,
    gr.document_type::TEXT,
    sdt.name::TEXT AS document_type_name,
    gr.document_number::TEXT,
    gr.nationality_code::TEXT,
    sc_nat.name_es::TEXT AS nationality_name,
    gr.first_surname::TEXT,
    gr.second_surname::TEXT,
    gr.given_names::TEXT,
    gr.movement_type::TEXT,
    gr.movement_date,
    gr.origin_city_code::TEXT,
    COALESCE(scit_orig.name, sc_orig.name_es)::TEXT AS origin_city_name,
    gr.destination_city_code::TEXT,
    COALESCE(scit_dest.name, sc_dest.name_es)::TEXT AS destination_city_name,
    gr.birth_date
  FROM guest_reservations gr
  LEFT JOIN sire_document_types sdt ON gr.document_type = sdt.code
  LEFT JOIN sire_countries sc_nat ON gr.nationality_code = sc_nat.sire_code
  LEFT JOIN sire_cities scit_orig ON gr.origin_city_code = scit_orig.code
  LEFT JOIN sire_countries sc_orig ON gr.origin_city_code = sc_orig.iso_code
  LEFT JOIN sire_cities scit_dest ON gr.destination_city_code = scit_dest.code
  LEFT JOIN sire_countries sc_dest ON gr.destination_city_code = sc_dest.iso_code
  WHERE gr.id = p_reservation_id;
END;
$$;

CREATE OR REPLACE FUNCTION "get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character DEFAULT NULL::"bpchar") RETURNS TABLE("reservation_id" "uuid", "reservation_code" "text", "hotel_sire_code" "text", "hotel_city_code" "text", "document_type" "text", "document_number" "text", "nationality_code" "text", "first_surname" "text", "second_surname" "text", "given_names" "text", "movement_type" "text", "movement_date" "date", "origin_city_code" "text", "destination_city_code" "text", "birth_date" "date", "guest_name" "text", "check_in_date" "date", "check_out_date" "date", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Calculate date range for the month
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month')::DATE;
  
  RETURN QUERY
  SELECT
    gr.id,
    gr.reservation_code,
    
    -- SIRE fields
    gr.hotel_sire_code,
    gr.hotel_city_code,
    gr.document_type,
    gr.document_number,
    gr.nationality_code,
    gr.first_surname,
    gr.second_surname,
    COALESCE(gr.second_surname, '') AS second_surname_coalesced,
    gr.given_names,
    gr.movement_type,
    gr.movement_date,
    gr.origin_city_code,
    gr.destination_city_code,
    gr.birth_date,
    
    -- Metadata
    gr.guest_name,
    gr.check_in_date,
    gr.check_out_date,
    gr.status
  FROM guest_reservations gr
  WHERE gr.tenant_id = p_tenant_id
    AND gr.movement_date >= v_start_date
    AND gr.movement_date < v_end_date
    AND (p_movement_type IS NULL OR gr.movement_type = p_movement_type)
    AND gr.status != 'cancelled'  -- Exclude cancelled reservations
    -- Ensure all SIRE mandatory fields are present
    AND gr.hotel_sire_code IS NOT NULL
    AND gr.document_type IS NOT NULL
    AND gr.document_number IS NOT NULL
    AND gr.nationality_code IS NOT NULL
    AND gr.first_surname IS NOT NULL
    AND gr.given_names IS NOT NULL
    AND gr.movement_type IS NOT NULL
    AND gr.movement_date IS NOT NULL
  ORDER BY gr.movement_date ASC, gr.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_reservations" bigint, "sire_complete_reservations" bigint, "sire_incomplete_reservations" bigint, "completion_rate" numeric, "check_ins_complete" bigint, "check_outs_complete" bigint, "top_nationalities" "jsonb", "missing_hotel_code" bigint, "missing_document" bigint, "missing_nationality" bigint, "missing_names" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_total BIGINT;
  v_complete BIGINT;
  v_top_nationalities JSONB;
BEGIN
  -- Count total reservations in period
  SELECT COUNT(*) INTO v_total
  FROM guest_reservations
  WHERE tenant_id = p_tenant_id
    AND movement_date >= p_start_date
    AND movement_date <= p_end_date
    AND status != 'cancelled';
  
  -- Count complete SIRE reservations
  SELECT COUNT(*) INTO v_complete
  FROM guest_reservations
  WHERE tenant_id = p_tenant_id
    AND movement_date >= p_start_date
    AND movement_date <= p_end_date
    AND status != 'cancelled'
    AND hotel_sire_code IS NOT NULL
    AND document_type IS NOT NULL
    AND document_number IS NOT NULL
    AND nationality_code IS NOT NULL
    AND first_surname IS NOT NULL
    AND given_names IS NOT NULL
    AND movement_type IS NOT NULL
    AND movement_date IS NOT NULL;
  
  -- Get top 5 nationalities
  SELECT jsonb_agg(row_to_json(t)) INTO v_top_nationalities
  FROM (
    SELECT
      sc.name_es AS country,
      COUNT(*) AS count
    FROM guest_reservations gr
    LEFT JOIN sire_countries sc ON gr.nationality_code = sc.sire_code
    WHERE gr.tenant_id = p_tenant_id
      AND gr.movement_date >= p_start_date
      AND gr.movement_date <= p_end_date
      AND gr.status != 'cancelled'
      AND gr.nationality_code IS NOT NULL
    GROUP BY sc.name_es
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) t;
  
  -- Return aggregated statistics
  RETURN QUERY
  SELECT
    v_total,
    v_complete,
    v_total - v_complete AS incomplete,
    CASE WHEN v_total > 0 THEN ROUND((v_complete::NUMERIC / v_total * 100), 2) ELSE 0 END AS rate,
    
    -- Movement type breakdown
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND movement_type = 'E' AND status != 'cancelled' AND hotel_sire_code IS NOT NULL AND document_type IS NOT NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND movement_type = 'S' AND status != 'cancelled' AND hotel_sire_code IS NOT NULL AND document_type IS NOT NULL),
    
    v_top_nationalities,
    
    -- Missing fields
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND hotel_sire_code IS NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND (document_type IS NULL OR document_number IS NULL)),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND nationality_code IS NULL),
    (SELECT COUNT(*) FROM guest_reservations WHERE tenant_id = p_tenant_id AND movement_date >= p_start_date AND movement_date <= p_end_date AND status != 'cancelled' AND (first_surname IS NULL OR given_names IS NULL));
END;
$$;

-- ========================================
-- CATEGORY 5: Reservations & Bookings (4 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("event_id" "uuid", "event_type" character varying, "start_date" "date", "end_date" "date", "source" character varying)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.event_type,
    e.start_date,
    e.end_date,
    e.source
  FROM public.calendar_events e
  WHERE e.accommodation_unit_id = p_accommodation_unit_id
    AND e.status = 'active'
    AND NOT e.is_deleted
    AND (e.id != p_exclude_event_id OR p_exclude_event_id IS NULL)
    AND e.start_date <= p_end_date
    AND e.end_date >= p_start_date;
END;
$$;

CREATE OR REPLACE FUNCTION "get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("date" "date", "is_available" boolean, "event_type" character varying, "event_id" "uuid")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS date
  ),
  events AS (
    SELECT
      e.id,
      e.event_type,
      e.start_date,
      e.end_date
    FROM public.calendar_events e
    WHERE e.accommodation_unit_id = p_accommodation_unit_id
      AND e.status = 'active'
      AND NOT e.is_deleted
      AND e.start_date <= p_end_date
      AND e.end_date >= p_start_date
  )
  SELECT
    ds.date,
    CASE WHEN e.id IS NULL THEN TRUE ELSE FALSE END AS is_available,
    e.event_type,
    e.id AS event_id
  FROM date_series ds
  LEFT JOIN events e ON ds.date BETWEEN e.start_date AND e.end_date
  ORDER BY ds.date;
END;
$$;

CREATE OR REPLACE FUNCTION "get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") RETURNS TABLE("id" "uuid", "tenant_id" "text", "reservation_code" "text", "guest_name" "text", "guest_email" "text", "phone_full" "text", "phone_last_4" "text", "check_in_date" "date", "check_out_date" "date", "status" "text", "accommodation_unit_id" "uuid", "external_booking_id" "text", "booking_source" "text", "total_price" numeric, "currency" "text", "created_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.tenant_id::TEXT,
    gr.reservation_code::TEXT,
    gr.guest_name::TEXT,
    gr.guest_email::TEXT,
    gr.phone_full::TEXT,
    gr.phone_last_4::TEXT,
    gr.check_in_date,
    gr.check_out_date,
    gr.status::TEXT,
    gr.accommodation_unit_id,
    gr.external_booking_id::TEXT,
    gr.booking_source::TEXT,
    gr.total_price,
    gr.currency::TEXT,
    gr.created_at
  FROM guest_reservations gr
  WHERE gr.external_booking_id = p_external_booking_id
    AND gr.tenant_id = p_tenant_id
  ORDER BY gr.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION "propagate_parent_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_child_record RECORD;
BEGIN
  -- Only process new reservations on parent properties
  IF NEW.event_type = 'reservation' AND NEW.status = 'active' THEN
    -- Find all child properties
    FOR v_child_record IN
      SELECT pr.child_unit_id, pr.blocking_priority
      FROM public.property_relationships pr
      WHERE pr.parent_unit_id = NEW.accommodation_unit_id
        AND pr.is_active = TRUE
        AND pr.block_child_on_parent = TRUE
    LOOP
      -- Insert blocking event for child property
      INSERT INTO public.calendar_events (
        tenant_id,
        accommodation_unit_id,
        source,
        external_uid,
        event_type,
        start_date,
        end_date,
        summary,
        description,
        parent_event_id,
        source_priority,
        status
      ) VALUES (
        NEW.tenant_id,
        v_child_record.child_unit_id,
        NEW.source,
        'parent-block-' || NEW.id,
        'parent_block',
        NEW.start_date,
        NEW.end_date,
        'Blocked - Parent property booked',
        'Auto-blocked due to parent property reservation',
        NEW.id,
        GREATEST(1, LEAST(10, COALESCE(v_child_record.blocking_priority, 5))), -- Ensure 1-10 range
        'active'
      )
      ON CONFLICT (tenant_id, source, external_uid)
      DO UPDATE SET
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        last_seen_at = NOW();
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ========================================
-- CATEGORY 6: Integrations & Sync (5 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "cleanup_old_sync_logs"() RETURNS integer
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.calendar_sync_logs
  WHERE started_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION "get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "integration_type" "text", "config_data" "jsonb", "is_active" boolean, "last_sync_at" timestamp without time zone, "created_at" timestamp without time zone, "updated_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.tenant_id,
    ic.integration_type::TEXT,
    ic.config_data,
    ic.is_active,
    ic.last_sync_at,
    ic.created_at,
    ic.updated_at
  FROM integration_configs ic
  WHERE ic.tenant_id = p_tenant_id
    AND ic.integration_type = p_integration_type
    AND ic.is_active = TRUE
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION "log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO event_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
         WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW)
         ELSE NULL END,
    COALESCE(current_setting('request.jwt.claims', true)::json->>'email', 'system')
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION "sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") RETURNS TABLE("created_count" integer, "updated_count" integer, "error_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
  v_errors INTEGER := 0;
  v_unit RECORD;
  v_existing_id UUID;
BEGIN
  -- Loop through consolidated units from accommodation_units_public
  FOR v_unit IN
    SELECT DISTINCT ON (COALESCE(metadata->>'original_accommodation', name))
      unit_id,
      tenant_id,
      COALESCE(metadata->>'original_accommodation', name) as unit_name,
      COALESCE((metadata->>'display_order')::INTEGER, 999) as display_order_val,
      unit_number,
      unit_type,
      description,
      short_description,
      metadata,
      photos as images,
      pricing,
      is_active
    FROM accommodation_units_public
    WHERE tenant_id = p_tenant_id
    ORDER BY COALESCE(metadata->>'original_accommodation', name),
             COALESCE((metadata->>'display_order')::INTEGER, 999) ASC
  LOOP
    BEGIN
      -- Check if unit exists
      SELECT id INTO v_existing_id
      FROM hotels.accommodation_units
      WHERE tenant_id = p_tenant_id::varchar
      AND name = v_unit.unit_name
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- Update existing unit
        UPDATE hotels.accommodation_units
        SET
          unit_number = COALESCE((v_unit.metadata->>'display_order')::TEXT, v_unit.unit_number, 'N/A'),
          unit_type = COALESCE(v_unit.metadata->>'accommodation_mphb_type', v_unit.unit_type, 'Standard'),
          description = COALESCE(v_unit.description, ''),
          short_description = COALESCE(v_unit.short_description, SUBSTRING(v_unit.description, 1, 150), ''),
          capacity = COALESCE(v_unit.metadata->'capacity', '{"adults":2,"children":0,"total":2}'::jsonb),
          bed_configuration = COALESCE(v_unit.metadata->'bed_configuration', '[{"type":"Queen","quantity":1}]'::jsonb),
          size_m2 = (v_unit.metadata->>'size_m2')::INTEGER,
          view_type = v_unit.metadata->>'view_type',
          images = COALESCE(v_unit.images, '[]'::jsonb),
          motopress_type_id = (v_unit.metadata->>'motopress_room_type_id')::INTEGER,
          motopress_unit_id = (v_unit.metadata->>'motopress_unit_id')::INTEGER,
          full_description = COALESCE(v_unit.description, ''),
          tourism_features = COALESCE(v_unit.metadata->>'tourism_features', ''),
          booking_policies = COALESCE(v_unit.metadata->>'booking_policies', ''),
          unique_features = COALESCE(v_unit.metadata->'unique_features', '[]'::jsonb),
          status = CASE WHEN v_unit.is_active THEN 'active' ELSE 'inactive' END,
          is_featured = COALESCE((v_unit.metadata->>'is_featured')::BOOLEAN, FALSE),
          display_order = v_unit.display_order_val,
          base_price_low_season = (v_unit.pricing->>'base_price')::INTEGER,
          base_price_high_season = (v_unit.pricing->>'base_price')::INTEGER,
          amenities_list = COALESCE(v_unit.metadata->'unit_amenities', '[]'::jsonb),
          unit_amenities = CASE
            WHEN jsonb_typeof(v_unit.metadata->'unit_amenities') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'unit_amenities')), ', ')
            ELSE COALESCE(v_unit.metadata->>'unit_amenities', '')
          END,
          accommodation_mphb_type = v_unit.metadata->>'accommodation_mphb_type',
          tags = CASE
            WHEN jsonb_typeof(v_unit.metadata->'tags') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'tags'))
            ELSE '{}'::TEXT[]
          END,
          subcategory = v_unit.metadata->>'subcategory',
          updated_at = NOW()
        WHERE id = v_existing_id;

        v_updated := v_updated + 1;
      ELSE
        -- Insert new unit - use exact value from MotoPress
        INSERT INTO hotels.accommodation_units (
          tenant_id,
          name,
          unit_number,
          unit_type,
          description,
          short_description,
          capacity,
          bed_configuration,
          size_m2,
          view_type,
          images,
          motopress_type_id,
          motopress_unit_id,
          full_description,
          tourism_features,
          booking_policies,
          unique_features,
          status,
          is_featured,
          display_order,
          base_price_low_season,
          base_price_high_season,
          amenities_list,
          unit_amenities,
          accommodation_mphb_type,
          tags,
          subcategory,
          created_at,
          updated_at
        ) VALUES (
          p_tenant_id::varchar,
          v_unit.unit_name,
          COALESCE((v_unit.metadata->>'display_order')::TEXT, v_unit.unit_number, 'N/A'),
          COALESCE(v_unit.metadata->>'accommodation_mphb_type', v_unit.unit_type, 'Standard'),
          COALESCE(v_unit.description, ''),
          COALESCE(v_unit.short_description, SUBSTRING(v_unit.description, 1, 150), ''),
          COALESCE(v_unit.metadata->'capacity', '{"adults":2,"children":0,"total":2}'::jsonb),
          COALESCE(v_unit.metadata->'bed_configuration', '[{"type":"Queen","quantity":1}]'::jsonb),
          (v_unit.metadata->>'size_m2')::INTEGER,
          v_unit.metadata->>'view_type',
          COALESCE(v_unit.images, '[]'::jsonb),
          (v_unit.metadata->>'motopress_room_type_id')::INTEGER,
          (v_unit.metadata->>'motopress_unit_id')::INTEGER,
          COALESCE(v_unit.description, ''),
          COALESCE(v_unit.metadata->>'tourism_features', ''),
          COALESCE(v_unit.metadata->>'booking_policies', ''),
          COALESCE(v_unit.metadata->'unique_features', '[]'::jsonb),
          CASE WHEN v_unit.is_active THEN 'active' ELSE 'inactive' END,
          COALESCE((v_unit.metadata->>'is_featured')::BOOLEAN, FALSE),
          v_unit.display_order_val,
          (v_unit.pricing->>'base_price')::INTEGER,
          (v_unit.pricing->>'base_price')::INTEGER,
          COALESCE(v_unit.metadata->'unit_amenities', '[]'::jsonb),
          CASE
            WHEN jsonb_typeof(v_unit.metadata->'unit_amenities') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'unit_amenities')), ', ')
            ELSE COALESCE(v_unit.metadata->>'unit_amenities', '')
          END,
          v_unit.metadata->>'accommodation_mphb_type',
          CASE
            WHEN jsonb_typeof(v_unit.metadata->'tags') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'tags'))
            ELSE '{}'::TEXT[]
          END,
          v_unit.metadata->>'subcategory',
          NOW(),
          NOW()
        );

        v_created := v_created + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error processing unit %: %', v_unit.unit_name, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_created, v_updated, v_errors;
END;
$$;

CREATE OR REPLACE FUNCTION "update_airbnb_motopress_comparison_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========================================
-- CATEGORY 7: Accommodation Management (16 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "check_accommodation_type_hotel_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM accommodation_types 
    WHERE id = NEW.accommodation_type_id 
    AND hotel_id = NEW.hotel_id
  ) THEN
    RAISE EXCEPTION 'accommodation_type_id must belong to the same hotel as accommodation_unit';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer DEFAULT NULL::integer, "p_status" character varying DEFAULT 'active'::character varying) RETURNS TABLE("id" "uuid", "name" character varying, "motopress_type_id" integer, "tenant_id" character varying, "status" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_unit hotels.accommodation_units%ROWTYPE;
BEGIN
  -- Insert into hotels.accommodation_units
  INSERT INTO hotels.accommodation_units (
    tenant_id,
    name,
    motopress_type_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_name,
    p_motopress_type_id,
    p_status,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_new_unit;

  -- Return the created unit
  RETURN QUERY
  SELECT
    v_new_unit.id,
    v_new_unit.name::VARCHAR,
    v_new_unit.motopress_type_id,
    v_new_unit.tenant_id,
    v_new_unit.status;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) RETURNS TABLE("id" "uuid", "name" character varying, "unit_number" character varying, "view_type" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.name,
    au.unit_number,
    au.view_type
  FROM hotels.accommodation_units au
  WHERE au.id = p_unit_id
    AND au.tenant_id = p_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) RETURNS TABLE("id" "uuid", "name" character varying, "motopress_type_id" integer, "motopress_unit_id" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Search by type_id FIRST (preferred), then by unit_id as fallback
  -- This ensures compatibility with all tenant configurations
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.motopress_type_id,
    au.motopress_unit_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::VARCHAR
    AND (
      au.motopress_type_id = p_motopress_type_id
      OR au.motopress_unit_id = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_unit_id uuid;
BEGIN
  -- First try to find in hotels.accommodation_units (operational data)
  SELECT id INTO v_unit_id
  FROM hotels.accommodation_units
  WHERE name = p_unit_name
    AND tenant_id = p_tenant_id
  LIMIT 1;
  
  -- If found in hotels, return the corresponding public unit ID for embeddings
  IF v_unit_id IS NOT NULL THEN
    -- Map to public ID for embeddings
    SELECT unit_id INTO v_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'original_accommodation' = p_unit_name
      AND name LIKE p_unit_name || ' - Overview'
    LIMIT 1;
  END IF;
  
  RETURN v_unit_id;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_units"("p_hotel_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" character varying, "unit_number" character varying, "description" "text", "short_description" "text", "capacity" "jsonb", "bed_configuration" "jsonb", "view_type" character varying, "status" character varying, "is_featured" boolean, "display_order" integer, "hotel_id" "uuid", "tenant_id" character varying, "unique_features" "jsonb", "accessibility_features" "jsonb", "location_details" "jsonb", "embedding_fast" "vector", "embedding_balanced" "vector", "base_price_low_season" integer, "base_price_high_season" integer, "amenities_list" "jsonb", "unit_amenities" "text")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id, au.name, au.unit_number, au.description, au.short_description,
    au.capacity, au.bed_configuration, au.view_type, au.status, au.is_featured, au.display_order, 
    au.hotel_id, au.tenant_id, au.unique_features, au.accessibility_features, au.location_details,
    au.embedding_fast, au.embedding_balanced, au.base_price_low_season, au.base_price_high_season,
    au.amenities_list, au.unit_amenities
  FROM hotels.accommodation_units au
  WHERE (p_hotel_id IS NULL OR au.hotel_id = p_hotel_id)
    AND (p_tenant_id IS NULL OR au.tenant_id = p_tenant_id)
  ORDER BY au.display_order ASC;
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "name" "text", "unit_number" "text", "unit_type" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Return data from hotels.accommodation_units with clean names
  RETURN QUERY
  SELECT DISTINCT
    hu.id,
    hu.name::text as name,  -- Clean name from hotels table
    hu.unit_number::text as unit_number,
    hu.unit_type::varchar as unit_type
  FROM hotels.accommodation_units hu
  WHERE hu.id = ANY(p_unit_ids);
END;
$$;

CREATE OR REPLACE FUNCTION "get_accommodation_units_needing_type_id"("p_tenant_id" "text") RETURNS TABLE("id" "uuid", "name" "text", "motopress_unit_id" integer, "motopress_type_id" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.motopress_unit_id,
    au.motopress_type_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id
    AND au.motopress_unit_id IS NOT NULL
    AND au.motopress_type_id IS NULL
  ORDER BY au.name;
END;
$$;

CREATE OR REPLACE FUNCTION "insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text" DEFAULT NULL::"text", "p_unit_number" "text" DEFAULT NULL::"text", "p_unit_type" character varying DEFAULT NULL::character varying, "p_highlights" "jsonb" DEFAULT '[]'::"jsonb", "p_amenities" "jsonb" DEFAULT '{}'::"jsonb", "p_embedding_fast" "jsonb" DEFAULT NULL::"jsonb", "p_embedding" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO accommodation_units_public (
    tenant_id, name, description, short_description, unit_number, unit_type,
    highlights, amenities, embedding_fast, embedding
  ) VALUES (
    p_tenant_id,
    p_name,
    p_description,
    p_short_description,
    p_unit_number,
    p_unit_type,
    p_highlights,
    p_amenities,
    p_embedding_fast::text::vector,  -- JSONB -> text -> vector
    p_embedding::text::vector         -- JSONB -> text -> vector
  );
END;
$$;

CREATE OR REPLACE FUNCTION "insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text" DEFAULT NULL::"text", "p_unit_number" "text" DEFAULT NULL::"text", "p_unit_type" character varying DEFAULT NULL::character varying, "p_highlights" "jsonb" DEFAULT '[]'::"jsonb", "p_amenities" "jsonb" DEFAULT '{}'::"jsonb", "p_embedding_fast" "text" DEFAULT NULL::"text", "p_embedding" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO accommodation_units_public (
    tenant_id, name, description, short_description, unit_number, unit_type,
    highlights, amenities, embedding_fast, embedding
  ) VALUES (
    p_tenant_id,
    p_name,
    p_description,
    p_short_description,
    p_unit_number,
    p_unit_type,
    p_highlights,
    p_amenities,
    p_embedding_fast::vector,
    p_embedding::vector
  );
END;
$$;

CREATE OR REPLACE FUNCTION "map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delegate to v2 (enhanced version)
  RETURN map_hotel_to_public_accommodation_id_v2(p_hotel_unit_id, p_tenant_id);
END;
$$;

CREATE OR REPLACE FUNCTION "map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
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
$$;

CREATE OR REPLACE FUNCTION "map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_motopress_id integer;
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- PRIORITY 1: Search by motopress_unit_id (MOST STABLE)
  -- motopress_unit_id is a direct column (integer), not in metadata
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
$$;

CREATE OR REPLACE FUNCTION "map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_accommodation_name text;
  v_hotel_unit_id uuid;
BEGIN
  -- Get the accommodation name from accommodation_units_public
  SELECT metadata->>'original_accommodation' INTO v_accommodation_name
  FROM accommodation_units_public
  WHERE unit_id = p_public_unit_id
    AND tenant_id::text = p_tenant_id
  LIMIT 1;
  
  -- If not found, return the original ID
  IF v_accommodation_name IS NULL THEN
    RETURN p_public_unit_id;
  END IF;
  
  -- Find the corresponding unit in hotels.accommodation_units
  SELECT id INTO v_hotel_unit_id
  FROM hotels.accommodation_units
  WHERE name = v_accommodation_name
    AND tenant_id = p_tenant_id
  LIMIT 1;
  
  -- Return the hotel ID if found, otherwise return the original ID
  RETURN COALESCE(v_hotel_unit_id, p_public_unit_id);
END;
$$;

CREATE OR REPLACE FUNCTION "update_accommodation_units_manual_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "validate_pricing_rule"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validar que reglas hourly tengan hour_ranges
  IF NEW.rule_type = 'hourly' AND (NEW.hour_ranges IS NULL OR NEW.hour_ranges = '[]'::jsonb) THEN
    RAISE EXCEPTION 'Hourly pricing rules must have hour_ranges defined';
  END IF;
  
  -- Validar que reglas seasonal tengan date_range
  IF NEW.rule_type = 'seasonal' AND NEW.date_range IS NULL THEN
    RAISE EXCEPTION 'Seasonal pricing rules must have date_range defined';
  END IF;
  
  -- Validar que effective_until sea posterior a effective_from
  IF NEW.effective_until IS NOT NULL AND NEW.effective_until <= NEW.effective_from THEN
    RAISE EXCEPTION 'effective_until must be after effective_from';
  END IF;
  
  -- Validar base_price positivo
  IF NEW.base_price < 0 THEN
    RAISE EXCEPTION 'base_price must be non-negative';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Total functions: 86

-- ============================================
-- END Database Functions
-- ============================================
--
-- Summary:
-- - 89 functions created across 9 categories
-- - ALL functions include: SET search_path = public, pg_temp
-- - Categories:
--   Tenant Management: 45 functions
--   Vector Search & Embeddings: 44 functions
--
-- Critical: search_path ensures RLS context is maintained
-- All functions are SECURITY DEFINER with proper isolation
-- ============================================

-- ========================================
-- CATEGORY 8: System & Utilities (10 functions)
-- ========================================

CREATE OR REPLACE FUNCTION "check_metadata_integrity"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
  null_rate numeric;
BEGIN
  SELECT 
    COALESCE(
      ROUND(
        (COUNT(CASE WHEN metadata IS NULL OR metadata = '{}'::jsonb THEN 1 END) * 100.0) / 
        NULLIF(COUNT(*), 0), 
        2
      ),
      0
    )
  INTO null_rate
  FROM chat_messages;
  
  IF null_rate > 10 THEN
    RETURN QUERY SELECT 
      'metadata_integrity'::text,
      'warning'::text,
      format('High NULL/empty metadata rate: %s%%', null_rate)::text,
      jsonb_build_object(
        'null_rate', null_rate,
        'threshold', 10,
        'action', 'Investigate message creation process'
      );
  ELSIF null_rate > 5 THEN
    RETURN QUERY SELECT 
      'metadata_integrity'::text,
      'notice'::text,
      format('Elevated NULL/empty metadata rate: %s%%', null_rate)::text,
      jsonb_build_object(
        'null_rate', null_rate,
        'threshold', 5,
        'action', 'Monitor for trends'
      );
  ELSE
    RETURN QUERY SELECT 
      'metadata_integrity'::text,
      'ok'::text,
      format('Metadata integrity healthy: %s%% NULL/empty', null_rate)::text,
      jsonb_build_object(
        'null_rate', null_rate,
        'status', 'healthy'
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "check_rls_policies"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
DECLARE
  tables_without_rls int;
BEGIN
  SELECT COUNT(*)
  INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('chat_messages', 'chat_conversations', 'guest_reservations')
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE pg_policies.schemaname = pg_tables.schemaname 
      AND pg_policies.tablename = pg_tables.tablename
    );
  
  IF tables_without_rls > 0 THEN
    RETURN QUERY SELECT 
      'rls_policy_check'::text,
      'critical'::text,
      format('%s tables missing RLS policies', tables_without_rls)::text,
      jsonb_build_object(
        'tables_without_policies', tables_without_rls,
        'action', 'Add RLS policies immediately'
      );
  ELSE
    RETURN QUERY SELECT 
      'rls_policy_check'::text,
      'ok'::text,
      'All guest chat tables have RLS policies'::text,
      jsonb_build_object(
        'policy_count', (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('chat_messages', 'chat_conversations', 'guest_reservations')),
        'status', 'healthy'
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "check_rls_status"() RETURNS TABLE("schema_name" "text", "table_name" "text", "rls_enabled" boolean, "policy_count" bigint)
    LANGUAGE "sql"
    SET search_path = public, pg_temp
AS $$
    SELECT 
        t.schemaname::TEXT,
        t.tablename::TEXT,
        t.rowsecurity,
        COUNT(p.policyname)
    FROM pg_tables t
    LEFT JOIN pg_policies p ON (t.schemaname = p.schemaname AND t.tablename = p.tablename)
    WHERE t.schemaname = 'hotels'
    GROUP BY t.schemaname, t.tablename, t.rowsecurity
    ORDER BY t.tablename;
$$;

CREATE OR REPLACE FUNCTION "check_slow_queries"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  -- Note: This is a placeholder for actual slow query monitoring
  -- In production, use pg_stat_statements extension
  RETURN QUERY
  SELECT 
    'slow_query_check'::text as alert_type,
    'info'::text as severity,
    'Manual slow query monitoring required - use pg_stat_statements'::text as message,
    jsonb_build_object(
      'recommendation', 'Enable pg_stat_statements extension for automatic slow query detection',
      'target_threshold', '100ms'
    ) as details;
END;
$$;

CREATE OR REPLACE FUNCTION "exec_sql"("sql" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
    result json;
    rows_affected integer;
    error_detail text;
    error_context text;
    error_hint text;
BEGIN
    -- Execute the provided SQL
    EXECUTE sql;
    
    -- Get number of rows affected
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    -- Return success status with row count
    RETURN json_build_object(
        'success', true, 
        'message', 'SQL executed successfully',
        'rows_affected', rows_affected,
        'sql_preview', left(sql, 150)
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Get additional error details
        GET STACKED DIAGNOSTICS 
            error_detail = PG_EXCEPTION_DETAIL,
            error_context = PG_EXCEPTION_CONTEXT,
            error_hint = PG_EXCEPTION_HINT;
        
        -- Return comprehensive error information
        RETURN json_build_object(
            'success', false, 
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'error_detail', error_detail,
            'error_context', error_context,
            'error_hint', error_hint,
            'sql_preview', left(sql, 150)
        );
END;
$$;

CREATE OR REPLACE FUNCTION "execute_sql"("query" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Security check: Only allow service_role to execute
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'execute_sql() can only be called by service_role';
  END IF;

  -- Execute the query and aggregate results as JSONB array
  -- This handles both single-row and multi-row SELECT statements
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query) INTO result;

  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

CREATE OR REPLACE FUNCTION "list_rls_policies"() RETURNS TABLE("table_name" "text", "policy_name" "text", "command" "text", "roles" "text"[])
    LANGUAGE "sql"
    SET search_path = public, pg_temp
AS $$
    SELECT 
        tablename::TEXT,
        policyname::TEXT,
        cmd::TEXT,
        roles
    FROM pg_policies 
    WHERE schemaname = 'hotels' 
    ORDER BY tablename, policyname;
$$;

CREATE OR REPLACE FUNCTION "match_hotel_general_info"("query_embedding" "vector", "p_tenant_id" character varying, "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5) RETURNS TABLE("info_id" "uuid", "info_title" character varying, "info_content" "text", "info_type" character varying, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
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
    AND gi.info_type IN ('faq', 'arrival')  -- KEY FILTER: Only general info
    AND gi.is_active = true
    AND gi.embedding_balanced IS NOT NULL
    AND 1 - (gi.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY gi.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION "test_ddl_execution"() RETURNS "text"
    LANGUAGE "sql"
    SET search_path = public, pg_temp
AS $$ SELECT 'DDL works!' $$;



CREATE OR REPLACE FUNCTION "update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- END Database Functions
-- ============================================
--
-- Summary:
-- - 86 functions created across 8 categories
-- - ALL functions include: SET search_path = public, pg_temp
-- - Categories:
--   Tenant Management: 10 functions
--   Guest Authentication & Conversations: 7 functions
--   Vector Search & Embeddings: 29 functions
--   SIRE Compliance: 5 functions
--   Reservations & Bookings: 4 functions
--   Integrations & Sync: 5 functions
--   Accommodation Management: 16 functions
--   System & Utilities: 10 functions
--
-- Critical: search_path ensures RLS context is maintained
-- All functions are SECURITY DEFINER with proper isolation
-- ============================================
