# Tenant Reset & Resync Process

**Complete Step-by-Step Guide for Rebuilding Tenant Data**

**Project**: MUVA Chat - Guest Chat ID Mapping
**Last Updated**: October 23, 2025
**Status**: Production Ready ✅

---

## 📋 Overview

This guide provides a **complete, reproducible process** for resetting and resyncing all accommodation data for a tenant. Any developer can follow these steps safely.

### What This Process Does

1. **Deletes** all accommodation units and related data
2. **Resyncs** units from MotoPress API
3. **Recreates** processed manuals with embeddings
4. **Resyncs** reservations from Airbnb/MotoPress
5. **Validates** complete system health

### When to Use This Process

✅ **USE when**:
- Schema changes require fresh data
- Data corruption detected
- Testing new multi-tenant features
- Migrating to new stable ID system
- Cleaning up test/staging environments

❌ **DO NOT USE when**:
- Production data is critical (use backup first!)
- Only need to update existing units (use `--update-only` instead)
- Not sure what you're doing (read troubleshooting section first)

### Estimated Time

- **Small tenant** (10-20 units): 15-20 minutes
- **Medium tenant** (50-100 units): 30-45 minutes
- **Large tenant** (100+ units): 45-60 minutes

---

## ⚠️ PRE-REQUISITES

### 1. Tenant Information

You must know:

```bash
# Required information
TENANT_SLUG="simmerdown"           # Subdomain (e.g., simmerdown.muva.chat)
TENANT_UUID="b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"  # From tenants table
```

**How to find tenant UUID**:

```sql
SELECT id, slug, name
FROM tenants
WHERE slug = 'simmerdown';
```

### 2. Environment Access

Ensure you have:

```bash
# Test environment variables loaded
source .env.local

# Verify database access
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const { error } = await supabase.from('tenants').select('count').single()
console.log(error ? '❌ DB access failed' : '✅ DB access OK')
"
```

### 3. Backup Verification

**CRITICAL**: Always backup before destructive operations!

```bash
# Backup accommodation data
pg_dump \
  -h db.ooaumjzaztmutltifhoq.supabase.co \
  -U postgres \
  -d postgres \
  -t accommodation_units_public \
  -t accommodation_units_manual \
  -t accommodation_units_manual_chunks \
  --data-only \
  > backup_accommodation_$(date +%Y%m%d_%H%M%S).sql
```

Store backup safely:
```bash
# Move to backups directory
mkdir -p backups/
mv backup_accommodation_*.sql backups/

# Verify backup file exists and has content
ls -lh backups/backup_accommodation_*.sql
```

### 4. Markdown Manuals Exist

Verify manual files are available:

```bash
# Count manual files for tenant
ls -1 _assets/${TENANT_SLUG}/accommodations-manual/**/*-manual.md 2>/dev/null | wc -l

# Expected: > 0 (e.g., 9 files for Simmerdown)
```

If manuals don't exist, you'll need to create them before running this process.

### 5. MotoPress API Access

Test API connectivity:

```bash
# Verify MotoPress credentials
echo "Hotel ID: ${MOTOPRESS_SIMMERDOWN_HOTEL_ID}"
echo "API Key: ${MOTOPRESS_SIMMERDOWN_API_KEY:0:10}..."

# Should show valid values (not empty)
```

---

## 🚀 RESET & RESYNC PROCESS

### PASO 1: DELETE ALL DATA (CASCADE Cleanup)

**What gets deleted**:
- `accommodation_units_public` (CASCADE deletes manuals/chunks automatically)
- All manual embeddings
- All processed chunks
- ICS feed configurations (must reconfigure)

**What is preserved**:
- Tenant configuration
- User accounts
- Historical reservations (if not linked to deleted units)
- Markdown manual files (filesystem)

```sql
-- STEP 1A: Verify what will be deleted
SELECT
  'Units' as type, COUNT(*) as count
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
UNION ALL
SELECT
  'Manuals', COUNT(*)
FROM accommodation_units_manual aum
INNER JOIN accommodation_units_public aup ON aup.unit_id = aum.unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
UNION ALL
SELECT
  'Chunks', COUNT(*)
FROM accommodation_units_manual_chunks aumc
INNER JOIN accommodation_units_public aup ON aup.unit_id = aumc.accommodation_unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

**Expected output** (Simmerdown example):
```
type     | count
---------+------
Units    |   94
Manuals  |    8
Chunks   |  265
```

```sql
-- STEP 1B: Execute CASCADE delete
DELETE FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';

-- Expected: "DELETE 94" (or your unit count)
```

**Verify deletion**:
```sql
SELECT COUNT(*) FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Expected: 0

SELECT COUNT(*) FROM accommodation_units_manual_chunks aumc
INNER JOIN accommodation_units_public aup ON aup.unit_id = aumc.accommodation_unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Expected: 0 (CASCADE deleted)
```

---

### PASO 2: SYNC UNITS FROM MOTOPRESS

Recreate units from MotoPress API:

```bash
# Run sync script for tenant
pnpm dlx tsx scripts/sync-accommodations-to-public.ts --tenant=simmerdown
```

**Expected output**:
```
🔄 Syncing accommodations for tenant: simmerdown
📡 Fetching from MotoPress API...
✅ Found 94 accommodation units
🔄 Processing units...
   ✅ Dreamland - Overview (Room)
   ✅ Jammin' - Overview (Room)
   ✅ One Love - Overview (Apartment)
   ...
📊 SYNC SUMMARY
   Created: 94
   Updated: 0
   Skipped: 0
✅ Sync complete!
```

**Common errors**:

1. **API authentication failed**
   ```
   ❌ MotoPress API error: 401 Unauthorized
   ```
   **Fix**: Verify `MOTOPRESS_SIMMERDOWN_API_KEY` in `.env.local`

2. **No units found**
   ```
   ⚠️ Found 0 accommodation units
   ```
   **Fix**: Check `MOTOPRESS_SIMMERDOWN_HOTEL_ID` is correct

---

### PASO 3: VERIFY STABLE IDS

Ensure all units have stable identifiers for future remapping:

```sql
-- Check all units have motopress_unit_id
SELECT
  unit_id,
  name,
  metadata->>'motopress_unit_id' as motopress_id,
  metadata->>'original_accommodation' as original_name
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND (
    metadata->>'motopress_unit_id' IS NULL
    OR metadata->>'original_accommodation' IS NULL
  );
```

**Expected**: `0 rows`

**If any rows returned**, units are missing stable IDs. Fix:

```sql
-- Example fix (replace values with actual data)
UPDATE accommodation_units_public
SET metadata = jsonb_set(
  jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{motopress_unit_id}',
    '"317"'  -- From MotoPress unit_number
  ),
  '{original_accommodation}',
  '"Dreamland"'  -- Original unit name
)
WHERE unit_id = '<uuid>' AND tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

---

### PASO 4: RECONFIGURE ICS FEEDS

**MANUAL STEP**: ICS feed URLs must be reconfigured in UI because unit IDs changed.

#### 4A: Get New Unit IDs

```sql
-- Get unit IDs and names for ICS configuration
SELECT
  unit_id,
  name,
  accommodation_type
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND name LIKE '%Overview%'
ORDER BY name;
```

Copy unit IDs for next step.

#### 4B: Navigate to ICS Configuration UI

```bash
# Start dev server
./scripts/dev-with-keys.sh

# Open staff dashboard
open http://simmerdown.localhost:3000/staff/login
```

Login with staff credentials, then:

1. Navigate to **Settings** → **Integrations** → **ICS Feeds**
2. For each accommodation unit:
   - Click "Configure ICS Feed"
   - Paste Airbnb ICS URL
   - Select correct `unit_id` from dropdown
   - Save configuration

#### 4C: Verify ICS Configuration

```sql
-- Check ICS feeds are configured
SELECT
  aup.name,
  ics.feed_url,
  ics.last_synced_at,
  ics.is_active
FROM accommodation_units_public aup
LEFT JOIN ics_feed_configurations ics ON ics.unit_id = aup.unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND aup.name LIKE '%Overview%'
ORDER BY aup.name;
```

**Expected**: All units have `feed_url` populated.

---

### PASO 5: SYNC RESERVATIONS

#### 5A: Sync Airbnb Reservations (via ICS)

```bash
# Sync ICS feeds for all configured units (FASE 5 - To be implemented)
# pnpm run sync:ics-feeds -- --tenant=simmerdown

# For now, ICS syncing happens automatically via scheduled jobs
# Or manually trigger via UI: Settings → Integrations → ICS Feeds → "Sync Now"
```

**Expected output**:
```
🔄 Syncing ICS feeds for tenant: simmerdown
📡 Found 9 configured ICS feeds
   ✅ Dreamland: 3 reservations synced
   ✅ Jammin': 2 reservations synced
   ...
📊 SYNC SUMMARY
   Total reservations: 15
   New: 12
   Updated: 3
✅ ICS sync complete!
```

#### 5B: Sync MotoPress Bookings

```bash
# Sync MotoPress reservations
pnpm run sync:motopress:bookings
```

**Expected output**:
```
🔄 Syncing MotoPress bookings for tenant: simmerdown
📡 Fetching bookings from MotoPress API...
✅ Found 8 bookings
🔄 Processing bookings...
   ✅ Booking #1234 (John Doe)
   ✅ Booking #1235 (Jane Smith)
   ...
📊 SYNC SUMMARY
   Created: 8
   Updated: 0
✅ MotoPress booking sync complete!
```

#### 5C: Verify Reservation Sync

```sql
-- Check reservations are linked to units
SELECT
  gr.guest_name,
  gr.check_in_date,
  gr.check_out_date,
  aup.name as unit_name,
  gr.source
FROM guest_reservations gr
INNER JOIN accommodation_units_public aup ON aup.unit_id = gr.accommodation_unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND gr.check_in_date >= CURRENT_DATE
ORDER BY gr.check_in_date;
```

**Expected**: See upcoming reservations with valid `unit_name`.

---

### PASO 6: PROCESS MANUALS (Generate Embeddings)

Recreate manual embeddings from markdown files:

```bash
# Process all manuals for tenant
node scripts/process-accommodation-manuals.js --tenant=simmerdown
```

**Expected output**:
```
🚀 Starting accommodation manual processing...
🎯 Processing manuals for tenant: simmerdown
Found 9 manual files

📄 Processing: dreamland-manual.md
   Unit: Dreamland
   Tenant: b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
   ✓ Matched: "Dreamland" → unit_id: 45be817b-007d-48e2-b52b-d653bed94aa6
   🧮 Generating embeddings...
   ✓ Embeddings generated (1536d + 3072d)
   ✅ Upserted accommodation_units_manual

... (repeat for all 9 manuals)

============================================================
📊 PROCESSING SUMMARY
============================================================
✅ Successful: 9/9
❌ Failed: 0/9

✨ Processing complete!
```

**Common errors**:

1. **Unit not found in database**
   ```
   ⚠️  Unit not found in database: "Dreamland"
   ```
   **Fix**: Unit name in manual frontmatter doesn't match DB. Check:
   ```bash
   grep "unit_name:" _assets/simmerdown/accommodations-manual/rooms/dreamland-manual.md
   ```

2. **OpenAI API error**
   ```
   ❌ Embedding generation failed: 429 Rate limit exceeded
   ```
   **Fix**: Wait 60 seconds and retry. Or check `OPENAI_API_KEY`.

---

### PASO 7: VALIDATE COMPLETE SYSTEM

#### 7A: Health Check Script

```bash
# Run automated health check (FASE 5 - To be implemented)
# pnpm run validate:tenant-health -- --tenant=simmerdown

# For now, use manual validation queries below
```

**Expected output (when implemented)**:
```
🏥 Tenant Health Check: simmerdown
============================================================

📊 Accommodation Units
   ✅ Total units: 94
   ✅ All have stable IDs: 94/94
   ✅ All have metadata: 94/94

📚 Manuals & Embeddings
   ✅ Manuals processed: 9/9
   ✅ Total chunks: 265
   ✅ Avg chunks per unit: 29.4
   ✅ All units have embeddings: 9/9

📅 Reservations
   ✅ Active reservations: 15
   ✅ Future check-ins: 12
   ✅ All linked to valid units: 15/15

🔧 ICS Feeds
   ✅ Configured feeds: 9
   ✅ Active feeds: 9
   ✅ Recently synced (<24h): 9

============================================================
✅ HEALTH CHECK PASSED - All systems operational
```

#### 7B: Manual Validation Queries

**1. Verify units exist**:
```sql
SELECT COUNT(*) as total_units
FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
-- Expected: 94 (or your expected count)
```

**2. Verify manuals with chunks**:
```sql
SELECT
  aup.name,
  CASE WHEN aum.unit_id IS NOT NULL THEN '✅' ELSE '❌' END as has_manual,
  COUNT(aumc.chunk_id) as chunk_count
FROM accommodation_units_public aup
LEFT JOIN accommodation_units_manual aum ON aum.unit_id = aup.unit_id
LEFT JOIN accommodation_units_manual_chunks aumc ON aumc.accommodation_unit_id = aup.unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND aup.name LIKE '%Overview%'
GROUP BY aup.unit_id, aup.name, aum.unit_id
ORDER BY aup.name;
```

**Expected**: All units show `✅` and `chunk_count > 0`.

**3. Verify reservations**:
```sql
SELECT
  source,
  COUNT(*) as count,
  MIN(check_in_date) as earliest_checkin
FROM guest_reservations gr
INNER JOIN accommodation_units_public aup ON aup.unit_id = gr.accommodation_unit_id
WHERE aup.tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND check_in_date >= CURRENT_DATE
GROUP BY source;
```

**Expected**:
```
source     | count | earliest_checkin
-----------+-------+-----------------
airbnb     |    12 | 2025-10-25
motopress  |     8 | 2025-10-26
```

#### 7C: Test Guest Chat (End-to-End)

```bash
# 1. Create test guest session
# (Manual step - create reservation or use existing guest token)

# 2. Login as guest
open http://simmerdown.localhost:3000/guest/login?token=<guest_token>

# 3. Ask about WiFi
# Type in chat: "What's the WiFi password?"

# Expected response:
# "The WiFi password for your accommodation is: simmerdown123"
# (or actual password from manual)

# 4. Check logs show chunks found
tail -f /tmp/muva-dev.log | grep "Unit manual chunks results"
```

**Expected log output**:
```json
{
  "total_found": 5,
  "unit_id": "45be817b-007d-48e2-b52b-d653bed94aa6",
  "unit_name": "Dreamland",
  "chunks": [
    { "chunk_index": 9, "similarity": "0.294", "section": "Conectividad" },
    { "chunk_index": 10, "similarity": "0.287", "section": "WiFi" }
  ]
}
```

---

## 🚨 TROUBLESHOOTING

### Issue 1: Guest Chat Returns "No Information"

**Symptom**:
```
Guest asks: "What's the WiFi password?"
Bot responds: "I don't have specific information about WiFi..."
```

**Diagnosis**:

```sql
-- Check if guest has valid unit_id
SELECT
  gr.guest_name,
  gr.accommodation_unit_id,
  aup.name as unit_name,
  COUNT(aumc.chunk_id) as chunks
FROM guest_reservations gr
LEFT JOIN accommodation_units_public aup ON aup.unit_id = gr.accommodation_unit_id
LEFT JOIN accommodation_units_manual_chunks aumc ON aumc.accommodation_unit_id = gr.accommodation_unit_id
WHERE gr.id = '<reservation_id>'
GROUP BY gr.id, gr.guest_name, gr.accommodation_unit_id, aup.name;
```

**Possible causes**:

1. **unit_name is NULL**
   - Guest's `accommodation_unit_id` is invalid/orphaned
   - **Fix**: Re-sync reservations (PASO 5)

2. **chunks = 0**
   - Manual not processed or chunks missing
   - **Fix**: Re-run manual processing (PASO 6)

3. **All looks correct but still fails**
   - Check embedding dimensions match
   - **Fix**: Verify `embedding` field is not NULL:
   ```sql
   SELECT unit_id, manual_content IS NOT NULL, embedding IS NOT NULL
   FROM accommodation_units_manual
   WHERE unit_id = '<unit_id>';
   ```

### Issue 2: Manual Processing Fails

**Symptom**:
```
❌ Failed: dreamland-manual.md - Unit not found in database
```

**Diagnosis**:

```bash
# Check unit name in manual file
grep "unit_name:" _assets/simmerdown/accommodations-manual/rooms/dreamland-manual.md

# Check unit name in database
psql -c "SELECT name FROM accommodation_units_public WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf' AND name ILIKE '%dream%';"
```

**Fix**: Unit names must match exactly. Update manual frontmatter or database name.

### Issue 3: ICS Sync Fails

**Symptom**:
```
❌ ICS sync failed: Invalid ICS URL
```

**Diagnosis**:

```sql
-- Check ICS feed configuration
SELECT unit_id, feed_url, is_active, last_error
FROM ics_feed_configurations
WHERE unit_id IN (
  SELECT unit_id FROM accommodation_units_public
  WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
);
```

**Fix**:
1. Verify Airbnb ICS URL is valid (copy from Airbnb listing)
2. Check `is_active = true`
3. Test URL manually:
   ```bash
   curl -I "<ics_feed_url>"
   # Should return: 200 OK
   ```

### Issue 4: Orphaned Chunks After Reset

**Symptom**:
```sql
SELECT COUNT(*) FROM accommodation_units_manual_chunks aumc
LEFT JOIN accommodation_units_public aup ON aup.unit_id = aumc.accommodation_unit_id
WHERE aup.unit_id IS NULL;
-- Returns: > 0 (orphaned chunks exist)
```

**Fix**:

```bash
# Run smart remap script
pnpm run remap:manual-ids b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
```

**Note**: With CASCADE FKs (FASE 1), this should never happen. If it does, check FK constraints are active.

### Issue 5: Stable IDs Missing

**Symptom**:
```sql
-- Some units missing motopress_unit_id
SELECT name FROM accommodation_units_public
WHERE tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf'
  AND metadata->>'motopress_unit_id' IS NULL;
-- Returns: > 0 rows
```

**Fix**:

```bash
# Re-run sync with --force-metadata flag (if supported)
pnpm dlx tsx scripts/sync-accommodations-to-public.ts --tenant=simmerdown --force-metadata
```

Or manually update:

```sql
-- Get MotoPress unit_number from API response
UPDATE accommodation_units_public
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{motopress_unit_id}',
  '"<unit_number>"'
)
WHERE unit_id = '<uuid>' AND tenant_id = 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf';
```

---

## 📊 SUCCESS CRITERIA

After completing this process, you should have:

### Functional Requirements
- ✅ All accommodation units synced from MotoPress
- ✅ All units have stable identifiers (`motopress_unit_id`)
- ✅ All manual files processed with embeddings
- ✅ Guest chat returns correct information
- ✅ Reservations synced from Airbnb + MotoPress
- ✅ ICS feeds configured and active

### Data Integrity
- ✅ Zero orphaned manual chunks
- ✅ All units have `chunk_count > 0`
- ✅ All reservations linked to valid units
- ✅ Zero NULL unit IDs in reservations

### Performance
- ✅ Manual processing completed in <10 minutes
- ✅ Guest chat responds in <2 seconds
- ✅ Health check runs in <10 seconds

---

## 📚 RELATED DOCUMENTATION

- **Architecture**: `docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md`
- **Safe Recreation Process**: `docs/troubleshooting/ACCOMMODATION_RECREATION_SAFE_PROCESS.md`
- **Incident Report**: `docs/troubleshooting/INCIDENT_20251023_MANUAL_EMBEDDINGS_LOST.md`
- **Smart Remap Script**: `docs/guest-chat-id-mapping/fase-3/IMPLEMENTATION.md`
- **Manual Consolidation**: `docs/guest-chat-id-mapping/fase-3/CHANGES.md`

---

## 🔐 SAFETY NOTES

1. **Always backup before deleting** - No exceptions!
2. **Test in staging first** - Never test reset process directly in production
3. **Verify stable IDs exist** - Required for future remapping
4. **Reconfigure ICS feeds** - Critical step, easy to forget
5. **Validate end-to-end** - Don't assume success, test guest chat

**Questions?** Check troubleshooting section or review related documentation.

**Ready to start?** Proceed to PRE-REQUISITES section above.
