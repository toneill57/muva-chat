# Cost Monitoring System - Plan de Implementación

**Proyecto:** AI Cost Monitoring & Tracking
**Fecha Inicio:** 2025-10-03
**Estado:** 📋 Planificación → Ejecución

---

## 🎯 OVERVIEW

### Objetivo Principal
Implementar sistema completo de monitoreo y tracking de costos para APIs de AI (Anthropic Claude + OpenAI), permitiendo visibilidad en tiempo real del gasto, análisis de uso, y alertas proactivas de anomalías.

### ¿Por qué?
- **Validación de costos**: Actualmente no hay forma de verificar el target de $0.33/mes para 100 sesiones
- **Control presupuestario**: Sin monitoring, el gasto puede crecer sin control
- **Optimización**: Necesitamos datos para identificar oportunidades de ahorro
- **Compliance**: Detectar anomalías antes de que generen costos significativos (>$10/día)

### Alcance
- ✅ Track de compresiones (Claude Haiku): tokens, costo estimado, timestamp
- ✅ Track de embeddings (OpenAI): dimensiones, costo estimado, cache hits/misses
- ✅ Almacenamiento en Supabase: tabla `ai_usage_metrics` con RLS
- ✅ API para consultar métricas: `/api/metrics` (agregados diarios/mensuales)
- ✅ Sistema de alertas: Threshold configurable (default: $10/día)
- ✅ Dashboard básico (opcional): Visualización de costos en tiempo real
- ❌ NO incluye: Integración con Stripe, facturación, billing automático

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Conversation Memory implementado y funcional
- ✅ Compresión con Claude Haiku (`conversation-compressor.ts`)
- ✅ Embeddings con OpenAI (`text-embedding-3-large`)
- ✅ Supabase configurado con RLS policies
- ✅ ANTHROPIC_API_KEY y OPENAI_API_KEY configurados

### Limitaciones Actuales
- ❌ No hay tracking de costos de AI APIs
- ❌ No se puede validar el target de $0.33/mes
- ❌ Sin visibilidad de tokens consumidos por día/mes
- ❌ Sin alertas de anomalías (ej: spike de compressions)
- ❌ Sin forma de calcular ROI o cost per session

**Evidencia del problema** (de VALIDATION.md):
```
ISSUE #3: No Production Cost Monitoring
- Missing: Compression count per day/month
- Missing: Embedding API calls (OpenAI usage)
- Missing: Average tokens per compression
- Missing: Cost per session lifecycle
```

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia
Sistema de monitoring transparente que permite a desarrolladores y stakeholders:
1. Ver costos en tiempo real (dashboard o API)
2. Recibir alertas proactivas si el gasto excede thresholds
3. Analizar uso histórico (compressions/día, embeddings/día)
4. Validar targets de costo ($0.33/mes para 100 sesiones)
5. Identificar oportunidades de optimización (ej: cache hit rate bajo)

### Características Clave
- **Real-time tracking**: Cada compression/embedding logea métricas instantáneamente
- **Granular metrics**: Tokens input/output, costo estimado, modelo usado, timestamp
- **Aggregation**: Resúmenes diarios/mensuales con trends
- **Alerts**: Notificaciones cuando se exceden umbrales ($10/día default)
- **Cost breakdown**: Por servicio (Claude vs OpenAI), por sesión, por tenant

---

## 📱 TECHNICAL STACK

### Backend
- **TypeScript/Node.js** - Lógica de tracking y cálculo de costos
- **Supabase (PostgreSQL)** - Almacenamiento de métricas con RLS
- **Next.js API Routes** - Endpoints para consultar métricas

### AI APIs (costos a trackear)
- **Anthropic Claude Haiku**: $1/1M input tokens, $5/1M output tokens
- **OpenAI text-embedding-3-large**: $0.13/1M tokens (1024d)

### Monitoring (futuro)
- **Grafana/DataDog (opcional)**: Dashboards avanzados
- **Slack/Email (opcional)**: Alertas automáticas

---

## 🔧 DESARROLLO - FASES

### FASE 1: Cost Tracking Core (2h)
**Objetivo:** Implementar sistema base de tracking de costos para AI APIs

**Entregables:**
- `src/lib/cost-tracker.ts` - Módulo central de tracking con funciones:
  - `trackCompression(tokens, model, sessionId)` → calcula costo y logea
  - `trackEmbedding(tokens, model, sessionId)` → calcula costo y logea
  - `calculateCost(usage, model)` → pricing hardcodeado por modelo
- Modificar `src/lib/conversation-compressor.ts`:
  - Agregar `await trackCompression(...)` después de cada compresión exitosa
  - Logear tokens: `response.usage.input_tokens`, `response.usage.output_tokens`
- Migración Supabase: `supabase/migrations/YYYYMMDDHHMMSS_create_ai_usage_metrics.sql`
  - Tabla: `ai_usage_metrics` (id, timestamp, service, model, tokens_in, tokens_out, cost_usd, session_id, tenant_id)
  - RLS policy: Users can view own tenant metrics
  - Indexes: (timestamp, tenant_id), (session_id)

**Archivos a crear:**
- `src/lib/cost-tracker.ts` (nuevo)
- `supabase/migrations/YYYYMMDDHHMMSS_create_ai_usage_metrics.sql` (nuevo)

**Archivos a modificar:**
- `src/lib/conversation-compressor.ts` (agregar tracking después de línea 131)

**Testing:**
- Unit test: `src/lib/__tests__/cost-tracker.test.ts`
  - Test pricing calculation (Haiku: 450 input, 180 output → $0.00135)
  - Test database insertion
- Integration test: Comprimir conversación y verificar entry en `ai_usage_metrics`

---

### FASE 2: Embedding Cost Tracking (1.5h)
**Objetivo:** Extender tracking para incluir costos de embeddings (OpenAI)

**Entregables:**
- Modificar `src/lib/conversation-compressor.ts`:
  - Función `generateEmbeddingForSummary()` (línea ~239)
  - Agregar `await trackEmbedding(...)` después de generación exitosa
  - Calcular tokens: `summary.length / 4` (aproximación, OpenAI usa ~4 chars/token)
- Modificar `src/lib/conversation-memory-search.ts`:
  - Agregar tracking en búsqueda cuando hay cache MISS (línea 62)
  - `await trackEmbedding(...)` después de `generateEmbeddingForSummary()`
- Actualizar `cost-tracker.ts`:
  - Agregar soporte para modelo `text-embedding-3-large` ($0.13/1M tokens)
  - Calcular costo: `(tokens / 1_000_000) * 0.13`

**Archivos a modificar:**
- `src/lib/cost-tracker.ts` (agregar pricing para embeddings)
- `src/lib/conversation-compressor.ts` (línea ~245, después de embedding)
- `src/lib/conversation-memory-search.ts` (línea ~62, en cache miss)

**Testing:**
- Test: Generar embedding y verificar entry con `service: 'openai'`
- Test: Verificar que cache HIT no genera entry (no cost si cached)
- Test: Calcular costo correcto para 1000 tokens → $0.00013

---

### FASE 3: Metrics API & Aggregation (2h)
**Objetivo:** Crear API para consultar métricas agregadas (diarias/mensuales)

**Entregables:**
- `src/app/api/metrics/route.ts` - GET endpoint con query params:
  - `?period=day|week|month` - Periodo de agregación
  - `?service=anthropic|openai|all` - Filtrar por servicio
  - Response: `{ total_cost, breakdown: [...], usage_count }`
- `src/lib/metrics-aggregator.ts` - Funciones de agregación:
  - `getDailyCosts(tenantId, date)` → suma costos del día
  - `getMonthlyCosts(tenantId, year, month)` → suma costos del mes
  - `getServiceBreakdown(tenantId, period)` → breakdown por servicio
- Supabase RPC function: `supabase/migrations/YYYYMMDDHHMMSS_create_cost_aggregation_rpc.sql`
  - `get_cost_summary(tenant_id, start_date, end_date)` → retorna agregados

**Archivos a crear:**
- `src/app/api/metrics/route.ts` (nuevo)
- `src/lib/metrics-aggregator.ts` (nuevo)
- `supabase/migrations/YYYYMMDDHHMMSS_create_cost_aggregation_rpc.sql` (nuevo)

**Testing:**
- Test API: `curl /api/metrics?period=day` → retorna JSON válido
- Test: Insertar 10 entries, verificar suma correcta en agregación
- Test: Filtrar por servicio `?service=anthropic` → solo Claude costs

---

### FASE 4: Alerts & Monitoring (1.5h)
**Objetivo:** Sistema de alertas para detectar anomalías de costo

**Entregables:**
- `src/lib/cost-alerts.ts` - Sistema de alertas:
  - `checkDailyThreshold(tenantId, threshold)` → compara gasto del día con threshold
  - `triggerAlert(type, message, cost)` → logea alerta (console por ahora, futuro: Slack/email)
  - Default threshold: $10/día
- Modificar `cost-tracker.ts`:
  - Después de cada track, llamar `checkDailyThreshold()`
  - Si excede, trigger alert: `⚠️ Daily cost threshold exceeded: $12.50 > $10.00`
- Script de análisis: `scripts/analyze-costs.ts`
  - CLI tool para generar reportes de costos
  - Usage: `npx tsx scripts/analyze-costs.ts --period month`
  - Output: Tabla con breakdown por día, servicio, y total
- Documentación final: `docs/cost-monitoring/fase-4/ALERTS.md`
  - Cómo configurar thresholds
  - Cómo interpretar alertas
  - Cómo integrar con Slack/email (futuro)

**Archivos a crear:**
- `src/lib/cost-alerts.ts` (nuevo)
- `scripts/analyze-costs.ts` (nuevo)
- `docs/cost-monitoring/fase-4/ALERTS.md` (nuevo)

**Archivos a modificar:**
- `src/lib/cost-tracker.ts` (agregar check de threshold después de track)

**Testing:**
- Test: Insertar entries que suman $11 en un día → debe trigger alert
- Test: Threshold personalizado ($5/día) → alert a $6
- Test: Script de análisis retorna datos correctos para mes completo

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Sistema trackea 100% de compresiones con costo exacto
- [ ] Sistema trackea 100% de embeddings (excepto cache hits)
- [ ] API `/api/metrics` retorna datos agregados correctamente
- [ ] Alertas se disparan cuando se excede threshold ($10/día)
- [ ] Cache hits NO generan costo (correctamente excluidos)
- [ ] Multi-tenant: Cada tenant ve solo sus costos (RLS funciona)

### Performance
- [ ] Tracking no agrega >5ms de latency a compression
- [ ] Tracking no agrega >2ms de latency a embedding
- [ ] API `/api/metrics` responde en <200ms (agregación eficiente)
- [ ] Database size: <100MB para 1M entries (schema optimizado)

### Precisión de Costos
- [ ] Costo calculado match con pricing real de APIs (±5% error)
- [ ] Compression: 450 input + 180 output tokens → $0.00135 (Haiku)
- [ ] Embedding: 1000 tokens → $0.00013 (OpenAI text-embedding-3-large)
- [ ] Total mensual para 100 sesiones: $0.30-$0.45 (validado)

### Calidad de Código
- [ ] Tests unitarios: 90%+ coverage en cost-tracker
- [ ] Tests de integración: 100% de flujos críticos cubiertos
- [ ] TypeScript: 0 errores, tipos estrictos
- [ ] Documentación: README en docs/cost-monitoring/ con ejemplos

---

## 🤖 AGENTES REQUERIDOS

### 1. **backend-developer** (Principal)
**Responsabilidad:** Implementación completa del sistema de cost monitoring

**Tareas:**
- FASE 1: Crear cost-tracker.ts, migración DB, modificar compressor
- FASE 2: Extender tracking a embeddings, actualizar search
- FASE 3: Implementar API de métricas, agregación, RPC functions
- FASE 4: Sistema de alertas, script de análisis, documentación

**Archivos:**
- `src/lib/cost-tracker.ts` (crear)
- `src/lib/conversation-compressor.ts` (modificar)
- `src/lib/conversation-memory-search.ts` (modificar)
- `src/lib/metrics-aggregator.ts` (crear)
- `src/lib/cost-alerts.ts` (crear)
- `src/app/api/metrics/route.ts` (crear)
- `supabase/migrations/*.sql` (crear 2 migraciones)
- `scripts/analyze-costs.ts` (crear)

### 2. **database-agent** (Soporte)
**Responsabilidad:** Validar schema, RLS policies, y performance de queries

**Tareas:**
- FASE 1: Review migración `ai_usage_metrics`, validar indexes
- FASE 3: Review RPC function `get_cost_summary`, optimizar query
- FASE 4: Validar que queries de aggregation usan indexes correctamente

**Archivos:**
- `supabase/migrations/*.sql` (review)

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── src/
│   ├── lib/
│   │   ├── cost-tracker.ts              # [CREAR] Sistema central tracking
│   │   ├── metrics-aggregator.ts        # [CREAR] Agregación de métricas
│   │   ├── cost-alerts.ts               # [CREAR] Sistema de alertas
│   │   ├── conversation-compressor.ts   # [MODIFICAR] Agregar tracking
│   │   └── conversation-memory-search.ts # [MODIFICAR] Track embeddings
│   ├── app/
│   │   └── api/
│   │       └── metrics/
│   │           └── route.ts             # [CREAR] API endpoint
│   └── lib/
│       └── __tests__/
│           ├── cost-tracker.test.ts     # [CREAR] Unit tests
│           └── metrics-aggregator.test.ts # [CREAR] Tests agregación
├── supabase/
│   └── migrations/
│       ├── YYYYMMDDHHMMSS_create_ai_usage_metrics.sql  # [CREAR]
│       └── YYYYMMDDHHMMSS_create_cost_aggregation_rpc.sql # [CREAR]
├── scripts/
│   └── analyze-costs.ts                 # [CREAR] CLI tool análisis
└── docs/
    └── cost-monitoring/
        ├── fase-1/
        │   ├── IMPLEMENTATION.md
        │   ├── CHANGES.md
        │   └── TESTS.md
        ├── fase-2/
        │   └── ...
        ├── fase-3/
        │   └── ...
        ├── fase-4/
        │   ├── ALERTS.md
        │   └── USAGE.md
        └── README.md                    # Guía completa del sistema
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**Pricing Hardcoded (Oct 2025)**
- Claude Haiku 3.5: $1/1M input, $5/1M output
- OpenAI text-embedding-3-large: $0.13/1M tokens
- **IMPORTANTE**: Pricing puede cambiar. Documentar en README cómo actualizar.

**Aproximación de Tokens (Embeddings)**
- OpenAI no retorna token count en response
- Usamos aproximación: `summary.length / 4` (1 token ≈ 4 chars en español)
- Precisión: ±10% (aceptable para estimación de costos)

**RLS Policies**
- `ai_usage_metrics` debe tener RLS para multi-tenant isolation
- Policy: `tenant_id = current_setting('app.current_tenant')`
- Admin puede ver todos (service role bypasses RLS)

**Performance**
- Tracking es async, no bloquea response al usuario
- Usar `Promise.allSettled()` para evitar crashes si DB falla
- Logging de errores: `console.error('[cost-tracker] Failed to log:', error)`

**Cache Hits (OpenAI)**
- Cache hits NO deben generar cost entry (embedding ya existe)
- Solo trackear en `embeddingCache.get()` returns `null` (cache miss)
- Verificar: `conversation-memory-search.ts` línea 60-66

**Alert Fatigue**
- Evitar alertas repetidas (max 1 alerta por hora por threshold)
- Implementar debouncing: `lastAlertTimestamp` en memoria/DB
- Futuro: Configurar diferentes thresholds por tenant

**Migration Strategy**
- Backfill histórico NO es necesario (empezar tracking desde deploy)
- Si hay datos legacy: Crear script de estimación basado en `conversation_memory.message_count`

---

**Última actualización:** 2025-10-03
**Próximo paso:** Actualizar TODO.md con tareas específicas por fase
