#!/usr/bin/env tsx
/**
 * RPC Functions Validation Script
 *
 * Validates that critical RPC functions have correct search_path configuration.
 * This prevents the recurring "operator does not exist" error with pgvector.
 *
 * Usage:
 *   pnpm dlx tsx scripts/validate-rpc-functions.ts
 *   pnpm dlx tsx scripts/validate-rpc-functions.ts --env=staging
 *   pnpm dlx tsx scripts/validate-rpc-functions.ts --fix (applies fix if validation fails)
 *
 * Exit codes:
 *   0 = All functions valid
 *   1 = Validation failed
 *   2 = Error executing script
 */

import { createClient } from '@supabase/supabase-js';

// Critical functions that MUST have 'extensions' in search_path
const CRITICAL_FUNCTIONS = [
  {
    name: 'match_unit_manual_chunks',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'Guest chat - accommodation manual chunks search',
    critical: true,
  },
  {
    name: 'match_muva_documents',
    requiredSchemas: ['public', 'extensions', 'pg_temp'],
    purpose: 'Tourism content search',
    critical: true,
  },
  {
    name: 'map_hotel_to_public_accommodation_id',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'ID mapping between hotel and public schemas',
    critical: false,
  },
  {
    name: 'map_hotel_to_public_accommodation_id_v1',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'ID mapping v1 (fallback)',
    critical: false,
  },
  {
    name: 'map_hotel_to_public_accommodation_id_v2',
    requiredSchemas: ['public', 'hotels', 'extensions'],
    purpose: 'ID mapping v2 (enhanced)',
    critical: false,
  },
];

interface FunctionInfo {
  proname: string;
  search_path: string | null;
}

interface ValidationResult {
  function: string;
  valid: boolean;
  currentSearchPath: string | null;
  expectedSearchPath: string[];
  missing: string[];
  critical: boolean;
  purpose: string;
}

// Parse command line arguments
const args = process.argv.slice(2);
const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'dev';
const shouldFix = args.includes('--fix');

// Get environment variables
const getEnvVars = (environment: string) => {
  if (environment === 'staging') {
    return {
      url: process.env.STAGING_SUPABASE_URL!,
      key: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!,
    };
  } else {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    };
  }
};

async function validateFunctions(): Promise<ValidationResult[]> {
  const { url, key } = getEnvVars(env);

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials');
    console.error(`   URL: ${url ? '✅' : '❌'}`);
    console.error(`   Key: ${key ? '✅' : '❌'}`);
    process.exit(2);
  }

  const supabase = createClient(url, key);

  console.log(`\n🔍 Validating RPC Functions (${env.toUpperCase()})`);
  console.log(`   Database: ${url.split('//')[1].split('.')[0]}`);
  console.log('='.repeat(80));

  // Query to get function search_path
  const functionNames = CRITICAL_FUNCTIONS.map(f => f.name);
  const functionNamesArray = `ARRAY[${functionNames.map(name => `'${name}'`).join(', ')}]`;

  const query = `
    SELECT
      p.proname,
      array_to_string(p.proconfig, ',') AS search_path
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY(${functionNamesArray});
  `;

  const { data, error } = await supabase.rpc('execute_sql', {
    query,
  });

  if (error) {
    console.error('❌ Error querying functions:', error.message);
    process.exit(2);
  }

  const results: ValidationResult[] = [];
  const functionsMap = new Map<string, FunctionInfo>();

  // Parse results
  if (data && Array.isArray(data)) {
    for (const row of data) {
      functionsMap.set(row.proname, {
        proname: row.proname,
        search_path: row.search_path,
      });
    }
  }

  // Validate each function
  for (const funcConfig of CRITICAL_FUNCTIONS) {
    const funcInfo = functionsMap.get(funcConfig.name);

    if (!funcInfo) {
      results.push({
        function: funcConfig.name,
        valid: false,
        currentSearchPath: null,
        expectedSearchPath: funcConfig.requiredSchemas,
        missing: funcConfig.requiredSchemas,
        critical: funcConfig.critical,
        purpose: funcConfig.purpose,
      });
      continue;
    }

    const currentSchemas = funcInfo.search_path
      ? funcInfo.search_path
          .split(',')
          .map(s => s.replace(/^search_path=/, '').replace(/['"]/g, '').trim())
      : [];

    const missingSchemas = funcConfig.requiredSchemas.filter(
      schema => !currentSchemas.includes(schema)
    );

    const valid = missingSchemas.length === 0;

    results.push({
      function: funcConfig.name,
      valid,
      currentSearchPath: funcInfo.search_path,
      expectedSearchPath: funcConfig.requiredSchemas,
      missing: missingSchemas,
      critical: funcConfig.critical,
      purpose: funcConfig.purpose,
    });
  }

  return results;
}

async function fixFunctions(): Promise<void> {
  console.log('\n🔧 Applying fixes to RPC functions...\n');

  const { url, key } = getEnvVars(env);
  const supabase = createClient(url, key);

  // Read the fix migration
  const fs = await import('fs/promises');
  const path = await import('path');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20251103174416_fix_vector_search_path.sql'
  );

  let migrationSQL: string;
  try {
    migrationSQL = await fs.readFile(migrationPath, 'utf-8');
  } catch (error) {
    console.error('❌ Could not read migration file:', migrationPath);
    process.exit(2);
  }

  // Execute the migration (skip verification blocks)
  const statements = migrationSQL
    .split('-- ============================================================================')
    .filter(s => !s.includes('DO $$'))  // Skip verification blocks
    .filter(s => s.trim().length > 0 && s.includes('CREATE OR REPLACE FUNCTION'));

  console.log(`   Applying ${statements.length} function fixes...`);

  for (const statement of statements) {
    const { error } = await supabase.rpc('execute_sql', {
      query: statement,
    });

    if (error) {
      console.error('❌ Error applying fix:', error.message);
      process.exit(2);
    }
  }

  console.log('✅ All fixes applied successfully\n');
}

function printResults(results: ValidationResult[]): void {
  let hasErrors = false;
  let hasCriticalErrors = false;

  for (const result of results) {
    const icon = result.valid ? '✅' : (result.critical ? '🔴' : '⚠️');
    const status = result.valid ? 'VALID' : 'INVALID';

    console.log(`\n${icon} ${result.function} - ${status}`);
    console.log(`   Purpose: ${result.purpose}`);
    console.log(`   Critical: ${result.critical ? 'YES' : 'NO'}`);

    if (result.currentSearchPath) {
      console.log(`   Current: ${result.currentSearchPath}`);
    } else {
      console.log(`   Current: (function not found)`);
    }

    if (!result.valid) {
      console.log(`   Expected: search_path=${result.expectedSearchPath.join(', ')}`);
      console.log(`   Missing: ${result.missing.join(', ')}`);
      hasErrors = true;
      if (result.critical) {
        hasCriticalErrors = true;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');

  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.filter(r => !r.valid).length;
  const criticalInvalidCount = results.filter(r => !r.valid && r.critical).length;

  console.log(`   Total functions: ${results.length}`);
  console.log(`   Valid: ${validCount}`);
  console.log(`   Invalid: ${invalidCount}`);
  if (criticalInvalidCount > 0) {
    console.log(`   🔴 Critical invalid: ${criticalInvalidCount}`);
  }

  console.log('\n' + '='.repeat(80));

  if (hasCriticalErrors) {
    console.log('\n🚨 CRITICAL: Guest chat will NOT work until fixed!\n');
    console.log('To fix, run:');
    console.log(`   pnpm dlx tsx scripts/validate-rpc-functions.ts --env=${env} --fix\n`);
    return;
  }

  if (hasErrors) {
    console.log('\n⚠️  Some non-critical functions have issues.\n');
    console.log('To fix, run:');
    console.log(`   pnpm dlx tsx scripts/validate-rpc-functions.ts --env=${env} --fix\n`);
  } else {
    console.log('\n✅ All RPC functions are correctly configured!\n');
  }
}

// Main execution
async function main() {
  try {
    const results = await validateFunctions();
    printResults(results);

    if (shouldFix) {
      const hasInvalid = results.some(r => !r.valid);
      if (hasInvalid) {
        await fixFunctions();

        // Re-validate after fix
        console.log('🔍 Re-validating after fix...\n');
        const newResults = await validateFunctions();
        printResults(newResults);

        const stillInvalid = newResults.some(r => !r.valid);
        process.exit(stillInvalid ? 1 : 0);
      } else {
        console.log('ℹ️  No fixes needed - all functions already valid\n');
        process.exit(0);
      }
    } else {
      const hasInvalid = results.some(r => !r.valid);
      process.exit(hasInvalid ? 1 : 0);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(2);
  }
}

main();
