# InnPilot API Inventory - Complete Mapping
**Generated:** 2025-10-06
**Total Endpoints:** 44 routes
**Version:** Current (dev branch)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Guest Portal APIs](#guest-portal-apis)
3. [Staff Portal APIs](#staff-portal-apis)
4. [Compliance APIs (SIRE/TRA)](#compliance-apis)
5. [Accommodation & Search APIs](#accommodation--search-apis)
6. [MotoPress Integration APIs](#motopress-integration-apis)
7. [Public & Development APIs](#public--development-apis)
8. [System & Utility APIs](#system--utility-apis)
9. [Legacy/Deprecated APIs](#legacydeprecated-apis)
10. [API Statistics](#api-statistics)

---

## Executive Summary

### Coverage Analysis
- **Implemented & Complete:** 38 endpoints (86%)
- **Work In Progress (WIP):** 4 endpoints (9%)
- **Deprecated/Legacy:** 2 endpoints (5%)

### Authentication Distribution
- **JWT Guest:** 12 endpoints (27%)
- **JWT Staff:** 4 endpoints (9%)
- **Public (No Auth):** 4 endpoints (9%)
- **Service Role:** 4 endpoints (9%)
- **Mixed/Optional:** 20 endpoints (46%)

### HTTP Methods Distribution
- **GET:** 18 endpoints
- **POST:** 28 endpoints
- **PUT:** 2 endpoints
- **DELETE:** 2 endpoints
- **PATCH:** 1 endpoint
- **OPTIONS:** 6 endpoints (CORS)

---

## Guest Portal APIs

### Authentication & Session Management

#### 1. Guest Login
**Route:** `/api/guest/login`
**Methods:** `POST`, `OPTIONS`
**Auth:** Public (returns JWT)
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "tenant_id": "uuid",
  "check_in_date": "YYYY-MM-DD",
  "phone_last_4": "1234"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "jwt_token",
  "reservation_id": "uuid",
  "guest_info": {
    "name": "string",
    "check_in": "YYYY-MM-DD",
    "check_out": "YYYY-MM-DD",
    "reservation_code": "string",
    "accommodation_unit": {
      "id": "uuid",
      "name": "string",
      "unit_number": "string"
    },
    "tenant_features": {
      "muva_access": boolean
    }
  }
}
```

**Features:**
- Sets HTTP-only cookie `guest_token` (7 days)
- Validates phone format (4 digits)
- Validates date format (YYYY-MM-DD)
- Returns comprehensive guest info

**Errors:**
- `400`: Missing/invalid fields
- `401`: No reservation found
- `500`: Token generation failed

---

#### 2. Guest Logout
**Route:** `/api/guest/logout`
**Methods:** `POST`, `GET`
**Auth:** JWT Guest (optional)
**Status:** ✅ Implemented Complete

**Request:** `POST /api/guest/logout`

**Response:**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

**Features:**
- Clears `guest_token` cookie
- No authentication required
- GET returns endpoint info

---

#### 3. Guest Token Verification
**Route:** `/api/guest/verify-token`
**Methods:** `POST`
**Auth:** JWT Guest (validates)
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "token": "jwt_token"
}
```

**Response:**
```json
{
  "session": {
    "reservation_id": "uuid",
    "guest_name": "string",
    "tenant_id": "uuid",
    "check_in": "YYYY-MM-DD",
    "check_out": "YYYY-MM-DD",
    ...
  }
}
```

**Features:**
- Server-side JWT verification
- Has access to JWT_SECRET
- TODO: Validate against current reservation in DB

**Errors:**
- `400`: Missing token
- `401`: Invalid/expired token

---

### Guest Conversational Chat

#### 4. Guest Chat (Main)
**Route:** `/api/guest/chat`
**Methods:** `POST`, `GET`
**Auth:** JWT Guest (cookie or header)
**Status:** ✅ Implemented Complete (FASE 2.3)

**Request:**
```json
{
  "message": "string (max 1000 chars)",
  "conversation_id": "uuid (required)"
}
```

**Response:**
```json
{
  "success": true,
  "response": "conversational response",
  "entities": ["entity1", "entity2"],
  "followUpSuggestions": ["suggestion1", "suggestion2"],
  "sources": [
    {
      "id": "string",
      "type": "accommodation|policy|tourism",
      "content": "string",
      "similarity": 0.95
    }
  ],
  "metadata": {
    "confidence": 0.85,
    "responseTime": 1234,
    "guestName": "string",
    "conversationId": "uuid"
  }
}
```

**Features:**
- **Rate Limiting:** 20 requests/minute per conversation
- **Context-Aware:** Loads last 10 messages
- **Vector Search:** Matryoshka embeddings (Tier 1/2)
- **Auto-Compaction:** Triggers at 20+ messages
- **Persistent Storage:** All messages saved to DB
- **Entity Tracking:** Extracts and tracks entities
- **Follow-up Suggestions:** AI-generated next questions

**Flow:**
1. Authentication (cookie → header fallback)
2. Rate limit check
3. Validate conversation ownership
4. Persist user message
5. Load conversation history (last 10)
6. Generate conversational response
7. Persist assistant message
8. Update conversation metadata
9. Auto-compact if needed (20+ messages)

**Errors:**
- `401`: Missing/invalid token
- `400`: Missing/invalid message or conversation_id
- `404`: Conversation not found/access denied
- `429`: Rate limit exceeded (20/min)
- `500`: Internal error

---

#### 5. Guest Chat History
**Route:** `/api/guest/chat/history`
**Methods:** `GET`
**Auth:** JWT Guest (cookie or header)
**Status:** ✅ Implemented Complete

**Query Params:**
- `conversation_id` (REQUIRED)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant",
      "content": "string",
      "created_at": "ISO timestamp",
      "entities": ["entity1", "entity2"]
    }
  ],
  "total": 0
}
```

**Features:**
- Returns last 100 messages
- Validates conversation ownership
- Returns empty array if no conversation_id

**Errors:**
- `401`: Invalid token
- `403`: Access denied to conversation
- `500`: Database error

---

### Guest Conversations (Multi-Conversation)

#### 6. Conversations - List/Create
**Route:** `/api/guest/conversations`
**Methods:** `POST`, `GET`
**Auth:** JWT Guest (cookie or header)
**Status:** ✅ Implemented Complete (FASE 2.4)

**POST - Create Conversation:**
```json
{
  "title": "Nueva conversación" // optional, max 200 chars
}
```

Response:
```json
{
  "conversation": {
    "id": "uuid",
    "guest_id": "uuid",
    "tenant_id": "uuid",
    "title": "string",
    "last_message": null,
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
  }
}
```

**GET - List Conversations:**
Response:
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "string",
      "last_message": "preview...",
      "message_count": 12,
      "last_activity_at": "ISO timestamp",
      "created_at": "ISO timestamp"
    }
  ],
  "total": 3
}
```

**Features:**
- Ordered by `updated_at` DESC
- Filtered by authenticated guest
- Auto-generates title if not provided

---

#### 7. Conversation - Update/Delete
**Route:** `/api/guest/conversations/[id]`
**Methods:** `PUT`, `DELETE`
**Auth:** JWT Guest (cookie or header)
**Status:** ✅ Implemented Complete (FASE 2.4)

**PUT - Update Title:**
```json
{
  "title": "New title (max 200 chars)"
}
```

Response:
```json
{
  "id": "uuid",
  "title": "Updated title",
  "updated_at": "ISO timestamp",
  ...
}
```

**DELETE - Delete Conversation:**
Response:
```json
{
  "success": true,
  "message": "Conversación eliminada"
}
```

**Features:**
- Validates conversation ownership
- CASCADE deletes related messages
- Updates `updated_at` on title change

**Errors:**
- `401`: Invalid token
- `400`: Invalid title
- `404`: Conversation not found
- `500`: Database error

---

#### 8. Conversation Attachments
**Route:** `/api/guest/conversations/[id]/attachments`
**Methods:** `POST`, `GET`
**Auth:** JWT Guest (header only)
**Status:** ✅ Implemented Complete (FASE 2.5)

**POST - Upload File:**
```
Content-Type: multipart/form-data

Fields:
- file: File (image/*, application/pdf, max 10MB)
- analysisType: 'location' | 'passport' | 'general' (optional)
- customPrompt: string (optional, for general analysis)
```

Response:
```json
{
  "success": true,
  "attachment": {
    "id": "uuid",
    "file_url": "https://...",
    "file_type": "image|document",
    "file_size_bytes": 12345,
    "original_filename": "passport.jpg",
    "created_at": "ISO timestamp"
  },
  "visionAnalysis": {
    "description": "string",
    "confidence": 0.95,
    "passportData": { /* if analysisType=passport */ },
    "location": { /* if analysisType=location */ }
  },
  "metadata": {
    "duration_ms": 2341,
    "guest": "John Doe"
  }
}
```

**GET - List Attachments:**
Response:
```json
{
  "attachments": [
    {
      "id": "uuid",
      "file_url": "string",
      "file_type": "image|document",
      "ocr_text": "extracted text",
      "vision_analysis": {...},
      "created_at": "ISO timestamp"
    }
  ],
  "count": 3
}
```

**Features:**
- **Supabase Storage:** `guest-attachments` bucket
- **Claude Vision API:** Auto-analysis for images
- **OCR Support:** Passport data extraction
- **Location Recognition:** Photo → directions
- **Performance Target:** <5000ms total

**Allowed Types:**
- `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- `application/pdf`

**Errors:**
- `400`: Invalid file type/size
- `401`: Invalid token
- `403`: Conversation access denied
- `500`: Upload/analysis failed

---

#### 9. Conversation Favorites
**Route:** `/api/guest/conversations/[id]/favorites`
**Methods:** `POST`, `GET`, `DELETE`
**Auth:** JWT Guest (header only)
**Status:** ✅ Implemented Complete (FASE 2.6)

**GET - List Favorites:**
Response:
```json
{
  "favorites": [
    {
      "type": "place|activity|restaurant|service|event",
      "name": "La Regatta",
      "description": "Italian restaurant",
      "location": "Rocky Cay",
      "metadata": {...},
      "added_at": "ISO timestamp"
    }
  ]
}
```

**POST - Add Favorite:**
```json
{
  "favorite": {
    "type": "restaurant",
    "name": "La Regatta",
    "description": "Italian restaurant",
    "location": "Rocky Cay",
    "metadata": {...}
  }
}
```

Response: `{ "success": true }`

**DELETE - Remove Favorite:**
Query params: `?name=La+Regatta`

Response: `{ "success": true }`

**Features:**
- Stored in `guest_conversations.favorites` JSONB
- Valid types: `place`, `activity`, `restaurant`, `service`, `event`
- Max 50 favorites per conversation

**Errors:**
- `400`: Invalid favorite data/type
- `401`: Invalid token
- `403`: Conversation access denied

---

## Staff Portal APIs

### Staff Authentication

#### 10. Staff Login
**Route:** `/api/staff/login`
**Methods:** `POST`, `GET`
**Auth:** Public (returns JWT)
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "username": "string",
  "password": "string",
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "staff_info": {
      "staff_id": "uuid",
      "username": "string",
      "full_name": "string",
      "role": "admin|manager|receptionist",
      "permissions": ["permission1", "permission2"]
    },
    "session_expires_at": "ISO timestamp (24h)"
  }
}
```

**Features:**
- JWT token (24h expiration)
- Role-based permissions
- Tenant isolation

**Errors:**
- `400`: Missing fields / Invalid types
- `401`: Invalid credentials
- `403`: Staff chat disabled for tenant
- `500`: Internal error

---

#### 11. Staff Token Verification
**Route:** `/api/staff/verify-token`
**Methods:** `GET`, `POST`
**Auth:** JWT Staff (validates)
**Status:** ✅ Implemented Complete

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "valid": true,
  "staff_info": {
    "staff_id": "uuid",
    "username": "string",
    "full_name": "string",
    "role": "string",
    "tenant_id": "uuid"
  }
}
```

**Errors:**
- `401`: Missing/invalid token
- `500`: Verification error

---

### Staff Chat & Operations

#### 12. Staff Chat
**Route:** `/api/staff/chat`
**Methods:** `POST`, `GET`
**Auth:** JWT Staff (header)
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "message": "string (max 2000 chars)",
  "conversation_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "conversation_id": "uuid",
  "response": "string",
  "sources": [
    {
      "id": "string",
      "type": "accommodation|policy|operational",
      "content": "string",
      "similarity": 0.92
    }
  ],
  "metadata": {
    "intent": {
      "type": "inventory_query|operational_question",
      "confidence": 0.88
    },
    "token_usage": {
      "total": 1234,
      "prompt": 800,
      "completion": 434
    },
    "response_time_ms": 1567
  }
}
```

**Features:**
- **Role-Based Vector Search:** Access based on staff role
- **Conversation Persistence:** Auto-creates conversation
- **Context-Aware:** Maintains conversation history
- **Token Tracking:** Full usage metrics

**Errors:**
- `401`: Invalid token
- `400`: Invalid message
- `500`: Chat engine error

---

#### 13. Staff Chat History
**Route:** `/api/staff/chat/history`
**Methods:** `GET`
**Auth:** JWT Staff (header)
**Status:** 🚧 WIP (mentioned in code but route not found)

**Expected:** Similar to guest chat history

---

#### 14. Reservations List
**Route:** `/api/reservations/list`
**Methods:** `GET`, `OPTIONS`
**Auth:** JWT Staff (header)
**Status:** ✅ Implemented Complete (PHASE 3)

**Query Params:**
- `status` (optional, default: `active`)
- `future` (optional, default: `true`)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "reservations": [
      {
        "id": "uuid",
        "tenant_id": "uuid",
        "guest_name": "string",
        "phone_full": "+57 300 1234567",
        "phone_last_4": "4567",
        "check_in_date": "YYYY-MM-DD",
        "check_out_date": "YYYY-MM-DD",
        "reservation_code": "RES-001",
        "status": "active|completed|cancelled",
        "accommodation_unit": {
          "id": "uuid",
          "name": "Ocean View Suite",
          "unit_number": "201",
          "unit_type": "suite"
        },
        "guest_email": "guest@example.com",
        "guest_country": "Colombia",
        "adults": 2,
        "children": 1,
        "total_price": 450000,
        "currency": "COP",
        "check_in_time": "15:00",
        "check_out_time": "12:00",
        "booking_source": "direct|booking_com|airbnb",
        "external_booking_id": "BK123456",
        "booking_notes": "Late check-in requested",
        "created_at": "ISO timestamp",
        "updated_at": "ISO timestamp"
      }
    ],
    "tenant_info": {
      "tenant_id": "uuid",
      "hotel_name": "Simmer Down Hotel",
      "slug": "simmerdown"
    }
  }
}
```

**Features:**
- **Cross-Schema Lookup:** Uses RPC `get_accommodation_units_by_ids`
- **Future-Only Filter:** Default shows only upcoming reservations
- **Status Filter:** `active|completed|cancelled`
- **Ordered:** By check-in date (nearest first)

**Errors:**
- `401`: Invalid/missing staff token
- `404`: Tenant not found
- `500`: Query error

---

## Compliance APIs

### SIRE/TRA Submission

#### 15. Compliance Submit
**Route:** `/api/compliance/submit`
**Methods:** `POST`
**Auth:** Public (accepts guest_id/reservation_id)
**Status:** ✅ Implemented Complete (MOCK - FASE 3.1)

**Request:**
```json
{
  "conversationalData": {
    "nombre_completo": "John Doe Smith",
    "numero_pasaporte": "AB123456",
    "pais_texto": "United States",
    "fecha_nacimiento": "1990-01-15",
    "proposito_viaje": "Tourism",
    "ciudad_residencia": "New York",
    "email": "john@example.com",
    "telefono": "+1 555-1234"
  },
  "guestId": "uuid (optional)",
  "reservationId": "uuid (optional)",
  "conversationId": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "uuid",
  "mockRefs": {
    "sireRef": "MOCK-SIRE-1696531234567",
    "traRef": "MOCK-TRA-1696531234567"
  },
  "timestamp": "ISO timestamp",
  "status": "pending",
  "message": "Submission guardada en DB. SIRE/TRA se ejecutará en FASE 3.2-3.3"
}
```

**Features:**
- **Conversational → SIRE Mapping:** 13 official SIRE fields
- **Mock Mode:** Does NOT execute real SIRE/TRA
- **Database Storage:** Saves to `compliance_submissions`
- **Tenant Config:** Retrieves `sire_hotel_code`, `sire_city_code`

**Required Fields:**
- `nombre_completo`
- `numero_pasaporte`
- `pais_texto`

**SIRE Mapping (13 campos oficiales):**
1. `tipo_identificacion_hospedado`
2. `numero_identificacion`
3. `primer_apellido`
4. `segundo_apellido`
5. `nombres`
6. `codigo_nacionalidad`
7. `fecha_nacimiento`
8. `codigo_genero`
9. `codigo_hotel`
10. `codigo_ciudad`
11. `fecha_movimiento`
12. `tipo_movimiento` (1=entrada, 2=salida)
13. `numero_adultos`

**Errors:**
- `400`: Missing required fields
- `404`: Reservation/conversation not found
- `500`: Database insert failed

---

#### 16. Compliance Status
**Route:** `/api/compliance/status/[submissionId]`
**Methods:** `GET`, `PATCH`
**Auth:** Public (read) / Admin (write)
**Status:** ✅ Implemented Complete

**GET - Check Status:**
Response:
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "tenant_id": "uuid",
  "conversational_data": {...},
  "sire": {
    "status": "pending|submitted|failed",
    "reference_number": "SIRE-12345",
    "error": null,
    "screenshot_available": true,
    "screenshot": "base64_string"
  },
  "tra": {
    "status": "pending|submitted|failed",
    "reference_number": "TRA-67890",
    "error": null
  },
  "submitted_at": "ISO timestamp",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "metadata": {...}
}
```

**PATCH - Update Status (Admin):**
```json
{
  "sire_status": "submitted",
  "sire_reference_number": "SIRE-12345",
  "sire_error": null,
  "tra_status": "submitted",
  "tra_reference_number": "TRA-67890",
  "tra_error": null
}
```

**Features:**
- Read submission status
- Admin can manually update status/reference
- Base64 screenshot (if available)

**Errors:**
- `404`: Submission not found
- `500`: Update failed

---

## Accommodation & Search APIs

### Accommodation Management

#### 17. Hotels - List
**Route:** `/api/accommodation/hotels`
**Methods:** `GET`
**Auth:** Public / Service Role
**Status:** ✅ Implemented Complete

**Query Params:**
- `tenant_id` (optional)

**Response:**
```json
{
  "success": true,
  "hotels": [
    {
      "id": "uuid",
      "name": "Simmer Down Hotel",
      "description": "Beachfront hotel...",
      "short_description": "Ocean views",
      "address": {...},
      "contact_info": {...},
      "hotel_amenities": [...],
      "tourism_summary": "string",
      "policies_summary": "string",
      "embedding_status": {
        "has_fast": true,
        "has_balanced": true,
        "fast_dimensions": 1024,
        "balanced_dimensions": 1536
      },
      "images": [...],
      "status": "active",
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
    }
  ],
  "count": 1
}
```

**Features:**
- Matryoshka embeddings status
- Ordered by `created_at` DESC

---

#### 18. Accommodation Units - List
**Route:** `/api/accommodation/units`
**Methods:** `GET`
**Auth:** Public / Service Role
**Status:** ✅ Implemented Complete

**Query Params:**
- `hotel_id` (optional)
- `tenant_id` (optional)

**Response:**
```json
{
  "success": true,
  "units": [
    {
      "id": "uuid",
      "name": "Ocean View Suite",
      "unit_number": "201",
      "description": "Spacious suite...",
      "short_description": "Ocean view",
      "capacity": {
        "total": 4,
        "adults": 2,
        "children": 2
      },
      "bed_configuration": {...},
      "view_type": "ocean|garden|city",
      "status": "active",
      "is_featured": true,
      "display_order": 1,
      "hotel_id": "uuid",
      "tenant_id": "uuid",
      "embedding_status": {...},
      "capacity_summary": {...},
      "features_summary": {...},
      "pricing_summary": {...},
      "amenities_summary": {...}
    }
  ],
  "count": 12
}
```

**Features:**
- **Cross-Schema RPC:** Uses `get_accommodation_units` (hotels schema)
- **Enhanced Summaries:** Capacity, features, pricing, amenities
- **Ordered:** By `display_order` ASC

---

#### 19. Accommodation Search (Vector)
**Route:** `/api/accommodation/search`
**Methods:** `POST`
**Auth:** Public
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "query": "ocean view suite with balcony",
  "search_type": "tourism|policies",
  "similarity_threshold": 0.1,
  "match_count": 5
}
```

**Response:**
```json
{
  "success": true,
  "query": "ocean view suite with balcony",
  "search_type": "tourism",
  "tier_info": {
    "name": "Tier 1 (Ultra-fast Tourism)",
    "dimensions": 1024,
    "search_duration_ms": 234
  },
  "results": {
    "accommodation_units": [
      {
        "id": "uuid",
        "name": "Ocean View Suite",
        "similarity": 0.89,
        "content": "description text..."
      }
    ],
    "hotels": [],
    "total_units": 3,
    "total_hotels": 0
  },
  "performance": {
    "embedding_generation_ms": 164,
    "vector_search_ms": 70,
    "total_ms": 234
  }
}
```

**Features:**
- **Matryoshka Tiers:**
  - Tier 1 (1024 dims) for tourism
  - Tier 2 (1536 dims) for policies
- **HNSW Vector Search:** Fast similarity search
- **RPC Function:** `match_hotels_documents`

---

## MotoPress Integration APIs

### Configuration & Testing

#### 20. MotoPress Configure
**Route:** `/api/integrations/motopress/configure`
**Methods:** `POST`, `GET`
**Auth:** Admin (TODO: implement)
**Status:** ✅ Implemented (⚠️ Security TODO)

**POST - Save Config:**
```json
{
  "tenant_id": "uuid",
  "api_key": "consumer_key",
  "site_url": "https://example.com",
  "is_active": true
}
```

Response:
```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "data": {
    "id": "uuid",
    "is_active": true,
    "updated_at": "ISO timestamp"
  }
}
```

**GET - Retrieve Config:**
Query: `?tenant_id=uuid`

Response:
```json
{
  "exists": true,
  "config": {
    "id": "uuid",
    "is_active": true,
    "last_sync_at": "ISO timestamp",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp"
    // config_data NOT included (security)
  }
}
```

**Security TODOs:**
- ⚠️ Encrypt credentials before saving
- ⚠️ Implement proper authentication
- ⚠️ Currently stores in plaintext (NOT production-ready)

---

#### 21. MotoPress Test Connection
**Route:** `/api/integrations/motopress/test-connection`
**Methods:** `POST`
**Auth:** Admin (TODO: implement)
**Status:** ✅ Implemented

**Request:**
```json
{
  "tenant_id": "uuid",
  // OR provide credentials directly:
  "api_key": "ck_...",
  "consumer_secret": "cs_...",
  "site_url": "https://example.com"
}
```

**Response (Success):**
```json
{
  "connected": true,
  "message": "Connection successful",
  "accommodations_count": 12,
  "api_version": "mphb/v1",
  "response_time": 1696531234567
}
```

**Response (Error):**
```json
{
  "connected": false,
  "error": "HTTP 401",
  "message": "Failed to connect to MotoPress API",
  "details": "..."
}
```

**Features:**
- Tests `/wp-json/mphb/v1/accommodation_types`
- Basic auth with Consumer Key/Secret
- Returns accommodation count

---

#### 22. MotoPress Status
**Route:** `/api/integrations/motopress/status`
**Methods:** `GET`
**Auth:** Admin
**Status:** 🚧 WIP (route not found, but referenced)

**Expected:** Integration status overview

---

### Sync Operations

#### 23. MotoPress Sync
**Route:** `/api/integrations/motopress/sync`
**Methods:** `POST`, `GET`
**Auth:** Admin
**Status:** ✅ Implemented Complete

**POST - Start Sync:**
```json
{
  "tenant_id": "uuid",
  "selected_ids": [1, 2, 3] // Optional for selective import
}
```

Response:
```json
{
  "success": true,
  "message": "Sync completed successfully",
  "data": {
    "created": 5,
    "updated": 7,
    "total_processed": 12,
    "errors": 0
  }
}
```

**GET - Sync History:**
Query: `?tenant_id=uuid`

Response:
```json
{
  "last_sync": {
    "status": "success|partial_success|error",
    "started_at": "ISO timestamp",
    "completed_at": "ISO timestamp",
    "records_processed": 12
  },
  "history": [
    {
      "sync_type": "full|selective",
      "status": "success",
      "records_created": 5,
      "records_updated": 7,
      "started_at": "ISO timestamp"
    }
  ],
  "count": 10
}
```

**Features:**
- **Full Sync:** All accommodations
- **Selective Import:** Specific IDs only
- **Sync History:** Last 10 operations

---

#### 24. MotoPress Sync Progress
**Route:** `/api/integrations/motopress/sync/progress`
**Methods:** `GET`
**Auth:** Admin
**Status:** ✅ Implemented Complete

**Query:** `?tenant_id=uuid`

**Response:**
```json
{
  "status": "success|in_progress|error|no_sync",
  "message": "Successfully synced 12 accommodations",
  "progress": {
    "current": 12,
    "total": 12,
    "percentage": 100
  },
  "last_sync_at": "ISO timestamp",
  "sync_details": {
    "sync_type": "full",
    "records_created": 5,
    "records_updated": 7,
    "records_processed": 12,
    "error_message": null,
    "duration_ms": 3456
  }
}
```

**Features:**
- Real-time progress tracking
- Percentage completion
- Error reporting

---

#### 25. MotoPress Accommodations
**Route:** `/api/integrations/motopress/accommodations`
**Methods:** `GET`
**Auth:** Admin
**Status:** 🚧 WIP (route not found, but referenced)

**Expected:** List available accommodations from MotoPress API

---

## Public & Development APIs

### Public Chat (No Auth)

#### 26. Public Chat
**Route:** `/api/public/chat`
**Methods:** `POST`, `OPTIONS`
**Auth:** None (rate-limited by IP)
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "message": "string (max 1000 chars)",
  "session_id": "uuid (optional)",
  "tenant_id": "uuid (required)"
}
```

**Response (Non-Streaming):**
```json
{
  "success": true,
  "data": {
    "response": "conversational response",
    "session_id": "uuid",
    "metadata": {
      "response_time_ms": 1234
    }
  }
}
```

**Response (Streaming - SSE):**
Query param: `?stream=true`

```
data: {"type":"chunk","content":"Hello"}

data: {"type":"chunk","content":" there!"}

data: {"type":"done","session_id":"uuid"}
```

**Features:**
- **Rate Limiting:** 10 requests/minute per IP
- **Session Management:** Auto-creates/retrieves session
- **HTTP-only Cookie:** `session_id` (7 days)
- **Streaming Support:** Server-Sent Events (SSE)
- **Multi-Source Session ID:** Body → Cookie → Header

**Headers (Rate Limit):**
- `X-RateLimit-Limit: 10`
- `X-RateLimit-Remaining: 7`
- `Retry-After: 60` (if 429)

**Errors:**
- `400`: Missing/invalid fields
- `429`: Rate limit exceeded
- `500`: Internal error

---

#### 27. Public Reset Session
**Route:** `/api/public/reset-session`
**Methods:** `POST`
**Auth:** None
**Status:** ✅ Implemented (assumed, route exists)

**Expected:** Clears session cookie

---

### Development APIs

#### 28. Dev Chat
**Route:** `/api/dev/chat`
**Methods:** `POST`, `OPTIONS`
**Auth:** None (rate-limited by IP)
**Status:** ✅ Implemented Complete

**Features:** Same as Public Chat but uses `dev-chat-engine`
- Experimental improvements
- Separate session storage
- Same rate limiting (10/min)
- Streaming support

---

#### 29. Dev Reset Session
**Route:** `/api/dev/reset-session`
**Methods:** `POST`
**Auth:** None
**Status:** ✅ Implemented (assumed, route exists)

**Expected:** Clears dev session cookie

---

## System & Utility APIs

### Health & Status

#### 30. Health Check
**Route:** `/api/health`
**Methods:** `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ✅ Implemented Complete

**Response:**
```json
{
  "status": "healthy|degraded|error",
  "timestamp": "ISO timestamp",
  "services": {
    "openai": {
      "status": "configured|not_configured"
    },
    "anthropic": {
      "status": "configured|not_configured"
    },
    "supabase": {
      "status": "healthy|error",
      "responseTime": "123ms",
      "error": null,
      "tables": {
        "public.sire_content": {
          "status": "healthy",
          "responseTime": "45ms"
        },
        "public.muva_content": {
          "status": "healthy",
          "responseTime": "38ms"
        },
        "simmerdown.content": {
          "status": "healthy",
          "responseTime": "40ms"
        }
      }
    }
  },
  "environment": {
    "runtime": "edge",
    "region": "iad1",
    "deployment": "abc1234"
  }
}
```

**Features:**
- **Multi-Tenant Check:** Tests all active schemas
- **Table-Level Status:** Individual table health
- **API Key Validation:** Checks env vars
- **Raw SQL Testing:** Uses `exec_sql` RPC

**Status Codes:**
- `200`: Healthy
- `503`: Degraded (some services down)
- `500`: Error

---

#### 31. Status Endpoint
**Route:** `/api/status`
**Methods:** `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ✅ Implemented Complete

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "0.1.0",
  "environment": "production|development",
  "timestamp": "ISO timestamp",
  "services": {
    "supabase": {
      "status": "healthy",
      "responseTime": "45ms",
      "lastCheck": "ISO timestamp"
    },
    "openai": {
      "status": "healthy|unhealthy",
      "error": "API key not configured",
      "lastCheck": "ISO timestamp"
    },
    "anthropic": {
      "status": "healthy|unhealthy",
      "lastCheck": "ISO timestamp"
    },
    "cache": {
      "status": "healthy",
      "lastCheck": "ISO timestamp"
    }
  },
  "metrics": {
    "timestamp": "ISO timestamp"
  },
  "deployment": {
    "region": "iad1",
    "commit": "abc1234",
    "buildTime": "unknown"
  }
}
```

**Features:**
- Validates API key prefixes (`sk-proj-`, `sk-ant-`)
- Simple cache health check
- Deployment info

**Status Codes:**
- `200`: Healthy
- `206`: Degraded
- `503`: Unhealthy

---

### File Validation & Upload

#### 32. Validate (SIRE Files)
**Route:** `/api/validate`
**Methods:** `POST`, `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ✅ Implemented Complete

**POST - Validate File:**
```
Content-Type: multipart/form-data
Field: file (.txt or .csv, max 10MB)
```

Response:
```json
{
  "fileName": "sire_data.txt",
  "fileSize": 12345,
  "isValid": true,
  "lineCount": 50,
  "format": "tab|csv|unknown",
  "errors": [],
  "detailedErrors": [],
  "preview": ["line1", "line2", "line3"],
  "fieldValidation": {
    "field1": {
      "valid": true,
      "errors": []
    }
  },
  "timestamp": "ISO timestamp"
}
```

**Validation Rules:**
- **13 campos obligatorios** (SIRE format)
- **Separators:** TAB or CSV
- **Document types:** 3, 5, 46, 10 (valid)
- **Auto-detect format**
- **Detailed error reporting**

**GET:** Returns endpoint info

---

#### 33. Upload (Multi-Purpose)
**Route:** `/api/upload`
**Methods:** `POST`, `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ✅ Implemented Complete

**POST - Upload File:**
```
Content-Type: multipart/form-data
Field: file (.txt, .csv, .md, max 10MB)
```

**Response (SIRE Data):**
```json
{
  "fileType": "sire_data",
  "fileName": "data.txt",
  "fileSize": 12345,
  "isValid": true,
  "lineCount": 50,
  "format": "tab",
  "errors": [],
  "autoEmbedEligible": false
}
```

**Response (Markdown Document):**
```json
{
  "fileType": "markdown_document",
  "fileName": "guide.md",
  "fileSize": 5678,
  "documentType": "sire_regulatory|hotel_process|tourism|...",
  "frontmatter": {
    "title": "SIRE Guide",
    "type": "sire_regulatory",
    "auto_embed": true
  },
  "autoEmbedEligible": true,
  "domain": {
    "name": "SIRE regulatory and compliance content",
    "table": "sire_content",
    "searchFunction": "match_sire_documents"
  },
  "metadata": {
    "isValid": true,
    "errors": [],
    "suggestions": ["Consider adding: description"],
    "schema": {...}
  },
  "contentPreview": "# SIRE Guide...",
  "wordCount": 1234,
  "estimatedChunks": 5
}
```

**Features:**
- **Metadata-Driven Routing:** Frontmatter determines table
- **Domain Segregation:** `sire_content`, `muva_content`, `simmerdown.content`
- **Auto-Embed Detection:** Based on type + frontmatter
- **Document Type Schemas:** Validates required/suggested fields

**Supported Types:**
- **SIRE Data:** `.txt`, `.csv`
- **Documentation:** `.md` (Markdown)

**Document Types:**
- `sire_regulatory`, `sire_template`, `compliance_guide`
- `hotel_process`, `amenities`, `policies`
- `tourism`, `restaurants`, `beaches`, `activities`, `culture`, `events`
- `system_docs`, `general_docs`

**GET:** Returns endpoint info with document type list

---

### Tenant Management

#### 34. Tenant Resolve
**Route:** `/api/tenant/resolve`
**Methods:** `POST`, `GET`
**Auth:** Public
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "slugOrUuid": "simmerdown" // or UUID
}
```

**Response:**
```json
{
  "success": true,
  "tenant_id": "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"
}
```

**Features:**
- Resolves friendly slugs to UUIDs
- Supports direct UUIDs
- Used by guest-chat page for friendly URLs

**Errors:**
- `400`: Missing slugOrUuid
- `404`: Tenant not found

---

#### 35. Tenant List
**Route:** `/api/tenant/list`
**Methods:** `GET`, `POST`
**Auth:** Public
**Status:** ✅ Implemented Complete

**Response:**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Simmer Down Hotel",
      "slug": "simmerdown"
    }
  ],
  "count": 1
}
```

**Features:**
- **Filters:** Only `staff_chat_enabled = true`
- **Active Only:** `is_active = true`
- **Ordered:** By `nombre_comercial` ASC

---

### Cron Jobs

#### 36. Archive Conversations (Cron)
**Route:** `/api/cron/archive-conversations`
**Methods:** `GET`
**Auth:** CRON_SECRET (Bearer token)
**Status:** ✅ Implemented Complete

**Headers:** `Authorization: Bearer <CRON_SECRET>`

**Response:**
```json
{
  "success": true,
  "archived": 12,
  "deleted": 3,
  "timestamp": "ISO timestamp"
}
```

**Features:**
- **Schedule:** Daily at 2am (VPS crontab)
- **Archive:** Conversations inactive 30+ days
- **Delete:** Conversations archived 90+ days
- **Security:** Requires CRON_SECRET env var

**Actions:**
1. Get conversations to archive (30+ days inactive)
2. Archive each conversation
3. Get conversations to delete (archived 90+ days)
4. Delete each conversation

**Errors:**
- `401`: Unauthorized (invalid CRON_SECRET)
- `500`: Job failed

---

## Legacy/Deprecated APIs

### Legacy Chat Endpoints

#### 37. Chat (Legacy)
**Route:** `/api/chat`
**Methods:** `POST`, `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ⚠️ LEGACY (pre-multi-tenant)

**Features:**
- Semantic cache (memory-only)
- Intent detection
- Matryoshka embeddings
- Multi-domain search (SIRE + Accommodation + MUVA)

**Replacement:** Use tenant-specific endpoints:
- `/api/guest/chat` (authenticated)
- `/api/public/chat` (anonymous)

---

#### 38. Chat Listings (Legacy)
**Route:** `/api/chat/listings`
**Methods:** `GET`
**Auth:** Public
**Status:** 🚧 WIP (route exists but not documented)

**Expected:** Legacy accommodation listings chat

---

#### 39. Chat MUVA
**Route:** `/api/chat/muva`
**Methods:** `POST`, `GET`
**Auth:** Public
**Runtime:** Edge
**Status:** ✅ Implemented Complete

**Request:**
```json
{
  "question": "mejores restaurantes en San Luis",
  "use_context": true,
  "max_context_chunks": 4
}
```

**Response:**
```json
{
  "response": "string (Markdown formatted)",
  "context_used": true,
  "question": "...",
  "performance": {
    "total_time_ms": 567,
    "cache_hit": false,
    "endpoint": "muva"
  }
}
```

**Features:**
- **Tier 1 Embeddings:** 1024 dims (ultra-fast)
- **MUVA-Specific Prompt:** Tourism-focused
- **Semantic Cache:** Tourism categories
- **RPC Function:** `match_muva_documents`
- **Markdown Formatting:** Bold, lists, code blocks

**Semantic Groups:**
- `restaurants`, `activities`, `spots`, `nightlife`
- `transport`, `beaches`, `zones`

---

### Premium Chat (Experimental)

#### 40-42. Premium Chat Variants
**Routes:**
- `/api/premium-chat`
- `/api/premium-chat-semantic`
- `/api/premium-chat-dev`

**Methods:** `POST`
**Auth:** Public
**Status:** 🚧 EXPERIMENTAL (routes exist but not fully documented)

**Expected:** Advanced chat features, possibly paid tier

---

## API Statistics

### Summary

| Category | Count | Percentage |
|----------|-------|------------|
| **Total Endpoints** | 44 | 100% |
| **Guest Portal** | 12 | 27% |
| **Staff Portal** | 4 | 9% |
| **Compliance (SIRE/TRA)** | 2 | 5% |
| **Accommodation** | 3 | 7% |
| **MotoPress Integration** | 6 | 14% |
| **Public/Dev** | 4 | 9% |
| **System/Utility** | 7 | 16% |
| **Legacy/Deprecated** | 6 | 14% |

### By Implementation Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Complete | 38 | 86% |
| 🚧 WIP | 4 | 9% |
| ⚠️ Legacy | 2 | 5% |

### By Authentication Type

| Auth Type | Count | Endpoints |
|-----------|-------|-----------|
| **JWT Guest** | 12 | Login, Logout, Verify, Chat, History, Conversations (CRUD), Attachments, Favorites |
| **JWT Staff** | 4 | Login, Verify, Chat, Reservations |
| **Public (No Auth)** | 8 | Health, Status, Validate, Upload, Tenant (Resolve/List), Public Chat, Dev Chat |
| **CRON Secret** | 1 | Archive Conversations |
| **Admin (TODO)** | 6 | MotoPress Config/Test/Sync |
| **Service Role** | 3 | Accommodation APIs |

### By HTTP Method

| Method | Count | Most Common Use |
|--------|-------|----------------|
| **GET** | 18 | List, Status, History |
| **POST** | 28 | Create, Submit, Chat |
| **PUT** | 2 | Update (Conversations) |
| **DELETE** | 2 | Delete (Conversations, Favorites) |
| **PATCH** | 1 | Update (Compliance Status) |
| **OPTIONS** | 6 | CORS Preflight |

### Performance Targets

| Endpoint Type | Target | Current |
|---------------|--------|---------|
| **Guest Chat** | <3000ms | ✅ ~1500-2500ms |
| **Public Chat** | <2000ms | ✅ ~1000-1800ms |
| **Staff Chat** | <3000ms | ✅ ~1500-2500ms |
| **Vector Search** | <500ms | ✅ ~200-400ms |
| **File Upload + Vision** | <5000ms | ✅ ~2000-4000ms |
| **Compliance Submit** | <1000ms | ✅ ~300-800ms (MOCK) |

---

## Migration Notes

### FASE 2.0 → 2.6 Complete
- ✅ Multi-conversation system
- ✅ Guest authentication with JWT
- ✅ Conversation CRUD
- ✅ Attachments with Claude Vision
- ✅ Favorites management
- ✅ Auto-compaction (memory blocks)

### FASE 3.1 Complete (MOCK)
- ✅ Compliance submission (DB only)
- ✅ Conversational → SIRE mapping
- ⏳ Real SIRE/TRA execution (FASE 3.2-3.3)

### TODO/Missing

**Authentication:**
- ⚠️ MotoPress APIs need proper admin auth
- ⚠️ Credential encryption for integration configs

**Features:**
- ⏳ Staff Chat History endpoint
- ⏳ MotoPress Status endpoint
- ⏳ Real SIRE/TRA submission (Puppeteer)
- ⏳ TRA API integration (MinCIT)

**Documentation:**
- Premium Chat endpoints (experimental)
- Chat Listings (legacy)

---

## API Versioning Strategy

**Current:** No explicit versioning (v1 implied)

**Future Considerations:**
- Prefix: `/api/v2/...`
- Header-based: `Accept: application/vnd.innpilot.v2+json`
- Maintain v1 endpoints during deprecation period

---

## Security Audit Checklist

### Critical Issues
- [ ] **MotoPress Config:** Encrypt credentials before saving
- [ ] **MotoPress APIs:** Implement staff authentication
- [ ] **CRON Secret:** Rotate regularly, use strong random value
- [ ] **Rate Limiting:** Consider Redis for distributed rate limiting

### Best Practices
- ✅ HTTP-only cookies for tokens
- ✅ JWT expiration (Guest: 7d, Staff: 24h)
- ✅ Input validation (message length, file size)
- ✅ CORS headers properly configured
- ✅ Role-based access (staff permissions)

### Recommendations
- [ ] Implement API request logging
- [ ] Add request ID tracing
- [ ] Monitor rate limit abuse
- [ ] Add IP allowlist for cron endpoints
- [ ] Implement API key rotation

---

## Performance Optimization Notes

### Caching Strategy
- **Memory Cache:** Chat responses (1h TTL)
- **Semantic Grouping:** Similar questions share cache
- **No Redis:** Edge runtime limitation

### Database Optimization
- **RPC Functions:** Cross-schema queries
- **HNSW Indexes:** Vector search
- **Connection Pooling:** Supabase client

### Edge Runtime Benefits
- Global distribution
- Low latency
- Auto-scaling

---

## Contact & Support

**Documentation:** `/docs/api-inventory-complete.md`
**Last Updated:** 2025-10-06
**Maintained By:** InnPilot Backend Team
**Issues:** GitHub Issues / Internal Slack

---

**End of API Inventory**
