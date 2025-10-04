#!/usr/bin/env tsx
/**
 * EXPLAIN ANALYZE - Vector Search Query Plan
 *
 * Analyzes the query plan for conversation memory vector search.
 * Verifies HNSW index usage and identifies performance bottlenecks.
 *
 * Usage:
 *   npx tsx scripts/explain-analyze-vector-search.ts
 */

import { randomUUID } from 'crypto'
import { createServerClient } from '../src/lib/supabase'
import { compressAndEmbed } from '../src/lib/conversation-compressor'

const testMessages = [
  { role: 'user', content: 'Hola! Busco apartamento para 4 personas' },
  { role: 'assistant', content: 'Claro! Tenemos varias opciones. ¿Qué fechas?' },
  { role: 'user', content: 'Del 15 al 22 de diciembre. Necesito cocina equipada' },
  { role: 'assistant', content: 'Perfecto! Ocean View $850,000 COP/noche.' },
]

async function runExplainAnalyze() {
  console.log('=' .repeat(80))
  console.log('🔍 EXPLAIN ANALYZE - Vector Search Query Plan')
  console.log('=' .repeat(80))
  console.log()

  const supabase = createServerClient()
  const testSessionId = randomUUID()

  try {
    // Setup: Create test data
    console.log('📊 Setup: Creating test data...')
    await supabase.from('prospective_sessions').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      conversation_history: [],
      cookie_id: 'explain-cookie',
    })

    const result = await compressAndEmbed(testMessages, testSessionId)
    await supabase.from('conversation_memory').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      summary_text: result.summary.summary,
      message_range: 'messages 1-4',
      message_count: 4,
      embedding_fast: result.embedding,
      key_entities: result.summary.entities,
    })

    console.log('✓ Test data created')
    console.log()

    // Generate query embedding
    console.log('🔍 Generating query embedding...')
    const queryResult = await compressAndEmbed(
      [{ role: 'user', content: 'política cancelación' }],
      testSessionId
    )
    const queryEmbedding = queryResult.embedding

    console.log('✓ Query embedding generated')
    console.log()

    // ========================================================================
    // EXPLAIN ANALYZE: Vector Search Query
    // ========================================================================
    console.log('📊 Running EXPLAIN ANALYZE...')
    console.log()

    const explainQuery = `
      EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
      SELECT
        id,
        summary_text,
        key_entities,
        message_range,
        1 - (embedding_fast <=> $1::vector) AS similarity
      FROM conversation_memory
      WHERE session_id = $2
        AND (1 - (embedding_fast <=> $1::vector)) > 0.3
      ORDER BY embedding_fast <=> $1::vector
      LIMIT 2
    `

    const { data: explainData, error: explainError } = await supabase.rpc('exec_sql', {
      query: explainQuery,
      params: [queryEmbedding, testSessionId],
    })

    if (explainError) {
      console.error('❌ EXPLAIN ANALYZE failed:', explainError)
      console.log()
      console.log('⚠️  Note: exec_sql RPC function may not exist.')
      console.log('   Creating manual query instead...')
      console.log()

      // Fallback: Run query directly and time it
      const start = Date.now()
      const { data: searchData, error: searchError } = await supabase.rpc('match_conversation_memory', {
        query_embedding: queryEmbedding,
        p_session_id: testSessionId,
        match_threshold: 0.3,
        match_count: 2,
      })
      const duration = Date.now() - start

      console.log('✓ Direct RPC call completed:', {
        duration: `${duration}ms`,
        results: searchData?.length || 0,
        error: searchError?.message || 'none',
      })
      console.log()

      // Check index existence
      console.log('📊 Checking HNSW index...')
      const { data: indexData, error: indexError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .like('indexname', '%conversation_memory%')

      if (!indexError && indexData) {
        console.log('✓ Found indexes:')
        indexData.forEach((idx: any) => {
          console.log(`   - ${idx.indexname}`)
          if (idx.indexdef.includes('hnsw')) {
            console.log(`     [HNSW] ${idx.indexdef.substring(0, 80)}...`)
          }
        })
      } else {
        console.log('⚠️  Could not retrieve index information')
      }
      console.log()

    } else {
      console.log('✓ EXPLAIN ANALYZE completed')
      console.log()
      console.log(JSON.stringify(explainData, null, 2))
      console.log()
    }

    // ========================================================================
    // Performance Analysis
    // ========================================================================
    console.log('=' .repeat(80))
    console.log('📊 PERFORMANCE ANALYSIS')
    console.log('=' .repeat(80))
    console.log()

    // Run multiple queries to measure variance
    console.log('Running 5 queries to measure performance variance...')
    const timings: number[] = []

    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      await supabase.rpc('match_conversation_memory', {
        query_embedding: queryEmbedding,
        p_session_id: testSessionId,
        match_threshold: 0.3,
        match_count: 2,
      })
      const duration = Date.now() - start
      timings.push(duration)
      console.log(`  Query ${i + 1}: ${duration}ms`)
    }

    console.log()
    console.log('Statistics:')
    console.log(`  Average:  ${Math.round(timings.reduce((a, b) => a + b) / timings.length)}ms`)
    console.log(`  Min:      ${Math.min(...timings)}ms`)
    console.log(`  Max:      ${Math.max(...timings)}ms`)
    console.log(`  Variance: ${Math.max(...timings) - Math.min(...timings)}ms`)
    console.log()

    const avg = timings.reduce((a, b) => a + b) / timings.length
    if (avg < 100) {
      console.log('✅ Performance: Excellent (<100ms average)')
    } else if (avg < 150) {
      console.log('✅ Performance: Good (100-150ms average)')
    } else if (avg < 200) {
      console.log('⚠️  Performance: Acceptable (150-200ms average)')
    } else {
      console.log('❌ Performance: Below target (>200ms average)')
    }

    console.log()

    // Cleanup
    console.log('🧹 Cleaning up...')
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)

    console.log('✓ Cleanup complete')
    console.log()

  } catch (error) {
    console.error('❌ Error:', error)

    // Cleanup on error
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)
  }
}

runExplainAnalyze().catch(console.error)
