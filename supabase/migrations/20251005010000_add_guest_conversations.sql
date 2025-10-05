-- =====================================================
-- Migration: Guest Conversations Table
-- Purpose: Multi-conversation support for Guest Portal
-- Date: 2025-10-05
-- =====================================================

-- Guest Conversations Table
CREATE TABLE IF NOT EXISTS guest_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_guest_conversations_guest_id 
  ON guest_conversations(guest_id);

CREATE INDEX idx_guest_conversations_tenant_id 
  ON guest_conversations(tenant_id);

CREATE INDEX idx_guest_conversations_updated_at 
  ON guest_conversations(updated_at DESC);

-- Composite index for common query pattern (guest + tenant)
CREATE INDEX idx_guest_conversations_guest_tenant 
  ON guest_conversations(guest_id, tenant_id);

-- Enable Row Level Security
ALTER TABLE guest_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Guests can view their own conversations
CREATE POLICY "Guests can view their own conversations"
  ON guest_conversations FOR SELECT
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
      AND id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- RLS Policy: Guests can create their own conversations
CREATE POLICY "Guests can create their own conversations"
  ON guest_conversations FOR INSERT
  WITH CHECK (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
      AND id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- RLS Policy: Guests can update their own conversations
CREATE POLICY "Guests can update their own conversations"
  ON guest_conversations FOR UPDATE
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
      AND id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- RLS Policy: Guests can delete their own conversations
CREATE POLICY "Guests can delete their own conversations"
  ON guest_conversations FOR DELETE
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE tenant_id = current_setting('request.jwt.claims', true)::json->>'tenant_id'
      AND id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_guest_conversations_updated_at
  BEFORE UPDATE ON guest_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE guest_conversations IS 'Multi-conversation support for Guest Portal - similar to staff_conversations but for guests';
COMMENT ON COLUMN guest_conversations.tenant_id IS 'Tenant identifier (VARCHAR to match guest_reservations schema)';
COMMENT ON COLUMN guest_conversations.title IS 'Auto-generated conversation title based on first message';
COMMENT ON COLUMN guest_conversations.last_message IS 'Preview of last message for UI';
