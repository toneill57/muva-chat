# FASE 4 - Next Steps para Activar Production Deployment

**Fecha**: Noviembre 2, 2025
**Status**: FASE 4 completada - Lista para configuración

---

## 🎯 Resumen

FASE 4 está **100% implementada** y lista para uso. Todos los scripts, workflows y documentación están creados.

**Para activar production deployment**, sigue estos pasos:

---

## ✅ Checklist de Activación

### 1. Configurar GitHub Environment "production" (5 minutos)

Sigue la guía completa: `docs/infrastructure/three-environments/GITHUB_ENVIRONMENT_SETUP.md`

**Pasos rápidos**:

1. Ve a tu repositorio en GitHub
2. Settings → Environments → New environment
3. Nombre: `production`
4. Configure environment:
   - ✅ Required reviewers: [Tu GitHub username o del CEO/CTO]
   - ✅ Wait timer: 0 minutos

5. Add environment secrets (9 secrets):

```bash
# VPS Access
VPS_HOST = [IP del VPS production]
VPS_USER = [Usuario SSH]
VPS_SSH_KEY = [SSH private key]

# Supabase Production
SUPABASE_PRODUCTION_PROJECT_ID = ooaumjzaztmutltifhoq
SUPABASE_URL_PRODUCTION = https://ooaumjzaztmutltifhoq.supabase.co
SUPABASE_ANON_KEY_PRODUCTION = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQyMDksImV4cCI6MjA3MjQzMDIwOX0.HapBSfCjxBuUijFQvQIgu8Y44YI3OPL6Gr45RKTw-Fk
SUPABASE_SERVICE_ROLE_KEY_PRODUCTION = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYXVtanphenRtdXRsdGlmaG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDIwOSwiZXhwIjoyMDcyNDMwMjA5fQ.ngQSR4E9UHWLcbDAhi0QJy3ffriuV2bi4rGxyHy8Eoc
SUPABASE_DB_PASSWORD_PRODUCTION = [Obtener de Supabase Dashboard]

# JWT
JWT_SECRET_KEY_PRODUCTION = [Generar nuevo secret para producción]
```

**Obtener DB Password**:
- Ve a Supabase Dashboard
- Settings → Database → Connection string
- Copia el password

**Generar JWT Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 2. Crear Health Check Endpoints (10 minutos)

Si no existen, crear:

#### `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
}
```

#### `src/app/api/health/db/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const { error } = await supabase.from('hotels').select('id').limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        status: 'error',
        connected: false,
        latency_ms: latency,
        error: error.message
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'ok',
      connected: true,
      latency_ms: latency
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      connected: false,
      error: error.message
    }, { status: 503 });
  }
}
```

**Test local**:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db
```

### 3. Crear Directorio de Backups en VPS (2 minutos)

```bash
# SSH al VPS
ssh u123456789@your-vps.com

# Crear directorio de backups
cd /var/www/muva-chat
mkdir -p backups
chmod 755 backups

# Verificar
ls -la backups
```

### 4. Test del Workflow (Dry Run) (10 minutos)

**Opción A: Test sin aprobar (recomendado primero)**

```bash
# En local
git checkout main
git pull origin main

# Crear commit de prueba
echo "# Test deploy" >> TEST_DEPLOY.md
git add TEST_DEPLOY.md
git commit -m "test: production deployment workflow"
git push origin main
```

Ve a GitHub Actions:
- Workflow debería aparecer como "Waiting for approval"
- NO aprobar todavía, solo verificar que se detiene correctamente
- Cancela el workflow

**Opción B: Test con aprobación completa**

Sigue los mismos pasos pero:
- En GitHub Actions, click en "Review deployments"
- Aprueba el deployment
- Monitorea los logs en tiempo real
- Verifica que todos los steps pasan:
  - ✅ Backup creado
  - ✅ Migraciones aplicadas (si hay pendientes)
  - ✅ Deploy a VPS exitoso
  - ✅ Health checks passed

### 5. Verificar Production Después del Deploy (5 minutos)

```bash
# Verificar health checks
curl https://muva.chat/api/health
curl https://muva.chat/api/health/db

# Verificar homepage
curl -I https://muva.chat

# Verificar PM2
ssh u123456789@your-vps.com "pm2 status muva-chat"

# Verificar logs
ssh u123456789@your-vps.com "pm2 logs muva-chat --lines 50"
```

**Expected Results**:
- Health checks: HTTP 200
- Homepage: HTTP 200
- PM2: status "online"
- Logs: sin errores críticos

### 6. Test de Rollback (Opcional pero Recomendado) (15 minutos)

**Simular fallo para verificar rollback funciona**:

```bash
# En local, crear migración que falle intencionalmente
mkdir -p supabase/migrations
cat > supabase/migrations/99999999999999_test_rollback.sql << 'EOF'
-- Test migration que falla intencionalmente
CREATE TABLE this_will_fail (
  id uuid PRIMARY KEY,
  invalid_column INVALID_TYPE -- Tipo inválido → migration falla
);
EOF

git add supabase/migrations/99999999999999_test_rollback.sql
git commit -m "test: rollback mechanism"
git push origin main
```

En GitHub Actions:
- Aprobar deployment
- Workflow debería fallar en step "Apply Migrations"
- Verificar que rollback automático se ejecuta
- Verificar que production sigue funcionando

Cleanup:
```bash
# Eliminar migración de prueba
git rm supabase/migrations/99999999999999_test_rollback.sql
git commit -m "chore: remove test rollback migration"
git push origin main
```

---

## 🚀 Workflow de Uso Normal

### Deploy a Production (Flow Completo)

```bash
# 1. Verificar staging está working
# Visita staging.muva-chat.com y prueba features

# 2. Crear PR o merge directo staging → main
git checkout main
git pull origin main
git merge staging
git push origin main

# 3. Ve a GitHub Actions
# https://github.com/[tu-org]/[tu-repo]/actions

# 4. Workflow aparece "Waiting for approval"
# Click en el workflow

# 5. Click "Review deployments"
# - Review changes (ver diff)
# - Add comment: "Approved - tested in staging"
# - Click "Approve and deploy"

# 6. Monitorea logs en tiempo real
# - Backup creation
# - Migration application
# - VPS deployment
# - Health checks

# 7. Verificar production
curl https://muva.chat/api/health
# → Debería retornar HTTP 200

# 8. Verificar features en browser
# Visita https://muva.chat y prueba features deployadas
```

### Si Deployment Falla

Workflow automáticamente:
1. Rollback migration records
2. Rollback VPS code (git reset HEAD~1)
3. Rebuild application
4. Restart PM2
5. Notify failure

**Tu acción**:
1. Lee logs del workflow para identificar error
2. Repara el problema en staging
3. Testa en staging
4. Retry deployment a production

### Restaurar Database desde Backup (Solo Emergencias)

```bash
# Descargar backup desde GitHub Artifacts
# Actions → Failed workflow → Artifacts → production-backup-{sha}

# Descomprimir
gunzip production-TIMESTAMP.sql.gz

# Restaurar (DESTRUCTIVE - solo emergencias)
PGPASSWORD="[password]" psql \
  "postgresql://postgres.ooaumjzaztmutltifhoq:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" \
  < production-TIMESTAMP.sql
```

---

## 📊 Scripts Disponibles

Todos en `/scripts/`:

### `backup-production-db.ts`
```bash
pnpm dlx tsx scripts/backup-production-db.ts
```
Crea backup de producción. Output: `backups/production-TIMESTAMP.sql.gz`

### `apply-migrations-production.ts`
```bash
pnpm dlx tsx scripts/apply-migrations-production.ts
```
Aplica migraciones pendientes a producción (con safety checks).

### `verify-production-health.ts`
```bash
pnpm dlx tsx scripts/verify-production-health.ts
```
Ejecuta 5 health checks comprehensivos.

### `rollback-production.ts`
```bash
# Rollback migration records only
pnpm dlx tsx scripts/rollback-production.ts --steps=1

# Full rollback including DB restore
pnpm dlx tsx scripts/rollback-production.ts --restore-db
```
Rollback de deployment (code + migrations).

---

## ⚠️ Warnings Importantes

### DO ✅

- ALWAYS test in staging first
- ALWAYS review changes before approving
- ALWAYS monitor logs during deployment
- ALWAYS verify health checks after deploy
- ALWAYS have backup retention enabled

### DON'T ❌

- NEVER approve without reviewing diff
- NEVER deploy on Friday evenings
- NEVER deploy during peak traffic
- NEVER delete backups manually
- NEVER bypass health checks

### Best Practices

1. **Deploy during low-traffic hours** (early morning)
2. **Monitor for 30 minutes** after successful deploy
3. **Have rollback plan ready** before deploying
4. **Communicate with team** before production deploys
5. **Document deployment in changelog**

---

## 📞 Emergency Contacts

Si deployment falla y auto-rollback no funciona:

1. **Check PM2**: `ssh vps "pm2 logs muva-chat --lines 100"`
2. **Manual rollback**: Follow steps in FASE4_COMPLETION_SUMMARY.md
3. **Contact DevOps**: [Tu email/Slack]
4. **Restore from backup**: If database corrupted

---

## 📚 Documentación de Referencia

- **Setup Guide**: `GITHUB_ENVIRONMENT_SETUP.md`
- **Completion Summary**: `FASE4_COMPLETION_SUMMARY.md`
- **Plan completo**: `plan.md`
- **TODO tracking**: `TODO.md`

---

## 🎉 Conclusion

**FASE 4 está lista para producción.**

Sigue los pasos arriba para:
1. Configurar GitHub Environment (5 min)
2. Crear health check endpoints (10 min)
3. Test workflow (10 min)

**Total setup time**: ~25 minutos

Después de esto, production deployments serán:
- ✅ Seguros (manual approval + backup)
- ✅ Automáticos (GitHub Actions)
- ✅ Monitoreados (health checks)
- ✅ Reversibles (automatic rollback)

**¡Listo para deployear a producción con confianza!** 🚀

---

**Creado**: Noviembre 2, 2025
**Status**: Ready for activation
