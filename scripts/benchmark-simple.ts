#!/usr/bin/env tsx
/**
 * SIMPLIFIED Performance Benchmarks
 * FASE 5.1 - Quick validation without extensive API calls
 */

import { randomUUID } from 'crypto'
import { compressConversationSegment, generateEmbeddingForSummary } from '../src/lib/conversation-compressor'
import { searchConversationMemory } from '../src/lib/conversation-memory-search'
import { createServerClient } from '../src/lib/supabase'

const testMessages = [
  { role: 'user', content: 'Hola! Busco apartamento para 4 personas en San Andrés' },
  { role: 'assistant', content: 'Claro! Tenemos varias opciones. ¿Qué fechas?' },
  { role: 'user', content: 'Del 15 al 22 de diciembre. Necesitamos cocina equipada' },
  { role: 'assistant', content: 'Perfecto! Tengo el Ocean View por $850,000 COP/noche.' },
  { role: 'user', content: '¿Incluye aire acondicionado y WiFi?' },
  { role: 'assistant', content: 'Sí, ambos incluidos. También balcón con vista.' },
  { role: 'user', content: '¿Política de cancelación?' },
  { role: 'assistant', content: 'Cancelación gratuita hasta 7 días antes.' },
  { role: 'user', content: '¿Mascotas pequeñas?' },
  { role: 'assistant', content: 'Sí, hasta 10kg con cargo adicional de $50,000.' },
]

async function testCompression() {
  console.log('\n📊 TEST 1: Compression Performance\n')
  console.log('  Running 3 compression tests...\n')

  const timings: number[] = []

  for (let i = 0; i < 3; i++) {
    const start = Date.now()
    try {
      const result = await compressConversationSegment(testMessages, `test-${i}`)
      const duration = Date.now() - start
      timings.push(duration)

      console.log(`  ✓ Test ${i + 1}: ${duration}ms`)
      console.log(`    - Summary: ${result.summary.substring(0, 80)}...`)
      console.log(`    - Topics: ${result.entities.topics_discussed.join(', ')}`)
      console.log(`    - Preferences: ${result.entities.travel_intent.preferences.join(', ')}`)
      console.log()
    } catch (error: any) {
      console.log(`  ❌ Test ${i + 1} failed: ${error.message}`)
      timings.push(999999)
    }
  }

  const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length
  const passed = avg < 5000 // More lenient: 5 seconds

  console.log(`  ${passed ? '✅' : '❌'} Average: ${Math.round(avg)}ms (target: <500ms realistic, <5000ms for testing)`)

  return { avg, passed, timings }
}

async function testEmbedding() {
  console.log('\n📊 TEST 2: Embedding Generation Performance\n')
  console.log('  Running 3 embedding tests...\n')

  const testSummary = 'Usuario pregunta por apartamento para 4 personas del 15 al 22 de diciembre con cocina equipada. Se ofrece Ocean View por $850,000/noche con todos los servicios.'

  const timings: number[] = []

  for (let i = 0; i < 3; i++) {
    const start = Date.now()
    try {
      const embedding = await generateEmbeddingForSummary(testSummary)
      const duration = Date.now() - start
      timings.push(duration)

      console.log(`  ✓ Test ${i + 1}: ${duration}ms - ${embedding.length}d vector`)
    } catch (error: any) {
      console.log(`  ❌ Test ${i + 1} failed: ${error.message}`)
      timings.push(999999)
    }
  }

  const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length
  const passed = avg < 1000 // 1 second for embedding

  console.log(`  ${passed ? '✅' : '❌'} Average: ${Math.round(avg)}ms (target: <200ms realistic, <1000ms for testing)`)

  return { avg, passed, timings }
}

async function testSearch() {
  console.log('\n📊 TEST 3: Semantic Search Performance\n')

  const supabase = createServerClient()
  const testSessionId = randomUUID() // Generate valid UUID instead of timestamp

  try {
    // Create test session
    console.log('  Setting up test data...')
    await supabase.from('prospective_sessions').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      conversation_history: [],
      cookie_id: 'bench-cookie',
    })

    // Create 1 test summary
    const summary = await compressConversationSegment(testMessages, testSessionId)
    const embedding = await generateEmbeddingForSummary(summary.summary)

    await supabase.from('conversation_memory').insert({
      session_id: testSessionId,
      tenant_id: 'simmerdown',
      summary_text: summary.summary,
      message_range: 'messages 1-10',
      message_count: 10,
      embedding_fast: embedding,
      key_entities: summary.entities,
    })

    console.log('  ✓ Test data created')

    // Run search tests
    console.log('\n  Running 3 search tests...\n')
    const timings: number[] = []

    const queries = [
      'playa apartamento vista mar',
      'política cancelación mascotas',
      'precio cocina equipada',
    ]

    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      try {
        const results = await searchConversationMemory(queries[i], testSessionId)
        const duration = Date.now() - start
        timings.push(duration)

        console.log(`  ✓ Test ${i + 1}: ${duration}ms - ${results.length} results`)
        if (results.length > 0) {
          console.log(`    - Similarity: ${results[0].similarity.toFixed(3)}`)
        }
      } catch (error: any) {
        console.log(`  ❌ Test ${i + 1} failed: ${error.message}`)
        timings.push(999999)
      }
    }

    // Cleanup
    console.log('\n  Cleaning up test data...')
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)

    const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length
    const passed = avg < 750 // Realistic: embedding (400ms) + query (100ms) + overhead (150ms) = ~650ms

    console.log(`  ${passed ? '✅' : '❌'} Average: ${Math.round(avg)}ms (target: <100ms ideal, <750ms realistic)`)

    return { avg, passed, timings }
  } catch (error: any) {
    console.log(`  ❌ Search test failed: ${error.message}`)

    // Cleanup on error
    await supabase.from('conversation_memory').delete().eq('session_id', testSessionId)
    await supabase.from('prospective_sessions').delete().eq('session_id', testSessionId)

    return { avg: 999999, passed: false, timings: [999999] }
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('🚀 CONVERSATION MEMORY - SIMPLIFIED PERFORMANCE BENCHMARKS')
  console.log('   FASE 5.1 - Quick Validation')
  console.log('='.repeat(80))

  const results: any[] = []

  // Test 1: Compression
  const compressionResult = await testCompression()
  results.push({ name: 'Compression', ...compressionResult })

  // Test 2: Embedding
  const embeddingResult = await testEmbedding()
  results.push({ name: 'Embedding', ...embeddingResult })

  // Test 3: Search
  const searchResult = await testSearch()
  results.push({ name: 'Search', ...searchResult })

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80) + '\n')

  results.forEach((r) => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${Math.round(r.avg)}ms avg`)
  })

  const allPassed = results.every((r) => r.passed)

  console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'))
  console.log('\n📝 Note: These are quick validation tests. Full benchmarks require longer runs.')
  console.log()
}

main().catch(console.error)
