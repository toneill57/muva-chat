# My Stay Guest Chat - Workflow de Prompts (REALINEADO)

**Proyecto:** My Stay Guest Chat - Restauración de Funcionalidad + SIRE Básico
**Fecha:** 2025-11-13
**Referencia:** Ver `plan.md` para contexto completo de regresión y `TODO.md` para tracking

---

## ⚠️ LEER PRIMERO - ARQUITECTURA CRÍTICA

**IMPORTANTE:** Este workflow trabaja con 2 sistemas de vector embeddings SEPARADOS:

### Sistema 1: Accommodation Units Data (Para `/with-me`) - ❌ NO TOCAR
- Tabla: `accommodation_units_public.embedding`
- Contenido: Data general (nombre, descripción, amenities, precios)
- Uso: Chat público para usuarios anónimos
- **Estado:** ✅ Funciona perfectamente - NO modificar

### Sistema 2: Accommodation Manuals (Para `/my-stay`) - ✅ FASE 1 trabaja aquí
- Tabla: `accommodation_units_manual_chunks.embedding`
- Contenido: Manuales de accommodation units (WiFi, check-in, reglas, instrucciones)
- Uso: Guest chat para guests autenticados (UNA de varias fuentes)
- **Estado:** ❌ Roto - FASE 1 arregla esto

**Nota:** Guest chat también usa OTROS embeddings (turismo, SIRE, etc.) fuera del alcance de este plan.

**🚨 REGLA:** Guest chat NO debe usar accommodation_units_public.embedding

**Ver detalles completos:** `plan.md` líneas 43-128 (Arquitectura Crítica)

---

## 🎯 OVERVIEW

Este workflow ha sido **COMPLETAMENTE REALINEADO** del plan SIRE original.

**Cambio de Enfoque:**
- ❌ **Antes:** SIRE compliance completo (12 prompts, 36-46h)
- ✅ **Ahora:** Fix My Stay guest chat (4 prompts, 9-14h) + SIRE básico

**Razón del Cambio:**
- **Regresión crítica Nov 8, 2025:** Commits `d251377` + `54401ba` rompieron sync de reservas
- **P0 Bloqueante:** Guests NO pueden usar `/my-stay` (phone_last_4 NULL, manual search roto)
- **SIRE compliance:** Importante pero NO bloqueante (puede esperar)

---

## Estructura del Workflow

**9 Prompts** organizados en **4 Fases + Deploy:**
- FASE 0: Restaurar Reservation Sync (1 prompt) - P0 BLOQUEANTE
  - Prompt 0.1: Revertir + Mapeo SIRE + Testing (@agent-backend-developer)
- FASE 1: Fix Manual Search RPC (2 prompts) - P0 BLOQUEANTE
  - Prompt 1.1: Diagnóstico + Fix RPC (@agent-database-agent)
  - Prompt 1.2: E2E Test Manual Search (@agent-backend-developer)
- FASE 2: Mostrar Nombre Correcto (2 prompts) - P1 UX
  - Prompt 2.1: Análisis + JOIN Query (@agent-backend-developer)
  - Prompt 2.2: Update UI + Testing (@agent-ux-interface)
- FASE 3: SIRE Básico Tenant Config (2 prompts) - P2 COMPLIANCE
  - Prompt 3.1: Migration SIRE (@agent-database-agent)
  - Prompt 3.2: Update Mapper + Testing (@agent-backend-developer)
- FASE 4: Documentation & Deployment (2 prompts)
  - Prompt 4.1: Documentar Regresión (@agent-backend-developer)
  - Prompt 4.2: Deploy Staging + Production (@agent-deploy-agent)

**Total:** 9 prompts para restaurar My Stay funcional + SIRE básico (9-14h)

**Nota:** Los prompts están agrupados por agente para eficiencia. Cada prompt combina tareas del MISMO agente.

---

## FASE 0: Restaurar Reservation Sync + Mapeo SIRE Básico (P0 - 2.5-3.5h)

**NOTA:** FASE 0 subdividida en 3 prompts para mejor manejo de contexto y verificación incremental.

---

### Prompt 0.1a: Limpiar Working Directory + Verificar Estado Roto

**Agente:** `@agent-backend-developer`

**Contexto:**
Antes de restaurar código, necesitamos partir de un working directory limpio y documentar el estado roto actual para tener un baseline de comparación.

**Problema Identificado:**
Cambios sin commitear (RPC fantasma) + código roto en `bookings-mapper.ts`

---

🔽 **COPIAR DESDE AQUÍ (Prompt 0.1a)**

**Tareas:**

Necesito que limpies el working directory y documentes el estado actual roto de la sync de reservas.

**Contexto:**
Los commits `d251377` (Nov 8) y `54401ba` (Nov 8) eliminaron lógica crítica de `bookings-mapper.ts`. Actualmente:
- `phone_last_4` = NULL → Guests NO pueden autenticarse
- `reservation_code` = NULL → Métricas rotas
- `accommodation_unit_id` = NULL → Manual search busca en unit incorrecto

**Paso 1: Verificar cambios sin commitear (5 min)**

```bash
# Ver cambios actuales
git diff src/lib/integrations/motopress/bookings-mapper.ts

# Verificar si hay RPC fantasma (get_accommodation_unit_by_motopress_type_id)
grep -n "get_accommodation_unit_by_motopress_type_id" src/lib/integrations/motopress/bookings-mapper.ts
```

**Paso 2: Descartar cambios si existen (5 min)**

```bash
# SI hay cambios sin commitear, descartarlos
git checkout src/lib/integrations/motopress/bookings-mapper.ts

# Verificar que working directory esté limpio
git status
```

**Paso 3: Documentar estado roto actual (10-15 min)**

Ejecuta estas queries SQL para documentar el baseline:

```sql
-- Query 1: Verificar phone_last_4 NULL o '0000'
SELECT
  source_platform,
  COUNT(*) as total_reservations,
  COUNT(CASE WHEN phone_last_4 = '0000' OR phone_last_4 IS NULL THEN 1 END) as broken_phone,
  COUNT(CASE WHEN phone_last_4 != '0000' AND phone_last_4 IS NOT NULL THEN 1 END) as working_phone
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY source_platform;

-- Query 2: Verificar reservation_code NULL (Airbnb)
SELECT
  COUNT(*) as total_airbnb,
  COUNT(reservation_code) as has_code,
  COUNT(*) - COUNT(reservation_code) as missing_code
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND source_platform = 'airbnb'
  AND created_at > NOW() - INTERVAL '7 days';

-- Query 3: Verificar accommodation_unit_id NULL
SELECT
  COUNT(*) as total_reservations,
  COUNT(accommodation_unit_id) as has_unit_id,
  COUNT(*) - COUNT(accommodation_unit_id) as missing_unit_id
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Entregables:**
1. Working directory limpio (git status clean)
2. SQL results documentando estado roto:
   - % de reservas con phone_last_4 NULL/'0000'
   - % de Airbnb sin reservation_code
   - % de reservas sin accommodation_unit_id

**Criterios de Éxito:**
- ✅ `git status` muestra working directory limpio
- ✅ SQL queries ejecutadas y resultados documentados
- ✅ Baseline establecido para comparar después de fix

**Estimado:** 20-30 min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 0.1a (Limpiar + Verificar)?
- Working directory limpio ✓
- SQL baseline documentado ✓
- Listo para proceder a 0.1b ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 0.1a como completada:
   ```markdown
   ### 0.1a: Limpiar Working Directory + Verificar Estado Roto
   - [x] Clean uncommitted changes and verify current broken state (estimate: 20-30 min)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 0.1a completada y marcada en TODO.md

   **Progreso FASE 0:** 1/3 tareas completadas (33%)
   - [x] 0.1a: Limpiar + Verificar ✓
   - [ ] 0.1b: Restaurar Lógica
   - [ ] 0.1c: SIRE + Testing

   **Siguiente paso:** Prompt 0.1b - Restaurar Lógica Funcional (1-1.5h)
   Ver workflow.md línea 176"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 0.1a)**

---

### Prompt 0.1b: Restaurar Lógica Funcional de Oct 19

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 0.1a completado (working directory limpio)

**Contexto:**
Restaurar SOLO las 4 funciones críticas del commit `34c1a57` (Oct 19, 2025 - última versión funcionando).
SIN agregar campos SIRE todavía (eso será en Prompt 0.1c).

---

🔽 **COPIAR DESDE AQUÍ (Prompt 0.1b)**

**📊 Contexto de Progreso:**

FASE 0 - Restaurar Reservation Sync (Progreso: 1/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [ ] 0.1b: Restaurar Lógica ← ESTAMOS AQUÍ
- [ ] 0.1c: SIRE + Testing

**Estado Actual:**
- Working directory limpio ✓
- Baseline SQL documentado ✓
- Listo para restaurar lógica funcional

---

**Tareas:**

Necesito que restaures la lógica funcional de sync de reservas desde el commit `34c1a57` (Oct 19, 2025).

**⚠️ IMPORTANTE:** Solo restaurar las funciones críticas, NO agregar campos SIRE aún (eso es el siguiente prompt).

**Paso 1: Ver código a restaurar (15 min)**

```bash
# Ver el código funcional del commit 34c1a57
git show 34c1a57:src/lib/integrations/motopress/bookings-mapper.ts > /tmp/working-version.ts

# Buscar las funciones críticas
grep -n "isAirbnb\|extractPhoneFromIcal\|extractReservationCode\|get_accommodation_unit_by_motopress_id" /tmp/working-version.ts
```

**Paso 2: Restaurar las 4 funciones críticas en bookings-mapper.ts (45 min - 1h)**

Modifica `src/lib/integrations/motopress/bookings-mapper.ts` agregando estas funciones:

```typescript
// 1. Detección Airbnb
const isAirbnb = (booking.ical_description || '').includes('airbnb.com')

// 2. Phone parsing helper function
const extractPhoneFromIcal = (icalDesc: string) => {
  const phoneMatch = icalDesc.match(/phone:\s*\+?[\d\s\-()]+/)
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/[^\d]/g, '')
    return {
      full: phoneMatch[0],
      last4: digits.slice(-4).padStart(4, '0')
    }
  }
  return { full: '', last4: '0000' }
}

// 3. Reservation code extraction function
const extractReservationCode = (icalDesc: string) => {
  const codeMatch = icalDesc.match(/code:\s*([A-Z0-9]+)/)
  return codeMatch ? codeMatch[1] : null
}

// 4. Phone logic (Airbnb vs reservas directas)
let phoneLast4 = '0000'
if (isAirbnb) {
  const phone = extractPhoneFromIcal(booking.ical_description || '')
  phoneLast4 = phone.last4
} else if (booking.customer.phone) {
  const phoneDigits = booking.customer.phone.replace(/[^0-9]/g, '')
  phoneLast4 = phoneDigits.slice(-4).padStart(4, '0')
}

// 5. Reservation code extraction
const reservationCode = extractReservationCode(booking.ical_description || '')

// 6. Accommodation lookup via RPC CORRECTO (NO el fantasma)
const { data: units } = await supabase
  .rpc('get_accommodation_unit_by_motopress_id', {  // ✅ RPC correcto (no _type_id)
    p_tenant_id: tenantId,
    p_motopress_id: booking.accommodation_id
  })

const accommodationUnitId = units && units.length > 0 ? units[0].id : null
```

**Paso 3: Verificación básica (10 min)**

```sql
-- Test rápido: Verificar que al menos phone_last_4 funcione
SELECT
  source_platform,
  COUNT(*) as total,
  COUNT(CASE WHEN phone_last_4 != '0000' THEN 1 END) as has_phone
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY source_platform;
```

**Paso 4: Commit (15 min)**

```bash
git add src/lib/integrations/motopress/bookings-mapper.ts
git commit -m "fix: restore working sync logic from 34c1a57 (revert Nov 8 regression)

- Restored phone parsing for Airbnb + MotoPress direct bookings
- Restored reservation code extraction from ICS description
- Restored accommodation_unit_id lookup via RPC get_accommodation_unit_by_motopress_id
- Restored isAirbnb detection logic

Reverts breaking changes from commits:
- d251377 (Nov 8): fix: bookings-mapper creating units in wrong table
- 54401ba (Nov 8): feat: move reservation auto-link logic from DB trigger to TypeScript

Note: SIRE field mapping will be added in next commit (0.1c).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Entregables:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (con 4 funciones restauradas)
- Git commit con mensaje apropiado
- SQL verification básica (phone_last_4 working)

**Criterios de Éxito:**
- ✅ 4 funciones críticas restauradas (isAirbnb, extractPhoneFromIcal, extractReservationCode, RPC lookup)
- ✅ Verificación básica SQL muestra phone_last_4 ≠ '0000'
- ✅ Commit creado correctamente
- ✅ NO se agregaron campos SIRE (eso es siguiente prompt)

**Estimado:** 1-1.5h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 0.1b (Restaurar Lógica)?
- 4 funciones críticas restauradas ✓
- SQL verification: phone_last_4 working ✓
- Commit creado ✓
- SIRE fields NO agregados (pospuesto a 0.1c) ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 0.1b como completada:
   ```markdown
   ### 0.1b: Restaurar Lógica Funcional de Oct 19
   - [x] Restore ONLY the 4 critical functions from commit `34c1a57` (estimate: 1-1.5h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 0.1b completada y marcada en TODO.md

   **Progreso FASE 0:** 2/3 tareas completadas (67%)
   - [x] 0.1a: Limpiar + Verificar ✓
   - [x] 0.1b: Restaurar Lógica ✓
   - [ ] 0.1c: SIRE + Testing

   **Siguiente paso:** Prompt 0.1c - SIRE + Testing Completo (1-1.5h)
   Ver workflow.md línea 357"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 0.1b)**

---

### Prompt 0.1c: Agregar Campos SIRE + Testing Completo

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 0.1b completado (sync working)

**Contexto:**
Agregar mapeo de campos SIRE que YA vienen desde MotoPress API + testing exhaustivo de todo el sync.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 0.1c)**

**📊 Contexto de Progreso:**

FASE 0 - Restaurar Reservation Sync (Progreso: 2/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [ ] 0.1c: SIRE + Testing ← ESTAMOS AQUÍ

**Estado Actual:**
- Working directory limpio ✓
- 4 funciones críticas restauradas ✓
- phone_last_4, reservation_code, accommodation_unit_id funcionando ✓
- Listo para agregar SIRE fields + testing completo

---

**Tareas:**

Necesito que agregues el mapeo de campos SIRE disponibles desde MotoPress API y ejecutes el testing completo del sync.

**OBJETIVO:** Capturar TODOS los datos que YA vienen de MotoPress sync. Campos que NO vienen de MotoPress se dejan NULL (serán implementados en futuro sprint vía chat/OCR).

**Paso 1: Agregar campos SIRE en bookings-mapper.ts (30 min)**

Modifica la sección de return (líneas ~224-237) en `mapBookingToReservation()`:

```typescript
return {
  // ... existing fields (phone_last_4, reservation_code, accommodation_unit_id, etc.)

  // SIRE compliance - Campos disponibles desde MotoPress
  given_names: booking.customer.first_name || null,        // ✅ NUEVO
  first_surname: booking.customer.last_name || null,       // ✅ NUEVO

  // SIRE compliance - Campos NO disponibles (posponer a futuro sprint)
  second_surname: null,           // MotoPress solo tiene 1 campo "last_name" → name parser
  document_type: null,            // NO viene de MotoPress → Chat extraction
  document_number: null,          // NO viene de MotoPress → OCR pasaporte
  birth_date: null,               // NO viene de MotoPress → Chat extraction
  nationality_code: null,         // Requiere mapeo country → SIRE code
  origin_city_code: null,         // NO viene de MotoPress → Chat extraction
  destination_city_code: null,    // Auto-map = hotel_city_code (futuro)
  movement_type: null,            // Auto-compute E/S (futuro)
  movement_date: null             // Auto-compute check_in/out (futuro)
}
```

**Nota:** Campos como `guest_email`, `guest_country`, `check_in_date` **YA están mapeados** correctamente (líneas 203-223). NO los toques.

**Principio:** "Si viene de MotoPress sync, lo mapeamos ahora. Si no viene, lo obtenemos después vía chat/OCR."

**Paso 2: Testing completo (45 min - 1h)**

Ejecuta TODAS estas queries SQL para verificar el sync completo:

```sql
-- Query 1: Verificar phone_last_4 + SIRE fields populated
SELECT
  source_platform,
  COUNT(*) as total,
  COUNT(CASE WHEN phone_last_4 != '0000' THEN 1 END) as has_phone,
  COUNT(reservation_code) as has_code,
  COUNT(accommodation_unit_id) as has_unit,
  COUNT(given_names) as has_given_names,
  COUNT(first_surname) as has_first_surname
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY source_platform;

-- Query 2: Ver últimas 5 reservas Airbnb (con todos los campos)
SELECT
  id,
  reservation_code,
  phone_last_4,
  accommodation_unit_id,
  guest_name,
  given_names,
  first_surname,
  substring(ical_description, 1, 200) as ical_preview
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND source_platform = 'airbnb'
ORDER BY created_at DESC
LIMIT 5;

-- Query 3: Ver últimas 5 reservas directas MotoPress
SELECT
  id,
  phone_last_4,
  accommodation_unit_id,
  guest_name,
  given_names,
  first_surname
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND source_platform = 'motopress'
ORDER BY created_at DESC
LIMIT 5;

-- Query 4: Verificar accommodation names via JOIN
SELECT
  gr.guest_name,
  gr.phone_last_4,
  gr.given_names,
  gr.first_surname,
  au.name as accommodation_name,
  au.id as unit_id
FROM guest_reservations gr
LEFT JOIN accommodation_units_public au ON gr.accommodation_unit_id = au.id
WHERE gr.tenant_id = 'simmerdown'
ORDER BY gr.created_at DESC
LIMIT 10;

-- Query 5: Estadísticas generales
SELECT
  'Total reservations (last 7 days)' as metric,
  COUNT(*) as value
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  '% with phone_last_4',
  ROUND(100.0 * COUNT(CASE WHEN phone_last_4 != '0000' THEN 1 END) / COUNT(*), 2)
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  '% with reservation_code (Airbnb)',
  ROUND(100.0 * COUNT(reservation_code) / COUNT(*), 2)
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND source_platform = 'airbnb'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  '% with accommodation_unit_id',
  ROUND(100.0 * COUNT(accommodation_unit_id) / COUNT(*), 2)
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  '% with given_names',
  ROUND(100.0 * COUNT(given_names) / COUNT(*), 2)
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  '% with first_surname',
  ROUND(100.0 * COUNT(first_surname) / COUNT(*), 2)
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Paso 3: Commit SIRE mapping (15 min)**

```bash
git add src/lib/integrations/motopress/bookings-mapper.ts
git commit -m "feat: add SIRE field mapping from MotoPress

- Added SIRE fields available from MotoPress: given_names, first_surname
- Documented NULL fields (second_surname, document, birth_date, nationality, etc.)
- These NULL fields will be implemented in future sprint via chat extraction/OCR

SIRE compliance: Maps all fields currently available from MotoPress sync.
Fields not available (document, birth_date, nationality, origin/destination
cities, movement type/date) are left as NULL for future implementation.

Principle: 'If it comes from MotoPress sync, we map it now. If not, we get
it later via chat/OCR in the compliance module.'

Testing: All queries passing with 100% population for available fields.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Entregables:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (con campos SIRE mapeados)
- SQL test results completos (todas las queries ejecutadas)
- Git commit con mensaje apropiado
- Documentación de campos NULL para futuro

**Criterios de Éxito:**
- ✅ 100% reservas con phone_last_4 ≠ '0000'
- ✅ Airbnb: 100% con reservation_code extraído
- ✅ 100% con accommodation_unit_id linked correctamente
- ✅ Campos SIRE desde MotoPress: given_names, first_surname poblados
- ✅ Campos SIRE NO disponibles: NULL y documentados
- ✅ Estadísticas muestran 100% población para campos disponibles

**Estimado:** 1-1.5h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 0.1c (SIRE + Testing)?
- Campos SIRE mapeados (given_names, first_surname) ✓
- Testing completo ejecutado (5 queries SQL) ✓
- 100% población para campos disponibles ✓
- Commit creado ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 0.1c como completada:
   ```markdown
   ### 0.1c: Agregar Campos SIRE + Testing Completo
   - [x] Add SIRE field mapping from MotoPress + full testing suite (estimate: 1-1.5h)
   ```

2. **Actualizar TODO.md** - Actualizar contador de progreso:
   Cambiar de:
   ```markdown
   **Total Tasks:** 17 (5 en FASE 0 - subdividida, resto igual)
   **Completed:** 0/17 (0%)
   ```
   A:
   ```markdown
   **Total Tasks:** 17 (5 en FASE 0 - subdividida, resto igual)
   **Completed:** 3/17 (18%)
   ```

3. **Informarme del progreso:**
   "✅ FASE 0 COMPLETADA - Todas las tareas marcadas en TODO.md

   **Progreso FASE 0:** 3/3 tareas completadas (100%) ✅
   - [x] 0.1a: Limpiar + Verificar ✓
   - [x] 0.1b: Restaurar Lógica ✓
   - [x] 0.1c: SIRE + Testing ✓

   **Progreso General:** 3/11 tareas completadas (27%)

   **✨ Logros FASE 0:**
   - phone_last_4, reservation_code, accommodation_unit_id restaurados
   - Campos SIRE básicos mapeados (given_names, first_surname)
   - Testing completo con 100% población de campos disponibles

   **Siguiente paso:** FASE 1 - Fix Manual Search RPC
   Prompt 1.1: Diagnóstico + Fix RPC (2-3h)
   Ver workflow.md línea [buscar Prompt 1.1]"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 0.1c)**

---

### 📊 DECISIÓN: Campos SIRE - Mapeo MotoPress First

**MAPEAR AHORA (FASE 0):**
Todos los campos SIRE que **YA vienen desde MotoPress API**:
- ✅ `given_names` ← `booking.customer.first_name`
- ✅ `first_surname` ← `booking.customer.last_name`
- ✅ `guest_email` ← `booking.customer.email` (ya mapeado)
- ✅ `guest_country` ← `booking.customer.country` (ya mapeado)
- ✅ `check_in_date`, `check_out_date`, etc. (ya mapeados)

**POSPONER (Módulo Compliance - My Stay Chat):**
Solo campos que **NO vienen de MotoPress**:
- ❌ `second_surname` - Name parser (MotoPress solo tiene `last_name`)
- ❌ `document_type`, `document_number` - Chat extraction / OCR
- ❌ `birth_date` - Chat extraction
- ❌ `nationality_code` - Mapeo `guest_country` → código SIRE
- ❌ `origin_city_code`, `destination_city_code` - Chat extraction
- ❌ `movement_type`, `movement_date` - Lógica de cálculo

**Principio:** "Si viene de MotoPress sync, lo mapeamos ahora. Si no viene, lo obtenemos después vía chat/OCR en módulo compliance."

---

## FASE 1: Fix Manual Search RPC (P0 - 3-4h)

### Prompt 1.1: Diagnóstico + Fix RPC match_unit_manual_chunks

**Agente:** `@agent-database-agent`

**PREREQUISITO:** FASE 0 completada (sync restaurado)

**Contexto:**
Guest chat NO encuentra manuales de alojamiento cuando guests preguntan. HIPÓTESIS: RPC perdió search_path.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 3/11 tareas completadas (27%)

FASE 0 - Restaurar Reservation Sync: ✅ COMPLETADA (3/3)
- [x] 0.1a: Limpiar + Verificar ✓
- [x] 0.1b: Restaurar Lógica ✓
- [x] 0.1c: SIRE + Testing ✓

FASE 1 - Fix Manual Search RPC (Progreso: 0/2)
- [ ] 1.1: Diagnóstico + Fix RPC ← ESTAMOS AQUÍ
- [ ] 1.2: E2E Test Manual Search

**Estado Actual:**
- phone_last_4, reservation_code, accommodation_unit_id restaurados ✓
- Campos SIRE básicos mapeados ✓
- Listo para diagnosticar manual search RPC

---

**⚠️ ADVERTENCIA CRÍTICA - LEER ANTES DE EJECUTAR:**

Este prompt trabaja EXCLUSIVAMENTE con:
- ✅ Tabla: `accommodation_units_manual_chunks` (manuales de units)
- ✅ RPC: `match_unit_manual_chunks`
- ✅ Embeddings de MANUALES de accommodation units (UNA fuente del guest chat)

**NO tocar:**
- ❌ Tabla: `accommodation_units_public` (data general)
- ❌ Embeddings de units data (para `/with-me`)
- ❌ Sync desde MotoPress
- ❌ Otros embeddings del guest chat (turismo, SIRE, etc.)

**Razón:** Son sistemas SEPARADOS con propósitos diferentes.
**Ver:** `plan.md` líneas 43-128 (Arquitectura Crítica)

---

**HIPÓTESIS a corroborar:**
RPC `match_unit_manual_chunks` perdió `search_path` para pgvector.

**ESTE PROMPT:** Diagnosticar PRIMERO, confirmar hipótesis, arreglar SOLO SI confirmada.

**Hipótesis Conocida (a validar):**
RPCs que usan pgvector (`<=>` operator) pueden perder search_path en ciertas condiciones, causando:
```
ERROR: operator does not exist: vector <=> vector
```

---

**Tareas:**

1. **Diagnóstico RPC** (1h):
   **OBJETIVO:** CONFIRMAR O DESCARTAR hipótesis search_path

   ```sql
   -- 1. Ver definición actual del RPC
   SELECT
     proname as function_name,
     prosrc as source_code,
     provolatile,
     proconfig as config_settings
   FROM pg_proc
   WHERE proname = 'match_unit_manual_chunks';

   -- ⚠️ VERIFICAR: El source_code debe contener "accommodation_units_manual_chunks"
   -- ⚠️ NO debe contener "accommodation_units_public"

   -- 2. Test directo (generar embedding de prueba)
   SELECT * FROM match_unit_manual_chunks(
     p_tenant_id := 'simmerdown',
     p_unit_id := (SELECT id FROM accommodation_units_public WHERE tenant_id = 'simmerdown' LIMIT 1),
     p_query_embedding := '[0.1, 0.2, ...]'::vector,
     p_match_threshold := 0.25,
     p_match_count := 5
   );

   -- 3. Verificar chunks de MANUALES existen (NO confundir con embeddings de units data)
   SELECT
     accommodation_unit_id,
     COUNT(*) as chunk_count,
     COUNT(embedding) as has_embedding
   FROM accommodation_units_manual_chunks
   WHERE tenant_id = 'simmerdown'
   GROUP BY accommodation_unit_id;

   -- ⚠️ VERIFICAR: Resultados de tabla accommodation_units_manual_chunks (manuales)
   -- ⚠️ NO ejecutar queries en accommodation_units_public (data general)
   ```

   **RESULTADO ESPERADO:**
   - SI error "operator does not exist" → hipótesis confirmada, proceder paso 2
   - SI funciona correctamente → hipótesis descartada, investigar causa alternativa

2. **Fix RPC con search_path Correcto** (2h):
   **PREREQUISITO:** Hipótesis confirmada en paso 1
   **SI descartada:** DETENER y reportar hallazgos
   ```sql
   CREATE OR REPLACE FUNCTION public.match_unit_manual_chunks(
     p_tenant_id varchar,
     p_unit_id uuid,
     p_query_embedding vector(1536),
     p_match_threshold float DEFAULT 0.3,
     p_match_count int DEFAULT 5
   )
   RETURNS TABLE(
     id uuid,
     content text,
     metadata jsonb,
     similarity float
   )
   LANGUAGE plpgsql STABLE
   SET search_path = 'public, extensions'  -- ✅ CRÍTICO para pgvector
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       c.id,
       c.content,
       c.metadata,
       1 - (c.embedding <=> p_query_embedding) as similarity
     FROM accommodation_units_manual_chunks c
     WHERE c.tenant_id = p_tenant_id
       AND c.accommodation_unit_id = p_unit_id
       AND 1 - (c.embedding <=> p_query_embedding) > p_match_threshold
     ORDER BY c.embedding <=> p_query_embedding
     LIMIT p_match_count;
   END;
   $$;

   -- Agregar comment para prevenir futuros issues
   COMMENT ON FUNCTION public.match_unit_manual_chunks IS
   'IMMUTABLE search_path - DO NOT MODIFY without testing vector search
   See: docs/guest-chat-debug/PREVENTION_SYSTEM.md';
   ```

3. **Aplicar Migration** (30 min):
   ```bash
   # Crear migration
   supabase migration new fix_manual_search_rpc

   # Aplicar en staging
   pnpm dlx tsx scripts/execute-ddl-via-api.ts \
     supabase/migrations/YYYYMMDDHHMMSS_fix_manual_search_rpc.sql
   ```

4. **Verificación Básica** (15 min):
   Test SQL rápido para verificar que RPC no da error:
   ```sql
   -- Verificar que RPC ejecuta sin error
   SELECT COUNT(*) as chunks_found
   FROM match_unit_manual_chunks(
     'simmerdown',
     (SELECT id FROM accommodation_units_public WHERE tenant_id = 'simmerdown' LIMIT 1),
     (SELECT embedding FROM accommodation_units_manual_chunks LIMIT 1),
     0.25,
     5
   );
   ```

**Entregables:**
- `supabase/migrations/YYYYMMDDHHMMSS_fix_manual_search_rpc.sql`
- RPC con search_path correcto + IMMUTABLE comment
- Verificación básica: RPC ejecuta sin error

**Criterios de Éxito:**
- ✅ RPC recreado con search_path correcto
- ✅ Migration aplicada en staging sin errores
- ✅ Verificación básica SQL retorna resultados (no error de operator)

**Nota:** Testing completo E2E se hace en Prompt 1.2

**Estimado:** 2-3h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.1 (Diagnóstico + Fix RPC)?
- Hipótesis confirmada/descartada con evidencia ✓
- RPC recreado con search_path correcto ✓
- Migration aplicada en staging ✓
- Verificación básica SQL funciona (no error operator) ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.1 como completada:
   ```markdown
   ### 1.1 Diagnóstico RPC match_unit_manual_chunks
   - [x] Diagnose RPC to CORROBORATE hypothesis (not assume broken) (estimate: 1h)
   ```
   Y también marcar 1.2 como completada si se hizo en el mismo prompt:
   ```markdown
   ### 1.2 Fix RPC si Roto
   - [x] Recreate RPC with correct search_path (estimate: 2h)
   ```

2. **Actualizar TODO.md** - Actualizar contador:
   ```markdown
   **Completed:** 5/17 (29%)
   ```

3. **Informarme del progreso:**
   "✅ Tareas 1.1 y 1.2 completadas y marcadas en TODO.md

   **Progreso FASE 1:** 1/2 tareas completadas (50%)
   - [x] 1.1: Diagnóstico + Fix RPC ✓
   - [ ] 1.2: E2E Test Manual Search

   **Progreso General:** 4/11 tareas completadas (36%)

   **Siguiente paso:** Prompt 1.2 - E2E Test Manual Search (1-1.5h)
   Ver workflow.md línea siguiente"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.1)**

---

### Prompt 1.2: E2E Test Manual Search

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 1.1 completado - RPC arreglado y funcionando

**Contexto:**
Verificar que el manual search funciona end-to-end desde el guest chat.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 4/11 tareas completadas (36%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (Progreso: 1/2)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [ ] 1.2: E2E Test Manual Search ← ESTAMOS AQUÍ

**Estado Actual:**
- Reservation sync restaurado (phone_last_4, reservation_code, accommodation_unit_id) ✓
- Mapeo básico SIRE completado ✓
- RPC `match_unit_manual_chunks` diagnosticado y arreglado ✓
- Listo para testing end-to-end del manual search

---

**Tareas:**

1. **Test desde Guest Chat** (30 min):
   Test en navegador (http://simmerdown.localhost:3001/my-stay):
   ```
   Test 1: WiFi password
   - Guest: "¿Cuál es el WiFi password?"
   - Expected: Bot encuentra chunks del manual → responde con SSID y password

   Test 2: Check-in instructions
   - Guest: "¿Cómo hago el check-in?"
   - Expected: Bot encuentra sección de check-in → responde con instrucciones

   Test 3: House rules
   - Guest: "¿Puedo hacer fiestas?"
   - Expected: Bot encuentra reglas de la casa → responde con políticas
   ```

2. **Verificación Técnica** (30 min):
   ```sql
   -- Verificar que RPC retorna resultados
   SELECT
     COUNT(*) as total_found,
     AVG(similarity) as avg_similarity,
     MAX(similarity) as max_similarity
   FROM match_unit_manual_chunks(
     'simmerdown',
     (SELECT id FROM accommodation_units_public WHERE name LIKE '%Jammin%' LIMIT 1),
     (SELECT embedding FROM accommodation_units_manual_chunks LIMIT 1),
     0.25,
     5
   );
   ```

3. **Test con Múltiples Accommodations** (30 min):
   - Verificar manual search funciona en 5 accommodations diferentes
   - Verificar performance <500ms por query
   - Verificar similarity scores > 0.25 para matches relevantes

**Entregables:**
- Test results documentados (screenshots o logs)
- Performance metrics
- Verificación de 5 accommodations

**Criterios de Éxito:**
- ✅ RPC retorna `total_found > 0` para queries comunes
- ✅ Bot responde con información del manual correcto
- ✅ Performance <500ms
- ✅ Test con 5 accommodations diferentes - todos pasan

**Estimado:** 1-1.5h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.2 (E2E Test Manual Search)?
- Test desde guest chat ejecutado (3 tests) ✓
- Verificación técnica SQL completada ✓
- 5 accommodations probados exitosamente ✓
- Performance <500ms confirmado ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.3 como completada:
   ```markdown
   ### 1.3: E2E Test Manual Search
   - [x] End-to-end testing of manual search from guest chat (estimate: 1-1.5h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 1.3 completada y marcada en TODO.md

   **Progreso FASE 1:** 2/2 tareas completadas (100%)
   - [x] 1.1: Diagnóstico + Fix RPC ✓
   - [x] 1.2: E2E Test Manual Search ✓

   **✨ FASE 1 COMPLETADA - Logros:**
   - RPC `match_unit_manual_chunks` diagnosticado y reparado
   - Search_path configurado correctamente
   - Manual search funcionando end-to-end
   - Performance <500ms verificado en 5 accommodations

   **Progreso General:** 5/11 tareas completadas (45%)

   **Siguiente paso:** FASE 2 - Mostrar Nombre Correcto del Accommodation
   Prompt 2.1: Implementar JOIN Query + UI Update (2-3h)
   Ver workflow.md línea 1002"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.2)**

---

## FASE 2: Mostrar Nombre Correcto del Accommodation (P1 - 2-3h)

### Prompt 2.1: Implementar JOIN Query + UI Update

**Agente:** `@agent-backend-developer` (query) + `@agent-ux-interface` (UI)

**PREREQUISITO:** Prompt 1.2 completado - Manual search funcionando end-to-end

**Contexto:**
Guest chat muestra nombre de alojamiento INCORRECTO o genérico.

**HIPÓTESIS a confirmar en este prompt:**
- HIPÓTESIS: Chat lee nombre de `accommodation_units_public` (tabla genérica para `/with-me`)
- DEBE SER: Leer nombre via JOIN con `guest_reservations.accommodation_unit_id`
- ACCIÓN: Investigar código actual ANTES de implementar solución

**Comportamiento Esperado:**
- Reserva directa → "Chat - Jammin'" (nombre específico)
- Reserva Airbnb → "Chat - Dreamland" (nombre genérico del unit asignado)
- Sin unit_id → "Guest Chat" (fallback)

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 5/11 tareas completadas (45%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (Progreso: 0/2)
- [ ] 2.1: Análisis + JOIN Query ← ESTAMOS AQUÍ
- [ ] 2.2: Update UI + Testing

**Estado Actual:**
- Reservation sync restaurado completamente ✓
- Manual search funcionando end-to-end ✓
- RPC performance <500ms verificado ✓
- Listo para implementar nombre correcto del accommodation

---

**Tareas:**

1. **Análisis Actual** (30 min - `@agent-backend-developer`):
   **OBJETIVO:** CONFIRMAR hipótesis sobre fuente de datos

   ```bash
   # ¿De dónde lee el nombre actualmente?
   grep -n "accommodation" src/components/GuestChatInterface.tsx | head -20

   # Ver query de reserva
   grep -A 20 "guest_reservations" src/app/[tenant]/my-stay/page.tsx
   ```

   **RESULTADO:** Documentar DÓNDE se lee actualmente el nombre
   - Si coincide con hipótesis → proceder con JOIN
   - Si no coincide → ajustar solución apropiadamente

2. **Implementar JOIN Query** (1h):
   **PREREQUISITO:** Hipótesis confirmada en paso 1
   **Modificar:** `src/app/[tenant]/my-stay/page.tsx` (o API que carga la reserva)

   ```typescript
   // ANTES (incorrecto):
   const { data: reservation } = await supabase
     .from('guest_reservations')
     .select('*')
     .eq('id', reservationId)
     .single()

   // DESPUÉS (correcto):
   const { data: reservation } = await supabase
     .from('guest_reservations')
     .select(`
       *,
       accommodation:accommodation_units_public!accommodation_unit_id (
         id,
         name,
         metadata
       )
     `)
     .eq('id', reservationId)
     .single()

   // Uso:
   const accommodationName = reservation?.accommodation?.name || 'Guest'
   ```

**Entregables:**
- `src/app/[tenant]/my-stay/page.tsx` (modificado - JOIN query)
- Query retorna accommodation name correctamente

**Criterios de Éxito:**
- ✅ JOIN query implementado
- ✅ accommodationName se extrae correctamente
- ✅ Fallback a 'Guest' si NULL

**Estimado:** 1-1.5h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 2.1 (Análisis + JOIN Query)?
- Hipótesis confirmada mediante análisis de código ✓
- JOIN query implementado correctamente ✓
- accommodationName se extrae vía JOIN ✓
- Fallback a 'Guest' implementado ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 2.1 como completada:
   ```markdown
   ### 2.1: Análisis + JOIN Query
   - [x] Analyze current code and implement JOIN query to fetch correct accommodation name (estimate: 1-1.5h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 2.1 completada y marcada en TODO.md

   **Progreso FASE 2:** 1/2 tareas completadas (50%)
   - [x] 2.1: Análisis + JOIN Query ✓
   - [ ] 2.2: Update UI + Testing
   - [ ] 2.3: E2E Test Nombre Correcto
   - [ ] 2.4: Validar Edge Cases

   **Progreso General:** 6/11 tareas completadas (55%)

   **Siguiente paso:** Prompt 2.2 - Update UI + Testing (1-1.5h)
   Ver workflow.md línea 1154"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 2.1)**

---

### Prompt 2.2: Update UI + Testing

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 2.1 completado - JOIN query funcional

**Contexto:**
Actualizar UI del guest chat para mostrar nombre correcto del accommodation.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 6/11 tareas completadas (55%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (Progreso: 1/4)
- [x] 2.1: Análisis + JOIN Query ✓ COMPLETADO
- [ ] 2.2: Update UI + Testing ← ESTAMOS AQUÍ
- [ ] 2.3: E2E Test Nombre Correcto
- [ ] 2.4: Validar Edge Cases

**Estado Actual:**
- JOIN query implementado para obtener accommodation name ✓
- accommodationName se extrae correctamente del JOIN ✓
- Fallback a 'Guest' implementado ✓
- Listo para actualizar UI con nombre correcto

---

**Tareas:**

1. **Update UI** (30 min):
   **Modificar:** `src/components/GuestChatInterface.tsx`

   ```typescript
   // Props update
   interface GuestChatInterfaceProps {
     // ... existing props
     accommodationName?: string
   }

   // Header
   <div className="chat-header">
     <h2>
       {accommodationName ? `Chat - ${accommodationName}` : 'Guest Chat'}
     </h2>
   </div>

   // Welcome message
   useEffect(() => {
     if (messages.length === 0 && accommodationName) {
       const welcomeMessage = {
         role: 'assistant',
         content: `¡Bienvenido a ${accommodationName}! ¿En qué puedo ayudarte hoy?`
       }
       setMessages([welcomeMessage])
     }
   }, [accommodationName])
   ```

2. **Testing** (1h):
   - Test 1: Reserva directa "Jammin'" → Header muestra "Chat - Jammin'"
   - Test 2: Reserva Airbnb "Dreamland" → Header muestra "Chat - Dreamland"
   - Test 3: Reservation sin unit_id → Header muestra "Guest Chat"
   - Verify: NO afecta `/with-me` public chat
   - Test con 5 accommodations diferentes

**Entregables:**
- `src/components/GuestChatInterface.tsx` (modificado - UI)
- Test results: nombre correcto en 5 accommodations
- Screenshots de header correcto

**Criterios de Éxito:**
- ✅ Nombre correcto en header y bienvenida
- ✅ Airbnb muestra nombre genérico del unit (NO "Guest")
- ✅ NO afecta /with-me public chat
- ✅ NO cambia sync de accommodation_units_public

**Estimado:** 1-1.5h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 2.2 (Update UI + Testing)?
- UI actualizada con accommodation name ✓
- Header muestra 'Chat - [Nombre]' correctamente ✓
- Testing completado (5 accommodations) ✓
- NO afecta /with-me public chat ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 2.2 como completada:
   ```markdown
   ### 2.2: Update UI + Testing
   - [x] Update guest chat UI to show correct accommodation name (estimate: 1-1.5h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 2.2 completada y marcada en TODO.md

   **Progreso FASE 2:** 2/2 tareas completadas (100%)
   - [x] 2.1: Análisis + JOIN Query ✓
   - [x] 2.2: Update UI + Testing ✓
   - [ ] 2.3: E2E Test Nombre Correcto
   - [ ] 2.4: Validar Edge Cases

   **Progreso General:** 7/11 tareas completadas (64%)

   **Siguiente paso:** Prompt 2.3 - E2E Test Nombre Correcto (1h)
   Ver workflow.md línea [siguiente]"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 2.2)**

---

## FASE 3: SIRE Básico - Auto-Config Tenant (P2 - 2-3h)

### Prompt 3.1: Migration SIRE Tenant Config

**Agente:** `@agent-database-agent`

**PREREQUISITO:** Prompt 2.2 completado - UI muestra nombre correcto

**Contexto:**
SIRE compliance requiere 2 campos del hotel que actualmente están NULL:
- `hotel_sire_code` - NIT del hotel (ya existe en `tenant_registry.nit`)
- `hotel_city_code` - Código DIVIPOLA de la ciudad (nuevo campo)

**Scope:**
- ✅ Solo agregar campos de tenant (2 campos)
- ✅ Poblar SimmerDown como ejemplo
- ❌ NO implementar OCR, chat extraction, name parser (pospuesto)

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 7/11 tareas completadas (64%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (2/2 completado)
- [x] 2.1: Análisis + JOIN Query ✓ COMPLETADO
- [x] 2.2: Update UI + Testing ✓ COMPLETADO

FASE 3 - SIRE Básico (Progreso: 0/2)
- [ ] 3.1: Migration SIRE Config ← ESTAMOS AQUÍ
- [ ] 3.2: Update Mapper + Testing

**Estado Actual:**
- Reservation sync completamente funcional ✓
- Manual search funcionando end-to-end ✓
- Nombres correctos mostrados en guest chat ✓
- Listo para agregar campos SIRE básicos del tenant

---

**Tareas:**

1. **Crear Migration** (30 min):
   ```sql
   -- supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql

   ALTER TABLE tenant_registry
   ADD COLUMN hotel_sire_code varchar(20) COMMENT 'NIT del hotel para SIRE compliance',
   ADD COLUMN hotel_city_code varchar(6) COMMENT 'Código DIVIPOLA (ciudad) para SIRE';

   -- Poblar SimmerDown
   -- TODO: Investigar código DIVIPOLA exacto de San Andrés Isla ANTES de ejecutar
   UPDATE tenant_registry
   SET
     hotel_sire_code = nit,  -- Ya existe
     hotel_city_code = '[SAN_ANDRES_DIVIPOLA_CODE]'  -- San Andrés Isla (código a investigar)
   WHERE tenant_id = 'simmerdown';

   -- Validar
   SELECT
     tenant_id,
     razon_social,
     nit as hotel_sire_code,
     hotel_city_code
   FROM tenant_registry
   WHERE tenant_id = 'simmerdown';
   ```

2. **Aplicar Migration** (15 min):
   ```bash
   pnpm dlx tsx scripts/execute-ddl-via-api.ts \
     supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql
   ```

3. **Verificar** (15 min):
   ```sql
   -- Verificar campos agregados
   SELECT
     tenant_id,
     hotel_sire_code,
     hotel_city_code
   FROM tenant_registry
   WHERE tenant_id = 'simmerdown';
   ```

**Entregables:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql`
- tenant_registry con nuevos campos poblados

**Criterios de Éxito:**
- ✅ Campos hotel_sire_code y hotel_city_code agregados
- ✅ SimmerDown poblado correctamente
- ✅ Migration aplicada sin errores

**Estimado:** 1h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 3.1 (Migration SIRE Config)?
- Migration creada con campos SIRE ✓
- Migration aplicada sin errores ✓
- SimmerDown poblado con NIT y código DIVIPOLA ✓
- Verificación SQL ejecutada exitosamente ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 3.1 como completada:
   ```markdown
   ### 3.1: Migration SIRE Tenant Config
   - [x] Add hotel_sire_code and hotel_city_code to tenant_registry (estimate: 1h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 3.1 completada y marcada en TODO.md

   **Progreso FASE 3:** 1/2 tareas completadas (50%)
   - [x] 3.1: Migration SIRE Config ✓
   - [ ] 3.2: Update Mapper + Testing
   - [ ] 3.3: Validar SIRE Output

   **Progreso General:** 8/11 tareas completadas (73%)

   **Siguiente paso:** Prompt 3.2 - Update Bookings Mapper + Testing (1-2h)
   Ver workflow.md línea 1438"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 3.1)**

---

### Prompt 3.2: Update Bookings Mapper + Testing

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 3.1 completado - tenant_registry con campos SIRE

**Contexto:**
Auto-poblar campos SIRE del hotel en cada sync de reservas.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 8/11 tareas completadas (73%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (2/2 completado)
- [x] 2.1: Análisis + JOIN Query ✓ COMPLETADO
- [x] 2.2: Update UI + Testing ✓ COMPLETADO

FASE 3 - SIRE Básico (Progreso: 1/2)
- [x] 3.1: Migration SIRE Config ✓ COMPLETADO
- [ ] 3.2: Update Mapper + Testing ← ESTAMOS AQUÍ

**Estado Actual:**
- Campos SIRE agregados a tenant_registry ✓
- SimmerDown poblado con NIT y código DIVIPOLA ✓
- Listo para auto-poblar SIRE en cada sync de reservas

---

**Tareas:**

1. **Update Bookings Mapper** (1h):
   **Modificar:** `src/lib/integrations/motopress/bookings-mapper.ts`

   ```typescript
   // Leer config de tenant
   private async getTenantSIREConfig(tenantId: string) {
     const { data: tenant } = await supabase
       .from('tenant_registry')
       .select('hotel_sire_code, hotel_city_code')
       .eq('tenant_id', tenantId)
       .single()

     return {
       hotelCode: tenant?.hotel_sire_code || null,
       cityCode: tenant?.hotel_city_code || null
     }
   }

   // En mapBookingToReservation():
   const tenantConfig = await this.getTenantSIREConfig(tenantId)

   // Auto-poblar (lines 224-237):
   return {
     // ... existing fields

     // SIRE compliance fields (auto-poblados)
     hotel_sire_code: tenantConfig.hotelCode,
     hotel_city_code: tenantConfig.cityCode,

     // SIRE fields sin datos (NULL por ahora - futuro sprint)
     document_type: null,
     document_number: null,
     first_surname: null,
     second_surname: null,
     given_names: null,
     nationality_code: null,
     birth_date: null,
     origin_city_code: null,
     destination_city_code: null
   }
   ```

2. **Testing** (1h):
   ```sql
   -- 1. Verificar tenant config
   SELECT
     tenant_id,
     hotel_sire_code,
     hotel_city_code
   FROM tenant_registry
   WHERE tenant_id = 'simmerdown';

   -- 2. Sync nueva reserva → verificar auto-poblado
   SELECT
     id,
     guest_name,
     hotel_sire_code,
     hotel_city_code,
     created_at
   FROM guest_reservations
   WHERE tenant_id = 'simmerdown'
   ORDER BY created_at DESC
   LIMIT 5;

   -- 3. Estadísticas
   SELECT
     COUNT(*) as total_reservations,
     COUNT(hotel_sire_code) as has_hotel_code,
     COUNT(hotel_city_code) as has_city_code
   FROM guest_reservations
   WHERE tenant_id = 'simmerdown';
   ```

**Entregables:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (modificado)
- Test results: 100% reservas con hotel SIRE fields

**Criterios de Éxito:**
- ✅ Nuevas reservas auto-pueblan hotel_sire_code + hotel_city_code
- ✅ 100% estadísticas pobladas
- ✅ UI muestra "Hotel: [NIT]", "Ciudad: San Andrés Isla ([CODE])"

**Estimado:** 1-2h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 3.2 (Update Mapper + Testing)?
- getTenantSIREConfig() implementado ✓
- Bookings mapper auto-puebla campos SIRE ✓
- Testing SQL completado (100% pobladas) ✓
- Nuevas reservas incluyen hotel_sire_code y hotel_city_code ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 3.2 como completada:
   ```markdown
   ### 3.2: Update Mapper + Testing
   - [x] Update bookings mapper to auto-populate SIRE hotel fields (estimate: 1-2h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 3.2 completada y marcada en TODO.md

   **Progreso FASE 3:** 2/2 tareas completadas (100%)
   - [x] 3.1: Migration SIRE Config ✓
   - [x] 3.2: Update Mapper + Testing ✓
   - [ ] 3.3: Validar SIRE Output

   **Progreso General:** 9/11 tareas completadas (82%)

   **Siguiente paso:** Prompt 3.3 - Validar SIRE Output (30 min)
   Ver workflow.md línea [siguiente]"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 3.2)**

---

## FASE 4: Documentation & Deployment (2h)

### Prompt 4.1: Documentar Regresión

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 3.2 completado - SIRE auto-poblado funcionando

**Contexto:**
Documentar la regresión del 8 de noviembre y los fixes aplicados para prevención futura.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 9/11 tareas completadas (82%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (2/2 completado)
- [x] 2.1: Análisis + JOIN Query ✓ COMPLETADO
- [x] 2.2: Update UI + Testing ✓ COMPLETADO

FASE 3 - SIRE Básico (2/2 completado)
- [x] 3.1: Migration SIRE Config ✓ COMPLETADO
- [x] 3.2: Update Mapper + Testing ✓ COMPLETADO

FASE 4 - Documentation & Deployment (Progreso: 0/2)
- [ ] 4.1: Documentar Regresión ← ESTAMOS AQUÍ
- [ ] 4.2: Deploy Staging + Production

**Estado Actual:**
- My Stay guest chat completamente restaurado ✓
- Manual search funcionando end-to-end ✓
- Nombres correctos en UI ✓
- SIRE básico auto-poblado ✓
- Listo para documentar la regresión y desplegar

---

**Tareas:**

1. **Documentar Regresión** (1h):
   **Crear:** `docs/my-stay-guest-chat/REGRESSION_FIX_NOV_2025.md`

   **Contenido:**
   ```markdown
   # Regresión My Stay Guest Chat - Noviembre 2025

   ## Resumen Ejecutivo
   - Fecha regresión: Nov 8, 2025
   - Fecha fix: Nov 13, 2025
   - Severidad: P0 (bloqueante)

   ## Causa Raíz
   - Commits: d251377 + 54401ba
   - Qué se rompió: phone_last_4, reservation_code, accommodation_unit_id

   ## Solución
   - FASE 0: Revert a 34c1a57
   - FASE 1: Fix manual search RPC
   - FASE 2: Fix nombre accommodation
   - FASE 3: SIRE básico

   ## Prevención Futura
   - Git workflow con health checks
   - No modificar sync sin tests E2E
   - RPC con IMMUTABLE comments
   ```

**Entregables:**
- `docs/my-stay-guest-chat/REGRESSION_FIX_NOV_2025.md`
- Documentación completa de causa raíz y prevención

**Criterios de Éxito:**
- ✅ Documentación clara y completa
- ✅ Causa raíz bien explicada
- ✅ Prevención futura documentada

**Estimado:** 1h

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.1 (Documentar Regresión)?
- Documento REGRESSION_FIX_NOV_2025.md creado ✓
- Causa raíz claramente explicada ✓
- Solución documentada por fases ✓
- Prevención futura incluida ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.1 como completada:
   ```markdown
   ### 4.1: Documentar Regresión
   - [x] Document the regression and fixes for future prevention (estimate: 1h)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 4.1 completada y marcada en TODO.md

   **Progreso FASE 4:** 1/2 tareas completadas (50%)
   - [x] 4.1: Documentar Regresión ✓
   - [ ] 4.2: Deploy Staging + Production
   - [ ] 4.3: Smoke Testing
   - [ ] 4.4: Validar Monitoring

   **Progreso General:** 10/11 tareas completadas (91%)

   **Siguiente paso:** Prompt 4.2 - Deploy Staging + Production (1h + 24h waiting)
   Ver workflow.md línea 1742"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.1)**

---

### Prompt 4.2: Deploy Staging + Production

**Agente:** `@agent-deploy-agent`

**PREREQUISITO:** Todos los prompts anteriores completados

**Contexto:**
Deploy a staging para validación, y producción tras 24h sin errores.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 10/11 tareas completadas (91%)

FASE 0 - Restaurar Reservation Sync (3/3 completado)
- [x] 0.1a: Limpiar + Verificar ✓ COMPLETADO
- [x] 0.1b: Restaurar Lógica ✓ COMPLETADO
- [x] 0.1c: SIRE + Testing ✓ COMPLETADO

FASE 1 - Fix Manual Search RPC (2/2 completado)
- [x] 1.1: Diagnóstico + Fix RPC ✓ COMPLETADO
- [x] 1.2: E2E Test Manual Search ✓ COMPLETADO

FASE 2 - Mostrar Nombre Correcto (2/2 completado)
- [x] 2.1: Análisis + JOIN Query ✓ COMPLETADO
- [x] 2.2: Update UI + Testing ✓ COMPLETADO

FASE 3 - SIRE Básico (2/2 completado)
- [x] 3.1: Migration SIRE Config ✓ COMPLETADO
- [x] 3.2: Update Mapper + Testing ✓ COMPLETADO

FASE 4 - Documentation & Deployment (Progreso: 1/2)
- [x] 4.1: Documentar Regresión ✓ COMPLETADO
- [ ] 4.2: Deploy Staging + Production ← ESTAMOS AQUÍ

**Estado Actual:**
- Todas las fases técnicas completadas ✓
- Regresión documentada ✓
- Código listo para deployment
- Listo para deploy staging → validación → production

---

**Tareas:**

1. **Deploy Staging** (30 min):
   ```bash
   pnpm run build
   pnpm dlx tsx scripts/monitoring-dashboard.ts
   ./scripts/deploy-staging.sh
   curl -I https://simmerdown.staging.muva.chat/my-stay
   ```

2. **Smoke Testing** (30 min):
   - Sync reservas → phone_last_4 OK
   - Guest login → autenticación funciona
   - Manual search → retorna chunks
   - Chat muestra nombre correcto
   - Monitor 24h

3. **Production Deploy** (cuando staging validado - 24h después):
   ```bash
   pnpm dlx tsx scripts/health-check-staging.ts
   ./scripts/deploy-production.sh
   curl -I https://simmerdown.muva.chat/my-stay
   ```

**Entregables:**
- Staging deployment successful
- Production deployment successful (post 24h validation)
- Monitoring reports

**Criterios de Éxito:**
- ✅ Staging 100% funcional
- ✅ Production sin regresiones
- ✅ Zero P0 errors en 48h monitoring

**Estimado:** 1h (+ 24h waiting)

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.2 (Deploy Staging + Production)?
- Staging deployment exitoso ✓
- Smoke testing completado (5 checks) ✓
- 24h monitoring sin errores ✓
- Production deployment exitoso ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.2 como completada:
   ```markdown
   ### 4.2: Deploy Staging + Production
   - [x] Deploy to staging, validate, then production after 24h (estimate: 1h + 24h waiting)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 4.2 completada y marcada en TODO.md

   **Progreso FASE 4:** 2/2 tareas completadas (100%)
   - [x] 4.1: Documentar Regresión ✓
   - [x] 4.2: Deploy Staging + Production ✓
   - [ ] 4.3: Smoke Testing
   - [ ] 4.4: Validar Monitoring

   **Progreso General:** 11/11 tareas completadas (100%)

   **✨ PROYECTO MY STAY FIX - DEPLOYMENT COMPLETADO**

   **Logros Principales:**
   - Reservation sync completamente restaurado
   - Manual search RPC funcionando <500ms
   - Nombres correctos en guest chat UI
   - SIRE básico auto-poblado desde tenant config
   - Deployment staging + production exitoso

   **Siguiente paso:** Prompt 4.3 - Smoke Testing (30 min)
   Ver workflow.md línea [siguiente]"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.2)**

---

## 📊 Resumen de Prompts

| Fase | Prompt | Agente | Estimado | Tareas Principales | Delimitadores |
|------|--------|--------|----------|-------------------|---------------|
| 0 | 0.1a Limpiar + Verificar | backend-developer | 20-30 min | Clean working dir + SQL baseline | 🔽 🔼 ✅ |
| 0 | 0.1b Restaurar Lógica | backend-developer | 1-1.5h | Restore 4 critical functions | 🔽 🔼 ✅ |
| 0 | 0.1c SIRE + Testing | backend-developer | 1-1.5h | Map SIRE fields + full testing | 🔽 🔼 ✅ |
| 1 | 1.1 Diagnóstico + Fix RPC | database-agent | 2-3h | Diagnose + fix search_path | 🔽 🔼 ✅ |
| 1 | 1.2 E2E Test Manual Search | backend-developer | 1-1.5h | E2E testing guest chat | 🔽 🔼 ✅ |
| 2 | 2.1 Análisis + JOIN Query | backend-developer | 1-1.5h | Análisis + JOIN accommodation | 🔽 🔼 ✅ |
| 2 | 2.2 Update UI + Testing | ux-interface | 1-1.5h | UI header/welcome + testing | 🔽 🔼 ✅ |
| 3 | 3.1 Migration SIRE | database-agent | 1h | Agregar campos tenant | 🔽 🔼 ✅ |
| 3 | 3.2 Update Mapper + Testing | backend-developer | 1-2h | Auto-poblar + testing | 🔽 🔼 ✅ |
| 4 | 4.1 Documentar Regresión | backend-developer | 1h | Documentación completa | 🔽 🔼 ✅ |
| 4 | 4.2 Deploy Staging + Production | deploy-agent | 1h | Deploy + monitoring | 🔽 🔼 ✅ |

**Total:** 11 prompts = 11.5-16h estimado

**FASE 0 Subdivision Benefits:**
- ✅ Peak context reduction: 45% → 25% (20% más headroom)
- ✅ Incremental verification: 3 checkpoints en lugar de 1
- ✅ Granular commits: Restauración separada de features nuevas
- ✅ Menor riesgo: Tareas aisladas, fáciles de revertir

**Workflow Improvements (ALL PROMPTS):**
- ✅ Copy delimiters: 🔽 (start) y 🔼 (end) en TODOS los prompts
- ✅ Post-execution verification: Aprobación explícita antes de marcar completado
- ✅ Automatic TODO.md updates: Progreso tracked sistemáticamente
- ✅ Progress context: Cada prompt muestra estado de fases previas
- ✅ Standardized pattern: Template consistente en todos los prompts

---

## 🚀 Orden de Ejecución

**Secuencial (REQUIRED):**
1. FASE 0 (P0) → FASE 1 (P0) → FASE 2 (P1) → FASE 3 (P2) → FASE 4 (Deploy)

**NO se puede paralelizar** - cada fase depende de la anterior.

**Crítico (P0):** FASE 0-1 = 5.5-7.5h (guests pueden usar chat + datos SIRE básicos)
**Recomendado:** FASE 0-3 = 9.5-12.5h (My Stay funcional + SIRE básico completo)
**Completo:** FASE 0-4 = 11.5-16h (Production ready con documentación)

---

## 🚧 FASES SIRE POSPUESTAS (Futuro Sprint - Módulo Compliance)

**PRINCIPIO ADOPTADO:** "MotoPress Sync First"
- ✅ MAPEAR AHORA: Campos SIRE que YA vienen de MotoPress (FASE 0)
- ❌ POSPONER: Solo campos que NO vienen de MotoPress (módulo compliance)

Las siguientes fases del workflow original se posponen para el **módulo de compliance del guest chat**:

### Campos SIRE NO Disponibles en MotoPress
- `second_surname` - Name parser (MotoPress solo tiene `last_name`)
- `document_type`, `document_number` - OCR pasaporte / chat extraction
- `birth_date` - Chat extraction
- `nationality_code` - Mapper `guest_country` → código SIRE
- `origin_city_code`, `destination_city_code` - Chat extraction
- `movement_type`, `movement_date` - Lógica de cálculo

### Features Pospuestas
- ❌ FASE 1 original: Diagnóstico extenso sync (6h) - ya identificamos regresión
- ❌ FASE 3 original: Document OCR (6h) - para campos NO disponibles
- ❌ FASE 4 original: Chat extraction híbrido (11h) - para campos NO disponibles
- ❌ FASE 5 original: Name parser + nationality mapper (9h) - para campos NO disponibles
- ❌ FASE 6 original: PUT endpoint SIRE (6h) - para actualizar desde chat
- ❌ FASE 7 original: E2E tests SIRE (5h) - testing completo

**Total pospuesto:** ~43h de features SIRE para campos NO disponibles en MotoPress

**Razón:** My Stay funcional + datos SIRE desde MotoPress es P0. Campos que requieren chat/OCR son P2 (módulo compliance dedicado).

---

**Última actualización:** 2025-11-13 16:45
**Estado:** ✅ Workflow subdividido - FASE 0 split en 3 prompts con copy delimiters

**Cambios Nov 13 16:45:**
- ✅ FASE 0 subdividida en 3 prompts (0.1a: Clean, 0.1b: Restore, 0.1c: SIRE + Testing)
- ✅ Total prompts: 9 → 11 (agregados 2 sub-prompts)
- ✅ Copy delimiters agregados: 🔽 (COPIAR DESDE AQUÍ) y 🔼 (COPIAR HASTA AQUÍ)
- ✅ Tabla de resumen actualizada con 11 prompts + columna delimitadores
- ✅ Peak context reduction: 45% → 25% (mejor manejo de ventana de contexto)
- ✅ Prompts listos para copy-paste directo

**Cambios Nov 13 14:45:**
- ✅ Agregada arquitectura crítica al inicio (líneas 9-29)
- ✅ FASE 1 (Prompt 1.1) actualizado con advertencias sobre NO tocar units data embeddings
- ✅ Clarificado alcance: Prompt arregla manuales de units, NO otros embeddings de guest chat
- ✅ Queries de diagnóstico incluyen verificaciones de tabla correcta
- ✅ Referencias cruzadas a plan.md líneas 43-128
