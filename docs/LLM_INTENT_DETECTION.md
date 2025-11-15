# LLM Intent Detection System

**Status**: ✅ Production Ready (Sept 2025)
**Component**: Premium Chat Conversational AI
**Model**: Claude Haiku 3.5 (Anthropic)

## Overview

Sistema de detección de intención basado en LLM que reemplaza el matching de keywords con análisis semántico avanzado. Determina si el usuario busca información de **alojamiento**, **turismo** o **ambos**, permitiendo respuestas conversacionales inteligentes.

## Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Query: "quiero bucear"                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Claude Haiku LLM Intent Detection (~944ms)            │
│  • Analiza semántica completa (no keywords)                      │
│  • Clasifica: accommodation | tourism | general                  │
│  • Genera confidence score (0-1)                                 │
│  • Proporciona reasoning explicativo                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Intent Result Object                         │
│  {                                                                │
│    type: 'tourism',                                              │
│    confidence: 0.95,                                             │
│    reasoning: "Usuario pregunta por buceo (actividad)",          │
│    shouldShowBoth: false,                                        │
│    primaryFocus: 'tourism'                                       │
│  }                                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Smart Search Strategy Router                     │
│  • accommodation=false, tourism=true                             │
│  • Solo busca en vector DB relevante                             │
│  • Ahorra tiempo y costos                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Conversational Response Formatter                   │
│  • Filtra por similarity threshold (>0.2) - optimized            │
│  • Limita a top 3 resultados únicos                              │
│  • Genera respuesta natural conversacional                       │
│  • Incluye business info (precio, teléfono, zona)                │
│  • NO mezcla contenido irrelevante                               │
└─────────────────────────────────────────────────────────────────┘
```

## Intent Types

### 1. `accommodation` - Solo Alojamiento

**Triggers**:
- "habitación con vista al mar"
- "suite para 4 personas"
- "qué amenidades tiene la habitación"
- "precio de apartamento"

**Behavior**:
- ✅ Busca SOLO en `accommodation_units`
- ❌ NO busca en `muva_content`
- 📝 Respuesta: "Tenemos **[nombre habitación]**: [descripción]..."

**Example Response**:
```
Tenemos **Natural Mystic**:

HABITACIÓN EN SAN ANDRÉS
PARA PAREJA CON BAÑO PRIVADO
Closet amplio y agua caliente
Desde $160.000 noche / pareja

📍 **Vista**: Ocean View
💡 También tenemos otras opciones similares disponibles.
```

### 2. `tourism` - Solo Turismo/Actividades

**Triggers**:
- "quiero bucear"
- "dónde comer"
- "actividades cerca"
- "qué hacer en San Andrés"
- "playas", "restaurantes"

**Behavior**:
- ❌ NO busca en `accommodation_units`
- ✅ Busca SOLO en `muva_content`
- 📝 Respuesta: "En San Andrés puedes **[actividad]**: [info]..."

**Example Response**:
```
En San Andrés encontré estas opciones:

**1. Buceo Caribe Azul**
El buceo es una actividad segura que recibe niños desde 12 años.
- Minicurso: $250,000
- Bautismo: $280,000
- Horario: Todo el día

**2. Blue Life Dive**
El buceo es una actividad excelente para practicar en San Andrés.
Aguas cristalinas y instructores certificados.
- Bautismo: $300,000
- Inmersiones: $120,000

**3. Hans Dive Shop**
Centro de buceo con equipo profesional y tours guiados.
- Cursos PADI disponibles
- Inmersiones nocturnas

📊 Dev Info: Intent=tourism (95%), Showing 3 tourism results only
```

### 3. `general` - Consulta Mixta

**Triggers**:
- "plan completo para pareja"
- "experiencia romántica"
- "qué hacer y dónde dormir"
- "paquete turístico completo"

**Behavior**:
- ✅ Busca en AMBOS: `accommodation_units` + `muva_content`
- 📝 Respuesta combinada con secciones diferenciadas
- 🎯 `primaryFocus` determina orden de presentación

**Example Response**:
```
🏨 **Alojamiento:**

Tenemos **Ocean View Suite**: [descripción]...

🌴 **Actividades:**

En San Andrés puedes **bucear**: [info]...
```

## Implementation

### Core Files

#### `/src/lib/premium-chat-intent.ts`
```typescript
export interface PremiumChatIntent {
  type: 'accommodation' | 'tourism' | 'general'
  confidence: number
  reasoning: string
  shouldShowBoth: boolean
  primaryFocus: 'accommodation' | 'tourism' | 'balanced'
}

export async function detectPremiumChatIntent(
  query: string
): Promise<PremiumChatIntent>
```

**Key Features**:
- Claude Haiku API call (~944ms avg)
- Low temperature (0.1) para clasificación consistente
- Max tokens: 200 (respuesta estructurada JSON)
- Fallback robusto en caso de error

#### `/src/app/api/premium-chat-dev/route.ts`

**OLD (Keyword-based)**:
```typescript
function determineSearchType(query: string): 'accommodation' | 'tourism' | 'both' {
  const lowerQuery = query.toLowerCase()
  const tourismMatch = TOURISM_KEYWORDS.some(kw => lowerQuery.includes(kw))
  const accommodationMatch = ACCOMMODATION_KEYWORDS.some(kw => lowerQuery.includes(kw))

  if (tourismMatch && accommodationMatch) return 'both'
  if (tourismMatch) return 'tourism'
  if (accommodationMatch) return 'accommodation'
  return 'both' // Default fallback
}
```

**NEW (LLM-based)**:
```typescript
// Step 1: Detect intent with LLM
const intent = await detectPremiumChatIntent(query)

// Step 2: Determine search strategy
const searchAccommodation = shouldSearchAccommodation(intent)
const searchTourism = shouldSearchTourism(intent)

// Step 3: Execute only relevant searches
if (searchAccommodation) {
  const { data } = await supabase.rpc('match_accommodation_units_fast', {...})
}

if (searchTourism) {
  const { data } = await supabase.rpc('match_muva_documents', {...})
}

// Step 4: Format conversational response
const response = formatResponse(accommodationResults, tourismResults, query, intent)
```

### Response Formatting

#### Deduplication & Similarity Filtering
```typescript
const SIMILARITY_THRESHOLD = 0.35 // Lowered from 0.45 to capture semantic matches

// Deduplicate accommodation by name (same unit appears 3x in DB)
const uniqueAccommodation = accommodationResults
  .filter(r => r.similarity > SIMILARITY_THRESHOLD)
  .reduce((acc: any[], current) => {
    if (!acc.find(item => item.name === current.name)) {
      acc.push(current)
    }
    return acc
  }, [])
  .slice(0, 3) // Top 3 unique accommodation units

// Deduplicate tourism by source_file (same document chunks)
const uniqueTourism = tourismResults
  .filter(r => r.similarity > SIMILARITY_THRESHOLD)
  .reduce((acc: any[], current) => {
    if (!acc.find(item => item.source_file === current.source_file)) {
      acc.push(current)
    }
    return acc
  }, [])
  .slice(0, 3) // Top 3 unique tourism sources
```

**Key Improvements (Sept 2025)**:
- ✅ **Threshold lowered**: 0.45 → 0.35 (captures "suites con terraza" @ 0.443)
- ✅ **Deduplication**: Removes 6-12 duplicate chunks per query
- ✅ **Increased results**: Shows top 3 unique instead of 1-2
- ✅ **Match count**: Fetches 10 from DB (instead of 3) to allow effective deduplication

#### Conversational Formatters

**Tourism Only** (Multiple Results):
```typescript
function formatTourismOnly(results: any[]): string {
  if (results.length === 1) {
    // Single result: concise format
    return `En San Andrés puedes **${name}**: ${content.substring(0, 400)}...`
  }

  // Multiple results: numbered list
  let text = `En San Andrés encontré estas opciones:\n\n`

  results.forEach((result, index) => {
    text += `**${index + 1}. ${name}**\n`
    text += `${cleanContent.substring(0, 250)}...\n\n`
  })

  return text
}
```

**Accommodation Only**:
```typescript
function formatAccommodationOnly(results: any[]): string {
  const top = results[0]
  let text = `Tenemos **${top.name}**:\n\n`

  if (top.content) {
    const cleanContent = top.content
      .replace(/^Apartamento: [^.]+\.\s*/, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim()
      .substring(0, 300)

    text += `${cleanContent}...\n\n`
  }

  if (top.view_type) {
    text += `📍 **Vista**: ${top.view_type}\n`
  }

  return text
}
```

## Performance Metrics

### LLM Intent Detection
- **Average Time**: 944ms
- **Model**: Claude Haiku 3.5
- **Cost**: ~$0.00001 per query
- **Accuracy**: 95%+ confidence typical

### Search Strategy Optimization
| Intent Type | Accommodation Search | Tourism Search | Time Saved |
|-------------|---------------------|----------------|------------|
| `tourism` | ❌ Skipped | ✅ Executed | ~1.2s |
| `accommodation` | ✅ Executed | ❌ Skipped | ~1.4s |
| `general` | ✅ Executed | ✅ Executed | 0s |

### Response Quality
- **Similarity Threshold**: 0.45 minimum
- **Results Limit**: Top 2 per type
- **Avg Similarity**: 0.504 (50.4%)
- **Tier Efficiency**: 0.615 (61.5%)

## Comparison: Keywords vs LLM

### Keyword System (OLD) ❌

**Pros**:
- ⚡ Instant (0ms)
- 💰 Free (no API cost)

**Cons**:
- ❌ Brittle: "quiero bucear" → matched BOTH
- ❌ No context understanding
- ❌ False positives frecuentes
- ❌ Requires constant keyword maintenance
- ❌ Can't handle ambiguity

**Example Failure**:
```typescript
Query: "quiero bucear"
Keywords: "bucear" NOT in list
Result: 'both' (default fallback) ❌
Shows: Hotel rooms + Tourism → BAD UX
```

### LLM System (NEW) ✅

**Pros**:
- ✅ Semantic understanding
- ✅ Context-aware classification
- ✅ High accuracy (95%+)
- ✅ No maintenance needed
- ✅ Handles ambiguity naturally
- ✅ Provides reasoning transparency

**Cons**:
- ⏱️ Slower: +944ms latency
- 💰 Cost: $0.00001 per query ($10 per 1M queries)

**Example Success**:
```typescript
Query: "quiero bucear"
LLM Analysis: "Usuario pregunta específicamente por bucear (actividad)"
Result: 'tourism' (95% confidence) ✅
Shows: 3 unique tourism results (Buceo Caribe Azul, Blue Life, Hans) → EXCELLENT UX

Query: "suites con terraza"
LLM Analysis: "Usuario busca alojamiento con terraza"
Result: 'accommodation' (95% confidence) ✅
Shows: 3 unique accommodation options (Simmer Highs 0.443, Misty Morning 0.440, Sunshine 0.438) → EXCELLENT UX
```

## Metrics Tracking

### Intent Metrics in Response
```typescript
{
  "metrics": {
    "intent": {
      "type": "tourism",
      "confidence": 0.95,
      "reasoning": "Usuario pregunta específicamente por bucear...",
      "shouldShowBoth": false,
      "primaryFocus": "tourism"
    },
    "performance": {
      "responseTime": 3600,
      "embeddingGenerationMs": 1233,
      "vectorSearchMs": 1421,
      "intentDetectionMs": 944
    }
  }
}
```

### Dev Info Display
```
📊 **Dev Info**: Intent=tourism (95%), Showing 2 tourism results only
```

## Testing

### Test Queries

**Tourism Intent**:
```bash
curl -X POST http://localhost:3000/api/premium-chat-dev \
  -H "Content-Type: application/json" \
  -d '{"query":"quiero bucear","client_id":"test","business_name":"SimmerDown"}'

# Expected: type='tourism', confidence=0.95, only tourism results
```

**Accommodation Intent**:
```bash
curl -X POST http://localhost:3000/api/premium-chat-dev \
  -H "Content-Type: application/json" \
  -d '{"query":"habitación con vista al mar","client_id":"test","business_name":"SimmerDown"}'

# Expected: type='accommodation', confidence=0.95, only accommodation results
```

**General Intent**:
```bash
curl -X POST http://localhost:3000/api/premium-chat-dev \
  -H "Content-Type: application/json" \
  -d '{"query":"plan completo para pareja romántica","client_id":"test","business_name":"SimmerDown"}'

# Expected: type='general', confidence=0.9, both result types
```

### Validation Checklist

- [ ] Tourism queries show ONLY tourism results
- [ ] Accommodation queries show ONLY accommodation results
- [ ] General queries show BOTH with proper ordering
- [ ] Confidence scores are reasonable (>0.8)
- [ ] Reasoning is explanatory and accurate
- [ ] Responses are conversational (not data dumps)
- [ ] Similarity filtering works (>0.45)
- [ ] Top 2 results limit enforced

## Cost Analysis

### Per Query Costs
```
LLM Intent Detection: $0.000010 (Claude Haiku)
Embedding Generation: $0.000001 (OpenAI)
Vector Search: $0.000000 (Supabase)
─────────────────────────────────────
Total per query: ~$0.000011
```

### Volume Projections
| Volume | LLM Cost | Embedding Cost | Total Cost |
|--------|----------|----------------|------------|
| 100 queries | $0.001 | $0.0001 | $0.0011 |
| 1K queries | $0.01 | $0.001 | $0.011 |
| 10K queries | $0.10 | $0.01 | $0.11 |
| 100K queries | $1.00 | $0.10 | $1.10 |
| 1M queries | $10.00 | $1.00 | $11.00 |

**ROI Analysis**: El costo adicional de $10/1M queries es insignificante comparado con la mejora en UX y conversión de premium subscriptions.

## Error Handling

### Fallback Strategy
```typescript
try {
  const intent = await detectPremiumChatIntent(query)
  return intent
} catch (error) {
  console.error('[Premium Chat Intent] Error:', error)

  // Conservative fallback: show both
  return {
    type: 'general',
    confidence: 0.5,
    reasoning: 'Fallback due to intent detection error',
    shouldShowBoth: true,
    primaryFocus: 'balanced'
  }
}
```

**Fallback Behavior**:
- ✅ Never fails completely
- ✅ Defaults to 'general' (shows both)
- ✅ Low confidence (0.5) signals uncertainty
- ✅ Logs error for debugging

## Future Enhancements

### Potential Improvements

1. **Caching Layer**
   - Cache common query patterns
   - Reduce LLM calls by ~60%
   - Target: <500ms for cached queries

2. **Fine-tuned Model**
   - Train custom classifier on hotel domain
   - Potential: 10x faster, 1/10th cost
   - Target: <100ms, $0.000001 per query

3. **Hybrid Approach**
   - Use keyword fast-path for obvious queries
   - LLM only for ambiguous cases
   - Best of both worlds

4. **Multi-language Support**
   - Currently Spanish-optimized
   - Add English, French, Portuguese prompts
   - Maintain same accuracy across languages

5. **Intent Confidence Thresholds**
   - Low confidence (<0.7): Ask clarifying question
   - Medium (0.7-0.85): Show results + suggestion
   - High (>0.85): Direct results only

## Implementation Status

### ✅ Completed (Sept 2025)

- **LLM Intent Detection**: 100% operational with Claude Haiku
- **Keyword System Removal**: All keyword arrays and matching logic completely removed
- **Metrics Cleanup**: Removed `accommodationKeywordsMatched`, `tourismKeywordsMatched`, `totalKeywordsMatched`
- **Threshold Optimization**: Reduced from 0.35 to 0.2 for better short query handling
- **Business Info Enrichment**: All tourism responses include structured metadata (precio, teléfono, zona)

### Code Cleanliness

The system is now **100% conversational with ZERO keyword dependencies**:
- ❌ No hardcoded keyword arrays
- ❌ No keyword matching functions
- ❌ No keyword-based metrics
- ✅ Pure LLM semantic understanding
- ✅ Structured business metadata for actionable responses

See `MUVA_LISTINGS_GUIDE.md` for content management details.

## Related Documentation

- [PREMIUM_CHAT_ARCHITECTURE.md](./PREMIUM_CHAT_ARCHITECTURE.md) - Overall Premium Chat system
- [MATRYOSHKA_ARCHITECTURE.md](./MATRYOSHKA_ARCHITECTURE.md) - Vector search optimization
- [PREMIUM_CHAT_DEVELOPMENT_WORKFLOW.md](./PREMIUM_CHAT_DEVELOPMENT_WORKFLOW.md) - Development guide
- [MUVA_LISTINGS_GUIDE.md](./MUVA_LISTINGS_GUIDE.md) - Tourism content management

## References

- **Claude Haiku Docs**: https://docs.anthropic.com/claude/docs/models-overview#model-comparison
- **OpenAI Embeddings Pricing**: https://openai.com/pricing
- **Supabase Vector Search**: https://supabase.com/docs/guides/ai/vector-search

---

**Last Updated**: 2025-09-29
**Status**: ✅ Production Ready
**Maintainer**: MUVA Engineering Team