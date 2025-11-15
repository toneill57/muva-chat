# Staff Chat System - Monitoring & Alerts

This document provides monitoring queries and health checks for the Staff Chat System.

---

## Overview

The Staff Chat System requires regular monitoring to ensure:
- Staff authentication is functioning correctly
- Chat conversations are being saved
- Vector search performance is optimal
- Costs remain within budget
- RLS policies are enforced

---

## Daily Health Checks

### 1. Staff Authentication Rate

**Purpose:** Track daily staff login activity and identify authentication issues

```sql
-- Staff authentication rate (last 7 days)
SELECT
  DATE(last_login_at) as date,
  COUNT(DISTINCT staff_id) as unique_logins,
  COUNT(*) as total_logins,
  ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT staff_id), 0), 2) as avg_logins_per_staff
FROM staff_users
WHERE last_login_at > NOW() - INTERVAL '7 days'
  AND is_active = true
GROUP BY DATE(last_login_at)
ORDER BY date DESC;
```

**Expected Results:**
- Daily unique logins: 2-5 per tenant
- Avg logins per staff: 1-3 per day
- No gaps in daily data (indicates system outage)

**Alert Triggers:**
- ⚠️ Zero logins for 24+ hours → Investigate authentication system
- ⚠️ Avg logins per staff > 10 → Possible token expiration issues

---

### 2. Staff Message Volume

**Purpose:** Track chat activity and conversation engagement

```sql
-- Staff message volume (last 7 days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_messages,
  COUNT(DISTINCT conversation_id) as unique_conversations,
  ROUND(COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT conversation_id), 0), 2) as avg_messages_per_conversation,
  COUNT(*) FILTER (WHERE role = 'staff') as staff_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages
FROM staff_messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Expected Results:**
- Daily messages: 20-100 per tenant
- Avg messages per conversation: 4-8
- Staff/Assistant ratio: ~1:1

**Alert Triggers:**
- ⚠️ Total messages = 0 for 24+ hours → Check chat engine
- ⚠️ Staff messages = 0, Assistant messages > 0 → Database sync issue
- ⚠️ Avg messages per conversation < 2 → Poor engagement, review system prompts

---

### 3. Active Conversations

**Purpose:** Monitor conversation status and cleanup old conversations

```sql
-- Active conversations by status
SELECT
  status,
  COUNT(*) as count,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - last_message_at)) / 3600), 2) as avg_hours_since_last_message
FROM staff_conversations
GROUP BY status
ORDER BY status;

-- Old active conversations (no activity in 7+ days)
SELECT
  sc.conversation_id,
  su.username,
  su.role,
  sc.title,
  sc.category,
  sc.last_message_at,
  EXTRACT(DAY FROM (NOW() - sc.last_message_at)) as days_inactive
FROM staff_conversations sc
JOIN staff_users su ON sc.staff_id = su.staff_id
WHERE sc.status = 'active'
  AND sc.last_message_at < NOW() - INTERVAL '7 days'
ORDER BY sc.last_message_at ASC
LIMIT 20;
```

**Expected Results:**
- Active conversations: 5-20 per tenant
- Avg hours since last message: < 48 hours
- Archived conversations: Growing over time

**Cleanup Actions:**
- Archive conversations inactive for 30+ days:
  ```sql
  UPDATE staff_conversations
  SET status = 'archived', updated_at = NOW()
  WHERE status = 'active'
    AND last_message_at < NOW() - INTERVAL '30 days';
  ```

---

## Weekly Performance Checks

### 1. Permission Usage by Role

**Purpose:** Track how different roles use the system and identify permission issues

```sql
-- Permission usage by role (last 7 days)
SELECT
  su.role,
  COUNT(sm.message_id) as message_count,
  COUNT(DISTINCT sc.conversation_id) as conversation_count,
  ROUND(AVG((sm.metadata->>'response_time_ms')::numeric), 2) as avg_response_time_ms,
  ROUND(SUM((sm.metadata->>'cost_usd')::numeric)::numeric, 4) as total_cost_usd,
  ROUND(AVG((sm.metadata->'token_usage'->>'total')::numeric), 2) as avg_tokens_per_message
FROM staff_messages sm
JOIN staff_conversations sc ON sm.conversation_id = sc.conversation_id
JOIN staff_users su ON sc.staff_id = su.staff_id
WHERE sm.created_at > NOW() - INTERVAL '7 days'
  AND sm.role = 'assistant'
GROUP BY su.role
ORDER BY message_count DESC;
```

**Expected Results:**
- CEO: 10-30 messages/week, higher cost (access to all content)
- Admin: 20-60 messages/week, moderate cost
- Housekeeper: 15-40 messages/week, lower cost (limited access)

**Alert Triggers:**
- ⚠️ Role has 0 messages → Investigate if role-based search is broken
- ⚠️ Avg response time > 5000ms → Vector search performance degradation
- ⚠️ Total cost > budget threshold → Review usage patterns

---

### 2. Vector Search Performance

**Purpose:** Monitor embedding search quality and speed

```sql
-- Vector search performance by table
SELECT
  jsonb_array_elements(sm.metadata->'sources')->>'table' as source_table,
  COUNT(*) as query_count,
  ROUND(AVG((jsonb_array_elements(sm.metadata->'sources')->>'similarity')::numeric), 4) as avg_similarity,
  ROUND(MIN((jsonb_array_elements(sm.metadata->'sources')->>'similarity')::numeric), 4) as min_similarity,
  ROUND(MAX((jsonb_array_elements(sm.metadata->'sources')->>'similarity')::numeric), 4) as max_similarity
FROM staff_messages sm
WHERE sm.created_at > NOW() - INTERVAL '7 days'
  AND sm.role = 'assistant'
  AND sm.metadata->'sources' IS NOT NULL
GROUP BY source_table
ORDER BY query_count DESC;
```

**Expected Results:**
- Avg similarity: 0.70-0.85 (good quality matches)
- Min similarity: > 0.50 (relevance threshold)
- hotel_operations: Most queried source

**Alert Triggers:**
- ⚠️ Avg similarity < 0.60 → Review embeddings quality
- ⚠️ hotel_operations query_count = 0 → Check if embeddings are NULL
- ⚠️ Min similarity < 0.40 → Adjust match_threshold in search functions

---

### 3. Intent Detection Accuracy

**Purpose:** Monitor intent classification performance

```sql
-- Intent distribution (last 7 days)
SELECT
  sm.metadata->'intent'->>'type' as intent_type,
  COUNT(*) as count,
  ROUND(AVG((sm.metadata->'intent'->>'confidence')::numeric), 4) as avg_confidence,
  ROUND(AVG((sm.metadata->'token_usage'->>'total')::numeric), 2) as avg_tokens
FROM staff_messages sm
WHERE sm.created_at > NOW() - INTERVAL '7 days'
  AND sm.role = 'assistant'
  AND sm.metadata->'intent' IS NOT NULL
GROUP BY intent_type
ORDER BY count DESC;
```

**Expected Results:**
- operations: 40-60% of queries
- sire: 20-30% of queries
- admin: 10-20% of queries
- general: 10-20% of queries
- Avg confidence: > 0.70

**Alert Triggers:**
- ⚠️ Avg confidence < 0.50 → Review intent detection prompts
- ⚠️ general > 40% → Intent classifier needs improvement

---

### 4. Cost Analysis

**Purpose:** Track spending per tenant and per role

```sql
-- Cost breakdown by tenant (last 30 days)
SELECT
  t.tenant_name,
  COUNT(sm.message_id) as message_count,
  ROUND(SUM((sm.metadata->>'cost_usd')::numeric)::numeric, 4) as total_cost_usd,
  ROUND(AVG((sm.metadata->>'cost_usd')::numeric)::numeric, 6) as avg_cost_per_message,
  ROUND(SUM((sm.metadata->'token_usage'->>'input')::numeric), 0) as total_input_tokens,
  ROUND(SUM((sm.metadata->'token_usage'->>'output')::numeric), 0) as total_output_tokens
FROM staff_messages sm
JOIN staff_conversations sc ON sm.conversation_id = sc.conversation_id
JOIN staff_users su ON sc.staff_id = su.staff_id
JOIN tenant_registry t ON su.tenant_id = t.tenant_id
WHERE sm.created_at > NOW() - INTERVAL '30 days'
  AND sm.role = 'assistant'
GROUP BY t.tenant_id, t.tenant_name
ORDER BY total_cost_usd DESC;
```

**Expected Results (per tenant per month):**
- Message count: 200-600 messages
- Total cost: $20-$40 USD
- Avg cost per message: $0.01-$0.02

**Alert Triggers:**
- ⚠️ Total cost > $50 USD/month → Investigate high usage
- ⚠️ Avg cost per message > $0.05 → Check for inefficient prompts

---

## Monthly Analytics

### 1. Top Content Sources

**Purpose:** Identify most-used hotel operations documents

```sql
-- Top 20 hotel operations documents (last 30 days)
SELECT
  ho.operation_id,
  ho.category,
  ho.title,
  ho.access_level,
  COUNT(*) as reference_count,
  ROUND(AVG((sources->>'similarity')::numeric), 4) as avg_similarity
FROM staff_messages sm,
  jsonb_array_elements(sm.metadata->'sources') as sources
JOIN hotel_operations ho ON (sources->>'id')::uuid = ho.operation_id
WHERE sm.created_at > NOW() - INTERVAL '30 days'
  AND sm.role = 'assistant'
  AND sources->>'table' = 'hotel_operations'
GROUP BY ho.operation_id, ho.category, ho.title, ho.access_level
ORDER BY reference_count DESC
LIMIT 20;
```

**Use Cases:**
- Identify most valuable content for staff
- Discover content gaps (low reference count)
- Prioritize content updates based on usage

---

### 2. User Engagement Metrics

**Purpose:** Track staff engagement over time

```sql
-- Staff engagement metrics (last 30 days)
SELECT
  su.username,
  su.role,
  su.full_name,
  COUNT(DISTINCT sc.conversation_id) as conversations_started,
  COUNT(sm.message_id) as messages_sent,
  ROUND(AVG(msg_count.count), 2) as avg_messages_per_conversation,
  DATE(MIN(sc.created_at)) as first_conversation_date,
  DATE(MAX(sc.last_message_at)) as last_activity_date,
  EXTRACT(DAY FROM (MAX(sc.last_message_at) - MIN(sc.created_at))) as days_active
FROM staff_users su
LEFT JOIN staff_conversations sc ON su.staff_id = sc.staff_id
LEFT JOIN staff_messages sm ON sc.conversation_id = sm.conversation_id AND sm.role = 'staff'
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM staff_messages
  WHERE conversation_id = sc.conversation_id
) msg_count ON true
WHERE sc.created_at > NOW() - INTERVAL '30 days'
  OR sc.created_at IS NULL
GROUP BY su.staff_id, su.username, su.role, su.full_name
ORDER BY messages_sent DESC;
```

**Insights:**
- Active vs inactive staff members
- Feature adoption rate
- User retention metrics

---

## Real-Time Monitoring

### Current Active Sessions

```sql
-- Staff currently active (logged in within last 30 minutes)
SELECT
  su.username,
  su.role,
  su.full_name,
  su.last_login_at,
  EXTRACT(MINUTE FROM (NOW() - su.last_login_at)) as minutes_since_login,
  (
    SELECT COUNT(*)
    FROM staff_messages sm
    JOIN staff_conversations sc ON sm.conversation_id = sc.conversation_id
    WHERE sc.staff_id = su.staff_id
      AND sm.created_at > NOW() - INTERVAL '30 minutes'
      AND sm.role = 'staff'
  ) as messages_in_last_30_min
FROM staff_users su
WHERE su.last_login_at > NOW() - INTERVAL '30 minutes'
  AND su.is_active = true
ORDER BY su.last_login_at DESC;
```

---

### Recent Errors (from metadata)

```sql
-- Recent errors in chat responses (if metadata.error exists)
SELECT
  sm.created_at,
  su.username,
  su.role,
  sm.metadata->>'error' as error_message,
  sm.metadata->>'query' as failed_query,
  sm.conversation_id
FROM staff_messages sm
JOIN staff_conversations sc ON sm.conversation_id = sc.conversation_id
JOIN staff_users su ON sc.staff_id = su.staff_id
WHERE sm.created_at > NOW() - INTERVAL '1 day'
  AND sm.metadata->>'error' IS NOT NULL
ORDER BY sm.created_at DESC
LIMIT 50;
```

---

## Alert Configuration

### Critical Alerts (Immediate Action)

1. **Authentication System Down**
   - Condition: Zero staff logins for 2+ hours
   - Check: `SELECT COUNT(*) FROM staff_users WHERE last_login_at > NOW() - INTERVAL '2 hours'`
   - Action: Investigate `POST /api/staff/login` endpoint

2. **Database Connection Lost**
   - Condition: Zero new messages for 1+ hour
   - Check: `SELECT COUNT(*) FROM staff_messages WHERE created_at > NOW() - INTERVAL '1 hour'`
   - Action: Check Supabase connection

3. **Cost Spike**
   - Condition: Cost > $5 in 1 hour
   - Check: `SELECT SUM((metadata->>'cost_usd')::numeric) FROM staff_messages WHERE created_at > NOW() - INTERVAL '1 hour'`
   - Action: Investigate unusual usage patterns

---

### Warning Alerts (Review Within 24h)

1. **Low Search Quality**
   - Condition: Avg similarity < 0.60 for 24+ hours
   - Action: Review embeddings, check if hotel_operations.embedding_balanced is NULL

2. **High Response Time**
   - Condition: Avg response time > 5000ms for 24+ hours
   - Action: Check vector index performance, Supabase health

3. **Inactive Staff**
   - Condition: Staff hasn't logged in for 14+ days
   - Action: Send email reminder, verify account is still needed

---

## Troubleshooting Common Issues

### Issue 1: No Search Results

**Symptoms:** Chat responses contain no sources

**Checks:**
```sql
-- Verify embeddings exist
SELECT
  COUNT(*) as total_docs,
  COUNT(embedding_balanced) as docs_with_embeddings,
  ROUND(COUNT(embedding_balanced) * 100.0 / COUNT(*), 2) as percent_with_embeddings
FROM hotel_operations
WHERE tenant_id = 'YOUR_TENANT_ID';
```

**Fix:**
```bash
# Generate embeddings
node scripts/populate-embeddings.js --table hotel_operations --dimension 1536
```

---

### Issue 2: Slow Search Performance

**Symptoms:** response_time_ms > 5000ms consistently

**Checks:**
```sql
-- Verify HNSW index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'hotel_operations'
  AND indexname LIKE '%hnsw%';
```

**Fix:**
```sql
-- Rebuild HNSW index
DROP INDEX IF EXISTS idx_hotel_operations_embedding_balanced_hnsw;
CREATE INDEX idx_hotel_operations_embedding_balanced_hnsw
  ON hotel_operations USING hnsw (embedding_balanced vector_cosine_ops);
```

---

### Issue 3: RLS Blocking Legitimate Access

**Symptoms:** Staff gets 403 errors despite correct permissions

**Checks:**
```sql
-- Verify RLS policies
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'hotel_operations';

-- Test policy manually
SET request.jwt.claim.staff_id = 'YOUR_STAFF_ID';
SET request.jwt.claim.tenant_id = 'YOUR_TENANT_ID';
SET request.jwt.claim.role = 'admin';

SELECT * FROM hotel_operations WHERE tenant_id = 'YOUR_TENANT_ID' LIMIT 5;
```

---

## Performance Benchmarks

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response time (p50) | < 2000ms | > 3000ms | > 5000ms |
| Response time (p95) | < 4000ms | > 6000ms | > 10000ms |
| Search similarity (avg) | > 0.75 | < 0.65 | < 0.50 |
| Cost per message | < $0.02 | > $0.04 | > $0.10 |
| Messages per day (per tenant) | 20-100 | < 5 or > 200 | 0 or > 500 |

---

## Data Retention Policy

### Recommendations

1. **Active Conversations:** Keep indefinitely (until manually archived)
2. **Archived Conversations:** Keep for 12 months, then soft delete
3. **Deleted Conversations:** Permanent delete after 30 days
4. **Staff Messages:** Keep for 12 months after conversation deletion
5. **Audit Logs:** Keep for 24 months minimum (compliance)

### Cleanup Scripts

**Archive old conversations:**
```sql
UPDATE staff_conversations
SET status = 'archived', updated_at = NOW()
WHERE status = 'active'
  AND last_message_at < NOW() - INTERVAL '90 days';
```

**Soft delete archived conversations:**
```sql
UPDATE staff_conversations
SET status = 'deleted', updated_at = NOW()
WHERE status = 'archived'
  AND updated_at < NOW() - INTERVAL '12 months';
```

**Permanent delete old messages:**
```sql
DELETE FROM staff_messages
WHERE conversation_id IN (
  SELECT conversation_id
  FROM staff_conversations
  WHERE status = 'deleted'
    AND updated_at < NOW() - INTERVAL '30 days'
);

DELETE FROM staff_conversations
WHERE status = 'deleted'
  AND updated_at < NOW() - INTERVAL '30 days';
```

---

## Cost Estimation Model

**Variables:**
- Staff count per tenant: 4
- Messages per staff per day: 20
- Avg input tokens: 500
- Avg output tokens: 800
- Claude Sonnet 3.5 pricing (Oct 2024):
  - Input: $3 / 1M tokens
  - Output: $15 / 1M tokens

**Monthly Calculation:**
```
Input tokens:  500 × 20 × 4 × 30 = 1,200,000 tokens → $3.60
Output tokens: 800 × 20 × 4 × 30 = 1,920,000 tokens → $28.80
Total: $32.40 per tenant per month
```

**Budget Thresholds:**
- Expected: $25-$40/month per tenant
- Warning: > $50/month
- Critical: > $100/month

---

## Contact & Support

For questions or issues with Staff Chat System monitoring:
- Technical Lead: [Your Name]
- Database Team: database-team@innpilot.com
- Monitoring Dashboard: [Grafana/DataDog URL]

---

**Last Updated:** October 1, 2025
**Version:** 1.0.0
**Status:** Production Ready
