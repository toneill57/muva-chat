/**
 * SIRE Progressive Disclosure Logic
 *
 * Este módulo implementa la lógica para determinar qué campo SIRE preguntar siguiente
 * según el contexto actual del huésped. Usa un enfoque de "progressive disclosure"
 * para NO bombardear al usuario con todas las preguntas a la vez.
 *
 * Características:
 * - Orden de prioridad de campos (identidad → documento → fechas → procedencia)
 * - Campos auto-deducibles NO se preguntan
 * - Validación incremental por campo
 * - Soporte multi-formato para fechas
 * - Context-aware (nacionalidad afecta campos subsecuentes)
 *
 * @see docs/sire-auto-submission/PLAN.md - Context completo del proyecto
 * @see src/lib/sire/conversational-prompts.ts - Integración con prompts
 * @see src/lib/sire/field-mappers.ts - Tipos SIREConversationalData
 */

import { SIREConversationalData } from './conversational-prompts'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Resultado de validación de campo
 */
export interface FieldValidationResult {
  valid: boolean
  error?: string
}

/**
 * Configuración del tenant (códigos SIRE auto-llenables)
 */
export interface TenantSIREConfig {
  codigo_hotel?: string
  codigo_ciudad?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Orden de prioridad de campos SIRE (excluye auto-deducibles)
 *
 * Campos NO en esta lista son auto-llenables:
 * - codigo_hotel: De tenant config
 * - codigo_ciudad: De tenant config
 * - tipo_documento: Detectar de documento_numero
 * - tipo_movimiento: Del check-in (E=Entrada)
 * - fecha_movimiento: Del check-in date
 */
const FIELD_PRIORITY: Array<keyof SIREConversationalData> = [
  'full_name',         // 1. Identidad primero
  'document_number',   // 2. Documento (número)
  'nationality_text',  // 3. Nacionalidad
  'birth_date',        // 4. Fecha nacimiento
  'origin_text',       // 5. Procedencia
  'destination_text',  // 6. Destino
]

/**
 * Campos que NUNCA se preguntan (auto-deducibles)
 */
const AUTO_FILLED_FIELDS = [
  'codigo_hotel',
  'codigo_ciudad',
  'tipo_documento',
  'tipo_movimiento',
  'fecha_movimiento',
]

/**
 * Países que usan códigos DIVIPOLA en lugar de códigos SIRE
 * (Solo Colombia aplica)
 */
const DIVIPOLA_COUNTRIES = ['colombia', 'co', 'col', '169']

// ============================================================================
// MAIN FUNCTION: getNextFieldToAsk
// ============================================================================

/**
 * Determina el próximo campo SIRE a preguntar según el contexto actual
 *
 * Implementa progressive disclosure: retorna UN campo a la vez según
 * orden de prioridad definido en FIELD_PRIORITY.
 *
 * Campos auto-deducibles NO se retornan:
 * - codigo_hotel: De tenant_compliance_credentials
 * - codigo_ciudad: De tenant_compliance_credentials
 * - tipo_documento: Detectar de documento_numero (pasaporte vs cédula)
 * - tipo_movimiento: Siempre 'E' (Entrada) para check-in
 * - fecha_movimiento: check_in_date de la reserva
 *
 * @param currentData - Datos SIRE capturados hasta ahora (parciales)
 * @returns Nombre del próximo campo a preguntar, o null si todos completos
 *
 * @example
 * getNextFieldToAsk({}) // Returns: "full_name" (primero siempre)
 *
 * @example
 * getNextFieldToAsk({ full_name: "John Smith" }) // Returns: "document_number"
 *
 * @example
 * getNextFieldToAsk({
 *   full_name: "John Smith",
 *   document_number: "AB123456",
 *   nationality_text: "Estados Unidos",
 *   birth_date: "15/03/1985",
 *   origin_text: "Miami",
 *   destination_text: "Cartagena"
 * }) // Returns: null (todos completos)
 */
export function getNextFieldToAsk(
  currentData: Partial<SIREConversationalData>
): keyof SIREConversationalData | null {
  // Iterar sobre campos en orden de prioridad
  for (const field of FIELD_PRIORITY) {
    const value = currentData[field]

    // Si el campo está vacío, es el próximo a preguntar
    if (!value || value === '') {
      return field
    }
  }

  // Todos los campos están completos
  return null
}

// ============================================================================
// CONDITIONAL LOGIC: shouldSkipField
// ============================================================================

/**
 * Determina si un campo debe saltearse según el contexto
 *
 * Casos especiales:
 * - Si nacionalidad es Colombia → procedencia/destino pueden ser DIVIPOLA
 *   (ciudades colombianas) en lugar de códigos SIRE (países)
 *
 * IMPORTANTE: Esta función NO implementa lógica de skip por ahora,
 * pero está preparada para casos futuros donde ciertos campos no apliquen
 * según el contexto del huésped.
 *
 * @param field - Campo a evaluar
 * @param currentData - Datos actuales
 * @returns true si el campo debe saltearse, false si debe preguntarse
 *
 * @example
 * shouldSkipField('origin_text', { nationality_text: 'Colombia' })
 * // Returns: false (aún debe preguntarse, pero será código DIVIPOLA)
 *
 * @example
 * shouldSkipField('codigo_hotel', {})
 * // Returns: false (pero getNextFieldToAsk() nunca lo retorna de todos modos)
 */
export function shouldSkipField(
  field: keyof SIREConversationalData,
  currentData: Partial<SIREConversationalData>
): boolean {
  // Campos auto-filled nunca se preguntan (no se salta, simplemente no están en FIELD_PRIORITY)
  if (AUTO_FILLED_FIELDS.includes(field as string)) {
    return true
  }

  // Lógica condicional para casos especiales
  const nationality = currentData.nationality_text?.toLowerCase() || ''
  const isColombian = DIVIPOLA_COUNTRIES.some(code => nationality.includes(code))

  // Si es colombiano, procedencia/destino siguen siendo necesarios,
  // pero se interpretarán como DIVIPOLA en lugar de códigos SIRE de país
  // (NO se saltean, solo cambia la interpretación del código)
  if (isColombian && (field === 'origin_text' || field === 'destination_text')) {
    return false // Aún preguntar (pero serán ciudades colombianas)
  }

  // Por defecto, NO saltear
  return false
}

// ============================================================================
// VALIDATION: validateField
// ============================================================================

/**
 * Valida un campo SIRE según su tipo y formato
 *
 * Validaciones implementadas:
 * - documento_numero: 6-15 caracteres alfanuméricos
 * - nombre_completo: Mínimo 2 palabras (nombre + apellido)
 * - fecha_nacimiento: Fecha válida, no futura
 * - nationality_text: No vacío
 * - origin_text: No vacío
 * - destination_text: No vacío
 *
 * @param field - Nombre del campo a validar
 * @param value - Valor del campo
 * @returns { valid: boolean; error?: string }
 *
 * @example
 * validateField('document_number', 'AB123456')
 * // Returns: { valid: true }
 *
 * @example
 * validateField('document_number', '12345')
 * // Returns: { valid: false, error: 'Documento debe tener entre 6 y 15 caracteres' }
 *
 * @example
 * validateField('full_name', 'John')
 * // Returns: { valid: false, error: 'Nombre debe contener al menos nombre y apellido' }
 *
 * @example
 * validateField('birth_date', '25/03/1985')
 * // Returns: { valid: true }
 *
 * @example
 * validateField('birth_date', '25/03/2030')
 * // Returns: { valid: false, error: 'Fecha de nacimiento no puede ser futura' }
 */
export function validateField(
  field: keyof SIREConversationalData,
  value: string | undefined
): FieldValidationResult {
  // Valores vacíos
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Campo requerido' }
  }

  const trimmedValue = value.trim()

  switch (field) {
    // ============================
    // DOCUMENTO
    // ============================
    case 'document_number': {
      // Limpiar guiones y espacios para validar longitud
      const cleaned = trimmedValue.replace(/[-\s]/g, '')

      if (cleaned.length < 6 || cleaned.length > 15) {
        return {
          valid: false,
          error: 'Documento debe tener entre 6 y 15 caracteres alfanuméricos'
        }
      }

      // Validar caracteres alfanuméricos
      if (!/^[A-Z0-9]+$/i.test(cleaned)) {
        return {
          valid: false,
          error: 'Documento solo puede contener letras y números'
        }
      }

      return { valid: true }
    }

    // ============================
    // NOMBRE COMPLETO
    // ============================
    case 'full_name': {
      const words = trimmedValue.split(/\s+/)

      if (words.length < 2) {
        return {
          valid: false,
          error: 'Nombre debe contener al menos nombre y apellido (mínimo 2 palabras)'
        }
      }

      // Validar que solo contiene letras, espacios, acentos y Ñ
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmedValue)) {
        return {
          valid: false,
          error: 'Nombre solo puede contener letras y espacios'
        }
      }

      return { valid: true }
    }

    // ============================
    // FECHA NACIMIENTO
    // ============================
    case 'birth_date': {
      const parsedDate = parseDate(trimmedValue)

      if (!parsedDate) {
        return {
          valid: false,
          error: 'Formato de fecha inválido. Use DD/MM/YYYY, "25 de marzo de 1985", o "March 25, 1985"'
        }
      }

      // Validar que no sea futura
      const now = new Date()
      if (parsedDate > now) {
        return {
          valid: false,
          error: 'Fecha de nacimiento no puede ser futura'
        }
      }

      // Validar que sea razonable (no más de 120 años atrás)
      const minDate = new Date()
      minDate.setFullYear(now.getFullYear() - 120)

      if (parsedDate < minDate) {
        return {
          valid: false,
          error: 'Fecha de nacimiento no puede ser mayor a 120 años'
        }
      }

      return { valid: true }
    }

    // ============================
    // NACIONALIDAD
    // ============================
    case 'nationality_text': {
      if (trimmedValue.length < 3) {
        return {
          valid: false,
          error: 'Nacionalidad debe tener al menos 3 caracteres'
        }
      }

      return { valid: true }
    }

    // ============================
    // PROCEDENCIA
    // ============================
    case 'origin_text': {
      if (trimmedValue.length < 2) {
        return {
          valid: false,
          error: 'Lugar de procedencia debe tener al menos 2 caracteres'
        }
      }

      return { valid: true }
    }

    // ============================
    // DESTINO
    // ============================
    case 'destination_text': {
      if (trimmedValue.length < 2) {
        return {
          valid: false,
          error: 'Lugar de destino debe tener al menos 2 caracteres'
        }
      }

      return { valid: true }
    }

    // ============================
    // OTROS CAMPOS (sin validación específica)
    // ============================
    default:
      return { valid: true }
  }
}

// ============================================================================
// DATE PARSING: parseDate
// ============================================================================

/**
 * Parsea múltiples formatos de fecha a Date object
 *
 * Formatos soportados:
 * - DD/MM/YYYY (ej: "25/03/1985")
 * - DD-MM-YYYY (ej: "25-03-1985")
 * - DD de MMMM de YYYY (ej: "25 de marzo de 1985")
 * - MMMM DD, YYYY (ej: "March 25, 1985")
 * - DD MMMM YYYY (ej: "25 marzo 1985")
 * - YYYY-MM-DD (ej: "1985-03-25" - ISO format)
 *
 * @param dateString - String con fecha en cualquier formato soportado
 * @returns Date object o null si formato inválido
 *
 * @example
 * parseDate("25/03/1985") // Returns: Date(1985, 2, 25)
 *
 * @example
 * parseDate("25 de marzo de 1985") // Returns: Date(1985, 2, 25)
 *
 * @example
 * parseDate("March 25, 1985") // Returns: Date(1985, 2, 25)
 *
 * @example
 * parseDate("1985-03-25") // Returns: Date(1985, 2, 25)
 *
 * @example
 * parseDate("invalid date") // Returns: null
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') {
    return null
  }

  const trimmed = dateString.trim()

  // Meses en español (lowercase para matching case-insensitive)
  const monthsES: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  }

  // Meses en inglés (lowercase)
  const monthsEN: Record<string, number> = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  }

  // ============================
  // Formato 1: DD/MM/YYYY
  // ============================
  const slashPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  const slashMatch = trimmed.match(slashPattern)

  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10) - 1 // JavaScript months are 0-indexed
    const year = parseInt(slashMatch[3], 10)

    const date = new Date(year, month, day)

    // Validar que la fecha sea válida
    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date
    }

    return null // Fecha inválida (ej: 32/13/2020)
  }

  // ============================
  // Formato 2: DD-MM-YYYY
  // ============================
  const dashPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  const dashMatch = trimmed.match(dashPattern)

  if (dashMatch) {
    const day = parseInt(dashMatch[1], 10)
    const month = parseInt(dashMatch[2], 10) - 1
    const year = parseInt(dashMatch[3], 10)

    const date = new Date(year, month, day)

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date
    }

    return null
  }

  // ============================
  // Formato 3: YYYY-MM-DD (ISO)
  // ============================
  const isoPattern = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
  const isoMatch = trimmed.match(isoPattern)

  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)

    const date = new Date(year, month, day)

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return date
    }

    return null
  }

  // ============================
  // Formato 4: DD de MMMM de YYYY (español)
  // ============================
  const spanishPattern = /^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})$/i
  const spanishMatch = trimmed.match(spanishPattern)

  if (spanishMatch) {
    const day = parseInt(spanishMatch[1], 10)
    const monthName = spanishMatch[2].toLowerCase()
    const year = parseInt(spanishMatch[3], 10)

    const month = monthsES[monthName]

    if (month !== undefined) {
      const date = new Date(year, month, day)

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date
      }
    }

    return null
  }

  // ============================
  // Formato 5: DD MMMM YYYY (sin "de")
  // ============================
  const spanishPattern2 = /^(\d{1,2})\s+(\w+)\s+(\d{4})$/i
  const spanishMatch2 = trimmed.match(spanishPattern2)

  if (spanishMatch2) {
    const day = parseInt(spanishMatch2[1], 10)
    const monthName = spanishMatch2[2].toLowerCase()
    const year = parseInt(spanishMatch2[3], 10)

    const month = monthsES[monthName]

    if (month !== undefined) {
      const date = new Date(year, month, day)

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date
      }
    }

    return null
  }

  // ============================
  // Formato 6: MMMM DD, YYYY (inglés)
  // ============================
  const englishPattern = /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i
  const englishMatch = trimmed.match(englishPattern)

  if (englishMatch) {
    const monthName = englishMatch[1].toLowerCase()
    const day = parseInt(englishMatch[2], 10)
    const year = parseInt(englishMatch[3], 10)

    const month = monthsEN[monthName]

    if (month !== undefined) {
      const date = new Date(year, month, day)

      if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
      ) {
        return date
      }
    }

    return null
  }

  // Ningún formato coincide
  console.warn('[progressive-disclosure] Formato de fecha no reconocido:', dateString)
  return null
}

// ============================================================================
// HELPER: Auto-fillable fields detection
// ============================================================================

/**
 * Detecta qué campos pueden auto-llenarse desde tenant config y reserva
 *
 * Útil para saber cuántos campos REALMENTE faltan por preguntar.
 *
 * @param currentData - Datos SIRE actuales
 * @param tenantConfig - Configuración del tenant (códigos SIRE)
 * @returns Lista de campos que pueden auto-llenarse
 *
 * @example
 * getAutoFillableFields({}, { codigo_hotel: '7706', codigo_ciudad: '88001' })
 * // Returns: ['codigo_hotel', 'codigo_ciudad', 'tipo_movimiento', 'fecha_movimiento']
 */
export function getAutoFillableFields(
  currentData: Partial<SIREConversationalData>,
  tenantConfig: TenantSIREConfig
): string[] {
  const autoFillable: string[] = []

  // 1. Códigos del tenant
  if (tenantConfig.codigo_hotel) {
    autoFillable.push('codigo_hotel')
  }

  if (tenantConfig.codigo_ciudad) {
    autoFillable.push('codigo_ciudad')
  }

  // 2. Tipo de movimiento (siempre 'E' para check-in)
  autoFillable.push('tipo_movimiento')

  // 3. Fecha de movimiento (check-in date)
  autoFillable.push('fecha_movimiento')

  // 4. Tipo de documento (detectar de document_number)
  if (currentData.document_number) {
    autoFillable.push('tipo_documento')
  }

  return autoFillable
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  getNextFieldToAsk,
  shouldSkipField,
  validateField,
  parseDate,
  getAutoFillableFields,
}
