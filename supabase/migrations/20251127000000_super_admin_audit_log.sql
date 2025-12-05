-- ================================================
-- SUPER ADMIN AUDIT LOG - Database Infrastructure
-- ================================================
-- Migration: 20251127000000_super_admin_audit_log
-- Purpose: Create audit log table for super admin actions
-- ================================================

-- Tabla: super_admin_audit_log
CREATE TABLE IF NOT EXISTS public.super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES public.super_admin_users(super_admin_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON public.super_admin_audit_log(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.super_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type ON public.super_admin_audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_id ON public.super_admin_audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.super_admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON public.super_admin_audit_log(super_admin_id, action, created_at DESC);

-- RLS Policies
ALTER TABLE public.super_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all audit logs
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.super_admin_audit_log;
CREATE POLICY "Super admins can view all audit logs"
  ON public.super_admin_audit_log FOR SELECT
  USING (true);

-- Policy: Super admins can insert audit logs
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.super_admin_audit_log;
CREATE POLICY "Super admins can insert audit logs"
  ON public.super_admin_audit_log FOR INSERT
  WITH CHECK (true);

-- Policy: No one can update or delete audit logs (immutable)
-- (No policies for UPDATE/DELETE = implicit deny)

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON TABLE public.super_admin_audit_log IS 'Immutable audit log of all super admin actions';
COMMENT ON COLUMN public.super_admin_audit_log.action IS 'Action performed (e.g., login, tenant.update, content.upload)';
COMMENT ON COLUMN public.super_admin_audit_log.target_type IS 'Type of target resource (e.g., tenant, content, settings)';
COMMENT ON COLUMN public.super_admin_audit_log.target_id IS 'ID of target resource';
COMMENT ON COLUMN public.super_admin_audit_log.changes IS 'JSON object with before/after state for updates';
COMMENT ON COLUMN public.super_admin_audit_log.ip_address IS 'IP address of request (from x-forwarded-for or x-real-ip)';
COMMENT ON COLUMN public.super_admin_audit_log.user_agent IS 'User agent string from request';
