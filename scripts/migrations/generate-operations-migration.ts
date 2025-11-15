/**
 * Generate Phase 3c: Operations Data Migration
 *
 * Tables: hotels, staff_users, accommodation_units,
 *         accommodation_units_public, accommodation_units_manual, hotel_operations
 *
 * Total: 180 rows (3+6+2+151+8+10)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to escape SQL strings
function escapeSql(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    // Handle JSONB
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  if (Array.isArray(value)) {
    // Handle vector embeddings
    if (value.every((v) => typeof v === 'number')) {
      return `'[${value.join(',')}]'::vector`;
    }
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${value.toString().replace(/'/g, "''")}'`;
}

// Helper to format timestamp
function formatTimestamp(value: any): string {
  if (!value) return 'NULL';
  return `'${value}'`;
}

async function generateMigration() {
  const lines: string[] = [];

  lines.push('-- Phase 3c: Operations Data Migration');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('-- Tables: hotels, staff_users, accommodation_units, accommodation_units_public,');
  lines.push('--          accommodation_units_manual, hotel_operations');
  lines.push('-- Total rows: 180 (3+6+2+151+8+10)');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // 1. HOTELS (3 rows)
  console.log('Querying hotels...');
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('*')
    .order('id');

  if (hotelsError) throw hotelsError;

  lines.push('-- =========================================');
  lines.push('-- 1. HOTELS (3 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO hotels (');
  lines.push('  id, tenant_id, name, description, short_description, address, contact_info,');
  lines.push('  check_in_time, check_out_time, policies, hotel_amenities, motopress_property_id,');
  lines.push('  full_description, tourism_summary, policies_summary, embedding_fast, embedding_balanced,');
  lines.push('  images, status, created_at, updated_at');
  lines.push(') VALUES');

  hotels?.forEach((hotel, idx) => {
    const values = [
      escapeSql(hotel.id),
      escapeSql(hotel.tenant_id),
      escapeSql(hotel.name),
      escapeSql(hotel.description),
      escapeSql(hotel.short_description),
      escapeSql(hotel.address),
      escapeSql(hotel.contact_info),
      formatTimestamp(hotel.check_in_time),
      formatTimestamp(hotel.check_out_time),
      escapeSql(hotel.policies),
      escapeSql(hotel.hotel_amenities),
      escapeSql(hotel.motopress_property_id),
      escapeSql(hotel.full_description),
      escapeSql(hotel.tourism_summary),
      escapeSql(hotel.policies_summary),
      hotel.embedding_fast ? escapeSql(hotel.embedding_fast) : 'NULL',
      hotel.embedding_balanced ? escapeSql(hotel.embedding_balanced) : 'NULL',
      escapeSql(hotel.images),
      escapeSql(hotel.status),
      formatTimestamp(hotel.created_at),
      formatTimestamp(hotel.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === hotels.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'hotels' AS table_name, COUNT(*) AS row_count FROM hotels;`);
  lines.push('');

  // 2. STAFF_USERS (6 rows) - with self-referencing FK
  console.log('Querying staff_users...');
  const { data: staff, error: staffError } = await supabase
    .from('staff_users')
    .select('*')
    .order('staff_id');

  if (staffError) throw staffError;

  lines.push('-- =========================================');
  lines.push('-- 2. STAFF_USERS (6 rows)');
  lines.push('-- Self-referencing FK: created_by → staff_id');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('-- Disable triggers to handle self-referencing FK');
  lines.push('ALTER TABLE staff_users DISABLE TRIGGER ALL;');
  lines.push('');
  lines.push('INSERT INTO staff_users (');
  lines.push('  staff_id, tenant_id, role, username, password_hash, full_name, email, phone,');
  lines.push('  permissions, is_active, last_login_at, created_at, updated_at, created_by');
  lines.push(') VALUES');

  staff?.forEach((user, idx) => {
    const values = [
      escapeSql(user.staff_id),
      escapeSql(user.tenant_id),
      escapeSql(user.role),
      escapeSql(user.username),
      escapeSql(user.password_hash),
      escapeSql(user.full_name),
      escapeSql(user.email),
      escapeSql(user.phone),
      escapeSql(user.permissions),
      escapeSql(user.is_active),
      formatTimestamp(user.last_login_at),
      formatTimestamp(user.created_at),
      formatTimestamp(user.updated_at),
      escapeSql(user.created_by)
    ];

    const line = `  (${values.join(', ')})${idx === staff.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push('-- Re-enable triggers');
  lines.push('ALTER TABLE staff_users ENABLE TRIGGER ALL;');
  lines.push('');
  lines.push(`SELECT 'staff_users' AS table_name, COUNT(*) AS row_count FROM staff_users;`);
  lines.push('');

  // 3. ACCOMMODATION_UNITS (2 rows)
  console.log('Querying accommodation_units...');
  const { data: units, error: unitsError } = await supabase
    .from('accommodation_units')
    .select('*')
    .order('id');

  if (unitsError) throw unitsError;

  lines.push('-- =========================================');
  lines.push('-- 3. ACCOMMODATION_UNITS (2 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO accommodation_units (');
  lines.push('  id, hotel_id, motopress_type_id, motopress_instance_id, name, unit_number,');
  lines.push('  description, short_description, unit_type, capacity, bed_configuration,');
  lines.push('  size_m2, floor_number, view_type, tourism_features, booking_policies,');
  lines.push('  unique_features, accessibility_features, location_details, is_featured,');
  lines.push('  display_order, status, embedding_fast, embedding_balanced, images,');
  lines.push('  tenant_id, accommodation_type_id, created_at, updated_at');
  lines.push(') VALUES');

  units?.forEach((unit, idx) => {
    const values = [
      escapeSql(unit.id),
      escapeSql(unit.hotel_id),
      escapeSql(unit.motopress_type_id),
      escapeSql(unit.motopress_instance_id),
      escapeSql(unit.name),
      escapeSql(unit.unit_number),
      escapeSql(unit.description),
      escapeSql(unit.short_description),
      escapeSql(unit.unit_type),
      escapeSql(unit.capacity),
      escapeSql(unit.bed_configuration),
      escapeSql(unit.size_m2),
      escapeSql(unit.floor_number),
      escapeSql(unit.view_type),
      escapeSql(unit.tourism_features),
      escapeSql(unit.booking_policies),
      escapeSql(unit.unique_features),
      escapeSql(unit.accessibility_features),
      escapeSql(unit.location_details),
      escapeSql(unit.is_featured),
      escapeSql(unit.display_order),
      escapeSql(unit.status),
      unit.embedding_fast ? escapeSql(unit.embedding_fast) : 'NULL',
      unit.embedding_balanced ? escapeSql(unit.embedding_balanced) : 'NULL',
      escapeSql(unit.images),
      escapeSql(unit.tenant_id),
      escapeSql(unit.accommodation_type_id),
      formatTimestamp(unit.created_at),
      formatTimestamp(unit.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === units.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'accommodation_units' AS table_name, COUNT(*) AS row_count FROM accommodation_units;`);
  lines.push('');

  // 4. ACCOMMODATION_UNITS_PUBLIC (151 rows) - LARGE TABLE
  console.log('Querying accommodation_units_public...');
  const unitsPublic: any[] = [];
  let offset = 0;
  const batchSize = 50;

  while (true) {
    const { data, error } = await supabase
      .from('accommodation_units_public')
      .select('*')
      .order('unit_id')
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    unitsPublic.push(...data);
    console.log(`  Fetched ${unitsPublic.length} rows...`);

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  lines.push('-- =========================================');
  lines.push('-- 4. ACCOMMODATION_UNITS_PUBLIC (151 rows)');
  lines.push('-- Contains large embeddings and descriptions');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO accommodation_units_public (');
  lines.push('  unit_id, tenant_id, name, unit_number, unit_type, description, short_description,');
  lines.push('  highlights, amenities, pricing, photos, virtual_tour_url, embedding_fast,');
  lines.push('  metadata, is_active, is_bookable, created_at, updated_at, embedding');
  lines.push(') VALUES');

  unitsPublic.forEach((unit, idx) => {
    const values = [
      escapeSql(unit.unit_id),
      escapeSql(unit.tenant_id),
      escapeSql(unit.name),
      escapeSql(unit.unit_number),
      escapeSql(unit.unit_type),
      escapeSql(unit.description),
      escapeSql(unit.short_description),
      escapeSql(unit.highlights),
      escapeSql(unit.amenities),
      escapeSql(unit.pricing),
      escapeSql(unit.photos),
      escapeSql(unit.virtual_tour_url),
      unit.embedding_fast ? escapeSql(unit.embedding_fast) : 'NULL',
      escapeSql(unit.metadata),
      escapeSql(unit.is_active),
      escapeSql(unit.is_bookable),
      formatTimestamp(unit.created_at),
      formatTimestamp(unit.updated_at),
      unit.embedding ? escapeSql(unit.embedding) : 'NULL'
    ];

    const line = `  (${values.join(', ')})${idx === unitsPublic.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'accommodation_units_public' AS table_name, COUNT(*) AS row_count FROM accommodation_units_public;`);
  lines.push('');

  // 5. ACCOMMODATION_UNITS_MANUAL (8 rows)
  console.log('Querying accommodation_units_manual...');
  const { data: unitsManual, error: unitsManualError } = await supabase
    .from('accommodation_units_manual')
    .select('*')
    .order('unit_id');

  if (unitsManualError) throw unitsManualError;

  lines.push('-- =========================================');
  lines.push('-- 5. ACCOMMODATION_UNITS_MANUAL (8 rows)');
  lines.push('-- Contains large embeddings');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO accommodation_units_manual (');
  lines.push('  unit_id, manual_content, detailed_instructions, house_rules_specific,');
  lines.push('  emergency_info, wifi_password, safe_code, appliance_guides, local_tips,');
  lines.push('  embedding, embedding_balanced, metadata, created_at, updated_at');
  lines.push(') VALUES');

  unitsManual?.forEach((unit, idx) => {
    const values = [
      escapeSql(unit.unit_id),
      escapeSql(unit.manual_content),
      escapeSql(unit.detailed_instructions),
      escapeSql(unit.house_rules_specific),
      escapeSql(unit.emergency_info),
      escapeSql(unit.wifi_password),
      escapeSql(unit.safe_code),
      escapeSql(unit.appliance_guides),
      escapeSql(unit.local_tips),
      unit.embedding ? escapeSql(unit.embedding) : 'NULL',
      unit.embedding_balanced ? escapeSql(unit.embedding_balanced) : 'NULL',
      escapeSql(unit.metadata),
      formatTimestamp(unit.created_at),
      formatTimestamp(unit.updated_at)
    ];

    const line = `  (${values.join(', ')})${idx === unitsManual.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'accommodation_units_manual' AS table_name, COUNT(*) AS row_count FROM accommodation_units_manual;`);
  lines.push('');

  // 6. HOTEL_OPERATIONS (10 rows)
  console.log('Querying hotel_operations...');
  const { data: operations, error: operationsError } = await supabase
    .from('hotel_operations')
    .select('*')
    .order('operation_id');

  if (operationsError) throw operationsError;

  lines.push('-- =========================================');
  lines.push('-- 6. HOTEL_OPERATIONS (10 rows)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('INSERT INTO hotel_operations (');
  lines.push('  operation_id, tenant_id, category, title, content, embedding, embedding_balanced,');
  lines.push('  metadata, access_level, version, is_active, created_at, updated_at, created_by');
  lines.push(') VALUES');

  operations?.forEach((op, idx) => {
    const values = [
      escapeSql(op.operation_id),
      escapeSql(op.tenant_id),
      escapeSql(op.category),
      escapeSql(op.title),
      escapeSql(op.content),
      op.embedding ? escapeSql(op.embedding) : 'NULL',
      op.embedding_balanced ? escapeSql(op.embedding_balanced) : 'NULL',
      escapeSql(op.metadata),
      escapeSql(op.access_level),
      escapeSql(op.version),
      escapeSql(op.is_active),
      formatTimestamp(op.created_at),
      formatTimestamp(op.updated_at),
      escapeSql(op.created_by)
    ];

    const line = `  (${values.join(', ')})${idx === operations.length - 1 ? ';' : ','}`;
    lines.push(line);
  });

  lines.push('');
  lines.push(`SELECT 'hotel_operations' AS table_name, COUNT(*) AS row_count FROM hotel_operations;`);
  lines.push('');

  // Final validation
  lines.push('-- =========================================');
  lines.push('-- VALIDATION: Total row count');
  lines.push('-- Expected: 180 rows (3+6+2+151+8+10)');
  lines.push('-- =========================================');
  lines.push('');
  lines.push('SELECT');
  lines.push('  (SELECT COUNT(*) FROM hotels) AS hotels,');
  lines.push('  (SELECT COUNT(*) FROM staff_users) AS staff_users,');
  lines.push('  (SELECT COUNT(*) FROM accommodation_units) AS accommodation_units,');
  lines.push('  (SELECT COUNT(*) FROM accommodation_units_public) AS accommodation_units_public,');
  lines.push('  (SELECT COUNT(*) FROM accommodation_units_manual) AS accommodation_units_manual,');
  lines.push('  (SELECT COUNT(*) FROM hotel_operations) AS hotel_operations,');
  lines.push('  (');
  lines.push('    (SELECT COUNT(*) FROM hotels) +');
  lines.push('    (SELECT COUNT(*) FROM staff_users) +');
  lines.push('    (SELECT COUNT(*) FROM accommodation_units) +');
  lines.push('    (SELECT COUNT(*) FROM accommodation_units_public) +');
  lines.push('    (SELECT COUNT(*) FROM accommodation_units_manual) +');
  lines.push('    (SELECT COUNT(*) FROM hotel_operations)');
  lines.push('  ) AS total_rows;');
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- Phase 3c complete');
  lines.push(`-- Generated ${hotels?.length || 0} hotels, ${staff?.length || 0} staff_users, ${units?.length || 0} accommodation_units,`);
  lines.push(`--           ${unitsPublic.length} accommodation_units_public, ${unitsManual?.length || 0} accommodation_units_manual, ${operations?.length || 0} hotel_operations`);
  lines.push(`-- Total: ${(hotels?.length || 0) + (staff?.length || 0) + (units?.length || 0) + unitsPublic.length + (unitsManual?.length || 0) + (operations?.length || 0)} rows`);

  // Write to file
  const outputPath = path.join(
    process.cwd(),
    'migrations',
    'backup-2025-10-31',
    '12-data-operations.sql'
  );

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

  console.log('\n✅ Migration file generated successfully!');
  console.log(`📁 File: ${outputPath}`);
  console.log(`📊 Total rows: ${(hotels?.length || 0) + (staff?.length || 0) + (units?.length || 0) + unitsPublic.length + (unitsManual?.length || 0) + (operations?.length || 0)}`);
  console.log('\nBreakdown:');
  console.log(`  - hotels: ${hotels?.length || 0}`);
  console.log(`  - staff_users: ${staff?.length || 0}`);
  console.log(`  - accommodation_units: ${units?.length || 0}`);
  console.log(`  - accommodation_units_public: ${unitsPublic.length}`);
  console.log(`  - accommodation_units_manual: ${unitsManual?.length || 0}`);
  console.log(`  - hotel_operations: ${operations?.length || 0}`);
}

generateMigration().catch(console.error);
