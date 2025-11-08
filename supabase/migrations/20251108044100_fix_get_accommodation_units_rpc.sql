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

-- Update FK constraint to point to accommodation_units_public
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT IF EXISTS reservation_accommodations_accommodation_unit_id_fkey;

ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
  FOREIGN KEY (accommodation_unit_id)
  REFERENCES public.accommodation_units_public(unit_id)
  ON DELETE SET NULL;

-- Link existing reservations to their accommodations
UPDATE reservation_accommodations ra
SET accommodation_unit_id = (
  SELECT aup.unit_id
  FROM public.accommodation_units_public aup
  INNER JOIN guest_reservations r ON r.tenant_id::text = aup.tenant_id::text
  WHERE ra.reservation_id = r.id
    AND (aup.metadata->>'motopress_room_type_id')::int = ra.motopress_type_id
    AND aup.name LIKE '% - Overview'
  LIMIT 1
)
WHERE ra.accommodation_unit_id IS NULL
  AND ra.motopress_type_id IS NOT NULL;

-- Comment
COMMENT ON FUNCTION public.get_accommodation_units_by_ids(uuid[]) IS
'Returns accommodation unit details from accommodation_units_public.
Filters to Overview chunks only to return main accommodation names.
Used by /api/reservations/list to display accommodation names in reservation cards.';
