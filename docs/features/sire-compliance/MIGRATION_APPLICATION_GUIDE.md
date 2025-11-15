# SIRE Database Migration Application Guide

## Issue Encountered

**Date:** 2025-10-09
**Phase:** 10.1 - SIRE Database Migration
**Status:** ⚠️ BLOCKED - Manual intervention required

### Problem

The MCP Supabase server connection lacks the necessary privileges to apply migrations programmatically:

```
Error: Your account does not have the necessary privileges to access this endpoint.
```

**Endpoints affected:**
- `mcp__supabase__apply_migration`
- `mcp__supabase__execute_sql`
- `mcp__supabase__list_migrations`

### Root Cause

The Supabase MCP server is configured with limited privileges (likely using a read-only or restricted API key). Migration operations require higher-level access.

---

## Solution Options

### Option 1: Supabase Dashboard (RECOMMENDED)

**Steps:**

1. **Navigate to Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/bghxzuzfpbynwfoigdpj
   - Go to: SQL Editor

2. **Apply Migration 1: RPC Functions**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/20251009000100_create_sire_rpc_functions.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Verify: "Success. No rows returned" or similar message

3. **Apply Migration 2: RLS Policies**
   - Click "New Query"
   - Copy contents from: `supabase/migrations/20251009000101_add_sire_rls_policies.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Verify: "Success. No rows returned"

4. **Verification**
   - In SQL Editor, run:
     ```sql
     SELECT routine_name, routine_type
     FROM information_schema.routines
     WHERE routine_schema = 'public'
       AND routine_name LIKE '%sire%'
     ORDER BY routine_name;
     ```
   - Expected: 4 functions returned
     - `check_sire_access_permission`
     - `check_sire_data_completeness`
     - `get_sire_guest_data`
     - `get_sire_monthly_export`
     - `get_sire_statistics`

---

### Option 2: Install Supabase CLI

**Installation:**

```bash
# macOS
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

**Apply Migrations:**

```bash
cd /Users/oneill/Sites/apps/MUVA

# Login to Supabase
supabase login

# Link project
supabase link --project-ref bghxzuzfpbynwfoigdpj

# Apply all pending migrations
supabase db push
```

---

### Option 3: Upgrade MCP Server Permissions

**Requirements:**
- Supabase service_role key (has full database access)
- Update MCP server configuration

**Steps:**

1. **Get service_role key:**
   - Dashboard → Settings → API
   - Copy "service_role" key (⚠️ NEVER commit this key!)

2. **Update MCP config:**
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-supabase"],
         "env": {
           "SUPABASE_ACCESS_TOKEN": "your-service-role-key-here"
         }
       }
     }
   }
   ```

3. **Restart Claude Code:**
   - Restart the application to reload MCP servers
   - Verify with `/mcp` command

---

## Migration Files Location

```
/Users/oneill/Sites/apps/MUVA/supabase/migrations/
├── 20251009000100_create_sire_rpc_functions.sql (17KB)
└── 20251009000101_add_sire_rls_policies.sql (8.3KB)
```

---

## What Gets Created

### Migration 1: RPC Functions (20251009000100)

**4 Functions:**
1. `get_sire_guest_data(reservation_id)` - Individual guest data with catalog lookups
2. `get_sire_monthly_export(tenant_id, year, month, movement_type)` - Bulk export for TXT generation
3. `check_sire_data_completeness(reservation_id)` - Pre-export validation
4. `get_sire_statistics(tenant_id, start_date, end_date)` - Compliance monitoring

**3 Indexes:**
1. `idx_guest_reservations_sire_export` - Optimizes monthly export queries
2. `idx_guest_reservations_origin_destination` - Geographic lookups
3. `idx_guest_reservations_hotel_sire_code` - Hotel filtering

### Migration 2: RLS Policies (20251009000101)

**5 RLS Policies:**
1. SELECT - Tenant users can view their own reservations
2. INSERT - Staff+ can create reservations
3. UPDATE - Staff+ can update reservations
4. DELETE - Owner/Admin can delete reservations
5. ALL - Service role full access

**1 Audit Table:**
- `sire_export_logs` - Tracks all SIRE exports with RLS

**1 Helper Function:**
- `check_sire_access_permission(tenant_id, user_id)` - Access verification

---

## Post-Migration Steps

Once migrations are applied successfully:

### 1. Verify Functions Exist

```sql
SELECT
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_sire_guest_data',
    'get_sire_monthly_export',
    'check_sire_data_completeness',
    'get_sire_statistics',
    'check_sire_access_permission'
  )
ORDER BY p.proname;
```

Expected: 5 rows

### 2. Verify Indexes Exist

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'guest_reservations'
  AND indexname LIKE '%sire%'
ORDER BY indexname;
```

Expected: 3 indexes

### 3. Verify RLS Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('guest_reservations', 'sire_export_logs')
ORDER BY tablename, policyname;
```

Expected: 7 policies total (5 for guest_reservations, 2 for sire_export_logs)

### 4. Generate TypeScript Types

After migrations are applied:

```bash
# If using Supabase CLI
supabase gen types typescript --local > src/types/supabase.ts

# Or via MCP (if permissions fixed)
# mcp__supabase__generate_typescript_types
```

### 5. Run Security Advisors

```bash
# Check for security issues
# mcp__supabase__get_advisors(project_id, type='security')

# Check for performance issues
# mcp__supabase__get_advisors(project_id, type='performance')
```

---

## Troubleshooting

### Migration Fails with "relation already exists"

**Cause:** Migration was partially applied before.

**Solution:**
```sql
-- Drop existing objects first
DROP FUNCTION IF EXISTS get_sire_guest_data(UUID);
DROP FUNCTION IF EXISTS get_sire_monthly_export(TEXT, INTEGER, INTEGER, CHAR);
-- etc...

-- Then re-run migration
```

### "permission denied for schema public"

**Cause:** Insufficient database privileges.

**Solution:** Use Supabase Dashboard or service_role key.

### "function ... does not exist" when testing

**Cause:** Migration not applied yet or failed silently.

**Solution:** Re-run migration and check for errors in SQL output.

---

## Next Steps After Migration

1. ✅ **Test RPC Functions** - Use sample data to verify each function
2. ✅ **Generate TypeScript Types** - Update frontend types
3. ✅ **Run Security Advisors** - Ensure no security/performance issues
4. ✅ **Proceed to Phase 10.2** - Build SIRE TXT export script

---

## Manual Testing Examples

### Test get_sire_guest_data

```sql
-- Replace with actual reservation ID from your database
SELECT * FROM get_sire_guest_data('00000000-0000-0000-0000-000000000000');
```

### Test get_sire_monthly_export

```sql
-- Get all October 2025 check-ins for tenant
SELECT * FROM get_sire_monthly_export('tenant-id-here', 2025, 10, 'E');
```

### Test check_sire_data_completeness

```sql
SELECT * FROM check_sire_data_completeness('reservation-id-here');
```

### Test get_sire_statistics

```sql
-- Get Q4 2025 statistics
SELECT * FROM get_sire_statistics(
  'tenant-id-here',
  '2025-10-01'::DATE,
  '2025-12-31'::DATE
);
```

---

## Status Checklist

Use this checklist to track migration application:

- [ ] Migration 1 applied (RPC functions)
- [ ] Migration 2 applied (RLS policies)
- [ ] 5 functions verified to exist
- [ ] 3 indexes verified to exist
- [ ] 7 RLS policies verified
- [ ] TypeScript types generated
- [ ] Security advisors run (no critical issues)
- [ ] Performance advisors run (no critical issues)
- [ ] Sample data testing complete
- [ ] Ready for Phase 10.2

---

**Last Updated:** 2025-10-09
**Created By:** @agent-database-agent (automated)
