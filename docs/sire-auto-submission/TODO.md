# TODO - SIRE Auto-Submission

**Proyecto:** SIRE Auto-Submission & Conversational Data Capture
**Fecha:** Diciembre 4, 2025
**Plan:** Ver `/Users/oneill/.claude/plans/swift-exploring-gadget.md` para contexto completo

---

## FASE 1: Enhanced Conversational Capture 🎯

### 1.1 Create conversational prompts system
- [ ] Implementar system prompts especializados para captura SIRE (estimate: 2h)
  - System prompt base con contexto de 13 campos SIRE
  - Question templates por tipo de campo (nombre, documento, nacionalidad, fechas)
  - Multi-idioma (español, inglés)
  - Context-aware prompts (si nacionalidad=Colombia, skip visa questions)
  - Files: `src/lib/sire/conversational-prompts.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/conversational-prompts.test.ts`

### 1.2 Implement progressive disclosure logic
- [ ] Desarrollar lógica de progressive disclosure (estimate: 2h)
  - Función `getNextFieldToAsk(currentData)` - determina próximo campo
  - Priorización inteligente (documento → nombre → nacionalidad → fechas)
  - Skip logic (campos auto-deducibles del check-in)
  - Validación incremental (validar cada campo antes de continuar)
  - Files: `src/lib/sire/progressive-disclosure.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/unit/progressive-disclosure.test.ts`

### 1.3 Build SIRE progress bar component
- [ ] Crear componente de progress indicator (estimate: 1.5h)
  - Progress bar 13/13 campos con tooltips
  - Visual indicators por campo (✅ complete, ⏳ pending, ❌ error)
  - Animación smooth de progreso
  - Responsive design (mobile-first)
  - Files: `src/components/Compliance/SireProgressBar.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - verificar en localhost:3000/my-stay

### 1.4 Integrate SIRE mode into GuestChatInterface
- [ ] Modificar chat interface para modo SIRE (estimate: 2h)
  - Agregar prop `mode: 'general' | 'sire'`
  - Integrar SireProgressBar en header
  - Hook para progressive disclosure
  - Real-time validation feedback
  - Files: `src/components/Chat/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - captura conversacional de 3 guest profiles

### 1.5 Enhance entity extraction for SIRE
- [ ] Mejorar entity extraction en compliance-chat-engine (estimate: 1.5h)
  - Extract nombres compuestos (primer apellido, segundo apellido, nombres)
  - Extract fechas en español ("veinticinco de marzo de mil novecientos ochenta y cinco")
  - Extract países en lenguaje natural ("Estados Unidos" → nationality_code 249)
  - Confidence scoring por entidad
  - Files: `src/lib/compliance-chat-engine.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/integration/sire-chat-flow.test.ts`

### 1.6 Update chat API with SIRE system prompt
- [ ] Modificar API route para incluir SIRE prompt (estimate: 1h)
  - Detectar modo SIRE (flag en request)
  - Usar `conversational-prompts.ts` system prompt
  - Incluir progressive disclosure en context
  - Return next field to ask en response
  - Files: `src/app/api/guest/chat/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST localhost:3000/api/guest/chat -d '{"mode":"sire"}'`

---

## FASE 2: Document Upload + OCR Extraction ⚙️

### 2.1 Create document upload component
- [ ] Implementar drag & drop upload component (estimate: 2h)
  - Drag & drop area con visual feedback
  - File type validation (jpg, png, pdf - max 10MB)
  - Preview thumbnail
  - Upload progress bar
  - Multi-file support (pasaporte + visa)
  - Files: `src/components/Compliance/DocumentUpload.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - upload 5 sample passports

### 2.2 Implement Claude Vision OCR integration
- [ ] Integrar Claude Vision API para OCR (estimate: 3h)
  - API call a Claude Vision con prompt especializado
  - Prompt engineering: "Extract passport fields: full name, passport number, nationality, birth date, expiry date"
  - Error handling (API failures, rate limits)
  - Response parsing (JSON structure)
  - Files: `src/lib/sire/document-ocr.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/integration/document-ocr.test.ts`

### 2.3 Build field extraction and mapping
- [ ] Desarrollar field extraction logic (estimate: 2h)
  - Parse OCR response → SIRE campos
  - Name splitting (full name → primer apellido, segundo apellido, nombres)
  - Country mapping (text → SIRE code)
  - Document type detection (auto-detect "Passport" → code 3)
  - Confidence scoring per field (0.00-1.00)
  - Files: `src/lib/sire/field-extraction.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/unit/field-extraction.test.ts`

### 2.4 Create document preview modal
- [ ] Implementar preview modal con extracted fields (estimate: 2h)
  - Image preview con zoom
  - Extracted fields table con highlighting
  - Confidence indicators (color-coded: green >0.90, yellow 0.70-0.90, red <0.70)
  - Manual edit capability para low-confidence fields
  - Confirm/reject buttons
  - Files: `src/components/Compliance/DocumentPreview.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - upload passport, verificar preview

### 2.5 Create OCR API endpoint
- [ ] Implementar API endpoint para OCR (estimate: 1.5h)
  - POST /api/sire/extract-document
  - Input: file upload (multipart/form-data)
  - Call document-ocr.ts
  - Save to sire_document_uploads table
  - Return extracted fields + confidence
  - Files: `src/app/api/sire/extract-document/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST -F "file=@passport.jpg" localhost:3000/api/sire/extract-document`

### 2.6 Create database migration for document uploads
- [ ] Crear migration sire_document_uploads (estimate: 0.5h)
  - Table: id, reservation_id, tenant_id, document_type, file_url, ocr_result, extracted_fields, confidence_score, status
  - Indexes: reservation_id, status
  - RLS policies: tenant isolation
  - Files: `migrations/20251204_add_document_uploads.sql`
  - Agent: **@agent-database-agent**
  - Test: `node .claude/db-query.js "SELECT * FROM sire_document_uploads LIMIT 1"`

### 2.7 Integrate document upload into chat interface
- [ ] Agregar document upload flow a GuestChatInterface (estimate: 1h)
  - Button "Subir Pasaporte" en chat
  - Open DocumentUpload modal
  - Show DocumentPreview after OCR
  - Auto-fill campos en chat con extracted data
  - Files: `src/components/Chat/GuestChatInterface.tsx`, `src/lib/guest-chat-types.ts`
  - Agent: **@agent-ux-interface**
  - Test: Manual - flujo completo upload → OCR → auto-fill

---

## FASE 3: TXT File Generation 📄

### 3.1 Implement TXT file generator
- [ ] Crear generador de archivos TXT con formato oficial SIRE (estimate: 1.5h)
  - Function generateSIRETxt(reservations[]) → string
  - Tab-delimited format (13 campos por línea)
  - Un archivo = múltiples huéspedes (1 línea por guest)
  - Formato: codigo_hotel\tcodigo_ciudad\ttipo_doc\tnumero_id\t...
  - Sin headers (primera línea = primer huésped)
  - Encoding UTF-8 sin BOM, line endings CRLF
  - Files: `src/lib/sire/sire-txt-generator.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/sire-txt-generator.test.ts`

### 3.2 Create TXT export API endpoint
- [ ] Implementar endpoint para exportar TXT (estimate: 1h)
  - POST /api/sire/export-txt
  - Input: { tenant_id, start_date, end_date, reservation_ids? }
  - Call generateSIRETxt()
  - Save to Supabase Storage
  - Track export en sire_exports table
  - Return download URL
  - Files: `src/app/api/sire/export-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST localhost:3000/api/sire/export-txt -d '{"tenant_id":"xyz"}'`

### 3.3 Implement pre-generation validation
- [ ] Desarrollar validación pre-exportación (estimate: 1h)
  - Function validateSIREData(reservation) → ValidationResult
  - Verificar 13 campos completos y no null
  - Validar códigos SIRE (NO ISO)
  - Validar formatos de fecha (DD/MM/YYYY)
  - Validar longitudes de campos
  - Return warnings/errors por reservación
  - Files: `src/lib/sire/sire-validation.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/sire-validation.test.ts`

### 3.4 Create sire_exports tracking table
- [ ] Crear migration para tracking de exports (estimate: 0.5h)
  - CREATE sire_exports: id, tenant_id, export_date, file_name, file_url, guest_count, reservation_ids, status, created_by
  - Indexes: tenant_id, export_date DESC
  - RLS policies (tenant isolation)
  - Files: `migrations/20251218_add_sire_exports.sql`
  - Agent: **@agent-database-agent**
  - Test: `node .claude/db-query.js "SELECT * FROM sire_exports LIMIT 1"`

### 3.5 Add download TXT button to UI
- [ ] Crear componente de exportación TXT en admin (estimate: 2h)
  - Button "Exportar TXT SIRE" en admin dashboard
  - Date range picker (from/to)
  - Preview de guests a incluir (count + validation status)
  - Trigger export API
  - Download generado automáticamente
  - Files: `src/components/Admin/SireTxtExport.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - exportar TXT con 10 guests

### 3.6 Testing TXT format compliance
- [ ] Validar formato TXT contra spec oficial (estimate: 1h)
  - Generate TXT con 20 guests de diferentes países
  - Verificar delimitadores (tabs, no spaces)
  - Verificar orden de campos (13 en secuencia correcta)
  - Verificar códigos SIRE (NO ISO)
  - Abrir en Excel/editor para verificar formato visual
  - Agent: **@agent-backend-developer**
  - Test: Manual - verificación visual + unit tests

---

## FASE 4: Submission Workflow & Queue ✨

### 4.1 Decide queue system (Bull vs Inngest)
- [ ] Evaluar y decidir queue system (estimate: 0.5h)
  - Comparar Bull (Redis) vs Inngest (serverless)
  - Considerar infrastructure availability (Redis en VPS?)
  - Documentar decisión y rationale
  - Files: `docs/sire-auto-submission/fase-4/QUEUE_DECISION.md`
  - Agent: **@agent-backend-developer**
  - Test: N/A (design decision)

### 4.2 Implement queue configuration
- [ ] Configurar job queue (estimate: 2h)
  - Setup Bull/Inngest client
  - Define job schema (reservation_id, tenant_id, priority)
  - Define queue options (concurrency, retry settings)
  - Exponential backoff configuration (1min, 5min, 15min)
  - Dead-letter queue setup
  - Files: `src/lib/queue/sire-submission-queue.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/unit/sire-submission-queue.test.ts`

### 4.3 Implement queue worker
- [ ] Desarrollar worker que procesa jobs (estimate: 2h)
  - Worker function que llama submitToSIRE()
  - Error handling + retry logic
  - Update sire_submission_queue status
  - Send webhook notifications
  - Logging completo
  - Files: `src/lib/queue/sire-submission-worker.ts`
  - Agent: **@agent-backend-developer**
  - Test: Manual - agregar job, verificar procesamiento

### 4.4 Create queue API endpoints
- [ ] Implementar APIs de queue (estimate: 1.5h)
  - POST /api/sire/queue/add - agregar job a queue
  - GET /api/sire/queue/status/[jobId] - check status
  - Input validation (reservation_id, tenant_id)
  - Return job ID + estimated processing time
  - Files: `src/app/api/sire/queue/add/route.ts`, `src/app/api/sire/queue/status/[jobId]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST localhost:3000/api/sire/queue/add -d '{"reservation_id":"xxx"}'`

### 4.5 Implement webhook notifications
- [ ] Desarrollar webhook sender (estimate: 1h)
  - Function sendWebhook(event, data)
  - Events: submission_success, submission_failed, submission_retry
  - Tenant-specific webhook URLs (configurables)
  - Retry logic para webhook failures
  - Files: `src/lib/webhooks/sire-notifications.ts`
  - Agent: **@agent-backend-developer**
  - Test: Mock webhook endpoint, verificar payloads

### 4.6 Create database migration for queue
- [ ] Crear migration sire_submission_queue (estimate: 0.5h)
  - Table: id, reservation_id, tenant_id, priority, scheduled_at, status, retry_count, max_retries, error_log, result
  - Indexes: status + scheduled_at, tenant_id
  - RLS policies
  - Files: `migrations/20251204_add_submission_queue.sql`
  - Agent: **@agent-database-agent**
  - Test: `node .claude/db-query.js "SELECT * FROM sire_submission_queue LIMIT 1"`

### 4.7 Integration testing
- [ ] Testing completo de queue workflow (estimate: 1h)
  - Agregar 10 jobs a queue
  - Verificar procesamiento en orden de prioridad
  - Simular fallo → verificar retry logic
  - Verificar job va a dead-letter después de max retries
  - Verificar webhooks enviados
  - Agent: **@agent-backend-developer**
  - Test: Manual - ver logs del worker

---

## FASE 5: Staff Admin Dashboard 🎨

### 5.1 Create admin dashboard page
- [ ] Implementar página principal de dashboard (estimate: 2h)
  - Layout con sidebar navigation
  - Header con tenant selector (multi-tenant)
  - Main area con tabs: Guests, Metrics, Settings
  - Responsive design (desktop-first)
  - Files: `src/app/admin/sire/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - navegar a localhost:3000/admin/sire

### 5.2 Build guest list component
- [ ] Desarrollar componente de lista de guests (estimate: 3h)
  - Table con columnas: name, document, check-in, status, actions
  - Status indicators (pending, submitted, confirmed, failed) con colores
  - Actions: View Details, Re-submit, Export TXT
  - Pagination (50 guests per page)
  - Sorting por columna
  - Files: `src/components/Admin/SireGuestList.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - verificar con 20 guests en diferentes statuses

### 5.3 Build metrics cards component
- [ ] Desarrollar componente de metrics (estimate: 1.5h)
  - Cards: Total Guests, Complete %, Submitted %, Failed %
  - Visual indicators (progress bars, trend arrows)
  - Tooltips con detalles
  - Auto-refresh cada 30s
  - Files: `src/components/Admin/SireMetrics.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - verificar cálculos correctos

### 5.4 Build filters component
- [ ] Desarrollar componente de filtros (estimate: 1h)
  - Filtros: Date range, Status, Tenant
  - Date picker (from/to)
  - Multi-select status dropdown
  - Apply/Reset buttons
  - Files: `src/components/Admin/SireFilters.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - verificar filtrado funciona

### 5.5 Create admin API endpoints
- [ ] Implementar APIs de admin (estimate: 2.5h)
  - GET /api/sire/admin/guests - lista con filtros + pagination
  - GET /api/sire/admin/metrics - métricas agregadas
  - POST /api/sire/admin/resubmit - re-envío de guest fallido
  - GET /api/sire/admin/export-txt - exportación TXT formato oficial
  - Auth middleware (solo staff)
  - Files: `src/app/api/sire/admin/guests/route.ts`, `metrics/route.ts`, `resubmit/route.ts`, `export-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl localhost:3000/api/sire/admin/guests?status=failed`

### 5.6 Create database views for dashboard
- [ ] Crear views SQL para admin (estimate: 1h)
  - VIEW v_sire_admin_dashboard - join guests + submissions con completeness %
  - VIEW v_sire_metrics - agregaciones por tenant
  - Optimización de queries (indexes)
  - Files: `migrations/20251204_add_sire_admin_views.sql`
  - Agent: **@agent-database-agent**
  - Test: `node .claude/db-query.js "SELECT * FROM v_sire_admin_dashboard LIMIT 5"`

---

## FASE 6: Testing & Documentation 📚

### 6.1 Create E2E test for guest flow
- [ ] Implementar Playwright E2E test (estimate: 2h)
  - Test scenario: Guest login → chat capture → auto-submit → confirmation
  - Test scenario: Guest login → upload passport → OCR → auto-submit → confirmation
  - Assertions: 13 campos captured, confirmation number returned
  - Screenshot on failure
  - Files: `tests/e2e/sire-guest-flow.spec.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test:e2e tests/e2e/sire-guest-flow.spec.ts`

### 6.2 Create E2E test for admin flow
- [ ] Implementar Playwright E2E test (estimate: 1.5h)
  - Test scenario: Staff login → view dashboard → re-submit failed → export TXT
  - Assertions: dashboard loads, metrics correct, re-submit works, TXT format valid
  - Files: `tests/e2e/sire-admin-flow.spec.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test:e2e tests/e2e/sire-admin-flow.spec.ts`

### 6.3 Create user documentation
- [ ] Escribir guías de usuario (estimate: 1h)
  - USER_GUIDE.md - guía para guests (screenshots, paso a paso)
  - STAFF_GUIDE.md - guía para staff (dashboard, troubleshooting)
  - FAQ section en ambos
  - Files: `docs/sire-auto-submission/USER_GUIDE.md`, `STAFF_GUIDE.md`
  - Agent: **@agent-backend-developer**
  - Test: Manual - review por usuario no-técnico

### 6.4 Create technical documentation
- [ ] Escribir documentación técnica (estimate: 1h)
  - ARCHITECTURE.md - diagrams (mermaid), data flow, components
  - API_REFERENCE.md - todos los endpoints con examples
  - Database schema diagram
  - Files: `docs/sire-auto-submission/ARCHITECTURE.md`, `API_REFERENCE.md`
  - Agent: **@agent-backend-developer**
  - Test: Manual - review por developer

### 6.5 Create pilot checklist
- [ ] Escribir checklist de pilot (estimate: 0.5h)
  - Pre-pilot: credenciales SIRE, test environment setup
  - During pilot: monitoreo, feedback collection
  - Post-pilot: metrics analysis, issue resolution
  - Success criteria: >80% auto-submission rate, <5% error rate
  - Files: `docs/sire-auto-submission/PILOT_CHECKLIST.md`
  - Agent: **@agent-backend-developer**
  - Test: N/A (planning doc)

### 6.6 Create rollout plan
- [ ] Escribir plan de rollout (estimate: 0.5h)
  - Phase 0: Pilot con 1-3 hoteles (2 semanas)
  - Phase 1: Beta con 10 hoteles (1 mes)
  - Phase 2: General availability
  - Rollback plan si hay issues críticos
  - Files: `docs/sire-auto-submission/ROLLOUT_PLAN.md`
  - Agent: **@agent-backend-developer**
  - Test: N/A (planning doc)

### 6.7 Performance and security testing
- [ ] Ejecutar load tests y security audit (estimate: 0.5h)
  - Load test: 50 concurrent guests capturando datos
  - Performance: Verificar <500ms chat, <3s OCR, <10s submission
  - Security: Penetration testing de credential management
  - Verify PII handling (GDPR compliance)
  - Agent: **@agent-backend-developer**
  - Test: `pnpm run load-test` (script a crear)

---

## 📊 PROGRESO

**Total Tasks:** 39
**Completed:** 0/39 (0%)

**Por Fase:**
- FASE 1: 0/6 tareas (0%)
- FASE 2: 0/7 tareas (0%)
- FASE 3: 0/6 tareas (0%) ← TXT File Generation
- FASE 4: 0/7 tareas (0%)
- FASE 5: 0/6 tareas (0%)
- FASE 6: 0/7 tareas (0%)

**Por Agente:**
- @agent-backend-developer: 0/24 tareas (61.5%)
- @agent-ux-interface: 0/9 tareas (23.1%)
- @agent-database-agent: 0/4 tareas (10.3%)
- @agent-deploy-agent: 0/2 tareas (5.1%)

**Nota:** Puppeteer automation (upload de TXT al portal SIRE) fue postponed a FASE FUTURA (7 tareas adicionales, 12h estimadas)

---

## 🔮 FASE FUTURA (POSTPONED): Puppeteer File Upload Automation

**Estado:** Postponed hasta validar captura + TXT generation con 3+ hoteles

**Tareas pendientes para fase futura:**
1. Research SIRE portal UI and selectors (2h)
2. Implement SIRE credentials management (1.5h)
3. Update sire-automation.ts with real selectors (4h)
4. Create database migration for SIRE credentials (1h)
5. Update SIRE submit API endpoint (2h)
6. Create manual test submission script (1h)
7. End-to-end manual testing (0.5h)

**Total:** 7 tareas adicionales (12h estimadas)

---

**Última actualización:** Diciembre 18, 2025
**Próximo paso:** Ejecutar FASE 1, Tarea 1.1 - Create conversational prompts system
