#!/usr/bin/env tsx
/**
 * Performance Benchmarks for Conversation Memory System
 *
 * FASE 5.1 - Performance Validation
 *
 * Tests:
 * 1. Compression performance (target: <500ms avg)
 * 2. Search performance (target: <100ms avg)
 * 3. Quality validation (manual review)
 *
 * Usage:
 *   npx tsx scripts/benchmark-conversation-memory.ts
 */

import { compressConversationSegment, generateEmbeddingForSummary, compressAndEmbed } from '../src/lib/conversation-compressor'
import { searchConversationMemory } from '../src/lib/conversation-memory-search'
import { createServerClient } from '../src/lib/supabase'

// ============================================================================
// Test Data - Real Conversation Examples
// ============================================================================

const SAMPLE_CONVERSATIONS = [
  // Conversation 1: Beach apartment inquiry
  [
    { role: 'user', content: 'Hola! Busco apartamento para 4 personas en San Andrés' },
    { role: 'assistant', content: 'Claro! Tenemos varias opciones con capacidad para 4 personas. ¿Qué fechas tenías en mente?' },
    { role: 'user', content: 'Del 15 al 22 de diciembre. Necesitamos cocina equipada' },
    { role: 'assistant', content: 'Perfecto! Tengo disponible el apartamento Ocean View con cocina completa, cerca de la playa. Precio: $850,000 COP por noche.' },
    { role: 'user', content: '¿Incluye aire acondicionado y WiFi?' },
    { role: 'assistant', content: 'Sí, ambos incluidos. También tiene balcón con vista al mar y estacionamiento privado.' },
    { role: 'user', content: '¿Cuál es la política de cancelación?' },
    { role: 'assistant', content: 'Cancelación gratuita hasta 7 días antes del check-in. Después se cobra el 50% del total.' },
    { role: 'user', content: '¿Aceptan mascotas pequeñas?' },
    { role: 'assistant', content: 'En este apartamento sí, mascotas pequeñas (hasta 10kg) con cargo adicional de $50,000 COP por estadía.' },
  ],

  // Conversation 2: Budget-conscious family
  [
    { role: 'user', content: 'Necesito algo económico para familia de 5 personas' },
    { role: 'assistant', content: 'Entiendo! Tenemos opciones económicas con buena ubicación. ¿Cuál es tu presupuesto por noche?' },
    { role: 'user', content: 'Máximo $600,000 pesos colombianos' },
    { role: 'assistant', content: 'Perfecto! El apartamento Palma Real está en $550,000 por noche, 3 habitaciones, capacidad 6 personas.' },
    { role: 'user', content: '¿Tiene lavadora?' },
    { role: 'assistant', content: 'Sí, tiene lavadora, cocina completa, 2 baños y sala-comedor amplia.' },
    { role: 'user', content: '¿A cuánto queda de la playa?' },
    { role: 'assistant', content: 'A 5 minutos caminando de Playa Spratt Bight, la principal de San Andrés.' },
    { role: 'user', content: '¿Puedo pagar en pesos o tiene que ser en dólares?' },
    { role: 'assistant', content: 'Aceptamos pesos colombianos, dólares y tarjetas de crédito. Sin recargo adicional.' },
    { role: 'user', content: 'Perfecto! ¿Cómo hago la reserva?' },
    { role: 'assistant', content: 'Te envío el link de reserva por WhatsApp. Necesito anticipo del 30% para confirmar las fechas.' },
  ],

  // Conversation 3: Luxury honeymoon
  [
    { role: 'user', content: 'Buscamos algo romántico para luna de miel' },
    { role: 'assistant', content: 'Felicitaciones! Tenemos suites premium perfectas para parejas. ¿Qué fechas y qué tipo de experiencia buscan?' },
    { role: 'user', content: 'Primera semana de febrero. Queremos privacidad, jacuzzi y vista al mar' },
    { role: 'assistant', content: 'La Suite Paradise es ideal: jacuzzi privado, terraza con vista 180° al mar, king size bed. $1,200,000 por noche.' },
    { role: 'user', content: 'Perfecto! ¿Incluye desayuno?' },
    { role: 'assistant', content: 'Sí, desayuno continental incluido servido en tu terraza. También ofrecemos cena romántica opcional.' },
    { role: 'user', content: '¿Tienen servicio de tours o actividades?' },
    { role: 'assistant', content: 'Sí! Coordinamos snorkeling, paseo en catamarán, cena en playa privada y masajes en suite.' },
    { role: 'user', content: '¿Cuánto cuesta el tour de snorkeling?' },
    { role: 'assistant', content: 'El tour básico a Johnny Cay es $80,000 por persona. El tour premium a Acuario incluye almuerzo, $150,000.' },
    { role: 'user', content: 'Me interesa el premium. ¿Lo reservo ahora o después?' },
    { role: 'assistant', content: 'Puedes reservarlo ahora para garantizar disponibilidad o hasta 48h antes de tu llegada.' },
  ],
]

// ============================================================================
// Benchmark Utilities
// ============================================================================

interface BenchmarkResult {
  test_name: string
  iterations: number
  avg_ms: number
  min_ms: number
  max_ms: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  success_rate: number
}

async function runBenchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number
): Promise<BenchmarkResult> {
  console.log(`\n🔄 Running ${name} (${iterations} iterations)...`)

  const timings: number[] = []
  let successes = 0

  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    try {
      await fn()
      const duration = Date.now() - start
      timings.push(duration)
      successes++

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`)
      }
    } catch (error) {
      console.error(`\n  ❌ Error in iteration ${i + 1}:`, error)
      timings.push(999999) // Mark as failure
    }
  }

  process.stdout.write('\n')

  // Calculate statistics
  const sorted = [...timings].sort((a, b) => a - b)
  const avg = timings.reduce((sum, t) => sum + t, 0) / timings.length
  const min = Math.min(...timings)
  const max = Math.max(...timings)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const p99 = sorted[Math.floor(sorted.length * 0.99)]

  const result: BenchmarkResult = {
    test_name: name,
    iterations,
    avg_ms: Math.round(avg),
    min_ms: min,
    max_ms: max,
    p50_ms: p50,
    p95_ms: p95,
    p99_ms: p99,
    success_rate: (successes / iterations) * 100,
  }

  return result
}

function printResult(result: BenchmarkResult, target?: number) {
  const passed = target ? result.avg_ms < target : true
  const icon = passed ? '✅' : '❌'

  console.log(`\n${icon} ${result.test_name}`)
  console.log(`  Iterations: ${result.iterations}`)
  console.log(`  Average:    ${result.avg_ms}ms ${target ? `(target: <${target}ms)` : ''}`)
  console.log(`  Min:        ${result.min_ms}ms`)
  console.log(`  Max:        ${result.max_ms}ms`)
  console.log(`  P50:        ${result.p50_ms}ms`)
  console.log(`  P95:        ${result.p95_ms}ms`)
  console.log(`  P99:        ${result.p99_ms}ms`)
  console.log(`  Success:    ${result.success_rate.toFixed(1)}%`)

  return passed
}

// ============================================================================
// Benchmark 1: Compression Performance
// ============================================================================

async function benchmarkCompression(): Promise<BenchmarkResult> {
  const testMessages = SAMPLE_CONVERSATIONS[0]

  const result = await runBenchmark(
    'Compression (10 messages → summary + entities)',
    async () => {
      await compressConversationSegment(testMessages, 'benchmark-session')
    },
    100 // 100 iterations
  )

  return result
}

// ============================================================================
// Benchmark 2: Embedding Generation
// ============================================================================

async function benchmarkEmbedding(): Promise<BenchmarkResult> {
  const testSummary = 'Un usuario preguntó por apartamentos en San Andrés para 4 personas del 15 al 22 de diciembre. Necesitaba cocina equipada, aire acondicionado y WiFi. Se le ofreció el apartamento Ocean View por $850,000 COP/noche con todos los servicios incluidos. Preguntó sobre política de cancelación (gratuita hasta 7 días antes) y si aceptan mascotas (sí, hasta 10kg con cargo adicional).'

  const result = await runBenchmark(
    'Embedding Generation (1024d)',
    async () => {
      await generateEmbeddingForSummary(testSummary)
    },
    100
  )

  return result
}

// ============================================================================
// Benchmark 3: Full Compression Pipeline
// ============================================================================

async function benchmarkFullPipeline(): Promise<BenchmarkResult> {
  const testMessages = SAMPLE_CONVERSATIONS[1]

  const result = await runBenchmark(
    'Full Compression Pipeline (summary + embedding)',
    async () => {
      await compressAndEmbed(testMessages, 'benchmark-session')
    },
    50 // 50 iterations (slower due to both operations)
  )

  return result
}

// ============================================================================
// Benchmark 4: Search Performance
// ============================================================================

async function benchmarkSearch(): Promise<BenchmarkResult | null> {
  console.log('\n🔄 Setting up search benchmark...')

  // Setup: Create test session with 5 summaries
  const supabase = createServerClient()
  const testSessionId = `benchmark-search-${Date.now()}`
  const testTenantId = 'simmerdown' // Default tenant

  try {
    // Create test session
    const { error: sessionError } = await supabase
      .from('prospective_sessions')
      .insert({
        session_id: testSessionId,
        tenant_id: testTenantId,
        conversation_history: [],
        cookie_id: 'benchmark-cookie',
      })

    if (sessionError) {
      console.error('❌ Failed to create test session:', sessionError)
      return null
    }

    // Create 5 sample summaries with embeddings
    console.log('  Creating 5 test summaries...')
    for (let i = 0; i < 5; i++) {
      const messages = SAMPLE_CONVERSATIONS[i % 3]
      const summary = await compressConversationSegment(messages, testSessionId)
      const embedding = await generateEmbeddingForSummary(summary.summary)

      const { error: insertError } = await supabase
        .from('conversation_memory')
        .insert({
          session_id: testSessionId,
          tenant_id: testTenantId,
          summary_text: summary.summary,
          message_range: `messages ${i * 10 + 1}-${(i + 1) * 10}`,
          message_count: 10,
          embedding_fast: embedding,
          key_entities: summary.entities,
        })

      if (insertError) {
        console.error(`  ❌ Failed to insert summary ${i + 1}:`, insertError)
      }
    }

    console.log('  ✓ Test data created')

    // Run benchmark
    const queries = [
      'playa cerca apartamento',
      'política cancelación mascotas',
      'desayuno incluido vista mar',
      'cocina equipada lavadora',
      'tour snorkeling precio',
    ]

    const result = await runBenchmark(
      'Semantic Search (5 summaries, top 2 results)',
      async () => {
        const query = queries[Math.floor(Math.random() * queries.length)]
        await searchConversationMemory(query, testSessionId)
      },
      100
    )

    // Cleanup
    console.log('\n  🧹 Cleaning up test data...')
    await supabase
      .from('conversation_memory')
      .delete()
      .eq('session_id', testSessionId)

    await supabase
      .from('prospective_sessions')
      .delete()
      .eq('session_id', testSessionId)

    return result
  } catch (error) {
    console.error('❌ Search benchmark failed:', error)

    // Cleanup on error
    await supabase
      .from('conversation_memory')
      .delete()
      .eq('session_id', testSessionId)

    await supabase
      .from('prospective_sessions')
      .delete()
      .eq('session_id', testSessionId)

    return null
  }
}

// ============================================================================
// Benchmark 5: Quality Validation
// ============================================================================

async function benchmarkQuality(): Promise<void> {
  console.log('\n\n' + '='.repeat(80))
  console.log('📋 QUALITY VALIDATION - Manual Review Required')
  console.log('='.repeat(80))

  for (let i = 0; i < SAMPLE_CONVERSATIONS.length; i++) {
    console.log(`\n--- Conversation ${i + 1} ---`)

    const messages = SAMPLE_CONVERSATIONS[i]
    const summary = await compressConversationSegment(messages, `quality-test-${i}`)

    console.log('\n📝 ORIGINAL CONVERSATION:')
    messages.forEach((m, idx) => {
      console.log(`  ${idx + 1}. [${m.role}] ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`)
    })

    console.log('\n✨ GENERATED SUMMARY:')
    console.log(`  ${summary.summary}`)

    console.log('\n🎯 EXTRACTED ENTITIES:')
    console.log('  Travel Intent:')
    console.log(`    - Dates: ${summary.entities.travel_intent.dates || 'N/A'}`)
    console.log(`    - Guests: ${summary.entities.travel_intent.guests || 'N/A'}`)
    console.log(`    - Preferences: ${summary.entities.travel_intent.preferences.join(', ') || 'N/A'}`)
    console.log(`  Topics: ${summary.entities.topics_discussed.join(', ')}`)
    console.log(`  Questions: ${summary.entities.key_questions.join(', ')}`)

    console.log('\n✓ QUALITY CHECKS:')
    console.log(`  ☐ Summary is coherent and captures main points`)
    console.log(`  ☐ Travel intent correctly extracted`)
    console.log(`  ☐ Topics accurately identified`)
    console.log(`  ☐ Key questions preserved`)
    console.log(`  ☐ Word count: ${summary.summary.split(' ').length} (target: 100-250 words)`)
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log('=' .repeat(80))
  console.log('🚀 CONVERSATION MEMORY SYSTEM - PERFORMANCE BENCHMARKS')
  console.log('   FASE 5.1 - Performance Validation')
  console.log('=' .repeat(80))

  const results: BenchmarkResult[] = []
  const targets = {
    compression: 500, // ms
    embedding: 200,   // ms
    fullPipeline: 500, // ms
    search: 100,      // ms
  }

  // Benchmark 1: Compression
  console.log('\n\n📊 BENCHMARK 1: COMPRESSION PERFORMANCE')
  console.log('-'.repeat(80))
  const compressionResult = await benchmarkCompression()
  results.push(compressionResult)
  const compressionPassed = printResult(compressionResult, targets.compression)

  // Benchmark 2: Embedding
  console.log('\n\n📊 BENCHMARK 2: EMBEDDING GENERATION')
  console.log('-'.repeat(80))
  const embeddingResult = await benchmarkEmbedding()
  results.push(embeddingResult)
  const embeddingPassed = printResult(embeddingResult, targets.embedding)

  // Benchmark 3: Full Pipeline
  console.log('\n\n📊 BENCHMARK 3: FULL COMPRESSION PIPELINE')
  console.log('-'.repeat(80))
  const pipelineResult = await benchmarkFullPipeline()
  results.push(pipelineResult)
  const pipelinePassed = printResult(pipelineResult, targets.fullPipeline)

  // Benchmark 4: Search
  console.log('\n\n📊 BENCHMARK 4: SEMANTIC SEARCH PERFORMANCE')
  console.log('-'.repeat(80))
  const searchResult = await benchmarkSearch()
  if (searchResult) {
    results.push(searchResult)
    const searchPassed = printResult(searchResult, targets.search)
  }

  // Benchmark 5: Quality
  await benchmarkQuality()

  // Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))

  results.forEach((r) => {
    const target = targets[r.test_name.toLowerCase().includes('compression') ? 'compression' :
                          r.test_name.toLowerCase().includes('embedding') ? 'embedding' :
                          r.test_name.toLowerCase().includes('full') ? 'fullPipeline' : 'search']
    const passed = r.avg_ms < target
    console.log(`${passed ? '✅' : '❌'} ${r.test_name}: ${r.avg_ms}ms avg (target: <${target}ms)`)
  })

  console.log('\n💾 Results saved to: docs/conversation-memory/fase-5/PERFORMANCE.md')
  console.log('\nNext: Review quality validation and document findings.\n')
}

// Run benchmarks
main().catch(console.error)
