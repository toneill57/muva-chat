# Workflow Pattern - Verificación Post-Ejecución

**Proyecto:** My Stay Guest Chat Fix
**Fecha:** 2025-11-13
**Propósito:** Template para agregar verificación post-ejecución a todos los prompts

---

## 📋 Patrón Estándar para Todos los Prompts

### Estructura de Prompt Completa

```markdown
### Prompt X.Y: [Nombre del Prompt]

**Agente:** `@agent-[nombre]`

**PREREQUISITO:** [Prompt anterior] completado

**Contexto:**
[Descripción breve de lo que hace este prompt]

---

🔽 **COPIAR DESDE AQUÍ (Prompt X.Y)**

**📊 Contexto de Progreso:**

FASE X - [Nombre de Fase] (Progreso: N/M completado)
- [x] X.a: [Tarea anterior] ✓ COMPLETADO
- [x] X.b: [Otra tarea anterior] ✓ COMPLETADO
- [ ] X.Y: [Esta tarea] ← ESTAMOS AQUÍ
- [ ] X.Z: [Siguiente tarea]

**Estado Actual:**
- [Logro 1] ✓
- [Logro 2] ✓
- Listo para [objetivo de este prompt]

---

**Tareas:**

[Descripción detallada de todas las tareas del prompt]

**Paso 1: [Nombre del paso] (tiempo estimado)**
[Contenido del paso]

**Paso 2: [Nombre del paso] (tiempo estimado)**
[Contenido del paso]

... [más pasos] ...

**Entregables:**
- [Entregable 1]
- [Entregable 2]
- [Entregable 3]

**Criterios de Éxito:**
- ✅ [Criterio 1]
- ✅ [Criterio 2]
- ✅ [Criterio 3]

**Estimado:** [tiempo total]

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt X.Y ([Nombre])?
- [Criterio 1] ✓
- [Criterio 2] ✓
- [Criterio 3] ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea X.Y como completada:
   ```markdown
   ### X.Y: [Nombre de tarea en TODO]
   - [x] [Descripción de la tarea] (estimate: [tiempo])
   ```

2. **[OPCIONAL - Solo si completa una FASE entera]**
   **Actualizar TODO.md** - Actualizar contador de progreso:
   Cambiar de:
   ```markdown
   **Completed:** N/17 (X%)
   ```
   A:
   ```markdown
   **Completed:** N+1/17 (X+Y%)
   ```

3. **Informarme del progreso:**
   "✅ Tarea X.Y completada y marcada en TODO.md

   **Progreso FASE X:** N/M tareas completadas (X%)
   - [x] X.a: [Tarea] ✓
   - [x] X.b: [Tarea] ✓
   - [x] X.Y: [Esta tarea] ✓
   - [ ] X.Z: [Siguiente]

   **Progreso General:** N/17 tareas completadas (X%)

   **Siguiente paso:** [Nombre del siguiente prompt]
   Prompt X.Z: [Nombre] ([tiempo])
   Ver workflow.md línea [número de línea]"

   **[Si completa FASE entera, agregar]:**
   "✅ FASE X COMPLETADA - Todas las tareas marcadas en TODO.md

   **✨ Logros FASE X:**
   - [Logro destacado 1]
   - [Logro destacado 2]
   - [Logro destacado 3]"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt X.Y)**
```

---

## 🎯 Ejemplo Aplicado: Prompt 0.1a

### Prompt 0.1a: Limpiar Working Directory + Verificar Estado Roto

**Agente:** `@agent-backend-developer`

**Contexto:**
Antes de restaurar código, necesitamos partir de un working directory limpio y documentar el estado roto actual.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 0.1a)**

**Tareas:**

Necesito que limpies el working directory y documentes el estado actual roto de la sync de reservas.

[... contenido del prompt ...]

**Criterios de Éxito:**
- ✅ `git status` muestra working directory limpio
- ✅ SQL queries ejecutadas y resultados documentados
- ✅ Baseline establecido para comparar después de fix

**Estimado:** 20-30 min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 0.1a (Limpiar + Verificar)?
- Working directory limpio ✓
- SQL baseline documentado ✓
- Listo para proceder a 0.1b ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 0.1a como completada:
   ```markdown
   ### 0.1a: Limpiar Working Directory + Verificar Estado Roto
   - [x] Clean uncommitted changes and verify current broken state (estimate: 20-30 min)
   ```

2. **Informarme del progreso:**
   "✅ Tarea 0.1a completada y marcada en TODO.md

   **Progreso FASE 0:** 1/3 tareas completadas (33%)
   - [x] 0.1a: Limpiar + Verificar ✓
   - [ ] 0.1b: Restaurar Lógica
   - [ ] 0.1c: SIRE + Testing

   **Siguiente paso:** Prompt 0.1b - Restaurar Lógica Funcional (1-1.5h)
   Ver workflow.md línea 211"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 0.1a)**

---

## ✅ Prompts Ya Actualizados

### FASE 0: Restaurar Reservation Sync (3/3 prompts ✓)
- [x] Prompt 0.1a: Limpiar + Verificar (20-30 min) ✓
- [x] Prompt 0.1b: Restaurar Lógica (1-1.5h) ✓
- [x] Prompt 0.1c: SIRE + Testing (1-1.5h) ✓

### FASE 1: Fix Manual Search RPC (2/2 prompts ✓)
- [x] Prompt 1.1: Diagnóstico + Fix RPC (2-3h) ✓
- [x] Prompt 1.2: E2E Test Manual Search (1-1.5h) ✓

### FASE 2: Mostrar Nombre Correcto (2/2 prompts ✓)
- [x] Prompt 2.1: Análisis + JOIN Query (1-1.5h) ✓
- [x] Prompt 2.2: Update UI + Testing (1-1.5h) ✓

### FASE 3: SIRE Básico Tenant Config (2/2 prompts ✓)
- [x] Prompt 3.1: Migration SIRE (1h) ✓
- [x] Prompt 3.2: Update Mapper + Testing (1-2h) ✓

### FASE 4: Documentation & Deployment (2/2 prompts ✓)
- [x] Prompt 4.1: Documentar Regresión (1h) ✓
- [x] Prompt 4.2: Deploy Staging + Production (1h) ✓

**Total:** 11/11 prompts actualizados (100%) ✅ COMPLETADO

---

## 📝 Notas de Implementación

### Campos Variables por Prompt

Cada prompt debe personalizar:

1. **Número de prompt:** X.Y
2. **Nombre del prompt:** Título descriptivo
3. **Agente:** @agent-[backend-developer|database-agent|ux-interface|deploy-agent]
4. **Prerequisito:** Prompt anterior completado
5. **Contexto de progreso:**
   - Progreso de la FASE (N/M completado)
   - Lista de tareas con estado (completado/pendiente/actual)
   - Estado actual (logros previos)
6. **Criterios de verificación:** Lista específica de este prompt
7. **TODO.md task:** Texto exacto de la tarea en TODO.md
8. **Progreso numérico:** Calcular correctamente N/17 y porcentaje
9. **Siguiente prompt:** Nombre y línea del siguiente prompt en workflow.md

### Cálculo de Progreso General

```
Total tasks: 17

FASE 0: Tareas 1-3   (0.1a, 0.1b, 0.1c)
FASE 1: Tareas 4-6   (1.1, 1.2, 1.3)
FASE 2: Tareas 7-10  (2.1, 2.2, 2.3, 2.4)
FASE 3: Tareas 11-13 (3.1, 3.2, 3.3)
FASE 4: Tareas 14-17 (4.1, 4.2, 4.3, 4.4)

Ejemplo:
- Después de 0.1a: 1/17 = 6%
- Después de 0.1b: 2/17 = 12%
- Después de 0.1c: 3/17 = 18%
- Después de 1.1: 4/17 = 24%
... etc.
```

### Mensaje Especial al Completar FASE

Cuando se completa la **última tarea de una FASE**, agregar al mensaje de progreso:

```markdown
**✨ Logros FASE X:**
- [Logro destacado 1]
- [Logro destacado 2]
- [Logro destacado 3]

**Siguiente paso:** FASE Y - [Nombre de siguiente fase]
```

---

## ✅ ACTUALIZACIÓN COMPLETADA

**Todos los prompts han sido actualizados con el patrón de verificación post-ejecución:**

✅ FASE 0: 3/3 prompts completados
✅ FASE 1: 2/2 prompts completados
✅ FASE 2: 2/2 prompts completados
✅ FASE 3: 2/2 prompts completados
✅ FASE 4: 2/2 prompts completados

**Total: 11/11 prompts (100%)**

### Mejoras Implementadas

Cada prompt ahora incluye:

1. **🔽 Delimitadores de copia** - Marca clara de inicio y fin de cada prompt
2. **📊 Contexto de progreso** - Visibilidad completa del estado del proyecto
3. **🔍 Verificación post-ejecución** - Aprobación explícita antes de marcar completado
4. **📝 Instrucciones de TODO.md** - Actualización automática del progreso
5. **➡️ Siguiente paso** - Guía clara hacia el siguiente prompt

### Beneficios del Nuevo Sistema

- **Tracking sistemático**: Progreso visible en cada paso
- **Control de calidad**: Aprobación explícita previene errores
- **Copy-paste fácil**: Delimitadores 🔽 🔼 claros
- **Contexto completo**: Cada prompt muestra trabajo previo
- **Consistencia**: Template estandarizado en todos los prompts

---

**Última actualización:** 2025-11-13 18:30
**Estado:** ✅ COMPLETADO - Todos los prompts actualizados (11/11)
