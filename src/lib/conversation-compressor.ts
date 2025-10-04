/**
 * Conversation Compressor
 *
 * Intelligent conversation summarization service using Claude Haiku 4.
 * Compresses 10+ messages into semantic summaries with entity extraction.
 * Part of Conversation Memory System (Oct 2025).
 */

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

// ============================================================================
// Configuration
// ============================================================================

// Lazy initialization for Anthropic client
let anthropic: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    })
  }
  return anthropic
}

// Lazy initialization for OpenAI client
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    })
  }
  return openai
}

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ConversationSummary {
  summary: string
  entities: {
    travel_intent: {
      dates?: string
      guests?: number
      preferences: string[]
    }
    topics_discussed: string[]
    key_questions: string[]
  }
}

export interface CompressionResult {
  summary: ConversationSummary
  embedding: number[]
  metadata: {
    compressed_at: string
    message_count: number
    token_usage?: {
      input: number
      output: number
    }
  }
}

// ============================================================================
// Main Compression Function
// ============================================================================

/**
 * Compresses a segment of conversation messages into an intelligent summary.
 *
 * Uses Claude Haiku 4 (cost: ~$0.001 per compression) to generate:
 * - Narrative summary (200 words max)
 * - Extracted entities (travel intent, topics, questions)
 *
 * @param messages - Array of conversation messages (typically 10)
 * @param sessionId - Session identifier for logging
 * @returns ConversationSummary with structured data
 */
export async function compressConversationSegment(
  messages: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<ConversationSummary> {
  const client = getAnthropicClient()

  console.log(`[compressor] Starting compression for session ${sessionId}`, {
    message_count: messages.length,
  })

  // Build conversation text
  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-latest', // Haiku 3.5: $1/1M input, $5/1M output (fast & cheap)
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent extraction
      messages: [
        {
          role: 'user',
          content: `Analiza esta conversacion de chat de hotel y extrae informacion estructurada.

CONVERSACION:
${conversationText}

Responde EXACTAMENTE con este formato JSON (sin markdown, sin texto adicional):

{
  "summary": "Resumen narrativo en español de maximo 200 palabras que capture el contexto de la conversacion",
  "entities": {
    "travel_intent": {
      "dates": "fechas de check-in a check-out si se mencionan (formato: 'YYYY-MM-DD a YYYY-MM-DD'), o null",
      "guests": "numero de huespedes si se menciona, o null",
      "preferences": ["array de preferencias: playa, cocina equipada, vista al mar, etc"]
    },
    "topics_discussed": ["array de temas: precios, disponibilidad, politicas, amenidades"],
    "key_questions": ["array de preguntas del usuario: politica cancelacion, mascotas, etc"]
  }
}

CRITICO: El campo "entities" es OBLIGATORIO. Responde SOLO con JSON válido, sin \`\`\`json ni texto adicional.`,
        },
      ],
    })

    // Extract text content
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Parse JSON response (robust cleaning)
    let jsonText = content.text.trim()

    // Remove markdown code blocks (both ```json and ```)
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
    }

    console.log('[compressor] Raw response preview:', jsonText.substring(0, 200))

    // Parse JSON
    const parsed = JSON.parse(jsonText)

    // Validate required fields BEFORE accessing properties
    if (!parsed.summary || typeof parsed.summary !== 'string') {
      throw new Error(`Missing or invalid 'summary' field in response`)
    }

    if (!parsed.entities || typeof parsed.entities !== 'object') {
      throw new Error(`Missing or invalid 'entities' field in response`)
    }

    if (!Array.isArray(parsed.entities.topics_discussed)) {
      throw new Error(`Missing or invalid 'entities.topics_discussed' array`)
    }

    if (!Array.isArray(parsed.entities.key_questions)) {
      throw new Error(`Missing or invalid 'entities.key_questions' array`)
    }

    if (!parsed.entities.travel_intent || typeof parsed.entities.travel_intent !== 'object') {
      throw new Error(`Missing or invalid 'entities.travel_intent' object`)
    }

    if (!Array.isArray(parsed.entities.travel_intent.preferences)) {
      throw new Error(`Missing or invalid 'entities.travel_intent.preferences' array`)
    }

    // Cast to type after validation
    const result = parsed as ConversationSummary

    console.log('[compressor] ✓ Compression successful:', {
      summary_length: result.summary.length,
      topics: result.entities.topics_discussed.length,
      questions: result.entities.key_questions.length,
      preferences: result.entities.travel_intent.preferences.length,
      token_usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
    })

    return result
  } catch (error) {
    console.error('[compressor] Error during compression:', error)

    // Fallback summary
    const fallbackSummary: ConversationSummary = {
      summary: `Error al comprimir conversacion (${messages.length} mensajes). Contenido no disponible.`,
      entities: {
        travel_intent: {
          preferences: [],
        },
        topics_discussed: ['error_compression'],
        key_questions: [],
      },
    }

    console.warn('[compressor] Using fallback summary due to error')
    return fallbackSummary
  }
}

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generates a 1024-dimensional embedding for a summary text.
 *
 * Uses OpenAI text-embedding-3-large with Matryoshka Tier 1 (1024d).
 * This embedding is used for semantic search of conversation history.
 *
 * @param summaryText - The summary text to embed
 * @returns 1024-dimensional embedding vector
 */
export async function generateEmbeddingForSummary(
  summaryText: string
): Promise<number[]> {
  try {
    const client = getOpenAIClient()

    console.log('[compressor] Generating 1024d embedding for summary:', {
      text_preview: summaryText.substring(0, 50) + '...',
      length: summaryText.length,
    })

    const response = await client.embeddings.create({
      model: 'text-embedding-3-large',
      input: summaryText,
      dimensions: 1024, // Matryoshka Tier 1 (1024d) - DO NOT CHANGE
      encoding_format: 'float',
    })

    const embedding = response.data[0].embedding

    console.log('[compressor] ✓ Embedding generated:', {
      dimensions: embedding.length,
    })

    return embedding
  } catch (error) {
    console.error('[compressor] Error generating embedding:', error)

    // Fallback: dummy 1024d vector
    console.warn('[compressor] Using dummy 1024d embedding as fallback')
    return Array(1024).fill(0.1)
  }
}

// ============================================================================
// Complete Compression Pipeline
// ============================================================================

/**
 * Full compression pipeline: summary + embedding + metadata.
 *
 * Combines compressConversationSegment() and generateEmbeddingForSummary()
 * into a single operation for easy persistence to conversation_memory table.
 *
 * @param messages - Array of conversation messages
 * @param sessionId - Session identifier
 * @returns Complete compression result ready for database insertion
 */
export async function compressAndEmbed(
  messages: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<CompressionResult> {
  const startTime = Date.now()

  console.log('[compressor] Starting full compression pipeline:', {
    session: sessionId,
    messages: messages.length,
  })

  // Step 1: Generate summary
  const summary = await compressConversationSegment(messages, sessionId)

  // Step 2: Generate embedding
  const embedding = await generateEmbeddingForSummary(summary.summary)

  const compressionTime = Date.now() - startTime

  const result: CompressionResult = {
    summary,
    embedding,
    metadata: {
      compressed_at: new Date().toISOString(),
      message_count: messages.length,
    },
  }

  console.log('[compressor] ✓ Full pipeline complete:', {
    duration_ms: compressionTime,
    summary_words: summary.summary.split(' ').length,
    embedding_dims: embedding.length,
  })

  return result
}
