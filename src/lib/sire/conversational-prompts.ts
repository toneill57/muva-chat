/**
 * SIRE Conversational Prompts
 *
 * Prompt templates y logic para captura conversacional de los 13 campos SIRE oficiales.
 *
 * IMPORTANTE: Este módulo implementa el CORE del proyecto MUVA Chat - captura automática
 * de datos de huéspedes mediante chat conversacional natural para compliance con
 * Migración Colombia.
 *
 * Características:
 * - Progressive disclosure (máximo 5 preguntas por sesión)
 * - Multi-idioma (español, inglés)
 * - Context-aware (nacionalidad → preguntas específicas)
 * - Validación en tiempo real
 * - Natural language (no formularios rígidos)
 *
 * @see docs/sire-auto-submission/PLAN.md - Context completo del proyecto
 * @see src/lib/sire/sire-catalogs.ts - Códigos oficiales SIRE
 * @see src/lib/sire/field-mappers.ts - Mapeo conversacional ↔ SIRE
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Idiomas soportados para prompts conversacionales
 */
export type Language = 'es' | 'en'

/**
 * Nombres de campos SIRE (13 campos oficiales)
 */
export type SIREFieldName =
  | 'codigo_hotel'          // Campo 1: Auto-filled from tenant
  | 'codigo_ciudad'         // Campo 2: Auto-filled from tenant
  | 'tipo_documento'        // Campo 3: 3=Pasaporte, 5=Cédula, 46=Diplomático, 10=PEP
  | 'numero_identificacion' // Campo 4: Alfanumérico 6-15 chars (sin guiones)
  | 'codigo_nacionalidad'   // Campo 5: SIRE code (USA=249, COL=169) - NO ISO!
  | 'primer_apellido'       // Campo 6: Solo letras con acentos, máx 50 chars
  | 'segundo_apellido'      // Campo 7: Solo letras con acentos, máx 50 chars, PUEDE estar vacío
  | 'nombres'               // Campo 8: Solo letras con acentos, máx 50 chars
  | 'tipo_movimiento'       // Campo 9: E=Entrada, S=Salida (auto-filled: E)
  | 'fecha_movimiento'      // Campo 10: DD/MM/YYYY (auto-filled: check-in date)
  | 'lugar_procedencia'     // Campo 11: Código SIRE país o DIVIPOLA ciudad
  | 'lugar_destino'         // Campo 12: Código SIRE país o DIVIPOLA ciudad
  | 'fecha_nacimiento'      // Campo 13: DD/MM/YYYY

/**
 * Datos conversacionales capturados del chat (formato natural)
 *
 * IMPORTANTE: Esta interfaz representa Capa 1 (user-friendly).
 * Luego se mapea a SIREData (Capa 2 - formato oficial).
 */
export interface SIREConversationalData {
  // Identidad
  full_name?: string                 // Ej: "Juan Pablo García Pérez"
  first_surname?: string             // Extraído de full_name
  second_surname?: string            // Extraído de full_name (opcional)
  given_names?: string               // Extraído de full_name

  // Documento
  document_type?: 'passport' | 'cedula' | 'diplomatic' | 'mercosur' // User-friendly labels
  document_number?: string           // Ej: "AB-1234567" (con guiones como usuario escribe)

  // Nacionalidad
  nationality_text?: string          // Ej: "Estados Unidos" (texto libre)
  nationality_code?: string          // SIRE code (ej: "249") - mapped from nationality_text

  // Fechas
  birth_date?: string                // Formato flexible: "25/03/1985", "March 25, 1985", "1985-03-25"
  birth_date_formatted?: string      // DD/MM/YYYY (formato SIRE)

  // Lugares
  origin_text?: string               // Ej: "Bogotá" o "Estados Unidos" (texto libre)
  origin_code?: string               // SIRE/DIVIPOLA code
  destination_text?: string          // Ej: "Cartagena" o "España" (texto libre)
  destination_code?: string          // SIRE/DIVIPOLA code

  // Metadata
  language?: Language                // Idioma del huésped
  completeness_percentage?: number   // 0-100%
  missing_fields?: SIREFieldName[]   // Campos que faltan
}

/**
 * Contexto para generar preguntas dinámicas
 */
export interface QuestionContext {
  tenant_id: string
  guest_name?: string
  check_in_date?: string
  nationality_text?: string          // Si ya se capturó, afecta preguntas subsecuentes
  language: Language
  conversation_history?: string      // Historia del chat (para context-aware questions)
}

// ============================================================================
// SIRE SYSTEM PROMPT
// ============================================================================

/**
 * System prompt base para Claude con contexto de 13 campos SIRE
 *
 * Este prompt se inyecta en el chat engine cuando se detecta que el huésped
 * necesita completar su registro SIRE.
 *
 * Objetivo: Guiar a Claude para hacer preguntas naturales y progresivas,
 * NO como un formulario rígido.
 */
export const SIRE_SYSTEM_PROMPT = `
Eres un asistente virtual amigable de un hotel en Colombia. Tu tarea es ayudar a los huéspedes extranjeros a completar su registro de entrada a Colombia de manera conversacional y natural.

## CONTEXTO REGULATORIO

Todos los hoteles en Colombia DEBEN reportar los datos de huéspedes extranjeros al sistema SIRE (Migración Colombia). Este es un requisito legal obligatorio.

## 13 CAMPOS REQUERIDOS

Debes capturar los siguientes campos de manera conversacional:

### Auto-completados (no preguntar):
1. **Código Hotel**: Ya configurado en el sistema
2. **Código Ciudad**: Ya configurado en el sistema
3. **Tipo Movimiento**: Siempre "Entrada" (check-in)
4. **Fecha Movimiento**: Fecha de check-in del huésped

### Capturar del huésped:
5. **Nombre Completo**: Primer apellido, segundo apellido (opcional), nombres
6. **Tipo Documento**: Pasaporte, Cédula de Extranjería, Carné Diplomático, PEP Mercosur
7. **Número de Identificación**: Número del documento (sin guiones)
8. **Nacionalidad**: País del pasaporte (ciudadanía)
9. **Fecha de Nacimiento**: DD/MM/YYYY
10. **Lugar de Procedencia**: Ciudad/país de donde viene ANTES del hotel
11. **Lugar de Destino**: Ciudad/país a donde va DESPUÉS del hotel

## REGLAS DE CAPTURA

### Progressive Disclosure (CRÍTICO):
- NUNCA preguntes los 13 campos de golpe
- Máximo 5 preguntas por conversación
- Agrupa preguntas relacionadas naturalmente
- Pausa después de cada grupo para que el huésped responda

### Context-Aware:
- Si nacionalidad = Colombia → NO preguntar pasaporte (probablemente tiene cédula)
- Si upload foto de pasaporte → Extraer campos automáticamente, solo confirmar
- Si huésped menciona país en conversación → Inferir lugar procedencia/destino

### Natural Language:
- Habla como un recepcionista amigable, NO como un formulario
- Usa lenguaje casual pero profesional
- Explica POR QUÉ necesitas los datos (compliance legal)
- Celebra el progreso ("¡Perfecto! Ya tenemos tu nombre completo")

### Multi-Idioma:
- Detecta idioma del huésped (español o inglés)
- Mantén consistencia en el idioma durante toda la conversación
- Si huésped cambia idioma, adáptate

### Validación en Tiempo Real:
- Si fecha inválida → Pide en formato DD/MM/YYYY
- Si país no encontrado → Sugiere países similares
- Si nombre sin apellido → Pide aclaración

## FLUJO CONVERSACIONAL RECOMENDADO

### Grupo 1: Identidad (1-2 mensajes)
"Para completar tu registro de entrada a Colombia, necesito algunos datos. ¿Me puedes decir tu nombre completo como aparece en tu pasaporte?"

### Grupo 2: Documento (1 mensaje)
"Perfecto, Juan Pablo. Ahora necesito el número de tu pasaporte y tu nacionalidad."

### Grupo 3: Fechas (1 mensaje)
"Gracias. ¿Cuál es tu fecha de nacimiento? (formato DD/MM/YYYY)"

### Grupo 4: Procedencia/Destino (1-2 mensajes)
"Casi terminamos. ¿De qué ciudad o país vienes antes de llegar aquí?"
"¿Y a dónde planeas ir después de tu estadía?"

## FORMATO DE SALIDA

NO generes JSON manualmente. Simplemente mantén una conversación natural.
El sistema extraerá automáticamente los campos de tu conversación usando entity extraction.

## EJEMPLO DE BUENA CONVERSACIÓN

Asistente: "¡Hola! Para completar tu registro de entrada a Colombia, necesito algunos datos. ¿Tienes tu pasaporte a mano?"

Huésped: "Sí, aquí está"

Asistente: "Perfecto. ¿Me puedes decir tu nombre completo como aparece en tu pasaporte?"

Huésped: "John Michael Smith"

Asistente: "Gracias, John. Ahora necesito el número de tu pasaporte y tu nacionalidad."

Huésped: "AB1234567, soy estadounidense"

Asistente: "Excelente. ¿Cuál es tu fecha de nacimiento? (puedes escribirla como 25/03/1985 o March 25, 1985)"

Huésped: "03/15/1980"

Asistente: "Perfecto. Últimas dos preguntas: ¿De qué ciudad vienes antes de llegar aquí?"

Huésped: "Vengo de Miami"

Asistente: "¿Y a dónde planeas ir después de tu estadía con nosotros?"

Huésped: "Voy a visitar Cartagena"

Asistente: "¡Excelente! Ya tenemos toda la información necesaria. Tu registro será enviado automáticamente a Migración Colombia. ¡Disfruta tu estadía!"

## EJEMPLO DE MALA CONVERSACIÓN (NO HACER)

Asistente: "Por favor proporciona los siguientes datos:
1. Nombre completo
2. Tipo documento
3. Número documento
4. Nacionalidad
5. Fecha nacimiento
6. Lugar procedencia
7. Lugar destino"

Huésped: "Eso es mucho, ¿por qué necesitas todo?"

## RECUERDA

- Máximo 5 preguntas por conversación
- Lenguaje natural, NO formulario
- Explica el "por qué" (compliance legal)
- Celebra el progreso
- Valida en tiempo real
- Adapta el idioma al huésped
`.trim()

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

/**
 * Templates de preguntas por tipo de campo
 *
 * Cada campo tiene variantes en español e inglés con diferentes niveles
 * de formalidad y contexto.
 */
export const QUESTION_TEMPLATES = {
  // ============================
  // IDENTIDAD
  // ============================
  full_name: {
    es: [
      '¿Me puedes decir tu nombre completo como aparece en tu pasaporte?',
      '¿Cuál es tu nombre completo? (incluyendo apellidos)',
      'Para el registro, necesito tu nombre completo tal como aparece en tu documento.',
    ],
    en: [
      'Can you tell me your full name as it appears on your passport?',
      'What is your full name? (including surnames)',
      'For the registration, I need your full name as it appears on your document.',
    ],
  },

  // ============================
  // DOCUMENTO
  // ============================
  document_type: {
    es: [
      '¿Qué tipo de documento tienes? (pasaporte, cédula de extranjería, etc.)',
      '¿Usarás tu pasaporte o tienes cédula de extranjería?',
    ],
    en: [
      'What type of document do you have? (passport, foreign ID card, etc.)',
      'Will you use your passport or do you have a foreign ID card?',
    ],
  },

  document_number: {
    es: [
      '¿Cuál es el número de tu pasaporte?',
      '¿Me puedes dar el número de tu documento?',
      'Necesito el número de identificación de tu pasaporte.',
    ],
    en: [
      'What is your passport number?',
      'Can you give me your document number?',
      'I need your passport identification number.',
    ],
  },

  // ============================
  // NACIONALIDAD
  // ============================
  nationality: {
    es: [
      '¿Cuál es tu nacionalidad?',
      '¿De qué país es tu pasaporte?',
      '¿Qué nacionalidad tienes?',
    ],
    en: [
      'What is your nationality?',
      'What country is your passport from?',
      'What nationality do you hold?',
    ],
  },

  // ============================
  // FECHA NACIMIENTO
  // ============================
  birth_date: {
    es: [
      '¿Cuál es tu fecha de nacimiento? (formato: DD/MM/YYYY, ej: 25/03/1985)',
      '¿En qué fecha naciste? Puedes escribirla como 25/03/1985 o Marzo 25, 1985',
      'Necesito tu fecha de nacimiento en formato DD/MM/YYYY',
    ],
    en: [
      'What is your date of birth? (format: DD/MM/YYYY, e.g., 25/03/1985)',
      'When were you born? You can write it as 25/03/1985 or March 25, 1985',
      'I need your date of birth in DD/MM/YYYY format',
    ],
  },

  // ============================
  // PROCEDENCIA
  // ============================
  origin: {
    es: [
      '¿De qué ciudad o país vienes antes de llegar aquí?',
      '¿Cuál fue tu última parada antes del hotel?',
      '¿De dónde vienes?',
    ],
    en: [
      'What city or country are you coming from before arriving here?',
      'What was your last stop before the hotel?',
      'Where are you coming from?',
    ],
  },

  // ============================
  // DESTINO
  // ============================
  destination: {
    es: [
      '¿A qué ciudad o país planeas ir después de tu estadía?',
      '¿Cuál es tu próximo destino después del hotel?',
      '¿A dónde vas después de aquí?',
    ],
    en: [
      'What city or country do you plan to go to after your stay?',
      'What is your next destination after the hotel?',
      'Where are you going after here?',
    ],
  },

  // ============================
  // COMBO QUESTIONS (Progressive disclosure)
  // ============================
  document_and_nationality: {
    es: [
      'Ahora necesito el número de tu pasaporte y tu nacionalidad.',
      '¿Me puedes dar el número de tu pasaporte y de qué país eres?',
    ],
    en: [
      'Now I need your passport number and nationality.',
      'Can you give me your passport number and what country you are from?',
    ],
  },

  origin_and_destination: {
    es: [
      '¿De dónde vienes y a dónde vas después de tu estadía?',
      'Para terminar, ¿cuál fue tu procedencia y cuál será tu próximo destino?',
    ],
    en: [
      'Where are you coming from and where are you going after your stay?',
      'To finish, what was your origin and what will be your next destination?',
    ],
  },
} as const

// ============================================================================
// VALIDATION MESSAGES
// ============================================================================

/**
 * Mensajes de validación y confirmación por campo
 */
export const VALIDATION_MESSAGES = {
  // ============================
  // ERRORES
  // ============================
  errors: {
    full_name: {
      es: 'El nombre debe contener al menos un apellido y un nombre. ¿Puedes escribirlo completo?',
      en: 'The name must contain at least one surname and first name. Can you write it completely?',
    },
    document_number: {
      es: 'El número de documento debe tener entre 6 y 15 caracteres. ¿Puedes verificarlo?',
      en: 'The document number must be between 6 and 15 characters. Can you verify it?',
    },
    nationality: {
      es: 'No encontré ese país en nuestro sistema. ¿Puedes escribirlo de otra manera? (ej: Estados Unidos, España)',
      en: 'I did not find that country in our system. Can you write it another way? (e.g., United States, Spain)',
    },
    birth_date: {
      es: 'Formato de fecha inválido. Por favor usa DD/MM/YYYY (ej: 25/03/1985)',
      en: 'Invalid date format. Please use DD/MM/YYYY (e.g., 25/03/1985)',
    },
    origin: {
      es: 'No encontré esa ciudad o país. ¿Puedes especificar mejor?',
      en: 'I did not find that city or country. Can you be more specific?',
    },
    destination: {
      es: 'No encontré ese destino. ¿Puedes escribirlo completo?',
      en: 'I did not find that destination. Can you write it completely?',
    },
  },

  // ============================
  // CONFIRMACIONES
  // ============================
  confirmations: {
    full_name: {
      es: (name: string) => `Perfecto, ${name}. `,
      en: (name: string) => `Perfect, ${name}. `,
    },
    document_number: {
      es: (number: string) => `Gracias, documento número ${number} registrado. `,
      en: (number: string) => `Thank you, document number ${number} registered. `,
    },
    nationality: {
      es: (country: string) => `Excelente, nacionalidad ${country}. `,
      en: (country: string) => `Excellent, nationality ${country}. `,
    },
    birth_date: {
      es: (date: string) => `Fecha de nacimiento ${date} confirmada. `,
      en: (date: string) => `Date of birth ${date} confirmed. `,
    },
    origin: {
      es: (place: string) => `Entendido, vienes de ${place}. `,
      en: (place: string) => `Understood, you are coming from ${place}. `,
    },
    destination: {
      es: (place: string) => `Perfecto, tu próximo destino es ${place}. `,
      en: (place: string) => `Perfect, your next destination is ${place}. `,
    },
    complete: {
      es: '¡Excelente! Ya tenemos toda la información necesaria. Tu registro será enviado automáticamente a Migración Colombia. ¡Disfruta tu estadía!',
      en: 'Excellent! We now have all the necessary information. Your registration will be automatically sent to Colombian Immigration. Enjoy your stay!',
    },
  },

  // ============================
  // PROGRESS
  // ============================
  progress: {
    es: (completed: number, total: number) =>
      `Progreso: ${completed} de ${total} campos completados (${Math.round((completed / total) * 100)}%)`,
    en: (completed: number, total: number) =>
      `Progress: ${completed} of ${total} fields completed (${Math.round((completed / total) * 100)}%)`,
  },
} as const

// ============================================================================
// PUBLIC HELPERS
// ============================================================================

/**
 * Generar pregunta natural para un campo específico
 *
 * Selecciona template apropiado según idioma y contexto.
 * Retorna pregunta randomizada para variedad conversacional.
 *
 * @param fieldName - Campo SIRE a preguntar
 * @param context - Contexto de la conversación
 * @returns Pregunta natural en idioma del huésped
 *
 * @example
 * getQuestionForField('full_name', { language: 'es' })
 * // Returns: "¿Me puedes decir tu nombre completo como aparece en tu pasaporte?"
 *
 * @example
 * getQuestionForField('nationality', { language: 'en', nationality_text: 'Colombia' })
 * // Returns: "What is your nationality?"
 */
export function getQuestionForField(
  fieldName: keyof typeof QUESTION_TEMPLATES,
  context: QuestionContext
): string {
  const templates = QUESTION_TEMPLATES[fieldName]
  if (!templates) {
    console.warn(`[conversational-prompts] No template found for field: ${fieldName}`)
    return context.language === 'es'
      ? `¿Me puedes proporcionar tu ${fieldName}?`
      : `Can you provide your ${fieldName}?`
  }

  const languageTemplates = templates[context.language] as readonly string[]

  if (!languageTemplates || languageTemplates.length === 0) {
    console.warn(`[conversational-prompts] No templates for language: ${context.language}`)
    return context.language === 'es'
      ? `¿Me puedes proporcionar tu ${fieldName}?`
      : `Can you provide your ${fieldName}?`
  }

  // Randomize para variedad conversacional
  const randomIndex = Math.floor(Math.random() * languageTemplates.length)
  return languageTemplates[randomIndex]
}

/**
 * Generar mensaje de error con sugerencias
 *
 * @param fieldName - Campo que falló validación
 * @param language - Idioma del mensaje
 * @returns Mensaje de error user-friendly
 *
 * @example
 * getValidationError('birth_date', 'es')
 * // Returns: "Formato de fecha inválido. Por favor usa DD/MM/YYYY (ej: 25/03/1985)"
 */
export function getValidationError(
  fieldName: keyof typeof VALIDATION_MESSAGES.errors,
  language: Language
): string {
  return VALIDATION_MESSAGES.errors[fieldName]?.[language] ||
    (language === 'es' ? 'Error de validación' : 'Validation error')
}

/**
 * Generar mensaje de confirmación
 *
 * @param fieldName - Campo confirmado
 * @param value - Valor capturado
 * @param language - Idioma del mensaje
 * @returns Mensaje de confirmación personalizado
 *
 * @example
 * getConfirmationMessage('full_name', 'John Smith', 'en')
 * // Returns: "Perfect, John Smith. "
 */
export function getConfirmationMessage(
  fieldName: keyof typeof VALIDATION_MESSAGES.confirmations,
  value: string,
  language: Language
): string {
  const confirmation = VALIDATION_MESSAGES.confirmations[fieldName]?.[language]

  if (typeof confirmation === 'function') {
    return confirmation(value)
  }

  if (typeof confirmation === 'string') {
    return confirmation
  }

  return language === 'es'
    ? `Perfecto, ${value} registrado. `
    : `Perfect, ${value} registered. `
}

/**
 * Generar mensaje de progreso
 *
 * @param completedFields - Número de campos completados
 * @param totalFields - Total de campos requeridos (13)
 * @param language - Idioma del mensaje
 * @returns Mensaje de progreso con porcentaje
 *
 * @example
 * getProgressMessage(8, 13, 'es')
 * // Returns: "Progreso: 8 de 13 campos completados (62%)"
 */
export function getProgressMessage(
  completedFields: number,
  totalFields: number,
  language: Language
): string {
  return VALIDATION_MESSAGES.progress[language](completedFields, totalFields)
}

/**
 * Generar mensaje de completitud
 *
 * @param language - Idioma del mensaje
 * @returns Mensaje de confirmación final
 *
 * @example
 * getCompletionMessage('es')
 * // Returns: "¡Excelente! Ya tenemos toda la información necesaria..."
 */
export function getCompletionMessage(language: Language): string {
  return VALIDATION_MESSAGES.confirmations.complete[language]
}

/**
 * Detectar idioma del huésped basado en mensaje
 *
 * Simple heuristic: busca palabras comunes en español vs inglés
 *
 * @param message - Mensaje del huésped
 * @returns Idioma detectado ('es' o 'en')
 *
 * @example
 * detectLanguage("Hola, necesito ayuda")
 * // Returns: "es"
 *
 * @example
 * detectLanguage("Hello, I need help")
 * // Returns: "en"
 */
export function detectLanguage(message: string): Language {
  const lowerMessage = message.toLowerCase()

  // Palabras comunes en español
  const spanishIndicators = [
    'hola', 'gracias', 'por favor', 'necesito', 'ayuda', 'sí', 'no',
    'tengo', 'quiero', 'puedo', 'dónde', 'cuándo', 'cómo', 'qué'
  ]

  // Palabras comunes en inglés
  const englishIndicators = [
    'hello', 'hi', 'thanks', 'please', 'need', 'help', 'yes', 'no',
    'have', 'want', 'can', 'where', 'when', 'how', 'what'
  ]

  const spanishCount = spanishIndicators.filter(word => lowerMessage.includes(word)).length
  const englishCount = englishIndicators.filter(word => lowerMessage.includes(word)).length

  // Default a español si empate (mayoría de hoteles en Colombia)
  return englishCount > spanishCount ? 'en' : 'es'
}

/**
 * Calcular completitud de datos SIRE
 *
 * @param data - Datos conversacionales capturados
 * @returns Porcentaje de completitud (0-100) y campos faltantes
 *
 * @example
 * calculateCompleteness({ full_name: 'John', nationality_text: 'USA' })
 * // Returns: { percentage: 40, missing: ['document_number', 'birth_date', ...] }
 */
export function calculateCompleteness(data: SIREConversationalData): {
  percentage: number
  completed: number
  total: number
  missing: string[]
} {
  // 9 campos que se capturan del huésped (4 auto-filled)
  const requiredFields = [
    'full_name',
    'document_number',
    'nationality_text',
    'birth_date',
    'origin_text',
    'destination_text',
  ]

  const completedFields = requiredFields.filter(field => {
    const value = data[field as keyof SIREConversationalData]
    return value !== undefined && value !== null && value !== ''
  })

  const missing = requiredFields.filter(field => {
    const value = data[field as keyof SIREConversationalData]
    return value === undefined || value === null || value === ''
  })

  const total = requiredFields.length
  const completed = completedFields.length
  const percentage = Math.round((completed / total) * 100)

  return {
    percentage,
    completed,
    total,
    missing,
  }
}

/**
 * Determinar próximo campo a preguntar (Progressive Disclosure)
 *
 * Lógica de priorización:
 * 1. full_name (siempre primero)
 * 2. document_number + nationality (combo)
 * 3. birth_date
 * 4. origin + destination (combo)
 *
 * @param data - Datos actuales
 * @returns Próximo campo a preguntar o null si completo
 *
 * @example
 * getNextFieldToAsk({})
 * // Returns: 'full_name'
 *
 * @example
 * getNextFieldToAsk({ full_name: 'John', document_number: 'AB123' })
 * // Returns: 'nationality'
 */
export function getNextFieldToAsk(data: SIREConversationalData): string | null {
  // 1. Nombre completo (SIEMPRE primero)
  if (!data.full_name) {
    return 'full_name'
  }

  // 2. Documento (preguntar tipo si no está, luego número)
  if (!data.document_number) {
    return 'document_number'
  }

  // 3. Nacionalidad (preguntar después de documento)
  if (!data.nationality_text) {
    return 'nationality'
  }

  // 4. Fecha nacimiento
  if (!data.birth_date) {
    return 'birth_date'
  }

  // 5. Procedencia
  if (!data.origin_text) {
    return 'origin'
  }

  // 6. Destino
  if (!data.destination_text) {
    return 'destination'
  }

  // Completado
  return null
}

/**
 * Context-aware question generation
 *
 * Genera pregunta personalizada según contexto del huésped.
 * Ejemplo: Si nacionalidad = Colombia, pregunta específica sobre cédula.
 *
 * @param fieldName - Campo a preguntar
 * @param context - Contexto completo
 * @returns Pregunta personalizada
 *
 * @example
 * getContextAwareQuestion('document_type', { nationality_text: 'Colombia' })
 * // Returns pregunta sobre cédula en lugar de pasaporte
 */
export function getContextAwareQuestion(
  fieldName: string,
  context: QuestionContext
): string {
  // Si nacionalidad es Colombia y preguntamos documento, especificar cédula
  if (fieldName === 'document_type' && context.nationality_text?.toLowerCase().includes('colombia')) {
    return context.language === 'es'
      ? '¿Tienes cédula de extranjería o usarás otro documento?'
      : 'Do you have a foreign ID card or will you use another document?'
  }

  // Default: usar template estándar
  return getQuestionForField(fieldName as keyof typeof QUESTION_TEMPLATES, context)
}

// ============================================================================
// PRE-EXISTING DATA ANALYSIS
// ============================================================================

/**
 * Fuentes de reserva conocidas
 */
export type BookingSource =
  | 'motopress'      // MotoPress directo (tiene nombre completo, email, país)
  | 'mphb-airbnb'    // Airbnb via MotoPress (solo tiene "Guest", phone_last_4)
  | 'airbnb'         // Airbnb directo (solo tiene "Guest", phone_last_4)
  | 'manual'         // Entrada manual (variable)
  | 'booking.com'    // Booking.com (tiene nombre, email)
  | string           // Otras fuentes

/**
 * Datos pre-existentes de la reserva que pueden usarse para SIRE
 *
 * IMPORTANTE: Distinguimos entre:
 * - `auto_fill`: Datos que se usan directamente sin preguntar
 * - `suggested`: Datos que se sugieren al huésped para confirmación
 * - `context`: Metadata para ajustar el flujo conversacional
 */
export interface PreExistingReservationData {
  // ============================
  // AUTO-FILL (no preguntar)
  // ============================

  /** Fecha de movimiento = check-in date (formato DD/MM/YYYY) */
  auto_movement_date: string

  /** Tipo de movimiento = siempre 'E' (Entrada) para check-in */
  auto_movement_type: 'E'

  /** Código hotel SIRE (de tenant_compliance_credentials) */
  auto_hotel_code?: string

  /** Código ciudad hotel SIRE (de tenant_compliance_credentials) */
  auto_city_code?: string

  // ============================
  // SUGERENCIAS (requieren confirmación)
  // ============================

  /**
   * Nombre sugerido del huésped
   * - MotoPress: `first_name + last_name` del customer
   * - Airbnb: null (guest_name = "Guest" no es útil)
   */
  suggested_name?: string

  /**
   * País de residencia (NO nacionalidad)
   * Se usa como sugerencia: "¿Eres de [país] o de otro país?"
   * guest_country del PMS
   */
  suggested_country?: string

  /**
   * Email del huésped (para validación/contacto, no campo SIRE)
   */
  suggested_email?: string

  // ============================
  // CONTEXTO (para ajustar flujo)
  // ============================

  /** Fuente de la reserva */
  booking_source: BookingSource

  /**
   * ¿El nombre es real o genérico?
   * - true: MotoPress con nombre real
   * - false: Airbnb con "Guest"
   */
  has_real_name: boolean

  /**
   * ¿Tenemos país de residencia?
   */
  has_country_hint: boolean

  /**
   * Idioma detectado del huésped (de guest_country o conversación previa)
   */
  detected_language?: Language

  /**
   * ID de la reserva (para updates)
   */
  reservation_id: string
}

/**
 * Interfaz de reserva del sistema (subset de guest_reservations)
 */
export interface GuestReservationInput {
  id: string
  guest_name: string
  guest_email?: string | null
  guest_country?: string | null
  check_in_date: string  // YYYY-MM-DD o Date string
  booking_source: string

  // Campos SIRE existentes (pueden estar parcialmente llenos)
  first_surname?: string | null
  second_surname?: string | null
  given_names?: string | null
  document_type?: string | null
  document_number?: string | null
  nationality_code?: string | null
  birth_date?: string | null
  origin_city_code?: string | null
  destination_city_code?: string | null
}

/**
 * Analiza datos pre-existentes de una reserva para optimizar captura SIRE
 *
 * Esta función examina qué datos ya tenemos de la reserva según su fuente
 * (MotoPress, Airbnb, manual) y determina qué podemos auto-llenar vs sugerir.
 *
 * @param reservation - Datos de la reserva del sistema
 * @returns PreExistingReservationData con análisis completo
 *
 * @example
 * // MotoPress reservation
 * analyzePreExistingData({
 *   id: 'abc-123',
 *   guest_name: 'John Michael Smith',
 *   guest_country: 'US',
 *   check_in_date: '2025-12-15',
 *   booking_source: 'motopress'
 * })
 * // Returns: {
 * //   suggested_name: 'John Michael Smith',
 * //   suggested_country: 'Estados Unidos',
 * //   has_real_name: true,
 * //   ...
 * // }
 *
 * @example
 * // Airbnb reservation (via MotoPress iCal)
 * analyzePreExistingData({
 *   id: 'xyz-789',
 *   guest_name: 'Guest',
 *   guest_country: null,
 *   check_in_date: '2025-12-20',
 *   booking_source: 'mphb-airbnb'
 * })
 * // Returns: {
 * //   suggested_name: undefined,  // "Guest" no es útil
 * //   has_real_name: false,
 * //   ...
 * // }
 */
export function analyzePreExistingData(
  reservation: GuestReservationInput
): PreExistingReservationData {
  const bookingSource = reservation.booking_source as BookingSource

  // Determinar si el nombre es real o genérico
  const isGenericName = isGenericGuestName(reservation.guest_name)

  // Formatear check-in date a DD/MM/YYYY
  const movementDate = formatCheckInDateForSIRE(reservation.check_in_date)

  // Mapear código de país a nombre legible (para sugerencia)
  const countryName = reservation.guest_country
    ? mapCountryCodeToName(reservation.guest_country)
    : undefined

  // Detectar idioma basado en país de residencia
  const detectedLanguage = detectLanguageFromCountry(reservation.guest_country)

  return {
    // Auto-fill
    auto_movement_date: movementDate,
    auto_movement_type: 'E',

    // Sugerencias (solo si son útiles)
    suggested_name: isGenericName ? undefined : reservation.guest_name,
    suggested_country: countryName,
    suggested_email: reservation.guest_email || undefined,

    // Contexto
    booking_source: bookingSource,
    has_real_name: !isGenericName,
    has_country_hint: !!reservation.guest_country,
    detected_language: detectedLanguage,
    reservation_id: reservation.id,
  }
}

/**
 * Detecta si el nombre del huésped es genérico (no útil para SIRE)
 *
 * @param guestName - Nombre del huésped
 * @returns true si es genérico ("Guest", "Huésped", etc.)
 */
export function isGenericGuestName(guestName: string): boolean {
  const genericNames = [
    'guest',
    'huésped',
    'huesped',
    'visitor',
    'visitante',
    'not provided',
    'n/a',
    'unknown',
    'desconocido',
  ]

  const normalized = guestName.toLowerCase().trim()
  return genericNames.includes(normalized) || normalized.length < 2
}

/**
 * Formatea check-in date a formato SIRE (DD/MM/YYYY)
 *
 * @param checkInDate - Fecha en formato YYYY-MM-DD o ISO string
 * @returns Fecha en formato DD/MM/YYYY
 */
export function formatCheckInDateForSIRE(checkInDate: string): string {
  // Manejar diferentes formatos de entrada
  let date: Date

  if (checkInDate.includes('T')) {
    // ISO format: 2025-12-15T00:00:00.000Z
    date = new Date(checkInDate)
  } else if (checkInDate.includes('-')) {
    // YYYY-MM-DD format
    const [year, month, day] = checkInDate.split('-').map(Number)
    date = new Date(year, month - 1, day)
  } else {
    // Fallback
    date = new Date(checkInDate)
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Mapea código de país (ISO 2-letter o nombre) a nombre legible en español
 *
 * @param countryCode - Código ISO o nombre del país
 * @returns Nombre del país en español
 */
export function mapCountryCodeToName(countryCode: string): string {
  // Mapeo de códigos ISO 2-letter a nombres en español
  const countryNames: Record<string, string> = {
    // Principales países de turistas en Colombia
    'US': 'Estados Unidos',
    'USA': 'Estados Unidos',
    'BR': 'Brasil',
    'AR': 'Argentina',
    'ES': 'España',
    'MX': 'México',
    'CA': 'Canadá',
    'CL': 'Chile',
    'FR': 'Francia',
    'DE': 'Alemania',
    'GB': 'Reino Unido',
    'UK': 'Reino Unido',
    'IT': 'Italia',
    'PE': 'Perú',
    'EC': 'Ecuador',
    'VE': 'Venezuela',
    'PA': 'Panamá',
    'CR': 'Costa Rica',
    'UY': 'Uruguay',
    'PY': 'Paraguay',
    'BO': 'Bolivia',
    'CO': 'Colombia',
    'AU': 'Australia',
    'NZ': 'Nueva Zelanda',
    'JP': 'Japón',
    'CN': 'China',
    'IN': 'India',
    'NL': 'Países Bajos',
    'BE': 'Bélgica',
    'CH': 'Suiza',
    'PT': 'Portugal',
    'PL': 'Polonia',
    'SE': 'Suecia',
    'NO': 'Noruega',
    'DK': 'Dinamarca',
    'FI': 'Finlandia',
    'IE': 'Irlanda',
    'AT': 'Austria',
    'IL': 'Israel',
    'ZA': 'Sudáfrica',
    'KR': 'Corea del Sur',
  }

  const upperCode = countryCode.toUpperCase().trim()

  // Si es código ISO, mapear a nombre
  if (countryNames[upperCode]) {
    return countryNames[upperCode]
  }

  // Si ya es un nombre (más de 2 caracteres), devolverlo capitalizado
  if (countryCode.length > 2) {
    return countryCode.charAt(0).toUpperCase() + countryCode.slice(1).toLowerCase()
  }

  // Fallback: devolver el código original
  return countryCode
}

/**
 * Detecta idioma probable basado en país de residencia
 *
 * @param countryCode - Código ISO del país
 * @returns 'es' o 'en'
 */
export function detectLanguageFromCountry(countryCode: string | null | undefined): Language {
  if (!countryCode) return 'es' // Default español (Colombia)

  const spanishCountries = [
    'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU',
    'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR'
  ]

  const upperCode = countryCode.toUpperCase().trim()

  return spanishCountries.includes(upperCode) ? 'es' : 'en'
}

// ============================================================================
// SUGGESTION TEMPLATES
// ============================================================================

/**
 * Templates de preguntas CON sugerencias basadas en datos pre-existentes
 *
 * Estas preguntas incluyen datos que ya tenemos para que el huésped confirme
 * o corrija, en lugar de preguntar desde cero.
 */
export const SUGGESTION_TEMPLATES = {
  // ============================
  // NOMBRE CON SUGERENCIA
  // ============================
  full_name_with_suggestion: {
    es: (suggestedName: string) => [
      `Veo que te registraste como ${suggestedName}. ¿Es tu nombre completo como aparece en el pasaporte?`,
      `Tengo registrado el nombre ${suggestedName}. ¿Es correcto o necesitas corregirlo?`,
    ],
    en: (suggestedName: string) => [
      `I see you registered as ${suggestedName}. Is this your full name as it appears on your passport?`,
      `I have the name ${suggestedName} on file. Is this correct or do you need to update it?`,
    ],
  },

  // ============================
  // NACIONALIDAD CON SUGERENCIA (basada en país de residencia)
  // ============================
  nationality_with_suggestion: {
    es: (suggestedCountry: string) => [
      `Veo que vienes de ${suggestedCountry}. ¿Es también tu nacionalidad o eres de otro país?`,
      `Tu registro indica ${suggestedCountry}. ¿Es el país de tu pasaporte?`,
    ],
    en: (suggestedCountry: string) => [
      `I see you're coming from ${suggestedCountry}. Is that also your nationality or are you from another country?`,
      `Your registration shows ${suggestedCountry}. Is that the country of your passport?`,
    ],
  },

  // ============================
  // PROCEDENCIA CON SUGERENCIA
  // ============================
  origin_with_suggestion: {
    es: (suggestedCountry: string) => [
      `¿Vienes directamente de ${suggestedCountry} o hiciste parada en otro lugar antes de llegar aquí?`,
      `Tu última ubicación antes del hotel, ¿fue ${suggestedCountry} o vienes de otra ciudad/país?`,
    ],
    en: (suggestedCountry: string) => [
      `Are you coming directly from ${suggestedCountry} or did you stop somewhere else before arriving here?`,
      `Was your last location before the hotel ${suggestedCountry} or are you coming from another city/country?`,
    ],
  },
} as const

/**
 * Genera pregunta con sugerencia si hay datos pre-existentes
 *
 * @param fieldName - Campo a preguntar
 * @param context - Contexto de la conversación
 * @param preExisting - Datos pre-existentes de la reserva
 * @returns Pregunta con sugerencia o pregunta normal
 */
export function getQuestionWithSuggestion(
  fieldName: keyof typeof QUESTION_TEMPLATES | 'full_name_with_suggestion' | 'nationality_with_suggestion' | 'origin_with_suggestion',
  context: QuestionContext,
  preExisting?: PreExistingReservationData
): string {
  const lang = context.language

  // Si hay nombre sugerido y estamos preguntando nombre
  if (fieldName === 'full_name' && preExisting?.suggested_name) {
    const templates = SUGGESTION_TEMPLATES.full_name_with_suggestion[lang](preExisting.suggested_name)
    return templates[Math.floor(Math.random() * templates.length)]
  }

  // Si hay país sugerido y estamos preguntando nacionalidad
  if (fieldName === 'nationality' && preExisting?.suggested_country) {
    const templates = SUGGESTION_TEMPLATES.nationality_with_suggestion[lang](preExisting.suggested_country)
    return templates[Math.floor(Math.random() * templates.length)]
  }

  // Si hay país sugerido y estamos preguntando procedencia
  if (fieldName === 'origin' && preExisting?.suggested_country) {
    const templates = SUGGESTION_TEMPLATES.origin_with_suggestion[lang](preExisting.suggested_country)
    return templates[Math.floor(Math.random() * templates.length)]
  }

  // Fallback: pregunta normal sin sugerencia
  if (fieldName in QUESTION_TEMPLATES) {
    return getQuestionForField(fieldName as keyof typeof QUESTION_TEMPLATES, context)
  }

  // Último fallback
  return context.language === 'es'
    ? `¿Me puedes proporcionar tu ${fieldName}?`
    : `Can you provide your ${fieldName}?`
}

/**
 * Versión mejorada de getNextFieldToAsk que considera datos pre-existentes
 *
 * @param data - Datos conversacionales actuales
 * @param preExisting - Datos pre-existentes de la reserva
 * @returns Campo a preguntar o null si completo
 */
export function getNextFieldToAskWithContext(
  data: SIREConversationalData,
  preExisting?: PreExistingReservationData
): { field: string | null; hasSuggestion: boolean } {
  // 1. Nombre - preguntar con sugerencia si hay nombre pre-existente
  if (!data.full_name) {
    return {
      field: 'full_name',
      hasSuggestion: !!preExisting?.suggested_name,
    }
  }

  // 2. Documento (sin sugerencias - siempre preguntar)
  if (!data.document_number) {
    return { field: 'document_number', hasSuggestion: false }
  }

  // 3. Nacionalidad - preguntar con sugerencia si hay país pre-existente
  if (!data.nationality_text) {
    return {
      field: 'nationality',
      hasSuggestion: !!preExisting?.suggested_country,
    }
  }

  // 4. Fecha nacimiento (sin sugerencias)
  if (!data.birth_date) {
    return { field: 'birth_date', hasSuggestion: false }
  }

  // 5. Procedencia - sugerir país si tenemos hint
  if (!data.origin_text) {
    return {
      field: 'origin',
      hasSuggestion: !!preExisting?.suggested_country,
    }
  }

  // 6. Destino (sin sugerencias - cada viaje es diferente)
  if (!data.destination_text) {
    return { field: 'destination', hasSuggestion: false }
  }

  // Completado
  return { field: null, hasSuggestion: false }
}

/**
 * Calcula completitud considerando datos pre-existentes que podrían
 * ser confirmados rápidamente
 *
 * @param data - Datos conversacionales
 * @param preExisting - Datos pre-existentes
 * @returns Análisis de completitud con estimación de preguntas restantes
 */
export function calculateCompletenessWithContext(
  data: SIREConversationalData,
  preExisting?: PreExistingReservationData
): {
  percentage: number
  completed: number
  total: number
  missing: string[]
  estimatedQuestionsRemaining: number
  hasSuggestions: boolean
} {
  const baseCompleteness = calculateCompleteness(data)

  // Estimar cuántas preguntas quedan
  // Si tenemos sugerencias, las confirmaciones son más rápidas
  let estimatedQuestions = baseCompleteness.missing.length

  const hasSuggestions = !!(
    preExisting?.suggested_name ||
    preExisting?.suggested_country
  )

  // Con sugerencias, algunas preguntas se responden con "sí/no"
  // en lugar de proporcionar información completa
  if (hasSuggestions) {
    // Reducir estimación si tenemos sugerencias útiles
    if (preExisting?.suggested_name && baseCompleteness.missing.includes('full_name')) {
      estimatedQuestions -= 0.5 // Confirmación es más rápida
    }
    if (preExisting?.suggested_country) {
      if (baseCompleteness.missing.includes('nationality_text')) estimatedQuestions -= 0.3
      if (baseCompleteness.missing.includes('origin_text')) estimatedQuestions -= 0.3
    }
  }

  return {
    ...baseCompleteness,
    estimatedQuestionsRemaining: Math.max(1, Math.ceil(estimatedQuestions)),
    hasSuggestions,
  }
}
