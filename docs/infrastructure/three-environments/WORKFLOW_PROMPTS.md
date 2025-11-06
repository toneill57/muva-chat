# WORKFLOW PROMPTS - Three Environments CI/CD

**Proyecto:** Three Environments with Supabase Branching
**Última Actualización:** November 2, 2025
**Estado Actual:** FASES 1-5 COMPLETADAS | FASE 6 PENDIENTE

---

## 📊 ESTADO ACTUAL DEL PROYECTO

### Progreso General
- ✅ FASE 1: Supabase Branching Setup (100%)
- ✅ FASE 2: GitHub Actions Dev Workflow (100%)
- ✅ FASE 3: GitHub Actions Staging Enhanced (100%)
- ✅ FASE 3.5: Database Sync Solution (100%)
- ✅ FASE 4: GitHub Actions Production Workflow (100%)
- ✅ FASE 5: Branch Protection Rules (100%)
- ✅ FASE 6: Migration Management System (100%)
- 🔜 FASE 7: Environment Variables Management (0%)
- 🔜 FASE 8: Monitoring & Alerting (0%)
- 🔜 FASE 9: Documentation & Training (0%)

**Total Completado:** ~40/62 tareas (65%)

---

## 🎯 CONTEXTO GENERAL (Para NUEVAS Conversaciones)

```
CONTEXTO: Three Environments CI/CD - FASES 1-5 COMPLETADAS

📊 PROGRESO ACTUAL:
- ✅ FASE 1: Supabase Branching (3 ambientes configurados)
- ✅ FASE 2: Dev Workflow (validación automática)
- ✅ FASE 3: Staging Enhanced (migrations + rollback)
- ✅ FASE 3.5: Database Sync (100% parity solution)
- ✅ FASE 4: Production Workflow (manual approval + backups)
- ✅ FASE 5: Branch Protection Rules (documentación completa)
- ✅ FASE 6 - Migration Management System

🗂️ ARCHIVOS CLAVE:
- docs/infrastructure/three-environments/TODO.md (estado detallado)
- docs/infrastructure/three-environments/plan.md (plan completo)
- docs/database/PRODUCTION_STAGING_SYNC_GUIDE.md (sync solution)
- snapshots/database-sync-complete.md (sync documentation)
- docs/infrastructure/three-environments/BRANCH_PROTECTION_GUIDE.md
- .github/CODEOWNERS (configurar manualmente)

✅ LOGROS PRINCIPALES:
- 3 ambientes Supabase funcionando (dev, staging, production)
- Workflows CI/CD completos para las 3 ramas
- Database sync 100% funcional (maneja todos los edge cases)
- Script ultimate: sync-prod-to-staging-ultimate.ts
- Branch protection rules documentadas
- 5,000+ registros sincronizados perfectamente

🎯 OBJETIVO FASE 6:
Crear sistema de gestión de migraciones con:
- Generador de migraciones con templates
- Status checker por ambiente
- Detector de schema drift
- Herramientas de sync manual
- Documentación completa

STACK:
- Git branches: dev, staging, main
- Supabase: 3 proyectos independientes
- GitHub Actions con manual approval
- VPS Hostinger (PM2 + Nginx)
- Next.js 15 + TypeScript + pnpm
```

---

## ✅ FASES COMPLETADAS

### FASE 1-5: Ya Implementadas
- Supabase Branching configurado
- Workflows de CI/CD funcionando
- Database sync solution completa
- Production workflow con backups
- Branch protection rules documentadas

**Para detalles de fases completadas, ver:**
- `docs/infrastructure/three-environments/TODO.md`
- `docs/infrastructure/three-environments/FASE4_COMPLETION_SUMMARY.md`
- `docs/infrastructure/three-environments/FASE5_COMPLETION_SUMMARY.md`

---

## 🔜 FASE 6: Migration Management System

**Objetivo:** Crear herramientas para gestionar migraciones de base de datos.

**Status:** ⏳ PENDIENTE (0/5 tareas)
**Estimado:** 4-5 horas
**Agent:** @agent-database-agent

### 📋 PROMPT PARA INICIAR FASE 6

```
INICIAR FASE 6: Migration Management System

CONTEXTO:
- FASES 1-5 completadas (Branching, CI/CD, Sync, Protection)
- Ya tenemos workflows que aplican migraciones automáticamente
- Necesitamos herramientas para CREAR y GESTIONAR migraciones

OBJETIVO FASE 6:
Crear sistema completo de gestión de migraciones con 5 scripts:

1. create-migration.ts
   - Generador con template y timestamp
   - Incluir secciones UP/DOWN comentadas
   - Best practices en comentarios

2. migration-status.ts
   - Ver estado por ambiente (--env=dev|staging|production)
   - Mostrar migraciones pending/applied/unknown
   - Formato tabla bonita

3. detect-schema-drift.ts
   - Comparar schemas entre ambientes
   - Detectar tablas/columnas/índices diferentes
   - Reportar diferencias críticas

4. sync-migrations.ts
   - Aplicar migraciones manualmente (emergencias)
   - Require --force flag para production
   - Backup check obligatorio

5. MIGRATION_GUIDE.md
   - Documentación completa del workflow
   - Ejemplos de migraciones comunes
   - Troubleshooting y emergencias

ARCHIVOS A CREAR:
- scripts/create-migration.ts
- scripts/migration-status.ts
- scripts/detect-schema-drift.ts
- scripts/sync-migrations.ts
- docs/infrastructure/three-environments/MIGRATION_GUIDE.md

REFERENCIAS:
- docs/infrastructure/three-environments/TODO.md (sección FASE 6)
- scripts/apply-migrations-staging.ts (ya existe, usar como referencia)
- scripts/apply-migrations-production.ts (ya existe, usar como referencia)

IMPORTANTE:
- Usar MCP tools (mcp__supabase__) donde sea posible
- Los scripts deben funcionar con los 3 ambientes
- Incluir --dry-run option donde aplique

¿Listos para crear el Migration Management System?
```

### 🎯 TAREAS FASE 6

**6.1 Script: create-migration.ts**
```bash
# Uso esperado:
pnpm dlx tsx scripts/create-migration.ts --name add_users_table

# Output:
✅ Created: supabase/migrations/20251102123456_add_users_table.sql
```

**6.2 Script: migration-status.ts**
```bash
# Uso esperado:
pnpm dlx tsx scripts/migration-status.ts --env=staging

# Output tabla con:
# - Migraciones locales
# - Migraciones aplicadas
# - Migraciones pendientes
```

**6.3 Script: detect-schema-drift.ts**
```bash
# Uso esperado:
pnpm dlx tsx scripts/detect-schema-drift.ts --from=staging --to=production

# Output:
# - Diferencias de tablas
# - Diferencias de columnas
# - Diferencias de RLS policies
```

**6.4 Script: sync-migrations.ts**
```bash
# Uso esperado (emergencias):
pnpm dlx tsx scripts/sync-migrations.ts --env=production --migration=20251102_fix --force

# Checks:
# - Backup exists
# - --force flag presente
# - Confirmación manual
```

**6.5 Documentación: MIGRATION_GUIDE.md**
- Workflow completo: dev → staging → production
- Templates para migraciones comunes
- Best practices (idempotent, transactional)
- Emergency procedures

### ✅ ENTREGABLES ESPERADOS FASE 6

- `scripts/create-migration.ts` (~150 líneas)
- `scripts/migration-status.ts` (~200 líneas)
- `scripts/detect-schema-drift.ts` (~300 líneas)
- `scripts/sync-migrations.ts` (~250 líneas)
- `docs/infrastructure/three-environments/MIGRATION_GUIDE.md` (~500 líneas)
- Actualización de TODO.md marcando FASE 6 completada

---

## 🔜 FASE 7: Environment Variables Management

**Objetivo:** Gestión y validación de variables de entorno.

**Status:** ⏳ PENDIENTE (0/5 tareas)
**Estimado:** 2-3 horas
**Agent:** @agent-deploy-agent

### 📋 PROMPT PARA INICIAR FASE 7

```
INICIAR FASE 7: Environment Variables Management

CONTEXTO:
- FASES 1-6 completadas
- Tenemos 3 archivos .env (dev, staging, production)
- GitHub Secrets configurados pero no organizados

OBJETIVO FASE 7:
Sistema de gestión de variables de entorno con:

1. validate-env-vars.ts
   - Validar completitud según .env.template
   - Verificar formato de URLs y keys
   - Exit code 1 si faltan críticas

2. Organizar GitHub Secrets
   - Prefijos por ambiente (DEV_, STAGING_, PROD_)
   - Documentar estructura en SECRETS_GUIDE.md

3. Actualizar workflows
   - Usar secretos específicos por ambiente
   - No mezclar credenciales entre ambientes

4. rotate-secrets.ts (opcional)
   - Rotar keys periódicamente
   - Actualizar GitHub y VPS automáticamente
   - Verificar funcionamiento post-rotación

5. SECRETS_GUIDE.md
   - Lista completa de secretos
   - Dónde obtener cada valor
   - Security best practices

ARCHIVOS A CREAR:
- scripts/validate-env-vars.ts
- scripts/rotate-secrets.ts (opcional)
- docs/infrastructure/three-environments/SECRETS_GUIDE.md
- Actualizar: .github/workflows/*.yml

REFERENCIAS:
- docs/infrastructure/three-environments/TODO.md (sección FASE 7)
- .env.template (template actual)
- .github/workflows/deploy-staging.yml (secretos actuales)

¿Listos para organizar Environment Variables?
```

### 🎯 TAREAS FASE 7

**7.1 Script: validate-env-vars.ts**
- Leer .env.template como referencia
- Validar cada ambiente tiene todas las variables
- Verificar formato correcto

**7.2 Reorganizar GitHub Secrets**
- DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY, etc.
- STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY, etc.
- PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY, etc.

**7.3 Actualizar workflows**
- validate-dev.yml → usa DEV_* secrets
- deploy-staging.yml → usa STAGING_* secrets
- deploy-production.yml → usa PROD_* secrets

**7.4 Script: rotate-secrets.ts (opcional)**
- Generar nuevas keys en Supabase
- Actualizar GitHub Secrets vía API
- Actualizar VPS vía SSH

**7.5 Documentación: SECRETS_GUIDE.md**
- Inventario completo de secretos
- Instrucciones para obtener cada uno
- Proceso de rotación

---

## 🔜 FASE 8: Monitoring & Alerting

**Objetivo:** Sistema de monitoreo y alertas.

**Status:** ⏳ PENDIENTE (0/5 tareas)
**Estimado:** 3-4 horas
**Agent:** @agent-infrastructure-monitor

### 📋 PROMPT PARA INICIAR FASE 8

```
INICIAR FASE 8: Monitoring & Alerting

CONTEXTO:
- FASES 1-7 completadas
- Aplicación en producción sin monitoreo
- Necesitamos visibilidad de problemas

OBJETIVO FASE 8:
Implementar monitoreo completo con:

1. API Health Endpoint (/api/health)
   - Database connectivity
   - Service dependencies
   - Response time metrics

2. monitoring-dashboard.ts
   - Estado de todos los servicios
   - Métricas de performance
   - Últimos deployments

3. alert-on-failure.ts
   - Detectar servicios caídos
   - Notificar por email/Slack
   - Auto-restart si es posible

4. deployment-metrics.ts
   - Track deployment success rate
   - Tiempo promedio de deploy
   - Rollback frequency

5. MONITORING_GUIDE.md
   - Setup de alertas
   - Dashboard access
   - Troubleshooting playbook

ARCHIVOS A CREAR:
- src/app/api/health/route.ts
- scripts/monitoring-dashboard.ts
- scripts/alert-on-failure.ts
- scripts/deployment-metrics.ts
- docs/infrastructure/three-environments/MONITORING_GUIDE.md

REFERENCIAS:
- docs/infrastructure/three-environments/TODO.md (sección FASE 8)
- scripts/health-check-staging.ts (ya existe)
- scripts/verify-production-health.ts (ya existe)

¿Listos para implementar Monitoring?
```

---

## 🔜 FASE 9: Documentation & Training

**Objetivo:** Documentación completa y materiales de training.

**Status:** ⏳ PENDIENTE (0/4 tareas)
**Estimado:** 2-3 horas
**Agent:** @agent-deploy-agent

### 📋 PROMPT PARA INICIAR FASE 9

```
INICIAR FASE 9: Documentation & Training

CONTEXTO:
- FASES 1-8 completadas
- Sistema completo funcionando
- Falta documentación unificada

OBJETIVO FASE 9:
Crear documentación completa y training:

1. DEVELOPER_GUIDE.md
   - Onboarding para nuevos developers
   - Workflow día a día
   - Troubleshooting común

2. DEPLOYMENT_PLAYBOOK.md
   - Step-by-step para cada tipo de deploy
   - Checklists pre/post deployment
   - Rollback procedures

3. Video tutorials (opcional)
   - Grabar workflow completo
   - Deploy de feature
   - Manejo de emergencias

4. PROJECT_HANDOVER.md
   - Resumen ejecutivo del sistema
   - Contactos y accesos
   - Maintenance schedule

ARCHIVOS A CREAR:
- docs/infrastructure/three-environments/DEVELOPER_GUIDE.md
- docs/infrastructure/three-environments/DEPLOYMENT_PLAYBOOK.md
- docs/infrastructure/three-environments/PROJECT_HANDOVER.md
- docs/infrastructure/three-environments/TRAINING_MATERIALS.md

REFERENCIAS:
- Toda la documentación creada en FASES 1-8
- docs/infrastructure/three-environments/* (consolidar)

¿Listos para completar Documentation?
```

---

## 📋 RESUMEN DE PROMPTS POR FASE

### Para Copiar y Pegar Rápidamente:

**FASE 6 - Migration Management:**
```
Por favor ejecuta FASE 6: Migration Management System según el WORKFLOW_PROMPTS.md
```

**FASE 7 - Environment Variables:**
```
Por favor ejecuta FASE 7: Environment Variables Management según el WORKFLOW_PROMPTS.md
```

**FASE 8 - Monitoring:**
```
Por favor ejecuta FASE 8: Monitoring & Alerting según el WORKFLOW_PROMPTS.md
```

**FASE 9 - Documentation:**
```
Por favor ejecuta FASE 9: Documentation & Training según el WORKFLOW_PROMPTS.md
```

---

## 🔧 COMANDOS ÚTILES

### Verificación de Estado

```bash
# Ver estado actual del proyecto
cat docs/infrastructure/three-environments/TODO.md | grep "✅"

# Contar tareas completadas
grep -c "✅" docs/infrastructure/three-environments/TODO.md

# Ver últimos archivos creados
ls -la scripts/*.ts | tail -10

# Verificar workflows
ls -la .github/workflows/

# Check database sync
pnpm dlx tsx scripts/sync-prod-to-staging-ultimate.ts --dry-run
```

### Testing Rápido

```bash
# Test dev workflow
git checkout dev && git push

# Test staging deploy
git checkout staging && git merge dev && git push

# Test production (requiere approval)
git checkout main && git merge staging && git push
```

---

## 📊 MÉTRICAS DEL PROYECTO

### Tiempo Invertido
- FASE 1: ~3 horas
- FASE 2: ~2 horas
- FASE 3: ~3 horas
- FASE 3.5 (Sync): ~6 horas
- FASE 4: ~3 horas
- FASE 5: ~1 hora
- **Total hasta ahora:** ~18 horas

### Tiempo Estimado Restante
- FASE 6: ~4-5 horas
- FASE 7: ~2-3 horas
- FASE 8: ~3-4 horas
- FASE 9: ~2-3 horas
- **Total restante:** ~11-15 horas

### Archivos Creados
- Scripts: 25+
- Workflows: 4
- Documentación: 15+ archivos
- Total líneas de código: ~10,000+

---

## 🚀 COMANDO DE INICIO RÁPIDO

Para continuar donde lo dejamos:

```bash
# 1. Verificar estado actual
cat docs/infrastructure/three-environments/TODO.md | grep "FASE" | head -20

# 2. Continuar con siguiente fase
echo "Por favor ejecuta FASE 6: Migration Management System según WORKFLOW_PROMPTS.md"
```

---

## 📝 NOTAS IMPORTANTES

### Decisiones Técnicas Clave
1. **Service Role Keys** para sincronización de datos (no DB passwords)
2. **Dev branch = Production** (mismo project_id)
3. **Staging independiente** con su propio project_id
4. **Database sync manual** con script ultimate que maneja todos los edge cases
5. **Branch protection** requiere configuración manual en GitHub

### Soluciones a Problemas Encontrados
1. ✅ IPv6 pooler issue → Usar Management API en lugar de psql
2. ✅ Generated columns → Auto-detectar y excluir
3. ✅ Non-standard PKs → Query information_schema
4. ✅ Foreign key deps → Calcular orden de dependencias
5. ✅ 100% sync achieved → sync-prod-to-staging-ultimate.ts

### Próximos Pasos Críticos
1. **Aplicar Branch Protection Rules** en GitHub Settings
2. **Reemplazar placeholders** en CODEOWNERS
3. **Comenzar FASE 6** para gestión de migraciones

---

**Última Actualización:** November 2, 2025
**Autor:** Claude Code / Database Agent
**Estado:** Ready para FASE 6
**Archivo:** docs/infrastructure/three-environments/WORKFLOW_PROMPTS.md