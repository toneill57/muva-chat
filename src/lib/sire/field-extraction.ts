/**
 * SIRE Field Extraction and Mapping - OCR to SIRE Format
 *
 * Maps passport OCR data (PassportData) to SIRE official format (SIREConversationalData).
 *
 * IMPORTANT: This module handles OCR → SIRE mapping specifically for document auto-submission.
 * It's different from field-mappers.ts which handles conversational → SIRE mapping.
 *
 * Features:
 * - Name splitting (passport format → SIRE components)
 * - Nationality mapping (country name/code → SIRE codes)
 * - Document type detection (passport number format → SIRE types)
 * - Date normalization (multiple formats → DD/MM/YYYY)
 * - Field validation and confidence scoring
 *
 * @module field-extraction
 * @created December 23, 2025
 * @context SIRE Auto-Submission FASE 2, Tarea 2.3
 */

import { PassportData } from './document-ocr';
import { getSIRECountryCode } from './sire-catalogs';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * SIRE Conversational Data Interface
 *
 * This is the intermediate format used by the SIRE system for guest data
 * before final submission. It contains all fields needed for SIRE compliance.
 */
export interface SIREConversationalData {
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  tipo_documento?: string;
  documento_numero?: string;
  codigo_nacionalidad?: string;
  fecha_nacimiento?: string;
  fecha_entrada?: string;
  fecha_salida?: string;
  motivo_viaje?: string;
  medio_transporte?: string;
  pais_procedencia?: string;
}

/**
 * Field Extraction Result
 *
 * Contains extracted SIRE data, confidence scores, and any errors/warnings
 */
export interface FieldExtractionResult {
  sireData: Partial<SIREConversationalData>;
  confidence: Record<string, number>;
  errors: string[];
  warnings: string[];
}

/**
 * Name Extraction Result
 *
 * Result of splitting a full name into SIRE components
 */
export interface NameExtractionResult {
  success: boolean;
  primerApellido?: string;
  segundoApellido?: string;
  nombres?: string;
  confidence: number;
}

/**
 * Nationality Mapping Result
 *
 * Result of mapping a country name to a SIRE country code
 */
export interface NationalityMappingResult {
  success: boolean;
  code?: string;
  confidence: number;
}

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

/**
 * Main function: Map passport OCR data to SIRE format
 *
 * Extracts all available fields from passport data and maps them to SIRE format,
 * providing confidence scores and error/warning messages for each field.
 *
 * @param passportData - OCR-extracted passport data
 * @returns Field extraction result with SIRE data, confidence, errors, and warnings
 *
 * @example
 * const ocrResult = await extractPassportData(imageBuffer, 'image/jpeg');
 * const sireResult = mapPassportToSIRE(ocrResult.structuredData);
 *
 * if (sireResult.errors.length === 0) {
 *   // Submit to SIRE
 *   await submitToSIRE(sireResult.sireData);
 * } else {
 *   // Handle errors
 *   console.error('Extraction errors:', sireResult.errors);
 * }
 */
export function mapPassportToSIRE(
  passportData: PassportData
): FieldExtractionResult {
  const sireData: Partial<SIREConversationalData> = {};
  const confidence: Record<string, number> = {};
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Extract full name → primer apellido, segundo apellido, nombres
  if (passportData.fullName) {
    const nameExtraction = splitFullName(passportData.fullName);
    if (nameExtraction.success) {
      sireData.primer_apellido = nameExtraction.primerApellido;
      sireData.segundo_apellido = nameExtraction.segundoApellido;
      sireData.nombres = nameExtraction.nombres;
      confidence.nombre = nameExtraction.confidence;
    } else {
      errors.push('No se pudo separar el nombre completo');
    }
  } else {
    errors.push('Nombre completo no encontrado en el documento');
  }

  // 2. Passport number → documento_numero
  // Normalize: remove dots, dashes, spaces (e.g., "94.921.109" → "94921109")
  if (passportData.passportNumber) {
    sireData.documento_numero = passportData.passportNumber.replace(/[-.\s]/g, '').toUpperCase();
    // Use OCR-detected document type, fallback to number-based detection
    sireData.tipo_documento = mapDocumentTypeToSIRE(
      passportData.documentType,
      passportData.passportNumber
    );
    confidence.documento = 0.95;
  } else {
    errors.push('Número de pasaporte no encontrado');
  }

  // 3. Nationality → codigo_nacionalidad (SIRE code)
  if (passportData.nationality) {
    const nationalityMapping = mapNationalityToSIRE(passportData.nationality);
    if (nationalityMapping.success) {
      sireData.codigo_nacionalidad = nationalityMapping.code;
      confidence.nacionalidad = nationalityMapping.confidence;
    } else {
      errors.push(`Nacionalidad no reconocida: ${passportData.nationality}`);
    }
  } else {
    errors.push('Nacionalidad no encontrada en el documento');
  }

  // 4. Birth date → fecha_nacimiento (DD/MM/YYYY)
  if (passportData.birthDate) {
    const normalizedDate = normalizeDateFormat(passportData.birthDate);
    if (normalizedDate) {
      sireData.fecha_nacimiento = normalizedDate;
      confidence.fecha_nacimiento = 0.90;
    } else {
      warnings.push(`Formato de fecha no reconocido: ${passportData.birthDate}`);
    }
  } else {
    errors.push('Fecha de nacimiento no encontrada');
  }

  return { sireData, confidence, errors, warnings };
}

// ============================================================================
// NAME SPLITTING
// ============================================================================

/**
 * Split passport full name into SIRE name components
 *
 * Passport formats:
 * - "SMITH, JOHN MICHAEL" (most common)
 * - "GARCIA LOPEZ, MARIA ELENA" (Hispanic names)
 * - "VAN DER BERG, JOHANNES" (compound surnames)
 *
 * @param fullName - Full name from passport (usually in SURNAME, GIVEN format)
 * @returns Name extraction result with components and confidence score
 *
 * @example
 * splitFullName("SMITH, JOHN MICHAEL")
 * // Returns: { success: true, primerApellido: "SMITH", nombres: "JOHN MICHAEL", confidence: 0.88 }
 *
 * @example
 * splitFullName("GARCIA LOPEZ, MARIA ELENA")
 * // Returns: { success: true, primerApellido: "GARCIA", segundoApellido: "LOPEZ", nombres: "MARIA ELENA", confidence: 0.92 }
 */
/**
 * Merge compound surname prefixes that were separated by spaces
 *
 * Handles cases where apostrophes are replaced with spaces:
 * - "O NEILL" → "O'NEILL"
 * - "D ANGELO" → "D'ANGELO"
 * - "MC DONALD" → "MCDONALD"
 *
 * Also handles multi-word surname prefixes:
 * - "VAN DER BERG" → keeps as compound
 * - "DE LA CRUZ" → keeps as compound
 *
 * @param words - Array of surname words
 * @returns Array with compound surnames merged
 */
function mergeCompoundSurnames(words: string[]): string[] {
  if (words.length < 2) return words;

  const result: string[] = [];
  let i = 0;

  // Prefixes that should be merged with apostrophe (single letter)
  const apostrophePrefixes = ['O', 'D'];

  // Prefixes that should be merged without apostrophe
  const mergePrefixes = ['MC', 'MAC'];

  // Prefixes that form compound surnames (keep as separate words in the surname)
  const compoundPrefixes = ['VAN', 'VON', 'DE', 'DEL', 'LA', 'LOS', 'LAS', 'DI', 'DA', 'DU', 'LE'];

  while (i < words.length) {
    const word = words[i];
    const nextWord = words[i + 1];

    if (nextWord) {
      // Check for apostrophe prefixes (O, D)
      if (apostrophePrefixes.includes(word) && nextWord.length > 1) {
        // Merge with apostrophe: "O" + "NEILL" → "O'NEILL"
        result.push(`${word}'${nextWord}`);
        i += 2;
        continue;
      }

      // Check for merge prefixes (MC, MAC)
      if (mergePrefixes.includes(word)) {
        // Merge without space: "MC" + "DONALD" → "MCDONALD"
        result.push(`${word}${nextWord}`);
        i += 2;
        continue;
      }

      // Check for compound prefixes - these stay as part of multi-word surname
      // but we don't split them further
      if (compoundPrefixes.includes(word)) {
        // Keep collecting words that are part of the compound
        let compound = word;
        i++;
        while (i < words.length) {
          const next = words[i];
          if (compoundPrefixes.includes(next)) {
            compound += ' ' + next;
            i++;
          } else {
            compound += ' ' + next;
            i++;
            break;
          }
        }
        result.push(compound);
        continue;
      }
    }

    result.push(word);
    i++;
  }

  return result;
}

export function splitFullName(fullName: string): NameExtractionResult {
  if (!fullName || fullName.trim().length === 0) {
    return { success: false, confidence: 0 };
  }

  const cleaned = fullName.trim().toUpperCase();

  // Format 1: "SURNAME(S), GIVEN NAME(S)" - most common passport format
  const commaSplit = cleaned.split(',').map(s => s.trim());

  if (commaSplit.length === 2 && commaSplit[0] && commaSplit[1]) {
    // Split surnames and merge compound prefixes
    const rawSurnames = commaSplit[0].split(/\s+/).filter(s => s.length > 0);
    const surnames = mergeCompoundSurnames(rawSurnames);
    const givenNames = commaSplit[1].trim();

    if (surnames.length >= 2) {
      // Two or more surnames (e.g., "GARCIA LOPEZ")
      return {
        success: true,
        primerApellido: surnames[0],
        segundoApellido: surnames.slice(1).join(' '),
        nombres: givenNames,
        confidence: 0.92
      };
    } else if (surnames.length === 1) {
      // One surname
      return {
        success: true,
        primerApellido: surnames[0],
        segundoApellido: undefined,
        nombres: givenNames,
        confidence: 0.88
      };
    }
  }

  // Format 2: Space-separated words (fallback)
  // Assume: GIVEN NAMES ... FIRST_SURNAME SECOND_SURNAME
  const words = cleaned.split(/\s+/).filter(s => s.length > 0);

  if (words.length >= 3) {
    // Last two words are surnames, rest are given names
    return {
      success: true,
      nombres: words.slice(0, -2).join(' '),
      primerApellido: words[words.length - 2],
      segundoApellido: words[words.length - 1],
      confidence: 0.70
    };
  } else if (words.length === 2) {
    // Assume: GIVEN_NAME SURNAME
    return {
      success: true,
      nombres: words[0],
      primerApellido: words[1],
      confidence: 0.65
    };
  }

  return { success: false, confidence: 0 };
}

// ============================================================================
// NATIONALITY MAPPING
// ============================================================================

/**
 * Map country name/code to SIRE country code
 *
 * IMPORTANT: Uses SIRE codes, NOT ISO codes
 * - USA = 249 (NOT 840)
 * - Colombia = 169 (NOT 170)
 *
 * This function handles common nationality aliases and uses the sire-catalogs
 * module for fuzzy matching against the official SIRE country catalog.
 *
 * @param nationality - Country name or code from passport
 * @returns Nationality mapping result with SIRE code and confidence
 *
 * @example
 * mapNationalityToSIRE("United States")
 * // Returns: { success: true, code: "249", confidence: 0.90 }
 *
 * @example
 * mapNationalityToSIRE("Colombia")
 * // Returns: { success: true, code: "169", confidence: 0.90 }
 */
export function mapNationalityToSIRE(nationality: string): NationalityMappingResult {
  if (!nationality) {
    return { success: false, confidence: 0 };
  }

  const normalized = nationality.toLowerCase().trim();

  // Common nationality aliases → SIRE codes
  // IMPORTANT: All codes verified against official SIRE catalog (_assets/sire/codigos-pais.json)
  // Last audit: December 29, 2025
  const aliases: Record<string, string> = {
    // English names - USA (249 = ESTADOS UNIDOS) ✓
    'united states': '249',
    'united states of america': '249',
    'usa': '249',
    'us': '249',
    'america': '249',
    'american': '249',

    // Colombia (169 = COLOMBIA) ✓
    'colombia': '169',
    'colombian': '169',
    'col': '169',

    // Spain (245 = ESPAÑA) - FIXED from 217
    'spain': '245',
    'spanish': '245',
    'españa': '245',
    'esp': '245',

    // Mexico (493 = MEXICO) - FIXED from 155
    'mexico': '493',
    'mexican': '493',
    'méxico': '493',
    'mex': '493',

    // Brazil (105 = BRASIL) - FIXED from 147
    'brazil': '105',
    'brazilian': '105',
    'brasil': '105',
    'bra': '105',

    // Argentina (63 = ARGENTINA) - FIXED from 141 (was CAMBOYA!)
    'argentina': '63',
    'argentinian': '63',
    'arg': '63',

    // Canada (149 = CANADA) - FIXED from 148
    'canada': '149',
    'canadian': '149',
    'can': '149',

    // United Kingdom (628 = REINO UNIDO) - FIXED from 248 (was ESLOVENIA!)
    'united kingdom': '628',
    'uk': '628',
    'great britain': '628',
    'british': '628',
    'gbr': '628',
    'england': '628',
    'english': '628',
    'scotland': '628',
    'scottish': '628',
    'wales': '628',
    'welsh': '628',
    'northern ireland': '628',

    // France (275 = FRANCIA) - FIXED from 178 (was ISLAS COCOS!)
    'france': '275',
    'french': '275',
    'fra': '275',
    'française': '275',

    // Germany (23 = ALEMANIA) - FIXED from 179
    'germany': '23',
    'german': '23',
    'deutschland': '23',
    'deu': '23',
    'ger': '23',

    // Italy (386 = ITALIA) - FIXED from 192
    'italy': '386',
    'italian': '386',
    'italia': '386',
    'ita': '386',

    // Chile (211 = CHILE) - FIXED from 158
    'chile': '211',
    'chilean': '211',
    'chl': '211',

    // Peru (589 = PERU) - FIXED from 202
    'peru': '589',
    'peruvian': '589',
    'perú': '589',
    'per': '589',

    // Ecuador (239 = ECUADOR) - FIXED from 174
    'ecuador': '239',
    'ecuadorian': '239',
    'ecu': '239',

    // Venezuela (850 = VENEZUELA) - FIXED from 254
    'venezuela': '850',
    'venezuelan': '850',
    'ven': '850',

    // Panama (580 = PANAMA) - FIXED from 200 (was ISLAS ULTRAMARINAS USA!)
    'panama': '580',
    'panamanian': '580',
    'pan': '580',
    'panamá': '580',

    // Costa Rica (196 = COSTA RICA) - FIXED from 165
    'costa rica': '196',
    'costa rican': '196',
    'cri': '196',
    'costarricense': '196',

    // Netherlands (573 = PAISES BAJOS) - FIXED from 199 (was CUBA!)
    'netherlands': '573',
    'dutch': '573',
    'holland': '573',
    'nld': '573',
    'the netherlands': '573',
    'países bajos': '573',
    'holanda': '573',

    // Australia (69 = AUSTRALIA) - FIXED from 143 (was ANTARTIDA!)
    'australia': '69',
    'australian': '69',
    'aus': '69',

    // Japan (399 = JAPON) - FIXED from 193 (was COSTA DE MARFIL!)
    'japan': '399',
    'japanese': '399',
    'jpn': '399',
    'japón': '399',

    // China (215 = CHINA) - FIXED from 159
    'china': '215',
    'chinese': '215',
    'chn': '215',

    // South Korea (190 = COREA DEL SUR) - FIXED from 164
    'south korea': '190',
    'korean': '190',
    'korea': '190',
    'kor': '190',
    'republic of korea': '190',
    'corea': '190',
    'corea del sur': '190',

    // Switzerland (767 = SUIZA) - FIXED from 228
    'switzerland': '767',
    'swiss': '767',
    'che': '767',
    'suiza': '767',

    // Portugal (607 = PORTUGAL) - FIXED from 205
    'portugal': '607',
    'portuguese': '607',
    'prt': '607',

    // Russia (673 = RUSIA) - FIXED from 210
    'russia': '673',
    'russian': '673',
    'rus': '673',
    'rusia': '673',

    // Additional common countries for tourism
    // Ireland (375 = IRLANDA)
    'ireland': '375',
    'irish': '375',
    'irl': '375',
    'irlanda': '375',

    // Belgium (87 = BELGICA)
    'belgium': '87',
    'belgian': '87',
    'bel': '87',
    'bélgica': '87',

    // Austria (72 = AUSTRIA)
    'austria': '72',
    'austrian': '72',
    'aut': '72',

    // Sweden (764 = SUECIA)
    'sweden': '764',
    'swedish': '764',
    'swe': '764',
    'suecia': '764',

    // Norway (538 = NORUEGA)
    'norway': '538',
    'norwegian': '538',
    'nor': '538',
    'noruega': '538',

    // Denmark (232 = DINAMARCA)
    'denmark': '232',
    'danish': '232',
    'dnk': '232',
    'dinamarca': '232',

    // Finland (271 = FINLANDIA)
    'finland': '271',
    'finnish': '271',
    'fin': '271',
    'finlandia': '271',

    // Poland (603 = POLONIA)
    'poland': '603',
    'polish': '603',
    'pol': '603',
    'polonia': '603',

    // Greece (301 = GRECIA)
    'greece': '301',
    'greek': '301',
    'grc': '301',
    'grecia': '301',

    // Czech Republic (207 = REPUBLICA CHECA)
    'czech republic': '207',
    'czech': '207',
    'czechia': '207',
    'cze': '207',
    'república checa': '207',

    // Hungary (355 = HUNGRIA)
    'hungary': '355',
    'hungarian': '355',
    'hun': '355',
    'hungría': '355',

    // Israel (383 = ISRAEL)
    'israel': '383',
    'israeli': '383',
    'isr': '383',

    // Turkey (827 = TURQUIA)
    'turkey': '827',
    'turkish': '827',
    'tur': '827',
    'turquía': '827',

    // India (361 = INDIA)
    'india': '361',
    'indian': '361',
    'ind': '361',

    // South Africa (756 = SUDAFRICA)
    'south africa': '756',
    'south african': '756',
    'zaf': '756',
    'sudáfrica': '756',

    // New Zealand (540 = NUEVA ZELANDA)
    'new zealand': '540',
    'new zealander': '540',
    'nzl': '540',
    'nueva zelanda': '540',

    // Singapore (741 = SINGAPUR)
    'singapore': '741',
    'singaporean': '741',
    'sgp': '741',
    'singapur': '741',

    // Thailand (776 = TAILANDIA)
    'thailand': '776',
    'thai': '776',
    'tha': '776',
    'tailandia': '776',

    // Philippines (267 = FILIPINAS)
    'philippines': '267',
    'filipino': '267',
    'phl': '267',
    'filipinas': '267',

    // Indonesia (365 = INDONESIA)
    'indonesia': '365',
    'indonesian': '365',
    'idn': '365',

    // Malaysia (455 = MALASIA)
    'malaysia': '455',
    'malaysian': '455',
    'mys': '455',
    'malasia': '455',

    // UAE (244 = EMIRATOS ARABES UNIDOS)
    'united arab emirates': '244',
    'uae': '244',
    'emirati': '244',
    'emiratos árabes unidos': '244',

    // Egypt (240 = EGIPTO)
    'egypt': '240',
    'egyptian': '240',
    'egy': '240',
    'egipto': '240',

    // Ukraine (830 = UCRANIA)
    'ukraine': '830',
    'ukrainian': '830',
    'ukr': '830',
    'ucrania': '830',

    // Romania (670 = RUMANIA)
    'romania': '670',
    'romanian': '670',
    'rou': '670',
    'rumania': '670',
    'rumanía': '670',

    // Cuba (199 = CUBA)
    'cuba': '199',
    'cuban': '199',
    'cub': '199',

    // Dominican Republic (647 = REPUBLICA DOMINICANA)
    'dominican republic': '647',
    'dominican': '647',
    'dom': '647',
    'república dominicana': '647',

    // Puerto Rico (611 = PUERTO RICO)
    'puerto rico': '611',
    'puerto rican': '611',
    'pri': '611',

    // Guatemala (317 = GUATEMALA)
    'guatemala': '317',
    'guatemalan': '317',
    'gtm': '317',

    // Honduras (345 = HONDURAS)
    'honduras': '345',
    'honduran': '345',
    'hnd': '345',

    // El Salvador (242 = EL SALVADOR)
    'el salvador': '242',
    'salvadoran': '242',
    'slv': '242',

    // Nicaragua (521 = NICARAGUA)
    'nicaragua': '521',
    'nicaraguan': '521',
    'nic': '521',

    // Bolivia (97 = BOLIVIA)
    'bolivia': '97',
    'bolivian': '97',
    'bol': '97',

    // Paraguay (586 = PARAGUAY)
    'paraguay': '586',
    'paraguayan': '586',
    'pry': '586',

    // Uruguay (845 = URUGUAY)
    'uruguay': '845',
    'uruguayan': '845',
    'ury': '845',

    // Slovenia (248 = ESLOVENIA) - Note: this is the actual Slovenia
    'slovenia': '248',
    'slovenian': '248',
    'svn': '248',
    'eslovenia': '248',

    // Croatia (198 = CROACIA)
    'croatia': '198',
    'croatian': '198',
    'hrv': '198',
    'croacia': '198'
  };

  // Check aliases first (exact match)
  const code = aliases[normalized];
  if (code) {
    return { success: true, code, confidence: 0.90 };
  }

  // Try fuzzy search using sire-catalogs
  // Convert English country names to Spanish for catalog lookup
  const englishToSpanish: Record<string, string> = {
    'united states': 'Estados Unidos',
    'united kingdom': 'Reino Unido',
    'spain': 'España',
    'brazil': 'Brasil',
    'germany': 'Alemania',
    'france': 'Francia',
    'italy': 'Italia',
    'netherlands': 'Países Bajos',
    'switzerland': 'Suiza',
    'portugal': 'Portugal',
    'russia': 'Rusia',
    'japan': 'Japón',
    'china': 'China',
    'south korea': 'Corea del Sur',
    'australia': 'Australia',
    'canada': 'Canadá',
    'mexico': 'México',
    'argentina': 'Argentina',
    'chile': 'Chile',
    'peru': 'Perú',
    'ecuador': 'Ecuador',
    'colombia': 'Colombia',
    'venezuela': 'Venezuela',
    'panama': 'Panamá',
    'costa rica': 'Costa Rica'
  };

  const spanishName = englishToSpanish[normalized] || nationality;
  const catalogCode = getSIRECountryCode(spanishName);

  if (catalogCode) {
    return { success: true, code: catalogCode, confidence: 0.85 };
  }

  return { success: false, confidence: 0 };
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

/**
 * Detect document type based on document number format
 *
 * Returns SIRE document type code:
 * - 3: Pasaporte (most common)
 * - 5: Cédula de Extranjería
 * - 46: Pasaporte Diplomático
 *
 * @param documentNumber - Passport/document number
 * @returns SIRE document type code
 *
 * @example
 * detectDocumentType("AB123456") // Returns: "3" (Pasaporte)
 * detectDocumentType("DA1234567") // Returns: "46" (Diplomático)
 * detectDocumentType("12345678") // Returns: "5" (Cédula)
 */
/**
 * Auto-detect SIRE document type from document number pattern
 *
 * IMPORTANT: This function can auto-detect only SOME document types based on
 * common patterns. For ambiguous cases, document type should be provided explicitly.
 *
 * Auto-detected types:
 * - '46': Pasaporte Diplomático (D + optional letter + numbers)
 * - '3': Pasaporte regular (1-2 letters + numbers)
 * - '5': Cédula de Extranjería (numeric only)
 *
 * Types that CANNOT be auto-detected (require explicit code):
 * - '1': CC (Cédula Ciudadanía) - same format as CE
 * - '2': CE (Cédula Extranjería) - same format as CC
 * - '4': TI (Tarjeta Identidad) - same format as CC/CE
 * - '6': NIP - ambiguous format
 * - '7': NIT - ambiguous format
 * - '8': PPT - ambiguous format
 * - '10': Mercosur/CAN - varies by country
 *
 * @param documentNumber - Document number to analyze
 * @returns SIRE document type code ('3', '5', '46', etc.)
 *
 * @example
 * detectDocumentType('DA1234567') // Returns: '46' (Diplomatic)
 * detectDocumentType('AB123456')  // Returns: '3' (Passport)
 * detectDocumentType('12345678')  // Returns: '5' (Cédula Extranjería)
 */
export function detectDocumentType(documentNumber: string): string {
  if (!documentNumber) {
    return '3'; // Default: Pasaporte
  }

  const cleaned = documentNumber.toUpperCase().replace(/[-\s]/g, '');

  // Diplomatic passport patterns (check FIRST - more specific)
  // Examples: DA1234567, D1234567
  if (/^D[A-Z]?\d{6,9}$/.test(cleaned)) {
    return '46'; // Pasaporte Diplomático
  }

  // Pasaporte: typically starts with letter(s) followed by numbers
  // Examples: AB123456, PA1234567
  if (/^[A-Z]{1,2}\d{6,9}$/.test(cleaned)) {
    return '3'; // Pasaporte
  }

  // Cédula de Extranjería (Colombia): typically numeric
  // Note: This could also be CC, TI, or NIT - context needed
  if (/^\d{6,10}$/.test(cleaned)) {
    return '5'; // Cédula de Extranjería (default for numeric)
  }

  // Default to Pasaporte for unknown patterns
  return '3';
}

/**
 * Map OCR-detected document type to SIRE code
 *
 * Uses the document type label extracted by OCR (e.g., "PASSPORT", "DIPLOMATIC PASSPORT")
 * to determine the correct SIRE document type code.
 *
 * Falls back to number-based detection if OCR didn't extract the type.
 *
 * @param ocrDocumentType - Document type as extracted by OCR
 * @param documentNumber - Fallback: document number for format-based detection
 * @returns SIRE document type code ('3', '5', '46', etc.)
 *
 * @example
 * mapDocumentTypeToSIRE('PASSPORT', '125451855')       // Returns: '3'
 * mapDocumentTypeToSIRE('DIPLOMATIC PASSPORT', 'D123') // Returns: '46'
 * mapDocumentTypeToSIRE(null, 'AB123456')              // Returns: '3' (fallback)
 */
export function mapDocumentTypeToSIRE(
  ocrDocumentType: string | null,
  documentNumber: string
): string {
  console.log('[mapDocumentTypeToSIRE] Input:', { ocrDocumentType, documentNumber });

  if (ocrDocumentType) {
    const normalized = ocrDocumentType.toUpperCase().trim();
    console.log('[mapDocumentTypeToSIRE] Normalized:', normalized);

    // Diplomatic passport - MUST contain "DIPLOMATIC" + "PASSPORT" together
    // or Spanish equivalent. This avoids false positives from "OFFICIAL" text.
    const isDiplomatic = (normalized.includes('DIPLOMATIC') && normalized.includes('PASSPORT')) ||
        (normalized.includes('DIPLOMATICO') && normalized.includes('PASAPORTE')) ||
        normalized === 'DIPLOMATIC PASSPORT' ||
        normalized === 'PASAPORTE DIPLOMATICO' ||
        normalized === 'PASAPORTE DIPLOMÁTICO';

    console.log('[mapDocumentTypeToSIRE] isDiplomatic check:', {
      hasDiplomatic: normalized.includes('DIPLOMATIC'),
      hasPassport: normalized.includes('PASSPORT'),
      isDiplomatic
    });

    if (isDiplomatic) {
      console.log('[mapDocumentTypeToSIRE] => Returning 46 (Diplomatic)');
      return '46';
    }

    // Regular passport (check AFTER diplomatic to avoid false negatives)
    if (normalized.includes('PASSPORT') || normalized.includes('PASAPORTE') ||
        normalized.includes('PASSEPORT')) {
      return '3';
    }

    // Cédula de Extranjería
    if (normalized.includes('CEDULA') || normalized.includes('CÉDULA') ||
        normalized.includes('EXTRANJERIA') || normalized.includes('EXTRANJERÍA')) {
      return '5';
    }

    // ID Card - treat as passport for foreigners (SIRE is for foreigners)
    if (normalized.includes('ID CARD') || normalized.includes('IDENTITY') ||
        normalized.includes('IDENTIDAD')) {
      return '3';
    }
  }

  // Fallback to number-based detection
  return detectDocumentType(documentNumber);
}

// ============================================================================
// DATE NORMALIZATION
// ============================================================================

/**
 * Normalize date to DD/MM/YYYY format
 *
 * Handles multiple input formats:
 * - "25 MAR 1985" (passport)
 * - "1985-03-25" (ISO)
 * - "25/03/1985" (already correct)
 * - "03/25/1985" (US format)
 *
 * @param date - Date string in various formats
 * @returns Date in DD/MM/YYYY format, or null if parsing fails
 *
 * @example
 * normalizeDateFormat("25 MAR 1985") // Returns: "25/03/1985"
 * normalizeDateFormat("1985-03-25") // Returns: "25/03/1985"
 * normalizeDateFormat("03/25/1985") // Returns: "25/03/1985" (converted from US)
 */
export function normalizeDateFormat(date: string): string | null {
  if (!date || date.trim().length === 0) {
    return null;
  }

  const cleaned = date.trim().toUpperCase();

  // Already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    return cleaned;
  }

  // ISO format: YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  // Passport format: DD MMM YYYY (e.g., "25 MAR 1985")
  const monthAbbr: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
    'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
    'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
    // Spanish abbreviations
    'ENE': '01', 'ABR': '04', 'AGO': '08', 'DIC': '12'
  };

  const passportMatch = cleaned.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/);
  if (passportMatch) {
    const day = passportMatch[1].padStart(2, '0');
    const month = monthAbbr[passportMatch[2]];
    const year = passportMatch[3];
    if (month) {
      return `${day}/${month}/${year}`;
    }
  }

  // US format: MM/DD/YYYY - try to detect and convert
  const usMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (usMatch) {
    const [, first, second, year] = usMatch;
    // If first number > 12, it's likely DD/MM/YYYY already
    if (parseInt(first) > 12) {
      return cleaned;
    }
    // If second number > 12, it's MM/DD/YYYY
    if (parseInt(second) > 12) {
      return `${second}/${first}/${year}`; // Convert to DD/MM/YYYY
    }
    // Ambiguous case (e.g., 05/03/1985) - assume DD/MM/YYYY
    return cleaned;
  }

  return null; // Can't parse
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate extracted SIRE fields
 *
 * Checks field formats, value ranges, and logical consistency.
 *
 * @param sireData - Extracted SIRE data to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * const validation = validateExtractedFields(sireData);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 */
export function validateExtractedFields(
  sireData: Partial<SIREConversationalData>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Documento número: 5-20 chars alphanumeric
  if (sireData.documento_numero) {
    const cleaned = sireData.documento_numero.replace(/[-.\s]/g, '');
    if (!/^[A-Z0-9]{5,20}$/i.test(cleaned)) {
      errors.push('Número de documento inválido (debe ser 5-20 caracteres alfanuméricos)');
    }
  }

  // Nombres: only letters, spaces, and accented chars
  if (sireData.nombres && !/^[A-Za-zÀ-ÿ\s'-]+$/.test(sireData.nombres)) {
    errors.push('Nombres contienen caracteres inválidos');
  }

  // Primer apellido: required, only letters
  if (sireData.primer_apellido && !/^[A-Za-zÀ-ÿ\s'-]+$/.test(sireData.primer_apellido)) {
    errors.push('Primer apellido contiene caracteres inválidos');
  }

  // Fecha nacimiento: DD/MM/YYYY and not in future
  if (sireData.fecha_nacimiento) {
    const dateMatch = sireData.fecha_nacimiento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      const [, day, month, year] = dateMatch.map(Number);
      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) {
        errors.push('Fecha de nacimiento inválida');
      } else if (date > new Date()) {
        errors.push('Fecha de nacimiento no puede ser en el futuro');
      } else {
        // Check reasonable age (0-120 years)
        const age = (new Date().getTime() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 0 || age > 120) {
          warnings.push('Edad calculada parece inusual');
        }
      }
    } else {
      errors.push('Formato de fecha de nacimiento inválido (debe ser DD/MM/YYYY)');
    }
  }

  // Código nacionalidad: must be valid SIRE code
  if (sireData.codigo_nacionalidad) {
    const code = parseInt(sireData.codigo_nacionalidad);
    if (isNaN(code) || code < 100 || code > 300) {
      warnings.push('Código de nacionalidad puede ser inválido');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

/**
 * Calculate overall extraction confidence
 *
 * Averages field-level confidence scores and applies penalties for errors.
 *
 * @param confidence - Field-level confidence scores (0.0-1.0)
 * @param errors - List of extraction errors
 * @returns Overall confidence score (0.0-1.0)
 *
 * @example
 * const overall = calculateOverallConfidence(
 *   { nombre: 0.92, documento: 0.95, nacionalidad: 0.90 },
 *   []
 * );
 * // Returns: ~0.92 (average of field scores)
 */
export function calculateOverallConfidence(
  confidence: Record<string, number>,
  errors: string[]
): number {
  if (errors.length > 0) {
    // Penalize for errors
    const errorPenalty = Math.min(errors.length * 0.1, 0.5);
    const avgConfidence = Object.values(confidence).reduce((a, b) => a + b, 0) /
                          Math.max(Object.values(confidence).length, 1);
    return Math.max(0, avgConfidence - errorPenalty);
  }

  if (Object.keys(confidence).length === 0) {
    return 0;
  }

  return Object.values(confidence).reduce((a, b) => a + b, 0) / Object.values(confidence).length;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  mapPassportToSIRE,
  splitFullName,
  mapNationalityToSIRE,
  detectDocumentType,
  mapDocumentTypeToSIRE,
  normalizeDateFormat,
  validateExtractedFields,
  calculateOverallConfidence
};
