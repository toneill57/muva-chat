-- Migration: Add subdomain column to tenant_registry table
-- Purpose: Enable tenant lookup by subdomain for subdomain-based routing
-- Date: 2025-10-09

-- Step 1: Add subdomain column as nullable first (since we have existing data)
ALTER TABLE tenant_registry
ADD COLUMN subdomain text;

-- Step 2: Populate subdomain from existing slug values for current tenants
-- This ensures backward compatibility
UPDATE tenant_registry
SET subdomain = slug
WHERE subdomain IS NULL;

-- Step 3: Add NOT NULL constraint now that all rows have values
ALTER TABLE tenant_registry
ALTER COLUMN subdomain SET NOT NULL;

-- Step 4: Add unique constraint to prevent duplicate subdomains
ALTER TABLE tenant_registry
ADD CONSTRAINT tenant_registry_subdomain_key UNIQUE (subdomain);

-- Step 5: Add format validation constraint (lowercase alphanumeric + hyphens only)
ALTER TABLE tenant_registry
ADD CONSTRAINT subdomain_format CHECK (subdomain ~ '^[a-z0-9-]+$');

-- Step 6: Create index for fast subdomain lookup (critical for routing performance)
CREATE INDEX tenant_registry_subdomain_idx ON tenant_registry(subdomain);

-- Step 7: Add helpful comment explaining the column's purpose
COMMENT ON COLUMN tenant_registry.subdomain IS 'Subdomain identifier for tenant routing (e.g., "simmerdown" for simmerdown.innpilot.com). Must be lowercase alphanumeric with hyphens only.';
