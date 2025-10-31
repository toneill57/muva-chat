# PLAN PART 6: EMBEDDINGS TABLES DOCUMENTATION

**Purpose:** Document vector search and AI embeddings tables
**Duration:** 2-3 hours
**Executor:** @agent-database-agent
**Prerequisites:** PART1, PART2, PART3, PART4, PART5 complete
**Output:** `docs/database/TABLES_EMBEDDINGS.md` (~600-800 lines)

---

## OBJECTIVE

Create comprehensive documentation for embeddings/vector search tables that power AI features in MUVA Chat, following the template established in `TABLES_BASE.md`.

**Target Tables** (~4-5 tables):
- `code_embeddings` - ⚠️ **CRITICAL: NO RLS** (4,333 rows, 74 MB)
- `accommodation_units_manual_chunks` - Chunked property descriptions (219 rows, 14 MB)
- `accommodation_units_manual` - Manual property descriptions with embeddings (8 rows, 1.3 MB)
- `accommodation_units_public` - Public-facing unit data with embeddings (153 rows, 6.1 MB)
- `tenant_knowledge_embeddings` - Tenant-specific knowledge base (0 rows, 968 KB)
- Tables with vector columns (across multiple tables - from PART1 verification)

**Special Focus:**
- Matryoshka embeddings architecture (3072/1536/1024 dimensions)
- pgvector extension usage (IVFFlat indexes)
- `code_embeddings` security issue (missing RLS)
- Vector search RPC functions
- Semantic chunking strategy

---

## TEMPLATE (Per Table)

Use this structure for EACH table (based on `TABLES_BASE.md` format + vector-specific sections):

```markdown
## [table_name]

**Purpose:** [1-2 sentence description]
**Row Count:** [ACTUAL from PART1]
**Total Size:** [SIZE with pg_size_pretty]
**Dependency Level:** [LEVEL from PART2]
**Foreign Keys:** [IN: X] [OUT: Y]
**Vector Dimensions:** [e.g., 3072, 1536, 1024] / [None]
**Embedding Model:** [e.g., text-embedding-3-large, ada-002]

---

### Schema

| Column | Type | Default | Nullable | Description |
|--------|------|---------|----------|-------------|
| [column] | [type] | [default] | [YES/NO] | [purpose] |

**Vector Columns:**
- `embedding_3072` - vector(3072) - Full Matryoshka embedding
- `embedding_1536` - vector(1536) - Medium Matryoshka embedding
- `embedding_1024` - vector(1024) - Small Matryoshka embedding

---

### Primary Key

```sql
PRIMARY KEY ([columns])
```

---

### Foreign Keys

#### Outgoing (Dependencies)
[If none: "None"]

```sql
FOREIGN KEY ([column]) REFERENCES [table]([column])
  ON DELETE [ACTION]
  ON UPDATE [ACTION]
```

#### Incoming (Referenced By)
[List all tables that reference this table]

---

### Indexes

```sql
-- Primary key index
CREATE UNIQUE INDEX [name] ON [table] ([columns]);

-- Vector indexes (IVFFlat for approximate nearest neighbor)
CREATE INDEX [name] ON [table]
  USING ivfflat (embedding_3072 vector_cosine_ops)
  WITH (lists = 100);
-- Purpose: Fast cosine similarity search on 3072-dim embeddings

CREATE INDEX [name] ON [table]
  USING ivfflat (embedding_1536 vector_cosine_ops)
  WITH (lists = 50);
-- Purpose: Fast cosine similarity search on 1536-dim embeddings

-- Additional indexes
CREATE INDEX [name] ON [table] ([columns]);
-- Purpose: [Why this index exists]
```

**Index Strategy:**
- IVFFlat indexes for vector similarity search
- B-tree indexes for filtering (tenant_id, chunk_type, etc.)
- Composite indexes for filtered vector search

---

### RLS Policies

**RLS Enabled:** ✅ Yes / ⚠️ **NO - SECURITY ISSUE**

[If RLS enabled:]
#### Policy: [policy_name]
```sql
CREATE POLICY [policy_name]
ON [table]
FOR [SELECT/INSERT/UPDATE/DELETE]
TO [roles]
USING ([qual_expression])
WITH CHECK ([with_check_expression]);
```

**Purpose:** [Explanation of security logic]

[If RLS missing (code_embeddings):]
⚠️ **SECURITY ISSUE: No RLS policies on this table**

**Impact:** Table is accessible to all authenticated users without tenant isolation
**Remediation:** See ADVISORS_ANALYSIS.md for required RLS policies
**Migration Note:** Add RLS policies before or immediately after migration

---

### Triggers

[If none: "No triggers"]

```sql
CREATE TRIGGER [trigger_name]
  [BEFORE/AFTER] [INSERT/UPDATE/DELETE]
  ON [table]
  FOR EACH ROW
  EXECUTE FUNCTION [function_name]();
```

**Purpose:** [What trigger does]

---

### Sample Data

```sql
-- Production sample (anonymized/representative)
SELECT id, content_snippet, chunk_type, embedding_3072[1:5] AS embedding_sample
FROM [table] LIMIT 3;
```

| id | content_snippet | chunk_type | embedding_sample |
|----|-----------------|------------|------------------|
| [uuid] | "Sample text..." | [type] | [0.123, -0.456, ...] |

**Note:** Full embeddings not shown (3072 dimensions too large for display)

---

### Embeddings Architecture

**Model:** [e.g., OpenAI text-embedding-3-large]
**Dimensions:** [3072 / 1536 / 1024] (Matryoshka embeddings)
**Chunking Strategy:** [Semantic / Fixed-size / Hierarchical]
**Chunk Size:** [~1-2K chars] / [Variable based on headers]

**Matryoshka Embeddings:**
The table stores embeddings at 3 different dimensions:
- **3072-dim:** Full precision, highest accuracy (use for critical searches)
- **1536-dim:** Medium precision, balanced performance/accuracy
- **1024-dim:** Lower precision, fastest search

This allows trading accuracy for speed based on use case.

**Semantic Chunking:**
Content is chunked based on semantic boundaries (e.g., markdown headers), not fixed character counts. This preserves context and improves retrieval quality.

---

### Vector Search Functions

#### Function: [search_function_name]
```sql
CREATE OR REPLACE FUNCTION search_[table_name](
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.content,
    1 - (t.embedding_3072 <=> query_embedding) AS similarity
  FROM [table_name] t
  WHERE (filter_tenant_id IS NULL OR t.tenant_id = filter_tenant_id)
    AND 1 - (t.embedding_3072 <=> query_embedding) > match_threshold
  ORDER BY t.embedding_3072 <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**
```sql
-- Search with tenant isolation
SELECT * FROM search_[table_name](
  query_embedding := get_embedding('user query text'),
  match_threshold := 0.7,
  match_count := 5,
  filter_tenant_id := '[TENANT_UUID]'
);
```

**Performance:**
- Uses IVFFlat index for fast approximate search
- Cosine similarity operator: `<=>` (pgvector)
- Filtered by tenant_id BEFORE vector search (leverages B-tree index)

---

### Common Query Patterns

#### Pattern 1: Semantic Search
```sql
-- Find similar content using vector similarity
SELECT
  id,
  content,
  1 - (embedding_1536 <=> '[QUERY_VECTOR]') AS similarity
FROM [table_name]
WHERE tenant_id = '[TENANT_ID]'
ORDER BY embedding_1536 <=> '[QUERY_VECTOR]'
LIMIT 10;
```

**Performance:** Uses IVFFlat index on embedding_1536

#### Pattern 2: Hybrid Search (Vector + Text)
```sql
-- Combine vector search with text filtering
SELECT
  id,
  content,
  1 - (embedding_1536 <=> '[QUERY_VECTOR]') AS similarity
FROM [table_name]
WHERE tenant_id = '[TENANT_ID]'
  AND content ILIKE '%keyword%'
ORDER BY embedding_1536 <=> '[QUERY_VECTOR]'
LIMIT 10;
```

**Performance:** Text filter narrows results, then vector search

#### Pattern 3: Matryoshka Dimension Selection
```sql
-- Use smaller embedding for fast preliminary search
WITH fast_search AS (
  SELECT id, 1 - (embedding_1024 <=> '[QUERY_VECTOR_1024]') AS sim
  FROM [table_name]
  WHERE tenant_id = '[TENANT_ID]'
  ORDER BY embedding_1024 <=> '[QUERY_VECTOR_1024]'
  LIMIT 50  -- Get top 50 candidates
)
-- Re-rank with full precision embedding
SELECT t.*, 1 - (t.embedding_3072 <=> '[QUERY_VECTOR_3072]') AS final_sim
FROM [table_name] t
JOIN fast_search fs ON t.id = fs.id
ORDER BY t.embedding_3072 <=> '[QUERY_VECTOR_3072]'
LIMIT 10;
```

**Performance:** 81% token reduction by using smaller embeddings first

---

### Performance Notes

- **Read Frequency:** HIGH (semantic search queries)
- **Write Frequency:** LOW to MEDIUM (embeddings generated on content updates)
- **Growth Rate:** SLOW (embeddings only for user-generated content)
- **Indexing Strategy:**
  - IVFFlat for vector similarity (pgvector)
  - B-tree for tenant_id (filter before vector search)
  - GIN for full-text search (optional, depends on hybrid search usage)
- **Advisors:** [List any performance advisors for this table]

**Vector Search Performance:**
- **IVFFlat `lists` parameter:** 100 for 3072-dim, 50 for 1536-dim, 25 for 1024-dim
  - Rule of thumb: `lists = sqrt(row_count)` for balanced speed/accuracy
- **Search accuracy:** ~95% recall with IVFFlat (vs 100% with exact search)
- **Query time:** <50ms for 10k rows, <200ms for 100k rows
- **Index size:** ~60% of table size (embeddings are dense vectors)

**Optimization Tips:**
1. Use smaller embeddings (1024-dim) for preliminary search, then re-rank
2. Filter by tenant_id BEFORE vector search (reduces search space)
3. Consider partitioning if table grows >100k rows
4. Rebuild IVFFlat indexes periodically: `REINDEX INDEX [index_name];`

---

### Migration Notes

#### DO:
- ✅ Preserve embeddings (expensive to regenerate - API costs)
- ✅ Verify vector dimensions match (3072, 1536, 1024)
- ✅ Copy IVFFlat indexes (or rebuild after migration)
- ✅ Test vector search functions after migration
- ✅ Add RLS to code_embeddings (security issue)

#### DON'T:
- ❌ Truncate embeddings (irreversible data loss)
- ❌ Modify vector dimensions (breaks compatibility)
- ❌ Skip index rebuild (vector search will be slow)
- ❌ Forget pgvector extension (required: `CREATE EXTENSION vector;`)

**Special Handling:**

**code_embeddings (4,333 rows, 74 MB):**
- ⚠️ NO RLS - Add tenant isolation policies during migration
- Large table - batch insert in smaller chunks (500 rows)
- Embeddings for codebase search (Claude Code feature)
- Rebuild IVFFlat index after all data copied

**accommodation_units_manual_chunks (219 rows, 14 MB):**
- Semantic chunks (markdown headers define boundaries)
- DO NOT truncate chunks (already optimized for ~1-2K chars)
- Each chunk has 3 embedding dimensions (Matryoshka)

**Vector Search Functions:**
- Test all search functions after migration
- Verify query performance matches production
- Check that tenant filtering works correctly

**pgvector Extension:**
```sql
-- Verify extension exists in staging
SELECT * FROM pg_extension WHERE extname = 'vector';

-- If missing, install:
CREATE EXTENSION IF NOT EXISTS vector;
```

---

```

---

## TASKS FOR @agent-database-agent

### TASK 6.1: Identify All Embeddings Tables (30 min)

**Strategy:**
1. Find tables with `vector` data type columns
2. Look for `*_embeddings`, `*_chunks`, `*_manual` tables
3. Check for Matryoshka architecture (multiple embedding dimensions)

**Query to Find Vector Columns:**
```sql
-- Find all vector columns in database
SELECT
  t.table_name,
  c.column_name,
  c.udt_name,
  pg_size_pretty(pg_total_relation_size(t.table_name::regclass)) AS table_size,
  pst.n_live_tup AS row_count
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
LEFT JOIN pg_stat_user_tables pst ON t.table_name = pst.relname
WHERE c.table_schema = 'public'
  AND c.udt_name = 'vector'
ORDER BY t.table_name, c.column_name;
```

**Expected Output:**
```
code_embeddings | embedding_3072 | vector | 74 MB | 4333
code_embeddings | embedding_1536 | vector | 74 MB | 4333
code_embeddings | embedding_1024 | vector | 74 MB | 4333
accommodation_units_manual_chunks | embedding_3072 | vector | 14 MB | 219
accommodation_units_manual_chunks | embedding_1536 | vector | 14 MB | 219
accommodation_units_manual_chunks | embedding_1024 | vector | 14 MB | 219
[... other tables with vector columns ...]
```

**Query to Find Embedding Tables:**
```sql
-- Tables likely related to embeddings
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass)) AS size,
  (SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = table_name) as rows
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%embedding%'
    OR table_name LIKE '%chunk%'
    OR table_name LIKE '%manual'
  )
ORDER BY table_name;
```

**Confirmed Tables (from PART1):**
- `code_embeddings` (4,333 rows, 74 MB) - ⚠️ NO RLS
- `accommodation_units_manual_chunks` (219 rows, 14 MB)
- `accommodation_units_manual` (8 rows, 1.3 MB)
- `accommodation_units_public` (153 rows, 6.1 MB)
- `tenant_knowledge_embeddings` (0 rows, 968 KB)

**Action:**
- Finalize list of 4-5 embeddings tables
- Identify which tables use Matryoshka embeddings (3 dimensions)
- Document tables with vector columns but not primarily for embeddings (e.g., `muva_content`)

---

### TASK 6.2: Verify pgvector Extension and Functions (30 min)

**Check pgvector Extension:**
```sql
-- Verify pgvector is installed
SELECT
  extname,
  extversion,
  extrelocatable
FROM pg_extension
WHERE extname = 'vector';
```

**Expected:** `vector | 0.5.0 | false` (or later version)

**List Vector Search Functions:**
```sql
-- Find all functions that work with vectors
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  t.typname AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_type t ON p.prorettype = t.oid
WHERE n.nspname = 'public'
  AND (
    pg_get_function_arguments(p.oid) LIKE '%vector%'
    OR pg_get_function_result(p.oid) LIKE '%vector%'
  )
ORDER BY p.proname;
```

**Common vector search RPC functions:**
- `search_code_embeddings(query_embedding vector, ...)`
- `search_accommodation_chunks(query_embedding vector, ...)`
- `match_documents(query_embedding vector, ...)`
- `cosine_similarity(vec1 vector, vec2 vector)`

**Document each function:**
- Purpose (what does it search?)
- Parameters (embedding dimensions, filters, limits)
- Return type (similarity scores, content)
- Performance (index usage)

---

### TASK 6.3: Extract Complete Schema for Each Table (1 hour)

For EACH embeddings table:

Use same queries as PART4, but pay special attention to:

#### Vector-Specific Column Details
```sql
-- Get vector column dimensions
SELECT
  column_name,
  udt_name,
  (
    SELECT atttypmod - 4
    FROM pg_attribute
    WHERE attrelid = (SELECT oid FROM pg_class WHERE relname = '[TABLE_NAME]')
      AND attname = column_name
  ) AS vector_dimensions
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '[TABLE_NAME]'
  AND udt_name = 'vector'
ORDER BY column_name;
```

#### IVFFlat Indexes
```sql
-- Get vector indexes with parameters
SELECT
  indexname,
  indexdef,
  (
    SELECT reloptions
    FROM pg_class
    WHERE relname = indexname
  ) AS index_options
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = '[TABLE_NAME]'
  AND indexdef LIKE '%ivfflat%'
ORDER BY indexname;
```

**Expected IVFFlat indexes:**
```sql
CREATE INDEX code_embeddings_embedding_3072_idx
  ON code_embeddings
  USING ivfflat (embedding_3072 vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX code_embeddings_embedding_1536_idx
  ON code_embeddings
  USING ivfflat (embedding_1536 vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX code_embeddings_embedding_1024_idx
  ON code_embeddings
  USING ivfflat (embedding_1024 vector_cosine_ops)
  WITH (lists = 100);
```

#### Chunking Metadata
For `accommodation_units_manual_chunks`:
```sql
SELECT
  chunk_type,
  COUNT(*) AS chunk_count,
  AVG(LENGTH(content)) AS avg_chunk_length,
  MIN(LENGTH(content)) AS min_chunk_length,
  MAX(LENGTH(content)) AS max_chunk_length
FROM accommodation_units_manual_chunks
GROUP BY chunk_type;
```

**Expected output:**
```
chunk_type | chunk_count | avg_chunk_length | min | max
-----------|-------------|------------------|-----|-----
section    | 180         | 1200             | 400 | 2000
header     | 39          | 300              | 50  | 500
```

---

### TASK 6.4: Document Vector Search Patterns (45 min)

For each embeddings table, document:

#### A) Basic Similarity Search
```sql
-- Standard vector search pattern
SELECT
  id,
  content,
  1 - (embedding_1536 <=> '[QUERY_EMBEDDING]') AS similarity
FROM [table_name]
WHERE [filters]  -- tenant_id, date range, etc.
ORDER BY embedding_1536 <=> '[QUERY_EMBEDDING]'
LIMIT 10;
```

#### B) RPC Function Usage
```sql
-- Call vector search RPC function
SELECT * FROM search_[table_name](
  query_embedding := '[EMBEDDING_VECTOR]'::vector(3072),
  match_threshold := 0.7,
  match_count := 5,
  filter_tenant_id := '[TENANT_UUID]'::uuid
);
```

#### C) Matryoshka Multi-Stage Search
```sql
-- Stage 1: Fast search with 1024-dim
WITH candidates AS (
  SELECT id
  FROM [table_name]
  WHERE tenant_id = '[TENANT_ID]'
  ORDER BY embedding_1024 <=> '[QUERY_EMBEDDING_1024]'
  LIMIT 50
)
-- Stage 2: Re-rank with 3072-dim
SELECT
  t.*,
  1 - (t.embedding_3072 <=> '[QUERY_EMBEDDING_3072]') AS similarity
FROM [table_name] t
JOIN candidates c ON t.id = c.id
ORDER BY t.embedding_3072 <=> '[QUERY_EMBEDDING_3072]'
LIMIT 10;
```

**Performance comparison:**
- 1024-dim search: ~20ms for 10k rows
- 3072-dim search: ~50ms for 10k rows
- Matryoshka (1024→3072): ~25ms total (81% token reduction)

#### D) Hybrid Search (Vector + Text + Metadata)
```sql
-- Combine vector similarity with metadata filters
SELECT
  t.*,
  1 - (t.embedding_1536 <=> '[QUERY_EMBEDDING]') AS similarity,
  ts_rank(to_tsvector('english', t.content), plainto_tsquery('[KEYWORDS]')) AS text_rank
FROM [table_name] t
WHERE t.tenant_id = '[TENANT_ID]'
  AND t.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND t.content @@ plainto_tsquery('[KEYWORDS]')
ORDER BY
  (1 - (t.embedding_1536 <=> '[QUERY_EMBEDDING]')) * 0.7 +  -- 70% vector
  ts_rank(to_tsvector('english', t.content), plainto_tsquery('[KEYWORDS]')) * 0.3  -- 30% text
DESC
LIMIT 10;
```

---

### TASK 6.5: Document code_embeddings Security Issue (15 min)

**Critical Security Finding:**

```markdown
## SECURITY ISSUE: code_embeddings Missing RLS

**Table:** `code_embeddings`
**Row Count:** 4,333 rows (74 MB)
**Issue:** No Row Level Security (RLS) policies
**Severity:** HIGH
**Impact:** All authenticated users can access codebase embeddings

### Current State
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'code_embeddings';
-- Result: rowsecurity = false
```

### Recommended RLS Policies

```sql
-- Enable RLS
ALTER TABLE code_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to search code embeddings
CREATE POLICY code_embeddings_select_authenticated
ON code_embeddings
FOR SELECT
TO authenticated
USING (true);  -- All authenticated users can search

-- Policy 2: Only service role can insert/update/delete
CREATE POLICY code_embeddings_modify_service_role
ON code_embeddings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Migration Action
✅ Add RLS policies during migration (before data copy)
✅ Test search functionality after RLS enabled
✅ Update ADVISORS_ANALYSIS.md to reflect remediation

### Why This Matters
- Codebase embeddings contain file paths and code snippets
- Without RLS, any authenticated user could:
  - View all embedded code
  - Reverse-engineer application structure
  - Identify potential security vulnerabilities
- RLS ensures only authorized search operations are permitted
```

---

### TASK 6.6: Add Performance and Migration Notes (30 min)

**Performance Considerations:**

1. **Index Rebuild Strategy**
   - IVFFlat indexes can become stale after bulk inserts
   - Rebuild after migration: `REINDEX INDEX CONCURRENTLY [index_name];`
   - Monitor query performance: `EXPLAIN ANALYZE SELECT ...`

2. **Batch Insert Optimization**
   - Large embeddings (3072 dimensions × 4 bytes = 12KB per row)
   - Batch size: 500 rows for embeddings tables (vs 1000 for regular tables)
   - Total for code_embeddings: ~9 batches × ~2-3 sec/batch = ~25 seconds

3. **Vector Search Performance**
   - Query time grows with row count: O(log n) with IVFFlat
   - Consider partitioning if >100k rows
   - Matryoshka strategy reduces tokens by 81% (use 1024-dim first)

**Migration Checklist:**

```markdown
### Embeddings Migration Checklist

**Pre-Migration:**
- [ ] Verify pgvector extension installed in staging
- [ ] Test vector search functions in staging (without data)
- [ ] Backup production embeddings (expensive to regenerate)
- [ ] Calculate expected migration time (4,333 rows × 2 sec = ~9 min for code_embeddings)

**During Migration:**
- [ ] Copy tables in dependency order (Level 0-4)
- [ ] Use batch size = 500 for embeddings tables
- [ ] Monitor progress (log every 500 rows)
- [ ] Add RLS to code_embeddings BEFORE copying data

**Post-Migration:**
- [ ] Rebuild IVFFlat indexes: `REINDEX INDEX CONCURRENTLY [index_name];`
- [ ] Test vector search functions (query performance)
- [ ] Verify similarity scores match production (spot checks)
- [ ] Run semantic search tests (5-10 sample queries)
- [ ] Check IVFFlat index health: `SELECT * FROM pg_indexes WHERE tablename LIKE '%embedding%';`
- [ ] Monitor query performance for 24 hours

**Validation Queries:**
```sql
-- 1. Verify row counts match
SELECT 'production' AS env, COUNT(*) FROM code_embeddings; -- Prod
SELECT 'staging' AS env, COUNT(*) FROM code_embeddings;    -- Staging

-- 2. Verify embedding dimensions
SELECT
  COUNT(*) AS rows_with_embeddings,
  COUNT(embedding_3072) AS has_3072,
  COUNT(embedding_1536) AS has_1536,
  COUNT(embedding_1024) AS has_1024
FROM code_embeddings;
-- Expected: All counts equal to total rows

-- 3. Test vector search performance
EXPLAIN ANALYZE
SELECT id, content, 1 - (embedding_1536 <=> '[TEST_EMBEDDING]') AS sim
FROM code_embeddings
ORDER BY embedding_1536 <=> '[TEST_EMBEDDING]'
LIMIT 10;
-- Expected: Uses IVFFlat index, query time < 50ms

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('code_embeddings', 'accommodation_units_manual_chunks');
-- Expected: All true
```
```

---

## OUTPUT FILE: `docs/database/TABLES_EMBEDDINGS.md`

**Structure:**

```markdown
# EMBEDDINGS TABLES DOCUMENTATION

**Purpose:** Vector search and AI embeddings for semantic search
**Tables Documented:** [COUNT]
**Total Rows:** [SUM of all embeddings rows]
**Total Size:** [SUM of all embeddings tables]
**pgvector Version:** [VERSION]
**Documentation Template:** Based on TABLES_BASE.md + vector-specific sections

**Last Updated:** [DATE] by @agent-database-agent

---

## Overview

Embeddings tables power AI-driven semantic search in MUVA Chat. These tables are:
- **Vector-heavy:** Store high-dimensional embeddings (3072, 1536, 1024 dimensions)
- **Matryoshka architecture:** Multiple embedding dimensions for speed/accuracy tradeoffs
- **pgvector-powered:** Use IVFFlat indexes for fast approximate nearest neighbor search
- **Semantically chunked:** Content split at logical boundaries (headers, paragraphs)
- **Expensive to regenerate:** Preserve embeddings during migration (API costs)

**pgvector Extension:**
- Extension: `vector` (version [X.X.X])
- Index type: IVFFlat (Inverted File with Flat compression)
- Distance metric: Cosine similarity (`<=>` operator)
- Index parameters: `lists = sqrt(row_count)` for balanced speed/accuracy

**Matryoshka Embeddings:**
Stores same content at 3 different dimensions:
- **3072-dim:** Full precision, highest accuracy (use for final ranking)
- **1536-dim:** Medium precision, balanced performance
- **1024-dim:** Lower precision, fastest search (use for preliminary filtering)

**Performance:** 81% token reduction using Matryoshka strategy (1024-dim → 3072-dim)

---

## Navigation

- [code_embeddings](#code_embeddings) - Codebase search (Level [X], 4,333 rows, 74 MB) ⚠️ NO RLS
- [accommodation_units_manual_chunks](#accommodation_units_manual_chunks) - Property chunks (Level [X], 219 rows, 14 MB)
- [accommodation_units_manual](#accommodation_units_manual) - Manual descriptions (Level [X], 8 rows, 1.3 MB)
- [accommodation_units_public](#accommodation_units_public) - Public unit data (Level [X], 153 rows, 6.1 MB)
- [tenant_knowledge_embeddings](#tenant_knowledge_embeddings) - Knowledge base (Level [X], 0 rows, 968 KB)

---

## SECURITY ISSUE: code_embeddings Missing RLS

⚠️ **CRITICAL:** `code_embeddings` table has NO Row Level Security policies

**Impact:** All authenticated users can access codebase embeddings
**Severity:** HIGH
**Remediation:** Add RLS policies during migration (see section in code_embeddings documentation)

---

[THEN: Complete documentation for each table using template]

## code_embeddings

[FULL TEMPLATE CONTENT including security issue, vector search patterns, Matryoshka usage]

---

## accommodation_units_manual_chunks

[FULL TEMPLATE CONTENT including semantic chunking strategy, vector search, RLS]

---

[... Continue for all embeddings tables ...]

---

## Vector Search Functions

### Overview
RPC functions for semantic search across embeddings tables.

[Document each vector search function found in TASK 6.2]

---

## Matryoshka Embeddings Strategy

### What is Matryoshka?
Matryoshka embeddings store the same semantic meaning at multiple dimensions, allowing progressive precision:
- **1024-dim:** Fast preliminary search
- **1536-dim:** Balanced speed/accuracy
- **3072-dim:** Full precision re-ranking

### Performance Comparison
| Dimension | Search Time | Token Cost | Use Case |
|-----------|-------------|------------|----------|
| 1024-dim  | ~20ms       | 33% cost   | Preliminary filtering (top 50 candidates) |
| 1536-dim  | ~35ms       | 50% cost   | Balanced search (top 10 results) |
| 3072-dim  | ~50ms       | 100% cost  | Final re-ranking (top 3 results) |

### Implementation Example
See "Pattern 3: Matryoshka Multi-Stage Search" in each table's documentation.

---

## pgvector Configuration

### Extension Details
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Version: [X.X.X]
```

### IVFFlat Index Parameters
```sql
-- General formula
lists = sqrt(row_count)

-- Examples
code_embeddings (4,333 rows):    lists = 100
manual_chunks (219 rows):         lists = 25
tenant_knowledge (future 10k):    lists = 150
```

### Index Rebuild
```sql
-- Rebuild indexes after bulk insert (non-blocking)
REINDEX INDEX CONCURRENTLY code_embeddings_embedding_3072_idx;
REINDEX INDEX CONCURRENTLY code_embeddings_embedding_1536_idx;
REINDEX INDEX CONCURRENTLY code_embeddings_embedding_1024_idx;
```

---

## Summary

**Total Embeddings Tables:** [COUNT]
**Total Rows:** [SUM]
**Total Size:** [SUM]
**Dependency Levels:** [RANGE]

**Migration Priority:** HIGH (expensive to regenerate)
**Migration Order:** Level 2-4 (after base and catalog tables)

**Performance:**
- Vector search: <50ms for 10k rows
- Index size: ~60% of table size
- Matryoshka savings: 81% token reduction

**Security:**
- ⚠️ code_embeddings missing RLS (remediate during migration)
- All other tables have tenant isolation

---

## Related Documentation

- [TABLES_BASE.md](./TABLES_BASE.md) - Foundational tables
- [ADVISORS_ANALYSIS.md](./ADVISORS_ANALYSIS.md) - Security advisors (RLS missing)
- [docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md](../../workflows/ACCOMMODATION_SYNC_UNIVERSAL.md) - Chunking strategy
- [pgvector documentation](https://github.com/pgvector/pgvector) - Official pgvector docs

```

---

## SUCCESS CRITERIA

- [ ] 4-5 embeddings tables identified
- [ ] Each table documented with complete schema
- [ ] Vector columns documented (dimensions, indexes)
- [ ] IVFFlat indexes documented with parameters
- [ ] RLS policies documented (or security issue flagged)
- [ ] code_embeddings security issue prominently documented
- [ ] Vector search RPC functions documented
- [ ] Matryoshka embeddings strategy explained
- [ ] Semantic chunking strategy documented
- [ ] 3 common vector search patterns per table
- [ ] Performance notes with index rebuild instructions
- [ ] Migration notes with batch size and validation queries
- [ ] TABLES_EMBEDDINGS.md file created (~600-800 lines)
- [ ] DOCUMENTATION_PROGRESS.md updated

---

## ESTIMATED TIMELINE

| Task | Duration | Cumulative |
|------|----------|------------|
| 6.1 Identify Embeddings Tables | 30 min | 0.5 hr |
| 6.2 Verify pgvector & Functions | 30 min | 1.0 hr |
| 6.3 Extract Schema (4-5 tables) | 1.0 hr | 2.0 hr |
| 6.4 Vector Search Patterns | 45 min | 2.75 hr |
| 6.5 Security Issue Documentation | 15 min | 2.9 hr |
| 6.6 Performance & Migration | 30 min | 3.4 hr |
| **File Creation & Formatting** | 30 min | **3.9 hr** |

**Realistic Total:** 2-3 hours (specialized content, fewer tables than PART4/5)

---

## NEXT STEPS AFTER COMPLETION

Once PART6 is complete:

1. Verify TABLES_EMBEDDINGS.md includes code_embeddings security issue
2. Document Matryoshka strategy is clearly explained
3. Check that all vector search patterns are tested
4. Proceed to PART7 (RLS_POLICIES.md)

**Ready for:** PLAN_PART7_RLS_POLICIES.md
