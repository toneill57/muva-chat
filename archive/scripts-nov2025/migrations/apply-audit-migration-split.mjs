#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Read migration file
const migrationSQL = readFileSync('migrations/20251127000000_super_admin_audit_log.sql', 'utf-8');

console.log('🚀 Applying audit log migration statement by statement...\n');

// Split SQL into individual statements
// Remove comments and split by semicolon
const statements = migrationSQL
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
  .join('\n')
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

console.log(`Found ${statements.length} SQL statements\n`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');

  console.log(`[${i + 1}/${statements.length}] ${preview}...`);

  try {
    // Use fetch directly to call exec_sql (might work better for DDL)
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql: stmt })
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      console.log(`  ❌ FAILED: ${result.message || result.error || 'Unknown error'}`);
      failCount++;
    } else {
      console.log(`  ✅ SUCCESS`);
      successCount++;
    }
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    failCount++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 Summary:`);
console.log(`   Total statements: ${statements.length}`);
console.log(`   Success: ${successCount}`);
console.log(`   Failed: ${failCount}`);
console.log(`${'='.repeat(60)}\n`);

if (failCount > 0) {
  console.log('⚠️  Some statements failed. Checking table status...\n');
}

// Verify table exists
try {
  const { data: tables, error: verifyError } = await supabase
    .from('super_admin_audit_log')
    .select('count')
    .limit(0);

  if (verifyError) {
    console.log('❌ Table does NOT exist yet');
    console.log('Error:', verifyError.message);
  } else {
    console.log('✅ Table EXISTS and is accessible');
  }
} catch (err) {
  console.log('❌ Table verification failed:', err.message);
}
