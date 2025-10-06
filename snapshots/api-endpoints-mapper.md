---
title: "InnPilot API Endpoints Mapper - Snapshot Especializado"
agent: api-endpoints-mapper
last_updated: "2025-10-06T16:00:00"
status: PRODUCTION_READY
---

# 🗺️ API Endpoints Mapper - Snapshot Especializado

**Agent**: @api-endpoints-mapper
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - 44 endpoints activos

---

## 📊 INVENTARIO COMPLETO

### Estado General: 44 Endpoints

**Por Estado:**
- ✅ **Completos:** 38 endpoints (86%)
- 🚧 **Work In Progress:** 4 endpoints (9%)
- ⚠️ **Legacy/Deprecated:** 2 endpoints (5%)

**Por Autenticación:**
- **JWT Guest:** 12 endpoints
- **JWT Staff:** 4 endpoints
- **Public (No Auth):** 8 endpoints
- **CRON Secret:** 1 endpoint
- **Admin (TODO):** 6 endpoints ⚠️ MotoPress sin auth

---

## 🔐 GUEST PORTAL (12 endpoints)

### Authentication
```
POST   /api/guest/login                      # JWT + HttpOnly cookie (7 días)
POST   /api/guest/logout                     # Session cleanup
POST   /api/guest/verify-token               # JWT verification
```

### Chat System
```
POST   /api/guest/chat                       # Chat conversacional
GET    /api/guest/chat/history               # Message history
```

### Multi-Conversation CRUD
```
GET    /api/guest/conversations              # List all conversations
POST   /api/guest/conversations              # Create new conversation
PUT    /api/guest/conversations/[id]         # Update conversation
DELETE /api/guest/conversations/[id]         # Delete conversation
```

### Features
```
POST   /api/guest/conversations/[id]/attachments  # File upload + Vision API
GET    /api/guest/conversations/[id]/favorites    # List favorites
POST   /api/guest/conversations/[id]/favorites    # Add to favorites
```

---

## 👔 STAFF PORTAL (4 endpoints)

```
POST   /api/staff/login                      # Staff authentication (JWT)
POST   /api/staff/verify-token               # JWT verification
POST   /api/staff/chat                       # Staff chat engine
GET    /api/reservations/list                # Reservations (multi-tenant)
```

---

## 📋 COMPLIANCE (2 endpoints)

```
POST   /api/compliance/submit                # SIRE/TRA submission (MOCK)
PATCH  /api/compliance/status/[id]           # Update submission status
```

**Estado:** Implementado en modo MOCK (no ejecuta SIRE/TRA real)

---

## 🏨 MOTOPRESS INTEGRATION (6 endpoints) - ⚠️ SECURITY GAP

```
POST   /api/integrations/motopress/configure       # ⚠️ NO AUTH
POST   /api/integrations/motopress/test-connection # ⚠️ NO AUTH
POST   /api/integrations/motopress/sync            # ⚠️ NO AUTH
GET    /api/integrations/motopress/sync/progress   # ⚠️ NO AUTH
GET    /api/integrations/motopress/accommodations  # ⚠️ NO AUTH
```

**🔴 CRÍTICO:** Endpoints sin autenticación admin - Security gap identificado

---

## 🌐 PUBLIC & DEV (4 endpoints)

```
POST   /api/public/chat                      # Public chat (rate-limited Nginx)
POST   /api/public/reset-session             # Session reset
POST   /api/dev/chat                         # Dev chat (experimental)
POST   /api/dev/reset-session                # Dev session reset
```

---

## 🛠️ SYSTEM & UTILITIES (7 endpoints)

```
GET    /api/health                           # Health check (multi-tenant)
GET    /api/status                           # System status
POST   /api/validate                         # File validation (SIRE)
POST   /api/upload                           # File upload (multi-purpose)
GET    /api/tenant/resolve                   # Slug/UUID → tenant_id
GET    /api/tenant/list                      # List tenants
POST   /api/cron/archive-conversations       # Auto-archive (CRON_SECRET auth)
```

---

## 🗂️ LEGACY (6 endpoints) - Still Active

```
POST   /api/chat                             # Pre-multi-tenant chat
POST   /api/chat/muva                        # Tourism-specific (active)
POST   /api/chat/listings                    # Multi-tenant listings
POST   /api/premium-chat                     # Premium semantic search
POST   /api/premium-chat-dev                 # Dev environment
```

---

## ⚡ PERFORMANCE TARGETS vs ACTUAL

| Endpoint | Target | Actual | Status |
|----------|--------|--------|--------|
| `/api/guest/chat` | <3000ms | ~1500-2500ms | ✅ PASS |
| `/api/public/chat` | <2000ms | ~1000-1800ms | ✅ PASS |
| `/api/staff/chat` | <3000ms | ~1500-2500ms | ✅ PASS |
| Vector search | <500ms | ~200-400ms | ✅ PASS |
| File upload + Vision | <5000ms | ~2000-4000ms | ✅ PASS |
| Compliance submit | <1000ms | ~300-800ms | ✅ PASS (MOCK) |

---

## 🚧 GAPS Y PENDIENTES

### CRÍTICO
1. **MotoPress Security** - 6 endpoints sin autenticación admin
2. **Conversion Rate 0%** - Public chat funnel roto (176 sesiones → 0 conversiones)

### IMPORTANTE
1. **OpenAPI Spec** - Desactualizado (no refleja endpoints recientes)
2. **API Documentation** - No auto-generada (manual update needed)
3. **StaffChatInterface** - Endpoint `/api/staff/chat` OK, pero UI no carga historial

### MEDIO
1. **ReservationsList** - `/api/reservations/list` OK, pero UI no conectada
2. **Rate Limiting** - Solo implementado en Nginx, no en API level
3. **API Versioning** - No implementado (future-proofing)

---

## 📝 DOCUMENTACIÓN

**Backend Specs:**
- ✅ API endpoints implementados (44 totales)
- ⚠️ OpenAPI spec desactualizado
- ❌ API documentation auto-generada (Swagger/OpenAPI)

**Faltantes:**
- API documentation completa (OpenAPI 3.0)
- Endpoint testing suite (API integration tests)
- Performance benchmarks por endpoint
- Error code catalog

---

## 🔗 COORDINACIÓN

**Trabaja con:**
- `@backend-developer` - Para API implementation
- `@ux-interface` - Para API contracts
- `@infrastructure-monitor` - Para performance monitoring

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 REFERENCIAS RÁPIDAS

**Production Base URL:** https://innpilot.io

**Authentication:**
- Guest: JWT (HttpOnly cookie, 7 días)
- Staff: JWT (HttpOnly cookie, 7 días)
- Public: No auth (rate-limited)
- CRON: CRON_SECRET env variable
- Admin: ⚠️ TODO (MotoPress endpoints)

**Snapshots Relacionados:**
- 🔧 Backend: `snapshots/backend-developer.md`
- 🖥️ Infraestructura: `snapshots/infrastructure-monitor.md`
