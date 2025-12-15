# SIRE Entity Extraction - Usage Guide

## Overview

The `entity-extraction.ts` module provides specialized entity extraction functions for SIRE compliance fields with confidence scoring and validation.

## Key Features

- **Field-specific extractors** for all SIRE conversational fields
- **Confidence scoring** (0.00-1.00) for each extraction
- **Multi-format support** (Spanish, English, natural language)
- **Fuzzy matching** with SIRE/DIVIPOLA catalogs
- **Comprehensive warnings** for edge cases

## Usage

### 1. Router Function (Recommended)

```typescript
import { extractSIREEntities } from '@/lib/sire/entity-extraction';

// Extract any SIRE field
const result = extractSIREEntities(userInput, fieldName);

console.log(result.value);       // Extracted value
console.log(result.confidence);  // 0.00-1.00
console.log(result.warnings);    // Optional warnings array
```

**Supported field names:**
- `full_name`, `nombre_completo`
- `birth_date`, `fecha_nacimiento`
- `nationality`, `nationality_text`, `pais_texto`
- `document_number`, `numero_pasaporte`
- `origin`, `procedencia`, `procedencia_texto`
- `destination`, `destino`, `destino_texto`

### 2. Direct Function Calls (Advanced)

```typescript
import {
  extractFullName,
  extractBirthDate,
  extractNationality,
  extractDocumentNumber,
  extractLocation
} from '@/lib/sire/entity-extraction';
```

## Examples

### Full Name Extraction

```typescript
// 3-part name (ideal)
extractFullName("John Smith Anderson")
// Returns: {
//   value: {
//     nombres: "JOHN",
//     primerApellido: "SMITH",
//     segundoApellido: "ANDERSON"
//   },
//   confidence: 1.00
// }

// Spanish format
extractFullName("García Pérez, Juan Pablo")
// Returns: {
//   value: {
//     nombres: "JUAN PABLO",
//     primerApellido: "GARCÍA",
//     segundoApellido: "PÉREZ"
//   },
//   confidence: 1.00
// }

// Compound first name
extractFullName("John Michael Smith Anderson")
// Returns: {
//   value: {
//     nombres: "JOHN MICHAEL",
//     primerApellido: "SMITH",
//     segundoApellido: "ANDERSON"
//   },
//   confidence: 0.90,
//   warnings: ["Nombre largo detectado..."]
// }
```

### Birth Date Extraction

```typescript
// Spanish long format
extractBirthDate("25 de marzo de 1985")
// Returns: { value: "1985-03-25", confidence: 1.00 }

// English format
extractBirthDate("March 25, 1985")
// Returns: { value: "1985-03-25", confidence: 1.00 }

// Slash format
extractBirthDate("25/03/1985")
// Returns: { value: "1985-03-25", confidence: 1.00 }

// ISO format
extractBirthDate("1985-03-25")
// Returns: { value: "1985-03-25", confidence: 1.00 }

// Minor age (warning)
extractBirthDate("01/01/2010")
// Returns: {
//   value: "2010-01-01",
//   confidence: 0.80,
//   warnings: ["Edad menor de 18 años..."]
// }
```

### Nationality Extraction

```typescript
// Spanish country name
extractNationality("Estados Unidos")
// Returns: { value: "249", confidence: 1.00 }  // SIRE code

// English country name
extractNationality("United States")
// Returns: { value: "249", confidence: 0.90 }  // Via alias

// Common abbreviations
extractNationality("USA")
// Returns: { value: "249", confidence: 0.90 }

extractNationality("UK")
// Returns: { value: "300", confidence: 0.90 }  // Reino Unido

// IMPORTANT: Returns SIRE codes, NOT ISO 3166-1
// - USA: SIRE 249 (NOT ISO 840)
// - Colombia: SIRE 169 (NOT ISO 170)
// - España: SIRE 245 (NOT ISO 724)
```

### Document Number Extraction

```typescript
// Passport format
extractDocumentNumber("AB-123456")
// Returns: { value: "AB123456", confidence: 1.00 }

// With spaces
extractDocumentNumber("AB 123456")
// Returns: { value: "AB123456", confidence: 1.00 }

// Lowercase (auto-uppercase)
extractDocumentNumber("ab123456")
// Returns: { value: "AB123456", confidence: 1.00 }

// Special characters (auto-clean)
extractDocumentNumber("AB.123.456")
// Returns: { value: "AB123456", confidence: 1.00 }

// Too long (truncated)
extractDocumentNumber("AB123456789012345")
// Returns: {
//   value: "AB1234567890123",
//   confidence: 0.70,
//   warnings: ["Número muy largo..."]
// }
```

### Location Extraction

```typescript
// Colombian city (DIVIPOLA code)
extractLocation("Bogotá")
// Returns: {
//   value: { code: "11001", type: "city", name: "Bogotá" },
//   confidence: 1.00
// }

extractLocation("Medellín")
// Returns: {
//   value: { code: "5001", type: "city", name: "Medellín" },
//   confidence: 1.00
// }

// Country (SIRE code)
extractLocation("Estados Unidos")
// Returns: {
//   value: { code: "249", type: "country", name: "ESTADOS UNIDOS" },
//   confidence: 0.90
// }

// Fuzzy match (without accent)
extractLocation("Bogota")
// Returns: {
//   value: { code: "11001", type: "city", name: "Bogota" },
//   confidence: 1.00
// }
```

## Confidence Scoring

### Full Name
- **1.00**: 3-part name or Spanish format
- **0.90**: 4+ words (compound name)
- **0.80**: 2-part name (missing second surname)
- **0.40**: 1-word (incomplete)

### Birth Date
- **1.00**: Valid date, age 18-120
- **0.80**: Valid date, age < 18 (minor warning)
- **0.60**: Valid date, age > 120
- **0.50**: Future date
- **0.00**: Invalid format

### Nationality
- **1.00**: Exact match in SIRE catalog
- **0.90**: Alias match (USA → Estados Unidos)
- **0.85**: Fuzzy match (accents, typos)
- **0.00**: Not found in catalog

### Document Number
- **1.00**: 6-15 alphanumeric characters
- **0.80**: < 6 chars (too short)
- **0.70**: > 15 chars (truncated)
- **0.00**: Empty or invalid

### Location
- **1.00**: Colombian city found (DIVIPOLA)
- **0.90**: Country found (SIRE)
- **0.00**: Not found

## Integration Example

```typescript
import { extractSIREEntities } from '@/lib/sire/entity-extraction';
import { ComplianceChatEngine } from '@/lib/compliance-chat-engine';

async function handleUserInput(
  fieldName: string,
  userMessage: string
): Promise<void> {
  // Extract entity
  const result = extractSIREEntities(userMessage, fieldName);

  if (result.confidence < 0.70) {
    // Low confidence - ask for clarification
    console.log("❌ Low confidence:", result.warnings);
    return;
  }

  if (result.warnings && result.warnings.length > 0) {
    // Medium confidence - show warnings
    console.log("⚠️  Warnings:", result.warnings);
  }

  // High confidence - use the value
  console.log("✅ Extracted:", result.value);

  // Update compliance state
  const engine = new ComplianceChatEngine();
  // ... update conversational data
}
```

## Error Handling

```typescript
const result = extractSIREEntities(userInput, fieldName);

if (result.value === null) {
  // Extraction failed
  console.error("Extraction failed:", result.warnings);
  // Ask user to rephrase or provide in different format
}

if (result.confidence < 0.70) {
  // Low confidence - verify with user
  console.warn("Low confidence:", result.confidence);
  console.warn("Warnings:", result.warnings);
  // Show extracted value and ask for confirmation
}

if (result.warnings) {
  // Medium confidence - show warnings to user
  console.info("Please verify:", result.warnings);
}
```

## Best Practices

1. **Always check confidence** before using extracted value
2. **Show warnings to user** when confidence < 1.00
3. **Ask for confirmation** when confidence < 0.70
4. **Handle null values** gracefully (extraction failure)
5. **Use router function** (`extractSIREEntities`) for consistency
6. **Log extraction results** for debugging and audit

## Testing

```typescript
import { extractSIREEntities } from '@/lib/sire/entity-extraction';

describe('Entity Extraction', () => {
  it('should extract full name', () => {
    const result = extractSIREEntities('John Smith', 'full_name');

    expect(result.value).toHaveProperty('nombres');
    expect(result.confidence).toBeGreaterThan(0.70);
  });
});
```

See: `src/lib/sire/__tests__/entity-extraction.test.ts` for 42 comprehensive test cases.

## SIRE Code References

**IMPORTANT:** All country codes are SIRE codes (NOT ISO 3166-1)

- **USA**: SIRE 249 (NOT ISO 840)
- **Colombia**: SIRE 169 (NOT ISO 170)
- **Brasil**: SIRE 105 (NOT ISO 076)
- **España**: SIRE 245 (NOT ISO 724)

**Sources:**
- Country codes: `_assets/sire/codigos-pais.json` (250 countries)
- City codes: `_assets/sire/ciudades-colombia.json` (1,122 Colombian cities)
- Official docs: `docs/features/sire-compliance/CODIGOS_OFICIALES.md`

## Related Files

- **Implementation**: `src/lib/sire/entity-extraction.ts`
- **Tests**: `src/lib/sire/__tests__/entity-extraction.test.ts`
- **Catalogs**: `src/lib/sire/sire-catalogs.ts`
- **Field Mappers**: `src/lib/sire/field-mappers.ts`
- **Compliance Engine**: `src/lib/compliance-chat-engine.ts`

---

**Last Updated:** December 5, 2025
