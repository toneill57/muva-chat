# PLAN PART 4: OPERATIONS TABLES DOCUMENTATION

**Purpose:** Document core business operations tables (bookings, conversations, calendar)
**Duration:** 3-4 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2, PART3 complete
**Output:** `docs/database/TABLES_OPERATIONS.md` (~1200-1500 lines)

---

## OBJECTIVE

Create comprehensive documentation for operational tables that power the MUVA Chat platform's core functionality following the template established in `TABLES_BASE.md` and `TABLES_CATALOGS.md`.

**Target Tables** (~12 tables):
- `accommodations` - Properties/hotels (51 rows)
- `accommodation_units` - Individual rooms/units (70 rows)
- `guest_reservations` - Bookings (104 rows)
- `reservation_accommodations` - Junction table (93 rows)
- `guest_conversations` - Chat sessions (174 rows)
- `chat_messages` - Individual messages (319 rows)
- `prospective_sessions` - Pre-booking inquiries (412 rows)
- `prospective_messages` - Inquiry messages (dependent on prospective_sessions)
- `calendar_events` - Availability calendar (112 rows)
- `calendar_event_conflicts` - Scheduling conflicts (0 rows)
- `hotel_operations` - Operational data (10 rows)
- `hotels` - Legacy hotel records (3 rows)

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

### TASK 4.1: Identify All Operations Tables (30 min)

**Strategy:**
1. Review dependency tree from PART2
2. Look for tables in Level 1-4 with operational characteristics:
   - Medium-high row counts (typically 50-1000 rows)
   - Frequent reads AND writes
   - Core business functionality
   - Names suggesting operations: `*_reservations`, `*_conversations`, `*_messages`, `calendar_*`

**Confirmed Operations Tables:**
- `accommodations` (Level 2 - depends on tenant_registry)
- `accommodation_units` (Level 3 - depends on accommodations)
- `guest_reservations` (Level 3 - depends on accommodations)
- `reservation_accommodations` (Level 4 - junction table)
- `guest_conversations` (Level 2 or 3)
- `chat_messages` (Level 3 or 4)
- `prospective_sessions` (Level 2 or 3)
- `calendar_events` (Level 2 or 3)
- `calendar_event_conflicts` (Level 3 or 4)

**Candidates to Verify:**
- `hotel_operations`
- `hotels` (legacy?)
- `accommodation_units_manual` (may be embeddings-related)
- `prospective_messages`

**Query to Find Operations Candidates:**
```sql
-- Find medium-sized, frequently-accessed tables (operations characteristics)
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  seq_scan + idx_scan AS total_reads,
  n_tup_ins + n_tup_upd + n_tup_del AS total_writes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup BETWEEN 10 AND 1000  -- Medium tables
  AND (seq_scan + idx_scan > 1000 OR n_tup_ins + n_tup_upd + n_tup_del > 100)  -- Active
ORDER BY total_reads DESC, row_count DESC;
```

**Action:**
- Finalize list of 10-12 operations tables
- Exclude tables already documented in TABLES_BASE.md or TABLES_CATALOGS.md
- Exclude integration tables (those will be PART5)
- Exclude embeddings tables (those will be PART6)

---

### TASK 4.2: Extract Complete Schema for Each Table (2 hours)

For EACH operations table identified:

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
- Guest names → "Guest A", "Guest B"
- Emails → "guest@example.com"
- Phone numbers → "+1234567890"
- Messages → "Sample message content..."
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

### TASK 4.3: Document Common Query Patterns (1 hour)

For each operations table, identify 2-4 common query patterns:

**Example for `guest_reservations`:**
```sql
-- Pattern 1: Get all active reservations for an accommodation
SELECT gr.*, a.name AS accommodation_name
FROM guest_reservations gr
JOIN reservation_accommodations ra ON gr.id = ra.reservation_id
JOIN accommodations a ON ra.accommodation_id = a.id
WHERE a.tenant_id = '[TENANT_ID]'
  AND gr.check_out_date >= CURRENT_DATE
ORDER BY gr.check_in_date;
-- Index used: accommodations(tenant_id), guest_reservations(check_out_date)

-- Pattern 2: Find reservations for a specific date range
SELECT gr.*, g.full_name
FROM guest_reservations gr
JOIN guests g ON gr.guest_id = g.id
WHERE gr.check_in_date <= '2025-11-15'
  AND gr.check_out_date >= '2025-11-01'
  AND gr.tenant_id = '[TENANT_ID]'
ORDER BY gr.check_in_date;
-- Index used: guest_reservations(tenant_id, check_in_date, check_out_date)

-- Pattern 3: Calculate occupancy rate for a property
SELECT
  a.name,
  COUNT(DISTINCT gr.id) AS total_reservations,
  SUM(EXTRACT(DAY FROM gr.check_out_date - gr.check_in_date)) AS total_nights
FROM accommodations a
LEFT JOIN reservation_accommodations ra ON a.id = ra.accommodation_id
LEFT JOIN guest_reservations gr ON ra.reservation_id = gr.id
  AND gr.check_in_date >= '2025-01-01'
  AND gr.check_out_date <= '2025-12-31'
WHERE a.tenant_id = '[TENANT_ID]'
GROUP BY a.id, a.name;

-- Pattern 4: Get reservation with conversation history
SELECT
  gr.*,
  gc.id AS conversation_id,
  COUNT(cm.id) AS message_count
FROM guest_reservations gr
LEFT JOIN guest_conversations gc ON gr.id = gc.reservation_id
LEFT JOIN chat_messages cm ON gc.id = cm.conversation_id
WHERE gr.id = '[RESERVATION_ID]'
GROUP BY gr.id, gc.id;
```

**Example for `guest_conversations`:**
```sql
-- Pattern 1: Get active conversations for a staff member
SELECT
  gc.*,
  g.full_name AS guest_name,
  COUNT(cm.id) AS message_count,
  MAX(cm.created_at) AS last_message_at
FROM guest_conversations gc
JOIN guests g ON gc.guest_id = g.id
LEFT JOIN chat_messages cm ON gc.id = cm.conversation_id
WHERE gc.staff_user_id = '[STAFF_ID]'
  AND gc.status = 'active'
GROUP BY gc.id, g.full_name
ORDER BY last_message_at DESC;

-- Pattern 2: Get conversation with full message history
SELECT
  gc.*,
  json_agg(
    json_build_object(
      'id', cm.id,
      'content', cm.content,
      'sender_type', cm.sender_type,
      'created_at', cm.created_at
    ) ORDER BY cm.created_at
  ) AS messages
FROM guest_conversations gc
LEFT JOIN chat_messages cm ON gc.id = cm.conversation_id
WHERE gc.id = '[CONVERSATION_ID]'
GROUP BY gc.id;

-- Pattern 3: Find conversations by tenant
SELECT gc.*, g.full_name
FROM guest_conversations gc
JOIN guests g ON gc.guest_id = g.id
WHERE gc.tenant_id = '[TENANT_ID]'
  AND gc.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY gc.updated_at DESC;
```

**Where to find patterns:**
1. Search codebase for table name: `grep -r "guest_reservations" src/`
2. Look in API routes, components, database queries
3. Check RPC functions that use the table
4. Review `src/app/api/` endpoints
5. Check `src/lib/` utility functions

---

### TASK 4.4: Add Performance and Migration Notes (45 min)

For each table:

#### Performance Notes
- **Read Frequency:** Operations tables = HIGH to MEDIUM
- **Write Frequency:** Operations tables = HIGH (frequent INSERTs, UPDATEs)
- **Growth Rate:** FAST (new reservations, messages daily)
- **Indexing Strategy:** Document why each index exists
  - Tenant isolation indexes (tenant_id)
  - Date range queries (check_in_date, check_out_date)
  - Foreign key indexes (accommodation_id, guest_id)
  - Status filters (status, is_active)
- **Advisors:** Check ADVISORS_ANALYSIS.md for any issues with this table

**Key Performance Concerns:**
- `chat_messages` - High write volume, consider partitioning if grows >100k rows
- `calendar_events` - Date range queries need proper indexing
- `guest_reservations` - Complex JOINs with multiple tables
- `reservation_accommodations` - Junction table, ensure FK indexes exist

#### Migration Notes
**DO:**
- ✅ Migrate in correct dependency order (accommodations → units → reservations)
- ✅ Preserve UUIDs (other tables reference them)
- ✅ Verify row counts match after migration
- ✅ Test FK constraints after migration
- ✅ Verify date ranges are valid (check_in < check_out)

**DON'T:**
- ❌ Truncate without CASCADE (will break child tables)
- ❌ Skip validation queries (FK violations cause silent failures)
- ❌ Batch insert too large (keep batch size = 1000 rows)
- ❌ Forget to copy related conversation/message data with reservations

**Special Handling:**
- **guest_conversations**: Ensure conversation_id references are maintained
- **chat_messages**: High volume, may need progress tracking
- **calendar_events**: Verify no overlapping conflicts after migration
- **reservation_accommodations**: Junction table, verify both FKs exist before insert

---

## OUTPUT FILE: `docs/database/TABLES_OPERATIONS.md`

**Structure:**

```markdown
# OPERATIONS TABLES DOCUMENTATION

**Purpose:** Core business operations (bookings, conversations, calendar)
**Tables Documented:** [COUNT]
**Total Rows:** [SUM of all operations rows]
**Documentation Template:** Based on TABLES_BASE.md

**Last Updated:** [DATE] by @agent-database-agent

---

## Overview

Operations tables power the core functionality of the MUVA Chat platform. These tables are:
- **Medium-volume:** Typically 10-1000 rows per table
- **High-activity:** Frequent reads AND writes
- **Business-critical:** Reservations, conversations, calendar management
- **Fast-growing:** New data added daily

**Booking System:**
- `accommodations` - Properties/hotels
- `accommodation_units` - Individual rooms/units
- `guest_reservations` - Booking records
- `reservation_accommodations` - Junction table (many-to-many)

**Communication System:**
- `guest_conversations` - Chat sessions
- `chat_messages` - Individual messages
- `prospective_sessions` - Pre-booking inquiries
- `prospective_messages` - Inquiry messages

**Calendar System:**
- `calendar_events` - Availability/bookings
- `calendar_event_conflicts` - Scheduling conflicts

**Legacy/Support:**
- `hotel_operations` - Operational metadata
- `hotels` - Legacy hotel records

---

## Navigation

- [accommodations](#accommodations) - Properties (Level [X], 51 rows)
- [accommodation_units](#accommodation_units) - Rooms (Level [X], 70 rows)
- [guest_reservations](#guest_reservations) - Bookings (Level [X], 104 rows)
- [reservation_accommodations](#reservation_accommodations) - Junction (Level [X], 93 rows)
- [guest_conversations](#guest_conversations) - Chats (Level [X], 174 rows)
- [chat_messages](#chat_messages) - Messages (Level [X], 319 rows)
- [prospective_sessions](#prospective_sessions) - Inquiries (Level [X], 412 rows)
- [prospective_messages](#prospective_messages) - Inquiry messages (Level [X], [ROW_COUNT] rows)
- [calendar_events](#calendar_events) - Calendar (Level [X], 112 rows)
- [calendar_event_conflicts](#calendar_event_conflicts) - Conflicts (Level [X], 0 rows)
- [hotel_operations](#hotel_operations) - Operations (Level [X], 10 rows)
- [hotels](#hotels) - Legacy (Level [X], 3 rows)

---

[THEN: Complete documentation for each table using template]

## accommodations

[FULL TEMPLATE CONTENT]

---

## accommodation_units

[FULL TEMPLATE CONTENT]

---

## guest_reservations

[FULL TEMPLATE CONTENT]

---

[... Continue for all operations tables ...]

---

## Summary

**Total Operations Tables:** [COUNT]
**Total Rows:** [SUM]
**Total Size:** [SUM]
**Dependency Levels:** [RANGE]

**Migration Priority:** HIGH (core business data)
**Migration Order:** Level 2-4 (after catalogs and base tables)

**Performance Considerations:**
- High read/write activity
- Fast growth rate
- Complex JOIN queries
- Date range indexing critical

---

## Related Documentation

- [TABLES_BASE.md](./TABLES_BASE.md) - Foundational tables
- [TABLES_CATALOGS.md](./TABLES_CATALOGS.md) - Reference data
- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Dependency tree
- [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md) - Performance issues

```

---

## SUCCESS CRITERIA

- [ ] 10-12 operations tables identified
- [ ] Each table documented with complete schema (columns, types, defaults)
- [ ] Primary keys, Foreign keys (in/out), Indexes documented
- [ ] RLS policies documented for each table
- [ ] Triggers documented (if any)
- [ ] Sample data included (anonymized)
- [ ] 2-4 common query patterns per table with performance notes
- [ ] Performance notes and advisor issues noted
- [ ] Migration notes (DO/DON'T) included
- [ ] TABLES_OPERATIONS.md file created (~1200-1500 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 4.1 Identify Operations Tables | 30 min | 0.5 hr |
| 4.2 Extract Schema (10-12 tables) | 2.0 hr | 2.5 hr |
| 4.3 Query Patterns | 1.0 hr | 3.5 hr |
| 4.4 Performance/Migration Notes | 45 min | 4.25 hr |
| **File Creation & Formatting** | 45 min | **5.0 hr** |

**Realistic Total:** 3-4 hours (excludes buffer, assumes smooth execution)

---

## NEXT STEPS AFTER COMPLETION

Once PART4 is complete:

1. Verify TABLES_OPERATIONS.md follows template structure
2. Check that all operations tables have RLS enabled
3. Verify query patterns match actual codebase usage
4. Proceed to PART5 (TABLES_INTEGRATIONS.md)

**Ready for:** PLAN_PART5_TABLES_INTEGRATIONS.md
