# MotoPress Scripts Backup - November 17, 2025

## ⚠️ CRITICAL BACKUPS - DO NOT DELETE

**Fecha de Backup:** 2025-11-17 22:31
**Razón:** Ejecución de plan de fix para MyStay Accommodation Header
**Estado:** Scripts funcionando correctamente antes de cualquier modificación

---

## Scripts Respaldados

### 1. bookings-mapper.ts (22KB)
**Ubicación Original:** `src/lib/integrations/motopress/bookings-mapper.ts`

**Funciones Críticas:**
- `mapToGuestReservation()` - Mapea bookings individuales
- `mapBulkBookingsWithEmbed()` - Mapeo en batch
- `saveReservationAccommodations()` - Guarda junction table

**Lógica Crítica (líneas 165-186):**
```typescript
// Mapping automático de accommodation_unit_id via RPC
const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId
})
```

### 2. sync-manager.ts (38KB)
**Ubicación Original:** `src/lib/integrations/motopress/sync-manager.ts`

**Funciones Críticas:**
- `syncAccommodations()` - Sincroniza units desde MotoPress
- `syncReservations()` - Sincroniza reservations
- `generateEmbeddings()` - Genera chunks para vector search

**Lógica Crítica:**
- UUID determinístico via `hotels.generate_deterministic_uuid()`
- Sync de accommodations a `hotels.accommodation_units`
- Generación de chunks a `accommodation_units_public`

### 3. client.ts (14KB)
**Ubicación Original:** `src/lib/integrations/motopress/client.ts`

**Funciones Críticas:**
- `getAccommodations()` - Fetch accommodations desde MotoPress API
- `getAllBookingsWithEmbed()` - Fetch bookings con `_embed` parameter
- `testConnection()` - Health check de API

**Configuración Crítica:**
- API endpoints de MotoPress
- Rate limiting (60 seg timeout para sync-all)
- Error handling patterns

### 4. sync-all-route.ts (17KB)
**Ubicación Original:** `src/app/api/integrations/motopress/sync-all/route.ts`

**Funcionalidad Crítica:**
- SSE (Server-Sent Events) streaming
- Sincronización completa sin timeout
- Progress updates en tiempo real
- Integración con MotoPresBookingsMapper

**Workflow:**
1. Test connection
2. Fetch all bookings con `_embed`
3. Map via bookings-mapper
4. Upsert guest_reservations + reservation_accommodations
5. Log sync_history

---

## 🔒 POLÍTICA DE PROTECCIÓN

### REGLA CRÍTICA: NO MODIFICAR SIN BACKUP

**Antes de modificar CUALQUIERA de estos scripts:**

1. ✅ **CREAR NUEVO BACKUP** con timestamp actual
   ```bash
   mkdir -p _assets/backups/motopress-scripts-$(date +%Y-%m-%d-%H%M)
   cp [archivos] _assets/backups/motopress-scripts-$(date +%Y-%m-%d-%H%M)/
   ```

2. ✅ **DOCUMENTAR** razón del cambio en nuevo README

3. ✅ **VERIFICAR** que backup anterior existe y es funcional

4. ✅ **TESTING** exhaustivo después de cambios

### Razones para esta Política:

- ❌ **NO podemos perder** estado actual de sincronización
- ❌ **Sistema multi-tenant** - afecta a TODOS los tenants
- ❌ **Lógica compleja** - UUID determinístico, RPC mapping, embeddings
- ❌ **Data integrity** - errores en sync corrompen reservations

### Scripts que NUNCA deben modificarse sin backup:

1. `bookings-mapper.ts` - Core mapping logic (accommodation_unit_id population)
2. `sync-manager.ts` - Accommodation + reservation sync workflows
3. `client.ts` - MotoPress API communication
4. `sync-all/route.ts` - SSE streaming endpoint

---

## 📋 ESTADO VERIFICADO (Nov 17, 2025)

### ✅ Sistema Funcionando Correctamente

**Componentes Verificados:**
- ✅ Migration `20251117171052` aplicada (RPC queries `hotels.accommodation_units`)
- ✅ RPC `get_accommodation_unit_by_motopress_id()` funciona correctamente
- ✅ RPC `get_accommodation_unit_by_id()` con search_path correcto
- ✅ Sync endpoint `/sync-all` con SSE implementado
- ✅ Bookings mapper llama RPC correctamente (líneas 165-186)
- ✅ UUID determinístico garantiza idempotencia

**Tenants Verificados:**
- **simmerdown**: 102/102 reservations con accommodation_unit_id (100%) ✅
- **tucasaenelmar**: 0/230 (0%) - necesita re-sync
- **casaboutiqueloscedros**: 0/10 (0%) - necesita re-sync

**Plan de Ejecución:**
- Re-sync via `/api/integrations/motopress/sync-all` (NO modificación de scripts)
- Scripts actuales ya tienen lógica correcta
- Solo necesita re-ejecutar sync para poblar datos

---

## 🔄 RECOVERY PROCEDURE

### Si algo sale mal después de modificar scripts:

**Paso 1: Stop Application**
```bash
pkill -f "next dev"
```

**Paso 2: Restore Backups**
```bash
cp _assets/backups/motopress-scripts-2025-11-17/bookings-mapper.ts.backup \
   src/lib/integrations/motopress/bookings-mapper.ts

cp _assets/backups/motopress-scripts-2025-11-17/sync-manager.ts.backup \
   src/lib/integrations/motopress/sync-manager.ts

cp _assets/backups/motopress-scripts-2025-11-17/client.ts.backup \
   src/lib/integrations/motopress/client.ts

cp _assets/backups/motopress-scripts-2025-11-17/sync-all-route.ts.backup \
   src/app/api/integrations/motopress/sync-all/route.ts
```

**Paso 3: Verify Restoration**
```bash
pnpm run build
# Build debe completarse sin errores
```

**Paso 4: Re-start Application**
```bash
pnpm run dev
```

**Paso 5: Verify Functionality**
```bash
# Test sync endpoint
curl "http://tucasaenelmar.localhost:3000/api/integrations/motopress/sync-all?tenant_id=XXX&token=XXX"
# Debe retornar SSE stream sin errores
```

---

## 📞 CONTACTO Y REFERENCIAS

**Plan de Ejecución Original:**
`docs/troubleshooting/2025-11-17_ACCOMMODATION_HEADER_FIX_EXECUTION_PLAN.md`

**Validation Report:**
Generated by Claude Code Plan agent - Nov 17, 2025

**Migrations Relacionadas:**
- `20251117171052_fix_accommodation_lookup_use_hotels_schema.sql` - RPC fix (CRITICAL)
- `20251117140000_fix_get_accommodation_unit_by_id_search_path.sql` - search_path fix
- `20250101000000_create_core_schema.sql` - UUID determinístico function

**Archivos de Documentación:**
- `docs/troubleshooting/2025-11-17_MULTI_TENANT_ACCOMMODATION_DATA_INVESTIGATION.md`
- `docs/troubleshooting/2025-11-17_MANUAL_UPLOAD_FIXES_COMPLETE_REPORT.md`

---

**⚠️ RECUERDA: SIEMPRE BACKUP ANTES DE MODIFICAR ⚠️**

**Última Actualización:** 2025-11-17 22:31
**Autor:** Claude Code
**Status:** BACKUPS VERIFIED AND PROTECTED
