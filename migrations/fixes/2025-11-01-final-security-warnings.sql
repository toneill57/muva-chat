-- ============================================================================
-- FINAL SECURITY WARNINGS FIX - 2025-11-01
-- ============================================================================
-- Fixes applied:
-- 1. security_definer_view ERROR - guest_chat_performance_monitor
-- 2. extension_in_public WARN - vector extension
-- ============================================================================

-- ============================================================================
-- 1. Fix security_definer_view ERROR
-- ============================================================================
-- Issue: View had SECURITY DEFINER property (bypass RLS)
-- Solution: Drop and recreate without SECURITY DEFINER

DROP VIEW IF EXISTS public.guest_chat_performance_monitor CASCADE;

CREATE VIEW public.guest_chat_performance_monitor AS
SELECT 'message_count'::text AS metric_name,
    count(*)::text AS value,
    CASE
        WHEN count(*) >= 0 THEN 'healthy'::text
        ELSE 'error'::text
    END AS status
FROM chat_messages
UNION ALL
SELECT 'conversation_count'::text AS metric_name,
    count(*)::text AS value,
    CASE
        WHEN count(*) > 0 THEN 'healthy'::text
        ELSE 'no_data'::text
    END AS status
FROM chat_conversations
UNION ALL
SELECT 'active_conversations'::text AS metric_name,
    count(CASE WHEN chat_conversations.status::text = 'active'::text THEN 1 ELSE NULL::integer END)::text AS value,
    'healthy'::text AS status
FROM chat_conversations
UNION ALL
SELECT 'reservation_count'::text AS metric_name,
    count(*)::text AS value,
    CASE
        WHEN count(*) > 0 THEN 'healthy'::text
        ELSE 'no_data'::text
    END AS status
FROM guest_reservations
UNION ALL
SELECT 'orphaned_conversations'::text AS metric_name,
    count(*)::text AS value,
    CASE
        WHEN count(*) = 0 THEN 'healthy'::text
        ELSE 'integrity_issue'::text
    END AS status
FROM chat_conversations
WHERE chat_conversations.reservation_id IS NOT NULL
  AND reservation_id NOT IN (SELECT id FROM guest_reservations);

-- ============================================================================
-- 2. Fix extension_in_public WARN
-- ============================================================================
-- Issue: Vector extension in public schema (security risk)
-- Solution: Move to dedicated extensions schema

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- ============================================================================
-- VALIDATION
-- ============================================================================
-- After this migration:
-- 1. guest_chat_performance_monitor has NO SECURITY DEFINER (secure)
-- 2. vector extension is in extensions schema (not public)
-- ============================================================================
