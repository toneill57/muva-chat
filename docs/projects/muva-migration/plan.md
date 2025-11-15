# Migración MUVA Chat.io → MUVA.chat - Plan de Implementación

**Proyecto:** MUVA.chat Migration
**Fecha Inicio:** 2025-10-10
**Estado:** 🚀 FASE 0 Completa - Listo para FASE 1

---

## 🎯 OVERVIEW

### Objetivo Principal

Migrar el dominio principal de **muva.chat** a **muva.chat** manteniendo 100% de funcionalidad, sin downtime, y con estrategia de rollback disponible.

**MUVA** = "Muévete" (español) + "Move" (inglés) = **Move Around**

**Slogan:** "Muévete como local"

### ¿Por qué?

1. **Branding Superior**: MUVA es memorable (4 letras vs 8), conversacional, y comunica la propuesta de valor inmediatamente
2. **Diferenciación de Mercado**: `.chat` TLD comunica la propuesta instantáneamente vs `.io` genérico
3. **Triple Capa Semántica**:
   - MUVA = Muévete (imperativo español)
   - MUVA ≈ Move (homófono inglés)
   - MUVA = Multi-Unit Virtual Assistant (acrónimo técnico)
4. **Conexión Emocional**: "Muévete como local" vs "Use MUVA Chat" (experiencia humana vs software)
5. **Visión del Fundador**: MUVA fue siempre la visión original del proyecto

### Alcance

**IN SCOPE:**
- ✅ Soporte dual-domain (muva.chat + muva.chat funcionan en paralelo)
- ✅ Generación SSL wildcard para `*.muva.chat`
- ✅ Modificación de 3 archivos core (next.config.ts, tenant-utils.ts, nginx-subdomain.conf)
- ✅ Testing exhaustivo en producción
- ✅ Migración gradual tenant-por-tenant
- ✅ Redirect 301 final de muva.chat → muva.chat

**OUT OF SCOPE:**
- ❌ Cambios en database schema (subdomain field es agnóstico)
- ❌ Cambios en APIs/CORS (ya usan wildcard)
- ❌ Rebranding visual (logos, colores) - proyecto separado
- ❌ Migración de .env variables (no hay referencias a dominios)

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**DNS Configuration:**
```bash
muva.chat → 195.200.6.216 ✅
muva.chat   → 195.200.6.216 ✅  (YA APUNTA AL MISMO VPS)
```

**Multi-Tenant Architecture:**
- ✅ Nginx extrae subdomain via regex en `server_name` y header `X-Tenant-Subdomain`
- ✅ Next.js rewrites rutas usando subdomain pattern en `next.config.ts`
- ✅ `tenant-utils.ts` usa `getSubdomain(hostname)` para extraer subdomain
- ✅ Database usa field `subdomain` (NO domain) - agnóstico al dominio

**Tenants Actuales (4):**
```
1. simmerdown.muva.chat       → simmerdown (premium)
2. free-hotel-test.muva.chat  → free-hotel-test (free)
3. xyz.muva.chat              → xyz (free)
4. hotel-boutique.muva.chat   → hotel-boutique (basic)
```

**Referencias al Dominio:**
```
next.config.ts:58         → Regex rewrite: innpilot\\.io
next.config.ts:69         → Regex rewrite: innpilot\\.io
tenant-utils.ts:44        → Logic: host.endsWith('.muva.chat')
nginx-subdomain.conf:9    → server_name: *.muva.chat muva.chat
nginx-subdomain.conf:26   → Regex: innpilot\.io
```

### Limitaciones Actuales

- ❌ Dominio `muva.chat` no refleja la visión de marca
- ❌ `.io` TLD genérico sin diferenciación
- ❌ "MUVA Chat" es funcional/técnico vs experiencial
- ❌ Oportunidad de branding perdida (MUVA.chat comunica propuesta instantáneamente)

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**URLs de Producción:**
```
simmerdown.muva.chat/with-me      ← Conversacional, experiencial
free-hotel-test.muva.chat/explore ← Acción directa
hotel-boutique.muva.chat/local    ← Propuesta clara
```

**vs URLs Actuales (legacy):**
```
simmerdown.muva.chat/chat       ← Genérico, técnico
```

**Posicionamiento de Marca:**
- **MUVA Chat** = Plataforma técnica (backend, admin dashboard)
- **MUVA** = Experiencia del huésped (chat, conversación)
- **Tagline:** "MUVA Chat powered by MUVA.chat"

### Características Clave

1. **Zero Downtime**: Estrategia dual-domain permite ambos funcionando en paralelo
2. **100% Reversible**: Rollback en < 5 minutos (revertir nginx + restart)
3. **Gradual Migration**: Tenant-por-tenant con monitoreo entre cada uno
4. **Performance Neutral**: Sin cambios en lógica core, solo routing
5. **Database Agnostic**: Campo `subdomain` no requiere cambios
6. **API Compatible**: CORS wildcard ya soporta cualquier dominio

---

## 📱 TECHNICAL STACK

### Frontend
- Next.js 15.5.3 (App Router)
- TypeScript 5
- Rewrites configuration en `next.config.ts`

### Backend/Infrastructure
- VPS: Ubuntu 22.04 LTS (195.200.6.216)
- Nginx 1.18.0 (wildcard subdomain routing)
- PM2 (process manager)
- Certbot/Let's Encrypt (SSL automation)

### Database
- Supabase PostgreSQL
- Table: `tenant_registry` (field: `subdomain` - domain agnostic)

### DNS
- CloudFlare / Registrar DNS (ambos dominios → mismo VPS)

---

## 🔧 DESARROLLO - FASES

### FASE 0: Pre-Migration Audit (1h)

**Objetivo:** Verificar estado actual y preparar ambiente para cambios

**Entregables:**
- ✅ Verificar DNS apunta correctamente (dig muva.chat, dig muva.chat)
- ✅ Auditar SSL actual (certbot certificates)
- ✅ Backup de configuraciones (nginx, next.config, .env)
- ✅ Listar todas las referencias hardcoded a `muva.chat` en codebase
- ✅ Verificar tenant_registry en database (4 tenants esperados)
- ✅ Snapshot de logs actuales (nginx, PM2) como baseline

**Archivos a verificar:**
- `/etc/nginx/sites-available/muva.chat` (nginx config actual)
- `/etc/letsencrypt/live/` (SSL certs actuales)
- `next.config.ts` (rewrites actuales)
- `src/lib/tenant-utils.ts` (getSubdomain logic)
- `.env.local` (NO debe tener referencias a domains)

**Testing:**
```bash
# DNS verification
dig +short muva.chat
dig +short muva.chat

# SSL check
sudo certbot certificates

# Grep all muva.chat references
grep -r "innpilot\.io" src/ --include="*.ts" --include="*.tsx"

# Database check
node -e "const { createClient } = require('@supabase/supabase-js'); ..."
```

**Success Criteria:**
- [x] DNS para ambos dominios apunta a 195.200.6.216
- [x] SSL actual para `*.muva.chat` está activo
- [x] 3 archivos identificados con referencias a muva.chat
- [x] 4 tenants en database confirmados
- [x] Backup de configs creado en `docs/projects/muva-migration/backups/`

---

### FASE 1: Dual-Domain Support (2h)

**Objetivo:** Habilitar ambos dominios (muva.chat + muva.chat) funcionando en paralelo sin afectar tráfico actual

**Entregables:**
- ✅ Modificar `next.config.ts` para soportar ambos dominios en rewrites
- ✅ Modificar `src/lib/tenant-utils.ts` para detectar subdomain en `.muva.chat`
- ✅ Modificar `docs/deployment/nginx-subdomain.conf` para ambos server_name
- ✅ Commit changes a branch `feat/muva-migration`

**Archivos a crear/modificar:**

**1. `next.config.ts` (líneas 58, 69)**
```typescript
// ANTES
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io)(?:\\:\\d+)?',

// DESPUÉS
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io|muva\\.chat)(?:\\:\\d+)?',
```

**2. `src/lib/tenant-utils.ts` (después de línea 55, agregar 12 líneas)**
```typescript
// Add support for muva.chat domain
if (host.endsWith('.muva.chat')) {
  const parts = host.split('.');
  // subdomain.muva.chat → ["subdomain", "muva", "chat"]
  if (parts.length === 3) {
    // Treat "www" as no subdomain
    return parts[0] === 'www' ? null : parts[0];
  }
}
```

**3. `docs/deployment/nginx-subdomain.conf` (líneas 9, 26)**
```nginx
# ANTES (línea 9)
server_name *.muva.chat muva.chat;

# DESPUÉS
server_name *.muva.chat muva.chat *.muva.chat muva.chat;

# ANTES (línea 26)
if ($host ~* ^([^.]+)\.innpilot\.io$) {

# DESPUÉS
if ($host ~* ^([^.]+)\.(innpilot\.io|muva\.chat)$) {
```

**Testing:**
```bash
# Verify changes locally
npm run dev

# Test subdomain detection
node -e "
const { getSubdomain } = require('./src/lib/tenant-utils');
console.log(getSubdomain('simmerdown.muva.chat')); // → 'simmerdown'
console.log(getSubdomain('simmerdown.muva.chat'));   // → 'simmerdown'
console.log(getSubdomain('muva.chat'));              // → null
"
```

**Success Criteria:**
- [ ] `getSubdomain()` detecta correctamente subdomain en `.muva.chat`
- [ ] Next.js rewrites incluyen ambos dominios en regex
- [ ] Nginx config incluye ambos server_name
- [ ] Local dev testing OK (localhost routing funciona)
- [ ] Git commit creado en `feat/muva-migration`

---

### FASE 2: SSL & Testing (1h)

**Objetivo:** Generar SSL para `*.muva.chat`, deployar cambios a VPS, y validar que ambos dominios funcionan

**Entregables:**
- ✅ Generar wildcard SSL certificate para `*.muva.chat` via Certbot
- ✅ Deploy código a VPS (git pull + PM2 restart)
- ✅ Copiar nginx config actualizado a VPS y reload nginx
- ✅ Testing completo en `simmerdown.muva.chat`

**Archivos a desplegar:**
- `next.config.ts` (modificado)
- `src/lib/tenant-utils.ts` (modificado)
- Copy `docs/deployment/nginx-subdomain.conf` → `/etc/nginx/sites-available/muva.chat`

**Comandos en VPS:**
```bash
# 1. Generate SSL for muva.chat
sudo certbot certonly --nginx \
  -d "*.muva.chat" \
  -d "muva.chat" \
  --agree-tos \
  --email oneill@muva.chat

# 2. Verify SSL
sudo certbot certificates | grep muva.chat

# 3. Copy nginx config
sudo cp docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/muva.chat

# 4. Test nginx config
sudo nginx -t

# 5. Reload nginx (graceful, no downtime)
sudo systemctl reload nginx

# 6. Deploy Next.js app
cd /var/www/muva-chat
git pull origin feat/muva-migration
npm ci
npm run build
pm2 restart muva-chat
```

**Testing:**
```bash
# 1. Test DNS resolution
curl -I https://simmerdown.muva.chat
curl -I https://simmerdown.muva.chat

# 2. Test chat API
curl -X POST https://simmerdown.muva.chat/api/public/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola","tenant_id":"b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"}'

# 3. Monitor logs
pm2 logs muva-chat --lines 50
sudo tail -f /var/log/nginx/muva-subdomain-access.log
```

**Manual Testing Checklist:**
- [ ] `https://simmerdown.muva.chat` carga correctamente
- [ ] `https://simmerdown.muva.chat` sigue funcionando
- [ ] Chat interface funciona en muva.chat
- [ ] Admin panel accesible en muva.chat
- [ ] SSL certificate válido (sin warnings)
- [ ] Performance sin degradación (< 500ms response time)
- [ ] Zero errores en PM2 logs
- [ ] Zero errores en Nginx logs

**Success Criteria:**
- [ ] SSL activo para `*.muva.chat` y `muva.chat`
- [ ] Ambos dominios funcionan simultáneamente
- [ ] Chat API responde en ambos dominios
- [ ] Logs limpios (sin errores 404, 500, SSL)

---

### FASE 3: Gradual Tenant Migration (1-2 días)

**Objetivo:** Migrar tenants de forma controlada, empezando con SimmerDown (premium), monitoreando cada cambio

**Entregables:**
- ✅ Comunicar a SimmerDown migración a `simmerdown.muva.chat`
- ✅ Actualizar sus widgets/links externos
- ✅ Monitorear performance/errors 24-48h
- ✅ Repetir con otros 3 tenants

**Archivos a crear/modificar:**
- `docs/projects/muva-migration/tenant-migration-log.md` (tracking por tenant)

**Migration Order (por riesgo):**
```
1. simmerdown (premium) - Cliente pagado, alta visibilidad
   → Monitorear 48h antes de continuar

2. hotel-boutique (basic) - Tier medio
   → Monitorear 24h

3. free-hotel-test (free) - Testing tenant
4. xyz (free) - Menor riesgo
```

**Por Cada Tenant:**

**Step 1: Comunicación**
```markdown
Subject: Actualización de Dominio - SimmerDown

Hola [Cliente],

Estamos actualizando nuestro dominio principal a MUVA.chat.

**Cambios:**
- URL anterior: simmerdown.muva.chat
- URL nueva: simmerdown.muva.chat

**Acción requerida:**
1. Actualizar widget embed en su sitio web (si aplica)
2. Actualizar links en redes sociales

**Beneficios:**
- Dominio más memorable (.chat)
- Mejor posicionamiento de marca
- Sin cambios en funcionalidad

La URL anterior seguirá funcionando durante 30 días.

Saludos,
MUVA Chat Team
```

**Step 2: Update Links**
```bash
# If tenant has embedded widgets
# Provide updated embed code with muva.chat URL

# Update documentation
# Add entry to tenant-migration-log.md
```

**Step 3: Monitor**
```bash
# Check logs for specific tenant
pm2 logs muva-chat | grep "simmerdown"

# Check analytics
# Query guest_conversations for simmerdown
# Verify no drop in traffic
```

**Testing Per Tenant:**
- [ ] Chat widget funciona en cliente's website
- [ ] Email notifications llegan correctamente
- [ ] Guest conversations se guardan en database
- [ ] Analytics tracking funciona
- [ ] Zero complaints de usuarios finales

**tenant-migration-log.md Template:**
```markdown
# Tenant Migration Log

## simmerdown (Premium)
**Date:** 2025-10-10
**Status:** ✅ Complete
**Old URL:** simmerdown.muva.chat
**New URL:** simmerdown.muva.chat

**Actions:**
- [x] Comunicación enviada (2025-10-10 10:00 AM)
- [x] Widget embed actualizado
- [x] Links en Instagram actualizados
- [x] Monitoreo 48h - Sin incidentes

**Metrics:**
- Conversations pre-migration: 150/day
- Conversations post-migration: 152/day (+1.3%)
- Response time: 450ms → 440ms (mejora)
- Error rate: 0.2% → 0.1%

**Notes:**
Cliente muy satisfecho con nuevo branding.
```

**Success Criteria:**
- [ ] 4/4 tenants migrados exitosamente
- [ ] Zero degradación de performance
- [ ] Zero pérdida de funcionalidad
- [ ] Clientes notificados y satisfechos

---

### FASE 4: Full Cutover (30min)

**Objetivo:** Establecer muva.chat como dominio principal, redirigir muva.chat permanentemente

**Entregables:**
- ✅ Agregar redirect 301 en Nginx: `muva.chat → muva.chat`
- ✅ Limpiar código legacy (opcional, mantener compatibilidad)
- ✅ Actualizar documentación interna
- ✅ Comunicado público sobre nuevo branding

**Archivos a modificar:**

**1. `docs/deployment/nginx-subdomain.conf` (agregar redirect block)**
```nginx
# Redirect muva.chat to muva.chat (permanent)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.muva.chat muva.chat;

    # SSL (usar mismo cert por ahora)
    ssl_certificate /etc/letsencrypt/live/muva.chat-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/muva.chat-0001/privkey.pem;

    # 301 Redirect permanente
    return 301 https://$host$request_uri;

    # Rewrite .muva.chat → .muva.chat
    if ($host ~* ^([^.]+)\.innpilot\.io$) {
        return 301 https://$1.muva.chat$request_uri;
    }

    # Root domain
    if ($host = "muva.chat") {
        return 301 https://muva.chat$request_uri;
    }
}
```

**2. Documentación a actualizar:**
- `README.md` - Cambiar referencias a muva.chat
- `CLAUDE.md` - Actualizar ejemplos de URLs
- `docs/deployment/*.md` - Todas las guías
- `docs/tenant-subdomain-chat/*.md` - Ejemplos de tenant URLs

**Comandos:**
```bash
# 1. Deploy nginx redirect
sudo cp docs/deployment/nginx-subdomain.conf /etc/nginx/sites-available/muva.chat
sudo nginx -t
sudo systemctl reload nginx

# 2. Test redirect
curl -I https://simmerdown.muva.chat
# Should return: Location: https://simmerdown.muva.chat

# 3. Update all docs
find docs/ -name "*.md" -type f -exec sed -i 's/innpilot\.io/muva.chat/g' {} +

# 4. Commit changes
git add .
git commit -m "feat: complete migration to muva.chat domain"
git push origin feat/muva-migration
```

**Testing:**
```bash
# Verify redirects
curl -I https://muva.chat
curl -I https://simmerdown.muva.chat
curl -I https://free-hotel-test.muva.chat

# All should return 301 with Location: https://...muva.chat

# Test direct muva.chat access
curl -I https://simmerdown.muva.chat
# Should return 200 OK
```

**Comunicado Público (opcional):**
```markdown
# Presentamos MUVA.chat 🎉

MUVA Chat ahora es **MUVA.chat**

**MUVA** viene de "Muévete" - porque viajar no es quedarse quieto.

Mismo equipo. Misma tecnología. Mejor experiencia.

Descubre más en: https://muva.chat
```

**Success Criteria:**
- [ ] Redirect 301 funcionando para todos los tenants
- [ ] muva.chat URLs redirigen a muva.chat
- [ ] SEO preserved (301 mantiene ranking)
- [ ] Documentación actualizada
- [ ] Zero broken links internos

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad

- [ ] Ambos dominios funcionan en FASE 1-3
- [ ] Chat API responde correctamente en muva.chat
- [ ] Admin panel accesible en muva.chat
- [ ] Guest conversations se guardan en database
- [ ] Email notifications funcionan
- [ ] File uploads funcionan
- [ ] Analytics tracking OK

### Performance

- [ ] Response time < 500ms (igual o mejor que actual)
- [ ] Zero degradación en uptime (99.9%)
- [ ] SSL handshake < 100ms
- [ ] Page load time < 2s (same as current)

### SEO

- [ ] Redirect 301 preserva SEO ranking
- [ ] sitemap.xml actualizado (si existe)
- [ ] robots.txt actualizado (si existe)
- [ ] Google Search Console notificado

### Seguridad

- [ ] SSL válido para `*.muva.chat` y `muva.chat`
- [ ] SSL grade A+ en SSLLabs
- [ ] Security headers iguales o mejores
- [ ] Zero vulnerabilidades introducidas

### Accesibilidad

- [ ] URLs son accesibles y memorables
- [ ] Screen readers funcionan igual
- [ ] Keyboard navigation OK

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal)

**Responsabilidad:** Modificaciones de código core (Next.js, TypeScript)

**Tareas:**
- FASE 0: Auditar referencias a muva.chat en codebase
- FASE 1: Modificar `next.config.ts` y `tenant-utils.ts`
- FASE 1: Validar cambios con tests locales
- FASE 2: Asistir en debugging si hay issues post-deploy

**Archivos:**
- `next.config.ts` (modificar líneas 58, 69)
- `src/lib/tenant-utils.ts` (agregar 12 líneas después línea 55)
- `src/lib/tenant-resolver.ts` (verificar, probablemente no requiere cambios)

---

### 2. **@agent-deploy-agent** (Deployment)

**Responsabilidad:** Deploy VPS, SSL, Nginx, git workflow

**Tareas:**
- FASE 0: Backup de configuraciones actuales
- FASE 2: Generar wildcard SSL para `*.muva.chat`
- FASE 2: Deploy código a VPS (git pull, npm build, PM2 restart)
- FASE 2: Copiar nginx config y reload nginx
- FASE 4: Implementar redirects 301 en nginx

**Archivos:**
- `docs/deployment/nginx-subdomain.conf` (modificar y deploy)
- VPS: `/etc/nginx/sites-available/muva.chat`
- VPS: `/etc/letsencrypt/live/` (SSL certs)

**Comandos VPS:**
```bash
sudo certbot certonly --nginx -d "*.muva.chat" -d "muva.chat"
sudo nginx -t
sudo systemctl reload nginx
pm2 restart muva-chat
```

---

### 3. **@agent-infrastructure-monitor** (Monitoring)

**Responsabilidad:** Testing, monitoreo, verificación de performance y errores

**Tareas:**
- FASE 2: Ejecutar tests completos post-deploy
- FASE 2: Monitorear logs (nginx, PM2) por 1 hora post-deploy
- FASE 3: Monitorear cada tenant migration
- FASE 4: Verificar redirects funcionan correctamente

**Testing:**
```bash
# Performance testing
curl -w "@curl-format.txt" -o /dev/null -s https://simmerdown.muva.chat

# API testing
npx tsx scripts/test-multi-tenant.ts

# Log monitoring
pm2 logs muva-chat --lines 100 | grep -i error
sudo tail -f /var/log/nginx/muva-subdomain-error.log
```

**Tools:**
- PM2 logs
- Nginx access/error logs
- MCP Supabase (`mcp__supabase__get_logs`)
- Performance testing scripts

---

### 4. **@agent-ux-interface** (Opcional - Post-Migration)

**Responsabilidad:** Branding visual updates (logos, colors, marketing copy)

**Tareas:**
- POST-MIGRATION: Actualizar referencias visuales a "MUVA Chat" → "MUVA"
- POST-MIGRATION: Crear landing page muva.chat (si se desea)
- POST-MIGRATION: Actualizar chat widget branding

**Nota:** Este agente NO es crítico para la migración técnica. Se puede ejecutar después como proyecto separado.

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/MUVA Chat/
├── src/
│   ├── lib/
│   │   ├── tenant-utils.ts                    # MODIFICAR (FASE 1)
│   │   └── tenant-resolver.ts                 # VERIFICAR (no cambios)
│   └── middleware.ts                          # VERIFICAR (usa headers, no domain)
├── next.config.ts                             # MODIFICAR (FASE 1)
├── docs/
│   ├── deployment/
│   │   └── nginx-subdomain.conf               # MODIFICAR (FASE 1, 4)
│   └── projects/
│       └── muva-migration/
│           ├── plan.md                        # ESTE ARCHIVO
│           ├── TODO.md                        # Tareas detalladas
│           ├── muva-migration-prompt-workflow.md
│           ├── backups/
│           │   ├── nginx-subdomain.conf.backup
│           │   ├── next.config.ts.backup
│           │   └── tenant-utils.ts.backup
│           ├── fase-0/
│           │   ├── AUDIT_REPORT.md
│           │   └── DNS_VERIFICATION.md
│           ├── fase-1/
│           │   ├── CODE_CHANGES.md
│           │   └── LOCAL_TESTING.md
│           ├── fase-2/
│           │   ├── SSL_GENERATION.md
│           │   ├── DEPLOYMENT_LOG.md
│           │   └── TESTING_RESULTS.md
│           ├── fase-3/
│           │   ├── tenant-migration-log.md
│           │   └── MONITORING_REPORT.md
│           └── fase-4/
│               ├── REDIRECT_IMPLEMENTATION.md
│               └── FINAL_VERIFICATION.md
└── snapshots/
    ├── backend-developer.md                   # ACTUALIZAR (agregar CURRENT PROJECT)
    ├── infrastructure-monitor.md              # ACTUALIZAR (agregar CURRENT PROJECT)
    └── deploy-agent.md                        # ACTUALIZAR (agregar CURRENT PROJECT)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. DNS Propagation:**
- DNS ya apunta correctamente (verificado con `dig`)
- No hay delay esperado ya que ambos dominios apuntan al mismo IP

**2. SSL Certificates:**
- Wildcard cert para `*.muva.chat` requiere DNS challenge (Certbot maneja automáticamente)
- Cert actual `*.muva.chat` se mantiene activo durante migración
- Ambos certs coexisten sin conflicto

**3. Database Schema:**
- ✅ Campo `subdomain` es agnóstico al dominio
- ✅ NO requiere migration de datos
- ✅ Tenant IDs no cambian

**4. CORS & APIs:**
- ✅ APIs usan wildcard `*` en CORS (ver `src/app/api/public/chat/route.ts:316`)
- ✅ Funcionan con cualquier dominio
- ✅ NO requiere cambios

**5. Middleware:**
- ✅ Usa header `x-tenant-subdomain` de Nginx (agnóstico a domain)
- ✅ Fallback a `getSubdomain(hostname)` si header no existe
- ✅ Solo requiere cambio en `getSubdomain()` function

**6. Environment Variables:**
- ✅ `.env.local` NO tiene referencias a domains
- ✅ Usa `SUPABASE_URL`, `OPENAI_API_KEY`, etc (agnósticos)
- ✅ NO requiere cambios

**7. Rollback Strategy:**
```bash
# Si algo sale mal en FASE 2:
cd /var/www/muva-chat
git revert HEAD
sudo cp backups/nginx-subdomain.conf.backup /etc/nginx/sites-available/muva.chat
sudo systemctl reload nginx
pm2 restart muva-chat

# Tiempo estimado de rollback: < 5 minutos
```

**8. SEO Considerations:**
- 301 redirects preservan SEO ranking (Google mantiene 90-99% del link juice)
- Redirect debe estar activo mínimo 6 meses para transición completa
- Considerar mantener muva.chat activo 12 meses para SEO safety

**9. Testing Strategy:**
- FASE 2: Testing exhaustivo en producción (simmerdown tenant)
- FASE 3: Gradual rollout minimiza blast radius
- FASE 4: Redirects son reversibles (solo quitar server block)

**10. Communication:**
- Notificar a tenants premium primero (SimmerDown)
- Proveer 7 días de notice antes de cada tenant migration
- Documentar feedback de usuarios

---

## 🚨 RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| SSL cert no cubre muva.chat | Baja | Alto | ✅ FASE 2 genera cert ANTES de deploy |
| Nginx regex incorrecta | Media | Alto | ✅ Testing local + VPS staging antes de prod |
| DNS propagation delay | Muy Baja | Bajo | ✅ DNS ya apunta (verificado) |
| Tenant confusion | Baja | Medio | ✅ Comunicación clara + dual-domain por 30 días |
| Performance degradation | Muy Baja | Alto | ✅ Monitoring en FASE 2-4, rollback disponible |
| SEO ranking drop | Baja | Medio | ✅ 301 redirects preserve SEO (standard practice) |
| Broken external links | Media | Bajo | ✅ muva.chat mantiene redirect permanente |

---

## 📊 MÉTRICAS DE ÉXITO

**Pre-Migration Baseline:**
```
Uptime: 99.9%
Response time: 450ms average
Error rate: 0.2%
Daily conversations: ~150
SSL grade: A+
```

**Post-Migration Target:**
```
Uptime: ≥99.9% (mantener o mejorar)
Response time: ≤500ms (no degradar)
Error rate: ≤0.2% (mantener)
Daily conversations: ≥150 (mantener)
SSL grade: A+ (mantener)
```

**Success Thresholds:**
- ✅ Zero downtime durante migración
- ✅ < 5% de aumento en response time (aceptable)
- ✅ Zero pérdida de conversaciones
- ✅ Zero complaints de usuarios sobre acceso

---

**Última actualización:** 2025-10-10 (17:30)
**FASE 0:** ✅ COMPLETADA (6/6 tareas)
**Próximo paso:** Ejecutar FASE 1 (Dual-Domain Support)
**Duración total estimada:** 4-5 horas + 1-2 días gradual migration
