# Troubleshooting Guide - MUVA VPS

Guía de solución de problemas comunes en deployment y operación del VPS.

---

## Problemas Comunes

### 1. Build Fails en GitHub Actions

**Síntoma**:
- ❌ GitHub Actions workflow falla en step `npm run build`
- Error log muestra: `Build failed` o `Type error` o `Module not found`
- Badge en README muestra "failing"

**Causa**:
- TypeScript errors en código nuevo
- Dependencias faltantes en `package.json`
- Environment variables no configuradas en GitHub Secrets
- Conflictos de versiones de Node.js

**Solución**:

```bash
# 1. Revisar logs de GitHub Actions
gh run list --workflow=deploy.yml --limit 5
gh run view <run-id> --log

# 2. Reproducir build localmente
npm ci
npm run build

# 3. Si hay errores TypeScript, corregir código
npm run type-check

# 4. Verificar GitHub Secrets configurados
gh secret list

# 5. Verificar versión de Node.js en workflow
cat .github/workflows/deploy.yml | grep node-version

# 6. Si faltan dependencias, agregarlas
npm install <missing-package> --save
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push origin dev

# 7. Re-run failed workflow
gh run rerun <run-id>
```

**Prevención**:
- Siempre ejecutar `npm run build` localmente antes de push
- Usar `npm run type-check` en pre-commit hook
- Mantener versiones de Node.js sincronizadas (local, GitHub Actions, VPS)

---

### 2. SSH Connection Timeout

**Síntoma**:
- ⏱️ GitHub Actions falla en step de SSH
- Error: `Connection timed out` o `Permission denied (publickey)`
- Deployment manual falla con `ssh: connect to host muva.chat port 22: Operation timed out`

**Causa**:
- Firewall bloqueando puerto 22
- IP de GitHub Actions cambiada (no en whitelist)
- SSH key incorrecta/expirada
- VPS caído o reiniciando

**Solución**:

```bash
# 1. Verificar conexión desde local
ssh -vvv root@muva.chat
# Analizar verbose output para identificar problema

# 2. Verificar firewall en VPS (desde consola Hostinger)
sudo ufw status
sudo ufw allow 22/tcp
sudo ufw reload

# 3. Verificar servicio SSH corriendo
sudo systemctl status ssh
sudo systemctl restart ssh

# 4. Verificar SSH key en GitHub Secrets
gh secret list
# Debe existir: VPS_SSH_PRIVATE_KEY

# 5. Regenerar SSH key si necesario
ssh-keygen -t ed25519 -C "github-actions@innpilot"
# Copiar ~/.ssh/id_ed25519.pub al VPS
ssh-copy-id root@muva.chat

# 6. Actualizar GitHub Secret con nueva key privada
gh secret set VPS_SSH_PRIVATE_KEY < ~/.ssh/id_ed25519

# 7. Verificar whitelist de IPs (si aplica)
# GitHub Actions IPs: https://api.github.com/meta
curl -s https://api.github.com/meta | jq .actions
```

**Prevención**:
- Usar password fallback además de SSH key
- Configurar IP whitelist amplia para GitHub Actions
- Monitorear uptime del VPS (UptimeRobot)

---

### 3. PM2 Process Crashes

**Síntoma**:
- 🔴 `pm2 status` muestra app en estado `errored` o `stopped`
- Logs muestran: `Process exited with code 1`
- Website devuelve 502 Bad Gateway

**Causa**:
- Uncaught exception en código
- Out of memory (OOM)
- Port 3000 ya en uso
- Missing environment variables

**Solución**:

```bash
# 1. SSH al VPS
ssh root@muva.chat

# 2. Ver status de PM2
pm2 status

# 3. Ver últimos logs
pm2 logs muva-chat --lines 200 --err

# 4. Identificar causa en logs
# Buscar: "Error:", "EADDRINUSE", "Out of memory", "undefined"

# 5a. Si port en uso, matar proceso
lsof -ti:3000 | xargs kill -9

# 5b. Si OOM, reiniciar con más memoria
pm2 delete muva-chat
pm2 start ecosystem.config.js --update-env
# (ecosystem.config.js debe tener max_memory_restart: '500M')

# 5c. Si environment variables faltantes, configurar
pm2 set pm2:NEXT_PUBLIC_SUPABASE_URL "https://..."
pm2 restart muva-chat --update-env

# 5d. Si código crasheando, rollback
cd /var/www/muva-chat
git reset --hard HEAD~1
npm run build
pm2 reload muva-chat

# 6. Verificar app corriendo
pm2 status
curl http://localhost:3000/api/health
```

**Prevención**:
- Implementar error boundaries en React
- Usar PM2 auto-restart: `watch: true` en ecosystem.config.js
- Configurar `max_memory_restart` en PM2
- Logs centralizados (PM2 Plus o similar)

---

### 4. Nginx 502 Bad Gateway

**Síntoma**:
- 🚫 Browser muestra "502 Bad Gateway"
- `curl https://muva.chat` retorna 502
- Nginx logs: `connect() failed (111: Connection refused)`

**Causa**:
- Next.js app no corriendo (PM2 stopped)
- Next.js escuchando en puerto incorrecto
- Nginx proxy_pass configurado incorrectamente
- Firewall bloqueando localhost:3000

**Solución**:

```bash
# 1. SSH al VPS
ssh root@muva.chat

# 2. Verificar PM2 corriendo
pm2 status muva-chat
# Si stopped: pm2 restart muva-chat

# 3. Verificar puerto de Next.js
netstat -tulpn | grep :3000
# Debe mostrar: node (PID) LISTEN 0.0.0.0:3000

# 4. Test local de Next.js
curl http://localhost:3000/api/health
# Debe retornar: {"status":"ok",...}

# 5. Verificar config de Nginx
sudo cat /etc/nginx/sites-available/innpilot.conf | grep proxy_pass
# Debe ser: proxy_pass http://localhost:3000;

# 6. Test de config Nginx
sudo nginx -t

# 7. Reload Nginx
sudo systemctl reload nginx

# 8. Ver logs de Nginx
sudo tail -50 /var/log/nginx/error.log

# 9. Si todo falla, reiniciar Nginx
sudo systemctl restart nginx

# 10. Verificar desde local
curl -I https://muva.chat
# Debe retornar: HTTP/2 200
```

**Prevención**:
- Health check automático en GitHub Actions
- Monitoreo de uptime (UptimeRobot cada 5min)
- PM2 auto-restart configurado

---

### 5. SSL Certificate Renewal Fails

**Síntoma**:
- ⚠️ Browser muestra "Your connection is not private"
- `curl https://muva.chat` retorna SSL error
- Email de Let's Encrypt: "Certificate expiring soon"

**Causa**:
- Certbot auto-renewal fallando
- Puerto 80 bloqueado (necesario para HTTP-01 challenge)
- Nginx configurado incorrectamente
- Domain DNS apuntando a IP incorrecta

**Solución**:

```bash
# 1. SSH al VPS
ssh root@muva.chat

# 2. Verificar certificado actual
sudo certbot certificates
# Ver fecha de expiración

# 3. Test de renewal (dry-run)
sudo certbot renew --dry-run

# 4. Si falla, verificar puerto 80 abierto
sudo ufw status | grep 80
sudo ufw allow 80/tcp

# 5. Verificar Nginx config para ACME challenge
sudo cat /etc/nginx/sites-available/innpilot.conf | grep ".well-known/acme-challenge"
# Debe tener location block para challenges

# 6. Renovar manualmente
sudo certbot renew --force-renewal

# 7. Si falla, usar método webroot
sudo certbot certonly --webroot -w /var/www/muva-chat/public -d muva.chat -d www.muva.chat

# 8. Reload Nginx
sudo systemctl reload nginx

# 9. Verificar SSL funcionando
curl -I https://muva.chat
openssl s_client -connect muva.chat:443 -servername muva.chat

# 10. Configurar auto-renewal (si no existe)
sudo systemctl status certbot.timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**Prevención**:
- Certbot timer debe estar enabled
- Monitorear expiración con: https://www.ssllabs.com/ssltest/
- Configurar alertas email en cron job

---

### 6. Health Check Fails

**Síntoma**:
- ❌ GitHub Actions falla en step final (health check)
- `/api/health` retorna 404 o 500
- Deployment completo pero app no responde

**Causa**:
- Endpoint `/api/health` no implementado
- Build incompleto (falta compilar API routes)
- App corriendo pero con errores internos
- Database/Supabase no disponible

**Solución**:

```bash
# 1. Verificar endpoint existe localmente
curl http://localhost:3000/api/health

# 2. SSH al VPS
ssh root@muva.chat

# 3. Test desde VPS
curl http://localhost:3000/api/health
curl -I http://localhost:3000/api/health

# 4. Ver logs de Next.js
pm2 logs muva-chat --lines 100

# 5. Verificar build completo
ls -la /var/www/muva-chat/.next/server/pages/api/
# Debe existir: health.js o health.json

# 6. Si falta, rebuild
cd /var/www/muva-chat
npm run build
pm2 reload muva-chat

# 7. Verificar conexión a Supabase
curl -s http://localhost:3000/api/health | jq
# Ver campo "database" o "supabase"

# 8. Test de Supabase desde VPS
curl -H "apikey: YOUR_ANON_KEY" https://ooaumjzaztmutltifhoq.supabase.co/rest/v1/

# 9. Verificar environment variables
pm2 describe muva-chat | grep env
# Debe tener: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 10. Configurar env vars si faltan
pm2 set pm2:NEXT_PUBLIC_SUPABASE_URL "https://ooaumjzaztmutltifhoq.supabase.co"
pm2 restart muva-chat --update-env
```

**Prevención**:
- Implementar `/api/health` robusto con DB check
- CI/CD debe verificar build artifacts antes de deploy
- Monitorear endpoint con UptimeRobot

---

### 7. API Endpoints Returning Errors

**Síntoma**:
- 🔴 API retorna 500 Internal Server Error
- Frontend muestra errores en console: `Failed to fetch`
- Logs muestran: `Unhandled runtime error`

**Causa**:
- Environment variables incorrectas (API keys)
- Database migration no aplicada
- CORS configurado incorrectamente
- Rate limiting de Supabase/external APIs
- Código con bugs en API routes

**Solución**:

```bash
# 1. Identificar endpoint problemático
# Desde browser DevTools → Network tab
# O curl específico:
curl -X POST https://muva.chat/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# 2. SSH al VPS y ver logs
ssh root@muva.chat
pm2 logs muva-chat --lines 200 --err

# 3. Verificar environment variables
cd /var/www/muva-chat
cat .env.local | grep API_KEY
# O verificar en PM2:
pm2 describe muva-chat | grep ANTHROPIC_API_KEY

# 4. Test de API keys
# Test Anthropic:
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"test"}]}'

# Test OpenAI:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 5. Verificar migraciones de DB
npx supabase migration list --remote

# 6. Aplicar migraciones si faltan
npx supabase db push

# 7. Verificar CORS en Next.js config
cat next.config.js | grep headers -A 10

# 8. Si rate limited, verificar quotas
# Supabase Dashboard → Settings → API
# Anthropic Dashboard → Usage
# OpenAI Dashboard → Usage

# 9. Rollback si código con bugs
git reset --hard HEAD~1
npm run build
pm2 reload muva-chat

# 10. Fix y re-deploy
# Fix código → commit → push → auto-deploy via GitHub Actions
```

**Prevención**:
- Implementar error handling robusto en API routes
- Usar try/catch en todas las async functions
- Validar environment variables al startup
- Implementar rate limiting en backend
- Logs estructurados con niveles (debug, info, error)

---

## Comandos de Emergencia

### Restart Completo del Stack

```bash
# SSH al VPS
ssh root@muva.chat

# Restart todo
pm2 restart muva-chat
sudo systemctl restart nginx

# Verificar
pm2 status
sudo systemctl status nginx
curl http://localhost:3000/api/health
curl -I https://muva.chat
```

### Logs Centralizados

```bash
# Ver todo al mismo tiempo
pm2 logs muva-chat | tee -a /tmp/debug.log &
sudo tail -f /var/log/nginx/error.log | tee -a /tmp/debug.log &
sudo tail -f /var/log/nginx/access.log | tee -a /tmp/debug.log &

# Ctrl+C para detener
# Revisar: cat /tmp/debug.log
```

### Rollback de Emergencia (1 comando)

```bash
ssh root@muva.chat "cd /var/www/muva-chat && git reset --hard HEAD~1 && npm ci && npm run build && pm2 reload muva-chat"
```

---

## Recursos Adicionales

- **GitHub Actions Logs**: `gh run list --workflow=deploy.yml`
- **VPS Console**: Hostinger Panel → VPS → Console
- **SSL Check**: https://www.ssllabs.com/ssltest/analyze.html?d=muva.chat
- **Uptime Monitor**: UptimeRobot dashboard
- **PM2 Dashboard**: `pm2 plus` (opcional, de pago)

---

**Last Updated**: Oct 4, 2025
**Support**: GitHub Issues → https://github.com/toneill57/innpilot/issues
