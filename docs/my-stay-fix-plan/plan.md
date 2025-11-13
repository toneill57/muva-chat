# My Stay Guest Chat - Fix Infrastructure + SIRE Básico

**Proyecto:** My Stay Guest Chat - Restauración de Funcionalidad + SIRE Compliance Básico
**Fecha Inicio:** 2025-11-13
**Última Actualización:** 2025-11-13 (Plan Realineado - Enfoque en My Stay)
**Estado:** 📋 Planificación Completa - Listo para Ejecución

---

## 🎯 OVERVIEW

### Objetivo Principal
**PRIORIDAD P0:** Restaurar funcionalidad completa del guest chat `/my-stay` que se rompió en regresión del 8 de noviembre de 2025.

**PRIORIDAD P2:** Implementar SIRE compliance básico (solo auto-config de tenant) para cumplimiento legal colombiano.

### ¿Por qué este cambio de enfoque?

#### Problema Real Identificado (Nov 13, 2025):
- **Guest chat NO responde preguntas sobre manuales** (HIPÓTESIS: vector search RPC) → Guests no pueden obtener info de WiFi, check-in, reglas
- **Nombre de alojamiento INCORRECTO** en chat (HIPÓTESIS: se lee del lugar equivocado) → Confusión del guest
- **Regresión en sync de reservas** → phone_last_4 y reservation_code dejaron de capturarse (Nov 8)
- **SIRE compliance** es importante pero NO bloqueante (puede esperar)

#### Alcance Realineado

**✅ Incluido (P0-P1 - CRÍTICO):**
- ✅ **FASE 0:** Restaurar sync de reservas MotoPress (phone_last_4, reservation_code, accommodation_unit_id)
- ✅ **FASE 1:** Fix manual search en guest chat (RPC vector search)
- ✅ **FASE 2:** Mostrar nombre correcto del accommodation en `/my-stay`
- ✅ **FASE 3:** SIRE básico (solo hotel_sire_code + hotel_city_code)

**❌ Excluido (POSPUESTO a futuro sprint):**
- ❌ Document OCR para SIRE (upload pasaporte)
- ❌ Chat extraction híbrido (extracción pasiva + preguntas guiadas)
- ❌ Name parser + nationality mapper
- ❌ PUT endpoint SIRE
- ❌ Staff UI para SIRE
- ❌ Reportes SIRE exportables

---

## ⚠️ ARQUITECTURA CRÍTICA: Dos Sistemas de Vector Embeddings Separados

### Sistema 1: Accommodation Units Data Embeddings (Para `/with-me`)

**Ubicación:**
- Tabla: `accommodation_units_public`
- Columna: `embedding` (vector embeddings de la data general)
- URL: http://simmerdown.localhost:3001/accommodations/units

**Contenido Embedizado:**
- Data general de units (nombre, descripción, amenities, precios, políticas)
- Información pública visible para todos los usuarios
- Se genera automáticamente en el sync desde MotoPress

**Uso:**
- ✅ Chat público `/with-me` para usuarios anónimos (pre-booking)
- ✅ Preguntas generales sobre alojamientos disponibles
- ✅ Búsqueda de accommodations por características

**⚠️ REGLAS CRÍTICAS:**
- ❌ **NUNCA modificar el proceso de embedización de units data**
- ❌ **NUNCA cambiar estructura de `accommodation_units_public`**
- ❌ **NUNCA tocar el sync desde MotoPress** (líneas documentadas: src/lib/integrations/motopress/sync-manager.ts)
- ❌ **Guest chat `/my-stay` NO debe usar estos embeddings**

**Razón:**
Este sistema alimenta el chat público `/with-me`. Cualquier cambio rompe la experiencia de usuarios anónimos que buscan alojamientos.

---

### Sistema 2: Accommodation Manuals Embeddings (Para `/my-stay`)

**Ubicación:**
- Tabla: `accommodation_units_manual_chunks`
- Columna: `embedding` (vector embeddings de manuales)
- RPC: `match_unit_manual_chunks`

**Contenido Embedizado:**
- **Manuales de alojamiento** (WiFi passwords, instrucciones check-in, reglas de la casa, contactos de emergencia)
- Información específica para guests que YA tienen reserva
- Se genera desde archivos markdown procesados por el sistema de manuales

**Uso:**
- ✅ Guest chat `/my-stay` para guests autenticados
- ✅ Preguntas sobre información específica del alojamiento donde se hospedan
- ✅ Búsqueda de instrucciones operativas (WiFi, check-in, amenities, reglas)

**⚠️ REGLAS CRÍTICAS:**
- ✅ **Este es el ÚNICO dato de accommodation units que guest chat debe leer**
- ✅ FASE 1 de este plan trabaja SOLO con este sistema
- ❌ **Chat público `/with-me` NO debe usar estos embeddings** (son específicos del guest)

**Razón:**
Los manuales contienen información operativa crítica (passwords, códigos, instrucciones) que SOLO deben verse en el contexto de una reserva confirmada.

**Nota Importante:**
Guest chat `/my-stay` también usa OTROS embeddings (ej: turismo, SIRE docs, etc.) que NO son parte de este plan. Este plan SOLO arregla los embeddings de manuales de accommodation units.

---

### 🚨 REGLA DE ORO - SEPARACIÓN TOTAL

```
┌─────────────────────────────────────────────────────────────┐
│  /with-me (Chat Público)                                    │
│  ├─ Usa: accommodation_units_public.embedding               │
│  ├─ Contenido: Data general (nombre, descripción, precios)  │
│  └─ Usuario: Anónimo (pre-booking)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  /my-stay (Guest Chat)                                      │
│  ├─ Usa: accommodation_units_manual_chunks.embedding        │
│  │        + otros embeddings (turismo, SIRE, etc.)          │
│  ├─ Contenido: Manuales alojamiento + info contextual       │
│  └─ Usuario: Guest autenticado (con reserva)               │
└─────────────────────────────────────────────────────────────┘

⚠️ REGLA: Guest chat NO debe usar accommodation_units_public.embedding
⚠️ ALCANCE: Este plan SOLO arregla manual search, NO otros embeddings
```

**Consecuencias de usar accommodation_units_public.embedding en guest chat:**
- ❌ Guest chat buscaría en data general en lugar de manuales específicos (UX BLOQUEANTE)
- ❌ Respuestas sobre "WiFi password" mostrarían descripciones genéricas en vez de passwords reales
- ❌ Vector search devolvería información de marketing en lugar de instrucciones operativas

---

## 🔴 CAUSA RAÍZ - REGRESIÓN DEL 8 DE NOVIEMBRE 2025

### Commits Culpables

#### Commit `d251377` (Nov 8, 2025)
**Mensaje:** "fix: bookings-mapper creating units in wrong table"

**Qué eliminó (PERDIDO):**
```typescript
// ❌ Phone parsing para MotoPress directo
// ❌ Reservation code extraction de Airbnb
// ❌ Detección isAirbnb
// ❌ Lookup de accommodation_unit_id via RPC
```

**Código eliminado:**
```typescript
// ANTES (funcionaba):
const isAirbnb = (booking.ical_description || '').includes('airbnb.com')
const phone = this.extractPhoneFromIcal(booking.ical_description || '')
const reservationCode = this.extractReservationCode(booking.ical_description || '')

let phoneLast4 = '0000'
if (isAirbnb) {
  phoneLast4 = phone.last4
} else if (booking.customer.phone) {
  const phoneDigits = booking.customer.phone.replace(/[^0-9]/g, '')
  phoneLast4 = phoneDigits.slice(-4).padStart(4, '0')
}

// Lookup accommodation via RPC
const { data: units, error } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId
})
```

**DESPUÉS (roto):**
```typescript
// ❌ Auto-link logic ELIMINADA COMPLETAMENTE
// ❌ Se inserta accommodation_unit_id como NULL
// ❌ Se espera que trigger en DB haga el trabajo (pero trigger también fue eliminado)
accommodationUnitId = null  // SIEMPRE NULL
```

#### Commit `54401ba` (Nov 8, 2025)
**Mensaje:** "feat: move reservation auto-link logic from DB trigger to TypeScript"

**Qué hizo:**
- ❌ Eliminó trigger DB `trg_auto_link_reservation_accommodation`
- ✅ Agregó validación "must sync accommodations first"
- ❌ NO completó la lógica de auto-link en TypeScript

### Cambios Sin Commitear (Nov 12, 2025)
**RPC Fantasma:**
```typescript
// Llama RPC que NO EXISTE:
.rpc('get_accommodation_unit_by_motopress_type_id', {  // ❌ NO EXISTE
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId
})

// RPC CORRECTO (existe en DB):
.rpc('get_accommodation_unit_by_motopress_id', {  // ✅ EXISTE
  p_tenant_id: tenantId,
  p_motopress_id: motopressId
})
```

### Cronología Completa

| Fecha | Commit | Estado |
|-------|--------|--------|
| **Oct 19, 2025** | `34c1a57` | ✅ TODO FUNCIONABA (phone, reservation_code, accommodation matching) |
| **Nov 8, 2025** | `d251377` | ❌ REGRESIÓN: Eliminó phone parsing, reservation code, accommodation lookup |
| **Nov 8, 2025** | `54401ba` | ❌ EMPEORÓ: Eliminó trigger DB, logic incompleta en TypeScript |
| **Nov 12, 2025** | Sin commit | ❌ RPC fantasma (llama función que no existe) |

---

## 📊 ESTADO ACTUAL (Nov 13, 2025)

### Lo que SÍ funciona ✅

#### 1. Accommodation Units Sync (INTACTO)
**Archivos:**
- `src/lib/integrations/motopress/sync-manager.ts`
- `src/app/[tenant]/accommodations/units/page.tsx`

**Capacidades:**
- ✅ Descarga accommodation units desde MotoPress API
- ✅ Crea/actualiza `accommodation_units_public`
- ✅ Alimenta chat público `/with-me` correctamente
- ✅ **NO TOCAR** - Este sync funciona perfecto

#### 2. Guest Chat Infrastructure (100% Lista)
**Ruta:** `http://simmerdown.localhost:3001/my-stay`
**Component:** `GuestChatInterface.tsx` (1,537 líneas)

**Features Implementadas:**
- ✅ Multi-conversation support
- ✅ File upload with preview modal
- ✅ Claude Vision integration (OCR ready)
- ✅ Real-time typing indicators
- ✅ Entity tracking
- ✅ Conversation history persistence

#### 3. Manual Chunks System (Datos OK)
**Verificado:**
- ✅ 149 chunks de manuales con embeddings
- ✅ 9 alojamientos con manuales procesados
- ✅ Tabla `accommodation_units_manual_chunks` poblada
- ⚠️ RPC `match_unit_manual_chunks` puede tener search_path issue

### Lo que está ROTO ❌

#### P0-1: Reservation Sync Roto (BLOQUEANTE)
**Problema:**
- `phone_last_4` = NULL o '0000' (Airbnb + reservas directas)
- `reservation_code` = NULL (Airbnb)
- `accommodation_unit_id` = NULL (todas las reservas)

**Consecuencia:**
- Guests SÍ pueden autenticarse en `/my-stay`, PERO reciben información incorrecta
- Manual search busca en unit_id incorrecto o NULL
- Nombre de alojamiento incorrecto o no se muestra

**Causa:**
- Commits `d251377` + `54401ba` eliminaron lógica crítica
- RPC fantasma en working directory (sin commitear)

#### P0-2: Manual Search Retorna 0 Resultados (BLOQUEANTE)
**Problema:**
- Guest pregunta "WiFi password" → Bot dice "no encuentro información"
- RPC `match_unit_manual_chunks` retorna 0 resultados
- Bloquea UX del guest (no puede obtener info crítica)

**HIPÓTESIS a corroborar en FASE 1:**
- HIPÓTESIS 1: RPC pierde `search_path = 'public, extensions'` (problema conocido con pgvector)
- HIPÓTESIS 2: accommodation_unit_id NULL → busca en unit incorrecto
- HIPÓTESIS 3: Embeddings corruptos o query embedding incorrecto
- Documentado en: `docs/guest-chat-debug/PREVENTION_SYSTEM.md`

**Acción requerida:** DIAGNOSTICAR primero, arreglar DESPUÉS de confirmar causa

#### P1-1: Nombre de Alojamiento Incorrecto (UX POBRE)
**Problema:**
- Guest chat muestra nombre genérico o incorrecto
- Confusión para el guest ("¿estoy en el alojamiento correcto?")

**HIPÓTESIS a corroborar en FASE 2:**
- HIPÓTESIS: Guest chat lee nombre de `accommodation_units_public` (tabla genérica para /with-me)
- DEBE SER: Leer nombre via JOIN con `guest_reservations.accommodation_unit_id`
- REQUIERE: Investigar código actual antes de implementar solución

**Comportamiento esperado:**
- Reserva directa MotoPress → Muestra nombre específico del unit (ej: "Jammin'")
- Reserva Airbnb → Muestra nombre genérico del unit asignado (no "Guest")

#### P2-1: SIRE Tenant Config No Existe
**Problema:**
- `hotel_sire_code` debería = NIT del tenant
- `hotel_city_code` debería capturarse en tenant sign-up (San Andrés Isla para SimmerDown)
- Actualmente: "No configurado" en tarjetas

**Nota:** No bloqueante, compliance puede esperar

---

## 🚀 ESTADO DESEADO

### Guest Workflow Target (Post-Fix)

#### Reserva Directa MotoPress
```
1. ✅ Guest hace booking en MotoPress
2. ✅ Sync automático → Captura phone_last_4, reservation_code, accommodation_unit_id
3. ✅ Guest login /my-stay con check-in date + phone_last_4
4. ✅ Chat muestra: "Bienvenido a [Jammin' - Apartamento]" (nombre correcto)
5. ✅ Guest pregunta: "¿Cuál es el WiFi password?"
6. ✅ Manual search encuentra chunks → Bot responde con info del manual
7. ✅ Guest obtiene información crítica (WiFi, check-in, reglas)
```

#### Reserva Airbnb (ICS)
```
1. ✅ Airbnb booking sync → Captura phone_last_4 (de ICS description)
2. ✅ Sync asigna accommodation_unit_id via RPC lookup
3. ✅ Guest login /my-stay con check-in date + phone_last_4
4. ✅ Chat muestra: "Bienvenido a [Dreamland - Apartamento]" (nombre genérico del unit)
5. ✅ Guest pregunta sobre manuales → Manual search funciona
6. ✅ Bot responde correctamente
```

---

## 🔧 DESARROLLO - FASES REALINEADAS

### FASE 0: Restaurar Reservation Sync + Mapeo SIRE Básico (P0 - 2.5-3.5h)

**NOTA:** FASE 0 subdividida en 3 sub-fases para mejor manejo de contexto y verificación incremental.

**Objetivo:**
1. Restaurar captura de phone_last_4, reservation_code, accommodation_unit_id
2. Mapear campos SIRE que YA vienen desde MotoPress API

**Problema Identificado:** Commits `d251377` + `54401ba` (Nov 8) eliminaron lógica crítica

**Solución (3 sub-fases):**

#### 0.1a Limpiar Working Directory + Verificar Estado Roto (20-30 min)
**Acción:**
- Descartar cambios sin commitear (RPC fantasma `get_accommodation_unit_by_motopress_type_id`)
- Ejecutar queries SQL para documentar estado roto actual (baseline)
- Verificar: phone_last_4 NULL, reservation_code NULL, accommodation_unit_id NULL

**Agente:** @agent-backend-developer

**Entregables:**
- Working directory limpio (`git status` clean)
- SQL results documentando % de reservas rotas
- Baseline establecido para comparación post-fix

**Prompt completo:** Ver `workflow.md` → Prompt 0.1a (con delimitadores 🔽 🔼)

---

#### 0.1b Restaurar Lógica Funcional (1-1.5h)
**PREREQUISITO:** 0.1a completado (working directory limpio)

**Acción:**
- Restaurar SOLO las 4 funciones críticas del commit `34c1a57` (Oct 19, 2025)
- SIN agregar campos SIRE (eso es 0.1c)

**Código a restaurar en `bookings-mapper.ts`:**
```typescript
// 1. Detección Airbnb
const isAirbnb = (booking.ical_description || '').includes('airbnb.com')

// 2. Phone parsing
const extractPhoneFromIcal = (icalDesc: string) => {
  // Extrae phone de ICS description para Airbnb
  // Formato: "Guest phone: +57 300 123 4567"
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

const phone = this.extractPhoneFromIcal(booking.ical_description || '')

// 3. Reservation code extraction
const extractReservationCode = (icalDesc: string) => {
  // Extrae reservation code de ICS description
  // Formato: "Reservation code: HMABCDEFGH"
  const codeMatch = icalDesc.match(/code:\s*([A-Z0-9]+)/)
  return codeMatch ? codeMatch[1] : null
}

const reservationCode = this.extractReservationCode(booking.ical_description || '')

// 4. Phone_last_4 logic
let phoneLast4 = '0000'
if (isAirbnb) {
  phoneLast4 = phone.last4
} else if (booking.customer.phone) {
  const phoneDigits = booking.customer.phone.replace(/[^0-9]/g, '')
  phoneLast4 = phoneDigits.slice(-4).padStart(4, '0')
}

// 5. Accommodation lookup via RPC
const { data: units, error } = await supabase
  .rpc('get_accommodation_unit_by_motopress_id', {  // ✅ RPC CORRECTO (no el fantasma)
    p_tenant_id: tenantId,
    p_motopress_id: booking.accommodation_id  // ✅ Campo correcto
  })

const accommodationUnitId = units && units.length > 0 ? units[0].id : null
```

**Commit:**
```bash
git commit -m "fix: restore working sync logic from 34c1a57 (revert Nov 8 regression)

- Restored phone parsing for Airbnb + MotoPress direct bookings
- Restored reservation code extraction from ICS description
- Restored accommodation_unit_id lookup via RPC get_accommodation_unit_by_motopress_id
- Restored isAirbnb detection logic

Reverts breaking changes from commits:
- d251377 (Nov 8): fix: bookings-mapper creating units in wrong table
- 54401ba (Nov 8): feat: move reservation auto-link logic from DB trigger to TypeScript

Note: SIRE field mapping will be added in next commit (0.1c).

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Agente:** @agent-backend-developer

**Entregables:**
- `bookings-mapper.ts` con 4 funciones restauradas
- Commit con mensaje apropiado
- Verificación básica SQL (phone_last_4 working)

**Prompt completo:** Ver `workflow.md` → Prompt 0.1b (con delimitadores 🔽 🔼)

---

#### 0.1c Agregar Campos SIRE + Testing Completo (1-1.5h)
**PREREQUISITO:** 0.1b completado (sync working)
**Objetivo:** Mapear TODOS los campos SIRE que YA vienen de MotoPress API

**Campos a agregar en `bookings-mapper.ts`:**
```typescript
// SIRE compliance - Campos disponibles desde MotoPress
given_names: booking.customer.first_name || null,        // ✅ NUEVO
first_surname: booking.customer.last_name || null,       // ✅ NUEVO

// SIRE compliance - Campos NO disponibles (posponer a futuro)
second_surname: null,           // MotoPress solo tiene 1 campo "last_name"
document_type: null,            // NO viene de MotoPress → Chat extraction
document_number: null,          // NO viene de MotoPress → OCR pasaporte
birth_date: null,               // NO viene de MotoPress → Chat extraction
nationality_code: null,         // Requiere mapeo country → SIRE code
origin_city_code: null,         // NO viene de MotoPress → Chat extraction
destination_city_code: null,    // Auto-map = hotel_city_code (futuro)
movement_type: null,            // Auto-compute E/S (futuro)
movement_date: null             // Auto-compute check_in/out (futuro)
```

**Nota:** Campos como `guest_email`, `guest_country`, `check_in_date`, etc. **YA están mapeados** correctamente (líneas 203-223).

**Principio:** "Si viene de MotoPress sync, lo mapeamos ahora. Si no viene, lo obtenemos después vía chat/OCR."

**Queries de Testing Completo:**
```sql
-- 1. Verificar phone_last_4 populated
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

-- 2. Ver últimas 5 reservas Airbnb
SELECT
  id,
  reservation_code,
  phone_last_4,
  accommodation_unit_id,
  guest_name,
  substring(ical_description, 1, 200) as ical_preview
FROM guest_reservations
WHERE tenant_id = 'simmerdown'
  AND source_platform = 'airbnb'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar accommodation names
SELECT
  gr.guest_name,
  gr.phone_last_4,
  au.name as accommodation_name,
  au.id as unit_id
FROM guest_reservations gr
LEFT JOIN accommodation_units_public au ON gr.accommodation_unit_id = au.id
WHERE gr.tenant_id = 'simmerdown'
ORDER BY gr.created_at DESC
LIMIT 10;
```

**Commit SIRE Mapping:**
```bash
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

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Agente:** @agent-backend-developer

**Entregables:**
- `bookings-mapper.ts` con campos SIRE mapeados
- SQL test results completos (todas las queries)
- Commit con mensaje apropiado
- Documentación de campos NULL para futuro

**Criterios de Éxito:**
- ✅ 100% reservas con phone_last_4 ≠ '0000'
- ✅ Airbnb: 100% con reservation_code extraído
- ✅ 100% con accommodation_unit_id linked correctamente
- ✅ Campos SIRE desde MotoPress: given_names, first_surname poblados
- ✅ Campos SIRE NO disponibles: NULL y documentados
- ✅ Estadísticas muestran 100% población para campos disponibles

**Prompt completo:** Ver `workflow.md` → Prompt 0.1c (con delimitadores 🔽 🔼)

---

#### 📊 DECISIÓN: Campos SIRE - Mapeo vs Posponer

**MAPEAR AHORA (FASE 0):**
Todos los campos SIRE que **YA vienen desde MotoPress API** deben mapearse de una vez:
- ✅ `given_names` ← `booking.customer.first_name`
- ✅ `first_surname` ← `booking.customer.last_name`
- ✅ `guest_email` ← `booking.customer.email` (ya mapeado)
- ✅ `guest_country` ← `booking.customer.country` (ya mapeado)
- ✅ `check_in_date`, `check_out_date`, etc. (ya mapeados)

**POSPONER (Futuro Sprint - My Stay Chat/Compliance):**
Solo campos que **NO vienen de MotoPress**:
- ❌ `second_surname` - MotoPress solo tiene 1 campo "last_name" (requiere name parser)
- ❌ `document_type`, `document_number` - NO capturados por MotoPress (chat extraction/OCR)
- ❌ `birth_date` - NO capturado por MotoPress (chat extraction)
- ❌ `nationality_code` - Requiere mapear `guest_country` (string) → código SIRE (3 chars)
- ❌ `origin_city_code`, `destination_city_code` - NO capturados por MotoPress (chat extraction)
- ❌ `movement_type`, `movement_date` - Requieren lógica de cálculo

**Principio:** "Si viene de MotoPress sync, lo mapeamos ahora. Si no viene, lo obtenemos después vía chat/OCR."

---

### FASE 1: Fix Manual Search RPC (P0 - 3-4h)

**Objetivo:** Guest chat debe encontrar manuales de alojamiento (vector search funcional)

**Problema:** Bot dice "no encuentro información" cuando guest pregunta sobre manuales

**HIPÓTESIS a corroborar:** RPC `match_unit_manual_chunks` perdió search_path

**Metodología:** DIAGNOSTICAR → CONFIRMAR → ARREGLAR (no asumir causa)

#### 1.1 Diagnóstico RPC (1h)
**Verificaciones:**
```sql
-- 1. Ver definición actual del RPC
SELECT
  proname as function_name,
  prosrc as source_code,
  provolatile,
  proconfig as config_settings
FROM pg_proc
WHERE proname = 'match_unit_manual_chunks';

-- 2. Test directo del RPC (generar embedding de prueba)
SELECT * FROM match_unit_manual_chunks(
  p_tenant_id := 'simmerdown',
  p_unit_id := (SELECT id FROM accommodation_units_public WHERE tenant_id = 'simmerdown' LIMIT 1),
  p_query_embedding := '[0.1, 0.2, ...]'::vector,  -- Embedding de "WiFi password"
  p_match_threshold := 0.25,
  p_match_count := 5
);

-- 3. Verificar chunks existen
SELECT
  accommodation_unit_id,
  COUNT(*) as chunk_count
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'simmerdown'
GROUP BY accommodation_unit_id;
```

**Buscar en código:**
```bash
# Ver migration actual del RPC
grep -r "match_unit_manual_chunks" supabase/migrations/*.sql

# Ver cómo se llama desde TypeScript
grep -r "match_unit_manual_chunks" src/
```

**Agente:** @agent-database-agent

#### 1.2 Fix RPC si Roto (2h)
**PREREQUISITO:** Hipótesis confirmada en paso 1.1 (error "operator does not exist")

**Si search_path issue detectado:**
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
SET search_path = 'public, extensions'  -- ✅ CRÍTICO: Incluir 'extensions' para pgvector
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

**Migration:**
```bash
# Crear migration
supabase migration new fix_manual_search_rpc

# Aplicar en staging
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  supabase/migrations/YYYYMMDDHHMMSS_fix_manual_search_rpc.sql
```

**Agente:** @agent-database-agent

#### 1.3 E2E Test Manual Search (1h)
**Test desde guest chat:**
```typescript
// Test 1: WiFi password
Guest: "¿Cuál es el WiFi password?"
Expected: Bot encuentra chunks del manual → responde con SSID y password

// Test 2: Check-in instructions
Guest: "¿Cómo hago el check-in?"
Expected: Bot encuentra sección de check-in → responde con instrucciones

// Test 3: House rules
Guest: "¿Puedo hacer fiestas?"
Expected: Bot encuentra reglas de la casa → responde con políticas
```

**Verificación técnica:**
```sql
-- Verificar que RPC retorna resultados
SELECT
  COUNT(*) as total_found,
  AVG(similarity) as avg_similarity,
  MAX(similarity) as max_similarity
FROM match_unit_manual_chunks(
  'simmerdown',
  (SELECT id FROM accommodation_units_public WHERE name LIKE '%Jammin%' LIMIT 1),
  (SELECT embedding FROM accommodation_units_manual_chunks LIMIT 1),  -- Embedding de prueba
  0.25,
  5
);
```

**Criterios de Éxito:**
- ✅ RPC retorna `total_found > 0` para queries comunes
- ✅ Bot responde con información del manual correcto
- ✅ Performance <500ms
- ✅ Test con 5 accommodations diferentes

**Agente:** @agent-backend-developer

---

### FASE 2: Mostrar Nombre Correcto del Accommodation (P1 - 2-3h)

**Objetivo:** Guest chat debe mostrar nombre correcto del alojamiento (no genérico ni incorrecto)

**HIPÓTESIS a confirmar en FASE 2.1:**
- HIPÓTESIS: Guest chat actualmente lee nombre de `accommodation_units_public` (tabla genérica para /with-me)
- DEBE SER: Leer nombre via JOIN con `guest_reservations.accommodation_unit_id`
- REQUIERE: Investigar código actual para confirmar antes de implementar

**Comportamiento Esperado:**
- Reserva directa MotoPress → Muestra nombre específico (ej: "Jammin' - Apartamento")
- Reserva Airbnb → Muestra nombre genérico del unit asignado (NO "Guest")

#### 2.1 Análisis de Fuente de Datos Actual (0.5h)
**OBJETIVO:** CONFIRMAR hipótesis sobre fuente de datos actual

**Investigar en código:**
```bash
# ¿De dónde lee el nombre actualmente?
grep -n "accommodation" src/components/GuestChatInterface.tsx | head -20

# ¿Qué datos recibe el componente?
grep -n "props" src/app/[tenant]/my-stay/page.tsx | head -20

# Ver query de reserva
grep -A 20 "guest_reservations" src/app/[tenant]/my-stay/page.tsx
```

**Verificar en DB:**
```sql
-- Ver si accommodation_name existe en guest_reservations
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'guest_reservations'
  AND column_name LIKE '%accommodation%';

-- Resultado esperado: NO existe columna accommodation_name
```

**Agente:** @agent-backend-developer

#### 2.2 Implementar JOIN Query (1h)
**PREREQUISITO:** Hipótesis confirmada en paso 2.1

**Opción A: JOIN Query (RECOMENDADO - sin denormalización)**

**Modificar:** `src/app/[tenant]/my-stay/page.tsx` o API que carga la reserva

```typescript
// ANTES (incorrecto):
const { data: reservation } = await supabase
  .from('guest_reservations')
  .select('*')
  .eq('id', reservationId)
  .single()

// DESPUÉS (correcto - JOIN con accommodation unit):
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

// Uso en componente:
const accommodationName = reservation?.accommodation?.name || 'Guest'
```

**Opción B: Agregar Columna (denormalización - NO RECOMENDADO)**
```sql
-- Solo si JOIN no es viable
ALTER TABLE guest_reservations
ADD COLUMN accommodation_name varchar(255);

-- Poblar en bookings-mapper.ts:
accommodation_name: units[0]?.name || null
```

**Recomendación:** Usar **Opción A (JOIN)** - evita redundancia, mantiene single source of truth

**Agente:** @agent-backend-developer

#### 2.3 Update UI para Mostrar Nombre (0.5h)
**Modificar:** `src/components/GuestChatInterface.tsx`

```typescript
// Props update
interface GuestChatInterfaceProps {
  // ... existing props
  accommodationName?: string  // Agregar
}

// Header del chat
<div className="chat-header">
  <h2>
    {accommodationName ? `Chat - ${accommodationName}` : 'Guest Chat'}
  </h2>
</div>

// Mensaje de bienvenida (primera carga)
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

**Agente:** @agent-ux-interface

#### 2.4 Testing (1h)
**Test Cases:**
```
Test 1: Reserva directa MotoPress
- Login con reserva directa de "Jammin'"
- Expected: Header muestra "Chat - Jammin'"
- Expected: Mensaje bienvenida "¡Bienvenido a Jammin'!"

Test 2: Reserva Airbnb
- Login con reserva Airbnb asignada a "Dreamland"
- Expected: Header muestra "Chat - Dreamland"
- Expected: Mensaje bienvenida "¡Bienvenido a Dreamland!"

Test 3: Reservation sin accommodation_unit_id (edge case)
- Login con reserva sin unit asignado (NULL)
- Expected: Header muestra "Guest Chat" (fallback)
- Expected: Mensaje genérico sin mencionar alojamiento
```

**Verificación:**
- ✅ Nombre correcto en 5 accommodations diferentes
- ✅ NO afecta chat público `/with-me`
- ✅ NO cambia sync de accommodation_units_public

**Agente:** @agent-ux-interface

---

### FASE 3: SIRE Básico - Auto-Config Tenant (P2 - 2-3h)

**Objetivo:** Auto-poblar hotel_sire_code (NIT) y hotel_city_code (DIVIPOLA) para compliance mínimo

**Alcance Reducido:** Solo tenant config, NO OCR/chat extraction/PUT endpoint

#### 3.1 Add SIRE Config Fields (1h)
**Migration:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql

ALTER TABLE tenant_registry
ADD COLUMN hotel_sire_code varchar(20) COMMENT 'NIT del hotel para SIRE compliance',
ADD COLUMN hotel_city_code varchar(6) COMMENT 'Código DIVIPOLA (ciudad) para SIRE';

-- Poblar SimmerDown (ejemplo)
-- TODO: Investigar código DIVIPOLA exacto de San Andrés Isla antes de ejecutar
UPDATE tenant_registry
SET
  hotel_sire_code = nit,  -- Ya existe en tenant_registry
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

**Aplicar migration:**
```bash
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  supabase/migrations/YYYYMMDDHHMMSS_add_sire_tenant_config.sql
```

**Agente:** @agent-database-agent

#### 3.2 Update Bookings Mapper (1h)
**Modificar:** `src/lib/integrations/motopress/bookings-mapper.ts`

```typescript
// Leer config de tenant (cache en memoria para performance)
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

// Auto-poblar SIRE fields (lines 224-237):
return {
  // ... existing fields

  // SIRE compliance fields (auto-poblados desde tenant config)
  hotel_sire_code: tenantConfig.hotelCode,
  hotel_city_code: tenantConfig.cityCode,

  // SIRE fields sin datos (quedan NULL por ahora - futuro sprint)
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

**Agente:** @agent-backend-developer

#### 3.3 Testing SIRE Config (1h)
**Queries de Verificación:**
```sql
-- 1. Verificar tenant config
SELECT
  tenant_id,
  hotel_sire_code,
  hotel_city_code
FROM tenant_registry
WHERE tenant_id = 'simmerdown';

-- 2. Sync nueva reserva → verificar SIRE auto-poblado
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

-- 3. Estadísticas de población SIRE
SELECT
  COUNT(*) as total_reservations,
  COUNT(hotel_sire_code) as has_hotel_code,
  COUNT(hotel_city_code) as has_city_code
FROM guest_reservations
WHERE tenant_id = 'simmerdown';
```

**UI Verification:**
- Tarjetas de reservas muestran: "Hotel: [NIT]" y "Ciudad: San Andrés Isla ([CODE])"
- NO más "No configurado" en SIRE fields de tenant

**Criterios de Éxito:**
- ✅ tenant_registry tiene hotel_sire_code y hotel_city_code
- ✅ Nuevas reservas auto-pueblan estos 2 campos
- ✅ UI muestra datos correctos

**Agente:** @agent-backend-developer

---

### FASE 4: Documentation & Deployment (2h)

#### 4.1 Documentar Regresión y Fixes (1h)
**Crear:** `docs/my-stay-guest-chat/REGRESSION_FIX_NOV_2025.md`

**Contenido:**
```markdown
# Regresión My Stay Guest Chat - Noviembre 2025

## Resumen Ejecutivo

**Fecha Regresión:** 8 de noviembre de 2025
**Fecha Fix:** 13 de noviembre de 2025
**Severidad:** P0 (bloqueante - guests no pueden usar chat)

## Causa Raíz

### Commits Culpables
1. `d251377` (Nov 8): "fix: bookings-mapper creating units in wrong table"
2. `54401ba` (Nov 8): "feat: move reservation auto-link logic from DB trigger to TypeScript"

### Qué se rompió
- ❌ phone_last_4 dejó de capturarse → Guests SÍ pueden autenticarse, PERO reciben información incorrecta
- ❌ reservation_code dejó de extraerse (Airbnb)
- ❌ accommodation_unit_id NULL → Manual search busca en unit incorrecto
- ❌ Nombre de alojamiento incorrecto en chat

## Solución Aplicada

### FASE 0: Revertir lógica a commit `34c1a57` (Oct 19)
- Restaurado: phone parsing (Airbnb + directo)
- Restaurado: reservation code extraction
- Restaurado: accommodation lookup via RPC

### FASE 1: Fix manual search RPC
- Recreado: RPC con search_path correcto
- Verificado: Vector search funcional

### FASE 2: Fix nombre de accommodation
- Implementado: JOIN query con accommodation_units_public
- UI: Muestra nombre correcto en header y bienvenida

### FASE 3: SIRE básico
- Agregado: hotel_sire_code + hotel_city_code a tenant_registry
- Auto-población: En sync de reservas

## Prevención Futura

1. **NUNCA modificar sync de reservas sin tests E2E**
2. **Verificar queries antes de commit:**
   - phone_last_4 ≠ '0000'
   - accommodation_unit_id ≠ NULL
   - reservation_code poblado (Airbnb)
3. **Documentar RPCs con IMMUTABLE comment**
4. **Git workflow:**
   - Dev → staging (auto) → main (manual approval con health check)

## Referencias

- Commit fix: [hash]
- Tests: docs/my-stay-guest-chat/TESTS_NOV_2025.md
- Prevention: docs/guest-chat-debug/PREVENTION_SYSTEM.md
```

**Agente:** @agent-backend-developer

#### 4.2 Update Plan SIRE (0.5h)
**Modificar:** Este archivo (`docs/sire-compliance/plan.md`)

**Cambios realizados:**
- ✅ Título → "My Stay Guest Chat - Fix Infrastructure + SIRE Básico"
- ✅ Scope reducido: solo auto-config tenant (FASE 3)
- ✅ Fases OCR/chat extraction → Pospuestas
- ✅ Agregar sección "Causa Raíz - Regresión del 8 de Noviembre"

**Agente:** @agent-backend-developer

#### 4.3 Deploy a Staging (0.5h)
**Comandos:**
```bash
# Build
pnpm run build

# Verificar health antes de deploy
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Deploy staging
./scripts/deploy-staging.sh

# Post-deploy verification
curl -I https://simmerdown.staging.muva.chat/my-stay
```

**Smoke Tests:**
- ✅ Sync reservas MotoPress → phone_last_4 OK
- ✅ Guest login → autenticación funciona
- ✅ Manual search → retorna chunks
- ✅ Chat muestra nombre correcto

**Agente:** @agent-deploy-agent

#### 4.4 Production Deployment (cuando staging esté validado)
**Pre-deploy:**
```bash
# Health check staging
pnpm dlx tsx scripts/health-check-staging.ts

# Verificar 24h sin P0 errors
```

**Deploy:**
```bash
# Deploy production
./scripts/deploy-production.sh

# Post-deploy verification
curl -I https://simmerdown.muva.chat/my-stay
```

**Monitor 48h:**
- Check error logs
- Verify manual search working
- Confirm phone_last_4 populated

**Criterio éxito:**
- ✅ Production deployment sin regresiones
- ✅ Zero P0 errors en 48h

**Agente:** @agent-deploy-agent

---

## ✅ CRITERIOS DE ÉXITO

### FASE 0 (P0 - Bloqueante)
- [x] phone_last_4 capturado en sync (Airbnb + directo)
- [x] reservation_code capturado (Airbnb)
- [x] accommodation_unit_id linked correctamente
- [x] Re-sync en staging exitoso

### FASE 1 (P0 - Bloqueante)
- [x] Manual search retorna chunks (total_found > 0)
- [x] Bot responde con información de manuales
- [x] RPC con search_path correcto
- [x] Performance <500ms

### FASE 2 (P1 - UX)
- [x] Nombre accommodation visible en chat header
- [x] Nombre correcto según unit asignado
- [x] Airbnb muestra nombre genérico del unit (NO "Guest")
- [x] NO afecta /with-me public chat

### FASE 3 (P2 - Compliance)
- [x] tenant_registry tiene hotel_sire_code + hotel_city_code
- [x] Nuevas reservas auto-pueblan estos campos
- [x] UI muestra datos SIRE correctos

### FASE 4 (Deploy)
- [x] Staging funcional 100%
- [x] Production deployment sin regresiones
- [x] Zero P0 errors en 48h monitoring

---

## 🤖 AGENTES REQUERIDOS

### 1. @agent-backend-developer (5-7h)
- FASE 0: Restaurar sync (2-3h)
- FASE 1: Fix manual search (2-3h)
- FASE 2: Nombre correcto (1h)
- FASE 3: SIRE config (1h)

### 2. @agent-database-agent (2-3h)
- FASE 1: Fix RPC manual search (2h)
- FASE 3: Migration SIRE tenant (1h)

### 3. @agent-ux-interface (1-2h)
- FASE 2: Update UI para mostrar nombre (1-2h)

### 4. @agent-deploy-agent (1-2h)
- FASE 4: Deploy staging + production (1-2h)

**Total Tiempo:** 9-14 horas

---

## 📂 ESTRUCTURA DE ARCHIVOS

### Documentación
```
docs/
├── my-stay-guest-chat/
│   ├── REGRESSION_FIX_NOV_2025.md  ⭐ Nuevo
│   ├── TESTS_NOV_2025.md
│   └── DEPLOYMENT_REPORT.md
├── sire-compliance/
│   ├── plan.md  ⭐ Este archivo (realineado)
│   ├── TODO.md  (por actualizar)
│   └── workflow.md  (por actualizar)
└── guest-chat-debug/
    └── PREVENTION_SYSTEM.md  (existente)
```

### Código Modificado
```
src/
├── lib/integrations/motopress/
│   └── bookings-mapper.ts  ⭐ Restaurar lógica Oct 19
├── app/[tenant]/my-stay/
│   └── page.tsx  ⭐ Agregar JOIN query
└── components/
    └── GuestChatInterface.tsx  ⭐ Mostrar nombre accommodation
```

### Migrations
```
supabase/migrations/
├── YYYYMMDDHHMMSS_fix_manual_search_rpc.sql  ⭐ Nuevo
└── YYYYMMDDHHMMSS_add_sire_tenant_config.sql  ⭐ Nuevo
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

#### 1. NO Tocar Accommodation Units Sync ⚠️
**CRÍTICO:**
- ❌ NO modificar sync de `accommodation_units_public`
- ❌ NO cambiar estructura de esta tabla
- ❌ NO modificar proceso de embedización de units data
- ✅ Solo leer datos via JOIN en guest chat (para nombre del accommodation)
- ✅ Para manuales de units: Guest chat usa `accommodation_units_manual_chunks` (NO `accommodation_units_public.embedding`)

**Razón:** Este sync alimenta chat público `/with-me` - cualquier cambio puede romperlo

**Nota:** Guest chat también usa OTROS embeddings (turismo, SIRE, etc.) fuera del alcance de este plan.

**Ver arquitectura completa:** Sección "⚠️ ARQUITECTURA CRÍTICA: Dos Sistemas de Vector Embeddings Separados" (líneas 43-128)

#### 2. Airbnb vs Direct: Comportamiento Diferente
**Guest Name:**
- Direct MotoPress: Nombre completo del customer
- Airbnb: "Guest" (Airbnb no proporciona nombres)

**Accommodation Name:**
- Ambos: Nombre genérico del unit asignado (ej: "Jammin'", "Dreamland")

#### 3. RPC search_path Issue (Recurrente)
**Problema conocido:**
- RPCs que usan pgvector pierden search_path en ciertas condiciones
- Síntoma: `operator does not exist: vector <=> vector`

**Solución:**
- Siempre incluir `SET search_path = 'public, extensions'`
- Agregar IMMUTABLE comment para prevenir modificaciones

#### 4. Git Workflow para Prevenir Regresiones
**Flujo correcto:**
```
dev (auto) → staging (auto) → main (manual approval)
              ↓
         Health check
         (monitoring-dashboard.ts)
```

**NUNCA:**
- ❌ Commit directo a main
- ❌ Deploy sin health check
- ❌ Modificar sync sin tests E2E

---

## 🚧 FASES POSPUESTAS (Futuro Sprint - My Stay Compliance Module)

Las siguientes fases del plan original SIRE se posponen para cuando trabajemos en el **módulo de compliance del guest chat**:

### POSPUESTO: Campos SIRE NO Disponibles en MotoPress
**Campos que NO vienen de MotoPress API:**
- `second_surname` - Requiere name parser (MotoPress solo tiene `last_name`)
- `document_type`, `document_number` - Requiere OCR pasaporte o chat extraction
- `birth_date` - Requiere chat extraction o manual input
- `nationality_code` - Requiere mapper `guest_country` (string) → código SIRE (3 chars)
- `origin_city_code`, `destination_city_code` - Requiere chat extraction
- `movement_type`, `movement_date` - Requiere lógica de cálculo

**Métodos de captura (futuro):**
- Document OCR para SIRE (6-8h) - Upload pasaporte/ID con Claude Vision
- Chat Extraction Híbrido (10-12h) - Extracción pasiva + preguntas guiadas
- Name Parser + Nationality Mapper (6-8h) - Parser nombres latinos + mapper country → SIRE
- PUT Endpoint SIRE (4-6h) - API para actualizar campos desde chat
- Testing & E2E (4-6h) - Tests completos del flujo SIRE

**Razón:** My Stay funcional es P0. Campos SIRE que NO vienen de MotoPress requieren módulo de compliance dedicado (P2).

**Principio adoptado:** "Si viene de MotoPress sync, lo mapeamos ahora (FASE 0). Si no viene, lo obtenemos después vía chat/OCR en módulo compliance."

---

**Última actualización:** 2025-11-13 16:45 (Subdivisión de FASE 0 en 3 sub-fases)
**Próximo paso:** Ejecutar FASE 0.1a (Limpiar + Verificar) → Ver `workflow.md` Prompt 0.1a 🔽 🔼
**Tiempo Total:** 11.5-16 horas (~2 semanas a 5-8h/semana)
**Scope SIRE:** Solo básico (tenant config), resto pospuesto

**🆕 CAMBIOS NOV 13 16:45:**
- ✅ FASE 0 subdividida en 3 sub-fases para mejor contexto (0.1a, 0.1b, 0.1c)
- ✅ Cada sub-fase con prompt completo en `workflow.md` (delimitadores 🔽 🔼 para copy-paste)
- ✅ Peak context reduction: 45% → 25% (20% más headroom)
- ✅ Verificación incremental: 3 checkpoints en lugar de 1
- ✅ Commits granulares: restauración separada de SIRE mapping
- ✅ Total: 11 prompts de ejecución (antes 9)

**⚠️ DOCUMENTACIÓN CRÍTICA AGREGADA (Nov 13 14:45):**
- Sección completa sobre 2 sistemas de vector embeddings separados (líneas 43-128)
- Reglas explícitas sobre NO tocar embeddings de accommodation_units_public
- Alcance preciso: Este plan SOLO arregla manual search, NO otros embeddings de guest chat
- Clarificación: Guest chat usa MÚLTIPLES fuentes (manuales + turismo + SIRE + otros)
- Referencias cruzadas agregadas en TODO.md y workflow.md
