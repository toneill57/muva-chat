# TEST-FIRST EXECUTION POLICY

**Status:** MANDATORY - All agents must follow this policy
**Last Updated:** October 9, 2025
**Applies To:** All specialized agents, all project phases, all task executions

---

## 🚨 REGLA CRÍTICA: NO Marcar Tareas Como Completadas Sin Validación

**PROHIBIDO:**
- ❌ Reportar tarea completada sin ejecutar tests
- ❌ Marcar [x] en TODO.md sin mostrar evidencia al usuario
- ❌ Confiar en reportes de agentes sin verificación
- ❌ Ejecutar operaciones en "black box" sin transparencia
- ❌ Asumir que algo funcionó sin probarlo

**OBLIGATORIO:**
- ✅ Ejecutar TODOS los tests especificados antes de marcar completo
- ✅ Mostrar salida de herramientas MCP al usuario
- ✅ Solicitar aprobación del usuario antes de marcar [x]
- ✅ Documentar evidencia en sección **COMPLETADO:**
- ✅ Si test falla, reportar falla inmediatamente

---

## Workflow Mandatorio

### PASO 1: Antes de Ejecutar
```markdown
**Agent to Invoke:** @agent-nombre-especifico
**Tools Required:** mcp__tool_name, other_tool
**Expected Output:** Description of what success looks like
```

### PASO 2: Durante Ejecución
```markdown
VALIDATION (MUST EXECUTE BEFORE MARKING COMPLETE):

**Test 1: [Nombre Descriptivo]**
EXECUTE: mcp__tool_name(parameters)
VERIFY: ✅ Expected result A
VERIFY: ✅ Expected result B
SHOW: Output to user for approval

**Test 2: [Nombre Descriptivo]**
EXECUTE: different_tool(parameters)
VERIFY: ✅ Expected result C
SHOW: Output to user for approval
```

### PASO 3: Después de Ejecución
```markdown
**COMPLETADO:** [DATE] - [AGENT_NAME]

**Evidence:**
- Test 1: ✅ Passed - [Brief result summary]
  ```
  [Actual tool output shown to user]
  ```
- Test 2: ✅ Passed - [Brief result summary]
  ```
  [Actual tool output shown to user]
  ```

**User Approval:** [Timestamp or "Awaiting approval"]
```

---

## Transparencia Requerida

### 1. **Mostrar Salida de Herramientas MCP**

Cuando ejecutas herramientas MCP, SIEMPRE muestra la salida al usuario:

**MAL (Black Box):**
```markdown
✅ Knowledge Graph configurado correctamente
✅ 10 entidades creadas
```

**BIEN (Transparente):**
```markdown
**Test 1: Verify Knowledge Graph Entities**
EXECUTED: mcp__knowledge-graph__aim_read_graph()

**Output:**
```json
{
  "entities": [
    {"name": "properties", "entityType": "database_table"},
    {"name": "accommodation_units", "entityType": "database_table"},
    // ... 8 more entities
  ]
}
```

VERIFY: ✅ 10 entities exist
VERIFY: ✅ Entity types are correct
```

### 2. **No Confiar en Reportes de Agentes Sin Verificación**

**MAL:**
```markdown
@agent-infrastructure-monitor reportó éxito.
✅ FASE 5 completada.
```

**BIEN:**
```markdown
@agent-infrastructure-monitor reportó éxito.

**Verification Required - Executing Tests:**

**Test 1: Verify Context7 Access**
EXECUTE: mcp__context7__get-library-docs("/vercel/next.js", "app router")
```
[Shows actual output]
```

VERIFY: ✅ Returns 10+ snippets
VERIFY: ✅ Trust Score 10/10

**User Approval Needed:** Can I mark FASE 5 as complete?
```

### 3. **Solicitar Aprobación Explícita**

Antes de marcar [x] en TODO.md:

```markdown
**All tests passed. Evidence shown above.**

**Request:** May I mark task [X.Y] as complete in TODO.md?
**Awaiting:** User approval
```

---

## Formato de Tests por Tipo de Herramienta

### Knowledge Graph MCP
```markdown
**Test: Verify Entity Creation**
EXECUTE: mcp__knowledge-graph__aim_read_graph()
VERIFY: ✅ Contains expected entities
VERIFY: ✅ Relations are correct
SHOW: Full JSON output to user
```

### Memory Keeper MCP
```markdown
**Test: Verify Persistent Memories**
EXECUTE: mcp__memory-keeper__read_graph()
VERIFY: ✅ 5 memories exist
VERIFY: ✅ Correct entityTypes and observations
SHOW: Full memory list to user
```

### Context7 MCP
```markdown
**Test: Verify Documentation Access**
EXECUTE: mcp__context7__get-library-docs("/vercel/next.js", "topic")
VERIFY: ✅ Returns 10+ code snippets
VERIFY: ✅ Trust Score 8-10/10
VERIFY: ✅ Up-to-date (2024-2025)
SHOW: Snippet count and sample to user
```

### Supabase MCP
```markdown
**Test: Verify RPC Function**
EXECUTE: mcp__supabase__execute_sql("SELECT * FROM rpc_function()")
VERIFY: ✅ Returns expected data structure
VERIFY: ✅ No errors
SHOW: Query result to user
```

### Claude Context MCP
```markdown
**Test: Verify Semantic Search**
EXECUTE: mcp__claude-context__search_code(query, path)
VERIFY: ✅ Returns relevant results
VERIFY: ✅ Context is accurate
SHOW: Search results to user
```

---

## Manejo de Fallos

### Si Test Falla

**INMEDIATAMENTE:**
1. Reportar fallo al usuario
2. Mostrar error completo
3. NO marcar tarea como completada
4. Proponer solución
5. Esperar aprobación de usuario

**Ejemplo:**
```markdown
**Test 1: Verify Knowledge Graph** ❌ FAILED

**Error:**
```
Error: Entity "properties" not found in graph
```

**Root Cause:** Entity was not created in previous step

**Proposed Fix:** Re-execute entity creation with correct parameters

**Request:** Should I proceed with the fix?
```

### Si Herramienta No Responde

```markdown
**Test 1: Verify MCP Server** ⚠️ NO RESPONSE

**Issue:** mcp__knowledge-graph__aim_read_graph() returned no data

**Diagnosis Steps:**
1. Check if MCP server is connected: /mcp
2. Verify server configuration in .mcp.json
3. Test with simpler query

**Request:** User, can you run /mcp to verify server status?
```

---

## Actualización de TODO.md

### Formato ANTES de marcar [x]

```markdown
### X.Y Task Name
- [ ] Task description (estimate: Xh)

  **VALIDATION (MUST EXECUTE):**

  **Test 1:** Description
  EXECUTE: tool_name()
  VERIFY: Expected result

  **Test 2:** Description
  EXECUTE: tool_name()
  VERIFY: Expected result
```

### Formato DESPUÉS de marcar [x]

```markdown
### X.Y Task Name
- [x] Task description (estimate: Xh)

  **COMPLETADO:** 2025-10-09 - @agent-name

  **Evidence:**
  - Test 1: ✅ Passed - Result summary
  - Test 2: ✅ Passed - Result summary

  **User Approval:** 2025-10-09 15:30
```

---

## Responsabilidades por Rol

### Claude Code (Main Agent)
- ✅ Invocar agente correcto según especificación
- ✅ Verificar salida de agentes con tests
- ✅ Mostrar evidencia al usuario
- ✅ Solicitar aprobación antes de marcar [x]
- ✅ Documentar evidencia en TODO.md

### Specialized Agents
- ✅ Ejecutar tests ANTES de reportar éxito
- ✅ Incluir salida de herramientas en reporte
- ✅ Reportar fallos inmediatamente
- ✅ NO reportar "✅ Success" sin evidencia

### Usuario
- ✅ Revisar evidencia presentada
- ✅ Aprobar o rechazar completado de tarea
- ✅ Reportar si algo parece incorrecto

---

## Ejemplos Completos

### Ejemplo 1: FASE 3 - Knowledge Graph Setup

**CORRECTO:**
```markdown
Invoking @agent-infrastructure-monitor for Knowledge Graph setup...

Agent completed. Now executing validation tests:

**Test 1: Verify 10 Entities Created**
EXECUTE: mcp__knowledge-graph__aim_read_graph()

**Output:**
{
  "entities": [
    {"name": "properties", "entityType": "database_table"},
    {"name": "accommodation_units", "entityType": "database_table"},
    {"name": "guests", "entityType": "database_table"},
    {"name": "guest_reservations", "entityType": "database_table"},
    {"name": "compliance_submissions", "entityType": "database_table"},
    {"name": "chat_sessions", "entityType": "database_table"},
    {"name": "premium_chat", "entityType": "feature"},
    {"name": "matryoshka_embeddings", "entityType": "system"},
    {"name": "sire_integration", "entityType": "integration"},
    {"name": "muva_tourism", "entityType": "integration"}
  ],
  "relations": [...8 relations...]
}

VERIFY: ✅ 10 entities exist
VERIFY: ✅ All expected entity types present

**Test 2: Verify Relations**
VERIFY: ✅ 8 relations created
VERIFY: ✅ Relations connect correct entities

**Request:** All tests passed. May I mark FASE 3.1 as complete?
```

**INCORRECTO:**
```markdown
@agent-infrastructure-monitor completed Knowledge Graph setup.
✅ 10 entities created
✅ 8 relations created
✅ FASE 3.1 complete

[Marked [x] in TODO.md without showing evidence or asking approval]
```

---

## Enforcement

Este policy es **MANDATORY** y se aplica a:
- ✅ Todas las FASES del proyecto MCP Optimization + SIRE Compliance
- ✅ Todos los agentes especializados
- ✅ Todas las tareas en TODO.md
- ✅ Cualquier tarea que requiera validación

**Si este policy no se sigue:**
- Usuario tiene derecho a rechazar completado
- Tarea debe re-ejecutarse con tests apropiados
- Evidencia debe mostrarse antes de marcar [x]

---

**Última Actualización:** October 9, 2025
**Razón:** Resolver fallo sistémico donde tareas se marcaban completadas sin validación visible
**Aprobado Por:** Usuario (conversación del 2025-10-09)
