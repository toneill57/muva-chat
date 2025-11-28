#!/usr/bin/env node

/**
 * Test inserting directly into audit_log table
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 Testing audit log insert...\n');

// Get oneill's real ID first
const { data: adminData } = await supabase
  .from('super_admin_users')
  .select('super_admin_id')
  .eq('username', 'oneill')
  .single();

if (!adminData) {
  console.log('❌ Could not find oneill admin user');
  process.exit(1);
}

console.log(`Using super_admin_id: ${adminData.super_admin_id}\n`);

// Test 1: Insert a test log
const testLog = {
  super_admin_id: adminData.super_admin_id, // oneill's real ID
  action: 'test.insert',
  target_type: 'test',
  target_id: 'test-1',
  changes: { test: true },
  ip_address: '127.0.0.1',
  user_agent: 'test-script'
};

console.log('Inserting test log:', JSON.stringify(testLog, null, 2));

const { data, error } = await supabase
  .from('super_admin_audit_log')
  .insert(testLog)
  .select();

if (error) {
  console.log('\n❌ Insert failed:', error);
  process.exit(1);
}

console.log('\n✅ Insert successful!');
console.log('Inserted log:', JSON.stringify(data, null, 2));

// Test 2: Fetch the log we just inserted
console.log('\n🔍 Fetching the log back...');

const { data: fetchedLogs, error: fetchError } = await supabase
  .from('super_admin_audit_log')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1);

if (fetchError) {
  console.log('❌ Fetch failed:', fetchError);
  process.exit(1);
}

console.log('✅ Fetched log:', JSON.stringify(fetchedLogs, null, 2));

// Test 3: Count total logs
const { count } = await supabase
  .from('super_admin_audit_log')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 Total audit logs in table: ${count}`);

console.log('\n✅ All tests passed! Audit log table is working correctly.');
