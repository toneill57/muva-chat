# Bug: Tu Casa Mar Accommodations Not Appearing in Chat

**Date:** 2025-01-16
**Status:** ✅ RESOLVED
**Impact:** CRITICAL - Chat no funcional para Tu Casa Mar

---

## Problema

El chat de Tu Casa Mar (http://tucasamar.localhost:3000/) NO mostraba ninguna habitación. Al preguntar "Muéstrame tus habitaciones", el LLM respondía con conocimiento general en lugar de datos de la base de datos.

**Síntomas:**
- ✅ Simmerdown chat funciona (9 unidades)
- ❌ Tu Casa Mar chat no funciona (0 resultados)
- ❌ Pregunta "¿Cotton Cay es una habitación?" → LLM dice "NO, es un islote turístico"

---

## Diagnóstico

### 1. Problema Inicial Identificado
**`populate-embeddings.js` NO inserta en `accommodation_units_public`**

- Script inserta en `hotels.accommodation_units` ✅
- Script NO inserta en `accommodation_units_public` ❌
- Chat usa `accommodation_units_public` para búsquedas

**Evidencia:**
```bash
grep "accommodation_units_public" scripts/populate-embeddings.js
# No matches found ❌
```

**Resultado:**
```sql
SELECT tenant_id, COUNT(*) FROM accommodation_units_public GROUP BY tenant_id;
-- Simmerdown: 9 unidades ✅
-- Tu Casa Mar: 0 unidades ❌
```

### 2. Problema REAL Descubierto
**Modelo de embedding incorrecto**

Después de insertar manualmente con script temporal, el chat SEGUÍA sin funcionar.

**Root Cause:**
- ❌ Script usaba: `text-embedding-3-small` (modelo incorrecto)
- ✅ Chat busca con: `text-embedding-3-large` (modelo correcto)

**Código del problema:**
```typescript
// ❌ INCORRECTO (scripts/insert-tucasamar-to-public.ts v1)
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small', // ← WRONG
  dimensions: 1024,
});
```

**Código correcto:**
```typescript
// ✅ CORRECTO (debe coincidir con public-chat-search.ts)
const response = await openai.embeddings.create({
  model: 'text-embedding-3-large', // ← MATCH search model
  dimensions: 1024,
});
```

**Referencia del código de búsqueda:**
```typescript
// src/lib/public-chat-search.ts:104
const response = await client.embeddings.create({
  model: 'text-embedding-3-large', // ← Chat usa este modelo
  input: text,
  dimensions: dimensions,
});
```

---

## Solución Aplicada

### Paso 1: Insertar Tu Casa Mar en `accommodation_units_public`
```bash
# Crear script temporal: scripts/insert-tucasamar-to-public.ts
set -a && source .env.local && set +a && npx tsx scripts/insert-tucasamar-to-public.ts
```

**Script key points:**
- Modelo: `text-embedding-3-large` (MATCH search)
- Dimensions: 1024 (Tier 1 Matryoshka)
- Tenant ID: `2263efba-b62b-417b-a422-a84638bc632f`
- 6 archivos markdown procesados

### Paso 2: Limpiar Duplicados
```sql
-- Eliminar 11 duplicados de "Kaya" (Simmerdown)
DELETE FROM hotels.accommodation_units WHERE id IN (...);

-- Eliminar 7 duplicados de Tu Casa Mar
DELETE FROM hotels.accommodation_units WHERE id IN (...);
```

**Resultado final:**
```sql
-- hotels.accommodation_units
Tu Casa Mar: 6 unidades únicas ✅
Simmerdown: 9 unidades únicas ✅

-- accommodation_units_public
Tu Casa Mar: 6 unidades únicas ✅
Simmerdown: 9 unidades únicas ✅
```

### Paso 3: Verificación
**Test SQL directo:**
```sql
SELECT id, metadata->>'name' as name, similarity
FROM match_accommodations_public(
  query_embedding := (SELECT embedding_fast FROM accommodation_units_public WHERE name = 'Cotton Cay'),
  p_tenant_id := '2263efba-b62b-417b-a422-a84638bc632f',
  match_threshold := 0.2,
  match_count := 10
);
-- ✅ Retorna 6 unidades con similarity > 0.89
```

**Test en navegador:**
```
User: "Muéstrame todas tus habitaciones disponibles"
Assistant: ✅ Muestra las 6 habitaciones:
1. Rose Cay 🌹
2. Cotton Cay 🏝️
3. Queena Reef 🪸
4. Crab Cay 🦀
5. Haines Cay 🌊
6. Serrana Cay ☀️
```

---

## Lecciones Aprendidas

### 1. **SIEMPRE verificar modelo de embedding**
- Embeddings search DEBE usar mismo modelo que embeddings storage
- `text-embedding-3-small` ≠ `text-embedding-3-large`
- Diferentes modelos = vectores incompatibles = similarity 0

### 2. **Dual table architecture requiere dual insertion**
- `hotels.accommodation_units` - Tabla interna (MotoPress sync)
- `accommodation_units_public` - Tabla de chat (búsqueda vectorial)
- Necesitan procesos de inserción SEPARADOS

### 3. **populate-embeddings.js NO es suficiente**
El script actual:
- ✅ Inserta en `hotels.accommodation_units`
- ❌ NO inserta en `accommodation_units_public`
- Necesita extensión o script separado

---

## Acción Futura Recomendada

### Opción A: Extender populate-embeddings.js
Agregar lógica para insertar TAMBIÉN en `accommodation_units_public` cuando:
- `destination.table === 'accommodation_units'`
- `metadata.type === 'hotel_process'`

### Opción B: Script dedicado (actual)
Mantener `scripts/insert-tucasamar-to-public.ts` como script dedicado para:
- Regeneración manual de embeddings
- Migración de datos entre tablas
- Casos especiales

---

## Files Involved

**Scripts creados:**
- `scripts/insert-tucasamar-to-public.ts` - Inserción manual con modelo correcto

**Código de búsqueda:**
- `src/lib/public-chat-search.ts:59` - `performPublicSearch()`
- `src/lib/public-chat-search.ts:132` - `searchAccommodationsPublic()`
- `src/lib/public-chat-search.ts:104` - Model: `text-embedding-3-large`

**RPC Functions:**
- `match_accommodations_public` - Búsqueda vectorial en `accommodation_units_public`

**Tablas afectadas:**
- `accommodation_units_public` - Chat table (FIXED)
- `hotels.accommodation_units` - Internal table (cleaned duplicates)

---

## Verificación Final

✅ Chat Tu Casa Mar funcional
✅ 6 habitaciones insertadas con embeddings correctos
✅ Duplicados eliminados (Kaya y Tu Casa Mar)
✅ Modelo de embedding correcto (`text-embedding-3-large`)
✅ RPC function `match_accommodations_public` retorna resultados
✅ Simmerdown sigue funcionando (9 unidades)

**Estado:** RESUELTO ✅
