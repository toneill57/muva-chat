# Sistema de Embeddings y Documentos - Guest Chat

**Autor:** Sistema MUVA Chat
**Fecha:** Octubre 2025
**Propósito:** Documentación técnica de referencia para el sistema de embeddings y fuentes de documentos en el chat de huéspedes

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Dominio 1: MUVA Content (Turismo)](#dominio-1-muva-content-turismo)
3. [Dominio 2: Hotel General Info](#dominio-2-hotel-general-info)
4. [Dominio 3: Unit Manuals (Privado)](#dominio-3-unit-manuals-privado)
5. [Arquitectura Matryoshka](#arquitectura-matryoshka)
6. [Flujo de Búsqueda Completo](#flujo-de-búsqueda-completo)
7. [Scripts y Comandos](#scripts-y-comandos)
8. [Tablas de Referencia Rápida](#tablas-de-referencia-rápida)
9. [Troubleshooting](#troubleshooting)

---

## Visión General

El sistema de chat de huéspedes utiliza **3 dominios de información** con **embeddings Matryoshka** (múltiples tamaños) para búsquedas semánticas eficientes.

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────┐
│          GUEST CHAT ENGINE                               │
│                                                           │
│  User Query → Embeddings → Búsqueda Paralela → Response │
└─────────────────────────────────────────────────────────┘
                ↓                    ↓
         ┌──────────┐      ┌────────────────────┐
         │ OpenAI   │      │  3 Búsquedas       │
         │ Embedding│      │  Paralelas:        │
         │ API      │      │  (Promise.all)     │
         └──────────┘      └────────────────────┘
                ↓                    ↓
         [ 3 TAMAÑOS ]      ┌──────────────────────────────┐
         • 1024d (fast)     │ 1. MUVA (turismo público)    │
         • 1536d (balanced) │ 2. Hotel General Info        │
         • 3072d (full)     │ 3. Unit Manuals (privado)    │
                            └──────────────────────────────┘
                                     ↓
                            ┌──────────────────────────────┐
                            │ Claude Sonnet 4 LLM          │
                            │ Genera respuesta conversacional│
                            └──────────────────────────────┘
```

### Características Clave

- ✅ **3 dominios de información** con permisos diferenciados
- ✅ **Búsqueda paralela** para maximizar velocidad
- ✅ **Multi-room support** - busca en TODAS las habitaciones del huésped
- ✅ **Arquitectura Matryoshka** - 3 tiers de embeddings (1024d, 1536d, 3072d)
- ✅ **Chunking inteligente** - manuales divididos por secciones para mejor precisión
- ✅ **Reducción de costos** - 81% menos tokens vs embeddings full-size

---

## Dominio 1: MUVA Content (Turismo)

### ¿Qué es?

Información turística de San Andrés: playas, restaurantes, actividades, transporte, eventos, cultura.

**Acceso:** ✅ Público - Todos los huéspedes (si `tenant_features.muva_access = true`)

### Tabla de Base de Datos

**Nombre:** `muva_content`
**Schema:** `public`

```sql
CREATE TABLE muva_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,                      -- Contenido completo del documento
  embedding_fast vector(1024),                -- Tier 1: búsquedas ultra-rápidas
  embedding vector(1536),                     -- Tier 2: búsquedas balanceadas (no usado actualmente)
  source_file varchar,                        -- Nombre del archivo fuente
  document_type varchar                       -- tourism, restaurants, beaches, activities, etc.
    CHECK (document_type IN ('tourism', 'restaurants', 'beaches', 'activities',
                              'transport', 'hotels', 'culture', 'events', 'spots', 'rentals')),
  business_info jsonb DEFAULT '{}',           -- { precio, telefono, website, horario, zona, etc. }
  subcategory varchar,                        -- deportes_acuaticos, gastronomia_local, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Índices HNSW para búsqueda vectorial rápida
CREATE INDEX idx_muva_content_embedding_fast
  ON muva_content USING hnsw (embedding_fast vector_cosine_ops);
```

### Origen de Documentos

**Formato:** Archivos Markdown (`.md`) con frontmatter YAML

**Ubicación (esperada):** `data/muva-content/` o similar (ubicación exacta puede variar)

**Ejemplo de Archivo:**

```markdown
---
nombre: "Johnny Cay"
categoria: "playas"
subcategoria: "playas_populares"
precio: "desde $20,000 COP"
telefono: "+57 300 123 4567"
website: "https://johnnycay.com"
horario: "8:00 AM - 5:00 PM"
zona: "Norte"
contacto: "WhatsApp: +57 300 123 4567"
---

# Johnny Cay

## Descripción

Johnny Cay es una pequeña isla coralina ubicada a 1.5 km de San Andrés.
Conocida por sus aguas cristalinas y ambiente caribeño auténtico.

## Cómo Llegar

Lanchas desde Muelle Toninos cada 30 minutos.

## Qué Hacer

- Snorkeling en arrecifes
- Reggae music en la playa
- Comida típica caribeña
```

### Generación de Embeddings

**Script:** `scripts/populate-embeddings.js` o `scripts/generate-embeddings.ts`

**Proceso:**

1. Lee archivos `.md` de carpeta MUVA
2. Extrae frontmatter YAML → `business_info`
3. Combina frontmatter + contenido markdown
4. Genera embeddings con OpenAI:
   ```javascript
   const embedding = await openai.embeddings.create({
     model: 'text-embedding-3-large',
     input: fullContent,
     dimensions: 1024  // Tier 1: Fast
   })
   ```
5. Inserta en `muva_content` con metadata

**Comando (ejemplo):**

```bash
# Generar embeddings para todos los documentos MUVA
node scripts/populate-embeddings.js --source muva --tier 1

# O usando TypeScript
npx tsx scripts/generate-embeddings.ts --domain muva
```

### Función RPC de Búsqueda

**Nombre:** `match_muva_documents()`

**Ubicación:** Supabase Database Functions

```sql
CREATE OR REPLACE FUNCTION match_muva_documents(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.15,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  source_file varchar,
  document_type varchar,
  business_info jsonb,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.content,
    mc.source_file,
    mc.document_type,
    mc.business_info,
    1 - (mc.embedding_fast <=> query_embedding) as similarity
  FROM muva_content mc
  WHERE 1 - (mc.embedding_fast <=> query_embedding) > match_threshold
  ORDER BY mc.embedding_fast <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Uso en código:**

```typescript
// src/lib/conversational-chat-engine.ts
async function searchTourism(embedding: number[]): Promise<VectorSearchResult[]> {
  const { data, error } = await supabase.rpc('match_muva_documents', {
    query_embedding: embedding,
    match_threshold: 0.15,
    match_count: 5,
  })

  return (data || []).map(item => ({
    ...item,
    table: 'muva_content',
  }))
}
```

---

## Dominio 2: Hotel General Info

### ¿Qué es?

Información general del hotel que aplica a **TODOS los huéspedes**: FAQ, políticas, instrucciones de llegada, amenidades generales.

**Acceso:** ✅ Todos los huéspedes del tenant

### Tabla de Base de Datos

**Nombre:** `hotels`
**Schema:** `public`

```sql
CREATE TABLE hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant_registry(tenant_id),
  name varchar NOT NULL,
  description text,
  short_description text,
  full_description text,

  -- Embeddings Matryoshka para búsqueda
  embedding_fast vector(1024),              -- Tier 1: búsquedas turísticas ultra-rápidas
  embedding_balanced vector(1536),          -- Tier 2: búsquedas de políticas

  -- Contenido para embeddings
  tourism_summary text,                     -- Resumen para búsquedas turísticas
  policies_summary text,                    -- Resumen de políticas generales

  -- Metadata
  hotel_amenities jsonb DEFAULT '[]',      -- Amenidades del hotel
  policies jsonb,                           -- Políticas detalladas
  contact_info jsonb,                       -- Teléfono, email, etc.

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Índices HNSW
CREATE INDEX idx_hotels_embedding_fast
  ON hotels USING hnsw (embedding_fast vector_cosine_ops);

CREATE INDEX idx_hotels_embedding_balanced
  ON hotels USING hnsw (embedding_balanced vector_cosine_ops);
```

### Origen de Documentos

**Creación:** Manual a través del Admin Dashboard o sincronización MotoPress

**Rutas:**
- Admin UI: `/[tenant]/settings`
- API: `/api/settings`

**Proceso:**

1. Admin completa formulario con información del hotel
2. Sistema genera automáticamente embeddings de:
   - `tourism_summary` → `embedding_fast` (1024d)
   - `policies_summary` → `embedding_balanced` (1536d)
3. Se actualiza el registro del hotel

### Generación de Embeddings

**Automático:** Al crear/actualizar hotel

**Código (ejemplo):**

```typescript
// Al guardar hotel
const tourismEmbedding = await openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: tourism_summary,
  dimensions: 1024
})

const policiesEmbedding = await openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: policies_summary,
  dimensions: 1536
})

await supabase
  .from('hotels')
  .update({
    embedding_fast: tourismEmbedding.data[0].embedding,
    embedding_balanced: policiesEmbedding.data[0].embedding
  })
  .eq('id', hotel_id)
```

### Función RPC de Búsqueda

**Nombre:** `match_hotel_general_info()`

```sql
CREATE OR REPLACE FUNCTION match_hotel_general_info(
  query_embedding vector,
  p_tenant_id uuid,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name varchar,
  info_content text,
  info_title text,
  similarity double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.name,
    COALESCE(h.policies_summary, h.description) as info_content,
    'Hotel Information' as info_title,
    1 - (h.embedding_balanced <=> query_embedding) as similarity
  FROM hotels h
  WHERE h.tenant_id = p_tenant_id
    AND 1 - (h.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY h.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Dominio 3: Unit Manuals (Privado)

### ¿Qué es?

Información **PRIVADA** específica de cada habitación: contraseña WiFi, código caja fuerte, instrucciones de electrodomésticos, tips de la habitación.

**Acceso:** 🔒 Solo el huésped asignado a esa habitación

### ¿Por Qué Chunking?

**Problema:** Documentos completos generan embeddings poco precisos (similarity ~0.24)

**Solución:** Dividir el manual en **chunks por secciones** mejora la precisión drásticamente:

- ✅ Similarity típica: **0.85+** (vs 0.24 sin chunking)
- ✅ Búsquedas específicas: "WiFi password" → encuentra directamente la sección
- ✅ Sin ruido: No mezcla información de caja fuerte con WiFi

### Tabla de Base de Datos

**Nombre:** `accommodation_units_manual_chunks`
**Schema:** `public`

```sql
CREATE TABLE accommodation_units_manual_chunks (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenant_registry(tenant_id),
  accommodation_unit_id uuid NOT NULL REFERENCES hotels.accommodation_units(id),
  manual_id uuid NOT NULL REFERENCES accommodation_units_manual(unit_id),

  -- Contenido del chunk
  chunk_content text NOT NULL,                -- SECCIÓN específica del manual
  chunk_index int NOT NULL,                   -- Posición del chunk (0, 1, 2...)
  total_chunks int NOT NULL,                  -- Total de chunks del manual
  section_title text,                         -- "Conectividad", "Aire Acondicionado", etc.

  -- Embeddings Matryoshka (3 tiers)
  embedding vector(3072),                     -- Tier 3: Full precision (NO indexed)
  embedding_balanced vector(1536),            -- Tier 2: Balanced (INDEXED)
  embedding_fast vector(1024),                -- Tier 1: Fast (INDEXED)

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Índices HNSW (solo para Tier 1 y Tier 2, límite Supabase 2000d)
CREATE INDEX idx_unit_manual_chunks_embedding_balanced
  ON accommodation_units_manual_chunks USING hnsw (embedding_balanced vector_cosine_ops);

CREATE INDEX idx_unit_manual_chunks_embedding_fast
  ON accommodation_units_manual_chunks USING hnsw (embedding_fast vector_cosine_ops);
```

### Origen de Documentos

**Formato:** Archivos Markdown con frontmatter

**Ubicación esperada:** `data/accommodations/manuals/` o carpeta específica por tenant

**Ejemplo de Manual:**

```markdown
---
accommodation: "Kaya"
tenant_id: "b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"
unit_number: "101"
---

# Manual de Kaya #101

## Conectividad

### WiFi
**Red:** SimmerDown_Guest
**Contraseña:** `summer2024!`

**Troubleshooting:**
- Si no conecta, reinicia el router (botón rojo en sala)
- Router ubicado arriba del closet principal

### Smart TV
Canal Netflix precargado, usar control remoto Samsung.

## Aire Acondicionado

Control remoto en primer cajón del nightstand.

**Configuración recomendada:**
- Modo: Cool
- Temperatura: 22°C
- Fan Speed: Auto

**Tips:**
- Apagar cuando salgas (ahorro energía)
- No abrir ventanas con AC encendido

## Mini-Cocina y Electrodomésticos

### Cafetera Nespresso
Cápsulas disponibles en cocina (cortesía).

**Uso:**
1. Llenar tanque de agua
2. Insertar cápsula
3. Presionar botón espresso (25ml) o lungo (110ml)

### Microondas
Potencia máxima 800W.

**Importante:** No usar recipientes metálicos.

## Emergencias

### Números Importantes
- Recepción: Ext. 0 o +57 318 555 1234
- Emergencias: 123
- Ambulancia: 125

### Extintor
Ubicado detrás de la puerta principal.

### Salida de Emergencia
Segunda puerta a la izquierda del pasillo.

## Tips Específicos de Kaya

- Vista al mar desde balcón (mejor al atardecer)
- Hamaca ideal para lectura
- Caja fuerte: Código inicial es tu fecha de nacimiento (DDMMYY)
  - Cambiar código: Presionar * + nuevo código + #
```

### Generación de Embeddings

**Script:** `scripts/process-accommodation-manuals.js`

**Proceso de Chunking:**

1. Lee archivo `.md`
2. Extrae frontmatter (accommodation, tenant_id, etc.)
3. **Divide contenido por headers `##`** (cada sección = 1 chunk)
4. Para cada chunk:
   ```javascript
   // Genera 3 embeddings por chunk
   const [fast, balanced, full] = await Promise.all([
     openai.embeddings.create({
       model: 'text-embedding-3-large',
       input: chunkContent,
       dimensions: 1024
     }),
     openai.embeddings.create({
       model: 'text-embedding-3-large',
       input: chunkContent,
       dimensions: 1536
     }),
     openai.embeddings.create({
       model: 'text-embedding-3-large',
       input: chunkContent,
       dimensions: 3072
     })
   ])
   ```
5. Inserta en `accommodation_units_manual_chunks` con:
   - `chunk_index`: 0, 1, 2, ...
   - `section_title`: Texto del header `##`
   - `chunk_content`: Contenido completo de la sección

**Comando:**

```bash
# Procesar manuals de una carpeta
node scripts/process-accommodation-manuals.js

# Con path específico
node scripts/process-accommodation-manuals.js \
  --path data/accommodations/manuals/simmerdown
```

### Función RPC de Búsqueda

**Nombre:** `match_unit_manual_chunks()`

```sql
CREATE OR REPLACE FUNCTION match_unit_manual_chunks(
  query_embedding vector,
  p_accommodation_unit_id uuid,
  match_threshold double precision DEFAULT 0.25,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk_content text,
  chunk_index int,
  section_title text,
  similarity double precision,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.chunk_content,
    mc.chunk_index,
    mc.section_title,
    1 - (mc.embedding_balanced <=> query_embedding) as similarity,
    mc.metadata
  FROM accommodation_units_manual_chunks mc
  WHERE mc.accommodation_unit_id = p_accommodation_unit_id
    AND 1 - (mc.embedding_balanced <=> query_embedding) > match_threshold
  ORDER BY mc.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Uso en código (multi-room support):**

```typescript
// src/lib/conversational-chat-engine.ts
async function searchUnitManual(
  embedding: number[],
  unitId: string,
  unitName?: string
): Promise<VectorSearchResult[]> {
  const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
    query_embedding: embedding,
    p_accommodation_unit_id: unitId,
    match_threshold: 0.25,
    match_count: 5,
  })

  return (data || []).map(item => ({
    ...item,
    table: 'accommodation_units_manual_chunks',
    content: item.chunk_content || '',
    metadata: {
      ...item.metadata,
      unit_name: unitName,  // Para etiquetar qué habitación
    },
  }))
}

// Multi-room: buscar en TODAS las habitaciones del huésped
const accommodationUnits = guestInfo.accommodation_units || []
const unitManualSearches = accommodationUnits.map(unit =>
  searchUnitManual(queryEmbedding, unit.id, unit.name)
)
const allUnitManuals = await Promise.all(unitManualSearches)
```

---

## Arquitectura Matryoshka

### ¿Qué es Matryoshka Embeddings?

Sistema de embeddings de **múltiples dimensiones** que permite elegir el tamaño óptimo según velocidad/precisión requerida.

**Analogía:** Como muñecas rusas 🪆 - cada tier contiene la información del anterior pero con más detalle.

### Los 3 Tiers

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: FAST (1024 dimensiones)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Uso:           Búsquedas turísticas (MUVA)             │
│ Velocidad:     ⚡⚡⚡ Ultra-rápido (<50ms)              │
│ Precisión:     ⭐⭐⭐ Buena                             │
│ Index:         ✅ HNSW (vector_cosine_ops)             │
│ Tablas:        muva_content, hotels (tourism)          │
│ Reducción:     66% menos dimensiones vs Tier 3         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TIER 2: BALANCED (1536 dimensiones)                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Uso:           Hotel info + Manuales privados          │
│ Velocidad:     ⚡⚡ Rápido (<100ms)                     │
│ Precisión:     ⭐⭐⭐⭐ Muy buena                       │
│ Index:         ✅ HNSW (vector_cosine_ops)             │
│ Tablas:        hotels (policies), manual_chunks        │
│ Reducción:     50% menos dimensiones vs Tier 3         │
│ Sweet Spot:    Mejor balance velocidad/precisión       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TIER 3: FULL (3072 dimensiones)                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Uso:           Backup / Almacenamiento futuro          │
│ Velocidad:     ⚡ Más lento                            │
│ Precisión:     ⭐⭐⭐⭐⭐ Máxima                        │
│ Index:         ❌ NO (límite Supabase 2000d)           │
│ Tablas:        manual_chunks (embedding field)         │
│ Uso Actual:    No consultado (almacenado por si acaso) │
└─────────────────────────────────────────────────────────┘
```

### Beneficios

1. **Reducción de Costos**
   - Tier 1 (1024d) vs Full (3072d) = **66% menos tokens**
   - Búsquedas MUVA: ~81% reducción en costos de embeddings

2. **Optimización de Velocidad**
   - Tier 1: <50ms (ideal para búsquedas frecuentes)
   - Tier 2: <100ms (balance perfecto)
   - Índices HNSW permiten sub-100ms en búsquedas

3. **Flexibilidad**
   - Cada dominio usa el tier óptimo
   - Turismo (frecuente) → Tier 1
   - Manuales (precisión crítica) → Tier 2

### Elección de Tier por Dominio

| Dominio | Tier Usado | Razón |
|---------|------------|-------|
| **MUVA (turismo)** | Tier 1 (1024d) | Búsquedas frecuentes, velocidad crítica |
| **Hotel General** | Tier 2 (1536d) | Balance entre precisión y velocidad |
| **Unit Manuals** | Tier 2 (1536d) | Precisión crítica (WiFi passwords, códigos) |

---

## Flujo de Búsqueda Completo

### Ejemplo: "¿Cuál es la contraseña del WiFi?"

```typescript
┌─────────────────────────────────────────────────────┐
│ 1. GENERACIÓN DE EMBEDDING                          │
└─────────────────────────────────────────────────────┘
Input: "¿Cuál es la contraseña del WiFi?"
                    ↓
┌─────────────────────────────────────────────────────┐
│ OpenAI API: text-embedding-3-large                  │
│ • Model: text-embedding-3-large                     │
│ • Genera 3 vectores:                                │
│   - dimensions: 1024 → embedding_fast               │
│   - dimensions: 1536 → embedding_balanced           │
│   - dimensions: 3072 → embedding_full               │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. BÚSQUEDA PARALELA (Promise.all)                  │
└─────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ searchTourism()      │  │ searchHotelGeneral() │  │ searchUnitManual()   │
│ (embedding_1024d)    │  │ (embedding_1536d)    │  │ (embedding_1536d)    │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
         ↓                          ↓                          ↓
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ match_muva_documents │  │ match_hotel_general  │  │ match_unit_manual    │
│ ↓                    │  │ _info                │  │ _chunks              │
│ muva_content         │  │ ↓                    │  │ ↓                    │
│ (0 results)          │  │ hotels               │  │ manual_chunks        │
│                      │  │ (0 results)          │  │ (2 results) ✅       │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘

** MULTI-ROOM SUPPORT **
Si el huésped tiene múltiples habitaciones (ej: Kaya + Summertime):
  ├─ searchUnitManual(embedding, "kaya-id", "Kaya")
  └─ searchUnitManual(embedding, "summertime-id", "Summertime")
  ↓
  Combina resultados de AMBAS habitaciones

                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. CONSOLIDACIÓN DE RESULTADOS                      │
└─────────────────────────────────────────────────────┘

Resultados encontrados:
[
  {
    content: "### WiFi\n**Red:** SimmerDown_Guest\n**Contraseña:** `summer2024!`",
    similarity: 0.89,
    table: 'accommodation_units_manual_chunks',
    section_title: 'Conectividad',
    metadata: { unit_name: 'Kaya' }
  }
]

Filtrado:
• similarity > threshold (0.25) ✅
• Permisos: ¿Huésped asignado a Kaya? ✅

Etiquetado:
• Domain: "[TU ALOJAMIENTO: Kaya 🏠]"

                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. GENERACIÓN DE RESPUESTA (Claude Sonnet 4)        │
└─────────────────────────────────────────────────────┘

Prompt construcción:
┌──────────────────────────────────────────────────────┐
│ Context:                                             │
│ • Guest Info: Tarek O'Neill, Kaya #101               │
│ • Dates: Check-in 2025-10-25, Check-out 2025-10-28  │
│ • Conversation History: [últimos 20 mensajes]       │
│ • Vector Search Results:                             │
│   - [TU ALOJAMIENTO: Kaya 🏠]                        │
│     "WiFi Red: SimmerDown_Guest, Password: summer2024!"│
│                                                      │
│ Query: "¿Cuál es la contraseña del WiFi?"           │
└──────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────┐
│ Claude Sonnet 4 LLM Response                         │
└──────────────────────────────────────────────────────┘

Output:
{
  response: "¡Claro Tarek! La información del WiFi de tu habitación Kaya es:\n\n
             **Red:** SimmerDown_Guest\n
             **Contraseña:** `summer2024!`\n\n
             Si tienes problemas conectando, puedes reiniciar el router
             (botón rojo en la sala). El router está ubicado arriba del closet principal.",

  entities: ["WiFi", "Kaya"],

  sources: [
    {
      type: "accommodation",
      name: "Kaya - Manual",
      section: "Conectividad"
    }
  ],

  followUpSuggestions: [
    "¿Cómo configuro la Smart TV?",
    "¿Dónde está el router WiFi?",
    "Necesito ayuda con el aire acondicionado"
  ],

  confidence: 0.95
}
```

### Código Implementación

**Archivo:** `src/lib/conversational-chat-engine.ts`

```typescript
export async function generateConversationalResponse(
  context: ConversationalContext
): Promise<ConversationalResponse> {

  // 1. Generar embeddings de la query
  const [queryEmbeddingFast, queryEmbeddingBalanced] = await Promise.all([
    generateEmbedding(context.query, 1024),
    generateEmbedding(context.query, 1536),
  ])

  // 2. Búsqueda paralela en los 3 dominios
  const searches = []

  // Domain 1: Tourism (MUVA)
  searches.push(searchTourism(queryEmbeddingFast))

  // Domain 2: Hotel General Info
  searches.push(searchHotelGeneralInfo(queryEmbeddingBalanced, context.guestInfo.tenant_id))

  // Domain 3: Unit Manuals (multi-room support)
  const accommodationUnits = context.guestInfo.accommodation_units ||
    (context.guestInfo.accommodation_unit ? [context.guestInfo.accommodation_unit] : [])

  if (accommodationUnits.length > 0) {
    const unitManualSearches = accommodationUnits.map(unit =>
      searchUnitManual(queryEmbeddingBalanced, unit.id, unit.name)
    )
    searches.push(Promise.resolve((await Promise.all(unitManualSearches)).flat()))
  }

  // Ejecutar todas las búsquedas en paralelo
  const [tourismResults, hotelResults, unitManualResults] = await Promise.all(searches)

  // 3. Consolidar y etiquetar resultados
  const allResults = [
    ...tourismResults,
    ...hotelResults,
    ...unitManualResults
  ]

  // 4. Construir prompt con contexto
  const systemPrompt = buildSystemPrompt(context, allResults)

  // 5. Generar respuesta con Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: buildConversationHistory(context)
  })

  return parseResponse(response)
}
```

---

## Scripts y Comandos

### Scripts Disponibles

| Script | Propósito | Comando |
|--------|-----------|---------|
| `populate-embeddings.js` | Generar embeddings MUVA content | `node scripts/populate-embeddings.js` |
| `generate-embeddings.ts` | Generar embeddings (genérico) | `npx tsx scripts/generate-embeddings.ts` |
| `process-accommodation-manuals.js` | Procesar manuales con chunking | `node scripts/process-accommodation-manuals.js` |
| `migrate-manual-to-chunks.js` | Migrar manuals legacy a chunks | `node scripts/migrate-manual-to-chunks.js` |
| `regenerate_accommodation_embeddings.sh` | Re-generar todos los embeddings de accommodations | `bash scripts/regenerate_accommodation_embeddings.sh` |

### Comandos Comunes

#### 1. Generar Embeddings para MUVA Content

```bash
# Asegurarse de tener .env.local configurado
set -a && source .env.local && set +a

# Generar embeddings MUVA
node scripts/populate-embeddings.js --source muva --tier 1

# Verificar en DB
psql $DATABASE_URL -c "SELECT COUNT(*) FROM muva_content WHERE embedding_fast IS NOT NULL;"
```

#### 2. Procesar Manuales de Habitaciones

```bash
# Procesar todos los manuales en carpeta
node scripts/process-accommodation-manuals.js

# Con path específico
node scripts/process-accommodation-manuals.js \
  --path data/accommodations/manuals/simmerdown \
  --tenant-id b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf

# Verificar chunks generados
psql $DATABASE_URL -c "
  SELECT
    au.name,
    COUNT(mc.id) as chunks,
    MAX(mc.chunk_index) as max_index
  FROM accommodation_units_manual_chunks mc
  JOIN hotels.accommodation_units au ON au.id = mc.accommodation_unit_id
  GROUP BY au.name;
"
```

#### 3. Re-generar Embeddings Existentes

```bash
# Re-generar todo desde cero
bash scripts/regenerate_accommodation_embeddings.sh

# O manual por tabla
npx tsx scripts/generate-embeddings.ts \
  --table accommodation_units_manual_chunks \
  --tier 2 \
  --force
```

#### 4. Verificar Estado de Embeddings

```bash
# Contar embeddings por tabla
psql $DATABASE_URL -c "
  SELECT
    'muva_content' as table_name,
    COUNT(*) as total,
    COUNT(embedding_fast) as with_fast_embedding
  FROM muva_content
  UNION ALL
  SELECT
    'hotels' as table_name,
    COUNT(*) as total,
    COUNT(embedding_balanced) as with_balanced_embedding
  FROM hotels
  UNION ALL
  SELECT
    'manual_chunks' as table_name,
    COUNT(*) as total,
    COUNT(embedding_balanced) as with_balanced_embedding
  FROM accommodation_units_manual_chunks;
"
```

#### 5. Limpiar y Re-empezar

```bash
# ⚠️ CUIDADO: Borra todos los chunks de manuales
psql $DATABASE_URL -c "TRUNCATE accommodation_units_manual_chunks;"

# Re-procesar desde cero
node scripts/process-accommodation-manuals.js
```

---

## Tablas de Referencia Rápida

### Resumen de Tablas

| Tabla | Dominio | Embeddings | RPC Function | Threshold |
|-------|---------|------------|--------------|-----------|
| `muva_content` | Turismo | 1024d (fast) | `match_muva_documents` | 0.15 |
| `hotels` | Info General | 1024d + 1536d | `match_hotel_general_info` | 0.30 |
| `accommodation_units_manual_chunks` | Privado | 1024d + 1536d + 3072d | `match_unit_manual_chunks` | 0.25 |

### Campos Clave por Tabla

#### muva_content

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | uuid | PK |
| `content` | text | Contenido completo del documento |
| `embedding_fast` | vector(1024) | Tier 1 embedding |
| `source_file` | varchar | Nombre del archivo `.md` original |
| `document_type` | varchar | tourism, restaurants, beaches, etc. |
| `business_info` | jsonb | { precio, telefono, horario, zona } |
| `subcategory` | varchar | playas_populares, gastronomia_local, etc. |

#### hotels

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK a tenant_registry |
| `embedding_fast` | vector(1024) | Tier 1 para búsquedas turísticas |
| `embedding_balanced` | vector(1536) | Tier 2 para búsquedas de políticas |
| `tourism_summary` | text | Fuente para embedding_fast |
| `policies_summary` | text | Fuente para embedding_balanced |
| `hotel_amenities` | jsonb | Amenidades del hotel |

#### accommodation_units_manual_chunks

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | uuid | PK |
| `accommodation_unit_id` | uuid | FK a hotels.accommodation_units |
| `chunk_content` | text | Contenido de la SECCIÓN |
| `chunk_index` | int | 0, 1, 2, ... (orden del chunk) |
| `section_title` | text | "Conectividad", "Aire Acondicionado" |
| `embedding` | vector(3072) | Tier 3 (no usado) |
| `embedding_balanced` | vector(1536) | Tier 2 (USADO) |
| `embedding_fast` | vector(1024) | Tier 1 |

### Funciones RPC Disponibles

```sql
-- MUVA Content
match_muva_documents(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.15,
  match_count integer DEFAULT 5
)

-- Hotel General Info
match_hotel_general_info(
  query_embedding vector,
  p_tenant_id uuid,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
)

-- Unit Manual Chunks
match_unit_manual_chunks(
  query_embedding vector,
  p_accommodation_unit_id uuid,
  match_threshold double precision DEFAULT 0.25,
  match_count integer DEFAULT 5
)

-- Accommodation Units (búsqueda por nombre)
get_accommodation_unit_by_name(
  p_unit_name text,
  p_tenant_id uuid
)

-- Accommodation Units (búsqueda por ID)
get_accommodation_unit_by_id(
  p_unit_id uuid,
  p_tenant_id uuid
)
```

---

## Troubleshooting

### Problema 1: Embeddings no se generan

**Síntomas:**
```sql
SELECT COUNT(*) FROM muva_content WHERE embedding_fast IS NULL;
-- Returns > 0
```

**Causas posibles:**
1. Falta `OPENAI_API_KEY` en `.env.local`
2. Script no ejecutado
3. Error en procesamiento de archivo

**Solución:**

```bash
# 1. Verificar API key
echo $OPENAI_API_KEY

# 2. Re-generar embeddings
node scripts/populate-embeddings.js --source muva --tier 1

# 3. Ver logs del script para errores
node scripts/populate-embeddings.js 2>&1 | tee embedding-generation.log
```

---

### Problema 2: Búsqueda no encuentra resultados

**Síntomas:**
```
[Chat Engine] Unit manual chunks results: { total_found: 0 }
```

**Diagnóstico:**

```sql
-- 1. Verificar que existen chunks
SELECT COUNT(*)
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = 'YOUR_UNIT_ID';

-- 2. Verificar embeddings
SELECT COUNT(*)
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = 'YOUR_UNIT_ID'
  AND embedding_balanced IS NOT NULL;

-- 3. Probar búsqueda manual
SELECT
  section_title,
  1 - (embedding_balanced <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = 'YOUR_UNIT_ID'
ORDER BY similarity DESC
LIMIT 5;
```

**Soluciones:**

1. **No existen chunks:** Ejecutar `process-accommodation-manuals.js`
2. **Embeddings NULL:** Re-generar embeddings
3. **Similarity muy baja:** Ajustar `match_threshold` (reducir de 0.25 a 0.15)

---

### Problema 3: Guest no puede ver su manual

**Síntomas:**
- Huésped logeado correctamente
- Búsqueda retorna 0 resultados
- Otros dominios (MUVA) funcionan

**Diagnóstico:**

```sql
-- 1. Verificar relación reservation → accommodation
SELECT
  gr.id as reservation_id,
  gr.guest_name,
  gr.accommodation_unit_id,
  au.name as unit_name
FROM guest_reservations gr
LEFT JOIN hotels.accommodation_units au ON au.id = gr.accommodation_unit_id
WHERE gr.id = 'RESERVATION_ID';

-- 2. Verificar junction table (multi-room)
SELECT
  ra.reservation_id,
  ra.accommodation_unit_id,
  au.name
FROM reservation_accommodations ra
JOIN hotels.accommodation_units au ON au.id = ra.accommodation_unit_id
WHERE ra.reservation_id = 'RESERVATION_ID';

-- 3. Verificar manual chunks para esa unit
SELECT COUNT(*)
FROM accommodation_units_manual_chunks
WHERE accommodation_unit_id = 'UNIT_ID_FROM_ABOVE';
```

**Soluciones:**

1. **No hay `accommodation_unit_id`:** Asignar habitación a la reserva
2. **Junction table vacía:** Sincronizar desde MotoPress o crear manualmente
3. **No existen chunks:** Procesar manual de esa habitación

---

### Problema 4: Chunking incorrecto

**Síntomas:**
- Chunks muy grandes o muy pequeños
- Section titles incorrectos
- Similarity baja

**Diagnóstico:**

```sql
-- Ver chunks de un manual
SELECT
  chunk_index,
  section_title,
  LENGTH(chunk_content) as content_length,
  chunk_content
FROM accommodation_units_manual_chunks
WHERE manual_id = 'MANUAL_ID'
ORDER BY chunk_index;
```

**Causas comunes:**
1. Headers incorrectos en `.md` (debe ser `##` no `#` ni `###`)
2. Formato inconsistente

**Solución:**

```markdown
<!-- ✅ CORRECTO -->
## Conectividad
Contenido de la sección...

## Aire Acondicionado
Más contenido...

<!-- ❌ INCORRECTO -->
# Conectividad (h1, muy grande)
### WiFi (h3, muy pequeño, no se divide)
```

Re-procesar archivo después de corregir:

```bash
# Borrar chunks existentes
psql $DATABASE_URL -c "
  DELETE FROM accommodation_units_manual_chunks
  WHERE accommodation_unit_id = 'UNIT_ID';
"

# Re-procesar
node scripts/process-accommodation-manuals.js --path path/to/manual.md
```

---

### Problema 5: Multi-room no funciona

**Síntomas:**
- Huésped tiene 2+ habitaciones
- Solo ve información de UNA habitación
- Otras habitaciones no aparecen en búsquedas

**Diagnóstico:**

```typescript
// Verificar en logs del chat engine
console.log('[Chat Engine] Accommodation units:', accommodationUnits)
// Debería mostrar TODAS las habitaciones, no solo una
```

```sql
-- Verificar reservation_accommodations
SELECT
  ra.reservation_id,
  ra.accommodation_unit_id,
  au.name
FROM reservation_accommodations ra
JOIN hotels.accommodation_units au ON au.id = ra.accommodation_unit_id
WHERE ra.reservation_id = 'RESERVATION_ID';
-- Debe retornar MÚLTIPLES filas
```

**Soluciones:**

1. **Junction table vacía:** Ejecutar sync de MotoPress con `--populate-junction`
2. **JWT no contiene `accommodation_units[]`:** Re-autenticar huésped (logout/login)
3. **Código no busca en todas:** Verificar `src/lib/conversational-chat-engine.ts` línea ~310

---

### Problema 6: Embeddings muy lentos

**Síntomas:**
- Búsqueda toma >500ms
- Timeouts en producción

**Diagnóstico:**

```sql
-- Verificar índices HNSW
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%embedding%';

-- Debe mostrar índices HNSW para:
-- - muva_content.embedding_fast
-- - hotels.embedding_fast/balanced
-- - manual_chunks.embedding_balanced/fast
```

**Soluciones:**

1. **Índices faltantes:**

```sql
-- Crear índices HNSW
CREATE INDEX idx_muva_content_embedding_fast
  ON muva_content USING hnsw (embedding_fast vector_cosine_ops);

CREATE INDEX idx_manual_chunks_embedding_balanced
  ON accommodation_units_manual_chunks
  USING hnsw (embedding_balanced vector_cosine_ops);
```

2. **Usar tier correcto:**
   - MUVA → Tier 1 (1024d)
   - Manuals → Tier 2 (1536d)
   - NO usar Tier 3 (3072d) - no tiene índice

---

### Problema 7: Resultados irrelevantes

**Síntomas:**
- Pregunta: "WiFi password"
- Resultado: Información de caja fuerte

**Diagnóstico:**

```sql
-- Verificar similarity scores
SELECT
  section_title,
  chunk_content,
  1 - (embedding_balanced <=> 'QUERY_EMBEDDING'::vector) as similarity
FROM accommodation_units_manual_chunks
ORDER BY similarity DESC
LIMIT 10;
-- Similarity muy baja (<0.3) indica contenido irrelevante
```

**Soluciones:**

1. **Threshold muy bajo:**
   - Aumentar de 0.15 a 0.25 o 0.30
   - En código: `match_threshold: 0.30`

2. **Contenido mal chunkeado:**
   - Revisar que secciones sean lógicas
   - WiFi debe estar en chunk separado de caja fuerte

3. **Embedding de query incorrecto:**
   - Verificar que se use tier correcto
   - `text-embedding-3-large` con `dimensions: 1536`

---

## Mejores Prácticas

### 1. Estructura de Manuales

```markdown
---
accommodation: "Nombre Exacto" (debe coincidir con DB)
tenant_id: "uuid del tenant"
---

# Manual de [Accommodation Name]

## Conectividad    👈 Nivel 2 para chunking
(contenido WiFi, Smart TV)

## Aire Acondicionado    👈 Nuevo chunk
(contenido AC)

## Electrodomésticos    👈 Nuevo chunk
(contenido cocina)
```

### 2. Generación de Embeddings

```bash
# SIEMPRE verificar antes
echo "API Key: ${OPENAI_API_KEY:0:10}..."

# Generar con logging
node scripts/process-accommodation-manuals.js 2>&1 | tee process.log

# Verificar después
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total_chunks,
         COUNT(embedding_balanced) as with_embeddings
  FROM accommodation_units_manual_chunks;
"
```

### 3. Testing de Búsquedas

```typescript
// En development, agregar logging
console.log('[Chat Engine] Query:', query)
console.log('[Chat Engine] Embeddings size:', embedding.length)
console.log('[Chat Engine] Results:', {
  muva: muraResults.length,
  hotel: hotelResults.length,
  manual: manualResults.length
})
```

---

## Referencias

### Archivos Clave

- **Chat Engine:** `src/lib/conversational-chat-engine.ts`
- **Guest Auth:** `src/lib/guest-auth.ts`
- **Scripts:** `scripts/process-accommodation-manuals.js`
- **SQL Functions:** `scripts/enhance-search-functions.sql`

### Documentación Externa

- OpenAI Embeddings API: https://platform.openai.com/docs/guides/embeddings
- Supabase Vector Search: https://supabase.com/docs/guides/ai/vector-search
- pgvector: https://github.com/pgvector/pgvector

---

**Última actualización:** Octubre 2025
**Mantenedor:** Sistema MUVA Chat

---

## Changelog

### Octubre 2025
- ✅ Implementado multi-room support
- ✅ Migrado a arquitectura Matryoshka (3 tiers)
- ✅ Chunking de manuales por secciones
- ✅ Búsqueda paralela con Promise.all
