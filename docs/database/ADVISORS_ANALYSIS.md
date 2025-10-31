
#### 2-4. RLS Issues in Staging (AUTO-CORRECTED BY MIGRATION) ✅

**tenant_registry (Staging only):**
- Policies created but RLS not enabled
- **FIX:** Migration copies production config → RLS enabled automatically

**user_tenant_permissions (Staging only):**
- Policies created but RLS not enabled
- **FIX:** Migration copies production config → RLS enabled automatically

These 3 errors disappear after migration from production.

---

#### 5. Security Definer View: `guest_chat_performance_monitor` ⚠️ BOTH
**Severity:** HIGH
**Impact:** View executes with creator permissions, bypasses RLS
**Remediation:**
```sql
-- Backup current definition
CREATE TABLE _backup_views AS
SELECT definition FROM pg_views
WHERE viewname = 'guest_chat_performance_monitor';

-- Recreate without SECURITY DEFINER
DROP VIEW public.guest_chat_performance_monitor;

CREATE VIEW public.guest_chat_performance_monitor
WITH (security_invoker = true)  -- PostgreSQL 15+
AS
SELECT
  gc.id,
  gc.tenant_id,
  -- ... [copy existing definition]
FROM guest_conversations gc
-- ... [rest of definition];
```
**Time:** 1-2 hours
**Priority:** MEDIUM (fix post-migration)

---

### WARN Level (18 Advisors)

#### Functions with Mutable search_path (15 functions)
**Severity:** MEDIUM
**Impact:** Risk of SQL injection via namespace hijacking

**Affected Functions:**
1. `cleanup_old_sync_logs`
2. `update_updated_at_column`
3. `propagate_parent_booking`
4. `get_accommodation_units_by_ids`
5. `update_airbnb_motopress_comparison_updated_at`
6. `map_public_to_hotel_accommodation_id`
7. `search_code_embeddings`
8. `get_accommodation_tenant_id`
9. `insert_accommodation_unit` (2 signatures)
10. `get_availability`
11. `check_event_overlap`
12. `test_ddl_execution`
13. `get_accommodation_unit_by_name`

**Remediation (Bulk Fix):**
```sql
-- Template for each function
ALTER FUNCTION public.function_name()
SET search_path = public, pg_catalog;

-- Or recreate with SET in definition
CREATE OR REPLACE FUNCTION public.function_name()
RETURNS ...
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
...
$$;
```
**Time:** 4-6 hours (15 functions)
**Priority:** MEDIUM (fix post-migration)

---

#### Extension in Public Schema: `vector`
**Severity:** LOW
**Impact:** Namespace pollution, harder to upgrade extension
**Remediation:**
```sql
-- ⚠️ COMPLEX - Requires maintenance window
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Update all references to vector types
-- (This affects 22 columns across 13 tables)
```
**Time:** 2-4 hours + downtime
**Priority:** LOW (defer to maintenance window)

---

#### Auth Configuration Issues (Production only)
1. **Leaked Password Protection Disabled**
   - Not validating against HaveIBeenPwned
   - Fix: Enable in Supabase Dashboard → Auth → Password Policy

2. **Insufficient MFA Options**
   - Few MFA methods enabled
   - Fix: Enable TOTP/SMS in Dashboard

3. **Vulnerable Postgres Version**
   - Postgres 17.4.1.075 has newer patches
   - Fix: Coordinate upgrade with Supabase (requires downtime)

**Time:** 1-2 hours
**Priority:** LOW (configuration, not schema issues)

---

## Performance Advisors (212 Total)

### Analysis Limitation
212 advisors exceeded query limits. Based on Supabase linter patterns, most likely issues:

### Pattern 1: Missing Indexes on Foreign Keys (~80 advisors)
**Impact:** Slow JOINs on foreign key relationships

**Expected Affected Tables:**
- `chat_messages.conversation_id`
- `guest_reservations.tenant_id`
- `accommodation_units.tenant_id`
- All hotels.* schema tables with FKs

**Remediation:**
```sql
-- Create indexes on all FK columns without indexes
CREATE INDEX CONCURRENTLY idx_chat_messages_conversation_id
ON public.chat_messages(conversation_id);

CREATE INDEX CONCURRENTLY idx_guest_reservations_tenant_id
ON public.guest_reservations(tenant_id);

-- Repeat for ~30-50 critical FKs
```
**Time:** 2-3 hours
**Priority:** HIGH (significant query performance impact)

---

### Pattern 2: Unused Indexes (~50 advisors)
**Impact:** Wasted storage, slower writes

**Remediation:**
```sql
-- Identify unused indexes
SELECT
  schemaname,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- DROP after confirming not used in 90+ days
DROP INDEX IF EXISTS unused_index_name;
```
**Time:** 1-2 hours
**Priority:** MEDIUM (storage optimization)

---

### Pattern 3: Query Optimizations (~80 advisors)
**Impact:** Specific slow queries

**Remediation:**
- Analyze `pg_stat_statements` for slowest queries
- Add covering indexes
- Rewrite inefficient queries
- Use query plan analysis

**Time:** Variable (2-20 hours depending on complexity)
**Priority:** MEDIUM (case-by-case basis)

---

## Remediation Plan

### Phase 1: Pre-Migration (OPTIONAL - 2 hours)
**Goal:** Reduce attack surface during migration

**Tasks:**
1. Enable RLS on `code_embeddings` (production + staging)
2. (Optional) Fix critical functions used in migration

**Recommendation:** SKIP - Migration uses service_role, bypasses RLS anyway

---

### Phase 2: Post-Migration (PRIORITY - 8-10 hours)

#### Day 1: Validate Auto-Corrections (30 min)
```bash
# Check that migration fixed 3 staging errors
mcp__supabase__get_advisors(
  project_id="qlvkgniqcoisbnwwjfte",
  type="security"
)
# Expected: 20 → 17 advisors (3 auto-fixed)
```

#### Day 1-2: Critical Security Fixes (6 hours)
1. Enable RLS on `code_embeddings` (30 min)
2. Fix 15 functions with mutable search_path (4-6 hours)
3. Validate advisor reduction: 17 → ~2-3

#### Day 2-3: Important Security Fixes (2 hours)
1. Recreate SECURITY DEFINER view (1-2 hours)
2. Final validation: 2-3 → <5 advisors total

**Target:** 20 security advisors → <5 (75% reduction)

---

### Phase 3: Performance Optimization (SPRINTS - 20-40 hours)

#### Sprint 1: Missing FK Indexes (1 week)
- Create indexes on all FKs without indexes
- Validate with pg_stat_user_indexes
- **Target:** Reduce ~80 advisors

#### Sprint 2: Unused Resources (1 week)
- Identify indexes unused in 90+ days
- DROP after team approval
- **Target:** Reduce ~30 advisors

#### Sprint 3: Query Optimization (2-3 weeks)
- Analyze pg_stat_statements
- Optimize top 20 slowest queries
- **Target:** Reduce ~50 advisors

#### Sprint 4: Schema Cleanup (1 week)
- Move vector extension to schema (requires downtime)
- Consolidate redundant structures
- **Target:** Reduce ~10 advisors

**Long-term Goal:** 212 performance advisors → <50 (75% reduction over 3 months)

---

## Timeline Summary

| Phase | Duration | Advisors Fixed | Status |
|-------|----------|----------------|--------|
| Pre-Migration (optional) | 2-4 hours | 1-2 | SKIP recommended |
| Migration | 1.5-2.5 hours | 3 auto-fixed | Documented in MIGRATION_ORDER.md |
| Post-Migration Security | 8-10 hours | 15+ | PRIORITY |
| Performance Sprint 1 | 1 week | ~80 | Background task |
| Performance Sprint 2 | 1 week | ~30 | Background task |
| Performance Sprint 3 | 2-3 weeks | ~50 | Background task |
| Performance Sprint 4 | 1 week | ~10 | Long-term |

---

## Success Criteria

### Immediate (Post-Phase 2)
- ✅ Security advisors: 20 → <5 (75% reduction)
- ✅ All ERROR-level issues resolved
- ✅ Functions with search_path fixed
- ✅ RLS enabled on 41/41 tables (100%)

### Short-Term (1 month)
- ✅ Performance advisors: 212 → <100 (50% reduction)
- ✅ Missing FK indexes created (top 30)
- ✅ Unused indexes removed

### Long-Term (3 months)
- ✅ Performance advisors: <50 (75% reduction)
- ✅ All critical queries <500ms p95
- ✅ Schema fully optimized and documented

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security gap during remediation | MEDIUM | MEDIUM | Staging not publicly exposed |
| Performance advisors slow migration | LOW | LOW | Use service_role with manual optimization |
| View recreation breaks app | MEDIUM | MEDIUM | Backup definition, test queries first |
| Extension move requires downtime | HIGH | MEDIUM | Defer to planned maintenance window |

---

## Commands Reference

### Check Advisors
```bash
# Security
mcp__supabase__get_advisors(
  project_id="qlvkgniqcoisbnwwjfte",
  type="security"
)

# Performance (sample)
mcp__supabase__get_advisors(
  project_id="qlvkgniqcoisbnwwjfte",
  type="performance"
)
```

### Validate RLS
```sql
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p
   WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY rls_enabled, tablename;
```

### Find Missing FK Indexes
```sql
WITH foreign_keys AS (
  SELECT
    conrelid::regclass AS table_name,
    a.attname AS column_name
  FROM pg_constraint
  JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = ANY(conkey)
  WHERE contype = 'f' AND connamespace = 'public'::regnamespace
)
SELECT
  fk.table_name,
  fk.column_name,
  CASE
    WHEN i.indexname IS NULL THEN '❌ MISSING INDEX'
    ELSE '✅ ' || i.indexname
  END as index_status
FROM foreign_keys fk
LEFT JOIN pg_indexes i
  ON i.tablename = fk.table_name::text
  AND i.indexdef LIKE '%' || fk.column_name || '%'
WHERE i.indexname IS NULL
ORDER BY fk.table_name;
```

---

## Next Steps

1. ✅ Complete PHASE 1: Documentation (this document)
2. Execute PHASE 2: Migration (see MIGRATION_ORDER.md)
3. Execute PHASE 2: Remediation (following this plan)
4. Monitor progress with advisor queries
5. Iterate on performance optimization sprints

---

**Maintainers:** MUVA Engineering Team
**Contact:** Security issues → `@agent-database-agent`
**Reference:** https://supabase.com/docs/guides/database/database-linter
