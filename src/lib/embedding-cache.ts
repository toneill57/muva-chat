/**
 * Embedding Cache
 *
 * In-memory LRU cache for query embeddings to reduce OpenAI API calls.
 * Reduces search time from ~500ms (API call) to ~5ms (cache hit).
 *
 * Target: 80%+ cache hit rate in production
 */

import crypto from 'crypto'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CacheEntry {
  embedding: number[]
  timestamp: number
  hitCount: number
}

// ============================================================================
// LRU Cache Implementation
// ============================================================================

class EmbeddingCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private hitCount: number = 0
  private missCount: number = 0

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Generate cache key from query text (normalized)
   */
  private getCacheKey(query: string): string {
    // Normalize: lowercase, trim, remove extra spaces
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ')
    // Hash for consistent key
    return crypto.createHash('md5').update(normalized).digest('hex')
  }

  /**
   * Get embedding from cache
   */
  get(query: string): number[] | null {
    const key = this.getCacheKey(query)
    const entry = this.cache.get(key)

    if (entry) {
      // Update hit count and move to end (LRU)
      entry.hitCount++
      entry.timestamp = Date.now()
      this.cache.delete(key)
      this.cache.set(key, entry)
      this.hitCount++

      console.log('[embedding-cache] ✓ HIT:', {
        query: query.substring(0, 40),
        hitCount: entry.hitCount,
        totalHits: this.hitCount,
        totalMisses: this.missCount,
        hitRate: `${((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1)}%`,
      })

      return entry.embedding
    }

    this.missCount++
    console.log('[embedding-cache] ✗ MISS:', {
      query: query.substring(0, 40),
      cacheSize: this.cache.size,
      hitRate: `${((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1)}%`,
    })

    return null
  }

  /**
   * Set embedding in cache (with LRU eviction)
   */
  set(query: string, embedding: number[]): void {
    const key = this.getCacheKey(query)

    // LRU eviction: remove oldest if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value as string | undefined
      if (oldestKey) {
        this.cache.delete(oldestKey)
        console.log('[embedding-cache] Evicted oldest entry (LRU)')
      }
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      hitCount: 0,
    })

    console.log('[embedding-cache] ✓ CACHED:', {
      query: query.substring(0, 40),
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
    })
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: this.hitCount + this.missCount > 0
        ? ((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1) + '%'
        : '0%',
    }
  }

  /**
   * Clear cache (for testing)
   */
  clear(): void {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
    console.log('[embedding-cache] Cache cleared')
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const embeddingCache = new EmbeddingCache(100)
