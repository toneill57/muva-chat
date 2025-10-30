# 🔍 PM2 Diagnostic Report - Post FASE 0 Sync

**Fecha:** 30 Octubre 2025
**Commit:** `ee1d48e` (post-FASE 0 sync)
**Responsable:** @agent-infrastructure-monitor
**Objetivo:** Documentar baseline PM2 post-sincronización y comparar con diagnóstico pre-sync

---

## 📊 Executive Summary

**Estado General:** 🟡 ESTABLE CON OBSERVACIONES

- ✅ Ambas instancias PM2 online y funcionando
- ⚠️ **Staging con 31 restarts** (+1 desde sync), incluye restarts del sync mismo
- ✅ **Production con 18 restarts** (sin cambios desde sync)
- ✅ Uptime actual: Production 61min, Staging 8min (post-sync)
- ⚠️ Staging muestra errores de conectividad Supabase (`TypeError: fetch failed`)
- ⚠️ Production muestra errores PGRST116 esperados (subdominios inexistentes)
- 🚨 **HALLAZGO CRÍTICO:** Production en branch `staging` (debería ser `dev`)

**Conclusión Principal:**
PM2 está **ESTABLE** - los restarts históricos NO son crashes activos sino deploys/mantenimiento. Sin embargo, staging muestra problemas de conectividad a Supabase que requieren investigación.

---

## 1. Estado Actual PM2 (Post-FASE 0)

### Production Instance (muva-chat)

```
┌─────────────────────┬──────────────────────────────┐
│ Status              │ online ✅                     │
│ Name                │ muva-chat                    │
│ Uptime              │ 61 minutos                   │
│ Restarts            │ 18 (sin cambios vs pre-sync) │
│ Memory              │ 241.9 MB (↑ desde 209.1 MB) │
│ CPU                 │ 0%                           │
│ Unstable Restarts   │ 0 ✅                         │
│ Exec Mode           │ cluster_mode                 │
│ Node.js             │ 22.20.0                      │
└─────────────────────┴──────────────────────────────┘
```

**Code Metrics:**
- Used Heap Size: 96.57 MiB
- Heap Usage: **95.15%** ⚠️ (↑ desde 94.68%)
- Event Loop Latency: 0.33ms ✅ (normal)
- Event Loop Latency p95: 1.09ms ✅ (normal)
- HTTP Mean Latency: 47ms ✅

**Git Status:**
- Commit actual: `ee1d48e` ✅ (correcto)
- **Branch actual: `staging`** ⚠️ (debería ser `dev`)
- PM2 metadata: `035b89b` (desactualizado, se actualiza en próximo restart)

**Análisis:**
- ✅ Instancia estable sin crashes nuevos
- ✅ 0 restarts desde el sync (61 minutos uptime)
- ⚠️ Heap usage muy alto (95.15%) - MONITOREAR
- ⚠️ Branch incorrecto (`staging` vs `dev`) - CORREGIR
- ✅ Latencias normales, CPU estable

---

### Staging Instance (muva-chat-staging)

```
┌─────────────────────┬──────────────────────────────┐
│ Status              │ online ✅                     │
│ Name                │ muva-chat-staging            │
│ Uptime              │ 8 minutos                    │
│ Restarts            │ 31 (+1 desde pre-sync)       │
│ Memory              │ 216.9 MB (↑ desde 173.5 MB) │
│ CPU                 │ 0%                           │
│ Unstable Restarts   │ 0 ✅                         │
│ Exec Mode           │ cluster_mode                 │
│ Node.js             │ 22.20.0                      │
└─────────────────────┴──────────────────────────────┘
```

**Code Metrics:**
- Used Heap Size: 88.81 MiB
- Heap Usage: **93.63%** ⚠️ (similar a pre-sync 92.71%)
- Event Loop Latency: 0.37ms ✅
- Event Loop Latency p95: 1.13ms ✅
- HTTP: No data (staging sin tráfico)

**Git Status:**
- Commit actual: `ee1d48e` ✅ (correcto post-sync)
- Branch actual: `dev` ✅ (correcto)
- PM2 metadata: `ee1d48e` ✅ (actualizado)

**Análisis:**
- 🚨 **1 restart adicional desde sync** (esperado - parte del sync)
- ⚠️ **Memory aumentó** de 173.5 MB → 216.9 MB (+25%)
- ⚠️ Heap usage alto (93.63%) pero estable
- 🚨 **Errores de conectividad Supabase frecuentes** (ver sección 2)

---

## 2. Análisis de Logs

### Production - Últimos Errores (200 líneas)

**Tipo de Error Dominante: PGRST116**

```
[getTenantBySubdomain] ❌ Supabase query error:
Cannot coerce the result to a single JSON object PGRST116
The result contains 0 rows
```

**Subdominios problemáticos:**
- `chat`, `public`, `admin`, `www`, `api`
- Requests a URLs sin subdomain válido

**Frecuencia:** ~20 errores en logs recientes

**Diagnóstico:**
- ✅ **NO ES BUG** - Comportamiento esperado
- ✅ App maneja correctamente (retorna 404)
- ⚠️ **SÍ ES CODE QUALITY ISSUE** - Logs contaminados
- 🎯 **Fix en FASE 1.2:** Cambiar `.single()` → `.maybeSingle()`

**Patrón de Restarts:**
- Último restart: `2025-10-30T03:15:33` (FASE 0 sync)
- Restart anterior: `2025-10-30T02:08:25`
- **Intervalo:** ~1 hora entre restarts históricos
- **Causa:** Deploys manuales, NO crashes

---

### Staging - Errores CRÍTICOS

**ERROR 1: PGRST116** (mismo que production)
```
[getTenantBySubdomain] ❌ Supabase query error: PGRST116
```

**ERROR 2: Conectividad Supabase** 🚨
```
[getTenantBySubdomain] ❌ Supabase query error: TypeError: fetch failed
    at node:internal/deps/undici/undici:13510:13
```

**Frecuencia:** Muy alta - logs saturados

**Subdominios afectados:**
- `api` (múltiples requests)
- `simmerdown` (tenant válido!) 🚨
- No subdomain (requests directos)

**Diagnóstico:**
- 🚨 **CRÍTICO:** Staging NO puede conectar a Supabase
- 🚨 **CRÍTICO:** Incluso tenant válido `simmerdown` falla
- ⚠️ Error `TypeError: fetch failed` sugiere:
  - Network issue VPS → Supabase
  - Firewall bloqueando conexiones
  - DNS resolution issue
  - `.env` con URL Supabase incorrecta

**Patrón de Restarts Staging:**
- Múltiples restarts en últimas 2 horas
- Último restart: `2025-10-30T04:08:24` (FASE 0 sync)
- **Causa probable:** Restarteando por crashes debido a fetch errors

---

## 3. Comparación Pre-Sync vs Post-Sync

### Production (muva-chat)

| Métrica | Pre-Sync | Post-Sync | Cambio |
|---------|----------|-----------|--------|
| Commit | 035b89b | ee1d48e | ✅ Sincronizado |
| Restarts | 18 | 18 | ✅ Sin cambios |
| Uptime | 13 min | 61 min | ✅ Estable |
| Memory | 209.1 MB | 241.9 MB | ⚠️ +15.6% |
| Heap Usage | 94.68% | 95.15% | ⚠️ +0.47% |
| PGRST116 Errors | Presentes | Presentes | ⏸️ Sin cambios (esperado) |
| Branch | dev | **staging** | ⚠️ Empeoró |

**Conclusión Production:**
- ✅ Sync exitoso (commit correcto)
- ✅ NO nuevos restarts post-sync
- ⚠️ Memory usage aumentó ligeramente
- ⚠️ Branch incorrecto requiere corrección

---

### Staging (muva-chat-staging)

| Métrica | Pre-Sync | Post-Sync | Cambio |
|---------|----------|-----------|--------|
| Commit | 7ba9e04 | ee1d48e | ✅ Sincronizado |
| Restarts | 30 | 31 | ⚠️ +1 (esperado) |
| Uptime | 4 días | 8 min | ⏸️ Reset por sync |
| Memory | 173.5 MB | 216.9 MB | 🚨 +25% |
| Heap Usage | 92.71% | 93.63% | ⚠️ +0.92% |
| PGRST116 Errors | Presentes | Presentes | ⏸️ Sin cambios |
| Fetch Errors | Presentes | **ALTA FRECUENCIA** | 🚨 Empeoró |

**Conclusión Staging:**
- ✅ Sync exitoso (commit correcto)
- 🚨 **Memory aumentó significativamente (+25%)**
- 🚨 **Errores de conectividad Supabase CRÍTICOS**
- ⚠️ Tenant válido (`simmerdown`) no puede conectar

---

## 4. Causa Raíz Identificada

### Production: ESTABLE

**Problema Original (plan):** "PM2 con 17 restarts en 18 minutos"

**Realidad (post-diagnóstico):**
- ❌ **NO observado** - Los 18 restarts son históricos
- ✅ **61 minutos sin restarts** post-sync
- ✅ Instance estable, sin crashes activos

**Causa Raíz:**
- ✅ **NO hay causa raíz** - restarts son normales (deploys)
- ⚠️ PGRST116 errors NO causan restarts (manejados correctamente)
- ⚠️ Heap usage alto (95%) pero estable - MONITOREAR

**Recomendación:**
- ✅ **NO requiere acción inmediata** en PM2 config
- ✅ Monitorear heap usage próximas 24h
- 🎯 Fix PGRST116 en FASE 1.2 (code quality)

---

### Staging: PROBLEMA CRÍTICO DETECTADO

**Problema Nuevo (post-sync):** Conectividad Supabase fallando

**Causa Raíz:**
1. **`.env.local` incorrecto o faltante**
   - Staging podría estar usando `.env.staging` con URL incorrecta
   - Supabase URL podría apuntar a proyecto staging (smdhgcpojpurvgdppufo)
   - Network ACL de Supabase podría bloquear IP del VPS

2. **Network/Firewall Issue**
   - VPS firewall bloqueando outbound a Supabase
   - DNS resolution fallando para `*.supabase.co`

3. **Memory Increase**
   - Memory aumentó 25% post-sync
   - Podría estar relacionado con retry loops por fetch errors

**Recomendación:**
- 🚨 **ACCIÓN INMEDIATA:** Verificar `.env` en staging
- 🚨 **ACCIÓN INMEDIATA:** Test conectividad `curl` a Supabase desde VPS
- ⚠️ Considerar apagar staging hasta resolver conectividad

---

## 5. Configuración PM2 Actual

### Método de Configuración

**NO existe `ecosystem.config.js`**

PM2 configurado mediante comandos directos:
```bash
pm2 start npm --name "muva-chat" -- start
pm2 start npm --name "muva-chat-staging" -- start --port 3001
pm2 save
```

**Configuración Actual (inferida de pm2 info):**

```javascript
// Production
{
  name: "muva-chat",
  script: "node_modules/next/dist/bin/next",
  args: "start",
  exec_mode: "cluster_mode",
  instances: 1, // (inferido)
  max_memory_restart: undefined, // ⚠️ NO CONFIGURADO
  autorestart: true, // (default)
  node_env: "production"
}

// Staging
{
  name: "muva-chat-staging",
  script: "node_modules/next/dist/bin/next",
  args: "start --port 3001",
  exec_mode: "cluster_mode",
  instances: 1, // (inferido)
  max_memory_restart: undefined, // ⚠️ NO CONFIGURADO
  autorestart: true,
  node_env: "production"
}
```

**Problemas Identificados:**
- ❌ NO existe `max_memory_restart` (heap al 95% sin límite)
- ❌ NO existe `max_restarts` limit
- ❌ NO existe `min_uptime` (anti-flapping)
- ❌ NO existe logging estructurado
- ❌ NO existe `restart_delay`

---

## 6. Recomendaciones de Configuración

### Crear `ecosystem.config.js`

**FASE 1.3 implementará:**

```javascript
module.exports = {
  apps: [
    {
      name: 'muva-chat',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/muva-chat',
      instances: 1,
      exec_mode: 'cluster',

      // Memory management
      max_memory_restart: '500M', // ✅ Límite antes de restart automático
      node_args: '--max-old-space-size=450',

      // Restart management
      autorestart: true,
      max_restarts: 10, // ✅ Máximo 10 restarts
      min_uptime: '10s', // ✅ No contar restart si <10s
      restart_delay: 4000, // ✅ 4s entre restarts

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'muva-chat-staging',
      script: 'npm',
      args: 'start -- --port 3001',
      cwd: '/var/www/muva-chat-staging',
      instances: 1,
      exec_mode: 'cluster',
      max_memory_restart: '400M', // Staging con menos memoria
      node_args: '--max-old-space-size=350',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

**Justificación de Configuración:**

1. **max_memory_restart: 500M (prod), 400M (staging)**
   - Current: 241.9 MB (prod), 216.9 MB (staging)
   - Headroom: ~100-200MB para evitar OOM
   - Restart automático si excede límite

2. **max_restarts: 10**
   - Prevenir restart loops infinitos
   - 10 restarts es suficiente para troubleshooting

3. **min_uptime: 10s**
   - No contar como "restart" si proceso vive <10s
   - Previene spam de restarts por crash inmediato

4. **restart_delay: 4000ms**
   - Esperar 4s entre restarts
   - Da tiempo a DB/network para estabilizarse

---

## 7. Tests de Estabilidad Recomendados

### Test 1: Monitoreo 24h (FASE 1.4)

**Baseline actual (iniciar):**
- Production restarts: 18
- Staging restarts: 31
- Production memory: 241.9 MB
- Staging memory: 216.9 MB

**Ejecutar después de 24h:**
```bash
pm2 info muva-chat | grep "restarts"
pm2 info muva-chat-staging | grep "restarts"
```

**Criterio de éxito:**
- ✅ 0 restarts adicionales en 24h
- ✅ Memory estable (<10% variación)
- ✅ Uptime >99.9%

---

### Test 2: Resolver Staging Connectivity (INMEDIATO)

**Acción 1: Verificar .env**
```bash
ssh root@195.200.6.216
cat /var/www/muva-chat-staging/.env.local | grep SUPABASE_URL
```

**Acción 2: Test conectividad**
```bash
curl -I https://smdhgcpojpurvgdppufo.supabase.co
curl -I https://ooaumjzaztmutltifhoq.supabase.co
```

**Acción 3: Comparar con production**
```bash
diff /var/www/muva-chat/.env.local /var/www/muva-chat-staging/.env.local
```

---

## 8. Criterios de Éxito FASE 1

### Baseline Documentado ✅

- ✅ Production: 18 restarts, 241.9 MB, heap 95.15%
- ✅ Staging: 31 restarts, 216.9 MB, heap 93.63%
- ✅ Comparación pre/post-sync completa
- ✅ Causa raíz identificada (no hay crashes activos)

### Próximos Pasos

1. **FASE 1.2:** Fix PGRST116 (`.single()` → `.maybeSingle()`)
2. **FASE 1.3:** Implementar ecosystem.config.js
3. **FASE 1.4:** Monitoring script (24h test)
4. **INMEDIATO:** Resolver staging connectivity

---

## 9. Hallazgos Adicionales

### 🚨 CRÍTICO: Production Branch Incorrecto

**Detectado:**
```bash
cd /var/www/muva-chat
git status
# On branch staging  # ❌ INCORRECTO
```

**Debería ser:**
```bash
# On branch dev  # ✅ CORRECTO
```

**Fix requerido:**
```bash
cd /var/www/muva-chat
git checkout dev
git pull origin dev
```

---

### 🚨 CRÍTICO: Staging Connectivity

**Problema:** `TypeError: fetch failed` al conectar a Supabase

**Impacto:**
- Staging completamente no funcional
- Tenant válido `simmerdown` no puede cargar
- Logs saturados con errores

**Requiere investigación inmediata antes de continuar FASE 1.2**

---

## 10. Conclusión

**PM2 Baseline Post-FASE 0:** 🟡 **ESTABLE CON OBSERVACIONES**

**Production:**
- ✅ Estable, sin crashes activos
- ✅ 61 minutos uptime sin restarts
- ⚠️ Heap usage alto (95%) - monitorear
- ⚠️ Branch incorrecto - corregir

**Staging:**
- 🚨 **NO FUNCIONAL** - Supabase connectivity fallando
- 🚨 Memory aumentó 25% post-sync
- ⚠️ Requiere acción inmediata

**FASE 1 puede continuar** con production, pero **staging debe resolverse** antes de testing completo.

---

**Documento generado:** 30 Octubre 2025
**Próxima revisión:** Post-FASE 1.3 (ecosystem.config.js implementado)
