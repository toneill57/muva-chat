# Accommodation Data Standard

**Version:** 1.0
**Created:** 2025-10-16
**Purpose:** Define quality requirements for all accommodation unit data in MUVA Chat

---

## Overview

This document establishes the **mandatory data quality standard** for all accommodation units across all tenants in the MUVA Chat platform. Adherence to this standard ensures consistent user experience, reliable search functionality, and data integrity.

**Enforcement:** ALL new accommodation uploads MUST pass validation against this standard before database insertion.

---

## Quality Metrics

### Benchmark Comparison

| Metric | Simmerdown (Reference) | Tu Casa Mar (Before Fix) | Standard Requirement |
|--------|------------------------|--------------------------|----------------------|
| **YAML in description** | ❌ No (CORRECT) | ✅ Yes (WRONG) | ❌ MUST be stripped |
| **unit_type populated** | ✅ "room" | ❌ null | ✅ REQUIRED |
| **short_description** | ✅ Present (106 chars) | ❌ null | ✅ REQUIRED (80-150 chars) |
| **Description format** | ✅ Clean Q&A | ❌ YAML pollution | ✅ Clean markdown only |
| **Photos count** | ✅ 7 photos | ✅ 6 photos | ✅ Minimum 1, recommended 5-10 |
| **Pricing JSONB** | ✅ Valid | ✅ Valid | ✅ REQUIRED |
| **Amenities JSONB** | ✅ Valid | ✅ Valid | ✅ REQUIRED |
| **is_active** | ✅ true | ❌ false (fixed) | ✅ Logical consistency |
| **Both tables** | ✅ Both tables | ❌ Only public | ✅ MUST exist in both |

**Quality Score:**
- **Simmerdown:** 9/9 passing (100%) ✅
- **Tu Casa Mar (before fix):** 4/9 passing (44%) ❌
- **Standard requirement:** 9/9 passing (100%) ✅

---

## Required Field Schema

### TypeScript Interface

```typescript
interface AccommodationUnitStandard {
  // ============================================
  // PRIMARY FIELDS (NEVER NULL)
  // ============================================

  unit_id: string;  // UUID, primary key
  tenant_id: string;  // UUID, foreign key to tenant_registry
  name: string;  // Display name, e.g., "Habitación Privada Kaya"

  unit_type: 'room' | 'apartment' | 'suite' | 'house';  // ❌ CRITICAL: Tu Casa Mar = null

  short_description: string;  // ❌ CRITICAL: Tu Casa Mar = null
  // Length: 80-150 characters
  // Style: Concise, descriptive, no jargon
  // Example: "Habitación privada pequeña pero bien optimizada dentro de apartamento con zonas comunes compartidas"

  description: string;  // Full markdown content
  // ❌ MUST NOT contain YAML frontmatter (Tu Casa Mar violation)
  // ✅ MUST start with `# {Unit Name}` heading
  // ✅ SHOULD use Q&A conversational format (Simmerdown reference)

  // ============================================
  // JSONB REQUIRED FIELDS
  // ============================================

  amenities: {
    bed_type: string;  // e.g., "2 Double beds"
    capacity_max: number;  // e.g., 2
    unit_amenities: string;  // Comma-separated list
    bed_configuration: string;  // e.g., "2 camas sencillas ó 1 cama matrimonial"
  };

  pricing: {
    currency: 'COP' | 'USD';
    base_price: number;  // Base nightly rate
    // Optional: base_price_low_season, base_price_high_season
  };

  photos: Array<{
    url: string;  // Full HTTPS URL
    order: number;  // Sequential numbering (1, 2, 3...)
  }>;
  // Minimum: 1 photo
  // Recommended: 5-10 photos

  // ============================================
  // STATUS FIELDS (LOGICAL CONSISTENCY REQUIRED)
  // ============================================

  is_active: boolean;  // If true, visible in chat UI
  is_bookable: boolean;  // If true, is_active MUST also be true

  // ============================================
  // OPTIONAL FIELDS
  // ============================================

  highlights: string[];  // Can be empty array []
  metadata: Record<string, any>;  // JSONB, flexible structure
  virtual_tour_url: string | null;
}
```

---

## Content Quality Rules

### 1. Description Format

#### ❌ VIOLATIONS (Tu Casa Mar Example)

```markdown
---
version: "2.0"
type: "hotel_process"
destination:
  schema: "hotels"
  table: "accommodation_units"
document:
  title: "Serrana Cay"
  description: "Esta habitación con balcón..."
  category: "accommodations"
# ... 50+ lines of YAML metadata
tenant_id: "2263efba-b62b-417b-a422-a84638bc632f"
unit_type: "room"
capacity: 2
---

# Serrana Cay

## Overview {#overview}
...
```

**Problems:**
- ❌ Raw YAML frontmatter visible in description
- ❌ Technical metadata polluting user-facing content
- ❌ Unprofessional presentation
- ❌ ~50 lines of noise before actual content

#### ✅ CORRECT FORMAT (Simmerdown Reference)

```markdown
# Habitación Privada Kaya

## Overview {#overview}

**Q: ¿Qué es la Habitación Privada Kaya y por qué es ideal para viajeros con estancias cortas?**
**A:** La Habitación Privada Kaya es una habitación compacta pero inteligentemente diseñada, ubicada dentro de un apartamento en Simmer Down Guest House donde se comparten las zonas comunes...

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de la Habitación Kaya?**
**A:** Detalles completos de la configuración y espacios disponibles:

### Capacidad y Distribución
- **Capacidad máxima**: 2 personas
- **Configuración de camas**: Habitación con cama doble
...
```

**Characteristics:**
- ✅ Starts immediately with `# {Unit Name}` heading
- ✅ Uses conversational Q&A format
- ✅ Clean markdown with proper heading hierarchy
- ✅ No YAML metadata pollution

---

### 2. Short Description Rules

**Requirements:**
- Length: 80-150 characters
- Style: One sentence, descriptive, benefit-focused
- Tone: Professional but approachable
- NO jargon, NO sales language

**Examples:**

✅ **Good (Simmerdown):**
```
"Habitación privada pequeña pero bien optimizada dentro de apartamento con zonas comunes compartidas"
```
- Length: 106 characters ✅
- Clear, descriptive, mentions key feature (shared spaces)

❌ **Bad (Tu Casa Mar - null):**
```
null
```

❌ **Bad (Too short):**
```
"Habitación con cama"  // 20 chars - not descriptive enough
```

❌ **Bad (Too long):**
```
"Habitación privada pequeña pero muy bien optimizada para el aprovechamiento del espacio, perfecta para una persona o pareja que visite San Andrés durante una estadía corta o que viaje ligero de equipaje, ofreciendo excelente relación calidad-precio y acceso a zonas comunes"  // 280 chars - too verbose
```

---

### 3. HTML Comments Policy

**Current State:** Both Simmerdown and Tu Casa Mar have `<!-- EXTRAE: ... -->` comments in descriptions.

**Example:**
```markdown
- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
```

**Status:** ⚠️ **UNDER INVESTIGATION**

**Possible Interpretations:**
1. **Processing markers** - Used by embedding scripts to extract metadata, should be stripped before final insertion
2. **Intentional metadata** - Kept as invisible HTML comments (won't render in browser)

**Action Required:**
- [ ] Verify if comments appear in production chat UI
- [ ] If YES → Strip them (they're pipeline artifacts)
- [ ] If NO → Keep as processing markers (harmless in HTML)

**Recommendation:** Strip all `<!-- EXTRAE: ... -->` comments during final processing to keep content clean.

---

### 4. Photos Requirements

**Minimum:** 1 photo
**Recommended:** 5-10 photos
**Format:** JSONB array

**Structure:**
```json
[
  {
    "url": "https://example.com/photo1.jpg",
    "order": 1
  },
  {
    "url": "https://example.com/photo2.jpg",
    "order": 2
  }
]
```

**Validation Rules:**
- ✅ All URLs must be HTTPS
- ✅ `order` must be sequential integers starting at 1
- ✅ No duplicate `order` values
- ✅ No missing `order` numbers (1, 2, 3... not 1, 3, 5)
- ✅ All URLs must be accessible (return 200 status)

**Query for photo count:**
```sql
jsonb_array_length(photos) as photo_count  -- NOT array_length()
```

---

### 5. Status Consistency Rules

**Logical Constraints:**

```typescript
// Rule 1: If is_bookable = true, then is_active MUST be true
if (unit.is_bookable === true) {
  assert(unit.is_active === true, "Bookable units must be active");
}

// Rule 2: If is_active = false, unit is invisible to users
if (unit.is_active === false) {
  console.warn("Unit is hidden from chat UI");
}
```

**Tu Casa Mar Violation (FIXED):**
```json
{
  "is_active": false,   // ❌ Hidden from users
  "is_bookable": true   // ❌ But marked as bookable? Contradictory
}
```

**Correct State:**
```json
{
  "is_active": true,
  "is_bookable": true
}
```

---

## Data Integrity Rules

### ⚠️ Table Architecture (CORRECTED)

**IMPORTANT DISCOVERY (2025-10-16):** The two accommodation tables serve **different purposes**, not duplicate storage:

- **`accommodation_units`** → External integrations (MotoPress sync, legacy data)
  - Schema: Separate JSONB columns (`capacity`, `bed_configuration`, `tourism_features`)
  - Currently: 2 units (1 MotoPress-synced, 1 test data)

- **`accommodation_units_public`** → Manually uploaded markdown for guest chat
  - Schema: Consolidated JSONB (`amenities`, `pricing`, `photos`)
  - Currently: 11 units (all manually uploaded from markdown files)

**Validation Update:** The "table_sync" check in `validate-accommodation-data.ts` is **incorrect** - it flags a design pattern as a bug. Units uploaded via markdown (Tu Casa Mar, Simmerdown) will ONLY exist in `accommodation_units_public`, and that's **by design**.

**Correct Architecture:**
```
Data Source                    → Target Table
─────────────────────────────────────────────────────────
MotoPress API sync             → accommodation_units
Markdown file upload           → accommodation_units_public
Manual staff entry (future?)   → accommodation_units
```

**No action required** - This is not a data integrity issue.

---

## Processing Pipeline Standard

### Required Workflow

```bash
# Step-by-step processing pipeline for new accommodation uploads:

1. Parse Input File
   - Accept: Markdown file with YAML frontmatter
   - Validate: File exists, readable, has frontmatter

2. Extract YAML Frontmatter
   - Parse YAML block between `---` delimiters
   - Extract metadata: unit_type, capacity, pricing, etc.
   - Validate: All required frontmatter fields present

3. Strip YAML from Description
   - Remove everything from start of file to closing `---`
   - Result: Clean markdown starting with `# {Unit Name}`
   - ❌ CRITICAL: Tu Casa Mar skipped this step

4. Extract JSONB Data
   - Parse amenities from markdown content
   - Extract pricing information
   - Parse photos array
   - Build bed_configuration

5. Generate short_description
   - Option A: Use frontmatter `document.description` if present
   - Option B: Auto-generate from first 150 chars of clean description
   - Validate: 80-150 characters

6. Validate All Required Fields
   - Run validation script (see scripts/validate-accommodation-data.ts)
   - Check for null values in required fields
   - Verify JSONB structure
   - Validate photo URLs

7. Insert into BOTH Tables
   - Insert into accommodation_units (main table)
   - Insert into accommodation_units_public (public table)
   - Use same unit_id for both
   - ❌ CRITICAL: Tu Casa Mar only inserted into public table

8. Set Status Flags
   - is_active: Based on tenant subscription tier
   - is_bookable: Based on property availability
   - Validate logical consistency
```

---

## Validation Checklist

Use this checklist for **manual review** or **automated validation**:

### Required Fields (NEVER NULL)
- [ ] `unit_id` (UUID)
- [ ] `tenant_id` (UUID, valid FK)
- [ ] `name` (string, non-empty)
- [ ] `unit_type` ('room' | 'apartment' | 'suite' | 'house')
- [ ] `short_description` (80-150 chars)
- [ ] `description` (clean markdown, no YAML)

### JSONB Structure
- [ ] `amenities.bed_type` exists
- [ ] `amenities.capacity_max` is number > 0
- [ ] `amenities.unit_amenities` is non-empty string
- [ ] `amenities.bed_configuration` exists
- [ ] `pricing.currency` is 'COP' or 'USD'
- [ ] `pricing.base_price` is number > 0
- [ ] `photos` is array with minimum 1 item
- [ ] Each photo has `url` (HTTPS) and `order` (sequential)

### Content Quality
- [ ] Description starts with `# {Unit Name}`
- [ ] No YAML frontmatter in description
- [ ] Short description is descriptive (not generic)
- [ ] Photos array has sequential `order` (1, 2, 3...)

### Status Consistency
- [ ] If `is_bookable = true`, then `is_active = true`
- [ ] Status flags match tenant subscription tier

### Data Integrity
- [ ] Unit exists in `accommodation_units` table
- [ ] Unit exists in `accommodation_units_public` table
- [ ] Same `unit_id` in both tables
- [ ] Field values consistent between tables

---

## Error Examples and Fixes

### Error 1: YAML Frontmatter Pollution

**Symptom:**
```markdown
---
version: "2.0"
type: "hotel_process"
---
# Serrana Cay
```

**Fix:**
```typescript
const cleanDescription = rawDescription
  .replace(/^---\n[\s\S]*?\n---\n/, '')  // Strip YAML block
  .trim();
```

### Error 2: NULL unit_type

**Symptom:**
```json
{"unit_type": null}
```

**Fix:**
```typescript
// Extract from YAML frontmatter
const frontmatter = parseYAML(rawContent);
const unitType = frontmatter.unit_type || 'room';  // Default to 'room'
```

### Error 3: Missing short_description

**Symptom:**
```json
{"short_description": null}
```

**Fix:**
```typescript
// Option A: From frontmatter
const shortDesc = frontmatter.document?.description;

// Option B: Auto-generate from description
const shortDesc = cleanDescription
  .replace(/^#.*\n/, '')  // Remove heading
  .substring(0, 150)
  .trim();
```

### Error 4: Only in One Table

**Symptom:**
```sql
-- accommodation_units: 0 rows
-- accommodation_units_public: 1 row
```

**Fix:**
```typescript
// Always insert into BOTH tables
await Promise.all([
  supabase.from('accommodation_units').insert(unitData),
  supabase.from('accommodation_units_public').insert(unitData)
]);
```

---

## Testing Requirements

### Unit Tests
- [ ] Validate YAML frontmatter extraction
- [ ] Validate description cleaning
- [ ] Validate short_description generation
- [ ] Validate JSONB structure
- [ ] Validate photo array parsing

### Integration Tests
- [ ] Full pipeline test (markdown → database)
- [ ] Validation script detects all violations
- [ ] Fix script corrects all violations
- [ ] Both tables synchronized after insert

### Manual QA
- [ ] Review cleaned description in chat UI
- [ ] Verify photos display correctly
- [ ] Test search functionality (unit_type filter)
- [ ] Verify booking flow (is_bookable = true)

---

## References

### Related Documentation
- `docs/infrastructure/MCP_AUDIT_2025-10-16.md` - MCP efficiency audit
- `docs/architecture/DATABASE_QUERY_PATTERNS.md` - Query patterns
- `CLAUDE.md` - Database operation hierarchy

### Comparison Data Sources
- **Simmerdown (Reference):** tenant_id `b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf`
- **Tu Casa Mar (Violation Example):** tenant_id `2263efba-b62b-417b-a422-a84638bc632f`

### Scripts
- `scripts/validate-accommodation-data.ts` - Audit script
- `scripts/fix-tucasamar-data.ts` - Repair script for Tu Casa Mar
- `scripts/standardize-accommodation-upload.ts` - Future-proof upload pipeline

---

## Changelog

### Version 1.0 (2025-10-16)
- Initial standard created
- Based on Simmerdown (100% quality) vs Tu Casa Mar (44% quality) comparison
- Identified 6 critical violations in Tu Casa Mar data
- Established required field schema
- Defined processing pipeline requirements
- Created validation checklist

---

**Document Status:** ✅ ACTIVE
**Next Review:** 2025-11-16 (after fixing Tu Casa Mar and validating all tenants)
