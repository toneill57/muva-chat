# MUVA Chat → MUVA Chat - Plan de Implementación

**Proyecto:** MUVA Chat to MUVA Chat Rebrand
**Fecha Inicio:** 2025-10-11
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal
Rebrandear completamente MUVA Chat → MUVA Chat, reflejando la evolución del proyecto hacia una plataforma multi-tenant de turismo con chat como experiencia principal y SIRE como feature premium (gancho comercial para alojamientos).

### ¿Por qué?
- **Evolución del concepto:** MUVA Chat (enfoque SIRE) → MUVA Chat (multi-tenant + turismo)
- **SIRE como gancho comercial:** Feature premium esencial para atraer hoteles y Airbnbs
- **Claridad de brand:** Posicionar MUVA Chat como plataforma de turismo inteligente
- **Organización escalable:** Docs estructuradas por features para crecimiento

### Alcance
- **Branding:** ~1,777 referencias "MUVA Chat"/"innpilot" en código + documentación
- **Reorganización:** Reestructurar `/docs` con enfoque en features (chat, SIRE, admin)
- **Infrastructure:** Actualizar VPS (PM2 process, Nginx configs)
- **Technical:** package.json, metadata, UI strings, comentarios

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ Proyecto "MUVA Chat" funcionando en producción (muva.chat)
- ✅ Multi-tenant subdomain chat system completo
- ✅ SIRE compliance module implementado y funcional
- ✅ 4 tenants activos (simmerdown, xyz, free-hotel-test, hotel-boutique)
- ✅ Dual-domain support (muva.chat + muva.chat)
- ✅ Matryoshka embeddings optimizados (10x performance boost)

### Limitaciones Actuales
- ❌ **Branding confuso:** Referencias mixtas MUVA Chat vs MUVA
- ❌ **Docs desorganizadas:** Enfoque legacy en SIRE, no refleja multi-tenant
- ❌ **Naming inconsistente:** package.json "innpilot", PM2 "innpilot", pero domain "muva.chat"
- ❌ **Posicionamiento poco claro:** SIRE como proyecto principal en vez de feature

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**MUVA Chat = Plataforma Multi-Tenant de Turismo**
- 🏨 **Chat principal:** Subdomain routing con branding personalizado por tenant
- 🌴 **Contenido turístico:** San Andrés tourism content (MUVA)
- ⭐ **SIRE Compliance:** Feature premium para alojamientos (gancho comercial)

### Características Clave Post-Rebrand

1. **Brand Consistency**
   - Nombre: "MUVA Chat" everywhere
   - package.json: `"muva-chat"`
   - PM2 process: `"muva-chat"`
   - Browser titles: "MUVA Chat"

2. **SIRE Posicionado Correctamente**
   - No deprecar (es esencial para el negocio)
   - Destacar como premium feature
   - Gancho comercial clave para hoteles/Airbnbs
   - Docs en `features/sire-compliance/`

3. **Documentación Clara**
   - Organizada por features (multi-tenant-chat, sire-compliance, admin-dashboard)
   - README.md enfocado en MUVA Chat
   - SIRE como sección feature, no proyecto principal
   - Links internos funcionando

4. **VPS Actualizado**
   - PM2: "muva-chat" process
   - Nginx: Configs actualizadas (optionally rename file)
   - Logs claros con nuevo naming

---

## 📱 TECHNICAL STACK

### Frontend/Backend
- **Next.js:** 15.5.3 (sin cambios en versión)
- **Database:** Supabase PostgreSQL + pgvector + Matryoshka embeddings
- **AI:** OpenAI (embeddings) + Anthropic Claude (chat)
- **Styling:** Tailwind CSS

### Infrastructure Changes
- **PM2 Process:** "innpilot" → "muva-chat"
- **Nginx Config:** innpilot.conf → muva.conf (optional rename, keep compatibility)
- **package.json:** "innpilot" → "muva-chat"
- **Domain:** muva.chat (ya en producción, no cambiar)

### No Changes Required
- Next.js version (15.5.3)
- Supabase setup
- API endpoints structure
- Multi-tenant routing logic

---

## 🔧 DESARROLLO - FASES

### FASE 1: Core Branding (2h)

**Objetivo:** Actualizar archivos principales de branding y naming

**Entregables:**
- README.md rebrandeado como "MUVA Chat - Multi-Tenant Tourism Platform"
- package.json con name "muva-chat"
- CLAUDE.md con contexto actualizado
- Metadata en layout.tsx (browser title, description)

**Archivos a modificar:**
- `/Users/oneill/Sites/apps/MUVA Chat/README.md`
- `/Users/oneill/Sites/apps/MUVA Chat/package.json`
- `/Users/oneill/Sites/apps/MUVA Chat/CLAUDE.md`
- `/Users/oneill/Sites/apps/MUVA Chat/src/app/layout.tsx`

**Testing:**
- ✅ `npm run build` pasa sin errores
- ✅ Browser title muestra "MUVA Chat"
- ✅ package.json "name" es "muva-chat"
- ✅ No broken imports

---

### FASE 2: Documentation Restructure (3h)

**Objetivo:** Reorganizar `/docs` con nueva estructura feature-based

**Nueva Estructura:**
```
docs/
├── README.md                          # MUVA Chat platform overview
├── GETTING_STARTED.md                 # Quick start guide
├── ARCHITECTURE.md                    # Multi-tenant architecture
│
├── features/                          # Features principales
│   ├── multi-tenant-chat/
│   │   ├── README.md
│   │   ├── SUBDOMAIN_ROUTING.md
│   │   ├── TENANT_ISOLATION.md
│   │   └── ADMIN_DASHBOARD.md
│   │
│   ├── sire-compliance/               # ⭐ FEATURE PREMIUM (no deprecar)
│   │   ├── README.md                  # Overview + value proposition
│   │   ├── CODIGOS_OFICIALES.md
│   │   ├── VALIDATION_SYSTEM.md
│   │   ├── MONTHLY_EXPORT.md
│   │   └── QUICK_REFERENCE.md
│   │
│   └── tourism-content/
│       └── MUVA_ACCESS_SYSTEM.md
│
├── development/                       # Para developers
│   ├── API_REFERENCE.md
│   ├── DEVELOPMENT.md
│   ├── TESTING.md
│   └── DATABASE_SCHEMA.md
│
├── deployment/                        # VPS deployment
│   ├── VPS_SETUP.md
│   ├── NGINX_CONFIG.md
│   ├── PM2_MANAGEMENT.md
│   └── TROUBLESHOOTING.md
│
├── projects/                          # Project-specific
│   ├── innpilot-to-muva-rebrand/      # Este proyecto
│   └── muva-migration/                # Historial domain migration
│
└── archive/                           # Solo docs obsoletos
    └── innpilot-legacy/               # Legacy docs si existen
```

**Entregables:**
- Nueva estructura de carpetas creada
- SIRE docs migrados a `features/sire-compliance/`
- Batch replacement "MUVA Chat" → "MUVA" en ~200 archivos .md
- Nuevo `docs/README.md` con overview de MUVA Chat
- Links internos actualizados

**Archivos a crear:**
- `docs/README.md` (nuevo)
- `docs/GETTING_STARTED.md` (nuevo)
- `docs/features/sire-compliance/README.md` (destacar como premium)
- `docs/features/multi-tenant-chat/README.md` (nuevo)

**Archivos a mover:**
- `docs/features/sire-compliance/*` → `docs/features/sire-compliance/`

**Archivos a modificar:**
- ~200 archivos .md con batch replacement

**Testing:**
- ✅ Links internos funcionan
- ✅ `grep -r "MUVA Chat" docs/` → Solo en `archive/` y `muva-migration/`
- ✅ Estructura navegable
- ✅ SIRE docs accesibles en nueva ubicación

---

### FASE 3: VPS Infrastructure (2h)

**Objetivo:** Actualizar naming en VPS (PM2, Nginx)

**Entregables:**
- PM2 process renombrado a "muva-chat"
- Nginx config actualizado (comentarios + opcional rename file)
- Deployment scripts actualizados
- Logs con nuevo naming

**Cambios en VPS:**

**PM2 Process Rename:**
```bash
# SSH to VPS
ssh oneill@muva.chat

# Stop current process
pm2 stop muva-chat

# Delete old process
pm2 delete muva-chat

# Start with new name
pm2 start npm --name "muva-chat" -- start

# Save config
pm2 save

# Verify
pm2 status  # Should show "muva-chat"
```

**Nginx Config (Option A - Rename):**
```bash
# Rename config file
sudo mv /etc/nginx/sites-available/innpilot.conf \
        /etc/nginx/sites-available/muva.conf

# Update symlink
sudo ln -sf /etc/nginx/sites-available/muva.conf \
            /etc/nginx/sites-enabled/muva.conf

# Remove old symlink
sudo rm /etc/nginx/sites-enabled/innpilot.conf

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

**Nginx Config (Option B - Keep filename, update comments):**
```bash
# Just update internal comments in innpilot.conf
# "MUVA Chat subdomain routing" → "MUVA Chat subdomain routing"
# Keep filename for compatibility
```

**Testing:**
- ✅ `pm2 status` → "muva-chat" online
- ✅ `https://muva.chat` carga correctamente
- ✅ `sudo nginx -t` pasa
- ✅ Chat functionality works
- ✅ Subdomain routing works

---

### FASE 4: Source Code (1h)

**Objetivo:** Actualizar strings visibles al usuario + comentarios en código

**Entregables:**
- UI strings actualizados (si hay "MUVA Chat" visible)
- Comentarios en código actualizados
- Metadata de páginas actualizada

**Archivos a modificar:**
- `src/app/layout.tsx` (metadata)
- `src/components/**/*.tsx` (UI strings si existen)
- Comentarios en código (opcional, low priority)

**Scope:**
- Solo ~23 archivos .ts/.tsx tienen referencias a "MUVA Chat"
- Mayoría son comentarios técnicos (actualizar si tiene sentido)
- NO cambiar nombres técnicos (como nombres de tablas DB)

**Testing:**
- ✅ `npm run lint` pasa
- ✅ `npm run build` pasa
- ✅ Visual check en browser (https://muva.chat)
- ✅ No broken functionality

---

### FASE 5: Final Verification (1h)

**Objetivo:** Testing completo + git commit/tag

**Entregables:**
- Tests de regresión completos
- Búsqueda final de referencias
- Git commit con mensaje descriptivo
- Git tag v2.0-muva-rebrand

**Verification Checklist:**
```markdown
## Functionality
- [ ] npm run build (passes without errors)
- [ ] npm run lint (passes)
- [ ] https://muva.chat loads correctly
- [ ] Multi-tenant chat works (test 2 tenants)
- [ ] SIRE module functional
- [ ] Admin dashboard accessible

## Branding
- [ ] package.json name: "muva-chat"
- [ ] PM2 process: "muva-chat"
- [ ] Browser title: "MUVA Chat"
- [ ] grep -r "MUVA Chat" docs/ → Only in archive/ and muva-migration/
- [ ] grep -r "innpilot" src/ → Only technical (lowercase ok)

## Documentation
- [ ] docs/README.md reflects MUVA Chat
- [ ] SIRE docs in features/sire-compliance/
- [ ] Internal links working
- [ ] Clear feature-based organization

## Infrastructure
- [ ] PM2 status shows "muva-chat"
- [ ] Nginx running without errors
- [ ] HTTPS certificate valid
- [ ] No 404s or 500s in production
```

**Git Workflow:**
```bash
# Review changes
git status
git diff

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat(rebrand): Complete MUVA Chat → MUVA Chat rebranding

- Update package.json name to 'muva-chat'
- Rebrand README.md and CLAUDE.md
- Restructure /docs with feature-based organization
- Move SIRE docs to features/sire-compliance/
- Update VPS infrastructure (PM2, Nginx)
- Update source code strings and metadata
- Batch replace ~1,777 references MUVA Chat → MUVA

BREAKING CHANGE: PM2 process renamed from 'innpilot' to 'muva-chat'

Refs: #muva-rebrand"

# Create tag
git tag -a v2.0-muva-rebrand -m "Complete rebranding to MUVA Chat"

# Push to remote
git push origin dev
git push origin --tags
```

**Testing:**
- ✅ All checklist items pass
- ✅ Git commit created successfully
- ✅ Tag created: v2.0-muva-rebrand
- ✅ Production deployment successful

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] `npm run build` pasa sin errores ni warnings
- [ ] `https://muva.chat` carga correctamente
- [ ] Todos los tenant chats funcionan (simmerdown, xyz, etc.)
- [ ] SIRE module functional
- [ ] Admin dashboards accesibles
- [ ] No broken links en docs

### Performance
- [ ] Response time < 2s (sin degradación)
- [ ] Build time similar o mejor
- [ ] No memory leaks en PM2

### Branding
- [ ] package.json: `"name": "muva-chat"` ✅
- [ ] PM2 process: `"muva-chat"` ✅
- [ ] Browser title: "MUVA Chat" ✅
- [ ] `grep -r "MUVA Chat" docs/` → 0 results (excepto archive/ y muva-migration/)
- [ ] README.md title: "MUVA Chat - Multi-Tenant Tourism Platform"

### Documentación
- [ ] `/docs/README.md` → MUVA Chat overview claro
- [ ] SIRE docs en `features/sire-compliance/` con README destacando value proposition
- [ ] Estructura feature-based clara y navegable
- [ ] Todos los links internos funcionando
- [ ] Cross-references actualizadas

### Infrastructure
- [ ] VPS PM2 process "muva-chat" online
- [ ] Nginx config actualizado y funcionando
- [ ] HTTPS certificates válidos
- [ ] Logs con naming actualizado

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal)

**Responsabilidad:** Código, configs técnicos, package.json, batch docs replacement

**Tareas:**
- **FASE 1:** README.md, package.json, CLAUDE.md
- **FASE 2:** Batch replacement en ~200 archivos .md, crear nueva estructura docs
- **FASE 4:** Source code strings y comentarios
- **FASE 5:** Git commit + tag

**Archivos:**
- `README.md`
- `package.json`
- `CLAUDE.md`
- `docs/**/*.md` (~200 archivos)
- `src/**/*.ts` (~23 archivos)

**Testing:**
- npm run build
- npm run lint
- grep verification

---

### 2. **@agent-ux-interface**

**Responsabilidad:** UI strings visibles, metadata visual, branding user-facing

**Tareas:**
- **FASE 1:** Metadata en layout.tsx (title, description)
- **FASE 4:** UI strings en components (si hay "MUVA Chat" visible al usuario)

**Archivos:**
- `src/app/layout.tsx`
- `src/components/**/*.tsx` (solo strings visibles)

**Testing:**
- Visual check en browser
- Responsive test
- Title/metadata check

---

### 3. **@agent-deploy-agent**

**Responsabilidad:** VPS deployment, PM2, Nginx, Git workflow

**Tareas:**
- **FASE 3:** VPS deployment (SSH, PM2 rename, Nginx update)
- **FASE 5:** Git commit strategy, tag creation, push to remote

**Archivos:**
- VPS: PM2 ecosystem config
- VPS: Nginx config files
- Git: Commit + tag

**Testing:**
- PM2 status verification
- Nginx test + reload
- Production deployment test
- Git history verification

---

## 📂 ESTRUCTURA DE ARCHIVOS

### Project Documentation
```
/Users/oneill/Sites/apps/MUVA Chat/
├── docs/
│   ├── projects/
│   │   └── innpilot-to-muva-rebrand/
│   │       ├── plan.md                                    # Este archivo
│   │       ├── TODO.md                                    # Tareas por fase
│   │       ├── innpilot-to-muva-rebrand-prompt-workflow.md # Prompts
│   │       ├── fase-1/                                    # Docs FASE 1
│   │       │   ├── IMPLEMENTATION.md
│   │       │   ├── CHANGES.md
│   │       │   ├── TESTS.md
│   │       │   └── ISSUES.md (si hay)
│   │       ├── fase-2/                                    # Docs FASE 2
│   │       ├── fase-3/                                    # Docs FASE 3
│   │       ├── fase-4/                                    # Docs FASE 4
│   │       └── fase-5/                                    # Docs FASE 5
```

### New Docs Structure
```
docs/
├── README.md                          # MUVA Chat overview
├── GETTING_STARTED.md                 # Quick start
├── ARCHITECTURE.md                    # Multi-tenant architecture
├── features/
│   ├── sire-compliance/               # SIRE feature (no deprecar)
│   │   ├── README.md
│   │   └── [existing SIRE docs]
│   └── multi-tenant-chat/             # Multi-tenant feature
└── archive/
    └── innpilot-legacy/               # Legacy docs
```

### Core Files to Update
```
/Users/oneill/Sites/apps/MUVA Chat/
├── package.json                       # name: "muva-chat"
├── README.md                          # Rebrandeado
├── CLAUDE.md                          # Context actualizado
└── src/
    └── app/
        └── layout.tsx                 # Metadata actualizado
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

1. **SIRE NO se depreca**
   - Es feature premium esencial para el negocio
   - Gancho comercial clave para atraer hoteles/Airbnbs
   - Solo cambia su posicionamiento: de proyecto principal → premium feature
   - Docs migran a `features/sire-compliance/` pero permanecen activas

2. **Mantener Compatibilidad**
   - Dual-domain support sigue funcionando (muva.chat + muva.chat)
   - Tenants existentes no se afectan
   - API endpoints no cambian
   - Database schema no se modifica

3. **VPS Deployment**
   - Requiere SSH access a VPS
   - PM2 restart puede causar ~1-2 segundos de downtime
   - Nginx reload es graceful (sin downtime)
   - Backups automáticos en git

4. **Git History**
   - Se preserva completamente
   - Commit descriptivo con BREAKING CHANGE note
   - Tag v2.0-muva-rebrand para milestone
   - Rollback posible vía git revert

### Decisiones de Naming (Confirmadas)

- **package.json:** `"name": "muva-chat"`
- **Description:** `"Multi-tenant chat platform with SIRE compliance"`
- **PM2 process:** `"muva-chat"`
- **Nginx config:** `muva.conf` (or keep `innpilot.conf` for compatibility)
- **Browser title:** `"MUVA Chat"`
- **Brand name:** `MUVA Chat` (not MUVA Platform, not MUVA.chat)

### Scope Exclusions

**NO cambiar:**
- Next.js version
- Supabase config
- API endpoint paths
- Database table names
- Tenant IDs
- Environment variables names (.env.local)
- Domain DNS (muva.chat ya configurado)

**SÍ cambiar:**
- Branding visible al usuario
- Documentation structure
- package.json metadata
- PM2 process name
- Comments y strings descriptivos

---

## 🎯 MÉTRICAS DE ÉXITO

### Cuantitativas
- ✅ 0 referencias "MUVA Chat" en docs (excepto archive/)
- ✅ ~200 archivos .md actualizados
- ✅ ~23 archivos .ts/.tsx revisados
- ✅ 100% tests pasando (npm test)
- ✅ 0 broken links en docs
- ✅ Build time < 60 segundos
- ✅ PM2 uptime 100%

### Cualitativas
- ✅ Brand identity clara: MUVA Chat
- ✅ SIRE posicionado como premium feature
- ✅ Docs organizadas y navegables
- ✅ Experiencia developer mejorada
- ✅ Onboarding más claro para nuevos devs

---

**Última actualización:** 2025-10-11
**Próximo paso:** Actualizar TODO.md con tareas específicas por fase
**Tiempo estimado total:** 9-10 horas
**Risk level:** LOW (mayoría docs, código mínimo)
