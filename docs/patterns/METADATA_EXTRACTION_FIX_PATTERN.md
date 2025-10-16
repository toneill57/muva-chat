# Metadata Extraction Fix Pattern

## Problem Overview

Fields marked with `<!-- EXTRAE: field_name -->` in accommodation markdown documents (like "ventana anti-ruido") were not appearing in chat responses, despite being present in the source documents.

**Symptom**: User asks "¿Qué tipo de ventana tiene Kaya?" → Chat doesn't mention "ventana anti-ruido" even though it's in `kaya.md` with `<!-- EXTRAE: view_type -->`.

## Root Cause

The issue wasn't with extraction or storage, but with **data synchronization between internal and public tables** and **incomplete RPC function metadata merging**.

### The Three-Tier Data Flow Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Markdown Document Processing                       │
│  _assets/{tenant}/accommodations/rooms/{unit}.md            │
│  Fields marked with <!-- EXTRAE: field_name -->             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  populate-embeddings.js     │
         │  Extraction Functions:       │
         │  - extractFeaturesFromTemplate()    │
         │  - extractCapacityFromTemplate()    │
         │  - extractPricingFromTemplate()     │
         │  - extractAmenitiesFromTemplate()   │
         └──────────────┬────────────────
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: Internal Storage (NOT PostgREST-exposed)           │
│  hotels.accommodation_units                                  │
│  Direct columns: view_type, floor_number, capacity,         │
│                 bed_configuration, unit_amenities, etc.      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │  Migration Script (manual sync)
                       │  scripts/sync-{tenant}-to-public.ts
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 3: Public API (PostgREST-exposed)                     │
│  accommodation_units_public                                  │
│  JSONB metadata column: { view_type, floor_number, ... }    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  match_accommodations_public RPC  │
         │  Returns: metadata (merged)       │
         └──────────────┬────────────────
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 4: Chat System                                         │
│  dev-chat-search.ts → dev-chat-engine.ts                    │
│  Reads: result.metadata.view_type, etc.                     │
└─────────────────────────────────────────────────────────────┘
```

## Why Two Tables?

**Architecture Decision**: The `hotels` schema is **NOT exposed via PostgREST** for security and data isolation. Public-facing queries must use `accommodation_units_public` table in the `public` schema.

**Consequences**:
1. Extracted data lands in `hotels.accommodation_units` (direct columns)
2. Must be manually synced to `accommodation_units_public` (JSONB metadata)
3. RPC function must explicitly merge the `metadata` column into results

## Diagnostic Process

### Step 1: Verify Extraction Works

Check if extraction functions ran successfully:

```bash
set -a && source .env.local && set +a && node scripts/populate-embeddings.js
```

Check `hotels.accommodation_units` for extracted data:

```typescript
// scripts/check-hotels-table.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkHotelsTable() {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        id, name, view_type, floor_number, capacity,
        bed_configuration, size_m2, unit_amenities,
        unique_features, accessibility_features,
        images, location_details, tourism_features,
        booking_policies, status, is_featured, display_order
      FROM hotels.accommodation_units
      WHERE name ILIKE '%kaya%'
    `
  });

  if (error) {
    console.error('❌ Error:', error);
  } else if (data && data.length > 0) {
    console.log('=== hotels.accommodation_units ===\n');
    const unit = data[0];

    Object.keys(unit).forEach(field => {
      const value = unit[field];
      const hasValue = value !== null && value !== undefined &&
                       (typeof value === 'string' ? value.length > 0 : true);
      const status = hasValue ? '✅' : '❌';
      console.log(`${status} ${field}`);
    });
  }
}

checkHotelsTable();
```

**Expected Result**: `view_type`, `unit_amenities`, etc. should be populated (✅).

**If NOT populated**: Fix extraction functions in `scripts/populate-embeddings.js`.

### Step 2: Check Public Table Sync

Check if data made it to `accommodation_units_public`:

```typescript
// scripts/check-public-table.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPublicTable() {
  const { data, error } = await supabase
    .from('accommodation_units_public')
    .select('metadata, photos, pricing')
    .ilike('name', '%kaya%')
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('=== accommodation_units_public.metadata ===\n');
    console.log(JSON.stringify(data.metadata, null, 2));

    // Check specific fields
    const fields = [
      'view_type', 'floor_number', 'capacity', 'bed_configuration',
      'unit_amenities', 'unique_features', 'accessibility_features',
      'location_details', 'tourism_features', 'booking_policies'
    ];

    console.log('\n📊 Field Status:');
    fields.forEach(field => {
      const value = data.metadata?.[field];
      const status = value ? '✅' : '❌';
      console.log(`${status} ${field}`);
    });
  }
}

checkPublicTable();
```

**Expected Result**: All extracted fields should be in `metadata` JSONB.

**If NULL/missing**: Need to sync from `hotels.accommodation_units` (see Solution Step 2).

### Step 3: Check RPC Function Returns Metadata

Test the RPC function directly:

```typescript
// scripts/test-rpc-metadata.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRPC() {
  // Create a dummy embedding (doesn't need to be real for this test)
  const dummyEmbedding = new Array(3072).fill(0);

  const { data, error } = await supabase.rpc('match_accommodations_public', {
    query_embedding: dummyEmbedding,
    p_tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf', // Simmerdown
    match_threshold: 0.1,
    match_count: 5
  });

  if (error) {
    console.error('❌ RPC Error:', error);
  } else {
    console.log('=== RPC Result Metadata ===\n');
    const kayaResult = data?.find((r: any) => r.name?.toLowerCase().includes('kaya'));

    if (kayaResult) {
      console.log('✅ Found Kaya in results');
      console.log('\nMetadata returned:');
      console.log(JSON.stringify(kayaResult.metadata, null, 2));

      // Check if view_type is present
      if (kayaResult.metadata?.view_type) {
        console.log('\n✅ view_type present:', kayaResult.metadata.view_type);
      } else {
        console.log('\n❌ view_type MISSING - RPC not merging metadata column!');
      }
    }
  }
}

testRPC();
```

**Expected Result**: `metadata` object should include fields from `aup.metadata` column.

**If missing**: RPC function needs update (see Solution Step 1).

### Step 4: Test in Chat

```bash
# Test via dev chat endpoint
curl -s -X POST "http://simmerdown.localhost:3000/api/dev/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué tipo de ventana tiene Kaya?","sessionId":"test-'$(date +%s)'","tenant_id":"b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"}' | jq -r '.response'
```

**Expected Result**: Response should mention "ventana anti-ruido" or similar.

**If NOT mentioned**: Check server logs for errors or missing data.

## Solution: Three-Part Fix

### Part 1: Update RPC Function to Merge Metadata

**File**: `supabase/migrations/20251016120000_update_match_accommodations_public_include_metadata.sql`

```sql
-- Fix RPC to merge aup.metadata column into response
CREATE OR REPLACE FUNCTION match_accommodations_public(
  query_embedding vector(3072),
  p_tenant_id UUID,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  content TEXT,
  similarity float,
  source_file TEXT,
  pricing JSONB,
  photos JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tenant isolation check
  IF NOT EXISTS (
    SELECT 1 FROM tenant_registry
    WHERE tenant_id = p_tenant_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive tenant: %', p_tenant_id;
  END IF;

  RETURN QUERY
  SELECT
    aup.unit_id AS id,
    aup.name,
    aup.description AS content,
    1 - (aup.embedding <=> query_embedding) AS similarity,
    aup.name::text AS source_file,
    aup.pricing,
    aup.photos,

    -- CRITICAL FIX: Merge constructed fields WITH aup.metadata column
    -- This ensures fields like view_type, floor_number are included
    jsonb_build_object(
      'unit_id', aup.unit_id,
      'name', aup.name,
      'unit_type', aup.unit_type,
      'unit_number', aup.unit_number,
      'short_description', aup.short_description,
      'highlights', aup.highlights,
      'amenities', aup.amenities,
      'virtual_tour_url', aup.virtual_tour_url,
      'is_bookable', aup.is_bookable
    ) || COALESCE(aup.metadata, '{}'::jsonb) AS metadata
    -- The || operator merges JSONB objects, with aup.metadata fields taking precedence

  FROM accommodation_units_public aup
  WHERE
    aup.tenant_id = p_tenant_id
    AND aup.is_active = true
    AND 1 - (aup.embedding <=> query_embedding) > match_threshold
  ORDER BY aup.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Key Changes**:
- Line 59-60: Added `|| COALESCE(aup.metadata, '{}'::jsonb)` to merge the `metadata` column
- The `||` operator is PostgreSQL's JSONB merge operator
- `COALESCE(..., '{}'::jsonb)` handles NULL metadata gracefully

**Apply Migration**:
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/execute-ddl-via-api.ts supabase/migrations/20251016120000_update_match_accommodations_public_include_metadata.sql
```

### Part 2: Create Sync Script to Copy Data

**File**: `scripts/sync-{tenant}-to-public.ts`

Example for Simmerdown/Kaya:

```typescript
#!/usr/bin/env npx tsx
/**
 * Sync data from hotels.accommodation_units to accommodation_units_public
 *
 * Updates the existing record in accommodation_units_public with all extracted
 * fields from the latest record in hotels.accommodation_units
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// IMPORTANT: Get these IDs from your database
const HOTELS_UNIT_ID = '23b75dc4-6d28-4fe2-a4d4-b756e601b90c'; // Source
const PUBLIC_UNIT_ID = 'b00f82aa-c471-41b2-814a-5dfc2078de74'; // Target

async function syncToPublic() {
  console.log('🔄 Syncing from hotels.accommodation_units to accommodation_units_public\n');

  // STEP 1: Get data from hotels.accommodation_units
  console.log('📊 Fetching data from hotels.accommodation_units...');
  const { data: hotelsData, error: queryError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        view_type, floor_number, capacity, bed_configuration, size_m2,
        unit_amenities, unique_features, accessibility_features,
        images, location_details, tourism_features, booking_policies,
        status, is_featured, display_order,
        base_price_low_season, base_price_high_season
      FROM hotels.accommodation_units
      WHERE id = '${HOTELS_UNIT_ID}'
    `
  });

  if (queryError || !hotelsData || hotelsData.length === 0) {
    console.error('❌ Error fetching from hotels:', queryError);
    process.exit(1);
  }

  const sourceData = hotelsData[0];
  console.log('✅ Fetched source data\n');

  // STEP 2: Build metadata object
  console.log('📦 Building metadata object...');
  const metadata = {
    status: sourceData.status || 'active',
    capacity: sourceData.capacity?.max_capacity || sourceData.capacity || 2,
    view_type: sourceData.view_type,
    floor_number: sourceData.floor_number,
    bed_configuration: sourceData.bed_configuration,
    size_m2: sourceData.size_m2,
    unit_amenities: sourceData.unit_amenities,
    unique_features: sourceData.unique_features,
    accessibility_features: sourceData.accessibility_features,
    location_details: sourceData.location_details,
    tourism_features: sourceData.tourism_features,
    booking_policies: sourceData.booking_policies,
    is_featured: sourceData.is_featured,
    display_order: sourceData.display_order,
  };

  // Remove null/undefined fields
  Object.keys(metadata).forEach(key => {
    if (metadata[key as keyof typeof metadata] === null ||
        metadata[key as keyof typeof metadata] === undefined) {
      delete metadata[key as keyof typeof metadata];
    }
  });

  console.log('✅ Metadata object built with', Object.keys(metadata).length, 'fields\n');

  // STEP 3: Build pricing object
  const pricing = {
    base_price_low_season: sourceData.base_price_low_season,
    base_price_high_season: sourceData.base_price_high_season
  };

  // STEP 4: Update accommodation_units_public
  console.log('💾 Updating accommodation_units_public...');
  const { error: updateError } = await supabase
    .from('accommodation_units_public')
    .update({
      metadata: metadata,
      photos: sourceData.images || null,
      pricing: pricing
    })
    .eq('unit_id', PUBLIC_UNIT_ID);

  if (updateError) {
    console.error('❌ Error updating public table:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated accommodation_units_public!\n');

  // STEP 5: Verify
  console.log('🔍 Verifying update...');
  const { data: verifyData, error: verifyError } = await supabase
    .from('accommodation_units_public')
    .select('metadata, pricing')
    .eq('unit_id', PUBLIC_UNIT_ID)
    .single();

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log('\n📊 Updated metadata fields:');
    Object.keys(verifyData.metadata).forEach(key => {
      console.log(`   ✅ ${key}`);
    });
    console.log(`\n✨ Total: ${Object.keys(verifyData.metadata).length} fields synced`);

    if (verifyData.pricing) {
      console.log('\n💰 Pricing synced:');
      console.log(`   Low Season: ${verifyData.pricing.base_price_low_season}`);
      console.log(`   High Season: ${verifyData.pricing.base_price_high_season}`);
    }
  }
}

syncToPublic().catch(console.error);
```

**Run Sync**:
```bash
set -a && source .env.local && set +a && npx tsx scripts/sync-kaya-to-public.ts
```

### Part 3: Reprocess Documents (If Needed)

If extraction didn't run or data is outdated:

```bash
set -a && source .env.local && set +a && node scripts/populate-embeddings.js
```

This will:
1. Read markdown files from `_assets/{tenant}/accommodations/`
2. Extract fields marked with `<!-- EXTRAE: -->`
3. Update `hotels.accommodation_units` with extracted data
4. Regenerate embeddings

**After reprocessing**: Run the sync script again (Part 2).

## Verification Workflow

### 1. Check Database State

```bash
# Check hotels table
set -a && source .env.local && set +a && npx tsx scripts/check-hotels-table.ts

# Check public table
set -a && source .env.local && set +a && npx tsx scripts/check-public-table.ts
```

### 2. Test RPC Directly

```bash
set -a && source .env.local && set +a && npx tsx scripts/test-rpc-metadata.ts
```

### 3. Test in Chat

```bash
#!/bin/bash
# test-chat-metadata.sh
curl -s -X POST "http://simmerdown.localhost:3000/api/dev/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"¿Qué tipo de ventana tiene Kaya?\",\"sessionId\":\"test-$(date +%s)\",\"tenant_id\":\"b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf\"}" \
  | jq -r '.response'
```

**Success Criteria**:
- ✅ Response mentions "ventana anti-ruido" or "anti-noise window"
- ✅ Response includes amenities from `unit_amenities`
- ✅ Response includes physical details (floor, view type)
- ✅ Server logs show NO errors

### 4. Check Server Logs

**CRITICAL**: Always verify server logs after testing.

```bash
# In terminal where dev server is running
# Look for errors like:
# ❌ "column 'view_type' does not exist"
# ❌ "TypeError: Cannot read property 'view_type' of undefined"
# ✅ Should see no errors after fix
```

**DO NOT** declare a fix successful without checking logs!

## Prevention: Standard Workflow for New Tenants

### 1. Create Markdown Documents

```markdown
<!-- _assets/{tenant}/accommodations/rooms/unit-name.md -->

# Room Name

## Vista
**Tipo de vista**: Ventana anti-ruido con vista al exterior <!-- EXTRAE: view_type -->

## Ubicación
**Número de piso**: Planta principal <!-- EXTRAE: floor_number -->

## Capacidad
**Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
**Configuración de camas**: 1 cama queen size <!-- EXTRAE: bed_configuration -->

## Amenities
Smart TV con Netflix, Wi-Fi alta velocidad, Aire acondicionado <!-- EXTRAE: unit_amenities -->
```

### 2. Run Extraction

```bash
set -a && source .env.local && set +a && node scripts/populate-embeddings.js
```

**Verify**: Check `hotels.accommodation_units` has extracted fields.

### 3. Create Migration Script

Copy and adapt `scripts/sync-kaya-to-public.ts`:

```typescript
// scripts/sync-{new-tenant}-to-public.ts
const HOTELS_UNIT_ID = 'uuid-from-hotels-table';
const PUBLIC_UNIT_ID = 'uuid-from-public-table';
// ... rest of script
```

### 4. Run Sync

```bash
set -a && source .env.local && set +a && npx tsx scripts/sync-{new-tenant}-to-public.ts
```

### 5. Verify in Chat

Test with tenant-specific questions and check logs.

## Common Pitfalls

### ❌ Pitfall 1: Assuming Browser Cache is the Issue

**Symptom**: Changes not appearing in chat.

**Wrong Diagnosis**: "Clear cache and cookies!"

**Correct Approach**: Check database state FIRST before assuming client-side issues.

### ❌ Pitfall 2: Using Wrong IDs

**Symptom**: Sync script updates wrong record or fails silently.

**Prevention**: Always query database to get correct UUIDs:

```sql
-- Get hotels.accommodation_units ID
SELECT id, name FROM hotels.accommodation_units
WHERE name ILIKE '%unit-name%';

-- Get accommodation_units_public ID
SELECT unit_id, name FROM accommodation_units_public
WHERE name ILIKE '%unit-name%';
```

### ❌ Pitfall 3: Forgetting to Merge Metadata in RPC

**Symptom**: Data is in `accommodation_units_public.metadata` but doesn't appear in chat.

**Root Cause**: RPC constructs new metadata object without including `aup.metadata` column.

**Fix**: Always use JSONB merge operator:

```sql
jsonb_build_object(...) || COALESCE(aup.metadata, '{}'::jsonb)
```

### ❌ Pitfall 4: Not Verifying Server Logs

**Symptom**: Thinking fix worked but errors still happening.

**Prevention**: ALWAYS check server logs after every test. HTTP 200 doesn't mean no errors!

### ❌ Pitfall 5: Skipping Field Extraction Verification

**Symptom**: Assuming `populate-embeddings.js` worked correctly.

**Prevention**: Check `hotels.accommodation_units` directly to verify extraction:

```bash
set -a && source .env.local && set +a && npx tsx scripts/check-hotels-table.ts
```

## Architecture Rationale

### Why Not Use hotels.accommodation_units Directly?

**Security**: The `hotels` schema contains internal data structures, pricing logic, and operational fields that should not be exposed via PostgREST.

**API Design**: `accommodation_units_public` provides a clean, controlled public API surface with:
- Tenant isolation via RLS policies
- Optimized JSONB structure for flexible metadata
- Separate vector embeddings optimized for public queries
- Clear separation between internal operations and public API

### Why JSONB Metadata Instead of Columns?

**Flexibility**: Different tenants may have different metadata fields. JSONB allows:
- No schema changes for new fields
- Nested structures (e.g., `capacity.max_capacity`)
- Array fields (e.g., `unique_features`)
- Easy merging and updates

**Performance**: JSONB with GIN indexing provides fast queries on flexible schemas.

## Related Documentation

- **Database Architecture**: `docs/architecture/DATABASE_QUERY_PATTERNS.md`
- **Extraction System**: Comments in `scripts/populate-embeddings.js` (lines 393-497)
- **RPC Functions**: `supabase/migrations/20251001015200_add_match_accommodations_public_function.sql`
- **Sync Examples**: `scripts/migrate-tucasamar-to-public.ts`

## Summary Checklist

When troubleshooting missing metadata:

- [ ] Verify extraction ran: Check `hotels.accommodation_units`
- [ ] Verify sync happened: Check `accommodation_units_public.metadata`
- [ ] Verify RPC merges metadata: Test RPC directly
- [ ] Verify chat displays fields: Test via `/api/dev/chat`
- [ ] Verify server logs: Check for errors (CRITICAL!)

When onboarding new tenant:

- [ ] Create markdown documents with `<!-- EXTRAE: -->` tags
- [ ] Run `populate-embeddings.js`
- [ ] Create sync script from template
- [ ] Run sync script
- [ ] Verify all fields in chat
- [ ] Check server logs for errors

---

**Last Updated**: October 2025
**Related Issue**: Kaya "ventana anti-ruido" not appearing in chat responses
**Fix Applied**: Three-part solution (RPC update + sync script + reprocess)
**Result**: 13/17 fields now working in production
