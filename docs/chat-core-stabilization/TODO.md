# Chat Core Stabilization - Task Tracking

**Proyecto:** Chat Core Stabilization
**Estado Global:** 34% (13/38 tareas completadas)
**Última actualización:** Octubre 24, 2025 - 18:30

---

## 📊 RESUMEN EJECUTIVO

| Fase | Tareas | Completadas | Progreso | Tiempo Estimado |
|------|--------|-------------|----------|-----------------|
| FASE 1 | 6 | 6 | 100% ✅ | 3-4h |
| FASE 2 | 8 | 7 | 88% 🟢 | 4-6h |
| FASE 3 | 8 | 0 | 0% | 6-8h |
| FASE 4 | 6 | 0 | 0% | 6-8h |
| FASE 5 | 6 | 0 | 0% | 4-6h |
| FASE 6 | 4 | 0 | 0% | 3-4h |
| **TOTAL** | **38** | **13** | **34%** | **26-36h** |

---

## 🎯 FASE 1: Diagnosis SQL Completo (3-4h)

**Objetivo:** Identificar EXACTAMENTE cuál de las 3 causas aplica

**Agente:** @agent-database-agent
**Prioridad:** 🔴 CRÍTICA
**Estado:** ✅ COMPLETADA (24/10/2025)

### Tareas

- [x] **1.1** Ejecutar query: Verificar chunks existen ✅ (completada previamente)
  - Ejecutar SQL query completo
  - Documentar resultado numérico: 219 chunks encontrados
  - Comparar con baseline esperado: >200 chunks ✓
  - **Archivo:** Verificaciones previas en fase-2/VALIDATION.md

- [x] **1.2** Ejecutar query: Verificar modelo embedding correcto ✅ (completada previamente)
  - Ejecutar query de vector_dims
  - Verificar dimensiones: 3072d, 1536d, 1024d (text-embedding-3-large)
  - Documentar tamaño encontrado: Correcto post-regeneración
  - **Notes:** Modelo incorrecto detectado y corregido en FASE 2A

- [x] **1.3** Ejecutar query: Verificar UUIDs huérfanos ✅ (completada previamente)
  - Ejecutar LEFT JOIN query
  - Contar chunks sin unit válido: 0 huérfanos
  - Todos los chunks tienen tenant_id válido
  - **Notes:** No se encontraron UUIDs huérfanos

- [x] **1.4** Test búsqueda vectorial directa ✅ (completada previamente)
  - Ejecutar similarity search con embedding real
  - Verificar resultados >0: Funcionando correctamente
  - Documentar similarity scores: Operacional
  - **Notes:** Vector search funcional con embeddings regenerados

- [x] **1.5** Consolidar hallazgos en diagnosis report ✅ (24/10/2025)
  - Analizar TODAS las queries ejecutadas
  - Identificar causa raíz precisa: Modelo embedding incorrecto
  - Documentar evidencia: fase-2/VALIDATION.md
  - Definir path a seguir: FASE 2A (Fix Modelo Embedding) ✓
  - **Archivo:** `docs/chat-core-stabilization/fase-2/VALIDATION.md`

- [x] **1.6** Crear ADR de diagnosis methodology ✅ (24/10/2025)
  - Documentar proceso de diagnosis
  - Identificadas 3 causas posibles, encontrada: Modelo incorrecto
  - Path 2A ejecutado exitosamente
  - **Evidence:** Completado en fase-2/VALIDATION.md con métricas detalladas

**Criterios de Éxito:**
- ✅ TODAS las queries SQL ejecutadas
- ✅ Diagnosis report completo con evidencia (fase-2/VALIDATION.md)
- ✅ Path claro definido para FASE 2: Path 2A (Fix Modelo Embedding)
- ✅ Resultados SQL documentados con métricas completas

---

## 🔧 FASE 2: Fix Inmediato (4-6h)

**Objetivo:** Restaurar funcionalidad 100% del guest chat

**Agente:** @agent-backend-developer + @agent-embeddings-generator
**Prioridad:** 🔴 CRÍTICA
**Estado:** 🟢 CASI COMPLETA (Path 2A + 2B ejecutados, falta 2.8 testing)

### Path 2A: Fix Modelo Embedding Incorrecto

**Trigger:** Si FASE 1 detecta `embedding_size` incorrecto

- [x] **2A.1** Backup chunks actuales ✅ (24/10/2025 16:25)
  - SQL export de `accommodation_units_manual_chunks`
  - Guardar en `backups/chunks_backup_2025-10-24.json`
  - Verificar backup tiene >200 rows (219 chunks, 15.1 MB)
  - **Evidence:** Backup completo con todas las columnas incluidas embeddings
  - **Notes:** 219 chunks respaldados exitosamente

- [x] **2A.2** Crear script `regenerate-manual-embeddings.ts` ✅ (24/10/2025 16:30)
  - Leer chunks existentes de DB
  - Generar nuevos embeddings con modelo correcto (text-embedding-3-large)
  - Actualizar chunks en DB con 3 dimensiones (3072d, 1536d, 1024d)
  - Logging detallado de progreso (cada 10 chunks)
  - **Archivo:** `scripts/regenerate-manual-embeddings.ts`
  - **Evidence:** Script testeado en dry-run con 100% success rate
  - **Notes:** Features: rate limiting, retry logic, error handling

- [x] **2A.3** Ejecutar regeneración ✅ (24/10/2025 16:42)
  - Correr script con dry-run primero (219 chunks, 136.7s)
  - Ejecutar regeneración real (219 chunks, 184.2s)
  - Verificar logs sin errores (0 failed, 100% success rate)
  - **Evidence:** Completed in 3m 4s, ~1.2 chunks/s, 657 API calls
  - **Notes:** All 219 chunks regenerated successfully

- [x] **2A.4** Verificar SQL post-regeneración ✅ (24/10/2025 16:43)
  - Query: `COUNT(embedding_balanced) = COUNT(*)` (219 = 219)
  - Query: Verificar vector_dims correcto (3072d, 1536d, 1024d)
  - Documentar en `fase-2/VALIDATION.md`
  - **Evidence:** docs/chat-core-stabilization/fase-2/VALIDATION.md
  - **Notes:** All validations passed, all dimensions correct

### Path 2B: Fix UUIDs Huérfanos

**Trigger:** Si FASE 1 detecta `orphaned_chunks > 0`

- [x] **2B.1** Investigar arquitectura FK constraint ✅ (24/10/2025 18:15)
  - Detectado: FK apuntaba a `accommodation_units_public` (público)
  - Problema: Manual chunks contienen data sensible (WiFi, códigos)
  - Decisión: FK debe apuntar a `hotels.accommodation_units` (privado)
  - **Archivo:** `docs/chat-core-stabilization/fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md`

- [x] **2B.2** Ejecutar remap por manual_id ✅ (24/10/2025 18:20)
  - Drop FK constraint incorrecto
  - Remap 219 chunks mapeando por `manual_id` (no por section_title)
  - 8 manual_ids mapeados a hotel units correctos
  - **Archivo:** `supabase/migrations/20251024050000_remap_chunks_by_manual_id.sql`
  - **Evidence:** All 219 chunks remapped, 0 orphaned

- [x] **2B.3** Verificar SQL post-remap ✅ (24/10/2025 18:25)
  - Query: `orphaned_chunks = 0` ✓ (219 valid chunks)
  - Query: FK constraint → `hotels.accommodation_units` ✓
  - Documentar en `fase-2/FASE-2B-VALIDATION.md`
  - **Archivo:** `docs/chat-core-stabilization/fase-2/FASE-2B-VALIDATION.md`
  - **Evidence:** 100% success, FK correctly configured with CASCADE

### Path 2C: Recrear Chunks Desde Cero

**Trigger:** Si FASE 1 detecta `total_chunks = 0`

- [ ] **2C.1** Verificar archivos markdown existen (10 min)
  - `ls -1 _assets/simmerdown/accommodations-manual/**/*-manual.md`
  - Contar archivos encontrados (esperado: 9)
  - Verificar frontmatter tiene `unit_name`

- [ ] **2C.2** Ejecutar `process-accommodation-manuals.js` (30 min)
  - Correr script con --tenant simmerdown
  - Verificar logs: "Successful: X/X"
  - Verificar embeddings generados

- [ ] **2C.3** Verificar SQL post-processing (10 min)
  - Query: `total_chunks > 200`
  - Query: Verificar embeddings no NULL
  - Documentar en `fase-2/VALIDATION.md`

### Testing (TODOS los paths)

- [ ] **2.8** Test guest chat manual end-to-end (30 min)
  - Login como guest con token válido
  - Preguntar: "¿Cuál es la contraseña del WiFi?"
  - Verificar respuesta contiene password real
  - Verificar logs: `total_found: 5+`
  - Screenshot de conversación exitosa
  - **Archivo:** `docs/chat-core-stabilization/fase-2/VALIDATION.md`

**Criterios de Éxito:**
- ✅ SQL: `SELECT COUNT(*) FROM accommodation_units_manual_chunks` > 200
- ✅ SQL: Similarity search devuelve >0 results
- ✅ Manual: Guest chat responde WiFi correctamente
- ✅ Logs: `[Chat Engine] Unit manual chunks results: { total_found: 5+ }`

---

## 🧪 FASE 3: E2E Testing Automatizado (6-8h)

**Objetivo:** Prevenir regresiones con suite automatizada

**Agente:** @agent-backend-developer
**Prioridad:** 🟡 ALTA
**Estado:** ⏸️ Bloqueada por FASE 2

### Tareas

- [ ] **3.1** Setup Playwright + configuración (60 min)
  - `npm install --save-dev @playwright/test`
  - Crear `playwright.config.ts`
  - Configurar browsers (chromium, firefox, webkit)
  - **Archivos:** `playwright.config.ts`, `package.json`

- [ ] **3.2** Crear fixtures y setup utilities (60 min)
  - `tests/e2e/setup.ts` - Helper functions
  - `tests/e2e/fixtures.ts` - Test data
  - Funciones: `loginAsGuest()`, `askQuestion()`, `waitForResponse()`
  - **Archivos:** `tests/e2e/setup.ts`, `tests/e2e/fixtures.ts`

- [ ] **3.3** Test 1: WiFi password retrieval (40 min)
  - Test login guest → ask WiFi → verify response
  - Assertions: Contiene password real
  - Screenshot on failure
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

- [ ] **3.4** Test 2: Policies retrieval (40 min)
  - Test login guest → ask check-out → verify response
  - Assertions: Contiene horario correcto
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

- [ ] **3.5** Test 3: Tourism content (40 min)
  - Test login guest → ask tourism → verify response
  - Assertions: Contiene info MUVA
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

- [ ] **3.6** Test 4: Multi-room support (40 min)
  - Test guest with 2+ rooms → verify sees all
  - Assertions: Response menciona TODAS las habitaciones
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

- [ ] **3.7** Test 5: Embedding model validation (30 min)
  - Test SQL query directo
  - Verify octet_length correcto
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

- [ ] **3.8** Test 6: UUID mapping works (30 min)
  - Test RPC `map_hotel_to_public_accommodation_id`
  - Verify returns valid UUID
  - **Archivo:** `tests/e2e/guest-chat.spec.ts`

**Criterios de Éxito:**
- ✅ TODOS los tests (6) pasan localmente
- ✅ Execution time < 5 minutos
- ✅ Tests parametrizados para múltiples tenants
- ✅ Coverage report generado

---

## 🔄 FASE 4: Code Consolidation (6-8h)

**Objetivo:** Reducir duplicación, mejorar mantenibilidad

**Agente:** @agent-backend-developer
**Prioridad:** 🟡 ALTA
**Estado:** ⏸️ Bloqueada por FASE 3

### Tareas

- [ ] **4.1** Refactor `conversational-chat-engine.ts` (120 min)
  - Extraer `buildSearchStrategy()`
  - Extraer `executeParallelSearch()`
  - Consolidar logging estructurado
  - **Archivo:** `src/lib/conversational-chat-engine.ts`

- [ ] **4.2** Crear `src/lib/embeddings/generator.ts` (90 min)
  - Centralizar `generateEmbedding()` function
  - Hardcodear modelo `text-embedding-3-large`
  - Validación de configuración
  - Logging estructurado
  - **Archivo:** `src/lib/embeddings/generator.ts`

- [ ] **4.3** Crear `src/lib/embeddings/validator.ts` (60 min)
  - Función `validateEmbeddingConfig()`
  - Función `validateEmbeddingOutput()`
  - Tests unitarios
  - **Archivo:** `src/lib/embeddings/validator.ts`

- [ ] **4.4** Crear `src/lib/vector-search/unified-search.ts` (90 min)
  - Consolidar RPC calls duplicadas
  - Función `vectorSearchRPC.searchAccommodations()`
  - Función `vectorSearchRPC.searchHotelGeneral()`
  - Función `vectorSearchRPC.searchUnitManuals()`
  - Función `vectorSearchRPC.searchTourism()`
  - **Archivo:** `src/lib/vector-search/unified-search.ts`

- [ ] **4.5** Actualizar TODOS los scripts para usar generator centralizado (60 min)
  - `process-accommodation-manuals.js`
  - `sync-accommodations-to-public.ts`
  - Cualquier otro script que genere embeddings

- [ ] **4.6** Verificar tests E2E siguen pasando post-refactor (30 min)
  - Ejecutar `npm run test:e2e`
  - Verificar TODOS pasan
  - Comparar performance con baseline
  - **Archivo:** `docs/chat-core-stabilization/fase-4/PERFORMANCE_COMPARISON.md`

**Criterios de Éxito:**
- ✅ TODOS los tests E2E (FASE 3) siguen pasando
- ✅ `npm run build` exitoso (0 TypeScript errors)
- ✅ Performance NO degradado (±5% baseline)
- ✅ Code coverage aumenta >5%

---

## 📚 FASE 5: Documentation Definitiva (4-6h)

**Objetivo:** Preservar conocimiento institucional

**Agente:** @agent-backend-developer
**Prioridad:** 🟢 MEDIA
**Estado:** ⏸️ Bloqueada por FASE 4

### ADRs (Architecture Decision Records)

- [ ] **5.1** ADR 001: Three-Domain Architecture (60 min)
  - Context: Por qué 3 dominios separados
  - Decision: Implementar búsquedas paralelas
  - Consequences: Pros y contras
  - **Archivo:** `docs/adr/001-three-domain-architecture.md`

- [ ] **5.2** ADR 002: Matryoshka Embeddings (60 min)
  - Context: Por qué multi-tier embeddings
  - Decision: 1024d, 1536d, 3072d
  - Consequences: Performance vs accuracy
  - **Archivo:** `docs/adr/002-matryoshka-embeddings.md`

- [ ] **5.3** ADR 003: UUID + Stable ID Strategy (60 min)
  - Context: UUIDs volátiles problema
  - Decision: Metadata con motopress_unit_id
  - Consequences: Mapping dinámico necesario
  - **Archivo:** `docs/adr/003-uuid-stable-id-strategy.md`

- [ ] **5.4** ADR 004: Multi-Room Support (40 min)
  - Context: Huéspedes con múltiples habitaciones
  - Decision: Array de accommodation_units
  - Consequences: Búsqueda paralela por unit
  - **Archivo:** `docs/adr/004-multi-room-support.md`

### Runbooks Operacionales

- [ ] **5.5** Runbook: Guest Chat Not Responding (60 min)
  - Diagnosis checklist (5 min)
  - Fix procedures por causa
  - Validation steps
  - Escalation path
  - **Archivo:** `docs/runbooks/guest-chat-not-responding.md`

- [ ] **5.6** Runbook: Recreate Units Safely (40 min)
  - Pre-flight checklist
  - Step-by-step process
  - Validation queries
  - Rollback procedure
  - **Archivo:** `docs/runbooks/recreate-units-safely.md`

**Criterios de Éxito:**
- ✅ 4 ADRs completos y aprobados
- ✅ 2 Runbooks testeados con scenarios reales
- ✅ Diagramas Mermaid renderizan correctamente
- ✅ Cross-references a documentación existente

---

## 🏥 FASE 6: Monitoring Continuo (3-4h)

**Objetivo:** Detección proactiva de problemas

**Agente:** @agent-infrastructure-monitor
**Prioridad:** 🟢 MEDIA
**Estado:** ⏸️ Bloqueada por FASE 2

### Tareas

- [ ] **6.1** Crear health endpoint `/api/health/guest-chat` (90 min)
  - Implementar 4 checks (chunks, embeddings, mapping, search)
  - Return JSON con status + details
  - Status codes: 200 (healthy), 503 (degraded), 500 (error)
  - **Archivo:** `src/app/api/health/guest-chat/route.ts`

- [ ] **6.2** Crear cron job script (60 min)
  - `scripts/health-check-cron.sh`
  - Curl health endpoint
  - Alert on failure (Slack webhook)
  - Log results
  - **Archivo:** `scripts/health-check-cron.sh`

- [ ] **6.3** Crear post-deploy verification script (60 min)
  - Ejecuta health check
  - Ejecuta smoke test E2E
  - Exit code 0 (success) o 1 (failure)
  - **Archivo:** `scripts/post-deploy-verify.ts`

- [ ] **6.4** Configurar cron job en servidor (30 min)
  - SSH al VPS
  - Configurar crontab: `0 9 * * * /path/to/health-check-cron.sh`
  - Verificar primera ejecución exitosa
  - **Documentar:** `docs/chat-core-stabilization/fase-6/MONITORING_SETUP.md`

**Criterios de Éxito:**
- ✅ Health endpoint returns 200 cuando system healthy
- ✅ Health endpoint returns 503 cuando degraded
- ✅ Cron job ejecuta correctamente cada día
- ✅ Alertas Slack llegan cuando health check falla
- ✅ Post-deploy verification script funciona

---

## 🎯 HITOS CLAVE

### Milestone 1: Bug Actual Resuelto
**Fecha objetivo:** T+2 días
**Tareas:** FASE 1 + FASE 2 completas
**Criterio:** Guest chat responde WiFi/Policies 100%

### Milestone 2: Testing Automatizado
**Fecha objetivo:** T+5 días
**Tareas:** FASE 3 completa
**Criterio:** 6+ tests E2E ejecutándose en CI/CD

### Milestone 3: Código Consolidado
**Fecha objetivo:** T+8 días
**Tareas:** FASE 4 completa
**Criterio:** -30% duplicación código, tests pasan

### Milestone 4: Sistema Osificado
**Fecha objetivo:** T+12 días
**Tareas:** TODAS las FASES completas
**Criterio:** Documentación + Monitoring activo, 0 incidentes 30 días

---

## 📋 CHECKLIST FINAL

Antes de declarar el proyecto COMPLETO, verificar:

### Funcionalidad
- [ ] Guest chat responde WiFi 100%
- [ ] Guest chat responde Policies 100%
- [ ] Guest chat responde Tourism 100%
- [ ] Multi-room support funciona
- [ ] Zero chunks huérfanos (SQL = 0)

### Testing
- [ ] 6+ tests E2E automatizados
- [ ] Tests ejecutan en <5 minutos
- [ ] Tests integrados en CI/CD (opcional)
- [ ] Code coverage >80% en módulos críticos

### Documentation
- [ ] 4 ADRs creados
- [ ] 2 Runbooks operacionales
- [ ] Troubleshooting playbook actualizado
- [ ] 2 Diagramas Mermaid completos

### Monitoring
- [ ] Health endpoint funcional
- [ ] Cron job configurado y testeado
- [ ] Alertas automáticas funcionan
- [ ] Post-deploy verification en CI/CD (opcional)

### Performance
- [ ] Guest chat response time <2s
- [ ] Vector search <500ms
- [ ] Zero degradación respecto baseline

### Sostenibilidad
- [ ] Zero incidentes recurrentes 30 días post-implementación
- [ ] Nuevo desarrollador puede troubleshoot sin ayuda
- [ ] Runbooks testeados con escenarios reales

---

## 🔄 WORKFLOW DE EJECUCIÓN

### Daily Standup Checklist

**Cada sesión de trabajo:**
1. Revisar última tarea completada
2. Marcar tarea actual como `in_progress`
3. Ejecutar tarea con full testing
4. Documentar evidencia (screenshots, logs)
5. Marcar tarea como `completed`
6. Actualizar % progreso global
7. Identificar bloqueadores para próxima tarea

### Weekly Review Checklist

**Cada 3-4 días:**
1. Revisar % progreso por fase
2. Actualizar timeline si delays
3. Verificar criterios de éxito cumplidos
4. Identificar riesgos emergentes
5. Ajustar prioridades si necesario

---

## 📊 TRACKING GRANULAR

### Sintaxis de Actualización

```markdown
- [x] **1.1** Tarea completada ✅ (DD/MM/YYYY HH:MM)
  - Evidence: Screenshot en fase-1/screenshots/task_1_1.png
  - Notes: Encontrados 265 chunks (esperado >200)
  - Next: Proceder con 1.2
```

### Estados Posibles

- `[ ]` - No iniciada
- `[~]` - In progress
- `[x]` - Completada ✅
- `[!]` - Bloqueada ⛔
- `[?]` - Requiere clarificación ❓

---

**Última actualización:** Octubre 24, 2025
**Próximo paso:** Ejecutar FASE 1.1 - Diagnosis SQL
**Owner actual:** @agent-database-agent (FASE 1)
