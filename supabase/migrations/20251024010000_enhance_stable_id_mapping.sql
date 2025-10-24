-- Migration: Enhanced Stable ID Mapping
-- Date: 2025-10-24
-- Purpose: Prioritize motopress_unit_id for unit recognition
-- Reference: docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md (Opción A)

-- ============================================================
-- PART 1: Enhanced ID Mapping Function (v2)
-- ============================================================

CREATE OR REPLACE FUNCTION map_hotel_to_public_accommodation_id_v2(
  p_hotel_unit_id uuid,
  p_tenant_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
DECLARE
  v_motopress_id text;
  v_hotel_name text;
  v_public_unit_id uuid;
BEGIN
  -- PRIORITY 1: Search by motopress_unit_id (MOST STABLE)
  -- This is the stable identifier from MotoPress that persists across recreations
  SELECT metadata->>'motopress_unit_id' INTO v_motopress_id
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id
    AND tenant_id::text = p_tenant_id;

  IF v_motopress_id IS NOT NULL THEN
    SELECT unit_id INTO v_public_unit_id
    FROM accommodation_units_public
    WHERE tenant_id::text = p_tenant_id
      AND metadata->>'motopress_unit_id' = v_motopress_id
    LIMIT 1;

    IF v_public_unit_id IS NOT NULL THEN
      RETURN v_public_unit_id;
    END IF;
  END IF;

  -- PRIORITY 2: Search by name (FALLBACK)
  -- Fallback to name-based matching for units without motopress_unit_id
  SELECT name INTO v_hotel_name
  FROM hotels.accommodation_units
  WHERE id = p_hotel_unit_id
    AND tenant_id::text = p_tenant_id;

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

COMMENT ON FUNCTION map_hotel_to_public_accommodation_id_v2 IS
  'Maps hotel UUID to public UUID prioritizing stable motopress_unit_id over name matching. Returns: (1) match by motopress_unit_id, (2) fallback to name match, (3) original ID if no match.';

-- ============================================================
-- PART 2: Update match_unit_manual_chunks to use v2
-- ============================================================

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
DECLARE
  v_public_unit_id uuid;
  v_tenant_id text;
BEGIN
  -- Step 1: Check if input ID exists directly in accommodation_units_public
  SELECT aup.unit_id INTO v_public_unit_id
  FROM accommodation_units_public aup
  WHERE aup.unit_id = p_accommodation_unit_id
  LIMIT 1;

  -- Step 2: If not found, assume it's a hotel ID and map using v2
  IF v_public_unit_id IS NULL THEN
    -- Get tenant_id from hotel unit
    SELECT hu.tenant_id INTO v_tenant_id
    FROM hotels.accommodation_units hu
    WHERE hu.id = p_accommodation_unit_id
    LIMIT 1;

    -- Map using v2 (prioritizes motopress_unit_id)
    IF v_tenant_id IS NOT NULL THEN
      v_public_unit_id := map_hotel_to_public_accommodation_id_v2(
        p_accommodation_unit_id,
        v_tenant_id
      );
    ELSE
      -- If no tenant found, use original ID as-is
      v_public_unit_id := p_accommodation_unit_id;
    END IF;
  END IF;

  -- Step 3: Return chunks using mapped ID
  RETURN QUERY
  SELECT
    aumc.id,
    aumc.manual_id,
    aumc.chunk_content,
    aumc.chunk_index,
    aumc.section_title,
    1 - (aumc.embedding_balanced <=> query_embedding) AS similarity
  FROM accommodation_units_manual_chunks aumc
  WHERE aumc.accommodation_unit_id = v_public_unit_id
    AND 1 - (aumc.embedding_balanced <=> query_embedding) > match_threshold
  ORDER BY aumc.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_unit_manual_chunks IS
  'Search manual chunks using stable ID mapping (v2). Handles both hotel and public UUIDs, prioritizing motopress_unit_id for robust mapping across unit recreations.';

-- ============================================================
-- PART 3: Create backward-compatible alias (keeps v1 available)
-- ============================================================

-- Keep original function as v1 for reference/rollback
CREATE OR REPLACE FUNCTION map_hotel_to_public_accommodation_id_v1(
  p_hotel_unit_id uuid,
  p_tenant_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
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

COMMENT ON FUNCTION map_hotel_to_public_accommodation_id_v1 IS
  'Original mapping function (name-based only). Kept for reference and rollback purposes.';

-- Update default function to point to v2
CREATE OR REPLACE FUNCTION map_hotel_to_public_accommodation_id(
  p_hotel_unit_id uuid,
  p_tenant_id text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
BEGIN
  -- Delegate to v2 (enhanced version)
  RETURN map_hotel_to_public_accommodation_id_v2(p_hotel_unit_id, p_tenant_id);
END;
$$;

COMMENT ON FUNCTION map_hotel_to_public_accommodation_id IS
  'Default ID mapping function (currently delegates to v2). Use this in application code for automatic version updates.';
