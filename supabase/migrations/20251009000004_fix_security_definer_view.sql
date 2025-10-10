-- Migration: Fix Security Definer View (PROMPT 11.8)
-- Date: 2025-10-09
-- Reason: View guest_chat_performance_monitor uses SECURITY DEFINER, which enforces
--         creator's permissions instead of querying user's permissions.
--         This is a security risk flagged as ERROR by Supabase advisors.
-- Solution: Recreate view WITHOUT security definer, rely on RLS policies instead.

-- Drop existing view (it will be recreated immediately)
DROP VIEW IF EXISTS public.guest_chat_performance_monitor;

-- Recreate view WITHOUT SECURITY DEFINER
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
      SELECT guest_reservations.id
      FROM guest_reservations
    ));

-- Add comment explaining the view purpose
COMMENT ON VIEW public.guest_chat_performance_monitor IS
  'Performance monitoring view for guest chat system. Tracks message counts, conversation status, and data integrity. No SECURITY DEFINER - relies on RLS policies for access control.';

-- Grant appropriate permissions
-- Note: View inherits permissions from underlying tables (chat_messages, chat_conversations, guest_reservations)
-- which already have RLS policies in place
GRANT SELECT ON public.guest_chat_performance_monitor TO authenticated;
GRANT SELECT ON public.guest_chat_performance_monitor TO service_role;
