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

console.log('🚀 Applying audit log migration...');

try {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: migrationSQL
  });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration applied successfully');
  console.log('📊 Result:', data);

  // Verify table exists
  const { data: tables, error: verifyError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'super_admin_audit_log'
      ORDER BY ordinal_position;
    `
  });

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError);
  } else {
    console.log('\n✅ Table verified. Columns:');
    console.log(tables);
  }
} catch (err) {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
}
