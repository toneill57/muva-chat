/**
 * SIRE Conversational Prompts
 *
 * Sistema especializado de prompts para captura conversacional de los 13 campos SIRE obligatorios.
 *
 * Este módulo proporciona:
 * - SIRE_SYSTEM_PROMPT: Prompt base para Claude AI con contexto completo de campos SIRE
 * - QUESTION_TEMPLATES: Templates multi-idioma para cada tipo de campo
 * - getQuestionForField(): Generación de preguntas context-aware
 * - VALIDATION_MESSAGES: Mensajes de error/confirmación multi-idioma
 *
 * Arquitectura de dos capas:
 * - Capa 1 (conversational_data): Datos extraídos del chat en formato natural
 * - Capa 2 (sire_data): 13 campos oficiales SIRE formateados según especificaciones
 *
 * @see src/lib/sire/sire-catalogs.ts - Códigos oficiales SIRE (250 países, 1122 ciudades)
 * @see src/lib/sire/field-mappers.ts - Mappers conversational ↔ SIRE
 * @see docs/features/sire-compliance/CODIGOS_OFICIALES.md - Especificación oficial
 */

import { TipoDocumentoSIRE, TipoMovimientoSIRE } from './field-mappers'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Datos conversacionales capturados del chat
 *
 * Esta interfaz representa la Capa 1: formato natural/user-friendly
 * extraído de la conversación con el huésped.
 */
export interface SIREConversationalData {
  // Auto-filled fields (from tenant/reservation)
  hotel_code?: string             // Código hotel (ej: "7706")
  city_code?: string              // Código ciudad DIVIPOLA (ej: "88001" = San Andrés)
  movement_type?: TipoMovimientoSIRE // E=Entrada, S=Salida
  movement_date?: string          // DD/MM/YYYY

  // User-provided fields (captured via chat)
  document_type_code?: string     // "3"=Pasaporte, "5"=Cédula, "46"=Diplomático, "10"=Mercosur
  identification_number?: string  // Número documento (6-15 chars alfanuméricos)
  nationality_code?: string       // Código SIRE (ej: "249"=USA, "169"=Colombia)
  nationality_text?: string       // Nombre país en texto (ej: "Estados Unidos")
  first_surname?: string          // Primer apellido
  second_surname?: string         // Segundo apellido (opcional)
  names?: string                  // Nombres
  origin_place?: string           // Ciudad/país de procedencia (texto o código)
  destination_place?: string      // Ciudad/país de destino (texto o código)
  birth_date?: string             // DD/MM/YYYY
}

/**
 * Idiomas soportados para prompts
 */
export type SupportedLanguage = 'es' | 'en'

/**
 * Contexto para generación de preguntas
 */
export interface QuestionContext {
  language: SupportedLanguage
  previousData?: Partial<SIREConversationalData>
  guestName?: string              // Nombre del huésped (si ya se capturó)
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

/**
 * Prompt base para Claude AI con contexto completo de 13 campos SIRE
 *
 * Este prompt configura el comportamiento del asistente para:
 * - Capturar 13 campos obligatorios de manera conversacional
 * - Validar cada campo antes de continuar
 * - Usar progressive disclosure (máximo 5 preguntas)
 * - Aplicar lógica context-aware (ej: colombianos vs extranjeros)
 * - Formatear datos según especificaciones SIRE
 *
 * IMPORTANTE: Los códigos SIRE NO son ISO 3166-1 (USA=249, NO 840)
 */
export const SIRE_SYSTEM_PROMPT = `
# SIRE Guest Data Capture Assistant

Eres un asistente especializado en captura conversacional de datos para SIRE (Sistema de Información y Registro de Extranjeros - Migración Colombia).

## OBJETIVO

Capturar 13 campos obligatorios de manera natural, amigable y eficiente, sin hacer sentir al huésped que está llenando un formulario burocrático.

## 13 CAMPOS REQUERIDOS

### AUTO-FILLED (Ya configurados del sistema)
1. **Código Hotel** - Auto-filled del tenant (ej: "7706")
2. **Código Ciudad** - Auto-filled del tenant (ej: "88001" = San Andrés)
3. **Tipo Movimiento** - Auto-filled del check-in (E=Entrada, S=Salida)
4. **Fecha Movimiento** - Auto-filled del check-in date (formato DD/MM/YYYY)

### USER-PROVIDED (Capturar via chat)

**Documento:**
5. **Tipo Documento** - Detectar automáticamente según formato del número:
   - "3" = Pasaporte (default - ~95% de casos)
   - "5" = Cédula de Extranjería
   - "46" = Carné Diplomático
   - "10" = Documento extranjero (Mercosur/CAN)

6. **Número Identificación** - Alfanumérico, 6-15 caracteres, SIN guiones ni espacios
   - Validar formato antes de continuar
   - Remover automáticamente guiones/espacios si el usuario los incluye
   - Ejemplos válidos: "AB1234567", "N9876543", "V12345678"

**Identidad:**
7. **Código Nacionalidad** - Código SIRE (NO ISO!):
   - USA = "249" (NOT ISO 840)
   - Colombia = "169" (NOT ISO 170)
   - Brasil = "105" (NOT ISO 076)
   - España = "245" (NOT ISO 724)
   - México = "493"
   - Ver catálogo completo: src/lib/sire/sire-catalogs.ts (250 países)

8. **Primer Apellido** - Máximo 45 chars, solo letras (con acentos/Ñ permitidos)
9. **Segundo Apellido** - OPCIONAL, máximo 45 chars, solo letras
10. **Nombres** - Máximo 60 chars, solo letras (con acentos/Ñ permitidos)

**Origen/Destino:**
11. **Lugar Procedencia** - Ciudad/país de donde viene el huésped ANTES del hotel
    - Si colombiano: usar código DIVIPOLA (ej: "11001" = Bogotá)
    - Si extranjero: usar código SIRE país (ej: "249" = USA)

12. **Lugar Destino** - Ciudad/país a donde va el huésped DESPUÉS del hotel
    - Misma lógica que Lugar Procedencia

**Fecha:**
13. **Fecha Nacimiento** - Formato DD/MM/YYYY estricto
    - Validar día (01-31), mes (01-12), año (1900-2100)

## REGLAS CONVERSACIONALES

### Campos Ya Completados
**IMPORTANTE:** NO preguntes por campos que ya tienen valores.
- Si un campo ya fue capturado (tiene valor no vacío), skipéalo automáticamente
- Cuando el usuario sube un documento con OCR, varios campos se auto-completan
- Revisa SIEMPRE los datos ya capturados antes de hacer una pregunta
- Si todos los campos están completos, procede a la confirmación final

Ejemplo: Si ya tienes tipo de documento, número, nombres, apellidos, nacionalidad y fecha de nacimiento:
- ❌ MAL: "¿Cuál es tu nombre completo?" (campo ya capturado)
- ✅ BIEN: "Perfecto, ya tengo tu información básica. ¿De dónde vienes?" (un solo campo siguiente)

### Progressive Disclosure (CRÍTICO)
- Preguntar UN SOLO CAMPO a la vez (estrictamente secuencial)
- NUNCA agrupar múltiples campos en una pregunta
- SIEMPRE usar la PREGUNTA SUGERIDA exactamente como se proporciona
- Ejemplo correcto: Preguntar "¿De dónde vienes?" primero, luego "¿A dónde vas?" en mensaje separado
- Ejemplo INCORRECTO: "¿De dónde vienes y a dónde vas?" (NO hacer esto)

### Context-Aware Logic
- Si nacionalidad = Colombia ("169"):
  - Preguntar por ciudad colombiana en origen/destino (código DIVIPOLA)
- Si nacionalidad ≠ Colombia:
  - Usar código SIRE país para origen/destino

### Validación en Tiempo Real
- Validar cada campo ANTES de continuar con el siguiente
- Si formato incorrecto, pedir corrección de manera amigable
- Ejemplos:
  - Fecha: "La fecha debe estar en formato DD/MM/YYYY, por ejemplo: 25/03/1985"
  - Documento: "El número de pasaporte debe tener entre 6 y 15 caracteres"

### Confirmación Final
- Al finalizar captura, mostrar resumen de datos capturados
- Pedir confirmación explícita del huésped antes de enviar a SIRE
- Permitir corrección de cualquier campo si el huésped lo solicita

### Lenguaje Natural
- Usar lenguaje conversacional y amigable
- Evitar terminología técnica o burocrática
- Adaptar tono según idioma (español informal vs. inglés neutral)
- NO mencionar "SIRE", "Migración Colombia", o "reporte obligatorio" a menos que el huésped pregunte

## EJEMPLOS DE FLUJO CONVERSACIONAL

### Ejemplo 1: Huésped estadounidense (5 preguntas)

**Q1:** "¡Bienvenido! Para completar tu registro, necesito algunos datos. ¿Puedes compartir tu nombre completo como aparece en tu pasaporte?"
→ Captura: nombres, primer_apellido, segundo_apellido

**Q2:** "Perfecto, gracias. ¿Cuál es el número de tu pasaporte?"
→ Captura: numero_identificacion
→ Auto-detecta: tipo_documento = "3" (Pasaporte)

**Q3:** "¿Cuál es tu nacionalidad?" o "¿De qué país es tu pasaporte?"
→ Captura: codigo_nacionalidad (convertir "United States" → "249")

**Q4:** "¿Cuál es tu fecha de nacimiento? Por ejemplo: 25/03/1985"
→ Captura: fecha_nacimiento (validar formato DD/MM/YYYY)

**Q5:** "¿De dónde vienes? ¿Cuál fue tu última ubicación antes de llegar aquí?"
→ Captura: lugar_procedencia (convertir "New York" → "249")
→ Asumir destino = mismo país (o preguntar si es necesario)

**Confirmación:**
"Perfecto, déjame confirmar tus datos:
- Nombre: JOHN MICHAEL SMITH
- Pasaporte: AB1234567
- Nacionalidad: Estados Unidos
- Fecha de nacimiento: 15/05/1985
- Procedencia: Estados Unidos

¿Todo correcto?"

### Ejemplo 2: Huésped colombiano (4 preguntas)

**Q1:** "¡Hola! Para tu registro necesito algunos datos. ¿Cuál es tu nombre completo?"
→ Captura: nombres, apellidos

**Q2:** "¿Número de cédula o documento?"
→ Captura: numero_identificacion
→ Auto-detecta: tipo_documento = "5" (Cédula - solo números)

**Q3:** "¿Fecha de nacimiento? Ejemplo: 10/07/1990"
→ Captura: fecha_nacimiento

**Q4:** "¿De qué ciudad de Colombia vienes?"
→ Captura: lugar_procedencia (convertir "Bogotá" → "11001" DIVIPOLA)
→ NO preguntar nacionalidad (ya sabemos que es Colombia = "169")

## FORMATO DE SALIDA

Al finalizar la captura exitosa, generar JSON con estructura:

\`\`\`json
{
  "hotel_code": "7706",
  "city_code": "88001",
  "document_type_code": "3",
  "identification_number": "AB1234567",
  "nationality_code": "249",
  "first_surname": "SMITH",
  "second_surname": "",
  "names": "JOHN MICHAEL",
  "movement_type": "E",
  "movement_date": "15/11/2025",
  "origin_place": "249",
  "destination_place": "249",
  "birth_date": "15/05/1985"
}
\`\`\`

## ERRORES COMUNES A EVITAR

1. ❌ Usar códigos ISO en vez de SIRE (USA = 840 en ISO, pero 249 en SIRE)
2. ❌ Pedir campos auto-filled al usuario (hotel, ciudad, fecha movimiento)
3. ❌ Hacer más de 5 preguntas (fatiga del usuario)
4. ❌ No validar formatos antes de continuar
5. ❌ Usar lenguaje burocrático ("reporte obligatorio", "Migración Colombia")
6. ❌ No agrupar campos relacionados (nombre completo = 1 pregunta, no 3)

## CÓDIGOS DE REFERENCIA RÁPIDA

**Países frecuentes (SIRE codes):**
- Colombia: 169
- USA: 249
- Brasil: 105
- Argentina: 63
- España: 245
- México: 493
- Canadá: 117
- Francia: 265
- Alemania: 23
- Reino Unido: 300

**Ciudades Colombia frecuentes (DIVIPOLA):**
- Bogotá: 11001
- Medellín: 5001
- Cali: 76001
- Barranquilla: 8001
- Cartagena: 13001
- San Andrés: 88001

**Tipos de documento:**
- 3: Pasaporte (~95% de casos)
- 5: Cédula de Extranjería
- 46: Carné Diplomático
- 10: Documento Mercosur/CAN

Recuerda: Mantén el tono amigable, valida en tiempo real, y usa progressive disclosure para no abrumar al huésped.
`

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

/**
 * Templates de preguntas por tipo de campo (multi-idioma)
 *
 * Cada template está optimizado para:
 * - Capturar el campo de manera natural
 * - Incluir ejemplo cuando sea útil (fechas, formatos)
 * - Usar lenguaje conversacional (no burocrático)
 */
export const QUESTION_TEMPLATES = {
  // Tipo de Documento
  document_type_code: {
    es: `¿Qué tipo de documento tienes?

Por favor selecciona una opción:

1️⃣ Pasaporte

2️⃣ Cédula de Extranjería

3️⃣ Carné Diplomático

4️⃣ Documento Extranjero (Mercosur/CAN)

Responde con el número (1, 2, 3 o 4)`,

    en: `What type of document do you have?

Please select an option:

1️⃣ Passport

2️⃣ Foreign ID

3️⃣ Diplomatic Card

4️⃣ Foreign Document (Mercosur/CAN)

Reply with the number (1, 2, 3, or 4)`,
  },

  // Número de Documento
  identification_number: {
    es: '¿Cuál es tu número de documento (pasaporte o cédula)?',
    en: 'What is your document number (passport or ID card)?',
  },

  document_number: {
    es: '¿Podrías compartir el número de tu pasaporte? (Sin guiones ni espacios)',
    en: 'Could you share your passport number? (No hyphens or spaces)',
  },

  document_number_cedula: {
    es: '¿Cuál es el número de tu cédula o documento de identidad?',
    en: 'What is your ID card number?',
  },

  // Identidad
  full_name: {
    es: '¿Cuál es tu nombre completo como aparece en el pasaporte?',
    en: 'What is your full name as it appears on your passport?',
  },

  first_name: {
    es: '¿Cuál es tu nombre?',
    en: 'What is your first name?',
  },

  names: {
    es: '¿Cuál es tu nombre completo?',
    en: 'What is your full name?',
  },

  first_surname: {
    es: '¿Cuál es tu primer apellido?',
    en: 'What is your first surname?',
  },

  second_surname: {
    es: `¿Tienes un segundo apellido?

📌 **Campo opcional** - Si no tienes segundo apellido, puedes responder:
• "No tengo"
• "Ninguno"
• "N/A"
• O simplemente presionar Enter sin escribir nada`,

    en: `Do you have a second surname?

📌 **Optional field** - If you don't have a second surname, you can reply:
• "I don't have"
• "None"
• "N/A"
• Or simply press Enter without typing anything`,
  },

  nationality: {
    es: '¿Cuál es tu nacionalidad? (País de tu pasaporte)',
    en: 'What is your nationality? (Passport country)',
  },

  nationality_code: {
    es: '¿Cuál es tu nacionalidad? (País de tu pasaporte)',
    en: 'What is your nationality? (Passport country)',
  },

  // Fechas
  birth_date: {
    es: '¿Cuál es tu fecha de nacimiento? (Ejemplo: 25/03/1985)',
    en: 'What is your date of birth? (Example: 25/03/1985)',
  },

  birth_date_format: {
    es: '¿Fecha de nacimiento? Formato: DD/MM/YYYY (Ejemplo: 15/07/1990)',
    en: 'Date of birth? Format: DD/MM/YYYY (Example: 15/07/1990)',
  },

  // Origen/Destino
  origin: {
    es: '¿De dónde vienes? ¿Cuál fue tu última ubicación antes de llegar al hotel?',
    en: 'Where are you coming from? What was your last location before arriving at the hotel?',
  },

  origin_place: {
    es: '¿De dónde vienes? ¿Cuál fue tu última ubicación antes de llegar?',
    en: 'Where are you coming from? What was your last location before arriving?',
  },

  origin_colombian_city: {
    es: '¿De qué ciudad de Colombia vienes?',
    en: 'Which Colombian city are you coming from?',
  },

  origin_country: {
    es: '¿De qué país vienes?',
    en: 'Which country are you coming from?',
  },

  destination: {
    es: '¿A dónde vas después de tu estadía aquí?',
    en: 'Where are you going after your stay here?',
  },

  destination_place: {
    es: '¿A dónde vas después de tu estadía aquí?',
    en: 'Where are you going after your stay here?',
  },

  destination_colombian_city: {
    es: '¿A qué ciudad de Colombia te diriges después?',
    en: 'Which Colombian city are you heading to next?',
  },

  destination_country: {
    es: '¿A qué país te diriges después de tu estadía?',
    en: 'Which country are you heading to after your stay?',
  },

  // Confirmación
  confirm_data: {
    es: '¿Todos los datos son correctos?',
    en: 'Is all the information correct?',
  },
}

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

/**
 * Mensajes de error y confirmación (multi-idioma)
 *
 * Estos mensajes se usan para:
 * - Validar formato de campos en tiempo real
 * - Pedir corrección de manera amigable
 * - Confirmar datos capturados correctamente
 */
export const VALIDATION_MESSAGES = {
  // Documento
  document_number_invalid: {
    es: 'El número de documento debe tener entre 6 y 15 caracteres alfanuméricos. ¿Podrías verificarlo?',
    en: 'The document number must be between 6 and 15 alphanumeric characters. Could you verify it?',
  },

  document_number_success: {
    es: 'Perfecto, número de documento registrado: {number}',
    en: 'Perfect, document number registered: {number}',
  },

  // Nombre
  name_invalid: {
    es: 'El nombre solo debe contener letras (sin números ni caracteres especiales). ¿Podrías verificarlo?',
    en: 'The name should only contain letters (no numbers or special characters). Could you verify it?',
  },

  name_too_long: {
    es: 'El nombre es muy largo (máximo {max} caracteres). ¿Podrías usar una versión más corta?',
    en: 'The name is too long (maximum {max} characters). Could you use a shorter version?',
  },

  name_success: {
    es: 'Perfecto, nombre registrado: {name}',
    en: 'Perfect, name registered: {name}',
  },

  // Nacionalidad
  nationality_not_found: {
    es: 'No pude encontrar ese país en nuestro catálogo. ¿Podrías verificar el nombre? (Ejemplo: "Estados Unidos", "España")',
    en: 'I could not find that country in our catalog. Could you verify the name? (Example: "United States", "Spain")',
  },

  nationality_success: {
    es: 'Perfecto, nacionalidad registrada: {country}',
    en: 'Perfect, nationality registered: {country}',
  },

  // Fecha de nacimiento
  birth_date_invalid_format: {
    es: 'La fecha debe estar en formato DD/MM/YYYY. Ejemplo: 25/03/1985. ¿Podrías intentar de nuevo?',
    en: 'The date must be in DD/MM/YYYY format. Example: 25/03/1985. Could you try again?',
  },

  birth_date_invalid_day: {
    es: 'El día debe estar entre 01 y 31. ¿Podrías verificar la fecha?',
    en: 'The day must be between 01 and 31. Could you verify the date?',
  },

  birth_date_invalid_month: {
    es: 'El mes debe estar entre 01 y 12. ¿Podrías verificar la fecha?',
    en: 'The month must be between 01 and 12. Could you verify the date?',
  },

  birth_date_invalid_year: {
    es: 'El año parece incorrecto. Debe estar entre 1900 y 2100. ¿Podrías verificarlo?',
    en: 'The year seems incorrect. It must be between 1900 and 2100. Could you verify it?',
  },

  birth_date_success: {
    es: 'Perfecto, fecha de nacimiento registrada: {date}',
    en: 'Perfect, date of birth registered: {date}',
  },

  // Origen/Destino
  location_not_found: {
    es: 'No pude encontrar esa ubicación. ¿Podrías especificar la ciudad y el país?',
    en: 'I could not find that location. Could you specify the city and country?',
  },

  location_success: {
    es: 'Perfecto, ubicación registrada: {location}',
    en: 'Perfect, location registered: {location}',
  },

  // Confirmación final
  data_summary: {
    es: `Perfecto, déjame confirmar tus datos:
- Nombre: {full_name}
- Documento: {document_number}
- Nacionalidad: {nationality}
- Fecha de nacimiento: {birth_date}
- Procedencia: {origin}
- Destino: {destination}

¿Todo correcto?`,
    en: `Perfect, let me confirm your information:
- Name: {full_name}
- Document: {document_number}
- Nationality: {nationality}
- Date of birth: {birth_date}
- Origin: {origin}
- Destination: {destination}

Is everything correct?`,
  },

  data_confirmed: {
    es: '¡Excelente! Tus datos han sido registrados correctamente. ¡Que disfrutes tu estadía!',
    en: 'Excellent! Your information has been registered successfully. Enjoy your stay!',
  },

  data_correction_needed: {
    es: '¿Qué dato necesitas corregir? Dime el campo y te ayudo a actualizarlo.',
    en: 'Which information needs to be corrected? Tell me the field and I will help you update it.',
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generar pregunta context-aware para un campo específico
 *
 * Esta función aplica lógica inteligente para:
 * - Seleccionar el template adecuado según contexto
 * - Personalizar la pregunta con datos previos (ej: nombre del huésped)
 * - Adaptar preguntas según nacionalidad (Colombia vs. extranjero)
 *
 * @param fieldName - Nombre del campo a capturar
 * @param context - Contexto con idioma y datos previos
 * @returns Pregunta natural personalizada
 *
 * @example
 * getQuestionForField('origin', { language: 'es', previousData: { nationality_code: '169' } })
 * // Returns: "¿De qué ciudad de Colombia vienes?"
 *
 * @example
 * getQuestionForField('origin', { language: 'es', previousData: { nationality_code: '249' } })
 * // Returns: "¿De dónde vienes? ¿Cuál fue tu última ubicación antes de llegar al hotel?"
 */
export function getQuestionForField(
  fieldName: string,
  context: QuestionContext
): string {
  const { language, previousData, guestName } = context

  // Context-aware logic: Origen/Destino según nacionalidad
  if (fieldName === 'origin') {
    // Si es colombiano, preguntar por ciudad colombiana
    if (previousData?.nationality_code === '169') {
      return QUESTION_TEMPLATES.origin_colombian_city[language]
    }
    // Si es extranjero, pregunta genérica
    return QUESTION_TEMPLATES.origin[language]
  }

  if (fieldName === 'destination') {
    // Si es colombiano, preguntar por ciudad colombiana
    if (previousData?.nationality_code === '169') {
      return QUESTION_TEMPLATES.destination_colombian_city[language]
    }
    // Si es extranjero, pregunta genérica
    return QUESTION_TEMPLATES.destination[language]
  }

  // Context-aware logic: Personalizar con nombre del huésped
  if (fieldName === 'confirm_data' && guestName) {
    const template = QUESTION_TEMPLATES.confirm_data[language]
    return template.replace('{name}', guestName)
  }

  // Default: Usar template directo
  const template = QUESTION_TEMPLATES[fieldName as keyof typeof QUESTION_TEMPLATES]
  if (!template) {
    console.error(`[SIRE] Missing template for field: ${fieldName}`)
    return language === 'es'
      ? 'Por favor proporciona este dato'
      : 'Please provide this information'
  }

  return template[language]
}

/**
 * Generar mensaje de validación personalizado
 *
 * Reemplaza placeholders en mensajes de validación con valores reales.
 *
 * @param messageKey - Clave del mensaje en VALIDATION_MESSAGES
 * @param language - Idioma (es/en)
 * @param replacements - Objeto con valores para reemplazar placeholders
 * @returns Mensaje personalizado
 *
 * @example
 * getValidationMessage('name_too_long', 'es', { max: '45' })
 * // Returns: "El nombre es muy largo (máximo 45 caracteres). ¿Podrías usar una versión más corta?"
 *
 * @example
 * getValidationMessage('document_number_success', 'en', { number: 'AB1234567' })
 * // Returns: "Perfect, document number registered: AB1234567"
 */
export function getValidationMessage(
  messageKey: keyof typeof VALIDATION_MESSAGES,
  language: SupportedLanguage,
  replacements: Record<string, string> = {}
): string {
  const template = VALIDATION_MESSAGES[messageKey]?.[language]

  if (!template) {
    console.warn(`[conversational-prompts] Validation message not found: ${messageKey}`)
    return language === 'es'
      ? 'Ocurrió un error de validación.'
      : 'A validation error occurred.'
  }

  // Replace placeholders
  let message = template
  Object.entries(replacements).forEach(([key, value]) => {
    message = message.replace(`{${key}}`, value)
  })

  return message
}

/**
 * Verificar si todos los campos requeridos están capturados
 *
 * @param data - Datos conversacionales parciales
 * @returns true si todos los campos requeridos están presentes
 *
 * @example
 * isDataComplete({ names: 'John', first_surname: 'Smith', ... })
 * // Returns: true si todos los 13 campos están presentes
 */
export function isDataComplete(data: Partial<SIREConversationalData>): boolean {
  const requiredFields: (keyof SIREConversationalData)[] = [
    'hotel_code',
    'city_code',
    'document_type_code',
    'identification_number',
    'nationality_code',
    'first_surname',
    // second_surname is OPTIONAL
    'names',
    'movement_type',
    'movement_date',
    'origin_place',
    'destination_place',
    'birth_date',
  ]

  return requiredFields.every(field => {
    const value = data[field]
    return value !== undefined && value !== null && value !== ''
  })
}

/**
 * Obtener lista de campos faltantes
 *
 * @param data - Datos conversacionales parciales
 * @returns Array de nombres de campos faltantes
 *
 * @example
 * getMissingFields({ names: 'John', first_surname: 'Smith' })
 * // Returns: ['hotel_code', 'city_code', 'document_type_code', ...]
 */
export function getMissingFields(
  data: Partial<SIREConversationalData>
): string[] {
  const requiredFields: (keyof SIREConversationalData)[] = [
    'hotel_code',
    'city_code',
    'document_type_code',
    'identification_number',
    'nationality_code',
    'first_surname',
    'names',
    'movement_type',
    'movement_date',
    'origin_place',
    'destination_place',
    'birth_date',
  ]

  return requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })
}

/**
 * Formatear datos para confirmación final
 *
 * Genera resumen legible de datos capturados para mostrar al huésped.
 *
 * @param data - Datos conversacionales completos
 * @param language - Idioma (es/en)
 * @returns String formateado con resumen de datos
 *
 * @example
 * formatDataSummary(fullData, 'es')
 * // Returns: "- Nombre: JOHN MICHAEL SMITH\n- Documento: AB1234567\n..."
 */
export function formatDataSummary(
  data: SIREConversationalData,
  language: SupportedLanguage
): string {
  const fullName = `${data.names} ${data.first_surname} ${data.second_surname || ''}`.trim().toUpperCase()

  const replacements = {
    full_name: fullName,
    document_number: data.identification_number || '',
    nationality: data.nationality_text || data.nationality_code || '',
    birth_date: data.birth_date || '',
    origin: data.origin_place || '',
    destination: data.destination_place || '',
  }

  return getValidationMessage('data_summary', language, replacements)
}
