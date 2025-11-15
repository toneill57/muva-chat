# Search Mode Configuration

Multi-tenant search mode system that allows each tenant to control how MUVA tourism content appears in their chat experience.

## Overview

Each tenant can choose between three search modes that determine the balance between accommodation-focused content and tourism information.

## Search Modes

### 🏨 Hotel Mode (`muva_match_count: 0`)

**Purpose:** Pure accommodation booking focus

**Search results include:**
- ✅ Accommodation units (public)
- ✅ Hotel policies
- ❌ MUVA tourism content (disabled)

**Best for:** Hotels that want to focus exclusively on bookings without tourism distractions.

**Configuration:**
```json
{
  "search_mode": "hotel",
  "muva_match_count": 0
}
```

---

### 🎭 Hybrid Mode (`muva_match_count: 1-4`)

**Purpose:** Balanced mix of accommodations and tourism content

**Search results include:**
- ✅ Accommodation units (public)
- ✅ Hotel policies
- ✅ MUVA tourism content (global, 1-4 documents)

**Best for:** Boutique hotels that want to highlight local experiences while maintaining booking focus.

**Configuration:**
```json
{
  "search_mode": "hybrid",
  "muva_match_count": 2  // Recommended: 1-2 for subtle, 3-4 for more tourism focus
}
```

**Data source:** Global `muva_content` table (742 tourism documents shared across all tenants)

---

### 🌍 Agency Mode (`muva_match_count: 4+`)

**Purpose:** Tourism-first experience with curated content

**Search results include:**
- ✅ Accommodation units (public)
- ✅ Hotel policies
- ✅ MUVA tourism content (tenant-specific, 4-10 documents)

**Best for:** Travel agencies that want to promote specific tourism experiences and curated listings.

**Configuration:**
```json
{
  "search_mode": "agency",
  "muva_match_count": 4  // Range: 4-10, higher = more tourism content
}
```

**Data source:** `tenant_muva_content` table (tenant uploads their own curated tourism content and MUVA business listings)

**Note:** Currently uses global `muva_content` as fallback. Tenant-specific content curation UI coming soon.

---

## Implementation Details

### Database Schema

**Storage:** `tenant_registry.features` (JSONB)

```sql
{
  "search_mode": "hotel" | "hybrid" | "agency",
  "muva_match_count": 0-10,
  "accommodation_search_enabled": true
}
```

### Code Flow

**Settings UI:** `src/app/[tenant]/settings/page.tsx`
- Radio group for mode selection
- Dynamic slider for `muva_match_count` (visible in Agency/Hybrid modes)
- Saves to `features` object via `/api/settings`

**Search Logic:** `src/lib/dev-chat-search.ts`
- `searchMUVABasic()` reads `tenant_registry.features.muva_match_count`
- If `muva_match_count === 0` → returns empty array (Hotel Mode)
- If `muva_match_count > 0` → calls `match_muva_documents_public()` RPC function

**Database Functions:**
- `match_muva_documents_public(query_embedding, match_threshold, match_count)` - Global MUVA content
- `match_tenant_muva_documents(query_embedding, p_tenant_id, match_threshold, match_count)` - Tenant-specific (future)

### Data Tables

**Global MUVA Content:**
- Table: `muva_content`
- Total documents: 742
- Embeddings: 1024d (Tier 1 - fast search)
- Content: Tourism attractions, restaurants, activities, diving spots, etc.

**Tenant-specific MUVA Content (future):**
- Table: `tenant_muva_content`
- Embeddings: 1024d
- Content: Curated business listings, custom tourism content per tenant

---

## Configuration UI

Location: `/[tenant]/settings` → "Search Mode Configuration" section

**Features:**
- Visual mode selector with descriptions
- Real-time preview of `muva_match_count` value
- Dynamic slider (hidden in Hotel Mode)
- Info alert explaining immediate effect on chat

**User Flow:**
1. Select search mode (Hotel / Hybrid / Agency)
2. Adjust slider if in Hybrid/Agency mode
3. Click "Save Settings"
4. Changes apply immediately (router.refresh() updates tenant context)

---

## Migration History

**Created:** 2025-10-18
- Migration: `20251018120000_add_search_mode_config.sql`
- Added `features.search_mode` and `features.muva_match_count` to `tenant_registry`
- Default: Hotel Mode (`muva_match_count: 0`)

**Fixed:** 2025-10-19
- Issue: Settings page not loading all tenant fields
- Fix: Changed `getTenantBySubdomain()` from explicit field list to `SELECT *`
- File: `src/lib/tenant-utils.ts`

- Issue: Wrong RPC function name
- Fix: Changed `match_muva_content_public` → `match_muva_documents_public`
- File: `src/lib/dev-chat-search.ts`

---

## Testing

**Test Hotel Mode:**
```bash
# Set muva_match_count to 0 in settings
# Ask: "háblame de buceo"
# Expected: Only accommodation results, no tourism content
```

**Test Hybrid Mode:**
```bash
# Set muva_match_count to 2 in settings
# Ask: "háblame de buceo"
# Expected: Accommodations + 2 MUVA tourism documents
# Logs: [dev-search] Found GLOBAL MUVA documents: 2
```

**Test Agency Mode:**
```bash
# Set muva_match_count to 4 in settings
# Ask: "¿qué hacer en Bogotá?"
# Expected: Accommodations + 4 MUVA tourism documents
# Logs: [dev-search] Found GLOBAL MUVA documents: 4
```

---

## Future Enhancements

1. **Tenant MUVA Content Management**
   - UI for uploading custom tourism content
   - Business listing selector (choose which MUVA businesses to promote)
   - Preview/analytics for promoted content

2. **Advanced Filtering**
   - Location-based MUVA content (e.g., only show activities near hotel)
   - Category filters (diving, restaurants, nightlife, etc.)
   - Seasonal content (beach in summer, skiing in winter)

3. **Analytics**
   - Track which search mode performs best for conversions
   - MUVA content click-through rates
   - A/B testing different `muva_match_count` values

---

**Last Updated:** October 19, 2025
