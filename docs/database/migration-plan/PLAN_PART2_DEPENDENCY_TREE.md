# PLAN PART 2: DEPENDENCY TREE VALIDATION

**Purpose:** Validate FK dependency tree in MIGRATION_ORDER.md against actual database relationships
**Duration:** 2-3 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1 complete with `_FK_RELATIONSHIPS.json` generated
**Output:** Validated/corrected MIGRATION_ORDER.md with accurate dependency levels

---

## OBJECTIVE

Validate the 5-level dependency tree claimed in `docs/database/MIGRATION_ORDER.md`:

**CLAIMED STRUCTURE:**
```
Level 0 (Root tables - no FKs):
- tenant_registry
- sire_countries
- sire_document_types
- [others?]

Level 1 (depends only on Level 0):
- staff_users (→ tenant_registry)
- user_tenant_permissions (→ tenant_registry, staff_users)
- [others?]

Level 2 (depends on Level 0-1):
- accommodations (→ tenant_registry)
- [others?]

Level 3 (depends on Level 0-2):
- accommodation_units (→ accommodations)
- guest_reservations (→ accommodations)
- [others?]

Level 4 (depends on Level 0-3):
- reservation_accommodations (→ guest_reservations, accommodations)
- [others?]
```

**VERIFICATION QUESTIONS:**
1. Are there really only 5 levels (0-4)?
2. Is every table correctly categorized?
3. Are there circular dependencies?
4. Is the migration order safe (children before parents on truncate, reverse on insert)?

---

## TASKS FOR @agent-database-agent

### TASK 2.1: Load FK Relationships from PART1 (15 min)

**Input File:** `docs/database/migration-plan/_FK_RELATIONSHIPS.json`

**Expected Structure:**
```json
{
  "total_fks": 49,
  "relationships": [
    {
      "table": "staff_users",
      "column": "tenant_id",
      "references_table": "tenant_registry",
      "references_column": "tenant_id"
    },
    ...
  ]
}
```

**Action:**
- Load FK relationships into memory
- Build adjacency list data structure: `{ table → [referenced_tables] }`
- Build reverse adjacency list: `{ table → [tables_that_reference_it] }`

---

### TASK 2.2: Identify Root Tables (Level 0) (30 min)

**Algorithm:**
```
FOR EACH table IN all_tables:
  IF table has ZERO outgoing FKs:
    table is Level 0 (root)
```

**Query to Verify:**
```sql
-- Tables with NO foreign keys (root tables)
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = t.table_name
      AND tc.table_schema = t.table_schema
      AND tc.constraint_type = 'FOREIGN KEY'
  )
ORDER BY t.table_name;
```

**Expected Output:**
- List of Level 0 tables
- Verify `tenant_registry`, `sire_countries`, `sire_document_types` are in list
- Check for any unexpected root tables

**Action:**
- Compare actual Level 0 tables with claimed list in MIGRATION_ORDER.md
- Document any discrepancies

---

### TASK 2.3: Calculate Dependency Levels for All Tables (1 hour)

**Algorithm (Topological Sort with Level Assignment):**

```python
# Pseudocode
levels = {}
unprocessed = set(all_tables)

current_level = 0
while unprocessed:
    # Find tables where all dependencies are already leveled
    next_batch = []
    for table in unprocessed:
        dependencies = get_referenced_tables(table)  # From adjacency list

        if len(dependencies) == 0:
            # Root table (Level 0)
            next_batch.append(table)
        elif all(dep in levels for dep in dependencies):
            # All dependencies already have levels
            max_dep_level = max(levels[dep] for dep in dependencies)
            table_level = max_dep_level + 1
            levels[table] = table_level
            next_batch.append(table)

    if len(next_batch) == 0:
        # CIRCULAR DEPENDENCY DETECTED!
        remaining = list(unprocessed)
        raise Error(f"Circular dependency in tables: {remaining}")

    # Assign current level to batch
    for table in next_batch:
        if table not in levels:  # Root tables
            levels[table] = 0
        unprocessed.remove(table)

    current_level += 1

return levels
```

**Expected Output:**
```json
{
  "dependency_levels": {
    "tenant_registry": 0,
    "sire_countries": 0,
    "staff_users": 1,
    "accommodations": 2,
    "accommodation_units": 3,
    ...
  },
  "max_level": 4,
  "circular_dependencies": []
}
```

**Action:**
- Run topological sort algorithm
- If circular dependencies found: **FLAG AS CRITICAL ISSUE**
- Compare calculated levels with MIGRATION_ORDER.md levels
- Document any table that's in wrong level

---

### TASK 2.4: Validate Level Assignments (45 min)

**For each table in MIGRATION_ORDER.md:**

1. **Get claimed level** (e.g., "Level 2")
2. **Get calculated level** from Task 2.3
3. **Get FK dependencies** from adjacency list
4. **Verify logic:**
   - If table has NO FKs → must be Level 0
   - If table has FKs → level must be `max(dependency_levels) + 1`

**Example Validation:**
```
Table: reservation_accommodations
Claimed Level: 4
Dependencies:
  - guest_reservations (Level 3)
  - accommodations (Level 2)
Expected Level: max(3, 2) + 1 = 4 ✅ CORRECT

Table: user_tenant_permissions
Claimed Level: 1
Dependencies:
  - tenant_registry (Level 0)
  - staff_users (Level 1)
Expected Level: max(0, 1) + 1 = 2 ❌ INCORRECT (claimed 1, should be 2)
```

**Action:**
- Create validation report table:

| Table | Claimed | Calculated | Status | Dependencies |
|-------|---------|------------|--------|--------------|
| ... | ... | ... | ✅/❌ | ... |

- Flag all tables with mismatched levels
- Calculate impact (how many tables affected)

---

### TASK 2.5: Verify Migration Order Safety (30 min)

**Two critical orderings to verify:**

#### A) TRUNCATE ORDER (Reverse Dependency - Level 4→0)
```sql
-- From MIGRATION_ORDER.md: 001_clean_staging.sql
-- Must delete CHILDREN before PARENTS to avoid FK violations

TRUNCATE TABLE reservation_accommodations CASCADE;  -- Level 4
TRUNCATE TABLE accommodation_units CASCADE;          -- Level 3
...
TRUNCATE TABLE tenant_registry CASCADE;              -- Level 0 (last)
```

**Verification:**
- For each TRUNCATE statement, verify table's children are truncated first
- Check if CASCADE is necessary (or if explicit ordering makes it redundant)

#### B) INSERT ORDER (Forward Dependency - Level 0→4)
```typescript
// From MIGRATION_ORDER.md: 002_copy_data.ts
// Must insert PARENTS before CHILDREN to satisfy FKs

await copyTable('tenant_registry');        // Level 0
await copyTable('staff_users');            // Level 1
...
await copyTable('reservation_accommodations'); // Level 4 (last)
```

**Verification:**
- For each insert, verify all FK targets are inserted first
- Verify batching won't cause FK violations (batch size = 1000)

**Action:**
- Create two ordered lists:
  1. Safe truncate order (reverse levels)
  2. Safe insert order (forward levels)
- Compare with orders in MIGRATION_ORDER.md scripts
- Flag any ordering issues

---

### TASK 2.6: Check for Special Cases (30 min)

#### A) Self-Referencing Tables
**Query:**
```sql
-- Tables with FKs to themselves
SELECT DISTINCT
  tc.table_name,
  kcu.column_name,
  ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = ccu.table_name
  AND tc.table_schema = 'public';
```

**Expected Output:**
- List of self-referencing tables (e.g., `staff_users.manager_id → staff_users.id`)

**Migration Implications:**
- Self-referencing tables need special handling:
  1. Insert rows with NULL in self-referencing column
  2. Update self-references after all rows inserted
- Check if MIGRATION_ORDER.md handles this

#### B) Nullable FK Columns
**Query:**
```sql
-- Identify nullable FK columns (flexible migration order)
SELECT
  tc.table_name,
  kcu.column_name,
  c.is_nullable,
  ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.columns c
  ON c.table_name = tc.table_name
  AND c.column_name = kcu.column_name
  AND c.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND c.is_nullable = 'YES'
ORDER BY tc.table_name;
```

**Expected Output:**
- FK columns that accept NULL
- These can be inserted with NULL, then updated later (migration flexibility)

#### C) ON DELETE CASCADE Constraints
**Query:**
```sql
-- Find CASCADE delete rules (affects truncate safety)
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND rc.delete_rule = 'CASCADE'
ORDER BY tc.table_name;
```

**Expected Output:**
- Tables with CASCADE delete rules
- Verify TRUNCATE CASCADE usage in 001_clean_staging.sql is safe

**Action:**
- Document all special cases in MIGRATION_ORDER.md
- Add migration notes for self-referencing tables
- Flag if CASCADE usage could cause unexpected deletes

---

### TASK 2.7: Generate Dependency Visualization (30 min)

**Create ASCII Tree Representation:**

```
Level 0 (Root - 4 tables):
├─ tenant_registry (17 children)
├─ sire_countries (2 children)
├─ sire_document_types (1 child)
└─ [other root tables]

Level 1 (8 tables):
├─ staff_users (depends: tenant_registry) [3 children]
│   └─ self-reference: manager_id → staff_users.id
├─ settings (depends: tenant_registry) [0 children]
└─ [other Level 1 tables]

Level 2 (12 tables):
├─ accommodations (depends: tenant_registry) [15 children]
├─ guest_conversations (depends: tenant_registry, staff_users) [2 children]
└─ [other Level 2 tables]

Level 3 (10 tables):
├─ accommodation_units (depends: accommodations) [8 children]
├─ guest_reservations (depends: accommodations) [3 children]
└─ [other Level 3 tables]

Level 4 (7 tables):
├─ reservation_accommodations (depends: guest_reservations, accommodations)
├─ chat_messages (depends: guest_conversations)
└─ [other Level 4 tables]

Total: 41 tables across 5 levels
```

**Action:**
- Generate tree visualization
- Show FK counts (children = tables that reference this table)
- Highlight critical dependency paths (longest chains)
- Include in updated MIGRATION_ORDER.md

---

## OUTPUT FILES TO UPDATE

### 1. `docs/database/MIGRATION_ORDER.md`

**Sections to Update:**

#### Dependency Tree Validation (Add new section at line ~50):
```markdown
## Dependency Tree Validation

**Last Validated:** [DATE] by @agent-database-agent against production (ooaumjzaztmutltifhoq)

**Method:** Topological sort of actual FK relationships
**Total Tables:** [ACTUAL_COUNT]
**Total FKs:** [ACTUAL_FK_COUNT]
**Dependency Levels:** [MAX_LEVEL] (0-[MAX])

### Validation Results

| Aspect | Status | Notes |
|--------|--------|-------|
| Circular Dependencies | ✅/❌ | [NONE / List if found] |
| All Tables Categorized | ✅/❌ | [41/41 or discrepancies] |
| Level Assignments Correct | ✅/❌ | [X tables corrected] |
| Truncate Order Safe | ✅/❌ | [Verified reverse order] |
| Insert Order Safe | ✅/❌ | [Verified forward order] |

### Corrected Dependency Tree

[INSERT ASCII TREE FROM TASK 2.7]
```

#### Update Level Tables (lines ~100-300):
- Replace each level's table list with verified assignments
- Add FK dependency notes for each table
- Highlight special cases (self-referencing, nullable FKs)

**Example:**
```markdown
### Level 1 (8 tables) - Depends only on Level 0

| Table | Dependencies | Children | Special Notes |
|-------|--------------|----------|---------------|
| staff_users | tenant_registry | 3 | ⚠️ Self-ref: manager_id |
| settings | tenant_registry | 0 | - |
| user_tenant_permissions | tenant_registry, staff_users | 0 | - |
```

#### Update Migration Scripts (lines ~350-500):

**001_clean_staging.sql:**
- Verify/correct TRUNCATE order matches validated reverse levels
- Add comments explaining dependency reasons

**002_copy_data.ts:**
- Verify/correct copy order matches validated forward levels
- Add special handling for self-referencing tables

**Example correction:**
```typescript
// Level 1 - Self-referencing table requires special handling
await copyTableWithNullableRefs('staff_users', ['manager_id']);
// This will:
// 1. Copy with manager_id = NULL
// 2. Update manager_id after all staff_users inserted
```

---

### 2. `docs/database/DOCUMENTATION_PROGRESS.md`

**Add New Section:**
```markdown
## Dependency Tree Validation (Part 2 Complete)

**Date:** [DATE]
**Duration:** [ACTUAL_HOURS]

### Validation Summary

**FK Relationships Analyzed:** [COUNT]
**Dependency Levels:** [MAX_LEVEL] (0-[MAX])
**Circular Dependencies:** [NONE/LIST]

### Corrections Made

| Table | Old Level | New Level | Reason |
|-------|-----------|-----------|--------|
| [table] | [X] | [Y] | FK to Level-[Z] table requires Level-[Y] |

**Total Tables Corrected:** [COUNT]

### Special Cases Documented

- Self-referencing tables: [COUNT] ([LIST])
- Nullable FKs: [COUNT]
- CASCADE delete rules: [COUNT]

**Status:** PART2 COMPLETE ✅ Ready for PART3
```

---

### 3. Create New File: `docs/database/migration-plan/_DEPENDENCY_TREE.json`

**Export for programmatic use:**
```json
{
  "validated_date": "2025-10-30",
  "total_tables": 41,
  "total_fks": 49,
  "max_level": 4,
  "circular_dependencies": [],
  "levels": {
    "0": ["tenant_registry", "sire_countries", ...],
    "1": ["staff_users", "settings", ...],
    "2": ["accommodations", ...],
    "3": ["accommodation_units", ...],
    "4": ["reservation_accommodations", ...]
  },
  "table_details": {
    "staff_users": {
      "level": 1,
      "depends_on": ["tenant_registry"],
      "referenced_by": ["user_tenant_permissions", "guest_conversations", ...],
      "self_referencing": true,
      "self_ref_columns": ["manager_id"]
    },
    ...
  },
  "migration_order": {
    "truncate": ["reservation_accommodations", ..., "tenant_registry"],
    "insert": ["tenant_registry", ..., "reservation_accommodations"]
  }
}
```

---

## SUCCESS CRITERIA

- [ ] Topological sort completed successfully
- [ ] No circular dependencies detected
- [ ] All 41 tables assigned to correct dependency level
- [ ] Truncate order verified safe (reverse levels)
- [ ] Insert order verified safe (forward levels)
- [ ] Special cases documented (self-ref, nullable FKs, CASCADE)
- [ ] ASCII tree visualization generated
- [ ] MIGRATION_ORDER.md updated with validated tree
- [ ] `_DEPENDENCY_TREE.json` exported
- [ ] DOCUMENTATION_PROGRESS.md updated with results

---

## CRITICAL ISSUES TO FLAG

If any of these are found, **STOP AND REPORT IMMEDIATELY**:

1. **Circular Dependencies Detected**
   - Migration impossible without breaking circular references
   - Requires manual intervention (temp disable constraints or special logic)

2. **Major Level Reassignments** (>5 tables moved)
   - Indicates significant documentation drift
   - May require re-review of migration strategy

3. **Self-Referencing Tables Without Special Handling**
   - Will cause FK violations during migration
   - Requires special copy logic in 002_copy_data.ts

4. **Unexpected CASCADE Rules**
   - May cause unintended data loss during TRUNCATE
   - Verify each CASCADE is intentional

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 2.1 Load FK Data | 15 min | 0.25 hr |
| 2.2 Identify Root Tables | 30 min | 0.75 hr |
| 2.3 Calculate Levels | 60 min | 1.75 hr |
| 2.4 Validate Assignments | 45 min | 2.5 hr |
| 2.5 Verify Migration Order | 30 min | 3.0 hr |
| 2.6 Check Special Cases | 30 min | 3.5 hr |
| 2.7 Generate Visualization | 30 min | 4.0 hr |
| **Documentation Updates** | 45 min | **4.75 hr** |

**Realistic Total:** 4.75-5 hours (includes buffer)

---

## NEXT STEPS AFTER COMPLETION

Once PART2 is validated:

1. Review `_DEPENDENCY_TREE.json` for accurate table groupings
2. If all validations pass: Proceed to PART3 (TABLES_CATALOGS.md)
3. If circular dependencies found: Consult with user on resolution strategy
4. Use validated dependency tree for all remaining documentation phases

**Ready for:** PLAN_PART3_TABLES_CATALOGS.md
