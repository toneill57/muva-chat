/**
 * SIRE Progressive Disclosure Logic
 *
 * Sistema de captura secuencial inteligente para los 13 campos SIRE obligatorios.
 *
 * Este módulo implementa:
 * - getNextFieldToAsk(): Determina el próximo campo a preguntar basado en priorización
 * - shouldSkipField(): Logic condicional para omitir campos según contexto
 * - validateField(): Validación incremental por campo con normalización
 * - isDataComplete(): Verifica si todos los campos requeridos están completos
 * - getMissingFields(): Retorna lista de campos faltantes
 *
 * Estrategia Progressive Disclosure:
 * - Priorizar campos críticos primero (documento → identidad → nacionalidad)
 * - Skip automático de campos auto-deducibles (hotel, ciudad, tipo movimiento, fecha movimiento)
 * - MÁXIMO 8 preguntas al huésped (progressive disclosure)
 * - Context-aware logic (ej: colombianos → preguntar ciudad DIVIPOLA)
 *
 * @see src/lib/sire/conversational-prompts.ts - System prompts y templates
 * @see src/lib/sire/field-mappers.ts - Mappers conversational ↔ SIRE
 * @see src/lib/sire/sire-catalogs.ts - Códigos oficiales SIRE
 * @see docs/features/sire-compliance/CODIGOS_OFICIALES.md - Especificación oficial
 */

import { SIREConversationalData } from './conversational-prompts'
import { getSIRECountryCode, getSIRECountryName, getDIVIPOLACityCode } from './sire-catalogs'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Resultado de validación de un campo
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  normalized?: string // Valor normalizado (ej: "ab123456" → "AB123456")
  skipped?: boolean   // Indica si el campo opcional fue intencionalmente omitido
  metadata?: Record<string, any> // Metadata adicional (ej: nationality_text para nationality_code)
}

// ============================================================================
// PROGRESSIVE DISCLOSURE - NEXT FIELD LOGIC
// ============================================================================

/**
 * Determina el próximo campo SIRE a preguntar basado en progressive disclosure
 *
 * Esta función implementa la estrategia de captura secuencial inteligente:
 * 1. Priorizar campos críticos primero (documento → identidad)
 * 2. Skip automático de campos auto-deducibles (hotel, ciudad, tipo movimiento, fecha movimiento)
 * 3. MÁXIMO 8 preguntas al huésped (progressive disclosure)
 * 4. Context-aware logic (ej: colombianos → preguntar ciudad DIVIPOLA)
 *
 * Orden de prioridad:
 * - identification_number: Documento primero (identificación única)
 * - first_surname: Primer apellido (segundo campo crítico)
 * - second_surname: Segundo apellido (inmediatamente después del primero)
 * - names: Nombres (tercer campo crítico)
 * - nationality_code: Nacionalidad (determina origen/destino logic)
 * - birth_date: Fecha de nacimiento (validación de edad)
 * - origin_place: Lugar de procedencia (context-aware según nacionalidad)
 * - destination_place: Lugar de destino (context-aware según nacionalidad)
 *
 * Campos auto-deducibles (NO se preguntan):
 * - hotel_code: Del tenant config
 * - city_code: Del tenant config
 * - document_type_code: Auto-detectado del identification_number
 * - movement_type: Del check-in (E=Entrada, S=Salida)
 * - movement_date: Del check-in date (formato DD/MM/YYYY)
 *
 * @param currentData - Datos SIRE capturados hasta ahora
 * @returns Nombre del campo a preguntar, o null si todos están completos
 *
 * @example
 * // Primer llamado (sin datos)
 * const nextField = getNextFieldToAsk({});
 * // Returns: 'identification_number' (documento primero)
 *
 * @example
 * // Segundo llamado (ya tenemos documento)
 * const nextField = getNextFieldToAsk({ identification_number: 'AB123456' });
 * // Returns: 'first_surname' (apellido segundo)
 *
 * @example
 * // Después de capturar nacionalidad colombiana
 * const nextField = getNextFieldToAsk({
 *   identification_number: 'AB123456',
 *   first_surname: 'GARCÍA',
 *   names: 'JUAN CARLOS',
 *   nationality_code: '169'
 * });
 * // Returns: 'birth_date' (fecha de nacimiento)
 */
export function getNextFieldToAsk(
  currentData: Partial<SIREConversationalData>
): string | null {
  // Priority order de campos (MÁXIMO 8 preguntas al huésped)
  const fieldPriority = [
    'document_type_code',       // 1. Tipo de documento PRIMERO (Pasaporte, Cédula, etc.)
    'identification_number',    // 2. Número de documento (identificación)
    'first_surname',            // 3. Primer apellido
    'second_surname',           // 4. Segundo apellido (opcional)
    'names',                    // 5. Nombres
    'nationality_code',         // 6. Nacionalidad
    'birth_date',               // 7. Fecha nacimiento
    'origin_place',             // 8. Lugar de procedencia
    'destination_place'         // 9. Lugar de destino
  ]

  // Campos auto-deducibles (NO preguntar - se llenan automáticamente)
  // - hotel_code: Del tenant config
  // - city_code: Del tenant config
  // - document_type_code: Detectar automáticamente de identification_number
  // - movement_type: Del check-in (E=Entrada)
  // - movement_date: Del check-in date

  // Encontrar primer campo faltante según prioridad
  for (const field of fieldPriority) {
    const value = currentData[field as keyof SIREConversationalData]

    // CASO ESPECIAL: second_surname puede estar vacío si fue skipped
    // Si tiene valor '' (string vacío), considerarlo completado
    if (field === 'second_surname' && value === '') {
      continue // Campo completado (skipped), pasar al siguiente
    }

    // Si el campo está vacío o undefined
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      // Verificar si este campo debe ser skipped
      if (!shouldSkipField(field, currentData)) {
        return field
      }
    }
  }

  return null // Todos los campos completados
}

// ============================================================================
// SKIP LOGIC - CONTEXT-AWARE FIELD SKIPPING
// ============================================================================

/**
 * Determina si un campo debe ser omitido basado en contexto
 *
 * Esta función implementa lógica condicional para skip automático de campos
 * según el contexto de datos ya capturados.
 *
 * Casos de skip implementados:
 * - origin_place: NO skip para colombianos (deben especificar ciudad DIVIPOLA)
 * - destination_place: NO skip para colombianos (deben especificar ciudad DIVIPOLA)
 *
 * @param fieldName - Nombre del campo a evaluar
 * @param currentData - Datos capturados hasta ahora
 * @returns true si el campo debe ser omitido, false si debe preguntarse
 *
 * @example
 * // Colombiano - NO skip (debe preguntar ciudad colombiana)
 * shouldSkipField('origin_place', { nationality_code: '169' });
 * // Returns: false (NO skip - preguntar ciudad colombiana específica)
 *
 * @example
 * // Extranjero - NO skip (debe preguntar país de origen)
 * shouldSkipField('origin_place', { nationality_code: '249' });
 * // Returns: false (NO skip - preguntar país)
 *
 * @example
 * // Campo sin skip logic especial
 * shouldSkipField('names', { nationality_code: '169' });
 * // Returns: false (NO skip - siempre preguntar nombres)
 */
export function shouldSkipField(
  fieldName: string,
  currentData: Partial<SIREConversationalData>
): boolean {
  // Si nacionalidad es Colombia (169), procedencia debe ser ciudad DIVIPOLA
  // NO skip - preguntar ciudad colombiana específica
  if (fieldName === 'origin_place' && currentData.nationality_code === '169') {
    return false
  }

  // Si nacionalidad es Colombia (169), destino debe ser ciudad DIVIPOLA
  // NO skip - preguntar ciudad colombiana específica
  if (fieldName === 'destination_place' && currentData.nationality_code === '169') {
    return false
  }

  // Si nacionalidad NO es Colombia, origen/destino pueden ser código SIRE país
  // NO skip - preguntar país de origen/destino
  if (fieldName === 'origin_place' || fieldName === 'destination_place') {
    return false
  }

  // No hay skip logic para otros campos por ahora
  // Futuras optimizaciones podrían incluir:
  // - Skip second_surname si el usuario indica que no tiene
  // - Skip destination si es igual al origen (viaje redondo)
  return false
}

// ============================================================================
// SKIP INTENT DETECTION - OPTIONAL FIELDS
// ============================================================================

/**
 * Detecta si el usuario quiere saltar un campo opcional
 *
 * Múltiples métodos de detección:
 * 1. String vacío (presionar Enter sin escribir)
 * 2. Keywords básicos ("no tengo", "ninguno", "n/a", "skip")
 * 3. Keywords expandidos (frases completas como "no tengo segundo apellido")
 *
 * @param input - Texto ingresado por el usuario
 * @param fieldName - Nombre del campo (para contexto futuro)
 * @returns true si el usuario quiere saltar el campo
 *
 * @example
 * detectSkipIntent('no tengo', 'second_surname'); // Returns: true
 * detectSkipIntent('N/A', 'second_surname'); // Returns: true
 * detectSkipIntent('', 'second_surname'); // Returns: true
 * detectSkipIntent('García', 'second_surname'); // Returns: false
 */
function detectSkipIntent(input: string, fieldName: string): boolean {
  const trimmed = input.trim().toLowerCase()

  // Método 1: String vacío
  if (trimmed.length === 0) {
    return true
  }

  // Método 2: Keywords básicos
  const basicKeywords = [
    'no tengo',
    'no',
    'ninguno',
    'n/a',
    'na',
    'skip',
    'omitir',
    'saltar',
    '-'
  ]

  if (basicKeywords.some(keyword => trimmed === keyword)) {
    return true
  }

  // Método 3: Keywords expandidos (frases completas)
  const expandedKeywords = [
    'no tengo segundo apellido',
    'no poseo',
    'no aplica',
    'no cuento con',
    'no tiene',
    'sin segundo apellido',
    'i don\'t have',
    'don\'t have',
    'none'
  ]

  if (expandedKeywords.some(keyword => trimmed.includes(keyword))) {
    return true
  }

  return false
}

// ============================================================================
// FIELD VALIDATION - INCREMENTAL VALIDATION WITH NORMALIZATION
// ============================================================================

/**
 * Valida un campo SIRE según sus reglas específicas
 *
 * Esta función valida formato, longitud, y rangos según especificaciones SIRE.
 * También normaliza valores (ej: "ab-123456" → "AB123456").
 *
 * Reglas por campo:
 * - identification_number: 6-15 caracteres alfanuméricos, sin guiones ni espacios
 * - first_surname: Max 45 chars, solo letras y espacios
 * - second_surname: Max 45 chars, solo letras y espacios
 * - names: Max 60 chars, solo letras y espacios
 * - birth_date: Formato DD/MM/YYYY, no futuro, edad entre 0-150 años
 * - origin_place: Min 2 chars
 * - destination_place: Min 2 chars
 *
 * @param fieldName - Nombre del campo a validar
 * @param value - Valor a validar
 * @returns Resultado de validación con error opcional y valor normalizado
 *
 * @example
 * // Documento válido con normalización
 * validateField('identification_number', 'ab-123456');
 * // Returns: { valid: true, normalized: 'AB123456' }
 *
 * @example
 * // Documento inválido (muy corto)
 * validateField('identification_number', 'ABC');
 * // Returns: {
 * //   valid: false,
 * //   error: 'Número de documento debe tener 6-15 caracteres alfanuméricos (sin guiones ni espacios)'
 * // }
 *
 * @example
 * // Apellido válido
 * validateField('first_surname', 'García López');
 * // Returns: { valid: true, normalized: 'García López' }
 *
 * @example
 * // Fecha válida
 * validateField('birth_date', '25/03/1985');
 * // Returns: { valid: true, normalized: '25/03/1985' }
 *
 * @example
 * // Fecha inválida (formato incorrecto)
 * validateField('birth_date', '1985-03-25');
 * // Returns: {
 * //   valid: false,
 * //   error: 'Fecha debe estar en formato DD/MM/YYYY (ej: 25/03/1985)'
 * // }
 */
export function validateField(
  fieldName: string,
  value: string,
  currentData?: Partial<SIREConversationalData>
): ValidationResult {
  // Trim whitespace
  const trimmed = value.trim()

  switch (fieldName) {
    case 'document_type_code':
      // Mapear números 1-4 a códigos SIRE oficiales
      const documentTypeMap: Record<string, string> = {
        '1': '3',   // Pasaporte → Código 3
        '2': '5',   // Cédula Extranjería → Código 5
        '3': '46',  // Carné Diplomático → Código 46
        '4': '10'   // Documento Extranjero (Mercosur/CAN) → Código 10
      }

      // Si el usuario envió 1-4, convertir a código SIRE
      const mappedCode = documentTypeMap[trimmed] || trimmed

      // Validar código final (solo 3, 5, 46, 10 son válidos según Manual SIRE)
      const validDocumentCodes = ['3', '5', '46', '10']

      if (!validDocumentCodes.includes(mappedCode)) {
        return {
          valid: false,
          error: 'Por favor selecciona una opción válida (1, 2, 3 o 4)'
        }
      }

      return {
        valid: true,
        normalized: mappedCode  // Guardar código SIRE, no el número de opción
      }

    case 'identification_number':
      // 6-15 caracteres alfanuméricos, sin guiones ni espacios
      const normalized = trimmed.toUpperCase().replace(/[-\s]/g, '')
      if (!/^[A-Z0-9]{6,15}$/.test(normalized)) {
        return {
          valid: false,
          error: 'Número de documento debe tener 6-15 caracteres alfanuméricos (sin guiones ni espacios)'
        }
      }
      return { valid: true, normalized }

    case 'first_surname':
      // Max 45 chars, letras, espacios, apóstrofes y guiones (para nombres como O'Neill, Jean-Claude)
      if (trimmed.length > 45) {
        return {
          valid: false,
          error: 'Primer apellido no puede exceder 45 caracteres'
        }
      }
      if (!/^[A-Za-zÀ-ÿ\u00f1\u00d1\s'\-]+$/.test(trimmed)) {
        return {
          valid: false,
          error: 'Primer apellido solo puede contener letras, apóstrofes y guiones (ej: O\'Neill, Jean-Claude)'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'second_surname':
      // OPCIONAL - Detectar intención de skip PRIMERO
      if (detectSkipIntent(value, 'second_surname')) {
        return {
          valid: true,
          normalized: '',
          skipped: true  // Flag para mensaje personalizado "Campo omitido"
        }
      }

      // Max 45 chars, solo letras y espacios (con acentos/Ñ permitidos)
      // Permitir vacío si ya pasó skip detection
      if (trimmed.length === 0) {
        return { valid: true, normalized: '' }
      }

      // Validar formato solo si NO es skip
      if (trimmed.length > 45) {
        return {
          valid: false,
          error: 'Segundo apellido no puede exceder 45 caracteres'
        }
      }
      if (!/^[A-Za-zÀ-ÿ\u00f1\u00d1\s'\-]+$/.test(trimmed)) {
        return {
          valid: false,
          error: 'Segundo apellido solo puede contener letras, apóstrofes y guiones (ej: O\'Neill, Jean-Claude)'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'names':
      // Max 60 chars, letras, espacios, apóstrofes y guiones (para nombres como Jean-Paul, Mary-Anne)
      if (trimmed.length > 60) {
        return {
          valid: false,
          error: 'Nombres no pueden exceder 60 caracteres'
        }
      }
      if (!/^[A-Za-zÀ-ÿ\u00f1\u00d1\s'\-]+$/.test(trimmed)) {
        return {
          valid: false,
          error: 'Nombres solo pueden contener letras, apóstrofes y guiones (ej: Jean-Paul, Mary-Anne)'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'birth_date':
      // Formato DD/MM/YYYY
      const dateMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (!dateMatch) {
        return {
          valid: false,
          error: 'Fecha debe estar en formato DD/MM/YYYY (ej: 25/03/1985)'
        }
      }

      const [, day, month, year] = dateMatch
      const dayNum = parseInt(day)
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)

      // Validar rangos básicos
      if (dayNum < 1 || dayNum > 31) {
        return {
          valid: false,
          error: 'Día debe estar entre 01 y 31'
        }
      }
      if (monthNum < 1 || monthNum > 12) {
        return {
          valid: false,
          error: 'Mes debe estar entre 01 y 12'
        }
      }
      if (yearNum < 1900 || yearNum > 2100) {
        return {
          valid: false,
          error: 'Año debe estar entre 1900 y 2100'
        }
      }

      // Validar fecha válida (Date constructor valida días por mes, años bisiestos, etc.)
      const date = new Date(yearNum, monthNum - 1, dayNum)

      // Verificar que la fecha se construyó correctamente (ej: 31/02 sería inválido)
      if (
        date.getDate() !== dayNum ||
        date.getMonth() !== monthNum - 1 ||
        date.getFullYear() !== yearNum
      ) {
        return {
          valid: false,
          error: 'Fecha inválida (verifica día, mes y año)'
        }
      }

      // Fecha no puede ser futura
      if (date > new Date()) {
        return {
          valid: false,
          error: 'Fecha de nacimiento no puede ser en el futuro'
        }
      }

      // Edad mínima: 0 años, máxima: 150 años
      const age = new Date().getFullYear() - date.getFullYear()
      if (age < 0 || age > 150) {
        return {
          valid: false,
          error: 'Fecha de nacimiento fuera de rango válido (0-150 años)'
        }
      }

      return { valid: true, normalized: trimmed }

    case 'origin_place':
    case 'destination_place': {
      // Min 2 chars
      if (trimmed.length < 2) {
        return {
          valid: false,
          error: 'Lugar debe tener al menos 2 caracteres'
        }
      }

      // Si ya es un código (numérico de 2-5 dígitos), asumirlo válido
      if (/^\d{2,5}$/.test(trimmed)) {
        return { valid: true, normalized: trimmed }
      }

      // Intentar convertir nombre a código
      // Prioridad: DIVIPOLA primero (ciudad colombiana), luego SIRE país
      let placeCode: string | null = null
      let placeName = trimmed

      // INTENTO 1: Buscar como ciudad colombiana (DIVIPOLA)
      placeCode = getDIVIPOLACityCode(trimmed)

      if (placeCode) {
        console.log('[validateField] Match found as Colombian city:', { input: trimmed, code: placeCode })
        return {
          valid: true,
          normalized: placeCode,
          metadata: { place_name: placeName, place_type: 'colombian_city' }
        }
      }

      // INTENTO 2: Buscar como país extranjero (SIRE)
      placeCode = getSIRECountryCode(trimmed)

      if (placeCode) {
        console.log('[validateField] Match found as foreign country:', { input: trimmed, code: placeCode })
        return {
          valid: true,
          normalized: placeCode,
          metadata: { place_name: placeName, place_type: 'foreign_country' }
        }
      }

      // NO ENCONTRADO en ningún catálogo
      return {
        valid: false,
        error: 'No encontré ese lugar. Intenta con: una ciudad colombiana (ej: "Bogotá", "Medellín") o un país (ej: "Estados Unidos", "Brasil")'
      }
    }

    case 'nationality_code': {
      // Aceptar tanto texto ("Colombia", "Estados Unidos") como códigos ("169", "249")

      // Caso 1: Input es código numérico (1-3 dígitos)
      if (/^\d{1,3}$/.test(trimmed)) {
        // Validar que el código exista en el catálogo SIRE
        const countryName = getSIRECountryName(trimmed)

        if (!countryName) {
          return {
            valid: false,
            error: 'Código de nacionalidad no encontrado en el catálogo SIRE'
          }
        }

        return {
          valid: true,
          normalized: trimmed,
          metadata: { nationality_text: countryName }
        }
      }

      // Caso 2: Input es texto (nombre de país)
      const extractedCode = getSIRECountryCode(trimmed)

      if (!extractedCode) {
        return {
          valid: false,
          error: 'No pude encontrar ese país. ¿Podrías verificar el nombre? (Ejemplo: "Colombia", "Estados Unidos")'
        }
      }

      return {
        valid: true,
        normalized: extractedCode,           // Código SIRE: "169"
        metadata: { nationality_text: trimmed } // Texto original: "colombia"
      }
    }

    case 'hotel_code':
      // Código hotel (4-6 dígitos)
      if (!/^\d{4,6}$/.test(trimmed)) {
        return {
          valid: false,
          error: 'Código de hotel debe tener 4-6 dígitos'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'city_code':
      // Código ciudad DIVIPOLA (5 dígitos)
      if (!/^\d{5}$/.test(trimmed)) {
        return {
          valid: false,
          error: 'Código de ciudad debe tener 5 dígitos (código DIVIPOLA)'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'document_type_code':
      // Código tipo documento (1-2 dígitos)
      // Valores válidos: 3=Pasaporte, 5=Cédula, 10=Mercosur, 46=Diplomático
      const validDocTypes = ['3', '5', '10', '46']
      if (!validDocTypes.includes(trimmed)) {
        return {
          valid: false,
          error: 'Tipo de documento inválido. Valores válidos: 3=Pasaporte, 5=Cédula, 10=Mercosur, 46=Diplomático'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'movement_type':
      // Tipo movimiento: E=Entrada, S=Salida
      if (trimmed !== 'E' && trimmed !== 'S') {
        return {
          valid: false,
          error: 'Tipo de movimiento inválido. Valores válidos: E=Entrada, S=Salida'
        }
      }
      return { valid: true, normalized: trimmed }

    case 'movement_date':
      // Mismo formato que birth_date (DD/MM/YYYY)
      return validateField('birth_date', value)

    default:
      // Campo no reconocido - pasar sin validación
      console.warn(`[progressive-disclosure] Campo desconocido: ${fieldName}`)
      return { valid: true, normalized: trimmed }
  }
}

// ============================================================================
// DATA COMPLETENESS HELPERS
// ============================================================================

/**
 * Verifica si todos los campos SIRE requeridos están completos
 *
 * Esta función verifica que todos los 13 campos obligatorios de SIRE
 * estén presentes y no vacíos.
 *
 * Campos requeridos (12 de 13 - second_surname es opcional):
 * 1. hotel_code
 * 2. city_code
 * 3. document_type_code
 * 4. identification_number
 * 5. nationality_code
 * 6. first_surname
 * 7. names
 * 8. movement_type
 * 9. movement_date
 * 10. origin_place
 * 11. destination_place
 * 12. birth_date
 * (13. second_surname - OPCIONAL)
 *
 * @param data - Datos SIRE capturados
 * @returns true si todos los campos requeridos están completos
 *
 * @example
 * // Datos incompletos
 * isDataComplete({ names: 'John', first_surname: 'Smith' });
 * // Returns: false (faltan muchos campos)
 *
 * @example
 * // Datos completos
 * isDataComplete({
 *   hotel_code: '7706',
 *   city_code: '88001',
 *   document_type_code: '3',
 *   identification_number: 'AB123456',
 *   nationality_code: '249',
 *   first_surname: 'SMITH',
 *   names: 'JOHN MICHAEL',
 *   movement_type: 'E',
 *   movement_date: '15/11/2025',
 *   origin_place: '249',
 *   destination_place: '249',
 *   birth_date: '15/05/1985'
 * });
 * // Returns: true (todos los campos requeridos completos)
 */
export function isDataComplete(
  data: Partial<SIREConversationalData>
): boolean {
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
    return value !== undefined && value !== null && value.trim() !== ''
  })
}

/**
 * Obtiene lista de campos SIRE que faltan por capturar
 *
 * Retorna array con nombres de campos requeridos que están vacíos o undefined.
 *
 * @param data - Datos SIRE capturados
 * @returns Array de nombres de campos faltantes
 *
 * @example
 * // Algunos campos capturados
 * getMissingFields({
 *   identification_number: 'AB123456',
 *   first_surname: 'SMITH',
 *   names: 'JOHN'
 * });
 * // Returns: [
 * //   'hotel_code',
 * //   'city_code',
 * //   'document_type_code',
 * //   'nationality_code',
 * //   'movement_type',
 * //   'movement_date',
 * //   'origin_place',
 * //   'destination_place',
 * //   'birth_date'
 * // ]
 *
 * @example
 * // Todos los campos completos
 * getMissingFields(completeData);
 * // Returns: [] (array vacío)
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
    return !value || value.trim() === ''
  })
}

/**
 * Cuenta cuántos campos del usuario quedan por capturar
 *
 * Esta función cuenta SOLO los campos que el usuario debe proporcionar
 * (excluye campos auto-deducibles).
 *
 * Campos del usuario (7 de 13):
 * 1. identification_number
 * 2. first_surname
 * 3. names
 * 4. nationality_code
 * 5. birth_date
 * 6. origin_place
 * 7. destination_place
 *
 * Campos auto-deducibles (NO cuentan):
 * - hotel_code (del tenant)
 * - city_code (del tenant)
 * - document_type_code (auto-detectado)
 * - movement_type (del check-in)
 * - movement_date (del check-in)
 * - second_surname (opcional)
 *
 * @param data - Datos SIRE capturados
 * @returns Número de campos del usuario que faltan (0-7)
 *
 * @example
 * // Sin datos
 * getRemainingUserFieldsCount({});
 * // Returns: 7 (todos los campos del usuario faltan)
 *
 * @example
 * // Solo documento capturado
 * getRemainingUserFieldsCount({ identification_number: 'AB123456' });
 * // Returns: 6 (faltan 6 campos del usuario)
 *
 * @example
 * // Todos los campos del usuario capturados
 * getRemainingUserFieldsCount({
 *   identification_number: 'AB123456',
 *   first_surname: 'SMITH',
 *   names: 'JOHN',
 *   nationality_code: '249',
 *   birth_date: '15/05/1985',
 *   origin_place: '249',
 *   destination_place: '249'
 * });
 * // Returns: 0 (todos los campos del usuario completos)
 */
export function getRemainingUserFieldsCount(
  data: Partial<SIREConversationalData>
): number {
  const userFields: (keyof SIREConversationalData)[] = [
    'identification_number',
    'first_surname',
    'names',
    'nationality_code',
    'birth_date',
    'origin_place',
    'destination_place'
  ]

  return userFields.filter(field => {
    const value = data[field]
    return !value || value.trim() === ''
  }).length
}

/**
 * Calcula el porcentaje de progreso de captura de datos
 *
 * Retorna porcentaje (0-100) basado en campos del usuario capturados.
 *
 * @param data - Datos SIRE capturados
 * @returns Porcentaje de progreso (0-100)
 *
 * @example
 * // Sin datos
 * getProgressPercentage({});
 * // Returns: 0 (0% completado)
 *
 * @example
 * // 3 de 7 campos capturados
 * getProgressPercentage({
 *   identification_number: 'AB123456',
 *   first_surname: 'SMITH',
 *   names: 'JOHN'
 * });
 * // Returns: 42.857... (3/7 = ~43%)
 *
 * @example
 * // Todos los campos completos
 * getProgressPercentage(completeData);
 * // Returns: 100 (100% completado)
 */
export function getProgressPercentage(
  data: Partial<SIREConversationalData>
): number {
  const totalUserFields = 7
  const remaining = getRemainingUserFieldsCount(data)
  const completed = totalUserFields - remaining

  return Math.round((completed / totalUserFields) * 100)
}
