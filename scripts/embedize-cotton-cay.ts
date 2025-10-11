#!/usr/bin/env npx tsx
/**
 * Re-embedize Cotton Cay from updated markdown
 *
 * This script:
 * 1. Reads cotton-cay.md
 * 2. Parses frontmatter and extracts data
 * 3. Generates embedding from full content
 * 4. Inserts into accommodation_units_public
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/embedize-cotton-cay.ts
 */

import { readFile } from 'fs/promises'
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
const COTTON_CAY_PATH = '_assets/tucasamar/accommodations/rooms/cotton-cay.md'

interface ParsedMarkdown {
  frontmatter: {
    title: string
    description: string
    business_name: string
    location: string
    tenant_id: string
    unit_type: string
    capacity: number
  }
  content: string
  extractedData: {
    max_capacity?: number
    bed_configuration?: string
    room_type?: string
    unit_number?: string
    base_price?: string
    amenities_list: string[]
    unit_amenities?: string
    images: string[]
    location_details?: string
    tourism_features: string[]
    booking_policies: string[]
    status?: string
    is_featured?: string
  }
}

/**
 * Parse markdown file with frontmatter and extraction tags
 */
function parseMarkdown(content: string): ParsedMarkdown {
  // Split frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/)
  if (!frontmatterMatch) {
    throw new Error('Invalid markdown format: missing frontmatter')
  }

  const [, frontmatterText, markdownContent] = frontmatterMatch

  // Parse frontmatter
  const frontmatter: any = {}
  frontmatterText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
      // Try to parse as number if possible
      frontmatter[key.trim()] = isNaN(Number(value)) ? value : Number(value)
    }
  })

  // Extract data using <!-- EXTRAE: --> tags
  const extractedData: any = {
    amenities_list: [],
    images: [],
    tourism_features: [],
    booking_policies: []
  }

  // Extract amenities
  const amenityMatches = markdownContent.matchAll(/- \*\*(.+?)\*\* <!-- EXTRAE: amenities_list -->/g)
  for (const match of amenityMatches) {
    extractedData.amenities_list.push(match[1])
  }

  // Extract images
  const imageMatches = markdownContent.matchAll(/- \*\*Imagen \d+\*\*: (.+?) <!-- EXTRAE: images -->/g)
  for (const match of imageMatches) {
    extractedData.images.push(match[1])
  }

  // Extract single-value fields
  const singleValueFields = [
    'max_capacity', 'bed_configuration', 'room_type', 'unit_number',
    'base_price', 'unit_amenities', 'location_details', 'status', 'is_featured'
  ]

  singleValueFields.forEach(field => {
    const regex = new RegExp(`(.+?) <!-- EXTRAE: ${field} -->`, 'g')
    const match = markdownContent.match(regex)
    if (match && match[0]) {
      // Extract the value before the comment
      const valueMatch = match[0].match(/(.+?) <!-- EXTRAE:/)
      if (valueMatch) {
        extractedData[field] = valueMatch[1].trim().replace(/^\*\*|\*\*$/g, '')
      }
    }
  })

  // Extract tourism features and booking policies (multi-line)
  const tourismMatches = markdownContent.matchAll(/- \*\*(.+?)\*\*: (.+?) <!-- EXTRAE: tourism_features -->/g)
  for (const match of tourismMatches) {
    extractedData.tourism_features.push(`${match[1]}: ${match[2]}`)
  }

  const policyMatches = markdownContent.matchAll(/- \*\*(.+?)\*\*: (.+?) <!-- EXTRAE: booking_policies -->/g)
  for (const match of policyMatches) {
    extractedData.booking_policies.push(`${match[1]}: ${match[2]}`)
  }

  return {
    frontmatter: frontmatter as ParsedMarkdown['frontmatter'],
    content: markdownContent,
    extractedData
  }
}

/**
 * Generate embedding using OpenAI
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
 * Main execution
 */
async function main() {
  console.log('🔄 Re-embedizing Cotton Cay')
  console.log('============================\n')

  try {
    // Read markdown file
    console.log(`📄 Reading: ${COTTON_CAY_PATH}`)
    const markdownContent = await readFile(COTTON_CAY_PATH, 'utf-8')

    // Parse markdown
    console.log('📋 Parsing markdown...')
    const parsed = parseMarkdown(markdownContent)
    console.log(`   Title: ${parsed.frontmatter.title}`)
    console.log(`   Amenities: ${parsed.extractedData.amenities_list.length}`)
    console.log(`   Images: ${parsed.extractedData.images.length}`)

    // Generate embedding
    console.log('\n🤖 Generating embedding...')
    const embedding = await generateEmbedding(parsed.content)
    console.log(`   ✅ Generated ${embedding.length}d vector`)

    // Parse base price
    const basePriceMatch = parsed.extractedData.base_price?.match(/\$?([\d,]+)/)
    const basePrice = basePriceMatch ? parseInt(basePriceMatch[1].replace(/,/g, '')) : null

    // Prepare data for insertion
    const unitData = {
      unit_id: crypto.randomUUID(),
      tenant_id: TUCASAMAR_TENANT_ID,
      name: parsed.frontmatter.title,
      unit_number: parsed.extractedData.unit_number || '',
      unit_type: parsed.frontmatter.unit_type || 'room',
      description: parsed.frontmatter.description,
      short_description: parsed.extractedData.room_type || null,

      // Embeddings
      embedding_fast: JSON.stringify(embedding),
      embedding: null,

      // Structured data
      photos: parsed.extractedData.images,
      amenities: parsed.extractedData.amenities_list,
      highlights: parsed.extractedData.tourism_features,

      // Pricing
      pricing: {
        base_price_night: basePrice,
        currency: 'COP',
        seasonal_pricing: [],
        min_nights: 1
      },

      // Flags
      is_active: true,
      is_bookable: true,

      // Metadata
      metadata: {
        location: parsed.frontmatter.location,
        business_name: parsed.frontmatter.business_name,
        capacity: {
          max_capacity: parsed.extractedData.max_capacity,
          bed_configuration: parsed.extractedData.bed_configuration
        },
        source: 'markdown',
        processed_at: new Date().toISOString()
      },

      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert into database
    console.log('\n💾 Inserting into accommodation_units_public...')
    const { error } = await supabase
      .from('accommodation_units_public')
      .insert(unitData)

    if (error) {
      throw error
    }

    console.log('   ✅ Inserted successfully')

    // Summary
    console.log('\n============================')
    console.log('✅ Cotton Cay Re-embedded')
    console.log('============================')
    console.log(`📊 Summary:`)
    console.log(`   Name: ${parsed.frontmatter.title}`)
    console.log(`   Type: ${parsed.frontmatter.unit_type}`)
    console.log(`   Price: ${basePrice ? `$${basePrice.toLocaleString()} COP` : 'N/A'}`)
    console.log(`   Amenities: ${parsed.extractedData.amenities_list.length}`)
    console.log(`   Images: ${parsed.extractedData.images.length}`)
    console.log(`   Embedding: ${embedding.length}d vector`)
    console.log('============================\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run
main().catch(console.error)
