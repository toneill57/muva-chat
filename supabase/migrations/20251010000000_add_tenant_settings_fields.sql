-- Migration: Add Settings Fields to tenant_registry
-- Task: 4D.6 - Settings Page
-- Date: October 10, 2025
-- Agent: @agent-ux-interface

-- ============================================================================
-- Add Business Information Columns
-- ============================================================================

-- Add address field
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN tenant_registry.address IS 'Physical business address (multi-line)';

-- Add phone field
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

COMMENT ON COLUMN tenant_registry.phone IS 'Business contact phone number';

-- Add email field
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

COMMENT ON COLUMN tenant_registry.email IS 'Business contact email';

-- ============================================================================
-- Add Social Media Links (JSONB)
-- ============================================================================

ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tenant_registry.social_media_links IS 'Social media profile URLs (facebook, instagram, twitter, linkedin, tiktok)';

-- Example JSON structure:
-- {
--   "facebook": "https://facebook.com/business",
--   "instagram": "https://instagram.com/business",
--   "twitter": "https://twitter.com/business",
--   "linkedin": "https://linkedin.com/company/business",
--   "tiktok": "https://tiktok.com/@business"
-- }

-- ============================================================================
-- Add SEO Settings Columns
-- ============================================================================

-- Add SEO meta description
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS seo_meta_description TEXT;

COMMENT ON COLUMN tenant_registry.seo_meta_description IS 'SEO meta description for landing page (recommended max 160 characters)';

-- Add SEO keywords array
ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS seo_keywords TEXT[];

COMMENT ON COLUMN tenant_registry.seo_keywords IS 'SEO keywords for landing page (array of strings)';

-- ============================================================================
-- Add Indexes for Search Performance
-- ============================================================================

-- Index for email lookups (if used for contact forms)
CREATE INDEX IF NOT EXISTS idx_tenant_registry_email
ON tenant_registry(email)
WHERE email IS NOT NULL;

-- GIN index for social_media_links JSONB queries (if needed)
CREATE INDEX IF NOT EXISTS idx_tenant_registry_social_media
ON tenant_registry USING GIN(social_media_links)
WHERE social_media_links IS NOT NULL;

-- GIN index for seo_keywords array searches
CREATE INDEX IF NOT EXISTS idx_tenant_registry_seo_keywords
ON tenant_registry USING GIN(seo_keywords)
WHERE seo_keywords IS NOT NULL;

-- ============================================================================
-- Validation: Add Check Constraints
-- ============================================================================

-- Drop constraints if they exist (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phone_format_check') THEN
    ALTER TABLE tenant_registry DROP CONSTRAINT phone_format_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_format_check') THEN
    ALTER TABLE tenant_registry DROP CONSTRAINT email_format_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_meta_description_length_check') THEN
    ALTER TABLE tenant_registry DROP CONSTRAINT seo_meta_description_length_check;
  END IF;
END
$$;

-- Ensure phone number format (basic validation)
-- Allows international formats: +1 (555) 123-4567, +506 1234-5678, etc.
ALTER TABLE tenant_registry
ADD CONSTRAINT phone_format_check
CHECK (phone IS NULL OR phone ~ '^\+?[\d\s\(\)\-]+$');

-- Ensure email format
ALTER TABLE tenant_registry
ADD CONSTRAINT email_format_check
CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure SEO meta description isn't too long (soft limit 160, hard limit 200)
ALTER TABLE tenant_registry
ADD CONSTRAINT seo_meta_description_length_check
CHECK (seo_meta_description IS NULL OR length(seo_meta_description) <= 200);

-- ============================================================================
-- Update RLS Policies (if needed)
-- ============================================================================

-- Note: Settings fields should inherit existing RLS policies from tenant_registry
-- No additional policies needed for these columns specifically

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this query after migration to verify columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant_registry'
--   AND column_name IN ('address', 'phone', 'email', 'social_media_links', 'seo_meta_description', 'seo_keywords')
-- ORDER BY column_name;
