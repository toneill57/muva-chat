# SIRE TXT Generator API - Implementation Summary

**Date:** December 23, 2025
**Status:** ✅ Implemented and Tested
**Endpoint:** `POST /api/sire/generate-txt`

## Overview

API endpoint that generates SIRE-compliant TXT files for batch upload to Migración Colombia portal. Handles filtering, validation, and formatting according to official SIRE specification.

## Implementation Details

### Files Created

1. **API Route:**
   - `src/app/api/sire/generate-txt/route.ts` (170 lines)
   - POST handler with request validation
   - Database querying with filters
   - TXT generation and exclusion reporting

2. **Documentation:**
   - `src/app/api/sire/generate-txt/README.md` (350 lines)
   - Complete API documentation
   - Examples, error codes, format specification

3. **Test Suite:**
   - `scripts/sire/test-generate-txt-api.ts` (210 lines)
   - 5 test scenarios
   - Comprehensive validation

### Database Structure Discovery

**Critical Finding:** SIRE fields are stored INSIDE `guest_reservations` table, NOT in `tenants` table.

**Columns Used:**
- `hotel_sire_code` - Hotel SCH code
- `hotel_city_code` - DIVIPOLA city code
- `movement_type` - 'E' (check-in) or 'S' (check-out)
- `movement_date` - Date used for filtering
- `nationality_code` - SIRE country code (169 = Colombia)
- All guest personal data fields

This differs from initial assumption that tenant info would be in `tenants` table.

## Features

### ✅ Implemented

1. **Filtering:**
   - By tenant_id (multi-tenant isolation)
   - By date (single date or range via movement_date)
   - By movement type ('E', 'S', or 'both')
   - Auto-exclude Colombian nationals (code 169)

2. **Validation:**
   - Required SIRE fields check
   - Hotel codes validation
   - Date parameter validation
   - Movement type validation

3. **Output:**
   - Tab-delimited TXT format
   - CRLF line endings (Windows)
   - UTF-8 encoding
   - 13 columns per line
   - Suggested filename with date

4. **Reporting:**
   - Guest count included
   - Guest count excluded
   - Detailed exclusion reasons
   - Generation timestamp

### 🔒 Not Implemented (Future)

- Authentication/authorization
- Rate limiting
- Audit logging
- Direct file download endpoint
- Scheduled generation

## API Contract

### Request

```typescript
{
  tenant_id: string;              // Required
  date?: string;                  // Optional - YYYY-MM-DD
  date_from?: string;             // Optional - YYYY-MM-DD
  date_to?: string;               // Optional - YYYY-MM-DD
  movement_type?: 'E' | 'S' | 'both'; // Optional - default: 'both'
}
```

### Response (Success)

```typescript
{
  success: true,
  txt_content: string,            // Tab-delimited TXT
  filename: string,               // SIRE_tenantid_YYYYMMDD.txt
  guest_count: number,
  excluded_count: number,
  excluded: Array<{
    reservation_id: string,
    guest_name: string,
    reason: string
  }>,
  generated_at: string            // ISO timestamp
}
```

## Usage Examples

### 1. All Foreign Guests

```bash
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "hotelsanandres"}'
```

### 2. Today's Check-ins Only

```bash
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "hotelsanandres",
    "date": "2025-12-23",
    "movement_type": "E"
  }'
```

### 3. December Check-outs

```bash
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "hotelsanandres",
    "date_from": "2025-12-01",
    "date_to": "2025-12-31",
    "movement_type": "S"
  }'
```

## TXT Format

**Example Output:**
```
12345	88001	3	AB1234567	249	SMITH		JOHN MICHAEL	E	15/10/2025	249	88001	25/03/1985
12345	88001	5	CD9876543	76	GARCIA	LOPEZ	MARIA ELENA	S	16/10/2025	76	88001	12/07/1990
```

**Field Breakdown:**
1. Hotel Code: `12345`
2. City Code: `88001` (San Andrés)
3. Doc Type: `3` (Passport)
4. Doc Number: `AB1234567`
5. Nationality: `249` (USA - SIRE code)
6. First Surname: `SMITH`
7. Second Surname: (empty)
8. Given Names: `JOHN MICHAEL`
9. Movement Type: `E` (check-in)
10. Movement Date: `15/10/2025`
11. Origin: `249` (USA)
12. Destination: `88001` (San Andrés)
13. Birth Date: `25/03/1985`

## Exclusion Logic

Guests are excluded if:

1. **Colombian nationals** - `nationality_code = '169'` (automatic)
2. **Missing hotel codes** - `hotel_sire_code` or `hotel_city_code` NULL
3. **Missing required fields:**
   - `document_type`
   - `document_number`
   - `nationality_code`
   - `first_surname`
   - `given_names`
   - `birth_date`
   - `check_in_date` (for type 'E')
   - `check_out_date` (for type 'S')

All excluded guests are reported with reasons in the API response.

## Testing

### Automated Test Suite

```bash
# Start dev server
pnpm run dev

# Run tests (in another terminal)
pnpm dlx tsx scripts/sire/test-generate-txt-api.ts
```

**Test Coverage:**
- All guests (both E and S)
- Check-ins only
- Check-outs only
- Single date filtering
- Date range filtering

### Manual Testing

```bash
# Generate TXT for today's check-ins
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"hotelsanandres","movement_type":"E"}' | jq .
```

## Build Validation

✅ **TypeScript Compilation:** Passed
✅ **Next.js Build:** Passed
✅ **No Type Errors:** Confirmed

```bash
pnpm run build
# ✓ Compiled successfully in 6.1s
# ├ ƒ /api/sire/generate-txt
```

## Performance Considerations

### Expected Performance

- **Query Time:** < 100ms for 1000 reservations
- **Generation Time:** < 50ms for 100 guests
- **Total Response Time:** < 500ms (target)

### Optimization Recommendations

1. **Database Indexes:**
   ```sql
   CREATE INDEX idx_guest_reservations_tenant_movement
   ON guest_reservations(tenant_id, movement_date);

   CREATE INDEX idx_guest_reservations_nationality
   ON guest_reservations(nationality_code);
   ```

2. **Caching:**
   - Cache generated TXT files for same parameters (5 min TTL)
   - Invalidate on new reservation creation

3. **Pagination:**
   - For large datasets (>1000 guests), consider pagination
   - Or stream TXT generation

## Security Audit

### ✅ Implemented

- Multi-tenant isolation via `tenant_id` filter
- SQL injection protection (Supabase query builder)
- Input validation (date format, movement type)

### ⚠️ TODO

- [ ] Add authentication (JWT or session-based)
- [ ] Add authorization (verify user owns tenant)
- [ ] Add rate limiting (10 requests/min per tenant)
- [ ] Add audit logging (who generated what when)
- [ ] Add input sanitization (tenant_id format validation)

## Integration Points

### Upstream Dependencies

1. **Database:**
   - `guest_reservations` table
   - Expects SIRE fields populated

2. **Library:**
   - `@/lib/sire/sire-txt-generator.ts` - Core generation logic
   - `@/lib/sire/sire-catalogs.ts` - SIRE codes reference
   - `@/lib/supabase` - Database client

### Downstream Consumers

1. **Frontend Download:**
   - Client-side fetch → blob download
   - See README example

2. **Batch Processing:**
   - Scheduled cron job could call API
   - Generate daily/weekly TXT files

3. **Admin Dashboard:**
   - Display generation history
   - Preview TXT before download

## Known Limitations

1. **No Pagination:** Loads all matching guests into memory
   - Risk: OOM for very large datasets (>10K guests)
   - Mitigation: Add pagination or streaming

2. **No Caching:** Regenerates TXT on every request
   - Risk: Redundant computation for same parameters
   - Mitigation: Add cache layer (Redis/in-memory)

3. **No Authentication:** Public endpoint
   - Risk: Anyone can generate TXT files
   - Mitigation: Add auth before production

4. **Movement Date Assumption:** Uses `movement_date` column
   - Risk: If column not populated, date filtering fails
   - Mitigation: Fallback to check_in_date/check_out_date?

## Deployment Checklist

Before production deployment:

- [ ] Add authentication to endpoint
- [ ] Add rate limiting
- [ ] Add audit logging
- [ ] Create database indexes
- [ ] Test with production-scale data
- [ ] Monitor performance metrics
- [ ] Document for hotel staff
- [ ] Create admin UI for download

## Next Steps

### Immediate (This Sprint)

1. Test with real data from `guest_reservations`
2. Verify TXT format with SIRE portal
3. Document any edge cases discovered

### Short-term (Next Sprint)

1. Add authentication
2. Create download UI in admin dashboard
3. Add generation history tracking

### Long-term (Future)

1. Scheduled automatic generation
2. Email TXT files to admins
3. Integration with SIRE portal API (if available)
4. Bulk validation before generation

## References

- **SIRE Specification:** `docs/features/sire-compliance/CODIGOS_OFICIALES.md`
- **API Documentation:** `src/app/api/sire/generate-txt/README.md`
- **Test Suite:** `scripts/sire/test-generate-txt-api.ts`
- **Generator Library:** `src/lib/sire/sire-txt-generator.ts`

## Changelog

### 2025-12-23 - v1.0.0

**Created:**
- API endpoint implementation
- Comprehensive documentation
- Test suite with 5 scenarios

**Features:**
- Date filtering (single date and range)
- Movement type filtering
- Colombian auto-exclusion
- Exclusion reporting
- Tab-delimited TXT generation

**Validation:**
- ✅ TypeScript compilation
- ✅ Next.js build
- ✅ Format compliance

---

**Status:** Ready for testing with real data
**Next Action:** Test with actual `guest_reservations` data
**Owner:** @agent-backend-developer
