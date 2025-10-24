# FASE 4: Code Consolidation - Workflow

**Agente:** @agent-backend-developer
**Tiempo estimado:** 6-8h
**Prioridad:** 🟡 MEDIA
**Estado:** ⏸️ Bloqueada por FASE 3

---

## 🎯 OBJETIVO

Consolidar código duplicado en el sistema de chat, centralizando generación de embeddings, búsquedas vectoriales y logging estructurado.

**Meta:** Reducir duplicación de código en 30% y mejorar mantenibilidad sin degradar performance.

---

## 📋 PRE-REQUISITOS

### Verificaciones Previas

```bash
# 1. Verificar que FASE 3 esté completa
npm run test:e2e
# Todos los tests (14+) deben pasar

# 2. Crear baseline de performance
npm run build
npm run test:e2e -- --reporter=json > test-baseline.json

# 3. Git status limpio
git status
# No debe haber cambios uncommitted importantes
```

**Criterios de inicio:**
- ✅ Suite E2E completa y pasando (FASE 3)
- ✅ Performance baseline documentado
- ✅ Branch limpio para refactor

---

## 🚀 EJECUCIÓN

### Tarea 4.1: Refactor Chat Engine (120 min)

**Objetivo:** Extraer funciones reutilizables del monolito `conversational-chat-engine.ts`.

#### Paso 1: Analizar código actual

```bash
# Ver tamaño y complejidad
wc -l src/lib/conversational-chat-engine.ts
# Actual: ~800 líneas

# Identificar bloques duplicados
grep -n "buildSearchStrategy\|executeParallelSearch" src/lib/conversational-chat-engine.ts
```

#### Paso 2: Crear módulo de estrategias

**Crear:** `src/lib/chat-engine/search-strategy.ts`

```typescript
import { ConversationMessage } from '@/types';

export type SearchDomain = 'muva' | 'hotel_general' | 'unit_manual' | 'all';

export interface SearchStrategy {
  domains: SearchDomain[];
  weights: Record<SearchDomain, number>;
  matchThreshold: number;
  matchCount: number;
}

/**
 * Build search strategy based on conversation context
 */
export function buildSearchStrategy(
  messages: ConversationMessage[],
  userRole: 'guest' | 'staff'
): SearchStrategy {
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content.toLowerCase();

  // Check for operational queries (WiFi, check-out, etc.)
  const isOperationalQuery = /wifi|password|check-?out|check-?in|rules|policies/i.test(query);

  // Check for tourism queries
  const isTourismQuery = /beach|restaurant|tour|activity|place|visit/i.test(query);

  if (userRole === 'guest') {
    if (isOperationalQuery) {
      return {
        domains: ['unit_manual', 'hotel_general'],
        weights: { unit_manual: 0.7, hotel_general: 0.3, muva: 0, all: 0 },
        matchThreshold: 0.3,
        matchCount: 5,
      };
    }

    if (isTourismQuery) {
      return {
        domains: ['muva', 'hotel_general'],
        weights: { muva: 0.6, hotel_general: 0.4, unit_manual: 0, all: 0 },
        matchThreshold: 0.35,
        matchCount: 8,
      };
    }

    // Default: all domains
    return {
      domains: ['all'],
      weights: { unit_manual: 0.4, hotel_general: 0.3, muva: 0.3, all: 0 },
      matchThreshold: 0.3,
      matchCount: 10,
    };
  }

  // Staff queries: focus on hotel operational data
  return {
    domains: ['hotel_general', 'unit_manual'],
    weights: { hotel_general: 0.6, unit_manual: 0.4, muva: 0, all: 0 },
    matchThreshold: 0.25,
    matchCount: 12,
  };
}
```

#### Paso 3: Crear módulo de búsqueda paralela

**Crear:** `src/lib/chat-engine/parallel-search.ts`

```typescript
import { searchMuvaContent } from '@/lib/vector-search/muva';
import { searchHotelGeneral } from '@/lib/vector-search/hotel';
import { searchUnitManuals } from '@/lib/vector-search/unit-manual';
import { SearchStrategy } from './search-strategy';

export interface SearchResult {
  domain: string;
  chunks: Array<{
    content: string;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  executionTime: number;
}

/**
 * Execute parallel vector searches across multiple domains
 */
export async function executeParallelSearch(
  queryEmbedding: number[],
  strategy: SearchStrategy,
  context: {
    tenantId: string;
    hotelId?: string;
    accommodationUnitIds?: string[];
  }
): Promise<SearchResult[]> {
  const startTime = Date.now();

  const searches = strategy.domains.map(async (domain) => {
    const domainStart = Date.now();

    try {
      let chunks = [];

      switch (domain) {
        case 'muva':
          chunks = await searchMuvaContent(
            queryEmbedding,
            strategy.matchThreshold,
            strategy.matchCount
          );
          break;

        case 'hotel_general':
          if (!context.hotelId) break;
          chunks = await searchHotelGeneral(
            queryEmbedding,
            context.hotelId,
            strategy.matchThreshold,
            strategy.matchCount
          );
          break;

        case 'unit_manual':
          if (!context.accommodationUnitIds?.length) break;
          chunks = await searchUnitManuals(
            queryEmbedding,
            context.accommodationUnitIds,
            strategy.matchThreshold,
            strategy.matchCount
          );
          break;

        case 'all':
          // Execute all searches in parallel
          const [muva, hotel, units] = await Promise.all([
            searchMuvaContent(queryEmbedding, strategy.matchThreshold, 3),
            context.hotelId
              ? searchHotelGeneral(queryEmbedding, context.hotelId, strategy.matchThreshold, 3)
              : Promise.resolve([]),
            context.accommodationUnitIds?.length
              ? searchUnitManuals(queryEmbedding, context.accommodationUnitIds, strategy.matchThreshold, 4)
              : Promise.resolve([]),
          ]);
          chunks = [...muva, ...hotel, ...units];
          break;
      }

      return {
        domain,
        chunks,
        executionTime: Date.now() - domainStart,
      };
    } catch (error) {
      console.error(`[ParallelSearch] Error in ${domain}:`, error);
      return {
        domain,
        chunks: [],
        executionTime: Date.now() - domainStart,
      };
    }
  });

  const results = await Promise.all(searches);

  console.log(`[ParallelSearch] Completed in ${Date.now() - startTime}ms:`, {
    totalChunks: results.reduce((sum, r) => sum + r.chunks.length, 0),
    domainBreakdown: results.map(r => ({ domain: r.domain, count: r.chunks.length })),
  });

  return results;
}
```

#### Paso 4: Actualizar chat engine

**Editar:** `src/lib/conversational-chat-engine.ts`

```typescript
import { buildSearchStrategy } from './chat-engine/search-strategy';
import { executeParallelSearch } from './chat-engine/parallel-search';

// Reemplazar implementación inline con imports
export async function processConversationalQuery(
  messages: ConversationMessage[],
  userContext: UserContext
): Promise<string> {
  // ... existing code ...

  // ANTES (inline):
  // const strategy = { ... cientos de líneas ... };
  // const results = await Promise.all([ ... búsquedas duplicadas ... ]);

  // DESPUÉS (limpio):
  const strategy = buildSearchStrategy(messages, userContext.role);
  const searchResults = await executeParallelSearch(queryEmbedding, strategy, {
    tenantId: userContext.tenantId,
    hotelId: userContext.hotelId,
    accommodationUnitIds: userContext.accommodationUnitIds,
  });

  // ... rest of processing ...
}
```

**Validación:**
```bash
npm run build
# Debe compilar sin errores

npm run test:e2e
# Todos los tests deben seguir pasando
```

---

### Tarea 4.2: Centralizar Embeddings Generator (90 min)

**Objetivo:** Crear módulo único para generación de embeddings.

**Crear:** `src/lib/embeddings/generator.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hardcoded model (per stabilization decision)
const EMBEDDING_MODEL = 'text-embedding-3-large' as const;

export interface EmbeddingDimensions {
  balanced: number[]; // 1024d
  standard: number[]; // 1536d
  full: number[]; // 3072d
}

/**
 * Generate Matryoshka embeddings for a text
 *
 * @param text - Input text to embed
 * @returns Object with 3 embedding tiers (1024d, 1536d, 3072d)
 * @throws Error if OpenAI API fails or model is incorrect
 */
export async function generateEmbedding(text: string): Promise<EmbeddingDimensions> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  try {
    // Generate full 3072d embedding
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
      dimensions: 3072,
    });

    const fullEmbedding = response.data[0].embedding;

    if (fullEmbedding.length !== 3072) {
      throw new Error(
        `Unexpected embedding dimension: ${fullEmbedding.length} (expected 3072)`
      );
    }

    return {
      balanced: fullEmbedding.slice(0, 1024),
      standard: fullEmbedding.slice(0, 1536),
      full: fullEmbedding,
    };
  } catch (error) {
    console.error('[EmbeddingGenerator] Error:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate query embedding (balanced tier only)
 *
 * @param query - User query text
 * @returns 1024d embedding for vector search
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const embeddings = await generateEmbedding(query);
  return embeddings.balanced;
}

/**
 * Validate embedding configuration
 */
export function validateEmbeddingConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment');
  }

  if (EMBEDDING_MODEL !== 'text-embedding-3-large') {
    throw new Error('Embedding model must be text-embedding-3-large (hardcoded per ADR)');
  }
}
```

**Validación:**
```bash
# Test manual
npx tsx -e "
import { generateEmbedding } from './src/lib/embeddings/generator';
const result = await generateEmbedding('test query');
console.log('Dimensions:', {
  balanced: result.balanced.length,
  standard: result.standard.length,
  full: result.full.length,
});
"
# Expected: { balanced: 1024, standard: 1536, full: 3072 }
```

---

### Tarea 4.3: Embeddings Validator (60 min)

**Objetivo:** Crear utilidades de validación para embeddings.

**Crear:** `src/lib/embeddings/validator.ts`

```typescript
import { EmbeddingDimensions } from './generator';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate embedding dimensions
 */
export function validateEmbeddingDimensions(
  embeddings: EmbeddingDimensions
): ValidationResult {
  const errors: string[] = [];

  if (embeddings.balanced.length !== 1024) {
    errors.push(`Invalid balanced dimension: ${embeddings.balanced.length} (expected 1024)`);
  }

  if (embeddings.standard.length !== 1536) {
    errors.push(`Invalid standard dimension: ${embeddings.standard.length} (expected 1536)`);
  }

  if (embeddings.full.length !== 3072) {
    errors.push(`Invalid full dimension: ${embeddings.full.length} (expected 3072)`);
  }

  // Verify balanced is subset of standard
  const balancedMatchesStandard = embeddings.balanced.every(
    (val, idx) => Math.abs(val - embeddings.standard[idx]) < 0.0001
  );

  if (!balancedMatchesStandard) {
    errors.push('Balanced embedding is not a subset of standard');
  }

  // Verify standard is subset of full
  const standardMatchesFull = embeddings.standard.every(
    (val, idx) => Math.abs(val - embeddings.full[idx]) < 0.0001
  );

  if (!standardMatchesFull) {
    errors.push('Standard embedding is not a subset of full');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate embedding values (no NaN, Infinity, etc.)
 */
export function validateEmbeddingValues(embedding: number[]): ValidationResult {
  const errors: string[] = [];

  for (let i = 0; i < embedding.length; i++) {
    const val = embedding[i];

    if (isNaN(val)) {
      errors.push(`NaN found at index ${i}`);
      break;
    }

    if (!isFinite(val)) {
      errors.push(`Infinite value found at index ${i}`);
      break;
    }

    if (Math.abs(val) > 1) {
      errors.push(`Value out of range at index ${i}: ${val} (expected -1 to 1)`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation
 */
export function validateEmbedding(embeddings: EmbeddingDimensions): ValidationResult {
  const dimResult = validateEmbeddingDimensions(embeddings);
  if (!dimResult.valid) return dimResult;

  const balancedResult = validateEmbeddingValues(embeddings.balanced);
  if (!balancedResult.valid) return balancedResult;

  const standardResult = validateEmbeddingValues(embeddings.standard);
  if (!standardResult.valid) return standardResult;

  const fullResult = validateEmbeddingValues(embeddings.full);
  if (!fullResult.valid) return fullResult;

  return { valid: true, errors: [] };
}
```

**Crear tests unitarios:** `src/lib/embeddings/__tests__/validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateEmbeddingDimensions, validateEmbeddingValues } from '../validator';

describe('Embedding Validator', () => {
  it('should validate correct dimensions', () => {
    const embeddings = {
      balanced: new Array(1024).fill(0.5),
      standard: new Array(1536).fill(0.5),
      full: new Array(3072).fill(0.5),
    };

    const result = validateEmbeddingDimensions(embeddings);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid dimensions', () => {
    const embeddings = {
      balanced: new Array(512).fill(0.5), // WRONG
      standard: new Array(1536).fill(0.5),
      full: new Array(3072).fill(0.5),
    };

    const result = validateEmbeddingDimensions(embeddings);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid balanced dimension: 512');
  });

  it('should reject NaN values', () => {
    const embedding = [0.1, 0.2, NaN, 0.4];
    const result = validateEmbeddingValues(embedding);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('NaN found');
  });
});
```

---

### Tarea 4.4: Unified Vector Search (90 min)

**Objetivo:** Consolidar RPCs duplicados en módulos unificados.

**Crear:** `src/lib/vector-search/muva.ts`

```typescript
import { supabase } from '@/lib/supabase/client';

export interface MuvaSearchResult {
  content: string;
  similarity: number;
  metadata: {
    source: string;
    section?: string;
  };
}

export async function searchMuvaContent(
  queryEmbedding: number[],
  matchThreshold: number = 0.35,
  matchCount: number = 8
): Promise<MuvaSearchResult[]> {
  const { data, error } = await supabase.rpc('match_muva_content', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('[VectorSearch:MUVA] Error:', error);
    return [];
  }

  return data.map(row => ({
    content: row.chunk_content,
    similarity: row.similarity,
    metadata: {
      source: row.source_file || 'unknown',
      section: row.section_title,
    },
  }));
}
```

**Crear:** `src/lib/vector-search/hotel.ts`

```typescript
import { supabase } from '@/lib/supabase/client';

export interface HotelSearchResult {
  content: string;
  similarity: number;
  metadata: {
    hotelId: string;
    section?: string;
  };
}

export async function searchHotelGeneral(
  queryEmbedding: number[],
  hotelId: string,
  matchThreshold: number = 0.3,
  matchCount: number = 5
): Promise<HotelSearchResult[]> {
  const { data, error } = await supabase.rpc('match_hotel_general_chunks', {
    query_embedding: queryEmbedding,
    p_hotel_id: hotelId,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error('[VectorSearch:Hotel] Error:', error);
    return [];
  }

  return data.map(row => ({
    content: row.chunk_content,
    similarity: row.similarity,
    metadata: {
      hotelId: row.hotel_id,
      section: row.section_title,
    },
  }));
}
```

**Crear:** `src/lib/vector-search/unit-manual.ts`

```typescript
import { supabase } from '@/lib/supabase/client';

export interface UnitManualSearchResult {
  content: string;
  similarity: number;
  metadata: {
    unitId: string;
    unitName: string;
    section?: string;
  };
}

export async function searchUnitManuals(
  queryEmbedding: number[],
  accommodationUnitIds: string[],
  matchThreshold: number = 0.3,
  matchCount: number = 5
): Promise<UnitManualSearchResult[]> {
  // Execute searches in parallel for all units
  const searches = accommodationUnitIds.map(unitId =>
    supabase.rpc('match_unit_manual_chunks', {
      query_embedding: queryEmbedding,
      p_accommodation_unit_id: unitId,
      match_threshold: matchThreshold,
      match_count: matchCount,
    })
  );

  const results = await Promise.all(searches);

  const allChunks: UnitManualSearchResult[] = [];

  results.forEach((result, idx) => {
    if (result.error) {
      console.error(`[VectorSearch:UnitManual] Error for unit ${accommodationUnitIds[idx]}:`, result.error);
      return;
    }

    allChunks.push(
      ...result.data.map(row => ({
        content: row.chunk_content,
        similarity: row.similarity,
        metadata: {
          unitId: accommodationUnitIds[idx],
          unitName: row.section_title?.split(':')[0] || 'Unknown',
          section: row.section_title,
        },
      }))
    );
  });

  // Sort by similarity
  return allChunks.sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);
}
```

---

### Tarea 4.5: Actualizar Scripts (60 min)

**Objetivo:** Migrar scripts para usar embedding generator centralizado.

**Editar:** `scripts/process-accommodation-manuals.js`

```javascript
// ANTES:
// const openai = new OpenAI({ ... });
// const response = await openai.embeddings.create({ ... });

// DESPUÉS:
import { generateEmbedding } from '../src/lib/embeddings/generator.js';

async function processChunk(chunkText) {
  const embeddings = await generateEmbedding(chunkText);

  return {
    embedding_balanced: embeddings.balanced,
    embedding_standard: embeddings.standard,
    embedding_full: embeddings.full,
  };
}
```

**Editar:** `scripts/sync-accommodations-to-public.ts`

```typescript
import { generateEmbedding } from '@/lib/embeddings/generator';

async function syncUnit(unit: AccommodationUnit) {
  // ... existing code ...

  const embeddings = await generateEmbedding(unit.description);

  await supabase.from('accommodation_units_public').upsert({
    ...unit,
    embedding_balanced: embeddings.balanced,
    embedding_full: embeddings.full,
  });
}
```

**Validación:**
```bash
# Test regeneración de embeddings
npm run regenerate:embeddings -- --dry-run

# Debe usar nuevo generator sin errores
```

---

### Tarea 4.6: Verificar Tests E2E Post-Refactor (30 min)

**Objetivo:** Confirmar que refactor no degradó funcionalidad.

```bash
# Ejecutar suite completa 3 veces
for i in {1..3}; do
  echo "Run $i/3"
  npm run test:e2e
done

# Comparar performance con baseline
npm run test:e2e -- --reporter=json > test-after-refactor.json

# Validar diferencia < ±5%
npx tsx -e "
import baseline from './test-baseline.json';
import after from './test-after-refactor.json';

const baselineTime = baseline.suites.reduce((sum, s) => sum + s.duration, 0);
const afterTime = after.suites.reduce((sum, s) => sum + s.duration, 0);

const diff = ((afterTime - baselineTime) / baselineTime) * 100;

console.log('Performance comparison:');
console.log('  Baseline:', baselineTime, 'ms');
console.log('  After refactor:', afterTime, 'ms');
console.log('  Difference:', diff.toFixed(2), '%');

if (Math.abs(diff) > 5) {
  console.error('❌ Performance degraded >5%');
  process.exit(1);
} else {
  console.log('✅ Performance within acceptable range');
}
"
```

---

## ✅ VALIDACIÓN FINAL

### Métricas de Éxito

```bash
# 1. Build exitoso
npm run build
# Expected: 0 errors, 0 warnings

# 2. Tests pasando
npm run test:e2e
# Expected: 14/14 passed

# 3. Código duplicado reducido
npx jscpd src/lib --min-lines 5
# Expected: <10% duplicación (era ~30%)

# 4. Performance NO degradado
# Expected: ±5% vs baseline
```

### Checklist

- [ ] `src/lib/chat-engine/search-strategy.ts` creado
- [ ] `src/lib/chat-engine/parallel-search.ts` creado
- [ ] `src/lib/embeddings/generator.ts` creado
- [ ] `src/lib/embeddings/validator.ts` creado
- [ ] `src/lib/vector-search/*.ts` (3 archivos) creados
- [ ] `conversational-chat-engine.ts` refactorizado (-200 líneas)
- [ ] Scripts actualizados (2 archivos)
- [ ] Tests E2E siguen pasando (100%)
- [ ] Performance ±5% vs baseline

---

## 📝 DOCUMENTACIÓN

Al finalizar, crear:

**Archivo:** `docs/chat-core-stabilization/fase-4/RESULTS.md`

```markdown
# FASE 4 - Resultados

**Completado:** [FECHA]
**Tiempo real:** [HORAS]

## Refactorización Completada

### Módulos Nuevos
- `src/lib/chat-engine/` (2 archivos, 350 líneas)
- `src/lib/embeddings/` (2 archivos, 280 líneas)
- `src/lib/vector-search/` (3 archivos, 240 líneas)

### Código Eliminado
- `conversational-chat-engine.ts`: -220 líneas
- Scripts duplicados: -80 líneas

### Métricas
- Duplicación de código: 30% → 8% ✅
- Líneas totales: -10 líneas (consolidación)
- Tests pasando: 14/14 (100%) ✅
- Performance: [DIFF]% vs baseline ✅

## Lecciones Aprendidas
[Documentar problemas encontrados durante refactor]
```

---

## 🔄 PRÓXIMO PASO

Una vez completada FASE 4:

→ **FASE 5: Documentation Definitiva** (`fase-5/WORKFLOW.md`)

**Tiempo estimado:** 4-6h
