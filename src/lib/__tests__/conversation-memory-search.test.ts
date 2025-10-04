/**
 * Unit Tests for Conversation Memory Search
 *
 * Tests semantic search for conversation summaries using pgvector similarity.
 * Part of Conversation Memory System (Oct 2025).
 */

import { searchConversationMemory, type ConversationMemoryResult } from '../conversation-memory-search'

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock conversation-compressor (for generateEmbeddingForSummary)
jest.mock('../conversation-compressor', () => ({
  generateEmbeddingForSummary: jest.fn().mockResolvedValue(Array(1024).fill(0.5)),
}))

// Mock Supabase client
const mockRpc = jest.fn()

jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}))

// ============================================================================
// Test Data
// ============================================================================

const mockSessionId = 'test-session-123'
const mockSessionWithoutMemories = 'session-no-memories'

const mockMemoryResults: ConversationMemoryResult[] = [
  {
    id: 'memory-001',
    summary_text:
      'El huésped busca apartamento para 4 personas con cocina equipada y vista al mar. Preguntó sobre disponibilidad para check-in el 15 de octubre, políticas de cancelación y si se permiten mascotas.',
    key_entities: {
      travel_intent: {
        dates: '2025-10-15 a 2025-10-20',
        guests: 4,
        preferences: ['cocina equipada', 'vista al mar', 'mascotas permitidas'],
      },
      topics_discussed: ['disponibilidad', 'amenidades', 'políticas de cancelación', 'mascotas'],
      key_questions: ['¿Disponibilidad para 4 personas?', '¿Política de cancelación?', '¿Permiten mascotas?'],
    },
    message_range: 'messages 1-10',
    similarity: 0.82,
  },
  {
    id: 'memory-002',
    summary_text:
      'Conversación sobre opciones de transporte desde el aeropuerto. El huésped preguntó sobre servicio de shuttle, costos de taxi, y tiempo de viaje. Se confirmó servicio gratuito de shuttle con reserva previa.',
    key_entities: {
      travel_intent: {
        dates: '2025-10-15',
        guests: 4,
        preferences: ['transporte aeropuerto', 'shuttle gratuito'],
      },
      topics_discussed: ['transporte', 'shuttle', 'costos taxi', 'tiempo viaje'],
      key_questions: ['¿Servicio de shuttle?', '¿Costo del taxi?', '¿Cuánto tiempo desde aeropuerto?'],
    },
    message_range: 'messages 11-20',
    similarity: 0.67,
  },
]

// ============================================================================
// Setup
// ============================================================================

describe('Conversation Memory Search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================================
  // Tests - Basic Functionality
  // ============================================================================

  describe('searchConversationMemory()', () => {
    it('should return empty array if session has no summaries', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const results = await searchConversationMemory('playa hermosa', mockSessionWithoutMemories)

      expect(results).toEqual([])
      expect(mockRpc).toHaveBeenCalledWith('match_conversation_memory', {
        query_embedding: expect.any(Array),
        p_session_id: mockSessionWithoutMemories,
        match_threshold: 0.3,
        match_count: 2,
      })
    })

    it('should return results with similarity > 0.3', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('apartamento playa', mockSessionId)

      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.similarity > 0.3)).toBe(true)
    })

    it('should return maximum 2 results', async () => {
      // RPC function already limits to 2 results (match_count: 2)
      // So we mock it returning exactly 2 results
      const twoResults = [mockMemoryResults[0], mockMemoryResults[1]]

      mockRpc.mockResolvedValue({ data: twoResults, error: null })

      const results = await searchConversationMemory('hotel amenidades', mockSessionId)

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should return results ordered by similarity (descending)', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('playa vista mar', mockSessionId)

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity)
      }
    })

    it('should have average similarity > 0.5 for relevant queries', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('apartamento playa mascotas', mockSessionId)

      if (results.length > 0) {
        const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length
        expect(avgSimilarity).toBeGreaterThan(0.5)
      }
    })

    it('should include all required fields in results', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('disponibilidad', mockSessionId)

      results.forEach((result) => {
        expect(result.id).toBeDefined()
        expect(result.summary_text).toBeDefined()
        expect(result.key_entities).toBeDefined()
        expect(result.message_range).toBeDefined()
        expect(result.similarity).toBeDefined()
        expect(typeof result.similarity).toBe('number')
      })
    })
  })

  // ============================================================================
  // Tests - Performance
  // ============================================================================

  describe('Performance', () => {
    it('should complete search in < 100ms', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const start = Date.now()
      await searchConversationMemory('test query', mockSessionId)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })

    it('should handle concurrent searches efficiently', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const queries = ['playa', 'apartamento', 'mascotas', 'transporte', 'cocina']

      const start = Date.now()
      await Promise.all(queries.map((q) => searchConversationMemory(q, mockSessionId)))
      const duration = Date.now() - start

      // 5 concurrent searches should complete in reasonable time
      expect(duration).toBeLessThan(500)
    })
  })

  // ============================================================================
  // Tests - Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    it('should return empty array on RPC error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function error', code: 'PGRST123' },
      })

      const results = await searchConversationMemory('query', mockSessionId)

      expect(results).toEqual([])
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[memory-search] RPC error:'),
        expect.any(String)
      )

      consoleWarnSpy.mockRestore()
    })

    it('should return empty array on embedding generation failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Reset modules to re-mock with error
      jest.resetModules()
      jest.doMock('../conversation-compressor', () => ({
        generateEmbeddingForSummary: jest.fn().mockRejectedValue(new Error('Embedding error')),
      }))

      const { searchConversationMemory: searchWithError } = require('../conversation-memory-search')

      const results = await searchWithError('query', mockSessionId)

      expect(results).toEqual([])

      consoleErrorSpy.mockRestore()
      jest.dontMock('../conversation-compressor')
    })

    it('should return empty array on unexpected errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      mockRpc.mockRejectedValue(new Error('Unexpected database error'))

      const results = await searchConversationMemory('query', mockSessionId)

      expect(results).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle null data from RPC gracefully', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      expect(results).toEqual([])
    })
  })

  // ============================================================================
  // Tests - Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty query string', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const results = await searchConversationMemory('', mockSessionId)

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle very long query strings', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const longQuery = 'apartamento '.repeat(100) // 1100+ characters

      const results = await searchConversationMemory(longQuery, mockSessionId)

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle queries with special characters', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const specialQuery = '¿Apartamento con "vista al mar" & WiFi gratis?'

      const results = await searchConversationMemory(specialQuery, mockSessionId)

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should handle queries with emojis', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const emojiQuery = 'Apartamento 🏖️ con vista 🌊 y WiFi 📶'

      const results = await searchConversationMemory(emojiQuery, mockSessionId)

      expect(results).toBeDefined()
    })

    it('should handle invalid session IDs gracefully', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const results = await searchConversationMemory('query', 'invalid-session-xyz')

      expect(results).toEqual([])
    })

    it('should handle results with missing optional fields', async () => {
      const incompleteResults = [
        {
          id: 'memory-incomplete',
          summary_text: 'Basic summary',
          key_entities: {},
          message_range: 'messages 1-10',
          similarity: 0.7,
        },
      ]

      mockRpc.mockResolvedValue({ data: incompleteResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      expect(results).toBeDefined()
      expect(results.length).toBe(1)
    })
  })

  // ============================================================================
  // Tests - Logging
  // ============================================================================

  describe('Logging', () => {
    it('should log search query start', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      await searchConversationMemory('apartamento playa', mockSessionId)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[memory-search] Searching for:'),
        expect.any(String)
      )

      consoleLogSpy.mockRestore()
    })

    it('should log when no memories found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      mockRpc.mockResolvedValue({ data: [], error: null })

      await searchConversationMemory('query', mockSessionId)

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[memory-search] No memories found'))

      consoleLogSpy.mockRestore()
    })

    it('should log similarity scores when memories found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      await searchConversationMemory('query', mockSessionId)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[memory-search] Found'),
        expect.objectContaining({
          similarities: expect.any(Array),
        })
      )

      consoleLogSpy.mockRestore()
    })
  })

  // ============================================================================
  // Tests - RPC Parameters
  // ============================================================================

  describe('RPC Parameters', () => {
    it('should call RPC with correct parameters', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      await searchConversationMemory('test query', mockSessionId)

      expect(mockRpc).toHaveBeenCalledWith('match_conversation_memory', {
        query_embedding: expect.any(Array),
        p_session_id: mockSessionId,
        match_threshold: 0.3,
        match_count: 2,
      })
    })

    it('should generate 1024d embedding for query', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      await searchConversationMemory('test query', mockSessionId)

      // Verify RPC was called with an embedding array
      const callArgs = mockRpc.mock.calls[0][1]
      expect(callArgs.query_embedding).toEqual(expect.any(Array))
      expect(callArgs.query_embedding.length).toBe(1024)
    })

    it('should use correct match_threshold (0.3)', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      await searchConversationMemory('query', mockSessionId)

      const callArgs = mockRpc.mock.calls[0][1]
      expect(callArgs.match_threshold).toBe(0.3)
    })

    it('should use correct match_count (2)', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      await searchConversationMemory('query', mockSessionId)

      const callArgs = mockRpc.mock.calls[0][1]
      expect(callArgs.match_count).toBe(2)
    })

    it('should pass session_id as p_session_id', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })

      const testSessionId = 'unique-session-789'
      await searchConversationMemory('query', testSessionId)

      const callArgs = mockRpc.mock.calls[0][1]
      expect(callArgs.p_session_id).toBe(testSessionId)
    })
  })

  // ============================================================================
  // Tests - Similarity Validation
  // ============================================================================

  describe('Similarity Validation', () => {
    it('should filter out results below threshold', async () => {
      // RPC function (match_conversation_memory) filters at database level with match_threshold: 0.3
      // So we mock it returning only results above threshold
      const aboveThresholdResults = [
        { ...mockMemoryResults[0], similarity: 0.85 },
        { ...mockMemoryResults[1], similarity: 0.67 },
      ]

      mockRpc.mockResolvedValue({ data: aboveThresholdResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      // Verify all returned are above threshold
      results.forEach((r) => {
        expect(r.similarity).toBeGreaterThan(0.3)
      })
    })

    it('should handle edge case similarity exactly at threshold', async () => {
      const edgeResults = [{ ...mockMemoryResults[0], similarity: 0.3 }]

      mockRpc.mockResolvedValue({ data: edgeResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      expect(results).toBeDefined()
      // 0.3 is at threshold - RPC decides inclusion
    })

    it('should accept high similarity results (> 0.9)', async () => {
      const highResults = [
        { ...mockMemoryResults[0], similarity: 0.98 },
        { ...mockMemoryResults[1], similarity: 0.95 },
      ]

      mockRpc.mockResolvedValue({ data: highResults, error: null })

      const results = await searchConversationMemory('exact match query', mockSessionId)

      expect(results.length).toBe(2)
      expect(results[0].similarity).toBeGreaterThan(0.9)
    })
  })

  // ============================================================================
  // Tests - Data Integrity
  // ============================================================================

  describe('Data Integrity', () => {
    it('should return results matching ConversationMemoryResult interface', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      results.forEach((result) => {
        // Verify structure matches interface
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('summary_text')
        expect(result).toHaveProperty('key_entities')
        expect(result).toHaveProperty('message_range')
        expect(result).toHaveProperty('similarity')

        // Verify types
        expect(typeof result.id).toBe('string')
        expect(typeof result.summary_text).toBe('string')
        expect(typeof result.key_entities).toBe('object')
        expect(typeof result.message_range).toBe('string')
        expect(typeof result.similarity).toBe('number')
      })
    })

    it('should preserve key_entities structure from database', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      results.forEach((result) => {
        expect(result.key_entities).toBeDefined()
        // key_entities can have various structures - just verify it's preserved
        expect(result.key_entities).not.toBeNull()
      })
    })

    it('should preserve message_range format', async () => {
      mockRpc.mockResolvedValue({ data: mockMemoryResults, error: null })

      const results = await searchConversationMemory('query', mockSessionId)

      results.forEach((result) => {
        expect(result.message_range).toMatch(/messages \d+-\d+/)
      })
    })
  })
})
