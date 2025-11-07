/**
 * Performance Dashboard
 *
 * Visualizes API performance metrics collected by the performance logger.
 *
 * Usage:
 *   pnpm dlx tsx scripts/performance-dashboard.ts
 *   pnpm dlx tsx scripts/performance-dashboard.ts --json
 *   pnpm dlx tsx scripts/performance-dashboard.ts --route=/api/guest/chat
 *   pnpm dlx tsx scripts/performance-dashboard.ts --export
 *   pnpm dlx tsx scripts/performance-dashboard.ts --api=http://localhost:3000
 */

// ============================================================================
// Types
// ============================================================================

interface RequestMetric {
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
  slowRate?: string
}

interface PerformanceSummary {
  totalRequests: number
  slowRequests: number
  slowRequestRate: string
  percentiles: {
    p50: string
    p95: string
    p99: string
  }
  topSlowRoutes: RouteStats[]
}

// ============================================================================
// Configuration
// ============================================================================

const SLOW_THRESHOLD = 2000 // 2 seconds

// ============================================================================
// Data Loading
// ============================================================================

async function loadMetricsFromAPI(apiUrl: string): Promise<{ summary: PerformanceSummary; allMetrics: RequestMetric[] }> {
  try {
    const response = await fetch(`${apiUrl}/api/performance/metrics?format=full`)
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('⚠️  Failed to fetch metrics from API:', error)
    console.log(`   Tried: ${apiUrl}/api/performance/metrics`)
    process.exit(1)
  }
}

// ============================================================================
// Analysis Functions
// ============================================================================

function calculateRouteStats(metrics: RequestMetric[]): RouteStats[] {
  const routeMap = new Map<string, RequestMetric[]>()

  // Group by route
  metrics.forEach(metric => {
    const existing = routeMap.get(metric.path) || []
    existing.push(metric)
    routeMap.set(metric.path, existing)
  })

  // Calculate stats for each route
  const stats: RouteStats[] = []
  routeMap.forEach((routeMetrics, path) => {
    const durations = routeMetrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const slowCount = routeMetrics.filter(m => m.slow).length

    stats.push({
      path,
      count: routeMetrics.length,
      totalDuration,
      avgDuration: Math.round(totalDuration / routeMetrics.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      slowCount,
      slowRate: `${((slowCount / routeMetrics.length) * 100).toFixed(1)}%`,
    })
  })

  // Sort by average duration (slowest first)
  return stats.sort((a, b) => b.avgDuration - a.avgDuration)
}

function calculatePercentiles(metrics: RequestMetric[]): { p50: number; p95: number; p99: number } {
  const durations = metrics.map(m => m.duration).sort((a, b) => a - b)

  return {
    p50: durations[Math.floor(durations.length * 0.5)] || 0,
    p95: durations[Math.floor(durations.length * 0.95)] || 0,
    p99: durations[Math.floor(durations.length * 0.99)] || 0,
  }
}

function getSlowestRequests(metrics: RequestMetric[], limit: number = 10): RequestMetric[] {
  return [...metrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit)
}

// ============================================================================
// Visualization Functions
// ============================================================================

function formatDuration(ms: number | string): string {
  const num = typeof ms === 'string' ? parseInt(ms.replace('ms', '')) : ms
  if (num < 1000) return `${num}ms`
  return `${(num / 1000).toFixed(2)}s`
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function createProgressBar(value: number, max: number, width: number = 30): string {
  const filled = Math.round((value / max) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

function printSummary(summary: PerformanceSummary, metrics: RequestMetric[]): void {
  const totalRequests = summary.totalRequests
  const slowRequests = summary.slowRequests
  const routeStats = summary.topSlowRoutes

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║              📊 PERFORMANCE DASHBOARD                        ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  // Overall Statistics
  console.log('📈 OVERALL STATISTICS')
  console.log('━'.repeat(64))
  console.log(`Total Requests:       ${totalRequests.toLocaleString()}`)
  console.log(`Slow Requests (>2s):  ${slowRequests} (${summary.slowRequestRate})`)
  console.log(`\nResponse Time Percentiles:`)
  console.log(`  P50 (median):       ${summary.percentiles.p50}`)
  console.log(`  P95:                ${summary.percentiles.p95}`)
  console.log(`  P99:                ${summary.percentiles.p99}`)

  // Top Slowest Routes
  console.log('\n\n🐌 TOP 10 SLOWEST ROUTES (by average)')
  console.log('━'.repeat(64))
  console.log('Route                              Avg     Min     Max   Slow%')
  console.log('─'.repeat(64))

  routeStats.slice(0, 10).forEach(stat => {
    const routeName = stat.path.length > 34 ? stat.path.substring(0, 31) + '...' : stat.path.padEnd(34)
    const avg = formatDuration(stat.avgDuration).padStart(6)
    const min = formatDuration(stat.minDuration).padStart(6)
    const max = formatDuration(stat.maxDuration).padStart(6)
    const slowRate = (stat.slowRate || '0%').padStart(5)

    console.log(`${routeName} ${avg} ${min} ${max} ${slowRate}`)
  })

  // Request Volume by Route
  console.log('\n\n📊 REQUEST VOLUME (Top 10)')
  console.log('━'.repeat(64))

  const maxCount = Math.max(...routeStats.map(s => s.count))
  routeStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(stat => {
      const bar = createProgressBar(stat.count, maxCount, 25)
      const routeName = stat.path.length > 28 ? stat.path.substring(0, 25) + '...' : stat.path.padEnd(28)
      console.log(`${routeName} ${bar} ${stat.count}`)
    })

  // Slowest Individual Requests
  if (metrics.length > 0) {
    console.log('\n\n⏱️  SLOWEST 10 INDIVIDUAL REQUESTS')
    console.log('━'.repeat(64))
    console.log('Time                  Duration    Route')
    console.log('─'.repeat(64))

    const slowestRequests = getSlowestRequests(metrics, 10)
    slowestRequests.forEach(req => {
      const time = formatTimestamp(req.timestamp).padEnd(20)
      const duration = formatDuration(req.duration).padStart(8)
      const route = req.path.length > 30 ? req.path.substring(0, 27) + '...' : req.path
      console.log(`${time} ${duration}    ${route}`)
    })
  }

  console.log('\n' + '━'.repeat(64))
  console.log(`\n✓ Analyzed ${totalRequests.toLocaleString()} requests\n`)
}

function printRouteDetails(metrics: RequestMetric[], routePath: string): void {
  const routeMetrics = metrics.filter(m => m.path === routePath)

  if (routeMetrics.length === 0) {
    console.log(`\n⚠️  No metrics found for route: ${routePath}\n`)
    return
  }

  const durations = routeMetrics.map(m => m.duration)
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const slowCount = routeMetrics.filter(m => m.slow).length
  const percentiles = calculatePercentiles(routeMetrics)

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log(`║  📍 ROUTE DETAILS: ${routePath.substring(0, 43).padEnd(43)}║`)
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  console.log('📊 STATISTICS')
  console.log('━'.repeat(64))
  console.log(`Total Requests:       ${routeMetrics.length}`)
  console.log(`Slow Requests:        ${slowCount} (${((slowCount / routeMetrics.length) * 100).toFixed(1)}%)`)
  console.log(`\nDuration Statistics:`)
  console.log(`  Average:            ${formatDuration(avgDuration)}`)
  console.log(`  Min:                ${formatDuration(minDuration)}`)
  console.log(`  Max:                ${formatDuration(maxDuration)}`)
  console.log(`\nPercentiles:`)
  console.log(`  P50:                ${formatDuration(percentiles.p50)}`)
  console.log(`  P95:                ${formatDuration(percentiles.p95)}`)
  console.log(`  P99:                ${formatDuration(percentiles.p99)}`)

  console.log('\n\n⏱️  RECENT REQUESTS (last 20)')
  console.log('━'.repeat(64))
  console.log('Time                  Duration    Status')
  console.log('─'.repeat(64))

  routeMetrics.slice(-20).forEach(req => {
    const time = formatTimestamp(req.timestamp).padEnd(20)
    const duration = formatDuration(req.duration).padStart(8)
    const status = (req.status || '').toString().padStart(6)
    const slowMarker = req.slow ? ' 🐌' : ''
    console.log(`${time} ${duration}   ${status}${slowMarker}`)
  })

  console.log('\n' + '━'.repeat(64) + '\n')
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const jsonMode = args.includes('--json')
  const routeArg = args.find(arg => arg.startsWith('--route='))
  const routePath = routeArg ? routeArg.split('=')[1] : null
  const apiArg = args.find(arg => arg.startsWith('--api='))
  const apiUrl = apiArg ? apiArg.split('=')[1] : 'http://localhost:3000'

  console.log(`\n📊 Loading metrics from: ${apiUrl}`)
  console.log(`   Use --api=<url> to change the API endpoint\n`)

  const { summary, allMetrics } = await loadMetricsFromAPI(apiUrl)

  if (jsonMode) {
    console.log(JSON.stringify({ summary, allMetrics }, null, 2))
    return
  }

  if (routePath) {
    printRouteDetails(allMetrics, routePath)
    return
  }

  printSummary(summary, allMetrics)
}

main()
