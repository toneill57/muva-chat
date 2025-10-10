-- Add landing_page_content JSONB column to tenant_registry
-- This stores customizable content for tenant landing pages

ALTER TABLE tenant_registry
ADD COLUMN IF NOT EXISTS landing_page_content JSONB DEFAULT '{
  "hero": {
    "title": "",
    "subtitle": "",
    "cta_text": "Get Started",
    "cta_link": "/chat"
  },
  "about": {
    "title": "About Us",
    "content": ""
  },
  "services": {
    "title": "Our Services",
    "items": []
  },
  "gallery": {
    "title": "Gallery",
    "images": []
  },
  "contact": {
    "title": "Contact Us",
    "email": "",
    "phone": "",
    "address": ""
  }
}'::jsonb;

COMMENT ON COLUMN tenant_registry.landing_page_content IS 'JSONB structure for tenant landing page sections (hero, about, services, gallery, contact)';

-- Ensure existing tenants get the default structure
UPDATE tenant_registry
SET landing_page_content = '{
  "hero": {
    "title": "",
    "subtitle": "",
    "cta_text": "Get Started",
    "cta_link": "/chat"
  },
  "about": {
    "title": "About Us",
    "content": ""
  },
  "services": {
    "title": "Our Services",
    "items": []
  },
  "gallery": {
    "title": "Gallery",
    "images": []
  },
  "contact": {
    "title": "Contact Us",
    "email": "",
    "phone": "",
    "address": ""
  }
}'::jsonb
WHERE landing_page_content IS NULL;
