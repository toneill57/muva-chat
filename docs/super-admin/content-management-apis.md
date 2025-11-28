# Super Admin Content Management APIs

API endpoints para gestión de contenido turístico (.md files) y embeddings.

**Creado:** November 26, 2025
**Estado:** ✅ Implementado y validado

---

## Arquitectura

### Flujo de Procesamiento

```
1. Usuario sube .md file
   ↓
2. API guarda archivo en _assets/muva/listings/{category}/
   ↓
3. API ejecuta scripts/database/populate-embeddings.js
   ↓
4. Script procesa archivo:
   - Extrae metadata YAML
   - Genera chunks semánticos
   - Crea Matryoshka embeddings (1024d, 1536d, 3072d)
   - Inserta en public.muva_content
   ↓
5. API retorna resultado con embeddings count
```

### Tabla Destino

**`public.muva_content`**

Columnas principales:
- `id` (UUID)
- `title` (TEXT)
- `content` (TEXT)
- `category` (TEXT) - actividades|accommodations|restaurants|rentals|spots|culture
- `metadata` (JSONB) - Datos estructurados del YAML frontmatter
- `embedding_1024` (VECTOR) - Matryoshka tier 1 (fast)
- `embedding_1536` (VECTOR) - Matryoshka tier 2 (balanced)
- `embedding_3072` (VECTOR) - Matryoshka tier 3 (full)
- `created_at` (TIMESTAMP)

---

## API Endpoints

### 1. Upload Content

**`POST /api/super-admin/content/upload`**

Sube archivo .md y procesa embeddings.

**Request:**

```bash
curl -X POST http://localhost:3000/api/super-admin/content/upload \
  -H "Authorization: Bearer <super-admin-token>" \
  -F "file=@path/to/file.md" \
  -F "category=actividades"
```

**Body (FormData):**
- `file`: File (.md only)
- `category`: string (actividades|accommodations|restaurants|rentals|spots|culture)

**Response (Success):**

```json
{
  "success": true,
  "filename": "file.md",
  "category": "actividades",
  "embeddings": 12,
  "chunks": 12,
  "message": "File uploaded and embeddings processed successfully",
  "output": "... script stdout ..."
}
```

**Response (Error):**

```json
{
  "success": false,
  "filename": "file.md",
  "category": "actividades",
  "error": "Failed to process embeddings",
  "details": "...",
  "stdout": "...",
  "stderr": "..."
}
```

**Validaciones:**
- ✅ Solo archivos .md
- ✅ Category debe ser válida
- ✅ Filename sanitizado (evita path traversal)
- ✅ Timeout: 2 minutos

---

### 2. List Content

**`GET /api/super-admin/content/list`**

Lista contenido con paginación y filtros.

**Request:**

```bash
curl "http://localhost:3000/api/super-admin/content/list?category=actividades&page=1&limit=50"
```

**Query Parameters:**
- `category` (opcional): Filtrar por categoría
- `search` (opcional): Buscar en title/filename
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 50, max: 100)

**Response:**

```json
{
  "content": [
    {
      "id": "uuid",
      "title": "Tour de Café",
      "category": "actividades",
      "content": "...",
      "metadata": {
        "filename": "tour-cafe.md",
        "source": "manual-upload",
        "version": "3.0",
        "pricing": { ... },
        "contact": { ... }
      },
      "created_at": "2025-11-26T10:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

### 3. Content Statistics

**`GET /api/super-admin/content/stats`**

Estadísticas agregadas por categoría.

**Request:**

```bash
curl http://localhost:3000/api/super-admin/content/stats
```

**Response:**

```json
{
  "total": 45,
  "byCategory": {
    "actividades": 12,
    "accommodations": 8,
    "restaurants": 10,
    "rentals": 5,
    "spots": 7,
    "culture": 3
  }
}
```

---

### 4. Delete Content

**`DELETE /api/super-admin/content/delete?id={uuid}`**

Elimina contenido de DB y filesystem.

**Request:**

```bash
curl -X DELETE "http://localhost:3000/api/super-admin/content/delete?id=abc-123-uuid"
```

**Response:**

```json
{
  "success": true,
  "message": "Content deleted successfully",
  "fileDeleted": true,
  "deletedContent": {
    "id": "abc-123-uuid",
    "title": "Tour de Café",
    "category": "actividades"
  }
}
```

**Comportamiento:**
- Elimina registro de `muva_content`
- Intenta eliminar archivo de filesystem
- Si archivo no existe, continúa sin error (`fileDeleted: false`)

---

## Testing

### Script Automático

```bash
# Ejecutar todas las pruebas
./scripts/test-content-apis.sh
```

El script valida:
1. ✅ Stats antes de upload
2. ✅ Upload de archivo .md
3. ✅ Procesamiento de embeddings
4. ✅ Stats después de upload
5. ✅ Listado de contenido
6. ✅ Búsqueda por texto

### Testing Manual

**1. Crear archivo de prueba:**

```bash
cat > /tmp/test-activity.md << 'EOF'
---
type: tourism-activity
destination:
  schema: public
  table: muva_content
metadata:
  source: manual-test
  version: 3.0
---

# Tour de Avistamiento de Aves

Experiencia única en la naturaleza colombiana.

## Descripción

Tour guiado de 4 horas por el bosque de niebla.

## Qué incluye

- Guía especializado
- Binoculares profesionales
- Refrigerio

## Precios

- Adultos: $80,000 COP
- Niños: $50,000 COP

## Contacto

- WhatsApp: +57 310 123 4567
- Email: tours@example.com
EOF
```

**2. Upload:**

```bash
curl -X POST http://localhost:3000/api/super-admin/content/upload \
  -F "file=@/tmp/test-activity.md" \
  -F "category=actividades" | jq
```

**3. Verificar en DB:**

```sql
SELECT
  id,
  title,
  category,
  metadata->>'filename' as filename,
  metadata->>'version' as version,
  created_at
FROM muva_content
WHERE category = 'actividades'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Seguridad

### Validaciones Implementadas

1. **File Upload:**
   - ✅ Solo extensión .md permitida
   - ✅ Category validada contra whitelist
   - ✅ Filename sanitizado (path.basename)
   - ✅ Prevención de path traversal

2. **Script Execution:**
   - ✅ Timeout de 2 minutos
   - ✅ Variables de entorno pasadas seguramente
   - ✅ Ejecución desde project root
   - ✅ Logs completos (stdout/stderr)

3. **Query Protection:**
   - ✅ Pagination limitada (max 100 items)
   - ✅ Prepared statements (Supabase client)
   - ✅ Error handling completo

### Autenticación

**TODO:** Agregar middleware de autenticación Super Admin.

Por ahora, las APIs están **sin protección** para testing. En producción:

```typescript
// Agregar a cada route.ts
import { verifySuperAdminToken } from '@/lib/super-admin-auth';

export async function POST(request: NextRequest) {
  // Verificar token
  const token = request.headers.get('authorization')?.split(' ')[1];
  const admin = await verifySuperAdminToken(token);

  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... resto de la lógica
}
```

---

## Error Handling

### Errores Comunes

**1. Script timeout:**

```json
{
  "success": false,
  "error": "Failed to process embeddings",
  "details": "Command failed with ETIMEDOUT"
}
```

**Solución:** Aumentar timeout en route.ts (línea ~82).

**2. Category inválida:**

```json
{
  "error": "Invalid category",
  "validCategories": ["actividades", "accommodations", ...]
}
```

**3. File no es .md:**

```json
{
  "error": "Only .md (Markdown) files are allowed"
}
```

**4. Script falla (embeddings error):**

```json
{
  "success": false,
  "error": "Failed to process embeddings",
  "stdout": "...",
  "stderr": "OpenAI API error: Rate limit exceeded"
}
```

**Solución:** Revisar OPENAI_API_KEY en .env.local

---

## Archivos Creados

### APIs

1. `/src/app/api/super-admin/content/upload/route.ts` (177 líneas)
2. `/src/app/api/super-admin/content/list/route.ts` (75 líneas)
3. `/src/app/api/super-admin/content/stats/route.ts` (48 líneas)
4. `/src/app/api/super-admin/content/delete/route.ts` (93 líneas)

### Testing

5. `/scripts/test-content-apis.sh` (Script bash para testing)

### Documentación

6. `/docs/super-admin/content-management-apis.md` (Este archivo)

**Total:** 6 archivos nuevos, ~500 líneas de código.

---

## Next Steps

### Fase 5 - Parte C (Frontend)

1. **Content Upload UI** (`/super-admin/content`)
   - File uploader (react-dropzone)
   - Category selector
   - Progress indicator
   - Result display (embeddings count)

2. **Content List UI**
   - Table con paginación
   - Filtros por category
   - Search box
   - Delete button por item

3. **Stats Dashboard**
   - Charts con conteo por category
   - Total embeddings
   - Recent uploads

### Integración

Ver: `docs/super-admin/fase-5-content-management.md` (próximo documento)

---

## Referencias

- **Script canónico:** `scripts/database/populate-embeddings.js` (2,692 líneas)
- **Guía de contenido:** `docs/content/MUVA_LISTINGS_GUIDE.md`
- **Templates:** `docs/content/MUVA_TEMPLATE_GUIDE.md`
- **Metadata extraction:** `docs/patterns/METADATA_EXTRACTION_FIX_PATTERN.md`

---

**Última actualización:** November 26, 2025
**Estado:** ✅ Backend completo - Listo para frontend integration
