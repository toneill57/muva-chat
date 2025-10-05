-- =====================================================
-- Migration: Add Conversation Attachments Table
-- Purpose: Multi-Modal File Upload (Photos + Documents)
-- Date: 2025-10-05
-- FASE 2.5: Multi-Modal File Upload
-- =====================================================

-- Conversation Attachments Table
CREATE TABLE conversation_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES guest_conversations(id) ON DELETE CASCADE,
  message_id UUID, -- Optional: link to specific message in chat_messages

  -- File metadata
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'document', 'pdf')),
  file_url TEXT NOT NULL, -- Supabase Storage public URL
  file_size_bytes INTEGER,
  mime_type VARCHAR(100),
  original_filename VARCHAR(255),

  -- AI Analysis results
  ocr_text TEXT, -- For passport OCR results (structured JSON string)
  vision_analysis JSONB, -- Claude Vision API full response

  -- Analysis metadata
  analysis_type VARCHAR(50), -- 'location' | 'passport' | 'general'
  confidence_score DECIMAL(3,2), -- 0.00-1.00

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_attachments_conversation ON conversation_attachments(conversation_id);
CREATE INDEX idx_attachments_message ON conversation_attachments(message_id);
CREATE INDEX idx_attachments_created ON conversation_attachments(created_at DESC);
CREATE INDEX idx_attachments_type ON conversation_attachments(file_type);
CREATE INDEX idx_attachments_analysis_type ON conversation_attachments(analysis_type);

-- GIN index for vision_analysis JSONB queries
CREATE INDEX idx_attachments_vision_analysis ON conversation_attachments USING GIN(vision_analysis);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE conversation_attachments ENABLE ROW LEVEL SECURITY;

-- Guests can view their own attachments (via conversation ownership)
CREATE POLICY "Guests can view own attachments"
  ON conversation_attachments FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM guest_conversations
      WHERE guest_id = (
        SELECT id FROM guest_reservations
        WHERE id = auth.uid()
      )
    )
  );

-- Guests can create attachments for their own conversations
CREATE POLICY "Guests can create own attachments"
  ON conversation_attachments FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM guest_conversations
      WHERE guest_id = (
        SELECT id FROM guest_reservations
        WHERE id = auth.uid()
      )
    )
  );

-- Guests can update their own attachments (e.g., re-analyze)
CREATE POLICY "Guests can update own attachments"
  ON conversation_attachments FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM guest_conversations
      WHERE guest_id = (
        SELECT id FROM guest_reservations
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM guest_conversations
      WHERE guest_id = (
        SELECT id FROM guest_reservations
        WHERE id = auth.uid()
      )
    )
  );

-- Guests can delete their own attachments
CREATE POLICY "Guests can delete own attachments"
  ON conversation_attachments FOR DELETE
  USING (
    conversation_id IN (
      SELECT id FROM guest_conversations
      WHERE guest_id = (
        SELECT id FROM guest_reservations
        WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- Trigger: Update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_attachments_updated_at
  BEFORE UPDATE ON conversation_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_attachments_updated_at();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE conversation_attachments IS 'Stores file attachments (images, documents) uploaded by guests during conversations. Includes Claude Vision API analysis results for location recognition and passport OCR.';

COMMENT ON COLUMN conversation_attachments.conversation_id IS 'Foreign key to guest_conversations table';
COMMENT ON COLUMN conversation_attachments.message_id IS 'Optional link to specific chat message';
COMMENT ON COLUMN conversation_attachments.file_type IS 'Type of file: image, document, or pdf';
COMMENT ON COLUMN conversation_attachments.file_url IS 'Public URL from Supabase Storage (bucket: guest-attachments)';
COMMENT ON COLUMN conversation_attachments.ocr_text IS 'Extracted text from OCR (e.g., passport data as JSON string)';
COMMENT ON COLUMN conversation_attachments.vision_analysis IS 'Full Claude Vision API response (JSONB)';
COMMENT ON COLUMN conversation_attachments.analysis_type IS 'Type of analysis performed: location, passport, or general';
COMMENT ON COLUMN conversation_attachments.confidence_score IS 'AI analysis confidence score (0.00-1.00)';
