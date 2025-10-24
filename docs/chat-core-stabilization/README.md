# Chat Core Stabilization - Documentation Hub

**Estado del Proyecto:** 🟢 50% Completado (FASE 1-2 ✅, FASE 3-6 ⏳)

**Última Actualización:** Octubre 24, 2025 - 22:00

---

## 📋 NAVEGACIÓN RÁPIDA

### Documentos de Planificación

- **[Plan General](./plan.md)** - Overview completo del proyecto (530 líneas)
- **[TODO Tracker](./TODO.md)** - Seguimiento de tareas por fase (360 líneas)
- **[Executive Summary](./EXECUTIVE_SUMMARY.md)** - Resumen ejecutivo de FASE 1-2 (550 líneas)

### Workflows por Fase

| Fase | Estado | Workflow | Tiempo | Agente |
|------|--------|----------|--------|--------|
| **FASE 1** | ✅ 100% | [Diagnosis SQL](./fase-1/) | ~4h | @agent-database-agent |
| **FASE 2** | ✅ 100% | [Fix Inmediato](./fase-2/) | ~6h | @agent-backend-developer |
| **FASE 3** | ⏳ 0% | [**WORKFLOW.md**](./fase-3/WORKFLOW.md) | 6-8h | @agent-backend-developer |
| **FASE 4** | ⏳ 0% | [**WORKFLOW.md**](./fase-4/WORKFLOW.md) | 6-8h | @agent-backend-developer |
| **FASE 5** | ⏳ 0% | [**WORKFLOW.md**](./fase-5/WORKFLOW.md) | 4-6h | @agent-backend-developer |
| **FASE 6** | ⏳ 0% | [**WORKFLOW.md**](./fase-6/WORKFLOW.md) | 3-4h | @agent-infrastructure-monitor |

---

## 🎯 TRABAJO COMPLETADO (FASE 1-2)

### FASE 1: Diagnosis SQL Completo ✅

**Objetivo:** Identificar causa raíz del bug (guest chat no responde manuales)

**Hallazgos Clave:**
- ✅ 219 chunks existen en DB
- ✅ Embeddings correctos (text-embedding-3-large)
- ✅ FK constraint apuntaba a tabla incorrecta
- ✅ RPC mapeaba hotel ID → public ID (incorrecto)

**Documentación:**
- [ADR-001: Manual Chunks FK Constraint](./fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md)
- [VALIDATION.md](./fase-2/VALIDATION.md)
- [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)

---

### FASE 2: Fix Inmediato ✅

**Objetivo:** Restaurar funcionalidad 100% del guest chat

**Implementación:**

1. **ADR-001: Manual Chunks FK Constraint**
   - Decisión: FK a `hotels.accommodation_units` (schema privado con RLS)
   - Justificación: WiFi passwords, door codes son información SENSIBLE
   - Migration: `20251024040000_add_fk_manual_chunks_to_hotels.sql`

2. **Fix RPC - Eliminar Mapeo Incorrecto**
   - Problema: RPC mapeaba hotel ID → public ID antes de buscar
   - Solución: Búsqueda directa con hotel ID (sin mapeo)
   - Migration: `20251024060000_fix_manual_chunks_rpc_no_mapping.sql`

**Resultados:**

| Métrica | Antes | Después |
|---------|-------|---------|
| Chunks accesibles | 0 / 219 (0%) | 219 / 219 (100%) |
| Vector search | 0 resultados | 5+ resultados |
| FK constraint | ❌ Public schema | ✅ Hotels schema (RLS) |
| RPC mapping | ❌ Hotel → Public | ✅ Direct search |

**Documentación:**
- [ADR-001 - Final Implementation](./fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md#final-implementation-october-24-2025)
- [FASE-2B Validation](./fase-2/FASE-2B-VALIDATION.md)

---

## 🚀 PRÓXIMAS FASES (PENDIENTES)

### FASE 3: E2E Testing Automatizado ⏳

**Objetivo:** Suite completa de tests con Playwright para prevenir regresiones

**Tareas:**
1. Setup Playwright + configuración (60 min)
2. Crear fixtures y setup utilities (60 min)
3. Implementar 6 tests E2E:
   - WiFi password retrieval
   - Policies retrieval
   - Tourism content
   - Multi-room support
   - Embedding validation
   - RPC functionality

**Criterios de Éxito:**
- ✅ 14+ tests pasando localmente
- ✅ Execution time < 5 minutos
- ✅ 0 tests flakey

**[→ Ver WORKFLOW completo](./fase-3/WORKFLOW.md)**

---

### FASE 4: Code Consolidation ⏳

**Objetivo:** Reducir duplicación de código en 30%

**Tareas:**
1. Refactor `conversational-chat-engine.ts` (120 min)
2. Centralizar embeddings generator (90 min)
3. Crear embeddings validator (60 min)
4. Unified vector search (90 min)
5. Actualizar scripts (60 min)
6. Verificar tests E2E post-refactor (30 min)

**Criterios de Éxito:**
- ✅ Tests E2E siguen pasando (100%)
- ✅ Duplicación: 30% → <10%
- ✅ Performance NO degradado (±5%)

**[→ Ver WORKFLOW completo](./fase-4/WORKFLOW.md)**

---

### FASE 5: Documentation Definitiva ⏳

**Objetivo:** Preservar conocimiento institucional

**ADRs a crear:**
- ADR-002: Matryoshka Embeddings (60 min)
- ADR-003: UUID + Stable ID Strategy (60 min)
- ADR-004: Multi-Room Support (40 min)

**Runbooks a crear:**
- Guest Chat Not Responding (60 min)
- Recreate Units Safely (40 min)

**Diagramas:**
- Guest Chat Flow (Mermaid) (40 min)

**Criterios de Éxito:**
- ✅ 3 ADRs completos y aprobados
- ✅ 2 Runbooks testeados
- ✅ Diagramas renderan en GitHub

**[→ Ver WORKFLOW completo](./fase-5/WORKFLOW.md)**

---

### FASE 6: Monitoring Continuo ⏳

**Objetivo:** Detección proactiva de problemas

**Componentes:**
1. Health endpoint `/api/health/guest-chat` (90 min)
2. Cron job para health checks diarios (60 min)
3. Post-deploy verification script (60 min)
4. Configurar cron en servidor (30 min)

**Criterios de Éxito:**
- ✅ Health endpoint retorna 200 cuando healthy
- ✅ Cron job ejecuta correctamente
- ✅ Alertas Slack funcionan (opcional)

**[→ Ver WORKFLOW completo](./fase-6/WORKFLOW.md)**

---

## 📊 PROGRESO GLOBAL

```
████████████░░░░░░░░░░░░ 50% (2/6 fases)

FASE 1: ████████████████████ 100% (Diagnosis SQL)
FASE 2: ████████████████████ 100% (Fix Inmediato)
FASE 3: ░░░░░░░░░░░░░░░░░░░░   0% (E2E Testing)
FASE 4: ░░░░░░░░░░░░░░░░░░░░   0% (Code Consolidation)
FASE 5: ░░░░░░░░░░░░░░░░░░░░   0% (Documentation)
FASE 6: ░░░░░░░░░░░░░░░░░░░░   0% (Monitoring)
```

**Tiempo invertido:** ~10h / 32-38h estimadas
**Tiempo restante:** 22-28h

---

## 🎯 HITOS CLAVE

### ✅ Milestone 1: Bug Actual Resuelto
**Completado:** 24/10/2025 22:00
**Criterio:** Guest chat responde WiFi/Policies 100% ✅

### Milestone 2: Testing Automatizado
**Fecha objetivo:** T+3 días (27/10/2025)
**Tareas:** FASE 3 completa

### Milestone 3: Código Consolidado
**Fecha objetivo:** T+6 días (30/10/2025)
**Tareas:** FASE 4 completa

### Milestone 4: Sistema Osificado
**Fecha objetivo:** T+10 días (03/11/2025)
**Tareas:** TODAS las FASES completas

---

## 🔧 CÓMO USAR ESTA DOCUMENTACIÓN

### Para empezar FASE 3 (siguiente paso):

```bash
cd /Users/oneill/Sites/apps/muva-chat

# Leer workflow
cat docs/chat-core-stabilization/fase-3/WORKFLOW.md

# Ejecutar comandos iniciales
npm install --save-dev @playwright/test
npx playwright install chromium

# Seguir workflow paso a paso
```

### Para consultar decisiones arquitecturales:

- **FK Constraint**: [ADR-001](./fase-2/ADR-001-MANUAL-CHUNKS-FK-CONSTRAINT.md)
- **Embeddings** (próximo): [FASE 5 - ADR-002](./fase-5/WORKFLOW.md#tarea-51-adr-002---matryoshka-embeddings-60-min)
- **Stable IDs** (próximo): [FASE 5 - ADR-003](./fase-5/WORKFLOW.md#tarea-52-adr-003---uuid--stable-id-strategy-60-min)

### Para troubleshooting:

- **Problema actual**: Consultar [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) sección "Lecciones Aprendidas"
- **Futuros problemas** (después FASE 5): Consultar Runbooks

---

## 📚 ARCHIVOS DE REFERENCIA

### Migrations Aplicadas

- `20251024040000_add_fk_manual_chunks_to_hotels.sql` - CASCADE FK constraint
- `20251024050000_remap_chunks_by_manual_id.sql` - Remap 219 chunks
- `20251024060000_fix_manual_chunks_rpc_no_mapping.sql` - RPC fix

### Scripts Creados

- `scripts/backup-chunks.ts` - Backup manual chunks
- `scripts/regenerate-manual-embeddings.ts` - Regenerar embeddings
- `scripts/remap-chunks-to-hotels-schema.ts` - Remap chunks después de recreación
- `scripts/smart-remap-manual-ids.ts` - Remap usando stable IDs
- `scripts/validate-tenant-health.ts` - Validar estado del tenant

### Código Modificado

- `src/lib/conversational-chat-engine.ts` - Chat engine principal
- `src/lib/integrations/motopress/sync-manager.ts` - Sync con MotoPress
- `src/app/api/guest/welcome/route.ts` - Guest authentication

---

## 🤝 CONTRIBUIR

### Para agregar nueva fase:

1. Crear directorio `fase-X/`
2. Crear `fase-X/WORKFLOW.md` siguiendo template existente
3. Actualizar [plan.md](./plan.md) y [TODO.md](./TODO.md)
4. Actualizar este README.md

### Para reportar problemas:

- Crear entrada en `.claude/errors.jsonl`
- Consultar Runbooks (después FASE 5)
- Escalar a system architect si necesario

---

## 📞 CONTACTO Y OWNERSHIP

- **Project Lead**: Backend Developer Agent
- **Database**: @agent-database-agent (FASE 1 ✅)
- **Backend**: @agent-backend-developer (FASE 2-5)
- **Infrastructure**: @agent-infrastructure-monitor (FASE 6)

---

**Última Actualización:** Octubre 24, 2025 - 22:00
**Estado:** Listo para FASE 3 - E2E Testing Automatizado
