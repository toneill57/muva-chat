# Workflow Híbrido - Limpieza Referencias MUVA Chat

**Proyecto:** Eliminar referencias legacy "MUVA Chat" del codebase
**Fecha:** 2025-10-10
**Estrategia:** Opción C (Single Session con TodoList + Safety Protocol)
**Tiempo Estimado:** 1.5-2h

---

## 🎯 OBJETIVO

Eliminar TODAS las referencias "MUVA Chat" del proyecto, dejando solo "MUVA Chat".

**Problema Actual:**
- Codebase tiene 200+ menciones "innpilot" (archivos, paths, código TypeScript)
- GitHub Actions deployment FALLA porque usa paths `/var/www/muva-chat` (incorrectos)
- Código TypeScript soporta `muva.chat` (dominio legacy que queremos descontinuar)
- Documentación inconsistente (mezcla MUVA Chat/MUVA)

**Estado Deseado:**
- ✅ GitHub Actions funciona con paths `/var/www/muva-chat`
- ✅ Código solo soporta `muva.chat` (eliminar muva.chat)
- ✅ Nginx redirige `*.muva.chat` → `*.muva.chat` (sin romper subdominios existentes)
- ✅ Documentación consistente (solo MUVA Chat)

---

## 📊 ESTRATEGIA (Opción C)

**Hybrid Approach:**
- ✅ Single session (rápido, menos overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ Testing incremental (seguridad)
- ✅ Commits por categoría (rollback fácil)
- ⚠️ Escalate a Plan Formal si se complica

**Por qué no Plan Formal:**
- Análisis exhaustivo YA está hecho
- Cambios son mayormente buscar-reemplazar
- Context usage (78%) es alto pero manejable

**Por qué no Single Session "YOLO":**
- Necesitamos testing entre cambios
- Hay producción activa (no podemos romperla)
- Context podría llegar a límite

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Limpieza Referencias MUVA Chat → MUVA Chat

OBJETIVO:
Eliminar TODAS las referencias "MUVA Chat" del codebase MUVA Chat de manera segura, con testing incremental y commits por categoría.

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- Producción ACTIVA en VPS (195.200.6.216)
- GitHub Actions deployment FALLA (usa paths incorrectos)
- Necesitamos: Testing + Commits incrementales
- NO romper producción

ANÁLISIS PREVIO COMPLETO:
Ver archivo: docs/projects/innpilot-cleanup/workflow-hibrido-migracion.md

---

TASKS (Ejecutar en orden, con testing entre cada una):

## TASK 1: CRÍTICO - GitHub Actions (30min) 🔴

**Archivos (3):**
1. docs/deployment/ecosystem.config.cjs:6
   - `cwd: '/var/www/muva-chat'` → `cwd: '/var/www/muva-chat'`

2. docs/deployment/GITHUB_SECRETS.md
   - Línea 7: URL repo → `https://github.com/toneill57/muva-chat`
   - Línea 61: `VPS_APP_PATH` → `/var/www/muva-chat`

3. **Usuario manual:** GitHub Secret
   - Settings → Secrets → Actions → `VPS_APP_PATH`
   - Cambiar: `/var/www/muva-chat` → `/var/www/muva-chat`

**TEST:**
- Leer ecosystem.config.cjs línea 6 (verificar path correcto)
- Leer GITHUB_SECRETS.md líneas 7 y 61 (verificar docs actualizados)
- Usuario verifica GitHub Secret (manual)

**COMMIT:** "fix(deploy): update paths from innpilot to muva-chat"

---

## TASK 2: CÓDIGO - TypeScript Files (30min) 🟡

**Archivos (5):**

1. **next.config.ts (líneas 58, 69)**
   - Regex: `innpilot\\.io` → ELIMINAR
   - ANTES: `(localhost|innpilot\\.io|muva\\.chat)`
   - DESPUÉS: `(localhost|muva\\.chat)`

2. **src/lib/tenant-utils.ts**
   - Línea 44-60: Eliminar bloque `if (host.endsWith('.muva.chat'))`
   - Línea 14-17: Actualizar comentarios (quitar ejemplos muva.chat)
   - Línea 24-27: Actualizar JSDoc examples (quitar muva.chat)
   - Línea 63: Actualizar comentario final

3. **src/lib/claude.ts (líneas 54, 76)**
   - System prompts: "MUVA Chat" → "MUVA Chat"

4. **src/hooks/useChatState.tsx (línea 23)**
   - `STORAGE_KEY = 'innpilot_chat_state'` → `'muva_chat_state'`
   - ⚠️ NOTA: Esto borrará localStorage existente

5. **package-lock.json (líneas 2, 8)**
   - `"name": "innpilot"` → `"name": "muva-chat"`

**TEST:**
- Leer cada archivo modificado (verificar cambios)
- Ejecutar: `npm run build` (verificar que compila sin errores)
- Verificar en browser: localStorage usa nueva key

**COMMIT:** "refactor: remove muva.chat support, use muva.chat only"

---

## TASK 3: NGINX - Redirect Config (15min) 🟢

**Archivo (1):**
- docs/deployment/nginx-subdomain.conf

**Cambios:**
- Línea 2: "MUVA Chat + MUVA.chat" → "MUVA Chat (with muva.chat redirect)"
- Líneas 5-67: MODIFICAR bloque muva.chat (NO eliminar)
  - Agregar redirect 301 en location /
  - Redirigir `*.muva.chat` → `*.muva.chat`

**Código sugerido:**
```nginx
# HTTPS server block - Redirect muva.chat to muva.chat
server {
    listen 443 ssl http2;
    server_name *.muva.chat muva.chat;

    # SSL Configuration (mantener certificado existente)
    ssl_certificate /etc/letsencrypt/live/muva.chat-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/muva.chat-0001/privkey.pem;

    # Extract subdomain
    set $subdomain "";
    if ($host ~* ^([^.]+)\.innpilot\.io$) {
        set $subdomain $1;
    }

    # Redirect to muva.chat preserving subdomain
    location / {
        if ($subdomain != "") {
            return 301 https://$subdomain.muva.chat$request_uri;
        }
        return 301 https://muva.chat$request_uri;
    }
}
```

**TEST:**
- Leer nginx-subdomain.conf (verificar redirect está correcto)
- Syntax check: `sudo nginx -t` (en VPS, post-deploy)

**COMMIT:** "feat(nginx): redirect muva.chat to muva.chat"

---

## TASK 4: SCRIPTS - Deployment Scripts (15min) 🟢

**Archivos (7):**
1. scripts/verify-deployment.sh
   - Línea 16: `DOMAIN="muva.chat"` → `DOMAIN="muva.chat"`
   - Línea 159: `pm2 status muva-chat` → `pm2 status muva-chat`

2. docs/deployment/nginx-innpilot.conf
   - Agregar nota al inicio: "⚠️ DEPRECATED - Use nginx-subdomain.conf"
   - O ELIMINAR archivo (más limpio)

3. Otros scripts con refs `/var/www/muva-chat`:
   - Buscar con: `grep -r "/var/www/muva-chat" scripts/`
   - Reemplazar: `/var/www/muva-chat` → `/var/www/muva-chat`

**TEST:**
- Ejecutar: `bash scripts/verify-deployment.sh --dry-run` (si existe flag)
- Leer cada script modificado (verificar cambios)

**COMMIT:** "chore: update deployment scripts for muva-chat"

---

## TASK 5: DOCS - Documentation Cleanup (45min) 📚

**Archivos (50+):**

**Estrategia:** Buscar-reemplazar batch en categorías

**Categorías:**
1. **Deployment docs** (15 archivos en `docs/deployment/`)
   - Buscar: `/var/www/muva-chat` → `/var/www/muva-chat`
   - Buscar: `pm2.*innpilot` → `pm2 ... muva-chat`

2. **Feature docs** (30 archivos en `docs/tenant-subdomain-chat/`, etc.)
   - Buscar: `simmerdown.muva.chat` → `simmerdown.muva.chat`
   - Buscar: "MUVA Chat" → "MUVA Chat" (texto descriptivo)

3. **Snapshots** (10 archivos en `snapshots/`)
   - Buscar: "MUVA Chat" → "MUVA Chat"
   - Buscar: `muva.chat` → `muva.chat`

4. **Root docs** (README.md, SNAPSHOT.md, VPS_MIGRATION_INSTRUCTIONS.md)
   - Manual review (cambios más críticos)

**ELIMINACIONES:**
- `docs/projects/innpilot-to-muva-rebrand/` → Proyecto completado, puede eliminar carpeta

**TEST:**
- Verificar: `grep -ri "innpilot" docs/ | wc -l` (debería ser ~0 o muy bajo)
- Verificar: `grep -ri "/var/www/muva-chat" . | wc -l` (debería ser ~0)

**COMMIT:** "docs: complete innpilot to muva-chat migration"

---

INSTRUCCIONES PARA CLAUDE:

1. **TodoWrite**: Crear todo list con estas 5 tasks
2. **Ejecutar en orden**: Task 1 → Test → Commit → Task 2 → ...
3. **NO avanzar** a siguiente task sin testing
4. **Mostrar evidencia** de cada test al usuario
5. **Commits incrementales**: Uno por task completado
6. **Safety check**: Si context usage >90% → avisar al usuario
7. **Escalate**: Si encuentras problemas inesperados → sugerir Plan Formal

**VERIFICACIÓN FINAL:**
Después de TASK 5, ejecutar:
```bash
# Verificar refs innpilot eliminadas
grep -ri "innpilot" . --exclude-dir=node_modules --exclude-dir=.next | wc -l

# Verificar path viejo eliminado
grep -r "/var/www/muva-chat" . --exclude-dir=node_modules | wc -l

# Build exitoso
npm run build
```

¿Listo para empezar con TASK 1?
```

### PROMPT TERMINA AQUÍ ⬆️

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Limpieza MUVA Chat

- [ ] TASK 1: CRÍTICO - GitHub Actions (30min)
  - [ ] ecosystem.config.cjs
  - [ ] GITHUB_SECRETS.md
  - [ ] GitHub Secret (usuario manual)
  - [ ] TEST: Verificar archivos + secret
  - [ ] COMMIT: fix(deploy)

- [ ] TASK 2: CÓDIGO - TypeScript (30min)
  - [ ] next.config.ts
  - [ ] src/lib/tenant-utils.ts
  - [ ] src/lib/claude.ts
  - [ ] src/hooks/useChatState.tsx
  - [ ] package-lock.json
  - [ ] TEST: npm run build
  - [ ] COMMIT: refactor

- [ ] TASK 3: NGINX - Redirect (15min)
  - [ ] nginx-subdomain.conf (modificar, no eliminar)
  - [ ] TEST: Verificar syntax
  - [ ] COMMIT: feat(nginx)

- [ ] TASK 4: SCRIPTS - Deployment (15min)
  - [ ] verify-deployment.sh
  - [ ] nginx-innpilot.conf (deprecate o eliminar)
  - [ ] Otros scripts batch
  - [ ] TEST: Dry-run scripts
  - [ ] COMMIT: chore

- [ ] TASK 5: DOCS - Cleanup (45min)
  - [ ] docs/deployment/ (15 files)
  - [ ] docs/tenant-subdomain-chat/ (30 files)
  - [ ] snapshots/ (10 files)
  - [ ] Root docs (README, SNAPSHOT, etc.)
  - [ ] TEST: grep counts
  - [ ] COMMIT: docs

**Total:** 5 tasks, ~2h, 5 commits
```

---

## 🛡️ SAFETY PROTOCOL

### Testing Obligatorio

**Después de cada TASK:**
```bash
# TASK 1-2: Build check
npm run build

# TASK 3: Nginx syntax (en VPS)
sudo nginx -t

# TASK 4: Script validation
bash scripts/verify-deployment.sh --help

# TASK 5: Grep verification
grep -ri "innpilot" docs/ | wc -l
```

### Commits Incrementales

**Mensaje format:**
```
{type}({scope}): {description}

TASK {N}: {Task name}
Files changed: {count}
```

**Beneficio:** Si algo falla, rollback es fácil (`git reset HEAD~1`)

### Context Monitoring

**Current:** 78% (156k/200k)

**Thresholds:**
- 85% → Warning (considerar compactar)
- 90% → STOP, hacer `/clear` + resumen
- 95% → Force stop

---

## 🔄 PLAN B (Escalation)

**Triggers para cambiar a Plan Formal:**

1. **Problemas Técnicos:**
   - Test falla en TASK 1-2 (críticos)
   - Nginx syntax error (TASK 3)
   - npm build error (TASK 2)

2. **Context Issues:**
   - Usage llega a 90%
   - Necesitas `/clear` antes de TASK 5

3. **Time Issues:**
   - Necesitas pausar >24h entre tasks
   - Session interrumpida por otro proyecto

**Acción:**
1. Crear `docs/projects/innpilot-cleanup/plan.md`
2. Crear `docs/projects/innpilot-cleanup/TODO.md`
3. Crear `docs/projects/innpilot-cleanup/workflow.md`
4. Documentar progreso actual en `docs/projects/innpilot-cleanup/fase-1/PROGRESS.md`

---

## 🧪 VERIFICACIÓN POST-CAMBIOS

### Quick Checks

```bash
# 1. Referencias innpilot (debe ser ~0)
grep -ri "innpilot" . --exclude-dir=node_modules --exclude-dir=.next | wc -l

# 2. Path viejo (debe ser 0)
grep -r "/var/www/muva-chat" . --exclude-dir=node_modules | wc -l

# 3. Build exitoso
npm run build

# 4. Package.json correcto
cat package.json | grep '"name"'
```

### Production Validation

**En VPS (post-deploy):**
```bash
# 1. PM2 status
pm2 status muva-chat

# 2. Nginx config
sudo nginx -t

# 3. Health check
curl https://muva.chat/api/health

# 4. Subdomain test
curl https://simmerdown.muva.chat/chat
```

---

## 📊 MÉTRICAS DE ÉXITO

**Funcionalidad:**
- [ ] GitHub Actions deployment funciona
- [ ] Código compila sin errores
- [ ] Nginx redirige muva.chat → muva.chat
- [ ] Subdominios existentes funcionan
- [ ] Health checks pasan

**Limpieza:**
- [ ] Refs "innpilot" < 5 (solo en docs históricos archivados)
- [ ] Refs "/var/www/muva-chat" = 0
- [ ] Package.json name = "muva-chat"
- [ ] localStorage usa nueva key

**Performance:**
- [ ] Build time sin cambios significativos
- [ ] Context usage < 85% al finalizar
- [ ] 5 commits limpios en git history

---

## 📝 NOTAS

### Qué NO cambiar

- `src/lib/integrations/motopress/client.ts:66` - User-Agent puede quedar
- `src/lib/staff-auth.ts:41` - JWT secret default (no afecta)
- `docs/archive/*` - Preservar historia (no modificar)

### Rollback Emergency

**Si algo crítico falla:**
```bash
# Rollback último commit
git reset --hard HEAD~1

# O rollback a commit específico
git log --oneline | head -5
git reset --hard {commit-hash}

# Force push si ya subiste
git push origin dev --force
```

---

**Última actualización:** 2025-10-10
**Próximo paso:** Ejecutar PROMPT en nueva conversación con `/clear`
