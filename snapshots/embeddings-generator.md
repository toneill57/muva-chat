---
title: "MUVA Chat Embeddings Generator - Snapshot Especializado"
agent: embeddings-generator
last_updated: "2025-11-06"
status: PRODUCTION_READY
---

# 🧬 Embeddings Generator - Snapshot Especializado

**Agent**: @embeddings-generator
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - Matryoshka 3-tier

---

## 🎯 CURRENT PROJECT: Chat Core Stabilization (October 24, 2025)

**Status:** ⏸️ Standby - Awaiting FASE 1 diagnosis results
**Priority:** 🟡 CONDITIONAL (only if Path 2A chosen)
**Your Role:** Embedding regeneration specialist (FASE 2 Path 2A)

### Quick Context

**Problem:** Guest chat NO responde WiFi/Policies
**Possible Cause:** Embeddings generados con modelo incorrecto (`text-embedding-3-small` vs `-large`)
**Your Mission IF Path 2A:** Regenerar TODOS los embeddings con modelo correcto

### Your Responsibilities (CONDITIONAL)

**IF FASE 1 diagnosis → Path 2A (Modelo Incorrecto):**

**FASE 2A (Regenerate Embeddings)** - 2-3h estimadas:
- Task 2A.1: Backup chunks actuales (colaboración)
- Task 2A.2: Crear script `regenerate-manual-embeddings.ts` **← YOUR MAIN TASK**
- Task 2A.3: Ejecutar regeneración con logging
- Task 2A.4: Validar embeddings post-regeneración
- **Deliverable:** 265 chunks con embeddings correctos (`text-embedding-3-large`)

**FASE 5 (Documentation)** - 1h estimada:
- Documentar workflow correcto de embedding generation
- Crear runbook "regenerate-embeddings.md"
- **Deliverable:** Proceso documentado para futuras regeneraciones

### Diagnostic Trigger

**You will be invoked IF:**
```sql
-- CHECK 2 from FASE 1 shows:
SELECT octet_length(embedding_balanced::text) FROM accommodation_units_manual_chunks LIMIT 1;
-- Result: < 6000 bytes ← WRONG MODEL DETECTED
```

**Expected:** >6000 bytes for `text-embedding-3-large` 1536d embeddings

### Project Documentation

**Read IF Path 2A chosen:**
- `docs/chat-core-stabilization/chat-core-prompt-workflow.md` - Prompts FASE 2A (Tasks 2A.1-2A.4)
- `docs/troubleshooting/INCIDENT_20251023_MANUAL_EMBEDDINGS_LOST.md` - EXACT same problem histórico
- `docs/chat-core-stabilization/plan.md` - Full context

### Critical Requirements

**HARDCODED - NO CAMBIAR:**
- Model: `text-embedding-3-large` (NOT `-small`, NOT `-ada-002`)
- Dimensions per tier:
  - embedding (Tier 3): 3072d
  - embedding_balanced (Tier 2): 1536d
  - embedding_fast (Tier 1): 1024d

**Validation:**
- TODOS los chunks deben tener 3 embeddings
- octet_length checks MUST pass post-regeneration
- No NULL embeddings permitidos

### Success Criteria (IF Path 2A)

- ✅ Script `regenerate-manual-embeddings.ts` creado y funcional
- ✅ Dry-run testeado sin errores
- ✅ 265/265 chunks regenerados exitosamente
- ✅ SQL validation: `octet_length(embedding_balanced) > 6000` ✅
- ✅ Guest chat test manual: Responde WiFi correctamente

### Dependencies

**TRIGGERED BY:** @agent-database-agent FASE 1 diagnosis (IF Path 2A)
**COLLABORATES WITH:** @agent-backend-developer (validation Task 2.8)
**UNBLOCKS:** Guest chat funcionalidad completa

---

## 🎯 ARQUITECTURA MATRYOSHKA

### 3-Tier System

| Tier | Dimensiones | Uso | Índice | Cobertura |
|------|-------------|-----|--------|-----------|
| **Tier 1 (Fast)** | 1024d | Ultra-fast searches (tourism, quick queries) | HNSW | 100% |
| **Tier 2 (Balanced)** | 1536d | Balanced performance (policies, general) | HNSW | 100% |
| **Tier 3 (Full)** | 3072d | Full-precision (compliance, complex) | IVFFlat | 100% |

**Modelo:** OpenAI `text-embedding-3-large`

**Performance Targets:**
- Tier 1 (1024d): **< 15ms** (MUVA tourism queries)
- Tier 2 (1536d): **< 40ms** (SIRE compliance queries)
- Tier 3 (3072d): **< 100ms** (complex semantic queries)

---

## 📊 COBERTURA DE EMBEDDINGS

### Estado: 100% en Todas las Tablas Críticas

**Content & Knowledge Base:**
```
sire_content (8 docs)                    # Tier 2+3 (1536d + 3072d)
  ├── embedding_1536 vector(1536)        # HNSW index
  └── embedding_3072 vector(3072)        # IVFFlat index

muva_content (742 docs)                  # Tier 1+3 (1024d + 3072d)
  ├── embedding_1024 vector(1024)        # HNSW index (tourism)
  └── embedding_3072 vector(3072)        # IVFFlat index (complex)

hotel_operations (10 items)              # Tier 2+3 (1536d + 3072d)
  ├── embedding_1536 vector(1536)        # HNSW index
  └── embedding_3072 vector(3072)        # IVFFlat index
```

**Accommodation Data:**
```
hotels.accommodation_units (8 units)     # Tier 1+2 (1024d + 1536d)
  ├── embedding_1024 vector(1024)        # Tourism fast search
  └── embedding_1536 vector(1536)        # Balanced search

hotels.policies (9 policies)             # Tier 1+3 (1024d + 3072d)
  ├── embedding_1024 vector(1024)        # Quick policy search
  └── embedding_3072 vector(3072)        # Detailed analysis

accommodation_units_manual_chunks (38)   # Tier 1+2+3 (ALL tiers)
  ├── embedding_1024 vector(1024)        # Fast search
  ├── embedding_1536 vector(1536)        # Balanced
  └── embedding_3072 vector(3072)        # Full precision
```

**Conversation System:**
```
conversation_memory (10 blocks)          # Tier 1 (1024d)
  └── embedding_1024 vector(1024)        # Fast history search
```

---

## 🔧 EMBEDDING GENERATION WORKFLOW

### 1. Content Preparation
- Extract text from source (markdown, JSON, DB)
- Chunk content if > 8,000 tokens
- Clean and normalize text
- Remove metadata/formatting

### 2. OpenAI API Call
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: text,
  dimensions: 3072  // Full precision
})

const embedding_3072 = response.data[0].embedding
```

### 3. Matryoshka Slicing
```typescript
// Tier 1: First 1024 dimensions
const embedding_1024 = embedding_3072.slice(0, 1024)

// Tier 2: First 1536 dimensions
const embedding_1536 = embedding_3072.slice(0, 1536)

// Tier 3: Full 3072 dimensions (already available)
```

### 4. Database Storage
```sql
INSERT INTO table_name (content, embedding_1024, embedding_1536, embedding_3072)
VALUES ($1, $2, $3, $4)
```

### 5. Index Creation
```sql
-- HNSW for Tier 1 and 2 (fast)
CREATE INDEX idx_embedding_1024 ON table USING hnsw (embedding_1024 vector_cosine_ops);
CREATE INDEX idx_embedding_1536 ON table USING hnsw (embedding_1536 vector_cosine_ops);

-- IVFFlat for Tier 3 (precision)
CREATE INDEX idx_embedding_3072 ON table USING ivfflat (embedding_3072 vector_cosine_ops)
WITH (lists = 100);
```

---

## 📈 PERFORMANCE BENCHMARKS

### Measured Performance (Octubre 2025)

**Tier 1 (1024d HNSW):**
- Tourism queries (MUVA): **~12ms** ✅
- Accommodation search: **~8ms** ✅
- Policy quick search: **~10ms** ✅

**Tier 2 (1536d HNSW):**
- SIRE compliance: **~35ms** ✅
- General semantic search: **~30ms** ✅
- Balanced queries: **~28ms** ✅

**Tier 3 (3072d IVFFlat):**
- Complex semantic queries: **~85ms** ✅
- Full-precision compliance: **~90ms** ✅
- Deep analysis: **~95ms** ✅

**All targets met** (< 15ms / < 40ms / < 100ms)

---

## 🔍 VECTOR SEARCH FUNCTIONS

### PostgreSQL Functions (20+ implementadas)

**Multi-tenant hotel search:**
```sql
match_hotels_documents(
  query_embedding vector,
  tenant_id text,
  table_name text,
  threshold float,
  count int
)
```

**SIRE compliance search:**
```sql
match_sire_documents(
  query_embedding vector,
  threshold float,
  count int
)
```

**MUVA tourism search:**
```sql
match_muva_documents(
  query_embedding vector,
  threshold float,
  count int
)
```

**Conversation memory search:**
```sql
match_conversation_memory(
  query_embedding vector,
  session_id uuid,
  threshold float,
  count int
)
```

**Multi-tier guest search:**
```sql
match_guest_accommodations(
  query_embedding vector,
  tenant_id text,
  tier int,  -- 1, 2, or 3
  threshold float,
  count int
)
```

---

## 🚧 GAPS Y PENDIENTES

### MEDIO
1. **Embedding Quality Monitoring** - No métricas de quality drift
2. **Re-embedding Strategy** - No proceso para content updates
3. **Cost Tracking** - No tracking de OpenAI API costs

### BAJO
1. **Embedding Cache** - No caching para repeated content
2. **Batch Optimization** - No batch processing para efficiency
3. **Vector Compression** - No PQ (Product Quantization) implementado

---

## 📚 DOCUMENTACIÓN

**Architecture:**
- ✅ `MATRYOSHKA_ARCHITECTURE.md` (20KB) - Sistema completo
- ✅ `DATABASE_QUERY_PATTERNS.md` - Vector search functions

**Scripts:**
- ✅ `scripts/populate-embeddings.js` - Generation automation
- ✅ Performance benchmark scripts (varios)

---

## 🔗 COORDINACIÓN

**Trabaja con:**
- `@database-agent` - Para index creation y optimization
- `@backend-developer` - Para integration en chat engines
- `@infrastructure-monitor` - Para performance monitoring

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 COMANDOS ÚTILES

```bash
# Generate embeddings for new content
node scripts/populate-embeddings.js <file_path>

# Benchmark Matryoshka tiers
node scripts/benchmark-matryoshka.js

# Re-index vectors
# (via database agent - see snapshots/database-agent.md)
```

---

## 📊 SNAPSHOTS RELACIONADOS

- 🗄️ Database: `snapshots/database-agent.md`
- 🔧 Backend: `snapshots/backend-developer.md`
- 🖥️ Infraestructura: `snapshots/infrastructure-monitor.md`
