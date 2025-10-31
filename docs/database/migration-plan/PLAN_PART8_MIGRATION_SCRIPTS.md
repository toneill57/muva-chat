# PLAN PART 8: MIGRATION SCRIPTS VALIDATION & IMPROVEMENT

**Purpose:** Validate and improve existing migration scripts based on validated dependency tree
**Duration:** 2-3 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2 (dependency tree validated) complete
**Output:** Improved migration scripts + `docs/database/MIGRATION_SCRIPTS.md` (~500-700 lines)

---

## OBJECTIVE

Review and improve the 3 existing migration scripts based on the validated dependency tree from PART2, and create a 4th rollback script.

**Existing Scripts to Review:**
1. `scripts/migrations/staging/001_clean_staging.sql` - TRUNCATE tables in safe order
2. `scripts/migrations/staging/002_copy_data.ts` - Copy data in dependency order
3. `scripts/migrations/staging/003_validate.sql` - Validate migration success

**New Script to Create:**
4. `scripts/migrations/staging/004_rollback.sql` - Rollback procedure if migration fails

---

## TASKS FOR @agent-database-agent

### TASK 8.1: Review 001_clean_staging.sql (45 min)

**Current Script Location:** `scripts/migrations/staging/001_clean_staging.sql`

**Purpose:** TRUNCATE all tables in staging database in safe order (reverse dependency levels)

**Review Checklist:**

#### ✅ A) Verify TRUNCATE Order Matches Validated Dependency Tree

**Expected Order:** Level 4 → Level 3 → Level 2 → Level 1 → Level 0

**Query to Get Current Script Order:**
```bash
# Extract table names from TRUNCATE statements
grep -E "^TRUNCATE TABLE" scripts/migrations/staging/001_clean_staging.sql | \
  sed 's/TRUNCATE TABLE //' | sed 's/ CASCADE;$//'
```

**Compare with validated dependency tree from PART2:**
```
_DEPENDENCY_TREE.json → migration_order.truncate
```

**Action:**
- [ ] List all TRUNCATE statements in script
- [ ] Compare order with validated tree
- [ ] Flag any tables in wrong order
- [ ] Flag any tables missing from script
- [ ] Flag any extra tables in script (no longer exist)

#### ✅ B) Verify CASCADE Usage is Safe

**CASCADE Effect:**
```sql
TRUNCATE TABLE parent_table CASCADE;
-- Automatically truncates all child tables (those with FKs to parent)
```

**Risks:**
- May truncate more tables than intended
- May hide incorrect ordering (CASCADE does the work)

**Review Strategy:**
1. For each `TRUNCATE TABLE ... CASCADE`:
   - List all tables it will CASCADE to (from FK relationships)
   - Verify those child tables are truncated BEFORE parent (explicitly or via CASCADE)
   - If child is already truncated explicitly, CASCADE is redundant

**Query to Find CASCADE Effects:**
```sql
-- For a given parent table, find all child tables
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = '[PARENT_TABLE]'
  AND tc.table_schema = 'public';
```

**Action:**
- [ ] For each CASCADE, document which tables it affects
- [ ] Determine if CASCADE is necessary or if explicit ordering is sufficient
- [ ] Recommend removing CASCADE if redundant (clearer intent)

#### ✅ C) Add Comments Explaining Order

**Current State:** Script likely has minimal comments

**Improvement:**
```sql
-- ============================================
-- CLEAN STAGING DATABASE
-- ============================================
-- Purpose: Truncate all tables in safe order (no FK violations)
-- Strategy: Delete children before parents (reverse dependency levels)
-- Reference: See docs/database/MIGRATION_ORDER.md for dependency tree
--
-- IMPORTANT: Do NOT change order without consulting dependency tree
-- ============================================

-- ============================================
-- LEVEL 4 TABLES (Deepest dependencies)
-- ============================================
-- These tables have FKs to Level 3 tables, so must be truncated first

TRUNCATE TABLE reservation_accommodations CASCADE;
-- Dependencies: guest_reservations (L3), accommodations (L2)

TRUNCATE TABLE chat_messages CASCADE;
-- Dependencies: guest_conversations (L3)

-- [... continue for all Level 4 tables ...]

-- ============================================
-- LEVEL 3 TABLES
-- ============================================
-- These tables have FKs to Level 2 tables

TRUNCATE TABLE accommodation_units CASCADE;
-- Dependencies: accommodations (L2)

TRUNCATE TABLE guest_reservations CASCADE;
-- Dependencies: accommodations (L2), guests (L2)

-- [... continue for all Level 3 tables ...]

-- ============================================
-- LEVEL 2 TABLES
-- ============================================
-- These tables have FKs to Level 1 tables

TRUNCATE TABLE accommodations CASCADE;
-- Dependencies: tenant_registry (L0)

-- [... continue for all Level 2 tables ...]

-- ============================================
-- LEVEL 1 TABLES
-- ============================================
-- These tables have FKs to Level 0 tables

TRUNCATE TABLE staff_users CASCADE;
-- Dependencies: tenant_registry (L0)
-- Note: Self-referencing FK (manager_id) - CASCADE handles this

-- [... continue for all Level 1 tables ...]

-- ============================================
-- LEVEL 0 TABLES (Root tables - no FKs)
-- ============================================
-- These tables have no dependencies, truncate last

TRUNCATE TABLE tenant_registry CASCADE;
-- No dependencies (root table)

TRUNCATE TABLE sire_countries CASCADE;
-- No dependencies (root table)

TRUNCATE TABLE sire_document_types CASCADE;
-- No dependencies (root table)

-- ============================================
-- VERIFY CLEANUP
-- ============================================

SELECT
  schemaname,
  tablename,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY row_count DESC;

-- Expected: All tables should have row_count = 0
```

**Action:**
- [ ] Add header comment with purpose and strategy
- [ ] Group tables by dependency level (add level headers)
- [ ] Add inline comment for each table (list dependencies)
- [ ] Add footer query to verify cleanup success

---

### TASK 8.2: Review 002_copy_data.ts (1 hour)

**Current Script Location:** `scripts/migrations/staging/002_copy_data.ts`

**Purpose:** Copy data from production to staging in dependency order (forward: Level 0 → Level 4)

**Review Checklist:**

#### ✅ A) Verify INSERT Order Matches Validated Dependency Tree

**Expected Order:** Level 0 → Level 1 → Level 2 → Level 3 → Level 4

**Extract Current Order from Script:**
```typescript
// Find all copyTable() calls
const tableOrder = [
  'tenant_registry',  // Level 0
  'staff_users',      // Level 1
  'accommodations',   // Level 2
  // ... etc
];
```

**Compare with validated tree:**
```
_DEPENDENCY_TREE.json → migration_order.insert
```

**Action:**
- [ ] List all `copyTable()` calls in script
- [ ] Compare order with validated tree
- [ ] Flag any tables in wrong order (will cause FK violations)
- [ ] Flag any missing tables
- [ ] Flag any extra tables (no longer exist)

#### ✅ B) Test Batching Logic

**Current Batching:**
```typescript
const BATCH_SIZE = 1000; // rows per batch
```

**Review:**
1. **Is batch size appropriate?**
   - Standard tables: 1000 rows ✅
   - Embeddings tables: 500 rows (large vectors) ✅
   - Large tables (>10k rows): May need progress logging

2. **Does batching preserve FK integrity?**
   - Batch must not split related records (parent inserted before child)
   - Within same table, order doesn't matter (PKs are UUIDs, not sequential)

3. **Error handling in batches:**
   - If batch 5/10 fails, can we resume from batch 6?
   - Current: Likely transaction rolls back entire table

**Action:**
- [ ] Verify batch size is appropriate for all tables
- [ ] Check if embeddings tables use smaller batch size
- [ ] Review error handling (transaction scope)
- [ ] Recommend resumable batching for large tables

#### ✅ C) Add Special Handling for Self-Referencing Tables

**Problem:** Tables with self-referencing FKs (e.g., `staff_users.manager_id → staff_users.id`)

**Current Approach:** Likely inserts with NULL, then updates

**Recommended Approach:**

```typescript
async function copyTableWithSelfReferences(
  tableName: string,
  selfRefColumns: string[]
) {
  console.log(`📋 Copying ${tableName} (self-referencing: ${selfRefColumns.join(', ')})...`);

  // Step 1: Copy all rows with self-ref columns set to NULL
  const { data: sourceData, error: fetchError } = await prodSupabase
    .from(tableName)
    .select('*');

  if (fetchError) throw fetchError;

  // Map to store original self-ref values
  const selfRefMap = new Map();

  const dataToInsert = sourceData.map(row => {
    const modifiedRow = { ...row };

    // Store original self-ref values and set to NULL for insert
    selfRefColumns.forEach(col => {
      if (row[col] !== null) {
        selfRefMap.set(row.id, { ...selfRefMap.get(row.id), [col]: row[col] });
        modifiedRow[col] = null;
      }
    });

    return modifiedRow;
  });

  // Step 2: Insert with NULLs
  const { error: insertError } = await stagingSupabase
    .from(tableName)
    .insert(dataToInsert);

  if (insertError) throw insertError;

  // Step 3: Update self-references
  console.log(`  🔄 Updating self-references for ${selfRefMap.size} rows...`);

  for (const [id, refValues] of selfRefMap.entries()) {
    const { error: updateError } = await stagingSupabase
      .from(tableName)
      .update(refValues)
      .eq('id', id);

    if (updateError) throw updateError;
  }

  console.log(`  ✅ ${tableName}: ${sourceData.length} rows copied`);
}

// Usage
await copyTableWithSelfReferences('staff_users', ['manager_id']);
```

**Action:**
- [ ] Identify all self-referencing tables from PART2
- [ ] Add special handling function for self-references
- [ ] Update migration script to use special function for these tables
- [ ] Test with sample data (manager hierarchy)

#### ✅ D) Add Special Handling for Nullable FKs

**Problem:** Tables with nullable FKs can be inserted before referenced table exists

**Example:**
```typescript
// accommodation_units.parent_unit_id is nullable
// Can insert units first, then update parent_unit_id later
```

**Optimization:**
- Insert rows with NULL FKs first (satisfies dependencies)
- Update FKs after all rows inserted (more efficient than order constraints)

**Action:**
- [ ] Identify nullable FK columns from PART2
- [ ] Document which tables can leverage this optimization
- [ ] Implement if significant performance gain (likely minimal, not critical)

#### ✅ E) Add Progress Reporting

**Current:** Likely logs only table-level progress

**Improvement:**
```typescript
async function copyTableWithProgress(
  tableName: string,
  batchSize: number = 1000
) {
  console.log(`📋 Copying ${tableName}...`);

  // Get total row count
  const { count: totalRows } = await prodSupabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`  Total rows: ${totalRows}`);

  let copiedRows = 0;
  const totalBatches = Math.ceil(totalRows / batchSize);

  for (let batch = 0; batch < totalBatches; batch++) {
    const offset = batch * batchSize;

    // Fetch batch
    const { data, error: fetchError } = await prodSupabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (fetchError) throw fetchError;

    // Insert batch
    const { error: insertError } = await stagingSupabase
      .from(tableName)
      .insert(data);

    if (insertError) {
      console.error(`  ❌ Error at batch ${batch + 1}/${totalBatches}:`, insertError);
      throw insertError;
    }

    copiedRows += data.length;
    const progress = Math.round((copiedRows / totalRows) * 100);

    console.log(`  Progress: ${copiedRows}/${totalRows} (${progress}%) [Batch ${batch + 1}/${totalBatches}]`);
  }

  console.log(`  ✅ ${tableName}: ${copiedRows} rows copied`);
}
```

**Action:**
- [ ] Add progress reporting for all tables
- [ ] Show batch progress for tables >1000 rows
- [ ] Log estimated time remaining (optional)

#### ✅ F) Add Error Recovery (Resume from Failure)

**Problem:** If migration fails at table 20/41, must restart from beginning

**Solution:** Track completed tables, allow resume

```typescript
const PROGRESS_FILE = 'migration-progress.json';

interface MigrationProgress {
  completed: string[];
  failed: string | null;
  timestamp: string;
}

function loadProgress(): MigrationProgress {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return { completed: [], failed: null, timestamp: new Date().toISOString() };
}

function saveProgress(progress: MigrationProgress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function migrateWithRecovery(tables: string[]) {
  const progress = loadProgress();

  console.log(`📊 Migration progress: ${progress.completed.length}/${tables.length} tables completed`);

  if (progress.failed) {
    console.log(`⚠️  Previous migration failed at: ${progress.failed}`);
    console.log(`🔄 Resuming from failed table...`);
  }

  for (const table of tables) {
    // Skip already completed tables
    if (progress.completed.includes(table)) {
      console.log(`⏭️  Skipping ${table} (already completed)`);
      continue;
    }

    try {
      await copyTable(table);

      // Mark as completed
      progress.completed.push(table);
      progress.failed = null;
      saveProgress(progress);

    } catch (error) {
      console.error(`❌ Failed to copy ${table}:`, error);

      // Save failure state
      progress.failed = table;
      saveProgress(progress);

      throw error; // Stop migration
    }
  }

  // Migration complete, delete progress file
  fs.unlinkSync(PROGRESS_FILE);
  console.log(`🎉 Migration complete! All ${tables.length} tables copied.`);
}
```

**Action:**
- [ ] Add progress tracking to migration script
- [ ] Allow resume from last successful table
- [ ] Save progress after each table completion
- [ ] Add `--resume` flag to CLI

---

### TASK 8.3: Review 003_validate.sql (30 min)

**Current Script Location:** `scripts/migrations/staging/003_validate.sql`

**Purpose:** Validate migration success (row counts, FK integrity, RLS, data sampling)

**Review Checklist:**

#### ✅ A) Add Row Count Comparisons (Prod vs Staging)

**Current:** Likely just row counts per table

**Improvement:**
```sql
-- ============================================
-- VALIDATION: ROW COUNT COMPARISON
-- ============================================
-- Compare production vs staging row counts
-- Expected: All tables should match exactly

WITH prod_counts AS (
  SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count
  FROM dblink(
    'host=[PROD_HOST] dbname=[PROD_DB] user=[PROD_USER] password=[PROD_PASS]',
    'SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = ''public'''
  ) AS t(schemaname text, relname text, n_live_tup bigint)
),
staging_counts AS (
  SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
)
SELECT
  COALESCE(p.table_name, s.table_name) AS table_name,
  p.row_count AS prod_rows,
  s.row_count AS staging_rows,
  CASE
    WHEN p.row_count = s.row_count THEN '✅ MATCH'
    WHEN p.row_count IS NULL THEN '⚠️ MISSING IN PROD'
    WHEN s.row_count IS NULL THEN '⚠️ MISSING IN STAGING'
    ELSE '❌ MISMATCH'
  END AS status,
  ABS(COALESCE(p.row_count, 0) - COALESCE(s.row_count, 0)) AS diff
FROM prod_counts p
FULL OUTER JOIN staging_counts s ON p.table_name = s.table_name
ORDER BY status DESC, diff DESC, table_name;

-- Expected: All tables show '✅ MATCH'
```

**Alternative (if dblink not available):**
```sql
-- Use _ROW_COUNTS.json from PART1 for comparison
-- Manual verification:
-- 1. Run query in prod: SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public';
-- 2. Run query in staging: SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public';
-- 3. Compare results manually or via script
```

**Action:**
- [ ] Add row count comparison query (prod vs staging)
- [ ] Use dblink if available, otherwise manual comparison
- [ ] Flag tables with mismatched counts (critical error)

#### ✅ B) Add FK Integrity Checks

**Current:** Likely not validated

**Improvement:**
```sql
-- ============================================
-- VALIDATION: FOREIGN KEY INTEGRITY
-- ============================================
-- Verify all FKs point to existing records
-- Expected: Zero FK violations

DO $$
DECLARE
  fk_record RECORD;
  violation_count INTEGER;
  total_violations INTEGER := 0;
BEGIN
  FOR fk_record IN
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table,
      ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    -- Check for FK violations
    EXECUTE format(
      'SELECT COUNT(*) FROM %I t
       WHERE %I IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM %I f
           WHERE f.%I = t.%I
         )',
      fk_record.table_name,
      fk_record.column_name,
      fk_record.foreign_table,
      fk_record.foreign_column,
      fk_record.column_name
    ) INTO violation_count;

    IF violation_count > 0 THEN
      RAISE WARNING '❌ FK Violation: %.% → %.% (%s orphaned rows)',
        fk_record.table_name,
        fk_record.column_name,
        fk_record.foreign_table,
        fk_record.foreign_column,
        violation_count;

      total_violations := total_violations + violation_count;
    END IF;
  END LOOP;

  IF total_violations = 0 THEN
    RAISE NOTICE '✅ All foreign keys valid (0 violations)';
  ELSE
    RAISE EXCEPTION '❌ Foreign key validation failed: % total violations', total_violations;
  END IF;
END $$;
```

**Action:**
- [ ] Add FK integrity check for all FKs
- [ ] Report any orphaned rows (FK points to non-existent record)
- [ ] Fail validation if any FK violations found

#### ✅ C) Add RLS Verification Queries

**Current:** Likely not checked

**Improvement:**
```sql
-- ============================================
-- VALIDATION: RLS ENABLED
-- ============================================
-- Verify RLS is enabled on all tables (except code_embeddings)
-- Expected: 40/41 tables have RLS enabled

SELECT
  tablename,
  rowsecurity AS rls_enabled,
  CASE
    WHEN tablename = 'code_embeddings' AND rowsecurity = false THEN '⚠️ KNOWN ISSUE (will fix)'
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ MISSING RLS'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- Count tables by RLS status
SELECT
  CASE
    WHEN rowsecurity = true THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END AS status,
  COUNT(*) AS table_count
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY rowsecurity;

-- Expected:
-- RLS Enabled: 40 tables
-- RLS Disabled: 1 table (code_embeddings)
```

**Action:**
- [ ] Add RLS status check for all tables
- [ ] Flag tables missing RLS (except code_embeddings)
- [ ] Verify code_embeddings RLS is fixed (if migration script adds it)

#### ✅ D) Add Data Sampling Comparisons

**Current:** Likely not validated

**Improvement:**
```sql
-- ============================================
-- VALIDATION: DATA SAMPLING
-- ============================================
-- Spot-check sample data to verify content integrity
-- Expected: Sample records match between prod and staging

-- Sample 1: Check tenant registry
SELECT 'tenant_registry' AS table_name,
       COUNT(*) AS total_rows,
       COUNT(DISTINCT tenant_slug) AS unique_slugs,
       STRING_AGG(tenant_slug, ', ' ORDER BY tenant_slug) AS slugs
FROM tenant_registry;

-- Expected: 3 tenants (simmerdown, tucasamar, loscedrosboutique)

-- Sample 2: Check accommodation units
SELECT 'accommodation_units' AS table_name,
       COUNT(*) AS total_rows,
       COUNT(DISTINCT accommodation_id) AS unique_properties,
       COUNT(DISTINCT tenant_id) AS unique_tenants
FROM accommodation_units;

-- Expected: Row count matches prod, multiple tenants represented

-- Sample 3: Check embeddings integrity
SELECT 'code_embeddings' AS table_name,
       COUNT(*) AS total_rows,
       COUNT(embedding_3072) AS has_3072,
       COUNT(embedding_1536) AS has_1536,
       COUNT(embedding_1024) AS has_1024
FROM code_embeddings;

-- Expected: All embedding columns populated (counts equal total_rows)

-- Sample 4: Check vector search works
SELECT
  id,
  file_path,
  1 - (embedding_1536 <=> (
    SELECT embedding_1536 FROM code_embeddings LIMIT 1
  )) AS similarity
FROM code_embeddings
ORDER BY embedding_1536 <=> (SELECT embedding_1536 FROM code_embeddings LIMIT 1)
LIMIT 5;

-- Expected: Returns 5 rows with similarity scores (0.0-1.0)
```

**Action:**
- [ ] Add 5-10 data sampling queries
- [ ] Verify critical fields are populated (embeddings, dates, UUIDs)
- [ ] Test key features work (vector search, FK traversal)

---

### TASK 8.4: Create 004_rollback.sql (45 min)

**New Script:** `scripts/migrations/staging/004_rollback.sql`

**Purpose:** Safe rollback procedure if migration fails or needs to be reverted

**Script Content:**

```sql
-- ============================================
-- ROLLBACK STAGING MIGRATION
-- ============================================
-- Purpose: Safely rollback migration if needed
-- Use Case: Migration failed, need to restore clean state
--
-- WARNING: This will DELETE ALL DATA in staging database
--
-- Before running:
-- 1. Ensure backup exists (run before migration)
-- 2. Confirm this is the correct database (staging, not prod!)
-- 3. Get approval from team lead
-- ============================================

-- Safety check: Verify this is staging database
DO $$
BEGIN
  IF current_database() <> '[STAGING_DB_NAME]' THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: This script can only run on staging database. Current database: %', current_database();
  END IF;

  RAISE NOTICE '✅ Safety check passed: Running on staging database';
END $$;

-- ============================================
-- OPTION 1: TRUNCATE ALL TABLES (Fast, no structure change)
-- ============================================
-- Use this if schema is correct, just need to clear data

DO $$
DECLARE
  table_record RECORD;
BEGIN
  RAISE NOTICE '🗑️  Truncating all tables...';

  -- Disable triggers temporarily (speeds up truncate)
  SET session_replication_role = 'replica';

  -- Truncate all tables in reverse dependency order
  FOR table_record IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename DESC  -- Simplified: CASCADE handles dependencies
  LOOP
    EXECUTE format('TRUNCATE TABLE %I CASCADE', table_record.tablename);
    RAISE NOTICE '  ✅ Truncated: %', table_record.tablename;
  END LOOP;

  -- Re-enable triggers
  SET session_replication_role = 'origin';

  RAISE NOTICE '🎉 All tables truncated successfully';
END $$;

-- ============================================
-- OPTION 2: DROP AND RECREATE SCHEMA (Nuclear, full reset)
-- ============================================
-- Use this if schema needs to be restored from scratch
-- Requires re-running migrations to rebuild structure

-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
--
-- RAISE NOTICE '⚠️  Schema dropped and recreated. Run migrations to rebuild.';

-- ============================================
-- OPTION 3: RESTORE FROM BACKUP (Safest)
-- ============================================
-- Use this if backup exists and you want exact state restoration

-- Step 1: Create backup (BEFORE migration)
-- pg_dump -h [STAGING_HOST] -U [USER] -d [STAGING_DB] -F c -b -v -f staging_backup_$(date +%Y%m%d_%H%M%S).dump

-- Step 2: Restore from backup (if rollback needed)
-- pg_restore -h [STAGING_HOST] -U [USER] -d [STAGING_DB] -c -v staging_backup_YYYYMMDD_HHMMSS.dump

-- ============================================
-- VERIFICATION AFTER ROLLBACK
-- ============================================

-- Verify all tables are empty
SELECT
  tablename,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY row_count DESC;

-- Expected: All tables have row_count = 0

-- Verify schema integrity (tables, indexes, constraints exist)
SELECT
  'Tables' AS object_type,
  COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Indexes',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Foreign Keys',
  COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
UNION ALL
SELECT
  'RLS Policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public';

-- Expected counts should match pre-migration state
-- Tables: 41
-- Indexes: ~225
-- Foreign Keys: ~49
-- RLS Policies: ~134

-- ============================================
-- POST-ROLLBACK ACTIONS
-- ============================================
-- After successful rollback:
-- 1. ✅ Verify staging is clean (all tables empty)
-- 2. ✅ Analyze migration failure (what went wrong?)
-- 3. ✅ Fix migration scripts (002_copy_data.ts, 001_clean_staging.sql)
-- 4. ✅ Re-run migration from beginning (001 → 002 → 003)
-- 5. ✅ Update DOCUMENTATION_PROGRESS.md with rollback notes
-- ============================================
```

**Action:**
- [ ] Create 004_rollback.sql script
- [ ] Add safety checks (verify staging database)
- [ ] Provide 3 rollback options (truncate, drop schema, restore backup)
- [ ] Add verification queries
- [ ] Document post-rollback actions

---

## OUTPUT FILE: `docs/database/MIGRATION_SCRIPTS.md`

**Structure:**

```markdown
# MIGRATION SCRIPTS DOCUMENTATION

**Purpose:** Document and validate migration scripts for staging database
**Scripts:** 4 (clean, copy, validate, rollback)
**Last Validated:** [DATE] against dependency tree from PART2
**Migration Duration:** ~1.5-2.5 hours (estimated)

---

## Overview

Migration scripts copy production data to staging database in safe dependency order.

**Script Sequence:**
1. `001_clean_staging.sql` - TRUNCATE all tables (15 min)
2. `002_copy_data.ts` - Copy data (1-2 hours)
3. `003_validate.sql` - Validate migration (30 min)
4. `004_rollback.sql` - Rollback if needed (emergency)

**Key Principles:**
- **Safe Ordering:** Respect FK dependencies (children before parents on truncate, reverse on insert)
- **Batch Processing:** 1000 rows per batch (500 for embeddings)
- **Progress Tracking:** Log every table, allow resume on failure
- **Validation:** Verify row counts, FK integrity, RLS, sample data

---

## Script 1: 001_clean_staging.sql

**Purpose:** TRUNCATE all tables in staging database
**Duration:** ~15 minutes
**Order:** Reverse dependency (Level 4 → 0)
**Safety:** Uses CASCADE, but with explicit ordering

### Improvements Made (PART8)

✅ **Verified TRUNCATE order matches validated dependency tree**
- Compared script order with `_DEPENDENCY_TREE.json`
- Corrected [X] tables to match dependency levels
- All tables now truncated in safe order

✅ **Documented CASCADE usage**
- CASCADE affects [X] child tables automatically
- Made explicit ordering where CASCADE is redundant
- Added comments explaining CASCADE effects

✅ **Added detailed comments**
- Level headers (Level 4, Level 3, etc.)
- Inline comments for each table (list dependencies)
- Verification query at end

### Script Location
`scripts/migrations/staging/001_clean_staging.sql`

### Usage
```bash
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/001_clean_staging.sql
```

### Expected Output
```
TRUNCATE TABLE reservation_accommodations CASCADE
TRUNCATE TABLE chat_messages CASCADE
...
All tables truncated successfully
```

---

## Script 2: 002_copy_data.ts

**Purpose:** Copy data from production to staging
**Duration:** ~1-2 hours (depends on data volume)
**Order:** Forward dependency (Level 0 → 4)
**Safety:** Respects FKs, handles self-references

### Improvements Made (PART8)

✅ **Verified INSERT order matches validated dependency tree**
- Compared script order with `_DEPENDENCY_TREE.json`
- Corrected [X] tables to match dependency levels
- All tables now copied in safe order

✅ **Added special handling for self-referencing tables**
- `staff_users.manager_id` now handled (insert with NULL, then update)
- Function: `copyTableWithSelfReferences()`
- Prevents FK violations during insert

✅ **Optimized batching**
- Standard tables: 1000 rows per batch
- Embeddings tables: 500 rows per batch (large vectors)
- Large tables (>10k): Progress logging every 1000 rows

✅ **Added progress reporting**
- Shows batch progress: "Progress: 5000/10000 (50%) [Batch 5/10]"
- Logs estimated time remaining (optional)
- Helps monitor long-running migration

✅ **Added error recovery (resume from failure)**
- Saves progress after each table: `migration-progress.json`
- Resume flag: `pnpm dlx tsx 002_copy_data.ts --resume`
- Skips already-completed tables

### Script Location
`scripts/migrations/staging/002_copy_data.ts`

### Usage
```bash
# Full migration (from scratch)
pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts

# Resume from failure
pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts --resume
```

### Expected Output
```
📋 Copying tenant_registry...
  Total rows: 3
  Progress: 3/3 (100%) [Batch 1/1]
  ✅ tenant_registry: 3 rows copied

📋 Copying staff_users (self-referencing: manager_id)...
  Total rows: 6
  🔄 Updating self-references for 2 rows...
  ✅ staff_users: 6 rows copied

...

🎉 Migration complete! All 41 tables copied.
Total time: 1h 45m
```

---

## Script 3: 003_validate.sql

**Purpose:** Validate migration success
**Duration:** ~30 minutes
**Checks:** Row counts, FK integrity, RLS, sample data

### Improvements Made (PART8)

✅ **Added row count comparison (prod vs staging)**
- Uses dblink to query production
- Compares row counts for all tables
- Flags mismatches as critical errors

✅ **Added FK integrity checks**
- Validates all 49 foreign keys
- Detects orphaned rows (FK points to non-existent record)
- Fails validation if any violations found

✅ **Added RLS verification**
- Checks RLS enabled on 40/41 tables
- Flags code_embeddings (known issue)
- Verifies policy count matches expected (134)

✅ **Added data sampling**
- Spot-checks 10 sample queries
- Verifies critical fields populated (embeddings, dates, UUIDs)
- Tests key features (vector search, FK traversal)

### Script Location
`scripts/migrations/staging/003_validate.sql`

### Usage
```bash
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/003_validate.sql
```

### Expected Output
```
✅ Row Count Comparison: All 41 tables match
✅ FK Integrity: 0 violations across 49 foreign keys
✅ RLS Status: 40/41 tables have RLS enabled (code_embeddings: known issue)
✅ Data Sampling: All 10 sample queries passed
🎉 Migration validation complete!
```

---

## Script 4: 004_rollback.sql (NEW)

**Purpose:** Rollback migration if needed
**Duration:** ~15 minutes
**Use Case:** Migration failed, need clean state

### Rollback Options

**Option 1: TRUNCATE ALL TABLES (Fast)**
- Clears data, keeps schema intact
- Use if structure is correct, just need to clear data
- Duration: ~15 minutes

**Option 2: DROP AND RECREATE SCHEMA (Nuclear)**
- Destroys and rebuilds schema from scratch
- Use if schema needs full reset
- Requires re-running migrations
- Duration: ~5 minutes + migration time

**Option 3: RESTORE FROM BACKUP (Safest)**
- Restores exact state from backup
- Use if backup exists and you want guaranteed restoration
- Duration: ~30 minutes (depends on backup size)

### Script Location
`scripts/migrations/staging/004_rollback.sql`

### Usage
```bash
# Option 1: Truncate all tables
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/004_rollback.sql

# Option 3: Restore from backup
pg_restore -h [STAGING_HOST] -U [USER] -d [STAGING_DB] \
  -c -v staging_backup_YYYYMMDD_HHMMSS.dump
```

### Safety Checks
- ✅ Verifies running on staging database (not prod)
- ✅ Requires manual confirmation
- ✅ Logs all actions for audit trail

---

## Migration Checklist

### Pre-Migration (1 hour before)
- [ ] Backup production database (safety)
- [ ] Backup staging database (rollback option)
- [ ] Verify staging is clean (`001_clean_staging.sql` already run)
- [ ] Test database connections (prod + staging)
- [ ] Load environment variables (.env.local)
- [ ] Verify MCP Supabase tools working
- [ ] Alert team: "Migration starting at [TIME]"

### Migration Execution (1.5-2.5 hours)
- [ ] Run `001_clean_staging.sql` (~15 min)
- [ ] Run `002_copy_data.ts` (~1-2 hours)
- [ ] Run `003_validate.sql` (~30 min)
- [ ] Review validation results
- [ ] Fix any errors (or rollback if critical)

### Post-Migration (30 min)
- [ ] Run advisor checks (security + performance)
- [ ] Verify 3 staging errors auto-corrected
- [ ] Update DOCUMENTATION_PROGRESS.md
- [ ] Alert team: "Migration complete"
- [ ] Begin Phase 4 (Advisor Remediation) if validation passed

### Rollback (if needed)
- [ ] Run `004_rollback.sql`
- [ ] Verify staging is clean
- [ ] Analyze failure cause
- [ ] Fix migration scripts
- [ ] Schedule re-attempt

---

## Related Documentation

- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Dependency tree (validated in PART2)
- [_DEPENDENCY_TREE.json](./migration-plan/_DEPENDENCY_TREE.json) - Machine-readable dependency tree
- [DOCUMENTATION_PROGRESS.md](./DOCUMENTATION_PROGRESS.md) - Migration progress tracking

```

---

## SUCCESS CRITERIA

- [ ] 001_clean_staging.sql reviewed and improved
  - [ ] TRUNCATE order matches validated dependency tree
  - [ ] CASCADE usage documented
  - [ ] Detailed comments added (level headers, inline dependencies)
- [ ] 002_copy_data.ts reviewed and improved
  - [ ] INSERT order matches validated dependency tree
  - [ ] Special handling for self-referencing tables (staff_users)
  - [ ] Progress reporting added (batch-level)
  - [ ] Error recovery added (resume from failure)
- [ ] 003_validate.sql reviewed and improved
  - [ ] Row count comparison (prod vs staging)
  - [ ] FK integrity checks (all 49 FKs)
  - [ ] RLS verification (40/41 tables)
  - [ ] Data sampling (10+ queries)
- [ ] 004_rollback.sql created
  - [ ] Safety checks (verify staging database)
  - [ ] 3 rollback options (truncate, drop, restore)
  - [ ] Verification queries
  - [ ] Post-rollback actions documented
- [ ] MIGRATION_SCRIPTS.md created (~500-700 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 8.1 Review 001_clean_staging.sql | 45 min | 0.75 hr |
| 8.2 Review 002_copy_data.ts | 1.0 hr | 1.75 hr |
| 8.3 Review 003_validate.sql | 30 min | 2.25 hr |
| 8.4 Create 004_rollback.sql | 45 min | 3.0 hr |
| **Documentation (MIGRATION_SCRIPTS.md)** | 45 min | **3.75 hr** |

**Realistic Total:** 2-3 hours (script improvements + documentation)

---

## NEXT STEPS AFTER COMPLETION

Once PART8 is complete:

1. Test improved migration scripts on local staging
2. Verify resume functionality works (`--resume` flag)
3. Test rollback script (on test database, not staging!)
4. Update team on script improvements
5. Proceed to PART9 (MIGRATION_EXECUTION.md)

**Ready for:** PLAN_PART9_MIGRATION_EXECUTION.md
