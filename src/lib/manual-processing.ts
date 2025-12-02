/**
 * MANUAL PROCESSING - Accommodation Manuals Chunking Library
 *
 * Converts markdown files into optimized chunks for Matryoshka embeddings.
 * Based on chunking strategy documented in:
 * docs/accommodation-manuals/fase-0/CHUNKING_STRATEGY.md
 *
 * @module manual-processing
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 1500, // Tamaño ideal por chunk (~400 tokens)
  MIN_CHUNK_SIZE: 300, // Evitar chunks muy pequeños
  OVERLAP: 0, // Sin overlap (headers proveen contexto)
} as const

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Represents a single chunk with metadata
 */
export interface ManualChunk {
  content: string // Contenido del chunk (markdown)
  section_title: string // Título de la sección (extraído de ## Header)
  chunk_index: number // Índice secuencial (0, 1, 2...)
}

/**
 * Represents the processed manual with all chunks
 */
export interface ProcessedManual {
  chunks: ManualChunk[]
  total_chunks: number
  filename: string
  file_type: string
}

/**
 * Internal interface for section extraction
 */
interface Section {
  title: string // Título extraído de ## Header
  content: string // Contenido de la sección (sin el header)
  rawHeader: string // Header original completo
}

/**
 * Internal interface for chunk candidates
 */
interface ChunkCandidate {
  content: string
  section_title: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts sections from markdown based on ## headers
 *
 * @param markdown - Normalized markdown content
 * @returns Array of sections with titles and content
 */
function extractSections(markdown: string): Section[] {
  const sections: Section[] = []

  // Regex para capturar ## headers (nivel 2)
  const headerRegex = /^## (.+)$/gm
  const matches = [...markdown.matchAll(headerRegex)]

  if (matches.length === 0) {
    // No hay headers → retornar como sección única "General"
    const trimmedContent = markdown.trim()
    if (trimmedContent.length === 0) {
      return [] // Contenido vacío
    }
    return [
      {
        title: 'General',
        content: trimmedContent,
        rawHeader: '',
      },
    ]
  }

  // Procesar cada sección
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const title = match[1].trim()
    const startIdx = match.index! + match[0].length
    const endIdx = i < matches.length - 1 ? matches[i + 1].index! : markdown.length

    const content = markdown.slice(startIdx, endIdx).trim()

    // Solo agregar secciones con contenido
    if (content.length > 0) {
      sections.push({
        title,
        content,
        rawHeader: match[0],
      })
    }
  }

  return sections
}

/**
 * Processes a single section, splitting into sub-chunks if needed
 *
 * @param section - Section to process
 * @returns Array of chunk candidates
 */
function processSection(section: Section): ChunkCandidate[] {
  const { MAX_CHUNK_SIZE, MIN_CHUNK_SIZE } = CHUNK_CONFIG

  // Si la sección completa cabe en un chunk
  if (section.content.length <= MAX_CHUNK_SIZE) {
    return [
      {
        content: section.content,
        section_title: section.title,
      },
    ]
  }

  // Necesita sub-split → dividir por párrafos
  const paragraphs = section.content.split(/\n\n+/)
  const chunks: ChunkCandidate[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim()
    if (!paragraphTrimmed) continue

    // Verificar si agregar este párrafo excede MAX_SIZE
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
          section_title: section.title,
        })
      }
      currentChunk = paragraphTrimmed

      // Edge case: párrafo único muy largo (> MAX_CHUNK_SIZE)
      // Lo incluimos de todas formas para no perder contenido
      if (currentChunk.length > MAX_CHUNK_SIZE) {
        console.warn(
          `⚠️  Paragraph exceeds MAX_CHUNK_SIZE: ${currentChunk.length} chars ` +
            `(section: "${section.title}")`
        )
      }
    }
  }

  // Agregar último chunk si existe
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk,
      section_title: section.title,
    })
  }

  return chunks
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Processes a markdown file buffer into optimized chunks
 *
 * Chunking strategy:
 * 1. Split by ## headers (section-level granularity)
 * 2. Sub-split sections > 1500 chars by paragraphs
 * 3. Maintain section_title metadata for all chunks
 * 4. Assign sequential chunk_index
 *
 * @param buffer - File buffer containing markdown content
 * @param filename - Original filename (for metadata)
 * @returns Processed manual with chunks and metadata
 * @throws Error if buffer is invalid or content is empty
 *
 * @example
 * ```typescript
 * const buffer = fs.readFileSync('manual.md')
 * const result = await processMarkdown(buffer, 'manual.md')
 * console.log(`Generated ${result.total_chunks} chunks`)
 * ```
 */
export async function processMarkdown(
  buffer: Buffer,
  filename: string
): Promise<ProcessedManual> {
  // 1. Validar buffer
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Invalid input: expected Buffer')
  }

  // 2. Convert buffer to UTF-8 string
  const content = buffer.toString('utf-8')

  // 3. Validar contenido no vacío
  if (!content || content.trim().length === 0) {
    throw new Error('Cannot process empty markdown file')
  }

  // 4. Normalizar saltos de línea (Windows → Unix)
  const normalized = content.replace(/\r\n/g, '\n')

  // 5. Detectar secciones por ## headers
  const sections = extractSections(normalized)

  // 6. Procesar cada sección
  const chunks: ManualChunk[] = []
  let chunkIndex = 0

  for (const section of sections) {
    const sectionChunks = processSection(section)

    // Asignar índices secuenciales y agregar a resultado
    for (const chunk of sectionChunks) {
      chunks.push({
        content: chunk.content,
        section_title: chunk.section_title,
        chunk_index: chunkIndex++,
      })
    }
  }

  // 7. Validar que se generaron chunks
  if (chunks.length === 0) {
    throw new Error('No chunks generated from markdown file')
  }

  // 8. Retornar resultado
  return {
    chunks,
    total_chunks: chunks.length,
    filename,
    file_type: 'md',
  }
}

// ============================================================================
// VALIDATION UTILITIES (for API usage)
// ============================================================================

/**
 * Validates a chunk before saving to database
 *
 * @param chunk - Chunk to validate
 * @returns true if valid
 * @throws Error if chunk is invalid
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
        `${chunk.content.length} chars (max: 1500)`
    )
  }

  return true
}

/**
 * Validates processed manual before saving to database
 *
 * @param processed - Processed manual to validate
 * @returns true if valid
 * @throws Error if invalid
 */
export function validateProcessedManual(processed: ProcessedManual): boolean {
  if (processed.chunks.length === 0) {
    throw new Error('ProcessedManual has no chunks')
  }

  if (processed.total_chunks !== processed.chunks.length) {
    throw new Error(
      `Mismatch: total_chunks (${processed.total_chunks}) !== ` +
        `chunks.length (${processed.chunks.length})`
    )
  }

  if (!processed.filename || processed.filename.trim().length === 0) {
    throw new Error('ProcessedManual has empty filename')
  }

  if (processed.file_type !== 'md') {
    throw new Error(`Invalid file_type: ${processed.file_type} (expected "md")`)
  }

  // Validar cada chunk
  for (const chunk of processed.chunks) {
    validateChunk(chunk)
  }

  return true
}
