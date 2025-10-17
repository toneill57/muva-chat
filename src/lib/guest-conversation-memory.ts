/**
 * Guest Conversation Memory Management
 * FASE 2.6: Conversation Intelligence
 *
 * Features:
 * - Auto-compaction of old messages (20+ threshold)
 * - Favorites extraction from conversations
 * - Topic change detection → new conversation suggestions
 * - Smart archiving logic
 */

import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from './supabase'

// Lazy initialize Anthropic client
let anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

export interface CompressedBlock {
  summary: string
  timestamp: string
  message_ids: string[]
  message_count: number
  date_range: {
    start: string
    end: string
  }
}

export interface Favorite {
  type: 'place' | 'activity' | 'restaurant' | 'service' | 'event'
  name: string
  description?: string
  url?: string
  timestamp: string
}

export interface TopicSuggestion {
  suggest: boolean
  topic: string
  confidence: number
  reason: string
}

/**
 * Compress a block of old messages using Claude
 */
async function compressMessagesWithClaude(
  messages: Array<{ role: string; content: string; created_at: string }>
): Promise<string> {
  const anthropic = getAnthropicClient()

  const conversationText = messages
    .map((m, i) => `[${i + 1}] ${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const prompt = `Resumir la siguiente conversación en 2-3 oraciones concisas, capturando los puntos clave:

${conversationText}

Instrucciones:
- Resume los temas principales discutidos
- Captura decisiones importantes o lugares mencionados
- Mantén el tono conversacional
- Máximo 3 oraciones

Resumen:`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const summary = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : ''

  return summary
}

/**
 * Auto-compact conversation if message threshold exceeded
 *
 * Threshold: 20 messages
 * Compression: Every 10 messages after threshold
 */
export async function compactConversationIfNeeded(
  conversationId: string
): Promise<{ compacted: boolean; blocksCreated: number }> {
  const supabase = createServerClient()

  // 1. Get conversation metadata
  const { data: conversation, error: convError } = await supabase
    .from('guest_conversations')
    .select('message_count, compressed_history')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    console.error('[conversation-memory] Failed to get conversation:', convError)
    return { compacted: false, blocksCreated: 0 }
  }

  const messageCount = conversation.message_count || 0
  const compressedHistory = conversation.compressed_history || []

  // 2. Check if compaction needed (20+ messages, every 10 messages)
  const THRESHOLD = 20
  const BLOCK_SIZE = 10

  if (messageCount < THRESHOLD) {
    return { compacted: false, blocksCreated: 0 }
  }

  // Only compact every 10 messages after threshold
  if ((messageCount - THRESHOLD) % BLOCK_SIZE !== 0) {
    return { compacted: false, blocksCreated: 0 }
  }

  // 3. Get oldest uncompressed messages
  // Get message IDs that have already been compressed
  const compressedMessageIds = new Set(
    compressedHistory.flatMap((block: CompressedBlock) => block.message_ids)
  )

  const { data: allMessages, error: allMsgError } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (allMsgError || !allMessages || allMessages.length === 0) {
    console.error('[conversation-memory] Failed to get messages:', allMsgError)
    return { compacted: false, blocksCreated: 0 }
  }

  // Filter out already compressed messages
  const uncompressedMessages = allMessages.filter(
    msg => !compressedMessageIds.has(msg.id)
  )

  // Get oldest block to compress
  const messagesToCompress = uncompressedMessages.slice(0, BLOCK_SIZE)

  if (messagesToCompress.length < BLOCK_SIZE) {
    // Not enough messages to compress
    return { compacted: false, blocksCreated: 0 }
  }

  // 4. Compress messages with Claude
  try {
    const summary = await compressMessagesWithClaude(messagesToCompress)

    const compressedBlock: CompressedBlock = {
      summary,
      timestamp: new Date().toISOString(),
      message_ids: messagesToCompress.map(m => m.id),
      message_count: messagesToCompress.length,
      date_range: {
        start: messagesToCompress[0].created_at,
        end: messagesToCompress[messagesToCompress.length - 1].created_at,
      },
    }

    // 5. Update conversation with new compressed block
    const updatedHistory = [...compressedHistory, compressedBlock]

    const { error: updateError } = await supabase
      .from('guest_conversations')
      .update({
        compressed_history: updatedHistory,
      })
      .eq('id', conversationId)

    if (updateError) {
      console.error('[conversation-memory] Failed to update compressed history:', updateError)
      return { compacted: false, blocksCreated: 0 }
    }

    // 6. Optionally: Archive old messages (soft delete or move to archive table)
    // For now, we keep them in chat_messages table

    console.log('[conversation-memory] Compacted:', {
      conversation_id: conversationId,
      messages_compressed: messagesToCompress.length,
      total_blocks: updatedHistory.length,
      summary_preview: summary.substring(0, 50) + '...',
    })

    return { compacted: true, blocksCreated: 1 }

  } catch (error) {
    console.error('[conversation-memory] Compression failed:', error)
    return { compacted: false, blocksCreated: 0 }
  }
}

/**
 * Detect topic changes and suggest new conversation
 *
 * Logic:
 * - Analyze last 10 messages
 * - Count mentions of topic keywords
 * - If 2+ mentions of same topic → suggest new conversation
 */
export async function suggestNewConversation(
  messages: Array<{ role: string; content: string }>
): Promise<TopicSuggestion> {
  const TOPICS = {
    restaurantes: ['restaurante', 'restaurantes', 'comida', 'cena', 'almuerzo', 'desayuno', 'comer', 'donde comer'],
    playas: ['playa', 'playas', 'mar', 'buceo', 'snorkel', 'surf', 'arena', 'beach'],
    servicios: ['piscina', 'spa', 'gimnasio', 'servicio', 'limpieza', 'toallas', 'amenidades'],
    actividades: ['tour', 'excursión', 'actividad', 'paseo', 'visita', 'diving'],
    transporte: ['taxi', 'transporte', 'uber', 'carro', 'moto', 'bicicleta'],
  }

  // Count topic mentions
  const topicCounts: Record<string, number> = {}

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const contentLower = msg.content.toLowerCase()

      Object.entries(TOPICS).forEach(([topic, keywords]) => {
        const matches = keywords.filter(keyword => contentLower.includes(keyword))
        if (matches.length > 0) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1
        }
      })
    }
  })

  // Find most mentioned topic
  let maxTopic = ''
  let maxCount = 0

  Object.entries(topicCounts).forEach(([topic, count]) => {
    if (count > maxCount) {
      maxTopic = topic
      maxCount = count
    }
  })

  // Suggest if 2+ mentions
  if (maxCount >= 2) {
    return {
      suggest: true,
      topic: maxTopic,
      confidence: Math.min(maxCount / 5, 1.0), // Max confidence at 5 mentions
      reason: `Has mencionado "${maxTopic}" ${maxCount} veces en esta conversación`,
    }
  }

  return {
    suggest: false,
    topic: '',
    confidence: 0,
    reason: 'No se detectaron cambios de tema significativos',
  }
}

/**
 * Add favorite place/activity to conversation
 */
export async function addToFavorites(
  conversationId: string,
  favorite: Favorite
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient()

  // Get current favorites
  const { data: conversation, error: convError } = await supabase
    .from('guest_conversations')
    .select('favorites')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return { success: false, error: 'Conversation not found' }
  }

  const currentFavorites = conversation.favorites || []

  // Check if already favorited
  const alreadyFavorited = currentFavorites.some(
    (f: Favorite) => f.name === favorite.name && f.type === favorite.type
  )

  if (alreadyFavorited) {
    return { success: false, error: 'Already favorited' }
  }

  // Add new favorite
  const updatedFavorites = [
    ...currentFavorites,
    {
      ...favorite,
      timestamp: new Date().toISOString(),
    },
  ]

  const { error: updateError } = await supabase
    .from('guest_conversations')
    .update({ favorites: updatedFavorites })
    .eq('id', conversationId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  console.log('[conversation-memory] Favorite added:', {
    conversation_id: conversationId,
    favorite: favorite.name,
    type: favorite.type,
  })

  return { success: true }
}

/**
 * Get all favorites from conversation
 */
export async function getFavorites(conversationId: string): Promise<Favorite[]> {
  const supabase = createServerClient()

  const { data: conversation, error } = await supabase
    .from('guest_conversations')
    .select('favorites')
    .eq('id', conversationId)
    .single()

  if (error || !conversation) {
    return []
  }

  return conversation.favorites || []
}

/**
 * Remove favorite from conversation
 */
export async function removeFromFavorites(
  conversationId: string,
  favoriteName: string
): Promise<{ success: boolean }> {
  const supabase = createServerClient()

  const { data: conversation, error: convError } = await supabase
    .from('guest_conversations')
    .select('favorites')
    .eq('id', conversationId)
    .single()

  if (convError || !conversation) {
    return { success: false }
  }

  const currentFavorites = conversation.favorites || []
  const updatedFavorites = currentFavorites.filter(
    (f: Favorite) => f.name !== favoriteName
  )

  const { error: updateError } = await supabase
    .from('guest_conversations')
    .update({ favorites: updatedFavorites })
    .eq('id', conversationId)

  return { success: !updateError }
}

/**
 * Get conversations that need archiving (30+ days inactive)
 */
export async function getConversationsToArchive(tenantId?: string): Promise<string[]> {
  const supabase = createServerClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let query = supabase
    .from('guest_conversations')
    .select('id')
    .eq('is_archived', false)
    .lt('last_activity_at', thirtyDaysAgo.toISOString())

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[conversation-memory] Failed to get conversations to archive:', error)
    return []
  }

  return data.map(c => c.id)
}

/**
 * Archive conversation (soft delete)
 */
export async function archiveConversation(conversationId: string): Promise<boolean> {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('guest_conversations')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (error) {
    console.error('[conversation-memory] Failed to archive conversation:', error)
    return false
  }

  console.log('[conversation-memory] Conversation archived:', conversationId)
  return true
}

/**
 * Get conversations to delete (archived 90+ days ago)
 */
export async function getConversationsToDelete(tenantId?: string): Promise<string[]> {
  const supabase = createServerClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  let query = supabase
    .from('guest_conversations')
    .select('id')
    .eq('is_archived', true)
    .lt('archived_at', ninetyDaysAgo.toISOString())

  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[conversation-memory] Failed to get conversations to delete:', error)
    return []
  }

  return data.map(c => c.id)
}

/**
 * Permanently delete conversation (hard delete)
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const supabase = createServerClient()

  // CASCADE will delete associated messages and attachments
  const { error } = await supabase
    .from('guest_conversations')
    .delete()
    .eq('id', conversationId)

  if (error) {
    console.error('[conversation-memory] Failed to delete conversation:', error)
    return false
  }

  console.log('[conversation-memory] Conversation deleted:', conversationId)
  return true
}
