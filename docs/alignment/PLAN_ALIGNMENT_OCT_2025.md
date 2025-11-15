# PLAN ALIGNMENT - October 9, 2025

**Purpose:** Align planning documents with discoveries made during execution (FASE 1-11.8)
**Scope:** plan.md, mcp-optimization-prompt-workflow.md, agent snapshots, TODO.md
**Status:** ⚠️ MISALIGNMENTS IDENTIFIED - Requires updates before FASE 11.7 migration
**Audit Reference:** `docs/audit/TODO_AUDIT_FASE_1-11.8_OCT_2025.md`

---

## 🎯 EXECUTIVE SUMMARY

### Critical Finding
**Migration 11.7 NOT Applied:** TypeScript code uses `origin_city_code`/`destination_city_code` but database still has `origin_country_code`/`destination_country_code`.

**Before ANY corrective action, we must align documentation with these discoveries:**

1. **SIRE Field Count:** Plan says "9 campos SIRE" but reality is **13 total fields**
2. **SIRE Codes:** Plan doesn't mention SIRE proprietary codes vs ISO 3166-1
3. **FASE 11.8 Helpers:** Not documented in original plan
4. **Column Renaming:** Migration 11.7 discovered need, not in original plan

---

## 📋 MISALIGNMENT INVENTORY

### 1. plan.md - Field Count Inconsistency

**Line 15 (WRONG):**
```markdown
Extender tabla `guest_reservations` con 9 campos SIRE faltantes
```

**Line 25 (CORRECT):**
```markdown
Compliance Legal: SIRE requiere 13 campos obligatorios (actualmente solo 4/13)
```

**Reality (Audit Findings):**
- **Hotel Fields:** 2 (hotel_sire_code, hotel_city_code)
- **Guest Identity:** 6 (document_type, document_number, birth_date, first_surname, second_surname, given_names)
- **Movement:** 3 (movement_date, entry_time, nationality_code)
- **Geographic:** 2 (origin_city_code, destination_city_code)
- **TOTAL: 13 campos SIRE obligatorios**

**Required Changes:**
```diff
- Extender tabla `guest_reservations` con 9 campos SIRE faltantes
+ Extender tabla `guest_reservations` con 9 campos SIRE adicionales (13 totales con 4 existentes)

# OR more accurate:

- con 9 campos SIRE faltantes
+ con 13 campos SIRE obligatorios (4/13 existentes, 9/13 faltantes)
```

**Files to Update:**
- `plan.md` lines 15, 74, 105, 226, 789-806 (all references to "9 campos")

---

### 2. plan.md - SIRE Codes Discovery Missing

**Current State:** Plan.md does NOT mention:
- SIRE codes are proprietary (NOT ISO 3166-1)
- USA = 249 (SIRE) vs 840 (ISO)
- Colombia = 169 (SIRE) vs 170 (ISO)
- Brasil = 105 (SIRE) vs 076 (ISO)

**Discovery Made:** FASE 11.8 (Oct 9, 2025)
- Document: `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` (248 lines)
- Helpers: `src/lib/sire/sire-catalogs.ts` (214 lines)
- Tests: `scripts/test-sire-catalogs.ts` (27/27 passed)

**Required Addition to plan.md:**

**Insert after line 74 (Campos Faltantes section):**
```markdown
### ⚠️ CRITICAL: SIRE Codes vs ISO 3166-1

**Discovered:** Oct 9, 2025 (FASE 11.8)

SIRE codes are **proprietary** to Colombian Migration, NOT ISO 3166-1:
- USA: 249 (SIRE) ≠ 840 (ISO)
- Colombia: 169 (SIRE) ≠ 170 (ISO)
- Brasil: 105 (SIRE) ≠ 076 (ISO)
- España: 245 (SIRE) ≠ 724 (ISO)

**Implication:** NEVER hardcode ISO codes. Use `getSIRECountryCode()` from `src/lib/sire/sire-catalogs.ts`.

**Reference:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`
```

**Insert after line 541 (SIRE Específico section in FASE 8):**
```markdown
- **sire_catalogs_helpers** (SIRE helper functions)
  - `getSIRECountryCode(countryName)` → 250 países con códigos SIRE
  - `getDIVIPOLACityCode(cityName)` → 1,122 ciudades DIVIPOLA
  - `formatDateToSIRE(date)` → DD/MM/YYYY format
```

---

### 3. plan.md - Missing FASE 11.8

**Current State:** Plan goes FASE 11 → FASE 12 (skip 11.8)

**Reality:** FASE 11.8 created and completed (Oct 9, 2025)
- Implemented helpers for SIRE catalogs
- 27/27 tests passing (100%)
- Zero hardcoded ISO codes

**Required Addition:**

**Insert after FASE 11.7 section (NEW section):**
```markdown
### FASE 11.8: Implementar Helpers de Catálogos SIRE (1h 30min)

**Objetivo:** Crear helpers para usar catálogos SIRE oficiales y eliminar códigos ISO hardcoded

**Agente:** **@agent-backend-developer**

**Entregables:**
1. Helper `getSIRECountryCode()` con fuzzy search (250 países)
2. Helper `getDIVIPOLACityCode()` con fuzzy search (1,122 ciudades)
3. Helper `formatDateToSIRE()` para conversión DB → SIRE
4. Helper `formatLocation()` para debugging
5. Actualizar `mapCountryToCode()` para usar helpers (NO hardcode)
6. Test suite completo (27 test cases)

**Archivos a crear/modificar:**
- `src/lib/sire/sire-catalogs.ts` (NUEVO - 214 líneas)
- `src/lib/compliance-chat-engine.ts` (MODIFICAR - eliminar hardcode)
- `scripts/test-sire-catalogs.ts` (NUEVO - 125 líneas)
- `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` (NUEVO - 248 líneas)
- `CLAUDE.md` (MODIFICAR - agregar sección SIRE helpers)

**Testing:**
- 14 country tests (SIRE codes: 249, 169, 105)
- 10 city tests (DIVIPOLA codes: 11001, 5001)
- 3 date tests (DB → SIRE format)
- Target: 27/27 tests passing

**Criterio de éxito:** 27/27 tests passing, zero hardcoded ISO codes
```

---

### 4. mcp-optimization-prompt-workflow.md - FASE 11.7 Status Incorrect

**Line 952 (INCORRECT):**
```markdown
### PROMPT 11.7 - ✅ COMPLETADO: Database Column Renaming Migration
```

**Reality (Audit Finding):**
- Migration file EXISTS: `20251009000003_rename_location_fields_to_city.sql`
- TypeScript code UPDATED: Uses `origin_city_code`/`destination_city_code`
- **Database NOT UPDATED:** Still has old column names

**SQL Evidence (from audit):**
```sql
-- Expected (TypeScript code):
origin_city_code | character varying | YES
destination_city_code | character varying | YES

-- Actual (Database via MCP):
origin_country_code | character varying | YES
destination_country_code | character varying | YES
```

**Required Change:**
```diff
- ### PROMPT 11.7 - ✅ COMPLETADO: Database Column Renaming Migration
+ ### PROMPT 11.7 - ⚠️ PARCIAL: Database Column Renaming Migration

**STATUS:** ⚠️ MIGRATION FILE CREATED, DATABASE NOT UPDATED

**Work Completed:**
- ✅ Migration file created
- ✅ TypeScript code updated
- ❌ Migration NOT applied to database

**PENDING:** Apply migration via Supabase Dashboard SQL Editor
```

---

### 5. mcp-optimization-prompt-workflow.md - Missing FASE 11.8 Prompt

**Current State:** Workflow jumps from FASE 11.7 → FASE 12

**Required Addition:**

**Insert after FASE 11.7 section:**
```markdown
### PROMPT 11.8 - Implementar Helpers de Catálogos SIRE

```
TAREA para AGENTE: @agent-backend-developer Crear helpers para usar catálogos SIRE existentes (`_assets/sire/codigos-pais.json` y `ciudades-colombia.json`) y actualizar mapCountryToCode() para eliminar hardcoded ISO codes.

CONTEXTO:
- Manual SIRE oficial revisado - códigos ISO (840, 170, 076) son INCORRECTOS
- Códigos correctos son SIRE propietarios: USA=249, Colombia=169, Brasil=105
- Ya tenemos catálogos correctos en `_assets/sire/codigos-pais.json` (250 países) y `ciudades-colombia.json` (1,122 ciudades)
- Necesitamos helpers para acceder a estos catálogos con fuzzy search

ESPECIFICACIONES:

1. Crear `src/lib/sire/sire-catalogs.ts` con 4 helpers:
   - `getSIRECountryCode(countryName: string)` - Fuzzy search en 250 países
   - `getDIVIPOLACityCode(cityName: string)` - Fuzzy search en 1,122 ciudades
   - `formatDateToSIRE(date: Date | string)` - DB → dd/mm/yyyy
   - `formatLocation(code: string)` - Debug helper

2. Actualizar `src/lib/compliance-chat-engine.ts`:
   - Reemplazar `mapCountryToCode()` con `getSIRECountryCode()`
   - Reemplazar `mapLocationToCode()` con `getDIVIPOLACityCode()`
   - Eliminar 100% de hardcoded ISO codes

3. Crear `scripts/test-sire-catalogs.ts`:
   - 14 country tests (verify SIRE codes)
   - 10 city tests (verify DIVIPOLA codes)
   - 3 date tests (verify formatting)

4. Crear `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`:
   - Tabla comparativa SIRE vs ISO
   - Ejemplos de uso correcto
   - Guía de migración

ARCHIVOS:
- `src/lib/sire/sire-catalogs.ts` (NUEVO)
- `src/lib/compliance-chat-engine.ts` (MODIFICAR)
- `scripts/test-sire-catalogs.ts` (NUEVO)
- `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` (NUEVO)
- `CLAUDE.md` (MODIFICAR)
- `package.json` (add fuse.js)

VALIDATION (MUST EXECUTE BEFORE MARKING COMPLETE):

**Test 1: Verify sire-catalogs.ts Created**
EXECUTE: Read src/lib/sire/sire-catalogs.ts
VERIFY: ✅ Contains 4 helper functions
VERIFY: ✅ Uses Fuse.js for fuzzy search
SHOW: Complete file to user

**Test 2: Run Test Script**
EXECUTE: npx tsx scripts/test-sire-catalogs.ts
VERIFY: ✅ USA → 249 (not 840)
VERIFY: ✅ Colombia → 169 (not 170)
VERIFY: ✅ 27/27 tests passed (100%)
SHOW: Test output to user

**Test 3: Verify No Hardcoded ISO Codes**
EXECUTE: grep -r "'840'\|'170'\|'076'" src/lib/compliance-chat-engine.ts
VERIFY: ✅ Zero matches (all removed)
SHOW: Grep output to user

SIGUIENTE: Continuar con FASE 12 (SIRE Testing & Validation)
```
```

---

### 6. TODO.md - FASE 10 Inconsistency

**Lines 466-511 (INCONSISTENT):**
```markdown
### 10.1 Crear migración con 9 campos SIRE
- [ ] Crear migración SQL con nuevas columnas (estimate: 1h)
  - Files: supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql (NUEVO)
```

**Reality (Audit Finding):**
```bash
# Files EXIST in filesystem:
-rw-r--r--  1 oneill  staff  6543 Oct  9 10:20 supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql
-rw-r--r--  1 oneill  staff  3905 Oct  9 10:09 scripts/migrate-compliance-data-to-reservations.sql
```

**Possible Scenarios:**
1. Files created manually without updating TODO.md
2. Migrations applied but documentation not updated
3. FASE 10 partially completed but not marked

**Required Action:**
- **INVESTIGATE:** Check if migrations were applied
  ```sql
  SELECT name FROM supabase_migrations.schema_migrations
  WHERE name LIKE '%add_sire_fields%';
  ```
- **IF APPLIED:** Mark tasks complete + add evidence
- **IF NOT APPLIED:** Document why files exist but tasks incomplete

**Required TODO.md Update (if applied):**
```diff
- [ ] Crear migración SQL con nuevas columnas (estimate: 1h)
+ [x] Crear migración SQL con nuevas columnas (estimate: 1h)

**COMPLETADO:** Oct 9, 2025 - [Manual creation?]

**Evidence:**
- Migration file exists: 6,543 bytes
- Created: Oct 9, 2025 10:20
```

---

### 7. Agent Snapshots - Missing SIRE Helpers

**Files to Update:**
- `snapshots/backend-developer.md`
- `snapshots/database-agent.md`

**Required Addition to backend-developer.md:**

**Insert after line 60 (Context Files section):**
```markdown
- SIRE Catalog Helpers (Oct 9, 2025):
  - `/Users/oneill/Sites/apps/MUVA/src/lib/sire/sire-catalogs.ts` (214 lines)
  - `/Users/oneill/Sites/apps/MUVA/docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` (248 lines)
  - `/Users/oneill/Sites/apps/MUVA/scripts/test-sire-catalogs.ts` (125 lines)
```

**Insert after line 89 (SIRE Codes section):**
```markdown
**Helpers Disponibles (FASE 11.8):**
```typescript
import { getSIRECountryCode, getDIVIPOLACityCode, formatDateToSIRE } from '@/lib/sire/sire-catalogs'

// Get SIRE country code (fuzzy search, accent-insensitive)
const nationalityCode = getSIRECountryCode("Estados Unidos") // "249" ✅
const nationalityCode = getSIRECountryCode("estados unidos") // "249" ✅ (case-insensitive)
const nationalityCode = getSIRECountryCode("Estados Unidso") // "249" ✅ (typo tolerance)

// Get DIVIPOLA city code (1,122 Colombian cities)
const cityCode = getDIVIPOLACityCode("Bogotá") // "11001" ✅
const cityCode = getDIVIPOLACityCode("Bogota") // "11001" ✅ (accent-insensitive)

// Format date DB → SIRE
const sireDate = formatDateToSIRE("2025-10-09") // "09/10/2025" ✅
```
```

---

## 🔧 ALIGNMENT ACTIONS

### Priority 1: CRITICAL (Before Migration 11.7)

**Action 1.1: Update plan.md Field Count**
- File: `plan.md`
- Lines: 15, 74, 105, 226, 789-806
- Change: "9 campos" → "13 campos obligatorios (9 adicionales, 4 existentes)"
- Effort: 10 minutes

**Action 1.2: Add SIRE Codes Discovery to plan.md**
- File: `plan.md`
- Insert: After line 74 + line 541
- Content: SIRE vs ISO section + helpers reference
- Effort: 15 minutes

**Action 1.3: Add FASE 11.8 to plan.md**
- File: `plan.md`
- Insert: After FASE 11.7 section
- Content: Complete FASE 11.8 specification
- Effort: 20 minutes

**Action 1.4: Correct FASE 11.7 Status in workflow**
- File: `mcp-optimization-prompt-workflow.md`
- Line: 952
- Change: "✅ COMPLETADO" → "⚠️ PARCIAL"
- Add: Pending database application note
- Effort: 5 minutes

**Action 1.5: Add FASE 11.8 Prompt to workflow**
- File: `mcp-optimization-prompt-workflow.md`
- Insert: After FASE 11.7 section
- Content: Complete prompt with validation tests
- Effort: 20 minutes

**Total Effort Priority 1:** ~1 hour 10 minutes

---

### Priority 2: MEDIUM (After Migration 11.7)

**Action 2.1: Investigate FASE 10 Filesystem Inconsistency**
- Check: Database migration history
- Determine: If migrations were applied manually
- Update: TODO.md accordingly with evidence
- Effort: 30 minutes

**Action 2.2: Update Agent Snapshots**
- Files: `snapshots/backend-developer.md`, `snapshots/database-agent.md`
- Add: SIRE helpers references + examples
- Effort: 20 minutes

**Total Effort Priority 2:** ~50 minutes

---

### Priority 3: LOW (Quality Improvements)

**Action 3.1: Update CLAUDE.md References**
- File: `CLAUDE.md`
- Verify: All references to SIRE helpers are up-to-date
- Effort: 10 minutes

**Action 3.2: Verify TODO.md Completion Evidence**
- Review: All completed tasks have evidence sections
- Add: Missing evidence where needed
- Effort: 30 minutes

**Total Effort Priority 3:** ~40 minutes

---

## 📊 ALIGNMENT SUMMARY

### Misalignments Identified: 7

| ID | Document | Issue | Priority | Effort |
|----|----------|-------|----------|--------|
| 1 | plan.md | Field count (9 vs 13) | 🔴 CRITICAL | 10 min |
| 2 | plan.md | SIRE codes discovery missing | 🔴 CRITICAL | 15 min |
| 3 | plan.md | FASE 11.8 missing | 🔴 CRITICAL | 20 min |
| 4 | workflow.md | FASE 11.7 status incorrect | 🔴 CRITICAL | 5 min |
| 5 | workflow.md | FASE 11.8 prompt missing | 🔴 CRITICAL | 20 min |
| 6 | TODO.md | FASE 10 inconsistency | 🟠 MEDIUM | 30 min |
| 7 | Snapshots | SIRE helpers missing | 🟠 MEDIUM | 20 min |

**Total Effort:** ~2 hours

---

## ✅ VALIDATION CHECKLIST

**Before Applying Migration 11.7:**

- [ ] **plan.md updated** with correct field count (13 not 9)
- [ ] **plan.md updated** with SIRE codes discovery
- [ ] **FASE 11.8 added** to plan.md
- [ ] **workflow.md corrected** for FASE 11.7 status
- [ ] **FASE 11.8 prompt added** to workflow.md
- [ ] **FASE 10 investigation** completed and documented
- [ ] **Agent snapshots updated** with SIRE helpers

**After Updates:**

- [ ] All documents reference **13 SIRE fields** consistently
- [ ] All documents reference **SIRE proprietary codes** (not ISO)
- [ ] All documents reference **FASE 11.8 helpers** correctly
- [ ] TODO.md reflects **reality of filesystem**
- [ ] Migration 11.7 status is **accurate** (pending DB application)

---

## 📝 RECOMMENDATIONS

### Immediate (Today)

1. **Execute Priority 1 Actions** (~1h 10min)
   - Update plan.md field count + SIRE discovery + FASE 11.8
   - Correct workflow.md statuses + add FASE 11.8 prompt

2. **Then Apply Migration 11.7** (ONLY after alignment)
   - Execute in Supabase Dashboard SQL Editor
   - Verify with MCP: `origin_city_code`/`destination_city_code` exist
   - Update TODO.md with SQL output evidence

### Short-term (This Week)

3. **Execute Priority 2 Actions** (~50min)
   - Investigate FASE 10 filesystem inconsistency
   - Update agent snapshots with SIRE helpers

4. **User Approval Process**
   - Present alignment changes to user
   - Get explicit approval for all updates
   - Apply changes in single commit

### Quality Improvements (Next Week)

5. **Execute Priority 3 Actions** (~40min)
   - Verify CLAUDE.md references
   - Complete TODO.md evidence sections

---

## 🎯 SUCCESS CRITERIA

**Alignment Complete When:**

1. ✅ All 7 misalignments resolved
2. ✅ User approval obtained for all changes
3. ✅ Documents internally consistent (no contradictions)
4. ✅ Documents reflect reality (audit findings match docs)
5. ✅ Future phases have correct context (13 fields, SIRE codes, helpers)

**Then Proceed With:**
- Migration 11.7 database application
- TODO.md evidence updates
- FASE 11.6 completion
- FASE 12 testing

---

**Document Created:** October 9, 2025
**Created By:** Claude Sonnet 4.5 (Main Agent)
**Status:** READY FOR USER APPROVAL
**Next Step:** Present to user → Get approval → Execute Priority 1 actions → Apply Migration 11.7
