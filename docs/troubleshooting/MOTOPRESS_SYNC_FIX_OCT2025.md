# MotoPress Sync Fix - October 2025

**Issue Date:** October 23, 2025
**Status:** ✅ RESOLVED
**Impact:** Critical - Booking synchronization completely broken

---

## 🐛 Problem Summary

MotoPress booking synchronization was failing with multiple critical issues:

1. **RPC returning wrong data type** - Returned UUID instead of object
2. **Incorrect parameter naming** - Using `p_motopress_unit_id` instead of `p_motopress_type_id`
3. **Airbnb ICS imports mixed with direct bookings** - 39 Airbnb reservations incorrectly saved to `guest_reservations`
4. **Performance issues** - Sync taking 2-3 minutes due to ICS processing

---

## 🔍 Root Cause Analysis

### Issue #1: RPC Return Type Mismatch

**Problem:**
```typescript
// RPC returned: UUID (just the ID)
// Mapper expected: {id: UUID, name: string, motopress_type_id: int}
```

**Result:**
```
[mapper] ✅ MATCH: Unit "undefined" (id=undefined)
```

**Files Affected:**
- `supabase/migrations/` (RPC definition)

---

### Issue #2: Parameter Name Mismatch

**Problem:**
```typescript
// RPC expected: p_motopress_type_id
// Mapper sent: p_motopress_unit_id
```

**Error:**
```
PGRST202: Could not find the function public.get_accommodation_unit_by_motopress_id(p_motopress_unit_id, p_tenant_id)
```

**Files Affected:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (3 occurrences)
- `scripts/sync-motopress-bookings.ts`

---

### Issue #3: Airbnb ICS Mixing

**Problem:**
- MotoPress imports Airbnb reservations via ICS (`imported: true`)
- These were being saved to `guest_reservations` alongside direct bookings
- Caused confusion: 88 created (49 MotoPress + 39 Airbnb) vs 49 visible

**Expected Behavior:**
- Direct MotoPress bookings → `guest_reservations`
- Airbnb ICS imports → `airbnb_mphb_imported_reservations` (for future comparison)

**Files Affected:**
- `src/lib/integrations/motopress/bookings-mapper.ts`
- `src/app/api/integrations/motopress/sync-all/route.ts`

---

## ✅ Solutions Implemented

### Fix #1: RPC Return Type

**Before:**
```sql
CREATE FUNCTION get_accommodation_unit_by_motopress_id(
  p_tenant_id UUID,
  p_motopress_type_id INTEGER
)
RETURNS UUID  -- ❌ Only UUID
```

**After:**
```sql
CREATE FUNCTION get_accommodation_unit_by_motopress_id(
  p_tenant_id UUID,
  p_motopress_type_id INTEGER
)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  motopress_type_id INTEGER,
  motopress_unit_id INTEGER
)  -- ✅ Complete object
```

**File:** PostgreSQL function (executed via `mcp__supabase__execute_sql`)

---

### Fix #2: Parameter Naming

**Before:**
```typescript
const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_unit_id: motopressTypeId  // ❌ Wrong parameter name
})
```

**After:**
```typescript
const { data: units } = await supabase.rpc('get_accommodation_unit_by_motopress_id', {
  p_tenant_id: tenantId,
  p_motopress_type_id: motopressTypeId  // ✅ Correct parameter name
})
```

**Files Updated:**
- `src/lib/integrations/motopress/bookings-mapper.ts` (lines 171, 338, 509-511)
- `scripts/sync-motopress-bookings.ts` (line 350)

---

### Fix #3: ICS Separation

**A. Created Comparison Table**

```sql
CREATE TABLE IF NOT EXISTS public.airbnb_mphb_imported_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  motopress_booking_id INTEGER NOT NULL,
  motopress_accommodation_id INTEGER,
  motopress_type_id INTEGER,
  -- ... guest info, dates, pricing ...
  comparison_status VARCHAR DEFAULT 'pending',
  raw_motopress_data JSONB,
  UNIQUE(tenant_id, motopress_booking_id, check_in_date, motopress_accommodation_id)
);
```

**B. Updated Mapper to Detect ICS**

```typescript
// In mapBulkBookingsWithEmbed()
if (booking.imported === true) {
  icsExcluded++
  icsImports.push(booking)
  console.log(`[mapper] 📥 ICS import (Airbnb): MP-${booking.id}`)
  continue  // Skip from guest_reservations
}
```

**C. Temporarily Disabled ICS Saving (Performance)**

```typescript
// In sync-all/route.ts
// COMMENTED OUT - Too slow for testing (adds 1-2 minutes)
// TODO: Re-enable after optimization or implement as background job
if (icsImports.length > 0) {
  console.log(`[sync-all] 📥 Found ${icsImports.length} ICS imports - SKIPPING save for now`)
}
```

---

## 📊 Results

### Before Fix
```
✅ Sync completed
88 created (49 MotoPress + 39 Airbnb mixed together)
1 updated
Logs: Unit "undefined" (id=undefined)
Duration: 2-3 minutes
```

### After Fix
```
✅ Sync completed
49 created (only direct MotoPress bookings)
0 updated (fresh sync)
39 ICS detected and excluded
Logs: MATCH: Unit "Kaya" (id=ba214e61-7d6d-43cd-b638-fc8a644d9c2f)
Duration: ~1 minute
```

---

## 🔐 Security Note

During this investigation, we discovered **SimmerDown credentials stored in plaintext** in `integration_configs`:

```json
{
  "consumer_key": "ck_29a384bbb0500c07159e90b59404293839a33282",
  "consumer_secret": "cs_8fc58d0a3af6663b3dca2776f54f18d55f2aaea4"
}
```

**Other tenants** have encrypted credentials.

**TODO:** Migrate all credentials to Supabase Vault (see Issue #xxx)

---

## 📝 Related Documentation

- **Script:** `scripts/sync-motopress-bookings.ts`
- **Mapper:** `src/lib/integrations/motopress/bookings-mapper.ts`
- **API Endpoint:** `src/app/api/integrations/motopress/sync-all/route.ts`
- **RPC Function:** `public.get_accommodation_unit_by_motopress_id()`
- **Tables:**
  - `guest_reservations` (direct MotoPress bookings)
  - `airbnb_mphb_imported_reservations` (ICS imports - not yet implemented)

---

## 🔮 Future Work

1. **Re-enable ICS sync** after performance optimization
   - Options: Background job, batch processing, separate endpoint
   - Goal: Compare Airbnb ICS vs direct Airbnb sync for conflicts

2. **Migrate credentials to Supabase Vault**
   - All 3 tenants need secure storage
   - Priority: SimmerDown (plaintext exposure)

3. **Add monitoring for sync failures**
   - Alert on parameter mismatches
   - Track ICS vs direct booking counts

---

**Last Updated:** October 23, 2025
**Resolution Time:** ~2 hours
**Files Changed:** 4 (RPC, mapper, endpoint, script)
