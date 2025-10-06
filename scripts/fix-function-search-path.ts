#!/usr/bin/env tsx

/**
 * Script: Fix Function Search Path (Security Issue)
 *
 * Purpose: Add `SET search_path = public, pg_temp` to 52 functions that are missing it.
 *
 * Issue: Functions without immutable search_path are vulnerable to SQL injection
 *        if an attacker modifies the search_path before calling the function.
 *
 * Severity: WARNING (not critical, but should be fixed)
 *
 * Reference: https://supabase.com/docs/guides/database/postgres-security
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=xxx \
 *   SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   npx tsx scripts/fix-function-search-path.ts
 *
 * Options:
 *   --dry-run    Show what would be changed without applying
 *   --verbose    Show detailed output
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const isDryRun = process.argv.includes('--dry-run')
const isVerbose = process.argv.includes('--verbose')

// ============================================================================
// STEP 1: Query to find all functions without SET search_path
// ============================================================================

const QUERY_FUNCTIONS_WITHOUT_SEARCH_PATH = `
  SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as args,
    pg_get_functiondef(p.oid) as definition,
    CASE
      WHEN prosecdef THEN 'SECURITY DEFINER'
      ELSE 'SECURITY INVOKER'
    END as security_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname LIKE 'match_%'  -- Focus on search functions
    AND NOT EXISTS (
      -- Check if search_path is already set
      SELECT 1
      FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  ORDER BY p.proname;
`

interface FunctionInfo {
  schema_name: string
  function_name: string
  args: string
  definition: string
  security_type: string
}

async function getFunctionsWithoutSearchPath(): Promise<FunctionInfo[]> {
  // Remove trailing semicolon from query before wrapping
  const cleanQuery = QUERY_FUNCTIONS_WITHOUT_SEARCH_PATH.trim().replace(/;$/, '')

  const { data, error } = await supabase.rpc('execute_sql', {
    query: `SELECT json_agg(row_to_json(t)) as result FROM (${cleanQuery}) t`
  })

  if (error) {
    console.error('❌ Error querying functions:', error.message)
    process.exit(1)
  }

  if (isVerbose) {
    console.log('DEBUG: Raw data from execute_sql:', JSON.stringify(data, null, 2))
  }

  // execute_sql returns jsonb, extract the array from result field
  let result: FunctionInfo[] = []

  if (Array.isArray(data)) {
    result = data
  } else if (data && typeof data === 'object') {
    // Could be { result: [...] } or [{ result: [...] }]
    const obj = Array.isArray(data) ? data[0] : data
    result = obj?.result || obj?.json_agg || []
  }

  if (isVerbose) {
    console.log('DEBUG: Extracted result:', result)
  }

  return result as FunctionInfo[]
}

// ============================================================================
// STEP 2: Generate fixed function definition
// ============================================================================

function generateFixedDefinition(func: FunctionInfo): string {
  const { definition } = func

  // Find the end of the function (before the final semicolon)
  // We need to add SET search_path before the language declaration

  // Pattern: LANGUAGE plpgsql [SECURITY DEFINER];
  const languagePattern = /(LANGUAGE\s+\w+)(\s+SECURITY\s+DEFINER)?;?$/mi
  const match = definition.match(languagePattern)

  if (!match) {
    throw new Error(`Could not find LANGUAGE declaration in function ${func.function_name}`)
  }

  // Insert SET search_path before the final semicolon
  const fixedDefinition = definition.replace(
    languagePattern,
    '$1$2\nSET search_path = public, pg_temp;'
  )

  return fixedDefinition
}

// ============================================================================
// STEP 3: Apply fix to database
// ============================================================================

async function applyFix(func: FunctionInfo, fixedDefinition: string): Promise<boolean> {
  // Use ALTER FUNCTION instead of DROP + CREATE (safer, preserves dependencies)
  const alterQuery = `ALTER FUNCTION public.${func.function_name}(${func.args}) SET search_path = public, pg_temp;`

  if (isVerbose) {
    console.log('\n' + '='.repeat(80))
    console.log(`Function: public.${func.function_name}(${func.args})`)
    console.log('='.repeat(80))
    console.log('\n--- ALTER ---')
    console.log(alterQuery)
  }

  if (isDryRun) {
    console.log(`🔍 [DRY RUN] Would fix: ${func.function_name}`)
    return true
  }

  // Execute ALTER
  const { error } = await supabase.rpc('execute_sql', {
    query: alterQuery
  })

  if (error) {
    console.error(`❌ Error altering ${func.function_name}:`, error.message)
    return false
  }

  return true
}

// ============================================================================
// STEP 4: Main execution
// ============================================================================

async function main() {
  console.log('🔍 Searching for functions without SET search_path...\n')

  const functions = await getFunctionsWithoutSearchPath()

  if (functions.length === 0) {
    console.log('✅ All functions already have SET search_path configured!')
    return
  }

  console.log(`📊 Found ${functions.length} functions to fix:\n`)

  functions.forEach((func, index) => {
    console.log(`  ${index + 1}. ${func.function_name}(${func.args})`)
  })

  console.log()

  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode (no changes will be made)\n')
  }

  let successCount = 0
  let failCount = 0

  for (const func of functions) {
    try {
      const fixedDefinition = generateFixedDefinition(func)
      const success = await applyFix(func, fixedDefinition)

      if (success) {
        successCount++
        if (!isDryRun) {
          console.log(`✅ Fixed: ${func.function_name}`)
        }
      } else {
        failCount++
      }
    } catch (error) {
      console.error(`❌ Error processing ${func.function_name}:`, error)
      failCount++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 Summary:')
  console.log('='.repeat(80))
  console.log(`Total functions: ${functions.length}`)
  console.log(`✅ Success: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)

  if (isDryRun) {
    console.log('\n🔍 This was a DRY RUN. Run without --dry-run to apply changes.')
  } else {
    console.log('\n✅ All fixes applied successfully!')
  }

  if (failCount > 0) {
    console.error('\n⚠️  Some functions failed to update. Please review the errors above.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
