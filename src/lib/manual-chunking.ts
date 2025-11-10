/**
 * MANUAL CHUNKING - Accommodation Manuals
 *
 * Procesa archivos markdown de manuales de alojamiento y los divide en chunks
 * optimizados para generar embeddings Matryoshka.
 *
 * Documentación completa: docs/accommodation-manuals/fase-0/CHUNKING_STRATEGY.md
 *
 * @module manual-chunking
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 1500,        // Tamaño ideal por chunk
  MIN_CHUNK_SIZE: 300,         // Evitar chunks muy pequeños
  OVERLAP: 0,                   // Sin overlap (headers ya proveen contexto)
  SECTION_SEPARATOR: /^## /gm, // Headers nivel 2
  PARAGRAPH_SEPARATOR: /\n\n+/  // Doble salto de línea
} as const

// ============================================================================
// TYPES
// ============================================================================

/**
 * Chunk de manual con metadata extraída
 */
export interface ManualChunk {
  content: string       // Contenido del chunk (markdown)
  section_title: string // Título de la sección (extraído de ## Header)
  chunk_index: number   // Índice secuencial (0, 1, 2...)
}

/**
 * Sección extraída del markdown
 */
interface Section {
  title: string    // Título extraído de ## Header
  content: string  // Contenido de la sección (sin el header)
  rawHeader: string // Header original completo
}

/**
 * Chunk candidato (sin índice asignado)
 */
interface ChunkCandidate {
  content: string
  section_title: string
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Procesa un archivo markdown y lo divide en chunks optimizados
 * para generar embeddings Matryoshka.
 *
 * Estrategia:
 * 1. Split por headers nivel 2 (## Section)
 * 2. Si sección > 1500 chars, sub-split por párrafos
 * 3. Mantener section_title en todos los chunks de la misma sección
 * 4. Asignar chunk_index secuencial
 *
 * @param markdownContent - Contenido completo del archivo .md
 * @returns Array de chunks con metadata
 *
 * @example
 * ```typescript
 * const markdown = `
 * ## Políticas de Check-in
 * El check-in es a partir de las 15:00 horas.
 *
 * ## Servicios
 * WiFi gratuito disponible.
 * `
 *
 * const chunks = chunkMarkdown(markdown)
 * // [
 * //   { content: "El check-in...", section_title: "Políticas de Check-in", chunk_index: 0 },
 * //   { content: "WiFi gratuito...", section_title: "Servicios", chunk_index: 1 }
 * // ]
 * ```
 */
export function chunkMarkdown(markdownContent: string): ManualChunk[] {
  // Validación de input
  if (!markdownContent || !markdownContent.trim()) {
    return []
  }

  const chunks: ManualChunk[] = []
  let chunkIndex = 0

  // 1. Normalizar saltos de línea
  const normalized = markdownContent.replace(/\r\n/g, '\n')

  // 2. Detectar secciones por ## headers
  const sections = extractSections(normalized)

  // 3. Procesar cada sección
  for (const section of sections) {
    const sectionChunks = processSection(section)

    // 4. Asignar índices secuenciales y agregar a resultado
    for (const chunk of sectionChunks) {
      chunks.push({
        content: chunk.content,
        section_title: chunk.section_title,
        chunk_index: chunkIndex++
      })
    }
  }

  return chunks
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extrae secciones del markdown basándose en headers nivel 2 (## )
 *
 * Si el markdown NO tiene headers nivel 2, retorna una sección única
 * con title "General".
 *
 * @param markdown - Contenido markdown normalizado
 * @returns Array de secciones
 */
function extractSections(markdown: string): Section[] {
  const sections: Section[] = []

  // Regex para capturar ## headers
  const headerRegex = /^## (.+)$/gm
  const matches = Array.from(markdown.matchAll(headerRegex))

  if (matches.length === 0) {
    // No hay headers → retornar como sección única "General"
    const trimmed = markdown.trim()
    if (!trimmed) return []

    return [{
      title: 'General',
      content: trimmed,
      rawHeader: ''
    }]
  }

  // Procesar cada sección
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const title = match[1].trim()
    const startIdx = match.index! + match[0].length
    const endIdx = i < matches.length - 1
      ? matches[i + 1].index!
      : markdown.length

    const content = markdown.slice(startIdx, endIdx).trim()

    // Solo agregar secciones con contenido
    if (content) {
      sections.push({
        title,
        content,
        rawHeader: match[0]
      })
    }
  }

  return sections
}

/**
 * Procesa una sección y la divide en chunks si excede MAX_CHUNK_SIZE
 *
 * Estrategia:
 * - Si sección <= MAX_CHUNK_SIZE: retornar 1 chunk
 * - Si sección > MAX_CHUNK_SIZE: dividir por párrafos (split en \n\n)
 * - Mantener mismo section_title para todos los sub-chunks
 * - No cortar en medio de párrafo
 *
 * @param section - Sección a procesar
 * @returns Array de chunks candidatos (sin índice)
 */
function processSection(section: Section): ChunkCandidate[] {
  const { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE } = CHUNK_CONFIG

  // Si la sección completa cabe en un chunk
  if (section.content.length <= MAX_CHUNK_SIZE) {
    return [{
      content: section.content,
      section_title: section.title
    }]
  }

  // Necesita sub-split → dividir por párrafos
  const paragraphs = section.content.split(/\n\n+/)
  const chunks: ChunkCandidate[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim()
    if (!paragraphTrimmed) continue

    // Verificar si agregar este párrafo excede MAX_CHUNK_SIZE
    const potentialChunk = currentChunk
      ? currentChunk + '\n\n' + paragraphTrimmed
      : paragraphTrimmed

    if (potentialChunk.length <= MAX_CHUNK_SIZE) {
      // Cabe → agregar al chunk actual
      currentChunk = potentialChunk
    } else {
      // No cabe → guardar chunk actual y empezar nuevo
      if (currentChunk.length >= MIN_CHUNK_SIZE) {
        chunks.push({
          content: currentChunk,
          section_title: section.title
        })
      } else if (currentChunk) {
        // Chunk muy pequeño → intentar unir con siguiente
        // (solo si el siguiente tampoco cabe, guardar el pequeño)
        chunks.push({
          content: currentChunk,
          section_title: section.title
        })
      }

      currentChunk = paragraphTrimmed
    }
  }

  // Agregar último chunk si existe
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      section_title: section.title
    })
  }

  // Si no se generaron chunks (edge case), retornar sección completa
  if (chunks.length === 0) {
    return [{
      content: section.content,
      section_title: section.title
    }]
  }

  return chunks
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Valida un chunk antes de guardarlo en DB
 *
 * Validaciones:
 * 1. Contenido no vacío
 * 2. section_title no vacío
 * 3. chunk_index >= 0
 * 4. Warning si chunk > 2000 chars
 *
 * @param chunk - Chunk a validar
 * @throws Error si el chunk no es válido
 * @returns true si el chunk es válido
 */
export function validateChunk(chunk: ManualChunk): boolean {
  // 1. Contenido no vacío
  if (!chunk.content.trim()) {
    throw new Error(`Chunk ${chunk.chunk_index} has empty content`)
  }

  // 2. section_title no vacío
  if (!chunk.section_title.trim()) {
    throw new Error(`Chunk ${chunk.chunk_index} has empty section_title`)
  }

  // 3. chunk_index >= 0
  if (chunk.chunk_index < 0) {
    throw new Error(`Invalid chunk_index: ${chunk.chunk_index}`)
  }

  // 4. Tamaño razonable (warning si > 2000 chars)
  if (chunk.content.length > 2000) {
    console.warn(
      `⚠️  Chunk ${chunk.chunk_index} exceeds recommended size: ` +
      `${chunk.content.length} chars (recommended max: 1500)`
    )
  }

  return true
}

/**
 * Valida un array de chunks completo
 *
 * @param chunks - Array de chunks a validar
 * @throws Error si algún chunk no es válido
 * @returns true si todos los chunks son válidos
 */
export function validateChunks(chunks: ManualChunk[]): boolean {
  if (!chunks || chunks.length === 0) {
    throw new Error('Chunks array is empty')
  }

  for (const chunk of chunks) {
    validateChunk(chunk)
  }

  return true
}

// ============================================================================
// STATS & DEBUGGING
// ============================================================================

/**
 * Genera estadísticas sobre los chunks generados
 *
 * @param chunks - Array de chunks
 * @returns Objeto con estadísticas
 */
export function getChunkStats(chunks: ManualChunk[]) {
  if (!chunks || chunks.length === 0) {
    return {
      total_chunks: 0,
      total_chars: 0,
      avg_chunk_size: 0,
      min_chunk_size: 0,
      max_chunk_size: 0,
      sections: []
    }
  }

  const sizes = chunks.map(c => c.content.length)
  const sections = Array.from(new Set(chunks.map(c => c.section_title)))

  return {
    total_chunks: chunks.length,
    total_chars: sizes.reduce((a, b) => a + b, 0),
    avg_chunk_size: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length),
    min_chunk_size: Math.min(...sizes),
    max_chunk_size: Math.max(...sizes),
    sections: sections.map(section => ({
      title: section,
      chunk_count: chunks.filter(c => c.section_title === section).length
    }))
  }
}
