# SIRE Geographic Fields - Database Schema Clarification

**Last Updated:** October 9, 2025
**Status:** CRITICAL DOCUMENTATION - Read before working with SIRE compliance fields
**Migration:** 2025-10-09 - Columns renamed from `origin_country_code`/`destination_country_code` to `origin_city_code`/`destination_city_code`

---

## 🚨 Critical Problem Statement

During PHASE 11.6 implementation, conceptual confusion occurred **3 times** between SIRE's geographic fields. The root cause:

**Database columns were originally named `origin_country_code` and `destination_country_code` which were MISLEADING:**
- Names said "country" but fields **MUST accept Colombian CITY codes** (DIVIPOLA 5 digits)
- This caused significant implementation delays and debugging sessions
- **SOLUTION:** Columns renamed to `origin_city_code` and `destination_city_code` (Migration 20251009000003)

---

## 📍 The 3 Independent Geographic Fields

SIRE compliance requires **3 completely independent** geographic data points. They are NOT related to each other.

### Field 5: Nationality (codigo_nacionalidad)

**What is it?**
Guest's **CITIZENSHIP** country (where their passport is from)

**Code Type:** SIRE country code (1-3 digits)
**Database Column:** `nationality_code` ✅ (correctly named)
**Data Source:** `sire_countries` table

**Examples:**
- American citizen → `249` (USA)
- Colombian citizen → `169` (Colombia)
- Spanish citizen → `68` (Spain)

**Key Point:** This NEVER changes based on travel route. A US citizen is always `249` regardless of where they came from or are going to.

---

### Field 11: Procedencia/Origin (lugar_procedencia)

**What is it?**
City or country the guest traveled FROM **immediately before** arriving at the hotel

**Code Type:** DIVIPOLA city code (5 digits) **OR** SIRE country code (1-3 digits)
**Database Column:** `origin_city_code` ✅ (renamed from `origin_country_code`)
**Data Source:** `sire_cities` table (Colombian cities) OR `sire_countries` table (international)

**Examples:**
- Came from Bogotá → `11001` (DIVIPOLA city code)
- Came from Medellín → `05001` (DIVIPOLA city code)
- Came from USA → `249` (SIRE country code)
- Came from Miami directly → `249` (USA - international origin)

**Key Point:** This is about their **previous location**, not their nationality. A Colombian citizen coming from Miami would use `249` (USA), not `169` (Colombia).

---

### Field 12: Destino/Destination (lugar_destino)

**What is it?**
City or country the guest is traveling TO **immediately after** leaving the hotel

**Code Type:** DIVIPOLA city code (5 digits) **OR** SIRE country code (1-3 digits)
**Database Column:** `destination_city_code` ✅ (renamed from `destination_country_code`)
**Data Source:** `sire_cities` table (Colombian cities) OR `sire_countries` table (international)

**Examples:**
- Going to Cartagena next → `13001` (DIVIPOLA city code)
- Going to Cali next → `76001` (DIVIPOLA city code)
- Returning to USA → `249` (SIRE country code)
- Going home to Germany → `58` (SIRE country code)

**Key Point:** This is their **next destination** after checkout, NOT the hotel's location. It's about where they're going next on their journey.

---

## 🌎 Complete Travel Route Example

**Scenario:** American tourist traveling through Colombia

**Travel Itinerary:**
1. Lives in USA (citizenship)
2. Flew from Bogotá to San Andrés
3. Staying at hotel in San Andrés
4. After checkout, flying to Medellín

**SIRE Database Values:**

```typescript
{
  // Hotel Location (Field 2 - SIRE formato)
  hotel_city_code: '88001', // San Andrés - WHERE THE HOTEL IS LOCATED

  // Guest Citizenship (Field 5)
  nationality_code: '249', // USA - GUEST'S PASSPORT COUNTRY

  // Travel Route (Fields 11-12)
  origin_city_code: '11001',      // Bogotá - CITY CAME FROM (DIVIPOLA)
  destination_city_code: '05001', // Medellín - CITY GOING TO (DIVIPOLA)
}
```

**⚠️ ALL FOUR CODES ARE DIFFERENT!**
- Hotel location: `88001` (San Andrés)
- Guest nationality: `249` (USA)
- Origin: `11001` (Bogotá)
- Destination: `05001` (Medellín)

**None of these fields are related to each other.**

---

## 📊 Comparison Table

| Field | Meaning | Code Type | Column Name | Example Value | Example Label |
|-------|---------|-----------|-------------|---------------|---------------|
| **Hotel Location** | Where hotel is | DIVIPOLA 5-digit | `hotel_city_code` | `88001` | San Andrés |
| **Nationality** | Guest's citizenship | SIRE country 1-3 digit | `nationality_code` | `249` | USA |
| **Procedencia** | Where came FROM | DIVIPOLA **OR** SIRE | `origin_city_code` | `11001` | Bogotá |
| **Destino** | Where going TO | DIVIPOLA **OR** SIRE | `destination_city_code` | `05001` | Medellín |

**All column names are now clear and self-documenting ✅**

---

## 🎯 Common Use Cases

### Use Case 1: International Tourist - Direct Flight

**Scenario:** German tourist flies directly from Germany to San Andrés, then returns to Germany

```typescript
{
  hotel_city_code: '88001',     // San Andrés (hotel location)
  nationality_code: '58',       // Germany (citizenship)
  origin_city_code: '58',       // Germany (came FROM)
  destination_city_code: '58',  // Germany (going TO)
}
```

**Note:** Nationality, origin, and destination are all the same (`58`) because it's a round-trip direct flight.

---

### Use Case 2: International Tourist - Colombian Connection

**Scenario:** Brazilian tourist flies from Brazil to Bogotá, stays in San Andrés hotel, then continues to Cartagena

```typescript
{
  hotel_city_code: '88001',       // San Andrés (hotel location)
  nationality_code: '32',         // Brazil (citizenship)
  origin_city_code: '11001',      // Bogotá (Colombian CITY - DIVIPOLA)
  destination_city_code: '13001', // Cartagena (Colombian CITY - DIVIPOLA)
}
```

**Note:** Origin and destination use **5-digit DIVIPOLA codes** (Colombian cities), NOT SIRE country codes.

---

### Use Case 3: Colombian Tourist - National Travel

**Scenario:** Colombian citizen from Cali visits San Andrés, then returns to Cali

```typescript
{
  hotel_city_code: '88001',      // San Andrés (hotel location)
  nationality_code: '169',       // Colombia (citizenship)
  origin_city_code: '76001',     // Cali (DIVIPOLA city code)
  destination_city_code: '76001',// Cali (DIVIPOLA city code)
}
```

**Note:** All geographic codes are different values. Nationality is SIRE country (`169`), origin/destination are DIVIPOLA cities (`76001`).

---

## 💻 Code Examples from Production

### Interface Definition (compliance-chat-engine.ts)

```typescript
interface ConversationalData {
  // ... other fields ...

  // Geographic Fields (3 INDEPENDENT values)

  // NATIONALITY - Guest's CITIZENSHIP country
  // Example: American guest = '249' (USA)
  nationality_code?: string

  // ORIGIN - City/country came FROM before arriving
  // Example: Came from Bogotá = '11001' (DIVIPOLA city)
  // Example: Came from USA = '249' (SIRE country)
  origin_city_code?: string

  // DESTINATION - City/country going TO after checkout
  // Example: Going to Medellín = '05001' (DIVIPOLA city)
  // Example: Returning to USA = '249' (SIRE country)
  destination_city_code?: string
}
```

### Realistic Test Data (test-compliance-ui/page.tsx)

```typescript
const mockConversation: Message[] = [
  {
    role: 'assistant',
    content: 'Example: American tourist traveling Bogotá → San Andrés (hotel) → Medellín'
  },
  {
    role: 'user',
    content: JSON.stringify({
      nationality_code: '249',       // USA - Citizenship (SIRE country)
      origin_city_code: '11001',     // Bogotá - City came FROM (DIVIPOLA)
      destination_city_code: '05001',// Medellín - City going TO (DIVIPOLA)
      hotel_city_code: '88001'       // San Andrés - Hotel location (DIVIPOLA)
      // ⚠️ All 4 codes are DIFFERENT - they're independent!
    })
  }
]
```

---

## ✅ Column Naming Resolution (Migration 20251009000003)

### Previous Schema (MISLEADING ⚠️)

```sql
CREATE TABLE guest_reservations (
  nationality_code TEXT,           -- ✅ Clear
  origin_country_code TEXT,        -- ⚠️ MISLEADING - said "country" but accepted cities
  destination_country_code TEXT    -- ⚠️ MISLEADING - said "country" but accepted cities
)
```

### Current Schema (CORRECTED ✅)

```sql
CREATE TABLE guest_reservations (
  nationality_code TEXT,      -- ✅ SIRE country code (citizenship)
  origin_city_code TEXT,      -- ✅ DIVIPOLA city OR SIRE country (came FROM)
  destination_city_code TEXT  -- ✅ DIVIPOLA city OR SIRE country (going TO)
)
```

### Migration Applied

**Date:** October 9, 2025
**File:** `supabase/migrations/20251009000003_rename_location_fields_to_city.sql`

**Changes:**
- `origin_country_code` → `origin_city_code`
- `destination_country_code` → `destination_city_code`

**Reason:** The word "city" accurately reflects that these fields primarily accept Colombian city codes (DIVIPOLA 5 digits), while also accepting international country codes (SIRE 1-3 digits) when needed.

---

## 🔍 Validation Checklist

Before submitting SIRE data, verify:

- [ ] **Nationality** uses SIRE country code (1-3 digits)
- [ ] **Origin** uses DIVIPOLA city (5 digits) **OR** SIRE country (1-3 digits)
- [ ] **Destination** uses DIVIPOLA city (5 digits) **OR** SIRE country (1-3 digits)
- [ ] All three values are **independent** (can be different)
- [ ] Origin/Destination are about **travel route**, not nationality
- [ ] Destination is where guest goes **AFTER leaving hotel**, not hotel location

---

## 📚 Related Documentation

- **Official SIRE Codes:** `docs/sire/CODIGOS_OFICIALES.md`
- **Database Catalogs:** `sire_countries`, `sire_cities` tables
- **Implementation:** `src/lib/compliance-chat-engine.ts`
- **Testing:** `src/app/test-compliance-ui/page.tsx`
- **FASE 11.2 Summary:** `docs/sire/FASE_11_2_SUMMARY.md`

---

## 🛠️ For Future Developers

**When working with SIRE geographic fields:**

1. **Read this document first** - Understand the 3 independent fields
2. **Remember:** `origin_city_code` and `destination_city_code` accept **both city and country codes**
3. **Use realistic examples** - Not all codes will be the same
4. **Verify with user** - Ask: "Where did you come from?" vs "What's your nationality?"
5. **Test with variety** - International direct, connection flights, national travel

**Common Mistakes to Avoid:**
- ❌ Using nationality code for origin/destination
- ❌ Using hotel location code for destination
- ❌ Assuming all three fields should be the same
- ❌ Only testing with SIRE country codes (ignoring DIVIPOLA cities)
- ❌ Using old column names (`origin_country_code` - migration applied Oct 2025)

---

**END OF DOCUMENTATION**
