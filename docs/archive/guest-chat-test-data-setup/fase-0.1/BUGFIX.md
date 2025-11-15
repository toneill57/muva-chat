# FASE 0.1 - Bugfix: accommodation_unit_id Access

**Fecha:** Octubre 1, 2025
**Tipo:** Bugfix crítico
**Archivos modificados:** `src/lib/conversational-chat-engine.ts`

---

## 🐛 Problema Identificado

El chat engine intentaba acceder a `guestInfo.accommodation_unit_id` (campo flat), pero el interface `GuestSession` define el campo como anidado:

```typescript
// Interface correcto
export interface GuestSession {
  // ...
  accommodation_unit?: {
    id: string
    name: string
    unit_number?: string
  }
}
```

**Síntomas:**
```
[Chat Engine] Search strategy (3 Domains): {
  domain_3_unit_manual: false,     // ❌ Siempre false
  unit_id: 'not_assigned'          // ❌ Nunca se asignaba
}

[Chat Engine] ⚠️ No accommodation_unit_id - skipping unit manual search
```

**Consecuencia:**
- Roberto Mora (Kaya) **NO** recibía su manual privado
- El sistema **NO** buscaba en `match_unit_manual`
- Dominio 3 (Private Unit Info) completamente inaccesible

---

## ✅ Solución Aplicada

### Cambios en `conversational-chat-engine.ts`

**5 ocurrencias corregidas:**

1. **Línea 258** - Log de estrategia
```typescript
// Antes
domain_3_unit_manual: !!guestInfo.accommodation_unit_id,

// Después
domain_3_unit_manual: !!guestInfo.accommodation_unit?.id,
```

2. **Línea 261** - Log de unit_id
```typescript
// Antes
unit_id: guestInfo.accommodation_unit_id || 'not_assigned',

// Después
unit_id: guestInfo.accommodation_unit?.id || 'not_assigned',
```

3. **Línea 274** - Condición if
```typescript
// Antes
if (guestInfo.accommodation_unit_id) {

// Después
if (guestInfo.accommodation_unit?.id) {
```

4. **Línea 275** - Parámetro de búsqueda
```typescript
// Antes
searches.push(searchUnitManual(queryEmbeddingBalanced, guestInfo.accommodation_unit_id))

// Después
searches.push(searchUnitManual(queryEmbeddingBalanced, guestInfo.accommodation_unit.id))
```

5. **Línea 278** - Log de warning
```typescript
// Antes
console.log('[Chat Engine] ⚠️ No accommodation_unit_id - skipping unit manual search')

// Después
console.log('[Chat Engine] ⚠️ No accommodation_unit - skipping unit manual search')
```

---

## 🎯 Resultado Esperado

Después de este fix, Roberto Mora (Kaya) verá en logs:

```
[Chat Engine] Search strategy (3 Domains): {
  domain_1_muva: true,
  domain_2_hotel_general: true,
  domain_3_unit_manual: true,              ✅ Ahora true
  accommodation_public: true,
  tenant: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  unit_id: '6c341cf7-cb12-46cb-a5c7-b67169293059'  ✅ UUID de Kaya
}

[Chat Engine] Unit manual results: {
  total_found: 1,
  unit_id: '6c341cf7-cb12-46cb-a5c7-b67169293059'
}
```

**Y cuando pregunte "¿Cuál es la contraseña del WiFi?":**
- ✅ Recibirá: `Kaya!Pass2024`
- ❌ NO recibirá info de One Love u otras unidades

---

## 📊 Testing Validation

### SQL Testing (Antes del bugfix)
```sql
-- Roberto Mora tiene accommodation_unit_id asignado
SELECT
  gr.guest_name,
  gr.accommodation_unit_id,
  au.name as unit_name
FROM guest_reservations gr
JOIN accommodation_units au ON au.id = gr.accommodation_unit_id
WHERE gr.guest_name = 'Roberto Mora';

-- Resultado:
-- Roberto Mora | 6c341cf7-cb12-46cb-a5c7-b67169293059 | Kaya ✅
```

### Logs Antes del Fix
```
domain_3_unit_manual: false,     ❌
unit_id: 'not_assigned'          ❌
⚠️ No accommodation_unit_id - skipping unit manual search
```

### Logs Después del Fix (Esperado)
```
domain_3_unit_manual: true,      ✅
unit_id: '6c341cf7-cb12-46cb-a5c7-b67169293059'  ✅
Unit manual results: { total_found: 1 }           ✅
```

---

## 🔗 Archivos Relacionados

**Implementación:**
- ✅ `src/lib/guest-auth.ts:15-32` - Interface GuestSession (correcto desde inicio)
- ✅ `src/lib/guest-auth.ts:160-173` - authenticateGuest() asigna accommodation_unit ✅
- ✅ `src/lib/guest-auth.ts:324-337` - verifyGuestToken() asigna accommodation_unit ✅
- ✅ `src/lib/conversational-chat-engine.ts:258-278` - **CORREGIDO** acceso anidado

**Database:**
- ✅ Migration: `add_domain_separated_search_functions.sql`
- ✅ RPC: `match_hotel_general_info`
- ✅ RPC: `match_unit_manual`

**Documentación:**
- ✅ `docs/guest-chat-test-data-setup/fase-0.1/INVESTIGATION_RESULTS.md`
- ✅ `docs/guest-chat-test-data-setup/fase-0.1/BUGFIX.md` (este archivo)

---

## ✅ Estado Final

**FASE 0.1 COMPLETADA:**
- ✅ Investigación de guest_information (96 rows)
- ✅ Creación de funciones RPC separadas por dominio
- ✅ Implementación de searchHotelGeneralInfo() y searchUnitManual()
- ✅ Integración en performContextAwareSearch()
- ✅ **Bugfix de acceso a accommodation_unit?.id**

**Próximo paso:** Testing en frontend con Roberto Mora para validar flujo completo.

---

**Autor:** Claude Code
**Tipo:** Critical Bugfix
**Impact:** HIGH - Desbloquea Dominio 3 (Private Unit Info)
