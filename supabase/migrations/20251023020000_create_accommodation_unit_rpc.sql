-- Migration: Create create_accommodation_unit RPC function
-- Date: 2025-10-23
-- Purpose: Provide RLS-compliant function to create accommodation units
--          Used by MotoPress mapper when auto-creating missing accommodations

CREATE OR REPLACE FUNCTION public.create_accommodation_unit(
  p_tenant_id VARCHAR,
  p_name VARCHAR,
  p_motopress_type_id INTEGER DEFAULT NULL,
  p_status VARCHAR DEFAULT 'active'
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  motopress_type_id INTEGER,
  tenant_id VARCHAR,
  status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hotels, public
AS $$
DECLARE
  v_new_unit hotels.accommodation_units%ROWTYPE;
BEGIN
  -- Insert into hotels.accommodation_units
  INSERT INTO hotels.accommodation_units (
    tenant_id,
    name,
    motopress_type_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_name,
    p_motopress_type_id,
    p_status,
    NOW(),
    NOW()
  )
  RETURNING * INTO v_new_unit;

  -- Return the created unit
  RETURN QUERY
  SELECT
    v_new_unit.id,
    v_new_unit.name::VARCHAR,
    v_new_unit.motopress_type_id,
    v_new_unit.tenant_id,
    v_new_unit.status;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.create_accommodation_unit(VARCHAR, VARCHAR, INTEGER, VARCHAR) IS
'Creates a new accommodation unit in hotels.accommodation_units schema. Used by MotoPress mapper for auto-creating missing accommodations during sync.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_accommodation_unit(VARCHAR, VARCHAR, INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_accommodation_unit(VARCHAR, VARCHAR, INTEGER, VARCHAR) TO service_role;
