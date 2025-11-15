# Logs Baseline - Capture Instructions

**Date:** 2025-10-10
**Project:** MUVA.chat Migration - FASE 0.6
**Purpose:** Capturar logs actuales como baseline antes de migración

---

## 🔴 ACCIÓN REQUERIDA: SSH Manual

El agente no tiene acceso SSH configurado. **Usuario debe ejecutar estos comandos manualmente** en VPS:

---

## COMANDOS A EJECUTAR

### 1. SSH al VPS
```bash
ssh oneill@195.200.6.216
```

### 2. Capturar PM2 Logs
```bash
cd /Users/oneill/Sites/apps/MUVA Chat

# Capturar últimas 100 líneas de PM2 logs
pm2 logs muva-chat --lines 100 --nostream > docs/projects/muva-migration/fase-0/pm2-baseline.log 2>&1

# O alternativamente, desde local si tienes rsync:
ssh oneill@195.200.6.216 "pm2 logs muva-chat --lines 100 --nostream" > docs/projects/muva-migration/fase-0/pm2-baseline.log
```

### 3. Capturar Nginx Access Log
```bash
# En VPS
sudo tail -n 200 /var/log/nginx/muva-subdomain-access.log > /tmp/nginx-access-baseline.log

# Copiar a repo local
scp /tmp/nginx-access-baseline.log oneill@local:/Users/oneill/Sites/apps/MUVA Chat/docs/projects/muva-migration/fase-0/

# O desde local:
ssh oneill@195.200.6.216 "sudo tail -n 200 /var/log/nginx/muva-subdomain-access.log" > docs/projects/muva-migration/fase-0/nginx-access-baseline.log
```

### 4. Capturar Nginx Error Log
```bash
# En VPS
sudo tail -n 100 /var/log/nginx/muva-subdomain-error.log > /tmp/nginx-error-baseline.log

# Copiar a repo local
scp /tmp/nginx-error-baseline.log oneill@local:/Users/oneill/Sites/apps/MUVA Chat/docs/projects/muva-migration/fase-0/

# O desde local:
ssh oneill@195.200.6.216 "sudo tail -n 100 /var/log/nginx/muva-subdomain-error.log" > docs/projects/muva-migration/fase-0/nginx-error-baseline.log
```

---

## VERIFICACIÓN

Después de ejecutar los comandos, verificar que los archivos existen:

```bash
ls -lh docs/projects/muva-migration/fase-0/*.log

# Deberías ver:
# - pm2-baseline.log
# - nginx-access-baseline.log
# - nginx-error-baseline.log
```

---

## ¿QUÉ BUSCAR EN LOS LOGS?

### PM2 Logs
- ✅ Zero errores críticos (500, crashes)
- ✅ App status: "online"
- ✅ Memory usage estable
- ⚠️ Warnings aceptables (low severity)

### Nginx Access Log
- ✅ Response codes: Mayoría 200, 304
- ✅ Response times: < 500ms promedio
- ⚠️ Algunos 404 normales (favicon, robots.txt)
- ❌ Zero 500/502/503 (server errors)

### Nginx Error Log
- ✅ Pocas líneas (idealmente vacío)
- ⚠️ Warnings SSL aceptables
- ❌ Zero errores críticos de proxy/upstream

---

## ANÁLISIS POST-CAPTURA

Una vez capturados los logs, ejecutar análisis rápido:

```bash
# Contar errores en PM2
grep -i "error" docs/projects/muva-migration/fase-0/pm2-baseline.log | wc -l

# Contar status codes en Nginx access
awk '{print $9}' docs/projects/muva-migration/fase-0/nginx-access-baseline.log | sort | uniq -c

# Ver errores en Nginx error log
cat docs/projects/muva-migration/fase-0/nginx-error-baseline.log
```

---

## ALTERNATIVA: Script Automatizado

Si prefieres automatizar, crear script `scripts/capture-logs-baseline.sh`:

```bash
#!/bin/bash

REMOTE_USER="oneill"
REMOTE_HOST="195.200.6.216"
LOCAL_DIR="docs/projects/muva-migration/fase-0"

echo "📊 Capturando logs baseline desde VPS..."

# PM2 logs
echo "1/3 - PM2 logs..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "pm2 logs muva-chat --lines 100 --nostream" > ${LOCAL_DIR}/pm2-baseline.log 2>&1

# Nginx access
echo "2/3 - Nginx access log..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "sudo tail -n 200 /var/log/nginx/muva-subdomain-access.log" > ${LOCAL_DIR}/nginx-access-baseline.log 2>&1

# Nginx error
echo "3/3 - Nginx error log..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "sudo tail -n 100 /var/log/nginx/muva-subdomain-error.log" > ${LOCAL_DIR}/nginx-error-baseline.log 2>&1

echo "✅ Logs baseline capturados en ${LOCAL_DIR}/"
ls -lh ${LOCAL_DIR}/*.log
```

Ejecutar:
```bash
chmod +x scripts/capture-logs-baseline.sh
./scripts/capture-logs-baseline.sh
```

---

## TROUBLESHOOTING

### Error: "Permission denied (publickey)"
**Solución:** Configurar SSH key authentication:
```bash
# Generar key si no existe
ssh-keygen -t ed25519 -C "oneill@muva.chat"

# Copiar key al VPS
ssh-copy-id oneill@195.200.6.216
```

### Error: "sudo: no tty present"
**Solución:** Configurar NOPASSWD para nginx logs:
```bash
# En VPS, editar sudoers
sudo visudo

# Agregar línea:
oneill ALL=(ALL) NOPASSWD: /usr/bin/tail /var/log/nginx/*
```

---

**Status:** ⏳ Requiere ejecución manual
**Next:** Una vez capturados los logs, proceder con FASE 1 (Dual-Domain Support)
