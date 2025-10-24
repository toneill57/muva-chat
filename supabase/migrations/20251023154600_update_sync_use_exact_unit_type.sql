-- Migration: Update sync function to use exact unit_type from MotoPress
-- Date: 2025-10-23
-- Purpose: No guessing - use accommodation_mphb_type exactly as it comes

CREATE OR REPLACE FUNCTION public.sync_accommodation_units_public_to_hotels(
  p_tenant_id UUID
)
RETURNS TABLE (
  created_count INTEGER,
  updated_count INTEGER,
  error_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hotels
AS $$
DECLARE
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
  v_errors INTEGER := 0;
  v_unit RECORD;
  v_existing_id UUID;
BEGIN
  -- Loop through consolidated units from accommodation_units_public
  FOR v_unit IN
    SELECT DISTINCT ON (COALESCE(metadata->>'original_accommodation', name))
      unit_id,
      tenant_id,
      COALESCE(metadata->>'original_accommodation', name) as unit_name,
      COALESCE((metadata->>'display_order')::INTEGER, 999) as display_order_val,
      unit_number,
      unit_type,
      description,
      short_description,
      metadata,
      photos as images,
      pricing,
      is_active
    FROM accommodation_units_public
    WHERE tenant_id = p_tenant_id
    ORDER BY COALESCE(metadata->>'original_accommodation', name),
             COALESCE((metadata->>'display_order')::INTEGER, 999) ASC
  LOOP
    BEGIN
      -- Check if unit exists
      SELECT id INTO v_existing_id
      FROM hotels.accommodation_units
      WHERE tenant_id = p_tenant_id::varchar
      AND name = v_unit.unit_name
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        -- Update existing unit
        UPDATE hotels.accommodation_units
        SET
          unit_number = COALESCE((v_unit.metadata->>'display_order')::TEXT, v_unit.unit_number, 'N/A'),
          unit_type = COALESCE(v_unit.metadata->>'accommodation_mphb_type', v_unit.unit_type, 'Standard'),
          description = COALESCE(v_unit.description, ''),
          short_description = COALESCE(v_unit.short_description, SUBSTRING(v_unit.description, 1, 150), ''),
          capacity = COALESCE(v_unit.metadata->'capacity', '{"adults":2,"children":0,"total":2}'::jsonb),
          bed_configuration = COALESCE(v_unit.metadata->'bed_configuration', '[{"type":"Queen","quantity":1}]'::jsonb),
          size_m2 = (v_unit.metadata->>'size_m2')::INTEGER,
          view_type = v_unit.metadata->>'view_type',
          images = COALESCE(v_unit.images, '[]'::jsonb),
          motopress_type_id = (v_unit.metadata->>'motopress_room_type_id')::INTEGER,
          motopress_unit_id = (v_unit.metadata->>'motopress_unit_id')::INTEGER,
          full_description = COALESCE(v_unit.description, ''),
          tourism_features = COALESCE(v_unit.metadata->>'tourism_features', ''),
          booking_policies = COALESCE(v_unit.metadata->>'booking_policies', ''),
          unique_features = COALESCE(v_unit.metadata->'unique_features', '[]'::jsonb),
          status = CASE WHEN v_unit.is_active THEN 'active' ELSE 'inactive' END,
          is_featured = COALESCE((v_unit.metadata->>'is_featured')::BOOLEAN, FALSE),
          display_order = v_unit.display_order_val,
          base_price_low_season = (v_unit.pricing->>'base_price')::INTEGER,
          base_price_high_season = (v_unit.pricing->>'base_price')::INTEGER,
          amenities_list = COALESCE(v_unit.metadata->'unit_amenities', '[]'::jsonb),
          unit_amenities = CASE
            WHEN jsonb_typeof(v_unit.metadata->'unit_amenities') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'unit_amenities')), ', ')
            ELSE COALESCE(v_unit.metadata->>'unit_amenities', '')
          END,
          accommodation_mphb_type = v_unit.metadata->>'accommodation_mphb_type',
          tags = CASE
            WHEN jsonb_typeof(v_unit.metadata->'tags') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'tags'))
            ELSE '{}'::TEXT[]
          END,
          subcategory = v_unit.metadata->>'subcategory',
          updated_at = NOW()
        WHERE id = v_existing_id;

        v_updated := v_updated + 1;
      ELSE
        -- Insert new unit - use exact value from MotoPress
        INSERT INTO hotels.accommodation_units (
          tenant_id,
          name,
          unit_number,
          unit_type,
          description,
          short_description,
          capacity,
          bed_configuration,
          size_m2,
          view_type,
          images,
          motopress_type_id,
          motopress_unit_id,
          full_description,
          tourism_features,
          booking_policies,
          unique_features,
          status,
          is_featured,
          display_order,
          base_price_low_season,
          base_price_high_season,
          amenities_list,
          unit_amenities,
          accommodation_mphb_type,
          tags,
          subcategory,
          created_at,
          updated_at
        ) VALUES (
          p_tenant_id::varchar,
          v_unit.unit_name,
          COALESCE((v_unit.metadata->>'display_order')::TEXT, v_unit.unit_number, 'N/A'),
          COALESCE(v_unit.metadata->>'accommodation_mphb_type', v_unit.unit_type, 'Standard'),
          COALESCE(v_unit.description, ''),
          COALESCE(v_unit.short_description, SUBSTRING(v_unit.description, 1, 150), ''),
          COALESCE(v_unit.metadata->'capacity', '{"adults":2,"children":0,"total":2}'::jsonb),
          COALESCE(v_unit.metadata->'bed_configuration', '[{"type":"Queen","quantity":1}]'::jsonb),
          (v_unit.metadata->>'size_m2')::INTEGER,
          v_unit.metadata->>'view_type',
          COALESCE(v_unit.images, '[]'::jsonb),
          (v_unit.metadata->>'motopress_room_type_id')::INTEGER,
          (v_unit.metadata->>'motopress_unit_id')::INTEGER,
          COALESCE(v_unit.description, ''),
          COALESCE(v_unit.metadata->>'tourism_features', ''),
          COALESCE(v_unit.metadata->>'booking_policies', ''),
          COALESCE(v_unit.metadata->'unique_features', '[]'::jsonb),
          CASE WHEN v_unit.is_active THEN 'active' ELSE 'inactive' END,
          COALESCE((v_unit.metadata->>'is_featured')::BOOLEAN, FALSE),
          v_unit.display_order_val,
          (v_unit.pricing->>'base_price')::INTEGER,
          (v_unit.pricing->>'base_price')::INTEGER,
          COALESCE(v_unit.metadata->'unit_amenities', '[]'::jsonb),
          CASE
            WHEN jsonb_typeof(v_unit.metadata->'unit_amenities') = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'unit_amenities')), ', ')
            ELSE COALESCE(v_unit.metadata->>'unit_amenities', '')
          END,
          v_unit.metadata->>'accommodation_mphb_type',
          CASE
            WHEN jsonb_typeof(v_unit.metadata->'tags') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(v_unit.metadata->'tags'))
            ELSE '{}'::TEXT[]
          END,
          v_unit.metadata->>'subcategory',
          NOW(),
          NOW()
        );

        v_created := v_created + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error processing unit %: %', v_unit.unit_name, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_created, v_updated, v_errors;
END;
$$;

COMMENT ON FUNCTION public.sync_accommodation_units_public_to_hotels(UUID) IS
'Syncs consolidated accommodation units from accommodation_units_public to hotels.accommodation_units using exact unit_type from MotoPress (no guessing).';
