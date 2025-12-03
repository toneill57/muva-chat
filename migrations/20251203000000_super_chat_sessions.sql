-- Migration: Super Chat Sessions
-- Purpose: Store conversation history for Super Chat (muva.chat global assistant)
-- Created: 2025-12-03

-- Table for Super Chat sessions (no tenant - global MUVA assistant)
CREATE TABLE IF NOT EXISTS super_chat_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired'))
);

-- Index for quick session lookup
CREATE INDEX IF NOT EXISTS idx_super_chat_sessions_status
  ON super_chat_sessions(status) WHERE status = 'active';

-- Index for cleanup of old sessions
CREATE INDEX IF NOT EXISTS idx_super_chat_sessions_last_activity
  ON super_chat_sessions(last_activity_at);

-- Enable RLS
ALTER TABLE super_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations via service role (backend only)
CREATE POLICY "Service role full access" ON super_chat_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE super_chat_sessions IS 'Session storage for Super Chat (muva.chat global assistant) with conversation memory';
COMMENT ON COLUMN super_chat_sessions.conversation_history IS 'Array of {role, content, timestamp} objects for conversation context';
