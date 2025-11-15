# FASE 6: Monitoring Continuo - Workflow

**Agente:** @agent-infrastructure-monitor
**Tiempo estimado:** 3-4h
**Prioridad:** 🟢 MEDIA
**Estado:** ⏸️ Bloqueada por FASE 2 (pero puede ejecutarse en paralelo con FASE 3-5)

---

## 🎯 OBJETIVO

Implementar sistema de monitoreo continuo con health checks automáticos, alertas proactivas y verificación post-deploy.

**Meta:** Detectar problemas del guest chat ANTES de que afecten a usuarios en producción.

---

## 📋 PRE-REQUISITOS

### Verificaciones Previas

```bash
# 1. Verificar que FASE 2 esté completa
# (manual chunks accesibles, RPC funcionando)

# 2. Verificar acceso al servidor VPS
ssh user@simmerdown.house
exit

# 3. Verificar Slack webhook (opcional)
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test alert from Chat Core Monitoring"}'
```

**Criterios de inicio:**
- ✅ Guest chat funcional (FASE 2)
- ✅ Acceso SSH al VPS
- ✅ Slack webhook configurado (opcional)

---

## 🚀 EJECUCIÓN

### Tarea 6.1: Health Endpoint (90 min)

**Objetivo:** API endpoint que valida salud del sistema de chat.

**Crear:** `src/app/api/health/guest-chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  duration: number;
  metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check 1: Manual chunks exist
  const chunksCheck = await checkManualChunks();
  checks.push(chunksCheck);

  // Check 2: Embeddings have correct dimensions
  const embeddingsCheck = await checkEmbeddingDimensions();
  checks.push(embeddingsCheck);

  // Check 3: No orphaned chunks
  const mappingCheck = await checkChunkMapping();
  checks.push(mappingCheck);

  // Check 4: RPC functions work
  const rpcCheck = await checkRPCFunctionality();
  checks.push(rpcCheck);

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  const overallStatus = hasUnhealthy
    ? 'unhealthy'
    : hasDegraded
    ? 'degraded'
    : 'healthy';

  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      checks,
    },
    { status: statusCode }
  );
}

async function checkManualChunks(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from('accommodation_units_manual_chunks')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;

    const count = data?.length || 0;

    return {
      name: 'manual_chunks_exist',
      status: count > 100 ? 'healthy' : count > 0 ? 'degraded' : 'unhealthy',
      message: `${count} manual chunks found`,
      duration: Date.now() - start,
      metadata: { chunk_count: count },
    };
  } catch (error) {
    return {
      name: 'manual_chunks_exist',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkEmbeddingDimensions(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          vector_dims(embedding_balanced) as balanced_dims,
          vector_dims(embedding_full) as full_dims
        FROM accommodation_units_manual_chunks
        LIMIT 1;
      `,
    });

    if (error) throw error;

    const balanced = data[0]?.balanced_dims;
    const full = data[0]?.full_dims;

    const isCorrect = balanced === 1024 && full === 3072;

    return {
      name: 'embedding_dimensions',
      status: isCorrect ? 'healthy' : 'unhealthy',
      message: isCorrect
        ? 'Embedding dimensions correct (1024d, 3072d)'
        : `Incorrect dimensions: balanced=${balanced}, full=${full}`,
      duration: Date.now() - start,
      metadata: { balanced_dims: balanced, full_dims: full },
    };
  } catch (error) {
    return {
      name: 'embedding_dimensions',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkChunkMapping(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      query: `
        SELECT COUNT(*) as orphaned_chunks
        FROM accommodation_units_manual_chunks aumc
        LEFT JOIN hotels.accommodation_units ha
          ON ha.id = aumc.accommodation_unit_id
        WHERE ha.id IS NULL;
      `,
    });

    if (error) throw error;

    const orphaned = data[0]?.orphaned_chunks || 0;

    return {
      name: 'chunk_mapping',
      status: orphaned === 0 ? 'healthy' : orphaned < 10 ? 'degraded' : 'unhealthy',
      message: `${orphaned} orphaned chunks`,
      duration: Date.now() - start,
      metadata: { orphaned_count: orphaned },
    };
  } catch (error) {
    return {
      name: 'chunk_mapping',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkRPCFunctionality(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Get a sample unit ID
    const { data: units, error: unitsError } = await supabase
      .from('accommodation_units')
      .select('id')
      .limit(1);

    if (unitsError) throw unitsError;
    if (!units || units.length === 0) {
      return {
        name: 'rpc_functionality',
        status: 'degraded',
        message: 'No accommodation units found to test RPC',
        duration: Date.now() - start,
      };
    }

    // Test RPC with dummy embedding
    const dummyEmbedding = Array(1024).fill(0.1);

    const { data, error } = await supabase.rpc('match_unit_manual_chunks', {
      query_embedding: dummyEmbedding,
      p_accommodation_unit_id: units[0].id,
      match_threshold: 0.0,
      match_count: 5,
    });

    if (error) throw error;

    const chunkCount = data?.length || 0;

    return {
      name: 'rpc_functionality',
      status: chunkCount > 0 ? 'healthy' : 'degraded',
      message: `RPC returned ${chunkCount} chunks`,
      duration: Date.now() - start,
      metadata: { chunks_returned: chunkCount },
    };
  } catch (error) {
    return {
      name: 'rpc_functionality',
      status: 'unhealthy',
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}
```

**Validación:**
```bash
# Test local
curl http://localhost:3000/api/health/guest-chat | jq

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-24T...",
#   "duration": 250,
#   "checks": [
#     { "name": "manual_chunks_exist", "status": "healthy", ... },
#     { "name": "embedding_dimensions", "status": "healthy", ... },
#     { "name": "chunk_mapping", "status": "healthy", ... },
#     { "name": "rpc_functionality", "status": "healthy", ... }
#   ]
# }
```

---

### Tarea 6.2: Cron Job Script (60 min)

**Objetivo:** Script bash que ejecuta health check y alerta en fallas.

**Crear:** `scripts/health-check-cron.sh`

```bash
#!/bin/bash

#
# Health Check Cron Job
# Runs daily to verify guest chat system health
# Sends Slack alert if unhealthy
#

set -euo pipefail

# Configuration
HEALTH_ENDPOINT="https://simmerdown.house/api/health/guest-chat"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
LOG_FILE="/var/log/muva-chat/health-check.log"

# Create log directory if not exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Function to send Slack alert
send_alert() {
  local status="$1"
  local message="$2"

  if [ -z "$SLACK_WEBHOOK_URL" ]; then
    log "WARN: No Slack webhook configured, skipping alert"
    return
  fi

  local emoji=""
  local color=""

  case "$status" in
    healthy)
      emoji=":white_check_mark:"
      color="good"
      ;;
    degraded)
      emoji=":warning:"
      color="warning"
      ;;
    unhealthy)
      emoji=":x:"
      color="danger"
      ;;
  esac

  local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "title": "$emoji Guest Chat Health Check",
      "text": "$message",
      "footer": "MUVA Chat Monitoring",
      "ts": $(date +%s)
    }
  ]
}
EOF
)

  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    --silent --show-error
}

# Main execution
log "Starting health check..."

# Fetch health status
HTTP_CODE=$(curl -s -o /tmp/health-response.json -w "%{http_code}" "$HEALTH_ENDPOINT")
RESPONSE=$(cat /tmp/health-response.json)

log "HTTP Code: $HTTP_CODE"
log "Response: $RESPONSE"

# Parse status
STATUS=$(echo "$RESPONSE" | jq -r '.status')
DURATION=$(echo "$RESPONSE" | jq -r '.duration')
CHECKS=$(echo "$RESPONSE" | jq -r '.checks')

log "Status: $STATUS (took ${DURATION}ms)"

# Alert logic
if [ "$STATUS" = "unhealthy" ]; then
  log "CRITICAL: System is unhealthy!"

  # Build failure details
  FAILED_CHECKS=$(echo "$CHECKS" | jq -r '.[] | select(.status == "unhealthy") | .name')
  FAILURE_MSG="Guest chat system is UNHEALTHY.\n\nFailed checks:\n$FAILED_CHECKS\n\nSee logs: $LOG_FILE"

  send_alert "unhealthy" "$FAILURE_MSG"

  exit 1

elif [ "$STATUS" = "degraded" ]; then
  log "WARNING: System is degraded"

  DEGRADED_CHECKS=$(echo "$CHECKS" | jq -r '.[] | select(.status == "degraded") | .name')
  DEGRADED_MSG="Guest chat system is DEGRADED.\n\nDegraded checks:\n$DEGRADED_CHECKS\n\nInvestigate: $LOG_FILE"

  send_alert "degraded" "$DEGRADED_MSG"

  exit 0

else
  log "SUCCESS: System is healthy"
  # Optionally send daily success notification
  # send_alert "healthy" "Guest chat system is healthy. All checks passed."
  exit 0
fi
```

**Hacer ejecutable:**
```bash
chmod +x scripts/health-check-cron.sh
```

**Validación local:**
```bash
# Test sin alertas (dry-run)
./scripts/health-check-cron.sh

# Simular falla (modificar endpoint para retornar 503)
# Verificar que script detecta y loguea correctamente
```

---

### Tarea 6.3: Post-Deploy Verification (60 min)

**Objetivo:** Script que ejecuta después de cada deploy para validar sistema.

**Crear:** `scripts/post-deploy-verify.ts`

```typescript
#!/usr/bin/env tsx

/**
 * Post-Deploy Verification Script
 *
 * Runs after every deployment to verify system health
 * Includes:
 * - Health endpoint check
 * - Smoke test E2E (optional)
 * - Database migration status
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VerificationResult {
  step: string;
  passed: boolean;
  message: string;
  duration: number;
}

async function main() {
  console.log('🚀 Post-Deploy Verification Starting...\n');

  const results: VerificationResult[] = [];

  // Step 1: Health endpoint
  results.push(await checkHealthEndpoint());

  // Step 2: Database migrations
  results.push(await checkMigrations());

  // Step 3: Smoke test E2E (optional)
  if (process.env.RUN_E2E_SMOKE === 'true') {
    results.push(await runSmokeTest());
  }

  // Print results
  console.log('\n📊 Verification Results:\n');
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.step}: ${r.message} (${r.duration}ms)`);
  });

  // Exit code
  const allPassed = results.every(r => r.passed);

  if (allPassed) {
    console.log('\n✅ All verifications passed. Deploy successful!\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some verifications failed. Investigate before continuing.\n');
    process.exit(1);
  }
}

async function checkHealthEndpoint(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const response = await fetch('https://simmerdown.house/api/health/guest-chat');
    const data = await response.json();

    const passed = data.status === 'healthy';

    return {
      step: 'Health Endpoint',
      passed,
      message: passed ? 'System healthy' : `Status: ${data.status}`,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'Health Endpoint',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function checkMigrations(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Check if all migrations are applied
    const { stdout } = await execAsync('npm run supabase:status');

    const hasPending = stdout.includes('pending');

    return {
      step: 'Database Migrations',
      passed: !hasPending,
      message: hasPending ? 'Pending migrations detected' : 'All migrations applied',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'Database Migrations',
      passed: false,
      message: `Error: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

async function runSmokeTest(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    // Run single critical test
    await execAsync('npx playwright test tests/e2e/guest-chat-manuals.spec.ts -g "WiFi password"');

    return {
      step: 'E2E Smoke Test',
      passed: true,
      message: 'WiFi password test passed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      step: 'E2E Smoke Test',
      passed: false,
      message: `Test failed: ${error.message}`,
      duration: Date.now() - start,
    };
  }
}

main();
```

**Hacer ejecutable:**
```bash
chmod +x scripts/post-deploy-verify.ts
```

**Validación:**
```bash
# Test local
./scripts/post-deploy-verify.ts

# Expected:
# ✅ Health Endpoint: System healthy (250ms)
# ✅ Database Migrations: All migrations applied (1200ms)
# ✅ All verifications passed. Deploy successful!
```

---

### Tarea 6.4: Configurar Cron Job en Servidor (30 min)

**Objetivo:** Configurar ejecución diaria del health check.

**SSH al servidor:**
```bash
ssh user@simmerdown.house
```

**Crear directorio de logs:**
```bash
sudo mkdir -p /var/log/muva-chat
sudo chown $USER:$USER /var/log/muva-chat
```

**Configurar variable de entorno (Slack webhook):**
```bash
# Agregar a ~/.bashrc o ~/.profile
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"' >> ~/.bashrc
source ~/.bashrc
```

**Configurar crontab:**
```bash
crontab -e
```

**Agregar línea:**
```cron
# Guest Chat Health Check - Daily at 9 AM
0 9 * * * cd /var/www/muva-chat && ./scripts/health-check-cron.sh
```

**Verificar cron configurado:**
```bash
crontab -l
```

**Test manual (sin esperar):**
```bash
cd /var/www/muva-chat
./scripts/health-check-cron.sh
```

**Verificar logs:**
```bash
tail -f /var/log/muva-chat/health-check.log
```

**Expected output:**
```
[2025-10-24 09:00:01] Starting health check...
[2025-10-24 09:00:01] HTTP Code: 200
[2025-10-24 09:00:01] Response: {"status":"healthy",...}
[2025-10-24 09:00:01] Status: healthy (took 245ms)
[2025-10-24 09:00:01] SUCCESS: System is healthy
```

---

## ✅ VALIDACIÓN FINAL

### Test Completo del Sistema de Monitoreo

#### 1. Health Endpoint

```bash
# Producción
curl https://simmerdown.house/api/health/guest-chat | jq

# Expected: status "healthy", all checks passed
```

#### 2. Cron Job

```bash
# Verificar última ejecución
ssh user@simmerdown.house 'tail -20 /var/log/muva-chat/health-check.log'

# Expected: Ejecución reciente (hoy)
```

#### 3. Post-Deploy Verification

```bash
# Ejecutar manualmente
./scripts/post-deploy-verify.ts

# Expected: All checks passed
```

#### 4. Alertas (Simular Falla)

```bash
# Temporalmente romper sistema (para test)
# Ejemplo: borrar chunks manualmente

# Esperar ejecución de cron (o ejecutar manualmente)
./scripts/health-check-cron.sh

# Verificar:
# - Log muestra error
# - Slack recibe alerta (si configurado)
# - Script retorna exit code 1

# Restaurar sistema
```

### Checklist

- [ ] Health endpoint `/api/health/guest-chat` funciona
- [ ] Cron job configurado y ejecutando
- [ ] Post-deploy script funciona
- [ ] Alertas Slack funcionan (opcional)
- [ ] Logs se crean en `/var/log/muva-chat/`

---

## 📝 DOCUMENTACIÓN

Al finalizar, crear:

**Archivo:** `docs/chat-core-stabilization/fase-6/RESULTS.md`

```markdown
# FASE 6 - Resultados

**Completado:** [FECHA]
**Tiempo real:** [HORAS]

## Componentes Implementados

### 1. Health Endpoint
- **URL**: `/api/health/guest-chat`
- **Checks**: 4 (chunks, embeddings, mapping, RPC)
- **Response time**: <500ms

### 2. Cron Job
- **Script**: `scripts/health-check-cron.sh`
- **Schedule**: Daily 9 AM
- **Logs**: `/var/log/muva-chat/health-check.log`

### 3. Post-Deploy Verification
- **Script**: `scripts/post-deploy-verify.ts`
- **Steps**: 3 (health, migrations, smoke test)
- **Integration**: Deploy pipeline

### 4. Alertas
- **Channel**: Slack (opcional)
- **Triggers**: unhealthy, degraded
- **Test**: ✅ Passed

## Métricas

- Health check execution time: [X]ms
- False positive rate: 0%
- Alert delivery time: <30s

## Mejoras Futuras

- [ ] Integrar con Prometheus/Grafana
- [ ] Agregar performance metrics (P95, P99)
- [ ] Expandir smoke tests E2E
```

---

## 🎉 PROYECTO COMPLETADO

Una vez terminada FASE 6:

→ **Chat Core Stabilization 100% COMPLETO** ✅

### Estado Final

- ✅ FASE 1: Diagnosis completo
- ✅ FASE 2: Bug resuelto (219/219 chunks accesibles)
- ✅ FASE 3: Tests E2E automatizados
- ✅ FASE 4: Código consolidado (-30% duplicación)
- ✅ FASE 5: Documentación definitiva (ADRs, Runbooks)
- ✅ FASE 6: Monitoring continuo (health checks, alertas)

**Sistema "osificado"**: Estable, monitoreado, documentado, testeado.

---

**Last Updated**: [FECHA]
**Maintainer**: Infrastructure Team
