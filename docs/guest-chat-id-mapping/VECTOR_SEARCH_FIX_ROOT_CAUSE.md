# Vector Search Fix - Root Cause Analysis & Prevention

**Date:** November 3, 2025
**Issue:** Guest chat fails to find accommodation information
**Symptoms:** "operator does not exist: extensions.vector <=> extensions.vector"

---

## 🔴 Root Cause

### The Problem

PostgreSQL functions using pgvector's cosine distance operator (`<=>`) were failing because:

1. **pgvector extension** is installed in the `extensions` schema (Supabase default)
2. **RPC functions** only had `search_path = 'public', 'hotels'`
3. **Operator resolution** cannot find `<=>` without `extensions` in search_path

### Why It Keeps Breaking

**CRITICAL ISSUE:** Manual database fixes are NOT tracked in migrations.

```
┌─────────────────────────────────────────────────────────────┐
│  WHAT HAPPENS                                               │
├─────────────────────────────────────────────────────────────┤
│  1. Problem discovered → Fix applied directly in Supabase   │
│  2. Fix works → Production runs fine                        │
│  3. Time passes...                                          │
│  4. Database restore / migration replay / environment reset │
│  5. ❌ FIX IS LOST - Functions revert to broken state       │
│  6. Guest chat breaks again                                 │
│  7. Repeat from step 1... 🔄                                │
└─────────────────────────────────────────────────────────────┘
```

**This has happened MULTIPLE times because:**
- ✅ Fixes applied directly via Supabase dashboard
- ✅ Fixes applied via ad-hoc SQL scripts
- ❌ **NO migration files created**
- ❌ **NO version control**
- ❌ **NO deployment automation**

---

## 🎯 Solution Applied (Nov 3, 2025)

### Immediate Fix

Fixed **5 critical functions** by adding `'extensions'` to search_path:

1. `match_unit_manual_chunks` (accommodation manual search)
2. `map_hotel_to_public_accommodation_id` (ID mapping)
3. `map_hotel_to_public_accommodation_id_v1` (fallback v1)
4. `map_hotel_to_public_accommodation_id_v2` (enhanced v2)
5. `match_muva_documents` (tourism content search) ⭐ **MOST CRITICAL**

### Changes Applied

```sql
-- BEFORE (BROKEN):
SET search_path TO 'public', 'hotels'
SET search_path TO 'public', 'pg_temp'

-- AFTER (FIXED):
SET search_path TO 'public', 'hotels', 'extensions'
SET search_path TO 'public', 'extensions', 'pg_temp'
```

### Migration Created

**File:** `supabase/migrations/20251103000001_fix_vector_search_path.sql`

This migration:
- ✅ Recreates all 5 functions with correct search_path
- ✅ Includes verification queries
- ✅ Tests vector operator accessibility
- ✅ Is version-controlled in git
- ✅ Will be applied automatically on deploys

---

## 🛡️ Prevention Strategy

### 1. Migration-First Policy

**RULE:** ALL database changes MUST go through migrations.

```bash
# ❌ NEVER DO THIS:
Execute SQL directly in Supabase dashboard
Run ad-hoc tsx scripts that alter schema
Apply fixes via psql without migration file

# ✅ ALWAYS DO THIS:
1. Create migration file: supabase/migrations/YYYYMMDDHHMMSS_description.sql
2. Apply via migration system
3. Commit migration to git
4. Deploy via CI/CD
```

### 2. Migration Workflow

```bash
# Create new migration
pnpm dlx tsx scripts/create-migration.ts --name fix_vector_search

# Test locally
pnpm dlx tsx scripts/apply-migrations-dev.ts

# Deploy to staging
git push origin staging  # CI/CD applies migrations

# Deploy to production
git push origin main  # CI/CD applies migrations with approval
```

### 3. CI/CD Integration

The deployment workflow automatically:
1. Runs pending migrations before deploy
2. Validates schema integrity
3. Rollback on failure
4. Logs all changes

**Files:**
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`

### 4. Schema Drift Detection

Run regularly to catch manual changes:

```bash
pnpm dlx tsx scripts/detect-schema-drift.ts --from=production --to=staging
```

---

## 📋 Affected Functions

### Manual Chunks Search (Critical)

```typescript
// File: src/lib/chat-engine/parallel-search.ts
function searchManualChunks(embedding: number[], unitId: string)
  → calls: match_unit_manual_chunks()
  → Status: ✅ FIXED (added 'extensions' to search_path)
```

### Tourism Content Search (Critical)

```typescript
// File: src/lib/chat-engine/parallel-search.ts
function searchTourism(embedding: number[])
  → calls: match_muva_documents()  // ⚠️ NOT match_muva_documents_public!
  → Status: ✅ FIXED (added 'extensions' to search_path)
```

### ID Mapping (Supporting)

```typescript
// File: supabase/migrations/20251103000000_guest_chat_stable_id_fixes.sql
map_hotel_to_public_accommodation_id()
map_hotel_to_public_accommodation_id_v1()
map_hotel_to_public_accommodation_id_v2()
  → Status: ✅ FIXED (added 'extensions' to search_path)
```

---

## 🔍 How to Verify Fix

### 1. Check Function Definitions

```sql
SELECT
  p.proname AS function_name,
  pg_catalog.array_to_string(p.proconfig, E'\n') AS search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'match_unit_manual_chunks',
    'match_muva_documents',
    'map_hotel_to_public_accommodation_id',
    'map_hotel_to_public_accommodation_id_v1',
    'map_hotel_to_public_accommodation_id_v2'
  );
```

**Expected:** All functions should have `'extensions'` in their search_path.

### 2. Test Vector Operator

```sql
-- Should return similarity = 1.0 (identical vectors)
SELECT 1 - ('[0.1,0.2,0.3]'::vector(3) <=> '[0.1,0.2,0.3]'::vector(3)) AS similarity;
```

### 3. Monitor Production Logs

```bash
# SSH into VPS
ssh root@195.200.6.216

# Check for vector operator errors
pm2 logs muva-chat --lines 100 | grep "operator does not exist"
```

**Expected:** NO errors after PM2 restart.

### 4. Test Guest Chat

1. Visit: http://simmerdown.localhost:3000/guest-chat (local)
2. Or: https://simmerdown.muva.chat/guest-chat (production)
3. Ask: "What are the house rules?" (tests manual chunks)
4. Ask: "What are the best beaches nearby?" (tests tourism content)

**Expected:** Chat returns relevant information from both sources.

---

## 📊 Impact Analysis

### Before Fix

```
┌──────────────────────────────────────────────────┐
│ Guest Chat Functionality                         │
├──────────────────────────────────────────────────┤
│ ❌ Manual chunks search: BROKEN                  │
│ ❌ Tourism content search: BROKEN                │
│ ✅ General information: Working                  │
│ ✅ Guest authentication: Working                 │
│                                                  │
│ Result: Chat shows guest name but cannot find   │
│         any accommodation or tourism information │
└──────────────────────────────────────────────────┘
```

### After Fix

```
┌──────────────────────────────────────────────────┐
│ Guest Chat Functionality                         │
├──────────────────────────────────────────────────┤
│ ✅ Manual chunks search: Working                 │
│ ✅ Tourism content search: Working               │
│ ✅ General information: Working                  │
│ ✅ Guest authentication: Working                 │
│                                                  │
│ Result: Full guest chat functionality restored   │
└──────────────────────────────────────────────────┘
```

### Data Availability

- **Manual Chunks:** 100+ chunks across accommodations
- **Tourism Content:** 742 documents (MUVA premium tier)
- **General Info:** FAQ, arrival instructions

---

## 🚨 Emergency Rollback

If this fix causes issues:

```bash
# Revert functions to previous state (⚠️ BREAKS VECTOR SEARCH)
pnpm dlx tsx scripts/rollback-migration-production.ts \
  --migration=20251103000001_fix_vector_search_path
```

**Note:** This should ONLY be done if the fix introduces NEW problems. The previous state was already broken.

---

## 📚 Related Documents

- `docs/guest-chat-id-mapping/ADR-001-use-hotel-ids-for-manual-chunks.md`
- `docs/guest-chat-id-mapping/CASCADE_FK_FIX.md`
- `supabase/migrations/20251103000000_guest_chat_stable_id_fixes.sql`
- `supabase/migrations/20251103000001_fix_vector_search_path.sql`

---

## 🎓 Lessons Learned

### DO ✅

1. **Always create migrations for database changes**
2. **Test in dev → staging → production pipeline**
3. **Document root cause and fix**
4. **Version control everything**
5. **Automate via CI/CD**

### DON'T ❌

1. **Never apply fixes directly in Supabase dashboard**
2. **Never skip migration creation "to save time"**
3. **Never assume "one-time fix" won't be needed again**
4. **Never deploy without version control**
5. **Never ignore recurring issues** (they indicate systemic problems)

---

**Summary:**
This issue recurs because fixes are applied manually without migrations. The solution is a migration-first policy enforced by CI/CD automation.

**Status:** ✅ **FIXED** (Nov 3, 2025) with migration created and deployed.

**Next Steps:**
1. Monitor production for 24-48 hours
2. Verify no vector operator errors in logs
3. Implement FASE 6 (Migration Management System) from `docs/infrastructure/three-environments/WORKFLOW_PROMPTS.md`
