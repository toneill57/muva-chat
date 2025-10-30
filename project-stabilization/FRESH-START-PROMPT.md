# 🔧 Project Stabilization 2025 - Fresh Diagnostic Prompt

**Para Nueva Conversación con Claude Code**

---

## 📋 CONTEXTO COMPLETO

### Estado Actual del Proyecto

**Fecha:** 30 Octubre 2025
**Commit Actual (TODOS los ambientes):** `ee1d48e`
**Branch Actual:** `dev`

```
Commit: ee1d48e
Message: "merge: integrate GuestChatDev (chat-core-stabilization complete)"
Descripción: Último commit estable conocido
```

**Ambientes Sincronizados:**

| Ambiente | Branch | Commit | Estado |
|----------|--------|--------|--------|
| Localhost | dev | ee1d48e ✅ | Running (http://localhost:3000) |
| VPS Dev | dev | ee1d48e ✅ | Ready |
| VPS Staging | staging | ee1d48e ✅ | Ready |

---

### Rollback Completado

**SE ELIMINARON 13 COMMITS** mediante rollback para regresar a `ee1d48e`:

```
fac5da8 test: FINAL - esto tiene que funcionar sin conflictos
5aa0e99 test: verify clean merge workflow
4993177 test: final verification - no conflicts expected
4be4838 test: second verification commit
162d4ec test: verify git workflow is working
5876ac4 test: add deployment verification file
16bdc74 chore: remove old migration files from filesystem
a0302fe refactor: replace 60 incremental migrations with single baseline migration
f28e0c3 fix(nginx): Update SSL certificate path
c84ab97 chore: Trigger redeploy after nginx SSL certificate fix
3570969 docs: document NODE_ENV=production VPS deployment fix
f7dc7f9 revert: rollback schema switching code changes (production fix)
ebb6af7 feat(staging): add schema switching + defensive API parsing
```

**Razón del rollback:** Los commits posteriores a `ee1d48e` causaron problemas que incluían Guest Chat Core sin acceso a knowledge base.

**Backup creado:**
```bash
# Si necesitas ver los commits eliminados
git checkout backup-before-rollback-20251030
```

Ver detalles completos en: `/Users/oneill/Sites/apps/muva-chat/project-stabilization/ROLLBACK-COMPLETO.md`

---

## 🎯 TU MISIÓN

### Objetivo Principal

**RE-DIAGNOSTICAR el sistema desde commit `ee1d48e` y actualizar TODA la documentación de estabilización basándote en hallazgos REALES.**

### ⚠️ IMPORTANTE: Plan Actual es PRE-ROLLBACK

La documentación en `project-stabilization/` fue creada ANTES del rollback y contiene observaciones de commits posteriores (ahora eliminados).

**Problemas mencionados en plan original:**
- PM2 con 17 restarts en 18 minutos
- Tenant queries fallando (PGRST116)
- 35 dependencias desactualizadas
- Build warnings
- MCP sobrecargado

**TU TAREA:** Verificar cuáles de estos problemas REALMENTE existen en `ee1d48e` (el commit estable).

---

## 📂 ARCHIVOS DE PLANIFICACIÓN A ACTUALIZAR

Ubicación: `/Users/oneill/Sites/apps/muva-chat/project-stabilization/`

**Archivos existentes que debes revisar y actualizar:**

1. **README.md** (136 líneas)
   - Índice del proyecto
   - Progreso tracking
   - Instrucciones de uso

2. **plan-part-1.md** (352 líneas)
   - Overview y "¿Por qué?"
   - **ESTADO ACTUAL** ← Actualizar con diagnóstico real de ee1d48e
   - Estado Deseado

3. **plan-part-2.md** (1,201 líneas)
   - FASE 1: Critical Diagnostics
   - FASE 2: Branch Alignment
   - FASE 3: Dependency Updates

4. **plan-part-3.md** (1,710 líneas)
   - FASE 4: MCP Optimization
   - FASE 5: Build Warnings
   - FASE 6: Documentation

5. **TODO.md** (472 líneas)
   - 40 tareas específicas por fase
   - **Actualizar según problemas confirmados**

6. **workflow-part-1.md** (328 líneas)
   - Prompts para FASE 1

7. **workflow-part-2.md** (606 líneas)
   - Prompts para FASE 2-3

8. **workflow-part-3.md** (859 líneas)
   - Prompts para FASE 4-6

9. **ROLLBACK-COMPLETO.md** (89 líneas)
   - Documentación del rollback (NO modificar)

---

## 🔍 FASE DE DIAGNÓSTICO (Tu Primer Paso)

### 1. Diagnóstico de PM2 (VPS)

**Conectarse al VPS:**
```bash
sshpass -p 'rabbitHole0+' ssh -o StrictHostKeyChecking=no root@195.200.6.216
```

**Comandos a ejecutar:**
```bash
# Ver estado de procesos PM2
pm2 list

# Ver detalles de muva-chat
pm2 show muva-chat

# Ver detalles de muva-chat-staging
pm2 show muva-chat-staging

# Ver logs recientes (últimos 100 líneas)
pm2 logs muva-chat --lines 100 --nostream

# Ver logs de staging
pm2 logs muva-chat-staging --lines 100 --nostream

# Ver estadísticas en tiempo real (correr por ~2 minutos)
pm2 monit
```

**Qué buscar:**
- ¿Cuántos restarts tienen las instancias?
- ¿Hay errores de "PGRST116" en logs?
- ¿Hay memory leaks o OOM (Out of Memory)?
- ¿Hay errores relacionados con `getTenantBySubdomain()`?

**Actualizar en plan-part-1.md:**
- Sección "PM2 Logs (Últimos errores)"
- Sección "Limitaciones Actuales → Infraestructura"

---

### 2. Diagnóstico de Build (Localhost)

**Ya está corriendo en localhost** (http://localhost:3000)

**Comandos a ejecutar:**
```bash
cd /Users/oneill/Sites/apps/muva-chat

# Ver warnings del build actual
npm run build 2>&1 | tee build-output-ee1d48e.txt

# Verificar si hay warnings específicos
grep -i "warning" build-output-ee1d48e.txt
grep -i "deprecated" build-output-ee1d48e.txt
grep -i "memory" build-output-ee1d48e.txt
```

**Qué buscar:**
- ¿Cuántos warnings hay realmente?
- ¿Qué tipo de warnings? (deprecation, memory, bundle size, etc.)
- ¿Build time actual?
- ¿Bundle size por ruta?

**Actualizar en plan-part-1.md:**
- Sección "Local Development → Build Status"
- Sección "Limitaciones Actuales → Build Quality"

---

### 3. Diagnóstico de Dependencias

**Comandos a ejecutar:**
```bash
cd /Users/oneill/Sites/apps/muva-chat

# Ver dependencias desactualizadas
npm outdated > dependencies-outdated-ee1d48e.txt

# Ver dependencias con breaking changes
npm outdated | grep -E "@langchain|openai|@supabase|next"
```

**Qué buscar:**
- ¿Cuántas dependencias están realmente desactualizadas?
- ¿Cuáles tienen breaking changes (major version bump)?
- ¿Cuáles son críticas vs opcionales?

**Actualizar en plan-part-1.md:**
- Sección "Limitaciones Actuales → Dependencias"
- Ajustar plan-part-2.md → FASE 3 según hallazgos

---

### 4. Diagnóstico de MCP

**Comandos a ejecutar:**
```bash
cd /Users/oneill/Sites/apps/muva-chat

# Ver tamaño de snapshots
ls -lh snapshots/*.md

# Ver tamaño total
du -sh snapshots/

# Contar líneas por snapshot
wc -l snapshots/*.md
```

**Qué buscar:**
- ¿Tamaño actual de snapshots?
- ¿Snapshots >50KB que necesitan limpieza?
- ¿Información obsoleta de proyectos anteriores?

**Actualizar en plan-part-1.md:**
- Sección "Limitaciones Actuales → MCP & Contexto"
- Ajustar plan-part-3.md → FASE 4 según hallazgos

---

### 5. Diagnóstico de Tenant Queries

**Usar MCP para verificar:**
```typescript
// Ver estructura de tabla tenants
mcp__supabase__list_tables({
  project_id: "ooaumjzaztmutltifhoq",
  schemas: ["public"]
})

// Ejecutar query de tenant para subdomain inexistente
mcp__supabase__execute_sql({
  project_id: "ooaumjzaztmutltifhoq",
  query: "SELECT * FROM tenants WHERE subdomain = 'admin' LIMIT 1"
})
```

**Revisar código:**
```bash
# Buscar uso de .single() que podría causar PGRST116
grep -r "\.single()" src/ --include="*.ts" --include="*.tsx"

# Buscar getTenantBySubdomain específicamente
grep -r "getTenantBySubdomain" src/ --include="*.ts" --include="*.tsx"
```

**Qué buscar:**
- ¿Código usa `.single()` cuando debería usar `.maybeSingle()`?
- ¿Errores PGRST116 son esperados (subdominios inexistentes) o bug real?

**Actualizar en plan-part-2.md:**
- FASE 1 → Tarea 1.2 (Diagnosticar tenant query errors)

---

## 📝 ACTUALIZACIÓN DE DOCUMENTACIÓN

### Proceso de Actualización

**Para cada archivo en `project-stabilization/`:**

1. **Leer archivo actual** completo
2. **Identificar secciones basadas en suposiciones** (pre-rollback)
3. **Reemplazar con datos REALES** del diagnóstico de `ee1d48e`
4. **Eliminar tareas** que no aplican (problemas inexistentes en ee1d48e)
5. **Ajustar estimaciones** de tiempo según alcance real
6. **Actualizar criterios de éxito** basados en estado actual

### Secciones Críticas a Actualizar

**plan-part-1.md:**
```markdown
## 📊 ESTADO ACTUAL

### Sistema Existente

**VPS Production (195.200.6.216):**
[ACTUALIZAR con datos reales de PM2]

**PM2 Logs (Últimos errores):**
[ACTUALIZAR con logs reales de ee1d48e]

### Limitaciones Actuales

**Infraestructura:**
[CONFIRMAR o ELIMINAR problemas listados]

**Dependencias:**
[ACTUALIZAR lista de npm outdated REAL]

**MCP & Contexto:**
[ACTUALIZAR tamaños reales de snapshots]

**Build Quality:**
[ACTUALIZAR con warnings reales del build]
```

**plan-part-2.md:**
```markdown
## FASE 1: Critical Diagnostics

### Objetivo
[AJUSTAR según problemas CONFIRMADOS]

### Tareas
[ELIMINAR tareas de problemas inexistentes]
[AGREGAR tareas según hallazgos nuevos]
```

**TODO.md:**
```markdown
## FASE 1: Critical Diagnostics ⚠️

[ ] 1.1 Diagnóstico PM2
    [ACTUALIZAR con hallazgos reales]

[ ] 1.2 Fix Tenant Query Errors
    [SOLO si existe en ee1d48e]
```

---

## 🚫 QUÉ NO HACER

### ❌ NO Trabajar en Guest Chat

**El problema de Guest Chat Core (knowledge base) NO es parte de este proyecto de estabilización.**

- ❌ NO diagnosticar embeddings
- ❌ NO revisar `accommodation_embeddings` table
- ❌ NO investigar vector search
- ❌ NO tocar nada relacionado con `/guest-chat/*` routes

**Enfoque:** Solo infraestructura, build, dependencias, PM2, branches, MCP, warnings.

### ❌ NO Modificar Performance Targets

**De CLAUDE.md:**
```
### 1. NO Modificar Performance Targets
- ❌ Cambiar umbrales para que tests pasen artificialmente
- ✅ Investigar causa REAL del problema
```

Si encuentras que un target de performance está mal, REPORTA el problema, no cambies el target.

### ❌ NO Commits o Push sin Autorización

**De CLAUDE.md:**
```
🚨 COMMITS Y PUSH - REQUIEREN AUTORIZACIÓN EXPLÍCITA:
- ❌ NUNCA hacer git commit sin que el usuario lo pida
- ❌ NUNCA hacer git push sin que el usuario lo pida
```

Este es un proyecto de DIAGNÓSTICO y PLANIFICACIÓN. No ejecutes cambios aún.

---

## 📋 DELIVERABLES ESPERADOS

### 1. Reporte de Diagnóstico

Crear: `project-stabilization/DIAGNOSTICO-ee1d48e.md`

**Contenido:**
```markdown
# Diagnóstico Real desde Commit ee1d48e

## 1. PM2 Status
[Resultados de pm2 list, pm2 show, logs]

## 2. Build Status
[Output completo de npm run build]
[Lista de warnings encontrados]

## 3. Dependencies Status
[Output de npm outdated]
[Análisis de breaking changes]

## 4. MCP Status
[Tamaños de snapshots]
[Identificación de contenido obsoleto]

## 5. Tenant Queries
[Resultados de tests de queries]
[Análisis de código .single() vs .maybeSingle()]

## 6. Conclusiones
[Problemas CONFIRMADOS que requieren fix]
[Problemas del plan original que NO existen en ee1d48e]
[Nuevos problemas descubiertos (si hay)]
```

### 2. Documentación Actualizada

**Archivos actualizados basados en diagnóstico real:**
- `plan-part-1.md` (Estado Actual con datos reales)
- `plan-part-2.md` (Fases ajustadas)
- `plan-part-3.md` (Fases ajustadas)
- `TODO.md` (Tareas confirmadas/eliminadas/agregadas)
- `workflow-part-*.md` (Prompts ajustados según necesidad real)

### 3. Plan de Ejecución Ajustado

Crear: `project-stabilization/EJECUCION-PLAN.md`

**Contenido:**
```markdown
# Plan de Ejecución - Estabilización desde ee1d48e

## Fases Confirmadas
[Solo fases que aplican según diagnóstico]

## Orden de Ejecución
1. [Primera fase crítica]
2. [Segunda fase...]

## Estimación Real
- Tiempo total: [X horas según tareas confirmadas]
- Complejidad: [Baja/Media/Alta]

## Riesgos Identificados
[Basados en hallazgos reales]

## Criterios de Éxito Ajustados
[Basados en estado actual real]
```

---

## 🚀 WORKFLOW SUGERIDO

### Paso 1: Diagnóstico Completo (2-3 horas)

```
1. Ejecutar todos los comandos de diagnóstico listados arriba
2. Guardar outputs en archivos (build-output-ee1d48e.txt, etc.)
3. Analizar resultados
4. Crear DIAGNOSTICO-ee1d48e.md con hallazgos
```

### Paso 2: Actualización de Documentación (1-2 horas)

```
1. Leer plan-part-1.md completo
2. Identificar secciones con datos pre-rollback
3. Actualizar con datos reales de diagnóstico
4. Repetir para plan-part-2.md y plan-part-3.md
5. Actualizar TODO.md eliminando/ajustando tareas
6. Actualizar workflow-part-*.md según necesidad
```

### Paso 3: Crear Plan de Ejecución (30 min)

```
1. Crear EJECUCION-PLAN.md
2. Listar solo fases/tareas confirmadas
3. Establecer orden de ejecución
4. Definir criterios de éxito ajustados
```

### Paso 4: Presentar al Usuario (15 min)

```
1. Resumen ejecutivo de hallazgos
2. Comparación: Plan Original vs Plan Ajustado
3. Cambios principales en alcance
4. Confirmación antes de empezar ejecución
```

---

## 📚 REFERENCIAS CLAVE

### Archivos de Contexto

- **CLAUDE.md** - Reglas del proyecto (NO modificar performance targets, NO commits sin permiso)
- **snapshots/infrastructure-monitor.md** - Contexto del agente líder
- **snapshots/general-snapshot.md** - Estado general del proyecto
- **project-stabilization/ROLLBACK-COMPLETO.md** - Detalles del rollback

### Comandos Útiles

```bash
# VPS Connection
sshpass -p 'rabbitHole0+' ssh -o StrictHostKeyChecking=no root@195.200.6.216

# Localhost Dev
./scripts/dev-with-keys.sh

# Build
npm run build

# Dependencies Check
npm outdated

# PM2 Commands (en VPS)
pm2 list
pm2 show muva-chat
pm2 logs muva-chat --lines 100
pm2 monit
```

### Supabase Info

```
Project ID: ooaumjzaztmutltifhoq
Region: us-east-1
Database: PostgreSQL 17.4.1.075
Status: ACTIVE_HEALTHY
```

---

## ✅ CHECKLIST DE INICIO

Antes de empezar el diagnóstico, confirma:

- [ ] Localhost corriendo en http://localhost:3000 (commit ee1d48e)
- [ ] VPS dev en commit ee1d48e (verificar con `git log -1`)
- [ ] VPS staging en commit ee1d48e (verificar con `git log -1`)
- [ ] Conexión SSH al VPS funcionando
- [ ] MCP Supabase configurado (project_id: ooaumjzaztmutltifhoq)
- [ ] Leído CLAUDE.md (reglas críticas)
- [ ] Leído ROLLBACK-COMPLETO.md (contexto del rollback)

---

## 🎯 OBJETIVO FINAL

**Al terminar esta conversación, el usuario debe tener:**

1. ✅ Diagnóstico REAL del sistema en commit `ee1d48e`
2. ✅ Documentación ACTUALIZADA en `project-stabilization/`
3. ✅ Plan de Ejecución AJUSTADO según hallazgos reales
4. ✅ Claridad de qué problemas existen vs cuáles eran del código eliminado
5. ✅ Confianza para ejecutar el plan sin sorpresas

**NO ejecutar el plan aún** - solo diagnosticar y actualizar docs.

---

**Creado:** 30 Octubre 2025
**Contexto:** Conversación post-rollback a ee1d48e
**Última actualización:** 30 Octubre 2025

---

## 🚀 PROMPT DE INICIO

**Copia esto en la nueva conversación:**

```
Hola. Tengo un proyecto de estabilización de MUVA Chat que requiere diagnóstico completo desde commit ee1d48e.

He hecho un rollback completo de 13 commits para regresar a la última versión estable conocida. Todos los ambientes (localhost, VPS dev, VPS staging) están sincronizados en ee1d48e.

Existe documentación de planificación en /Users/oneill/Sites/apps/muva-chat/project-stabilization/ pero fue creada ANTES del rollback y contiene suposiciones basadas en commits que ya no existen.

Tu misión:
1. RE-DIAGNOSTICAR el sistema desde ee1d48e (verificar PM2, build warnings, dependencies, tenant queries, MCP)
2. ACTUALIZAR toda la documentación en project-stabilization/ con datos REALES
3. CREAR plan de ejecución ajustado basado en problemas confirmados

Lee el contexto completo en:
/Users/oneill/Sites/apps/muva-chat/project-stabilization/FRESH-START-PROMPT.md

Ese archivo contiene:
- Estado actual del proyecto (commit ee1d48e)
- Comandos de diagnóstico a ejecutar
- Qué buscar en cada diagnóstico
- Qué archivos actualizar
- Deliverables esperados

Importante:
- ❌ NO trabajar en Guest Chat (knowledge base) - eso es otro proyecto
- ❌ NO hacer commits o push - esto es solo diagnóstico
- ✅ SOLO infraestructura, build, dependencies, PM2, branches, MCP

Empecemos con el diagnóstico de PM2 en el VPS.
```
