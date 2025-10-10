-- Add primary_color field to tenant_registry
-- This enables custom brand color for chat interface

-- Add primary_color column (nullable, stores hex color code)
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment for documentation
COMMENT ON COLUMN tenant_registry.primary_color IS 'Primary brand color in hex format (e.g., #3B82F6) used for chat interface buttons and accents';
