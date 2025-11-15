# Guest Chat System - Database Monitoring Queries
**Quick Reference Guide for Database Administrators**

---

## Daily Health Checks (5 minutes)

### 1. Complete Health Status
```sql
-- Run all health checks at once
SELECT * FROM check_metadata_integrity()
UNION ALL
SELECT * FROM check_rls_policies()
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'warning' THEN 2
    WHEN 'notice' THEN 3
    ELSE 4
  END;
```

**Expected Output**:
```
alert_type           | severity | message                                    | details
---------------------+----------+--------------------------------------------+----------
metadata_integrity   | ok       | Metadata integrity healthy: 0% NULL/empty  | {...}
rls_policy_check     | ok       | All guest chat tables have RLS policies    | {...}
```

**Action Required**: If any severity is NOT "ok", investigate immediately.

---

### 2. Performance Dashboard
```sql
SELECT * FROM guest_chat_performance_monitor;
```

**Expected Output**:
```
metric_name              | value | status
-------------------------+-------+---------
message_count            | N     | healthy
conversation_count       | N     | healthy
active_conversations     | N     | healthy
reservation_count        | N     | healthy
orphaned_conversations   | 0     | healthy
```

**Alert**: If `orphaned_conversations > 0` → CRITICAL

---

## Weekly Performance Review (15 minutes)

### 3. Index Usage Analysis
```sql
SELECT 
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as rows_read,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  CASE 
    WHEN idx_scan > 0 THEN '✅ ACTIVE'
    ELSE '⚠️ UNUSED'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND relname IN ('chat_messages', 'chat_conversations', 'guest_reservations')
ORDER BY relname, idx_scan DESC;
```

**Target**: > 80% indexes should show "ACTIVE" after 1 week of production.

**Action**: If index shows "UNUSED" after 2 weeks → Consider dropping.

---

### 4. Query Performance Validation
```sql
-- Test critical queries and compare to baselines
EXPLAIN ANALYZE
SELECT * FROM chat_messages 
WHERE conversation_id = (SELECT id FROM chat_conversations LIMIT 1)
ORDER BY created_at DESC 
LIMIT 10;
```

**Baseline**: < 50ms (current: 0.138ms)  
**Alert**: If execution time > 50ms → Investigate index health.

```sql
-- Test guest authentication performance
EXPLAIN ANALYZE
SELECT * FROM guest_reservations 
WHERE phone_last_4 = '1234' 
AND check_in_date <= CURRENT_DATE
AND check_out_date >= CURRENT_DATE;
```

**Baseline**: < 20ms (current: 0.059ms)  
**Alert**: If execution time > 20ms → Check if index is being used.

---

### 5. Data Growth Monitoring
```sql
SELECT 
  'chat_messages' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
  pg_size_pretty(pg_total_relation_size('chat_messages')) as table_size
FROM chat_messages
UNION ALL
SELECT 
  'chat_conversations',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
  pg_size_pretty(pg_total_relation_size('chat_conversations'))
FROM chat_conversations
UNION ALL
SELECT 
  'guest_reservations',
  COUNT(*),
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
  pg_size_pretty(pg_total_relation_size('guest_reservations'))
FROM guest_reservations;
```

**Monitor**: Unusual growth spikes or unexpected drops.

---

## Critical Alerts (Automated Monitoring)

### ALERT 1: Orphaned Conversations (CRITICAL)
```sql
-- Run every hour
SELECT 
  'CRITICAL: Orphaned Conversations Detected' as alert,
  COUNT(*) as orphaned_count,
  ARRAY_AGG(id) as conversation_ids
FROM chat_conversations 
WHERE reservation_id IS NOT NULL 
  AND reservation_id NOT IN (SELECT id FROM guest_reservations)
HAVING COUNT(*) > 0;
```

**Threshold**: 0 (any orphaned conversation is critical)  
**Action**: Immediate investigation required.

---

### ALERT 2: High NULL Metadata Rate (WARNING)
```sql
-- Run daily
WITH metadata_check AS (
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN metadata IS NULL OR metadata = '{}'::jsonb THEN 1 END) as problematic,
    ROUND(
      COUNT(CASE WHEN metadata IS NULL OR metadata = '{}'::jsonb THEN 1 END) * 100.0 / 
      NULLIF(COUNT(*), 0), 
      2
    ) as percentage
  FROM chat_messages
)
SELECT 
  'WARNING: High NULL Metadata Rate' as alert,
  total || ' messages' as total_messages,
  problematic || ' problematic' as problematic_count,
  percentage || '%' as null_percentage
FROM metadata_check
WHERE percentage > 5;
```

**Thresholds**:
- > 10% = CRITICAL
- > 5% = WARNING
- < 5% = OK

**Action**: Investigate message creation process if > 5%.

---

### ALERT 3: RLS Policy Missing (CRITICAL)
```sql
-- Run daily
SELECT 
  'CRITICAL: RLS Policy Missing' as alert,
  tablename,
  'No RLS policies found' as issue
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_messages', 'chat_conversations', 'guest_reservations')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE pg_policies.schemaname = pg_tables.schemaname 
    AND pg_policies.tablename = pg_tables.tablename
  );
```

**Threshold**: 0 (all tables must have RLS)  
**Action**: Immediate security investigation required.

---

### ALERT 4: Slow Query Detection (WARNING)
```sql
-- Requires pg_stat_statements extension
-- Run weekly
SELECT 
  'WARNING: Slow Queries Detected' as alert,
  query,
  ROUND(mean_exec_time::numeric, 2) || 'ms' as avg_time,
  calls as execution_count,
  ROUND(total_exec_time::numeric, 2) || 'ms' as total_time
FROM pg_stat_statements
WHERE query ILIKE '%chat_%'
  AND mean_exec_time > 100  -- > 100ms average
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Threshold**: 100ms average execution time  
**Action**: Optimize query or add indexes if > 100ms.

---

## Maintenance Tasks

### Monthly: Index Cleanup (After 1 Month Production)
```sql
-- Identify unused indexes for potential removal
SELECT 
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  'DROP INDEX IF EXISTS ' || indexrelname || ';' as drop_command
FROM pg_stat_user_indexes
WHERE schemaname = 'public' 
  AND relname IN ('chat_messages', 'chat_conversations', 'guest_reservations')
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Action**: 
1. Review unused indexes
2. Validate they're truly not needed
3. Drop if confirmed (save drop commands first)

**Recommended Cleanup** (if confirmed unused after 1 month):
```sql
-- Review these carefully before executing
DROP INDEX IF EXISTS idx_chat_conversations_reservation;  -- Duplicate
DROP INDEX IF EXISTS idx_messages_conversation;  -- Duplicate
DROP INDEX IF EXISTS idx_guest_reservations_auth;  -- Duplicate
```

---

### Quarterly: VACUUM and ANALYZE
```sql
-- Run during low-traffic period
VACUUM ANALYZE chat_messages;
VACUUM ANALYZE chat_conversations;
VACUUM ANALYZE guest_reservations;

-- Check bloat after VACUUM
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('chat_messages', 'chat_conversations', 'guest_reservations')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Performance Baselines (Reference)

| Query Type | Target | Current | Validated |
|-----------|--------|---------|-----------|
| Last 10 messages | < 50ms | 0.138ms | 2025-09-30 |
| Document retrieval | < 100ms | 7.615ms | 2025-09-30 |
| Guest auth lookup | < 20ms | 0.059ms | 2025-09-30 |
| Metadata NULL rate | < 5% | 0% | 2025-09-30 |
| Orphaned conversations | 0 | 0 | 2025-09-30 |

---

## Troubleshooting Guide

### Problem: Slow Message Retrieval (> 50ms)
**Diagnosis**:
```sql
EXPLAIN ANALYZE
SELECT * FROM chat_messages 
WHERE conversation_id = 'test-id'
ORDER BY created_at DESC 
LIMIT 10;
```

**Solution**:
1. Check if index `idx_chat_messages_conversation_created` is being used
2. If sequential scan → Run `ANALYZE chat_messages;`
3. If index bloat → Recreate index:
   ```sql
   DROP INDEX idx_chat_messages_conversation_created;
   CREATE INDEX idx_chat_messages_conversation_created 
   ON chat_messages(conversation_id, created_at DESC);
   ```

---

### Problem: High NULL Metadata Rate (> 5%)
**Diagnosis**:
```sql
SELECT 
  conversation_id,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN metadata IS NULL THEN 1 END) as null_count,
  ROUND(COUNT(CASE WHEN metadata IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as null_percentage
FROM chat_messages
GROUP BY conversation_id
HAVING COUNT(CASE WHEN metadata IS NULL THEN 1 END) > 0
ORDER BY null_percentage DESC
LIMIT 10;
```

**Solution**:
1. Identify conversations with high NULL rate
2. Check application code for metadata creation logic
3. Validate entity extraction is working
4. Review API logs for errors

---

### Problem: Orphaned Conversations Detected
**Diagnosis**:
```sql
SELECT 
  c.id as conversation_id,
  c.reservation_id,
  c.user_id,
  c.created_at,
  'Reservation not found' as issue
FROM chat_conversations c
WHERE c.reservation_id IS NOT NULL 
  AND c.reservation_id NOT IN (SELECT id FROM guest_reservations);
```

**Solution**:
1. Identify affected conversations
2. Check if reservation was deleted
3. Either:
   - Restore reservation if data exists
   - Archive conversation and notify user
   - Set reservation_id to NULL (if acceptable)

---

### Problem: Index Not Being Used
**Diagnosis**:
```sql
-- Check if index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'chat_messages' 
  AND indexname = 'idx_chat_messages_conversation_created';

-- Check statistics
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname = 'idx_chat_messages_conversation_created';
```

**Solution**:
1. Run `ANALYZE chat_messages;` to update statistics
2. Check if table size is too small (< 100 rows → sequential scan may be optimal)
3. Verify query uses indexed columns correctly
4. Check for type mismatches in WHERE clause

---

## Quick Commands Cheatsheet

```bash
# Copy to clipboard for easy access

# Daily check
SELECT * FROM check_metadata_integrity() UNION ALL SELECT * FROM check_rls_policies();

# Performance snapshot
SELECT * FROM guest_chat_performance_monitor;

# Find slow queries
EXPLAIN ANALYZE SELECT * FROM chat_messages WHERE conversation_id = 'test' ORDER BY created_at DESC LIMIT 10;

# Index health
SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes WHERE relname IN ('chat_messages', 'chat_conversations', 'guest_reservations');

# Data growth
SELECT COUNT(*), pg_size_pretty(pg_total_relation_size('chat_messages')) FROM chat_messages;
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-30  
**Next Review**: After FASE 1.4 Frontend Deployment  
**Maintained By**: Database Agent (Automated)
