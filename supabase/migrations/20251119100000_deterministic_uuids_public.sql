-- Migration: Add deterministic UUID generation for accommodation_units_public
-- Problem: accommodation_units_public uses gen_random_uuid(), breaking FK stability after DB rebuilds
-- Solution: Create deterministic UUID v5 function matching hotels.generate_deterministic_uuid pattern
--
-- Date: 2025-11-19

-- Create deterministic UUID function for public schema
CREATE OR REPLACE FUNCTION public.generate_accommodation_public_uuid(
  p_tenant_id uuid,
  p_motopress_unit_id integer
) RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
BEGIN
  -- Validate inputs
  IF p_tenant_id IS NULL OR p_motopress_unit_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id and motopress_unit_id cannot be NULL';
  END IF;

  -- Generate deterministic UUID using namespace + composite key
  -- SAME namespace as hotels.generate_deterministic_uuid for consistency
  RETURN extensions.uuid_generate_v5(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,  -- Fixed namespace for accommodations
    p_tenant_id::text || ':motopress:' || p_motopress_unit_id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_accommodation_public_uuid(uuid, integer) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.generate_accommodation_public_uuid IS
'Generates deterministic UUID v5 for accommodation_units_public based on tenant_id and motopress_unit_id.
Uses SAME namespace and pattern as hotels.generate_deterministic_uuid() to ensure consistency.
Same inputs always produce same UUID, ensuring FK stability across database rebuilds.
RFC 4122 compliant.';
