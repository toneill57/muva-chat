#!/usr/bin/env tsx
/**
 * Apply All Migrations to PRD using execute_sql RPC
 *
 * This script reads each migration file and executes it via the execute_sql RPC function
 * which bypasses the MCP apply_migration size limitations.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const PROJECT_URL = 'https://kprqghwdnaykxhostivv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMxNzk2OSwiZXhwIjoyMDc4ODkzOTY5fQ.Ypsb1ZpV59b0zAL3JqnyArMx3ZU9OAiltOnsT0rE6MY';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');

async function main() {
  console.log('🚀 Applying migrations to PRD (main)');
  console.log(`📦 Project: ${PROJECT_URL}`);
  console.log(`📁 Migrations: ${MIGRATIONS_DIR}\n`);

  // Create Supabase client
  const supabase = createClient(PROJECT_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Get migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  let successCount = 0;
  let failureCount = 0;

  // Apply each migration
  for (const filename of files) {
    const filepath = join(MIGRATIONS_DIR, filename);
    const sql = readFileSync(filepath, 'utf-8');

    console.log(`📝 [${successCount + failureCount + 1}/${files.length}] ${filename}`);
    console.log(`   Size: ${Math.round(sql.length / 1024)}KB`);

    try {
      // Execute SQL directly via RPC
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        console.error(error);
        failureCount++;

        // Stop on first error
        console.log('\n❌ Migration failed, stopping...');
        break;
      } else {
        console.log(`   ✅ SUCCESS`);
        successCount++;
      }
    } catch (err: any) {
      console.log(`   ❌ EXCEPTION: ${err.message}`);
      console.error(err);
      failureCount++;
      break;
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Total: ${files.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failureCount}`);
  console.log('═'.repeat(80));

  if (failureCount === 0) {
    console.log('\n✅ All migrations applied successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Some migrations failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
