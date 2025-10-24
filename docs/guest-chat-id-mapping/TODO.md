# TODO - Guest Chat ID Mapping

**Proyecto:** Multi-Tenant Resilient Reset/Resync System
**Fecha:** Octubre 23, 2025
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0.1: Commit All Recent Changes 🎯 ✅

### 0.1.1 Review & Stage Changes
- [x] Ejecutar `git status --short` y revisar archivos (30min) ✅
  - Verificar 50+ archivos modificados
  - Documentation (3 incident + 6 architecture + manual updates)
  - API routes (Airbnb + comparison + calendar)
  - Components (reservations + sync cards)
  - Scripts (testing + sync + fixes)
  - Migrations (12 SQL files)
  - Types + integrations
  - Files: All modified/untracked files in repo
  - Agent: **@agent-deploy-agent**
  - Test: `git status` shows expected files
  - **Completado:** Commit 035b89b - 84 archivos

### 0.1.2 Create Commit & Verify Build
- [x] Crear commit descriptivo y verificar TypeScript (15min) ✅
  - Commit message covering all changes:
    ```
    feat: Airbnb reservations + embeddings investigation + architecture docs

    - Fix Airbnb reservation names display
    - Add RPC get_accommodation_units_by_ids
    - Document dual-table ID mapping architecture
    - Add incident report manual embeddings
    - Create safe recreation process guide
    - Add test scripts for embeddings validation

    🤖 Generated with Claude Code
    Co-Authored-By: Claude <noreply@anthropic.com>
    ```
  - Execute: `npm run build`
  - Files: Git commit
  - Agent: **@agent-deploy-agent**
  - Test: Build exits with 0 errors
  - **Completado:** Build successful, 0 TypeScript errors

### 0.1.3 Push to GitHub
- [x] Push cambios a rama dev (5min) ✅
  - Execute: `git push origin dev`
  - Verify commit visible on GitHub
  - Files: Remote GitHub repo
  - Agent: **@agent-deploy-agent**
  - Test: Commit appears on GitHub dev branch
  - **Completado:** Commit 035b89b visible en origin/dev

---

## FASE 0.2: Create Development Branch ⚙️ ✅

### 0.2.1 Create & Push Branch
- [x] Crear rama GuestChatDev (5min) ✅
  - Execute: `git checkout -b GuestChatDev`
  - Execute: `git branch --show-current` (verify)
  - Execute: `git push -u origin GuestChatDev`
  - Files: New git branch
  - Agent: **@agent-deploy-agent**
  - Test: Branch visible on GitHub
  - **Completado:** Branch GuestChatDev creada y pusheada a origin

---

## FASE 1: Database Schema - Cascading FKs 🎯 ✅

### 1.1 Create CASCADE Migration
- [x] Crear migration con CASCADE constraints (1h) ✅
  - Drop existing NO ACTION constraints
  - Add CASCADE constraints for:
    - `accommodation_units_manual` → `accommodation_units_public`
    - `accommodation_units_manual_chunks` → `accommodation_units_public`
    - `ics_feed_configurations` → `hotels.accommodation_units`
    - `calendar_events` → `hotels.accommodation_units`
  - Files: `supabase/migrations/20251024032117_add_cascading_foreign_keys.sql`
  - Agent: **@agent-database-agent**
  - Test: Migration applies without errors
  - **Completado:** Migration aplicada exitosamente, 5 CASCADE FKs implementados

### 1.2 Test CASCADE Functionality
- [x] Test CASCADE en tenant de prueba (1h) ✅
  - Create test tenant + unit
  - Add manual + chunks + ics_feed
  - DELETE unit
  - Verify CASCADE deleted all related data
  - SQL queries to verify 0 orphaned rows
  - Files: `docs/guest-chat-id-mapping/fase-1/TESTS.md`
  - Agent: **@agent-database-agent**
  - Test: 0 orphaned rows after DELETE
  - **Completado:** ALL TESTS PASSED - 0 orphaned rows, CASCADE funciona perfectamente

---

## FASE 2: Stable Identifier Infrastructure ⚙️

### 2.1 Enhanced RPC Function
- [ ] Create RPC v2 con stable ID priority (1h)
  - Function `map_hotel_to_public_accommodation_id_v2`
  - Priority 1: Search by `motopress_unit_id`
  - Priority 2: Search by name (fallback)
  - Update `match_unit_manual_chunks` to use v2
  - Files: `supabase/migrations/20251024010000_enhance_stable_id_mapping.sql`
  - Agent: **@agent-database-agent**
  - Test: RPC function executes successfully

### 2.2 Ensure Sync Populates Stable ID
- [ ] Modify sync script para garantizar motopress_unit_id (45min)
  - Add validation that `motopress_unit_id` is always set
  - Ensure metadata includes stable identifier
  - Files: `scripts/sync-motopress-bookings.ts`
  - Agent: **@agent-backend-developer**
  - Test: Sync creates units with `motopress_unit_id` in metadata

### 2.3 Test Stable ID Mapping
- [ ] Test mapping después de recrear units (45min)
  - Sync units from MotoPress
  - Verify all have `motopress_unit_id`
  - Delete 1 unit, re-sync
  - Verify mapping recognizes by stable ID
  - SQL: `SELECT COUNT(*) FROM accommodation_units_public WHERE metadata->>'motopress_unit_id' IS NULL`
  - Files: `docs/guest-chat-id-mapping/fase-2/TESTS.md`
  - Agent: **@agent-backend-developer**
  - Test: 0 rows without stable ID, mapping works post-recreation

---

## FASE 3: Multi-Tenant Manual Processing ✨

### 3.1 Add CLI Flag to Manual Script
- [ ] Modificar script para aceptar --tenant flag (45min)
  - Parse CLI arguments
  - Accept `--tenant=<slug>` parameter
  - Update glob pattern: `_assets/${tenantSlug}/accommodations-manual/**/*-manual.md`
  - Add both possible locations (flat + nested)
  - Error if no tenant provided
  - Files: `scripts/process-accommodation-manuals.js`
  - Agent: **@agent-backend-developer**
  - Test: `npm run process:manuals -- --tenant=simmerdown` works

### 3.2 Consolidate Manual Locations
- [ ] Decidir y consolidar ubicación de manuales (15min)
  - Choose: `_assets/{tenant}/accommodations-manual/` (flat)
  - Move duplicates if any
  - Update .gitignore if needed
  - Files: Manual markdown files, script updates
  - Agent: **@agent-backend-developer**
  - Test: All manuals in consistent location

### 3.3 Create Smart Remapping Script
- [ ] Script inteligente para remap manual IDs (45min)
  - Detect orphaned manuals/chunks
  - Extract unit name from frontmatter
  - Find current unit_id using stable ID or name
  - Update manual.unit_id + chunks.accommodation_unit_id
  - Flag for re-processing if no match
  - Files: `scripts/smart-remap-manual-ids.ts`
  - Agent: **@agent-backend-developer**
  - Test: Remap fixes orphaned chunks without re-embedding

### 3.4 Test Multi-Tenant Manual Processing
- [ ] Test con múltiples tenants (15min)
  - Test simmerdown
  - Create test tenant with 1 manual
  - Verify isolation
  - Files: `docs/guest-chat-id-mapping/fase-3/TESTS.md`
  - Agent: **@agent-backend-developer**
  - Test: Each tenant's manuals process independently

---

## FASE 4: Reset/Resync Documentation 🎨

### 4.1 Create Workflow Documentation
- [ ] Documentar proceso completo paso a paso (1h)
  - Pre-requisitos
  - Paso 1: Borrar TODO (CASCADE)
  - Paso 2: Sync units desde MotoPress
  - Paso 3: Verificar stable IDs
  - Paso 4: Reconfig ICS feeds (manual UI)
  - Paso 5: Sync reservations
  - Paso 6: Process manuals
  - Paso 7: Validate health
  - Troubleshooting section
  - Files: `docs/workflows/TENANT_RESET_RESYNC_PROCESS.md`
  - Agent: **@agent-backend-developer**
  - Test: Documentation is clear and complete

---

## FASE 5: Health Check & Validation ✨

### 5.1 Create Health Check Script
- [ ] Script de validación completa (1h)
  - Check: All units have motopress_unit_id
  - Check: All units have embeddings (public chat)
  - Check: All units with manuals have chunks
  - Check: No orphaned chunks
  - Check: Sample guest chat test passes
  - Pretty output with ✅/❌ indicators
  - Files: `scripts/validate-tenant-health.ts`
  - Agent: **@agent-backend-developer**
  - Test: `npm run validate:tenant-health -- --tenant simmerdown` shows 0 warnings

### 5.2 Create Pre-Flight Validator
- [ ] Script pre-reset validation (30min)
  - Show what will be deleted
  - Count active future reservations
  - Count manual chunks
  - Require explicit confirmation
  - Files: `scripts/validate-before-tenant-reset.ts`
  - Agent: **@agent-backend-developer**
  - Test: Script warns about active data correctly

---

## FASE 6: End-to-End Testing 🎯

### 6.1 Test Complete Reset (Tenant Prueba)
- [ ] Reset completo con tenant de prueba (1h)
  - Create test tenant with 2 units
  - Process manuals + create chunks
  - Create 2 reservations (MotoPress + Airbnb)
  - Configure 2 ICS feeds
  - **RESET**: Delete all units
  - **RESYNC**: Follow documented workflow
  - **VALIDATE**: Health check passes
  - Files: `docs/guest-chat-id-mapping/fase-6/TEST_COMPLETE_RESET.md`
  - Agent: **@agent-backend-developer**
  - Test: Full cycle works, guest chat functional

### 6.2 Test Simmerdown Validation
- [ ] Validar Simmerdown sin borrar (30min)
  - Run health check
  - Run smart remap if needed
  - Verify guest chat works
  - Files: `docs/guest-chat-id-mapping/fase-6/TEST_SIMMERDOWN.md`
  - Agent: **@agent-backend-developer**
  - Test: 0 warnings, guest chat responds

### 6.3 Test Guest Chat End-to-End
- [ ] Test completo de guest chat (30min)
  - Login as guest
  - Ask WiFi question → Expect manual response
  - Verify reservation data visible
  - Verify tourism info accessible
  - Files: `docs/guest-chat-id-mapping/fase-6/TEST_GUEST_CHAT.md`
  - Agent: **@agent-backend-developer**
  - Test: All guest chat features work

---

## FASE 7: Deploy & Final Documentation 🎨

### 7.1 Merge to Dev
- [ ] Merge GuestChatDev → dev (15min)
  - Final build verification
  - Merge branch
  - Push to GitHub
  - Files: Git merge
  - Agent: **@agent-deploy-agent**
  - Test: dev branch updated on GitHub

### 7.2 Deploy to VPS
- [ ] Deploy a producción (30min)
  - SSH to VPS
  - Git pull
  - PM2 restart
  - Verify production
  - Files: VPS deployment
  - Agent: **@agent-deploy-agent**
  - Test: Production guest chat works, 0 errors in logs

### 7.3 Update Documentation
- [ ] Actualizar CLAUDE.md y crear FINAL_IMPLEMENTATION (15min)
  - Add reference to stable ID usage
  - Add reference to multi-tenant manual processing
  - Create final implementation summary
  - Files: `CLAUDE.md`, `docs/guest-chat-id-mapping/FINAL_IMPLEMENTATION.md`
  - Agent: **@agent-backend-developer**
  - Test: Documentation updated and accurate

---

## 📊 PROGRESO

**Total Tasks:** 23
**Completed:** 6/23 (26%)

**Por Fase:**
- FASE 0.1: 3/3 tareas ✅ (Commit Recent Changes)
- FASE 0.2: 1/1 tareas ✅ (Create Branch)
- FASE 1: 2/2 tareas ✅ (Cascading FKs) - COMPLETE
- FASE 2: 0/3 tareas (Stable Identifiers)
- FASE 3: 0/4 tareas (Multi-Tenant Manuals)
- FASE 4: 0/1 tareas (Documentation)
- FASE 5: 0/2 tareas (Health Checks)
- FASE 6: 0/3 tareas (Testing)
- FASE 7: 0/3 tareas (Deploy)

---

**Última actualización:** Octubre 24, 2025
**Próximo paso:** FASE 2.1 - Enhanced RPC Function
