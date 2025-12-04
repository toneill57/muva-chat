/**
 * Apply pending migrations to PRD via Supabase Management API
 *
 * This script:
 * 1. Reads all migration files from /migrations directory
 * 2. Checks which are already applied (schema_migrations table)
 * 3. Applies pending migrations in order
 * 4. Registers each migration in schema_migrations
 *
 * Usage: pnpm dlx tsx scripts/apply-migrations-prd.ts
 *
 * Required env vars:
 * - SUPABASE_PRD_PROJECT_ID
 * - SUPABASE_ACCESS_TOKEN
 */

import fs from 'fs';
import path from 'path';

const PROJECT_ID = process.env.SUPABASE_PRD_PROJECT_ID;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_ID || !ACCESS_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('  - SUPABASE_PRD_PROJECT_ID');
  console.error('  - SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;

interface Migration {
  version: string;
  name: string;
  filename: string;
  sql: string;
}

async function executeSQL(sql: string): Promise<any> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`SQL execution failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await executeSQL(
    "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"
  );

  return new Set(result.map((row: any) => row.version));
}

function getAllMigrations(): Migration[] {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && /^\d{14}_/.test(f))
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d{14})_(.+)\.sql$/);
    if (!match) throw new Error(`Invalid migration filename: ${filename}`);

    const [, version, name] = match;
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');

    return { version, name, filename, sql };
  });
}

async function registerMigration(version: string, name: string): Promise<void> {
  await executeSQL(
    `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) ` +
    `VALUES ('${version}', '${name}', ARRAY['-- applied']::text[])`
  );
}

async function main() {
  console.log('');
  console.log('================================================');
  console.log('🔄 Applying PRD Migrations');
  console.log('================================================');
  console.log('');

  try {
    // Get applied migrations
    console.log('📋 Checking applied migrations...');
    const applied = await getAppliedMigrations();
    console.log(`✅ Found ${applied.size} applied migrations`);

    // Get all migrations
    console.log('');
    console.log('📂 Reading migration files...');
    const allMigrations = getAllMigrations();
    console.log(`✅ Found ${allMigrations.length} migration files`);

    // Find pending migrations
    const pending = allMigrations.filter(m => !applied.has(m.version));

    if (pending.length === 0) {
      console.log('');
      console.log('✅ No pending migrations - database is up to date');
      console.log('');
      process.exit(0);
    }

    console.log('');
    console.log(`⚠️  Found ${pending.length} pending migration(s):`);
    pending.forEach(m => console.log(`   - ${m.version}_${m.name}`));
    console.log('');

    // Apply pending migrations
    for (const migration of pending) {
      console.log(`📝 Applying: ${migration.filename}...`);

      try {
        // Execute migration SQL
        await executeSQL(migration.sql);
        console.log(`   ✅ SQL executed`);

        // Register migration
        await registerMigration(migration.version, migration.name);
        console.log(`   ✅ Registered in schema_migrations`);
        console.log('');
      } catch (error) {
        console.error(`   ❌ Failed to apply migration: ${error}`);
        throw error;
      }
    }

    console.log('================================================');
    console.log(`✅ Successfully applied ${pending.length} migration(s)`);
    console.log('================================================');
    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('================================================');
    console.error('❌ Migration Error');
    console.error('================================================');
    console.error(error);
    console.error('');
    process.exit(1);
  }
}

main();
