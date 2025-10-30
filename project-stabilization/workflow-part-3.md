# Workflow Prompts - PARTE 3/3
# FASE 4 (MCP Optimization) + FASE 5 (Warnings) + FASE 6 (Documentation)

**Proyecto:** MUVA Platform Stabilization
**Prompts Coverage:** FASE 4 (2 prompts) + FASE 5 (2 prompts) + FASE 6 (1 prompt)

---

## FASE 4: MCP Optimization 🤖

### Prompt 4.1: Análisis y Limpieza de Snapshots

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Analizar snapshots actuales y aplicar limpieza para reducir contexto

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 4
- Ver: project-stabilization/plan-part-3.md (FASE 4)
- Objetivo: Reducir snapshots de >50KB a <20KB cada uno (50% reduction)

ESPECIFICACIONES:

**PARTE 1: Análisis de Snapshots (tarea 4.1)**

1. Medir tamaño actual:
   ```bash
   du -h snapshots/*.md
   ```

2. Identificar información obsoleta:
   - Proyectos marcados como COMPLETED
   - Referencias a features ya deployed
   - Contexto duplicado entre agentes

3. Buscar referencias a proyectos viejos:
   ```bash
   grep -r "COMPLETED" snapshots/
   grep -r "Project:" snapshots/
   ```

4. Documentar findings:
   - Crear: project-stabilization/docs/fase-4/MCP_OPTIMIZATION_REPORT.md
   - Incluir: Tamaño actual, info obsoleta, target de reducción

**PARTE 2: Limpiar Snapshots (tarea 4.2)**

1. Para cada snapshot en snapshots/:
   - agent-backend-developer.md
   - agent-database-agent.md
   - agent-infrastructure-monitor.md
   - agent-deploy-agent.md
   - agent-ux-interface.md

2. Aplicar estrategia de limpieza:
   - Remover proyectos completados
   - Consolidar información duplicada
   - Actualizar con "Project Stabilization 2025" como proyecto actual
   - Usar template compacto (ver plan-part-3.md, tarea 4.2)

3. Template nuevo (ejemplo):
   ```markdown
   # Snapshot: {Agente}

   **Fecha:** 30 Octubre 2025
   **Proyecto Actual:** Project Stabilization 2025

   ## Responsabilidades
   {Qué hace este agente}

   ## Stack Relevante
   {Solo tecnologías relevantes}

   ## Proyecto Actual: Stabilization 2025
   **Tareas Asignadas:**
   - {Tarea 1}
   - {Tarea 2}

   **Archivos Clave:**
   - {Archivo 1}

   ## Contexto Técnico
   {Contexto específico}

   ## Referencias
   - CLAUDE.md
   - docs/
   - project-stabilization/
   ```

4. Target: <20KB cada snapshot

5. Documentar cambios:
   - Crear: project-stabilization/docs/fase-4/SNAPSHOT_CLEANUP_LOG.md
   - Incluir: Qué se removió, tamaño antes/después

TEST:
- ✅ Snapshots <20KB cada uno
- ✅ Contenido relevante preservado
- ✅ Referencias actualizadas
- ✅ Documentación de cambios completa

SIGUIENTE: Prompt 4.2 (Knowledge Graph + MCP Validation)
```

---

### Prompt 4.2: Knowledge Graph + MCP Supabase Validation

**AGENTE:** @agent-infrastructure-monitor + @agent-database-agent

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Actualizar knowledge graph y validar conexión MCP Supabase

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 4
- Ver: project-stabilization/plan-part-3.md (FASE 4)
- Snapshots ya limpiados

ESPECIFICACIONES:

**PARTE 1: Actualizar Knowledge Graph (tarea 4.3)**

1. Leer knowledge graph actual:
   ```bash
   mcp__knowledge-graph__aim_read_graph({})
   ```

2. Buscar nodos obsoletos:
   ```bash
   mcp__knowledge-graph__aim_search_nodes({
     query: "COMPLETED"
   })
   ```

3. Eliminar nodos de proyectos completados:
   ```bash
   mcp__knowledge-graph__aim_delete_entities({
     entityNames: ["Matryoshka_Migration", "SIRE_Phase1", ...]
   })
   ```

4. Crear nodos del proyecto actual:
   ```bash
   mcp__knowledge-graph__aim_create_entities({
     entities: [
       {
         name: "Project_Stabilization_2025",
         entityType: "project",
         observations: [
           "Objetivo: Estabilizar infraestructura",
           "Duración: 13-18 horas",
           "6 fases: Critical, Branches, Dependencies, MCP, Warnings, Docs"
         ]
       },
       {
         name: "PM2_Instability_Issue",
         entityType: "problem",
         observations: [
           "17 restarts en 18 minutos",
           "Causa: tenant query con .single()",
           "Solución: usar .maybeSingle()"
         ]
       },
       {
         name: "Dependency_Updates_Task",
         entityType: "task",
         observations: [
           "35 paquetes desactualizados",
           "Breaking changes: LangChain 1.0, OpenAI SDK 6.x",
           "Eliminar --legacy-peer-deps"
         ]
       }
     ]
   })
   ```

5. Crear relaciones:
   ```bash
   mcp__knowledge-graph__aim_create_relations({
     relations: [
       {
         from: "Project_Stabilization_2025",
         to: "PM2_Instability_Issue",
         relationType: "resolves"
       },
       {
         from: "Project_Stabilization_2025",
         to: "Dependency_Updates_Task",
         relationType: "includes"
       }
     ]
   })
   ```

6. Documentar cambios (nodos removidos, nodos creados, tamaño antes/después)

**PARTE 2: Validar MCP Supabase Connection (tarea 4.4)**

1. Test conexión a proyecto principal:
   ```bash
   mcp__supabase__get_project({
     id: "ooaumjzaztmutltifhoq"
   })
   ```

2. Test query DML:
   ```bash
   mcp__supabase__execute_sql({
     project_id: "ooaumjzaztmutltifhoq",
     query: "SELECT COUNT(*) FROM tenants"
   })
   ```

3. Test list tables:
   ```bash
   mcp__supabase__list_tables({
     project_id: "ooaumjzaztmutltifhoq",
     schemas: ["public"]
   })
   ```

4. Validar access token:
   ```bash
   # Verificar que SUPABASE_ACCESS_TOKEN está en .env.local
   grep "SUPABASE_ACCESS_TOKEN" .env.local
   ```

**PARTE 3: Documentar Uso MCP (tarea 4.5)**

1. Crear: project-stabilization/docs/fase-4/MCP_USAGE_GUIDE.md
   - Documentar MCP-first policy
   - Documentar uso por agente (ejemplos)
   - Documentar best practices:
     - DML (SELECT, INSERT, UPDATE, DELETE): Use MCP
     - DDL (CREATE, ALTER, DROP): Use tsx script
   - Ejemplos de comandos comunes por agente

2. Ver template completo en:
   - project-stabilization/plan-part-3.md (FASE 4, tarea 4.5)

**CRITERIOS DE ÉXITO FASE 4:**
- ✅ Snapshots <20KB cada uno (50% reducción)
- ✅ Knowledge graph limpio (solo proyecto actual)
- ✅ MCP Supabase funcionando (tests exitosos)
- ✅ Guía de uso MCP documentada
- ✅ CLAUDE.md actualizado con referencia a MCP_USAGE_GUIDE.md

TEST:
- du -h snapshots/*.md (verificar <20KB)
- aim_search_nodes (verificar proyecto actual presente)
- MCP Supabase queries funcionando
- Documentación completa

SIGUIENTE FASE: FASE 5 (Build Warnings)
Ver: Prompt 5.1
```

---

## FASE 5: Build Warnings & Performance 🔧

✅ **HALLAZGO DEL DIAGNÓSTICO:** Build está LIMPIO (0 warnings críticos)

Según `DIAGNOSTICO-ee1d48e.md` - Sección "Build Status":
- Compile time: 5.1s ✅ (excelente)
- Total warnings: 0 ✅ (solo 1 warning esperado de edge runtime)
- TypeScript errors: 0 ✅
- Bundle size: Algunas rutas >270KB (aceptable para features complejos)

**CAMBIO DE ENFOQUE:**
- Esta fase es PREVENTIVA y de DOCUMENTACIÓN
- Objetivo: Documentar baseline limpio actual
- No hay warnings críticos que resolver
- Focus en performance baseline y optimizaciones preventivas

---

### Prompt 5.1: Documentar Baseline de Build Limpio

⚠️ **CAMBIO vs Plan Original:** Build ya está limpio. Esta tarea documenta el baseline actual.

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Documentar baseline de build limpio y capturar métricas actuales

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 5
- Ver: project-stabilization/DIAGNOSTICO-ee1d48e.md (sección "Build Status")
- Hallazgo Real: Build LIMPIO (0 warnings, 0 errors)
- Objetivo: Documentar estado actual como baseline

ESPECIFICACIONES:

**PARTE 1: Capturar y Analizar Warnings (tarea 5.1)**

1. Build y capturar output:
   ```bash
   npm run build 2>&1 | tee build-output.log
   ```

2. Categorizar warnings:
   ```bash
   grep -i "warning" build-output.log > warnings.txt
   grep -i "deprecated" build-output.log > deprecated.txt
   grep -i "memory" build-output.log > memory.txt
   ```

3. Analizar cada categoría:
   ```bash
   cat warnings.txt | sort | uniq -c | sort -rn
   ```

4. Categorías comunes:
   - Deprecation Warnings (APIs obsoletas)
   - Memory Warnings (heap size, memory leaks)
   - Bundle Size Warnings (large bundles >244kB)
   - TypeScript Warnings (unused variables, type assertions)

5. Documentar cada warning:
   - Crear: project-stabilization/docs/fase-5/BUILD_WARNINGS_REPORT.md
   - Formato:
     ```markdown
     ## Summary
     - Total: 23
     - Critical: 5
     - High: 12
     - Medium: 4
     - Low: 2

     ## By Category
     ### Deprecation (8)
     1. Warning: Using deprecated API `old_function`
        - File: src/lib/utils.ts:45
        - Fix: Replace with `new_function`
        - Priority: HIGH
     ```

**PARTE 2: Resolver Warnings Críticos (tarea 5.2)**

1. Prioridad de resolución:
   - CRITICAL: Memory leaks, security, breaking API usage
   - HIGH: Deprecations próximos, performance critical
   - MEDIUM: Bundle size, non-critical deprecations
   - LOW: Unused variables, formatting

2. Ejemplos de fixes comunes:

   **Memory Leak:**
   ```typescript
   // ANTES
   useEffect(() => {
     const interval = setInterval(() => fetchData(), 5000);
     // ❌ No cleanup
   }, []);

   // DESPUÉS
   useEffect(() => {
     const interval = setInterval(() => fetchData(), 5000);
     return () => clearInterval(interval);  // ✅ Cleanup
   }, []);
   ```

   **Deprecation:**
   ```typescript
   // ANTES
   import { deprecated_function } from 'some-lib';

   // DESPUÉS
   import { new_function } from 'some-lib';
   ```

   **Bundle Size:**
   ```typescript
   // ANTES
   import { HugeComponent } from '@/components/Huge';

   // DESPUÉS
   import dynamic from 'next/dynamic';
   const HugeComponent = dynamic(() => import('@/components/Huge'));
   ```

3. Resolver todos los CRITICAL y HIGH

4. Documentar cada fix:
   - Actualizar: project-stabilization/docs/fase-5/OPTIMIZATION_LOG.md
   - Incluir: Warning original, fix aplicado, archivo y línea

TEST:
- npm run build (verificar warnings resueltos)
- npm run test (verificar no regresiones)
- Build output limpio (solo warnings LOW si acaso)

SIGUIENTE: Prompt 5.2 (Performance Baseline + Optimizations)
```

---

### Prompt 5.2: Performance Baseline y Optimizaciones

**AGENTE:** @agent-backend-developer + @agent-ux-interface

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Establecer performance baseline y aplicar optimizaciones

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 5
- Ver: project-stabilization/plan-part-3.md (FASE 5)
- Warnings ya resueltos

ESPECIFICACIONES:

**PARTE 1: Establecer Performance Baseline (tarea 5.3)**

1. Crear: scripts/measure-performance.sh
   ```bash
   #!/bin/bash
   echo "📊 Performance Baseline Measurement"

   # Build time
   START=$(date +%s)
   npm run build > /dev/null 2>&1
   END=$(date +%s)
   echo "Build: $((END - START))s (target: <60s)"

   # Bundle sizes
   echo "📦 Bundle sizes:"
   du -sh .next/static/chunks/*.js | sort -h | tail -10

   # Memory (si PM2 corriendo)
   if command -v pm2 &> /dev/null; then
     pm2 jlist | jq '.[0].monit.memory / 1024 / 1024' | xargs printf "Memory: %.2f MB\n"
   fi
   ```

2. Ejecutar y documentar:
   ```bash
   ./scripts/measure-performance.sh > performance-baseline.txt
   ```

3. Crear: project-stabilization/docs/fase-5/PERFORMANCE_BASELINE.md
   - Incluir métricas:
     - Build Time (target: <60s)
     - Bundle Sizes (target: <200kB avg)
     - Memory Usage (target: <250MB)
     - Startup Time (target: <2s)
   - Targets "Must Not Exceed" y "Should Maintain"
   - Ver template en plan-part-3.md (FASE 5, tarea 5.3)

**PARTE 2: Optimizaciones next.config.js (tarea 5.4)**

1. Actualizar next.config.js:
   ```javascript
   const nextConfig = {
     // Bundle optimization
     experimental: {
       optimizePackageImports: ['@anthropic-ai/sdk', 'langchain'],
     },

     // Compiler options
     compiler: {
       removeConsole: process.env.NODE_ENV === 'production',
     },

     // Production optimizations
     productionBrowserSourceMaps: false,

     // Security headers
     async headers() {
       return [
         {
           source: '/:path*',
           headers: [
             { key: 'X-DNS-Prefetch-Control', value: 'on' },
             { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
           ],
         },
       ];
     },
   };
   ```

2. Test que build funciona:
   ```bash
   npm run build
   # Verificar: sin warnings nuevos, bundle size no aumentado
   ```

**PARTE 3: Test Performance Automatizado (tarea 5.5)**

1. Crear: scripts/test-performance.sh
   ```bash
   #!/bin/bash
   set -e

   echo "🧪 Testing performance thresholds..."

   npm run build > build-output.log 2>&1

   # Build time
   BUILD_TIME=$(grep "Compiled in" build-output.log | grep -oE '[0-9]+\.[0-9]+s' | cut -d's' -f1)
   if (( $(echo "$BUILD_TIME > 90" | bc -l) )); then
     echo "❌ Build time exceeded: ${BUILD_TIME}s > 90s"
     exit 1
   fi
   echo "✅ Build time: ${BUILD_TIME}s"

   # Bundle sizes
   LARGEST=$(du -sb .next/static/chunks/*.js | sort -n | tail -1 | cut -f1)
   LARGEST_KB=$((LARGEST / 1024))
   if [ $LARGEST_KB -gt 300 ]; then
     echo "❌ Bundle too large: ${LARGEST_KB}kB > 300kB"
     exit 1
   fi
   echo "✅ Largest bundle: ${LARGEST_KB}kB"
   ```

2. Test:
   ```bash
   ./scripts/test-performance.sh
   # Expected: ✅ All tests passed
   ```

**CRITERIOS DE ÉXITO FASE 5:**
- ✅ 0 warnings CRITICAL en build
- ✅ Performance baseline documentado
- ✅ Build time <60s
- ✅ Bundle size <200kB (promedio)
- ✅ Memory usage <250MB (VPS)
- ✅ Tests de performance automatizados

TEST:
- npm run build (limpio)
- ./scripts/measure-performance.sh (baseline documentado)
- ./scripts/test-performance.sh (thresholds OK)
- pm2 info muva-chat (memory <250MB)

SIGUIENTE FASE: FASE 6 (Documentation)
Ver: Prompt 6.1
```

---

## FASE 6: Documentation & Workflow 📚

### Prompt 6.1: Documentación Completa del Proyecto

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Consolidar toda la documentación del proyecto y crear guías finales

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 6 (FINAL)
- Ver: project-stabilization/plan-part-3.md (FASE 6)
- Todas las fases anteriores completadas

ESPECIFICACIONES:

**PARTE 1: Development Workflow (tarea 6.1)**

1. Crear: docs/infrastructure/DEVELOPMENT_WORKFLOW.md
   - Quick Start (setup local)
   - Environments (staging, dev, main)
   - Common Workflows:
     - New feature
     - Hotfix
     - Experiment
   - Pre-commit checklist
   - Pre-deploy checklist
   - Troubleshooting

2. Ver template completo en:
   - project-stabilization/plan-part-3.md (FASE 6, tarea 6.1)

**PARTE 2: Troubleshooting Guide (tarea 6.2)**

1. Crear: docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md
   - PM2 Issues:
     - Frequent restarts (causa, solución)
     - Won't start (causa, solución)
   - Tenant Query Errors (PGRST116)
   - Dependency Issues (npm install fails, build errors)
   - Environment Issues (wrong project, missing vars)
   - Performance Issues (high memory, slow builds)
   - MCP Issues (tools not working, stale graph)

2. Ver template completo en:
   - project-stabilization/plan-part-3.md (FASE 6, tarea 6.2)

**PARTE 3: Pre-Deploy Checklist (tarea 6.3)**

1. Crear: project-stabilization/PRE_DEPLOY_CHECKLIST.md
   - Code Quality (tests, build, types)
   - Environment (branch, env vars)
   - Performance (tests, thresholds)
   - Git (committed, pushed, conflicts)
   - Testing (smoke tests)
   - Documentation
   - Deployment commands
   - Rollback plan

2. Ver template completo en:
   - project-stabilization/plan-part-3.md (FASE 6, tarea 6.3)

**PARTE 4: Stabilization Summary (tarea 6.4)**

1. Crear: project-stabilization/STABILIZATION_SUMMARY.md
   - Resumen ejecutivo
   - Problemas resueltos (críticos, importantes)
   - Resultados (performance, código, docs)
   - Entregables (scripts, docs)
   - Lecciones aprendidas
   - Próximos pasos (monitoreo, mantenimiento, mejoras)

2. Incluir métricas reales obtenidas:
   - Build time: {actual}s
   - Bundle size: {actual}kB
   - Memory usage: {actual}MB
   - PM2 uptime: {actual}h sin restarts

3. Ver template completo en:
   - project-stabilization/plan-part-3.md (FASE 6, tarea 6.4)

**PARTE 5: Actualizar CLAUDE.md (tarea 6.5)**

1. Agregar sección "Post-Stabilization 2025" a CLAUDE.md:
   ```markdown
   ## 🛠️ Post-Stabilization 2025

   **Proyecto completado:** 30 Octubre 2025

   ### New Resources
   - **Workflow:** docs/infrastructure/DEVELOPMENT_WORKFLOW.md
   - **Troubleshooting:** docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md
   - **Pre-Deploy:** project-stabilization/PRE_DEPLOY_CHECKLIST.md
   - **Summary:** project-stabilization/STABILIZATION_SUMMARY.md

   ### New Scripts
   ```bash
   npm run env:staging          # Toggle to staging
   npm run env:production       # Toggle to production
   npm run validate-env         # Validate environment
   npm run deploy:dev           # Deploy to dev
   npm run deploy:staging       # Deploy to staging
   ```

   ### Performance Baselines
   - Build Time: <60s
   - Bundle Size: <200kB (avg)
   - Memory Usage: <250MB
   - PM2 Uptime: >24h

   Run measurement: ./scripts/measure-performance.sh
   ```

**CRITERIOS DE ÉXITO FASE 6:**
- ✅ DEVELOPMENT_WORKFLOW.md completo
- ✅ STABILIZATION_TROUBLESHOOTING.md completo
- ✅ PRE_DEPLOY_CHECKLIST.md completo
- ✅ STABILIZATION_SUMMARY.md completo con métricas reales
- ✅ CLAUDE.md actualizado
- ✅ Todas las referencias correctas

**CRITERIOS DE ÉXITO - PROYECTO COMPLETO:**

### Funcionalidad
- ✅ PM2 estable (>24h sin restarts)
- ✅ Tenant queries sin errores PGRST116
- ✅ Ambientes staging/dev funcionando
- ✅ Deploy scripts funcionando
- ✅ Toggle de ambiente funcionando

### Performance
- ✅ Build time <60s
- ✅ Bundle size <200kB (promedio)
- ✅ Memory usage <250MB (VPS)
- ✅ 0 warnings críticos en build
- ✅ Performance baseline documentado

### Infraestructura
- ✅ 35 dependencias actualizadas
- ✅ Breaking changes migrados
- ✅ --legacy-peer-deps removido (o documentado)
- ✅ Tests pasando (100%)
- ✅ TypeScript errors: 0

### Documentación
- ✅ 6 fases documentadas
- ✅ Workflow de desarrollo completo
- ✅ Troubleshooting guide
- ✅ Pre-deploy checklist
- ✅ MCP usage guide
- ✅ Migration guides
- ✅ CLAUDE.md actualizado

### Mantenibilidad
- ✅ 8+ scripts de utilidad creados
- ✅ Tests automatizados
- ✅ Monitoring scripts
- ✅ Rollback plan documentado
- ✅ Knowledge graph limpio

TEST:
- Todos los archivos de documentación creados
- Todas las referencias correctas
- CLAUDE.md actualizado
- Summary con métricas reales

FINALIZACIÓN DEL PROYECTO:
Una vez completada esta fase, el proyecto "Project Stabilization 2025" está completo. ✅

Reportar al usuario:
- Resumen de lo logrado (6 fases)
- Métricas finales (performance)
- Scripts creados (8+)
- Documentación generada (20+ archivos)
- Preguntar si desea commitear todo
```

---

## FINALIZACIÓN Y COMMIT

### Prompt Final: Commit del Proyecto Completo

**COPY-PASTE DESPUÉS DE APROBACIÓN:**

```
TAREA: Commitear todos los cambios del proyecto "Project Stabilization 2025"

ESPECIFICACIONES:

1. Verificar estado:
   ```bash
   git status --short
   git diff --stat
   ```

2. Agregar todos los archivos:
   ```bash
   git add .
   ```

3. Commit con mensaje descriptivo:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat: Complete Project Stabilization 2025

   Resolves 3 critical issues and 12 important problems affecting
   infrastructure. Establishes solid foundation for future development.

   ## Critical Issues Resolved
   - PM2 instability (17 restarts/18min → 0 restarts)
   - Tenant query errors (PGRST116 → fixed with .maybeSingle())
   - Branch strategy confusion → clarified and documented

   ## Important Issues Resolved
   - 35 outdated dependencies → all updated
   - Breaking changes (LangChain 1.0, OpenAI SDK 6.x) → migrated
   - MCP overload → optimized (50% reduction)
   - Build warnings → resolved (0 critical)
   - Missing documentation → complete workflow documented

   ## Performance Results
   - Build Time: {actual}s (target: <60s) ✅
   - Bundle Size: {actual}kB (target: <200kB avg) ✅
   - Memory Usage: {actual}MB (target: <250MB) ✅
   - PM2 Uptime: >24h without restarts ✅

   ## Deliverables
   - 8+ utility scripts created
   - 20+ documentation files
   - Complete development workflow
   - Pre-deploy checklist
   - Troubleshooting guide
   - MCP usage guide

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

4. Push (si autorizado):
   ```bash
   git push origin dev
   ```

5. Reportar:
   ```
   ✅ PROJECT STABILIZATION 2025 COMPLETE

   Duration: {actual}h (estimated: 13-18h)
   Phases: 6/6 ✅
   Tasks: 40/40 ✅
   Commits: 1 (consolidated)

   Next Steps:
   1. Monitor PM2 stability (24h)
   2. Setup cron for monitoring script
   3. Performance baseline weekly
   ```
```

---

## NOTAS IMPORTANTES

### Consolidación de Commits

**Opción 1: Commit por Fase (recomendado si hay problemas)**
- Commitear después de cada fase
- Más fácil de rollback si algo falla

**Opción 2: Commit Consolidado (recomendado si todo OK)**
- Un solo commit al final
- Mensaje descriptivo con todo lo logrado
- Más limpio en historial

### Validación Final

Antes de considerar el proyecto completo:
```bash
# 1. Build limpio
npm run build
# Expected: ✅ Sin errores, sin warnings críticos

# 2. Tests pasando
npm run test
# Expected: ✅ 100%

# 3. Performance OK
./scripts/test-performance.sh
# Expected: ✅ All thresholds met

# 4. PM2 estable
ssh muva@195.200.6.216 'pm2 info muva-chat | grep "restarts"'
# Expected: 0 restarts en últimas 24h

# 5. Documentación completa
ls project-stabilization/docs/fase-*/
ls docs/infrastructure/DEVELOPMENT_WORKFLOW.md
ls docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md
# Expected: Todos los archivos presentes
```

### Celebración

```
🎉 ¡PROYECTO STABILIZATION 2025 COMPLETADO! 🎉

Duración: {actual}h
Problemas Resueltos: 15
Scripts Creados: 8+
Documentación: 20+ archivos
Performance: ✅ Todos los targets cumplidos

La plataforma MUVA está ahora estabilizada y lista para
continuar con nuevas features sobre bases sólidas.
```

---

**Última actualización:** 30 Octubre 2025
