/**
 * Dev Chat Intent Extraction
 *
 * Uses Claude Haiku to extract travel intent from user messages
 * in a conversational, natural way.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface TravelIntent {
  check_in: string | null
  check_out: string | null
  guests: number | null
  accommodation_type: string | null
  budget_range: { min: number; max: number } | null
  preferences: string[]
}

/**
 * Get Anthropic client instance
 */
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables')
  }
  return new Anthropic({ apiKey })
}

/**
 * Extract travel intent from a message using Claude Haiku
 *
 * @param message - User message to analyze
 * @returns Extracted travel intent (null for fields not found)
 */
export async function extractTravelIntent(message: string): Promise<TravelIntent> {
  const client = getAnthropicClient()

  // Get current date for month inference
  const today = new Date()
  const currentMonth = today.toLocaleString('es-ES', { month: 'long' })
  const currentYear = today.getFullYear()

  const systemPrompt = `Eres un extractor de información de viaje. Analiza el mensaje del usuario y extrae:

- check_in: Fecha de entrada (formato ISO: YYYY-MM-DD)
- check_out: Fecha de salida (formato ISO: YYYY-MM-DD)
- guests: Número de huéspedes (número entero)
- accommodation_type: Tipo de alojamiento (apartamento, habitación, suite, cabaña, etc.)
- budget_range: Rango de presupuesto {min, max} en USD
- preferences: Array de preferencias (vista al mar, cocina, wifi, etc.)

REGLA IMPORTANTE DE FECHAS:
- Si el usuario menciona SOLO días (ej: "del 7 al 13") SIN especificar mes, asume el mes ACTUAL: ${currentMonth} ${currentYear}
- Ejemplo: Hoy es ${today.toISOString().split('T')[0]} → "del 7 al 13" = ${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-07 a ${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-13
- Si menciona el mes explícitamente (ej: "15 de agosto"), usa ese mes

IMPORTANTE:
- Retorna SOLO los campos que encuentres en el mensaje
- Si NO encuentras información, retorna null para ese campo
- NO inventes ni asumas datos que no estén en el mensaje (excepto mes si aplica la regla)

Retorna SOLO un objeto JSON válido, sin texto adicional.

Formato de respuesta:
{
  "check_in": "YYYY-MM-DD" o null,
  "check_out": "YYYY-MM-DD" o null,
  "guests": número o null,
  "accommodation_type": "tipo" o null,
  "budget_range": {"min": número, "max": número} o null,
  "preferences": ["vista al mar", "cocina"] o []
}`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022', // Haiku 3.5 (rápido y barato)
      max_tokens: 200,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const extracted = JSON.parse(content.text) as TravelIntent

    console.log('[dev-chat-intent] Extracted:', extracted)

    return extracted

  } catch (error) {
    console.error('[dev-chat-intent] Extraction error:', error)

    // Return empty intent on error
    return {
      check_in: null,
      check_out: null,
      guests: null,
      accommodation_type: null,
      budget_range: null,
      preferences: []
    }
  }
}

/**
 * Merge new intent data with existing session intent
 * Only updates fields that are not null in the new intent
 *
 * @param existing - Current session intent
 * @param extracted - Newly extracted intent
 * @returns Merged intent
 */
export function mergeIntent(existing: TravelIntent, extracted: TravelIntent): TravelIntent {
  return {
    check_in: extracted.check_in || existing.check_in,
    check_out: extracted.check_out || existing.check_out,
    guests: extracted.guests || existing.guests,
    accommodation_type: extracted.accommodation_type || existing.accommodation_type,
    budget_range: extracted.budget_range || existing.budget_range,
    preferences: extracted.preferences.length > 0 ? extracted.preferences : existing.preferences
  }
}
