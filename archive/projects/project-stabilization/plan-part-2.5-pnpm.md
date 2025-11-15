# FASE 3.5: Migración npm → pnpm

**Fecha:** 30 Octubre 2025
**Estado:** Ready for Execution
**Duración estimada:** 4-6 horas
**Riesgo:** Medio (cambio de infraestructura)

---

## 📋 Contexto

### ¿Por qué AHORA?

**Timing Estratégico:**
- ✅ **FASE 3 completada** - Todas las dependencias actualizadas (LangChain 1.0, OpenAI 6.x)
- ✅ **Producción estable** - Commit 1c4b0f5 deployed y monitoreado
- ✅ **Antes de FASE 4-6** - MCP optimization + Build warnings + Docs pendientes
- ✅ **Clean break point** - Momento ideal entre fases críticas

**Problema a Resolver:**
```
BLOQUEADO: --legacy-peer-deps requerido
CAUSA: @browserbasehq/stagehand requiere openai@^4.x
CONFLICTO: Nuestro proyecto usa openai@6.7.0
SOLUCIÓN: pnpm maneja peer dependencies automáticamente
```

**Decisión Arquitectónica:**
- ❌ Rechazado: npm + .npmrc (solo oculta problema)
- ❌ Rechazado: npm overrides (no funciona con peerDependencies)
- ✅ **Seleccionado: pnpm** (solución definitiva + beneficios adicionales)

### Hallazgos que Justifican la Migración

**1. Investigación de Estrategias (30 Octubre 2025)**
```
Estrategias evaluadas: 6
Intentos de solución: 3
Resultado: npm NO puede resolver peer dependency conflicts
Conclusión: Cambio de package manager necesario
```

**2. Análisis Técnico npm vs pnpm**
```
Performance:    pnpm 3x más rápido
Disk space:     pnpm 50% menos (symlinks)
Peer deps:      pnpm automático, npm manual
Strict mode:    pnpm previene phantom deps
Monorepo:       pnpm mejor soporte (futuro)

Score técnico:  pnpm 7/9 (78% superior)
```

**3. Contexto MUVA Chat - Re-evaluación**

**Inicialmente pensaba:** Postponer hasta post-stabilization (2-4 semanas)

**Razón para cambiar:** Usuario correcto sobre timing
- Estamos en "última fase de estabilización antes de MCP"
- FASE 0-3 completadas = fundación sólida
- FASE 4-6 son refinamientos (no críticos)
- Hacer cambio de infraestructura AHORA vs durante MCP implementation

**Analogía:** Renovar cocina entre mudanza y primera cena (timing perfecto) vs renovar durante preparación de cena (timing pésimo)

---

## 🎯 Objetivos

### Must Have
- ✅ Eliminar --legacy-peer-deps completamente
- ✅ `pnpm install` funciona sin flags ni warnings
- ✅ Build exitoso con pnpm
- ✅ Tests pasando (161/208 mínimo)
- ✅ AI features funcionales (LangChain + OpenAI)
- ✅ Deploy a staging successful
- ✅ Deploy a production successful
- ✅ PM2 stable post-deploy

### Should Have
- ✅ VPS configurado con pnpm
- ✅ Scripts actualizados (npm → pnpm)
- ✅ Rollback plan documentado
- ✅ Performance metrics comparados

### Nice to Have
- ✅ Disk space savings medidos
- ✅ Install time benchmarks
- ✅ Documentation completa

---

## 📦 Plan de Implementación

### Paso 1: Setup Local (30 min)

**1.1 Instalar pnpm globalmente**
```bash
npm install -g pnpm@latest
pnpm --version  # Verificar instalación
```

**1.2 Crear configuración pnpm**
```yaml
# pnpm-workspace.yaml (opcional, para futura expansión)
packages:
  - '.'
```

```ini
# .npmrc (actualizar)
# Remover: legacy-peer-deps=true
# Agregar configuración pnpm:
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

**1.3 Convertir lockfile**
```bash
# Backup actual
cp package-lock.json package-lock.json.backup

# Limpiar npm artifacts
rm -rf node_modules package-lock.json

# Instalar con pnpm
pnpm install

# Resultado esperado: pnpm-lock.yaml creado
```

**1.4 Verificar node_modules structure**
```bash
# pnpm usa .pnpm/store + symlinks
ls -la node_modules/.pnpm/

# Verificar que dependencias principales están linkeadas
ls -la node_modules/@langchain/
ls -la node_modules/openai/
```

---

### Paso 2: Actualizar Scripts (15 min)

**2.1 package.json scripts**

Cambiar todos los comandos `npm` → `pnpm`:

```json
{
  "scripts": {
    "dev": "pnpm run kill-port && next dev --turbopack",
    "build": "next build --turbopack",
    "clean:deep": "pnpm run clean && rm -rf node_modules && pnpm install",
    "pre-deploy": "pnpm run validate-env && pnpm run lint && pnpm run build"
    // ... resto de scripts
  }
}
```

**Scripts que NO cambiar:**
- `npx tsx` → Mantener (npx funciona con pnpm)
- `next` commands → Mantener (binarios)

**2.2 Bash scripts en /scripts/**

Buscar y reemplazar en todos los scripts:
```bash
grep -r "npm install" scripts/
grep -r "npm run" scripts/
grep -r "npm ci" scripts/

# Actualizar cada script:
npm install → pnpm install
npm run → pnpm run
npm ci → pnpm install --frozen-lockfile
```

**Scripts a actualizar:**
- `scripts/deploy-staging.sh`
- `scripts/deploy-dev.sh` (production)
- `scripts/dev-with-keys.sh`
- Cualquier otro que use npm

---

### Paso 3: Testing Local (1 hora)

**3.1 Build test**
```bash
pnpm run build

# Verificar:
# - Build completo (80/80 pages)
# - Sin errores de módulos faltantes
# - Turbopack funcional
```

**3.2 Development test**
```bash
pnpm run dev

# Verificar:
# - Server inicia en :3000
# - Hot reload funciona
# - No warnings de peer deps
```

**3.3 Tests unitarios**
```bash
pnpm run test

# Target: 161/208 tests passing (mínimo)
# Aceptable: Mismo resultado que con npm
# No debería haber nuevos fallos
```

**3.4 E2E AI Features**
```bash
# Iniciar dev server
pnpm run dev

# Test manual:
# 1. Login staff (simmerdown.localhost:3000/staff/login)
# 2. Guest chat - enviar mensaje
# 3. Verificar: LangChain chunking funciona
# 4. Verificar: OpenAI embeddings generados
# 5. Verificar: Vector search responde
# 6. Verificar: AI responses coherentes
```

**3.5 Performance benchmark**
```bash
# Limpiar cache
rm -rf node_modules .pnpm-store

# Benchmark npm
time npm install --legacy-peer-deps
# Resultado esperado: ~45-60 segundos

# Limpiar
rm -rf node_modules package-lock.json

# Benchmark pnpm
time pnpm install
# Resultado esperado: ~15-25 segundos (3x faster)

# Disk space comparison
du -sh node_modules
# npm: ~400MB
# pnpm: ~200MB (50% less)
```

---

### Paso 4: VPS Setup (30 min)

**4.1 Instalar pnpm en VPS**
```bash
ssh root@195.200.6.216

# Método 1: npm (más simple)
npm install -g pnpm@latest

# Método 2: curl (independiente de npm)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Verificar
pnpm --version
which pnpm
```

**4.2 Configurar PATH (si necesario)**
```bash
# Si pnpm no está en PATH después de install
echo 'export PNPM_HOME="/root/.local/share/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**4.3 Verificar pnpm en VPS**
```bash
# Test basic command
pnpm --version

# Test install (en temp dir)
mkdir -p /tmp/pnpm-test
cd /tmp/pnpm-test
echo '{"dependencies":{"next":"15.5.3"}}' > package.json
pnpm install
rm -rf /tmp/pnpm-test
```

---

### Paso 5: Deploy Staging (1 hora)

**5.1 Preparar commit**
```bash
# En local
git add pnpm-lock.yaml .npmrc package.json scripts/

# Commit con descripción detallada
git commit -m "feat(infra): migrate npm → pnpm

- Install pnpm lockfile (pnpm-lock.yaml)
- Update all scripts (npm → pnpm)
- Remove --legacy-peer-deps requirement
- Update deploy scripts for pnpm
- Resolves peer dependency conflicts

Breaking change: Requires pnpm installed globally
Migration time: ~30 min per environment

Refs: project-stabilization/plan-part-2.5-pnpm.md"

git push origin dev
```

**5.2 Deploy staging**
```bash
# Backup actual en staging
ssh root@195.200.6.216 "cd /var/www/staging.muva-chat && cp -r node_modules node_modules.npm-backup"

# Ejecutar deploy
./scripts/deploy-staging.sh

# Script debe:
# 1. git pull origin dev
# 2. pnpm install --frozen-lockfile (en vez de npm ci)
# 3. pnpm run build
# 4. pm2 reload staging-muva-chat
```

**5.3 Validar staging**
```bash
# Check PM2
ssh root@195.200.6.216 "pm2 status staging-muva-chat"

# Expected:
# - status: online
# - restarts: 0
# - uptime: > 1min

# Check logs
ssh root@195.200.6.216 "pm2 logs staging-muva-chat --lines 50"

# Expected: No errors, server listening

# Smoke test URL
curl -I https://simmerdown.staging.muva.chat

# Expected: 200 OK
```

**5.4 Test AI features en staging**
```bash
# Manual testing en browser:
# https://simmerdown.staging.muva.chat/staff/login

# Tests:
# 1. Login exitoso
# 2. Guest chat funcional
# 3. AI respuestas coherentes
# 4. Vector search rápido
```

---

### Paso 6: Monitoreo Staging (30 min)

**6.1 Watch PM2 metrics**
```bash
ssh root@195.200.6.216 "pm2 monit staging-muva-chat"

# Monitor:
# - Memory: Should be stable (~200-300MB)
# - CPU: Should be low (<10% idle)
# - Restarts: Should stay 0
```

**6.2 Check logs continuously**
```bash
ssh root@195.200.6.216 "pm2 logs staging-muva-chat --lines 100"

# Look for:
# ❌ Module not found errors
# ❌ Peer dependency warnings
# ❌ Build errors
# ✅ Clean startup
# ✅ API responses 200
```

**6.3 Performance comparison**
```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://simmerdown.staging.muva.chat

# Compare with production (npm)
curl -w "@curl-format.txt" -o /dev/null -s https://simmerdown.muva.chat

# Should be similar or faster
```

---

### Paso 7: Deploy Production (1 hora)

**7.1 Pre-deploy checklist**
```bash
# Staging validation
✅ Staging online > 30 min
✅ No PM2 restarts
✅ No errors in logs
✅ AI features tested
✅ Performance acceptable

# Production backup
ssh root@195.200.6.216 "cd /var/www/muva-chat && cp -r node_modules node_modules.npm-backup"
```

**7.2 Deploy production**
```bash
./scripts/deploy-dev.sh  # Este es el script de producción

# Script debe:
# 1. git pull origin dev
# 2. pnpm install --frozen-lockfile
# 3. pnpm run build
# 4. pm2 reload muva-chat
```

**7.3 Immediate validation**
```bash
# PM2 status
ssh root@195.200.6.216 "pm2 status muva-chat"

# Logs
ssh root@195.200.6.216 "pm2 logs muva-chat --lines 50 | grep -i error"

# URL check
curl -I https://simmerdown.muva.chat

# Expected: 200 OK, no downtime
```

---

### Paso 8: Post-Deploy Monitoring (1 hora)

**8.1 First 15 minutes (CRITICAL)**
```bash
# Watch for crashes
watch -n 5 'ssh root@195.200.6.216 "pm2 status muva-chat"'

# Restart count should stay 0
# If restarts > 0, investigate immediately
```

**8.2 Test all critical features**
```
Manual checklist:
1. ✅ Staff login (simmerdown.muva.chat/staff/login)
2. ✅ Guest chat functional
3. ✅ AI responses working
4. ✅ Vector search fast (<2s)
5. ✅ Dashboard loads
6. ✅ Accommodations CRUD works
7. ✅ SIRE compliance active
```

**8.3 Performance metrics**
```bash
# Memory usage trend
ssh root@195.200.6.216 "pm2 monit muva-chat"

# Compare with baseline (npm version)
# Should be similar or better
```

---

## 🔧 Scripts a Actualizar

### deploy-staging.sh
```bash
# ANTES
npm ci --legacy-peer-deps
npm run build

# DESPUÉS
pnpm install --frozen-lockfile
pnpm run build
```

### deploy-dev.sh (production)
```bash
# ANTES
npm ci --legacy-peer-deps
npm run build

# DESPUÉS
pnpm install --frozen-lockfile
pnpm run build
```

### dev-with-keys.sh
```bash
# ANTES (si aplica)
npm install

# DESPUÉS
pnpm install
```

---

## 🚨 Rollback Plan

### Si falla en LOCAL:
```bash
# Restaurar npm
rm -rf node_modules pnpm-lock.yaml .pnpm-store
git checkout package-lock.json .npmrc
npm install --legacy-peer-deps
npm run build

# Tiempo: 5 minutos
# Riesgo: Ninguno
```

### Si falla en STAGING:
```bash
ssh root@195.200.6.216

cd /var/www/staging.muva-chat

# Rollback a npm
rm -rf node_modules pnpm-lock.yaml
git checkout package-lock.json
mv node_modules.npm-backup node_modules

# Rebuild con npm
npm run build
pm2 reload staging-muva-chat

# Tiempo: 10 minutos
# Impacto: Solo staging (cero impacto en producción)
```

### Si falla en PRODUCTION:
```bash
ssh root@195.200.6.216

cd /var/www/muva-chat

# Rollback inmediato
rm -rf node_modules pnpm-lock.yaml
git checkout HEAD~1  # Volver a commit anterior
mv node_modules.npm-backup node_modules

# Rebuild
npm run build
pm2 reload muva-chat

# Tiempo: 10-15 minutos downtime
# Prevención: Testing exhaustivo en staging primero
```

---

## 📊 Criterios de Éxito

### Must Have (Bloqueantes)
- ✅ `pnpm install` sin flags ni warnings
- ✅ Build exitoso en todos los ambientes
- ✅ Tests passing (≥161/208)
- ✅ AI features funcionales (LangChain + OpenAI)
- ✅ Production stable (0 restarts en 1h)
- ✅ --legacy-peer-deps eliminado completamente

### Should Have (Importantes)
- ✅ Install time 2-3x más rápido
- ✅ Disk space 40-50% menor
- ✅ Sin peer dependency warnings
- ✅ Scripts todos actualizados

### Nice to Have (Bonus)
- ✅ pnpm-workspace.yaml para futura expansión
- ✅ Benchmarks documentados
- ✅ Migration guide completo

---

## 📈 Beneficios Esperados

### Inmediatos
1. **--legacy-peer-deps eliminado** - Comandos limpios
2. **Peer deps automáticos** - Sin conflictos manuales
3. **Strict mode** - Previene phantom dependencies

### Corto Plazo (1 semana)
1. **Velocidad 3x** - Deploys más rápidos (45s → 15s)
2. **Disk space 50%** - ~200MB ahorrados por environment
3. **DX mejorado** - Warnings desaparecen

### Largo Plazo (1-3 meses)
1. **Monorepo ready** - Si crece el proyecto
2. **Better caching** - pnpm store global
3. **Strict deps** - Menos bugs sutiles

---

## 🎯 Decisión Final

### Por qué AHORA es el momento correcto:

**Técnicamente:**
- ✅ Dependencias actualizadas (FASE 3)
- ✅ Build stable en npm
- ✅ Tests baseline establecido

**Estratégicamente:**
- ✅ Entre fases críticas (3→4)
- ✅ Antes de MCP work (FASE 4)
- ✅ Clean break point

**Operacionalmente:**
- ✅ Staging disponible para testing
- ✅ Backup plan claro
- ✅ Rollback rápido posible

**Análisis cambió:** Inicialmente recomendé postponer, pero usuario correcto sobre timing. Hacer cambio de infraestructura AHORA (entre fases) vs DURANTE implementación de features (FASE 4-6) es más profesional.

---

## 📚 Referencias

- **Análisis completo:** `project-stabilization/PNPM_MIGRATION_ANALYSIS.md`
- **Estrategias evaluadas:** `project-stabilization/LEGACY_PEER_DEPS_RESOLUTION_STRATEGIES.md`
- **pnpm docs:** https://pnpm.io/installation
- **pnpm CLI:** https://pnpm.io/cli/install

---

**Creado:** 30 Octubre 2025
**Duración estimada:** 4-6 horas
**Riesgo:** Medio (mitigado con staging + rollback)
**Status:** Ready for Execution
**Próximo paso:** Ejecutar Paso 1 (Setup Local)
