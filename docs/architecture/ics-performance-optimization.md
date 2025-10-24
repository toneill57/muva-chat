# ICS Sync Performance Optimization

Performance targets, optimization strategies, and scaling considerations for multi-source calendar synchronization.

---

## 📋 Table of Contents

1. [Performance Targets](#performance-targets)
2. [Database Optimization](#database-optimization)
3. [Network Optimization](#network-optimization)
4. [Caching Strategy](#caching-strategy)
5. [Batch Processing](#batch-processing)
6. [Scaling Considerations](#scaling-considerations)
7. [Monitoring & Metrics](#monitoring--metrics)

---

## Performance Targets

### Latency Targets

| Operation | Target (p50) | Target (p95) | Target (p99) |
|-----------|--------------|--------------|--------------|
| Parse ICS feed (100 events) | <500ms | <1s | <2s |
| Sync single feed | <3s | <5s | <10s |
| Sync all feeds (10 properties) | <30s | <60s | <120s |
| Export ICS (100 events) | <200ms | <500ms | <1s |
| Conflict resolution | <100ms | <200ms | <500ms |
| API response time | <500ms | <1s | <2s |

### Throughput Targets

- **Events per second:** 100+ events/sec (parsing)
- **Concurrent syncs:** 50+ simultaneous feeds
- **API requests:** 1000+ req/min
- **Database writes:** 500+ inserts/sec

### Resource Limits

- **Memory:** <512MB per sync operation
- **CPU:** <50% utilization during normal load
- **Database connections:** <20 per sync worker
- **Network bandwidth:** <10MB/s per tenant

---

## Database Optimization

### 1. Indexes

**Critical Indexes:**
```sql
-- Primary lookup index (used in 90% of queries)
CREATE INDEX CONCURRENTLY idx_calendar_events_lookup
ON calendar_events(tenant_id, property_id, start_date, end_date)
WHERE status != 'cancelled';

-- Source-based queries (sync operations)
CREATE INDEX CONCURRENTLY idx_calendar_events_source
ON calendar_events(tenant_id, source, external_uid)
INCLUDE (start_date, end_date, status);

-- Conflict detection
CREATE INDEX CONCURRENTLY idx_calendar_events_conflicts
ON calendar_events(tenant_id, external_uid)
WHERE status != 'cancelled';

-- Date range queries (common for calendar views)
CREATE INDEX CONCURRENTLY idx_calendar_events_dates
ON calendar_events(property_id, start_date, end_date)
WHERE status IN ('confirmed', 'pending');

-- Feed configuration lookups
CREATE INDEX CONCURRENTLY idx_feed_configs_active
ON ics_feed_configurations(tenant_id, is_active)
WHERE is_active = true;
```

**Index Usage Verification:**
```sql
-- Check if indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM calendar_events
WHERE tenant_id = '...'
  AND property_id = '...'
  AND start_date >= NOW()
  AND status = 'confirmed';

-- Expected: Index Scan using idx_calendar_events_lookup
```

### 2. Partitioning

**Time-based Partitioning (for large tenants):**
```sql
-- Partition by month for scalability
CREATE TABLE calendar_events (
  id uuid DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  start_date timestamptz NOT NULL,
  -- ... other fields
) PARTITION BY RANGE (start_date);

-- Create partitions for next 12 months
CREATE TABLE calendar_events_2025_11 PARTITION OF calendar_events
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE calendar_events_2025_12 PARTITION OF calendar_events
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Auto-create future partitions (extension: pg_partman)
SELECT create_parent('public.calendar_events', 'start_date', 'native', 'monthly');
```

**Benefits:**
- Query performance: 3-5x faster for date-range queries
- Maintenance: Faster VACUUM, easier archival
- Scalability: Supports 100M+ events

### 3. Query Optimization

**Avoid N+1 Queries:**
```typescript
// ❌ BAD: N+1 queries
for (const event of events) {
  const property = await supabase
    .from('properties')
    .select('*')
    .eq('id', event.property_id)
    .single();
}

// ✅ GOOD: Single join query
const { data: eventsWithProperties } = await supabase
  .from('calendar_events')
  .select(`
    *,
    properties(id, name, type)
  `)
  .in('id', eventIds);
```

**Batch Upserts:**
```typescript
// ❌ BAD: Individual inserts
for (const event of events) {
  await supabase.from('calendar_events').upsert(event);
}

// ✅ GOOD: Batch upsert (100x faster)
const BATCH_SIZE = 500;
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await supabase.from('calendar_events').upsert(batch);
}
```

**Materialized Views (for analytics):**
```sql
-- Pre-compute sync statistics
CREATE MATERIALIZED VIEW mv_sync_statistics AS
SELECT
  tenant_id,
  source,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_events,
  COUNT(*) FILTER (WHERE is_blocking = true) as blocks,
  MAX(last_sync_at) as last_sync
FROM calendar_events
GROUP BY tenant_id, source;

-- Refresh every hour
CREATE INDEX ON mv_sync_statistics(tenant_id);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sync_statistics;
```

### 4. Connection Pooling

**Supabase Client Configuration:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Don't persist in server-side
    },
    global: {
      headers: {
        'x-application-name': 'ics-sync-worker',
      },
    },
  }
);
```

**PgBouncer Configuration (if using external pool):**
```ini
[databases]
muva_chat = host=db.supabase.co port=5432 dbname=postgres

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

---

## Network Optimization

### 1. HTTP Optimizations

**ETag Support (70% bandwidth savings):**
```typescript
async function fetchWithETag(url: string, etag?: string): Promise<ParseResult> {
  const headers: Record<string, string> = {
    'Accept': 'text/calendar',
    'User-Agent': 'MUVA-Calendar-Sync/1.0',
  };

  if (etag) {
    headers['If-None-Match'] = etag;
  }

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    // Not modified
    return {
      modified: false,
      etag,
      events: [],
    };
  }

  const content = await response.text();
  const newEtag = response.headers.get('ETag');

  return {
    modified: true,
    etag: newEtag || undefined,
    events: await parseICS(content),
  };
}
```

**Compression:**
```typescript
const headers = {
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept': 'text/calendar',
};

// Node.js automatically decompresses, 60-80% size reduction
```

**HTTP/2 Multiplexing:**
```typescript
// Use fetch API (supports HTTP/2 in Node.js 18+)
const results = await Promise.all([
  fetch(url1),
  fetch(url2),
  fetch(url3),
]);

// Single TCP connection, parallel requests
```

### 2. Connection Reuse

**HTTP Agent Configuration:**
```typescript
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Use with fetch
fetch(url, { agent: url.startsWith('https') ? httpsAgent : httpAgent });
```

### 3. Parallel Fetching

**Concurrent Sync Operations:**
```typescript
async function syncAllFeedsOptimized(tenantId: string): Promise<SyncResult[]> {
  const { data: feeds } = await supabase
    .from('ics_feed_configurations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Sync feeds in parallel (max 10 concurrent)
  const CONCURRENCY_LIMIT = 10;
  const results: SyncResult[] = [];

  for (let i = 0; i < feeds.length; i += CONCURRENCY_LIMIT) {
    const batch = feeds.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(feed => syncFeed(buildConfig(feed)))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## Caching Strategy

### 1. In-Memory Caching

**Feed Content Cache:**
```typescript
import { LRUCache } from 'lru-cache';

interface CacheEntry {
  content: string;
  etag: string;
  timestamp: number;
}

const feedCache = new LRUCache<string, CacheEntry>({
  max: 500, // Cache 500 feeds
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
  sizeCalculation: (entry) => entry.content.length,
  maxSize: 50 * 1024 * 1024, // 50MB total
});

async function getCachedFeed(feedUrl: string): Promise<CacheEntry | null> {
  return feedCache.get(feedUrl) || null;
}
```

**Property Metadata Cache:**
```typescript
const propertyCache = new LRUCache<string, Property>({
  max: 1000,
  ttl: 15 * 60 * 1000, // 15 minutes
});

async function getProperty(propertyId: string): Promise<Property> {
  const cached = propertyCache.get(propertyId);
  if (cached) return cached;

  const { data } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (data) {
    propertyCache.set(propertyId, data);
  }

  return data;
}
```

### 2. Redis Caching (Multi-Instance)

**Distributed Cache:**
```typescript
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

async function getCachedSyncResult(feedId: string): Promise<SyncResult | null> {
  const key = `sync:result:${feedId}`;
  const cached = await redis.get(key);

  if (!cached) return null;

  return JSON.parse(cached);
}

async function cacheSyncResult(feedId: string, result: SyncResult): Promise<void> {
  const key = `sync:result:${feedId}`;
  const ttl = 5 * 60; // 5 minutes

  await redis.setex(key, ttl, JSON.stringify(result));
}
```

### 3. CDN Caching (Export Endpoints)

**Cloudflare Configuration:**
```typescript
// Add cache headers to export endpoint
export async function GET(request: NextRequest) {
  // ... generate ICS content

  return new NextResponse(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=600', // 5min client, 10min CDN
      'Surrogate-Key': `property-${propertyId}`,
      'ETag': generateETag(icsContent),
    },
  });
}
```

**Invalidation on Update:**
```typescript
// After sync, purge CDN cache
async function purgeCDNCache(propertyId: string): Promise<void> {
  await fetch('https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tags: [`property-${propertyId}`],
    }),
  });
}
```

---

## Batch Processing

### 1. Event Processing

**Batch Insert Strategy:**
```typescript
async function processBatch(events: ICSEvent[], config: SyncConfig): Promise<void> {
  const BATCH_SIZE = 500;
  const batches = chunk(events, BATCH_SIZE);

  for (const batch of batches) {
    // Process batch with conflict resolution
    const processedEvents = await Promise.all(
      batch.map(event => resolveAndPrepare(event, config))
    );

    // Batch upsert
    const { error } = await supabase
      .from('calendar_events')
      .upsert(processedEvents, {
        onConflict: 'tenant_id,external_uid',
      });

    if (error) throw error;
  }
}
```

### 2. Background Jobs

**Queue-based Processing:**
```typescript
import { Queue, Worker } from 'bullmq';

const syncQueue = new Queue('calendar-sync', {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Add job to queue
await syncQueue.add('sync-feed', {
  feedConfigId: 'abc-123',
  tenantId: 'tenant-1',
  forceFullSync: false,
});

// Worker process
const worker = new Worker('calendar-sync', async (job) => {
  const { feedConfigId, tenantId, forceFullSync } = job.data;
  const syncManager = new ICSyncManager();

  return await syncManager.syncFeed({
    feedConfigId,
    tenantId,
    // ... config
    forceFullSync,
  });
}, {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  concurrency: 10,
});
```

**Scheduled Jobs (Cron):**
```typescript
import { CronJob } from 'cron';

// Run sync every hour
const hourlySync = new CronJob('0 * * * *', async () => {
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id')
    .eq('is_active', true);

  for (const tenant of tenants || []) {
    await syncQueue.add('sync-all-feeds', {
      tenantId: tenant.id,
    });
  }
});

hourlySync.start();
```

---

## Scaling Considerations

### 1. Horizontal Scaling

**Multi-Instance Deployment:**
```yaml
# docker-compose.yml
services:
  sync-worker-1:
    image: muva-chat:latest
    environment:
      - WORKER_ID=1
      - MAX_CONCURRENT_SYNCS=10
    deploy:
      replicas: 3

  sync-worker-2:
    image: muva-chat:latest
    environment:
      - WORKER_ID=2
      - MAX_CONCURRENT_SYNCS=10
    deploy:
      replicas: 3
```

**Load Distribution:**
```typescript
// Hash-based tenant assignment
function getWorkerForTenant(tenantId: string, workerCount: number): number {
  const hash = tenantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % workerCount;
}

// Only process feeds assigned to this worker
const workerIndex = getWorkerForTenant(config.tenantId, TOTAL_WORKERS);
if (workerIndex !== CURRENT_WORKER_ID) {
  return; // Skip, another worker will handle
}
```

### 2. Database Scaling

**Read Replicas:**
```typescript
// Use read replica for queries, primary for writes
const readClient = createClient(
  process.env.SUPABASE_READ_REPLICA_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const writeClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Read from replica
const { data: events } = await readClient
  .from('calendar_events')
  .select('*')
  .eq('tenant_id', tenantId);

// Write to primary
await writeClient
  .from('calendar_events')
  .upsert(newEvents);
```

### 3. Rate Limiting

**Tenant-based Rate Limits:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 syncs per hour
  analytics: true,
});

async function checkRateLimit(tenantId: string): Promise<boolean> {
  const { success } = await ratelimit.limit(`sync:${tenantId}`);
  return success;
}
```

---

## Monitoring & Metrics

### 1. Performance Metrics

**Key Metrics to Track:**
```typescript
interface SyncMetrics {
  // Latency
  parseLatency: number;        // Time to parse ICS
  dbWriteLatency: number;      // Time to write to DB
  totalLatency: number;        // End-to-end time

  // Throughput
  eventsPerSecond: number;
  syncsPerMinute: number;

  // Resource Usage
  memoryUsageMB: number;
  cpuUsagePercent: number;
  dbConnectionCount: number;

  // Error Rates
  errorRate: number;           // Errors / total operations
  conflictRate: number;        // Conflicts / total events
}
```

**Metrics Collection:**
```typescript
class MetricsCollector {
  private startTime: number;
  private metrics: Partial<SyncMetrics> = {};

  start() {
    this.startTime = Date.now();
  }

  recordParseLatency(ms: number) {
    this.metrics.parseLatency = ms;
  }

  recordDbWriteLatency(ms: number) {
    this.metrics.dbWriteLatency = ms;
  }

  finish(): SyncMetrics {
    this.metrics.totalLatency = Date.now() - this.startTime;
    return this.metrics as SyncMetrics;
  }

  async export() {
    // Export to monitoring service (Prometheus, DataDog, etc.)
    await fetch('https://metrics.example.com/api/metrics', {
      method: 'POST',
      body: JSON.stringify(this.metrics),
    });
  }
}
```

### 2. Database Metrics

**Slow Query Logging:**
```sql
-- Enable slow query log (queries >1s)
ALTER DATABASE postgres SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%calendar_events%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Connection Pool Stats:**
```sql
SELECT
  state,
  COUNT(*) as connection_count,
  MAX(state_change) as last_state_change
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state;
```

### 3. Alerting

**Performance Degradation Alerts:**
```typescript
interface PerformanceThreshold {
  metric: keyof SyncMetrics;
  threshold: number;
  severity: 'warning' | 'critical';
}

const thresholds: PerformanceThreshold[] = [
  { metric: 'totalLatency', threshold: 10000, severity: 'critical' }, // 10s
  { metric: 'errorRate', threshold: 0.1, severity: 'critical' },       // 10%
  { metric: 'parseLatency', threshold: 2000, severity: 'warning' },    // 2s
];

async function checkThresholds(metrics: SyncMetrics): Promise<void> {
  for (const { metric, threshold, severity } of thresholds) {
    if (metrics[metric] > threshold) {
      await sendAlert({
        severity,
        message: `${metric} exceeded threshold: ${metrics[metric]} > ${threshold}`,
        metrics,
      });
    }
  }
}
```

---

## Performance Testing

### Load Testing Script

```typescript
import { performance } from 'perf_hooks';

async function loadTest() {
  const CONCURRENT_SYNCS = 50;
  const EVENTS_PER_FEED = 100;

  const startTime = performance.now();
  const results = await Promise.all(
    Array(CONCURRENT_SYNCS).fill(0).map(async (_, i) => {
      const syncStart = performance.now();

      const result = await syncFeed({
        feedConfigId: `test-feed-${i}`,
        tenantId: 'test-tenant',
        feedUrl: `https://example.com/feed-${i}.ics`,
        source: 'airbnb',
      });

      return {
        duration: performance.now() - syncStart,
        eventsProcessed: result.stats.totalEvents,
      };
    })
  );

  const totalTime = performance.now() - startTime;
  const avgTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const totalEvents = results.reduce((sum, r) => sum + r.eventsProcessed, 0);
  const eventsPerSecond = totalEvents / (totalTime / 1000);

  console.log({
    concurrentSyncs: CONCURRENT_SYNCS,
    totalTime: `${totalTime.toFixed(0)}ms`,
    avgSyncTime: `${avgTime.toFixed(0)}ms`,
    eventsPerSecond: eventsPerSecond.toFixed(2),
    throughput: `${(CONCURRENT_SYNCS / (totalTime / 1000)).toFixed(2)} syncs/sec`,
  });
}
```

---

**Last Updated:** October 2025
