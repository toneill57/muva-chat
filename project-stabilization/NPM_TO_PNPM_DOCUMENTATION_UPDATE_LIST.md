# npm → pnpm Documentation Update List

**Date:** 2025-10-30
**Status:** Pending Updates

Esta lista contiene todos los archivos con referencias a `npm` que deben actualizarse a `pnpm`.

---

## Priority Levels

- **🔴 CRITICAL** - Agent snapshots y documentación principal (usados constantemente)
- **🟡 HIGH** - Docs de desarrollo y deployment (referencia frecuente)
- **🟢 MEDIUM** - Guías específicas de features (referencia ocasional)
- **⚪ LOW** - Archivos históricos/archivados (referencia mínima)

---

## 🔴 CRITICAL PRIORITY

### Agent Snapshots (.claude/agents/ & snapshots/)
Estos archivos son leídos por agentes especializados en cada sesión.

- [ ] `snapshots/general-snapshot.md`
  - Referencias: `npm install`, `npm run build`, `npm run dev`, `npm run lint`, `npm run test:e2e`
  - Actualizar a: `pnpm install`, `pnpm run build`, etc.

- [ ] `snapshots/backend-developer.md`
  - Referencias: `npm run dev`, `npm run type-check`
  - Actualizar comandos + agregar nota sobre pnpm

- [ ] `snapshots/deploy-agent.md`
  - Referencias: `npm ci --legacy-peer-deps`, `npm run build`
  - ⚠️ IMPORTANTE: Actualizar workflow completo a pnpm

- [ ] `snapshots/infrastructure-monitor.md`
  - Referencias: `npm ci --legacy-peer`, `npm run build`, `npm run monitor`, etc.
  - Actualizar todos los comandos de monitoreo

- [ ] `snapshots/ux-interface.md`
  - Referencias: `npm run type-check`
  - Actualizar comandos de validación

### Main Documentation

- [ ] `CLAUDE.md`
  - Buscar referencias a npm en instrucciones
  - Actualizar si existen

- [ ] `README.md`
  - Sección de instalación y desarrollo
  - Actualizar todos los ejemplos de comandos

---

## 🟡 HIGH PRIORITY

### Development Documentation

- [ ] `docs/DEVELOPMENT.md`
  - Comandos de desarrollo y testing
  - Scripts disponibles

- [ ] `docs/development/DEVELOPMENT.md`
  - Duplicado? Verificar y actualizar

- [ ] `docs/deployment/DEPLOYMENT_WORKFLOW.md`
  - Workflow de CI/CD
  - Comandos de deploy

- [ ] `docs/deployment/VPS_SETUP_GUIDE.md`
  - Setup inicial del VPS
  - Instalación de dependencias

- [ ] `docs/deployment/TROUBLESHOOTING.md`
  - Comandos de diagnóstico
  - Soluciones comunes

### Testing Documentation

- [ ] `e2e/README.md`
  - Comandos de testing E2E
  - Setup de Playwright

- [ ] `docs/testing/TESTING_GUIDE.md`
  - Todos los comandos de testing
  - Verificaciones de calidad

### Scripts Documentation

- [ ] `scripts/README-build-welcome.md`
  - Documentación del script de prebuild
  - Referencias a npx/npm

---

## 🟢 MEDIUM PRIORITY

### Command Files

- [ ] `.claude/commands/script.md`
  - Comandos custom de Claude Code
  - Verificar referencias

### Feature Documentation

- [ ] `docs/backend/GUEST_AUTH_SYSTEM.md`
- [ ] `docs/backend/STAFF_CHAT_CREDENTIALS.md`
- [ ] `docs/GUEST_AUTH_SYSTEM.md`
- [ ] `docs/RESERVATIONS_SYSTEM.md`
- [ ] `docs/tenant-subdomain-chat/NEW_TENANT_GUIDE.md`
- [ ] `docs/tenant-subdomain-chat/DEPLOYMENT.md`
- [ ] `docs/features/sire-compliance/TESTING_GUIDE.md`
- [ ] `docs/features/sire-compliance/PRODUCTION_DEPLOYMENT_CHECKLIST.md`
- [ ] `docs/features/sire-compliance/QUICK_REFERENCE.md`

### Runbooks

- [ ] `docs/runbooks/guest-chat-not-responding.md`
- [ ] `docs/runbooks/recreate-units-safely.md`

### Workflows

- [ ] `docs/workflows/TENANT_RESET_RESYNC_PROCESS.md`

### Architecture Documentation

- [ ] `docs/architecture/ACCOMMODATION_ID_MAPPING_ARCHITECTURE.md`
- [ ] `docs/architecture/ics-library-comparison.md`
- [ ] `docs/architecture/MULTI_TENANT_ROUTING.md`

### WhatsApp Integration

- [ ] `docs/whatsapp-business-integration/SETUP_GUIDE.md`

---

## ⚪ LOW PRIORITY (Historical/Archived)

### Project Stabilization (Historical)

- [ ] `project-stabilization/TODO.md`
- [ ] `project-stabilization/EJECUCION-PLAN.md`
- [ ] `project-stabilization/FRESH-START-PROMPT.md`
- [ ] `project-stabilization/ACTUALIZACIONES-WORKFLOWS.md`
- [ ] `project-stabilization/DIAGNOSTICO-ee1d48e.md`
- [ ] `project-stabilization/LEGACY_PEER_DEPS_RESOLUTION_STRATEGIES.md`
- [ ] `project-stabilization/PNPM_MIGRATION_ANALYSIS.md`
- [ ] `project-stabilization/PNPM_MIGRATION_SUMMARY.md`
- [ ] `project-stabilization/plan-part-1.md`
- [ ] `project-stabilization/plan-part-2.md`
- [ ] `project-stabilization/plan-part-3.md`
- [ ] `project-stabilization/workflow-part-1.md`
- [ ] `project-stabilization/workflow-part-2.md`
- [ ] `project-stabilization/workflow-part-3.md`

### Project Stabilization Phases

- [ ] `project-stabilization/docs/fase-0/VPS_SYNC_RESULTS.md`
- [ ] `project-stabilization/docs/fase-1/*.md` (7 archivos)
- [ ] `project-stabilization/docs/fase-2/*.md` (4 archivos)
- [ ] `project-stabilization/docs/fase-3/*.md` (5 archivos)

### Project Documentation (Completed Features)

- [ ] `docs/projects/chat-mobile/*.md` (múltiples archivos)
- [ ] `docs/projects/fix-health-check/*.md`
- [ ] `docs/projects/fixed-layout-migration/*.md`
- [ ] `docs/projects/guest-portal/*.md`
- [ ] `docs/projects/innpilot-cleanup/*.md`
- [ ] `docs/projects/innpilot-to-muva-rebrand/*.md`
- [ ] `docs/projects/muva-migration/*.md`
- [ ] `docs/projects/primera-migracion-correcta/*.md`
- [ ] `docs/projects/zilliz-to-pgvector/*.md`

### Chat Core Stabilization (Historical)

- [ ] `docs/chat-core-stabilization/README.md`
- [ ] `docs/chat-core-stabilization/plan.md`
- [ ] `docs/chat-core-stabilization/TODO.md`
- [ ] `docs/chat-core-stabilization/fase-*/*.md` (múltiples archivos)

### Guest Chat ID Mapping (Historical)

- [ ] `docs/guest-chat-id-mapping/plan.md`
- [ ] `docs/guest-chat-id-mapping/TODO.md`
- [ ] `docs/guest-chat-id-mapping/fase-*/*.md` (múltiples archivos)

### Subdomain Chat Experience (Historical)

- [ ] `docs/subdomain-chat-experience/plan.md`
- [ ] `docs/subdomain-chat-experience/TODO.md`

### Tenant Subdomain Chat (Completed)

- [ ] `docs/tenant-subdomain-chat/KNOWLEDGE_BROWSER_USAGE_GUIDE.md`
- [ ] `docs/tenant-subdomain-chat/PHASE_6_COMPLETION_SUMMARY.md`
- [ ] `docs/tenant-subdomain-chat/PHASE_6_DEPLOYMENT_REPORT.md`
- [ ] `docs/tenant-subdomain-chat/TASK_2_5_COMPLETION_REPORT.md`
- [ ] `docs/tenant-subdomain-chat/TASK_4D1_ADMIN_LAYOUT_REPORT.md`
- [ ] `docs/tenant-subdomain-chat/tenant-subdomain-chat-prompt-workflow.md`
- [ ] `docs/tenant-subdomain-chat/TODO.md`

### SIRE Compliance (Completed Phases)

- [ ] `docs/features/sire-compliance/FASE_11_BACKEND_INTEGRATION_REPORT.md`

### Development Summaries (Historical)

- [ ] `docs/development/STAFF_CHAT_IMPLEMENTATION.md`
- [ ] `docs/development/STAFF_CHAT_SUMMARY.md`
- [ ] `docs/development/STAFF_CHAT_TESTING_CHECKLIST.md`

### Fase Summaries (Historical)

- [ ] `docs/fase-summaries/E2E_SETUP_COMPLETE.md`
- [ ] `docs/fase-summaries/FASE_1_VALIDATION_SUMMARY.md`
- [ ] `docs/fase-summaries/FASE_2_COMPLETE_SUMMARY.md`
- [ ] `docs/fase-summaries/PUBLIC_CHAT_COMPLETE.md`

### Optimization Reports

- [ ] `docs/optimization/MCP_SERVERS_RESULTS.md`

### Other Documentation

- [ ] `docs/PROJECT_CLEANUP_REPORT.md`
- [ ] `docs/STATUS.md`
- [ ] `docs/NEW_CONVERSATION_PROMPT_MOTOPRESS_SYNC.md`

### Archive

- [ ] `docs/archive/plan_pasado.md`
- [ ] `docs/archive/TODO_pasado.md`

### Troubleshooting

- [ ] `docs/troubleshooting/ACCOMMODATION_RECREATION_SAFE_PROCESS.md`
- [ ] `docs/troubleshooting/TYPESCRIPT_INTERFACE_COMPLETENESS.md`

### Deployment Scripts (Ya actualizados, verificar)

- [ ] `scripts/deploy-and-validate-fase1.sh` - ✅ Ya usa pnpm
- [ ] `scripts/deploy-vps.sh` - ⚠️ Verificar
- [ ] `scripts/migrate-vps-directory.sh` - ⚠️ Verificar
- [ ] `scripts/test-deploy-checks.sh` - ⚠️ Verificar
- [ ] `scripts/vps-setup.sh` - ⚠️ Verificar

### Root Documentation

- [ ] `VPS_MIGRATION_INSTRUCTIONS.md`

### E2E Testing

- [ ] `e2e/conversation-memory-test-report.md`
- [ ] `e2e/TEST_EXECUTION_SUMMARY.md`

---

## Update Guidelines

### Global Search & Replace Rules

**DO NOT do blind search & replace.** Each file needs context-aware updates:

1. **Command Examples:**
   ```diff
   - npm install
   + pnpm install

   - npm ci --legacy-peer-deps
   + pnpm install --frozen-lockfile

   - npm run build
   + pnpm run build

   - npx tsx script.ts
   + pnpm dlx tsx script.ts
   ```

2. **Package Manager References:**
   ```diff
   - "Using npm for package management"
   + "Using pnpm for package management"

   - "Run npm install to get started"
   + "Run pnpm install to get started"
   ```

3. **CI/CD Workflows:**
   ```diff
   - npm ci --legacy-peer-deps
   + pnpm install --frozen-lockfile

   - uses: actions/setup-node@v4
   + uses: pnpm/action-setup@v4
   +   with:
   +     version: 10
   ```

4. **Historical Context:**
   - If document is about past work, add note at top:
     ```markdown
     > **Note:** This document describes historical work done with npm.
     > Current project uses pnpm. See `PNPM_MIGRATION_COMPLETE.md` for details.
     ```

---

## Batch Update Strategy

### Phase 1: Critical (Do First) 🔴
1. Update all agent snapshots
2. Update README.md and CLAUDE.md
3. Verify agents can read updated instructions

### Phase 2: High Priority 🟡
1. Update development documentation
2. Update deployment guides
3. Update testing guides

### Phase 3: Medium Priority 🟢
1. Update feature documentation
2. Update runbooks and workflows
3. Update architecture docs

### Phase 4: Low Priority (Optional) ⚪
1. Add historical notes to project folders
2. Update archived documentation if needed
3. Consider marking as "archived - npm era"

---

## Verification Checklist

After updating documentation:

- [ ] All agent snapshots use pnpm commands
- [ ] README.md has correct installation instructions
- [ ] DEVELOPMENT.md has correct dev setup
- [ ] DEPLOYMENT_WORKFLOW.md matches actual CI/CD
- [ ] VPS_SETUP_GUIDE.md uses pnpm install
- [ ] No hardcoded npm commands in active documentation

---

## Automation Opportunities

### Possible Script (Use with caution):
```bash
# Find and list all npm command references (for manual review)
grep -r "npm install\|npm ci\|npm run\|npx " \
  --include="*.md" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  . > npm-references.txt

# Review npm-references.txt manually before making changes
```

**⚠️ WARNING:** Do NOT use automated search & replace without manual review.
Context matters - some references may be intentionally historical.

---

## Notes

- Some files may have both npm and pnpm references (migration notes, comparisons)
- Historical project documentation may be intentionally left as-is for context
- Focus updates on "living" documentation that developers/agents use regularly
- Consider adding migration context notes instead of just replacing commands

---

**Total Files to Review:** ~150+
**Estimated Time:** 2-4 hours for critical/high priority
**Priority:** Critical and High should be done ASAP
