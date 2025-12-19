/**
 * Compliance Chat Engine
 *
 * Conversational compliance flow con arquitectura de dos capas:
 * - Capa 1 (Conversational): Datos amigables extraídos en conversación
 * - Capa 2 (SIRE): 13 campos oficiales auto-generados
 *
 * Basado en especificación oficial SIRE:
 * - Fuente: docs/features/sire-compliance/CODIGOS_OFICIALES.md
 * - 13 campos obligatorios
 * - Validaciones estrictas
 */

import Anthropic from '@anthropic-ai/sdk';
import { getSIRECountryCode, getDIVIPOLACityCode } from '@/lib/sire/sire-catalogs';

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

  // ⚠️ CRITICAL: 3 INDEPENDENT GEOGRAPHIC FIELDS (see docs/features/sire-compliance/DATABASE_SCHEMA_CLARIFICATION.md)

  // Field 5 - NATIONALITY: Guest's CITIZENSHIP country (where passport is from)
  // Example: American guest → "Estados Unidos" (maps to SIRE code 249)
  pais_texto: string;

  // Field 11 - PROCEDENCIA/ORIGIN: City/country came FROM before arriving at hotel
  // Example: Came from Bogotá → "Bogotá" (maps to DIVIPOLA 11001)
  // Example: Came from USA → "Estados Unidos" (maps to SIRE 249)
  procedencia_texto: string;

  // Field 12 - DESTINO/DESTINATION: City/country going TO after leaving hotel
  // Example: Going to Medellín → "Medellín" (maps to DIVIPOLA 05001)
  // Example: Returning to USA → "Estados Unidos" (maps to SIRE 249)
  // ⚠️ NOT the hotel's city, it's their NEXT destination after checkout
  destino_texto: string;

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
  codigo_nacionalidad: string;      // Campo 5: SIRE country code (NOT ISO 3166-1)

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
 * Guest Reservation Interface (Extended with SIRE compliance fields)
 *
 * This interface represents a guest reservation with ALL 13 SIRE compliance fields
 * that are populated after the compliance chat flow completes.
 */
export interface GuestReservation {
  id: string;
  tenant_id: string;
  guest_name: string;
  phone_full: string;
  check_in_date: string;
  check_out_date: string;

  // 🆕 SIRE Compliance Fields (13 campos oficiales)

  // Hotel/Location (2 campos)
  hotel_sire_code: string | null;            // Código hotel SCH (4-6 dígitos)
  hotel_city_code: string | null;            // Código ciudad DIVIPOLA (5-6 dígitos)

  // Documento (2 campos)
  document_type: string | null;              // '3'=Pasaporte, '5'=Cédula, '10'=PEP, '46'=Diplomático
  document_number: string | null;            // Alfanumérico 6-15 chars sin guiones

  // Nacionalidad (1 campo)
  nationality_code: string | null;           // Código SIRE (249=USA, 169=COL) - NO ISO

  // Identidad (3 campos)
  first_surname: string | null;              // Primer apellido (MAYÚSCULAS, con acentos)
  second_surname: string | null;             // Segundo apellido (opcional, puede estar vacío)
  given_names: string | null;                // Nombres (MAYÚSCULAS, con acentos)

  // Movimiento (2 campos)
  movement_type: string | null;              // 'E'=Entrada, 'S'=Salida
  movement_date: Date | null;                // Fecha movimiento (check-in/check-out)

  // Lugares (2 campos) - ⚠️ Fields accept BOTH city and country codes
  // These accept BOTH city (DIVIPOLA 5 digits) AND country (SIRE 1-3 digits)
  origin_city_code: string | null;           // FROM: City/country came from BEFORE arriving (DIVIPOLA or SIRE)
  destination_city_code: string | null;      // TO: City/country going to AFTER checkout (DIVIPOLA or SIRE)
  // Example: American guest traveling Bogotá (11001) → Hotel → Medellín (05001)
  //   nationality_code: '249' (USA - SIRE country)
  //   origin_city_code: '11001' (Bogotá - DIVIPOLA city)
  //   destination_city_code: '05001' (Medellín - DIVIPOLA city)

  // Fecha nacimiento (1 campo)
  birth_date: Date | null;                   // Fecha nacimiento
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
        model: 'claude-haiku-4-5',
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

3. pais_texto: Country of CITIZENSHIP/NATIONALITY (in Spanish)
   - Example: "Estados Unidos", "Colombia", "España"
   - Convert from English if needed: "United States" → "Estados Unidos"
   - ⚠️ This is NATIONALITY, NOT travel origin

4. fecha_nacimiento: Birthdate (format: DD/MM/YYYY)
   - Example: "15/05/1990"
   - Parse from various formats if needed

5. procedencia_texto: COLOMBIAN CITY guest came FROM before checking into THIS hotel (in Spanish)
   - Example: "Bogotá", "Medellín", "Cali", "Cartagena"
   - ⚠️ This is the ORIGIN city BEFORE arriving at the hotel
   - Must be a Colombian city name (will be mapped to DIVIPOLA code)

6. destino_texto: COLOMBIAN CITY guest will go TO after checking out of THIS hotel (in Spanish)
   - Example: "Medellín", "Bogotá", "Cali", "Cartagena"
   - ⚠️ This is the DEPARTURE city AFTER leaving the hotel
   - Must be a Colombian city name (will be mapped to DIVIPOLA code)
   - CANNOT be the same as hotel's city!

7. proposito_viaje: Travel purpose (optional, free text)
   - Example: "Turismo y vacaciones"

Return ONLY valid JSON with extracted fields. If a field is NOT found, omit it.
Do NOT make up or infer data - only extract what is explicitly stated.

Example output (guest staying in San Andrés):
{
  "nombre_completo": "John Michael Smith",
  "numero_pasaporte": "US12345678",
  "pais_texto": "Estados Unidos",
  "fecha_nacimiento": "25/03/1985",
  "procedencia_texto": "Bogotá",
  "destino_texto": "Medellín"
}

This means: American guest flew FROM Bogotá TO San Andrés (hotel), and will fly TO Medellín after checkout.`
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
   * Required fields: nombre_completo, numero_pasaporte, pais_texto, fecha_nacimiento, procedencia_texto, destino_texto
   */
  calculateCompleteness(entities: Partial<ConversationalData>): ComplianceState {
    const requiredFields: (keyof ConversationalData)[] = [
      'nombre_completo',
      'numero_pasaporte',
      'pais_texto',
      'fecha_nacimiento',
      'procedencia_texto',
      'destino_texto'
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
      pais_texto: 'Nacionalidad',
      fecha_nacimiento: 'Fecha de nacimiento',
      procedencia_texto: 'Lugar de procedencia',
      destino_texto: 'Lugar de destino',
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

    // Map nationality to SIRE country code
    const codigoNacionalidad = this.mapCountryToCode(conversational.pais_texto);

    // Map origin (procedencia) to SIRE/DIVIPOLA code (can be country OR city)
    const codigoProcedencia = this.mapLocationToCode(conversational.procedencia_texto);

    // Map destination (destino) to SIRE/DIVIPOLA code (can be country OR city)
    const codigoDestino = this.mapLocationToCode(conversational.destino_texto);

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

      // Nacionalidad (Campo 5: citizenship)
      codigo_nacionalidad: codigoNacionalidad,

      // Identidad (from nombre_completo)
      primer_apellido: nameParts.primerApellido,
      segundo_apellido: nameParts.segundoApellido,
      nombres: nameParts.nombres,

      // Movimiento
      tipo_movimiento: 'E', // Entrada (fixed)
      fecha_movimiento: fechaMovimiento,

      // Lugares (Campo 11 & 12: TRAVEL origin and destination)
      lugar_procedencia: codigoProcedencia,
      lugar_destino: codigoDestino,

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
   * Map location (country or Colombian city) to SIRE/DIVIPOLA code
   *
   * ⚠️ CRITICAL: Procedencia and Destino (Campo 11 & 12) can be EITHER:
   * - Colombian city codes (DIVIPOLA 5 digits): "Bogotá" → 11001
   * - Country codes (SIRE 1-3 digits): "Estados Unidos" → 249
   *
   * ✅ Uses fuzzy search on 1,122 Colombian cities + 250 countries
   * ✅ Handles accents, case, typos automatically
   *
   * Used for Campo 11 (procedencia) and Campo 12 (destino).
   *
   * @param locationText - Location name in Spanish (e.g., "Bogotá", "Estados Unidos")
   * @returns SIRE country code (1-3 digits) OR DIVIPOLA city code (5 digits)
   */
  private mapLocationToCode(locationText: string): string {
    // Try Colombian city first (fuzzy search on 1,122 cities)
    const cityCode = getDIVIPOLACityCode(locationText);
    if (cityCode) {
      console.log('[compliance-engine] Mapped to Colombian city:', {
        location: locationText,
        code: cityCode
      });
      return cityCode;
    }

    // Fallback to country code (fuzzy search on 250 countries)
    const countryCode = this.mapCountryToCode(locationText);
    console.log('[compliance-engine] Mapped to country:', {
      location: locationText,
      code: countryCode
    });
    return countryCode;
  }

  /**
   * Map country name (Spanish) to SIRE country code
   *
   * ✅ Uses official SIRE codes from _assets/sire/codigos-pais.json
   * ✅ Fuzzy search handles accents, case, typos automatically
   * ❌ NOT ISO 3166-1 codes (USA=249, not 840)
   *
   * Examples (SIRE codes, NOT ISO):
   * - USA: SIRE 249 (NOT ISO 840)
   * - Colombia: SIRE 169 (NOT ISO 170)
   * - Brasil: SIRE 105 (NOT ISO 076)
   * - España: SIRE 245 (NOT ISO 724)
   */
  private mapCountryToCode(countryText: string): string {
    const code = getSIRECountryCode(countryText);

    if (!code) {
      console.warn('[compliance-engine] Unknown country:', countryText);
      return '249'; // Default to USA (SIRE code)
    }

    return code; // ✅ SIRE official codes (249, 169, 105, 245, etc)
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

// ============================================================================
// RESERVATION UPDATE FUNCTIONS (FASE 2)
// ============================================================================

/**
 * Parse SIRE date format (DD/MM/YYYY) to JavaScript Date object
 *
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Date object
 *
 * @example
 * parseSIREDate("15/10/2025") // Returns: Date(2025, 9, 15)
 * parseSIREDate("25/03/1985") // Returns: Date(1985, 2, 25)
 */
export function parseSIREDate(dateStr: string): Date {
  // Validate format DD/MM/YYYY
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    throw new Error(`Invalid SIRE date format: "${dateStr}". Expected DD/MM/YYYY`);
  }

  const [day, month, year] = dateStr.split('/').map(Number);

  // JavaScript Date: month is 0-indexed (0 = January, 11 = December)
  const date = new Date(year, month - 1, day);

  // Validate the date is valid (handles invalid dates like 32/13/2025)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    throw new Error(`Invalid date values: ${dateStr}`);
  }

  return date;
}

/**
 * Update guest reservation with SIRE compliance data
 *
 * This function persists ALL 13 SIRE fields extracted during compliance chat
 * into the guest_reservations table for audit and reporting purposes.
 *
 * IMPORTANT: Uses SIRE official codes (NOT ISO 3166-1 numeric codes).
 * See: _assets/sire/codigos-pais.json for country code reference.
 *
 * @param reservationId - UUID of the guest reservation
 * @param sireData - Complete SIRE data (13 campos oficiales)
 *
 * @throws Error if database update fails
 *
 * @example
 * await updateReservationWithComplianceData(
 *   "550e8400-e29b-41d4-a716-446655440000",
 *   {
 *     codigo_hotel: "12345",
 *     codigo_ciudad: "88001",
 *     tipo_documento: "3",
 *     numero_identificacion: "AB1234567",
 *     codigo_nacionalidad: "249", // USA (SIRE code, not ISO 840)
 *     primer_apellido: "GARCÍA",
 *     segundo_apellido: "PÉREZ",
 *     nombres: "JUAN PABLO",
 *     tipo_movimiento: "E",
 *     fecha_movimiento: "09/10/2025",
 *     lugar_procedencia: "249",
 *     lugar_destino: "169",
 *     fecha_nacimiento: "25/03/1985"
 *   }
 * )
 */
export async function updateReservationWithComplianceData(
  reservationId: string,
  sireData: SIREData
): Promise<void> {
  console.log('[compliance-engine] Updating reservation with SIRE data:', {
    reservation_id: reservationId,
    document_type: sireData.tipo_documento,
    nationality: sireData.codigo_nacionalidad,
    hotel_code: sireData.codigo_hotel,
    movement_type: sireData.tipo_movimiento,
  });

  try {
    // Import Supabase client dynamically to avoid circular dependencies
    const { createServerClient } = await import('@/lib/supabase');
    const supabase = createServerClient();

    // Parse dates from DD/MM/YYYY to Date object
    const birthDate = parseSIREDate(sireData.fecha_nacimiento);
    const movementDate = parseSIREDate(sireData.fecha_movimiento);

    // Update guest_reservations with ALL 13 SIRE compliance fields
    const { data, error } = await supabase
      .from('guest_reservations')
      .update({
        // Hotel/Location (2 campos)
        hotel_sire_code: sireData.codigo_hotel,
        hotel_city_code: sireData.codigo_ciudad,

        // Documento (2 campos)
        document_type: sireData.tipo_documento,
        document_number: sireData.numero_identificacion,

        // Nacionalidad (1 campo)
        nationality_code: sireData.codigo_nacionalidad,

        // Identidad (3 campos)
        first_surname: sireData.primer_apellido,
        second_surname: sireData.segundo_apellido,
        given_names: sireData.nombres,

        // Movimiento (2 campos)
        movement_type: sireData.tipo_movimiento,
        movement_date: movementDate.toISOString().split('T')[0], // Store as YYYY-MM-DD

        // Lugares (2 campos)
        origin_city_code: sireData.lugar_procedencia,
        destination_city_code: sireData.lugar_destino,

        // Fecha nacimiento (1 campo)
        birth_date: birthDate.toISOString().split('T')[0], // Store as YYYY-MM-DD
      })
      .eq('id', reservationId)
      .select('id, guest_name')
      .single();

    if (error) {
      console.error('[compliance-engine] Reservation update error:', error);
      throw new Error(`Failed to update reservation: ${error.message}`);
    }

    console.log('[compliance-engine] ✅ Reservation updated successfully (13 campos):', {
      reservation_id: data.id,
      guest_name: data.guest_name,
      hotel_code: sireData.codigo_hotel,
      movement: `${sireData.tipo_movimiento} (${sireData.fecha_movimiento})`,
    });
  } catch (error: any) {
    console.error('[compliance-engine] updateReservationWithComplianceData error:', error);
    // Re-throw to allow caller to handle
    throw error;
  }
}

// ============================================================================
// ENTITY EXTRACTION SYSTEM (FASE 1 - Tarea 1.5)
// ============================================================================

/**
 * Resultado de extracción de entidad con confidence scoring
 */
export interface EntityExtractionResult<T = any> {
  value: T | null;
  confidence: number; // 0.00 - 1.00
  normalized?: T; // Valor normalizado (opcional)
}

/**
 * Extrae una entidad SIRE de un mensaje conversacional
 *
 * @param message - Mensaje del usuario (respuesta conversacional)
 * @param fieldName - Campo SIRE a extraer
 * @param context - Contexto adicional (opcional)
 * @returns Resultado de extracción con confidence
 *
 * @example
 * extractSIREEntity("Mi pasaporte es AB-123456", "identification_number")
 * // Returns: { value: "AB123456", confidence: 0.95, normalized: "AB123456" }
 */
export function extractSIREEntity(
  message: string,
  fieldName: string,
  context?: Record<string, any>
): EntityExtractionResult {
  const trimmed = message.trim();

  switch (fieldName) {
    case 'identification_number':
      return extractIdentificationNumber(trimmed);

    case 'first_surname':
    case 'names':
      return extractNameComponent(trimmed, fieldName as 'first_surname' | 'names');

    case 'nationality_code':
      return extractNationality(trimmed);

    case 'birth_date':
      return extractBirthDate(trimmed);

    case 'origin_place':
    case 'destination_place':
      return extractLocation(trimmed, context);

    default:
      return { value: null, confidence: 0 };
  }
}

/**
 * Extrae y normaliza número de identificación (pasaporte/cédula)
 * Remueve guiones, espacios y caracteres especiales
 */
function extractIdentificationNumber(message: string): EntityExtractionResult<string> {
  // Buscar pattern de pasaporte en el mensaje PRIMERO (antes de normalizar)
  // Pattern: 1-2 letras seguidas de 6-9 dígitos (permite guiones/espacios entre)
  const passportPattern = /([A-Z]{1,2}[-\s]?[0-9]{6,9})/i;
  const match = message.match(passportPattern);

  if (match) {
    // Remover guiones y espacios del match
    const normalized = match[1].toUpperCase().replace(/[-\s]/g, '');
    return {
      value: normalized,
      confidence: 0.95,
      normalized
    };
  }

  // Fallback: remover guiones, espacios y caracteres especiales del mensaje completo
  const normalized = message.toUpperCase().replace(/[-\s]/g, '');

  // Validar longitud (6-15 caracteres alfanuméricos)
  if (/^[A-Z0-9]{6,15}$/.test(normalized)) {
    return {
      value: normalized,
      confidence: 0.85,
      normalized
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae componentes de nombre (primer apellido, segundo apellido, nombres)
 * Intenta inferir estructura desde nombre completo
 */
function extractNameComponent(
  message: string,
  component: 'first_surname' | 'names'
): EntityExtractionResult<string> {
  const words = message.trim().split(/\s+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Si solo hay 1 palabra, asumimos que es el componente solicitado
  if (words.length === 1) {
    return {
      value: words[0],
      confidence: 0.70
    };
  }

  // Si hay 2 palabras:
  // - first_surname: última palabra
  // - names: primera palabra
  if (words.length === 2) {
    const value = component === 'first_surname' ? words[1] : words[0];
    return {
      value,
      confidence: 0.80
    };
  }

  // Si hay 3+ palabras:
  // - first_surname: penúltima palabra
  // - names: todas excepto las 2 últimas
  if (component === 'first_surname') {
    return {
      value: words[words.length - 2],
      confidence: 0.85
    };
  } else {
    return {
      value: words.slice(0, -2).join(' '),
      confidence: 0.85
    };
  }
}

/**
 * Extrae nacionalidad y mapea a código SIRE oficial
 * Usa getSIRECountryCode() de sire-catalogs.ts
 */
function extractNationality(message: string): EntityExtractionResult<string> {
  const normalized = message.toLowerCase().trim();

  // Mapeo de variaciones comunes a nombres oficiales
  const aliases: Record<string, string> = {
    'usa': 'Estados Unidos',
    'eeuu': 'Estados Unidos',
    'ee.uu.': 'Estados Unidos',
    'estados unidos de américa': 'Estados Unidos',
    'united states': 'Estados Unidos',
    'american': 'Estados Unidos',
    'americano': 'Estados Unidos',
    'estadounidense': 'Estados Unidos',
    'uk': 'Reino Unido',
    'england': 'Reino Unido',
    'britain': 'Reino Unido',
    'great britain': 'Reino Unido',
    'inglés': 'Reino Unido',
    'británico': 'Reino Unido',
    'colombiano': 'Colombia',
    'colombian': 'Colombia',
  };

  // Buscar en aliases
  for (const [alias, countryName] of Object.entries(aliases)) {
    if (normalized.includes(alias)) {
      const code = getSIRECountryCode(countryName);
      if (code) {
        return {
          value: code,
          confidence: 0.90,
          normalized: code
        };
      }
    }
  }

  // Buscar directamente en catálogos SIRE
  // Intentar con el mensaje original capitalizado
  const capitalized = message.charAt(0).toUpperCase() + message.slice(1).toLowerCase();
  const code = getSIRECountryCode(capitalized);

  if (code) {
    return {
      value: code,
      confidence: 0.95,
      normalized: code
    };
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae y normaliza fecha de nacimiento
 * Soporta formatos: DD/MM/YYYY, "25 de marzo de 1985", "March 25, 1985"
 */
function extractBirthDate(message: string): EntityExtractionResult<string> {
  // Pattern 1: DD/MM/YYYY
  const ddmmyyyyPattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
  const match1 = message.match(ddmmyyyyPattern);

  if (match1) {
    const day = match1[1].padStart(2, '0');
    const month = match1[2].padStart(2, '0');
    const year = match1[3];
    const normalized = `${day}/${month}/${year}`;

    // Validar fecha válida
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime()) && date <= new Date()) {
      return {
        value: normalized,
        confidence: 0.95,
        normalized
      };
    }
  }

  // Pattern 2: "25 de marzo de 1985" (español)
  const spanishMonths: Record<string, string> = {
    'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
    'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
    'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
  };

  const spanishPattern = /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i;
  const match2 = message.match(spanishPattern);

  if (match2) {
    const day = match2[1].padStart(2, '0');
    const monthName = match2[2].toLowerCase();
    const year = match2[3];
    const month = spanishMonths[monthName];

    if (month) {
      const normalized = `${day}/${month}/${year}`;
      return {
        value: normalized,
        confidence: 0.95,
        normalized
      };
    }
  }

  // Pattern 3: "March 25, 1985" (inglés)
  const englishMonths: Record<string, string> = {
    'january': '01', 'february': '02', 'march': '03', 'april': '04',
    'may': '05', 'june': '06', 'july': '07', 'august': '08',
    'september': '09', 'october': '10', 'november': '11', 'december': '12'
  };

  const englishPattern = /(\w+)\s+(\d{1,2}),?\s+(\d{4})/i;
  const match3 = message.match(englishPattern);

  if (match3) {
    const monthName = match3[1].toLowerCase();
    const day = match3[2].padStart(2, '0');
    const year = match3[3];
    const month = englishMonths[monthName];

    if (month) {
      const normalized = `${day}/${month}/${year}`;
      return {
        value: normalized,
        confidence: 0.95,
        normalized
      };
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extrae lugar (procedencia/destino) y mapea a código SIRE o DIVIPOLA
 * Intenta primero ciudades colombianas, luego países
 */
function extractLocation(
  message: string,
  context?: Record<string, any>
): EntityExtractionResult<string> {
  const normalized = message.trim();

  // Primero: Buscar aliases comunes de países (ANTES de catálogos para evitar falsos positivos)
  const aliases: Record<string, string> = {
    'usa': 'Estados Unidos',
    'eeuu': 'Estados Unidos',
    'ee.uu.': 'Estados Unidos',
    'united states': 'Estados Unidos',
    'estados unidos': 'Estados Unidos',
    'uk': 'Reino Unido',
    'england': 'Reino Unido',
  };

  const lowerMessage = message.toLowerCase().trim();

  // Verificar si el mensaje COMPLETO es un alias (match exacto)
  if (aliases[lowerMessage]) {
    const code = getSIRECountryCode(aliases[lowerMessage]);
    if (code) {
      return {
        value: code,
        confidence: 0.90,
        normalized: code
      };
    }
  }

  // Extraer la ciudad/país del contexto del mensaje
  // Patterns comunes: "Vengo de X", "Voy a X", "desde X", solo "X"
  const locationPatterns = [
    /(?:vengo de|desde|procedencia|origin)\s+([a-záéíóúñü\s]+)/i,
    /(?:voy a|destino|destination|going to)\s+([a-záéíóúñü\s]+)/i,
  ];

  let locationName = normalized;

  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match) {
      locationName = match[1].trim();
      break;
    }
  }

  // Intentar primero con ciudades DIVIPOLA (colombianas)
  const cityCode = getDIVIPOLACityCode(locationName);
  if (cityCode) {
    return {
      value: cityCode,
      confidence: 0.90,
      normalized: cityCode
    };
  }

  // Si no es ciudad colombiana, intentar con países
  const countryCode = getSIRECountryCode(locationName);
  if (countryCode) {
    return {
      value: countryCode,
      confidence: 0.85,
      normalized: countryCode
    };
  }

  // Buscar aliases dentro del mensaje (match parcial)
  for (const [alias, countryName] of Object.entries(aliases)) {
    if (lowerMessage.includes(alias)) {
      const code = getSIRECountryCode(countryName);
      if (code) {
        return {
          value: code,
          confidence: 0.80,
          normalized: code
        };
      }
    }
  }

  return { value: null, confidence: 0 };
}
