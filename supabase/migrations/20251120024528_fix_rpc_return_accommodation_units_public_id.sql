-- Migration: Fix get_accommodation_unit_by_motopress_id to return accommodation_units_public.unit_id
-- Problem: FK constraint points to accommodation_units_public.unit_id, but RPC was returning hotels.accommodation_units.id
-- Error: Foreign key constraint violation when sync tries to insert reservation_accommodations
--
-- Root Cause Timeline:
-- - Nov 8 (20251108200000): FK changed to point to accommodation_units_public.unit_id
-- - Nov 17 (20251117171052): RPC changed to return hotels.accommodation_units.id (CONFLICT!)
-- - Result: IDs don't match → insert fails with FK violation
--
-- Solution: Revert RPC to return accommodation_units_public.unit_id (aligns with FK)
--
-- Date: 2025-11-19
-- Impact: Fixes automatic reservation linking during MotoPress sync

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_accommodation_unit_by_motopress_id(uuid, integer);

-- Recreate to return accommodation_units_public.unit_id (matches FK constraint)
CREATE OR REPLACE FUNCTION public.get_accommodation_unit_by_motopress_id(
  p_tenant_id uuid,
  p_motopress_type_id integer
)
RETURNS TABLE(
  id uuid,              -- Returns accommodation_units_public.unit_id (NOT hotels.accommodation_units.id)
  name text,
  motopress_type_id integer,
  motopress_unit_id integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  -- Query accommodation_units_public to get unit_id that matches FK constraint
  RETURN QUERY
  SELECT DISTINCT
    aup.unit_id as id,                                    -- CRITICAL: unit_id for FK compatibility
    (aup.metadata->>'original_accommodation')::text as name,
    (aup.metadata->>'motopress_room_type_id')::int as motopress_type_id,
    (aup.metadata->>'motopress_unit_id')::int as motopress_unit_id
  FROM public.accommodation_units_public aup
  WHERE aup.tenant_id = p_tenant_id::text
    AND aup.name LIKE '% - Overview'
    AND (
      (aup.metadata->>'motopress_room_type_id')::int = p_motopress_type_id
      OR (aup.metadata->>'motopress_unit_id')::int = p_motopress_type_id
    )
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_accommodation_unit_by_motopress_id(uuid, integer) TO authenticated, anon, service_role;

-- Add explanatory comment
COMMENT ON FUNCTION public.get_accommodation_unit_by_motopress_id IS
'Lookup accommodation unit by MotoPress type ID from accommodation_units_public.
CRITICAL: Returns unit_id (NOT hotels.accommodation_units.id) to match FK constraint in reservation_accommodations.
FK: reservation_accommodations.accommodation_unit_id -> accommodation_units_public.unit_id';
