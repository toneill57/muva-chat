# Performance Optimization Plan

**Project:** MUVA Chat Performance & Cost Optimization
**Start Date:** 2025-11-06
**Status:** 🎯 Active - FASE 1 in progress
**Priority:** 🟡 HIGH

---

## 🎯 Executive Summary

**Mission:** Optimize MUVA Chat for production scale - reduce response times, lower operational costs, and improve user experience.

**Baseline Metrics (Current State):**
- 74 API routes deployed
- 180+ embedding API calls in codebase
- 45+ direct database queries
- Embedding cache: 100 entries max (LRU)
- Rate limiting: In-memory (per-instance)

**Target Improvements:**
- 🎯 API Response Time: -40% (currently unknown baseline)
- 🎯 Database Query Efficiency: -30% queries via optimization
- 🎯 Embedding Costs: -50% via improved caching
- 🎯 Token Usage: -25% via prompt optimization
- 🎯 Cache Hit Rate: 80%+ for embeddings

---

## 📊 Discovery Phase - Current Analysis

### Infrastructure Overview
```
API Routes:          74 endpoints
Database Queries:    45+ direct queries
Embedding Calls:     180+ references
Cache Usage:         157 cache-related lines
Parallel Execution:  17 Promise.all usages
```

### Known Performance Issues
1. **MotoPress Integration** - Marked as "MUCH SLOWER" in code (`src/lib/integrations/motopress/client.ts:350`)
2. **Rate Limiting** - In-memory only (no Redis/distributed)
3. **Embedding Cache** - 100 entries max (may be insufficient)
4. **TODO Comments** - 10+ performance-related TODOs found

### Architecture Strengths
- ✅ Embedding cache already implemented (LRU)
- ✅ Lazy client initialization (Supabase, OpenAI, Anthropic)
- ✅ Some parallel execution with Promise.all
- ✅ Rate limiting exists (basic implementation)

---

## 🚀 Optimization Phases

### FASE 1: Performance Baseline & Profiling (4-6h)
**Goal:** Establish measurable baseline metrics

**Tasks:**
1. **Implement request timing middleware** (90 min)
   - Track response times for all API routes
   - Log slow queries (>2s threshold)
   - Export metrics to JSON

2. **Database query profiling** (90 min)
   - Identify N+1 query patterns
   - Find missing indexes
   - Analyze RPC function performance

3. **Embedding usage audit** (90 min)
   - Count API calls per endpoint
   - Calculate monthly cost projection
   - Identify duplicate embedding generations

4. **Create performance dashboard script** (60 min)
   - `scripts/performance-dashboard.ts`
   - Real-time metrics visualization
   - Exportable reports

**Deliverables:**
- `docs/performance-optimization/BASELINE_METRICS.md`
- `scripts/performance-dashboard.ts`
- Performance logging middleware

---

### FASE 2: Database Optimization (4-5h)
**Goal:** Reduce database query overhead by 30%

**Tasks:**
1. **Index optimization** (90 min)
   - Add indexes for frequent WHERE clauses
   - Composite indexes for multi-column queries
   - Verify with EXPLAIN ANALYZE

2. **Query consolidation** (90 min)
   - Combine multiple SELECT queries
   - Use JOINs instead of separate queries
   - Implement batching for bulk operations

3. **RPC function performance** (60 min)
   - Optimize `match_*` vector search functions
   - Add materialized views if needed
   - Cache frequent queries

4. **Connection pooling review** (30 min)
   - Verify Supabase connection limits
   - Implement connection reuse patterns

**Metrics to Track:**
- Queries reduced: X → Y (-Z%)
- Average query time: Xms → Yms (-Z%)
- Database CPU usage: X% → Y%

**Deliverables:**
- Database migration with new indexes
- Updated RPC functions
- `docs/performance-optimization/DATABASE_OPTIMIZATION.md`

---

### FASE 3: Embedding & AI Cost Optimization (5-6h)
**Goal:** Reduce embedding costs by 50%

**Tasks:**
1. **Expand embedding cache** (60 min)
   - Increase cache size: 100 → 500 entries
   - Add Redis for distributed caching (optional)
   - Implement cache warming for common queries

2. **Query deduplication** (90 min)
   - Detect semantically similar queries
   - Use cosine similarity for cache lookup
   - Implement fuzzy matching

3. **Pre-generated embeddings** (90 min)
   - Generate embeddings for FAQ questions
   - Store in database for instant lookup
   - Add to warmup script

4. **Prompt optimization** (90 min)
   - Reduce system prompt token count
   - Compress context without losing quality
   - A/B test shorter prompts

5. **Model tier optimization** (30 min)
   - Use GPT-4o-mini for simple queries
   - Reserve Claude Sonnet for complex tasks
   - Implement intent-based routing

**Metrics to Track:**
- OpenAI API calls: X/day → Y/day (-Z%)
- Cache hit rate: X% → 80%+
- Monthly embedding cost: $X → $Y (-50%)
- Average tokens per request: X → Y (-25%)

**Deliverables:**
- Enhanced embedding cache
- Pre-generated embeddings table
- `docs/performance-optimization/AI_COST_OPTIMIZATION.md`

---

### FASE 4: API Response Time Optimization (4-5h)
**Goal:** Reduce API response times by 40%

**Tasks:**
1. **Parallel execution expansion** (90 min)
   - Identify sequential operations that can run in parallel
   - Replace sequential awaits with Promise.all
   - Benchmark improvements

2. **Response streaming** (90 min)
   - Implement streaming for chat endpoints
   - Send partial responses during processing
   - Improve perceived performance

3. **Route-level caching** (60 min)
   - Cache static content (hotel info, policies)
   - Implement stale-while-revalidate
   - Use Next.js `unstable_cache` effectively

4. **Lazy loading optimization** (60 min)
   - Defer non-critical data loading
   - Implement pagination for large lists
   - Add infinite scroll for reservations

**Metrics to Track:**
- P50 response time: Xms → Yms (-40%)
- P95 response time: Xms → Yms (-35%)
- Streaming adoption: X% → 80%+ routes

**Deliverables:**
- Optimized API routes
- Streaming implementation
- `docs/performance-optimization/API_OPTIMIZATION.md`

---

### FASE 5: Infrastructure & Monitoring (3-4h)
**Goal:** Continuous performance monitoring

**Tasks:**
1. **Performance monitoring integration** (90 min)
   - Add to existing monitoring dashboard
   - Alert on performance regressions
   - Track P50/P95/P99 response times

2. **Load testing suite** (90 min)
   - Create k6 or Artillery tests
   - Simulate 100 concurrent guests
   - Identify bottlenecks under load

3. **Performance budget** (30 min)
   - Set thresholds for CI/CD
   - Fail builds on regression
   - Document performance SLAs

4. **Documentation & runbooks** (30 min)
   - Performance troubleshooting guide
   - Optimization best practices
   - Cost monitoring playbook

**Deliverables:**
- Load testing scripts
- Performance budget config
- `docs/performance-optimization/MONITORING_GUIDE.md`
- `docs/performance-optimization/COMPLETION_SUMMARY.md`

---

## 📈 Success Metrics

### Before Optimization (Baseline - TBD)
```
API Response Time (P50):     TBD ms
API Response Time (P95):     TBD ms
Database Queries per Request: TBD
Embedding API Calls per Day:  TBD
Cache Hit Rate:               TBD%
Monthly AI Costs:             TBD USD
```

### After Optimization (Target)
```
API Response Time (P50):     -40% reduction
API Response Time (P95):     -35% reduction
Database Queries per Request: -30% reduction
Embedding API Calls per Day:  -50% reduction
Cache Hit Rate:               80%+
Monthly AI Costs:             -50% reduction
```

### Business Impact
- **User Experience:** Faster responses = better satisfaction
- **Cost Savings:** 50% AI cost reduction = $XXX/month saved
- **Scalability:** Support 10x more concurrent users
- **Reliability:** Reduced database load = fewer timeouts

---

## 🔄 Rollout Strategy

### Phase 1: Measurement (Week 1)
- Implement metrics collection
- Establish baseline
- No production changes

### Phase 2: Low-Risk Optimizations (Week 2)
- Database indexes
- Cache expansion
- No user-facing changes

### Phase 3: High-Impact Changes (Week 3)
- API streaming
- Parallel execution
- Gradual rollout via feature flags

### Phase 4: Validation (Week 4)
- Load testing
- Performance budget enforcement
- Final documentation

---

## 📚 Documentation Structure

```
docs/performance-optimization/
├── PLAN.md (this file)
├── BASELINE_METRICS.md
├── DATABASE_OPTIMIZATION.md
├── AI_COST_OPTIMIZATION.md
├── API_OPTIMIZATION.md
├── MONITORING_GUIDE.md
├── COMPLETION_SUMMARY.md
└── TODO.md
```

---

## 🚦 Next Steps

**Immediate Actions:**
1. ✅ Create project structure
2. → Implement request timing middleware
3. → Run database query profiling
4. → Establish baseline metrics

**Dependencies:**
- Access to production metrics (optional)
- Load testing tools (k6 or Artillery)
- Redis instance (optional for distributed cache)

---

**Last Updated:** 2025-11-06
**Project Owner:** Development Team
**Expected Duration:** 4-5 weeks (20-26 hours total)
**ROI:** High (cost reduction + UX improvement)
