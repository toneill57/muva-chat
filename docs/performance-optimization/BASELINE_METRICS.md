# Performance Baseline Metrics

**Project:** MUVA Chat Performance Optimization
**Created:** 2025-11-06
**Status:** ✅ Instrumentation Complete - Ready for Data Collection

---

## 📊 Overview

Este documento describe cómo establecer métricas baseline para el proyecto de optimización de performance. El sistema de instrumentación está completo y listo para recolectar datos.

---

## 🛠️ Infrastructure Setup

### Performance Logging System

**Status:** ✅ Deployed and Active

**Components:**
- `src/lib/performance-logger.ts` - Core logging library
- `src/middleware.ts` - Automatic request timing
- `src/app/api/performance/metrics/route.ts` - Metrics API
- `scripts/performance-dashboard.ts` - Visualization tool

**Features:**
- ✅ Edge Runtime compatible (in-memory storage)
- ✅ Automatic slow request detection (>2s threshold)
- ✅ Percentile calculations (P50, P95, P99)
- ✅ Per-route statistics
- ✅ Request volume tracking
- ✅ Response headers (`Server-Timing`, `X-Response-Time`)

---

## 🚀 How to Collect Baseline Metrics

### Step 1: Start Development Server

```bash
# Start server with performance logging enabled
./scripts/dev-with-keys.sh
```

**What happens:**
- Middleware automatically tracks all requests
- Metrics stored in memory (last 1,000 requests)
- Slow requests (>2s) logged to console with 🐌 emoji

### Step 2: Generate Representative Traffic

**Simulate typical usage patterns:**

```bash
# Option A: Manual testing (recommended for baseline)
# 1. Open browser: http://simmerdown.localhost:3000
# 2. Navigate through:
#    - Homepage
#    - Staff login
#    - Dashboard
#    - Guest chat (5-10 messages)
#    - Reservations list
#    - Settings page

# Option B: Automated load testing (optional)
# Coming in FASE 5
```

**Target:** At least 50-100 requests across different routes

### Step 3: View Performance Dashboard

```bash
# Basic dashboard
pnpm dlx tsx scripts/performance-dashboard.ts

# JSON output (for analysis)
pnpm dlx tsx scripts/performance-dashboard.ts --json > baseline-metrics.json

# Specific route details
pnpm dlx tsx scripts/performance-dashboard.ts --route=/api/guest/chat
```

### Step 4: Export Baseline Snapshot

```bash
# Export full metrics
curl http://localhost:3000/api/performance/metrics?format=full > baseline-$(date +%Y%m%d).json

# Or just summary
curl http://localhost:3000/api/performance/metrics > baseline-summary-$(date +%Y%m%d).json
```

---

## 📈 Key Metrics to Track

### 1. Response Time Percentiles

**Critical Metrics:**
- **P50 (Median):** Typical user experience
- **P95:** Experience for 95% of users
- **P99:** Worst-case scenarios (excluding outliers)

**Baseline Targets:**
```
P50: < 200ms   (excellent)
     < 500ms   (acceptable)
     > 1000ms  (needs optimization)

P95: < 500ms   (excellent)
     < 1000ms  (acceptable)
     > 2000ms  (needs optimization)

P99: < 1000ms  (excellent)
     < 2000ms  (acceptable)
     > 5000ms  (needs optimization)
```

### 2. Slow Request Rate

**Definition:** Requests taking >2 seconds

**Baseline Targets:**
```
< 1%    (excellent)
< 5%    (acceptable)
> 10%   (critical - immediate attention)
```

### 3. Top Slow Routes

**Focus Areas:**
- Guest chat endpoints (`/api/guest/chat`, `/api/public/chat`)
- Vector search operations
- MotoPress sync (`/api/integrations/motopress/*`)
- Reservation queries

### 4. Request Volume Distribution

**Purpose:** Identify high-traffic endpoints for optimization priority

---

## 🎯 Establishing Your Baseline

### Current State (Template)

Fill this out after collecting 100+ requests:

```
=== BASELINE METRICS (2025-11-06) ===

Total Requests Analyzed:     [TBD]
Time Period:                  [TBD] minutes
Unique Routes:                [TBD]

Response Time Percentiles:
  P50 (median):               [TBD]ms
  P95:                        [TBD]ms
  P99:                        [TBD]ms

Slow Requests (>2s):
  Count:                      [TBD]
  Rate:                       [TBD]%

Top 5 Slowest Routes:
  1. [route]                  [avg]ms
  2. [route]                  [avg]ms
  3. [route]                  [avg]ms
  4. [route]                  [avg]ms
  5. [route]                  [avg]ms

Top 5 Highest Volume:
  1. [route]                  [count] requests
  2. [route]                  [count] requests
  3. [route]                  [count] requests
  4. [route]                  [count] requests
  5. [route]                  [count] requests
```

---

## 🔍 Analysis Guidelines

### Identifying Performance Issues

**Red Flags:**
1. **Any route with P95 > 2s** - Immediate investigation required
2. **Slow request rate > 5%** - System-wide issue
3. **High variance (P99 >> P95)** - Unpredictable performance
4. **Linear scaling issues** - Performance degrades with load

### Expected Patterns

**Fast Routes (< 100ms typical):**
- Static content (`/api/tenant/branding`)
- Simple queries (`/api/health`)
- Cached data

**Medium Routes (100-500ms):**
- Database queries with joins
- Simple chat responses
- List operations

**Slow Routes (500ms - 2s):**
- Vector search operations
- Complex AI responses
- External API calls (MotoPress)

**Critical Routes (> 2s):**
- Should be ZERO in production
- Acceptable only for:
  - Initial sync operations
  - Batch processing
  - Report generation

---

## 📊 Dashboard Examples

### Example Output: Healthy System

```
╔══════════════════════════════════════════════════════════════╗
║              📊 PERFORMANCE DASHBOARD                        ║
╚══════════════════════════════════════════════════════════════╝

📈 OVERALL STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests:       127
Slow Requests (>2s):  2 (1.6%)

Response Time Percentiles:
  P50 (median):       245ms
  P95:                890ms
  P99:                1850ms
```

**Analysis:** ✅ HEALTHY
- P50 < 500ms: Excellent median performance
- P95 < 1s: Good experience for 95% of users
- Slow rate < 5%: Acceptable outliers

### Example Output: Needs Optimization

```
📈 OVERALL STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Requests:       89
Slow Requests (>2s):  12 (13.5%)

Response Time Percentiles:
  P50 (median):       1240ms
  P95:                3200ms
  P99:                5100ms
```

**Analysis:** 🚨 CRITICAL
- P50 > 1s: Majority of users experiencing slowness
- P95 > 2s: Unacceptable for 5% of requests
- Slow rate > 10%: System-wide performance issue

---

## 🎬 Next Steps After Baseline

### Immediate Actions

1. **Document baseline metrics** (fill template above)
2. **Identify top 3 slowest routes**
3. **Investigate root causes:**
   - N+1 query patterns?
   - Missing database indexes?
   - Excessive embedding API calls?
   - Large payload sizes?

### FASE 2: Database Optimization

**Focus Areas:**
- Analyze query patterns for N+1 issues
- Add indexes for frequent WHERE clauses
- Optimize RPC functions
- Review connection pooling

**Goal:** Reduce P95 by 30%

---

## 📝 Performance Budget

### Setting Targets

After establishing baseline, set optimization targets:

```
Current Baseline → Target (FASE 5)

P50: [X]ms → [X * 0.6]ms  (-40%)
P95: [X]ms → [X * 0.65]ms (-35%)
Slow Rate: [X]% → < 1%
```

**Example:**
```
P50: 450ms → 270ms  (-40%)
P95: 1200ms → 780ms (-35%)
Slow Rate: 3.2% → < 1%
```

---

## 🔄 Continuous Monitoring

### Daily Checks (Optional)

```bash
# Quick health check
pnpm dlx tsx scripts/performance-dashboard.ts | grep "P95:"

# Alert if P95 > 2s
if [ $(curl -s http://localhost:3000/api/performance/metrics | jq -r '.percentiles.p95' | tr -d 'ms') -gt 2000 ]; then
  echo "⚠️  P95 exceeds 2s threshold!"
fi
```

### Integration with CI/CD

**Coming in FASE 5:**
- Performance budget enforcement
- Automatic regression detection
- Alert on threshold breaches

---

## 📚 Reference

### Browser DevTools Integration

Performance headers are automatically added to all responses:

```http
Server-Timing: total;dur=245
X-Response-Time: 245ms
```

**How to view:**
1. Open Chrome DevTools → Network tab
2. Click any request
3. Check "Timing" tab → "Server Timing"

### API Endpoints

**Get Summary:**
```bash
curl http://localhost:3000/api/performance/metrics
```

**Get Full Metrics:**
```bash
curl http://localhost:3000/api/performance/metrics?format=full
```

**Dashboard:**
```bash
pnpm dlx tsx scripts/performance-dashboard.ts
```

---

## ✅ Checklist: Baseline Establishment

- [ ] Development server running with performance logging
- [ ] Generated 100+ requests across different routes
- [ ] Exported baseline metrics to JSON
- [ ] Documented P50, P95, P99 values
- [ ] Identified top 5 slowest routes
- [ ] Set optimization targets (40% P50 reduction)
- [ ] Ready to proceed with FASE 2 (Database Optimization)

---

**Last Updated:** 2025-11-06
**Next Review:** After FASE 2 completion
**Status:** Ready for data collection
