# Multi-Tenant Routing Architecture

**Last Updated:** October 2025
**Version:** 2.0 (Subdomain-based)

---

## Overview

MUVA Chat utiliza una arquitectura multi-tenant basada en subdominios para aislar completamente los datos y la experiencia de cada hotel/negocio turístico.

## URL Structure

### Production
```
https://simmerdown.muva.chat/              → Landing page (público)
https://simmerdown.muva.chat/chat          → Chat dual (staff auth o público)
https://simmerdown.muva.chat/guest-chat    → Guest chat (reservación)
https://simmerdown.muva.chat/dashboard     → Admin dashboard
```

### Development
```
http://simmerdown.localhost:3000/          → Landing page (público)
http://simmerdown.localhost:3000/chat      → Chat dual (staff auth o público)
http://simmerdown.localhost:3000/guest-chat → Guest chat (reservación)
http://simmerdown.localhost:3000/dashboard  → Admin dashboard
```

---

## Routing Configuration

### Next.js Rewrites (`next.config.ts`)

```typescript
async rewrites() {
  return {
    beforeFiles: [
      // Exclude: _next, api, favicon.ico, guest-chat, static files
      {
        source: '/:path((?!_next|api|favicon.ico|guest-chat|.*\\..*).*)',
        has: [
          {
            type: 'host',
            value: '(?<subdomain>[^.]+)\\.(localhost|muva\\.chat)(?:\\:\\d+)?',
          },
        ],
        destination: '/:subdomain/:path*',
      },
      // Root path with subdomain
      {
        source: '/',
        has: [
          {
            type: 'host',
            value: '(?<subdomain>[^.]+)\\.(localhost|muva\\.chat)(?:\\:\\d+)?',
          },
        ],
        destination: '/:subdomain',
      },
    ],
  };
}
```

### Middleware (`src/middleware.ts`)

```typescript
// Injects x-tenant-subdomain header for production (Nginx)
// Extracts subdomain from hostname for development
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = getSubdomain(hostname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```

---

## Directory Structure

```
src/app/
├── [tenant]/                      # Tenant-scoped routes
│   ├── layout.tsx                 # Server Component: TenantProvider wrapper
│   ├── page.tsx                   # Landing page (TenantChatPage)
│   │
│   ├── chat/                      # Dual-auth chat route
│   │   ├── layout.tsx             # Minimal layout
│   │   └── page.tsx               # Staff or Public chat
│   │
│   ├── guest-chat/                # DEPRECATED - redirects to /guest-chat
│   │   └── [tenant_id]/page.tsx
│   │
│   ├── dashboard/                 # Admin dashboard (with sidebar)
│   │   ├── layout.tsx             # AdminSidebar + AdminHeader
│   │   └── page.tsx               # Dashboard home
│   │
│   ├── accommodations/            # Unit management
│   ├── knowledge-base/            # Document uploads
│   ├── branding/                  # Logo, colors, SEO
│   ├── content/                   # Landing page content
│   ├── analytics/                 # Metrics & reports
│   ├── settings/                  # Business info, SIRE config
│   ├── login/                     # Staff/Admin login
│   │
│   └── staff/                     # Staff chat (backup route)
│       ├── page.tsx               # StaffChatInterface
│       ├── login/                 # Staff login (legacy)
│       └── reservations/          # Reservations list
│
├── guest-chat/                    # Guest chat (subdomain-based)
│   └── page.tsx                   # Login with email + code
│
└── api/                           # API routes (NOT tenant-scoped)
    ├── dev/chat/                  # Dev chat engine
    ├── staff/chat/                # Staff chat engine
    ├── guest/chat/                # Guest chat engine
    └── tenant/resolve/            # Resolve tenant by slug/UUID
```

---

## Authentication & Authorization

### 1. Public Routes (No Auth)
- `/` - Landing page with public chat
- `/chat` - Public chat (if not staff authenticated)

### 2. Guest Routes (Guest Token)
- `/guest-chat` - Login with email + reservation code
- Stores `guest_token` in localStorage
- Access to conversation history for specific reservation

### 3. Staff Routes (Staff Token)
- `/login` - Staff/Admin login
- `/dashboard` - Admin dashboard with sidebar
- `/chat` - Staff chat interface (if staff authenticated)
- Stores `staff_token` in localStorage
- Access level by role:
  - **CEO**: Full access (SIRE, analytics, all settings)
  - **Admin**: Full access except some CEO-only features
  - **Staff**: Limited access (accommodations, knowledge base)

---

## Chat Routes - Dual Authentication

### `/chat` - Smart Route

**File:** `src/app/[tenant]/chat/page.tsx`

#### Logic Flow:

```typescript
// 1. Check for staff_token
const token = localStorage.getItem('staff_token');

// 2. Verify token
if (token && await verifyStaffToken(token)) {
  // Staff authenticated → Show StaffChatInterface
  return <StaffChatInterface />;
}

// 3. Public visitor → Show TenantChatPage
return <TenantChatPage tenant={tenant} />;
```

#### Use Cases:

| Scenario | Token | Component Rendered |
|----------|-------|-------------------|
| Admin clicks "Chat" in sidebar | ✅ Valid staff_token | `StaffChatInterface` |
| CEO navigates to /chat directly | ✅ Valid staff_token | `StaffChatInterface` |
| Housekeeper uses staff portal | ✅ Valid staff_token | `StaffChatInterface` |
| Tourist visits /chat URL | ❌ No token | `TenantChatPage` (public) |
| Previous staff (expired token) | ❌ Invalid token | `TenantChatPage` (public) |

---

## Component Hierarchy

### Landing Page (`/`)
```
[tenant]/page.tsx (Server Component)
└── TenantChatPage (Client Component)
    ├── TenantHeader
    ├── Welcome Message (static HTML)
    ├── Chat Messages (streaming)
    ├── DevPhotoCarousel
    └── Input Area
```

### Staff Chat (`/chat` with auth)
```
[tenant]/chat/page.tsx (Client Component)
└── StaffChatInterface
    ├── Header (Staff Portal)
    ├── ConversationList (sidebar)
    ├── Chat Messages
    ├── SourcesDrawer
    └── Input Area
```

### Public Chat (`/chat` without auth)
```
[tenant]/chat/page.tsx (Client Component)
└── TenantChatPage (Same as landing page)
    ├── TenantHeader
    ├── Welcome Message
    ├── Chat Messages
    └── Input Area
```

### Admin Dashboard (`/dashboard`)
```
[tenant]/dashboard/layout.tsx
├── AdminSidebar
│   ├── Dashboard
│   ├── Accommodations
│   ├── Knowledge Base
│   ├── Branding
│   ├── Content
│   ├── Analytics
│   ├── Chat          ← Links to /chat
│   └── Settings
├── AdminHeader
└── [child pages]
```

---

## Tenant Resolution

### Server Components (SSR)
```typescript
// Get subdomain from headers
const headersList = await headers();
const subdomain = headersList.get('x-tenant-subdomain') ||
                  getSubdomain(headersList.get('host') || '');

// Fetch tenant from database
const tenant = await getTenantBySubdomain(subdomain);

// Wrap with provider
return (
  <TenantProvider tenant={tenant}>
    {children}
  </TenantProvider>
);
```

### Client Components
```typescript
// Use context hook
const { tenant } = useTenant();

// Access tenant data
console.log(tenant.business_name);
console.log(tenant.primary_color);
```

---

## Database Schema

### Tenant Identification

```sql
-- Tenant registry table
CREATE TABLE public.tenant_registry (
  tenant_id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- URL slug (e.g., 'simmerdown')
  nombre_comercial TEXT NOT NULL,      -- Business name
  business_name TEXT,                  -- English business name
  subdomain TEXT UNIQUE,               -- Subdomain (e.g., 'simmerdown')
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  -- ... other fields
);

-- Example:
INSERT INTO tenant_registry (tenant_id, slug, subdomain, nombre_comercial)
VALUES (
  'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  'simmerdown',
  'simmerdown',
  'Simmer Down Guest House'
);
```

### Row Level Security (RLS)

All tenant-scoped tables have RLS policies:

```sql
-- Example: accommodation_units_public
CREATE POLICY "Tenant isolation"
  ON accommodation_units_public
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

---

## API Routes

### Tenant Resolution API
```typescript
POST /api/tenant/resolve
Body: { slugOrUuid: 'simmerdown' }
Response: {
  success: true,
  tenant_id: 'b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf',
  tenant_slug: 'simmerdown',
  tenant_name: 'Simmer Down Guest House'
}
```

### Staff Token Verification
```typescript
GET /api/staff/verify-token
Headers: { Authorization: 'Bearer <staff_token>' }
Response: {
  valid: true,
  staff_info: {
    id: '...',
    username: 'admin_ceo',
    full_name: 'Carlos Ospina',
    role: 'ceo',
    tenant_id: 'b5c45f51-...'
  }
}
```

---

## Development Setup

### Local Subdomain Testing

1. **Update `/etc/hosts`:**
```bash
sudo nano /etc/hosts

# Add:
127.0.0.1 simmerdown.localhost
127.0.0.1 hotelboutique.localhost
```

2. **Start Dev Server:**
```bash
./scripts/dev-with-keys.sh
# DO NOT use `pnpm run dev` directly
```

3. **Access:**
```
http://simmerdown.localhost:3000/
http://simmerdown.localhost:3000/dashboard
```

---

## Migration Notes

### From UUID-based to Subdomain-based

**Before (Legacy):**
```
/chat/b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf/guest
/admin/b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf/dashboard
```

**After (Current):**
```
simmerdown.muva.chat/guest-chat
simmerdown.muva.chat/dashboard
```

### Legacy Routes (Deprecated)

- `/staff/` - Global staff portal (non-tenant) → **DEPRECATED**
- `/guest-chat/[tenant_id]/` - UUID-based guest chat → **REDIRECTS** to `/guest-chat`
- `/[tenant]/dashboard-legacy/` - Old dashboard → **BACKUP**, use `/dashboard`

---

## Troubleshooting

### Issue: 404 on subdomain routes
**Cause:** Rewrites disabled or misconfigured
**Fix:** Check `next.config.ts` rewrites are enabled

### Issue: "useTenant must be used within TenantProvider"
**Cause:** Client component not wrapped in TenantProvider
**Fix:** Ensure `[tenant]/layout.tsx` wraps children with TenantProvider

### Issue: Tenant not found
**Cause:** Subdomain not in database or misspelled
**Fix:** Verify slug/subdomain in `tenant_registry` table

### Issue: Staff chat shows public chat
**Cause:** `staff_token` expired or invalid
**Fix:** Re-login at `/login`, check token in localStorage

---

## References

- **Tenant Utils:** `src/lib/tenant-utils.ts`
- **Tenant Context:** `src/contexts/TenantContext.tsx`
- **Middleware:** `src/middleware.ts`
- **Next Config:** `next.config.ts`
- **Auth Guide:** `docs/features/authentication/STAFF_AUTH.md`
- **Deployment:** `docs/deployment/VPS_DEPLOYMENT.md`

---

**Last Updated:** October 2025
**Maintained By:** Claude Code + Carlos Ospina
