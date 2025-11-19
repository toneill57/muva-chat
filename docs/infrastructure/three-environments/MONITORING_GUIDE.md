# Monitoring & Alerting Guide

**FASE 8: Monitoring & Alerting**
**Última actualización:** 2025-11-05

Esta guía documenta el sistema completo de monitoreo y alertas para la infraestructura de tres ambientes (dev, staging, production) de MUVA Chat.

---

## 📋 Tabla de Contenidos

1. [Overview del Sistema](#overview-del-sistema)
2. [Health Endpoints](#health-endpoints)
3. [Monitoring Dashboard](#monitoring-dashboard)
4. [Alert System](#alert-system)
5. [Deployment Metrics](#deployment-metrics)
6. [Error Detection Proactivo](#error-detection-proactivo)
7. [Comandos Útiles](#comandos-útiles)
8. [Troubleshooting Playbook](#troubleshooting-playbook)
9. [Configuración Avanzada](#configuración-avanzada)

---

## Overview del Sistema

### Componentes del Sistema de Monitoreo

```
┌─────────────────────────────────────────────────────────────┐
│                     MUVA MONITORING SYSTEM                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Health Endpoints (/api/health)                          │
│     ├── API Health                                          │
│     ├── Database Health                                     │
│     └── Service Dependencies                                │
│                                                             │
│  2. Monitoring Dashboard (scripts/monitoring-dashboard.ts)  │
│     ├── Multi-Environment Status                            │
│     ├── Performance Metrics                                 │
│     └── Deployment Info                                     │
│                                                             │
│  3. Alert System (scripts/alert-on-failure.ts)              │
│     ├── Service Health Monitoring                           │
│     ├── Error Log Analysis (.claude/errors.jsonl)           │
│     └── Proactive Notifications                             │
│                                                             │
│  4. Deployment Metrics (scripts/deployment-metrics.ts)      │
│     ├── Success Rate Tracking                               │
│     ├── Duration Analysis                                   │
│     └── Historical Reports                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Filosofía de Monitoreo

- **Proactivo**: Detectar problemas ANTES de que afecten a usuarios
- **Multi-Layered**: Monitoreo a nivel de API, database, servicios y errores
- **Actionable**: Cada alerta incluye acción sugerida
- **Historical**: Track trends para predecir problemas futuros

---

## Health Endpoints

### 1. `/api/health` - Health Check Principal

**URL**: `https://{environment}.muva.chat/api/health`

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-05T10:30:00.000Z",
  "services": {
    "openai": {
      "status": "configured"
    },
    "anthropic": {
      "status": "configured"
    },
    "supabase": {
      "status": "healthy",
      "responseTime": "45ms",
      "error": null,
      "tables": {
        "public.tenant_registry": {
          "status": "healthy",
          "responseTime": "45ms",
          "error": null
        }
      }
    }
  },
  "environment": {
    "runtime": "edge",
    "region": "iad1",
    "deployment": "abc1234"
  }
}
```

**Status Codes**:
- `200`: Sistema healthy
- `503`: Sistema degraded (algunos servicios tienen problemas)
- `500`: Error crítico

**Uso desde CLI**:
```bash
# Check staging
curl -s https://simmerdown.staging.muva.chat/api/health | jq

# Check production
curl -s https://simmerdown.muva.chat/api/health | jq

# Check local dev
curl -s http://localhost:3000/api/health | jq
```

### 2. `/api/health/db` - Database Health Check

**NOTA**: Este endpoint está pendiente de implementación en FASE 8. Se recomienda crear:

**Archivo**: `src/app/api/health/db/route.ts`

**Response esperado**:
```json
{
  "status": "ok",
  "latency_ms": 45,
  "connected": true,
  "timestamp": "2025-11-05T10:30:00.000Z"
}
```

**Implementación sugerida**:
```typescript
// src/app/api/health/db/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET() {
  const startTime = Date.now();
  const supabase = createServerClient();

  try {
    // Simple connectivity test
    const { error } = await supabase
      .from('tenant_registry')
      .select('tenant_id')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          latency_ms: latency,
          connected: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      latency_ms: latency,
      connected: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        latency_ms: Date.now() - startTime,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
```

---

## Monitoring Dashboard

### Script: `scripts/monitoring-dashboard.ts`

Dashboard interactivo que muestra el estado de todos los ambientes en tiempo real.

### Características

- ✅ Estado de salud de cada ambiente (🟢 UP / 🟡 DEGRADED / 🔴 DOWN)
- ✅ Métricas de performance (response time, latency)
- ✅ Información de deployment (commit, branch, timestamp)
- ✅ Auto-refresh opcional
- ✅ Output JSON para integración con otros sistemas

### Uso Básico

```bash
# Ver todos los ambientes
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Ver solo un ambiente
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production

# Output en JSON
pnpm dlx tsx scripts/monitoring-dashboard.ts --json

# Auto-refresh cada 30 segundos
pnpm dlx tsx scripts/monitoring-dashboard.ts --refresh=30
```

### Output Ejemplo

```
═══════════════════════════════════════════════════════════════════
                    🖥️  MUVA MONITORING DASHBOARD
═══════════════════════════════════════════════════════════════════

📅 Generated: Nov 5, 2025, 10:30 AM COT

┌─────────────────────────────────────────────────────────────────┐
│ 📊 OVERALL STATUS                                               │
├─────────────────────────────────────────────────────────────────┤
│   🟢 UP: 3   🟡 DEGRADED: 0   🔴 DOWN: 0                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🟢 PRODUCTION                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 🏥 Health: healthy                                              │
│    Response Time: 123ms                                         │
│    Region: iad1                                                 │
│    Deployment: abc1234                                          │
│                                                                 │
│ 💾 Database: healthy                                            │
│    Latency: 45ms                                                │
│                                                                 │
│ 🚀 Last Deployment: Nov 5, 09:15 AM                             │
│    Commit: abc1234                                              │
│    Branch: main                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Variables de Entorno

```bash
# Development
export DEV_URL="http://localhost:3000"
export DEV_SUPABASE_PROJECT_ID="rvjmwwvkhglcuqwcznph"

# Staging
export STAGING_URL="https://simmerdown.staging.muva.chat"
export STAGING_SUPABASE_PROJECT_ID="[DEPRECATED-OLD-STAGING]"

# Production
export PROD_URL="https://simmerdown.muva.chat"
export PROD_SUPABASE_PROJECT_ID="iyeueszchbvlutlcmvcb"
```

---

## Alert System

### Script: `scripts/alert-on-failure.ts`

Sistema de alertas proactivo que detecta problemas antes de que escalen.

### Características

- 🚨 **Service Health Monitoring**: Verifica si servicios están UP/DOWN/DEGRADED
- 📊 **Error Log Analysis**: Analiza `.claude/errors.jsonl` para patrones de errores
- 🔔 **Intelligent Alerting**: Notificaciones basadas en severidad (CRITICAL/WARNING/INFO)
- 💡 **Actionable Suggestions**: Cada alerta incluye acción sugerida
- 🔄 **Auto-Restart** (experimental): Intenta reiniciar servicios caídos

### Uso Básico

```bash
# Check todos los ambientes + error log
pnpm dlx tsx scripts/alert-on-failure.ts

# Check solo un ambiente
pnpm dlx tsx scripts/alert-on-failure.ts --env=production

# Analizar solo error log (skip health checks)
pnpm dlx tsx scripts/alert-on-failure.ts --check-errors-only

# Auto-restart si hay servicios caídos (requiere SSH a VPS)
pnpm dlx tsx scripts/alert-on-failure.ts --auto-restart

# Custom threshold para errores repetidos
pnpm dlx tsx scripts/alert-on-failure.ts --threshold=5
```

### Tipos de Alertas

#### CRITICAL 🚨
- Servicio de producción completamente caído
- Database no conecta
- Errores de database repetidos (3+ veces)

**Ejemplo**:
```
═══════════════════════════════════════════════════════════════════
🚨 [CRITICAL] Production Service DOWN
═══════════════════════════════════════════════════════════════════

📍 Environment: production
📝 Message: Service is not responding
🕐 Timestamp: 2025-11-05T10:30:00.000Z

💡 Suggested Action:
   Restart service: pm2 restart muva-production

═══════════════════════════════════════════════════════════════════
```

#### WARNING ⚠️
- Servicio degraded
- Response time lento (> 5s)
- Errores de authentication repetidos
- Errores de Edit tool ("String Not Found")

#### INFO ℹ️
- Errores únicos que no se repiten
- Cambios de configuración detectados

### Error Log Analysis

El sistema analiza `.claude/errors.jsonl` (generado por hooks) y detecta:

**Patrones de Errores Repetidos**:
- 3+ ocurrencias del mismo error → WARNING/CRITICAL
- Genera reporte con timestamps y sugerencias

**Categorías Detectadas**:
- **Database errors**: Problemas de schema, connectivity, migrations
- **File errors**: Edit tool con strings incorrectos
- **Bash errors**: Scripts con exit codes != 0
- **Auth errors**: Problemas de tokens/keys

### Integración con Slack (Opcional)

Configura webhook para recibir alertas en Slack:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

El sistema enviará automáticamente alertas CRITICAL y WARNING a Slack.

### Configuración de Cron Job

Para monitoreo continuo, configura un cron job:

```bash
# Editar crontab
crontab -e

# Agregar línea (cada 5 minutos)
*/5 * * * * cd /path/to/muva-chat && pnpm dlx tsx scripts/alert-on-failure.ts >> /var/log/muva-alerts.log 2>&1
```

---

## Deployment Metrics

### Script: `scripts/deployment-metrics.ts`

Track histórico de deployments, success rate y performance.

### Características

- 📊 **Success Rate Tracking**: Por ambiente
- ⏱️ **Duration Analysis**: Avg, min, max deployment time
- 📈 **Historical Reports**: Trends de últimos 30 días
- 📉 **ASCII Charts**: Visualización de tendencias
- 💾 **Persistent Storage**: JSON en `.monitoring/deployment-metrics.json`

### Uso Básico

#### Registrar Deployment

```bash
# Deployment exitoso en staging (120 segundos)
pnpm dlx tsx scripts/deployment-metrics.ts \
  --record \
  --env=staging \
  --status=success \
  --duration=120 \
  --commit=abc1234 \
  --branch=staging

# Deployment fallido en production
pnpm dlx tsx scripts/deployment-metrics.ts \
  --record \
  --env=production \
  --status=failure \
  --duration=45 \
  --commit=def5678 \
  --error="Migration failed"

# Rollback en production
pnpm dlx tsx scripts/deployment-metrics.ts \
  --record \
  --env=production \
  --status=rollback \
  --duration=30
```

#### Generar Reportes

```bash
# Reporte completo (últimos 30 días)
pnpm dlx tsx scripts/deployment-metrics.ts --report

# Reporte de un ambiente específico
pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production

# Reporte de últimos 7 días
pnpm dlx tsx scripts/deployment-metrics.ts --report --days=7
```

#### Visualizar Tendencias

```bash
# Gráfico ASCII de deployments
pnpm dlx tsx scripts/deployment-metrics.ts --chart

# Exportar métricas a JSON
pnpm dlx tsx scripts/deployment-metrics.ts --export
```

### Output Ejemplo - Reporte

```
═══════════════════════════════════════════════════════════════════
                    📊 DEPLOYMENT METRICS REPORT
═══════════════════════════════════════════════════════════════════

📅 Report Period: Last 30 days
📦 Total Records: 42

┌─────────────────────────────────────────────────────────────────┐
│ 📍 PRODUCTION                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Total Deployments: 15                                        │
│ ✅ Successful: 14                                               │
│ ❌ Failed: 1                                                    │
│ 🔄 Rolled Back: 0                                               │
│ 📈 Success Rate: 93.3%                                          │
│                                                                 │
│ ⏱️  Avg Duration: 145.2s                                        │
│ ⚡ Min Duration: 89.0s                                          │
│ 🐌 Max Duration: 320.0s                                         │
│                                                                 │
│ 🕐 Last Deployment:                                             │
│    Nov 5, 2025, 09:15 AM                                        │
│    Status: success                                              │
│    Commit: abc1234                                              │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
📊 OVERALL SUMMARY
═══════════════════════════════════════════════════════════════════

📦 Total Deployments: 42
✅ Total Successful: 39
📈 Overall Success Rate: 92.9%

✅ Good deployment health
```

### Integración con CI/CD

Agregar a workflows para track automático:

```yaml
# .github/workflows/deploy-staging.yml
- name: Record Deployment Metrics
  if: always()
  run: |
    STATUS=${{ job.status == 'success' && 'success' || 'failure' }}
    DURATION=$(($(date +%s) - START_TIME))

    pnpm dlx tsx scripts/deployment-metrics.ts \
      --record \
      --env=staging \
      --status=$STATUS \
      --duration=$DURATION \
      --commit=${{ github.sha }} \
      --branch=${{ github.ref_name }}
```

---

## Error Detection Proactivo

### Archivo: `.claude/errors.jsonl`

Hook system (`post-tool-use-error-detector.sh`) captura errores automáticamente.

### Formato de Entrada

```json
{
  "timestamp": "2025-11-05T10:30:00Z",
  "tool": "Edit",
  "type": "keyword_match",
  "exit_code": 1,
  "details": "String to replace not found in file",
  "output": "<tool_use_error>String to replace not found..."
}
```

### Análisis Automático

El alert system (`alert-on-failure.ts`) analiza este archivo y:

1. **Detecta errores repetidos** (3+ veces)
2. **Categoriza por tipo** (database, file, auth, bash)
3. **Genera alertas** con severity adecuada
4. **Sugiere acciones** específicas para cada tipo

### Ejemplo de Detección

```bash
# Ejecutar análisis de errores
pnpm dlx tsx scripts/alert-on-failure.ts --check-errors-only
```

**Output**:
```
⚠️  [WARNING] Repeated Error: Edit (3x)
Error repeated 3 times between 2025-11-05T14:15:00Z and 2025-11-05T14:22:00Z

💡 Suggested Action:
   Use Read tool before Edit to ensure exact string match.
```

---

## Comandos Útiles

### Quick Status Check

```bash
# Ver estado rápido de todos los ambientes
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Ver solo production
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production
```

### Health Checks Manuales

```bash
# Development
curl http://localhost:3000/api/health | jq

# Staging
curl https://simmerdown.staging.muva.chat/api/health | jq

# Production
curl https://simmerdown.muva.chat/api/health | jq
```

### Alert System

```bash
# Full check (servicios + error log)
pnpm dlx tsx scripts/alert-on-failure.ts

# Solo errores
pnpm dlx tsx scripts/alert-on-failure.ts --check-errors-only
```

### Deployment Metrics

```bash
# Reporte mensual
pnpm dlx tsx scripts/deployment-metrics.ts --report

# Gráfico de tendencias
pnpm dlx tsx scripts/deployment-metrics.ts --chart
```

---

## Troubleshooting Playbook

### Problema: Service DOWN (🔴)

**Síntomas**: Health endpoint retorna 500/503 o no responde

**Diagnóstico**:
```bash
# 1. Check health endpoint
curl -v https://simmerdown.muva.chat/api/health

# 2. Check PM2 status (SSH a VPS)
ssh vps
pm2 status

# 3. Check logs
pm2 logs muva-production --lines 50
```

**Solución**:
```bash
# Restart PM2 service
pm2 restart muva-production

# Si no funciona, rebuild
cd /var/www/muva-chat
git pull
pnpm install --frozen-lockfile
pnpm run build
pm2 restart muva-production
```

### Problema: Service DEGRADED (🟡)

**Síntomas**: Health endpoint retorna 200 pero status "degraded"

**Diagnóstico**:
```bash
# Ver detalles del health check
curl https://simmerdown.muva.chat/api/health | jq '.services'
```

**Posibles Causas**:
- Database connectivity issues
- Missing API keys (OpenAI/Anthropic)
- Supabase RLS policy errors

**Solución**:
```bash
# Check environment variables
ssh vps
cat /var/www/muva-chat/.env.production

# Verify API keys están presentes
grep OPENAI_API_KEY .env.production
grep ANTHROPIC_API_KEY .env.production
grep SUPABASE_SERVICE_ROLE_KEY .env.production
```

### Problema: Errores Repetidos en Error Log

**Síntomas**: Alert system reporta mismo error 3+ veces

**Diagnóstico**:
```bash
# Ver error log completo
cat .claude/errors.jsonl | jq

# Filtrar por tipo de error
cat .claude/errors.jsonl | jq 'select(.tool == "Edit")'
```

**Soluciones por Tipo**:

**Edit Tool Errors**:
```bash
# Problema: "String not found"
# Causa: Usando paráfrasis en lugar de texto exacto
# Solución: Leer archivo ANTES de editar para copiar string exacto
```

**Database Errors**:
```bash
# Problema: "relation does not exist"
# Causa: Migración no aplicada o schema drift
# Solución: Verificar migraciones aplicadas
pnpm dlx tsx scripts/migration-status.ts --env=production
```

**Auth Errors**:
```bash
# Problema: "Invalid API key"
# Causa: API key incorrecta o expirada
# Solución: Verificar y rotar secrets
pnpm dlx tsx scripts/rotate-secrets.ts --env=production --secret=OPENAI_API_KEY
```

### Problema: Deployment Fallido

**Síntomas**: GitHub Actions workflow falla en step de deploy

**Diagnóstico**:
```bash
# Ver logs de GitHub Actions
gh run view <run-id> --log

# Ver deployment metrics
pnpm dlx tsx scripts/deployment-metrics.ts --report --env=production --days=7
```

**Solución**:
```bash
# Rollback manual si es necesario
pnpm dlx tsx scripts/rollback-production.ts

# Con restore de database (si migración falló)
pnpm dlx tsx scripts/rollback-production.ts --restore-db
```

---

## Configuración Avanzada

### Auto-Refresh Dashboard

Para terminal dedicado con dashboard continuo:

```bash
# Refresh cada 30 segundos
pnpm dlx tsx scripts/monitoring-dashboard.ts --refresh=30

# En tmux/screen para dejar corriendo
tmux new -s monitoring
pnpm dlx tsx scripts/monitoring-dashboard.ts --refresh=30
# Ctrl+B, D para detach
```

### Slack Notifications

Configurar webhook en Slack:

1. Ir a https://api.slack.com/apps
2. Create New App → From scratch
3. Incoming Webhooks → Activate → Add New Webhook
4. Copy webhook URL

```bash
# Agregar a .env o environment variables
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"

# Test
pnpm dlx tsx scripts/alert-on-failure.ts
```

### Cron Job Setup (Monitoreo Continuo)

```bash
# Editar crontab
crontab -e

# Agregar monitoreo cada 5 minutos
*/5 * * * * cd /path/to/muva-chat && /usr/local/bin/pnpm dlx tsx scripts/alert-on-failure.ts >> /var/log/muva-monitoring.log 2>&1

# Reporte diario a las 9 AM
0 9 * * * cd /path/to/muva-chat && /usr/local/bin/pnpm dlx tsx scripts/deployment-metrics.ts --report --days=1 | mail -s "Daily Deployment Report" admin@muva.chat
```

### Monitoring Directory Structure

```
.monitoring/
├── deployment-metrics.json        # Deployment history
├── deployment-export-*.json       # Exports on demand
└── alerts.log                     # Alert history (future)

.claude/
└── errors.jsonl                   # Tool errors captured by hooks
```

### Health Check Thresholds

Customize en scripts si es necesario:

```typescript
// scripts/monitoring-dashboard.ts
const THRESHOLDS = {
  MAX_RESPONSE_TIME: 5000,    // 5s
  MAX_DB_LATENCY: 1000,       // 1s
  MIN_SUCCESS_RATE: 0.95,     // 95%
};

// scripts/alert-on-failure.ts
const ERROR_THRESHOLD = 3; // Alert si mismo error 3+ veces
```

---

## Próximos Pasos

### FASE 9: Documentation & Training

1. **Developer Guide**: Workflow completo para developers
2. **DevOps Guide**: Setup y configuración de infraestructura
3. **Troubleshooting Guide**: Problemas comunes y soluciones
4. **FAQ**: Preguntas frecuentes
5. **Video Walkthrough**: Demo del workflow completo

### Mejoras Futuras al Monitoring

- [ ] **Grafana Dashboard**: Visualización web de métricas
- [ ] **Prometheus Integration**: Time-series metrics
- [ ] **Email Notifications**: Alertas vía email además de Slack
- [ ] **Mobile App**: Alertas push en mobile
- [ ] **Predictive Analytics**: ML para predecir fallos antes de que ocurran
- [ ] **Cost Monitoring**: Track costos de Supabase, Vercel, VPS
- [ ] **User Impact Analysis**: Correlación entre errores y afectación de usuarios

---

## Referencias

- **Health Endpoint**: `src/app/api/health/route.ts`
- **Monitoring Dashboard**: `scripts/monitoring-dashboard.ts`
- **Alert System**: `scripts/alert-on-failure.ts`
- **Deployment Metrics**: `scripts/deployment-metrics.ts`
- **Error Detection Hook**: `.claude/hooks/post-tool-use-error-detector.sh`

---

**Documentado por**: Infrastructure Monitor Agent
**FASE 8 Status**: ✅ COMPLETADA
**Última actualización**: 2025-11-05
