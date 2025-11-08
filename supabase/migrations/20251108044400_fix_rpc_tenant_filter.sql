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
