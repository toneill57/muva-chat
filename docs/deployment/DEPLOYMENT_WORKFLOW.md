# Deployment Workflow - MUVA VPS

Guía de referencia rápida para deployments y troubleshooting en VPS Hostinger (muva.chat).

---

## 1. Overview del Proceso

### Diagrama de Flujo

```
Developer → GitHub (push to dev) → GitHub Actions → VPS Build & Deploy → Health Checks
    ↓                                      ↓                   ↓                ↓
  Commit              Trigger workflow        SSH deploy      PM2 restart   Auto-verify
                                               git pull         Nginx         Status 200
                                            npm ci/build       reload
```

### Timeline Esperado

| Fase                    | Tiempo  | Descripción                          |
|-------------------------|---------|--------------------------------------|
| GitHub Actions Trigger  | ~10s    | Detecta push, inicia workflow        |
| Dependency Install      | ~60s    | `npm ci` en VPS                      |
| Build Process           | ~90s    | `pnpm run build` (Next.js)            |
| Deploy & Restart        | ~20s    | PM2 reload zero-downtime             |
| Health Checks           | ~10s    | Verificación de endpoints            |
| **TOTAL**               | **~3m** | **< 5min deployment completo** ✅    |

---

## 2. Deployment Automático

### Push to Dev (CI/CD)

1. **Commit y Push**:
   ```bash
   git add .
   git commit -m "feat: nueva funcionalidad"
   git push origin dev
   ```

2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
   - ✅ Detecta push a `dev`
   - ✅ SSH a VPS
   - ✅ `git pull origin dev`
   - ✅ `npm ci` (instala deps exactas)
   - ✅ `pnpm run build`
   - ✅ `pm2 reload muva-chat --update-env`
   - ✅ Health check a https://muva.chat/api/health

3. **Verificación Post-Deploy**:
   ```bash
   # Desde local, verificar deployment exitoso
   curl -s https://muva.chat/api/health | jq
   # Debe retornar: {"status": "ok", "timestamp": "..."}

   # Ver logs de GitHub Actions
   gh run list --workflow=deploy.yml --limit 1
   gh run view <run-id> --log
   ```

### Monitoreo en Tiempo Real

```bash
# Ver logs de GitHub Actions (tiempo real)
gh run watch

# Ver logs de PM2 en VPS (SSH)
ssh root@muva.chat "pm2 logs muva-chat --lines 100"
```

---

## 3. Deployment Manual

### Proceso Completo

1. **SSH al Servidor**:
   ```bash
   ssh root@muva.chat
   # O con alias: ssh muva-vps
   ```

2. **Navegar al Directorio**:
   ```bash
   cd /var/www/muva-chat
   ```

3. **Pull Latest Changes**:
   ```bash
   git pull origin dev
   # O para forzar (sobrescribe cambios locales):
   # git fetch origin dev
   # git reset --hard origin/dev
   ```

4. **Instalar Dependencias**:
   ```bash
   npm ci
   # Nota: usa 'ci' (no 'install') para deps exactas de package-lock.json
   ```

5. **Build Application**:
   ```bash
   pnpm run build
   ```

6. **Restart PM2**:
   ```bash
   pm2 reload muva-chat --update-env
   # O para restart completo (downtime breve):
   # pm2 restart muva-chat
   ```

7. **Verificar Deploy**:
   ```bash
   # Health check
   curl -s http://localhost:3000/api/health | jq

   # PM2 status
   pm2 status muva-chat

   # Nginx status
   sudo systemctl status nginx
   ```

### Script Automatizado

```bash
#!/bin/bash
# deploy-manual.sh (ejecutar en VPS)

set -e  # Exit on error

echo "🚀 Starting manual deployment..."

cd /var/www/muva-chat
git pull origin dev
npm ci
pnpm run build
pm2 reload muva-chat --update-env

echo "✅ Deployment complete. Running health check..."
sleep 5
curl -s http://localhost:3000/api/health | jq

pm2 status muva-chat
```

---

## 4. Rollback

### Automático (vía GitHub Actions)

1. **Revertir Commit Problemático**:
   ```bash
   # Desde local
   git log --oneline -5  # Ver últimos 5 commits
   git revert <commit-hash>
   git push origin dev
   ```

2. **GitHub Actions Auto-Deploy**:
   - Detecta push
   - Despliega versión anterior automáticamente

### Manual (Emergency Rollback)

1. **SSH al Servidor**:
   ```bash
   ssh root@muva.chat
   cd /var/www/muva-chat
   ```

2. **Reset a Commit Anterior**:
   ```bash
   git log --oneline -10  # Identificar commit estable
   git reset --hard <commit-hash>
   ```

3. **Rebuild & Restart**:
   ```bash
   npm ci
   pnpm run build
   pm2 reload muva-chat --update-env
   ```

4. **Verificar Rollback**:
   ```bash
   curl -s http://localhost:3000/api/health | jq
   pm2 logs muva-chat --lines 50
   ```

### Rollback de Dependencias

Si un `npm update` causa problemas:

```bash
# Restaurar package-lock.json anterior
git checkout HEAD~1 package-lock.json
npm ci
pnpm run build
pm2 reload muva-chat --update-env
```

---

## 5. Monitoreo

### Health Checks

#### Endpoint de Salud
```bash
# Desde local
curl -s https://muva.chat/api/health | jq

# Desde VPS
curl -s http://localhost:3000/api/health | jq
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2025-10-04T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": "150MB",
    "total": "512MB"
  }
}
```

### PM2 Status

```bash
# Status general
pm2 status

# Logs en tiempo real
pm2 logs muva-chat

# Logs filtrados
pm2 logs muva-chat --lines 100 --err  # Solo errores

# Monit (dashboard interactivo)
pm2 monit

# Info detallada
pm2 describe muva-chat
```

### Nginx Logs

```bash
# Access logs (últimas 100 líneas)
sudo tail -100 /var/log/nginx/access.log

# Error logs
sudo tail -100 /var/log/nginx/error.log

# Logs en tiempo real
sudo tail -f /var/log/nginx/access.log

# Filtrar errores 500
sudo grep "500" /var/log/nginx/access.log
```

### Application Logs

```bash
# Logs de Next.js (PM2)
pm2 logs muva-chat --lines 200

# Logs de PM2 guardados
ls ~/.pm2/logs/
cat ~/.pm2/logs/muva-chat-out.log    # stdout
cat ~/.pm2/logs/muva-chat-error.log  # stderr

# Rotar logs (si crecen demasiado)
pm2 flush muva-chat
```

### Alertas Automáticas

**Setup Monitoring (opcional, futuro)**:

```bash
# PM2 Plus (dashboard cloud)
pm2 register

# UptimeRobot (HTTP monitoring)
# Crear monitor en https://uptimerobot.com
# URL: https://muva.chat/api/health
# Interval: 5min
```

### Troubleshooting Rápido

| Síntoma                        | Diagnóstico                              | Solución                                    |
|--------------------------------|------------------------------------------|---------------------------------------------|
| 502 Bad Gateway                | `pm2 status` → app stopped               | `pm2 restart muva-chat`                      |
| 504 Gateway Timeout            | App lenta/colgada                        | `pm2 logs muva-chat` → identificar bottleneck|
| High Memory Usage              | `pm2 monit` → > 80% RAM                  | `pm2 reload muva-chat` (zero-downtime)       |
| Build Failures                 | `pnpm run build` error                    | Ver logs, fix code, re-deploy               |
| SSL Certificate Error          | Certbot renewal failed                   | `sudo certbot renew --dry-run`              |

---

**Last Updated**: Oct 4, 2025
**VPS**: Hostinger (Ubuntu 22.04)
**Domain**: https://muva.chat
**Support**: GitHub Actions logs + PM2 logs
