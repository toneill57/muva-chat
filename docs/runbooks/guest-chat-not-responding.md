# Runbook: Guest Chat Not Responding

**Symptom**: Guest reports chat not answering questions about WiFi, policies, or operational info.

**Impact**: Guest experience degraded, support tickets increase.

**Time to diagnose**: 5-10 minutes
**Time to fix**: 10-30 minutes (depending on cause)

---

## Quick Diagnosis (5 min)

### Step 1: Verify chunks exist

```sql
SELECT COUNT(*) as total_chunks
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'TENANT-UUID';
```

**Expected**: 150-300 chunks (depending on tenant size)

**If 0**: → Go to [Fix 1: Regenerate Manual Chunks](#fix-1-regenerate-manual-chunks)

---

### Step 2: Check embedding dimensions

```sql
SELECT
  vector_dims(embedding_balanced) as balanced_dims,
  vector_dims(embedding_full) as full_dims
FROM accommodation_units_manual_chunks
WHERE tenant_id = 'TENANT-UUID'
LIMIT 1;
```

**Expected**:
- `balanced_dims`: 1024
- `full_dims`: 3072

**If different**: → Go to [Fix 2: Regenerate Embeddings](#fix-2-regenerate-embeddings)

---

### Step 3: Test RPC directly

```sql
SELECT match_unit_manual_chunks(
  query_embedding := ARRAY[0.1, 0.2, ...]::vector(1024),  -- Dummy embedding
  p_accommodation_unit_id := 'UNIT-UUID',
  match_threshold := 0.0,
  match_count := 5
);
```

**Expected**: 3-10 chunks returned

**If 0**: → Go to [Fix 3: Check FK Constraint](#fix-3-check-fk-constraint)

---

### Step 4: Check orphaned chunks

```sql
SELECT COUNT(*) as orphaned_chunks
FROM accommodation_units_manual_chunks aumc
LEFT JOIN hotels.accommodation_units ha
  ON ha.id = aumc.accommodation_unit_id
WHERE aumc.tenant_id = 'TENANT-UUID'
  AND ha.id IS NULL;
```

**Expected**: 0

**If >0**: → Go to [Fix 4: Remap Orphaned Chunks](#fix-4-remap-orphaned-chunks)

---

## Fixes

### Fix 1: Regenerate Manual Chunks

**Cause**: Chunks were never created or deleted accidentally.

**Steps**:

```bash
cd /Users/oneill/Sites/apps/muva-chat

# Regenerate from source manuals
npm run regenerate:embeddings -- --tenant simmerdown

# Verify
npm run validate:tenant-health -- simmerdown
```

**Time**: 10-15 minutes

---

### Fix 2: Regenerate Embeddings

**Cause**: Wrong embedding model was used (e.g., `text-embedding-ada-002`).

**Steps**:

```bash
# Backup current chunks
npm run backup:chunks -- --tenant simmerdown

# Regenerate with correct model
npm run regenerate:embeddings -- --tenant simmerdown --force

# Validate dimensions
npm run validate:embeddings -- simmerdown
```

**Time**: 15-20 minutes

---

### Fix 3: Check FK Constraint

**Cause**: FK constraint pointing to wrong table or missing.

**Diagnosis**:

```sql
SELECT
  con.conname,
  con.contype,
  pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'accommodation_units_manual_chunks'
  AND con.contype = 'f';  -- Foreign key
```

**Expected**:
```
FOREIGN KEY (accommodation_unit_id)
REFERENCES hotels.accommodation_units(id)
ON DELETE CASCADE
```

**If wrong**: Apply migration from ADR-001.

---

### Fix 4: Remap Orphaned Chunks

**Cause**: Units were recreated, UUIDs changed.

**Steps**:

```bash
# Run smart remap script
npm run remap:chunks -- --tenant simmerdown

# Verify
npm run validate:tenant-health -- simmerdown
```

**Time**: 5-10 minutes

---

## Escalation

If none of the above fixes work:

1. Check `supabase/migrations/` for recent changes
2. Review `.claude/errors.jsonl` for related errors
3. Consult `docs/chat-core-stabilization/EXECUTIVE_SUMMARY.md`
4. Contact system architect

---

## Prevention

- ✅ Run health check after every deployment
- ✅ Monitor `orphaned_chunks` metric daily
- ✅ Automated tests in FASE 3 should catch this

---

**Last Updated**: October 24, 2025
**Maintainer**: Backend Team
