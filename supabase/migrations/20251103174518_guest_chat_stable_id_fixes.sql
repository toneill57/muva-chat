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
