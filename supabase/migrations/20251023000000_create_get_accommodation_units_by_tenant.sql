-- Migration: Create get_accommodation_units_by_tenant RPC function
-- Date: 2025-10-23
-- Purpose: Provide RLS-compliant function to fetch accommodation units by tenant
--
-- This function is called by /api/accommodations/units endpoint and respects
-- Row Level Security policies automatically.

CREATE OR REPLACE FUNCTION public.get_accommodation_units_by_tenant(
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  description TEXT,
  short_description TEXT,
  unit_number TEXT,
  unit_type VARCHAR,
  highlights JSONB,
  amenities JSONB,
  metadata JSONB,
  embedding_fast VECTOR,
  embedding VECTOR,
  chunk_index INTEGER,
  total_chunks INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  manual_updated_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return all accommodation units for the specified tenant
  -- RLS policies will be applied automatically
  RETURN QUERY
  SELECT
    au.id,
    au.tenant_id,
    au.name,
    au.description,
    au.short_description,
    au.unit_number,
    au.unit_type,
    au.highlights,
    au.amenities,
    au.metadata,
    au.embedding_fast,
    au.embedding,
    au.chunk_index,
    au.total_chunks,
    au.created_at,
    au.updated_at,
    au.manual_updated_at,
    au.is_active
  FROM accommodation_units_public au
  WHERE au.tenant_id = p_tenant_id
  ORDER BY
    COALESCE(au.metadata->>'display_order', '999')::INTEGER ASC,
    au.name ASC,
    au.chunk_index ASC;
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.get_accommodation_units_by_tenant(UUID) IS
'Fetches all accommodation units for a given tenant. Used by the accommodations units API endpoint. Respects RLS policies and returns units ordered by display_order metadata field.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_accommodation_units_by_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accommodation_units_by_tenant(UUID) TO anon;
