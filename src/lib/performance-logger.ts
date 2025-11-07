/**
 * Performance Logger
 *
 * Tracks API request timing and generates performance metrics
 * for optimization analysis.
 *
 * Features:
 * - Request timing (start to finish)
 * - Slow request detection (>2s threshold)
 * - In-memory metrics storage
 * - Per-route statistics
 *
 * EDGE RUNTIME COMPATIBLE: Works in both Edge and Node.js runtimes.
 * Metrics are stored in memory only (no file system operations).
 */

// ============================================================================
// Configuration
// ============================================================================

const SLOW_REQUEST_THRESHOLD = 2000 // 2 seconds

// ============================================================================
// Types
// ============================================================================

export interface RequestMetric {
  timestamp: string
  method: string
  path: string
  duration: number
  status?: number
  slow: boolean
  userAgent?: string
  ip?: string
}

interface RouteStats {
  path: string
  count: number
  totalDuration: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  slowCount: number
}

// ============================================================================
// In-Memory Metrics Store
// ============================================================================

// IMPORTANT: Module Instance Issue in Next.js 15 + Turbopack
//
// Hot Module Reload creates NEW module instances with fresh global scopes.
// This means middleware (Edge Runtime) and API routes (Node Runtime) each
// get their own metricsStore when recompiled. This is expected behavior in dev.
//
// In production (no HMR), this won't be an issue.
//
// For now, we store metrics in-memory per module instance and accept that
// metrics may reset during HMR. This is fine for development monitoring.

const metricsStore: RequestMetric[] = []

const getMetricsStore = (): RequestMetric[] => metricsStore

const MAX_MEMORY_METRICS = 1000 // Keep last 1000 in memory

/**
 * Record a request metric
 */
export function recordMetric(metric: RequestMetric): void {
  const store = getMetricsStore()

  // Add to in-memory store
  store.push(metric)

  // Trim if exceeds max
  if (store.length > MAX_MEMORY_METRICS) {
    store.shift()
  }

  // Log slow requests
  if (metric.slow) {
    console.warn('[performance-logger] 🐌 SLOW REQUEST:', {
      path: metric.path,
      duration: `${metric.duration}ms`,
      threshold: `${SLOW_REQUEST_THRESHOLD}ms`,
      method: metric.method,
    })
  }
}

/**
 * Get recent metrics from memory
 */
export function getRecentMetrics(limit: number = 100): RequestMetric[] {
  return getMetricsStore().slice(-limit)
}

/**
 * Calculate route statistics
 */
export function calculateRouteStats(): RouteStats[] {
  const store = getMetricsStore()
  const routeMap = new Map<string, RequestMetric[]>()

  // Group by route
  store.forEach((metric) => {
    const existing = routeMap.get(metric.path) || []
    existing.push(metric)
    routeMap.set(metric.path, existing)
  })

  // Calculate stats for each route
  const stats: RouteStats[] = []
  routeMap.forEach((metrics, path) => {
    const durations = metrics.map((m) => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const slowCount = metrics.filter((m) => m.slow).length

    stats.push({
      path,
      count: metrics.length,
      totalDuration,
      avgDuration: Math.round(totalDuration / metrics.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowCount,
    })
  })

  // Sort by average duration (slowest first)
  return stats.sort((a, b) => b.avgDuration - a.avgDuration)
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const store = getMetricsStore()
  const routeStats = calculateRouteStats()
  const totalRequests = store.length
  const slowRequests = store.filter((m) => m.slow).length
  const allDurations = store.map((m) => m.duration)

  // Calculate percentiles
  const sortedDurations = allDurations.sort((a, b) => a - b)
  const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0
  const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)] || 0
  const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0

  return {
    totalRequests,
    slowRequests,
    slowRequestRate: totalRequests > 0 ? ((slowRequests / totalRequests) * 100).toFixed(1) + '%' : '0%',
    percentiles: {
      p50: `${p50}ms`,
      p95: `${p95}ms`,
      p99: `${p99}ms`,
    },
    topSlowRoutes: routeStats.slice(0, 10),
  }
}

/**
 * Export metrics to JSON
 * Returns data structure for export (caller handles file writing)
 */
export function exportMetrics(): Record<string, any> {
  const summary = getPerformanceSummary()
  const store = getMetricsStore()

  return {
    exportedAt: new Date().toISOString(),
    summary,
    recentMetrics: getRecentMetrics(100),
    allMetrics: store,
  }
}

/**
 * Clear metrics (for testing or reset)
 */
export function clearMetrics(): void {
  const store = getMetricsStore()
  store.length = 0
  console.log('[performance-logger] Metrics cleared from memory')
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create a timing context for a request
 */
export function createTimingContext() {
  const startTime = Date.now()

  return {
    startTime,
    /**
     * Complete the timing and record metric
     */
    complete: (params: {
      method: string
      path: string
      status?: number
      userAgent?: string
      ip?: string
    }) => {
      const duration = Date.now() - startTime

      const metric: RequestMetric = {
        timestamp: new Date().toISOString(),
        method: params.method,
        path: params.path,
        duration,
        status: params.status,
        slow: duration > SLOW_REQUEST_THRESHOLD,
        userAgent: params.userAgent,
        ip: params.ip,
      }

      recordMetric(metric)

      return {
        duration,
        slow: metric.slow,
      }
    },
  }
}

/**
 * Add timing headers to response
 */
export function addTimingHeaders(response: Response, duration: number): void {
  // Server-Timing header for browser DevTools
  const timingHeader = `total;dur=${duration}`
  ;(response.headers as any).set('Server-Timing', timingHeader)

  // Custom timing header
  ;(response.headers as any).set('X-Response-Time', `${duration}ms`)
}
