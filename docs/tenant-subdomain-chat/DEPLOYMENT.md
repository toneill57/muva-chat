# Multi-Tenant Subdomain Chat - Deployment Guide

## Pre-requisitos

### DNS Configuration
- Wildcard DNS record configurado: `*.muva.chat` → IP del VPS
- Certificado SSL wildcard para `*.muva.chat` (via Let's Encrypt)
- Nginx configurado para proxy_pass a Next.js

### VPS Requirements
- Node.js 18+ instalado
- PM2 instalado globalmente (`npm install -g pm2`)
- Git configurado con acceso al repositorio
- Puerto 3000 disponible para Next.js

### Environment Variables
Archivo `.env.local` en VPS debe incluir:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ooaumjzaztmutltifhoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Pasos de Deployment

### 1. Preparar Código Local
```bash
# Verificar que no hay cambios pendientes
git status

# Asegurar que tests pasen
npm run build

# Commit cambios
git add .
git commit -m "feat: deploy multi-tenant subdomain chat"

# Push a repositorio
git push origin main
```

### 2. Deployment en VPS

#### SSH al Servidor
```bash
ssh user@muva.chat
cd /var/www/innpilot
```

#### Pull Últimos Cambios
```bash
# Backup del código actual (opcional)
cp -r .next .next.backup.$(date +%Y%m%d_%H%M%S)

# Pull cambios
git pull origin main

# Instalar dependencias (si hubo cambios en package.json)
npm install
```

#### Build de Producción
```bash
# Build optimizado para producción
npm run build

# Verificar éxito del build
echo $?  # Debe retornar 0
```

#### Restart PM2
```bash
# Opción 1: Restart sin downtime
pm2 reload innpilot

# Opción 2: Restart con breve downtime (más seguro)
pm2 restart innpilot

# Verificar status
pm2 status innpilot
```

### 3. Verificar Logs
```bash
# Ver logs en tiempo real
pm2 logs innpilot --lines 50

# Buscar errores
pm2 logs innpilot --err --lines 100

# Verificar que el servidor arrancó correctamente
# Buscar: "✓ Ready in Xms"
```

---

## Verificación de Salud del Sistema

### Health Check Endpoints
```bash
# Health check general
curl -I https://muva.chat/api/health

# Health check de chat API
curl -X POST https://muva.chat/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'

# Health check de tenant chat
curl -X POST https://simmerdown.muva.chat/api/tenant-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","history":[]}'
```

### Verificar Wildcard DNS
```bash
# Test subdomain resolution
dig simmerdown.muva.chat +short
dig xyz.muva.chat +short
dig hotel-boutique.muva.chat +short

# Todos deben retornar la misma IP del VPS
```

### Test Frontend
```bash
# Test page load
curl -I https://simmerdown.muva.chat/chat
curl -I https://xyz.muva.chat/chat

# Expected: HTTP 200 OK
```

---

## Rollback Procedure

### Rollback Rápido (Sin Rebuild)
```bash
# Si hay backup del build anterior
cd /var/www/innpilot
rm -rf .next
mv .next.backup.YYYYMMDD_HHMMSS .next
pm2 restart innpilot
```

### Rollback Completo (Con Rebuild)
```bash
# Checkout al commit anterior
git log --oneline -10  # Identificar commit estable
git checkout <commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart innpilot

# Verificar
pm2 logs innpilot --lines 50
```

### Rollback de Base de Datos
```bash
# Si hubo migraciones de DB, revertir con:
set -a && source .env.local && set +a
npx tsx scripts/execute-ddl-via-api.ts migrations/rollback/YYYYMMDD_rollback.sql
```

---

## Troubleshooting

### Error: Build Failed
**Síntoma**: `npm run build` falla
**Solución**:
```bash
# Limpiar cache
rm -rf .next node_modules
npm install
npm run build
```

### Error: PM2 Process Crashed
**Síntoma**: `pm2 status` muestra estado "errored"
**Solución**:
```bash
# Ver logs de error
pm2 logs innpilot --err --lines 100

# Restart completo
pm2 delete innpilot
pm2 start npm --name innpilot -- start

# Verificar
pm2 status
```

### Error: DNS No Resuelve
**Síntoma**: `dig subdomain.muva.chat` no retorna IP
**Solución**:
1. Verificar wildcard DNS en proveedor (Cloudflare, Route53, etc.)
2. Esperar propagación DNS (hasta 48h, usualmente 5-10min)
3. Test con `nslookup` desde otra red

### Error: SSL Certificate Issues
**Síntoma**: HTTPS muestra warning de certificado
**Solución**:
```bash
# Renovar certificado Let's Encrypt
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### Error: Tenant Isolation Broken
**Síntoma**: Chat de un tenant muestra datos de otro
**Solución**:
1. Verificar RLS policies en Supabase
2. Revisar middleware de tenant detection
3. Verificar filtrado en `/api/tenant-chat`

---

## Monitoring Post-Deployment

### Métricas Clave
- **Uptime**: `pm2 status innpilot` → debe estar "online"
- **Memory**: `pm2 monit` → debe estar < 500MB
- **Response Time**: APIs deben responder < 2s
- **Error Rate**: `pm2 logs --err` → debe estar vacío o con errores no críticos

### Logs a Monitorear
```bash
# PM2 logs
pm2 logs innpilot --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Checklist de Deployment

- [ ] Pre-requisitos verificados (DNS, SSL, env vars)
- [ ] Build local exitoso (`npm run build`)
- [ ] Git push completado
- [ ] SSH a VPS exitoso
- [ ] Git pull completado
- [ ] `npm install` ejecutado (si necesario)
- [ ] `npm run build` exitoso en VPS
- [ ] PM2 restart completado
- [ ] Health checks exitosos (3/3 endpoints)
- [ ] Wildcard DNS resuelve correctamente
- [ ] Tenant isolation verificado
- [ ] Logs no muestran errores críticos
- [ ] Performance metrics dentro de targets

---

**Última actualización**: Octubre 2025
**Autor**: MUVA Team
