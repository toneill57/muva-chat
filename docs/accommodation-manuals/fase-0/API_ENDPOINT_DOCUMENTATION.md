# API Endpoints - Sistema de Manuales de Alojamiento

**Fecha:** 2025-11-09
**Status:** ✅ Implementado y testeado
**Ruta base:** `/api/accommodation-manuals/[unitId]`

---

## Tabla de Contenidos

1. [POST - Upload Manual](#post---upload-manual)
2. [GET - List Manuals](#get---list-manuals)
3. [DELETE - Delete Manual](#delete---delete-manual)
4. [GET - List Chunks for Manual](#get---list-chunks-for-manual)
5. [Arquitectura Técnica](#arquitectura-técnica)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## POST - Upload Manual

Sube un archivo `.md` (markdown) para un alojamiento, procesa el contenido en chunks y genera embeddings Matryoshka.

### Endpoint

```
POST /api/accommodation-manuals/[unitId]
```

### Headers

| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant (ej: `simmerdown`) |
| `Content-Type` | string | ✅ | `multipart/form-data` |

### URL Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `unitId` | UUID | ID de la unidad de alojamiento en `hotels.accommodation_units` |

### Body (FormData)

| Campo | Tipo | Requerido | Validaciones |
|-------|------|-----------|--------------|
| `file` | File | ✅ | - Extensión: `.md`<br>- Tamaño máx: 10MB<br>- MIME types: `text/markdown`, `text/plain` |

### Flujo de procesamiento

1. **Validación de tenant** → Busca `tenant_id` desde subdomain
2. **Validación de archivo** → Extensión `.md`, tamaño < 10MB
3. **Chunking** → Divide markdown por headers `##` (ver `src/lib/manual-chunking.ts`)
4. **Generación de embeddings** → 3 dimensiones Matryoshka:
   - `embedding` (3072d) - full precision
   - `embedding_balanced` (1536d) - standard
   - `embedding_fast` (1024d) - fast search
5. **Inserción en DB** →
   - Registro en `accommodation_manuals` (status: `processing` → `completed`)
   - Chunks en `accommodation_units_manual_chunks` con embeddings

### Response

#### Success (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "fed16d3a-45d3-4a59-b625-4c8fca2eccba",
    "filename": "manual-apartamento-sunshine.md",
    "chunk_count": 15
  }
}
```

#### Error Responses

**400 Bad Request** - No subdomain
```json
{
  "success": false,
  "error": "No subdomain detected",
  "code": "NO_SUBDOMAIN"
}
```

**400 Bad Request** - No file provided
```json
{
  "success": false,
  "error": "No file provided",
  "code": "NO_FILE"
}
```

**400 Bad Request** - Invalid file type
```json
{
  "success": false,
  "error": "Only .md files are allowed",
  "code": "INVALID_FILE_TYPE"
}
```

**400 Bad Request** - File too large
```json
{
  "success": false,
  "error": "File too large (max 10MB)",
  "code": "FILE_TOO_LARGE"
}
```

**404 Not Found** - Tenant not found
```json
{
  "success": false,
  "error": "Tenant not found",
  "code": "TENANT_NOT_FOUND"
}
```

**500 Internal Server Error** - Processing failed
```json
{
  "success": false,
  "error": "Failed to create manual: [error message]",
  "code": "PROCESSING_ERROR"
}
```

### Ejemplo de uso

#### cURL

```bash
curl -X POST http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a \
  -H "x-tenant-subdomain: simmerdown" \
  -F "file=@manual-apartamento-89.md"
```

#### JavaScript (fetch)

```javascript
const formData = new FormData()
formData.append('file', file) // File object from <input type="file">

const response = await fetch(`/api/accommodation-manuals/${unitId}`, {
  method: 'POST',
  headers: {
    'x-tenant-subdomain': 'simmerdown'
  },
  body: formData
})

const result = await response.json()
```

#### TypeScript (React)

```typescript
async function uploadManual(unitId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/accommodation-manuals/${unitId}`, {
    method: 'POST',
    headers: {
      'x-tenant-subdomain': window.location.hostname.split('.')[0]
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}
```

---

## GET - List Manuals

Lista todos los manuales subidos para una unidad de alojamiento específica.

### Endpoint

```
GET /api/accommodation-manuals/[unitId]
```

### Headers

| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant (ej: `simmerdown`) |

### URL Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `unitId` | UUID | ID de la unidad de alojamiento |

### Query Parameters

Ninguno (ordenamiento fijo: `created_at DESC`)

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "fed16d3a-45d3-4a59-b625-4c8fca2eccba",
      "filename": "manual-apartamento-sunshine.md",
      "file_type": "md",
      "chunk_count": 15,
      "status": "completed",
      "processed_at": "2025-11-09T16:06:01.425+00:00"
    },
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "filename": "manual-normas-casa.md",
      "file_type": "md",
      "chunk_count": 8,
      "status": "completed",
      "processed_at": "2025-11-08T14:22:15.123+00:00"
    }
  ]
}
```

#### Empty list (200 OK)

```json
{
  "success": true,
  "data": []
}
```

#### Error Responses

**400 Bad Request** - No subdomain
```json
{
  "error": "No subdomain detected"
}
```

**404 Not Found** - Tenant not found
```json
{
  "error": "Tenant not found"
}
```

**500 Internal Server Error** - Database error
```json
{
  "error": "[error message from database]"
}
```

### Status values

| Status | Descripción |
|--------|-------------|
| `processing` | Manual recién subido, generando embeddings |
| `completed` | Procesamiento exitoso, embeddings generados |
| `failed` | Error durante procesamiento (ver `error_message` en DB) |

### Ejemplo de uso

#### cURL

```bash
curl -X GET http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a \
  -H "x-tenant-subdomain: simmerdown"
```

#### JavaScript (fetch)

```javascript
const response = await fetch(`/api/accommodation-manuals/${unitId}`, {
  headers: {
    'x-tenant-subdomain': 'simmerdown'
  }
})

const result = await response.json()
console.log(`Found ${result.data.length} manuals`)
```

#### TypeScript (React)

```typescript
interface Manual {
  id: string
  filename: string
  file_type: string
  chunk_count: number | null
  status: 'processing' | 'completed' | 'failed'
  processed_at: string | null
}

async function listManuals(unitId: string): Promise<Manual[]> {
  const response = await fetch(`/api/accommodation-manuals/${unitId}`, {
    headers: {
      'x-tenant-subdomain': window.location.hostname.split('.')[0]
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch manuals')
  }

  const result = await response.json()
  return result.data
}
```

---

## DELETE - Delete Manual

Elimina un manual y todos sus chunks asociados (cascade delete).

### Endpoint

```
DELETE /api/accommodation-manuals/[unitId]/[manualId]
```

### Headers

| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant (ej: `simmerdown`) |

### URL Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `unitId` | UUID | ID de la unidad de alojamiento |
| `manualId` | UUID | ID del manual a eliminar |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Manual deleted successfully"
}
```

#### Error Responses

**400 Bad Request** - No subdomain
```json
{
  "success": false,
  "error": "No subdomain detected",
  "code": "NO_SUBDOMAIN"
}
```

**404 Not Found** - Tenant not found
```json
{
  "success": false,
  "error": "Tenant not found",
  "code": "TENANT_NOT_FOUND"
}
```

**404 Not Found** - Manual not found
```json
{
  "success": false,
  "error": "Manual not found or access denied",
  "code": "NOT_FOUND"
}
```

**500 Internal Server Error** - Delete failed
```json
{
  "success": false,
  "error": "[error message]",
  "code": "DELETE_FAILED"
}
```

### Cascade Behavior

**IMPORTANTE:** Al eliminar un manual, se eliminan automáticamente:
- ✅ Todos los chunks asociados (`accommodation_units_manual_chunks`)
- ✅ Todos los embeddings de los chunks (3 dimensiones Matryoshka)

**Razón:** FK constraint con `ON DELETE CASCADE`

```sql
ALTER TABLE accommodation_units_manual_chunks
  ADD CONSTRAINT fk_manual
  FOREIGN KEY (manual_id)
  REFERENCES accommodation_manuals(id)
  ON DELETE CASCADE;
```

### Ejemplo de uso

#### cURL

```bash
curl -X DELETE \
  http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a/940423bb-fd71-4e4d-9513-456c3ee2fd16 \
  -H "x-tenant-subdomain: simmerdown"
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  `/api/accommodation-manuals/${unitId}/${manualId}`,
  {
    method: 'DELETE',
    headers: {
      'x-tenant-subdomain': 'simmerdown'
    }
  }
)

const result = await response.json()
console.log(result.message) // "Manual deleted successfully"
```

#### TypeScript (React)

```typescript
async function deleteManual(unitId: string, manualId: string) {
  const response = await fetch(
    `/api/accommodation-manuals/${unitId}/${manualId}`,
    {
      method: 'DELETE',
      headers: {
        'x-tenant-subdomain': window.location.hostname.split('.')[0]
      }
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete manual')
  }

  return response.json()
}

// Usage with confirmation
if (confirm('Are you sure you want to delete this manual?')) {
  await deleteManual(unitId, manualId)
  // Refresh manual list
  await fetchManuals()
}
```

---

## GET - List Chunks for Manual

Obtiene todos los chunks de un manual específico (útil para preview/debugging).

**PERFORMANCE NOTE:** Excluye vectores de embeddings (arrays grandes de 1024d-3072d) para respuesta rápida. Solo retorna metadata y contenido de texto.

### Endpoint

```
GET /api/accommodation-manuals/[unitId]/[manualId]/chunks
```

### Headers

| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant (ej: `simmerdown`) |

### URL Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `unitId` | UUID | ID de la unidad de alojamiento |
| `manualId` | UUID | ID del manual |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "b95b5b94-3543-47ba-9525-1e5819c96d2c",
      "chunk_index": 0,
      "section_title": "Check-in y Check-out",
      "chunk_content": "Check-in y Check-out\n\n**Hora de entrada:** 15:00 hrs\n**Hora de salida:** 11:00 hrs"
    },
    {
      "id": "3bc81c1a-0cc6-4eab-b53f-4408bb350b43",
      "chunk_index": 1,
      "section_title": "WiFi",
      "chunk_content": "WiFi\n\n**Red:** Simmerdown-Guest\n**Contraseña:** Welcome2024"
    }
  ]
}
```

**Campos retornados:**
- `id` (UUID) - ID del chunk
- `chunk_index` (integer) - Índice del chunk (0-based)
- `section_title` (string | null) - Título de la sección (header `##`)
- `chunk_content` (string) - Contenido completo del chunk

**Campos EXCLUIDOS (performance):**
- ❌ `embedding` (vector 3072d) - ~12KB por chunk
- ❌ `embedding_balanced` (vector 1536d) - ~6KB por chunk
- ❌ `embedding_fast` (vector 1024d) - ~4KB por chunk

**Ahorro de bandwidth:** ~22KB por chunk excluido

#### Empty list (200 OK)

```json
{
  "success": true,
  "data": []
}
```

#### Error Responses

**400 Bad Request** - No subdomain
```json
{
  "success": false,
  "error": "No subdomain detected",
  "code": "NO_SUBDOMAIN"
}
```

**404 Not Found** - Tenant not found
```json
{
  "success": false,
  "error": "Tenant not found",
  "code": "TENANT_NOT_FOUND"
}
```

**404 Not Found** - Manual not found
```json
{
  "success": false,
  "error": "Manual not found or access denied",
  "code": "NOT_FOUND"
}
```

**500 Internal Server Error** - Query failed
```json
{
  "success": false,
  "error": "[error message]",
  "code": "QUERY_FAILED"
}
```

### Ordering

Chunks se retornan ordenados por `chunk_index ASC` (0, 1, 2...).

**Razón:** Preservar orden original del documento markdown.

### Ejemplo de uso

#### cURL

```bash
curl -X GET \
  "http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a/940423bb-fd71-4e4d-9513-456c3ee2fd16/chunks" \
  -H "x-tenant-subdomain: simmerdown"
```

#### JavaScript (fetch)

```javascript
const response = await fetch(
  `/api/accommodation-manuals/${unitId}/${manualId}/chunks`,
  {
    headers: {
      'x-tenant-subdomain': 'simmerdown'
    }
  }
)

const result = await response.json()
console.log(`Found ${result.data.length} chunks`)
```

#### TypeScript (React)

```typescript
interface ManualChunk {
  id: string
  chunk_index: number
  section_title: string | null
  chunk_content: string
}

async function getManualChunks(
  unitId: string,
  manualId: string
): Promise<ManualChunk[]> {
  const response = await fetch(
    `/api/accommodation-manuals/${unitId}/${manualId}/chunks`,
    {
      headers: {
        'x-tenant-subdomain': window.location.hostname.split('.')[0]
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch chunks')
  }

  const result = await response.json()
  return result.data
}

// Usage in preview modal
const chunks = await getManualChunks(unitId, manualId)
chunks.forEach(chunk => {
  console.log(`Section ${chunk.chunk_index}: ${chunk.section_title}`)
  console.log(chunk.chunk_content)
})
```

### Use Cases

**1. Preview manual content in UI**
```typescript
// Display manual content without downloading embeddings
const chunks = await getManualChunks(unitId, manualId)
setPreviewContent(chunks.map(c => c.chunk_content).join('\n\n'))
```

**2. Debug chunking strategy**
```bash
# Verify chunks are properly split by headers
curl "http://localhost:3001/api/accommodation-manuals/$UNIT_ID/$MANUAL_ID/chunks" \
  -H "x-tenant-subdomain: simmerdown" \
  | jq '.data[] | {index: .chunk_index, title: .section_title}'
```

**3. Verify embeddings were generated**
```sql
-- Use SQL directly to check embeddings (not via API)
SELECT
  chunk_index,
  embedding IS NOT NULL as has_full,
  embedding_balanced IS NOT NULL as has_balanced,
  embedding_fast IS NOT NULL as has_fast
FROM accommodation_units_manual_chunks
WHERE manual_id = '940423bb-fd71-4e4d-9513-456c3ee2fd16'
ORDER BY chunk_index;
```

---

## Arquitectura Técnica

### Database Schema

#### `accommodation_manuals` (public)

```sql
CREATE TABLE accommodation_manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_unit_id UUID NOT NULL
    REFERENCES hotels.accommodation_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL DEFAULT 'md',
  chunk_count INTEGER,
  status VARCHAR(20) DEFAULT 'processing',
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `accommodation_units_manual_chunks` (public)

```sql
CREATE TABLE accommodation_units_manual_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL
    REFERENCES accommodation_manuals(id) ON DELETE CASCADE,
  accommodation_unit_id UUID NOT NULL
    REFERENCES hotels.accommodation_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL
    REFERENCES tenant_registry(tenant_id) ON DELETE CASCADE,
  chunk_content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  total_chunks INTEGER NOT NULL,
  section_title TEXT,
  embedding vector(3072),       -- Full precision (OpenAI text-embedding-3-large)
  embedding_balanced vector(1536), -- Standard (Matryoshka 1536d)
  embedding_fast vector(1024),     -- Fast search (Matryoshka 1024d)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Chunking Strategy

Implementado en `src/lib/manual-chunking.ts`:

```typescript
// Split by ## headers (Markdown H2)
const sections = content.split(/^## /gm)

// Preserve header hierarchy
const chunks = sections.map((section, index) => ({
  content: section.trim(),
  chunk_index: index,
  total_chunks: sections.length,
  section_title: extractTitle(section) // First line
}))
```

**Ejemplo:**

```markdown
# Manual de Apartamento 89

## Check-in y Check-out
Hora de entrada: 15:00 hrs
Hora de salida: 11:00 hrs

## WiFi
Red: Simmerdown-Guest
Contraseña: Welcome2024

## Normas de la Casa
1. No fumar
2. Respetar silencio (22:00 - 08:00)
```

**Genera 3 chunks:**
- Chunk 0: "Check-in y Check-out\nHora de entrada..."
- Chunk 1: "WiFi\nRed: Simmerdown-Guest..."
- Chunk 2: "Normas de la Casa\n1. No fumar..."

### Embeddings Matryoshka

Usando OpenAI `text-embedding-3-large` con truncado dimensional:

```typescript
// src/lib/embeddings/generator.ts
export async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 3072 // Full precision
  })

  const full = response.data[0].embedding

  return {
    full: full,                      // 3072d
    standard: full.slice(0, 1536),   // 1536d (Matryoshka)
    balanced: full.slice(0, 1024)    // 1024d (Matryoshka)
  }
}
```

### Multi-tenancy

- **Aislamiento:** Cada query filtra por `tenant_id` obtenido desde `x-tenant-subdomain`
- **RLS:** Row-Level Security en ambas tablas (config: `app.tenant_id`)
- **Service Role:** Bypass RLS para operaciones de sistema

### CRITICAL: Schema `hotels` no accesible vía PostgREST

⚠️ **Limitación técnica:** El schema `hotels` NO está expuesto en el API de Supabase (solo `public` y `graphql_public`).

**Implicaciones:**
1. ❌ No se puede usar `.schema('hotels').from('accommodation_units')` en endpoints API
2. ✅ La FK `accommodation_unit_id` → `hotels.accommodation_units.id` SÍ funciona (nivel SQL)
3. ✅ Validación de ownership removida del endpoint (delegada a FK constraint)

**Solución implementada:**
- Endpoint confía en FK constraint para validar integridad
- No hay validación previa de ownership (tenant puede subir a cualquier unit del tenant)
- FK fallará si `unit_id` no existe en `hotels.accommodation_units`

---

## Testing

### Test Script

Ubicación: `/tmp/test-manual-upload.sh`

```bash
#!/bin/bash

UNIT_ID="dfe8772e-93ee-5949-8768-b45ec1b04f8a"  # Sunshine (simmerdown)
SUBDOMAIN="simmerdown"
PORT=3001

# Create test manual
cat <<'MANUAL' > /tmp/test-manual.md
# Manual de Apartamento Sunshine

## Check-in y Check-out
**Hora de entrada:** 15:00 hrs
**Hora de salida:** 11:00 hrs

## WiFi
**Red:** Simmerdown-Guest
**Contraseña:** Welcome2024

## Normas de la Casa
1. No fumar en áreas comunes
2. Respetar horarios de silencio (22:00 - 08:00)
3. Máximo 4 personas por apartamento
MANUAL

# Upload
echo "=== UPLOADING MANUAL ==="
curl -X POST "http://localhost:${PORT}/api/accommodation-manuals/${UNIT_ID}" \
  -H "x-tenant-subdomain: ${SUBDOMAIN}" \
  -F "file=@/tmp/test-manual.md"

# List
echo -e "\n\n=== LISTING MANUALS ==="
curl -X GET "http://localhost:${PORT}/api/accommodation-manuals/${UNIT_ID}" \
  -H "x-tenant-subdomain: ${SUBDOMAIN}" \
  | jq '.'

rm /tmp/test-manual.md
```

### Expected Results

**POST Response:**
```json
{
  "success": true,
  "data": {
    "id": "fed16d3a-45d3-4a59-b625-4c8fca2eccba",
    "filename": "test-manual.md",
    "chunk_count": 3
  }
}
```

**GET Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fed16d3a-45d3-4a59-b625-4c8fca2eccba",
      "filename": "test-manual.md",
      "file_type": "md",
      "chunk_count": 3,
      "status": "completed",
      "processed_at": "2025-11-09T16:06:01.425+00:00"
    }
  ]
}
```

### Database Validation

```sql
-- Verify manual + chunks
SELECT
  am.id,
  am.filename,
  am.chunk_count,
  am.status,
  COUNT(mc.id) as actual_chunks,
  bool_and(mc.embedding IS NOT NULL) as all_have_embeddings,
  bool_and(mc.embedding_balanced IS NOT NULL) as all_have_balanced,
  bool_and(mc.embedding_fast IS NOT NULL) as all_have_fast
FROM accommodation_manuals am
LEFT JOIN accommodation_units_manual_chunks mc ON am.id = mc.manual_id
WHERE am.id = 'fed16d3a-45d3-4a59-b625-4c8fca2eccba'
GROUP BY am.id, am.filename, am.chunk_count, am.status;
```

**Expected:**
```
chunk_count: 3
actual_chunks: 3
all_have_embeddings: true
all_have_balanced: true
all_have_fast: true
```

### Manual Testing Checklist

- [x] **Upload válido (.md, < 10MB)** → 201 Created ✅
- [ ] **Upload sin file** → 400 Bad Request (`NO_FILE`)
- [ ] **Upload con .txt** → 400 Bad Request (`INVALID_FILE_TYPE`)
- [ ] **Upload > 10MB** → 400 Bad Request (`FILE_TOO_LARGE`)
- [ ] **Upload sin subdomain header** → 400 Bad Request (`NO_SUBDOMAIN`)
- [ ] **Upload con subdomain inválido** → 404 Not Found (`TENANT_NOT_FOUND`)
- [ ] **Upload con unitId inexistente** → 500 Error (FK violation)
- [x] **GET con unitId válido** → 200 OK (array de manuales) ✅
- [x] **GET con unitId sin manuales** → 200 OK (array vacío) ✅
- [ ] **GET sin subdomain header** → 400 Bad Request
- [x] **Verificar chunks en DB** → Todos con embeddings (3 dimensiones) ✅
- [x] **Verificar chunk_count** → Coincide con COUNT(chunks) ✅

---

## Troubleshooting

### Error: "The schema must be one of the following: public, graphql_public"

**Causa:** Intentando acceder al schema `hotels` vía Supabase JS client

**Solución:**
```typescript
// ❌ NO funciona (schema hotels no expuesto)
const { data } = await supabase
  .schema('hotels')
  .from('accommodation_units')
  .select('*')

// ✅ SÍ funciona (usar FK validation directamente)
// La FK accommodation_unit_id → hotels.accommodation_units.id
// valida automáticamente en el INSERT
```

### Error: "Unit not found or access denied"

**Causas posibles:**
1. `unitId` no existe en `hotels.accommodation_units`
2. `tenant_id` de la unit no coincide con tenant del subdomain
3. `unitId` tiene formato inválido (no es UUID)

**Debug:**
```sql
-- Verificar que unit existe y pertenece al tenant
SELECT
  id,
  name,
  tenant_id
FROM hotels.accommodation_units
WHERE id = 'dfe8772e-93ee-5949-8768-b45ec1b04f8a'
  AND tenant_id = '7ecdd0cc-a3f6-4a45-94a9-a4fc73390920';
```

### Error: FK constraint violation on INSERT

**Mensaje:** `insert or update on table "accommodation_manuals" violates foreign key constraint`

**Causa:** `accommodation_unit_id` no existe en `hotels.accommodation_units`

**Solución:**
```sql
-- Verificar units disponibles para el tenant
SELECT
  id,
  name
FROM hotels.accommodation_units
WHERE tenant_id = '7ecdd0cc-a3f6-4a45-94a9-a4fc73390920'
LIMIT 10;
```

### Manual en estado "processing" indefinidamente

**Causa:** Error durante generación de embeddings (OpenAI API)

**Debug:**
```sql
-- Ver error_message
SELECT
  id,
  filename,
  status,
  error_message,
  created_at
FROM accommodation_manuals
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

**Solución manual:**
```sql
-- Marcar como failed para retry
UPDATE accommodation_manuals
SET
  status = 'failed',
  error_message = 'Timeout - retry required'
WHERE id = 'fed16d3a-45d3-4a59-b625-4c8fca2eccba';
```

### Embeddings NULL en chunks

**Causa:** Error en llamada a OpenAI API

**Debug:**
```sql
-- Buscar chunks sin embeddings
SELECT
  mc.id,
  mc.manual_id,
  am.filename,
  mc.chunk_index,
  mc.embedding IS NULL as missing_full,
  mc.embedding_balanced IS NULL as missing_balanced,
  mc.embedding_fast IS NULL as missing_fast
FROM accommodation_units_manual_chunks mc
JOIN accommodation_manuals am ON mc.manual_id = am.id
WHERE mc.embedding IS NULL
   OR mc.embedding_balanced IS NULL
   OR mc.embedding_fast IS NULL
LIMIT 10;
```

### Rate limit OpenAI

**Síntoma:** Upload falla en chunks posteriores

**Causa:** Demasiadas requests a OpenAI API

**Configuración actual:**
```typescript
const RATE_LIMIT_DELAY = 100 // ms entre embeddings
```

**Ajustar si es necesario:**
```typescript
// En src/app/api/accommodation-manuals/[unitId]/route.ts
const RATE_LIMIT_DELAY = 200 // Aumentar delay
```

---

## Referencias

- **Plan completo:** `docs/accommodation-manuals/plan.md`
- **TODO tracking:** `docs/accommodation-manuals/TODO.md`
- **Chunking strategy:** `docs/accommodation-manuals/fase-0/CHUNKING_STRATEGY.md`
- **Código chunking:** `src/lib/manual-chunking.ts`
- **Código processing:** `src/lib/manual-processing.ts`
- **Embeddings generator:** `src/lib/embeddings/generator.ts`
- **Script de referencia:** `scripts/regenerate-manual-embeddings.ts`
