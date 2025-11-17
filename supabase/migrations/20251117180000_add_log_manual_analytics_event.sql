-- Migration: Add log_manual_analytics_event RPC
-- Problem: Analytics logging fails because RPC doesn't exist
-- Impact: Console errors when uploading manuals (non-blocking)
-- Solution: Create RPC for logging manual analytics events

CREATE OR REPLACE FUNCTION public.log_manual_analytics_event(
  p_manual_id uuid,
  p_tenant_id uuid,
  p_accommodation_unit_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_event_id UUID;
BEGIN
  -- Validate event_type
  IF p_event_type NOT IN ('upload', 'view', 'search_hit', 'delete') THEN
    RAISE EXCEPTION 'Invalid event_type: %. Must be one of: upload, view, search_hit, delete', p_event_type;
  END IF;

  -- Insert analytics event
  INSERT INTO accommodation_manual_analytics (
    manual_id,
    tenant_id,
    accommodation_unit_id,
    event_type,
    metadata,
    created_at
  ) VALUES (
    p_manual_id,
    p_tenant_id,
    p_accommodation_unit_id,
    p_event_type,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.log_manual_analytics_event IS 'Logs analytics events for accommodation manuals (upload, view, search_hit, delete). Used by manual management system to track usage.';
