#!/usr/bin/env tsx
/**
 * Apply All Migrations to PRD - Final Version
 * Uses direct Supabase connection with service_role key
 *
 * Strategy: Split large files into smaller chunks and execute sequentially
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const PROJECT_URL = 'https://kprqghwdnaykxhostivv.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcnFnaHdkbmF5a3hob3N0aXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMxNzk2OSwiZXhwIjoyMDc4ODkzOTY5fQ.Ypsb1ZpV59b0zAL3JqnyArMx3ZU9OAiltOnsT0rE6MY';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations');
const LOG_FILE = join(process.cwd(), 'docs/three-tier-unified/logs/migrations-prd-application.log');

// Split SQL into individual statements
function splitSQL(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    // Check for dollar-quoted strings ($$, $function$, etc.)
    const dollarMatches = line.match(/\$([a-zA-Z_]*)\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match;
        } else if (match === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }

    current += line + '\n';

    // End of statement (semicolon not in dollar-quote)
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(s => s.length > 0);
}

async function executeSQLDirect(sql: string): Promise<{success: boolean, error?: string}> {
  try {
    const response = await fetch(`${PROJECT_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function applyMigration(filename: string, sql: string): Promise<boolean> {
  const statements = splitSQL(sql);

  console.log(`   Statements: ${statements.length}`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip SET commands and comments
    if (stmt.startsWith('SET ') || stmt.startsWith('SELECT pg_catalog.set_config') || stmt.startsWith('--')) {
      continue;
    }

    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    process.stdout.write(`\r   [${i+1}/${statements.length}] ${preview}...`);

    const result = await executeSQLDirect(stmt);

    if (!result.success) {
      console.log(`\n   ❌ FAILED at statement ${i+1}: ${result.error}`);
      return false;
    }
  }

  console.log(`\r   ✅ All ${statements.length} statements executed successfully`);
  return true;
}

async function main() {
  console.log('🚀 Applying migrations to PRD (main)');
  console.log(`📦 Project: ${PROJECT_URL}`);
  console.log(`📁 Migrations: ${MIGRATIONS_DIR}\n`);

  const logLines: string[] = [
    '# PRD Migration Application Log',
    `Date: ${new Date().toISOString()}`,
    `Project: ${PROJECT_URL}`,
    '',
    '## Migrations Applied',
    ''
  ];

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

    logLines.push(`### ${successCount + failureCount + 1}. ${filename}`);
    logLines.push(`- Size: ${Math.round(sql.length / 1024)}KB`);
    logLines.push(`- Timestamp: ${new Date().toISOString()}`);

    const success = await applyMigration(filename, sql);

    if (success) {
      successCount++;
      logLines.push(`- Result: ✅ SUCCESS`);
    } else {
      failureCount++;
      logLines.push(`- Result: ❌ FAILED`);
      console.log('\n❌ Migration failed, stopping...');
      break;
    }

    logLines.push('');
    console.log('');
  }

  // Summary
  console.log('═'.repeat(80));
  console.log(`📊 Summary:`);
  console.log(`   Total: ${files.length}`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failureCount}`);
  console.log('═'.repeat(80));

  logLines.push('## Summary');
  logLines.push(`- Total: ${files.length}`);
  logLines.push(`- Success: ${successCount}`);
  logLines.push(`- Failed: ${failureCount}`);
  logLines.push(`- Completion: ${new Date().toISOString()}`);

  // Save log
  writeFileSync(LOG_FILE, logLines.join('\n'));
  console.log(`\n📝 Log saved to: ${LOG_FILE}`);

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
