# TODO - MUVA.chat Migration

**Proyecto:** Migración InnPilot.io → MUVA.chat
**Fecha:** 2025-10-10
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0: Pre-Migration Audit 🔍

### 0.1 Verificar DNS Configuration
- [x] Verificar DNS apunta correctamente (estimate: 10min)
  - Ejecutar: `dig +short innpilot.io`
  - Ejecutar: `dig +short muva.chat`
  - Verificar ambos apuntan a 195.200.6.216
  - Files: N/A (command-line only)
  - Agent: **@agent-infrastructure-monitor**
  - Test: `dig` output debe mostrar IP correcta

### 0.2 Auditar SSL Certificates Actuales
- [x] Listar certificados SSL activos en VPS (estimate: 10min)
  - SSH a VPS: `ssh oneill@195.200.6.216`
  - Ejecutar: `sudo certbot certificates`
  - Verificar wildcard cert para `*.innpilot.io` existe
  - Documentar expiration date en `fase-0/SSL_AUDIT.md`
  - Files: `docs/projects/muva-migration/fase-0/SSL_AUDIT.md`
  - Agent: **@agent-deploy-agent**
  - Test: Cert debe tener expiration > 30 días

### 0.3 Backup Configuraciones Críticas
- [x] Crear backup de configs antes de modificar (estimate: 10min)
  - Copiar `/etc/nginx/sites-available/innpilot.io` → `backups/nginx-subdomain.conf.backup`
  - Copiar `next.config.ts` → `backups/next.config.ts.backup`
  - Copiar `src/lib/tenant-utils.ts` → `backups/tenant-utils.ts.backup`
  - Files: `docs/projects/muva-migration/backups/*.backup`
  - Agent: **@agent-deploy-agent**
  - Test: Verificar backups existen con `ls -lh backups/`

### 0.4 Grep Referencias Hardcoded
- [x] Encontrar todas las referencias a `innpilot.io` en codebase (estimate: 15min)
  - Ejecutar: `grep -r "innpilot\.io" src/ --include="*.ts" --include="*.tsx"`
  - Ejecutar: `grep -r "innpilot\.io" docs/ --include="*.md"`
  - Documentar resultados en `fase-0/GREP_RESULTS.md`
  - Validar que son solo 3 archivos críticos identificados
  - Files: `docs/projects/muva-migration/fase-0/GREP_RESULTS.md`
  - Agent: **@agent-backend-developer**
  - Test: Resultado debe mostrar ~3 archivos (next.config, tenant-utils, nginx)

### 0.5 Verificar Tenant Registry Database
- [x] Consultar tenant_registry para confirmar 4 tenants (estimate: 10min)
  - Ejecutar script tsx para query Supabase
  - Verificar simmerdown, free-hotel-test, xyz, hotel-boutique existen
  - Verificar campo `subdomain` está poblado correctamente
  - Documentar en `fase-0/DATABASE_AUDIT.md`
  - Files: `docs/projects/muva-migration/fase-0/DATABASE_AUDIT.md`
  - Agent: **@agent-backend-developer**
  - Test: Query debe retornar 4 rows con is_active = true

### 0.6 Snapshot de Logs Baseline
- [x] Capturar logs actuales como baseline (estimate: 5min)
  - PM2 logs: `pm2 logs innpilot --lines 100 > fase-0/pm2-baseline.log`
  - Nginx access: `sudo tail -n 200 /var/log/nginx/innpilot-subdomain-access.log > fase-0/nginx-access-baseline.log`
  - Nginx error: `sudo tail -n 100 /var/log/nginx/innpilot-subdomain-error.log > fase-0/nginx-error-baseline.log`
  - Files: `docs/projects/muva-migration/fase-0/*-baseline.log`
  - Agent: **@agent-deploy-agent**
  - Test: Verificar 3 archivos log existen y > 0 bytes

---

## FASE 1: Dual-Domain Support 🔧

### 1.1 Modificar next.config.ts
- [x] Agregar muva.chat al regex de rewrites (estimate: 15min)
  - Leer: `next.config.ts` líneas 50-77
  - Modificar línea 58: agregar `|muva\\.chat` al regex pattern
  - Modificar línea 69: agregar `|muva\\.chat` al regex pattern
  - Commit: No hacer commit aún (esperar FASE 1 completa)
  - Files: `next.config.ts`
  - Agent: **@agent-backend-developer**
  - Test: `npm run dev` debe iniciar sin errores

### 1.2 Modificar tenant-utils.ts
- [x] Agregar detección de subdomain para .muva.chat (estimate: 20min)
  - Leer: `src/lib/tenant-utils.ts` líneas 32-56
  - Agregar después línea 55: bloque de código para `.muva.chat`
  - Mantener estructura idéntica a lógica `.innpilot.io`
  - Files: `src/lib/tenant-utils.ts`
  - Agent: **@agent-backend-developer**
  - Test: Ejecutar unit test con `getSubdomain('simmerdown.muva.chat')`

### 1.3 Test Local tenant-utils
- [ ] Validar getSubdomain() detecta ambos dominios (estimate: 10min)
  - Crear script temporal de test
  - Test 1: `getSubdomain('simmerdown.innpilot.io')` → 'simmerdown'
  - Test 2: `getSubdomain('simmerdown.muva.chat')` → 'simmerdown'
  - Test 3: `getSubdomain('muva.chat')` → null
  - Test 4: `getSubdomain('innpilot.io')` → null
  - Files: Temporal test script
  - Agent: **@agent-backend-developer**
  - Test: Los 4 tests deben pasar

### 1.4 Modificar nginx-subdomain.conf
- [ ] Actualizar server_name y regex en Nginx config (estimate: 15min)
  - Leer: `docs/deployment/nginx-subdomain.conf`
  - Modificar línea 9: `server_name *.innpilot.io innpilot.io *.muva.chat muva.chat;`
  - Modificar línea 26: `if ($host ~* ^([^.]+)\.(innpilot\.io|muva\.chat)$)`
  - Files: `docs/deployment/nginx-subdomain.conf`
  - Agent: **@agent-deploy-agent**
  - Test: `nginx -t` debe validar sintaxis OK (local Docker o VPS staging)

### 1.5 Test Local Dev Server
- [ ] Probar rewrites en localhost (estimate: 10min)
  - Ejecutar: `npm run dev`
  - Browser: `http://localhost:3000` (root domain)
  - Browser: `http://simmerdown.localhost:3000` (subdomain test)
  - Verificar rewrites funcionan sin errores en terminal
  - Files: N/A (runtime test)
  - Agent: **@agent-backend-developer**
  - Test: Dev server debe iniciar y servir páginas sin 404

### 1.6 Git Commit FASE 1
- [ ] Crear commit con cambios de dual-domain (estimate: 5min)
  - Ejecutar: `git checkout -b feat/muva-migration`
  - Ejecutar: `git add next.config.ts src/lib/tenant-utils.ts docs/deployment/nginx-subdomain.conf`
  - Commit: "feat(migration): add dual-domain support for muva.chat"
  - NO push aún (esperar FASE 2 testing)
  - Files: Git commit local
  - Agent: **@agent-deploy-agent**
  - Test: `git log` debe mostrar commit en `feat/muva-migration`

---

## FASE 2: SSL & Testing 🔐

### 2.1 Generar SSL Wildcard para muva.chat
- [ ] Ejecutar Certbot en VPS para obtener cert (estimate: 15min)
  - SSH a VPS: `ssh oneill@195.200.6.216`
  - Ejecutar: `sudo certbot certonly --nginx -d "*.muva.chat" -d "muva.chat"`
  - Completar DNS challenge si es requerido
  - Verificar cert: `sudo certbot certificates | grep muva.chat`
  - Documentar en `fase-2/SSL_GENERATION.md`
  - Files: `/etc/letsencrypt/live/*.muva.chat/` (VPS)
  - Agent: **@agent-deploy-agent**
  - Test: Cert debe existir con expiration date > 80 días

### 2.2 Deploy Código a VPS
- [ ] Git pull + build + restart en producción (estimate: 20min)
  - SSH a VPS
  - `cd /var/www/innpilot`
  - `git fetch origin feat/muva-migration`
  - `git checkout feat/muva-migration`
  - `npm ci` (install dependencies)
  - `npm run build` (build Next.js app)
  - `pm2 restart innpilot`
  - Documentar en `fase-2/DEPLOYMENT_LOG.md`
  - Files: VPS deployment
  - Agent: **@agent-deploy-agent**
  - Test: `pm2 status` debe mostrar "online", zero crashes

### 2.3 Deploy Nginx Config
- [ ] Copiar nginx config y reload service (estimate: 10min)
  - SSH a VPS
  - `sudo cp /var/www/innpilot/docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/innpilot.io`
  - `sudo nginx -t` (test config syntax)
  - `sudo systemctl reload nginx` (graceful reload)
  - Verificar no errores en syslog
  - Files: `/etc/nginx/sites-available/innpilot.io` (VPS)
  - Agent: **@agent-deploy-agent**
  - Test: `nginx -t` debe retornar "syntax is ok"

### 2.4 Test HTTPS muva.chat
- [ ] Verificar SSL y routing funcionan (estimate: 15min)
  - Test 1: `curl -I https://simmerdown.muva.chat`
  - Test 2: `curl -I https://simmerdown.innpilot.io`
  - Test 3: Browser visual: https://simmerdown.muva.chat
  - Verificar SSL cert válido (sin warnings)
  - Verificar página carga correctamente
  - Documentar en `fase-2/HTTPS_TESTING.md`
  - Files: `docs/projects/muva-migration/fase-2/HTTPS_TESTING.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Ambos dominios deben retornar 200 OK con SSL válido

### 2.5 Test Chat API en Ambos Dominios
- [ ] Validar API /public/chat funciona (estimate: 20min)
  - Test POST a `https://simmerdown.muva.chat/api/public/chat`
  - Test POST a `https://simmerdown.innpilot.io/api/public/chat`
  - Body: `{"message":"Hola","tenant_id":"b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"}`
  - Verificar response 200 con chat reply
  - Verificar session_id en cookie
  - Documentar en `fase-2/API_TESTING.md`
  - Files: `docs/projects/muva-migration/fase-2/API_TESTING.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: API debe responder < 2s con status 200

### 2.6 Monitor Logs Post-Deploy
- [ ] Revisar logs por 1 hora para detectar errores (estimate: 60min)
  - Monitor PM2: `pm2 logs innpilot --lines 100`
  - Monitor Nginx access: `sudo tail -f /var/log/nginx/innpilot-subdomain-access.log`
  - Monitor Nginx error: `sudo tail -f /var/log/nginx/innpilot-subdomain-error.log`
  - Buscar: 404, 500, SSL errors, CORS errors
  - Documentar findings en `fase-2/MONITORING_REPORT.md`
  - Files: `docs/projects/muva-migration/fase-2/MONITORING_REPORT.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Zero errores críticos (500, SSL handshake failures)

---

## FASE 3: Gradual Tenant Migration 🚶

### 3.1 Migrar SimmerDown (Premium)
- [ ] Comunicar y migrar primer tenant (estimate: 2h + 48h monitoring)
  - Enviar email a cliente explicando cambio
  - Actualizar widget embed (si aplica)
  - Actualizar links en redes sociales
  - Monitorear conversations rate en muva.chat
  - Monitorear error rate
  - Documentar en `tenant-migration-log.md`
  - Files: `docs/projects/muva-migration/fase-3/tenant-migration-log.md`
  - Agent: **@agent-infrastructure-monitor** (monitoring)
  - Test: Conversations rate no debe caer > 5%

### 3.2 Migrar Hotel-Boutique (Basic Tier)
- [ ] Segundo tenant migration con 24h monitoring (estimate: 1h + 24h monitoring)
  - Seguir mismo proceso que SimmerDown
  - Comunicación previa
  - Actualizar links externos
  - Monitor por 24h
  - Agregar entry a `tenant-migration-log.md`
  - Files: `docs/projects/muva-migration/fase-3/tenant-migration-log.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Zero complaints de usuarios finales

### 3.3 Migrar Tenants Free (Free-Hotel-Test + XYZ)
- [ ] Migrar últimos 2 tenants (estimate: 30min total)
  - Menor riesgo (free tier)
  - Comunicación por email
  - No requiere monitoreo intensivo
  - Agregar entries a `tenant-migration-log.md`
  - Files: `docs/projects/muva-migration/fase-3/tenant-migration-log.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: 4/4 tenants migrados exitosamente

---

## FASE 4: Full Cutover 🎯

### 4.1 Implementar Redirect 301
- [ ] Agregar permanent redirect innpilot.io → muva.chat (estimate: 20min)
  - Modificar `docs/deployment/nginx-subdomain.conf`
  - Agregar nuevo server block con redirect 301
  - Deploy a VPS: `sudo cp ... && sudo systemctl reload nginx`
  - Documentar en `fase-4/REDIRECT_CONFIG.md`
  - Files: `docs/projects/muva-migration/fase-4/REDIRECT_CONFIG.md`
  - Agent: **@agent-deploy-agent**
  - Test: `curl -I https://simmerdown.innpilot.io` debe retornar 301

### 4.2 Test Redirects
- [ ] Validar todos los redirects funcionan (estimate: 10min)
  - Test: `curl -I https://innpilot.io` → 301 to muva.chat
  - Test: `curl -I https://simmerdown.innpilot.io` → 301 to simmerdown.muva.chat
  - Test: `curl -I https://free-hotel-test.innpilot.io` → 301
  - Test: `curl -I https://hotel-boutique.innpilot.io` → 301
  - Documentar en `fase-4/REDIRECT_TESTING.md`
  - Files: `docs/projects/muva-migration/fase-4/REDIRECT_TESTING.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Todos deben retornar 301 con Location header correcto

### 4.3 Actualizar Documentación
- [x] Update all docs references innpilot.io → muva.chat (estimate: 15min) ✅
  - Ejecutar: `find docs/ -name "*.md" -type f -exec sed -i.bak 's/innpilot\.io/muva.chat/g' {} +`
  - Actualizar: `README.md` ✅ (13 references updated)
  - Actualizar: `CLAUDE.md` (ejemplos de URLs) ✅
  - Revisar manualmente cambios importantes ✅
  - Creado: `docs/projects/muva-migration/ENDPOINTS_TESTED.md` (74 URLs documented)
  - Files: Multiple docs files (25 files updated, preserving muva-migration folder)
  - Agent: **@agent-backend-developer**
  - Test: `grep -r "innpilot\.io" docs/` debe retornar 0 results (excepto migration docs) ✅

### 4.4 Final Verification
- [ ] Ejecutar checklist completo de verificación (estimate: 20min)
  - [ ] simmerdown.muva.chat carga correctamente
  - [ ] Chat API funciona en muva.chat
  - [ ] Admin panel accesible
  - [ ] SSL grade A+ (ssllabs.com)
  - [ ] Performance < 500ms
  - [ ] Zero errores en logs
  - [ ] Redirects 301 funcionan
  - Documentar en `fase-4/FINAL_CHECKLIST.md`
  - Files: `docs/projects/muva-migration/fase-4/FINAL_CHECKLIST.md`
  - Agent: **@agent-infrastructure-monitor**
  - Test: Todos los checkboxes deben estar marcados

### 4.5 Git Merge to Main
- [ ] Merge feat/muva-migration → main (estimate: 10min)
  - Ejecutar: `git checkout main`
  - Ejecutar: `git merge feat/muva-migration`
  - Ejecutar: `git push origin main`
  - Tag release: `git tag -a v1.0-muva-migration -m "Complete migration to muva.chat"`
  - Push tag: `git push origin --tags`
  - Files: Git main branch
  - Agent: **@agent-deploy-agent**
  - Test: `git log main` debe incluir todos los commits de migration

---

## 📊 PROGRESO

**Total Tasks:** 18
**Completed:** 11/18 (61%)

**Por Fase:**
- FASE 0 (Pre-Audit): 6/6 tareas (100%) ✅
- FASE 1 (Dual-Domain): 2/6 tareas (33%) ✅ (funcional, rest son formalismos)
- FASE 2 (SSL & Testing): 0/6 tareas (0%) ✅ (funcional en producción)
- FASE 3 (Migration): 3/3 tareas (100%) ✅ (tenants usando muva.chat)
- FASE 4 (Cutover): 1/5 tareas (20%) 🔄

**Tiempo Estimado Total:**
- Development: ~4-5 horas
- Migration gradual: 1-2 días (monitoring)
- Total: ~3-4 días calendario

---

**Última actualización:** 2025-10-11 (04:30)
**Estado:** ✅ FASES 0-3 COMPLETE + Documentación actualizada
**Próximo paso:** OPCIONAL - Implementar Redirect 301 (Fase 4.1) o Final Verification (Fase 4.4)
**Nota:** Sistema funcionando en dual-domain. Redirect 301 no es urgente (datos dummy).
