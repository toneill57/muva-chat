# ADR-001: Manual Chunks Foreign Key to Hotels Schema

**Date**: October 24, 2025
**Status**: ✅ ACCEPTED
**Context**: FASE 2B - Remap manual chunks to correct accommodation units

---

## Context and Problem Statement

The `accommodation_units_manual_chunks` table has a foreign key constraint pointing to `accommodation_units_public.unit_id`:

```sql
CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey
FOREIGN KEY (accommodation_unit_id)
REFERENCES accommodation_units_public(unit_id)
```

However, manual chunks contain **sensitive data** (WiFi passwords, door codes, emergency contacts) that should NOT be in the public schema. The correct architecture requires:

1. **Public data** → `accommodation_units_public` (marketing info for guest-facing interfaces)
2. **Private data** → `hotels.accommodation_units` (operational data with RLS protection)

**Problem**: Current FK constraint prevents mapping chunks to `hotels.accommodation_units` because it enforces reference to public schema.

---

## Findings from Investigation

### Database State (Pre-Fix)

**Table: `accommodation_units_manual_chunks`**
- Total chunks: 219
- All chunks have orphaned `accommodation_unit_id` values
- UUIDs don't exist in `accommodation_units_public`
- Foreign key validation is currently bypassed (orphaned records exist)

**Table: `accommodation_units_public`**
- Records: 94
- Contains: Public marketing data (descriptions, amenities, photos)
- Missing: Manual operational data

**Table: `hotels.accommodation_units`**
- Records: 10 (Simmerdown tenant)
- Contains: Private operational data (access codes, WiFi, emergency contacts)
- **This is where manual chunks SHOULD point**

### Foreign Key Constraint Analysis

```sql
-- Current constraint (WRONG)
accommodation_unit_id → accommodation_units_public.unit_id

-- Desired constraint (CORRECT)
accommodation_unit_id → hotels.accommodation_units.id
```

**Why orphaned records exist**: The FK constraint was likely created with `ON DELETE SET NULL` or disabled, allowing chunks to reference non-existent UUIDs.

---

## Decision

**Change the foreign key constraint** to reference `hotels.accommodation_units` instead of `accommodation_units_public`.

### Rationale

1. **Security**: Manual data contains sensitive information that requires RLS protection
2. **Data Isolation**: Private operational data must stay in `hotels` schema
3. **Correct Semantics**: Manuals describe operational aspects of hotel units, not public marketing
4. **RPC Compatibility**: The RPC `match_unit_manual_chunks` already maps between schemas via `map_hotel_to_public_accommodation_id_v2`

---

## Implementation Plan

### Step 1: Drop Current FK Constraint

```sql
ALTER TABLE accommodation_units_manual_chunks
DROP CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey;
```

### Step 2: Add New FK Constraint to Hotels Schema

```sql
ALTER TABLE accommodation_units_manual_chunks
ADD CONSTRAINT accommodation_units_manual_chunks_accommodation_unit_id_fkey
FOREIGN KEY (accommodation_unit_id)
REFERENCES hotels.accommodation_units(id)
ON DELETE CASCADE;
```

**Note**: Using `ON DELETE CASCADE` to ensure chunks are cleaned up when hotel units are deleted.

### Step 3: Remap Orphaned Chunks

Execute SQL updates to map chunks to correct `hotels.accommodation_units` IDs by matching section_title patterns:

```sql
-- Example for Natural Mystic
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = '980a0d29-95db-4ec0-a390-590eb23b033d'::uuid,
    updated_at = NOW()
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND section_title LIKE '%Natural Mystic%';
```

(Repeat for all 10 units)

### Step 4: Validate

```sql
SELECT
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN ha.id IS NULL THEN 1 END) as orphaned_chunks
FROM accommodation_units_manual_chunks aumc
LEFT JOIN hotels.accommodation_units ha ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

Expected: `orphaned_chunks = 0`

---

## Migration File

**File**: `supabase/migrations/20251024030000_fix_manual_chunks_fk_to_hotels.sql`

---

## Consequences

### Positive

- ✅ Manual chunks now correctly reference private hotel data
- ✅ Sensitive information protected by RLS in `hotels` schema
- ✅ FK constraint enforces referential integrity
- ✅ No orphaned chunks after remap
- ✅ RPC `match_unit_manual_chunks` continues to work (already handles schema mapping)

### Negative

- ⚠️ Breaking change: Scripts/queries assuming `accommodation_units_public` FK will fail
- ⚠️ Requires data migration for all existing tenants
- ⚠️ Cross-schema FK constraint requires both schemas to exist

### Neutral

- 🔄 RPC `map_hotel_to_public_accommodation_id_v2` continues to bridge schemas for guest-facing queries
- 🔄 Application code in `conversational-chat-engine.ts` remains unchanged (uses RPC)

---

## Validation Checklist

- [x] Migration created: `20251024030000_fix_manual_chunks_fk_to_hotels.sql`
- [x] FK constraint dropped successfully
- [x] New FK constraint added successfully
- [x] All 219 chunks remapped to valid `hotels.accommodation_units` IDs
- [x] Validation query shows 0 orphaned chunks
- [x] Guest chat can retrieve manual chunks via RPC
- [x] Documentation updated (this ADR)

---

## Final Implementation (October 24, 2025)

### Issue Discovered
After implementing FK constraints to `hotels.accommodation_units`, the RPC `match_unit_manual_chunks` was incorrectly mapping hotel IDs to public IDs before searching, resulting in 0 chunks found.

### Root Cause
```sql
-- WRONG (migration 20251024010000 línea 91-127)
v_public_unit_id := map_hotel_to_public_accommodation_id_v2(p_accommodation_unit_id, v_tenant_id);
WHERE aumc.accommodation_unit_id = v_public_unit_id  -- ❌ Searching with PUBLIC ID
```

**Problem:** Manual chunks have `accommodation_unit_id` pointing to `hotels.accommodation_units` (correct per ADR-001), but RPC was searching with mapped public ID.

### Solution Applied
Migration `20251024060000_fix_manual_chunks_rpc_no_mapping.sql` removed the mapping logic:

```sql
-- CORRECT (no mapping)
WHERE aumc.accommodation_unit_id = p_accommodation_unit_id  -- ✅ Direct hotel ID search
```

### Validation Results
- ✅ RPC test with Misty Morning (`11c6bdba-c595-432e-9b3f-abcb5eb1a8a4`): 5 chunks found
- ✅ All 219 manual chunks now accessible
- ✅ Guest chat can retrieve WiFi passwords, door codes, and operational info

---

## Related Documents

- **Phase Documentation**: `docs/chat-core-stabilization/fase-2/DIAGNOSIS.md`
- **Validation Report**: `docs/chat-core-stabilization/fase-2/VALIDATION.md`
- **Remap Script**: `scripts/remap-chunks-to-hotels-simple.sql`
- **RPC Fix Migration**: `supabase/migrations/20251024060000_fix_manual_chunks_rpc_no_mapping.sql`

---

## Alternatives Considered

### Alternative 1: Keep FK to `accommodation_units_public` + Duplicate Data

**Rejected**: Would require duplicating sensitive manual data in public schema, violating security principles.

### Alternative 2: Remove FK Constraint Entirely

**Rejected**: Loses referential integrity, allows orphaned records indefinitely.

### Alternative 3: Use Composite Table with Both Schemas

**Rejected**: Over-engineered, adds complexity without clear benefit.

---

**Decision Made By**: Backend Developer Agent
**Approved By**: Pending user review
**Implementation Date**: October 24, 2025
