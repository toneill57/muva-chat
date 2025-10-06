-- Migration: Fix SECURITY DEFINER View
-- Date: 2025-10-06
-- Purpose: Remove implicit SECURITY DEFINER from guest_chat_performance_monitor view
--
-- Issue: View owned by postgres superuser acts as SECURITY DEFINER, bypassing RLS
-- Solution: Recreate view with explicit ownership transfer to avoid security risk
--
-- Advisory: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- Impact: View will now execute with permissions of querying user (respects RLS)

-- Drop existing view (owned by postgres)
DROP VIEW IF EXISTS public.guest_chat_performance_monitor;

-- Recreate view without SECURITY DEFINER
-- This view aggregates health metrics for guest chat system
CREATE OR REPLACE VIEW public.guest_chat_performance_monitor AS
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
    count(
        CASE
            WHEN chat_conversations.status::text = 'active'::text THEN 1
            ELSE NULL::integer
        END)::text AS value,
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
    AND NOT (chat_conversations.reservation_id IN (
      SELECT guest_reservations.id FROM guest_reservations
    ));

-- Change ownership from postgres superuser to authenticated role
-- This prevents the view from acting as implicit SECURITY DEFINER
ALTER VIEW public.guest_chat_performance_monitor OWNER TO authenticated;

-- Grant SELECT to authenticated users (respects RLS on underlying tables)
GRANT SELECT ON public.guest_chat_performance_monitor TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.guest_chat_performance_monitor IS
  'Health monitoring view for guest chat system. Aggregates metrics from chat_messages, chat_conversations, and guest_reservations.
   Executes with querying user permissions (respects RLS policies on underlying tables).';

-- Verification query (run manually after migration):
-- SELECT * FROM public.guest_chat_performance_monitor;
-- Expected: 5 rows with health metrics
-- SELECT viewname, viewowner FROM pg_views WHERE viewname = 'guest_chat_performance_monitor';
-- Expected: viewowner should be 'authenticated' not 'postgres'
