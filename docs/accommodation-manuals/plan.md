# Sistema de Manuales de Alojamiento - Plan de Implementación

**Proyecto:** Accommodation Manuals Upload & Embeddings
**Fecha Inicio:** 2025-11-09
**Estado:** 📋 Planificación Completa - Listo para FASE 0

---

## 🎯 OVERVIEW

### Objetivo Principal
Implementar un sistema completo para subir, procesar y consultar manuales de alojamiento (.md) desde la interfaz de gestión de unidades, generando embeddings Matryoshka que alimenten automáticamente el guest chat en `/my-stay`.

### ¿Por qué?
- **Experiencia del huésped:** Permitir que el chat responda preguntas específicas sobre funcionamiento de amenidades, reglas de la casa, instrucciones de checkout, etc.
- **Gestión centralizada:** Hoteleros pueden actualizar manuales desde la UI sin intervención técnica
- **Multi-tier search:** Usar embeddings Matryoshka existentes para búsquedas rápidas (1024d) y precisas (3072d)
- **Arquitectura escalable:** Sistema preparado para soportar múltiples formatos en el futuro (PDF, DOCX)

### Alcance
- ✅ Subida de archivos Markdown (.md) desde tarjeta de cada alojamiento
- ✅ Procesamiento en memoria (NO guardar archivo original)
- ✅ Generación de embeddings Matryoshka (3072d, 1536d, 1024d)
- ✅ Almacenamiento de chunks en tabla existente `accommodation_units_manual_chunks`
- ✅ Metadata en tabla existente `accommodation_manuals`
- ✅ API endpoints RESTful para CRUD de manuales
- ✅ Componentes React para upload, listado y visualización
- ✅ Integración automática con guest chat (sin cambios requeridos)
- ✅ Validación y testing exhaustivo

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Tabla `accommodation_units_manual_chunks` ya existe y tiene estructura correcta
- ✅ Tabla `accommodation_manuals` ya existe para metadata
- ✅ Script `scripts/regenerate-manual-embeddings.ts` con lógica de embeddings
- ✅ Biblioteca `src/lib/embeddings/generator.ts` con Matryoshka embeddings
- ✅ RPC function `match_guest_accommodations()` filtra por `accommodation_unit_id`
- ✅ Guest chat en `/my-stay` ya consume chunks con embeddings

### Limitaciones Actuales
- ❌ NO hay UI para subir manuales (se requiere proceso manual)
- ❌ NO hay endpoints API para gestionar manuales
- ❌ NO hay componentes React para visualización
- ❌ Stats Summary en cards de alojamiento ocupa espacio sin valor estratégico

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Para Hoteleros (Admin):**
1. Navegar a `/accommodations/units`
2. Ver tarjeta de alojamiento específico (ej: "Suite Presidencial")
3. En lugar de stats (Photos/Chunks/Amenities), ver sección "Manuales"
4. Arrastrar archivo `.md` a zona de drop
5. Ver progreso de procesamiento
6. Ver lista de manuales con chunk count
7. Poder visualizar contenido en modal
8. Poder eliminar manuales

**Para Huéspedes (Guest Chat):**
1. Entrar a `/my-stay` con reserva activa
2. Preguntar: "¿Cómo funciona el jacuzzi?"
3. Chat automáticamente busca en chunks del manual del alojamiento
4. Responde con información precisa del manual

### Características Clave
- Drag & drop con `react-dropzone`
- Validación client-side (formato, tamaño)
- Procesamiento en background con feedback visual
- Auto-refresh después de upload/delete
- Modal de visualización con accordion por chunk
- Confirmación antes de eliminar
- RLS policies para aislamiento multi-tenant

---

## 📱 TECHNICAL STACK

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 18 + TypeScript
- **Componentes:** Tailwind CSS + Headless UI
- **Upload:** react-dropzone
- **Markdown Rendering:** react-markdown

### Backend
- **Runtime:** Node.js 20 (Edge Runtime para API routes)
- **Database:** PostgreSQL (Supabase)
- **Embeddings:** OpenAI API (text-embedding-3-large)
- **Processing:** In-memory (Buffer API)

### Infrastructure
- **Environment:** Staging first (`localhost:3001` → `hoaiwcueleiemeplrurv`)
- **Deployment:** VPS (195.200.6.216)
- **Multi-tenant:** Subdomain-based + RLS policies

---

## 🔧 DESARROLLO - FASES

### FASE 0: Análisis y Diseño Técnico (2h)

**Objetivo:** Completar arquitectura técnica, resolver conflicto de rutas 404, diseñar flujo completo

**Entregables:**
- Arquitectura de API routes definitiva (solución al Error 5)
- Diseño de chunking según script existente
- Especificación de RLS policies
- Especificación de índices de base de datos
- Plan de testing y validación

**Archivos a analizar:**
- `scripts/regenerate-manual-embeddings.ts` (chunking logic)
- `src/lib/embeddings/generator.ts` (embeddings API)
- `src/app/api/accommodation/units/route.ts` (patrón existente)
- Estructura de rutas en `/api/`

**Testing:**
- Verificar estructura de tablas con MCP
- Analizar conflicto de rutas (404)
- Proponer y validar nueva estructura de rutas

**Decisiones a tomar:**
- ¿Usar `/api/accommodation-manuals/[unitId]` o `/api/units/[unitId]/manuals`?
- ¿Procesar síncrono o async con job queue?
- ¿Chunking por headers markdown o por tamaño fijo?

---

### FASE 1: Backend - API Endpoints y Procesamiento (4h)

**Objetivo:** Crear API endpoints funcionales para upload, listado, visualización y eliminación de manuales

**Entregables:**
- 4 API endpoints RESTful operacionales
- Biblioteca `src/lib/manual-processing.ts` para procesamiento de .md
- Validación de tenant ownership
- Error handling robusto
- Logging para debugging

**Archivos a crear:**
- `src/app/api/accommodation-manuals/[unitId]/route.ts` (GET, POST)
- `src/app/api/accommodation-manuals/[unitId]/[manualId]/route.ts` (DELETE)
- `src/app/api/accommodation-manuals/[manualId]/chunks/route.ts` (GET)
- `src/lib/manual-processing.ts` (procesamiento de markdown)
- `src/lib/manual-processing.test.ts` (unit tests)

**Archivos a modificar:**
- Ninguno (rutas nuevas)

**Testing:**
```bash
# Test 1: Upload manual
curl -X POST http://localhost:3001/api/accommodation-manuals/{unitId} \
  -F "file=@test-manual.md"

# Test 2: List manuals
curl http://localhost:3001/api/accommodation-manuals/{unitId}

# Test 3: Get chunks
curl http://localhost:3001/api/accommodation-manuals/{manualId}/chunks

# Test 4: Delete manual
curl -X DELETE http://localhost:3001/api/accommodation-manuals/{unitId}/{manualId}

# Test 5: Verify in database
pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await supabase.from('accommodation_manuals').select('*').limit(5)
console.table(data)
"
```

---

### FASE 2: Database - RLS Policies e Índices (1.5h)

**Objetivo:** Asegurar multi-tenant isolation y optimizar queries de búsqueda

**Entregables:**
- RLS policies para `accommodation_manuals`
- RLS policies para `accommodation_units_manual_chunks` (si no existen)
- Índices optimizados para queries frecuentes
- Validación de performance

**Archivos a crear:**
- `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_rls.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_indexes.sql`

**Especificación de RLS Policies:**

```sql
-- accommodation_manuals
CREATE POLICY "tenant_isolation_select" ON accommodation_manuals
  FOR SELECT USING (tenant_id = auth.jwt() -> 'tenant_id');

CREATE POLICY "tenant_isolation_insert" ON accommodation_manuals
  FOR INSERT WITH CHECK (tenant_id = auth.jwt() -> 'tenant_id');

CREATE POLICY "tenant_isolation_delete" ON accommodation_manuals
  FOR DELETE USING (tenant_id = auth.jwt() -> 'tenant_id');

-- accommodation_units_manual_chunks (si no existe)
CREATE POLICY "tenant_isolation_select" ON accommodation_units_manual_chunks
  FOR SELECT USING (tenant_id = auth.jwt() -> 'tenant_id');

CREATE POLICY "tenant_isolation_insert" ON accommodation_units_manual_chunks
  FOR INSERT WITH CHECK (tenant_id = auth.jwt() -> 'tenant_id');

CREATE POLICY "tenant_isolation_delete" ON accommodation_units_manual_chunks
  FOR DELETE USING (tenant_id = auth.jwt() -> 'tenant_id');
```

**Especificación de Índices:**

```sql
-- Para listado de manuales por unit
CREATE INDEX IF NOT EXISTS idx_accommodation_manuals_unit_tenant
  ON accommodation_manuals(accommodation_unit_id, tenant_id);

-- Para búsqueda de chunks en guest chat
CREATE INDEX IF NOT EXISTS idx_manual_chunks_unit_tenant
  ON accommodation_units_manual_chunks(accommodation_unit_id, tenant_id);

-- Para ordenamiento por chunk_index
CREATE INDEX IF NOT EXISTS idx_manual_chunks_manual_index
  ON accommodation_units_manual_chunks(manual_id, chunk_index);
```

**Testing:**
```bash
# Apply migrations
set -a && source .env.local && set +a
pnpm dlx tsx scripts/execute-ddl-via-api.ts supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_rls.sql

# Verify policies
npx supabase db dump --schema public | grep -A 5 "accommodation_manuals"

# Test query performance
pnpm dlx tsx -e "
const { data } = await supabase
  .from('accommodation_units_manual_chunks')
  .select('*')
  .eq('accommodation_unit_id', 'test-uuid')
  .explain()
console.log(data)
"
```

---

### FASE 3: Frontend - Componentes UI (3h)

**Objetivo:** Implementar componentes React para gestión visual de manuales

**Estado:** 20% completado (AccommodationManualsSection creado, NO integrado)

**Entregables:**
- ✅ Componente `AccommodationManualsSection` con drag & drop (COMPLETADO)
- ⏸️ Componente `ManualContentModal` con visualización (PENDIENTE)
- ⏸️ Integración en `AccommodationUnitsGrid` (PENDIENTE)
- ✅ Estados de carga y error (implementados en Section)
- ✅ Confirmaciones de acciones destructivas (Delete confirmation en Section)

**Archivos a crear:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/components/Accommodation/ManualContentModal.tsx`

**Archivos a modificar:**
- `src/components/Accommodation/AccommodationUnitsGrid.tsx` (líneas 545-560)

**Especificación UI:**

**AccommodationManualsSection.tsx:**
```typescript
interface Props {
  unitId: string
  tenantId: string
  onViewContent: (manualId: string) => void
}

// Estados:
// 1. Empty state: Dropzone vacía
// 2. Uploading: Progress bar
// 3. List state: Manuales con acciones (Ver, Eliminar)
```

**ManualContentModal.tsx:**
```typescript
interface Props {
  manualId: string
  onClose: () => void
}

// Features:
// - Accordion con chunks
// - Expand all / Collapse all
// - Markdown rendering
```

**Testing:**
```bash
# Iniciar dev server
pnpm run dev:staging

# Navegar a http://{tenant}.localhost:3001/accommodations/units

# Test manual:
# 1. Ver sección "Manuales" en cada tarjeta
# 2. Arrastrar archivo .md
# 3. Ver progress bar
# 4. Ver manual listado
# 5. Click "Ver" → Modal se abre
# 6. Click "Eliminar" → Confirmación → Manual eliminado
```

---

### FASE 4: Integración y Testing End-to-End (2h)

**Objetivo:** Validar flujo completo desde upload hasta guest chat

**Entregables:**
- Tests end-to-end funcionando
- Validación de embeddings en base de datos
- Validación de guest chat usando manuales
- Documentación de casos de prueba

**Testing:**

**Test 1: Upload completo**
```bash
# 1. Crear archivo test
cat > /tmp/test-manual.md << 'EOF'
# Manual de Suite Presidencial

## Jacuzzi
Para activar el jacuzzi, presione el botón azul ubicado en el panel lateral.

## WiFi
Red: SuitePresidencial
Password: luxury2024

## Check-out
Dejar la llave en recepción antes de las 12:00 PM.
EOF

# 2. Subir via UI o API
curl -X POST http://localhost:3001/api/accommodation-manuals/{unitId} \
  -F "file=@/tmp/test-manual.md"

# 3. Verificar en DB
pnpm dlx tsx -e "
const { data: manuals } = await supabase
  .from('accommodation_manuals')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1)

console.log('Manual:', manuals[0])

const { data: chunks } = await supabase
  .from('accommodation_units_manual_chunks')
  .select('chunk_index, section_title, chunk_content')
  .eq('manual_id', manuals[0].id)
  .order('chunk_index')

console.table(chunks)
"
```

**Test 2: Guest chat integration**
```bash
# 1. Crear reserva test con accommodation_unit_id que tiene manual
# 2. Navegar a /my-stay
# 3. Hacer pregunta: "¿Cómo funciona el jacuzzi?"
# 4. Verificar que respuesta incluye información del manual
# 5. Verificar logs de RPC function
```

**Test 3: Multi-tenant isolation**
```bash
# 1. Subir manual en tenant A
# 2. Intentar acceder desde tenant B (debe fallar 403)
# 3. Verificar RLS policies funcionando
```

**Archivos a crear:**
- `docs/accommodation-manuals/fase-4/TEST_CASES.md`
- `docs/accommodation-manuals/fase-4/INTEGRATION_RESULTS.md`

---

### FASE 5: Optimización y Documentación (1.5h)

**Objetivo:** Optimizar performance, documentar sistema completo, preparar para producción

**Entregables:**
- Performance optimizado (< 3s upload completo)
- Documentación técnica completa
- Guía de troubleshooting
- Checklist de deployment

**Archivos a crear:**
- `docs/accommodation-manuals/ARCHITECTURE.md`
- `docs/accommodation-manuals/API_REFERENCE.md`
- `docs/accommodation-manuals/TROUBLESHOOTING.md`
- `docs/accommodation-manuals/DEPLOYMENT_CHECKLIST.md`

**Optimizaciones:**
1. Batch embeddings (3 dimensiones en paralelo)
2. Rate limiting en frontend (no spam de uploads)
3. Lazy loading de chunks en modal
4. Cache de listado de manuales (1 min)

**Testing:**
```bash
# Performance test
time curl -X POST http://localhost:3001/api/accommodation-manuals/{unitId} \
  -F "file=@large-manual.md"

# Expected: < 3s para archivo de 1MB

# Validación final
./scripts/pre-deploy-check.sh staging
pnpm dlx tsx scripts/monitoring-dashboard.ts
```

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Usuario puede subir archivo .md desde UI
- [ ] Sistema procesa y genera embeddings en < 3s para archivos típicos (< 1MB)
- [ ] Manuales aparecen en listado inmediatamente después de upload
- [ ] Modal de visualización muestra contenido organizado por chunks
- [ ] Eliminación funciona con confirmación
- [ ] Guest chat responde usando información de manuales

### Performance
- [ ] Upload + procesamiento < 3s (archivo 1MB, ~10 chunks)
- [ ] Listado de manuales < 200ms
- [ ] Visualización de chunks < 500ms
- [ ] Guest chat no se degrada (mismo tiempo de respuesta)

### Seguridad
- [ ] RLS policies activas (multi-tenant isolation)
- [ ] Validación de formatos en frontend y backend
- [ ] Límite de tamaño (10MB) aplicado
- [ ] No SQL injection en queries
- [ ] No permite subir archivos ejecutables

### Accesibilidad
- [ ] Dropzone accesible con teclado
- [ ] Modal con focus trap
- [ ] Screen reader friendly
- [ ] Confirmaciones con aria-labels

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal - FASE 1, 4)
**Responsabilidad:** API endpoints, procesamiento de documentos, lógica de negocio

**Tareas:**
- FASE 1: Crear 4 API endpoints (`POST /upload`, `GET /list`, `GET /chunks`, `DELETE`)
- FASE 1: Implementar `src/lib/manual-processing.ts` con chunking según script
- FASE 1: Integrar con `src/lib/embeddings/generator.ts` (Matryoshka)
- FASE 4: Tests end-to-end y validación de integración

**Archivos:**
- `src/app/api/accommodation-manuals/[unitId]/route.ts`
- `src/app/api/accommodation-manuals/[unitId]/[manualId]/route.ts`
- `src/app/api/accommodation-manuals/[manualId]/chunks/route.ts`
- `src/lib/manual-processing.ts`

---

### 2. **@agent-database-agent** (FASE 2)
**Responsabilidad:** Migrations, RLS policies, índices, monitoreo

**Tareas:**
- FASE 2: Crear migrations para RLS policies
- FASE 2: Crear migrations para índices optimizados
- FASE 2: Validar performance de queries
- FASE 4: Verificar integridad de datos

**Archivos:**
- `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_rls.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_indexes.sql`

---

### 3. **@agent-ux-interface** (FASE 3, 5)
**Responsabilidad:** Componentes UI, UX, animaciones, estilos

**Tareas:**
- FASE 3: Crear `AccommodationManualsSection` con drag & drop
- FASE 3: Crear `ManualContentModal` con accordion
- FASE 3: Modificar `AccommodationUnitsGrid` (reemplazar Stats Summary)
- FASE 5: Optimizaciones de UI (lazy loading, cache)

**Archivos:**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/components/Accommodation/ManualContentModal.tsx`
- `src/components/Accommodation/AccommodationUnitsGrid.tsx` (líneas 545-560)

---

### 4. **@agent-deploy-agent** (FASE 5)
**Responsabilidad:** Deployment, validación en staging, promoción a producción

**Tareas:**
- FASE 5: Deploy a staging
- FASE 5: Validación de health checks
- FASE 5: Verificación de RPC functions
- FASE 5: Promoción a producción (si aprobado)

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── docs/
│   └── accommodation-manuals/
│       ├── plan.md (este archivo)
│       ├── TODO.md
│       ├── accommodation-manuals-prompt-workflow.md
│       ├── ARCHITECTURE.md (FASE 5)
│       ├── API_REFERENCE.md (FASE 5)
│       ├── TROUBLESHOOTING.md (FASE 5)
│       ├── DEPLOYMENT_CHECKLIST.md (FASE 5)
│       ├── fase-0/
│       │   ├── ROUTE_CONFLICT_ANALYSIS.md
│       │   └── CHUNKING_STRATEGY.md
│       ├── fase-1/
│       │   ├── IMPLEMENTATION.md
│       │   ├── CHANGES.md
│       │   └── TESTS.md
│       ├── fase-2/
│       │   ├── IMPLEMENTATION.md
│       │   ├── CHANGES.md
│       │   └── TESTS.md
│       ├── fase-3/
│       │   ├── IMPLEMENTATION.md
│       │   ├── CHANGES.md
│       │   └── TESTS.md
│       ├── fase-4/
│       │   ├── TEST_CASES.md
│       │   ├── INTEGRATION_RESULTS.md
│       │   └── ISSUES.md
│       └── fase-5/
│           ├── PERFORMANCE_REPORT.md
│           └── DEPLOYMENT_REPORT.md
├── src/
│   ├── app/
│   │   └── api/
│   │       └── accommodation-manuals/
│   │           ├── [unitId]/
│   │           │   ├── route.ts (GET, POST)
│   │           │   └── [manualId]/
│   │           │       └── route.ts (DELETE)
│   │           └── [manualId]/
│   │               └── chunks/
│   │                   └── route.ts (GET)
│   ├── components/
│   │   └── Accommodation/
│   │       ├── AccommodationManualsSection.tsx (NUEVO)
│   │       ├── ManualContentModal.tsx (NUEVO)
│   │       └── AccommodationUnitsGrid.tsx (MODIFICAR líneas 545-560)
│   └── lib/
│       ├── manual-processing.ts (NUEVO)
│       ├── manual-processing.test.ts (NUEVO)
│       └── embeddings/
│           └── generator.ts (YA EXISTE - sin cambios)
├── supabase/
│   └── migrations/
│       ├── YYYYMMDDHHMMSS_accommodation_manuals_rls.sql (NUEVO)
│       └── YYYYMMDDHHMMSS_accommodation_manuals_indexes.sql (NUEVO)
└── scripts/
    └── regenerate-manual-embeddings.ts (YA EXISTE - referencia)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Solución al Error 5 (404 en rutas):**
- **Problema:** Conflicto entre `/api/accommodation/units` (estática) y `/api/accommodation/[unitId]/manuals` (dinámica)
- **Solución:** Usar `/api/accommodation-manuals/[unitId]` (namespace separado)
- **Razón:** Next.js 15 prioriza segmentos estáticos sobre dinámicos en mismo nivel

**2. Procesamiento de Markdown:**
- Leer buffer como UTF-8
- NO usar librerías de parsing complejas (solo texto plano)
- Chunking por headers `##` (similar a script existente)
- Mantener metadata de sección en cada chunk

**3. Chunking Strategy:**
Basado en `scripts/regenerate-manual-embeddings.ts`:
```typescript
// Estrategia:
// 1. Split por headers markdown (## Section)
// 2. Si sección > 1500 chars, split en sub-chunks
// 3. Mantener section_title en cada chunk
// 4. chunk_index secuencial desde 0
```

**4. Embeddings:**
- Usar `src/lib/embeddings/generator.ts` (ya existe)
- Llamar `generateEmbedding(text)` retorna `{ balanced, standard, full }`
- `balanced` = 1024d, `standard` = 1536d, `full` = 3072d
- Rate limiting: 100ms entre llamadas

**5. Multi-tenant:**
- SIEMPRE filtrar por `tenant_id` en queries
- SIEMPRE validar ownership antes de DELETE
- RLS policies son la última línea de defensa

**6. Guest Chat Integration:**
- NO requiere cambios en guest chat
- RPC `match_guest_accommodations()` ya filtra por `accommodation_unit_id`
- Chunks automáticamente incluidos en búsquedas vectoriales

**7. Testing:**
- SIEMPRE en staging primero (`localhost:3001`)
- Usar tenant de prueba (NO producción)
- Validar con MCP tools antes de commits

---

**Última actualización:** 2025-11-09
**Próximo paso:** Crear TODO.md con tareas específicas por fase
