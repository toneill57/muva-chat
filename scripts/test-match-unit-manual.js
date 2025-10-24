import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

config({ path: path.join(projectRoot, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateEmbedding(text, dimensions) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',  // FIXED: Use same model as chat engine
    input: text,
    dimensions
  })
  return response.data[0].embedding
}

async function test() {
  console.log('=== Testing match_unit_manual_chunks ===\n')

  const hotelUnitId = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33' // Dreamland hotel ID

  // Generate a real embedding for WiFi query
  console.log('1. Generating embedding for "wifi password"...')
  const embedding = await generateEmbedding('wifi password', 1536)
  console.log(`Generated embedding with ${embedding.length} dimensions\n`)

  // Call match_unit_manual_chunks with hotel ID
  console.log('2. Calling match_unit_manual_chunks with HOTEL ID...')
  const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
    query_embedding: embedding,
    p_accommodation_unit_id: hotelUnitId,
    match_threshold: 0.2,
    match_count: 5
  })

  console.log('Result:', {
    chunks_found: data?.length || 0,
    error: error?.message || null
  })

  if (data && data.length > 0) {
    console.log('\n✅ CHUNKS FOUND:')
    data.forEach((chunk, i) => {
      const similarity = typeof chunk.similarity === 'number' ? chunk.similarity.toFixed(4) : chunk.similarity
      console.log(`  ${i+1}. ${chunk.section_title}`)
      console.log(`     Similarity: ${similarity}`)
      console.log(`     Preview: ${chunk.chunk_content.substring(0, 100)}...\n`)
    })
  } else {
    console.log('\n❌ NO CHUNKS FOUND')

    // Test with public ID directly
    const publicUnitId = '7220b0fa-945c-4e53-bafe-a34fc5810b76'
    console.log('\n3. Trying with PUBLIC ID directly...')
    const { data: data2, error: error2 } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: embedding,
      p_accommodation_unit_id: publicUnitId,
      match_threshold: 0.2,
      match_count: 5
    })

    console.log('Result:', {
      chunks_found: data2?.length || 0,
      error: error2?.message || null
    })

    if (data2 && data2.length > 0) {
      console.log('\n✅ WITH PUBLIC ID WORKS:')
      data2.forEach((chunk, i) => {
        const similarity = typeof chunk.similarity === 'number' ? chunk.similarity.toFixed(4) : chunk.similarity
        console.log(`  ${i+1}. ${chunk.section_title} (similarity: ${similarity})`)
      })
    }
  }
}

test().catch(console.error)
