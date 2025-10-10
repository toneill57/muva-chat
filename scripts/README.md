# InnPilot Scripts Directory

**Last Updated:** October 10, 2025
**Purpose:** Organized collection of production scripts, tools, and utilities

**📊 Stats:** 33 active scripts + 38 deprecated (53% reduction in noise)

---

## 🚀 Development Scripts

### `dev-with-keys.sh` ⭐ RECOMMENDED
**Purpose**: Robust development server launcher with automatic cleanup and API keys

**Usage**:
```bash
./scripts/dev-with-keys.sh
```

**What it does**:
1. **🧹 Pre-flight Cleanup** - Detects and kills existing processes on port 3000
2. **🔍 Port Verification** - Ensures port is free before starting
3. **🔑 API Keys Setup** - Exports `OPENAI_API_KEY` and `ANTHROPIC_API_KEY`
4. **🚀 Server Start** - Launches Next.js with Turbopack
5. **🛑 Clean Shutdown** - Automatically cleans up on Ctrl+C or exit

**Key Features**:
- ✅ **Auto-cleanup** - Kills orphaned Next.js processes before starting
- ✅ **Trap handler** - Graceful shutdown on Ctrl+C with automatic cleanup
- ✅ **Port management** - Verifies port 3000 is free
- ✅ **Colored output** - Clear status messages with emojis
- ✅ **Error handling** - Robust error detection and recovery
- ✅ **PID tracking** - Shows process ID for debugging

**When to use**:
- ✅ **Daily development** (RECOMMENDED) - Handles all edge cases automatically
- ✅ Multiple restarts needed - No manual cleanup required
- ✅ Port conflicts - Automatically resolves
- ✅ Testing with API keys - Keys always available

**When NOT to use**:
- ❌ Production deployments (use proper environment variables)
- ❌ When keys need to be secret (script contains keys in plaintext)

**Output Example**:
```
🧹 Pre-flight cleanup...
✅ Port 3000 is free

🔑 Setting up API keys...
   ✅ OPENAI_API_KEY:    sk-proj-Raf6hBBo-ChX...XQoA
   ✅ ANTHROPIC_API_KEY: sk-ant-api03-iI3R_Np...aQAA

🚀 Starting InnPilot development server...
   Port: 3000
   Press Ctrl+C to stop
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ▲ Next.js 15.5.3 (Turbopack)
   - Local:        http://localhost:3000
   ✓ Ready in 726ms

# When you press Ctrl+C:
🛑 Shutting down development server...
   Killing server process (PID: 12345)
   Cleaning up Next.js processes...
   Freeing port 3000...
✅ Cleanup complete
```

**Troubleshooting**:
```bash
# Port still occupied after exit (rare)
lsof -ti:3000 | xargs kill -9

# Orphaned processes (rare)
pkill -f 'next dev'
```

**Security Note**:
⚠️ This script contains API keys in plaintext. Ensure it's in `.gitignore` or use environment variable substitution for sensitive deployments.

---

## 📊 Embeddings Scripts

### `populate-embeddings.js`
**Purpose**: Generate Matryoshka embeddings (multi-tier) for markdown content

**Usage**:
```bash
node scripts/populate-embeddings.js [archivo.md]
```

**Features**:
- Multi-tier embeddings: 1024d (fast), 1536d (balanced), 3072d (full)
- Automatic chunking (CHUNK_SIZE=1000, OVERLAP=100)
- Intelligent routing (SIRE → tier 2, MUVA → tier 1, complex → tier 3)
- 25+ field extraction (business info, metadata, etc.)

**Examples**:
```bash
# Process specific file
node scripts/populate-embeddings.js _assets/muva/listings-enriched/blue-life-dive.md

# Process all files in directory
for file in _assets/muva/listings-enriched/*.md; do
  node scripts/populate-embeddings.js "$file"
done
```

**Output**: Inserts chunks into respective tables (muva_content, sire_content, etc.) with embeddings

---

### `convert-json-to-muva-md.js`
**Purpose**: Convert JSON listings to MUVA markdown format

**Usage**:
```bash
node scripts/convert-json-to-muva-md.js <input.json>
```

**What it does**:
1. Reads JSON listing data
2. Applies MUVA markdown template
3. Generates structured markdown with business info
4. Outputs to `_assets/muva/listings/`

**Example**:
```bash
node scripts/convert-json-to-muva-md.js _assets/muva/listings-enriched/banzai-surf-school.json
```

---

## 🗄️ Database Scripts

### `migrate-manual-to-chunks.js` ⭐ NEW
**Purpose**: Migrate accommodation manuals to chunked format for improved vector search

**Background**:
- Problem: Vector search returns 0 results for specific manual queries (similarity 0.24 < threshold 0.3)
- Solution: Chunk manuals into 8-10 smaller pieces (similarity 0.7-0.9 expected)

**Usage**:
```bash
node scripts/migrate-manual-to-chunks.js
```

**What it does**:
1. **Fetches** all 10 manuals from `accommodation_units_manual`
2. **Chunks** each manual using intelligent splitting (CHUNK_SIZE=1000, OVERLAP=100)
3. **Generates** Matryoshka embeddings (3072d, 1536d, 1024d) for each chunk
4. **Inserts** chunks into `accommodation_units_manual_chunks` table
5. **Rate limits** OpenAI API calls (batches of 10, 100ms sleep)

**Output Example**:
```
🚀 Starting manual-to-chunks migration...

📚 Fetching all manuals from accommodation_units_manual...
✅ Found 10 manuals to process

📖 Processing manual-12a4f5b3...
   📦 Generated 9 chunks
   🔄 Processing batch 1/1...
   ✅ Inserted 9 chunks for manual-12a4f5b3

📖 Processing manual-a78bc3d2...
   📦 Generated 8 chunks
   🔄 Processing batch 1/1...
   ✅ Inserted 8 chunks for manual-a78bc3d2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Migration complete!
   📚 Manuals processed: 10
   📦 Total chunks inserted: 78
   📊 Avg chunks per manual: 7.8
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Post-migration**:
- Use `match_unit_manual_chunks()` RPC function for searches
- Expected similarity: 0.7-0.9 (vs 0.24 before)
- Query: `SELECT * FROM match_unit_manual_chunks('[embedding]'::vector(1536), 'unit-id'::uuid, 0.3, 3)`

**Features**:
- ✅ Automatic chunking with overlap for context preservation
- ✅ Section title extraction from chunk headers
- ✅ Matryoshka embedding generation (3 tiers)
- ✅ Batch processing with rate limiting
- ✅ Metadata tracking (migration date, chunk size)
- ✅ Error handling and progress logging

---

### `generate-accommodation-embeddings.ts`
Generate embeddings for accommodation units

**Usage**:
```bash
npx tsx scripts/generate-accommodation-embeddings.ts
```

---

### `generate-public-accommodations-embeddings.ts`
Generate embeddings for public accommodation listings

**Usage**:
```bash
npx tsx scripts/generate-public-accommodations-embeddings.ts
```

---

### `validate-public-chat-migrations.sql`
Validate public chat database migrations

**Usage**:
```bash
psql -f scripts/validate-public-chat-migrations.sql
```

---

### `cleanup-expired-sessions.sql`
Clean up expired prospective sessions (run daily)

**Usage**:
```bash
psql -f scripts/cleanup-expired-sessions.sql
```

**Recommended**: Schedule with cron at 3 AM daily

---

## 🧪 Testing Scripts

### `testing/`
Directory containing test utilities and validation scripts

---

## 🔧 Maintenance Scripts

### `migrate-motopress-data.js`
Migrate data from MotoPress format

**Usage**:
```bash
node scripts/migrate-motopress-data.js
```

---

### `process-accommodation-manuals.js`
Process accommodation manual markdown files

**Usage**:
```bash
node scripts/process-accommodation-manuals.js
```

---

### `regenerate_accommodation_embeddings.sh`
Re-generate all accommodation embeddings

**Usage**:
```bash
./scripts/regenerate_accommodation_embeddings.sh
```

---

## 📝 SQL Scripts

### `enhance-search-functions.sql`
Enhance vector search functions with latest optimizations

---

### `rollback_accommodation_split.sql`
Emergency rollback for accommodation data split migration

**Usage**:
```bash
psql -f scripts/rollback_accommodation_split.sql
```

⚠️ **Use only if migration fails**

---

## 🚦 Script Execution Order

For fresh setup:
```bash
# 1. Start development server
./scripts/dev-with-keys.sh

# 2. Process content
node scripts/populate-embeddings.js [files...]

# 3. Generate embeddings
npx tsx scripts/generate-accommodation-embeddings.ts

# 4. Validate database
psql -f scripts/validate-public-chat-migrations.sql
```

---

## 📚 More Information

- **Embeddings System**: See `docs/MATRYOSHKA_ARCHITECTURE.md`
- **MUVA Listings**: See `docs/MUVA_LISTINGS_GUIDE.md`
- **Database**: See `docs/backend/`

---

## 🗑️ Deprecated Scripts (38 files in `deprecated/`)

**Why deprecated:**
- ✅ Features validated and in production
- ✅ One-time fixes that are no longer needed
- ✅ Replaced by better tools (MCP, E2E tests)
- ✅ Debugging scripts for resolved issues

**Categories:**
1. **sire/** (8) - SIRE compliance testing (Phase 12 completed)
2. **motopress/** (6) - MotoPress integration debugging
3. **ddl-attempts/** (5) - Failed DDL execution methods
4. **schema-checks/** (5) - One-time schema verifications (replaced by MCP)
5. **multi-tenant/** (5) - Duplicate tenant testing scripts
6. **misc-testing/** (9) - Feature validation (now covered by E2E tests)
7. **admin-settings/** (3) - Admin panel testing (now Playwright)

**Access:** Scripts still available in `deprecated/` subdirectories if needed.

---

## 📚 Documentation References

- **CLAUDE.md** - Main development guide
- **docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md** - Database patterns
- **docs/MATRYOSHKA_ARCHITECTURE.md** - Embeddings system

---

**Last Updated**: October 10, 2025 (Major cleanup: 79→33 active scripts)
