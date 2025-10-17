import Anthropic from '@anthropic-ai/sdk'

function getAnthropicClient(): Anthropic {
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
  return new Anthropic({
    apiKey: apiKey,
  })
}

export interface PremiumChatIntent {
  type: 'accommodation' | 'tourism' | 'general'
  confidence: number
  reasoning: string
  shouldShowBoth: boolean
  primaryFocus: 'accommodation' | 'tourism' | 'balanced'
  avoidEntities: string[] // Entities that should NOT appear in results
}

/**
 * Detects user intent for Premium Chat using Claude Haiku
 * Determines if user wants accommodation info, tourism info, or both
 */
export async function detectPremiumChatIntent(query: string): Promise<PremiumChatIntent> {
  const prompt = `Analiza esta consulta de usuario sobre San Andrés y determina su intención:

CONSULTA: "${query}"

Clasifica la intención en UNA de estas 3 categorías:

1. **accommodation**: Usuario pregunta ESPECÍFICAMENTE sobre ALOJAMIENTO/HABITACIONES
   - Ejemplos: "habitación con vista", "suite para 4", "amenidades", "precio habitación", "dónde dormir"
   - Keywords: habitación, suite, apartamento, alojamiento, hospedaje, dormir, hotel, precio noche

2. **tourism**: Usuario pregunta ESPECÍFICAMENTE sobre TURISMO/ACTIVIDADES/LUGARES
   - Ejemplos: "buceo", "restaurantes", "playas", "agua de coco", "dónde comer", "qué hacer", "actividades"
   - Keywords: bucear, comer, playa, restaurante, actividad, tour, paseo, visitar, conocer, spot, bar

3. **general**: Usuario necesita EXPLÍCITAMENTE AMBOS tipos (RARO - usa solo si es obvio)
   - Ejemplos: "plan completo: hotel + actividades", "paquete todo incluido", "dónde dormir Y qué hacer"
   - Debe mencionar EXPLÍCITAMENTE ambos aspectos

⚠️ REGLAS ESTRICTAS:
- Si menciona comida/bebida/lugar/actividad → SIEMPRE 'tourism' (NO 'general')
- Si menciona SOLO alojamiento → SIEMPRE 'accommodation' (NO 'general')
- USA 'general' ÚNICAMENTE si menciona EXPLÍCITAMENTE ambos (hotel Y actividades)
- Ante duda entre 'tourism' y 'general' → elige 'tourism'
- Ante duda entre 'accommodation' y 'general' → elige 'accommodation'
- Confidence ALTA (0.85+) para casos claros, BAJA (0.5-0.7) para ambiguos

IMPORTANTE: También incluye "avoidEntities" - qué tipo de resultados NO debe mostrar:
- Si type="tourism" → avoidEntities: ["alojamiento", "habitación", "hotel"]
- Si type="accommodation" → avoidEntities: ["actividad", "restaurante", "tour", "spot"]
- Si type="general" → avoidEntities: []

Responde ÚNICAMENTE con JSON válido:
{
  "type": "tourism",
  "confidence": 0.95,
  "reasoning": "Usuario pregunta por bebida/lugar específico, no menciona alojamiento",
  "shouldShowBoth": false,
  "primaryFocus": "tourism",
  "avoidEntities": ["alojamiento", "habitación", "hotel", "suite", "hospedaje"]
}`

  try {
    const startTime = Date.now()
    const anthropic = getAnthropicClient()

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5", // Fast & cost-effective
      max_tokens: 200,
      temperature: 0.1, // Low temp for consistent classification
      messages: [{ role: "user", content: prompt }]
    })

    const duration = Date.now() - startTime
    console.log(`[Premium Chat Intent] Detected in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(jsonText)

    // Validate and normalize
    const intent: PremiumChatIntent = {
      type: result.type || 'general',
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'Intent detected',
      shouldShowBoth: result.shouldShowBoth ?? (result.type === 'general'),
      primaryFocus: result.primaryFocus || result.type || 'balanced',
      avoidEntities: result.avoidEntities || []
    }

    console.log(`[Premium Chat Intent] Result:`, intent)

    return intent

  } catch (error) {
    console.error('[Premium Chat Intent] Error:', error)

    // Fallback: conservative approach shows both
    return {
      type: 'general',
      confidence: 0.5,
      reasoning: 'Fallback due to intent detection error',
      shouldShowBoth: true,
      primaryFocus: 'balanced',
      avoidEntities: []
    }
  }
}

/**
 * Determines if accommodation search should be performed
 */
export function shouldSearchAccommodation(intent: PremiumChatIntent): boolean {
  return intent.type === 'accommodation' || intent.shouldShowBoth
}

/**
 * Determines if tourism search should be performed
 */
export function shouldSearchTourism(intent: PremiumChatIntent): boolean {
  return intent.type === 'tourism' || intent.shouldShowBoth
}

/**
 * Get search priority order based on intent
 */
export function getSearchPriority(intent: PremiumChatIntent): {
  primary: 'accommodation' | 'tourism' | 'both'
  secondary: 'accommodation' | 'tourism' | null
} {
  if (intent.type === 'general') {
    if (intent.primaryFocus === 'accommodation') {
      return { primary: 'accommodation', secondary: 'tourism' }
    } else if (intent.primaryFocus === 'tourism') {
      return { primary: 'tourism', secondary: 'accommodation' }
    }
    return { primary: 'both', secondary: null }
  }

  return {
    primary: intent.type as 'accommodation' | 'tourism',
    secondary: null
  }
}