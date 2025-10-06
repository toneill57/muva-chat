/**
 * SIRE Country Mapping
 *
 * ISO 3166-1 numeric country codes for SIRE compliance.
 *
 * Fuente: docs/sire/CODIGOS_OFICIALES.md
 * Estándar: ISO 3166-1 numeric
 * URL: https://en.wikipedia.org/wiki/ISO_3166-1_numeric
 *
 * IMPORTANTE: Esta lista es provisional basada en ISO 3166-1.
 * Verificar con catálogo oficial MinCIT antes de producción.
 */

/**
 * Country name (Spanish) to ISO 3166-1 numeric code
 *
 * Top 100 countries by relevance to Colombian tourism
 */
export const SIRE_COUNTRY_CODES: Record<string, string> = {
  // Americas - High Volume
  'Estados Unidos': '840',
  'Colombia': '170',
  'México': '484',
  'Canadá': '124',
  'Argentina': '032',
  'Brasil': '076',
  'Chile': '152',
  'Perú': '604',
  'Ecuador': '218',
  'Venezuela': '862',
  'Costa Rica': '188',
  'Panamá': '591',
  'Uruguay': '858',
  'Bolivia': '068',
  'Paraguay': '600',
  'Guatemala': '320',
  'Honduras': '340',
  'El Salvador': '222',
  'Nicaragua': '558',
  'Cuba': '192',
  'República Dominicana': '214',
  'Puerto Rico': '630',
  'Jamaica': '388',

  // Europe - High Volume
  'España': '724',
  'Francia': '250',
  'Alemania': '276',
  'Reino Unido': '826',
  'Italia': '380',
  'Portugal': '620',
  'Países Bajos': '528',
  'Bélgica': '056',
  'Suiza': '756',
  'Austria': '040',
  'Suecia': '752',
  'Noruega': '578',
  'Dinamarca': '208',
  'Finlandia': '246',
  'Polonia': '616',
  'Grecia': '300',
  'Irlanda': '372',
  'República Checa': '203',
  'Hungría': '348',
  'Rumania': '642',
  'Rusia': '643',
  'Ucrania': '804',

  // Asia - Medium Volume
  'China': '156',
  'Japón': '392',
  'Corea del Sur': '410',
  'India': '356',
  'Tailandia': '764',
  'Singapur': '702',
  'Malasia': '458',
  'Indonesia': '360',
  'Filipinas': '608',
  'Vietnam': '704',
  'Pakistán': '586',
  'Bangladesh': '050',
  'Taiwán': '158',
  'Hong Kong': '344',

  // Middle East - Medium Volume
  'Turquía': '792',
  'Israel': '376',
  'Emiratos Árabes Unidos': '784',
  'Arabia Saudita': '682',
  'Líbano': '422',
  'Jordania': '400',
  'Irán': '364',
  'Irak': '368',

  // Africa - Low Volume
  'Sudáfrica': '710',
  'Egipto': '818',
  'Marruecos': '504',
  'Nigeria': '566',
  'Kenia': '404',
  'Ghana': '288',
  'Etiopía': '231',
  'Argelia': '012',
  'Túnez': '788',

  // Oceania
  'Australia': '036',
  'Nueva Zelanda': '554',

  // Additional European
  'Luxemburgo': '442',
  'Islandia': '352',
  'Estonia': '233',
  'Letonia': '428',
  'Lituania': '440',
  'Eslovaquia': '703',
  'Eslovenia': '705',
  'Croacia': '191',
  'Serbia': '688',
  'Bulgaria': '100',

  // Additional Asian
  'Kazajistán': '398',
  'Uzbekistán': '860',
  'Azerbaiyán': '031',
  'Georgia': '268',
  'Nepal': '524',
  'Sri Lanka': '144',
  'Myanmar': '104',
  'Camboya': '116',

  // Additional Latin American
  'Guyana': '328',
  'Surinam': '740',
  'Belice': '084',
  'Bahamas': '044',
  'Barbados': '052',
  'Trinidad y Tobago': '780',

  // Unknown/Other
  'Otro': '999'
};

/**
 * Reverse mapping: ISO code to country name (Spanish)
 */
export const SIRE_CODE_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(SIRE_COUNTRY_CODES).map(([name, code]) => [code, name])
);

/**
 * Get ISO 3166-1 numeric code from country name (Spanish)
 *
 * @param countryName - Country name in Spanish
 * @returns ISO 3166-1 numeric code (3 digits)
 * @throws Error if country not found
 */
export function getCountryCode(countryName: string): string {
  const code = SIRE_COUNTRY_CODES[countryName];

  if (!code) {
    throw new Error(
      `País no encontrado en catálogo SIRE: "${countryName}". ` +
      `Países disponibles: ${Object.keys(SIRE_COUNTRY_CODES).slice(0, 10).join(', ')}...`
    );
  }

  return code;
}

/**
 * Get country name (Spanish) from ISO code
 *
 * @param code - ISO 3166-1 numeric code
 * @returns Country name in Spanish
 * @throws Error if code not found
 */
export function getCountryName(code: string): string {
  const name = SIRE_CODE_TO_COUNTRY[code];

  if (!name) {
    throw new Error(`Código ISO no encontrado: ${code}`);
  }

  return name;
}

/**
 * Validate country code format
 *
 * @param code - ISO 3166-1 numeric code to validate
 * @returns true if valid format
 */
export function isValidCountryCode(code: string): boolean {
  // Must be 1-3 digits
  return /^[0-9]{1,3}$/.test(code);
}

/**
 * Search countries by partial name (case-insensitive)
 *
 * @param query - Search query
 * @returns Array of matching countries with codes
 */
export function searchCountries(query: string): Array<{ name: string; code: string }> {
  const lowerQuery = query.toLowerCase();

  return Object.entries(SIRE_COUNTRY_CODES)
    .filter(([name]) => name.toLowerCase().includes(lowerQuery))
    .map(([name, code]) => ({ name, code }))
    .slice(0, 20); // Limit to 20 results
}

/**
 * Get all countries sorted alphabetically
 */
export function getAllCountries(): Array<{ name: string; code: string }> {
  return Object.entries(SIRE_COUNTRY_CODES)
    .map(([name, code]) => ({ name, code }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/**
 * Common aliases for country names (for NER/entity extraction)
 *
 * Maps English and alternative Spanish names to canonical Spanish name
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  // English to Spanish
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'US': 'Estados Unidos',
  'America': 'Estados Unidos',
  'Spain': 'España',
  'Germany': 'Alemania',
  'France': 'Francia',
  'Italy': 'Italia',
  'United Kingdom': 'Reino Unido',
  'UK': 'Reino Unido',
  'Great Britain': 'Reino Unido',
  'England': 'Reino Unido',
  'Brazil': 'Brasil',
  'Mexico': 'México',
  'Canada': 'Canadá',
  'Argentina': 'Argentina',
  'Chile': 'Chile',
  'Peru': 'Perú',
  'Ecuador': 'Ecuador',
  'Venezuela': 'Venezuela',
  'China': 'China',
  'Japan': 'Japón',
  'South Korea': 'Corea del Sur',
  'Australia': 'Australia',
  'New Zealand': 'Nueva Zelanda',

  // Alternative Spanish names
  'EEUU': 'Estados Unidos',
  'EE.UU.': 'Estados Unidos',
  'U.S.A.': 'Estados Unidos',
  'Holanda': 'Países Bajos',
  'Holland': 'Países Bajos',
  'Netherlands': 'Países Bajos',
  'Rusia': 'Rusia',
  'Russia': 'Rusia',
  'Corea': 'Corea del Sur',
  'Korea': 'Corea del Sur'
};

/**
 * Normalize country name using aliases
 *
 * @param input - Country name (English or Spanish, various formats)
 * @returns Canonical Spanish name for SIRE
 */
export function normalizeCountryName(input: string): string {
  const trimmed = input.trim();

  // Check if already canonical
  if (SIRE_COUNTRY_CODES[trimmed]) {
    return trimmed;
  }

  // Check aliases
  const canonical = COUNTRY_ALIASES[trimmed];
  if (canonical) {
    return canonical;
  }

  // Case-insensitive search in canonical names
  const lowerInput = trimmed.toLowerCase();
  for (const [name] of Object.entries(SIRE_COUNTRY_CODES)) {
    if (name.toLowerCase() === lowerInput) {
      return name;
    }
  }

  // Case-insensitive search in aliases
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    if (alias.toLowerCase() === lowerInput) {
      return canonical;
    }
  }

  // Not found
  throw new Error(
    `No se pudo normalizar el país: "${input}". ` +
    `Países válidos: ${Object.keys(SIRE_COUNTRY_CODES).slice(0, 10).join(', ')}...`
  );
}
