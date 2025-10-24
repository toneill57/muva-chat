# ADR-004: Multi-Room Support Architecture

**Date**: October 24, 2025
**Status**: ✅ ACCEPTED
**Context**: Guest Chat - Handle guests with multiple accommodation units

---

## Context and Problem Statement

**Scenario**: Guest books 2+ rooms (family, group travel).

**Current limitation**: `guest_reservations.accommodation_unit_id` is single UUID.

**Problem**:
- Guest can only access manual info for 1 room
- WiFi password query only returns 1 result
- Chat context incomplete for multi-room bookings

---

## Decision

**Change schema to support array of accommodation units:**

```sql
ALTER TABLE guest_reservations
ALTER COLUMN accommodation_unit_id TYPE UUID[] USING ARRAY[accommodation_unit_id];

-- Rename for clarity
ALTER TABLE guest_reservations
RENAME COLUMN accommodation_unit_id TO accommodation_unit_ids;
```

**Chat engine searches ALL units:**

```typescript
// Guest session
const guestSession = {
  accommodationUnitIds: ['uuid-room-1', 'uuid-room-2'],  // Array
};

// Vector search loops through all
for (const unitId of guestSession.accommodationUnitIds) {
  const chunks = await searchUnitManuals(queryEmbedding, unitId);
  allChunks.push(...chunks);
}
```

**Response formatting:**

```typescript
if (guestSession.accommodationUnitIds.length > 1) {
  systemPrompt += `
  IMPORTANT: Guest has ${guestSession.accommodationUnitIds.length} rooms.
  When providing room-specific info (WiFi, door codes), SPECIFY which room.

  Guest's rooms:
  ${rooms.map(r => `- ${r.name}`).join('\n')}
  `;
}
```

---

## Consequences

### Positive
- ✅ Guests with multiple rooms get complete info
- ✅ Chat explicitly mentions room names
- ✅ Better user experience for groups/families

### Negative
- ⚠️ Migration required (single UUID → array)
- ⚠️ More complex search (N units instead of 1)

---

## Implementation

**Migration**: `supabase/migrations/[TIMESTAMP]_multi_room_support.sql`

```sql
-- Convert single UUID to array
ALTER TABLE guest_reservations
ALTER COLUMN accommodation_unit_id TYPE UUID[]
USING ARRAY[accommodation_unit_id];

-- Rename column
ALTER TABLE guest_reservations
RENAME COLUMN accommodation_unit_id TO accommodation_unit_ids;
```

**Auth logic**: `src/lib/guest-auth.ts:150`

```typescript
const accommodationUnitIds = reservation.accommodation_unit_ids || [];

return {
  ...session,
  accommodationUnitIds,  // Array
};
```

---

**Decision Made By**: Backend Developer Agent
**Implementation Date**: October 24, 2025
