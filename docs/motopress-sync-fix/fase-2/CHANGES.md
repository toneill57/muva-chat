# FASE 2 - Lista de Cambios

## Archivo Modificado
`src/app/api/integrations/motopress/sync-all/route.ts`

## Cambios Realizados

### 1. Import Agregado (línea 22)
**Líneas:** 1 línea agregada

```typescript
import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'
```

**Tipo:** Import statement
**Dependencias:** Requiere que `@/lib/integrations/motopress/sync-manager.ts` exista
**Impacto:** Permite usar syncManager.syncAccommodations() en el endpoint

---

### 2. Bloque de Coordinación (líneas 176-203)
**Líneas:** ~28 líneas agregadas

#### Desglose por Sección:

**A. Comentarios Explicativos (3 líneas)**
```typescript
// 2.5. SYNC ACCOMMODATIONS FIRST (Fix: Race condition)
// This prevents reservations from being inserted with accommodation_unit_id = NULL
// See: docs/troubleshooting/2025-11-19_MOTOPRESS_MULTI_TENANT_SYNC_FIX.md
```

**B. SSE Event Inicial (4 líneas)**
```typescript
await sendEvent({
  type: 'progress',
  message: 'Step 1/2: Syncing accommodations first...'
})
```

**C. Sync de Accommodations (2 líneas)**
```typescript
const syncManager = new MotoPresSyncManager()
const accommodationResult = await syncManager.syncAccommodations(tenant_id, false) // forceEmbeddings = false
```

**D. Error Handling (9 líneas)**
```typescript
if (!accommodationResult.success) {
  console.error('[sync-all] ❌ Accommodations sync failed:', accommodationResult.message)
  await sendEvent({
    type: 'error',
    message: `Failed to sync accommodations: ${accommodationResult.message}. Cannot proceed with reservations sync.`
  })
  await writer.close()
  return
}
```

**E. Cálculo de Totales y Logging (2 líneas)**
```typescript
const totalAccommodations = accommodationResult.created + accommodationResult.updated
console.log(`[sync-all] ✅ Accommodations synced: ${accommodationResult.created} created, ${accommodationResult.updated} updated`)
```

**F. SSE Event Completado (5 líneas)**
```typescript
await sendEvent({
  type: 'progress',
  message: `Step 1/2 Complete: ${totalAccommodations} accommodations synced. Now fetching reservations...`
})
```

**G. Comentario Explicativo Final (3 líneas - vacías incluidas)**
```typescript

// 3. Fetch ALL bookings with _embed (SLOW but complete data)
```

---

### 3. Punto de Inserción
**Ubicación exacta:** Entre línea ~174 (testConnection success) y línea ~205 (fetch de MotoPress API)

**Antes (línea ~174):**
```typescript
console.log(`[sync-all] ✅ Connection test successful: ${testResult.accommodationsCount} accommodations found`)
await sendEvent({
  type: 'progress',
  message: `Connection established (${testResult.accommodationsCount} accommodations). Fetching bookings...`
})

// ← BLOQUE INSERTADO AQUÍ

// 3. Fetch ALL bookings with _embed (SLOW but complete data)
await sendEvent({ type: 'progress', message: 'Fetching bookings with complete data...' })
```

---

## Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total líneas agregadas** | ~31 |
| **Archivos modificados** | 1 |
| **Imports nuevos** | 1 |
| **Funciones nuevas llamadas** | 1 (syncManager.syncAccommodations) |
| **SSE events agregados** | 2 (inicio y completado) |
| **Error handlers agregados** | 1 |
| **Console.log statements** | 1 |
| **Comentarios explicativos** | 6 líneas |

---

## Impacto

### Código
- ✅ Cambio quirúrgico (solo sync-all/route.ts modificado)
- ✅ No afecta otros endpoints (/sync-accommodations, /sync-reservations individuales)
- ✅ Backwards compatible (no rompe flujo existente)
- ✅ Sin breaking changes (API contract sin cambios)

### Performance
- ⚠️ Aumenta tiempo de sync total (~5-10s adicionales por accommodations sync)
- ✅ Pero elimina tiempo de debugging/fix manual (minutos/horas ahorrados)
- ✅ Trade-off aceptable: confiabilidad > velocidad

### Testing
- ✅ Requiere testing de sync completo (FASE 3)
- ✅ Verificar FKs válidas en todas las reservas
- ✅ Testing multi-tenant (simmerdown + otros tenants)

---

## Archivos NO Modificados
Los siguientes archivos permanecen sin cambios:

- ✅ `src/lib/integrations/motopress/sync-manager.ts` (ya existía)
- ✅ `src/lib/integrations/motopress/bookings-mapper.ts` (sin cambios)
- ✅ `src/app/api/integrations/motopress/sync-accommodations/route.ts` (sin cambios)
- ✅ `src/app/api/integrations/motopress/sync-reservations/route.ts` (sin cambios)

**Por qué:** El fix se implementó reutilizando componentes existentes (DRY principle)

---

## Deployment
**Rama:** dev
**Requiere:**
- ✅ Build local exitoso (`pnpm run build`)
- ✅ Testing en dev branch de Supabase
- ✅ Commit con mensaje descriptivo
- ✅ Push a dev branch
- ⚠️ NO merge a tst/prd sin testing completo (FASE 3)

---

## Rollback Plan
Si el fix causa problemas:

1. **Revertir commit:**
```bash
git revert <commit-hash>
git push origin dev
```

2. **Sync manual temporal:**
```bash
# Ejecutar sync de accommodations primero (manualmente)
curl https://api.muva.chat/api/integrations/motopress/sync-accommodations?tenant_id=XXX&token=XXX

# Luego sync de reservations
curl https://api.muva.chat/api/integrations/motopress/sync-reservations?tenant_id=XXX&token=XXX
```

3. **Fix de datos:**
```sql
-- Identificar reservas afectadas
SELECT id, guest_name, check_in_date, accommodation_unit_id
FROM guest_reservations
WHERE tenant_id = 'XXX' AND accommodation_unit_id IS NULL;

-- Aplicar fix manual (ver scripts en docs/motopress-sync-fix/fase-0/)
```
