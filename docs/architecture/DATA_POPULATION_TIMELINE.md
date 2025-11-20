# Data Population Timeline - MUVA Chat

**Status:** Active Architecture Documentation (⚠️ Partially Outdated - See Warning Below)
**Last Updated:** November 18, 2025
**Database:** iyeueszchbvlutlcmvcb (DEV branch)
**Tenant Example:** Simmer Down (d6685692-e2a5-4f7f-bdfd-28e3cab025fb)

---

> ## ⚠️ CRITICAL DOCUMENTATION INACCURACY WARNING
>
> **Issue Discovered:** November 19, 2025
>
> **Affected Sections:**
> - Line 295: `accommodation_unit_id` FK description
> - Line 340: `reservation_accommodations.accommodation_unit_id` FK target
> - Line 849: "Foreign key target for guest_reservations"
>
> **Problem:**
> This document states that BOTH `guest_reservations.accommodation_unit_id` AND `reservation_accommodations.accommodation_unit_id` point to `hotels.accommodation_units.id`.
>
> **Reality (verified via database inspection):**
> - `guest_reservations.accommodation_unit_id` → `hotels.accommodation_units.id` ✅ (CORRECT)
> - `reservation_accommodations.accommodation_unit_id` → `accommodation_units_public.unit_id` ❌ (DOCUMENTED INCORRECTLY)
>
> **Impact:**
> Following this documentation led to FK constraint violations during MotoPress sync implementation. The two FKs point to DIFFERENT tables with DIFFERENT UUIDs for the same accommodation.
>
> **Resolution:**
> See **[ADR-001: Dual-Table FK Architecture](./ADR-001-RESERVATION-FK-DUAL-TABLE-ARCHITECTURE.md)** for:
> - Complete problem analysis
> - Database reality vs documentation discrepancy
> - Implemented solution (RPC returns both IDs)
> - 7 migration attempts that led to correct fix
>
> **Document Status:**
> This document is retained for historical reference and contains valuable workflow information. However, FK architecture details in STEP 3 should be cross-referenced with ADR-001 for accuracy.

---

## Overview

Este documento describe el **flujo secuencial completo** de cómo se pueblan las tablas de la base de datos en MUVA Chat, desde la creación de un tenant hasta que un huésped tiene su primera conversación.

**Propósito:**
- Guía de referencia para desarrolladores nuevos
- Documentación de arquitectura de datos
- Manual de troubleshooting (identificar qué paso falló)
- Orden correcto de operaciones para setup inicial

**Alcance:**
- 6 pasos secuenciales
- 10 tablas pobladas
- 294 filas totales (ejemplo: Simmer Down tenant)

---

## Database Environment

- **Project ID:** hsuvapubxwgmtmuclahd
- **Environment:** Development (dev branch)
- **Region:** us-west-1
- **PostgreSQL:** 15.x with pgvector extension
- **Date:** November 18, 2025

---

## STEP 1: Create Tenant

**API Endpoint:** `POST /api/signup`
**Code Location:** `src/app/api/signup/route.ts`
**User Action:** Owner signs up and creates a new tenant account

### Tables Populated (in order)

#### 1. **tenant_registry** (1 row)
Creates the main tenant record with subdomain and configuration.

**Key Fields:**
- `tenant_id` (UUID) - Primary identifier
- `subdomain` (varchar) - URL slug (e.g., "simmerdown")
- `nit` (varchar) - Tax ID for SIRE compliance
- `razon_social` (varchar) - Legal business name
- `nombre_comercial` (varchar) - Commercial name
- `schema_name` (varchar) - Database schema (reserved for future multi-schema)
- `tenant_type` (varchar) - 'hotel', 'hostel', 'airbnb', etc.
- `is_active` (boolean) - Account status
- `subscription_tier` (varchar) - 'free', 'basic', 'premium'
- `features` (JSONB) - Feature flags:
  ```json
  {
    "muva_access": true,
    "guest_chat_enabled": true,
    "search_mode": "hotel"
  }
  ```

**Sample Data (Simmer Down):**
```sql
tenant_id: d6685692-e2a5-4f7f-bdfd-28e3cab025fb
subdomain: simmerdown
tenant_type: hotel
subscription_tier: premium
```

#### 2. **hotels** (1 row)
Creates default hotel property for the tenant.

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar FK) - Links to tenant_registry
- `name` (varchar) - Hotel name
- `description` (text) - Property description
- `contact_info` (JSONB) - Phone, email, address
- `status` (varchar) - 'active', 'inactive'

#### 3. **staff_users** (1 row)
Creates the admin user with hashed password.

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar FK) - Links to tenant_registry
- `username` (varchar) - Login username
- `password_hash` (varchar) - bcrypt hash
- `full_name` (varchar) - Display name
- `email` (varchar) - Contact email
- `role` (varchar) - 'admin', 'staff', 'viewer'
- `permissions` (JSONB) - Granular permissions
- `is_active` (boolean) - Account status

**Sample Data (Simmer Down):**
```sql
username: oneill
role: admin
permissions: { "can_manage_users": true, "can_sync": true, ... }
```

#### 4. **integration_configs** (1 row)
Creates placeholder MotoPress integration config (inactive by default).

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar FK) - Links to tenant_registry
- `integration_type` (varchar) - 'motopress', 'airbnb', 'whatsapp'
- `is_active` (boolean) - Initially false
- `config_data` (JSONB) - API credentials (empty until configured)

---

### Summary

**Rows Created:** 4 (1 + 1 + 1 + 1)
**Dependencies:** None (first step)
**Next Step:** Configure MotoPress integration, then sync accommodations

---

## STEP 2: Sync MotoPress Accommodations

**API Endpoint:** `POST /api/integrations/motopress/sync-accommodations`
**Code Location:** `src/lib/integrations/motopress/sync-manager.ts`
**User Action:** Staff clicks "Sync Accommodations" in integration settings

### Tables Populated (in order)

#### 1. **hotels.accommodation_units** (9 rows for Simmer Down)
Stores source-of-truth accommodation data in `hotels` schema.

**Key Fields:**
- `id` (UUID) - Deterministic UUID from MotoPress type_id
- `hotel_id` (UUID FK) - Links to hotels table
- `tenant_id` (varchar) - Multi-tenant isolation
- `motopress_unit_id` (int) - MotoPress instance ID (nullable)
- `motopress_type_id` (int) - MotoPress type ID (used for matching)
- `name` (varchar) - Unit name
- `description` (text) - Full description
- `short_description` (varchar) - Summary
- `capacity` (JSONB) - `{ adults: 2, children: 1, total: 3 }`
- `bed_configuration` (JSONB) - `{ king: 1, sofa_bed: 1 }`
- `view_type` (varchar) - 'ocean', 'garden', 'city'
- `tourism_features` (JSONB) - Colombian tourism-specific features
- `unique_features` (JSONB) - Property highlights
- `images` (JSONB) - Array of photo URLs
- `accommodation_mphb_type` (varchar) - Original MotoPress type slug
- `pricing` (JSONB) - Base price + currency
- `status` (varchar) - 'active', 'inactive', 'maintenance'
- `is_featured` (boolean) - Featured on homepage
- `display_order` (int) - Sort order

**Sample Data (Simmer Down - Dreamland):**
```json
{
  "id": "a77488a7-62e8-4696-a735-4e19db5f9e71",
  "name": "Dreamland",
  "motopress_type_id": 317,
  "capacity": { "adults": 2, "children": 0, "total": 2 },
  "pricing": { "base_price": 150000, "currency": "COP" },
  "status": "active"
}
```

**Technical Notes:**
- Uses RPC `exec_sql` for cross-schema INSERT (hotels schema not exposed via PostgREST)
- Deterministic UUID generation: `uuid_generate_v5(namespace, motopress_type_id::text)`
- Pricing fetched via separate `getAllRates()` API call before insertion
- Handles multi-room types (9 different accommodation types for Simmer Down)

#### 2. **accommodation_units_public** (49 rows for Simmer Down)
Stores semantic chunks with embeddings for vector search.

**Chunking Strategy:**
Each accommodation (9 units) is divided into ~5-7 chunks:
1. **Overview** - Name + description
2. **Capacity & Beds** - Guest capacity + bed configuration
3. **Amenities** - Features list
4. **Location & View** - View type + unique features
5. **Pricing** - Rate information
6. **Images** - Photo URLs
7. **Features** - Tourism-specific features

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar) - Multi-tenant isolation
- `name` (varchar) - Chunk title (e.g., "Dreamland - Overview")
- `unit_number` (varchar) - Unit identifier
- `unit_type` (varchar) - 'apartment', 'room', 'suite'
- `description` (text) - Chunk content
- `short_description` (varchar) - Summary
- `amenities` (JSONB) - Features array
- `pricing` (JSONB) - Rate info
- `photos` (JSONB) - Images array
- `metadata` (JSONB) - Chunk metadata:
  ```json
  {
    "motopress_unit_id": "307",
    "original_accommodation": "Summertime",
    "section_type": "overview",
    "display_order": "1",
    "capacity": { "adults": 2 },
    "view_type": "ocean"
  }
  ```
- `embedding_fast` (vector 1024) - Matryoshka Tier 1 (fast search)
- `embedding` (vector 1536) - Matryoshka Tier 2 (full precision)
- `is_active` (boolean) - Visibility flag
- `is_bookable` (boolean) - Reservation flag

**Embeddings:**
- Generated via OpenAI API: `text-embedding-3-large` model
- Tier 1 (1024d): Fast search, lower precision
- Tier 2 (1536d): Full precision, slower search
- HNSW indexes for vector similarity search: `<=>` (cosine distance)
- Average processing: 49 chunks × ~2 seconds = ~98 seconds total

**Sample Chunk (Dreamland - Overview):**
```sql
name: "Dreamland - Overview"
description: "Dreamland is a cozy 2-person apartment with ocean views..."
metadata: {
  "section_type": "overview",
  "motopress_type_id": 317,
  "display_order": "1"
}
embedding_fast: [0.123, 0.456, ...] (1024 dimensions)
```

**Used By:**
- `match_accommodations_public(query_embedding, tenant_id, threshold, count)`
- `match_accommodations_hybrid(query_fast, query_balanced, tenant_id, threshold, count)`
- Public chat semantic search (`/with-me`)

#### 3. **sync_history** (1 row per sync)
Logs sync operation metadata.

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar FK)
- `integration_type` (varchar) - 'motopress'
- `sync_type` (varchar) - 'manual', 'scheduled', 'webhook'
- `status` (varchar) - 'success', 'failed', 'partial'
- `records_processed` (int) - Total records fetched
- `records_created` (int) - New records inserted
- `records_updated` (int) - Existing records modified
- `error_message` (text) - Error details if failed
- `metadata` (JSONB) - Additional sync info
- `started_at` (timestamptz)
- `completed_at` (timestamptz)

---

### Summary

**Rows Created:** 59 (9 + 49 + 1)
**Processing Time:** ~2 minutes (API calls + embedding generation)
**Dependencies:** Requires Step 1 (hotels table must exist)
**Next Step:** Sync reservations from MotoPress bookings

---

## STEP 3: Sync Reservations

**API Endpoint:** `GET /api/integrations/motopress/sync-all` (SSE streaming)
**Code Location:**
- API: `src/app/api/integrations/motopress/sync-all/route.ts`
- Mapper: `src/lib/integrations/motopress/bookings-mapper.ts`

**User Action:** Staff clicks "Sync All" to fetch reservations from MotoPress

### Tables Populated (in order)

#### 1. **guest_reservations** (101 rows for Simmer Down)
Main reservation table storing booking details.

**Key Fields:**
- `id` (UUID) - Auto-generated
- `tenant_id` (varchar) - Multi-tenant isolation
- `guest_name` (varchar) - Customer full name
- `phone_full` (varchar) - Complete phone number
- `phone_last_4` (varchar) - Last 4 digits (for guest login)
- `check_in_date` (date) - Arrival date
- `check_out_date` (date) - Departure date
- `check_in_time` (time) - Check-in hour
- `check_out_time` (time) - Check-out hour
- `reservation_code` (varchar) - Booking reference
- `status` (varchar) - 'active', 'pending_payment', 'cancelled', 'completed'
- `accommodation_unit_id` (UUID FK) - First room (legacy field)
- `guest_email` (varchar) - Contact email
- `guest_country` (varchar) - Nationality
- `adults` (int) - Adult guest count
- `children` (int) - Child guest count
- `total_price` (decimal) - Total booking price
- `currency` (varchar) - 'COP', 'USD'
- `booking_source` (varchar) - 'motopress', 'mphb-airbnb'
- `external_booking_id` (varchar) - MotoPress booking ID
- `booking_notes` (text) - Special requests

**SIRE Compliance Fields (null for MotoPress imports):**
- `document_type` (varchar) - ID type
- `document_number` (varchar) - ID number
- `birth_date` (date)
- `first_surname` (varchar)
- `second_surname` (varchar)
- `given_names` (varchar)
- `nationality_code` (varchar) - ISO 3166-1

**Status Mapping:**
- `confirmed` → `active`
- `pending-payment` → `pending_payment`
- `cancelled` → `cancelled`

**Sample Data (Simmer Down):**
```json
{
  "id": "68fb09d3-9717-4f17-b06f-3146a6f2a48b",
  "guest_name": "John Doe",
  "phone_last_4": "1234",
  "check_in_date": "2025-12-15",
  "check_out_date": "2025-12-20",
  "status": "active",
  "booking_source": "motopress",
  "external_booking_id": "12345"
}
```

#### 2. **reservation_accommodations** (107 rows for Simmer Down)
Junction table linking reservations to accommodations (multi-room support).

**Key Fields:**
- `id` (UUID) - Auto-generated
- `reservation_id` (UUID FK) - Links to guest_reservations
- `accommodation_unit_id` (UUID FK) - Links to hotels.accommodation_units
- `motopress_accommodation_id` (int) - MotoPress instance ID
- `motopress_type_id` (int) - MotoPress type ID
- `room_rate` (decimal) - Price for this specific room

**Multi-Room Support:**
- 101 reservations → 107 rows = **6 multi-room bookings**
- Enables 1 reservation to link to multiple accommodation units
- Example: Guest books "Dreamland" + "Kaya" simultaneously

**Sample Data (Multi-Room Booking):**
```sql
-- Reservation 68fb09d3-9717-4f17-b06f-3146a6f2a48b has 2 rooms:
Row 1: { reservation_id: ..., accommodation_unit_id: dreamland_id, room_rate: 150000 }
Row 2: { reservation_id: ..., accommodation_unit_id: kaya_id, room_rate: 180000 }
```

**Auto-Create Logic:**
If `motopress_type_id` not found in `hotels.accommodation_units`:
- Calls RPC `create_accommodation_unit()` to auto-create missing unit
- Prevents FK constraint violations
- Ensures referential integrity

---

### Data Flow

```
MotoPress API Bookings
    ↓
MotoPresBookingsMapper.mapBookings()
    ↓
Upsert to guest_reservations (by external_booking_id)
    ↓
For each reserved_accommodations[]:
    ↓
    RPC: get_accommodation_unit_by_motopress_id(type_id)
    ↓
    Insert to reservation_accommodations (junction table)
```

### Summary

**Rows Created:** 208 (101 + 107)
**Processing Time:** ~30 seconds (API pagination + mapping)
**Dependencies:** Requires Step 2 (hotels.accommodation_units must exist)
**Multi-Room Support:** 6 bookings with 2+ rooms
**Next Step:** Upload accommodation manuals for guest knowledge

---

## STEP 4: Upload Accommodation Manuals

**API Endpoint:** `POST /api/accommodation-manuals/[unitId]`
**Code Location:** `src/app/api/accommodation-manuals/[unitId]/route.ts`
**User Action:** Staff uploads `.md` manual file through UI (max 10MB)

**Example URL:** `http://simmerdown.localhost:3000/accommodations/units/dreamland`

### Tables Populated (in order)

#### 1. **accommodation_manuals** (1 row for Simmer Down)
Metadata record for uploaded manual.

**Key Fields:**
- `id` (UUID) - Auto-generated
- `accommodation_unit_id` (UUID FK) - Links to hotels.accommodation_units
- `tenant_id` (varchar) - Multi-tenant isolation
- `filename` (varchar) - Original file name (e.g., "dreamland-manual.md")
- `file_type` (varchar) - 'md' (markdown)
- `status` (varchar) - 'processing' → 'completed' or 'failed'
- `chunk_count` (int) - Number of chunks created
- `processed_at` (timestamptz) - Completion timestamp
- `error_message` (text) - Error details if failed

**Processing Flow:**
1. Create record with `status: 'processing'`
2. Parse markdown + generate embeddings
3. Update to `status: 'completed'` + set `chunk_count`
4. If error, update to `status: 'failed'` + set `error_message`

**Sample Data (Simmer Down - Dreamland):**
```json
{
  "id": "98bf1140-6dab-46b0-95ce-2d31a4e0897c",
  "accommodation_unit_id": "a77488a7-62e8-4696-a735-4e19db5f9e71",
  "filename": "dreamland-manual.md",
  "status": "completed",
  "chunk_count": 19,
  "processed_at": "2025-11-18T17:49:44.095Z"
}
```

#### 2. **accommodation_units_manual_chunks** (19 rows for Simmer Down)
Semantic chunks from markdown manual with triple-tier embeddings.

**Chunking Strategy:**
- Split by markdown headers (`## Section Title`)
- Each section = 1 chunk
- Variable size: 200-1400 characters (semantic boundaries)
- Preserves context within sections

**Example Sections (Dreamland Manual):**
1. Información de Llegada
2. Acceso y Claves (Edificio: C8712, Habitación: 2684)
3. Conectividad (WiFi passwords)
4. Climatización (A/C instructions)
5. Mini-Cocina y Electrodomésticos
6. Entretenimiento (TV, streaming)
7. Seguridad (Safe box codes)
8. Emergencias (Contact numbers)
9. Tips Específicos

**Key Fields:**
- `id` (UUID) - Auto-generated
- `manual_id` (UUID FK) - Links to accommodation_manuals
- `accommodation_unit_id` (UUID FK) - Links to hotels.accommodation_units
- `tenant_id` (varchar) - Multi-tenant isolation
- `chunk_content` (text) - Section content
- `chunk_index` (int) - Order in manual (0-based)
- `total_chunks` (int) - Total count (for pagination)
- `section_title` (varchar) - Header text
- `embedding` (vector 3072) - Matryoshka Tier 3 (full precision)
- `embedding_balanced` (vector 1536) - Matryoshka Tier 2 (balanced)
- `embedding_fast` (vector 1024) - Matryoshka Tier 1 (fast search)

**Triple-Tier Matryoshka Embeddings:**
- **Tier 3 (3072d):** Full precision, highest quality, slower search
- **Tier 2 (1536d):** Balanced precision/speed
- **Tier 1 (1024d):** Fast search, lower precision (used by guest chat)

**Embedding Generation:**
- Model: OpenAI `text-embedding-3-large`
- Rate limit: 100ms delay between API calls
- Processing time: 19 chunks × ~0.9s = ~17 seconds total

**Sample Chunk:**
```json
{
  "chunk_index": 2,
  "total_chunks": 19,
  "section_title": "Conectividad {#wifi}",
  "chunk_content": "Red WiFi: SimmerDown-5G\nContraseña: *********\n...",
  "embedding": [0.123, 0.456, ...],      // 3072 dimensions
  "embedding_balanced": [0.123, ...],    // 1536 dimensions
  "embedding_fast": [0.123, ...]         // 1024 dimensions
}
```

**Security:**
- RLS enabled (tenant isolation)
- Private data (WiFi passwords, safe codes)
- Only accessible to authenticated guests of that specific unit
- Never exposed in public chat (`/with-me`)

**Used By:**
- `match_unit_manual_chunks(query_embedding, unit_id, threshold, count)`
- Guest chat (`/my-stay`) - Private accommodation details
- Vector search uses Tier 1 (1024d) for performance

---

### Summary

**Rows Created:** 20 (1 + 19)
**Processing Time:** ~17 seconds (embedding generation)
**File Format:** Markdown (.md only)
**Max File Size:** 10MB
**Dependencies:** Requires Step 2 (hotels.accommodation_units must exist)
**Security:** Tenant ownership validated before upload
**Next Step:** Guest logs into MyStay portal

---

## STEP 5: Guest Logs into MyStay

**Route:** `/my-stay` (subdomain-based)
**Code Location:**
- Page: `src/app/my-stay/page.tsx`
- Auth: `src/lib/guest-auth.ts`

**User Action:** Guest enters check-in date + phone last 4 digits

### Tables Populated

**NONE** - This is a read-only authentication flow.

### Authentication Flow

#### 1. Tenant Resolution
- Client reads `tenant_subdomain` cookie (set by middleware)
- Calls `POST /api/tenant/resolve` to get `tenant_id` from subdomain
- Example: `simmerdown` → `d6685692-e2a5-4f7f-bdfd-28e3cab025fb`

#### 2. Guest Login Form
User submits:
- `check_in_date` (YYYY-MM-DD format)
- `phone_last_4` (last 4 digits of phone number)

#### 3. Database Lookup
`authenticateGuest()` queries `guest_reservations`:
```sql
SELECT * FROM guest_reservations
WHERE tenant_id = ?
  AND check_in_date = ?
  AND phone_last_4 = ?
  AND status = 'active'
LIMIT 1;
```

#### 4. Multi-Room Resolution
If guest has multiple rooms:
```sql
-- Get all rooms for this reservation
SELECT au.*
FROM reservation_accommodations ra
JOIN hotels.accommodation_units au ON au.id = ra.accommodation_unit_id
WHERE ra.reservation_id = ?
ORDER BY au.display_order;
```

#### 5. JWT Token Generation
If match found, generate JWT with session data:
```json
{
  "reservation_id": "68fb09d3-9717-4f17-b06f-3146a6f2a48b",
  "tenant_id": "d6685692-e2a5-4f7f-bdfd-28e3cab025fb",
  "guest_name": "John Doe",
  "check_in": "2025-12-15",
  "check_out": "2025-12-20",
  "reservation_code": "SIMM-12345",
  "accommodation_unit": {  // First room (legacy)
    "id": "a77488a7-62e8-4696-a735-4e19db5f9e71",
    "name": "Dreamland"
  },
  "accommodation_units": [  // All rooms (multi-room support)
    { "id": "...", "name": "Dreamland" },
    { "id": "...", "name": "Kaya" }
  ],
  "tenant_features": {
    "muva_access": true
  }
}
```

**Token Storage:**
- HTTP-only cookie (`guest_session`)
- localStorage (`guestSession`) - for client-side access
- Expiry: 7 days
- Signed with `JWT_SECRET` from `.env.local`

#### 6. Session Validation
On subsequent requests:
```typescript
// Middleware validates JWT from cookie or Authorization header
const session = verifyGuestToken(token)
if (!session) redirect('/my-stay') // Force re-login
```

---

### Summary

**Rows Created:** 0 (read-only)
**Database Queries:** 2-3 (reservation lookup + accommodation details)
**Processing Time:** <100ms
**Dependencies:** Requires Step 3 (guest_reservations must exist)
**Security:** JWT-based session, 7-day expiry
**Next Step:** Guest starts a conversation

---

## STEP 6: Guest Has a Conversation

**API Endpoints:**
- Create conversation: `POST /api/guest/conversations`
- Send message: `POST /api/guest/chat`

**Code Location:**
- Create: `src/app/api/guest/conversations/route.ts`
- Chat: `src/app/api/guest/chat/route.ts`

**User Action:** Guest types message in chat interface

### Tables Populated (in order)

#### 1. **guest_conversations** (1 row for Simmer Down)
Created on first message, stores conversation metadata.

**Key Fields:**
- `id` (UUID) - Auto-generated (conversation_id)
- `guest_id` (UUID) - Links to guest_reservations.id
- `tenant_id` (varchar) - Multi-tenant isolation
- `title` (varchar) - First user message (truncated to 50 chars)
- `last_message` (text) - Preview of last message
- `message_count` (int) - Total messages (user + assistant)
- `last_activity_at` (timestamptz) - Last message timestamp
- `created_at` (timestamptz) - Conversation start time
- `updated_at` (timestamptz) - Last modified time
- `compressed_history` (JSONB) - Memory blocks (if > 20 messages)
- `favorites` (JSONB) - Saved messages
- `is_archived` (boolean) - Archive status
- `archived_at` (timestamptz) - Archive timestamp

**Sample Data (Simmer Down):**
```json
{
  "id": "9dd1c351-0c9d-41bd-8db8-5410d1679bf6",
  "guest_id": "68fb09d3-9717-4f17-b06f-3146a6f2a48b",
  "title": "claves",
  "last_message": "claves",
  "message_count": 2,
  "created_at": "2025-11-18T17:55:50.659Z",
  "last_activity_at": "2025-11-18T17:56:01.443Z"
}
```

#### 2. **chat_messages** (2 rows for Simmer Down)
Stores all chat messages (user questions + assistant responses).

**Key Fields:**
- `id` (UUID) - Auto-generated
- `conversation_id` (UUID FK) - Links to guest_conversations
- `role` (varchar) - 'user' or 'assistant'
- `content` (text) - Message text
- `entities` (JSONB) - Extracted entities (dates, prices, names)
- `sources` (JSONB) - Retrieved context chunks (for citations)
- `metadata` (JSONB) - Response metadata:
  ```json
  {
    "confidence": 0.92,
    "followUpSuggestions": ["¿Cómo funciona el WiFi?", "¿Dónde está la caja fuerte?"],
    "search_results": 3
  }
  ```
- `tenant_id` (varchar) - Multi-tenant isolation
- `created_at` (timestamptz) - Message timestamp

**Sample Exchange (Simmer Down):**
```sql
-- User message
{
  "id": "17f7fd76-a415-4cc6-83e0-91f75e39beb9",
  "role": "user",
  "content": "claves",
  "created_at": "2025-11-18T17:55:55.423Z"
}

-- Assistant response
{
  "id": "093ea0e1-2ed9-457a-b72b-7555be86fda8",
  "role": "assistant",
  "content": "🔑 Tus Claves de Acceso\n\nEdificio: C8712\nTu Habitación Dreamland: 2684\n...",
  "sources": [
    {
      "chunk_content": "Acceso y Claves\nEdificio: C8712...",
      "section_title": "Acceso y Claves",
      "similarity": 0.89
    }
  ],
  "metadata": {
    "confidence": 0.92,
    "search_results": 3
  },
  "created_at": "2025-11-18T17:56:01.273Z"
}
```

---

### Chat Flow (POST /api/guest/chat)

#### 1. Verify Authentication
- Extract JWT from cookie or `Authorization` header
- Validate token signature and expiry
- Extract `reservation_id`, `tenant_id`, `accommodation_units[]`

#### 2. Validate Conversation Ownership
```sql
SELECT * FROM guest_conversations
WHERE id = ? AND guest_id = ? AND tenant_id = ?;
```
If not found → 403 Forbidden

#### 3. Insert User Message
```sql
INSERT INTO chat_messages (conversation_id, role, content, tenant_id)
VALUES (?, 'user', ?, ?);
```

#### 4. Load Conversation History
```sql
SELECT role, content, created_at
FROM chat_messages
WHERE conversation_id = ?
ORDER BY created_at DESC
LIMIT 10;
```

#### 5. Generate Conversational Response

**Vector Search (Parallel):**
- Search `accommodation_units_public` (public info)
- Search `accommodation_units_manual_chunks` (private manual)
- Uses Tier 1 (1024d) embeddings for speed
- Cosine similarity threshold: 0.25 (lower = more permissive)

**LLM Generation:**
- Model: Claude Haiku 4.5
- Context: Last 10 messages + retrieved chunks
- Max tokens: 800
- Temperature: 0.7

**Sample Vector Search:**
```sql
-- Search manual chunks for "claves"
SELECT
  chunk_content,
  section_title,
  1 - (embedding_fast <=> query_embedding) as similarity
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = 'a77488a7-62e8-4696-a735-4e19db5f9e71'
  AND tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb'
  AND 1 - (embedding_fast <=> query_embedding) > 0.25
ORDER BY embedding_fast <=> query_embedding
LIMIT 5;

-- Results:
-- 1. "Acceso y Claves" (similarity: 0.89)
-- 2. "Información de Llegada" (similarity: 0.67)
-- 3. "Seguridad" (similarity: 0.54)
```

#### 6. Insert Assistant Response
```sql
INSERT INTO chat_messages (conversation_id, role, content, entities, sources, metadata, tenant_id)
VALUES (?, 'assistant', ?, ?, ?, ?, ?);
```

#### 7. Update Conversation Metadata
```sql
UPDATE guest_conversations
SET message_count = message_count + 2,
    last_activity_at = NOW(),
    last_message = ?,
    updated_at = NOW()
WHERE id = ?;
```

#### 8. Auto-Compact (if > 20 messages)
- Creates memory blocks (JSONB summary)
- Moves to `compressed_history` field
- Deletes old messages to save space
- Preserves recent context for continuity

---

### Summary

**Rows Created:** 3 (1 conversation + 2 messages)
**Processing Time:** ~5 seconds (vector search + LLM generation)
**Dependencies:**
- Step 5: Guest session (JWT authentication)
- Step 2: accommodation_units_public (semantic search)
- Step 4: accommodation_units_manual_chunks (private info)

**Vector Search Performance:**
- Tier 1 (1024d) embeddings: <100ms
- HNSW index: 49 chunks + 19 manual chunks = 68 total searchable
- Parallel search: 2 concurrent queries

**Security:**
- Guest can only access their own accommodation(s)
- RLS enforced via tenant_id + accommodation_unit_id
- JWT validates reservation ownership

---

## Summary Table - Complete Timeline

| Step | Action | Tables Populated | Simmer Down Rows | Dependencies |
|------|--------|------------------|------------------|--------------|
| 1 | Create Tenant | tenant_registry, hotels, staff_users, integration_configs | 4 | None |
| 2 | Sync Accommodations | hotels.accommodation_units, accommodation_units_public, sync_history | 59 | Step 1 |
| 3 | Sync Reservations | guest_reservations, reservation_accommodations | 208 | Step 2 |
| 4 | Upload Manuals | accommodation_manuals, accommodation_units_manual_chunks | 20 | Step 2 |
| 5 | Guest Login | (none - read-only) | 0 | Step 3 |
| 6 | Chat Messages | guest_conversations, chat_messages | 3 | Steps 2, 4, 5 |
| **TOTAL** | **6 steps** | **10 tables** | **294 rows** | Sequential |

---

## Key Insights

### 1. Dual-Table Pattern (Accommodations)

**⚠️ ADVERTENCIA CRÍTICA:** Los IDs entre estas dos tablas son COMPLETAMENTE DIFERENTES.
Ver `RESERVATION_LINKING_FIX_SOLUTION.md` para el problema común de foreign keys.

**Why Two Tables?**

MUVA Chat uses **two separate tables** for accommodations:

| Table | Purpose | Format | Embeddings | Row Count |
|-------|---------|--------|------------|-----------|
| `hotels.accommodation_units` | Operational data (reservations, calendar) | 1 record per unit | ❌ None | 9 |
| `accommodation_units_public` | Semantic search (chat, AI queries) | 5-7 chunks per unit | ✅ 2-tier | 49 |

**Operational Layer (`hotels.accommodation_units`):**
- Source of truth for reservations
- Foreign key target for `guest_reservations`
- Foreign key target for `calendar_events`
- Consolidated data (1 record = 1 unit)
- No embeddings (not needed for transactions)

**Semantic Layer (`accommodation_units_public`):**
- Chunked for vector search (5.4 chunks/unit average)
- Matryoshka embeddings (1024d + 1536d)
- Optimized for LLM context retrieval
- Public chat queries (`/with-me`)

**Can't We Consolidate?**

❌ **NO** - Architectural mismatch:

| Requirement | Operational | Semantic |
|-------------|-------------|----------|
| Chunk granularity | ❌ 1 record | ✅ 5-7 chunks |
| Vector search | ❌ Not needed | ✅ Required |
| Reservation FK | ✅ Direct link | ❌ Too granular |
| Storage cost | Low | High (embeddings) |

**Historical Context:**

Migration `20251109000000_single_source_of_truth_embeddings.sql` attempted to consolidate but was **abandoned**:
- 12+ RPC functions depend on chunked structure
- Manual upload API requires semantic sectioning
- 20+ hours of refactoring required
- Accepted as **permanent architecture pattern**

---

### 2. Multi-Room Support

**Evidence:**
- `guest_reservations`: 101 rows
- `reservation_accommodations`: 107 rows
- **6 extra rows = 6 multi-room bookings**

**How It Works:**

```sql
-- Guest books 2 rooms (Dreamland + Kaya)
guest_reservations:
  id: 68fb09d3-9717-4f17-b06f-3146a6f2a48b
  guest_name: John Doe
  accommodation_unit_id: dreamland_id (legacy field)

reservation_accommodations:
  Row 1: { reservation_id: ..., accommodation_unit_id: dreamland_id }
  Row 2: { reservation_id: ..., accommodation_unit_id: kaya_id }
```

**Benefits:**
- 1-to-many reservation → accommodations
- Separate pricing per room
- Flexible booking combinations
- Guest chat searches ALL their rooms

---

### 3. Embedding Strategy

**Three-Tier Matryoshka Approach:**

| Tier | Dimensions | Purpose | Used In |
|------|------------|---------|---------|
| Tier 1 (Fast) | 1024d | Quick search, lower precision | Guest chat, public chat |
| Tier 2 (Balanced) | 1536d | Balanced speed/accuracy | Public chat (fallback) |
| Tier 3 (Full) | 3072d | Maximum precision | Manual chunks (stored) |

**Performance:**
- **Step 2 (Accommodations):** 2-tier embeddings (1024d + 1536d)
  - 49 chunks × 2 embeddings = 98 API calls
  - Processing time: ~2 minutes
- **Step 4 (Manuals):** 3-tier embeddings (3072d + 1536d + 1024d)
  - 19 chunks × 3 embeddings = 57 API calls
  - Processing time: ~17 seconds

**Search Performance:**
- HNSW index on `embedding_fast` (1024d)
- Average query: <100ms (68 total chunks)
- Cosine similarity: `1 - (embedding_fast <=> query_embedding)`
- Threshold: 0.3 (public), 0.25 (guest manual)

**Cost Optimization:**
- Use Tier 1 for 90% of searches (fastest)
- Fall back to Tier 2 only if low confidence
- Tier 3 stored but rarely used (archive quality)

---

### 4. Data Dependencies

```
┌─────────────────────────────────────────────────────┐
│              STEP 1: Create Tenant                  │
│  (tenant_registry, hotels, staff_users)             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│        STEP 2: Sync Accommodations                  │
│  (hotels.accommodation_units, accommodation_units_public) │
└────────────┬───────────────────────┬─────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────────┐  ┌─────────────────────────┐
│ STEP 3: Sync           │  │ STEP 4: Upload          │
│ Reservations           │  │ Manuals                 │
│ (guest_reservations,   │  │ (manual_chunks)         │
│  reservation_accommodations) │                      │
└────────────┬───────────┘  └───────────┬─────────────┘
             │                          │
             ▼                          │
┌─────────────────────────────────────┐ │
│      STEP 5: Guest Login            │ │
│      (JWT authentication)           │ │
└────────────┬────────────────────────┘ │
             │                          │
             └──────────┬───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │   STEP 6: Chat Messages       │
        │   (guest_conversations,       │
        │    chat_messages)             │
        └───────────────────────────────┘
```

**Critical Path:**
1. **Must complete Steps 1-2** before any guest interactions
2. **Step 3** required for guest login (authentication)
3. **Step 4** optional but enhances chat quality (private info)
4. **Steps 5-6** sequential (login → chat)

**Parallel Execution:**
- Steps 3 & 4 can run in parallel (independent)
- Both depend on Step 2 (accommodation_units must exist)

---

## Testing Queries

### Verify Step 1 (Tenant Creation)
```sql
SELECT
  tr.tenant_id,
  tr.subdomain,
  tr.subscription_tier,
  h.name as hotel_name,
  su.username as admin_user,
  ic.integration_type
FROM tenant_registry tr
JOIN hotels h ON h.tenant_id = tr.tenant_id
JOIN staff_users su ON su.tenant_id = tr.tenant_id
JOIN integration_configs ic ON ic.tenant_id = tr.tenant_id
WHERE tr.subdomain = 'simmerdown';
```

### Verify Step 2 (Accommodations Sync)
```sql
-- Check embeddings populated
SELECT
  COUNT(*) as total_chunks,
  COUNT(embedding_fast) as with_fast_embedding,
  COUNT(embedding) as with_full_embedding
FROM accommodation_units_public
WHERE tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb';

-- Check operational units
SELECT COUNT(*) as operational_units
FROM hotels.accommodation_units
WHERE tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb';
```

### Verify Step 3 (Reservations Sync)
```sql
-- Check multi-room bookings
SELECT
  gr.guest_name,
  COUNT(ra.id) as room_count,
  ARRAY_AGG(au.name) as rooms
FROM guest_reservations gr
JOIN reservation_accommodations ra ON ra.reservation_id = gr.id
JOIN hotels.accommodation_units au ON au.id = ra.accommodation_unit_id
WHERE gr.tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb'
GROUP BY gr.id, gr.guest_name
HAVING COUNT(ra.id) > 1;  -- Multi-room bookings only
```

### Verify Step 4 (Manual Upload)
```sql
-- Check manual chunks with embeddings
SELECT
  am.filename,
  am.chunk_count,
  COUNT(aumc.id) as actual_chunks,
  COUNT(aumc.embedding_fast) as with_embeddings
FROM accommodation_manuals am
JOIN accommodation_units_manual_chunks aumc ON aumc.manual_id = am.id
WHERE am.tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb'
GROUP BY am.id, am.filename, am.chunk_count;
```

### Verify Step 6 (Chat Activity)
```sql
-- Check conversation activity
SELECT
  gc.title,
  gc.message_count,
  COUNT(cm.id) as actual_messages,
  gc.last_activity_at
FROM guest_conversations gc
LEFT JOIN chat_messages cm ON cm.conversation_id = gc.id
WHERE gc.tenant_id = 'd6685692-e2a5-4f7f-bdfd-28e3cab025fb'
GROUP BY gc.id;
```

---

## References

### Core Files

**Step 1: Tenant Creation**
- `src/app/api/signup/route.ts` - Signup API

**Step 2: Accommodations Sync**
- `src/lib/integrations/motopress/sync-manager.ts` - Sync orchestration
- `src/lib/integrations/motopress/semantic-chunker.ts` - Chunking logic
- `src/lib/embeddings/generator.ts` - Embedding generation

**Step 3: Reservations Sync**
- `src/app/api/integrations/motopress/sync-all/route.ts` - SSE streaming API
- `src/lib/integrations/motopress/bookings-mapper.ts` - MotoPress → DB mapping

**Step 4: Manual Upload**
- `src/app/api/accommodation-manuals/[unitId]/route.ts` - Upload API
- `src/lib/manual-processing.ts` - Markdown parsing

**Step 5: Guest Login**
- `src/app/my-stay/page.tsx` - Login page
- `src/lib/guest-auth.ts` - JWT authentication

**Step 6: Chat Messages**
- `src/app/api/guest/chat/route.ts` - Chat API
- `src/lib/conversational-chat-engine.ts` - LLM orchestration
- `src/lib/chat-engine/parallel-search.ts` - Vector search

### Documentation
- **This Document:** Data population timeline and architecture
- **Migration File:** `supabase/migrations/20251109000000_single_source_of_truth_embeddings.sql` (incomplete)

---

**Last Verified:** November 18, 2025
**Database:** iyeueszchbvlutlcmvcb (DEV branch)
**Status:** ✅ All 6 steps verified with Simmer Down tenant
**Total Rows Created:** 294 across 10 tables
