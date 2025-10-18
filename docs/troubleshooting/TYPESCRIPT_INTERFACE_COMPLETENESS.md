# TypeScript Interface Completeness

**Date:** October 2025
**Issue:** Multiple GitHub Actions build failures due to incomplete TypeScript interface

---

## Problem

When updating TypeScript interfaces (especially shared data models), forgetting to add fields causes **silent local development** but **hard failures in GitHub Actions builds**.

### Symptoms

- ✅ Local dev works (`npm run dev`)
- ✅ Local type checking passes in editor
- ❌ GitHub Actions build fails with "Property 'X' does not exist on type 'Y'"
- ❌ Multiple iterative commits to fix each missing field

### Root Cause

TypeScript's development mode is more permissive than production build mode. Missing interface fields don't error until full compilation.

---

## Case Study: AccommodationUnit Interface (Oct 2025)

### What Happened

Modified `MotoPresAccommodation` interface but didn't verify `AccommodationUnit` completeness.

**Result:** 6 separate commits to fix missing fields:
1. `title` format (string | object)
2. `meta` optional
3. `categories` array
4. `pricing` object
5. **Final fix:** ALL 11 missing fields

### Missing Fields Found

```typescript
// Fields used by sync-manager.ts and AccommodationUnitsGrid.tsx
// but NOT in interface:
pricing?: {...}
accommodation_type?: string
photo_count?: number
children_capacity?: number
total_capacity?: number
location_area?: string
amenities_summary?: {...}
pricing_summary?: {...}
room_type_id?: number
chunks_count?: number
embedding_status?: {...}
```

---

## Solution: Interface Verification Protocol

### BEFORE Committing Interface Changes

**1. Find ALL files using the interface:**
```bash
grep -rn "InterfaceName" --include="*.ts" --include="*.tsx" src/
```

**2. Search for ALL field accesses:**
```bash
grep -rn "object\\.\\w+" src/path/to/files/ | grep "InterfaceName"
```

**3. Verify field assignments:**
```bash
grep -rn "object\\.field =" src/
```

**4. Run production build locally:**
```bash
npm run build
```

**5. Only commit if build passes** ✅

### Example Workflow

```bash
# 1. Find all files using AccommodationUnit
grep -rn "AccommodationUnit" --include="*.ts" src/ | cut -d: -f1 | sort -u

# Output:
# src/lib/integrations/motopress/data-mapper.ts
# src/lib/integrations/motopress/sync-manager.ts
# src/components/Accommodation/AccommodationUnitsGrid.tsx

# 2. Check field usage in each file
grep -rn "unit\\.\\w+" src/components/Accommodation/AccommodationUnitsGrid.tsx

# 3. Verify build passes
npm run build

# 4. ONLY if build succeeds → commit
git commit -m "fix: complete AccommodationUnit interface"
```

---

## Prevention Rules

### For Claude Code

**MANDATORY steps when modifying interfaces:**

1. ❌ **NEVER** commit interface changes without verifying ALL usage
2. ✅ **ALWAYS** search for field accesses in ALL files
3. ✅ **ALWAYS** run `npm run build` before committing
4. ✅ **COMMIT ONCE** with all fields, not iteratively

### For Developers

- Treat interface changes as **breaking changes**
- Review ALL files that import the interface
- Add new fields as **optional** (`?:`) unless required
- Document field purpose with comments

---

## Quick Reference

### Common Grep Patterns

```bash
# Find interface usages
grep -rn "InterfaceName" --include="*.ts" src/

# Find field accesses (object.field)
grep -rn "varName\\.\\w+" src/file.ts

# Find field assignments (object.field =)
grep -rn "varName\\..*=" src/file.ts

# Find array element access
grep -rn "array\\[" src/
```

### Build Verification

```bash
# Full production build (what GitHub Actions runs)
npm run build

# Exit code 0 = success, non-zero = failure
echo $?
```

---

## Lessons Learned

### What Went Wrong

1. Modified `MotoPresAccommodation` interface
2. Assumed TypeScript would catch missing fields in dev mode
3. Committed without running `npm run build`
4. GitHub Actions failed 6 times with different missing fields

### What Should Have Been Done

1. Search for ALL files using `AccommodationUnit`
2. Identify ALL field accesses (`unit.pricing`, `unit.photo_count`, etc.)
3. Add ALL fields to interface at once
4. Run `npm run build` locally
5. Only commit after build passes

### Time Impact

- ❌ Iterative approach: ~30 minutes, 6 commits, 6 GitHub Actions runs
- ✅ Verification approach: ~5 minutes, 1 commit, 1 GitHub Actions run

**Savings:** 25 minutes + cleaner git history

---

## Related

- `CLAUDE.md` - Development methodology rules
- `docs/architecture/DATABASE_QUERY_PATTERNS.md` - Data model patterns
- `src/lib/integrations/motopress/data-mapper.ts` - Interface definition
