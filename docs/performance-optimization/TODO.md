# Performance Optimization - Task Tracking

**Proyecto:** MUVA Chat Performance & Cost Optimization
**Estado Global:** 0% (0/23 tareas completadas)
**Última actualización:** 2025-11-06

---

## 📊 RESUMEN EJECUTIVO

| Fase | Tareas | Completadas | Progreso | Tiempo Estimado |
|------|--------|-------------|----------|-----------------|
| FASE 1 | 4 | 0 | 0% ⏳ | 4-6h |
| FASE 2 | 4 | 0 | 0% ⏳ | 4-5h |
| FASE 3 | 5 | 0 | 0% ⏳ | 5-6h |
| FASE 4 | 4 | 0 | 0% ⏳ | 4-5h |
| FASE 5 | 4 | 0 | 0% ⏳ | 3-4h |
| **TOTAL** | **21** | **0** | **0%** | **20-26h** |

---

## 🎯 FASE 1: Performance Baseline & Profiling ⏳

**Objetivo:** Establecer métricas medibles de rendimiento actual

**Agente:** @agent-backend-developer
**Prioridad:** 🔴 CRÍTICA
**Tiempo:** 4-6h
**Estado:** ⏳ En progreso

### Tareas

- [ ] **1.1** Implementar middleware de timing para API routes (90 min)
  - Crear `src/middleware/performance-logger.ts`
  - Track response time para cada request
  - Log requests lentos (>2s threshold)
  - Export métricas a JSON file
  - Files: `src/middleware/performance-logger.ts`, `middleware.ts` update
  - Agent: **@agent-backend-developer**
  - Test: Request a /api/guest/chat → See timing in logs

- [ ] **1.2** Database query profiling (90 min)
  - Identificar queries con N+1 pattern
  - Revisar índices existentes en Supabase
  - Usar EXPLAIN ANALYZE para queries lentos
  - Documentar slow queries (>500ms)
  - Files: `docs/performance-optimization/BASELINE_METRICS.md`
  - Agent: **@agent-database-agent**
  - Test: Run profiling queries, document findings

- [ ] **1.3** Embedding usage audit (90 min)
  - Contar llamadas a OpenAI embeddings API
  - Calcular costo mensual proyectado
  - Identificar embeddings duplicados
  - Analizar cache hit rate actual
  - Files: `scripts/audit-embedding-usage.ts`
  - Agent: **@agent-backend-developer**
  - Test: pnpm dlx tsx scripts/audit-embedding-usage.ts

- [ ] **1.4** Crear performance dashboard script (60 min)
  - Script `scripts/performance-dashboard.ts`
  - Visualizar métricas en tiempo real
  - Exportar reportes a JSON/CSV
  - Integrar con monitoring existente
  - Files: `scripts/performance-dashboard.ts`
  - Agent: **@agent-infrastructure-monitor**
  - Test: pnpm dlx tsx scripts/performance-dashboard.ts

---

## 🗄️ FASE 2: Database Optimization ⏳

**Objetivo:** Reducir overhead de queries en 30%

**Agente:** @agent-database-agent
**Prioridad:** 🟡 ALTA
**Tiempo:** 4-5h
**Estado:** ⏸️ Bloqueada por FASE 1

### Tareas

- [ ] **2.1** Optimización de índices (90 min)
  - Agregar índices para WHERE clauses frecuentes
  - Crear índices compuestos para multi-column queries
  - Verificar con EXPLAIN ANALYZE
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_add_performance_indexes.sql`
  - Agent: **@agent-database-agent**
  - Test: Compare query times antes/después

- [ ] **2.2** Consolidación de queries (90 min)
  - Combinar múltiples SELECT queries
  - Usar JOINs en lugar de queries separados
  - Implementar batching para bulk operations
  - Files: Modificar queries en `src/lib/*.ts`
  - Agent: **@agent-backend-developer**
  - Test: Verify same results, measure performance

- [ ] **2.3** Optimización de RPC functions (60 min)
  - Optimizar funciones `match_*` (vector search)
  - Considerar materialized views para queries frecuentes
  - Cachear resultados de queries costosos
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_optimize_rpc_functions.sql`
  - Agent: **@agent-database-agent**
  - Test: Benchmark RPC function performance

- [ ] **2.4** Review de connection pooling (30 min)
  - Verificar límites de conexión Supabase
  - Implementar patrones de reuso de conexiones
  - Documentar best practices
  - Files: `docs/performance-optimization/DATABASE_OPTIMIZATION.md`
  - Agent: **@agent-database-agent**
  - Test: Monitor connection pool usage

---

## 💰 FASE 3: Embedding & AI Cost Optimization ⏳

**Objetivo:** Reducir costos de embeddings en 50%

**Agente:** @agent-backend-developer
**Prioridad:** 🟡 ALTA
**Tiempo:** 5-6h
**Estado:** ⏸️ Bloqueada por FASE 1

### Tareas

- [ ] **3.1** Expandir embedding cache (60 min)
  - Incrementar tamaño cache: 100 → 500 entries
  - Considerar Redis para distributed caching
  - Implementar cache warming para queries comunes
  - Files: `src/lib/embedding-cache.ts`
  - Agent: **@agent-backend-developer**
  - Test: Monitor cache hit rate improvement

- [ ] **3.2** Query deduplication (90 min)
  - Detectar queries semánticamente similares
  - Usar cosine similarity para cache lookup
  - Implementar fuzzy matching
  - Files: `src/lib/embedding-cache.ts`
  - Agent: **@agent-backend-developer**
  - Test: Test with similar queries, verify cache hits

- [ ] **3.3** Pre-generated embeddings (90 min)
  - Generar embeddings para preguntas FAQ
  - Guardar en database para lookup instantáneo
  - Crear script de warmup
  - Files: `scripts/generate-faq-embeddings.ts`, nueva tabla en DB
  - Agent: **@agent-embeddings-generator**
  - Test: Query FAQ → instant response without API call

- [ ] **3.4** Optimización de prompts (90 min)
  - Reducir token count en system prompts
  - Comprimir contexto sin perder calidad
  - A/B test prompts más cortos
  - Files: `src/lib/*-chat-engine.ts`
  - Agent: **@agent-backend-developer**
  - Test: Compare token usage, verify quality maintained

- [ ] **3.5** Model tier optimization (30 min)
  - Usar GPT-4o-mini para queries simples
  - Reservar Claude Sonnet para tareas complejas
  - Implementar intent-based routing
  - Files: `src/lib/model-router.ts` (new)
  - Agent: **@agent-backend-developer**
  - Test: Verify cost reduction, quality maintained

---

## ⚡ FASE 4: API Response Time Optimization ⏳

**Objetivo:** Reducir tiempos de respuesta en 40%

**Agente:** @agent-backend-developer
**Prioridad:** 🟡 ALTA
**Tiempo:** 4-5h
**Estado:** ⏸️ Bloqueada por FASE 1

### Tareas

- [ ] **4.1** Expansión de ejecución paralela (90 min)
  - Identificar operaciones secuenciales que pueden paralelizarse
  - Reemplazar awaits secuenciales con Promise.all
  - Benchmark mejoras
  - Files: Múltiples archivos en `src/lib/`, `src/app/api/`
  - Agent: **@agent-backend-developer**
  - Test: Compare response times antes/después

- [ ] **4.2** Response streaming (90 min)
  - Implementar streaming para chat endpoints
  - Enviar respuestas parciales durante processing
  - Mejorar perceived performance
  - Files: `src/app/api/guest/chat/route.ts`, otros chat endpoints
  - Agent: **@agent-backend-developer**
  - Test: Test streaming in browser, verify UX improvement

- [ ] **4.3** Route-level caching (60 min)
  - Cachear contenido estático (hotel info, policies)
  - Implementar stale-while-revalidate
  - Usar Next.js `unstable_cache` efectivamente
  - Files: Routes en `src/app/api/`
  - Agent: **@agent-backend-developer**
  - Test: Verify cache hits, measure performance

- [ ] **4.4** Lazy loading optimization (60 min)
  - Diferir carga de datos no críticos
  - Implementar paginación para listas grandes
  - Agregar infinite scroll para reservations
  - Files: `src/app/api/reservations/`, frontend components
  - Agent: **@agent-ux-interface**
  - Test: Test with large datasets, verify perceived speed

---

## 📊 FASE 5: Infrastructure & Monitoring ⏳

**Objetivo:** Monitoreo continuo de performance

**Agente:** @agent-infrastructure-monitor
**Prioridad:** 🟢 MEDIA
**Tiempo:** 3-4h
**Estado:** ⏸️ Bloqueada por FASE 4

### Tareas

- [ ] **5.1** Performance monitoring integration (90 min)
  - Agregar a dashboard de monitoring existente
  - Alertas en regresiones de performance
  - Track P50/P95/P99 response times
  - Files: `scripts/monitoring-dashboard.ts` update
  - Agent: **@agent-infrastructure-monitor**
  - Test: Verify alerts trigger correctly

- [ ] **5.2** Load testing suite (90 min)
  - Crear tests con k6 o Artillery
  - Simular 100 concurrent guests
  - Identificar bottlenecks bajo carga
  - Files: `tests/load/` (nuevo directorio)
  - Agent: **@agent-infrastructure-monitor**
  - Test: Run load tests, analyze results

- [ ] **5.3** Performance budget (30 min)
  - Configurar thresholds para CI/CD
  - Fallar builds en regresiones
  - Documentar performance SLAs
  - Files: `.github/workflows/*.yml`, `performance-budget.json`
  - Agent: **@agent-deploy-agent**
  - Test: Trigger build with regression, verify failure

- [ ] **5.4** Documentation & runbooks (30 min)
  - Guía de troubleshooting de performance
  - Best practices de optimización
  - Playbook de monitoreo de costos
  - Files: `docs/performance-optimization/*.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Team review documentation

---

## 📈 Métricas de Éxito

### Baseline (A determinar en FASE 1)
```
✓ API Response Time (P50):    TBD ms
✓ API Response Time (P95):    TBD ms
✓ DB Queries per Request:     TBD
✓ Embedding Calls per Day:    TBD
✓ Cache Hit Rate:             TBD%
✓ Monthly AI Costs:           $TBD
```

### Target (Post-Optimización)
```
→ API Response Time (P50):    -40% reduction
→ API Response Time (P95):    -35% reduction
→ DB Queries per Request:     -30% reduction
→ Embedding Calls per Day:    -50% reduction
→ Cache Hit Rate:             80%+
→ Monthly AI Costs:           -50% reduction
```

---

## 🎯 Próximos Pasos Inmediatos

**FASE 1 - Tarea 1.1:**
Implementar middleware de performance logging para establecer baseline metrics.

**Comando:**
```bash
# Start with FASE 1.1
pnpm dlx tsx scripts/create-performance-middleware.ts
```

---

**Last Updated:** 2025-11-06
**Project Status:** Active - FASE 1 in progress
**Completion:** 0% (0/21 tareas)
