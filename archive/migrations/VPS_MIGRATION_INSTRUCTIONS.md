# VPS Migration Instructions - InnPilot → MUVA Chat

**Fecha:** 2025-10-11
**Objetivo:** Renombrar directorio VPS y completar deployment exitoso
**Downtime estimado:** 30-60 segundos

---

## ✅ Pre-requisitos

- SSH access al VPS: `ssh root@muva.chat` o `ssh oneill@muva.chat`
- Git remote URL ya actualizada en VPS (desde paso anterior)

---

## 📋 Pasos de Migración

### Paso 1: Conectar al VPS

```bash
ssh root@muva.chat
# o
ssh oneill@muva.chat
```

### Paso 2: Actualizar remote URL de Git (si aún no se hizo)

```bash
cd /var/www/innpilot
git remote set-url origin https://github.com/toneill57/muva-chat.git
git remote -v  # Verificar cambió correctamente
```

### Paso 3: Descargar script de migración

```bash
# Pull latest changes con el script de migración
git fetch origin dev
git checkout origin/dev -- scripts/migrate-vps-directory.sh

# Hacer ejecutable
chmod +x scripts/migrate-vps-directory.sh
```

### Paso 4: Ejecutar migración automática

```bash
# Esto hará:
# - Stop PM2 process "muva-chat"
# - Rename /var/www/innpilot → /var/www/muva-chat
# - Limpiar node_modules corrupto
# - Actualizar Nginx config
# - Fresh npm install
# - Build app
# - Start PM2 con nuevo nombre

sudo bash scripts/migrate-vps-directory.sh
```

**⏱️ La migración toma ~5-10 minutos** (la mayor parte es npm install y build)

---

## 🔍 Verificación Post-Migración

### A. Verificar PM2

```bash
pm2 status
# Debe mostrar: muva-chat | online

pm2 logs muva-chat --lines 30
# Debe mostrar logs sin errores
```

### B. Verificar Nginx

```bash
sudo nginx -t
# Debe retornar: syntax is ok

systemctl status nginx
# Debe mostrar: active (running)
```

### C. Verificar sitios web

```bash
# Test main site
curl -I https://muva.chat
# Debe retornar: HTTP/2 200

# Test tenant
curl -I https://simmerdown.muva.chat
# Debe retornar: HTTP/2 200
```

### D. Verificar en browser

1. **Main site:** https://muva.chat
2. **Tenant admin:** https://simmerdown.muva.chat/admin
3. **Chat:** https://simmerdown.muva.chat/chat

---

## 🚨 Rollback (si algo sale mal)

```bash
# Stop new process
pm2 stop muva-chat
pm2 delete muva-chat

# Rename back
cd /var/www
mv muva-chat innpilot

# Restore nginx
sudo cp /etc/nginx/sites-available/innpilot.io.backup-* /etc/nginx/sites-available/innpilot.io
sudo systemctl reload nginx

# Restart old process
cd /var/www/innpilot
pm2 start npm --name "innpilot" -- start
pm2 save
```

---

## 📊 Checklist Final

- [ ] PM2 status muestra "muva-chat" online
- [ ] Nginx sin errores (`nginx -t`)
- [ ] https://muva.chat carga correctamente
- [ ] https://simmerdown.muva.chat/admin accesible
- [ ] Chat funciona en tenant
- [ ] PM2 logs sin errores críticos
- [ ] Directorio es `/var/www/muva-chat`

---

## 🎯 Próximos Pasos (después de migración)

1. Monitorear PM2 logs por 1 hora: `pm2 logs muva-chat`
2. Verificar analytics/traffic no cayó
3. Test chat con tenant real
4. Update documentación con nueva ruta VPS

---

## 📞 Troubleshooting

### Error: "ENOTEMPTY: directory not empty"

```bash
# Limpiar node_modules manualmente
cd /var/www/innpilot  # (o muva-chat)
rm -rf node_modules .next
npm install --legacy-peer-deps
```

### Error: "PM2 process not found"

```bash
# List all PM2 processes
pm2 list

# Si existe proceso viejo "innpilot":
pm2 stop innpilot
pm2 delete innpilot

# Start con nombre nuevo
cd /var/www/muva-chat
pm2 start npm --name "muva-chat" -- start
pm2 save
```

### Error: "Nginx syntax error"

```bash
# Ver error específico
sudo nginx -t

# Restaurar config backup
sudo cp /etc/nginx/sites-available/innpilot.io.backup-* /etc/nginx/sites-available/innpilot.io

# Test y reload
sudo nginx -t && sudo systemctl reload nginx
```

---

**¿Dudas?** Revisar logs: `pm2 logs muva-chat --lines 50`
