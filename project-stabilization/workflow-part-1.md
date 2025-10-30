# Workflow Prompts - PARTE 1/3
# Contexto + FASE 0 (VPS Sync) + FASE 1 (Critical Diagnostics)

**Proyecto:** MUVA Platform Stabilization
**Prompts Coverage:** Contexto inicial + FASE 0 (VPS Sync) + FASE 1 (4 prompts)

**NOTA IMPORTANTE:** Este workflow ha sido actualizado con hallazgos REALES del diagnóstico desde commit `f9f6b27`. Ver `DIAGNOSTICO-f9f6b27.md` para detalles completos.

---

## Prompt 0.0: Contexto Inicial del Proyecto

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Leer y comprender el contexto completo del proyecto "Project Stabilization 2025"

CONTEXTO:
- Proyecto: MUVA Platform Stabilization
- Objetivo: Estabilizar infraestructura antes de continuar con nuevas features
- Duración Estimada: 15-20 horas
- 7 Fases: VPS Sync (COMPLETADA), Critical (COMPLETADA), Branches (COMPLETADA), Dependencies (Grupo 1 COMPLETADO), MCP, Warnings, Docs
- Diagnóstico Real: project-stabilization/DIAGNOSTICO-f9f6b27.md
- Plan Ajustado: project-stabilization/EJECUCION-PLAN.md
- Base Commit: f9f6b27 (incluye deploy optimizations, dependency fixes, build cache)

ESPECIFICACIONES:
1. Leer los siguientes archivos en orden:
   - project-stabilization/README.md
   - project-stabilization/DIAGNOSTICO-f9f6b27.md (HALLAZGOS REALES)
   - project-stabilization/EJECUCION-PLAN.md (PLAN AJUSTADO)
   - project-stabilization/plan-part-2.md (Fases 2-3)
   - project-stabilization/plan-part-3.md (Fases 4-6)
   - project-stabilization/TODO.md

2. Familiarizarte con los problemas críticos RESUELTOS:
   - ✅ COMPLETADO: 23 dependencias actualizadas (commit a2e3bd4)
   - ✅ COMPLETADO: Deploy errors fixed (nginx SSL, axios CVEs)
   - ✅ COMPLETADO: Build cache configured (f9f6b27)
   - 🟢 PENDIENTE: 3 snapshots MCP grandes (>30KB)

3. Comprender la estrategia:
   - 7 fases secuenciales (3 primeras COMPLETADAS)
   - Validación después de cada fase
   - NO commitear sin autorización
   - Dependencies: Grupo 1 ✅ COMPLETADO - Grupos 2-3 PENDIENTES

4. Reportar comprensión del proyecto con:
   - Resumen de problemas críticos RESUELTOS y PENDIENTES
   - Estado actual: f9f6b27 (todos los ambientes sincronizados)
   - Fases completadas (0, 1, 2, 3 Grupo 1)
   - Fases pendientes (3 Grupos 2-3, 4-6)
   - Agentes involucrados
   - Siguiente paso (FASE 4 - MCP Optimization)

TEST:
- Lectura completa de archivos de planificación
- Comprensión de DIAGNOSTICO-f9f6b27.md (hallazgos reales)
- Comprensión de estado actual (3 fases completadas)

SIGUIENTE: FASE 4 (MCP Optimization) - Ver workflow-part-3.md
```

---

## FASE 0: VPS Synchronization 🔴 (CRÍTICO)

**HALLAZGO RESUELTO:** Durante el diagnóstico se descubrió que los ambientes VPS NO estaban sincronizados. Production estaba en `035b89b` y Staging en `7ba9e04`. **Esta fase fue completada exitosamente** - todos los ambientes ahora en `f9f6b27`.

---

### Prompt 0.1: Sincronización VPS Production y Staging

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Sincronizar ambos ambientes VPS al commit f9f6b27 (estado actual optimizado)

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 0 (✅ COMPLETADA)
- Ver: project-stabilization/EJECUCION-PLAN.md (FASE 0)
- Ver: project-stabilization/DIAGNOSTICO-f9f6b27.md (sección "HALLAZGO CRÍTICO")
- Estado: Todos los ambientes sincronizados a f9f6b27
- VPS: 195.200.6.216
- Commit Base: f9f6b27

ESPECIFICACIONES:

**PARTE 1: Sincronizar VPS Production**

1. Conectar a VPS y verificar estado actual:
   ```bash
   sshpass -p 'rabbitHole0+' ssh -o StrictHostKeyChecking=no root@195.200.6.216

   cd /var/www/muva-chat
   git log -1 --oneline
   # Esperado: 035b89b (incorrecto)
   ```

2. Sincronizar a ee1d48e:
   ```bash
   git fetch origin dev
   git checkout dev
   git reset --hard f9f6b27

   # Verificar
   git log -1 --oneline
   # Debe mostrar: f9f6b27 perf(build): configure Next.js build cache settings
   ```

3. Rebuild y restart:
   ```bash
   npm ci
   npm run build
   pm2 restart muva-chat

   # Monitorear
   pm2 logs muva-chat --lines 50
   ```

4. Verificación:
   ```bash
   pm2 show muva-chat
   # Status debe ser: online
   # Verificar que no hay errores en logs iniciales
   ```

**PARTE 2: Sincronizar VPS Staging**

1. Mismo VPS, directorio staging:
   ```bash
   cd /var/www/muva-chat-staging
   git log -1 --oneline
   # Esperado: 7ba9e04 (CÓDIGO ELIMINADO - crítico)
   ```

2. Sincronizar a ee1d48e:
   ```bash
   git fetch origin dev
   git checkout dev
   git reset --hard f9f6b27

   # Verificar
   git log -1 --oneline
   # Debe mostrar: f9f6b27
   ```

3. Rebuild y restart:
   ```bash
   npm ci
   npm run build
   pm2 restart muva-chat-staging

   # Monitorear
   pm2 logs muva-chat-staging --lines 50
   ```

**PARTE 3: Verificación Final de Sincronización**

1. Verificar ambos en ee1d48e:
   ```bash
   cd /var/www/muva-chat && git log -1 --oneline
   cd /var/www/muva-chat-staging && git log -1 --oneline
   # Ambos deben mostrar: f9f6b27
   ```

2. Verificar ambos procesos online:
   ```bash
   pm2 list
   # muva-chat: online ✅
   # muva-chat-staging: online ✅
   ```

**PARTE 4: Monitoreo Post-Sincronización (15 minutos)**

1. Monitorear estabilidad inicial:
   ```bash
   # Esperar 15 minutos, luego:
   pm2 list
   # Verificar: 0 restarts adicionales

   pm2 logs muva-chat --lines 100 --nostream | grep -i error
   pm2 logs muva-chat-staging --lines 100 --nostream | grep -i error
   # Verificar: No errores críticos
   ```

2. Verificar funcionamiento:
   ```bash
   # Probar URL production
   curl -I https://simmerdown.muva.chat
   # Expected: 200 OK

   # Probar URL staging
   curl -I https://simmerdown.staging.muva.chat
   # Expected: 200 OK
   ```

**PARTE 5: Documentar Resultados**

1. Crear: project-stabilization/docs/fase-0/VPS_SYNC_RESULTS.md
   - Commits antes/después (ambos ambientes)
   - Output de builds (exitosos/fallidos)
   - Status PM2 post-sync
   - Errores encontrados (si hay)
   - Tiempo de downtime (si hubo)

**CRITERIOS DE ÉXITO FASE 0:** ✅ TODOS COMPLETADOS
- ✅ VPS production en commit f9f6b27
- ✅ VPS staging en commit f9f6b27
- ✅ Ambos procesos PM2 online
- ✅ 0 restarts en primeros 15 minutos
- ✅ Build exitoso en ambos
- ✅ URLs respondiendo correctamente
- ✅ Logs sin errores críticos

TEST: ✅ COMPLETADO
- git log -1 en ambos directorios (f9f6b27)
- pm2 list (ambos online, 0 restarts)
- curl a URLs (200 OK)
- Documentación VPS_SYNC_RESULTS.md creada

SIGUIENTE: Prompt 1.1 (Diagnóstico PM2) ✅ YA COMPLETADO

✅ FASE 0 COMPLETADA EXITOSAMENTE
```

---

## FASE 1: Critical Diagnostics 🔥

**NOTA FASE 1:** ✅ COMPLETADA. Según diagnóstico real (DIAGNOSTICO-f9f6b27.md), PM2 está estable sin crashes activos. Se documentó baseline y se completaron optimizaciones.

---

### Prompt 1.1: Diagnóstico PM2 (Baseline y Patrones)

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Documentar baseline PM2 y analizar patrones de restarts históricos (✅ COMPLETADO)

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 1 (✅ COMPLETADA)
- Ver: project-stabilization/plan-part-2.md (FASE 1)
- Ver: project-stabilization/DIAGNOSTICO-f9f6b27.md (sección "PM2 Status")
- Resultado: PM2 estable, 0 crashes activos
- VPS: 195.200.6.216
- Commit: f9f6b27 (post-optimizaciones)

ESPECIFICACIONES:

**✅ COMPLETADO:** Diagnóstico real ya realizado - ver DIAGNOSTICO-f9f6b27.md. Esta tarea completó:
- Baseline POST-FASE 0 documentado
- Comparación con diagnóstico pre-sync realizada
- Estabilidad confirmada mejorada

1. Conectar a VPS y extraer información ACTUAL (post-sync f9f6b27):
   ```bash
   ssh root@195.200.6.216

   # Status actual
   pm2 list
   pm2 show muva-chat
   pm2 show muva-chat-staging

   # Logs desde sync (últimas 200 líneas)
   pm2 logs muva-chat --lines 200 --nostream
   pm2 logs muva-chat-staging --lines 200 --nostream
   ```

2. Comparar con diagnóstico pre-sync (DIAGNOSTICO-f9f6b27.md):
   - Restarts antes del sync: 18 (prod), 30 (staging)
   - Restarts actuales: ¿incrementaron?
   - Errores PGRST116: ¿siguen presentes? (esperado: SÍ, hasta FASE 1.2)
   - Memory usage: ¿cambió? (esperado: ~200MB prod, ~170MB staging)

3. Documentar baseline POST-sync:
   - Crear: project-stabilization/docs/fase-1/PM2_BASELINE_POST_SYNC.md
   - Incluir: Restarts actuales, uptime, memory, errores en logs
   - Comparación con DIAGNOSTICO-ee1d48e.md
   - Conclusión: ¿Sync mejoró estabilidad? ¿Empeoró? ¿Sin cambios?

COMANDOS A EJECUTAR EN VPS:
```bash
ssh muva@195.200.6.216

# Logs completos
pm2 logs muva-chat --lines 500 --nostream
pm2 logs muva-chat-staging --lines 500 --nostream

# Info de instances
pm2 info muva-chat
pm2 info muva-chat-staging

# Monitoring (snapshot)
pm2 monit

# Ver configuración actual
cat ~/muva-chat/ecosystem.config.js
```

TEST:
- Reporte PM2_DIAGNOSTIC_REPORT.md creado con análisis completo
- Causa raíz identificada
- Recomendaciones claras de configuración

SIGUIENTE: Prompt 1.2 (Fix Tenant Query)
```

---

### Prompt 1.2: Fix Tenant Query + Configuración PM2

**AGENTE:** @agent-backend-developer

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Corregir el error PGRST116 en tenant queries y optimizar configuración PM2

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 1
- Ver: project-stabilization/plan-part-2.md (FASE 1, tareas 1.2 y 1.3)
- Problema: Error "Cannot coerce to single JSON object PGRST116" por usar .single() cuando query retorna 0 rows

ESPECIFICACIONES:

**PARTE 1: Fix Tenant Query (tareas 1.2)**

1. Localizar función problemática:
   - Archivo: src/lib/tenant/tenant.ts
   - Función: getTenantBySubdomain()

2. Cambiar query de Supabase:
   ```typescript
   // ANTES (causa error)
   .single()

   // DESPUÉS (correcto)
   .maybeSingle()
   ```

3. Ajustar manejo de respuesta:
   - .maybeSingle() retorna null si 0 rows (NO error)
   - Ajustar lógica que depende de esto
   - Actualizar logs: INFO en vez de ERROR para subdomain inexistente

4. Documentar cambio:
   - Crear: project-stabilization/docs/fase-1/TENANT_QUERY_FIX.md
   - Incluir: código antes/después, razón del cambio, testing realizado

**PARTE 2: Optimizar Configuración PM2 (tarea 1.3)**

1. Actualizar ecosystem.config.js con nueva configuración:
   - max_memory_restart: '500M' (antes: 300M)
   - max_restarts: 10
   - min_uptime: '10s'
   - restart_delay: 4000
   - Agregar logging (error_file, out_file)
   - Agregar NODE_OPTIONS: '--max-old-space-size=450'

2. Ver configuración propuesta completa en:
   - project-stabilization/plan-part-2.md (FASE 1, tarea 1.3)

3. Documentar justificación de cada cambio

TEST:
- Build local exitoso: npm run build
- Test tenant query con subdomain inexistente:
  curl -I https://admin.muva.chat.com
  (debe retornar 404 sin error PGRST116 en logs)
- Test tenant query con subdomain válido:
  curl -I https://simmerdown.muva.chat.com
  (debe retornar 200)
- Configuración PM2 lista para deployment

SIGUIENTE: Prompt 1.3 (Scripts de Estabilidad + Deploy)
```

---

### Prompt 1.3: Scripts de Estabilidad y Deployment

**AGENTE:** @agent-infrastructure-monitor

**COPY-PASTE DESDE AQUÍ:**

```
TAREA: Crear scripts de monitoreo de estabilidad y deployar cambios al VPS

CONTEXTO:
- Proyecto: Project Stabilization 2025 - FASE 1
- Ver: project-stabilization/plan-part-2.md (FASE 1, tareas 1.4, 1.5, 1.6)
- Cambios listos: tenant query fix + ecosystem.config.js optimizado

ESPECIFICACIONES:

**PARTE 1: Script de Test de Estabilidad (tarea 1.4)**

1. Crear: scripts/test-pm2-stability.sh
   - Implementar baseline de restarts/uptime
   - Instrucciones para monitoreo 24h
   - Criterios de éxito (0 restarts, <400MB)

2. Ver script propuesto en:
   - project-stabilization/plan-part-2.md (FASE 1, tarea 1.4)

**PARTE 2: Script de Monitoring (tarea 1.5)**

1. Crear: scripts/monitor-pm2.sh
   - Checks de restarts (threshold: 5)
   - Checks de memoria (threshold: 450MB)
   - Alertas/logging
   - Preparar para cron

2. Ver script propuesto en:
   - project-stabilization/plan-part-2.md (FASE 1, tarea 1.5)

**PARTE 3: Deployment y Validación (tarea 1.6)**

1. Deploy a VPS:
   ```bash
   # En VPS
   cd ~/muva-chat
   git pull origin dev
   npm install --legacy-peer-deps
   npm run build

   # Aplicar nueva configuración PM2
   pm2 delete all
   pm2 start ecosystem.config.js
   pm2 save

   # Monitorear
   pm2 logs --lines 100
   ```

2. Validación inicial (1-2h):
   - Verificar aplicación levanta OK
   - Monitoring de logs (buscar errores PGRST116)
   - Monitoring de restarts (debe ser 0)
   - Monitoring de memoria

3. Documentar resultados:
   - Crear: project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS.md
   - Incluir: Output de deployment, primeras 2h de monitoreo, conclusiones

**CRITERIOS DE ÉXITO FASE 1:**
- ✅ 0 errores PGRST116 en logs (1 hora monitoreo)
- ✅ 0 restarts PM2 en 1 hora inicial
- ✅ Memory usage <400MB estable
- ✅ Logs limpios (solo INFO/WARN legítimos)
- ✅ Documentación completa en docs/fase-1/

TEST:
- Scripts creados y funcionando
- Deployment exitoso
- Validación inicial OK (1-2h)
- Documentación completa

SIGUIENTE FASE: FASE 2 (Branch Alignment)
Ver: workflow-part-2.md (Prompt 2.1)
```

---

## NOTAS IMPORTANTES

### Autorización de Commits

**NUNCA commitear sin que el usuario lo pida explícitamente.**

Al finalizar FASE 1, preguntar al usuario:

```
FASE 1 COMPLETADA ✅

Cambios realizados:
- src/lib/tenant/tenant.ts (fix tenant query)
- ecosystem.config.js (PM2 optimizado)
- scripts/test-pm2-stability.sh (nuevo)
- scripts/monitor-pm2.sh (nuevo)
- project-stabilization/docs/fase-1/* (documentación)

Tests:
- ✅ Build exitoso
- ✅ 0 errores PGRST116 (1h monitoreo)
- ✅ 0 restarts PM2 (1h monitoreo)
- ✅ Memory <400MB

¿Deseas que commitee estos cambios?
(Responde: "sí, commitea" o "no, espera")
```

### Validación Entre Prompts

Antes de pasar al siguiente prompt:
1. Verificar que tareas anteriores están completas
2. Verificar que tests pasaron
3. Verificar que documentación fue creada

### Rollback si es Necesario

Si algo falla en FASE 1:
```bash
# Rollback código
git checkout HEAD~1 src/lib/tenant/tenant.ts ecosystem.config.js

# Rollback VPS (si ya deployed)
ssh muva@195.200.6.216 'cd ~/muva-chat && git checkout HEAD~1 && npm run build && pm2 restart muva-chat'
```

---

**Última actualización:** 30 Octubre 2025
