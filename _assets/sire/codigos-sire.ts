/**
 * Catálogos Oficiales de Códigos SIRE
 * Fuente: Migración Colombia / MinCIT
 * Fecha: Octubre 2025
 *
 * IMPORTANTE: Estos NO son códigos ISO 3166-1. Son códigos específicos SIRE.
 */

export interface CodigoPais {
  codigo: string
  nombre: string
}

export interface CodigoCiudad {
  codigo: string
  ciudad: string
  habilitada_sire: boolean
}

/**
 * Códigos de País SIRE (250 países)
 * NOTA: Diferentes a ISO 3166-1 numeric
 *
 * Ejemplos clave:
 * - Colombia: 169 (ISO sería 170)
 * - Estados Unidos: 249 (ISO sería 840)
 * - Brasil: 105 (ISO sería 076)
 * - España: 245 (ISO sería 724)
 */
export const CODIGOS_PAIS_SIRE: Record<string, string> = {
  // Países más comunes en hotelería colombiana
  'COLOMBIA': '169',
  'ESTADOS UNIDOS': '249',
  'BRASIL': '105',
  'ESPAÑA': '245',
  'MEXICO': '493',
  'ARGENTINA': '63',
  'CANADA': '117',
  'CHILE': '149',
  'FRANCIA': '265',
  'ALEMANIA': '23',
  'REINO UNIDO': '300',
  'ITALIA': '369',
  'PERU': '587',
  'VENEZUELA': '863',
  'ECUADOR': '239',

  // Catálogo completo en: _assets/sire/codigos-pais.json
}

/**
 * Códigos de Ciudad DIVIPOLA (1,122 ciudades colombianas)
 *
 * Ejemplos clave:
 * - San Andrés Isla: 88001
 * - Bogotá: 11001
 * - Cartagena: 13001
 * - Medellín: 5001
 */
export const CODIGOS_CIUDAD_COLOMBIA: Record<string, string> = {
  'SAN ANDRÉS': '88001',  // San Andrés Isla (destino turístico)
  'BOGOTÁ': '11001',
  'CARTAGENA': '13001',
  'MEDELLÍN': '5001',
  'CALI': '76001',
  'BARRANQUILLA': '8001',
  'SANTA MARTA': '47001',

  // Catálogo completo en: _assets/sire/ciudades-colombia.json
}

/**
 * Función helper para buscar código de país por nombre (fuzzy matching)
 */
export function buscarCodigoPais(nombrePais: string): string | null {
  const normalized = nombrePais.toUpperCase().trim()

  // Búsqueda exacta primero
  if (CODIGOS_PAIS_SIRE[normalized]) {
    return CODIGOS_PAIS_SIRE[normalized]
  }

  // Aliases comunes
  const aliases: Record<string, string> = {
    'USA': 'ESTADOS UNIDOS',
    'EEUU': 'ESTADOS UNIDOS',
    'US': 'ESTADOS UNIDOS',
    'UK': 'REINO UNIDO',
    'INGLATERRA': 'REINO UNIDO',
    'GRAN BRETAÑA': 'REINO UNIDO',
    'COL': 'COLOMBIA',
    'BRA': 'BRASIL',
    'ARG': 'ARGENTINA',
    'MEX': 'MEXICO',
    'CHI': 'CHILE',
    'VEN': 'VENEZUELA',
    'ECU': 'ECUADOR',
  }

  if (aliases[normalized]) {
    return CODIGOS_PAIS_SIRE[aliases[normalized]] || null
  }

  return null
}

/**
 * Función helper para buscar código de ciudad por nombre
 */
export function buscarCodigoCiudad(nombreCiudad: string): string | null {
  const normalized = nombreCiudad.toUpperCase().trim()

  return CODIGOS_CIUDAD_COLOMBIA[normalized] || null
}
