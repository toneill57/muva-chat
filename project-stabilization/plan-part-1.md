# Project Stabilization 2025 - PARTE 1/3
# Overview + Estado Actual

**Proyecto:** MUVA Platform Stabilization  
**Fecha Inicio:** 30 Octubre 2025  
**Estado:** 📋 Planificación  

---

## 🎯 OVERVIEW

### Objetivo Principal

Estabilizar el entorno de desarrollo y producción de MUVA Chat para garantizar un flujo de trabajo profesional, predecible y sin problemas de infraestructura antes de continuar con nuevas features.

### ¿Por qué?

**Problemas Críticos:**
- **PM2 inestable**: 17 restarts en 18 minutos (muva-chat), 30 restarts en 3 días (muva-chat-staging)
- **Tenant queries fallando**: Errores constantes "Cannot coerce to single JSON object PGRST116 The result contains 0 rows"
- **Branch confusion**: VPS en `dev` branch cuando debería estar alineado con estrategia staging → dev

**Problemas Importantes:**
- **Dependencias desactualizadas**: 35 paquetes con versiones atrasadas
  - LangChain 0.3.x → 1.0.x (BREAKING)
  - Supabase client 2.57.4 → 2.77.0 (20 versiones atrás)
  - OpenAI SDK 5.x → 6.x (BREAKING)
  - Next.js 15.5.3 → 16.0.1 (major version disponible)

**Problemas de Mantenimiento:**
- **MCP sobrecargado**: Contexto excesivo en snapshots que afecta performance
- **Warnings sin resolver**: Build exitoso pero con advertencias de memoria y deprecaciones
- **Falta documentación**: No hay workflow claro de desarrollo entre ambientes

### Alcance

- ✅ **FASE 1**: Resolver problemas críticos de PM2 y tenant queries
- ✅ **FASE 2**: Alinear estrategia de branches (staging → dev → main)
- ✅ **FASE 3**: Actualizar dependencias críticas de forma segura
- ✅ **FASE 4**: Limpiar y optimizar configuración MCP
- ✅ **FASE 5**: Eliminar warnings de build y memory leaks
- ✅ **FASE 6**: Documentar workflow profesional de desarrollo

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**VPS Production (195.200.6.216):**

```
Configuración Actual:
- OS: Ubuntu 22.04
- PM2 Instances: 2 activas
  - muva-chat (ID: 2, PID: 320023) → 17 restarts en 18min ⚠️
  - muva-chat-staging (ID: 1, PID: 250899) → 30 restarts en 3 días ⚠️
- Git Branch: dev (actual)
- Git Branches Disponibles: dev, staging, main
- Ambiente Activo: .env.local (producción)
```

**Archivos de Configuración:**
- ✅ `.env.local` → Producción (Supabase: ooaumjzaztmutltifhoq)
- ✅ `.env.staging` → Staging (Supabase: smdhgcpojpurvgdppufo)  
- ✅ `.env.local.backup*` → Múltiples backups (Oct 25, Oct 29)

**Supabase Configuration:**

```
Proyecto Principal: MUVA (ooaumjzaztmutltifhoq)
- Region: us-east-1
- Status: ACTIVE_HEALTHY
- Database: PostgreSQL 17.4.1.075

Branches Disponibles:
1. dev (ooaumjzaztmutltifhoq)
   - is_default: true
   - git_branch: "dev"
   - status: FUNCTIONS_DEPLOYED
   - Este es el PRINCIPAL

2. staging-clean-git (qcxklejqeukhqxstipmn)
   - is_default: false
   - persistent: false
   - status: FUNCTIONS_DEPLOYED
   - parent: ooaumjzaztmutltifhoq

3. staging-clean-final (qlvkgniqcoisbnwwjfte)
   - is_default: false
   - persistent: false
   - status: FUNCTIONS_DEPLOYED
   - parent: ooaumjzaztmutltifhoq

Proyecto Staging (smdhgcpojpurvgdppufo):
- Proyecto SEPARADO (no branch)
- Creado: Oct 25, 2025
- Costo: ~$10/month
- Usado en .env.staging del VPS
```

**Local Development:**

```
Build Status: ✅ EXITOSO
- Framework: Next.js 15.5.3 (Turbopack)
- Compilation: 5.3s
- Pages Generated: 80 (static + dynamic)
- Dev Script: ./scripts/dev-with-keys.sh ✅ funcionando

Environment Files:
- .env.local ✅
- .env.sandbox ✅  
- .env.production ✅
- .env.example ✅

Package Manager:
- npm con --legacy-peer-deps (conflictos de dependencias)
- Node.js 20.x
```

**PM2 Logs (Últimos errores):**

```
Error Pattern (muva-chat):
2025-10-29T22:06:32: [getTenantBySubdomain] ❌ Supabase query error: 
  Cannot coerce the result to a single JSON object PGRST116 
  The result contains 0 rows

Subdomain: admin (no encontrado)
Action: TENANT_LAYOUT calling notFound()

Frequency: ~10-15 errores/hora
Impacto: 404s para subdominios inexistentes (esperado) 
         pero causa restarts (NO esperado)
```

---

### Limitaciones Actuales

**Infraestructura:**

❌ **PM2 Unstable**
- 17 restarts en 18 minutos es CRÍTICO
- Posibles causas:
  - Memory leak (heap overflow)
  - Uncaught exceptions propagando
  - OOM killer activándose
  - Configuración PM2 incorrecta (max_memory_restart muy bajo)

❌ **Tenant Query Errors**
- Error: "Cannot coerce to single JSON object PGRST116"
- Causa: `.single()` usado cuando query retorna 0 rows
- Solución probable: usar `.maybeSingle()` en `getTenantBySubdomain()`
- Impacto: Logs contaminados, posibles restarts

❌ **Branch Mismatch**
- VPS en branch `dev` cuando debería estar en `staging` según estrategia deseada
- Confusión entre:
  - Git branches (dev, staging, main)
  - Supabase branches (dev default, staging-clean-*)
  - Supabase projects (MUVA vs Staging separado)

❌ **No hay Toggle de Ambientes**
- No existe script simple para cambiar entre `.env.staging` ↔ `.env.production`
- Cambios manuales propensos a error
- No hay validación de variables requeridas

**Dependencias:**

❌ **Breaking Changes Pendientes**
```
Critical:
- @langchain/community: 0.3.56 → 1.0.0 (BREAKING)
- @langchain/core: 0.3.77 → 1.0.2 (BREAKING)  
- @langchain/openai: 0.6.13 → 1.0.0 (BREAKING)
- openai: 5.21.0 → 6.7.0 (BREAKING)

Important:
- @supabase/supabase-js: 2.57.4 → 2.77.0 (20 versions behind)
- @anthropic-ai/sdk: 0.63.0 → 0.68.0 (5 versions)
- next: 15.5.3 → 16.0.1 (major available, evaluate risk)

Minor but many:
- 28 additional packages with updates available
```

❌ **--legacy-peer-deps Required**
- Peer dependency conflicts no resueltos
- Aumenta riesgo de incompatibilidades
- Dificulta actualizaciones futuras

**MCP & Contexto:**

❌ **Snapshots Sobrecargados**
- Snapshots con información de proyectos completados
- Contexto redundante entre agentes
- Tamaño excesivo (estimado >50KB por snapshot)
- Afecta performance de invocación de agentes

❌ **Knowledge Graph sin Optimizar**
- Nodos obsoletos de proyectos anteriores
- Relaciones no actualizadas
- Falta limpieza regular

❌ **Configuración MCP Supabase**
- SUPABASE_ACCESS_TOKEN presente pero no validado
- Conexión funcional pero sin optimización
- Falta documentación de uso correcto

**Build Quality:**

✅ **Build Limpio Confirmado** (Diagnóstico ee1d48e)
- Compile time: 5.1s (excelente)
- Total warnings: 0 críticos (solo 1 warning esperado de edge runtime)
- TypeScript errors: 0
- Build exitoso y limpio

⚠️ **Oportunidades de Mejora:**
- Sin baseline documentado (FASE 5 lo establecerá)
- Sin monitoreo automático de performance
- Bundle size: Algunas rutas >270KB (aceptable para features complejos)
- Memory usage: No hay métricas establecidas

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Ambiente Estable y Predecible:**

✅ **PM2 Robusto**
- Cero restarts inesperados (>24h estable)
- Configuración optimizada (max_memory_restart, instances)
- Monitoring automático con alertas
- Logs limpios sin errores repetitivos

✅ **Queries Funcionando**
- `getTenantBySubdomain()` sin errores PGRST116
- Manejo correcto de subdominios inexistentes
- Logs informativos, no errores
- Performance optimizado (<50ms)

✅ **Branch Strategy Clara**
```
Flujo de Trabajo:
staging (git) → dev (git) → main (git - no usar por ahora)
    ↓              ↓             ↓
Supabase      Supabase      Supabase
"Staging"     "dev"         (futuro)
(separado)    (principal)

Uso:
- staging: Experimentar, romper cosas, probar breaking changes
- dev: Ambiente estable de desarrollo, features consolidadas
- main: Reservado para producción real (no usar aún)
```

✅ **Toggle Simple de Ambientes**
- Script: `npm run env:staging` / `npm run env:production`
- Validación automática de variables requeridas
- Backup automático antes de cambiar
- Confirmación de ambiente activo

**Dependencias Actualizadas:**

✅ **Sin Breaking Changes Pendientes**
- LangChain actualizado a 1.0.x con código adaptado
- OpenAI SDK 6.x con migraciones completadas
- Supabase client actualizado a 2.77.0
- Tests pasando después de cada actualización

✅ **Sin --legacy-peer-deps**
- Conflictos de dependencias resueltos
- package-lock.json limpio
- npm install sin warnings

✅ **Versiones Estables**
- Todas las dependencias en versiones LTS o estables
- Changelog revisado para breaking changes
- Rollback plan documentado

**MCP Optimizado:**

✅ **Snapshots Limpios**
- <20KB por snapshot (vs >50KB actual)
- Solo contexto relevante del proyecto actual
- Información obsoleta removida
- Estructura clara por dominio

✅ **Knowledge Graph Actualizado**
- Nodos de proyecto actual únicamente
- Relaciones validadas
- Documentación de uso

✅ **Conexión MCP Validada**
- Tests de conexión a Supabase MCP
- Documentación de comandos útiles
- Ejemplos de uso por agente

**Build Limpio:**

✅ **Cero Warnings Críticos**
- Build output limpio
- Deprecation notices resueltos
- Memory leak warnings investigados
- Bundle optimizado

✅ **Performance Baseline Documentado**
```
Targets:
- Build time: <60s (local)
- Bundle size: <200kB First Load JS (promedio)
- Memory usage: <250MB per PM2 instance
- Startup time: <2s (VPS)
```

### Características Clave

**Workflow Documentado:**
- ✅ Guía completa de desarrollo por ambiente
- ✅ Comandos útiles documentados
- ✅ Troubleshooting guide con soluciones comunes
- ✅ Pre-deploy checklist validado

**Scripts de Utilidad:**
- ✅ `scripts/toggle-env.sh` - Cambiar entre ambientes
- ✅ `scripts/validate-env.sh` - Validar configuración
- ✅ `scripts/deploy-staging.sh` - Deploy a staging
- ✅ `scripts/deploy-dev.sh` - Deploy a dev

**Monitoring:**
- ✅ PM2 dashboard configurado
- ✅ Logs centralizados
- ✅ Alertas de restart
- ✅ Health checks automáticos

**Testing:**
- ✅ Tests de estabilidad (PM2, queries)
- ✅ Tests de integración (Supabase connections)
- ✅ Performance tests (bundle, memory)

---

**Continúa en plan-part-2.md (Fases 1-3)**

**Última actualización:** 30 Octubre 2025
