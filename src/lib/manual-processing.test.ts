/**
 * UNIT TESTS - Manual Processing Library
 *
 * Tests for src/lib/manual-processing.ts
 * Validates markdown chunking, validation, and error handling
 *
 * Run: pnpm test src/lib/manual-processing.test.ts
 * Coverage: pnpm test src/lib/manual-processing.test.ts --coverage
 */

import { describe, it, expect, jest } from '@jest/globals'
import {
  processMarkdown,
  validateChunk,
  validateProcessedManual,
  type ManualChunk,
  type ProcessedManual,
} from './manual-processing'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8')
}

// ============================================================================
// TEST 1: BASIC CHUNKING (1 chunk)
// ============================================================================

describe('processMarkdown - Basic Chunking', () => {
  it('should process simple markdown with 1 section into 1 chunk', async () => {
    const markdown = `## Welcome

This is a simple welcome message for our hotel.`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'test.md')

    expect(result.total_chunks).toBe(1)
    expect(result.filename).toBe('test.md')
    expect(result.file_type).toBe('md')
    expect(result.chunks).toHaveLength(1)

    const chunk = result.chunks[0]
    expect(chunk.section_title).toBe('Welcome')
    expect(chunk.chunk_index).toBe(0)
    expect(chunk.content).toContain('simple welcome message')
  })

  it('should process plain text without headers as "General" section', async () => {
    const plainText = `This is just plain text.

No headers here.

Just regular paragraphs.`

    const buffer = createBuffer(plainText)
    const result = await processMarkdown(buffer, 'plain.md')

    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].section_title).toBe('General')
    expect(result.chunks[0].chunk_index).toBe(0)
  })
})

// ============================================================================
// TEST 2: MULTIPLE CHUNKING (markdown headers)
// ============================================================================

describe('processMarkdown - Multiple Chunks', () => {
  it('should process markdown with multiple ## headers into separate chunks', async () => {
    const markdown = `## Check-in

Check-in time is 3:00 PM. Please bring valid ID.

## WiFi

Network: HotelGuest
Password: welcome123

## Check-out

Check-out time is 12:00 PM.`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'policies.md')

    expect(result.total_chunks).toBe(3)
    expect(result.chunks).toHaveLength(3)

    // Verify chunk 0
    expect(result.chunks[0].section_title).toBe('Check-in')
    expect(result.chunks[0].chunk_index).toBe(0)
    expect(result.chunks[0].content).toContain('3:00 PM')

    // Verify chunk 1
    expect(result.chunks[1].section_title).toBe('WiFi')
    expect(result.chunks[1].chunk_index).toBe(1)
    expect(result.chunks[1].content).toContain('HotelGuest')

    // Verify chunk 2
    expect(result.chunks[2].section_title).toBe('Check-out')
    expect(result.chunks[2].chunk_index).toBe(2)
    expect(result.chunks[2].content).toContain('12:00 PM')
  })

  it('should split large sections (> 1500 chars) into multiple chunks', async () => {
    const longParagraph1 = 'Paragraph 1. '.repeat(100) // ~1300 chars
    const longParagraph2 = 'Paragraph 2. '.repeat(100) // ~1300 chars
    const longParagraph3 = 'Paragraph 3. '.repeat(100) // ~1300 chars

    const markdown = `## Long Section

${longParagraph1}

${longParagraph2}

${longParagraph3}`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'long.md')

    expect(result.total_chunks).toBeGreaterThan(1)

    // All chunks should have same section_title
    for (const chunk of result.chunks) {
      expect(chunk.section_title).toBe('Long Section')
    }

    // Chunk indices should be sequential
    expect(result.chunks[0].chunk_index).toBe(0)
    expect(result.chunks[1].chunk_index).toBe(1)
    if (result.chunks.length > 2) {
      expect(result.chunks[2].chunk_index).toBe(2)
    }
  })

  it('should preserve headers level 3+ in chunk content', async () => {
    const markdown = `## Services

### Breakfast
Included from 7:00 to 10:00

### Pool
Open 24/7`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'services.md')

    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].section_title).toBe('Services')
    expect(result.chunks[0].content).toContain('### Breakfast')
    expect(result.chunks[0].content).toContain('### Pool')
  })
})

// ============================================================================
// TEST 3: ERROR HANDLING - Empty file
// ============================================================================

describe('processMarkdown - Error Handling', () => {
  it('should throw error for empty buffer', async () => {
    const emptyBuffer = createBuffer('')

    await expect(processMarkdown(emptyBuffer, 'empty.md')).rejects.toThrow(
      'Cannot process empty markdown file'
    )
  })

  it('should throw error for whitespace-only buffer', async () => {
    const whitespaceBuffer = createBuffer('   \n\n   \t\t   ')

    await expect(processMarkdown(whitespaceBuffer, 'whitespace.md')).rejects.toThrow(
      'Cannot process empty markdown file'
    )
  })

  it('should throw error for headers without content', async () => {
    const headersOnly = createBuffer('## Section 1\n## Section 2\n## Section 3')

    await expect(processMarkdown(headersOnly, 'headers-only.md')).rejects.toThrow(
      'No chunks generated from markdown file'
    )
  })

  it('should throw error for invalid buffer type', async () => {
    const invalidBuffer = 'not a buffer' as any

    await expect(processMarkdown(invalidBuffer, 'invalid.md')).rejects.toThrow(
      'Invalid input: expected Buffer'
    )
  })
})

// ============================================================================
// TEST 4: LARGE FILE (> 1MB)
// ============================================================================

describe('processMarkdown - Large Files', () => {
  it('should process large markdown file (> 1MB) successfully', async () => {
    // Generate ~1.2MB of content
    const sections = []
    for (let i = 0; i < 100; i++) {
      const sectionContent = `This is section ${i}. `.repeat(600) // ~30KB per section
      sections.push(`## Section ${i}\n\n${sectionContent}`)
    }

    const largeMarkdown = sections.join('\n\n')
    const buffer = createBuffer(largeMarkdown)

    expect(buffer.length).toBeGreaterThan(1024 * 1024) // > 1MB

    const result = await processMarkdown(buffer, 'large.md')

    expect(result.total_chunks).toBeGreaterThan(0)
    expect(result.chunks).toHaveLength(result.total_chunks)

    // Verify all chunks have valid metadata
    for (let i = 0; i < result.chunks.length; i++) {
      expect(result.chunks[i].chunk_index).toBe(i)
      expect(result.chunks[i].section_title).toBeTruthy()
      expect(result.chunks[i].content).toBeTruthy()
    }
  })

  it('should handle many small sections efficiently', async () => {
    const sections = []
    for (let i = 0; i < 100; i++) {
      sections.push(`## Section ${i}\n\nShort content for section ${i}.`)
    }

    const markdown = sections.join('\n\n')
    const buffer = createBuffer(markdown)

    const result = await processMarkdown(buffer, 'many-sections.md')

    expect(result.total_chunks).toBe(100)

    // Verify sequential indices
    for (let i = 0; i < 100; i++) {
      expect(result.chunks[i].chunk_index).toBe(i)
      expect(result.chunks[i].section_title).toBe(`Section ${i}`)
    }
  })
})

// ============================================================================
// TEST 5: VALIDATION FUNCTIONS
// ============================================================================

describe('validateChunk', () => {
  it('should validate valid chunk', () => {
    const validChunk: ManualChunk = {
      content: 'This is valid content',
      section_title: 'Valid Section',
      chunk_index: 0,
    }

    expect(() => validateChunk(validChunk)).not.toThrow()
  })

  it('should throw error for empty content', () => {
    const invalidChunk: ManualChunk = {
      content: '   ',
      section_title: 'Section',
      chunk_index: 0,
    }

    expect(() => validateChunk(invalidChunk)).toThrow('has empty content')
  })

  it('should throw error for empty section_title', () => {
    const invalidChunk: ManualChunk = {
      content: 'Content',
      section_title: '',
      chunk_index: 0,
    }

    expect(() => validateChunk(invalidChunk)).toThrow('has empty section_title')
  })

  it('should throw error for negative chunk_index', () => {
    const invalidChunk: ManualChunk = {
      content: 'Content',
      section_title: 'Section',
      chunk_index: -1,
    }

    expect(() => validateChunk(invalidChunk)).toThrow('Invalid chunk_index')
  })

  it('should warn (not throw) for chunk > 2000 chars', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const largeChunk: ManualChunk = {
      content: 'x'.repeat(2500),
      section_title: 'Large',
      chunk_index: 0,
    }

    expect(() => validateChunk(largeChunk)).not.toThrow()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds recommended size')
    )

    consoleSpy.mockRestore()
  })
})

describe('validateProcessedManual', () => {
  it('should validate valid ProcessedManual', () => {
    const validManual: ProcessedManual = {
      chunks: [
        {
          content: 'Content 1',
          section_title: 'Section 1',
          chunk_index: 0,
        },
      ],
      total_chunks: 1,
      filename: 'test.md',
      file_type: 'md',
    }

    expect(() => validateProcessedManual(validManual)).not.toThrow()
  })

  it('should throw error for empty chunks array', () => {
    const invalidManual: ProcessedManual = {
      chunks: [],
      total_chunks: 0,
      filename: 'test.md',
      file_type: 'md',
    }

    expect(() => validateProcessedManual(invalidManual)).toThrow('has no chunks')
  })

  it('should throw error for mismatch between total_chunks and chunks.length', () => {
    const invalidManual: ProcessedManual = {
      chunks: [
        {
          content: 'Content',
          section_title: 'Section',
          chunk_index: 0,
        },
      ],
      total_chunks: 5, // Mismatch!
      filename: 'test.md',
      file_type: 'md',
    }

    expect(() => validateProcessedManual(invalidManual)).toThrow('Mismatch')
  })

  it('should throw error for empty filename', () => {
    const invalidManual: ProcessedManual = {
      chunks: [
        {
          content: 'Content',
          section_title: 'Section',
          chunk_index: 0,
        },
      ],
      total_chunks: 1,
      filename: '',
      file_type: 'md',
    }

    expect(() => validateProcessedManual(invalidManual)).toThrow('empty filename')
  })

  it('should throw error for invalid file_type', () => {
    const invalidManual: ProcessedManual = {
      chunks: [
        {
          content: 'Content',
          section_title: 'Section',
          chunk_index: 0,
        },
      ],
      total_chunks: 1,
      filename: 'test.pdf',
      file_type: 'pdf' as any, // Invalid type
    }

    expect(() => validateProcessedManual(invalidManual)).toThrow('Invalid file_type')
  })
})

// ============================================================================
// TEST 6: EDGE CASES
// ============================================================================

describe('processMarkdown - Edge Cases', () => {
  it('should handle Windows line endings (CRLF)', async () => {
    const windowsMarkdown = '## Section\r\n\r\nContent with CRLF line endings.\r\n'
    const buffer = createBuffer(windowsMarkdown)

    const result = await processMarkdown(buffer, 'windows.md')

    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].content).not.toContain('\r')
  })

  it('should handle markdown with code blocks', async () => {
    const markdown = `## Configuration

Here's how to configure WiFi:

\`\`\`
SSID: HotelWiFi
Password: secret123
\`\`\`

Enjoy your stay!`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'config.md')

    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].content).toContain('```')
    expect(result.chunks[0].content).toContain('SSID: HotelWiFi')
  })

  it('should handle markdown with lists', async () => {
    const markdown = `## Amenities

- WiFi
- Pool
- Gym
- Spa`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'amenities.md')

    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].content).toContain('- WiFi')
    expect(result.chunks[0].content).toContain('- Spa')
  })

  it('should handle special characters in section titles', async () => {
    const markdown = `## Check-in & Check-out

Times and policies.

## WiFi (5GHz)

Network information.`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'special.md')

    expect(result.total_chunks).toBe(2)
    expect(result.chunks[0].section_title).toBe('Check-in & Check-out')
    expect(result.chunks[1].section_title).toBe('WiFi (5GHz)')
  })

  it('should handle sections with only whitespace content', async () => {
    const markdown = `## Section 1



## Section 2

Real content here.`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'whitespace.md')

    // Section 1 should be skipped (whitespace only)
    expect(result.total_chunks).toBe(1)
    expect(result.chunks[0].section_title).toBe('Section 2')
  })
})

// ============================================================================
// TEST 7: INTEGRATION WITH EMBEDDINGS SYSTEM
// ============================================================================

describe('processMarkdown - Integration Compatibility', () => {
  it('should produce chunks compatible with regenerate-manual-embeddings.ts', async () => {
    const markdown = `## Jacuzzi

To activate the jacuzzi, press the blue button.

## WiFi

Network: Suite123
Password: luxury2024`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'suite.md')

    // Verify structure matches what regenerate-manual-embeddings.ts expects
    for (const chunk of result.chunks) {
      expect(chunk).toHaveProperty('content') // maps to chunk_content
      expect(chunk).toHaveProperty('section_title')
      expect(chunk).toHaveProperty('chunk_index')

      expect(typeof chunk.content).toBe('string')
      expect(typeof chunk.section_title).toBe('string')
      expect(typeof chunk.chunk_index).toBe('number')
    }
  })

  it('should produce chunks with reasonable size for embeddings', async () => {
    const markdown = `## Guide 1

${'This is a paragraph. '.repeat(50)}

## Guide 2

${'Another paragraph. '.repeat(50)}

## Guide 3

${'More content here. '.repeat(50)}`

    const buffer = createBuffer(markdown)
    const result = await processMarkdown(buffer, 'long-guide.md')

    // Most chunks should be under 2000 chars (recommended limit)
    const oversizedChunks = result.chunks.filter(chunk => chunk.content.length > 2000)
    const totalChunks = result.chunks.length

    // Allow up to 50% oversized (for edge cases where single paragraphs are large)
    expect(oversizedChunks.length / totalChunks).toBeLessThan(0.5)
  })
})
