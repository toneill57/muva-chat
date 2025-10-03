/**
 * Context Enhancer
 *
 * Expands ambiguous queries using conversation history and Claude Haiku
 * for fast, cost-effective query understanding.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '@/lib/conversational-chat-engine'

// Lazy initialization to avoid issues in test environment
let anthropic: Anthropic | null = null

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

export interface EnhancedQuery {
  original: string
  enhanced: string
  entities: string[]
  isFollowUp: boolean
  confidence: number
}

// ============================================================================
// Main Enhancement Function
// ============================================================================

/**
 * Enhance query with conversation context using Claude Haiku
 *
 * Examples:
 * - "¿cuánto cuesta?" + history[Blue Life Dive] → "¿cuánto cuesta certificación Blue Life Dive?"
 * - "horario" + history[El Totumasso] → "¿cuál es el horario de El Totumasso?"
 * - "cómo llego" + history[playa Spratt Bight] → "¿cómo llego a playa Spratt Bight?"
 */
export async function enhanceQuery(
  query: string,
  conversationHistory: ChatMessage[]
): Promise<EnhancedQuery> {
  const startTime = Date.now()

  try {
    // STEP 1: Detect if this is a follow-up question
    const isFollowUp = detectFollowUp(query)

    // STEP 2: Extract entities from conversation history
    const historicalEntities = extractEntitiesFromHistory(conversationHistory)

    console.log(`[Context Enhancer] isFollowUp: ${isFollowUp}, historicalEntities:`, historicalEntities)

    // STEP 3: If NOT a follow-up or no history, return original query
    if (!isFollowUp || conversationHistory.length === 0) {
      console.log(`[Context Enhancer] No enhancement needed (standalone query)`)
      return {
        original: query,
        enhanced: query,
        entities: extractSimpleEntities(query),
        isFollowUp: false,
        confidence: 1.0,
      }
    }

    // STEP 4: Build context summary from recent messages
    const contextSummary = buildContextSummary(conversationHistory, historicalEntities)

    // STEP 5: Use Claude Haiku to expand the query
    const enhanced = await expandQueryWithLLM(query, contextSummary)

    const duration = Date.now() - startTime
    console.log(`[Context Enhancer] Enhanced query in ${duration}ms: "${query}" → "${enhanced}"`)

    // STEP 6: Extract entities from enhanced query
    const entities = [...extractSimpleEntities(enhanced), ...historicalEntities]
    const uniqueEntities = Array.from(new Set(entities))

    return {
      original: query,
      enhanced: enhanced,
      entities: uniqueEntities,
      isFollowUp: true,
      confidence: 0.85, // High confidence for LLM-enhanced queries
    }
  } catch (error) {
    console.error('[Context Enhancer] Enhancement error:', error)

    // Fallback: Return original query
    return {
      original: query,
      enhanced: query,
      entities: extractSimpleEntities(query),
      isFollowUp: false,
      confidence: 0.5,
    }
  }
}

// ============================================================================
// Follow-up Detection
// ============================================================================

/**
 * Detect if query is a follow-up question (requires context)
 */
function detectFollowUp(query: string): boolean {
  const lowerQuery = query.toLowerCase().replace(/[¿?]/g, '').trim() // Remove question marks and trim

  // Check for specific patterns that indicate follow-up questions
  const followUpPatterns = [
    // Ambiguous pronouns
    /\b(allá|allí|ahí|eso|esa|ese|esto|esta|este)\b/,

    // Relative references
    /\b(también|tampoco|otro|otra|más|cerca|lejos)\b/,

    // Time-related without context
    /^(horario|hora|cuando|cuándo)\b/,

    // Price/cost without subject
    /^(precio|costo|vale)\b/,
  ]

  // Check basic patterns first
  if (followUpPatterns.some((pattern) => pattern.test(lowerQuery))) {
    return true
  }

  // Check for question words at start BUT exclude if query contains specific locations/names
  const hasQuestionWordStart = /^(cuánto|cuánta|cuántos|cuántas|cómo|dónde|qué tal|cuál)\b/.test(lowerQuery)
  const hasSpecificContext = /\b(san andrés|blue life|totumasso|playa|restaurante|hotel)\b/.test(lowerQuery)

  // If starts with question word but has NO context, it's a follow-up
  if (hasQuestionWordStart && !hasSpecificContext) {
    return true
  }

  // Check for very short questions (< 3 words, likely missing context)
  const wordCount = lowerQuery.split(/\s+/).length
  if (wordCount <= 2) {
    return true
  }

  return false
}

// ============================================================================
// Entity Extraction
// ============================================================================

/**
 * Extract entities from conversation history
 */
function extractEntitiesFromHistory(history: ChatMessage[]): string[] {
  const entities: string[] = []

  // Get last 3 messages (most relevant context)
  const recentHistory = history.slice(-3)

  recentHistory.forEach((message) => {
    // Use saved entities if available
    if (message.entities && message.entities.length > 0) {
      entities.push(...message.entities)
    } else {
      // Extract entities from content
      entities.push(...extractSimpleEntities(message.content))
    }
  })

  // Deduplicate and return
  return Array.from(new Set(entities))
}

/**
 * Extract simple entities from text (named entities, proper nouns)
 */
function extractSimpleEntities(text: string): string[] {
  const entities: string[] = []

  // Pattern 1: Capitalized multi-word phrases (e.g., "Blue Life Dive", "El Totumasso")
  const properNounPattern = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\b/g
  let match
  while ((match = properNounPattern.exec(text)) !== null) {
    entities.push(match[1])
  }

  // Pattern 2: Known tourism keywords (activities, places)
  const knownEntities = [
    'buceo',
    'snorkel',
    'surf',
    'parasailing',
    'yoga',
    'playa',
    'restaurante',
    'bar',
    'hotel',
    'spa',
    'museo',
    'jardín',
    'laguna',
    'acuario',
  ]

  const lowerText = text.toLowerCase()
  knownEntities.forEach((entity) => {
    if (lowerText.includes(entity)) {
      entities.push(entity)
    }
  })

  return Array.from(new Set(entities))
}

// ============================================================================
// Context Summary Building
// ============================================================================

/**
 * Build concise context summary from conversation history
 */
function buildContextSummary(history: ChatMessage[], entities: string[]): string {
  const recentMessages = history.slice(-3) // Last 3 messages

  const messagesSummary = recentMessages
    .map((msg, index) => {
      const role = msg.role === 'user' ? 'Usuario' : 'Asistente'
      const preview = msg.content.substring(0, 150)
      return `${role} [${index + 1}]: ${preview}...`
    })
    .join('\n')

  const entitiesSummary = entities.length > 0 ? `\nEntidades mencionadas: ${entities.join(', ')}` : ''

  return `${messagesSummary}${entitiesSummary}`
}

// ============================================================================
// LLM Query Expansion
// ============================================================================

/**
 * Expand ambiguous query using Claude Haiku
 */
async function expandQueryWithLLM(query: string, contextSummary: string): Promise<string> {
  const prompt = `Tienes esta conversación previa:

${contextSummary}

El usuario ahora pregunta: "${query}"

Esta pregunta es AMBIGUA y necesita contexto de la conversación previa para entenderse.

Tu tarea: Expande la pregunta para que sea CLARA y COMPLETA usando el contexto.

REGLAS:
1. Incluye información relevante del contexto (nombres de lugares, actividades mencionadas)
2. Mantén la intención original de la pregunta
3. Usa lenguaje natural en español
4. Sé conciso (máximo 20 palabras)
5. NO inventes información que no esté en el contexto
6. Si no puedes expandir con certeza, devuelve la pregunta original

EJEMPLOS:
- "¿cuánto cuesta?" → "¿cuánto cuesta la certificación de buceo en Blue Life Dive?"
- "horario" → "¿cuál es el horario de El Totumasso?"
- "cómo llego" → "¿cómo llego a playa Spratt Bight desde mi hotel?"

Responde ÚNICAMENTE con la pregunta expandida (sin explicaciones adicionales):`

  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307', // Fast & cost-effective
      max_tokens: 100,
      temperature: 0.3, // Low temperature for consistent expansions
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Clean up response (remove quotes if present)
    let expanded = content.text.trim()
    expanded = expanded.replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
    expanded = expanded.replace(/^\¿?/, '¿') // Ensure question starts with ¿

    return expanded
  } catch (error) {
    console.error('[Context Enhancer] LLM expansion error:', error)
    // Fallback: return original query
    return query
  }
}

// ============================================================================
// Confidence Scoring
// ============================================================================

/**
 * Calculate confidence score for query enhancement
 */
export function calculateEnhancementConfidence(
  original: string,
  enhanced: string,
  isFollowUp: boolean
): number {
  // If not a follow-up, confidence is 1.0 (no enhancement needed)
  if (!isFollowUp) {
    return 1.0
  }

  // If enhanced query is significantly longer, confidence is higher
  const lengthRatio = enhanced.length / original.length

  if (lengthRatio > 1.5) {
    return 0.9 // High confidence - significant expansion
  } else if (lengthRatio > 1.2) {
    return 0.75 // Medium confidence - moderate expansion
  } else {
    return 0.6 // Lower confidence - minimal expansion
  }
}

// ============================================================================
// Technical Terms Expansion (Opción C)
// ============================================================================

/**
 * Expand technical terms with synonyms to improve embedding quality
 * This helps queries like "clave wifi" match chunks that say "contraseña WiFi"
 */
export function expandTechnicalTerms(query: string): string {
  let expanded = query

  // Technical synonyms dictionary
  const synonyms: Record<string, string[]> = {
    // Authentication & Security
    clave: ['clave', 'contraseña', 'password', 'código'],
    contraseña: ['contraseña', 'clave', 'password'],
    código: ['código', 'clave', 'pin'],
    pin: ['pin', 'código', 'clave'],

    // Connectivity
    wifi: ['wifi', 'wireless', 'internet', 'conexión', 'red'],
    internet: ['internet', 'wifi', 'conexión', 'red'],
    red: ['red', 'wifi', 'conexión'],

    // Appliances & Utilities
    estufa: ['estufa', 'cocina', 'hornilla'],
    nevera: ['nevera', 'refrigerador', 'frigorífico'],
    aire: ['aire acondicionado', 'AC', 'climatización'],
  }

  // Expand each technical term found in query
  const lowerQuery = query.toLowerCase()
  Object.keys(synonyms).forEach((term) => {
    // Check if term appears as whole word
    const regex = new RegExp(`\\b${term}\\b`, 'i')
    if (regex.test(lowerQuery)) {
      // Add synonyms to improve semantic match
      const termSynonyms = synonyms[term].slice(0, 2) // Limit to 2 synonyms to avoid query bloat
      expanded += ` ${termSynonyms.join(' ')}`
    }
  })

  // Log expansion for debugging
  if (expanded !== query) {
    console.log(`[Technical Terms] Expanded: "${query}" → "${expanded}"`)
  }

  return expanded
}

// ============================================================================
// Export Utilities
// ============================================================================

export {
  detectFollowUp,
  extractSimpleEntities,
  extractEntitiesFromHistory,
  buildContextSummary,
}
