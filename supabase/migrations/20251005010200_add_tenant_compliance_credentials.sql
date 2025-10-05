-- =====================================================
-- Migration: Tenant Compliance Credentials Table
-- Purpose: Store SIRE/TRA credentials per tenant
-- Date: 2025-10-05
-- =====================================================

-- Tenant Compliance Credentials Table
CREATE TABLE IF NOT EXISTS tenant_compliance_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  sire_username VARCHAR(255),
  sire_password_encrypted TEXT,
  tra_rnt_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tenant lookup
CREATE INDEX idx_tenant_compliance_credentials_tenant_id 
  ON tenant_compliance_credentials(tenant_id);

-- Enable Row Level Security
ALTER TABLE tenant_compliance_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access credentials (READ)
CREATE POLICY "Only admins can view credentials"
  ON tenant_compliance_credentials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_permissions
      WHERE user_id = auth.uid()
        AND tenant_id = tenant_compliance_credentials.tenant_id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- RLS Policy: Only admins can insert credentials
CREATE POLICY "Only admins can create credentials"
  ON tenant_compliance_credentials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_permissions
      WHERE user_id = auth.uid()
        AND tenant_id = tenant_compliance_credentials.tenant_id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- RLS Policy: Only admins can update credentials
CREATE POLICY "Only admins can update credentials"
  ON tenant_compliance_credentials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_permissions
      WHERE user_id = auth.uid()
        AND tenant_id = tenant_compliance_credentials.tenant_id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- RLS Policy: Only admins can delete credentials
CREATE POLICY "Only admins can delete credentials"
  ON tenant_compliance_credentials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_permissions
      WHERE user_id = auth.uid()
        AND tenant_id = tenant_compliance_credentials.tenant_id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_tenant_compliance_credentials_updated_at
  BEFORE UPDATE ON tenant_compliance_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE tenant_compliance_credentials IS 'Stores SIRE and TRA credentials per tenant (admin/owner access only)';
COMMENT ON COLUMN tenant_compliance_credentials.sire_username IS 'SIRE portal username (Migración Colombia)';
COMMENT ON COLUMN tenant_compliance_credentials.sire_password_encrypted IS 'SIRE password (encrypted via pgcrypto or app-level encryption)';
COMMENT ON COLUMN tenant_compliance_credentials.tra_rnt_token IS 'TRA API token (RNT - Registro Nacional de Turismo)';
