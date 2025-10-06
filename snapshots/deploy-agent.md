---
title: "InnPilot Deploy Agent - Snapshot Especializado"
agent: deploy-agent
last_updated: "2025-10-06T16:00:00"
status: PRODUCTION_READY
---

# 🚀 Deploy Agent - Snapshot Especializado

**Agent**: @deploy-agent
**Última actualización**: 6 Octubre 2025 16:00
**Estado**: PRODUCCIÓN - VPS Hostinger

---

## 🎯 PROPÓSITO

Automatizar completamente el flujo de desarrollo desde cambios locales hasta producción verificada en VPS.

**Flujo Completo:**
```
Cambios locales → Commit → Push GitHub → GitHub Actions → Deploy VPS → Verificación → Reporte
```

---

## 🔄 WORKFLOW AUTOMATIZADO

### Paso 1: Análisis Inteligente de Cambios
- Escanea automáticamente todos los archivos modificados
- Categoriza cambios por tipo (features, fixes, docs, config)
- Detecta archivos clave (MUVA, embeddings, API)

### Paso 2: Commit Automático Descriptivo
- Genera mensajes semánticos
- Añade firma Claude Code
- Ejecuta `git add .` y `git commit`

### Paso 3: Push a GitHub
- Detecta rama actual
- Ejecuta `git push origin <branch>`
- Activa GitHub Actions workflow

### Paso 4: Monitoreo GitHub Actions
- Verifica que workflow inicie
- Deploy a VPS ocurre automáticamente vía GitHub Actions

### Paso 5: Verificación Funcional Completa
- Prueba endpoints críticos:
  - `/api/health` - Status general
  - `/api/chat` - SIRE assistant
  - `/api/chat/muva` - MUVA assistant
- Mide tiempos de respuesta
- Detecta errores HTTP

### Paso 6: Reporte Completo
- Métricas de performance
- Status de cada endpoint
- Confirmación éxito/problemas

---

## 📊 CI/CD PIPELINE

### GitHub Actions Workflow

```yaml
name: Deploy to VPS
on:
  push:
    branches: [main, dev]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Install dependencies
      - Build Next.js
      - Deploy to VPS (SSH)
      - PM2 reload
      - Health check verification
```

**Deployment Time:** ~3 minutos promedio

**Expected Flow:**
```
Push → GitHub Actions → Build → SSH to VPS → Deploy → PM2 reload → Health check
                                                                    ↓
                                                          Pass ✅ / Fail ⚠️
```

---

## 🔧 VPS DEPLOYMENT

### Production Stack

**VPS:** Hostinger Ubuntu 22.04 (195.200.6.216)
**Domain:** innpilot.io (wildcard SSL Let's Encrypt)
**Process Manager:** PM2 (cluster mode, 2 instances)
**Reverse Proxy:** Nginx 1.x
**Runtime:** Node.js 20.x + Next.js 15.5.3

### PM2 Configuration

```javascript
module.exports = {
  apps: [{
    name: 'innpilot',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Nginx Configuration

**Features:**
- Subdomain routing (*.innpilot.io)
- Rate limiting (10 req/s public endpoints)
- SSL termination (Let's Encrypt)
- Reverse proxy to PM2 (port 3000)

---

## 🔐 SECRETS MANAGEMENT

### GitHub Secrets (10 configurados)

```
VPS_HOST                      # 195.200.6.216
VPS_USER                      # Deploy user
VPS_SSH_KEY                   # SSH private key
VPS_APP_PATH                  # /var/www/innpilot

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

OPENAI_API_KEY
ANTHROPIC_API_KEY
JWT_SECRET_KEY
```

**Rotation Policy:** 90-day cycle documented

---

## 📝 DEPLOYMENT COMMANDS

### Manual Deploy (SSH to VPS)

```bash
# SSH to VPS
ssh deploy@195.200.6.216

# Pull latest code
cd /var/www/innpilot
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart PM2
pm2 reload innpilot

# Check status
pm2 status
pm2 logs innpilot --lines 50
```

### Automated Deploy Script

```bash
# Run deploy agent
npm run deploy-agent

# Verbose mode (debugging)
npm run deploy-agent:verbose
```

---

## 🚧 GAPS Y PENDIENTES

### CRÍTICO
1. **Rollback Automation** - No automático (manual SSH required)
2. **Health Check Failure Handling** - No auto-rollback en failures

### IMPORTANTE
1. **Deploy Notifications** - No configurado (Slack/Discord)
2. **Staging Environment** - No existe (deploy directo a prod)
3. **Blue-Green Deployment** - No implementado

### MEDIO
1. **Deploy Metrics** - No tracking de deployment frequency/success rate
2. **Canary Releases** - No implementado
3. **Load Testing** - No pre-deployment load testing

---

## 📚 DOCUMENTACIÓN

**Deployment Guides (108KB):**
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
- `@backend-developer` - Para deployment configuration
- `@infrastructure-monitor` - Para health checks y monitoring
- `@database-agent` - Para migrations deployment

**Ver:** `CLAUDE.md` para guías proyecto-wide

---

## 📌 REFERENCIAS RÁPIDAS

**Production:**
- URL: https://innpilot.io
- VPS: 195.200.6.216
- SSH: `ssh deploy@195.200.6.216`
- PM2 Status: `pm2 status`
- Nginx Config: `/etc/nginx/sites-available/innpilot`
- App Path: `/var/www/innpilot`

**Snapshots Relacionados:**
- 🖥️ Infraestructura: `snapshots/infrastructure-monitor.md`
- 🔧 Backend: `snapshots/backend-developer.md`
