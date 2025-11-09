# Migración: Fuente Única de Verdad para Alojamientos

**Fecha:** 2025-11-09
**Migración:** `20251109000000_single_source_of_truth_embeddings.sql`
**Estado:** ✅ Base de datos completada | ⏳ Código pendiente

---

## Problema Resuelto

Antes teníamos **3 tablas** con datos de alojamientos:
1. `hotels.accommodation_units` - Datos operacionales (reservas, MotoPress)
2. `accommodation_units_public` - Embeddings para chat público (51 chunks)
3. `accommodation_units_manual_chunks` - Embeddings para guest chat (0 registros)

**Problema:** Fuentes de verdad duplicadas, sincronización manual, integridad referencial rota.

---

## Solución Implementada

### 1. Base de Datos (✅ COMPLETADO)

**Tabla única:** `hotels.accommodation_units` ahora tiene:

```sql
-- Nuevas columnas agregadas:
embedding_public_fast   vector(256)   -- Chat público - Matryoshka tier 1
embedding_public_full   vector(1536)  -- Chat público - Matryoshka tier 2
embedding_guest_fast    vector(256)   -- Guest chat - Matryoshka tier 1
embedding_guest_full    vector(1536)  -- Guest chat - Matryoshka tier 2
public_description      text          -- Descripción consolidada pública
guest_description       text          -- Descripción privada (del manual)
```

**Índices vectoriales creados:**
- `idx_accommodation_units_embedding_public_fast`
- `idx_accommodation_units_embedding_public_full`
- `idx_accommodation_units_embedding_guest_fast`
- `idx_accommodation_units_embedding_guest_full`

**RPCs actualizados:**
- ✅ `match_accommodations_public()` - Ahora busca en `hotels.accommodation_units.embedding_public_fast`
- ✅ `match_accommodations_guest()` - Nuevo RPC para guest chat usando `embedding_guest_fast`
- ✅ `get_accommodation_units_by_ids()` - Ya apunta a `hotels.accommodation_units` (fix anterior)

**Tablas deprecadas:**
- ❌ `accommodation_units_public` - Marcada como DEPRECATED
- ❌ `accommodation_units_manual_chunks` - Marcada como DEPRECATED

---

## 2. Código TypeScript (⏳ PENDIENTE)

### Archivos que requieren actualización:

#### A. Sync de Alojamientos (MotoPress)
**Archivos:**
- `src/lib/integrations/motopress/accommodations-mapper.ts`
- `src/app/api/integrations/motopress/sync-accommodations/route.ts`

**Cambios necesarios:**
1. Al sincronizar alojamientos desde MotoPress, generar:
   - `public_description` - Consolidar chunks ("Overview", "Amenities", etc.)
   - `embedding_public_fast` + `embedding_public_full` - Embeddings Matryoshka
2. Guardar en `hotels.accommodation_units` (columnas nuevas)
3. Ya NO guardar en `accommodation_units_public` (deprecated)

#### B. Chat Público (`/`)
**Archivos:**
- `src/lib/public-chat-search.ts`
- `src/lib/public-chat-engine.ts`

**Cambios necesarios:**
1. Cambiar RPC call de `match_accommodations_public()` para usar nuevos parámetros
2. Verificar que sigue retornando `id`, `content`, `similarity`, `metadata`

#### C. Guest Chat (`/guest-chat`)
**Archivos:**
- `src/lib/dev-chat-search.ts` (probablemente necesita renombrarse)
- `src/lib/dev-chat-engine.ts`

**Cambios necesarios:**
1. Usar nuevo RPC `match_accommodations_guest()`
2. Pasar `p_guest_unit_id` (UUID del alojamiento del huésped)
3. Implementar lógica para poblar `guest_description` desde manuales de alojamiento

---

## 3. Próximos Pasos

### Paso 1: Re-sync Alojamientos (CRÍTICO)
**Acción requerida:** Sincronizar nuevamente todos los alojamientos desde MotoPress para:
- Generar `public_description` consolidada
- Generar embeddings `embedding_public_fast` y `embedding_public_full`
- Poblar las nuevas columnas en `hotels.accommodation_units`

**Comando:** (Pendiente de implementar)
```bash
# Endpoint a actualizar: POST /api/integrations/motopress/sync-accommodations
```

### Paso 2: Actualizar TypeScript
1. Modificar mapper de alojamientos para generar embeddings
2. Actualizar chat público para usar nuevos RPCs
3. Actualizar guest chat para usar `match_accommodations_guest()`

### Paso 3: Testing
1. Verificar chat público en `http://tucasaenelmar.localhost:3001/`
2. Verificar guest chat en `http://tucasaenelmar.localhost:3001/guest-chat`
3. Verificar que reservas muestran nombres de alojamientos correctamente

### Paso 4: Cleanup (FUTURO)
Cuando todo funcione correctamente:
```sql
-- DROP TABLE public.accommodation_units_public;
-- DROP TABLE public.accommodation_units_manual_chunks;
```

---

## Arquitectura Final

```
┌─────────────────────────────────────────────────────────┐
│  hotels.accommodation_units (SINGLE SOURCE OF TRUTH)    │
├─────────────────────────────────────────────────────────┤
│  • Datos operacionales (reservas, MotoPress, pricing)  │
│  • embedding_public_fast/full (para chat público)       │
│  • embedding_guest_fast/full (para guest chat)          │
│  • public_description (consolidada)                     │
│  • guest_description (del manual)                       │
└─────────────────────────────────────────────────────────┘
                     ↓
        ┌────────────────────────┐
        │    RPCs de Búsqueda    │
        ├────────────────────────┤
        │ match_accommodations_  │
        │   public()             │
        │ match_accommodations_  │
        │   guest()              │
        └────────────────────────┘
                     ↓
        ┌────────────────────────┐
        │    Aplicación Chat     │
        ├────────────────────────┤
        │ Chat Público (/)       │
        │ Guest Chat (/guest-*)  │
        └────────────────────────┘
```

---

## Verificación

```sql
-- Ver estructura de la tabla
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'hotels'
  AND table_name = 'accommodation_units'
  AND column_name LIKE '%embedding%' OR column_name LIKE '%description'
ORDER BY column_name;

-- Ver índices vectoriales
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'accommodation_units'
  AND indexname LIKE '%embedding%';

-- Ver RPCs actualizados
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc
WHERE proname LIKE '%match%accommodation%';
```

---

## Notas

- ✅ **Sin triggers** - Regeneración manual en cada sync (como solicitaste)
- ✅ **Fuente única de verdad** - `hotels.accommodation_units`
- ✅ **Embeddings separados** - Público vs Guest con security
- ⚠️ **Requiere re-sync** - Datos actuales NO tienen embeddings todavía
