/**
 * SIRE Conversational Prompts - Usage Examples
 *
 * Este archivo muestra ejemplos prácticos de uso del sistema de prompts conversacionales.
 * NO es código de producción - solo para referencia y testing.
 *
 * @see src/lib/sire/README.md - Documentación completa
 */

import {
  SIRE_SYSTEM_PROMPT,
  QUESTION_TEMPLATES,
  VALIDATION_MESSAGES,
  getQuestionForField,
  getValidationMessage,
  isDataComplete,
  getMissingFields,
  formatDataSummary,
  type SIREConversationalData,
  type QuestionContext,
} from './conversational-prompts'

import {
  splitFullName,
  cleanPassportNumber,
  detectDocumentType,
  formatDateForSIRE,
  validateSIREDateFormat,
  type ConversationalData,
  type SIREData,
} from './field-mappers'

import {
  getSIRECountryCode,
  getDIVIPOLACityCode,
} from './sire-catalogs'

// ============================================================================
// EXAMPLE 1: Context-Aware Question Generation
// ============================================================================

/**
 * Ejemplo: Generar preguntas según nacionalidad del huésped
 */
export function exampleContextAwareQuestions() {
  console.log('=== Example 1: Context-Aware Questions ===\n')

  // Caso 1: Huésped colombiano
  const colombianContext: QuestionContext = {
    language: 'es',
    previousData: {
      nationality_code: '169', // Colombia
      nationality_text: 'Colombia',
    },
  }

  const originQuestionColombian = getQuestionForField('origin', colombianContext)
  console.log('Colombian guest - Origin question:')
  console.log(originQuestionColombian)
  // Expected: "¿De qué ciudad de Colombia vienes?"

  const destinationQuestionColombian = getQuestionForField('destination', colombianContext)
  console.log('\nColombian guest - Destination question:')
  console.log(destinationQuestionColombian)
  // Expected: "¿A qué ciudad de Colombia te diriges después?"

  // Caso 2: Huésped estadounidense
  const usContext: QuestionContext = {
    language: 'en',
    previousData: {
      nationality_code: '249', // USA
      nationality_text: 'United States',
    },
  }

  const originQuestionUS = getQuestionForField('origin', usContext)
  console.log('\nUS guest - Origin question:')
  console.log(originQuestionUS)
  // Expected: "Where are you coming from? What was your last location before arriving at the hotel?"

  console.log('\n')
}

// ============================================================================
// EXAMPLE 2: Field Validation with Custom Messages
// ============================================================================

/**
 * Ejemplo: Validar fecha de nacimiento con mensajes personalizados
 */
export function exampleDateValidation() {
  console.log('=== Example 2: Date Validation ===\n')

  const testDates = [
    { date: '15/05/1985', valid: true },
    { date: '2025-05-15', valid: false }, // Wrong format
    { date: '32/05/1985', valid: false }, // Invalid day
    { date: '15/13/1985', valid: false }, // Invalid month
  ]

  testDates.forEach(({ date, valid }) => {
    const isValid = validateSIREDateFormat(date)
    console.log(`Date: ${date} - Valid: ${isValid} (Expected: ${valid})`)

    if (!isValid) {
      const errorMsg = getValidationMessage('birth_date_invalid_format', 'es')
      console.log(`  Error message: ${errorMsg}`)
    } else {
      const successMsg = getValidationMessage('birth_date_success', 'es', {
        date: date,
      })
      console.log(`  Success message: ${successMsg}`)
    }
  })

  console.log('\n')
}

// ============================================================================
// EXAMPLE 3: Full Name Splitting
// ============================================================================

/**
 * Ejemplo: Split nombre completo en componentes SIRE
 */
export function exampleNameSplitting() {
  console.log('=== Example 3: Full Name Splitting ===\n')

  const testNames = [
    'John Michael Smith',
    'García Pérez, Juan Pablo',
    'María José Rodríguez González',
    'John Smith', // Sin segundo apellido
  ]

  testNames.forEach(fullName => {
    const { primer_apellido, segundo_apellido, nombres } = splitFullName(fullName)
    console.log(`Input: ${fullName}`)
    console.log(`  Names: ${nombres}`)
    console.log(`  First surname: ${primer_apellido}`)
    console.log(`  Second surname: ${segundo_apellido || '(none)'}`)
    console.log('')
  })
}

// ============================================================================
// EXAMPLE 4: Document Type Detection
// ============================================================================

/**
 * Ejemplo: Auto-detectar tipo de documento según formato
 */
export function exampleDocumentTypeDetection() {
  console.log('=== Example 4: Document Type Detection ===\n')

  const testDocuments = [
    { number: 'AB1234567', expectedType: '3' }, // Passport
    { number: 'N9876543', expectedType: '3' }, // Passport
    { number: '1234567', expectedType: '5' }, // Cédula
    { number: 'AB-1234567', expectedType: '3' }, // Passport with hyphen
  ]

  testDocuments.forEach(({ number, expectedType }) => {
    const cleanedNumber = cleanPassportNumber(number)
    const detectedType = detectDocumentType(number)

    console.log(`Input: ${number}`)
    console.log(`  Cleaned: ${cleanedNumber}`)
    console.log(`  Detected type: ${detectedType} (Expected: ${expectedType})`)
    console.log(`  Type name: ${getDocumentTypeName(detectedType)}`)
    console.log('')
  })
}

function getDocumentTypeName(code: string): string {
  const names: Record<string, string> = {
    '3': 'Pasaporte',
    '5': 'Cédula de Extranjería',
    '46': 'Carné Diplomático',
    '10': 'Documento Mercosur/CAN',
  }
  return names[code] || 'Unknown'
}

// ============================================================================
// EXAMPLE 5: Country Code Mapping (SIRE vs ISO)
// ============================================================================

/**
 * Ejemplo: Mapear países a códigos SIRE (NO ISO!)
 */
export function exampleCountryMapping() {
  console.log('=== Example 5: Country Code Mapping (SIRE vs ISO) ===\n')

  const testCountries = [
    { name: 'Estados Unidos', sireCode: '249', isoCode: '840' },
    { name: 'Colombia', sireCode: '169', isoCode: '170' },
    { name: 'Brasil', sireCode: '105', isoCode: '076' },
    { name: 'España', sireCode: '245', isoCode: '724' },
  ]

  testCountries.forEach(({ name, sireCode, isoCode }) => {
    const mappedCode = getSIRECountryCode(name)
    const isCorrect = mappedCode === sireCode

    console.log(`Country: ${name}`)
    console.log(`  SIRE code: ${sireCode} (CORRECT)`)
    console.log(`  ISO code: ${isoCode} (WRONG - NEVER USE!)`)
    console.log(`  Mapped: ${mappedCode} ${isCorrect ? '✅' : '❌'}`)
    console.log('')
  })
}

// ============================================================================
// EXAMPLE 6: Colombian City Mapping (DIVIPOLA)
// ============================================================================

/**
 * Ejemplo: Mapear ciudades colombianas a códigos DIVIPOLA
 */
export function exampleColombianCityMapping() {
  console.log('=== Example 6: Colombian City Mapping (DIVIPOLA) ===\n')

  const testCities = [
    { name: 'Bogotá', code: '11001' },
    { name: 'Medellín', code: '5001' },
    { name: 'Cali', code: '76001' },
    { name: 'San Andrés', code: '88001' },
    { name: 'Cartagena', code: '13001' },
  ]

  testCities.forEach(({ name, code }) => {
    const mappedCode = getDIVIPOLACityCode(name)
    const isCorrect = mappedCode === code

    console.log(`City: ${name}`)
    console.log(`  Expected: ${code}`)
    console.log(`  Mapped: ${mappedCode} ${isCorrect ? '✅' : '❌'}`)
    console.log('')
  })
}

// ============================================================================
// EXAMPLE 7: Data Completeness Check
// ============================================================================

/**
 * Ejemplo: Verificar completitud de datos capturados
 */
export function exampleDataCompletenessCheck() {
  console.log('=== Example 7: Data Completeness Check ===\n')

  // Datos parciales
  const partialData: Partial<SIREConversationalData> = {
    names: 'JOHN MICHAEL',
    first_surname: 'SMITH',
    identification_number: 'AB1234567',
    nationality_code: '249',
    birth_date: '15/05/1985',
  }

  console.log('Partial data captured:')
  console.log(JSON.stringify(partialData, null, 2))

  const complete = isDataComplete(partialData)
  console.log(`\nData complete: ${complete ? 'YES ✅' : 'NO ❌'}`)

  if (!complete) {
    const missing = getMissingFields(partialData)
    console.log('\nMissing fields:')
    missing.forEach(field => {
      console.log(`  - ${field}`)
    })
  }

  console.log('\n')
}

// ============================================================================
// EXAMPLE 8: Data Summary Formatting
// ============================================================================

/**
 * Ejemplo: Formatear resumen de datos para confirmación
 */
export function exampleDataSummaryFormatting() {
  console.log('=== Example 8: Data Summary Formatting ===\n')

  const fullData: SIREConversationalData = {
    hotel_code: '7706',
    city_code: '88001',
    document_type_code: '3',
    identification_number: 'AB1234567',
    nationality_code: '249',
    nationality_text: 'United States',
    first_surname: 'SMITH',
    second_surname: '',
    names: 'JOHN MICHAEL',
    movement_type: 'E',
    movement_date: '15/11/2025',
    origin_place: '249',
    destination_place: '249',
    birth_date: '15/05/1985',
  }

  // Spanish summary
  const summaryES = formatDataSummary(fullData, 'es')
  console.log('Summary (Spanish):')
  console.log(summaryES)

  console.log('\n')

  // English summary
  const summaryEN = formatDataSummary(fullData, 'en')
  console.log('Summary (English):')
  console.log(summaryEN)

  console.log('\n')
}

// ============================================================================
// EXAMPLE 9: Complete Conversation Flow
// ============================================================================

/**
 * Ejemplo: Flujo completo de conversación simulado
 */
export function exampleCompleteConversationFlow() {
  console.log('=== Example 9: Complete Conversation Flow ===\n')

  // Simular respuestas del huésped
  const guestResponses = {
    fullName: 'John Michael Smith',
    passportNumber: 'AB-1234567',
    nationality: 'United States',
    birthDate: '15/05/1985',
    origin: 'New York',
    destination: 'Bogotá',
  }

  // Estado de captura
  const capturedData: Partial<SIREConversationalData> = {}

  // Step 1: Nombre completo
  console.log('Assistant: ¿Cuál es tu nombre completo como aparece en tu pasaporte?')
  console.log(`Guest: ${guestResponses.fullName}`)

  const nameParts = splitFullName(guestResponses.fullName)
  capturedData.names = nameParts.nombres
  capturedData.first_surname = nameParts.primer_apellido
  capturedData.second_surname = nameParts.segundo_apellido

  console.log(`[Captured] Names: ${capturedData.names}`)
  console.log(`[Captured] First surname: ${capturedData.first_surname}`)
  console.log('')

  // Step 2: Número de pasaporte
  console.log('Assistant: ¿Podrías compartir el número de tu pasaporte?')
  console.log(`Guest: ${guestResponses.passportNumber}`)

  capturedData.identification_number = cleanPassportNumber(guestResponses.passportNumber)
  capturedData.document_type_code = detectDocumentType(guestResponses.passportNumber)

  console.log(`[Captured] Document number: ${capturedData.identification_number}`)
  console.log(`[Captured] Document type: ${capturedData.document_type_code} (${getDocumentTypeName(capturedData.document_type_code)})`)
  console.log('')

  // Step 3: Nacionalidad
  console.log('Assistant: ¿Cuál es tu nacionalidad?')
  console.log(`Guest: ${guestResponses.nationality}`)

  capturedData.nationality_text = guestResponses.nationality
  capturedData.nationality_code = getSIRECountryCode(guestResponses.nationality) || undefined

  console.log(`[Captured] Nationality text: ${capturedData.nationality_text}`)
  console.log(`[Captured] Nationality code: ${capturedData.nationality_code} (SIRE code, NOT ISO!)`)
  console.log('')

  // Step 4: Fecha de nacimiento
  console.log('Assistant: ¿Cuál es tu fecha de nacimiento? (Ejemplo: 25/03/1985)')
  console.log(`Guest: ${guestResponses.birthDate}`)

  if (validateSIREDateFormat(guestResponses.birthDate)) {
    capturedData.birth_date = guestResponses.birthDate
    console.log(`[Captured] Birth date: ${capturedData.birth_date}`)
  } else {
    console.log('[Error] Invalid date format!')
  }
  console.log('')

  // Step 5: Origen (context-aware)
  const originQuestion = getQuestionForField('origin', {
    language: 'es',
    previousData: capturedData,
  })
  console.log(`Assistant: ${originQuestion}`)
  console.log(`Guest: ${guestResponses.origin}`)

  // Para simplificar, usar código de país
  capturedData.origin_place = capturedData.nationality_code

  console.log(`[Captured] Origin place: ${capturedData.origin_place}`)
  console.log('')

  // Step 6: Destino
  console.log('Assistant: ¿A dónde vas después de tu estadía?')
  console.log(`Guest: ${guestResponses.destination}`)

  // Mapear "Bogotá" a código DIVIPOLA
  capturedData.destination_place = getDIVIPOLACityCode(guestResponses.destination) || undefined

  console.log(`[Captured] Destination place: ${capturedData.destination_place} (DIVIPOLA code for Bogotá)`)
  console.log('')

  // Auto-fill fields
  capturedData.hotel_code = '7706'
  capturedData.city_code = '88001'
  capturedData.movement_type = 'E'
  capturedData.movement_date = formatDateForSIRE(new Date())

  console.log('[Auto-filled fields]')
  console.log(`Hotel code: ${capturedData.hotel_code}`)
  console.log(`City code: ${capturedData.city_code}`)
  console.log(`Movement type: ${capturedData.movement_type}`)
  console.log(`Movement date: ${capturedData.movement_date}`)
  console.log('')

  // Check completeness
  if (isDataComplete(capturedData as SIREConversationalData)) {
    console.log('✅ All required data captured!')
    console.log('\nFinal data summary:')
    const summary = formatDataSummary(capturedData as SIREConversationalData, 'es')
    console.log(summary)
  } else {
    const missing = getMissingFields(capturedData)
    console.log('❌ Data incomplete! Missing fields:')
    missing.forEach(field => console.log(`  - ${field}`))
  }

  console.log('\n')
}

// ============================================================================
// RUN ALL EXAMPLES
// ============================================================================

/**
 * Ejecutar todos los ejemplos
 */
export function runAllExamples() {
  exampleContextAwareQuestions()
  exampleDateValidation()
  exampleNameSplitting()
  exampleDocumentTypeDetection()
  exampleCountryMapping()
  exampleColombianCityMapping()
  exampleDataCompletenessCheck()
  exampleDataSummaryFormatting()
  exampleCompleteConversationFlow()
}

// Uncomment to run examples:
// runAllExamples()
