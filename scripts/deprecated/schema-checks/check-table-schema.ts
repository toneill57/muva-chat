/**
 * Check Table Schema - Get column types for guest_reservations
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/check-table-schema.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('🔍 Checking guest_reservations schema\n');

  // Query to get column information from information_schema
  const { data, error } = await supabase
    .from('guest_reservations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying table:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No rows found in guest_reservations');
    return;
  }

  console.log('✅ Sample row structure:');
  const row = data[0];
  Object.keys(row).forEach(key => {
    const value = row[key];
    const type = typeof value;
    console.log(`   ${key}: ${type} = ${value === null ? '(null)' : JSON.stringify(value).substring(0, 50)}`);
  });
}

checkSchema();
