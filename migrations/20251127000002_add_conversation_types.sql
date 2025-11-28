-- =====================================================
-- MIGRATION: Add conversation_type to guest_conversations
-- Purpose: Discriminate between public and authenticated conversations
-- Date: 2025-11-27
-- =====================================================

-- Step 1: Add conversation_type column
ALTER TABLE public.guest_conversations
  ADD COLUMN IF NOT EXISTS conversation_type VARCHAR NOT NULL DEFAULT 'authenticated'
  CHECK (conversation_type IN ('public', 'authenticated', 'staff'));

-- Step 2: Make guest_id NULLABLE for public conversations
ALTER TABLE public.guest_conversations
  ALTER COLUMN guest_id DROP NOT NULL;

-- Step 3: Add constraint: authenticated conversations MUST have guest_id
ALTER TABLE public.guest_conversations
  ADD CONSTRAINT guest_id_required_for_authenticated
  CHECK (
    (conversation_type = 'authenticated' AND guest_id IS NOT NULL) OR
    (conversation_type != 'authenticated')
  );

-- Step 4: Add optional fields for public conversation tracking
ALTER TABLE public.guest_conversations
  ADD COLUMN IF NOT EXISTS anonymous_session_id UUID,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS referrer_url TEXT;

-- Step 5: Create index for conversation_type filtering
CREATE INDEX IF NOT EXISTS idx_guest_conversations_type
  ON public.guest_conversations(conversation_type);

-- Step 6: Create composite index for tenant + type queries
CREATE INDEX IF NOT EXISTS idx_guest_conversations_tenant_type
  ON public.guest_conversations(tenant_id, conversation_type);

-- Step 7: Update v_tenant_stats view with discriminated counters
-- Drop existing view first (structure is changing)
DROP VIEW IF EXISTS v_tenant_stats;

-- Recreate with new structure
CREATE VIEW v_tenant_stats AS
SELECT
  t.tenant_id,
  t.subdomain,
  t.nombre_comercial,
  t.subscription_tier,
  t.is_active,

  -- Total conversation count
  COUNT(DISTINCT gc.id) as conversation_count,

  -- Discriminated counters
  COUNT(DISTINCT CASE WHEN gc.conversation_type = 'public' THEN gc.id END) as public_conversations,
  COUNT(DISTINCT CASE WHEN gc.conversation_type = 'authenticated' THEN gc.id END) as authenticated_conversations,

  -- Activity tracking
  MAX(gc.last_activity_at) as last_activity,

  -- Accommodation count
  COUNT(DISTINCT au.id) as accommodation_count,

  t.created_at
FROM tenant_registry t
LEFT JOIN guest_conversations gc ON gc.tenant_id = t.tenant_id::VARCHAR
LEFT JOIN accommodation_units au ON au.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.subdomain, t.nombre_comercial, t.subscription_tier, t.is_active, t.created_at;

-- Step 8: Update RLS policies for public conversations
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "guest_conversations_service_insert" ON public.guest_conversations;
DROP POLICY IF EXISTS "public_conversations_anonymous_read" ON public.guest_conversations;

-- Recreate policy to allow service role to insert both types
CREATE POLICY "guest_conversations_service_insert"
  ON public.guest_conversations
  FOR INSERT
  WITH CHECK (true);

-- Policy for public conversations (anonymous reads)
CREATE POLICY "public_conversations_anonymous_read"
  ON public.guest_conversations
  FOR SELECT
  USING (conversation_type = 'public');

-- Step 9: Add comments
COMMENT ON COLUMN public.guest_conversations.conversation_type IS 'Type of conversation: public (anonymous /with-me), authenticated (/my-stay), or staff';
COMMENT ON COLUMN public.guest_conversations.anonymous_session_id IS 'Session ID for tracking anonymous public conversations';
COMMENT ON COLUMN public.guest_conversations.user_agent IS 'Browser/device info for analytics';
COMMENT ON COLUMN public.guest_conversations.referrer_url IS 'URL that referred the visitor (for marketing analytics)';

-- =====================================================
-- Migration Complete
-- =====================================================
