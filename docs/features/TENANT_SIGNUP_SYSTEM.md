# Tenant Sign-Up System

**Self-Service Tenant Onboarding for MUVA Multi-Tenant Platform**

Sistema automatizado que permite a nuevos clientes (hoteles, hostales, apartamentos) registrarse en la plataforma MUVA sin intervención manual.

---

## 📋 Overview

### ¿Qué es?

Un flujo completo de registro que permite a nuevos negocios turísticos crear su propia cuenta MUVA en minutos, con:

- ✅ Formulario wizard de 5 pasos
- ✅ Validación de subdomain en tiempo real
- ✅ Creación automática de base de datos (tenant, hotel, admin user, integrations)
- ✅ Activación inmediata (no requiere aprobación manual)
- ✅ Tier Premium por defecto

### ¿Por qué?

**Antes:**
- O'Neill tenía que crear manualmente cada tenant
- Proceso lento, propenso a errores
- Cliente esperaba días para empezar

**Ahora:**
- Cliente se registra en 3-5 minutos
- Acceso inmediato al dashboard
- 100% automatizado, sin errores

---

## 🚀 Arquitectura

### Componentes

```
/signup (UI)
   ↓
POST /api/signup (Backend)
   ↓
[Transacción Atómica]
   ├─ tenant_registry
   ├─ hotels
   ├─ staff_users (admin)
   └─ integration_configs
   ↓
/signup/success (Confirmation)
```

### Archivos Implementados

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/signup/route.ts` | API endpoint (POST/GET) |
| `src/app/signup/page.tsx` | UI formulario multi-step |
| `src/app/signup/success/page.tsx` | Página de confirmación |
| `src/lib/email/welcome-email.ts` | Email templates (HTML/text) |
| `e2e/tenant-signup.spec.ts` | Tests E2E (Playwright) |

---

## 📝 Flujo del Usuario

### Step 1: Información del Negocio

Campos requeridos:
- **Nombre Comercial** (ej: "Hotel Paradise")
- **NIT** (ej: "900123456-7")
- **Razón Social** (ej: "HOTEL PARADISE S.A.S.")
- **Tipo de Negocio** (hotel/apartamentos/hostal)

### Step 2: Subdomain & Branding

- **Subdomain** (validación en vivo)
  - Formato: `[a-z0-9-]+` (lowercase, números, guiones)
  - Disponibilidad verificada en tiempo real vía `GET /api/signup?subdomain=xxx`
  - Preview: `https://{subdomain}.muva.chat`
- **Color Primario** (opcional, default: `#3B82F6`)

### Step 3: Contacto

- **Email** (validación formato + unicidad)
- **Teléfono** (validación formato colombiano)
- **Dirección** (textarea, multi-línea)

### Step 4: Usuario Admin

- **Nombre Completo**
- **Username** (mínimo 4 caracteres, `[a-zA-Z0-9_-]+`)
- **Password** (mínimo 6 caracteres, **sin requerimientos de complejidad**)

### Step 5: Confirmación

- Review de todos los datos
- Botón "Crear Mi Cuenta"
- Submit → `POST /api/signup`

---

## 🔒 Validaciones

### Client-Side (React Form)

| Campo | Validación |
|-------|-----------|
| `subdomain` | Formato regex, disponibilidad (debounced 500ms) |
| `email` | Formato RFC 5322 |
| `phone` | Formato `^\+?[\d\s\(\)\-]+$` |
| `admin_username` | Min 4 chars, `[a-zA-Z0-9_-]+` |
| `admin_password` | Min 6 chars |

### Server-Side (API Route)

```typescript
// src/app/api/signup/route.ts

1. Validate input data (all required fields)
2. Check subdomain format (lowercase, alphanumeric, hyphens)
3. Check subdomain availability (unique in DB)
4. Check email uniqueness
5. Hash password (bcrypt)
6. Create records atomically
```

---

## 💾 Database Records Created

### 1. `tenant_registry`

```sql
INSERT INTO tenant_registry (
  nit, razon_social, nombre_comercial, subdomain,
  schema_name, tenant_type, is_active, subscription_tier,
  features, email, phone, address, business_name, slug, primary_color
) VALUES (...)
```

**Defaults:**
- `tenant_type`: `'hotel'`
- `is_active`: `true` (activación inmediata)
- `subscription_tier`: `'premium'`
- `features`: `{"muva_access": true, "premium_chat": true, ...}`
- `primary_color`: `'#3B82F6'`

### 2. `hotels`

```sql
INSERT INTO hotels (
  tenant_id, name, description, contact_info, status
) VALUES (...)
```

Hotel principal por defecto.

### 3. `staff_users`

```sql
INSERT INTO staff_users (
  tenant_id, username, password_hash, full_name, email,
  role, permissions, is_active
) VALUES (...)
```

**Defaults:**
- `role`: `'admin'`
- `permissions`: Full admin access
- `password_hash`: bcrypt (10 rounds)

### 4. `integration_configs`

```sql
INSERT INTO integration_configs (
  tenant_id, integration_type, is_active, config_data
) VALUES (tenant_id, 'motopress', false, '{}')
```

Placeholder para futura configuración MotoPress/Airbnb.

---

## 🎨 UI/UX Features

### Progress Stepper

Visual indicator de progreso (5 pasos):

```
[1] ━━ [2] ━━ [3] ━━ [4] ━━ [5]
Negocio  Subdomain  Contacto  Admin  Confirmar
```

### Real-Time Subdomain Validation

```tsx
// Debounced check (500ms)
useEffect(() => {
  const timer = setTimeout(async () => {
    const res = await fetch(`/api/signup?subdomain=${subdomain}`)
    const data = await res.json()
    setSubdomainAvailable(data.available)
  }, 500)
  return () => clearTimeout(timer)
}, [subdomain])
```

Muestra:
- ✅ "Subdomain disponible" (verde)
- ❌ "Subdomain no disponible" (rojo)
- 🔄 "Verificando disponibilidad..." (gris)

### Color Picker

Selector nativo `<input type="color">` + preview en vivo.

### Responsive Design

- Desktop: 2-column layout en Step 5 (confirmación)
- Mobile: Single column, stack vertical
- Tailwind CSS utilities

---

## 📧 Email de Bienvenida

### Template

Archivo: `src/lib/email/welcome-email.ts`

**Incluye:**
- Dashboard URL
- Username (elegido por usuario)
- Reminder de password
- Próximos pasos (5 items)
- Features del plan Premium
- Soporte (email: `support@muva.chat`)

### Implementación

```typescript
import { sendWelcomeEmail } from '@/lib/email/welcome-email'

await sendWelcomeEmail({
  tenant_name: data.nombre_comercial,
  subdomain: data.subdomain,
  admin_username: data.admin_username,
  admin_email: data.email,
  dashboard_url: `https://${data.subdomain}.muva.chat/dashboard`
})
```

**TODO:** Integrar con Resend, SendGrid o AWS SES.

---

## 🧪 Tests E2E

Archivo: `e2e/tenant-signup.spec.ts`

### Test Cases

1. **Display sign-up form**
   - Verifica que el formulario cargue
   - Stepper visible

2. **Validate required fields**
   - Intenta siguiente paso sin llenar campos
   - Muestra errores "Requerido"

3. **Navigate through all steps**
   - Completa wizard completo
   - Verifica cada step header

4. **Validate subdomain format**
   - Prueba uppercase (falla)
   - Prueba válido (pasa)

5. **Validate password length**
   - Prueba < 6 chars (falla)
   - Prueba ≥ 6 chars (pasa)

6. **Complete full signup flow**
   - De inicio a fin
   - Verifica redirect a `/signup/success`

7. **Verify database records**
   - Query `tenant_registry`, `hotels`, `staff_users`, `integration_configs`
   - Valida todos los campos

8. **Reject duplicate subdomain**
   - Intenta registrar subdomain existente
   - Verifica error 409

### Ejecutar Tests

```bash
# Run all signup tests
npx playwright test e2e/tenant-signup.spec.ts

# Run with UI
npx playwright test e2e/tenant-signup.spec.ts --ui

# Run specific test
npx playwright test -g "should complete full signup flow"
```

---

## 🔐 Security Considerations

### Password Hashing

```typescript
import bcrypt from 'bcryptjs'

const password_hash = await bcrypt.hash(password, 10) // 10 rounds
```

**No requisitos de complejidad:**
- Mínimo 6 caracteres
- Permite passwords simples (ej: "test123")
- Usuario puede cambiar después en Settings

### SQL Injection

Protegido por Supabase client (prepared statements automáticos).

### XSS

React escapa automáticamente JSX output.

### CSRF

Next.js API routes tienen protección CSRF integrada.

---

## 🚧 Limitations & Future Work

### Current Limitations

1. **No Email Sending**
   - Template HTML/text listo
   - Falta integrar Resend/SendGrid
   - Por ahora solo logs a consola

2. **No Payment Integration**
   - Tier Premium gratis para todos
   - Futuro: Stripe integration

3. **No Phone Verification**
   - Acepta cualquier teléfono válido
   - Futuro: SMS verification (Twilio)

4. **No NIT Validation**
   - Acepta cualquier formato
   - Futuro: Validar con DIAN API (Colombia)

### Roadmap

- [ ] **Email Service** (Resend integration)
- [ ] **Payment Gateway** (Stripe checkout)
- [ ] **Phone Verification** (Twilio SMS)
- [ ] **NIT Validation** (DIAN API)
- [ ] **Logo Upload** (durante signup, no después)
- [ ] **Captcha/ReCAPTCHA** (anti-spam)
- [ ] **Email Confirmation** (verify email before activation)
- [ ] **Multi-Language** (i18n: ES/EN)

---

## 📊 Analytics & Monitoring

### Metrics to Track

```typescript
// Future: Add analytics events

track('signup_started', { subdomain })
track('signup_step_completed', { step: 2 })
track('signup_failed', { error: 'subdomain_taken' })
track('signup_completed', { tenant_id, subdomain })
```

### Logs

Todos los pasos loggeados a console:

```
[signup] New signup request for subdomain: hotel-paradise
[signup] ✅ Tenant created: uuid-xxx
[signup] ✅ Default hotel created
[signup] ✅ Admin user created
[signup] ✅ Integration config created
[signup] 🎉 Signup completed successfully
```

---

## 🐛 Troubleshooting

### "Subdomain no disponible"

**Causa:** Subdomain ya existe en `tenant_registry.subdomain`

**Solución:**
1. Elegir otro subdomain
2. O eliminar tenant existente (si es test)

### "Email ya registrado"

**Causa:** Email ya existe en `tenant_registry.email`

**Solución:**
1. Usar otro email
2. O eliminar tenant existente (si es duplicado)

### "Error creando tenant"

**Causa:** Violación de constraint (NIT único, subdomain formato)

**Solución:**
1. Ver logs del servidor
2. Verificar que NIT sea único
3. Verificar que subdomain sea `[a-z0-9-]+`

### Tests fallan

**Causa:** Base de datos sucia (tenants de tests anteriores)

**Solución:**
```bash
# Cleanup test data
psql $DATABASE_URL -c "DELETE FROM tenant_registry WHERE subdomain LIKE 'test-%'"
```

---

## 📚 Referencias

- **NEW_TENANT_GUIDE.md** - Guía original de onboarding manual
- **MULTI_TENANT_ARCHITECTURE.md** - Arquitectura multi-tenant
- **Database Schema** - `src/types/supabase-database.ts`

---

## 👥 Contributors

- **O'Neill** - Initial implementation (Oct 2025)
- **Claude** - Code generation & documentation

---

**Last Updated:** October 2025
**Version:** 1.0
**Status:** ✅ Production Ready
