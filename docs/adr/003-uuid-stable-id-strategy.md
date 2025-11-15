# ADR-003: UUID + Stable ID Strategy

**Date**: October 24, 2025
**Status**: ✅ ACCEPTED
**Context**: Guest Chat ID Mapping - Solve UUID volatility

---

## Context and Problem Statement

Multi-source architecture creates ID mapping complexity:

**Sources:**
1. **MotoPress API** (accommodation units) - Uses `unit_type_id` (int)
2. **Supabase DB** (hotels schema) - Uses `id` (UUID)
3. **Public schema** (guest-facing) - Uses `unit_id` (UUID)

**Problem**: UUIDs regenerate on unit recreation, breaking:
- Vector search (manual chunks reference UUIDs)
- Guest sessions (accommodation_unit_ids stored as UUIDs)
- Historical data (reservations, chat logs)

---

## Decision Drivers

1. **UUID volatility**: Recreating unit in Supabase → new UUID
2. **Cross-system sync**: MotoPress ↔ Supabase requires stable mapping
3. **Data integrity**: Manual chunks must persist across unit recreation
4. **Guest experience**: Session must survive unit updates

---

## Decision

**Use dual-identifier strategy:**

1. **UUID** (`id`) - Primary key for DB performance
2. **Stable ID** (`motopress_unit_id`) - Foreign key to external source

**Schema:**
```sql
CREATE TABLE hotels.accommodation_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motopress_unit_id INTEGER NOT NULL,  -- Stable identifier
  manual_id UUID,  -- Stable manual reference
  -- ... other fields
  UNIQUE(tenant_id, motopress_unit_id)  -- Prevent duplicates
);
```

**Sync logic:**
```typescript
// UPSERT by stable ID, not UUID
await supabase
  .from('accommodation_units')
  .upsert({
    motopress_unit_id: motopressUnit.unit_type_id,  // Stable
    name: motopressUnit.title,
    // ... other fields
  }, {
    onConflict: 'tenant_id,motopress_unit_id',  // Match on stable ID
    ignoreDuplicates: false,  // Update existing
  });
```

**Manual chunks mapping:**
```sql
-- Before (WRONG - volatile UUID)
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = 'NEW-UUID-AFTER-RECREATION';  -- ❌ Breaks on recreation

-- After (CORRECT - stable manual_id)
UPDATE accommodation_units_manual_chunks
SET accommodation_unit_id = (
  SELECT id FROM hotels.accommodation_units
  WHERE manual_id = 'STABLE-MANUAL-ID'  -- ✅ Survives recreation
);
```

---

## Consequences

### Positive

- ✅ **Stability**: Unit recreation doesn't orphan chunks
- ✅ **Sync safety**: MotoPress → Supabase idempotent
- ✅ **Debugging**: Stable IDs easier to trace
- ✅ **Historical data**: Survives unit updates

### Negative

- ⚠️ **Schema complexity**: Two identifiers per unit
- ⚠️ **Migration required**: Populate stable IDs for existing units
- ⚠️ **Query complexity**: Must JOIN on stable IDs for sync

### Neutral

- 🔄 **Future**: Could add more stable identifiers (Airbnb listing ID, etc.)

---

## Implementation

### Migration

**File**: `supabase/migrations/20251024010000_enhance_stable_id_mapping.sql`

```sql
-- Add stable ID columns if not exist
ALTER TABLE hotels.accommodation_units
ADD COLUMN IF NOT EXISTS motopress_unit_id INTEGER,
ADD COLUMN IF NOT EXISTS manual_id UUID;

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_units_stable_id
ON hotels.accommodation_units(tenant_id, motopress_unit_id);

-- Populate manual_id from existing chunks
UPDATE hotels.accommodation_units hu
SET manual_id = (
  SELECT DISTINCT aumc.manual_id
  FROM accommodation_units_manual_chunks aumc
  WHERE aumc.section_title ILIKE '%' || hu.name || '%'
  LIMIT 1
)
WHERE manual_id IS NULL;
```

### Sync Script

**File**: `src/lib/integrations/motopress/sync-manager.ts`

```typescript
export async function syncUnitsSafely(
  motopressUnits: MotoPressUnit[]
): Promise<SyncResult> {
  for (const unit of motopressUnits) {
    // Upsert by stable ID
    const { data, error } = await supabase
      .from('accommodation_units')
      .upsert({
        motopress_unit_id: unit.unit_type_id,  // Stable
        name: unit.title,
        description: unit.description,
        // manual_id preserved automatically
      }, {
        onConflict: 'tenant_id,motopress_unit_id',
      })
      .select('id, manual_id');

    // Remap manual chunks if needed
    if (data.manual_id) {
      await remapManualChunks(data.id, data.manual_id);
    }
  }
}
```

---

## Related Documents

- **Sync Workflow**: `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md`
- **Remap Script**: `scripts/smart-remap-manual-ids.ts`
- **Validation**: `scripts/validate-tenant-health.ts`

---

**Decision Made By**: Backend Developer Agent
**Approved By**: System Architect
**Implementation Date**: October 24, 2025
