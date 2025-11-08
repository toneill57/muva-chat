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
