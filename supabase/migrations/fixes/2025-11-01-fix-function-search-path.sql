-- ============================================================================
-- FIX function_search_path_mutable SECURITY WARNINGS
-- ============================================================================
-- Migration: 2025-11-01-fix-function-search-path.sql
-- Purpose: Add SET search_path to functions missing it
-- Warnings: 14 function_search_path_mutable warnings
-- Security: Prevents search_path hijacking attacks
-- ============================================================================

-- ============================================================================
-- 1. check_event_overlap
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_event_overlap(p_accommodation_unit_id uuid, p_start_date date, p_end_date date, p_exclude_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(event_id uuid, event_type character varying, start_date date, end_date date, source character varying)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

-- ============================================================================
-- 2. cleanup_old_sync_logs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.calendar_sync_logs
  WHERE started_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$function$;

-- ============================================================================
-- 3. get_accommodation_tenant_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_accommodation_tenant_id(p_unit_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_tenant_id text;
BEGIN
  -- Get tenant_id from accommodation_units_public (it's stored as uuid but we return as text)
  SELECT tenant_id::text INTO v_tenant_id
  FROM public.accommodation_units_public
  WHERE unit_id = p_unit_id
  LIMIT 1;

  RETURN v_tenant_id;
END;
$function$;

-- ============================================================================
-- 4. get_accommodation_unit_by_name
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_name(p_unit_name text, p_tenant_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
    FROM public.accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'original_accommodation' = p_unit_name
      AND name LIKE p_unit_name || ' - Overview'
    LIMIT 1;
  END IF;

  RETURN v_unit_id;
END;
$function$;

-- ============================================================================
-- 5. get_accommodation_units_by_ids
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_ids(p_unit_ids uuid[])
 RETURNS TABLE(id uuid, name text, unit_number text, unit_type character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- ============================================================================
-- 6. get_availability
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_availability(p_accommodation_unit_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(date date, is_available boolean, event_type character varying, event_id uuid)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

-- ============================================================================
-- 7. insert_accommodation_unit (overload 1 - text vectors)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_accommodation_unit(p_tenant_id uuid, p_name text, p_description text, p_short_description text DEFAULT NULL::text, p_unit_number text DEFAULT NULL::text, p_unit_type character varying DEFAULT NULL::character varying, p_highlights jsonb DEFAULT '[]'::jsonb, p_amenities jsonb DEFAULT '{}'::jsonb, p_embedding_fast text DEFAULT NULL::text, p_embedding text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.accommodation_units_public (
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
$function$;

-- ============================================================================
-- 8. insert_accommodation_unit (overload 2 - jsonb vectors)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_accommodation_unit(p_tenant_id uuid, p_name text, p_description text, p_short_description text DEFAULT NULL::text, p_unit_number text DEFAULT NULL::text, p_unit_type character varying DEFAULT NULL::character varying, p_highlights jsonb DEFAULT '[]'::jsonb, p_amenities jsonb DEFAULT '{}'::jsonb, p_embedding_fast jsonb DEFAULT NULL::jsonb, p_embedding jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.accommodation_units_public (
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
$function$;

-- ============================================================================
-- 9. map_public_to_hotel_accommodation_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.map_public_to_hotel_accommodation_id(p_public_unit_id uuid, p_tenant_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_accommodation_name text;
  v_hotel_unit_id uuid;
BEGIN
  -- Get the accommodation name from accommodation_units_public
  SELECT metadata->>'original_accommodation' INTO v_accommodation_name
  FROM public.accommodation_units_public
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
$function$;

-- ============================================================================
-- 10. propagate_parent_booking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.propagate_parent_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
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
$function$;

-- ============================================================================
-- 11. search_code_embeddings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_code_embeddings(query_embedding vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 10)
 RETURNS TABLE(file_path text, chunk_index integer, content text, similarity double precision)
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ce.file_path,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM public.code_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;

-- ============================================================================
-- 12. test_ddl_execution
-- ============================================================================
CREATE OR REPLACE FUNCTION public.test_ddl_execution()
 RETURNS text
 LANGUAGE sql
 SET search_path = ''
AS $function$ SELECT 'DDL works!' $function$;

-- ============================================================================
-- 13. update_airbnb_motopress_comparison_updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_airbnb_motopress_comparison_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 14. update_updated_at_column
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After this migration: 0 function_search_path_mutable warnings expected
-- Security: Prevents search_path hijacking attacks
-- Impact: All functions now have immutable search_path
-- ============================================================================
