-- =====================================================
-- Migration: Compliance Submissions Table
-- Purpose: Track SIRE/TRA compliance submissions
-- Date: 2025-10-05
-- =====================================================

-- Compliance Submissions Table
CREATE TABLE IF NOT EXISTS compliance_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sire', 'tra', 'both')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  data JSONB NOT NULL,
  sire_response JSONB,
  tra_response JSONB,
  error_message TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by VARCHAR(50) DEFAULT 'guest' CHECK (submitted_by IN ('guest', 'staff'))
);

-- Performance Indexes
CREATE INDEX idx_compliance_submissions_guest_id 
  ON compliance_submissions(guest_id);

CREATE INDEX idx_compliance_submissions_tenant_id 
  ON compliance_submissions(tenant_id);

CREATE INDEX idx_compliance_submissions_status 
  ON compliance_submissions(status);

CREATE INDEX idx_compliance_submissions_submitted_at 
  ON compliance_submissions(submitted_at DESC);

-- Composite index for staff dashboard queries (tenant + status + date)
CREATE INDEX idx_compliance_submissions_tenant_status_date 
  ON compliance_submissions(tenant_id, status, submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE compliance_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Guests can view their own submissions
CREATE POLICY "Guests can view their own submissions"
  ON compliance_submissions FOR SELECT
  USING (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- RLS Policy: Guests can create their own submissions
CREATE POLICY "Guests can create their own submissions"
  ON compliance_submissions FOR INSERT
  WITH CHECK (
    guest_id IN (
      SELECT id FROM guest_reservations
      WHERE id = current_setting('request.jwt.claims', true)::json->>'guest_id'::uuid
    )
  );

-- RLS Policy: Staff can view all tenant submissions
CREATE POLICY "Staff can view tenant submissions"
  ON compliance_submissions FOR SELECT
  USING (
    tenant_id IN (
      SELECT DISTINCT gr.tenant_id 
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON utp.tenant_id::varchar = gr.tenant_id
      WHERE utp.user_id = auth.uid() 
      AND utp.is_active = true
    )
  );

-- RLS Policy: Staff can update submission status
CREATE POLICY "Staff can update tenant submissions"
  ON compliance_submissions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT DISTINCT gr.tenant_id 
      FROM guest_reservations gr
      JOIN user_tenant_permissions utp ON utp.tenant_id::varchar = gr.tenant_id
      WHERE utp.user_id = auth.uid() 
      AND utp.is_active = true
      AND utp.role IN ('owner', 'admin')
    )
  );

-- Comments for documentation
COMMENT ON TABLE compliance_submissions IS 'Tracks SIRE and TRA compliance submissions from guests';
COMMENT ON COLUMN compliance_submissions.data IS 'JSONB con estructura DOS CAPAS: { conversational_data: {nombre_completo, numero_pasaporte, pais_texto, proposito_viaje, fecha_nacimiento}, sire_data: {13 campos oficiales SIRE según docs/features/sire-compliance/CODIGOS_OFICIALES.md: codigo_hotel, codigo_ciudad, tipo_documento, numero_identificacion, codigo_nacionalidad, primer_apellido, segundo_apellido, nombres, tipo_movimiento, fecha_movimiento, lugar_procedencia, lugar_destino, fecha_nacimiento} }';
COMMENT ON COLUMN compliance_submissions.sire_response IS 'Response from SIRE Puppeteer automation';
COMMENT ON COLUMN compliance_submissions.tra_response IS 'Response from TRA REST API';
COMMENT ON COLUMN compliance_submissions.submitted_by IS 'Origin of submission: guest (chat) or staff (manual)';
