# PLAN PART 1: DATABASE STATISTICS VERIFICATION

**Purpose:** Verify all claims in existing documentation against actual production database
**Duration:** 3-4 hours
**Executor:** @agent-database-agent
**Output:** Updated OVERVIEW.md with verified statistics

---

## OBJECTIVE

Validate the following claims from `docs/database/OVERVIEW.md`:

| Metric | Current Claim | Verification Status |
|--------|---------------|---------------------|
| Total Tables | 41 | ❓ NOT VERIFIED |
| Foreign Keys | 49 | ❓ NOT VERIFIED |
| RLS Policies | 134 | ❓ NOT VERIFIED |
| Tables without RLS | 1 (code_embeddings) | ❓ NOT VERIFIED |
| Indexes | 225 | ❓ NOT VERIFIED |
| Triggers | 21 | ❓ NOT VERIFIED |
| Functions | 207 | ❓ NOT VERIFIED |
| Vector Columns | 22 across 13 tables | ❓ NOT VERIFIED |
| Active Tenants | 3 (simmerdown, tucasamar, loscedrosboutique) | ❓ NOT VERIFIED |

**CRITICAL ROW COUNTS TO VERIFY:**

| Table | Claimed Rows | Claimed Size |
|-------|--------------|--------------|
| code_embeddings | 4,333 | 74 MB |
| muva_content | 742 | 21 MB |
| prospective_sessions | 412 | - |
| chat_messages | 319 | - |
| accommodation_units_manual_chunks | 219 | - |
| guest_conversations | 174 | - |
| calendar_events | 112 | - |
| guest_reservations | 104 | - |
| accommodation_units | 70 | - |
| accommodations | 51 | - |

---

## TASKS FOR @agent-database-agent

### TASK 1.1: Verify Table Count and List (30 min)

**Query:**
```sql
-- Get complete list of user-defined tables in public schema
SELECT
  schemaname,
  tablename,
  hasindexes,
  hastriggers
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Output:**
- Total count (verify = 41)
- Complete list of table names
- Tables with indexes/triggers

**Action:**
- If count ≠ 41: Document discrepancy in OVERVIEW.md
- Update table list if any tables missing/extra

---

### TASK 1.2: Verify Foreign Key Count (30 min)

**Query:**
```sql
-- Get all foreign key constraints with details
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
```

**Expected Output:**
- Total FK count (verify = 49)
- List of all FK relationships (table → referenced_table)
- **CRITICAL:** Save this output for PART2 (dependency tree validation)

**Action:**
- If count ≠ 49: Document actual count in OVERVIEW.md
- Export FK list to `docs/database/migration-plan/_FK_RELATIONSHIPS.json` for Part 2

---

### TASK 1.3: Verify RLS Policy Count (45 min)

**Query:**
```sql
-- Get all RLS policies with table assignments
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Output:**
- Total RLS policy count (verify = 134)
- Policies grouped by table
- Policy types (SELECT/INSERT/UPDATE/DELETE)

**Additional Query - Tables WITHOUT RLS:**
```sql
-- Find tables that should have RLS but don't
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
HAVING t.rowsecurity = false OR COUNT(p.policyname) = 0
ORDER BY t.tablename;
```

**Expected Output:**
- List of tables without RLS enabled
- Verify only `code_embeddings` is missing RLS

**Action:**
- If policy count ≠ 134: Update OVERVIEW.md and ADVISORS_ANALYSIS.md
- If tables other than code_embeddings lack RLS: **FLAG AS CRITICAL SECURITY ISSUE**
- Save policy details for PART7 (RLS_POLICIES.md generation)

---

### TASK 1.4: Verify Index Count (30 min)

**Query:**
```sql
-- Get all indexes with details
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Expected Output:**
- Total index count (verify = 225)
- Indexes grouped by table
- Index types (btree, gin, ivfflat for vectors)

**Action:**
- If count ≠ 225: Document actual count in OVERVIEW.md

---

### TASK 1.5: Verify Trigger Count (30 min)

**Query:**
```sql
-- Get all triggers
SELECT
  event_object_schema AS schema_name,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS trigger_event,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Expected Output:**
- Total trigger count (verify = 21)
- Triggers grouped by table
- Trigger events (BEFORE/AFTER INSERT/UPDATE/DELETE)

**Action:**
- If count ≠ 21: Document actual count in OVERVIEW.md

---

### TASK 1.6: Verify Function Count (30 min)

**Query:**
```sql
-- Get all user-defined functions
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  t.typname AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Functions only (not aggregates, procedures, etc.)
ORDER BY p.proname;
```

**Expected Output:**
- Total function count (verify = 207)
- Function names with signatures
- Return types

**Action:**
- If count ≠ 207: Document actual count in OVERVIEW.md
- **IMPORTANT:** Count functions with `search_path` issues for ADVISORS_ANALYSIS.md (claimed: 15 functions)

---

### TASK 1.7: Verify Vector Column Count (45 min)

**Query:**
```sql
-- Find all vector columns in database
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) AS table_size
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public'
  AND c.udt_name = 'vector'
ORDER BY t.table_name, c.column_name;
```

**Expected Output:**
- Total vector columns (verify = 22)
- Tables with vector columns (verify = 13 tables)
- Vector dimensions for each column
- Tables with Matryoshka embeddings (3072, 1536, 1024 dims)

**Action:**
- If counts don't match: Update OVERVIEW.md and TABLES_EMBEDDINGS.md outline
- Document which tables use Matryoshka architecture

---

### TASK 1.8: Verify Active Tenant Count and Row Counts (1 hour)

**Query 1 - Active Tenants:**
```sql
-- Get active tenants
SELECT
  tenant_slug,
  tenant_name,
  created_at,
  is_active
FROM tenant_registry
WHERE is_active = true
ORDER BY tenant_slug;
```

**Expected Output:**
- Total active tenants (verify = 3)
- Verify slugs: simmerdown, tucasamar, loscedrosboutique

**Query 2 - Row Counts for All Tables:**
```sql
-- Get row counts for all tables
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

**Expected Output:**
- Row counts for all 41 tables
- Verify top 10 table sizes match claims
- **CRITICAL:** Exact row counts for migration validation

**Action:**
- If tenant count ≠ 3 or slugs don't match: **FLAG FOR MANUAL REVIEW**
- Update OVERVIEW.md "Data Volume Analysis" section with actual row counts
- Save row counts to `docs/database/migration-plan/_ROW_COUNTS.json` for migration validation

---

### TASK 1.9: Verify Advisor Counts (30 min)

**Use MCP Tools:**
```typescript
// Production database advisors
mcp__supabase__get_advisors({
  project_id: "ooaumjzaztmutltifhoq",
  type: "security"
})

mcp__supabase__get_advisors({
  project_id: "ooaumjzaztmutltifhoq",
  type: "performance"
})

// Staging database advisors
mcp__supabase__get_advisors({
  project_id: "qlvkgniqcoisbnwwjfte",
  type: "security"
})

mcp__supabase__get_advisors({
  project_id: "qlvkgniqcoisbnwwjfte",
  type: "performance"
})
```

**Expected Output:**
- Production: 20 security + 212 performance = 232 total
- Staging: Similar counts (may differ if structure different)

**Action:**
- If counts don't match: Update ADVISORS_ANALYSIS.md with actual counts
- Document top 20 performance advisors (most critical ones)
- Compare production vs staging advisor differences

---

## OUTPUT FILES TO UPDATE

After completing all verification tasks, update these files:

### 1. `docs/database/OVERVIEW.md`

**Sections to Update:**

**Database Statistics (lines ~50-80):**
```markdown
## Database Statistics

**Last Verified:** [DATE] by @agent-database-agent

- **Total Tables:** [ACTUAL] (claimed: 41)
- **Foreign Keys:** [ACTUAL] (claimed: 49)
- **Indexes:** [ACTUAL] (claimed: 225)
  - B-tree: [COUNT]
  - GIN: [COUNT]
  - IVFFlat (vectors): [COUNT]
- **RLS Policies:** [ACTUAL] (claimed: 134)
  - Tables with RLS: [COUNT]/[TOTAL]
  - Tables without RLS: [LIST]
- **Triggers:** [ACTUAL] (claimed: 21)
- **Functions:** [ACTUAL] (claimed: 207)
- **Vector Columns:** [ACTUAL] across [TABLE_COUNT] tables (claimed: 22 across 13)
```

**Data Volume Analysis (lines ~200-250):**
- Update top 10 tables with actual row counts and sizes
- Verify code_embeddings = 4,333 rows, 74 MB
- Verify muva_content = 742 rows, 21 MB

**Active Tenants (lines ~100-120):**
- Verify 3 active tenants
- Confirm slugs and creation dates

---

### 2. `docs/database/ADVISORS_ANALYSIS.md`

**Sections to Update:**

**Advisor Counts (lines ~20-50):**
```markdown
## Advisor Summary

**Last Verified:** [DATE]

| Database | Security Advisors | Performance Advisors | Total |
|----------|-------------------|----------------------|-------|
| Production (ooaumjzaztmutltifhoq) | [ACTUAL] | [ACTUAL] | [ACTUAL] |
| Staging (qlvkgniqcoisbnwwjfte) | [ACTUAL] | [ACTUAL] | [ACTUAL] |

**Claimed Counts:**
- Production: 20 security + 212 performance = 232 total
- Discrepancies: [LIST ANY]
```

**Top Performance Advisors:**
- Document top 20 most critical performance advisors
- Include advisor IDs, descriptions, affected tables

---

### 3. `docs/database/DOCUMENTATION_PROGRESS.md`

**Add New Section:**
```markdown
## Verification Results (Part 1 Complete)

**Date:** [DATE]
**Duration:** [ACTUAL_HOURS]

### Statistics Verification

| Metric | Claimed | Actual | Status |
|--------|---------|--------|--------|
| Tables | 41 | [ACTUAL] | ✅/❌ |
| Foreign Keys | 49 | [ACTUAL] | ✅/❌ |
| RLS Policies | 134 | [ACTUAL] | ✅/❌ |
| ... | ... | ... | ... |

### Discrepancies Found

[LIST ANY DISCREPANCIES AND RESOLUTIONS]

### Data Exported for Next Phases

- ✅ `_FK_RELATIONSHIPS.json` - For PART2 dependency tree validation
- ✅ `_ROW_COUNTS.json` - For migration validation
- ✅ `_RLS_POLICIES.json` - For PART7 RLS documentation

**Status:** PART1 COMPLETE ✅ Ready for PART2
```

---

## SUCCESS CRITERIA

- [ ] All 9 verification queries executed successfully
- [ ] Discrepancies documented and explained
- [ ] OVERVIEW.md updated with "Last Verified" timestamp
- [ ] ADVISORS_ANALYSIS.md updated with actual advisor counts
- [ ] 3 JSON export files created for next phases:
  - [ ] `_FK_RELATIONSHIPS.json`
  - [ ] `_ROW_COUNTS.json`
  - [ ] `_RLS_POLICIES.json`
- [ ] DOCUMENTATION_PROGRESS.md updated with verification results
- [ ] **NO critical discrepancies** (>10% difference in counts) OR discrepancies explained

---

## CRITICAL ISSUES TO FLAG

If any of these are found, **STOP AND REPORT IMMEDIATELY**:

1. **Table count significantly different** (>5 tables difference from 41)
   - May indicate schema drift between docs and reality

2. **Tables other than code_embeddings lack RLS**
   - Security risk, requires immediate attention

3. **Tenant count ≠ 3 or different slugs**
   - May indicate wrong production database

4. **Major row count discrepancies** (>50% difference)
   - May indicate data loss or different database

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 1.1 Table Count | 30 min | 0.5 hr |
| 1.2 FK Count | 30 min | 1.0 hr |
| 1.3 RLS Policies | 45 min | 1.75 hr |
| 1.4 Index Count | 30 min | 2.25 hr |
| 1.5 Trigger Count | 30 min | 2.75 hr |
| 1.6 Function Count | 30 min | 3.25 hr |
| 1.7 Vector Columns | 45 min | 4.0 hr |
| 1.8 Tenants & Rows | 60 min | 5.0 hr |
| 1.9 Advisor Counts | 30 min | 5.5 hr |
| **Documentation Updates** | 60 min | **6.5 hr** |

**Realistic Total:** 6-7 hours (includes buffer for unexpected issues)

---

## NEXT STEPS AFTER COMPLETION

Once PART1 is verified:

1. Review `_FK_RELATIONSHIPS.json` for PART2 dependency tree validation
2. If all verifications pass (< 5% discrepancy): Proceed to PART2
3. If major discrepancies found (>10%): Review with user before continuing

**Ready for:** PLAN_PART2_DEPENDENCY_TREE.md
