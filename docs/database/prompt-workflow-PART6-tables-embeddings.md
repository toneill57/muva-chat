# PROMPT WORKFLOW - PART6: EMBEDDINGS TABLES DOCUMENTATION

**Agente:** @agent-database-agent
**Plan de Referencia:** `migration-plan/PLAN_PART6_TABLES_EMBEDDINGS.md`
**TODO:** `TODO.md` (FASE 6)
**Duración:** 2-3 horas

---

## 📋 ARCHIVOS NECESARIOS (Leer ANTES de ejecutar)

**MUST READ:**
- ✅ `migration-plan/PLAN_PART6_TABLES_EMBEDDINGS.md` (líneas 1-END) - Plan para embeddings/vector search
- ✅ `docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md` - Matryoshka strategy, semantic chunking

**NO LEER (no necesarios para esta fase):**
- ❌ `migration-plan/PLAN_PART7-9` - Fases futuras
- ❌ RLS_POLICIES.md - Se crea después

**INPUTS FROM PREVIOUS PHASES:**
- `_ROW_COUNTS.json` - code_embeddings (4,333 rows, 74 MB largest table)
- ADVISORS_ANALYSIS.md - code_embeddings security issue (NO RLS)

---

## 🎯 CONTEXTO GENERAL

```
PROYECTO: Migración de Base de Datos Producción → Staging

OBJETIVO DE ESTA FASE:
Documentar 4-5 tablas de embeddings/vector search (code_embeddings, accommodation chunks, etc.) en TABLES_EMBEDDINGS.md (~600-800 líneas).

DATABASES:
- Production: ooaumjzaztmutltifhoq (https://ooaumjzaztmutltifhoq.supabase.co)
- Staging: qlvkgniqcoisbnwwjfte (https://qlvkgniqcoisbnwwjfte.supabase.co)

ESTADO ACTUAL:
PART1-5 completados. Integrations documentadas.

CRITICAL FOCUS:
- ⚠️ code_embeddings missing RLS (security issue)
- Matryoshka embeddings (3072/1536/1024 dims)
- pgvector + IVFFlat indexes
- Semantic chunking strategy

NEXT STEPS:
Después de PART6, documentar políticas RLS (PART7: RLS Policies).
```

---

## 🚀 PROMPT COPY-PASTE (EJECUTAR AHORA)

**COPY DESDE AQUÍ:**

```
@agent-database-agent

TAREA: Documentar tablas de embeddings/vector search con focus en Matryoshka architecture y code_embeddings security issue.

CONTEXTO DEL PROYECTO:
Estoy ejecutando la migración completa de producción → staging para MUVA Chat.

**FASE ACTUAL:** PARTE 6 - Documentación de Tablas de Embeddings

ARCHIVOS CLAVE:
- Plan detallado: docs/database/migration-plan/PLAN_PART6_TABLES_EMBEDDINGS.md
- Matryoshka strategy: docs/workflows/ACCOMMODATION_SYNC_UNIVERSAL.md
- Security issue: docs/database/ADVISORS_ANALYSIS.md (code_embeddings NO RLS)
- Tareas: docs/database/TODO.md (FASE 6)

DATABASES:
- Production (source): ooaumjzaztmutltifhoq
- Staging (target): qlvkgniqcoisbnwwjfte

OBJETIVO:
Crear TABLES_EMBEDDINGS.md (~600-800 líneas) documentando:
- code_embeddings (4,333 rows, 74 MB) - ⚠️ NO RLS
- accommodation_units_manual_chunks (219 rows, semantic chunking)
- accommodation_units_manual, accommodation_units_public
- tenant_knowledge_embeddings
Con secciones especiales: pgvector, Matryoshka, vector search functions

---

INSTRUCCIONES:

1. **LEE el plan completo:**
   - Archivo: docs/database/migration-plan/PLAN_PART6_TABLES_EMBEDDINGS.md
   - Contiene: Vector-specific schemas, IVFFlat indexes, Matryoshka patterns, security remediation

2. **EJECUTA las tareas del plan:**
   - Task 6.1: Identificar embeddings tables (vector columns) (30 min)
   - Task 6.2: Verificar pgvector extension y RPC functions (30 min)
   - Task 6.3: Extraer schemas con vector dimensions (1 hora)
   - Task 6.4: Documentar vector search patterns (Matryoshka multi-stage) (45 min)
   - Task 6.5: Documentar code_embeddings security issue (15 min)
   - Task 6.6: Performance y migration notes (30 min)

3. **OUTPUTS REQUERIDOS:**
   - `docs/database/TABLES_EMBEDDINGS.md` (~600-800 líneas)
   - 4-5 tablas embeddings documentadas
   - Security issue section: code_embeddings NO RLS (prominent)
   - Matryoshka strategy explained (81% token reduction)
   - pgvector configuration (IVFFlat parameters)

4. **SUCCESS CRITERIA:**
   - 4-5 embeddings tables documentadas
   - Vector columns: dimensions (3072/1536/1024), IVFFlat indexes
   - code_embeddings security issue PROMINENTLY featured
   - Matryoshka strategy explained con performance comparison
   - Vector search patterns: 3 types (basic, multi-stage, hybrid)

---

HERRAMIENTAS A USAR:
- MCP Supabase: mcp__supabase__execute_sql (vector columns, IVFFlat indexes, RPC functions)
- File Operations: Write (TABLES_EMBEDDINGS.md), Edit (DOCUMENTATION_PROGRESS.md)

VALIDACIÓN:
Antes de marcar como completo en TODO.md, verifica:
- [ ] TABLES_EMBEDDINGS.md creado (~600-800 líneas)
- [ ] 4-5 tablas con vector columns documentadas
- [ ] code_embeddings security issue section at top (prominent)
- [ ] Matryoshka strategy explained (3 dimensions)
- [ ] IVFFlat index parameters documentados (lists = sqrt(row_count))
- [ ] Vector search patterns: basic, multi-stage, hybrid
- [ ] DOCUMENTATION_PROGRESS.md actualizado

---

SIGUIENTE PASO:
Después de completar esta fase, usar: docs/database/prompt-workflow-PART7-rls-policies.md
```

---

## ✅ SUCCESS CRITERIA

Marca COMPLETE solo si:
- [ ] Todas las tareas del PLAN_PART6 ejecutadas
- [ ] TABLES_EMBEDDINGS.md creado (~600-800 líneas)
- [ ] code_embeddings security issue prominently documented
- [ ] Matryoshka strategy explained
- [ ] TODO.md actualizado con [x] en FASE 6
- [ ] Listo para PARTE 7

---

**Última actualización:** October 30, 2025
