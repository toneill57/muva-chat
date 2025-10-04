# PROMPTS WORKFLOW - Cost Monitoring System

**Proyecto:** AI Cost Monitoring & Tracking  
**Archivos de referencia:** `plan.md` (364 líneas) + `TODO.md` (243 líneas, 17 tareas)

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Cost Monitoring System

Estoy trabajando en el proyecto "Cost Monitoring System" para implementar tracking completo de costos de APIs de AI (Anthropic Claude + OpenAI).

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (364 líneas, 4 fases)
- TODO.md → Tareas organizadas por fases (243 líneas, 17 tareas)
- cost-monitoring-prompt-workflow.md → Este archivo con prompts ejecutables

OBJETIVO:
Implementar sistema que trackea costos de compresión (Claude Haiku) y embeddings (OpenAI), permitiendo visibilidad en tiempo real, análisis histórico, y alertas de anomalías (>$10/día).

STACK:
- TypeScript/Node.js - Lógica de tracking
- Supabase (PostgreSQL + RLS) - Almacenamiento de métricas
- Next.js API Routes - Endpoints para consultar métricas
- Claude Haiku 3.5 - $1/1M input, $5/1M output
- OpenAI text-embedding-3-large - $0.13/1M tokens (1024d)

ESTADO ACTUAL:
- ✅ Conversation Memory implementado
- ✅ BLOCKER #1 resuelto (Anthropic API funciona)
- 🔜 ISSUE #3: No cost monitoring (a implementar)

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 1: Cost Tracking Core (2h) 🎯

### Prompt 1.1: Crear módulo cost-tracker

```
@backend-developer

TAREA: Crear módulo central de tracking de costos para APIs de AI

CONTEXTO:
- Proyecto: Cost Monitoring System (ver plan.md)
- Objetivo: Trackear costos de compresión (Claude) y embeddings (OpenAI)
- Almacenamiento: Supabase tabla `ai_usage_metrics` (crear en 1.2)

ESPECIFICACIONES:

1. Crear: `src/lib/cost-tracker.ts`

Funciones principales:
```typescript
// Track compression costs (Claude Haiku)
export async function trackCompression(
  usage: { input: number; output: number },
  model: string,
  sessionId: string,
  tenantId: string
): Promise<void>

// Track embedding costs (OpenAI)
export async function trackEmbedding(
  tokens: number,
  model: string,
  sessionId: string,
  tenantId: string
): Promise<void>

// Calculate cost based on model pricing
function calculateCost(usage: any, model: string): number {
  // Claude Haiku 3.5: $1/1M input, $5/1M output
  // OpenAI text-embedding-3-large: $0.13/1M tokens
}
```

2. Pricing hardcodeado (Oct 2025):
   - `claude-3-5-haiku-latest`: $1/1M input, $5/1M output
   - `text-embedding-3-large`: $0.13/1M tokens

3. Error handling:
   - Usar `Promise.allSettled()` para evitar crashes
   - Si DB falla, solo logear error: `[cost-tracker] Failed to log: ...`

4. Logging:
   - Prefix: `[cost-tracker]`
   - Ejemplo: `[cost-tracker] Tracked compression: $0.00135 (450 in + 180 out)`

TEST:
- Crear: `src/lib/__tests__/cost-tracker.test.ts`
- Test pricing: 450 input + 180 output → $0.00135
- Test pricing: 1000 tokens embedding → $0.00013
- Ejecutar: `npm test src/lib/__tests__/cost-tracker.test.ts`

SIGUIENTE: Prompt 1.2 para crear migración de base de datos
```

---

### Prompt 1.2: Crear migración ai_usage_metrics

```
@backend-developer + @database-agent

TAREA: Crear tabla `ai_usage_metrics` en Supabase para almacenar métricas de costos

CONTEXTO:
- Ya creamos cost-tracker.ts (Prompt 1.1)
- Necesitamos tabla para persistir métricas
- Multi-tenant: RLS policy por tenant_id

ESPECIFICACIONES:

1. Crear: `supabase/migrations/YYYYMMDDHHMMSS_create_ai_usage_metrics.sql`

Schema:
```sql
CREATE TABLE ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL CHECK (service IN ('anthropic', 'openai')),
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd DECIMAL(10, 6) NOT NULL,
  session_id UUID REFERENCES prospective_sessions(session_id),
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy (multi-tenant isolation)
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant metrics"
  ON ai_usage_metrics FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY "Service can insert metrics"
  ON ai_usage_metrics FOR INSERT
  WITH CHECK (true);

-- Indexes (performance)
CREATE INDEX idx_ai_usage_timestamp_tenant ON ai_usage_metrics(timestamp, tenant_id);
CREATE INDEX idx_ai_usage_session ON ai_usage_metrics(session_id);
```

2. Validar schema:
   - Ejecutar: `npx supabase db diff`
   - Verificar: RLS policies activas
   - Verificar: Indexes creados

TEST:
- Insertar test entry con service role
- Intentar leer con otro tenant → debe fallar (RLS)
- Verificar performance: Query con timestamp/tenant usa index

SIGUIENTE: Prompt 1.3 para integrar tracking en compressor
```

---

### Prompt 1.3: Integrar tracking en compressor

```
@backend-developer

TAREA: Modificar conversation-compressor.ts para trackear costos de compresión

CONTEXTO:
- Ya tenemos: cost-tracker.ts (Prompt 1.1) + tabla ai_usage_metrics (Prompt 1.2)
- Objetivo: Trackear cada compresión exitosa
- Ubicación: Después de respuesta de Claude (línea ~131)

ESPECIFICACIONES:

1. Modificar: `src/lib/conversation-compressor.ts`

Agregar después de línea 131 (dentro del try, después de response exitoso):
```typescript
// Track compression cost
import { trackCompression } from './cost-tracker'

// ... existing code ...

const response = await client.messages.create({ ... })

// ✅ Agregar aquí (línea ~131):
try {
  await trackCompression(
    {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    },
    'claude-3-5-haiku-latest',
    sessionId,
    tenantId // Obtener de session o parámetro
  )
} catch (error) {
  console.error('[compressor] Failed to track cost:', error)
  // No crashear si falla tracking
}
```

2. Obtener tenant_id:
   - Si session tiene tenant_id: usar ese
   - Si no, usar default: `'00000000-0000-0000-0000-000000000000'`

3. Wrap en try/catch:
   - Si falla tracking, solo logear error
   - NO afectar UX de compression (sistema crítico)

TEST:
- Comprimir conversación de prueba
- Verificar entry en `ai_usage_metrics`:
  - service: 'anthropic'
  - model: 'claude-3-5-haiku-latest'
  - cost_usd: ~$0.00135 (450 input + 180 output)
- Ejecutar: `npm test` → compression tests pasan

SIGUIENTE: Prompt 1.4 para tests unitarios completos
```

---

## FASE 2: Embedding Cost Tracking (1.5h) ⚙️

### Prompt 2.1: Trackear embeddings en compressor

```
@backend-developer

TAREA: Modificar generateEmbeddingForSummary() para trackear costos de embeddings

CONTEXTO:
- Ya tenemos tracking de compresión (FASE 1)
- Ahora trackear embeddings (OpenAI)
- Ubicación: src/lib/conversation-compressor.ts línea ~245

ESPECIFICACIONES:

1. Modificar: `src/lib/conversation-compressor.ts` línea ~245

Después de generación exitosa de embedding:
```typescript
// Existing code:
const response = await openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: summary,
  dimensions: 1024,
})
const embedding = response.data[0].embedding

// ✅ Agregar aquí:
try {
  const estimatedTokens = Math.ceil(summary.length / 4) // OpenAI: ~4 chars/token
  await trackEmbedding(
    estimatedTokens,
    'text-embedding-3-large',
    sessionId,
    tenantId
  )
} catch (error) {
  console.error('[compressor] Failed to track embedding cost:', error)
}
```

2. Aproximación de tokens:
   - OpenAI no retorna token count
   - Usar: `summary.length / 4` (1 token ≈ 4 chars en español)
   - Precisión: ±10% (aceptable para estimación)

TEST:
- Generar embedding de prueba
- Verificar entry en `ai_usage_metrics`:
  - service: 'openai'
  - model: 'text-embedding-3-large'
  - cost_usd: ~$0.00013 (1000 tokens estimados)

SIGUIENTE: Prompt 2.2 para trackear en search (cache miss)
```

---

## FASE 3: Metrics API & Aggregation (2h) ✨

### Prompt 3.1: Crear API endpoint de métricas

```
@backend-developer

TAREA: Implementar `/api/metrics` GET endpoint para consultar costos agregados

CONTEXTO:
- Ya tenemos tracking funcionando (FASE 1 + 2)
- Necesitamos API para consultar métricas (dashboard futuro)
- Soporte para filtros: period, service, date

ESPECIFICACIONES:

1. Crear: `src/app/api/metrics/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const period = params.get('period') || 'day' // day|week|month
  const service = params.get('service') || 'all' // anthropic|openai|all
  const date = params.get('date') || new Date().toISOString().split('T')[0]

  // Query ai_usage_metrics con agregación
  const supabase = createServerClient()
  
  // Usar RPC function get_cost_summary (crear en 3.3)
  const { data, error } = await supabase.rpc('get_cost_summary', {
    p_tenant_id: getTenantId(),
    p_start_date: calculateStartDate(date, period),
    p_end_date: date,
    p_service: service === 'all' ? null : service
  })

  return NextResponse.json({
    total_cost: data.total_cost,
    breakdown: data.breakdown,
    usage_count: data.usage_count,
    period
  })
}
```

2. Query params:
   - `period`: day (default), week, month
   - `service`: all (default), anthropic, openai
   - `date`: YYYY-MM-DD (default: today)

3. Response format:
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

TEST:
- `curl http://localhost:3000/api/metrics?period=day`
- `curl http://localhost:3000/api/metrics?service=anthropic`
- Verificar: Response time <200ms

SIGUIENTE: Prompt 3.2 para módulo de agregación
```

---

## FASE 4: Alerts & Monitoring (1.5h) 🎨

### Prompt 4.1: Crear sistema de alertas

```
@backend-developer

TAREA: Implementar sistema de alertas para detectar anomalías de costo

CONTEXTO:
- Tracking funcionando (FASE 1-3)
- Necesitamos alertas cuando gasto excede threshold
- Default: $10/día

ESPECIFICACIONES:

1. Crear: `src/lib/cost-alerts.ts`

```typescript
import { createServerClient } from './supabase'

// Check if daily cost exceeds threshold
export async function checkDailyThreshold(
  tenantId: string,
  threshold: number = 10.00
): Promise<void> {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // Sum today's costs
  const { data } = await supabase.rpc('get_cost_summary', {
    p_tenant_id: tenantId,
    p_start_date: today,
    p_end_date: today,
    p_service: null
  })

  const dailyCost = data?.total_cost || 0

  if (dailyCost > threshold) {
    triggerAlert('threshold_exceeded', `Daily cost threshold exceeded: $${dailyCost.toFixed(2)} > $${threshold.toFixed(2)}`, dailyCost)
  }
}

// Trigger alert (console.warn por ahora, futuro: Slack/email)
function triggerAlert(type: string, message: string, cost: number): void {
  console.warn(`⚠️  [cost-alert] ${type}: ${message}`)
  // TODO: Integrar con Slack/email
}
```

2. Debouncing:
   - Max 1 alerta por hora (evitar spam)
   - Guardar `lastAlertTimestamp` en memoria o DB

3. Default threshold: $10/día

TEST:
- Insertar entries que suman $11 en un día
- Ejecutar checkDailyThreshold()
- Verificar: Alert en console.warn

SIGUIENTE: Prompt 4.2 para integrar en cost-tracker
```

---

## 📋 DOCUMENTACIÓN FINAL

### Prompt: Documentar FASE 4

```
He completado FASE 4 del Cost Monitoring System. Necesito:

1. Crear documentación en docs/cost-monitoring/fase-4/
2. Incluir:
   - ALERTS.md (cómo configurar thresholds, interpretar alertas)
   - USAGE.md (guía de uso del script analyze-costs.ts)
   - IMPLEMENTATION.md (qué se implementó)
   - TESTS.md (tests corridos y resultados)
3. Actualizar TODO.md marcando con [x] solo las tareas testeadas
4. Mostrar resumen de progreso

Crear README.md general en docs/cost-monitoring/ con:
- Overview del sistema
- Cómo funciona (tracking → storage → API → alerts)
- Pricing por servicio
- Cómo consultar métricas (API examples)
- Cómo configurar alertas
- Troubleshooting común
```

---

**Última actualización:** 2025-10-03
