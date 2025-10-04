# TODO - Cost Monitoring System

**Proyecto:** AI Cost Monitoring & Tracking
**Fecha:** 2025-10-03
**Plan:** Ver `plan.md` para contexto completo (364 líneas, 4 fases)

---

## FASE 1: Cost Tracking Core 🎯

### 1.1 Crear módulo central de tracking
- [ ] Crear `src/lib/cost-tracker.ts` con funciones core (estimado: 1h)
  - `trackCompression(usage, model, sessionId, tenantId)` → calcula costo y logea
  - `trackEmbedding(tokens, model, sessionId, tenantId)` → calcula costo y logea
  - `calculateCost(usage, model)` → pricing hardcodeado:
    - Claude Haiku 3.5: $1/1M input, $5/1M output
    - OpenAI text-embedding-3-large: $0.13/1M tokens
  - Error handling: `Promise.allSettled()` para evitar crashes
  - Logging: `[cost-tracker]` prefix para debugging
  - Files: `src/lib/cost-tracker.ts`
  - Agent: **backend-developer**
  - Test: `npm test src/lib/__tests__/cost-tracker.test.ts`

### 1.2 Crear migración de base de datos
- [ ] Crear tabla `ai_usage_metrics` en Supabase (estimado: 30min)
  - Campos: id, timestamp, service ('anthropic'|'openai'), model, tokens_in, tokens_out, cost_usd, session_id, tenant_id
  - RLS policy: `tenant_id = current_setting('app.current_tenant')` (multi-tenant isolation)
  - Indexes: (timestamp, tenant_id) para queries rápidas, (session_id) para lookups
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_create_ai_usage_metrics.sql`
  - Agent: **backend-developer** + **database-agent** (review)
  - Test: `npx supabase db diff` → verificar schema correcto

### 1.3 Integrar tracking en compressor
- [ ] Modificar `conversation-compressor.ts` para trackear costos (estimado: 30min)
  - Después de línea 131 (response exitoso):
    ```typescript
    await trackCompression(
      {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      },
      'claude-3-5-haiku-latest',
      sessionId,
      tenantId
    )
    ```
  - Importar: `import { trackCompression } from './cost-tracker'`
  - Wrap en try/catch para no afectar UX si falla
  - Files: `src/lib/conversation-compressor.ts` (línea ~131)
  - Agent: **backend-developer**
  - Test: Comprimir conversación y verificar entry en `ai_usage_metrics`

### 1.4 Tests unitarios de tracking
- [ ] Crear suite de tests para cost-tracker (estimado: 30min)
  - Test: Pricing calculation (Haiku: 450 input + 180 output → $0.00135)
  - Test: Pricing calculation (OpenAI: 1000 tokens → $0.00013)
  - Test: Database insertion exitosa
  - Test: Error handling (DB falla → no crashea)
  - Files: `src/lib/__tests__/cost-tracker.test.ts`
  - Agent: **backend-developer**
  - Test: `npm test -- cost-tracker`

---

## FASE 2: Embedding Cost Tracking ⚙️

### 2.1 Trackear embeddings en compressor
- [ ] Modificar `generateEmbeddingForSummary()` para trackear (estimado: 30min)
  - Después de línea ~245 (embedding exitoso):
    ```typescript
    const estimatedTokens = Math.ceil(summary.length / 4) // Aprox: 4 chars/token
    await trackEmbedding(estimatedTokens, 'text-embedding-3-large', sessionId, tenantId)
    ```
  - Importar: `import { trackEmbedding } from './cost-tracker'`
  - Files: `src/lib/conversation-compressor.ts` (línea ~245)
  - Agent: **backend-developer**
  - Test: Generar embedding y verificar entry con `service: 'openai'`

### 2.2 Trackear embeddings en search (cache miss)
- [ ] Modificar `conversation-memory-search.ts` para trackear (estimado: 30min)
  - Solo en cache MISS (línea 60-62):
    ```typescript
    if (!queryEmbedding) {
      queryEmbedding = await generateEmbeddingForSummary(query)
      embeddingCache.set(query, queryEmbedding)
      
      // Track cost (solo cache miss)
      const estimatedTokens = Math.ceil(query.length / 4)
      await trackEmbedding(estimatedTokens, 'text-embedding-3-large', sessionId, tenantId)
    }
    ```
  - **IMPORTANTE**: Cache HIT no debe generar cost entry
  - Files: `src/lib/conversation-memory-search.ts` (línea 60-66)
  - Agent: **backend-developer**
  - Test: Verificar cache HIT no genera entry, cache MISS sí genera

### 2.3 Actualizar cost-tracker con pricing de embeddings
- [ ] Agregar soporte para modelo `text-embedding-3-large` (estimado: 15min)
  - Precio: $0.13/1M tokens
  - Cálculo: `(tokens / 1_000_000) * 0.13`
  - Files: `src/lib/cost-tracker.ts` (función `calculateCost`)
  - Agent: **backend-developer**
  - Test: `calculateCost(1000, 'text-embedding-3-large')` → $0.00013

### 2.4 Tests de integración embeddings
- [ ] Tests end-to-end de tracking de embeddings (estimado: 30min)
  - Test: Comprimir + embedding → 2 entries (1 compression + 1 embedding)
  - Test: Búsqueda con cache hit → 0 entries adicionales
  - Test: Búsqueda con cache miss → 1 entry embedding
  - Test: Total cost correcto (sum de compression + embedding)
  - Files: `src/lib/__tests__/cost-tracker.test.ts`
  - Agent: **backend-developer**
  - Test: `npm test -- cost-tracker`

---

## FASE 3: Metrics API & Aggregation ✨

### 3.1 Crear API endpoint de métricas
- [ ] Implementar `/api/metrics` GET endpoint (estimado: 1h)
  - Query params:
    - `?period=day|week|month` (default: day)
    - `?service=anthropic|openai|all` (default: all)
    - `?date=YYYY-MM-DD` (default: today)
  - Response:
    ```json
    {
      "total_cost": 0.45,
      "breakdown": [
        { "service": "anthropic", "cost": 0.30, "count": 300 },
        { "service": "openai", "cost": 0.15, "count": 300 }
      ],
      "usage_count": 600,
      "period": "month"
    }
    ```
  - Files: `src/app/api/metrics/route.ts`
  - Agent: **backend-developer**
  - Test: `curl http://localhost:3000/api/metrics?period=day` → retorna JSON válido

### 3.2 Crear módulo de agregación
- [ ] Implementar `metrics-aggregator.ts` con funciones (estimado: 45min)
  - `getDailyCosts(tenantId, date)` → suma costos del día
  - `getMonthlyCosts(tenantId, year, month)` → suma costos del mes
  - `getServiceBreakdown(tenantId, period)` → breakdown por servicio (anthropic vs openai)
  - Usar RPC function de Supabase para performance
  - Files: `src/lib/metrics-aggregator.ts`
  - Agent: **backend-developer**
  - Test: Insertar 10 entries, verificar suma correcta

### 3.3 Crear RPC function para agregación
- [ ] Migración con `get_cost_summary` RPC (estimado: 30min)
  - Function signature: `get_cost_summary(p_tenant_id UUID, p_start_date DATE, p_end_date DATE)`
  - Return: `TABLE(service TEXT, total_cost DECIMAL, count BIGINT)`
  - Query optimizado con indexes (timestamp, tenant_id)
  - Files: `supabase/migrations/YYYYMMDDHHMMSS_create_cost_aggregation_rpc.sql`
  - Agent: **backend-developer** + **database-agent** (review)
  - Test: Ejecutar RPC con datos de prueba → retorna agregados correctos

### 3.4 Tests de API
- [ ] Suite de tests para `/api/metrics` (estimado: 30min)
  - Test: `/api/metrics?period=day` → retorna day aggregation
  - Test: `/api/metrics?period=month` → retorna month aggregation
  - Test: `/api/metrics?service=anthropic` → solo Claude costs
  - Test: `/api/metrics?service=openai` → solo OpenAI costs
  - Test: Response time <200ms (performance target)
  - Files: `src/app/api/metrics/__tests__/route.test.ts`
  - Agent: **backend-developer**
  - Test: `npm test -- api/metrics`

---

## FASE 4: Alerts & Monitoring 🎨

### 4.1 Crear sistema de alertas
- [ ] Implementar `cost-alerts.ts` con threshold checks (estimado: 45min)
  - `checkDailyThreshold(tenantId, threshold)` → compara gasto del día vs threshold
  - `triggerAlert(type, message, cost)` → logea alerta (console.warn por ahora)
  - Default threshold: $10/día
  - Debouncing: Max 1 alerta por hora (evitar spam)
  - Files: `src/lib/cost-alerts.ts`
  - Agent: **backend-developer**
  - Test: Insertar entries que suman $11 → debe trigger alert

### 4.2 Integrar alertas en cost-tracker
- [ ] Modificar `cost-tracker.ts` para check thresholds (estimado: 20min)
  - Después de cada `trackCompression()` o `trackEmbedding()`:
    ```typescript
    await checkDailyThreshold(tenantId, 10.00) // $10/día default
    ```
  - Alert format: `⚠️ Daily cost threshold exceeded: $12.50 > $10.00`
  - Files: `src/lib/cost-tracker.ts` (después de DB insert)
  - Agent: **backend-developer**
  - Test: Simular spike de costos → verificar alert en console

### 4.3 Crear script de análisis de costos
- [ ] CLI tool para reportes de costos (estimado: 45min)
  - Command: `npx tsx scripts/analyze-costs.ts --period month`
  - Output: Tabla con breakdown por día, servicio, y total
  - Params: `--period day|week|month`, `--service anthropic|openai|all`
  - Export: Opción `--export csv` para guardar reporte
  - Files: `scripts/analyze-costs.ts`
  - Agent: **backend-developer**
  - Test: `npx tsx scripts/analyze-costs.ts --period month` → genera tabla correcta

### 4.4 Documentación de alertas
- [ ] Crear guía completa de alertas y monitoring (estimado: 30min)
  - Cómo configurar thresholds personalizados
  - Cómo interpretar alertas (normal vs anomalía)
  - Cómo integrar con Slack/email (futuro roadmap)
  - Troubleshooting: ¿Por qué no recibo alertas?
  - Files: `docs/cost-monitoring/fase-4/ALERTS.md`
  - Agent: **backend-developer**
  - Test: Review manual de README → claro y completo

### 4.5 Tests de alertas
- [ ] Suite de tests para sistema de alertas (estimado: 30min)
  - Test: Threshold $5/día → alert a $6
  - Test: Threshold $10/día → alert a $11, no alert a $9
  - Test: Debouncing funciona (max 1 alert/hora)
  - Test: Multi-tenant: alerts separados por tenant
  - Files: `src/lib/__tests__/cost-alerts.test.ts`
  - Agent: **backend-developer**
  - Test: `npm test -- cost-alerts`

---

## 📊 PROGRESO

**Total Tasks:** 17
**Completed:** 0/17 (0%)

**Por Fase:**
- FASE 1: 0/4 tareas (Cost Tracking Core)
- FASE 2: 0/4 tareas (Embedding Cost Tracking)
- FASE 3: 0/4 tareas (Metrics API & Aggregation)
- FASE 4: 0/5 tareas (Alerts & Monitoring)

**Tiempo estimado total:** 7 horas

---

**Última actualización:** 2025-10-03
