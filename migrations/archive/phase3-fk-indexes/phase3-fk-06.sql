CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_tenant_permissions_granted_by_fk 
  ON public.user_tenant_permissions(granted_by);
