-- Migration: Create get_real_accommodation_units_by_tenant RPC function
-- Date: 2025-10-23
-- Purpose: Query real accommodation units from hotels.accommodation_units schema
--          (not documentation chunks from accommodation_units_public)
--
-- This function enables cross-schema access for ICS feed configuration,
-- ensuring dropdowns show only real, bookable units that exist in the system.

CREATE OR REPLACE FUNCTION public.get_real_accommodation_units_by_tenant(
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  tenant_id VARCHAR,
  name VARCHAR,
  unit_number VARCHAR,
  unit_type VARCHAR,
  description TEXT,
  short_description TEXT,
  capacity JSONB,
  bed_configuration JSONB,
  size_m2 INTEGER,
  view_type VARCHAR,
  images JSONB,
  motopress_type_id INTEGER,
  motopress_unit_id INTEGER,
  status VARCHAR,
  is_featured BOOLEAN,
  display_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
BEGIN
  -- Query real accommodation units from hotels.accommodation_units
  -- SECURITY DEFINER allows cross-schema access despite RLS policies
  RETURN QUERY
  SELECT
    au.id,
    au.tenant_id,
    au.name,
    au.unit_number,
    au.unit_type,
    au.description,
    au.short_description,
    au.capacity,
    au.bed_configuration,
    au.size_m2,
    au.view_type,
    au.images,
    au.motopress_type_id,
    au.motopress_unit_id,
    au.status,
    au.is_featured,
    au.display_order,
    au.created_at,
    au.updated_at
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = p_tenant_id::varchar
  ORDER BY
    COALESCE(au.display_order, 999) ASC,
    au.name ASC;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_real_accommodation_units_by_tenant(UUID) IS
'Fetches real accommodation units from hotels.accommodation_units (not documentation chunks from accommodation_units_public). Used by ICS feed configuration and accommodations units API. Returns only bookable units that exist in the system.';

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_real_accommodation_units_by_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_real_accommodation_units_by_tenant(UUID) TO anon;
