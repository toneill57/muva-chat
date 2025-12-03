# Migration File Correction - Quick Reference

## File: 13-data-reservations.sql

### Status: CORRECTED ✅

**Date:** 2025-10-31 20:39 UTC
**Issue:** Section 3 (reservation_accommodations) had wrong column names and NULL data
**Resolution:** Corrected with production data from live database

## Files in This Directory

1. **13-data-reservations.sql** (1.4MB)
   - CORRECTED version - use this one
   - Section 3 fixed with proper column names and real data
   - Ready for deployment

2. **13-data-reservations.sql.ORIGINAL** (1.4MB)
   - Original backup - for reference only
   - Contains the wrong column names
   - DO NOT USE for migration

## What Was Fixed

### Section 3: reservation_accommodations (lines 555-664)

**Wrong Columns (ORIGINAL):**
```sql
unit_id, unit_name, check_in_date, check_out_date, 
rate_per_night, total_amount
```

**Correct Columns (FIXED):**
```sql
accommodation_unit_id, motopress_accommodation_id, 
motopress_type_id, room_rate
```

**Data:**
- 93 rows total
- 19 rows with complete data (room rates + MotorPress IDs)
- 74 rows with accommodation_unit_id + NULLs (valid state)
- All rows have valid FKs to guest_reservations and accommodation_units

## How to Use

### Apply to Staging
```bash
cd /Users/oneill/Sites/apps/muva-chat
psql $STAGING_DATABASE_URL < migrations/backup-2025-10-31/13-data-reservations.sql
```

### Apply to Production
```bash
cd /Users/oneill/Sites/apps/muva-chat
psql $PRODUCTION_DATABASE_URL < migrations/backup-2025-10-31/13-data-reservations.sql
```

### Verify After Applying
```sql
-- Check row count (should be 93)
SELECT COUNT(*) FROM reservation_accommodations;

-- Check FK integrity (should be 93)
SELECT COUNT(*) FROM reservation_accommodations ra
JOIN guest_reservations gr ON ra.reservation_id = gr.id;

-- Check data distribution
SELECT 
  COUNT(*) as total,
  COUNT(motopress_accommodation_id) as with_motopress,
  COUNT(room_rate) as with_rate
FROM reservation_accommodations;
-- Expected: total=93, with_motopress=19, with_rate=19
```

## Documentation

Full documentation available at:
`docs/database/migration-plan/execution/13-data-reservations_CORRECTION_APPLIED.md`

Includes:
- Detailed problem analysis
- Before/after comparison
- Data source and retrieval method
- Complete verification queries
- Schema alignment proof

## Dependencies

Run AFTER these migrations:
- 01-schema-catalogs.sql
- 02-schema-accommodations.sql
- 11-schema-operations.sql (creates guest_reservations)

Run BEFORE:
- Any migrations that reference reservation_accommodations

## Safety Notes

- Original file backed up as .ORIGINAL
- Production data retrieved via MCP (no manual editing)
- All other sections (1, 2, 4-14) preserved exactly as-is
- File validated for SQL syntax and row counts
- FK constraints will be satisfied

---

**Correction Method:** Python script + MCP Supabase query  
**Validation:** Column names, row count, NULL handling, FK relationships  
**Confidence:** HIGH ✅
