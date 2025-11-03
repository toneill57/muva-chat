# Phase 3e: Embeddings Data Migration

**Status:** ✅ COMPLETE  
**Date:** October 31, 2025  
**Total Rows:** 4,552  
**Total Size:** 104 MB (split across 3 files)

## Files Generated

### 14a-data-embeddings-part1.sql (41 MB)
- **Table:** code_embeddings
- **Rows:** 2,000 (rows 1-2000)
- **Content:** Codebase documentation embeddings
- **Vector Dims:** 1536

### 14b-data-embeddings-part2.sql (48 MB)
- **Table:** code_embeddings  
- **Rows:** 2,333 (rows 2001-4333)
- **Content:** Codebase documentation embeddings (continuation)
- **Vector Dims:** 1536

### 14c-data-embeddings-other.sql (15 MB)
- **Table:** accommodation_units_manual_chunks
- **Rows:** 219
- **Content:** Hotel manual chunks with Matryoshka embeddings
- **Vector Dims:** 3072, 1536, 1024 (3 columns)

## Execution Order

```bash
# Execute in sequence (requires replica role permissions):

psql $DATABASE_URL -f 14a-data-embeddings-part1.sql
psql $DATABASE_URL -f 14b-data-embeddings-part2.sql  
psql $DATABASE_URL -f 14c-data-embeddings-other.sql
```

## Validation Queries

After execution, verify counts:

```sql
SELECT 'code_embeddings' as table_name, COUNT(*) as row_count 
FROM code_embeddings;
-- Expected: 4333

SELECT 'accommodation_units_manual_chunks' as table_name, COUNT(*) as row_count 
FROM accommodation_units_manual_chunks;
-- Expected: 219

-- Total embeddings verification
SELECT 
  COUNT(*) as code_embeddings,
  (SELECT COUNT(*) FROM accommodation_units_manual_chunks) as manual_chunks,
  COUNT(*) + (SELECT COUNT(*) FROM accommodation_units_manual_chunks) as total
FROM code_embeddings;
-- Expected: 4333, 219, 4552
```

## Technical Notes

- **Vector Format:** All embeddings cast as `'[...]'::vector`
- **Content Escaping:** Single quotes doubled (`'` → `''`)
- **Multiline Content:** Preserved in code/markdown chunks
- **Session Replication:** Uses `SET session_replication_role = replica` for performance
- **Empty Tables:** tenant_knowledge_embeddings, tenant_muva_content (0 rows each)

## Generation Method

**Script:** `/scripts/export-embeddings-data.ts`

**Batch Processing:**
- code_embeddings: 9 batches × 500 rows
- manual_chunks: Single query (219 rows)

**Total Duration:** ~3 minutes

## Dependencies

**Prerequisites:**
- Vector extension enabled (`CREATE EXTENSION vector;`)
- Tables created (see schema migrations 01-11)
- Sufficient disk space (104 MB)

**No Dependencies On:**
- Other data migrations (standalone embeddings)

## Notes

The code_embeddings table contains the LARGEST dataset in the entire database (4,333 rows). This represents the complete codebase documentation that powers the `/dev-chat` AI assistant feature.

The accommodation_units_manual_chunks table contains Matryoshka embeddings (3 dimensions) for hotel manual content, enabling tiered vector search performance.
