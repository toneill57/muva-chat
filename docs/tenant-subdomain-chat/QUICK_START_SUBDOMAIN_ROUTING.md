# Quick Start: Subdomain Routing

**Status:** Database schema ready ✅  
**Next:** Implement routing logic

---

## 1. Create RPC Function (Database)

```sql
-- Execute via Management API
CREATE OR REPLACE FUNCTION get_tenant_by_subdomain(p_subdomain TEXT)
RETURNS TABLE (
  tenant_id UUID,
  nombre_comercial VARCHAR,
  is_active BOOLEAN,
  features JSONB,
  subscription_tier VARCHAR
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.tenant_id,
    tr.nombre_comercial,
    tr.is_active,
    tr.features,
    tr.subscription_tier
  FROM tenant_registry tr
  WHERE tr.subdomain = p_subdomain
    AND tr.is_active = true;
END;
$$;

COMMENT ON FUNCTION get_tenant_by_subdomain IS 'Lookup active tenant by subdomain for routing. Returns NULL if tenant not found or inactive.';
```

**Execution:**
```bash
# Save SQL to file first, then:
set -a && source .env.local && set +a && \
npx tsx scripts/execute-ddl-via-api.ts path/to/function.sql
```

---

## 2. Test Subdomain Lookup

```typescript
// scripts/test-subdomain-lookup.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data, error } = await supabase.rpc('get_tenant_by_subdomain', {
  p_subdomain: 'simmerdown'
});

console.log('Tenant:', data);
```

**Run:**
```bash
set -a && source .env.local && set +a && \
npx tsx scripts/test-subdomain-lookup.ts
```

---

## 3. Add Middleware (Next.js)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain (handle localhost and production)
  const subdomain = extractSubdomain(hostname);
  
  if (subdomain) {
    const { data: tenant } = await supabase.rpc('get_tenant_by_subdomain', {
      p_subdomain: subdomain
    });
    
    if (tenant && tenant.length > 0) {
      // Clone headers and add tenant context
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-tenant-id', tenant[0].tenant_id);
      requestHeaders.set('x-tenant-name', tenant[0].nombre_comercial);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
    } else {
      // Subdomain not found - redirect to 404 or main site
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }
  
  return NextResponse.next();
}

function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Handle localhost development
  if (host === 'localhost' || host === '127.0.0.1') {
    return null; // No subdomain in local dev (use .localhost instead)
  }
  
  // For subdomain.localhost (local testing)
  if (host.endsWith('.localhost')) {
    const parts = host.split('.');
    return parts.length > 2 ? parts[0] : null;
  }
  
  // Production: subdomain.innpilot.com
  const parts = host.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Ignore www
    return subdomain !== 'www' ? subdomain : null;
  }
  
  return null;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

---

## 4. Local Testing Setup

### Option A: Using .localhost domains (recommended)

```bash
# No /etc/hosts modification needed
# Access directly at:
http://simmerdown.localhost:3000
http://free-hotel-test.localhost:3000
```

### Option B: Using custom local domains

```bash
# Add to /etc/hosts
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 simmerdown.local
127.0.0.1 free-hotel-test.local

# Access at:
http://simmerdown.local:3000
http://free-hotel-test.local:3000
```

---

## 5. Update API Routes

```typescript
// src/app/api/chat/route.ts
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id');
  
  if (!tenantId) {
    return Response.json(
      { error: 'Tenant not found' },
      { status: 404 }
    );
  }
  
  // Use tenantId for all queries
  const { data } = await supabase
    .from('guest_conversations')
    .select('*')
    .eq('tenant_id', tenantId);
  
  // ... rest of logic
}
```

---

## 6. Production DNS Setup

### In Your DNS Provider (e.g., Cloudflare, GoDaddy):

```
Type    Name                Value                   TTL
A       @                   <VPS-IP>               Auto
A       www                 <VPS-IP>               Auto
A       simmerdown          <VPS-IP>               Auto
A       free-hotel-test     <VPS-IP>               Auto
A       *                   <VPS-IP>               Auto  (wildcard for future tenants)
```

### Nginx Configuration (VPS):

```nginx
# /etc/nginx/sites-available/innpilot
server {
    listen 80;
    server_name *.innpilot.com innpilot.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. Testing Checklist

- [ ] RPC function created and tested
- [ ] Middleware extracts subdomain correctly
- [ ] Valid subdomain returns tenant data
- [ ] Invalid subdomain returns 404
- [ ] No subdomain (main domain) works normally
- [ ] API routes receive x-tenant-id header
- [ ] Local testing works with .localhost domains
- [ ] Production DNS configured
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates installed (Let's Encrypt)

---

## Available Subdomains (Current Tenants)

| Subdomain | Tenant Name | Status |
|-----------|-------------|--------|
| simmerdown | SimmerDown Guest House | ✅ Active |
| free-hotel-test | Free Hotel Test | ✅ Active |

---

## Adding New Tenants

```sql
INSERT INTO tenant_registry (
  nit,
  razon_social,
  nombre_comercial,
  schema_name,
  slug,
  subdomain,  -- NEW: Must be unique
  is_active
) VALUES (
  '900123456',
  'Hotel Example S.A.S.',
  'Hotel Example',
  'hotel_example',
  'hotel-example',
  'hotel-example',  -- Will be used for hotel-example.innpilot.com
  true
);
```

**Validation:**
- Subdomain must be lowercase
- Only alphanumeric and hyphens allowed
- Must be unique across all tenants
- Automatically indexed for fast lookup

---

## Troubleshooting

### Subdomain not resolving locally
```bash
# Test DNS resolution
ping simmerdown.localhost
# Should resolve to 127.0.0.1
```

### Middleware not detecting subdomain
```typescript
// Add debug logging in middleware
console.log('Hostname:', hostname);
console.log('Extracted subdomain:', subdomain);
console.log('Tenant found:', tenant);
```

### RPC function returns no data
```sql
-- Check tenant exists and is active
SELECT subdomain, is_active FROM tenant_registry;

-- Test function directly
SELECT * FROM get_tenant_by_subdomain('simmerdown');
```

---

## Performance Monitoring

```sql
-- Check subdomain lookup performance
EXPLAIN ANALYZE
SELECT * FROM get_tenant_by_subdomain('simmerdown');

-- Expected: <1ms execution time
```

---

**Documentation created:** October 9, 2025  
**Database schema:** ✅ Ready  
**Next step:** Create RPC function and middleware
