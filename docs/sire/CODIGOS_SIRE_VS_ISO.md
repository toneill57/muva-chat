# SIRE Codes vs ISO 3166-1: Critical Differences

**Date:** October 9, 2025
**Phase:** FASE 11.8 - SIRE Catalogs Integration
**Status:** ✅ IMPLEMENTED (códigos SIRE oficiales)

---

## ⚠️ CRITICAL: DO NOT USE ISO CODES

The SIRE system uses **proprietary country codes** that are DIFFERENT from ISO 3166-1 numeric codes.

**If you use ISO codes, 100% of your TXT files will be REJECTED by the SIRE system.**

---

## 📊 Key Differences

| Country         | SIRE Code (CORRECT ✅) | ISO 3166-1 (WRONG ❌) | Difference |
|-----------------|------------------------|----------------------|------------|
| **USA**         | **249**                | 840                  | -591       |
| **Colombia**    | **169**                | 170                  | -1         |
| **Brasil**      | **105**                | 076                  | +29        |
| **España**      | **245**                | 724                  | -479       |
| **México**      | **493**                | 484                  | +9         |
| **Argentina**   | **63**                 | 032                  | +31        |
| **Chile**       | **211**                | 152                  | +59        |
| **China**       | **215**                | 156                  | +59        |
| **Japón**       | **399**                | 392                  | +7         |
| **Alemania**    | **23**                 | 276                  | -253       |

**Note:** Differences range from -591 to +59. There is NO consistent pattern between SIRE and ISO codes.

---

## ✅ Correct Implementation

### 1. Use Official SIRE Helpers

```typescript
import { getSIRECountryCode, getDIVIPOLACityCode } from '@/lib/sire/sire-catalogs';

// ✅ CORRECT: Using SIRE helpers
const nationalityCode = getSIRECountryCode("Estados Unidos");
// Returns: "249" ✅

const cityCode = getDIVIPOLACityCode("Bogotá");
// Returns: "11001" ✅ (DIVIPOLA code)
```

### 2. Features of SIRE Helpers

- **Fuzzy Search:** Handles accents, case, typos automatically
  - "Estados Unidos" ✅
  - "estados unidos" ✅
  - "Estados Unidso" ✅ (typo corrected)

- **Accent Insensitive:**
  - "Bogotá" ✅
  - "Bogota" ✅ (sin acento)

- **Case Insensitive:**
  - "COLOMBIA" ✅
  - "colombia" ✅
  - "Colombia" ✅

---

## ❌ Wrong Implementation

### DO NOT Hardcode ISO Codes

```typescript
// ❌ WRONG: Hardcoded ISO codes
const countryMap = {
  'Estados Unidos': '840', // ❌ REJECTED by SIRE
  'Colombia': '170',       // ❌ REJECTED by SIRE
  'Brasil': '076',         // ❌ REJECTED by SIRE
  'España': '724',         // ❌ REJECTED by SIRE
};

const code = countryMap[countryName]; // ❌ WRONG!
```

**Result:** 100% of TXT files will be REJECTED by SIRE with error "Código de país inválido".

---

## 📂 Data Sources

### Official SIRE Catalog

**File:** `_assets/sire/codigos-pais.json`
**Records:** 250 countries with official SIRE codes
**Source:** Colombian Ministry of Commerce (SIRE official specification)

```json
[
  {
    "codigo": "249",
    "nombre": "ESTADOS UNIDOS"
  },
  {
    "codigo": "169",
    "nombre": "COLOMBIA"
  },
  {
    "codigo": "105",
    "nombre": "BRASIL"
  }
  // ... 247 more countries
]
```

### Colombian DIVIPOLA Catalog

**File:** `_assets/sire/ciudades-colombia.json`
**Records:** 1,122 Colombian cities with DIVIPOLA codes (5 digits)
**Source:** DANE (Departamento Administrativo Nacional de Estadística)

```json
[
  {
    "codigo": "11001",
    "ciudad": "BOGOTÁ, D.C.",
    "habilitada_sire": true
  },
  {
    "codigo": "5001",
    "ciudad": "MEDELLÍN",
    "habilitada_sire": false
  }
  // ... 1,120 more cities
]
```

---

## 🧪 Testing

### Verify Correct Codes

Run the official test suite:

```bash
npx tsx scripts/test-sire-catalogs.ts
```

**Expected Result:** 27/27 tests passed (100%)

### Test Breakdown

- **14 Country Tests:** Verify SIRE codes (NOT ISO)
  - USA: 249 ✅ (not 840 ❌)
  - Colombia: 169 ✅ (not 170 ❌)
  - Brasil: 105 ✅ (not 076 ❌)

- **10 City Tests:** Verify DIVIPOLA codes
  - Bogotá: 11001 ✅
  - Medellín: 5001 ✅
  - Fuzzy matching: "Bogota" → 11001 ✅

- **3 Date Tests:** Verify DB → SIRE formatting
  - "2025-10-09" → "09/10/2025" ✅

---

## 🚨 Breaking Changes Alert

### If Migrating from ISO Codes

If your database already has data with ISO codes (e.g., `nationality_code = '840'`), you MUST run a data migration:

```sql
-- Migration: Convert ISO to SIRE codes
UPDATE guest_reservations
SET nationality_code = '249'
WHERE nationality_code = '840'; -- USA: ISO → SIRE

UPDATE guest_reservations
SET nationality_code = '169'
WHERE nationality_code = '170'; -- Colombia: ISO → SIRE

UPDATE guest_reservations
SET nationality_code = '105'
WHERE nationality_code = '076'; -- Brasil: ISO → SIRE

-- ... etc for all 20+ countries
```

### Check if Migration is Needed

```sql
SELECT DISTINCT nationality_code
FROM guest_reservations
WHERE nationality_code IN ('840', '170', '076', '724', '484', '032');
```

If this query returns rows, create a migration script BEFORE deploying FASE 11.8.

---

## 📚 References

- **FASE 11.8:** Implementación de helpers de catálogos SIRE
- **FASE 11.2:** Correcciones críticas de códigos SIRE
- **Official Spec:** `docs/sire/CODIGOS_OFICIALES.md`
- **Database Schema:** `docs/sire/DATABASE_SCHEMA_CLARIFICATION.md`
- **Helpers Implementation:** `src/lib/sire/sire-catalogs.ts`
- **Tests:** `scripts/test-sire-catalogs.ts`

---

## ⚡ Quick Reference

### Get SIRE Country Code

```typescript
import { getSIRECountryCode } from '@/lib/sire/sire-catalogs';

const code = getSIRECountryCode("Estados Unidos");
console.log(code); // "249" ✅
```

### Get DIVIPOLA City Code

```typescript
import { getDIVIPOLACityCode } from '@/lib/sire/sire-catalogs';

const code = getDIVIPOLACityCode("Bogotá");
console.log(code); // "11001" ✅
```

### Format Date for SIRE

```typescript
import { formatDateToSIRE } from '@/lib/sire/sire-catalogs';

const dbDate = "2025-10-09"; // PostgreSQL DATE format
const sireDate = formatDateToSIRE(dbDate);
console.log(sireDate); // "09/10/2025" ✅
```

---

**Last Updated:** October 9, 2025
**Implemented By:** @agent-backend-developer (FASE 11.8)
**Status:** ✅ PRODUCTION READY (27/27 tests passed)
