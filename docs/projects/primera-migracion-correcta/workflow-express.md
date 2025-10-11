# Script Ejecutable - Primera Migración Correcta

**Proyecto:** Primera Migración Correcta Post-Rebrand
**Fecha:** 11 Octubre 2025
**Tipo:** Script Copy-Paste (Single Session)
**Estrategia:** TodoList + Testing Incremental + Retry Loop
**Tiempo Estimado:** 2h (incluye 1h buffer para debugging)
**Agente:** @agent-deploy-agent

---

## 🎯 OBJETIVO

Realizar el primer deployment exitoso post-migración de InnPilot → MUVA, verificando que toda la infraestructura VPS funciona correctamente con los nuevos nombres y referencias.

**Problema Actual:**
- Acabo de completar la migración de "InnPilot" a "MUVA"
- Ya hemos hecho commits a `dev` antes, pero esta es la primera migración completa
- La infraestructura está lista (GitHub Actions, VPS, PM2, Nginx)
- Necesitamos verificar que el deployment funciona end-to-end

**Estado Deseado:**
- ✅ Código en localhost committed y pushed a `dev`
- ✅ GitHub Actions ejecuta deployment exitosamente
- ✅ VPS actualizado con últimos cambios
- ✅ Health checks pasan (https://muva.chat/api/health)
- ✅ PM2 proceso "muva-chat" running
- ✅ Logs sin errores críticos

---

## 📊 ESTRATEGIA

**Por qué Script Copy-Paste:**
- Primera migración post-rebrand es crítica
- Necesita monitoreo activo durante deployment
- Retry loop incluido para manejar problemas inesperados
- Context usage manejable (~2h de trabajo)
- Deploy-agent puede ejecutar de forma autónoma

**Safety Features:**
- ✅ GitHub Actions tiene rollback automático
- ✅ Manual rollback disponible vía SSH
- ✅ PM2 reload (zero-downtime)
- ✅ Health checks en cada paso

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Primera Migración Correcta Post-Rebrand InnPilot → MUVA

OBJETIVO:
Realizar primer deployment exitoso post-migración, verificando que toda la infraestructura VPS funciona correctamente.

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- Branch: dev
- VPS: 195.200.6.216 (muva.chat)
- PM2 Process: muva-chat
- GitHub Actions: .github/workflows/deploy.yml
- NO romper producción

---

TASKS (Ejecutar en orden, con verificación entre cada una):

## TASK 1: Review & Stage Changes (15min) 🔴

**Descripción:**
Verificar git status y decidir qué incluir en el commit post-migración.

**Acciones:**
1. Run `git status --porcelain` para ver cambios
2. Run `git diff CLAUDE.md` para revisar cambios en CLAUDE
3. Analizar si incluir:
   - CLAUDE.md (modificado) ✓
   - .claude/commands/script.md (nuevo) ✓
   - docs/projects/fix-health-check/ (nuevo) - evaluar
4. Stage archivos apropiados con `git add`

**TEST:**
```bash
git status
git diff --cached --stat
```
- Expected: Archivos staged correctamente

**COMMIT:** No commit en esta task (solo staging)

---

## TASK 2: Create Commit Post-Migration (10min) 🔴

**Descripción:**
Crear commit con mensaje semántico apropiado, indicando primera migración post-rebrand.

**Commit Message:**
```
feat(migration): Primera migración correcta post-rebrand InnPilot → MUVA

- Actualizado CLAUDE.md con reglas post-migración
- Renombrado workflow-express a script command
- Preparado para primer deployment VPS post-rebrand

Primera deployment post-migración completa de InnPilot a MUVA.
Verificando que toda la infraestructura funciona correctamente.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Acciones:**
1. Create commit usando HEREDOC format
2. Verify commit con `git log -1 --format='%an %ae %s'`

**TEST:**
```bash
git log -1 --pretty=format:"%h - %s" --abbrev-commit
git show --stat HEAD
```
- Expected: Commit creado con mensaje correcto

**COMMIT:** (Este ES el commit)

---

## TASK 3: Push to Dev Branch (5min) 🔴

**Descripción:**
Push a origin/dev, triggering GitHub Actions workflow.

**Acciones:**
1. Verify current branch: `git branch --show-current` (debe ser "dev")
2. Push to origin: `git push origin dev`
3. Get GitHub Actions run URL: `gh run list --workflow=deploy.yml --limit 1`

**TEST:**
```bash
git log origin/dev..HEAD
```
- Expected: Output vacío (sin commits pendientes)

**VERIFICACIÓN:**
- GitHub Actions workflow triggered
- Run visible en: `gh run list --workflow=deploy.yml --limit 1`

---

## TASK 4: Monitor GitHub Actions (5min) 🟡

**Descripción:**
Observar workflow logs en tiempo real para detectar problemas early.

**Acciones:**
1. Get latest run ID: `gh run list --workflow=deploy.yml --limit 1 --json databaseId -q '.[0].databaseId'`
2. Watch run: `gh run watch <run-id>` (con timeout de 5min)
3. Si completa: verificar status
4. Si falla: capturar logs con `gh run view <run-id> --log`

**TEST:**
```bash
gh run list --workflow=deploy.yml --limit 1
```
- Expected: Status "completed" con conclusion "success"

**BRANCH POINT:**
- ✅ Success → Continue to TASK 5
- ❌ Failure → Jump to TASK 6 (Debug & Retry)

---

## TASK 5: Verify Deployment Success (10min) 🔴

**Descripción:**
Verificar que el deployment fue exitoso mediante health checks y logs.

**Acciones:**
1. Health check principal:
   ```bash
   curl -s https://muva.chat/api/health | jq
   ```
   Expected: `{"status":"healthy",...}`

2. Verificar tenant subdomains:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://simmerdown.muva.chat/chat
   ```
   Expected: `200`

3. Verificar PM2 status (via SSH):
   ```bash
   ssh oneill@muva.chat "pm2 status muva-chat"
   ```
   Expected: Status "online", uptime reciente

4. Verificar logs sin errores críticos:
   ```bash
   ssh oneill@muva.chat "pm2 logs muva-chat --lines 50 --nostream"
   ```

**TEST:**
- Health check: 200 OK
- Tenant access: 200 OK
- PM2: online
- Logs: sin errores críticos (puede tener warnings normales)

**VERIFICACIÓN FINAL:**
```bash
./scripts/verify-deployment.sh
```
Expected: Todos los checks pasan

**SUCCESS:** ✅ Deployment exitoso! → Continue to TASK 7

---

## TASK 6: Debug & Retry Loop (60min buffer) 🟡

**Descripción:**
Si deployment falla, analizar error logs, fix issues, y retry.

**Acciones según tipo de error:**

### 6.1: GitHub Actions Build Failure
```bash
# Get error logs
gh run view <run-id> --log | grep "Error"

# Común: TypeScript errors
npm run type-check

# Común: Build errors
npm run build

# Fix errors → new commit → push → retry
```

### 6.2: SSH Connection Failure
```bash
# Test SSH
ssh -vvv oneill@muva.chat

# Verify GitHub Secrets
gh secret list

# Verify VPS_SSH_KEY is correct
```

### 6.3: PM2 Process Crashes
```bash
# SSH to VPS
ssh oneill@muva.chat

# Check PM2 status
pm2 status

# View error logs
pm2 logs muva-chat --err --lines 200

# Common fixes:
pm2 restart muva-chat
pm2 reload muva-chat --update-env
```

### 6.4: Health Check Fails (503/500)
```bash
# Test locally from VPS
ssh oneill@muva.chat "curl http://localhost:3000/api/health"

# Check Nginx
ssh oneill@muva.chat "sudo nginx -t && sudo systemctl status nginx"

# Check build artifacts
ssh oneill@muva.chat "ls -la /var/www/muva-chat/.next/server/pages/api/"

# Rebuild if needed
ssh oneill@muva.chat "cd /var/www/muva-chat && npm run build && pm2 reload muva-chat"
```

### 6.5: Nginx 502 Bad Gateway
```bash
# Verify PM2 running
ssh oneill@muva.chat "pm2 status muva-chat"

# Restart PM2 if needed
ssh oneill@muva.chat "pm2 restart muva-chat"

# Reload Nginx
ssh oneill@muva.chat "sudo systemctl reload nginx"
```

**RETRY PROCESS:**
1. Identify root cause
2. Fix issue (commit if code change needed)
3. Push to dev (triggers new deployment)
4. Return to TASK 4 (Monitor GitHub Actions)
5. Max 3 retry attempts before escalating

**ESCALATION:**
Si después de 3 retries sigue fallando:
- Document error en `docs/projects/primera-migracion-correcta/errors.md`
- Report al usuario con diagnóstico completo
- Sugerir manual intervention o `/plan-project` para análisis profundo

---

## TASK 7: Document & Report (15min) 🟢

**Descripción:**
Documentar resultado del deployment y actualizar snapshots.

**Acciones:**

1. Crear deployment report:
   ```bash
   cat > docs/projects/primera-migracion-correcta/deployment-report.md <<'EOF'
   # Deployment Report - Primera Migración Correcta

   **Fecha:** $(date +"%Y-%m-%d %H:%M:%S")
   **Status:** [SUCCESS/FAILURE]
   **Commit:** $(git log -1 --format="%h - %s")
   **Deployment Time:** [Xmin]
   **GitHub Actions Run:** [URL]

   ## ✅ Success Metrics
   - Health Check: [200 OK/FAIL]
   - PM2 Status: [online/error]
   - Tenants Access: [OK/FAIL]
   - Logs: [Clean/Errors]

   ## 🔍 Issues Encontrados
   [None/List issues]

   ## 📝 Notes
   [Additional notes]
   EOF
   ```

2. Update deploy-agent snapshot si necesario:
   - Agregar aprendizajes de este deployment
   - Documentar issues comunes encontrados
   - Actualizar troubleshooting section

3. Report al usuario:
   - Status: ✅ Success / ❌ Failure
   - Deployment time
   - Health check results
   - Problemas encontrados (si los hay)
   - Próximos pasos recomendados

**TEST:**
```bash
ls -la docs/projects/primera-migracion-correcta/deployment-report.md
```
Expected: Archivo creado con contenido completo

---

INSTRUCCIONES PARA CLAUDE (@agent-deploy-agent):

1. **TodoWrite**: Crear todo list con estas 7 tasks
2. **Ejecutar en orden**: Task 1 → 2 → 3 → 4 → 5 → 7 (skip 6 si todo OK)
3. **NO avanzar** a siguiente task sin verificación
4. **Mostrar evidencia** de cada test al usuario (comandos + output)
5. **Commits incrementales**: Solo TASK 2 crea commit
6. **Retry loop**: Si TASK 4 o 5 fallan → TASK 6 (max 3 retries)
7. **Safety check**: Si context usage >90% → avisar al usuario

**VERIFICACIÓN FINAL:**
Después de TASK 7, confirmar:
```bash
# 1. Deployment exitoso
curl -s https://muva.chat/api/health | jq '.status'
# Expected: "healthy"

# 2. PM2 online
ssh oneill@muva.chat "pm2 status muva-chat | grep online"

# 3. Report generado
cat docs/projects/primera-migracion-correcta/deployment-report.md
```

**SUCCESS CRITERIA:**
- ✅ Commit pushed to dev
- ✅ GitHub Actions completed successfully
- ✅ Health check returns 200 OK
- ✅ PM2 proceso "muva-chat" running
- ✅ Logs sin errores críticos
- ✅ Deployment report generado

¿Listo para empezar con TASK 1? 🚀
```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Rollback Automático

**GitHub Actions tiene rollback automático si:**
- Health check falla después de deployment
- Build falla
- SSH connection falla

**Manual Rollback (Emergency):**
```bash
ssh oneill@muva.chat "cd /var/www/muva-chat && git reset --hard HEAD~1 && npm ci --legacy-peer-deps && npm run build && pm2 reload muva-chat"
```

### Context Monitoring

**Thresholds:**
- 85% → Warning (considerar compactar)
- 90% → STOP, hacer `/clear` + resumen
- 95% → Force stop

### Retry Logic

**Max retries:** 3 attempts
**Escalation:** Después de 3 fallos, documentar y reportar al usuario

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Primera Migración Correcta

- [ ] TASK 1: Review & Stage Changes (15min)
  - [ ] git status --porcelain
  - [ ] git diff CLAUDE.md
  - [ ] git add (archivos apropiados)
  - [ ] TEST: Archivos staged correctamente

- [ ] TASK 2: Create Commit Post-Migration (10min)
  - [ ] Create commit con mensaje semántico
  - [ ] Verify commit
  - [ ] TEST: git log -1 muestra commit correcto
  - [ ] COMMIT: feat(migration): Primera migración correcta

- [ ] TASK 3: Push to Dev Branch (5min)
  - [ ] git branch --show-current (verify dev)
  - [ ] git push origin dev
  - [ ] TEST: No pending commits
  - [ ] VERIFICACIÓN: GitHub Actions triggered

- [ ] TASK 4: Monitor GitHub Actions (5min)
  - [ ] Get run ID
  - [ ] gh run watch
  - [ ] TEST: Status "success"
  - [ ] BRANCH: Success → TASK 5 / Failure → TASK 6

- [ ] TASK 5: Verify Deployment Success (10min)
  - [ ] Health check: https://muva.chat/api/health
  - [ ] Tenant check: simmerdown.muva.chat
  - [ ] PM2 status via SSH
  - [ ] Logs check
  - [ ] TEST: All checks pass
  - [ ] VERIFICACIÓN: ./scripts/verify-deployment.sh

- [ ] TASK 6: Debug & Retry Loop (60min buffer) [SKIP IF TASK 5 OK]
  - [ ] Analyze error logs
  - [ ] Identify root cause
  - [ ] Fix issue
  - [ ] Retry (return to TASK 4)
  - [ ] Max 3 retries

- [ ] TASK 7: Document & Report (15min)
  - [ ] Create deployment-report.md
  - [ ] Update deploy-agent snapshot si necesario
  - [ ] Report al usuario
  - [ ] TEST: Report file created

- [ ] VERIFICACIÓN FINAL
  - [ ] Health check: 200 OK
  - [ ] PM2 online
  - [ ] Report completo

**Total:** 7 tasks, ~2h (1h buffer), 1 commit
```

---

## 🔄 PLAN B (Escalation)

**Triggers para escalar a intervención manual:**

1. **Problemas Técnicos Persistentes:**
   - 3 retries fallidos
   - Error no identificable
   - Requiere cambios de arquitectura

2. **Context Issues:**
   - Usage llega a 90%
   - Script toma >3h de ejecución

3. **Infrastructure Issues:**
   - VPS no responde
   - GitHub Actions down
   - SSH key issues

**Acción:**
1. Documentar todos los errores en `errors.md`
2. Report completo al usuario con diagnóstico
3. Sugerir intervención manual o `/plan-project`

---

## 📊 SUCCESS METRICS

| Métrica | Target | Cómo Verificar |
|---------|--------|----------------|
| Deployment Time | <5min | GitHub Actions duration |
| Health Check | 200 OK | `curl https://muva.chat/api/health` |
| PM2 Status | online | `ssh muva.chat "pm2 status muva-chat"` |
| Logs | Sin errores críticos | `pm2 logs muva-chat --lines 50` |
| Tenant Access | 200 OK | `curl simmerdown.muva.chat/chat` |

---

**Última actualización:** 11 Octubre 2025
**Próximo paso:** Copy-paste PROMPT en nueva conversación con @agent-deploy-agent
**Tipo de script:** Deployment + Verification + Retry Loop
**Criticidad:** 🔴 ALTA (primer deployment post-rebrand)
