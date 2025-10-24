# FASE 3 - Changes Log

## 2025-10-23 - Manual Consolidation to Flat Structure

### Decision: Use Flat Structure as Standard

**Canonical location**: `_assets/{tenant}/accommodations-manual/`

**Rationale**:
- Simpler, less nested structure
- Easier to discover and maintain
- Matches tenant-scoped organization pattern

### Changes Made

#### 1. Removed Duplicate Nested Location
- **Deleted**: `_assets/muva/listings/accommodations/simmerdown/`
- **Reason**: Contained outdated manual files (Oct 16) vs flat location (Oct 19-23)
- **Verification**: Compared file contents - flat location had complete arrival sections

#### 2. Updated Script: `process-accommodation-manuals.js`
**Before**:
```javascript
// Searched in BOTH locations
const manualFiles = await glob([
  `_assets/${tenantSlug}/accommodations-manual/**/*-manual.md`,
  `_assets/muva/listings/accommodations/${tenantSlug}/accommodations-manual/**/*-manual.md`
], { cwd: projectRoot, absolute: true })

// Deduplication logic (preferred nested location)
const fileMap = new Map()
// ... 10 lines of dedup logic
```

**After**:
```javascript
// Single standard location
const manualFiles = await glob(
  `_assets/${tenantSlug}/accommodations-manual/**/*-manual.md`,
  { cwd: projectRoot, absolute: true }
)
// No deduplication needed - single source of truth
```

**Impact**:
- Removed 15 lines of complex deduplication logic
- Single source of truth for manuals
- Clearer, more maintainable code

#### 3. Verified: `process-simmer-highs-only.js`
- Already using correct flat structure: `_assets/simmerdown/accommodations-manual/apartments/simmer-highs-manual.md`
- No changes needed

### Testing Results

**File count verification**:
```bash
ls _assets/simmerdown/accommodations-manual/**/*-manual.md
# 9 files found (4 rooms + 5 apartments)
```

**Script execution**:
```bash
npm run process:manuals -- --tenant=simmerdown
# ✅ Found 9 manual files
# ✅ All files processed successfully
# ✅ No duplicates
```

### Standard Location Pattern

**Structure**:
```
_assets/
  {tenant}/
    accommodations-manual/
      rooms/
        {unit-slug}-manual.md
      apartments/
        {unit-slug}-manual.md
```

**Example (simmerdown)**:
```
_assets/simmerdown/accommodations-manual/
  rooms/
    dreamland-manual.md
    jammin-manual.md
    kaya-manual.md
    natural-mystic-manual.md
  apartments/
    misty-morning-manual.md
    one-love-manual.md
    simmer-highs-manual.md
    summertime-manual.md
    sunshine-manual.md
```

### Impact

- **Clarity**: Single, well-defined location for all manuals
- **Simplicity**: Removed 15 lines of deduplication logic
- **Performance**: Single glob pattern instead of two
- **Maintenance**: Easier to understand and modify
- **Consistency**: Follows tenant-scoped asset organization

### Migration Guide for Other Tenants

If other tenants have manuals in nested structure:

1. **Verify contents**:
   ```bash
   diff _assets/{tenant}/accommodations-manual/file.md \
        _assets/muva/listings/accommodations/{tenant}/accommodations-manual/file.md
   ```

2. **Keep the newest/most complete version**

3. **Delete outdated location**:
   ```bash
   rm -rf _assets/muva/listings/accommodations/{tenant}/
   ```

4. **Test script**:
   ```bash
   npm run process:manuals -- --tenant={tenant}
   ```

---

## 2025-10-23 - Multi-tenant CLI Support for Manual Processing

### Modified Files
- `scripts/process-accommodation-manuals.js`

### Changes

#### Added CLI Argument Parsing
- Script now requires `--tenant=<slug>` parameter
- Validates tenant parameter and shows usage if missing
- Example: `npm run process:manuals -- --tenant=simmerdown`

### Usage

**Error (missing tenant)**:
```bash
npm run process:manuals
# ❌ ERROR: Missing --tenant parameter
```

**Correct usage**:
```bash
npm run process:manuals -- --tenant=simmerdown
# 🎯 Processing manuals for tenant: simmerdown
# Found 9 manual files
```

### Impact

- **Multi-tenant support**: Can now process manuals for any tenant
- **Clear errors**: Helpful usage message if tenant parameter is missing
- **Supports FASE 3.1**: Enables manual processing for resilient reset system
