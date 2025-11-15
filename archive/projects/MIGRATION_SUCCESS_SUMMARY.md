# 🎉 Migración Producción → Staging COMPLETADA

**Fecha:** 7 de Noviembre, 2025
**Estado:** ✅ COMPLETADA (47/47 tablas)

---

## ✅ Resultado Final

| Categoría | Tablas | Filas | Estado |
|-----------|--------|-------|--------|
| **Automática** | 45 | 5,928 | ✅ Completado |
| **Manual** | 2 | 245 | ✅ Completado |
| **TOTAL** | **47** | **6,173** | **✅ 100%** |

---

## 📊 Detalles de Migración Manual

### hotels.accommodation_units
- **Filas insertadas:** 26/26 ✅
- **Distribución por tenant:**
  - `2263efba-b62b-417b-a422-a84638bc632f`: 16 units (Tu Casa en el Mar)
  - `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf`: 10 units (Simmer Down)

### accommodation_units_manual_chunks
- **Filas insertadas:** 219/219 ✅
- **Distribución por tenant:**
  - `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf`: 219 chunks (Simmer Down)
- **FK Relationships:** Verificadas ✅
- **Embeddings:** NULL (pendiente regeneración) ⚠️

---

## 🔧 Próximos Pasos: Regenerar Embeddings

### ⚠️ Contexto

Los 219 chunks de `accommodation_units_manual_chunks` tienen las columnas de embeddings en NULL:
- `embedding` (1536 dimensiones)
- `embedding_balanced` (1536 dimensiones)
- `embedding_fast` (512 dimensiones)

**Impacto:** Guest chat NO podrá responder sobre alojamientos hasta regenerar embeddings.

### Opciones de Regeneración

#### Opción 1: Script Automático (RECOMENDADO)

Crear script que regenere embeddings usando OpenAI API:

```typescript
// scripts/regenerate-manual-chunks-embeddings-staging.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const staging = createClient(
  process.env.NEXT_PUBLIC_STAGING_SUPABASE_URL!,
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function regenerateEmbeddings() {
  // 1. Fetch all chunks without embeddings
  const { data: chunks } = await staging
    .from('accommodation_units_manual_chunks')
    .select('id, chunk_content')
    .is('embedding', null);

  console.log(`Found ${chunks?.length || 0} chunks to process`);

  // 2. Generate embeddings in batches
  for (const chunk of chunks || []) {
    // Matryoshka embeddings (3 tamaños)
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunk.chunk_content,
      dimensions: 1536
    });

    const embeddingBalanced = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunk.chunk_content,
      dimensions: 1536
    });

    const embeddingFast = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.chunk_content,
      dimensions: 512
    });

    // 3. Update chunk
    await staging
      .from('accommodation_units_manual_chunks')
      .update({
        embedding: embedding.data[0].embedding,
        embedding_balanced: embeddingBalanced.data[0].embedding,
        embedding_fast: embeddingFast.data[0].embedding
      })
      .eq('id', chunk.id);
  }
}
```

**Costo estimado:** ~219 chunks × 3 embeddings × $0.00013/1K tokens ≈ $0.50 USD

**Comando:**
```bash
pnpm dlx tsx scripts/regenerate-manual-chunks-embeddings-staging.ts
```

#### Opción 2: Copiar desde Producción (NO RECOMENDADO)

⚠️ Requiere conexión simultánea a ambas bases de datos y es extremadamente pesado:

```sql
-- NO EJECUTAR sin aprobación - query muy pesada
WITH prod_embeddings AS (
  SELECT id, embedding, embedding_balanced, embedding_fast
  FROM [PRODUCCIÓN].accommodation_units_manual_chunks
)
UPDATE accommodation_units_manual_chunks staging
SET
  embedding = prod.embedding,
  embedding_balanced = prod.embedding_balanced,
  embedding_fast = prod.embedding_fast
FROM prod_embeddings prod
WHERE staging.id = prod.id;
```

#### Opción 3: Trigger Lazy Loading

Regenerar embeddings on-demand cuando se acceden:

```typescript
// Al detectar chunk sin embeddings en guest chat:
if (!chunk.embedding) {
  // Generar embedding en background
  await regenerateChunkEmbedding(chunk.id);
  // Devolver respuesta genérica mientras tanto
}
```

---

## 🧪 Testing Post-Migración

### 1. Test Multi-tenant Isolation

Verificar que cada tenant solo ve sus datos:

```sql
-- Tenant: Tu Casa en el Mar (2263efba...)
SELECT COUNT(*) FROM hotels.accommodation_units
WHERE tenant_id = '2263efba-b62b-417b-a422-a84638bc632f';
-- Esperado: 16

-- Tenant: Simmer Down (b5c45f51...)
SELECT COUNT(*) FROM hotels.accommodation_units
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Esperado: 10

SELECT COUNT(*) FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Esperado: 219
```

### 2. Test Guest Chat (Después de Regenerar Embeddings)

```bash
# Test endpoint de guest chat
curl -X POST https://hoaiwcueleiemeplrurv.supabase.co/functions/v1/guest-chat \
  -H "Authorization: Bearer STAGING_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Qué apartamentos tienen aire acondicionado?",
    "subdomain": "simmerdown"
  }'
```

**Esperado (ANTES de regenerar embeddings):** Respuesta vacía o error
**Esperado (DESPUÉS de regenerar embeddings):** Lista de apartamentos con AC

### 3. Test Vector Search

```sql
-- Verificar que vector search funciona
SELECT
  chunk_content,
  embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND embedding IS NOT NULL
ORDER BY distance
LIMIT 5;
```

---

## 📁 Archivos Generados

### Scripts de Migración
- ✅ `scripts/copy-prod-to-staging-complete.ts` - Migración automática
- ✅ `scripts/export-hotels-units-sql.ts` - Export SQL hotels schema
- ✅ `scripts/export-manual-chunks-sql.ts` - Export SQL chunks
- ✅ `scripts/verify-manual-migration.ts` - Verificación post-migración
- 🔧 `scripts/regenerate-manual-chunks-embeddings-staging.ts` - PENDIENTE crear

### SQL Files
- ✅ `/tmp/hotels-accommodation-units.sql` - 26 INSERT ejecutados ✅
- ✅ `/tmp/accommodation-units-manual-chunks.sql` - 219 INSERT ejecutados ✅

### Documentación
- ✅ `MANUAL_SQL_COPY_INSTRUCTIONS.md` - Guía paso a paso
- ✅ `MIGRATION_COMPLETION_STATUS.md` - Estado pre-ejecución
- ✅ `MIGRATION_SUCCESS_SUMMARY.md` - Este documento

---

## ✅ Checklist de Finalización

- [x] Migración automática completada (45 tablas, 5,928 filas)
- [x] Archivos SQL generados para tablas manuales
- [x] Documentación de ejecución manual creada
- [x] `hotels.accommodation_units` ejecutado vía SQL Editor (26/26 ✅)
- [x] `accommodation_units_manual_chunks` ejecutado vía SQL Editor (219/219 ✅)
- [x] Verificación de conteos ejecutada (✅ 100% match)
- [ ] **Embeddings regenerados** ⏳ PENDIENTE
- [ ] **Guest chat testeado en staging** ⏳ PENDIENTE

---

## 🚀 Comandos Rápidos

```bash
# Verificar migración
pnpm dlx tsx scripts/verify-manual-migration.ts

# Regenerar embeddings (PENDIENTE crear script)
pnpm dlx tsx scripts/regenerate-manual-chunks-embeddings-staging.ts

# Test guest chat después de embeddings
curl -X POST https://hoaiwcueleiemeplrurv.supabase.co/functions/v1/guest-chat \
  -H "Authorization: Bearer $STAGING_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué apartamentos hay?", "subdomain": "simmerdown"}'
```

---

## 📞 Soporte

### Troubleshooting Guest Chat

**Problema:** Guest chat no responde sobre alojamientos
**Causa:** Embeddings NULL
**Solución:** Regenerar embeddings con Opción 1

**Problema:** Vector search falla
**Causa:** Operador `<=>` no encuentra vectores
**Solución:** Verificar que embeddings fueron regenerados correctamente

### Logs de Migración

```bash
# Ver logs de verificación
cat logs/migration-verification-2025-11-07.log

# Ver script de verificación
cat scripts/verify-manual-migration.ts
```

---

**Última actualización:** 2025-11-07
**Migración ejecutada por:** Claude Code
**Verificación:** ✅ COMPLETADA
**Próximo paso:** Regenerar embeddings para guest chat
