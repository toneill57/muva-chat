# Automated Monitoring Setup - RPC Functions

**Status:** ✅ Sistema listo para implementar
**Propósito:** Monitoreo continuo de funciones RPC para prevenir downtime del guest chat

---

## 🎯 Objetivo

Ejecutar validación automática de funciones RPC cada hora para detectar y alertar sobre problemas ANTES de que afecten a usuarios.

**Previene:**
- Guest chat que deja de responder sobre alojamientos
- Errores "operator does not exist" con pgvector
- Downtime silencioso (sistema corre pero no funciona correctamente)

**Beneficios:**
- Detección < 1 hora (vs 2-4 horas manual)
- Alertas automáticas a Slack/Email
- Auto-documentación de incidentes
- Visibilidad 24/7

---

## 📦 Componentes

### 1. Script de Monitoring
**Archivo:** `scripts/monitor-rpc-functions.sh`

```bash
# Ejecutar manualmente
./scripts/monitor-rpc-functions.sh production

# Con alertas de Slack
ALERT_METHOD=slack SLACK_WEBHOOK_URL=https://... ./scripts/monitor-rpc-functions.sh production
```

**Características:**
- ✅ Ejecuta validación RPC
- ✅ Registra resultados en logs
- ✅ Envía alertas si falla (Slack/Email/Log)
- ✅ Exit code 0=OK, 1=Error (compatible con cron)

### 2. Configuración Cron
**Archivo:** `scripts/crontab.example`

Configuración de ejemplo para ejecutar monitoring cada hora:
```cron
# Production - cada hora
0 * * * * cd /var/www/muva-chat && ./scripts/monitor-rpc-functions.sh production

# Staging - cada 2 horas
30 */2 * * * cd /var/www/muva-chat && ./scripts/monitor-rpc-functions.sh staging
```

---

## 🚀 Instalación

### VPS Production/Staging

#### Paso 1: SSH al servidor

```bash
ssh -i ~/.ssh/muva_deploy root@195.200.6.216
```

#### Paso 2: Configurar variables de entorno (opcional)

```bash
# Editar /etc/environment o crear /var/www/muva-chat/.env.monitoring
cat > /var/www/muva-chat/.env.monitoring <<EOF
ALERT_METHOD=slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
# O para email:
# ALERT_METHOD=email
# EMAIL_TO=alerts@your-domain.com
EOF
```

#### Paso 3: Instalar cron job

```bash
# Copiar ejemplo y editar
cp /var/www/muva-chat/scripts/crontab.example /tmp/muva-crontab

# Editar con tus configuraciones
vi /tmp/muva-crontab

# Instalar crontab
crontab /tmp/muva-crontab

# Verificar
crontab -l
```

#### Paso 4: Probar manualmente

```bash
cd /var/www/muva-chat

# Test básico (solo logs)
./scripts/monitor-rpc-functions.sh production

# Test con Slack (si configurado)
ALERT_METHOD=slack SLACK_WEBHOOK_URL=https://... ./scripts/monitor-rpc-functions.sh production
```

#### Paso 5: Verificar logs

```bash
# Ver logs de monitoring
tail -f /var/log/muva-rpc-monitor.log

# O logs locales si no tiene permisos en /var/log
tail -f /var/www/muva-chat/logs/rpc-monitor.log
```

---

## 📊 Configuración de Alertas

### Opción 1: Slack (Recomendado)

#### A. Crear Webhook de Slack

1. Ve a https://api.slack.com/apps
2. Crea una nueva app: "MUVA Monitoring"
3. Habilita "Incoming Webhooks"
4. Crea un webhook para tu canal #alerts
5. Copia la URL del webhook

#### B. Configurar en VPS

```bash
# Método 1: Variable de entorno
echo 'ALERT_METHOD=slack' >> /etc/environment
echo 'SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...' >> /etc/environment

# Método 2: Archivo local
cat > /var/www/muva-chat/.env.monitoring <<EOF
ALERT_METHOD=slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
EOF

# Cargar en crontab
# Agregar al inicio del crontab:
# ALERT_METHOD=slack
# SLACK_WEBHOOK_URL=https://...
```

#### C. Test de Slack

```bash
cd /var/www/muva-chat

# Forzar validación a fallar para testear alerta
ALERT_METHOD=slack \
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... \
./scripts/monitor-rpc-functions.sh production
```

**Mensaje esperado en Slack:**
```
🚨 RPC Functions Validation Failed

Environment: production
Timestamp: 2025-11-06 15:30:00

Action Required:
  pnpm run validate:rpc:fix -- --env=production

[Validation Output...]
```

---

### Opción 2: Email

#### A. Configurar mail command

```bash
# Ubuntu/Debian
sudo apt-get install mailutils

# Test
echo "Test email" | mail -s "Test Subject" your@email.com
```

#### B. Configurar en VPS

```bash
echo 'ALERT_METHOD=email' >> /etc/environment
echo 'EMAIL_TO=alerts@your-domain.com' >> /etc/environment
```

---

### Opción 3: Solo Logs (Default)

```bash
# No requiere configuración adicional
# Logs van a:
#   - /var/log/muva-rpc-monitor.log (si tiene permisos)
#   - /var/www/muva-chat/logs/rpc-monitor.log (fallback)
```

---

## 📅 Frecuencias Recomendadas

### Production
```cron
# Cada hora - balance entre detección rápida y carga del sistema
0 * * * * cd /var/www/muva-chat && ./scripts/monitor-rpc-functions.sh production
```

### Staging
```cron
# Cada 2 horas (offset +30min) - menos crítico que production
30 */2 * * * cd /var/www/muva-chat && ./scripts/monitor-rpc-functions.sh staging
```

### Development
```bash
# No recomendado vía cron - ejecutar manualmente cuando sea necesario
pnpm run validate:rpc
```

---

## 🔍 Verificación

### Ver próxima ejecución de cron

```bash
# Listar cron jobs activos
crontab -l

# Ver logs de cron
grep CRON /var/log/syslog | tail -20
```

### Monitorear en tiempo real

```bash
# Terminal 1: Ver logs
tail -f /var/log/muva-rpc-monitor.log

# Terminal 2: Esperar próxima ejecución
# (ejecuta cada hora en :00)
```

### Test manual (simular cron)

```bash
# Ejecutar exactamente como lo haría cron
cd /var/www/muva-chat && ./scripts/monitor-rpc-functions.sh production >> /var/log/muva-rpc-monitor.log 2>&1

# Ver resultado
echo $?  # 0=success, 1=failure
```

---

## 📈 Dashboard de Monitoring

Además del monitoring automático, ejecutar dashboard completo manualmente:

```bash
# Dashboard visual completo
pnpm dlx tsx scripts/monitoring-dashboard.ts

# Dashboard de producción específicamente
pnpm dlx tsx scripts/monitoring-dashboard.ts --env=production

# Dashboard en JSON (para parsear)
pnpm dlx tsx scripts/monitoring-dashboard.ts --json
```

---

## 🆘 Troubleshooting

### Problema: Cron no ejecuta el script

**Verificar:**
```bash
# 1. Ver logs de cron
grep CRON /var/log/syslog | tail -20

# 2. Verificar permisos
ls -la /var/www/muva-chat/scripts/monitor-rpc-functions.sh
# Debe ser executable: -rwxr-xr-x

# 3. Verificar que pnpm está en PATH
which pnpm
# Si no lo encuentra, agregar a crontab:
# PATH=/usr/local/bin:/usr/bin:/bin
```

**Solución:**
```bash
# Dar permisos
chmod +x /var/www/muva-chat/scripts/monitor-rpc-functions.sh

# Agregar PATH al crontab
crontab -e
# Agregar al inicio:
# PATH=/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin
```

---

### Problema: Alertas de Slack no llegan

**Verificar:**
```bash
# Test manual del webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from MUVA monitoring"}' \
  YOUR_SLACK_WEBHOOK_URL
```

**Solución:**
```bash
# Verificar que SLACK_WEBHOOK_URL está configurado
env | grep SLACK

# Re-configurar
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
export ALERT_METHOD=slack
```

---

### Problema: Script falla con "pnpm: command not found"

**Solución:**
```bash
# Instalar pnpm globalmente
npm install -g pnpm

# O usar npx
# Editar script para usar: npx pnpm run validate:rpc
```

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

1. **Uptime de validación RPC:** > 99.9%
2. **Tiempo de detección de problema:** < 1 hora
3. **Tiempo de resolución:** < 5 minutos (auto-fix)
4. **False positives:** < 1%

### Logs a Revisar

```bash
# Contar validaciones exitosas vs fallidas (última semana)
grep "validation PASSED" /var/log/muva-rpc-monitor.log | wc -l
grep "validation FAILED" /var/log/muva-rpc-monitor.log | wc -l

# Ver última alerta
grep -A 10 "🚨 RPC FUNCTIONS VALIDATION FAILED" /var/log/muva-rpc-monitor.log | tail -20
```

---

## ✅ Checklist de Instalación

- [ ] Script `monitor-rpc-functions.sh` tiene permisos de ejecución
- [ ] Variables de entorno configuradas (ALERT_METHOD, SLACK_WEBHOOK_URL)
- [ ] Cron job instalado (`crontab -l` lo muestra)
- [ ] Test manual exitoso
- [ ] Test de alertas exitoso (Slack/Email)
- [ ] Logs accesibles (`tail -f /var/log/muva-rpc-monitor.log`)
- [ ] Documentación actualizada en CLAUDE.md
- [ ] Equipo notificado sobre nuevo sistema de monitoring

---

**Última actualización:** November 6, 2025
**Mantenedor:** @agent-backend-developer
**Estado:** ✅ Sistema listo para producción
