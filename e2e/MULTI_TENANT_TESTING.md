# Multi-Tenant Testing Guide

## Overview

InnPilot is a **multi-tenant system** where each hotel/property has its own isolated data space identified by a `tenant_id` (slug).

All conversation memory tests are designed to work across multiple tenants without hardcoded dependencies.

## Architecture

### Tenant Isolation
- Each tenant has independent:
  - `prospective_sessions` (conversation history)
  - `conversation_memory` (compressed summaries)
  - Embeddings and semantic search results
- Data is partitioned by `tenant_id` column in all tables

### Current Tenants
- **Production**: `simmerdown` (Simmer Down House - main property)
- **Testing**: Any valid slug can be used for testing
- **Future**: Additional properties will have their own tenant_id

## Running Tests for Different Tenants

### Playwright E2E Tests

```bash
# Default tenant (simmerdown)
npx playwright test conversation-memory --headed

# Custom tenant
TENANT_ID=my-hotel npx playwright test conversation-memory --headed

# Multiple tenants in sequence
for tenant in simmerdown hotel-a hotel-b; do
  TENANT_ID=$tenant npx playwright test conversation-memory
done
```

### Manual Testing Script

```bash
# Default tenant
./scripts/test-conversation-compression.sh

# Custom tenant (via CLI arg)
./scripts/test-conversation-compression.sh my-hotel

# Custom tenant (via env var)
TENANT_ID=custom-hotel ./scripts/test-conversation-compression.sh
```

## Verification Queries

### Check compressions for specific tenant
```sql
SELECT
  session_id,
  message_range,
  message_count,
  created_at
FROM conversation_memory cm
JOIN prospective_sessions ps ON cm.session_id = ps.session_id
WHERE ps.tenant_id = 'my-hotel'
ORDER BY cm.created_at DESC;
```

### Check active sessions per tenant
```sql
SELECT
  tenant_id,
  COUNT(*) as session_count,
  SUM(jsonb_array_length(conversation_history)) as total_messages
FROM prospective_sessions
GROUP BY tenant_id
ORDER BY tenant_id;
```

### Cleanup test data for specific tenant
```sql
-- Get test session IDs
SELECT session_id
FROM prospective_sessions
WHERE tenant_id = 'my-hotel'
ORDER BY created_at DESC
LIMIT 10;

-- Delete test data
DELETE FROM conversation_memory
WHERE session_id IN (
  SELECT session_id FROM prospective_sessions WHERE tenant_id = 'my-hotel'
);

DELETE FROM prospective_sessions
WHERE tenant_id = 'my-hotel';
```

## Best Practices

### 1. Always Specify Tenant in Tests
```typescript
// ❌ Bad - hardcoded
const TENANT_ID = 'simmerdown'

// ✅ Good - configurable
const TENANT_ID = process.env.TENANT_ID || 'simmerdown'
```

### 2. Use Environment Variables for CI/CD
```yaml
# GitHub Actions example
- name: Test Tenant A
  env:
    TENANT_ID: tenant-a
  run: npx playwright test conversation-memory

- name: Test Tenant B
  env:
    TENANT_ID: tenant-b
  run: npx playwright test conversation-memory
```

### 3. Verify Isolation in Tests
```typescript
test('sessions are isolated per tenant', async ({ page }) => {
  const tenantA = 'hotel-a'
  const tenantB = 'hotel-b'

  // Create sessions for both tenants
  const sessionA = await createSession(page, tenantA)
  const sessionB = await createSession(page, tenantB)

  // Verify data doesn't leak between tenants
  const memoriesA = await getMemories(sessionA, tenantA)
  const memoriesB = await getMemories(sessionB, tenantB)

  expect(memoriesA).not.toContainEqual(expect.objectContaining({
    session_id: sessionB
  }))
})
```

## Troubleshooting

### Issue: Tests fail with "tenant not found"
**Solution**: Ensure tenant exists in database or use valid test tenant

### Issue: Data from different tenants mixed in results
**Solution**: Check that all queries include `WHERE tenant_id = $1` filter

### Issue: Embeddings shared between tenants
**Solution**: Verify `conversation_memory` table has proper tenant_id join via `prospective_sessions`

## Future Enhancements

- [ ] Add tenant isolation tests to CI/CD pipeline
- [ ] Create tenant-specific test fixtures
- [ ] Add cross-tenant security tests (ensure no data leakage)
- [ ] Implement tenant provisioning scripts for testing
