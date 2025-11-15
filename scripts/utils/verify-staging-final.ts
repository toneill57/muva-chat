#!/usr/bin/env tsx
/**
 * Verify final staging row counts
 */

import { createClient } from '@supabase/supabase-js';

const STAGING = 'qlvkgniqcoisbnwwjfte';
const client = createClient(
  `https://${STAGING}.supabase.co`,
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!
);

const TABLES = [
  'tenant_registry',
  'sire_countries', 'sire_document_types', 'sire_cities', 'sire_export_logs',
  'property_relationships', 'muva_content', 'ics_feed_configurations',
  'guest_reservations', 'calendar_events', 'airbnb_mphb_imported_reservations',
  'user_tenant_permissions', 'policies', 'hotels', 'staff_users',
  'hotel_operations', 'integration_configs', 'sync_history', 'job_logs',
  'tenant_compliance_credentials', 'tenant_knowledge_embeddings', 'tenant_muva_content',
  'accommodation_units_public', 'accommodation_units_manual_chunks', 'prospective_sessions',
  'guest_conversations', 'chat_conversations', 'compliance_submissions',
  'reservation_accommodations', 'airbnb_motopress_comparison', 'calendar_event_conflicts',
  'calendar_sync_logs', 'staff_conversations', 'accommodation_units', 'accommodation_units_manual',
  'conversation_memory', 'chat_messages', 'conversation_attachments', 'staff_messages',
  'code_embeddings',
];

async function main() {
  console.log('📊 STAGING DATABASE FINAL COUNT\n');
  
  let totalRows = 0;
  const results = [];

  for (const table of TABLES) {
    const { count, error } = await client
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
      continue;
    }

    totalRows += count || 0;
    if ((count || 0) > 0) {
      results.push({ table, count });
    }
  }

  // Sort by count descending
  results.sort((a, b) => b.count - a.count);

  results.forEach(({ table, count }) => {
    console.log(`${table.padEnd(40)} ${String(count).padStart(6)} rows`);
  });

  console.log('='.repeat(60));
  console.log(`TOTAL (public schema):${String(totalRows).padStart(37)} rows`);

  // Check hotels schema
  const { count: hotelUnits } = await client
    .from('accommodation_units')
    .select('*', { count: 'exact', head: true });

  console.log(`\nhotels.accommodation_units${String(hotelUnits || 0).padStart(27)} rows`);
  console.log('='.repeat(60));
  console.log(`GRAND TOTAL:${String(totalRows + (hotelUnits || 0)).padStart(43)} rows`);

  const expected = 6970;
  const actual = totalRows + (hotelUnits || 0);
  const diff = actual - expected;

  console.log('');
  console.log(`Expected: ${expected} rows`);
  console.log(`Actual:   ${actual} rows`);
  console.log(`Diff:     ${diff > 0 ? '+' : ''}${diff} rows`);

  if (Math.abs(diff) < 50) {
    console.log('\n✅ Copy COMPLETE! Count matches expected (within tolerance).');
  } else {
    console.log('\n⚠️  Count differs from expected. Review if necessary.');
  }
}

main().catch(console.error);
