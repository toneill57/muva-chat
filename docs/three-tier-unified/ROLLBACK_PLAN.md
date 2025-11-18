# Three-Tier Migration - Rollback Plan

**Last Updated:** November 16, 2025
**Purpose:** Procedimientos de rollback para revertir a arquitectura pre-three-tier
**Time to Execute:** 15-30 minutos

---

## ⚠️ When to Rollback

Considerar rollback si:
- ❌ Health checks fallan después de 30 min
- ❌ Pérdida de datos detectada
- ❌ Performance degradado > 50%
- ❌ Errores críticos en producción
- ❌ Imposibilidad de conectar a Supabase

**DO NOT rollback si:**
- ✅ Errores menores de configuración (resolverlos forward)
- ✅ DNS todavía propagando (esperar)
- ✅ PM2 reinicio requerido (solo reiniciar)

---

## Pre-Rollback Checklist

Antes de iniciar rollback, verificar:

```bash
# 1. Estado actual de servicios
ssh -i ~/.ssh/muva_deploy root@195.200.6.216 'pm2 list'

# 2. Health checks
curl https://staging.muva.chat/api/health
curl https://muva.chat/api/health

# 3. Backups disponibles
ssh -i ~/.ssh/muva_deploy root@195.200.6.216 'ls -lh /var/www/*/.env.local.backup'

# 4. Legacy projects activos
# Verificar en Supabase dashboard que hoaiwcueleiemeplrurv y iyeueszchbvlutlcmvcb estén activos
```

---

## Rollback Procedures

### Level 1: VPS Configuration Only (15 min)

**Cuando usar:** Problemas solo en VPS, Supabase funcionando correctamente

**Pasos:**

1. **SSH al VPS**
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

2. **Restaurar staging .env.local**
```bash
cd /var/www/muva-chat-staging
cp .env.local.backup .env.local
```

3. **Restaurar production .env.local**
```bash
cd /var/www/muva-chat
cp .env.local.backup .env.local
```

4. **Rebuild staging (si necesario)**
```bash
cd /var/www/muva-chat-staging
pnpm run build
```

5. **Restart services**
```bash
pm2 restart muva-chat-staging --update-env
pm2 restart muva-chat --update-env
```

6. **Verificar**
```bash
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
pm2 list
```

**Expected Result:**
- staging.muva.chat → hoaiwcueleiemeplrurv (old staging)
- muva.chat → iyeueszchbvlutlcmvcb (old production)

---

### Level 2: Git + VPS Rollback (20 min)

**Cuando usar:** Problemas con código o configuración Git

**Pasos:**

1. **Revertir Git a commit pre-migration**
```bash
cd /Users/oneill/Sites/apps/muva-chat
git log --oneline | grep "preparar migración three-tier"
# Commit: 24efa97

# Crear branch de rollback
git checkout -b rollback/three-tier-revert
git reset --hard 24efa97
git push origin rollback/three-tier-revert --force
```

2. **Revertir branches en VPS**
```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216 '
  cd /var/www/muva-chat-staging &&
  git fetch origin &&
  git checkout rollback/three-tier-revert &&
  git pull origin rollback/three-tier-revert &&

  cd /var/www/muva-chat &&
  git fetch origin &&
  git checkout rollback/three-tier-revert &&
  git pull origin rollback/three-tier-revert
'
```

3. **Ejecutar Level 1 rollback** (pasos 2-6 arriba)

---

### Level 3: Complete Rollback + Database (30 min)

**Cuando usar:** Pérdida de datos o corrupción de database

**⚠️ CRITICAL:** Este procedimiento requiere aprobación del lead

**Pasos:**

1. **Ejecutar Level 2 rollback completo**

2. **Verificar datos en legacy projects**
```bash
# Desde local
export SUPABASE_URL=https://hoaiwcueleiemeplrurv.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<old-staging-key>

pnpm dlx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await supabase.from('accommodation_units_public').select('*', { count: 'exact', head: true });
console.log('Legacy staging rows:', count);
"
```

3. **Si datos OK en legacy, actualizar .env locales**

Crear `.env.local` con legacy credentials:
```env
# Staging
NEXT_PUBLIC_SUPABASE_URL=https://hoaiwcueleiemeplrurv.supabase.co
SUPABASE_ANON_KEY=<old-staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<old-staging-service-key>

# Production
NEXT_PUBLIC_SUPABASE_URL=https://iyeueszchbvlutlcmvcb.supabase.co
SUPABASE_ANON_KEY=<old-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<old-production-service-key>
```

4. **Ejecutar Level 1 rollback en VPS**

---

## Post-Rollback Verification

Después de cualquier rollback, verificar:

```bash
# 1. Services running
ssh -i ~/.ssh/muva_deploy root@195.200.6.216 'pm2 list'

# 2. Health checks green
curl https://staging.muva.chat/api/health | jq .status
curl https://muva.chat/api/health | jq .status

# 3. Database connectivity
curl https://staging.muva.chat/api/health | jq .services.supabase

# 4. Sample queries working
# Test chat functionality in browser

# 5. Monitor logs for 15 min
ssh -i ~/.ssh/muva_deploy root@195.200.6.216 'pm2 logs --lines 100'
```

**Success Criteria:**
- ✅ PM2 status: online
- ✅ Health: "healthy"
- ✅ Supabase: connected
- ✅ Response times < 2s
- ✅ No errors in logs for 15 min

---

## Recovery After Rollback

Si rollback fue necesario, antes de re-intentar migration:

1. **Root Cause Analysis**
   - Identificar causa exacta del fallo
   - Documentar en `docs/three-tier-unified/logs/rollback-YYYY-MM-DD.md`

2. **Fix Issues**
   - Corregir problemas identificados
   - Testear en ambiente local primero

3. **Re-Migration Plan**
   - Actualizar workflow.md con lessons learned
   - Adicionar checks previos
   - Considerar migración en horario de bajo tráfico

4. **Team Communication**
   - Notificar equipo del rollback
   - Compartir root cause analysis
   - Programar re-migration con aprobación

---

## Emergency Contacts

| Scenario | Contact | Action |
|----------|---------|--------|
| **Production Down** | @lead-dev | Level 1 rollback inmediato |
| **Data Loss** | @db-admin + @lead-dev | Level 3 rollback + investigation |
| **Performance Issue** | @devops-lead | Monitor 30 min, luego decidir rollback |
| **VPS Access Lost** | @infrastructure | Restore from Hostinger panel |

---

## Backup Locations

### VPS Backups
```
/var/www/muva-chat-staging/.env.local.backup
/var/www/muva-chat/.env.local.backup
```

### Git Backup
```
Commit: 24efa97 (pre-migration)
Branch: staging (before three-tier)
Date: November 16, 2025
```

### Supabase Legacy Projects
```
Staging: hoaiwcueleiemeplrurv (mantener 30 días)
Production: iyeueszchbvlutlcmvcb (mantener 30 días)
```

**Retention Policy:**
- VPS backups: 30 días
- Git history: permanente
- Legacy Supabase projects: 30 días (luego pausar, no eliminar)

---

## Rollback Decision Matrix

| Symptom | Severity | Rollback Level | Time Limit |
|---------|----------|----------------|------------|
| PM2 service down | Medium | Level 1 | 15 min |
| Health check degraded | Low | Wait + monitor | 30 min |
| Database connection failed | High | Level 1-2 | 10 min |
| Data missing | Critical | Level 3 | Immediate |
| Performance > 5s | Medium | Level 1 | 20 min |
| Build failures | Low | Level 2 | 30 min |
| Multiple issues | Critical | Level 3 | Immediate |

---

## Prevention for Future Migrations

**Best Practices:**
1. ✅ Always create backups before changes
2. ✅ Test rollback procedures before migration
3. ✅ Have secondary access to VPS (Hostinger panel)
4. ✅ Document every step
5. ✅ Monitor for 24h post-migration
6. ✅ Keep legacy projects active for 30 days
7. ✅ Communicate migration window to team

---

**Document Owner:** DevOps Team
**Last Tested:** November 16, 2025
**Next Review:** December 16, 2025
**Status:** Active Rollback Plan
