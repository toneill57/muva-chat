-- Add settings fields to tenant_registry
-- Migration: 20251010000000_add_settings_fields_to_tenant_registry
-- Purpose: Add fields for tenant settings page (/admin/settings)
-- Date: 2025-10-10

ALTER TABLE public.tenant_registry
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_meta_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN public.tenant_registry.address IS 'Business physical address';
COMMENT ON COLUMN public.tenant_registry.phone IS 'Contact phone number';
COMMENT ON COLUMN public.tenant_registry.email IS 'Contact email address';
COMMENT ON COLUMN public.tenant_registry.social_media_links IS 'Social media URLs as JSON: {facebook, instagram, twitter, linkedin}';
COMMENT ON COLUMN public.tenant_registry.seo_meta_description IS 'SEO meta description for public landing page';
COMMENT ON COLUMN public.tenant_registry.seo_keywords IS 'Array of SEO keywords for search optimization';
