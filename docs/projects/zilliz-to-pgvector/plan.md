# Zilliz → Supabase pgvector Migration - Plan de Implementación

**Proyecto:** Vector Database Migration
**Fecha Inicio:** 9 Octubre 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal

Migrar el semantic code search del MCP server `claude-context` de **Zilliz Cloud** (Milvus serverless) a **Supabase pgvector**, consolidando toda la infraestructura vectorial en PostgreSQL y eliminando dependencias externas.

### ¿Por qué?

**Consolidación de Infraestructura:**
- **Infraestructura unificada**: Todo en Supabase PostgreSQL (database + vectors)
- **Reducción de costos**: Eliminar subscription de Zilliz Cloud (~$20-50/mes)
- **Menor latencia**: Sin llamadas de red externa, todo dentro de Supabase
- **Mejor integración**: Mismo stack que embeddings de premium chat (ya usa pgvector)

**Ventajas Técnicas:**
- **pgvector 0.8.0 ya instalado**: Extension disponible y configurada
- **Performance comparable**: pgvector 0.8.0 tiene HNSW index (similar a Milvus)
- **Mejor debugging**: Queries SQL estándar vs Milvus API
- **RLS nativo**: Row Level Security para multi-tenant si necesario en futuro

**Mantenibilidad:**
- **Un solo sistema**: PostgreSQL para todo (data + vectors)
- **Backups unificados**: Supabase gestiona todo
- **Menos complejidad**: Eliminar configuración de Zilliz Cloud

### Alcance

**INCLUYE:**
- ✅ Schema pgvector en Supabase para code embeddings
- ✅ Migración de embeddings existentes de Zilliz → pgvector
- ✅ Actualización de configuración MCP claude-context
- ✅ Testing de semantic search (comparación performance)
- ✅ Documentación completa del proceso

**NO INCLUYE:**
- ❌ Re-indexar codebase (usamos embeddings existentes)
- ❌ Cambiar modelo de embeddings (mantenemos OpenAI text-embedding-3-small)
- ❌ Modificar premium chat embeddings (ya usa pgvector)

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**Zilliz Cloud (claude-context MCP):**
- ✅ 818 archivos indexados del codebase
- ✅ 33,257 chunks de código con embeddings
- ✅ OpenAI text-embedding-3-small (1536 dimensions)
- ✅ Semantic search funcionando (< 2s respuesta)
- ✅ 90.4% token reduction medido (FASE 6 MCP Optimization)

**Supabase PostgreSQL:**
- ✅ pgvector 0.8.0 instalado y funcional
- ✅ Ya usado para premium chat embeddings (tabla: `conversation_embeddings`)
- ✅ HNSW index disponible (similar performance a Milvus)
- ✅ PostgreSQL 17.4.1.075

**MCP Configuration:**
- ✅ `~/.claude/mcp.json` configurado para Zilliz
- ✅ `claude-context` MCP server activo
- ✅ Storage local: `~/.context/merkle/` (indexing state)

### Limitaciones Actuales

**Zilliz Cloud:**
1. **Dependencia Externa**: Requiere red externa para queries (latencia adicional)
2. **Costo Recurrente**: Subscription mensual (~$20-50/mes)
3. **Infraestructura Fragmentada**: Vectores separados de data relacional
4. **Debugging Limitado**: API propietaria vs SQL estándar
5. **Backups Separados**: No incluido en backups de Supabase

**MCP claude-context:**
1. **Configuración Hardcoded**: URI de Zilliz en config MCP
2. **Sin Fallback**: Si Zilliz falla, semantic search no funciona
3. **No Multi-tenant Ready**: Sin aislamiento por tenant (no necesario ahora, pero limitante futuro)

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Para Desarrolladores (Claude Code):**
- Semantic search idéntico o mejor performance (< 2s)
- Zero cambio en experiencia de usuario (transparente)
- Mejor confiabilidad (sin dependencia de servicio externo)

**Para el Sistema:**
- Todo en Supabase PostgreSQL (data + vectors)
- Queries SQL estándar para debugging
- Backups unificados automáticos
- Infraestructura simplificada (un solo sistema)

### Características Clave

1. **Schema pgvector Optimizado**:
   - Tabla `code_embeddings` con columnas: `id`, `file_path`, `chunk_index`, `content`, `embedding` (vector(1536)), `metadata` (jsonb)
   - HNSW index para búsquedas rápidas
   - Índices en `file_path` para filtros

2. **Migración Sin Downtime**:
   - Exportar embeddings de Zilliz
   - Importar a pgvector
   - Validar integridad (count, sample queries)
   - Actualizar MCP config
   - Testing en paralelo antes de switch

3. **Performance Garantizado**:
   - HNSW index (pgvector 0.8.0) ~ mismo performance que Milvus
   - Target: < 2 segundos para semantic search
   - Medición antes/después

4. **Configuración MCP Actualizada**:
   - Cambiar URI de Zilliz → Supabase en `~/.claude/mcp.json`
   - Mantener misma interfaz de MCP tools
   - Zero cambio en workflow de desarrollo

---

## 📱 TECHNICAL STACK

### Database
- **PostgreSQL**: 17.4.1.075 (Supabase)
- **Extension**: pgvector 0.8.0
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Vector Dimensions**: 1536 (OpenAI text-embedding-3-small)

### Embeddings
- **Provider**: OpenAI text-embedding-3-small (NO CAMBIA)
- **Dimensions**: 1536 (NO CAMBIA)
- **Source**: Embeddings existentes de Zilliz (NO re-indexar)

### MCP Server
- **Server**: claude-context (NO CAMBIA)
- **Tools**: `index_codebase`, `search_code`, `get_indexing_status` (NO CAMBIAN)
- **Config**: `~/.claude/mcp.json` (ACTUALIZAR URI)

### Migration Tools
- **Export**: Zilliz Cloud API (Python SDK)
- **Import**: Supabase SQL + pgvector
- **Validation**: SQL queries + MCP search tests

---

## 🔧 DESARROLLO - FASES

### FASE 1: Schema Setup en Supabase pgvector (1h)

**Objetivo:** Crear schema optimizado en PostgreSQL con pgvector para code embeddings

**Agente:** **@agent-database-agent**

**Entregables:**
1. Migración SQL con tabla `code_embeddings`
2. HNSW index para búsquedas vectoriales
3. Índices adicionales para filtros (file_path, metadata)
4. Validación de schema aplicado

**Archivos a crear:**
- `supabase/migrations/20251009120000_create_code_embeddings_table.sql` (NUEVO)

**Schema SQL:**
```sql
-- Tabla para code embeddings (semantic search)
CREATE TABLE IF NOT EXISTS public.code_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice HNSW para búsquedas vectoriales rápidas
CREATE INDEX code_embeddings_embedding_idx
  ON code_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índice para filtros por archivo
CREATE INDEX code_embeddings_file_path_idx
  ON code_embeddings(file_path);

-- Índice compuesto para búsquedas por archivo + chunk
CREATE UNIQUE INDEX code_embeddings_file_chunk_idx
  ON code_embeddings(file_path, chunk_index);

-- Comentarios
COMMENT ON TABLE code_embeddings IS
  'Stores code embeddings for semantic search via claude-context MCP server. Migrated from Zilliz Cloud Oct 2025.';

COMMENT ON COLUMN code_embeddings.embedding IS
  'OpenAI text-embedding-3-small vector (1536 dimensions)';

COMMENT ON COLUMN code_embeddings.metadata IS
  'Additional metadata (language, LOC, last_modified, etc.)';
```

**Testing:**
- Verificar que migración aplica sin errores
- Verificar que HNSW index se crea correctamente
- Verificar que tabla está vacía (0 rows inicialmente)
- Test de inserción básica (1 embedding de prueba)
- Verificar que búsqueda vectorial funciona (cosine similarity)

**Criterio de éxito:** Schema creado, índices funcionales, test de inserción/búsqueda passing

---

### FASE 2: Export de Embeddings desde Zilliz (1h)

**Objetivo:** Exportar todos los embeddings existentes de Zilliz Cloud a formato compatible con pgvector

**Agente:** **@agent-database-agent**

**Entregables:**
1. Script Python para export de Zilliz
2. Archivo JSONL con embeddings exportados
3. Validación de integridad (count total, sample checks)
4. Documentación del formato de export

**Archivos a crear:**
- `scripts/export-zilliz-embeddings.py` (NUEVO)
- `scripts/validate-zilliz-export.py` (NUEVO)
- `data/code-embeddings-export.jsonl` (NUEVO - gitignored)

**Script de Export:**
```python
# scripts/export-zilliz-embeddings.py
from pymilvus import connections, Collection
import json
import os
from datetime import datetime

# Conectar a Zilliz Cloud
ZILLIZ_URI = os.getenv("ZILLIZ_CLOUD_URI")  # De ~/.claude/mcp.json
ZILLIZ_TOKEN = os.getenv("ZILLIZ_CLOUD_TOKEN")

connections.connect(
    alias="default",
    uri=ZILLIZ_URI,
    token=ZILLIZ_TOKEN
)

# Obtener collection
collection_name = "code_embeddings"  # Nombre usado por claude-context
collection = Collection(collection_name)
collection.load()

# Export todos los embeddings
results = collection.query(
    expr="",  # Sin filtro (todos)
    output_fields=["file_path", "chunk_index", "content", "embedding", "metadata"]
)

# Escribir a JSONL
output_file = "data/code-embeddings-export.jsonl"
os.makedirs("data", exist_ok=True)

with open(output_file, "w") as f:
    for row in results:
        f.write(json.dumps(row) + "\n")

print(f"✅ Exported {len(results)} embeddings to {output_file}")
print(f"Total size: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
```

**Validación:**
```python
# scripts/validate-zilliz-export.py
import json

with open("data/code-embeddings-export.jsonl") as f:
    lines = f.readlines()

print(f"Total embeddings: {len(lines)}")
print(f"Expected: 33,257 (from MCP indexing)")

# Sample check
sample = json.loads(lines[0])
print(f"Sample keys: {sample.keys()}")
print(f"Embedding dimension: {len(sample['embedding'])}")
print(f"Expected dimension: 1536")

# Validar que todos tienen embedding correcto
for i, line in enumerate(lines):
    row = json.loads(line)
    if len(row['embedding']) != 1536:
        print(f"❌ Row {i} has wrong dimension: {len(row['embedding'])}")
        break
else:
    print("✅ All embeddings have correct dimension (1536)")
```

**Testing:**
- Ejecutar script de export
- Verificar que archivo JSONL se crea
- Verificar count total = 33,257 embeddings
- Verificar sample tiene campos correctos
- Ejecutar script de validación

**Criterio de éxito:** 33,257 embeddings exportados, dimensión 1536 verificada, 0 errores

---

### FASE 3: Import de Embeddings a pgvector (1.5h)

**Objetivo:** Importar embeddings exportados a Supabase pgvector con validación de integridad

**Agente:** **@agent-database-agent**

**Entregables:**
1. Script de import optimizado (batch inserts)
2. Validación de integridad post-import
3. Performance benchmark de búsquedas
4. Documentación de proceso

**Archivos a crear:**
- `scripts/import-pgvector-embeddings.ts` (NUEVO)
- `scripts/validate-pgvector-import.sql` (NUEVO)
- `scripts/benchmark-pgvector-search.ts` (NUEVO)

**Script de Import:**
```typescript
// scripts/import-pgvector-embeddings.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importEmbeddings() {
  const fileStream = fs.createReadStream('data/code-embeddings-export.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let batch: any[] = [];
  const BATCH_SIZE = 500;
  let total = 0;

  for await (const line of rl) {
    const row = JSON.parse(line);

    batch.push({
      file_path: row.file_path,
      chunk_index: row.chunk_index,
      content: row.content,
      embedding: row.embedding,
      metadata: row.metadata
    });

    if (batch.length >= BATCH_SIZE) {
      const { error } = await supabase
        .from('code_embeddings')
        .insert(batch);

      if (error) throw error;

      total += batch.length;
      console.log(`✅ Imported ${total} embeddings...`);
      batch = [];
    }
  }

  // Insert remaining
  if (batch.length > 0) {
    const { error } = await supabase
      .from('code_embeddings')
      .insert(batch);

    if (error) throw error;
    total += batch.length;
  }

  console.log(`🎉 Total imported: ${total} embeddings`);
}

importEmbeddings();
```

**Validación SQL:**
```sql
-- scripts/validate-pgvector-import.sql

-- 1. Verificar count total
SELECT COUNT(*) as total_embeddings FROM code_embeddings;
-- Expected: 33,257

-- 2. Verificar dimensión de embeddings
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE array_length(embedding::float[], 1) = 1536) as correct_dimension
FROM code_embeddings;
-- Expected: total = 33,257, correct_dimension = 33,257

-- 3. Verificar archivos únicos
SELECT COUNT(DISTINCT file_path) as unique_files FROM code_embeddings;
-- Expected: 818 (archivos indexados)

-- 4. Sample de embeddings
SELECT
  file_path,
  chunk_index,
  LEFT(content, 100) as content_preview,
  array_length(embedding::float[], 1) as embedding_dim
FROM code_embeddings
LIMIT 5;

-- 5. Verificar metadata
SELECT
  metadata->>'language' as language,
  COUNT(*) as count
FROM code_embeddings
GROUP BY language
ORDER BY count DESC;
```

**Benchmark de Búsqueda:**
```typescript
// scripts/benchmark-pgvector-search.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function benchmarkSearch(query: string) {
  // 1. Generate embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // 2. Search with pgvector
  const start = performance.now();

  const { data, error } = await supabase.rpc('search_code_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 10
  });

  const duration = performance.now() - start;

  if (error) throw error;

  console.log(`Query: "${query}"`);
  console.log(`Results: ${data.length}`);
  console.log(`Duration: ${duration.toFixed(0)}ms`);
  console.log(`Target: < 2000ms`);
  console.log(data[0]); // Sample result

  return duration;
}

// Test queries
const queries = [
  "SIRE compliance validation",
  "matryoshka embeddings implementation",
  "guest authentication logic"
];

async function runBenchmarks() {
  const durations: number[] = [];

  for (const query of queries) {
    const duration = await benchmarkSearch(query);
    durations.push(duration);
    console.log('---');
  }

  const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
  console.log(`\n📊 Average duration: ${avgDuration.toFixed(0)}ms`);
  console.log(avgDuration < 2000 ? '✅ PASS' : '❌ FAIL');
}

runBenchmarks();
```

**RPC Function para Búsqueda:**
```sql
-- Crear función RPC para semantic search
CREATE OR REPLACE FUNCTION search_code_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  file_path TEXT,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.file_path,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM code_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Testing:**
- Ejecutar script de import (batch de 500)
- Ejecutar validación SQL (5 queries)
- Verificar count = 33,257
- Verificar dimensión = 1536 en todos
- Ejecutar benchmark de búsqueda (3 queries)
- Verificar average duration < 2000ms

**Criterio de éxito:** 33,257 embeddings importados, 0 errores, búsquedas < 2s

---

### FASE 4: Actualización de MCP Configuration (30 min)

**Objetivo:** Actualizar configuración de claude-context MCP para usar Supabase pgvector

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. Backup de configuración actual
2. Configuración MCP actualizada
3. Validación de conexión
4. Testing de MCP tools

**Archivos a modificar:**
- `~/.claude/mcp.json` (MODIFICAR - backup primero)

**Configuración Actual (Zilliz):**
```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-context"],
      "env": {
        "ZILLIZ_CLOUD_URI": "https://...",
        "ZILLIZ_CLOUD_TOKEN": "..."
      }
    }
  }
}
```

**Configuración Nueva (pgvector):**
```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-context"],
      "env": {
        "VECTOR_DB_TYPE": "pgvector",
        "PGVECTOR_CONNECTION_STRING": "postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
        "OPENAI_API_KEY": "..."
      }
    }
  }
}
```

**Testing:**
- Crear backup de `~/.claude/mcp.json` → `~/.claude/mcp.json.backup.zilliz`
- Actualizar configuración con credenciales de Supabase
- Reiniciar Claude Code (Cmd+Q → reabrir)
- Ejecutar `/mcp` → Verificar 5/5 servers conectados
- Test MCP tool: `mcp__claude-context__search_code` con query simple

**Criterio de éxito:** MCP conectado a pgvector, búsquedas funcionando

---

### FASE 5: Testing & Validation (1h)

**Objetivo:** Validar que semantic search funciona idéntico o mejor que con Zilliz

**Agente:** **@agent-infrastructure-monitor**

**Entregables:**
1. Comparación performance Zilliz vs pgvector
2. Testing de 5 queries reales del proyecto
3. Validación de resultados (mismos archivos encontrados)
4. Documentación de findings

**Archivos a crear:**
- `docs/projects/zilliz-to-pgvector/PERFORMANCE_COMPARISON.md` (NUEVO)
- `scripts/compare-search-results.ts` (NUEVO)

**Queries de Testing (Mismas de FASE 6 MCP Optimization):**

**Query 1: "SIRE compliance logic"**
- Zilliz: {archivos encontrados, tiempo}
- pgvector: {archivos encontrados, tiempo}
- Comparación: ¿Mismos archivos? ¿Mejor/peor tiempo?

**Query 2: "matryoshka embeddings implementation"**
- Zilliz: {archivos encontrados, tiempo}
- pgvector: {archivos encontrados, tiempo}
- Comparación: ¿Mismos archivos? ¿Mejor/peor tiempo?

**Query 3: "guest authentication flow"**
- Zilliz: {archivos encontrados, tiempo}
- pgvector: {archivos encontrados, tiempo}
- Comparación: ¿Mismos archivos? ¿Mejor/peor tiempo?

**Query 4: "premium chat architecture"**
- Zilliz: {archivos encontrados, tiempo}
- pgvector: {archivos encontrados, tiempo}
- Comparación: ¿Mismos archivos? ¿Mejor/peor tiempo?

**Query 5: "database RLS policies"**
- Zilliz: {archivos encontrados, tiempo}
- pgvector: {archivos encontrados, tiempo}
- Comparación: ¿Mismos archivos? ¿Mejor/peor tiempo?

**Métricas a Medir:**
- **Latencia promedio** (target: < 2000ms)
- **Recall accuracy** (¿encuentra los mismos archivos relevantes?)
- **Resultado ranking** (¿orden de resultados similar?)

**Testing:**
- Ejecutar 5 queries con Zilliz (antes de switch) - REGISTRAR RESULTADOS
- Switch a pgvector
- Ejecutar mismas 5 queries con pgvector - REGISTRAR RESULTADOS
- Comparar resultados (tabla comparativa)
- Documentar en PERFORMANCE_COMPARISON.md

**Criterio de éxito:**
- pgvector latencia ≤ Zilliz latencia (o max +20%)
- pgvector encuentra >= 80% de archivos que Zilliz
- 0 errores en búsquedas

---

### FASE 6: Cleanup & Documentation (30 min)

**Objetivo:** Limpiar recursos de Zilliz y documentar migración completa

**Agente:** **@agent-database-agent**

**Entregables:**
1. Cancelación de subscription Zilliz Cloud
2. Backup final de datos Zilliz (por si acaso)
3. Documentación completa de migración
4. Update de CLAUDE.md y snapshots

**Archivos a crear/modificar:**
- `docs/projects/zilliz-to-pgvector/MIGRATION_GUIDE.md` (NUEVO)
- `CLAUDE.md` (MODIFICAR - actualizar sección MCP)
- `snapshots/database-agent.md` (MODIFICAR - agregar pgvector info)
- `snapshots/infrastructure-monitor.md` (MODIFICAR - remover Zilliz)

**Tareas de Cleanup:**
1. **Backup final de Zilliz**:
   - Verificar que export JSONL está completo
   - Crear backup adicional por seguridad
   - Guardar en `data/backups/zilliz-final-backup-{date}.jsonl`

2. **Cancelar Zilliz subscription**:
   - Login a Zilliz Cloud console
   - Pausar/cancelar proyecto
   - Exportar cualquier metadata adicional
   - Screenshot de confirmación

3. **Limpiar configuración local**:
   - Remover `~/.claude/mcp.json.backup.zilliz` después de validar
   - Remover variables de entorno Zilliz de `.env.local` si existen
   - Limpiar `~/.context/merkle/` si tiene referencias Zilliz

**Documentación a Crear:**

**MIGRATION_GUIDE.md:**
```markdown
# Zilliz → pgvector Migration Guide

**Date:** October 9, 2025
**Status:** ✅ Complete

## Summary
Successfully migrated 33,257 code embeddings from Zilliz Cloud to Supabase pgvector.

## Performance Comparison
- Zilliz average latency: Xms
- pgvector average latency: Yms
- Improvement: Z% (or degradation if slower)

## Steps Executed
1. Schema setup (FASE 1)
2. Export from Zilliz (FASE 2)
3. Import to pgvector (FASE 3)
4. MCP config update (FASE 4)
5. Validation (FASE 5)

## Rollback Plan (if needed)
1. Revert ~/.claude/mcp.json to backup
2. Restart Claude Code
3. Zilliz data still available for 30 days
```

**CLAUDE.md Update:**
```markdown
## 🚀 MCP SERVERS CONFIGURADOS (Oct 2025)

**Stack de Optimización de Tokens:**

1. **claude-context** (Semantic Code Search)
   - ~~Indexación: Zilliz Cloud + OpenAI embeddings~~ (DEPRECATED Oct 9, 2025)
   - **Indexación: Supabase pgvector + OpenAI embeddings** (MIGRATED Oct 9, 2025)
   - Storage: PostgreSQL table `code_embeddings` (33,257 chunks)
   - Reducción: ~90.4% tokens en code queries (medido)
   - Tools: index_codebase, search_code, get_indexing_status
   - Performance: < 2s semantic search

**Migration History:**
- Oct 8, 2025: Zilliz Cloud (Milvus serverless)
- Oct 9, 2025: Migrated to Supabase pgvector 0.8.0 (HNSW index)
- Reason: Infrastructure consolidation + cost reduction
```

**Testing:**
- Verificar que documentación está completa
- Verificar que CLAUDE.md menciona pgvector
- Verificar que backup Zilliz existe
- Verificar que subscription cancelada (screenshot)

**Criterio de éxito:** Documentación completa, Zilliz cancelado, 0 referencias a Zilliz en config

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Schema pgvector creado con HNSW index
- [ ] 33,257 embeddings migrados exitosamente
- [ ] Dimensión 1536 verificada en todos los embeddings
- [ ] MCP claude-context conectado a pgvector
- [ ] Semantic search funcionando (5/5 queries passing)
- [ ] RPC function `search_code_embeddings()` funcional

### Performance
- [ ] Búsquedas < 2000ms promedio (target)
- [ ] pgvector latencia ≤ Zilliz latencia + 20%
- [ ] HNSW index creado correctamente
- [ ] Recall accuracy >= 80% vs Zilliz

### Data Integrity
- [ ] Count total = 33,257 embeddings (100% migrados)
- [ ] 0 embeddings con dimensión incorrecta
- [ ] 818 archivos únicos representados
- [ ] Metadata preservada en JSONB

### Infrastructure
- [ ] Zilliz Cloud subscription cancelada
- [ ] Backup final de Zilliz creado
- [ ] MCP config actualizado y funcionando
- [ ] Documentación completa creada

### Documentation
- [ ] MIGRATION_GUIDE.md creado
- [ ] PERFORMANCE_COMPARISON.md con benchmarks
- [ ] CLAUDE.md actualizado (mención de pgvector)
- [ ] Snapshots actualizados (database-agent, infrastructure-monitor)

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (Principal)

**Responsabilidad:** Schema, migrations, export/import de embeddings, validación SQL

**Tareas:**
- **FASE 1**: Crear schema pgvector con HNSW index
- **FASE 2**: Script de export de Zilliz + validación
- **FASE 3**: Script de import a pgvector + benchmark
- **FASE 6**: Cleanup Zilliz, documentación técnica

**Archivos:**
- `supabase/migrations/20251009120000_create_code_embeddings_table.sql`
- `scripts/export-zilliz-embeddings.py`
- `scripts/import-pgvector-embeddings.ts`
- `scripts/validate-pgvector-import.sql`
- `scripts/benchmark-pgvector-search.ts`
- `docs/projects/zilliz-to-pgvector/MIGRATION_GUIDE.md`

**Workflow de Revisión Post-Implementación:**
1. Validar que schema pgvector está optimizado (HNSW index)
2. Verificar que migración de datos fue 100% exitosa
3. Revisar performance de búsquedas vectoriales
4. Proponer optimizaciones adicionales (índices, queries)
5. Documentar findings en `docs/projects/zilliz-to-pgvector/fase-{N}/AGENT_REVIEW.md`

---

### 2. **@agent-infrastructure-monitor** (Secundario)

**Responsabilidad:** MCP configuration, testing de semantic search, performance benchmarks

**Tareas:**
- **FASE 4**: Actualizar MCP config, testing de conexión
- **FASE 5**: Comparación performance Zilliz vs pgvector, validación de resultados

**Archivos:**
- `~/.claude/mcp.json` (actualizar config)
- `docs/projects/zilliz-to-pgvector/PERFORMANCE_COMPARISON.md`
- `scripts/compare-search-results.ts`
- `snapshots/infrastructure-monitor.md` (actualizar)

**Workflow de Revisión Post-Implementación:**
1. Validar que MCP claude-context conecta correctamente
2. Verificar performance de semantic search (< 2s)
3. Comparar resultados Zilliz vs pgvector (recall accuracy)
4. Proponer mejoras en configuración MCP
5. Documentar findings en `docs/projects/zilliz-to-pgvector/fase-{N}/AGENT_REVIEW.md`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/MUVA/
├── supabase/migrations/
│   └── 20251009120000_create_code_embeddings_table.sql (NUEVO)
├── scripts/
│   ├── export-zilliz-embeddings.py (NUEVO)
│   ├── validate-zilliz-export.py (NUEVO)
│   ├── import-pgvector-embeddings.ts (NUEVO)
│   ├── validate-pgvector-import.sql (NUEVO)
│   ├── benchmark-pgvector-search.ts (NUEVO)
│   └── compare-search-results.ts (NUEVO)
├── data/
│   ├── code-embeddings-export.jsonl (NUEVO - gitignored)
│   └── backups/
│       └── zilliz-final-backup-{date}.jsonl (NUEVO - gitignored)
├── docs/projects/zilliz-to-pgvector/
│   ├── plan.md (NUEVO)
│   ├── TODO.md (NUEVO)
│   ├── zilliz-to-pgvector-prompt-workflow.md (NUEVO)
│   ├── MIGRATION_GUIDE.md (NUEVO)
│   ├── PERFORMANCE_COMPARISON.md (NUEVO)
│   ├── fase-1/
│   │   ├── IMPLEMENTATION.md
│   │   ├── CHANGES.md
│   │   ├── TESTS.md
│   │   ├── ISSUES.md
│   │   └── AGENT_REVIEW.md
│   ├── fase-2/
│   ├── fase-3/
│   ├── fase-4/
│   ├── fase-5/
│   └── fase-6/
└── snapshots/
    ├── database-agent.md (MODIFICAR - agregar pgvector)
    └── infrastructure-monitor.md (MODIFICAR - remover Zilliz)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

1. **HNSW Index Performance**:
   - pgvector 0.8.0 usa HNSW (Hierarchical Navigable Small World)
   - Performance comparable a Milvus para < 1M vectors
   - Parámetros: `m = 16` (conexiones), `ef_construction = 64` (calidad)
   - Trade-off: Mayor `m` = mejor recall, pero más memoria

2. **Cosine Similarity**:
   - Operador: `<=>` (cosine distance)
   - Similarity = 1 - distance
   - Threshold: 0.7 (70% similarity mínima)

3. **Batch Insert Optimization**:
   - BATCH_SIZE = 500 embeddings por insert
   - Evita timeout en inserts grandes
   - Progreso visible durante import

4. **Zero Downtime Strategy**:
   - Importar a pgvector ANTES de cambiar MCP config
   - Validar que búsquedas funcionan
   - LUEGO hacer switch de config
   - Rollback fácil (revertir config)

5. **Backup de Seguridad**:
   - Mantener export JSONL por 30 días post-migración
   - Zilliz data disponible 30 días después de cancelar
   - Rollback posible si algo falla

6. **Embeddings NO se Re-generan**:
   - Usar embeddings existentes de Zilliz
   - NO re-indexar codebase (ahorra tiempo + costo OpenAI)
   - Solo si hay problemas de integridad

7. **Connection String Supabase**:
   - Usar **Pooler** (port 6543) para pgvector
   - NO usar port 5432 (direct connection tiene límites)
   - Format: `postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

8. **MCP Server Compatibility**:
   - claude-context MCP debe soportar pgvector backend
   - Si no soporta, considerar fork o PR upstream
   - Alternativa: Crear custom MCP server para pgvector

---

**Última actualización:** 9 Octubre 2025
**Próximo paso:** Crear TODO.md con tareas específicas y luego zilliz-to-pgvector-prompt-workflow.md
