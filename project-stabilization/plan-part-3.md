# Project Stabilization 2025 - PARTE 3/3
# Fases 4, 5, 6 + Criterios de Éxito + Agentes

**Proyecto:** MUVA Platform Stabilization
**Fase Coverage:** FASE 4-6 (Mantenimiento y Optimización)
**Duración Total Parte 3:** 5-7 horas

---

## FASE 4: MCP Optimization 🤖

**Duración:** 1-2 horas
**Prioridad:** MEDIA
**Agente Principal:** @agent-infrastructure-monitor

### Objetivo

Optimizar la configuración de Model Context Protocol (MCP) para reducir contexto innecesario y mejorar performance de invocación de agentes:

- Limpiar snapshots de proyectos completados
- Actualizar knowledge graph
- Validar conexión MCP Supabase
- Documentar uso correcto

### Entregables

1. ✅ Snapshots optimizados (<20KB cada uno)
2. ✅ Knowledge graph actualizado (solo proyecto actual)
3. ✅ MCP Supabase connection validada
4. ✅ Guía de uso MCP por agente
5. ✅ CLAUDE.md actualizado con mejor contexto

### Archivos a Modificar

```
snapshots/
  ├── agent-backend-developer.md           # Limpiar, actualizar
  ├── agent-database-agent.md              # Limpiar, actualizar
  ├── agent-infrastructure-monitor.md      # Limpiar, actualizar
  ├── agent-deploy-agent.md                # Limpiar, actualizar
  └── agent-ux-interface.md                # Limpiar, actualizar

CLAUDE.md                                   # Actualizar contexto MCP

project-stabilization/docs/fase-4/
  ├── MCP_OPTIMIZATION_REPORT.md           # Análisis antes/después
  ├── SNAPSHOT_CLEANUP_LOG.md              # Qué se removió
  └── MCP_USAGE_GUIDE.md                   # Guía de uso correcto
```

### Tareas Detalladas

#### 4.1 Análisis de Snapshots Actuales (30min)
**Responsable:** @agent-infrastructure-monitor

**Acciones:**
- [ ] Leer todos los snapshots en `snapshots/`
- [ ] Identificar información obsoleta:
  - Proyectos completados (referencias a features viejas)
  - Contexto duplicado entre agentes
  - Información no relevante para desarrollo actual
- [ ] Calcular tamaño actual de cada snapshot
- [ ] Documentar findings en `MCP_OPTIMIZATION_REPORT.md`

**Comandos:**
```bash
# Tamaño de snapshots
du -h snapshots/*.md

# Buscar referencias a proyectos viejos
grep -r "Project:" snapshots/
grep -r "COMPLETED" snapshots/
```

**Output Esperado:**
```
Snapshot Analysis:
- agent-backend-developer.md: 45KB (3 proyectos viejos)
- agent-database-agent.md: 38KB (2 proyectos viejos)
- agent-infrastructure-monitor.md: 52KB (4 proyectos viejos)
- agent-deploy-agent.md: 28KB (1 proyecto viejo)
- agent-ux-interface.md: 41KB (2 proyectos viejos)

Total: 204KB → Target: <100KB (50% reduction)
```

---

#### 4.2 Limpiar Snapshots (45min)
**Responsable:** @agent-infrastructure-monitor

**Estrategia de Limpieza:**

1. **Remover Proyectos Completados:**
   - Todo contexto de proyectos marcados como COMPLETED
   - Features ya deployed y estables

2. **Consolidar Información Duplicada:**
   - Stack tecnológico (una sola vez, no en cada snapshot)
   - Estructura de proyecto (referenciar docs/ en vez de duplicar)

3. **Actualizar Contexto Actual:**
   - "Project Stabilization 2025" como proyecto activo
   - Referencias a problemas actuales (PM2, dependencies)

**Template Nuevo de Snapshot:**

```markdown
# Snapshot: {Agente}

**Fecha:** {Hoy}
**Proyecto Actual:** Project Stabilization 2025

## Responsabilidades

{Qué hace este agente}

## Stack Relevante

{Solo tecnologías relevantes para este agente}

## Proyecto Actual: Stabilization 2025

**Objetivo:** {Objetivo del proyecto}

**Tareas Asignadas:**
- {Tarea 1}
- {Tarea 2}

**Archivos Clave:**
- {Archivo 1}
- {Archivo 2}

## Contexto Técnico

{Contexto específico del agente}

## Referencias

- CLAUDE.md: Reglas del proyecto
- docs/: Documentación técnica
- project-stabilization/: Planificación completa
```

**Ejemplo: agent-backend-developer.md ANTES (45KB):**

```markdown
# Snapshot: Backend Developer

## Proyectos Completados
- [COMPLETED] Matryoshka Embeddings Migration
- [COMPLETED] SIRE Integration Phase 1
- [COMPLETED] Multi-tenant Authentication

## Proyecto Actual: Guest Communication Refactor
...
```

**Ejemplo: agent-backend-developer.md DESPUÉS (18KB):**

```markdown
# Snapshot: Backend Developer

**Fecha:** 30 Octubre 2025
**Proyecto Actual:** Project Stabilization 2025

## Responsabilidades

Backend APIs, business logic, SIRE compliance, database operations.

## Stack Relevante

- Next.js 15 App Router API routes
- Supabase (PostgreSQL, RLS, RPC)
- LangChain 1.0.x, OpenAI SDK 6.x
- TypeScript strict mode

## Proyecto Actual: Stabilization 2025

**Objetivo:** Estabilizar infraestructura antes de nuevas features

**Tareas Asignadas:**
- FASE 1: Fix tenant query `.single()` → `.maybeSingle()`
- FASE 3: Migrar LangChain 0.3.x → 1.0.x
- FASE 3: Migrar OpenAI SDK 5.x → 6.x

**Archivos Clave:**
- `src/lib/tenant/tenant.ts`
- `src/lib/ai/langchain.ts`
- `src/lib/ai/openai.ts`

## Contexto Técnico

### Tenant Queries
- Usar `.maybeSingle()` para queries que pueden retornar 0 rows
- Manejo de null vs error

### AI Integration
- LangChain 1.0: `modelName` → `model`
- OpenAI SDK 6.x: Types bajo namespace `OpenAI.*`

## Referencias

- CLAUDE.md: Reglas MCP-first
- docs/troubleshooting/SUPABASE_INTERACTION_GUIDE.md
- project-stabilization/plan-part-2.md
```

**Acciones:**
- [ ] Aplicar limpieza a cada snapshot
- [ ] Reducir tamaño objetivo: <20KB cada uno
- [ ] Documentar cambios en `SNAPSHOT_CLEANUP_LOG.md`

---

#### 4.3 Actualizar Knowledge Graph (30min)
**Responsable:** @agent-infrastructure-monitor

**Objetivo:** Limpiar nodos obsoletos y actualizar con proyecto actual

**Comandos MCP:**

```bash
# 1. Leer knowledge graph actual
mcp__knowledge-graph__aim_read_graph({})

# 2. Buscar nodos obsoletos
mcp__knowledge-graph__aim_search_nodes({
  query: "COMPLETED"
})

# 3. Eliminar nodos de proyectos completados
mcp__knowledge-graph__aim_delete_entities({
  entityNames: ["Matryoshka_Migration", "SIRE_Phase1", ...]
})

# 4. Crear nodos del proyecto actual
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

# 5. Crear relaciones
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

**Documentar:**
- Nodos removidos (cuántos, cuáles)
- Nodos creados (proyecto actual)
- Tamaño antes/después

---

#### 4.4 Validar MCP Supabase Connection (15min)
**Responsable:** @agent-database-agent

**Tests de Conexión:**

```bash
# 1. Test conexión a proyecto principal
mcp__supabase__get_project({
  id: "ooaumjzaztmutltifhoq"
})

# 2. Test query
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: "SELECT COUNT(*) FROM tenants"
})

# 3. Test list tables
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})

# 4. Validar access token
echo $SUPABASE_ACCESS_TOKEN
# Debe estar presente en env
```

**Criterios:**
- ✅ Conexión exitosa
- ✅ Queries funcionando
- ✅ Access token válido
- ✅ Sin rate limiting

---

#### 4.5 Documentar Uso MCP (30min)
**Responsable:** @agent-infrastructure-monitor

**Archivo:** `docs/fase-4/MCP_USAGE_GUIDE.md`

**Contenido:**

```markdown
# MCP Usage Guide - MUVA Project

## Overview

Model Context Protocol (MCP) nos da acceso a:
- Supabase operations (DML queries)
- Knowledge graph (memoria de proyecto)
- Documentación Supabase

## MCP-First Policy

Ver: docs/infrastructure/MCP_USAGE_POLICY.md

**Regla:** SIEMPRE usar MCP tools antes que bash scripts

## Por Agente

### @agent-backend-developer

**Uso Común:**
```bash
# Queries DML
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: "SELECT * FROM tenants WHERE subdomain = 'simmerdown'"
})

# Buscar docs
mcp__supabase__search_docs({
  graphql_query: "{ searchDocs(query: \"RLS policies\") { nodes { title href } } }"
})
```

### @agent-database-agent

**Uso Común:**
```bash
# Migrations
mcp__supabase__apply_migration({
  project_id: "ooaumjzaztmutltifhoq",
  name: "add_column_to_tenants",
  query: "ALTER TABLE tenants ADD COLUMN new_col TEXT"
})

# List tables
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})
```

### @agent-infrastructure-monitor

**Uso Común:**
```bash
# Knowledge graph
mcp__knowledge-graph__aim_search_nodes({
  query: "PM2"
})

# Project info
mcp__supabase__get_project({
  id: "ooaumjzaztmutltifhoq"
})
```

## Best Practices

1. **DML vs DDL:**
   - DML (SELECT, INSERT, UPDATE, DELETE): Use MCP
   - DDL (CREATE, ALTER, DROP): Use tsx script + API

2. **Snapshots:**
   - Keep <20KB per snapshot
   - Only current project context
   - No COMPLETED projects

3. **Knowledge Graph:**
   - Update after each project
   - Remove obsolete nodes
   - Use descriptive entity names
```

### Testing FASE 4

```bash
# 1. Verificar tamaño de snapshots
du -h snapshots/*.md
# Expected: <20KB cada uno

# 2. Test MCP Supabase
# (via prompts, no hay comando directo)

# 3. Verificar knowledge graph
mcp__knowledge-graph__aim_search_nodes({
  query: "Project_Stabilization"
})
# Expected: Nodos del proyecto actual

# 4. Verificar CLAUDE.md
grep "MCP" CLAUDE.md
# Expected: Referencia a MCP_USAGE_GUIDE.md
```

### Criterios de Éxito FASE 4

- ✅ Snapshots <20KB cada uno (50% reducción)
- ✅ Knowledge graph limpio (solo proyecto actual)
- ✅ MCP Supabase funcionando
- ✅ Guía de uso MCP documentada
- ✅ CLAUDE.md actualizado

---

## FASE 5: Build Warnings & Performance 🔧

**Duración:** 2-3 horas
**Prioridad:** MEDIA
**Agente Principal:** @agent-backend-developer

### Objetivo

Eliminar warnings de build y establecer performance baseline:
- Investigar todos los warnings actuales
- Resolver deprecation notices
- Investigar memory leak warnings
- Documentar performance targets

### Entregables

1. ✅ Build completamente limpio (0 warnings críticos)
2. ✅ Performance baseline documentado
3. ✅ Memory leak warnings resueltos
4. ✅ Bundle size optimizado
5. ✅ Tests de performance automatizados

### Archivos a Modificar/Crear

```
src/**/*.ts                                  # Fixes de código
next.config.js                               # Optimizaciones
scripts/measure-performance.sh               # NEW: Performance tests
project-stabilization/docs/fase-5/
  ├── BUILD_WARNINGS_REPORT.md              # Análisis de warnings
  ├── PERFORMANCE_BASELINE.md               # Métricas establecidas
  └── OPTIMIZATION_LOG.md                   # Cambios realizados
```

### Tareas Detalladas

#### 5.1 Capturar y Analizar Warnings (45min)
**Responsable:** @agent-backend-developer

**Acciones:**
```bash
# 1. Build completo y capturar output
npm run build 2>&1 | tee build-output.log

# 2. Categorizar warnings
grep -i "warning" build-output.log > warnings.txt
grep -i "deprecated" build-output.log > deprecated.txt
grep -i "memory" build-output.log > memory.txt

# 3. Analizar cada categoría
cat warnings.txt | sort | uniq -c | sort -rn
```

**Categorías Comunes:**

1. **Deprecation Warnings:**
   - APIs obsoletas (React, Next.js)
   - Dependencias con deprecations

2. **Memory Warnings:**
   - Heap size warnings
   - Memory leak detections

3. **Bundle Size Warnings:**
   - Large bundles (>244kB)
   - Dynamic imports no optimizados

4. **TypeScript Warnings:**
   - Unused variables
   - Type assertions

**Documentar en:** `BUILD_WARNINGS_REPORT.md`

```markdown
# Build Warnings Report

## Summary
- Total warnings: 23
- Critical: 5
- Medium: 12
- Low: 6

## By Category

### Deprecation (8)
1. Warning: Using deprecated API `old_function`
   - File: src/lib/utils.ts:45
   - Fix: Replace with `new_function`
   - Priority: HIGH

### Memory (3)
1. Warning: Possible memory leak in component
   - File: src/components/Chat.tsx:120
   - Fix: Add cleanup in useEffect
   - Priority: CRITICAL

### Bundle Size (7)
1. Warning: Large bundle detected (280kB)
   - Route: /dashboard
   - Fix: Code splitting, lazy loading
   - Priority: MEDIUM

### TypeScript (5)
1. Warning: Unused variable 'foo'
   - File: src/app/api/chat/route.ts:34
   - Fix: Remove unused code
   - Priority: LOW
```

---

#### 5.2 Resolver Warnings Críticos (1h)
**Responsable:** @agent-backend-developer

**Prioridad de Resolución:**

1. **CRITICAL (must fix):**
   - Memory leaks
   - Security warnings
   - Breaking API usage

2. **HIGH (should fix):**
   - Deprecations próximos a removerse
   - Performance critical

3. **MEDIUM (nice to fix):**
   - Bundle size optimizations
   - Non-critical deprecations

4. **LOW (can defer):**
   - Unused variables (si no afectan)
   - Formatting warnings

**Ejemplos de Fixes:**

**Memory Leak:**
```typescript
// ANTES
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);
  // ❌ No cleanup
}, []);

// DESPUÉS
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 5000);

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
const HugeComponent = dynamic(() => import('@/components/Huge'), {
  loading: () => <div>Loading...</div>
});
```

**Acciones:**
- [ ] Resolver todos los warnings CRITICAL
- [ ] Resolver warnings HIGH
- [ ] Documentar warnings MEDIUM/LOW para el futuro
- [ ] Documentar en `OPTIMIZATION_LOG.md`

---

#### 5.3 Establecer Performance Baseline (45min)
**Responsable:** @agent-ux-interface (consultor)

**Métricas a Medir:**

1. **Build Time:**
   - Local: `time npm run build`
   - Target: <60s

2. **Bundle Size:**
   - First Load JS por ruta
   - Target: <200kB promedio

3. **Memory Usage:**
   - PM2 instance
   - Target: <250MB por instancia

4. **Startup Time:**
   - VPS boot time
   - Target: <2s

**Script:** `scripts/measure-performance.sh`

```bash
#!/bin/bash
# Medir performance baseline

echo "📊 Performance Baseline Measurement"
echo "==================================="

# 1. Build time
echo "⏱️  Build time..."
START=$(date +%s)
npm run build > /dev/null 2>&1
END=$(date +%s)
BUILD_TIME=$((END - START))
echo "   Build: ${BUILD_TIME}s"

# 2. Bundle sizes
echo "📦 Bundle sizes..."
du -sh .next/static/chunks/*.js | sort -h | tail -10

# 3. First Load JS (parsear output de build)
grep "First Load JS" .next/build-manifest.json || echo "   (Not available)"

# 4. Memory usage (si PM2 está corriendo)
if command -v pm2 &> /dev/null; then
  echo "💾 Memory usage..."
  pm2 jlist | jq '.[0].monit.memory / 1024 / 1024' | xargs printf "   Memory: %.2f MB\n"
fi

echo ""
echo "✅ Baseline measurement complete"
echo "   Results saved to performance-baseline.txt"
```

**Ejecutar y Documentar:**
```bash
./scripts/measure-performance.sh > performance-baseline.txt

# Documentar en PERFORMANCE_BASELINE.md
cat performance-baseline.txt >> project-stabilization/docs/fase-5/PERFORMANCE_BASELINE.md
```

**Archivo:** `docs/fase-5/PERFORMANCE_BASELINE.md`

```markdown
# Performance Baseline

**Fecha:** 30 Octubre 2025
**Post:** Dependency Updates + Warning Fixes

## Métricas

### Build Performance
- Build Time: 48s ✅ (Target: <60s)
- Compilation: 5.3s
- Static Pages: 80

### Bundle Sizes
- Largest Bundle: 185kB ✅ (Target: <200kB)
- Average First Load JS: 178kB ✅
- Critical Routes:
  - /dashboard: 165kB ✅
  - /chat: 192kB ✅
  - /staff/login: 145kB ✅

### Runtime Performance
- Memory Usage: 238MB ✅ (Target: <250MB)
- Startup Time: 1.8s ✅ (Target: <2s)
- PM2 Restarts: 0 ✅

## Targets

### Must Not Exceed
- Build Time: 90s
- Bundle Size: 300kB (any route)
- Memory: 400MB

### Should Maintain
- Build Time: <60s
- Bundle Size: <200kB (avg)
- Memory: <250MB

## Monitoring

Re-run measurement:
```bash
./scripts/measure-performance.sh
```
```

---

#### 5.4 Optimizaciones next.config.js (30min)
**Responsable:** @agent-backend-developer

**Configuraciones:**

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
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

  // Memory limits
  // (PM2 controla, pero podemos ayudar)

  // Headers (security + performance)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

**Test:**
```bash
npm run build

# Verificar que:
# - Build exitoso
# - Sin warnings nuevos
# - Bundle size no aumentado
```

---

#### 5.5 Test Performance Automatizado (15min)
**Responsable:** @agent-backend-developer

**Script de Test:** `scripts/test-performance.sh`

```bash
#!/bin/bash
# Test que performance no regrese

set -e

echo "🧪 Testing performance thresholds..."

# Build
npm run build > build-output.log 2>&1

# 1. Build time
BUILD_TIME=$(grep "Compiled in" build-output.log | grep -oE '[0-9]+\.[0-9]+s' | cut -d's' -f1)
if (( $(echo "$BUILD_TIME > 90" | bc -l) )); then
  echo "❌ Build time exceeded: ${BUILD_TIME}s > 90s"
  exit 1
fi
echo "✅ Build time: ${BUILD_TIME}s"

# 2. Bundle sizes
LARGEST=$(du -sb .next/static/chunks/*.js | sort -n | tail -1 | cut -f1)
LARGEST_KB=$((LARGEST / 1024))
if [ $LARGEST_KB -gt 300 ]; then
  echo "❌ Bundle too large: ${LARGEST_KB}kB > 300kB"
  exit 1
fi
echo "✅ Largest bundle: ${LARGEST_KB}kB"

echo "✅ Performance tests passed"
```

**Integrar en CI/CD (futuro):**
```yaml
# .github/workflows/test.yml
- name: Performance Tests
  run: ./scripts/test-performance.sh
```

### Testing FASE 5

```bash
# 1. Build limpio
npm run build 2>&1 | tee build-output.log
grep -i "warning" build-output.log | wc -l
# Expected: 0 (o solo warnings LOW)

# 2. Performance test
./scripts/test-performance.sh
# Expected: ✅ All tests passed

# 3. Memory check (VPS)
pm2 info muva-chat | grep "memory"
# Expected: <250MB

# 4. Bundle analysis
npm run build -- --analyze  # (si está configurado)
# Expected: No bundles >300kB
```

### Criterios de Éxito FASE 5

- ✅ 0 warnings CRITICAL en build
- ✅ Performance baseline documentado
- ✅ Build time <60s
- ✅ Bundle size <200kB (promedio)
- ✅ Memory usage <250MB (VPS)
- ✅ Tests de performance automatizados

---

## FASE 6: Documentation & Workflow 📚

**Duración:** 1-2 horas
**Prioridad:** MEDIA
**Agente Principal:** @agent-infrastructure-monitor

### Objetivo

Documentar el workflow profesional de desarrollo y consolidar toda la documentación del proyecto de estabilización:

- Workflow de desarrollo por ambiente
- Troubleshooting guide actualizado
- Pre-deploy checklist
- Consolidar documentación de todas las fases

### Entregables

1. ✅ DEVELOPMENT_WORKFLOW.md completo
2. ✅ TROUBLESHOOTING_GUIDE.md actualizado
3. ✅ PRE_DEPLOY_CHECKLIST.md
4. ✅ STABILIZATION_SUMMARY.md (resumen del proyecto)
5. ✅ CLAUDE.md actualizado con referencias

### Archivos a Crear/Actualizar

```
docs/infrastructure/
  └── DEVELOPMENT_WORKFLOW.md              # NEW: Workflow completo

docs/troubleshooting/
  └── STABILIZATION_TROUBLESHOOTING.md     # NEW: Issues y soluciones

project-stabilization/
  ├── STABILIZATION_SUMMARY.md             # NEW: Resumen ejecutivo
  ├── PRE_DEPLOY_CHECKLIST.md              # NEW: Checklist
  └── docs/                                 # Consolidar docs de fases 1-6

CLAUDE.md                                   # Actualizar con nuevas refs
```

### Tareas Detalladas

#### 6.1 Development Workflow (45min)
**Responsable:** @agent-infrastructure-monitor

**Archivo:** `docs/infrastructure/DEVELOPMENT_WORKFLOW.md`

```markdown
# Development Workflow - MUVA Platform

**Post-Stabilization 2025**

## Quick Start

### 1. Setup Local
```bash
git clone <repo>
cd muva-chat
npm install --legacy-peer-deps  # (o sin flag si FASE 3 lo eliminó)
./scripts/dev-with-keys.sh
```

### 2. Choose Environment
```bash
# Staging (experimentos)
git checkout staging
npm run env:staging
npm run dev

# Dev (desarrollo estable)
git checkout dev
npm run env:production
npm run dev
```

## Environments

### STAGING
- **Branch:** staging
- **Use For:** Breaking changes, experiments
- **Supabase:** Proyecto separado (smdhgcpojpurvgdppufo)
- **Deploy:** Manual, low risk

### DEV
- **Branch:** dev
- **Use For:** Stable features
- **Supabase:** Proyecto principal (ooaumjzaztmutltifhoq)
- **Deploy:** Manual, requires testing

### MAIN
- **Branch:** main
- **Use For:** Reserved (not used yet)

## Common Workflows

### New Feature
```bash
# 1. Start in staging
git checkout staging
git pull origin staging
npm run env:staging

# 2. Develop
# ... make changes ...
npm run build && npm run test

# 3. Move to dev when stable
git checkout dev
git merge staging
npm run env:production
npm run build && npm run test

# 4. Deploy
git push origin dev
npm run deploy:dev
```

### Hotfix
```bash
# For critical bugs, work directly in dev
git checkout dev
git pull origin dev

# ... fix ...
npm run build && npm run test

git commit -m "fix: critical bug"
git push origin dev
npm run deploy:dev
```

### Experiment
```bash
# Always use staging for risky changes
git checkout staging
npm run env:staging

# Break things, it's OK!
# ... experiment ...
```

## Pre-Commit Checklist

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run validate-env` OK
- [ ] No console.logs in production code
- [ ] TypeScript errors resolved

## Pre-Deploy Checklist

See: project-stabilization/PRE_DEPLOY_CHECKLIST.md

## Troubleshooting

See: docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md
```

---

#### 6.2 Troubleshooting Guide (30min)
**Responsable:** @agent-infrastructure-monitor

**Archivo:** `docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md`

```markdown
# Stabilization Troubleshooting Guide

## PM2 Issues

### Symptom: Frequent Restarts
**Cause:** Memory leak, uncaught exceptions

**Solution:**
```bash
# 1. Check logs
pm2 logs muva-chat --lines 200

# 2. Check memory
pm2 info muva-chat | grep memory

# 3. If memory leak:
pm2 restart muva-chat

# 4. If persistent, check ecosystem.config.js
# Verify max_memory_restart setting
```

### Symptom: Won't Start
**Cause:** Build error, port conflict

**Solution:**
```bash
# 1. Check build
npm run build

# 2. Check port
lsof -i :3000

# 3. Manual start
npm start
```

## Tenant Query Errors

### Symptom: PGRST116 Error
**Cause:** Using .single() when query returns 0 rows

**Solution:**
Use .maybeSingle() instead:
```typescript
const { data } = await supabase
  .from('tenants')
  .select('*')
  .eq('subdomain', subdomain)
  .maybeSingle();  // Returns null if not found
```

## Dependency Issues

### Symptom: npm install fails
**Cause:** Peer dependency conflicts

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Symptom: Build errors after update
**Cause:** Breaking changes not migrated

**Solution:**
1. Check docs/fase-3/MIGRATION_GUIDE.md
2. Rollback if needed:
   ```bash
   git checkout HEAD~1 package.json package-lock.json
   npm install --legacy-peer-deps
   ```

## Environment Issues

### Symptom: Wrong Supabase project
**Cause:** Wrong .env.local active

**Solution:**
```bash
npm run validate-env
# Check which project is active

npm run env:staging  # Or env:production
```

### Symptom: Missing environment variables
**Cause:** .env.local incomplete

**Solution:**
```bash
npm run validate-env
# Will show missing vars

# Copy from .env.example or backup
cp .env.backups/.env.local.LATEST .env.local
```

## Performance Issues

### Symptom: High memory usage
**Cause:** Memory leak, large bundles

**Solution:**
```bash
# 1. Check baseline
./scripts/measure-performance.sh

# 2. If exceeded, check:
# - Memory leaks in useEffect
# - Large imports
# - Bundle size
```

### Symptom: Slow builds
**Cause:** Large dependencies, no caching

**Solution:**
```bash
# 1. Check build time
time npm run build

# 2. If >90s, investigate:
# - Clear .next cache
# - Check next.config.js optimizations
```

## MCP Issues

### Symptom: MCP tools not working
**Cause:** Missing SUPABASE_ACCESS_TOKEN

**Solution:**
```bash
# Check env
echo $SUPABASE_ACCESS_TOKEN

# If missing, set in .env.local
```

### Symptom: Knowledge graph stale
**Cause:** Not updated after project

**Solution:**
```bash
# Clean and update
mcp__knowledge-graph__aim_delete_entities({
  entityNames: ["old_project"]
})

mcp__knowledge-graph__aim_create_entities({
  entities: [...]
})
```
```

---

#### 6.3 Pre-Deploy Checklist (15min)
**Responsable:** @agent-deploy-agent

**Archivo:** `project-stabilization/PRE_DEPLOY_CHECKLIST.md`

```markdown
# Pre-Deploy Checklist

**Use this before deploying to VPS**

## Code Quality

- [ ] All tests passing (`npm run test`)
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No console.logs in production code
- [ ] No commented-out code blocks

## Environment

- [ ] Correct branch (`dev` or `staging`)
- [ ] Correct .env.local active (`npm run validate-env`)
- [ ] All environment variables present
- [ ] Supabase project correct

## Performance

- [ ] Performance tests passing (`./scripts/test-performance.sh`)
- [ ] Build time <90s
- [ ] Bundle size <300kB (largest)
- [ ] No memory leak warnings

## Git

- [ ] All changes committed
- [ ] Branch pushed to origin
- [ ] No merge conflicts

## Testing

- [ ] Smoke test completed:
  - [ ] /staff/login works
  - [ ] /dashboard loads
  - [ ] /chat functional
  - [ ] API routes respond

## Documentation

- [ ] CHANGELOG.md updated (if applicable)
- [ ] README.md updated (if changes affect setup)

## Deployment

```bash
# 1. Final check
npm run build
npm run test
npm run validate-env

# 2. Deploy
npm run deploy:dev  # or deploy:staging

# 3. Post-deploy verification
ssh muva@195.200.6.216 'pm2 logs muva-chat --lines 50'
```

## Rollback Plan

If deployment fails:
```bash
# On VPS
cd ~/muva-chat
git checkout HEAD~1
npm install --legacy-peer-deps
npm run build
pm2 restart muva-chat
```
```

---

#### 6.4 Stabilization Summary (30min)
**Responsable:** @agent-infrastructure-monitor

**Archivo:** `project-stabilization/STABILIZATION_SUMMARY.md`

```markdown
# Project Stabilization 2025 - Summary

**Fecha Completado:** {Fecha}
**Duración Real:** {Horas}h (estimado: 13-18h)

## Resumen Ejecutivo

El proyecto de estabilización resolvió 3 problemas críticos y 12 problemas importantes que afectaban la infraestructura de MUVA Platform, estableciendo bases sólidas para desarrollo futuro.

## Problemas Resueltos

### Críticos
- ✅ PM2 inestable (17 restarts/18min) → 0 restarts
- ✅ Tenant query errors (PGRST116) → Resuelto con .maybeSingle()
- ✅ Branch strategy confusa → Clarificada y documentada

### Importantes
- ✅ 35 dependencias desactualizadas → Todas actualizadas
- ✅ Breaking changes (LangChain 1.0, OpenAI SDK 6.x) → Migrados
- ✅ MCP sobrecargado → Optimizado (50% reducción)
- ✅ Build warnings → Resueltos (0 críticos)
- ✅ Falta documentación → Workflow completo documentado

## Resultados

### Performance
- Build Time: {actual}s (target: <60s)
- Bundle Size: {actual}kB (target: <200kB avg)
- Memory Usage: {actual}MB (target: <250MB)
- PM2 Uptime: >24h sin restarts

### Código
- Dependencias actualizadas: 35/35
- Tests pasando: 100%
- TypeScript errors: 0
- Build warnings (critical): 0

### Documentación
- Archivos creados: 20+
- Workflow documentado: ✅
- Troubleshooting guide: ✅
- Pre-deploy checklist: ✅

## Entregables

### Scripts Creados
- `scripts/toggle-env.sh` - Toggle ambiente
- `scripts/validate-env.sh` - Validar env vars
- `scripts/deploy-dev.sh` - Deploy a dev
- `scripts/deploy-staging.sh` - Deploy a staging
- `scripts/test-pm2-stability.sh` - Test estabilidad
- `scripts/monitor-pm2.sh` - Monitoreo PM2
- `scripts/measure-performance.sh` - Performance baseline
- `scripts/test-performance.sh` - Performance tests

### Documentación
Ver: project-stabilization/README.md

## Lecciones Aprendidas

1. **PM2 Configuration:**
   - max_memory_restart crítico
   - Restart limits necesarios
   - Logging estructurado ayuda

2. **Tenant Queries:**
   - .maybeSingle() > .single() para queries opcionales
   - Logs informativos, no errores

3. **Dependency Updates:**
   - Actualizar en grupos por riesgo
   - Tests después de cada grupo
   - Documentar breaking changes

4. **MCP Optimization:**
   - Snapshots <20KB mantienen performance
   - Knowledge graph requiere limpieza regular
   - MCP-first policy ahorra tokens

## Próximos Pasos

1. **Monitoreo:**
   - Ejecutar `scripts/monitor-pm2.sh` cada hora (cron)
   - Performance baseline semanal

2. **Mantenimiento:**
   - Dependency updates mensuales
   - Knowledge graph cleanup trimestral
   - Snapshot review mensual

3. **Mejoras Futuras:**
   - CI/CD automatizado
   - Performance monitoring dashboard
   - Alertas automáticas (PM2 restarts, memory)

## Referencias

- Plan Completo: project-stabilization/plan-part-*.md
- TODO: project-stabilization/TODO.md
- Workflow: docs/infrastructure/DEVELOPMENT_WORKFLOW.md
- Troubleshooting: docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md
```

---

#### 6.5 Actualizar CLAUDE.md (15min)
**Responsable:** @agent-infrastructure-monitor

**Agregar a CLAUDE.md:**

```markdown
## 🛠️ Post-Stabilization 2025

**Proyecto completado:** 30 Octubre 2025

### New Resources
- **Workflow:** `docs/infrastructure/DEVELOPMENT_WORKFLOW.md`
- **Troubleshooting:** `docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md`
- **Pre-Deploy:** `project-stabilization/PRE_DEPLOY_CHECKLIST.md`
- **Summary:** `project-stabilization/STABILIZATION_SUMMARY.md`

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

Run measurement: `./scripts/measure-performance.sh`
```

### Testing FASE 6

```bash
# 1. Verificar documentación completa
ls -la project-stabilization/
ls -la docs/infrastructure/DEVELOPMENT_WORKFLOW.md
ls -la docs/troubleshooting/STABILIZATION_TROUBLESHOOTING.md

# 2. Verificar scripts npm
npm run | grep "env:"
npm run | grep "deploy:"

# 3. Test workflow
npm run env:staging
npm run validate-env
# Expected: ✅ Staging environment

# 4. Test checklist
cat project-stabilization/PRE_DEPLOY_CHECKLIST.md
# Verify completeness
```

### Criterios de Éxito FASE 6

- ✅ DEVELOPMENT_WORKFLOW.md completo
- ✅ STABILIZATION_TROUBLESHOOTING.md completo
- ✅ PRE_DEPLOY_CHECKLIST.md completo
- ✅ STABILIZATION_SUMMARY.md completo
- ✅ CLAUDE.md actualizado
- ✅ Todas las referencias correctas

---

## 🎯 CRITERIOS DE ÉXITO - PROYECTO COMPLETO

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
- ✅ `--legacy-peer-deps` removido (o documentado por qué no)
- ✅ Tests pasando (100%)
- ✅ TypeScript errors: 0

### Documentación

- ✅ 6 fases documentadas
- ✅ Workflow de desarrollo completo
- ✅ Troubleshooting guide
- ✅ Pre-deploy checklist
- ✅ MCP usage guide
- ✅ Migration guides (dependencies)
- ✅ CLAUDE.md actualizado

### Mantenibilidad

- ✅ Scripts de utilidad creados (8+)
- ✅ Tests automatizados
- ✅ Monitoring scripts
- ✅ Rollback plan documentado
- ✅ Knowledge graph limpio

---

## 🤖 AGENTES REQUERIDOS

### 1. @agent-infrastructure-monitor (Líder)

**Responsabilidades:**
- FASE 1: Diagnóstico PM2, configuración, monitoring
- FASE 2: Branch strategy, toggle scripts, deployment
- FASE 4: MCP optimization, snapshots, knowledge graph
- FASE 6: Documentación workflow, consolidación

**Archivos Clave:**
- `ecosystem.config.js`
- `scripts/toggle-env.sh`
- `scripts/monitor-pm2.sh`
- `snapshots/*.md`
- `docs/infrastructure/DEVELOPMENT_WORKFLOW.md`

---

### 2. @agent-backend-developer

**Responsabilidades:**
- FASE 1: Fix tenant query (`.maybeSingle()`)
- FASE 3: Dependency updates (todos los grupos)
- FASE 3: Breaking changes migration (LangChain, OpenAI)
- FASE 5: Build warnings, optimizaciones

**Archivos Clave:**
- `src/lib/tenant/tenant.ts`
- `src/lib/ai/langchain.ts`
- `src/lib/ai/openai.ts`
- `package.json`
- `next.config.js`

---

### 3. @agent-database-agent (Consultor)

**Responsabilidades:**
- FASE 1: Consultor en tenant queries
- FASE 2: Validar Supabase connections
- FASE 4: MCP Supabase testing

**Archivos Clave:**
- `src/lib/tenant/tenant.ts`
- MCP tools (Supabase)

---

### 4. @agent-deploy-agent (Consultor)

**Responsabilidades:**
- FASE 2: Deploy scripts (dev, staging)
- FASE 6: Pre-deploy checklist

**Archivos Clave:**
- `scripts/deploy-dev.sh`
- `scripts/deploy-staging.sh`
- `project-stabilization/PRE_DEPLOY_CHECKLIST.md`

---

### 5. @agent-ux-interface (Consultor)

**Responsabilidades:**
- FASE 5: Performance baseline (consultor)
- FASE 5: Bundle size optimization

**Archivos Clave:**
- `next.config.js`
- Components con lazy loading

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
muva-chat/
├── project-stabilization/
│   ├── README.md                          # Índice principal
│   ├── plan-part-1.md                     # Overview + Estado Actual
│   ├── plan-part-2.md                     # Fases 1-3
│   ├── plan-part-3.md                     # Fases 4-6 (este archivo)
│   ├── TODO.md                            # Tareas por fase
│   ├── workflow-part-1.md                 # Prompts: Contexto + Fase 1
│   ├── workflow-part-2.md                 # Prompts: Fases 2-3
│   ├── workflow-part-3.md                 # Prompts: Fases 4-6
│   ├── PRE_DEPLOY_CHECKLIST.md           # Pre-deploy checklist
│   ├── STABILIZATION_SUMMARY.md          # Resumen final
│   └── docs/
│       ├── fase-1/
│       │   ├── PM2_DIAGNOSTIC_REPORT.md
│       │   ├── TENANT_QUERY_FIX.md
│       │   └── STABILITY_TEST_RESULTS.md
│       ├── fase-2/
│       │   ├── BRANCH_STRATEGY.md
│       │   ├── ENVIRONMENT_SETUP.md
│       │   └── DEPLOYMENT_WORKFLOW.md
│       ├── fase-3/
│       │   ├── DEPENDENCY_UPDATE_PLAN.md
│       │   ├── BREAKING_CHANGES_LOG.md
│       │   └── MIGRATION_GUIDE.md
│       ├── fase-4/
│       │   ├── MCP_OPTIMIZATION_REPORT.md
│       │   ├── SNAPSHOT_CLEANUP_LOG.md
│       │   └── MCP_USAGE_GUIDE.md
│       ├── fase-5/
│       │   ├── BUILD_WARNINGS_REPORT.md
│       │   ├── PERFORMANCE_BASELINE.md
│       │   └── OPTIMIZATION_LOG.md
│       └── fase-6/
│           └── (consolidación de docs)
│
├── scripts/
│   ├── toggle-env.sh                      # NEW
│   ├── validate-env.sh                    # NEW
│   ├── deploy-dev.sh                      # NEW
│   ├── deploy-staging.sh                  # NEW
│   ├── test-pm2-stability.sh             # NEW
│   ├── monitor-pm2.sh                     # NEW
│   ├── measure-performance.sh            # NEW
│   └── test-performance.sh               # NEW
│
├── docs/
│   ├── infrastructure/
│   │   └── DEVELOPMENT_WORKFLOW.md       # NEW
│   └── troubleshooting/
│       └── STABILIZATION_TROUBLESHOOTING.md  # NEW
│
├── snapshots/                             # UPDATED (cleaned)
│   ├── agent-backend-developer.md
│   ├── agent-database-agent.md
│   ├── agent-infrastructure-monitor.md
│   ├── agent-deploy-agent.md
│   └── agent-ux-interface.md
│
├── CLAUDE.md                              # UPDATED
├── package.json                           # UPDATED (scripts, deps)
├── ecosystem.config.js                    # UPDATED (PM2 config)
└── next.config.js                         # UPDATED (optimizations)
```

---

## 📌 NOTAS IMPORTANTES

### Dependencias de Fases

```
FASE 1 (Critical) → FASE 2 (Branches) → FASE 3 (Dependencies)
                                             ↓
                    FASE 4 (MCP) ← ← ← ← ← ← ←
                         ↓
                    FASE 5 (Warnings)
                         ↓
                    FASE 6 (Docs)
```

**Recomendación:** Ejecutar fases en orden secuencial.

### Puntos de Validación

Después de cada fase, validar:
1. ✅ Build exitoso
2. ✅ Tests pasando
3. ✅ Documentación generada
4. ✅ Cambios commiteados (si aprobado)

### Rollback Plan

Si cualquier fase falla:
```bash
# Rollback git
git checkout HEAD~1 {archivos afectados}

# Rollback dependencies
git checkout HEAD~1 package.json package-lock.json
npm install --legacy-peer-deps

# Rebuild
npm run build
```

### Comunicación con Usuario

**NUNCA commitear sin autorización explícita.**

Al final de cada fase:
1. Reportar qué se hizo
2. Mostrar resultados de tests
3. Preguntar si commitear
4. Si autorizado, commitear con mensaje descriptivo

---

**Última actualización:** 30 Octubre 2025
