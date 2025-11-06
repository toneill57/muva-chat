#!/usr/bin/env node
/**
 * Create Migration File
 *
 * FASE 6: Migration Management System
 *
 * Purpose:
 * - Generate new migration file with timestamp and template
 * - Ensure proper naming convention: YYYYMMDDHHMMSS_name.sql
 * - Include helpful template with UP/DOWN sections
 *
 * Usage:
 *   pnpm dlx tsx scripts/create-migration.ts "migration_name"
 *   pnpm dlx tsx scripts/create-migration.ts "add_users_table"
 *
 * Output:
 *   Creates: supabase/migrations/20251105143022_add_users_table.sql
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface MigrationTemplate {
  timestamp: string;
  name: string;
  filename: string;
  content: string;
}

function generateTimestamp(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function sanitizeName(name: string): string {
  // Convert to snake_case and remove special characters
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

function generateTemplate(name: string): MigrationTemplate {
  const timestamp = generateTimestamp();
  const sanitizedName = sanitizeName(name);
  const filename = `${timestamp}_${sanitizedName}.sql`;
  
  const content = `-- Migration: ${sanitizedName}
-- Created: ${new Date().toISOString()}
-- Description: [Add description of what this migration does]

-- ============================================================
-- UP Migration
-- ============================================================

-- Add your schema changes here
-- This section runs when applying the migration

-- Example: Create a new table
-- CREATE TABLE IF NOT EXISTS example_table (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   name text NOT NULL,
--   email text UNIQUE NOT NULL,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now()
-- );

-- Example: Add a column to existing table
-- ALTER TABLE existing_table 
--   ADD COLUMN IF NOT EXISTS new_column text;

-- Example: Create an index
-- CREATE INDEX IF NOT EXISTS idx_example_name 
--   ON example_table(name);

-- Example: Create RLS policy
-- ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Users can read their own data"
--   ON example_table
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- Example: Create function
-- CREATE OR REPLACE FUNCTION updated_at_trigger()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================
-- DOWN Migration (for rollback)
-- ============================================================

-- Add rollback statements here
-- This section runs when reverting the migration

-- Example: Drop table
-- DROP TABLE IF EXISTS example_table;

-- Example: Remove column
-- ALTER TABLE existing_table 
--   DROP COLUMN IF EXISTS new_column;

-- Example: Drop index
-- DROP INDEX IF EXISTS idx_example_name;

-- Example: Drop policy
-- DROP POLICY IF EXISTS "Users can read their own data" 
--   ON example_table;

-- Example: Drop function
-- DROP FUNCTION IF EXISTS updated_at_trigger();

-- ============================================================
-- Notes
-- ============================================================

-- Best Practices:
-- 1. Always use IF EXISTS / IF NOT EXISTS for idempotency
-- 2. Include both UP and DOWN migrations
-- 3. Test migration in dev environment first
-- 4. Keep migrations focused on single purpose
-- 5. Use transactions where appropriate
-- 6. Document any data transformations
-- 7. Consider impact on existing data
-- 8. Add indexes for new foreign keys

-- Migration Checklist:
-- [ ] Tested in local dev environment
-- [ ] Verified rollback works (DOWN migration)
-- [ ] Added proper indexes
-- [ ] Updated RLS policies if needed
-- [ ] Considered data migration if needed
-- [ ] Documented breaking changes
-- [ ] Ready for staging deployment
`;

  return {
    timestamp,
    name: sanitizedName,
    filename,
    content,
  };
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔧 Create Migration File');
  console.log('================================================');
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  pnpm dlx tsx scripts/create-migration.ts "migration_name"');
    console.log('');
    console.log('Examples:');
    console.log('  pnpm dlx tsx scripts/create-migration.ts "add_users_table"');
    console.log('  pnpm dlx tsx scripts/create-migration.ts "create guest chat schema"');
    console.log('  pnpm dlx tsx scripts/create-migration.ts "fix_rls_policies"');
    console.log('');
    process.exit(0);
  }

  const migrationName = args[0];

  if (!migrationName || migrationName.trim().length === 0) {
    console.error('❌ Error: Migration name is required');
    console.error('');
    console.error('Usage:');
    console.error('  pnpm dlx tsx scripts/create-migration.ts "migration_name"');
    console.error('');
    process.exit(1);
  }

  // Generate migration template
  const migration = generateTemplate(migrationName);
  
  console.log(`📝 Migration Details:`);
  console.log(`   Name: ${migration.name}`);
  console.log(`   Timestamp: ${migration.timestamp}`);
  console.log(`   Filename: ${migration.filename}`);
  console.log('');

  // Ensure migrations directory exists
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  if (!existsSync(migrationsDir)) {
    console.log('📁 Creating migrations directory...');
    await mkdir(migrationsDir, { recursive: true });
    console.log('✅ Directory created');
    console.log('');
  }

  // Check if file already exists
  const filePath = join(migrationsDir, migration.filename);
  
  if (existsSync(filePath)) {
    console.error('❌ Error: Migration file already exists!');
    console.error(`   ${filePath}`);
    console.error('');
    console.error('Tip: Wait a second and try again, or use a different name');
    console.error('');
    process.exit(1);
  }

  // Write migration file
  console.log('📝 Writing migration file...');
  await writeFile(filePath, migration.content, 'utf-8');
  
  console.log('✅ Migration file created successfully!');
  console.log('');
  console.log('================================================');
  console.log('📄 File Path');
  console.log('================================================');
  console.log('');
  console.log(filePath);
  console.log('');
  console.log('================================================');
  console.log('📋 Next Steps');
  console.log('================================================');
  console.log('');
  console.log('1. Edit the migration file with your SQL changes');
  console.log('2. Remove example code and add your own');
  console.log('3. Test migration in dev environment:');
  console.log(`   pnpm dlx tsx scripts/apply-migrations-staging.ts`);
  console.log('');
  console.log('4. Verify rollback works (optional):');
  console.log(`   pnpm dlx tsx scripts/rollback-migration-staging.ts`);
  console.log('');
  console.log('5. Commit and push to trigger deployment:');
  console.log('   git add supabase/migrations/');
  console.log(`   git commit -m "feat: ${migration.name}"`);
  console.log('   git push origin dev');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('❌ Unexpected error:', error.message);
  console.error('');
  process.exit(1);
});
