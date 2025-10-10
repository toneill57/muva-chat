-- Migration: Create tenant_knowledge_embeddings table
-- Description: Store document embeddings per tenant for multi-tenant chat system
-- Vector dimensions: 1536 (OpenAI text-embedding-3-small)
-- Index type: HNSW (Hierarchical Navigable Small World)

-- 1. Create main table
CREATE TABLE IF NOT EXISTS tenant_knowledge_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  file_path text NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, file_path, chunk_index)
);

-- 2. Create HNSW index for vector similarity search
-- Parameters: m=16, ef_construction=64 (same as code_embeddings)
CREATE INDEX IF NOT EXISTS tenant_knowledge_vector_idx
ON tenant_knowledge_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 3. Create B-tree index for tenant filtering (critical for performance)
CREATE INDEX IF NOT EXISTS tenant_knowledge_tenant_idx
ON tenant_knowledge_embeddings(tenant_id);

-- 4. Create RPC function for semantic search
CREATE OR REPLACE FUNCTION search_tenant_embeddings(
  p_tenant_id uuid,
  p_query_embedding vector(1536),
  p_match_threshold float DEFAULT 0.7,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  file_path text,
  chunk_index integer,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tke.id,
    tke.file_path,
    tke.chunk_index,
    tke.content,
    1 - (tke.embedding <=> p_query_embedding) AS similarity
  FROM tenant_knowledge_embeddings tke
  WHERE tke.tenant_id = p_tenant_id
    AND 1 - (tke.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY tke.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;

-- 5. Enable Row Level Security
ALTER TABLE tenant_knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies

-- Policy: SELECT - Only authenticated users from same tenant can view embeddings
CREATE POLICY tenant_knowledge_isolation
ON tenant_knowledge_embeddings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_knowledge_embeddings.tenant_id
      AND is_active = true
  )
);

-- Policy: INSERT - Only admins/owners can insert embeddings
CREATE POLICY tenant_knowledge_insert
ON tenant_knowledge_embeddings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_tenant_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_knowledge_embeddings.tenant_id
      AND role IN ('owner', 'admin', 'editor')
      AND is_active = true
  )
);

-- Policy: UPDATE - Only admins/owners can update embeddings
CREATE POLICY tenant_knowledge_update
ON tenant_knowledge_embeddings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_knowledge_embeddings.tenant_id
      AND role IN ('owner', 'admin', 'editor')
      AND is_active = true
  )
);

-- Policy: DELETE - Only admins/owners can delete embeddings
CREATE POLICY tenant_knowledge_delete
ON tenant_knowledge_embeddings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = tenant_knowledge_embeddings.tenant_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
);

-- 7. Add helpful comments
COMMENT ON TABLE tenant_knowledge_embeddings IS 'Stores document embeddings per tenant for multi-tenant chat knowledge base';
COMMENT ON COLUMN tenant_knowledge_embeddings.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN tenant_knowledge_embeddings.metadata IS 'Additional metadata (document type, upload date, etc)';
COMMENT ON FUNCTION search_tenant_embeddings IS 'Semantic search within tenant knowledge base using cosine similarity';
