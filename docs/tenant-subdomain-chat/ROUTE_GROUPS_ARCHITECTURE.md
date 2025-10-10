# Route Groups Architecture - Multi-Tenant System

**Fecha:** October 9, 2025
**Proyecto:** Multi-Tenant Subdomain Chat
**Estrategia:** Next.js Route Groups para separación de sistemas

---

## 🎯 Objetivo

Implementar sistema público multi-tenant **sin modificar** el sistema interno existente (proof of concept de SimmerDown).

**Clave:** Zero conflictos mediante separación física de archivos usando Route Groups de Next.js.

---

## 🏗️ Estructura de Archivos

```
src/app/
├── (internal)/                          ← Grupo 1: Sistema interno InnPilot
│   ├── login/page.tsx                   ← Login interno (existente, NO TOCAR)
│   ├── dashboard/page.tsx               ← Dashboard interno (existente, NO TOCAR)
│   ├── chat-mobile-dev/page.tsx         ← Chat desarrollo (existente, NO TOCAR)
│   └── dashboard/[tenant]/*             ← Admin interno (existente, NO TOCAR)
│
└── (public-tenant)/                     ← Grupo 2: Sistema público multi-tenant (NUEVO)
    ├── layout.tsx                       ← TenantProvider wrapper + theme injection
    ├── page.tsx                         ← Landing pública (Hero, About, Services, Gallery, Contact)
    │
    ├── chat/                            ← Chat público multi-tenant
    │   ├── layout.tsx                   ← Chat-specific layout
    │   └── page.tsx                     ← Chat interface
    │
    ├── login/                           ← Login por tenant
    │   └── page.tsx                     ← Email/password + Google OAuth
    │
    └── admin/                           ← Admin dashboard por tenant
        ├── layout.tsx                   ← Admin shell (sidebar + header + auth guard)
        ├── page.tsx                     ← Dashboard home
        ├── knowledge/page.tsx           ← Knowledge base manager
        ├── branding/page.tsx            ← Branding editor (logo + colors)
        ├── content/page.tsx             ← Content editor (landing page sections)
        ├── analytics/page.tsx           ← Chat analytics
        └── settings/page.tsx            ← General settings
```

---

## 🔄 Routing Behavior

### URLs SIN Subdomain (Sistema Interno)

**Base URL:** `localhost:3000` o `innpilot.io`

```
localhost:3000/login               → (internal)/login/page.tsx
localhost:3000/dashboard           → (internal)/dashboard/page.tsx
localhost:3000/chat-mobile-dev     → (internal)/chat-mobile-dev/page.tsx
localhost:3000/dashboard/[tenant]  → (internal)/dashboard/[tenant]/page.tsx
```

**Características:**
- ✅ Sistema existente (proof of concept SimmerDown)
- ✅ Gestión interna de InnPilot
- ✅ Testing y desarrollo
- ✅ **NO se modifica nada**

---

### URLs CON Subdomain (Sistema Público Multi-Tenant)

**Base URL:** `{tenant}.innpilot.io` (e.g., `simmerdown.innpilot.io`)

```
simmerdown.innpilot.io/            → (public-tenant)/page.tsx (landing)
simmerdown.innpilot.io/chat        → (public-tenant)/chat/page.tsx
simmerdown.innpilot.io/login       → (public-tenant)/login/page.tsx
simmerdown.innpilot.io/admin       → (public-tenant)/admin/page.tsx
simmerdown.innpilot.io/admin/knowledge → (public-tenant)/admin/knowledge/page.tsx
```

**Características:**
- ✅ Landing page pública (SEO-optimized)
- ✅ Chat público con knowledge base aislada por tenant
- ✅ Login específico del tenant (email/password + Google OAuth)
- ✅ Admin dashboard con branding del tenant

---

## 🧩 Route Groups (Next.js)

### ¿Qué son Route Groups?

Next.js ignora los nombres entre paréntesis `(nombre)` en las URLs, pero los usa para organizar archivos.

**Ejemplo:**
```
src/app/(internal)/login/page.tsx     → URL: /login
src/app/(public-tenant)/login/page.tsx → URL: /login
```

Ambos responden a `/login`, pero Next.js usa el contexto (subdomain header) para decidir cuál renderizar.

### ¿Cómo decide Next.js cuál usar?

**Mediante Middleware + Layout Detection:**

1. **Middleware inyecta header** `x-tenant-subdomain`:
   ```typescript
   // src/middleware.ts (ya implementado ✅)
   const subdomain = getSubdomain(hostname);
   requestHeaders.set('x-tenant-subdomain', subdomain || '');
   ```

2. **Layout detecta subdomain y aplica lógica:**
   ```typescript
   // (public-tenant)/layout.tsx (nuevo)
   export default async function PublicTenantLayout({ children }) {
     const subdomain = headers().get('x-tenant-subdomain');

     // Si NO hay subdomain → redirigir a sistema interno
     if (!subdomain) {
       redirect('/dashboard'); // O página de error
     }

     // Si HAY subdomain → cargar tenant y aplicar branding
     const tenant = await getTenantBySubdomain(subdomain);

     return (
       <TenantProvider tenant={tenant}>
         {/* Theme injection */}
         <style>{generateThemeCSS(tenant.color_palette)}</style>
         {children}
       </TenantProvider>
     );
   }
   ```

3. **Sistema interno NO tiene validación de subdomain:**
   ```typescript
   // (internal)/layout.tsx (existente, no modificar)
   export default function InternalLayout({ children }) {
     // No valida subdomain, funciona con o sin él
     return <div>{children}</div>;
   }
   ```

**Resultado:**
- Sin subdomain → Usa `(internal)` routes
- Con subdomain → Usa `(public-tenant)` routes

---

## 🎨 Branding System Integration

### (public-tenant)/layout.tsx

```typescript
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { TenantProvider } from '@/contexts/TenantContext';
import { generateThemeCSS } from '@/lib/theme-injector';

export default async function PublicTenantLayout({ children }) {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    // No subdomain → redirect to main site or 404
    return <div>Tenant not found</div>;
  }

  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    return <div>Tenant not found: {subdomain}</div>;
  }

  return (
    <html lang="es">
      <head>
        {/* Dynamic meta tags */}
        <title>{tenant.nombre_comercial}</title>
        <meta name="description" content={tenant.description} />

        {/* Favicon */}
        <link rel="icon" href={tenant.favicon_url || '/favicon.ico'} />

        {/* Theme CSS variables */}
        <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(tenant.color_palette) }} />
      </head>
      <body>
        <TenantProvider tenant={tenant}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

---

## 🔐 Auth System Integration

### (public-tenant)/admin/layout.tsx (Auth Guard)

```typescript
import { headers } from 'next/headers';
import { getTenantBySubdomain } from '@/lib/tenant-utils';
import { getCurrentUserWithClients } from '@/lib/supabase-auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default async function AdminLayout({ children }) {
  const subdomain = headers().get('x-tenant-subdomain');
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    redirect('/'); // Tenant not found
  }

  // Auth guard
  const user = await getCurrentUserWithClients();

  if (!user) {
    redirect('/login'); // Not authenticated
  }

  // Check if user has access to this tenant
  const userClient = user.clients.find(c => c.client_id === tenant.tenant_id);

  if (!userClient) {
    redirect('/'); // User doesn't have access to this tenant
  }

  // Check role (admin, owner)
  if (!['admin', 'owner'].includes(userClient.role)) {
    redirect('/'); // Insufficient permissions
  }

  return (
    <div className="flex h-screen">
      <AdminSidebar tenant={tenant} user={user} role={userClient.role} />
      <div className="flex-1 flex flex-col">
        <AdminHeader tenant={tenant} user={user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 📊 URL Mapping Reference

| URL | Route Group | File Path | Purpose |
|-----|-------------|-----------|---------|
| `localhost:3000/login` | `(internal)` | `(internal)/login/page.tsx` | Login interno InnPilot |
| `localhost:3000/dashboard` | `(internal)` | `(internal)/dashboard/page.tsx` | Dashboard interno |
| `localhost:3000/chat-mobile-dev` | `(internal)` | `(internal)/chat-mobile-dev/page.tsx` | Chat desarrollo |
| `simmerdown.innpilot.io/` | `(public-tenant)` | `(public-tenant)/page.tsx` | Landing pública |
| `simmerdown.innpilot.io/chat` | `(public-tenant)` | `(public-tenant)/chat/page.tsx` | Chat público |
| `simmerdown.innpilot.io/login` | `(public-tenant)` | `(public-tenant)/login/page.tsx` | Login por tenant |
| `simmerdown.innpilot.io/admin` | `(public-tenant)` | `(public-tenant)/admin/page.tsx` | Admin dashboard |

---

## ✅ Ventajas de Route Groups

1. **Zero Conflictos**: Archivos físicamente separados, imposible sobrescribir accidentalmente
2. **Zero Riesgo**: Sistema interno sigue funcionando exactamente igual
3. **Fácil Testing**: Ambos sistemas en paralelo (localhost:3000 vs simmerdown.localhost:3000)
4. **Fácil Deprecación**: Eliminar `(internal)` cuando ya no se necesite
5. **Código Limpio**: Separación clara de concerns (interno vs público)
6. **Fácil Onboarding**: Nuevos developers entienden inmediatamente la separación

---

## 🚦 Migration Path (Futuro)

Si eventualmente quieres deprecar el sistema interno:

1. **Mantener ambos** hasta que todos los usuarios migren
2. **Agregar banner** en `(internal)` routes: "Este sistema será deprecado, usa {tenant}.innpilot.io"
3. **Redirigir automáticamente** después de X meses
4. **Eliminar `(internal)` folder** cuando ya no se use

---

## 📚 Referencias

- [Next.js Route Groups Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Multi-Tenancy Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Última actualización:** October 9, 2025
**Estado:** Arquitectura definida, lista para implementación
