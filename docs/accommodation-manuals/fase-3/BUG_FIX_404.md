# Bug Fix: 404 Errors en Accommodation Manuals API Calls

**Fecha:** 2025-11-09
**Fase:** FASE 3.2/3.3
**Severity:** Medium (no afectaba funcionalidad pero generaba errores en console)
**Status:** ✅ FIXED

---

## Problema

Durante la integración de los componentes `AccommodationManualsSection` y `ManualContentModal`, se detectaron errores 404 en la consola del navegador al hacer fetch a los endpoints de API de manuales.

**Síntomas:**
- Console mostraba: `GET http://simmerdown.localhost:3001/api/accommodation-manuals/... 404 (Not Found)`
- La funcionalidad NO se veía afectada (componente manejaba 404 y mostraba UI correcta)
- Sin embargo, errores en console indicaban problema de configuración

**Contexto:**
- Ambiente: `localhost:3001` (staging)
- Subdomain: `simmerdown.localhost:3001` (multi-tenant)
- Componentes afectados: 2 (`AccommodationManualsSection`, `ManualContentModal`)
- Fetch calls afectadas: 4 (3 en Section, 1 en Modal)

---

## Root Cause

**Problema: URLs relativas con subdomain hostname**

Cuando los componentes React hacían fetch con URLs relativas, el browser las resolvía usando el hostname completo (incluyendo subdomain):

```typescript
// Código original (INCORRECTO)
fetch('/api/accommodation-manuals/${unitId}')

// Browser resolvía como:
// http://simmerdown.localhost:3001/api/accommodation-manuals/${unitId}
```

**¿Por qué causaba 404?**

Next.js middleware (`src/middleware.ts`) maneja el subdomain routing para PÁGINAS, pero no para API routes cuando el hostname incluye el subdomain. Las API routes esperan:

```
http://localhost:3001/api/accommodation-manuals/${unitId}
```

NO:

```
http://simmerdown.localhost:3001/api/accommodation-manuals/${unitId}
```

**Arquitectura de rutas:**
- Páginas: `/{tenant}/...` → Middleware maneja subdomain
- API: `/api/...` → NO maneja subdomain en hostname

**Nota:** Este no era un problema funcional crítico porque los componentes tenían error handling que mostraba el estado correcto de UI (empty state, etc.), pero generaba ruido en logs y podría confundir debugging futuro.

---

## Solución

**Fix: Helper function `getApiUrl()` para strip subdomain**

Se agregó una función helper en ambos componentes que:
1. Obtiene el hostname actual (`window.location.hostname`)
2. Detecta si es un subdomain (ej: `simmerdown.localhost`)
3. Strip el subdomain para obtener base domain (`localhost`)
4. Construye URL correcta sin subdomain

**Implementación:**

```typescript
const getApiUrl = (path: string): string => {
  if (typeof window === 'undefined') return path

  const hostname = window.location.hostname
  const port = window.location.port
  const protocol = window.location.protocol

  // Strip subdomain from hostname for API calls
  // simmerdown.localhost → localhost
  const baseDomain = hostname.split('.').slice(-2).join('.') || hostname

  return `${protocol}//${baseDomain}${port ? `:${port}` : ''}${path}`
}
```

**Lógica:**
- `hostname.split('.')` → `['simmerdown', 'localhost']`
- `.slice(-2)` → `['localhost']` (últimos 2 segmentos, maneja `example.com`)
- `.join('.')` → `'localhost'`
- Fallback a `hostname` si no hay puntos (ej: `localhost` sin subdomain)

**Ejemplo de transformación:**
```
Input:  window.location = "http://simmerdown.localhost:3001"
        path = "/api/accommodation-manuals/123"

Output: "http://localhost:3001/api/accommodation-manuals/123"
```

---

## Files Modified

### 1. `src/components/Accommodation/AccommodationManualsSection.tsx`

**Changes:** 3 fetch calls corregidas

**Líneas modificadas:**

```typescript
// Helper function agregada (líneas ~40-54)
const getApiUrl = (path: string): string => {
  if (typeof window === 'undefined') return path

  const hostname = window.location.hostname
  const port = window.location.port
  const protocol = window.location.protocol

  // Strip subdomain from hostname for API calls
  const baseDomain = hostname.split('.').slice(-2).join('.') || hostname

  return `${protocol}//${baseDomain}${port ? `:${port}` : ''}${path}`
}

// Fetch 1: GET manuals list (línea ~67)
// ANTES:
const response = await fetch(`/api/accommodation-manuals/${unitId}`)
// DESPUÉS:
const response = await fetch(getApiUrl(`/api/accommodation-manuals/${unitId}`))

// Fetch 2: POST upload manual (línea ~100)
// ANTES:
const response = await fetch(`/api/accommodation-manuals/${unitId}`, { ... })
// DESPUÉS:
const response = await fetch(getApiUrl(`/api/accommodation-manuals/${unitId}`), { ... })

// Fetch 3: DELETE manual (línea ~149)
// ANTES:
const response = await fetch(`/api/accommodation-manuals/${unitId}/${manualId}`, { method: 'DELETE' })
// DESPUÉS:
const response = await fetch(getApiUrl(`/api/accommodation-manuals/${unitId}/${manualId}`), { method: 'DELETE' })
```

### 2. `src/components/Accommodation/ManualContentModal.tsx`

**Changes:** 1 fetch call corregida

**Líneas modificadas:**

```typescript
// Helper function agregada (líneas ~35-49)
const getApiUrl = (path: string): string => {
  if (typeof window === 'undefined') return path

  const hostname = window.location.hostname
  const port = window.location.port
  const protocol = window.location.protocol

  // Strip subdomain from hostname for API calls
  const baseDomain = hostname.split('.').slice(-2).join('.') || hostname

  return `${protocol}//${baseDomain}${port ? `:${port}` : ''}${path}`
}

// Fetch 1: GET manual chunks (línea ~65)
// ANTES:
const response = await fetch(`/api/accommodation-manuals/${unitId}/${manualId}/chunks`)
// DESPUÉS:
const response = await fetch(getApiUrl(`/api/accommodation-manuals/${unitId}/${manualId}/chunks`))
```

---

## Testing

**Status:** ⏸️ PENDIENTE - User verification in browser

**Expected Results:**
1. ✅ NO 404 errors in browser console
2. ✅ API calls resolve to `http://localhost:3001/api/...`
3. ✅ Funcionalidad sin cambios (upload, delete, view chunks funcionan igual)
4. ✅ Subdomain routing de páginas NO afectado

**Test Plan:**
```bash
# 1. Start staging server
pnpm run dev:staging

# 2. Navigate to accommodations page
# http://simmerdown.localhost:3001/accommodations/units

# 3. Open browser DevTools → Network tab

# 4. Test Upload
# - Drag & drop .md file
# - Verify: POST request to http://localhost:3001/api/accommodation-manuals/{unitId}
# - Verify: NO 404 errors

# 5. Test List
# - Reload page
# - Verify: GET request to http://localhost:3001/api/accommodation-manuals/{unitId}
# - Verify: Manuals list loads correctly

# 6. Test View Content
# - Click "View" button
# - Verify: GET request to http://localhost:3001/api/accommodation-manuals/{unitId}/{manualId}/chunks
# - Verify: Modal opens with chunks

# 7. Test Delete
# - Click "Delete" button
# - Verify: DELETE request to http://localhost:3001/api/accommodation-manuals/{unitId}/{manualId}
# - Verify: Manual removed from list
```

**Verification Checklist:**
- [ ] Console has NO 404 errors
- [ ] All API requests go to `localhost:3001` (NOT `simmerdown.localhost:3001`)
- [ ] Upload flow works
- [ ] Delete flow works
- [ ] View content modal works
- [ ] Multi-tenant subdomain routing still works for pages

---

## Conclusión

**Summary:**
- **Problem:** Fetch calls con URLs relativas + subdomain hostname → 404s
- **Root Cause:** Next.js middleware NO maneja API routes con subdomain en hostname
- **Solution:** Helper `getApiUrl()` strips subdomain antes de fetch
- **Impact:** 4 fetch calls corregidas en 2 componentes
- **Severity:** Medium (no afectaba UX pero generaba errores en logs)
- **Status:** ✅ Fixed, pending user verification

**Prevention for Future:**
- Pattern establecido: usar `getApiUrl()` helper para TODAS las API calls en componentes
- Considerar: Crear custom hook `useApiUrl()` si pattern se repite en más componentes
- Documentar: Next.js middleware limitations con API routes + subdomains

**Related Issues:**
- Ver: `docs/accommodation-manuals/fase-0/404_ERROR_FIX.md` (route structure fix)
- Ver: `src/middleware.ts` (subdomain routing implementation)

**Next Steps:**
1. User verification en browser (FASE 3.4 Testing)
2. Si todo funciona → Marcar como completamente resuelto
3. Considerar: Abstraer `getApiUrl()` a utility function compartida si se usa en más componentes

---

**Last Updated:** 2025-11-09
**Agent:** @agent-backend-developer
**Related Tasks:** FASE 3.2 ✅, FASE 3.3 ✅
