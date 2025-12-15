-- Migration: Add sire_document_uploads table
-- Purpose: Store uploaded documents (passport, visa, cedula) with OCR results for SIRE auto-submission
-- Date: 2025-12-05
-- Feature: SIRE Auto-Submission (FASE 2)

-- Create table for document uploads
CREATE TABLE IF NOT EXISTS public.sire_document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.guest_reservations(id) ON DELETE CASCADE,
  tenant_id VARCHAR NOT NULL,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('passport', 'visa', 'cedula')),
  file_url TEXT NOT NULL,
  ocr_result JSONB,
  extracted_fields JSONB,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'extracted', 'validated', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add table comment
COMMENT ON TABLE public.sire_document_uploads IS 
  'Stores guest document uploads (passport, visa, cedula) with OCR extraction results for SIRE compliance';

-- Add column comments
COMMENT ON COLUMN public.sire_document_uploads.id IS 'Unique identifier for document upload';
COMMENT ON COLUMN public.sire_document_uploads.reservation_id IS 'Reference to guest reservation';
COMMENT ON COLUMN public.sire_document_uploads.tenant_id IS 'Tenant isolation - hotel identifier';
COMMENT ON COLUMN public.sire_document_uploads.document_type IS 'Type of document: passport, visa, or cedula';
COMMENT ON COLUMN public.sire_document_uploads.file_url IS 'Supabase Storage URL for uploaded document image';
COMMENT ON COLUMN public.sire_document_uploads.ocr_result IS 'Raw OCR response from Claude Vision API';
COMMENT ON COLUMN public.sire_document_uploads.extracted_fields IS 'SIRE-mapped fields extracted from document';
COMMENT ON COLUMN public.sire_document_uploads.confidence_score IS 'Extraction confidence (0.00 to 1.00)';
COMMENT ON COLUMN public.sire_document_uploads.status IS 'Processing status: pending, extracted, validated, or failed';
COMMENT ON COLUMN public.sire_document_uploads.created_at IS 'Timestamp when document was uploaded';
COMMENT ON COLUMN public.sire_document_uploads.updated_at IS 'Timestamp of last update';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sire_document_uploads_reservation 
  ON public.sire_document_uploads(reservation_id);

CREATE INDEX IF NOT EXISTS idx_sire_document_uploads_status 
  ON public.sire_document_uploads(status);

CREATE INDEX IF NOT EXISTS idx_sire_document_uploads_tenant 
  ON public.sire_document_uploads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_sire_document_uploads_created_at 
  ON public.sire_document_uploads(created_at DESC);

-- Create function for updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.update_sire_document_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at auto-update
DROP TRIGGER IF EXISTS trigger_update_sire_document_uploads_updated_at 
  ON public.sire_document_uploads;

CREATE TRIGGER trigger_update_sire_document_uploads_updated_at
  BEFORE UPDATE ON public.sire_document_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sire_document_uploads_updated_at();

-- Enable Row Level Security
ALTER TABLE public.sire_document_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "sire_document_uploads_tenant_isolation_select" ON public.sire_document_uploads;
DROP POLICY IF EXISTS "sire_document_uploads_tenant_isolation_insert" ON public.sire_document_uploads;
DROP POLICY IF EXISTS "sire_document_uploads_tenant_isolation_update" ON public.sire_document_uploads;

-- RLS Policy: SELECT - Tenant isolation
CREATE POLICY "sire_document_uploads_tenant_isolation_select"
  ON public.sire_document_uploads
  FOR SELECT
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::VARCHAR);

-- RLS Policy: INSERT - Tenant isolation
CREATE POLICY "sire_document_uploads_tenant_isolation_insert"
  ON public.sire_document_uploads
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::VARCHAR);

-- RLS Policy: UPDATE - Tenant isolation
CREATE POLICY "sire_document_uploads_tenant_isolation_update"
  ON public.sire_document_uploads
  FOR UPDATE
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::VARCHAR)
  WITH CHECK (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::VARCHAR);
