// ============================================================================
// Token & Cost Metrics
// ============================================================================

export interface TokenMetrics {
  // Token counting
  embeddingTokens: number // Tokens of the query for embedding
  totalTokens: number // Total accumulated

  // Cost calculation
  embeddingCost: number // USD for embeddings
  totalCost: number // USD total for the query
}

// ============================================================================
// Performance Metrics (Extended)
// ============================================================================

export interface PerformanceMetrics {
  // Basic metrics (existing)
  responseTime: number
  tier: string
  resultsCount: number

  // NEW: Detailed breakdown
  embeddingGenerationMs: number
  vectorSearchMs: number
  formattingMs: number
  networkLatencyMs: number

  // NEW: Quality indicators
  avgSimilarityScore: number // Average similarity of results
  topSimilarityScore: number // Best match
  tierEfficiency: number // How well the tier handled the query (0-1)

  // NEW: Database metrics
  dbQueryTime?: number
  cacheHit?: boolean
}

// ============================================================================
// Query Analysis Metrics
// ============================================================================

export interface QueryAnalysisMetrics {
  // Query classification
  detectedType: 'accommodation' | 'tourism' | 'both'
  complexity: 'simple' | 'moderate' | 'complex' // Based on keywords

  // Keyword matching
  accommodationKeywordsMatched: string[]
  tourismKeywordsMatched: string[]
  totalKeywordsMatched: number

  // Tier routing
  routingConfidence: number // How confident the router was (0-1)
  optimalTier: string // Tier that should be used
  actualTier: string // Tier used
}

// ============================================================================
// Quality Metrics
// ============================================================================

export interface QualityMetrics {
  // Response quality
  responseLength: number // Characters of response
  sourceDiversity: number // Variety of sources (0-1)
  duplicateResults: number // Duplicate results detected

  // Efficiency
  tokensPerResult: number // Token efficiency
  timePerResult: number // ms per result
  costPerResult: number // USD per result
}

// ============================================================================
// Intent Metrics (LLM-based)
// ============================================================================

export interface IntentMetrics {
  type: 'accommodation' | 'tourism' | 'general'
  confidence: number
  reasoning: string
  shouldShowBoth: boolean
  primaryFocus: 'accommodation' | 'tourism' | 'balanced'
}

// ============================================================================
// Extended Chat Message with Full Metrics
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: Array<{
    type: 'accommodation' | 'tourism'
    name: string
    similarity: number
  }>

  // Legacy performance (for backwards compatibility)
  performance?: {
    responseTime: number
    tier: string
    resultsCount: number
  }

  // NEW: Extended metrics
  metrics?: {
    tokens: TokenMetrics
    performance: PerformanceMetrics
    analysis: QueryAnalysisMetrics
    quality: QualityMetrics
    intent?: IntentMetrics // NEW: LLM intent detection
  }
}

// ============================================================================
// Session Metrics (for tracking entire session)
// ============================================================================

export interface QuerySnapshot {
  id: string
  timestamp: Date
  query: string
  tokens: TokenMetrics
  performance: PerformanceMetrics
  analysis: QueryAnalysisMetrics
  quality: QualityMetrics
  response: string
  sources: any[]
}

export interface SessionMetrics {
  // Session tracking
  sessionId: string
  sessionStart: Date
  totalQueries: number

  // Accumulated metrics
  totalTokens: number
  totalCost: number
  totalTime: number
  avgResponseTime: number

  // Quality aggregates
  avgSimilarity: number
  avgResultsPerQuery: number

  // Tier distribution
  tierUsage: Record<string, number> // {'Tier 1': 5, 'Tier 2': 3}
  searchTypeDistribution: Record<string, number>

  // Performance trends
  queries: QuerySnapshot[] // Complete history
}

export interface PremiumChatInterfaceProps {
  clientId: string
  businessName: string
}

export interface SuggestionCategory {
  category: string
  icon: any
  color: string
  questions: string[]
}