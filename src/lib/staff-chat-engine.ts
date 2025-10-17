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

// ============================================================================
// Configuration
// ============================================================================

let anthropicClient: Anthropic | null = null
let openaiClient: OpenAI | null = null

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
      type: 'sire' | 'operations' | 'admin' | 'general'
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
    // 1. Create or load conversation
    const activeConversationId = conversationId || await createConversation(
      staffSession.staff_id,
      staffSession.tenant_id,
      message
    )

    // 2. Load conversation history
    const history = await loadConversationHistory(activeConversationId)
    console.log('[staff-chat-engine] Loaded history:', history.length, 'messages')

    // 3. Perform vector search
    const searchResults = await performStaffSearch(message, staffSession)
    console.log('[staff-chat-engine] Found', searchResults.length, 'relevant documents')

    // 4. Detect intent
    const intent = detectIntent(message, searchResults)
    console.log('[staff-chat-engine] Detected intent:', intent)

    // 5. Generate response with Claude
    const claudeResponse = await generateClaudeResponse(
      message,
      history,
      searchResults,
      staffSession
    )

    // 6. Save messages to database
    await saveMessages(
      activeConversationId,
      message,
      claudeResponse.response,
      searchResults,
      intent,
      claudeResponse.usage
    )

    // 7. Update conversation metadata
    await updateConversation(activeConversationId, intent.type)

    // 8. Calculate cost
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

// ============================================================================
// Vector Search Functions
// ============================================================================

async function performStaffSearch(
  query: string,
  staffSession: StaffSession
): Promise<VectorSearchResult[]> {
  console.log('[staff-chat-engine] Performing multi-source search')

  const searches: Promise<VectorSearchResult[]>[] = []

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
): { type: 'sire' | 'operations' | 'admin' | 'general'; confidence: number } {
  const messageLower = message.toLowerCase()

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
    messageLower.includes('limpieza') ||
    messageLower.includes('check-in') ||
    messageLower.includes('check-out')
  ) {
    return { type: 'operations', confidence: 0.85 }
  }

  // Check based on search results
  const sireResults = searchResults.filter(r => r.table === 'sire_content')
  const operationsResults = searchResults.filter(r => r.table === 'hotel_operations')

  if (sireResults.length > operationsResults.length) {
    return { type: 'sire', confidence: 0.7 }
  }

  if (operationsResults.length > 0) {
    return { type: 'operations', confidence: 0.7 }
  }

  return { type: 'general', confidence: 0.5 }
}

function buildSystemPrompt(staffSession: StaffSession): string {
  const basePrompt = `Eres un asistente inteligente para el personal del hotel. Tu función es ayudar al staff con:
- Información operativa del hotel
- Procedimientos y protocolos SIRE
- Políticas internas del hotel
- Manuales operativos

IMPORTANTE:
- Responde de manera profesional y concisa
- Si no tienes información suficiente, admítelo honestamente
- Cita las fuentes cuando sea relevante
- Prioriza la seguridad y el cumplimiento normativo`

  const roleContext = {
    ceo: '\n\nRol: CEO - Tienes acceso completo a toda la información del hotel, incluyendo reportes financieros y administrativos. Puedes proporcionar información estratégica y de alto nivel.',
    admin: '\n\nRol: Administrador - Tienes acceso a información operativa y administrativa. Puedes responder sobre gestión diaria, políticas y procedimientos operativos.',
    housekeeper: '\n\nRol: Personal de Housekeeping - Te enfocas en procedimientos operativos, especialmente limpieza, mantenimiento y protocolos SIRE relacionados con housekeeping.',
  }

  return basePrompt + (roleContext[staffSession.role] || '')
}

async function generateClaudeResponse(
  message: string,
  history: ConversationMessage[],
  searchResults: VectorSearchResult[],
  staffSession: StaffSession
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
    system: buildSystemPrompt(staffSession),
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
