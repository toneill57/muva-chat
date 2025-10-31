# PLAN PART 3: CATALOG TABLES DOCUMENTATION

**Purpose:** Document all catalog/reference data tables (SIRE compliance + system catalogs)
**Duration:** 2-3 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2 complete
**Output:** `docs/database/TABLES_CATALOGS.md` (~800-1000 lines)

---

## OBJECTIVE

Create comprehensive documentation for catalog tables following the template established in `TABLES_BASE.md`.

**Target Tables** (estimated 6-8 tables):
- `sire_content` - SIRE regulatory content (Level 0)
- `sire_cities` - Colombian cities catalog (Level 0 or 1)
- `muva_content` - MUVA tourism content with embeddings (Level 0 or 1)
- `meal_plans` - Hotel meal plan types (Level 0 or 1)
- `room_types` - Room type catalog (Level 0 or 1)
- `accommodation_types` - Property type catalog (Level 0 or 1)
- [Any other catalog tables discovered in PART2]

---

## TEMPLATE (Per Table)

Use this structure for EACH table (based on `TABLES_BASE.md` format):

```markdown
## [table_name]

**Purpose:** [1-2 sentence description]
**Row Count:** [ACTUAL from PART1]
**Total Size:** [SIZE with pg_size_pretty]
**Dependency Level:** [LEVEL from PART2]
**Foreign Keys:** [IN: X] [OUT: Y]

---

### Schema

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| [column] | [type] | [default] | [YES/NO] | [purpose] |

---

### Primary Key

```sql
PRIMARY KEY ([columns])
```

---

### Foreign Keys

#### Outgoing (Dependencies)
[If none: "None - This is a root/catalog table"]

```sql
FOREIGN KEY ([column]) REFERENCES [table]([column])
  ON DELETE [ACTION]
  ON UPDATE [ACTION]
```

#### Incoming (Referenced By)
[List all tables that reference this table]

```sql
-- [referencing_table].[column] → [this_table].[pk_column]
```

---

### Indexes

```sql
-- Primary key index
CREATE UNIQUE INDEX [name] ON [table] ([columns]);

-- Additional indexes
CREATE INDEX [name] ON [table] ([columns]);
-- Purpose: [Why this index exists]
```

---

### RLS Policies

**RLS Enabled:** ✅ Yes / ⚠️ No

#### Policy: [policy_name]
```sql
CREATE POLICY [policy_name]
ON [table]
FOR [SELECT/INSERT/UPDATE/DELETE]
TO [roles]
USING ([qual_expression])
WITH CHECK ([with_check_expression]);
```

**Purpose:** [Explanation of security logic]

---

### Triggers

[If none: "No triggers"]

```sql
CREATE TRIGGER [trigger_name]
  [BEFORE/AFTER] [INSERT/UPDATE/DELETE]
  ON [table]
  FOR EACH ROW
  EXECUTE FUNCTION [function_name]();
```

**Purpose:** [What trigger does]

---

### Sample Data

```sql
-- Production sample (anonymized/representative)
SELECT * FROM [table] LIMIT 5;
```

| [col1] | [col2] | [col3] | ... |
|--------|--------|--------|-----|
| [val1] | [val2] | [val3] | ... |

---

### Common Query Patterns

#### Pattern 1: [Description]
```sql
-- [Use case description]
[SQL QUERY]
```

**Performance:** [Index usage notes]

---

### Performance Notes

- **Read Frequency:** [High/Medium/Low]
- **Write Frequency:** [High/Medium/Low]
- **Growth Rate:** [Static/Slow/Fast]
- **Indexing Strategy:** [Explanation]
- **Advisors:** [List any performance advisors for this table]

---

### Migration Notes

#### DO:
- ✅ [Critical migration rules]

#### DON'T:
- ❌ [Common pitfalls]

**Special Handling:**
[Any special considerations for this table during migration]

---

```

---

## TASKS FOR @agent-database-agent

### TASK 3.1: Identify All Catalog Tables (30 min)

**Strategy:**
1. Review dependency tree from PART2
2. Look for tables in Level 0-1 with catalog/reference characteristics:
   - Low row counts (typically < 1000 rows)
   - Rare updates (mostly static data)
   - Referenced by many other tables
   - Names suggesting catalogs: `*_types`, `*_categories`, `sire_*`, `*_content`

**Confirmed Catalog Tables:**
- `sire_countries` (already documented in TABLES_BASE.md)
- `sire_document_types` (already documented in TABLES_BASE.md)
- `sire_content`
- `sire_cities`
- `muva_content`

**Candidates to Verify:**
- `meal_plans`
- `room_types`
- `accommodation_types`
- Any other `*_types` or `*_categories` tables

**Query to Find Catalog Candidates:**
```sql
-- Find small, frequently-referenced tables (catalog characteristics)
WITH table_refs AS (
  SELECT
    ccu.table_name,
    COUNT(DISTINCT tc.table_name) AS reference_count
  FROM information_schema.constraint_column_usage ccu
  JOIN information_schema.table_constraints tc
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'public'
  GROUP BY ccu.table_name
),
table_sizes AS (
  SELECT
    relname AS table_name,
    n_live_tup AS row_count
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
)
SELECT
  ts.table_name,
  ts.row_count,
  COALESCE(tr.reference_count, 0) AS referenced_by_count
FROM table_sizes ts
LEFT JOIN table_refs tr ON ts.table_name = tr.table_name
WHERE ts.row_count < 1000  -- Small tables
  AND COALESCE(tr.reference_count, 0) > 2  -- Referenced by multiple tables
ORDER BY tr.reference_count DESC, ts.row_count DESC;
```

**Action:**
- Finalize list of 6-8 catalog tables
- Exclude tables already documented in TABLES_BASE.md

---

### TASK 3.2: Extract Complete Schema for Each Table (2 hours)

For EACH catalog table identified:

#### A) Column Details
**Query:**
```sql
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable,
  character_maximum_length,
  numeric_precision,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '[TABLE_NAME]'
ORDER BY ordinal_position;
```

#### B) Primary Key
**Query:**
```sql
SELECT
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = '[TABLE_NAME]'
  AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.constraint_name;
```

#### C) Foreign Keys (Outgoing)
**Query:**
```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = '[TABLE_NAME]'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.ordinal_position;
```

#### D) Foreign Keys (Incoming)
Use `_FK_RELATIONSHIPS.json` from PART1 to find tables that reference this table.

#### E) Indexes
**Query:**
```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = '[TABLE_NAME]'
ORDER BY indexname;
```

#### F) RLS Policies
**Query:**
```sql
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = '[TABLE_NAME]'
ORDER BY policyname;
```

**Check if RLS is enabled:**
```sql
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = '[TABLE_NAME]';
```

#### G) Triggers
**Query:**
```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = '[TABLE_NAME]'
ORDER BY trigger_name;
```

#### H) Sample Data (Anonymized)
**Query:**
```sql
SELECT * FROM [TABLE_NAME] LIMIT 5;
```

**IMPORTANT:** Anonymize sensitive data:
- Names → "User A", "User B"
- Emails → "user@example.com"
- IDs → Keep actual UUIDs (needed for FK references)

#### I) Row Count & Size
**Query:**
```sql
SELECT
  schemaname,
  relname,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS indexes_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname = '[TABLE_NAME]';
```

---

### TASK 3.3: Document Common Query Patterns (45 min)

For each catalog table, identify 2-3 common query patterns:

**Example for `sire_cities`:**
```sql
-- Pattern 1: Lookup city by SIRE code
SELECT city_name, department_name
FROM sire_cities
WHERE sire_city_code = '05001';  -- Medellín

-- Pattern 2: Find all cities in a department
SELECT city_name, sire_city_code
FROM sire_cities
WHERE department_name = 'Antioquia'
ORDER BY city_name;

-- Pattern 3: Join with accommodations for location filtering
SELECT a.name, sc.city_name, sc.department_name
FROM accommodations a
JOIN sire_cities sc ON a.sire_city_code = sc.sire_city_code
WHERE sc.department_name = 'Antioquia';
```

**Where to find patterns:**
1. Search codebase for table name: `grep -r "sire_cities" src/`
2. Look in API routes, components, database queries
3. Check RPC functions that use the table

---

### TASK 3.4: Add Performance and Migration Notes (30 min)

For each table:

#### Performance Notes
- **Read Frequency:** Based on table purpose (catalogs = HIGH read, LOW write)
- **Write Frequency:** Static catalogs = RARE, content catalogs = OCCASIONAL
- **Growth Rate:** SIRE catalogs = STATIC, muva_content = SLOW
- **Indexing Strategy:** Document why each index exists
- **Advisors:** Check ADVISORS_ANALYSIS.md for any issues with this table

#### Migration Notes
**DO:**
- ✅ Migrate catalog tables FIRST (they're dependencies)
- ✅ Preserve UUIDs (other tables reference them)
- ✅ Verify row counts match after migration

**DON'T:**
- ❌ Truncate without CASCADE (will break child tables)
- ❌ Modify SIRE codes (must match regulatory requirements)

---

## OUTPUT FILE: `docs/database/TABLES_CATALOGS.md`

**Structure:**

```markdown
# CATALOG TABLES DOCUMENTATION

**Purpose:** Reference data and regulatory compliance catalogs
**Tables Documented:** [COUNT]
**Total Rows:** [SUM of all catalog rows]
**Documentation Template:** Based on TABLES_BASE.md

**Last Updated:** [DATE] by @agent-database-agent

---

## Overview

Catalog tables provide reference data and regulatory compliance information for the MUVA Chat platform. These tables are:
- **Low-volume:** Typically < 1,000 rows
- **High-read:** Frequently referenced by operational tables
- **Low-write:** Mostly static, rare updates
- **Critical:** Many tables depend on them (high FK reference count)

**SIRE Compliance Catalogs:**
- `sire_content` - Colombian tourism regulatory content
- `sire_cities` - Official city codes and names
- [Already documented: sire_countries, sire_document_types]

**System Catalogs:**
- `muva_content` - Tourism platform content with embeddings
- `meal_plans` - Hotel meal plan types
- `room_types` - Room type taxonomy
- `accommodation_types` - Property type categories

---

## Navigation

- [sire_content](#sire_content) - SIRE regulatory content (Level [X], [ROW_COUNT] rows)
- [sire_cities](#sire_cities) - Colombian cities (Level [X], [ROW_COUNT] rows)
- [muva_content](#muva_content) - Tourism content (Level [X], [ROW_COUNT] rows)
- [meal_plans](#meal_plans) - Meal plan types (Level [X], [ROW_COUNT] rows)
- [room_types](#room_types) - Room types (Level [X], [ROW_COUNT] rows)
- [accommodation_types](#accommodation_types) - Property types (Level [X], [ROW_COUNT] rows)

---

[THEN: Complete documentation for each table using template]

## sire_content

[FULL TEMPLATE CONTENT]

---

## sire_cities

[FULL TEMPLATE CONTENT]

---

[... Continue for all catalog tables ...]

---

## Summary

**Total Catalog Tables:** [COUNT]
**Total Rows:** [SUM]
**Total Size:** [SUM]
**Dependency Levels:** [RANGE]

**Migration Priority:** HIGH (these are root dependencies)
**Migration Order:** FIRST (Level 0-1 tables)

---

## Related Documentation

- [TABLES_BASE.md](./TABLES_BASE.md) - Foundational tables (tenant_registry, staff_users, etc.)
- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Dependency tree and migration strategy
- [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md) - Security and performance issues

```

---

## SUCCESS CRITERIA

- [ ] 6-8 catalog tables identified
- [ ] Each table documented with complete schema (columns, types, defaults)
- [ ] Primary keys, Foreign keys (in/out), Indexes documented
- [ ] RLS policies documented for each table
- [ ] Triggers documented (if any)
- [ ] Sample data included (anonymized)
- [ ] 2-3 common query patterns per table
- [ ] Performance notes and advisor issues noted
- [ ] Migration notes (DO/DON'T) included
- [ ] TABLES_CATALOGS.md file created (~800-1000 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 3.1 Identify Catalog Tables | 30 min | 0.5 hr |
| 3.2 Extract Schema (6-8 tables) | 2.0 hr | 2.5 hr |
| 3.3 Query Patterns | 45 min | 3.25 hr |
| 3.4 Performance/Migration Notes | 30 min | 3.75 hr |
| **File Creation & Formatting** | 30 min | **4.25 hr** |

**Realistic Total:** 4-4.5 hours

---

## NEXT STEPS AFTER COMPLETION

Once PART3 is complete:

1. Verify TABLES_CATALOGS.md follows template structure
2. Check that all catalog tables have RLS enabled
3. Proceed to PART4 (TABLES_OPERATIONS.md)

**Ready for:** PLAN_PART4_TABLES_OPERATIONS.md
