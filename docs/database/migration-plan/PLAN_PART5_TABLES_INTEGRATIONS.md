# PLAN PART 5: INTEGRATION TABLES DOCUMENTATION

**Purpose:** Document external integration tables (Motopress, Airbnb, WhatsApp)
**Duration:** 3-4 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2, PART3, PART4 complete
**Output:** `docs/database/TABLES_INTEGRATIONS.md` (~1000-1200 lines)

---

## OBJECTIVE

Create comprehensive documentation for integration tables that connect MUVA Chat with external platforms following the template established in `TABLES_BASE.md` and `TABLES_CATALOGS.md`.

**Target Tables** (~11 tables):

**Motopress Integration** (PMS for property management):
- `motopress_accommodations` - Synced properties from Motopress
- `motopress_accommodation_units` - Synced rooms/units
- `motopress_room_types` - Room type mapping
- `motopress_sync_log` - Sync activity log
- `airbnb_motopress_comparison` - Cross-platform comparison (0 rows)

**Airbnb Integration** (Calendar sync):
- `airbnb_accommodations` - Properties linked to Airbnb
- `airbnb_calendar_sync_status` - Sync status tracking
- `airbnb_sync_log` - Sync activity log
- `airbnb_mphb_imported_reservations` - Imported reservations (0 rows)

**WhatsApp Business Integration** (Messaging):
- `whatsapp_business_accounts` - Connected WhatsApp accounts
- `whatsapp_phone_numbers` - Associated phone numbers
- `whatsapp_messages` - Message history
- `whatsapp_message_templates` - Pre-approved message templates

**Supporting Tables:**
- `integration_configs` - Generic integration settings (3 rows)
- `ics_feed_configurations` - iCalendar feed configs (9 rows)
- `sync_history` - Historical sync records (85 rows)

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
**Integration Platform:** [Motopress/Airbnb/WhatsApp/Generic]

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
[If none: "None - This table doesn't reference other tables"]

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
-- Purpose: [Why this index exists - e.g., external_id lookups, sync status queries]
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

**Purpose:** [Explanation of security logic - typically tenant isolation]

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

**Purpose:** [What trigger does - e.g., sync timestamps, audit logging]

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

### Integration-Specific Details

**API Endpoint(s):** [External platform API endpoints used]
**Sync Frequency:** [Real-time / Hourly / Daily / Manual]
**Sync Direction:** [One-way / Two-way / Read-only]
**External ID Mapping:** [How external IDs are stored and referenced]

**Key Fields:**
- `external_id` / `motopress_id` / `airbnb_id` / `whatsapp_id` - External platform identifier
- `last_synced_at` - Timestamp of last successful sync
- `sync_status` - Current sync state (pending, success, error)

---

### Common Query Patterns

#### Pattern 1: [Description]
```sql
-- [Use case description - e.g., "Find properties needing sync"]
[SQL QUERY]
```

**Performance:** [Index usage notes]

---

### Performance Notes

- **Read Frequency:** [High/Medium/Low]
- **Write Frequency:** [High/Medium/Low - sync operations]
- **Growth Rate:** [Static/Slow/Fast - depends on sync frequency]
- **Indexing Strategy:** [External IDs, sync timestamps, tenant isolation]
- **Advisors:** [List any performance advisors for this table]

---

### Migration Notes

#### DO:
- ✅ Preserve external_id mappings (critical for sync continuity)
- ✅ Verify FK references to accommodations/units exist
- ✅ Copy sync logs for audit trail

#### DON'T:
- ❌ Modify external IDs (breaks integration)
- ❌ Skip sync status fields (causes re-sync on startup)
- ❌ Truncate without re-authenticating integrations

**Special Handling:**
[Integration-specific considerations during migration]

---

```

---

## TASKS FOR @agent-database-agent

### TASK 5.1: Identify All Integration Tables (30 min)

**Strategy:**
1. Review dependency tree from PART2
2. Look for tables with integration characteristics:
   - Prefix: `motopress_*`, `airbnb_*`, `whatsapp_*`
   - Fields: `external_id`, `*_sync_log`, `sync_status`, `last_synced_at`
   - Purpose: Bridge between MUVA and external platforms

**Confirmed Integration Tables by Platform:**

**Motopress** (Property Management System):
```sql
-- Find Motopress tables
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
       (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = table_name) as rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'motopress_%'
ORDER BY table_name;
```

**Airbnb** (Calendar/Reservation Sync):
```sql
-- Find Airbnb tables
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
       (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = table_name) as rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'airbnb_%'
ORDER BY table_name;
```

**WhatsApp Business** (Messaging):
```sql
-- Find WhatsApp tables
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
       (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = table_name) as rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'whatsapp_%'
ORDER BY table_name;
```

**Generic Integration Support:**
- `integration_configs` (3 rows)
- `ics_feed_configurations` (9 rows - iCalendar feeds)
- `sync_history` (85 rows - historical sync records)

**Query to Find Tables with External IDs:**
```sql
-- Tables with external_id columns (integration candidates)
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%external_id%'
    OR column_name LIKE '%motopress_id%'
    OR column_name LIKE '%airbnb_id%'
    OR column_name LIKE '%whatsapp_id%'
    OR column_name LIKE '%sync%'
  )
ORDER BY table_name, column_name;
```

**Action:**
- Finalize list of 9-11 integration tables
- Group by platform (Motopress, Airbnb, WhatsApp, Generic)
- Exclude operations tables (already documented in PART4)

---

### TASK 5.2: Extract Complete Schema for Each Table (2 hours)

For EACH integration table identified:

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

**Pay special attention to:**
- External ID fields (`motopress_id`, `airbnb_id`, `whatsapp_id`, `external_id`)
- Sync status fields (`sync_status`, `last_synced_at`, `sync_error`)
- Tenant isolation (`tenant_id`)
- FK references to core tables (`accommodation_id`, `unit_id`)

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

**Integration tables typically reference:**
- `tenant_registry` (tenant isolation)
- `accommodations` (property mapping)
- `accommodation_units` (room mapping)
- `staff_users` (who configured integration)

#### D) Foreign Keys (Incoming)
Use `_FK_RELATIONSHIPS.json` from PART1 to find tables that reference this table.

**Note:** Integration tables are rarely referenced by other tables (they're leaf nodes in dependency tree).

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

**Expected indexes for integration tables:**
- `tenant_id` (tenant isolation)
- `external_id` / `motopress_id` / `airbnb_id` (external platform lookups)
- `last_synced_at` (find stale records needing re-sync)
- `sync_status` (filter by sync state)
- Composite: `(tenant_id, external_id)` (unique constraint)

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

**Integration tables should have tenant isolation RLS.**

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

**Common triggers for integration tables:**
- `updated_at` timestamp triggers
- Sync audit logging triggers
- External ID validation triggers

#### H) Sample Data (Anonymized)
**Query:**
```sql
SELECT * FROM [TABLE_NAME] LIMIT 5;
```

**IMPORTANT:** Anonymize sensitive data:
- External IDs → Keep structure but mask values (e.g., `MOTO_xxxxx`)
- API keys/tokens → `[REDACTED]`
- Phone numbers → `+1234567890`
- Account names → "Account A", "Account B"
- Sync errors → Redact sensitive error messages
- Internal UUIDs → Keep actual values (needed for FK references)

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

### TASK 5.3: Document Integration-Specific Details (1 hour)

For each integration table, document:

#### A) Motopress Integration Details

**Overview:**
- **Platform:** Motopress Hotel Booking (WordPress PMS plugin)
- **Integration Type:** REST API
- **API Docs:** https://motopress.com/documentation/hotel-booking/
- **Sync Direction:** One-way (Motopress → MUVA)
- **Sync Frequency:** Manual + Webhook-triggered

**Key Tables:**
- `motopress_accommodations` - Synced properties
- `motopress_accommodation_units` - Synced rooms/units
- `motopress_room_types` - Room type mapping
- `motopress_sync_log` - Sync activity audit trail

**Example Sync Flow:**
```
1. User clicks "Sync with Motopress" in dashboard
2. API call: GET /motopress/accommodations
3. Compare with local `accommodations` table
4. Insert/update `motopress_accommodations` records
5. Log result in `motopress_sync_log`
```

**Common Query Patterns:**
```sql
-- Pattern 1: Find Motopress properties needing sync
SELECT ma.*, a.name AS local_name
FROM motopress_accommodations ma
LEFT JOIN accommodations a ON ma.accommodation_id = a.id
WHERE ma.last_synced_at < NOW() - INTERVAL '24 hours'
  OR ma.sync_status = 'error';

-- Pattern 2: Get sync history for a property
SELECT * FROM motopress_sync_log
WHERE motopress_accommodation_id = '[ID]'
ORDER BY created_at DESC
LIMIT 20;

-- Pattern 3: Compare Motopress vs local data
SELECT
  ma.motopress_id,
  ma.name AS motopress_name,
  a.name AS local_name,
  ma.last_synced_at
FROM motopress_accommodations ma
JOIN accommodations a ON ma.accommodation_id = a.id
WHERE ma.tenant_id = '[TENANT_ID]';
```

#### B) Airbnb Integration Details

**Overview:**
- **Platform:** Airbnb (Vacation rental marketplace)
- **Integration Type:** iCalendar feeds + API (limited)
- **API Docs:** https://www.airbnb.com/help/article/99
- **Sync Direction:** Two-way (calendar sync)
- **Sync Frequency:** Hourly (calendar), Manual (properties)

**Key Tables:**
- `airbnb_accommodations` - Properties linked to Airbnb
- `airbnb_calendar_sync_status` - Sync status per property
- `airbnb_sync_log` - Sync activity audit trail
- `ics_feed_configurations` - iCalendar feed URLs

**Example Sync Flow:**
```
1. Cron job triggers hourly calendar sync
2. Fetch iCalendar feed: GET [ics_feed_url]
3. Parse VEVENT entries for bookings
4. Compare with `calendar_events` table
5. Insert/update events, log in `airbnb_sync_log`
6. Update `airbnb_calendar_sync_status`
```

**Common Query Patterns:**
```sql
-- Pattern 1: Find Airbnb properties with stale calendars
SELECT aa.*, acs.last_synced_at
FROM airbnb_accommodations aa
JOIN airbnb_calendar_sync_status acs ON aa.id = acs.airbnb_accommodation_id
WHERE acs.last_synced_at < NOW() - INTERVAL '2 hours'
  OR acs.sync_status = 'error';

-- Pattern 2: Get recent Airbnb sync errors
SELECT * FROM airbnb_sync_log
WHERE sync_status = 'error'
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Pattern 3: List all properties with Airbnb integration enabled
SELECT a.*, aa.airbnb_id, aa.ics_feed_url
FROM accommodations a
JOIN airbnb_accommodations aa ON a.id = aa.accommodation_id
WHERE a.tenant_id = '[TENANT_ID]'
  AND aa.is_active = true;
```

#### C) WhatsApp Business Integration Details

**Overview:**
- **Platform:** WhatsApp Business API
- **Integration Type:** Cloud API / On-Premises API
- **API Docs:** https://developers.facebook.com/docs/whatsapp
- **Sync Direction:** Two-way (send/receive messages)
- **Sync Frequency:** Real-time (webhooks)

**Key Tables:**
- `whatsapp_business_accounts` - Connected WhatsApp Business accounts
- `whatsapp_phone_numbers` - Phone numbers associated with accounts
- `whatsapp_messages` - Message history (sent/received)
- `whatsapp_message_templates` - Pre-approved message templates

**Example Message Flow:**
```
1. Guest sends WhatsApp message
2. Webhook: POST /api/webhooks/whatsapp
3. Parse message, create `whatsapp_messages` record
4. Create/update `guest_conversations` record
5. Notify staff via WebSocket
```

**Common Query Patterns:**
```sql
-- Pattern 1: Get WhatsApp messages for a conversation
SELECT wm.*, gc.id AS conversation_id
FROM whatsapp_messages wm
JOIN guest_conversations gc ON wm.guest_phone_number = gc.guest_phone
WHERE gc.id = '[CONVERSATION_ID]'
ORDER BY wm.created_at;

-- Pattern 2: Find active WhatsApp-enabled accommodations
SELECT a.*, wba.business_account_name, wpn.phone_number
FROM accommodations a
JOIN whatsapp_business_accounts wba ON a.tenant_id = wba.tenant_id
JOIN whatsapp_phone_numbers wpn ON wba.id = wpn.business_account_id
WHERE a.tenant_id = '[TENANT_ID]'
  AND wba.is_active = true;

-- Pattern 3: Get approved message templates for tenant
SELECT * FROM whatsapp_message_templates
WHERE tenant_id = '[TENANT_ID]'
  AND status = 'approved'
ORDER BY name;
```

#### D) Generic Integration Support

**integration_configs:**
- Generic key-value config storage for integrations
- JSON fields for flexible configuration
- Used for API keys, webhooks, custom settings

**ics_feed_configurations:**
- iCalendar feed URLs for calendar sync
- Supports multiple platforms (Airbnb, Booking.com, etc.)
- Tenant-specific feed configurations

**sync_history:**
- Historical sync records across all integrations
- Audit trail for compliance
- Performance monitoring

---

### TASK 5.4: Document Query Patterns and Performance (45 min)

For each integration table, identify 2-3 common query patterns:

**Focus on:**
1. **Sync queries** - Finding records needing sync, checking sync status
2. **Mapping queries** - Linking external IDs to internal records
3. **Audit queries** - Reviewing sync history, debugging errors
4. **Integration status** - Checking if integrations are active/healthy

**Performance Considerations:**
- External ID lookups must be fast (frequent API callbacks)
- Sync status queries run on cron jobs (need indexes)
- Tenant isolation is critical (multi-tenant platform)
- Sync logs grow over time (consider retention policies)

---

### TASK 5.5: Add Migration Notes (30 min)

**Critical Integration Migration Rules:**

#### DO:
- ✅ **Preserve external IDs** - MUST remain unchanged (breaks integration if modified)
- ✅ **Copy sync logs** - Audit trail for compliance
- ✅ **Verify tenant mapping** - Ensure `tenant_id` FKs are correct
- ✅ **Test integrations post-migration** - Re-authenticate if necessary
- ✅ **Document integration credentials** - May need to re-enter API keys

#### DON'T:
- ❌ **Modify external IDs** - Will cause duplicate syncs or data loss
- ❌ **Skip sync status fields** - Causes full re-sync on first run
- ❌ **Truncate without CASCADE** - May orphan related records
- ❌ **Forget to migrate credentials** - Stored in `integration_configs` or ENV vars

**Special Handling:**

**Motopress:**
- External IDs are WordPress post IDs (integers)
- Sync status determines if property needs re-fetch
- Room type mappings are tenant-specific

**Airbnb:**
- iCalendar feed URLs contain authentication tokens
- Calendar sync status tracks last successful fetch
- Empty tables (airbnb_mphb_imported_reservations) can be skipped

**WhatsApp:**
- Phone numbers must be verified with Meta
- Message templates require re-approval if business account changes
- Webhooks need to be re-registered after migration

**General:**
- Test all integrations after migration (API keys may expire)
- Re-run initial sync to verify connectivity
- Monitor sync logs for 48 hours post-migration

---

## OUTPUT FILE: `docs/database/TABLES_INTEGRATIONS.md`

**Structure:**

```markdown
# INTEGRATION TABLES DOCUMENTATION

**Purpose:** External platform integrations (Motopress, Airbnb, WhatsApp)
**Tables Documented:** [COUNT]
**Total Rows:** [SUM of all integration rows]
**Documentation Template:** Based on TABLES_BASE.md

**Last Updated:** [DATE] by @agent-database-agent

---

## Overview

Integration tables connect MUVA Chat with external platforms. These tables are:
- **Platform-specific:** Grouped by integration (Motopress, Airbnb, WhatsApp)
- **External ID mapping:** Link internal records to external systems
- **Sync-focused:** Track sync status, logs, and errors
- **Tenant-isolated:** Each tenant has separate integration configs

**Integrations:**

1. **Motopress** (Property Management System)
   - Purpose: Sync accommodations and units from WordPress PMS
   - Direction: One-way (Motopress → MUVA)
   - Frequency: Manual + Webhook

2. **Airbnb** (Vacation Rental Platform)
   - Purpose: Sync calendar availability and reservations
   - Direction: Two-way (read/write calendars)
   - Frequency: Hourly (iCalendar feeds)

3. **WhatsApp Business** (Messaging Platform)
   - Purpose: Send/receive guest messages via WhatsApp
   - Direction: Two-way (real-time messaging)
   - Frequency: Real-time (webhooks)

4. **Generic Support** (Configuration and History)
   - `integration_configs` - Key-value config storage
   - `ics_feed_configurations` - iCalendar feed URLs
   - `sync_history` - Historical sync audit trail

---

## Navigation

### Motopress Integration
- [motopress_accommodations](#motopress_accommodations) - Synced properties (Level [X], [ROW_COUNT] rows)
- [motopress_accommodation_units](#motopress_accommodation_units) - Synced units (Level [X], [ROW_COUNT] rows)
- [motopress_room_types](#motopress_room_types) - Room type mapping (Level [X], [ROW_COUNT] rows)
- [motopress_sync_log](#motopress_sync_log) - Sync logs (Level [X], [ROW_COUNT] rows)

### Airbnb Integration
- [airbnb_accommodations](#airbnb_accommodations) - Linked properties (Level [X], [ROW_COUNT] rows)
- [airbnb_calendar_sync_status](#airbnb_calendar_sync_status) - Sync status (Level [X], [ROW_COUNT] rows)
- [airbnb_sync_log](#airbnb_sync_log) - Sync logs (Level [X], [ROW_COUNT] rows)

### WhatsApp Business Integration
- [whatsapp_business_accounts](#whatsapp_business_accounts) - Business accounts (Level [X], [ROW_COUNT] rows)
- [whatsapp_phone_numbers](#whatsapp_phone_numbers) - Phone numbers (Level [X], [ROW_COUNT] rows)
- [whatsapp_messages](#whatsapp_messages) - Message history (Level [X], [ROW_COUNT] rows)
- [whatsapp_message_templates](#whatsapp_message_templates) - Templates (Level [X], [ROW_COUNT] rows)

### Generic Support
- [integration_configs](#integration_configs) - Config storage (Level [X], 3 rows)
- [ics_feed_configurations](#ics_feed_configurations) - iCal feeds (Level [X], 9 rows)
- [sync_history](#sync_history) - Historical logs (Level [X], 85 rows)

---

[THEN: Complete documentation for each table using template]

## motopress_accommodations

[FULL TEMPLATE CONTENT including Integration-Specific Details]

---

[... Continue for all integration tables, grouped by platform ...]

---

## Summary

**Total Integration Tables:** [COUNT]
**Total Rows:** [SUM]
**Total Size:** [SUM]
**Dependency Levels:** [RANGE]

**Migration Priority:** MEDIUM (important but not blocking core operations)
**Migration Order:** Level 2-4 (after base and catalog tables)

**Integration Status:**
- **Motopress:** [COUNT] tables, [ROW_COUNT] total rows
- **Airbnb:** [COUNT] tables, [ROW_COUNT] total rows
- **WhatsApp:** [COUNT] tables, [ROW_COUNT] total rows
- **Generic:** [COUNT] tables, [ROW_COUNT] total rows

**Post-Migration Requirements:**
- ✅ Test all integrations (API connectivity)
- ✅ Re-authenticate if necessary
- ✅ Re-register webhooks (WhatsApp, Airbnb)
- ✅ Run initial sync to verify data integrity
- ✅ Monitor sync logs for 48 hours

---

## Related Documentation

- [TABLES_BASE.md](./TABLES_BASE.md) - Foundational tables
- [TABLES_CATALOGS.md](./TABLES_CATALOGS.md) - Reference data
- [TABLES_OPERATIONS.md](./TABLES_OPERATIONS.md) - Core business tables
- [MIGRATION_ORDER.md](./MIGRATION_ORDER.md) - Dependency tree
- [docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md](../../workflows/ACCOMMODATION_SYNC_UNIVERSAL.md) - Sync workflows

```

---

## SUCCESS CRITERIA

- [ ] 9-11 integration tables identified and grouped by platform
- [ ] Each table documented with complete schema
- [ ] Primary keys, Foreign keys, Indexes documented
- [ ] RLS policies documented for each table
- [ ] Triggers documented (if any)
- [ ] Sample data included (anonymized, sensitive data redacted)
- [ ] Integration-specific details documented (API, sync flow, frequency)
- [ ] 2-3 common query patterns per table
- [ ] Performance notes and sync considerations
- [ ] Migration notes with external ID preservation rules
- [ ] TABLES_INTEGRATIONS.md file created (~1000-1200 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 5.1 Identify Integration Tables | 30 min | 0.5 hr |
| 5.2 Extract Schema (9-11 tables) | 2.0 hr | 2.5 hr |
| 5.3 Integration Details | 1.0 hr | 3.5 hr |
| 5.4 Query Patterns & Performance | 45 min | 4.25 hr |
| 5.5 Migration Notes | 30 min | 4.75 hr |
| **File Creation & Formatting** | 45 min | **5.5 hr** |

**Realistic Total:** 3-4 hours (excludes buffer, assumes integrations are well-documented in codebase)

---

## NEXT STEPS AFTER COMPLETION

Once PART5 is complete:

1. Verify TABLES_INTEGRATIONS.md follows template structure
2. Check that all integration tables have tenant isolation RLS
3. Document any missing integration credentials (API keys)
4. Proceed to PART6 (TABLES_EMBEDDINGS.md)

**Ready for:** PLAN_PART6_TABLES_EMBEDDINGS.md
