/**
 * Staff Chat Engine
 *
 * Conversational chat engine for hotel staff with role-based access control.
 * Implements multi-source vector search with permission filtering.
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase'
import type { StaffSession } from '@/lib/staff-auth'
import type { TenantContextData, ReservationQueryDetection, ReservationSearchParams, ReservationMatch } from '@/lib/staff-chat-types'

// ============================================================================
// Configuration
// ============================================================================

let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

// Tenant context cache (to avoid re-fetching on every message)
const tenantContextCache = new Map<string, { data: TenantContextData; timestamp: number }>()

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Please configure it in .env.local'
      )
    }
    if (!apiKey.startsWith('sk-')) {
      throw new Error(
        'ANTHROPIC_API_KEY has invalid format. Expected format: sk-...'
      )
    }
    console.log('[staff-chat-engine] Initializing Anthropic client')
    anthropicClient = new Anthropic({
      apiKey: apiKey,
    })
  }
  return anthropicClient
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Please configure it in .env.local'
      )
    }
    if (!apiKey.startsWith('sk-')) {
      throw new Error(
        'OPENAI_API_KEY has invalid format. Expected format: sk-...'
      )
    }
    console.log('[staff-chat-engine] Initializing OpenAI client')
    openaiClient = new OpenAI({
      apiKey: apiKey,
    })
  }
  return openaiClient
}

// ============================================================================
// Types
// ============================================================================

export interface StaffChatResponse {
  conversation_id: string
  response: string
  sources: StaffSource[]
  metadata: {
    intent: {
      type: 'sire' | 'operations' | 'admin' | 'reservations' | 'general'
      confidence: number
    }
    token_usage: {
      input: number
      output: number
      total: number
    }
    cost_usd: number
  }
}

export interface StaffSource {
  table: string
  id: string
  content: string
  similarity: number
  category?: string
}

interface VectorSearchResult {
  table: string
  id: string
  content: string
  similarity: number
  metadata?: Record<string, any>
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// ============================================================================
// Main Function
// ============================================================================

export async function generateStaffChatResponse(
  message: string,
  conversationId: string | undefined,
  staffSession: StaffSession
): Promise<StaffChatResponse> {
  console.log('[staff-chat-engine] Starting chat response generation')
  console.log('[staff-chat-engine] Staff:', {
    username: staffSession.username,
    role: staffSession.role,
    permissions: staffSession.permissions,
  })

  const supabase = createServerClient()

  try {
    // 1. Fetch tenant context
    const tenantContext = await fetchTenantContext(staffSession.tenant_id)

    // 2. Create or load conversation
    const activeConversationId = conversationId || await createConversation(
      staffSession.staff_id,
      staffSession.tenant_id,
      message
    )

    // 3. Load conversation history
    const history = await loadConversationHistory(activeConversationId)
    console.log('[staff-chat-engine] Loaded history:', history.length, 'messages')

    // 4. Perform vector search (includes reservation search if detected)
    const searchResults = await performStaffSearch(message, staffSession)
    console.log('[staff-chat-engine] Found', searchResults.length, 'relevant documents')

    // 5. Detect intent
    const intent = detectIntent(message, searchResults)
    console.log('[staff-chat-engine] Detected intent:', intent)

    // 6. Generate response with Claude (with tenant context)
    const claudeResponse = await generateClaudeResponse(
      message,
      history,
      searchResults,
      staffSession,
      tenantContext
    )

    // 7. Save messages to database
    await saveMessages(
      activeConversationId,
      message,
      claudeResponse.response,
      searchResults,
      intent,
      claudeResponse.usage
    )

    // 8. Update conversation metadata
    await updateConversation(activeConversationId, intent.type)

    // 9. Calculate cost
    const costUsd = calculateCost(
      claudeResponse.usage.input_tokens,
      claudeResponse.usage.output_tokens
    )

    return {
      conversation_id: activeConversationId,
      response: claudeResponse.response,
      sources: searchResults.slice(0, 5).map(r => ({
        table: r.table,
        id: r.id,
        content: r.content.substring(0, 200),
        similarity: r.similarity,
        category: r.metadata?.category,
      })),
      metadata: {
        intent,
        token_usage: {
          input: claudeResponse.usage.input_tokens,
          output: claudeResponse.usage.output_tokens,
          total: claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens,
        },
        cost_usd: costUsd,
      },
    }
  } catch (error) {
    console.error('[staff-chat-engine] Error generating response:', error)
    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate OpenAI embedding with specified dimensions
 */
async function generateEmbedding(text: string, dimensions: number = 1536): Promise<number[]> {
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
 * Fetch tenant business context from database
 * Cached for 5 minutes to avoid repeated DB calls
 */
async function fetchTenantContext(tenantId: string): Promise<TenantContextData | null> {
  // Check cache first (5 minute TTL)
  const cached = tenantContextCache.get(tenantId)
  const now = Date.now()
  if (cached && (now - cached.timestamp) < 5 * 60 * 1000) {
    console.log('[staff-chat-engine] Using cached tenant context')
    return cached.data
  }

  try {
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('tenant_registry')
      .select('tenant_id, nombre_comercial, razon_social, address, phone, email, seo_meta_description, social_media_links, features')
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      console.error('[staff-chat-engine] Error fetching tenant context:', error)
      return null
    }

    // Parse social_media_links (stored as JSONB)
    const socialMedia = data.social_media_links
      ? {
          facebook: data.social_media_links.facebook,
          instagram: data.social_media_links.instagram,
          whatsapp: data.social_media_links.whatsapp,
        }
      : undefined

    const tenantContext: TenantContextData = {
      tenant_id: data.tenant_id,
      business_name: data.nombre_comercial || data.razon_social || 'Hotel',
      legal_name: data.razon_social,
      address: data.address,
      phone: data.phone,
      email: data.email,
      seo_description: data.seo_meta_description,
      social_media: socialMedia,
      features: data.features,
    }

    // Cache result
    tenantContextCache.set(tenantId, { data: tenantContext, timestamp: now })

    console.log('[staff-chat-engine] Fetched tenant context:', tenantContext.business_name)
    return tenantContext
  } catch (error) {
    console.error('[staff-chat-engine] Error fetching tenant context:', error)
    return null
  }
}

/**
 * Detect if query is about reservations and extract parameters
 */
function detectReservationQuery(message: string): ReservationQueryDetection {
  const messageLower = message.toLowerCase()
  const params: ReservationSearchParams = {}

  // Keywords for reservation queries
  const reservationKeywords = [
    'reserva', 'reservas', 'booking',
    'llega', 'llegan', 'llegada', 'llegadas',
    'check-in', 'checkin', 'check in',
    'check-out', 'checkout', 'check out',
    'huésped', 'huéspedes', 'guest', 'guests',
    'salida', 'sale', 'salen',
  ]

  const hasReservationKeyword = reservationKeywords.some(keyword =>
    messageLower.includes(keyword)
  )

  if (!hasReservationKeyword) {
    return {
      isReservationQuery: false,
      queryType: 'none',
      params: {},
      confidence: 0,
    }
  }

  // Extract dates
  const datePatterns = [
    // "24 de diciembre" → "24 de diciembre"
    /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/gi,
    // "hoy", "mañana"
    /(hoy|mañana|today|tomorrow)/gi,
    // ISO format "2024-12-24"
    /(\d{4}-\d{2}-\d{2})/g,
  ]

  const monthMap: Record<string, string> = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
  }

  for (const pattern of datePatterns) {
    const match = message.match(pattern)
    if (match) {
      const dateStr = match[0].toLowerCase()

      // Handle "hoy" and "mañana"
      if (dateStr === 'hoy' || dateStr === 'today') {
        const today = new Date()
        params.checkInDate = today.toISOString().split('T')[0]
      } else if (dateStr === 'mañana' || dateStr === 'tomorrow') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        params.checkInDate = tomorrow.toISOString().split('T')[0]
      }
      // Handle "24 de diciembre"
      else if (dateStr.includes(' de ')) {
        const parts = dateStr.split(' de ')
        const day = parts[0].trim().padStart(2, '0')
        const month = monthMap[parts[1].trim()]
        if (month) {
          const year = new Date().getFullYear()
          params.checkInDate = `${year}-${month}-${day}`
        }
      }
      // Handle ISO format
      else if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
        params.checkInDate = dateStr
      }
    }
  }

  // Extract phone numbers (last 4 digits or full)
  const phonePatterns = [
    /teléfono.*?(\d{4})/i,  // "teléfono 1234"
    /phone.*?(\d{4})/i,     // "phone 1234"
    /(\d{10})/,             // "3001234567" (10 digits)
  ]

  for (const pattern of phonePatterns) {
    const match = message.match(pattern)
    if (match) {
      params.phone = match[1]
      break
    }
  }

  // Extract guest names (proper nouns after "huésped" or common patterns)
  const namePatterns = [
    /(?:huésped|guest|persona)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,
    /(?:reserva de|booking for)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)/i,
  ]

  for (const pattern of namePatterns) {
    const match = message.match(pattern)
    if (match) {
      params.guestName = match[1].trim()
      break
    }
  }

  // Extract email
  const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/
  const emailMatch = message.match(emailPattern)
  if (emailMatch) {
    params.email = emailMatch[1]
  }

  // Extract reservation code
  const codePatterns = [
    /(?:código|code|reserva)\s*#?\s*([A-Z0-9-]{6,})/i,
  ]

  for (const pattern of codePatterns) {
    const match = message.match(pattern)
    if (match) {
      params.reservationCode = match[1]
      break
    }
  }

  // Determine query type and confidence
  let queryType: 'sql' | 'vector' | 'hybrid' | 'none' = 'vector'
  let confidence = 0.6

  // SQL if we have exact parameters (dates, phone, code)
  if (params.checkInDate || params.phone || params.reservationCode || params.email) {
    queryType = 'sql'
    confidence = 0.9
  }

  // Hybrid if we have both exact params and fuzzy params (name)
  if ((params.checkInDate || params.phone) && params.guestName) {
    queryType = 'hybrid'
    confidence = 0.95
  }

  // Vector only if we only have fuzzy params (name)
  if (params.guestName && !params.checkInDate && !params.phone && !params.reservationCode) {
    queryType = 'vector'
    confidence = 0.7
  }

  console.log('[staff-chat-engine] Detected reservation query:', {
    queryType,
    params,
    confidence,
  })

  return {
    isReservationQuery: true,
    queryType,
    params,
    confidence,
  }
}

/**
 * Search reservations using hybrid SQL + fuzzy matching
 * Returns results in VectorSearchResult format for consistency
 */
async function searchReservationsHybrid(
  params: ReservationSearchParams,
  tenantId: string
): Promise<VectorSearchResult[]> {
  try {
    const supabase = createServerClient()

    console.log('[staff-chat-engine] Searching reservations with params:', params)

    // Build SQL query
    let query = supabase
      .from('guest_reservations')
      .select(`
        id,
        guest_name,
        phone_full,
        check_in_date,
        check_out_date,
        reservation_code,
        status,
        guest_email,
        adults,
        children,
        total_price
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')

    // Apply exact filters
    if (params.checkInDate) {
      query = query.eq('check_in_date', params.checkInDate)
    }

    if (params.checkOutDate) {
      query = query.eq('check_out_date', params.checkOutDate)
    }

    if (params.reservationCode) {
      query = query.eq('reservation_code', params.reservationCode)
    }

    if (params.email) {
      query = query.ilike('guest_email', `%${params.email}%`)
    }

    // Phone search (supports both full phone and last 4 digits)
    if (params.phone) {
      if (params.phone.length === 4) {
        // Last 4 digits
        query = query.ilike('phone_full', `%${params.phone}`)
      } else {
        // Full phone number
        query = query.ilike('phone_full', `%${params.phone}%`)
      }
    }

    // Fuzzy name search using ILIKE
    if (params.guestName) {
      query = query.ilike('guest_name', `%${params.guestName}%`)
    }

    // Fuzzy accommodation name search
    if (params.accommodationName) {
      // This requires joining with reservation_accommodations and accommodation_units
      // For now, we'll skip this and handle it in a future iteration
      // TODO: Implement accommodation name search via RPC function
    }

    // Order by check-in date (nearest first)
    query = query.order('check_in_date', { ascending: true }).limit(10)

    const { data, error } = await query

    if (error) {
      console.error('[staff-chat-engine] Reservation search error:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.log('[staff-chat-engine] No reservations found')
      return []
    }

    console.log('[staff-chat-engine] Found', data.length, 'reservations')

    // Get accommodation units for each reservation
    const reservationIds = data.map(r => r.id)

    const { data: accommodationsData } = await supabase
      .from('reservation_accommodations')
      .select('reservation_id, accommodation_unit_id')
      .in('reservation_id', reservationIds)

    // Get unique accommodation_unit_ids
    const accommodationUnitIds = [...new Set(
      (accommodationsData || [])
        .map((acc: any) => acc.accommodation_unit_id)
        .filter(Boolean)
    )]

    // Fetch accommodation units
    const accommodationUnitsMap = new Map<string, any>()

    if (accommodationUnitIds.length > 0) {
      const { data: unitsData } = await supabase.rpc(
        'get_accommodation_units_by_ids',
        { p_unit_ids: accommodationUnitIds }
      )

      if (unitsData) {
        unitsData.forEach((unit: any) => {
          accommodationUnitsMap.set(unit.id, {
            name: unit.name,
            unit_number: unit.unit_number,
          })
        })
      }
    }

    // Group accommodations by reservation_id
    const reservationAccommodationsMap = new Map<string, any[]>()
    ;(accommodationsData || []).forEach((acc: any) => {
      if (!reservationAccommodationsMap.has(acc.reservation_id)) {
        reservationAccommodationsMap.set(acc.reservation_id, [])
      }
      const unit = accommodationUnitsMap.get(acc.accommodation_unit_id)
      if (unit) {
        reservationAccommodationsMap.get(acc.reservation_id)!.push(unit)
      }
    })

    // Transform to VectorSearchResult format
    return data.map((reservation: any) => {
      const accommodations = reservationAccommodationsMap.get(reservation.id) || []
      const accommodationNames = accommodations
        .map((acc: any) => `${acc.name}${acc.unit_number ? ` #${acc.unit_number}` : ''}`)
        .join(', ')

      // Build content for the AI to read
      const content = `
RESERVA: ${reservation.guest_name}
Check-in: ${reservation.check_in_date}
Check-out: ${reservation.check_out_date}
Teléfono: ${reservation.phone_full}
Email: ${reservation.guest_email || 'No registrado'}
Alojamiento: ${accommodationNames || 'No asignado'}
Código: ${reservation.reservation_code || 'Sin código'}
Adultos: ${reservation.adults || 1}
Niños: ${reservation.children || 0}
Precio total: ${reservation.total_price ? `$${reservation.total_price}` : 'No especificado'}
Estado: ${reservation.status}
`.trim()

      // Calculate pseudo-similarity based on match quality
      let similarity = 0.7 // Base similarity for SQL matches

      // Boost similarity for exact matches
      if (params.checkInDate && params.checkInDate === reservation.check_in_date) {
        similarity += 0.1
      }
      if (params.phone && reservation.phone_full.includes(params.phone)) {
        similarity += 0.1
      }
      if (params.email && reservation.guest_email?.includes(params.email)) {
        similarity += 0.05
      }
      if (params.guestName && reservation.guest_name.toLowerCase().includes(params.guestName.toLowerCase())) {
        similarity += 0.05
      }

      return {
        table: 'guest_reservations',
        id: reservation.id,
        content,
        similarity: Math.min(similarity, 1.0), // Cap at 1.0
        metadata: {
          guest_name: reservation.guest_name,
          check_in_date: reservation.check_in_date,
          check_out_date: reservation.check_out_date,
          phone_full: reservation.phone_full,
          accommodations: accommodationNames,
        },
      }
    })
  } catch (error) {
    console.error('[staff-chat-engine] Error searching reservations:', error)
    return []
  }
}

// ============================================================================
// Vector Search Functions
// ============================================================================

async function performStaffSearch(
  query: string,
  staffSession: StaffSession
): Promise<VectorSearchResult[]> {
  console.log('[staff-chat-engine] Performing multi-source search')

  const searches: Promise<VectorSearchResult[]>[] = []

  // 0. Detect reservation queries FIRST
  const reservationQuery = detectReservationQuery(query)

  if (reservationQuery.isReservationQuery && reservationQuery.confidence > 0.6) {
    console.log('[staff-chat-engine] Detected reservation query - searching reservations')
    searches.push(searchReservationsHybrid(reservationQuery.params, staffSession.tenant_id))
  }

  // 1. SIRE Content (if permission granted)
  if (staffSession.permissions.sire_access) {
    console.log('[staff-chat-engine] Including SIRE content')
    searches.push(searchSIREDocuments(query, staffSession.tenant_id))
  }

  // 2. Hotel Operations (all staff)
  console.log('[staff-chat-engine] Including hotel operations')
  searches.push(searchHotelOperations(query, staffSession))

  // 3. Policies (all staff)
  console.log('[staff-chat-engine] Including policies')
  searches.push(searchPolicies(query, staffSession.tenant_id))

  // 4. Admin Content (CEO + Admin only)
  if (staffSession.role === 'ceo' || staffSession.role === 'admin') {
    console.log('[staff-chat-engine] Including admin content')
    searches.push(searchAdminContent(query, staffSession))
  }

  // Execute all searches in parallel
  const results = await Promise.all(searches)
  const combinedResults = results.flat()

  // Sort by similarity and return top results
  return combinedResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 8)
}

async function searchHotelOperations(
  query: string,
  staffSession: StaffSession
): Promise<VectorSearchResult[]> {
  try {
    // Generate Tier 2 embedding (1536d for operations)
    const queryEmbedding = await generateEmbedding(query, 1536)

    const supabase = createServerClient()

    console.log('[staff-chat-engine] Searching hotel_operations (all_staff only)')

    // Query using embedding_balanced (Tier 2) - only all_staff content
    const { data, error } = await supabase.rpc('match_hotel_operations_balanced', {
      query_embedding: queryEmbedding,
      p_tenant_id: staffSession.tenant_id,
      p_access_levels: ['public', 'housekeeper'],
      match_threshold: 0.5,
      match_count: 4,
    })

    if (error) {
      console.error('[staff-chat-engine] Hotel operations search error:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      table: 'hotel_operations',
      id: item.operation_id,
      content: item.content,
      similarity: item.similarity,
      metadata: {
        category: item.category,
        title: item.title,
        access_level: item.access_level,
      },
    }))
  } catch (error) {
    console.error('[staff-chat-engine] Error searching hotel operations:', error)
    return []
  }
}

async function searchAdminContent(
  query: string,
  staffSession: StaffSession
): Promise<VectorSearchResult[]> {
  try {
    // Generate Tier 2 embedding (1536d for admin content)
    const queryEmbedding = await generateEmbedding(query, 1536)

    const supabase = createServerClient()

    // Determine admin access levels based on role
    const accessLevels = staffSession.role === 'ceo'
      ? ['admin', 'executive']
      : ['admin']

    console.log('[staff-chat-engine] Searching admin content with access_levels:', accessLevels)

    // Query using embedding_balanced (Tier 2) - only admin/ceo content
    const { data, error } = await supabase.rpc('match_hotel_operations_balanced', {
      query_embedding: queryEmbedding,
      p_tenant_id: staffSession.tenant_id,
      p_access_levels: accessLevels,
      match_threshold: 0.5,
      match_count: 3,
    })

    if (error) {
      console.error('[staff-chat-engine] Admin content search error:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      table: 'hotel_operations',
      id: item.operation_id,
      content: item.content,
      similarity: item.similarity,
      metadata: {
        category: item.category,
        title: item.title,
        access_level: item.access_level,
      },
    }))
  } catch (error) {
    console.error('[staff-chat-engine] Error searching admin content:', error)
    return []
  }
}

async function searchSIREDocuments(
  query: string,
  tenantId: string
): Promise<VectorSearchResult[]> {
  try {
    // Generate Tier 3 embedding (3072d for SIRE precision)
    const queryEmbedding = await generateEmbedding(query, 3072)

    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('match_sire_documents', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenantId,
      match_threshold: 0.6,
      match_count: 3,
    })

    if (error) {
      console.error('[staff-chat-engine] SIRE search error:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      table: 'sire_content',
      id: item.id,
      content: item.chunk || item.content,
      similarity: item.similarity,
      metadata: {
        source_file: item.source_file,
      },
    }))
  } catch (error) {
    console.error('[staff-chat-engine] Error searching SIRE documents:', error)
    return []
  }
}

async function searchPolicies(
  query: string,
  tenantId: string
): Promise<VectorSearchResult[]> {
  try {
    // Generate Tier 2 embedding (1536d for policies)
    const queryEmbedding = await generateEmbedding(query, 1536)

    const supabase = createServerClient()

    const { data, error } = await supabase.rpc('match_policies', {
      query_embedding: queryEmbedding,
      p_tenant_id: tenantId,
      match_threshold: 0.5,
      match_count: 2,
    })

    if (error) {
      console.error('[staff-chat-engine] Policies search error:', error)
      return []
    }

    return (data || []).map((item: any) => ({
      table: 'policies',
      id: item.id,
      content: item.content,
      similarity: item.similarity,
      metadata: {
        policy_name: item.policy_name,
      },
    }))
  } catch (error) {
    console.error('[staff-chat-engine] Error searching policies:', error)
    return []
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAccessLevelsForRole(role: 'ceo' | 'admin' | 'housekeeper'): string[] {
  const accessMap = {
    ceo: ['public', 'housekeeper', 'admin', 'executive'],
    admin: ['public', 'housekeeper', 'admin'],
    housekeeper: ['public', 'housekeeper'],
  }

  return accessMap[role] || ['public']
}

function detectIntent(
  message: string,
  searchResults: VectorSearchResult[]
): { type: 'sire' | 'operations' | 'admin' | 'reservations' | 'general'; confidence: number } {
  const messageLower = message.toLowerCase()

  // Check for reservation keywords
  const reservationQuery = detectReservationQuery(message)
  if (reservationQuery.isReservationQuery && reservationQuery.confidence > 0.6) {
    return { type: 'reservations', confidence: reservationQuery.confidence }
  }

  // Check for SIRE keywords
  if (
    messageLower.includes('sire') ||
    messageLower.includes('cumplimiento') ||
    messageLower.includes('norma') ||
    messageLower.includes('regulación')
  ) {
    return { type: 'sire', confidence: 0.9 }
  }

  // Check for operations keywords
  if (
    messageLower.includes('protocolo') ||
    messageLower.includes('procedimiento') ||
    messageLower.includes('limpieza')
  ) {
    return { type: 'operations', confidence: 0.85 }
  }

  // Check based on search results
  const reservationResults = searchResults.filter(r => r.table === 'guest_reservations')
  const sireResults = searchResults.filter(r => r.table === 'sire_content')
  const operationsResults = searchResults.filter(r => r.table === 'hotel_operations')

  if (reservationResults.length > 0) {
    return { type: 'reservations', confidence: 0.8 }
  }

  if (sireResults.length > operationsResults.length) {
    return { type: 'sire', confidence: 0.7 }
  }

  if (operationsResults.length > 0) {
    return { type: 'operations', confidence: 0.7 }
  }

  return { type: 'general', confidence: 0.5 }
}

function buildSystemPrompt(
  staffSession: StaffSession,
  tenantContext: TenantContextData | null
): string {
  // Build tenant information section
  let tenantInfo = ''
  if (tenantContext) {
    tenantInfo = `\n\nINFORMACIÓN DEL NEGOCIO:
- Nombre: ${tenantContext.business_name}${tenantContext.legal_name ? ` (${tenantContext.legal_name})` : ''}
${tenantContext.address ? `- Dirección: ${tenantContext.address}` : ''}
${tenantContext.phone ? `- Teléfono: ${tenantContext.phone}` : ''}
${tenantContext.email ? `- Email: ${tenantContext.email}` : ''}
${tenantContext.seo_description ? `- Descripción: ${tenantContext.seo_description}` : ''}
${tenantContext.social_media?.whatsapp ? `- WhatsApp: ${tenantContext.social_media.whatsapp}` : ''}
${tenantContext.social_media?.instagram ? `- Instagram: ${tenantContext.social_media.instagram}` : ''}
${tenantContext.social_media?.facebook ? `- Facebook: ${tenantContext.social_media.facebook}` : ''}`
  }

  const basePrompt = `Eres un asistente inteligente para el personal del hotel. Tu función es ayudar al staff con:
- Consultas sobre reservas (fechas, huéspedes, contacto, alojamientos)
- Información operativa del hotel
- Procedimientos y protocolos SIRE
- Políticas internas del hotel
- Manuales operativos

IMPORTANTE:
- Responde de manera profesional y concisa
- Si no tienes información suficiente, admítelo honestamente
- Cita las fuentes cuando sea relevante
- Prioriza la seguridad y el cumplimiento normativo
- Cuando respondas sobre reservas, proporciona TODOS los detalles relevantes (nombre, fechas, teléfono, alojamiento, etc.)`

  const roleContext = {
    ceo: '\n\nRol: CEO - Tienes acceso completo a toda la información del hotel, incluyendo reservas, reportes financieros y administrativos. Puedes proporcionar información estratégica y de alto nivel.',
    admin: '\n\nRol: Administrador - Tienes acceso a información operativa y administrativa, incluyendo reservas. Puedes responder sobre gestión diaria, políticas y procedimientos operativos.',
    housekeeper: '\n\nRol: Personal de Housekeeping - Te enfocas en procedimientos operativos, especialmente limpieza, mantenimiento y protocolos SIRE relacionados con housekeeping. También puedes consultar información básica de reservas para saber quiénes llegan.',
  }

  return basePrompt + tenantInfo + (roleContext[staffSession.role] || '')
}

async function generateClaudeResponse(
  message: string,
  history: ConversationMessage[],
  searchResults: VectorSearchResult[],
  staffSession: StaffSession,
  tenantContext: TenantContextData | null
): Promise<{ response: string; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = getAnthropicClient()

  // Build context from search results
  const contextText = searchResults
    .map((result, idx) => {
      const source = result.metadata?.title || result.metadata?.source_file || result.table
      return `[Fuente ${idx + 1}: ${source}]\n${result.content}`
    })
    .join('\n\n---\n\n')

  // Build conversation messages
  const messages: Anthropic.MessageParam[] = []

  // Add history
  history.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  })

  // Add current query with context
  const userMessage = contextText
    ? `CONTEXTO RELEVANTE:\n\n${contextText}\n\n---\n\nPREGUNTA: ${message}`
    : message

  messages.push({
    role: 'user',
    content: userMessage,
  })

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: buildSystemPrompt(staffSession, tenantContext),
    messages,
  })

  const textContent = response.content.find((block: Anthropic.ContentBlock) => block.type === 'text')
  const responseText = textContent && 'text' in textContent ? textContent.text : 'No pude generar una respuesta.'

  return {
    response: responseText,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  }
}

// ============================================================================
// Database Operations
// ============================================================================

async function createConversation(
  staffId: string,
  tenantId: string,
  firstMessage: string
): Promise<string> {
  const supabase = createServerClient()

  // Generate conversation title from first message
  const title = firstMessage.length > 50
    ? firstMessage.substring(0, 47) + '...'
    : firstMessage

  const { data, error } = await supabase
    .from('staff_conversations')
    .insert({
      staff_id: staffId,
      tenant_id: tenantId,
      title,
      category: 'general',
      status: 'active',
    })
    .select('conversation_id')
    .single()

  if (error) {
    console.error('[staff-chat-engine] Error creating conversation:', error)
    throw new Error('Failed to create conversation')
  }

  console.log('[staff-chat-engine] Created conversation:', data.conversation_id)
  return data.conversation_id
}

async function loadConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('staff_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('message_index', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[staff-chat-engine] Error loading history:', error)
    return []
  }

  return (data || []).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    created_at: msg.created_at,
  }))
}

async function saveMessages(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
  sources: VectorSearchResult[],
  intent: { type: string; confidence: number },
  usage: { input_tokens: number; output_tokens: number }
): Promise<void> {
  const supabase = createServerClient()

  // Get current message count for indexing
  const { count } = await supabase
    .from('staff_messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)

  const nextIndex = (count || 0) + 1

  // Save user message
  await supabase.from('staff_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
    message_index: nextIndex,
  })

  // Save assistant message with metadata
  await supabase.from('staff_messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantMessage,
    message_index: nextIndex + 1,
    metadata: {
      sources: sources.slice(0, 5).map(s => ({
        table: s.table,
        id: s.id,
        similarity: s.similarity,
        category: s.metadata?.category,
      })),
      intent,
      token_usage: usage,
      cost_usd: calculateCost(usage.input_tokens, usage.output_tokens),
    },
  })

  console.log('[staff-chat-engine] Saved messages to database')
}

async function updateConversation(conversationId: string, category: string): Promise<void> {
  const supabase = createServerClient()

  await supabase
    .from('staff_conversations')
    .update({
      last_message_at: new Date().toISOString(),
      category,
    })
    .eq('conversation_id', conversationId)
}

function calculateCost(inputTokens: number, outputTokens: number): number {
  // Pricing for claude-haiku-4-5 (as of Oct 2025)
  const INPUT_COST_PER_1M = 1.0
  const OUTPUT_COST_PER_1M = 5.0

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_1M
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M

  return inputCost + outputCost
}
