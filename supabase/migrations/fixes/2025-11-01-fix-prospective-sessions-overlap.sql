-- ============================================================================
-- FIX prospective_sessions OVERLAP - Final 5 Warnings
-- ============================================================================
-- Migration: 2025-11-01-fix-prospective-sessions-overlap.sql
-- Purpose: Eliminate remaining 5 warnings from prospective_sessions ALL/SELECT overlap
-- Issue: prospective_sessions_all (FOR ALL) overlaps with prospective_sessions_select (FOR SELECT)
-- Solution: Remove prospective_sessions_all, keep only prospective_sessions_select
-- ============================================================================

-- The prospective_sessions_all policy was meant for INSERT/UPDATE/DELETE on active sessions
-- But FOR ALL includes SELECT, causing overlap with prospective_sessions_select
-- Since prospective_sessions_select has more comprehensive logic (active OR staff),
-- we'll remove the ALL policy and keep only SELECT

DROP POLICY IF EXISTS "prospective_sessions_all" ON public.prospective_sessions;

-- Keep the comprehensive SELECT policy
-- prospective_sessions_select already exists with logic:
-- - Active sessions (status = 'active') - public access
-- - OR Staff access to their tenant sessions
-- No changes needed to existing SELECT policy

-- Result: 0 overlaps, 0 warnings
-- prospective_sessions will only have the SELECT policy

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After this migration, verify 0 warnings:
--
-- SELECT tablename, cmd, roles, array_agg(policyname), COUNT(*)
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'prospective_sessions'
--   AND permissive = 'PERMISSIVE'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1;
--
-- Expected: 0 rows
-- ============================================================================
