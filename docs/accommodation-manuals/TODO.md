# TODO - Sistema de Manuales de Alojamiento

**Proyecto:** Accommodation Manuals Upload & Embeddings
**Fecha:** 2025-11-09
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0: Análisis y Diseño Técnico 🎯

### 0.1 Análisis de conflicto de rutas (Error 5) ✅
- [x] Investigar estructura de rutas en `/api/accommodation/` (estimate: 0.5h)
  - Leer archivos existentes en `src/app/api/accommodation/`
  - Analizar cómo Next.js 15 resuelve rutas dinámicas vs estáticas
  - Documentar conflicto específico
  - Files: `src/app/api/accommodation/**/*.ts`
  - Agent: **@agent-backend-developer**
  - Test: `ls -R src/app/api/accommodation/`
  - Output: `docs/accommodation-manuals/fase-0/ROUTE_CONFLICT_ANALYSIS.md` ✅

### 0.2 Diseño de nueva estructura de rutas ✅
- [x] Proponer y validar nueva estructura de API (estimate: 0.5h)
  - Opción A: `/api/accommodation-manuals/[unitId]` ✅ ELEGIDA
  - Opción B: `/api/units/[unitId]/manuals` ✅ Validada pero NO elegida
  - Crear rutas de prueba ✅
  - Validar que no hay 404 ✅
  - Files: `src/app/api/accommodation-manuals/[unitId]/route.ts` (test)
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3001/api/accommodation-manuals/test-id` ✅
  - Expected: JSON response (NO HTML 404) ✅

### 0.3 Análisis de chunking strategy
- [ ] Documentar estrategia de chunking basada en script existente (estimate: 0.5h)
  - Leer `scripts/regenerate-manual-embeddings.ts`
  - Identificar lógica de split (headers, tamaño, etc.)
  - Diseñar función `chunkMarkdown(content: string)`
  - Especificar metadata por chunk
  - Files: `scripts/regenerate-manual-embeddings.ts`
  - Agent: **@agent-backend-developer**
  - Test: Unit test con markdown de prueba
  - Output: `docs/accommodation-manuals/fase-0/CHUNKING_STRATEGY.md`

### 0.4 Verificación de estructura de base de datos
- [ ] Validar tablas y columnas existentes (estimate: 0.25h)
  - Usar MCP tool para listar columnas de `accommodation_manuals`
  - Usar MCP tool para listar columnas de `accommodation_units_manual_chunks`
  - Verificar que estructura es correcta para el plan
  - Files: N/A (MCP tools)
  - Agent: **@agent-backend-developer**
  - Test: `mcp__supabase__execute_sql` con queries DESCRIBE
  - Output: Confirmación de estructura en documentación FASE 0

### 0.5 Documentación de arquitectura FASE 0
- [ ] Crear documentación completa de diseño (estimate: 0.25h)
  - Compilar hallazgos de 0.1, 0.2, 0.3, 0.4
  - Crear diagrama de flujo (texto)
  - Especificar contratos de API
  - Files: `docs/accommodation-manuals/fase-0/IMPLEMENTATION.md`
  - Agent: **@agent-backend-developer**
  - Test: Revisión de documentación
  - Output: IMPLEMENTATION.md completo

---

## FASE 1: Backend - API Endpoints y Procesamiento ⚙️

### 1.1 Crear biblioteca de procesamiento de markdown
- [ ] Implementar `src/lib/manual-processing.ts` (estimate: 1h)
  - Función `processMarkdown(buffer: Buffer, filename: string)`
  - Chunking según estrategia documentada en FASE 0
  - Extracción de metadata (section_title, chunk_index)
  - Return type: `ProcessedManual` con array de chunks
  - Files: `src/lib/manual-processing.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/manual-processing.test.ts`

### 1.2 Crear unit tests para procesamiento
- [ ] Implementar tests de `manual-processing.ts` (estimate: 0.5h)
  - Test chunking básico (1 chunk)
  - Test chunking múltiple (headers markdown)
  - Test archivo vacío (error handling)
  - Test archivo grande (> 1MB)
  - Files: `src/lib/manual-processing.test.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/manual-processing.test.ts --coverage`

### 1.3 API Endpoint: POST /upload
- [ ] Crear endpoint de upload de manuales (estimate: 1h)
  - Path: `src/app/api/accommodation-manuals/[unitId]/route.ts`
  - Method: POST
  - Accept: multipart/form-data
  - Validar tenant ownership
  - Validar formato (.md) y tamaño (10MB)
  - Procesar markdown con `manual-processing.ts`
  - Generar embeddings Matryoshka
  - Insertar en `accommodation_units_manual_chunks`
  - Crear registro en `accommodation_manuals`
  - Files: `src/app/api/accommodation-manuals/[unitId]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST http://localhost:3001/api/accommodation-manuals/{unitId} -F "file=@test.md"`

### 1.4 API Endpoint: GET /list
- [ ] Crear endpoint de listado de manuales (estimate: 0.5h)
  - Path: `src/app/api/accommodation-manuals/[unitId]/route.ts`
  - Method: GET
  - Filtrar por `accommodation_unit_id` y `tenant_id`
  - Retornar: id, filename, file_type, chunk_count, status, processed_at
  - Files: `src/app/api/accommodation-manuals/[unitId]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3001/api/accommodation-manuals/{unitId}`

### 1.5 API Endpoint: DELETE /manual
- [ ] Crear endpoint de eliminación de manual (estimate: 0.5h)
  - Path: `src/app/api/accommodation-manuals/[unitId]/[manualId]/route.ts`
  - Method: DELETE
  - Validar tenant ownership
  - Eliminar chunks en `accommodation_units_manual_chunks`
  - Eliminar registro en `accommodation_manuals`
  - Files: `src/app/api/accommodation-manuals/[unitId]/[manualId]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X DELETE http://localhost:3001/api/accommodation-manuals/{unitId}/{manualId}`

### 1.6 API Endpoint: GET /chunks
- [ ] Crear endpoint de visualización de chunks (estimate: 0.5h)
  - Path: `src/app/api/accommodation-manuals/[manualId]/chunks/route.ts`
  - Method: GET
  - Filtrar por `manual_id` y `tenant_id`
  - Retornar chunks ordenados por `chunk_index`
  - NO incluir embeddings (performance)
  - Files: `src/app/api/accommodation-manuals/[manualId]/chunks/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3001/api/accommodation-manuals/{manualId}/chunks`

### 1.7 Validación de rutas con curl
- [ ] Ejecutar suite de tests de API (estimate: 0.25h)
  - Test upload (POST con archivo real)
  - Test listado (GET debe retornar el manual subido)
  - Test chunks (GET debe retornar chunks del manual)
  - Test delete (DELETE debe eliminar manual)
  - Verificar NO 404 en ninguna ruta
  - Agent: **@agent-backend-developer**
  - Test: Bash script con 5 curl commands
  - Output: `docs/accommodation-manuals/fase-1/TESTS.md`

### 1.8 Documentación FASE 1
- [ ] Crear documentación de implementación (estimate: 0.25h)
  - IMPLEMENTATION.md: Qué se implementó
  - CHANGES.md: Archivos creados
  - TESTS.md: Resultados de tests
  - Agent: **@agent-backend-developer**
  - Files: `docs/accommodation-manuals/fase-1/{IMPLEMENTATION,CHANGES,TESTS}.md`

---

## FASE 2: Database - RLS Policies e Índices 🛡️

### 2.1 Crear migration de RLS policies
- [ ] Implementar RLS policies para multi-tenant (estimate: 0.5h)
  - Crear archivo `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_rls.sql`
  - Policies para `accommodation_manuals` (SELECT, INSERT, DELETE)
  - Policies para `accommodation_units_manual_chunks` (SELECT, INSERT, DELETE)
  - Basado en `tenant_id = auth.jwt() -> 'tenant_id'`
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_rls.sql`
  - Agent: **@agent-database-agent**
  - Test: Aplicar migration con `execute-ddl-via-api.ts`

### 2.2 Crear migration de índices
- [ ] Implementar índices optimizados (estimate: 0.25h)
  - Crear archivo `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_indexes.sql`
  - Índice: `idx_accommodation_manuals_unit_tenant`
  - Índice: `idx_manual_chunks_unit_tenant`
  - Índice: `idx_manual_chunks_manual_index`
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_accommodation_manuals_indexes.sql`
  - Agent: **@agent-database-agent**
  - Test: Aplicar migration con `execute-ddl-via-api.ts`

### 2.3 Validar RLS policies en staging
- [ ] Probar multi-tenant isolation (estimate: 0.25h)
  - Subir manual en tenant A
  - Intentar acceder desde tenant B (debe fallar)
  - Verificar que RLS bloquea acceso
  - Agent: **@agent-database-agent**
  - Test: Curl con diferentes tenant headers
  - Output: Resultados en `docs/accommodation-manuals/fase-2/TESTS.md`

### 2.4 Validar performance de índices
- [ ] Analizar query plans con EXPLAIN (estimate: 0.25h)
  - Query de listado de manuales
  - Query de chunks por accommodation_unit_id
  - Verificar que usa índices (NO seq scan)
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` con EXPLAIN ANALYZE
  - Output: Query plans en `docs/accommodation-manuals/fase-2/TESTS.md`

### 2.5 Documentación FASE 2
- [ ] Crear documentación de migrations (estimate: 0.25h)
  - IMPLEMENTATION.md: Policies e índices creados
  - CHANGES.md: Migrations aplicadas
  - TESTS.md: Resultados de validación
  - Agent: **@agent-database-agent**
  - Files: `docs/accommodation-manuals/fase-2/{IMPLEMENTATION,CHANGES,TESTS}.md`

---

## FASE 3: Frontend - Componentes UI 🎨

### 3.1 Crear componente AccommodationManualsSection
- [ ] Implementar sección de manuales en tarjeta (estimate: 1.5h)
  - Componente: `src/components/Accommodation/AccommodationManualsSection.tsx`
  - Props: `unitId`, `tenantId`, `onViewContent`
  - Estados: Empty, Uploading, List
  - Integrar `react-dropzone` para drag & drop
  - Validación client-side (formato, tamaño)
  - Upload con fetch API a POST endpoint
  - Listado de manuales con chunk count
  - Botones: Ver, Eliminar (con confirmación)
  - Files: `src/components/Accommodation/AccommodationManualsSection.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Visual test en `http://localhost:3001/accommodations/units`

### 3.2 Crear componente ManualContentModal
- [ ] Implementar modal de visualización de chunks (estimate: 1h)
  - Componente: `src/components/Accommodation/ManualContentModal.tsx`
  - Props: `manualId`, `onClose`
  - Fetch chunks desde GET endpoint
  - Accordion con `@headlessui/react`
  - Renderizar markdown con `react-markdown`
  - Botones: Expand all, Collapse all
  - Focus trap y keyboard navigation
  - Files: `src/components/Accommodation/ManualContentModal.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Visual test al hacer click en "Ver"

### 3.3 Modificar AccommodationUnitsGrid
- [ ] Reemplazar Stats Summary con AccommodationManualsSection (estimate: 0.5h)
  - File: `src/components/Accommodation/AccommodationUnitsGrid.tsx`
  - Eliminar líneas 545-560 (Stats Summary)
  - Agregar `<AccommodationManualsSection />`
  - Agregar state: `const [manualModalId, setManualModalId] = useState<string | null>(null)`
  - Agregar `<ManualContentModal />` al final
  - Files: `src/components/Accommodation/AccommodationUnitsGrid.tsx`
  - Agent: **@agent-ux-interface**
  - Test: `pnpm run build` (no TypeScript errors)

### 3.4 Testing visual completo
- [ ] Validar UI en diferentes estados (estimate: 0.5h)
  - Empty state: Dropzone vacía se ve correcta
  - Uploading state: Progress bar funciona
  - List state: Manuales se listan correctamente
  - Modal state: Chunks se visualizan bien
  - Error states: Mensajes de error claros
  - Responsive: Mobile y desktop
  - Agent: **@agent-ux-interface**
  - Test: Checklist manual en navegador
  - Output: Screenshots en `docs/accommodation-manuals/fase-3/`

### 3.5 Documentación FASE 3
- [ ] Crear documentación de componentes (estimate: 0.25h)
  - IMPLEMENTATION.md: Componentes creados
  - CHANGES.md: Archivos modificados
  - TESTS.md: Resultados de testing visual
  - Agent: **@agent-ux-interface**
  - Files: `docs/accommodation-manuals/fase-3/{IMPLEMENTATION,CHANGES,TESTS}.md`

---

## FASE 4: Integración y Testing End-to-End ✅

### 4.1 Test end-to-end: Upload completo
- [ ] Validar flujo completo de upload (estimate: 0.5h)
  - Crear archivo test `/tmp/test-manual.md`
  - Subir via UI drag & drop
  - Verificar en DB con MCP tool
  - Validar embeddings generados (3 dimensiones)
  - Validar chunk_count correcto
  - Agent: **@agent-backend-developer**
  - Test: Script bash + MCP queries
  - Output: `docs/accommodation-manuals/fase-4/TEST_CASES.md`

### 4.2 Test end-to-end: Guest chat integration
- [ ] Validar que guest chat usa manuales (estimate: 0.5h)
  - Crear reserva test con accommodation_unit_id
  - Subir manual con información específica (ej: "Jacuzzi azul")
  - Navegar a `/my-stay`
  - Preguntar al chat sobre esa información
  - Verificar que respuesta incluye contenido del manual
  - Agent: **@agent-backend-developer**
  - Test: Manual test + logs de RPC function
  - Output: `docs/accommodation-manuals/fase-4/INTEGRATION_RESULTS.md`

### 4.3 Test end-to-end: Multi-tenant isolation
- [ ] Validar RLS policies en acción (estimate: 0.25h)
  - Subir manual en tenant A
  - Intentar acceder desde tenant B via API
  - Verificar 403 Forbidden
  - Verificar que UI no muestra manuales de otros tenants
  - Agent: **@agent-backend-developer**
  - Test: Curl con diferentes tenant_id headers
  - Output: Resultados en `TEST_CASES.md`

### 4.4 Test de performance
- [ ] Medir tiempos de respuesta (estimate: 0.25h)
  - Upload de archivo 1MB: < 3s
  - Listado de manuales: < 200ms
  - Visualización de chunks: < 500ms
  - Guest chat (con manual): similar a sin manual
  - Agent: **@agent-backend-developer**
  - Test: `time curl ...` para cada endpoint
  - Output: Tabla de performance en `INTEGRATION_RESULTS.md`

### 4.5 Identificar y documentar issues
- [ ] Crear lista de problemas encontrados (estimate: 0.25h)
  - Bugs encontrados durante testing
  - Limitaciones identificadas
  - Mejoras futuras
  - Agent: **@agent-backend-developer**
  - Files: `docs/accommodation-manuals/fase-4/ISSUES.md`

### 4.6 Documentación FASE 4
- [ ] Compilar resultados de testing (estimate: 0.25h)
  - TEST_CASES.md: Casos de prueba ejecutados
  - INTEGRATION_RESULTS.md: Resultados y performance
  - ISSUES.md: Problemas y soluciones
  - Agent: **@agent-backend-developer**
  - Files: `docs/accommodation-manuals/fase-4/{TEST_CASES,INTEGRATION_RESULTS,ISSUES}.md`

---

## FASE 5: Optimización y Documentación 🚀

### 5.1 Optimización de performance
- [ ] Implementar mejoras de velocidad (estimate: 0.5h)
  - Batch embeddings (3 dimensiones en paralelo) - YA IMPLEMENTADO
  - Rate limiting en frontend (no spam uploads)
  - Lazy loading de chunks en modal
  - Cache de listado (1 min)
  - Agent: **@agent-ux-interface** + **@agent-backend-developer**
  - Test: Performance test antes/después
  - Output: `docs/accommodation-manuals/fase-5/PERFORMANCE_REPORT.md`

### 5.2 Crear documentación técnica completa
- [ ] Escribir docs de arquitectura y API (estimate: 0.5h)
  - ARCHITECTURE.md: Diagrama, flujos, decisiones técnicas
  - API_REFERENCE.md: Contratos de cada endpoint
  - TROUBLESHOOTING.md: Errores comunes y soluciones
  - Files: `docs/accommodation-manuals/{ARCHITECTURE,API_REFERENCE,TROUBLESHOOTING}.md`
  - Agent: **@agent-backend-developer**
  - Test: Revisión de documentación

### 5.3 Crear checklist de deployment
- [ ] Preparar lista de verificación pre-deploy (estimate: 0.25h)
  - Validar migrations aplicadas
  - Validar RLS policies activas
  - Validar performance targets
  - Validar health checks
  - Files: `docs/accommodation-manuals/DEPLOYMENT_CHECKLIST.md`
  - Agent: **@agent-deploy-agent**
  - Test: Ejecutar checklist en staging

### 5.4 Deploy a staging
- [ ] Deployar sistema completo a staging VPS (estimate: 0.5h)
  - Commit changes con mensaje descriptivo
  - Deploy a staging (195.200.6.216)
  - Validar health checks
  - Verificar RPC functions con `validate:rpc`
  - Agent: **@agent-deploy-agent**
  - Test: `./scripts/pre-deploy-check.sh staging`
  - Output: `docs/accommodation-manuals/fase-5/DEPLOYMENT_REPORT.md`

### 5.5 Validación final en staging
- [ ] Ejecutar todos los tests en staging (estimate: 0.25h)
  - Upload manual real
  - Verificar guest chat funciona
  - Verificar multi-tenant isolation
  - Verificar performance
  - Agent: **@agent-deploy-agent**
  - Test: Suite completa de FASE 4 en staging
  - Output: Resultados en `DEPLOYMENT_REPORT.md`

### 5.6 Documentación FASE 5
- [ ] Compilar documentación final (estimate: 0.25h)
  - PERFORMANCE_REPORT.md: Optimizaciones y métricas
  - DEPLOYMENT_REPORT.md: Resultados de deploy
  - Agent: **@agent-deploy-agent**
  - Files: `docs/accommodation-manuals/fase-5/{PERFORMANCE_REPORT,DEPLOYMENT_REPORT}.md`

---

## 📊 PROGRESO

**Total Tasks:** 37
**Completed:** 2/37 (5.4%)

**Por Fase:**
- FASE 0: 2/5 tareas ✅ (Análisis y Diseño) - **40% completado**
  - ✅ 0.1 Análisis de conflicto de rutas
  - ✅ 0.2 Diseño y validación de estructura de rutas
  - ⏳ 0.3 Análisis de chunking strategy (SIGUIENTE)
  - ⏳ 0.4 Verificación de base de datos
  - ⏳ 0.5 Documentación FASE 0
- FASE 1: 0/8 tareas (Backend API)
- FASE 2: 0/5 tareas (Database)
- FASE 3: 0/5 tareas (Frontend UI)
- FASE 4: 0/6 tareas (Testing E2E)
- FASE 5: 0/6 tareas (Optimización)

**Tiempo Estimado Total:** 14 horas
**Tiempo Invertido:** 1h (FASE 0.1 + 0.2)
**Tiempo Restante:** 13h

**Por Agente:**
- @agent-backend-developer: 7.5h (FASES 0, 1, 4) - **1h completado**
- @agent-database-agent: 1.5h (FASE 2)
- @agent-ux-interface: 3.75h (FASE 3, 5)
- @agent-deploy-agent: 1h (FASE 5)

**Última Sesión:** 2025-11-09
- ✅ Resuelto conflicto de rutas 404
- ✅ Validada estructura `/api/accommodation-manuals/[unitId]`
- ✅ Documentación: ROUTE_CONFLICT_ANALYSIS.md (394 líneas)

---

**Última actualización:** 2025-11-09
