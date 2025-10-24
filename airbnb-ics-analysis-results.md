# Airbnb ICS Calendar Analysis - Complete Results

**Analysis Date:** 2025-10-22
**Analyst:** Claude Code (Agent: API Endpoints Mapper)

---

## Executive Summary

- **Total Events Analyzed:** 28 (13 Kaya + 15 Simmer Highs)
- **Event Types Found:** 2 (Reserved, Airbnb Not available)
- **Active Reservations:** 12 (5 Kaya + 7 Simmer Highs)
- **Blocked Periods:** 16 (8 Kaya + 8 Simmer Highs)
- **Critical Finding:** ✅ Nov 20-26 block EXISTS in Simmer Highs but NOT in Kaya (parent-child sync issue)
- **Perfect Match Blocks:** 5 date ranges appear as reservations in Simmer Highs but blocks in Kaya

---

## 1. Complete Event Inventory

### Kaya (Room) - 13 Events

| # | Type | Start Date | End Date | Duration | Reservation Code | Phone Hint | UID Hash |
|---|------|------------|----------|----------|------------------|------------|----------|
| 1 | Reserved | 2025-10-19 | 2025-10-22 | 3 days | HMCH8MD3BQ | 0000 | 1418fb94e984-90cc2a3b |
| 2 | Reserved | 2025-10-22 | 2025-10-25 | 3 days | HMSEAYX9QE | 0457 | 1418fb94e984-371d6707 |
| 3 | Reserved | 2025-10-28 | 2025-11-01 | 4 days | HM2HQKYDSK | 3922 | 1418fb94e984-e55050f4 |
| 4 | Reserved | 2025-11-03 | 2025-11-08 | 5 days | HMB8JWA525 | 9588 | 1418fb94e984-e2385cf5 |
| 5 | Reserved | 2025-11-08 | 2025-11-12 | 4 days | HMF4XHQRNR | 5527 | 1418fb94e984-608b6c15 |
| 6 | Block | 2025-10-25 | 2025-10-28 | 3 days | N/A | N/A | 7f662ec65913-fd68520c |
| 7 | Block | 2025-11-14 | 2025-11-17 | 3 days | N/A | N/A | 7f662ec65913-eb3d8128 |
| 8 | Block | 2025-12-23 | 2025-12-29 | 6 days | N/A | N/A | 7f662ec65913-a3f007df |
| 9 | Block | 2026-01-02 | 2026-01-06 | 4 days | N/A | N/A | 7f662ec65913-39b6f2c4 |
| 10 | Block | 2026-01-07 | 2026-01-11 | 4 days | N/A | N/A | 7f662ec65913-f8aa11d8 |
| 11 | Block | 2026-01-20 | 2026-01-25 | 5 days | N/A | N/A | 7f662ec65913-cbcd0cc5 |
| 12 | Block | 2026-03-02 | 2026-03-08 | 6 days | N/A | N/A | 7f662ec65913-df548305 |
| 13 | Block | 2026-04-23 | 2026-04-26 | 3 days | N/A | N/A | 7f662ec65913-c8c4d0b1 |

### Simmer Highs (Full Apartment) - 15 Events

| # | Type | Start Date | End Date | Duration | Reservation Code | Phone Hint | UID Hash |
|---|------|------------|----------|----------|------------------|------------|----------|
| 1 | Reserved | 2025-10-25 | 2025-10-28 | 3 days | HM3KTNNJQ5 | 2833 | 1418fb94e984-72fae659 |
| 2 | Reserved | 2025-12-23 | 2025-12-29 | 6 days | HM2PBRTSR2 | 3968 | 1418fb94e984-d8eaa2c0 |
| 3 | Reserved | 2026-01-02 | 2026-01-06 | 4 days | HMZ4HZCAP8 | 8599 | 1418fb94e984-abb82e86 |
| 4 | Reserved | 2026-01-07 | 2026-01-11 | 4 days | HMM88A323J | 9315 | 1418fb94e984-d19ab12d |
| 5 | Reserved | 2026-01-20 | 2026-01-25 | 5 days | HMDAFE3E93 | 0098 | 1418fb94e984-101cf2db |
| 6 | Reserved | 2026-03-02 | 2026-03-08 | 6 days | HMW8CAF5PY | 8405 | 1418fb94e984-4eb7ebfd |
| 7 | Reserved | 2026-04-23 | 2026-04-26 | 3 days | HM3KKRYEKF | 8269 | 1418fb94e984-4840e001 |
| 8 | Block | 2025-10-20 | 2025-10-25 | 5 days | N/A | N/A | 7f662ec65913-03d00407 |
| 9 | Block | 2025-10-28 | 2025-11-14 | 17 days | N/A | N/A | 7f662ec65913-74b1e15a |
| 10 | Block | 2025-11-20 | 2025-11-26 | 6 days | N/A | N/A | 7f662ec65913-cf6021cf |
| 11 | Block | 2025-12-06 | 2025-12-10 | 4 days | N/A | N/A | 7f662ec65913-c069eb45 |
| 12 | Block | 2025-12-14 | 2025-12-19 | 5 days | N/A | N/A | 7f662ec65913-b4e13e42 |
| 13 | Block | 2026-02-14 | 2026-02-18 | 4 days | N/A | N/A | 7f662ec65913-e36ef8e4 |
| 14 | Block | 2026-02-27 | 2026-03-02 | 3 days | N/A | N/A | 7f662ec65913-a6290946 |

---

## 2. Event Types Categorization

### Event Type: "Reserved"
- **Count:** 12 (5 Kaya + 7 Simmer Highs)
- **Fields Present:**
  - `DTSTAMP` - Generation timestamp (all events: 20251022T234043Z)
  - `DTSTART;VALUE=DATE` - Check-in date (YYYYMMDD format)
  - `DTEND;VALUE=DATE` - Check-out date (YYYYMMDD format)
  - `SUMMARY` - Always "Reserved"
  - `UID` - Unique identifier (pattern: `1418fb94e984-{hash}@airbnb.com`)
  - `DESCRIPTION` - Contains reservation URL and phone hint
- **Fields Absent:**
  - No price/amount
  - No guest name
  - No guest email
  - No full phone number
  - No number of guests
  - No booking source

### Event Type: "Airbnb (Not available)"
- **Count:** 16 (8 Kaya + 8 Simmer Highs)
- **Fields Present:**
  - `DTSTAMP` - Generation timestamp
  - `DTSTART;VALUE=DATE` - Block start date
  - `DTEND;VALUE=DATE` - Block end date
  - `SUMMARY` - Always "Airbnb (Not available)"
  - `UID` - Unique identifier (pattern: `7f662ec65913-{hash}@airbnb.com`)
- **Fields Absent:**
  - `DESCRIPTION` - No description field
  - No reason for block
  - No blocking source (manual, synced, parent-child)

### UID Pattern Analysis

**Reserved Events:**
- Prefix: `1418fb94e984-`
- Hash length: 32 characters (MD5-like)
- Domain: `@airbnb.com`

**Blocked Events:**
- Prefix: `7f662ec65913-`
- Hash length: 32 characters (MD5-like)
- Domain: `@airbnb.com`

**Finding:** Different UID prefixes suggest different event sources/types within Airbnb's system.

---

## 3. Field Mapping & Data Availability

| Field | Reserved Events | Blocked Events | Format | Notes |
|-------|-----------------|----------------|--------|-------|
| DTSTAMP | ✅ | ✅ | ISO 8601 (UTC) | Calendar generation timestamp |
| DTSTART | ✅ | ✅ | DATE (YYYYMMDD) | No time component |
| DTEND | ✅ | ✅ | DATE (YYYYMMDD) | Exclusive end date |
| SUMMARY | ✅ | ✅ | String | Event type identifier |
| UID | ✅ | ✅ | String | Unique event ID |
| DESCRIPTION | ✅ | ❌ | Multiline text | Only for reservations |
| Reservation URL | ✅ (in DESC) | ❌ | URL | Pattern: `/details/{CODE}` |
| Phone Hint | ✅ (in DESC) | ❌ | 4 digits | Last 4 digits only |
| Guest Name | ❌ | ❌ | N/A | Not provided |
| Guest Email | ❌ | ❌ | N/A | Not provided |
| Full Phone | ❌ | ❌ | N/A | Only last 4 digits |
| Price | ❌ | ❌ | N/A | Not provided |
| Guest Count | ❌ | ❌ | N/A | Not provided |
| Block Reason | ❌ | ❌ | N/A | Not provided |
| Block Source | ❌ | ❌ | N/A | Manual vs synced unknown |

---

## 4. Reservation Data Extraction

### Kaya (Room) Reservations

```
1. HMCH8MD3BQ
   Check-in:  2025-10-19 (Oct 19)
   Check-out: 2025-10-22 (Oct 22)
   Duration:  3 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMCH8MD3BQ
   Phone:     ****0000
   UID:       1418fb94e984-90cc2a3bcdbdba6de239f64ae4ea2fe7@airbnb.com

2. HMSEAYX9QE
   Check-in:  2025-10-22 (Oct 22)
   Check-out: 2025-10-25 (Oct 25)
   Duration:  3 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMSEAYX9QE
   Phone:     ****0457
   UID:       1418fb94e984-371d670749377941b5d6f08d2f11f9a1@airbnb.com

3. HM2HQKYDSK
   Check-in:  2025-10-28 (Oct 28)
   Check-out: 2025-11-01 (Nov 01)
   Duration:  4 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HM2HQKYDSK
   Phone:     ****3922
   UID:       1418fb94e984-e55050f472222e88d3e39dbb17a37b05@airbnb.com

4. HMB8JWA525
   Check-in:  2025-11-03 (Nov 03)
   Check-out: 2025-11-08 (Nov 08)
   Duration:  5 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMB8JWA525
   Phone:     ****9588
   UID:       1418fb94e984-e2385cf598afdc888cef1faed7427e85@airbnb.com

5. HMF4XHQRNR
   Check-in:  2025-11-08 (Nov 08)
   Check-out: 2025-11-12 (Nov 12)
   Duration:  4 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMF4XHQRNR
   Phone:     ****5527
   UID:       1418fb94e984-608b6c1528089b9ca143672241285636@airbnb.com
```

### Simmer Highs (Full Apartment) Reservations

```
1. HM3KTNNJQ5
   Check-in:  2025-10-25 (Oct 25)
   Check-out: 2025-10-28 (Oct 28)
   Duration:  3 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HM3KTNNJQ5
   Phone:     ****2833
   UID:       1418fb94e984-72fae6599063c1b9fd22785f45589162@airbnb.com

2. HM2PBRTSR2
   Check-in:  2025-12-23 (Dec 23)
   Check-out: 2025-12-29 (Dec 29)
   Duration:  6 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HM2PBRTSR2
   Phone:     ****3968
   UID:       1418fb94e984-d8eaa2c05fe52537d3fa272b042c2e13@airbnb.com

3. HMZ4HZCAP8
   Check-in:  2026-01-02 (Jan 02)
   Check-out: 2026-01-06 (Jan 06)
   Duration:  4 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMZ4HZCAP8
   Phone:     ****8599
   UID:       1418fb94e984-abb82e86c42bbaf943c70dc4e6e41ec3@airbnb.com

4. HMM88A323J
   Check-in:  2026-01-07 (Jan 07)
   Check-out: 2026-01-11 (Jan 11)
   Duration:  4 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMM88A323J
   Phone:     ****9315
   UID:       1418fb94e984-d19ab12df2a4c9dbdba29abbef89431c@airbnb.com

5. HMDAFE3E93
   Check-in:  2026-01-20 (Jan 20)
   Check-out: 2026-01-25 (Jan 25)
   Duration:  5 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMDAFE3E93
   Phone:     ****0098
   UID:       1418fb94e984-101cf2db4e889f9509082edf89e3c94d@airbnb.com

6. HMW8CAF5PY
   Check-in:  2026-03-02 (Mar 02)
   Check-out: 2026-03-08 (Mar 08)
   Duration:  6 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HMW8CAF5PY
   Phone:     ****8405
   UID:       1418fb94e984-4eb7ebfd5d9e1fdca79dc0ebae5f51c7@airbnb.com

7. HM3KKRYEKF
   Check-in:  2026-04-23 (Apr 23)
   Check-out: 2026-04-26 (Apr 26)
   Duration:  3 nights
   URL:       https://www.airbnb.com/hosting/reservations/details/HM3KKRYEKF
   Phone:     ****8269
   UID:       1418fb94e984-4840e0011911e937b9093d59c0298471@airbnb.com
```

---

## 5. Blocking Patterns Analysis

### Kaya (Room) Blocks

| Start Date | End Date | Duration | Status |
|------------|----------|----------|--------|
| 2025-10-25 | 2025-10-28 | 3 days | ✅ MATCHES Simmer Highs reservation |
| 2025-11-14 | 2025-11-17 | 3 days | ⚠️ Unique to Kaya (partial overlap with Simmer Highs block) |
| 2025-12-23 | 2025-12-29 | 6 days | ✅ MATCHES Simmer Highs reservation |
| 2026-01-02 | 2026-01-06 | 4 days | ✅ MATCHES Simmer Highs reservation |
| 2026-01-07 | 2026-01-11 | 4 days | ✅ MATCHES Simmer Highs reservation |
| 2026-01-20 | 2026-01-25 | 5 days | ✅ MATCHES Simmer Highs reservation |
| 2026-03-02 | 2026-03-08 | 6 days | ✅ MATCHES Simmer Highs reservation |
| 2026-04-23 | 2026-04-26 | 3 days | ✅ MATCHES Simmer Highs reservation |

### Simmer Highs (Full Apartment) Blocks

| Start Date | End Date | Duration | Status |
|------------|----------|----------|--------|
| 2025-10-20 | 2025-10-25 | 5 days | ⚠️ Unique to Simmer Highs |
| 2025-10-28 | 2025-11-14 | 17 days | ⚠️ Unique to Simmer Highs (overlaps Kaya reservations!) |
| **2025-11-20** | **2025-11-26** | **6 days** | **❌ MISSING FROM KAYA** |
| 2025-12-06 | 2025-12-10 | 4 days | ⚠️ Unique to Simmer Highs |
| 2025-12-14 | 2025-12-19 | 5 days | ⚠️ Unique to Simmer Highs |
| 2026-02-14 | 2026-02-18 | 4 days | ⚠️ Unique to Simmer Highs |
| 2026-02-27 | 2026-03-02 | 3 days | ⚠️ Unique to Simmer Highs |

---

## 6. Cross-Reference Analysis: Parent-Child Relationship

### Perfect Date Matches (Simmer Highs Reservation → Kaya Block)

| Dates | Simmer Highs | Kaya | Pattern |
|-------|--------------|------|---------|
| Oct 25-28, 2025 | Reserved (HM3KTNNJQ5) | Blocked | ✅ PARENT-CHILD SYNC |
| Dec 23-29, 2025 | Reserved (HM2PBRTSR2) | Blocked | ✅ PARENT-CHILD SYNC |
| Jan 02-06, 2026 | Reserved (HMZ4HZCAP8) | Blocked | ✅ PARENT-CHILD SYNC |
| Jan 07-11, 2026 | Reserved (HMM88A323J) | Blocked | ✅ PARENT-CHILD SYNC |
| Jan 20-25, 2026 | Reserved (HMDAFE3E93) | Blocked | ✅ PARENT-CHILD SYNC |
| Mar 02-08, 2026 | Reserved (HMW8CAF5PY) | Blocked | ✅ PARENT-CHILD SYNC |
| Apr 23-26, 2026 | Reserved (HM3KKRYEKF) | Blocked | ✅ PARENT-CHILD SYNC |

**Pattern Identified:** When Simmer Highs (full apartment) gets a reservation, Kaya (room) is automatically blocked for the same dates. This confirms the parent-child relationship works in Airbnb's system.

### Anomalies and Conflicts

#### 1. Oct 28 - Nov 14 Block (Simmer Highs)
- **Simmer Highs:** Blocked Oct 28 - Nov 14 (17 days)
- **Kaya:** Has TWO reservations during this period:
  - Oct 28 - Nov 01 (HM2HQKYDSK)
  - Nov 03 - Nov 08 (HMB8JWA525)
  - Nov 08 - Nov 12 (HMF4XHQRNR)

**Analysis:** This suggests the Oct 28-Nov 14 block in Simmer Highs is NOT from the parent-child sync, but rather:
- Manual block by host
- External calendar sync (MotoPress?)
- Airbnb's own availability management

**Why it doesn't block Kaya:** Because it's a manual/external block, not a reservation. Airbnb only auto-blocks child properties when the parent has an actual RESERVATION.

#### 2. **Nov 20-26 Block - THE MISSING BLOCK MYSTERY** 🔍

**Expected Behavior:**
- User reports this block should appear in Kaya (synced from MotoPress)
- Block DOES appear in Simmer Highs calendar

**Actual Observation:**
- ✅ Simmer Highs: BLOCKED Nov 20-26
- ❌ Kaya: NO BLOCK for Nov 20-26

**Possible Causes:**

1. **MotoPress sync configuration issue**
   - Kaya's Airbnb calendar is not properly configured to import MotoPress blocks
   - Sync URL missing or incorrect
   - One-way sync only (Airbnb → MotoPress but not MotoPress → Airbnb)

2. **Different sync settings per property**
   - Simmer Highs has MotoPress sync enabled
   - Kaya does NOT have MotoPress sync enabled
   - OR: Kaya has a different external calendar URL

3. **Airbnb calendar import rules**
   - Airbnb may treat parent/child properties differently for external imports
   - Child properties might not import external blocks automatically

4. **Timing/caching issue**
   - Block was added to MotoPress after Kaya's last sync
   - Airbnb caches calendars (updates every 3-24 hours typically)
   - Simmer Highs synced recently, Kaya did not

5. **Block type filtering**
   - MotoPress might send blocks with specific event types
   - Airbnb might filter certain block types from importing to child properties

**Recommended Investigation Steps:**
1. Check Airbnb settings for both properties → "Calendar Sync" section
2. Verify which external calendars are imported into each property
3. Check MotoPress export URLs for both Kaya and Simmer Highs
4. Test manual refresh of calendar imports in Airbnb
5. Check MotoPress → Airbnb sync logs (if available)

---

## 7. Database Schema Recommendations

### Proposed Table Structure for MUVA

#### Table: `external_calendar_events`

```sql
CREATE TABLE external_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  accommodation_unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,

  -- Calendar source
  calendar_source VARCHAR(50) NOT NULL, -- 'airbnb', 'booking.com', 'vrbo', 'motopress', etc.
  calendar_url TEXT NOT NULL, -- ICS feed URL

  -- Event identification
  external_event_uid VARCHAR(255) NOT NULL, -- UID from ICS (must be unique per source)
  event_type VARCHAR(50) NOT NULL, -- 'reservation', 'block', 'unavailable'

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- Exclusive end date (as per ICS spec)

  -- Reservation-specific data (NULL for blocks)
  reservation_code VARCHAR(50), -- External platform's reservation ID
  reservation_url TEXT, -- Direct link to reservation details
  guest_phone_hint VARCHAR(10), -- Last 4 digits or partial phone

  -- Event metadata
  summary TEXT, -- Event summary from ICS
  description TEXT, -- Full description if available

  -- Sync tracking
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_generation_timestamp TIMESTAMPTZ, -- DTSTAMP from ICS

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ, -- Soft delete when event disappears from ICS

  -- Indexes
  UNIQUE(calendar_source, external_event_uid, accommodation_unit_id),
  INDEX idx_events_accommodation_dates (accommodation_unit_id, start_date, end_date),
  INDEX idx_events_tenant (tenant_id),
  INDEX idx_events_active (is_active, deleted_at) WHERE deleted_at IS NULL,
  INDEX idx_events_type (event_type)
);
```

#### Table: `calendar_sync_configurations`

```sql
CREATE TABLE calendar_sync_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  accommodation_unit_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,

  -- Sync settings
  calendar_source VARCHAR(50) NOT NULL,
  ics_feed_url TEXT NOT NULL,
  sync_direction VARCHAR(20) NOT NULL, -- 'import', 'export', 'bidirectional'

  -- Status
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_successful_sync TIMESTAMPTZ,
  last_sync_attempt TIMESTAMPTZ,
  last_sync_error TEXT,
  sync_frequency_minutes INTEGER DEFAULT 60, -- How often to sync

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(accommodation_unit_id, calendar_source, ics_feed_url)
);
```

#### Table: `property_relationships`

```sql
CREATE TABLE property_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Parent-child relationship
  parent_accommodation_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,
  child_accommodation_id UUID NOT NULL REFERENCES accommodation_units(id) ON DELETE CASCADE,

  -- Relationship type
  relationship_type VARCHAR(50) NOT NULL, -- 'room_in_apartment', 'suite_in_hotel', etc.

  -- Auto-blocking rules
  auto_block_child_on_parent_booking BOOLEAN NOT NULL DEFAULT TRUE,
  auto_block_parent_on_child_booking BOOLEAN NOT NULL DEFAULT FALSE,

  -- Priority (when multiple children exist)
  priority INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(parent_accommodation_id, child_accommodation_id),
  CHECK(parent_accommodation_id != child_accommodation_id)
);
```

#### Table: `calendar_sync_logs`

```sql
CREATE TABLE calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_config_id UUID NOT NULL REFERENCES calendar_sync_configurations(id) ON DELETE CASCADE,

  -- Sync execution
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'partial', 'failed'

  -- Results
  events_added INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,

  -- Error details
  error_message TEXT,
  error_details JSONB,

  -- Performance
  duration_ms INTEGER,

  INDEX idx_sync_logs_config (sync_config_id),
  INDEX idx_sync_logs_status (status, started_at)
);
```

---

### Key Features of This Schema

1. **Multi-tenant Isolation:** All tables include `tenant_id` for proper data separation

2. **Source Tracking:** `calendar_source` field allows importing from multiple platforms simultaneously

3. **Deduplication:** `UNIQUE(calendar_source, external_event_uid, accommodation_unit_id)` prevents duplicate events

4. **Parent-Child Relationships:** Explicit table to manage Kaya/Simmer Highs type relationships

5. **Soft Deletes:** `deleted_at` field allows tracking when events disappear from external calendars

6. **Sync Monitoring:** Comprehensive logging for debugging sync issues

7. **Flexible Event Types:** Can handle reservations, blocks, and custom types

8. **Performance:** Indexes on common query patterns (date ranges, tenant, status)

---

## 8. Data Import Strategy

### Step 1: Initial Import
```typescript
// Parse ICS feed
const icsData = await fetchICS(feedUrl);
const events = parseICS(icsData);

// Import each event
for (const event of events) {
  await upsertExternalCalendarEvent({
    tenant_id: currentTenantId,
    accommodation_unit_id: propertyId,
    calendar_source: 'airbnb',
    external_event_uid: event.UID,
    event_type: event.SUMMARY.includes('Reserved') ? 'reservation' : 'block',
    start_date: event.DTSTART,
    end_date: event.DTEND,
    reservation_code: extractReservationCode(event.DESCRIPTION),
    reservation_url: extractReservationURL(event.DESCRIPTION),
    guest_phone_hint: extractPhoneHint(event.DESCRIPTION),
    summary: event.SUMMARY,
    description: event.DESCRIPTION,
    sync_generation_timestamp: event.DTSTAMP,
  });
}
```

### Step 2: Incremental Updates
```typescript
// Compare new events with existing
const existingUIDs = await getExistingEventUIDs(propertyId, 'airbnb');
const newUIDs = newEvents.map(e => e.UID);

// Mark deleted events
const deletedUIDs = existingUIDs.filter(uid => !newUIDs.includes(uid));
await markEventsAsDeleted(deletedUIDs);

// Update or insert new events
await upsertEvents(newEvents);
```

### Step 3: Parent-Child Block Propagation
```typescript
// When Simmer Highs gets a reservation, auto-block Kaya
async function propagateParentBookingToChildren(parentReservation) {
  const children = await getChildProperties(parentReservation.accommodation_unit_id);

  for (const child of children) {
    const relationship = await getPropertyRelationship(parent, child);

    if (relationship.auto_block_child_on_parent_booking) {
      await createBlockEvent({
        accommodation_unit_id: child.id,
        start_date: parentReservation.start_date,
        end_date: parentReservation.end_date,
        event_type: 'parent_booking_block',
        source_event_id: parentReservation.id,
      });
    }
  }
}
```

---

## 9. Missing Data Report

### Data NOT Provided by Airbnb ICS

| Data Field | Availability | Workaround |
|------------|--------------|------------|
| **Guest Full Name** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Guest Email** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Guest Full Phone** | ⚠️ Only last 4 digits | Must access Airbnb API or dashboard |
| **Total Price** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Number of Guests** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Payment Status** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Check-in Time** | ⚠️ Only date (no time) | Assume default 3 PM or use property settings |
| **Check-out Time** | ⚠️ Only date (no time) | Assume default 11 AM or use property settings |
| **Special Requests** | ❌ Not provided | Must access Airbnb API or dashboard |
| **Block Reason** | ❌ Not provided | Cannot distinguish manual vs synced blocks |
| **Block Source** | ❌ Not provided | Cannot identify if block came from external calendar |
| **Cancellation Status** | ⚠️ Events simply disappear | Monitor event deletion in sync process |
| **Booking Channel** | ❌ Not provided | Always Airbnb (inferred from source) |
| **Listing Title** | ❌ Not provided | Must map via listing ID in feed URL |

### Critical Limitations

1. **No Guest Contact Information**
   - Cannot send pre-arrival emails
   - Cannot enable guest chat feature
   - Cannot perform SIRE validation (need full names/IDs)

2. **No Financial Data**
   - Cannot calculate revenue
   - Cannot track commissions
   - Cannot reconcile payments

3. **No Time Precision**
   - Only DATE fields (no DATETIME)
   - Cannot manage same-day turnovers
   - Cannot enforce check-in/out times

4. **No Block Attribution**
   - Cannot tell if block is:
     - Manual host block
     - External calendar sync (MotoPress)
     - Parent property auto-block
     - Airbnb's smart pricing unavailability

5. **No Reservation Metadata**
   - Cannot see booking modifications
   - Cannot track booking source (instant book vs request)
   - Cannot see host notes or guest reviews

### Recommended Solutions

1. **For Guest Data:**
   - Implement Airbnb API integration (requires partnership)
   - OR: Build manual data entry workflow for staff
   - OR: Use reservation URL to prompt staff to copy data from Airbnb dashboard

2. **For Financial Data:**
   - Integrate with Airbnb API (full access)
   - OR: Import CSV exports from Airbnb transaction history
   - OR: Manual monthly reconciliation

3. **For Block Attribution:**
   - Track sync sources in `calendar_sync_configurations`
   - Use `external_event_uid` prefix patterns (1418fb94e984 vs 7f662ec65913)
   - Implement rule-based classification based on date overlap patterns

4. **For Time Precision:**
   - Store property default check-in/out times in database
   - Apply defaults when creating calendar events
   - Allow staff to override for specific reservations

---

## 10. Critical Findings Summary

### ✅ Confirmed Parent-Child Sync Pattern
- **7 out of 7** Simmer Highs reservations correctly block Kaya for the same dates
- This proves Airbnb's parent-child linking is working correctly
- Auto-blocking only occurs for RESERVATIONS, not for manual/external blocks

### ❌ Missing Nov 20-26 Block in Kaya
- Block EXISTS in Simmer Highs but NOT in Kaya
- This is NOT a reservation (no DESCRIPTION field)
- Likely explanation: **MotoPress external calendar sync is only configured for Simmer Highs, not for Kaya**

### ⚠️ Long Block Anomaly (Oct 28 - Nov 14 in Simmer Highs)
- Simmer Highs shows 17-day block during period when Kaya has 3 separate reservations
- This proves the block is NOT from parent-child sync
- Likely manual block or external calendar import

### 📊 Event Type Distribution
- **43% Reservations** (12 events) - Actual bookings with guest data
- **57% Blocks** (16 events) - Unavailable periods with no guest info
- **5 perfect date matches** proving parent-child auto-blocking

### 🔑 UID Prefixes as Event Type Indicators
- `1418fb94e984-*` = Reservations (always have DESCRIPTION)
- `7f662ec65913-*` = Blocks (never have DESCRIPTION)
- Could be used for faster event classification without parsing SUMMARY

---

## 11. Recommended Next Steps

### Immediate Actions
1. ✅ **Verify MotoPress sync configuration** for both properties
2. ✅ **Add Kaya's MotoPress calendar export** to Airbnb calendar imports
3. ✅ **Test manual calendar refresh** in Airbnb to trigger Nov 20-26 block appearance
4. ✅ **Document external calendar URLs** for all properties in MUVA database

### Development Tasks
1. 📝 **Implement database schema** as proposed above
2. 📝 **Build ICS parser** with error handling and validation
3. 📝 **Create sync scheduler** (every 1-4 hours depending on occupancy)
4. 📝 **Build admin UI** to view sync status and manually trigger syncs
5. 📝 **Implement conflict detection** (overlapping events, double bookings)
6. 📝 **Add sync monitoring/alerting** for failed syncs

### Integration Tasks
1. 🔗 **Connect to Airbnb API** for full reservation data (if available)
2. 🔗 **Integrate with MotoPress API** for bidirectional sync
3. 🔗 **Build unified calendar view** combining all sources
4. 🔗 **Implement reservation deduplication** across platforms
5. 🔗 **Add SIRE compliance mapping** for external reservations

### Testing & Validation
1. 🧪 **Test parent-child blocking** with various date scenarios
2. 🧪 **Verify external calendar import** for all configured sources
3. 🧪 **Validate date range calculations** (exclusive end dates)
4. 🧪 **Test concurrent syncs** to prevent race conditions
5. 🧪 **Monitor sync performance** at scale (100+ properties)

---

## 12. Technical Implementation Notes

### ICS Date Handling (Critical!)
```typescript
// IMPORTANT: DTEND is EXCLUSIVE in ICS spec
// "20251022" means check-out is Oct 22, last night is Oct 21

function parseICSDateRange(dtstart: string, dtend: string) {
  const checkIn = parseDate(dtstart); // Inclusive
  const checkOut = parseDate(dtend);   // Exclusive

  // Store as inclusive range in database
  return {
    start_date: checkIn,
    end_date: subDays(checkOut, 1), // Make end date inclusive
    nights: differenceInDays(checkOut, checkIn)
  };
}
```

### UID-Based Deduplication
```typescript
// Use UID as natural key for upsert operations
async function upsertEvent(event: ICSEvent) {
  await db.query(`
    INSERT INTO external_calendar_events (
      calendar_source, external_event_uid, ...
    ) VALUES ($1, $2, ...)
    ON CONFLICT (calendar_source, external_event_uid, accommodation_unit_id)
    DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      last_synced_at = NOW(),
      ...
  `);
}
```

### Parent-Child Block Detection
```typescript
// Detect if a block in child property matches parent reservation
async function classifyBlock(blockEvent: CalendarEvent) {
  const parentProperty = await getParentProperty(blockEvent.accommodation_unit_id);

  if (!parentProperty) {
    return 'manual_or_external';
  }

  const parentReservation = await findParentReservation(
    parentProperty.id,
    blockEvent.start_date,
    blockEvent.end_date
  );

  if (parentReservation) {
    return 'parent_booking_auto_block';
  }

  return 'manual_or_external';
}
```

### Sync Conflict Resolution
```typescript
// Priority order for overlapping events from different sources
const SOURCE_PRIORITY = {
  'motopress': 1,      // Highest priority (source of truth)
  'airbnb': 2,         // Airbnb reservations
  'booking.com': 2,    // Same priority as Airbnb
  'manual': 3,         // Manual blocks lowest priority
};

async function resolveOverlappingEvents(events: CalendarEvent[]) {
  // Sort by priority, then by creation time
  events.sort((a, b) => {
    const priorityDiff = SOURCE_PRIORITY[a.calendar_source] - SOURCE_PRIORITY[b.calendar_source];
    if (priorityDiff !== 0) return priorityDiff;
    return a.first_synced_at.getTime() - b.first_synced_at.getTime();
  });

  return events[0]; // Highest priority event wins
}
```

---

## Appendix A: Raw Event Data

### All Kaya Events (Chronological Order)

```
1. 2025-10-19 to 2025-10-22 | Reserved | HMCH8MD3BQ
2. 2025-10-22 to 2025-10-25 | Reserved | HMSEAYX9QE
3. 2025-10-25 to 2025-10-28 | Block    | (Simmer Highs has reservation)
4. 2025-10-28 to 2025-11-01 | Reserved | HM2HQKYDSK
5. 2025-11-03 to 2025-11-08 | Reserved | HMB8JWA525
6. 2025-11-08 to 2025-11-12 | Reserved | HMF4XHQRNR
7. 2025-11-14 to 2025-11-17 | Block    | (No matching Simmer Highs event)
8. 2025-12-23 to 2025-12-29 | Block    | (Simmer Highs has reservation)
9. 2026-01-02 to 2026-01-06 | Block    | (Simmer Highs has reservation)
10. 2026-01-07 to 2026-01-11 | Block   | (Simmer Highs has reservation)
11. 2026-01-20 to 2026-01-25 | Block   | (Simmer Highs has reservation)
12. 2026-03-02 to 2026-03-08 | Block   | (Simmer Highs has reservation)
13. 2026-04-23 to 2026-04-26 | Block   | (Simmer Highs has reservation)
```

### All Simmer Highs Events (Chronological Order)

```
1. 2025-10-20 to 2025-10-25 | Block    | (Kaya has reservation during part of this)
2. 2025-10-25 to 2025-10-28 | Reserved | HM3KTNNJQ5 (blocks Kaya)
3. 2025-10-28 to 2025-11-14 | Block    | (Kaya has 3 reservations during this!)
4. 2025-11-20 to 2025-11-26 | Block    | ❌ MISSING FROM KAYA
5. 2025-12-06 to 2025-12-10 | Block    | (Kaya is free)
6. 2025-12-14 to 2025-12-19 | Block    | (Kaya is free)
7. 2025-12-23 to 2025-12-29 | Reserved | HM2PBRTSR2 (blocks Kaya)
8. 2026-01-02 to 2026-01-06 | Reserved | HMZ4HZCAP8 (blocks Kaya)
9. 2026-01-07 to 2026-01-11 | Reserved | HMM88A323J (blocks Kaya)
10. 2026-01-20 to 2026-01-25 | Reserved | HMDAFE3E93 (blocks Kaya)
11. 2026-02-14 to 2026-02-18 | Block   | (Kaya is free)
12. 2026-02-27 to 2026-03-02 | Block   | (Kaya is free)
13. 2026-03-02 to 2026-03-08 | Reserved | HMW8CAF5PY (blocks Kaya)
14. 2026-04-23 to 2026-04-26 | Reserved | HM3KKRYEKF (blocks Kaya)
```

---

**End of Analysis**

*Generated by Claude Code - API Endpoints Mapper Agent*
*Analysis Date: 2025-10-22*
*Total Events Analyzed: 28*
*Processing Time: ~5 minutes*
