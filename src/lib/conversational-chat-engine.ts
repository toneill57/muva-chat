/**
 * Conversational Chat Engine
 *
 * Core engine for generating context-aware conversational responses
 * with entity tracking, query enhancement, and multi-source search.
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { enhanceQuery, expandTechnicalTerms, type EnhancedQuery } from '@/lib/context-enhancer'
import type { GuestSession } from '@/lib/guest-auth'

// ============================================================================
// Configuration
// ============================================================================

// Lazy initialization for Supabase client (avoids test issues)
let supabase: any = null

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

// Lazy initialization to avoid issues in test environment
let openai: OpenAI | null = null
let anthropic: Anthropic | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openai
}

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return anthropic
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  entities?: string[]
  created_at: string
}

export interface ConversationalContext {
  query: string
  history: ChatMessage[]
  guestInfo: GuestSession
  vectorResults: VectorSearchResult[]
}

export interface ConversationalResponse {
  response: string
  entities: string[]
  followUpSuggestions: string[]
  sources: SourceMetadata[]
  confidence: number
}

export interface VectorSearchResult {
  id?: string
  name?: string
  title?: string
  source_file?: string
  content: string
  description?: string
  similarity: number
  table: string
  business_info?: any
  view_type?: string
  metadata?: {
    is_guest_unit?: boolean
    is_public_info?: boolean
    is_private_info?: boolean
    filtered_by_permission?: boolean
    [key: string]: any
  }
}

export interface SourceMetadata {
  type: 'accommodation' | 'tourism' | 'document'
  name: string
  similarity: number
  file?: string
}

interface DocumentContent {
  content: string
  metadata: any
}

// ============================================================================
// Main Engine Function
// ============================================================================

/**
 * Generate conversational response with full context awareness
 */
export async function generateConversationalResponse(
  context: ConversationalContext
): Promise<ConversationalResponse> {
  const startTime = Date.now()

  console.log(`[Chat Engine] Processing query: "${context.query.substring(0, 80)}..."`)
  console.log('[Chat Engine] Guest permissions:', {
    tenant: context.guestInfo.tenant_id,
    features: context.guestInfo.tenant_features,
    accommodation: context.guestInfo.accommodation_unit?.name,
  })

  try {
    // STEP 1: Extract entities from conversation history
    const historicalEntities = extractEntities(context.history)
    console.log(`[Chat Engine] Extracted ${historicalEntities.length} entities from history:`, historicalEntities)

    // STEP 2: Enhance query with context (using Claude Haiku)
    const enhancedQuery = await enhanceQuery(context.query, context.history)
    console.log(`[Chat Engine] Enhanced query: "${enhancedQuery.enhanced}" (isFollowUp: ${enhancedQuery.isFollowUp})`)

    // STEP 3: Perform context-aware vector search with permissions
    const vectorResults = await performContextAwareSearch(
      enhancedQuery.enhanced,
      [...historicalEntities, ...enhancedQuery.entities],
      context.guestInfo  // 🆕 NUEVO: Pass full session with permissions
    )
    console.log(`[Chat Engine] Found ${vectorResults.length} vector results`)

    // STEP 4: Retrieve full documents for high-confidence results
    const enrichedResults = await enrichResultsWithFullDocuments(vectorResults)
    console.log(`[Chat Engine] Enriched ${enrichedResults.length} results with full documents`)

    // STEP 5: Generate response with Claude Sonnet 3.5
    const fullContext: ConversationalContext = {
      ...context,
      vectorResults: enrichedResults,
    }

    const response = await generateResponseWithClaude(fullContext, enhancedQuery)
    console.log(`[Chat Engine] Generated response (${response.length} chars)`)

    // STEP 6: Extract entities from current conversation
    const currentEntities = [...enhancedQuery.entities, ...historicalEntities]
    const uniqueEntities = Array.from(new Set(currentEntities))

    // STEP 7: Generate follow-up suggestions
    const followUpSuggestions = generateFollowUpSuggestions(response, uniqueEntities, vectorResults)

    // STEP 8: Prepare sources metadata with domain emojis
    const sources: SourceMetadata[] = vectorResults.slice(0, 10).map((result) => {
      let domainLabel = ''
      let type: 'accommodation' | 'tourism' | 'document' = 'document'

      // Determine domain based on table
      if (result.table === 'muva_content') {
        domainLabel = '[TURISMO SAN ANDRÉS ✈️]'
        type = 'tourism'
      } else if (result.table === 'guest_information') {
        domainLabel = '[HOTEL SIMMERDOWN 🏨]'
        type = 'document'
      } else if (result.table.includes('accommodation_units_manual')) {
        // Supports both: accommodation_units_manual (old) and accommodation_units_manual_chunks (new)
        domainLabel = `[TU ALOJAMIENTO: ${context.guestInfo.accommodation_unit?.name || 'N/A'} 🏠]`
        type = 'accommodation'
      } else if (result.table === 'accommodation_units_public' || result.table === 'accommodation_units') {
        domainLabel = '[HOTEL SIMMERDOWN 🏨]'
        type = 'accommodation'
      } else {
        domainLabel = '[INFO GENERAL]'
      }

      const sourceName = result.name || result.title || result.source_file || 'Unknown'

      return {
        type,
        name: `${domainLabel} ${sourceName}`,
        similarity: result.similarity,
        file: result.source_file,
      }
    })

    // STEP 9: Calculate confidence score
    const confidence = calculateConfidence(vectorResults, enhancedQuery)

    const totalTime = Date.now() - startTime
    console.log(`[Chat Engine] ✅ Response generated in ${totalTime}ms (confidence: ${confidence.toFixed(2)})`)

    return {
      response,
      entities: uniqueEntities,
      followUpSuggestions,
      sources,
      confidence,
    }
  } catch (error) {
    console.error('[Chat Engine] Error generating response:', error)

    // Fallback response
    return {
      response: 'Lo siento, tuve un problema procesando tu mensaje. ¿Podrías intentarlo de nuevo?',
      entities: [],
      followUpSuggestions: [
        '¿Qué actividades puedo hacer en San Andrés?',
        '¿Cuáles son las mejores playas?',
        '¿Dónde puedo bucear?',
      ],
      sources: [],
      confidence: 0.0,
    }
  }
}

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Extract entities (places, activities) from conversation history
 */
export function extractEntities(history: ChatMessage[]): string[] {
  const entities: string[] = []

  // Extract entities from previous messages
  history.forEach((message) => {
    if (message.entities && message.entities.length > 0) {
      entities.push(...message.entities)
    }
  })

  // Deduplicate and return
  return Array.from(new Set(entities))
}

// ============================================================================
// Context-Aware Vector Search
// ============================================================================

/**
 * Perform vector search with entity boosting and permission filtering
 */
async function performContextAwareSearch(
  query: string,
  entities: string[],
  guestInfo: GuestSession  // 🆕 NUEVO: Full session with permissions
): Promise<VectorSearchResult[]> {
  const startTime = Date.now()

  try {
    // 🆕 OPCIÓN C: Expand technical terms with synonyms (clave → contraseña, wifi → wireless, etc.)
    const queryWithSynonyms = expandTechnicalTerms(query)

    // Generate embeddings for enhanced query (with technical synonyms)
    const [queryEmbeddingFast, queryEmbeddingBalanced, queryEmbeddingFull] = await Promise.all([
      generateEmbedding(queryWithSynonyms, 1024), // Tier 1 for accommodation (public info)
      generateEmbedding(queryWithSynonyms, 1536), // Tier 2 for guest information + manual
      generateEmbedding(queryWithSynonyms, 3072), // Tier 3 for tourism
    ])

    console.log(`[Chat Engine] Generated embeddings in ${Date.now() - startTime}ms`)

    // 🆕 Permission-aware search strategy (NUEVO)
    const hasMuvaAccess = guestInfo.tenant_features?.muva_access === true

    console.log('[Chat Engine] Search strategy (3 Domains):', {
      domain_1_muva: hasMuvaAccess,                              // Tourism (conditional)
      domain_2_hotel_general: true,                              // FAQ, Arrival (always)
      domain_3_unit_manual: !!guestInfo.accommodation_unit?.id,   // Private unit info (if assigned)
      accommodation_public: true,                                // ALL units (for re-booking)
      tenant: guestInfo.tenant_id,
      unit_id: guestInfo.accommodation_unit?.id || 'not_assigned',
    })

    // Build search array based on permissions
    const searches: Promise<VectorSearchResult[]>[] = []

    // 1. Accommodation search (ENHANCED) - public (ALL) + manual (guest's only)
    searches.push(searchAccommodationEnhanced(queryEmbeddingFast, queryEmbeddingBalanced, guestInfo))

    // 2. Hotel General Info search (ALWAYS) - FAQ, Arrival instructions (Domain 2)
    searches.push(searchHotelGeneralInfo(queryEmbeddingBalanced, guestInfo.tenant_id))

    // 3. Unit Manual search (ALWAYS) - Guest's private unit manual (Domain 3)
    if (guestInfo.accommodation_unit?.id) {
      searches.push(searchUnitManual(queryEmbeddingBalanced, guestInfo.accommodation_unit.id))
    } else {
      searches.push(Promise.resolve([]))
      console.log('[Chat Engine] ⚠️ No accommodation_unit - skipping unit manual search')
    }

    // 4. MUVA search (CONDITIONAL) - only if permission granted
    if (hasMuvaAccess) {
      console.log('[Chat Engine] ✅ MUVA access granted')
      searches.push(searchTourism(queryEmbeddingFull))
    } else {
      console.log('[Chat Engine] ⛔ MUVA access denied')
      searches.push(Promise.resolve([]))
    }

    // Execute searches in parallel
    const results = await Promise.all(searches)
    const accommodationResults = results[0] || []
    const hotelGeneralResults = results[1] || []
    const unitManualResults = results[2] || []
    const tourismResults = results[3] || []

    console.log(`[Chat Engine] Vector search completed in ${Date.now() - startTime}ms`, {
      total: accommodationResults.length + hotelGeneralResults.length + unitManualResults.length + tourismResults.length,
      accommodation: accommodationResults.length,
      hotel_general: hotelGeneralResults.length,
      unit_manual: unitManualResults.length,
      muva: tourismResults.length,
    })

    // BOOST 1: Tourism/MUVA (Tier 1 priority - main value proposition)
    if (tourismResults.length > 0) {
      tourismResults.forEach((result) => {
        const originalSimilarity = result.similarity
        const boost = 0.10  // Tourism is primary use case (80% of queries)
        result.similarity += boost
        console.log(`[Chat Engine] 🌴 Boosted tourism: "${result.name || result.source_file}" (${originalSimilarity.toFixed(3)} → ${result.similarity.toFixed(3)}, +${boost})`)
      })
    }

    // BOOST 2: Room-specific manual chunks (Tier 2 - conditional boost for relevant content)
    if (guestInfo.accommodation_unit?.id && unitManualResults.length > 0) {
      unitManualResults.forEach((result) => {
        // Boost manual chunks above RPC match threshold (0.25) to compete with tourism
        const originalSimilarity = result.similarity
        const boost = originalSimilarity >= 0.25 ? 0.08 : 0  // Match RPC filter threshold (>= not >)
        if (boost > 0) {
          result.similarity += boost
          console.log(`[Chat Engine] 🏠 Boosted unit manual chunk: "${result.name || result.source_file || 'Manual'}" (${originalSimilarity.toFixed(3)} → ${result.similarity.toFixed(3)}, +${boost})`)
        }
      })
    }

    // Combine results with prioritized order (tourism first for real-world usage)
    const allResults = [
      ...tourismResults,         // 🥇 PRIORITY 1: MUVA tourism (boost: +0.10) - 80% of queries
      ...unitManualResults,      // 🥈 PRIORITY 2: Room-specific manual (boost: +0.08 if >0.5) - 15% of queries
      ...hotelGeneralResults,    // 🥉 PRIORITY 3: Hotel FAQ/General info - 5% of queries
      ...accommodationResults,   // 🏅 PRIORITY 4: Other accommodations (public)
    ]

    // BOOST 3: Entity boosting for conversation continuity
    if (entities.length > 0) {
      allResults.forEach((result) => {
        const resultText = [
          result.name,
          result.title,
          result.source_file,
          result.content?.substring(0, 200),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        entities.forEach((entity) => {
          if (resultText.includes(entity.toLowerCase())) {
            result.similarity += 0.1 // Boost score by 10%
            console.log(`[Chat Engine] 💬 Boosted result "${result.name || result.source_file}" (entity: ${entity})`)
          }
        })
      })
    }

    // Sort by similarity (descending)
    allResults.sort((a, b) => b.similarity - a.similarity)

    return allResults.slice(0, 10) // Top 10 results
  } catch (error) {
    console.error('[Chat Engine] Vector search error:', error)
    return []
  }
}

/**
 * Generate OpenAI embedding
 */
async function generateEmbedding(text: string, dimensions: number): Promise<number[]> {
  const client = getOpenAIClient()
  const response = await client.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: dimensions,
    encoding_format: 'float',
  })
  return response.data[0].embedding
}

/**
 * Enhanced accommodation search (public + manual) - FASE C
 *
 * Searches:
 * - accommodation_units_public: ALL units (for re-booking/comparison)
 * - accommodation_units_manual: ONLY guest's unit (private info)
 */
async function searchAccommodationEnhanced(
  queryEmbeddingFast: number[],
  queryEmbeddingBalanced: number[],
  guestInfo: GuestSession
): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const guestUnitId = guestInfo.accommodation_unit?.id

  if (!guestUnitId) {
    console.warn('[Chat Engine] No accommodation assigned to guest')
    return []
  }

  const { data, error } = await client.rpc('match_guest_accommodations', {
    query_embedding_fast: queryEmbeddingFast,
    query_embedding_balanced: queryEmbeddingBalanced,
    p_guest_unit_id: guestUnitId,
    p_tenant_id: guestInfo.tenant_id,
    match_threshold: 0.15,
    match_count: 10,
  })

  if (error) {
    console.error('[Chat Engine] Enhanced accommodation search error:', error)
    return []
  }

  console.log('[Chat Engine] Enhanced accommodation results:', {
    total: data?.length || 0,
    public_units: data?.filter((r: any) => r.source_table === 'accommodation_units_public').length || 0,
    manual_old_deprecated: data?.filter((r: any) => r.source_table === 'accommodation_units_manual').length || 0, // Should be 0 after migration
    guest_unit_results: data?.filter((r: any) => r.is_guest_unit).length || 0,
  })

  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name || 'Alojamiento',  // 🆕 FIX: Include name to avoid "Unknown" display
    content: item.content,
    similarity: item.similarity,
    source_file: '', // Not applicable for DB content
    table: item.source_table,
    metadata: {
      is_guest_unit: item.is_guest_unit,
      is_public_info: item.source_table === 'accommodation_units_public',
      is_private_info: item.source_table.includes('accommodation_units_manual'), // Supports old and new chunks table
    },
  }))
}

/**
 * Search MUVA tourism content
 */
async function searchTourism(embedding: number[]): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('match_muva_documents', {
    query_embedding: embedding,
    match_threshold: 0.15,
    match_count: 5,
  })

  if (error) {
    console.error('[Chat Engine] Tourism search error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item,
    table: 'muva_content',
  }))
}

/**
 * Search guest information (operational manuals, FAQs, policies)
 * @deprecated Use searchHotelGeneralInfo() and searchUnitManual() instead for proper domain separation
 */
async function searchGuestInformation(
  embedding: number[],
  guestInfo: GuestSession
): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('match_guest_information_balanced', {
    query_embedding: embedding,
    p_tenant_id: guestInfo.tenant_id,
    similarity_threshold: 0.3,
    match_count: 5,
  })

  if (error) {
    console.error('[Chat Engine] Guest information search error:', error)
    return []
  }

  console.log('[Chat Engine] Guest information results:', {
    total_found: data?.length || 0,
    tenant: guestInfo.tenant_id,
  })

  return (data || []).map((item: any) => ({
    ...item,
    table: 'guest_information',
    content: item.info_content,
    title: item.info_title,
    name: item.info_title,
  }))
}

/**
 * Search HOTEL GENERAL information (FAQ, Arrival instructions)
 * Domain 2: Information that applies to ALL guests of the hotel
 */
async function searchHotelGeneralInfo(
  embedding: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('match_hotel_general_info', {
    query_embedding: embedding,
    p_tenant_id: tenantId,
    similarity_threshold: 0.3,
    match_count: 5,
  })

  if (error) {
    console.error('[Chat Engine] Hotel general info search error:', error)
    return []
  }

  console.log('[Chat Engine] Hotel general info results:', {
    total_found: data?.length || 0,
    tenant: tenantId,
  })

  return (data || []).map((item: any) => ({
    ...item,
    table: 'guest_information',
    content: item.info_content,
    title: item.info_title,
    name: item.info_title,
  }))
}

/**
 * Search UNIT MANUAL CHUNKS (WiFi, safe code, appliances)
 * Domain 3: Private information ONLY for the guest's assigned unit
 * Uses chunked content for improved vector search precision (0.85+ similarity vs 0.24 with full docs)
 */
async function searchUnitManual(
  embedding: number[],
  unitId: string
): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('match_unit_manual_chunks', {
    query_embedding: embedding,
    p_accommodation_unit_id: unitId,
    match_threshold: 0.25,
    match_count: 5,
  })

  if (error) {
    console.error('[Chat Engine] Unit manual chunks search error:', error)
    return []
  }

  console.log('[Chat Engine] Unit manual chunks results:', {
    total_found: data?.length || 0,
    unit_id: unitId,
    chunks: data?.map((item: any) => ({
      chunk_index: item.chunk_index,
      similarity: item.similarity?.toFixed(3),
      section: item.section_title?.substring(0, 50),
    })),
  })

  return (data || []).map((item: any) => ({
    ...item,
    table: 'accommodation_units_manual_chunks',
    content: item.chunk_content || '',
    title: item.section_title || `Manual - Chunk ${item.chunk_index}`,
    name: `Manual ${item.section_title || ''}`,
    metadata: {
      ...item.metadata,
      chunk_index: item.chunk_index,
      section_title: item.section_title,
    },
  }))
}

// ============================================================================
// Full Document Retrieval
// ============================================================================

/**
 * Retrieve full documents for high-confidence results
 */
async function enrichResultsWithFullDocuments(
  results: VectorSearchResult[]
): Promise<VectorSearchResult[]> {
  const enrichedResults = await Promise.all(
    results.map(async (result) => {
      // Only retrieve full document if confidence > 0.7
      if (result.similarity > 0.7 && result.source_file && result.table === 'muva_content') {
        console.log(`[Chat Engine] Retrieving full document for ${result.source_file}`)

        const fullDoc = await retrieveFullDocument(result.source_file, result.table)

        if (fullDoc) {
          return {
            ...result,
            content: fullDoc.content,
            // Preserve existing metadata but add full document data
          }
        }
      }

      return result
    })
  )

  return enrichedResults
}

/**
 * Retrieve complete document content
 */
async function retrieveFullDocument(sourceFile: string, table: string): Promise<DocumentContent | null> {
  try {
    const client = getSupabaseClient()

    // Determine columns based on table (muva_content has business_info and subcategory, sire_content doesn't)
    // Include chunk_index for ordering chunks correctly
    const selectFields = table === 'muva_content'
      ? 'content, title, description, business_info, category, subcategory, tags, keywords, schema_type, schema_version, chunk_index'
      : 'content, title, description, category, tags, keywords, schema_type, schema_version, chunk_index'

    // Get ALL chunks for this document (not .single())
    const { data, error } = await client
      .from(table)
      .select(selectFields)
      .eq('source_file', sourceFile)
      .order('chunk_index')  // Order by chunk_index to maintain document structure

    if (error || !data || data.length === 0) {
      console.error('[Chat Engine] Error retrieving full document:', error)
      return null
    }

    // Concatenate content from all chunks
    const fullContent = data.map((chunk: any) => chunk.content).join('\n\n')
    console.log(`[Chat Engine] Retrieved ${data.length} chunks, concatenated to ${fullContent.length} chars`)

    // Metadata is identical across all chunks, use first chunk
    const firstChunk = data[0]

    // Build metadata from structured columns
    return {
      content: fullContent,  // Full concatenated content
      metadata: {
        title: firstChunk.title,
        description: firstChunk.description,
        business_info: firstChunk.business_info || null,  // Only muva_content
        category: firstChunk.category,
        subcategory: firstChunk.subcategory || null,  // Only muva_content
        tags: firstChunk.tags || [],
        keywords: firstChunk.keywords || [],
        schema_type: firstChunk.schema_type,
        schema_version: firstChunk.schema_version,
      },
    }
  } catch (error) {
    console.error('[Chat Engine] retrieveFullDocument error:', error)
    return null
  }
}

// ============================================================================
// Claude Sonnet Response Generation
// ============================================================================

/**
 * Generate natural language response using Claude Sonnet 3.5
 */
async function generateResponseWithClaude(
  context: ConversationalContext,
  enhancedQuery: EnhancedQuery
): Promise<string> {
  const startTime = Date.now()

  try {
    // Build conversation history for Claude
    const conversationHistory = context.history
      .slice(-5) // Last 5 messages for context
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

    // 🆕 Build dynamic security restrictions (MUST BE BEFORE searchContext!)
    const hasMuvaAccess = context.guestInfo.tenant_features?.muva_access || false
    const accommodationName = context.guestInfo.accommodation_unit?.name || 'sin asignar'
    const accommodationNumber = context.guestInfo.accommodation_unit?.unit_number || ''
    const accommodationDisplay = accommodationNumber ? `${accommodationName} #${accommodationNumber}` : accommodationName

    // Prepare search results context with public/private labels
    const searchContext = context.vectorResults
      .slice(0, 10) // Top 10 results (increased from 5 to ensure manual chunks always included)
      .map((result, index) => {
        const name = result.name || result.title || result.source_file || 'Unknown'

        // 🆕 CRITICAL FIX: Send FULL content for manual chunks (they contain room-specific info)
        // For other results, send preview only (500 chars) to avoid token inflation
        const isManualChunk = result.table === 'accommodation_units_manual_chunks'
        const contentLimit = isManualChunk ? 2000 : 500  // Manual chunks: 2000 chars, others: 500 chars
        const preview = result.content.substring(0, contentLimit)
        const truncationIndicator = result.content.length > contentLimit ? '...' : ''

        const businessInfo = result.business_info
          ? `\nContacto: ${result.business_info.telefono || 'N/A'}, Precio: ${result.business_info.precio || 'N/A'}`
          : ''

        // Add public/private label
        let accessLabel = ''
        if (result.metadata?.is_public_info) {
          accessLabel = ' [PÚBLICO - Todas las unidades]'
        } else if (result.metadata?.is_private_info) {
          accessLabel = result.metadata.is_guest_unit
            ? ` [PRIVADO - Tu unidad: ${accommodationName}]`
            : ' [PRIVADO - Otra unidad]'
        }

        return `[${index + 1}] ${name}${accessLabel} (similaridad: ${result.similarity.toFixed(2)})${businessInfo}\n${preview}${truncationIndicator}`
      })
      .join('\n\n---\n\n')

    // Build guest accommodation context
    const accommodationContext = context.guestInfo.accommodation_unit
      ? `- Alojamiento: ${accommodationDisplay}${context.guestInfo.accommodation_unit.view_type ? `, ${context.guestInfo.accommodation_unit.view_type}` : ''}`
      : ''

    // System prompt with dynamic security restrictions
    const systemPrompt = `Eres un asistente virtual para huéspedes de hoteles en San Andrés, Colombia.

CONTEXTO DEL HUÉSPED:
- Nombre: ${context.guestInfo.guest_name}
- Check-in: ${context.guestInfo.check_in.split('-').reverse().join('/')}
- Check-out: ${context.guestInfo.check_out.split('-').reverse().join('/')}
${accommodationContext}

⚠️ REGLA FUNDAMENTAL DE RESPUESTA:
Responde ÚNICAMENTE basándote en la información contenida en los RESULTADOS DE BÚSQUEDA proporcionados al final de este prompt.
Los ejemplos incluidos en este prompt son ILUSTRATIVOS para mostrar el formato correcto - NO los uses como datos reales.

✅ CÓMO LEER LOS RESULTADOS:
1. Lee CUIDADOSAMENTE todo el contenido de cada resultado
2. Busca información ESPECÍFICA mencionada, incluso si está en listas o viñetas
3. COPIA TEXTUALMENTE ubicaciones, contenidos, características exactas del texto
4. NO INVENTES ni ELABORES detalles que no están escritos
5. NO INFIERAS ubicaciones alternativas (si dice "baño", no digas "closet")

⚠️ REGLA CRÍTICA: USA SOLO LAS PALABRAS EXACTAS DEL TEXTO
- Si dice "Baño principal, gabinete alto" → Usa EXACTAMENTE eso
- Si dice "Vendas, curitas, antiséptico" → NO agregues "alcohol, tijeras, guantes"
- Si dice "8 minutos caminando" → Di "8 minutos caminando" (NO "5-10 minutos")

Ejemplo correcto:
- Pregunta: "¿tienen botiquín?"
- Texto: "Botiquín completo: Baño principal, gabinete alto. Contiene: Termómetro digital, Vendas, curitas, antiséptico"
- ✅ Respuesta: "Sí, hay un botiquín completo en el baño principal, gabinete alto. Incluye: termómetro digital, vendas, curitas, antiséptico y medicamentos básicos"
- ❌ INCORRECTO: "Está en el closet de la habitación principal" (NUNCA inventes ubicaciones)
- ❌ INCORRECTO: Agregar "alcohol, tijeras, guantes" si NO están en el texto

Si después de leer TODO el contenido NO encuentras la información, admite honestamente que no la tienes.

📚 ARQUITECTURA DE 3 DOMINIOS DE INFORMACIÓN:

Tienes acceso a 3 dominios claramente separados:

1. **[TURISMO SAN ANDRÉS 🌴]** - Información turística general
   - Restaurantes, playas, actividades, transporte
   - Contenido de MUVA (base turística de San Andrés)
   - Disponible para todos los huéspedes
   ${hasMuvaAccess ? '✅ Acceso COMPLETO - Proporciona detalles: precios, teléfonos, ubicaciones, horarios' : '⛔ NO DISPONIBLE - Dirigir a recepción para recomendaciones turísticas'}

2. **[HOTEL SIMMERDOWN 🏨]** - Políticas generales del hotel
   - Políticas generales del hotel
   - Horarios de check-in/out
   - Amenidades compartidas (piscina, WiFi, áreas comunes)
   - Reglas de la propiedad
   - Información de TODAS las unidades (descripciones, precios, comparaciones)
   ✅ Puedes mencionar y comparar TODAS las unidades del hotel para consultas de upgrade o re-booking

3. **[TU ALOJAMIENTO: ${accommodationDisplay} 🏠]** - Manual operativo PRIVADO
   - Manual operativo específico de tu unidad
   - Instrucciones de electrodomésticos
   - Contraseñas WiFi, códigos de caja fuerte
   - Características únicas de tu espacio
   ⚠️ Información PRIVADA (solo para ti)
   ⛔ NUNCA proporcionar información operativa de otras unidades

🔒 INSTRUCCIONES DE USO DE CONTEXTO:

**IMPORTANTE - Identificación de dominios en resultados:**
- Si el huésped pregunta sobre "mi habitación", "mi alojamiento", "dónde estoy hospedado":
  🏠 Usa SOLO información marcada con [TU ALOJAMIENTO: ...] o source_table que contenga 'accommodation_units_manual'

- Si pregunta sobre el hotel en general, amenidades compartidas, otras unidades:
  🏨 Usa información marcada con [HOTEL SIMMERDOWN 🏨] o source_table = 'guest_information'

- Si pregunta sobre actividades, restaurantes, playas, transporte:
  🌴 Usa información marcada con [TURISMO SAN ANDRÉS 🌴] o source_table = 'muva_content'

**REGLAS DE SEGURIDAD ABSOLUTAS:**
- ⛔ NUNCA compartas información operativa (WiFi, códigos, manuales) de unidades que NO sean ${accommodationName}
- ✅ SÍ puedes mencionar TODAS las unidades para descripciones generales, precios, upgrades
- ⚠️ Si piden info operativa de otra unidad: "Solo puedo darte información operativa de tu alojamiento: ${accommodationName}. Para otras unidades, contacta recepción."

EJEMPLOS DE USO CORRECTO (⚠️ ILUSTRATIVOS - Usa solo datos de RESULTADOS DE BÚSQUEDA):

📌 Pregunta: "¿Qué apartamentos tienen 3 habitaciones?"
✅ Respuesta correcta (usando 🏨 HOTEL SIMMERDOWN): "Tenemos 2 opciones con 3 habitaciones: Summertime (vista jardín, terraza) y One Love (vista mar, cocina completa). Tu unidad actual es ${accommodationName}. ¿Te interesa info sobre upgrade?"

📌 Pregunta: "¿Cuál es la contraseña del WiFi?"
✅ Respuesta correcta (usando 🏠 TU ALOJAMIENTO): "La contraseña del WiFi de tu ${accommodationName} es: [usar la contraseña exacta encontrada en el manual privado de RESULTADOS DE BÚSQUEDA]"
❌ Respuesta INCORRECTA: "No tengo acceso a contraseñas WiFi"

📌 Pregunta: "¿Cuál es la contraseña WiFi del apartamento Sunshine?"
❌ Respuesta INCORRECTA: "La contraseña del Sunshine es..."
✅ Respuesta correcta: "Solo puedo darte información operativa de tu alojamiento: ${accommodationName}. Para consultas sobre otras unidades, contacta recepción."

📌 Pregunta: "¿Dónde puedo comer pescado fresco?"
✅ Respuesta correcta (usando 🌴 TURISMO SAN ANDRÉS): "[Menciona 2-3 restaurantes de mariscos encontrados en RESULTADOS con precios, teléfonos y ubicación exacta]"

ESTILO DE RESPUESTA:
- Amigable, profesional, conciso
- Máximo 3-4 oraciones por respuesta
- Si no tienes información, admítelo honestamente
- Siempre respetar restricciones de seguridad arriba

IMPORTANTE: Las restricciones de seguridad son ABSOLUTAS. Nunca las violes bajo ninguna circunstancia.

RESULTADOS DE BÚSQUEDA:
${searchContext || 'No se encontraron resultados relevantes.'}

Responde a la pregunta del huésped de manera natural y útil.`

    // Call Claude Haiku 3.5 (cost-effective, fast, deterministic)
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5', // Claude Haiku 3.5 (5x cheaper, faster)
      max_tokens: 800,
      temperature: 0.1, // Low temperature for data-driven, consistent responses
      top_p: 0.9, // Balanced precision and variety (Claude API uses top_p, not top_k)
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: context.query,
        },
      ],
    })

    const duration = Date.now() - startTime
    console.log(`[Chat Engine] Claude Haiku response generated in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    return content.text
  } catch (error) {
    console.error('[Chat Engine] Claude generation error:', error)

    // Fallback: Basic response with search results
    if (context.vectorResults.length > 0) {
      const topResult = context.vectorResults[0]
      const name = topResult.name || topResult.title || 'esta opción'
      return `Hola ${context.guestInfo.guest_name}, encontré información sobre ${name}. ${topResult.content.substring(0, 200)}...`
    }

    return 'Lo siento, no encontré información específica sobre tu consulta. ¿Podrías reformular tu pregunta?'
  }
}

// ============================================================================
// Follow-up Suggestions
// ============================================================================

/**
 * Generate contextual follow-up suggestions
 */
export function generateFollowUpSuggestions(
  response: string,
  entities: string[],
  vectorResults: VectorSearchResult[]
): string[] {
  const suggestions: string[] = []

  // Strategy 1: Suggest related entities
  if (entities.length > 0) {
    const lastEntity = entities[entities.length - 1]
    suggestions.push(`¿Qué más puedo hacer cerca de ${lastEntity}?`)
  }

  // Strategy 2: Suggest based on result types
  const hasAccommodation = vectorResults.some((r) => r.table === 'accommodation_units')
  const hasTourism = vectorResults.some((r) => r.table === 'muva_content')

  if (hasTourism && !hasAccommodation) {
    suggestions.push('¿Cómo llego hasta allá desde mi hotel?')
    suggestions.push('¿Cuál es el horario de atención?')
  }

  if (hasAccommodation && !hasTourism) {
    suggestions.push('¿Qué actividades puedo hacer cerca?')
    suggestions.push('¿Hay restaurantes recomendados cerca?')
  }

  // Strategy 3: Generic helpful suggestions
  if (suggestions.length < 3) {
    suggestions.push('¿Cuáles son las mejores playas?')
    suggestions.push('¿Dónde puedo bucear?')
    suggestions.push('¿Qué restaurantes recomiendas?')
  }

  // Return top 3 unique suggestions
  return Array.from(new Set(suggestions)).slice(0, 3)
}

// ============================================================================
// Confidence Calculation
// ============================================================================

/**
 * Calculate confidence score for the response
 */
function calculateConfidence(results: VectorSearchResult[], enhancedQuery: EnhancedQuery): number {
  if (results.length === 0) {
    return 0.1
  }

  const topSimilarity = results[0].similarity
  const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length

  // Factors:
  // - Top result similarity (50%)
  // - Average similarity (25%)
  // - Query enhancement confidence (25%)
  const confidence = topSimilarity * 0.5 + avgSimilarity * 0.25 + enhancedQuery.confidence * 0.25

  return Math.min(Math.max(confidence, 0), 1) // Clamp to [0, 1]
}
