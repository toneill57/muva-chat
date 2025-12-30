# FASE 6: Deploy + Cleanup

**Agente:** @agent-deploy-agent + @agent-backend-developer
**Tareas:** 7
**Tiempo estimado:** 2h
**Dependencias:** FASE 5 completada

---

## Prompt 6.1: Deploy a TST

**Agente:** `@agent-deploy-agent`

**PREREQUISITO:** FASE 5 completada, todos los tests pasando

**Contexto:**
Con todos los tests pasando en DEV, procedemos a desplegar a staging (TST) para verificación en ambiente similar a producción.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 33/38 tareas completadas (87%)

FASE 1-5 ✅ COMPLETADAS
FASE 6 - Deploy + Cleanup (Progreso: 0/7)
- [ ] 6.1: Deploy a TST ← ESTAMOS AQUÍ
- [ ] 6.2: Smoke tests TST
- [ ] 6.3: Deploy a PRD
- [ ] 6.4: Smoke tests PRD
- [ ] 6.5: Eliminar código Supabase
- [ ] 6.6: Actualizar documentación
- [ ] 6.7: Archivar proyectos Supabase

**Estado Actual:**
- DEV funcionando 100% con VPS ✓
- Todos los tests pasando ✓
- Listo para deploy a TST

---

**Tareas:**

1. **Verificar cambios pendientes** (5min):
   ```bash
   git status
   git diff --stat dev..HEAD
   ```

2. **Commit y push a dev** (5min):
   ```bash
   git add .
   git commit -m "feat: migrate from Supabase to VPS PostgreSQL

   - Replace supabase-js with pg client
   - Implement staff JWT auth (staff-auth.ts)
   - Configure MinIO for storage
   - Update all API routes for direct pg connection
   - Add new env vars for VPS databases

   BREAKING CHANGE: Removes Supabase dependency

   Generated with Claude Code"

   git push origin dev
   ```

3. **Crear PR dev → tst** (5min):
   ```bash
   gh pr create --base tst --head dev \
     --title "Migration: Supabase → VPS PostgreSQL" \
     --body "$(cat <<'EOF'
   ## Summary
   - Complete migration from Supabase to self-hosted PostgreSQL on VPS
   - New staff authentication with JWT
   - MinIO storage for SIRE documents
   - All tests passing in DEV

   ## Changes
   - New: src/lib/db/ (pg client)
   - New: src/lib/staff-auth.ts
   - New: src/lib/storage/minio-client.ts
   - Modified: All API routes
   - Modified: Environment variables

   ## Test Plan
   - [x] Guest chat público
   - [x] Guest portal autenticado
   - [x] Staff dashboard
   - [x] SIRE compliance
   - [x] Multi-tenant isolation
   - [x] Búsqueda vectorial

   ## Rollback Plan
   - Supabase vars still available (commented)
   - Can revert imports in 15 minutes

   Generated with Claude Code
   EOF
   )"

   gh pr merge --merge --auto
   ```

4. **Esperar deployment** (5min):
   ```bash
   # Ver status del workflow
   gh run list --workflow=deploy-tst.yml --limit=1

   # Ver logs si falla
   gh run view <run-id> --log
   ```

5. **Verificar health check** (2min):
   ```bash
   curl -s https://staging.muva.chat/api/health | jq
   ```

**Entregables:**
- Código mergeado a tst
- Deploy completado
- Health check pasando

**Criterios de Éxito:**
- ✅ PR mergeado
- ✅ GitHub Action exitoso
- ✅ Health check OK

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.1)**

---

## Prompt 6.2: Smoke tests TST

**Agente:** `@agent-deploy-agent`

**PREREQUISITO:** Prompt 6.1 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.2)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 1/7)
- [x] 6.1: Deploy a TST ✓
- [ ] 6.2: Smoke tests TST ← ESTAMOS AQUÍ
- [ ] 6.3-6.7 pendientes

---

**Tareas:**

1. **Test rápido de chat** (5min):
   - Abrir https://staging.muva.chat/with-me
   - Enviar mensaje de prueba
   - Verificar respuesta

2. **Test rápido de auth** (5min):
   - Probar login de staff
   - Verificar sesión

3. **Test rápido de SIRE** (5min):
   - Subir documento de prueba
   - Verificar que sube a MinIO

4. **Verificar logs** (5min):
   ```bash
   # Via GitHub Actions vps-exec
   gh workflow run vps-exec.yml \
     -f environment=tst \
     -f command="pm2 logs muva-chat-tst --lines 50 --nostream" \
     -f working_directory="/var/www/muva-chat-tst"

   # Ver output
   gh run list --workflow=vps-exec.yml --limit=1
   gh run view <run-id> --log
   ```

5. **Verificar conexión DB** (5min):
   - Verificar que TST usa muva_tst
   - Verificar que no usa Supabase

**Criterios de Éxito:**
- ✅ Chat funciona
- ✅ Auth funciona
- ✅ Storage funciona
- ✅ Sin errores en logs

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.2)**

---

## Prompt 6.3: Deploy a PRD

**Agente:** `@agent-deploy-agent`

**PREREQUISITO:** Prompt 6.2 completado, smoke tests pasando

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.3)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 2/7)
- [x] 6.1-6.2 completados ✓
- [ ] 6.3: Deploy a PRD ← ESTAMOS AQUÍ
- [ ] 6.4-6.7 pendientes

---

**Tareas:**

1. **Crear PR tst → prd** (5min):
   ```bash
   gh pr create --base prd --head tst \
     --title "Production Deploy: Supabase → VPS Migration" \
     --body "$(cat <<'EOF'
   ## Summary
   Complete migration from Supabase to self-hosted PostgreSQL on VPS.

   ## Verified in TST
   - [x] Guest chat público
   - [x] Guest portal autenticado
   - [x] Staff dashboard
   - [x] SIRE compliance
   - [x] Storage (MinIO)

   ## Rollback Plan
   - Supabase projects still active (paused after 1 week)
   - Can revert env vars in 5 minutes
   - Can revert code imports in 15 minutes

   ## Post-Deploy Checklist
   - [ ] Verify health check
   - [ ] Monitor for errors (15 min)
   - [ ] Notify stakeholders

   Generated with Claude Code
   EOF
   )"
   ```

2. **Solicitar approval** (variable):
   Informar al usuario que se requiere approval para merge a PRD.
   ```bash
   # Ver PR
   gh pr view --web
   ```

3. **Post approval - merge** (5min):
   ```bash
   gh pr merge --merge
   ```

4. **Esperar deployment** (5min):
   ```bash
   gh run list --workflow=deploy-prd.yml --limit=1
   gh run view <run-id> --log
   ```

5. **Verificar health check** (2min):
   ```bash
   curl -s https://muva.chat/api/health | jq
   ```

**Entregables:**
- PR creado y aprobado
- Deploy a producción completado
- Health check pasando

**Criterios de Éxito:**
- ✅ PR aprobado y mergeado
- ✅ Deploy exitoso
- ✅ Health check OK
- ✅ Sin errores inmediatos

**Estimado:** 30min (+ tiempo de approval)

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.3)**

---

## Prompt 6.4: Smoke tests PRD

**Agente:** `@agent-deploy-agent`

**PREREQUISITO:** Prompt 6.3 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.4)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 3/7)
- [x] 6.1-6.3 completados ✓
- [ ] 6.4: Smoke tests PRD ← ESTAMOS AQUÍ
- [ ] 6.5-6.7 pendientes

---

**Tareas:**

1. **Test crítico de chat** (5min):
   - Abrir https://muva.chat/with-me (o URL de tenant real)
   - Enviar mensaje: "Hola"
   - Verificar respuesta

2. **Test crítico de portal huésped** (5min):
   - Probar login con reservación real (si hay)
   - Verificar datos correctos

3. **Test crítico de staff** (5min):
   - Login de staff real
   - Verificar acceso a dashboard

4. **Monitorear errores** (10min):
   ```bash
   # Ver logs de producción
   gh workflow run vps-exec.yml \
     -f environment=prd \
     -f command="pm2 logs muva-chat-prd --lines 100 --nostream" \
     -f working_directory="/var/www/muva-chat-prd"
   ```

5. **Verificar métricas** (5min):
   - Verificar latencia de respuestas
   - Verificar uso de memoria/CPU
   - Verificar conexiones DB

**Criterios de Éxito:**
- ✅ Chat funciona en producción
- ✅ Portal huésped funciona
- ✅ Staff dashboard funciona
- ✅ Sin errores críticos en logs
- ✅ Performance aceptable

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.4)**

---

## Prompt 6.5: Eliminar código Supabase

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 6.4 completado, PRD estable

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.5)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 4/7)
- [x] 6.1-6.4 completados ✓
- [ ] 6.5: Eliminar código Supabase ← ESTAMOS AQUÍ
- [ ] 6.6-6.7 pendientes

---

**Tareas:**

1. **Eliminar directorio supabase client** (5min):
   ```bash
   rm -rf src/lib/supabase/
   ```

2. **Eliminar dependencias de package.json** (5min):
   ```bash
   pnpm remove @supabase/supabase-js @supabase/auth-helpers-nextjs
   ```

3. **Buscar y eliminar imports huérfanos** (10min):
   ```bash
   # Buscar imports de supabase
   grep -r "from '@supabase" src/ --include="*.ts" --include="*.tsx"
   grep -r "from 'supabase" src/ --include="*.ts" --include="*.tsx"

   # Eliminar cualquier import encontrado
   ```

4. **Limpiar variables de entorno** (5min):
   En .env.local, .env.tst, .env.prd:
   - Eliminar o comentar SUPABASE_*
   - Mantener solo DATABASE_* y MINIO_*

5. **Verificar build** (5min):
   ```bash
   pnpm run build
   ```

**Nota:** Hacer esto DESPUÉS de confirmar que PRD es estable (esperar al menos 1-2 días).

**Entregables:**
- src/lib/supabase/ eliminado
- Dependencies de Supabase removidas
- Build exitoso sin Supabase

**Criterios de Éxito:**
- ✅ Sin código Supabase en codebase
- ✅ Build pasa
- ✅ App sigue funcionando

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.5)**

---

## Prompt 6.6: Actualizar documentación

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 6.5 completado

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.6)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 5/7)
- [x] 6.1-6.5 completados ✓
- [ ] 6.6: Actualizar documentación ← ESTAMOS AQUÍ
- [ ] 6.7: Archivar proyectos Supabase

---

**Tareas:**

1. **Actualizar CLAUDE.md** (15min):
   - Remover referencias a Supabase
   - Actualizar sección de DB connection
   - Documentar nuevo sistema de auth
   - Documentar MinIO storage

   Cambios principales:
   ```markdown
   ## Database Connection

   **PostgreSQL VPS (Direct Connection)**
   - DEV: 195.200.6.216:46101/muva_dev
   - TST: localhost:46101/muva_tst (desde VPS)
   - PRD: localhost:46101/muva_prd (desde VPS)

   **Client:** pg/postgres.js (src/lib/db/)

   ## Authentication
   - Guest: JWT (src/lib/guest-auth.ts)
   - Staff: JWT (src/lib/staff-auth.ts)
   - Super Admin: JWT (src/lib/super-admin-auth.ts)

   ## Storage
   - MinIO (S3-compatible)
   - Endpoint: localhost:9000
   - Bucket: sire-documents
   ```

2. **Actualizar README si existe** (5min):
   - Actualizar requisitos
   - Actualizar setup instructions

3. **Crear doc de arquitectura actualizada** (10min):
   `docs/architecture/DATABASE.md`:
   ```markdown
   # Database Architecture

   ## Overview
   MUVA Chat usa PostgreSQL auto-hospedado en VPS con pgvector.

   ## Connection
   - Client: pg (node-postgres)
   - Pooling: Integrado en src/lib/db/pool.ts
   - SSL: Configurado para conexiones remotas (DEV)

   ## Three-Tier
   - DEV: muva_dev (desarrollo local)
   - TST: muva_tst (staging)
   - PRD: muva_prd (producción)
   ```

**Entregables:**
- CLAUDE.md actualizado
- Documentación de arquitectura
- Sin referencias a Supabase

**Criterios de Éxito:**
- ✅ Docs reflejan nueva arquitectura
- ✅ Sin menciones a Supabase activas

**Estimado:** 30min

---

🔼 **COPIAR HASTA AQUÍ (Prompt 6.6)**

---

## Prompt 6.7: Archivar proyectos Supabase

**Agente:** `@agent-backend-developer` (documentar para usuario)

**PREREQUISITO:** Prompt 6.6 completado, PRD estable por varios días

---

🔽 **COPIAR DESDE AQUÍ (Prompt 6.7)**

**📊 Contexto de Progreso:**

FASE 6 - Deploy + Cleanup (Progreso: 6/7)
- [x] 6.1-6.6 completados ✓
- [ ] 6.7: Archivar proyectos Supabase ← ESTAMOS AQUÍ

---

**Tareas:**

1. **Hacer backup final de Supabase** (10min):
   Para cada proyecto (dev/tst/prd):
   - Supabase Dashboard > Settings > Database
   - Download backup
   - Guardar en ubicación segura

2. **Documentar pasos de archivado** (5min):
   El usuario debe hacer esto manualmente en Supabase Dashboard:

   **Para cada proyecto:**
   1. Ir a https://supabase.com/dashboard
   2. Seleccionar proyecto
   3. Settings > General
   4. "Pause project" (no eliminar todavía)

3. **Establecer fecha de eliminación** (2min):
   Documentar:
   - Fecha de pausa: [HOY]
   - Fecha de eliminación sugerida: [HOY + 30 días]
   - Motivo para mantener 30 días: Rollback de emergencia

4. **Crear recordatorio** (3min):
   Documentar en TODO.md o sistema de tracking:
   ```markdown
   ## Post-Migration Reminder
   - [ ] 2025-01-30: Revisar si eliminar proyectos Supabase
     - DEV: zpyxgkvonrxbhvmkuzlt
     - TST: bddcvjoeoiekzfetvxoe
     - PRD: kprqghwdnaykxhostivv
   ```

5. **Verificar billing** (2min):
   - Confirmar que proyectos pausados no generan costos
   - O evaluar si vale la pena eliminar inmediatamente

**Entregables:**
- Backups finales de Supabase
- Proyectos pausados (no eliminados)
- Fecha de eliminación documentada

**Criterios de Éxito:**
- ✅ Backups guardados
- ✅ Proyectos pausados
- ✅ Recordatorio configurado

**Estimado:** 15min

---

**🔍 Verificación Post-Ejecución FASE 6 COMPLETA:**

"¿Consideras satisfactoria la ejecución de FASE 6 completa?

Resumen:
- Deploy a TST exitoso ✓
- Smoke tests TST pasando ✓
- Deploy a PRD exitoso ✓
- Smoke tests PRD pasando ✓
- Código Supabase eliminado ✓
- Documentación actualizada ✓
- Proyectos Supabase archivados ✓"

**Si aprobado:**
"✅ FASE 6 COMPLETADA

**Progreso FASE 6:** 7/7 tareas completadas (100%) ✅ COMPLETADA
**Progreso General:** 38/38 tareas completadas (100%)

---

# 🎉 MIGRACIÓN COMPLETADA

## Resumen Final

| Componente | Estado |
|------------|--------|
| PostgreSQL VPS | ✅ Funcionando |
| Staff Auth JWT | ✅ Implementado |
| MinIO Storage | ✅ Configurado |
| Supabase | ✅ Archivado |
| Documentación | ✅ Actualizada |

## Próximos Pasos
1. Monitorear producción por 1 semana
2. Eliminar proyectos Supabase después de 30 días
3. Considerar optimizaciones de performance

**¡Felicidades! La migración se completó exitosamente.**"

🔼 **COPIAR HASTA AQUÍ (Prompt 6.7)**

---

## Checklist FASE 6

- [ ] 6.1 Deploy a TST
- [ ] 6.2 Smoke tests TST
- [ ] 6.3 Deploy a PRD
- [ ] 6.4 Smoke tests PRD
- [ ] 6.5 Eliminar código Supabase
- [ ] 6.6 Actualizar documentación
- [ ] 6.7 Archivar proyectos Supabase

**Anterior:** `FASE-5-testing.md`
**Siguiente:** N/A (Última fase)

---

# Checklist Final del Proyecto

## Pre-Migration
- [ ] Backup completo de Supabase
- [ ] pgvector verificado en VPS
- [ ] MinIO instalado y configurado
- [ ] Credenciales documentadas

## Database (FASE 1)
- [ ] Schema aplicado a 3 ambientes
- [ ] Funciones RPC migradas
- [ ] RLS policies activas
- [ ] Datos migrados

## Conexión (FASE 2)
- [ ] Cliente pg implementado
- [ ] API routes migradas
- [ ] Build exitoso

## Auth (FASE 3)
- [ ] staff_auth_users creada
- [ ] JWT auth implementado
- [ ] Endpoints funcionando

## Storage (FASE 4)
- [ ] MinIO configurado
- [ ] Archivos migrados
- [ ] CORS configurado

## Testing (FASE 5)
- [ ] Todos los tests pasando
- [ ] Performance aceptable
- [ ] Documentado

## Deploy (FASE 6)
- [ ] TST funcionando
- [ ] PRD funcionando
- [ ] Supabase archivado
- [ ] Docs actualizados
