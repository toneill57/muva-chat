#!/usr/bin/env npx tsx
/**
 * Test search for Italian curtains information
 */

import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const TUCASAMAR_TENANT_ID = '2263efba-b62b-417b-a422-a84638bc632f'

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1024
  })
  return response.data[0].embedding
}

async function testQuery(query: string) {
  console.log(`\n🔍 Query: "${query}"`)
  console.log('─'.repeat(60))

  const embedding = await generateEmbedding(query)

  const { data, error } = await supabase.rpc('match_accommodations_public', {
    query_embedding: embedding,
    p_tenant_id: TUCASAMAR_TENANT_ID,
    match_threshold: 0.3, // Lower threshold
    match_count: 5
  })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!data || data.length === 0) {
    console.log('   ⚠️  No results found')
    return
  }

  console.log(`   ✅ Found ${data.length} result(s)\n`)
  data.forEach((result: any, idx: number) => {
    console.log(`   ${idx + 1}. ${result.name}`)
    console.log(`      Similarity: ${(result.similarity * 100).toFixed(2)}%`)

    if (result.name === 'Cotton Cay') {
      console.log(`      🎯 COTTON CAY FOUND!`)

      // Check for Italian curtains amenity
      const amenities = result.metadata?.amenities || []
      const hasItalianCurtains = amenities.some((a: string) =>
        a.toLowerCase().includes('cortinas') &&
        (a.toLowerCase().includes('azul') || a.toLowerCase().includes('italia'))
      )

      console.log(`      Amenities: ${amenities.length}`)
      console.log(`      Has Italian Curtains Amenity: ${hasItalianCurtains ? '✅ YES' : '❌ NO'}`)

      if (hasItalianCurtains) {
        const curtainAmenity = amenities.find((a: string) =>
          a.toLowerCase().includes('cortinas')
        )
        console.log(`      → "${curtainAmenity}"`)
      }
    }
  })
}

async function main() {
  console.log('🧪 Italian Curtains Search Test')
  console.log('='.repeat(60))

  const queries = [
    'cortinas azul marino italianas',
    'renovado enero 2025',
    'habitación con cortinas de Italia',
    'aislamiento acústico',
    'decoración italiana moderna',
    'habitación renovada recientemente'
  ]

  for (const query of queries) {
    await testQuery(query)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Test Complete\n')
}

main().catch(console.error)
