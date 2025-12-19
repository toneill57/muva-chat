# SIRE Conversational Data Capture

Sistema de captura conversacional de datos para SIRE (Migración Colombia).

## Archivos del Sistema

| Archivo | Propósito |
|---------|-----------|
| `sire-catalogs.ts` | Códigos oficiales SIRE (250 países, 1122 ciudades) + helpers de búsqueda fuzzy |
| `field-mappers.ts` | Mappers conversational ↔ SIRE (dos capas) + validaciones |
| `conversational-prompts.ts` | Prompts especializados para captura conversacional (multi-idioma) |

## Flujo de Captura (Dos Capas)

```typescript
// Capa 1: Datos conversacionales (extraídos del chat)
interface SIREConversationalData {
  names: "JOHN MICHAEL"
  first_surname: "SMITH"
  nationality_text: "United States"
  identification_number: "AB1234567"
  birth_date: "15/05/1985"
  // ... otros campos
}

// Capa 2: 13 campos oficiales SIRE
interface SIREData {
  codigo_hotel: "7706"
  codigo_ciudad: "88001"
  codigo_nacionalidad: "249"  // USA (SIRE code, NOT ISO 840)
  numero_identificacion: "AB1234567"
  primer_apellido: "SMITH"
  nombres: "JOHN MICHAEL"
  // ... otros campos
}
```

## Uso en Chat Interface

### 1. Inicializar Conversación con System Prompt

```typescript
import { SIRE_SYSTEM_PROMPT } from '@/lib/sire/conversational-prompts'

// Al iniciar conversación de captura SIRE
const messages = [
  {
    role: 'system',
    content: SIRE_SYSTEM_PROMPT
  },
  {
    role: 'assistant',
    content: '¡Bienvenido! Para completar tu registro, necesito algunos datos. ¿Puedes compartir tu nombre completo como aparece en tu pasaporte?'
  }
]
```

### 2. Generar Preguntas Context-Aware

```typescript
import { getQuestionForField } from '@/lib/sire/conversational-prompts'

// Ejemplo: Preguntar origen según nacionalidad
const question = getQuestionForField('origin', {
  language: 'es',
  previousData: {
    nationality_code: '169' // Colombia
  }
})
// Returns: "¿De qué ciudad de Colombia vienes?"

// Si fuera extranjero:
const question2 = getQuestionForField('origin', {
  language: 'es',
  previousData: {
    nationality_code: '249' // USA
  }
})
// Returns: "¿De dónde vienes? ¿Cuál fue tu última ubicación antes de llegar al hotel?"
```

### 3. Validar Campos en Tiempo Real

```typescript
import {
  getValidationMessage,
  VALIDATION_MESSAGES
} from '@/lib/sire/conversational-prompts'
import { validateSIREDateFormat } from '@/lib/sire/field-mappers'

// Validar fecha de nacimiento
const birthDate = '15/05/1985'
if (!validateSIREDateFormat(birthDate)) {
  const errorMsg = getValidationMessage('birth_date_invalid_format', 'es')
  // Send error message to user
} else {
  const successMsg = getValidationMessage('birth_date_success', 'es', {
    date: birthDate
  })
  // Confirm with user
}
```

### 4. Verificar Completitud de Datos

```typescript
import {
  isDataComplete,
  getMissingFields
} from '@/lib/sire/conversational-prompts'

const capturedData: Partial<SIREConversationalData> = {
  names: 'JOHN MICHAEL',
  first_surname: 'SMITH',
  // ... otros campos parciales
}

if (!isDataComplete(capturedData)) {
  const missing = getMissingFields(capturedData)
  console.log('Campos faltantes:', missing)
  // Continue asking questions for missing fields
} else {
  // Proceed to confirmation step
}
```

### 5. Confirmar Datos Antes de Enviar

```typescript
import { formatDataSummary } from '@/lib/sire/conversational-prompts'

// Generar resumen para confirmación
const summary = formatDataSummary(fullData, 'es')
// Returns formatted summary with all captured data

// Send to user for confirmation
await sendMessage(summary)
```

### 6. Mapear a Formato SIRE Oficial

```typescript
import {
  mapConversationalToSIRE,
  type ConversationalData
} from '@/lib/sire/field-mappers'

// Después de confirmación, mapear a formato SIRE
const conversationalData: ConversationalData = {
  nombre_completo: 'John Michael Smith',
  numero_pasaporte: 'AB-1234567',
  pais_texto: 'Estados Unidos',
  proposito_viaje: 'turismo',
  fecha_nacimiento: new Date('1985-05-15')
}

const hotelInfo = {
  codigo_hotel: '7706',
  codigo_ciudad: '88001'
}

const sireData = mapConversationalToSIRE(conversationalData, hotelInfo)
// Returns: { codigo_hotel: "7706", codigo_nacionalidad: "249", ... }
```

### 7. Enviar a SIRE

```typescript
// POST to SIRE submission endpoint
const response = await fetch('/api/compliance/sire/submit', {
  method: 'POST',
  body: JSON.stringify(sireData)
})
```

## Ejemplo Completo: Chat Flow

```typescript
import {
  SIRE_SYSTEM_PROMPT,
  getQuestionForField,
  getValidationMessage,
  isDataComplete,
  formatDataSummary,
  type SIREConversationalData
} from '@/lib/sire/conversational-prompts'
import { mapConversationalToSIRE } from '@/lib/sire/field-mappers'

// Estado del chat
let capturedData: Partial<SIREConversationalData> = {}
let currentField = 'full_name'

// Inicializar conversación
const systemMessage = {
  role: 'system',
  content: SIRE_SYSTEM_PROMPT
}

// Generar primera pregunta
const firstQuestion = getQuestionForField('full_name', { language: 'es' })
// "¿Cuál es tu nombre completo como aparece en el pasaporte?"

// Usuario responde: "John Michael Smith"
// Extraer y validar datos...
capturedData.names = 'JOHN MICHAEL'
capturedData.first_surname = 'SMITH'

// Siguiente pregunta
currentField = 'document_number'
const nextQuestion = getQuestionForField(currentField, { language: 'es' })
// "¿Podrías compartir el número de tu pasaporte? (Sin guiones ni espacios)"

// Usuario responde: "AB-1234567"
// Validar y limpiar...
import { cleanPassportNumber } from '@/lib/sire/field-mappers'
const cleanedNumber = cleanPassportNumber('AB-1234567') // "AB1234567"
capturedData.identification_number = cleanedNumber

// Continuar hasta completar todos los campos...

// Verificar completitud
if (isDataComplete(capturedData as SIREConversationalData)) {
  // Mostrar resumen
  const summary = formatDataSummary(
    capturedData as SIREConversationalData,
    'es'
  )

  // Esperar confirmación del usuario
  // Si confirma, mapear a SIRE y enviar
  const sireData = mapConversationalToSIRE(
    conversationalData,
    hotelInfo
  )

  // Enviar a SIRE...
}
```

## Características Clave

### Progressive Disclosure
- Máximo 5 preguntas al huésped
- Agrupar campos relacionados (nombre completo = 1 pregunta)
- No abrumar con formularios largos

### Context-Aware Logic
- Si nacionalidad = Colombia → preguntar ciudad colombiana (DIVIPOLA)
- Si nacionalidad ≠ Colombia → preguntar país (código SIRE)
- Auto-detectar tipo de documento según formato

### Multi-Idioma
- Español (es) e Inglés (en)
- Templates personalizados por idioma
- Mensajes de validación localizados

### Validación en Tiempo Real
- Validar cada campo antes de continuar
- Mensajes de error amigables
- Auto-corrección cuando sea posible (ej: remover guiones de pasaporte)

### Códigos SIRE (NO ISO)
- USA = 249 (NOT ISO 840)
- Colombia = 169 (NOT ISO 170)
- Brasil = 105 (NOT ISO 076)
- Ver `src/lib/sire/sire-catalogs.ts` para catálogo completo

## Documentación

- **Códigos oficiales SIRE:** `docs/features/sire-compliance/CODIGOS_OFICIALES.md`
- **Diferencias SIRE vs ISO:** `docs/features/sire-compliance/CODIGOS_SIRE_VS_ISO.md`
- **Catálogo de países:** `_assets/sire/codigos-pais.json` (250 países)
- **Catálogo de ciudades:** `_assets/sire/ciudades-colombia.json` (1122 ciudades)

## Testing

```bash
# Compilar TypeScript
pnpm exec tsc --noEmit src/lib/sire/conversational-prompts.ts

# Build completo
pnpm run build
```

## Próximos Pasos

1. Integrar con `src/components/Chat/GuestChatInterface.tsx`
2. Crear endpoint `/api/compliance/sire/submit` para envío a SIRE
3. Implementar estado de conversación (React Context o Zustand)
4. Agregar tests unitarios para validaciones
5. Crear flujo de corrección de datos (si usuario quiere editar)

## Lecciones Aprendidas

- **NUNCA usar códigos ISO** para SIRE (son diferentes!)
- **Validar en tiempo real** (no esperar al final)
- **Progressive disclosure** (5 preguntas máximo, no 13)
- **Context-aware** (colombianos vs extranjeros tienen flujos diferentes)
- **Lenguaje natural** (no mencionar "SIRE" o "Migración Colombia" al huésped)
