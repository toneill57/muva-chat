#!/usr/bin/env tsx
/**
 * Generate File 12: Operations Data (~202 rows COMPLETE)
 * Tables: hotels (3), staff_users (6), hotel_operations (10),
 *         accommodation_units (2), accommodation_units_public (151),
 *         accommodation_units_manual (8)
 *
 * ⭐ CRITICAL: Oct 31 had only 11 sample rows - this exports COMPLETE data
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OUTPUT_FILE = 'migrations/fresh-2025-11-01/12-data-operations.sql';

// SQL formatting utilities
const esc = (str: any) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

const uuid = (id: any) => id ? `'${id}'::uuid` : 'NULL';
const ts = (date: any) => date ? `'${date}'::timestamptz` : 'NULL';
const jsonb = (obj: any) => obj ? `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb` : 'NULL';
const arr = (items: any[]) => {
  if (!items || items.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${items.map(esc).join(', ')}]`;
};
const time = (t: any) => t ? `'${t}'::time` : 'NULL';
const num = (n: any) => n !== null && n !== undefined ? n : 'NULL';

async function main() {
  console.log('📝 Generating 12-data-operations.sql...\n');

  let sql = `-- 12-data-operations.sql
-- Generated: ${new Date().toISOString().split('T')[0]}
-- Group 3: Operations Data (6 tables, ~202 rows)
-- ⭐ COMPLETE data (Oct 31 had 11 sample rows only)

BEGIN;
SET session_replication_role = replica;

`;

  let totalRows = 0;

  // ========================================
  // Table 1: hotels
  // ========================================
  console.log('Fetching hotels...');
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('*')
    .order('created_at');

  if (hotelsError) throw hotelsError;

  const hotelsCount = hotels?.length || 0;
  console.log(`  Found ${hotelsCount} rows`);
  totalRows += hotelsCount;

  sql += `-- ========================================
-- TABLE 1: hotels (${hotelsCount} rows)
-- ========================================
`;

  if (hotelsCount > 0) {
    sql += `INSERT INTO hotels (
  id,
  tenant_id,
  hotel_name,
  address,
  phone,
  email,
  website,
  description,
  amenities,
  check_in_time,
  check_out_time,
  cancellation_policy,
  created_at,
  updated_at
) VALUES\n`;

    sql += hotels!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.tenant_id)}, ${esc(row.hotel_name)}, ${esc(row.address)}, ${esc(row.phone)}, ${esc(row.email)}, ${esc(row.website)}, ${esc(row.description)}, ${jsonb(row.amenities)}, ${time(row.check_in_time)}, ${time(row.check_out_time)}, ${esc(row.cancellation_policy)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data\n\n`;
  }

  // ========================================
  // Table 2: staff_users (TWO-PASS for self-reference)
  // ========================================
  console.log('Fetching staff_users (pass 1: NULL created_by)...');
  const { data: staffPass1, error: staff1Error } = await supabase
    .from('staff_users')
    .select('*')
    .is('created_by', null)
    .order('created_at');

  if (staff1Error) throw staff1Error;

  console.log('Fetching staff_users (pass 2: WITH created_by)...');
  const { data: staffPass2, error: staff2Error } = await supabase
    .from('staff_users')
    .select('*')
    .not('created_by', 'is', null)
    .order('created_at');

  if (staff2Error) throw staff2Error;

  const staffCount = (staffPass1?.length || 0) + (staffPass2?.length || 0);
  console.log(`  Found ${staffCount} rows total`);
  totalRows += staffCount;

  sql += `-- ========================================
-- TABLE 2: staff_users (${staffCount} rows, self-reference)
-- ⚠️ TWO-PASS: NULL created_by first, then refs
-- ========================================

-- PASS 1: Users with NO creator (created_by IS NULL)
`;

  if (staffPass1 && staffPass1.length > 0) {
    sql += `INSERT INTO staff_users (
  staff_id,
  tenant_id,
  email,
  full_name,
  role,
  permissions,
  status,
  created_by,
  created_at,
  updated_at
) VALUES\n`;

    sql += staffPass1.map(row =>
      `(${uuid(row.staff_id)}, ${uuid(row.tenant_id)}, ${esc(row.email)}, ${esc(row.full_name)}, ${esc(row.role)}, ${jsonb(row.permissions)}, ${esc(row.status)}, NULL, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  }

  sql += `-- PASS 2: Users with creator (created_by references staff_id from PASS 1)
`;

  if (staffPass2 && staffPass2.length > 0) {
    sql += `INSERT INTO staff_users (
  staff_id,
  tenant_id,
  email,
  full_name,
  role,
  permissions,
  status,
  created_by,
  created_at,
  updated_at
) VALUES\n`;

    sql += staffPass2.map(row =>
      `(${uuid(row.staff_id)}, ${uuid(row.tenant_id)}, ${esc(row.email)}, ${esc(row.full_name)}, ${esc(row.role)}, ${jsonb(row.permissions)}, ${esc(row.status)}, ${uuid(row.created_by)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No users with creators\n\n`;
  }

  // ========================================
  // Table 3: accommodation_units_public (⭐ LARGEST - 151 rows)
  // ========================================
  console.log('Fetching accommodation_units_public (⭐ COMPLETE data)...');
  const { data: unitsPublic, error: unitsPublicError } = await supabase
    .from('accommodation_units_public')
    .select('*')
    .order('created_at');

  if (unitsPublicError) throw unitsPublicError;

  const unitsPublicCount = unitsPublic?.length || 0;
  console.log(`  Found ${unitsPublicCount} rows (Oct 31 had ~5 sample)`);
  totalRows += unitsPublicCount;

  sql += `-- ========================================
-- TABLE 3: accommodation_units_public (${unitsPublicCount} rows ⭐)
-- LARGEST TABLE - COMPLETE export, not sample
-- ========================================
`;

  if (unitsPublicCount > 0) {
    sql += `INSERT INTO accommodation_units_public (
  id,
  tenant_id,
  unit_name,
  unit_type,
  capacity,
  bedrooms,
  bathrooms,
  base_price,
  currency,
  description,
  amenities,
  images,
  status,
  created_at,
  updated_at
) VALUES\n`;

    sql += unitsPublic!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.tenant_id)}, ${esc(row.unit_name)}, ${esc(row.unit_type)}, ${num(row.capacity)}, ${num(row.bedrooms)}, ${num(row.bathrooms)}, ${num(row.base_price)}, ${esc(row.currency)}, ${esc(row.description)}, ${jsonb(row.amenities)}, ${arr(row.images)}, ${esc(row.status)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data\n\n`;
  }

  // ========================================
  // Table 4: accommodation_units
  // ========================================
  console.log('Fetching accommodation_units...');
  const { data: units, error: unitsError } = await supabase
    .from('accommodation_units')
    .select('*')
    .order('created_at');

  if (unitsError) throw unitsError;

  const unitsCount = units?.length || 0;
  console.log(`  Found ${unitsCount} rows`);
  totalRows += unitsCount;

  sql += `-- ========================================
-- TABLE 4: accommodation_units (${unitsCount} rows)
-- ========================================
`;

  if (unitsCount > 0) {
    sql += `INSERT INTO accommodation_units (
  id,
  hotel_id,
  tenant_id,
  unit_number,
  unit_type,
  floor,
  capacity,
  base_rate,
  status,
  amenities,
  created_at,
  updated_at
) VALUES\n`;

    sql += units!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.hotel_id)}, ${uuid(row.tenant_id)}, ${esc(row.unit_number)}, ${esc(row.unit_type)}, ${num(row.floor)}, ${num(row.capacity)}, ${num(row.base_rate)}, ${esc(row.status)}, ${jsonb(row.amenities)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data\n\n`;
  }

  // ========================================
  // Table 5: hotel_operations
  // ========================================
  console.log('Fetching hotel_operations...');
  const { data: operations, error: operationsError } = await supabase
    .from('hotel_operations')
    .select('*')
    .order('created_at');

  if (operationsError) throw operationsError;

  const operationsCount = operations?.length || 0;
  console.log(`  Found ${operationsCount} rows`);
  totalRows += operationsCount;

  sql += `-- ========================================
-- TABLE 5: hotel_operations (${operationsCount} rows)
-- ========================================
`;

  if (operationsCount > 0) {
    sql += `INSERT INTO hotel_operations (
  id,
  tenant_id,
  operation_type,
  staff_user_id,
  description,
  status,
  scheduled_at,
  completed_at,
  metadata,
  created_at,
  updated_at
) VALUES\n`;

    sql += operations!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.tenant_id)}, ${esc(row.operation_type)}, ${uuid(row.staff_user_id)}, ${esc(row.description)}, ${esc(row.status)}, ${ts(row.scheduled_at)}, ${ts(row.completed_at)}, ${jsonb(row.metadata)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data\n\n`;
  }

  // ========================================
  // Table 6: accommodation_units_manual
  // ========================================
  console.log('Fetching accommodation_units_manual...');
  const { data: unitsManual, error: unitsManualError } = await supabase
    .from('accommodation_units_manual')
    .select('*')
    .order('created_at');

  if (unitsManualError) throw unitsManualError;

  const unitsManualCount = unitsManual?.length || 0;
  console.log(`  Found ${unitsManualCount} rows`);
  totalRows += unitsManualCount;

  sql += `-- ========================================
-- TABLE 6: accommodation_units_manual (${unitsManualCount} rows)
-- ========================================
`;

  if (unitsManualCount > 0) {
    sql += `INSERT INTO accommodation_units_manual (
  id,
  public_unit_id,
  manual_content,
  content_type,
  metadata,
  created_at,
  updated_at
) VALUES\n`;

    sql += unitsManual!.map(row =>
      `(${uuid(row.id)}, ${uuid(row.public_unit_id)}, ${esc(row.manual_content)}, ${esc(row.content_type)}, ${jsonb(row.metadata)}, ${ts(row.created_at)}, ${ts(row.updated_at)})`
    ).join(',\n') + ';\n\n';
  } else {
    sql += `-- No data\n\n`;
  }

  // Footer
  sql += `SET session_replication_role = DEFAULT;
COMMIT;

-- Validation
SELECT 'hotels' as table_name, COUNT(*) as row_count FROM hotels
UNION ALL
SELECT 'staff_users', COUNT(*) FROM staff_users
UNION ALL
SELECT 'accommodation_units_public', COUNT(*) FROM accommodation_units_public
UNION ALL
SELECT 'accommodation_units', COUNT(*) FROM accommodation_units
UNION ALL
SELECT 'hotel_operations', COUNT(*) FROM hotel_operations
UNION ALL
SELECT 'accommodation_units_manual', COUNT(*) FROM accommodation_units_manual;

-- Expected totals:
-- hotels: ${hotelsCount}
-- staff_users: ${staffCount}
-- accommodation_units_public: ${unitsPublicCount} ⭐ (Oct 31 had ~5)
-- accommodation_units: ${unitsCount}
-- hotel_operations: ${operationsCount}
-- accommodation_units_manual: ${unitsManualCount}
-- TOTAL: ${totalRows}
`;

  // Write file
  writeFileSync(OUTPUT_FILE, sql);

  console.log(`\n✅ Generated ${OUTPUT_FILE}`);
  console.log(`   Total rows: ${totalRows} (Oct 31 had 11 ⭐)`);
  console.log(`   File size: ${(Buffer.byteLength(sql) / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
