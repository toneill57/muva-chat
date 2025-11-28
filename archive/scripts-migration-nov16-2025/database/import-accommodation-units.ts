#!/usr/bin/env tsx
/**
 * Import accommodation_units to dev and tst using direct SQL
 */

// We'll use MCP execute_sql via direct calls
const accommodationUnitsSQL = `
INSERT INTO hotels.accommodation_units (
  id, tenant_id, hotel_id, accommodation_type_id, name, unit_number,
  description, short_description, capacity, bed_configuration, size_m2,
  floor_number, view_type, images, motopress_type_id, motopress_unit_id,
  full_description, tourism_features, booking_policies, embedding_fast,
  embedding_balanced, unique_features, accessibility_features, location_details,
  status, is_featured, display_order, created_at, updated_at, base_price_low_season,
  base_price_high_season, price_per_person_low, price_per_person_high,
  amenities_list, unit_amenities, unit_type, accommodation_mphb_type, tags,
  subcategory, pricing, embedding_public_fast, embedding_public_full,
  embedding_guest_fast, embedding_guest_full, public_description, guest_description
)
SELECT *
FROM jsonb_populate_recordset(
  null::hotels.accommodation_units,
  $DATA$
);
`;

console.log('Use this SQL with the full accommodation units JSON array');
console.log('Execute via MCP tools for dev and tst projects');
