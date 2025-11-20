# FASE 0: Análisis de Código Existente - MotoPress Sync Fix

**Fecha:** November 19, 2025
**Objetivo:** Documentar punto exacto de inserción para sync de accommodations

---

## Archivo a Modificar

**Path:** `src/app/api/integrations/motopress/sync-all/route.ts`
**Líneas totales:** 498

---

## Punto de Inserción Identificado

**Línea de inserción:** 174 (después de warmup, antes de fetch bookings)

**Contexto:**
```typescript
// Líneas 169-173: Warmup exitoso (NO MODIFICAR)
console.log(`[sync-all] ✅ Connection test successful: ${testResult.accommodationsCount} accommodations found`)
await sendEvent({
  type: 'progress',
  message: `Connection established (${testResult.accommodationsCount} accommodations). Fetching bookings...`
})

// <<<--- INSERTAR SYNC DE ACCOMMODATIONS AQUÍ (línea 174) --->>>

// Líneas 175-176: Fetch bookings (CÓDIGO ACTUAL - NO MODIFICAR)
// 3. Fetch ALL bookings with _embed (SLOW but complete data)
await sendEvent({ type: 'progress', message: 'Fetching bookings with complete data...' })
```

---

## Import Necesario

**Línea de inserción del import:** ~2 (después de imports existentes)

**Import a agregar:**
```typescript
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'
```

**Import statement completo (referencia):**
```typescript
// Línea 1-5: Imports existentes
import { NextRequest } from 'next/server'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
import { MotoPresBookingsMapper } from '@/lib/integrations/motopress/bookings-mapper'
import { createServerClient } from '@/lib/supabase'
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'  // ← NUEVO
```

---

## Elementos Disponibles en el Scope (línea 174)

Los siguientes elementos están disponibles y pueden ser usados:

- ✅ `sendEvent()` - Función para enviar eventos SSE
- ✅ `writer` - WritableStreamDefaultWriter
- ✅ `encoder` - TextEncoder
- ✅ `supabase` - Cliente Supabase (inicializado en línea 100)
- ✅ `tenant_id` - UUID del tenant (desde query params)
- ✅ `client` - MotoPresClient (inicializado en líneas 147-151)

**Elementos NO disponibles:**
- ❌ `motopressConfig` - Solo disponible temporalmente en scope de credenciales
- ❌ `accessToken` - Solo disponible en scope de credenciales

---

## Código Planificado a Insertar (FASE 2)

**Ubicación:** Línea 174 (después de warmup, antes de fetch bookings)

```typescript
// 2.7. SYNC ACCOMMODATIONS FIRST (prevent NULL accommodation_unit_id)
// This prevents race condition where reservations are inserted before accommodations exist
// See: docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md
await sendEvent({
  type: 'progress',
  message: 'Step 1/2: Syncing accommodations first...'
})

const syncManager = new MotoPresSyncManager()
const accommodationResult = await syncManager.syncAccommodations(tenant_id, false) // forceEmbeddings = false

if (!accommodationResult.success) {
  console.error('[sync-all] ❌ Accommodations sync failed:', accommodationResult.message)
  await sendEvent({
    type: 'error',
    message: `Failed to sync accommodations: ${accommodationResult.message}. Cannot proceed with reservations sync.`
  })
  await writer.close()
  return
}

const totalAccommodations = accommodationResult.created + accommodationResult.updated
console.log(`[sync-all] ✅ Accommodations synced: ${accommodationResult.created} created, ${accommodationResult.updated} updated`)

await sendEvent({
  type: 'progress',
  message: `Step 1/2 Complete: ${totalAccommodations} accommodations synced. Now fetching reservations...`
})

// CONTINUAR con código existente (línea 175: Fetch bookings)
```

---

## Tipo SyncResult (Referencia)

```typescript
interface SyncResult {
  success: boolean
  created: number
  updated: number
  errors: string[]  // ⚠️ Array de strings, NO number
  totalProcessed: number
  message: string
  embeddings_generated?: number
  embeddings_failed?: number
  embeddings_skipped?: number
}
```

---

## Estructura SSE Event (Referencia)

```typescript
interface SSEMessage {
  type: 'progress' | 'complete' | 'error'
  message?: string
  current?: number
  total?: number
  stats?: {
    total: number
    created: number
    updated: number
    errors: number
    blocksExcluded: number
    pastExcluded: number
  }
}
```

---

## Error Handling Pattern (Referencia)

```typescript
// Pattern usado en sync-all:
await sendEvent({
  type: 'error',
  message: 'Descripción del error'
})
await writer.close()
return
```

---

## Validaciones Pre-Modificación

Antes de implementar en FASE 2, verificar:
- [ ] Import de MotoPresSyncManager agregado
- [ ] Línea 174 identificada correctamente
- [ ] sendEvent() disponible en scope
- [ ] tenant_id disponible
- [ ] writer disponible para close() en error handling

---

## Referencias

- **Archivo principal:** `src/app/api/integrations/motopress/sync-all/route.ts`
- **Sync Manager:** `src/lib/integrations/motopress/sync-manager.ts`
- **Análisis completo:** `docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md`
- **Plan completo:** `docs/motopress-sync-fix/plan.md`

---

**Última actualización:** November 19, 2025
**Estado:** ✅ ANÁLISIS COMPLETADO - Listo para FASE 1
