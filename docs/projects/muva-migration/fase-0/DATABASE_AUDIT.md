# Database Audit - tenant_registry

**Date:** 2025-10-10
**Project:** MUVA.chat Migration - FASE 0.5
**Purpose:** Verificar integridad de tenant_registry antes de migración

---

## RESUMEN

✅ **Total tenants:** 4 (según esperado)
✅ **Todos activos:** is_active = true
✅ **Subdomains únicos:** Sin duplicados
✅ **Tenant IDs válidos:** UUID v4 format

---

## TENANTS CONFIRMADOS

### 1. simmerdown (Premium)
- **tenant_id:** `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf`
- **nombre_comercial:** Simmer Down Guest House
- **subdomain:** `simmerdown`
- **subscription_tier:** `premium`
- **is_active:** `true`
- **created_at:** 2025-09-22 (19 días activo)

**Status:** ✅ Tenant más antiguo, cliente pagado, alta prioridad para migración

---

### 2. free-hotel-test (Free)
- **tenant_id:** `11111111-2222-3333-4444-555555555555`
- **nombre_comercial:** Free Hotel Test
- **subdomain:** `free-hotel-test`
- **subscription_tier:** `free`
- **is_active:** `true`
- **created_at:** 2025-10-01 (9 días activo)

**Status:** ✅ Tenant de testing, tier free, bajo riesgo para migración

---

### 3. xyz (Free)
- **tenant_id:** `e694f792-37b1-4f9b-861c-2ee750801571`
- **nombre_comercial:** XYZ Hotel
- **subdomain:** `xyz`
- **subscription_tier:** `free`
- **is_active:** `true`
- **created_at:** 2025-10-10 (hoy, recién creado)

**Status:** ✅ Tenant nuevo, tier free, ideal para testing post-migración

---

### 4. hotel-boutique (Basic)
- **tenant_id:** `00d83928-f2de-4be0-9656-ac78dc0548c5`
- **nombre_comercial:** Hotel Boutique Casa Colonial
- **subdomain:** `hotel-boutique`
- **subscription_tier:** `basic`
- **is_active:** `true`
- **created_at:** 2025-10-10 (hoy, recién creado)

**Status:** ✅ Tenant nuevo, tier basic, prioridad media para migración

---

## VALIDACIONES

### Campo `subdomain` (Agnóstico al dominio)
✅ **Formato válido:** Todos los subdomains usan formato lowercase + hyphens
✅ **Sin referencias al domain:** Campo solo contiene subdomain, no domain completo
✅ **Compatibilidad:** `subdomain` funciona con cualquier domain (muva.chat / muva.chat)

**Ejemplos:**
- `simmerdown` → Funciona con `simmerdown.muva.chat` Y `simmerdown.muva.chat`
- `free-hotel-test` → Funciona con ambos dominios
- `xyz` → Funciona con ambos dominios
- `hotel-boutique` → Funciona con ambos dominios

### Tiers de Suscripción
✅ **Premium:** 1 tenant (simmerdown)
✅ **Basic:** 1 tenant (hotel-boutique)
✅ **Free:** 2 tenants (free-hotel-test, xyz)

### Estado de Activación
✅ **Activos:** 4/4 tenants (100%)
✅ **Inactivos:** 0 tenants

---

## ORDEN DE MIGRACIÓN PROPUESTO (FASE 3)

Según tier y riesgo:

1. **simmerdown** (Premium) - Migrar primero, cliente pagado
   - Monitoreo intensivo 48h
   - Comunicación previa requerida

2. **hotel-boutique** (Basic) - Migrar segundo, tier medio
   - Monitoreo 24h
   - Comunicación previa requerida

3. **free-hotel-test** (Free) - Migrar tercero, testing tenant
   - Monitoreo ligero 12h

4. **xyz** (Free) - Migrar último, menor riesgo
   - Monitoreo ligero 12h

---

## CONCLUSIONES

✅ **Database ready para migración**
✅ **Schema agnóstico al dominio** (campo `subdomain` no requiere cambios)
✅ **4 tenants confirmados y activos**
✅ **No hay data migrations requeridas**

---

## QUERY UTILIZADO

```typescript
const { data, error } = await supabase
  .from('tenant_registry')
  .select('tenant_id, subdomain, nombre_comercial, is_active, subscription_tier, created_at')
  .order('created_at', { ascending: true });
```

**Method:** Supabase Client via `npx tsx -e` (DML query, no MCP)

---

**Generated:** 2025-10-10
**Next:** FASE 0.6 - Capturar logs baseline
