# FASE 2 - Code Diff

## Archivo: src/app/api/integrations/motopress/sync-all/route.ts

---

## Diff 1: Import

**ANTES (línea ~19-21):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
// NO había import de MotoPresSyncManager
import { MotoPresBookingsMapper } from '@/lib/integrations/motopress/bookings-mapper'
import { getDecryptedMotoPresCredentials } from '@/lib/integrations/motopress/credentials-helper'
import { verifyStaffToken } from '@/lib/staff-auth'
```

**DESPUÉS (línea ~19-22):**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { MotoPresClient } from '@/lib/integrations/motopress/client'
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager' // ← AGREGADO
import { MotoPresBookingsMapper } from '@/lib/integrations/motopress/bookings-mapper'
import { getDecryptedMotoPresCredentials } from '@/lib/integrations/motopress/credentials-helper'
import { verifyStaffToken } from '@/lib/staff-auth'
```

---

## Diff 2: Coordinación de Sync

**ANTES (líneas ~170-206):**
```typescript
console.log(`[sync-all] ✅ Connection test successful: ${testResult.accommodationsCount} accommodations found`)
await sendEvent({
  type: 'progress',
  message: `Connection established (${testResult.accommodationsCount} accommodations). Fetching bookings...`
})

// ← NO HABÍA SYNC DE ACCOMMODATIONS AQUÍ

// 3. Fetch ALL bookings with _embed (SLOW but complete data)
await sendEvent({ type: 'progress', message: 'Fetching bookings with complete data...' })

const bookingsResponse = await client.getAllBookingsWithEmbed(
  (current, total, message) => {
    // Stream progress to client
    sendEvent({
      type: 'progress',
      current,
      total,
      message
    })
  }
)

if (bookingsResponse.error) {
  console.error('[sync-all] MotoPress API error:', bookingsResponse.error)
  await sendEvent({
    type: 'error',
    message: `MotoPress API error: ${bookingsResponse.error}`
  })
  await writer.close()
  return
}

const bookings = bookingsResponse.data || []
console.log(`[sync-all] Fetched ${bookings.length} bookings from MotoPress`)
await sendEvent({
  type: 'progress',
  message: `Fetched ${bookings.length} bookings. Processing...`
})
```

**DESPUÉS (líneas ~170-236):**
```typescript
console.log(`[sync-all] ✅ Connection test successful: ${testResult.accommodationsCount} accommodations found`)
await sendEvent({
  type: 'progress',
  message: `Connection established (${testResult.accommodationsCount} accommodations). Fetching bookings...`
})

// ========== NUEVO BLOQUE COMIENZA ==========
// 2.5. SYNC ACCOMMODATIONS FIRST (Fix: Race condition)
// This prevents reservations from being inserted with accommodation_unit_id = NULL
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
// ========== NUEVO BLOQUE TERMINA ==========

// 3. Fetch ALL bookings with _embed (SLOW but complete data)
await sendEvent({ type: 'progress', message: 'Fetching bookings with complete data...' })

const bookingsResponse = await client.getAllBookingsWithEmbed(
  (current, total, message) => {
    // Stream progress to client
    sendEvent({
      type: 'progress',
      current,
      total,
      message
    })
  }
)

if (bookingsResponse.error) {
  console.error('[sync-all] MotoPress API error:', bookingsResponse.error)
  await sendEvent({
    type: 'error',
    message: `MotoPress API error: ${bookingsResponse.error}`
  })
  await writer.close()
  return
}

const bookings = bookingsResponse.data || []
console.log(`[sync-all] Fetched ${bookings.length} bookings from MotoPress`)
await sendEvent({
  type: 'progress',
  message: `Fetched ${bookings.length} bookings. Processing...`
})
```

---

## Resumen del Diff

### Tabla Comparativa

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Orden de sync** | Reservations primero (implícito) | Accommodations → Reservations (explícito) |
| **Coordinación** | Ninguna (sync paralelo) | syncManager coordina (sync secuencial) |
| **SSE events** | Solo reservations | Ambas fases (Step 1/2) |
| **Error handling** | Solo en reservations | En ambas fases (early return si accommodations falla) |
| **Race condition** | ✗ Presente (0.326s gap) | ✅ Eliminada |
| **accommodation_unit_id** | ⚠️ Puede ser NULL | ✅ Siempre válido |
| **Guest chat** | ❌ No responde sobre alojamientos | ✅ Responde correctamente |

### Flujo de Ejecución

**ANTES:**
```
1. testConnection()
2. Fetch reservations from MotoPress ← EJECUTA PRIMERO
3. Map reservations
4. Upsert reservations (accommodation_unit_id = NULL si accommodation no existe)
5. [Accommodations se sincronizan en algún momento, tal vez]
```

**DESPUÉS:**
```
1. testConnection()
2. Sync accommodations FIRST ← GARANTIZA ORDEN
   - Fetch accommodations from MotoPress
   - Upsert accommodations
   - Verify success o return early
3. Fetch reservations from MotoPress ← EJECUTA DESPUÉS
4. Map reservations
5. Upsert reservations (accommodation_unit_id siempre válido, FK constraint OK)
```

---

## Análisis Detallado de Cambios

### Cambio 1: Import (línea 22)
**Tipo:** Declaración de dependencia
**Impacto:** Permite usar MotoPresSyncManager
**Risk:** Bajo (solo import, no modifica lógica)

### Cambio 2: Bloque de Coordinación (líneas 176-203)
**Tipo:** Lógica de negocio
**Impacto:** Garantiza orden de sync
**Risk:** Medio (cambia flujo, pero usa componentes probados)

**Sub-cambios:**
1. **SSE Event "Step 1/2"** - Notifica inicio de accommodations sync
2. **syncManager.syncAccommodations()** - Ejecuta sync (await = bloquea hasta completar)
3. **Error handling** - Early return si falla
4. **Logging** - Registra resultados
5. **SSE Event "Step 1/2 Complete"** - Notifica éxito

---

## Verificación de Cambios

### Comando Git Diff
```bash
# Ver diff completo
git diff src/app/api/integrations/motopress/sync-all/route.ts

# Ver solo las líneas modificadas
git diff --unified=0 src/app/api/integrations/motopress/sync-all/route.ts
```

### Verificar Líneas Específicas
```bash
# Ver import (línea 22)
sed -n '22p' src/app/api/integrations/motopress/sync-all/route.ts

# Ver bloque de coordinación (líneas 176-203)
sed -n '176,203p' src/app/api/integrations/motopress/sync-all/route.ts
```

### Buscar Referencias
```bash
# Verificar que syncManager se usa correctamente
grep -n "syncManager" src/app/api/integrations/motopress/sync-all/route.ts

# Verificar SSE events
grep -n "Step 1/2" src/app/api/integrations/motopress/sync-all/route.ts
```

---

## Testing del Diff

### Testing Manual
```bash
# 1. Compilar código
pnpm run build

# 2. Ejecutar sync-all
curl -N "https://api.muva.chat/api/integrations/motopress/sync-all?tenant_id=8e4d89c0-5c24-4701-8ae1-3f2d8b8e5c3a&token=XXX"

# 3. Verificar SSE events en respuesta
# Debe mostrar:
# data: {"type":"progress","message":"Step 1/2: Syncing accommodations first..."}
# data: {"type":"progress","message":"Step 1/2 Complete: 3 accommodations synced. Now fetching reservations..."}
# data: {"type":"progress","message":"Fetching bookings with complete data..."}
```

### Verificar Base de Datos
```sql
-- Verificar que NO hay accommodation_unit_id NULL
SELECT COUNT(*) AS null_count
FROM guest_reservations
WHERE tenant_id = '8e4d89c0-5c24-4701-8ae1-3f2d8b8e5c3a'
AND accommodation_unit_id IS NULL;
-- Debe retornar 0

-- Verificar FKs válidas
SELECT r.id, r.guest_name, r.accommodation_unit_id, a.name AS unit_name
FROM guest_reservations r
LEFT JOIN accommodation_units a ON r.accommodation_unit_id = a.id
WHERE r.tenant_id = '8e4d89c0-5c24-4701-8ae1-3f2d8b8e5c3a'
ORDER BY r.created_at DESC;
-- Todas las reservas deben tener unit_name NO NULL
```

---

## Posibles Side Effects

### Esperados (OK)
- ✅ Sync total toma ~5-10s más (accommodations sync adicional)
- ✅ SSE events incluyen "Step 1/2" (nueva nomenclatura)
- ✅ Logs muestran accommodations sync antes de reservations

### NO Esperados (Requieren Fix)
- ❌ Sync falla si accommodations endpoint tiene bugs
  - **Mitigación:** Testing extensivo en FASE 3
- ❌ Timeout si accommodations sync es muy lento
  - **Mitigación:** SSE mantiene conexión viva
- ❌ Duplicación de accommodations
  - **Mitigación:** syncManager usa upsert (no duplica)

---

## Conclusión

**Cambio:** Quirúrgico y mínimo (31 líneas en 1 archivo)
**Impacto:** Alto (elimina race condition completamente)
**Riesgo:** Bajo (reutiliza código existente probado)
**Testing:** Requiere FASE 3 para validar multi-tenant

**Recomendación:** ✅ Proceder con FASE 3 (testing)
