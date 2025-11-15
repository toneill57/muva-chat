# Guest Chat ID Mapping - Plan de Implementación

**Proyecto:** Multi-Tenant Resilient Reset/Resync System
**Fecha Inicio:** Octubre 23, 2025
**Estado:** 📋 Planificación Completa

---

## 🎯 OVERVIEW

### Objetivo Principal

Implementar sistema resiliente que permite **borrar y reconstruir completamente** todas las accommodation units de un tenant sin romper relaciones ni funcionalidad.

### ¿Por qué?

- **Incidente Oct 23, 2025**: Recrear units rompió embeddings de manuales (265 chunks huérfanos)
- **UUIDs volátiles**: Cada vez que se borran/recrean units, nuevos UUIDs rompen foreign keys
- **Testing & Development**: Necesitamos resetear tenants de prueba frecuentemente
- **Onboarding nuevos tenants**: Proceso debe ser repetible y confiable

### Alcance

- ✅ Foreign keys con CASCADE automático
- ✅ Stable identifiers (`motopress_unit_id`) para reconocimiento
- ✅ Script manuales multi-tenant (no hardcoded a "simmerdown")
- ✅ Proceso documentado paso a paso
- ✅ Health checks y validación
- ✅ Smart remapping evita re-processing innecesario
- ❌ NO automatizar setup de Airbnb feeds (requiere input usuario)

---

## 📊 ESTADO ACTUAL

### Sistema Existente

- ✅ Dual-table architecture (hotels vs public)
  - `hotels.accommodation_units`: Datos operacionales (hotel UUIDs)
  - `accommodation_units_public`: Embeddings/AI (public UUIDs)
- ✅ Embeddings automáticos de características → chat público
- ✅ Manual frontmatter con `tenant_id` correcto
- ✅ RPC functions usan tenant_id para isolation

### Limitaciones Actuales

- ❌ **FK constraints NO ACTION**: Borrar unit deja chunks huérfanos
- ❌ **Script manuales hardcoded**: `_assets/simmerdown/` → otros tenants NO funcionan
- ❌ **Dos ubicaciones de manuales**: Confusión y duplicación potencial
  - `_assets/simmerdown/accommodations-manual/`
  - `_assets/muva/listings/accommodations/simmerdown/accommodations-manual/`
- ❌ **Stable identifiers no usados**: Existen pero scripts buscan por nombre (frágil)

**Problema crítico detectado:**
```javascript
// Línea 179 de process-accommodation-manuals.js
const manualFiles = await glob('_assets/simmerdown/accommodations-manual/**/*-manual.md')
// ❌ Hardcoded a "simmerdown"
```

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Workflow completo de reset (Ejemplo: Tenant Simmerdown):**

```bash
# 1. Borrar TODO
DELETE FROM hotels.accommodation_units WHERE tenant_id = '<uuid>';
# → CASCADE automático borra: manuals, chunks, ics_feeds, calendar_events

# 2. Resync units
npm run sync:motopress -- --tenant simmerdown
# → Auto-embediza características ✅

# 3. Reconfig ICS feeds (manual en UI)
# → Usuario agrega URLs

# 4. Procesar manuales
npm run process:manuals -- --tenant=simmerdown
npm run migrate:manual-to-chunks

# 5. Validar
npm run validate:tenant-health -- --tenant simmerdown
# → Guest chat funciona 100%
```

### Características Clave

- **Multi-tenant first**: Funciona para CUALQUIER tenant, no solo simmerdown
- **Resiliente**: Stable identifiers reconocen units después de recrear
- **Automático donde posible**: CASCADE, stable ID mapping, health checks
- **Manual donde necesario**: ICS feeds requieren input usuario
- **Validado**: Health checks en cada paso crítico

---

## 📱 TECHNICAL STACK

### Database
- PostgreSQL CASCADE foreign keys
- Enhanced RPC functions (v2 con stable ID priority)
- Matryoshka embeddings (1024, 1536, 3072 dims)

### Backend
- TypeScript scripts multi-tenant
- Smart remapping logic
- Health check utilities

### Infrastructure
- Git workflow: `dev` → `GuestChatDev` → test → merge
- Documentation-first approach

---

## 🔧 DESARROLLO - FASES

### FASE 0.1: Commit All Recent Changes (30min)

**Objetivo:** Commit trabajo de investigación Airbnb + embeddings antes de nueva branch

**Entregables:**
- Commit con 50+ archivos (docs + API routes + components + scripts + migrations)
- Build exitoso (`npm run build`)
- Push a `dev` en GitHub

**Archivos a crear/modificar:**
- Git commit message descriptivo

**Testing:**
- `npm run build` → 0 TypeScript errors
- Commit visible en GitHub

---

### FASE 0.2: Create Development Branch (5min)

**Objetivo:** Branch aislada `GuestChatDev` para desarrollo

**Entregables:**
- Nueva branch en local y GitHub
- Branch activa para siguiente trabajo

**Archivos a crear/modificar:**
- Git branch `GuestChatDev`

**Testing:**
- `git branch --show-current` → `GuestChatDev`
- Branch visible en GitHub

---

### FASE 1: Database Schema - Cascading Foreign Keys (2h)

**Objetivo:** Auto-limpieza en cascada cuando se borran accommodation units

**Entregables:**
- Migration con CASCADE constraints
- ICS feeds y calendar events también en CASCADE
- Test exitoso en tenant de prueba

**Archivos a crear/modificar:**
- `supabase/migrations/20251024000000_add_cascading_foreign_keys.sql`

**Testing:**
- Crear unit test → agregar manual + chunks + feed
- Borrar unit
- Verificar CASCADE funcionó (0 rows huérfanas)

**Impacto:**
- ✅ Borrar unit AUTO-borra: manuals, chunks, ics_feeds, calendar_events
- ✅ No más datos huérfanos

---

### FASE 2: Stable Identifier Infrastructure (2.5h)

**Objetivo:** Sistema robusto de reconocimiento usando `motopress_unit_id`

**Entregables:**
- RPC function v2 (prioriza stable ID sobre nombre)
- Sync script asegura `motopress_unit_id` siempre poblado
- Tests verifican mapping funciona después de recrear units

**Archivos a crear/modificar:**
- `supabase/migrations/20251024010000_enhance_stable_id_mapping.sql`
- `scripts/sync-motopress-bookings.ts` (ensure metadata)

**Testing:**
- Sync desde MotoPress
- Verificar todos tienen `motopress_unit_id`
- Simular borrar + recrear
- Verify mapping reconoce por stable ID

**Impacto:**
- ✅ Units reconocidas por ID estable, no por nombre frágil
- ✅ Mapping funciona después de recrear

---

### FASE 3: Multi-Tenant Manual Processing (1.5h)

**Objetivo:** Script procesa manuales de CUALQUIER tenant (no hardcoded a simmerdown)

**Entregables:**
- Script con CLI flag `--tenant=<slug>`
- Consolidación de ubicación de manuales
- Smart remapping script para chunks huérfanos

**Archivos a crear/modificar:**
- `scripts/process-accommodation-manuals.js` (add CLI arg)
- `scripts/smart-remap-manual-ids.ts` (NEW)
- Mover manuales a ubicación única

**Testing:**
- `npm run process:manuals -- --tenant=simmerdown` → funciona
- Crear tenant prueba con manuales → funciona
- Smart remap después de recrear unit → chunks accesibles

**Impacto:**
- ✅ Multi-tenant ready (no más hardcoded)
- ✅ Smart remap evita re-processing innecesario

---

### FASE 4: Reset/Resync Documentation (1h)

**Objetivo:** Guía paso a paso para reset manual de tenant

**Entregables:**
- Documento con workflow completo
- Pre-requisitos
- Troubleshooting

**Archivos a crear/modificar:**
- `docs/workflows/TENANT_RESET_RESYNC_PROCESS.md`

**Testing:**
- Leer documento y verificar claridad
- Seguir proceso con tenant prueba

**Impacto:**
- ✅ Cualquier desarrollador puede resetear tenant
- ✅ Proceso repetible y documentado

---

### FASE 5: Health Check & Validation (1.5h)

**Objetivo:** Scripts de validación automática

**Entregables:**
- Health check completo
- Pre-flight validation antes de reset
- Reports claros

**Archivos a crear/modificar:**
- `scripts/validate-tenant-health.ts`
- `scripts/validate-before-tenant-reset.ts`

**Testing:**
- Run en Simmerdown → 0 warnings
- Simular problema → detecta correctamente

**Impacto:**
- ✅ Detección automática de problemas
- ✅ Prevención de errores

---

### FASE 6: End-to-End Testing (2h)

**Objetivo:** Validar workflow completo funciona

**Entregables:**
- Test 1: Reset completo tenant prueba
- Test 2: Simmerdown validation (sin borrar)
- Test 3: Guest chat end-to-end

**Archivos a crear/modificar:**
- `docs/guest-chat-id-mapping/fase-6/TESTS.md`

**Testing:**
- Crear tenant prueba → reset → rebuild → validate
- Guest chat responde WiFi questions
- Airbnb reservations funcionan

**Impacto:**
- ✅ Confianza en sistema completo
- ✅ Success criteria validated

---

### FASE 7: Deploy & Final Documentation (1h)

**Objetivo:** Deploy a producción y documentación final

**Entregables:**
- Merge a `dev`
- Deploy VPS
- Update `CLAUDE.md`
- `FINAL_IMPLEMENTATION.md`

**Archivos a crear/modificar:**
- Git merge
- `CLAUDE.md`
- `docs/guest-chat-id-mapping/FINAL_IMPLEMENTATION.md`

**Testing:**
- Production guest chat funciona
- Production Airbnb sync funciona
- 0 errors en logs

**Impacto:**
- ✅ Sistema en producción
- ✅ Documentación actualizada

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad

- [ ] Reset completo funciona (borrar → resync → validate)
- [ ] Guest chat ve manuales después de reset
- [ ] Multi-tenant (funciona para simmerdown Y otros tenants)
- [ ] Reservas Airbnb + MotoPress sincronizadas
- [ ] ICS feeds configurables en UI

### Performance

- [ ] Embeddings generados <5min por tenant
- [ ] Health check <10 segundos
- [ ] Guest chat responde <2 segundos

### Resilience

- [ ] CASCADE FKs auto-limpian
- [ ] Stable IDs reconocen units post-recreación
- [ ] Smart remap evita re-processing
- [ ] 0 manual chunks huérfanos

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (Principal - FASE 1, 2)

**Responsabilidad:** Migrations, RPC functions, SQL

**Tareas:**
- FASE 1: Create CASCADE FK migration
- FASE 2: Enhanced RPC v2 con stable ID priority

**Archivos:**
- `supabase/migrations/20251024000000_add_cascading_foreign_keys.sql`
- `supabase/migrations/20251024010000_enhance_stable_id_mapping.sql`

---

### 2. **@agent-backend-developer** (Principal - FASE 2, 3, 5)

**Responsabilidad:** Scripts, TypeScript, business logic

**Tareas:**
- FASE 2: Ensure sync populates stable IDs
- FASE 3: Multi-tenant manual processing
- FASE 5: Health check scripts

**Archivos:**
- `scripts/sync-motopress-bookings.ts`
- `scripts/process-accommodation-manuals.js`
- `scripts/smart-remap-manual-ids.ts`
- `scripts/validate-tenant-health.ts`

---

### 3. **@agent-deploy-agent** (FASE 0, 7)

**Responsabilidad:** Git, deployment, VPS

**Tareas:**
- FASE 0.1: Commit all changes
- FASE 0.2: Create branch
- FASE 7: Merge + deploy

**Archivos:**
- Git commits
- VPS deployment

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── supabase/migrations/
│   ├── 20251024000000_add_cascading_foreign_keys.sql      # NEW - FASE 1
│   └── 20251024010000_enhance_stable_id_mapping.sql       # NEW - FASE 2
├── scripts/
│   ├── process-accommodation-manuals.js                   # MODIFY - FASE 3
│   ├── sync-motopress-bookings.ts                         # MODIFY - FASE 2
│   ├── smart-remap-manual-ids.ts                          # NEW - FASE 3
│   ├── validate-tenant-health.ts                          # NEW - FASE 5
│   └── validate-before-tenant-reset.ts                    # NEW - FASE 5
├── docs/
│   ├── workflows/
│   │   └── TENANT_RESET_RESYNC_PROCESS.md                 # NEW - FASE 4
│   └── guest-chat-id-mapping/
│       ├── plan.md                                        # THIS FILE
│       ├── TODO.md                                        # NEXT
│       ├── guest-chat-id-mapping-prompt-workflow.md       # NEXT
│       ├── fase-0/ (FASE 0 documentation)
│       ├── fase-1/ (FASE 1 documentation)
│       ├── fase-2/ (FASE 2 documentation)
│       ├── fase-3/ (FASE 3 documentation)
│       ├── fase-4/ (FASE 4 documentation)
│       ├── fase-5/ (FASE 5 documentation)
│       ├── fase-6/ (FASE 6 documentation)
│       ├── fase-7/ (FASE 7 documentation)
│       └── FINAL_IMPLEMENTATION.md                        # FASE 7
└── CLAUDE.md                                              # UPDATE - FASE 7
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Embeddings de Características (Chat Público)**
- ✅ YA funciona automáticamente con sync de MotoPress
- ❌ NO tocar este flujo
- Solo verificar metadata correcto

**2. Embeddings de Manuales (Chat Huéspedes)**
- ✅ Preservar cuando posible (smart remap)
- ⚠️ Re-embedizar SOLO si conflict de IDs
- Último recurso: Re-process desde markdown

**3. ICS Feed Configurations**
- ✅ CASCADE borra con units
- ⚠️ Usuario DEBE reconfigurar en UI
- NO incluir en automatización (requiere URLs manuales)

**4. Multi-Tenant Isolation**
- CRÍTICO: Todo debe funcionar por tenant_id
- Scripts deben aceptar `--tenant=<slug>`
- RPC functions validan tenant_id

**5. Stable Identifiers**
- `motopress_unit_id`: ID numérico de MotoPress (e.g., "317")
- `original_accommodation`: Nombre del alojamiento (e.g., "Dreamland")
- Priorizar `motopress_unit_id` sobre nombre

### Referencias Críticas

- **Architecture**: `docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md` (450+ líneas)
- **Safe Process**: `docs/troubleshooting/ACCOMMODATION_RECREATION_SAFE_PROCESS.md` (350+ líneas)
- **Incident Report**: `docs/troubleshooting/INCIDENT_20251023_MANUAL_EMBEDDINGS_LOST.md` (700+ líneas)

---

**Última actualización:** Octubre 23, 2025
**Próximo paso:** Crear TODO.md con tareas específicas + workflow prompts
**Estimación total:** ~12 horas desarrollo + testing
