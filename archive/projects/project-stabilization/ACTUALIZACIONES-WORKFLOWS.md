# 📝 Actualizaciones de Workflows - Integración Diagnóstico Real

**Fecha:** 30 Octubre 2025
**Propósito:** Integrar hallazgos de `DIAGNOSTICO-f9f6b27.md` en workflows existentes
**Estado:** workflow-part-1.md ✅ COMPLETADO | Resto: PENDIENTE

---

## ✅ COMPLETADO: workflow-part-1.md

### Cambios Realizados:
1. ✅ Agregada FASE 0 (VPS Synchronization) - Prompt 0.1
2. ✅ Actualizado Prompt 0.0 (Contexto) con datos reales
3. ✅ Actualizado Prompt 1.1 (PM2 Diagnostic) con hallazgos reales
4. ✅ Header actualizado: "7 fases" en vez de "6 fases"

### Resultado:
- FASE 0 completa con comandos para sincronizar VPS
- Referencias a DIAGNOSTICO-f9f6b27.md y EJECUCION-PLAN.md
- Problemas críticos actualizados con severidades reales

---

## 📋 PENDIENTE: workflow-part-2.md

### Cambios Necesarios:

#### 1. Agregar Header de Advertencia al Inicio de FASE 3

**Ubicación:** Después de línea 185 (inicio de FASE 3)

**Agregar:**
```markdown
## FASE 3: Dependency Updates 📦

⚠️ **ACTUALIZACIÓN SEGÚN DIAGNÓSTICO REAL:**

Según `DIAGNOSTICO-f9f6b27.md`, las dependencias se dividen en:
- **Grupo 1 (Safe - 23 paquetes):** Minor/Patch updates → ✅ COMPLETADO (Commit a2e3bd4)
- **Grupo 2 (Medium Risk - ~8 paquetes):** API changes posibles → Requiere testing extensivo
- **Grupo 3 (Breaking Changes - 12 paquetes):** LangChain 1.0, OpenAI 6.x → Requiere migración de código

**ESTADO:** Grupo 1 completado. Grupos 2 y 3 pendientes, requieren testing exhaustivo pero se ejecutan en este workflow.

Ver `EJECUCION-PLAN.md` FASE 2 para lista exacta de 23 paquetes safe.

---
```

#### 2. Actualizar Prompt 3.1 - Lista Exacta de Paquetes Safe

**Ubicación:** Líneas 206-225 (dentro de Prompt 3.1)

**Reemplazar:**
```markdown
Paquetes a actualizar:
- @anthropic-ai/sdk: 0.63.0 → 0.68.0 (5 versions)
- @supabase/supabase-js: 2.57.4 → 2.77.0 (20 versions)
- stripe, tailwindcss, typescript (minor/patch updates)
- Otros ~10 paquetes con cambios menores
```

**Con:**
```markdown
**LISTA EXACTA de 23 paquetes (del diagnóstico real):**

1. @anthropic-ai/sdk: 0.63.0 → 0.68.0
2. @supabase/supabase-js: 2.57.4 → 2.77.0
3. @tailwindcss/postcss: 4.1.13 → 4.1.16
4. @testing-library/jest-dom: 6.8.0 → 6.9.1
5. @tiptap/react: 3.6.6 → 3.9.1
6. @tiptap/starter-kit: 3.6.6 → 3.9.1
7. @types/leaflet: 1.9.20 → 1.9.21
8. @types/react: 19.1.13 → 19.2.2
9. @types/react-dom: 19.1.9 → 19.2.2
10. dotenv: 17.2.2 → 17.2.3
11. eslint: 9.35.0 → 9.38.0
12. framer-motion: 12.23.22 → 12.23.24
13. jest: 30.1.3 → 30.2.0
14. jest-environment-jsdom: 30.1.2 → 30.2.0
15. lucide-react: 0.544.0 → 0.548.0
16. pdfjs-dist: 5.4.149 → 5.4.296
17. puppeteer: 24.23.0 → 24.27.0
18. react: 19.1.0 → 19.2.0
19. react-dom: 19.1.0 → 19.2.0
20. react-pdf: 10.1.0 → 10.2.0
21. recharts: 3.2.1 → 3.3.0
22. tailwindcss: 4.1.13 → 4.1.16
23. typescript: 5.9.2 → 5.9.3

**Fuente:** `DIAGNOSTICO-f9f6b27.md` - Sección "Dependencies Status - Safe Updates"
```

#### 3. Marcar Prompts 3.2 y 3.3 como POSTPONED

**Ubicación:** Líneas 271-538

**Agregar al inicio de Prompt 3.2:**
```markdown
### Prompt 3.2: Actualizar Dependencias Grupo 2 (Medium Risk)

⚠️ **IMPORTANTE:** Grupo 2 (Medium Risk) requiere testing exhaustivo de features afectadas (Auth flows, Forms, Supabase SSR).

**Consideraciones:**
- Cambios de API requieren testing manual extensivo
- Riesgo de regresiones en features críticas
- Tiempo estimado: 2-3 horas (incluyendo testing)
- Proceder con precaución y validar cada cambio

---

**AGENTE:** @agent-backend-developer
```

**Agregar al inicio de Prompt 3.3:**
```markdown
### Prompt 3.3: Actualizar Dependencias Grupo 3 (Breaking Changes)

⚠️ **IMPORTANTE:** Grupo 3 (Breaking Changes) incluye:
- LangChain 0.3.x → 1.0.x (4 packages)
- OpenAI SDK 5.x → 6.x

Estos requieren migración de código significativa + testing exhaustivo de AI features (chat, embeddings).

**Razón de Postponement:**
- Breaking changes confirmados en APIs críticas
- Migración de código requiere 2-3 horas
- Testing de AI features requiere 1-2 horas
- Alto riesgo de romper funcionalidad core del negocio
- Mejor ejecutar cuando tengamos tiempo para troubleshooting extensivo

Ver `DIAGNOSTICO-f9f6b27.md` - Sección "FASES POSTPONED - LangChain/OpenAI Update"

**El contenido a continuación se mantiene como REFERENCIA para ejecución futura:**

---

**AGENTE:** @agent-backend-developer
```

---

## 📋 PENDIENTE: workflow-part-3.md

### Cambios Necesarios:

#### 1. Actualizar Prompt 4.1 (MCP Snapshots) con Tamaños Reales

**Ubicación:** Líneas 48-94 (Prompt 4.1)

**Reemplazar:**
```markdown
2. Aplicar estrategia de limpieza:
   - Remover proyectos completados
   - Consolidar información duplicada
   - Actualizar con "Project Stabilization 2025" como proyecto actual
   - Usar template compacto (ver plan-part-3.md, tarea 4.2)
```

**Con:**
```markdown
2. Aplicar estrategia de limpieza (tamaños REALES del diagnóstico):

   **Archivos a optimizar (targets estandarizados por tamaño):**
   - `backend-developer.md`: 48K → objetivo <30KB (37% reducción) [Large file]
   - `database-agent.md`: 38K → objetivo <30KB (21% reducción) [Large file]
   - `infrastructure-monitor.md`: 32K → objetivo <25KB (22% reducción) [Medium file]
   - Otros archivos (<30KB): mantener <20KB [Small files]

   **Targets estandarizados:**
   - Large snapshots (>40KB actual): target <30KB
   - Medium snapshots (30-40KB actual): target <25KB
   - Small snapshots (<30KB actual): target <20KB

   **Contenido a remover:**
   - Proyectos marcados COMPLETED (pre-Octubre 2025)
   - Referencias a features ya deployed
   - Logs/outputs de debugging históricos
   - Contexto duplicado entre agentes

   **Contenido a mantener:**
   - Arquitectura actual multi-tenant
   - Patterns de código actuales
   - Guías de SIRE compliance
   - Contexto de Project Stabilization 2025

   Usar template compacto (ver plan-part-3.md, tarea 4.2)
```

#### 2. Actualizar FASE 5 con Realidad: Build LIMPIO

**Ubicación:** Líneas 266-385 (FASE 5 completa)

**Agregar header ANTES de Prompt 5.1:**
```markdown
## FASE 5: Build Warnings & Performance 🔧

✅ **HALLAZGO DEL DIAGNÓSTICO:** Build está LIMPIO (0 warnings críticos)

Según `DIAGNOSTICO-f9f6b27.md` - Sección "Build Status":
- Compile time: 5.1s ✅ (excelente)
- Total warnings: 0 ✅ (solo 1 warning esperado de edge runtime)
- TypeScript errors: 0 ✅
- Bundle size: Algunas rutas >270KB (aceptable para features complejos)

**CAMBIO DE ENFOQUE:**
- Esta fase es PREVENTIVA y de DOCUMENTACIÓN
- Objetivo: Documentar baseline limpio actual
- No hay warnings críticos que resolver
- Focus en performance baseline y optimizaciones preventivas

---
```

**Actualizar Prompt 5.1:**
```markdown
### Prompt 5.1: Documentar Baseline de Build Limpio

⚠️ **CAMBIO vs Plan Original:** Build ya está limpio. Esta tarea documenta el baseline actual.

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Documentar baseline de build limpio y capturar métricas actuales

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 5
- Ver: project-stabilization/DIAGNOSTICO-f9f6b27.md (sección "Build Status")
- Hallazgo Real: Build LIMPIO (0 warnings, 0 errors)
- Objetivo: Documentar estado actual como baseline

ESPECIFICACIONES:

**PARTE 1: Capturar Build Output Actual (tarea 5.1)**

1. Build y capturar output:
   ```bash
   npm run build 2>&1 | tee project-stabilization/docs/fase-5/build-baseline-f9f6b27.txt
   ```

2. Verificar que build está limpio:
   ```bash
   grep -i "warning" project-stabilization/docs/fase-5/build-baseline-f9f6b27.txt
   grep -i "error" project-stabilization/docs/fase-5/build-baseline-f9f6b27.txt
   ```
   Expected: Solo warning de "edge runtime disables static generation" (esperado, no crítico)

3. Capturar métricas:
   ```bash
   # Compile time
   grep "Compiled in" project-stabilization/docs/fase-5/build-baseline-f9f6b27.txt

   # Bundle sizes
   grep -A 50 "Route (app)" project-stabilization/docs/fase-5/build-baseline-f9f6b27.txt
   ```

4. Documentar baseline:
   - Crear: project-stabilization/docs/fase-5/BUILD_BASELINE_CLEAN.md
   - Incluir:
     - Compile time actual (esperado: ~5s)
     - Bundle sizes por ruta
     - Largest bundles (>270KB): calendar, content, analytics, dashboard
     - Total routes: 117
     - Warnings: 1 (edge runtime - esperado)
     - Errors: 0 ✅
   - Conclusión: Build está en excelente estado, no requiere fixes

**CRITERIOS DE ÉXITO:**
- ✅ Build output capturado
- ✅ Baseline documentado en BUILD_BASELINE_CLEAN.md
- ✅ Confirmado: 0 errores, 0 warnings críticos
- ✅ Métricas de performance capturadas

TEST:
- npm run build (exitoso)
- Documentación BUILD_BASELINE_CLEAN.md creada
- Baseline usable para comparaciones futuras

SIGUIENTE: Prompt 5.2 (Performance Baseline + Optimizaciones PREVENTIVAS)
```
```

---

## 📋 PENDIENTE: TODO.md

### Cambios Necesarios:

#### 1. Agregar Header de Actualización

**Ubicación:** Después de línea 5 (antes de "---")

**Agregar:**
```markdown
**ACTUALIZACIÓN:** 30 Octubre 2025 - Integrado con hallazgos de DIAGNOSTICO-f9f6b27.md
**Cambios Principales:**
- ✅ Agregada FASE 0 (VPS Synchronization) - 4 tareas
- ✅ FASE 3 incluye todos los grupos (Safe, Medium Risk, Breaking Changes)
- ✅ FASE 5 actualizada (build ya limpio, solo documentar baseline)
- Total tareas actualizadas: 40 → 44 tareas
- Estimación actualizada: 13-18h → 12-16h (reducción por postponements)
```

#### 2. Agregar FASE 0 Completa

**Ubicación:** Después de línea 9 (antes de "## FASE 1")

**Agregar:**
```markdown
## FASE 0: VPS Synchronization 🔴 (CRÍTICO - NUEVO)

### 0.1 Sincronizar VPS Production
- [x] Sincronizar VPS production a commit f9f6b27 (estimate: 15min) ✅
  - Conectar a VPS via SSH
  - Verificar commit actual (035b89b - incorrecto)
  - git fetch + git reset --hard f9f6b27
  - npm ci + npm run build
  - pm2 restart muva-chat
  - Verificar status: online, 0 errors
  - Files: VPS /var/www/muva-chat
  - Agent: **@agent-infrastructure-monitor**
  - Test: `git log -1`, `pm2 show muva-chat` (online)

### 0.2 Sincronizar VPS Staging
- [x] Sincronizar VPS staging a commit f9f6b27 (estimate: 15min) ✅
  - Mismo VPS, directorio /var/www/muva-chat-staging
  - Verificar commit actual (7ba9e04 - CÓDIGO ELIMINADO)
  - git fetch + git reset --hard f9f6b27
  - npm ci + npm run build
  - pm2 restart muva-chat-staging
  - Verificar status: online, 0 errors
  - Files: VPS /var/www/muva-chat-staging
  - Agent: **@agent-infrastructure-monitor**
  - Test: `git log -1`, `pm2 show muva-chat-staging` (online)

### 0.3 Verificación Sincronización
- [x] Verificar ambos VPS en f9f6b27 (estimate: 10min) ✅
  - Verificar commits en ambos directorios
  - Verificar ambos procesos PM2 online
  - Test URLs (production, staging)
  - Documentar en VPS_SYNC_RESULTS.md
  - Files: project-stabilization/docs/fase-0/VPS_SYNC_RESULTS.md
  - Agent: **@agent-infrastructure-monitor**
  - Test: `pm2 list` (ambos online), `curl` a URLs

### 0.4 Monitoreo Post-Sync
- [ ] Monitorear estabilidad 15 minutos (estimate: 15min)
  - Esperar 15 minutos post-deploy
  - Verificar 0 restarts adicionales
  - Verificar logs sin errores críticos
  - Verificar memory usage estable (~200MB)
  - Files: N/A (monitoring)
  - Agent: **@agent-infrastructure-monitor**
  - Test: `pm2 list` (0 new restarts), logs limpios

---
```

#### 3. Marcar Tareas de Dependencies como POSTPONED

**Ubicación:** Sección FASE 3 (líneas ~160-262)

**Modificar:**

**Antes de línea 184 (GRUPO 2), agregar:**
```markdown
### GRUPO 2: Medium Risk Updates ⚠️

**NOTA:** Requiere testing extensivo de features afectadas (Auth, Forms, Supabase SSR). Proceder con cuidado.
```

**Antes de línea 209 (GRUPO 3), agregar:**
```markdown
### GRUPO 3: Breaking Changes 🔴

**NOTA:** Breaking changes en LangChain y OpenAI SDK requieren testing exhaustivo de AI features. Proceder con precaución.

⚠️ **POSTPONED:** Breaking changes en LangChain y OpenAI SDK requieren proyecto dedicado. Ver DIAGNOSTICO-ee1d48e.md sección "FASES POSTPONED".
```

**Actualizar línea 450 (Resumen):**
```markdown
**Total:** 44 tareas (40 originales + 4 FASE 0)
**Estimación Total:** 12-16 horas (reducción por postponements de Grupo 2-3)

### Por Fase
- FASE 0 (VPS Sync): 4 tareas, 1h ⚠️ NUEVA - CRÍTICA
- FASE 1 (Critical): 6 tareas, 3-4h
- FASE 2 (Branches): 7 tareas, 2-3h
- FASE 3 (Dependencies): 3 tareas, 1-2h (solo Grupo 1) ⚠️ REDUCIDA
- FASE 4 (MCP): 5 tareas, 1-2h
- FASE 5 (Warnings): 3 tareas, 1h (solo baseline) ⚠️ REDUCIDA
- FASE 6 (Docs): 5 tareas, 1-2h
```

---

## 📋 PENDIENTE: plan-part-1.md, plan-part-2.md, plan-part-3.md

### Cambios en plan-part-1.md:

**Sección a Actualizar:** "ESTADO ACTUAL" (aprox. líneas 50-150)

**Reemplazar con datos de DIAGNOSTICO-ee1d48e.md:**

1. **PM2 Logs:** Copiar métricas reales (18 restarts prod, 30 staging, heap 94%)
2. **Build Status:** Actualizar a "LIMPIO - 0 warnings, 5.1s compile time"
3. **Dependencies:** Lista exacta de 35 outdated (23 safe, 12 breaking)
4. **Agregar sección nueva:**
   ```markdown
   ### ⚠️ Hallazgo Crítico Post-Diagnóstico

   Durante diagnóstico se descubrió:
   - VPS production en commit 035b89b (anterior a ee1d48e)
   - VPS staging en commit 7ba9e04 (código eliminado en rollback)

   **ACCIÓN REQUERIDA:** FASE 0 (nueva) para sincronizar ambos a ee1d48e
   ```

### Cambios en plan-part-2.md:

1. **Agregar FASE 0 completa** (antes de FASE 1)
2. **En FASE 3:** Incluir todos los grupos (Safe ✅, Medium Risk, Breaking Changes)
3. **Actualizar criterios de éxito** basados en hallazgos reales

### Cambios en plan-part-3.md:

1. **FASE 4:** Actualizar tamaños objetivo de snapshots (48K→30K, 38K→25K, 32K→25K)
2. **FASE 5:** Cambiar de "resolver warnings" a "documentar baseline limpio"
3. **Criterios de Éxito Proyecto:** Actualizar con datos reales

---

## 📊 Resumen de Cambios

### Archivos Completados:
- ✅ workflow-part-1.md (FASE 0 agregada, contexto actualizado)

### Archivos con Instrucciones Documentadas:
- 📝 workflow-part-2.md (postponements dependencies)
- 📝 workflow-part-3.md (MCP sizes, build baseline)
- 📝 TODO.md (FASE 0, postponements, totales)
- 📝 plan-part-1.md (estado actual real)
- 📝 plan-part-2.md (FASE 0, postponements)
- 📝 plan-part-3.md (criterios ajustados)

### Siguiente Paso:
En próxima conversación, ejecutar estos cambios sistemáticamente usando este documento como guía.

---

**Creado:** 30 Octubre 2025
**Propósito:** Guía completa para integrar diagnóstico real en workflows existentes
**Uso:** Referencia para actualización sistemática en siguiente sesión
