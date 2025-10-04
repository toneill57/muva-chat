#!/usr/bin/env tsx
/**
 * Optimized Search Performance Benchmark
 *
 * Tests search performance WITH embedding cache to verify <100ms target.
 * Demonstrates cache hit performance vs cold start.
 */

import { randomUUID } from 'crypto'
import { searchConversationMemory } from '../src/lib/conversation-memory-search'
import { compressAndEmbed } from '../src/lib/conversation-compressor'
import { createServerClient } from '../src/lib/supabase'
import { embeddingCache } from '../src/lib/embedding-cache'

const testMessages = [
  { role: 'user', content: 'Hola! Busco apartamento para 4 personas' },
  { role: 'assistant', content: 'Claro! Tenemos varias opciones. ¿Qué fechas?' },
  { role: 'user', content: 'Del 15 al 22 de diciembre. Necesito cocina equipada' },
  { role: 'assistant', content: 'Perfecto! Ocean View $850,000 COP/noche.' },
  { role: 'user', content: '¿Incluye WiFi?' },
  { role: 'assistant', content: 'Sí, WiFi y aire acondicionado incluidos.' },
  { role: 'user', content: '¿Política de cancelación?' },
  { role: 'assistant', content: 'Cancelación gratuita hasta 7 días antes.' },
  { role: 'user', content: '¿Permiten mascotas?' },
  { role: 'assistant', content: 'Sí, mascotas pequeñas con cargo adicional.' },
]

const queries = [
  'política cancelación mascotas',
  'precio cocina equipada',
  'política cancelación mascotas', // Repeat for cache hit
  'precio cocina equipada',         // Repeat for cache hit
  'wifi incluido',
]

async function runBenchmark() {
  console.log('=' .repeat(80))
  console.log('🚀 OPTIMIZED SEARCH PERFORMANCE BENCHMARK')
  console.log('   Target: <100ms with cache')
  console.log('=' .repeat(80))
  console.log()

  const supabase = createServerClient()
  const testSessionId = randomUUID()

  try {
    // Setup: Create test session with summary
    console.log('📊 Setup: Creating test data...')
    await supabase.from('prospective_sessions').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      conversation_history: [],
      cookie_id: 'bench-cookie',
    })

    const result = await compressAndEmbed(testMessages, testSessionId)
    await supabase.from('conversation_memory').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      summary_text: result.summary.summary,
      message_range: 'messages 1-10',
      message_count: 10,
      embedding_fast: result.embedding,
      key_entities: result.summary.entities,
    })

    console.log('✓ Test data created')
    console.log()

    // Clear cache to start fresh
    embeddingCache.clear()

    // Run searches
    console.log('🔍 Running searches...')
    console.log()

    const timings: { query: string; time: number; cached: boolean }[] = []

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      const isCached = i >= 2 // Queries 3-5 are repeats (should hit cache)

      const start = Date.now()
      const results = await searchConversationMemory(query, testSessionId)
      const duration = Date.now() - start

      timings.push({ query, time: duration, cached: isCached })

      const icon = duration < 100 ? '✅' : '⚠️'
      console.log(`${icon} Query ${i + 1}: ${duration}ms - "${query}"`)
      console.log(`   Results: ${results.length} | Expected cache: ${isCached ? 'YES' : 'NO'}`)
      console.log()
    }

    // Cleanup
    console.log('🧹 Cleaning up...')
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)

    // Analysis
    console.log()
    console.log('=' .repeat(80))
    console.log('📊 RESULTS')
    console.log('=' .repeat(80))
    console.log()

    const coldTimings = timings.filter(t => !t.cached)
    const cachedTimings = timings.filter(t => t.cached)

    const coldAvg = coldTimings.reduce((sum, t) => sum + t.time, 0) / coldTimings.length
    const cachedAvg = cachedTimings.reduce((sum, t) => sum + t.time, 0) / cachedTimings.length

    console.log('🥶 Cold Start (no cache):')
    console.log(`   Searches: ${coldTimings.length}`)
    console.log(`   Average:  ${Math.round(coldAvg)}ms`)
    console.log(`   Min:      ${Math.min(...coldTimings.map(t => t.time))}ms`)
    console.log(`   Max:      ${Math.max(...coldTimings.map(t => t.time))}ms`)
    console.log()

    console.log('🔥 Cache Hit:')
    console.log(`   Searches: ${cachedTimings.length}`)
    console.log(`   Average:  ${Math.round(cachedAvg)}ms`)
    console.log(`   Min:      ${Math.min(...cachedTimings.map(t => t.time))}ms`)
    console.log(`   Max:      ${Math.max(...cachedTimings.map(t => t.time))}ms`)
    console.log()

    const cacheHitPassed = cachedAvg < 100
    const improvement = Math.round(((coldAvg - cachedAvg) / coldAvg) * 100)

    console.log('📈 Performance Improvement:')
    console.log(`   Reduction: ${improvement}% faster with cache`)
    console.log(`   Cache savings: ${Math.round(coldAvg - cachedAvg)}ms per cached query`)
    console.log()

    console.log('=' .repeat(80))
    if (cacheHitPassed) {
      console.log('✅ SUCCESS: Cache hit searches achieve <100ms target!')
    } else {
      console.log('⚠️  WARNING: Cache hit average still above 100ms target')
    }
    console.log('=' .repeat(80))
    console.log()

    // Cache stats
    const stats = embeddingCache.getStats()
    console.log('📊 Cache Statistics:')
    console.log(`   Total entries: ${stats.size}/${stats.maxSize}`)
    console.log(`   Hits: ${stats.hits}`)
    console.log(`   Misses: ${stats.misses}`)
    console.log(`   Hit rate: ${stats.hitRate}`)
    console.log()

  } catch (error) {
    console.error('❌ Benchmark failed:', error)

    // Cleanup on error
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)
  }
}

runBenchmark().catch(console.error)
