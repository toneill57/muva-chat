/**
 * AI Usage Tracking Library
 *
 * Tracks AI model usage for monitoring and cost analysis.
 * Logs all Claude API calls with token usage and estimated costs.
 *
 * Used for:
 * - Cost monitoring and forecasting
 * - Usage analytics per tenant
 * - Performance monitoring (latency)
 * - Model usage statistics
 */

import { createServerClient } from '@/lib/supabase'

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AIUsageParams {
  tenantId: string | null // null for Super Chat (no tenant)
  conversationId?: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
  latency: number // milliseconds
}

// ============================================================================
// Pricing Constants (as of November 2025)
// ============================================================================

// Claude pricing per million tokens (MTok)
const CLAUDE_PRICING = {
  // Claude Sonnet 4.5
  'claude-sonnet-4-5': {
    input: 3.0,   // $3/MTok
    output: 15.0  // $15/MTok
  },
  'claude-sonnet-4-5-20250929': {
    input: 3.0,
    output: 15.0
  },
  // Claude Haiku 4.5
  'claude-haiku-4-5': {
    input: 1.0,   // $1/MTok
    output: 5.0   // $5/MTok
  },
  'claude-haiku-4-5-20250514': {
    input: 1.0,
    output: 5.0
  },
  // Legacy models (fallback)
  'claude-3-5-sonnet-20241022': {
    input: 3.0,
    output: 15.0
  },
  'claude-3-5-haiku-20241022': {
    input: 1.0,
    output: 5.0
  }
} as const

type ClaudeModel = keyof typeof CLAUDE_PRICING

// ============================================================================
// Cost Calculation Functions
// ============================================================================

/**
 * Calculate estimated cost for AI usage
 *
 * @param model - Claude model identifier
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Get pricing for the model (fallback to Haiku if unknown)
  const pricing = CLAUDE_PRICING[model as ClaudeModel] || CLAUDE_PRICING['claude-haiku-4-5']

  // Calculate cost per token type
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}

// ============================================================================
// AI Usage Tracking Functions
// ============================================================================

/**
 * Track AI usage in the database
 *
 * @param params - AI usage parameters
 * @returns Promise<void>
 *
 * @example
 * await trackAIUsage({
 *   tenantId: tenant.tenant_id,
 *   conversationId: conversation.id,
 *   model: 'claude-sonnet-4-5',
 *   usage: {
 *     input_tokens: 1500,
 *     output_tokens: 300
 *   },
 *   latency: 850
 * })
 */
export async function trackAIUsage({
  tenantId,
  conversationId,
  model,
  usage,
  latency
}: AIUsageParams): Promise<void> {
  try {
    const supabase = createServerClient()

    // Calculate estimated cost
    const estimatedCost = calculateCost(model, usage.input_tokens, usage.output_tokens)

    // Insert usage log
    const { error } = await supabase
      .from('ai_usage_logs')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId || null,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost: estimatedCost,
        latency_ms: latency
      })

    if (error) {
      console.error('[track-ai-usage] Failed to insert usage log:', error)
      // Don't throw - tracking should not break the main flow
    } else {
      console.log(
        `[track-ai-usage] ✅ Tracked ${usage.input_tokens + usage.output_tokens} tokens ` +
        `(model: ${model}, cost: $${estimatedCost.toFixed(4)}, latency: ${latency}ms)`
      )
    }
  } catch (err) {
    console.error('[track-ai-usage] Exception while tracking:', err)
    // Don't throw - tracking is important but should not break operations
  }
}

/**
 * Get pricing information for a model
 *
 * @param model - Claude model identifier
 * @returns Pricing information or null if model not found
 */
export function getModelPricing(model: string): {
  input: number
  output: number
} | null {
  return CLAUDE_PRICING[model as ClaudeModel] || null
}

/**
 * Calculate estimated cost for a planned API call
 *
 * @param model - Claude model identifier
 * @param estimatedInputTokens - Estimated input tokens
 * @param estimatedOutputTokens - Estimated output tokens
 * @returns Estimated cost in USD
 */
export function estimateCost(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  return calculateCost(model, estimatedInputTokens, estimatedOutputTokens)
}

// ============================================================================
// Export pricing for reference
// ============================================================================

export { CLAUDE_PRICING }
