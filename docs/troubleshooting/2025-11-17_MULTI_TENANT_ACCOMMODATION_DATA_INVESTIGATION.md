# Multi-Tenant Accommodation Data Architecture Investigation
**Date:** 2025-11-17
**Status:** 🔬 HYPOTHESIS - REQUIRES VALIDATION
**Severity:** HIGH (Blocks booking sync, manual uploads, MyStay chat header)

---

## 📋 Executive Summary

**HYPOTHESIS:** Accommodation data is split between two tables (`hotels.accommodation_units` and `accommodation_units_public`), causing inconsistent behavior across tenants. Some tenants have data in `hotels` schema (working), others only in `public` schema (broken).

**IMPACT:** 3 critical features fail for affected tenants:
1. Booking sync can't map accommodations
2. Manual upload shows FK errors (but saves anyway)
3. MyStay chat header doesn't display accommodation name

**VALIDATION NEEDED:** Confirm data distribution across tenants before implementing fix.

---

## 🔴 Observed Symptoms

### Symptom 1: Booking Mapper - No Unit Match
**Tenant:** tucasaenelmar
**Observed:** 2025-11-17
```
[mapper] Booking 32154: Looking for accommodation TYPE ID=12419
[mapper] ❌ NO MATCH: No unit found for motopress_type_id=12419
[mapper] Booking 32152: Looking for accommodation TYPE ID=326
[mapper] ❌ NO MATCH: No unit found for motopress_type_id=326
```

**Expected:** Units should be found via `get_accommodation_unit_by_motopress_id` RPC

**Code:** `src/lib/integrations/motopress/bookings-mapper.ts:173-176`
```typescript
const { data: units, error } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId
})
```

---

### Symptom 2: Manual Upload FK Error (But Data Saves)
**Tenant:** tucasaenelmar (and others)
**Observed:** 2025-11-17

**Error Message:**
```
Failed to insert chunk 0: insert or update on table "accommodation_units_manual_chunks"
violates foreign key constraint "accommodation_units_manual_chunks_accommodation_unit_id_fkey"
```

**Behavior:** Error shown to user, BUT manual actually saves and appears after refresh.

**Code:** `src/app/api/accommodation-manuals/[unitId]/route.ts:326-343`

**FK Constraint:** `supabase/migrations/20250101000000_create_core_schema.sql:6886`
```sql
ALTER TABLE ONLY "public"."accommodation_units_manual_chunks"
    ADD CONSTRAINT "accommodation_units_manual_chunks_accommodation_unit_id_fkey"
    FOREIGN KEY ("accommodation_unit_id")
    REFERENCES "hotels"."accommodation_units"("id")
    ON DELETE CASCADE;
```

---

### Symptom 3: MyStay Header - No Accommodation Name
**Tenant:** tucasaenelmar
**Observed:** Works for simmerdown, fails for tucasaenelmar

**Expected:** Header should display accommodation name
**Actual:** Header empty/missing accommodation info

**Code:** `src/components/Chat/GuestChatInterface.tsx:1195`
```typescript
{session.accommodation_unit && (
  <h1 className="text-lg font-bold text-gray-900">
    Alojamiento {session.accommodation_unit.name}
  </h1>
)}
```

**Data Source:** `src/lib/guest-auth.ts:130` (during login)
```typescript
const { data: units, error: unitError } = await supabase
  .rpc('get_accommodation_unit_by_id', {
    p_unit_id: reservation.accommodation_unit_id,
    p_tenant_id: tenant_id
  })
```

---

## 🔍 Analysis Performed

### 1. Database Query - tucasaenelmar Data Distribution

**Query:**
```typescript
// Tenant: tucasaenelmar
// tenant_id: 2b4a56ed-eaeb-48f3-9aea-d05881b1eefc

// hotels.accommodation_units
SELECT COUNT(*) FROM hotels.accommodation_units
WHERE tenant_id = '2b4a56ed-eaeb-48f3-9aea-d05881b1eefc';
// Result: 0 rows ❌

// accommodation_units_public
SELECT COUNT(*) FROM accommodation_units_public
WHERE tenant_id = '2b4a56ed-eaeb-48f3-9aea-d05881b1eefc';
// Result: 10 rows ✅
```

**Observation:** Data exists ONLY in `accommodation_units_public`, NOT in `hotels.accommodation_units`.

---

### 2. RPC Function Analysis

#### RPC 1: `get_accommodation_unit_by_motopress_id`
**File:** `supabase/migrations/20251117171052_fix_accommodation_lookup_use_hotels_schema.sql:34-36`

**Logic:**
```sql
SELECT au.id, au.name::text, au.motopress_type_id, au.motopress_unit_id
FROM hotels.accommodation_units au
WHERE au.tenant_id = p_tenant_id::varchar
  AND au.motopress_type_id = p_motopress_type_id
LIMIT 1;
```

**Problem:** Queries ONLY `hotels.accommodation_units` → Returns empty for tucasaenelmar

**Used By:**
- Booking mapper (`bookings-mapper.ts:173`)

---

#### RPC 2: `get_accommodation_unit_by_id`
**File:** `supabase/migrations/20251117140000_fix_get_accommodation_unit_by_id_search_path.sql:30-32`

**Logic:**
```sql
-- First, try direct lookup in hotels.accommodation_units
SELECT au.id, au.name, au.unit_number, au.view_type
FROM hotels.accommodation_units au
WHERE au.id = p_unit_id
  AND au.tenant_id = p_tenant_id;

-- Fallback: check accommodation_units_public (for chunk IDs)
-- ... (lines 40-58)
```

**Problem:** Primary lookup in `hotels.accommodation_units` fails → Fallback may not work for all cases

**Used By:**
- Guest login (`guest-auth.ts:130, 174`)
- MyStay header display

---

### 3. Data Flow Analysis

#### How Data SHOULD Enter hotels.accommodation_units

**Source:** `src/lib/integrations/motopress/sync-manager.ts:292`

**MotoPress Sync Process:**
```typescript
const insertSql = `
  INSERT INTO hotels.accommodation_units (
    id, hotel_id, tenant_id, motopress_unit_id, motopress_type_id,
    name, description, ...
  ) VALUES (
    hotels.generate_deterministic_uuid('${unit.tenant_id}', ${unit.motopress_unit_id}),
    ...
  )
  ON CONFLICT (id) DO UPDATE SET ...
`
```

**Observation:**
- Simmerdown likely synced MotoPress AFTER migration 20251117171052 → Data in `hotels.accommodation_units`
- Tucasaenelmar may have synced BEFORE or sync failed → Data only in `accommodation_units_public`

---

## 🧪 HYPOTHESIS

### Primary Hypothesis

**Statement:**
Multi-tenant accommodation data is inconsistently distributed between `hotels.accommodation_units` and `accommodation_units_public` due to:
1. Migration timing (tenants synced before architecture change)
2. Incomplete MotoPress sync process
3. Manual data insertion into wrong table

**Affected Tenants:**
Tenants with data in `accommodation_units_public` BUT NOT in `hotels.accommodation_units`

**Root Cause:**
Migration 20251117171052 changed architecture to use `hotels` schema as "Single Source of Truth", but existing data in `accommodation_units_public` was NOT migrated.

---

### Secondary Hypotheses

1. **FK Constraint Paradox:** FK validates against `hotels.accommodation_units`, but RLS policy allows insert anyway → Error shown but data saves

2. **Sync Manager Success:** Simmerdown works because sync completed successfully after migration → Data in both tables or only in `hotels`

3. **Chunk ID Confusion:** Some `accommodation_unit_id` values reference chunk IDs from `accommodation_units_public`, not real unit IDs

---

## ✅ Validation Plan

### Phase 1: Data Audit (READ-ONLY)

**Objective:** Confirm data distribution across ALL tenants

**Queries:**
```sql
-- 1. List all tenants with data distribution
SELECT
  tr.slug AS tenant_slug,
  tr.tenant_id,
  (SELECT COUNT(*) FROM hotels.accommodation_units hau WHERE hau.tenant_id = tr.tenant_id::varchar) AS hotels_count,
  (SELECT COUNT(*) FROM accommodation_units_public aup WHERE aup.tenant_id = tr.tenant_id) AS public_count
FROM tenant_registry tr
ORDER BY tr.slug;

-- 2. Identify affected tenants (data in public, not in hotels)
SELECT tenant_id, slug
FROM tenant_registry tr
WHERE EXISTS (SELECT 1 FROM accommodation_units_public WHERE tenant_id = tr.tenant_id)
  AND NOT EXISTS (SELECT 1 FROM hotels.accommodation_units WHERE tenant_id = tr.tenant_id::varchar);

-- 3. Compare data structure between tables
SELECT
  'hotels' AS source,
  COUNT(*) AS total_units,
  COUNT(DISTINCT tenant_id) AS unique_tenants,
  COUNT(DISTINCT motopress_type_id) AS unique_type_ids
FROM hotels.accommodation_units
UNION ALL
SELECT
  'public' AS source,
  COUNT(*) AS total_units,
  COUNT(DISTINCT tenant_id::varchar) AS unique_tenants,
  COUNT(DISTINCT (metadata->>'motopress_type_id')::int) AS unique_type_ids
FROM accommodation_units_public;
```

**Expected Results:**
- ✅ Simmerdown: `hotels_count > 0`, `public_count >= 0`
- ❌ Tucasaenelmar: `hotels_count = 0`, `public_count > 0`

**Acceptance Criteria:**
- If hypothesis correct → Some tenants have `public_count > 0` AND `hotels_count = 0`
- If hypothesis incorrect → All tenants have consistent data (either both or neither)

---

### Phase 2: Schema Comparison

**Objective:** Verify data compatibility between tables

**Checks:**
1. Compare column structure between `hotels.accommodation_units` and `accommodation_units_public`
2. Verify motopress_type_id mapping exists in public table metadata
3. Check if UUIDs are deterministic (tenant_id + motopress_unit_id)

**Code References:**
- `sync-manager.ts:298` - UUID generation: `hotels.generate_deterministic_uuid('${unit.tenant_id}', ${unit.motopress_unit_id})`
- Migration `20250101000000_create_core_schema.sql` - Schema definitions

---

### Phase 3: RPC Testing

**Objective:** Test RPC functions with known data

**Test Cases:**

**Test 1:** `get_accommodation_unit_by_motopress_id`
```sql
-- For tucasaenelmar (should FAIL under current hypothesis)
SELECT * FROM get_accommodation_unit_by_motopress_id(
  '2b4a56ed-eaeb-48f3-9aea-d05881b1eefc'::uuid,
  12419  -- Known motopress_type_id from logs
);
-- Expected: 0 rows (confirms hypothesis)

-- For simmerdown (should SUCCEED)
SELECT * FROM get_accommodation_unit_by_motopress_id(
  '<simmerdown_tenant_id>'::uuid,
  <known_simmerdown_type_id>
);
-- Expected: 1+ rows
```

**Test 2:** `get_accommodation_unit_by_id`
```sql
-- For tucasaenelmar with known unit_id from accommodation_units_public
SELECT * FROM get_accommodation_unit_by_id(
  '<unit_id_from_public>'::uuid,
  '2b4a56ed-eaeb-48f3-9aea-d05881b1eefc'
);
-- Expected: 0 rows (primary lookup fails) OR 1 row (fallback works)
```

---

### Phase 4: FK Constraint Validation

**Objective:** Understand FK error behavior

**Test:**
```sql
-- Attempt insert with unit_id that exists in public but NOT hotels
INSERT INTO accommodation_units_manual_chunks (
  manual_id, accommodation_unit_id, tenant_id, chunk_content, chunk_index, total_chunks
) VALUES (
  '<test_manual_id>',
  '<unit_id_from_public_only>',  -- Exists in accommodation_units_public, NOT in hotels
  '2b4a56ed-eaeb-48f3-9aea-d05881b1eefc',
  'test content',
  0,
  1
);
-- Expected: FK constraint error (as observed)

-- Then verify if data actually saved despite error
SELECT * FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = '<unit_id_from_public_only>';
-- Expected: 1 row (confirms "error but saves anyway" behavior)
```

---

## 💡 Proposed Solution (IF HYPOTHESIS CONFIRMED)

### Option A: Data Migration (RECOMMENDED)

**Approach:** Copy missing data from `accommodation_units_public` → `hotels.accommodation_units`

**Migration Steps:**
```sql
-- Step 1: Identify missing data
CREATE TEMP TABLE missing_units AS
SELECT DISTINCT
  aup.tenant_id,
  aup.name,
  aup.metadata
FROM accommodation_units_public aup
WHERE NOT EXISTS (
  SELECT 1 FROM hotels.accommodation_units hau
  WHERE hau.tenant_id = aup.tenant_id::varchar
);

-- Step 2: Extract metadata and insert into hotels schema
INSERT INTO hotels.accommodation_units (
  id, tenant_id, motopress_unit_id, motopress_type_id, name, ...
)
SELECT
  hotels.generate_deterministic_uuid(
    tenant_id::varchar,
    (metadata->>'motopress_unit_id')::int
  ),
  tenant_id::varchar,
  (metadata->>'motopress_unit_id')::int,
  (metadata->>'motopress_type_id')::int,
  name,
  ... -- Extract other fields from metadata JSONB
FROM missing_units
ON CONFLICT (id) DO NOTHING;

-- Step 3: Remove FK constraint (or make it DEFERRABLE)
ALTER TABLE accommodation_units_manual_chunks
DROP CONSTRAINT IF EXISTS accommodation_units_manual_chunks_accommodation_unit_id_fkey;

-- Step 4: Verify migration
SELECT
  tr.slug,
  (SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id = tr.tenant_id::varchar) AS after_migration
FROM tenant_registry tr
WHERE EXISTS (SELECT 1 FROM missing_units WHERE tenant_id = tr.tenant_id);
```

**Pros:**
- ✅ Fixes all 3 symptoms at once
- ✅ Aligns with current architecture (hotels as source of truth)
- ✅ No code changes needed
- ✅ Backward compatible

**Cons:**
- ⚠️ Requires careful data extraction from JSONB metadata
- ⚠️ Must verify UUIDs are deterministic to avoid duplicates
- ⚠️ One-time migration complexity

---

### Option B: Update RPC Functions (FALLBACK)

**Approach:** Modify RPCs to query BOTH tables

**NOT RECOMMENDED because:**
- ❌ Contradicts migration 20251117171052 architecture decision
- ❌ `accommodation_units_public` marked as DEPRECATED
- ❌ Doesn't fix FK constraint issue
- ❌ Maintains data inconsistency

---

### Option C: Re-sync All Tenants

**Approach:** Force MotoPress sync for all affected tenants

**NOT RECOMMENDED because:**
- ❌ Assumes all tenants use MotoPress (may not be true)
- ❌ Doesn't explain why tucasaenelmar sync failed
- ❌ Manual intervention required per tenant
- ❌ Doesn't address root cause

---

## 📊 Success Criteria

### Post-Fix Validation

**After implementing solution, ALL of the following must be TRUE:**

1. **Data Consistency:**
   ```sql
   -- All tenants with data have it in hotels schema
   SELECT COUNT(*) FROM tenant_registry tr
   WHERE EXISTS (SELECT 1 FROM accommodation_units_public WHERE tenant_id = tr.tenant_id)
     AND NOT EXISTS (SELECT 1 FROM hotels.accommodation_units WHERE tenant_id = tr.tenant_id::varchar);
   -- Expected: 0 rows
   ```

2. **Booking Mapper:**
   - Tucasaenelmar booking sync finds accommodation units
   - Logs show: `[mapper] ✅ MATCH: Unit "..." matches booking accommodation 12419`

3. **Manual Upload:**
   - No FK constraint errors shown to user
   - Manuals upload cleanly without refresh required

4. **MyStay Header:**
   - Tucasaenelmar guest login shows accommodation name in header
   - `session.accommodation_unit.name` is populated

5. **Simmerdown Regression:**
   - All existing functionality continues to work
   - No data loss or corruption

---

## ⚠️ Risks & Considerations

### Risk 1: UUID Collision
**Risk:** Deterministic UUID generation may create conflicts
**Mitigation:** Verify `generate_deterministic_uuid` function logic before migration

### Risk 2: Incomplete Metadata
**Risk:** `accommodation_units_public` metadata JSONB may be missing required fields
**Mitigation:** Audit metadata completeness before extraction

### Risk 3: Multi-Tenant Isolation
**Risk:** Data migration could cross tenant boundaries
**Mitigation:** Explicit `WHERE tenant_id = ...` in ALL queries, dry-run on staging

### Risk 4: Production Downtime
**Risk:** Migration on large dataset could lock tables
**Mitigation:** Test on staging, use `ON CONFLICT DO NOTHING`, run during low-traffic window

---

## 🔄 Next Steps

### Immediate Actions (Before Implementation)

1. **Run Phase 1 Validation Queries** on DEV environment
   - Document results per tenant
   - Confirm hypothesis before proceeding

2. **Compare simmerdown vs tucasaenelmar**
   - Understand WHY one works and other doesn't
   - Check sync history/logs if available

3. **Schema Deep Dive**
   - Map exact field correspondence between tables
   - Verify metadata JSONB structure

4. **Stakeholder Review**
   - Confirm approach with team
   - Decide on migration timing

### Conditional Actions (If Hypothesis Confirmed)

5. **Create Migration Script**
   - Dry-run on staging
   - Verify data integrity post-migration

6. **Test on Staging**
   - Run all 3 symptom tests
   - Verify success criteria

7. **Production Deployment**
   - Apply migration
   - Monitor tenant-by-tenant

---

## 📎 Attachments

### Key File References

| File | Lines | Purpose |
|------|-------|---------|
| `sync-manager.ts` | 292-343 | MotoPress sync inserts to hotels.accommodation_units |
| `bookings-mapper.ts` | 173-176 | Calls get_accommodation_unit_by_motopress_id |
| `guest-auth.ts` | 130, 174 | Calls get_accommodation_unit_by_id during login |
| `GuestChatInterface.tsx` | 1195 | Displays accommodation name in header |
| `20251117171052...sql` | 34-36 | RPC definition for motopress_id lookup |
| `20251117140000...sql` | 30-32 | RPC definition for unit_id lookup |
| `20250101000000...sql` | 6886 | FK constraint definition |

### Investigation Commands

```bash
# Check tucasaenelmar data
npx tsx scripts/check-tucasaenelmar.ts

# Run validation queries via MCP
mcp__supabase__execute_sql --query "SELECT ..."

# Review migration history
ls -la supabase/migrations/ | grep accommodation
```

---

**Document Status:** 🔬 HYPOTHESIS - AWAITING VALIDATION
**Next Review:** After Phase 1 validation complete
**Owner:** DevOps / Backend Team
