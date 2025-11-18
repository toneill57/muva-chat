# Security Fixes - October 2025

**Date Created:** October 6, 2025
**Last Updated:** October 6, 2025
**Status:** 2/3 COMPLETED ✅ | 1 Pending ⏳

---

## 📋 Overview

This document tracks the **3 critical security issues** identified in the MUVA database audit:

1. ✅ **COMPLETED:** 4 tables without Row Level Security (RLS) - **FIXED Oct 6, 2025**
2. ✅ **COMPLETED:** 28 functions without immutable `search_path` - **FIXED Oct 6, 2025**
3. ⏳ **PENDING:** PostgreSQL version upgrade (manual action required)

---

## 🎯 Execution Plan

### Week 1 Schedule

| Day | Task | Duration | Priority |
|-----|------|----------|----------|
| **Day 1** | Fix #1: Enable RLS on 4 tables | 1-2 hours | 🔴 CRITICAL |
| **Day 2** | Verify RLS + Test | 1 hour | 🔴 CRITICAL |
| **Day 3** | Fix #2: Fix function search_path | 2-4 hours | ⚠️ HIGH |
| **Day 4** | Verify functions + Test | 1 hour | ⚠️ HIGH |
| **Day 5** | Fix #3: Upgrade Postgres | 0.5-1 hour | ⚠️ HIGH |

**Total:** ~6-9 hours over 5 days

---

## ✅ FIX #1: Enable RLS on 4 Tables (COMPLETED)

**Status:** ✅ COMPLETED - October 6, 2025

### Problem (RESOLVED)

These tables were accessible without restrictions by any authenticated user:
- ✅ `public.accommodation_units`
- ✅ `public.accommodation_units_manual_chunks`
- ✅ `public.staff_conversations`
- ✅ `public.staff_messages`

**Impact (MITIGATED):** Multi-tenant data leak, GDPR violation

### Solution Applied

✅ Migration `20251006010000_enable_rls_security_fix.sql` successfully applied
✅ RLS enabled on all 4 tables
✅ 16 security policies created (4 tables × 4 operations: SELECT, INSERT, UPDATE, DELETE)

### Execution Steps

**Step 1: Review the Migration**

```bash
# View the migration file
cat supabase/migrations/20251006010000_enable_rls_security_fix.sql

# File size: ~13KB
# Contains:
#   - 4 ALTER TABLE statements (enable RLS)
#   - 16 CREATE POLICY statements (SELECT, INSERT, UPDATE, DELETE × 4 tables)
```

**Step 2: Apply to Production**

**Option A: Supabase CLI (RECOMMENDED)**

```bash
# 1. Link to production project
supabase link --project-ref iyeueszchbvlutlcmvcb

# 2. Push migration
supabase db push

# Expected output:
# ✅ Migration applied: 20251006010000_enable_rls_security_fix.sql
```

**Option B: Supabase Dashboard**

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/iyeueszchbvlutlcmvcb/sql)
2. Copy contents of `supabase/migrations/20251006010000_enable_rls_security_fix.sql`
3. Paste into SQL editor
4. Click **"Run"**
5. Verify: **"Success. Rows 0"** (DDL operations don't return rows)

**Step 3: Verify RLS Enabled**

```sql
-- Run this query in Supabase SQL Editor
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'accommodation_units',
    'accommodation_units_manual_chunks',
    'staff_conversations',
    'staff_messages'
  );
```

**Expected Output:**
```
tablename                          | rls_enabled
-----------------------------------|-------------
accommodation_units                | true
accommodation_units_manual_chunks  | true
staff_conversations                | true
staff_messages                     | true
```

✅ All 4 tables should show `rls_enabled = true`

**Step 4: Verify Policies Created**

```sql
-- Run this query in Supabase SQL Editor
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'accommodation_units',
    'accommodation_units_manual_chunks',
    'staff_conversations',
    'staff_messages'
  )
ORDER BY tablename, cmd;
```

**Expected Output:** 16 rows (4 tables × 4 operations)

**Step 5: Test Functionality**

```bash
# Run E2E tests to verify no regressions
pnpm run test:e2e -- staff-chat.spec.ts

# Test staff chat (uses staff_conversations + staff_messages)
# Should still work correctly

# Test accommodation search
# Should still return results for tenant
```

**All tests must pass** ✅

### Rollback (if needed)

If tests fail, rollback immediately:

```sql
-- Execute in Supabase SQL Editor
-- WARNING: This removes security - only use in emergency

-- Drop policies
DROP POLICY IF EXISTS "accommodation_units_tenant_select" ON public.accommodation_units;
-- ... (copy all DROP statements from migration file)

-- Disable RLS
ALTER TABLE public.accommodation_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accommodation_units_manual_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages DISABLE ROW LEVEL SECURITY;
```

Then investigate issue before re-applying.

---

## ✅ FIX #2: Fix Function Search Path (COMPLETED)

**Status:** ✅ COMPLETED - October 6, 2025

### Problem (RESOLVED)

28 functions (`match_*()` search functions) lacked `SET search_path = public, pg_temp`, making them vulnerable to SQL injection if an attacker modifies the search_path.

**Impact (MITIGATED):** Potential SQL injection, privilege escalation

### Solution Applied

✅ Helper migration `20251006010100_add_execute_sql_helper.sql` applied
✅ Script `scripts/fix-function-search-path.ts` executed successfully
✅ **28/28 functions** updated with `SET search_path = public, pg_temp`
✅ **0 functions** remain vulnerable

### Execution Steps

**Step 1: Apply Helper Migration**

First, create the `execute_sql()` helper function needed by the script:

```bash
# Apply the helper migration
supabase db push

# This applies: 20251006010100_add_execute_sql_helper.sql
```

**Step 2: Run Script in Dry-Run Mode**

```bash
# Preview what will be changed (NO actual changes)
NEXT_PUBLIC_SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
npx tsx scripts/fix-function-search-path.ts --dry-run

# Expected output:
# 🔍 Found 52 functions to fix:
#   1. match_hotels_documents(...)
#   2. match_sire_documents(...)
#   ...
# 🔍 This was a DRY RUN. Run without --dry-run to apply changes.
```

**Step 3: Review Sample Function**

```bash
# See detailed changes for first 5 functions
NEXT_PUBLIC_SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
npx tsx scripts/fix-function-search-path.ts --dry-run --verbose | head -100
```

Review the output to ensure changes look correct.

**Step 4: Apply Fixes**

```bash
# Apply changes (removes --dry-run flag)
NEXT_PUBLIC_SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
npx tsx scripts/fix-function-search-path.ts

# Expected output:
# 📊 Found 52 functions to fix:
# ✅ Fixed: match_hotels_documents
# ✅ Fixed: match_sire_documents
# ...
# ✅ All fixes applied successfully!
```

**Step 5: Verify Functions Updated**

```sql
-- Run this query in Supabase SQL Editor
SELECT
  p.proname as function_name,
  p.proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'match_%'
  AND EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) AS cfg
    WHERE cfg LIKE 'search_path=%'
  )
ORDER BY p.proname
LIMIT 10;
```

**Expected:** All `match_*` functions should now have `search_path=public, pg_temp` in `config_settings`.

**Step 6: Test Vector Search**

```bash
# Test that vector search still works
pnpm run test:e2e -- guest-chat-messaging.spec.ts

# Verify:
# - Guest chat responses still relevant
# - Entity tracking works
# - Search results accurate
```

### Troubleshooting

**If script fails:**

1. Check error message in output
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. Verify `execute_sql()` function exists:

```sql
SELECT proname FROM pg_proc WHERE proname = 'execute_sql';
```

4. Run in verbose mode to see exact queries:

```bash
npx tsx scripts/fix-function-search-path.ts --dry-run --verbose
```

---

## ⏳ FIX #3: Upgrade PostgreSQL (PENDING - MANUAL ACTION REQUIRED)

**Status:** ⏳ PENDING - Requires manual action via Supabase Dashboard

### Problem

PostgreSQL version has security patches available.

**Current:** PostgreSQL 17.4
**Target:** Latest stable (17.5+ with security patches)
**Priority:** HIGH (recommended within 7 days)

**Impact:** Exposure to known vulnerabilities

### Solution

⚠️ **Manual upgrade required via Supabase Dashboard** (cannot be automated via CLI/MCP)

### Execution Steps

See detailed guide: [`POSTGRES_UPGRADE_GUIDE.md`](./POSTGRES_UPGRADE_GUIDE.md)

**Quick Steps:**

1. **Create backup** (Supabase Dashboard → Database → Backups)
2. **Run pre-tests** (`pnpm test && pnpm run test:e2e`)
3. **Upgrade** (Supabase Dashboard → Settings → Infrastructure → Upgrade)
4. **Wait** (~5-10 minutes)
5. **Verify** (Check version, run health checks, monitor logs)

**Timeline:** 30 minutes (+ 24h monitoring)

---

## ✅ Final Verification

After all 3 fixes are applied, run these checks:

### 1. Security Audit

```bash
# Check for remaining security issues
# Via MCP tool (if available)
supabase db advisors --type security

# Expected: No critical issues
```

### 2. RLS Status

```sql
-- All tables should have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- Expected: 0 rows (or only tables that intentionally don't need RLS)
```

### 3. Function Search Path

```sql
-- All match_* functions should have search_path set
SELECT COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE 'match_%'
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(p.proconfig) AS cfg
    WHERE cfg LIKE 'search_path=%'
  );

-- Expected: 0
```

### 4. Postgres Version

```sql
SELECT version();

-- Expected: PostgreSQL 17.x.x (newer than 17.4.1.075)
```

### 5. Full Test Suite

```bash
# Run all tests
pnpm test
pnpm run test:e2e

# Expected: All pass ✅
```

---

## 📊 Progress Tracking

Copy this checklist to track progress:

### Fix #1: RLS (CRITICAL)
- [ ] Review migration file
- [ ] Apply migration to production
- [ ] Verify RLS enabled (4 tables)
- [ ] Verify policies created (16 policies)
- [ ] Run tests
- [ ] Monitor logs (24h)

### Fix #2: Function Search Path (HIGH)
- [ ] Apply helper migration
- [ ] Run script in dry-run mode
- [ ] Review changes
- [ ] Apply fixes
- [ ] Verify functions updated
- [ ] Run tests
- [ ] Monitor logs (24h)

### Fix #3: Postgres Upgrade (HIGH)
- [ ] Create backup
- [ ] Run pre-tests
- [ ] Upgrade Postgres
- [ ] Verify version
- [ ] Run post-tests
- [ ] Monitor logs (24h)

### Final Steps
- [ ] Run final security audit
- [ ] Update SNAPSHOT.md
- [ ] Update README.md
- [ ] Commit changes
- [ ] Notify team

---

## 🆘 Support

If you encounter issues:

1. **Check logs:**
   ```bash
   supabase logs postgres --level error --tail 100
   ```

2. **Contact Supabase Support:**
   - Dashboard: https://supabase.com/dashboard/support
   - Discord: https://discord.supabase.com

3. **Internal team:**
   - Database issues: @database-agent
   - Backend issues: @backend-developer
   - Infrastructure: @infrastructure-monitor

---

**Created by:** @database-agent + @backend-developer + @infrastructure-monitor
**Last Updated:** October 6, 2025
