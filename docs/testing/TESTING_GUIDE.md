# 🧪 Guía Rápida de Testing - Sistema de Seguridad Guest Chat

**Última actualización:** 01 de Octubre, 2025
**Sistema:** Guest Chat Multi-Level Security
**Estado:** ✅ READY FOR TESTING

---

## 🚀 Quick Start (30 segundos)

### Opción más rápida: Script automatizado

```bash
# 1. Asegúrate que el dev server esté corriendo
npm run dev

# 2. En otra terminal, ejecuta los tests
npx tsx test-guest-chat-security.ts
```

**Resultado esperado:** 🎉 `5/5 tests PASSED`

---

## 📋 Opciones de Testing

### 1️⃣ Testing Automatizado E2E (Recomendado)

**Tiempo:** ~30 segundos

```bash
npx tsx test-guest-chat-security.ts
```

**Qué valida:**
- ✅ Guest solo ve SU habitación (Suite Ocean View #101)
- ✅ Guest NO puede ver otras habitaciones
- ✅ PREMIUM tier tiene acceso MUVA (dive shops, precios)
- ✅ FREE tier NO tiene acceso MUVA (sugiere recepción)
- ✅ Auth rechazado si guest_chat_enabled = false

**Output exitoso:**
```
═══════════════════════════════════════════════════════════
  GUEST CHAT SECURITY SYSTEM - E2E TESTING (FASE 5)
═══════════════════════════════════════════════════════════

🧪 TEST 1: Guest asks about THEIR room
  ✅ PASS (6.6s)

🧪 TEST 2: Guest asks about OTHER rooms
  ✅ PASS (5.8s)

🧪 TEST 3: PREMIUM with MUVA access
  ✅ PASS (8.4s)

🧪 TEST 4: FREE tier without MUVA
  ✅ PASS (6.1s)

🧪 TEST 5: FREE tier without guest_chat_enabled
  ✅ PASS (<0.1s)

RESULTS: 5/5 passed, 0/5 failed
🎉 ALL TESTS PASSED! System is secure and ready for deployment.
```

---

### 2️⃣ Testing Manual con API

**Tiempo:** ~5 minutos

#### Step 1: Login como guest PREMIUM

```bash
curl -X POST http://localhost:3000/api/guest/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
    "check_in_date": "2025-10-05",
    "phone_last_4": "1234"
  }'
```

**Response esperado:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "guest_name": "Test Guest",
  "accommodation_unit": {
    "id": "43ff96da-dbef-4757-88e5-31f7618edd33",
    "name": "Suite Ocean View",
    "unit_number": "101"
  },
  "tenant_features": {
    "guest_chat_enabled": true,
    "muva_access": true,
    "premium_chat": true
  },
  "conversation_id": "08bec433-bea4-431a-a6fd-58387a76fedb"
}
```

**Copiar:**
- ✅ `token` para siguientes requests
- ✅ `conversation_id` para el chat

---

#### Step 2: Test pregunta sobre SU habitación

```bash
# Reemplazar <TOKEN> y <CONVERSATION_ID> con valores del login
curl -X POST http://localhost:3000/api/guest/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "conversation_id": "<CONVERSATION_ID>",
    "message": "¿Mi suite tiene terraza?"
  }'
```

**Validar response:**
- ✅ Menciona "Suite Ocean View #101"
- ✅ NO menciona otras habitaciones
- ✅ Responde sobre la terraza específicamente

---

#### Step 3: Test pregunta sobre OTRAS habitaciones

```bash
curl -X POST http://localhost:3000/api/guest/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "conversation_id": "<CONVERSATION_ID>",
    "message": "¿Cuáles apartamentos tienen 3 habitaciones?"
  }'
```

**Validar response:**
- ✅ Solo menciona SU suite asignada
- ✅ NO lista otros apartamentos
- ✅ Puede sugerir contactar recepción

---

#### Step 4: Test MUVA access (PREMIUM)

```bash
curl -X POST http://localhost:3000/api/guest/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "conversation_id": "<CONVERSATION_ID>",
    "message": "¿Dónde puedo bucear cerca del hotel?"
  }'
```

**Validar response:**
- ✅ Incluye nombres de dive shops (Buconos Diving, Hans Dive Shop)
- ✅ Incluye precios (ejemplo: $160,000 COP)
- ✅ Incluye teléfonos de contacto (+57 320...)

---

#### Step 5: Test FREE tier (sin MUVA)

```bash
# Login como FREE guest
curl -X POST http://localhost:3000/api/guest/login \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "11111111-2222-3333-4444-555555555555",
    "check_in_date": "2025-10-10",
    "phone_last_4": "9999"
  }'

# Copiar nuevo token y conversation_id

# Preguntar sobre turismo
curl -X POST http://localhost:3000/api/guest/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "conversation_id": "<CONVERSATION_ID>",
    "message": "¿Dónde puedo bucear?"
  }'
```

**Validar response:**
- ✅ Sugiere contactar recepción
- ✅ NO incluye nombres de dive shops
- ✅ NO incluye precios ni contactos

---

### 3️⃣ Testing en Navegador (UI)

**Tiempo:** ~3 minutos

#### Setup

```bash
# Iniciar dev server
npm run dev

# Abrir en navegador
open http://localhost:3000/guest-chat/simmerdown
```

#### Login

- **Check-in date:** `2025-10-05`
- **Últimos 4 dígitos teléfono:** `1234`
- Click "Iniciar sesión"

#### Tests a ejecutar

| # | Query | Resultado Esperado |
|---|-------|-------------------|
| 1 | "¿Mi suite tiene terraza?" | ✅ Responde sobre Suite Ocean View #101 con terraza |
| 2 | "¿Cuáles apartamentos tienen 3 habitaciones?" | ✅ Solo menciona su suite, no lista otros |
| 3 | "¿Dónde puedo bucear cerca?" | ✅ Muestra dive shops con precios y contactos |
| 4 | "Cuéntame sobre la suite deluxe" | ✅ Solo habla de su Suite Ocean View |

#### Verificar Console Logs (DevTools)

Abrir DevTools (F12) → Console

**Logs esperados:**
```javascript
[Guest Chat] Chat request: {
  timestamp: "2025-10-01T02:20:00.000Z",
  guest: "Test Guest",
  tenant: "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
  accommodation: "Suite Ocean View",
  features: {
    guest_chat_enabled: true,
    muva_access: true,
    premium_chat: true
  }
}

[Chat Engine] Guest permissions: {
  muva_access: true,
  guest_chat_enabled: true
}

[Chat Engine] 🌴 MUVA access granted, searching tourism content

[Chat Engine] Vector search completed: {
  accommodation: 1,
  tourism: 3,
  duration: 245
}
```

---

### 4️⃣ Verificación en Database

**Tiempo:** ~2 minutos

#### Consultar configuración de tenants

```sql
-- PREMIUM tenant (Simmerdown)
SELECT
  slug,
  subscription_tier,
  features
FROM tenant_registry
WHERE slug = 'simmerdown';

-- Expected:
-- subscription_tier: "premium"
-- features: {"guest_chat_enabled": true, "muva_access": true, "premium_chat": true}
```

```sql
-- FREE tenant
SELECT
  slug,
  subscription_tier,
  features
FROM tenant_registry
WHERE slug = 'free-hotel-test';

-- Expected:
-- subscription_tier: "free"
-- features: {"guest_chat_enabled": true, "muva_access": false, "premium_chat": false}
```

#### Verificar reservas activas

```sql
SELECT
  gr.guest_name,
  gr.check_in_date,
  gr.phone_last_4,
  au.name as accommodation,
  tr.subscription_tier,
  tr.features
FROM guest_reservations gr
LEFT JOIN accommodation_units au ON gr.accommodation_unit_id = au.id
LEFT JOIN tenant_registry tr ON gr.tenant_id = tr.tenant_id::varchar
WHERE gr.status = 'active'
ORDER BY gr.check_in_date DESC;
```

**Expected results:**
| guest_name | check_in_date | phone_last_4 | accommodation | subscription_tier |
|------------|---------------|--------------|---------------|-------------------|
| Test Guest | 2025-10-05 | 1234 | Suite Ocean View | premium |
| Free Test Guest | 2025-10-10 | 9999 | Standard Room | free |

---

### 5️⃣ Unit Tests

**Tiempo:** ~10 segundos

```bash
# Guest authentication tests (25 tests)
pnpm test -- src/lib/__tests__/guest-auth.test.ts

# Chat engine tests (12 tests)
pnpm test -- src/lib/__tests__/conversational-chat-engine.test.ts

# Todos los tests juntos
pnpm test -- src/lib/__tests__/
```

**Expected output:**
```
PASS  src/lib/__tests__/guest-auth.test.ts
  ✓ should create guest session with valid credentials (142 ms)
  ✓ should include tenant_features in session (89 ms)
  ✓ should reject auth if guest_chat_enabled = false (52 ms)
  ... (22 more tests)

PASS  src/lib/__tests__/conversational-chat-engine.test.ts
  ✓ should filter accommodation by guest unit (178 ms)
  ✓ should skip MUVA search if no permission (124 ms)
  ✓ should include MUVA if permission granted (256 ms)
  ... (9 more tests)

Test Suites: 2 passed, 2 total
Tests:       37 passed, 37 total
Snapshots:   0 total
Time:        4.231 s
```

---

## 🔍 Troubleshooting

### Problema: Tests fallan con error de conexión

**Solución:**
```bash
# Verificar que dev server esté corriendo
npm run dev

# Verificar puerto 3000 disponible
lsof -i :3000

# Si hay otro proceso, matarlo
kill -9 <PID>
```

---

### Problema: Login retorna error 401

**Posibles causas:**
1. Credenciales incorrectas
2. Reserva no existe o no está activa
3. guest_chat_enabled = false

**Verificar:**
```sql
SELECT * FROM guest_reservations
WHERE phone_last_4 = '1234'
  AND check_in_date = '2025-10-05'
  AND status = 'active';
```

---

### Problema: Response no incluye MUVA content

**Verificar tenant features:**
```sql
SELECT features->>'muva_access' as muva_access
FROM tenant_registry
WHERE slug = 'simmerdown';
-- Should return: true
```

**Verificar console logs:**
```
[Chat Engine] ⛔ MUVA access denied (free tier)
```

Si ves este log, el tenant no tiene `muva_access = true`.

---

### Problema: Guest ve información de otras habitaciones

**🚨 SECURITY BREACH**

**Verificar:**
1. Console logs muestran filtrado:
   ```
   [Chat Engine] 🔒 Filtered out accommodation: Other Room (not guest unit)
   ```
2. Code en `conversational-chat-engine.ts:341-357` está correcto
3. `guestSession.accommodation_unit.id` tiene valor

**Debug:**
```bash
# Agregar console.log en searchAccommodation()
console.log('Guest unit ID:', guestSession.accommodation_unit?.id)
console.log('Vector search results:', data)
console.log('Filtered results:', filteredData)
```

---

## 📊 Success Criteria

### ✅ Tests pasan si:

1. **Test 1:** Response menciona "Suite Ocean View", NO otras habitaciones
2. **Test 2:** Response rechaza request sobre otros apartamentos
3. **Test 3:** PREMIUM muestra dive shops con precios y contactos
4. **Test 4:** FREE sugiere recepción, SIN dive shops ni precios
5. **Test 5:** Auth rejection logic implementado correctamente

### ✅ Sistema seguro si:

- Guest solo ve SU accommodation unit
- MUVA access solo en tier PREMIUM
- Console logs muestran permisos correctos
- No hay bypass de filtros de seguridad
- Performance < 10s por request

---

## 🚀 Next Steps

**Después de validar todos los tests:**

1. ✅ **Commit cambios:**
   ```bash
   git add .
   git commit -m "feat: implement multi-level security system for guest chat

   - Add tenant feature flags (subscription_tier, features JSONB)
   - Implement permission inheritance in guest auth
   - Add security filtering in vector search (accommodation + MUVA)
   - Dynamic system prompt based on permissions
   - Complete E2E test suite (5/5 passed)

   Security layers:
   - Database: feature flags
   - Auth: JWT with tenant_features
   - API: validation before processing
   - Vector search: filtering by permissions
   - AI: dynamic prompt restrictions"
   ```

2. 📦 **Deploy a staging:**
   ```bash
   # Ver FASE_5_TESTING_COMPLETE.md para instrucciones de deploy
   ```

3. 👀 **Monitor logs en staging:**
   - Authentication success/failures
   - MUVA access grants/denials
   - Security filter activations

4. 🎯 **Deploy a producción** (después de QA en staging)

---

**¿Preguntas?** Ver documentación completa:
- `TODO.md` - Checklist completo y guías
- `FASE_5_TESTING_COMPLETE.md` - Reporte detallado de testing
- `plan.md` - Especificaciones técnicas del sistema
