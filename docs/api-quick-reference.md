# MUVA API Quick Reference
**Generated:** 2025-10-06 | **Total:** 44 Endpoints

---

## Quick Navigation

| Category | Endpoints | Status | Auth |
|----------|-----------|--------|------|
| [Guest Portal](#guest-portal) | 12 | ✅ Complete | JWT Guest |
| [Staff Portal](#staff-portal) | 4 | ✅ Complete | JWT Staff |
| [Compliance](#compliance) | 2 | ✅ MOCK | Public |
| [Accommodation](#accommodation) | 3 | ✅ Complete | Public |
| [MotoPress](#motopress) | 6 | ⚠️ No Auth | Admin TODO |
| [Public Chat](#public-chat) | 4 | ✅ Complete | None (Rate Limited) |
| [System](#system) | 7 | ✅ Complete | Public |
| [Legacy](#legacy) | 6 | ⚠️ Deprecated | Various |

---

## Guest Portal

### Authentication
```bash
POST /api/guest/login
  Body: { tenant_id, check_in_date, phone_last_4 }
  Returns: JWT token + guest_info
  Cookie: guest_token (7 days)

POST /api/guest/logout
  Clears: guest_token cookie

POST /api/guest/verify-token
  Body: { token }
  Returns: session data
```

### Conversational Chat
```bash
# Main Chat Endpoint (FASE 2.3)
POST /api/guest/chat
  Headers: Authorization: Bearer <token> | Cookie: guest_token
  Body: { message, conversation_id }
  Returns: { response, entities, followUpSuggestions, sources }
  Features: Rate limit 20/min, Auto-compaction, Vector search

GET /api/guest/chat/history?conversation_id=uuid
  Returns: Last 100 messages
```

### Multi-Conversation (FASE 2.4)
```bash
GET  /api/guest/conversations          # List all
POST /api/guest/conversations          # Create { title }
PUT  /api/guest/conversations/:id      # Update { title }
DELETE /api/guest/conversations/:id    # Delete (cascade)
```

### Attachments (FASE 2.5)
```bash
POST /api/guest/conversations/:id/attachments
  Content-Type: multipart/form-data
  Fields: file, analysisType (location|passport|general), customPrompt
  Returns: { attachment, visionAnalysis }
  Max: 10MB, Types: image/*, application/pdf

GET /api/guest/conversations/:id/attachments
  Returns: All attachments for conversation
```

### Favorites (FASE 2.6)
```bash
GET    /api/guest/conversations/:id/favorites
POST   /api/guest/conversations/:id/favorites   # { favorite: {...} }
DELETE /api/guest/conversations/:id/favorites?name=...
  Types: place, activity, restaurant, service, event
```

---

## Staff Portal

### Authentication
```bash
POST /api/staff/login
  Body: { username, password, tenant_id }
  Returns: JWT token (24h), staff_info, permissions

GET /api/staff/verify-token
  Headers: Authorization: Bearer <token>
  Returns: { valid, staff_info }
```

### Operations
```bash
POST /api/staff/chat
  Body: { message, conversation_id? }
  Returns: { response, sources, metadata }
  Features: Role-based vector search

GET /api/reservations/list?status=active&future=true
  Headers: Authorization: Bearer <token>
  Returns: { reservations[], tenant_info }
  Features: Cross-schema RPC, Future filter
```

---

## Compliance

### SIRE/TRA Submission (FASE 3.1 - MOCK)
```bash
POST /api/compliance/submit
  Body: {
    conversationalData: { nombre_completo, numero_pasaporte, pais_texto, ... },
    reservationId?, conversationId?
  }
  Returns: { submissionId, mockRefs, status: "pending" }
  Features: Conversational→SIRE mapping (13 fields), DB storage only

GET /api/compliance/status/:submissionId
  Returns: { sire, tra, conversational_data, screenshot }

PATCH /api/compliance/status/:submissionId  # Admin only
  Body: { sire_status, sire_reference_number, ... }
  Updates: Manual status/reference updates
```

---

## Accommodation

### Management
```bash
GET /api/accommodation/hotels?tenant_id=uuid
  Returns: Hotels with embedding status

GET /api/accommodation/units?hotel_id=uuid&tenant_id=uuid
  Returns: Units with summaries (capacity, features, pricing, amenities)
  RPC: get_accommodation_units (hotels schema)
```

### Vector Search
```bash
POST /api/accommodation/search
  Body: { query, search_type: "tourism|policies", match_count: 5 }
  Returns: { accommodation_units[], hotels[], tier_info, performance }
  Features: Matryoshka Tier 1 (1024) / Tier 2 (1536)
```

---

## MotoPress

### Configuration
```bash
POST /api/integrations/motopress/configure
  Body: { tenant_id, api_key, site_url, is_active }
  Security: TODO - Encrypt credentials, Add auth

GET /api/integrations/motopress/configure?tenant_id=uuid
  Returns: Config metadata (no sensitive data)
```

### Testing & Sync
```bash
POST /api/integrations/motopress/test-connection
  Body: { tenant_id } OR { api_key, consumer_secret, site_url }
  Returns: { connected, accommodations_count }

POST /api/integrations/motopress/sync
  Body: { tenant_id, selected_ids? }
  Returns: { created, updated, errors }

GET /api/integrations/motopress/sync?tenant_id=uuid
  Returns: { last_sync, history[] }

GET /api/integrations/motopress/sync/progress?tenant_id=uuid
  Returns: { status, progress: { current, total, percentage } }
```

---

## Public Chat

### Anonymous Chat (No Auth Required)
```bash
POST /api/public/chat
  Body: { message, tenant_id, session_id? }
  Returns: { response, session_id }
  Features: Rate limit 10/min per IP, Session cookies (7d)

POST /api/public/chat?stream=true
  Returns: Server-Sent Events (SSE)
  Format: data: {"type":"chunk","content":"..."}

POST /api/public/reset-session
  Clears: session_id cookie
```

### Development (Experimental)
```bash
POST /api/dev/chat
  Same as /api/public/chat but uses dev-chat-engine

POST /api/dev/reset-session
  Clears: dev session cookie
```

---

## System

### Health & Status
```bash
GET /api/health
  Returns: { status, services: { openai, anthropic, supabase }, environment }
  Features: Multi-tenant table check, Raw SQL testing

GET /api/status
  Returns: { status, version, services, metrics, deployment }
  Features: API key validation, Cache health
```

### File Validation & Upload
```bash
POST /api/validate
  Content-Type: multipart/form-data
  Field: file (.txt, .csv, max 10MB)
  Returns: SIRE format validation results

POST /api/upload
  Content-Type: multipart/form-data
  Field: file (.txt, .csv, .md, max 10MB)
  Returns: File type detection, validation, auto-embed eligibility

  SIRE Data (.txt, .csv):
    { fileType: "sire_data", isValid, errors, autoEmbedEligible: false }

  Markdown (.md):
    { fileType: "markdown_document", documentType, domain, metadata, autoEmbedEligible }
```

### Tenant Management
```bash
POST /api/tenant/resolve
  Body: { slugOrUuid: "simmerdown" | uuid }
  Returns: { tenant_id: uuid }

GET /api/tenant/list
  Returns: { tenants: [{ id, name, slug }] }
  Filters: staff_chat_enabled=true, is_active=true
```

### Cron Jobs
```bash
GET /api/cron/archive-conversations
  Headers: Authorization: Bearer <CRON_SECRET>
  Returns: { archived, deleted, timestamp }
  Schedule: Daily 2am (VPS crontab)
  Actions: Archive 30d+ inactive, Delete 90d+ archived
```

---

## Legacy

### Legacy Chat (Pre-Multi-Tenant)
```bash
POST /api/chat
  Body: { question, use_context, max_context_chunks }
  Status: LEGACY - Use /api/guest/chat or /api/public/chat

POST /api/chat/muva
  Body: { question, use_context, max_context_chunks }
  Returns: Tourism-focused responses (Markdown formatted)
  Features: Tier 1 (1024), Semantic cache, RPC match_muva_documents
  Status: Active (MUVA-specific tourism)

GET /api/chat/listings
  Status: WIP
```

### Premium Chat (Experimental)
```bash
POST /api/premium-chat
POST /api/premium-chat-semantic
POST /api/premium-chat-dev
  Status: EXPERIMENTAL
```

---

## Authentication Summary

| Type | Token | Expiration | Storage | Endpoints |
|------|-------|------------|---------|-----------|
| **Guest** | JWT | 7 days | HTTP-only cookie | 12 guest endpoints |
| **Staff** | JWT | 24 hours | Header only | 4 staff endpoints |
| **Public** | Session ID | 7 days | HTTP-only cookie | 4 public endpoints |
| **CRON** | Bearer token | N/A | Env var | 1 cron endpoint |

---

## Rate Limiting

| Endpoint | Limit | Window | Scope |
|----------|-------|--------|-------|
| Guest Chat | 20 requests | 1 minute | Per conversation |
| Public Chat | 10 requests | 1 minute | Per IP address |
| Dev Chat | 10 requests | 1 minute | Per IP address |

---

## Performance Targets

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| Guest Chat | <3000ms | ~1500-2500ms | ✅ |
| Public Chat | <2000ms | ~1000-1800ms | ✅ |
| Staff Chat | <3000ms | ~1500-2500ms | ✅ |
| Vector Search | <500ms | ~200-400ms | ✅ |
| File Upload + Vision | <5000ms | ~2000-4000ms | ✅ |
| Compliance Submit | <1000ms | ~300-800ms | ✅ (MOCK) |

---

## Common Patterns

### Error Handling
```typescript
// All endpoints return consistent error format
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",  // Optional
  "details": "..."       // Optional
}
```

### Pagination (When Implemented)
```typescript
// Not yet implemented, but planned format:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## Quick Troubleshooting

### 401 Unauthorized
- Check JWT token validity
- Verify cookie is being sent
- Check Authorization header format: `Bearer <token>`

### 403 Forbidden
- Verify conversation/resource ownership
- Check staff permissions
- Validate tenant access

### 429 Rate Limit
- Wait for rate limit window to reset
- Check X-RateLimit-Remaining header
- Implement exponential backoff

### 500 Internal Error
- Check API logs in console
- Verify environment variables (API keys)
- Check database connection

---

## Environment Variables Required

```bash
# AI Services
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# JWT
JWT_SECRET=...

# Cron
CRON_SECRET=...

# Node Environment
NODE_ENV=production|development
```

---

## Next Steps & TODOs

### High Priority
- [ ] Implement real SIRE/TRA submission (Puppeteer)
- [ ] Add authentication to MotoPress APIs
- [ ] Encrypt MotoPress credentials
- [ ] Implement Staff Chat History endpoint

### Medium Priority
- [ ] Add pagination to list endpoints
- [ ] Implement Redis-based rate limiting
- [ ] Add API request logging
- [ ] Create API documentation (Swagger/OpenAPI)

### Low Priority
- [ ] Deprecate legacy chat endpoints
- [ ] Implement API versioning (v2)
- [ ] Add request ID tracing
- [ ] Implement GraphQL alternative

---

**For detailed documentation, see:** `/docs/api-inventory-complete.md`
**Last Updated:** 2025-10-06
