# 🚀 COMPREHENSIVE PROMPT: MotoPress Reservation Sync Unification

## 📋 Context Overview

You are working on **MUVA Chat**, a multi-tenant tourism platform with Next.js 15, TypeScript, and Supabase. The project uses a subdomain-based multi-tenant architecture where each hotel/accommodation has its own subdomain (e.g., `simmerdown.muva.chat`, `tucasamar.muva.chat`).

**Current situation:**
- There are TWO reservation sync buttons in `/accommodations/reservations` page
- Button 1: "Actualizar" (legacy method - unclear implementation)
- Button 2: "Actualizar (nuevo)" (newer method)
- A bash script `export-reservations-dynamic-embed.sh` (513 lines) contains the optimal sync logic
- **CRITICAL:** MotoPress API has limitations (documented in `docs/MOTOPRESS_API_SCRIPTS_GUIDE.md`)

**Goal:**
Replace both buttons with ONE unified sync button that implements the bash script logic in TypeScript/Next.js, storing MotoPress credentials per tenant.

---

## 🚨 CRITICAL: MotoPress API Limitations (MUST KNOW)

**From `docs/MOTOPRESS_API_SCRIPTS_GUIDE.md`:**

### ⚠️ API Limitations You MUST Understand

1. **Date filters DON'T WORK** (`after`, `before`, `date_from`)
   - The API IGNORES these parameters completely
   - Always returns ALL reservations regardless of date filter
   - **Solution:** Download all, filter client-side

2. **Maximum 100 items per page** (WordPress REST API limit)
   - Cannot request more than 100 per page
   - Must paginate for larger datasets

3. **Typical volume: 4000+ reservations** in active systems
   - This means ~40 pages to download everything
   - Performance is critical

4. **Two types of bookings returned:**
   - **Real Airbnb reservations:** Have URL + phone in `ical_description`
   - **Calendar blocks:** Show "Airbnb (Not available)", NO useful data
   - **Direct bookings:** Created in local system
   - **Mirror listings:** Synced from other platforms

### 📊 Performance Characteristics

**Script comparison (from guide):**

| Script | Speed | Completeness | When to Use |
|--------|-------|--------------|-------------|
| `export-reservations-dynamic.sh` | ⚡ Fast (~30s for 500) | Basic data only | **PRODUCTION** |
| `export-reservations-dynamic-embed.sh` | 🐌 Very Slow (10-15 min for 500) | Complete (room names) | When you have time |
| `export-reservations-enhanced.sh` | 🚀 Balanced (~45s for 500) | Complete (separate requests) | **RECOMMENDED** |

**Why `_embed` is slow:**
- Each page takes 2-3 minutes instead of seconds
- Embeds related data (room types, rates, etc.) in response
- 10x slower than without `_embed`

### 🎯 Recommended Approach (Based on Guide)

**DON'T use `_embed` parameter initially.**

Instead:
1. Download bookings fast (without `_embed`)
2. Extract unique `accommodation_type` IDs
3. Fetch room type names in separate request
4. Map locally in memory

**Example:**
```bash
# Fast: 30 seconds for 500 bookings
curl "/bookings?per_page=100&page=1"

# Slow: 2-3 minutes for same page
curl "/bookings?per_page=100&page=1&_embed=1"
```

**From the guide:** *"NO usar `_embed` a menos que sea necesario"*

---

## 🎯 Task Requirements

### Primary Goal
Create a single, unified "Sync Reservations" button that:
1. Retrieves MotoPress credentials from database (stored during initial configuration at `/accommodations/integrations`)
2. Implements the bash script logic in TypeScript
3. Fetches reservations with `_embed` parameter for complete data (room names, guest info, etc.)
4. Displays progress indication during sync
5. Shows sync results (total, created, updated, errors)
6. Maintains the existing reservation card UI from `ReservationsList.tsx`

### Key Features to Implement (OPTIMIZED VERSION)

**Based on `docs/MOTOPRESS_API_SCRIPTS_GUIDE.md` recommendations:**

**⚠️ IMPORTANT DECISION:** Do NOT use `_embed` parameter for initial implementation.

Instead, implement the **ENHANCED** approach (faster + complete):

1. **Dynamic Pagination Detection**
   - Make HEAD request to get total count: `curl -I "...?per_page=1"`
   - Extract `X-WP-Total` header
   - Calculate pages: `Math.ceil(totalBookings / 100)`
   - Show confirmation: "Found 4523 bookings across 46 pages. Continue?"

2. **Fast Data Fetching (NO `_embed`)**
   - Download 100 items per page WITHOUT `_embed`
   - Speed: ~30 seconds for 500 bookings
   - Uses: `?per_page=100&page=X&orderby=date&order=desc`
   - 250ms pause between requests
   - Retry logic: max 3 attempts, exponential backoff

3. **Room Names in Separate Request**
   - Extract unique `accommodation_type` IDs from bookings
   - Fetch room types: `GET /accommodation_types?include=335,337,340`
   - Cache room names in memory for mapping
   - Map booking → room name client-side

4. **Error Handling**
   - Validates HTTP status codes
   - Handles network errors gracefully
   - Detailed error messages
   - Cleanup on failure

5. **Data Processing**
   - Filters future confirmed reservations
   - Excludes "Airbnb (Not available)" calendar blocks
   - Maps room IDs → room names
   - Shows summary: "Real reservations: 120, Blocks excluded: 75"

**Why this is BETTER than `_embed`:**
- ✅ 10x faster (30s vs 10-15 min for 500 bookings)
- ✅ Still gets complete data (room names)
- ✅ Lower API load
- ✅ Better user experience (faster sync)

**Performance comparison:**
```
_embed approach:   10-15 minutes for 500 bookings ❌
Enhanced approach: 30-45 seconds for 500 bookings ✅
```

**Example optimized flow:**
```bash
# Step 1: Get bookings fast (30s)
./export-reservations-dynamic.sh \
  "https://simmerdown.house" \
  "ck_xxx" \
  "cs_xxx"

# Step 2: Get room types (5s)
curl "/accommodation_types?per_page=100"

# Step 3: Map locally (instant)
jq 'map room IDs to room names'
```

---

## 🗄️ Database Schema

### `integration_configs` Table
Stores MotoPress credentials (already exists):

```sql
CREATE TABLE integration_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant_registry(tenant_id),
  integration_type text NOT NULL, -- 'motopress'
  config_data jsonb NOT NULL,     -- { api_key, consumer_secret, site_url }
  is_active boolean DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, integration_type)
);
```

**Credentials are encrypted:**
- `config_data.api_key` - Encrypted consumer key (e.g., `ck_xxx`)
- `config_data.consumer_secret` - Encrypted consumer secret (e.g., `cs_xxx`)
- `config_data.site_url` - Plain text URL (e.g., `https://simmerdown.house`)

**Encryption/Decryption:**
- `/src/lib/admin-auth.ts` has `encryptCredentials()` and `decryptCredentials()`
- Credentials encrypted before storage in `/api/integrations/motopress/configure`
- Credentials decrypted before use in `/api/integrations/motopress/sync-reservations`

### `guest_reservations` Table
Destination table for synced reservations:

```typescript
interface GuestReservation {
  tenant_id: string
  guest_name: string
  phone_full: string
  phone_last_4: string
  check_in_date: string
  check_out_date: string
  check_in_time: string
  check_out_time: string
  reservation_code: string | null
  status: string
  accommodation_unit_id: string | null
  guest_email: string | null
  guest_country: string | null
  adults: number
  children: number
  total_price: number | null
  currency: string
  booking_source: string           // 'motopress'
  external_booking_id: string      // MotoPress booking.id
  booking_notes: string | null
  // SIRE fields (null for MotoPress)
  document_type: string | null
  document_number: string | null
  birth_date: string | null
  // ... (other SIRE fields)
}
```

---

## 📁 Existing Code Architecture

### 1. MotoPress Client (`src/lib/integrations/motopress/client.ts`)

**Already has:**
- `MotoPresClient` class with Basic Auth
- `getBookings(page, perPage, dateFrom, dateTo)` - Fetch bookings with pagination
- `getAllBookings()` - Fetch ALL bookings (loops through pages)
- `getRecentBookings(maxPages)` - Fetch recent bookings (order=desc, faster)

**What's MISSING (need to add):**
- Method to fetch bookings with `_embed` parameter
- Dynamic pagination detection (get total from headers)
- Progress callbacks for UI updates

**Example current implementation:**
```typescript
async getRecentBookings(maxPages: number = 3): Promise<MotoPresApiResponse<any[]>> {
  const allBookings: any[] = []
  let page = 1

  while (page <= maxPages) {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('per_page', '100')
    params.append('orderby', 'date')
    params.append('order', 'desc')

    const response = await this.makeRequest<any[]>(`/bookings?${params.toString()}`)

    if (response.error) {
      return response
    }

    const bookings = response.data || []
    allBookings.push(...bookings)

    if (bookings.length < 100) {
      break
    }

    page++

    // Pause between requests
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  return {
    data: allBookings,
    status: 200
  }
}
```

### 2. Bookings Mapper (`src/lib/integrations/motopress/bookings-mapper.ts`)

**Already has:**
- `MotoPresBooking` interface (API response format)
- `GuestReservation` interface (database format)
- `mapToGuestReservation(booking, tenantId, supabase)` - Maps single booking
- `mapBulkBookings(bookings, tenantId, supabase)` - Maps array of bookings
- Phone extraction from iCal description
- Reservation code extraction
- Accommodation unit ID lookup by `motopress_type_id`

**What's MISSING:**
- Handling of `_embedded` data (room names, etc.)
- Support for new data structure when `_embed=1` is used

### 3. Sync API Endpoint (`src/app/api/integrations/motopress/sync-reservations/route.ts`)

**Current workflow:**
1. Validates `tenant_id` from request
2. Retrieves encrypted credentials from `integration_configs`
3. Decrypts credentials
4. Creates `MotoPresClient`
5. Calls `client.getRecentBookings(3)` - **Fetches max 300 bookings**
6. Maps bookings using `MotoPresBookingsMapper.mapBulkBookings()`
7. Upserts to `guest_reservations` (checks `external_booking_id` for duplicates)
8. Logs sync history to `sync_history` table
9. Returns stats: `{ total, created, updated, skipped, errors }`

**Limitations:**
- Only fetches 300 recent bookings (3 pages)
- Doesn't use `_embed` parameter
- No dynamic pagination
- No progress indication
- 60 second timeout (`maxDuration = 60`)

### 4. UI Components

**ReservationsList.tsx** (`src/components/Staff/ReservationsList.tsx`)
- Fetches from `/api/reservations/list?future=true&status=active`
- Has TWO buttons:
  - "Actualizar" (legacy)
  - "Actualizar (nuevo)"
- Displays reservation cards with:
  - Guest name, email, phone
  - Check-in/check-out dates
  - Accommodation unit name
  - Number of guests (adults/children)
  - Total price
  - Reservation code

**ConfigurationForm.tsx** (`src/components/integrations/motopress/ConfigurationForm.tsx`)
- Form to configure MotoPress credentials
- Fields: `site_url`, `api_key` (consumer key), `api_secret` (consumer secret)
- "Test Connection" button (calls `/api/integrations/motopress/test-connection`)
- "Save Configuration" button (calls `/api/integrations/motopress/configure`)
- Stores credentials in `integration_configs` table

---

## 🔧 Implementation Plan

### Phase 1: Enhance MotoPress Client (OPTIMIZED)

**File:** `src/lib/integrations/motopress/client.ts`

**Add FAST method (without `_embed`):**
```typescript
async getAllBookingsFast(
  onProgress?: (current: number, total: number, message: string) => void
): Promise<MotoPresApiResponse<any[]>> {
  // 1. Get total count from headers (HEAD request)
  onProgress?.(0, 0, 'Detecting total bookings...')

  const headersResponse = await fetch(`${this.baseUrl}/bookings?per_page=1`, {
    method: 'HEAD',
    headers: this.getAuthHeaders()
  })

  const totalBookings = parseInt(headersResponse.headers.get('X-WP-Total') || '0')
  const totalPages = Math.ceil(totalBookings / 100)

  onProgress?.(0, totalPages, `Found ${totalBookings} bookings across ${totalPages} pages`)

  // 2. Fetch all pages WITHOUT _embed (10x faster)
  const allBookings: any[] = []

  for (let page = 1; page <= totalPages; page++) {
    const response = await this.makeRequest<any[]>(
      `/bookings?page=${page}&per_page=100&orderby=date&order=desc`
    )

    if (response.error) {
      // Retry logic (max 3 attempts)
      let retries = 0
      while (retries < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)))
        const retryResponse = await this.makeRequest<any[]>(
          `/bookings?page=${page}&per_page=100&orderby=date&order=desc`
        )
        if (!retryResponse.error) {
          allBookings.push(...(retryResponse.data || []))
          break
        }
        retries++
      }

      if (retries === 3) {
        return response // Return error after retries
      }
    } else {
      const bookings = response.data || []
      allBookings.push(...bookings)
    }

    // Call progress callback
    const percentage = Math.round((page / totalPages) * 100)
    onProgress?.(page, totalPages, `Fetching page ${page}/${totalPages} (${percentage}%)`)

    // Pause between requests (avoid rate limiting)
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  return {
    data: allBookings,
    status: 200
  }
}

async getAccommodationTypes(): Promise<MotoPresApiResponse<any[]>> {
  // Get all accommodation types for room name mapping
  return this.makeRequest<any[]>(
    '/accommodation_types?per_page=100&status=publish'
  )
}
```

**Why NO `_embed`:**
- 10x faster (30s vs 10-15 min for 500 bookings)
- Room names fetched separately in single request
- Better API performance
- Recommended by `MOTOPRESS_API_SCRIPTS_GUIDE.md`

### Phase 2: Update Bookings Mapper (ENHANCED APPROACH)

**File:** `src/lib/integrations/motopress/bookings-mapper.ts`

**Add room name mapping (from separate request):**
```typescript
static buildRoomNameMap(accommodationTypes: any[]): Map<number, string> {
  // Build a map of accommodation_type_id → room_name
  const roomMap = new Map<number, string>()

  for (const type of accommodationTypes) {
    roomMap.set(type.id, type.title || `Room ${type.id}`)
  }

  return roomMap
}

static async mapBulkBookingsWithRoomNames(
  bookings: MotoPresBooking[],
  tenantId: string,
  supabase: SupabaseClient,
  roomNameMap: Map<number, string>
): Promise<GuestReservation[]> {
  const mapped: GuestReservation[] = []

  for (const booking of bookings) {
    // Skip calendar blocks (no useful data)
    if (booking.ical_summary?.includes('Not available')) {
      continue
    }

    // Skip non-confirmed bookings
    if (booking.status !== 'confirmed') {
      continue
    }

    // Get room name from map
    const accommodationTypeId = booking.reserved_accommodations[0]?.accommodation_type
    const roomName = roomNameMap.get(accommodationTypeId) || 'Unknown Room'

    const reservation = await this.mapToGuestReservation(
      booking,
      tenantId,
      supabase
    )

    // Add room name to notes
    reservation.booking_notes = reservation.booking_notes
      ? `${reservation.booking_notes}\nRoom: ${roomName}`
      : `Room: ${roomName}`

    mapped.push(reservation)
  }

  return mapped
}
```

**Why this approach:**
- No `_embed` needed (faster API calls)
- Single request for ALL room types
- O(1) lookup for room names (Map)
- Filters out useless calendar blocks

### Phase 3: Create Optimized Sync API Endpoint

**File:** `src/app/api/integrations/motopress/sync-all/route.ts`

**Key improvements over existing `/sync-reservations`:**
- Uses `getAllBookingsFast()` instead of `getRecentBookings(3)` - **10x faster**
- Fetches ALL bookings (not just 300)
- Gets room types in separate request (fast)
- Implements Server-Sent Events (SSE) for progress updates
- Returns streaming response with real-time progress
- No 60-second timeout limit (streaming keeps connection alive)

**Complete workflow:**
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenant_id = searchParams.get('tenant_id')

  // 1. Setup SSE stream
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  const sendEvent = (data: any) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // 2. Start async sync process
  ;(async () => {
    try {
      // 2.1. Get credentials
      const credentials = await getDecryptedCredentials(tenant_id)
      const client = new MotoPresClient(credentials)

      // 2.2. Fetch ALL bookings (FAST, no _embed)
      sendEvent({ type: 'progress', message: 'Starting sync...' })

      const bookingsResponse = await client.getAllBookingsFast(
        (current, total, message) => {
          sendEvent({
            type: 'progress',
            current,
            total,
            message
          })
        }
      )

      if (bookingsResponse.error) {
        sendEvent({ type: 'error', message: bookingsResponse.error })
        writer.close()
        return
      }

      const bookings = bookingsResponse.data || []
      sendEvent({ type: 'progress', message: `Fetched ${bookings.length} bookings` })

      // 2.3. Fetch room types (SEPARATE REQUEST, fast)
      sendEvent({ type: 'progress', message: 'Fetching room types...' })
      const roomTypesResponse = await client.getAccommodationTypes()
      const roomNameMap = MotoPresBookingsMapper.buildRoomNameMap(roomTypesResponse.data || [])

      sendEvent({ type: 'progress', message: `Found ${roomNameMap.size} room types` })

      // 2.4. Map bookings with room names
      sendEvent({ type: 'progress', message: 'Processing bookings...' })
      const supabase = createServerClient()

      const mappedReservations = await MotoPresBookingsMapper.mapBulkBookingsWithRoomNames(
        bookings,
        tenant_id,
        supabase,
        roomNameMap
      )

      sendEvent({
        type: 'progress',
        message: `Mapped ${mappedReservations.length} reservations (excluded ${bookings.length - mappedReservations.length} calendar blocks)`
      })

      // 2.5. Upsert to database
      let created = 0, updated = 0, errors = 0

      for (const reservation of mappedReservations) {
        try {
          const { data: existing } = await supabase
            .from('guest_reservations')
            .select('id')
            .eq('external_booking_id', reservation.external_booking_id)
            .single()

          if (existing) {
            await supabase.from('guest_reservations').update(reservation).eq('id', existing.id)
            updated++
          } else {
            await supabase.from('guest_reservations').insert(reservation)
            created++
          }
        } catch (err) {
          errors++
        }
      }

      // 2.6. Send completion
      sendEvent({
        type: 'complete',
        stats: {
          total: mappedReservations.length,
          created,
          updated,
          errors,
          blocksExcluded: bookings.length - mappedReservations.length
        }
      })

      writer.close()

    } catch (error: any) {
      sendEvent({ type: 'error', message: error.message })
      writer.close()
    }
  })()

  // 3. Return SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
```

**Performance comparison:**
```
Old approach:  Max 300 bookings, ~16 seconds
New approach:  ALL bookings (4000+), ~30-60 seconds
With _embed:   ALL bookings (4000+), ~40-60 MINUTES ❌
```

### Phase 4: Update UI Component

**File:** `src/components/Staff/ReservationsList.tsx`

**Changes:**
1. Remove both old buttons ("Actualizar" and "Actualizar nuevo")
2. Add single unified button: "Sync Reservations"
3. Implement progress modal/toast
4. Handle SSE stream for progress updates

**Example implementation:**
```typescript
const [syncing, setSyncing] = useState(false)
const [progress, setProgress] = useState({ current: 0, total: 0 })

const handleSync = async () => {
  setSyncing(true)

  const eventSource = new EventSource(
    `/api/integrations/motopress/sync-all?tenant_id=${tenantId}`
  )

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'progress') {
      setProgress({ current: data.current, total: data.total })
    } else if (data.type === 'complete') {
      toast.success(`Sync complete! Created: ${data.stats.created}, Updated: ${data.stats.updated}`)
      eventSource.close()
      setSyncing(false)
      refreshReservations()
    }
  }

  eventSource.onerror = () => {
    toast.error('Sync failed')
    eventSource.close()
    setSyncing(false)
  }
}
```

---

## 🔒 Security Considerations

### 1. Authentication
- All API endpoints require staff token (JWT)
- Use `requireAdminAuth(request)` helper from `/lib/admin-auth.ts`
- Validate `tenant_id` matches staff's tenant

### 2. Credential Storage
- **NEVER** return decrypted credentials to client
- Credentials encrypted in database using `encryptCredentials()`
- Only decrypt server-side when making API calls
- Use environment variable `ENCRYPTION_SECRET` for AES-256-GCM

### 3. Rate Limiting
- 250ms pause between API requests (already implemented)
- Consider tenant-level rate limiting for sync operations

---

## 📊 Success Metrics

### Functional Requirements
✅ Single unified sync button replaces both old buttons
✅ Credentials retrieved from database (no manual input)
✅ Dynamic pagination (fetches ALL bookings, not just 300)
✅ Uses `_embed` parameter for complete data
✅ Real-time progress indication
✅ Error handling with retry logic
✅ Maintains existing reservation card UI

### Non-Functional Requirements
✅ Sync completes within reasonable time (2-3 min for 500 bookings)
✅ No timeout errors (use SSE streaming)
✅ Graceful error handling
✅ Clear user feedback

---

## 🧪 Testing Plan

### Unit Tests
- `MotoPresClient.getAllBookingsWithEmbed()` pagination logic
- `MotoPresBookingsMapper` with `_embedded` data
- Credential encryption/decryption

### Integration Tests
1. **Fresh tenant (no credentials):**
   - Click sync button → redirects to `/accommodations/integrations`
   - Configure credentials → test connection → save
   - Return to reservations page → sync works

2. **Existing tenant (credentials configured):**
   - Click sync button → starts sync immediately
   - Progress modal shows "Page 1 of X"
   - Completes successfully
   - Reservation cards refresh with new data

3. **Error scenarios:**
   - Invalid credentials → show error message
   - Network timeout → retry logic kicks in
   - Partial sync failure → show stats (X created, Y failed)

### Manual Testing Checklist
```
[ ] Login to simmerdown.muva.chat
[ ] Navigate to /accommodations/reservations
[ ] Click unified "Sync Reservations" button
[ ] Verify progress modal appears
[ ] Verify progress updates in real-time
[ ] Verify sync completes without timeout
[ ] Verify new reservations appear in list
[ ] Verify reservation cards show complete data (room names, guest info)
[ ] Test with tucasamar.muva.chat (different tenant)
[ ] Verify cross-tenant isolation (credentials not shared)
```

---

## 📚 Reference Files to Read

**MUST READ (in order):**
1. ⭐ `/Users/oneill/Sites/apps/muva-chat/docs/MOTOPRESS_API_SCRIPTS_GUIDE.md` - **CRITICAL API LIMITATIONS**
2. `/Users/oneill/Sites/apps/muva-chat/export-reservations-dynamic-embed.sh` - Bash script reference
3. `/Users/oneill/Sites/apps/muva-chat/src/lib/integrations/motopress/client.ts` - Current client
4. `/Users/oneill/Sites/apps/muva-chat/src/lib/integrations/motopress/bookings-mapper.ts` - Mapper
5. `/Users/oneill/Sites/apps/muva-chat/src/app/api/integrations/motopress/sync-reservations/route.ts` - Current sync
6. `/Users/oneill/Sites/apps/muva-chat/src/components/Staff/ReservationsList.tsx` - UI component

**OPTIONAL:**
7. `/Users/oneill/Sites/apps/muva-chat/CLAUDE.md` - Project guidelines
8. `/Users/oneill/Sites/apps/muva-chat/docs/TODO_SECURITY.md` - Security context

**⚠️ CRITICAL:** Read `MOTOPRESS_API_SCRIPTS_GUIDE.md` FIRST to understand:
- Why date filters don't work
- Why `_embed` is 10x slower
- Why enhanced approach is recommended
- Performance characteristics of each approach

---

## 🚀 Suggested Execution Flow

### Step 1: Investigate Current Implementation
```
Read all reference files above
Understand existing sync flow
Identify what's missing vs bash script
```

### Step 2: Plan Architecture
```
Design SSE streaming API endpoint
Design progress state management
Choose UI library for progress modal (shadcn/ui)
```

### Step 3: Implement Backend Changes
```
1. Add getAllBookingsWithEmbed() to MotoPresClient
2. Update MotoPresBookingsMapper for _embedded data
3. Create /api/integrations/motopress/sync-all endpoint with SSE
4. Add error handling and retry logic
```

### Step 4: Implement Frontend Changes
```
1. Remove old sync buttons from ReservationsList
2. Add unified "Sync Reservations" button
3. Implement progress modal with SSE listener
4. Add success/error toast notifications
```

### Step 5: Testing
```
1. Test with simmerdown tenant (500+ bookings)
2. Test with tucasamar tenant
3. Verify credentials isolation
4. Test error scenarios
```

### Step 6: Documentation
```
Update CLAUDE.md with new sync flow
Add code comments explaining SSE implementation
Document any deviations from bash script logic
```

---

## ⚠️ Important Notes from CLAUDE.md

### Critical Rules
1. **NO modificar performance targets** - Investigate root cause first
2. **NO work-arounds facilistas** - Understand the problem deeply
3. **Git workflow:** Always work in `dev` branch, NEVER merge to `main`
4. **MCP-first policy:** Use `mcp__supabase__execute_sql` for queries, not tsx scripts

### Development Setup
```bash
# ALWAYS use this script (includes .env.local)
./scripts/dev-with-keys.sh

# NEVER use plain npm run dev
```

### Database Operations
- **DML (SELECT/INSERT/UPDATE):** Use `mcp__supabase__execute_sql` (70% token savings)
- **DDL (CREATE/ALTER):** Use `npx tsx scripts/execute-ddl-via-api.ts migration.sql`

---

## 🎯 Your Mission

Implement the unified MotoPress reservation sync system that:
1. Replaces both old sync buttons with ONE button
2. Uses bash script logic (dynamic pagination, `_embed`, retry logic)
3. Stores/retrieves credentials from database per tenant
4. Shows real-time progress during sync
5. Handles errors gracefully
6. Maintains existing reservation card UI

**Start by:**
1. Reading all reference files
2. Understanding the bash script flow (513 lines)
3. Identifying gaps in current implementation
4. Planning the SSE streaming architecture
5. Asking clarifying questions if needed

**Remember:**
- This is a PRODUCTION system serving real hotels
- Multi-tenant architecture requires careful credential isolation
- User experience is key (progress indication, error messages)
- Follow CLAUDE.md guidelines strictly

Good luck! 🚀

---

## 📝 TL;DR (Quick Start)

**Problem:** Two sync buttons, slow sync, only 300 bookings max

**Solution:** ONE button, fast sync, ALL bookings (4000+)

**Key Decision:** DON'T use `_embed` parameter
- ❌ With `_embed`: 10-15 minutes for 500 bookings
- ✅ Without `_embed`: 30 seconds for 500 bookings
- ✅ Get room names in separate request (5 seconds)

**Performance:**
```
Current:  Max 300 bookings in ~16s
New:      ALL 4000+ bookings in ~60s
Rejected: ALL 4000+ bookings in ~60 MINUTES (with _embed)
```

**Architecture:**
1. Click button → Check if credentials exist
2. If no credentials → redirect to `/accommodations/integrations`
3. If credentials exist → Start SSE sync
4. Fetch ALL bookings fast (no `_embed`)
5. Fetch room types separately (single request)
6. Map locally (instant)
7. Upsert to database
8. Show results: "Created 12, Updated 488, Blocked 75"

**Files to create/modify:**
- ✅ Add `getAllBookingsFast()` to `src/lib/integrations/motopress/client.ts`
- ✅ Add `getAccommodationTypes()` to same file
- ✅ Add `buildRoomNameMap()` to `src/lib/integrations/motopress/bookings-mapper.ts`
- ✅ Add `mapBulkBookingsWithRoomNames()` to same file
- ✅ Create `src/app/api/integrations/motopress/sync-all/route.ts` (SSE endpoint)
- ✅ Modify `src/components/Staff/ReservationsList.tsx` (single button + SSE listener)

**CRITICAL:** Read `docs/MOTOPRESS_API_SCRIPTS_GUIDE.md` first!

---

## 🎯 Success Criteria

✅ Single unified "Sync Reservations" button (replaces both old buttons)
✅ Credentials auto-loaded from database (no manual input)
✅ Syncs ALL bookings (not just 300)
✅ Completes in under 2 minutes for 4000 bookings
✅ Real-time progress (SSE): "Page 5 of 40 (12%)"
✅ Filters calendar blocks ("Airbnb Not available")
✅ Shows stats: created, updated, excluded
✅ No timeout errors (SSE keeps connection alive)
✅ Graceful error handling with retry logic
✅ Works across all tenants (multi-tenant isolated)

---

**Document Version:** 1.0
**Created:** October 2025
**Based on:** `export-reservations-dynamic-embed.sh` + `MOTOPRESS_API_SCRIPTS_GUIDE.md`
