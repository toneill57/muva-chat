# Grep Results - muva.chat References

**Date:** 2025-10-10
**Project:** MUVA.chat Migration - FASE 0
**Purpose:** Identificar todas las referencias hardcoded antes de dual-domain implementation

---

## CRÍTICOS (Requieren cambio para funcionalidad)

### 1. next.config.ts
**Líneas:** 58, 69
**Tipo:** Next.js rewrites configuration - Subdomain routing

```typescript
// Línea 58: Rewrite pattern for subdomain routing
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io)(?:\\:\\d+)?',

// Línea 69: Rewrite pattern for root path
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io)(?:\\:\\d+)?',
```

**Acción:** Agregar `|muva\\.chat` al regex pattern en ambas líneas

**Impacto:** Sin este cambio, Next.js rewrites NO funcionarán para URLs con `.muva.chat` - requests no se rutearán a la estructura `/:tenant/:path`

---

### 2. src/lib/tenant-utils.ts
**Líneas:** 14, 16, 17, 24-27, 43-46, 53
**Tipo:** Business logic - Subdomain extraction

```typescript
// Línea 14: Comment
* - Production: subdomain.muva.chat → "subdomain"

// Línea 16-17: Comments
* - No subdomain: muva.chat → null
* - WWW subdomain: www.muva.chat → null (treated as no subdomain)

// Línea 24-27: Examples in comments
* getSubdomain('simmerdown.muva.chat')        // → "simmerdown"
* getSubdomain('free-hotel-test.muva.chat')  // → "free-hotel-test"
* getSubdomain('www.muva.chat')              // → null
* getSubdomain('muva.chat')                  // → null

// Línea 43-46: CORE LOGIC - CRITICAL
// Production: subdomain.muva.chat
if (host.endsWith('.muva.chat')) {
  const parts = host.split('.');
  // subdomain.muva.chat → ["subdomain", "innpilot", "io"]

// Línea 53: Comment
// No subdomain found (muva.chat, www.muva.chat, or unknown domain)
```

**Acción:** Agregar bloque similar para `.muva.chat` después línea 51

---

### 3. docs/deployment/nginx-subdomain.conf
**Líneas:** 9, 12-13, 23-24, 73
**Tipo:** Nginx configuration - Server names and SSL paths

```nginx
# Línea 9: CRITICAL - Server name directive
server_name *.muva.chat muva.chat;

# Línea 12-13: SSL certificate paths
ssl_certificate /etc/letsencrypt/live/muva.chat-0001/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/muva.chat-0001/privkey.pem;

# Línea 23-24: Comments explaining subdomain extraction
# Example: simmerdown.muva.chat -> subdomain = "simmerdown"
# Example: muva.chat -> subdomain = "" (empty)

# Línea 73: HTTP redirect server block
server_name *.muva.chat muva.chat;
```

**Acción:**
- Línea 9: Agregar `*.muva.chat muva.chat` al server_name
- Líneas 12-13: Mantener paths actuales (certificado soporta ambos dominios post-fase-1)
- Línea 73: Agregar `*.muva.chat muva.chat` al server_name

---

### 4. src/lib/tenant-resolver.ts
**Línea:** 43
**Tipo:** Comment only (no code logic)

```typescript
// Línea 43: Comment explaining resolution
* (e.g., simmerdown.muva.chat → tenant_id)
```

**Acción:** Actualizar comment para incluir ejemplo muva.chat (non-blocking)

---

## SEMI-CRÍTICOS (UI/UX Display - No bloquean funcionalidad)

### 4. src/app/[tenant]/admin/settings/page.tsx
**Línea:** 286
**Tipo:** UI placeholder text

```tsx
https://{tenant?.subdomain || 'yoursite'}.muva.chat
```

**Acción:** Cambiar a `.muva.chat` en FASE 2 (después de migración tenants)

---

### 5. src/app/[tenant]/admin/branding/page.tsx
**Línea:** 42
**Tipo:** UI example text

```tsx
at <code className="bg-blue-100 px-2 py-1 rounded text-xs">{subdomain}.muva.chat/chat</code>
```

**Acción:** Cambiar a `.muva.chat` en FASE 2

---

### 6. src/app/[tenant]/admin/content/page.tsx
**Línea:** 33
**Tipo:** UI display text

```tsx
{subdomain}.muva.chat
```

**Acción:** Cambiar a `.muva.chat` en FASE 2

---

### 7. src/app/[tenant]/not-found.tsx
**Líneas:** 63, 66, 93
**Tipo:** Error page examples and support email

```tsx
// Línea 63: Example URL in error message
https://[tenant-name].muva.chat

// Línea 66: Example domain
Example: <span className="font-mono">https://simmerdown.muva.chat</span>

// Línea 93: Support email link
href="mailto:support@muva.chat"
```

**Acción:**
- Líneas 63, 66: Cambiar a `.muva.chat` en FASE 2
- Línea 93: Email puede mantener dominio muva.chat (decisión de negocio)

---

### 8. src/components/admin/AdminHeader.tsx
**Línea:** 26
**Tipo:** UI display text

```tsx
{tenant?.subdomain || 'loading'}.muva.chat
```

**Acción:** Cambiar a `.muva.chat` en FASE 2

---

## DEPLOYMENT/SCRIPTS (Requieren actualización post-deploy)

### 9. docs/deployment/nginx-innpilot.conf
**Líneas:** 14, 24, 27-28
**Tipo:** Legacy nginx config (deprecated)

```nginx
# Línea 14, 24: Server name
server_name muva.chat www.muva.chat;

# Línea 27-28: SSL paths (commented out)
# ssl_certificate /etc/letsencrypt/live/muva.chat/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/muva.chat/privkey.pem;
```

**Acción:** Mantener para referencia histórica (archivo no activo en VPS)

---

### 10. scripts/verify-deployment.sh
**Línea:** 16
**Tipo:** Deployment verification script

```bash
DOMAIN="muva.chat"
```

**Acción:** Cambiar a `muva.chat` en FASE 3 o hacer configurable

---

### 11. scripts/vps-setup.sh
**Línea:** 90
**Tipo:** Setup instruction comment

```bash
echo "  7. Setup SSL: certbot --nginx -d muva.chat -d www.muva.chat"
```

**Acción:** Actualizar para incluir muva.chat en FASE 3

---

### 12. scripts/diagnose-vps.sh
**Líneas:** 39, 42, 124, 127, 131, 143
**Tipo:** VPS diagnostic script

```bash
# Línea 39, 42: Wildcard check
if grep -q "*.muva.chat" "$NGINX_CONFIG"; then
echo -e "${RED}❌ WARNING: Wildcard subdomain (*.muva.chat) NOT found${NC}"

# Línea 124, 127, 131: Health check endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://muva.chat/api/health)
curl -s https://muva.chat/api/health | jq '.'

# Línea 143: Subdomain test
echo -e "${BLUE}Testing: ${subdomain}.muva.chat${NC}"
```

**Acción:** Agregar tests paralelos para muva.chat en FASE 3

---

### 13. scripts/deploy-vps.sh
**Líneas:** 75-77
**Tipo:** Deploy success message

```bash
echo "  - https://simmerdown.muva.chat/admin"
echo "  - https://simmerdown.muva.chat/admin/knowledge-base"
echo "  - https://simmerdown.muva.chat/admin/settings"
```

**Acción:** Cambiar a muva.chat en FASE 3

---

### 14. scripts/cron/setup-archive-cron.sh
**Línea:** 28
**Tipo:** Cron job URL

```bash
CRON_URL="https://muva.chat/api/cron/archive-conversations"
```

**Acción:** Cambiar a muva.chat en FASE 3 (funciona con ambos durante transición)

---

### 15. scripts/deprecated/multi-tenant/test-subdomain-integration.sh
**Líneas:** 71-72, 75
**Tipo:** Integration test script (deprecated)

```bash
run_test "WWW subdomain (should be treated as null)" "www.muva.chat" "null"
run_test "Production subdomain (simmerdown.muva.chat)" "simmerdown.muva.chat" "simmerdown"
run_test "Main domain (muva.chat)" "muva.chat" "null"
```

**Acción:** Agregar tests para muva.chat en FASE 3 (archivo deprecated, low priority)

---

## DOCUMENTACIÓN (No bloquean funcionalidad - FASE 4)

**Total:** 137+ líneas en 14 archivos markdown

### Archivos afectados:
1. `docs/features/sire-compliance/FASE_2_IMPLEMENTATION_RESULTS.md` - 1 línea (email admin)
2. `docs/development/DEVELOPMENT.md` - 3 líneas (URLs de referencia)
3. `docs/projects/muva-migration/fase-0/SSL_AUDIT.md` - 27 líneas (documentación SSL actual)
4. `docs/projects/muva-migration/fase-0/DNS_VERIFICATION.md` - 6 líneas (verificación DNS)
5. `docs/projects/muva-migration/muva-migration-prompt-workflow.md` - 58+ líneas (este mismo workflow)
6. `docs/projects/muva-migration/TODO.md` - 24+ líneas (tareas de migración)
7. `docs/projects/muva-migration/plan.md` - 70+ líneas (plan de migración)
8. `docs/projects/muva-migration/backups/BACKUP_LOG.md` - 4 líneas (log de backups)
9. `docs/projects/guest-portal/fase-2.5/IMPLEMENTATION_SUMMARY.md` - 2 líneas (ejemplos de URLs)
10. `docs/deployment/POSTGRES_UPGRADE_GUIDE.md` - 1 línea (ejemplo fetch)
11. `docs/deployment/TROUBLESHOOTING.md` - 20+ líneas (ejemplos troubleshooting)
12. `docs/deployment/GITHUB_SECRETS.md` - 3 líneas (ejemplos SSH)
13. `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md` - 80+ líneas (guía de setup actual)
14. `docs/deployment/DEPLOYMENT_WORKFLOW.md` - 5+ líneas (workflow actual)

**Acción:** Actualizar en FASE 4 (post-migración completa) con search-replace global

---

## RESUMEN

### Archivos CRÍTICOS (Requieren cambio para FASE 1)
| Archivo | Líneas | Tipo | Prioridad |
|---------|--------|------|-----------|
| `next.config.ts` | 58, 69 | Next.js rewrites | 🔴 ALTA |
| `src/lib/tenant-utils.ts` | 44 | Business logic | 🔴 ALTA |
| `docs/deployment/nginx-subdomain.conf` | 9, 73 | Server config | 🔴 ALTA |

**Total CRÍTICOS:** 3 archivos, 5 líneas de código funcional

### Archivos SEMI-CRÍTICOS (UI/UX - FASE 2)
| Archivo | Líneas | Tipo | Prioridad |
|---------|--------|------|-----------|
| `src/app/[tenant]/admin/settings/page.tsx` | 286 | UI text | 🟡 MEDIA |
| `src/app/[tenant]/admin/branding/page.tsx` | 42 | UI text | 🟡 MEDIA |
| `src/app/[tenant]/admin/content/page.tsx` | 33 | UI text | 🟡 MEDIA |
| `src/app/[tenant]/not-found.tsx` | 63, 66 | UI text | 🟡 MEDIA |
| `src/components/admin/AdminHeader.tsx` | 26 | UI text | 🟡 MEDIA |

**Total SEMI-CRÍTICOS:** 5 archivos, 7 líneas

### Archivos DEPLOYMENT/SCRIPTS (FASE 3)
| Archivo | Líneas | Tipo | Prioridad |
|---------|--------|------|-----------|
| `scripts/verify-deployment.sh` | 16 | Script | 🟢 BAJA |
| `scripts/diagnose-vps.sh` | 39, 124, 143 | Script | 🟢 BAJA |
| `scripts/deploy-vps.sh` | 75-77 | Script | 🟢 BAJA |
| `scripts/cron/setup-archive-cron.sh` | 28 | Cron | 🟢 BAJA |

**Total SCRIPTS:** 4 archivos, 8+ líneas

### Archivos DOCUMENTACIÓN (FASE 4)
**Total DOCS:** 14 archivos markdown, 137+ líneas

---

## ARCHIVOS PRIORITARIOS PARA FASE 1 (Dual-Domain Support)

### 1. next.config.ts
**Cambio requerido:** Agregar `|muva\\.chat` al regex pattern en líneas 58 y 69

**Regex actual:**
```typescript
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io)(?:\\:\\d+)?',
```

**Regex esperado:**
```typescript
value: '(?<subdomain>[^.]+)\\.(localhost|innpilot\\.io|muva\\.chat)(?:\\:\\d+)?',
```

**Impacto:** Sin este cambio, Next.js rewrites no rutearán correctamente URLs con `.muva.chat` a la estructura `/:tenant/:path`. El routing completo fallará.

---

### 2. src/lib/tenant-utils.ts
**Cambio requerido:** Agregar bloque condicional para `.muva.chat` después línea 51

**Estructura esperada:**
```typescript
// Production: subdomain.muva.chat
if (host.endsWith('.muva.chat')) {
  const parts = host.split('.');
  const subdomain = parts[0];
  return subdomain === 'www' ? null : subdomain;
}

// Production: subdomain.muva.chat (NEW)
if (host.endsWith('.muva.chat')) {
  const parts = host.split('.');
  const subdomain = parts[0];
  return subdomain === 'www' ? null : subdomain;
}
```

**Impacto:** Sin este cambio, URLs con `.muva.chat` no resolverán tenants correctamente en el backend.

---

### 3. docs/deployment/nginx-subdomain.conf
**Cambios requeridos:**
- **Línea 9:** `server_name *.muva.chat muva.chat *.muva.chat muva.chat;`
- **Línea 73:** `server_name *.muva.chat muva.chat *.muva.chat muva.chat;`

**Impacto:** Sin estos cambios, Nginx no aceptará requests para dominio muva.chat. Los requests serán rechazados con error 502/503.

---

## NOTAS TÉCNICAS

### Comentarios vs Código Funcional
De las 200+ referencias encontradas:
- **Código funcional:** 10 líneas (5%)
- **UI display text:** 7 líneas (3.5%)
- **Scripts/deployment:** 15+ líneas (7.5%)
- **Documentación/comentarios:** 170+ líneas (85%)

### Estrategia de Migración
La mayoría de referencias son en documentación y comentarios, lo cual confirma que:
1. **FASE 1** solo requiere 2 archivos críticos (tenant-utils.ts + nginx-subdomain.conf)
2. **FASE 2** requiere 5 archivos UI (cambios cosméticos, no bloquean funcionalidad)
3. **FASE 3** requiere actualizar scripts de deployment/diagnóstico
4. **FASE 4** puede hacerse con search-replace global en docs/ (post-migración completa)

---

## SIGUIENTE PASO

**Proceder con FASE 1:** Dual-Domain Support

**Archivos a modificar:**
1. ✅ `next.config.ts` - Agregar `|muva\\.chat` al regex (líneas 58, 69)
2. ✅ `src/lib/tenant-utils.ts` - Agregar lógica `.muva.chat` (después línea 51)
3. ✅ `docs/deployment/nginx-subdomain.conf` - Agregar server_name muva.chat (líneas 9, 73)
4. ✅ Crear test script para validar dual-domain functionality

**Validación:** Testing debe confirmar que AMBOS dominios funcionan en paralelo sin afectar tráfico actual de muva.chat

---

**Generated:** 2025-10-10
**Next:** FASE 1 Implementation (Dual-Domain Support)
