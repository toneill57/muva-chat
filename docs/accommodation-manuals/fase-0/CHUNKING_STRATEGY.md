# Chunking Strategy - Accommodation Manuals

**Documento:** Estrategia de chunking para manuales de alojamiento
**Fase:** 0.3 - Análisis de chunking strategy
**Autor:** Claude Code
**Fecha:** 2025-11-09

---

## Tabla de Contenidos

1. [Contexto del Proyecto](#contexto-del-proyecto)
2. [Análisis del Script Existente](#análisis-del-script-existente)
3. [Estrategia de Chunking](#estrategia-de-chunking)
4. [Implementación](#implementación)
5. [Edge Cases](#edge-cases)
6. [Ejemplos](#ejemplos)
7. [Integración con Sistema de Embeddings](#integración-con-sistema-de-embeddings)

---

## Contexto del Proyecto

### Objetivo

Permitir que hoteleros suban manuales de alojamiento en formato Markdown (`.md`) desde la UI de gestión, procesarlos en chunks optimizados, generar embeddings Matryoshka (3 dimensiones), y permitir que el guest chat use este contenido para responder preguntas.

### Flujo Completo

```
Manual.md → chunkMarkdown() → DB chunks → regenerate-manual-embeddings.ts → Embeddings → Guest Chat
```

### Stack Técnico

- **Embeddings:** OpenAI `text-embedding-3-large` (HARDCODED)
- **Dimensiones:** 3072d (full), 1536d (balanced), 1024d (fast)
- **Database:** Supabase PostgreSQL
- **Tabla:** `accommodation_units_manual_chunks`

---

## Análisis del Script Existente

### Script: `regenerate-manual-embeddings.ts`

**Función:** Re-generar embeddings para chunks **que ya existen** en la base de datos.

**Metadata que espera:**

```typescript
interface Chunk {
  id: string
  chunk_content: string          // ✅ Contenido del chunk
  accommodation_unit_id: string  // ✅ ID del alojamiento
  section_title: string          // ✅ Título de la sección
  chunk_index: number            // ✅ Índice secuencial (0, 1, 2...)
}
```

**Procesamiento:**

1. Fetch chunks desde DB (líneas 100-111)
2. Generar 3 embeddings por chunk en paralelo (líneas 136-140):
   - `embedding` (3072d)
   - `embedding_balanced` (1536d)
   - `embedding_fast` (1024d)
3. Update DB con nuevos embeddings (líneas 144-156)
4. Progress reporting + retry logic

**Hallazgos clave:**

- ❌ **NO hace chunking** del contenido markdown
- ✅ **SÍ usa metadata correcta** (`section_title`, `chunk_index`)
- ✅ **SÍ soporta Matryoshka embeddings** (3 dimensiones)
- ✅ **SÍ maneja errores y retries** (hasta 3 intentos)

**Conclusión:** El script asume que los chunks ya fueron creados por otro proceso. **Falta la función de chunking inicial.**

---

## Estrategia de Chunking

### Objetivos

1. **Extraer títulos de sección** para metadata (`section_title`)
2. **Generar chunks de tamaño óptimo** (~1500 caracteres)
3. **Preservar contexto semántico** (no cortar en medio de párrafos)
4. **Mantener estructura jerárquica** del markdown
5. **Indexar chunks secuencialmente** (`chunk_index: 0, 1, 2...`)

### Parámetros de Configuración

```typescript
const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 1500,        // Tamaño ideal por chunk
  MIN_CHUNK_SIZE: 300,         // Evitar chunks muy pequeños
  OVERLAP: 0,                   // Sin overlap (ya manejado por headers)
  SECTION_SEPARATOR: /^## /gm, // Headers nivel 2
  PARAGRAPH_SEPARATOR: /\n\n+/  // Doble salto de línea
}
```

### Reglas de Split

#### 1. Prioridad: Headers Nivel 2 (`## Section`)

Los headers `## ` son el **separador primario**. Cada sección se trata como unidad independiente.

```markdown
## Políticas de Check-in
Contenido de la sección...

## Servicios Incluidos
Otro contenido...
```

→ Resultado: 2 chunks (si cada sección < 1500 chars)

#### 2. Sub-split si Sección > 1500 chars

Si una sección excede `MAX_CHUNK_SIZE`, se divide en sub-chunks:

- **Separador:** Párrafos (doble `\n\n`)
- **Regla:** No cortar en medio de párrafo
- **Metadata:** Mantener mismo `section_title` para todos los sub-chunks

```markdown
## Guía de Restaurantes
Párrafo 1 (300 chars)
Párrafo 2 (800 chars)
Párrafo 3 (600 chars)  ← Total: 1700 chars → split necesario
```

→ Resultado:
- Chunk 0: Párrafos 1+2 (1100 chars)
- Chunk 1: Párrafo 3 (600 chars)
- Ambos con `section_title: "Guía de Restaurantes"`

#### 3. Markdown sin Headers

Si el documento NO tiene headers `## `, se divide en chunks de 1500 chars:

- **section_title:** `"General"` (default)
- **Split:** Por párrafos, respetando `MAX_CHUNK_SIZE`

#### 4. Headers Anidados (`### Subsection`)

Los headers nivel 3+ se **unifican con el header padre**:

```markdown
## Servicios
### Desayuno
Contenido del desayuno

### Piscina
Contenido de la piscina
```

→ Resultado: 1 chunk con `section_title: "Servicios"` (si total < 1500 chars)

**Razón:** Headers nivel 3 son detalles de la sección principal, no secciones independientes.

#### 5. Bloques de Código (` ``` `)

Los bloques fenced se mantienen **juntos** (no se dividen):

```markdown
## Configuración WiFi
```
SSID: hotel-wifi
Password: abc123
```
Más contenido...
```

→ El bloque de código NO se divide, se incluye completo en un chunk.

#### 6. Listas

Las listas se mantienen juntas:

```markdown
## Horarios
- Check-in: 15:00
- Check-out: 12:00
- Desayuno: 7:00-10:00
```

→ La lista completa va en un solo chunk (si cabe en 1500 chars).

---

## Implementación

### Interface de Salida

```typescript
interface Chunk {
  content: string       // Contenido del chunk (markdown)
  section_title: string // Título de la sección (extraído de ## Header)
  chunk_index: number   // Índice secuencial (0, 1, 2...)
}
```

### Función Principal

```typescript
/**
 * Procesa un archivo markdown y lo divide en chunks optimizados
 * para generar embeddings Matryoshka.
 *
 * @param markdownContent - Contenido completo del archivo .md
 * @returns Array de chunks con metadata
 */
function chunkMarkdown(markdownContent: string): Chunk[] {
  const chunks: Chunk[] = []
  let chunkIndex = 0

  // 1. Normalizar saltos de línea
  const normalized = markdownContent.replace(/\r\n/g, '\n')

  // 2. Detectar secciones por ## headers
  const sections = extractSections(normalized)

  // 3. Procesar cada sección
  for (const section of sections) {
    const sectionChunks = processSection(section)

    // 4. Asignar índices secuenciales y agregar a resultado
    for (const chunk of sectionChunks) {
      chunks.push({
        content: chunk.content,
        section_title: chunk.section_title,
        chunk_index: chunkIndex++
      })
    }
  }

  return chunks
}
```

### Función Auxiliar: Extraer Secciones

```typescript
interface Section {
  title: string    // Título extraído de ## Header
  content: string  // Contenido de la sección (sin el header)
  rawHeader: string // Header original completo
}

function extractSections(markdown: string): Section[] {
  const sections: Section[] = []

  // Regex para capturar ## headers
  const headerRegex = /^## (.+)$/gm
  const matches = [...markdown.matchAll(headerRegex)]

  if (matches.length === 0) {
    // No hay headers → retornar como sección única "General"
    return [{
      title: 'General',
      content: markdown.trim(),
      rawHeader: ''
    }]
  }

  // Procesar cada sección
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const title = match[1].trim()
    const startIdx = match.index! + match[0].length
    const endIdx = i < matches.length - 1
      ? matches[i + 1].index!
      : markdown.length

    const content = markdown.slice(startIdx, endIdx).trim()

    sections.push({
      title,
      content,
      rawHeader: match[0]
    })
  }

  return sections
}
```

### Función Auxiliar: Procesar Sección

```typescript
interface ChunkCandidate {
  content: string
  section_title: string
}

function processSection(section: Section): ChunkCandidate[] {
  const MAX_SIZE = 1500
  const MIN_SIZE = 300

  // Si la sección completa cabe en un chunk
  if (section.content.length <= MAX_SIZE) {
    return [{
      content: section.content,
      section_title: section.title
    }]
  }

  // Necesita sub-split → dividir por párrafos
  const paragraphs = section.content.split(/\n\n+/)
  const chunks: ChunkCandidate[] = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim()
    if (!paragraphTrimmed) continue

    // Verificar si agregar este párrafo excede MAX_SIZE
    const potentialChunk = currentChunk
      ? currentChunk + '\n\n' + paragraphTrimmed
      : paragraphTrimmed

    if (potentialChunk.length <= MAX_SIZE) {
      // Cabe → agregar al chunk actual
      currentChunk = potentialChunk
    } else {
      // No cabe → guardar chunk actual y empezar nuevo
      if (currentChunk.length >= MIN_SIZE) {
        chunks.push({
          content: currentChunk,
          section_title: section.title
        })
      }
      currentChunk = paragraphTrimmed
    }
  }

  // Agregar último chunk si existe
  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      section_title: section.title
    })
  }

  return chunks
}
```

---

## Edge Cases

### 1. Markdown Vacío

**Input:**
```typescript
chunkMarkdown('')
```

**Output:**
```typescript
[] // Array vacío
```

**Razón:** No hay contenido para procesar.

---

### 2. Solo Headers sin Contenido

**Input:**
```markdown
## Sección 1
## Sección 2
## Sección 3
```

**Output:**
```typescript
[] // Array vacío
```

**Razón:** Headers sin contenido se ignoran.

---

### 3. Headers Anidados (Nivel 3+)

**Input:**
```markdown
## Servicios
### Desayuno
Incluido de 7:00 a 10:00

### Piscina
Abierta 24/7
```

**Output:**
```typescript
[
  {
    content: "### Desayuno\nIncluido de 7:00 a 10:00\n\n### Piscina\nAbierta 24/7",
    section_title: "Servicios",
    chunk_index: 0
  }
]
```

**Comportamiento:** Headers nivel 3 se incluyen en el contenido, pero la sección se identifica por el header nivel 2.

---

### 4. Bloques de Código Fenced

**Input:**
```markdown
## Configuración WiFi

Pasos:
1. Conectar a red

```
SSID: hotel-wifi
Password: secret123
```

2. Disfrutar
```

**Output:**
```typescript
[
  {
    content: "Pasos:\n1. Conectar a red\n\n```\nSSID: hotel-wifi\nPassword: secret123\n```\n\n2. Disfrutar",
    section_title: "Configuración WiFi",
    chunk_index: 0
  }
]
```

**Comportamiento:** El bloque de código se mantiene junto con el contenido circundante.

**⚠️ Limitación:** Si el bloque de código por sí solo excede 1500 chars, se incluirá completo en un chunk (puede superar MAX_SIZE).

---

### 5. Listas Muy Largas

**Input:**
```markdown
## Restaurantes Recomendados

- Restaurante 1 (descripción 200 chars)
- Restaurante 2 (descripción 200 chars)
- ... (total 50 restaurantes, 10,000 chars)
```

**Output:**
```typescript
[
  {
    content: "- Restaurante 1...\n- Restaurante 2...\n...\n- Restaurante 7",
    section_title: "Restaurantes Recomendados",
    chunk_index: 0
  },
  {
    content: "- Restaurante 8...\n...\n- Restaurante 15",
    section_title: "Restaurantes Recomendados",
    chunk_index: 1
  },
  // ... más chunks
]
```

**Comportamiento:** La lista se divide por párrafos (items de lista separados por `\n\n`).

**⚠️ Limitación:** Si un item de lista excede 1500 chars, se incluirá completo en un chunk.

---

### 6. Sección con Párrafo Muy Largo

**Input:**
```markdown
## Historia del Hotel

Lorem ipsum dolor sit amet... (párrafo único de 3000 caracteres sin saltos de línea)
```

**Output:**
```typescript
[
  {
    content: "Lorem ipsum dolor sit amet... (primeros 1500 chars)",
    section_title: "Historia del Hotel",
    chunk_index: 0
  },
  {
    content: "... (siguientes 1500 chars)",
    section_title: "Historia del Hotel",
    chunk_index: 1
  }
]
```

**⚠️ Limitación:** Si un párrafo NO tiene saltos de línea dobles, se dividirá arbitrariamente al alcanzar MAX_SIZE (puede cortar en medio de frase).

**Solución recomendada:** Validar que los manuales tengan párrafos bien formados (con `\n\n`).

---

## Ejemplos

### Ejemplo 1: Markdown Simple

**Input:**

```markdown
## Políticas de Check-in

El check-in es a partir de las 15:00 horas. Se requiere presentar documento de identidad válido.

## Servicios Incluidos

- WiFi gratuito
- Desayuno buffet
- Estacionamiento
```

**Proceso:**

1. Detectar 2 secciones: "Políticas de Check-in", "Servicios Incluidos"
2. Sección 1: 95 chars → cabe en 1 chunk
3. Sección 2: 63 chars → cabe en 1 chunk

**Output:**

```typescript
[
  {
    content: "El check-in es a partir de las 15:00 horas. Se requiere presentar documento de identidad válido.",
    section_title: "Políticas de Check-in",
    chunk_index: 0
  },
  {
    content: "- WiFi gratuito\n- Desayuno buffet\n- Estacionamiento",
    section_title: "Servicios Incluidos",
    chunk_index: 1
  }
]
```

---

### Ejemplo 2: Sección Larga que Requiere Split

**Input:**

```markdown
## Guía de Restaurantes

**Restaurante La Terraza**
Ubicado en el piso 5, ofrece cocina mediterránea con vista al mar. Horario: 12:00-23:00. Reservas recomendadas. Plato estrella: Paella valenciana.

**Restaurante El Jardín**
Ambiente familiar en el patio interno. Especialidad en comida local. Horario: 18:00-22:00. No requiere reserva. Plato estrella: Bandeja paisa.

**Café Sunrise**
Perfecto para desayunos. Ubicado en el lobby. Horario: 6:00-11:00. Ofrece opciones veganas y sin gluten. Especialidad: Pancakes de arándanos.

**Bar Ocean View**
Cócteles premium en la terraza. Horario: 17:00-02:00. Happy hour 17:00-19:00. Especialidad: Mojito de maracuyá.

**Restaurante Gourmet**
Alta cocina internacional. Ubicado en el ático. Horario: 19:00-23:00. Reserva obligatoria. Código de vestimenta: formal. Chef ejecutivo: María González. Menú degustación de 7 tiempos disponible. Precio promedio: $150 por persona. Bodega con más de 200 etiquetas de vinos. Sommelier disponible para recomendaciones.
```

**Proceso:**

1. Sección única: "Guía de Restaurantes"
2. Contenido total: ~1,100 chars → cabe en 1 chunk
3. NO requiere split

**Output:**

```typescript
[
  {
    content: "**Restaurante La Terraza**\nUbicado en el piso 5...\n\n**Restaurante El Jardín**\n...\n\n**Café Sunrise**\n...\n\n**Bar Ocean View**\n...\n\n**Restaurante Gourmet**\nAlta cocina internacional...",
    section_title: "Guía de Restaurantes",
    chunk_index: 0
  }
]
```

---

### Ejemplo 3: Sección que SÍ Requiere Split

**Input:**

```markdown
## Guía de Restaurantes

[Mismo contenido del Ejemplo 2, pero agregamos más restaurantes hasta superar 1500 chars]

**Restaurante La Terraza** (300 chars)
...

**Restaurante El Jardín** (250 chars)
...

**Café Sunrise** (200 chars)
...

**Bar Ocean View** (200 chars)
...

**Restaurante Gourmet** (300 chars)
...

**Pizzería Napolitana** (300 chars)
...

**Sushi Bar Tokio** (300 chars)
...

[Total: ~1,850 chars]
```

**Proceso:**

1. Sección única: "Guía de Restaurantes"
2. Contenido total: 1,850 chars → **REQUIERE split**
3. Dividir por párrafos (cada restaurante es un párrafo)
4. Agrupar hasta alcanzar ~1500 chars por chunk

**Output:**

```typescript
[
  {
    content: "**Restaurante La Terraza**\n...\n\n**Restaurante El Jardín**\n...\n\n**Café Sunrise**\n...\n\n**Bar Ocean View**\n...\n\n**Restaurante Gourmet**\n...",
    section_title: "Guía de Restaurantes",
    chunk_index: 0  // Total: ~1,250 chars
  },
  {
    content: "**Pizzería Napolitana**\n...\n\n**Sushi Bar Tokio**\n...",
    section_title: "Guía de Restaurantes",
    chunk_index: 1  // Total: ~600 chars
  }
]
```

---

### Ejemplo 4: Markdown sin Headers

**Input:**

```markdown
Bienvenido a nuestro hotel. Ofrecemos las mejores comodidades para tu estadía.

Nuestras habitaciones cuentan con WiFi, aire acondicionado y TV por cable.

El desayuno se sirve de 7:00 a 10:00 en el comedor principal.

Para cualquier consulta, contacta a recepción en el ext. 100.
```

**Proceso:**

1. NO hay headers `## ` → sección única con `section_title: "General"`
2. Contenido total: ~250 chars → cabe en 1 chunk

**Output:**

```typescript
[
  {
    content: "Bienvenido a nuestro hotel. Ofrecemos las mejores comodidades para tu estadía.\n\nNuestras habitaciones cuentan con WiFi, aire acondicionado y TV por cable.\n\nEl desayuno se sirve de 7:00 a 10:00 en el comedor principal.\n\nPara cualquier consulta, contacta a recepción en el ext. 100.",
    section_title: "General",
    chunk_index: 0
  }
]
```

---

## Integración con Sistema de Embeddings

### Flujo Completo

```
1. Upload Manual.md (UI)
   ↓
2. chunkMarkdown(content)
   ↓
3. INSERT INTO accommodation_units_manual_chunks
   {
     tenant_id,
     accommodation_unit_id,
     section_title,        ← Extraído por chunkMarkdown()
     chunk_index,          ← Generado por chunkMarkdown()
     chunk_content,        ← Contenido del chunk
     embedding: NULL,      ← A generar en siguiente paso
     embedding_balanced: NULL,
     embedding_fast: NULL
   }
   ↓
4. regenerate-manual-embeddings.ts
   ↓
5. UPDATE chunks SET
     embedding = generate_embedding(chunk_content, 3072),
     embedding_balanced = generate_embedding(chunk_content, 1536),
     embedding_fast = generate_embedding(chunk_content, 1024)
   ↓
6. Guest Chat usa embeddings para vector search
```

### Tabla de Base de Datos

```sql
CREATE TABLE accommodation_units_manual_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id),
  accommodation_unit_id UUID NOT NULL REFERENCES accommodation_units_public(unit_id),

  -- Metadata de chunking
  section_title TEXT NOT NULL,        -- Extraído por chunkMarkdown()
  chunk_index INTEGER NOT NULL,       -- Secuencial: 0, 1, 2...
  chunk_content TEXT NOT NULL,        -- Contenido del chunk

  -- Embeddings Matryoshka
  embedding vector(3072),             -- Full precision
  embedding_balanced vector(1536),    -- Balanced
  embedding_fast vector(1024),        -- Fast

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Validación de Chunks

Antes de guardar en DB, validar:

```typescript
function validateChunk(chunk: Chunk): boolean {
  // 1. Contenido no vacío
  if (!chunk.content.trim()) {
    throw new Error(`Chunk ${chunk.chunk_index} has empty content`)
  }

  // 2. section_title no vacío
  if (!chunk.section_title.trim()) {
    throw new Error(`Chunk ${chunk.chunk_index} has empty section_title`)
  }

  // 3. chunk_index >= 0
  if (chunk.chunk_index < 0) {
    throw new Error(`Invalid chunk_index: ${chunk.chunk_index}`)
  }

  // 4. Tamaño razonable (warning si > 2000 chars)
  if (chunk.content.length > 2000) {
    console.warn(
      `⚠️  Chunk ${chunk.chunk_index} exceeds recommended size: ` +
      `${chunk.content.length} chars (max: 1500)`
    )
  }

  return true
}
```

---

## Decisiones Técnicas

### ¿Por qué 1500 caracteres?

- **Embeddings:** `text-embedding-3-large` maneja hasta 8,191 tokens (~32,000 chars)
- **Contexto:** Chunks pequeños = mejor precisión en vector search
- **Balance:** 1500 chars ≈ 400 tokens ≈ 2-3 párrafos de contexto útil

### ¿Por qué sin overlap?

- **Headers:** Ya proveen contexto natural entre chunks
- **Simplicidad:** Sin overlap = sin duplicación de contenido
- **Costo:** Menos embeddings a generar

### ¿Por qué nivel 2 (`## `) como separador primario?

- **Convención:** Headers nivel 1 (`# `) son títulos de documento
- **Granularidad:** Nivel 2 son secciones principales (ideal para chunks semánticos)
- **Nivel 3+:** Son subsecciones (demasiado granular)

---

## Próximos Pasos (FASE 1)

1. **Implementar `chunkMarkdown()`** en `src/lib/manual-processing.ts`
2. **Crear API endpoint** `/api/accommodation/[unitId]/manuals/upload`
3. **Integrar con UI** para upload de archivos .md
4. **Testing** con manuales reales de diferentes tamaños

---

## Referencias

- Script de referencia: `scripts/regenerate-manual-embeddings.ts`
- Plan completo: `docs/accommodation-manuals/plan.md`
- TODO: `docs/accommodation-manuals/TODO.md`
- Implementación existente (LangChain): `src/lib/chunking.ts`

---

**Última actualización:** 2025-11-09
**Estado:** ✅ Estrategia documentada - Lista para implementación en FASE 1
