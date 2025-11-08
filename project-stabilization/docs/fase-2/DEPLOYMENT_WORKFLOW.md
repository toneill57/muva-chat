# Deployment Workflow - MUVA Platform

**Post-Stabilization 2025**

> **⚠️ DEPRECATED DOCUMENT**
> Este documento usa el sistema `toggle-env.sh` obsoleto.
> **Ver nuevo sistema:** `QUICK_START_DUAL_ENV.md` y `docs/development/DUAL_ENVIRONMENT_SETUP.md`
> **Nuevo workflow:** `pnpm run dev:production` y `pnpm run dev:staging` (simultáneos)

---

## Ambientes

### STAGING
- **Branch:** staging
- **Supabase:** smdhgcpojpurvgdppufo (proyecto separado)
- **VPS:** muva-chat-staging (PM2 instance)
- **Propósito:** Experimentación, breaking changes, testing de features riesgosas
- **Base de datos:** Separada completamente de producción
- **Permisos:** Puede fallar sin afectar usuarios

### DEV
- **Branch:** dev (GuestChatDev)
- **Supabase:** ooaumjzaztmutltifhoq (proyecto principal)
- **VPS:** muva-chat (PM2 instance)
- **Propósito:** Desarrollo estable, features probadas
- **Base de datos:** Producción (con cuidado)
- **Permisos:** NO debe fallar en producción

### MAIN
- **Branch:** main
- **Propósito:** Reservado (no usar actualmente)
- **Status:** Deprecated hasta nuevo aviso

## Workflow Típico

### Desarrollo Local

1. **Iniciar en staging (para features nuevas/experimentales):**
   ```bash
   git checkout staging
   npm run env:staging
   npm run dev
   ```

2. **Feature estable → mover a dev:**
   ```bash
   # Test completo en staging primero
   npm run build
   npm run test

   # Si todo pasa, mover a dev
   git checkout dev
   git merge staging
   npm run env:production
   npm run build
   npm run test
   ```

3. **Deploy a ambiente correspondiente:**
   ```bash
   # Para dev (producción)
   git push origin dev
   npm run deploy:dev

   # Para staging (experimentación)
   git push origin staging
   npm run deploy:staging
   ```

### Workflows Específicos

#### New Feature (experimental o compleja)

**Escenario:** Nueva funcionalidad que puede tener bugs o necesitar iteraciones

1. **Desarrollo en staging:**
   ```bash
   git checkout staging
   npm run env:staging
   npm run dev
   ```

2. **Testing local:**
   ```bash
   npm run build
   npm run test
   npm run lint
   ```

3. **Deploy a staging:**
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad X"
   git push origin staging
   npm run deploy:staging
   ```

4. **Verificación en staging:**
   ```bash
   # Verificar logs
   ssh root@195.200.6.216 'pm2 logs muva-chat-staging --lines 50'

   # Test manual en https://staging.muva.ai
   ```

5. **Si funciona correctamente, mover a dev:**
   ```bash
   git checkout dev
   git merge staging
   npm run env:production
   npm run build && npm run test
   git push origin dev
   npm run deploy:dev
   ```

#### New Feature (simple y estable)

**Escenario:** Cambio menor con confianza alta

1. **Desarrollo directo en dev:**
   ```bash
   git checkout dev
   npm run env:production
   npm run dev
   ```

2. **Testing + deploy:**
   ```bash
   npm run build && npm run test
   git add .
   git commit -m "feat: mejora menor X"
   git push origin dev
   npm run deploy:dev
   ```

#### Hotfix (urgente)

**Escenario:** Bug crítico en producción

1. **Fix directo en dev:**
   ```bash
   git checkout dev
   npm run env:production
   # Fix code
   ```

2. **Test rápido:**
   ```bash
   npm run build
   npm run test  # Solo tests críticos
   ```

3. **Deploy inmediato:**
   ```bash
   git add .
   git commit -m "fix: resolver bug crítico X"
   git push origin dev
   npm run deploy:dev
   ```

4. **Verificación post-deploy:**
   ```bash
   ssh root@195.200.6.216 'pm2 logs muva-chat --lines 100'
   # Monitor por 5 minutos
   ```

5. **Backport a staging:**
   ```bash
   git checkout staging
   git merge dev
   git push origin staging
   ```

#### Experiment (breaking changes)

**Escenario:** Cambios estructurales que pueden romper la app

1. **SOLO en staging:**
   ```bash
   git checkout staging
   npm run env:staging
   # Breaking changes OK aquí
   ```

2. **Testing extensivo:**
   ```bash
   npm run build
   npm run test
   npm run test:e2e  # Si hay tests e2e
   ```

3. **Deploy staging:**
   ```bash
   git push origin staging
   npm run deploy:staging
   ```

4. **NO mover a dev hasta estar 100% seguro**

5. **Si funciona, refactorizar para dev:**
   ```bash
   # Revisar código, limpiar, optimizar
   git checkout dev
   git merge staging --squash  # Combinar commits en uno solo
   npm run env:production
   npm run build && npm run test
   git commit -m "feat: implementar experimento X (tested in staging)"
   git push origin dev
   npm run deploy:dev
   ```

### Troubleshooting

#### Ambiente incorrecto

**Síntoma:** Variables de entorno apuntan al proyecto equivocado

```bash
# Verificar ambiente actual
npm run validate-env

# Cambiar a staging
npm run env:staging

# Cambiar a production (dev)
npm run env:production

# Verificar que cambió
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
```

**Expected output staging:**
```
NEXT_PUBLIC_SUPABASE_URL=https://smdhgcpojpurvgdppufo.supabase.co
```

**Expected output production:**
```
NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
```

#### Deploy falló

**Síntoma:** Script deploy-dev.sh o deploy-staging.sh reportó error

```bash
# Conectar al VPS
ssh root@195.200.6.216

# Ver logs de deploy
cd /var/www/muva-chat  # O muva-chat-staging
git log -1
npm run build 2>&1 | tail -50

# Ver logs de PM2
pm2 logs muva-chat --lines 100
# O
pm2 logs muva-chat-staging --lines 100

# Restart manual
pm2 restart muva-chat
# O
pm2 restart muva-chat-staging

# Verificar status
pm2 show muva-chat
```

#### Build falla localmente

**Síntoma:** npm run build arroja errores

```bash
# Limpiar cache
npm run clean

# Re-verificar ambiente
npm run validate-env

# Reinstalar dependencias si necesario
npm run clean:deep

# Intentar build de nuevo
npm run build
```

#### Tests fallan antes de deploy

**Síntoma:** npm run test falla en pre-deploy

```bash
# Ver qué test falló específicamente
npm run test -- --verbose

# Ejecutar solo ese test
npm run test -- path/to/test.test.ts

# Si es test de integración, verificar ambiente
npm run validate-env

# Si es test unitario, fix código y re-run
npm run test
```

#### VPS no responde

**Síntoma:** SSH timeout o PM2 no responde

```bash
# Verificar conectividad
ping 195.200.6.216

# Si ping funciona, intentar SSH con timeout largo
ssh -o ConnectTimeout=30 root@195.200.6.216

# Si entra, verificar PM2
pm2 status

# Si PM2 no corre
pm2 resurrect  # Intentar resucitar procesos guardados

# Si no hay procesos guardados
cd /var/www/muva-chat
npm run build
pm2 start npm --name "muva-chat" -- start
```

## Pre-Deploy Checklist

Antes de ejecutar `npm run deploy:dev` o `npm run deploy:staging`:

- [ ] **Ambiente correcto:** `npm run validate-env` OK
- [ ] **Git limpio:** `git status` sin uncommitted changes (o comittear primero)
- [ ] **Build exitoso:** `npm run build` sin errores
- [ ] **Tests pasando:** `npm run test` verde
- [ ] **Branch correcto:** `git branch` muestra dev o staging según corresponda
- [ ] **Código pusheado:** `git push origin <branch>` ejecutado
- [ ] **Pre-deploy tasks:** Revisar si hay scripts de migración DB

### Pre-Deploy Command (automático)

El script `npm run pre-deploy` ejecuta:
```bash
npm run validate-env && npm run lint && npm run build
```

Usar antes de deploy manual si hay dudas.

## Post-Deploy Verification

Después de ejecutar deploy, **SIEMPRE verificar**:

### 1. Logs de deploy
```bash
# Ver últimas 50 líneas de logs
ssh root@195.200.6.216 'pm2 logs muva-chat --lines 50'

# O para staging
ssh root@195.200.6.216 'pm2 logs muva-chat-staging --lines 50'
```

**Buscar:**
- ✅ "Server running on port 3000"
- ✅ "Compiled successfully"
- ❌ Error messages
- ❌ Warning de variables faltantes

### 2. Status de PM2
```bash
# Ver status general
ssh root@195.200.6.216 'pm2 status'

# Ver detalles de instancia
ssh root@195.200.6.216 'pm2 show muva-chat'
```

**Verificar:**
- Status: online (not errored, stopped)
- Restarts: < 5 (muchos restarts = problema)
- Memory: < 80% del límite

### 3. Health Check HTTP
```bash
# Dev (producción)
curl -f https://app.muva.ai/api/health || echo "HEALTH CHECK FAILED"

# Staging
curl -f https://staging.muva.ai/api/health || echo "HEALTH CHECK FAILED"
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-30T...",
  "environment": "production"  // O "staging"
}
```

### 4. Manual UI Test

- [ ] Abrir https://app.muva.ai (o staging.muva.ai)
- [ ] Login funciona
- [ ] Chat responde
- [ ] No hay errores en console del browser (F12)

## Rollback Plan

Si deploy falla o introduce bugs críticos:

### Rollback Automático (rápido)
```bash
ssh root@195.200.6.216

# Para dev
cd /var/www/muva-chat
git log -3  # Ver últimos 3 commits
git checkout HEAD~1  # Volver al commit anterior
npm ci
npm run build
pm2 restart muva-chat

# Para staging
cd /var/www/muva-chat-staging
git checkout HEAD~1
npm ci
npm run build
pm2 restart muva-chat-staging
```

### Rollback Manual (específico)
```bash
ssh root@195.200.6.216
cd /var/www/muva-chat

# Ver commits recientes
git log --oneline -10

# Rollback a commit específico
git checkout <commit-hash>
npm ci
npm run build
pm2 restart muva-chat

# Verificar que funciona
pm2 logs muva-chat --lines 50

# Si funciona, hacer permanent
git reset --hard <commit-hash>
git push origin dev --force  # ⚠️ CUIDADO con --force
```

### Rollback de Base de Datos

**Si se ejecutó migración DDL que causó problemas:**

```bash
# Conectar a Supabase via MCP o psql
# Ejecutar script de rollback (si existe)

# Si no hay script, restaurar backup
# Ver: project-stabilization/docs/database-backup-restore.md
```

### Emergency Contact

**Si rollback falla o problema persiste:**

1. **Parar la app problemática:**
   ```bash
   ssh root@195.200.6.216
   pm2 stop muva-chat  # O muva-chat-staging
   ```

2. **Contactar desarrollador principal:**
   - Email: [email del equipo]
   - Slack: #muva-emergencies
   - Phone: [número de emergencia]

3. **Documentar el incidente:**
   - Capturas de pantalla de errores
   - Logs completos: `pm2 logs muva-chat --lines 500 > incident.log`
   - Commit que causó problema: `git log -1`

## Best Practices

### Commits
- **Usar conventional commits:** `feat:`, `fix:`, `docs:`, `chore:`
- **Commits pequeños:** Una feature/fix por commit
- **Mensajes descriptivos:** Explicar QUÉ y POR QUÉ, no CÓMO

### Testing
- **Siempre build local antes de push**
- **Run tests antes de deploy**
- **Test manual en staging antes de mover a dev**

### Branch Management
- **dev = producción estable**
- **staging = experimentación segura**
- **NUNCA commitear directo a main**

### Database Changes
- **DDL migrations:** Usar scripts/execute-ddl-via-api.ts
- **DML operations:** Via MCP Supabase tools
- **Backups:** Antes de migrations grandes

### Monitoring
- **Post-deploy:** Monitor logs por 10 minutos
- **High traffic hours:** Deploy en horarios de bajo tráfico
- **Alerting:** Configurar alertas para errores críticos

## Environment Variables Reference

### Production (dev branch)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production key]
SUPABASE_SERVICE_ROLE_KEY=[production service key]
```

### Staging
```bash
NEXT_PUBLIC_SUPABASE_URL=https://smdhgcpojpurvgdppufo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[staging key]
SUPABASE_SERVICE_ROLE_KEY=[staging service key]
```

### Verificar Variables
```bash
# Local
npm run validate-env

# VPS (dev)
ssh root@195.200.6.216 'cd /var/www/muva-chat && cat .env.local | grep SUPABASE_URL'

# VPS (staging)
ssh root@195.200.6.216 'cd /var/www/muva-chat-staging && cat .env.local | grep SUPABASE_URL'
```

## Scripts Reference

### NPM Scripts
- `npm run env:staging` - Toggle to staging environment
- `npm run env:production` - Toggle to production environment
- `npm run validate-env` - Verify environment configuration
- `npm run deploy:dev` - Deploy to dev (production) VPS
- `npm run deploy:staging` - Deploy to staging VPS
- `npm run pre-deploy` - Run pre-deploy checks (validate + lint + build)

### Manual Scripts
- `./scripts/toggle-env.sh` - Toggle between environments
- `./scripts/validate-env.sh` - Validate environment setup
- `./scripts/deploy-dev.sh` - Deploy script for dev
- `./scripts/deploy-staging.sh` - Deploy script for staging

## Related Documentation

- **PM2 Config:** project-stabilization/docs/fase-2/PM2_CONFIGURATION.md
- **Environment Management:** project-stabilization/docs/fase-2/ENVIRONMENT_TOGGLE.md
- **Script Usage:** project-stabilization/docs/fase-2/SCRIPTS_REFERENCE.md
- **Database Migrations:** docs/infrastructure/DATABASE_MIGRATIONS.md

---

**Last Updated:** 2025-10-30
**Version:** 1.0.0
**Status:** Post-Stabilization Phase 2
