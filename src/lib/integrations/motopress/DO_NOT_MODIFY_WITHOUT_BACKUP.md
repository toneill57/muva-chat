# ⚠️ PROTECCIÓN DE SCRIPTS MOTOPRESS ⚠️

## 🔒 REGLA CRÍTICA: NO MODIFICAR SIN BACKUP

**ANTES de modificar CUALQUIER archivo en este directorio:**

### 1. Crear Backup con Timestamp

```bash
mkdir -p _assets/backups/motopress-scripts-$(date +%Y-%m-%d-%H%M)
cp src/lib/integrations/motopress/*.ts _assets/backups/motopress-scripts-$(date +%Y-%m-%d-%H%M)/
cp src/app/api/integrations/motopress/sync-all/route.ts _assets/backups/motopress-scripts-$(date +%Y-%m-%d-%H%M)/sync-all-route.ts.backup
```

### 2. Documentar Razón del Cambio

Crear README en el directorio de backup explicando:
- ¿Qué se va a modificar?
- ¿Por qué?
- ¿Qué funcionalidad afecta?

### 3. Verificar Backup Anterior

```bash
ls -lah _assets/backups/motopress-scripts-2025-11-17/
# Debe existir y contener: bookings-mapper.ts.backup, sync-manager.ts.backup, client.ts.backup, sync-all-route.ts.backup
```

---

## 🚨 ARCHIVOS CRÍTICOS EN ESTE DIRECTORIO

| Archivo | Función Crítica | Impacto si se rompe |
|---------|----------------|---------------------|
| **bookings-mapper.ts** | Mapea bookings → guest_reservations<br>Popula accommodation_unit_id via RPC | Headers vacíos en MyStay<br>Reservations sin accommodation linkage |
| **sync-manager.ts** | Sync accommodations + reservations<br>Genera embeddings para AI | Sync falla<br>Nuevo data no se importa<br>Vector search roto |
| **client.ts** | Comunicación con MotoPress API<br>Rate limiting y error handling | No se puede conectar a MotoPress<br>Sync timeouts |

**Archivo Relacionado (fuera de este directorio):**
- `src/app/api/integrations/motopress/sync-all/route.ts` - SSE streaming endpoint

---

## 📍 ÚLTIMO BACKUP VERIFICADO

**Fecha:** 2025-11-17 22:31
**Ubicación:** `_assets/backups/motopress-scripts-2025-11-17/`
**Estado:** ✅ Scripts funcionando correctamente
**Contenido:**
- `bookings-mapper.ts.backup` (22KB)
- `sync-manager.ts.backup` (38KB)
- `client.ts.backup` (14KB)
- `sync-all-route.ts.backup` (17KB)

---

## 🎯 LÓGICA CRÍTICA QUE NO DEBE ROMPERSE

### 1. Accommodation Mapping (bookings-mapper.ts:165-186)

```typescript
// ⚠️ CRITICAL: Dynamic UUID mapping via RPC
const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId  // NO hardcodear UUIDs aquí
})

if (units && units.length > 0) {
  accommodationUnitId = units[0].id  // UUID real de hotels.accommodation_units
}
```

**Por qué es crítico:**
- Sistema multi-tenant (1,000+ tenants futuros)
- UUID determinístico garantiza idempotencia
- NO se pueden hardcodear UUIDs
- Escala sin modificación de código

### 2. UUID Determinístico (sync-manager.ts)

```typescript
// ⚠️ CRITICAL: Usa función SQL hotels.generate_deterministic_uuid()
// NO generar UUIDs con uuid() o crypto.randomUUID()
```

**Por qué es crítico:**
- Mismo tenant_id + motopress_unit_id → siempre mismo UUID
- Re-sync seguro (idempotente)
- Future-proof para nuevos tenants

### 3. SSE Streaming (sync-all/route.ts)

```typescript
// ⚠️ CRITICAL: Server-Sent Events previene timeouts
// NO cambiar a response.json() (causaría timeouts en syncs largos)
```

**Por qué es crítico:**
- Syncs de 1,000+ bookings toman >60 segundos
- SSE permite streaming sin timeout
- Progress updates en tiempo real

---

## ✅ TESTING OBLIGATORIO DESPUÉS DE MODIFICACIONES

### Test 1: Build Check
```bash
pnpm run build
# Debe completarse sin errores TypeScript
```

### Test 2: Sync Functionality
```bash
# Visit: http://[tenant].localhost:3000/admin
# Navigate: Integrations → MotoPress
# Click: "Actualizar TODO"
# Verify: SSE stream completa sin errores
```

### Test 3: Data Integrity
```sql
-- Verificar accommodation_unit_id poblado
SELECT COUNT(*) as total,
  COUNT(accommodation_unit_id) as with_id,
  ROUND(100.0 * COUNT(accommodation_unit_id) / COUNT(*), 2) as percent
FROM guest_reservations
WHERE tenant_id = 'XXX';

-- Expected: percent = 100.00 (o cercano si hay data legacy)
```

### Test 4: Header Display
```bash
# Visit: http://[tenant].localhost:3000/my-stay
# Login con reservation
# Verify: Header shows "Alojamiento [name]"
# NO debe estar vacío
```

---

## 🔄 RECOVERY SI ALGO SALE MAL

**Ver instrucciones completas en:**
`_assets/backups/motopress-scripts-2025-11-17/README.md`

**Quick Recovery:**
```bash
# Stop app
pkill -f "next dev"

# Restore from backup
cp _assets/backups/motopress-scripts-2025-11-17/*.backup src/lib/integrations/motopress/
# (rename .backup files back to .ts)

# Rebuild
pnpm run build

# Restart
pnpm run dev
```

---

## 📞 REFERENCIAS

**Plan de Ejecución:**
`docs/troubleshooting/2025-11-17_ACCOMMODATION_HEADER_FIX_EXECUTION_PLAN.md`

**Migraciones Críticas:**
- `20251117171052_fix_accommodation_lookup_use_hotels_schema.sql` - RPC queries hotels.accommodation_units
- `20251117140000_fix_get_accommodation_unit_by_id_search_path.sql` - search_path fix

**Documentación:**
- `docs/troubleshooting/2025-11-17_MULTI_TENANT_ACCOMMODATION_DATA_INVESTIGATION.md`

---

**⚠️ RECUERDA:**
1. ✅ SIEMPRE backup antes de modificar
2. ✅ NUNCA hardcodear UUIDs
3. ✅ NUNCA romper UUID determinístico
4. ✅ NUNCA quitar SSE streaming de sync-all
5. ✅ SIEMPRE testing exhaustivo después de cambios

**Última Actualización:** 2025-11-17
**Autor:** Claude Code
**Status:** PROTECTION ACTIVE
