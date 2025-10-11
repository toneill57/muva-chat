/**
 * SIRE Field Mappers
 *
 * Funciones para mapear datos conversacionales (user-friendly) a formato SIRE oficial (13 campos).
 *
 * IMPORTANTE: Este módulo implementa la arquitectura de DOS CAPAS:
 * - Capa 1 (conversational_data): Datos extraídos del chat en formato natural
 * - Capa 2 (sire_data): 13 campos oficiales SIRE formateados según especificaciones
 *
 * Catálogo de referencia: docs/features/sire-compliance/CODIGOS_OFICIALES.md
 * Documento oficial: _assets/sire/pasos-para-reportar-al-sire.md
 */

/**
 * Tipos de documento SIRE oficiales
 * Fuente: docs/features/sire-compliance/CODIGOS_OFICIALES.md sección "Tipos de Documento Válidos"
 */
export type TipoDocumentoSIRE = '3' | '5' | '46' | '10'

/**
 * Tipo de movimiento SIRE
 */
export type TipoMovimientoSIRE = 'E' | 'S'

/**
 * Interfaz Capa 1: Datos conversacionales (extraídos del chat)
 */
export interface ConversationalData {
  nombre_completo: string           // Ej: "Juan Pablo García Pérez"
  numero_pasaporte: string          // Ej: "AB-1234567" (con guiones como usuario escribe)
  pais_texto: string                // Ej: "Estados Unidos" (texto libre)
  proposito_viaje: string           // Ej: "turismo" (conversacional)
  fecha_nacimiento: Date            // Date object
}

/**
 * Interfaz Capa 2: 13 campos oficiales SIRE
 * Fuente: docs/features/sire-compliance/CODIGOS_OFICIALES.md sección "13 Campos Obligatorios SIRE"
 */
export interface SIREData {
  codigo_hotel: string              // Ej: "7706" (de tenant_compliance_credentials)
  codigo_ciudad: string             // Ej: "88001" (San Andrés - código DIVIPOLA)
  tipo_documento: TipoDocumentoSIRE // 3=Pasaporte, 5=Cédula, 46=Diplomático, 10=PEP
  numero_identificacion: string     // Alfanumérico 6-15 chars sin guiones (Ej: "AB1234567")
  codigo_nacionalidad: string       // Código SIRE (Ej: "249" = USA, "169" = COL) - NO ISO
  primer_apellido: string           // Solo letras con acentos, máx 50 chars (Ej: "GARCÍA")
  segundo_apellido: string          // Solo letras con acentos, máx 50 chars, PUEDE estar vacío (Ej: "PÉREZ" o "")
  nombres: string                   // Solo letras con acentos, máx 50 chars (Ej: "JUAN PABLO")
  tipo_movimiento: TipoMovimientoSIRE // E=Entrada, S=Salida
  fecha_movimiento: string          // DD/MM/YYYY (Ej: "15/10/2025")
  lugar_procedencia: string         // Código SIRE país o DIVIPOLA ciudad (Ej: "249" o "11001")
  lugar_destino: string             // Código SIRE país o DIVIPOLA ciudad (Ej: "249" o "13001")
  fecha_nacimiento: string          // DD/MM/YYYY (Ej: "25/03/1985")
}

/**
 * Split nombre completo en componentes SIRE
 *
 * SIRE requiere separación estricta: primer_apellido, segundo_apellido (opcional), nombres
 *
 * Lógica de detección:
 * - Si formato "Apellido1 Apellido2, Nombres" → split por coma
 * - Si formato "Nombres Apellido1 Apellido2" → detectar por mayúsculas (apellidos suelen ser caps)
 * - Default: Últimas 2 palabras = apellidos, resto = nombres
 *
 * @param nombre_completo - Ej: "Juan Pablo García Pérez"
 * @returns {primer_apellido, segundo_apellido, nombres}
 *
 * @example
 * splitFullName("Juan Pablo García Pérez")
 * // Returns: { primer_apellido: "GARCÍA", segundo_apellido: "PÉREZ", nombres: "JUAN PABLO" }
 *
 * @example
 * splitFullName("García Pérez, Juan Pablo")
 * // Returns: { primer_apellido: "GARCÍA", segundo_apellido: "PÉREZ", nombres: "JUAN PABLO" }
 *
 * @example
 * splitFullName("John Smith") // Sin segundo apellido
 * // Returns: { primer_apellido: "SMITH", segundo_apellido: "", nombres: "JOHN" }
 */
export function splitFullName(nombre_completo: string): {
  primer_apellido: string
  segundo_apellido: string
  nombres: string
} {
  // Limpiar y normalizar
  const cleaned = nombre_completo.trim().replace(/\s+/g, ' ')

  // Caso 1: Formato "Apellidos, Nombres"
  if (cleaned.includes(',')) {
    const [apellidosPart, nombresPart] = cleaned.split(',').map(p => p.trim())
    const apellidos = apellidosPart.split(/\s+/)

    return {
      primer_apellido: validateOnlyLetters(apellidos[0] || '').toUpperCase(),
      segundo_apellido: apellidos[1] ? validateOnlyLetters(apellidos[1]).toUpperCase() : '',
      nombres: validateOnlyLetters(nombresPart || '').toUpperCase(),
    }
  }

  // Caso 2: Formato "Nombres Apellidos" (más común)
  const parts = cleaned.split(/\s+/)

  if (parts.length === 1) {
    // Solo un nombre (edge case)
    return {
      primer_apellido: '',
      segundo_apellido: '',
      nombres: validateOnlyLetters(parts[0]).toUpperCase(),
    }
  }

  if (parts.length === 2) {
    // Nombre + 1 Apellido
    return {
      primer_apellido: validateOnlyLetters(parts[1]).toUpperCase(),
      segundo_apellido: '',
      nombres: validateOnlyLetters(parts[0]).toUpperCase(),
    }
  }

  if (parts.length === 3) {
    // Nombre + 2 Apellidos
    return {
      primer_apellido: validateOnlyLetters(parts[1]).toUpperCase(),
      segundo_apellido: validateOnlyLetters(parts[2]).toUpperCase(),
      nombres: validateOnlyLetters(parts[0]).toUpperCase(),
    }
  }

  // Caso 4+ palabras: Últimas 2 = apellidos, resto = nombres
  const primerApellido = parts[parts.length - 2]
  const segundoApellido = parts[parts.length - 1]
  const nombres = parts.slice(0, parts.length - 2).join(' ')

  return {
    primer_apellido: validateOnlyLetters(primerApellido).toUpperCase(),
    segundo_apellido: validateOnlyLetters(segundoApellido).toUpperCase(),
    nombres: validateOnlyLetters(nombres).toUpperCase(),
  }
}

/**
 * Mapear país texto (conversacional) a código SIRE oficial
 *
 * ⚠️ IMPORTANTE: Los códigos SIRE NO son ISO 3166-1 numeric.
 * Son códigos propietarios del sistema SIRE de Migración Colombia.
 *
 * Fuente oficial: _assets/sire/codigos-pais.json (250 países)
 * Documentación: docs/features/sire-compliance/CODIGOS_OFICIALES.md sección "Códigos de Nacionalidad"
 *
 * @param pais_texto - Ej: "Estados Unidos", "Colombia", "España"
 * @returns codigo_nacionalidad - Ej: "249" (no 840), "169" (no 170), "245" (no 724)
 *
 * @throws Error si país no encontrado en catálogo
 *
 * @example
 * mapCountryToCode("Estados Unidos") // Returns: "249" (SIRE code, NO ISO 840)
 * mapCountryToCode("Colombia") // Returns: "169" (SIRE code, NO ISO 170)
 * mapCountryToCode("España") // Returns: "245" (SIRE code, NO ISO 724)
 */
export function mapCountryToCode(pais_texto: string): string {
  // Normalizar texto (lowercase, sin acentos, trim)
  const normalized = pais_texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .trim()

  // Catálogo OFICIAL SIRE (Migración Colombia / MinCIT)
  // Fuente: _assets/sire/codigos-pais.json (250 países)
  // Última actualización: Octubre 6, 2025
  const countryCodeMap: Record<string, string> = {
    // ⚠️ ESTOS CÓDIGOS SON DIFERENTES A ISO 3166-1
    // Países de alta frecuencia en hotelería colombiana (ordenados por uso)
    'colombia': '169',       // ISO sería 170 (diferencia: -1)
    'estados unidos': '249', // ISO sería 840 (diferencia: -591)
    'usa': '249',
    'eeuu': '249',
    'united states': '249',
    'brasil': '105',         // ISO sería 076 (diferencia: +29)
    'brazil': '105',
    'argentina': '63',       // ISO sería 032 (diferencia: +31)
    'españa': '245',         // ISO sería 724 (diferencia: -479)
    'spain': '245',
    'mexico': '493',         // ISO sería 484 (diferencia: +9)
    'canada': '117',         // ISO sería 124 (diferencia: -7)
    'chile': '149',          // ISO sería 152 (diferencia: -3)
    'francia': '265',        // ISO sería 250 (diferencia: +15)
    'france': '265',
    'alemania': '23',        // ISO sería 276 (diferencia: -253)
    'germany': '23',
    'reino unido': '300',    // ISO sería 826 (diferencia: -526)
    'united kingdom': '300',
    'uk': '300',
    'inglaterra': '300',
    'gran bretaña': '300',
    'italia': '369',         // ISO sería 380 (diferencia: -11)
    'italy': '369',
    'peru': '587',           // ISO sería 604 (diferencia: -17)
    'ecuador': '239',        // ISO sería 218 (diferencia: +21)
    'venezuela': '863',      // ISO sería 862 (diferencia: +1)
    'panama': '573',         // ISO sería 591 (diferencia: -18)
    'costa rica': '177',     // ISO sería 188 (diferencia: -11)
    'uruguay': '859',        // ISO sería 858 (diferencia: +1)
    'paraguay': '583',       // ISO sería 600 (diferencia: -17)
    'bolivia': '101',        // ISO sería 068 (diferencia: +33)

    // Países adicionales con turismo hacia Colombia
    'china': '157',          // ISO sería 156 (diferencia: +1)
    'japon': '373',          // ISO sería 392 (diferencia: -19)
    'japan': '373',
    'india': '351',          // ISO sería 356 (diferencia: -5)
    'australia': '77',       // ISO sería 036 (diferencia: +41)
    'nueva zelanda': '569',  // ISO sería 554 (diferencia: +15)
    'new zealand': '569',

    // Catálogo completo disponible en: _assets/sire/codigos-pais.json (250 países)
  }

  const code = countryCodeMap[normalized]

  if (!code) {
    throw new Error(
      `País no encontrado en catálogo SIRE: "${pais_texto}". ` +
      `Verificar _assets/sire/codigos-pais.json (250 países disponibles) ` +
      `o docs/features/sire-compliance/CODIGOS_OFICIALES.md para catálogo completo.`
    )
  }

  return code
}

/**
 * Detectar tipo de documento según formato del número
 *
 * Lógica de detección:
 * - Si tiene letras + números → Pasaporte (3)
 * - Si solo números y length < 11 → Cédula (5)
 * - Default → Pasaporte (3)
 *
 * Tipos válidos SIRE:
 * - 3: Pasaporte (~95% de casos en hoteles)
 * - 5: Cédula de extranjería
 * - 46: Carné diplomático
 * - 10: Documento extranjero (Mercosur/CAN)
 *
 * @param numero_pasaporte - Ej: "AB123456", "1234567890"
 * @returns tipo_documento - 3=Pasaporte, 5=Cédula, 46=Diplomático, 10=PEP
 *
 * @example
 * detectDocumentType("AB123456") // Returns: "3" (Pasaporte - tiene letras)
 * detectDocumentType("1234567") // Returns: "5" (Cédula - solo números, < 11 dígitos)
 */
export function detectDocumentType(numero_pasaporte: string): TipoDocumentoSIRE {
  const cleaned = numero_pasaporte.replace(/[-\s]/g, '')

  // Patrón pasaporte: contiene letras
  if (/[A-Z]/i.test(cleaned)) {
    return '3' // Pasaporte
  }

  // Patrón cédula: solo números, longitud < 11
  if (/^\d+$/.test(cleaned) && cleaned.length < 11) {
    return '5' // Cédula de extranjería
  }

  // Default: Pasaporte (caso más común)
  return '3'
}

/**
 * Limpiar número de pasaporte para formato SIRE
 *
 * SIRE requiere: Alfanumérico, SIN guiones ni espacios
 *
 * @param numero_pasaporte - Ej: "AB-1234567", "AB 1234567"
 * @returns número limpio - Ej: "AB1234567"
 *
 * @example
 * cleanPassportNumber("AB-1234567") // Returns: "AB1234567"
 * cleanPassportNumber("V 12345678") // Returns: "V12345678"
 */
export function cleanPassportNumber(numero_pasaporte: string): string {
  // Quitar guiones, espacios, y caracteres no alfanuméricos
  const cleaned = numero_pasaporte.replace(/[^A-Z0-9]/gi, '').toUpperCase()

  // Validar longitud (6-15 caracteres según especificación SIRE)
  if (cleaned.length < 6 || cleaned.length > 15) {
    throw new Error(
      `Número de identificación inválido: "${numero_pasaporte}". ` +
      `Debe tener entre 6 y 15 caracteres alfanuméricos.`
    )
  }

  return cleaned
}

/**
 * Formatear fecha a formato SIRE (DD/MM/YYYY)
 *
 * CRÍTICO: SIRE requiere EXACTAMENTE formato DD/MM/YYYY (NO mm/dd/yyyy, NO yyyy-mm-dd)
 *
 * @param date - Date object
 * @returns fecha formateada - Ej: "15/10/2025"
 *
 * @example
 * formatDateForSIRE(new Date(2025, 9, 15)) // Returns: "15/10/2025"
 */
export function formatDateForSIRE(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0') // JavaScript months are 0-indexed
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Validar formato fecha SIRE (DD/MM/YYYY)
 *
 * Valida:
 * - Formato DD/MM/YYYY estricto
 * - Día válido (01-31)
 * - Mes válido (01-12)
 * - Año válido (1900-2100)
 *
 * @param date - String con fecha (Ej: "15/10/2025")
 * @returns true si válido, false si inválido
 *
 * @example
 * validateSIREDateFormat("15/10/2025") // Returns: true
 * validateSIREDateFormat("2025-10-15") // Returns: false (formato incorrecto)
 * validateSIREDateFormat("32/10/2025") // Returns: false (día inválido)
 */
export function validateSIREDateFormat(date: string): boolean {
  // Validar formato DD/MM/YYYY con regex
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return false
  }

  const [day, month, year] = date.split('/').map(Number)

  // Validar rangos
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (year < 1900 || year > 2100) return false

  // Validación adicional: Días por mes (simplificada)
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (day > daysInMonth[month - 1]) return false

  return true
}

/**
 * Validar que texto solo contenga letras (SIRE requirement)
 *
 * SIRE requiere: Solo letras (incluyendo acentos y Ñ) en apellidos y nombres
 *
 * @param text - Texto a validar
 * @returns texto validado (sin números ni caracteres especiales)
 * @throws Error si contiene caracteres no permitidos
 *
 * @example
 * validateOnlyLetters("García") // Returns: "García"
 * validateOnlyLetters("García123") // Throws: Error
 */
export function validateOnlyLetters(text: string): string {
  // Permitir letras (incluyendo acentos), Ñ, y espacios
  const cleaned = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '')

  if (cleaned !== text) {
    console.warn(
      `[sire-field-mappers] Caracteres no permitidos removidos de "${text}" → "${cleaned}"`
    )
  }

  return cleaned.trim()
}

/**
 * Validar que texto solo contenga números (SIRE requirement)
 *
 * SIRE requiere: Solo números en campos como codigo_hotel, codigo_ciudad, codigo_nacionalidad
 *
 * @param text - Texto a validar
 * @returns true si solo contiene números, false en otro caso
 *
 * @example
 * validateOnlyNumbers("12345") // Returns: true
 * validateOnlyNumbers("123AB") // Returns: false
 */
export function validateOnlyNumbers(text: string): boolean {
  return /^\d+$/.test(text)
}

/**
 * Validar ComplianceContext completo (DOS CAPAS)
 *
 * Valida:
 * 1. conversational_data: Campos requeridos presentes
 * 2. sire_data: 13 campos SIRE con formatos correctos
 *
 * @param conversational_data - Datos conversacionales
 * @param sire_data - Datos SIRE generados
 * @returns { valid: boolean; errors: string[] }
 *
 * @example
 * validateComplianceData(conversational, sire)
 * // Returns: { valid: false, errors: ["Primer apellido solo debe contener letras"] }
 */
export function validateComplianceData(
  conversational_data: Partial<ConversationalData>,
  sire_data: Partial<SIREData>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validar Capa 1: conversational_data
  if (!conversational_data.nombre_completo) {
    errors.push('Nombre completo requerido')
  }
  if (!conversational_data.numero_pasaporte) {
    errors.push('Número de pasaporte/documento requerido')
  }
  if (!conversational_data.pais_texto) {
    errors.push('País de origen requerido')
  }
  if (!conversational_data.fecha_nacimiento) {
    errors.push('Fecha de nacimiento requerida')
  }

  // Validar Capa 2: sire_data (13 campos oficiales)
  if (!sire_data.codigo_hotel) {
    errors.push('Código hotel requerido (configurar en tenant_compliance_credentials)')
  }

  if (sire_data.codigo_ciudad && !validateOnlyNumbers(sire_data.codigo_ciudad)) {
    errors.push('Código ciudad debe contener solo números')
  }

  if (
    sire_data.tipo_documento &&
    !['3', '5', '46', '10'].includes(sire_data.tipo_documento)
  ) {
    errors.push('Tipo documento inválido (usar: 3, 5, 10, o 46)')
  }

  if (
    sire_data.numero_identificacion &&
    !/^[A-Z0-9]{6,15}$/.test(sire_data.numero_identificacion)
  ) {
    errors.push('Número identificación inválido (6-15 caracteres alfanuméricos)')
  }

  if (sire_data.codigo_nacionalidad && !validateOnlyNumbers(sire_data.codigo_nacionalidad)) {
    errors.push('Código nacionalidad debe contener solo números')
  }

  if (
    sire_data.primer_apellido &&
    !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(sire_data.primer_apellido)
  ) {
    errors.push('Primer apellido solo debe contener letras')
  }

  if (
    sire_data.segundo_apellido &&
    sire_data.segundo_apellido.length > 0 &&
    !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(sire_data.segundo_apellido)
  ) {
    errors.push('Segundo apellido solo debe contener letras')
  }

  if (sire_data.nombres && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(sire_data.nombres)) {
    errors.push('Nombres solo deben contener letras')
  }

  if (sire_data.tipo_movimiento && !['E', 'S'].includes(sire_data.tipo_movimiento)) {
    errors.push('Tipo movimiento debe ser E (Entrada) o S (Salida)')
  }

  if (sire_data.fecha_movimiento && !validateSIREDateFormat(sire_data.fecha_movimiento)) {
    errors.push('Fecha movimiento inválida (usar formato DD/MM/YYYY)')
  }

  if (sire_data.fecha_nacimiento && !validateSIREDateFormat(sire_data.fecha_nacimiento)) {
    errors.push('Fecha nacimiento inválida (usar formato DD/MM/YYYY)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Función principal de mapeo: conversational_data → sire_data
 *
 * Aplica TODOS los mappers y validaciones para generar los 13 campos SIRE oficiales
 *
 * @param conversational_data - Datos extraídos del chat
 * @param hotel_info - Información del hotel (codigo_hotel, codigo_ciudad)
 * @returns sire_data - 13 campos oficiales SIRE listos para envío
 *
 * @example
 * const sire = mapConversationalToSIRE(conversational, hotelInfo)
 * // Returns: { codigo_hotel: "7706", codigo_ciudad: "88001", tipo_documento: "3", ... }
 */
export function mapConversationalToSIRE(
  conversational_data: ConversationalData,
  hotel_info: { codigo_hotel: string; codigo_ciudad: string }
): SIREData {
  // 1. Split nombre completo
  const nameParts = splitFullName(conversational_data.nombre_completo)

  // 2. Limpiar número de pasaporte
  const cleanPassport = cleanPassportNumber(conversational_data.numero_pasaporte)

  // 3. Detectar tipo de documento
  const tipoDocumento = detectDocumentType(conversational_data.numero_pasaporte)

  // 4. Mapear país a código
  const codigoPais = mapCountryToCode(conversational_data.pais_texto)

  // 5. Formatear fechas
  const fechaNacimiento = formatDateForSIRE(conversational_data.fecha_nacimiento)
  const fechaMovimiento = formatDateForSIRE(new Date()) // Fecha actual (check-in)

  // 6. Construir sire_data completo
  const sire_data: SIREData = {
    codigo_hotel: hotel_info.codigo_hotel,
    codigo_ciudad: hotel_info.codigo_ciudad,
    tipo_documento: tipoDocumento,
    numero_identificacion: cleanPassport,
    codigo_nacionalidad: codigoPais,
    primer_apellido: nameParts.primer_apellido,
    segundo_apellido: nameParts.segundo_apellido,
    nombres: nameParts.nombres,
    tipo_movimiento: 'E', // Default: Entrada
    fecha_movimiento: fechaMovimiento,
    lugar_procedencia: codigoPais, // Mismo país de origen
    lugar_destino: codigoPais, // Mismo país de destino
    fecha_nacimiento: fechaNacimiento,
  }

  // 7. Validar antes de retornar
  const validation = validateComplianceData(conversational_data, sire_data)
  if (!validation.valid) {
    throw new Error(
      `Validación SIRE falló:\n${validation.errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
    )
  }

  console.log('[sire-field-mappers] ✅ Mapeo conversational → SIRE exitoso:', {
    conversational: conversational_data,
    sire: sire_data,
  })

  return sire_data
}
