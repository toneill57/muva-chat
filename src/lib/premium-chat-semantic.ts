import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ============================================================
// TYPES
// ============================================================

export interface SemanticUnderstanding {
  intent: string
  userContext: string
  expectedEntities: string[]
  avoidEntities: string[]
  semanticKeywords: string[]
  metadataFilters: {
    categoria?: string[]
    zona_tipo?: string[]
    tags?: string[]
  }
  confidence: number
  reasoning: string
}

export interface MultiQuery {
  queries: string[]
  strategy: string
  reasoning: string
}

export interface CuratedResult {
  result: any
  score: number
  reasoning: string
  whyRelevant: string
}

export interface CurationOutput {
  topResults: CuratedResult[]
  rejectedResults: Array<{ name: string; reasoning: string }>
  reasoning: string
}

// ============================================================
// PASO 1: SEMANTIC UNDERSTANDING
// ============================================================

/**
 * Uses Claude Haiku to deeply understand user query semantics
 * Extracts intent, context, expected entities, and metadata filters
 */
export async function semanticUnderstanding(query: string): Promise<SemanticUnderstanding> {
  const prompt = `Analiza esta consulta turística sobre San Andrés y extrae comprensión semántica profunda:

CONSULTA: "${query}"

Tu tarea es entender QUÉ busca realmente el usuario más allá de las palabras literales.

Extrae los siguientes campos:

1. **intent**: ¿Qué busca realmente? (ej: "experiencia local auténtica de bebida", "actividad aventura mar", "alojamiento con vista al mar")
2. **userContext**: ¿Qué tipo de turista es? (ej: "turista experiencial buscando autenticidad", "pareja buscando romance", "familia buscando comodidad")
3. **expectedEntities**: ¿Qué tipos de lugares/servicios espera? Array de strings (incluir: alojamiento, habitaciones, actividades, restaurantes, spots, etc)
4. **avoidEntities**: ¿Qué NO está buscando? Array de strings (ej: si busca actividades, evitar "alojamiento")
5. **semanticKeywords**: Palabras clave semánticas relacionadas (no literales del query)
6. **metadataFilters**: Filtros para la base de datos
   - categoria: Array de categorías válidas ["Spot", "Restaurante", "Actividad", "Alquiler"]
   - zona_tipo: Array de tipos de zona ["playa", "centro", "comercial", "natural"]
   - tags: Array de tags relevantes
7. **confidence**: 0-1, qué tan seguro estás del análisis
8. **reasoning**: Breve explicación de tu análisis

EJEMPLOS:

Query: "agua de coco"
{
  "intent": "experiencia local casual de bebida tradicional",
  "userContext": "turista buscando autenticidad y experiencia local",
  "expectedEntities": ["spots de playa locales", "lugares informales", "vendedores tradicionales"],
  "avoidEntities": ["hoteles", "tours formales", "restaurantes elegantes"],
  "semanticKeywords": ["local", "auténtico", "playa", "casual", "tradicional", "refrescante"],
  "metadataFilters": {
    "categoria": ["Spot"],
    "zona_tipo": ["playa", "costera"],
    "tags": ["local", "bebidas", "casual", "auténtico"]
  },
  "confidence": 0.95,
  "reasoning": "Usuario busca experiencia auténtica de bebida local, no servicio hotelero"
}

Query: "buceo"
{
  "intent": "actividad deportiva acuática de exploración submarina",
  "userContext": "turista aventurero buscando experiencia activa",
  "expectedEntities": ["centros de buceo", "escuelas certificadas", "tours de buceo"],
  "avoidEntities": ["alojamiento", "restaurantes", "spots pasivos"],
  "semanticKeywords": ["submarino", "arrecife", "certificación", "instructores", "equipamiento"],
  "metadataFilters": {
    "categoria": ["Actividad"],
    "tags": ["buceo", "deportes acuáticos", "aventura", "mar"]
  },
  "confidence": 0.98,
  "reasoning": "Consulta clara sobre actividad específica, no necesita alojamiento"
}

Query: "habitación con vista al mar"
{
  "intent": "alojamiento con vista panorámica al océano",
  "userContext": "turista buscando experiencia de descanso con vistas",
  "expectedEntities": ["habitaciones con vista", "suites", "apartamentos frente al mar"],
  "avoidEntities": ["actividades", "restaurantes", "tours"],
  "semanticKeywords": ["vista panorámica", "océano", "balcón", "terraza", "descanso"],
  "metadataFilters": {},
  "confidence": 0.95,
  "reasoning": "Usuario busca específicamente alojamiento, no actividades turísticas"
}

INSTRUCCIONES:
- Piensa en el INTENT real, no solo las palabras
- Sé específico en metadataFilters
- avoidEntities ayuda a eliminar falsos positivos
- confidence alta (0.9+) para queries claros, baja (0.6-0.7) para ambiguos

Responde ÚNICAMENTE con JSON válido:`

  try {
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }]
    })

    const duration = Date.now() - startTime
    console.log(`[Semantic Understanding] Completed in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Extract JSON
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(jsonText)

    const understanding: SemanticUnderstanding = {
      intent: result.intent || 'Unknown intent',
      userContext: result.userContext || 'General tourist',
      expectedEntities: result.expectedEntities || [],
      avoidEntities: result.avoidEntities || [],
      semanticKeywords: result.semanticKeywords || [],
      metadataFilters: result.metadataFilters || {},
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'No reasoning provided'
    }

    console.log(`[Semantic Understanding] Result:`, understanding)

    return understanding

  } catch (error) {
    console.error('[Semantic Understanding] Error:', error)

    // Fallback
    return {
      intent: 'General tourism query',
      userContext: 'Tourist',
      expectedEntities: [],
      avoidEntities: [],
      semanticKeywords: [query],
      metadataFilters: {},
      confidence: 0.3,
      reasoning: 'Fallback due to error'
    }
  }
}

// ============================================================
// PASO 2: MULTI-QUERY GENERATION
// ============================================================

/**
 * Generates 3 semantic query variations to capture different facets
 */
export async function generateMultiQueries(
  originalQuery: string,
  understanding: SemanticUnderstanding
): Promise<MultiQuery> {
  const prompt = `Genera 3 variaciones semánticas de esta consulta para búsqueda vectorial:

CONSULTA ORIGINAL: "${originalQuery}"
INTENT DETECTADO: "${understanding.intent}"
CONTEXTO: "${understanding.userContext}"
KEYWORDS SEMÁNTICOS: ${understanding.semanticKeywords.join(', ')}

Tu tarea: Generar 3 queries diferentes que capturen distintos aspectos del intent.

ESTRATEGIA:
- Query 1: Enfoque directo/literal basado en intent
- Query 2: Enfoque descriptivo/experiencial
- Query 3: Enfoque contextual/situacional

EJEMPLO:

Original: "agua de coco"
Intent: "experiencia local casual de bebida tradicional"

{
  "queries": [
    "spots auténticos playa coco fresco San Andrés bebida local",
    "lugares tradicionales isleños agua coco natural costera",
    "experiencia casual playa bebidas refrescantes locales coco"
  ],
  "strategy": "Capturar: (1) autenticidad+lugar, (2) tradición+producto, (3) experiencia+contexto",
  "reasoning": "Tres ángulos para maximizar recall de spots locales que sirven coco"
}

INSTRUCCIONES:
- Queries deben ser descriptivos (no preguntas)
- Incluir contexto relevante (San Andrés, isla, playa)
- Usar keywords semánticos del understanding
- 8-15 palabras por query

Responde ÚNICAMENTE con JSON válido:`

  try {
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      temperature: 0.3, // Slightly higher for creativity
      messages: [{ role: "user", content: prompt }]
    })

    const duration = Date.now() - startTime
    console.log(`[Multi-Query Generation] Completed in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Extract JSON
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(jsonText)

    const multiQuery: MultiQuery = {
      queries: result.queries || [originalQuery],
      strategy: result.strategy || 'Single query fallback',
      reasoning: result.reasoning || 'No reasoning provided'
    }

    console.log(`[Multi-Query Generation] Generated ${multiQuery.queries.length} queries:`, multiQuery.queries)

    return multiQuery

  } catch (error) {
    console.error('[Multi-Query Generation] Error:', error)

    // Fallback: just use original query
    return {
      queries: [originalQuery],
      strategy: 'Fallback to original query',
      reasoning: 'Error in multi-query generation'
    }
  }
}

// ============================================================
// PASO 4: LLM RESULT CURATION
// ============================================================

/**
 * LLM curates and re-ranks vector search results
 * Selects top 3 most relevant with reasoning
 */
export async function curateResults(
  originalQuery: string,
  understanding: SemanticUnderstanding,
  candidates: any[]
): Promise<CurationOutput> {
  if (candidates.length === 0) {
    return {
      topResults: [],
      rejectedResults: [],
      reasoning: 'No candidates to curate'
    }
  }

  // Format candidates for LLM
  const candidatesText = candidates.map((c, idx) => {
    const businessInfo = c.business_info || {}
    return `${idx + 1}. **${c.title || c.name || 'Unknown'}**
   - Categoría: ${businessInfo.categoria || 'N/A'}
   - Zona: ${businessInfo.zona || 'N/A'}
   - Precio: ${businessInfo.precio || 'N/A'}
   - Descripción: ${(c.description || c.content || '').substring(0, 150)}...
   - Similarity: ${c.similarity?.toFixed(3) || 'N/A'}`
  }).join('\n\n')

  const prompt = `Eres un experto curador de resultados de búsqueda turística para San Andrés.

CONSULTA ORIGINAL: "${originalQuery}"
INTENT DETECTADO: "${understanding.intent}"
CONTEXTO: "${understanding.userContext}"
ENTIDADES ESPERADAS: ${understanding.expectedEntities.join(', ')}
EVITAR: ${understanding.avoidEntities.join(', ')}

CANDIDATOS (${candidates.length}):

${candidatesText}

Tu tarea: Seleccionar los TOP 3 resultados MÁS relevantes al intent del usuario.

CRITERIOS:
1. ¿Responde directamente al intent?
2. ¿Coincide con expectedEntities?
3. ¿NO está en avoidEntities?
4. ¿Es práctico/útil para el usuario?
5. Similarity score (pero no es el único factor)

INSTRUCCIONES:
- Selecciona EXACTAMENTE 3 resultados (o menos si no hay suficientes buenos)
- Ordénalos por relevancia (más relevante primero)
- Explica POR QUÉ cada uno es relevante al intent
- Lista resultados rechazados con razón

Responde ÚNICAMENTE con JSON válido:
{
  "topResults": [
    {
      "candidateIndex": 1,
      "score": 0.95,
      "reasoning": "Razón breve",
      "whyRelevant": "Explicación detallada de por qué responde al intent"
    }
  ],
  "rejectedResults": [
    {
      "candidateIndex": 5,
      "reasoning": "Por qué fue rechazado"
    }
  ],
  "reasoning": "Explicación general de la curaduría"
}`

  try {
    const startTime = Date.now()

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }]
    })

    const duration = Date.now() - startTime
    console.log(`[Result Curation] Completed in ${duration}ms`)

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response type from Claude')
    }

    // Extract JSON
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const result = JSON.parse(jsonText)

    // Map candidate indices to actual results
    const topResults: CuratedResult[] = (result.topResults || []).map((tr: any) => {
      const candidateIdx = tr.candidateIndex - 1 // Convert 1-indexed to 0-indexed
      if (candidateIdx >= 0 && candidateIdx < candidates.length) {
        return {
          result: candidates[candidateIdx],
          score: tr.score || 0.5,
          reasoning: tr.reasoning || '',
          whyRelevant: tr.whyRelevant || ''
        }
      }
      return null
    }).filter(Boolean)

    const rejectedResults = (result.rejectedResults || []).map((rr: any) => {
      const candidateIdx = rr.candidateIndex - 1
      if (candidateIdx >= 0 && candidateIdx < candidates.length) {
        const candidate = candidates[candidateIdx]
        return {
          name: candidate.title || candidate.name || 'Unknown',
          reasoning: rr.reasoning || 'Not specified'
        }
      }
      return null
    }).filter(Boolean)

    const curation: CurationOutput = {
      topResults: topResults.slice(0, 3), // Ensure max 3
      rejectedResults,
      reasoning: result.reasoning || 'Results curated'
    }

    console.log(`[Result Curation] Selected ${curation.topResults.length} top results`)

    return curation

  } catch (error) {
    console.error('[Result Curation] Error:', error)

    // Fallback: return top 3 by similarity
    return {
      topResults: candidates.slice(0, 3).map(c => ({
        result: c,
        score: c.similarity || 0.5,
        reasoning: 'Fallback ranking by similarity',
        whyRelevant: 'Fallback selection'
      })),
      rejectedResults: [],
      reasoning: 'Fallback due to curation error'
    }
  }
}

// ============================================================
// HELPER: Build SQL WHERE clause from metadata filters
// ============================================================

export function buildMetadataFilter(filters: SemanticUnderstanding['metadataFilters']): string {
  const conditions: string[] = []

  if (filters.categoria && filters.categoria.length > 0) {
    const categories = filters.categoria.map(c => `'${c}'`).join(', ')
    conditions.push(`(business_info->>'categoria')::text IN (${categories})`)
  }

  if (filters.zona_tipo && filters.zona_tipo.length > 0) {
    const zonaConditions = filters.zona_tipo.map(z =>
      `(business_info->>'zona_tipo')::text ILIKE '%${z}%'`
    ).join(' OR ')
    conditions.push(`(${zonaConditions})`)
  }

  if (filters.tags && filters.tags.length > 0) {
    // Assuming tags are stored as array in metadata
    const tags = filters.tags.map(t => `'${t}'`).join(', ')
    conditions.push(`tags && ARRAY[${tags}]::text[]`)
  }

  return conditions.length > 0 ? conditions.join(' AND ') : ''
}