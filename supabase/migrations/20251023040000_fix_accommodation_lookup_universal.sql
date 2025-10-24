-- Migration: Fix accommodation lookup to work with both type_id and unit_id
-- Date: 2025-10-23
-- Purpose: Make RPC work for all tenants regardless of which MotoPress field is populated
--
-- Problem: Some tenants have motopress_type_id populated, others have motopress_unit_id
-- Solution: Search by BOTH fields to ensure universal compatibility

DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id UUID,
  p_motopress_type_id INTEGER
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  motopress_type_id INTEGER,
  motopress_unit_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hotels, public
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

-- Add function comment
COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id(UUID, INTEGER) IS
'Universal accommodation lookup function. Searches by both motopress_type_id and motopress_unit_id to support all tenant configurations. Returns the first match found.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(UUID, INTEGER) TO service_role;
