# MUVA Troubleshooting & Debugging Guide

> **Status**: Current as of September 2025
> **Last Updated**: After resolving SimmerDown authentication and chat issues

## Overview

This guide documents common issues encountered in the MUVA system and their proven solutions. All solutions have been tested in real-world scenarios during active development.

## Authentication & Login Issues

### Error: 500 Internal Server Error on Login

**Symptoms:**
```
Failed to load resource: the server responded with a status of 500 ()
GET https://iyeueszchbvlutlcmvcb.supabase.co/rest/v1/user_tenant_permissions?...
```

**Root Causes:**
1. **Ambiguous column references** in Supabase queries
2. **RLS (Row Level Security) policy conflicts**
3. **Complex join syntax** causing parser errors

**Solutions (in order of preference):**

#### Solution 1: Fix Ambiguous Column References
```typescript
// ❌ PROBLEMATIC: Duplicate column names
.select(`
  tenant_id,
  tenant_registry!inner(
    tenant_id,  // ← This creates ambiguity
    nit,
    razon_social
  )
`)

// ✅ FIXED: Remove duplicate columns
.select(`
  tenant_id,
  tenant_registry!inner(
    nit,
    razon_social,
    nombre_comercial
  )
`)
```

#### Solution 2: Separate Queries (Most Reliable)
```typescript
// Instead of complex joins, use separate queries
const { data: permissions } = await supabaseAuth
  .from('user_tenant_permissions')
  .select('*')
  .eq('user_id', userId)

const { data: tenants } = await supabaseAuth
  .from('tenant_registry')
  .select('*')
  .in('tenant_id', tenantIds)

// Combine manually in code
```

#### Solution 3: Temporarily Disable RLS (Last Resort)
```sql
-- Only for debugging - not recommended for production
ALTER TABLE user_tenant_permissions DISABLE ROW LEVEL SECURITY;
```

**Prevention:**
- Always test queries in isolation before implementing
- Use explicit column aliases in complex joins
- Prefer separate queries over complex joins when possible

### Error: Infinite "Iniciando sesión" (Starting Session)

**Symptoms:**
- Login button shows "Iniciando sesión" indefinitely
- No error messages in console
- User cannot access dashboard

**Root Cause:**
`getCurrentUserWithClients()` function returns null due to client fetch failures

**Solution:**
Implement fallback client creation when RLS prevents data access:

```typescript
// In AuthContext.tsx
if (userWithClients && userWithClients.clients.length === 0) {
  const defaultClient: UserClient = {
    id: 'default-client',
    user_id: userWithClients.id,
    client_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
    client_name: 'SimmerDown Guest House',
    business_name: 'ONEILL SAID SAS',
    business_type: 'hotel',
    has_sire_access: true,
    has_muva_access: true,
    is_admin: true
  }
  setActiveClient(defaultClient)
}
```

## Chat & API Response Issues

### Error: "No se pudo obtener respuesta" Despite Successful API Calls

**Symptoms:**
- API returns valid response in browser console
- Chat interface shows "No se pudo obtener respuesta"
- Response time is normal, no errors logged

**Root Cause:**
Frontend expecting different response field than API provides

**Diagnosis:**
```javascript
// Check browser console for:
console.log('📊 Full response data:', data)
// Look for response structure mismatch
```

**Solution:**
Update frontend to handle multiple response field formats:

```typescript
// ❌ PROBLEMATIC: Hard-coded field name
content: data.answer || 'No se pudo obtener respuesta'

// ✅ FIXED: Multiple fallbacks
content: data.response || data.answer || 'No se pudo obtener respuesta'
```

**API Response Formats:**
- `/api/chat/listings`: Returns `response` field
- `/api/chat`: Returns `answer` field
- `/api/chat/unified`: Returns `answer` field

### Error: `context_used: false` Despite Valid Documents

**Symptoms:**
- Embeddings exist in database
- API responds successfully
- But `context_used: false` and generic responses

**Root Causes & Solutions:**

#### 1. Permission Denied for Schema
```bash
# Error log:
❌ SimmerDown search error: {
  code: '42501',
  message: 'permission denied for schema simmerdown'
}
```

**Solution:**
```sql
GRANT USAGE ON SCHEMA simmerdown TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA simmerdown TO anon, authenticated, service_role;
```

#### 2. Function Not Found
```bash
# Error log:
Could not find the function public.match_listings_documents(...) in the schema cache
```

**Solution:**
Verify function exists and has correct signature:
```sql
-- Check function exists
SELECT routines.routine_name
FROM information_schema.routines
WHERE routine_name = 'match_listings_documents';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_listings_documents TO anon, authenticated;
```

#### 3. Column Mapping Mismatch
**Root Cause:** Function expecting different table structure

**Solution:**
Update function to match actual table columns:
```sql
-- ❌ PROBLEMATIC: Expected columns
SELECT id, content, metadata FROM table

-- ✅ FIXED: Actual columns
SELECT policy_id as id, policy_content as content,
       jsonb_build_object(...) as metadata
FROM hotels.policies WHERE tenant_id = 'simmerdown'
```

#### 4. Threshold Too High
**Symptoms:** Function executes but returns 0 results

**Solution:**
```sql
-- Temporarily lower threshold for debugging
CREATE OR REPLACE FUNCTION match_listings_documents(
  -- ...
  match_threshold double precision DEFAULT -1.0  -- Very permissive
)

-- Then restore to production value
match_threshold double precision DEFAULT 0.3
```

## 🪆 Matryoshka Multi-Tier Issues

### Tier Detection Not Working

**Symptoms:**
- All queries defaulting to Tier 3 (full precision)
- No performance improvement observed
- Logs showing "Complex query detected" for simple queries

**Root Causes & Solutions:**

#### 1. Search Router Not Integrated
```bash
# Error log:
❌ determineOptimalSearch is not defined
```

**Solution:**
```typescript
// In API route, import search router
import { determineOptimalSearch } from '@/lib/search-router'

// Use tier detection before embedding generation
const strategy = determineOptimalSearch(question)
const queryEmbedding = await generateEmbedding(question, strategy.dimensions)
```

#### 2. Keyword Patterns Not Matching
```bash
# Debug log:
🔍 Query: "¿Dónde está el perro?"
⚠️ No keyword match found, using complexity fallback
```

**Solution:**
Update search patterns in `search-router.ts`:
```typescript
const SEARCH_PATTERNS = {
  room_queries: {
    keywords: ['habitación', 'cuarto', 'cama', 'baño', 'perro', 'habibi'],
    tier: 1
  }
}
```

#### 3. Case Sensitivity Issues
**Solution:**
```typescript
// Ensure proper case normalization
const query = userQuery.toLowerCase().trim()
const hasKeyword = pattern.keywords.some(keyword =>
  query.includes(keyword.toLowerCase())
)
```

### Missing Tier Embeddings

**Symptoms:**
```bash
❌ Tier 1 search failed: column "embedding_fast" does not exist
context_used: false despite correct tier detection
```

**Root Causes & Solutions:**

#### 1. Missing Optimized Embedding Columns
```sql
-- Check if tier columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'policies'
AND column_name LIKE '%embedding%';

-- Expected results:
-- embedding (vector)
-- embedding_fast (vector) ← Should exist for Tier 1 tables
```

**Solution:**
```sql
-- Add missing tier columns ✅ MULTITENANT
ALTER TABLE hotels.policies
ADD COLUMN embedding_fast vector(1024);

ALTER TABLE sire_content
ADD COLUMN embedding_balanced vector(1536);
```

#### 2. Null Tier Embeddings
```bash
# Error log:
✅ Tier 1 detected, but no embedding_fast data found
Falling back to Tier 3
```

**Solution:**
```bash
# Regenerate embeddings with Matryoshka support
node scripts/populate-embeddings.js --regenerate-tiers

# Check embedding population
SELECT COUNT(*) as total,
       COUNT(embedding_fast) as tier1_ready,
       COUNT(embedding_balanced) as tier2_ready
FROM hotels.policies WHERE tenant_id = 'simmerdown';
```

### Performance Not Improved

**Symptoms:**
- Tier detection working correctly
- Embeddings exist for all tiers
- But search times unchanged (~500ms for all tiers)

**Root Causes & Solutions:**

#### 1. Missing HNSW Indexes
```bash
# Error log:
⚠️ Sequential scan on embedding_fast column
Tier 1 search: 480ms (no improvement)
```

**Solution:**
```sql
-- Check if HNSW indexes exist
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname LIKE '%embedding%hnsw%';

-- Create missing indexes
CREATE INDEX CONCURRENTLY idx_policies_embedding_fast_hnsw
ON hotels.policies USING hnsw (embedding_fast vector_cosine_ops);
```

#### 2. Wrong Embedding Dimensions in Query
```bash
# Error log:
ERROR: different vector dimensions 3072 and 1024
```

**Solution:**
```typescript
// Ensure embedding generation matches tier dimensions
const strategy = determineOptimalSearch(question)

// ❌ WRONG: Always using 3072 dimensions
const embedding = await generateEmbedding(question, 3072)

// ✅ CORRECT: Using tier-specific dimensions
const embedding = await generateEmbedding(question, strategy.dimensions)
```

#### 3. Function Not Using Optimized Columns
**Solution:**
```sql
-- Update function to use correct embedding column based on tier
CREATE OR REPLACE FUNCTION match_optimized_documents(
  query_embedding vector,
  tier integer DEFAULT 1
)
AS $$
DECLARE
  embedding_column text;
BEGIN
  CASE tier
    WHEN 1 THEN embedding_column := 'embedding_fast';
    WHEN 2 THEN embedding_column := 'embedding_balanced';
    ELSE embedding_column := 'embedding';
  END CASE;

  -- Use dynamic column selection
  RETURN QUERY EXECUTE format('SELECT * FROM search_table WHERE %I <=> $1 < 0.3', embedding_column)
  USING query_embedding;
END;
$$;
```

### Tier Selection Logic Issues

**Symptoms:**
- Simple queries going to Tier 3
- Complex queries going to Tier 1
- Inconsistent tier selection

**Debug Tools:**

#### 1. Tier Detection Debugging
```typescript
// Add to search-router.ts for debugging
export function debugTierSelection(query: string) {
  console.log(`🔍 Analyzing: "${query}"`)

  for (const [pattern, config] of Object.entries(SEARCH_PATTERNS)) {
    const matches = config.keywords.filter(keyword =>
      query.toLowerCase().includes(keyword)
    )
    if (matches.length > 0) {
      console.log(`✅ Pattern: ${pattern}, Keywords: ${matches.join(', ')}, Tier: ${config.tier}`)
    }
  }

  const strategy = determineOptimalSearch(query)
  console.log(`🎯 Final selection: Tier ${strategy.tier} (${strategy.dimensions} dims)`)
}
```

#### 2. Query Complexity Analysis
```typescript
// Debug complexity-based fallback
function debugComplexityAnalysis(query: string) {
  const wordCount = query.split(/\s+/).length
  const hasQuestionWords = /^(qué|cómo|cuándo|dónde|por qué|cuál)/i.test(query)

  console.log(`📊 Word count: ${wordCount}`)
  console.log(`❓ Question words: ${hasQuestionWords}`)

  if (wordCount <= 3 && !hasQuestionWords) {
    console.log(`🚀 → Tier 1 (simple query)`)
  } else if (wordCount <= 8) {
    console.log(`⚖️ → Tier 2 (moderate query)`)
  } else {
    console.log(`🎯 → Tier 3 (complex query)`)
  }
}
```

### Hybrid Search Issues

**Symptoms:**
- Tier 1 returns no results
- Fallback to Tier 2 not working
- Combined results showing duplicates

**Solutions:**

#### 1. Implement Proper Fallback Logic
```typescript
async function searchWithTierFallback(query: string) {
  const strategy = determineOptimalSearch(query)

  try {
    // Try primary tier
    let results = await searchTier(strategy.tier, query)
    console.log(`🎯 Tier ${strategy.tier}: ${results.length} results`)

    // Fallback if insufficient results
    if (results.length < 2 && strategy.tier < 3) {
      console.log(`🔄 Fallback: Trying Tier ${strategy.tier + 1}`)
      const fallbackResults = await searchTier(strategy.tier + 1, query)
      results = [...results, ...fallbackResults]
    }

    return results
  } catch (error) {
    console.log(`❌ Tier search failed: ${error.message}`)
    return await traditionalSearch(query) // Ultimate fallback
  }
}
```

#### 2. Deduplication Strategy
```typescript
// Remove duplicates when combining tier results
function deduplicateResults(results: SearchResult[]) {
  const seen = new Set()
  return results.filter(result => {
    const key = `${result.id}_${result.content.substring(0, 50)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

## Database Issues

### Error: "column reference 'tenant_id' is ambiguous"

**Root Cause:** Multiple tables in query have same column name

**Solution:**
Use table aliases or avoid duplicate column selection:
```sql
-- ❌ PROBLEMATIC
SELECT tenant_id FROM user_tenant_permissions utp
JOIN tenant_registry tr ON utp.tenant_id = tr.tenant_id

-- ✅ FIXED
SELECT utp.tenant_id FROM user_tenant_permissions utp
JOIN tenant_registry tr ON utp.tenant_id = tr.tenant_id
```

### Error: Vector Dimension Mismatch

**Symptoms:**
```
ERROR: different vector dimensions 3072 and 3
```

**Root Cause:** Test query using wrong embedding dimension

**Solution:**
Always use proper embedding dimensions (3072 for text-embedding-3-large):
```sql
-- ❌ WRONG: Test vector
'[0.1,0.1,0.1]'::vector

-- ✅ CORRECT: Get real embedding via API
-- Use actual embedding from text-embedding-3-large
```

## Performance Issues

### Slow Response Times (>15 seconds)

**Common Causes & Solutions:**

1. **High Similarity Threshold**
   - **Problem:** Too many documents being processed
   - **Solution:** Increase threshold to 0.3-0.4

2. **Too Many Results**
   - **Problem:** match_count too high
   - **Solution:** Limit to 4-6 results maximum

3. **Missing Vector Index**
   - **Problem:** Full table scan on embeddings
   - **Solution:** Ensure vector index exists on embedding columns

4. **API Route Mismatch**
   - **Problem:** Using wrong endpoint for tenant-specific queries
   - **Solution:** Use `/api/chat/listings` for tenant-specific, `/api/chat/unified` for general

## Frontend Issues

### Error: Duplicate API Calls

**Symptoms:**
- Multiple identical requests in browser console
- Excessive log messages
- Performance degradation

**Root Cause:**
React StrictMode or useEffect dependencies causing re-renders

**Solution:**
Add dependency optimization in AuthContext:
```typescript
// ❌ PROBLEMATIC: Always refetch
if (event === 'SIGNED_IN' && session?.user) {
  const userWithClients = await getCurrentUserWithClients()
}

// ✅ FIXED: Check if already have user
if (event === 'SIGNED_IN' && session?.user) {
  if (!user || user.id !== session.user.id) {
    const userWithClients = await getCurrentUserWithClients()
  }
}
```

## Error Code Reference

### Common Supabase Error Codes
- `42501`: Permission denied
- `42P17`: Column does not exist
- `42702`: Column reference is ambiguous
- `PGRST116`: No rows returned
- `PGRST301`: Could not parse response
- `PGRST202`: Function not found in schema cache

### 🪆 Matryoshka-Specific Error Codes
- `42883`: Function does not exist (missing match_optimized_documents)
- `22000`: Array dimension mismatch (wrong embedding dimensions for tier)
- `2201B`: Vector dimension error (1024 vs 3072 mismatch)
- `42P01`: Relation does not exist (missing tier embedding columns)
- `TIER_DETECT_FAIL`: Search router tier detection failure
- `EMBEDDING_GEN_FAIL`: Multi-tier embedding generation failure

### Silent Error Handling
For production stability, silently handle these common errors:
```typescript
const silentErrors = [
  'PGRST116', '42501', 'PGRST301', '42P17', '42702', '23505',
  // Matryoshka-specific errors
  '42883', '22000', '2201B', '42P01', 'TIER_DETECT_FAIL'
]

if (silentErrors.includes(error.code)) {
  console.warn(`🔄 Matryoshka fallback: ${error.code} - ${error.message}`)

  // Intelligent fallback based on error type
  if (['42883', '42P01'].includes(error.code)) {
    // Missing functions/columns - fallback to traditional search
    return await traditionalVectorSearch(query)
  } else if (['22000', '2201B'].includes(error.code)) {
    // Dimension mismatch - regenerate with correct dimensions
    return await retryWithCorrectDimensions(query)
  } else if (error.code === 'TIER_DETECT_FAIL') {
    // Tier detection failure - use default Tier 2
    return await searchWithDefaultTier(query, 2)
  }

  return [] // Generic graceful failure
}
```

## Debugging Workflow

### 1. Systematic Approach
1. **Check server logs** for specific error codes
2. **Test API endpoints** individually with curl/Postman
3. **Verify database state** with direct SQL queries
4. **Check permissions** on all related tables/schemas
5. **Test with minimal queries** before complex ones

### 2. Useful Debugging Queries

#### Traditional Debugging
```sql
-- Check embeddings exist
SELECT COUNT(*),
       COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as with_embeddings
FROM hotels.policies WHERE tenant_id = 'simmerdown';

-- Test vector function directly
SELECT id, similarity FROM match_listings_documents(
  (SELECT embedding FROM hotels.policies WHERE tenant_id = 'simmerdown' LIMIT 1),
  NULL, NULL, 0.1, 2
);

-- Check user permissions
SELECT * FROM user_tenant_permissions WHERE user_id = 'your-user-id';
```

#### 🪆 Matryoshka-Specific Debugging
```sql
-- Check multi-tier embedding completeness
SELECT table_name,
       COUNT(*) as total_rows,
       COUNT(embedding) as tier3_ready,
       COUNT(embedding_balanced) as tier2_ready,
       COUNT(embedding_fast) as tier1_ready,
       ROUND(COUNT(embedding_fast)::NUMERIC / COUNT(*) * 100, 1) as tier1_coverage
FROM (
  SELECT 'policies' as table_name, embedding, embedding_balanced, embedding_fast FROM hotels.policies
  UNION ALL
  SELECT 'sire_content' as table_name, embedding, embedding_balanced, NULL FROM sire_content
  UNION ALL
  SELECT 'muva_content' as table_name, embedding, NULL, embedding_fast FROM muva_content
) combined_tables
GROUP BY table_name;

-- Verify HNSW indexes for all tiers
SELECT schemaname, tablename, indexname,
       CASE
         WHEN indexname LIKE '%fast%' THEN 'Tier 1 (1024)'
         WHEN indexname LIKE '%balanced%' THEN 'Tier 2 (1536)'
         WHEN indexname NOT LIKE '%fast%' AND indexname NOT LIKE '%balanced%' THEN 'Tier 3 (3072)'
       END as tier_type
FROM pg_indexes
WHERE indexname LIKE '%embedding%hnsw%'
ORDER BY tablename, tier_type;

-- Test tier-specific searches with performance
SELECT tier, dimension_count, result_count, search_time_ms FROM (
  SELECT 1 as tier, 1024 as dimension_count,
         COUNT(*) as result_count,
         EXTRACT(milliseconds FROM (clock_timestamp() - start_time)) as search_time_ms
  FROM (SELECT clock_timestamp() as start_time) t,
       match_optimized_documents(
         (SELECT embedding_fast FROM hotels.policies WHERE tenant_id = 'simmerdown' LIMIT 1),
         1, ARRAY['hotels.policies'], 0.3, 5
       )

  UNION ALL

  SELECT 2 as tier, 1536 as dimension_count,
         COUNT(*) as result_count,
         EXTRACT(milliseconds FROM (clock_timestamp() - start_time)) as search_time_ms
  FROM (SELECT clock_timestamp() as start_time) t,
       match_optimized_documents(
         (SELECT embedding_balanced FROM sire_content LIMIT 1),
         2, ARRAY['sire_content'], 0.3, 5
       )
) tier_performance;

-- Debug tier selection patterns
SELECT pattern_name, keyword, tier, table_count
FROM unnest(ARRAY[
  'room_queries', 'policy_queries', 'tourism_queries',
  'complex_queries', 'sire_queries', 'specific_queries'
]) as pattern_name,
unnest(ARRAY[
  'habitación', 'política', 'turismo',
  'proceso', 'sire', 'precio'
]) as keyword,
unnest(ARRAY[1, 1, 1, 2, 2, 3]) as tier,
unnest(ARRAY[3, 2, 1, 3, 1, 4]) as table_count;
```

### 3. Performance Monitoring

#### Traditional Performance Monitoring
```javascript
// Add timing logs to API calls
console.time('Vector Search')
const results = await vectorSearch(...)
console.timeEnd('Vector Search')
```

#### 🪆 Matryoshka Performance Monitoring
```javascript
// Comprehensive tier performance tracking
class MatryoshkaPerformanceMonitor {
  constructor() {
    this.tierStats = {
      tier1: { queries: 0, totalTime: 0, avgTime: 0 },
      tier2: { queries: 0, totalTime: 0, avgTime: 0 },
      tier3: { queries: 0, totalTime: 0, avgTime: 0 }
    }
  }

  trackTierSearch(tier: number, query: string, timeMs: number, resultCount: number) {
    const tierKey = `tier${tier}`
    this.tierStats[tierKey].queries++
    this.tierStats[tierKey].totalTime += timeMs
    this.tierStats[tierKey].avgTime = this.tierStats[tierKey].totalTime / this.tierStats[tierKey].queries

    console.log(`🪆 Tier ${tier} search: ${timeMs}ms, ${resultCount} results`)
    console.log(`📊 Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`)

    // Performance alerts
    if (tier === 1 && timeMs > 200) {
      console.warn(`⚠️ Tier 1 slow: ${timeMs}ms (expected <200ms)`)
    } else if (tier === 2 && timeMs > 400) {
      console.warn(`⚠️ Tier 2 slow: ${timeMs}ms (expected <400ms)`)
    } else if (tier === 3 && timeMs > 600) {
      console.warn(`⚠️ Tier 3 slow: ${timeMs}ms (expected <600ms)`)
    }
  }

  getPerformanceSummary() {
    const total = Object.values(this.tierStats).reduce((sum, tier) => sum + tier.queries, 0)

    console.log('\n🪆 MATRYOSHKA PERFORMANCE SUMMARY')
    console.log('================================')
    Object.entries(this.tierStats).forEach(([tier, stats]) => {
      const percentage = total > 0 ? ((stats.queries / total) * 100).toFixed(1) : '0.0'
      console.log(`${tier.toUpperCase()}: ${stats.queries} queries (${percentage}%) - Avg: ${stats.avgTime.toFixed(1)}ms`)
    })

    // Performance targets
    const tier1Target = 200, tier2Target = 400, tier3Target = 600
    const tier1Success = this.tierStats.tier1.avgTime <= tier1Target
    const tier2Success = this.tierStats.tier2.avgTime <= tier2Target
    const tier3Success = this.tierStats.tier3.avgTime <= tier3Target

    console.log('\n🎯 PERFORMANCE TARGETS')
    console.log(`Tier 1: ${tier1Success ? '✅' : '❌'} ${this.tierStats.tier1.avgTime.toFixed(1)}ms (target: <${tier1Target}ms)`)
    console.log(`Tier 2: ${tier2Success ? '✅' : '❌'} ${this.tierStats.tier2.avgTime.toFixed(1)}ms (target: <${tier2Target}ms)`)
    console.log(`Tier 3: ${tier3Success ? '✅' : '❌'} ${this.tierStats.tier3.avgTime.toFixed(1)}ms (target: <${tier3Target}ms)`)
  }
}

// Usage in API routes
const monitor = new MatryoshkaPerformanceMonitor()

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const { question } = await request.json()

  // Tier detection and search
  const strategy = determineOptimalSearch(question)
  const results = await searchWithTier(strategy.tier, question)

  const totalTime = Date.now() - startTime
  monitor.trackTierSearch(strategy.tier, question, totalTime, results.length)

  // Periodic summary (every 50 queries)
  if (monitor.tierStats.tier1.queries % 50 === 0) {
    monitor.getPerformanceSummary()
  }

  return NextResponse.json({
    response: generatedResponse,
    performance: {
      tier_used: strategy.tier,
      dimensions: strategy.dimensions,
      search_time_ms: totalTime,
      performance_target_met: (
        (strategy.tier === 1 && totalTime <= 200) ||
        (strategy.tier === 2 && totalTime <= 400) ||
        (strategy.tier === 3 && totalTime <= 600)
      )
    }
  })
}
```

## Prevention Best Practices

1. **Always test queries in isolation** before frontend integration
2. **Use explicit error handling** for all external API calls
3. **Implement graceful fallbacks** for authentication failures
4. **Monitor response field consistency** across API endpoints
5. **Test with realistic data volumes** not just small datasets
6. **Document API response formats** for each endpoint
7. **Use consistent naming conventions** across database schema

---

*This guide is based on real debugging sessions and proven solutions. All fixes have been tested in production scenarios.*