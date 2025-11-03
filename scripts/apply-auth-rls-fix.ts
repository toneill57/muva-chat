#!/usr/bin/env tsx
/**
 * Apply auth_rls_initplan fixes via MCP apply_migration
 * Reads the large SQL file and applies it
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const sqlPath = join(process.cwd(), 'migrations/fixes/2025-11-01-fix-auth-rls-initplan.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📄 Read migration file:', sqlPath);
console.log('📏 Size:', sql.length, 'characters');
console.log('\n🚀 Applying via psql...\n');

try {
  // Write SQL to temp file for psql
  const tmpFile = '/tmp/auth-rls-fix.sql';
  writeFileSync(tmpFile, sql);

  // Execute via psql using environment variables
  const result = execSync(
    `PGPASSWORD="${process.env.SUPABASE_DB_PASSWORD}" psql ` +
    `-h aws-0-us-west-1.pooler.supabase.com ` +
    `-p 6543 ` +
    `-U postgres.ztfslsrkemlfqjpzksir ` +
    `-d postgres ` +
    `-f ${tmpFile}`,
    { encoding: 'utf-8', stdio: 'pipe' }
  );

  console.log('✅ Migration applied successfully!');
  console.log(result);
} catch (error: any) {
  console.error('❌ Migration failed:');
  console.error(error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
  process.exit(1);
}
