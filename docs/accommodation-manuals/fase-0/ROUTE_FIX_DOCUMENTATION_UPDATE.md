# Actualización de Documentación - Fix de Conflicto de Rutas

**Fecha:** 2025-11-09
**Issue:** Conflicto de rutas dinámicas en Next.js 15
**Status:** ✅ Resuelto

---

## Problema Encontrado

Al intentar correr el servidor de desarrollo (`pnpm run dev:staging`), Next.js lanzó error:

```
[Error: You cannot use different slug names for the same dynamic path ('manualId' !== 'unitId').]
```

### Causa Raíz

Estructura de rutas inconsistente en `src/app/api/accommodation-manuals/`:

```
❌ ANTES (CONFLICTO):
src/app/api/accommodation-manuals/
  ├── [unitId]/
  │   ├── route.ts                    → GET/POST manuals
  │   └── [manualId]/
  │       └── route.ts                → DELETE manual
  └── [manualId]/                     ← CONFLICTO AQUÍ
      └── chunks/
          └── route.ts                → GET chunks
```

**Explicación del conflicto:**

Next.js detectó dos parámetros dinámicos diferentes (`[unitId]` y `[manualId]`) al mismo nivel bajo `/api/accommodation-manuals/`. Esto viola la regla de routing de Next.js que requiere que todos los segmentos dinámicos al mismo nivel usen el **mismo nombre de parámetro**.

**Ejemplo del error:**
- Ruta 1: `/api/accommodation-manuals/[unitId]/route.ts`
- Ruta 2: `/api/accommodation-manuals/[manualId]/chunks/route.ts`

Cuando Next.js intenta resolver `/api/accommodation-manuals/abc123`, no puede determinar si `abc123` es un `unitId` o un `manualId`.

---

## Solución Aplicada

Reestructurar las rutas para que `chunks` esté bajo `[unitId]/[manualId]/`:

```
✅ DESPUÉS (CONSISTENTE):
src/app/api/accommodation-manuals/
  └── [unitId]/
      ├── route.ts                    → GET/POST manuals
      └── [manualId]/
          ├── route.ts                → DELETE manual
          └── chunks/
              └── route.ts            → GET chunks
```

### Cambios Realizados

**1. Mover archivo de chunks:**
```bash
# Crear nueva estructura
mkdir -p "src/app/api/accommodation-manuals/[unitId]/[manualId]/chunks"

# Mover archivo
mv "src/app/api/accommodation-manuals/[manualId]/chunks/route.ts" \
   "src/app/api/accommodation-manuals/[unitId]/[manualId]/chunks/route.ts"

# Eliminar directorio conflictivo
rm -rf "src/app/api/accommodation-manuals/[manualId]"
```

**2. Actualizar imports en `chunks/route.ts`:**

```typescript
// Antes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ manualId: string }> }
): Promise<NextResponse<ChunksResponse>> {
  const { manualId } = await params
  // ...
}

// Después
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string; manualId: string }> }
): Promise<NextResponse<ChunksResponse>> {
  const { unitId, manualId } = await params
  // ...
}
```

**3. Actualizar comentarios de documentación:**

```typescript
// Antes
/**
 * GET /api/accommodation-manuals/[manualId]/chunks
 */

// Después
/**
 * GET /api/accommodation-manuals/[unitId]/[manualId]/chunks
 */
```

---

## Impacto en API Endpoints

### Nuevas Rutas Canónicas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/accommodation-manuals/[unitId]` | Upload manual |
| `GET` | `/api/accommodation-manuals/[unitId]` | List manuals for unit |
| `DELETE` | `/api/accommodation-manuals/[unitId]/[manualId]` | Delete specific manual |
| `GET` | `/api/accommodation-manuals/[unitId]/[manualId]/chunks` | Get chunks for manual |

### Cambios en URLs

**Endpoint de chunks cambió:**

```diff
- GET /api/accommodation-manuals/{manualId}/chunks
+ GET /api/accommodation-manuals/{unitId}/{manualId}/chunks
```

**Ejemplo práctico:**

```bash
# Antes (❌ ya no funciona)
curl http://localhost:3001/api/accommodation-manuals/abc-123-manual-id/chunks

# Después (✅ nueva URL)
curl http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a/abc-123-manual-id/chunks
```

---

## Archivos Afectados

### Código Modificado

| Archivo | Acción | Status |
|---------|--------|--------|
| `src/app/api/accommodation-manuals/[unitId]/[manualId]/chunks/route.ts` | Movido + actualizado params | ✅ |
| `src/app/api/accommodation-manuals/[manualId]/` | Eliminado directorio | ✅ |

### Documentación que Necesita Actualización

| Archivo | Qué actualizar | Urgencia |
|---------|----------------|----------|
| `docs/accommodation-manuals/fase-0/API_ENDPOINT_DOCUMENTATION.md` | Agregar endpoint DELETE + GET chunks | 🔴 ALTA |
| `docs/accommodation-manuals/TODO.md` | Marcar tarea 0.1 como completada | 🟡 MEDIA |
| `docs/accommodation-manuals/fase-0/IMPLEMENTATION.md` | Actualizar rutas si documentadas | 🟡 MEDIA |
| `scripts/test-manual-*.sh` | Actualizar URLs de chunks si las usa | 🟢 BAJA |

---

## Actualizaciones Pendientes en Documentación

### 1. API_ENDPOINT_DOCUMENTATION.md

**Falta agregar:**

#### Endpoint: DELETE Manual
```markdown
## DELETE - Delete Manual

Elimina un manual y todos sus chunks asociados.

### Endpoint
DELETE /api/accommodation-manuals/[unitId]/[manualId]

### Headers
| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant |

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

**404 Not Found** - Manual not found
```json
{
  "success": false,
  "error": "Manual not found or access denied",
  "code": "NOT_FOUND"
}
```

### Ejemplo de uso

#### cURL
```bash
curl -X DELETE \
  http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a/abc-123-manual-id \
  -H "x-tenant-subdomain: simmerdown"
```

#### TypeScript
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
    throw new Error('Failed to delete manual')
  }

  return response.json()
}
```
```

#### Endpoint: GET Chunks
```markdown
## GET - List Chunks for Manual

Obtiene todos los chunks de un manual específico (útil para preview/debugging).

**NOTA DE PERFORMANCE:** Excluye embeddings vectors (arrays grandes) para respuesta rápida.

### Endpoint
GET /api/accommodation-manuals/[unitId]/[manualId]/chunks

### Headers
| Header | Tipo | Requerido | Descripción |
|--------|------|-----------|-------------|
| `x-tenant-subdomain` | string | ✅ | Subdomain del tenant |

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
      "id": "chunk-uuid-1",
      "chunk_index": 0,
      "section_title": "Check-in y Check-out",
      "chunk_content": "Check-in y Check-out\n\n**Hora de entrada:** 15:00 hrs..."
    },
    {
      "id": "chunk-uuid-2",
      "chunk_index": 1,
      "section_title": "WiFi",
      "chunk_content": "WiFi\n\n**Red:** Simmerdown-Guest..."
    }
  ]
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

**404 Not Found** - Manual not found
```json
{
  "success": false,
  "error": "Manual not found or access denied",
  "code": "NOT_FOUND"
}
```

### Ejemplo de uso

#### cURL
```bash
curl -X GET \
  "http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a/abc-123-manual-id/chunks" \
  -H "x-tenant-subdomain: simmerdown"
```

#### TypeScript
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
```

### Performance Notes

- **Embeddings excluidos:** No retorna `embedding`, `embedding_balanced`, ni `embedding_fast`
- **Razón:** Vectors de 1024d-3072d son arrays grandes, innecesarios para UI display
- **Alternativa:** Si necesitas embeddings, usa query SQL directa
```

### 2. TODO.md

**Actualizar FASE 0.1:**

```markdown
### 0.1 Análisis de conflicto de rutas (Error 5) ✅
- [x] Investigar estructura de rutas en `/api/accommodation/` (estimate: 0.5h)
  - ✅ Identificado conflicto: `[unitId]` vs `[manualId]` al mismo nivel
  - ✅ Movido `[manualId]/chunks/` → `[unitId]/[manualId]/chunks/`
  - ✅ Actualizado params en chunks/route.ts
  - ✅ Servidor corre sin errores
  - Files: `src/app/api/accommodation-manuals/**/*.ts`
  - Output: `docs/accommodation-manuals/fase-0/ROUTE_FIX_DOCUMENTATION_UPDATE.md` ✅
  - Test: `pnpm run dev:staging` → ✅ Ready in 845ms
```

### 3. Component Integration (NUEVO)

**Agregar a TODO.md - FASE 2:**

```markdown
## FASE 2: Frontend - UI Components 🎨

### 2.1 Crear componente de gestión de manuales ✅
- [x] Implementar `AccommodationManualsSection.tsx` (estimate: 1.5h)
  - ✅ Drag & drop con react-dropzone
  - ✅ Estados: Empty, Uploading, List
  - ✅ Upload progress bar (0-100%)
  - ✅ Delete con confirmación
  - ✅ View button (callback)
  - ✅ Error handling con toast
  - Files: `src/components/Accommodation/AccommodationManualsSection.tsx` (383 líneas)
  - Agent: **@agent-ux-interface**
  - Test: Visual test en `/accommodations/units`
  - Status: ⏸️ PENDIENTE INTEGRACIÓN

### 2.2 Integrar componente en tarjetas de alojamiento ⏳
- [ ] Reemplazar Stats Summary en `AccommodationUnitsGrid.tsx` (estimate: 0.5h)
  - Ubicación: Líneas 544-560
  - Reemplazar grid de Photos/Chunks/Amenities
  - Pasar props: unitId, tenantId, onViewContent
  - Files: `src/app/(dashboard)/accommodations/units/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Visual test + upload funcional
```

---

## Testing Post-Fix

### Servidor de Desarrollo

```bash
# Test 1: Servidor inicia sin errores
$ pnpm run dev:staging

# Resultado esperado:
✓ Ready in 845ms  ✅

# Test 2: Todas las rutas responden
curl http://localhost:3001/api/accommodation-manuals/test-unit-id
# Debe retornar JSON (NO 404 HTML)
```

### Endpoints Funcionando

```bash
# GET manuals
curl -H "x-tenant-subdomain: simmerdown" \
  http://localhost:3001/api/accommodation-manuals/dfe8772e-93ee-5949-8768-b45ec1b04f8a

# POST manual (pendiente test)
# DELETE manual (pendiente test)
# GET chunks (pendiente test con unitId)
```

---

## Próximos Pasos

### Documentación
1. ✅ Crear este documento (ROUTE_FIX_DOCUMENTATION_UPDATE.md)
2. ⏳ Actualizar API_ENDPOINT_DOCUMENTATION.md con DELETE + GET chunks
3. ⏳ Actualizar TODO.md con estado de FASE 0.1 y 2.1
4. ⏳ Actualizar scripts de testing si usan endpoint de chunks

### Desarrollo
1. ⏳ Integrar `AccommodationManualsSection` en tarjetas
2. ⏳ Test completo de flujo: Upload → List → View → Delete
3. ⏳ Crear modal de view content
4. ⏳ Validar RPC functions antes de merge

---

## Conclusión

El conflicto de rutas fue resuelto exitosamente moviendo el endpoint de chunks a una estructura jerárquica consistente.

**Cambio principal:**
- ❌ `/api/accommodation-manuals/[manualId]/chunks`
- ✅ `/api/accommodation-manuals/[unitId]/[manualId]/chunks`

**Impacto:**
- 1 archivo movido
- 3 líneas modificadas (params + comentario)
- 0 breaking changes en endpoints existentes (GET/POST/DELETE)
- 1 breaking change en endpoint nuevo (chunks - no estaba en producción)

**Status:** ✅ Resuelto y documentado
