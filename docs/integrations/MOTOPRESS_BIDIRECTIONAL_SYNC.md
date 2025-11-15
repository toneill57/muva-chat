# MotoPress Bidirectional Sync - Investigation Report

**Date:** October 2025
**Status:** ✅ Read/Write capabilities confirmed with existing credentials

---

## Executive Summary

The current MotoPress integration uses WooCommerce REST API credentials (Consumer Key + Secret) that **already have full write permissions**. No additional Application Password is required for bidirectional synchronization.

---

## Authentication Investigation

### Credentials Required

**Both credentials are mandatory for write operations:**

| Credential | Type | Purpose | Write Permission |
|------------|------|---------|------------------|
| Consumer Key | `ck_...` | Username | ❌ Alone: "Not allowed to edit" |
| Consumer Secret | `cs_...` | Password | ❌ Alone: "Unknown username" |
| **Both Combined** | Basic Auth | Full access | ✅ **Write enabled** |

### Authentication Format

```typescript
// Current implementation (works for both read + write)
const credentials = Buffer.from(`${apiKey}:${consumerSecret}`).toString('base64')

headers: {
  'Authorization': `Basic ${credentials}`
}
```

### Test Results

```bash
# Test 1: Only Consumer Key
curl -X PATCH /accommodation_types/12458 -u "ck_xxx:"
# Result: ❌ "Sorry, you are not allowed to edit this resource"

# Test 2: Only Consumer Secret
curl -X PATCH /accommodation_types/12458 -u ":cs_xxx"
# Result: ❌ "Nombre de usuario desconocido"

# Test 3: Both credentials
curl -X PATCH /accommodation_types/12458 -u "ck_xxx:cs_xxx"
# Result: ✅ Success - Returns updated accommodation object
```

---

## API Capabilities Discovered

### Allowed HTTP Methods

API response includes `targetHints` indicating permitted operations:

```json
"_links": {
  "self": [{
    "href": "https://tucasaenelmar.com/wp-json/mphb/v1/accommodation_types/12458",
    "targetHints": {
      "allow": ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
  }]
}
```

### Supported Operations

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/accommodation_types` | List accommodations | ✅ Implemented |
| GET | `/accommodation_types/{id}` | Get single accommodation | ✅ Implemented |
| GET | `/rates` | List pricing rates | ✅ Implemented |
| **POST** | `/accommodation_types` | **Create new accommodation** | 🔧 Not implemented |
| **PUT** | `/accommodation_types/{id}` | **Replace accommodation** | 🔧 Not implemented |
| **PATCH** | `/accommodation_types/{id}` | **Update accommodation** | 🔧 Not implemented |
| **DELETE** | `/accommodation_types/{id}` | **Delete accommodation** | 🔧 Not implemented |

---

## Write Operations Tested

### PATCH Request Example

**Request:**
```bash
curl -X PATCH \
  'https://tucasaenelmar.com/wp-json/mphb/v1/accommodation_types/12458' \
  -u 'ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9' \
  -H 'Content-Type: application/json' \
  -d '{"status":"publish"}'
```

**Response:**
```json
{
  "id": 12458,
  "status": "publish",
  "title": "Haines Cay DOBLE",
  "description": "...",
  "excerpt": "...",
  "adults": 2,
  "children": 0,
  "amenities": [...],
  "images": [...],
  "_links": {...}
}
```

✅ **Success** - Accommodation updated without errors

---

## Editable Fields

Based on API response structure, the following fields can be modified:

### Basic Information
- ✅ `title` - Accommodation name
- ✅ `description` - Full HTML description
- ✅ `excerpt` - Short description (clean text)
- ✅ `status` - publish, draft, private

### Capacity & Configuration
- ✅ `adults` - Maximum adults
- ✅ `children` - Maximum children
- ✅ `bed_type` - Bed configuration description
- ✅ `size` - Size in m²
- ✅ `view` - View description

### Features
- ✅ `amenities` - Array of amenity objects `{id, name}`
- ✅ `categories` - Category assignments
- ✅ `tags` - Tag assignments

### Media
- ✅ `images` - Array of image objects `{id, src, title, alt}`
- ⚠️ Image upload requires separate endpoint (WordPress media API)

### Pricing
- ⚠️ Rates updated via `/rates` endpoint (separate from accommodations)

---

## Implementation Plan (Not Executed)

### Phase 1: Write Methods in MotoPresClient

```typescript
// src/lib/integrations/motopress/client.ts

async updateAccommodation(
  id: number,
  data: Partial<MotoPresAccommodation>
): Promise<MotoPresApiResponse<MotoPresAccommodation>> {
  return this.makeRequest<MotoPresAccommodation>(
    `/accommodation_types/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  )
}

async createAccommodation(
  data: Omit<MotoPresAccommodation, 'id'>
): Promise<MotoPresApiResponse<MotoPresAccommodation>> {
  return this.makeRequest<MotoPresAccommodation>(
    `/accommodation_types`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )
}

async deleteAccommodation(id: number): Promise<MotoPresApiResponse<void>> {
  return this.makeRequest<void>(
    `/accommodation_types/${id}`,
    { method: 'DELETE' }
  )
}

async updateRate(
  id: number,
  data: Partial<MotoPresRate>
): Promise<MotoPresApiResponse<MotoPresRate>> {
  return this.makeRequest<MotoPresRate>(
    `/rates/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    }
  )
}
```

### Phase 2: API Routes

```typescript
// PUT /api/integrations/motopress/accommodations/[id]/route.ts
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data } = await request.json()
  const client = new MotoPresClient({...})

  const response = await client.updateAccommodation(
    parseInt(params.id),
    data
  )

  return NextResponse.json(response)
}
```

### Phase 3: UI Components

```typescript
// src/components/integrations/motopress/AccommodationEditor.tsx
- Description editor (rich text)
- Capacity controls (adults, children)
- Amenities manager (add/remove)
- Image uploader/manager
- Price editor (via rates endpoint)
```

### Phase 4: Conflict Resolution

**Problem:** Concurrent edits in WordPress and MUVA Chat

**Solution:**
1. Track `modified` timestamp from API
2. Before write, verify timestamp matches last known value
3. If mismatch:
   - Show diff of changes
   - Options: "Overwrite", "Merge", "Cancel"

---

## Credentials Storage

**Current storage (already implemented):**

```sql
-- Table: integration_configs
config_data JSONB {
  "api_key": "ck_...",        -- Consumer Key (encrypted)
  "consumer_secret": "cs_...", -- Consumer Secret (encrypted)
  "site_url": "https://..."
}
```

✅ No schema changes needed - credentials already support write operations

---

## Security Considerations

### Current Implementation
- ✅ Credentials encrypted in database
- ✅ Decrypted only in server-side API routes
- ✅ Never exposed to client
- ✅ Admin auth required to access integration endpoints

### Additional Safeguards for Write
1. **Audit logging** - Log all write operations (who, what, when)
2. **Dry-run mode** - Preview changes before applying
3. **Rollback capability** - Store previous values before update
4. **Rate limiting** - Prevent accidental mass updates

---

## Use Cases for Bidirectional Sync

### Scenario 1: Centralized Management
- Edit descriptions once in MUVA Chat
- Changes sync to WordPress automatically
- Avoid duplicate data entry

### Scenario 2: AI-Enhanced Descriptions
- Use Claude AI to improve descriptions
- Apply edits directly to WordPress
- Maintain single source of truth

### Scenario 3: Bulk Updates
- Update multiple accommodations at once
- Standardize amenities formatting
- Batch price adjustments

### Scenario 4: Dynamic Pricing
- Adjust prices based on analytics
- Sync to WordPress in real-time
- Reflect changes on booking site

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Concurrent edits | Data loss | Timestamp validation + conflict UI |
| Accidental deletion | Lost data | Soft delete + confirmation prompts |
| API rate limits | Sync failures | Exponential backoff + queue system |
| Permission escalation | Security breach | Audit logs + admin-only access |
| Malformed data | Validation errors | Client-side + server-side validation |

---

## Next Steps (When Implementing)

1. ✅ **Document capabilities** (this file) ← DONE
2. 🔧 Add write methods to `MotoPresClient`
3. 🔧 Create PUT/PATCH API routes
4. 🔧 Build UI editor components
5. 🔧 Implement conflict resolution
6. 🔧 Add audit logging
7. 🧪 Test with non-production data
8. 🚀 Deploy to production with feature flag

---

## References

- **MotoPress API Docs:** `/wp-json/mphb/v1` endpoints
- **WordPress REST API Auth:** Basic Auth with WooCommerce credentials
- **Current Client:** `src/lib/integrations/motopress/client.ts`
- **Data Mapper:** `src/lib/integrations/motopress/data-mapper.ts`
- **Sync Manager:** `src/lib/integrations/motopress/sync-manager.ts`

---

**Conclusion:** Bidirectional sync is **technically feasible with existing credentials**. Implementation requires UI development and conflict resolution strategy. No additional authentication setup needed.
