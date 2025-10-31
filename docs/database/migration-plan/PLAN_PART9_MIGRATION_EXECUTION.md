# PLAN PART 9: MIGRATION EXECUTION PLAN

**Purpose:** Step-by-step execution checklist for migration day
**Duration:** ~3.5-4.5 hours (total, including prep and validation)
**Executor:** @agent-database-agent (supervised by human)
**Prerequisites:** PART1-8 complete, all documentation ready
**Output:** Successful production → staging migration with validation

---

## OBJECTIVE

Provide a detailed, hour-by-hour execution plan for migrating production database to staging, with clear success criteria, rollback points, and validation steps.

**Migration Phases:**
1. **Pre-Migration** (1 hour before) - Preparation and backups
2. **Clean Staging** (15 min) - TRUNCATE tables
3. **Data Copy** (1-2 hours) - Copy production data
4. **Validation** (30 min) - Verify migration success
5. **Post-Migration** (30 min) - Advisor checks and documentation

**Total Duration:** 3.5-4.5 hours (conservative estimate with buffer)

---

## MIGRATION TIMELINE

### Hour 0: Pre-Migration Checklist (1 hour before start)

**Duration:** 60 minutes
**Start Time:** [e.g., 2025-10-31 09:00 AM]
**Executor:** @agent-database-agent + Human oversight

#### Task 0.1: Verify Prerequisites (15 min)

**Documentation Status:**
- [ ] PART1 complete (statistics verified)
- [ ] PART2 complete (dependency tree validated)
- [ ] PART3 complete (TABLES_CATALOGS.md)
- [ ] PART4 complete (TABLES_OPERATIONS.md)
- [ ] PART5 complete (TABLES_INTEGRATIONS.md)
- [ ] PART6 complete (TABLES_EMBEDDINGS.md)
- [ ] PART7 complete (RLS_POLICIES.md)
- [ ] PART8 complete (migration scripts improved)

**Migration Scripts Ready:**
- [ ] `001_clean_staging.sql` - Validated against dependency tree
- [ ] `002_copy_data.ts` - Validated against dependency tree
- [ ] `003_validate.sql` - Enhanced with row count comparison, FK checks
- [ ] `004_rollback.sql` - Created and tested (on test DB)

#### Task 0.2: Backup Databases (20 min)

**Production Backup:**
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Backup production database
pg_dump -h [PROD_HOST] \
  -U [PROD_USER] \
  -d [PROD_DB] \
  -F c -b -v \
  -f backups/$(date +%Y-%m-%d)/production_backup_$(date +%H%M%S).dump

# Verify backup created
ls -lh backups/$(date +%Y-%m-%d)/production_backup_*.dump

# Expected: File size ~200-500 MB (based on 74 MB embeddings + other data)
```

**Success Criteria:**
- [ ] Backup file created successfully
- [ ] File size reasonable (>100 MB, <1 GB)
- [ ] No errors in pg_dump output

**Staging Backup (for rollback):**
```bash
# Backup staging database (current state, for rollback if needed)
pg_dump -h [STAGING_HOST] \
  -U [STAGING_USER] \
  -d [STAGING_DB] \
  -F c -b -v \
  -f backups/$(date +%Y-%m-%d)/staging_before_migration_$(date +%H%M%S).dump

# Verify backup
ls -lh backups/$(date +%Y-%m-%d)/staging_before_migration_*.dump
```

**Success Criteria:**
- [ ] Staging backup created
- [ ] File size matches current staging state

#### Task 0.3: Test Database Connections (10 min)

**Production Connection:**
```bash
# Test production database connection
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const { count, error } = await supabase
  .from('tenant_registry')
  .select('*', { count: 'exact', head: true });
console.log('Production tenants:', count);
if (error) throw error;
process.exit(0);
"
```

**Expected Output:** `Production tenants: 3`

**Staging Connection:**
```bash
# Test staging database connection
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_STAGING_URL!,
  process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY!
);
const { count, error } = await supabase
  .from('tenant_registry')
  .select('*', { count: 'exact', head: true });
console.log('Staging tenants:', count);
if (error) throw error;
process.exit(0);
"
```

**Expected Output:** `Staging tenants: [0-3]` (will be 0 after clean)

**Success Criteria:**
- [ ] Production connection successful (3 tenants)
- [ ] Staging connection successful
- [ ] No authentication errors
- [ ] Both databases accessible via Supabase client

#### Task 0.4: Load Environment Variables (5 min)

**Verify .env.local:**
```bash
# Check required environment variables
cat .env.local | grep -E "SUPABASE.*URL|SUPABASE.*KEY"

# Expected variables:
# NEXT_PUBLIC_SUPABASE_URL=[production URL]
# SUPABASE_SERVICE_ROLE_KEY=[production key]
# NEXT_PUBLIC_SUPABASE_STAGING_URL=[staging URL]
# SUPABASE_STAGING_SERVICE_ROLE_KEY=[staging key]
```

**Success Criteria:**
- [ ] All 4 Supabase environment variables present
- [ ] URLs point to correct databases (production vs staging)
- [ ] Service role keys are valid (not anon keys)

#### Task 0.5: Verify MCP Supabase Tools (5 min)

**Test MCP Tools:**
```typescript
// Test production database MCP access
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",  // Production
  query: "SELECT COUNT(*) FROM tenant_registry;"
})

// Expected: {"result": [{"count": 3}]}

// Test staging database MCP access
mcp__supabase__execute_sql({
  project_id: "qlvkgniqcoisbnwwjfte",  // Staging
  query: "SELECT COUNT(*) FROM tenant_registry;"
})

// Expected: {"result": [{"count": [0-3]}]}
```

**Success Criteria:**
- [ ] MCP tools can query production database
- [ ] MCP tools can query staging database
- [ ] No authentication errors

#### Task 0.6: Alert Team (5 min)

**Send Notification:**
```markdown
🚀 **MUVA Chat Database Migration - STARTING**

**Migration Window:** [START_TIME] - [END_TIME] (~3.5 hours)
**Affected Systems:** Staging database (qlvkgniqcoisbnwwjfte)
**Production Impact:** NONE (production unaffected)

**Timeline:**
- 09:00-10:00 AM: Pre-migration prep (complete ✅)
- 10:00-10:15 AM: Clean staging database
- 10:15-12:15 PM: Copy production data to staging
- 12:15-12:45 PM: Validate migration
- 12:45-01:15 PM: Post-migration checks

**Status:** All pre-migration checks passed ✅
**Backups:** Production + Staging backed up ✅
**Next Step:** Clean staging database (Phase 1)

**Contact:** [Your contact info]
```

**Success Criteria:**
- [ ] Team notified via Slack/Email
- [ ] Timeline communicated
- [ ] Contact info shared

---

### Hour 1: Phase 1 - Clean Staging (15 min)

**Duration:** 15 minutes
**Start Time:** [e.g., 10:00 AM]
**Script:** `001_clean_staging.sql`

#### Step 1.1: Run Clean Script (10 min)

**Command:**
```bash
# Set environment variables
set -a
source .env.local
set +a

# Run clean script
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/001_clean_staging.sql
```

**Expected Output:**
```
Executing DDL script: 001_clean_staging.sql
TRUNCATE TABLE reservation_accommodations CASCADE
✅ Table truncated
TRUNCATE TABLE chat_messages CASCADE
✅ Table truncated
...
TRUNCATE TABLE tenant_registry CASCADE
✅ Table truncated

All tables truncated successfully
Duration: 12 seconds
```

**Monitor Progress:**
- Each TRUNCATE should complete in <1 second
- Total time: ~10-15 seconds for all 41 tables
- No errors about FK violations (CASCADE handles dependencies)

#### Step 1.2: Verify Clean (5 min)

**Query:**
```sql
-- Check row counts after clean
SELECT
  tablename,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY row_count DESC;

-- Expected: All tables have row_count = 0
```

**Run via MCP:**
```typescript
mcp__supabase__execute_sql({
  project_id: "qlvkgniqcoisbnwwjfte",  // Staging
  query: `
    SELECT tablename,
           (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) as row_count
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY row_count DESC
    LIMIT 10;
  `
})
```

**Success Criteria:**
- [ ] All tables have 0 rows
- [ ] No errors during TRUNCATE
- [ ] Schema intact (tables, indexes, constraints still exist)
- [ ] Duration: <15 minutes

**If Failure:** Run `004_rollback.sql` and investigate

---

### Hour 1-3: Phase 2 - Data Copy (1-2 hours)

**Duration:** 1-2 hours (depends on data volume)
**Start Time:** [e.g., 10:15 AM]
**Script:** `002_copy_data.ts`

#### Step 2.1: Start Data Copy (0 min)

**Command:**
```bash
# Set environment variables
set -a
source .env.local
set +a

# Run copy script
pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts | tee migration_log_$(date +%Y%m%d_%H%M%S).txt
```

**Note:** `tee` command saves output to log file for later review

#### Step 2.2: Monitor Progress (ongoing)

**Expected Output (first few minutes):**
```
🚀 Starting migration: Production → Staging
📊 Total tables: 41

==============================================
LEVEL 0 TABLES (Root - no dependencies)
==============================================

📋 Copying tenant_registry...
  Total rows: 3
  Progress: 3/3 (100%) [Batch 1/1]
  ✅ tenant_registry: 3 rows copied (0.5 seconds)

📋 Copying sire_countries...
  Total rows: 45
  Progress: 45/45 (100%) [Batch 1/1]
  ✅ sire_countries: 45 rows copied (0.8 seconds)

📋 Copying sire_document_types...
  Total rows: 4
  Progress: 4/4 (100%) [Batch 1/1]
  ✅ sire_document_types: 4 rows copied (0.3 seconds)

==============================================
LEVEL 1 TABLES (Depends on Level 0)
==============================================

📋 Copying staff_users (self-referencing: manager_id)...
  Total rows: 6
  Progress: 6/6 (100%) [Batch 1/1]
  🔄 Updating self-references for 2 rows...
  ✅ staff_users: 6 rows copied (1.2 seconds)

...

==============================================
LEVEL 4 TABLES (Deepest dependencies)
==============================================

📋 Copying reservation_accommodations...
  Total rows: 93
  Progress: 93/93 (100%) [Batch 1/1]
  ✅ reservation_accommodations: 93 rows copied (1.5 seconds)

==============================================
EMBEDDINGS TABLES (Large vectors)
==============================================

📋 Copying code_embeddings...
  Total rows: 4333
  Progress: 500/4333 (12%) [Batch 1/9]
  Progress: 1000/4333 (23%) [Batch 2/9]
  Progress: 1500/4333 (35%) [Batch 3/9]
  ...
  Progress: 4333/4333 (100%) [Batch 9/9]
  ✅ code_embeddings: 4333 rows copied (45 seconds)

...

🎉 Migration complete! All 41 tables copied.
Total rows copied: [TOTAL_COUNT]
Total time: 1h 32m
```

#### Step 2.3: Monitor by Level (checkpoints)

**Checkpoint 1: Level 0 Complete (5 min)**
- [ ] `tenant_registry` (3 rows)
- [ ] `sire_countries` (45 rows)
- [ ] `sire_document_types` (4 rows)
- [ ] Any other Level 0 tables

**Checkpoint 2: Level 1 Complete (15 min)**
- [ ] `staff_users` (6 rows) - Self-referencing handled
- [ ] `user_tenant_permissions` (1 row)
- [ ] Any other Level 1 tables

**Checkpoint 3: Level 2 Complete (45 min)**
- [ ] `accommodations` (51 rows)
- [ ] `muva_content` (742 rows)
- [ ] Any other Level 2 tables

**Checkpoint 4: Level 3 Complete (1h 15min)**
- [ ] `accommodation_units` (70 rows)
- [ ] `guest_reservations` (104 rows)
- [ ] `guest_conversations` (174 rows)
- [ ] `calendar_events` (112 rows)
- [ ] `prospective_sessions` (412 rows)
- [ ] Any other Level 3 tables

**Checkpoint 5: Level 4 Complete (1h 30min)**
- [ ] `reservation_accommodations` (93 rows)
- [ ] `chat_messages` (319 rows)
- [ ] Any other Level 4 tables

**Checkpoint 6: Embeddings Complete (1h 45min)**
- [ ] `code_embeddings` (4,333 rows) - Largest table, ~45 seconds
- [ ] `accommodation_units_manual_chunks` (219 rows)
- [ ] `accommodation_units_public` (153 rows)

#### Step 2.4: Handle Errors (if any)

**If Migration Fails:**

**Error Example:**
```
❌ Failed to copy accommodations: Foreign key violation
Error: insert into "accommodations" violates foreign key constraint "accommodations_tenant_id_fkey"
```

**Diagnosis:**
1. Check which table failed (e.g., `accommodations`)
2. Check error message (FK violation, permission error, etc.)
3. Review dependency order (is parent table copied first?)
4. Check `migration-progress.json` (which tables already copied)

**Resolution Options:**

**Option A: Resume from Failure**
```bash
# Resume from last successful table
pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts --resume
```

**Option B: Fix and Restart**
```bash
# Rollback staging
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/004_rollback.sql

# Fix migration script (002_copy_data.ts)
# ... make corrections ...

# Re-run clean + copy
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/001_clean_staging.sql

pnpm dlx tsx scripts/migrations/staging/002_copy_data.ts
```

**Success Criteria:**
- [ ] All 41 tables copied
- [ ] Total row count matches production (verify with PART1 stats)
- [ ] No FK violations
- [ ] Self-referencing tables handled (staff_users)
- [ ] Embeddings tables copied (large vectors intact)
- [ ] Duration: 1-2 hours

**If Failure:** Run `004_rollback.sql`, fix scripts, retry

---

### Hour 3: Phase 3 - Validation (30 min)

**Duration:** 30 minutes
**Start Time:** [e.g., 12:15 PM]
**Script:** `003_validate.sql`

#### Step 3.1: Run Validation Script (20 min)

**Command:**
```bash
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/003_validate.sql | tee validation_log_$(date +%Y%m%d_%H%M%S).txt
```

**Expected Output:**

```
==============================================
VALIDATION: ROW COUNT COMPARISON
==============================================

table_name                     | prod_rows | staging_rows | status      | diff
-------------------------------|-----------|--------------|-------------|-----
tenant_registry                | 3         | 3            | ✅ MATCH    | 0
staff_users                    | 6         | 6            | ✅ MATCH    | 0
accommodations                 | 51        | 51           | ✅ MATCH    | 0
code_embeddings                | 4333      | 4333         | ✅ MATCH    | 0
...

Summary: 41/41 tables match ✅

==============================================
VALIDATION: FOREIGN KEY INTEGRITY
==============================================

Checking 49 foreign key constraints...

✅ All foreign keys valid (0 violations)

==============================================
VALIDATION: RLS ENABLED
==============================================

RLS Status:
- RLS Enabled: 40 tables
- RLS Disabled: 1 table (code_embeddings - known issue)

⚠️ code_embeddings missing RLS (will be fixed in Phase 4)

==============================================
VALIDATION: DATA SAMPLING
==============================================

Sample 1: tenant_registry
  Total rows: 3
  Unique slugs: 3
  Slugs: loscedrosboutique, simmerdown, tucasamar
  ✅ PASS

Sample 2: accommodation_units
  Total rows: 70
  Unique properties: 51
  Unique tenants: 3
  ✅ PASS

Sample 3: code_embeddings
  Total rows: 4333
  Has 3072-dim: 4333
  Has 1536-dim: 4333
  Has 1024-dim: 4333
  ✅ PASS (all embeddings populated)

Sample 4: Vector search test
  Returned 5 results with similarity scores (0.85-0.95)
  ✅ PASS (vector search working)

...

Summary: 10/10 sample queries passed ✅

==============================================
VALIDATION SUMMARY
==============================================

✅ Row Count Comparison: PASS (41/41 tables match)
✅ FK Integrity: PASS (0 violations)
✅ RLS Status: PASS (40/41 with RLS, 1 known issue)
✅ Data Sampling: PASS (10/10 queries)

🎉 Migration validation complete!

Duration: 18 minutes
```

#### Step 3.2: Review Validation Results (10 min)

**Manual Checks:**

**A) Row Count Discrepancies**
```sql
-- If any tables don't match, investigate
SELECT * FROM [table_with_mismatch] ORDER BY created_at DESC LIMIT 10;
```

**B) FK Violations**
```sql
-- If FK violations found, identify orphaned rows
SELECT * FROM [child_table] ct
WHERE NOT EXISTS (
  SELECT 1 FROM [parent_table] pt
  WHERE pt.id = ct.[fk_column]
);
```

**C) RLS Issues**
```sql
-- If tables missing RLS (besides code_embeddings), check which ones
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename != 'code_embeddings';
```

**D) Data Sampling Failures**
```sql
-- Re-run failed sample queries manually
-- Investigate why they failed
```

**Success Criteria:**
- [ ] All 41 tables have matching row counts
- [ ] Zero FK violations (49/49 constraints valid)
- [ ] 40/41 tables have RLS (code_embeddings known issue)
- [ ] 10/10 sample queries pass
- [ ] Vector search works (embeddings intact)
- [ ] Duration: <30 minutes

**If Validation Fails:**
- Minor issues (1-2 rows different): Investigate, may be acceptable
- Major issues (>10% data missing): **ROLLBACK** and retry
- FK violations: **ROLLBACK** (critical issue)

---

### Hour 3.5: Phase 4 - Post-Migration (30 min)

**Duration:** 30 minutes
**Start Time:** [e.g., 12:45 PM]

#### Step 4.1: Run Advisor Checks (15 min)

**Security Advisors (Staging):**
```typescript
mcp__supabase__get_advisors({
  project_id: "qlvkgniqcoisbnwwjfte",
  type: "security"
})
```

**Expected Issues:**
1. **code_embeddings missing RLS** (known issue)
   - Remediation: Add RLS policies (already documented in PART6/PART7)
   - Priority: HIGH (fix after migration)

2. **Other security issues?** (investigate if any new ones)

**Performance Advisors (Staging):**
```typescript
mcp__supabase__get_advisors({
  project_id: "qlvkgniqcoisbnwwjfte",
  type: "performance"
})
```

**Expected Issues:**
- ~212 performance advisors (same as production)
- Check for new issues introduced during migration
- Verify no indexes missing (should match production)

**Action Items:**
- [ ] Document all advisor findings
- [ ] Compare with production advisor count
- [ ] Flag any new critical issues
- [ ] Plan remediation for known issues (code_embeddings RLS)

#### Step 4.2: Verify Staging Errors Auto-Corrected (5 min)

**From Previous Analysis (3 errors in staging):**
1. Error in hotel_operations (uuid_generate_v4 vs gen_random_uuid) - Should be fixed after migration
2. Error in prospective_messages (missing column?) - Should be fixed after migration
3. Error in [table3] - Should be fixed after migration

**Verify:**
```sql
-- Check if hotel_operations error is gone
SELECT * FROM hotel_operations LIMIT 1;
-- Expected: No errors

-- Check if prospective_messages error is gone
SELECT * FROM prospective_messages LIMIT 1;
-- Expected: No errors (or table exists if it was missing)
```

**Success Criteria:**
- [ ] 3 staging errors are now resolved
- [ ] No new errors introduced
- [ ] Staging database now mirrors production structure

#### Step 4.3: Update Documentation (5 min)

**Update DOCUMENTATION_PROGRESS.md:**

```markdown
## Migration Complete (Part 9) ✅

**Date:** 2025-10-31
**Duration:** 3h 25m (actual)
**Status:** SUCCESS

### Migration Summary

**Row Count:**
- Total tables: 41
- Total rows copied: [ACTUAL_COUNT]
- Largest table: code_embeddings (4,333 rows)

**Validation:**
- ✅ Row counts: 41/41 match
- ✅ FK integrity: 49/49 valid
- ✅ RLS status: 40/41 (code_embeddings known issue)
- ✅ Data sampling: 10/10 passed
- ✅ Vector search: Working

**Issues:**
- ⚠️ code_embeddings missing RLS (known, documented, will fix)

**Performance:**
- Clean staging: 12 seconds
- Data copy: 1h 32m
- Validation: 18 minutes
- Post-migration checks: 15 minutes
- **Total:** 3h 25m (under estimated 4.5 hours ✅)

### Next Steps
1. Fix code_embeddings RLS (Phase 4 Advisor Remediation)
2. Monitor staging for 48 hours
3. Run production migration if staging stable

**Status:** PART9 COMPLETE ✅
```

#### Step 4.4: Alert Team (5 min)

**Send Notification:**
```markdown
✅ **MUVA Chat Database Migration - COMPLETE**

**Duration:** 3h 25m (under estimated 4.5 hours)
**Status:** SUCCESS ✅

**Summary:**
- ✅ All 41 tables migrated (100%)
- ✅ Row counts match production (41/41 tables)
- ✅ Zero FK violations (49/49 constraints valid)
- ✅ RLS enabled on 40/41 tables (1 known issue)
- ✅ Data sampling passed (10/10 queries)
- ✅ Vector search working (embeddings intact)

**Known Issues:**
- ⚠️ code_embeddings missing RLS (documented, will fix next)

**Next Steps:**
- Phase 4: Advisor Remediation (fix code_embeddings RLS)
- Monitor staging for 48 hours
- Plan production migration if staging stable

**Staging Database Ready for Testing:** ✅

**Contact:** [Your contact info]
```

**Success Criteria:**
- [ ] Team notified of success
- [ ] Known issues documented
- [ ] Next steps communicated

---

## ROLLBACK PROCEDURE

**If Migration Fails at Any Point:**

### Step 1: Assess Failure

**Questions:**
1. Which phase failed? (Clean / Copy / Validation)
2. What was the error? (FK violation / Permission / Network)
3. Can it be fixed quickly? (<15 min)

### Step 2: Decide to Rollback or Fix

**Rollback If:**
- Critical data loss (row counts way off)
- Multiple FK violations (>10)
- RLS completely broken (>5 tables missing RLS)
- Unknown cause (safer to rollback and investigate)

**Fix If:**
- Minor issue (1-2 rows different, explainable)
- Known issue with quick fix (add missing RLS policy)
- Resume-able failure (network hiccup, can --resume)

### Step 3: Execute Rollback

**Command:**
```bash
# Rollback staging to pre-migration state
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  scripts/migrations/staging/004_rollback.sql

# OR restore from backup
pg_restore -h [STAGING_HOST] -U [USER] -d [STAGING_DB] \
  -c -v backups/$(date +%Y-%m-%d)/staging_before_migration_*.dump
```

**Duration:** ~15 minutes (truncate) or ~30 minutes (restore)

### Step 4: Verify Rollback

**Query:**
```sql
SELECT COUNT(*) AS tables_with_data
FROM pg_tables
WHERE schemaname = 'public'
  AND (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = tablename) > 0;

-- Expected: 0 (if TRUNCATE) or [original count] (if restore)
```

### Step 5: Investigate and Fix

**Action Items:**
1. Review error logs
2. Identify root cause
3. Fix migration scripts
4. Test fix on local staging
5. Schedule retry (next day if needed)

### Step 6: Alert Team

**Send Notification:**
```markdown
⚠️ **MUVA Chat Database Migration - ROLLED BACK**

**Reason:** [Reason for rollback]
**Status:** Staging rolled back to pre-migration state ✅

**Investigation:**
- Root cause: [Description]
- Fix required: [Description]
- Estimated fix time: [Time]

**Next Steps:**
- Fix migration scripts
- Test on local staging
- Schedule retry: [Date/Time]

**Staging Database:** Restored to previous state ✅

**Contact:** [Your contact info]
```

---

## MIGRATION EXECUTION LOG TEMPLATE

**Use this template to track migration progress:**

```markdown
# MUVA Chat Migration Execution Log

**Date:** 2025-10-31
**Executor:** @agent-database-agent + [Human Name]
**Start Time:** 10:00 AM
**End Time:** [TBD]

---

## Hour 0: Pre-Migration (09:00-10:00)

- [ ] 09:00 - Task 0.1: Verify Prerequisites (15 min)
  - Status: [ ] PASS [ ] FAIL
  - Notes: [Any issues encountered]

- [ ] 09:15 - Task 0.2: Backup Databases (20 min)
  - Production backup: [ ] COMPLETE (Size: [SIZE])
  - Staging backup: [ ] COMPLETE (Size: [SIZE])
  - Notes: [Backup locations]

- [ ] 09:35 - Task 0.3: Test Connections (10 min)
  - Production: [ ] PASS [ ] FAIL
  - Staging: [ ] PASS [ ] FAIL
  - Notes: [Connection info]

- [ ] 09:45 - Task 0.4: Load Environment (5 min)
  - Status: [ ] PASS [ ] FAIL
  - Notes: [Any missing variables]

- [ ] 09:50 - Task 0.5: Test MCP Tools (5 min)
  - Production: [ ] PASS [ ] FAIL
  - Staging: [ ] PASS [ ] FAIL
  - Notes: [MCP tool status]

- [ ] 09:55 - Task 0.6: Alert Team (5 min)
  - Status: [ ] SENT
  - Notes: [Team notified via Slack/Email]

**Pre-Migration Status:** [ ] PASS [ ] FAIL

---

## Hour 1: Phase 1 - Clean Staging (10:00-10:15)

- [ ] 10:00 - Step 1.1: Run Clean Script (10 min)
  - Status: [ ] PASS [ ] FAIL
  - Duration: [ACTUAL TIME]
  - Notes: [Any errors]

- [ ] 10:10 - Step 1.2: Verify Clean (5 min)
  - All tables empty: [ ] YES [ ] NO
  - Schema intact: [ ] YES [ ] NO
  - Notes: [Verification results]

**Phase 1 Status:** [ ] PASS [ ] FAIL

---

## Hour 1-3: Phase 2 - Data Copy (10:15-12:15)

- [ ] 10:15 - Step 2.1: Start Copy Script
  - Start time: [TIME]

- [ ] 10:20 - Checkpoint 1: Level 0 Complete (5 min)
  - Tables: [COUNT]/[EXPECTED]
  - Rows: [COUNT]/[EXPECTED]
  - Status: [ ] PASS [ ] FAIL

- [ ] 10:30 - Checkpoint 2: Level 1 Complete (15 min)
  - Tables: [COUNT]/[EXPECTED]
  - Rows: [COUNT]/[EXPECTED]
  - Self-referencing handled: [ ] YES [ ] NO
  - Status: [ ] PASS [ ] FAIL

- [ ] 11:00 - Checkpoint 3: Level 2 Complete (45 min)
  - Tables: [COUNT]/[EXPECTED]
  - Rows: [COUNT]/[EXPECTED]
  - Status: [ ] PASS [ ] FAIL

- [ ] 11:30 - Checkpoint 4: Level 3 Complete (1h 15min)
  - Tables: [COUNT]/[EXPECTED]
  - Rows: [COUNT]/[EXPECTED]
  - Status: [ ] PASS [ ] FAIL

- [ ] 11:45 - Checkpoint 5: Level 4 Complete (1h 30min)
  - Tables: [COUNT]/[EXPECTED]
  - Rows: [COUNT]/[EXPECTED]
  - Status: [ ] PASS [ ] FAIL

- [ ] 12:00 - Checkpoint 6: Embeddings Complete (1h 45min)
  - code_embeddings: [ ] PASS [ ] FAIL (4,333 rows)
  - Other embeddings: [ ] PASS [ ] FAIL
  - Status: [ ] PASS [ ] FAIL

- [ ] 12:15 - Copy Complete
  - End time: [TIME]
  - Duration: [ACTUAL DURATION]
  - Total rows: [COUNT]

**Phase 2 Status:** [ ] PASS [ ] FAIL

---

## Hour 3: Phase 3 - Validation (12:15-12:45)

- [ ] 12:15 - Step 3.1: Run Validation Script (20 min)
  - Duration: [ACTUAL TIME]
  - Notes: [Output highlights]

- [ ] 12:35 - Step 3.2: Review Results (10 min)
  - Row counts match: [ ] YES [ ] NO ([COUNT]/41 tables)
  - FK integrity: [ ] YES [ ] NO ([COUNT]/49 constraints)
  - RLS enabled: [ ] YES [ ] NO ([COUNT]/41 tables)
  - Data sampling: [ ] YES [ ] NO ([COUNT]/10 queries)
  - Notes: [Issues found]

**Phase 3 Status:** [ ] PASS [ ] FAIL

---

## Hour 3.5: Phase 4 - Post-Migration (12:45-01:15)

- [ ] 12:45 - Step 4.1: Run Advisor Checks (15 min)
  - Security advisors: [COUNT] issues
  - Performance advisors: [COUNT] issues
  - New issues: [ ] YES [ ] NO
  - Notes: [Critical findings]

- [ ] 01:00 - Step 4.2: Verify Errors Fixed (5 min)
  - Staging errors fixed: [ ] YES [ ] NO ([COUNT]/3)
  - Notes: [Remaining errors]

- [ ] 01:05 - Step 4.3: Update Documentation (5 min)
  - DOCUMENTATION_PROGRESS.md: [ ] UPDATED
  - Notes: [Summary added]

- [ ] 01:10 - Step 4.4: Alert Team (5 min)
  - Team notified: [ ] YES
  - Notes: [Notification sent]

**Phase 4 Status:** [ ] PASS [ ] FAIL

---

## FINAL STATUS

**Migration Status:** [ ] SUCCESS [ ] ROLLED BACK

**Duration:** [START TIME] - [END TIME] ([TOTAL DURATION])

**Summary:**
- Tables migrated: [COUNT]/41
- Rows migrated: [TOTAL COUNT]
- Validation status: [PASS/FAIL]
- Known issues: [COUNT]

**Next Steps:** [Actions required]

---
```

---

## SUCCESS CRITERIA

**Migration Successful If:**
- [ ] All 41 tables migrated (100%)
- [ ] Row counts match production (within 1% tolerance for dynamic tables)
- [ ] Zero FK violations (49/49 constraints valid)
- [ ] RLS enabled on 40/41 tables (code_embeddings known issue)
- [ ] Data sampling passed (8/10 minimum)
- [ ] Vector search working (embeddings intact)
- [ ] Duration: <4.5 hours
- [ ] No critical errors (no rollback needed)
- [ ] Team notified of success
- [ ] Documentation updated

**Known Acceptable Issues:**
- code_embeddings missing RLS (documented, will fix in Phase 4)
- Minor row count differences in highly dynamic tables (<1%)

---

## RELATED DOCUMENTATION

- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Dependency tree
- [MIGRATION_SCRIPTS.md](./MIGRATION_SCRIPTS.md) - Script documentation
- [PART1_VERIFICATION.md](./PLAN_PART1_VERIFICATION.md) - Expected row counts
- [PART2_DEPENDENCY_TREE.md](./PLAN_PART2_DEPENDENCY_TREE.md) - Validated dependencies
- [004_rollback.sql](../../scripts/migrations/staging/004_rollback.sql) - Rollback procedure

---

## FINAL NOTES

**After Successful Migration:**
1. Monitor staging for 48 hours
2. Test all integrations (Motopress, Airbnb, WhatsApp)
3. Run advisor remediation (Phase 4)
4. Document lessons learned
5. Plan production migration (if applicable)

**Migration Complete:** Proceed to Phase 4 (Advisor Remediation)
