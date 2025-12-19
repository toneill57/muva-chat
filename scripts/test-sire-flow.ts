/**
 * SIRE End-to-End Testing Script
 *
 * Simula el flujo completo de captura conversacional SIRE:
 * 1. Setup de datos de prueba
 * 2. Progressive disclosure (9 campos user-provided)
 * 3. Validación de cada campo
 * 4. Mapeo conversational → SIRE (13 campos)
 * 5. Verificación de formato TXT SIRE
 *
 * Ejecutar con:
 * pnpm dlx tsx scripts/test-sire-flow.ts
 */

import {
  getNextFieldToAsk,
  validateField,
  isDataComplete,
  getMissingFields,
  type ValidationResult
} from '../src/lib/sire/progressive-disclosure'
import { getQuestionForField } from '../src/lib/sire/conversational-prompts'
import type { SIREConversationalData } from '../src/lib/sire/conversational-prompts'
import type { SIREData, ConversationalData, TenantComplianceConfig, ReservationData } from '../src/lib/compliance-chat-engine'
import { ComplianceChatEngine } from '../src/lib/compliance-chat-engine'

// ============================================================================
// TEST DATA
// ============================================================================

interface TestCase {
  name: string
  inputs: Record<string, string>
  expectedValid: boolean
  description: string
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Usuario Estadounidense (Happy Path)',
    inputs: {
      document_type_code: '1', // Opción 1 → Pasaporte (código SIRE 3)
      identification_number: 'AB123456',
      first_surname: 'Smith',
      second_surname: 'Johnson', // Opcional pero proporcionado
      names: 'John Michael',
      nationality_code: 'Estados Unidos', // Acepta texto o código
      birth_date: '15/05/1990',
      origin_place: 'Miami',
      destination_place: 'Bogotá'
    },
    expectedValid: true,
    description: 'Turista estadounidense con todos los campos completos'
  },
  {
    name: 'Usuario Colombiano (Sin segundo apellido)',
    inputs: {
      document_type_code: '2', // Opción 2 → Cédula Extranjería (código SIRE 5)
      identification_number: '1234567890',
      first_surname: 'García',
      second_surname: 'no tengo', // Skip con keyword
      names: 'María',
      nationality_code: 'colombia', // Texto lowercase
      birth_date: '20/03/1985',
      origin_place: 'Medellín',
      destination_place: 'Cartagena'
    },
    expectedValid: true,
    description: 'Ciudadano colombiano sin segundo apellido (caso común)'
  },
  {
    name: 'Validación de Nacionalidad (Fuzzy Match)',
    inputs: {
      document_type_code: '1', // Pasaporte
      identification_number: 'CD789012',
      first_surname: 'Müller',
      second_surname: 'Schmidt',
      names: 'Hans',
      nationality_code: 'alemán', // Variante textual
      birth_date: '10/12/1978',
      origin_place: 'Berlín',
      destination_place: 'San Andrés'
    },
    expectedValid: true,
    description: 'Testing fuzzy search para nacionalidad (alemán → Alemania)'
  },
  {
    name: 'Código Numérico de Nacionalidad',
    inputs: {
      document_type_code: '1', // Pasaporte
      identification_number: 'EF345678',
      first_surname: 'Dubois',
      second_surname: 'Martin',
      names: 'Pierre',
      nationality_code: '275', // Código SIRE directo (Francia)
      birth_date: '25/08/1992',
      origin_place: 'París',
      destination_place: 'Cali'
    },
    expectedValid: true,
    description: 'Nacionalidad con código numérico directo (275 = Francia)'
  }
]

// Tenant config de prueba (Sunset Paradise Hotel - San Andrés)
const TENANT_CONFIG: TenantComplianceConfig = {
  codigo_hotel: '999999',
  codigo_ciudad: '88001', // San Andrés
  nombre_hotel: 'Sunset Paradise Hotel'
}

// Reservation data de prueba
const RESERVATION_DATA: ReservationData = {
  check_in_date: '2025-12-20', // ISO format
  check_out_date: '2025-12-27'
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Colorize console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step: number, title: string) {
  console.log(`\n${colors.bright}${colors.blue}[STEP ${step}] ${title}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green')
}

function logError(message: string) {
  log(`❌ ${message}`, 'red')
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan')
}

/**
 * Formato TXT SIRE (13 campos pipe-delimited)
 */
function formatSIRETXT(sireData: SIREData): string {
  return [
    sireData.codigo_hotel,
    sireData.codigo_ciudad,
    sireData.tipo_documento,
    sireData.numero_identificacion,
    sireData.codigo_nacionalidad,
    sireData.primer_apellido,
    sireData.segundo_apellido,
    sireData.nombres,
    sireData.tipo_movimiento,
    sireData.fecha_movimiento,
    sireData.lugar_procedencia,
    sireData.lugar_destino,
    sireData.fecha_nacimiento
  ].join('|')
}

/**
 * Validar formato TXT SIRE
 */
function validateSIRETXT(txt: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const parts = txt.split('|')

  // 13 campos obligatorios
  if (parts.length !== 13) {
    errors.push(`Expected 13 fields, got ${parts.length}`)
    return { valid: false, errors }
  }

  // Validar cada campo NO esté vacío (excepto segundo_apellido que puede estar vacío)
  const fieldNames = [
    'codigo_hotel', 'codigo_ciudad', 'tipo_documento', 'numero_identificacion',
    'codigo_nacionalidad', 'primer_apellido', 'segundo_apellido', 'nombres',
    'tipo_movimiento', 'fecha_movimiento', 'lugar_procedencia', 'lugar_destino',
    'fecha_nacimiento'
  ]

  parts.forEach((part, idx) => {
    // segundo_apellido (idx 6) puede estar vacío
    if (idx !== 6 && part.trim() === '') {
      errors.push(`Field ${fieldNames[idx]} (index ${idx}) is empty`)
    }
  })

  // Validar códigos numéricos
  const codigoHotel = parts[0]
  const codigoCiudad = parts[1]
  const tipoDocumento = parts[2]
  const codigoNacionalidad = parts[4]

  if (!/^\d+$/.test(codigoHotel)) {
    errors.push(`codigo_hotel must be numeric, got "${codigoHotel}"`)
  }

  if (!/^\d+$/.test(codigoCiudad)) {
    errors.push(`codigo_ciudad must be numeric, got "${codigoCiudad}"`)
  }

  if (!/^\d+$/.test(tipoDocumento)) {
    errors.push(`tipo_documento must be numeric, got "${tipoDocumento}"`)
  }

  if (!/^\d+$/.test(codigoNacionalidad)) {
    errors.push(`codigo_nacionalidad must be numeric, got "${codigoNacionalidad}"`)
  }

  // Validar tipo_movimiento (E o S)
  const tipoMovimiento = parts[8]
  if (tipoMovimiento !== 'E' && tipoMovimiento !== 'S') {
    errors.push(`tipo_movimiento must be E or S, got "${tipoMovimiento}"`)
  }

  // Validar fechas (formato DD/MM/YYYY)
  const fechaMovimiento = parts[9]
  const fechaNacimiento = parts[12]

  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/

  if (!dateRegex.test(fechaMovimiento)) {
    errors.push(`fecha_movimiento must be DD/MM/YYYY, got "${fechaMovimiento}"`)
  }

  if (!dateRegex.test(fechaNacimiento)) {
    errors.push(`fecha_nacimiento must be DD/MM/YYYY, got "${fechaNacimiento}"`)
  }

  return { valid: errors.length === 0, errors }
}

// ============================================================================
// PROGRESSIVE DISCLOSURE SIMULATION
// ============================================================================

/**
 * Simula captura progresiva de datos SIRE campo por campo
 */
async function simulateProgressiveDisclosure(
  testCase: TestCase
): Promise<{ success: boolean; sireData: Partial<SIREConversationalData> }> {
  log(`\n${'='.repeat(80)}`, 'cyan')
  log(`TEST CASE: ${testCase.name}`, 'bright')
  log(`${testCase.description}`, 'gray')
  log(`${'='.repeat(80)}`, 'cyan')

  const sireData: Partial<SIREConversationalData> = {}
  let fieldIndex = 0
  let success = true

  while (true) {
    // Determinar próximo campo
    const nextField = getNextFieldToAsk(sireData)

    if (nextField === null) {
      logSuccess('All fields captured - data complete!')
      break
    }

    fieldIndex++
    logStep(fieldIndex, `Capturing field: ${nextField}`)

    // Obtener pregunta sugerida
    const question = getQuestionForField(nextField, {
      language: 'es',
      previousData: sireData
    })

    logInfo(`Question: "${question}"`)

    // Simular input del usuario
    const userInput = testCase.inputs[nextField]

    if (userInput === undefined) {
      logError(`Missing input for field: ${nextField}`)
      success = false
      break
    }

    log(`User input: "${userInput}"`, 'gray')

    // Validar campo
    const validation: ValidationResult = validateField(nextField, userInput)

    if (!validation.valid) {
      logError(`Validation failed: ${validation.error}`)
      success = false
      break
    }

    // CRÍTICO: Usar ?? en lugar de || para que string vacío '' se preserve
    const normalizedValue = validation.normalized ?? userInput

    if (validation.skipped) {
      logWarning(`Field skipped: ${validation.error || 'User chose to skip'}`)
    } else {
      logSuccess(`Valid! Normalized: "${normalizedValue}"`)

      // Mostrar metadata si existe (ej: nationality_text)
      if (validation.metadata) {
        log(`  Metadata: ${JSON.stringify(validation.metadata)}`, 'gray')
      }
    }

    // Actualizar sireData (SIEMPRE, incluso si está skipped con valor vacío)
    sireData[nextField as keyof SIREConversationalData] = normalizedValue

    // Pequeño delay para simular conversación real (sin delay en testing)
    // await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Verificar completitud (solo 9 campos user-provided, NO auto-filled)
  const userProvidedFields: (keyof SIREConversationalData)[] = [
    'document_type_code',
    'identification_number',
    'first_surname',
    'second_surname', // Opcional pero debe estar presente (vacío si skip)
    'names',
    'nationality_code',
    'birth_date',
    'origin_place',
    'destination_place'
  ]

  const allUserFieldsCaptured = userProvidedFields.every(field => {
    return sireData[field] !== undefined && sireData[field] !== null
  })

  const capturedUserFields = userProvidedFields.filter(field => {
    return sireData[field] !== undefined && sireData[field] !== null
  })

  log('\n--- CAPTURE SUMMARY ---', 'cyan')
  log(`Total user-provided fields captured: ${capturedUserFields.length}/9`, 'gray')
  log(`Is complete: ${allUserFieldsCaptured ? '✅ YES' : '❌ NO'}`, allUserFieldsCaptured ? 'green' : 'red')

  if (!allUserFieldsCaptured) {
    const missing = userProvidedFields.filter(f => sireData[f] === undefined || sireData[f] === null)
    logWarning(`Missing fields: ${missing.join(', ')}`)
  }

  // Mostrar datos capturados
  log('\n--- CAPTURED DATA ---', 'cyan')
  Object.entries(sireData).forEach(([key, value]) => {
    log(`  ${key}: "${value}"`, 'gray')
  })

  return { success: success && allUserFieldsCaptured, sireData }
}

// ============================================================================
// SIRE MAPPING TEST
// ============================================================================

/**
 * Test de mapeo conversational → SIRE (13 campos oficiales)
 */
async function testSIREMapping(
  sireData: Partial<SIREConversationalData>,
  testCaseName: string
): Promise<SIREData | null> {
  logStep(99, 'Mapping Conversational → SIRE (13 campos oficiales)')

  try {
    // Construir ConversationalData desde SIREConversationalData
    const conversationalData: ConversationalData = {
      nombre_completo: `${sireData.names} ${sireData.first_surname} ${sireData.second_surname || ''}`.trim(),
      numero_pasaporte: sireData.identification_number || '',
      pais_texto: sireData.nationality || '',
      procedencia_texto: sireData.origin_place || '',
      destino_texto: sireData.destination_place || '',
      fecha_nacimiento: sireData.birth_date || '',
      proposito_viaje: 'Turismo y vacaciones'
    }

    log('Conversational data constructed:', 'gray')
    log(JSON.stringify(conversationalData, null, 2), 'gray')

    const engine = new ComplianceChatEngine()
    const mappedSIREData = await engine.mapToSIRE(
      conversationalData,
      TENANT_CONFIG,
      RESERVATION_DATA
    )

    logSuccess('SIRE mapping successful!')

    log('\n--- SIRE DATA (13 campos oficiales) ---', 'cyan')
    const sireFields = [
      { key: 'codigo_hotel', label: '1. Código Hotel' },
      { key: 'codigo_ciudad', label: '2. Código Ciudad' },
      { key: 'tipo_documento', label: '3. Tipo Documento' },
      { key: 'numero_identificacion', label: '4. Número Identificación' },
      { key: 'codigo_nacionalidad', label: '5. Código Nacionalidad' },
      { key: 'primer_apellido', label: '6. Primer Apellido' },
      { key: 'segundo_apellido', label: '7. Segundo Apellido' },
      { key: 'nombres', label: '8. Nombres' },
      { key: 'tipo_movimiento', label: '9. Tipo Movimiento' },
      { key: 'fecha_movimiento', label: '10. Fecha Movimiento' },
      { key: 'lugar_procedencia', label: '11. Lugar Procedencia' },
      { key: 'lugar_destino', label: '12. Lugar Destino' },
      { key: 'fecha_nacimiento', label: '13. Fecha Nacimiento' }
    ]

    sireFields.forEach(({ key, label }) => {
      const value = mappedSIREData[key as keyof SIREData]
      log(`  ${label}: "${value}"`, 'gray')
    })

    return mappedSIREData
  } catch (error) {
    logError(`SIRE mapping failed: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

// ============================================================================
// TXT VALIDATION TEST
// ============================================================================

/**
 * Test de validación de formato TXT SIRE
 */
function testSIRETXTValidation(sireData: SIREData, testCaseName: string): boolean {
  logStep(100, 'Validating SIRE TXT Format')

  const txt = formatSIRETXT(sireData)

  log('\n--- GENERATED TXT ---', 'cyan')
  log(txt, 'bright')

  const validation = validateSIRETXT(txt)

  log('\n--- VALIDATION RESULT ---', 'cyan')
  if (validation.valid) {
    logSuccess('TXT format is valid!')
    return true
  } else {
    logError('TXT format validation failed:')
    validation.errors.forEach(err => {
      log(`  - ${err}`, 'red')
    })
    return false
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.clear()
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', 'cyan')
  log('║               SIRE END-TO-END TESTING SCRIPT                              ║', 'cyan')
  log('╚═══════════════════════════════════════════════════════════════════════════╝', 'cyan')

  log('\nTenant Config:', 'cyan')
  log(JSON.stringify(TENANT_CONFIG, null, 2), 'gray')

  log('\nReservation Data:', 'cyan')
  log(JSON.stringify(RESERVATION_DATA, null, 2), 'gray')

  const results: { testCase: string; success: boolean }[] = []

  for (const testCase of TEST_CASES) {
    // Step 1: Progressive disclosure
    const { success: captureSuccess, sireData } = await simulateProgressiveDisclosure(testCase)

    if (!captureSuccess) {
      results.push({ testCase: testCase.name, success: false })
      continue
    }

    // Step 2: SIRE mapping
    const mappedData = await testSIREMapping(sireData, testCase.name)

    if (!mappedData) {
      results.push({ testCase: testCase.name, success: false })
      continue
    }

    // Step 3: TXT validation
    const txtValid = testSIRETXTValidation(mappedData, testCase.name)

    results.push({ testCase: testCase.name, success: txtValid })

    // Delay entre test cases (deshabilitado para ejecución rápida)
    // await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Final summary
  log('\n╔═══════════════════════════════════════════════════════════════════════════╗', 'cyan')
  log('║                           TEST SUMMARY                                    ║', 'cyan')
  log('╚═══════════════════════════════════════════════════════════════════════════╝', 'cyan')

  results.forEach(({ testCase, success }) => {
    const icon = success ? '✅' : '❌'
    const color = success ? 'green' : 'red'
    log(`${icon} ${testCase}`, color)
  })

  const totalTests = results.length
  const passedTests = results.filter(r => r.success).length
  const failedTests = totalTests - passedTests

  log('\n--- FINAL RESULTS ---', 'cyan')
  log(`Total tests: ${totalTests}`, 'gray')
  log(`Passed: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow')
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'gray')
  log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, passedTests === totalTests ? 'green' : 'yellow')

  if (passedTests === totalTests) {
    log('\n🎉 ALL TESTS PASSED! SIRE flow is working correctly.', 'green')
    // Forzar terminación inmediata para evitar procesos zombies
    setImmediate(() => process.exit(0))
  } else {
    log('\n⚠️  SOME TESTS FAILED. Please review the errors above.', 'red')
    // Forzar terminación inmediata para evitar procesos zombies
    setImmediate(() => process.exit(1))
  }
}

// Run tests
runAllTests()
  .catch(error => {
    logError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    console.error(error)
    setImmediate(() => process.exit(1))
  })
  .finally(() => {
    // Timeout de seguridad: si el proceso no terminó en 2 segundos, forzar salida
    setTimeout(() => {
      console.error('\n⚠️  Process timeout - forcing exit')
      process.exit(1)
    }, 2000).unref() // unref() permite que el proceso termine sin esperar este timeout
  })
