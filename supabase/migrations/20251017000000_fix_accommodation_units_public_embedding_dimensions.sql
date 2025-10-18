/**
 * Fix accommodation_units_public.embedding column dimensions
 *
 * PROBLEM: Column is configured as vector(3072) but should be vector(1536)
 * REASON: Matryoshka Tier 2 = 1536 dimensions (not 3072)
 * IMPACT: Allows HNSW indexing (max 2000d limit) and matches standard tier structure
 *
 * Matryoshka Embedding Tiers:
 * - Tier 1 (Fast): 1024 dimensions → embedding_fast
 * - Tier 2 (Balanced): 1536 dimensions → embedding
 * - Tier 3 (Full): 3072 dimensions → NOT USED (exceeds HNSW limit)
 */

-- Drop existing column (safe because it's currently NULL for all rows)
ALTER TABLE accommodation_units_public
DROP COLUMN IF EXISTS embedding;

-- Recreate column with correct dimensions (1536d for Tier 2)
ALTER TABLE accommodation_units_public
ADD COLUMN embedding vector(1536);

-- Add comment explaining the tier
COMMENT ON COLUMN accommodation_units_public.embedding IS
'Matryoshka Tier 2 embedding (1536 dimensions) for balanced search performance. HNSW indexed.';

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS accommodation_units_public_embedding_idx
ON accommodation_units_public
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Verify column dimensions
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'accommodation_units_public'
  AND column_name IN ('embedding', 'embedding_fast')
ORDER BY column_name;
