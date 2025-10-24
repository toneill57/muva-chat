# Regenerate Manual Embeddings Script

## Purpose

Re-generates all embeddings for `accommodation_units_manual_chunks` using the correct model: **text-embedding-3-large** (HARDCODED - NO CAMBIAR).

This script is necessary when:
- Embeddings were generated with the wrong model
- Embedding model has been updated
- Chunks need to be re-indexed with new embedding dimensions

## Features

✅ **Correct Model**: Always uses `text-embedding-3-large` (hardcoded, not configurable)
✅ **Three Dimensions**: Generates 3 embeddings per chunk:
- `embedding` (3072d) - Full precision
- `embedding_balanced` (1536d) - Balanced precision/speed
- `embedding_fast` (1024d) - Fast retrieval

✅ **Progress Tracking**: Real-time progress with ETA
✅ **Dry-Run Mode**: Test without DB updates
✅ **Error Handling**: Retry logic + detailed error messages
✅ **Rate Limiting**: Automatic delays to avoid OpenAI API limits

## Usage

### Dry-Run (Recommended First)

Test the script without making any database changes:

```bash
set -a && source .env.local && set +a
npx tsx scripts/regenerate-manual-embeddings.ts --dry-run
```

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 REGENERATE MANUAL EMBEDDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tenant ID: b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf
   Model: text-embedding-3-large
   Dry-run: ✅ YES (no DB updates)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Fetching chunks from database...
   ✅ Found 219 chunks to regenerate

🤖 Generating embeddings...

   [10/219] 4.6% | 13.1s elapsed | 0.8 chunks/s | ETA 261s
   [20/219] 9.1% | 19.6s elapsed | 1.0 chunks/s | ETA 199s
   ...
   [219/219] 100.0% | 153.7s elapsed | 1.4 chunks/s | ETA 0s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ REGENERATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total chunks: 219
   Processed: 219
   Failed: 0
   Success rate: 100.0%
   Total time: 153.7s

   ℹ️  DRY-RUN mode - no database updates were made
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Production Run

⚠️ **WARNING**: This will update ALL embeddings in the database for the tenant.

```bash
set -a && source .env.local && set +a
npx tsx scripts/regenerate-manual-embeddings.ts
```

### Custom Tenant

Specify a different tenant ID:

```bash
npx tsx scripts/regenerate-manual-embeddings.ts <tenant-id>
npx tsx scripts/regenerate-manual-embeddings.ts <tenant-id> --dry-run
```

## Performance

**Dry-Run Test Results (219 chunks):**
- **Total Time**: 153.7s (~2.5 minutes)
- **Rate**: 1.4 chunks/s
- **Success Rate**: 100%
- **API Calls**: 657 (3 embeddings × 219 chunks)

**Estimated for Production (~200-300 chunks):**
- Time: 2-4 minutes
- Cost: ~$0.05-0.10 (OpenAI text-embedding-3-large pricing)

## Configuration

### Hardcoded Settings

```typescript
const EMBEDDING_MODEL = 'text-embedding-3-large' // HARDCODED - NO CAMBIAR
const BATCH_SIZE = 10        // Progress reporting frequency
const RATE_LIMIT_DELAY = 100 // ms between API calls
const MAX_RETRIES = 3        // Retry failed chunks
```

### Required Environment Variables

Must be set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

## Error Handling

The script includes:
- **Retry Logic**: Up to 3 retries per chunk with exponential backoff
- **Detailed Logging**: Shows which chunks failed and why
- **Non-Fatal Errors**: Continues processing other chunks if one fails
- **Exit Code**: Non-zero if any chunks failed

## Validation

After running in production, verify embeddings were updated:

```bash
set -a && source .env.local && set +a
npx tsx -e "
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

;(async () => {
  const { data } = await supabase
    .from('accommodation_units_manual_chunks')
    .select('id, updated_at, embedding, embedding_balanced, embedding_fast')
    .limit(1)
    .single()

  console.log('Sample chunk:', data.id)
  console.log('Updated at:', data.updated_at)
  console.log('Embedding dimensions:', {
    full: data.embedding?.length,
    balanced: data.embedding_balanced?.length,
    fast: data.embedding_fast?.length
  })
})()
"
```

Expected output:
```
Sample chunk: <uuid>
Updated at: 2025-10-24T16:35:00.000Z (recent timestamp)
Embedding dimensions: { full: 3072, balanced: 1536, fast: 1024 }
```

## Related Files

- **Script**: `scripts/regenerate-manual-embeddings.ts`
- **Backup**: Created by `scripts/backup-chunks.ts`
- **Backup Location**: `backups/chunks_backup_YYYY-MM-DD.json`

## Troubleshooting

### "No chunks found for tenant"

Check tenant ID is correct:
```sql
SELECT DISTINCT tenant_id
FROM accommodation_units_manual_chunks
LIMIT 5;
```

### OpenAI API Rate Limit Errors

- Increase `RATE_LIMIT_DELAY` to 200-500ms
- Script automatically retries with exponential backoff

### Out of Memory

Process chunks in batches by modifying script to filter by `accommodation_unit_id`.

---

**Last Updated**: October 24, 2025
**Status**: ✅ Tested and validated in dry-run mode
