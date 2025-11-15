# FASE 1 Deployment Guide

**Objetivo:** Deployar cambios de FASE 1 al VPS y validar estabilidad durante 2 horas.

---

## 🎯 Cambios a Deployar

### Código
1. **src/lib/tenant-utils.ts**
   - `.single()` → `.maybeSingle()` en `getTenantBySubdomain()`
   - Fix para errores PGRST116 (PostgreSQL "no rows")

2. **ecosystem.config.js**
   - `max_memory_restart: '500M'` (production), `'400M'` (staging)
   - `max_restarts: 10` (previene restart loops)
   - `restart_delay: 4000` (4s entre restarts)

### Scripts de Monitoreo
3. **scripts/test-pm2-stability.sh**
   - Test de estabilidad 24h
   - Captura baseline y métricas

4. **scripts/monitor-pm2.sh**
   - Health check automático
   - Alertas de restarts/memory/PGRST116

---

## 🚀 Opción 1: Script Automatizado (Recomendado)

### Paso 1: Ejecutar script de deployment
```bash
cd /Users/oneill/Sites/apps/muva-chat
./scripts/deploy-and-validate-fase1.sh
```

**Este script:**
- Conecta al VPS vía SSH
- Captura baseline PRE-deployment
- Ejecuta deployment (pull, install, build, restart PM2)
- Valida POST-deployment inmediato
- Monitorea durante 2 horas (checks cada 15min)
- Captura métricas completas

**Duración:** ~2h 20min (deployment + validación)

### Paso 2: Llenar documentación
Después de que termine el script:

```bash
# Copiar template y llenar con datos reales
cp project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS_TEMPLATE.md \
   project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS.md

# Editar con tus resultados
# Reemplazar todos los {PLACEHOLDERS} con datos reales
```

---

## 🛠️ Opción 2: Deployment Manual

Si prefieres más control, ejecuta comandos manualmente:

### Paso 1: Conectar al VPS
```bash
ssh muva@195.200.6.216
# Password: (disponible en .env.local o secrets)
```

### Paso 2: Pre-deployment baseline
```bash
cd /var/www/muva-chat

# Capturar estado actual
pm2 info muva-chat | grep -E "(status|restarts|memory|uptime)"

# Guardar commit actual
git rev-parse --short HEAD
```

### Paso 3: Backup
```bash
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
```

### Paso 4: Deployment
```bash
# Pull cambios
git pull origin dev

# Install dependencies
npm install --legacy-peer-deps

# Build
npm run build

# Restart PM2 con nueva config
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Paso 5: Validación inmediata (T+10s)
```bash
# Esperar 10 segundos
sleep 10

# Verificar status
pm2 info muva-chat | grep -E "(status|restarts|memory|uptime)"

# Buscar PGRST116 en logs
pm2 logs muva-chat --lines 200 --nostream | grep -i PGRST116
# Expected: Sin resultados
```

### Paso 6: Monitoreo continuo (2h)
Ejecutar cada 15 minutos:

```bash
# Check completo
pm2 info muva-chat | grep -E "(status|restarts|memory|uptime)"

# Errores PGRST116
pm2 logs muva-chat --lines 200 --nostream | grep -i PGRST116 | wc -l

# Logs de errores
pm2 logs muva-chat --lines 50 --nostream --err
```

**Timeline:**
- T+15min
- T+30min
- T+45min
- T+1h
- T+1h15min
- T+1h30min
- T+1h45min
- T+2h (final)

### Paso 7: Documentar resultados
Usa el template en:
```
project-stabilization/docs/fase-1/STABILITY_TEST_RESULTS_TEMPLATE.md
```

Llena todos los `{PLACEHOLDERS}` con datos reales capturados.

---

## ✅ Criterios de Éxito

Al finalizar 2h de monitoreo, verifica:

| Criterio | Target | Cómo Verificar |
|----------|--------|----------------|
| PGRST116 errors | 0 | `pm2 logs muva-chat --lines 500 \| grep -i PGRST116 \| wc -l` |
| PM2 restarts | 0 adicionales | Comparar restarts PRE vs POST |
| Memory usage | <400MB | `pm2 info muva-chat \| grep memory` |
| Status | online | `pm2 info muva-chat \| grep status` |
| Uptime | ~2h continuo | `pm2 info muva-chat \| grep uptime` |

**FASE 1 exitosa si:** Todos los criterios ✅

---

## 🚨 Troubleshooting

### Problema: Build falla
```bash
# Verificar Node version
node -v
# Expected: v18.x o superior

# Limpiar node_modules
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

### Problema: PM2 no reinicia
```bash
# Ver logs de PM2
pm2 logs muva-chat --lines 100 --err

# Verificar ecosystem.config.js existe
ls -lh ecosystem.config.js

# Force restart
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Problema: PGRST116 persiste
```bash
# Verificar que el código deployó correctamente
cd /var/www/muva-chat
git diff HEAD origin/dev -- src/lib/tenant-utils.ts

# Verificar que .maybeSingle() está presente
grep -n "maybeSingle" src/lib/tenant-utils.ts

# Si no está, forzar pull
git fetch origin dev
git reset --hard origin/dev
npm run build
pm2 restart muva-chat
```

### Problema: Memory leak
```bash
# Verificar PM2 config
pm2 describe muva-chat | grep max_memory_restart

# Expected: max_memory_restart: '500M'

# Si no está configurado:
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 📊 Scripts de Monitoreo Adicionales

### Test de Estabilidad 24h
Después de validación inicial exitosa (2h):

```bash
ssh muva@195.200.6.216
cd /var/www/muva-chat
./scripts/test-pm2-stability.sh

# Esperar 24 horas

# Re-ejecutar para comparar
./scripts/test-pm2-stability.sh
```

### Configurar Cron Monitoring
```bash
ssh muva@195.200.6.216

# Agregar a crontab
crontab -e

# Agregar esta línea (ejecutar cada hora)
0 * * * * cd /var/www/muva-chat && ./scripts/monitor-pm2.sh >> /var/log/pm2-monitor.log 2>&1

# Verificar cron está activo
crontab -l
```

---

## 📝 Próximos Pasos

1. ✅ Completar deployment y validación 2h
2. ✅ Documentar resultados en `STABILITY_TEST_RESULTS.md`
3. ⏳ Ejecutar test estabilidad 24h
4. ⏳ Configurar cron para monitoring continuo
5. ⏳ Revisar resultados 24h
6. ⏳ Proceder a FASE 2 (si FASE 1 exitosa)

---

## 📎 Referencias

- **Plan completo:** `project-stabilization/plan-part-2.md`
- **Diagnóstico PM2:** `project-stabilization/docs/fase-1/PM2_DIAGNOSTIC_REPORT.md`
- **Config optimizada:** `ecosystem.config.js`
- **Scripts:**
  - `scripts/deploy-and-validate-fase1.sh` (automatizado)
  - `scripts/test-pm2-stability.sh` (24h test)
  - `scripts/monitor-pm2.sh` (health check)

---

**Última actualización:** October 29, 2025
**Autor:** Claude Infrastructure Monitor Agent 🖥️
