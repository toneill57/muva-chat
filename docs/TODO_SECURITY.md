# 🔒 Seguridad Pendiente: Cross-Tenant Access Prevention

## ⚠️ Problema Actual

**Estado:** No implementado
**Severidad:** Media (solo afecta en localhost development)
**Prioridad:** Baja (funciona correctamente en producción con subdominios reales)

### Descripción

Actualmente, un usuario staff puede:
1. Loguearse en `simmerdown.localhost:3000`
2. Cambiar URL a `tucasamar.localhost:3000/dashboard`
3. Acceder al dashboard del otro tenant (en localhost)

### Por qué no es urgente

- ✅ En **producción** (`*.muva.chat`), los subdominios tienen localStorage/cookies AISLADOS
- ✅ El problema SOLO ocurre en `localhost` donde todo comparte el mismo origin
- ✅ No hay riesgo de seguridad real en producción

---

## 🎯 Solución Recomendada (Opción B: Middleware)

### Implementar validación server-side en `src/middleware.ts`

**Pasos:**

1. **Cambiar de localStorage a HttpOnly cookies**
   - Modificar `/api/staff/login` para setear cookie en respuesta
   - Cookies accesibles desde middleware (server-side)

2. **Agregar validación en middleware**
   ```typescript
   // Pseudocódigo
   if (rutaProtegida && token && subdomain) {
     const payload = decodeJWT(token);
     const tenantId = await resolveSubdomainToTenantId(subdomain);

     if (payload.tenant_id !== tenantId) {
       // Clear cookie + redirect to /login
       return NextResponse.redirect('/login');
     }
   }
   ```

3. **Crear helper para decodificar JWT server-side**
   - `src/lib/jwt-decoder.ts`
   - Usar `Buffer.from()` en servidor (no `atob()`)

4. **Actualizar matcher de middleware**
   - Incluir rutas protegidas: `/dashboard`, `/settings`, `/analytics`, etc.

### Archivos a modificar

- [ ] `src/middleware.ts` - Agregar validación
- [ ] `src/lib/jwt-decoder.ts` - Crear helper
- [ ] `src/app/api/staff/login/route.ts` - Usar cookies
- [ ] `src/components/Staff/StaffLogin.tsx` - Leer de cookies
- [ ] `src/app/[tenant]/dashboard/layout.tsx` - Simplificar

---

## 📚 Referencias

- Issue relacionado: (crear issue en GitHub cuando se vaya a implementar)
- Discusión: Chat con Claude sobre localStorage vs cookies (Oct 2024)
- Alternativas evaluadas:
  - Opción A: DashboardGuard component (client-side)
  - Opción B: Middleware validation (server-side) ⭐ RECOMENDADA
  - Opción C: Page-level validation (frágil, no recomendada)

---

## 🧪 Testing cuando se implemente

**Localhost:**
1. Login en `simmerdown.localhost:3000`
2. Cambiar a `tucasamar.localhost:3000/dashboard`
3. ✅ Debería redirigir a `/login` y limpiar cookie

**Producción:**
1. Login en `simmerdown.muva.chat`
2. Abrir `tucasamar.muva.chat` en nueva pestaña
3. ✅ Debería pedir login (cookies aisladas)

---

## 📅 Fecha de creación
18 de octubre de 2024

## 👤 Asignado
Pendiente

## 🏷️ Labels
- `security`
- `enhancement`
- `low-priority`
- `multi-tenant`
