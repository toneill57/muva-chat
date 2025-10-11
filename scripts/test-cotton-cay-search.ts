#!/usr/bin/env npx tsx
/**
 * Test semantic search for Cotton Cay Italian curtains information
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/test-cotton-cay-search.ts
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

/**
 * Generate embedding for search query
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1024 // Fast tier
  })

  return response.data[0].embedding
}

/**
 * Execute semantic search
 */
async function searchAccommodations(query: string) {
  console.log(`\n🔍 Searching for: "${query}"`)
  console.log('─'.repeat(60))

  // Generate embedding for query
  console.log('🤖 Generating query embedding...')
  const embedding = await generateEmbedding(query)
  console.log(`   ✅ Generated ${embedding.length}d vector\n`)

  // Call RPC function with embedding (pass as array, Supabase will convert to vector)
  console.log('🔎 Executing semantic search...')
  const { data, error } = await supabase.rpc('match_accommodations_public', {
    query_embedding: embedding, // Pass array directly
    p_tenant_id: TUCASAMAR_TENANT_ID,
    match_threshold: 0.5,
    match_count: 5
  })

  if (error) {
    console.error('❌ Error:', error)
    return []
  }

  console.log(`   ✅ Found ${data?.length || 0} result(s)\n`)

  return data || []
}

/**
 * Main execution
 */
async function main() {
  console.log('🧪 Cotton Cay Semantic Search Test')
  console.log('='.repeat(60))

  // Test queries related to the new Italian curtains information
  const testQueries = [
    'cortinas azul marino italianas',
    'renovado enero 2025',
    'cortinas terciopelo Italia',
    'aislamiento acústico habitación',
    'decoración moderna elegante'
  ]

  for (const query of testQueries) {
    const results = await searchAccommodations(query)

    if (results.length > 0) {
      console.log('📊 Results:')
      results.forEach((result: any, idx: number) => {
        console.log(`\n   ${idx + 1}. ${result.name}`)
        console.log(`      Type: ${result.unit_type}`)
        console.log(`      Similarity: ${(result.similarity * 100).toFixed(2)}%`)
        console.log(`      Amenities: ${result.amenities?.length || 0}`)

        // Check if Cotton Cay appears and if it has the new amenity
        if (result.name === 'Cotton Cay') {
          const hasNewAmenity = result.amenities?.includes('Cortinas de terciopelo azul marino')
          console.log(`      ✅ FOUND COTTON CAY!`)
          console.log(`      New Amenity Present: ${hasNewAmenity ? '✅ YES' : '❌ NO'}`)
        }
      })
    } else {
      console.log('   ⚠️  No results found')
    }

    console.log()
  }

  console.log('='.repeat(60))
  console.log('✅ Test Complete\n')
}

// Run
main().catch(console.error)
