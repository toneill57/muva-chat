# 🏝️ MUVA Listings Guide

**Status:** ✅ **PRODUCTION-READY** | **Last Updated:** Sept 30, 2025 | **Type:** Content Management System

---

## 📊 Estado Actual de Procesamiento

**Progress de MUVA listings**:
- ✅ **Procesados**: 1 de 38 listings (2.6%)
  - `blue-life-dive.md` → Con embeddings Tier 1 (1024d) + Tier 3 (3072d)
- ⏳ **Pendientes**: 37 listings (97.4%)
  - 11 actividades | 6 restaurantes | 17 spots | 2 alquileres | 1 nightlife

**Ver tareas detalladas**: `/TODO.md` → **Prioridad #3: MUVA Listings Expansion**

**Comando para procesar**:
```bash
node scripts/populate-embeddings.js _assets/muva/listings/[categoria]/[archivo].md
```

---

## Overview

The **MUVA Listings System** provides a standardized, template-based approach for creating and managing tourism content in San Andrés. Built on top of the Matryoshka embeddings architecture, it enables ultra-fast search (<15ms) with rich business metadata for Premium Chat.

### Key Features

- 📋 **Standardized Template**: Single source of truth for all tourism listings
- 🔄 **JSON → MD Conversion**: Automated migration from existing JSON data
- ⚡ **Auto-Embedding Generation**: One command to process and deploy
- 💰 **Rich Business Metadata**: Precio, teléfono, zona, website in structured JSONB
- 🎯 **Premium Chat Integration**: Conversational responses with actionable information
- 🚀 **Ultra-Fast Search**: Tier 1 (1024d) embeddings for <15ms response times

---

## Quick Start

### Creating a New Listing (From Scratch)

```bash
# 1. Copy the template
cp _assets/muva/muva-listing-template.md _assets/muva/listings-enriched/mi-nuevo-negocio.md

# 2. Edit the YAML frontmatter and markdown content
# (See Template Structure section below)

# 3. Generate embeddings
node scripts/populate-embeddings.js _assets/muva/listings-enriched/mi-nuevo-negocio.md

# 4. Done! Your listing is now live in Premium Chat
```

### Migrating from JSON

```bash
# 1. Convert existing JSON to MD
node scripts/convert-json-to-muva-md.js _assets/muva/listings-enriched/existing-listing.json

# 2. Review and enhance the generated MD (optional)
# The script auto-generates metadata, but you can improve descriptions

# 3. Generate embeddings
node scripts/populate-embeddings.js _assets/muva/listings-enriched/existing-listing.md

# 4. Done! JSON listing is now a structured MD with embeddings
```

---

## Template Structure

### YAML Frontmatter (Metadata)

The frontmatter defines how your listing is stored, searched, and displayed:

```yaml
---
version: "1.0"
type: tourism  # Always "tourism" for MUVA content

destination:
  schema: public
  table: muva_content  # Always "muva_content"

document:
  title: "NOMBRE DEL NEGOCIO"  # ✅ REQUIRED - shown in chat
  description: "Descripción corta del negocio"  # ✅ REQUIRED
  category: activities  # ✅ REQUIRED - see categories below
  subcategory: deportes_acuaticos  # ✅ REQUIRED - see subcategories below
  language: es
  version: "1.0"
  status: active
  tags: [tag1, tag2, tag3]  # Search optimization
  keywords: [keyword1, keyword2]  # Search optimization

business:
  id: nombre-negocio-slug  # ✅ REQUIRED - unique identifier
  nombre: NOMBRE DEL NEGOCIO  # ✅ REQUIRED - official name
  categoria: Actividad  # ✅ REQUIRED - Actividad, Restaurante, Hospedaje

  # 💰 CRITICAL for UX - shown in Premium Chat
  horario: "Lunes a Viernes 9:00 - 18:00"  # Operating hours
  precio: "Desde $50,000 COP por persona"  # Pricing info

  # 📞 CRITICAL for conversions - shown in Premium Chat
  contacto: "@instagramhandle"  # Social media handle
  telefono: "+573001234567"  # Phone with country code
  website: "https://ejemplo.com"  # Full URL

  # 📍 IMPORTANT for localization
  zona: "Centro"  # Main zone (Centro, San Luis, La Loma, etc.)
  subzona: "Spratt Bight"  # Optional - specific area within zone

  # 🎯 Segmentation for marketing
  segmentacion: ["Low cost", "mochilero", "aventurero", "eco friendly"]

  # 🎪 Activity-specific (optional)
  actividades_disponibles: ["actividad1", "actividad2"]
  caracteristicas_zona: ["Característica 1", "Característica 2"]
  landmarks_cercanos: ["Landmark 1", "Landmark 2"]
---
```

### Valid Categories & Subcategories

#### **Category: activities**
- `deportes_acuaticos`: Buceo, surf, paddle board, snorkel
- `deportes_aereos`: Parasailing, paracaídas
- `tours`: City tours, ecological tours, boat tours
- `cultura`: Museums, historical sites

#### **Category: restaurants**
- `gastronomia_saludable`: Smoothie bars, healthy food, organic
- `gastronomia_local`: Traditional Colombian/Caribbean cuisine
- `gastronomia_internacional`: Italian, Asian, American, etc.
- `cafeterias`: Coffee shops, bakeries

#### **Category: hotels**
- `boutique`: Small, personalized hotels
- `economico`: Budget-friendly accommodations
- `lujo`: Luxury resorts

---

## Field Impact on Premium Chat

Understanding how fields appear in chat helps you prioritize what to fill out:

### Critical Fields (Always Shown)

| Field | Impact | Example |
|-------|--------|---------|
| `business.nombre` | **Title** of response | "En San Andrés puedes ir a **BANZAI SURF SCHOOL**:" |
| `business.precio` | **💰 Pricing** line | "💰 Precio: Clase privada $190,000 COP" |
| `business.telefono` | **📞 Contact** line | "📞 Contacto: +573173751265" |
| `business.zona` | **📍 Location** line | "📍 Zona: San Luis - El Paraíso" |
| `business.website` | **🌐 Web** line | "🌐 Web: banzaisurfschool.com.co" |

### Example Premium Chat Response

**User Query:** "dónde surfear"

**System Response:**
```
En San Andrés puedes ir a BANZAI SURF SCHOOL:

📍 Zona: San Luis - El Paraíso
💰 Precio: Clase privada de surf (1 a 2 personas): 190,000 por persona
📞 Contacto: +573173751265
🌐 Web: banzaisurfschool.com.co

Banzai Surf School es una escuela de deportes acuáticos ubicada en
San Andrés, Colombia, que se especializa en transmitir la pasión por
el surf y el mar más allá de una simple clase deportiva...
```

**Without business fields:**
```
En San Andrés puedes ir a esta actividad:

[generic description without pricing or contact info]
```

---

## Database Schema

All listings are stored in `public.muva_content` with the following structure:

### Core Columns

```sql
CREATE TABLE public.muva_content (
  id UUID PRIMARY KEY,
  content TEXT,  -- Markdown content

  -- Matryoshka embeddings (multi-tier)
  embedding VECTOR(3072),  -- Tier 3: Full precision
  embedding_fast VECTOR(1024),  -- Tier 1: Ultra-fast search

  -- Metadata from frontmatter
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),  -- activities, restaurants, hotels
  subcategory VARCHAR(100),  -- deportes_acuaticos, gastronomia_saludable, etc.

  -- Business info (JSONB) - ALL business.* fields from YAML
  business_info JSONB,  -- {precio, telefono, zona, website, contacto, etc.}

  -- Search optimization
  tags TEXT[],
  keywords TEXT[],

  -- File tracking
  source_file VARCHAR(255),
  document_type VARCHAR(50),
  chunk_index INTEGER,
  total_chunks INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### business_info JSONB Structure

```json
{
  "zona": "San Luis",
  "subzona": "El Paraíso",
  "precio": "Clase privada: 190,000 por persona",
  "horario": "Segun se reserve",
  "telefono": "+573173751265",
  "contacto": "@banzaisurfschooladz",
  "website": "https://banzaisurfschool.com.co/",
  "categoria": "Actividad",
  "segmentacion": ["Low cost", "aventurero", "eco friendly"],
  "actividades_disponibles": ["surf principiantes", "paddle board"],
  "caracteristicas_zona": ["Playas menos concurridas", "Zona residencial"],
  "landmarks_cercanos": ["Calle El Radar"]
}
```

---

## Script Reference

### convert-json-to-muva-md.js

**Purpose:** Converts existing JSON listings to structured MD format

**Usage:**
```bash
node scripts/convert-json-to-muva-md.js <json-file-path>
```

**What it does:**
1. Reads JSON file from MUVA listings
2. Extracts all business metadata
3. Auto-detects category and subcategory
4. Generates YAML frontmatter
5. Creates markdown content with standard sections
6. Saves as `.md` in same directory

**Example:**
```bash
node scripts/convert-json-to-muva-md.js _assets/muva/listings-enriched/bali-smoothies.json
# Output: _assets/muva/listings-enriched/bali-smoothies.md
```

### populate-embeddings.js

**Purpose:** Generates multi-tier embeddings and inserts into database

**Usage:**
```bash
node scripts/populate-embeddings.js <md-file-path>
```

**What it does:**
1. Parses YAML frontmatter metadata
2. Validates required fields
3. Chunks content (1000 chars, 100 overlap)
4. Generates embeddings:
   - Tier 1 (1024d) for ultra-fast search
   - Tier 3 (3072d) for full precision
5. Extracts `business.*` into `business_info` JSONB
6. Inserts into `public.muva_content`
7. Creates HNSW indexes for fast similarity search

**Output:**
```
✅ Business info structured: zona=San Luis, precio=yes, telefono=yes
✅ Chunk 1 inserted successfully
✅ Chunk 2 inserted successfully
📊 Document processing complete: 4 successful, 0 failed
```

---

## Real-World Examples

### Example 1: Banzai Surf School (Activities)

**File:** `_assets/muva/listings-enriched/banzai-surf-school.md`

**Highlights:**
- ✅ Complete business info (precio, teléfono, zona, website)
- ✅ Rich content with services breakdown
- ✅ 4 chunks with full metadata
- ✅ Premium Chat shows: location, pricing, contact in every response

**Key Learning:** Complete business fields = better UX = higher conversions

### Example 2: Bali Smoothies (Restaurant)

**File:** `_assets/muva/listings-enriched/bali-smoothies.md`

**Highlights:**
- ✅ Converted from JSON automatically
- ✅ Category: restaurants, Subcategory: gastronomia_saludable
- ✅ Price range format: "$10,000 - $20,000"
- ⚠️ Missing `zona` field (should add for better localization)

**Key Learning:** Script does 80% of work, but manual review improves quality

### Example 3: Blue Life Dive (Activities)

**File:** `_assets/muva/listings-enriched/blue-life-dive.md`

**Highlights:**
- ✅ Converted from JSON with rich zona info
- ✅ Category: activities, Subcategory: deportes_acuaticos
- ✅ Detailed history and recommendations sections
- ⚠️ Missing `telefono` in business (only in contacto field)

**Key Learning:** Separate phone from contacto for better structure

---

## Troubleshooting

### Error: "document_type_check constraint violation"

**Cause:** Invalid category value in `document.category`

**Solution:** Use only these values:
- `activities`
- `restaurants`
- `hotels`
- `transport` (future)
- `beaches` (future)

**NOT:** ~~`restaurantes`~~, ~~`actividades`~~, ~~`hospedajes`~~ (Spanish values will fail)

### Error: "zona=undefined" in logs

**Cause:** Missing `business.zona` field in YAML

**Impact:** Location won't show in Premium Chat responses

**Solution:** Add zona to business section:
```yaml
business:
  zona: "Centro"  # or "San Luis", "La Loma", etc.
```

### Embeddings Generated But Not Appearing in Chat

**Cause:** Similarity threshold too high (>20%)

**Current Threshold:** 0.2 (20% similarity)

**How to Test:**
1. Query exact business name → should always work
2. Query category ("dónde bucear") → should work for relevant listings
3. Query very generic ("actividades") → may not work if similarity <20%

**Solution:** If specific listing not appearing:
1. Check if content is relevant to query
2. Verify embeddings exist: `SELECT COUNT(*) FROM muva_content WHERE source_file = 'your-file.md'`
3. Check similarity: query should score >0.2 for listing

### Script Hangs During Embedding Generation

**Cause:** Usually OpenAI API rate limits or network issues

**Solution:**
1. Check internet connection
2. Verify `OPENAI_API_KEY` in `.env.local`
3. If multiple files, process one at a time
4. Check OpenAI dashboard for rate limit errors

---

## Best Practices

### Content Quality

1. **Be Specific with Pricing**
   - ✅ "Clase privada: $190,000 por persona"
   - ❌ "Consultar precios"

2. **Include Full Phone Numbers**
   - ✅ "+573173751265"
   - ❌ "301 6548965" (missing country code)

3. **Use Complete Zone Names**
   - ✅ "Centro", "San Luis", "La Loma"
   - ❌ "centro", "downtown", "near airport"

4. **Write Conversational Descriptions**
   - ✅ "Banzai Surf School es una escuela de deportes acuáticos..."
   - ❌ "Surf school. Good prices. Call for info."

### Metadata Optimization

1. **Tags**: Use 5-8 specific tags related to the service
2. **Keywords**: Include business name variations and key terms
3. **Segmentation**: Be inclusive - more segments = more discoverability
4. **Subcategory**: Choose the most specific subcategory available

### File Naming

- Use lowercase with hyphens: `banzai-surf-school.md`
- Match `business.id` field: `id: banzai-surf-school`
- Be descriptive but concise: max 50 chars

---

## Maintenance

### Updating an Existing Listing

```bash
# 1. Edit the MD file directly
vim _assets/muva/listings-enriched/banzai-surf-school.md

# 2. Delete old embeddings
# (Script will auto-delete on re-run based on source_file)

# 3. Regenerate embeddings
node scripts/populate-embeddings.js _assets/muva/listings-enriched/banzai-surf-school.md
```

### Bulk Operations

**Converting all JSONs in a directory:**
```bash
for file in _assets/muva/listings-enriched/*.json; do
  node scripts/convert-json-to-muva-md.js "$file"
done
```

**Generating embeddings for all MDs:**
```bash
for file in _assets/muva/listings-enriched/*.md; do
  node scripts/populate-embeddings.js "$file"
done
```

---

## Roadmap

### Planned Features

- [ ] **Batch Processing UI**: Web interface for managing listings
- [ ] **Auto-Translation**: Spanish → English → other languages
- [ ] **Image Upload**: Integrate with Supabase Storage
- [ ] **Review System**: User ratings and comments
- [ ] **Analytics**: Track which listings get most queries

### Template Enhancements

- [ ] **Transport Category**: Taxis, rentals, shuttles
- [ ] **Beaches Template**: Specific fields for beach features
- [ ] **Events Template**: Date ranges, recurring events

---

## Related Documentation

- **Premium Chat Architecture:** `PREMIUM_CHAT_ARCHITECTURE.md`
- **Matryoshka Embeddings:** `MATRYOSHKA_ARCHITECTURE.md`
- **LLM Intent Detection:** `LLM_INTENT_DETECTION.md`
- **Database Schema:** `DATABASE_SCHEMA_MIGRATION_GUIDE.md`

---

**Last Updated:** Sept 2025
**Maintainer:** MUVA Development Team
**Questions?** See `TROUBLESHOOTING.md` or file an issue