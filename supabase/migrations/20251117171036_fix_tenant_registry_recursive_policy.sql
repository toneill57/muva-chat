-- Migration: Fix infinite recursion in tenant_registry RLS policy
-- Date: 2025-11-17
-- Description: Remove recursive policy that caused "infinite recursion detected" error
--              when querying tenant_registry via REST API with anon key

-- Problem:
-- Policy "Users can view tenants they have access to" on tenant_registry
-- queries user_tenant_permissions, which has its own RLS policies that
-- also query user_tenant_permissions, creating an infinite loop.

-- Solution:
-- Remove the recursive policy. The public SELECT policy is sufficient
-- for allowing access to tenant_registry records.

DROP POLICY IF EXISTS "Users can view tenants they have access to" ON tenant_registry;

-- Verify remaining policies:
-- 1. tenant_registry_public_select (SELECT) - allows public read access
-- 2. Only service role can create tenants (INSERT)
-- 3. Only service role can update tenants (UPDATE)
-- 4. Only service role can delete tenants (DELETE)

-- Applied manually to:
-- - DEV (ndbzuyzhfoggekjjhxrf) on 2025-11-17
-- - TST (bddcvjoeoiekzfetvxoe) on 2025-11-17
-- - PRD (kprqghwdnaykxhostivv) on 2025-11-17
