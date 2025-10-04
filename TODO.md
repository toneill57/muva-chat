# TODO - Migración VPS Deployment

**Proyecto:** VPS Deployment Migration (Vercel → Hostinger)
**Fecha:** 4 de Octubre 2025
**Plan:** Ver `plan.md` para contexto completo (610 líneas)

---

## FASE 1: Limpieza de Vercel 🧹 ✅ COMPLETADA

### 1.1 Eliminar vercel.json ✅
- [x] Eliminar archivo `vercel.json` (completado: 5min)
  - Archivo eliminado: 37 líneas de configuración específica de Vercel
  - Files: `vercel.json` (deleted)
  - Agent: **backend-developer**
  - Test: ✅ `git status` muestra vercel.json deleted

### 1.2 Actualizar package.json ✅
- [x] Eliminar script de deploy a Vercel + @vercel/kv dependency (completado: 5min)
  - Eliminado línea 26: `"deploy": "npm run pre-deploy && vercel --prod"`
  - Eliminado línea 54: `"@vercel/kv": "^3.0.0"`
  - Files: `package.json`
  - Agent: **backend-developer**
  - Test: ✅ `npm run deploy` falla con "script not found"
  - Test: ✅ `@vercel/kv` no está en uso en el código

### 1.3 Actualizar .gitignore ✅
- [x] Eliminar referencias a Vercel (completado: 5min)
  - Eliminadas líneas 36-37: `# vercel` y `.vercel`
  - Files: `.gitignore`
  - Agent: **backend-developer**
  - Test: ✅ `grep -i vercel .gitignore` retorna vacío

### 1.4 Refactor deploy-agent.md ✅
- [x] Actualizar agente para VPS workflow (completado: 30min)
  - Cambiado URL: `https://innpilot.vercel.app` → `https://innpilot.io` (2 ocurrencias)
  - Eliminada sección: "Monitoreo de Deploy en Vercel"
  - Actualizado workflow: commit → push → GitHub Actions → verify
  - Files: `.claude/agents/deploy-agent.md` (249 líneas)
  - Agent: **backend-developer**
  - Test: ✅ Solo referencias históricas a Vercel
  - Test: ✅ 6 referencias a "GitHub Actions"

### 1.5 Actualizar README.md ✅
- [x] Modificar sección de Deploy (completado: 15min)
  - Línea 24: Cambiado "Deploy: Vercel US East" → "Deploy: VPS Hostinger (innpilot.io) + GitHub Actions"
  - Sección Deploy (líneas 312-353): Reemplazada con VPS instructions completas
  - Todas las URLs actualizadas: 9 reemplazos de `innpilot.vercel.app` → `innpilot.io`
  - Files: `README.md`
  - Agent: **backend-developer**
  - Test: ✅ `grep -i vercel README.md` retorna 0 resultados
  - Test: ✅ 14 referencias a `innpilot.io`
  - Test: ✅ 2 links a `docs/deployment/`

---

## FASE 2: GitHub Actions Workflow ⚙️

### 2.1 Crear directorio .github/workflows ✅
- [x] Crear estructura de GitHub Actions (completado: 2min)
  - Directory: `.github/workflows/` creado
  - Files: `.github/workflows/` (directory)
  - Agent: **backend-developer**
  - Test: ✅ `ls -la .github/workflows/` existe

### 2.2 Crear deploy.yml workflow ✅
- [x] Implementar workflow de deployment (completado: 15min)
  - Trigger: `on: push: branches: [dev]` (modificado de `main` a `dev`)
  - Steps: 9 steps implementados (Checkout → Setup Node.js → Install → Build → Deploy SSH → Wait → Health check → Rollback → Notify)
  - Files: `.github/workflows/deploy.yml` (74 líneas)
  - Agent: **backend-developer**
  - Test: ✅ `cat .github/workflows/deploy.yml | grep "name: Deploy to VPS"`
  - Test: ✅ 9 steps definidos correctamente
  - Test: ✅ Health check a `https://innpilot.io/api/health`
  - Test: ✅ Rollback automático implementado
  - Test: ✅ Trigger configurado para rama `dev`

### 2.3 Documentar GitHub Secrets ✅
- [x] Crear guía de configuración de Secrets (completado: 10min)
  - Secrets: 10 secrets documentados (VPS_HOST, VPS_USER, VPS_SSH_KEY, VPS_APP_PATH, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, JWT_SECRET_KEY)
  - Files: `docs/deployment/GITHUB_SECRETS.md` (141 líneas)
  - Agent: **backend-developer**
  - Test: ✅ 10 secrets documentados con instrucciones paso a paso
  - Test: ✅ Secciones: Acceso, Secrets Requeridos, Verificación, Seguridad

### 2.4 Configurar GitHub Secrets (manual) ✅
- [x] Configurar 10 secrets en GitHub (completado: 20min)
  - Action: https://github.com/toneill57/innpilot → Settings → Secrets and variables → Actions
  - Guide: Seguido `docs/deployment/GITHUB_SECRETS.md`
  - Secrets configurados:
    - [x] VPS_HOST
    - [x] VPS_USER
    - [x] VPS_SSH_KEY
    - [x] VPS_APP_PATH
    - [x] SUPABASE_URL
    - [x] SUPABASE_ANON_KEY
    - [x] SUPABASE_SERVICE_ROLE_KEY
    - [x] OPENAI_API_KEY
    - [x] ANTHROPIC_API_KEY
    - [x] JWT_SECRET_KEY
  - Test: ✅ 10 secrets verificados en GitHub UI

### 2.5 Test workflow (manual)
- [ ] Validar workflow en GitHub (estimado: 10min)
  - Files: N/A (validation in GitHub UI)
  - Agent: **backend-developer**
  - Test: GitHub Actions muestra workflow sin errores de sintaxis

---

## FASE 3: VPS Server Setup Guide 📚

### 3.1 Crear docs/deployment/ directory
- [ ] Crear estructura de documentación (estimado: 5min)
  - Files: `docs/deployment/` (directory)
  - Agent: **backend-developer**
  - Test: `ls -la docs/deployment/` debe existir

### 3.2 Crear VPS_SETUP_GUIDE.md
- [ ] Escribir guía completa de setup VPS (estimado: 1h 30min)
  - Secciones: Configuración Inicial, Aplicación, PM2, Nginx, SSL
  - Files: `docs/deployment/VPS_SETUP_GUIDE.md` (~400 líneas)
  - Agent: **backend-developer**
  - Test: Verificar 5 secciones principales

### 3.3 Crear ecosystem.config.js (PM2)
- [ ] Configuración de PM2 para producción (estimado: 20min)
  - Instances: 2 (cluster mode), Max memory: 1G
  - Files: `docs/deployment/ecosystem.config.js` (~25 líneas)
  - Agent: **backend-developer**
  - Test: `node -e "require('./docs/deployment/ecosystem.config.js')"`

### 3.4 Crear nginx-innpilot.conf
- [ ] Configuración de Nginx optimizada (estimado: 30min)
  - Server: innpilot.io, Proxy: localhost:3000, Rate limiting
  - Files: `docs/deployment/nginx-innpilot.conf` (~80 líneas)
  - Agent: **backend-developer**
  - Test: Validar sintaxis Nginx

### 3.5 Crear vps-setup.sh
- [ ] Script automatizado de setup inicial (estimado: 30min)
  - Install: Node.js, PM2, Nginx, Certbot, Git
  - Files: `scripts/vps-setup.sh` (~50 líneas)
  - Agent: **backend-developer**
  - Test: `bash -n scripts/vps-setup.sh`

### 3.6 Crear .env.example para VPS
- [ ] Template de variables de entorno para producción (estimado: 15min)
  - Agregar: NODE_ENV=production, NEXT_PUBLIC_APP_URL=https://innpilot.io
  - Files: `docs/deployment/env.example` (~50 líneas)
  - Agent: **backend-developer**
  - Test: Comparar con `.env.example` raíz

---

## FASE 4: Deploy Agent Refactor 🤖

### 4.1 Actualizar deploy-agent.md
- [ ] Refactor completo del agente (estimado: 45min)
  - Workflow: commit → push → GitHub Actions verification → health checks
  - Endpoints: https://innpilot.io/api/health, /api/chat, /api/chat/muva
  - Files: `.claude/agents/deploy-agent.md`
  - Agent: **backend-developer**
  - Test: Verificar menciona GitHub Actions y no Vercel deploy monitoring

### 4.2 Test deploy agent workflow
- [ ] Validar nuevo flujo de deploy agent (estimado: 15min)
  - Files: N/A (testing workflow)
  - Agent: **backend-developer**
  - Test: Deploy agent reporta status correcto

---

## FASE 5: Testing & Documentation ✨

### 5.1 Crear DEPLOYMENT_WORKFLOW.md
- [ ] Documentar workflow completo de deployment (estimado: 30min)
  - Secciones: Overview, Manual deployment, Rollback, Monitoring
  - Files: `docs/deployment/DEPLOYMENT_WORKFLOW.md` (~150 líneas)
  - Agent: **backend-developer**
  - Test: Verificar 4 secciones principales

### 5.2 Crear TROUBLESHOOTING.md
- [ ] Guía de problemas comunes (estimado: 30min)
  - 7 problemas: Build fails, SSH timeout, PM2 crashes, Nginx 502, SSL renewal, Health check fails, API errors
  - Files: `docs/deployment/TROUBLESHOOTING.md` (~200 líneas)
  - Agent: **backend-developer**
  - Test: Verificar 7 problemas documentados

### 5.3 Actualizar README.md - sección Deploy
- [ ] Reescribir sección de Deploy completa (estimado: 20min)
  - Eliminar: Vercel, Agregar: GitHub Actions + VPS
  - Files: `README.md` (líneas 312-400)
  - Agent: **backend-developer**
  - Test: `grep -i "vercel" README.md` debe retornar 0 resultados

### 5.4 Actualizar CLAUDE.md
- [ ] Actualizar proyecto actual (estimado: 15min)
  - Proyecto: "VPS Deployment Migration"
  - Files: `CLAUDE.md` (líneas 50-120)
  - Agent: **backend-developer**
  - Test: `grep -i "VPS Deployment Migration" CLAUDE.md` debe encontrar entrada

### 5.5 Testing end-to-end completo
- [ ] Validar deployment completo (estimado: 1h)
  - [ ] Push to dev triggers GitHub Actions
  - [ ] Build completes (< 3min)
  - [ ] Deploy to VPS executes
  - [ ] PM2 restart works
  - [ ] Health check: `curl https://innpilot.io/api/health` → 200
  - [ ] Chat endpoint funciona
  - [ ] MUVA endpoint funciona
  - [ ] SSL certificate válido
  - [ ] Response time ~0.490s
  - Files: N/A (manual testing)
  - Agent: **backend-developer**
  - Test: Todos los checks pasan ✓

---

## 📊 PROGRESO

**Total Tasks:** 29
**Completed:** 9/29 (31%)

**Por Fase:**
- FASE 1: ✅ 5/5 tareas (100% COMPLETADA)
- FASE 2: ✅ 4/5 tareas (80%) - 🔜 Pendiente: Test workflow en GitHub
- FASE 3: 0/6 tareas (0%)
- FASE 4: 0/2 tareas (0%)
- FASE 5: 0/5 tareas (0%)

**Archivos creados en FASE 2:**
```
new file:   .github/workflows/deploy.yml (74 líneas)
new file:   docs/deployment/GITHUB_SECRETS.md (141 líneas)
```

**Archivos modificados en FASE 1:**
```
deleted:    vercel.json
modified:   package.json
modified:   .gitignore
modified:   .claude/agents/deploy-agent.md
modified:   README.md
```

**Próxima acción:**
1. 🔜 FASE 2.5 - Test workflow en GitHub (manual - 10min)
2. Continuar con FASE 3 - VPS Setup Guide (2h estimado)

---

**Última actualización:** 4 de Octubre 2025 - FASE 2: 80% completada ✅
