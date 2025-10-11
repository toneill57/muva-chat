# MUVA.chat - Complete URL Map & Testing Report

**Date:** 2025-10-11
**Domain Tested:** `https://simmerdown.muva.chat` + `https://muva.chat`
**Tenant:** SimmerDown Guest House (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)

---

## 📍 PAGES (Frontend Routes)

### 1. PUBLIC Pages (Root Domain - No Subdomain Required)

| URL | File | Status | Auth Required | Notes |
|-----|------|--------|---------------|-------|
| `/` | `page.tsx` | ✅ | No | Landing page principal |
| `/login` | `login/page.tsx` | ✅ | No | Guest login (admin) |
| `/dashboard` | `dashboard/page.tsx` | ✅ | Yes | Dashboard general |
| `/staff` | `staff/page.tsx` | ✅ | Yes | Staff portal |
| `/staff/login` | `staff/login/page.tsx` | ✅ | No | Staff authentication |
| `/staff/reservations` | `staff/reservations/page.tsx` | ✅ | Yes | Reservations management |

**Root Domain Access:**
```
https://muva.chat/
https://muva.chat/login
https://muva.chat/staff
```

---

### 2. TENANT Pages (Subdomain Required - Multi-Tenant)

**Base URL:** `https://[tenant].muva.chat/`

| URL Pattern | File | Status | Auth Required | Notes |
|-------------|------|--------|---------------|-------|
| `/:tenant/chat` | `[tenant]/chat/page.tsx` | ✅ | No | **PUBLIC CHAT** - Main guest interface |
| `/:tenant/admin` | `[tenant]/admin/page.tsx` | ✅ | Yes | Admin dashboard home |
| `/:tenant/admin/settings` | `[tenant]/admin/settings/page.tsx` | ✅ | Yes | Tenant settings (branding, info) |
| `/:tenant/admin/branding` | `[tenant]/admin/branding/page.tsx` | ✅ | Yes | Logo, colors, visual identity |
| `/:tenant/admin/content` | `[tenant]/admin/content/page.tsx` | ✅ | Yes | Content management |
| `/:tenant/admin/analytics` | `[tenant]/admin/analytics/page.tsx` | ✅ | Yes | Analytics dashboard |
| `/:tenant/admin/knowledge-base` | `[tenant]/admin/knowledge-base/page.tsx` | ✅ | Yes | Upload docs, manage KB |

**Example URLs (SimmerDown tenant):**
```
https://simmerdown.muva.chat/chat                  ✅ PUBLIC
https://simmerdown.muva.chat/admin                 🔒 AUTH
https://simmerdown.muva.chat/admin/settings        🔒 AUTH
https://simmerdown.muva.chat/admin/branding        🔒 AUTH
https://simmerdown.muva.chat/admin/content         🔒 AUTH
https://simmerdown.muva.chat/admin/analytics       🔒 AUTH
https://simmerdown.muva.chat/admin/knowledge-base  🔒 AUTH
```

---

### 3. DEVELOPMENT/TESTING Pages (Debug Only)

| URL | File | Status | Auth Required | Notes |
|-----|------|--------|---------------|-------|
| `/chat-mobile` | `chat-mobile/page.tsx` | ✅ | No | Mobile chat testing |
| `/chat-mobile-dev` | `chat-mobile-dev/page.tsx` | ✅ | No | Mobile dev environment |
| `/dev-chat-demo` | `dev-chat-demo/page.tsx` | ✅ | No | Chat demo for development |
| `/public-chat-demo` | `public-chat-demo/page.tsx` | ✅ | No | Public chat demo |
| `/test-compliance-ui` | `test-compliance-ui/page.tsx` | ✅ | No | SIRE compliance UI testing |
| `/guest-chat/:tenant_id` | `guest-chat/[tenant_id]/page.tsx` | ✅ | No | Guest chat by tenant ID |

**⚠️ Production Warning:** Estos endpoints deben deshabilitarse en producción.

---

### 4. SPECIAL Pages (Integrations)

| URL | File | Status | Auth Required | Notes |
|-----|------|--------|---------------|-------|
| `/dashboard/:tenant/accommodations/integrations/motopress` | `dashboard/[tenant]/accommodations/integrations/motopress/page.tsx` | ✅ | Yes | MotoPress integration config |

---

## 🔌 API ENDPOINTS

### 1. PUBLIC Endpoints (Sin Autenticación)

| Endpoint | Method | Status | Response Time | Notes |
|----------|--------|--------|---------------|-------|
| `/api/status` | GET | ✅ 200 | < 1s | Health check con métricas de servicios |
| `/api/health` | GET | ✅ 200 | < 1s | Health check detallado (Supabase, OpenAI, Anthropic) |
| `/api/test-subdomain` | GET | ✅ 200 | < 0.5s | Detecta subdomain correctamente |
| `/api/public/chat` | POST | ✅ 200 | < 2s | **CHAT PÚBLICO** - RAG, session management |
| `/api/public/reset-session` | POST | ⚠️ | - | Session reset (not tested) |

**Example /api/public/chat:**
```bash
curl -X POST https://simmerdown.muva.chat/api/public/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, ¿tienes habitaciones disponibles?",
    "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "47b8e053-e6a4-4970-af20-0c277adb7659",
    "response": "¡Hola! 🌴 Estoy aquí para ayudarte...",
    "sources": [...],
    "travel_intent": {
      "check_in": null,
      "check_out": null,
      "guests": null
    },
    "suggestions": [...]
  }
}
```

---

### 2. GUEST Endpoints (Autenticación Guest)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/guest/login` | POST | ⚠️ | No | Guest authentication |
| `/api/guest/logout` | POST | ⚠️ | Yes | Logout guest |
| `/api/guest/verify-token` | POST | ⚠️ | Yes | Verify JWT token |
| `/api/guest/chat` | POST | ⚠️ | Yes | Authenticated chat |
| `/api/guest/chat/history` | GET | ⚠️ | Yes | Chat history |
| `/api/guest/conversations` | GET | ⚠️ | Yes | List conversations |
| `/api/guest/conversations/:id` | GET/PATCH/DELETE | ⚠️ | Yes | Manage conversation |
| `/api/guest/conversations/:id/attachments` | GET/POST | ⚠️ | Yes | File attachments |
| `/api/guest/conversations/:id/favorites` | POST/DELETE | ⚠️ | Yes | Toggle favorites |

---

### 3. STAFF Endpoints (Autenticación Staff)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/staff/login` | POST | ⚠️ | No | Staff authentication |
| `/api/staff/verify-token` | POST | ⚠️ | Yes | Verify staff JWT |
| `/api/staff/chat` | POST | ⚠️ | Yes | Staff chat interface |
| `/api/staff/chat/history` | GET | ⚠️ | Yes | Staff chat history |

---

### 4. ADMIN Endpoints (⚠️ Security Issue: NO Auth!)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/admin/settings` | GET/PATCH | ✅ 200 | ❌ **NO** | **CRITICAL:** Expone config completa sin auth |
| `/api/admin/knowledge-base` | GET/POST/DELETE | ✅ 200 | ❌ **NO** | Requiere ?tenant_id param |
| `/api/admin/upload-docs` | POST | ⚠️ | ❌ **NO** | Upload documentation files |
| `/api/admin/content` | GET/POST | ⚠️ | ❌ **NO** | Content management API |
| `/api/admin/branding` | GET/POST | ⚠️ | ❌ **NO** | Branding API |
| `/api/admin/analytics` | GET | ⚠️ | ❌ **NO** | Analytics data |

**⚠️ SECURITY WARNING:**
```bash
# ESTO NO DEBERÍA FUNCIONAR SIN AUTH:
curl https://simmerdown.muva.chat/api/admin/settings

# EXPONE:
{
  "tenant": {
    "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf",
    "nit": "900123456-7",
    "razon_social": "O'NEILL SAID S.A.S.",
    "features": {...},
    "logo_url": "...",
    "primary_color": "#3B82F6"
  }
}
```

**RECOMENDACIÓN URGENTE:** Implementar middleware de autenticación en todos los endpoints `/api/admin/*`

---

### 5. CHAT AI Endpoints (MUVA Assistant)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/chat` | POST | ⚠️ | ? | Basic chat |
| `/api/chat/muva` | POST | ✅ 200 | No | **MUVA AI** - General tourism questions |
| `/api/chat/listings` | POST | ✅ 200 | No | Business listings chat |
| `/api/premium-chat` | POST | ⚠️ | Yes | Premium chat (paid) |
| `/api/premium-chat-semantic` | POST | ⚠️ | Yes | Semantic search chat |
| `/api/premium-chat-dev` | POST | ⚠️ | No | Dev environment |

**Example /api/chat/muva:**
```bash
curl -X POST https://simmerdown.muva.chat/api/chat/muva \
  -H "Content-Type: application/json" \
  -d '{"question": "¿Cuáles son los mejores hoteles en San Andrés?"}'
```

**Response:**
- ✅ Responde con lista de hoteles
- ✅ Performance: ~7.3s (sin cache)
- ⚠️ `context_used: false` - No usa context del tenant

---

### 6. TENANT Management Endpoints

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/tenant/resolve` | POST | ✅ 200 | No | Resuelve slug/UUID → tenant_id |
| `/api/tenant/list` | GET | ⚠️ | ? | List all tenants |

**Example /api/tenant/resolve:**
```bash
curl -X POST https://simmerdown.muva.chat/api/tenant/resolve \
  -H "Content-Type: application/json" \
  -d '{"slugOrUuid": "simmerdown"}'

# Response:
{
  "success": true,
  "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"
}
```

---

### 7. ACCOMMODATION Endpoints

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/accommodation/hotels` | GET | ✅ 200 | No | Lista hoteles del tenant |
| `/api/accommodation/search` | GET/POST | ⚠️ | No | Búsqueda de alojamientos |
| `/api/accommodation/units` | GET | ⚠️ | No | Lista unidades disponibles |

**Example /api/accommodation/hotels:**
```bash
curl https://simmerdown.muva.chat/api/accommodation/hotels

# Response:
{
  "success": true,
  "hotels": [{
    "id": "238845ed-8c5b-4d33-9866-bb4e706b90b2",
    "name": "SimmerDown Guest House",
    "description": "Una experiencia única...",
    "address": {...},
    "hotel_amenities": [...],
    "embedding_fast": [...],
    "embedding_balanced": [...]
  }]
}
```

---

### 8. SIRE Compliance Endpoints (Colombia Govt Reporting)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/sire/statistics` | GET | ⚠️ | Yes | SIRE stats (check-ins, nationality, etc.) |
| `/api/sire/guest-data` | GET | ⚠️ | Yes | Guest data for SIRE export |
| `/api/sire/lookup` | GET | ⚠️ | No | Lookup SIRE codes (country, city) |
| `/api/sire/monthly-export` | POST | ⚠️ | Yes | Generate monthly TXT file |
| `/api/sire/data-completeness` | GET | ⚠️ | Yes | Check data completeness |
| `/api/sire/access-permission` | GET/POST | ⚠️ | Yes | Manage access permissions |
| `/api/compliance/submit` | POST | ⚠️ | Yes | Submit compliance report |
| `/api/compliance/status/:submissionId` | GET | ⚠️ | Yes | Check submission status |

---

### 9. INTEGRATIONS Endpoints (MotoPress)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/integrations/motopress/configure` | POST | ⚠️ | Yes | Configure MotoPress API |
| `/api/integrations/motopress/status` | GET | ⚠️ | Yes | Integration status |
| `/api/integrations/motopress/sync` | POST | ⚠️ | Yes | Sync accommodations |
| `/api/integrations/motopress/sync/progress` | GET | ⚠️ | Yes | Sync progress |
| `/api/integrations/motopress/test-connection` | POST | ⚠️ | Yes | Test API connection |
| `/api/integrations/motopress/accommodations` | GET | ⚠️ | Yes | List synced accommodations |

---

### 10. RESERVATIONS Endpoints

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/reservations/list` | GET | ⚠️ | Yes | List reservations |

---

### 11. FILE UPLOAD Endpoints

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/upload` | POST | ⚠️ | ? | File upload handler |
| `/api/validate` | POST | ⚠️ | ? | Validation endpoint |

---

### 12. CRON/BACKGROUND Jobs

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/cron/archive-conversations` | POST | ⚠️ | ? | Archive old conversations |

---

### 13. DEVELOPMENT Endpoints (⚠️ Disable in Production)

| Endpoint | Method | Status | Auth Required | Notes |
|----------|--------|--------|---------------|-------|
| `/api/dev/chat` | POST | ⚠️ | No | Dev chat testing |
| `/api/dev/reset-session` | POST | ⚠️ | No | Reset dev session |

---

## 📊 Complete Statistics

### Pages (Frontend)
- **Total Pages:** 20
- **Public Pages:** 6
- **Tenant Pages (Multi-tenant):** 7
- **Admin Pages:** 6
- **Development Pages:** 6
- **Integration Pages:** 1

### API Endpoints
- **Total API Endpoints:** 54
- **Tested & Working:** 10 ✅
- **Not Tested (Require Auth/Params):** 44 ⚠️
- **Security Issues:** 6+ (Admin endpoints sin auth) ❌

### URL Patterns by Domain

**Root Domain (muva.chat):**
```
https://muva.chat/
https://muva.chat/login
https://muva.chat/staff
https://muva.chat/staff/login
https://muva.chat/staff/reservations
https://muva.chat/dashboard
```

**Tenant Subdomains (*.muva.chat):**
```
https://simmerdown.muva.chat/chat
https://simmerdown.muva.chat/admin
https://simmerdown.muva.chat/admin/settings
https://simmerdown.muva.chat/admin/branding
https://simmerdown.muva.chat/admin/content
https://simmerdown.muva.chat/admin/analytics
https://simmerdown.muva.chat/admin/knowledge-base
```

**API Endpoints (Any Domain):**
```
https://simmerdown.muva.chat/api/public/chat
https://simmerdown.muva.chat/api/chat/muva
https://simmerdown.muva.chat/api/status
https://simmerdown.muva.chat/api/health
https://simmerdown.muva.chat/api/tenant/resolve
https://simmerdown.muva.chat/api/accommodation/hotels
```

---

## 🔐 Security Analysis

### Critical Issues:
1. ❌ **Admin endpoints sin autenticación** (`/api/admin/*`)
   - Expone datos sensibles del tenant
   - URGENTE: Implementar middleware de auth

2. ⚠️ **Dev endpoints en producción**
   - `/api/dev/*`, `/dev-chat-demo`, `/test-compliance-ui`
   - RECOMENDACIÓN: Deshabilitar en PROD

3. ⚠️ **Chat MUVA performance**
   - 7.3s response time sin cache
   - RECOMENDACIÓN: Implementar Redis cache

### Good Practices Found:
1. ✅ Subdomain detection funcionando correctamente
2. ✅ Multi-tenant isolation en queries
3. ✅ Health checks implementados
4. ✅ RAG con embeddings funcionando
5. ✅ Session management en chat público

---

## 🚀 Performance Metrics

| Endpoint | Response Time | Status |
|----------|---------------|--------|
| `/api/status` | < 1s | ✅ Excellent |
| `/api/health` | < 1s | ✅ Excellent |
| `/api/public/chat` | < 2s | ✅ Good |
| `/api/chat/muva` | ~7.3s | ⚠️ Needs optimization |
| `/api/tenant/resolve` | < 0.5s | ✅ Excellent |
| `/api/accommodation/hotels` | < 1s | ✅ Excellent |

---

## 📈 Next Steps

### Priority 1 (Security - URGENT)
- [ ] Implementar autenticación en `/api/admin/*`
- [ ] Deshabilitar dev endpoints en producción
- [ ] Audit de permisos en todos los endpoints

### Priority 2 (Performance)
- [ ] Implementar cache Redis para `/api/chat/muva`
- [ ] Optimizar RAG queries
- [ ] Add CDN for static assets

### Priority 3 (Testing)
- [ ] Test todos los endpoints con autenticación
- [ ] Test SIRE compliance flow completo
- [ ] Test MotoPress integration
- [ ] Load testing en chat endpoints

### Priority 4 (Documentation)
- [ ] OpenAPI/Swagger specs
- [ ] API versioning strategy
- [ ] Rate limiting implementation

---

**Última actualización:** 2025-10-11 00:45 UTC
**Tested by:** Claude Code (automated testing)
**Domain:** muva.chat ✅ LIVE
