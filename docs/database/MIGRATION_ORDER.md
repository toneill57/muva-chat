# Database Migration Order - Production to Staging
**Last Updated:** October 30, 2025
**Source:** Production (ooaumjzaztmutltifhoq)
**Target:** Staging (qlvkgniqcoisbnwwjfte)

---

## Overview

This document defines the **correct order** for migrating data from production to staging, respecting all foreign key dependencies to maintain referential integrity.

**Total Tables:** 41
**Total Foreign Keys:** 49
**Dependency Levels:** 5 (0 = no dependencies → 4 = most dependent)

---

## Migration Strategy

### Phase 1: Clean Staging (Reverse Order)
Truncate tables from **Level 4 → Level 0** to respect FK constraints.

### Phase 2: Copy Data (Forward Order)
Insert data from **Level 0 → Level 4** to satisfy FK requirements.

### Phase 3: Validate Integrity
Verify row counts, FK constraints, and RLS policies.

---

## Dependency Levels

### Level 0 (No FK Dependencies - 8 tables)
**Tables that don't reference other tables:**

1. `tenant_registry` (3 rows) ⭐ **ROOT TABLE - MIGRATE FIRST**
2. `sire_countries` (45 rows)
3. `sire_document_types` (4 rows)
4. `meal_plans`
5. `room_types`
6. `accommodation_types`
7. `sire_content`
8. `sire_cities`

**Migration Order:** Any order within this level is safe.

---

### Level 1 (Depend on Level 0 - 17 tables)
**Tables with direct FK to Level 0 tables:**

1. `staff_users` → tenant_registry
2. `settings` → tenant_registry
3. `accommodations` → tenant_registry
4. `guest_conversations` → tenant_registry
5. `prospective_sessions` → tenant_registry
6. `whatsapp_business_accounts` → tenant_registry
7. `compliance_submissions` → tenant_registry
8. `tenant_compliance_credentials` → tenant_registry
9. `motopress_accommodations` → tenant_registry
10. `airbnb_accommodations` → tenant_registry
11. `muva_content` → sire_countries
12. `airbnb_sync_log` → tenant_registry
13. `motopress_sync_log` → tenant_registry
14. `sync_status_log` → tenant_registry
15. `calendar_events` → tenant_registry
16. `hotels` → tenant_registry
17. `tenant_subdomain_logs` → tenant_registry

**Migration Order:** Any order after Level 0 is complete.

---

### Level 2 (Depend on Level 1 - 7 tables)

1. `user_tenant_permissions` → staff_users, tenant_registry
2. `accommodation_units` → accommodations
3. `chat_messages` → guest_conversations
4. `prospective_messages` → prospective_sessions
5. `whatsapp_phone_numbers` → whatsapp_business_accounts
6. `motopress_accommodation_units` → motopress_accommodations
7. `airbnb_calendar_sync_status` → airbnb_accommodations

**Migration Order:** After Level 1 complete.

---

### Level 3 (Depend on Level 2 - 6 tables)

1. `guest_reservations` → accommodation_units, guest_conversations
2. `whatsapp_messages` → whatsapp_phone_numbers
3. `whatsapp_message_templates` → whatsapp_business_accounts
4. `accommodation_units_manual_chunks` → accommodation_units
5. `motopress_room_types` → motopress_accommodation_units
6. `airbnb_motopress_accommodation_comparison` → accommodations, motopress_accommodations

**Migration Order:** After Level 2 complete.

---

### Level 4 (Most Dependent - 2 tables)

1. `reservation_accommodations` → guest_reservations, accommodation_units
2. `calendar_event_conflicts` → calendar_events, guest_reservations
3. `airbnb_motopress_unit_comparison` → accommodation_units, motopress_accommodation_units

**Migration Order:** LAST - After Level 3 complete.

---

### Special Case: code_embeddings (1 table)
**No FK dependencies** but large dataset (4,333 rows).

- Can be migrated at any level
- ⚠️ **Security Issue:** NO RLS enabled - fix immediately post-migration
- Contains development/code data, not critical business data

---

## Migration Scripts

### Script 1: Clean Staging (Reverse Order)

```sql
-- File: scripts/migrations/staging/001_clean_staging.sql
-- Execute with: pnpm dlx tsx scripts/execute-ddl-via-api.ts

BEGIN;

-- Level 4 (most dependent)
TRUNCATE TABLE calendar_event_conflicts CASCADE;
TRUNCATE TABLE reservation_accommodations CASCADE;
TRUNCATE TABLE airbnb_motopress_unit_comparison CASCADE;

-- Level 3
TRUNCATE TABLE guest_reservations CASCADE;
TRUNCATE TABLE whatsapp_messages CASCADE;
TRUNCATE TABLE whatsapp_message_templates CASCADE;
TRUNCATE TABLE accommodation_units_manual_chunks CASCADE;
TRUNCATE TABLE motopress_room_types CASCADE;
TRUNCATE TABLE airbnb_motopress_accommodation_comparison CASCADE;

-- Level 2
TRUNCATE TABLE user_tenant_permissions CASCADE;
TRUNCATE TABLE accommodation_units CASCADE;
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE prospective_messages CASCADE;
TRUNCATE TABLE whatsapp_phone_numbers CASCADE;
TRUNCATE TABLE motopress_accommodation_units CASCADE;
TRUNCATE TABLE airbnb_calendar_sync_status CASCADE;

-- Level 1
TRUNCATE TABLE staff_users CASCADE;
TRUNCATE TABLE settings CASCADE;
TRUNCATE TABLE accommodations CASCADE;
TRUNCATE TABLE guest_conversations CASCADE;
TRUNCATE TABLE prospective_sessions CASCADE;
TRUNCATE TABLE whatsapp_business_accounts CASCADE;
TRUNCATE TABLE compliance_submissions CASCADE;
TRUNCATE TABLE tenant_compliance_credentials CASCADE;
TRUNCATE TABLE motopress_accommodations CASCADE;
TRUNCATE TABLE airbnb_accommodations CASCADE;
TRUNCATE TABLE muva_content CASCADE;
TRUNCATE TABLE airbnb_sync_log CASCADE;
TRUNCATE TABLE motopress_sync_log CASCADE;
TRUNCATE TABLE sync_status_log CASCADE;
TRUNCATE TABLE calendar_events CASCADE;
TRUNCATE TABLE hotels CASCADE;
TRUNCATE TABLE tenant_subdomain_logs CASCADE;

-- Level 0 (root tables)
TRUNCATE TABLE tenant_registry CASCADE;
TRUNCATE TABLE sire_countries CASCADE;
TRUNCATE TABLE sire_document_types CASCADE;
TRUNCATE TABLE meal_plans CASCADE;
TRUNCATE TABLE room_types CASCADE;
TRUNCATE TABLE accommodation_types CASCADE;
TRUNCATE TABLE sire_content CASCADE;
TRUNCATE TABLE sire_cities CASCADE;

-- Special case
TRUNCATE TABLE code_embeddings CASCADE;

COMMIT;

-- Validate empty
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0
ORDER BY n_live_tup DESC;
-- Should return 0 rows
```

---

### Script 2: Copy Data (Forward Order)

```typescript
// File: scripts/migrations/staging/002_copy_data.ts
// Execute with: pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts

import { createClient } from '@supabase/supabase-js'

const PROD_URL = 'https://ooaumjzaztmutltifhoq.supabase.co'
const STAGING_URL = 'https://qlvkgniqcoisbnwwjfte.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const prodClient = createClient(PROD_URL, SERVICE_KEY)
const stagingClient = createClient(STAGING_URL, SERVICE_KEY)

const MIGRATION_ORDER = [
  // Level 0
  'tenant_registry',
  'sire_countries',
  'sire_document_types',
  'meal_plans',
  'room_types',
  'accommodation_types',
  'sire_content',
  'sire_cities',

  // Level 1
  'staff_users',
  'settings',
  'accommodations',
  'guest_conversations',
  'prospective_sessions',
  'whatsapp_business_accounts',
  'compliance_submissions',
  'tenant_compliance_credentials',
  'motopress_accommodations',
  'airbnb_accommodations',
  'muva_content',
  'airbnb_sync_log',
  'motopress_sync_log',
  'sync_status_log',
  'calendar_events',
  'hotels',
  'tenant_subdomain_logs',

  // Level 2
  'user_tenant_permissions',
  'accommodation_units',
  'chat_messages',
  'prospective_messages',
  'whatsapp_phone_numbers',
  'motopress_accommodation_units',
  'airbnb_calendar_sync_status',

  // Level 3
  'guest_reservations',
  'whatsapp_messages',
  'whatsapp_message_templates',
  'accommodation_units_manual_chunks',
  'motopress_room_types',
  'airbnb_motopress_accommodation_comparison',

  // Level 4
  'reservation_accommodations',
  'calendar_event_conflicts',
  'airbnb_motopress_unit_comparison',

  // Special case
  'code_embeddings',
]

async function copyTable(tableName: string) {
  console.log(`📋 Copying ${tableName}...`)

  // Fetch all data from production
  const { data, error } = await prodClient
    .from(tableName)
    .select('*')

  if (error) {
    console.error(`❌ Error reading ${tableName}:`, error)
    throw error
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  ${tableName} has no data to copy`)
    return 0
  }

  // Insert into staging (batch by 1000 for performance)
  const BATCH_SIZE = 1000
  let totalInserted = 0

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)

    const { error: insertError } = await stagingClient
      .from(tableName)
      .insert(batch)

    if (insertError) {
      console.error(`❌ Error inserting into ${tableName}:`, insertError)
      throw insertError
    }

    totalInserted += batch.length
    console.log(`  ✅ Inserted ${totalInserted}/${data.length} rows`)
  }

  return totalInserted
}

async function validateCounts() {
  console.log('\n📊 Validating row counts...\n')

  const results = []

  for (const table of MIGRATION_ORDER) {
    const { count: prodCount } = await prodClient
      .from(table)
      .select('*', { count: 'exact', head: true })

    const { count: stagingCount } = await stagingClient
      .from(table)
      .select('*', { count: 'exact', head: true })

    const match = prodCount === stagingCount
    const status = match ? '✅' : '❌'

    results.push({ table, prodCount, stagingCount, match })
    console.log(`${status} ${table}: ${stagingCount}/${prodCount}`)
  }

  const allMatch = results.every(r => r.match)

  if (allMatch) {
    console.log('\n✅ All row counts match! Migration successful.')
  } else {
    console.error('\n❌ Row count mismatches detected!')
    const mismatches = results.filter(r => !r.match)
    console.table(mismatches)
  }

  return allMatch
}

async function main() {
  console.log('🚀 Starting migration: Production → Staging\n')

  const startTime = Date.now()

  for (const table of MIGRATION_ORDER) {
    try {
      await copyTable(table)
    } catch (error) {
      console.error(`\n❌ Migration failed at table: ${table}`)
      console.error(error)
      process.exit(1)
    }
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2)
  console.log(`\n✅ Data copy complete in ${duration} minutes`)

  // Validate
  const valid = await validateCounts()

  if (!valid) {
    console.error('\n❌ Validation failed - check mismatches above')
    process.exit(1)
  }

  console.log('\n🎉 Migration completed successfully!')
}

main()
```

---

### Script 3: Validation Queries

```sql
-- File: scripts/migrations/staging/003_validate.sql

-- 1. Check all row counts match
SELECT
  'Production' as env,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Run same query on staging and compare

-- 2. Validate FK constraints (should be 0 violations)
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND connamespace = 'public'::regnamespace
  AND NOT EXISTS (
    -- Check if any FK violations exist
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = conname
  );

-- 3. Validate RLS policies exist
SELECT
  tablename,
  rowsecurity as rls_enabled,
  COUNT(*) FILTER (WHERE policyname IS NOT NULL) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
GROUP BY tablename, rowsecurity
ORDER BY rls_enabled, tablename;

-- 4. Check for orphaned records (should be 0)
-- Example: staff_users referencing non-existent tenants
SELECT
  su.id,
  su.email,
  su.tenant_id
FROM staff_users su
LEFT JOIN tenant_registry tr ON tr.id = su.tenant_id
WHERE tr.id IS NULL;

-- Repeat for all FK relationships

-- 5. Validate unique constraints
SELECT
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename;
```

---

## Critical Migration Rules

### ✅ DO:
1. **Preserve UUIDs** - Use exact IDs from production
2. **Respect order** - Follow dependency levels strictly
3. **Use service_role** - Bypass RLS during migration
4. **Batch inserts** - 1000 rows at a time for performance
5. **Validate checksums** - Compare row counts after each level
6. **Test rollback** - Ensure TRUNCATE CASCADE works
7. **Disable triggers** - If they interfere (e.g., updated_at)
8. **Log progress** - Console output for debugging

### ❌ DON'T:
1. **Generate new UUIDs** - Breaks FK relationships
2. **Skip validation** - Silent data corruption risk
3. **Ignore errors** - Stop immediately on FK violation
4. **Mix order** - Never insert Level 3 before Level 2
5. **Forget CASCADE** - TRUNCATE must cascade to dependent tables
6. **Trust assumptions** - Always verify with queries
7. **Modify data** - Copy exact values (except PII anonymization if needed)
8. **Skip RLS fixes** - Enable RLS on code_embeddings immediately

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Clean staging | 5-10 min | TRUNCATE CASCADE is fast |
| Copy Level 0 | 5 min | Small tables (3-45 rows) |
| Copy Level 1 | 15-20 min | Larger tables (muva_content 742 rows) |
| Copy Level 2 | 10-15 min | chat_messages 319 rows |
| Copy Level 3 | 20-30 min | prospective_sessions 412 rows |
| Copy Level 4 | 5-10 min | Junction tables (small) |
| Copy code_embeddings | 30-45 min | 4,333 rows with vectors (74MB) |
| Validation | 10-15 min | Row counts + FK integrity |
| **Total** | **1.5-2.5 hours** | Conservative estimate |

---

## Post-Migration Checklist

### Immediate (Before Leaving)
- [ ] All row counts match production
- [ ] Zero FK violations detected
- [ ] RLS enabled on 40/41 tables (code_embeddings pending fix)
- [ ] Triggers are active (updated_at working)
- [ ] Indexes created (including HNSW for vectors)

### Within 24 Hours
- [ ] Enable RLS on `code_embeddings`
- [ ] Test staff authentication works
- [ ] Test guest reservations lookup works
- [ ] Verify vector search returns results
- [ ] Check Motopress/Airbnb sync status

### Within 1 Week
- [ ] Fix 15 functions with mutable search_path
- [ ] Recreate SECURITY DEFINER view
- [ ] Address critical performance advisors (missing FK indexes)
- [ ] Run full regression test suite

---

## Rollback Strategy

If migration fails:

```sql
-- Quick rollback: Just re-run clean script
BEGIN;
  -- Execute 001_clean_staging.sql again
COMMIT;

-- Staging is now empty, safe to retry migration
```

**No risk to production** - This is one-way copy, production is never modified.

---

## Next Steps

After successful migration:
1. Read [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md) for security remediations
2. Review [RLS_POLICIES.md](./RLS_POLICIES.md) for policy coverage
3. Proceed to **PHASE 2: REMEDIATION** (documented in ADVISORS_ANALYSIS.md)

---

**Maintainers:** MUVA Engineering Team
**Contact:** Database issues → `@agent-database-agent`
