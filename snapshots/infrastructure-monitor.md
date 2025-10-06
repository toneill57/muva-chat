---
title: "InnPilot Infrastructure Monitor - Snapshot Especializado"
agent: infrastructure-monitor
last_updated: "2025-10-06T16:00:00"
status: PRODUCTION_READY
---

# 🖥️ Infrastructure Monitor - Snapshot Especializado

**Agent**: @infrastructure-monitor
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - VPS Hostinger

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Production Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Production Stack                       │
├─────────────────────────────────────────────────────────┤
│  Domain: innpilot.io (SSL: Let's Encrypt wildcard)     │
│  VPS: Hostinger Ubuntu 22.04 (195.200.6.216)           │
│  Web Server: Nginx (subdomain routing + rate limiting)  │
│  Process Manager: PM2 (2 instances, cluster mode)       │
│  Runtime: Node.js 20.x + Next.js 15.5.3                │
│  Database: Supabase PostgreSQL + pgvector               │
│  AI: OpenAI (embeddings) + Anthropic (chat)            │
└─────────────────────────────────────────────────────────┘
```

**VPS Specifications:**
- IP: 195.200.6.216
- OS: Ubuntu 22.04 LTS
- Domain: innpilot.io (wildcard SSL)
- Process Manager: PM2 (cluster mode, 2 instances)
- Reverse Proxy: Nginx 1.x
- SSL: Let's Encrypt (auto-renew)

### CI/CD Pipeline

```
Push to dev → GitHub Actions → Build → Deploy VPS → PM2 reload → Health check
                                                              ↓
                                                    Pass ✅ / Fail ⚠️ (rollback)
```

**Deployment Time:** ~3 minutos promedio

---

## 🚨 ERROR DETECTION PROACTIVO

### Hook System Integration

**Archivo:** `.claude/hooks/post-tool-use-error-detector.sh`

**Funcionalidad:**
- Se ejecuta después de CADA tool call
- Detecta exit codes != 0
- Detecta keywords (error, failed, exception, not found)
- Escribe a `.claude/errors.jsonl` en formato JSON
- Mantiene últimas 100 entradas (rotación automática)

**Activación Automática:**
1. Archivo `.claude/errors.jsonl` existe y tiene > 0 líneas
2. 3+ errores consecutivos en tools (patrón de fallas)
3. Usuario solicita "revisar errores" o "diagnóstico"
4. Al finalizar tareas importantes (check proactivo)

**Formato errors.jsonl:**
```json
{"timestamp":"2025-10-06T14:15:23Z","tool":"Edit","type":"keyword_match","exit_code":1,"details":"String to replace not found in file"}
```

### Workflow de Diagnóstico

1. **Leer `.claude/errors.jsonl`** - Parse todos los errores
2. **Categorizar errores**:
   - Database errors (mcp__supabase__*, SQL, connection)
   - File errors (Read, Write, Edit - "String Not Found")
   - Bash errors (exit != 0, command not found)
   - API errors (fetch, timeout, 4xx/5xx)
3. **Analizar patrones**:
   - Mismo error 3+ veces → Problema estructural
   - Errores relacionados → Dependencias/config
   - Error aislado → Edge case
4. **Generar diagnóstico** - Root cause + soluciones
5. **Presentar reporte** al final de tareas

---

## 📊 MÉTRICAS Y TARGETS

### Performance Targets

**API Response Times:**
- `/api/guest/chat`: **< 3000ms** (actual: ~1500-2500ms) ✅
- `/api/public/chat`: **< 2000ms** (actual: ~1000-1800ms) ✅
- `/api/staff/chat`: **< 3000ms** (actual: ~1500-2500ms) ✅
- Vector search: **< 500ms** (actual: ~200-400ms) ✅
- File upload + Vision: **< 5000ms** (actual: ~2000-4000ms) ✅

**Matryoshka Tiers:**
- Tier 1 (1024d HNSW): **< 15ms** (tourism queries)
- Tier 2 (1536d HNSW): **< 40ms** (SIRE compliance)
- Tier 3 (3072d IVFFlat): **< 100ms** (complex queries)

**Database:**
- Database queries: **< 100ms** (95% queries)
- RPC function calls: **< 50ms**
- Vector search: **< 200ms**

### Resource Utilization

**Targets:**
- Database connections: **< 80%** of pool limit
- Storage usage: **< 85%** of allocated space
- Memory usage: **< 90%** in edge runtime
- CPU usage: **< 80%** sustained load

**Quality Metrics:**
- Multi-Tenant Isolation: **100%** compliance
- Search Accuracy: **> 95%** relevance score
- Uptime: **99.9%** target
- Error Rate: **< 1%** for critical endpoints

---

## 🔍 HEALTH CHECKS

### Endpoints Monitored

```bash
# Health check multi-tenant
GET /api/health

# System status
GET /api/status

# Expected response time: < 500ms
```

### Automated Monitoring

**Daily Health Check:**
- Vector search performance validation
- Multi-tenant isolation verification
- Database metrics collection
- API endpoint validation
- Error rate analysis

**Weekly Performance Review:**
- Table size trending
- Index usage statistics
- Query performance analysis
- Resource utilization trends

**Monthly Security Audit:**
- RLS policy effectiveness
- Function security validation
- Secrets rotation check
- SSL certificate expiration

---

## 🚧 INFRASTRUCTURE GAPS

### CRÍTICO
1. **PostgreSQL Upgrade** - Parches de seguridad disponibles (HIGH priority)
2. **Backup Strategy** - Implementar weekly VPS snapshots + pg_dump

### IMPORTANTE
1. **Monitoring Dashboard** - No implementado (manual checks)
2. **Alerting System** - No configurado (solo logs)
3. **Performance Regression Tests** - No automatizados

### MEDIO
1. **Cost Optimization** - No tracking de $ per query
2. **Capacity Planning** - No forecasting de crecimiento

---

## 🔧 DESARROLLO

### Development Server (MANDATORY)

```bash
# 🚀 ALWAYS use this script
./scripts/dev-with-keys.sh

# Features:
# - Auto-cleanup of orphaned processes
# - Port 3000 verification before start
# - API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY) auto-loaded
# - Graceful shutdown with Ctrl+C
# - Zero manual cleanup needed
```

**❌ DO NOT use `npm run dev` directly** unless `.env.local` is configured

---

## 📝 DOCUMENTACIÓN

**Deployment Guides (108KB - 7 archivos):**
- ✅ `VPS_SETUP_GUIDE.md` (13.8KB) - Setup VPS completo
- ✅ `DEPLOYMENT_WORKFLOW.md` (7.1KB) - CI/CD workflow
- ✅ `SUBDOMAIN_SETUP_GUIDE.md` (17.9KB) - Wildcard DNS
- ✅ `VPS_CRON_SETUP.md` (9.9KB) - Cron jobs
- ✅ `TROUBLESHOOTING.md` - Common issues
- ✅ `GITHUB_SECRETS.md` - Secrets management
- ✅ `STORAGE_SETUP_GUIDE.md` - Supabase Storage

---

## 🔗 COORDINACIÓN

**Trabaja con:**
- `@deploy-agent` - Deployment automation
- `@ux-interface` - Performance optimization
- `@embeddings-generator` - Embedding performance
- `@database-agent` - Database health

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 REFERENCIAS RÁPIDAS

**Production:**
- URL: https://innpilot.io
- VPS: 195.200.6.216
- PM2 Status: `pm2 status` (SSH)
- Nginx Logs: `/var/log/nginx/`
- PM2 Logs: `pm2 logs`

**Snapshots Relacionados:**
- 🔧 Backend: `snapshots/backend-developer.md`
- 🗄️ Database: `snapshots/database-agent.md`
- 🚀 Deploy: `snapshots/deploy-agent.md`
