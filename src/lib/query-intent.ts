import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export interface QueryIntent {
  type: 'inventory_complete' | 'specific_unit' | 'feature_inquiry' | 'pricing_inquiry' | 'general'
  confidence: number
  suggested_top_k: number
  tenant_ratio: number
  reasoning: string
}

export interface SearchConfig {
  top_k: number
  tenant_ratio: number
  muva_ratio: number
  priority_domain: 'tenant' | 'muva' | 'balanced'
}

// Configuration mapping based on intent
const INTENT_CONFIG_MAP: Record<QueryIntent['type'], SearchConfig> = {
  inventory_complete: {
    top_k: 12,
    tenant_ratio: 0.9,
    muva_ratio: 0.1,
    priority_domain: 'tenant'
  },
  specific_unit: {
    top_k: 6,
    tenant_ratio: 0.9,
    muva_ratio: 0.1,
    priority_domain: 'tenant'
  },
  feature_inquiry: {
    top_k: 4,
    tenant_ratio: 0.9,
    muva_ratio: 0.1,
    priority_domain: 'tenant'
  },
  pricing_inquiry: {
    top_k: 4,
    tenant_ratio: 0.9,
    muva_ratio: 0.1,
    priority_domain: 'tenant'
  },
  general: {
    top_k: 4,
    tenant_ratio: 0.5,
    muva_ratio: 0.5,
    priority_domain: 'balanced'
  }
}

/**
 * Detects query intent using Claude Haiku (fast, cost-effective)
 */
export async function detectQueryIntent(question: string): Promise<QueryIntent> {
  const prompt = `Analiza esta pregunta de usuario y determina su intención principal:

PREGUNTA: "${question}"

Clasifica la intención en una de estas categorías:

1. **inventory_complete**: Usuario quiere ver TODOS los apartamentos/habitaciones/alojamientos disponibles
   - Palabras clave: "todos", "cuáles", "lista completa", "disponibles", "qué apartamentos hay"

2. **specific_unit**: Usuario pregunta por un apartamento/habitación específico
   - Palabras clave: nombres específicos, "ese apartamento", "la habitación X"

3. **feature_inquiry**: Usuario pregunta por características, amenidades, servicios
   - Palabras clave: "qué incluye", "características", "amenidades", "servicios"

4. **pricing_inquiry**: Usuario pregunta por precios, tarifas, costos
   - Palabras clave: "precio", "costo", "tarifa", "cuánto", "reservar"

5. **general**: Consulta general que no encaja en las anteriores

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "type": "inventory_complete",
  "confidence": 0.95,
  "reasoning": "El usuario usa palabras como 'cuáles apartamentos' que indica querer ver el inventario completo"
}`

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5", // Fast, cost-effective model
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistent classification
      messages: [{
        role: "user",
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    const result = JSON.parse(content.text.trim()) as { type: string; confidence: number; reasoning: string }

    // Validate type is one of the expected values
    const validIntentTypes: QueryIntent['type'][] = ['inventory_complete', 'specific_unit', 'feature_inquiry', 'pricing_inquiry', 'general']
    const intentType: QueryIntent['type'] = validIntentTypes.includes(result.type as QueryIntent['type'])
      ? result.type as QueryIntent['type']
      : 'general'

    // Add search configuration based on detected intent
    const config = INTENT_CONFIG_MAP[intentType]

    return {
      type: intentType,
      confidence: result.confidence,
      suggested_top_k: config.top_k,
      tenant_ratio: config.tenant_ratio,
      reasoning: result.reasoning
    }

  } catch (error) {
    console.error('Error in query intent detection:', error)

    // Fallback to general configuration
    const fallbackConfig = INTENT_CONFIG_MAP.general
    return {
      type: 'general',
      confidence: 0.5,
      suggested_top_k: fallbackConfig.top_k,
      tenant_ratio: fallbackConfig.tenant_ratio,
      reasoning: 'Fallback due to intent detection error'
    }
  }
}

/**
 * Gets optimized search configuration based on query intent
 */
export function getSearchConfig(intent: QueryIntent, hasMuvaAccess: boolean = false): SearchConfig {
  const baseConfig = INTENT_CONFIG_MAP[intent.type]

  // If no MUVA access, give all results to tenant
  if (!hasMuvaAccess) {
    return {
      ...baseConfig,
      tenant_ratio: 1.0,
      muva_ratio: 0.0,
      priority_domain: 'tenant'
    }
  }

  return baseConfig
}

/**
 * Calculates actual search counts based on configuration
 */
export function calculateSearchCounts(config: SearchConfig, maxContextChunks: number = 4) {
  const adjustedMaxChunks = Math.max(config.top_k, maxContextChunks)

  const tenantCount = Math.ceil(adjustedMaxChunks * config.tenant_ratio)
  const muvaCount = Math.floor(adjustedMaxChunks * config.muva_ratio)

  // Ensure we don't exceed total chunks available
  const totalRequested = tenantCount + muvaCount
  if (totalRequested > adjustedMaxChunks) {
    const reduction = totalRequested - adjustedMaxChunks
    const adjustedMuvaCount = Math.max(1, muvaCount - reduction)
    const adjustedTenantCount = adjustedMaxChunks - adjustedMuvaCount

    return {
      tenantCount: adjustedTenantCount,
      muvaCount: adjustedMuvaCount,
      totalCount: adjustedMaxChunks
    }
  }

  return {
    tenantCount,
    muvaCount,
    totalCount: tenantCount + muvaCount
  }
}