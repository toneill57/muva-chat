/**
 * EJEMPLO DE USO - conversational-prompts.ts
 *
 * Muestra cómo usar el módulo en el flujo de chat SIRE
 */

import {
  SIRE_SYSTEM_PROMPT,
  getQuestionForField,
  getNextFieldToAsk,
  calculateCompleteness,
  getConfirmationMessage,
  getProgressMessage,
  getCompletionMessage,
  detectLanguage,
  type SIREConversationalData,
  type QuestionContext,
} from '@/lib/sire/conversational-prompts'

// ============================================================================
// EJEMPLO 1: Inicializar conversación SIRE
// ============================================================================

function initializeSIREConversation() {
  // System prompt se inyecta en Claude
  const systemPrompt = SIRE_SYSTEM_PROMPT

  console.log('[SIRE] System prompt ready:', systemPrompt.substring(0, 100) + '...')
  return systemPrompt
}

// ============================================================================
// EJEMPLO 2: Detectar idioma y generar primera pregunta
// ============================================================================

function startSIRECapture(guestMessage: string) {
  // Detectar idioma del huésped
  const language = detectLanguage(guestMessage)
  console.log('[SIRE] Detected language:', language)

  // Inicializar datos conversacionales
  const conversationalData: SIREConversationalData = {
    language,
  }

  // Determinar próximo campo
  const nextField = getNextFieldToAsk(conversationalData)
  console.log('[SIRE] Next field to ask:', nextField)

  // Generar pregunta
  if (nextField) {
    const context: QuestionContext = {
      tenant_id: 'example-tenant',
      language,
    }

    // Type assertion needed because getNextFieldToAsk returns string | null
    // but getQuestionForField expects specific field names
    const question = getQuestionForField(nextField as any, context)
    console.log('[SIRE] Question:', question)
    return question
  }

  return null
}

// ============================================================================
// EJEMPLO 3: Captura progresiva con confirmaciones
// ============================================================================

function processSIREResponse(
  guestMessage: string,
  conversationalData: SIREConversationalData
) {
  const language = conversationalData.language || 'es'

  // Simular extracción (en producción, esto viene del chat engine)
  // Por ejemplo, si huésped dice "John Smith", se extrae full_name

  // Actualizar datos
  conversationalData.full_name = 'John Smith'

  // Confirmar campo capturado
  const confirmation = getConfirmationMessage('full_name', 'John Smith', language)
  console.log('[SIRE] Confirmation:', confirmation)

  // Calcular completitud
  const completeness = calculateCompleteness(conversationalData)
  console.log('[SIRE] Completeness:', completeness)

  // Generar mensaje de progreso
  const progress = getProgressMessage(completeness.completed, completeness.total, language)
  console.log('[SIRE] Progress:', progress)

  // Determinar próximo campo
  const nextField = getNextFieldToAsk(conversationalData)

  if (nextField) {
    const context: QuestionContext = {
      tenant_id: 'example-tenant',
      language,
      conversation_history: guestMessage,
    }

    // Type assertion needed because getNextFieldToAsk returns string | null
    const question = getQuestionForField(nextField as any, context)
    return `${confirmation}${question}`
  } else {
    // Completado
    return getCompletionMessage(language)
  }
}

// ============================================================================
// EJEMPLO 4: Flujo completo simulado
// ============================================================================

function simulateSIREConversation() {
  console.log('=== SIMULACIÓN CONVERSACIÓN SIRE ===\n')

  const data: SIREConversationalData = {}

  // Mensaje 1: Saludo del huésped
  console.log('Huésped: "Hola, necesito ayuda con mi check-in"')
  const language = detectLanguage('Hola, necesito ayuda con mi check-in')
  data.language = language
  console.log(`Claude detecta idioma: ${language}\n`)

  // Claude pregunta nombre
  let nextField = getNextFieldToAsk(data)
  console.log(`Claude pregunta ${nextField}:`)
  console.log(`"${getQuestionForField('full_name', { tenant_id: 'test', language })}"\n`)

  // Huésped responde
  console.log('Huésped: "Juan Pablo García Pérez"')
  data.full_name = 'Juan Pablo García Pérez'
  let confirmation = getConfirmationMessage('full_name', data.full_name, language)
  console.log(`Claude confirma: "${confirmation}"\n`)

  // Claude pregunta documento
  nextField = getNextFieldToAsk(data)
  console.log(`Claude pregunta ${nextField}:`)
  console.log(`"${getQuestionForField('document_number', { tenant_id: 'test', language })}"\n`)

  // Huésped responde
  console.log('Huésped: "AB1234567, soy estadounidense"')
  data.document_number = 'AB1234567'
  data.nationality_text = 'Estados Unidos'
  confirmation = getConfirmationMessage('document_number', data.document_number, language)
  console.log(`Claude confirma: "${confirmation}"\n`)

  // Progreso
  const completeness = calculateCompleteness(data)
  console.log(`Progreso: ${completeness.percentage}% (${completeness.completed}/${completeness.total})`)
  console.log(`Campos faltantes: ${completeness.missing.join(', ')}\n`)

  // ... (continúa hasta completar todos los campos)

  // Simulación de completitud
  data.birth_date = '25/03/1985'
  data.origin_text = 'Miami'
  data.destination_text = 'Cartagena'

  const finalCompleteness = calculateCompleteness(data)
  if (finalCompleteness.percentage === 100) {
    console.log(getCompletionMessage(language))
  }
}

// Ejecutar simulación
simulateSIREConversation()
