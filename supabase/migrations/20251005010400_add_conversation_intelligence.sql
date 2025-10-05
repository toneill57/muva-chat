-- Migration: Add Conversation Intelligence fields to guest_conversations
-- FASE 2.6: Conversation Intelligence
-- Date: 2025-10-05
-- Description: Add fields for auto-compaction, favorites, archiving, and activity tracking

-- Add conversation intelligence fields to guest_conversations
ALTER TABLE guest_conversations
  ADD COLUMN message_count INTEGER DEFAULT 0,
  ADD COLUMN compressed_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN favorites JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for archiving queries (finding conversations to archive/delete)
CREATE INDEX idx_conversations_archiving ON guest_conversations(is_archived, last_activity_at, archived_at);

-- Create index for activity tracking (fetching recent conversations)
CREATE INDEX idx_conversations_activity ON guest_conversations(tenant_id, last_activity_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN guest_conversations.message_count IS 'Total messages in conversation (for compression threshold tracking)';
COMMENT ON COLUMN guest_conversations.compressed_history IS 'Array of compressed message blocks: [{summary, timestamp, message_ids, message_count, date_range}]';
COMMENT ON COLUMN guest_conversations.favorites IS 'Array of favorited items: [{type, name, description, url, timestamp}]';
COMMENT ON COLUMN guest_conversations.is_archived IS 'Auto-archived after 30 days of inactivity';
COMMENT ON COLUMN guest_conversations.archived_at IS 'Timestamp when conversation was archived';
COMMENT ON COLUMN guest_conversations.last_activity_at IS 'Last message timestamp (for auto-archiving cron jobs)';

-- Update last_activity_at on any existing conversations
UPDATE guest_conversations
SET last_activity_at = updated_at
WHERE last_activity_at IS NULL;

-- Add trigger to auto-update last_activity_at on new messages (optional optimization)
-- This could be handled in application code for better control
