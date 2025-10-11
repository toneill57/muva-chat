# Nginx Configuration Update - MUVA Chat Rebrand

## Contexto
Actualización de la configuración de Nginx en el VPS de producción para reflejar el rebrand de **InnPilot → MUVA Chat**.

## Status
- **PM2 Process**: ✅ Ya renombrado a "muva-chat"
- **Nginx Config**: ⏳ Pendiente de actualización
- **Acceso SSH**: ⚠️ No disponible desde máquina de desarrollo (solo GitHub Actions tiene la clave SSH)

---

## Método de Ejecución

### Opción A: Ejecutar desde VPS directamente (Recomendado)

Si tienes acceso SSH directo al VPS desde tu máquina local:

```bash
# 1. Copiar script al VPS
scp scripts/update-nginx-muva-rebrand.sh root@muva.chat:~/

# 2. Conectar al VPS
ssh root@muva.chat

# 3. Ejecutar el script
chmod +x ~/update-nginx-muva-rebrand.sh
sudo bash ~/update-nginx-muva-rebrand.sh
```

**Nota:** Reemplaza `root` con el usuario SSH correcto si es diferente (puede ser `innpilot`, `deploy`, etc.)

---

### Opción B: Ejecutar vía GitHub Actions

Si prefieres usar el workflow de deployment automatizado:

1. **Agregar step al workflow** (`.github/workflows/deploy.yml`):

```yaml
- name: Update Nginx config for MUVA rebrand
  uses: appleboy/ssh-action@v1.0.0
  with:
    host: ${{ secrets.VPS_HOST }}
    username: ${{ secrets.VPS_USER }}
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      # Download script from repo
      cd /tmp
      wget https://raw.githubusercontent.com/toneill57/innpilot/main/scripts/update-nginx-muva-rebrand.sh
      chmod +x update-nginx-muva-rebrand.sh
      sudo bash update-nginx-muva-rebrand.sh
```

2. **Trigger deployment**:

```bash
git add .
git commit -m "chore: trigger nginx config update"
git push origin dev
```

---

## Qué hace el script

### 1. Backup automático
- Crea backup completo de `/etc/nginx/sites-available` y `/etc/nginx/sites-enabled`
- Ubicación: `/root/nginx-backups/nginx_backup_YYYYMMDD_HHMMSS`

### 2. Identificación de archivos
- Busca configuración actual (innpilot.conf, muva.conf, o default)
- Muestra contenido actual para verificación

### 3. Renombrado de archivo
- Copia configuración a `/etc/nginx/sites-available/muva.conf`
- Preserva configuración original como backup

### 4. Actualización de referencias
- Reemplaza `InnPilot` → `MUVA Chat` en comentarios
- Reemplaza `innpilot` → `muva-chat` en referencias

### 5. Actualización de symlinks
- Remueve symlinks antiguos: `innpilot.conf`, `innpilot`, `default`
- Crea nuevo symlink: `/etc/nginx/sites-enabled/muva.conf`

### 6. Validación y reload
- Ejecuta `nginx -t` para validar configuración
- Si es válida: `systemctl reload nginx`
- Si es inválida: rollback automático

### 7. Verificación post-cambios
- Test HTTP de sitio principal: `https://muva.chat`
- Test HTTP de tenant: `https://simmerdown.muva.chat`
- Test API health: `https://muva.chat/api/health`
- Muestra últimas 10 líneas del log de errores

---

## Ejemplo de output esperado

```
🚀 Iniciando actualización de Nginx para MUVA Chat rebrand...

📦 Paso 1/6: Creando backup de configuración actual...
✅ Backup creado en: /root/nginx-backups/nginx_backup_20251010_143022

🔍 Paso 2/6: Identificando archivos de configuración...
📝 Archivo de configuración encontrado: /etc/nginx/sites-available/innpilot.conf

📝 Paso 3/6: Renombrando archivo de configuración...
✅ Archivo copiado: innpilot.conf → muva.conf

✏️  Paso 4/6: Actualizando referencias InnPilot → MUVA Chat...
✅ Referencias actualizadas en /etc/nginx/sites-available/muva.conf

🔗 Paso 5/6: Actualizando symlink en sites-enabled...
✅ Symlink creado: /etc/nginx/sites-enabled/muva.conf → muva.conf
✅ Symlink verificado correctamente

✅ Paso 6/6: Validando configuración de Nginx...
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
✅ Configuración de Nginx válida ✅

🔄 Recargando Nginx...
✅ Nginx recargado exitosamente ✅

🔍 Verificando sitio en producción...

Test 1: Sitio principal (https://muva.chat)
✅ https://muva.chat → 200

Test 2: Tenant subdomain (https://simmerdown.muva.chat)
✅ https://simmerdown.muva.chat → 200

Test 3: API health (https://muva.chat/api/health)
✅ https://muva.chat/api/health → 200

╔════════════════════════════════════════════════════════════════════╗
║                  ✅ ACTUALIZACIÓN COMPLETADA                        ║
╚════════════════════════════════════════════════════════════════════╝

✅ Configuración de Nginx actualizada para MUVA Chat rebrand

📁 Archivos actualizados:
   - Config: /etc/nginx/sites-available/muva.conf
   - Symlink: /etc/nginx/sites-enabled/muva.conf

📦 Backup guardado en:
   - /root/nginx-backups/nginx_backup_20251010_143022-sites-available
   - /root/nginx-backups/nginx_backup_20251010_143022-sites-enabled

🌐 Sitios verificados:
   - https://muva.chat
   - https://simmerdown.muva.chat
   - https://muva.chat/api/health

✅ MUVA Chat está funcionando correctamente en producción! 🎉
```

---

## Rollback (en caso de problemas)

Si algo sale mal después de ejecutar el script, hay dos formas de hacer rollback:

### Rollback automático (vía script generado)

```bash
sudo bash /root/nginx-rollback.sh
```

Este script se genera automáticamente después de ejecutar la actualización.

### Rollback manual

```bash
# 1. Identificar backup más reciente
ls -lt /root/nginx-backups/

# 2. Restaurar configuración
sudo rm -rf /etc/nginx/sites-available
sudo rm -rf /etc/nginx/sites-enabled
sudo cp -r /root/nginx-backups/nginx_backup_YYYYMMDD_HHMMSS-sites-available /etc/nginx/sites-available
sudo cp -r /root/nginx-backups/nginx_backup_YYYYMMDD_HHMMSS-sites-enabled /etc/nginx/sites-enabled

# 3. Validar y recargar
sudo nginx -t
sudo systemctl reload nginx
```

---

## Validación post-ejecución

Después de ejecutar el script, verificar que todo funciona correctamente:

```bash
# 1. Verificar configuración de Nginx
sudo nginx -t

# 2. Verificar archivos creados
ls -la /etc/nginx/sites-available/muva.conf
ls -la /etc/nginx/sites-enabled/muva.conf

# 3. Verificar sitio principal
curl -I https://muva.chat

# 4. Verificar tenant
curl -I https://simmerdown.muva.chat

# 5. Verificar API
curl https://muva.chat/api/health

# 6. Verificar logs sin errores
sudo tail -50 /var/log/nginx/error.log
```

---

## Troubleshooting

### Error: "Permission denied"
**Causa:** Script no ejecutado con sudo
**Solución:** `sudo bash ~/update-nginx-muva-rebrand.sh`

### Error: "nginx: configuration file test failed"
**Causa:** Sintaxis inválida en configuración
**Solución:** Script hace rollback automático. Revisar logs.

### Error: "404 Not Found" después de actualizar
**Causa:** Nginx no pudo recargar correctamente
**Solución:**
```bash
sudo systemctl status nginx
sudo systemctl restart nginx
```

### Error: HTTP 502 Bad Gateway
**Causa:** PM2 process no está corriendo
**Solución:**
```bash
pm2 status
pm2 restart muva-chat
```

---

## Archivos relacionados

- **Script principal**: `/scripts/update-nginx-muva-rebrand.sh`
- **Nginx config**: `/etc/nginx/sites-available/muva.conf` (en VPS)
- **Symlink**: `/etc/nginx/sites-enabled/muva.conf` (en VPS)
- **Backups**: `/root/nginx-backups/` (en VPS)
- **Rollback script**: `/root/nginx-rollback.sh` (generado automáticamente)

---

## Estado actual

- **Fecha de creación**: 2025-10-10
- **Status**: ⏳ Script creado, pendiente de ejecución en VPS
- **Próximo paso**: Ejecutar script en VPS usando Opción A o B

---

## Referencias

- **GitHub Actions Workflow**: `.github/workflows/deploy.yml`
- **GitHub Secrets**: `docs/deployment/GITHUB_SECRETS.md`
- **VPS Setup Guide**: `docs/deployment/VPS_SETUP_GUIDE.md`
- **Nginx Subdomain Deployment**: `docs/deployment/NGINX_SUBDOMAIN_DEPLOYMENT.md`
