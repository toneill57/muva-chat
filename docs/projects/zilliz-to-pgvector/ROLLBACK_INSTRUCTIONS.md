# Rollback Instructions

**Migration Date**: October 9, 2025
**Rollback Window**: Until November 8, 2025 (30 days)
**Backup Location**: `~/.claude/mcp.json.backup.zilliz` (local only, not in repo)

---

## ⚠️ Important Security Note

The MCP configuration backup contains sensitive credentials (OpenAI API key) and is:
- ✅ Stored locally at `~/.claude/mcp.json.backup.zilliz`
- ❌ **NOT committed to git** (excluded via `.gitignore`)
- 🔒 Protected by GitHub Secret Scanning

**If you need the backup file, it's on your local machine only.**

---

## Rollback Procedure

### Prerequisites
- Backup file exists: `~/.claude/mcp.json.backup.zilliz`
- Zilliz Cloud subscription active (or within 30-day retention)
- Original Zilliz collection `code_chunks_openai_1536` preserved

### Step 1: Verify Backup Exists

```bash
ls -lh ~/.claude/mcp.json.backup.zilliz
```

**Expected**: File created on October 9, 2025 (~1.3KB)

**If missing**: Rollback NOT possible. Contact team for assistance.

---

### Step 2: Restore Zilliz MCP Configuration

```bash
# Backup current pgvector config (optional)
cp ~/.claude/mcp.json ~/.claude/mcp.json.backup.pgvector

# Restore Zilliz config
cp ~/.claude/mcp.json.backup.zilliz ~/.claude/mcp.json
```

**Verification**:
```bash
jq '.mcpServers["claude-context"].env' ~/.claude/mcp.json
```

**Expected output**:
```json
{
  "MILVUS_URI": "https://...",
  "MILVUS_TOKEN": "...",
  "OPENAI_API_KEY": "sk-..."
}
```

---

### Step 3: Restart Claude Code

**Action**: Restart Claude Code application to reload MCP servers.

**Verification**:
```bash
# In Claude Code, run:
/mcp
```

**Expected**: `5/5 ✓ connected` (including `claude-context`)

---

### Step 4: Verify Zilliz Data Availability

**Test semantic search**:
```bash
# In Claude Code, try:
/search "SIRE compliance validation"
```

**Expected**: Results from Zilliz Cloud collection `code_chunks_openai_1536`

**If fails**:
- Check Zilliz Cloud subscription status
- Verify collection still exists
- Check retention period (30 days)

---

### Step 5: Cleanup pgvector (Optional)

⚠️ **ONLY if rollback is permanent** (not temporary testing)

```sql
-- Connect to Supabase
-- Run migration to drop pgvector table
DROP TABLE IF EXISTS code_embeddings CASCADE;
```

**Note**: This is irreversible. pgvector data will be lost.

---

## Rollback Reasons (When to Rollback)

### Valid Reasons
1. **Performance degradation**: pgvector consistently >3s (vs <1s with Zilliz)
2. **Data quality issues**: Missing or incorrect embeddings
3. **Critical bug**: Semantic search not working at all
4. **Infrastructure failure**: Supabase outage or pgvector corruption

### Invalid Reasons (Investigate First)
1. **Slightly higher latency**: 2-3s is acceptable (target: <3s)
2. **Different results**: May be due to HNSW index tuning, not data issue
3. **MCP server missing**: This is expected (`claude-context` removed by design)

**⚠️ IMPORTANT**: Per `CLAUDE.md` Rule #2, investigate ROOT CAUSE before rollback.

---

## Post-Rollback Checklist

- [ ] Zilliz MCP config restored (`~/.claude/mcp.json`)
- [ ] Claude Code restarted
- [ ] MCP shows 5/5 servers connected
- [ ] Semantic search functional via MCP
- [ ] Zilliz Cloud subscription active
- [ ] Document reason for rollback in `docs/projects/zilliz-to-pgvector/ROLLBACK_REPORT.md`

---

## Alternative: Temporary Testing

**If you want to test Zilliz without permanent rollback:**

```bash
# Test Zilliz (temporarily)
mv ~/.claude/mcp.json ~/.claude/mcp.json.pgvector.tmp
cp ~/.claude/mcp.json.backup.zilliz ~/.claude/mcp.json
# Restart Claude Code, test
# Restore pgvector
mv ~/.claude/mcp.json.pgvector.tmp ~/.claude/mcp.json
# Restart Claude Code
```

This allows A/B comparison without losing pgvector setup.

---

## Rollback Support

### Documentation
- **Migration Summary**: `MIGRATION_SUMMARY.md` § 4 (Rollback Plan)
- **Performance Comparison**: `PERFORMANCE_COMPARISON.md`
- **Cleanup Status**: `CLEANUP_STATUS.md`

### Backup File Structure

**File**: `~/.claude/mcp.json.backup.zilliz`

**Contains**:
```json
{
  "mcpServers": {
    "claude-context": {
      "command": "npx",
      "args": ["-y", "@zilliz/claude-context-mcp"],
      "env": {
        "MILVUS_URI": "https://in03-...",
        "MILVUS_TOKEN": "...",
        "OPENAI_API_KEY": "sk-..."
      }
    },
    "supabase": { ... },
    "knowledge-graph": { ... },
    "memory-keeper": { ... },
    "context7": { ... }
  }
}
```

**Security**: File contains sensitive keys. **NEVER commit to git.**

---

## Zilliz Cloud Retention

**Collection**: `code_chunks_openai_1536`
**Data**: 33,257 embeddings (818 files)
**Retention**: 30 days from suspension (until Nov 8, 2025)

**After Nov 8, 2025**:
- Zilliz data may be deleted
- Rollback NO LONGER POSSIBLE
- Must re-export if needed later

---

## Contact & Support

**Migration Lead**: infrastructure-monitor agent
**Documentation**: `docs/projects/zilliz-to-pgvector/`
**Issue Tracker**: GitHub Issues (if rollback needed)

---

**Last Updated**: October 9, 2025
**Rollback Window**: Active until November 8, 2025
