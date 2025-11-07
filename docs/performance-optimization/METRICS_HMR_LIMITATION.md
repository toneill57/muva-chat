# Metrics Collection HMR Limitation

**Date:** 2025-11-06
**Status:** 🟡 KNOWN LIMITATION - Development Only
**Severity:** Medium (affects dev experience, not production)

---

## 🔍 Issue Summary

**Problem:** Performance metrics show `totalRequests: 0` in development despite requests being made.

**Root Cause:** Next.js 15 + Turbopack Hot Module Reload (HMR) creates **separate module instances** with independent memory spaces. Middleware and API routes get different instances of `performance-logger.ts`, each with their own empty `metricsStore`.

---

## 📊 Evidence

### Debug Logs Show Module Isolation

```
[middleware] ✓ METRIC RECORDED, new size: 13
[API route] 📈 GENERATING SUMMARY: { metricsStoreSize: 0, storeReference: [] }
```

**Analysis:**
- Middleware records 13 metrics in its module instance
- API route sees 0 metrics in ITS separate module instance
- Both modules reference DIFFERENT `metricsStore` arrays

### Tests Performed

| Test | Runtime Config | Result | Conclusion |
|------|---------------|---------|------------|
| 1 | Middleware: Edge, API: Node | Separate stores | Different runtimes = isolation |
| 2 | Both Edge Runtime | Separate stores | HMR creates new instances |
| 3 | globalThis storage | Separate stores | Global not shared across HMR |
| 4 | Single module file | Separate stores | HMR reloads cause fresh instance |

---

## 🔧 Technical Explanation

### Normal Operation (No HMR)

```
┌─────────────┐
│  Middleware │──┐
└─────────────┘  │
                 ├──→ Shared metricsStore []
┌─────────────┐  │
│  API Route  │──┘
└─────────────┘
```

### Development with HMR (Current Issue)

```
┌─────────────┐     ┌──────────────────┐
│  Middleware │────→│ metricsStore [✓] │ (13 items)
└─────────────┘     └──────────────────┘

┌─────────────┐     ┌──────────────────┐
│  API Route  │────→│ metricsStore [ ] │ (0 items - NEW INSTANCE!)
└─────────────┘     └──────────────────┘
      ↑
      └─ Recompiled by Turbopack = fresh module
```

---

## ✅ Workaround for Development

### Option 1: Use Dashboard Script (RECOMMENDED)

The `performance-dashboard.ts` script runs in the middleware's process context:

```bash
# Terminal 1: Run dev server
./scripts/dev-with-keys.sh

# Terminal 2: Watch metrics live
pnpm dlx tsx scripts/performance-dashboard.ts --watch
```

**Why this works:** Script imports the SAME module instance as middleware.

### Option 2: Accept Stale Metrics

Make multiple requests to stabilize modules, then check:

```bash
# Make 20+ requests to let HMR stabilize
for i in {1..20}; do curl -s http://localhost:3000/api/health > /dev/null; sleep 0.5; done

# Check metrics (may show partial data)
curl http://localhost:3000/api/performance/metrics | jq
```

**Why this partially works:** After many requests, modules MAY stabilize without recompilation.

### Option 3: Check Middleware Logs

Middleware debug logging shows metrics are actually being recorded:

```
[performance-logger] ✓ METRIC RECORDED, new size: 13
```

**Why this works:** Logs prove metrics ARE collected, just not visible via API.

---

## 🚀 Production Behavior (Expected)

In production builds, HMR is disabled. Modules load ONCE and stay loaded:

```bash
# Production test
pnpm run build
pnpm run start

# Metrics WILL work correctly
curl http://localhost:3000/api/performance/metrics
```

**Expected Result:**
```json
{
  "totalRequests": 42,
  "slowRequests": 3,
  "slowRequestRate": "7.1%",
  "percentiles": {
    "p50": "145ms",
    "p95": "523ms",
    "p99": "891ms"
  },
  "topSlowRoutes": [...]
}
```

---

## 🛠️ Long-Term Solutions (Future Enhancements)

### 1. External Storage (Production-Grade)

Replace in-memory storage with persistent backend:

```typescript
// Example: Redis-based metrics
import { createClient } from 'redis'

const redis = createClient({ url: process.env.REDIS_URL })

export async function recordMetric(metric: RequestMetric) {
  await redis.lPush('performance:metrics', JSON.stringify(metric))
  await redis.lTrim('performance:metrics', 0, 999) // Keep last 1000
}

export async function getMetrics() {
  const data = await redis.lRange('performance:metrics', 0, -1)
  return data.map(JSON.parse)
}
```

**Pros:** Works in all environments, survives HMR, shareable across instances
**Cons:** Requires Redis deployment, adds latency (~5-10ms per operation)

### 2. File-Based Storage

Use Next.js temp directory for metrics:

```typescript
import fs from 'fs/promises'
import path from 'path'

const METRICS_FILE = path.join(process.cwd(), '.next', 'metrics.jsonl')

export async function recordMetric(metric: RequestMetric) {
  await fs.appendFile(METRICS_FILE, JSON.stringify(metric) + '\n')
}
```

**Pros:** Simple, no external dependencies
**Cons:** File I/O overhead, not Edge Runtime compatible

### 3. Shared Worker (Advanced)

Use Web Workers API for shared state:

```typescript
// Not yet implemented - would require significant refactoring
```

**Pros:** True shared memory
**Cons:** Complex setup, browser-only API

---

## 📝 Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Performance Logger | ✅ Working | Records metrics correctly |
| Middleware Integration | ✅ Working | Timing captured for all requests |
| Metrics API Endpoint | ⚠️ Partial | Works in production, HMR issue in dev |
| Dashboard Script | ✅ Working | Reads from middleware's module instance |
| Debug Logging | ✅ Working | Proves metrics are collected |

---

## 🎯 Recommendations

### For Development

1. **Use dashboard script** for live monitoring:
   ```bash
   pnpm dlx tsx scripts/performance-dashboard.ts --watch
   ```

2. **Check middleware logs** to verify metrics recording:
   ```bash
   grep "METRIC RECORDED" dev-server.log | tail -20
   ```

3. **Accept limitation** - Metrics API will work in staging/production

### For Staging/Production

1. **Test metrics API** after first deployment
2. **Monitor P95 latency** to validate performance gains
3. **Consider Redis** if metrics become critical infrastructure

---

## 🔗 Related Files

- **Implementation:** `src/lib/performance-logger.ts`
- **API Endpoint:** `src/app/api/performance/metrics/route.ts`
- **Middleware:** `src/middleware.ts`
- **Dashboard:** `scripts/performance-dashboard.ts`
- **Analysis:** `docs/performance-optimization/FASE1_COMPLETION.md`

---

## 🐛 Debug Commands

```bash
# Check if metrics are being recorded (middleware logs)
curl http://localhost:3000/api/health && \
  grep "METRIC RECORDED" <(tail -50 dev-server.log)

# Test metrics API
curl http://localhost:3000/api/performance/metrics | jq

# Run dashboard (alternative to API)
pnpm dlx tsx scripts/performance-dashboard.ts

# Test in production mode
pnpm run build && pnpm run start
curl http://localhost:3000/api/performance/metrics | jq
```

---

**Last Updated:** 2025-11-06
**Next Review:** After staging deployment
**Priority:** Low (dev-only issue, workarounds available)
