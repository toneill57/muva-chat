# Runbook: Recreate Accommodation Units Safely

**Scenario**: Need to recreate units (schema change, data corruption, migration).

**Risk**: Orphaning manual chunks, breaking guest sessions.

**Time**: 20-30 minutes

---

## Pre-Flight Checklist

- [ ] Backup current units: `npm run backup:units`
- [ ] Backup manual chunks: `npm run backup:chunks`
- [ ] Note current stable IDs: `SELECT motopress_unit_id, manual_id FROM hotels.accommodation_units`
- [ ] Verify no active guest sessions: `SELECT COUNT(*) FROM guest_sessions WHERE expires_at > NOW()`

---

## Procedure

### Step 1: Export Stable IDs

```sql
COPY (
  SELECT
    id as old_uuid,
    name,
    motopress_unit_id,
    manual_id,
    tenant_id
  FROM hotels.accommodation_units
  WHERE tenant_id = 'TENANT-UUID'
) TO '/tmp/units-stable-ids.csv' CSV HEADER;
```

### Step 2: Delete Units (CASCADE will delete related data)

```sql
DELETE FROM hotels.accommodation_units
WHERE tenant_id = 'TENANT-UUID';
```

### Step 3: Recreate Units

```bash
# Sync from MotoPress
npm run sync:accommodations -- --tenant simmerdown
```

### Step 4: Restore Stable IDs

```sql
-- Update motopress_unit_id (should auto-populate from sync)
-- Manual intervention only if needed

UPDATE hotels.accommodation_units hu
SET manual_id = stable.manual_id
FROM (VALUES
  ('Misty Morning', 'manual-uuid-1'),
  ('Natural Mystic', 'manual-uuid-2')
  -- ... etc
) AS stable(unit_name, manual_id)
WHERE hu.name = stable.unit_name
  AND hu.tenant_id = 'TENANT-UUID';
```

### Step 5: Remap Manual Chunks

```bash
npm run remap:chunks -- --tenant simmerdown
```

### Step 6: Validate

```bash
npm run validate:tenant-health -- simmerdown
```

**Expected**:
```
✅ All units have stable IDs
✅ 0 orphaned chunks
✅ All chunks accessible via RPC
```

---

## Rollback

If validation fails:

```bash
# Restore from backup
npm run restore:units -- --from /tmp/backup-units.sql
npm run restore:chunks -- --from /tmp/backup-chunks.sql
```

---

**Last Updated**: October 24, 2025
