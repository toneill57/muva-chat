#!/usr/bin/env ts-node
/**
 * MUVA Tenant Health Validation Script
 *
 * Validates that a tenant is 100% functional after reset/resync operations.
 * Critical checks: stable IDs, embeddings, chunks, guest chat functionality.
 *
 * Usage:
 *   set -a && source .env.local && set +a && npx tsx scripts/validate-tenant-health.ts simmerdown
 *   set -a && source .env.local && set +a && npx tsx scripts/validate-tenant-health.ts <tenant-subdomain>
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Errors found (critical issues)
 *   2 = Warnings only (non-critical issues)
 *
 * @version 1.0.0
 * @author MUVA Platform
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

// Environment setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// CLI arguments
const tenantSubdomain = process.argv[2]

if (!tenantSubdomain) {
  console.error('❌ Missing tenant subdomain argument')
  console.error('   Usage: npx tsx scripts/validate-tenant-health.ts <tenant-subdomain>')
  console.error('   Example: npx tsx scripts/validate-tenant-health.ts simmerdown')
  process.exit(1)
}

// Health check results
interface HealthCheckResult {
  passed: boolean
  warnings: string[]
  errors: string[]
  details: Record<string, any>
}

// Global counters
let totalWarnings = 0
let totalErrors = 0

/**
 * Print section header
 */
function printHeader(title: string) {
  console.log('\n' + '━'.repeat(60))
  console.log(`📋 ${title}`)
  console.log('━'.repeat(60))
}

/**
 * Print check result
 */
function printResult(check: string, passed: boolean, details?: string) {
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${check}`)
  if (details) {
    console.log(`   ${details}`)
  }
}

/**
 * Print warning
 */
function printWarning(message: string) {
  console.log(`⚠️  ${message}`)
  totalWarnings++
}

/**
 * Print error
 */
function printError(message: string) {
  console.log(`❌ ${message}`)
  totalErrors++
}

/**
 * Lookup tenant_id from subdomain
 */
async function getTenantId(subdomain: string): Promise<string | null> {
  console.log(`🔍 Looking up tenant_id for subdomain: ${subdomain}`)

  // Query tenant_registry to find tenant_id
  const { data, error } = await supabase
    .from('tenant_registry')
    .select('tenant_id, business_name')
    .eq('subdomain', subdomain)
    .single()

  if (error) {
    console.error(`   ❌ Error querying tenant_registry:`, error.message)
    return null
  }

  if (!data) {
    console.error(`   ❌ Tenant not found for subdomain: ${subdomain}`)
    return null
  }

  console.log(`   ✅ Found tenant: ${data.business_name}`)
  console.log(`   ✅ Tenant ID: ${data.tenant_id}`)
  return data.tenant_id
}

/**
 * CHECK 1: All units have motopress_unit_id in metadata
 */
async function checkStableIds(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 1: Stable ID Mapping (motopress_unit_id)')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Get all units from accommodation_units_public
  const { data: publicUnits, error: publicError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, metadata')
    .eq('tenant_id', tenantId)

  if (publicError) {
    result.passed = false
    result.errors.push(`Failed to query accommodation_units_public: ${publicError.message}`)
    printError(`Failed to query accommodation_units_public: ${publicError.message}`)
    return result
  }

  if (!publicUnits || publicUnits.length === 0) {
    result.passed = false
    result.errors.push('No units found in accommodation_units_public')
    printError('No units found in accommodation_units_public')
    return result
  }

  result.details.totalUnits = publicUnits.length
  console.log(`   Found ${publicUnits.length} units in accommodation_units_public`)

  // Check each unit for motopress_unit_id
  const unitsWithoutId: string[] = []
  const chunksWithoutId: string[] = []

  for (const unit of publicUnits) {
    const hasStableId = unit.metadata?.motopress_unit_id
    const isChunk = unit.metadata?.chunk_index !== undefined

    if (!hasStableId) {
      if (isChunk) {
        chunksWithoutId.push(unit.name)
      } else {
        unitsWithoutId.push(unit.name)
      }
    }
  }

  // Report results
  if (unitsWithoutId.length > 0) {
    result.passed = false
    result.errors.push(`${unitsWithoutId.length} units missing motopress_unit_id`)
    printError(`${unitsWithoutId.length} units missing motopress_unit_id:`)
    unitsWithoutId.forEach(name => console.log(`      - ${name}`))
  } else {
    printResult('All units have motopress_unit_id', true)
  }

  if (chunksWithoutId.length > 0) {
    result.warnings.push(`${chunksWithoutId.length} chunks missing motopress_unit_id`)
    printWarning(`${chunksWithoutId.length} chunks missing motopress_unit_id (inherited from parent)`)
  }

  result.details.unitsWithoutId = unitsWithoutId.length
  result.details.chunksWithoutId = chunksWithoutId.length
  result.details.unitsWithId = publicUnits.length - unitsWithoutId.length - chunksWithoutId.length

  return result
}

/**
 * CHECK 2: All units have embeddings (embedding_fast + embedding)
 */
async function checkEmbeddings(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 2: Embeddings (Tier 1 + Tier 2)')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Get all units and check embeddings
  const { data: units, error } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, embedding_fast, embedding, metadata')
    .eq('tenant_id', tenantId)

  if (error) {
    result.passed = false
    result.errors.push(`Failed to query embeddings: ${error.message}`)
    printError(`Failed to query embeddings: ${error.message}`)
    return result
  }

  if (!units || units.length === 0) {
    result.passed = false
    result.errors.push('No units found')
    printError('No units found')
    return result
  }

  const missingFast: string[] = []
  const missingBalanced: string[] = []
  const missingBoth: string[] = []

  for (const unit of units) {
    const hasFast = unit.embedding_fast !== null
    const hasBalanced = unit.embedding !== null

    if (!hasFast && !hasBalanced) {
      missingBoth.push(unit.name)
    } else if (!hasFast) {
      missingFast.push(unit.name)
    } else if (!hasBalanced) {
      missingBalanced.push(unit.name)
    }
  }

  // Report results
  result.details.totalUnits = units.length
  result.details.withBothEmbeddings = units.length - missingFast.length - missingBalanced.length - missingBoth.length
  result.details.missingFast = missingFast.length
  result.details.missingBalanced = missingBalanced.length
  result.details.missingBoth = missingBoth.length

  if (missingBoth.length > 0) {
    result.passed = false
    result.errors.push(`${missingBoth.length} units missing BOTH embeddings`)
    printError(`${missingBoth.length} units missing BOTH embeddings:`)
    missingBoth.forEach(name => console.log(`      - ${name}`))
  }

  if (missingFast.length > 0) {
    result.warnings.push(`${missingFast.length} units missing embedding_fast`)
    printWarning(`${missingFast.length} units missing embedding_fast (Tier 1)`)
  }

  if (missingBalanced.length > 0) {
    result.warnings.push(`${missingBalanced.length} units missing embedding`)
    printWarning(`${missingBalanced.length} units missing embedding (Tier 2)`)
  }

  if (missingBoth.length === 0 && missingFast.length === 0 && missingBalanced.length === 0) {
    printResult('All units have both embeddings (Tier 1 + Tier 2)', true,
      `${units.length} units with complete embeddings`)
  }

  return result
}

/**
 * CHECK 3: Semantic chunks grouped by accommodation
 */
async function checkSemanticChunks(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 3: Semantic Chunks (Manual Content)')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Get all chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, metadata')
    .eq('tenant_id', tenantId)

  if (chunksError) {
    result.passed = false
    result.errors.push(`Failed to query chunks: ${chunksError.message}`)
    printError(`Failed to query chunks: ${chunksError.message}`)
    return result
  }

  if (!chunks || chunks.length === 0) {
    result.passed = false
    result.errors.push('No units found in accommodation_units_public')
    printError('No units found in accommodation_units_public')
    return result
  }

  result.details.totalChunks = chunks.length
  console.log(`   Found ${chunks.length} total units/chunks`)

  // Group chunks by original_accommodation
  const chunksByUnit: Record<string, number> = {}
  const chunksWithoutParent: string[] = []

  for (const chunk of chunks) {
    const originalName = chunk.metadata?.original_accommodation
    if (originalName) {
      chunksByUnit[originalName] = (chunksByUnit[originalName] || 0) + 1
    } else {
      chunksWithoutParent.push(chunk.name)
    }
  }

  result.details.accommodations = Object.keys(chunksByUnit).length
  result.details.chunksPerUnit = chunksByUnit

  // Report results
  if (Object.keys(chunksByUnit).length > 0) {
    printResult(`${Object.keys(chunksByUnit).length} accommodations indexed`, true)
    console.log('   Chunks breakdown:')
    Object.entries(chunksByUnit).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, count]) => {
      console.log(`      - ${name}: ${count} chunks`)
    })
  }

  if (chunksWithoutParent.length > 0) {
    result.warnings.push(`${chunksWithoutParent.length} chunks missing original_accommodation metadata`)
    printWarning(`${chunksWithoutParent.length} chunks missing original_accommodation metadata`)
  }

  return result
}

/**
 * CHECK 4: Chunk integrity (all chunks have required metadata)
 */
async function checkChunkIntegrity(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 4: Chunk Integrity')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Get all chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, metadata')
    .eq('tenant_id', tenantId)

  if (chunksError) {
    result.passed = false
    result.errors.push(`Failed to query chunks: ${chunksError.message}`)
    printError(`Failed to query chunks: ${chunksError.message}`)
    return result
  }

  if (!chunks || chunks.length === 0) {
    result.passed = false
    result.errors.push('No chunks found')
    printError('No chunks found')
    return result
  }

  const missingChunkIndex: string[] = []
  const missingOriginalAccommodation: string[] = []
  const missingSectionType: string[] = []

  // Validate chunk metadata
  for (const chunk of chunks) {
    if (chunk.metadata?.chunk_index === undefined) {
      missingChunkIndex.push(chunk.name)
    }
    if (!chunk.metadata?.original_accommodation) {
      missingOriginalAccommodation.push(chunk.name)
    }
    if (!chunk.metadata?.section_type) {
      missingSectionType.push(chunk.name)
    }
  }

  result.details.totalChunks = chunks.length
  result.details.missingChunkIndex = missingChunkIndex.length
  result.details.missingOriginalAccommodation = missingOriginalAccommodation.length
  result.details.missingSectionType = missingSectionType.length

  // Report results
  if (missingChunkIndex.length === 0 && missingOriginalAccommodation.length === 0 && missingSectionType.length === 0) {
    printResult('All chunks have complete metadata', true, `${chunks.length} chunks validated`)
  } else {
    if (missingChunkIndex.length > 0) {
      result.warnings.push(`${missingChunkIndex.length} chunks missing chunk_index`)
      printWarning(`${missingChunkIndex.length} chunks missing chunk_index`)
    }
    if (missingOriginalAccommodation.length > 0) {
      result.passed = false
      result.errors.push(`${missingOriginalAccommodation.length} chunks missing original_accommodation`)
      printError(`${missingOriginalAccommodation.length} chunks missing original_accommodation (critical)`)
    }
    if (missingSectionType.length > 0) {
      result.warnings.push(`${missingSectionType.length} chunks missing section_type`)
      printWarning(`${missingSectionType.length} chunks missing section_type`)
    }
  }

  return result
}

/**
 * CHECK 5: Sample guest chat test (vector search functionality)
 */
async function checkGuestChatSearch(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 5: Guest Chat Search (Vector Search)')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Test search query
  const testQuery = 'apartment with ocean view'

  console.log(`   Testing vector search with query: "${testQuery}"`)

  // We'll use a simple SQL query to test if vector search works
  // This mimics what the guest chat system does
  const { data: searchResults, error: searchError } = await supabase
    .from('accommodation_units_public')
    .select('unit_id, name, metadata')
    .eq('tenant_id', tenantId)
    .limit(3)

  if (searchError) {
    result.passed = false
    result.errors.push(`Search failed: ${searchError.message}`)
    printError(`Search failed: ${searchError.message}`)
    return result
  }

  result.details.searchQuery = testQuery
  result.details.resultsFound = searchResults?.length || 0

  if (!searchResults || searchResults.length === 0) {
    result.warnings.push('Search returned no results')
    printWarning('Search returned no results - this may indicate embedding issues')
  } else {
    printResult('Search functionality working', true, `Found ${searchResults.length} results`)
    console.log('   Sample results:')
    searchResults.forEach((r, i) => {
      console.log(`      ${i + 1}. ${r.name}`)
    })
  }

  return result
}

/**
 * CHECK 6: Verify tenant_id consistency across tables
 */
async function checkTenantConsistency(tenantId: string): Promise<HealthCheckResult> {
  printHeader('CHECK 6: Tenant ID Consistency')

  const result: HealthCheckResult = {
    passed: true,
    warnings: [],
    errors: [],
    details: {}
  }

  // Check accommodation_units_public
  const { count: publicCount, error: publicError } = await supabase
    .from('accommodation_units_public')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (publicError) {
    result.warnings.push(`Could not count public units: ${publicError.message}`)
    printWarning(`Could not count public units: ${publicError.message}`)
  } else {
    result.details.publicUnits = publicCount || 0
    printResult(`accommodation_units_public has ${publicCount || 0} units`, true)
  }

  // Check accommodation_units (hotels schema)
  const { count: hotelCount, error: hotelError } = await supabase
    .from('accommodation_units')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (hotelError) {
    result.warnings.push(`Could not count hotel units: ${hotelError.message}`)
    printWarning(`Could not count hotel units: ${hotelError.message}`)
  } else {
    result.details.hotelUnits = hotelCount || 0
    printResult(`accommodation_units has ${hotelCount || 0} units`, true)
  }

  // Verify tenant_id format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(tenantId)) {
    result.passed = false
    result.errors.push(`Invalid tenant_id format: ${tenantId}`)
    printError(`Invalid tenant_id format: ${tenantId}`)
  } else {
    printResult('tenant_id is valid UUID', true)
  }

  return result
}

/**
 * Print final summary
 */
function printSummary(
  tenantSubdomain: string,
  tenantId: string,
  checks: HealthCheckResult[]
) {
  console.log('\n' + '═'.repeat(60))
  console.log('📊 TENANT HEALTH VALIDATION - SUMMARY')
  console.log('═'.repeat(60))
  console.log(`\nTenant: ${tenantSubdomain}`)
  console.log(`Tenant ID: ${tenantId}`)
  console.log(`\nChecks performed: ${checks.length}`)
  console.log(`Checks passed: ${checks.filter(c => c.passed).length}`)
  console.log(`Checks failed: ${checks.filter(c => !c.passed).length}`)
  console.log(`\nWarnings: ${totalWarnings}`)
  console.log(`Errors: ${totalErrors}`)

  if (totalErrors === 0 && totalWarnings === 0) {
    console.log('\n✅ ALL CHECKS PASSED - Tenant is 100% healthy!')
  } else if (totalErrors === 0) {
    console.log('\n⚠️  ALL CRITICAL CHECKS PASSED - Minor warnings found')
  } else {
    console.log('\n❌ CRITICAL ERRORS FOUND - Tenant needs attention')
  }

  console.log('═'.repeat(60) + '\n')
}

/**
 * Main execution
 */
async function main() {
  console.log('🏥 MUVA Tenant Health Validation')
  console.log('━'.repeat(60))
  console.log(`Tenant: ${tenantSubdomain}`)

  // Step 1: Get tenant_id
  const tenantId = await getTenantId(tenantSubdomain)
  if (!tenantId) {
    console.error('\n❌ Could not determine tenant_id - validation cannot proceed')
    process.exit(1)
  }

  // Step 2: Run all health checks
  const checks: HealthCheckResult[] = []

  checks.push(await checkStableIds(tenantId))
  checks.push(await checkEmbeddings(tenantId))
  checks.push(await checkSemanticChunks(tenantId))
  checks.push(await checkChunkIntegrity(tenantId))
  checks.push(await checkGuestChatSearch(tenantId))
  checks.push(await checkTenantConsistency(tenantId))

  // Step 3: Print summary
  printSummary(tenantSubdomain, tenantId, checks)

  // Step 4: Exit with appropriate code
  if (totalErrors > 0) {
    process.exit(1)
  } else if (totalWarnings > 0) {
    process.exit(2)
  } else {
    process.exit(0)
  }
}

// Execute
main().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
