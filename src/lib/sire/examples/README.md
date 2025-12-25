# SIRE TXT Generator - Examples

This directory contains usage examples for the SIRE TXT file generator.

## Quick Start

```typescript
import { generateSIRETXT, mapReservationToSIRE } from '@/lib/sire/sire-txt-generator';

// 1. Define tenant info
const tenantInfo = {
  hotel_sire_code: '12345',
  hotel_city_code: '88001'
};

// 2. Map database reservations
const guests = reservations
  .map(r => mapReservationToSIRE(r, tenantInfo, 'E'))
  .filter(g => g !== null);

// 3. Generate TXT file
const result = generateSIRETXT(guests, 'hotel-id');

// 4. Download or save
console.log(result.filename); // "SIRE_hotel-id_20251223.txt"
console.log(result.content);  // Tab-delimited content
```

## File Format

**Output:** Tab-delimited TXT file (13 columns, CRLF line endings)

**Example line:**
```
12345	88001	3	AB1234567	249	SMITH	JOHNSON	JOHN MICHAEL	E	15/10/2025	249	88001	25/03/1985
```

**Field order:**
1. `codigo_hotel` - Hotel SCH code
2. `codigo_ciudad` - City DIVIPOLA code
3. `tipo_documento` - Document type (3=Passport, 5=Foreign ID, etc.)
4. `numero_identificacion` - Document number
5. `codigo_nacionalidad` - SIRE country code (NOT ISO)
6. `primer_apellido` - First surname (UPPERCASE)
7. `segundo_apellido` - Second surname or empty (UPPERCASE)
8. `nombres` - Given names (UPPERCASE)
9. `tipo_movimiento` - Movement type (E=Check-in, S=Check-out)
10. `fecha_movimiento` - Movement date (DD/MM/YYYY)
11. `lugar_procedencia` - Origin country/city code
12. `lugar_destino` - Destination country/city code
13. `fecha_nacimiento` - Birth date (DD/MM/YYYY)

## Examples

See `txt-generator-usage.ts` for:

- **Example 1:** Manual data entry
- **Example 2:** Generate from database reservations
- **Example 3:** Check-ins and check-outs combined
- **Example 4:** Error handling and validation
- **Example 5:** Browser download

## Key Features

- Automatic UPPERCASE conversion for names
- Empty `segundo_apellido` handled correctly
- CRLF line endings (Windows format)
- UTF-8 encoding (without BOM)
- Date formatting: YYYY-MM-DD → DD/MM/YYYY
- Validation: Skips reservations with missing required fields

## Testing

Run unit tests:

```bash
npm test -- src/lib/sire/__tests__/sire-txt-generator.test.ts
```

**Test coverage:**
- 24/24 tests passing
- Line generation (13 fields, tab-delimited)
- CRLF line endings
- UPPERCASE names
- Empty field handling
- Database mapping
- Validation and error handling

## Related Files

- `src/lib/sire/sire-txt-generator.ts` - Main generator
- `src/lib/sire/sire-catalogs.ts` - SIRE codes and date formatting
- `docs/features/sire-compliance/CODIGOS_OFICIALES.md` - Official SIRE spec

## Next Steps

This generator will be integrated into:

1. **Monthly Export API** (`/api/sire/monthly-export`)
   - Generate TXT for all movements in a month
   - Combine check-ins and check-outs
   - Return downloadable file

2. **Batch Upload UI** (SIRE Auto-Submission feature)
   - Preview TXT content before download
   - Validate completeness
   - Track submission status

3. **Puppeteer Automation** (Future: FASE 3)
   - Auto-upload to Migración Colombia portal
   - Handle login and file submission
   - Report success/errors

---

**Created:** December 23, 2025
**Last Updated:** December 23, 2025
