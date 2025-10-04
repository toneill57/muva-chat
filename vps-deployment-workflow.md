# PROMPTS WORKFLOW - VPS Deployment Migration

**Proyecto:** VPS Deployment Migration (Vercel → Hostinger + GitHub Actions)
**Archivos de referencia:** `plan.md` (610 líneas) + `TODO.md` (208 líneas)

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: VPS Deployment Migration

Estoy trabajando en migrar InnPilot de Vercel a VPS Hostinger con despliegue automático vía GitHub Actions.

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (610 líneas, 5 fases)
- TODO.md → 28 tareas organizadas por fases
- vps-deployment-workflow.md → Este archivo con prompts ejecutables

OBJETIVO:
Eliminar dependencia de Vercel y configurar deployment automático push-to-dev en VPS (innpilot.io)

STACK DEPLOYMENT:
- CI/CD: GitHub Actions
- VPS: Hostinger (Ubuntu 22.04)
- Web Server: Nginx (reverse proxy)
- Process Manager: PM2 (cluster mode)
- SSL: Let's Encrypt (Certbot)

ESTADO ACTUAL:
- ✅ App funcionando en Vercel (https://innpilot.vercel.app)
- ✅ GitHub repo: https://github.com/toneill57/innpilot.git
- 🔜 Migrar a VPS con GitHub Actions

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 1: Limpieza de Vercel (1h)

### Prompt 1.1: Eliminar vercel.json

```
oye tu @backend-developer ahora Eliminar vercel.json y limpiar referencias a Vercel

CONTEXTO:
- Proyecto: VPS Deployment Migration (ver plan.md)
- Archivo actual: vercel.json (37 líneas de configuración Vercel)
- Objetivo: Remover toda dependencia de Vercel

ESPECIFICACIONES:

1. Eliminar archivo vercel.json
   - Archivo completo: /Users/oneill/Sites/apps/InnPilot/vercel.json
   - Contiene: regions, buildCommand, functions config, CORS headers

2. Actualizar package.json
   - Eliminar línea 26: `"deploy": "npm run pre-deploy && vercel --prod"`
   - Mantener: build, start, dev, test scripts

3. Actualizar .gitignore
   - Eliminar línea 36: `# vercel`
   - Eliminar línea 37: `.vercel`

ARCHIVOS:
- Eliminar: vercel.json
- Modificar: package.json (línea 26)
- Modificar: .gitignore (líneas 36-37)

TEST:
```bash
# Verificar vercel.json eliminado
git status | grep "deleted:.*vercel.json"

# Verificar package.json sin deploy script
grep -c "deploy.*vercel" package.json  # Debe retornar 0

# Verificar .gitignore limpio
grep -i vercel .gitignore  # Debe retornar vacío
```

SIGUIENTE: Prompt 1.2 para refactor deploy-agent.md
```

---

### Prompt 1.2: Refactor deploy-agent.md

```
ahora tu mismo, @backend-developer ayúdame con el Refactor completo de deploy-agent.md para VPS workflow

CONTEXTO:
Eliminar monitoreo de Vercel y actualizar workflow para GitHub Actions + VPS

ARCHIVOS:
- Leer: .claude/agents/deploy-agent.md (257 líneas)
- Modificar: .claude/agents/deploy-agent.md

ESPECIFICACIONES:

1. Actualizar URL de producción
   - Cambiar: `https://innpilot.vercel.app` → `https://innpilot.io`
   - En todas las ocurrencias del archivo

2. Eliminar secciones:
   - "Paso 4: Monitoreo de Deploy en Vercel"
   - "Configuración del Agent > deployUrl"
   - Referencias a Vercel dashboard/CLI

3. Actualizar workflow del agente:
   ```markdown
   ## Workflow
   1. **Commit Automático**: Analiza cambios y genera commit descriptivo
   2. **Push a GitHub**: Ejecuta git push origin dev
   3. **Monitoreo GitHub Actions**: Verifica que workflow complete (opcional)
   4. **Verificación Funcional**: Prueba endpoints en https://innpilot.io
   5. **Reporte**: Genera reporte de deployment con métricas
   ```

4. Mantener verificación de endpoints:
   - `https://innpilot.io/api/health`
   - `https://innpilot.io/api/chat`
   - `https://innpilot.io/api/chat/muva`

5. Actualizar ejemplo de ejecución exitosa:
   - Eliminar: "Monitoreando deploy en Vercel..."
   - Agregar: "Push a GitHub completado → GitHub Actions deploying"

TEST:
```bash
# Verificar URL actualizada
grep -c "innpilot.io" .claude/agents/deploy-agent.md  # Debe retornar >3

# Verificar Vercel solo en contexto histórico
grep -i "vercel" .claude/agents/deploy-agent.md | grep -v -i "histórico\|legacy\|anteriormente"  # Debe retornar vacío

# Verificar workflow actualizado
grep -c "GitHub Actions" .claude/agents/deploy-agent.md  # Debe retornar >1
```

SIGUIENTE: Prompt 1.3 para actualizar README.md
```

---

### Prompt 1.3: ahora para Actualizar README.md ve tu de nuevo
@backend-developer para 

TAREA: Actualizar sección de Deploy en README.md

CONTEXTO:
README.md tiene referencias a Vercel que deben reemplazarse con VPS workflow

ARCHIVOS:
- Leer: README.md (496 líneas)
- Modificar: README.md (líneas 24, 312-328)

ESPECIFICACIONES:

1. Actualizar línea 24 (Stack Tecnológico):
   ```markdown
   ANTES: - **Deploy**: Vercel US East
   DESPUÉS: - **Deploy**: VPS Hostinger (innpilot.io) + GitHub Actions
   ```

2. Reemplazar sección Deploy (líneas 312-328):
   ```markdown
   ## 🚀 Deploy

   ### Production Deployment (VPS Hostinger)

   La aplicación se despliega automáticamente vía GitHub Actions cuando se hace push a `dev`.

   **Deployment Workflow:**
   ```bash
   git push origin dev
   # → GitHub Actions build + deploy
   # → Live on https://innpilot.io (< 5min)
   ```

   **Manual Deployment:**
   Ver guía completa en [docs/deployment/VPS_SETUP_GUIDE.md](docs/deployment/VPS_SETUP_GUIDE.md)

   **Verificación:**
   ```bash
   # Health check
   curl https://innpilot.io/api/health

   # Check SSL
   curl -vI https://innpilot.io
   ```

   **Logs:**
   ```bash
   # SSH to VPS
   ssh user@innpilot.io

   # View PM2 logs
   pm2 logs innpilot

   # View Nginx logs
   sudo tail -f /var/log/nginx/innpilot-access.log
   sudo tail -f /var/log/nginx/innpilot-error.log
   ```

   ### Variables de Entorno en VPS

   Configurar las variables de `.env.local` en el servidor VPS.
   Ver [docs/deployment/VPS_SETUP_GUIDE.md](docs/deployment/VPS_SETUP_GUIDE.md) para detalles.
   ```

TEST:
```bash
# Verificar referencias a Vercel eliminadas
grep -i "vercel" README.md  # Debe retornar 0 resultados

# Verificar nuevas referencias a VPS
grep -c "innpilot.io" README.md  # Debe retornar >5

# Verificar links a docs/deployment/
grep -c "docs/deployment/" README.md  # Debe retornar >2
```

SIGUIENTE: FASE 1 completa → FASE 2 (GitHub Actions)
```

---

## FASE 2: GitHub Actions Workflow (2h)

### Prompt 2.1: para Crear estructura y deploy.yml usemos @backend-developer

TAREA: Crear GitHub Actions workflow completo para deployment automático

CONTEXTO:
- Proyecto: VPS Deployment Migration
- Target: VPS Hostinger (innpilot.io)
- Trigger: push to dev
- Workflow: build → deploy SSH → restart PM2 → health check → rollback si falla

ARCHIVOS:
- Crear: .github/workflows/deploy.yml (~150 líneas)

ESPECIFICACIONES:

Crear archivo `.github/workflows/deploy.yml` con el siguiente contenido:

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - dev

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ${{ secrets.VPS_APP_PATH }}
            git pull origin dev
            npm ci --legacy-peer-deps --production
            npm run build
            pm2 restart innpilot

      - name: Wait for deployment
        run: sleep 10

      - name: Health check
        run: |
          response=$(curl -s -o /dev/null -w "%{http_code}" https://innpilot.io/api/health)
          if [ $response != "200" ]; then
            echo "Health check failed with status $response"
            exit 1
          fi
          echo "Health check passed: $response"

      - name: Rollback on failure
        if: failure()
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd ${{ secrets.VPS_APP_PATH }}
            git reset --hard HEAD~1
            npm ci --legacy-peer-deps --production
            npm run build
            pm2 restart innpilot
            echo "Rolled back to previous version"

      - name: Notify success
        if: success()
        run: |
          echo "✅ Deployment successful!"
          echo "🌐 https://innpilot.io is live"
```

TEST:
```bash
# Verificar archivo creado
ls -la .github/workflows/deploy.yml

# Verificar sintaxis YAML válida
cat .github/workflows/deploy.yml | grep "name: Deploy to VPS"

# Verificar steps principales
grep -c "name:" .github/workflows/deploy.yml  # Debe retornar 8 (8 steps)
```

SIGUIENTE: Prompt 2.2 para documentar GitHub Secrets
```

---

### Prompt 2.2: Documentar GitHub Secrets

```
ahora,  @backend-developer ayúdame a Crear guía de configuración de GitHub Secrets

CONTEXTO:
El workflow de GitHub Actions necesita 10 secrets configurados

ARCHIVOS:
- Crear: docs/deployment/GITHUB_SECRETS.md (~80 líneas)

ESPECIFICACIONES:

Crear archivo `docs/deployment/GITHUB_SECRETS.md` con el siguiente contenido:

```markdown
# GitHub Secrets Configuration

Esta guía explica cómo configurar los Secrets necesarios para el deployment automático via GitHub Actions.

## Acceso a GitHub Secrets

1. Ve al repositorio: https://github.com/toneill57/innpilot
2. Click en **Settings** (tab superior)
3. En el menú izquierdo: **Secrets and variables** → **Actions**
4. Click en **New repository secret**

---

## Secrets Requeridos

### 1. VPS_HOST
**Descripción:** IP o hostname del servidor VPS Hostinger

**Valor:** `123.45.67.89` o `innpilot.io`

**Cómo obtenerlo:**
- Panel de Hostinger → VPS → Información del servidor → IP Address

---

### 2. VPS_USER
**Descripción:** Usuario SSH para conectar al VPS

**Valor:** `root` o `innpilot` (usuario creado)

**Cómo obtenerlo:**
- Usuario root por defecto en Hostinger VPS
- O usuario creado durante setup inicial

---

### 3. VPS_SSH_KEY
**Descripción:** Private SSH key para autenticación sin password

**Valor:** Contenido completo de tu clave privada

**Cómo generarlo:**
```bash
# En tu máquina local
ssh-keygen -t rsa -b 4096 -C "github-actions@innpilot.io"
# Guardar en: ~/.ssh/innpilot_deploy

# Copiar clave pública al servidor
ssh-copy-id -i ~/.ssh/innpilot_deploy.pub user@innpilot.io

# Obtener clave privada para GitHub Secret
cat ~/.ssh/innpilot_deploy
# Copiar TODO el output (incluyendo BEGIN/END lines)
```

---

### 4. VPS_APP_PATH
**Descripción:** Path absoluto donde está la aplicación en el VPS

**Valor:** `/var/www/innpilot`

---

### 5. SUPABASE_URL
**Descripción:** URL de tu proyecto Supabase

**Valor:** `https://ooaumjzaztmutltifhoq.supabase.co`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → Project URL

---

### 6. SUPABASE_ANON_KEY
**Descripción:** Supabase anonymous/public key

**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → anon/public key

---

### 7. SUPABASE_SERVICE_ROLE_KEY
**Descripción:** Supabase service role key (secret)

**Valor:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Cómo obtenerlo:**
- Supabase Dashboard → Settings → API → service_role key (secret)

---

### 8. OPENAI_API_KEY
**Descripción:** OpenAI API key para embeddings

**Valor:** `sk-proj-...`

**Cómo obtenerlo:**
- OpenAI Platform → API Keys → Create new secret key

---

### 9. ANTHROPIC_API_KEY
**Descripción:** Anthropic API key para Claude

**Valor:** `sk-ant-api03-...`

**Cómo obtenerlo:**
- Anthropic Console → API Keys → Create key

---

### 10. JWT_SECRET_KEY
**Descripción:** Secret key para JWT authentication

**Valor:** String aleatorio de 64+ caracteres

**Cómo generarlo:**
```bash
openssl rand -base64 64
```

---

## Verificación

Después de configurar todos los secrets:

1. Ve a: **Settings** → **Secrets and variables** → **Actions**
2. Debes ver 10 secrets listados
3. Ningún secret debe mostrar su valor (solo nombre)

## Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** comittees secrets en el código
- **NUNCA** compartas secrets en chat/email
- Rota secrets periódicamente (cada 90 días)
- Usa secrets diferentes para dev/prod
```

TEST:
```bash
# Verificar archivo creado
ls -la docs/deployment/GITHUB_SECRETS.md

# Verificar 10 secrets documentados
grep -c "^### [0-9]\+\." docs/deployment/GITHUB_SECRETS.md  # Debe retornar 10
```

SIGUIENTE: FASE 2 completa → FASE 3 (VPS Setup Guide)
```

---

## FASE 3: VPS Server Setup Guide (3h)

### Prompt 3.1: Crear VPS_SETUP_GUIDE.md completa

```
@backend-developer

TAREA: Crear guía completa de setup del VPS Hostinger

CONTEXTO:
Guía paso a paso para configurar servidor desde cero hasta app funcionando con SSL

ARCHIVOS:
- Crear: docs/deployment/VPS_SETUP_GUIDE.md (~400 líneas)
- Crear: docs/deployment/ directory si no existe

ESPECIFICACIONES:

La guía debe cubrir 5 secciones principales:
1. Configuración Inicial del Servidor
2. Configuración de Aplicación
3. Configuración de PM2
4. Configuración de Nginx
5. SSL Setup con Let's Encrypt

**NOTA:** Debido a la longitud de este archivo, revisar plan.md líneas 200-350 para el contenido completo.

Incluir:
- Comandos completos copy-paste ready
- Explicaciones breves de cada paso
- Warnings para pasos críticos
- Verificaciones después de cada sección

TEST:
```bash
# Verificar archivo creado
ls -la docs/deployment/VPS_SETUP_GUIDE.md

# Verificar 5 secciones principales
grep -c "^## [0-9]\." docs/deployment/VPS_SETUP_GUIDE.md  # Debe retornar 5

# Verificar longitud adecuada
wc -l docs/deployment/VPS_SETUP_GUIDE.md  # Debe ser ~400 líneas
```

SIGUIENTE: Prompt 3.2 para ecosystem.config.js
```

---

### Prompt 3.2: Crear ecosystem.config.js (PM2)

```
@backend-developer

TAREA: Crear configuración de PM2 para producción

CONTEXTO:
PM2 gestionará el proceso Node.js en modo cluster

ARCHIVOS:
- Crear: docs/deployment/ecosystem.config.js (~25 líneas)

ESPECIFICACIONES:

Crear archivo `docs/deployment/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'innpilot',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/innpilot',
    instances: 2,
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/innpilot-error.log',
    out_file: '/var/log/pm2/innpilot-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
}
```

**Notas:**
- 2 instances para VPS con 2 CPU cores
- Cluster mode para load balancing
- Max memory 1GB por instance
- Logs en /var/log/pm2/

TEST:
```bash
# Verificar sintaxis JavaScript
node -e "require('./docs/deployment/ecosystem.config.js')"

# Verificar configuración
cat docs/deployment/ecosystem.config.js | grep "name: 'innpilot'"
```

SIGUIENTE: Prompt 3.3 para nginx-innpilot.conf
```

---

### Prompt 3.3: Crear nginx-innpilot.conf

```
@backend-developer

TAREA: Crear configuración de Nginx optimizada

CONTEXTO:
Nginx como reverse proxy para Next.js con rate limiting y SSL

ARCHIVOS:
- Crear: docs/deployment/nginx-innpilot.conf (~80 líneas)

ESPECIFICACIONES:

**NOTA:** Ver plan.md líneas 280-320 para configuración completa de Nginx.

Incluir:
- Rate limiting (10 req/s para /api/)
- Compression (gzip)
- Security headers
- Proxy settings optimizados para Next.js
- Timeouts para API requests largos (60s)
- Logging configurado

TEST:
```bash
# Verificar sintaxis Nginx (simulación)
cat docs/deployment/nginx-innpilot.conf | grep "server_name innpilot.io"

# Verificar rate limiting configurado
grep -c "limit_req" docs/deployment/nginx-innpilot.conf  # Debe retornar >1
```

SIGUIENTE: Prompt 3.4 para vps-setup.sh
```

---

### Prompt 3.4: Crear vps-setup.sh

```
@backend-developer

TAREA: Crear script automatizado de setup inicial del VPS

CONTEXTO:
Script para instalar todas las dependencias del servidor

ARCHIVOS:
- Crear: scripts/vps-setup.sh (~50 líneas)

ESPECIFICACIONES:

Crear script bash ejecutable que instale:
1. Node.js 20.x LTS
2. PM2 global
3. Nginx
4. Certbot (Let's Encrypt)
5. Git

Incluir:
- Shebang: `#!/bin/bash`
- Set -e (exit on error)
- Mensajes informativos
- Verificaciones post-instalación

TEST:
```bash
# Verificar sintaxis bash
bash -n scripts/vps-setup.sh

# Verificar ejecutable
chmod +x scripts/vps-setup.sh
ls -l scripts/vps-setup.sh | grep "x"  # Debe mostrar permisos de ejecución
```

SIGUIENTE: FASE 3 completa → FASE 4 (Deploy Agent Refactor final)
```

---

## FASE 4: Deploy Agent Refactor Final (1h)

### Prompt 4.1: Validar deploy-agent.md refactor

```
@backend-developer

TAREA: Validar que deploy-agent.md está completamente actualizado

CONTEXTO:
Verificar que no queden referencias a Vercel y que el workflow esté actualizado

ARCHIVOS:
- Revisar: .claude/agents/deploy-agent.md

VERIFICACIONES:

1. URL correcta en todos los lugares:
   ```bash
   grep -c "innpilot.io" .claude/agents/deploy-agent.md  # Debe ser >5
   grep -c "vercel.app" .claude/agents/deploy-agent.md  # Debe ser 0
   ```

2. Workflow actualizado menciona GitHub Actions:
   ```bash
   grep -c "GitHub Actions" .claude/agents/deploy-agent.md  # Debe ser >1
   ```

3. Endpoints de verificación correctos:
   - https://innpilot.io/api/health
   - https://innpilot.io/api/chat
   - https://innpilot.io/api/chat/muva

4. Performance esperada documentada: ~0.490s response time

Si alguna verificación falla, actualizar el archivo según plan.md FASE 4.

SIGUIENTE: FASE 4 completa → FASE 5 (Testing & Documentation final)
```

---

## FASE 5: Testing & Documentation Final (1h)

### Prompt 5.1: Crear DEPLOYMENT_WORKFLOW.md

```
@backend-developer

TAREA: Documentar workflow completo de deployment

CONTEXTO:
Guía de referencia rápida para deployments y troubleshooting

ARCHIVOS:
- Crear: docs/deployment/DEPLOYMENT_WORKFLOW.md (~150 líneas)

ESPECIFICACIONES:

Secciones:

1. **Overview del Proceso**
   - Diagrama de flujo: Developer → GitHub → VPS
   - Timeline esperado: < 5min total

2. **Deployment Automático**
   - Push to dev
   - GitHub Actions workflow
   - Verificación post-deploy

3. **Deployment Manual**
   - SSH al servidor
   - git pull
   - npm ci && npm run build
   - pm2 restart innpilot

4. **Rollback**
   - Automático (vía GitHub Actions)
   - Manual (comandos git reset + rebuild)

5. **Monitoreo**
   - Health checks
   - PM2 status
   - Nginx logs
   - Application logs

TEST:
```bash
# Verificar archivo creado
ls -la docs/deployment/DEPLOYMENT_WORKFLOW.md

# Verificar 5 secciones
grep -c "^## [0-9]\." docs/deployment/DEPLOYMENT_WORKFLOW.md  # Debe retornar 5
```

SIGUIENTE: Prompt 5.2 para TROUBLESHOOTING.md
```

---

### Prompt 5.2: Crear TROUBLESHOOTING.md

```
@backend-developer

TAREA: Crear guía de troubleshooting de problemas comunes

CONTEXTO:
Documentar 7 problemas comunes con síntomas, causas y soluciones

ARCHIVOS:
- Crear: docs/deployment/TROUBLESHOOTING.md (~200 líneas)

ESPECIFICACIONES:

Documentar cada problema con:
- **Síntoma**: Qué ves
- **Causa**: Por qué pasa
- **Solución**: Cómo solucionarlo (comandos específicos)

Problemas a cubrir:

1. Build fails en GitHub Actions
2. SSH connection timeout
3. PM2 process crashes
4. Nginx 502 Bad Gateway
5. SSL certificate renewal fails
6. Health check fails
7. API endpoints returning errors

TEST:
```bash
# Verificar archivo creado
ls -la docs/deployment/TROUBLESHOOTING.md

# Verificar 7 problemas documentados
grep -c "^### [0-9]\." docs/deployment/TROUBLESHOOTING.md  # Debe retornar 7
```

SIGUIENTE: Prompt 5.3 para actualizar CLAUDE.md
```

---

### Prompt 5.3: Actualizar CLAUDE.md

```
@backend-developer

TAREA: Actualizar CLAUDE.md con proyecto actual

CONTEXTO:
Reemplazar "Fixed Layout Migration" con "VPS Deployment Migration"

ARCHIVOS:
- Modificar: CLAUDE.md (líneas 50-120)

ESPECIFICACIONES:

Reemplazar sección "🎯 CURRENT PROJECT" (líneas 50-120) con:

```markdown
## 🎯 CURRENT PROJECT: VPS Deployment Migration (Oct 2025)

### Objective
Migrar deployment de Vercel a VPS Hostinger con CI/CD automático via GitHub Actions

### Project Files
- 📄 **Plan**: `plan.md` (610 líneas) - Arquitectura completa, 5 fases
- 📋 **Tasks**: `TODO.md` (208 líneas) - 28 tareas organizadas
- 🎯 **Prompts**: `vps-deployment-workflow.md` (650 líneas) - Prompts ejecutables

### Status
- **Planning**: ✅ Complete
- **FASE 1**: 🔜 Ready (Limpieza Vercel - 1h)
- **FASE 2**: Pending (GitHub Actions - 2h)
- **FASE 3**: Pending (VPS Setup Guide - 3h)
- **FASE 4**: Pending (Deploy Agent Refactor - 1h)
- **FASE 5**: Pending (Testing & Docs - 1h)

### Key Specs
- **VPS**: Hostinger (Ubuntu 22.04)
- **Domain**: innpilot.io
- **CI/CD**: GitHub Actions (push to dev = auto-deploy)
- **Infrastructure**: Nginx + PM2 + Let's Encrypt SSL
- **Timeline**: 8 horas total

---
```

TEST:
```bash
# Verificar actualización
grep -c "VPS Deployment Migration" CLAUDE.md  # Debe retornar >1

# Verificar referencias a archivos correctos
grep -c "plan.md.*610 líneas" CLAUDE.md  # Debe retornar 1
```

SIGUIENTE: Prompt 5.4 para testing end-to-end
```

---

### Prompt 5.4: Testing End-to-End Completo

```
@backend-developer

TAREA: Ejecutar checklist completo de testing de deployment

CONTEXTO:
Validar que todo el flujo de deployment funciona correctamente

TESTING CHECKLIST:

1. **GitHub Actions Trigger**
   ```bash
   # Hacer un cambio trivial y push
   echo "# Deployment test" >> README.md
   git add README.md
   git commit -m "test: validate deployment workflow"
   git push origin dev

   # Verificar workflow triggerado
   # Ir a: https://github.com/toneill57/innpilot/actions
   # Debe aparecer nuevo workflow "Deploy to VPS"
   ```

2. **Build Completes**
   - Workflow debe completar en < 3min
   - Todos los steps en verde ✅
   - No hay errores en logs

3. **Deploy to VPS Executes**
   ```bash
   # SSH al servidor
   ssh user@innpilot.io

   # Verificar última actualización
   cd /var/www/innpilot
   git log -1 --oneline  # Debe mostrar último commit
   ```

4. **PM2 Restart Works**
   ```bash
   # En el servidor
   pm2 status innpilot
   # Debe mostrar: online, uptime reciente, 0 restarts
   ```

5. **Health Check Passes**
   ```bash
   curl https://innpilot.io/api/health
   # Debe retornar: {"status":"healthy","services":{...}}
   ```

6. **Chat Endpoint Funciona**
   ```bash
   curl -X POST https://innpilot.io/api/chat \
     -H "Content-Type: application/json" \
     -d '{"question":"Hola","use_context":true}'
   # Debe retornar respuesta JSON válida
   ```

7. **MUVA Endpoint Funciona**
   ```bash
   curl -X POST https://innpilot.io/api/chat/muva \
     -H "Content-Type: application/json" \
     -d '{"question":"Playas en San Andrés","use_context":true}'
   # Debe retornar respuesta JSON válida
   ```

8. **SSL Certificate Válido**
   ```bash
   curl -vI https://innpilot.io 2>&1 | grep "TLS"
   # Debe mostrar: TLSv1.3 o TLSv1.2

   # Verificar en SSL Labs
   # https://www.ssllabs.com/ssltest/analyze.html?d=innpilot.io
   # Debe obtener rating A o A+
   ```

9. **Response Time Comparable**
   ```bash
   # Medir tiempo de respuesta
   time curl -s https://innpilot.io/api/health > /dev/null
   # Debe ser similar a Vercel (~0.490s)
   ```

CRITERIOS DE ÉXITO:
- ✅ Todos los checks pasan
- ✅ No hay errores en logs
- ✅ Response time aceptable
- ✅ SSL válido

Si algún check falla:
1. Revisar logs de GitHub Actions
2. SSH al servidor y revisar logs de PM2/Nginx
3. Consultar docs/deployment/TROUBLESHOOTING.md

SIGUIENTE: Proyecto completo ✅
```

---

## 📋 DOCUMENTACIÓN FINAL

### Prompt: Resumen de Archivos Creados

```
He completado la migración de Vercel a VPS. Resumen de archivos:

**ARCHIVOS CREADOS:**
- ✅ plan.md (610 líneas)
- ✅ TODO.md (208 líneas)
- ✅ vps-deployment-workflow.md (650 líneas)
- ✅ .github/workflows/deploy.yml (150 líneas)
- ✅ docs/deployment/GITHUB_SECRETS.md (80 líneas)
- ✅ docs/deployment/VPS_SETUP_GUIDE.md (400 líneas)
- ✅ docs/deployment/ecosystem.config.js (25 líneas)
- ✅ docs/deployment/nginx-innpilot.conf (80 líneas)
- ✅ docs/deployment/DEPLOYMENT_WORKFLOW.md (150 líneas)
- ✅ docs/deployment/TROUBLESHOOTING.md (200 líneas)
- ✅ scripts/vps-setup.sh (50 líneas)

**ARCHIVOS MODIFICADOS:**
- ✅ package.json (eliminado script deploy)
- ✅ .gitignore (eliminadas referencias Vercel)
- ✅ .claude/agents/deploy-agent.md (refactor completo)
- ✅ README.md (sección Deploy actualizada)
- ✅ CLAUDE.md (proyecto actual actualizado)

**ARCHIVOS ELIMINADOS:**
- ✅ vercel.json

**TOTAL:**
- Creados: 11 archivos (~2,453 líneas)
- Modificados: 5 archivos
- Eliminados: 1 archivo

**PRÓXIMOS PASOS:**
1. Configurar GitHub Secrets (docs/deployment/GITHUB_SECRETS.md)
2. Setup VPS Hostinger (docs/deployment/VPS_SETUP_GUIDE.md)
3. Hacer push to dev para triggear primer deploy automático
4. Validar con checklist de testing (Prompt 5.4)

🎉 **Migración lista para ejecutar!**
```

---

**Última actualización:** 4 de Octubre 2025
