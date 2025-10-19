/**
 * Add Search Mode Configuration System
 *
 * PURPOSE: Enable per-tenant control of MUVA vs Accommodation search
 *
 * FEATURES:
 * 1. Search modes: 'hotel' (default), 'agency', 'hybrid'
 * 2. Configurable muva_match_count (0-10)
 * 3. Toggle accommodation_search_enabled
 * 4. Tenant-isolated MUVA content table (tenant_muva_content)
 *
 * MODES:
 * - Hotel Mode: muva_match_count=0, accommodations enabled
 * - Agency Mode: muva_match_count=4+, accommodations enabled (both active)
 * - Hybrid Mode: muva_match_count=1-4, accommodations enabled
 *
 * CREATED: October 18, 2025
 */

-- ============================================================================
-- 1. Create tenant_muva_content table (tenant-isolated MUVA documents)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_muva_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  document_type TEXT,  -- 'highlight', 'tour', 'restaurant', 'activity', etc.
  business_info JSONB,
  metadata JSONB,
  embedding vector(1024),  -- Tier 1 (fast HNSW search)
  source_file TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE tenant_muva_content IS
'Tenant-specific MUVA tourism content (isolated by tenant_id).
Used by agency/commission-based tenants to promote their listings.';

COMMENT ON COLUMN tenant_muva_content.document_type IS
'Type of MUVA content: highlight, tour, restaurant, activity, attraction, etc.';

COMMENT ON COLUMN tenant_muva_content.business_info IS
'Business details (name, address, phone, hours, etc.) as JSONB';

-- ============================================================================
-- 2. Enable RLS on tenant_muva_content
-- ============================================================================

ALTER TABLE tenant_muva_content ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view own MUVA content
CREATE POLICY "Tenants can view own MUVA content"
  ON tenant_muva_content FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can insert own MUVA content
CREATE POLICY "Tenants can insert own MUVA content"
  ON tenant_muva_content FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can update own MUVA content
CREATE POLICY "Tenants can update own MUVA content"
  ON tenant_muva_content FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Policy: Tenants can delete own MUVA content
CREATE POLICY "Tenants can delete own MUVA content"
  ON tenant_muva_content FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================================
-- 3. Create HNSW index on embedding for fast vector search
-- ============================================================================

CREATE INDEX IF NOT EXISTS tenant_muva_content_embedding_idx
  ON tenant_muva_content
  USING hnsw (embedding vector_cosine_ops);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS tenant_muva_content_tenant_id_idx
  ON tenant_muva_content(tenant_id);

CREATE INDEX IF NOT EXISTS tenant_muva_content_document_type_idx
  ON tenant_muva_content(document_type);

-- ============================================================================
-- 4. Create RPC function: match_tenant_muva_documents
-- ============================================================================

CREATE OR REPLACE FUNCTION match_tenant_muva_documents(
  query_embedding vector(1024),
  p_tenant_id UUID,
  match_threshold FLOAT DEFAULT 0.2,
  match_count INT DEFAULT 4
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  source_file TEXT,
  business_info JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tmc.id,
    tmc.title,
    tmc.content,
    (1 - (tmc.embedding <=> query_embedding))::FLOAT AS similarity,
    tmc.source_file,
    tmc.business_info,
    tmc.metadata
  FROM tenant_muva_content tmc
  WHERE
    tmc.tenant_id = p_tenant_id
    AND (1 - (tmc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_tenant_muva_documents IS
'Vector search for tenant-specific MUVA documents.
Used by agency/commission tenants to show their own tourism listings.
Returns top N most similar documents based on query embedding (1024d Tier 1).';

-- ============================================================================
-- 5. Update tenant_registry.features default to include search mode config
-- ============================================================================

-- Note: We cannot ALTER COLUMN to change default on existing JSONB field directly
-- Instead, we'll document the new schema and update via application code

-- New features schema (to be set by signup API and admin settings):
-- {
--   "muva_access": true,
--   "premium_chat": true,
--   "guest_chat_enabled": true,
--   "staff_chat_enabled": true,
--   "search_mode": "hotel",                    -- NEW: 'hotel' | 'agency' | 'hybrid'
--   "muva_match_count": 0,                     -- NEW: 0-10
--   "accommodation_search_enabled": true,      -- NEW: Toggle accommodation search
--   "sire_city_code": null,
--   "sire_hotel_code": null
-- }

-- ============================================================================
-- 6. Backfill existing tenants with Hotel Mode (default)
-- ============================================================================

UPDATE tenant_registry
SET features = features || jsonb_build_object(
  'search_mode', 'hotel',
  'muva_match_count', 0,
  'accommodation_search_enabled', true
)
WHERE features IS NOT NULL
  AND NOT features ? 'search_mode';  -- Only update if search_mode doesn't exist yet

-- Handle NULL features (shouldn't exist, but just in case)
UPDATE tenant_registry
SET features = jsonb_build_object(
  'muva_access', true,
  'premium_chat', true,
  'guest_chat_enabled', true,
  'staff_chat_enabled', true,
  'search_mode', 'hotel',
  'muva_match_count', 0,
  'accommodation_search_enabled', true
)
WHERE features IS NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
