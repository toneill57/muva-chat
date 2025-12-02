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
