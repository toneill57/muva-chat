# Public Chat System Monitoring Guide

**Owner**: Database Agent
**System**: Public/Pre-Reserva Chat (FASE B)
**Last Updated**: October 1, 2025

---

## Overview

This guide provides monitoring queries for the Public Chat system. Use these queries to track performance, conversion, and health of anonymous visitor sessions.

---

## Table of Contents

1. [Health Checks](#health-checks)
2. [Session Monitoring](#session-monitoring)
3. [Intent Capture Analytics](#intent-capture-analytics)
4. [Conversion Tracking](#conversion-tracking)
5. [Performance Metrics](#performance-metrics)
6. [Rate Limiting & Security](#rate-limiting--security)
7. [Data Cleanup](#data-cleanup)
8. [Alerts & Thresholds](#alerts--thresholds)

---

## Health Checks

### System Status

```sql
-- Overall system health
SELECT
  'prospective_sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_sessions,
  COUNT(*) FILTER (WHERE status = 'expired') as expired_sessions,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as needs_cleanup
FROM prospective_sessions;

-- Accommodation units availability
SELECT
  'accommodation_units_public' as table_name,
  COUNT(*) as total_units,
  COUNT(*) FILTER (WHERE is_active = true) as active_units,
  COUNT(*) FILTER (WHERE is_bookable = true) as bookable_units,
  COUNT(*) FILTER (WHERE embedding_fast IS NOT NULL) as units_with_embeddings
FROM accommodation_units_public;
```

**Expected Results**:
- Active sessions: 50-500 (depending on traffic)
- Needs cleanup: < 100 (should be 0 if cron running)
- Units with embeddings: 100% (all active units must have embeddings)

---

## Session Monitoring

### Active Sessions

```sql
-- Current active sessions with activity
SELECT
  session_id,
  tenant_id,
  jsonb_array_length(conversation_history) as message_count,
  travel_intent->>'check_in' as check_in,
  travel_intent->>'guests' as guests,
  last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60 as minutes_inactive,
  expires_at
FROM prospective_sessions
WHERE status = 'active'
ORDER BY last_activity_at DESC
LIMIT 20;
```

### Session Growth Rate

```sql
-- Sessions created per day (last 7 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as sessions_created,
  COUNT(*) FILTER (WHERE status = 'converted') as converted,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / COUNT(*), 2) as conversion_rate_pct
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Session Duration

```sql
-- Average session duration
SELECT
  AVG(EXTRACT(EPOCH FROM (COALESCE(conversion_date, expires_at) - created_at))/3600) as avg_duration_hours,
  MIN(EXTRACT(EPOCH FROM (COALESCE(conversion_date, expires_at) - created_at))/3600) as min_duration_hours,
  MAX(EXTRACT(EPOCH FROM (COALESCE(conversion_date, expires_at) - created_at))/3600) as max_duration_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (COALESCE(conversion_date, expires_at) - created_at))/3600) as median_duration_hours
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Expected Results**:
- Average duration: 1-24 hours (visitors browsing and returning)
- Median duration: 2-6 hours (most convert or drop off quickly)

---

## Intent Capture Analytics

### Intent Extraction Success Rate

```sql
-- How many sessions successfully captured travel intent
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE travel_intent->>'check_in' IS NOT NULL) as has_check_in,
  COUNT(*) FILTER (WHERE travel_intent->>'check_out' IS NOT NULL) as has_check_out,
  COUNT(*) FILTER (WHERE travel_intent->>'guests' IS NOT NULL) as has_guests,
  COUNT(*) FILTER (WHERE travel_intent->>'accommodation_type' IS NOT NULL) as has_type,
  ROUND(100.0 * COUNT(*) FILTER (WHERE travel_intent->>'check_in' IS NOT NULL) / COUNT(*), 2) as intent_capture_rate_pct
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Expected Results**:
- Intent capture rate: 30-60% (Claude Haiku NLP effectiveness)
- has_check_in: 40-70%
- has_guests: 50-80% (easier to extract)

### Most Common Travel Intent

```sql
-- Popular travel patterns
SELECT
  travel_intent->>'guests' as guest_count,
  COUNT(*) as frequency,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM prospective_sessions
WHERE travel_intent->>'guests' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY travel_intent->>'guests'
ORDER BY frequency DESC;

-- Popular accommodation types
SELECT
  travel_intent->>'accommodation_type' as type,
  COUNT(*) as frequency,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM prospective_sessions
WHERE travel_intent->>'accommodation_type' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY travel_intent->>'accommodation_type'
ORDER BY frequency DESC;
```

### Availability URL Generation

```sql
-- Sessions with complete intent that generated URLs
SELECT
  COUNT(*) as sessions_with_check_in,
  COUNT(*) FILTER (
    WHERE travel_intent->>'check_out' IS NOT NULL
    AND travel_intent->>'guests' IS NOT NULL
  ) as complete_intent,
  ROUND(100.0 * COUNT(*) FILTER (
    WHERE travel_intent->>'check_out' IS NOT NULL
    AND travel_intent->>'guests' IS NOT NULL
  ) / COUNT(*), 2) as completion_rate_pct
FROM prospective_sessions
WHERE travel_intent->>'check_in' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days';
```

**Expected Results**:
- Completion rate: 60-80% (once check-in captured, rest usually follows)

---

## Conversion Tracking

### Conversion Funnel

```sql
-- Full conversion funnel
SELECT
  'Total Sessions' as stage,
  COUNT(*) as count,
  100.0 as percentage
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Has Travel Intent' as stage,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM prospective_sessions WHERE created_at >= NOW() - INTERVAL '30 days'), 2) as percentage
FROM prospective_sessions
WHERE travel_intent->>'check_in' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Complete Intent (URL Generated)' as stage,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM prospective_sessions WHERE created_at >= NOW() - INTERVAL '30 days'), 2) as percentage
FROM prospective_sessions
WHERE travel_intent->>'check_in' IS NOT NULL
  AND travel_intent->>'guests' IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT
  'Converted to Reservation' as stage,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM prospective_sessions WHERE created_at >= NOW() - INTERVAL '30 days'), 2) as percentage
FROM prospective_sessions
WHERE status = 'converted'
  AND created_at >= NOW() - INTERVAL '30 days';
```

### Conversion Rate by Tenant

```sql
-- Which tenants have best conversion rates
SELECT
  tr.hotel_name,
  COUNT(ps.session_id) as total_sessions,
  COUNT(*) FILTER (WHERE ps.status = 'converted') as conversions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ps.status = 'converted') / COUNT(ps.session_id), 2) as conversion_rate_pct,
  AVG(EXTRACT(EPOCH FROM (ps.conversion_date - ps.created_at))/3600)::INT as avg_hours_to_convert
FROM prospective_sessions ps
JOIN tenant_registry tr ON ps.tenant_id = tr.tenant_id
WHERE ps.created_at >= NOW() - INTERVAL '30 days'
GROUP BY tr.tenant_id, tr.hotel_name
ORDER BY conversion_rate_pct DESC;
```

**Expected Results**:
- Conversion rate: 5-20% (public visitors → confirmed reservations)
- Avg hours to convert: 12-48 hours (browsing → decision)

### Revenue Attribution

```sql
-- Revenue from converted public chat sessions
SELECT
  DATE_TRUNC('week', ps.conversion_date) as week,
  COUNT(ps.session_id) as conversions,
  -- JOIN with guest_reservations to get revenue if needed
  SUM(1) as reservation_count -- Placeholder
FROM prospective_sessions ps
WHERE ps.status = 'converted'
  AND ps.conversion_date >= NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

---

## Performance Metrics

### Vector Search Performance

```sql
-- Test vector search speed (run EXPLAIN ANALYZE for real timing)
EXPLAIN ANALYZE
SELECT
  id,
  content,
  similarity,
  pricing,
  photos
FROM match_accommodations_public(
  query_embedding := (SELECT embedding_fast FROM accommodation_units_public LIMIT 1),
  p_tenant_id := (SELECT tenant_id FROM tenant_registry LIMIT 1),
  match_threshold := 0.2,
  match_count := 10
);
```

**Expected Results**:
- Execution time: < 50ms (with HNSW index)
- Index usage: "Index Scan using idx_accommodation_public_embedding_fast_hnsw"

### API Response Time Simulation

```sql
-- Simulate full public chat query load
SELECT
  COUNT(*) as active_units,
  AVG(pg_column_size(embedding_fast)) as avg_embedding_size_bytes,
  AVG(pg_column_size(description)) as avg_description_size_bytes,
  SUM(pg_column_size(photos)) as total_photos_size_bytes
FROM accommodation_units_public
WHERE is_active = true AND is_bookable = true;
```

**Expected Results**:
- Active units: 10-100+ (depends on tenant)
- Avg embedding size: ~4KB (1024 dimensions × 4 bytes)
- Total photos size: < 1MB (optimized for API response)

---

## Rate Limiting & Security

### Rate Limit Violations

Since rate limiting is handled in-memory at API level, monitor via application logs:

```bash
# Search API logs for rate limit events
grep "Rate limit exceeded" /var/log/muva-chat/api.log | wc -l

# Top IPs hitting rate limits
grep "Rate limit exceeded" /var/log/muva-chat/api.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn | head -20
```

### Suspicious Activity

```sql
-- Sessions with unusually high message counts (potential bots)
SELECT
  session_id,
  cookie_id,
  jsonb_array_length(conversation_history) as message_count,
  created_at,
  last_activity_at,
  EXTRACT(EPOCH FROM (last_activity_at - created_at))/60 as session_duration_minutes
FROM prospective_sessions
WHERE jsonb_array_length(conversation_history) > 50 -- Flag sessions with 50+ messages
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY message_count DESC;
```

**Expected Results**:
- Message count: 2-20 (normal human browsing)
- Outliers (50+): Investigate for bots

### Cookie Reuse

```sql
-- Check for cookie_id reuse (should be unique)
SELECT
  cookie_id,
  COUNT(*) as session_count,
  array_agg(session_id) as sessions
FROM prospective_sessions
WHERE cookie_id IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY cookie_id
HAVING COUNT(*) > 1
ORDER BY session_count DESC;
```

**Expected Results**:
- Cookie reuse: 0 (each cookie should create ONE active session)
- If > 1: Check cookie expiration logic

---

## Data Cleanup

### Expired Sessions

```sql
-- Sessions pending cleanup
SELECT
  COUNT(*) as expired_sessions,
  MIN(expires_at) as oldest_expiry,
  MAX(expires_at) as newest_expiry,
  SUM(pg_column_size(conversation_history)) / 1024 / 1024 as total_data_mb
FROM prospective_sessions
WHERE status = 'active'
  AND expires_at < NOW();
```

**Expected Results**:
- Expired sessions: 0 (if cron running daily)
- Total data: < 10MB (cleanup should prevent buildup)

### Manual Cleanup (if needed)

```sql
-- Delete expired sessions
DELETE FROM prospective_sessions
WHERE status = 'active'
  AND expires_at < NOW();

-- Archive old converted sessions (keep 90 days)
UPDATE prospective_sessions
SET status = 'archived'
WHERE status = 'converted'
  AND conversion_date < NOW() - INTERVAL '90 days';
```

### Database Size Monitoring

```sql
-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE tablename IN ('prospective_sessions', 'accommodation_units_public')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Alerts & Thresholds

### Critical Alerts

```sql
-- CRITICAL: No active accommodation units (search will fail)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'CRITICAL: No active accommodation units'
    ELSE 'OK'
  END as alert
FROM accommodation_units_public
WHERE is_active = true AND is_bookable = true;

-- CRITICAL: Expired sessions accumulating (cron not running)
SELECT
  CASE
    WHEN COUNT(*) > 1000 THEN 'CRITICAL: ' || COUNT(*) || ' expired sessions need cleanup'
    ELSE 'OK'
  END as alert
FROM prospective_sessions
WHERE status = 'active' AND expires_at < NOW();
```

### Warning Alerts

```sql
-- WARNING: Low conversion rate
SELECT
  CASE
    WHEN conversion_rate < 2.0 THEN 'WARNING: Conversion rate below 2% (' || conversion_rate || '%)'
    ELSE 'OK'
  END as alert
FROM (
  SELECT
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / COUNT(*), 2) as conversion_rate
  FROM prospective_sessions
  WHERE created_at >= NOW() - INTERVAL '7 days'
) subquery;

-- WARNING: Low intent capture rate
SELECT
  CASE
    WHEN intent_rate < 20.0 THEN 'WARNING: Intent capture rate below 20% (' || intent_rate || '%)'
    ELSE 'OK'
  END as alert
FROM (
  SELECT
    ROUND(100.0 * COUNT(*) FILTER (WHERE travel_intent->>'check_in' IS NOT NULL) / COUNT(*), 2) as intent_rate
  FROM prospective_sessions
  WHERE created_at >= NOW() - INTERVAL '7 days'
) subquery;
```

---

## Monitoring Schedule

### Daily (Automated)

- Run cleanup cron: `scripts/cleanup-expired-sessions.sql`
- Check system health queries
- Review critical alerts

### Weekly (Manual)

- Review conversion funnel
- Analyze intent capture success
- Check top performing accommodations
- Validate vector search performance

### Monthly (Manual)

- Full conversion analysis by tenant
- Revenue attribution report
- Database size and growth trends
- Security audit (suspicious activity, rate limits)

---

## Performance Baselines

Established after initial deployment (update as needed):

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Vector search time | < 30ms | < 50ms | > 100ms |
| Active sessions | 100-1000 | 50-2000 | > 5000 |
| Conversion rate | 10-20% | 5-25% | < 2% |
| Intent capture rate | 40-60% | 30-70% | < 20% |
| Expired sessions | 0 | < 100 | > 1000 |
| Units with embeddings | 100% | > 95% | < 90% |

---

## Troubleshooting

### Issue: Low Conversion Rate

**Symptoms**: Conversion rate < 5%

**Investigation**:
```sql
-- Check if intent is being captured
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE travel_intent->>'check_in' IS NOT NULL) as has_intent
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Solutions**:
1. Review Claude Haiku NLP prompts (src/lib/public-chat-session.ts:extractTravelIntent)
2. Check if availability URLs are being generated
3. Analyze conversation logs for UX issues

### Issue: Slow Vector Search

**Symptoms**: Search > 100ms

**Investigation**:
```sql
-- Check if HNSW index is being used
EXPLAIN ANALYZE
SELECT * FROM match_accommodations_public(...);
```

**Solutions**:
1. Verify HNSW index exists: `\d accommodation_units_public`
2. Rebuild index: `REINDEX INDEX idx_accommodation_public_embedding_fast_hnsw;`
3. Update statistics: `ANALYZE accommodation_units_public;`

### Issue: Expired Sessions Not Cleaning

**Symptoms**: Thousands of expired sessions

**Investigation**:
```sql
SELECT COUNT(*) FROM prospective_sessions
WHERE status = 'active' AND expires_at < NOW();
```

**Solutions**:
1. Check if cron is scheduled: `crontab -l`
2. Run manual cleanup: `DELETE FROM prospective_sessions WHERE status = 'active' AND expires_at < NOW();`
3. Setup pg_cron or Edge Function cleanup

---

## Useful Queries Reference

```sql
-- Quick health check
SELECT
  (SELECT COUNT(*) FROM prospective_sessions WHERE status = 'active') as active_sessions,
  (SELECT COUNT(*) FROM accommodation_units_public WHERE is_active = true) as active_units,
  (SELECT COUNT(*) FROM prospective_sessions WHERE status = 'active' AND expires_at < NOW()) as needs_cleanup,
  (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / COUNT(*), 2)
   FROM prospective_sessions WHERE created_at >= NOW() - INTERVAL '7 days') as conversion_rate_pct_7d;

-- Top converting UTM sources
SELECT
  utm_tracking->>'source' as utm_source,
  COUNT(*) as sessions,
  COUNT(*) FILTER (WHERE status = 'converted') as conversions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'converted') / COUNT(*), 2) as conversion_rate_pct
FROM prospective_sessions
WHERE utm_tracking IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY utm_tracking->>'source'
ORDER BY conversions DESC;

-- Sessions by hour of day (find peak traffic)
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as sessions
FROM prospective_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
```

---

**Last Updated**: October 1, 2025
**Next Review**: After 2 weeks of production data
**Owner**: Database Agent
