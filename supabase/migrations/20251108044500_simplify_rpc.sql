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
