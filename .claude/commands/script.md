# Script - Generador de Scripts Ejecutables

**¿Qué hace este comando?**
Genera un **script ejecutable** (documento .md con prompt copy-paste) para tareas enfocadas de 1-3 horas.

**Analogía:** Como crear un script `.sh` de bash:
1. Ejecutas `/script` → genera el archivo con el "código"
2. Revisas el script generado
3. Copy-paste el prompt (entre ⬇️ y ⬆️) → ejecuta TODO

**Output:** `docs/projects/{nombre}/workflow-express.md` con prompt listo para ejecutar

---

**Usa este comando cuando:**
- Tarea bien definida y específica
- Alcance de 1-3 horas máximo
- No requiere coordinación multi-agente
- Quieres ejecución rápida sin planning extenso

**NO uses este comando cuando:**
- Proyecto necesita >3 horas
- Requiere múltiples agentes especializados
- Implementación multi-fase compleja
- Usa `/plan-project` en su lugar

---

## WORKFLOW

### Step 1: Gather Information

Ask the user:
1. **Project Name:** What should this workflow be called? (e.g., "cleanup-legacy-refs", "fix-auth-bug")
2. **Objective:** What's the goal in 1-2 sentences?
3. **Scope:** How many tasks? (Recommend 3-5 max)
4. **Time Estimate:** Total time? (e.g., "2h")
5. **Current State:** What exists now?
6. **Desired State:** What should exist after?

### Step 2: Generate Script File

Create `docs/projects/{project-name}/workflow-express.md` (script ejecutable) with this structure:

```markdown
# Script Ejecutable - {Project Name}

**Proyecto:** {Project Name}
**Fecha:** {Current Date}
**Tipo:** Script Copy-Paste (Single Session)
**Estrategia:** TodoList + Testing Incremental
**Tiempo Estimado:** {Time}

---

## 🎯 OBJETIVO

{Objective from user}

**Problema Actual:**
- {Current state point 1}
- {Current state point 2}

**Estado Deseado:**
- ✅ {Desired outcome 1}
- ✅ {Desired outcome 2}

---

## 📊 ESTRATEGIA

**Hybrid Approach:**
- ✅ Single session (rápido, menos overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ Testing incremental (seguridad)
- ✅ Commits por categoría (rollback fácil)
- ⚠️ Escalate a Plan Formal si se complica

**Por qué Script Copy-Paste:**
- Tarea bien definida y acotada
- Cambios específicos y testeables
- No requiere múltiples agentes
- Context usage manejable
- Ejecución inmediata con un copy-paste

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

\```
PROYECTO: {Project Name}

OBJETIVO:
{One-line objective}

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- {Additional context from user}
- NO romper producción

---

TASKS (Ejecutar en orden, con testing entre cada una):

## TASK 1: {Task Name} ({Time}min) {🔴|🟡|🟢}

**Archivos ({count}):**
1. {file_path}:{line_number}
   - {Change description}
   - ANTES: {old_value}
   - DESPUÉS: {new_value}

**TEST:**
- {Test command or verification step}
- {Expected result}

**COMMIT:** "{type}({scope}): {message}"

---

## TASK 2: {Task Name} ({Time}min) {🔴|🟡|🟢}

**Archivos ({count}):**
{Repeat structure}

**TEST:**
{Test steps}

**COMMIT:** "{type}({scope}): {message}"

---

{Repeat for all tasks...}

---

INSTRUCCIONES PARA CLAUDE:

1. **TodoWrite**: Crear todo list con estas tasks
2. **Ejecutar en orden**: Task 1 → Test → Commit → Task 2 → ...
3. **NO avanzar** a siguiente task sin testing
4. **Mostrar evidencia** de cada test al usuario
5. **Commits incrementales**: Uno por task completado
6. **Safety check**: Si context usage >90% → avisar al usuario

**VERIFICACIÓN FINAL:**
Después de completar todas las tasks:
\```bash
{Final verification commands}
\```

¿Listo para empezar con TASK 1?
\```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Testing Obligatorio

**Después de cada TASK:**
```bash
# Build check (si aplica)
pnpm run build

# Linter check (si aplica)
pnpm run lint

# Test suite (si aplica)
pnpm test

# Grep verification (para cleanups)
grep -ri "{pattern}" . --exclude-dir=node_modules
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
- `fix`: Bug fix
- `feat`: New feature
- `refactor`: Code restructuring
- `docs`: Documentation only
- `chore`: Maintenance tasks

### Context Monitoring

**Thresholds:**
- 85% → Warning (considerar compactar)
- 90% → STOP, hacer `/clear` + resumen
- 95% → Force stop

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - {Project Name}

- [ ] TASK 1: {Name} ({Time}min)
  - [ ] {File 1}
  - [ ] {File 2}
  - [ ] TEST: {Test description}
  - [ ] COMMIT: {type}({scope})

- [ ] TASK 2: {Name} ({Time}min)
  - [ ] {File 1}
  - [ ] TEST: {Test description}
  - [ ] COMMIT: {type}({scope})

{Repeat for all tasks...}

- [ ] VERIFICACIÓN FINAL
  - [ ] {Verification 1}
  - [ ] {Verification 2}
  - [ ] Build exitoso

**Total:** {N} tasks, ~{Time}, {N} commits
```

---

## 🔄 PLAN B (Escalation)

**Triggers para cambiar a Plan Formal:**

1. **Problemas Técnicos:**
   - Test falla repetidamente
   - Cambios más complejos de lo esperado
   - Requiere modificar arquitectura

2. **Context Issues:**
   - Usage llega a 90%
   - Necesitas `/clear` antes de terminar

3. **Scope Creep:**
   - Tasks originales crecen a >5
   - Tiempo estimado duplica lo planeado
   - Requiere coordinar múltiples agentes

**Acción:**
Usar `/plan-project` para crear plan formal completo

---

**Última actualización:** {Date}
**Próximo paso:** Ejecutar PROMPT en nueva conversación con `/clear`
```

### Step 3: Confirm with User

Show summary:
```
✅ Script ejecutable generado:
   - 📄 Archivo: docs/projects/{project-name}/workflow-express.md
   - 📋 Tasks: {N}
   - ⏱️ Tiempo estimado: {Time}
   - 💾 Commits: {N}

🚀 Cómo ejecutar este script:
   1. Revisa el archivo generado
   2. Ajusta detalles de cada TASK si necesario
   3. Haz /clear en nueva conversación
   4. Copy-paste el PROMPT EJECUTABLE (entre ⬇️ y ⬆️)
   5. El script se ejecutará automáticamente con testing incremental

💡 Analogía: Como un script .sh de bash
   - El archivo .md contiene el "código" (prompt)
   - Copy-paste = ejecutar el script
   - Todo funciona automáticamente

🎯 Este script está optimizado para:
   - Ejecución inmediata (single session)
   - Sin overhead de planning
   - Testing incremental
   - Commits granulares
```

---

## RULES

### File Naming
- Always: `docs/projects/{project-name}/workflow-express.md`
- Use kebab-case for project names
- Keep descriptive (e.g., "cleanup-innpilot-refs", "fix-auth-redirect")

### Task Granularity
- Minimum: 2 tasks
- Maximum: 5 tasks (if more → suggest `/plan-project`)
- Each task: 15-45min
- Total: 1-3 hours max

### Prompt Structure
- Always include delimiters: "PROMPT COMIENZA AQUÍ ⬇️" / "PROMPT TERMINA AQUÍ ⬆️"
- Self-contained (no external file dependencies)
- Testing after each task
- Commit after each task
- Final verification included

### Priority Emojis
- 🔴 CRÍTICO: Must work or production breaks
- 🟡 IMPORTANTE: Core functionality
- 🟢 NICE-TO-HAVE: Polish, documentation, cleanup

---

## EXAMPLES

### Example 1: Bug Fix (1h)

**User:** "Fix authentication redirect bug - users land on /404 after login"

**Script Generado:**
- TASK 1: Fix redirect logic in auth middleware (30min) 🔴
- TASK 2: Update auth tests (20min) 🟡
- TASK 3: Document fix in TROUBLESHOOTING.md (10min) 🟢

**Ejecución:** Copy-paste prompt → 3 tasks ejecutadas con testing

### Example 2: Cleanup (2h)

**User:** "Remove all 'innpilot' references from codebase"

**Script Generado:**
- TASK 1: Update TypeScript files (30min) 🔴
- TASK 2: Update NGINX config (15min) 🟡
- TASK 3: Update deployment scripts (15min) 🟡
- TASK 4: Cleanup documentation (45min) 🟢
- TASK 5: Final verification + build (15min) 🔴

**Ejecución:** Copy-paste prompt → 5 tasks ejecutadas automáticamente

### Example 3: Feature Addition (2.5h)

**User:** "Add rate limiting to /api/chat endpoint"

**Script Generado:**
- TASK 1: Install + configure rate limiter (30min) 🔴
- TASK 2: Add rate limit middleware (45min) 🔴
- TASK 3: Add tests for rate limiting (45min) 🟡
- TASK 4: Document rate limit in API docs (30min) 🟢

**Ejecución:** Copy-paste prompt → Feature completa con tests

---

## TROUBLESHOOTING

### If task scope is too large
**Response:** "This seems like a >3h task. I recommend using `/plan-project` for proper multi-phase planning. Or, can we break this into smaller focused tasks?"

### If user wants multiple agents
**Response:** "Este script es para tareas single-agent. Para coordinación multi-agente, usa `/plan-project` que incluye agent snapshots y workflow prompts."

### If context usage is high
**Response:** "Warning: Este script podría consumir >85% del context. Considera usar `/plan-project` con ejecución por fases en su lugar."
