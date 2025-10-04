/**
 * Unit Tests for Conversation Compressor
 *
 * Tests intelligent conversation compression, entity extraction, and embedding generation.
 * Part of Conversation Memory System (Oct 2025).
 */

import {
  compressConversationSegment,
  generateEmbeddingForSummary,
  compressAndEmbed,
  type ConversationSummary,
  type CompressionResult,
} from '../conversation-compressor'

// ============================================================================
// Mock Dependencies
// ============================================================================

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary:
                'El huésped busca un apartamento para 4 personas con cocina equipada y vista al mar. Preguntó sobre disponibilidad para check-in el 15 de octubre, políticas de cancelación y si se permiten mascotas. El asistente confirmó disponibilidad de Suite Ocean View con todas las amenidades solicitadas, explicó la política de cancelación gratuita hasta 48h antes del check-in, y confirmó que se permiten mascotas con cargo adicional de $15/noche.',
              entities: {
                travel_intent: {
                  dates: '2025-10-15 a 2025-10-20',
                  guests: 4,
                  preferences: ['cocina equipada', 'vista al mar', 'mascotas permitidas'],
                },
                topics_discussed: ['disponibilidad', 'amenidades', 'políticas de cancelación', 'mascotas'],
                key_questions: [
                  '¿Disponibilidad para 4 personas?',
                  '¿Política de cancelación?',
                  '¿Permiten mascotas?',
                ],
              },
            }),
          },
        ],
        usage: {
          input_tokens: 450,
          output_tokens: 180,
        },
      }),
    },
  }))
})

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: Array(1024).fill(0.01) }],
      }),
    },
  }))
})

// ============================================================================
// Test Data
// ============================================================================

const mockMessages = [
  {
    role: 'user',
    content: 'Hola, busco apartamento para 4 personas con cocina equipada',
  },
  {
    role: 'assistant',
    content: 'Claro! Tenemos opciones con cocina completa. ¿Para qué fechas?',
  },
  {
    role: 'user',
    content: 'Check-in el 15 de octubre, 5 noches',
  },
  {
    role: 'assistant',
    content: 'Perfecto. Tenemos disponible nuestra Suite Ocean View para esas fechas.',
  },
  {
    role: 'user',
    content: '¿Tiene vista al mar?',
  },
  {
    role: 'assistant',
    content: 'Sí, vista panorámica al mar Caribe con balcón privado.',
  },
  {
    role: 'user',
    content: '¿Cuál es la política de cancelación?',
  },
  {
    role: 'assistant',
    content: 'Cancelación gratuita hasta 48 horas antes del check-in. Después, se cobra la primera noche.',
  },
  {
    role: 'user',
    content: '¿Permiten mascotas?',
  },
  {
    role: 'assistant',
    content: 'Sí, mascotas bienvenidas con cargo adicional de $15/noche.',
  },
]

const mockShortMessages = [
  { role: 'user', content: 'Hola' },
  { role: 'assistant', content: 'Hola! ¿En qué puedo ayudarte?' },
]

const mockEmptyMessages: Array<{ role: string; content: string }> = []

// ============================================================================
// Setup
// ============================================================================

describe('Conversation Compressor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset module cache to clear singleton instances
    jest.resetModules()
  })

  // ============================================================================
  // Tests - compressConversationSegment()
  // ============================================================================

  describe('compressConversationSegment()', () => {
    it('should generate summary of ~200 words', async () => {
      const result = await compressConversationSegment(mockMessages, 'test-session-123')

      expect(result.summary).toBeDefined()
      expect(typeof result.summary).toBe('string')

      const wordCount = result.summary.split(' ').length
      expect(wordCount).toBeGreaterThan(50) // Minimum reasonable summary
      expect(wordCount).toBeLessThan(300) // Maximum as per spec
    })

    it('should extract travel_intent correctly', async () => {
      const result = await compressConversationSegment(mockMessages, 'test-session-456')

      expect(result.entities.travel_intent).toBeDefined()
      expect(result.entities.travel_intent.dates).toBeDefined()
      expect(result.entities.travel_intent.guests).toBeDefined()
      expect(result.entities.travel_intent.preferences).toBeDefined()
      expect(Array.isArray(result.entities.travel_intent.preferences)).toBe(true)
      expect(result.entities.travel_intent.preferences.length).toBeGreaterThan(0)
    })

    it('should extract topics_discussed as array', async () => {
      const result = await compressConversationSegment(mockMessages, 'test-session-789')

      expect(result.entities.topics_discussed).toBeDefined()
      expect(Array.isArray(result.entities.topics_discussed)).toBe(true)
      expect(result.entities.topics_discussed.length).toBeGreaterThan(0)
    })

    it('should extract key_questions as array', async () => {
      const result = await compressConversationSegment(mockMessages, 'test-session-101')

      expect(result.entities.key_questions).toBeDefined()
      expect(Array.isArray(result.entities.key_questions)).toBe(true)
      expect(result.entities.key_questions.length).toBeGreaterThan(0)
    })

    it('should handle short conversations gracefully', async () => {
      const result = await compressConversationSegment(mockShortMessages, 'test-session-short')

      expect(result.summary).toBeDefined()
      expect(result.entities).toBeDefined()
      expect(result.entities.travel_intent).toBeDefined()
      expect(result.entities.topics_discussed).toBeDefined()
      expect(result.entities.key_questions).toBeDefined()
    })

    it('should return fallback summary on Claude API error', async () => {
      // Mock console.error to suppress error logs
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Reset modules to clear singleton
      jest.resetModules()

      // Mock API error by modifying the module mock
      jest.doMock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        }))
      })

      // Re-import module to get new mock
      const { compressConversationSegment: compressWithError } = require('../conversation-compressor')

      const result = await compressWithError(mockMessages, 'test-session-error')

      expect(result.summary).toBeDefined()
      expect(result.summary).toContain('Error al comprimir')
      expect(result.entities.topics_discussed).toContain('error_compression')

      consoleErrorSpy.mockRestore()
      jest.dontMock('@anthropic-ai/sdk')
    })

    it('should return fallback summary on JSON parse error', async () => {
      // Mock console.error to suppress error logs
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Reset modules to clear singleton
      jest.resetModules()

      // Mock invalid JSON response
      jest.doMock('@anthropic-ai/sdk', () => {
        return jest.fn().mockImplementation(() => ({
          messages: {
            create: jest.fn().mockResolvedValue({
              content: [{ type: 'text', text: 'Invalid JSON response' }],
              usage: { input_tokens: 100, output_tokens: 50 },
            }),
          },
        }))
      })

      // Re-import module to get new mock
      const { compressConversationSegment: compressWithParseError } = require('../conversation-compressor')

      const result = await compressWithParseError(mockMessages, 'test-session-parse-error')

      expect(result.summary).toBeDefined()
      expect(result.summary).toContain('Error al comprimir')

      consoleErrorSpy.mockRestore()
      jest.dontMock('@anthropic-ai/sdk')
    })

    it('should handle empty messages array gracefully', async () => {
      const result = await compressConversationSegment(mockEmptyMessages, 'test-session-empty')

      expect(result.summary).toBeDefined()
      expect(result.entities).toBeDefined()
    })

    it('should log compression metrics', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      await compressConversationSegment(mockMessages, 'test-session-metrics')

      // Verify logging calls
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[compressor] Starting compression'),
        expect.any(Object)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[compressor] ✓ Compression successful'),
        expect.any(Object)
      )

      consoleLogSpy.mockRestore()
    })
  })

  // ============================================================================
  // Tests - generateEmbeddingForSummary()
  // ============================================================================

  describe('generateEmbeddingForSummary()', () => {
    it('should generate embedding of 1024 dimensions', async () => {
      const summaryText = 'El huésped busca apartamento con cocina equipada y vista al mar.'

      const embedding = await generateEmbeddingForSummary(summaryText)

      expect(embedding).toBeDefined()
      expect(Array.isArray(embedding)).toBe(true)
      expect(embedding.length).toBe(1024) // Matryoshka Tier 1
    })

    it('should return valid float values', async () => {
      const summaryText = 'Test summary for embedding generation.'

      const embedding = await generateEmbeddingForSummary(summaryText)

      expect(embedding.every((v) => typeof v === 'number')).toBe(true)
      expect(embedding.some((v) => v !== 0)).toBe(true) // Not all zeros
    })

    it('should handle empty text gracefully', async () => {
      const embedding = await generateEmbeddingForSummary('')

      expect(embedding).toBeDefined()
      expect(embedding.length).toBe(1024)
    })

    it('should return dummy embedding on OpenAI error', async () => {
      // Mock console.error to suppress error logs
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      // Reset modules to clear singleton
      jest.resetModules()

      // Mock API error
      jest.doMock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          embeddings: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        }))
      })

      // Re-import module to get new mock
      const { generateEmbeddingForSummary: generateWithError } = require('../conversation-compressor')

      const embedding = await generateWithError('test text')

      expect(embedding).toBeDefined()
      expect(embedding.length).toBe(1024)
      expect(embedding.every((v) => v === 0.1)).toBe(true) // Dummy fallback

      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      jest.dontMock('openai')
    })

    it('should log embedding generation metrics', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      await generateEmbeddingForSummary('Test summary text')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[compressor] Generating 1024d embedding'),
        expect.any(Object)
      )
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[compressor] ✓ Embedding generated'),
        expect.any(Object)
      )

      consoleLogSpy.mockRestore()
    })
  })

  // ============================================================================
  // Tests - compressAndEmbed() (Full Pipeline)
  // ============================================================================

  describe('compressAndEmbed()', () => {
    it('should complete full compression pipeline successfully', async () => {
      const result = await compressAndEmbed(mockMessages, 'test-session-pipeline')

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.embedding).toBeDefined()
      expect(result.metadata).toBeDefined()
    })

    it('should return CompressionResult with correct structure', async () => {
      const result = await compressAndEmbed(mockMessages, 'test-session-structure')

      // Verify summary structure
      expect(result.summary.summary).toBeDefined()
      expect(result.summary.entities).toBeDefined()
      expect(result.summary.entities.travel_intent).toBeDefined()
      expect(result.summary.entities.topics_discussed).toBeDefined()
      expect(result.summary.entities.key_questions).toBeDefined()

      // Verify embedding
      expect(result.embedding.length).toBe(1024)

      // Verify metadata
      expect(result.metadata.compressed_at).toBeDefined()
      expect(result.metadata.message_count).toBe(mockMessages.length)
    })

    it('should include ISO timestamp in metadata', async () => {
      const result = await compressAndEmbed(mockMessages, 'test-session-timestamp')

      expect(result.metadata.compressed_at).toBeDefined()
      // Verify it's a valid ISO date string
      expect(() => new Date(result.metadata.compressed_at)).not.toThrow()
      expect(new Date(result.metadata.compressed_at).toISOString()).toBe(result.metadata.compressed_at)
    })

    it('should track message count in metadata', async () => {
      const result = await compressAndEmbed(mockMessages, 'test-session-count')

      expect(result.metadata.message_count).toBe(10)
    })

    it('should log pipeline duration', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      await compressAndEmbed(mockMessages, 'test-session-duration')

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[compressor] ✓ Full pipeline complete'),
        expect.objectContaining({
          duration_ms: expect.any(Number),
        })
      )

      consoleLogSpy.mockRestore()
    })

    it('should handle errors gracefully in full pipeline', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const result = await compressAndEmbed(mockEmptyMessages, 'test-session-pipeline-error')

      // Should still return valid result with fallbacks
      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.embedding).toBeDefined()
      expect(result.embedding.length).toBe(1024)

      consoleErrorSpy.mockRestore()
    })
  })

  // ============================================================================
  // Tests - Performance
  // ============================================================================

  describe('Performance', () => {
    it('should complete compression in <500ms', async () => {
      const start = Date.now()
      await compressConversationSegment(mockMessages, 'test-session-perf-1')
      const duration = Date.now() - start

      // Note: Mocked APIs are instant, but we verify the constraint is in place
      expect(duration).toBeLessThan(500)
    })

    it('should complete embedding generation in <100ms', async () => {
      const start = Date.now()
      await generateEmbeddingForSummary('Test summary text for performance')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })

    it('should complete full pipeline in <600ms', async () => {
      const start = Date.now()
      await compressAndEmbed(mockMessages, 'test-session-perf-full')
      const duration = Date.now() - start

      // Full pipeline: compression (<500ms) + embedding (<100ms) = <600ms
      expect(duration).toBeLessThan(600)
    })
  })

  // ============================================================================
  // Tests - Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle messages with special characters', async () => {
      const specialMessages = [
        { role: 'user', content: 'Habitación con "vista al mar" & WiFi gratis?' },
        { role: 'assistant', content: 'Sí, incluye WiFi <complimentary> (24/7)' },
      ]

      const result = await compressConversationSegment(specialMessages, 'test-session-special')

      expect(result.summary).toBeDefined()
      expect(result.entities).toBeDefined()
    })

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(5000) // 5000 characters
      const longMessages = [
        { role: 'user', content: longMessage },
        { role: 'assistant', content: 'Respuesta breve' },
      ]

      const result = await compressConversationSegment(longMessages, 'test-session-long')

      expect(result.summary).toBeDefined()
    })

    it('should handle messages with only emojis', async () => {
      const emojiMessages = [
        { role: 'user', content: '🏖️🌊☀️' },
        { role: 'assistant', content: '👍 Perfect for beach lovers!' },
      ]

      const result = await compressConversationSegment(emojiMessages, 'test-session-emoji')

      expect(result.summary).toBeDefined()
      expect(result.entities).toBeDefined()
    })

    it('should handle messages with URLs', async () => {
      const urlMessages = [
        { role: 'user', content: 'Ver fotos en https://example.com/suite-ocean-view' },
        { role: 'assistant', content: 'Claro, también puedes ver más en www.example.com/gallery' },
      ]

      const result = await compressConversationSegment(urlMessages, 'test-session-urls')

      expect(result.summary).toBeDefined()
    })

    it('should handle null/undefined dates gracefully', async () => {
      const noDatesMessages = [
        { role: 'user', content: 'Info sobre apartamentos' },
        { role: 'assistant', content: 'Tenemos varias opciones disponibles' },
      ]

      const result = await compressConversationSegment(noDatesMessages, 'test-session-nodates')

      expect(result.entities.travel_intent).toBeDefined()
      // dates can be null or undefined when not mentioned
    })
  })

  // ============================================================================
  // Tests - Lazy Initialization
  // ============================================================================

  describe('Lazy Initialization', () => {
    it('should initialize Anthropic client on first use', async () => {
      // This test verifies the singleton pattern doesn't cause issues
      const result1 = await compressConversationSegment(mockShortMessages, 'test-session-lazy-1')
      const result2 = await compressConversationSegment(mockShortMessages, 'test-session-lazy-2')

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    it('should initialize OpenAI client on first use', async () => {
      const embedding1 = await generateEmbeddingForSummary('Test 1')
      const embedding2 = await generateEmbeddingForSummary('Test 2')

      expect(embedding1.length).toBe(1024)
      expect(embedding2.length).toBe(1024)
    })
  })
})
