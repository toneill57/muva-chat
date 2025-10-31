# PLAN PART 0: BASELINE MIGRATION EXPORT

**Purpose:** Export complete DDL from production as baseline migration for disaster recovery and new environments
**Duration:** 2-3 hours
**Executor:** @agent-database-agent
**Output:** Executable SQL files that recreate entire database schema from scratch

---

## OBJECTIVE

Create a **baseline migration** that contains ALL DDL (Data Definition Language) needed to recreate the MUVA Chat database structure from an empty PostgreSQL instance.

**Why this is critical:**
- ✅ **Disaster Recovery** - Recreate DB if production crashes
- ✅ **New Environments** - Spin up dev/staging/prod from baseline
- ✅ **CI/CD** - Automated testing with clean DB
- ✅ **Documentation** - Executable SQL is always up-to-date
- ✅ **Version Control** - Track schema changes in git
- ✅ **Onboarding** - New developers can setup local DB instantly

---

## TASKS FOR @agent-database-agent

### TASK 0.1: Export Extensions (15 min)

**Purpose:** Document all PostgreSQL extensions required by the database

**Query:**
```sql
-- Get all installed extensions
SELECT
  extname AS extension_name,
  extversion AS version,
  nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY extname;
```

**Expected Extensions:**
- `pgvector` - Vector similarity search (for embeddings)
- `uuid-ossp` - UUID generation
- `pg_trgm` - Trigram matching (for text search)
- [Others discovered in query]

**Output File:** `docs/database/migrations/baseline/000_extensions.sql`

**Format:**
```sql
-- MUVA Chat Database - Extensions
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)

-- Vector similarity search (required for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram matching (text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- [Other extensions]
```

**Action:**
- Query production database for extensions
- Generate CREATE EXTENSION statements
- Add comments explaining purpose of each extension

---

### TASK 0.2: Export Table DDL (1 hour)

**Purpose:** Generate CREATE TABLE statements for all 41 tables in correct dependency order

**Strategy:**
1. Use `_FK_RELATIONSHIPS.json` from FASE 1 to determine dependency order
2. Export tables Level 0 → Level 4 (respects FK dependencies)
3. Include: columns, types, defaults, NOT NULL constraints, CHECK constraints

**Query Template (per table):**
```sql
-- Get complete table definition
SELECT
  'CREATE TABLE ' || table_name || ' (' ||
  string_agg(
    column_name || ' ' ||
    data_type ||
    CASE WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE WHEN column_default IS NOT NULL
      THEN ' DEFAULT ' || column_default
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO'
      THEN ' NOT NULL'
      ELSE ''
    END,
    ', '
  ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '[TABLE_NAME]'
GROUP BY table_name;
```

**Better Approach - Use pg_dump format:**
```sql
-- For each table, generate DDL with:
-- 1. Column definitions
-- 2. Primary keys (inline or separate)
-- 3. Unique constraints
-- 4. Check constraints
-- 5. Comments on columns (if any)

-- Example output:
CREATE TABLE tenant_registry (
    tenant_id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_slug text NOT NULL,
    tenant_name text NOT NULL,
    subdomain text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT tenant_registry_pkey PRIMARY KEY (tenant_id),
    CONSTRAINT tenant_registry_tenant_slug_key UNIQUE (tenant_slug),
    CONSTRAINT tenant_registry_subdomain_key UNIQUE (subdomain)
);
```

**Table Order (from dependency tree):**

**Level 0 (Root tables):**
- tenant_registry
- sire_countries
- sire_document_types
- [Others with no FKs]

**Level 1:**
- staff_users (→ tenant_registry)
- settings (→ tenant_registry)
- [Others depending only on Level 0]

**Level 2-4:**
- [Continue in dependency order]

**Output File:** `docs/database/migrations/baseline/001_tables.sql`

**Format:**
```sql
-- MUVA Chat Database - Tables
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- Total Tables: 41
-- Dependency Levels: 0-4

-- ============================================================================
-- LEVEL 0: Root Tables (No Foreign Keys)
-- ============================================================================

-- tenant_registry: Multi-tenant root table
CREATE TABLE tenant_registry (
    -- [columns]
);

-- sire_countries: SIRE country catalog
CREATE TABLE sire_countries (
    -- [columns]
);

-- ============================================================================
-- LEVEL 1: First-level Dependencies
-- ============================================================================

-- staff_users: Staff authentication
CREATE TABLE staff_users (
    -- [columns]
);

-- [Continue for all 41 tables]
```

**Action:**
- Load dependency tree from FASE 1
- For each table (Level 0→4):
  - Extract complete schema from information_schema
  - Generate CREATE TABLE statement
  - Include inline constraints (PKs, UNIQUEs, CHECKs)
- Organize by dependency level with comments

---

### TASK 0.3: Export Primary Keys & Foreign Keys (30 min)

**Purpose:** Generate ALTER TABLE statements for all PKs and FKs (if not inline)

**Note:** If PKs/FKs are included inline in TASK 0.2, this can be combined. Otherwise, generate separate ALTER statements.

**Query - Primary Keys:**
```sql
SELECT
  'ALTER TABLE ' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ') || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;
```

**Query - Foreign Keys:**
```sql
-- Use _FK_RELATIONSHIPS.json from FASE 1
-- For each FK:
ALTER TABLE [table_name]
  ADD CONSTRAINT [constraint_name]
  FOREIGN KEY ([column])
  REFERENCES [ref_table]([ref_column])
  ON DELETE [action]
  ON UPDATE [action];
```

**Output:** Include in `001_tables.sql` or separate `001b_constraints.sql`

---

### TASK 0.4: Export Indexes (30 min)

**Purpose:** Generate CREATE INDEX statements for all 225 indexes

**Query:**
```sql
SELECT indexdef || ';'
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Special Attention:**
- **Vector indexes (IVFFlat):** Must include parameters
- **GIN indexes:** Trigram indexes for text search
- **B-tree indexes:** Standard indexes on FKs and queries

**Example Vector Index:**
```sql
-- Vector similarity search index (Matryoshka 1024)
CREATE INDEX accommodation_units_manual_chunks_embedding_concise_idx
  ON accommodation_units_manual_chunks
  USING ivfflat (embedding_concise vector_cosine_ops)
  WITH (lists = 100);
```

**Output File:** `docs/database/migrations/baseline/002_indexes.sql`

**Format:**
```sql
-- MUVA Chat Database - Indexes
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- Total Indexes: 225

-- ============================================================================
-- PRIMARY KEY INDEXES (Auto-created with tables)
-- ============================================================================
-- [List for reference, but not recreated - PKs create these]

-- ============================================================================
-- FOREIGN KEY INDEXES (Performance)
-- ============================================================================

CREATE INDEX staff_users_tenant_id_idx ON staff_users(tenant_id);
-- [More FK indexes]

-- ============================================================================
-- VECTOR INDEXES (IVFFlat - Embeddings)
-- ============================================================================

-- Matryoshka embeddings (3072 dims)
CREATE INDEX [name]_embedding_full_idx
  ON [table]
  USING ivfflat (embedding_full vector_cosine_ops)
  WITH (lists = 100);

-- [More vector indexes]

-- ============================================================================
-- GIN INDEXES (Text Search)
-- ============================================================================

CREATE INDEX [name]_trgm_idx
  ON [table]
  USING gin ([column] gin_trgm_ops);

-- ============================================================================
-- B-TREE INDEXES (Queries)
-- ============================================================================

CREATE INDEX [name]_idx ON [table]([column]);
```

**Action:**
- Extract all indexes from production
- Categorize by type (PK, FK, Vector, GIN, B-tree)
- Include comments explaining purpose
- Preserve exact IVFFlat parameters

---

### TASK 0.5: Export Functions (30 min)

**Purpose:** Export all 207 database functions

**Query:**
```sql
SELECT
  pg_get_functiondef(p.oid) || ';'
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
```

**Categories:**
- **RPC Functions:** User-facing API functions
- **Trigger Functions:** `update_updated_at_column()`, etc.
- **Utility Functions:** Search, validation, etc.
- **Vector Search Functions:** Semantic search, similarity

**Output File:** `docs/database/migrations/baseline/003_functions.sql`

**Format:**
```sql
-- MUVA Chat Database - Functions
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- Total Functions: 207

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RPC FUNCTIONS (API)
-- ============================================================================

-- [User-facing functions]

-- ============================================================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================================================

-- Semantic search with Matryoshka embeddings
-- [Functions]

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- [Helper functions]
```

**Action:**
- Export all 207 functions
- Categorize by purpose
- Include comments explaining usage
- Preserve exact function signatures and bodies

---

### TASK 0.6: Export Triggers (15 min)

**Purpose:** Export all 14 triggers

**Query:**
```sql
SELECT
  'CREATE TRIGGER ' || trigger_name ||
  ' ' || action_timing || ' ' || event_manipulation ||
  ' ON ' || event_object_table ||
  ' FOR EACH ROW EXECUTE FUNCTION ' ||
  regexp_replace(action_statement, 'EXECUTE (FUNCTION|PROCEDURE) ', '') || ';'
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Output File:** `docs/database/migrations/baseline/004_triggers.sql`

**Format:**
```sql
-- MUVA Chat Database - Triggers
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- Total Triggers: 14

-- ============================================================================
-- UPDATED_AT TRIGGERS (Auto-update timestamps)
-- ============================================================================

-- calendar_events
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- guest_conversations
CREATE TRIGGER update_guest_conversations_updated_at
  BEFORE UPDATE ON guest_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- [More triggers]
```

**Action:**
- Export all 14 triggers
- Link to corresponding trigger functions
- Organize by table
- Include comments explaining purpose

---

### TASK 0.7: Export RLS Policies (30 min)

**Purpose:** Export all 134 RLS policies

**Strategy:**
1. Use `_RLS_POLICIES.json` from FASE 1
2. For each table with RLS:
   - ALTER TABLE ENABLE ROW LEVEL SECURITY
   - CREATE POLICY statements

**Output File:** `docs/database/migrations/baseline/005_rls_policies.sql`

**Format:**
```sql
-- MUVA Chat Database - RLS Policies
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- Total Policies: 134
-- Tables with RLS: 40/41 (code_embeddings excluded)

-- ============================================================================
-- TENANT ISOLATION POLICIES (~80% of policies)
-- ============================================================================

-- tenant_registry
ALTER TABLE tenant_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy
  ON tenant_registry
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- staff_users
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy
  ON staff_users
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- [More tenant isolation policies]

-- ============================================================================
-- STAFF AUTHENTICATION POLICIES (~10%)
-- ============================================================================

-- [Staff-specific policies]

-- ============================================================================
-- GUEST ACCESS POLICIES (~5%)
-- ============================================================================

-- [Guest-facing policies]

-- ============================================================================
-- ADMIN-ONLY POLICIES (~5%)
-- ============================================================================

-- [Superadmin policies]

-- ============================================================================
-- PUBLIC READ POLICIES
-- ============================================================================

-- [Public read-only policies]
```

**Action:**
- Load policies from `_RLS_POLICIES.json`
- Generate ALTER TABLE statements (enable RLS)
- Generate CREATE POLICY statements
- Categorize by security pattern
- Include comments explaining logic

---

### TASK 0.8: Create Unified Baseline (15 min)

**Purpose:** Combine all exports into single executable file

**Output File:** `docs/database/migrations/baseline/baseline_migration.sql`

**Structure:**
```sql
-- ============================================================================
-- MUVA Chat Database - Baseline Migration
-- ============================================================================
-- Generated: [DATE]
-- Source: Production (ooaumjzaztmutltifhoq)
-- PostgreSQL Version: 15.x (Supabase)
--
-- This file contains the COMPLETE DDL to recreate the MUVA Chat database
-- from an empty PostgreSQL instance.
--
-- Execution Time: ~5-10 minutes
-- Tables: 41
-- Foreign Keys: 40
-- Indexes: 225
-- RLS Policies: 134
-- Triggers: 14
-- Functions: 207
--
-- USAGE:
--   psql -d [database_name] -f baseline_migration.sql
--
-- WARNING:
--   This will CREATE all tables. Ensure database is empty before running.
-- ============================================================================

\echo '============================================================================'
\echo 'MUVA Chat Database - Baseline Migration'
\echo 'Started at:' `date`
\echo '============================================================================'

-- ============================================================================
-- STEP 1: Extensions
-- ============================================================================
\echo 'Step 1/7: Installing extensions...'
\ir 000_extensions.sql

-- ============================================================================
-- STEP 2: Tables
-- ============================================================================
\echo 'Step 2/7: Creating tables...'
\ir 001_tables.sql

-- ============================================================================
-- STEP 3: Indexes
-- ============================================================================
\echo 'Step 3/7: Creating indexes...'
\ir 002_indexes.sql

-- ============================================================================
-- STEP 4: Functions
-- ============================================================================
\echo 'Step 4/7: Creating functions...'
\ir 003_functions.sql

-- ============================================================================
-- STEP 5: Triggers
-- ============================================================================
\echo 'Step 5/7: Creating triggers...'
\ir 004_triggers.sql

-- ============================================================================
-- STEP 6: RLS Policies
-- ============================================================================
\echo 'Step 6/7: Enabling RLS and creating policies...'
\ir 005_rls_policies.sql

-- ============================================================================
-- STEP 7: Validation
-- ============================================================================
\echo 'Step 7/7: Validating installation...'

-- Count tables
SELECT 'Tables created:' AS status, COUNT(*)::text AS count
FROM information_schema.tables
WHERE table_schema = 'public';

-- Count functions
SELECT 'Functions created:' AS status, COUNT(*)::text AS count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f';

-- Count indexes
SELECT 'Indexes created:' AS status, COUNT(*)::text AS count
FROM pg_indexes
WHERE schemaname = 'public';

-- Count RLS policies
SELECT 'RLS policies created:' AS status, COUNT(*)::text AS count
FROM pg_policies
WHERE schemaname = 'public';

\echo '============================================================================'
\echo 'Baseline migration completed successfully!'
\echo 'Completed at:' `date`
\echo '============================================================================'
```

**Action:**
- Create master file with \ir includes
- Add progress echo statements
- Include validation queries
- Add execution time estimates
- Test on staging database

---

### TASK 0.9: Test Baseline on Staging (30 min)

**Purpose:** Verify baseline migration works by executing on empty staging database

**Prerequisites:**
- Staging database must be EMPTY (no tables)
- Or create temporary test database

**Execution:**
```bash
# Option 1: Direct psql (if we have connection string)
psql "postgresql://postgres:[password]@db.qlvkgniqcoisbnwwjfte.supabase.co:5432/postgres" \
  -f docs/database/migrations/baseline/baseline_migration.sql

# Option 2: Via execute-ddl-via-api.ts script
pnpm dlx tsx scripts/execute-ddl-via-api.ts \
  docs/database/migrations/baseline/baseline_migration.sql \
  --project-id qlvkgniqcoisbnwwjfte
```

**Validation:**
- [ ] All 41 tables created
- [ ] All 40 FKs created (no constraint errors)
- [ ] All 225 indexes created
- [ ] All 207 functions created
- [ ] All 14 triggers created
- [ ] All 134 RLS policies created
- [ ] No errors or warnings

**If Errors:**
- Document error in `BASELINE_EXPORT_ISSUES.md`
- Fix SQL files
- Re-test until clean execution

---

## OUTPUT FILES

All files created in: `docs/database/migrations/baseline/`

| File | Purpose | Lines Est. | Size Est. |
|------|---------|------------|-----------|
| `000_extensions.sql` | Extensions | ~20 | 1 KB |
| `001_tables.sql` | 41 tables DDL | ~800-1000 | 40 KB |
| `002_indexes.sql` | 225 indexes | ~300-400 | 15 KB |
| `003_functions.sql` | 207 functions | ~1500-2000 | 80 KB |
| `004_triggers.sql` | 14 triggers | ~30-40 | 2 KB |
| `005_rls_policies.sql` | 134 policies | ~400-500 | 20 KB |
| `baseline_migration.sql` | Unified (includes all) | ~60-80 | 3 KB |
| **TOTAL** | **Complete baseline** | **~3,100-4,000** | **~160 KB** |

---

## SUCCESS CRITERIA

- [ ] All 7 SQL files generated
- [ ] Unified baseline_migration.sql created
- [ ] Baseline tested on staging (clean execution)
- [ ] No errors or warnings during execution
- [ ] Validation queries confirm correct counts:
  - [ ] 41 tables
  - [ ] 40 FKs
  - [ ] 225 indexes
  - [ ] 207 functions
  - [ ] 14 triggers
  - [ ] 134 RLS policies
- [ ] Files committed to git
- [ ] Documentation updated (DOCUMENTATION_PROGRESS.md)

---

## CRITICAL ISSUES TO FLAG

If any of these are found, **STOP AND REPORT IMMEDIATELY**:

1. **Circular FK dependencies**
   - Cannot create tables in any order without disabling constraints
   - Requires special handling (defer constraints)

2. **Functions with syntax errors**
   - May be Supabase-specific syntax not compatible with vanilla PostgreSQL
   - Need manual cleanup

3. **RLS policies referencing missing functions**
   - Policies depend on functions that don't exist
   - Need to ensure functions created before policies

4. **Vector indexes fail to create**
   - pgvector extension not available
   - Or IVFFlat parameters incorrect

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 0.1 Export Extensions | 15 min | 0.25 hr |
| 0.2 Export Table DDL | 60 min | 1.25 hr |
| 0.3 Export PKs/FKs | 30 min | 1.75 hr |
| 0.4 Export Indexes | 30 min | 2.25 hr |
| 0.5 Export Functions | 30 min | 2.75 hr |
| 0.6 Export Triggers | 15 min | 3.0 hr |
| 0.7 Export RLS Policies | 30 min | 3.5 hr |
| 0.8 Create Unified Baseline | 15 min | 3.75 hr |
| 0.9 Test on Staging | 30 min | 4.25 hr |
| **Total** | **4.25 hours** | **With buffer: 4.5-5 hours** |

---

## NEXT STEPS AFTER COMPLETION

Once PART0 is complete:

1. **You have the complete baseline** ✅
2. **Can recreate DB from scratch** ✅
3. **Ready for FASE 1 verification** (already done)
4. **Can proceed to FASE 2** (dependency tree validation)

**The baseline is now your safety net** - If anything goes wrong during migration, you can recreate the entire schema in minutes.

---

**Ready for:** PLAN_PART1_VERIFICATION.md (already executed) or direct to PLAN_PART2_DEPENDENCY_TREE.md
