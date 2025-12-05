-- ================================================
-- SUPER ADMIN DASHBOARD - Database Infrastructure
-- ================================================

-- Tabla: super_admin_users
CREATE TABLE IF NOT EXISTS public.super_admin_users (
  super_admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL CHECK (length(username) >= 3),
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  permissions JSONB DEFAULT '{"platform_admin": true, "tenant_management": true, "content_management": true, "analytics_access": true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON public.super_admin_users(username);
CREATE INDEX IF NOT EXISTS idx_super_admin_active ON public.super_admin_users(is_active);

-- RLS Policies
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all
DROP POLICY IF EXISTS "Super admins can view all" ON public.super_admin_users;
CREATE POLICY "Super admins can view all"
  ON public.super_admin_users FOR SELECT
  USING (true);

-- Policy: Super admins can update themselves
DROP POLICY IF EXISTS "Super admins can update themselves" ON public.super_admin_users;
CREATE POLICY "Super admins can update themselves"
  ON public.super_admin_users FOR UPDATE
  USING (true);

-- ================================================
-- VISTAS AGREGADAS
-- ================================================

-- Vista: Platform Metrics (métricas globales)
DROP VIEW IF EXISTS v_platform_metrics CASCADE;
CREATE VIEW v_platform_metrics AS
SELECT
  (SELECT COUNT(*) FROM tenant_registry WHERE is_active = true) as active_tenants,
  (SELECT COUNT(*) FROM tenant_registry) as total_tenants,
  (SELECT COUNT(*) FROM guest_conversations WHERE created_at > now() - interval '30 days') as conversations_30d,
  (SELECT COUNT(DISTINCT guest_id) FROM guest_conversations WHERE created_at > now() - interval '30 days') as active_users_30d,
  (SELECT COUNT(*) FROM muva_content) as muva_listings_count,
  now() as snapshot_at;

-- Vista: Tenant Stats (estadísticas por tenant)
DROP VIEW IF EXISTS v_tenant_stats CASCADE;
CREATE VIEW v_tenant_stats AS
SELECT
  t.tenant_id,
  t.subdomain,
  t.nombre_comercial,
  t.subscription_tier,
  t.is_active,
  COUNT(DISTINCT gc.id) as conversation_count,
  MAX(gc.last_activity_at) as last_activity,
  COUNT(DISTINCT au.id) as accommodation_count,
  t.created_at
FROM tenant_registry t
LEFT JOIN guest_conversations gc ON gc.tenant_id::uuid = t.tenant_id
LEFT JOIN accommodation_units au ON au.tenant_id = t.tenant_id
GROUP BY t.tenant_id, t.subdomain, t.nombre_comercial, t.subscription_tier, t.is_active, t.created_at;

-- ================================================
-- COMENTARIOS
-- ================================================

COMMENT ON TABLE public.super_admin_users IS 'Super administrators for platform-wide management';
COMMENT ON VIEW v_platform_metrics IS 'Aggregated platform metrics for super admin dashboard';
COMMENT ON VIEW v_tenant_stats IS 'Per-tenant statistics for monitoring';
