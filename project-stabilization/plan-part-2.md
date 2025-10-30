# Project Stabilization 2025 - PARTE 2/3
# Fases 1, 2 y 3 - Crítico y Dependencias

**Proyecto:** MUVA Platform Stabilization
**Fase Coverage:** FASE 1-3 (Críticas y Dependencias)
**Duración Total Parte 2:** 8-11 horas

---

## FASE 0: VPS Synchronization 🚨

**Duración:** 1 hora
**Prioridad:** BLOQUEANTE CRÍTICA
**Agente Principal:** @agent-infrastructure-monitor

### Objetivo

**✅ BLOQUEANTE RESUELTO:** El VPS estaba desincronizado con el repositorio local. Todos los ambientes ahora sincronizados a f9f6b27:
- **Production VPS:** commit f9f6b27 ✅ (sincronizado)
- **Staging VPS:** commit f9f6b27 ✅ (sincronizado)
- **Local repo:** commit f9f6b27 ✅ (actual)

Esta sincronización fue completada exitosamente, permitiendo continuar con las fases posteriores.

### Entregables

1. ✅ VPS production sincronizado a commit f9f6b27
2. ✅ VPS staging sincronizado a commit f9f6b27
3. ✅ Verificación que ambos ambientes funcionan correctamente
4. ✅ Backup de estado anterior documentado

### Tareas Detalladas

#### 0.1 Sincronizar Production VPS (30min)
```bash
# SSH a VPS
ssh muva@195.200.6.216

# Verificar commit actual
cd ~/muva-chat
git log -1 --oneline
# Expected: 035b89b

# Backup antes de actualizar
pm2 save
cp .env.local .env.local.backup.pre-sync

# Sincronizar
git fetch origin
git checkout f9f6b27
npm install --legacy-peer-deps
npm run build

# Restart
pm2 restart muva-chat
pm2 logs muva-chat --lines 50
```

#### 0.2 Sincronizar Staging VPS (20min)
Similar al paso 0.1 pero para staging instance

#### 0.3 Verificación Post-Sync (10min)
```bash
# Verificar commits
pm2 logs muva-chat | grep "commit"
pm2 logs muva-chat-staging | grep "commit"

# Health check
curl -I https://simmerdown.muva.chat.com
# Expected: 200
```

### Criterios de Éxito FASE 0

- ✅ Ambos VPS en commit f9f6b27
- ✅ Ambas instancias corriendo sin errores
- ✅ Health check pasando
- ✅ Backup documentado

---

## FASE 1: Critical Diagnostics 🔥

**Duración:** 3-4 horas
**Prioridad:** CRÍTICA (después de FASE 0)
**Agente Principal:** @agent-infrastructure-monitor

### Objetivo

**ACTUALIZADO según diagnóstico real (DIAGNOSTICO-f9f6b27.md):**

Documentar baseline PM2 y resolver problemas de logging:
- Documentar patrones de restart históricos (18 prod, 30 staging - PM2 está estable sin crashes activos)
- Fix tenant query logging (PGRST116 - no es bug funcional, pero contamina logs)
- Establecer baseline de monitoreo para comparaciones futuras

**NOTA:** El diagnóstico muestra que PM2 NO tiene crashes activos. Los restarts son históricos. Esta fase es principalmente para documentar el baseline y entender patrones.

### Entregables

1. ✅ Reporte de diagnóstico PM2 completo
2. ✅ Fix de `getTenantBySubdomain()` con `.maybeSingle()`
3. ✅ Configuración PM2 optimizada
4. ✅ Tests de estabilidad pasando
5. ✅ VPS corriendo >24h sin restarts

### Archivos a Modificar

```
src/lib/tenant/tenant.ts                    # Fix .single() → .maybeSingle()
ecosystem.config.js                          # PM2 configuration
scripts/test-pm2-stability.sh                # NEW: Test estabilidad
scripts/monitor-pm2.sh                       # NEW: Monitoring
project-stabilization/docs/fase-1/           # Documentación
  ├── PM2_DIAGNOSTIC_REPORT.md              # Reporte completo
  ├── TENANT_QUERY_FIX.md                   # Cambios realizados
  └── STABILITY_TEST_RESULTS.md             # Resultados tests
```

### Tareas Detalladas

#### 1.1 Diagnóstico PM2 (1h)
**Responsable:** @agent-infrastructure-monitor

**Acciones:**
- [ ] Conectar a VPS y extraer logs completos de PM2
- [ ] Analizar patrón de restarts (timing, causa, memoria)
- [ ] Revisar configuración actual `ecosystem.config.js`
- [ ] Identificar memory leaks o uncaught exceptions
- [ ] Documentar findings en `PM2_DIAGNOSTIC_REPORT.md`

**Comandos:**
```bash
# En VPS
pm2 logs muva-chat --lines 500 --nostream
pm2 logs muva-chat-staging --lines 500 --nostream
pm2 info muva-chat
pm2 info muva-chat-staging
pm2 monit
```

**Output Esperado:**
- Reporte con:
  - Causa raíz de restarts
  - Patrón de memoria (antes/después restart)
  - Lista de errores críticos
  - Recomendaciones de configuración

---

#### 1.2 Fix Tenant Query (45min)
**Responsable:** @agent-backend-developer

**Problema:**
```typescript
// ANTES (causa error PGRST116)
const { data, error } = await supabase
  .from('tenants')
  .select('*')
  .eq('subdomain', subdomain)
  .single();  // ❌ Error si 0 rows

// DESPUÉS (correcto)
const { data, error } = await supabase
  .from('tenants')
  .select('*')
  .eq('subdomain', subdomain)
  .maybeSingle();  // ✅ Retorna null si 0 rows
```

**Acciones:**
- [ ] Localizar `getTenantBySubdomain()` en `src/lib/tenant/tenant.ts`
- [ ] Cambiar `.single()` a `.maybeSingle()`
- [ ] Ajustar manejo de error (null vs error)
- [ ] Actualizar logs (INFO en vez de ERROR para subdomain inexistente)
- [ ] Documentar cambio en `TENANT_QUERY_FIX.md`

**Test:**
```bash
# Verificar que no arroje error con subdomain inexistente
curl https://admin.muva.chat.com -I
# Debería retornar 404 sin error en logs
```

---

#### 1.3 Optimizar Configuración PM2 (1h)
**Responsable:** @agent-infrastructure-monitor

**Configuración Actual (problemas):**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'muva-chat',
    max_memory_restart: '300M',  // ❌ Muy bajo?
    instances: 1,                // ❌ Sin cluster?
    exec_mode: 'fork',           // ❌ No cluster mode
    autorestart: true,
    watch: false,
  }]
}
```

**Configuración Propuesta:**
```javascript
module.exports = {
  apps: [{
    name: 'muva-chat',
    script: 'npm',
    args: 'start',
    instances: 1,                      // Mantener 1 por ahora
    exec_mode: 'fork',
    max_memory_restart: '500M',        // ✅ Aumentar límite
    autorestart: true,
    max_restarts: 10,                  // ✅ Límite de restarts
    min_uptime: '10s',                 // ✅ No contar restart si <10s
    restart_delay: 4000,               // ✅ 4s entre restarts
    watch: false,
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=450'  // ✅ Limitar heap
    }
  }]
}
```

**Acciones:**
- [ ] Actualizar `ecosystem.config.js` con configuración propuesta
- [ ] Ajustar `max_memory_restart` basado en diagnóstico (paso 1.1)
- [ ] Agregar logging mejorado
- [ ] Configurar restart limits
- [ ] Documentar cambios y justificación

---

#### 1.4 Tests de Estabilidad (45min)
**Responsable:** @agent-infrastructure-monitor

**Script:** `scripts/test-pm2-stability.sh`

```bash
#!/bin/bash
# Test estabilidad PM2 (24h mínimo)

echo "🔍 Iniciando test de estabilidad..."

# 1. Baseline
pm2 info muva-chat | grep "restarts"
pm2 info muva-chat | grep "uptime"

# 2. Monitoreo 24h
echo "⏳ Monitoreando por 24 horas..."
echo "  - Marca inicial: $(date)"
echo "  - Marca final: $(date -d '+24 hours')"

# 3. Validación final
# (Ejecutar manualmente después de 24h)
pm2 info muva-chat | grep "restarts"
# Expected: 0 restarts adicionales
```

**Criterios de Éxito:**
- ✅ 0 restarts en 24 horas
- ✅ Memory usage estable (<400MB)
- ✅ Uptime >99.9%
- ✅ No errores PGRST116 en logs

---

#### 1.5 Monitoring Script (30min)
**Responsable:** @agent-infrastructure-monitor

**Script:** `scripts/monitor-pm2.sh`

```bash
#!/bin/bash
# Monitor PM2 health y alertar si hay problemas

THRESHOLD_RESTARTS=5
THRESHOLD_MEMORY=450  # MB

# Check restarts
restarts=$(pm2 jlist | jq '.[0].pm2_env.restart_time')

if [ "$restarts" -gt "$THRESHOLD_RESTARTS" ]; then
  echo "⚠️  ALERTA: $restarts restarts detectados"
  # Aquí agregar webhook/email notification
fi

# Check memory
memory=$(pm2 jlist | jq '.[0].monit.memory / 1024 / 1024')

if [ "$memory" -gt "$THRESHOLD_MEMORY" ]; then
  echo "⚠️  ALERTA: Memoria en ${memory}MB"
fi

echo "✅ PM2 Health Check OK"
```

**Integración:**
```bash
# Agregar a cron (cada hora)
0 * * * * /home/muva/muva-chat/scripts/monitor-pm2.sh >> /var/log/pm2-monitor.log
```

---

#### 1.6 Deployment y Validación (30min)
**Responsable:** @agent-infrastructure-monitor

**Acciones:**
- [ ] Deploy cambios a VPS
- [ ] Restart PM2 con nueva configuración
- [ ] Validar que aplicación levanta correctamente
- [ ] Monitoring inicial (1-2h observación)
- [ ] Documentar resultados en `STABILITY_TEST_RESULTS.md`

**Comandos:**
```bash
# En VPS
cd ~/muva-chat
git pull origin dev
npm install --legacy-peer-deps
npm run build
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 logs --lines 100
```

### Testing

**Test Plan:**
```bash
# 1. Test tenant query (subdomain inexistente)
curl -I https://admin.muva.chat.com
# Expected: 404, no error en logs

# 2. Test tenant query (subdomain válido)
curl -I https://simmerdown.muva.chat.com
# Expected: 200

# 3. Test PM2 stability
pm2 info muva-chat | grep "restarts"
# Expected: 0 restarts en 1h

# 4. Test memory usage
pm2 info muva-chat | grep "memory"
# Expected: <400MB

# 5. Monitor logs
pm2 logs muva-chat --lines 100 --nostream | grep ERROR
# Expected: No errores PGRST116
```

### Criterios de Éxito FASE 1

- ✅ 0 errores PGRST116 en logs (1 hora monitoreo)
- ✅ 0 restarts PM2 en 24 horas
- ✅ Memory usage <400MB estable
- ✅ Logs limpios (solo INFO/WARN legítimos)
- ✅ Documentación completa en `docs/fase-1/`

---

## FASE 2: Environment & Branch Alignment 🌿

**Duración:** 2-3 horas
**Prioridad:** ALTA
**Agente Principal:** @agent-infrastructure-monitor

### Objetivo

Clarificar y alinear la estrategia de branches entre Git, Supabase y ambientes:
- Definir estrategia: staging → dev → main
- Crear scripts de toggle entre ambientes
- Documentar workflow de desarrollo

### Entregables

1. ✅ Branch strategy documentada
2. ✅ Scripts de toggle de ambiente (`scripts/toggle-env.sh`)
3. ✅ Validación de variables de ambiente (`scripts/validate-env.sh`)
4. ✅ Deploy scripts por ambiente
5. ✅ VPS alineado a branch correcto

### Archivos a Crear/Modificar

```
scripts/toggle-env.sh                        # NEW: Toggle staging ↔ production
scripts/validate-env.sh                      # NEW: Validar vars requeridas
scripts/deploy-staging.sh                    # NEW: Deploy a staging
scripts/deploy-dev.sh                        # NEW: Deploy a dev (no main)
package.json                                 # ADD: npm scripts
project-stabilization/docs/fase-2/
  ├── BRANCH_STRATEGY.md                    # Estrategia definida
  ├── ENVIRONMENT_SETUP.md                  # Setup completo
  └── DEPLOYMENT_WORKFLOW.md                # Workflow de deploy
```

### Tareas Detalladas

#### 2.1 Definir Branch Strategy (30min)
**Responsable:** @agent-infrastructure-monitor

**Estrategia Propuesta:**

```
┌─────────────────────────────────────────────────────────┐
│                   BRANCH STRATEGY                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  STAGING (Git Branch: staging)                         │
│  ├─ Propósito: Experimentación, breaking changes       │
│  ├─ Supabase: Proyecto separado (smdhgcpojpurvgdppufo) │
│  ├─ VPS: muva-chat-staging (PM2 instance)             │
│  └─ Deploy: Manual, no CI/CD                           │
│                    ↓                                    │
│  DEV (Git Branch: dev) ← ACTUAL DEFAULT                │
│  ├─ Propósito: Desarrollo estable, features           │
│  ├─ Supabase: Proyecto principal (ooaumjzaztmutltifhoq)│
│  ├─ VPS: muva-chat (PM2 instance)                     │
│  └─ Deploy: Manual por ahora                           │
│                    ↓                                    │
│  MAIN (Git Branch: main) ← NO USAR POR AHORA          │
│  ├─ Propósito: Producción real (futuro)               │
│  ├─ Supabase: Proyecto principal (mismo que dev)      │
│  ├─ VPS: N/A (no separado aún)                        │
│  └─ Deploy: Reservado para el futuro                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Workflow de Desarrollo:**

```bash
# 1. Nueva feature o experimento
git checkout staging
git pull origin staging
# Hacer cambios, probar, romper cosas OK
npm run env:staging  # Conectar a Supabase staging
npm run dev

# 2. Feature estable, mover a dev
git checkout dev
git merge staging  # Merge de cambios probados
npm run env:production  # Conectar a Supabase principal
npm run build && npm run test
git push origin dev

# 3. Deploy a VPS dev
./scripts/deploy-dev.sh

# 4. NUNCA (por ahora) merge a main
# main está reservado para cuando tengamos producción real
```

**Acciones:**
- [ ] Documentar estrategia en `BRANCH_STRATEGY.md`
- [ ] Validar que VPS está en branch `dev` (actual)
- [ ] Confirmar que staging usa `.env.staging`
- [ ] Confirmar que dev usa `.env.local` (producción)

---

#### 2.2 Script Toggle de Ambiente (1h)
**Responsable:** @agent-infrastructure-monitor

**Script:** `scripts/toggle-env.sh`

```bash
#!/bin/bash
# Toggle entre .env.staging y .env.local (production)

set -e

CURRENT_ENV=".env.local"
STAGING_ENV=".env.staging"
BACKUP_DIR=".env.backups"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Crear backup dir si no existe
mkdir -p "$BACKUP_DIR"

# Función: detectar ambiente actual
detect_current_env() {
  if [ -f "$CURRENT_ENV" ]; then
    PROJECT_ID=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$CURRENT_ENV" | cut -d '=' -f2 | cut -d '/' -f3 | cut -d '.' -f1)

    if [ "$PROJECT_ID" = "smdhgcpojpurvgdppufo" ]; then
      echo "staging"
    elif [ "$PROJECT_ID" = "ooaumjzaztmutltifhoq" ]; then
      echo "production"
    else
      echo "unknown"
    fi
  else
    echo "none"
  fi
}

# Función: toggle
toggle_env() {
  CURRENT=$(detect_current_env)

  echo -e "${YELLOW}📍 Ambiente actual: $CURRENT${NC}"

  if [ "$CURRENT" = "production" ]; then
    echo -e "${GREEN}🔄 Cambiando a STAGING...${NC}"

    # Backup
    cp "$CURRENT_ENV" "$BACKUP_DIR/.env.local.$(date +%Y%m%d_%H%M%S)"

    # Toggle
    cp "$STAGING_ENV" "$CURRENT_ENV"

    echo -e "${GREEN}✅ Ambiente cambiado a STAGING${NC}"
    echo "   Project: smdhgcpojpurvgdppufo"

  elif [ "$CURRENT" = "staging" ]; then
    echo -e "${GREEN}🔄 Cambiando a PRODUCTION...${NC}"

    # Buscar último backup de production
    LAST_BACKUP=$(ls -t "$BACKUP_DIR"/.env.local.* 2>/dev/null | head -1)

    if [ -n "$LAST_BACKUP" ]; then
      echo "   Restaurando desde backup: $LAST_BACKUP"
      cp "$LAST_BACKUP" "$CURRENT_ENV"
    else
      echo -e "${RED}❌ No se encontró backup de .env.local${NC}"
      echo "   Copia manualmente desde .env.production"
      exit 1
    fi

    echo -e "${GREEN}✅ Ambiente cambiado a PRODUCTION${NC}"
    echo "   Project: ooaumjzaztmutltifhoq"
  else
    echo -e "${RED}❌ Ambiente desconocido: $CURRENT${NC}"
    exit 1
  fi

  # Validar
  ./scripts/validate-env.sh
}

# Ejecutar toggle
toggle_env
```

**Uso:**
```bash
# Ver ambiente actual
./scripts/toggle-env.sh

# Toggle automático
./scripts/toggle-env.sh

# Ejemplo output:
# 📍 Ambiente actual: production
# 🔄 Cambiando a STAGING...
# ✅ Ambiente cambiado a STAGING
#    Project: smdhgcpojpurvgdppufo
```

---

#### 2.3 Script de Validación (45min)
**Responsable:** @agent-backend-developer

**Script:** `scripts/validate-env.sh`

```bash
#!/bin/bash
# Validar que .env.local tiene todas las variables requeridas

set -e

ENV_FILE=".env.local"
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
  "SMTP_HOST"
  "SMTP_USER"
  "SMTP_PASSWORD"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Validando $ENV_FILE..."

MISSING=0

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
    echo -e "${RED}❌ Falta: $var${NC}"
    MISSING=$((MISSING + 1))
  else
    # Verificar que no esté vacía
    VALUE=$(grep "^${var}=" "$ENV_FILE" | cut -d '=' -f2-)
    if [ -z "$VALUE" ]; then
      echo -e "${YELLOW}⚠️  Vacía: $var${NC}"
      MISSING=$((MISSING + 1))
    else
      echo -e "${GREEN}✅ OK: $var${NC}"
    fi
  fi
done

if [ $MISSING -gt 0 ]; then
  echo -e "\n${RED}❌ Faltan $MISSING variables requeridas${NC}"
  exit 1
else
  echo -e "\n${GREEN}✅ Todas las variables requeridas presentes${NC}"

  # Detectar ambiente
  PROJECT_ID=$(grep "NEXT_PUBLIC_SUPABASE_URL" "$ENV_FILE" | cut -d '=' -f2 | cut -d '/' -f3 | cut -d '.' -f1)

  if [ "$PROJECT_ID" = "smdhgcpojpurvgdppufo" ]; then
    echo -e "${YELLOW}📍 Ambiente: STAGING${NC}"
  elif [ "$PROJECT_ID" = "ooaumjzaztmutltifhoq" ]; then
    echo -e "${GREEN}📍 Ambiente: PRODUCTION${NC}"
  else
    echo -e "${RED}⚠️  Ambiente: UNKNOWN (${PROJECT_ID})${NC}"
  fi
fi
```

---

#### 2.4 Deploy Scripts (1h)
**Responsable:** @agent-deploy-agent

**Script:** `scripts/deploy-dev.sh`

```bash
#!/bin/bash
# Deploy a ambiente DEV (VPS instance muva-chat)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando deploy a DEV...${NC}"

# 1. Pre-deploy checks
echo "📋 Pre-deploy checks..."
npm run validate-env
git status --short | grep -q . && echo "⚠️  Cambios sin commitear" && exit 1

# 2. Tests locales
echo "🧪 Ejecutando tests..."
npm run build
npm run test

# 3. Deploy a VPS
echo "📦 Deploying a VPS..."
ssh muva@195.200.6.216 << 'ENDSSH'
  cd ~/muva-chat

  # Backup
  cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

  # Pull cambios
  git fetch origin
  git checkout dev
  git pull origin dev

  # Install y build
  npm install --legacy-peer-deps
  npm run build

  # Restart PM2
  pm2 restart muva-chat
  pm2 save

  # Health check
  sleep 5
  pm2 info muva-chat | grep "status"
ENDSSH

echo -e "${GREEN}✅ Deploy completado${NC}"
echo "🔍 Verificar logs: ssh muva@195.200.6.216 'pm2 logs muva-chat --lines 50'"
```

**Script:** `scripts/deploy-staging.sh`

```bash
#!/bin/bash
# Deploy a ambiente STAGING (VPS instance muva-chat-staging)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Iniciando deploy a STAGING...${NC}"

# Similar a deploy-dev.sh pero para staging branch

ssh muva@195.200.6.216 << 'ENDSSH'
  cd ~/muva-chat-staging  # Directorio separado

  git fetch origin
  git checkout staging
  git pull origin staging

  # Usar .env.staging
  cp .env.staging .env.local

  npm install --legacy-peer-deps
  npm run build

  pm2 restart muva-chat-staging
  pm2 save
ENDSSH

echo -e "${GREEN}✅ Deploy a staging completado${NC}"
```

---

#### 2.5 Actualizar package.json (15min)
**Responsable:** @agent-backend-developer

**Agregar scripts:**

```json
{
  "scripts": {
    "env:staging": "./scripts/toggle-env.sh staging",
    "env:production": "./scripts/toggle-env.sh production",
    "validate-env": "./scripts/validate-env.sh",
    "deploy:dev": "./scripts/deploy-dev.sh",
    "deploy:staging": "./scripts/deploy-staging.sh"
  }
}
```

**Uso:**
```bash
npm run env:staging      # Toggle a staging
npm run env:production   # Toggle a production
npm run validate-env     # Validar variables
npm run deploy:dev       # Deploy a dev
npm run deploy:staging   # Deploy a staging
```

---

#### 2.6 Documentación Workflow (45min)
**Responsable:** @agent-infrastructure-monitor

**Archivo:** `docs/fase-2/DEPLOYMENT_WORKFLOW.md`

**Contenido:**

```markdown
# Deployment Workflow

## Ambientes

### STAGING
- **Branch:** staging
- **Supabase:** smdhgcpojpurvgdppufo (proyecto separado)
- **VPS:** muva-chat-staging (PM2 instance)
- **Propósito:** Experimentación, breaking changes

### DEV
- **Branch:** dev
- **Supabase:** ooaumjzaztmutltifhoq (proyecto principal)
- **VPS:** muva-chat (PM2 instance)
- **Propósito:** Desarrollo estable

### MAIN
- **Branch:** main
- **Propósito:** Reservado (no usar)

## Workflow Típico

### Desarrollo Local

1. **Iniciar en staging:**
   ```bash
   git checkout staging
   npm run env:staging
   npm run dev
   ```

2. **Feature estable → mover a dev:**
   ```bash
   git checkout dev
   git merge staging
   npm run env:production
   npm run build
   npm run test
   ```

3. **Deploy:**
   ```bash
   git push origin dev
   npm run deploy:dev
   ```

### Troubleshooting

**Ambiente incorrecto:**
```bash
npm run validate-env
npm run env:production  # O staging
```

**Deploy falló:**
```bash
ssh muva@195.200.6.216
pm2 logs muva-chat --lines 100
pm2 restart muva-chat
```
```

### Testing

```bash
# 1. Test toggle de ambiente
npm run env:staging
npm run validate-env
# Expected: Ambiente STAGING, todas las vars presentes

npm run env:production
npm run validate-env
# Expected: Ambiente PRODUCTION, todas las vars presentes

# 2. Test validación
echo "INVALID_VAR=" >> .env.local
npm run validate-env
# Expected: Error de variable faltante

# 3. Test deploy (dry-run)
git status
npm run build
# Expected: Build exitoso
```

### Criterios de Éxito FASE 2

- ✅ Branch strategy documentada y clara
- ✅ Scripts de toggle funcionando
- ✅ Validación de ambiente automática
- ✅ Deploy scripts probados
- ✅ VPS en branch correcto
- ✅ Documentación completa

---

## FASE 3: Dependency Updates 📦

**Duración:** 3-4 horas
**Prioridad:** MEDIA-ALTA
**Agente Principal:** @agent-backend-developer

### Objetivo

Actualizar 35 dependencias desactualizadas de forma segura, priorizando:
1. Security patches
2. Bugfixes importantes
3. Breaking changes con migraciones

### Entregables

1. ✅ Todas las dependencias actualizadas
2. ✅ Breaking changes migrados y testeados
3. ✅ `--legacy-peer-deps` eliminado (si es posible)
4. ✅ Tests pasando después de cada grupo
5. ✅ Documentación de cambios

### Archivos a Modificar

```
package.json                                 # Actualizar versiones
package-lock.json                            # Regenerar sin --legacy-peer-deps
src/**/*.ts                                  # Migraciones de código (LangChain, OpenAI)
project-stabilization/docs/fase-3/
  ├── DEPENDENCY_UPDATE_PLAN.md             # Plan de actualización
  ├── BREAKING_CHANGES_LOG.md              # Cambios que afectan código
  └── MIGRATION_GUIDE.md                   # Guía de migraciones
```

### Grupos de Actualización

Las dependencias se actualizan en 3 grupos por nivel de riesgo:

---

#### GRUPO 1: Safe Updates (Low Risk) 🟢

**Duración:** 45min
**Riesgo:** Bajo (patches y minor versions)

**Paquetes:**

```json
{
  "@anthropic-ai/sdk": "0.63.0 → 0.68.0",
  "@supabase/supabase-js": "2.57.4 → 2.77.0",
  "stripe": "minor update",
  "tailwindcss": "minor update",
  "typescript": "patch update",
  // ... ~15 paquetes más con cambios menores
}
```

**Tareas:**

##### 3.1.1 Actualizar Safe Packages (30min)
```bash
# Actualizar uno a la vez y verificar build
npm install @anthropic-ai/sdk@latest
npm run build
npm run test

npm install @supabase/supabase-js@latest
npm run build
npm run test

# Repetir para cada paquete del grupo
```

**Validación:**
- ✅ Build exitoso
- ✅ Tests pasando
- ✅ No warnings nuevos

##### 3.1.2 Test Integración Grupo 1 (15min)
```bash
# Build completo
npm run build

# Tests
npm run test

# Smoke test local
npm run dev
# Verificar rutas principales:
# - /staff/login
# - /dashboard
# - /chat
```

---

#### GRUPO 2: Medium Risk Updates ⚠️

**Duración:** 1-1.5h
**Riesgo:** Medio (cambios de API menores)

**Paquetes:**

```json
{
  "@supabase/ssr": "update con cambios en API",
  "react-hook-form": "API changes posibles",
  "zod": "validation schema changes",
  // ... ~8 paquetes más con cambios moderados
}
```

**Tareas:**

##### 3.2.1 Actualizar Medium Risk Packages (45min)
```bash
# Actualizar uno a la vez
npm install @supabase/ssr@latest

# Revisar changelog
npm info @supabase/ssr

# Buscar breaking changes en código
grep -r "createServerClient" src/

# Ajustar si es necesario
# ... (migraciones de código)

npm run build
npm run test
```

##### 3.2.2 Test Integración Grupo 2 (30min)
```bash
# Build + tests
npm run build && npm run test

# Test manual de features afectadas
# - Auth flows
# - Form validations
# - Supabase SSR
```

---

#### GRUPO 3: Breaking Changes 🔴

**Duración:** 1.5-2h
**Riesgo:** Alto (breaking changes confirmados)

**Paquetes:**

```json
{
  "@langchain/community": "0.3.56 → 1.0.0",
  "@langchain/core": "0.3.77 → 1.0.2",
  "@langchain/openai": "0.6.13 → 1.0.0",
  "openai": "5.21.0 → 6.7.0"
}
```

**Breaking Changes Conocidos:**

**LangChain 1.0:**
- ✅ `ChatOpenAI` → API changes
- ✅ `OpenAIEmbeddings` → Config changes
- ✅ Imports reorganizados

**OpenAI SDK 6.x:**
- ✅ `ChatCompletionMessageParam` → Type changes
- ✅ `openai.chat.completions.create()` → Signature changes

**Tareas:**

##### 3.3.1 Migrar LangChain (1h)
```bash
# 1. Actualizar
npm install @langchain/community@latest @langchain/core@latest @langchain/openai@latest

# 2. Revisar breaking changes
npm info @langchain/core

# 3. Migrar código
```

**Archivos a Revisar:**
```
src/lib/ai/langchain.ts
src/lib/ai/embeddings.ts
src/app/api/chat/route.ts
src/app/api/generate-response/route.ts
```

**Migraciones Comunes:**

```typescript
// ANTES (LangChain 0.3.x)
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
});

// DESPUÉS (LangChain 1.0.x)
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({
  model: "gpt-4",  // ✅ modelName → model
  temperature: 0.7,
});
```

**Test:**
```bash
npm run build
npm run test

# Test específico de AI
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

##### 3.3.2 Migrar OpenAI SDK (30min)
```bash
# 1. Actualizar
npm install openai@latest

# 2. Revisar breaking changes
npm info openai

# 3. Migrar código
```

**Archivos a Revisar:**
```
src/lib/ai/openai.ts
src/app/api/chat/route.ts
```

**Migraciones Comunes:**

```typescript
// ANTES (OpenAI SDK 5.x)
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: messages as ChatCompletionMessageParam[],
});

// DESPUÉS (OpenAI SDK 6.x)
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: messages as OpenAI.ChatCompletionMessageParam[],  // ✅ Namespace
});
```

**Test:**
```bash
npm run build
npm run test
```

##### 3.3.3 Test Integración Completa (30min)
```bash
# 1. Build completo
npm run build

# 2. Tests completos
npm run test

# 3. E2E tests de AI features
npm run dev

# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hola", "tenant_id": "xxx"}'

# Test embeddings
curl -X POST http://localhost:3000/api/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "test content"}'
```

---

#### 3.4 Eliminar --legacy-peer-deps (30min)

**Objetivo:** Resolver peer dependency conflicts

**Pasos:**

```bash
# 1. Eliminar node_modules y lock
rm -rf node_modules package-lock.json

# 2. Install sin --legacy-peer-deps
npm install

# Si hay errores de peer deps:
# - Revisar qué paquetes causan conflicto
# - Actualizar o buscar alternativas
# - Documentar en BREAKING_CHANGES_LOG.md
```

**Si no es posible eliminar:**
- ✅ Documentar razón en `BREAKING_CHANGES_LOG.md`
- ✅ Crear issue para resolver en el futuro
- ✅ Mantener `--legacy-peer-deps` temporalmente

---

#### 3.5 Documentación (30min)

**Archivo:** `docs/fase-3/MIGRATION_GUIDE.md`

**Contenido:**

```markdown
# Migration Guide - Dependencies Update

## LangChain 0.3.x → 1.0.x

### Breaking Changes

1. **Model Configuration:**
   - `modelName` → `model`

2. **Imports:**
   - Reorganizados por subpaquete

### Code Changes

- File: `src/lib/ai/langchain.ts`
  - Line 23: Changed `modelName` to `model`

- File: `src/lib/ai/embeddings.ts`
  - Line 15: Updated import path

## OpenAI SDK 5.x → 6.x

### Breaking Changes

1. **Type Namespacing:**
   - Types ahora bajo namespace `OpenAI.*`

### Code Changes

- File: `src/lib/ai/openai.ts`
  - Line 45: Added `OpenAI.` namespace to types

## Rollback Plan

Si algo falla:

```bash
git checkout HEAD~1 package.json package-lock.json
npm install --legacy-peer-deps
npm run build
```
```

### Testing Completo FASE 3

```bash
# 1. Build
npm run build
# Expected: ✅ Sin errores, sin warnings nuevos

# 2. Tests
npm run test
# Expected: ✅ Todos los tests pasando

# 3. Type checking
npm run type-check
# Expected: ✅ Sin errores de tipos

# 4. Smoke tests
npm run dev
# Test rutas críticas:
# - /staff/login ✅
# - /dashboard ✅
# - /chat ✅
# - /api/chat (POST) ✅

# 5. Dependency audit
npm audit
# Expected: 0 vulnerabilities críticas
```

### Criterios de Éxito FASE 3

- ✅ 35 dependencias actualizadas
- ✅ Breaking changes migrados
- ✅ Build exitoso sin warnings nuevos
- ✅ Tests pasando (100%)
- ✅ AI features funcionando (chat, embeddings)
- ✅ `--legacy-peer-deps` removido (o documentado por qué no)
- ✅ Documentación de migraciones completa

---

**Continúa en plan-part-3.md (Fases 4-6)**

**Última actualización:** 30 Octubre 2025
