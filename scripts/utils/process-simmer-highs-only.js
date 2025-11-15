import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import matter from 'gray-matter'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.dirname(__dirname)

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Generate embedding with specific dimensions
async function generateEmbedding(text, dimensions) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions,
  })
  return response.data[0].embedding
}

// Extract structured content from manual
function extractManualContent(markdown) {
  const { data: frontmatter, content } = matter(markdown)

  // Extract WiFi password
  const wifiPasswordMatch = content.match(/\*\*Contraseña\*\*:\s*`([^`]+)`/)
  const wifiPassword = wifiPasswordMatch ? wifiPasswordMatch[1] : null

  return {
    frontmatter,
    content,
    wifiPassword,
  }
}

// Find unit_id by unit name
async function findUnitIdByName(unitName, tenantId) {
  const { data: unitId, error } = await supabase.rpc('get_accommodation_unit_by_name', {
    p_unit_name: unitName,
    p_tenant_id: tenantId
  })

  if (error || !unitId) {
    console.warn(`⚠️  Unit not found in database: "${unitName}"`)
    return null
  }

  console.log(`   ✓ Matched: "${unitName}" → unit_id: ${unitId}`)
  return unitId
}

// Process Simmer Highs manual
async function processSimmerHighs() {
  const filePath = path.join(projectRoot, '_assets/simmerdown/accommodations-manual/apartments/simmer-highs-manual.md')

  console.log(`\n📄 Processing: ${path.basename(filePath)}`)

  try {
    // Read file
    const markdown = fs.readFileSync(filePath, 'utf-8')
    const manual = extractManualContent(markdown)

    // Get unit info from frontmatter
    const unitName = manual.frontmatter.unit_reference?.unit_name
    const tenantId = manual.frontmatter.tenant_id

    if (!unitName) {
      console.error(`   ❌ No unit_name in frontmatter`)
      return { success: false, error: 'Missing unit_name' }
    }

    console.log(`   Unit: ${unitName}`)
    console.log(`   Tenant: ${tenantId}`)

    // Find unit_id in database
    const unitId = await findUnitIdByName(unitName, tenantId)
    if (!unitId) {
      return { success: false, error: 'Unit not found in database' }
    }

    // Generate embeddings
    console.log(`   🧮 Generating embeddings...`)
    const embedding1536 = await generateEmbedding(manual.content, 1536)
    const embedding3072 = await generateEmbedding(manual.content, 3072)
    console.log(`   ✓ Embeddings generated (1536d + 3072d)`)

    // Upsert accommodation_units_manual (INSERT or UPDATE)
    const { error: upsertError } = await supabase
      .from('accommodation_units_manual')
      .upsert({
        unit_id: unitId,
        manual_content: manual.content,
        wifi_password: manual.wifiPassword,
        embedding_balanced: embedding1536,
        embedding: embedding3072,
        updated_at: new Date().toISOString(),
      })

    if (upsertError) {
      console.error(`   ❌ Database upsert failed:`, upsertError.message)
      return { success: false, error: upsertError.message }
    }

    console.log(`   ✅ Upserted accommodation_units_manual`)

    return {
      success: true,
      unitName,
      unitId,
      hasWifi: !!manual.wifiPassword,
      contentLength: manual.content.length,
    }

  } catch (error) {
    console.error(`   ❌ Error:`, error.message)
    return { success: false, error: error.message }
  }
}

// Run
console.log('🚀 Processing ONLY Simmer Highs manual...\n')
processSimmerHighs()
  .then((result) => {
    if (result.success) {
      console.log('\n✅ Simmer Highs manual processed successfully!')
    } else {
      console.error('\n❌ Failed:', result.error)
    }
    process.exit(result.success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
