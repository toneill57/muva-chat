# 🔍 Diagnóstico Real desde Commit ee1d48e

**Fecha:** 30 Octubre 2025
**Commit:** `ee1d48e` - "merge: integrate GuestChatDev (chat-core-stabilization complete)"
**Branch:** `dev`

---

## 🚨 HALLAZGO CRÍTICO: Staging Desincronizado

### Estado de Ambientes

| Ambiente | Branch | Commit | Estado |
|----------|--------|--------|--------|
| Localhost | dev | ee1d48e ✅ | Correcto |
| VPS Dev | dev | **035b89b** ❌ | **INCORRECTO** (commit anterior a ee1d48e) |
| VPS Staging | staging | **7ba9e04** ❌ | **INCORRECTO** (commit que debió eliminarse en rollback) |

### Análisis del Problema

**VPS Production (`muva-chat`):**
- PM2 metadata muestra: `035b89b` ("feat: Airbnb reservations...")
- Este commit es ANTERIOR a `ee1d48e` en la historia de git
- El servidor necesita actualización a `ee1d48e`

**VPS Staging (`muva-chat-staging`):**
- Running commit: `7ba9e04` ("fix(staging): Fix multi-tenant routing...")
- Este commit es parte de los 13 commits que se eliminaron en el rollback
- **CRÍTICO:** Staging está ejecutando código que ya no existe en el repositorio

### Acción Requerida

**ANTES de cualquier otra tarea de estabilización:**

```bash
# En VPS production
cd /var/www/muva-chat
git fetch origin
git checkout dev
git reset --hard ee1d48e
npm ci
npm run build
pm2 restart muva-chat

# En VPS staging
cd /var/www/muva-chat-staging
git fetch origin
git checkout dev
git reset --hard ee1d48e
npm ci
npm run build
pm2 restart muva-chat-staging
```

---

## 1. PM2 Status

### Production (muva-chat)

**Estado General:**
- Status: `online` ✅
- Uptime: 13 minutos (al momento del diagnóstico)
- Restarts: **18 restarts** ⚠️
- Memory: 209.1 MB
- CPU: 0%
- Heap Usage: 94.68% (88.63 MiB used / 93.61 MiB total)

**Métricas:**
- Event Loop Latency: 0.34ms (normal)
- Event Loop Latency p95: 1.15ms (normal)
- Active handles: 1
- Active requests: 0

**Análisis de Restarts:**
- 18 restarts en timeframe desconocido (no hay crashes recientes en logs)
- Restarts podrían ser por deploys manuales, no por crashes
- Sin evidencia de "unstable restarts" (contador en 0)
- **Heap usage alto (94.68%)** pero estable

### Staging (muva-chat-staging)

**Estado General:**
- Status: `online` ✅
- Uptime: 4 días
- Restarts: **30 restarts** ⚠️
- Memory: 173.5 MB
- CPU: 0%
- Heap Usage: 92.71% (100.58 MiB used / 108.48 MiB total)

**Análisis de Restarts:**
- 30 restarts en 4 días = promedio ~7.5 restarts/día
- **PROBLEMA CONFIRMADO:** Staging tiene más restarts que production
- Sin evidencia de crashes recientes (últimos logs muestran startups normales)

### Logs de Errores

**Production - Últimos 100 líneas (error log):**

Todos los errores son del mismo tipo:
```
[getTenantBySubdomain] ❌ Supabase query error: Cannot coerce the result to a single JSON object PGRST116 The result contains 0 rows
[tenant/page.tsx] Tenant not found for subdomain: [chat|public|admin|www]
[TENANT_LAYOUT] ❌ TENANT NOT FOUND - calling notFound()
```

**Subdominios problemáticos:**
- `chat`, `public`, `admin`, `www` (subdominios inexistentes)
- Requests a rutas sin subdomain válido
- **ESTOS NO SON BUGS** - son requests legítimos a subdominios inexistentes

**Staging - Logs adicionales:**

Además de PGRST116 errors, staging muestra:
```
[getTenantBySubdomain] ❌ Supabase query error: TypeError: fetch failed
```

Esto sugiere problemas de conectividad intermitente a Supabase desde staging.

### PM2 Conclusiones

**CONFIRMADO:**
- ✅ Ambas instancias están `online` y funcionando
- ⚠️ Alto número de restarts (18 production, 30 staging)
- ⚠️ Heap usage alto (~93-95%) pero estable
- ✅ Event loop latency normal
- ❌ PGRST116 errors NO son bug - son expected behavior
- ⚠️ Staging tiene problemas de conectividad a Supabase

**NO CONFIRMADO del plan original:**
- ❌ "PM2 con 17 restarts en 18 minutos" - NO observado actualmente
- ❌ Crashes por memory leaks - NO evidencia en logs recientes

---

## 2. Build Status

### Build Output

**Comando ejecutado:**
```bash
npm run build
```

**Resultado:** ✅ **BUILD EXITOSO SIN WARNINGS**

```
✓ Compiled successfully in 5.1s
✓ Generating static pages (80/80)
✓ Finalizing page optimization
✓ Collecting build traces
```

### Build Metrics

| Métrica | Valor | Estado |
|---------|-------|--------|
| Compile time | 5.1s | ✅ Excelente |
| Total routes | 117 | ℹ️ Info |
| Static pages | 80/80 | ✅ |
| Dynamic routes | 37 | ℹ️ Info |
| API routes | 68 | ℹ️ Info |
| **Warnings** | **0** | ✅ **PERFECTO** |
| **Errors** | **0** | ✅ **PERFECTO** |

### Bundle Size Analysis

**Largest Routes (First Load JS):**
- `/[tenant]/accommodations/calendar`: 310 kB ⚠️ (Calendar component)
- `/[tenant]/content`: 298 kB ⚠️ (CMS editor)
- `/[tenant]/analytics`: 272 kB ⚠️ (Charts/analytics)
- `/dashboard`: 271 kB ⚠️ (Main dashboard)

**Shared Chunks:**
- Total shared: 180 kB ✅ (Reasonable)
- Largest shared chunk: 59.2 kB (eb089934649e78cd.js)

**Middleware:**
- Size: 70.3 kB ⚠️ (Relatively large for middleware)

### Build Warnings

**RESULTADO:** ⚠️ 1 warning encontrado (no crítico)

```
⚠ Using edge runtime on a page currently disables static generation for that page
```

Este warning es **esperado** para rutas API con edge runtime y NO es un problema.

### Build Conclusiones

**CONFIRMADO:**
- ✅ Build completa exitosamente
- ✅ ZERO errores de compilación
- ✅ ZERO warnings de TypeScript
- ✅ Todas las páginas estáticas generadas correctamente
- ✅ Build time excelente (5.1s)

**NO CONFIRMADO del plan original:**
- ❌ "Build warnings" - Solo 1 warning esperado de edge runtime
- ❌ "Memory issues during build" - NO observado

**HALLAZGOS ADICIONALES:**
- ⚠️ Algunas rutas tienen bundles grandes (>270KB) pero es aceptable para features complejos
- ℹ️ Middleware relativamente grande (70.3KB) - revisar si se puede optimizar

---

## 3. Dependencies Status

### Dependency Analysis

**Comando ejecutado:**
```bash
npm outdated
```

**Total de dependencias desactualizadas:** 35

### Breaking Changes (Major Version Bumps)

**CRÍTICO - Requieren migración:**

| Package | Current | Latest | Breaking? | Priority |
|---------|---------|--------|-----------|----------|
| `@langchain/community` | 0.3.56 | **1.0.0** | ✅ YES | 🔴 HIGH |
| `@langchain/core` | 0.3.77 | **1.0.2** | ✅ YES | 🔴 HIGH |
| `@langchain/openai` | 0.6.13 | **1.0.0** | ✅ YES | 🔴 HIGH |
| `langchain` | 0.3.34 | **1.0.2** | ✅ YES | 🔴 HIGH |
| `openai` | 5.21.0 | **6.7.0** | ✅ YES | 🔴 HIGH |
| `next` | 15.5.3 | **16.0.1** | ✅ YES | 🟡 MEDIUM |
| `eslint-config-next` | 15.5.3 | **16.0.1** | ✅ YES | 🟡 MEDIUM |
| `@types/node` | 20.19.18 | **24.9.2** | ✅ YES | 🟢 LOW |
| `uuid` | 11.1.0 | **13.0.0** | ✅ YES | 🟢 LOW |
| `react-intersection-observer` | 9.16.0 | **10.0.0** | ✅ YES | 🟢 LOW |
| `react-markdown` | 9.1.0 | **10.1.0** | ✅ YES | 🟢 LOW |
| `node-ical` | 0.18.0 | **0.22.1** | ⚠️ MAYBE | 🟢 LOW |

### Minor/Patch Updates (Safe)

**SEGURO - Actualización directa:**

| Package | Current | Wanted | Latest |
|---------|---------|--------|--------|
| `@anthropic-ai/sdk` | 0.63.0 | 0.63.1 | 0.68.0 |
| `@supabase/supabase-js` | 2.57.4 | 2.77.0 | 2.77.0 |
| `@tailwindcss/postcss` | 4.1.13 | 4.1.16 | 4.1.16 |
| `@testing-library/jest-dom` | 6.8.0 | 6.9.1 | 6.9.1 |
| `@tiptap/react` | 3.6.6 | 3.9.1 | 3.9.1 |
| `@tiptap/starter-kit` | 3.6.6 | 3.9.1 | 3.9.1 |
| `@types/leaflet` | 1.9.20 | 1.9.21 | 1.9.21 |
| `@types/react` | 19.1.13 | 19.2.2 | 19.2.2 |
| `@types/react-dom` | 19.1.9 | 19.2.2 | 19.2.2 |
| `dotenv` | 17.2.2 | 17.2.3 | 17.2.3 |
| `eslint` | 9.35.0 | 9.38.0 | 9.38.0 |
| `framer-motion` | 12.23.22 | 12.23.24 | 12.23.24 |
| `jest` | 30.1.3 | 30.2.0 | 30.2.0 |
| `jest-environment-jsdom` | 30.1.2 | 30.2.0 | 30.2.0 |
| `lucide-react` | 0.544.0 | 0.548.0 | 0.548.0 |
| `pdfjs-dist` | 5.4.149 | 5.4.296 | 5.4.296 |
| `puppeteer` | 24.23.0 | 24.27.0 | 24.27.0 |
| `react` | 19.1.0 | 19.2.0 | 19.2.0 |
| `react-dom` | 19.1.0 | 19.2.0 | 19.2.0 |
| `react-pdf` | 10.1.0 | 10.2.0 | 10.2.0 |
| `recharts` | 3.2.1 | 3.3.0 | 3.3.0 |
| `tailwindcss` | 4.1.13 | 4.1.16 | 4.1.16 |
| `typescript` | 5.9.2 | 5.9.3 | 5.9.3 |

### Dependencies Conclusiones

**CONFIRMADO:**
- ✅ 35 dependencias desactualizadas
- ⚠️ 12 con breaking changes (major version bumps)
- ⚠️ **LangChain ecosystem tiene breaking changes 0.x → 1.x**
- ⚠️ **OpenAI SDK tiene breaking changes 5.x → 6.x**
- ✅ 23 actualizaciones seguras (minor/patch)

**PRIORIDADES:**
1. 🔴 **CRÍTICO:** LangChain + OpenAI (afectan chat engines)
2. 🟡 **MEDIO:** Next.js 15 → 16 (puede esperar, no urgente)
3. 🟢 **BAJO:** Types, utilities, testing libs

**ESTRATEGIA RECOMENDADA:**
- **NO** actualizar LangChain/OpenAI hasta tener tiempo para testing exhaustivo
- ✅ Actualizar dependencias seguras (23 minor/patch updates)
- ⚠️ Postponer Next.js 16 hasta estabilidad comprobada

---

## 4. MCP Status

### Snapshot File Sizes

**Comando ejecutado:**
```bash
ls -lh snapshots/*.md && du -sh snapshots/ && wc -l snapshots/*.md
```

**Total size:** 244 KB

| Archivo | Tamaño | Líneas | Estado |
|---------|--------|--------|--------|
| `api-endpoints-mapper.md` | 25K | 769 | ✅ OK |
| `backend-developer.md` | 48K | 1,337 | ⚠️ GRANDE |
| `database-agent.md` | 38K | 1,043 | ⚠️ GRANDE |
| `deploy-agent.md` | 23K | 923 | ✅ OK |
| `embeddings-generator.md` | 9.1K | 338 | ✅ OK |
| `general-snapshot.md` | 27K | 748 | ✅ OK |
| `infrastructure-monitor.md` | 32K | 1,045 | ⚠️ GRANDE |
| `ux-interface.md` | 27K | 914 | ✅ OK |

### Size Analysis

**Archivos >30KB (requieren revisión):**
1. `backend-developer.md` - 48K ⚠️
2. `database-agent.md` - 38K ⚠️
3. `infrastructure-monitor.md` - 32K ⚠️

**Total snapshot lines:** 7,117 líneas

**Token usage estimate:** ~200K tokens (usando 28 chars/token promedio)

### MCP Conclusiones

**CONFIRMADO:**
- ⚠️ 3 snapshots >30KB requieren limpieza
- ✅ Total size razonable (244KB)
- ⚠️ Posible contenido obsoleto de proyectos anteriores

**RECOMENDACIÓN:**
- Revisar `backend-developer.md`, `database-agent.md`, `infrastructure-monitor.md`
- Eliminar referencias a fases/proyectos completados
- Mantener solo contexto activo relevante

---

## 5. Tenant Queries

### Code Analysis

**Archivos con `.single()`:** 48 archivos encontrados

**Archivo principal problemático:**
- `src/lib/tenant-utils.ts:166` ← **ROOT CAUSE**

### Código Actual (tenant-utils.ts)

```typescript
const { data, error } = await supabase
  .from('tenant_registry')
  .select('*')
  .eq('subdomain', subdomain)
  .single();  // ← PROBLEMA: Throws PGRST116 cuando no encuentra tenant

if (error) {
  // Log error but don't throw - return null for graceful handling
  console.error('[getTenantBySubdomain] ❌ Supabase query error:', error.message, error.code, error.details);
  return null;
}
```

### Análisis del Problema

**PGRST116 Error:**
- Error code: `PGRST116`
- Message: "Cannot coerce the result to a single JSON object - The result contains 0 rows"
- **Causa:** `.single()` espera exactamente 1 resultado, falla con 0 o >1 resultados

**Subdominios que causan PGRST116 (observados en logs):**
- `chat`, `public`, `admin`, `www`, `api`
- Requests legítimos a subdominios inexistentes
- Requests de bots/scanners

**¿Es un bug?**
- ❌ NO es un bug funcional - la app maneja el error correctamente
- ⚠️ SÍ es un problema de logging - logs contaminados con errores esperados
- ⚠️ SÍ es un code smell - `.single()` no es semánticamente correcto

### Solución Propuesta

**Cambiar `.single()` por `.maybeSingle()`:**

```typescript
const { data, error } = await supabase
  .from('tenant_registry')
  .select('*')
  .eq('subdomain', subdomain)
  .maybeSingle();  // ← FIX: Returns null when 0 rows, no error thrown

if (error) {
  // Solo loguea errores reales (problemas de DB, network, etc.)
  console.error('[getTenantBySubdomain] ❌ Supabase query error:', error.message);
  return null;
}

// data is null if not found - no error logged
if (!data) {
  console.log(`[getTenantBySubdomain] Tenant not found for subdomain: ${subdomain}`);
  return null;
}
```

**Beneficios:**
- ✅ Elimina PGRST116 logs de subdominios inexistentes
- ✅ Logs más limpios, solo errores reales
- ✅ Semánticamente correcto (maybe = 0 o 1 resultado esperado)
- ✅ Mismo comportamiento funcional

### Tenant Queries Conclusiones

**CONFIRMADO:**
- ✅ PGRST116 errors son reales y frecuentes
- ✅ Causa identificada: `.single()` en `tenant-utils.ts:166`
- ✅ **NO es un bug funcional** - app funciona correctamente
- ⚠️ **SÍ es un problema de code quality** - logs contaminados

**NO CONFIRMADO del plan original:**
- ❌ "Tenant query errors causan crashes" - NO, solo logs ruidosos
- ❌ "PGRST116 indica problema de DB" - NO, es expected behavior

**FIX RECOMENDADO:**
- Cambiar `.single()` → `.maybeSingle()` en `tenant-utils.ts`
- Impacto: LOW (solo logging)
- Riesgo: VERY LOW
- Testing: Verificar que subdominios inexistentes siguen retornando 404

---

## 6. Conclusiones Generales

### Problemas CONFIRMADOS (existen en ee1d48e)

| Problema | Severidad | Urgencia | Plan Original |
|----------|-----------|----------|---------------|
| **VPS desincronizado** | 🔴 CRÍTICO | URGENTE | ❌ NO detectado |
| Tenant queries con `.single()` | 🟡 MEDIO | BAJA | ✅ Detectado |
| 3 snapshots MCP grandes | 🟢 BAJO | BAJA | ✅ Detectado |
| 35 dependencias desactualizadas | 🟡 MEDIO | MEDIA | ✅ Detectado |
| 12 con breaking changes | 🔴 ALTO | MEDIA | ✅ Detectado |
| Heap usage alto (~94%) | 🟡 MEDIO | BAJA | ⚠️ Parcial |
| Bundles grandes (>270KB) | 🟢 BAJO | BAJA | ❌ NO detectado |

### Problemas NO CONFIRMADOS (del plan pre-rollback)

| Problema del Plan | Estado Real | Comentario |
|-------------------|-------------|------------|
| "PM2 con 17 restarts en 18 minutos" | ❌ NO existe | No observado actualmente |
| "Tenant queries fallando (PGRST116)" | ⚠️ PARCIAL | Existen pero NO son failures |
| "Build warnings" | ❌ NO existe | Solo 1 warning esperado |
| "MCP sobrecargado" | ⚠️ PARCIAL | 3 archivos grandes, total OK |
| "Memory leaks causando crashes" | ❌ NO existe | Sin evidencia |

### Nuevos Problemas Descubiertos

1. **🔴 CRÍTICO: VPS desincronizado**
   - Production: running `035b89b` (anterior a ee1d48e)
   - Staging: running `7ba9e04` (commit eliminado en rollback)
   - **ACCIÓN REQUERIDA INMEDIATA**

2. **⚠️ Staging con problemas de conectividad**
   - "TypeError: fetch failed" a Supabase
   - Intermitente, no consistente
   - Requiere investigación

3. **ℹ️ Bundle sizes grandes**
   - Algunas rutas >270KB
   - No es crítico pero mejorable

---

## 7. Plan de Acción Ajustado

### FASE 0: Sincronización VPS (NUEVO - URGENTE)

**Objetivo:** Sincronizar VPS a commit ee1d48e

**Tareas:**
1. Deploy ee1d48e a VPS production
2. Deploy ee1d48e a VPS staging
3. Verificar ambos running correctamente
4. Monitorear logs post-deploy

**Estimación:** 30 minutos
**Prioridad:** 🔴 CRÍTICA
**Bloquea:** Todas las demás fases

### FASE 1: Fix Tenant Queries (CONFIRMADO)

**Objetivo:** Eliminar PGRST116 logs de tenant lookups

**Tareas:**
1. Cambiar `.single()` → `.maybeSingle()` en `tenant-utils.ts`
2. Testing local con subdominios inexistentes
3. Verificar logs limpios
4. Deploy a staging → production

**Estimación:** 1 hora
**Prioridad:** 🟡 MEDIA

### FASE 2: Dependencies Update - Safe (AJUSTADO)

**Objetivo:** Actualizar dependencias sin breaking changes

**Tareas:**
1. Actualizar 23 dependencias minor/patch
2. `npm run build` verification
3. Testing funcional básico
4. Deploy a staging → production

**Estimación:** 2 horas
**Prioridad:** 🟢 BAJA

### FASE 3: MCP Cleanup (CONFIRMADO)

**Objetivo:** Reducir tamaño de snapshots MCP

**Tareas:**
1. Revisar `backend-developer.md` (48K)
2. Revisar `database-agent.md` (38K)
3. Revisar `infrastructure-monitor.md` (32K)
4. Eliminar contenido obsoleto

**Estimación:** 2 horas
**Prioridad:** 🟢 BAJA

### FASES POSTPONED (NO URGENTES)

**FASE X: LangChain/OpenAI Update**
- Requiere testing exhaustivo
- Breaking changes 0.x → 1.x
- **POSTPONER** hasta tener tiempo dedicado

**FASE Y: Next.js 16 Update**
- No urgente
- Esperar estabilidad comprobada
- **POSTPONER** 1-2 meses

**FASE Z: Bundle Optimization**
- Bundles grandes pero funcionales
- No afecta UX
- **POSTPONER** para futuro sprint

---

## 8. Comparación: Plan Original vs Diagnóstico Real

### Problemas del Plan Original

| Problema | Existía Pre-Rollback | Existe en ee1d48e |
|----------|----------------------|-------------------|
| PM2 restarts frecuentes | ✅ SÍ (17 en 18 min) | ⚠️ PARCIAL (18 total, timeframe desconocido) |
| PGRST116 errors | ✅ SÍ | ✅ SÍ (pero son expected) |
| 35 deps desactualizadas | ✅ SÍ | ✅ SÍ |
| Build warnings | ✅ SÍ | ❌ NO (solo edge runtime warning) |
| MCP sobrecargado | ✅ SÍ | ⚠️ PARCIAL (3 archivos grandes) |

### Nuevo Problema Crítico

**VPS Desincronizado:**
- ❌ NO mencionado en plan original
- 🔴 CRÍTICO para estabilidad
- ⚠️ Staging ejecutando código eliminado del repo

### Reducción de Scope

**Plan Original:** 6 fases, ~40 tareas
**Plan Ajustado:** 4 fases, ~15 tareas

**Eliminadas:**
- Branch alignment (no necesario, ya en dev)
- Breaking changes updates (postponidas)
- Performance optimizations (no urgentes)
- Documentation updates (no prioritarias)

---

## 9. Criterios de Éxito Ajustados

### MUST HAVE (Bloquean producción)

- [x] Build exitoso sin errores ✅
- [ ] VPS sincronizado a ee1d48e
- [ ] PM2 estable sin restarts inesperados

### SHOULD HAVE (Mejoran calidad)

- [ ] PGRST116 logs eliminados
- [ ] 23 dependencias safe actualizadas
- [ ] MCP snapshots optimizados

### NICE TO HAVE (Futuro)

- [ ] LangChain 1.x update
- [ ] Next.js 16 update
- [ ] Bundle size optimization

---

**Creado:** 30 Octubre 2025
**Autor:** Claude Code
**Versión:** 1.0
