import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { glob } from 'glob'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')

// Load environment variables
config({ path: path.join(projectRoot, '.env.local') })

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// MATRYOSHKA EMBEDDING SYSTEM - MULTI-TIER DIMENSIONS
// Tier 1: 1024 dims (fast), Tier 2: 1536 dims (balanced), Tier 3: 3072 dims (full)

const METADATA_VERSION = "3.0"

// MATRYOSHKA DIMENSION STRATEGY - UPDATED FOR ACCOMMODATION SYSTEM
const DIMENSION_STRATEGY = {
  // Tier 1: High-frequency searches - 1024 dimensions (Tourism ultra-fast)
  'accommodation_units': { fast: 1024, balanced: 1536 }, // Multi-tier for accommodation units
  'hotels': { fast: 1024, balanced: 1536 }, // Multi-tier for hotels
  'policies': { fast: 1024, full: 3072 },
  'muva_content': { fast: 1024, full: 3072 },

  // Tier 2: Moderate frequency - 1536 dimensions (Policies balanced)
  'guest_information': { balanced: 1536, full: 3072 },
  'content': { balanced: 1536, full: 3072 },
  'sire_content': { balanced: 1536, full: 3072 },
  'accommodation_types': { balanced: 1536 }, // Types use balanced tier

  // Tier 3: Low frequency - 3072 dimensions only (Full precision)
  'client_info': { full: 3072 },
  'properties': { full: 3072 },
  'unit_amenities': { full: 3072 },
  'pricing_rules': { full: 3072 },
  'bookings': { full: 3072 },
  'booking_services': { full: 3072 }
}

// DYNAMIC TENANT-TO-HOTEL LOOKUP
async function getHotelIdByTenantId(tenantId) {
  if (!tenantId) {
    throw new Error('❌ SECURITY: tenant_id is required for hotel lookup')
  }

  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !hotel) {
    throw new Error(`❌ No hotel found for tenant_id: ${tenantId}. Error: ${error?.message || 'Hotel not found'}`)
  }

  console.log(`   🏨 Dynamic lookup: tenant_id="${tenantId}" → hotel_id="${hotel.id}"`)
  return hotel.id
}

// TEMPLATE Q&A DATA EXTRACTION
function extractPricingFromTemplate(content) {
  const pricing = {}

  // Extract low season prices - flexible pattern for any base capacity
  const lowSeasonMatch = content.match(/### Temporada Baja[\s\S]*?- \*\*(?:\d+|\w+) personas?(?:\s*\([^)]*\))?\*\*:\s*\$?([\d,.]+)\s*COP/i)
  if (lowSeasonMatch) {
    pricing.base_price_low_season = parseInt(lowSeasonMatch[1].replace(/[,.]/g, ''))
  }

  // Extract high season prices - flexible pattern for any base capacity
  const highSeasonMatch = content.match(/### Temporada Alta[\s\S]*?- \*\*(?:\d+|\w+) personas?(?:\s*\([^)]*\))?\*\*:\s*\$?([\d,.]+)\s*COP/i)
  if (highSeasonMatch) {
    pricing.base_price_high_season = parseInt(highSeasonMatch[1].replace(/[,.]/g, ''))
  }

  // Extract per-person pricing (3-2=1 person increment)
  const threePersonLowMatch = content.match(/### Temporada Baja[\s\S]*?- \*\*3 personas\*\*:\s*\$?([\d,.]+)\s*COP/i)
  if (threePersonLowMatch && pricing.base_price_low_season) {
    const threePersonPrice = parseInt(threePersonLowMatch[1].replace(/[,.]/g, ''))
    pricing.price_per_person_low = threePersonPrice - pricing.base_price_low_season
  }

  const threePersonHighMatch = content.match(/### Temporada Alta[\s\S]*?- \*\*3 personas\*\*:\s*\$?([\d,.]+)\s*COP/i)
  if (threePersonHighMatch && pricing.base_price_high_season) {
    const threePersonPrice = parseInt(threePersonHighMatch[1].replace(/[,.]/g, ''))
    pricing.price_per_person_high = threePersonPrice - pricing.base_price_high_season
  }

  return pricing
}

function extractAmenitiesFromTemplate(content) {
  const amenities = []
  const amenitiesMap = {
    'smart tv': 'smart_tv',
    'netflix': 'netflix',
    'wi-fi': 'wifi',
    'wifi': 'wifi',
    'aire acondicionado': 'aire_acondicionado',
    'cocina equipada': 'cocina_equipada',
    'cocina totalmente equipada': 'cocina_equipada',
    'balcón': 'balcon',
    'hamaca': 'hamaca',
    'sofá cama': 'sofa_cama'
  }

  // Extract from amenities section
  const amenitiesSection = content.match(/### Tecnología y Entretenimiento[\s\S]*?### /i) ||
                           content.match(/### Cocina y Área de Descanso[\s\S]*?### /i) ||
                           content.match(/### Espacios Exteriores[\s\S]*?### /i)

  if (amenitiesSection) {
    const amenitiesText = amenitiesSection[0].toLowerCase()
    Object.entries(amenitiesMap).forEach(([keyword, value]) => {
      if (amenitiesText.includes(keyword) && !amenities.includes(value)) {
        amenities.push(value)
      }
    })
  }

  // Also extract from keywords in frontmatter
  const keywordsMatch = content.match(/keywords:\s*\[(.*?)\]/i)
  if (keywordsMatch) {
    const keywords = keywordsMatch[1].toLowerCase()
    Object.entries(amenitiesMap).forEach(([keyword, value]) => {
      if (keywords.includes(keyword) && !amenities.includes(value)) {
        amenities.push(value)
      }
    })
  }

  return amenities
}

function extractBookingPoliciesFromTemplate(content) {
  const policies = []

  // ENHANCED: Extract policies using HTML comments (primary method)
  const policyCommentMatches = content.matchAll(/<!-- EXTRAE: booking_policies -->\s*(.*?)(?=<!--|\n|$)/gi)
  for (const match of policyCommentMatches) {
    if (match && match[1]) {
      const policyText = match[1].trim()
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/^-\s*/, '') // Remove bullet point
        .trim()

      if (policyText && policyText.length > 5) {
        policies.push(policyText)
      }
    }
  }

  // If HTML comment extraction found policies, return them
  if (policies.length > 0) {
    return policies
  }

  // FALLBACK: Extract policies from the template sections
  const policiesMatch = content.match(/### Políticas Específicas del Alojamiento[\s\S]*?(?=###|$)/i) ||
                        content.match(/### Políticas de Uso[\s\S]*?### Recomendaciones de Estadía[\s\S]*?(?=###|$)/i)

  if (!policiesMatch) return null

  // Clean up the policies text
  let policiesText = policiesMatch[0]
  policiesText = policiesText.replace(/###.*$/gm, '') // Remove section headers
  policiesText = policiesText.replace(/\*\*/g, '') // Remove markdown bold

  // Extract individual policy items
  const policyItems = policiesText.split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(line => line.length > 5)

  return policyItems.length > 0 ? policyItems : null
}

// NEW EXTRACTION FUNCTIONS - PREVENTING "PRICING BUG" FOR OTHER FIELDS

function extractCapacityFromTemplate(content) {
  const capacity = {}

  // Extract capacity information using HTML comments and patterns
  const capacityPatterns = [
    /hasta (\d+) personas/i,
    /máximo (\d+) personas/i,
    /capacidad.*?(\d+) personas/i,
    /(\d+) huéspedes/i,
    /acomoda (\d+) personas/i,
    /<!-- EXTRAE: capacity\.max_capacity -->.*?(\d+) personas/i
  ]

  for (const pattern of capacityPatterns) {
    const match = content.match(pattern)
    if (match) {
      capacity.max_capacity = parseInt(match[1])
      break
    }
  }

  // ENHANCED: Extract bed configuration using HTML comments and improved patterns
  const bedConfigPatterns = [
    // HTML comment guided extraction - capture text between colon and comment
    /- \*\*Configuración de camas\*\*:\s*(.*?)\s*<!-- EXTRAE: bed_configuration -->/i,
    // Secondary pattern - capture text on same line as comment
    /<!-- EXTRAE: bed_configuration -->\s*(.*?)(?=<!--|\n|$)/i,
    // Traditional patterns
    /configuración de camas.*?:\s*(.*?)(?=\n|-)/i,
    /dormitorio.*?cama\s+(\w+)/i,
    /(\d+) cama matrimonial/i,
    /(\d+) cama doble/i,
    /(\d+) cama sencilla/i,
    /(\d+) sofá cama/i,
    /cama king/i,
    /cama queen/i
  ]

  let bedConfig = []
  let bedConfigText = null

  // Try improved HTML comment extraction patterns
  for (const pattern of bedConfigPatterns.slice(0, 2)) {
    const match = content.match(pattern)
    if (match && match[1]) {
      bedConfigText = match[1].trim()
      if (bedConfigText && bedConfigText.length > 5) {
        break
      }
    }
  }

  if (bedConfigText) {
    // Parse the extracted text for bed configuration
    if (/cama king/i.test(bedConfigText)) {
      bedConfig.push({ type: 'king', count: 1 })
    }
    if (/cama queen/i.test(bedConfigText)) {
      bedConfig.push({ type: 'queen', count: 1 })
    }
    if (/sofá cama/i.test(bedConfigText)) {
      const sofaMatch = bedConfigText.match(/(\d+)?\s*sofá cama/i)
      bedConfig.push({ type: 'sofa_bed', count: sofaMatch && sofaMatch[1] ? parseInt(sofaMatch[1]) : 1 })
    }
    if (/cama matrimonial|cama doble/i.test(bedConfigText)) {
      const doubleMatch = bedConfigText.match(/(\d+)?\s*cama\s+(matrimonial|doble)/i)
      bedConfig.push({ type: 'double', count: doubleMatch && doubleMatch[1] ? parseInt(doubleMatch[1]) : 1 })
    }
    if (/cama sencilla/i.test(bedConfigText)) {
      const singleMatch = bedConfigText.match(/(\d+)?\s*cama sencilla/i)
      bedConfig.push({ type: 'single', count: singleMatch && singleMatch[1] ? parseInt(singleMatch[1]) : 1 })
    }
  } else {
    // Fallback to traditional patterns
    for (const pattern of bedConfigPatterns) {
      const match = content.match(pattern)
      if (match) {
        if (pattern.source.includes('matrimonial') || pattern.source.includes('doble')) {
          bedConfig.push({ type: 'double', count: parseInt(match[1]) })
        } else if (pattern.source.includes('sencilla')) {
          bedConfig.push({ type: 'single', count: parseInt(match[1]) })
        } else if (pattern.source.includes('sofá')) {
          bedConfig.push({ type: 'sofa_bed', count: parseInt(match[1]) })
        } else if (pattern.source.includes('king')) {
          bedConfig.push({ type: 'king', count: 1 })
        } else if (pattern.source.includes('queen')) {
          bedConfig.push({ type: 'queen', count: 1 })
        }
      }
    }
  }

  if (bedConfig.length > 0) {
    capacity.bed_configuration = bedConfig
  }

  return Object.keys(capacity).length > 0 ? capacity : null
}

function extractSizeFromTemplate(content) {
  // Extract size_m2 using HTML comments and patterns
  const sizePatterns = [
    // HTML comment guided extraction - WITH numeric value
    /<!-- EXTRAE: size_m2 -->\s*.*?(\d+)\s*metros?\s*cuadrados?/i,
    // Traditional patterns with numbers
    /tamaño.*?(\d+)\s*metros?\s*cuadrados?/i,
    /(\d+)\s*m2/i,
    /(\d+)\s*metros?\s*cuadrados?/i,
    /superficie.*?(\d+)\s*metros?/i,
    /área.*?(\d+)\s*metros?/i
  ]

  for (const pattern of sizePatterns) {
    const match = content.match(pattern)
    if (match) {
      const size = parseInt(match[1])
      if (size > 0 && size < 1000) { // Reasonable size validation
        return size
      }
    }
  }

  // ENHANCED: Extract descriptive size when no numeric value (e.g., "pequeña pero optimizada")
  // Pattern to capture text BEFORE the comment (e.g., "- **Tamaño**: Habitación pequeña pero optimizada <!-- EXTRAE: size_m2 -->")
  const descriptiveSizePattern = /Tamaño\*\*:\s*(.*?)\s*<!--\s*EXTRAE:\s*size_m2\s*-->/i
  const descriptiveMatch = content.match(descriptiveSizePattern)
  if (descriptiveMatch) {
    const sizeText = descriptiveMatch[1].trim()
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\[|\]/g, '') // Remove brackets
      .trim()

    // Only return if it's descriptive text (not empty, not just a number)
    if (sizeText && sizeText.length > 3 && !/^\d+$/.test(sizeText)) {
      return sizeText // Return descriptive size like "Habitación pequeña pero optimizada"
    }
  }

  return null
}

function extractImagesFromTemplate(content) {
  const images = []

  // ENHANCED: Extract images using HTML comments and patterns
  const imageCommentPatterns = [
    // HTML comment guided extraction - multiple patterns
    /<!-- EXTRAE: images -->\s*(.*?)(?=<!--|\n|$)/gi,
    // Direct image descriptions in comments
    /\[([^\]]*imagen[^\]]*)\]/gi,
    /\[([^\]]*foto[^\]]*)\]/gi,
    /\[([^\]]*gallery[^\]]*)\]/gi
  ]

  // First try to extract from HTML comments
  let match
  while ((match = imageCommentPatterns[0].exec(content)) !== null) {
    const imageText = match[1].trim()
    if (imageText && imageText.length > 5) {
      images.push({
        description: imageText,
        type: 'template_comment',
        source: 'html_comment'
      })
    }
  }

  // Extract image descriptions from template sections
  const imageSectionPatterns = [
    /foto principal.*?:\s*\[(.*?)\]/gi,
    /imagen.*?:\s*\[(.*?)\]/gi,
    /gallery reference.*?:\s*\[(.*?)\]/gi,
    /vista del.*?:\s*\[(.*?)\]/gi
  ]

  imageSectionPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const description = match[1].trim()
      if (description && description.length > 5) {
        images.push({
          description: description,
          type: 'section_description',
          source: 'template_section'
        })
      }
    }
  })

  // Traditional image extraction patterns
  const imagePatterns = [
    /!\[([^\]]+)\]\(([^)]+)\)/g, // Markdown images
    /imagen.*?(\w+\.(jpg|jpeg|png|gif))/gi, // Generic image references
    /foto.*?(\w+\.(jpg|jpeg|png|gif))/gi // Photo references
  ]

  for (const pattern of imagePatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (pattern.source.includes('!\\[')) {
        images.push({
          alt: match[1],
          url: match[2],
          type: 'markdown',
          source: 'traditional_pattern'
        })
      } else {
        images.push({
          filename: match[1],
          type: 'file_reference',
          source: 'traditional_pattern'
        })
      }
    }
  }

  // Extract gallery references
  const galleryMatch = content.match(/galería|gallery/i)
  if (galleryMatch) {
    images.push({
      type: 'gallery',
      description: 'Gallery section found in template',
      source: 'gallery_reference'
    })
  }

  // Remove duplicates based on description/filename
  const uniqueImages = []
  const seenDescriptions = new Set()

  images.forEach(img => {
    const key = img.description || img.filename || img.alt || img.type
    if (!seenDescriptions.has(key.toLowerCase())) {
      seenDescriptions.add(key.toLowerCase())
      uniqueImages.push(img)
    }
  })

  return uniqueImages.length > 0 ? uniqueImages : null
}

function extractFeaturesFromTemplate(content) {
  const features = {
    unique_features: [],
    accessibility_features: [],
    view_type: null
  }

  // ENHANCED: Extract view_type using HTML comments and patterns
  const viewTypePatterns = [
    // HTML comment guided extraction - capture text between colon and comment
    /- \*\*Tipo de vista\*\*:\s*(.*?)\s*<!-- EXTRAE: view_type -->/i,
    // Secondary pattern - capture text on same line as comment
    /<!-- EXTRAE: view_type -->\s*(.*?)(?=<!--|\]|\n|$)/i,
    // Traditional patterns
    /tipo de vista.*?:\s*(.*?)(?=\n|-)/i,
    /vista.*?:\s*(.*?)(?=\n|-)/i,
    /balcón.*?vista\s+(.*?)(?=\n|\.|,)/i,
    /vista al (.*?)(?=\n|\.|,)/i,
    /vista (.*?)(?=\n|\.|,)/i
  ]

  for (const pattern of viewTypePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let viewText = match[1].trim()
      // Clean up the extracted text
      viewText = viewText.replace(/\[|\]/g, '').trim()
      if (viewText && viewText.length > 3 && viewText.length < 200) {
        features.view_type = viewText
        break
      }
    }
  }

  // ENHANCED: Extract unique features using HTML comments
  const uniqueCommentMatch = content.match(/<!-- EXTRAE: unique_features -->\s*(.*?)(?=<!--|\]|\n|$)/i)
  if (uniqueCommentMatch) {
    const uniqueText = uniqueCommentMatch[1].trim().replace(/\[|\]/g, '')
    if (uniqueText) {
      features.unique_features.push(uniqueText)
    }
  }

  // Traditional unique features patterns
  const uniquePatterns = [
    /vista al mar/i,
    /vista océano/i,
    /vista jardín/i,
    /balcón privado/i,
    /terraza/i,
    /hamaca/i,
    /ubicación privilegiada/i,
    /exclusivo/i,
    /privacidad/i,
    /decoración temática/i,
    /mayor privacidad/i,
    /mejor ventilación/i
  ]

  uniquePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      const match = content.match(pattern)
      if (match && !features.unique_features.includes(match[0].toLowerCase())) {
        features.unique_features.push(match[0].toLowerCase())
      }
    }
  })

  // ENHANCED: Extract accessibility features using HTML comments
  const accessibilityCommentMatch = content.match(/<!-- EXTRAE: accessibility_features -->\s*(.*?)(?=<!--|\]|\n|$)/i)
  if (accessibilityCommentMatch) {
    const accessibilityText = accessibilityCommentMatch[1].trim().replace(/\[|\]/g, '')
    if (accessibilityText) {
      features.accessibility_features.push(accessibilityText)
    }
  }

  // Traditional accessibility features patterns
  const accessibilityPatterns = [
    /acceso discapacitados/i,
    /rampa/i,
    /ascensor/i,
    /planta baja/i,
    /sin escalones/i,
    /baño adaptado/i,
    /accesibilidad/i,
    /escaleras internas/i,
    /no apto para sillas de ruedas/i
  ]

  accessibilityPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      const match = content.match(pattern)
      if (match && !features.accessibility_features.includes(match[0].toLowerCase())) {
        features.accessibility_features.push(match[0].toLowerCase())
      }
    }
  })

  // Clean up empty arrays and null values
  if (features.unique_features.length === 0) delete features.unique_features
  if (features.accessibility_features.length === 0) delete features.accessibility_features
  if (!features.view_type) delete features.view_type

  return Object.keys(features).length > 0 ? features : null
}

function extractLocationDetailsFromTemplate(content) {
  const location = {}

  // Extract address information
  const addressPatterns = [
    /dirección:?\s*([^\n]+)/i,
    /ubicado en:?\s*([^\n]+)/i,
    /se encuentra en:?\s*([^\n]+)/i
  ]

  for (const pattern of addressPatterns) {
    const match = content.match(pattern)
    if (match) {
      location.address = match[1].trim()
      break
    }
  }

  // Extract coordinates if present
  const coordsPattern = /(\d+\.\d+),?\s*(-?\d+\.\d+)/
  const coordsMatch = content.match(coordsPattern)
  if (coordsMatch) {
    location.coordinates = {
      lat: parseFloat(coordsMatch[1]),
      lng: parseFloat(coordsMatch[2])
    }
  }

  // Extract landmarks
  const landmarkPatterns = [
    /cerca de:?\s*([^\n]+)/i,
    /a \d+ minutos? de:?\s*([^\n]+)/i,
    /próximo a:?\s*([^\n]+)/i
  ]

  const landmarks = []
  landmarkPatterns.forEach(pattern => {
    const match = content.match(pattern)
    if (match) {
      landmarks.push(match[1].trim())
    }
  })

  if (landmarks.length > 0) {
    location.landmarks = landmarks
  }

  return Object.keys(location).length > 0 ? location : null
}

function extractContactInfoFromTemplate(content) {
  const contact = {}

  // Extract phone numbers
  const phonePatterns = [
    /teléfono:?\s*([+\d\s\-()]+)/i,
    /celular:?\s*([+\d\s\-()]+)/i,
    /contacto:?\s*([+\d\s\-()]+)/i,
    /(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g
  ]

  for (const pattern of phonePatterns) {
    const match = content.match(pattern)
    if (match) {
      contact.phone = match[1].trim()
      break
    }
  }

  // Extract email addresses
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  const emailMatch = content.match(emailPattern)
  if (emailMatch) {
    contact.email = emailMatch[0]
  }

  // Extract WhatsApp
  const whatsappPattern = /whatsapp:?\s*([+\d\s\-()]+)/i
  const whatsappMatch = content.match(whatsappPattern)
  if (whatsappMatch) {
    contact.whatsapp = whatsappMatch[1].trim()
  }

  return Object.keys(contact).length > 0 ? contact : null
}

function extractTourismFeaturesFromTemplate(content) {
  const tourismFeatures = []

  // Extract tourism-related features
  const tourismPatterns = [
    /playa/i,
    /mar/i,
    /piscina/i,
    /centro histórico/i,
    /restaurantes cercanos/i,
    /actividades acuáticas/i,
    /snorkel/i,
    /buceo/i,
    /golf/i,
    /spa/i,
    /tours/i,
    /excursiones/i
  ]

  tourismPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      const match = content.match(pattern)
      if (match) {
        tourismFeatures.push(match[0].toLowerCase())
      }
    }
  })

  return tourismFeatures.length > 0 ? tourismFeatures : null
}

function extractDescriptionFromTemplate(content) {
  // Extract main description sections
  const descriptions = {}

  // Extract short description (usually first paragraph)
  const firstParagraph = content.match(/^([^#\n]+(?:\n[^#\n]+)*)/m)
  if (firstParagraph) {
    descriptions.short_description = firstParagraph[1].trim()
  }

  // Extract full description (everything after frontmatter, before sections)
  const fullDescMatch = content.match(/^---[\s\S]*?---\s*([\s\S]*?)(?=#{2,}|$)/m)
  if (fullDescMatch) {
    let fullDesc = fullDescMatch[1].trim()
    // Remove excessive whitespace
    fullDesc = fullDesc.replace(/\n\s*\n/g, '\n\n')
    if (fullDesc && fullDesc.length > 100) {
      descriptions.full_description = fullDesc
    }
  }

  return Object.keys(descriptions).length > 0 ? descriptions : null
}

function extractStatusFromTemplate(content, metadata) {
  // Extract status from frontmatter (primary source)
  if (metadata && metadata.status) {
    return metadata.status
  }

  // Fallback: extract from HTML comments
  const statusCommentMatch = content.match(/<!-- EXTRAE: status -->\s*(.*?)(?=<!--|\n|$)/i)
  if (statusCommentMatch) {
    const statusText = statusCommentMatch[1].trim().replace(/\[|\]/g, '')
    if (statusText) {
      return statusText
    }
  }

  // Fallback: extract from content patterns
  const statusPatterns = [
    /estado operacional.*?:\s*\[(.*?)\]/i,
    /status.*?:\s*\[(.*?)\]/i,
    /estado.*?:\s*(active|draft|production-ready|archived)/i
  ]

  for (const pattern of statusPatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }

  return 'active' // Default fallback
}

function extractDisplayConfigFromTemplate(content, metadata) {
  const config = {}

  // Extract is_featured from frontmatter (primary) or content
  if (metadata && metadata.is_featured !== undefined) {
    config.is_featured = metadata.is_featured
  } else {
    // HTML comment extraction
    const featuredCommentMatch = content.match(/<!-- EXTRAE: is_featured -->\s*(.*?)(?=<!--|\n|$)/i)
    if (featuredCommentMatch) {
      const featuredText = featuredCommentMatch[1].trim().replace(/\[|\]/g, '')
      config.is_featured = featuredText.toLowerCase() === 'true'
    } else {
      // Pattern extraction
      const featuredPatterns = [
        /destacado.*?:\s*\[(.*?)\]/i,
        /is_featured.*?:\s*(true|false)/i,
        /aparece en listados destacados/i
      ]

      for (const pattern of featuredPatterns) {
        const match = content.match(pattern)
        if (match) {
          if (match[1]) {
            config.is_featured = match[1].toLowerCase() === 'true'
          } else {
            config.is_featured = true // If pattern matches without specific true/false
          }
          break
        }
      }
    }
  }

  // Extract display_order from frontmatter (primary) or content
  if (metadata && metadata.display_order !== undefined) {
    config.display_order = parseInt(metadata.display_order)
  } else {
    // ENHANCED: HTML comment extraction with flexible parsing
    // Pattern to capture text BEFORE the comment (e.g., "- **Orden de visualización**: 6 - Buena prioridad <!-- EXTRAE: display_order -->")
    const orderCommentMatch = content.match(/Orden de visualización\*\*:\s*(.*?)\s*<!--\s*EXTRAE:\s*display_order\s*-->/i)
    if (orderCommentMatch) {
      const orderText = orderCommentMatch[1].trim()
        .replace(/\[|\]/g, '')
        .replace(/\*\*/g, '') // Remove markdown bold
        .replace(/^-\s*/, '') // Remove bullet point
        .trim()

      // Extract first number from text (handles "6 - Buena prioridad" → 6)
      const numberMatch = orderText.match(/(\d+)/)
      if (numberMatch) {
        const orderNum = parseInt(numberMatch[1])
        if (!isNaN(orderNum) && orderNum >= 0 && orderNum < 100) { // Reasonable display_order validation
          config.display_order = orderNum
        }
      }
    } else {
      // Pattern extraction
      const orderPatterns = [
        /orden de visualización.*?:\s*\[?(\d+)\]?/i,
        /display_order.*?:\s*(\d+)/i,
        /prioridad.*?(\d+)/i
      ]

      for (const pattern of orderPatterns) {
        const match = content.match(pattern)
        if (match) {
          const orderNum = parseInt(match[1])
          if (!isNaN(orderNum)) {
            config.display_order = orderNum
            break
          }
        }
      }
    }
  }

  return Object.keys(config).length > 0 ? config : null
}

function extractUnitAmenitiesFromTemplate(content) {
  // ENHANCED: Extract unit_amenities using improved HTML comment patterns
  const amenityPatterns = [
    // Pattern 1: Text before HTML comment (most accurate)
    /(Smart TV.*?balcón trasero) <!-- EXTRAE: unit_amenities -->/i,
    // Pattern 2: Capture multi-line text before comment
    /### Amenities en Texto Completo\s*\n(.*?) <!-- EXTRAE: unit_amenities -->/is,
    // Pattern 3: Traditional HTML comment pattern
    /<!-- EXTRAE: unit_amenities -->\s*(.*?)(?=<!--|\n|$)/i
  ]

  // Try improved patterns first
  for (const pattern of amenityPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let amenityText = match[1].trim()
      // Clean up the text
      amenityText = amenityText.replace(/\[|\]/g, '').trim()
      if (amenityText && amenityText.length > 20) {
        return amenityText
      }
    }
  }

  // Extract from amenities sections with improved patterns
  const sectionPatterns = [
    /amenities en texto completo\s*\n(.*?)(?=\n###|\n\*\*)/is,
    /lista de amenidades.*?:\s*(.*?)(?=\n|###|\*\*)/i,
    /comodidades incluidas.*?:\s*(.*?)(?=\n|###|\*\*)/i
  ]

  for (const pattern of sectionPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let amenityText = match[1].trim()
      // Clean up the text
      amenityText = amenityText.replace(/\[|\]/g, '').trim()
      if (amenityText && amenityText.length > 15) {
        return amenityText
      }
    }
  }

  // Fallback: collect from various amenity sections
  const amenityFeatures = []
  const sections = content.split('###')

  sections.forEach(section => {
    if (/tecnología|entretenimiento|cocina|descanso/i.test(section)) {
      const lines = section.split('\n')
      lines.forEach(line => {
        if (/smart tv|netflix|wi-fi|aire acondicionado|cocina|hamaca|balcón/i.test(line)) {
          const cleanLine = line.replace(/^-\s*\*\*|^-\s*|\*\*/g, '').trim()
          if (cleanLine && cleanLine.length > 5 && cleanLine.length < 100) {
            amenityFeatures.push(cleanLine)
          }
        }
      })
    }
  })

  return amenityFeatures.length > 0 ? amenityFeatures.join(', ') : null
}

// YAML FRONTMATTER PARSER
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: null, content }
  }

  const frontmatterText = match[1]
  const contentWithoutFrontmatter = content.replace(match[0], '').trim()

  // Simple YAML parser for our specific structure
  const frontmatter = {}
  const lines = frontmatterText.split('\n')
  let currentParent = null

  lines.forEach((line, lineIndex) => {
    try {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) return

      const lineIndent = line.length - line.trimStart().length
      const colonIndex = trimmedLine.indexOf(':')

      if (colonIndex > 0) {
        const key = trimmedLine.substring(0, colonIndex).trim()
        let value = trimmedLine.substring(colonIndex + 1).trim()

        if (lineIndent === 0) {
          // Root level key
          if (!value) {
            // Parent object
            frontmatter[key] = {}
            currentParent = key
          } else {
            // Root level value
            currentParent = null
            // Parse value with improved type detection
            if (value === 'true') {
              // Native boolean true
              value = true
            } else if (value === 'false') {
              // Native boolean false
              value = false
            } else if (/^\d+$/.test(value)) {
              // Pure integer (no decimal point)
              value = parseInt(value, 10)
            } else if (/^\d+\.\d+$/.test(value)) {
              // Pure decimal number
              value = parseFloat(value)
            } else if (typeof value === 'string') {
              // String processing
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                // Quoted string - remove quotes
                value = value.slice(1, -1)
              } else if (value.startsWith('[') && value.endsWith(']')) {
                // Array processing
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))
              }
              // If it's still a string that looks like boolean, convert it
              if (value === 'true') {
                value = true
              } else if (value === 'false') {
                value = false
              }
            }
            frontmatter[key] = value
          }
        } else if (lineIndent > 0 && currentParent) {
          // Nested key under current parent
          // Parse value with improved type detection (nested)
          if (value === 'true') {
            // Native boolean true
            value = true
          } else if (value === 'false') {
            // Native boolean false
            value = false
          } else if (/^\d+$/.test(value)) {
            // Pure integer (no decimal point)
            value = parseInt(value, 10)
          } else if (/^\d+\.\d+$/.test(value)) {
            // Pure decimal number
            value = parseFloat(value)
          } else if (typeof value === 'string') {
            // String processing
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
              // Quoted string - remove quotes
              value = value.slice(1, -1)
            } else if (value.startsWith('[') && value.endsWith(']')) {
              // Array processing
              value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''))
            }
            // If it's still a string that looks like boolean, convert it
            if (value === 'true') {
              value = true
            } else if (value === 'false') {
              value = false
            }
          }
          frontmatter[currentParent][key] = value
        }
      }
    } catch (parseError) {
      console.error(`❌ YAML parsing error at line ${lineIndex + 1}: "${line}"`)
      console.error(`   Error: ${parseError.message}`)
      // Continue processing other lines
    }
  })

  return { frontmatter, content: contentWithoutFrontmatter }
}

// STRICT METADATA VALIDATION
function validateMetadata(metadata, metaFilePath) {
  const errors = []

  // Check version
  if (!metadata.version || metadata.version !== METADATA_VERSION) {
    errors.push(`Invalid or missing version. Expected: ${METADATA_VERSION}`)
  }

  // Check required fields - Support both current format and template format
  if (!metadata.type) {
    errors.push('Missing required field: type')
  }

  // Check tenant_id for metadata-driven routing (required for template format)
  const hasTemplateFormat = metadata.title && metadata.description
  if (hasTemplateFormat && !metadata.tenant_id) {
    errors.push('Missing required field: tenant_id (required for template format)')
  }

  // Flexible validation: documentation template format OR current format OR MUVA format
  const hasCurrentFormat = metadata.document && metadata.destination
  const hasMuvaFormat = metadata.nombre && metadata.descripcion && metadata.categoria

  if (!hasTemplateFormat && !hasCurrentFormat && !hasMuvaFormat) {
    errors.push('Must have either template format (title, description), current format (document, destination), or MUVA format (nombre, descripcion, categoria)')
  }

  // If current format, validate destination
  if (metadata.destination && !metadata.destination.schema) {
    errors.push('destination must specify schema')
  }

  // Validate document - only if using current format
  if (metadata.document) {
    if (!metadata.document.title) {
      errors.push('document.title is required')
    }
    if (!metadata.document.category) {
      errors.push('document.category is required')
    }
  }

  // Validate type - Expanded to include all documentation template types
  const validTypes = [
    // Legacy types (mantener compatibilidad)
    'sire', 'muva', 'listing',
    // SIRE Domain types
    'sire_regulatory', 'sire_template', 'compliance_guide',
    // Hotel Domain types
    'hotel', 'hotel_process', 'amenities', 'policies', 'guest_manual', 'services',
    'facilities', 'procedures', 'rates', 'packages',
    // Tourism Domain types
    'tourism', 'restaurants', 'beaches', 'activities', 'culture', 'events',
    'transport', 'hotels',
    // System Domain types
    'system_docs', 'general_docs'
  ]
  if (metadata.type && !validTypes.includes(metadata.type)) {
    errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`)
  }

  // Type-specific validation
  if (metadata.type === 'listing' && metadata.listing_specific) {
    if (!metadata.listing_specific.business_nit) {
      errors.push('listing_specific.business_nit is required for listing type')
    }
    if (!metadata.listing_specific.business_name) {
      errors.push('listing_specific.business_name is required for listing type')
    }
  }

  if (errors.length > 0) {
    console.error(`❌ Metadata validation failed for ${metaFilePath}:`)
    errors.forEach(error => console.error(`   - ${error}`))
    return false
  }

  return true
}

// DYNAMIC ROUTING TO STRUCTURED TABLES - NO REDUNDANCY
function getDestination(metadata) {
  // Support both template format and current format
  let schema, category, subcategory, type

  if (metadata.destination) {
    // Current format
    schema = metadata.destination.schema
    category = metadata.document.category
    subcategory = metadata.document.subcategory
    type = metadata.type
  } else {
    // Template format - METADATA-DRIVEN ROUTING
    type = metadata.type
    category = metadata.category || deriveCategory(type)
    subcategory = metadata.subcategory

    // PRIORITY: Use schema field if available, otherwise tenant_id (metadata-driven)
    console.log(`   🔍 DEBUG: metadata.schema="${metadata.schema}", metadata.tenant_id="${metadata.tenant_id}", type="${type}"`)

    if (metadata.schema) {
      schema = metadata.schema
      console.log(`   🎯 Schema-driven routing: schema="${metadata.schema}" → schema="${schema}"`)
    } else if (metadata.tenant_id) {
      schema = metadata.tenant_id
      console.log(`   🎯 Tenant-driven routing: tenant_id="${metadata.tenant_id}" → schema="${schema}"`)
    } else {
      // Fallback to type-based routing for legacy content
      schema = deriveSchema(type)
      console.log(`   ⚠️  Legacy routing: type="${type}" → schema="${schema}"`)
    }
  }

  // 🎯 EXPLICIT DESTINATION OVERRIDE: Use specified destination.table if provided
  let table
  if (metadata.destination && metadata.destination.table) {
    table = metadata.destination.table
    console.log(`   🎯 Explicit destination table: "${table}" (overriding deriveTable)`)
  } else {
    // Dynamic routing based on content type and document type
    table = deriveTable(type, category, subcategory, metadata)
  }

  console.log(`   📍 Final destination: ${schema}.${table}`)

  return {
    schema: schema,
    table: table,
    type: type,
    documentType: category,
    sourceType: subcategory || type
  }
}

// Helper function to derive schema from document type
function deriveSchema(type) {
  if (type.startsWith('sire')) return 'public'
  if (['tourism', 'restaurants', 'beaches', 'activities', 'culture', 'events', 'transport', 'hotels'].includes(type)) return 'public'
  if (['hotel', 'hotel_process', 'amenities', 'policies', 'guest_manual', 'services', 'facilities', 'procedures', 'rates', 'packages', 'listing'].includes(type)) return 'hotels'
  return 'public' // fallback
}

// Helper function to derive category from document type
function deriveCategory(type) {
  if (type.startsWith('sire')) return 'regulatory'
  if (['tourism', 'restaurants', 'beaches', 'activities', 'culture', 'events', 'transport', 'hotels'].includes(type)) return 'tourism'
  if (['hotel_process', 'guest_manual', 'services', 'facilities', 'procedures'].includes(type)) return 'guest_info'
  if (['amenities', 'policies', 'listing'].includes(type)) return 'policies'
  if (['hotel', 'rates', 'packages'].includes(type)) return 'accommodations'
  return 'general'
}

// Helper function to derive table from type and category
function deriveTable(type, category, subcategory, metadata = {}) {
  // PRIORITY 1: content_type overrides all other routing (metadata-driven)
  if (metadata.content_type) {
    switch (metadata.content_type) {
      case 'accommodation_unit':
        return 'accommodation_units'
      case 'policy':
      case 'house_rule':
        return 'policies'
      case 'guest_info':
      case 'guest_manual':
        return 'guest_information'
      case 'amenity':
        return 'unit_amenities'
      case 'pricing':
        return 'pricing_rules'
      case 'property_info':
        return 'properties'
      case 'property_detail':
        return 'property_details'
      case 'client_info':
        return 'client_info'
      case 'content':
        return 'content'
      case 'pricing_summary':
        return 'pricing_summary'
    }
  }

  // PRIORITY 2: MUVA/Tourism content goes to muva_content table
  if (['tourism', 'restaurants', 'beaches', 'activities', 'culture', 'events', 'transport', 'hotels'].includes(type)) {
    return 'muva_content'
  }

  // PRIORITY 3: SIRE content goes to sire_content table
  if (type.startsWith('sire') || category === 'regulatory') {
    return 'sire_content'
  }

  // PRIORITY 4: Category-based mappings for tenant schemas (semantic routing)
  if (category === 'accommodations' && (subcategory === 'apartment' || subcategory === 'room')) {
    return 'accommodation_units'
  } else if (category === 'guest_info' || type === 'guest_manual') {
    return 'guest_information'
  } else if (category === 'policies' || type === 'policies') {
    return 'policies'
  }

  // PRIORITY 5: Generic type mappings (fallback for legacy content)
  if (type === 'listing' && !metadata.content_type) {
    // Generic listing without content_type goes to policies (legacy behavior)
    return 'policies'
  }

  // PRIORITY 6: Fallback - SIRE content by default
  return 'sire_content'
}

// METADATA FRONTMATTER PROCESSING
// AUTO-DETECT TEMPLATE TYPE BASED ON METADATA FIELDS
function detectTemplateType(metadata, filePath) {
  // MUVA template detection - has business-specific fields
  const muvaFields = ['id', 'categoria', 'nombre', 'zona', 'horario', 'precio', 'segmentacion']
  const hasMuvaFields = muvaFields.some(field => metadata.hasOwnProperty(field))

  // Path-based detection for MUVA
  const isMuvaPath = filePath.includes('/muva/') || filePath.includes('listings-enriched')

  // Standard template detection - has documentation fields
  const standardFields = ['title', 'description', 'type']
  const hasStandardFields = standardFields.every(field => metadata.hasOwnProperty(field))

  if (hasMuvaFields || isMuvaPath) {
    console.log(`   🏢 MUVA template detected (business listing)`)
    return 'muva'
  } else if (hasStandardFields) {
    console.log(`   📋 Standard template detected (documentation)`)
    return 'standard'
  } else {
    console.log(`   ⚠️  Unknown template type, using standard as fallback`)
    return 'standard'
  }
}

// NORMALIZE METADATA FOR CONSISTENT PROCESSING
function normalizeMetadata(metadata, templateType) {
  const normalized = { ...metadata }

  if (templateType === 'muva') {
    // Map MUVA fields to standard fields for compatibility
    if (metadata.nombre && !metadata.title) {
      normalized.title = metadata.nombre
    }
    if (metadata.descripcion && !metadata.description) {
      normalized.description = metadata.descripcion
    }
    if (metadata.categoria && !metadata.category) {
      normalized.category = metadata.categoria.toLowerCase()
    }
    if (metadata.palabras_clave && !metadata.keywords) {
      normalized.keywords = metadata.palabras_clave
    }

    // Ensure version is set
    if (!normalized.version) {
      normalized.version = METADATA_VERSION
    }

    // Set default type if missing
    if (!normalized.type) {
      const categoryMap = {
        'actividad': 'activities',
        'restaurante': 'restaurants',
        'hotel': 'hotels',
        'transporte': 'transport',
        'cultura': 'culture',
        'eventos': 'events'
      }
      normalized.type = categoryMap[metadata.categoria?.toLowerCase()] || 'tourism'
    }
  }

  return normalized
}

function loadMetadata(mdFilePath) {
  if (!fs.existsSync(mdFilePath)) {
    throw new Error(`FILE NOT FOUND: ${mdFilePath}`)
  }

  let metadata, content
  try {
    const fileContent = fs.readFileSync(mdFilePath, 'utf-8')
    const { frontmatter, content: cleanContent } = extractFrontmatter(fileContent)

    if (!frontmatter) {
      throw new Error(`MISSING FRONTMATTER: ${mdFilePath}. Every .md file MUST have YAML frontmatter with metadata.`)
    }

    // Auto-detect template type and normalize metadata
    const templateType = detectTemplateType(frontmatter, mdFilePath)
    metadata = normalizeMetadata(frontmatter, templateType)
    content = cleanContent

  } catch (error) {
    throw new Error(`INVALID FRONTMATTER in ${mdFilePath}: ${error.message}`)
  }

  if (!validateMetadata(metadata, mdFilePath)) {
    throw new Error(`INVALID METADATA in ${mdFilePath}`)
  }

  return { metadata, content }
}

// SIMPLIFIED CHUNKING (keeping the good chunking logic)
function chunkDocument(content) {
  // NORMALIZE: Remove incorrect indentation from markdown headers
  // Fix headers like "  ## Title" → "## Title" to ensure chunking works correctly
  content = content.split('\n').map(line => {
    // If line starts with spaces followed by markdown header, trim the spaces
    if (/^\s+(#{1,6})\s/.test(line)) {
      return line.trim()
    }
    return line
  }).join('\n')

  const CHUNK_SIZE = 600  // Reduced from 1000 to ensure semantic sections stay separate
  const OVERLAP = 100

  const separators = [
    '\n\n',
    '\n# ', '\n## ', '\n### ',  // Fixed: Split at major sections (##) before subsections (###)
    '\n**Q:**', '\n**A:**',
    '\n**', '\n- ', '\n\d+\. ',
    '\n', '. ', '? ', '! ', '; ', ': ', ', ', ' '
  ]

  function findWordBoundary(text, targetIndex, searchBackward = true) {
    if (targetIndex <= 0) return 0
    if (targetIndex >= text.length) return text.length

    const direction = searchBackward ? -1 : 1
    let index = targetIndex

    while (index > 0 && index < text.length) {
      const char = text[index]
      if (/\s/.test(char) || /[.!?;:,\n]/.test(char)) {
        return searchBackward ? index + 1 : index
      }
      index += direction
    }

    return targetIndex
  }

  function recursiveSplit(text, separators) {
    if (text.length <= CHUNK_SIZE) {
      return [text]
    }

    for (const separator of separators) {
      const isRegexSeparator = separator.includes('\\d')
      let parts

      if (isRegexSeparator) {
        const regex = new RegExp(separator, 'g')
        const matches = [...text.matchAll(regex)]
        if (matches.length === 0) continue

        parts = []
        let lastIndex = 0
        matches.forEach(match => {
          parts.push(text.slice(lastIndex, match.index))
          parts.push(match[0])
          lastIndex = match.index + match[0].length
        })
        parts.push(text.slice(lastIndex))
        parts = parts.filter(part => part.length > 0)
      } else {
        if (!text.includes(separator)) continue
        parts = text.split(separator)
      }

      const chunks = []
      let currentChunk = ''

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i] + (i < parts.length - 1 ? separator : '')

        // SPECIAL HANDLING: Force split at major section headers (##) to keep semantic sections separate
        const isMajorSectionSeparator = separator === '\n## ' && currentChunk.length > 0
        const wouldExceedSize = currentChunk.length + part.length > CHUNK_SIZE

        if ((wouldExceedSize || isMajorSectionSeparator) && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          const overlapStart = Math.max(0, currentChunk.length - OVERLAP)
          const overlapStartSafe = findWordBoundary(currentChunk, overlapStart, false)
          currentChunk = currentChunk.slice(overlapStartSafe) + part
        } else {
          currentChunk += part
        }
      }

      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }

      return chunks
    }

    // Fallback
    const chunks = []
    let currentPos = 0

    while (currentPos < text.length) {
      let endPos = currentPos + CHUNK_SIZE
      if (endPos >= text.length) {
        const lastChunk = text.slice(currentPos).trim()
        if (lastChunk.length > 0) {
          chunks.push(lastChunk)
        }
        break
      }

      endPos = findWordBoundary(text, endPos, true)
      const chunk = text.slice(currentPos, endPos).trim()
      if (chunk.length > 0) {
        chunks.push(chunk)
      }

      const overlapStart = Math.max(currentPos, endPos - OVERLAP)
      currentPos = findWordBoundary(text, overlapStart, false)
    }

    return chunks
  }

  return recursiveSplit(content, separators)
    .filter(chunk => chunk.length >= 50)
}

// MATRYOSHKA EMBEDDING GENERATION
async function generateOptimalEmbeddings(text, tableName) {
  const strategy = DIMENSION_STRATEGY[tableName]
  if (!strategy) {
    // Fallback to full embedding for unknown tables
    console.log(`   ⚠️  Unknown table ${tableName}, using full 3072 dimensions`)
    return await generateEmbedding(text, 3072)
  }

  const embeddings = {}

  // Generate fast embedding (1024 dims) if needed
  if (strategy.fast) {
    console.log(`   🚀 Generating fast embedding (${strategy.fast} dims)...`)
    embeddings.fast = await generateEmbedding(text, strategy.fast)
  }

  // Generate balanced embedding (1536 dims) if needed
  if (strategy.balanced) {
    console.log(`   ⚖️  Generating balanced embedding (${strategy.balanced} dims)...`)
    embeddings.balanced = await generateEmbedding(text, strategy.balanced)
  }

  // Always generate full embedding for fallback
  console.log(`   🎯 Generating full embedding (${strategy.full || 3072} dims)...`)
  embeddings.full = await generateEmbedding(text, strategy.full || 3072)

  return embeddings
}

async function generateEmbedding(text, dimensions = 3072) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: dimensions,
    encoding_format: 'float',
  })
  return response.data[0].embedding
}

// AUTOMATIC DATA EXTRACTION FOR ACCOMMODATION UNITS
function extractAccommodationData(content, metadata) {
  const extracted = {}

  // Extract capacity
  const capacityMatches = [
    content.match(/hasta (\d+) personas/i),
    content.match(/capacidad.*?(\d+) personas/i),
    content.match(/(\d+) personas/i),
    metadata.description?.match(/capacidad.*?(\d+) personas/i)
  ].filter(Boolean)

  if (capacityMatches.length > 0) {
    extracted.capacity = parseInt(capacityMatches[0][1])
  }

  // ENHANCED: Extract floor_number with HTML comment and descriptive text support
  // Pattern to capture text BEFORE the comment (e.g., "- **Número de piso**: Planta principal <!-- EXTRAE: floor_number -->")
  const floorCommentMatch = content.match(/Número de piso\*\*:\s*(.*?)\s*<!--\s*EXTRAE:\s*floor_number\s*-->/i)
  if (floorCommentMatch) {
    const floorText = floorCommentMatch[1].trim()
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\[|\]/g, '') // Remove brackets
      .trim().toLowerCase()

    // Map descriptive text to numbers
    const floorMap = {
      'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4, 'quinto': 5,
      'planta baja': 0, 'planta principal': 1, 'ground floor': 0, 'main floor': 1,
      'piso 1': 1, 'piso 2': 2, 'piso 3': 3, 'piso 4': 4, 'piso 5': 5
    }

    extracted.floor_number = floorMap[floorText] !== undefined ? floorMap[floorText] : floorText
  } else {
    // Fallback to traditional patterns
    const floorMatches = [
      content.match(/(primer|segundo|tercer|cuarto|quinto) piso/i),
      content.match(/piso (\d+)/i),
      content.match(/(planta baja|planta principal)/i),
      metadata.description?.match(/(primer|segundo|tercer|cuarto|quinto) piso/i)
    ].filter(Boolean)

    if (floorMatches.length > 0) {
      const floorText = floorMatches[0][1].toLowerCase()
      const floorMap = {
        'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4, 'quinto': 5,
        'planta baja': 0, 'planta principal': 1
      }
      extracted.floor_number = floorMap[floorText] || parseInt(floorText) || null
    }
  }

  // Extract base_price_cop (temporada baja / lowest price)
  // Handle both formats: $240,000 COP and $215.000 COP
  const priceMatches = content.match(/\$?(\d{1,3}[,\.]\d{3})\s*COP/gi) || []
  if (priceMatches.length > 0) {
    // Extract all prices and filter out small amounts (like differentials)
    const prices = priceMatches.map(match => {
      // Remove everything except digits to get clean number
      const cleanPrice = match.replace(/[^\d]/g, '')
      return parseInt(cleanPrice)
    }).filter(price => price > 100000) // Only prices over 100k COP (real room rates)

    if (prices.length > 0) {
      extracted.base_price_cop = Math.min(...prices)
    }
  }

  console.log(`   📊 Extracted data: capacity=${extracted.capacity}, floor=${extracted.floor_number}, price=${extracted.base_price_cop}`)
  return extracted
}

// EXPLICIT INSERTION BASED ON METADATA
async function insertEmbedding(chunk, chunkIndex, totalChunks, metadata, filename, fullContent, unitMap) {
  const destination = getDestination(metadata)

  console.log(`   📊 Inserting into ${destination.schema}.${destination.table}`)

  // Generate optimal embeddings based on table strategy
  const embeddings = await generateOptimalEmbeddings(chunk, destination.table)

  // Use full embedding for main column (always 3072 dims for compatibility)
  const primaryEmbedding = embeddings.full

  // Build base insert object
  let insertData = {
    content: chunk,
    // 🔧 CRITICAL FIX: Direct arrays for pgvector (hotels schema uses 'vector' type)
    embedding: primaryEmbedding,
    chunk_index: chunkIndex,
    total_chunks: totalChunks,
    source_file: filename,
    document_type: destination.documentType,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Add multi-tier embedding columns based on strategy
  const strategy = DIMENSION_STRATEGY[destination.table]
  if (strategy?.fast) {
    // 🔧 CRITICAL FIX: Direct arrays for pgvector (all schemas use 'vector' type)
    insertData.embedding_fast = embeddings.fast
  }
  if (strategy?.balanced) {
    // 🔧 CRITICAL FIX: Direct arrays for pgvector (all schemas use 'vector' type)
    insertData.embedding_balanced = embeddings.balanced
  }
  // Full embedding always stored in main 'embedding' column

  // Add metadata-specific fields based on destination table
  if (destination.table === 'accommodation_units') {
    // 🔄 UNIFIED CHUNKING: Process chunks for accommodation_units like other tables
    // Map to actual accommodation_units columns
    insertData.name = metadata.title
    insertData.accommodation_type_id = 'a01f9def-6166-4ad5-ae6c-94c2c1c0b74d'
    insertData.description = chunk
    insertData.status = "active"
    insertData.hotel_id = await getHotelIdByTenantId(metadata.tenant_id) // Dynamic lookup
    // Add required fields with default values
    insertData.capacity = metadata.accommodation?.capacity || metadata.capacity || {"adults": 2, "children": 0, "total": 2}
    
    // Use consistent unit_number generated at document level
    insertData.unit_number = metadata.consistent_unit_number
    // 🔒 SECURITY: Require explicit tenant_id - no fallbacks to prevent data contamination
    if (!metadata.tenant_id) {
      throw new Error(`❌ SECURITY: tenant_id is required for accommodation_units. File: ${metadata.source_file || 'unknown'}`)
    }
    insertData.tenant_id = metadata.tenant_id
  } else if (destination.table === 'guest_information') {
    // 🔒 SECURITY: Require explicit tenant_id for guest_information
    if (!metadata.tenant_id) {
      throw new Error(`❌ SECURITY: tenant_id is required for guest_information. File: ${metadata.source_file || 'unknown'}`)
    }

    // Guest information data - Support both formats
    insertData = {
      info_type: destination.sourceType,
      info_title: metadata.document?.title || metadata.title,
      info_content: chunk,
      embedding: `[${primaryEmbedding.join(',')}]`,
      embedding_balanced: `[${embeddings.balanced.join(',')}]`,
      property_id: null, // Legacy column - system uses tenant_id for filtering
      is_active: true,
      tenant_id: metadata.tenant_id
    }
  } else if (destination.table === 'policies') {
    // 🔒 SECURITY: Require explicit tenant_id for policies
    if (!metadata.tenant_id) {
      throw new Error(`❌ SECURITY: tenant_id is required for policies. File: ${metadata.source_file || 'unknown'}`)
    }

    // Hotel policies data - Support both formats
    insertData = {
      policy_type: destination.sourceType,
      policy_title: metadata.document?.title || metadata.title,
      policy_content: chunk,
      embedding: `[${primaryEmbedding.join(',')}]`,
      embedding_fast: `[${embeddings.fast.join(',')}]`,
      property_id: null, // Legacy column - system uses tenant_id for filtering
      is_active: true,
      tenant_id: metadata.tenant_id
    }
  } else if (destination.table === 'content') {
    // 🔒 SECURITY: Require explicit tenant_id for content
    if (!metadata.tenant_id) {
      throw new Error(`❌ SECURITY: tenant_id is required for content. File: ${metadata.source_file || 'unknown'}`)
    }

    // 🎯 PRESERVE MULTI-TIER EMBEDDINGS: Keep only compatible fields for hotels.content
    insertData = {
      content: chunk,
      embedding: `[${primaryEmbedding.join(',')}]`,
      source_type: destination.sourceType,
      source_id: crypto.randomUUID ? crypto.randomUUID() : require('crypto').randomUUID(),
      tenant_id: metadata.tenant_id,
      metadata: {
        document_title: metadata.document?.title || metadata.title,
        document_category: metadata.document?.category || metadata.category,
        document_subcategory: metadata.document?.subcategory || metadata.subcategory,
        business_info: metadata.listing_specific || null,
        chunk_index: chunkIndex,
        total_chunks: totalChunks,
        source_file: filename
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // 🔧 FIX: Preserve multi-tier embeddings correctly from embeddings object
      ...(embeddings.balanced ? { embedding_balanced: `[${embeddings.balanced.join(',')}]` } : {}),
      ...(embeddings.fast ? { embedding_fast: `[${embeddings.fast.join(',')}]` } : {})
    }
  } else {
    // Global tables (sire_content, muva_content) - Support both formats
    insertData.title = metadata.document?.title || metadata.title
    insertData.description = metadata.document?.description || metadata.description || null
    insertData.category = metadata.document?.category || metadata.category || destination.documentType
    insertData.subcategory = metadata.document?.subcategory || metadata.subcategory || null
    insertData.status = metadata.accommodation?.status || metadata.status || 'active'
    insertData.version = metadata.document?.version || metadata.version || '1.0'
    insertData.tags = metadata.document?.tags || metadata.tags || null
    insertData.keywords = metadata.document?.keywords || metadata.keywords || null
    insertData.language = metadata.document?.language || metadata.language || 'es'

    // Note: created_at and updated_at are handled automatically by Supabase
    // last_updated from templates is mapped to updated_at automatically

    // MUVA-specific metadata for muva_content table
    if (destination.table === 'muva_content') {
      // Check if document has MUVA-specific fields (business metadata from YAML)
      const businessMetadata = metadata.business || {}
      const muvaFields = ['zona', 'horario', 'precio', 'contacto', 'telefono', 'website', 'actividades_disponibles', 'caracteristicas_zona', 'landmarks_cercanos', 'tipos_negocio_zona', 'segmentacion']
      const hasMuvaFields = muvaFields.some(field => metadata.hasOwnProperty(field) || businessMetadata.hasOwnProperty(field))

      if (hasMuvaFields) {
        console.log(`   🏢 Adding MUVA business metadata as structured JSONB`)

        // Build business_info JSONB object from business section and root level
        const businessInfo = {}

        // Business operation details (prefer business.* over root level)
        if (businessMetadata.zona || metadata.zona) businessInfo.zona = businessMetadata.zona || metadata.zona
        if (businessMetadata.subzona || metadata.subzona) businessInfo.subzona = businessMetadata.subzona || metadata.subzona
        if (businessMetadata.horario || metadata.horario) businessInfo.horario = businessMetadata.horario || metadata.horario
        if (businessMetadata.precio || metadata.precio) businessInfo.precio = businessMetadata.precio || metadata.precio
        if (businessMetadata.categoria || metadata.categoria) businessInfo.categoria = businessMetadata.categoria || metadata.categoria

        // Contact information
        if (businessMetadata.contacto || metadata.contacto) businessInfo.contacto = businessMetadata.contacto || metadata.contacto
        if (businessMetadata.telefono || metadata.telefono) businessInfo.telefono = businessMetadata.telefono || metadata.telefono
        if (businessMetadata.website || metadata.website) businessInfo.website = businessMetadata.website || metadata.website

        // Location and zone details
        if (metadata.proximidad_aeropuerto) businessInfo.proximidad_aeropuerto = metadata.proximidad_aeropuerto
        if (metadata.zona_tipo) businessInfo.zona_tipo = metadata.zona_tipo
        if (businessMetadata.caracteristicas_zona || metadata.caracteristicas_zona) {
          businessInfo.caracteristicas_zona = businessMetadata.caracteristicas_zona || metadata.caracteristicas_zona
        }
        if (businessMetadata.landmarks_cercanos || metadata.landmarks_cercanos) {
          businessInfo.landmarks_cercanos = businessMetadata.landmarks_cercanos || metadata.landmarks_cercanos
        }
        if (metadata.tipos_negocio_zona) businessInfo.tipos_negocio_zona = metadata.tipos_negocio_zona

        // Tourism-specific fields
        if (businessMetadata.actividades_disponibles || metadata.actividades_disponibles) {
          businessInfo.actividades_disponibles = businessMetadata.actividades_disponibles || metadata.actividades_disponibles
        }
        if (businessMetadata.segmentacion || metadata.segmentacion) {
          businessInfo.segmentacion = businessMetadata.segmentacion || metadata.segmentacion
        }

        // Store as JSONB in business_info column
        if (Object.keys(businessInfo).length > 0) {
          insertData.business_info = businessInfo

          // Also extend keywords for search optimization
          const muvaKeywords = []
          if (businessInfo.zona) muvaKeywords.push(businessInfo.zona)
          if (businessInfo.actividades_disponibles) muvaKeywords.push(...businessInfo.actividades_disponibles)
          if (businessInfo.segmentacion) muvaKeywords.push(...businessInfo.segmentacion)

          // Merge with existing keywords
          const existingKeywords = insertData.keywords || []
          insertData.keywords = [...existingKeywords, ...muvaKeywords].filter(Boolean)

          console.log(`   ✅ Business info structured: zona=${businessInfo.zona}, precio=${businessInfo.precio ? 'yes' : 'no'}, telefono=${businessInfo.telefono ? 'yes' : 'no'}`)
        }
      }
    }

    insertData.embedding_model = 'text-embedding-3-large'
  }

  // 🔍 DEBUG: Pre-insertion logging
  console.log(`   📝 PRE-INSERTION: Chunk ${chunkIndex}/${totalChunks}`)
  console.log(`     Content length: ${chunk.length}`)
  console.log(`     Content preview: "${chunk.substring(0, 50)}..."`)
  console.log(`     Table: ${destination.schema}.${destination.table}`)
  console.log(`     Has embeddings - balanced: ${!!embeddings.balanced}, fast: ${!!embeddings.fast}`)

  // Use direct Supabase client for insertions
  let insertResult

  try {
    if (destination.schema === 'public') {
      // 🔧 Public schema - Use Supabase client (works great for MUVA)
      insertResult = await supabase
        .from(destination.table)
        .insert(insertData)
    } else {
      // 🔧 Custom schemas - Use SQL manual with pgvector array formatting
      const columns = Object.keys(insertData).join(', ')
      const values = Object.values(insertData).map(val => {
        if (val === null || val === undefined) return 'NULL'
        if (typeof val === 'string') {
          // Escape string content
          const escaped = val
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/\$/g, '\\$')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
          return `'${escaped}'`
        }
        if (Array.isArray(val)) {
          // 🔧 CRITICAL FIX: Format arrays as pgvector literals
          return `'[${val.join(',')}]'`
        }
        if (typeof val === 'object') {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`
        }
        return val
      }).join(', ')

      const sqlQuery = `INSERT INTO ${destination.schema}.${destination.table} (${columns}) VALUES (${values})`

      console.log(`   🔍 DEBUG SQL (pgvector format):`, sqlQuery.substring(0, 200) + '...')
      const { data, error } = await supabase.rpc('exec_sql', { sql: sqlQuery })

      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`)
      } else if (data && !data.success) {
        throw new Error(`SQL execution failed: ${data.error || 'Unknown error'} (Code: ${data.error_code || 'N/A'})`)
      } else {
        insertResult = { data, error: null }
      }
    }

    console.log(`     ✅ Database insertion successful`)
    console.log(`     🎯 POST-INSERTION SUCCESS: Chunk ${chunkIndex} confirmed in DB`)

    if (insertResult.error) {
      throw new Error(`Insert failed: ${insertResult.error.message}`)
    }
  } catch (dbError) {
    console.error(`   🔍 DEBUG: Database insertion details:`)
    console.error(`     Table: ${destination.schema}.${destination.table}`)
    console.error(`     Content length: ${chunk.length}`)
    console.error(`     Has embedding_balanced: ${!!embeddings.balanced}`)
    console.error(`     Has embedding_fast: ${!!embeddings.fast}`)
    console.error(`     Insert data keys:`, Object.keys(insertData))
    throw new Error(`Database insertion failed: ${dbError.message}`)
  }
}

// ===================================================================
// ACCOMMODATION SYSTEM PROCESSING FUNCTIONS
// ===================================================================

// Process accommodation units with multi-tier Matryoshka embeddings
async function processAccommodationUnits(accommodationData, hotelId, tenantId) {
  console.log(`\n🏨 Processing accommodation units for hotel ${hotelId}`)

  for (const unit of accommodationData.units || []) {
    console.log(`\n   🏠 Processing unit: ${unit.name}`)

    // Prepare tier-specific content
    const tierContent = prepareAccommodationTierContent(unit, accommodationData)

    // Generate multi-tier embeddings
    const embeddings = await generateOptimalEmbeddings(tierContent.full_description, 'accommodation_units')

    // Insert accommodation unit with embeddings
    const insertData = {
      hotel_id: hotelId,
      name: unit.name,
      unit_number: unit.unit_number,
      description: unit.description,
      short_description: unit.short_description,
      capacity: unit.capacity || {"adults": 2, "children": 0, "total": 2, "base_adults": 2},
      bed_configuration: unit.bed_configuration,
      size_m2: unit.size_m2,
      floor_number: unit.floor_number,
      view_type: unit.view_type,
      images: unit.images || [],

      // MotoPress integration
      motopress_type_id: unit.motopress_type_id,
      motopress_id: unit.motopress_id,

      // Matryoshka content for embeddings
      full_description: tierContent.full_description,
      tourism_features: tierContent.tourism_features,
      booking_policies: tierContent.booking_policies,

      // Matryoshka embeddings
      embedding_fast: embeddings.fast,
      embedding_balanced: embeddings.balanced,

      unique_features: unit.unique_features || [],
      accessibility_features: unit.accessibility_features || [],
      location_details: unit.location_details || {},
      is_featured: unit.is_featured || false,
      display_order: unit.display_order || 0,
      status: unit.status || 'active'
    }

    try {
      const { error } = await supabase
        .from('accommodation_units')
        .insert(insertData)

      if (error) {
        console.error(`   ❌ Failed to insert accommodation unit ${unit.name}:`, error.message)
      } else {
        console.log(`   ✅ Successfully inserted accommodation unit: ${unit.name}`)
      }
    } catch (err) {
      console.error(`   ❌ Error inserting accommodation unit ${unit.name}:`, err.message)
    }
  }
}

// Process hotels with multi-tier Matryoshka embeddings
async function processHotels(hotelData, tenantId) {
  console.log(`\n🏨 Processing hotels for tenant ${tenantId}`)

  for (const hotel of hotelData.hotels || []) {
    console.log(`\n   🏨 Processing hotel: ${hotel.name}`)

    // Prepare tier-specific content
    const tierContent = prepareHotelTierContent(hotel)

    // Generate multi-tier embeddings
    const embeddings = await generateOptimalEmbeddings(tierContent.full_description, 'hotels')

    // Insert hotel with embeddings
    const insertData = {
      tenant_id: tenantId,
      name: hotel.name,
      description: hotel.description,
      short_description: hotel.short_description,
      address: hotel.address,
      contact_info: hotel.contact_info,
      check_in_time: hotel.check_in_time || '15:00:00',
      check_out_time: hotel.check_out_time || '12:00:00',
      policies: hotel.policies || {},
      hotel_amenities: hotel.hotel_amenities || [],

      // MotoPress integration
      motopress_hotel_id: hotel.motopress_hotel_id,

      // Matryoshka content for embeddings
      full_description: tierContent.full_description,
      tourism_summary: tierContent.tourism_summary,
      policies_summary: tierContent.policies_summary,

      // Matryoshka embeddings
      embedding_fast: embeddings.fast,
      embedding_balanced: embeddings.balanced,

      images: hotel.images || [],
      status: hotel.status || 'active'
    }

    try {
      const { data, error } = await supabase
        .from('hotels')
        .insert(insertData)
        .select()

      if (error) {
        console.error(`   ❌ Failed to insert hotel ${hotel.name}:`, error.message)
        return null
      } else {
        console.log(`   ✅ Successfully inserted hotel: ${hotel.name}`)
        return data[0]
      }
    } catch (err) {
      console.error(`   ❌ Error inserting hotel ${hotel.name}:`, err.message)
      return null
    }
  }
}

// Prepare tier-specific content for accommodation units
function prepareAccommodationTierContent(unit, accommodationData) {
  // Tier 1 (Tourism features - 1024d): Amenidades, vista, ubicación turística
  const tourismFeatures = [
    unit.view_type ? `Vista: ${unit.view_type}` : '',
    unit.unique_features ? `Características únicas: ${unit.unique_features.join(', ')}` : '',
    unit.location_details ? `Ubicación: ${JSON.stringify(unit.location_details)}` : '',
    accommodationData.amenities ? `Amenidades: ${accommodationData.amenities.join(', ')}` : ''
  ].filter(Boolean).join('\n')

  // Tier 2 (Booking policies - 1536d): Políticas, check-in/out, reglas de reserva
  const bookingPolicies = [
    unit.capacity ? `Capacidad: ${unit.capacity.adults} adultos, ${unit.capacity.children} niños` : '',
    unit.bed_configuration ? `Configuración cama: ${unit.bed_configuration.bed_type}` : '',
    accommodationData.policies ? `Políticas: ${accommodationData.policies}` : '',
    accommodationData.check_in_policies ? `Check-in: ${accommodationData.check_in_policies}` : ''
  ].filter(Boolean).join('\n')

  // Tier 3 (Full description): Descripción HTML completa con todos los detalles
  const fullDescription = [
    unit.name,
    unit.description || '',
    unit.short_description || '',
    tourismFeatures,
    bookingPolicies,
    unit.accessibility_features ? `Accesibilidad: ${unit.accessibility_features.join(', ')}` : ''
  ].filter(Boolean).join('\n\n')

  return {
    tourism_features: tourismFeatures,
    booking_policies: bookingPolicies,
    full_description: fullDescription
  }
}

// Prepare tier-specific content for hotels
function prepareHotelTierContent(hotel) {
  // Tier 1 (Tourism summary - 1024d): Amenidades, ubicación, turismo
  const tourismSummary = [
    hotel.address ? `Ubicación: ${JSON.stringify(hotel.address)}` : '',
    hotel.hotel_amenities ? `Amenidades del hotel: ${hotel.hotel_amenities.join(', ')}` : '',
    hotel.short_description || ''
  ].filter(Boolean).join('\n')

  // Tier 2 (Policies summary - 1536d): Políticas, check-in/out, reglas
  const policiesSummary = [
    hotel.check_in_time ? `Check-in: ${hotel.check_in_time}` : '',
    hotel.check_out_time ? `Check-out: ${hotel.check_out_time}` : '',
    hotel.policies ? `Políticas: ${JSON.stringify(hotel.policies)}` : '',
    hotel.contact_info ? `Contacto: ${JSON.stringify(hotel.contact_info)}` : ''
  ].filter(Boolean).join('\n')

  // Tier 3 (Full description): Descripción completa con todos los detalles
  const fullDescription = [
    hotel.name,
    hotel.description || '',
    tourismSummary,
    policiesSummary
  ].filter(Boolean).join('\n\n')

  return {
    tourism_summary: tourismSummary,
    policies_summary: policiesSummary,
    full_description: fullDescription
  }
}

// MAIN PROCESSING FUNCTION
async function processDocument(mdFilePath, unitMap = new Map()) {
  const filename = path.basename(mdFilePath)
  console.log(`\n📄 Processing: ${filename}`)
  console.log(`   Path: ${path.relative(projectRoot, mdFilePath)}`)

  // STEP 1: Load and validate metadata + content from frontmatter (REQUIRED)
  let metadata, content
  try {
    const result = loadMetadata(mdFilePath)
    metadata = result.metadata
    content = result.content
    console.log(`   ✅ Metadata loaded and validated from frontmatter`)
    console.log(`   📋 Type: ${metadata.type}`)
    const destination = getDestination(metadata)
    console.log(`   🎯 Destination: ${destination.schema}.${destination.table}`)

    // Generate consistent unit_number for this document (only for accommodation_units)
    if (destination.table === 'accommodation_units') {
      // Create a short, consistent identifier (max 50 chars)
      const baseTitle = (metadata.document?.title || metadata.title || 'unit').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      const shortTitle = baseTitle.substring(0, 20) // Keep first 20 chars
      const timestamp = Date.now().toString().slice(-10) // Last 10 digits
      metadata.consistent_unit_number = metadata.unit_number || `${shortTitle}_${timestamp}`
    }
  } catch (error) {
    console.error(`   ❌ ${error.message}`)
    throw error
  }

  // STEP 2: Chunk ALL documents for optimal embedding quality
  const destination = getDestination(metadata)
  const chunks = chunkDocument(content)
  console.log(`   📋 Document split into ${chunks.length} chunks (CHUNK_SIZE: 1000, OVERLAP: 100)`)
  console.log(`   🔍 DEBUG: Chunk lengths: [${chunks.map((c,i) => `${i}:${c.length}`).join(', ')}]`)

  // STEP 3: Process each chunk
  const results = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log(`   ⚙️  Processing chunk ${i + 1}/${chunks.length}...`)

    try {
      if (destination.table === 'accommodation_units') {
        // Skip chunk embedding for accommodation_units - only process at document level
        console.log(`   ⏭️  Skipping chunk ${i + 1} for accommodation_units (processed at document level)`)
      } else {
        await insertEmbedding(chunk, i, chunks.length, metadata, filename, content, unitMap)
        console.log(`   ✅ Chunk ${i + 1} inserted successfully`)
        results.push({ success: true }) // 🔧 FIX: Track successful chunk insertions
      }
    } catch (error) {
      console.error(`   ❌ Error processing chunk ${i + 1}/${chunks.length}: ${error.message}`)
      console.error(`   📋 Chunk content preview: "${chunk.substring(0, 100)}..."`)
      console.error(`   🔍 Destination: ${destination.schema}.${destination.table}`)
      console.error(`   📝 Full error:`, error.stack || error)
      results.push({ success: false, error: error.message, chunkIndex: i, chunkPreview: chunk.substring(0, 100) })
    }
  }

  // STEP 4: Special handling for accommodation_units
  const finalDestination = getDestination(metadata)
  if (finalDestination.table === 'accommodation_units') {
    console.log(`   🏨 Processing accommodation unit as single embedding...`)

    // Get the id from unitMap
    const unitName = metadata.document?.title || metadata.title
    const unitId = unitMap.get(unitName)

    if (unitId) {
      try {
        // Extract rich data from template content - ENHANCED WITH ALL FIELDS
        console.log(`   💰 Extracting pricing data from template...`)
        const pricingData = extractPricingFromTemplate(content)
        console.log(`   🎯 Extracted pricing:`, pricingData)

        console.log(`   🏠 Extracting amenities from template...`)
        const amenitiesList = extractAmenitiesFromTemplate(content)
        console.log(`   🎯 Extracted amenities:`, amenitiesList)

        console.log(`   📋 Extracting booking policies from template...`)
        const bookingPolicies = extractBookingPoliciesFromTemplate(content)

        // ENHANCED EXTRACTIONS - ALL ACCOMMODATION_UNITS FIELDS
        console.log(`   👥 Extracting capacity information from template...`)
        const capacityData = extractCapacityFromTemplate(content)
        console.log(`   🎯 Extracted capacity:`, capacityData)

        console.log(`   📏 Extracting size information from template...`)
        const sizeData = extractSizeFromTemplate(content)
        console.log(`   🎯 Extracted size_m2:`, sizeData)

        console.log(`   🖼️  Extracting images information from template...`)
        const imagesData = extractImagesFromTemplate(content)
        console.log(`   🎯 Extracted images:`, imagesData)

        console.log(`   ⭐ Extracting features and view type from template...`)
        const featuresData = extractFeaturesFromTemplate(content)
        console.log(`   🎯 Extracted features:`, featuresData)

        console.log(`   📍 Extracting location details from template...`)
        const locationData = extractLocationDetailsFromTemplate(content)
        console.log(`   🎯 Extracted location:`, locationData)

        console.log(`   📞 Extracting contact information from template...`)
        const contactData = extractContactInfoFromTemplate(content)
        console.log(`   🎯 Extracted contact:`, contactData)

        console.log(`   🌴 Extracting tourism features from template...`)
        const tourismData = extractTourismFeaturesFromTemplate(content)
        console.log(`   🎯 Extracted tourism:`, tourismData)

        console.log(`   📝 Extracting descriptions from template...`)
        const descriptionData = extractDescriptionFromTemplate(content)
        console.log(`   🎯 Extracted descriptions:`, descriptionData)

        console.log(`   📊 Extracting status from template and frontmatter...`)
        const statusData = extractStatusFromTemplate(content, metadata)
        console.log(`   🎯 Extracted status:`, statusData)

        console.log(`   ⚙️  Extracting display configuration from template...`)
        const displayConfigData = extractDisplayConfigFromTemplate(content, metadata)
        console.log(`   🎯 Extracted display config:`, displayConfigData)

        console.log(`   🛠️  Extracting unit amenities text from template...`)
        const unitAmenitiesText = extractUnitAmenitiesFromTemplate(content)
        console.log(`   🎯 Extracted unit amenities text:`, unitAmenitiesText)

        // Generate optimal embeddings for the full document content
        const documentEmbeddings = await generateOptimalEmbeddings(content, finalDestination.table)
        const fullEmbedding = documentEmbeddings.full

        // Build update statement with multi-tier embeddings
        let embeddingUpdates = `embedding_fast = '[${documentEmbeddings.fast.join(',')}]'`
        const docStrategy = DIMENSION_STRATEGY[finalDestination.table]
        if (docStrategy?.fast) {
          // Fast embedding already set above
        }
        if (docStrategy?.balanced) {
          embeddingUpdates += `, embedding_balanced = '[${documentEmbeddings.balanced.join(',')}]'`
        }

        // Update the existing unit with the embedding
        // Use consistent unit_number generated at document level
        const unitCode = metadata.consistent_unit_number

        // Build additional update fields
        let additionalUpdates = []

        // Add pricing data - METADATA FIRST PRIORITY
        const finalBasePriceLow = metadata.accommodation?.pricing?.base_price_low_season || pricingData.base_price_low_season
        if (finalBasePriceLow) {
          additionalUpdates.push(`base_price_low_season = ${finalBasePriceLow}`)
          console.log(`✅ Using ${metadata.accommodation?.pricing?.base_price_low_season ? 'metadata' : 'extracted'} value for base_price_low_season: ${finalBasePriceLow}`)
        }
        const finalBasePriceHigh = metadata.accommodation?.pricing?.base_price_high_season || pricingData.base_price_high_season
        if (finalBasePriceHigh) {
          additionalUpdates.push(`base_price_high_season = ${finalBasePriceHigh}`)
          console.log(`✅ Using ${metadata.accommodation?.pricing?.base_price_high_season ? 'metadata' : 'extracted'} value for base_price_high_season: ${finalBasePriceHigh}`)
        }
        const finalPricePerPersonLow = metadata.accommodation?.pricing?.price_per_person_low || pricingData.price_per_person_low
        if (finalPricePerPersonLow) {
          additionalUpdates.push(`price_per_person_low = ${finalPricePerPersonLow}`)
          console.log(`✅ Using ${metadata.accommodation?.pricing?.price_per_person_low ? 'metadata' : 'extracted'} value for price_per_person_low: ${finalPricePerPersonLow}`)
        }
        const finalPricePerPersonHigh = metadata.accommodation?.pricing?.price_per_person_high || pricingData.price_per_person_high
        if (finalPricePerPersonHigh) {
          additionalUpdates.push(`price_per_person_high = ${finalPricePerPersonHigh}`)
          console.log(`✅ Using ${metadata.accommodation?.pricing?.price_per_person_high ? 'metadata' : 'extracted'} value for price_per_person_high: ${finalPricePerPersonHigh}`)
        }

        // Add amenities - METADATA FIRST PRIORITY (robust structure handling)
        let finalAmenities = null

        // 1. Check for correct nested structure (template format)
        if (metadata.accommodation?.amenities?.features && Array.isArray(metadata.accommodation.amenities.features)) {
          finalAmenities = metadata.accommodation.amenities
          console.log(`✅ Using metadata nested amenities structure: ${finalAmenities.features.length} features + attributes`)
        }
        // 2. Check for flattened YAML structure (parsing quirk workaround)
        else if (metadata.accommodation?.features && Array.isArray(metadata.accommodation.features)) {
          finalAmenities = {
            features: metadata.accommodation.features,
            attributes: {
              unit_type_detail: metadata.accommodation.unit_type_detail,
              category: metadata.accommodation.category,
              special_features: metadata.accommodation.special_features
            }
          }
          console.log(`✅ Using metadata flattened amenities structure: ${finalAmenities.features.length} features + attributes`)
        }
        // 3. Legacy array format
        else if (metadata.accommodation?.amenities && Array.isArray(metadata.accommodation.amenities)) {
          finalAmenities = metadata.accommodation.amenities
          console.log(`✅ Using metadata legacy amenities array: ${finalAmenities.length} items`)
        }
        // 4. Fallback to extracted
        else if (amenitiesList.length > 0) {
          finalAmenities = amenitiesList
          console.log(`✅ Using extracted amenities: ${finalAmenities.length} items`)
        }

        if (finalAmenities) {
          const amenitiesJson = JSON.stringify(finalAmenities).replace(/'/g, "''")
          additionalUpdates.push(`amenities_list = '${amenitiesJson}'::jsonb`)
        }

        // Add booking policies if extracted
        if (bookingPolicies) {
          // Handle both array and string formats
          if (Array.isArray(bookingPolicies)) {
            const policiesJson = JSON.stringify(bookingPolicies).replace(/'/g, "''")
            additionalUpdates.push(`booking_policies = '${policiesJson}'::jsonb`)
          } else {
            const policiesText = bookingPolicies.replace(/'/g, "''")
            additionalUpdates.push(`booking_policies = '${policiesText}'`)
          }
        }

        // NEW FIELD UPDATES - PREVENTING "PRICING BUG" FOR OTHER FIELDS

        // Add capacity data - METADATA FIRST PRIORITY
        const finalCapacity = metadata.accommodation?.capacity || capacityData?.max_capacity
        if (finalCapacity) {
          const capacityJson = JSON.stringify({ max_capacity: finalCapacity }).replace(/'/g, "''")
          additionalUpdates.push(`capacity = '${capacityJson}'::jsonb`)
          console.log(`✅ Using ${metadata.accommodation?.capacity ? 'metadata' : 'extracted'} value for capacity: ${finalCapacity}`)
        }

        const finalBedConfig = metadata.accommodation?.bed_configuration || capacityData?.bed_configuration
        if (finalBedConfig) {
          const bedConfigJson = JSON.stringify(finalBedConfig).replace(/'/g, "''")
          additionalUpdates.push(`bed_configuration = '${bedConfigJson}'::jsonb`)
          console.log(`✅ Using ${metadata.accommodation?.bed_configuration ? 'metadata' : 'extracted'} value for bed_configuration: ${finalBedConfig}`)
        }

        // Add images data - METADATA FIRST PRIORITY
        const finalImages = metadata.accommodation?.images || imagesData
        if (finalImages) {
          const imagesJson = JSON.stringify(finalImages).replace(/'/g, "''")
          additionalUpdates.push(`images = '${imagesJson}'::jsonb`)
          console.log(`✅ Using ${metadata.accommodation?.images ? 'metadata' : 'extracted'} value for images: ${Array.isArray(finalImages) ? finalImages.length : 'object'} items`)
        }

        // Add features data if extracted
        if (featuresData) {
          if (featuresData.unique_features) {
            const uniqueFeaturesJson = JSON.stringify(featuresData.unique_features).replace(/'/g, "''")
            additionalUpdates.push(`unique_features = '${uniqueFeaturesJson}'::jsonb`)
          }
          if (featuresData.accessibility_features) {
            const accessibilityJson = JSON.stringify(featuresData.accessibility_features).replace(/'/g, "''")
            additionalUpdates.push(`accessibility_features = '${accessibilityJson}'::jsonb`)
          }
        }

        // Add location data if extracted
        if (locationData) {
          const locationJson = JSON.stringify(locationData).replace(/'/g, "''")
          additionalUpdates.push(`location_details = '${locationJson}'::jsonb`)
        }

        // Add tourism features if extracted
        if (tourismData) {
          const tourismText = Array.isArray(tourismData) ? tourismData.join(', ') : tourismData
          additionalUpdates.push(`tourism_features = '${tourismText.replace(/'/g, "''")}'`)
        }

        // Add descriptions if extracted
        if (descriptionData) {
          if (descriptionData.short_description) {
            const shortDesc = descriptionData.short_description.replace(/'/g, "''")
            additionalUpdates.push(`short_description = '${shortDesc}'`)
          }
          if (descriptionData.full_description) {
            const fullDesc = descriptionData.full_description.substring(0, 1000).replace(/'/g, "''")
            additionalUpdates.push(`full_description = '${fullDesc}'`)
          }
        }

        // ENHANCED FIELD UPDATES - NEW EXTRACTION FUNCTIONS

        // Add size_m2 - METADATA FIRST PRIORITY (only numeric values, column is INTEGER type)
        const finalSizeM2 = metadata.accommodation?.size_m2 || sizeData
        if (finalSizeM2) {
          // Only insert if it's a number (size_m2 column is INTEGER type)
          if (typeof finalSizeM2 === 'number') {
            additionalUpdates.push(`size_m2 = ${finalSizeM2}`)
            console.log(`✅ Using ${metadata.accommodation?.size_m2 ? 'metadata' : 'extracted'} value for size_m2: ${finalSizeM2}`)
          } else if (typeof finalSizeM2 === 'string') {
            // Try to parse number from string (e.g., "18m²" → 18)
            const numMatch = String(finalSizeM2).match(/(\d+)/)
            if (numMatch) {
              const numValue = parseInt(numMatch[1])
              if (numValue > 0 && numValue < 1000) {
                additionalUpdates.push(`size_m2 = ${numValue}`)
                console.log(`✅ Parsed size_m2 from "${finalSizeM2}" → ${numValue}`)
              }
            } else {
              console.log(`⚠️  Skipping size_m2 (descriptive text, no numeric value): ${finalSizeM2}`)
            }
          }
        }

        // Add view_type if extracted from features
        if (featuresData && featuresData.view_type) {
          const viewTypeText = featuresData.view_type.replace(/'/g, "''")
          additionalUpdates.push(`view_type = '${viewTypeText}'`)
        }

        // Add status - METADATA FIRST PRIORITY
        const finalStatus = metadata.accommodation?.status || statusData
        if (finalStatus) {
          const statusText = finalStatus.replace(/'/g, "''")
          additionalUpdates.push(`status = '${statusText}'`)
          console.log(`✅ Using ${metadata.accommodation?.status ? 'metadata' : 'extracted'} value for status: ${finalStatus}`)
        }

        // Add display configuration - METADATA FIRST PRIORITY
        const finalIsFeatured = metadata.accommodation?.is_featured !== undefined ? metadata.accommodation.is_featured : displayConfigData?.is_featured
        if (finalIsFeatured !== undefined) {
          additionalUpdates.push(`is_featured = ${finalIsFeatured}`)
          console.log(`✅ Using ${metadata.accommodation?.is_featured !== undefined ? 'metadata' : 'extracted'} value for is_featured: ${finalIsFeatured}`)
        }

        const finalDisplayOrder = metadata.accommodation?.display_order !== undefined ? metadata.accommodation.display_order : displayConfigData?.display_order
        if (finalDisplayOrder !== undefined) {
          additionalUpdates.push(`display_order = ${finalDisplayOrder}`)
          console.log(`✅ Using ${metadata.accommodation?.display_order !== undefined ? 'metadata' : 'extracted'} value for display_order: ${finalDisplayOrder}`)
        }

        // Add floor_number - extract inline since extractedData not in scope
        let finalFloorNumber = metadata.accommodation?.floor_number
        if (finalFloorNumber === undefined) {
          // Extract floor_number inline
          const floorCommentMatch = content.match(/Número de piso\*\*:\s*(.*?)\s*<!--\s*EXTRAE:\s*floor_number\s*-->/i)
          if (floorCommentMatch) {
            const floorText = floorCommentMatch[1].trim().toLowerCase()
            const floorMap = {
              'primer': 1, 'segundo': 2, 'tercer': 3, 'cuarto': 4, 'quinto': 5,
              'planta baja': 0, 'planta principal': 1, 'ground floor': 0, 'main floor': 1
            }
            finalFloorNumber = floorMap[floorText] !== undefined ? floorMap[floorText] : null
          }
        }
        if (finalFloorNumber !== undefined && finalFloorNumber !== null) {
          additionalUpdates.push(`floor_number = ${finalFloorNumber}`)
          console.log(`✅ Using ${metadata.accommodation?.floor_number !== undefined ? 'metadata' : 'extracted'} value for floor_number: ${finalFloorNumber}`)
        }

        // Add unit_amenities text if extracted
        if (unitAmenitiesText) {
          const unitAmenitiesFormatted = unitAmenitiesText.replace(/'/g, "''")
          additionalUpdates.push(`unit_amenities = '${unitAmenitiesFormatted}'`)
        }

        // Combine all updates
        const allUpdates = [embeddingUpdates, ...additionalUpdates].join(', ')

        const updateQuery = `
          UPDATE ${finalDestination.schema}.accommodation_units
          SET ${allUpdates},
              description = '${content.substring(0, 500).replace(/'/g, "''")}...',
              unit_number = '${unitCode}',
              updated_at = NOW()
          WHERE id = '${unitId}';
        `

        const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
          sql: updateQuery
        })

        if (updateError || !updateResult.success) {
          throw new Error(`Failed to update unit embedding: ${updateError?.message || updateResult.error}`)
        }

        console.log(`   ✅ Accommodation unit embedding updated: ${unitName}`)
        results.push({ success: true })
      } catch (error) {
        console.error(`   ❌ Error updating accommodation unit: ${error.message}`)
        results.push({ success: false, error: error.message })
      }
    }
  }

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`📊 Document processing complete: ${successful} successful, ${failed} failed`)

  return {
    filename,
    metadata,
    totalChunks: chunks.length,
    successful,
    failed,
    results
  }
}

// GET FILES TO PROCESS
function getDocumentFiles(args) {
  const files = []

  if (args.includes('--all')) {
    // Find all .md files with YAML frontmatter
    const mdFiles = glob.sync('_assets/**/*.md', { cwd: projectRoot })
    mdFiles.forEach(file => {
      const fullPath = path.join(projectRoot, file)
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8')
        const { frontmatter } = extractFrontmatter(fileContent)
        if (frontmatter) {
          files.push(fullPath)
        } else {
          console.warn(`⚠️  Skipping ${file} - no YAML frontmatter found`)
        }
      } catch (error) {
        console.warn(`⚠️  Skipping ${file} - error reading file: ${error.message}`)
      }
    })
  } else if (args.length > 2) {
    // Specific files/directories provided
    for (let i = 2; i < args.length; i++) {
      const inputPath = args[i]
      const fullPath = path.isAbsolute(inputPath) ? inputPath : path.join(projectRoot, inputPath)

      if (fs.lstatSync(fullPath).isDirectory()) {
        // Process directory
        const mdFiles = glob.sync('**/*.md', { cwd: fullPath })
        mdFiles.forEach(file => {
          const mdPath = path.join(fullPath, file)
          try {
            const fileContent = fs.readFileSync(mdPath, 'utf-8')
            const { frontmatter } = extractFrontmatter(fileContent)
            if (frontmatter) {
              files.push(mdPath)
            } else {
              console.warn(`⚠️  Skipping ${file} - no YAML frontmatter found`)
            }
          } catch (error) {
            console.warn(`⚠️  Skipping ${file} - error reading file: ${error.message}`)
          }
        })
      } else if (fullPath.endsWith('.md')) {
        // Single file - validate frontmatter exists
        try {
          const fileContent = fs.readFileSync(fullPath, 'utf-8')
          const { frontmatter } = extractFrontmatter(fileContent)
          if (frontmatter) {
            files.push(fullPath)
          } else {
            console.error(`❌ FRONTMATTER REQUIRED: ${inputPath}`)
            console.error(`   Every .md file MUST have YAML frontmatter with metadata`)
            console.error(`   Cannot process without frontmatter - this is a strict requirement`)
            throw new Error(`FRONTMATTER MISSING: ${inputPath}`)
          }
        } catch (error) {
          if (error.message.includes('FRONTMATTER MISSING')) {
            throw error
          }
          console.error(`❌ ERROR READING FILE: ${inputPath}`)
          console.error(`   ${error.message}`)
          throw new Error(`FILE READ ERROR: ${inputPath}`)
        }
      }
    }
  } else {
    console.log('❌ No files specified to process')
    console.log('\n📋 METADATA-DRIVEN EMBEDDING SYSTEM')
    console.log('   Every .md file MUST have YAML frontmatter with metadata')
    console.log('\nUsage:')
    console.log('  node scripts/populate-embeddings.js [options] [files/directories...]')
    console.log('\nOptions:')
    console.log('  --all         Process all .md files in _assets/ (with frontmatter)')
    console.log('\nExamples:')
    console.log('  node scripts/populate-embeddings.js _assets/simmerdown/')
    console.log('  node scripts/populate-embeddings.js _assets/sire/document.md')
    console.log('  node scripts/populate-embeddings.js --all')
    console.log('\nFrontmatter Format:')
    console.log('  ---')
    console.log('  version: "1.0"')
    console.log('  type: sire')
    console.log('  destination:')
    console.log('    schema: public')
    console.log('    table: sire_content')
    console.log('  ---')
    return []
  }

  return [...new Set(files)] // Remove duplicates
}

// PRE-PROCESS: CREATE UNIQUE ACCOMMODATION UNITS
async function createUnitsFromFiles(files) {
  const unitMap = new Map() // name -> id

  console.log('🏢 Pre-processing accommodation units...')

  // Extract accommodation unit files and their metadata
  const accommodationFiles = []
  for (const filePath of files) {
    try {
      const result = loadMetadata(filePath)
      const metadata = result.metadata
      const destination = getDestination(metadata)

      if (destination.table === 'accommodation_units') {
        const content = result.content
        // Generate consistent unit_number for pre-processing
        const baseTitle = (metadata.document?.title || metadata.title || 'unit').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        const shortTitle = baseTitle.substring(0, 20) // Keep first 20 chars
        const timestamp = Date.now().toString().slice(-10) // Last 10 digits
        metadata.consistent_unit_number = metadata.unit_number || `${shortTitle}_${timestamp}`

        const extractedData = extractAccommodationData(content, metadata)
        accommodationFiles.push({
          filePath,
          metadata,
          extractedData,
          unitName: metadata.document?.title || metadata.title
        })
      }
    } catch (error) {
      // Skip files that can't be processed
      continue
    }
  }

  // Create unique units
  const uniqueUnits = new Map()
  accommodationFiles.forEach(file => {
    if (!uniqueUnits.has(file.unitName)) {
      uniqueUnits.set(file.unitName, file)
    }
  })

  console.log(`   📋 Found ${uniqueUnits.size} unique accommodation units`)

  // Insert units into database
  for (const [unitName, file] of uniqueUnits) {
    const { metadata, extractedData } = file
    const listing = metadata.listing_specific || {}
    const capacity = extractedData.capacity || listing.capacity || 2

    // 🔒 SECURITY: Dynamic tenant_id to hotel_id lookup (fully multi-tenant)
    let propertyId = null
    if (metadata.tenant_id) {
      try {
        propertyId = await getHotelIdByTenantId(metadata.tenant_id)
      } catch (error) {
        console.warn(`⚠️ ${error.message}`)
      }
    }

    const unitData = {
      hotel_id: propertyId,
      name: unitName,
      accommodation_type_id: 'a01f9def-6166-4ad5-ae6c-94c2c1c0b74d',
      unit_number: metadata.consistent_unit_number,
      capacity: capacity || '{"adults": 2, "children": 0, "total": 2}',
      floor_number: extractedData.floor_number || null,
      base_price_cop: extractedData.base_price_cop || listing.price_low_season || listing.price_low_season_couple || null,
      extra_person_price_cop: capacity > 2 ? 65000 : null,
      is_active: true,
      tenant_id: metadata.tenant_id // 🔒 SECURITY: No fallback - tenant_id must be explicit
    }

    // Insert unit and get id
    const destination = getDestination(metadata)

    // Generate UUID for the id (simpler approach)
    const unitId = crypto.randomUUID()

    // Use raw SQL for custom schemas since .schema() method is limited
    const insertQuery = `
      INSERT INTO ${destination.schema}.accommodation_units (
        id, hotel_id, name, accommodation_type_id, capacity,
        floor_number, status, tenant_id, unit_number
      ) VALUES (
        '${unitId}',
        '${unitData.hotel_id}',
        '${unitData.name.replace(/'/g, "''")}',
        '${unitData.accommodation_type_id}',
        '${JSON.stringify(unitData.capacity || {"adults": 2, "children": 0, "total": 2})}',
        ${unitData.floor_number || "NULL"},
        '${unitData.status}',
        '${unitData.tenant_id}',
        '${unitData.unit_number || ""}'
      );
    `

    console.log(`   🔍 DEBUG INSERT SQL:`, insertQuery.substring(0, 300) + '...')

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: insertQuery
    })

    console.log(`   📊 RPC Response:`, { data, error })

    if (error) {
      console.error(`   ❌ Failed to create unit ${unitName}:`, error.message)
      throw error
    }

    // Handle exec_sql response format - check if it has actual data
    if (data && data.error) {
      throw new Error(`SQL execution failed: ${data.error}`)
    }

    unitMap.set(unitName, unitId)
    console.log(`   ✅ Created unit: ${unitName} (${unitId})`)
  }

  return unitMap
}

// MAIN FUNCTION
async function populateEmbeddings() {
  try {
    console.log('🚀 METADATA-DRIVEN EMBEDDING SYSTEM')
    console.log('   ✅ NO keyword detection')
    console.log('   ✅ NO automatic routing')
    console.log('   ✅ 100% explicit metadata control')
    console.log('')

    const args = process.argv
    const files = getDocumentFiles(args)

    if (files.length === 0) {
      console.log('❌ No valid files found to process')
      return
    }

    console.log(`📁 Found ${files.length} file(s) with metadata:`)
    files.forEach((file, i) => {
      console.log(`   ${i + 1}. ${path.relative(projectRoot, file)}`)
    })

    // Step 1: Pre-create accommodation units
    const unitMap = await createUnitsFromFiles(files)
    console.log(`✅ Created ${unitMap.size} accommodation units`)

    // Step 2: Process each document for embeddings
    const documentResults = []
    for (const filePath of files) {
      try {
        const result = await processDocument(filePath, unitMap)
        documentResults.push(result)
      } catch (error) {
        console.error(`❌ Failed to process ${path.basename(filePath)}: ${error.message}`)
        documentResults.push({
          filename: path.basename(filePath),
          metadata: null,
          totalChunks: 0,
          successful: 0,
          failed: 1,
          error: error.message
        })
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 METADATA-DRIVEN PROCESSING COMPLETE!')
    console.log('='.repeat(60))

    let totalSuccessful = 0
    let totalFailed = 0
    let totalChunks = 0

    documentResults.forEach(result => {
      console.log(`📄 ${result.filename}:`)
      if (result.metadata) {
        console.log(`   Type: ${result.metadata.type}`)
        const resultDestination = getDestination(result.metadata)
        console.log(`   Destination: ${resultDestination.schema}.${resultDestination.table}`)
      }
      console.log(`   Chunks: ${result.totalChunks}, Successful: ${result.successful}, Failed: ${result.failed}`)
      totalSuccessful += result.successful
      totalFailed += result.failed
      totalChunks += result.totalChunks
    })

    console.log('\n📊 Overall Summary:')
    console.log(`   Total documents: ${documentResults.length}`)
    console.log(`   Total chunks: ${totalChunks}`)
    console.log(`   Successful embeddings: ${totalSuccessful}`)
    console.log(`   Failed embeddings: ${totalFailed}`)
    console.log(`   Success rate: ${totalChunks > 0 ? ((totalSuccessful / totalChunks) * 100).toFixed(1) : 0}%`)

    console.log('\n✅ Metadata-driven processing complete!')

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    console.error('📋 Error details:', error.stack)
    process.exit(1)
  }
}

// Run the script
populateEmbeddings()