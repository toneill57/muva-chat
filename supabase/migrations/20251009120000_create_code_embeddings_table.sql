-- Tabla para code embeddings (semantic search)
-- Migrated from Zilliz Cloud Oct 2025
CREATE TABLE IF NOT EXISTS public.code_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index para búsquedas vectoriales optimizadas
-- Parameters: m=16 (connections), ef_construction=64 (build quality)
CREATE INDEX code_embeddings_embedding_idx
  ON code_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índices adicionales para performance
CREATE INDEX code_embeddings_file_path_idx ON code_embeddings(file_path);
CREATE UNIQUE INDEX code_embeddings_file_chunk_idx ON code_embeddings(file_path, chunk_index);

-- Comentarios de documentación
COMMENT ON TABLE code_embeddings IS 'Stores code embeddings for semantic search via claude-context MCP server. Migrated from Zilliz Cloud Oct 2025.';
COMMENT ON COLUMN code_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN code_embeddings.metadata IS 'JSONB metadata including language, start_line, end_line, etc.';

-- ============================================================================
-- RPC Function: Vector Similarity Search
-- ============================================================================

CREATE OR REPLACE FUNCTION search_code_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  file_path TEXT,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.file_path,
    ce.chunk_index,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM code_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_code_embeddings IS 'Search code embeddings using cosine similarity. Returns top N matches above threshold.';
