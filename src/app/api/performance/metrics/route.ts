import { NextResponse } from 'next/server'
import { exportMetrics, getPerformanceSummary } from '@/lib/performance-logger'

// IMPORTANT: Use Edge Runtime to share module instance with middleware
export const runtime = 'edge'

/**
 * GET /api/performance/metrics
 *
 * Returns performance metrics collected by the middleware.
 * Useful for dashboard visualization and monitoring.
 *
 * Query params:
 * - format=summary (default) | full
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format') || 'summary'

  try {
    if (format === 'full') {
      const metrics = exportMetrics()
      return NextResponse.json(metrics)
    }

    // Default: summary only
    const summary = getPerformanceSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[performance-metrics] Error exporting metrics:', error)
    return NextResponse.json(
      { error: 'Failed to export metrics' },
      { status: 500 }
    )
  }
}
