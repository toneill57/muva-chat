-- Migration: Add RPC function to upsert accommodations into hotels.accommodation_units
-- Reason: Supabase JS client doesn't support accessing hotels schema directly
-- Usage: Called from scripts/sync-accommodations-to-hotels.ts

CREATE OR REPLACE FUNCTION public.upsert_accommodation(
  p_id uuid,
  p_tenant_id varchar,
  p_name varchar,
  p_unit_number varchar,
  p_unit_type varchar,
  p_description text,
  p_short_description text,
  p_full_description text,
  p_public_description text,
  p_capacity jsonb,
  p_bed_configuration jsonb,
  p_amenities_list jsonb,
  p_pricing jsonb,
  p_images jsonb,
  p_embedding_public_fast vector(256),
  p_embedding_public_full vector(1536),
  p_status varchar DEFAULT 'active',
  p_is_featured boolean DEFAULT false,
  p_display_order integer DEFAULT 0,
  p_unique_features jsonb DEFAULT NULL,
  p_accessibility_features jsonb DEFAULT NULL,
  p_location_details jsonb DEFAULT NULL,
  p_tourism_features text DEFAULT NULL,
  p_booking_policies text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'hotels', 'pg_temp'
AS $$
DECLARE
  v_existing_id uuid;
  v_result_id uuid;
BEGIN
  -- Check if accommodation already exists
  SELECT id INTO v_existing_id
  FROM hotels.accommodation_units
  WHERE tenant_id = p_tenant_id
    AND name = p_name;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing record
    UPDATE hotels.accommodation_units
    SET
      unit_number = p_unit_number,
      unit_type = p_unit_type,
      description = p_description,
      short_description = p_short_description,
      full_description = p_full_description,
      public_description = p_public_description,
      capacity = p_capacity,
      bed_configuration = p_bed_configuration,
      amenities_list = p_amenities_list,
      pricing = p_pricing,
      images = p_images,
      embedding_public_fast = p_embedding_public_fast,
      embedding_public_full = p_embedding_public_full,
      status = p_status,
      is_featured = p_is_featured,
      display_order = p_display_order,
      unique_features = p_unique_features,
      accessibility_features = p_accessibility_features,
      location_details = p_location_details,
      tourism_features = p_tourism_features,
      booking_policies = p_booking_policies,
      updated_at = now()
    WHERE id = v_existing_id;

    v_result_id := v_existing_id;
  ELSE
    -- Insert new record
    INSERT INTO hotels.accommodation_units (
      id,
      tenant_id,
      name,
      unit_number,
      unit_type,
      description,
      short_description,
      full_description,
      public_description,
      capacity,
      bed_configuration,
      amenities_list,
      pricing,
      images,
      embedding_public_fast,
      embedding_public_full,
      status,
      is_featured,
      display_order,
      unique_features,
      accessibility_features,
      location_details,
      tourism_features,
      booking_policies
    ) VALUES (
      p_id,
      p_tenant_id,
      p_name,
      p_unit_number,
      p_unit_type,
      p_description,
      p_short_description,
      p_full_description,
      p_public_description,
      p_capacity,
      p_bed_configuration,
      p_amenities_list,
      p_pricing,
      p_images,
      p_embedding_public_fast,
      p_embedding_public_full,
      p_status,
      p_is_featured,
      p_display_order,
      p_unique_features,
      p_accessibility_features,
      p_location_details,
      p_tourism_features,
      p_booking_policies
    );

    v_result_id := p_id;
  END IF;

  RETURN v_result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_accommodation TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.upsert_accommodation IS
'Upserts accommodation data into hotels.accommodation_units.
Used by sync scripts since Supabase JS client does not support hotels schema access.
Returns the UUID of the upserted record.';
