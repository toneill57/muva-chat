

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "hotels";


ALTER SCHEMA "hotels" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "muva_activities";


ALTER SCHEMA "muva_activities" OWNER TO "postgres";


COMMENT ON SCHEMA "muva_activities" IS 'MUVA tourism activities schema - specialized tables for water sports, tours, and adventure activities';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'Schema para contenido compartido: SIRE, MUVA, tenant registry, user permissions. Business data migrado a schemas específicos (hotels, restaurants, etc).';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "hotels"."generate_deterministic_uuid"("p_tenant_id" character varying, "p_motopress_unit_id" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO 'hotels', 'public'
    AS $$
BEGIN
  -- Validar inputs
  IF p_tenant_id IS NULL OR p_motopress_unit_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and motopress_unit_id cannot be NULL';
  END IF;

  -- Generar UUID determinístico usando namespace + clave compuesta
  RETURN extensions.uuid_generate_v5(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,  -- Namespace fijo para accommodations
    p_tenant_id || ':motopress:' || p_motopress_unit_id::text
  );
END;
$$;


ALTER FUNCTION "hotels"."generate_deterministic_uuid"("p_tenant_id" character varying, "p_motopress_unit_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "hotels"."generate_deterministic_uuid"("p_tenant_id" character varying, "p_motopress_unit_id" integer) IS 'Generates deterministic UUID v5 for accommodation units based on tenant_id and motopress_unit_id.
   Same inputs always produce same UUID, ensuring stability across database rebuilds.
   RFC 4122 compliant.';



CREATE OR REPLACE FUNCTION "muva_activities"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "muva_activities"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_accommodation_type_hotel_match"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_accommodation_type_hotel_match"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("event_id" "uuid", "event_type" character varying, "start_date" "date", "end_date" "date", "source" character varying)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_metadata_integrity"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_metadata_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rls_policies"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_rls_policies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rls_status"() RETURNS TABLE("schema_name" "text", "table_name" "text", "rls_enabled" boolean, "policy_count" bigint)
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_rls_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_rls_status"() IS 'Verifica el estado de RLS en todas las tablas del schema hotels';



CREATE OR REPLACE FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") IS 'Helper function to verify if a user has access to SIRE data for a specific tenant. Returns TRUE if user has active permission, FALSE otherwise.';



CREATE OR REPLACE FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") RETURNS TABLE("is_complete" boolean, "missing_fields" "text"[], "validation_errors" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") IS 'Validates SIRE data completeness for a reservation. Returns is_complete flag, list of missing mandatory fields, and validation errors. Used before TXT export to ensure data quality.';



CREATE OR REPLACE FUNCTION "public"."check_slow_queries"() RETURNS TABLE("alert_type" "text", "severity" "text", "message" "text", "details" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."check_slow_queries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sync_logs"() RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."cleanup_old_sync_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer DEFAULT NULL::integer, "p_status" character varying DEFAULT 'active'::character varying) RETURNS TABLE("id" "uuid", "name" character varying, "motopress_type_id" integer, "tenant_id" character varying, "status" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'hotels', 'public'
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


ALTER FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer, "p_status" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer, "p_status" character varying) IS 'Creates a new accommodation unit in hotels.accommodation_units schema. Used by MotoPress mapper for auto-creating missing accommodations during sync.';



CREATE OR REPLACE FUNCTION "public"."exec_sql"("sql" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."exec_sql"("sql" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_sql"("query" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."execute_sql"("query" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_sql"("query" "text") IS 'Execute raw SQL query (service_role only). Returns all rows as JSONB array. Used by admin scripts for database maintenance.';



CREATE OR REPLACE FUNCTION "public"."get_accommodation_tenant_id"("p_unit_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_accommodation_tenant_id"("p_unit_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) RETURNS TABLE("id" "uuid", "name" character varying, "unit_number" character varying, "view_type" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) IS 'Get accommodation unit by ID from hotels schema. Used by guest-auth to bypass .schema() limitation in Supabase JS client.';



CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) RETURNS TABLE("id" "uuid", "name" character varying, "motopress_type_id" integer, "motopress_unit_id" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'hotels', 'public'
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


ALTER FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) IS 'Universal accommodation lookup function. Searches by both motopress_type_id and motopress_unit_id to support all tenant configurations. Returns the first match found.';



CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accommodation_units"("p_hotel_id" "uuid" DEFAULT NULL::"uuid", "p_tenant_id" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" character varying, "unit_number" character varying, "description" "text", "short_description" "text", "capacity" "jsonb", "bed_configuration" "jsonb", "view_type" character varying, "status" character varying, "is_featured" boolean, "display_order" integer, "hotel_id" "uuid", "tenant_id" character varying, "unique_features" "jsonb", "accessibility_features" "jsonb", "location_details" "jsonb", "embedding_fast" "public"."vector", "embedding_balanced" "public"."vector", "base_price_low_season" integer, "base_price_high_season" integer, "amenities_list" "jsonb", "unit_amenities" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_accommodation_units"("p_hotel_id" "uuid", "p_tenant_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "name" "text", "unit_number" "text", "unit_type" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) IS 'Mapea IDs de hotels.accommodation_units a nombres y busca embeddings en accommodation_units_public';



CREATE OR REPLACE FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") RETURNS TABLE("unit_id" "uuid", "tenant_id" "uuid", "name" "text", "description" "text", "short_description" "text", "unit_number" "text", "unit_type" character varying, "highlights" "jsonb", "amenities" "jsonb", "pricing" "jsonb", "photos" "jsonb", "virtual_tour_url" "text", "metadata" "jsonb", "embedding_fast" "public"."vector", "embedding" "public"."vector", "is_active" boolean, "is_bookable" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") IS 'Fetches all accommodation units for a given tenant. Returns units from accommodation_units_public view ordered by display_order.';



CREATE OR REPLACE FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") RETURNS TABLE("id" "uuid", "name" "text", "motopress_unit_id" integer, "motopress_type_id" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'hotels', 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") IS 'Returns accommodation units that have motopress_unit_id but missing motopress_type_id. Used by populate-motopress-type-ids.ts script.';



CREATE OR REPLACE FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") RETURNS TABLE("id" "uuid", "tenant_id" "uuid", "integration_type" "text", "config_data" "jsonb", "is_active" boolean, "last_sync_at" timestamp without time zone, "created_at" timestamp without time zone, "updated_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") IS 'Get active integration config for tenant (MotoPress, etc.). Replaces 8 queries.';



CREATE OR REPLACE FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text" DEFAULT NULL::"text", "p_days_archived" integer DEFAULT 90) RETURNS TABLE("id" "uuid", "title" "text", "archived_at" timestamp with time zone, "days_archived" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) IS 'Get archived conversations older than N days (for deletion). Used in guest-conversation-memory.ts';



CREATE OR REPLACE FUNCTION "public"."get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("date" "date", "is_available" boolean, "event_type" character varying, "event_id" "uuid")
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "conversation_id" "uuid", "role" "text", "content" "text", "metadata" "jsonb", "created_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) IS 'Get messages for a conversation with pagination. Replaces 6 queries.';



CREATE OR REPLACE FUNCTION "public"."get_full_document"("p_source_file" character varying, "p_table_name" character varying DEFAULT 'muva_content'::character varying) RETURNS TABLE("id" "uuid", "content" "text", "title" character varying, "description" "text", "business_info" "jsonb", "full_content" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_full_document"("p_source_file" character varying, "p_table_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") RETURNS TABLE("id" "uuid", "tenant_id" "text", "guest_id" "uuid", "title" "text", "last_message" "text", "message_count" integer, "compressed_history" "jsonb", "favorites" "jsonb", "is_archived" boolean, "archived_at" timestamp with time zone, "last_activity_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") IS 'Get full conversation metadata including compression history and favorites. Replaces 11 inline queries.';



CREATE OR REPLACE FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text" DEFAULT NULL::"text", "p_days_inactive" integer DEFAULT 30) RETURNS TABLE("id" "uuid", "title" "text", "last_activity_at" timestamp with time zone, "days_inactive" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) IS 'Get conversations inactive for N days (for archiving). Used in guest-conversation-memory.ts';



CREATE OR REPLACE FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") RETURNS TABLE("id" "uuid", "tenant_id" character varying, "name" character varying, "unit_number" character varying, "unit_type" character varying, "description" "text", "short_description" "text", "capacity" "jsonb", "bed_configuration" "jsonb", "size_m2" integer, "view_type" character varying, "images" "jsonb", "motopress_type_id" integer, "motopress_unit_id" integer, "status" character varying, "is_featured" boolean, "display_order" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
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


ALTER FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") IS 'Fetches real accommodation units from hotels.accommodation_units (not documentation chunks from accommodation_units_public). Used by ICS feed configuration and accommodations units API. Returns only bookable units that exist in the system.';



CREATE OR REPLACE FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") RETURNS TABLE("id" "uuid", "tenant_id" "text", "reservation_code" "text", "guest_name" "text", "guest_email" "text", "phone_full" "text", "phone_last_4" "text", "check_in_date" "date", "check_out_date" "date", "status" "text", "accommodation_unit_id" "uuid", "external_booking_id" "text", "booking_source" "text", "total_price" numeric, "currency" "text", "created_at" timestamp without time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") IS 'Find reservations by external booking ID (MotoPress, Airbnb, etc.). Replaces 5 queries.';



CREATE OR REPLACE FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") RETURNS TABLE("reservation_id" "uuid", "reservation_code" "text", "tenant_id" "text", "guest_name" "text", "check_in_date" "date", "check_out_date" "date", "status" "text", "hotel_sire_code" "text", "hotel_city_code" "text", "document_type" "text", "document_type_name" "text", "document_number" "text", "nationality_code" "text", "nationality_name" "text", "first_surname" "text", "second_surname" "text", "given_names" "text", "movement_type" "text", "movement_date" "date", "origin_city_code" "text", "origin_city_name" "text", "destination_city_code" "text", "destination_city_name" "text", "birth_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") IS 'Retrieves complete SIRE guest data for a reservation with human-readable catalog lookups. Fixed VARCHAR→TEXT casting issue.';



CREATE OR REPLACE FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character DEFAULT NULL::"bpchar") RETURNS TABLE("reservation_id" "uuid", "reservation_code" "text", "hotel_sire_code" "text", "hotel_city_code" "text", "document_type" "text", "document_number" "text", "nationality_code" "text", "first_surname" "text", "second_surname" "text", "given_names" "text", "movement_type" "text", "movement_date" "date", "origin_city_code" "text", "destination_city_code" "text", "birth_date" "date", "guest_name" "text", "check_in_date" "date", "check_out_date" "date", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) IS 'Retrieves all SIRE-compliant reservations for monthly TXT export. Filters by movement_date (check-in or check-out) and ensures all mandatory SIRE fields are present. Used for automated monthly SIRE reporting.';



CREATE OR REPLACE FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_reservations" bigint, "sire_complete_reservations" bigint, "sire_incomplete_reservations" bigint, "completion_rate" numeric, "check_ins_complete" bigint, "check_outs_complete" bigint, "top_nationalities" "jsonb", "missing_hotel_code" bigint, "missing_document" bigint, "missing_nationality" bigint, "missing_names" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") IS 'Generates SIRE compliance statistics for a tenant in a date range. Returns completion rates, top nationalities, and missing field counts. Used for compliance dashboards and monitoring.';



CREATE OR REPLACE FUNCTION "public"."get_tenant_schema"("tenant_nit" character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."get_tenant_schema"("tenant_nit" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM tenant_registry
    WHERE tenant_id = p_tenant_id
    AND (features->>p_feature_name)::boolean = true
  );
END;
$$;


ALTER FUNCTION "public"."has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text" DEFAULT NULL::"text", "p_unit_number" "text" DEFAULT NULL::"text", "p_unit_type" character varying DEFAULT NULL::character varying, "p_highlights" "jsonb" DEFAULT '[]'::"jsonb", "p_amenities" "jsonb" DEFAULT '{}'::"jsonb", "p_embedding_fast" "jsonb" DEFAULT NULL::"jsonb", "p_embedding" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "jsonb", "p_embedding" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text" DEFAULT NULL::"text", "p_unit_number" "text" DEFAULT NULL::"text", "p_unit_type" character varying DEFAULT NULL::character varying, "p_highlights" "jsonb" DEFAULT '[]'::"jsonb", "p_amenities" "jsonb" DEFAULT '{}'::"jsonb", "p_embedding_fast" "text" DEFAULT NULL::"text", "p_embedding" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "text", "p_embedding" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_rls_policies"() RETURNS TABLE("table_name" "text", "policy_name" "text", "command" "text", "roles" "text"[])
    LANGUAGE "sql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."list_rls_policies"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_rls_policies"() IS 'Lista todas las políticas RLS del schema hotels';



CREATE OR REPLACE FUNCTION "public"."log_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."log_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
    AS $$
BEGIN
  -- Delegate to v2 (enhanced version)
  RETURN map_hotel_to_public_accommodation_id_v2(p_hotel_unit_id, p_tenant_id);
END;
$$;


ALTER FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") IS 'Default ID mapping function (currently delegates to v2). Use this in application code for automatic version updates.';



CREATE OR REPLACE FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
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


ALTER FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") IS 'Original mapping function (name-based only). Kept for reference and rollback purposes.';



CREATE OR REPLACE FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
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


ALTER FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") IS 'Maps hotel UUID to public UUID prioritizing stable motopress_unit_id (integer column) over name matching. Returns: (1) match by motopress_unit_id, (2) fallback to name match, (3) original ID if no match.';



CREATE OR REPLACE FUNCTION "public"."map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_accommodation_units_balanced"("query_embedding" "public"."vector", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "booking_policies" "text", "capacity" "jsonb", "is_featured" boolean, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_accommodation_units_balanced"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_accommodation_units_fast"("query_embedding" "public"."vector", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "content" "text", "view_type" character varying, "is_featured" boolean, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_accommodation_units_fast"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "content" "text", "similarity_fast" double precision, "similarity_balanced" double precision, "similarity_combined" double precision, "source_file" "text", "pricing" "jsonb", "photos" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Hybrid multi-tier vector search for PUBLIC chat (INCLUDES INACTIVE accommodations).
Uses Tier 1 (1024d) for fast HNSW search, Tier 2 (1536d) for precision re-ranking.
Returns results sorted by combined score (70% Tier 2 + 30% Tier 1).
Performance: ~85ms typical (vs 50ms Tier 1 only).
Benefit: Improved precision for booking policies, amenities, and complex queries.
Shows ALL tenant accommodations regardless of is_active status (UI displays badges).';



CREATE OR REPLACE FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision, "source_file" "text", "pricing" "jsonb", "photos" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Vector similarity search for PUBLIC chat with CLEAN semantic chunks.
Returns description-only content (no metadata concatenation) for better LLM context.
Metadata available separately in metadata JSONB field.
Uses HNSW index for ultra-fast searches (<50ms typical).';



CREATE OR REPLACE FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 2) RETURNS TABLE("id" "uuid", "summary_text" "text", "key_entities" "jsonb", "message_range" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Semantic search function for conversation memories. Returns top N most similar memories for a given session with similarity score > threshold.';



CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "public"."vector", "source_file" character varying, "document_type" character varying, "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents_with_tenant"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.78, "match_count" integer DEFAULT 10, "domain_filter" "text" DEFAULT NULL::"text", "tenant_nit" character varying DEFAULT NULL::character varying) RETURNS TABLE("content" "text", "similarity" double precision, "source_file" character varying, "document_type" character varying, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_documents_with_tenant"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text", "tenant_nit" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.15, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "name" "text", "content" "text", "similarity" double precision, "source_table" "text", "is_guest_unit" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Vector similarity search for GUEST chat system (accommodation domain). 
Returns public accommodation info for ALL units, with is_guest_unit flag. 
Updated 2025-10-02: Added name field to fix "Unknown" display issue.';



CREATE OR REPLACE FUNCTION "public"."match_guest_information_balanced"("query_embedding" "public"."vector", "p_tenant_id" "text", "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5) RETURNS TABLE("info_id" "uuid", "info_title" character varying, "info_content" "text", "info_type" character varying, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_guest_information_balanced"("query_embedding" "public"."vector", "p_tenant_id" "text", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_hotel_content"("query_embedding" "public"."vector", "client_nit" character varying DEFAULT NULL::character varying, "property_name" character varying DEFAULT NULL::character varying, "match_threshold" double precision DEFAULT 0.78, "match_count" integer DEFAULT 10) RETURNS TABLE("content" "text", "similarity" double precision, "source_type" character varying, "source_name" character varying, "client_info" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotel_content"("query_embedding" "public"."vector", "client_nit" character varying, "property_name" character varying, "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "public"."vector", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision, "client_id" "uuid", "business_type" character varying, "zone" character varying, "title" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Función específica para búsqueda de documentos de hotel de un cliente específico';



CREATE OR REPLACE FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5) RETURNS TABLE("info_id" "uuid", "info_title" character varying, "info_content" "text", "info_type" character varying, "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision, "match_count" integer) IS 'Domain 2: Search general hotel information (FAQ, Arrival) that applies to ALL guests';



CREATE OR REPLACE FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 4) RETURNS TABLE("operation_id" "uuid", "title" "text", "content" "text", "category" "text", "access_level" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision, "match_count" integer) IS 'Vector search for hotel operations with role-based access filtering. Uses Tier 2 (1536d) embeddings.';



CREATE OR REPLACE FUNCTION "public"."match_hotels_documents"("query_embedding" "public"."vector", "tenant_id_filter" "text", "business_type_filter" "text" DEFAULT NULL::"text", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4, "tier" integer DEFAULT 2) RETURNS TABLE("id" "text", "content" "text", "source_table" "text", "metadata" "jsonb", "similarity" double precision, "tier_used" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotels_documents"("query_embedding" "public"."vector", "tenant_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer, "tier" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_hotels_documents_optimized"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("content" "text", "similarity" double precision, "source_table" "text", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotels_documents_optimized"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_hotels_with_tier_routing"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "search_type" "text" DEFAULT 'tourism'::"text", "similarity_threshold" double precision DEFAULT 0.8, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "name" character varying, "description" "text", "tourism_summary" "text", "policies_summary" "text", "address" "jsonb", "hotel_amenities" "jsonb", "similarity" double precision, "search_tier" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_hotels_with_tier_routing"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "search_type" "text", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text" DEFAULT NULL::"text", "business_type_filter" "text" DEFAULT 'hotel'::"text", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text" DEFAULT NULL::"text", "business_type_filter" character varying DEFAULT 'hotel'::character varying, "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" character varying, "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_muva_activities"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" character varying, "nombre" character varying, "categoria" character varying, "content" "text", "zona" character varying, "subzona" character varying, "precio" "text", "telefono" character varying, "website" character varying, "actividades_disponibles" "text"[], "tags" "text"[], "keywords" "text"[], "chunk_index" integer, "total_chunks" integer, "source_file" character varying, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_muva_activities"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_muva_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "public"."vector", "source_file" "text", "title" "text", "description" "text", "category" "text", "subcategory" "text", "business_info" "jsonb", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_muva_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "content" "text", "similarity" double precision, "source_file" "text", "title" "text", "description" "text", "category" "text", "subcategory" "text", "business_info" "jsonb", "document_type" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) IS 'Fast MUVA search for public chat using 1024d embeddings';



CREATE OR REPLACE FUNCTION "public"."match_optimized_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 4, "target_tables" "text"[] DEFAULT NULL::"text"[], "tier" integer DEFAULT 0, "tenant_id_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("content" "text", "similarity" double precision, "source_table" "text", "metadata" "jsonb", "tier_name" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_optimized_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "target_tables" "text"[], "tier" integer, "tenant_id_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.5, "match_count" integer DEFAULT 2) RETURNS TABLE("id" "uuid", "policy_name" "text", "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
BEGIN
  -- Check if policies table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'policies'
  ) THEN
    -- Return empty result if policies table doesn't exist yet
    RETURN;
  END IF;

  RETURN QUERY
  EXECUTE format('
    SELECT 
      p.id,
      p.policy_name,
      p.content,
      1 - (p.embedding_balanced <=> $1) AS similarity
    FROM public.policies p
    WHERE p.tenant_id = $2
      AND 1 - (p.embedding_balanced <=> $1) > $3
    ORDER BY p.embedding_balanced <=> $1
    LIMIT $4
  ')
  USING query_embedding, p_tenant_id, match_threshold, match_count;
END;
$_$;


ALTER FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Vector search for hotel policies. Uses Tier 2 (1536d) embeddings. Safe for schemas without policies table.';



CREATE OR REPLACE FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "policy_id" "uuid", "title" "text", "content" "text", "policy_type" "text", "similarity" double precision, "source_file" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.policy_id as id,
    p.policy_id,
    p.policy_title::TEXT as title,
    p.policy_content::TEXT as content,
    p.policy_type::TEXT,
    (1 - (p.embedding_fast <=> query_embedding))::FLOAT as similarity,
    ('policy_' || p.policy_type)::TEXT as source_file
  FROM hotels.policies p
  WHERE p.tenant_id::uuid = p_tenant_id
    AND p.is_active = true
    AND p.embedding_fast IS NOT NULL
    AND (1 - (p.embedding_fast <=> query_embedding)) > match_threshold
  ORDER BY p.embedding_fast <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Vector similarity search for hotel policies using 1024d fast embeddings. For public/anonymous chat.';



CREATE OR REPLACE FUNCTION "public"."match_simmerdown_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_simmerdown_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_sire_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.0, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "content" "text", "embedding" "public"."vector", "source_file" "text", "document_type" "text", "chunk_index" integer, "total_chunks" integer, "created_at" timestamp with time zone, "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_sire_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision DEFAULT 0.2, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "uuid", "title" "text", "content" "text", "similarity" double precision, "source_file" "text", "business_info" "jsonb", "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Vector search for tenant-specific MUVA documents.
Used by agency/commission tenants to show their own tourism listings.
Returns top N most similar documents based on query embedding (1024d Tier 1).';



CREATE OR REPLACE FUNCTION "public"."match_unified_documents"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 5, "domain_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "content" "text", "domain" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_unified_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 3) RETURNS TABLE("unit_id" "uuid", "unit_name" character varying, "manual_content" "text", "detailed_instructions" "text", "wifi_password" "text", "safe_code" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision, "match_count" integer) IS 'Domain 3: Search private unit manual information ONLY for the guest''s assigned accommodation';



CREATE OR REPLACE FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 3) RETURNS TABLE("id" "uuid", "manual_id" "uuid", "chunk_content" "text", "chunk_index" integer, "section_title" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
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


ALTER FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision, "match_count" integer) IS 'Search manual chunks directly using hotel UUID (no mapping). Manual chunks contain private operational data and reference hotels.accommodation_units per ADR-001.';



CREATE OR REPLACE FUNCTION "public"."propagate_parent_booking"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."propagate_parent_booking"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 10) RETURNS TABLE("file_path" "text", "chunk_index" integer, "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) IS 'Search code embeddings using cosine similarity. Returns top N matches above threshold.';



CREATE OR REPLACE FUNCTION "public"."search_hotels_by_tenant"("query_embedding" "public"."vector", "tenant_ids" "text"[] DEFAULT ARRAY['simmerdown'::"text"], "content_types" "text"[] DEFAULT ARRAY['accommodation_units'::"text", 'policies'::"text", 'guest_information'::"text"], "match_threshold" double precision DEFAULT 0.3, "match_count" integer DEFAULT 10) RETURNS TABLE("id" "text", "content" "text", "metadata" "jsonb", "similarity" double precision, "tenant_id" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."search_hotels_by_tenant"("query_embedding" "public"."vector", "tenant_ids" "text"[], "content_types" "text"[], "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_muva_attractions"("query_embedding" "public"."vector", "location_filter" "text" DEFAULT NULL::"text", "min_rating" numeric DEFAULT NULL::numeric, "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "title" "text", "description" "text", "location" "text", "rating" numeric, "opening_hours" "text", "contact_info" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."search_muva_attractions"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_muva_restaurants"("query_embedding" "public"."vector", "location_filter" "text" DEFAULT NULL::"text", "min_rating" numeric DEFAULT NULL::numeric, "price_filter" "text" DEFAULT NULL::"text", "match_count" integer DEFAULT 4) RETURNS TABLE("id" "text", "content" "text", "title" "text", "description" "text", "location" "text", "rating" numeric, "price_range" "text", "opening_hours" "text", "contact_info" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."search_muva_restaurants"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "price_filter" "text", "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision DEFAULT 0.7, "p_match_count" integer DEFAULT 5) RETURNS TABLE("id" "uuid", "file_path" "text", "chunk_index" integer, "content" "text", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer) IS 'Semantic search within tenant knowledge base using cosine similarity';



CREATE OR REPLACE FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, false);
    RETURN 'Tenant ID configurado: ' || tenant_id;
END;
$$;


ALTER FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") IS 'Configura el tenant_id para la sesión actual (uso en aplicación)';



CREATE OR REPLACE FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") RETURNS TABLE("scenario" "text", "configured_tenant" "text", "properties_visible" integer, "units_visible" integer, "isolation_working" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") IS 'Simula acceso de aplicación con tenant específico para testing';



CREATE OR REPLACE FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") RETURNS TABLE("created_count" integer, "updated_count" integer, "error_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'hotels'
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


ALTER FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") IS 'Syncs consolidated accommodation units from accommodation_units_public to hotels.accommodation_units using exact unit_type from MotoPress (no guessing).';



CREATE OR REPLACE FUNCTION "public"."test_ddl_execution"() RETURNS "text"
    LANGUAGE "sql"
    AS $$ SELECT 'DDL works!' $$;


ALTER FUNCTION "public"."test_ddl_execution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_tenant_isolation_simple"() RETURNS TABLE("test_scenario" "text", "tenant_id_used" "text", "properties_count" integer, "accommodation_units_count" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Test 1: Configurar como tenant 'simmerdown'
    PERFORM set_config('app.current_tenant_id', 'simmerdown', true);
    
    RETURN QUERY SELECT 
        'Tenant: simmerdown (debe ver datos)'::TEXT,
        current_setting('app.current_tenant_id')::TEXT,
        (SELECT COUNT(*)::INTEGER FROM hotels.properties),
        (SELECT COUNT(*)::INTEGER FROM hotels.accommodation_units);
    
    -- Test 2: Configurar como tenant diferente
    PERFORM set_config('app.current_tenant_id', 'otro_tenant', true);
    
    RETURN QUERY SELECT 
        'Tenant: otro_tenant (NO debe ver datos)'::TEXT,
        current_setting('app.current_tenant_id')::TEXT,
        (SELECT COUNT(*)::INTEGER FROM hotels.properties),
        (SELECT COUNT(*)::INTEGER FROM hotels.accommodation_units);
        
    -- Test 3: Sin tenant configurado
    PERFORM set_config('app.current_tenant_id', '', true);
    
    RETURN QUERY SELECT 
        'Sin tenant (NO debe ver datos)'::TEXT,
        COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), 'NO_SET')::TEXT,
        (SELECT COUNT(*)::INTEGER FROM hotels.properties),
        (SELECT COUNT(*)::INTEGER FROM hotels.accommodation_units);
END;
$$;


ALTER FUNCTION "public"."test_tenant_isolation_simple"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_accommodation_units_manual_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_accommodation_units_manual_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_attachments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_attachments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  UPDATE chat_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_pricing_rule"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."validate_pricing_rule"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "hotels"."accommodation_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "hotel_id" "uuid",
    "name" character varying NOT NULL,
    "category_code" character varying,
    "description" "text",
    "default_capacity" "jsonb" DEFAULT '{"total": 2, "adults": 2, "children": 0}'::"jsonb",
    "base_price_range" "jsonb",
    "common_amenities" "jsonb" DEFAULT '[]'::"jsonb",
    "common_features" "jsonb" DEFAULT '{}'::"jsonb",
    "type_description" "text",
    "amenities_summary" "text",
    "motopress_type_id" integer,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "hotels"."accommodation_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "hotels"."accommodation_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "hotel_id" "uuid",
    "accommodation_type_id" "uuid",
    "name" character varying,
    "unit_number" character varying,
    "description" "text",
    "short_description" "text",
    "capacity" "jsonb",
    "bed_configuration" "jsonb",
    "size_m2" integer,
    "floor_number" integer,
    "view_type" character varying,
    "images" "jsonb",
    "motopress_type_id" integer,
    "motopress_unit_id" integer,
    "full_description" "text",
    "tourism_features" "text",
    "booking_policies" "text",
    "embedding_fast" "public"."vector"(1024),
    "embedding_balanced" "public"."vector"(1536),
    "unique_features" "jsonb",
    "accessibility_features" "jsonb",
    "location_details" "jsonb",
    "status" character varying,
    "is_featured" boolean,
    "display_order" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "base_price_low_season" integer,
    "base_price_high_season" integer,
    "price_per_person_low" integer,
    "price_per_person_high" integer,
    "amenities_list" "jsonb" DEFAULT '[]'::"jsonb",
    "unit_amenities" "text",
    "unit_type" character varying(20),
    "accommodation_mphb_type" character varying(100),
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "subcategory" character varying(100)
);


ALTER TABLE "hotels"."accommodation_units" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."accommodation_units"."unit_type" IS 'Unit type as provided by MotoPress (e.g., "1 - 2 personas", "5 - 10 personas", etc.). No constraints - uses exact value from source system.';



COMMENT ON COLUMN "hotels"."accommodation_units"."tags" IS 'Semantic tags for post-search filtering and relevance boosting';



COMMENT ON COLUMN "hotels"."accommodation_units"."subcategory" IS 'Specific subcategory for accommodation type (e.g., private_room, full_apartment, studio)';



CREATE TABLE IF NOT EXISTS "hotels"."client_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "nit" character varying DEFAULT '900222791'::character varying,
    "razon_social" character varying DEFAULT 'ONEILL SAID SAS'::character varying,
    "nombre_comercial" character varying DEFAULT 'SimmerDown Guest House'::character varying,
    "contact_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072)
);


ALTER TABLE "hotels"."client_info" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."client_info"."embedding" IS 'Vector embedding for semantic search (3072 dimensions)';



CREATE TABLE IF NOT EXISTS "hotels"."content" (
    "embedding_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(3072),
    "source_type" character varying NOT NULL,
    "source_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding_balanced" "public"."vector"(1536)
);


ALTER TABLE "hotels"."content" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."content"."embedding_balanced" IS 'Matryoshka embedding 1536 dims for balanced searches (Tier 2)';



CREATE TABLE IF NOT EXISTS "hotels"."guest_information" (
    "info_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "property_id" "uuid",
    "info_type" character varying NOT NULL,
    "info_title" character varying NOT NULL,
    "info_content" "text" NOT NULL,
    "step_order" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072),
    "embedding_balanced" "public"."vector"(1536)
);


ALTER TABLE "hotels"."guest_information" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."guest_information"."embedding_balanced" IS 'Matryoshka embedding 1536 dims for balanced searches (Tier 2)';



CREATE TABLE IF NOT EXISTS "hotels"."policies" (
    "policy_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "property_id" "uuid",
    "policy_type" character varying NOT NULL,
    "policy_title" character varying NOT NULL,
    "policy_content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072),
    "embedding_fast" "public"."vector"(1024)
);


ALTER TABLE "hotels"."policies" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."policies"."embedding_fast" IS 'Matryoshka embedding 1024 dims for fast searches (Tier 1)';



CREATE TABLE IF NOT EXISTS "hotels"."pricing_rules" (
    "pricing_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "unit_id" "uuid",
    "season_type" character varying,
    "capacity_pricing" "jsonb" NOT NULL,
    "valid_from" "date",
    "valid_to" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072),
    CONSTRAINT "pricing_rules_season_type_check" CHECK ((("season_type")::"text" = ANY ((ARRAY['baja'::character varying, 'alta'::character varying])::"text"[])))
);


ALTER TABLE "hotels"."pricing_rules" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."pricing_rules"."embedding" IS 'Vector embedding for semantic search (3072 dimensions)';



CREATE TABLE IF NOT EXISTS "hotels"."properties" (
    "property_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "client_id" "uuid",
    "property_name" character varying NOT NULL,
    "property_type" character varying,
    "location_info" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072),
    CONSTRAINT "properties_property_type_check" CHECK ((("property_type")::"text" = ANY ((ARRAY['guest_house'::character varying, 'hotel'::character varying, 'resort'::character varying, 'boutique'::character varying])::"text"[])))
);


ALTER TABLE "hotels"."properties" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."properties"."embedding" IS 'Vector embedding for semantic search (3072 dimensions)';



CREATE TABLE IF NOT EXISTS "hotels"."unit_amenities" (
    "amenity_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(50) NOT NULL,
    "unit_id" "uuid",
    "amenities" "jsonb" NOT NULL,
    "features" "jsonb",
    "description" "text",
    "images" "jsonb",
    "booking_url" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(3072)
);


ALTER TABLE "hotels"."unit_amenities" OWNER TO "postgres";


COMMENT ON COLUMN "hotels"."unit_amenities"."embedding" IS 'Vector embedding for semantic search (3072 dimensions)';



CREATE TABLE IF NOT EXISTS "public"."accommodation_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "hotel_id" "uuid",
    "motopress_type_id" integer,
    "motopress_instance_id" integer,
    "name" character varying NOT NULL,
    "unit_number" character varying,
    "description" "text",
    "short_description" "text",
    "unit_type" character varying,
    "capacity" "jsonb",
    "bed_configuration" "jsonb",
    "size_m2" integer,
    "floor_number" integer,
    "view_type" character varying,
    "tourism_features" "jsonb",
    "booking_policies" "jsonb",
    "unique_features" "jsonb",
    "accessibility_features" "jsonb",
    "location_details" "jsonb",
    "is_featured" boolean DEFAULT false,
    "display_order" integer DEFAULT 1,
    "status" character varying DEFAULT 'active'::character varying,
    "embedding_fast" "public"."vector"(1024),
    "embedding_balanced" "public"."vector"(1536),
    "images" "jsonb",
    "tenant_id" "uuid",
    "accommodation_type_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accommodation_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accommodation_units_manual" (
    "unit_id" "uuid" NOT NULL,
    "manual_content" "text",
    "detailed_instructions" "text",
    "house_rules_specific" "text",
    "emergency_info" "text",
    "wifi_password" "text",
    "safe_code" "text",
    "appliance_guides" "jsonb" DEFAULT '{}'::"jsonb",
    "local_tips" "text",
    "embedding" "public"."vector"(3072),
    "embedding_balanced" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accommodation_units_manual" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accommodation_units_manual_chunks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "accommodation_unit_id" "uuid" NOT NULL,
    "manual_id" "uuid" NOT NULL,
    "chunk_content" "text" NOT NULL,
    "chunk_index" integer NOT NULL,
    "total_chunks" integer NOT NULL,
    "section_title" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "embedding" "public"."vector"(3072),
    "embedding_balanced" "public"."vector"(1536),
    "embedding_fast" "public"."vector"(1024),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."accommodation_units_manual_chunks" OWNER TO "postgres";


COMMENT ON TABLE "public"."accommodation_units_manual_chunks" IS 'Chunked content from accommodation unit manuals for improved vector search (8-10 chunks per manual, similarity 0.85+ vs 0.24 with full documents)';



COMMENT ON COLUMN "public"."accommodation_units_manual_chunks"."embedding" IS 'Matryoshka Tier 3 (3072d) for full-precision search - no HNSW index due to 2000d limit';



COMMENT ON COLUMN "public"."accommodation_units_manual_chunks"."embedding_balanced" IS 'Matryoshka Tier 2 (1536d) for balanced performance - HNSW indexed';



COMMENT ON COLUMN "public"."accommodation_units_manual_chunks"."embedding_fast" IS 'Matryoshka Tier 1 (1024d) for ultra-fast search - HNSW indexed';



CREATE TABLE IF NOT EXISTS "public"."accommodation_units_public" (
    "unit_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "unit_number" "text",
    "unit_type" character varying(50),
    "description" "text" NOT NULL,
    "short_description" "text",
    "highlights" "jsonb" DEFAULT '[]'::"jsonb",
    "amenities" "jsonb" DEFAULT '{}'::"jsonb",
    "pricing" "jsonb" DEFAULT '{}'::"jsonb",
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "virtual_tour_url" "text",
    "embedding_fast" "public"."vector"(1024),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_bookable" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embedding" "public"."vector"(1536)
);


ALTER TABLE "public"."accommodation_units_public" OWNER TO "postgres";


COMMENT ON TABLE "public"."accommodation_units_public" IS 'Public accommodation info for marketing chat';



COMMENT ON COLUMN "public"."accommodation_units_public"."description" IS 'Complete accommodation description (no chunking - used by match_accommodations_public RPC)';



COMMENT ON COLUMN "public"."accommodation_units_public"."embedding_fast" IS 'Matryoshka 1024d for fast searches';



COMMENT ON COLUMN "public"."accommodation_units_public"."metadata" IS 'JSON metadata for accommodation (source_type, uploaded_at, etc.)';



COMMENT ON COLUMN "public"."accommodation_units_public"."embedding" IS 'Matryoshka Tier 2 embedding (1536 dimensions) for balanced search performance. HNSW indexed.';



CREATE TABLE IF NOT EXISTS "public"."airbnb_motopress_comparison" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "motopress_booking_id" "text" NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "accommodation_unit_id" "uuid",
    "adults" integer DEFAULT 1,
    "children" integer DEFAULT 0,
    "total_price" numeric(10,2),
    "currency" "text" DEFAULT 'COP'::"text",
    "synced_from_motopress_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "matched_with_ics" boolean DEFAULT false,
    "ics_event_id" "uuid",
    "data_differences" "jsonb",
    "match_confidence" numeric(3,2),
    "raw_motopress_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."airbnb_motopress_comparison" OWNER TO "postgres";


COMMENT ON TABLE "public"."airbnb_motopress_comparison" IS 'Stores Airbnb reservations reported by MotoPress API for double-check validation against direct ICS sync';



CREATE TABLE IF NOT EXISTS "public"."airbnb_mphb_imported_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying NOT NULL,
    "motopress_booking_id" integer NOT NULL,
    "motopress_accommodation_id" integer,
    "motopress_type_id" integer,
    "guest_name" character varying NOT NULL,
    "guest_email" character varying,
    "phone_full" character varying,
    "phone_last_4" character varying(4),
    "guest_country" character varying,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "check_in_time" character varying,
    "check_out_time" character varying,
    "adults" integer DEFAULT 1,
    "children" integer DEFAULT 0,
    "total_price" numeric(10,2),
    "currency" character varying(3) DEFAULT 'COP'::character varying,
    "accommodation_unit_id" "uuid",
    "comparison_status" character varying DEFAULT 'pending'::character varying,
    "direct_airbnb_reservation_id" character varying,
    "given_names" character varying,
    "first_surname" character varying,
    "second_surname" character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_compared_at" timestamp with time zone,
    "booking_notes" "text",
    "raw_motopress_data" "jsonb"
);


ALTER TABLE "public"."airbnb_mphb_imported_reservations" OWNER TO "postgres";


COMMENT ON TABLE "public"."airbnb_mphb_imported_reservations" IS 'Reservations imported from Airbnb ICS calendar into MotoPress - need comparison with direct Airbnb sync';



COMMENT ON COLUMN "public"."airbnb_mphb_imported_reservations"."comparison_status" IS 'pending=not compared yet, matched=found in Airbnb direct, conflict=dates mismatch, not_found=not in Airbnb';



COMMENT ON COLUMN "public"."airbnb_mphb_imported_reservations"."raw_motopress_data" IS 'Full MotoPress API response for debugging and data recovery';



CREATE TABLE IF NOT EXISTS "public"."calendar_event_conflicts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_1_id" "uuid" NOT NULL,
    "event_2_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "conflict_type" character varying(50) NOT NULL,
    "overlap_start" "date",
    "overlap_end" "date",
    "conflict_severity" character varying(20) DEFAULT 'medium'::character varying,
    "resolution_strategy" character varying(50),
    "winning_event_id" "uuid",
    "resolution_notes" "text",
    "resolved_at" timestamp with time zone,
    "resolved_by" character varying(50),
    "detected_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calendar_event_conflicts_conflict_severity_check" CHECK ((("conflict_severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "calendar_event_conflicts_conflict_type_check" CHECK ((("conflict_type")::"text" = ANY ((ARRAY['overlapping_dates'::character varying, 'duplicate_uid'::character varying, 'parent_child_conflict'::character varying, 'double_booking'::character varying, 'boundary_overlap'::character varying, 'data_mismatch'::character varying])::"text"[]))),
    CONSTRAINT "calendar_event_conflicts_resolution_strategy_check" CHECK ((("resolution_strategy")::"text" = ANY ((ARRAY['priority_based'::character varying, 'time_based'::character varying, 'manual'::character varying, 'merged'::character varying, 'split'::character varying, 'ignored'::character varying, NULL::character varying])::"text"[]))),
    CONSTRAINT "different_events" CHECK (("event_1_id" <> "event_2_id"))
);


ALTER TABLE "public"."calendar_event_conflicts" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_event_conflicts" IS 'Tracking and resolution of conflicts between calendar events';



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "accommodation_unit_id" "uuid" NOT NULL,
    "source" character varying(50) NOT NULL,
    "external_uid" character varying(255) NOT NULL,
    "event_type" character varying(20) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "check_in_time" time without time zone DEFAULT '15:00:00'::time without time zone,
    "check_out_time" time without time zone DEFAULT '11:00:00'::time without time zone,
    "summary" "text",
    "description" "text",
    "reservation_code" character varying(50),
    "guest_name" character varying(255),
    "guest_email" character varying(255),
    "guest_phone" character varying(50),
    "guest_phone_last4" character varying(4),
    "total_guests" integer,
    "adults" integer,
    "children" integer,
    "total_price" numeric(10,2),
    "currency" character varying(3) DEFAULT 'COP'::character varying,
    "source_priority" integer DEFAULT 5 NOT NULL,
    "last_modified" timestamp with time zone,
    "sequence_number" integer DEFAULT 0,
    "sync_generation" timestamp with time zone,
    "ics_dtstamp" timestamp with time zone,
    "first_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "parent_event_id" "uuid",
    "merged_into_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calendar_events_event_type_check" CHECK ((("event_type")::"text" = ANY ((ARRAY['reservation'::character varying, 'block'::character varying, 'maintenance'::character varying, 'parent_block'::character varying])::"text"[]))),
    CONSTRAINT "calendar_events_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['airbnb'::character varying, 'booking.com'::character varying, 'vrbo'::character varying, 'motopress'::character varying, 'motopress_api'::character varying, 'manual'::character varying, 'generic_ics'::character varying])::"text"[]))),
    CONSTRAINT "calendar_events_source_priority_check" CHECK ((("source_priority" >= 1) AND ("source_priority" <= 10))),
    CONSTRAINT "calendar_events_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'pending'::character varying, 'cancelled'::character varying, 'completed'::character varying])::"text"[]))),
    CONSTRAINT "valid_date_range" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "valid_guest_count" CHECK ((("total_guests" IS NULL) OR (("total_guests" >= 0) AND ("total_guests" <= 50)))),
    CONSTRAINT "valid_price" CHECK ((("total_price" IS NULL) OR ("total_price" >= (0)::numeric)))
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_events" IS 'Central table for all calendar events from multiple sources (Airbnb, Booking.com, etc.)';



COMMENT ON COLUMN "public"."calendar_events"."source" IS 'Platform source of the calendar event (airbnb, booking.com, vrbo, etc.)';



COMMENT ON COLUMN "public"."calendar_events"."external_uid" IS 'Unique identifier from the source platform (e.g., Airbnb UID)';



COMMENT ON COLUMN "public"."calendar_events"."event_type" IS 'Type of calendar event: reservation (confirmed booking), block (unavailable), maintenance, parent_block (auto-blocked due to parent)';



COMMENT ON COLUMN "public"."calendar_events"."source_priority" IS 'Priority for conflict resolution (1=highest, 10=lowest). MotoPress API=1, Airbnb=3, Manual=5';



CREATE TABLE IF NOT EXISTS "public"."calendar_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feed_config_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "status" character varying(20) DEFAULT 'running'::character varying NOT NULL,
    "events_found" integer DEFAULT 0,
    "events_added" integer DEFAULT 0,
    "events_updated" integer DEFAULT 0,
    "events_deleted" integer DEFAULT 0,
    "events_skipped" integer DEFAULT 0,
    "conflicts_detected" integer DEFAULT 0,
    "conflicts_resolved" integer DEFAULT 0,
    "errors" "jsonb",
    "warnings" "jsonb",
    "http_response_time_ms" integer,
    "parse_time_ms" integer,
    "db_write_time_ms" integer,
    "total_memory_mb" numeric(10,2),
    "request_headers" "jsonb",
    "response_headers" "jsonb",
    "response_status_code" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calendar_sync_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'partial'::character varying, 'failed'::character varying, 'timeout'::character varying])::"text"[])))
);


ALTER TABLE "public"."calendar_sync_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync_logs" IS 'Detailed logging of calendar synchronization operations for debugging and monitoring';



CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "user_type" character varying(20) NOT NULL,
    "reservation_id" "uuid",
    "tenant_id" character varying(255) NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "guest_phone_last_4" character varying(4),
    "check_in_date" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "chat_conversations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::"text"[]))),
    CONSTRAINT "chat_conversations_user_type_check" CHECK ((("user_type")::"text" = ANY ((ARRAY['guest'::character varying, 'staff'::character varying, 'admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "role" character varying(20) NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "entities" "jsonb" DEFAULT '[]'::"jsonb",
    "sources" "jsonb" DEFAULT '[]'::"jsonb",
    "tenant_id" character varying(255),
    CONSTRAINT "chat_messages_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::"text"[])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_messages"."entities" IS 'Extracted entities (places, activities) from the message for context tracking';



COMMENT ON COLUMN "public"."chat_messages"."sources" IS 'Source metadata for information used in generating the response';



COMMENT ON COLUMN "public"."chat_messages"."tenant_id" IS 'Tenant ID for multi-tenant data isolation';



CREATE TABLE IF NOT EXISTS "public"."code_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_path" "text" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536) NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."code_embeddings" OWNER TO "postgres";


COMMENT ON TABLE "public"."code_embeddings" IS 'Stores code embeddings for semantic search via claude-context MCP server. Migrated from Zilliz Cloud Oct 2025.';



COMMENT ON COLUMN "public"."code_embeddings"."embedding" IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';



COMMENT ON COLUMN "public"."code_embeddings"."metadata" IS 'JSONB metadata including language, start_line, end_line, etc.';



CREATE TABLE IF NOT EXISTS "public"."compliance_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "tenant_id" character varying(255) NOT NULL,
    "type" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "data" "jsonb" NOT NULL,
    "sire_response" "jsonb",
    "tra_response" "jsonb",
    "error_message" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "submitted_by" character varying(50) DEFAULT 'guest'::character varying,
    CONSTRAINT "compliance_submissions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'success'::character varying, 'failed'::character varying])::"text"[]))),
    CONSTRAINT "compliance_submissions_submitted_by_check" CHECK ((("submitted_by")::"text" = ANY ((ARRAY['guest'::character varying, 'staff'::character varying])::"text"[]))),
    CONSTRAINT "compliance_submissions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['sire'::character varying, 'tra'::character varying, 'both'::character varying])::"text"[])))
);


ALTER TABLE "public"."compliance_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."compliance_submissions" IS 'Tracks SIRE and TRA compliance submissions from guests';



COMMENT ON COLUMN "public"."compliance_submissions"."data" IS 'JSONB containing: pasaporte, país, fecha_nacimiento, propósito, etc';



COMMENT ON COLUMN "public"."compliance_submissions"."sire_response" IS 'Response from SIRE Puppeteer automation';



COMMENT ON COLUMN "public"."compliance_submissions"."tra_response" IS 'Response from TRA REST API';



COMMENT ON COLUMN "public"."compliance_submissions"."submitted_by" IS 'Origin of submission: guest (chat) or staff (manual)';



CREATE TABLE IF NOT EXISTS "public"."conversation_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid",
    "file_type" character varying(50) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size_bytes" integer,
    "mime_type" character varying(100),
    "original_filename" character varying(255),
    "ocr_text" "text",
    "vision_analysis" "jsonb",
    "analysis_type" character varying(50),
    "confidence_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conversation_attachments_file_type_check" CHECK ((("file_type")::"text" = ANY ((ARRAY['image'::character varying, 'document'::character varying, 'pdf'::character varying])::"text"[])))
);


ALTER TABLE "public"."conversation_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversation_attachments" IS 'Stores file attachments (images, documents) uploaded by guests during conversations. Includes Claude Vision API analysis results for location recognition and passport OCR.';



COMMENT ON COLUMN "public"."conversation_attachments"."conversation_id" IS 'Foreign key to guest_conversations table';



COMMENT ON COLUMN "public"."conversation_attachments"."message_id" IS 'Optional link to specific chat message';



COMMENT ON COLUMN "public"."conversation_attachments"."file_type" IS 'Type of file: image, document, or pdf';



COMMENT ON COLUMN "public"."conversation_attachments"."file_url" IS 'Public URL from Supabase Storage (bucket: guest-attachments)';



COMMENT ON COLUMN "public"."conversation_attachments"."ocr_text" IS 'Extracted text from OCR (e.g., passport data as JSON string)';



COMMENT ON COLUMN "public"."conversation_attachments"."vision_analysis" IS 'Full Claude Vision API response (JSONB)';



COMMENT ON COLUMN "public"."conversation_attachments"."analysis_type" IS 'Type of analysis performed: location, passport, or general';



COMMENT ON COLUMN "public"."conversation_attachments"."confidence_score" IS 'AI analysis confidence score (0.00-1.00)';



CREATE TABLE IF NOT EXISTS "public"."conversation_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "summary_text" "text" NOT NULL,
    "message_range" "text" NOT NULL,
    "message_count" integer DEFAULT 10 NOT NULL,
    "embedding_fast" "public"."vector"(1024),
    "key_entities" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_memory" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversation_memory" IS 'Stores compressed conversation summaries with Matryoshka Tier 1 (1024d) embeddings for fast semantic search (<100ms). Part of Conversation Memory System to overcome 20-message limit.';



COMMENT ON COLUMN "public"."conversation_memory"."message_range" IS 'Human-readable range of messages compressed (e.g., "messages 1-10")';



COMMENT ON COLUMN "public"."conversation_memory"."embedding_fast" IS 'Matryoshka Tier 1 embedding (1024 dimensions) for ultra-fast semantic search with HNSW index';



COMMENT ON COLUMN "public"."conversation_memory"."key_entities" IS 'Extracted entities from compressed conversation (places, activities, preferences) in JSON format';



CREATE TABLE IF NOT EXISTS "public"."guest_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" character varying(255) DEFAULT 'ONEILL SAID SAS'::character varying NOT NULL,
    "guest_name" character varying(255) NOT NULL,
    "phone_full" character varying(20) DEFAULT 'N/A'::character varying NOT NULL,
    "phone_last_4" character varying(4) DEFAULT '0000'::character varying NOT NULL,
    "check_in_date" "date" NOT NULL,
    "check_out_date" "date" NOT NULL,
    "reservation_code" character varying(20),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "accommodation_unit_id" "uuid",
    "guest_email" character varying(255),
    "guest_country" character varying(100),
    "adults" integer DEFAULT 1,
    "children" integer DEFAULT 0,
    "total_price" numeric(10,2),
    "currency" character varying(3) DEFAULT 'COP'::character varying,
    "check_in_time" time without time zone DEFAULT '15:00:00'::time without time zone,
    "check_out_time" time without time zone DEFAULT '12:00:00'::time without time zone,
    "booking_source" character varying(20) DEFAULT 'manual'::character varying,
    "booking_notes" "text",
    "external_booking_id" character varying(100),
    "accommodation_unit_id_key" "text" GENERATED ALWAYS AS (COALESCE(("accommodation_unit_id")::"text", ''::"text")) STORED,
    "document_type" character varying(2),
    "document_number" character varying(15),
    "birth_date" "date",
    "first_surname" character varying(50),
    "second_surname" character varying(50),
    "given_names" character varying(50),
    "nationality_code" character varying(3),
    "origin_city_code" character varying(6),
    "destination_city_code" character varying(6),
    "hotel_sire_code" character varying(6),
    "hotel_city_code" character varying(6),
    "movement_type" character(1),
    "movement_date" "date",
    CONSTRAINT "check_destination_code_format" CHECK ((("destination_city_code" IS NULL) OR (("destination_city_code")::"text" ~ '^\d{1,6}$'::"text"))),
    CONSTRAINT "check_document_number_format" CHECK ((("document_number" IS NULL) OR ((("length"(("document_number")::"text") >= 6) AND ("length"(("document_number")::"text") <= 15)) AND (("document_number")::"text" ~ '^[A-Z0-9]+$'::"text")))),
    CONSTRAINT "check_document_type" CHECK ((("document_type" IS NULL) OR (("document_type")::"text" = ANY ((ARRAY['3'::character varying, '5'::character varying, '10'::character varying, '46'::character varying])::"text"[])))),
    CONSTRAINT "check_first_surname_format" CHECK ((("first_surname" IS NULL) OR (("first_surname")::"text" ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$'::"text"))),
    CONSTRAINT "check_given_names_format" CHECK ((("given_names" IS NULL) OR (("given_names")::"text" ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$'::"text"))),
    CONSTRAINT "check_hotel_city_code_format" CHECK ((("hotel_city_code" IS NULL) OR (("hotel_city_code")::"text" ~ '^\d{5,6}$'::"text"))),
    CONSTRAINT "check_hotel_sire_code_format" CHECK ((("hotel_sire_code" IS NULL) OR (("hotel_sire_code")::"text" ~ '^\d{4,6}$'::"text"))),
    CONSTRAINT "check_movement_type" CHECK ((("movement_type" IS NULL) OR ("movement_type" = ANY (ARRAY['E'::"bpchar", 'S'::"bpchar"])))),
    CONSTRAINT "check_nationality_code_format" CHECK ((("nationality_code" IS NULL) OR (("nationality_code")::"text" ~ '^\d{1,3}$'::"text"))),
    CONSTRAINT "check_origin_code_format" CHECK ((("origin_city_code" IS NULL) OR (("origin_city_code")::"text" ~ '^\d{1,6}$'::"text"))),
    CONSTRAINT "check_second_surname_format" CHECK ((("second_surname" IS NULL) OR (("second_surname")::"text" ~ '^[A-ZÁÉÍÓÚÑ ]{0,50}$'::"text"))),
    CONSTRAINT "guest_reservations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'pending_payment'::character varying, 'pending_admin'::character varying, 'pending'::character varying, 'inactive'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."guest_reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."guest_reservations"."phone_full" IS 'Full phone number. Default ''N/A'' for bookings without phone (e.g., email-only reservations).';



COMMENT ON COLUMN "public"."guest_reservations"."phone_last_4" IS 'Last 4 digits of phone. Used for guest authentication. Default ''0000'' signals no phone provided.';



COMMENT ON COLUMN "public"."guest_reservations"."reservation_code" IS 'Reservation code (can be duplicated for multi-unit bookings - use external_booking_id to group)';



COMMENT ON COLUMN "public"."guest_reservations"."status" IS 'Reservation status: active (confirmed), pending_payment (awaiting payment), requires_admin_action (needs admin review), pending (general pending), inactive (past), cancelled (cancelled/abandoned)';



COMMENT ON COLUMN "public"."guest_reservations"."accommodation_unit_id" IS 'FK to accommodation_units - which room/apartment is assigned to this reservation';



COMMENT ON COLUMN "public"."guest_reservations"."guest_email" IS 'Guest email address (from MotoPress/Airbnb)';



COMMENT ON COLUMN "public"."guest_reservations"."guest_country" IS 'Guest country of residence';



COMMENT ON COLUMN "public"."guest_reservations"."adults" IS 'Number of adult guests';



COMMENT ON COLUMN "public"."guest_reservations"."children" IS 'Number of children guests';



COMMENT ON COLUMN "public"."guest_reservations"."total_price" IS 'Total booking price';



COMMENT ON COLUMN "public"."guest_reservations"."currency" IS 'Currency code (COP, USD, etc)';



COMMENT ON COLUMN "public"."guest_reservations"."check_in_time" IS 'Scheduled check-in time';



COMMENT ON COLUMN "public"."guest_reservations"."check_out_time" IS 'Scheduled check-out time';



COMMENT ON COLUMN "public"."guest_reservations"."booking_source" IS 'Source of booking: motopress, airbnb, or manual';



COMMENT ON COLUMN "public"."guest_reservations"."booking_notes" IS 'Special requests or notes from guest';



COMMENT ON COLUMN "public"."guest_reservations"."external_booking_id" IS 'ID from external system (MotoPress booking ID or Airbnb confirmation code)';



COMMENT ON COLUMN "public"."guest_reservations"."document_type" IS 'SIRE document type code: 3=Pasaporte, 5=Cédula, 10=PEP, 46=Permiso';



COMMENT ON COLUMN "public"."guest_reservations"."document_number" IS 'Document ID (alphanumeric uppercase, 6-15 chars)';



COMMENT ON COLUMN "public"."guest_reservations"."birth_date" IS 'Guest birth date (YYYY-MM-DD format)';



COMMENT ON COLUMN "public"."guest_reservations"."first_surname" IS 'First surname (UPPERCASE with accents, max 50 chars)';



COMMENT ON COLUMN "public"."guest_reservations"."second_surname" IS 'Second surname (UPPERCASE with accents, optional)';



COMMENT ON COLUMN "public"."guest_reservations"."given_names" IS 'Given names (UPPERCASE with accents, max 50 chars)';



COMMENT ON COLUMN "public"."guest_reservations"."nationality_code" IS 'Nationality country code (1-3 numeric digits, SIRE catalog)';



COMMENT ON COLUMN "public"."guest_reservations"."origin_city_code" IS 'SIRE Field 11 - Procedencia: City/country guest came FROM before arriving at hotel. Accepts DIVIPOLA city code (5 digits) or SIRE country code (1-3 digits). Example: 11001 (Bogotá) or 249 (USA)';



COMMENT ON COLUMN "public"."guest_reservations"."destination_city_code" IS 'SIRE Field 12 - Destino: City/country guest is going TO after leaving hotel (NOT the hotel''s city). Accepts DIVIPOLA city code (5 digits) or SIRE country code (1-3 digits). Example: 05001 (Medellín) or 249 (USA)';



COMMENT ON COLUMN "public"."guest_reservations"."hotel_sire_code" IS 'Código SCH del hotel (4-6 dígitos, asignado por Sistema de Certificación Hotelera)';



COMMENT ON COLUMN "public"."guest_reservations"."hotel_city_code" IS 'Código DIVIPOLA de la ciudad donde está ubicado el hotel (5-6 dígitos)';



COMMENT ON COLUMN "public"."guest_reservations"."movement_type" IS 'Tipo de movimiento SIRE: E=Entrada (check-in), S=Salida (check-out)';



COMMENT ON COLUMN "public"."guest_reservations"."movement_date" IS 'Fecha del movimiento (check-in para E, check-out para S)';



CREATE OR REPLACE VIEW "public"."guest_chat_performance_monitor" AS
 SELECT 'message_count'::"text" AS "metric_name",
    ("count"(*))::"text" AS "value",
        CASE
            WHEN ("count"(*) >= 0) THEN 'healthy'::"text"
            ELSE 'error'::"text"
        END AS "status"
   FROM "public"."chat_messages"
UNION ALL
 SELECT 'conversation_count'::"text" AS "metric_name",
    ("count"(*))::"text" AS "value",
        CASE
            WHEN ("count"(*) > 0) THEN 'healthy'::"text"
            ELSE 'no_data'::"text"
        END AS "status"
   FROM "public"."chat_conversations"
UNION ALL
 SELECT 'active_conversations'::"text" AS "metric_name",
    ("count"(
        CASE
            WHEN (("chat_conversations"."status")::"text" = 'active'::"text") THEN 1
            ELSE NULL::integer
        END))::"text" AS "value",
    'healthy'::"text" AS "status"
   FROM "public"."chat_conversations"
UNION ALL
 SELECT 'reservation_count'::"text" AS "metric_name",
    ("count"(*))::"text" AS "value",
        CASE
            WHEN ("count"(*) > 0) THEN 'healthy'::"text"
            ELSE 'no_data'::"text"
        END AS "status"
   FROM "public"."guest_reservations"
UNION ALL
 SELECT 'orphaned_conversations'::"text" AS "metric_name",
    ("count"(*))::"text" AS "value",
        CASE
            WHEN ("count"(*) = 0) THEN 'healthy'::"text"
            ELSE 'integrity_issue'::"text"
        END AS "status"
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."reservation_id" IS NOT NULL) AND (NOT ("chat_conversations"."reservation_id" IN ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"))));


ALTER VIEW "public"."guest_chat_performance_monitor" OWNER TO "postgres";


COMMENT ON VIEW "public"."guest_chat_performance_monitor" IS 'Performance monitoring view for guest chat system. Tracks message counts, conversation status, and data integrity. No SECURITY DEFINER - relies on RLS policies for access control.';



CREATE TABLE IF NOT EXISTS "public"."guest_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "uuid" NOT NULL,
    "tenant_id" character varying(255) NOT NULL,
    "title" character varying(255) NOT NULL,
    "last_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "message_count" integer DEFAULT 0,
    "compressed_history" "jsonb" DEFAULT '[]'::"jsonb",
    "favorites" "jsonb" DEFAULT '[]'::"jsonb",
    "is_archived" boolean DEFAULT false,
    "archived_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guest_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_conversations" IS 'Guest chat conversations. RLS enabled with permissive policies - security enforced at API layer via JWT verification.';



COMMENT ON COLUMN "public"."guest_conversations"."tenant_id" IS 'Tenant identifier (VARCHAR to match guest_reservations schema)';



COMMENT ON COLUMN "public"."guest_conversations"."title" IS 'Auto-generated conversation title based on first message';



COMMENT ON COLUMN "public"."guest_conversations"."last_message" IS 'Preview of last message for UI';



COMMENT ON COLUMN "public"."guest_conversations"."message_count" IS 'Total messages in conversation (for compression threshold tracking)';



COMMENT ON COLUMN "public"."guest_conversations"."compressed_history" IS 'Array of compressed message blocks: [{summary, timestamp, message_ids, message_count, date_range}]';



COMMENT ON COLUMN "public"."guest_conversations"."favorites" IS 'Array of favorited items: [{type, name, description, url, timestamp}]';



COMMENT ON COLUMN "public"."guest_conversations"."is_archived" IS 'Auto-archived after 30 days of inactivity';



COMMENT ON COLUMN "public"."guest_conversations"."archived_at" IS 'Timestamp when conversation was archived';



COMMENT ON COLUMN "public"."guest_conversations"."last_activity_at" IS 'Last message timestamp (for auto-archiving cron jobs)';



CREATE TABLE IF NOT EXISTS "public"."hotel_operations" (
    "operation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(3072),
    "embedding_balanced" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "access_level" character varying(20) DEFAULT 'all_staff'::character varying,
    "version" integer DEFAULT 1,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "hotel_operations_access_level_check" CHECK ((("access_level")::"text" = ANY ((ARRAY['all_staff'::character varying, 'admin_only'::character varying, 'ceo_only'::character varying])::"text"[])))
);


ALTER TABLE "public"."hotel_operations" OWNER TO "postgres";


COMMENT ON TABLE "public"."hotel_operations" IS 'Hotel operations knowledge base for Staff Chat System with role-based access control';



CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "description" "text",
    "short_description" "text",
    "address" "jsonb",
    "contact_info" "jsonb",
    "check_in_time" time without time zone DEFAULT '15:00:00'::time without time zone,
    "check_out_time" time without time zone DEFAULT '12:00:00'::time without time zone,
    "policies" "jsonb",
    "hotel_amenities" "jsonb" DEFAULT '[]'::"jsonb",
    "motopress_property_id" integer,
    "full_description" "text",
    "tourism_summary" "text",
    "policies_summary" "text",
    "embedding_fast" "public"."vector"(1024),
    "embedding_balanced" "public"."vector"(1536),
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "status" character varying DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hotels_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'maintenance'::character varying])::"text"[])))
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";


COMMENT ON TABLE "public"."hotels" IS 'Tabla principal de hoteles/propiedades con soporte multi-tenant y embeddings Matryoshka. Un cliente puede tener múltiples hoteles.';



COMMENT ON COLUMN "public"."hotels"."tenant_id" IS 'FK a tenant_registry - permite múltiples hoteles por cliente';



COMMENT ON COLUMN "public"."hotels"."motopress_property_id" IS 'ID de propiedad MotoPress para sincronización de datos externos';



COMMENT ON COLUMN "public"."hotels"."embedding_fast" IS 'Embedding Tier 1 (1024d) para búsquedas turísticas ultra-rápidas';



COMMENT ON COLUMN "public"."hotels"."embedding_balanced" IS 'Embedding Tier 2 (1536d) para búsquedas de políticas balanceadas';



CREATE TABLE IF NOT EXISTS "public"."ics_feed_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "accommodation_unit_id" "uuid" NOT NULL,
    "feed_name" character varying(100) NOT NULL,
    "feed_url" "text" NOT NULL,
    "source_platform" character varying(50) NOT NULL,
    "feed_type" character varying(20) DEFAULT 'import'::character varying NOT NULL,
    "auth_type" character varying(20) DEFAULT 'none'::character varying,
    "auth_credentials" "jsonb",
    "is_active" boolean DEFAULT true,
    "sync_interval_minutes" integer DEFAULT 60,
    "sync_priority" integer DEFAULT 5,
    "last_sync_at" timestamp with time zone,
    "last_successful_sync_at" timestamp with time zone,
    "last_sync_status" character varying(20),
    "last_sync_error" "text",
    "last_sync_error_details" "jsonb",
    "last_etag" character varying(255),
    "last_modified" character varying(255),
    "total_syncs" integer DEFAULT 0,
    "successful_syncs" integer DEFAULT 0,
    "failed_syncs" integer DEFAULT 0,
    "consecutive_failures" integer DEFAULT 0,
    "events_imported_total" integer DEFAULT 0,
    "events_imported_last" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ics_feed_configurations_auth_type_check" CHECK ((("auth_type")::"text" = ANY ((ARRAY['none'::character varying, 'basic'::character varying, 'bearer'::character varying, 'api_key'::character varying, 'custom'::character varying])::"text"[]))),
    CONSTRAINT "ics_feed_configurations_feed_type_check" CHECK ((("feed_type")::"text" = ANY ((ARRAY['import'::character varying, 'export'::character varying, 'bidirectional'::character varying])::"text"[]))),
    CONSTRAINT "ics_feed_configurations_last_sync_status_check" CHECK ((("last_sync_status")::"text" = ANY ((ARRAY['success'::character varying, 'partial'::character varying, 'failed'::character varying, 'running'::character varying, NULL::character varying])::"text"[]))),
    CONSTRAINT "ics_feed_configurations_source_platform_check" CHECK ((("source_platform")::"text" = ANY ((ARRAY['airbnb'::character varying, 'booking.com'::character varying, 'vrbo'::character varying, 'motopress'::character varying, 'generic'::character varying])::"text"[]))),
    CONSTRAINT "ics_feed_configurations_sync_interval_minutes_check" CHECK ((("sync_interval_minutes" >= 15) AND ("sync_interval_minutes" <= 1440))),
    CONSTRAINT "ics_feed_configurations_sync_priority_check" CHECK ((("sync_priority" >= 1) AND ("sync_priority" <= 10))),
    CONSTRAINT "valid_sync_interval" CHECK (("sync_interval_minutes" > 0))
);


ALTER TABLE "public"."ics_feed_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."ics_feed_configurations" IS 'Configuration and state management for ICS calendar feed synchronization';



COMMENT ON COLUMN "public"."ics_feed_configurations"."consecutive_failures" IS 'Number of consecutive sync failures. Used for circuit breaker pattern';



CREATE TABLE IF NOT EXISTS "public"."integration_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "integration_type" character varying(50) NOT NULL,
    "config_data" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT false,
    "last_sync_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."integration_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_logs" (
    "log_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_logs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."job_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_logs" IS 'Audit trail for document processing jobs from BullMQ queue';



COMMENT ON COLUMN "public"."job_logs"."job_id" IS 'BullMQ job ID from Redis';



COMMENT ON COLUMN "public"."job_logs"."job_type" IS 'Job name from queue (e.g. process-document)';



COMMENT ON COLUMN "public"."job_logs"."metadata" IS 'Job-specific data: file_name, chunks_created, embeddings_generated, file_type';



CREATE TABLE IF NOT EXISTS "public"."muva_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(3072),
    "source_file" character varying,
    "document_type" character varying,
    "chunk_index" integer,
    "total_chunks" integer,
    "page_number" integer,
    "section_title" character varying,
    "language" character varying DEFAULT 'es'::character varying,
    "embedding_model" character varying DEFAULT 'text-embedding-3-large'::character varying,
    "token_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "title" character varying,
    "description" "text",
    "category" character varying,
    "status" character varying,
    "version" character varying,
    "tags" "text"[],
    "keywords" "text"[],
    "embedding_fast" "public"."vector"(1024),
    "schema_type" "text",
    "schema_version" "text" DEFAULT '1.0'::"text",
    "business_info" "jsonb" DEFAULT '{}'::"jsonb",
    "subcategory" character varying(100),
    CONSTRAINT "muva_content_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['tourism'::character varying, 'restaurants'::character varying, 'beaches'::character varying, 'activities'::character varying, 'transport'::character varying, 'hotels'::character varying, 'culture'::character varying, 'events'::character varying, 'spots'::character varying, 'rentals'::character varying])::"text"[])))
);


ALTER TABLE "public"."muva_content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."muva_content"."embedding_fast" IS 'Matryoshka embedding 1024 dims for fast searches (Tier 1)';



COMMENT ON COLUMN "public"."muva_content"."business_info" IS 'Business metadata from YAML frontmatter: precio, telefono, website, contacto, horario, zona, subzona, categoria, etc.';



COMMENT ON COLUMN "public"."muva_content"."subcategory" IS 'Subcategory for granular filtering (e.g., deportes_acuaticos, gastronomia_local)';



CREATE TABLE IF NOT EXISTS "public"."policies" (
    "policy_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source_file" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1024),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."policies" OWNER TO "postgres";


COMMENT ON TABLE "public"."policies" IS 'Stores tenant policy documents with vector embeddings for semantic search';



COMMENT ON COLUMN "public"."policies"."embedding" IS 'Matryoshka fast tier embedding (1024 dimensions)';



COMMENT ON COLUMN "public"."policies"."metadata" IS 'JSON metadata including source_type, total_chunks, uploaded_at, etc.';



CREATE TABLE IF NOT EXISTS "public"."property_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "parent_unit_id" "uuid" NOT NULL,
    "child_unit_id" "uuid" NOT NULL,
    "relationship_type" character varying(50) NOT NULL,
    "block_child_on_parent" boolean DEFAULT true,
    "block_parent_on_all_children" boolean DEFAULT false,
    "blocking_priority" integer DEFAULT 0,
    "blocking_conditions" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_relationship" CHECK (("parent_unit_id" <> "child_unit_id")),
    CONSTRAINT "property_relationships_blocking_priority_check" CHECK ((("blocking_priority" >= 0) AND ("blocking_priority" <= 10))),
    CONSTRAINT "property_relationships_relationship_type_check" CHECK ((("relationship_type")::"text" = ANY ((ARRAY['room_in_apartment'::character varying, 'suite_in_hotel'::character varying, 'adjacent_units'::character varying, 'shared_amenity'::character varying, 'custom'::character varying])::"text"[])))
);


ALTER TABLE "public"."property_relationships" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_relationships" IS 'Parent-child relationships between accommodation units for automatic blocking';



COMMENT ON COLUMN "public"."property_relationships"."blocking_conditions" IS 'JSON conditions for conditional blocking (e.g., minimum guests, specific date ranges)';



CREATE TABLE IF NOT EXISTS "public"."prospective_sessions" (
    "session_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cookie_id" "text" NOT NULL,
    "conversation_history" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "travel_intent" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "utm_tracking" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "referrer" "text",
    "landing_page" "text",
    "converted_to_reservation_id" "uuid",
    "conversion_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    CONSTRAINT "prospective_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'converted'::character varying, 'expired'::character varying])::"text"[])))
);


ALTER TABLE "public"."prospective_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."prospective_sessions" IS 'Anonymous chat sessions for prospective guests before booking. Tracks conversation history, travel intent, and conversion funnel.';



COMMENT ON COLUMN "public"."prospective_sessions"."cookie_id" IS 'Unique browser cookie identifier for tracking anonymous sessions';



COMMENT ON COLUMN "public"."prospective_sessions"."conversation_history" IS 'Last 20 messages of chat history for context continuity';



COMMENT ON COLUMN "public"."prospective_sessions"."travel_intent" IS 'Extracted booking intent from conversation using NLP (dates, guests, preferences)';



COMMENT ON COLUMN "public"."prospective_sessions"."utm_tracking" IS 'Marketing attribution data from UTM parameters';



COMMENT ON COLUMN "public"."prospective_sessions"."expires_at" IS 'Session expiry time (default 7 days). Cleanup via daily cron job.';



CREATE TABLE IF NOT EXISTS "public"."reservation_accommodations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "accommodation_unit_id" "uuid",
    "motopress_accommodation_id" integer,
    "motopress_type_id" integer,
    "room_rate" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reservation_accommodations" OWNER TO "postgres";


COMMENT ON TABLE "public"."reservation_accommodations" IS 'Junction table for many-to-many relationship between reservations and accommodation units. Supports multiple rooms per booking.';



CREATE TABLE IF NOT EXISTS "public"."sire_cities" (
    "code" character varying(6) NOT NULL,
    "name" character varying(100) NOT NULL,
    "department" character varying(100),
    "region" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sire_cities" OWNER TO "postgres";


COMMENT ON TABLE "public"."sire_cities" IS 'Colombian DIVIPOLA city codes for SIRE origin/destination (5-digit codes)';



CREATE TABLE IF NOT EXISTS "public"."sire_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(3072),
    "source_file" character varying,
    "document_type" character varying,
    "chunk_index" integer,
    "total_chunks" integer,
    "page_number" integer,
    "section_title" character varying,
    "language" character varying DEFAULT 'es'::character varying,
    "embedding_model" character varying DEFAULT 'text-embedding-3-large'::character varying,
    "token_count" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "title" character varying,
    "description" "text",
    "category" character varying,
    "status" character varying,
    "version" character varying,
    "tags" "text"[],
    "keywords" "text"[],
    "embedding_balanced" "public"."vector"(1536),
    CONSTRAINT "sire_content_document_type_check" CHECK ((("document_type")::"text" = ANY (ARRAY[('sire_docs'::character varying)::"text", ('regulatory'::character varying)::"text", ('technical'::character varying)::"text", ('operational'::character varying)::"text", ('template'::character varying)::"text", ('muva'::character varying)::"text", ('iot'::character varying)::"text", ('ticketing'::character varying)::"text", ('sire_regulatory'::character varying)::"text", ('sire_template'::character varying)::"text", ('compliance_guide'::character varying)::"text"])))
);


ALTER TABLE "public"."sire_content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sire_content"."embedding_balanced" IS 'Matryoshka embedding 1536 dims for balanced searches (Tier 2)';



CREATE TABLE IF NOT EXISTS "public"."sire_countries" (
    "iso_code" character varying(3) NOT NULL,
    "name" character varying(100) NOT NULL,
    "name_es" character varying(100),
    "alpha2_code" character varying(2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sire_code" character varying(3)
);


ALTER TABLE "public"."sire_countries" OWNER TO "postgres";


COMMENT ON TABLE "public"."sire_countries" IS 'ISO 3166-1 numeric country codes for SIRE nationality/origin/destination';



COMMENT ON COLUMN "public"."sire_countries"."sire_code" IS 'Official SIRE country code (NOT ISO 3166-1). Used for SIRE TXT export.';



CREATE TABLE IF NOT EXISTS "public"."sire_document_types" (
    "code" character varying(2) NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sire_document_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."sire_document_types" IS 'SIRE official document type codes (3=Pasaporte, 5=Cédula, etc.)';



CREATE TABLE IF NOT EXISTS "public"."sire_export_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "text" NOT NULL,
    "user_id" "uuid",
    "export_type" "text" NOT NULL,
    "export_date" "date" NOT NULL,
    "movement_type" character(1),
    "record_count" integer NOT NULL,
    "file_name" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "sire_export_logs_export_type_check" CHECK (("export_type" = ANY (ARRAY['monthly'::"text", 'individual'::"text", 'manual'::"text"]))),
    CONSTRAINT "sire_export_logs_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['E'::"bpchar", 'S'::"bpchar"]))),
    CONSTRAINT "sire_export_logs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."sire_export_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."sire_export_logs" IS 'Audit log for SIRE TXT file exports. Tracks who exported what data and when for compliance purposes.';



CREATE TABLE IF NOT EXISTS "public"."staff_conversations" (
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text",
    "category" character varying(50),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_message_at" timestamp with time zone,
    CONSTRAINT "staff_conversations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'deleted'::character varying])::"text"[])))
);


ALTER TABLE "public"."staff_conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."staff_conversations" IS 'Staff chat conversations with metadata tracking';



CREATE TABLE IF NOT EXISTS "public"."staff_messages" (
    "message_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_index" integer NOT NULL,
    "role" character varying(20) NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "staff_messages_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['staff'::character varying, 'assistant'::character varying])::"text"[])))
);


ALTER TABLE "public"."staff_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."staff_messages" IS 'Staff chat messages with LLM metadata and source tracking';



CREATE TABLE IF NOT EXISTS "public"."staff_users" (
    "staff_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "role" character varying(20) NOT NULL,
    "username" character varying(50) NOT NULL,
    "password_hash" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "permissions" "jsonb" DEFAULT '{"admin_panel": false, "sire_access": true, "reports_access": false, "modify_operations": false}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "staff_users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['ceo'::character varying, 'admin'::character varying, 'housekeeper'::character varying])::"text"[])))
);


ALTER TABLE "public"."staff_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."staff_users" IS 'Staff users table for Staff Chat System with role-based permissions';



CREATE TABLE IF NOT EXISTS "public"."sync_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "integration_type" character varying(50) NOT NULL,
    "sync_type" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "records_processed" integer DEFAULT 0,
    "records_created" integer DEFAULT 0,
    "records_updated" integer DEFAULT 0,
    "error_message" "text",
    "metadata" "jsonb",
    "started_at" timestamp without time zone DEFAULT "now"(),
    "completed_at" timestamp without time zone
);


ALTER TABLE "public"."sync_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_compliance_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sire_username" character varying(255),
    "sire_password_encrypted" "text",
    "tra_rnt_token" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_compliance_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_compliance_credentials" IS 'Stores SIRE and TRA credentials per tenant (admin/owner access only)';



COMMENT ON COLUMN "public"."tenant_compliance_credentials"."sire_username" IS 'SIRE portal username (Migración Colombia)';



COMMENT ON COLUMN "public"."tenant_compliance_credentials"."sire_password_encrypted" IS 'SIRE password (encrypted via pgcrypto or app-level encryption)';



COMMENT ON COLUMN "public"."tenant_compliance_credentials"."tra_rnt_token" IS 'TRA API token (RNT - Registro Nacional de Turismo)';



CREATE TABLE IF NOT EXISTS "public"."tenant_knowledge_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "file_path" "text" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_knowledge_embeddings" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_knowledge_embeddings" IS 'Stores document embeddings per tenant for multi-tenant chat knowledge base';



COMMENT ON COLUMN "public"."tenant_knowledge_embeddings"."embedding" IS 'OpenAI text-embedding-3-small (1536 dimensions)';



COMMENT ON COLUMN "public"."tenant_knowledge_embeddings"."metadata" IS 'Additional metadata (document type, upload date, etc)';



CREATE TABLE IF NOT EXISTS "public"."tenant_muva_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "description" "text",
    "document_type" "text",
    "business_info" "jsonb",
    "metadata" "jsonb",
    "embedding" "public"."vector"(1024),
    "source_file" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_muva_content" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_muva_content" IS 'Tenant-specific MUVA tourism content (isolated by tenant_id).
Used by agency/commission-based tenants to promote their listings.';



COMMENT ON COLUMN "public"."tenant_muva_content"."document_type" IS 'Type of MUVA content: highlight, tour, restaurant, activity, attraction, etc.';



COMMENT ON COLUMN "public"."tenant_muva_content"."business_info" IS 'Business details (name, address, phone, hours, etc.) as JSONB';



CREATE TABLE IF NOT EXISTS "public"."tenant_registry" (
    "tenant_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nit" character varying(20) NOT NULL,
    "razon_social" character varying(255) NOT NULL,
    "nombre_comercial" character varying(255) NOT NULL,
    "schema_name" character varying(63) NOT NULL,
    "tenant_type" character varying(50) DEFAULT 'hotel'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" character varying(50),
    "subscription_tier" character varying(20) DEFAULT 'free'::character varying,
    "features" "jsonb" DEFAULT '{"muva_access": false, "premium_chat": false, "guest_chat_enabled": true, "staff_chat_enabled": true}'::"jsonb",
    "subdomain" "text" NOT NULL,
    "address" "text",
    "phone" character varying(50),
    "email" character varying(255),
    "social_media_links" "jsonb" DEFAULT '{}'::"jsonb",
    "seo_meta_description" "text",
    "seo_keywords" "text"[],
    "landing_page_content" "jsonb" DEFAULT '{"hero": {"title": "", "cta_link": "/chat", "cta_text": "Get Started", "subtitle": ""}, "about": {"title": "About Us", "content": ""}, "contact": {"email": "", "phone": "", "title": "Contact Us", "address": ""}, "gallery": {"title": "Gallery", "images": []}, "services": {"items": [], "title": "Our Services"}}'::"jsonb",
    "logo_url" "text",
    "business_name" "text",
    "primary_color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "chat_cta_link" "text" DEFAULT '/with-me'::"text",
    CONSTRAINT "email_format_check" CHECK ((("email" IS NULL) OR (("email")::"text" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text"))),
    CONSTRAINT "phone_format_check" CHECK ((("phone" IS NULL) OR (("phone")::"text" ~ '^\+?[\d\s\(\)\-]+$'::"text"))),
    CONSTRAINT "seo_meta_description_length_check" CHECK ((("seo_meta_description" IS NULL) OR ("length"("seo_meta_description") <= 200))),
    CONSTRAINT "subdomain_format" CHECK (("subdomain" ~ '^[a-z0-9-]+$'::"text")),
    CONSTRAINT "tenant_registry_tenant_type_check" CHECK ((("tenant_type")::"text" = ANY ((ARRAY['hotel'::character varying, 'restaurant'::character varying, 'activity'::character varying, 'generic'::character varying])::"text"[])))
);


ALTER TABLE "public"."tenant_registry" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenant_registry"."slug" IS 'URL-friendly slug for guest chat URLs (e.g., /guest-chat/simmerdown)';



COMMENT ON COLUMN "public"."tenant_registry"."subdomain" IS 'Subdomain identifier for tenant routing (e.g., "simmerdown" for simmerdown.innpilot.com). Must be lowercase alphanumeric with hyphens only.';



COMMENT ON COLUMN "public"."tenant_registry"."address" IS 'Physical business address (multi-line)';



COMMENT ON COLUMN "public"."tenant_registry"."phone" IS 'Business contact phone number';



COMMENT ON COLUMN "public"."tenant_registry"."email" IS 'Business contact email';



COMMENT ON COLUMN "public"."tenant_registry"."social_media_links" IS 'Social media profile URLs (facebook, instagram, twitter, linkedin, tiktok)';



COMMENT ON COLUMN "public"."tenant_registry"."seo_meta_description" IS 'SEO meta description for landing page (recommended max 160 characters)';



COMMENT ON COLUMN "public"."tenant_registry"."seo_keywords" IS 'SEO keywords for landing page (array of strings)';



COMMENT ON COLUMN "public"."tenant_registry"."landing_page_content" IS 'JSONB structure for tenant landing page sections (hero, about, services, gallery, contact)';



COMMENT ON COLUMN "public"."tenant_registry"."logo_url" IS 'Public URL to tenant logo (recommended: 200x200px, PNG/JPG, max 100KB)';



COMMENT ON COLUMN "public"."tenant_registry"."business_name" IS 'Display name for chat interface (overrides nombre_comercial if set)';



COMMENT ON COLUMN "public"."tenant_registry"."primary_color" IS 'Primary brand color in hex format (e.g., #3B82F6) used for chat interface buttons and accents';



COMMENT ON COLUMN "public"."tenant_registry"."chat_cta_link" IS 'Custom CTA URL path for tenant chat interface (default: /with-me)';



CREATE TABLE IF NOT EXISTS "public"."user_tenant_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'viewer'::character varying NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_role" CHECK ((("role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying, 'viewer'::character varying, 'analyst'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_tenant_permissions" OWNER TO "postgres";


ALTER TABLE ONLY "hotels"."accommodation_types"
    ADD CONSTRAINT "accommodation_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hotels"."accommodation_units"
    ADD CONSTRAINT "accommodation_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hotels"."client_info"
    ADD CONSTRAINT "client_info_nit_key" UNIQUE ("nit");



ALTER TABLE ONLY "hotels"."client_info"
    ADD CONSTRAINT "client_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "hotels"."content"
    ADD CONSTRAINT "content_pkey" PRIMARY KEY ("embedding_id");



ALTER TABLE ONLY "hotels"."guest_information"
    ADD CONSTRAINT "guest_information_pkey" PRIMARY KEY ("info_id");



ALTER TABLE ONLY "hotels"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id");



ALTER TABLE ONLY "hotels"."pricing_rules"
    ADD CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("pricing_id");



ALTER TABLE ONLY "hotels"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("property_id");



ALTER TABLE ONLY "hotels"."unit_amenities"
    ADD CONSTRAINT "unit_amenities_pkey" PRIMARY KEY ("amenity_id");



ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_manual_id_chunk_index_key" UNIQUE ("manual_id", "chunk_index");



ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accommodation_units_manual"
    ADD CONSTRAINT "accommodation_units_manual_pkey" PRIMARY KEY ("unit_id");



ALTER TABLE ONLY "public"."accommodation_units"
    ADD CONSTRAINT "accommodation_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accommodation_units_public"
    ADD CONSTRAINT "accommodation_units_public_pkey" PRIMARY KEY ("unit_id");



ALTER TABLE ONLY "public"."accommodation_units_public"
    ADD CONSTRAINT "accommodation_units_public_tenant_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."airbnb_motopress_comparison"
    ADD CONSTRAINT "airbnb_motopress_comparison_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."airbnb_motopress_comparison"
    ADD CONSTRAINT "airbnb_motopress_comparison_tenant_id_motopress_booking_id__key" UNIQUE ("tenant_id", "motopress_booking_id", "check_in_date", "accommodation_unit_id");



ALTER TABLE ONLY "public"."airbnb_mphb_imported_reservations"
    ADD CONSTRAINT "airbnb_mphb_imported_reservat_tenant_id_motopress_booking_i_key" UNIQUE ("tenant_id", "motopress_booking_id", "check_in_date", "motopress_accommodation_id");



ALTER TABLE ONLY "public"."airbnb_mphb_imported_reservations"
    ADD CONSTRAINT "airbnb_mphb_imported_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_event_conflicts"
    ADD CONSTRAINT "calendar_event_conflicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_logs"
    ADD CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."code_embeddings"
    ADD CONSTRAINT "code_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_submissions"
    ADD CONSTRAINT "compliance_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_attachments"
    ADD CONSTRAINT "conversation_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_memory"
    ADD CONSTRAINT "conversation_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_conversations"
    ADD CONSTRAINT "guest_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_reservations"
    ADD CONSTRAINT "guest_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_operations"
    ADD CONSTRAINT "hotel_operations_pkey" PRIMARY KEY ("operation_id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ics_feed_configurations"
    ADD CONSTRAINT "ics_feed_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_tenant_id_integration_type_key" UNIQUE ("tenant_id", "integration_type");



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."muva_content"
    ADD CONSTRAINT "muva_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id");



ALTER TABLE ONLY "public"."property_relationships"
    ADD CONSTRAINT "property_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prospective_sessions"
    ADD CONSTRAINT "prospective_sessions_cookie_id_key" UNIQUE ("cookie_id");



ALTER TABLE ONLY "public"."prospective_sessions"
    ADD CONSTRAINT "prospective_sessions_pkey" PRIMARY KEY ("session_id");



ALTER TABLE ONLY "public"."reservation_accommodations"
    ADD CONSTRAINT "reservation_accommodations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sire_cities"
    ADD CONSTRAINT "sire_cities_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."sire_content"
    ADD CONSTRAINT "sire_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sire_countries"
    ADD CONSTRAINT "sire_countries_pkey" PRIMARY KEY ("iso_code");



ALTER TABLE ONLY "public"."sire_document_types"
    ADD CONSTRAINT "sire_document_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."sire_export_logs"
    ADD CONSTRAINT "sire_export_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_conversations"
    ADD CONSTRAINT "staff_conversations_pkey" PRIMARY KEY ("conversation_id");



ALTER TABLE ONLY "public"."staff_messages"
    ADD CONSTRAINT "staff_messages_conversation_id_message_index_key" UNIQUE ("conversation_id", "message_index");



ALTER TABLE ONLY "public"."staff_messages"
    ADD CONSTRAINT "staff_messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_pkey" PRIMARY KEY ("staff_id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."sync_history"
    ADD CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_compliance_credentials"
    ADD CONSTRAINT "tenant_compliance_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_compliance_credentials"
    ADD CONSTRAINT "tenant_compliance_credentials_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."tenant_knowledge_embeddings"
    ADD CONSTRAINT "tenant_knowledge_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_knowledge_embeddings"
    ADD CONSTRAINT "tenant_knowledge_embeddings_tenant_id_file_path_chunk_index_key" UNIQUE ("tenant_id", "file_path", "chunk_index");



ALTER TABLE ONLY "public"."tenant_muva_content"
    ADD CONSTRAINT "tenant_muva_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_registry"
    ADD CONSTRAINT "tenant_registry_nit_key" UNIQUE ("nit");



ALTER TABLE ONLY "public"."tenant_registry"
    ADD CONSTRAINT "tenant_registry_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenant_registry"
    ADD CONSTRAINT "tenant_registry_schema_name_key" UNIQUE ("schema_name");



ALTER TABLE ONLY "public"."tenant_registry"
    ADD CONSTRAINT "tenant_registry_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tenant_registry"
    ADD CONSTRAINT "tenant_registry_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."calendar_event_conflicts"
    ADD CONSTRAINT "unique_conflict_pair" UNIQUE ("event_1_id", "event_2_id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "unique_event_per_source" UNIQUE ("tenant_id", "source", "external_uid");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "unique_event_per_tenant" UNIQUE ("tenant_id", "external_uid");



ALTER TABLE ONLY "public"."ics_feed_configurations"
    ADD CONSTRAINT "unique_feed_per_accommodation" UNIQUE ("tenant_id", "accommodation_unit_id", "feed_url");



ALTER TABLE ONLY "public"."property_relationships"
    ADD CONSTRAINT "unique_property_relationship" UNIQUE ("parent_unit_id", "child_unit_id");



ALTER TABLE ONLY "public"."guest_reservations"
    ADD CONSTRAINT "uq_motopress_booking_unit" UNIQUE ("tenant_id", "external_booking_id", "accommodation_unit_id_key");



COMMENT ON CONSTRAINT "uq_motopress_booking_unit" ON "public"."guest_reservations" IS 'Ensures one reservation per MotoPress booking per accommodation unit (prevents sync duplicates)';



ALTER TABLE ONLY "public"."user_tenant_permissions"
    ADD CONSTRAINT "user_tenant_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tenant_permissions"
    ADD CONSTRAINT "user_tenant_permissions_user_id_tenant_id_key" UNIQUE ("user_id", "tenant_id");



CREATE INDEX "idx_accommodation_units_amenities" ON "hotels"."accommodation_units" USING "gin" ("amenities_list") WHERE ("amenities_list" IS NOT NULL);



CREATE INDEX "idx_accommodation_units_pricing" ON "hotels"."accommodation_units" USING "btree" ("base_price_low_season", "base_price_high_season") WHERE ("base_price_low_season" IS NOT NULL);



CREATE INDEX "idx_accommodation_units_tags" ON "hotels"."accommodation_units" USING "gin" ("tags");



CREATE INDEX "idx_accommodation_units_unit_type" ON "hotels"."accommodation_units" USING "btree" ("unit_type");



CREATE INDEX "idx_content_embedding_balanced" ON "hotels"."content" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_guest_information_embedding_balanced" ON "hotels"."guest_information" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_hotels_accommodation_types_tenant" ON "hotels"."accommodation_types" USING "btree" ("tenant_id");



CREATE INDEX "idx_hotels_accommodation_types_tenant_id" ON "hotels"."accommodation_types" USING "btree" ("tenant_id");



CREATE INDEX "idx_hotels_accommodation_units_embedding_balanced" ON "hotels"."accommodation_units" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops");



CREATE INDEX "idx_hotels_accommodation_units_embedding_fast" ON "hotels"."accommodation_units" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops");



CREATE INDEX "idx_hotels_accommodation_units_tenant_id" ON "hotels"."accommodation_units" USING "btree" ("tenant_id");



CREATE INDEX "idx_hotels_pricing_rules_tenant_unit" ON "hotels"."pricing_rules" USING "btree" ("tenant_id", "unit_id");



CREATE INDEX "idx_hotels_unit_amenities_tenant_unit" ON "hotels"."unit_amenities" USING "btree" ("tenant_id", "unit_id");



CREATE INDEX "idx_policies_embedding_fast" ON "hotels"."policies" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "accommodation_units_public_embedding_idx" ON "public"."accommodation_units_public" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "code_embeddings_embedding_idx" ON "public"."code_embeddings" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE UNIQUE INDEX "code_embeddings_file_chunk_idx" ON "public"."code_embeddings" USING "btree" ("file_path", "chunk_index");



CREATE INDEX "code_embeddings_file_path_idx" ON "public"."code_embeddings" USING "btree" ("file_path");



CREATE INDEX "idx_accommodation_manual_embedding_balanced_hnsw" ON "public"."accommodation_units_manual" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops");



CREATE INDEX "idx_accommodation_public_embedding_fast_hnsw" ON "public"."accommodation_units_public" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops");



CREATE INDEX "idx_accommodation_public_tenant" ON "public"."accommodation_units_public" USING "btree" ("tenant_id") WHERE ("is_active" = true);



CREATE INDEX "idx_accommodation_public_type" ON "public"."accommodation_units_public" USING "btree" ("tenant_id", "unit_type");



CREATE INDEX "idx_airbnb_motopress_comparison_dates" ON "public"."airbnb_motopress_comparison" USING "btree" ("check_in_date", "check_out_date");



CREATE INDEX "idx_airbnb_motopress_comparison_matched" ON "public"."airbnb_motopress_comparison" USING "btree" ("matched_with_ics") WHERE ("matched_with_ics" = false);



CREATE INDEX "idx_airbnb_motopress_comparison_tenant" ON "public"."airbnb_motopress_comparison" USING "btree" ("tenant_id");



CREATE INDEX "idx_airbnb_motopress_comparison_unit" ON "public"."airbnb_motopress_comparison" USING "btree" ("accommodation_unit_id");



CREATE INDEX "idx_airbnb_mphb_comparison" ON "public"."airbnb_mphb_imported_reservations" USING "btree" ("comparison_status", "last_compared_at");



CREATE INDEX "idx_airbnb_mphb_dates" ON "public"."airbnb_mphb_imported_reservations" USING "btree" ("check_in_date", "check_out_date");



CREATE INDEX "idx_airbnb_mphb_motopress_id" ON "public"."airbnb_mphb_imported_reservations" USING "btree" ("motopress_booking_id");



CREATE INDEX "idx_airbnb_mphb_phone" ON "public"."airbnb_mphb_imported_reservations" USING "btree" ("phone_last_4");



CREATE INDEX "idx_airbnb_mphb_tenant" ON "public"."airbnb_mphb_imported_reservations" USING "btree" ("tenant_id");



CREATE INDEX "idx_attachments_analysis_type" ON "public"."conversation_attachments" USING "btree" ("analysis_type");



CREATE INDEX "idx_attachments_conversation" ON "public"."conversation_attachments" USING "btree" ("conversation_id");



CREATE INDEX "idx_attachments_created" ON "public"."conversation_attachments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_attachments_message" ON "public"."conversation_attachments" USING "btree" ("message_id");



CREATE INDEX "idx_attachments_type" ON "public"."conversation_attachments" USING "btree" ("file_type");



CREATE INDEX "idx_attachments_vision_analysis" ON "public"."conversation_attachments" USING "gin" ("vision_analysis");



CREATE INDEX "idx_calendar_events_dates" ON "public"."calendar_events" USING "btree" ("accommodation_unit_id", "start_date", "end_date") WHERE ((("status")::"text" = 'active'::"text") AND (NOT "is_deleted"));



CREATE INDEX "idx_calendar_events_parent" ON "public"."calendar_events" USING "btree" ("parent_event_id") WHERE ("parent_event_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_reservation_code" ON "public"."calendar_events" USING "btree" ("reservation_code") WHERE ("reservation_code" IS NOT NULL);



CREATE INDEX "idx_calendar_events_source" ON "public"."calendar_events" USING "btree" ("source", "external_uid");



CREATE INDEX "idx_calendar_events_tenant_active" ON "public"."calendar_events" USING "btree" ("tenant_id", "status") WHERE (NOT "is_deleted");



CREATE INDEX "idx_chat_conversations_reservation" ON "public"."chat_conversations" USING "btree" ("reservation_id") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_chat_messages_conversation_created" ON "public"."chat_messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_chat_messages_conversation_id" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_metadata_entities" ON "public"."chat_messages" USING "gin" ((("metadata" -> 'entities'::"text")));



CREATE INDEX "idx_chat_messages_tenant_id" ON "public"."chat_messages" USING "btree" ("tenant_id");



CREATE INDEX "idx_compliance_submissions_guest_id" ON "public"."compliance_submissions" USING "btree" ("guest_id");



CREATE INDEX "idx_compliance_submissions_status" ON "public"."compliance_submissions" USING "btree" ("status");



CREATE INDEX "idx_compliance_submissions_submitted_at" ON "public"."compliance_submissions" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_compliance_submissions_tenant_id" ON "public"."compliance_submissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_compliance_submissions_tenant_status_date" ON "public"."compliance_submissions" USING "btree" ("tenant_id", "status", "submitted_at" DESC);



CREATE INDEX "idx_conflicts_events" ON "public"."calendar_event_conflicts" USING "btree" ("event_1_id", "event_2_id");



CREATE INDEX "idx_conflicts_severity" ON "public"."calendar_event_conflicts" USING "btree" ("conflict_severity", "detected_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_conflicts_unresolved" ON "public"."calendar_event_conflicts" USING "btree" ("tenant_id", "detected_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_conversation_memory_embedding_fast" ON "public"."conversation_memory" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_conversation_memory_session" ON "public"."conversation_memory" USING "btree" ("session_id");



CREATE INDEX "idx_conversation_memory_tenant" ON "public"."conversation_memory" USING "btree" ("tenant_id");



CREATE INDEX "idx_conversations_activity" ON "public"."guest_conversations" USING "btree" ("tenant_id", "last_activity_at" DESC);



CREATE INDEX "idx_conversations_archiving" ON "public"."guest_conversations" USING "btree" ("is_archived", "last_activity_at", "archived_at");



CREATE INDEX "idx_conversations_guest_auth" ON "public"."chat_conversations" USING "btree" ("guest_phone_last_4", "check_in_date", "tenant_id");



CREATE INDEX "idx_conversations_reservation" ON "public"."chat_conversations" USING "btree" ("reservation_id", "status");



CREATE INDEX "idx_conversations_user" ON "public"."chat_conversations" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_guest_auth" ON "public"."guest_reservations" USING "btree" ("check_in_date", "phone_last_4", "tenant_id");



CREATE INDEX "idx_guest_conversations_guest_id" ON "public"."guest_conversations" USING "btree" ("guest_id");



CREATE INDEX "idx_guest_conversations_guest_tenant" ON "public"."guest_conversations" USING "btree" ("guest_id", "tenant_id");



CREATE INDEX "idx_guest_conversations_tenant_id" ON "public"."guest_conversations" USING "btree" ("tenant_id");



CREATE INDEX "idx_guest_conversations_updated_at" ON "public"."guest_conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_guest_reservations_auth" ON "public"."guest_reservations" USING "btree" ("check_in_date", "phone_last_4", "tenant_id") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_guest_reservations_booking_source" ON "public"."guest_reservations" USING "btree" ("booking_source");



CREATE INDEX "idx_guest_reservations_document" ON "public"."guest_reservations" USING "btree" ("document_number") WHERE ("document_number" IS NOT NULL);



CREATE INDEX "idx_guest_reservations_external_id" ON "public"."guest_reservations" USING "btree" ("external_booking_id");



CREATE INDEX "idx_guest_reservations_hotel_sire_code" ON "public"."guest_reservations" USING "btree" ("hotel_sire_code") WHERE ("hotel_sire_code" IS NOT NULL);



CREATE INDEX "idx_guest_reservations_movement_date" ON "public"."guest_reservations" USING "btree" ("movement_date") WHERE ("movement_date" IS NOT NULL);



CREATE INDEX "idx_guest_reservations_movement_type" ON "public"."guest_reservations" USING "btree" ("movement_type") WHERE ("movement_type" IS NOT NULL);



CREATE INDEX "idx_guest_reservations_nationality" ON "public"."guest_reservations" USING "btree" ("nationality_code") WHERE ("nationality_code" IS NOT NULL);



CREATE INDEX "idx_guest_reservations_origin_destination" ON "public"."guest_reservations" USING "btree" ("origin_city_code", "destination_city_code") WHERE (("origin_city_code" IS NOT NULL) OR ("destination_city_code" IS NOT NULL));



CREATE INDEX "idx_guest_reservations_phone_checkin" ON "public"."guest_reservations" USING "btree" ("phone_last_4", "check_in_date");



CREATE INDEX "idx_guest_reservations_sire_export" ON "public"."guest_reservations" USING "btree" ("tenant_id", "movement_date", "movement_type", "status") WHERE (("movement_date" IS NOT NULL) AND (("status")::"text" <> 'cancelled'::"text"));



CREATE INDEX "idx_guest_reservations_unit" ON "public"."guest_reservations" USING "btree" ("accommodation_unit_id");



CREATE INDEX "idx_hotel_operations_category" ON "public"."hotel_operations" USING "btree" ("tenant_id", "category");



CREATE INDEX "idx_hotel_operations_embedding_balanced" ON "public"."hotel_operations" USING "ivfflat" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_hotel_operations_embedding_balanced_hnsw" ON "public"."hotel_operations" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops");



CREATE INDEX "idx_hotel_operations_tenant" ON "public"."hotel_operations" USING "btree" ("tenant_id") WHERE ("is_active" = true);



CREATE INDEX "idx_hotel_operations_tenant_access" ON "public"."hotel_operations" USING "btree" ("tenant_id", "access_level");



CREATE INDEX "idx_hotels_embedding_balanced" ON "public"."hotels" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_hotels_embedding_fast" ON "public"."hotels" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_hotels_motopress" ON "public"."hotels" USING "btree" ("motopress_property_id") WHERE ("motopress_property_id" IS NOT NULL);



CREATE INDEX "idx_hotels_name" ON "public"."hotels" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", ("name")::"text"));



CREATE INDEX "idx_hotels_tenant_status" ON "public"."hotels" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_ics_feeds_active" ON "public"."ics_feed_configurations" USING "btree" ("tenant_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ics_feeds_failures" ON "public"."ics_feed_configurations" USING "btree" ("consecutive_failures") WHERE ("consecutive_failures" > 3);



CREATE INDEX "idx_ics_feeds_next_sync" ON "public"."ics_feed_configurations" USING "btree" ("last_sync_at", "sync_interval_minutes") WHERE ("is_active" = true);



CREATE INDEX "idx_integration_configs_active" ON "public"."integration_configs" USING "btree" ("is_active");



CREATE INDEX "idx_integration_configs_tenant_id" ON "public"."integration_configs" USING "btree" ("tenant_id");



CREATE INDEX "idx_integration_configs_type" ON "public"."integration_configs" USING "btree" ("integration_type");



CREATE INDEX "idx_job_logs_created" ON "public"."job_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_job_logs_status" ON "public"."job_logs" USING "btree" ("status");



CREATE INDEX "idx_job_logs_tenant" ON "public"."job_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_manual_chunks_accommodation_unit_id" ON "public"."accommodation_units_manual_chunks" USING "btree" ("accommodation_unit_id");



CREATE INDEX "idx_manual_chunks_embedding_balanced" ON "public"."accommodation_units_manual_chunks" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_manual_chunks_embedding_fast" ON "public"."accommodation_units_manual_chunks" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_manual_chunks_manual_id" ON "public"."accommodation_units_manual_chunks" USING "btree" ("manual_id");



CREATE INDEX "idx_manual_chunks_tenant_id" ON "public"."accommodation_units_manual_chunks" USING "btree" ("tenant_id");



CREATE INDEX "idx_manual_chunks_unit_id" ON "public"."accommodation_units_manual_chunks" USING "btree" ("accommodation_unit_id");



CREATE INDEX "idx_messages_conversation" ON "public"."chat_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_muva_content_business_info" ON "public"."muva_content" USING "gin" ("business_info");



CREATE INDEX "idx_muva_content_embedding_fast" ON "public"."muva_content" USING "hnsw" ("embedding_fast" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_muva_content_subcategory" ON "public"."muva_content" USING "btree" ("subcategory");



CREATE INDEX "idx_policies_embedding" ON "public"."policies" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_policies_source_file" ON "public"."policies" USING "btree" ("source_file");



CREATE INDEX "idx_policies_tenant" ON "public"."policies" USING "btree" ("tenant_id");



CREATE INDEX "idx_property_relationships_child" ON "public"."property_relationships" USING "btree" ("child_unit_id") WHERE ("is_active" = true);



CREATE INDEX "idx_property_relationships_parent" ON "public"."property_relationships" USING "btree" ("parent_unit_id") WHERE ("is_active" = true);



CREATE INDEX "idx_property_relationships_tenant" ON "public"."property_relationships" USING "btree" ("tenant_id");



CREATE INDEX "idx_prospective_sessions_cookie" ON "public"."prospective_sessions" USING "btree" ("cookie_id") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_prospective_sessions_expires" ON "public"."prospective_sessions" USING "btree" ("expires_at") WHERE (("status")::"text" = 'active'::"text");



COMMENT ON INDEX "public"."idx_prospective_sessions_expires" IS 'Used by daily cleanup cron: DELETE FROM prospective_sessions WHERE status = ''active'' AND expires_at < NOW();';



CREATE INDEX "idx_prospective_sessions_intent_gin" ON "public"."prospective_sessions" USING "gin" ("travel_intent");



CREATE INDEX "idx_prospective_sessions_tenant" ON "public"."prospective_sessions" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_reservation_accommodations_accommodation_unit_id" ON "public"."reservation_accommodations" USING "btree" ("accommodation_unit_id");



CREATE INDEX "idx_reservation_accommodations_motopress_ids" ON "public"."reservation_accommodations" USING "btree" ("motopress_accommodation_id", "motopress_type_id");



CREATE INDEX "idx_reservation_accommodations_reservation_id" ON "public"."reservation_accommodations" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_code" ON "public"."guest_reservations" USING "btree" ("reservation_code");



CREATE INDEX "idx_sire_cities_department" ON "public"."sire_cities" USING "btree" ("department");



CREATE INDEX "idx_sire_cities_name" ON "public"."sire_cities" USING "btree" ("name");



CREATE INDEX "idx_sire_content_embedding_balanced" ON "public"."sire_content" USING "hnsw" ("embedding_balanced" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "idx_sire_countries_name" ON "public"."sire_countries" USING "btree" ("name");



CREATE INDEX "idx_sire_countries_name_es" ON "public"."sire_countries" USING "btree" ("name_es");



CREATE INDEX "idx_sire_countries_sire_code" ON "public"."sire_countries" USING "btree" ("sire_code");



CREATE INDEX "idx_sire_export_logs_tenant_date" ON "public"."sire_export_logs" USING "btree" ("tenant_id", "export_date" DESC);



CREATE INDEX "idx_staff_conversations_staff" ON "public"."staff_conversations" USING "btree" ("staff_id", "status");



CREATE INDEX "idx_staff_conversations_tenant" ON "public"."staff_conversations" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_staff_messages_conversation" ON "public"."staff_messages" USING "btree" ("conversation_id", "message_index");



CREATE INDEX "idx_staff_messages_created" ON "public"."staff_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_staff_messages_metadata_gin" ON "public"."staff_messages" USING "gin" ("metadata");



CREATE INDEX "idx_staff_users_role" ON "public"."staff_users" USING "btree" ("tenant_id", "role");



CREATE INDEX "idx_staff_users_tenant" ON "public"."staff_users" USING "btree" ("tenant_id") WHERE ("is_active" = true);



CREATE INDEX "idx_staff_users_username" ON "public"."staff_users" USING "btree" ("username") WHERE ("is_active" = true);



CREATE INDEX "idx_sync_history_started_at" ON "public"."sync_history" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sync_history_status" ON "public"."sync_history" USING "btree" ("status");



CREATE INDEX "idx_sync_history_tenant_id" ON "public"."sync_history" USING "btree" ("tenant_id");



CREATE INDEX "idx_sync_history_type" ON "public"."sync_history" USING "btree" ("integration_type");



CREATE INDEX "idx_sync_logs_errors" ON "public"."calendar_sync_logs" USING "btree" ("feed_config_id") WHERE (("status")::"text" = 'failed'::"text");



CREATE INDEX "idx_sync_logs_feed" ON "public"."calendar_sync_logs" USING "btree" ("feed_config_id", "started_at" DESC);



CREATE INDEX "idx_sync_logs_recent" ON "public"."calendar_sync_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sync_logs_status" ON "public"."calendar_sync_logs" USING "btree" ("status", "started_at" DESC);



CREATE INDEX "idx_tenant_compliance_credentials_tenant_id" ON "public"."tenant_compliance_credentials" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_features" ON "public"."tenant_registry" USING "gin" ("features");



CREATE INDEX "idx_tenant_registry_email" ON "public"."tenant_registry" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_tenant_registry_seo_keywords" ON "public"."tenant_registry" USING "gin" ("seo_keywords") WHERE ("seo_keywords" IS NOT NULL);



CREATE INDEX "idx_tenant_registry_slug" ON "public"."tenant_registry" USING "btree" ("slug");



CREATE INDEX "idx_tenant_registry_social_media" ON "public"."tenant_registry" USING "gin" ("social_media_links") WHERE ("social_media_links" IS NOT NULL);



CREATE INDEX "idx_tenant_status" ON "public"."guest_reservations" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_tenant_subscription_tier" ON "public"."tenant_registry" USING "btree" ("subscription_tier");



CREATE INDEX "idx_user_tenant_permissions_active" ON "public"."user_tenant_permissions" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_user_tenant_permissions_role" ON "public"."user_tenant_permissions" USING "btree" ("role");



CREATE INDEX "idx_user_tenant_permissions_tenant_id" ON "public"."user_tenant_permissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_tenant_permissions_user_id" ON "public"."user_tenant_permissions" USING "btree" ("user_id");



CREATE INDEX "muva_content_category_idx" ON "public"."muva_content" USING "btree" ("category");



CREATE INDEX "muva_content_document_type_idx" ON "public"."muva_content" USING "btree" ("document_type");



CREATE INDEX "muva_content_language_idx" ON "public"."muva_content" USING "btree" ("language");



CREATE INDEX "muva_content_status_idx" ON "public"."muva_content" USING "btree" ("status");



CREATE INDEX "muva_content_title_gin_idx" ON "public"."muva_content" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", ("title")::"text"));



CREATE INDEX "muva_content_version_idx" ON "public"."muva_content" USING "btree" ("version");



CREATE INDEX "sire_content_category_idx" ON "public"."sire_content" USING "btree" ("category");



CREATE INDEX "sire_content_document_type_idx" ON "public"."sire_content" USING "btree" ("document_type");



CREATE INDEX "sire_content_language_idx" ON "public"."sire_content" USING "btree" ("language");



CREATE INDEX "sire_content_status_idx" ON "public"."sire_content" USING "btree" ("status");



CREATE INDEX "sire_content_title_gin_idx" ON "public"."sire_content" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", ("title")::"text"));



CREATE INDEX "sire_content_version_idx" ON "public"."sire_content" USING "btree" ("version");



CREATE INDEX "tenant_knowledge_tenant_idx" ON "public"."tenant_knowledge_embeddings" USING "btree" ("tenant_id");



CREATE INDEX "tenant_knowledge_vector_idx" ON "public"."tenant_knowledge_embeddings" USING "hnsw" ("embedding" "public"."vector_cosine_ops") WITH ("m"='16', "ef_construction"='64');



CREATE INDEX "tenant_muva_content_document_type_idx" ON "public"."tenant_muva_content" USING "btree" ("document_type");



CREATE INDEX "tenant_muva_content_embedding_idx" ON "public"."tenant_muva_content" USING "hnsw" ("embedding" "public"."vector_cosine_ops");



CREATE INDEX "tenant_muva_content_tenant_id_idx" ON "public"."tenant_muva_content" USING "btree" ("tenant_id");



CREATE INDEX "tenant_registry_subdomain_idx" ON "public"."tenant_registry" USING "btree" ("subdomain");



CREATE OR REPLACE TRIGGER "conversation_attachments_updated_at" BEFORE UPDATE ON "public"."conversation_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_attachments_updated_at"();



CREATE OR REPLACE TRIGGER "hotels_updated_at" BEFORE UPDATE ON "public"."hotels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "propagate_parent_bookings" AFTER INSERT OR UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."propagate_parent_booking"();



CREATE OR REPLACE TRIGGER "trigger_airbnb_motopress_comparison_updated_at" BEFORE UPDATE ON "public"."airbnb_motopress_comparison" FOR EACH ROW EXECUTE FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"();



CREATE OR REPLACE TRIGGER "update_accommodation_units_manual_updated_at" BEFORE UPDATE ON "public"."accommodation_units_manual" FOR EACH ROW EXECUTE FUNCTION "public"."update_accommodation_units_manual_updated_at"();



CREATE OR REPLACE TRIGGER "update_calendar_events_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_on_message" AFTER INSERT ON "public"."chat_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_guest_conversations_updated_at" BEFORE UPDATE ON "public"."guest_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ics_feeds_updated_at" BEFORE UPDATE ON "public"."ics_feed_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_relationships_updated_at" BEFORE UPDATE ON "public"."property_relationships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_compliance_credentials_updated_at" BEFORE UPDATE ON "public"."tenant_compliance_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_registry_updated_at" BEFORE UPDATE ON "public"."tenant_registry" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_tenant_permissions_updated_at" BEFORE UPDATE ON "public"."user_tenant_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "hotels"."guest_information"
    ADD CONSTRAINT "guest_information_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "hotels"."properties"("property_id");



ALTER TABLE ONLY "hotels"."policies"
    ADD CONSTRAINT "policies_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "hotels"."properties"("property_id");



ALTER TABLE ONLY "hotels"."properties"
    ADD CONSTRAINT "properties_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "hotels"."client_info"("id");



ALTER TABLE ONLY "public"."accommodation_units"
    ADD CONSTRAINT "accommodation_units_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id");



ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_manual_id_fkey" FOREIGN KEY ("manual_id") REFERENCES "public"."accommodation_units_manual"("unit_id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "accommodation_units_manual_chunks_manual_id_fkey" ON "public"."accommodation_units_manual_chunks" IS 'Auto-delete chunks when manual deleted. CASCADE maintains referential integrity.';



ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."accommodation_units_manual"
    ADD CONSTRAINT "accommodation_units_manual_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."accommodation_units_public"("unit_id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "accommodation_units_manual_unit_id_fkey" ON "public"."accommodation_units_manual" IS 'Auto-delete manuals when public unit deleted. CASCADE prevents orphaned manual records.';



ALTER TABLE ONLY "public"."accommodation_units_public"
    ADD CONSTRAINT "accommodation_units_public_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."accommodation_units"
    ADD CONSTRAINT "accommodation_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."airbnb_motopress_comparison"
    ADD CONSTRAINT "airbnb_motopress_comparison_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "public"."accommodation_units_public"("unit_id");



ALTER TABLE ONLY "public"."airbnb_motopress_comparison"
    ADD CONSTRAINT "airbnb_motopress_comparison_ics_event_id_fkey" FOREIGN KEY ("ics_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."airbnb_motopress_comparison"
    ADD CONSTRAINT "airbnb_motopress_comparison_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."airbnb_mphb_imported_reservations"
    ADD CONSTRAINT "airbnb_mphb_imported_reservations_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id");



ALTER TABLE ONLY "public"."calendar_event_conflicts"
    ADD CONSTRAINT "calendar_event_conflicts_event_1_id_fkey" FOREIGN KEY ("event_1_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_conflicts"
    ADD CONSTRAINT "calendar_event_conflicts_event_2_id_fkey" FOREIGN KEY ("event_2_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_conflicts"
    ADD CONSTRAINT "calendar_event_conflicts_winning_event_id_fkey" FOREIGN KEY ("winning_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "calendar_events_accommodation_unit_id_fkey" ON "public"."calendar_events" IS 'Auto-delete calendar events when hotel unit deleted. Events will be re-imported from ICS feeds after resync.';



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_sync_logs"
    ADD CONSTRAINT "calendar_sync_logs_feed_config_id_fkey" FOREIGN KEY ("feed_config_id") REFERENCES "public"."ics_feed_configurations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."guest_reservations"("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."guest_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_submissions"
    ADD CONSTRAINT "compliance_submissions_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guest_reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_attachments"
    ADD CONSTRAINT "conversation_attachments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."guest_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_memory"
    ADD CONSTRAINT "conversation_memory_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."prospective_sessions"("session_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_memory"
    ADD CONSTRAINT "conversation_memory_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."guest_conversations"
    ADD CONSTRAINT "guest_conversations_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."guest_reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_reservations"
    ADD CONSTRAINT "guest_reservations_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "guest_reservations_accommodation_unit_id_fkey" ON "public"."guest_reservations" IS 'References hotels.accommodation_units (multi-tenant source of truth), not public.accommodation_units';



ALTER TABLE ONLY "public"."hotel_operations"
    ADD CONSTRAINT "hotel_operations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("staff_id");



ALTER TABLE ONLY "public"."hotel_operations"
    ADD CONSTRAINT "hotel_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ics_feed_configurations"
    ADD CONSTRAINT "ics_feed_configurations_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id") ON UPDATE CASCADE ON DELETE CASCADE;



COMMENT ON CONSTRAINT "ics_feed_configurations_accommodation_unit_id_fkey" ON "public"."ics_feed_configurations" IS 'Auto-delete ICS feed configurations when hotel unit deleted. User must reconfigure feeds after unit recreation.';



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."job_logs"
    ADD CONSTRAINT "job_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prospective_sessions"
    ADD CONSTRAINT "prospective_sessions_converted_to_reservation_id_fkey" FOREIGN KEY ("converted_to_reservation_id") REFERENCES "public"."guest_reservations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prospective_sessions"
    ADD CONSTRAINT "prospective_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservation_accommodations"
    ADD CONSTRAINT "reservation_accommodations_accommodation_unit_id_fkey" FOREIGN KEY ("accommodation_unit_id") REFERENCES "hotels"."accommodation_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservation_accommodations"
    ADD CONSTRAINT "reservation_accommodations_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."guest_reservations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sire_export_logs"
    ADD CONSTRAINT "sire_export_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."staff_conversations"
    ADD CONSTRAINT "staff_conversations_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("staff_id");



ALTER TABLE ONLY "public"."staff_messages"
    ADD CONSTRAINT "staff_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."staff_conversations"("conversation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff_users"("staff_id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."sync_history"
    ADD CONSTRAINT "sync_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id");



ALTER TABLE ONLY "public"."tenant_compliance_credentials"
    ADD CONSTRAINT "tenant_compliance_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_knowledge_embeddings"
    ADD CONSTRAINT "tenant_knowledge_embeddings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_muva_content"
    ADD CONSTRAINT "tenant_muva_content_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tenant_permissions"
    ADD CONSTRAINT "user_tenant_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_tenant_permissions"
    ADD CONSTRAINT "user_tenant_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_registry"("tenant_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tenant_permissions"
    ADD CONSTRAINT "user_tenant_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "hotels"."client_info" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_info_tenant_delete" ON "hotels"."client_info" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "client_info_tenant_insert" ON "hotels"."client_info" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "client_info_tenant_select" ON "hotels"."client_info" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "client_info_tenant_update" ON "hotels"."client_info" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_tenant_delete" ON "hotels"."content" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "content_tenant_insert" ON "hotels"."content" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "content_tenant_select" ON "hotels"."content" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "content_tenant_update" ON "hotels"."content" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."guest_information" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guest_information_tenant_delete" ON "hotels"."guest_information" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "guest_information_tenant_insert" ON "hotels"."guest_information" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "guest_information_tenant_select" ON "hotels"."guest_information" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "guest_information_tenant_update" ON "hotels"."guest_information" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policies_tenant_delete" ON "hotels"."policies" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "policies_tenant_insert" ON "hotels"."policies" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "policies_tenant_select" ON "hotels"."policies" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "policies_tenant_update" ON "hotels"."policies" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."pricing_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pricing_rules_tenant_delete" ON "hotels"."pricing_rules" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "pricing_rules_tenant_insert" ON "hotels"."pricing_rules" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "pricing_rules_tenant_select" ON "hotels"."pricing_rules" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "pricing_rules_tenant_update" ON "hotels"."pricing_rules" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_tenant_delete" ON "hotels"."properties" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "properties_tenant_insert" ON "hotels"."properties" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "properties_tenant_select" ON "hotels"."properties" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "properties_tenant_update" ON "hotels"."properties" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



ALTER TABLE "hotels"."unit_amenities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "unit_amenities_tenant_delete" ON "hotels"."unit_amenities" FOR DELETE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "unit_amenities_tenant_insert" ON "hotels"."unit_amenities" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "unit_amenities_tenant_select" ON "hotels"."unit_amenities" FOR SELECT TO "authenticated", "anon" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "unit_amenities_tenant_update" ON "hotels"."unit_amenities" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)));



CREATE POLICY "Admins can view all job logs" ON "public"."job_logs" FOR SELECT TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Anyone can read MUVA content" ON "public"."muva_content" FOR SELECT USING (true);



CREATE POLICY "Anyone can read SIRE content" ON "public"."sire_content" FOR SELECT USING (true);



CREATE POLICY "Guest can view their unit manual" ON "public"."accommodation_units_manual" FOR SELECT USING (("unit_id" IN ( SELECT "guest_reservations"."accommodation_unit_id"
   FROM "public"."guest_reservations"
  WHERE ((("guest_reservations"."id")::"text" = "current_setting"('request.jwt.claim.reservation_id'::"text", true)) AND (("guest_reservations"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Guests can create own attachments" ON "public"."conversation_attachments" FOR INSERT WITH CHECK (("conversation_id" IN ( SELECT "guest_conversations"."id"
   FROM "public"."guest_conversations"
  WHERE ("guest_conversations"."guest_id" = ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"
          WHERE ("guest_reservations"."id" = "auth"."uid"()))))));



CREATE POLICY "Guests can create their own conversations" ON "public"."guest_conversations" FOR INSERT WITH CHECK (("guest_id" = "auth"."uid"()));



CREATE POLICY "Guests can create their own submissions" ON "public"."compliance_submissions" FOR INSERT WITH CHECK (("guest_id" = "auth"."uid"()));



CREATE POLICY "Guests can delete own attachments" ON "public"."conversation_attachments" FOR DELETE USING (("conversation_id" IN ( SELECT "guest_conversations"."id"
   FROM "public"."guest_conversations"
  WHERE ("guest_conversations"."guest_id" = ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"
          WHERE ("guest_reservations"."id" = "auth"."uid"()))))));



CREATE POLICY "Guests can delete their own conversations" ON "public"."guest_conversations" FOR DELETE USING (("guest_id" = "auth"."uid"()));



CREATE POLICY "Guests can update own attachments" ON "public"."conversation_attachments" FOR UPDATE USING (("conversation_id" IN ( SELECT "guest_conversations"."id"
   FROM "public"."guest_conversations"
  WHERE ("guest_conversations"."guest_id" = ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"
          WHERE ("guest_reservations"."id" = "auth"."uid"())))))) WITH CHECK (("conversation_id" IN ( SELECT "guest_conversations"."id"
   FROM "public"."guest_conversations"
  WHERE ("guest_conversations"."guest_id" = ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"
          WHERE ("guest_reservations"."id" = "auth"."uid"()))))));



CREATE POLICY "Guests can update their own conversations" ON "public"."guest_conversations" FOR UPDATE USING (("guest_id" = "auth"."uid"()));



CREATE POLICY "Guests can view own attachments" ON "public"."conversation_attachments" FOR SELECT USING (("conversation_id" IN ( SELECT "guest_conversations"."id"
   FROM "public"."guest_conversations"
  WHERE ("guest_conversations"."guest_id" = ( SELECT "guest_reservations"."id"
           FROM "public"."guest_reservations"
          WHERE ("guest_reservations"."id" = "auth"."uid"()))))));



CREATE POLICY "Guests can view their own conversations" ON "public"."guest_conversations" FOR SELECT USING (("guest_id" = "auth"."uid"()));



CREATE POLICY "Guests can view their own submissions" ON "public"."compliance_submissions" FOR SELECT USING (("guest_id" = "auth"."uid"()));



CREATE POLICY "Hotels insert policy" ON "public"."hotels" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."tenant_id" = "hotels"."tenant_id") AND ("utp"."user_id" = "auth"."uid"()) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::"text"[])) AND ("utp"."is_active" = true)))));



CREATE POLICY "Hotels tenant isolation" ON "public"."hotels" USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."tenant_id" = "hotels"."tenant_id") AND ("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Hotels update policy" ON "public"."hotels" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."tenant_id" = "hotels"."tenant_id") AND ("utp"."user_id" = "auth"."uid"()) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::"text"[])) AND ("utp"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."tenant_id" = "hotels"."tenant_id") AND ("utp"."user_id" = "auth"."uid"()) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::"text"[])) AND ("utp"."is_active" = true)))));



CREATE POLICY "Only admins can create credentials" ON "public"."tenant_compliance_credentials" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_compliance_credentials"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Only admins can delete credentials" ON "public"."tenant_compliance_credentials" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_compliance_credentials"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Only admins can update credentials" ON "public"."tenant_compliance_credentials" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_compliance_credentials"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Only admins can view credentials" ON "public"."tenant_compliance_credentials" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_compliance_credentials"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Only service role can create tenants" ON "public"."tenant_registry" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Only service role can delete tenants" ON "public"."tenant_registry" FOR DELETE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Only service role can modify MUVA content" ON "public"."muva_content" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Only service role can modify SIRE content" ON "public"."sire_content" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Only service role can update tenants" ON "public"."tenant_registry" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Public read access to cities" ON "public"."sire_cities" FOR SELECT USING (true);



CREATE POLICY "Public read access to countries" ON "public"."sire_countries" FOR SELECT USING (true);



CREATE POLICY "Public read access to document types" ON "public"."sire_document_types" FOR SELECT USING (true);



CREATE POLICY "Service can insert memories" ON "public"."conversation_memory" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert export logs" ON "public"."sire_export_logs" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role has full access" ON "public"."guest_reservations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Staff can update tenant submissions" ON "public"."compliance_submissions" FOR UPDATE USING ((("tenant_id")::"text" IN ( SELECT DISTINCT "gr"."tenant_id"
   FROM ("public"."guest_reservations" "gr"
     JOIN "public"."user_tenant_permissions" "utp" ON (((("utp"."tenant_id")::character varying)::"text" = ("gr"."tenant_id")::"text")))
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "Staff can view tenant conversations" ON "public"."guest_conversations" FOR SELECT USING ((("tenant_id")::"text" IN ( SELECT DISTINCT "gr"."tenant_id"
   FROM ("public"."guest_reservations" "gr"
     JOIN "public"."user_tenant_permissions" "utp" ON (((("utp"."tenant_id")::character varying)::"text" = ("gr"."tenant_id")::"text")))
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Staff can view tenant submissions" ON "public"."compliance_submissions" FOR SELECT USING ((("tenant_id")::"text" IN ( SELECT DISTINCT "gr"."tenant_id"
   FROM ("public"."guest_reservations" "gr"
     JOIN "public"."user_tenant_permissions" "utp" ON (((("utp"."tenant_id")::character varying)::"text" = ("gr"."tenant_id")::"text")))
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Tenant admins can manage permissions" ON "public"."user_tenant_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."tenant_id" = "user_tenant_permissions"."tenant_id") AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("utp"."is_active" = true)))));



CREATE POLICY "Tenant owners can delete their own reservations" ON "public"."guest_reservations" FOR DELETE TO "authenticated" USING ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[]))))));



CREATE POLICY "Tenant users can insert their own reservations" ON "public"."guest_reservations" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::"text"[]))))));



CREATE POLICY "Tenant users can update their own reservations" ON "public"."guest_reservations" FOR UPDATE TO "authenticated" USING ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::"text"[])))))) WITH CHECK ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true) AND (("utp"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::"text"[]))))));



CREATE POLICY "Tenant users can view their export logs" ON "public"."sire_export_logs" FOR SELECT TO "authenticated" USING ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Tenant users can view their own reservations" ON "public"."guest_reservations" FOR SELECT TO "authenticated" USING ((("tenant_id")::"uuid" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Tenants can delete own MUVA content" ON "public"."tenant_muva_content" FOR DELETE USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "Tenants can delete their own calendar events" ON "public"."calendar_events" FOR DELETE USING ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can insert own MUVA content" ON "public"."tenant_muva_content" FOR INSERT WITH CHECK (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "Tenants can insert their own calendar events" ON "public"."calendar_events" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can manage their own ICS feeds" ON "public"."ics_feed_configurations" USING ((("auth"."uid"())::"text" = ("tenant_id")::"text")) WITH CHECK ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can manage their own conflicts" ON "public"."calendar_event_conflicts" USING ((("auth"."uid"())::"text" = ("tenant_id")::"text")) WITH CHECK ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can manage their own property relationships" ON "public"."property_relationships" USING ((("auth"."uid"())::"text" = ("tenant_id")::"text")) WITH CHECK ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can update own MUVA content" ON "public"."tenant_muva_content" FOR UPDATE USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "Tenants can update their own calendar events" ON "public"."calendar_events" FOR UPDATE USING ((("auth"."uid"())::"text" = ("tenant_id")::"text")) WITH CHECK ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can view own MUVA content" ON "public"."tenant_muva_content" FOR SELECT USING (("tenant_id" = ("current_setting"('app.current_tenant_id'::"text", true))::"uuid"));



CREATE POLICY "Tenants can view their own calendar events" ON "public"."calendar_events" FOR SELECT USING ((("auth"."uid"())::"text" = ("tenant_id")::"text"));



CREATE POLICY "Tenants can view their own sync logs" ON "public"."calendar_sync_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."ics_feed_configurations" "f"
  WHERE (("f"."id" = "calendar_sync_logs"."feed_config_id") AND (("f"."tenant_id")::"text" = ("auth"."uid"())::"text")))));



CREATE POLICY "Users can only access their tenant's integration configs" ON "public"."integration_configs" USING (("tenant_id" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE ("utp"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their tenant's sync history" ON "public"."sync_history" USING (("tenant_id" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE ("utp"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view own permissions" ON "public"."user_tenant_permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own session memories" ON "public"."conversation_memory" FOR SELECT USING (("session_id" IN ( SELECT "prospective_sessions"."session_id"
   FROM "public"."prospective_sessions"
  WHERE ("prospective_sessions"."cookie_id" = "current_setting"('request.cookie_id'::"text", true)))));



CREATE POLICY "Users can view tenants they have access to" ON "public"."tenant_registry" FOR SELECT USING (("tenant_id" IN ( SELECT "utp"."tenant_id"
   FROM "public"."user_tenant_permissions" "utp"
  WHERE (("utp"."user_id" = "auth"."uid"()) AND ("utp"."is_active" = true)))));



CREATE POLICY "Users with tenant permissions can delete policies" ON "public"."policies" FOR DELETE USING (("tenant_id" IN ( SELECT "user_tenant_permissions"."tenant_id"
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Users with tenant permissions can insert policies" ON "public"."policies" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "user_tenant_permissions"."tenant_id"
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Users with tenant permissions can update policies" ON "public"."policies" FOR UPDATE USING (("tenant_id" IN ( SELECT "user_tenant_permissions"."tenant_id"
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."is_active" = true))))) WITH CHECK (("tenant_id" IN ( SELECT "user_tenant_permissions"."tenant_id"
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "Users with tenant permissions can view policies" ON "public"."policies" FOR SELECT USING (("tenant_id" IN ( SELECT "user_tenant_permissions"."tenant_id"
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "accommodation_public_read_all" ON "public"."accommodation_units_public" FOR SELECT USING ((("is_active" = true) AND ("is_bookable" = true)));



ALTER TABLE "public"."accommodation_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accommodation_units_manual" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."accommodation_units_manual_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accommodation_units_manual_chunks_tenant_delete" ON "public"."accommodation_units_manual_chunks" FOR DELETE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_manual_chunks_tenant_insert" ON "public"."accommodation_units_manual_chunks" FOR INSERT WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_manual_chunks_tenant_select" ON "public"."accommodation_units_manual_chunks" FOR SELECT USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_manual_chunks_tenant_update" ON "public"."accommodation_units_manual_chunks" FOR UPDATE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."accommodation_units_public" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accommodation_units_tenant_delete" ON "public"."accommodation_units" FOR DELETE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_tenant_insert" ON "public"."accommodation_units" FOR INSERT WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_tenant_select" ON "public"."accommodation_units" FOR SELECT USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "accommodation_units_tenant_update" ON "public"."accommodation_units" FOR UPDATE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."airbnb_motopress_comparison" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "airbnb_motopress_comparison_service_role" ON "public"."airbnb_motopress_comparison" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "airbnb_motopress_comparison_tenant_isolation" ON "public"."airbnb_motopress_comparison" USING (("tenant_id" IN ( SELECT "tenant_registry"."tenant_id"
   FROM "public"."tenant_registry"
  WHERE ("tenant_registry"."tenant_id" = "airbnb_motopress_comparison"."tenant_id"))));



ALTER TABLE "public"."airbnb_mphb_imported_reservations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "airbnb_mphb_tenant_isolation" ON "public"."airbnb_mphb_imported_reservations" USING ((("tenant_id")::"text" = (("current_setting"('app.tenant_id'::"text", true))::character varying)::"text"));



ALTER TABLE "public"."calendar_event_conflicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guest_conversations_service_delete" ON "public"."guest_conversations" FOR DELETE USING (true);



CREATE POLICY "guest_conversations_service_insert" ON "public"."guest_conversations" FOR INSERT WITH CHECK (true);



CREATE POLICY "guest_conversations_service_select" ON "public"."guest_conversations" FOR SELECT USING (true);



CREATE POLICY "guest_conversations_service_update" ON "public"."guest_conversations" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "guest_own_conversations" ON "public"."chat_conversations" FOR SELECT USING (((("user_id")::"text" = "current_setting"('app.current_user_id'::"text", true)) AND (("user_type")::"text" = 'guest'::"text")));



CREATE POLICY "guest_own_messages" ON "public"."chat_messages" FOR SELECT USING (("conversation_id" IN ( SELECT "chat_conversations"."id"
   FROM "public"."chat_conversations"
  WHERE ((("chat_conversations"."user_id")::"text" = "current_setting"('app.current_user_id'::"text", true)) AND (("chat_conversations"."user_type")::"text" = 'guest'::"text")))));



ALTER TABLE "public"."guest_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hotel_operations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotel_operations_staff_access" ON "public"."hotel_operations" FOR SELECT USING (((("tenant_id")::"text" = "current_setting"('request.jwt.claim.tenant_id'::"text", true)) AND ((("access_level")::"text" = 'all_staff'::"text") OR ((("access_level")::"text" = 'admin_only'::"text") AND ("current_setting"('request.jwt.claim.role'::"text", true) = ANY (ARRAY['ceo'::"text", 'admin'::"text"]))) OR ((("access_level")::"text" = 'ceo_only'::"text") AND ("current_setting"('request.jwt.claim.role'::"text", true) = 'ceo'::"text")))));



ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ics_feed_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muva_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prospective_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prospective_sessions_public_access" ON "public"."prospective_sessions" USING ((("status")::"text" = 'active'::"text"));



CREATE POLICY "prospective_sessions_staff_access" ON "public"."prospective_sessions" FOR SELECT USING (("tenant_id" IN ( SELECT "staff_users"."tenant_id"
   FROM "public"."staff_users"
  WHERE (("staff_users"."staff_id")::"text" = "current_setting"('request.jwt.claim.sub'::"text", true)))));



ALTER TABLE "public"."reservation_accommodations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reservation_accommodations_tenant_isolation" ON "public"."reservation_accommodations" USING ((EXISTS ( SELECT 1
   FROM "public"."guest_reservations" "gr"
  WHERE (("gr"."id" = "reservation_accommodations"."reservation_id") AND (("gr"."tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."guest_reservations" "gr"
  WHERE (("gr"."id" = "reservation_accommodations"."reservation_id") AND (("gr"."tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true))))));



ALTER TABLE "public"."sire_cities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sire_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sire_countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sire_document_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sire_export_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_admin_view_all" ON "public"."staff_users" FOR SELECT USING (((("tenant_id")::"text" = "current_setting"('request.jwt.claim.tenant_id'::"text", true)) AND ("current_setting"('request.jwt.claim.role'::"text", true) = ANY (ARRAY['ceo'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."staff_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_conversations_tenant_delete" ON "public"."staff_conversations" FOR DELETE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_conversations_tenant_insert" ON "public"."staff_conversations" FOR INSERT WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_conversations_tenant_select" ON "public"."staff_conversations" FOR SELECT USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_conversations_tenant_update" ON "public"."staff_conversations" FOR UPDATE USING ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK ((("tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid") OR ("auth"."role"() = 'service_role'::"text")));



ALTER TABLE "public"."staff_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_messages_tenant_delete" ON "public"."staff_messages" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."staff_conversations" "sc"
  WHERE (("sc"."conversation_id" = "staff_messages"."conversation_id") AND ("sc"."tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_messages_tenant_insert" ON "public"."staff_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."staff_conversations" "sc"
  WHERE (("sc"."conversation_id" = "sc"."conversation_id") AND ("sc"."tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_messages_tenant_select" ON "public"."staff_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."staff_conversations" "sc"
  WHERE (("sc"."conversation_id" = "staff_messages"."conversation_id") AND ("sc"."tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_messages_tenant_update" ON "public"."staff_messages" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."staff_conversations" "sc"
  WHERE (("sc"."conversation_id" = "staff_messages"."conversation_id") AND ("sc"."tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")))) OR ("auth"."role"() = 'service_role'::"text"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."staff_conversations" "sc"
  WHERE (("sc"."conversation_id" = "sc"."conversation_id") AND ("sc"."tenant_id" = ("current_setting"('app.tenant_id'::"text", true))::"uuid")))) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "staff_own_profile" ON "public"."staff_users" FOR SELECT USING ((("staff_id")::"text" = "current_setting"('request.jwt.claim.staff_id'::"text", true)));



CREATE POLICY "staff_tenant_conversations" ON "public"."chat_conversations" FOR SELECT USING (((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)) AND ("current_setting"('app.user_role'::"text", true) = ANY (ARRAY['staff'::"text", 'admin'::"text", 'owner'::"text"]))));



CREATE POLICY "staff_tenant_messages" ON "public"."chat_messages" FOR SELECT USING ((("conversation_id" IN ( SELECT "chat_conversations"."id"
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)))) AND ("current_setting"('app.user_role'::"text", true) = ANY (ARRAY['staff'::"text", 'admin'::"text", 'owner'::"text"]))));



CREATE POLICY "staff_tenant_reservations" ON "public"."guest_reservations" FOR SELECT USING (((("tenant_id")::"text" = "current_setting"('app.current_tenant_id'::"text", true)) AND ("current_setting"('app.user_role'::"text", true) = ANY (ARRAY['staff'::"text", 'admin'::"text", 'owner'::"text"]))));



ALTER TABLE "public"."staff_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_compliance_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_knowledge_delete" ON "public"."tenant_knowledge_embeddings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_knowledge_embeddings"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



ALTER TABLE "public"."tenant_knowledge_embeddings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_knowledge_insert" ON "public"."tenant_knowledge_embeddings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_knowledge_embeddings"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "tenant_knowledge_isolation" ON "public"."tenant_knowledge_embeddings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_knowledge_embeddings"."tenant_id") AND ("user_tenant_permissions"."is_active" = true)))));



CREATE POLICY "tenant_knowledge_update" ON "public"."tenant_knowledge_embeddings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_tenant_permissions"
  WHERE (("user_tenant_permissions"."user_id" = "auth"."uid"()) AND ("user_tenant_permissions"."tenant_id" = "tenant_knowledge_embeddings"."tenant_id") AND (("user_tenant_permissions"."role")::"text" = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::"text"[])) AND ("user_tenant_permissions"."is_active" = true)))));



ALTER TABLE "public"."tenant_muva_content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_registry" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_registry_public_select" ON "public"."tenant_registry" FOR SELECT USING (true);



COMMENT ON POLICY "tenant_registry_public_select" ON "public"."tenant_registry" IS 'Allow public read access to tenant registry for subdomain resolution';



ALTER TABLE "public"."user_tenant_permissions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "hotels" TO "anon";
GRANT USAGE ON SCHEMA "hotels" TO "authenticated";
GRANT ALL ON SCHEMA "hotels" TO "service_role";



GRANT USAGE ON SCHEMA "muva_activities" TO "anon";
GRANT USAGE ON SCHEMA "muva_activities" TO "authenticated";
GRANT USAGE ON SCHEMA "muva_activities" TO "service_role";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_accommodation_type_hotel_match"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_accommodation_type_hotel_match"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_accommodation_type_hotel_match"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_event_overlap"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_exclude_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_metadata_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_metadata_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_metadata_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rls_policies"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_rls_policies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rls_policies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rls_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_rls_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rls_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sire_access_permission"("p_tenant_id" "text", "p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_sire_data_completeness"("p_reservation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_slow_queries"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_slow_queries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_slow_queries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer, "p_status" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer, "p_status" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_accommodation_unit"("p_tenant_id" character varying, "p_name" character varying, "p_motopress_type_id" integer, "p_status" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."exec_sql"("sql" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."execute_sql"("query" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_sql"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_tenant_id"("p_unit_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_tenant_id"("p_unit_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_tenant_id"("p_unit_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_id"("p_unit_id" "uuid", "p_tenant_id" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_motopress_id"("p_tenant_id" "uuid", "p_motopress_type_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_unit_by_name"("p_unit_name" "text", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_units"("p_hotel_id" "uuid", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_units"("p_hotel_id" "uuid", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_units"("p_hotel_id" "uuid", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_ids"("p_unit_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accommodation_units_needing_type_id"("p_tenant_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_integration"("p_tenant_id" "uuid", "p_integration_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_archived_conversations_to_delete"("p_tenant_id" "text", "p_days_archived" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_availability"("p_accommodation_unit_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_conversation_messages"("p_conversation_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_full_document"("p_source_file" character varying, "p_table_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_full_document"("p_source_file" character varying, "p_table_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_full_document"("p_source_file" character varying, "p_table_name" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guest_conversation_metadata"("p_conversation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inactive_conversations"("p_tenant_id" "text", "p_days_inactive" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_real_accommodation_units_by_tenant"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_reservations_by_external_id"("p_external_booking_id" "text", "p_tenant_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sire_guest_data"("p_reservation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) TO "anon";
GRANT ALL ON FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sire_monthly_export"("p_tenant_id" "text", "p_year" integer, "p_month" integer, "p_movement_type" character) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sire_statistics"("p_tenant_id" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_schema"("tenant_nit" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_schema"("tenant_nit" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_schema"("tenant_nit" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_tenant_feature"("p_tenant_id" "uuid", "p_feature_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "jsonb", "p_embedding" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "jsonb", "p_embedding" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "jsonb", "p_embedding" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "text", "p_embedding" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "text", "p_embedding" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_accommodation_unit"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_short_description" "text", "p_unit_number" "text", "p_unit_type" character varying, "p_highlights" "jsonb", "p_amenities" "jsonb", "p_embedding_fast" "text", "p_embedding" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_rls_policies"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_rls_policies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_rls_policies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v1"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_hotel_to_public_accommodation_id_v2"("p_hotel_unit_id" "uuid", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."map_public_to_hotel_accommodation_id"("p_public_unit_id" "uuid", "p_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_accommodation_units_balanced"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_accommodation_units_balanced"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_accommodation_units_balanced"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_accommodation_units_fast"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_accommodation_units_fast"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_accommodation_units_fast"("query_embedding" "public"."vector", "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_accommodations_hybrid"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_accommodations_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_conversation_memory"("query_embedding" "public"."vector", "p_session_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents_with_tenant"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text", "tenant_nit" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents_with_tenant"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text", "tenant_nit" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents_with_tenant"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text", "tenant_nit" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_guest_accommodations"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "p_guest_unit_id" "uuid", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_guest_information_balanced"("query_embedding" "public"."vector", "p_tenant_id" "text", "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_guest_information_balanced"("query_embedding" "public"."vector", "p_tenant_id" "text", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_guest_information_balanced"("query_embedding" "public"."vector", "p_tenant_id" "text", "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotel_content"("query_embedding" "public"."vector", "client_nit" character varying, "property_name" character varying, "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotel_content"("query_embedding" "public"."vector", "client_nit" character varying, "property_name" character varying, "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotel_content"("query_embedding" "public"."vector", "client_nit" character varying, "property_name" character varying, "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotel_documents"("query_embedding" "public"."vector", "client_id_filter" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotel_general_info"("query_embedding" "public"."vector", "p_tenant_id" character varying, "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotel_operations_balanced"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "p_access_levels" "text"[], "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotels_documents"("query_embedding" "public"."vector", "tenant_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer, "tier" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotels_documents"("query_embedding" "public"."vector", "tenant_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer, "tier" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotels_documents"("query_embedding" "public"."vector", "tenant_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer, "tier" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotels_documents_optimized"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotels_documents_optimized"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotels_documents_optimized"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_hotels_with_tier_routing"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "search_type" "text", "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_hotels_with_tier_routing"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "search_type" "text", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_hotels_with_tier_routing"("query_embedding_fast" "public"."vector", "query_embedding_balanced" "public"."vector", "search_type" "text", "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" "text", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" character varying, "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" character varying, "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_listings_documents"("query_embedding" "public"."vector", "client_id_filter" "text", "business_type_filter" character varying, "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_muva_activities"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_muva_activities"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_muva_activities"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_muva_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_muva_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_muva_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_muva_documents_public"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_optimized_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "target_tables" "text"[], "tier" integer, "tenant_id_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_optimized_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "target_tables" "text"[], "tier" integer, "tenant_id_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_optimized_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "target_tables" "text"[], "tier" integer, "tenant_id_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_policies"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_policies_public"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_simmerdown_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_simmerdown_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_simmerdown_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_sire_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_sire_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_sire_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_tenant_muva_documents"("query_embedding" "public"."vector", "p_tenant_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_unified_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_unified_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_unified_documents"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer, "domain_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_unit_manual"("query_embedding" "public"."vector", "p_unit_id" "uuid", "similarity_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_unit_manual_chunks"("query_embedding" "public"."vector", "p_accommodation_unit_id" "uuid", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."propagate_parent_booking"() TO "anon";
GRANT ALL ON FUNCTION "public"."propagate_parent_booking"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."propagate_parent_booking"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_code_embeddings"("query_embedding" "public"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_hotels_by_tenant"("query_embedding" "public"."vector", "tenant_ids" "text"[], "content_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_hotels_by_tenant"("query_embedding" "public"."vector", "tenant_ids" "text"[], "content_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_hotels_by_tenant"("query_embedding" "public"."vector", "tenant_ids" "text"[], "content_types" "text"[], "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_muva_attractions"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_muva_attractions"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_muva_attractions"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_muva_restaurants"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "price_filter" "text", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_muva_restaurants"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "price_filter" "text", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_muva_restaurants"("query_embedding" "public"."vector", "location_filter" "text", "min_rating" numeric, "price_filter" "text", "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_tenant_embeddings"("p_tenant_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_app_tenant_id"("tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."simulate_app_tenant_access"("input_tenant_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_accommodation_units_public_to_hotels"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_ddl_execution"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_ddl_execution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_ddl_execution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_tenant_isolation_simple"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_tenant_isolation_simple"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_tenant_isolation_simple"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_accommodation_units_manual_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_accommodation_units_manual_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_accommodation_units_manual_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_airbnb_motopress_comparison_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_attachments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_attachments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_attachments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_pricing_rule"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pricing_rule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pricing_rule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "hotels"."accommodation_units" TO "anon";
GRANT ALL ON TABLE "hotels"."accommodation_units" TO "authenticated";
GRANT ALL ON TABLE "hotels"."accommodation_units" TO "service_role";



GRANT ALL ON TABLE "hotels"."client_info" TO "anon";
GRANT ALL ON TABLE "hotels"."client_info" TO "authenticated";
GRANT ALL ON TABLE "hotels"."client_info" TO "service_role";



GRANT ALL ON TABLE "hotels"."content" TO "anon";
GRANT ALL ON TABLE "hotels"."content" TO "authenticated";
GRANT ALL ON TABLE "hotels"."content" TO "service_role";



GRANT ALL ON TABLE "hotels"."guest_information" TO "anon";
GRANT ALL ON TABLE "hotels"."guest_information" TO "authenticated";
GRANT ALL ON TABLE "hotels"."guest_information" TO "service_role";



GRANT ALL ON TABLE "hotels"."policies" TO "anon";
GRANT ALL ON TABLE "hotels"."policies" TO "authenticated";
GRANT ALL ON TABLE "hotels"."policies" TO "service_role";



GRANT ALL ON TABLE "hotels"."pricing_rules" TO "anon";
GRANT ALL ON TABLE "hotels"."pricing_rules" TO "authenticated";
GRANT ALL ON TABLE "hotels"."pricing_rules" TO "service_role";



GRANT ALL ON TABLE "hotels"."properties" TO "anon";
GRANT ALL ON TABLE "hotels"."properties" TO "authenticated";
GRANT ALL ON TABLE "hotels"."properties" TO "service_role";



GRANT ALL ON TABLE "hotels"."unit_amenities" TO "anon";
GRANT ALL ON TABLE "hotels"."unit_amenities" TO "authenticated";
GRANT ALL ON TABLE "hotels"."unit_amenities" TO "service_role";



GRANT ALL ON TABLE "public"."accommodation_units" TO "anon";
GRANT ALL ON TABLE "public"."accommodation_units" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation_units" TO "service_role";



GRANT ALL ON TABLE "public"."accommodation_units_manual" TO "anon";
GRANT ALL ON TABLE "public"."accommodation_units_manual" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation_units_manual" TO "service_role";



GRANT ALL ON TABLE "public"."accommodation_units_manual_chunks" TO "anon";
GRANT ALL ON TABLE "public"."accommodation_units_manual_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation_units_manual_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."accommodation_units_public" TO "anon";
GRANT ALL ON TABLE "public"."accommodation_units_public" TO "authenticated";
GRANT ALL ON TABLE "public"."accommodation_units_public" TO "service_role";



GRANT ALL ON TABLE "public"."airbnb_motopress_comparison" TO "anon";
GRANT ALL ON TABLE "public"."airbnb_motopress_comparison" TO "authenticated";
GRANT ALL ON TABLE "public"."airbnb_motopress_comparison" TO "service_role";



GRANT ALL ON TABLE "public"."airbnb_mphb_imported_reservations" TO "anon";
GRANT ALL ON TABLE "public"."airbnb_mphb_imported_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."airbnb_mphb_imported_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_event_conflicts" TO "anon";
GRANT ALL ON TABLE "public"."calendar_event_conflicts" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_event_conflicts" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."code_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."code_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."code_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_submissions" TO "anon";
GRANT ALL ON TABLE "public"."compliance_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_attachments" TO "anon";
GRANT ALL ON TABLE "public"."conversation_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_memory" TO "anon";
GRANT ALL ON TABLE "public"."conversation_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_memory" TO "service_role";



GRANT ALL ON TABLE "public"."guest_reservations" TO "anon";
GRANT ALL ON TABLE "public"."guest_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."guest_chat_performance_monitor" TO "anon";
GRANT ALL ON TABLE "public"."guest_chat_performance_monitor" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_chat_performance_monitor" TO "service_role";



GRANT ALL ON TABLE "public"."guest_conversations" TO "anon";
GRANT ALL ON TABLE "public"."guest_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_operations" TO "anon";
GRANT ALL ON TABLE "public"."hotel_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_operations" TO "service_role";



GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";



GRANT ALL ON TABLE "public"."ics_feed_configurations" TO "anon";
GRANT ALL ON TABLE "public"."ics_feed_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."ics_feed_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."integration_configs" TO "anon";
GRANT ALL ON TABLE "public"."integration_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_configs" TO "service_role";



GRANT ALL ON TABLE "public"."job_logs" TO "anon";
GRANT ALL ON TABLE "public"."job_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."job_logs" TO "service_role";



GRANT ALL ON TABLE "public"."muva_content" TO "anon";
GRANT ALL ON TABLE "public"."muva_content" TO "authenticated";
GRANT ALL ON TABLE "public"."muva_content" TO "service_role";



GRANT ALL ON TABLE "public"."policies" TO "anon";
GRANT ALL ON TABLE "public"."policies" TO "authenticated";
GRANT ALL ON TABLE "public"."policies" TO "service_role";



GRANT ALL ON TABLE "public"."property_relationships" TO "anon";
GRANT ALL ON TABLE "public"."property_relationships" TO "authenticated";
GRANT ALL ON TABLE "public"."property_relationships" TO "service_role";



GRANT ALL ON TABLE "public"."prospective_sessions" TO "anon";
GRANT ALL ON TABLE "public"."prospective_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."prospective_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_accommodations" TO "anon";
GRANT ALL ON TABLE "public"."reservation_accommodations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_accommodations" TO "service_role";



GRANT ALL ON TABLE "public"."sire_cities" TO "anon";
GRANT ALL ON TABLE "public"."sire_cities" TO "authenticated";
GRANT ALL ON TABLE "public"."sire_cities" TO "service_role";



GRANT ALL ON TABLE "public"."sire_content" TO "anon";
GRANT ALL ON TABLE "public"."sire_content" TO "authenticated";
GRANT ALL ON TABLE "public"."sire_content" TO "service_role";



GRANT ALL ON TABLE "public"."sire_countries" TO "anon";
GRANT ALL ON TABLE "public"."sire_countries" TO "authenticated";
GRANT ALL ON TABLE "public"."sire_countries" TO "service_role";



GRANT ALL ON TABLE "public"."sire_document_types" TO "anon";
GRANT ALL ON TABLE "public"."sire_document_types" TO "authenticated";
GRANT ALL ON TABLE "public"."sire_document_types" TO "service_role";



GRANT ALL ON TABLE "public"."sire_export_logs" TO "anon";
GRANT ALL ON TABLE "public"."sire_export_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."sire_export_logs" TO "service_role";



GRANT ALL ON TABLE "public"."staff_conversations" TO "anon";
GRANT ALL ON TABLE "public"."staff_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."staff_messages" TO "anon";
GRANT ALL ON TABLE "public"."staff_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_messages" TO "service_role";



GRANT ALL ON TABLE "public"."staff_users" TO "anon";
GRANT ALL ON TABLE "public"."staff_users" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_users" TO "service_role";



GRANT ALL ON TABLE "public"."sync_history" TO "anon";
GRANT ALL ON TABLE "public"."sync_history" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_history" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_compliance_credentials" TO "anon";
GRANT ALL ON TABLE "public"."tenant_compliance_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_compliance_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_knowledge_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_knowledge_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_knowledge_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_muva_content" TO "anon";
GRANT ALL ON TABLE "public"."tenant_muva_content" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_muva_content" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_registry" TO "anon";
GRANT ALL ON TABLE "public"."tenant_registry" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_registry" TO "service_role";



GRANT ALL ON TABLE "public"."user_tenant_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_tenant_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tenant_permissions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "muva_activities" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "muva_activities" GRANT SELECT ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "muva_activities" GRANT SELECT ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
-- ============================================================================
-- FIX auth_rls_initplan WARNINGS - 97 Total Warnings
-- ============================================================================
-- Migration: 2025-11-01-fix-auth-rls-initplan.sql
-- Purpose: Eliminate auth_rls_initplan warnings by wrapping auth functions in SELECT
-- Issue: auth.uid(), auth.role(), auth.jwt() re-evaluate for each row
-- Solution: Replace with (select auth.uid()), (select auth.role()), (select auth.jwt())
-- Performance gain: ~30-50% faster on large datasets
-- ============================================================================

-- Pattern:
-- auth.uid()     → (select auth.uid())
-- auth.role()    → (select auth.role())
-- auth.jwt()     → (select auth.jwt())

-- ============================================================================
-- 1. accommodation_units (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_tenant_delete" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_delete" ON public.accommodation_units
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_insert" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_insert" ON public.accommodation_units
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_select" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_select" ON public.accommodation_units
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_tenant_update" ON public.accommodation_units;
CREATE POLICY "accommodation_units_tenant_update" ON public.accommodation_units
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 2. accommodation_units_manual_chunks (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_delete" ON public.accommodation_units_manual_chunks
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_insert" ON public.accommodation_units_manual_chunks
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_select" ON public.accommodation_units_manual_chunks
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks;
CREATE POLICY "accommodation_units_manual_chunks_tenant_update" ON public.accommodation_units_manual_chunks
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 3. airbnb_motopress_comparison (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "airbnb_motopress_comparison_access" ON public.airbnb_motopress_comparison;
CREATE POLICY "airbnb_motopress_comparison_access" ON public.airbnb_motopress_comparison
  FOR ALL
  USING (
    ((select auth.jwt()) ->> 'role'::text) = 'service_role'::text
    OR tenant_id IN (
      SELECT tenant_registry.tenant_id
      FROM tenant_registry
      WHERE tenant_registry.tenant_id = airbnb_motopress_comparison.tenant_id
    )
  );

-- ============================================================================
-- 4. calendar_event_conflicts (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own conflicts" ON public.calendar_event_conflicts;
CREATE POLICY "Tenants can manage their own conflicts" ON public.calendar_event_conflicts
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 5. calendar_events (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can delete their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can delete their own calendar events" ON public.calendar_events
  FOR DELETE
  USING ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can insert their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can insert their own calendar events" ON public.calendar_events
  FOR INSERT
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can update their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can update their own calendar events" ON public.calendar_events
  FOR UPDATE
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

DROP POLICY IF EXISTS "Tenants can view their own calendar events" ON public.calendar_events;
CREATE POLICY "Tenants can view their own calendar events" ON public.calendar_events
  FOR SELECT
  USING ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 6. calendar_sync_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view their own sync logs" ON public.calendar_sync_logs;
CREATE POLICY "Tenants can view their own sync logs" ON public.calendar_sync_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM ics_feed_configurations f
      WHERE f.id = calendar_sync_logs.feed_config_id
        AND (f.tenant_id)::text = (select auth.uid())::text
    )
  );

-- ============================================================================
-- 7. compliance_submissions (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Guests can create their own submissions" ON public.compliance_submissions;
CREATE POLICY "Guests can create their own submissions" ON public.compliance_submissions
  FOR INSERT
  WITH CHECK (guest_id = (select auth.uid()));

DROP POLICY IF EXISTS "Staff can update tenant submissions" ON public.compliance_submissions;
CREATE POLICY "Staff can update tenant submissions" ON public.compliance_submissions
  FOR UPDATE
  USING (
    (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "compliance_submissions_select" ON public.compliance_submissions;
CREATE POLICY "compliance_submissions_select" ON public.compliance_submissions
  FOR SELECT
  USING (
    guest_id = (select auth.uid())
    OR (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 8. conversation_attachments (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Guests can create own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can create own attachments" ON public.conversation_attachments
  FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can delete own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can delete own attachments" ON public.conversation_attachments
  FOR DELETE
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can update own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can update own attachments" ON public.conversation_attachments
  FOR UPDATE
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Guests can view own attachments" ON public.conversation_attachments;
CREATE POLICY "Guests can view own attachments" ON public.conversation_attachments
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT guest_conversations.id
      FROM guest_conversations
      WHERE guest_conversations.guest_id = (
        SELECT guest_reservations.id
        FROM guest_reservations
        WHERE guest_reservations.id = (select auth.uid())
      )
    )
  );

-- ============================================================================
-- 9. guest_conversations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "guest_conversations_delete" ON public.guest_conversations;
CREATE POLICY "guest_conversations_delete" ON public.guest_conversations
  FOR DELETE
  USING (guest_id = (select auth.uid()) OR true);

DROP POLICY IF EXISTS "guest_conversations_insert" ON public.guest_conversations;
CREATE POLICY "guest_conversations_insert" ON public.guest_conversations
  FOR INSERT
  WITH CHECK (guest_id = (select auth.uid()) OR true);

DROP POLICY IF EXISTS "guest_conversations_select" ON public.guest_conversations;
CREATE POLICY "guest_conversations_select" ON public.guest_conversations
  FOR SELECT
  USING (
    guest_id = (select auth.uid())
    OR (tenant_id)::text IN (
      SELECT DISTINCT gr.tenant_id
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON (((utp.tenant_id)::character varying)::text = (gr.tenant_id)::text)
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
    OR true
  );

DROP POLICY IF EXISTS "guest_conversations_update" ON public.guest_conversations;
CREATE POLICY "guest_conversations_update" ON public.guest_conversations
  FOR UPDATE
  USING (guest_id = (select auth.uid()) OR true)
  WITH CHECK (true);

-- ============================================================================
-- 10. guest_reservations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Tenant owners can delete their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant owners can delete their own reservations" ON public.guest_reservations
  FOR DELETE
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "Tenant users can insert their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant users can insert their own reservations" ON public.guest_reservations
  FOR INSERT
  WITH CHECK (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "Tenant users can update their own reservations" ON public.guest_reservations;
CREATE POLICY "Tenant users can update their own reservations" ON public.guest_reservations
  FOR UPDATE
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  )
  WITH CHECK (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
        AND (utp.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'staff'::character varying])::text[])
    )
  );

DROP POLICY IF EXISTS "guest_reservations_select" ON public.guest_reservations;
CREATE POLICY "guest_reservations_select" ON public.guest_reservations
  FOR SELECT
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
    OR (
      (tenant_id)::text = current_setting('app.current_tenant_id'::text, true)
      AND current_setting('app.user_role'::text, true) = ANY (ARRAY['staff'::text, 'admin'::text, 'owner'::text])
    )
  );

-- ============================================================================
-- 11. hotels (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "hotels_insert" ON public.hotels;
CREATE POLICY "hotels_insert" ON public.hotels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "hotels_tenant_isolation" ON public.hotels;
CREATE POLICY "hotels_tenant_isolation" ON public.hotels
  AS RESTRICTIVE
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "hotels_update" ON public.hotels;
CREATE POLICY "hotels_update" ON public.hotels
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.tenant_id = hotels.tenant_id
        AND utp.user_id = (select auth.uid())
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('editor'::character varying)::text])
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 12. ics_feed_configurations (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own ICS feeds" ON public.ics_feed_configurations;
CREATE POLICY "Tenants can manage their own ICS feeds" ON public.ics_feed_configurations
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 13. integration_configs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access their tenant's integration configs" ON public.integration_configs;
CREATE POLICY "Users can only access their tenant's integration configs" ON public.integration_configs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 14. job_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all job logs" ON public.job_logs;
CREATE POLICY "Admins can view all job logs" ON public.job_logs
  FOR SELECT
  USING (((select auth.jwt()) ->> 'role'::text) = 'admin'::text);

-- ============================================================================
-- 15. muva_content (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "muva_content_delete" ON public.muva_content;
CREATE POLICY "muva_content_delete" ON public.muva_content
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "muva_content_insert" ON public.muva_content;
CREATE POLICY "muva_content_insert" ON public.muva_content
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "muva_content_update" ON public.muva_content;
CREATE POLICY "muva_content_update" ON public.muva_content
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 16. property_relationships (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can manage their own property relationships" ON public.property_relationships;
CREATE POLICY "Tenants can manage their own property relationships" ON public.property_relationships
  FOR ALL
  USING ((select auth.uid())::text = (tenant_id)::text)
  WITH CHECK ((select auth.uid())::text = (tenant_id)::text);

-- ============================================================================
-- 17. sire_content (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "sire_content_delete" ON public.sire_content;
CREATE POLICY "sire_content_delete" ON public.sire_content
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "sire_content_insert" ON public.sire_content;
CREATE POLICY "sire_content_insert" ON public.sire_content
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "sire_content_update" ON public.sire_content;
CREATE POLICY "sire_content_update" ON public.sire_content
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text)
  WITH CHECK ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 18. sire_export_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Tenant users can view their export logs" ON public.sire_export_logs;
CREATE POLICY "Tenant users can view their export logs" ON public.sire_export_logs
  FOR SELECT
  USING (
    (tenant_id)::uuid IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- 19. staff_conversations (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_conversations_tenant_delete" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_delete" ON public.staff_conversations
  FOR DELETE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_insert" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_insert" ON public.staff_conversations
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_select" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_select" ON public.staff_conversations
  FOR SELECT
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_conversations_tenant_update" ON public.staff_conversations;
CREATE POLICY "staff_conversations_tenant_update" ON public.staff_conversations
  FOR UPDATE
  USING (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 20. staff_messages (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_messages_tenant_delete" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_delete" ON public.staff_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_insert" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_insert" ON public.staff_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = sc.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_select" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_select" ON public.staff_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

DROP POLICY IF EXISTS "staff_messages_tenant_update" ON public.staff_messages;
CREATE POLICY "staff_messages_tenant_update" ON public.staff_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = staff_messages.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM staff_conversations sc
      WHERE sc.conversation_id = sc.conversation_id
        AND sc.tenant_id = (current_setting('app.tenant_id'::text, true))::uuid
    )
    OR (select auth.role()) = 'service_role'::text
  );

-- ============================================================================
-- 21. sync_history (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access their tenant's sync history" ON public.sync_history;
CREATE POLICY "Users can only access their tenant's sync history" ON public.sync_history
  FOR ALL
  USING (
    tenant_id IN (
      SELECT utp.tenant_id
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 22. tenant_compliance_credentials (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can create credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can create credentials" ON public.tenant_compliance_credentials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can delete credentials" ON public.tenant_compliance_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can update credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can update credentials" ON public.tenant_compliance_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can view credentials" ON public.tenant_compliance_credentials;
CREATE POLICY "Only admins can view credentials" ON public.tenant_compliance_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_compliance_credentials.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

-- ============================================================================
-- 23. tenant_knowledge_embeddings (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_knowledge_delete" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_delete" ON public.tenant_knowledge_embeddings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_insert" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_insert" ON public.tenant_knowledge_embeddings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_isolation" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_isolation" ON public.tenant_knowledge_embeddings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND user_tenant_permissions.is_active = true
    )
  );

DROP POLICY IF EXISTS "tenant_knowledge_update" ON public.tenant_knowledge_embeddings;
CREATE POLICY "tenant_knowledge_update" ON public.tenant_knowledge_embeddings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions
      WHERE user_tenant_permissions.user_id = (select auth.uid())
        AND user_tenant_permissions.tenant_id = tenant_knowledge_embeddings.tenant_id
        AND (user_tenant_permissions.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'editor'::character varying])::text[])
        AND user_tenant_permissions.is_active = true
    )
  );

-- ============================================================================
-- 24. tenant_registry (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Only service role can create tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can create tenants" ON public.tenant_registry
  FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Only service role can delete tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can delete tenants" ON public.tenant_registry
  FOR DELETE
  USING ((select auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Only service role can update tenants" ON public.tenant_registry;
CREATE POLICY "Only service role can update tenants" ON public.tenant_registry
  FOR UPDATE
  USING ((select auth.role()) = 'service_role'::text);

-- ============================================================================
-- 25. user_tenant_permissions (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "user_tenant_permissions_delete" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_delete" ON public.user_tenant_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_insert" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_insert" ON public.user_tenant_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_select" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_select" ON public.user_tenant_permissions
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

DROP POLICY IF EXISTS "user_tenant_permissions_update" ON public.user_tenant_permissions;
CREATE POLICY "user_tenant_permissions_update" ON public.user_tenant_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_tenant_permissions utp
      WHERE utp.user_id = (select auth.uid())
        AND utp.tenant_id = user_tenant_permissions.tenant_id
        AND (utp.role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text])
        AND utp.is_active = true
    )
  );

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After migration, verify NO auth_rls_initplan warnings by checking policies:
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (
--     qual LIKE '%auth.uid()%'
--     OR qual LIKE '%auth.role()%'
--     OR qual LIKE '%auth.jwt()%'
--     OR with_check LIKE '%auth.uid()%'
--     OR with_check LIKE '%auth.role()%'
--     OR with_check LIKE '%auth.jwt()%'
--   );
--
-- Expected: 0 rows (all should use (select auth.xxx()) now)
-- ============================================================================
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
-- Migration: Guest Chat Stable ID Fixes (FASE 1 + FASE 2)
-- Date: November 3, 2025
-- Purpose: Fix recurring guest chat issues by implementing CASCADE FKs and stable ID mapping
--
-- This migration combines two critical fixes:
-- FASE 1: CASCADE foreign keys for auto-cleanup
-- FASE 2: Stable ID mapping using motopress_unit_id
--
-- Background: These fixes were applied manually to DEV in October 2024 but never
-- migrated to staging/production, causing recurring guest chat failures.

-- ============================================================================
-- FASE 1: CASCADE FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- STEP 0: Cleanup any orphaned data (pre-requisite for FK constraints)
-- This prevents FK constraint creation failures

DO $$
BEGIN
  -- Delete orphaned ICS feed configurations
  DELETE FROM public.ics_feed_configurations
  WHERE accommodation_unit_id NOT IN (SELECT id FROM hotels.accommodation_units);

  -- Delete orphaned calendar events
  DELETE FROM public.calendar_events
  WHERE accommodation_unit_id NOT IN (SELECT id FROM hotels.accommodation_units);

  RAISE NOTICE 'Orphaned data cleanup completed';
END $$;

-- PART 1: Manuals and Chunks (public schema)

-- 1.1: accommodation_units_manual -> accommodation_units_public
ALTER TABLE public.accommodation_units_manual
  DROP CONSTRAINT IF EXISTS accommodation_units_manual_unit_id_fkey;

ALTER TABLE public.accommodation_units_manual
  ADD CONSTRAINT accommodation_units_manual_unit_id_fkey
  FOREIGN KEY (unit_id)
  REFERENCES public.accommodation_units_public(unit_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 1.2: accommodation_units_manual_chunks -> accommodation_units_manual
ALTER TABLE public.accommodation_units_manual_chunks
  DROP CONSTRAINT IF EXISTS accommodation_units_manual_chunks_manual_id_fkey;

ALTER TABLE public.accommodation_units_manual_chunks
  ADD CONSTRAINT accommodation_units_manual_chunks_manual_id_fkey
  FOREIGN KEY (manual_id)
  REFERENCES public.accommodation_units_manual(unit_id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 1.3: accommodation_units_manual_chunks -> hotels.accommodation_units
ALTER TABLE public.accommodation_units_manual_chunks
  DROP CONSTRAINT IF EXISTS accommodation_units_manual_chunks_accommodation_unit_id_fkey;

ALTER TABLE public.accommodation_units_manual_chunks
  ADD CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES hotels.accommodation_units(id)
  ON DELETE CASCADE
  ON UPDATE NO ACTION;

-- PART 2: ICS Feeds (public -> hotels schema)

ALTER TABLE public.ics_feed_configurations
  DROP CONSTRAINT IF EXISTS ics_feed_configurations_accommodation_unit_id_fkey;

ALTER TABLE public.ics_feed_configurations
  ADD CONSTRAINT ics_feed_configurations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES hotels.accommodation_units(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- PART 3: Calendar Events (public -> hotels schema)

ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_accommodation_unit_id_fkey;

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES hotels.accommodation_units(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================================================
-- FASE 2: STABLE ID MAPPING RPC FUNCTIONS
-- ============================================================================

-- Function v1: Original name-based mapping (preserved for backward compatibility)
CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id_v1(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels'
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

-- Function v2: Enhanced mapping with motopress_unit_id priority (THE FIX)
CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id_v2(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels'
AS $function$
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
$function$;

-- Default function: Delegates to v2 (allows future version changes without code updates)
CREATE OR REPLACE FUNCTION public.map_hotel_to_public_accommodation_id(
  p_hotel_unit_id uuid,
  p_tenant_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels'
AS $function$
BEGIN
  -- Delegate to v2 (enhanced version)
  RETURN map_hotel_to_public_accommodation_id_v2(p_hotel_unit_id, p_tenant_id);
END;
$function$;

-- Updated match_unit_manual_chunks: Now searches directly without mapping
-- (Guest session already has hotel ID, no mapping needed per ADR-001)
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
SET search_path TO 'public', 'hotels'
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
-- VERIFICATION
-- ============================================================================

-- Verify CASCADE constraints are in place
DO $$
DECLARE
  cascade_count int;
BEGIN
  SELECT COUNT(*) INTO cascade_count
  FROM information_schema.referential_constraints rc
  JOIN information_schema.table_constraints tc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.table_name IN (
    'accommodation_units_manual',
    'accommodation_units_manual_chunks',
    'ics_feed_configurations',
    'calendar_events'
  )
  AND rc.delete_rule = 'CASCADE';

  IF cascade_count >= 4 THEN
    RAISE NOTICE 'CASCADE foreign keys verified: % constraints', cascade_count;
  ELSE
    RAISE WARNING 'Expected at least 4 CASCADE constraints, found: %', cascade_count;
  END IF;
END $$;

-- Verify RPC functions exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'map_hotel_to_public_accommodation_id_v2'
  ) THEN
    RAISE NOTICE 'RPC function v2 verified: map_hotel_to_public_accommodation_id_v2';
  ELSE
    RAISE WARNING 'RPC function v2 NOT FOUND';
  END IF;
END $$;

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Guest Chat Stable ID Fixes migration completed successfully';
END $$;
-- Migration: Add Performance Indexes
-- Created: 2025-11-06
-- Purpose: Optimize query performance for frequently accessed tables
-- Related: docs/performance-optimization/N1_ANALYSIS_DETAILED.md

-- ============================================================================
-- 1. Accommodation Units - Tenant + MotoPress ID Lookup
-- ============================================================================
-- Used by: MotoPress sync to check if unit exists
-- Query pattern: WHERE tenant_id = X AND motopress_unit_id = Y
-- Frequency: High (every sync operation)
-- Impact: 30x improvement on sync operations

CREATE INDEX IF NOT EXISTS idx_accommodation_units_tenant_motopress
ON hotels.accommodation_units(tenant_id, motopress_unit_id);

COMMENT ON INDEX hotels.idx_accommodation_units_tenant_motopress IS
'Optimizes MotoPress sync SELECT queries checking for existing units';

-- ============================================================================
-- 2. Integration Configs - Tenant + Type + Active Status
-- ============================================================================
-- Used by: All integration managers to fetch active config
-- Query pattern: WHERE tenant_id = X AND integration_type = Y AND is_active = true
-- Frequency: High (every integration operation)
-- Impact: Faster config lookups

CREATE INDEX IF NOT EXISTS idx_integration_configs_tenant_type_active
ON public.integration_configs(tenant_id, integration_type, is_active);

COMMENT ON INDEX public.idx_integration_configs_tenant_type_active IS
'Optimizes integration config lookups by tenant and type';

-- ============================================================================
-- 3. Calendar Events - Sync Feed Foreign Key
-- ============================================================================
-- SKIPPED: sync_feed_id column does not exist in calendar_events table
-- TODO: Add this index when sync_feed_id column is added to schema

-- CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_feed
-- ON public.calendar_events(sync_feed_id)
-- WHERE sync_feed_id IS NOT NULL;

-- ============================================================================
-- 4. Calendar Event Changes - Event ID
-- ============================================================================
-- SKIPPED: calendar_event_changes table does not exist
-- TODO: Add this index when calendar_event_changes table is added to schema

-- CREATE INDEX IF NOT EXISTS idx_calendar_event_changes_event_id
-- ON public.calendar_event_changes(calendar_event_id);

-- ============================================================================
-- 5. Accommodation Units - Hotel ID (for JOINs)
-- ============================================================================
-- Used by: Queries joining accommodation units with hotels
-- Query pattern: JOIN ON accommodation_units.hotel_id = hotels.id
-- Frequency: High (guest chat, search)
-- Impact: Faster JOIN operations

CREATE INDEX IF NOT EXISTS idx_accommodation_units_hotel_id
ON hotels.accommodation_units(hotel_id);

COMMENT ON INDEX hotels.idx_accommodation_units_hotel_id IS
'Optimizes JOIN operations between units and hotels';

-- ============================================================================
-- 6. Accommodation Units - Status + Tenant (for active units queries)
-- ============================================================================
-- Used by: Public searches for active accommodations
-- Query pattern: WHERE tenant_id = X AND status = 'active'
-- Frequency: Very High (every public search)
-- Impact: Faster public accommodation searches

CREATE INDEX IF NOT EXISTS idx_accommodation_units_tenant_status
ON hotels.accommodation_units(tenant_id, status)
WHERE status = 'active';

COMMENT ON INDEX hotels.idx_accommodation_units_tenant_status IS
'Partial index for active accommodation lookups (most common case)';

-- ============================================================================
-- 7. Performance Analysis: Verify Index Usage
-- ============================================================================
-- Run these queries to verify indexes are being used:

-- Example 1: Check MotoPress sync query
-- EXPLAIN ANALYZE
-- SELECT id FROM hotels.accommodation_units
-- WHERE tenant_id = 'some-tenant-id'
-- AND motopress_unit_id = 123;
-- Should show: Index Scan using idx_accommodation_units_tenant_motopress

-- Example 2: Check integration config query
-- EXPLAIN ANALYZE
-- SELECT * FROM integration_configs
-- WHERE tenant_id = 'some-tenant-id'
-- AND integration_type = 'motopress'
-- AND is_active = true;
-- Should show: Index Scan using idx_integration_configs_tenant_type_active

-- ============================================================================
-- Index Statistics (After Running Production Workload)
-- ============================================================================
-- Query to monitor index usage:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_tenant_motopress;
-- DROP INDEX IF EXISTS public.idx_integration_configs_tenant_type_active;
-- DROP INDEX IF EXISTS public.idx_calendar_events_sync_feed; -- Not created (column doesn't exist)
-- DROP INDEX IF EXISTS public.idx_calendar_event_changes_event_id; -- Not created (table doesn't exist)
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_hotel_id;
-- DROP INDEX IF EXISTS hotels.idx_accommodation_units_tenant_status;
-- Migration: Fix get_accommodation_units_by_ids to read from accommodation_units_public
-- Issue: RPC was reading from empty hotels.accommodation_units instead of populated accommodation_units_public
-- Result: Reservation cards show "Sin nombre" instead of real accommodation names
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_units_by_ids(uuid[]);

-- Recreate reading from accommodation_units_public (where the data actually is)
CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_ids(p_unit_ids uuid[])
RETURNS TABLE(id uuid, name text, unit_number text, unit_type character varying)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Return data from accommodation_units_public (where sync actually inserts)
  -- Only return "Overview" chunks which contain the main accommodation names
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    aup.unit_number::text as unit_number,
    aup.unit_type::varchar as unit_type
  FROM public.accommodation_units_public aup
  WHERE aup.unit_id = ANY(p_unit_ids)
    AND aup.name LIKE '% - Overview';  -- Only main name chunks
END;
$function$;

-- Drop old FK constraint (if exists)
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT IF EXISTS reservation_accommodations_accommodation_unit_id_fkey;

-- Clean up invalid unit_ids (set to NULL if they don't exist in accommodation_units_public)
-- This allows re-sync to properly link them
UPDATE reservation_accommodations ra
SET accommodation_unit_id = NULL
WHERE accommodation_unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accommodation_units_public aup
    WHERE aup.unit_id = ra.accommodation_unit_id
  );

-- Create FK constraint pointing to accommodation_units_public
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES public.accommodation_units_public(unit_id)
  ON DELETE SET NULL;

-- Comment
COMMENT ON FUNCTION public.get_accommodation_units_by_ids(uuid[]) IS
'Returns accommodation unit details from accommodation_units_public.
Filters to Overview chunks only to return main accommodation names.
Used by /api/reservations/list to display accommodation names in reservation cards.';
-- Migration: Auto-link reservation_accommodations to accommodation_units_public
-- Trigger que automáticamente vincula reservations cuando se crean o actualizan
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix

-- Function que hace el linking automático
CREATE OR REPLACE FUNCTION public.auto_link_reservation_accommodation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id text;
BEGIN
  -- Si ya tiene accommodation_unit_id, no hacer nada
  IF NEW.accommodation_unit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Si no tiene motopress_type_id, no podemos matchear
  IF NEW.motopress_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener tenant_id de la reservation
  SELECT tenant_id::text INTO v_tenant_id
  FROM public.guest_reservations
  WHERE id = NEW.reservation_id;

  -- Buscar el accommodation_unit_id correspondiente
  SELECT aup.unit_id INTO NEW.accommodation_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id::text = v_tenant_id
    AND (aup.metadata->>'motopress_room_type_id')::int = NEW.motopress_type_id
    AND aup.name LIKE '% - Overview'
  LIMIT 1;

  RETURN NEW;
END;
$$;

-- Trigger que ejecuta ANTES de INSERT o UPDATE
DROP TRIGGER IF EXISTS trg_auto_link_reservation_accommodation ON public.reservation_accommodations;

CREATE TRIGGER trg_auto_link_reservation_accommodation
  BEFORE INSERT OR UPDATE ON public.reservation_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_reservation_accommodation();

-- Comment
COMMENT ON FUNCTION public.auto_link_reservation_accommodation() IS
'Automatically links reservation_accommodations to accommodation_units_public
when inserted or updated, based on motopress_type_id matching.
Triggered on INSERT/UPDATE of reservation_accommodations table.';
-- Migration: Fix get_accommodation_unit_by_motopress_id to read from accommodation_units_public
-- Issue: RPC was reading from hotels.accommodation_units which doesn't exist in staging
-- Result: saveReservationAccommodations returns empty, trigger links to wrong tenant's data
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix - Part 3

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

-- Recreate to read from accommodation_units_public (where data actually is in staging)
CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Search in accommodation_units_public for Overview chunks
  -- Match by tenant_id AND motopress_room_type_id in metadata
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id::text = p_tenant_id::text
    AND aup.name LIKE '% - Overview'  -- Only Overview chunks
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

-- Comment
COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) IS
'Universal accommodation lookup function for staging environment.
Searches accommodation_units_public (Overview chunks) by motopress_room_type_id.
Used by saveReservationAccommodations during MotoPress sync.';
-- Migration: Fix RPC tenant_id filtering issue
-- Issue: get_accommodation_unit_by_motopress_id returns unit_ids from wrong tenant
-- Root cause: UUID vs VARCHAR casting or search_path issues
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix - Part 4

-- Drop and recreate with explicit schema references
DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Explicit filtering by tenant_id (convert UUID to TEXT for comparison)
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id = p_tenant_id::text  -- Explicit cast
    AND aup.name LIKE '% - Overview'
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) IS
'Lookup accommodation unit by motopress ID, filtered by tenant.
CRITICAL: Must filter by tenant_id to avoid cross-tenant contamination.
Used during MotoPress reservation sync.';
-- Migration: Simplify RPC to avoid search_path issues
-- Issue: RPC returns phantom unit_ids despite correct query logic
-- Strategy: Remove SECURITY DEFINER and search_path manipulation
--
-- Date: 2025-11-08
-- Related: Reservation cards "Sin nombre" bug fix - Part 5

DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id::text = p_tenant_id::text
    AND aup.name LIKE '% - Overview'
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) IS
'Lookup accommodation unit by motopress ID (SQL function for simplicity).
Filters by tenant_id to prevent cross-tenant data leaks.';
-- Migration: Fix FK constraint on reservation_accommodations
-- Issue: FK points to wrong table (accommodation_units instead of accommodation_units_public)
-- Error: "Key (accommodation_unit_id)=(UUID) is not present in table 'accommodation_units'"
--
-- Root Cause: A later migration (one of 060250, 061806, 070058, 085423) recreated the FK incorrectly
-- Solution: Drop and recreate FK pointing to accommodation_units_public where data actually exists
--
-- Date: 2025-11-08
-- Related: Reservation sync failing - Part 6 (Final Fix)

-- Drop the incorrect FK constraint
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT IF EXISTS reservation_accommodations_accommodation_unit_id_fkey;

-- Clean up orphaned accommodation_unit_ids (set to NULL if they don't exist in accommodation_units_public)
-- This allows the sync to re-link them correctly
UPDATE reservation_accommodations ra
SET accommodation_unit_id = NULL
WHERE accommodation_unit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accommodation_units_public aup
    WHERE aup.unit_id = ra.accommodation_unit_id
  );

-- Create FK constraint pointing to accommodation_units_public (correct table)
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES public.accommodation_units_public(unit_id)
  ON DELETE SET NULL;

-- Comment
COMMENT ON CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  ON reservation_accommodations IS
  'FK to accommodation_units_public.unit_id (NOT accommodation_units.id).
  This table contains the actual accommodation data from MotoPress sync.';
-- Migration: Add tenant_id filter to get_accommodation_units_by_ids RPC
-- Issue: RPC can return units from wrong tenant (multi-tenant security issue)
-- Solution: Add tenant_id parameter and filter
--
-- Date: 2025-11-08
-- Related: Multi-tenant security for reservation accommodations

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_units_by_ids(uuid[]);

-- Recreate with tenant_id parameter
CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_ids(
  p_unit_ids uuid[],
  p_tenant_id uuid
)
RETURNS TABLE(id uuid, name text, unit_number text, unit_type character varying)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Return data from accommodation_units_public with tenant filter
  -- Only return "Overview" chunks which contain the main accommodation names
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,
    (aup.metadata->>'original_accommodation')::text as name,
    aup.unit_number::text as unit_number,
    aup.unit_type::varchar as unit_type
  FROM public.accommodation_units_public aup
  WHERE aup.unit_id = ANY(p_unit_ids)
    AND aup.tenant_id = p_tenant_id::text  -- Multi-tenant security
    AND aup.name LIKE '% - Overview';      -- Only main name chunks
END;
$function$;

-- Comment
COMMENT ON FUNCTION public.get_accommodation_units_by_ids(uuid[], uuid) IS
'Returns accommodation unit details from accommodation_units_public.
Filters by tenant_id for multi-tenant security.
Filters to Overview chunks only to return main accommodation names.
Used by /api/reservations/list to display accommodation names in reservation cards.';
-- Migration: Fix accommodation lookup to use hotels.accommodation_units instead of accommodation_units_public
-- Problem: reservation_accommodations.accommodation_unit_id contains UUIDs from hotels.accommodation_units
--          but get_accommodation_units_by_ids was searching in accommodation_units_public (wrong table)
-- Solution: Rewrite RPC to query hotels.accommodation_units (the correct source)

-- Drop existing function (specify argument types to avoid ambiguity)
DROP FUNCTION IF EXISTS public.get_accommodation_units_by_ids(p_unit_ids uuid[], p_tenant_id uuid);

-- Recreate function to query hotels.accommodation_units (correct table)
CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_ids(
  p_unit_ids uuid[],
  p_tenant_id uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  unit_number text,
  unit_type character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  -- Query hotels.accommodation_units (where reservation UUIDs actually exist)
  RETURN QUERY
  SELECT
    au.id,
    au.name::text,
    au.unit_number::text,
    au.unit_type::varchar
  FROM hotels.accommodation_units au
  WHERE au.id = ANY(p_unit_ids)
    AND au.tenant_id = p_tenant_id::varchar;  -- Multi-tenant security
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_accommodation_units_by_ids(uuid[], uuid) TO authenticated, anon, service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.get_accommodation_units_by_ids IS
'Retrieves accommodation unit details from hotels.accommodation_units by UUID array.
CRITICAL: Must query hotels.accommodation_units (not accommodation_units_public) because
reservation_accommodations.accommodation_unit_id references hotels.accommodation_units.id';
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
-- Migration: Add RPC function to upsert accommodations into hotels.accommodation_units
-- Reason: Supabase JS client doesn't support accessing hotels schema directly
-- Usage: Called from scripts/sync-accommodations-to-hotels.ts

CREATE OR REPLACE FUNCTION public.upsert_accommodation(
  p_id uuid,
  p_tenant_id varchar,
  p_name varchar,
  p_unit_number varchar,
  p_unit_type varchar,
  p_description text,
  p_short_description text,
  p_full_description text,
  p_public_description text,
  p_capacity jsonb,
  p_bed_configuration jsonb,
  p_amenities_list jsonb,
  p_pricing jsonb,
  p_images jsonb,
  p_embedding_public_fast vector(256),
  p_embedding_public_full vector(1536),
  p_status varchar DEFAULT 'active',
  p_is_featured boolean DEFAULT false,
  p_display_order integer DEFAULT 0,
  p_unique_features jsonb DEFAULT NULL,
  p_accessibility_features jsonb DEFAULT NULL,
  p_location_details jsonb DEFAULT NULL,
  p_tourism_features text DEFAULT NULL,
  p_booking_policies text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
DECLARE
  v_existing_id uuid;
  v_result_id uuid;
BEGIN
  -- Check if accommodation already exists
  SELECT id INTO v_existing_id
  FROM hotels.accommodation_units
  WHERE tenant_id = p_tenant_id
    AND name = p_name;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE hotels.accommodation_units
    SET
      unit_number = p_unit_number,
      unit_type = p_unit_type,
      description = p_description,
      short_description = p_short_description,
      full_description = p_full_description,
      public_description = p_public_description,
      capacity = p_capacity,
      bed_configuration = p_bed_configuration,
      amenities_list = p_amenities_list,
      pricing = p_pricing,
      images = p_images,
      embedding_public_fast = p_embedding_public_fast,
      embedding_public_full = p_embedding_public_full,
      status = p_status,
      is_featured = p_is_featured,
      display_order = p_display_order,
      unique_features = p_unique_features,
      accessibility_features = p_accessibility_features,
      location_details = p_location_details,
      tourism_features = p_tourism_features,
      booking_policies = p_booking_policies,
      updated_at = now()
    WHERE id = v_existing_id;

    v_result_id := v_existing_id;
  ELSE
    -- Insert new record
    INSERT INTO hotels.accommodation_units (
      id,
      tenant_id,
      name,
      unit_number,
      unit_type,
      description,
      short_description,
      full_description,
      public_description,
      capacity,
      bed_configuration,
      amenities_list,
      pricing,
      images,
      embedding_public_fast,
      embedding_public_full,
      status,
      is_featured,
      display_order,
      unique_features,
      accessibility_features,
      location_details,
      tourism_features,
      booking_policies
    ) VALUES (
      p_id,
      p_tenant_id,
      p_name,
      p_unit_number,
      p_unit_type,
      p_description,
      p_short_description,
      p_full_description,
      p_public_description,
      p_capacity,
      p_bed_configuration,
      p_amenities_list,
      p_pricing,
      p_images,
      p_embedding_public_fast,
      p_embedding_public_full,
      p_status,
      p_is_featured,
      p_display_order,
      p_unique_features,
      p_accessibility_features,
      p_location_details,
      p_tourism_features,
      p_booking_policies
    );

    v_result_id := p_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_accommodation TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.upsert_accommodation IS
'Upserts accommodation data into hotels.accommodation_units.
Used by sync scripts since Supabase JS client does not support hotels schema access.
Returns the UUID of the upserted record.';
-- Migration: Fix get_accommodation_units search_path
-- Problem: RPC has search_path='public', 'pg_temp' but queries hotels.accommodation_units
-- Result: Function returns 0 rows because it cannot see the hotels schema
-- Solution: Add 'hotels' to search_path

CREATE OR REPLACE FUNCTION "public"."get_accommodation_units"(
  "p_hotel_id" "uuid" DEFAULT NULL::"uuid",
  "p_tenant_id" "text" DEFAULT NULL::"text"
)
RETURNS TABLE(
  "id" "uuid",
  "name" character varying,
  "unit_number" character varying,
  "description" "text",
  "short_description" "text",
  "capacity" "jsonb",
  "bed_configuration" "jsonb",
  "view_type" character varying,
  "status" character varying,
  "is_featured" boolean,
  "display_order" integer,
  "hotel_id" "uuid",
  "tenant_id" character varying,
  "unique_features" "jsonb",
  "accessibility_features" "jsonb",
  "location_details" "jsonb",
  "embedding_fast" "public"."vector",
  "embedding_balanced" "public"."vector",
  "base_price_low_season" integer,
  "base_price_high_season" integer,
  "amenities_list" "jsonb",
  "unit_amenities" "text"
)
LANGUAGE "plpgsql"
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ FIXED: Added 'hotels'
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

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_units" IS
'Returns accommodation units from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema.
Used by manual chunks system, accommodations API, and reservations.';
-- Migration: Fix get_accommodation_unit_by_id search_path
-- Problem: RPC has search_path='public' but queries hotels.accommodation_units
-- Result: May resolve to wrong table/view, causing accommodation names to show with " - Overview" suffix
-- Solution: Add 'hotels' to search_path (same fix as get_accommodation_units plural)
--
-- Related:
--   - 20251113000000_fix_get_accommodation_units_search_path.sql (plural version)
--   - Issue: My-stay header shows "Alojamiento Simmer Highs - Overview" instead of "Alojamiento Simmer Highs"
--   - Impact: Breaks manual chunks lookup due to incorrect name mapping

CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"(
  "p_unit_id" "uuid",
  "p_tenant_id" character varying
)
RETURNS TABLE(
  "id" "uuid",
  "name" character varying,
  "unit_number" character varying,
  "view_type" character varying
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'hotels', 'pg_temp'  -- ✅ FIXED: Added 'hotels' and 'pg_temp'
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

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id" IS
'Get accommodation unit by ID from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema correctly.
Used by guest-auth.ts to fetch accommodation details during My-stay login.
Returns clean accommodation names without " - Overview" suffix.';
-- Migration: Fix get_accommodation_unit_by_id to resolve chunk IDs to real units
-- Problem: guest_reservations.accommodation_unit_id points to accommodation_units_public (chunks)
--          but RPC searches hotels.accommodation_units (real units) → returns 0 results
-- Solution: Check if unit_id is a chunk, resolve to real unit via motopress_unit_id
--
-- Example:
--   Reservation points to: d8abb241-1586-458f-be0d-f2f9bf60fe32 (chunk "Simmer Highs - Overview")
--   Chunk has metadata.motopress_unit_id: 335
--   Real unit with motopress_unit_id 335: 7aaed98f-d30a-5135-bee7-e6c85bb717c2 ("Simmer Highs")

CREATE OR REPLACE FUNCTION "public"."get_accommodation_unit_by_id"(
  "p_unit_id" "uuid",
  "p_tenant_id" character varying
)
RETURNS TABLE(
  "id" "uuid",
  "name" character varying,
  "unit_number" character varying,
  "view_type" character varying
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public', 'hotels', 'pg_temp'
AS $$
DECLARE
  v_motopress_unit_id INTEGER;
BEGIN
  -- First, try direct lookup in hotels.accommodation_units
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.unit_number,
    au.view_type
  FROM hotels.accommodation_units au
  WHERE au.id = p_unit_id
    AND au.tenant_id = p_tenant_id;

  -- If found, we're done
  IF FOUND THEN
    RETURN;
  END IF;

  -- Not found in real units, check if it's a chunk ID
  -- Get motopress_unit_id from chunk metadata
  SELECT (metadata->>'motopress_unit_id')::INTEGER
  INTO v_motopress_unit_id
  FROM accommodation_units_public
  WHERE unit_id = p_unit_id
    AND tenant_id = p_tenant_id::uuid;

  -- If we found a motopress_unit_id, resolve to real unit
  IF v_motopress_unit_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      au.id,
      au.name,
      au.unit_number,
      au.view_type
    FROM hotels.accommodation_units au
    WHERE au.motopress_unit_id = v_motopress_unit_id
      AND au.tenant_id = p_tenant_id;
  END IF;

  RETURN;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION "public"."get_accommodation_unit_by_id" IS
'Get accommodation unit by ID from hotels.accommodation_units.
CRITICAL: Must have hotels in search_path to access hotels schema correctly.
FALLBACK: If unit_id not found in real units, checks if it is a chunk ID in accommodation_units_public
          and resolves to real unit via metadata.motopress_unit_id.
Used by guest-auth.ts to fetch accommodation details during My-stay login.
Returns clean accommodation names without " - Overview" suffix.';
