import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = '/Users/oneill/Sites/apps/muva-chat'

config({ path: path.join(projectRoot, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TENANT_ID = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'

async function test() {
  console.log('=== Testing Manual Search Flow ===\n')
  
  // 1. Simular lo que hace guest-auth: obtener unit por ID operacional
  const hotelUnitId = '14fc28a0-f6ac-4789-bc95-47c18bc4bf33' // Dreamland
  
  console.log('1. Getting accommodation unit by ID (como guest-auth)...')
  const { data: units, error: unitError } = await supabase
    .rpc('get_accommodation_unit_by_id', {
      p_unit_id: hotelUnitId,
      p_tenant_id: TENANT_ID
    })
  
  console.log('Result:', { units, unitError })
  
  if (units && units.length > 0) {
    const unit = units[0]
    console.log(`Found unit: ${unit.name} with ID: ${unit.id}\n`)
    
    // 2. Generar un embedding fake para test
    const fakeEmbedding = Array(1536).fill(0)
    fakeEmbedding[0] = 1.0
    
    console.log('2. Searching manual chunks (como searchUnitManual)...')
    const { data: chunks, error: searchError } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: fakeEmbedding,
      p_accommodation_unit_id: unit.id,  // Este es el hotel unit ID
      match_threshold: 0.1,
      match_count: 5
    })
    
    console.log('Search result:', { 
      chunks_found: chunks?.length || 0, 
      error: searchError 
    })
    
    if (chunks && chunks.length > 0) {
      console.log('\n✅ CHUNKS FOUND:')
      chunks.forEach((chunk, i) => {
        console.log(`  ${i+1}. ${chunk.section_title} (similarity: ${chunk.similarity})`)
      })
    } else {
      console.log('\n❌ NO CHUNKS FOUND')
      
      // Verificar si el mapping está funcionando
      console.log('\n3. Testing manual mapping...')
      const { data: publicUnit } = await supabase
        .from('accommodation_units_public')
        .select('unit_id, name')
        .eq('tenant_id', TENANT_ID)
        .eq('metadata->original_accommodation', unit.name)
        .like('name', `${unit.name} - Overview`)
        .single()
      
      console.log('Public unit:', publicUnit)
      
      if (publicUnit) {
        console.log('\n4. Searching with public unit ID directly...')
        const { data: chunks2, error: error2 } = await supabase.rpc('match_unit_manual_chunks', {
          query_embedding: fakeEmbedding,
          p_accommodation_unit_id: publicUnit.unit_id,
          match_threshold: 0.1,
          match_count: 5
        })
        
        console.log('Direct search result:', { 
          chunks_found: chunks2?.length || 0, 
          error: error2 
        })
      }
    }
  }
}

test().catch(console.error)
