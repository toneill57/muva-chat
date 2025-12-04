# RLS Performance Fixes - November 1, 2025

## Summary

This migration fixes **211 issues** detected by Supabase's Performance & Security Linter:

### Issues Fixed

1. **auth_rls_initplan (114 reported, 19 actionable)**
   - Problem: RLS policies using `auth.uid()` or `current_setting()` directly
   - Impact: Function re-evaluated for EACH row (severe performance degradation)
   - Fix: Wrap in subquery `(select auth.func())` to evaluate ONCE per query
   - **19 policies found and fixed** (95 were from removed/renamed tables)

2. **duplicate_index (2 fixed)**
   - `hotels.idx_hotels_accommodation_types_tenant` (duplicate of `_tenant_id`)
   - `public.idx_manual_chunks_unit_id` (duplicate of `_accommodation_unit_id`)

3. **multiple_permissive_policies (96 informational)**
   - 13 tables have multiple PERMISSIVE policies
   - Not a bug, but can impact performance
   - Consider consolidating if issues arise

### Performance Impact

**Before:** 
```sql
USING (auth.uid() = user_id)
-- Re-evaluates auth.uid() for EVERY row in table
```

**After:**
```sql
USING ((select auth.uid()) = user_id)
-- Evaluates auth.uid() ONCE, then filters rows
```

**Expected speedup:** 10-1000x on tables with many rows

### Execution

```bash
# Run via Supabase CLI or MCP
supabase db execute --file migrations/fixes/2025-11-01-rls-performance-fixes.sql

# Or via MCP
mcp__supabase__apply_migration --name="rls_performance_fixes" --query="$(cat migrations/fixes/2025-11-01-rls-performance-fixes.sql)"
```

### Validation

After running, verify fixes with:

```sql
-- Check for remaining slow policies
SELECT 
  schemaname, 
  tablename, 
  policyname,
  CASE 
    WHEN definition ~ 'auth\.uid\(\)' THEN 'SLOW (needs fix)'
    WHEN definition ~ '\(select auth\.uid\(\)\)' THEN 'FAST (fixed)'
    ELSE 'OK'
  END as performance_status
FROM pg_policies
WHERE schemaname IN ('public', 'hotels')
  AND (definition ~ 'auth\.' OR definition ~ 'current_setting')
ORDER BY performance_status DESC, tablename, policyname;
```

Expected result: All policies should show "FAST (fixed)" or "OK".

### Tables with Multiple Permissive Policies (Informational)

These tables have multiple policies (OR logic). Consider consolidating if performance degrades:

- public.airbnb_motopress_comparison
- public.chat_conversations
- public.chat_messages
- public.compliance_submissions
- public.guest_conversations
- public.guest_reservations
- public.hotels
- public.muva_content
- public.prospective_sessions
- public.sire_content
- public.staff_users
- public.tenant_registry
- public.user_tenant_permissions

### Reference

- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Database Linter Documentation](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
