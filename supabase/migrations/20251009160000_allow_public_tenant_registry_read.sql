-- Migration: Allow public read access to tenant_registry
-- Description: Public subdomain chat needs to query tenants without auth
-- This enables `getTenantBySubdomain()` to work without authentication

-- Drop existing restrictive RLS policy if exists
DROP POLICY IF EXISTS tenant_registry_select ON tenant_registry;

-- Create new policy: Allow public SELECT on tenant_registry
CREATE POLICY tenant_registry_public_select
ON tenant_registry
FOR SELECT
USING (true);  -- Allow all reads (no auth required)

COMMENT ON POLICY tenant_registry_public_select ON tenant_registry IS
'Allow public read access to tenant registry for subdomain resolution';
