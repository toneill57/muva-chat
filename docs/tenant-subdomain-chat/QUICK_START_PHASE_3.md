# Quick Start Guide: Phase 3 Implementation

**For:** Next developer working on tenant database integration
**Prerequisites:** Phase 1 (Database) and Phase 2 (Middleware) completed

## What's Already Done ✅

### Phase 1: Database Schema
- ✅ `subdomain` column added to `tenants` table
- ✅ Unique constraint on `subdomain`
- ✅ Validation: lowercase, alphanumeric, hyphens only
- ✅ Test data: `simmerdown` tenant exists

### Phase 2: Middleware Detection
- ✅ Subdomain extracted from hostname
- ✅ Validated and injected into request headers
- ✅ `x-tenant-subdomain` header available in all API routes
- ✅ 100% test coverage

## What You Need to Build (Phase 3)

### Goal
Connect the subdomain header to actual tenant data from the database.

### Tasks

1. **Create Tenant Lookup Function**
   ```typescript
   // src/lib/tenant-utils.ts (add to existing file)

   export async function getTenantBySubdomain(
     subdomain: string
   ): Promise<{ id: string; name: string } | null> {
     // Query tenants table
     // Return tenant data or null if not found
   }
   ```

2. **Add Tenant Caching**
   ```typescript
   // In-memory cache with TTL
   const tenantCache = new Map<string, { tenant: any; expires: number }>();
   ```

3. **Inject Tenant ID into Headers**
   ```typescript
   // src/middleware.ts

   // After subdomain validation:
   if (validSubdomain) {
     const tenant = await getTenantBySubdomain(validSubdomain);

     if (tenant) {
       requestHeaders.set('x-tenant-id', tenant.id);
       requestHeaders.set('x-tenant-name', tenant.name);
     } else {
       // Return 404 for invalid tenant
     }
   }
   ```

4. **Update API Routes**
   ```typescript
   // Example: src/app/api/guest/chat/route.ts

   export async function POST(req: NextRequest) {
     const tenantId = req.headers.get('x-tenant-id');
     const subdomain = req.headers.get('x-tenant-subdomain');

     if (!tenantId) {
       return NextResponse.json(
         { error: 'Tenant not found' },
         { status: 404 }
       );
     }

     // Use tenantId for database queries
   }
   ```

5. **Create Tests**
   - Unit tests for `getTenantBySubdomain()`
   - Integration tests with real database
   - Cache invalidation tests
   - Performance tests (< 10ms overhead)

## Available Resources

### Existing Code to Reference

**Middleware Pattern:**
```typescript
// src/middleware.ts (lines 69-151)
// Shows how to inject headers and handle validation
```

**Helper Functions:**
```typescript
// src/lib/tenant-utils.ts
// getSubdomain() and isValidSubdomain() already implemented
```

**Database Access:**
```typescript
// src/lib/supabase.ts
// createServerClient() for server-side queries
```

**Test Endpoint:**
```typescript
// src/app/api/test-subdomain/route.ts
// Example of reading headers from request
```

### Environment Variables

```bash
# .env.local
SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Database Schema

```sql
-- tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL CHECK (subdomain ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Test Data:**
```sql
-- Existing tenant for testing
subdomain: 'simmerdown'
id: '...' (check database)
```

## Development Workflow

### Step 1: Set Up Dev Environment
```bash
# Start development server
./scripts/dev-with-keys.sh

# In another terminal, test existing functionality
curl -H "Host: simmerdown.localhost:3000" http://localhost:3000/api/test-subdomain
```

### Step 2: Implement Tenant Lookup
```bash
# Create new function in src/lib/tenant-utils.ts
# Add getTenantBySubdomain() function

# Test it manually
npx tsx -e "
import { getTenantBySubdomain } from './src/lib/tenant-utils';
const tenant = await getTenantBySubdomain('simmerdown');
console.log('Tenant:', tenant);
"
```

### Step 3: Integrate with Middleware
```bash
# Edit src/middleware.ts
# Add tenant lookup after subdomain validation
# Inject tenant_id header

# Test via curl
curl -H "Host: simmerdown.localhost:3000" http://localhost:3000/api/test-subdomain
# Should now include x-tenant-id in response headers
```

### Step 4: Create Tests
```bash
# Create test file
touch scripts/test-tenant-lookup.ts

# Run tests
npx tsx scripts/test-tenant-lookup.ts
```

### Step 5: Update Documentation
```bash
# Document changes in
docs/tenant-subdomain-chat/PHASE_3_IMPLEMENTATION.md
```

## Testing Strategy

### Test Cases Required

1. **Valid Tenant Lookup**
   - Input: `simmerdown` subdomain
   - Expected: Tenant data returned

2. **Invalid Tenant**
   - Input: `nonexistent` subdomain
   - Expected: null or 404 response

3. **Cache Hit**
   - Input: Same subdomain twice
   - Expected: Second call uses cache (no DB query)

4. **Cache Expiration**
   - Input: Wait 60+ seconds, query again
   - Expected: Fresh DB query

5. **Performance**
   - Measure: Time from request to header injection
   - Expected: < 10ms overhead

### Test Commands

```bash
# Unit tests
npx tsx scripts/test-tenant-lookup.ts

# Integration tests (requires server)
./scripts/test-tenant-integration.sh

# Performance tests
npx tsx scripts/test-tenant-performance.ts
```

## Performance Targets

- **Tenant lookup (cached):** < 1ms
- **Tenant lookup (DB query):** < 50ms
- **Total middleware overhead:** < 10ms
- **Cache hit rate:** > 90% (in production)

## Security Considerations

1. **Validate tenant access**
   - Ensure user has permission to access tenant
   - Implement tenant-level authorization

2. **Cache security**
   - Don't cache sensitive tenant data
   - Implement proper cache invalidation

3. **Error handling**
   - Don't expose database errors to client
   - Log errors server-side for debugging

4. **RLS integration**
   - Ensure RLS policies work with tenant_id
   - Test multi-tenant data isolation

## Common Pitfalls to Avoid

1. **Don't query database in middleware for every request**
   - ❌ Use caching with TTL
   - ✅ Implement in-memory cache

2. **Don't break existing middleware logic**
   - ❌ Read existing code carefully
   - ✅ Preserve rate limiting and security headers

3. **Don't hardcode tenant IDs**
   - ❌ Always query from database
   - ✅ Use dynamic lookups

4. **Don't skip validation**
   - ❌ Trust subdomain value blindly
   - ✅ Validate format before database query

## Acceptance Criteria

- ✅ `getTenantBySubdomain()` function created
- ✅ Tenant data cached with 60s TTL
- ✅ `x-tenant-id` header injected into requests
- ✅ Invalid subdomains return 404
- ✅ API routes can access tenant_id from headers
- ✅ Performance overhead < 10ms
- ✅ 100% test coverage
- ✅ RLS policies work correctly
- ✅ Documentation updated

## Getting Help

### Documentation
- **Phase 1 Docs:** `docs/tenant-subdomain-chat/PHASE_1_DATABASE_IMPLEMENTATION.md`
- **Phase 2 Docs:** `docs/tenant-subdomain-chat/PHASE_2_MIDDLEWARE_IMPLEMENTATION.md`
- **Project Guidelines:** `CLAUDE.md`
- **Agent Guidelines:** `snapshots/backend-developer.md`

### Useful Files
- Middleware: `src/middleware.ts`
- Tenant Utils: `src/lib/tenant-utils.ts`
- Supabase Client: `src/lib/supabase.ts`
- Test Endpoint: `src/app/api/test-subdomain/route.ts`

### Testing
- Helper tests: `npx tsx scripts/test-subdomain-helpers.ts`
- Middleware tests: `./scripts/test-subdomain-integration.sh`

### Database
- Check tenants: `mcp__supabase__execute_sql({ query: "SELECT * FROM tenants" })`
- Verify schema: Review Phase 1 migration files

## Example Implementation Snippet

```typescript
// src/lib/tenant-utils.ts

import { createServerClient } from '@/lib/supabase';

// Simple in-memory cache
interface CachedTenant {
  data: { id: string; name: string } | null;
  expires: number;
}

const tenantCache = new Map<string, CachedTenant>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function getTenantBySubdomain(
  subdomain: string
): Promise<{ id: string; name: string } | null> {
  // Check cache first
  const cached = tenantCache.get(subdomain);
  if (cached && Date.now() < cached.expires) {
    console.log('[tenant-utils] Cache hit for:', subdomain);
    return cached.data;
  }

  // Query database
  console.log('[tenant-utils] Fetching tenant from database:', subdomain);
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('subdomain', subdomain)
    .single();

  if (error) {
    console.error('[tenant-utils] Database error:', error);
    return null;
  }

  // Cache result
  tenantCache.set(subdomain, {
    data: data || null,
    expires: Date.now() + CACHE_TTL,
  });

  return data;
}
```

---

**Ready to Start Phase 3?** Follow this guide step-by-step and you'll be done in no time!

**Questions?** Refer to existing documentation or check the test files for examples.
