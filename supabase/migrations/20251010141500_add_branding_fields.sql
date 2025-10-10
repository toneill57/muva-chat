-- Add branding fields to tenant_registry
-- This enables admin branding customization (logo + business name)

-- Add logo_url column (nullable, stores public URL to tenant logo)
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add business_name column (nullable, overrides nombre_comercial for chat display)
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tenant_registry.logo_url IS 'Public URL to tenant logo (recommended: 200x200px, PNG/JPG, max 100KB)';
COMMENT ON COLUMN tenant_registry.business_name IS 'Display name for chat interface (overrides nombre_comercial if set)';
