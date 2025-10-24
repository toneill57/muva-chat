# ICS Sync Error Handling & Recovery

Complete error handling strategy for multi-source calendar synchronization.

---

## 📋 Table of Contents

1. [Error Categories](#error-categories)
2. [Error Detection](#error-detection)
3. [Recovery Strategies](#recovery-strategies)
4. [Logging & Monitoring](#logging--monitoring)
5. [Alerting Rules](#alerting-rules)
6. [Edge Cases](#edge-cases)

---

## Error Categories

### 1. Network Errors

**Symptoms:**
- HTTP timeout (>30s)
- Connection refused
- DNS resolution failure
- SSL/TLS errors

**Recovery Strategy:**
```typescript
// Exponential backoff with jitter
const retryDelays = [1000, 2000, 5000, 10000, 30000]; // ms
const maxRetries = 5;

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  try {
    return await fetch(url, { timeout: 30000 });
  } catch (error) {
    if (attempt >= maxRetries) throw error;

    const delay = retryDelays[attempt] + Math.random() * 1000; // jitter
    await new Promise(resolve => setTimeout(resolve, delay));

    return fetchWithRetry(url, attempt + 1);
  }
}
```

**Database Logging:**
```sql
INSERT INTO calendar_sync_logs (
  sync_status,
  error_message,
  retry_count
) VALUES (
  'failed',
  'Network timeout after 5 retries',
  5
);
```

---

### 2. Parse Errors

**Symptoms:**
- Invalid ICS format
- Missing required fields (DTSTART, DTEND)
- Malformed RRULE
- Invalid date format

**Detection:**
```typescript
class ICSParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ICSParseError';
  }
}

// Example usage
if (!event.start || !event.end) {
  throw new ICSParseError(
    'Missing required date fields',
    lineNumber,
    'DTSTART/DTEND'
  );
}
```

**Recovery Strategy:**
- Skip invalid event (don't fail entire sync)
- Log detailed error with line number
- Notify admin if >10% events fail parsing

**Example:**
```typescript
for (const event of parsedEvents) {
  try {
    await validateEvent(event);
    await processEvent(event);
  } catch (error) {
    if (error instanceof ICSParseError) {
      errors.push({
        eventId: event.uid,
        error: error.message,
        severity: 'warning',
      });
      continue; // Skip this event, continue sync
    }
    throw error; // Fatal error, stop sync
  }
}
```

---

### 3. Database Errors

**Symptoms:**
- Unique constraint violation
- Foreign key violation
- Transaction deadlock
- Connection pool exhausted

**Prevention:**
```typescript
// Use upsert for idempotency
const { error } = await supabase
  .from('calendar_events')
  .upsert({
    tenant_id: config.tenantId,
    external_uid: event.uid,
    // ... other fields
  }, {
    onConflict: 'tenant_id,external_uid',
    ignoreDuplicates: false, // Update existing
  });
```

**Deadlock Recovery:**
```typescript
async function executeWithDeadlockRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === '40P01' && attempt < maxRetries - 1) {
        // PostgreSQL deadlock code
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max deadlock retries exceeded');
}
```

---

### 4. Conflict Errors

**Symptoms:**
- Same event from multiple sources with different data
- Same priority sources with different timestamps
- Manual edits overwritten by automated sync

**Detection:**
```typescript
interface ConflictDetection {
  conflictType: 'priority' | 'timestamp' | 'data_mismatch';
  existingSource: EventSource;
  incomingSource: EventSource;
  affectedFields: string[];
}

function detectConflict(
  existing: CalendarEvent,
  incoming: ICSEvent,
  source: EventSource
): ConflictDetection | null {
  const existingPriority = SOURCE_PRIORITY[existing.source];
  const incomingPriority = SOURCE_PRIORITY[source];

  if (existingPriority === incomingPriority) {
    const dataMismatch = checkDataMismatch(existing, incoming);
    if (dataMismatch.length > 0) {
      return {
        conflictType: 'data_mismatch',
        existingSource: existing.source,
        incomingSource: source,
        affectedFields: dataMismatch,
      };
    }
  }

  return null;
}
```

**Resolution:**
```typescript
// Log conflict for admin review
await supabase.from('calendar_event_conflicts').insert({
  event_id: existing.id,
  conflicting_source: source,
  conflicting_data: incoming,
  resolution_status: 'pending',
  conflict_reason: 'Same priority, different data',
  detected_at: new Date().toISOString(),
});

// Send alert
await sendConflictAlert({
  propertyName: property.name,
  eventSummary: existing.summary,
  sources: [existing.source, source],
  affectedFields: conflict.affectedFields,
});
```

---

### 5. Rate Limiting

**Airbnb/Booking.com Rate Limits:**
- Max 1 request per 5 minutes per property
- Max 100 requests per hour per tenant
- HTTP 429 response with Retry-After header

**Implementation:**
```typescript
interface RateLimiter {
  canSync(feedId: string): Promise<boolean>;
  recordSync(feedId: string): Promise<void>;
  getRetryAfter(feedId: string): Promise<number | null>;
}

class RedisRateLimiter implements RateLimiter {
  async canSync(feedId: string): Promise<boolean> {
    const key = `sync:ratelimit:${feedId}`;
    const lastSync = await redis.get(key);

    if (!lastSync) return true;

    const timeSince = Date.now() - parseInt(lastSync);
    return timeSince >= 5 * 60 * 1000; // 5 minutes
  }

  async recordSync(feedId: string): Promise<void> {
    const key = `sync:ratelimit:${feedId}`;
    await redis.set(key, Date.now().toString(), 'EX', 600); // 10 min TTL
  }

  async getRetryAfter(feedId: string): Promise<number | null> {
    const key = `sync:ratelimit:${feedId}`;
    const lastSync = await redis.get(key);

    if (!lastSync) return null;

    const timeSince = Date.now() - parseInt(lastSync);
    const waitTime = (5 * 60 * 1000) - timeSince;

    return waitTime > 0 ? waitTime : null;
  }
}
```

**HTTP 429 Handling:**
```typescript
async function fetchWithRateLimitHandling(url: string): Promise<Response> {
  const response = await fetch(url);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitMs = retryAfter
      ? parseInt(retryAfter) * 1000
      : 5 * 60 * 1000; // Default 5 minutes

    throw new RateLimitError(
      `Rate limit exceeded. Retry after ${waitMs}ms`,
      waitMs
    );
  }

  return response;
}
```

---

### 6. Data Validation Errors

**Required Field Validation:**
```typescript
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

function validateEvent(event: ICSEvent): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!event.uid) {
    errors.push({ field: 'uid', message: 'Missing required UID' });
  }

  if (!event.start || !event.end) {
    errors.push({ field: 'dates', message: 'Missing start or end date' });
  }

  if (event.start >= event.end) {
    errors.push({
      field: 'dates',
      message: 'Start date must be before end date',
      value: { start: event.start, end: event.end },
    });
  }

  if (!event.propertyId) {
    errors.push({ field: 'propertyId', message: 'Missing property ID' });
  }

  return errors;
}
```

**Date Range Validation:**
```typescript
const MAX_EVENT_DURATION_DAYS = 365; // 1 year
const MAX_FUTURE_YEARS = 2;

function validateDateRange(start: Date, end: Date): void {
  const durationMs = end.getTime() - start.getTime();
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  if (durationDays > MAX_EVENT_DURATION_DAYS) {
    throw new ValidationError(
      `Event duration (${durationDays} days) exceeds maximum (${MAX_EVENT_DURATION_DAYS} days)`
    );
  }

  const futureYears = (start.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);

  if (futureYears > MAX_FUTURE_YEARS) {
    throw new ValidationError(
      `Event start date is too far in the future (${futureYears.toFixed(1)} years)`
    );
  }
}
```

---

## Error Detection

### Automated Monitoring

**Health Check Endpoint:**
```typescript
// GET /api/calendar/health
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Check for failed syncs in last 24 hours
  const { data: failedSyncs, error } = await supabase
    .from('calendar_sync_logs')
    .select('*')
    .eq('sync_status', 'failed')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Check for stale feeds (no sync in 2 hours)
  const { data: staleFeeds } = await supabase
    .from('ics_feed_configurations')
    .select('*')
    .eq('is_active', true)
    .lt('last_sync_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

  // Check for unresolved conflicts
  const { data: conflicts } = await supabase
    .from('calendar_event_conflicts')
    .select('count')
    .eq('resolution_status', 'pending')
    .single();

  const health = {
    status: failedSyncs?.length === 0 && staleFeeds?.length === 0 ? 'healthy' : 'degraded',
    checks: {
      failedSyncs: {
        status: failedSyncs?.length === 0 ? 'pass' : 'fail',
        count: failedSyncs?.length || 0,
      },
      staleFeeds: {
        status: staleFeeds?.length === 0 ? 'pass' : 'warn',
        count: staleFeeds?.length || 0,
      },
      unresolvedConflicts: {
        status: (conflicts?.count || 0) < 10 ? 'pass' : 'warn',
        count: conflicts?.count || 0,
      },
    },
  };

  return NextResponse.json(health);
}
```

---

## Recovery Strategies

### 1. Automatic Recovery

**Self-Healing Sync:**
```typescript
async function syncWithAutoRecovery(config: SyncConfig): Promise<SyncResult> {
  try {
    return await syncFeed(config);
  } catch (error) {
    // Check if recoverable error
    if (isRecoverableError(error)) {
      // Wait and retry once
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute

      try {
        return await syncFeed({ ...config, forceFullSync: true });
      } catch (retryError) {
        // Log permanent failure
        await logPermanentFailure(config, retryError);
        throw retryError;
      }
    }

    throw error;
  }
}

function isRecoverableError(error: any): boolean {
  const recoverableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
  return recoverableCodes.includes(error.code);
}
```

### 2. Manual Recovery

**Admin Dashboard Actions:**
- Force full re-sync (ignore ETag)
- Reset feed state (clear last_sync_at, last_etag)
- Bulk resolve conflicts
- Export error logs

**Database Functions:**
```sql
-- Reset feed for full re-sync
CREATE OR REPLACE FUNCTION reset_feed_sync(feed_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE ics_feed_configurations
  SET last_sync_at = NULL,
      last_etag = NULL,
      last_error = NULL
  WHERE id = feed_id;

  -- Mark all events as needing verification
  UPDATE calendar_events
  SET needs_verification = true
  WHERE tenant_id = (
    SELECT tenant_id FROM ics_feed_configurations WHERE id = feed_id
  );
END;
$$ LANGUAGE plpgsql;
```

---

## Logging & Monitoring

### Log Levels

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface SyncLog {
  level: LogLevel;
  timestamp: string;
  feedConfigId: string;
  message: string;
  metadata?: Record<string, any>;
  error?: Error;
}
```

### Structured Logging

```typescript
class SyncLogger {
  private context: Record<string, any>;

  constructor(feedConfigId: string, tenantId: string) {
    this.context = { feedConfigId, tenantId };
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, { ...metadata, error: error?.stack });
  }

  private async log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const log: SyncLog = {
      level,
      timestamp: new Date().toISOString(),
      feedConfigId: this.context.feedConfigId,
      message,
      metadata: { ...this.context, ...metadata },
    };

    // Console for development
    console.log(JSON.stringify(log));

    // Database for production
    if (level >= LogLevel.ERROR) {
      await this.persistLog(log);
    }
  }

  private async persistLog(log: SyncLog) {
    // Write to calendar_sync_logs table
  }
}
```

---

## Alerting Rules

### Critical Alerts (Immediate)

1. **Sync Failure Rate >50%**
   - Condition: >50% of syncs failed in last hour
   - Action: Email + Slack notification
   - Escalation: Page on-call after 3 consecutive failures

2. **Database Connection Lost**
   - Condition: Cannot connect to Supabase
   - Action: Immediate page + disable all syncs

3. **Data Corruption Detected**
   - Condition: Invalid data patterns (negative durations, past events marked as future)
   - Action: Stop syncs + immediate investigation

### Warning Alerts (Within 15 minutes)

1. **High Conflict Rate**
   - Condition: >10 conflicts detected per tenant per hour
   - Action: Slack notification

2. **Stale Feeds**
   - Condition: Feed hasn't synced in >2 hours (when scheduled hourly)
   - Action: Email notification

3. **Parse Error Rate >10%**
   - Condition: >10% of events fail parsing
   - Action: Slack notification + log review

---

## Edge Cases

### 1. Timezone Changes

**Problem:** Events created before timezone change show incorrect times.

**Solution:**
```typescript
// Always store in UTC, convert for display
function normalizeEventDates(event: ICSEvent): ICSEvent {
  return {
    ...event,
    start: toUTC(event.start),
    end: toUTC(event.end),
  };
}

function toUTC(date: Date): Date {
  return new Date(date.toISOString());
}
```

### 2. Deleted Events

**Problem:** How to detect when an event is deleted from external source?

**Solution:**
```typescript
// During full sync, mark events as deleted if not in feed
async function handleDeletions(
  config: SyncConfig,
  currentEvents: ICSEvent[]
): Promise<number> {
  const currentUids = new Set(currentEvents.map(e => e.uid));

  const { data: dbEvents } = await supabase
    .from('calendar_events')
    .select('id, external_uid')
    .eq('source', config.source);

  const toDelete = dbEvents?.filter(e => !currentUids.has(e.external_uid)) || [];

  // Soft delete
  await supabase
    .from('calendar_events')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
    .in('id', toDelete.map(e => e.id));

  return toDelete.length;
}
```

### 3. Duplicate UIDs

**Problem:** Same UID from different sources (rare but possible).

**Solution:**
```typescript
// Use composite key: source + external_uid
await supabase
  .from('calendar_events')
  .upsert({
    tenant_id,
    source,
    external_uid,
    // ...
  }, {
    onConflict: 'tenant_id,source,external_uid',
  });
```

### 4. Parent-Child Sync Failures

**Problem:** Parent booking syncs but child doesn't get blocked.

**Solution:**
```sql
-- Database trigger ensures atomicity
CREATE OR REPLACE FUNCTION propagate_parent_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- If event is for parent property, block all children
  INSERT INTO calendar_events (
    tenant_id, property_id, source, external_uid,
    summary, start_date, end_date, is_blocking, status
  )
  SELECT
    NEW.tenant_id,
    pr.child_property_id,
    'system_generated',
    NEW.external_uid || '-child-' || pr.child_property_id,
    '[Auto-blocked] ' || NEW.summary,
    NEW.start_date,
    NEW.end_date,
    true,
    NEW.status
  FROM property_relationships pr
  WHERE pr.parent_property_id = NEW.property_id
    AND pr.tenant_id = NEW.tenant_id
  ON CONFLICT (tenant_id, external_uid) DO UPDATE
  SET start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      status = EXCLUDED.status;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Testing Error Scenarios

### Unit Tests

```typescript
describe('Error Handling', () => {
  it('should retry on network timeout', async () => {
    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValueOnce(new Response('OK'));

    const result = await fetchWithRetry('http://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should skip invalid events without failing sync', async () => {
    const events = [
      { uid: '1', start: new Date(), end: new Date() }, // valid
      { uid: '2', start: null, end: null }, // invalid
      { uid: '3', start: new Date(), end: new Date() }, // valid
    ];

    const result = await syncEvents(events);
    expect(result.stats.newEvents).toBe(2);
    expect(result.stats.errors).toBe(1);
  });
});
```

---

**Last Updated:** October 2025
