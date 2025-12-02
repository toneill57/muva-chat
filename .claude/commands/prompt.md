# Prompt - Generador de Prompts End-to-End Ejecutables

**¿Qué hace este comando?**
Genera un **prompt ejecutable completo** para tareas end-to-end con workflow profesional por fases.

**Output:** Un prompt listo para copy-paste que ejecuta: Análisis → Implementación → Testing → Deploy

---

## WORKFLOW

### Step 1: Gather Context

Ask the user (máximo 3 preguntas):

1. **¿Qué necesitas hacer?** (descripción breve de la tarea)
2. **¿Cuál es el resultado esperado?** (cómo sabes que está completo)
3. **¿Hay restricciones?** (ambiente, no romper features, etc.)

**IMPORTANTE:**
- Hacer preguntas concisas
- No pedir detalles técnicos profundos
- El prompt generado hará el análisis profundo

### Step 2: Generate Executable Prompt

Based on user input, generate prompt with this exact structure:

```
TAREA: {Task description from user}

RESULTADO ESPERADO:
{Expected outcome from user}

RESTRICCIONES:
- Ambiente: STAGING (hoaiwcueleiemeplrurv)
- {User restrictions}
- NO romper funcionalidad existente
- Seguir CLAUDE.md guidelines

---

WORKFLOW PROFESIONAL (Ejecutar por fases):

## FASE 1: ANÁLISIS Y DIAGNÓSTICO (15-30min)

**Objetivo:** Entender el problema/tarea completamente antes de tocar código

**Acciones:**
1. Leer archivos relevantes identificados
2. Ejecutar queries de diagnóstico (staging DB)
3. Identificar root cause o componentes a modificar
4. Crear TodoList con tareas específicas basadas en hallazgos

**Output esperado:**
- TodoList con {3-8} tareas concretas
- Cada tarea: descripción + archivos + tiempo estimado
- Identificación clara de: qué cambiar, dónde, por qué

**NO AVANZAR** a Fase 2 sin TodoList claro

---

## FASE 2: IMPLEMENTACIÓN (30-90min)

**Objetivo:** Ejecutar cambios de manera incremental con validación

**Estrategia:**
- Ejecutar tareas en orden del TodoList
- Marcar cada tarea como in_progress → completed
- Logging temporal para debugging si es necesario
- NO hacer commits todavía (solo cambios en memoria)

**Por cada tarea:**
1. Marcar como in_progress
2. Hacer los cambios (Edit/Write)
3. Validar sintaxis si aplica (TypeScript, SQL, etc.)
4. Marcar como completed
5. Continuar siguiente tarea

**Output esperado:**
- Todos los cambios implementados
- TodoList 100% completed
- Código compila/valida sin errores

---

## FASE 3: TESTING Y VALIDACIÓN (15-30min)

**Objetivo:** Verificar que todo funciona antes de commit

**Tests obligatorios:**
1. **Build check:**
   ```bash
   pnpm run build
   ```

2. **Functionality check:**
   - Queries de verificación (staging DB)
   - Endpoint testing si aplica (curl/manual)
   - Verificar logs del servidor

3. **Data integrity:**
   - Query before/after comparisons
   - Contar registros afectados
   - Verificar no hay datos rotos

**Output esperado:**
- ✅ Build exitoso
- ✅ Funcionalidad verificada
- ✅ Data integrity confirmada
- Lista de evidencias mostradas al usuario

**SI FALLA:** Debug y fix antes de avanzar

---

## FASE 4: CLEANUP Y COMMIT (10-15min)

**Objetivo:** Limpiar código temporal y commitear

**Acciones:**
1. Remover console.log/debugging temporal
2. Verificar `git status` - listar archivos modificados
3. Pedir autorización al usuario para commit
4. Si autorizado: crear commit siguiendo convención

**Commit format:**
```
{type}({scope}): {description}

{Brief explanation}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Output esperado:**
- Código limpio (no debug statements)
- Commit creado (si autorizado)
- `git status` limpio

---

## FASE 5: DEPLOY Y VERIFICACIÓN (10-20min) [OPCIONAL]

**Objetivo:** Deploy a staging/producción y verificar

**Solo ejecutar si usuario lo solicita**

**Acciones:**
1. Pre-deploy checks (health, migrations, etc.)
2. Deploy via script apropiado
3. Post-deploy verification
4. Monitoring check

**Output esperado:**
- Deploy exitoso
- Servicio funcionando
- Evidencia de funcionalidad en ambiente remoto

---

INSTRUCCIONES ESPECÍFICAS PARA CLAUDE:

1. **Autonomía:** Ejecuta todas las fases sin pedir confirmación entre ellas, EXCEPTO antes de commit (Fase 4)

2. **TodoWrite:** Usar SIEMPRE en Fase 1 para tracking visual

3. **Staging First:** TODOS los cambios/queries van a staging (`hoaiwcueleiemeplrurv`) a menos que usuario especifique lo contrario

4. **Evidencia:** Mostrar output de queries, builds, tests - el usuario necesita ver que funciona

5. **Preguntas permitidas:**
   - Durante Fase 1: preguntas de análisis si necesitas clarificar
   - Durante Fase 3: si tests fallan, puedes preguntar cómo proceder
   - Antes de Fase 4: SIEMPRE pedir autorización para commit

6. **Stop conditions:**
   - Si tests fallan repetidamente en Fase 3 → reportar y pedir guía
   - Si encuentras blocker técnico → reportar y sugerir alternativas
   - Si context usage > 90% → avisar y sugerir continuar en nueva conversación

7. **Professional output:**
   - Reportes claros al finalizar cada fase
   - Evidencia concreta (no solo "funcionó")
   - Próximos pasos explícitos

---

🎯 OBJETIVO FINAL:
{Reiterate expected outcome from user}

¿LISTO PARA COMENZAR CON FASE 1: ANÁLISIS Y DIAGNÓSTICO?
```

### Step 3: Present Prompt to User

Show the generated prompt in a code block with copy instructions:

```
📋 PROMPT EJECUTABLE GENERADO

Instrucciones:
1. Copy el siguiente prompt COMPLETO (desde TAREA hasta el final)
2. Pégalo en nueva conversación (o continúa aquí)
3. Claude ejecutará las 5 fases automáticamente

---

[El prompt generado aquí]

---

✅ Este prompt incluye:
- 5 fases profesionales (Análisis → Implementación → Testing → Cleanup → Deploy)
- TodoList tracking automático
- Testing obligatorio antes de commit
- Evidencia de cada fase
- Stop conditions claras

💡 Puedes editar el prompt antes de ejecutarlo si necesitas ajustar algo
```

---

## RULES

### Prompt Generation
1. **Siempre incluir las 5 fases** (incluso si Deploy es opcional)
2. **Ambiente por defecto:** STAGING (`hoaiwcueleiemeplrurv`)
3. **Autonomía balanceada:** Ejecuta sin preguntar, pero pide autorización para commits
4. **Evidencia obligatoria:** Cada fase debe mostrar output concreto

### Question Limits
- **Máximo 3 preguntas** en Step 1
- **Preguntas simples:** Qué, Resultado esperado, Restricciones
- **NO pedir:** Detalles técnicos, archivos específicos, comandos - el prompt hará el análisis

### Workflow Clarity
- **Fases numeradas** (FASE 1, FASE 2, etc.)
- **Objetivo claro** por fase
- **Output esperado** explícito
- **Stop conditions** definidas

### Time Estimates
- Fase 1: 15-30min (análisis)
- Fase 2: 30-90min (implementación)
- Fase 3: 15-30min (testing)
- Fase 4: 10-15min (cleanup + commit)
- Fase 5: 10-20min (deploy - opcional)
- **Total:** 1-3 horas típicamente

---

## EXAMPLES

### Example 1: Bug Fix

**User input:**
- Tarea: "Fix reservation cards showing 'Sin nombre'"
- Resultado: "Cards show real accommodation names"
- Restricciones: "Don't break existing reservations"

**Generated prompt includes:**
- Fase 1: Diagnose why names are missing (DB queries, API inspection)
- Fase 2: Fix data mapping or sync logic
- Fase 3: Verify names appear correctly
- Fase 4: Remove debug logs, commit
- Fase 5: (Skip - local fix)

### Example 2: Feature Addition

**User input:**
- Tarea: "Add export to Excel button in reservations page"
- Resultado: "Users can download reservations as .xlsx"
- Restricciones: "Staging only, don't deploy"

**Generated prompt includes:**
- Fase 1: Research Excel export libraries, identify integration points
- Fase 2: Install lib, add button, implement export logic
- Fase 3: Test export with sample data
- Fase 4: Clean up, commit
- Fase 5: (Explicitly skipped per user request)

### Example 3: Data Migration

**User input:**
- Tarea: "Migrate old accommodation data to new schema"
- Resultado: "All data migrated, old table can be dropped"
- Restricciones: "Staging first, verify before production"

**Generated prompt includes:**
- Fase 1: Compare schemas, count records, plan migration SQL
- Fase 2: Write migration script, execute in staging
- Fase 3: Verify data integrity, compare counts
- Fase 4: Commit migration script
- Fase 5: (Optional) Deploy to production after verification

---

## WHEN TO USE THIS COMMAND

✅ **Use `/prompt` for:**
- End-to-end tasks (bug fixes, features, migrations)
- Tasks needing professional workflow (testing, deploy)
- When you want autonomous execution with checkpoints
- Tasks that span multiple components

❌ **DON'T use `/prompt` for:**
- Quick questions (use normal conversation)
- Just analysis/research (no implementation)
- When you need interactive planning (use `/plan-project`)

---

**Última actualización:** 2025-11-08
