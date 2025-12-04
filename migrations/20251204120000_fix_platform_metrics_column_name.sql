-- Fix v_platform_metrics column name mismatch
-- The API expects total_conversations_30d but the view was returning conversations_30d

DROP VIEW IF EXISTS v_platform_metrics;

CREATE VIEW v_platform_metrics AS
SELECT
  (SELECT COUNT(*) FROM tenant_registry WHERE is_active = true) as active_tenants,
  (SELECT COUNT(*) FROM tenant_registry) as total_tenants,
  (SELECT COUNT(*) FROM guest_conversations WHERE created_at > now() - interval '30 days') as total_conversations_30d,
  (SELECT COUNT(DISTINCT guest_id) FROM guest_conversations WHERE created_at > now() - interval '30 days') as active_users_30d,
  (SELECT COUNT(*) FROM muva_content) as muva_listings_count,
  now() as snapshot_at;

COMMENT ON VIEW v_platform_metrics IS 'Aggregated platform metrics for super admin dashboard';
