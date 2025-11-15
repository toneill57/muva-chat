# Workflow Express - Fix Health Check

**Proyecto:** Fix Health Check Endpoint
**Fecha:** 2025-10-10
**Estrategia:** Single Session con TodoList + Testing Incremental
**Tiempo Estimado:** 1.5h

---

## 🎯 OBJETIVO

Arreglar el endpoint /api/health que está retornando 500 en producción

**Problema Actual:**
- Health check falla con error de conexión a Supabase
- Producción retorna 500 error
- Monitoreo no puede verificar salud del sistema

**Estado Deseado:**
- ✅ Health check retorna 200 OK
- ✅ Incluye métricas de sistema (uptime, memory)
- ✅ Valida conexión a Supabase sin fallar

---

## 📊 ESTRATEGIA

**Hybrid Approach:**
- ✅ Single session (rápido, menos overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ Testing incremental (seguridad)
- ✅ Commits por categoría (rollback fácil)
- ⚠️ Escalate a Plan Formal si se complica

**Por qué Express Workflow:**
- Tarea bien definida y acotada (fix endpoint)
- Cambios específicos y testeables
- No requiere múltiples agentes
- Context usage manejable

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Fix Health Check Endpoint

OBJETIVO:
Arreglar /api/health que retorna 500 en producción

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- Producción ACTIVA en VPS (195.200.6.216)
- Error: Supabase connection timeout en health check
- NO romper producción

---

TASKS (Ejecutar en orden, con testing entre cada una):

## TASK 1: Fix Health Check Logic (45min) 🔴

**Archivos (1):**
1. src/app/api/health/route.ts
   - Remover validación de Supabase (causa timeout)
   - Agregar solo métricas de sistema (uptime, memory, timestamp)
   - ANTES: Valida conexión DB obligatoria
   - DESPUÉS: Health check básico sin dependencias externas

**TEST:**
- `curl http://localhost:3000/api/health`
- Verificar response 200 OK
- Verificar estructura JSON: `{"status":"ok","timestamp":"...","uptime":123}`

**COMMIT:** "fix(health): remove Supabase dependency from health check"

---

## TASK 2: Add Supabase Check Optional (30min) 🟡

**Archivos (1):**
1. src/app/api/health/route.ts
   - Agregar endpoint separado `/api/health/db` para check de DB
   - Mantener `/api/health` sin dependencias

**Código:**
```typescript
// /api/health → Basic system health (always fast)
// /api/health/db → Database health (can be slow)
```

**TEST:**
- `curl http://localhost:3000/api/health` → 200 OK (rápido)
- `curl http://localhost:3000/api/health/db` → 200 OK o 503 si DB falla

**COMMIT:** "feat(health): add optional database health check endpoint"

---

## TASK 3: Update Documentation (15min) 🟢

**Archivos (2):**
1. docs/DEVELOPMENT.md
   - Actualizar sección "Health Checks"
   - Documentar `/api/health` vs `/api/health/db`

2. docs/deployment/TROUBLESHOOTING.md
   - Agregar solución para "Health check 500 error"

**TEST:**
- Leer docs/DEVELOPMENT.md (verificar actualización)
- Leer docs/deployment/TROUBLESHOOTING.md (verificar nueva sección)

**COMMIT:** "docs: update health check documentation"

---

INSTRUCCIONES PARA CLAUDE:

1. **TodoWrite**: Crear todo list con estas 3 tasks
2. **Ejecutar en orden**: Task 1 → Test → Commit → Task 2 → ...
3. **NO avanzar** a siguiente task sin testing
4. **Mostrar evidencia** de cada test al usuario
5. **Commits incrementales**: Uno por task completado
6. **Safety check**: Si context usage >90% → avisar al usuario

**VERIFICACIÓN FINAL:**
Después de completar todas las tasks:
```bash
# Build check
npm run build

# Test health endpoint
curl http://localhost:3000/api/health | jq

# Test DB health endpoint
curl http://localhost:3000/api/health/db | jq

# Grep verification
grep -r "health" src/app/api/health/ --include="*.ts"
```

¿Listo para empezar con TASK 1?
```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Testing Obligatorio

**Después de cada TASK:**
```bash
# Build check
npm run build

# Test endpoint locally
curl http://localhost:3000/api/health

# Grep verification
grep -r "health" src/app/api/health/
```

### Commits Incrementales

**Mensaje format:**
```
{type}({scope}): {description}

TASK {N}: {Task name}
Files changed: {count}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Tipos:**
- `fix`: Bug fix (TASK 1)
- `feat`: New feature (TASK 2)
- `docs`: Documentation only (TASK 3)

### Context Monitoring

**Thresholds:**
- 85% → Warning (considerar compactar)
- 90% → STOP, hacer `/clear` + resumen
- 95% → Force stop

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Fix Health Check

- [ ] TASK 1: Fix Health Check Logic (45min)
  - [ ] src/app/api/health/route.ts
  - [ ] TEST: curl health endpoint
  - [ ] COMMIT: fix(health)

- [ ] TASK 2: Add DB Health Check (30min)
  - [ ] src/app/api/health/route.ts (add /db route)
  - [ ] TEST: curl both endpoints
  - [ ] COMMIT: feat(health)

- [ ] TASK 3: Update Documentation (15min)
  - [ ] docs/DEVELOPMENT.md
  - [ ] docs/deployment/TROUBLESHOOTING.md
  - [ ] TEST: Verify docs updated
  - [ ] COMMIT: docs

- [ ] VERIFICACIÓN FINAL
  - [ ] npm run build (success)
  - [ ] Health endpoint returns 200
  - [ ] DB health endpoint exists

**Total:** 3 tasks, ~1.5h, 3 commits
```

---

## 🔄 PLAN B (Escalation)

**Triggers para cambiar a Plan Formal:**

1. **Problemas Técnicos:**
   - Supabase connection issues más profundos
   - Requiere refactorizar arquitectura de health checks
   - Necesita agregar cache layer

2. **Context Issues:**
   - Usage llega a 90%
   - Necesitas `/clear` antes de terminar

3. **Scope Creep:**
   - Necesitas agregar health checks para otros servicios
   - Requiere dashboard de monitoreo
   - Integración con alerting system

**Acción:**
Usar `/plan-project` para crear plan formal completo

---

**Última actualización:** 2025-10-10
**Próximo paso:** Ejecutar PROMPT en nueva conversación con `/clear`
