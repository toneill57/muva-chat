/**
 * Compliance Chat Engine
 *
 * Conversational compliance flow con arquitectura de dos capas:
 * - Capa 1 (Conversational): Datos amigables extraídos en conversación
 * - Capa 2 (SIRE): 13 campos oficiales auto-generados
 *
 * Basado en especificación oficial SIRE:
 * - Fuente: docs/sire/CODIGOS_OFICIALES.md
 * - 13 campos obligatorios
 * - Validaciones estrictas
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// INTERFACES - ARQUITECTURA DOS CAPAS
// ============================================================================

/**
 * Capa 1: Datos Conversacionales (User-Friendly)
 *
 * Campos simples que el usuario entiende y puede editar.
 * Extraídos durante conversación con Claude.
 */
export interface ConversationalData {
  nombre_completo: string;          // "Juan Pérez García"
  numero_pasaporte: string;         // "AB123456" (con o sin guiones)
  pais_texto: string;               // "Estados Unidos" (nombre en español)
  fecha_nacimiento: string;         // "15/05/1990" (dd/mm/yyyy)
  proposito_viaje?: string;         // "Turismo y vacaciones" (opcional, contexto adicional)
}

/**
 * Capa 2: Datos SIRE Oficiales (13 Campos Obligatorios)
 *
 * Generados automáticamente desde ConversationalData.
 * Formato estricto según especificación SIRE.
 */
export interface SIREData {
  // Hotel/Location (auto desde tenant config)
  codigo_hotel: string;             // Campo 1: Código hotel SCH
  codigo_ciudad: string;            // Campo 2: Código ciudad DIVIPOLA

  // Documento (auto desde conversational)
  tipo_documento: string;           // Campo 3: "3" = Pasaporte
  numero_identificacion: string;    // Campo 4: Pasaporte sin guiones

  // Nacionalidad
  codigo_nacionalidad: string;      // Campo 5: ISO 3166-1 numeric

  // Identidad (auto desde nombre_completo)
  primer_apellido: string;          // Campo 6: Primer apellido
  segundo_apellido: string;         // Campo 7: Segundo apellido (puede estar vacío)
  nombres: string;                  // Campo 8: Nombre(s)

  // Movimiento
  tipo_movimiento: string;          // Campo 9: "E" = Entrada, "S" = Salida
  fecha_movimiento: string;         // Campo 10: Check-in/out (dd/mm/yyyy)

  // Lugares
  lugar_procedencia: string;        // Campo 11: Código país/ciudad origen
  lugar_destino: string;            // Campo 12: Código país/ciudad destino

  // Fecha nacimiento
  fecha_nacimiento: string;         // Campo 13: Birthdate (dd/mm/yyyy)
}

/**
 * Configuración del tenant para campos auto-poblados
 */
export interface TenantComplianceConfig {
  codigo_hotel: string;             // Código asignado por SCH
  codigo_ciudad: string;            // Código DIVIPOLA de la ciudad
  nombre_hotel: string;             // Nombre del hotel
}

/**
 * Datos de reserva para campos auto-poblados
 */
export interface ReservationData {
  check_in_date: string;            // ISO format (yyyy-mm-dd)
  check_out_date?: string;          // ISO format (opcional)
}

/**
 * Estado de completeness de datos conversacionales
 */
export interface ComplianceState {
  entities: ConversationalData;
  completeness: number;             // 0-100%
  missingFields: string[];
  isReadyToSubmit: boolean;
  validationErrors: ValidationError[];
}

/**
 * Error de validación
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// COMPLIANCE CHAT ENGINE CLASS
// ============================================================================

export class ComplianceChatEngine {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  // ==========================================================================
  // ENTITY EXTRACTION (Capa 1: Conversational)
  // ==========================================================================

  /**
   * Extract conversational entities from chat messages
   *
   * Uses Claude to extract structured data from natural conversation.
   *
   * @param messages - Chat conversation history
   * @returns Extracted conversational entities
   */
  async extractEntities(
    messages: { role: string; content: string }[]
  ): Promise<ConversationalData> {
    console.log('[compliance-engine] Starting entity extraction...');

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Extract guest information from this conversation for Colombian SIRE compliance.

Conversation history:
${JSON.stringify(messages, null, 2)}

Extract the following fields (ONLY if explicitly mentioned):

1. nombre_completo: Full name of the guest (first name + last names)
   - Example: "John Michael Smith Johnson"

2. numero_pasaporte: Passport number (format: 2 letters + 6-9 digits)
   - Example: "US123456789" or "AB-123456"
   - Clean any hyphens/spaces later

3. pais_texto: Country of origin (in Spanish)
   - Example: "Estados Unidos", "Colombia", "España"
   - Convert from English if needed: "United States" → "Estados Unidos"

4. fecha_nacimiento: Birthdate (format: DD/MM/YYYY)
   - Example: "15/05/1990"
   - Parse from various formats if needed

5. proposito_viaje: Travel purpose (optional, free text)
   - Example: "Turismo y vacaciones"

Return ONLY valid JSON with extracted fields. If a field is NOT found, omit it.
Do NOT make up or infer data - only extract what is explicitly stated.

Example output:
{
  "nombre_completo": "John Michael Smith",
  "numero_pasaporte": "US12345678",
  "pais_texto": "Estados Unidos",
  "fecha_nacimiento": "25/03/1985"
}`
          }
        ]
      });

      // Parse Claude response
      const contentBlock = response.content[0];
      if (contentBlock.type !== 'text') {
        throw new Error('Expected text response from Claude');
      }

      const extracted = JSON.parse(contentBlock.text);

      console.log('[compliance-engine] Extracted entities:', {
        fields: Object.keys(extracted),
        preview: {
          nombre: extracted.nombre_completo?.substring(0, 20),
          pasaporte: extracted.numero_pasaporte,
          pais: extracted.pais_texto,
        }
      });

      // Validate extracted entities
      return this.validateConversationalData(extracted);

    } catch (error) {
      console.error('[compliance-engine] Entity extraction error:', error);
      throw new Error('Failed to extract compliance entities from conversation');
    }
  }

  /**
   * Validate conversational data fields
   */
  private validateConversationalData(data: Partial<ConversationalData>): ConversationalData {
    const validated: Partial<ConversationalData> = {};

    // Validate nombre_completo (letters, spaces, hyphens, apostrophes)
    if (data.nombre_completo) {
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
      const trimmed = data.nombre_completo.trim();

      if (nameRegex.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 100) {
        validated.nombre_completo = trimmed;
      } else {
        console.warn('[compliance-engine] Invalid nombre_completo:', data.nombre_completo);
      }
    }

    // Validate numero_pasaporte (2 letters + 6-9 digits, allow hyphens/spaces)
    if (data.numero_pasaporte) {
      // Remove hyphens/spaces first
      const cleaned = data.numero_pasaporte.toUpperCase().replace(/[-\s]/g, '');
      const passportRegex = /^[A-Z]{2}[0-9]{6,9}$/;

      if (passportRegex.test(cleaned)) {
        validated.numero_pasaporte = cleaned;
      } else {
        console.warn('[compliance-engine] Invalid numero_pasaporte:', data.numero_pasaporte);
      }
    }

    // Validate pais_texto (must be in official list)
    if (data.pais_texto) {
      // TODO: Check against SIRE_COUNTRY_CODES when available
      validated.pais_texto = data.pais_texto.trim();
    }

    // Validate fecha_nacimiento (DD/MM/YYYY, must be 18+)
    if (data.fecha_nacimiento) {
      const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = data.fecha_nacimiento.match(dateRegex);

      if (match) {
        const [, day, month, year] = match;
        const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const age = this.calculateAge(birthDate);

        if (age >= 18 && age < 120) {
          validated.fecha_nacimiento = data.fecha_nacimiento;
        } else {
          console.warn('[compliance-engine] Invalid age:', { age, birthDate });
        }
      } else {
        console.warn('[compliance-engine] Invalid fecha_nacimiento format:', data.fecha_nacimiento);
      }
    }

    // Validate proposito_viaje (optional, free text, max 200 chars)
    if (data.proposito_viaje) {
      validated.proposito_viaje = data.proposito_viaje.substring(0, 200);
    }

    return validated as ConversationalData;
  }

  // ==========================================================================
  // COMPLETENESS CALCULATION
  // ==========================================================================

  /**
   * Calculate completeness percentage of conversational data
   *
   * Required fields: nombre_completo, numero_pasaporte, pais_texto, fecha_nacimiento
   */
  calculateCompleteness(entities: Partial<ConversationalData>): ComplianceState {
    const requiredFields: (keyof ConversationalData)[] = [
      'nombre_completo',
      'numero_pasaporte',
      'pais_texto',
      'fecha_nacimiento'
    ];

    const presentFields = requiredFields.filter(field => entities[field]);
    const missingFields = requiredFields.filter(field => !entities[field]);

    const completeness = (presentFields.length / requiredFields.length) * 100;

    // Validation errors
    const validationErrors: ValidationError[] = [];

    // Check each field
    missingFields.forEach(field => {
      validationErrors.push({
        field,
        message: `Campo requerido: ${this.getFieldLabel(field)}`,
        severity: 'error'
      });
    });

    console.log('[compliance-engine] Completeness:', {
      percentage: completeness,
      present: presentFields,
      missing: missingFields,
    });

    return {
      entities: entities as ConversationalData,
      completeness,
      missingFields,
      isReadyToSubmit: completeness === 100,
      validationErrors
    };
  }

  /**
   * Get user-friendly field label
   */
  private getFieldLabel(field: keyof ConversationalData): string {
    const labels: Record<keyof ConversationalData, string> = {
      nombre_completo: 'Nombre completo',
      numero_pasaporte: 'Número de pasaporte',
      pais_texto: 'País de origen',
      fecha_nacimiento: 'Fecha de nacimiento',
      proposito_viaje: 'Propósito del viaje'
    };

    return labels[field];
  }

  // ==========================================================================
  // MAPEO CONVERSATIONAL → SIRE (Capa 2)
  // ==========================================================================

  /**
   * Map conversational data to SIRE official format (13 campos)
   *
   * @param conversational - User-friendly conversational data
   * @param tenantConfig - Tenant SIRE configuration
   * @param reservationData - Reservation data (for check-in date)
   * @returns SIRE official 13 fields
   */
  async mapToSIRE(
    conversational: ConversationalData,
    tenantConfig: TenantComplianceConfig,
    reservationData?: ReservationData
  ): Promise<SIREData> {
    console.log('[compliance-engine] Mapping conversational → SIRE...');

    // Split nombre_completo into apellidos + nombres
    const nameParts = this.splitFullName(conversational.nombre_completo);

    // Map pais_texto to codigo_pais (ISO 3166-1 numeric)
    const codigoPais = this.mapCountryToCode(conversational.pais_texto);

    // Format check-in date
    const fechaMovimiento = reservationData?.check_in_date
      ? this.formatDateForSIRE(reservationData.check_in_date)
      : this.formatDateForSIRE(new Date().toISOString());

    const sireData: SIREData = {
      // Hotel/Location (from tenant config)
      codigo_hotel: tenantConfig.codigo_hotel,
      codigo_ciudad: tenantConfig.codigo_ciudad,

      // Documento (fixed: Pasaporte = 3)
      tipo_documento: '3', // Pasaporte (SIRE code)
      numero_identificacion: conversational.numero_pasaporte,

      // Nacionalidad
      codigo_nacionalidad: codigoPais,

      // Identidad (from nombre_completo)
      primer_apellido: nameParts.primerApellido,
      segundo_apellido: nameParts.segundoApellido,
      nombres: nameParts.nombres,

      // Movimiento
      tipo_movimiento: 'E', // Entrada (fixed)
      fecha_movimiento: fechaMovimiento,

      // Lugares (default: same as nationality for international guests)
      lugar_procedencia: codigoPais,
      lugar_destino: codigoPais,

      // Fecha nacimiento
      fecha_nacimiento: conversational.fecha_nacimiento
    };

    console.log('[compliance-engine] SIRE mapping complete:', {
      hotel: sireData.codigo_hotel,
      ciudad: sireData.codigo_ciudad,
      tipo_doc: sireData.tipo_documento,
      nacionalidad: sireData.codigo_nacionalidad,
      nombre: `${sireData.nombres} ${sireData.primer_apellido}`,
    });

    return sireData;
  }

  /**
   * Split full name into SIRE components
   *
   * Logic:
   * - If 2 parts: [nombre, apellido1]
   * - If 3 parts: [nombre, apellido1, apellido2]
   * - If 4+ parts: [nombre1 nombre2..., apellido1, apellido2]
   */
  private splitFullName(fullName: string): {
    nombres: string;
    primerApellido: string;
    segundoApellido: string;
  } {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      // Only one word - treat as nombre
      return {
        nombres: parts[0].toUpperCase(),
        primerApellido: '',
        segundoApellido: ''
      };
    } else if (parts.length === 2) {
      // [nombre, apellido]
      return {
        nombres: parts[0].toUpperCase(),
        primerApellido: parts[1].toUpperCase(),
        segundoApellido: ''
      };
    } else if (parts.length === 3) {
      // [nombre, apellido1, apellido2]
      return {
        nombres: parts[0].toUpperCase(),
        primerApellido: parts[1].toUpperCase(),
        segundoApellido: parts[2].toUpperCase()
      };
    } else {
      // 4+ parts: take last 2 as apellidos, rest as nombres
      return {
        nombres: parts.slice(0, -2).join(' ').toUpperCase(),
        primerApellido: parts[parts.length - 2].toUpperCase(),
        segundoApellido: parts[parts.length - 1].toUpperCase()
      };
    }
  }

  /**
   * Map country name (Spanish) to ISO 3166-1 numeric code
   *
   * TODO: Import from sire-country-mapping.ts when available
   */
  private mapCountryToCode(countryText: string): string {
    // Provisional mapping (top 20 countries)
    const countryMap: Record<string, string> = {
      'Estados Unidos': '840',
      'Colombia': '170',
      'España': '724',
      'México': '484',
      'Argentina': '032',
      'Brasil': '076',
      'Chile': '152',
      'Perú': '604',
      'Ecuador': '218',
      'Venezuela': '862',
      'Reino Unido': '826',
      'Francia': '250',
      'Alemania': '276',
      'Italia': '380',
      'Canadá': '124',
      'China': '156',
      'Japón': '392',
      'Corea del Sur': '410',
      'Australia': '036',
      'Nueva Zelanda': '554'
    };

    const code = countryMap[countryText];

    if (!code) {
      console.warn('[compliance-engine] Unknown country:', countryText);
      return '999'; // Unknown/Other
    }

    return code;
  }

  /**
   * Format ISO date to SIRE format (dd/mm/yyyy)
   */
  private formatDateForSIRE(isoDate: string): string {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  /**
   * Calculate age from birth date
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

// ============================================================================
// HELPER FUNCTIONS (Export for standalone use)
// ============================================================================

/**
 * Validate SIRE data before submission
 *
 * Ensures all 13 fields meet SIRE specifications.
 */
export function validateSIREData(sireData: SIREData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Campo 1: codigo_hotel (4-6 digits)
  if (!/^[0-9]{4,6}$/.test(sireData.codigo_hotel)) {
    errors.push({
      field: 'codigo_hotel',
      message: 'Código de hotel debe tener 4-6 dígitos',
      severity: 'error'
    });
  }

  // Campo 2: codigo_ciudad (5-6 digits)
  if (!/^[0-9]{5,6}$/.test(sireData.codigo_ciudad)) {
    errors.push({
      field: 'codigo_ciudad',
      message: 'Código de ciudad debe tener 5-6 dígitos',
      severity: 'error'
    });
  }

  // Campo 3: tipo_documento (must be 3, 5, 10, or 46)
  if (!['3', '5', '10', '46'].includes(sireData.tipo_documento)) {
    errors.push({
      field: 'tipo_documento',
      message: 'Tipo de documento inválido. Usar: 3, 5, 10, o 46',
      severity: 'error'
    });
  }

  // Campo 4: numero_identificacion (6-15 alphanumeric, uppercase)
  if (!/^[A-Z0-9]{6,15}$/.test(sireData.numero_identificacion)) {
    errors.push({
      field: 'numero_identificacion',
      message: 'Número de identificación debe tener 6-15 caracteres alfanuméricos',
      severity: 'error'
    });
  }

  // Campo 5: codigo_nacionalidad (1-3 digits)
  if (!/^[0-9]{1,3}$/.test(sireData.codigo_nacionalidad)) {
    errors.push({
      field: 'codigo_nacionalidad',
      message: 'Código de nacionalidad debe tener 1-3 dígitos',
      severity: 'error'
    });
  }

  // Campo 6: primer_apellido (1-50 letters)
  if (!/^[A-ZÁÉÍÓÚÑ\s]{1,50}$/.test(sireData.primer_apellido)) {
    errors.push({
      field: 'primer_apellido',
      message: 'Primer apellido debe contener solo letras (1-50 caracteres)',
      severity: 'error'
    });
  }

  // Campo 7: segundo_apellido (0-50 letters, can be empty)
  if (!/^[A-ZÁÉÍÓÚÑ\s]{0,50}$/.test(sireData.segundo_apellido)) {
    errors.push({
      field: 'segundo_apellido',
      message: 'Segundo apellido debe contener solo letras (0-50 caracteres)',
      severity: 'error'
    });
  }

  // Campo 8: nombres (1-50 letters)
  if (!/^[A-ZÁÉÍÓÚÑ\s]{1,50}$/.test(sireData.nombres)) {
    errors.push({
      field: 'nombres',
      message: 'Nombres debe contener solo letras (1-50 caracteres)',
      severity: 'error'
    });
  }

  // Campo 9: tipo_movimiento (must be E or S)
  if (!/^[ES]$/.test(sireData.tipo_movimiento)) {
    errors.push({
      field: 'tipo_movimiento',
      message: 'Tipo de movimiento debe ser E (Entrada) o S (Salida)',
      severity: 'error'
    });
  }

  // Campo 10: fecha_movimiento (dd/mm/yyyy)
  if (!/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/.test(sireData.fecha_movimiento)) {
    errors.push({
      field: 'fecha_movimiento',
      message: 'Fecha de movimiento debe tener formato dd/mm/yyyy',
      severity: 'error'
    });
  }

  // Campo 11: lugar_procedencia (1-6 digits)
  if (!/^[0-9]{1,6}$/.test(sireData.lugar_procedencia)) {
    errors.push({
      field: 'lugar_procedencia',
      message: 'Lugar de procedencia debe tener 1-6 dígitos',
      severity: 'error'
    });
  }

  // Campo 12: lugar_destino (1-6 digits)
  if (!/^[0-9]{1,6}$/.test(sireData.lugar_destino)) {
    errors.push({
      field: 'lugar_destino',
      message: 'Lugar de destino debe tener 1-6 dígitos',
      severity: 'error'
    });
  }

  // Campo 13: fecha_nacimiento (dd/mm/yyyy)
  if (!/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/[0-9]{4}$/.test(sireData.fecha_nacimiento)) {
    errors.push({
      field: 'fecha_nacimiento',
      message: 'Fecha de nacimiento debe tener formato dd/mm/yyyy',
      severity: 'error'
    });
  }

  return errors;
}

/**
 * Generate SIRE TXT file content
 *
 * Creates tab-delimited row with 13 fields.
 */
export function generateSIRETXT(sireData: SIREData): string {
  const row = [
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
    sireData.fecha_nacimiento,
  ].join('\t');

  return row + '\n';
}
