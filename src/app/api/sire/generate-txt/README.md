# SIRE TXT File Generator API

**Endpoint:** `POST /api/sire/generate-txt`

**Purpose:** Generate SIRE-compliant TXT files for batch upload to Migración Colombia portal.

## Features

- Filters foreign guests (excludes Colombian nationals - SIRE code 169)
- Filters by date (single date or range)
- Filters by movement type (check-in, check-out, or both)
- Returns tab-delimited TXT content ready for download
- Provides detailed exclusion report
- Validates required SIRE fields

## Request

### Headers

```
Content-Type: application/json
```

### Body

```typescript
{
  tenant_id: string;              // Required - Tenant identifier
  date?: string;                  // Optional - Single date YYYY-MM-DD (movement_date)
  date_from?: string;             // Optional - Range start YYYY-MM-DD
  date_to?: string;               // Optional - Range end YYYY-MM-DD
  movement_type?: 'E' | 'S' | 'both'; // Optional - Filter by movement type (default: 'both')
}
```

**Note:** Cannot use both `date` and `date_from/date_to` simultaneously.

### Movement Types

- `E` - Entrada (Check-in) - Uses `check_in_date`
- `S` - Salida (Check-out) - Uses `check_out_date`
- `both` - Both check-ins and check-outs (default)

## Response

### Success (200 OK)

```typescript
{
  success: true,
  txt_content: string,            // Tab-delimited TXT file content (CRLF line endings)
  filename: string,               // Suggested filename (SIRE_tenantid_YYYYMMDD.txt)
  guest_count: number,            // Number of guests included in TXT
  excluded_count: number,         // Number of guests excluded
  excluded: Array<{               // Details of excluded guests
    reservation_id: string,
    guest_name: string,
    reason: string
  }>,
  generated_at: string            // ISO timestamp
}
```

### Empty Result (200 OK)

```typescript
{
  success: true,
  txt_content: '',
  filename: 'SIRE_tenantid_empty.txt',
  guest_count: 0,
  excluded_count: 0,
  excluded: [],
  generated_at: '2025-12-23T...',
  message: 'No foreign guest reservations found for the specified criteria'
}
```

### Error (400 Bad Request)

```typescript
{
  error: string,                  // Error message
  details?: string                // Optional additional details
}
```

Common errors:
- `tenant_id is required`
- `Cannot use both "date" and "date_from/date_to". Choose one.`
- `Tenant not configured for SIRE (missing hotel_sire_code or hotel_city_code)`

### Error (500 Internal Server Error)

```typescript
{
  error: 'Internal server error',
  details: string                 // Error details
}
```

## TXT File Format

The generated TXT follows SIRE official specification:

- **Format:** Tab-delimited (TSV)
- **Line Endings:** CRLF (`\r\n`) - Windows format
- **Encoding:** UTF-8 (no BOM)
- **Columns:** 13 fields per line
- **Header:** None (first line is first guest)

### Column Order

1. Hotel Code (SCH code)
2. City Code (DIVIPOLA code)
3. Document Type (3=Passport, 5=Foreign ID, etc.)
4. Document Number
5. Nationality Code (SIRE country code, NOT ISO)
6. First Surname (UPPERCASE)
7. Second Surname (UPPERCASE, can be empty)
8. Given Names (UPPERCASE)
9. Movement Type (E or S)
10. Movement Date (DD/MM/YYYY)
11. Origin Place (country/city code)
12. Destination Place (country/city code)
13. Birth Date (DD/MM/YYYY)

## Exclusion Reasons

Guests may be excluded from the TXT file for the following reasons:

1. **Colombian nationals** - Automatically excluded (nationality_code = 169)
2. **Missing hotel codes** - `hotel_sire_code` or `hotel_city_code` not set in reservation
3. **Missing required SIRE fields** - One or more of:
   - `document_type`
   - `document_number`
   - `nationality_code`
   - `first_surname`
   - `given_names`
   - `birth_date`
   - `check_in_date` (for movement_type='E')
   - `check_out_date` (for movement_type='S')

## Examples

### Generate All Foreign Guests

```bash
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "hotelsanandres"
  }'
```

### Generate Check-ins for Today

```bash
curl -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "hotelsanandres",
    "date": "2025-12-23",
    "movement_type": "E"
  }'
```

### Generate December 2025 Check-outs

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

### TypeScript Example

```typescript
import { NextResponse } from 'next/server';

async function generateSIRETXT(tenantId: string) {
  const response = await fetch('/api/sire/generate-txt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_id: tenantId,
      movement_type: 'E',
      date: new Date().toISOString().split('T')[0], // Today
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();

  // Download TXT file
  const blob = new Blob([data.txt_content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = data.filename;
  a.click();
  URL.revokeObjectURL(url);

  return data;
}
```

## Database Requirements

The API queries the `guest_reservations` table which must have these columns:

**Required Columns:**
- `tenant_id` (string)
- `hotel_sire_code` (string) - SCH code for the hotel
- `hotel_city_code` (string) - DIVIPOLA code for the city
- `document_type` (string) - SIRE document type code
- `document_number` (string)
- `nationality_code` (string) - SIRE country code (NOT ISO)
- `first_surname` (string)
- `second_surname` (string, nullable)
- `given_names` (string)
- `birth_date` (date)
- `movement_type` (char) - 'E' or 'S'
- `movement_date` (date)
- `check_in_date` (date)
- `check_out_date` (date)

**Optional Columns:**
- `origin_city_code` (string) - Defaults to nationality_code
- `destination_city_code` (string) - Defaults to hotel_city_code
- `guest_name` (string) - Used in exclusion reports

## Testing

Run the included test suite:

```bash
# Start dev server first
pnpm run dev

# In another terminal
pnpm dlx tsx scripts/sire/test-generate-txt-api.ts
```

## Related Documentation

- **SIRE TXT Generator:** `src/lib/sire/sire-txt-generator.ts`
- **SIRE Catalogs:** `src/lib/sire/sire-catalogs.ts`
- **SIRE Codes:** `docs/features/sire-compliance/CODIGOS_OFICIALES.md`

## Implementation Notes

1. **Colombian Exclusion:** Hardcoded SIRE code `169` for Colombia
2. **Date Filtering:** Uses `movement_date` column (not check_in_date/check_out_date)
3. **Hotel Codes:** Expected to be stored IN `guest_reservations` table (not in `tenants` table)
4. **Movement Type:** Comes from `movement_type` column in database
5. **Line Endings:** CRLF enforced per SIRE specification

## Security Considerations

- ⚠️ No authentication implemented yet - add auth before production
- ⚠️ No rate limiting - consider adding for production
- ✅ Multi-tenant isolation via `tenant_id` filter
- ✅ SQL injection protection via Supabase query builder
- ✅ Input validation for date formats and movement types

## Performance

- **Query Complexity:** O(n) where n = number of reservations
- **Response Time:** < 500ms for ~100 guests
- **Memory Usage:** Linear with guest count
- **Bottleneck:** Database query (optimizable with indexes on `tenant_id`, `movement_date`, `nationality_code`)

## Changelog

### 2025-12-23 - Initial Implementation
- Created API endpoint
- Implemented date filtering (single date and range)
- Implemented movement type filtering
- Automatic Colombian exclusion
- Exclusion reporting
- Test suite created
