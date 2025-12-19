# SIRE Entity Extraction System

**Created:** December 18, 2025
**Status:** ✅ Implemented (FASE 1 - Tarea 1.5)
**File:** `src/lib/compliance-chat-engine.ts` (lines 935-1300)

---

## Overview

Sistema de extracción inteligente de entidades SIRE que parsea respuestas conversacionales del usuario y extrae automáticamente datos estructurados para los 13 campos oficiales de SIRE.

### Características

- Parsing de nombres compuestos (primer apellido, segundo apellido, nombres)
- Parsing de fechas en español e inglés
- Mapping de países en lenguaje natural → códigos SIRE oficiales
- Normalización de números de identificación (pasaportes)
- Confidence scoring por entidad (0.00-1.00)
- Manejo de aliases y variaciones comunes

---

## API Reference

### Interface: `EntityExtractionResult<T>`

```typescript
export interface EntityExtractionResult<T = any> {
  value: T | null;           // Valor extraído (null si no se encontró)
  confidence: number;         // Confianza 0.00-1.00
  normalized?: T;            // Valor normalizado (opcional)
}
```

### Function: `extractSIREEntity()`

**Dispatcher principal** que extrae una entidad SIRE según el tipo de campo.

```typescript
export function extractSIREEntity(
  message: string,
  fieldName: string,
  context?: Record<string, any>
): EntityExtractionResult
```

**Supported Fields:**

| Field Name | Description | Example Input | Example Output |
|------------|-------------|---------------|----------------|
| `identification_number` | Pasaporte/cédula | "AB-123456" | `{ value: "AB123456", confidence: 0.95 }` |
| `first_surname` | Primer apellido | "Juan Pérez García" | `{ value: "Pérez", confidence: 0.85 }` |
| `names` | Nombres | "Juan Pablo Pérez García" | `{ value: "Juan Pablo", confidence: 0.85 }` |
| `nationality_code` | Nacionalidad → código SIRE | "estadounidense" | `{ value: "249", confidence: 0.90 }` |
| `birth_date` | Fecha de nacimiento | "25 de marzo de 1985" | `{ value: "25/03/1985", confidence: 0.95 }` |
| `origin_place` | Procedencia → código DIVIPOLA/SIRE | "Vengo de Bogotá" | `{ value: "11001", confidence: 0.90 }` |
| `destination_place` | Destino → código DIVIPOLA/SIRE | "usa" | `{ value: "249", confidence: 0.90 }` |

---

## Funciones de Extracción

### 1. `extractIdentificationNumber()`

Extrae y normaliza números de identificación (pasaportes, cédulas).

**Features:**
- Remueve guiones, espacios y caracteres especiales
- Pattern matching: 1-2 letras + 6-9 dígitos
- Maneja formatos con guiones (AB-123456 → AB123456)

**Examples:**
```typescript
extractIdentificationNumber("Mi pasaporte es AB-123456")
// { value: "AB123456", confidence: 0.95, normalized: "AB123456" }

extractIdentificationNumber("US12345678")
// { value: "US12345678", confidence: 0.95, normalized: "US12345678" }
```

**Confidence Levels:**
- **0.95**: Pattern de pasaporte encontrado con guiones/espacios
- **0.85**: Normalización exitosa (6-15 caracteres alfanuméricos)
- **0.00**: No se pudo extraer

---

### 2. `extractNameComponent()`

Extrae componentes de nombre desde nombre completo.

**Logic:**
- **1 palabra:** Asume que es el componente solicitado (confidence: 0.70)
- **2 palabras:**
  - `first_surname` → última palabra
  - `names` → primera palabra
  - Confidence: 0.80
- **3+ palabras:**
  - `first_surname` → penúltima palabra
  - `names` → todas excepto las 2 últimas
  - Confidence: 0.85

**Examples:**
```typescript
extractNameComponent("Juan Pérez García", "first_surname")
// { value: "Pérez", confidence: 0.85 }

extractNameComponent("Juan Pablo Pérez García", "names")
// { value: "Juan Pablo", confidence: 0.85 }

extractNameComponent("Smith", "first_surname")
// { value: "Smith", confidence: 0.70 }
```

**Confidence Levels:**
- **0.85**: 3+ palabras (alta confianza en la estructura)
- **0.80**: 2 palabras (confianza media)
- **0.70**: 1 palabra (baja confianza, asunción)

---

### 3. `extractNationality()`

Extrae nacionalidad y mapea a código SIRE oficial.

**Features:**
- Usa `getSIRECountryCode()` de `sire-catalogs.ts`
- Maneja aliases comunes (estadounidense, american, usa, uk)
- Fuzzy matching con catálogo oficial SIRE (250 países)

**Supported Aliases:**
- USA: usa, eeuu, ee.uu., estados unidos de américa, united states, american, americano, estadounidense
- UK: uk, england, britain, great britain, inglés, británico
- Colombia: colombiano, colombian

**Examples:**
```typescript
extractNationality("Soy estadounidense")
// { value: "249", confidence: 0.90, normalized: "249" }

extractNationality("Estados Unidos")
// { value: "249", confidence: 0.95, normalized: "249" }

extractNationality("Reino Unido")
// { value: "246", confidence: 0.95, normalized: "246" }
```

**Confidence Levels:**
- **0.95**: Match directo en catálogo oficial
- **0.90**: Match por alias
- **0.00**: País no encontrado

**IMPORTANTE:** Usa códigos SIRE oficiales, NO ISO 3166-1:
- USA: SIRE 249 (NOT ISO 840)
- Colombia: SIRE 169 (NOT ISO 170)
- España: SIRE 245 (NOT ISO 724)

---

### 4. `extractBirthDate()`

Extrae y normaliza fechas de nacimiento.

**Supported Formats:**

1. **DD/MM/YYYY** - `15/10/1990`
2. **Español** - `25 de marzo de 1985`
3. **Inglés** - `March 25, 1985`

**Examples:**
```typescript
extractBirthDate("Nací el 25 de marzo de 1985")
// { value: "25/03/1985", confidence: 0.95, normalized: "25/03/1985" }

extractBirthDate("March 25, 1985")
// { value: "25/03/1985", confidence: 0.95, normalized: "25/03/1985" }

extractBirthDate("15/10/1990")
// { value: "15/10/1990", confidence: 0.95, normalized: "15/10/1990" }
```

**Validation:**
- Fecha debe ser válida (no 32/13/2025)
- Fecha no puede ser futura

**Confidence Levels:**
- **0.95**: Formato reconocido y fecha válida
- **0.00**: No se pudo parsear o fecha inválida

---

### 5. `extractLocation()`

Extrae lugar (procedencia/destino) y mapea a código DIVIPOLA o SIRE.

**Features:**
- Prioriza aliases de países ANTES de catálogos (evita falsos positivos)
- Extrae ciudad/país del contexto del mensaje
- Intenta primero ciudades colombianas (DIVIPOLA), luego países (SIRE)

**Supported Patterns:**
- "Vengo de X"
- "Voy a X"
- "desde X"
- Solo "X"

**Examples:**
```typescript
extractLocation("Vengo de Bogotá", "origin_place")
// { value: "11001", confidence: 0.90, normalized: "11001" }

extractLocation("usa", "destination_place")
// { value: "249", confidence: 0.90, normalized: "249" }

extractLocation("Voy a Medellín", "destination_place")
// { value: "05001", confidence: 0.90, normalized: "05001" }
```

**Confidence Levels:**
- **0.90**: Alias exacto o ciudad colombiana encontrada
- **0.85**: País encontrado en catálogo
- **0.80**: Alias dentro del mensaje (match parcial)
- **0.00**: No se pudo determinar

**IMPORTANTE:** Campo 11 (procedencia) y Campo 12 (destino) aceptan AMBOS:
- Códigos de ciudad (DIVIPOLA 5 dígitos): "Bogotá" → 11001
- Códigos de país (SIRE 1-3 dígitos): "Estados Unidos" → 249

---

## Testing

### Test Script

**File:** `scripts/test-entity-extraction.ts`

**Run:**
```bash
pnpm dlx tsx scripts/test-entity-extraction.ts
```

### Test Results

✅ **10/10 tests PASSED** (December 18, 2025)

| Test | Input | Field | Result | Confidence |
|------|-------|-------|--------|------------|
| 1 | "Mi pasaporte es AB-123456" | identification_number | AB123456 | 0.95 |
| 2 | "Juan Pérez García" | first_surname | Pérez | 0.85 |
| 3 | "Juan Pablo Pérez García" | names | Juan Pablo | 0.85 |
| 4 | "Soy estadounidense" | nationality_code | 249 | 0.90 |
| 5 | "Estados Unidos" | nationality_code | 249 | 0.95 |
| 6 | "Nací el 25 de marzo de 1985" | birth_date | 25/03/1985 | 0.95 |
| 7 | "March 25, 1985" | birth_date | 25/03/1985 | 0.95 |
| 8 | "15/10/1990" | birth_date | 15/10/1990 | 0.95 |
| 9 | "Vengo de Bogotá" | origin_place | 11001 | 0.90 |
| 10 | "usa" | destination_place | 249 | 0.90 |

---

## Integration with Progressive Disclosure

### Current State (Tarea 1.5)

Funciones disponibles como **helpers standalone** en `compliance-chat-engine.ts`.

### Next Steps (Tarea 1.6)

Integrar con Chat API (`/api/guest/chat/route.ts`):

```typescript
// Pseudocódigo de integración futura
const userMessage = "Mi pasaporte es AB-123456";
const currentField = "identification_number";

// Extraer entidad automáticamente
const extraction = extractSIREEntity(userMessage, currentField);

if (extraction.confidence >= 0.80) {
  // Alta confianza → pre-rellenar y pedir confirmación
  conversationalData[currentField] = extraction.value;
} else {
  // Baja confianza → pedir aclaración
  // (mantener flujo conversacional actual)
}
```

---

## Dependencies

- `@/lib/sire/sire-catalogs.ts` - Catálogos oficiales SIRE (países y ciudades)
  - `getSIRECountryCode()` - 250 países con fuzzy search
  - `getDIVIPOLACityCode()` - 1,122 ciudades colombianas con fuzzy search

---

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| extractIdentificationNumber() | O(1) | Regex matching |
| extractNameComponent() | O(n) | n = número de palabras |
| extractNationality() | O(m) | m = tamaño catálogo (250 países) + fuzzy search |
| extractBirthDate() | O(1) | Regex matching |
| extractLocation() | O(m + c) | m = países (250), c = ciudades (1,122) + fuzzy search |

**Nota:** Fuzzy search en catálogos usa normalización de strings (lowercase, sin acentos) para performance óptima.

---

## Error Handling

Todas las funciones de extracción retornan `{ value: null, confidence: 0 }` si:
- No pueden parsear el mensaje
- El valor extraído no pasa validación
- No encuentran match en catálogos

**NO lanzan excepciones** - safe for production use.

---

## Future Enhancements

### Tarea 1.6: Chat API Integration

- Integrar con `/api/guest/chat/route.ts`
- Auto-extracción + confirmación conversacional
- Threshold de confidence (0.80+) para pre-rellenado

### Tarea 1.7: Advanced NLP (Future)

- Usar Anthropic Claude para extracción más sofisticada
- Manejo de contexto multi-mensaje
- Corrección de errores ortográficos

---

## Changelog

### v1.0.0 (December 18, 2025)

- ✅ Initial implementation (Tarea 1.5)
- ✅ 6 funciones de extracción implementadas
- ✅ Interface `EntityExtractionResult` creada
- ✅ Dispatcher `extractSIREEntity()` implementado
- ✅ Testing completo (10/10 tests passed)
- ✅ Documentación completa

---

**Related Documentation:**

- `docs/features/sire-compliance/CODIGOS_OFICIALES.md` - Especificación oficial SIRE
- `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md` - Diferencias SIRE vs ISO
- `docs/features/sire-compliance/DATABASE_SCHEMA_CLARIFICATION.md` - Campos geográficos
- `src/lib/sire/conversational-prompts.ts` - System prompts conversacionales
- `src/lib/sire/progressive-disclosure.ts` - Lógica de captura secuencial
