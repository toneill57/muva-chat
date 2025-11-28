/**
 * Super Admin AI Monitoring Endpoint
 *
 * Provides AI usage statistics, cost analysis, and performance metrics.
 * Protected by superAdminMiddleware (JWT authentication required).
 *
 * GET /api/super-admin/ai-monitoring
 * Query params:
 *   - days: number (default 30, max 365) - Time range for stats
 *   - tenant_id: string (optional) - Filter by specific tenant
 *   - model: string (optional) - Filter by specific model
 *   - format: 'json' | 'csv' (default 'json')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { superAdminMiddleware } from '@/lib/middleware-super-admin'

/**
 * GET handler - Fetch AI usage statistics and monitoring data
 */
export async function GET(request: NextRequest) {
  // Verify super admin authentication
  const authResult = await superAdminMiddleware(request)

  // If middleware returns a response (error), return it
  if (authResult instanceof NextResponse && authResult.status !== 200) {
    return authResult
  }

  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query params
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))
    const tenantId = searchParams.get('tenant_id')
    const model = searchParams.get('model')
    const format = searchParams.get('format') || 'json'

    // Calculate date range
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    console.log(`[api/super-admin/ai-monitoring] Fetching AI stats for last ${days} days`)

    // ========================================================================
    // 1. Fetch daily aggregated stats
    // ========================================================================
    let statsQuery = supabase
      .from('ai_usage_logs')
      .select(`
        created_at,
        model,
        input_tokens,
        output_tokens,
        estimated_cost,
        latency_ms
      `)
      .gte('created_at', fromDate)
      .order('created_at', { ascending: true })

    if (tenantId) {
      statsQuery = statsQuery.eq('tenant_id', tenantId)
    }

    if (model) {
      statsQuery = statsQuery.eq('model', model)
    }

    const { data: rawStats, error: statsError } = await statsQuery

    if (statsError) {
      console.error('[api/super-admin/ai-monitoring] Stats query error:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch AI usage stats', details: statsError.message },
        { status: 500 }
      )
    }

    // ========================================================================
    // 2. Aggregate stats by day
    // ========================================================================
    const dailyStats = aggregateByDay(rawStats || [])

    // ========================================================================
    // 3. Fetch top consuming tenants
    // ========================================================================
    let topTenantsQuery = supabase
      .from('ai_usage_logs')
      .select(`
        tenant_id,
        created_at,
        model,
        input_tokens,
        output_tokens,
        estimated_cost,
        latency_ms,
        tenant_registry!inner(subdomain, nombre_comercial)
      `)
      .gte('created_at', fromDate)

    if (model) {
      topTenantsQuery = topTenantsQuery.eq('model', model)
    }

    const { data: tenantUsage, error: topError } = await topTenantsQuery

    if (topError) {
      console.error('[api/super-admin/ai-monitoring] Top tenants query error:', topError)
      return NextResponse.json(
        { error: 'Failed to fetch top consumers', details: topError.message },
        { status: 500 }
      )
    }

    // Aggregate by tenant
    const topConsumers = aggregateByTenant(tenantUsage || [])

    // ========================================================================
    // 4. Fetch model distribution
    // ========================================================================
    let modelStatsQuery = supabase
      .from('ai_usage_logs')
      .select('model, input_tokens, output_tokens, estimated_cost')
      .gte('created_at', fromDate)

    if (tenantId) {
      modelStatsQuery = modelStatsQuery.eq('tenant_id', tenantId)
    }

    const { data: modelData, error: modelError } = await modelStatsQuery

    if (modelError) {
      console.error('[api/super-admin/ai-monitoring] Model stats query error:', modelError)
      return NextResponse.json(
        { error: 'Failed to fetch model statistics', details: modelError.message },
        { status: 500 }
      )
    }

    const modelStats = aggregateByModel(modelData || [])

    // ========================================================================
    // 5. Calculate overall metrics
    // ========================================================================
    const totalTokens = (rawStats || []).reduce(
      (sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0),
      0
    )
    const totalCost = (rawStats || []).reduce(
      (sum, log) => sum + parseFloat(String(log.estimated_cost || 0)),
      0
    )
    const avgLatency = (rawStats || []).reduce(
      (sum, log) => sum + (log.latency_ms || 0),
      0
    ) / Math.max(1, (rawStats || []).length)
    const totalRequests = (rawStats || []).length

    // ========================================================================
    // 6. Handle CSV export
    // ========================================================================
    if (format === 'csv') {
      const csv = convertToCSV(dailyStats)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ai-monitoring-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    // ========================================================================
    // 7. Return JSON response
    // ========================================================================
    console.log(
      `[api/super-admin/ai-monitoring] ✅ Fetched stats: ${totalRequests} requests, ` +
      `${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(2)} cost`
    )

    return NextResponse.json({
      dailyStats,
      topConsumers,
      modelStats,
      metrics: {
        totalTokens,
        totalCost: totalCost.toFixed(2),
        avgLatency: Math.round(avgLatency),
        totalRequests,
        dateRange: {
          from: fromDate,
          to: new Date().toISOString(),
          days
        }
      }
    })
  } catch (error) {
    console.error('[api/super-admin/ai-monitoring] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Aggregation Helper Functions
// ============================================================================

interface RawUsageLog {
  created_at: string
  model: string
  input_tokens: number
  output_tokens: number
  estimated_cost: number
  latency_ms: number
}

interface TenantUsageLog extends RawUsageLog {
  tenant_id: string
  tenant_registry: {
    subdomain: string
    nombre_comercial: string
  } | {
    subdomain: string
    nombre_comercial: string
  }[]
}

/**
 * Aggregate usage stats by day
 */
function aggregateByDay(logs: RawUsageLog[]): Array<{
  date: string
  requests: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: string
  avgLatency: number
}> {
  const dayMap = new Map<string, {
    requests: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    totalCost: number
    totalLatency: number
  }>()

  logs.forEach(log => {
    const date = log.created_at.split('T')[0] // Extract YYYY-MM-DD

    const existing = dayMap.get(date) || {
      requests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      totalLatency: 0
    }

    dayMap.set(date, {
      requests: existing.requests + 1,
      totalTokens: existing.totalTokens + log.input_tokens + log.output_tokens,
      inputTokens: existing.inputTokens + log.input_tokens,
      outputTokens: existing.outputTokens + log.output_tokens,
      totalCost: existing.totalCost + log.estimated_cost,
      totalLatency: existing.totalLatency + log.latency_ms
    })
  })

  return Array.from(dayMap.entries())
    .map(([date, stats]) => ({
      date,
      requests: stats.requests,
      totalTokens: stats.totalTokens,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      totalCost: stats.totalCost.toFixed(4),
      avgLatency: Math.round(stats.totalLatency / stats.requests)
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Aggregate usage stats by tenant
 */
function aggregateByTenant(logs: TenantUsageLog[]): Array<{
  tenantId: string
  subdomain: string
  nombreComercial: string
  requests: number
  totalTokens: number
  totalCost: string
  avgLatency: number
}> {
  const tenantMap = new Map<string, {
    subdomain: string
    nombreComercial: string
    requests: number
    totalTokens: number
    totalCost: number
    totalLatency: number
  }>()

  logs.forEach(log => {
    // Handle tenant_registry being an array or object
    const tenantData = Array.isArray(log.tenant_registry)
      ? log.tenant_registry[0]
      : log.tenant_registry

    const existing = tenantMap.get(log.tenant_id) || {
      subdomain: tenantData?.subdomain || 'unknown',
      nombreComercial: tenantData?.nombre_comercial || 'Unknown',
      requests: 0,
      totalTokens: 0,
      totalCost: 0,
      totalLatency: 0
    }

    tenantMap.set(log.tenant_id, {
      ...existing,
      requests: existing.requests + 1,
      totalTokens: existing.totalTokens + log.input_tokens + log.output_tokens,
      totalCost: existing.totalCost + log.estimated_cost,
      totalLatency: existing.totalLatency + log.latency_ms
    })
  })

  return Array.from(tenantMap.entries())
    .map(([tenantId, stats]) => ({
      tenantId,
      subdomain: stats.subdomain,
      nombreComercial: stats.nombreComercial,
      requests: stats.requests,
      totalTokens: stats.totalTokens,
      totalCost: stats.totalCost.toFixed(4),
      avgLatency: Math.round(stats.totalLatency / stats.requests)
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 10) // Top 10
}

/**
 * Aggregate usage stats by model
 */
function aggregateByModel(logs: Array<{
  model: string
  input_tokens: number
  output_tokens: number
  estimated_cost: number
}>): Array<{
  model: string
  requests: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: string
}> {
  const modelMap = new Map<string, {
    requests: number
    totalTokens: number
    inputTokens: number
    outputTokens: number
    totalCost: number
  }>()

  logs.forEach(log => {
    const existing = modelMap.get(log.model) || {
      requests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0
    }

    modelMap.set(log.model, {
      requests: existing.requests + 1,
      totalTokens: existing.totalTokens + log.input_tokens + log.output_tokens,
      inputTokens: existing.inputTokens + log.input_tokens,
      outputTokens: existing.outputTokens + log.output_tokens,
      totalCost: existing.totalCost + log.estimated_cost
    })
  })

  return Array.from(modelMap.entries())
    .map(([model, stats]) => ({
      model,
      requests: stats.requests,
      totalTokens: stats.totalTokens,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      totalCost: stats.totalCost.toFixed(4)
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
}

/**
 * Convert daily stats to CSV format
 */
function convertToCSV(stats: Array<{
  date: string
  requests: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: string
  avgLatency: number
}>): string {
  if (stats.length === 0) {
    return 'No data available'
  }

  // CSV headers
  const headers = [
    'Date',
    'Requests',
    'Total Tokens',
    'Input Tokens',
    'Output Tokens',
    'Total Cost (USD)',
    'Avg Latency (ms)'
  ]

  // CSV rows
  const rows = stats.map(stat => [
    stat.date,
    stat.requests.toString(),
    stat.totalTokens.toString(),
    stat.inputTokens.toString(),
    stat.outputTokens.toString(),
    stat.totalCost,
    stat.avgLatency.toString()
  ])

  // Build CSV string
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ]

  return csvLines.join('\n')
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
