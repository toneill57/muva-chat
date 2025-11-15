# Deprecation: accommodation_mphb_type Field

**Status:** DEPRECATED
**Date:** January 10, 2025
**Affected Tables:** `hotels.accommodation_units`, `accommodation_units_public.metadata`

---

## What Was Deprecated

The `accommodation_mphb_type` field that stored the first MotoPress category name (e.g., "apartamento", "1 - 2 personas").

---

## Why It Was Deprecated

### Redundancy
The field duplicated data already available in `metadata.categories[0].name`

### Not Used
- ✅ **Frontend:** 0 references (verified Jan 2025)
- ✅ **Guest Chat:** Not used in AI prompts
- ✅ **API:** Ignored (uses computed `accommodation_type` instead)

### Source of Confusion
- Field name suggested it stored accommodation type (apartment/room)
- Actually stored first category name (could be capacity like "1-2 personas")
- API was recalculating the correct type from categories anyway

---

## Migration Path

### Phase 1: Stop Writing (Current - Jan 2025)
- ✅ Remove from MotoPress `data-mapper.ts`
- ✅ Remove from `sync-manager.ts` INSERT statements
- ✅ Keep column in database (preserve historical data)

### Phase 2: Future Cleanup (Optional)
- Consider dropping column in next major migration
- Only if confirmed no external tools rely on it

---

## Replacement

Use `metadata.categories` array to extract accommodation type:

```typescript
// Extract type (Apartamento/Habitación)
const accommodationType = unit.metadata?.categories?.find(c =>
  c.name?.toLowerCase().includes('apartamento') ||
  c.name?.toLowerCase().includes('habitación')
)?.name || 'Alojamiento'
```

This is exactly what the API does now in `/src/app/api/accommodations/units/route.ts` (lines 179-187 and 371-379).

---

## Impact Assessment

### Breaking Changes
**None**
- Field was write-only (never read by application code)
- Historical data preserved in database
- API already using alternative source

### Data Loss
**None**
- Categories array still contains all type information
- Existing records keep their values
- Sync function has fallback to old values via COALESCE

---

## Technical Details

### Before Deprecation

**Data Flow:**
```
MotoPress API
  ├─→ categories: [{id: 20, name: "Apartamentos"}, ...]
  └─→ data-mapper.ts extracts categories[0].name
      └─→ accommodation_mphb_type = "apartamentos"
          └─→ Stored in hotels.accommodation_units
              └─→ Copied to accommodation_units_public.metadata
                  └─→ ❌ NEVER READ by any code
```

**Problem:** Redundant write-only field

### After Deprecation

**Data Flow:**
```
MotoPress API
  └─→ categories: [{id: 20, name: "Apartamentos"}, ...]
      └─→ Stored in metadata.categories
          └─→ API extracts type at runtime
              └─→ accommodation_type = "Apartamentos"
                  └─→ ✅ Used by frontend components
```

**Benefits:**
- Single source of truth (`categories` array)
- No data duplication
- Clearer semantic meaning

---

## Related Files

### Modified (Phase 1)
- `src/lib/integrations/motopress/data-mapper.ts` - Removed calculation (lines 279-282, 304)
- `src/lib/integrations/motopress/sync-manager.ts` - Removed from INSERT statements (lines 280, 321, 337, 669)

### Using Alternative (Already Updated)
- `src/app/api/accommodations/units/route.ts` - Uses `metadata.categories` (lines 179-187, 371-379)

### Legacy (Preserved)
- `supabase/migrations/20250101000000_create_core_schema.sql` - Column definition (marked deprecated)
- `migrations/fresh-2025-11-01/08-functions.sql` - Sync function uses COALESCE for backwards compatibility

---

## Testing Checklist

After deprecation, verify:

- [ ] MotoPress sync completes without errors
- [ ] `metadata.categories` is still populated
- [ ] API `/api/accommodations/units` returns `accommodation_type` correctly
- [ ] Frontend displays accommodation type badges (Apartamentos/Habitaciones)
- [ ] Guest chat responds correctly to accommodation queries
- [ ] Database column `accommodation_mphb_type` still exists (not dropped)

---

## Rollback Instructions

If needed, restore functionality by:

1. Uncomment lines in `src/lib/integrations/motopress/data-mapper.ts`:
   ```typescript
   const accommodationMphbType = (motoPresData.categories?.length ?? 0) > 0
     ? motoPresData.categories?.[0].name?.toLowerCase()
     : 'apartamento'
   ```

2. Uncomment field in return object (line 304):
   ```typescript
   accommodation_mphb_type: accommodationMphbType,
   ```

3. Re-add to INSERT statements in `sync-manager.ts`

4. Re-deploy application

Historical data is preserved, so rollback is non-destructive.

---

## Questions?

See related documentation:
- `docs/accommodation-units-redesign/` - Frontend redesign that triggered this cleanup
- `src/app/api/accommodations/units/route.ts` - Current implementation using categories

Last Updated: January 10, 2025
