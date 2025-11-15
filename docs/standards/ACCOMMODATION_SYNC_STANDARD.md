# MUVA Accommodation Data Sync Standard

**Version:** 1.0.0
**Date:** October 2025
**Status:** ✅ ACTIVE

---

## Overview

This document defines the **universal, standardized process** for syncing accommodation data from markdown v3.0 files to the `accommodation_units_public` table in MUVA's multi-tenant platform.

**Key Principle:** ONE script works for ALL hotels/tenants, regardless of business name, location, or accommodation type.

---

## Universal Sync Script

### Location
`scripts/sync-accommodations-to-public.ts`

### Purpose
- Extract accommodation data from markdown v3.0 YAML frontmatter
- Parse markdown content for `<!-- EXTRAE: field -->` comments
- Generate embeddings using `text-embedding-3-large` (Tier 1 Matryoshka, 1024d)
- Insert/update `accommodation_units_public` table
- Ensure 100% field completeness across ALL tenants

### Usage

**Sync specific tenant:**
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/sync-accommodations-to-public.ts --tenant tucasamar
```

**Dry-run (preview changes without writing):**
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/sync-accommodations-to-public.ts --tenant simmerdown --dry-run
```

**Sync ALL tenants:**
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/sync-accommodations-to-public.ts --all
```

---

## Markdown v3.0 Format

### Required YAML Frontmatter Structure

```yaml
---
version: "3.0"
type: "hotel_process"
business_name: "Hotel Name"
business_nit: "900000000-0"
location: "City, Country"
tenant_id: "uuid-tenant-id"
destination:
  schema: "hotels"
  table: "accommodation_units"
document:
  title: "Accommodation Name"
  description: "Short description for search results"
  category: "accommodations"
  subcategory: "accommodation_unit"
  language: "es"
  tags: ["tag1", "tag2"]
  keywords: ["keyword1", "keyword2"]
accommodation:
  unit_type: "room" # or "apartment"
  capacity: 2
  bed_configuration: "Description of beds"
  size_m2: 15
  floor_number: 1
  view_type: "Description of view"
  adults: 2
  children: 0
  base_adults: 2
  base_children: 0
  images: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
  amenities:
    features: ["wifi", "air_conditioning", "tv"]
    attributes:
      unit_type_detail: "detailed_category"
      category: "budget_friendly"
      special_features: ["feature1", "feature2"]
  pricing:
    base_price_low_season: 150000
    base_price_high_season: 175000
    price_per_person_low: 50000
    price_per_person_high: 60000
    currency: "COP"
    minimum_stay: 1
  booking:
    check_in_time: "15:00:00"
    check_out_time: "12:00:00"
    day_restrictions: []
  status: "active"
  is_featured: true
  display_order: 1
  categories: []
---
```

### Markdown Content with EXTRAE Comments

```markdown
# Accommodation Name

## Overview {#overview}
Description of the accommodation...

### Capacity and Distribution
- **Capacity**: 2 persons <!-- EXTRAE: capacity.max_capacity -->
- **Bed configuration**: 1 double bed <!-- EXTRAE: bed_configuration -->
- **Unit number**: Room 101 <!-- EXTRAE: unit_number -->

### Amenities
- WiFi, Air conditioning, TV <!-- EXTRAE: unit_amenities -->
- **Unique features**: Recently renovated, soundproof windows <!-- EXTRAE: unique_features -->

### Location Details
Located in downtown, 2 blocks from beach <!-- EXTRAE: location_details -->

### Tourism Features
Beach, sea, Caribbean culture, local gastronomy <!-- EXTRAE: tourism_features -->

### Accessibility Features
Ground floor, wheelchair accessible <!-- EXTRAE: accessibility_features -->

### Booking Policies
Maximum 2 persons, no smoking <!-- EXTRAE: booking_policies -->
```

---

## Database Schema: `accommodation_units_public`

### Table Structure

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `unit_id` | uuid | Auto-generated primary key | Database |
| `tenant_id` | uuid | Multi-tenant identifier | `tenant_id` |
| `name` | text | Accommodation name | `document.title` |
| `unit_number` | text | Room/unit number | `<!-- EXTRAE: unit_number -->` |
| `unit_type` | varchar | "room" or "apartment" | `accommodation.unit_type` |
| `description` | text | Full markdown content | Markdown body |
| `short_description` | text | Brief description | `document.description` |
| `highlights` | jsonb | Key highlights (array) | Computed |
| `amenities` | jsonb | Amenities object | **See below** |
| `pricing` | jsonb | Pricing object | **See below** |
| `photos` | jsonb | Photo URLs (array) | `accommodation.images` |
| `virtual_tour_url` | text | 360° tour URL | Optional |
| `embedding` | vector(3072) | Tier 3 Matryoshka (future) | - |
| `embedding_fast` | vector(1024) | Tier 1 Matryoshka | OpenAI embedding |
| `metadata` | jsonb | Metadata object | **See below** |
| `is_active` | boolean | Active status | `accommodation.status` |
| `is_bookable` | boolean | Bookable flag | Default `true` |
| `created_at` | timestamptz | Creation timestamp | Database |
| `updated_at` | timestamptz | Update timestamp | Database |

---

## Field Extraction Logic

### 1. PRICING (JSONB) - CRITICAL

**Complete pricing structure:**

```json
{
  "currency": "COP",
  "base_price": 280000,
  "base_price_low_season": 280000,
  "base_price_high_season": 280000,
  "price_per_person_low": 50000,
  "price_per_person_high": 60000,
  "minimum_stay": 1
}
```

**Extraction:**
```typescript
const pricingData = frontmatter.accommodation?.pricing || {};
const pricing = {
  currency: pricingData.currency || 'COP',
  base_price: pricingData.base_price_low_season || pricingData.base_price_high_season || 0,
  base_price_low_season: pricingData.base_price_low_season || 0,
  base_price_high_season: pricingData.base_price_high_season || 0,
  price_per_person_low: pricingData.price_per_person_low || 0,
  price_per_person_high: pricingData.price_per_person_high || 0,
  minimum_stay: pricingData.minimum_stay || 1,
};
```

### 2. AMENITIES (JSONB) - CRITICAL

**Complete amenities structure:**

```json
{
  "bed_type": "2 Single Beds or 1 Double",
  "capacity_max": 2,
  "unit_amenities": "wifi, air_conditioning, smart_tv, netflix, kitchen",
  "bed_configuration": "2 Single Beds or 1 Double"
}
```

**Extraction:**
```typescript
const amenitiesFeatures = frontmatter.accommodation?.amenities?.features || [];
const amenitiesText = amenitiesFeatures.join(', ');
const bedConfig = frontmatter.accommodation?.bed_configuration || '';

const amenities = {
  bed_type: bedConfig,
  capacity_max: frontmatter.accommodation?.capacity || 0,
  unit_amenities: amenitiesText || extractFromMarkdown(markdown, 'unit_amenities'),
  bed_configuration: bedConfig,
};
```

### 3. METADATA (JSONB) - CRITICAL (14+ fields)

**Complete metadata structure (Simmerdown model):**

```json
{
  "name": "Cotton Cay",
  "size_m2": 15,
  "capacity": 2,
  "view_type": "Interior double room",
  "floor_number": 1,
  "display_order": 2,
  "unit_amenities": "soundproof windows, flexible beds, safety box...",
  "unique_features": ["renovated_2025", "italian_curtains", "acoustic_isolation"],
  "booking_policies": "Maximum 2 persons, no smoking, check-in 3pm...",
  "location_details": "Excellent location in city center, 2 blocks from beach...",
  "tourism_features": "beach, sea, Caribbean culture, local gastronomy",
  "bed_configuration": [{"type": "double", "count": 1}],
  "accessibility_features": ["ground_floor", "no_stairs"],
  "is_featured": true,
  "status": "active",
  "source_type": "markdown_v3",
  "uploaded_at": "2025-10-17T12:00:00Z",
  "file_path": "_assets/tucasamar/accommodations/rooms/cotton-cay.md"
}
```

**Extraction:**
```typescript
const specialFeatures = frontmatter.accommodation?.amenities?.attributes?.special_features || [];
const uniqueFeaturesFromMarkdown = extractFromMarkdown(markdown, 'unique_features');
const uniqueFeatures = specialFeatures.length > 0
  ? specialFeatures
  : (uniqueFeaturesFromMarkdown ? uniqueFeaturesFromMarkdown.split(',').map(s => s.trim()) : []);

const metadata = {
  name: frontmatter.document?.title || '',
  size_m2: frontmatter.accommodation?.size_m2 || 0,
  capacity: frontmatter.accommodation?.capacity || 0,
  view_type: frontmatter.accommodation?.view_type || '',
  floor_number: frontmatter.accommodation?.floor_number || 0,
  display_order: frontmatter.accommodation?.display_order || 0,
  unit_amenities: amenities.unit_amenities,
  unique_features: uniqueFeatures,
  booking_policies: extractFromMarkdown(markdown, 'booking_policies') || 'Standard policies apply',
  location_details: extractFromMarkdown(markdown, 'location_details') || frontmatter.location || '',
  tourism_features: extractFromMarkdown(markdown, 'tourism_features') || 'Beach, sea, culture',
  bed_configuration: parseBedConfiguration(bedConfig),
  accessibility_features: extractFromMarkdown(markdown, 'accessibility_features')?.split(',').map(s => s.trim()) || [],
  is_featured: frontmatter.accommodation?.is_featured || false,
  status: frontmatter.accommodation?.status || 'active',
  source_type: 'markdown_v3',
  uploaded_at: new Date().toISOString(),
  file_path: filePath,
};
```

### 4. PHOTOS (JSONB)

**Direct extraction:**
```typescript
const photos = frontmatter.accommodation?.images || [];
```

### 5. EMBEDDING_FAST (vector 1024d)

**CRITICAL:** Must use `text-embedding-3-large` to match `public-chat-search.ts`

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large', // MUST match search model
    input: text,
    dimensions: 1024, // Tier 1 Matryoshka
  });
  return response.data[0].embedding;
}
```

**Common Error:** Using `text-embedding-3-small` causes 0 similarity in searches ❌

---

## Field Completeness Requirements

### Minimum Standards (100% Required)

| Field | Requirement | Impact if Missing |
|-------|-------------|-------------------|
| `pricing.currency` | Must have currency code | Chat cannot display prices |
| `pricing.base_price` | Must have base price > 0 | Chat cannot quote prices |
| `amenities.unit_amenities` | Must have amenities list | Chat cannot describe features |
| `amenities.capacity_max` | Must have capacity | Chat cannot answer capacity questions |
| `metadata` (14+ fields) | Must have complete object | Reduced search quality, missing context |
| `photos` | Must have at least 1 image | Visual experience degraded |
| `embedding_fast` | Must have 1024d vector | Search will not work |

### Quality Score Calculation

```typescript
function calculateCompletenessScore(data: AccommodationData): number {
  const checks = [
    data.pricing?.currency && data.pricing?.base_price > 0,
    data.amenities?.unit_amenities && data.amenities.unit_amenities.length > 0,
    data.metadata?.size_m2 && data.metadata.size_m2 > 0,
    data.metadata?.capacity && data.metadata.capacity > 0,
    data.metadata?.view_type && data.metadata.view_type.length > 0,
    data.metadata?.unique_features && data.metadata.unique_features.length > 0,
    data.metadata?.booking_policies && data.metadata.booking_policies.length > 10,
    data.metadata?.location_details && data.metadata.location_details.length > 10,
    data.photos && data.photos.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
```

**Target:** ≥ 90% for production accommodations ⭐

---

## Verification & Validation

### Before Sync (Dry-Run)
```bash
npx tsx scripts/sync-accommodations-to-public.ts --tenant <name> --dry-run
```

**Expected Output:**
```
📊 TENANT_NAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📄 Accommodation Name
      Completeness: 96%
      Pricing: COP 280,000
      Amenities: wifi, air_conditioning, smart_tv...
      Metadata fields: 18
      🔍 DRY RUN - No changes made

...

📦 TENANT_NAME (tenant-uuid)
   Accommodations: 6
   Pricing: 100% (6/6) ✅
   Amenities: 100% (6/6) ✅
   Metadata: 100% (6/6) ✅
   Overall Completeness: 96% ⭐
```

### After Sync (Database Verification)
```bash
set -a && source .env.local && set +a && npx tsx -e "
import { createClient } from '@supabase/supabase-js';
(async () => {
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const { data, error } = await supabase
  .from('accommodation_units_public')
  .select('name, amenities, metadata, pricing')
  .eq('tenant_id', 'tenant-uuid')
  .eq('name', 'Accommodation Name')
  .single();

console.log('✅ AMENITIES:', JSON.stringify(data.amenities, null, 2));
console.log('✅ METADATA fields:', Object.keys(data.metadata).length);
console.log('✅ PRICING:', JSON.stringify(data.pricing, null, 2));
})();
"
```

**Expected:**
- `amenities`: Complete object with 4 fields
- `metadata`: 18 fields minimum
- `pricing`: Complete object with 7 fields

---

## Common Issues & Solutions

### Issue 1: Empty Amenities Field
**Symptom:** `amenities: {}`
**Cause:** Missing YAML extraction
**Solution:** Run universal sync script - extracts from `accommodation.amenities.features`

### Issue 2: Incomplete Metadata (Only 3 Fields)
**Symptom:** `metadata` has only `source_type`, `uploaded_at`, `file_path`
**Cause:** Missing markdown parsing and YAML extraction
**Solution:** Run universal sync script - extracts 14+ fields from YAML + markdown

### Issue 3: Wrong Embedding Model
**Symptom:** Chat returns 0 results despite data existing
**Cause:** Used `text-embedding-3-small` instead of `text-embedding-3-large`
**Solution:** Regenerate embeddings with correct model via sync script

### Issue 4: Missing Pricing
**Symptom:** Chat doesn't quote prices
**Cause:** Empty `pricing` object
**Solution:** Run universal sync script - extracts from `accommodation.pricing`

---

## Future Hotel Onboarding

### Steps for New Hotels

1. **Create markdown v3.0 files:**
   ```bash
   _assets/<hotel-name>/accommodations/rooms/*.md
   _assets/<hotel-name>/accommodations/apartments/*.md
   ```

2. **Follow YAML frontmatter standard:**
   - Include all required fields
   - Set correct `tenant_id`
   - Add `version: "3.0"`

3. **Add EXTRAE comments in markdown:**
   - `<!-- EXTRAE: unit_number -->`
   - `<!-- EXTRAE: unit_amenities -->`
   - `<!-- EXTRAE: unique_features -->`
   - `<!-- EXTRAE: location_details -->`
   - `<!-- EXTRAE: tourism_features -->`
   - `<!-- EXTRAE: accessibility_features -->`
   - `<!-- EXTRAE: booking_policies -->`

4. **Run dry-run validation:**
   ```bash
   npx tsx scripts/sync-accommodations-to-public.ts --tenant <hotel-name> --dry-run
   ```

5. **Execute sync:**
   ```bash
   npx tsx scripts/sync-accommodations-to-public.ts --tenant <hotel-name>
   ```

6. **Verify completeness:**
   - Check summary output for 100% scores
   - Verify database records
   - Test chat search functionality

**NO CODE CHANGES REQUIRED** - The universal script works for ANY hotel! 🎉

---

## Success Metrics

### Per-Tenant Requirements
- ✅ Pricing: 100% (all units have complete pricing)
- ✅ Amenities: 100% (all units have populated amenities)
- ✅ Metadata: 100% (all units have 14+ metadata fields)
- ✅ Overall Completeness: ≥ 90% ⭐

### Platform-Wide Requirements
- ✅ ALL tenants have standardized data structure
- ✅ Chat works consistently across tenants
- ✅ Search returns relevant results (similarity > 0.7)
- ✅ Price quotes appear in chat responses

---

## Maintenance & Updates

### When to Re-run Sync

1. **Accommodation content changes:**
   - Pricing updates
   - Amenity additions
   - Description modifications

2. **Markdown format updates:**
   - Add new EXTRAE fields
   - Update YAML frontmatter

3. **New accommodation additions:**
   - New rooms/apartments added

### Monitoring Script

```bash
# Check field completeness across all tenants
set -a && source .env.local && set +a && \
npx tsx scripts/sync-accommodations-to-public.ts --all --dry-run
```

**Run frequency:** Monthly or after bulk content changes

---

## References

### Related Documentation
- **Database Patterns:** `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **MCP Usage:** `docs/infrastructure/MCP_USAGE_POLICY.md`
- **SIRE Compliance:** `docs/features/sire-compliance/`
- **Bug Reports:** `docs/troubleshooting/BUG_ACCOMMODATION_UNITS_PUBLIC_EMBEDDINGS.md`

### Code References
- **Sync Script:** `scripts/sync-accommodations-to-public.ts` (lines 1-500)
- **Chat Search:** `src/lib/public-chat-search.ts:104` (embedding model)
- **RPC Function:** `match_accommodations_public` (vector similarity search)

---

**Last Updated:** October 2025
**Maintained By:** MUVA Platform Team
**Status:** ✅ PRODUCTION READY
