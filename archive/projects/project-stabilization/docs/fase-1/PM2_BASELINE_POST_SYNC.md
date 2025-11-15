# 📊 PM2 Baseline - Post FASE 0 Sync

**Fecha:** 30 Octubre 2025, 04:16 UTC
**Commit:** `ee1d48e`
**Objetivo:** Baseline de métricas PM2 después de sincronización VPS

---

## Production (muva-chat)

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Status** | online | ✅ |
| **Uptime** | 61 minutos | ✅ |
| **Restarts** | 18 (históricos) | ⚠️ |
| **Memory** | 241.9 MB | ⚠️ |
| **Heap Usage** | 95.15% | 🚨 |
| **CPU** | 0% | ✅ |
| **Event Loop Latency** | 0.33ms | ✅ |
| **Event Loop p95** | 1.09ms | ✅ |
| **Unstable Restarts** | 0 | ✅ |
| **Commit** | ee1d48e | ✅ |
| **Branch** | staging | ⚠️ **INCORRECTO** |

**Observaciones:**
- ✅ 0 restarts desde FASE 0 sync (61 minutos estable)
- 🚨 Heap usage CRÍTICO (95.15%) - requiere `max_memory_restart`
- ⚠️ Branch incorrecto (`staging` vs `dev`) - corregir
- ✅ Latencias normales, sin memory leaks activos
- ⚠️ PGRST116 errors frecuentes (esperados, fix en FASE 1.2)

---

## Staging (muva-chat-staging)

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Status** | online | ✅ |
| **Uptime** | 8 minutos | ⏸️ |
| **Restarts** | 31 (+1 por sync) | ⚠️ |
| **Memory** | 216.9 MB | ⚠️ |
| **Heap Usage** | 93.63% | 🚨 |
| **CPU** | 0% | ✅ |
| **Event Loop Latency** | 0.37ms | ✅ |
| **Event Loop p95** | 1.13ms | ✅ |
| **Unstable Restarts** | 0 | ✅ |
| **Commit** | ee1d48e | ✅ |
| **Branch** | dev | ✅ |

**Observaciones:**
- 🚨 **CRÍTICO:** `TypeError: fetch failed` al conectar a Supabase
- 🚨 Memory aumentó 25% vs pre-sync (173.5 MB → 216.9 MB)
- 🚨 Tenant válido `simmerdown` NO puede conectar
- ⚠️ Staging **NO FUNCIONAL** - requiere acción inmediata
- ⚠️ Posible problema con `.env.local` o network ACL

---

## Comparación Pre-Sync → Post-Sync

### Production

| Métrica | Pre-Sync | Post-Sync | Δ |
|---------|----------|-----------|---|
| Commit | 035b89b | ee1d48e | ✅ +sync |
| Restarts | 18 | 18 | ✅ +0 |
| Memory | 209.1 MB | 241.9 MB | ⚠️ +15.6% |
| Heap | 94.68% | 95.15% | ⚠️ +0.47% |

**Resultado:** ✅ **ESTABLE** - sync exitoso sin degradación

---

### Staging

| Métrica | Pre-Sync | Post-Sync | Δ |
|---------|----------|-----------|---|
| Commit | 7ba9e04 | ee1d48e | ✅ +sync |
| Restarts | 30 | 31 | ⏸️ +1 (esperado) |
| Memory | 173.5 MB | 216.9 MB | 🚨 +25% |
| Heap | 92.71% | 93.63% | ⚠️ +0.92% |
| Fetch Errors | Algunos | **ALTA FRECUENCIA** | 🚨 Empeoró |

**Resultado:** 🚨 **DEGRADADO** - requiere investigación inmediata

---

## Errores en Logs

### Production - PGRST116 (esperado)

```
[getTenantBySubdomain] ❌ Supabase query error:
Cannot coerce the result to a single JSON object PGRST116
The result contains 0 rows
```

- Subdominios: `chat`, `public`, `admin`, `www`, `api`
- Frecuencia: ~20 errores en logs recientes
- **NO es bug** - comportamiento esperado
- **Fix en FASE 1.2:** `.single()` → `.maybeSingle()`

---

### Staging - Fetch Failed 🚨

```
[getTenantBySubdomain] ❌ Supabase query error:
TypeError: fetch failed
    at node:internal/deps/undici/undici:13510:13
```

- Subdominios afectados: `api`, `simmerdown` (válido!), sin subdomain
- Frecuencia: **MUY ALTA** - logs saturados
- **CRÍTICO:** Staging NO puede conectar a Supabase
- **Requiere acción inmediata**

---

## Configuración PM2 Actual

**NO existe `ecosystem.config.js`** ⚠️

PM2 configurado con comandos directos (sin config file):

```bash
pm2 start npm --name "muva-chat" -- start
pm2 start npm --name "muva-chat-staging" -- start --port 3001
```

**Problemas:**
- ❌ Sin `max_memory_restart` (heap al 95%)
- ❌ Sin `max_restarts` limit
- ❌ Sin `min_uptime` (anti-flapping)
- ❌ Sin logging estructurado
- ❌ Sin `restart_delay`

**FASE 1.3 creará ecosystem.config.js**

---

## Acciones Inmediatas Requeridas

### 🚨 CRÍTICO: Resolver Staging Connectivity

**Investigar:**
1. Verificar `.env.local` en staging
2. Test conectividad `curl` a Supabase
3. Comparar `.env` production vs staging
4. Verificar Supabase project ACL

**Comandos:**
```bash
ssh root@195.200.6.216

# Check .env
cat /var/www/muva-chat-staging/.env.local | grep SUPABASE

# Test conectividad
curl -I https://smdhgcpojpurvgdppufo.supabase.co
curl -I https://ooaumjzaztmutltifhoq.supabase.co

# Compare envs
diff /var/www/muva-chat/.env.local /var/www/muva-chat-staging/.env.local
```

---

### ⚠️ MEDIO: Corregir Branch Production

```bash
ssh root@195.200.6.216
cd /var/www/muva-chat
git checkout dev
git pull origin dev
pm2 restart muva-chat
```

---

## Criterios de Éxito - Baseline Documentado

- ✅ Production baseline: 18 restarts, 241.9 MB, heap 95.15%
- ✅ Staging baseline: 31 restarts, 216.9 MB, heap 93.63%
- ✅ Comparación pre/post-sync completada
- ✅ Problemas críticos identificados
- ⚠️ Staging requiere resolución antes de continuar

---

## Próximos Pasos FASE 1

1. ✅ **1.1 Diagnóstico PM2** - COMPLETADO
2. ⏭️ **1.2 Fix Tenant Query** (`.single()` → `.maybeSingle()`)
3. ⏭️ **1.3 Optimizar PM2 Config** (ecosystem.config.js)
4. ⏭️ **1.4 Tests de Estabilidad** (24h monitoring)
5. ⏭️ **1.5 Monitoring Script**
6. ⏭️ **1.6 Deployment y Validación**

**BLOQUEANTE:** Resolver staging connectivity antes de 1.6 (deployment)

---

**Baseline capturado:** ✅
**Siguiente tarea:** FASE 1.2 - Fix Tenant Query

**Última actualización:** 30 Octubre 2025, 04:16 UTC
