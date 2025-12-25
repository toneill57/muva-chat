# TODO - SIRE Auto-Submission

## 📍 CONTEXTO ACTUAL
<!-- Actualizar esta sección cada vez que se completan tareas -->

**Proyecto:** SIRE Auto-Submission & Conversational Data Capture
**Última actualización:** Diciembre 24, 2025
**Fase actual:** FASE 4 - Submission Workflow & Queue

### Estado del Sistema
- ✅ Endpoint /my-stay funcionando (auth, chat, file upload)
- ✅ System prompts SIRE implementados (627 líneas)
- ✅ Progressive disclosure con validación incremental (697 líneas)
- ✅ SIRE progress bar component (4 estados visuales + responsive)
- ✅ Entity extraction mejorado (6 funciones + confidence scoring)
- ✅ Chat API con modo SIRE (extractedData, nextField, isComplete)
- ✅ Botón "Iniciar registro" conectado a progressive disclosure
- ✅ Document OCR con Claude Vision (583 líneas, retry logic, exponential backoff)
- ✅ Field extraction OCR→SIRE (650 líneas, 34 tests, 7 funciones)
- ✅ Document Upload Component (drag & drop, preview, validation)
- ✅ Document Preview Modal (332 líneas, zoom, edit mode, confidence colors)
- ✅ OCR API Endpoint (358 líneas, Guest JWT auth, Supabase Storage)
- ✅ Database migration sire_document_uploads (5 indexes, 3 RLS policies, trigger)
- ✅ Chat interface integrado (auto-fill 7 campos, flujo completo)
- ✅ Storage bucket `sire-documents` (público, RLS policies, 10MB limit)
- ✅ **FLUJO E2E VERIFICADO:** Upload → Storage → OCR → Preview → Auto-fill ✅
- ✅ **FASE 3 COMPLETADA:** TXT Generator + Validation + Export Tracking + UI + Tests ✅
- ✅ TXT Generator (sire-txt-generator.ts, 272 líneas, 29 tests passing)
- ✅ Pre-generation validation (sire-validation.ts, 1,125 líneas, 50+ tests)
- ✅ Export tracking (sire_exports table + auto-insert con SHA-256 hash)
- ✅ Download UI (SIRETXTDownloader component, 305 líneas, 3 filter modes)

### Archivos Clave
- `src/lib/sire/conversational-prompts.ts` → System prompts SIRE
- `src/lib/sire/progressive-disclosure.ts` → Lógica de campos
- `src/components/Compliance/SireProgressBar.tsx` → UI de progreso
- `src/app/api/guest/chat/route.ts` → API con modo SIRE
- `src/components/Chat/GuestChatInterface.tsx` → Chat interface con document upload
- `src/lib/sire/document-ocr.ts` → Claude Vision OCR
- `src/lib/sire/field-extraction.ts` → OCR→SIRE mapping
- `src/components/Compliance/DocumentUpload.tsx` → Drag & drop upload
- `src/components/Compliance/DocumentPreview.tsx` → Preview modal con edit mode
- `src/app/api/sire/extract-document/route.ts` → OCR API endpoint
- `migrations/20251205155250_add_sire_document_uploads.sql` → Database schema

### Stack
- Next.js 15.5.9 + React 19.2.3 + TypeScript
- Claude AI SDK (chat + vision OCR)
- Supabase (PostgreSQL)

---

## FASE 1: Enhanced Conversational Capture 🎯 ✅ COMPLETADA

### 1.1 Create conversational prompts system
- [x] Implementar system prompts especializados para captura SIRE (estimate: 2h) ✅
  - System prompt base con contexto de 13 campos SIRE
  - Question templates por tipo de campo (nombre, documento, nacionalidad, fechas)
  - Multi-idioma (español, inglés)
  - Context-aware prompts (colombianos vs extranjeros)
  - Files: `src/lib/sire/conversational-prompts.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/conversational-prompts.test.ts`
  - **Completado:** Diciembre 18, 2025 - 627 líneas implementadas + documentación completa

### 1.2 Implement progressive disclosure logic
- [x] Desarrollar lógica de progressive disclosure (estimate: 2h) ✅
  - Función `getNextFieldToAsk(currentData)` - determina próximo campo
  - Priorización inteligente (documento → nombre → nacionalidad → fechas)
  - Skip logic (campos auto-deducibles del check-in)
  - Validación incremental (validar cada campo antes de continuar)
  - Files: `src/lib/sire/progressive-disclosure.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/unit/progressive-disclosure.test.ts`
  - **Completado:** Diciembre 18, 2025 - 697 líneas + validación incremental con normalización

### 1.3 Build SIRE progress bar component
- [x] Crear componente de progress indicator (estimate: 1.5h) ✅
  - Progress bar 13/13 campos con tooltips
  - Visual indicators por campo (✅ complete, ⏳ pending, ❌ error)
  - Animación smooth de progreso
  - Responsive design (mobile-first)
  - Files: `src/components/Compliance/SireProgressBar.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - verificar en localhost:3000/my-stay
  - **Completado:** Diciembre 18, 2025 - Componente con 4 estados visuales + responsive design + página de test

### 1.4 Integrate SIRE mode into GuestChatInterface
- [x] Modificar chat interface para modo SIRE (estimate: 2h) ✅
  - Agregar prop `mode: 'general' | 'sire'`
  - Integrar SireProgressBar en header
  - Hook para progressive disclosure
  - Real-time validation feedback
  - Files: `src/components/Chat/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - captura conversacional de 3 guest profiles
  - **Completado:** Diciembre 18, 2025 - Hook useSireProgressiveDisclosure + integración completa en chat interface (+242 líneas)

### 1.5 Enhance entity extraction for SIRE
- [x] Mejorar entity extraction en compliance-chat-engine (estimate: 1.5h) ✅
  - Extract nombres compuestos (primer apellido, segundo apellido, nombres)
  - Extract fechas en español ("veinticinco de marzo de mil novecientos ochenta y cinco")
  - Extract países en lenguaje natural ("Estados Unidos" → nationality_code 249)
  - Confidence scoring por entidad
  - Files: `src/lib/compliance-chat-engine.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/integration/sire-chat-flow.test.ts`
  - **Completado:** Diciembre 18, 2025 - Sistema de extracción con 6 funciones + confidence scoring + 10/10 tests PASSED (+815 líneas)

### 1.6 Update chat API with SIRE system prompt
- [x] Modificar API route para incluir SIRE prompt (estimate: 1h) ✅
  - Detectar modo SIRE (flag en request)
  - Usar `conversational-prompts.ts` system prompt
  - Incluir progressive disclosure en context
  - Return next field to ask en response
  - Files: `src/app/api/guest/chat/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST localhost:3000/api/guest/chat -d '{"mode":"sire"}'`
  - **Completado:** Diciembre 2025 - mode === 'sire' detection, returns extractedData, nextField, isComplete

### 1.7 Connect SIRE start button to progressive disclosure flow
- [x] Integrar botón "Iniciar registro" con modo SIRE (estimate: 1h) ✅
  - Cambiar `mode` de prop a state en GuestChatInterface
  - Crear handler `handleStartSIREMode()` que active modo SIRE
  - Crear nueva conversación SIRE dedicada al iniciar
  - Actualizar ComplianceReminder para llamar handler correcto
  - Mostrar SIRE progress bar cuando modo activo
  - Files: `src/components/Chat/GuestChatInterface.tsx`, `src/components/Compliance/ComplianceReminder.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - click botón "Iniciar registro" → modo SIRE activo
  - **Completado:** Diciembre 2025 - handleStartSIREMode() + onStart prop en ComplianceReminder

---

## FASE 2: Document Upload + OCR Extraction ✅ COMPLETADA

### 2.1 Create document upload component
- [x] Implementar drag & drop upload component (estimate: 2h) ✅
  - Drag & drop area con visual feedback
  - File type validation (jpg, png, pdf - max 10MB)
  - Preview thumbnail
  - Upload progress bar
  - Multi-file support (pasaporte + visa)
  - Files: `src/components/Compliance/DocumentUpload.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - upload 5 sample passports
  - **Completado:** Diciembre 23, 2025 - 7.4K líneas + ThumbnailPreview + tipos compartidos

### 2.2 Implement Claude Vision OCR integration
- [x] Integrar Claude Vision API para OCR (estimate: 3h) ✅
  - API call a Claude Vision con prompt especializado
  - Prompt engineering: "Extract passport fields: full name, passport number, nationality, birth date, expiry date"
  - Error handling (API failures, rate limits)
  - Response parsing (JSON structure)
  - Files: `src/lib/sire/document-ocr.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/integration/document-ocr.test.ts`
  - **Completado:** Diciembre 23, 2025 - 583 líneas + extractPassportData/extractVisaData + retry exponential backoff

### 2.3 Build field extraction and mapping
- [x] Desarrollar field extraction logic (estimate: 2h) ✅
  - Parse OCR response → SIRE campos
  - Name splitting (full name → primer apellido, segundo apellido, nombres)
  - Country mapping (text → SIRE code)
  - Document type detection (auto-detect "Passport" → code 3)
  - Confidence scoring per field (0.00-1.00)
  - Files: `src/lib/sire/field-extraction.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test tests/unit/field-extraction.test.ts`
  - **Completado:** Diciembre 23, 2025 - 650+ líneas + 34 tests + validación completa

### 2.4 Create document preview modal
- [x] Implementar preview modal con extracted fields (estimate: 2h) ✅
  - Image preview con zoom
  - Extracted fields table con highlighting
  - Confidence indicators (color-coded: green >0.90, yellow 0.70-0.90, red <0.70)
  - Manual edit capability para low-confidence fields
  - Confirm/reject buttons
  - Files: `src/components/Compliance/DocumentPreview.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - upload passport, verificar preview
  - **Completado:** Diciembre 23, 2025 - 332 líneas + FieldRow component + zoom + edit mode

### 2.5 Create OCR API endpoint
- [x] Implementar API endpoint para OCR (estimate: 1.5h) ✅
  - POST /api/sire/extract-document?reservation_id=xxx
  - Input: file upload (multipart/form-data, files[])
  - Guest JWT authentication (cookie or Authorization header)
  - Upload to Supabase Storage bucket `sire-documents`
  - Call document-ocr.ts + field-extraction.ts
  - Return extracted fields + confidence + file_url
  - Files: `src/app/api/sire/extract-document/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST -F "files[]=@passport.jpg" localhost:3000/api/sire/extract-document?reservation_id=xxx`
  - **Completado:** Diciembre 23, 2025 - 400+ líneas + Guest JWT auth + Storage upload
  - **Fix aplicado:** Dic 23 - Cambio de Supabase Auth → Guest JWT token

### 2.6 Create database migration for document uploads
- [x] Crear migration sire_document_uploads (estimate: 0.5h) ✅
  - Table: id, reservation_id, tenant_id, document_type, file_url, ocr_result, extracted_fields, confidence_score, status
  - Indexes: reservation_id, status
  - RLS policies: tenant isolation
  - Files: `migrations/20251205155250_add_sire_document_uploads.sql`
  - Agent: **@agent-database-agent**
  - Test: `node .claude/db-query.js "SELECT * FROM sire_document_uploads LIMIT 1"`
  - **Completado:** Diciembre 5, 2025 - Tabla aplicada con FK, 5 indexes, 3 RLS policies, trigger

### 2.7 Integrate document upload into chat interface
- [x] Agregar document upload flow a GuestChatInterface (estimate: 1h) ✅
  - Button "Subir Pasaporte" en chat (solo visible en modo SIRE)
  - Open DocumentUpload modal con reservationId prop
  - API call con files[] + reservation_id
  - Show DocumentPreview after OCR success
  - Auto-fill campos SIRE en chat con extracted data
  - Files: `src/components/Chat/GuestChatInterface.tsx`, `src/components/Compliance/DocumentUpload.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Manual - flujo completo upload → OCR → preview → auto-fill
  - **Completado:** Diciembre 23, 2025 - Handlers integrados + auto-fill 7 campos
  - **Fixes aplicados:** Dic 23 - className multiline fix, reservationId prop, files[] field name

### 2.8 Storage bucket setup (infraestructura)
- [x] Crear bucket Supabase Storage para documentos (estimate: 0.25h) ✅
  - Bucket: `sire-documents` (público)
  - Límite: 10MB por archivo
  - MIME types: image/jpeg, image/png, image/gif, image/webp
  - RLS policies: INSERT y SELECT para bucket
  - **Completado:** Diciembre 23, 2025 - Bucket creado vía SQL + políticas RLS

---

## FASE 3: TXT File Generation 📄

### 3.1 Implement TXT file generator
- [x] Crear generador de archivos TXT con formato oficial SIRE (estimate: 1.5h) ✅
  - Function generateSIRETXT(guests[], tenantId) → SIRETXTResult
  - Tab-delimited format (13 campos por línea)
  - Un archivo = múltiples huéspedes (1 línea por guest)
  - Formato: codigo_hotel\tcodigo_ciudad\ttipo_doc\tnumero_id\t...
  - Sin headers (primera línea = primer huésped)
  - Encoding UTF-8 sin BOM, line endings CRLF
  - Files: `src/lib/sire/sire-txt-generator.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/__tests__/sire-txt-generator.test.ts`
  - **Completado:** Diciembre 23, 2025 - 24 tests passing, interfaces SIREGuestData + SIRETXTResult + TenantSIREInfo

### 3.2 Create TXT export API endpoint
- [x] Implementar endpoint para exportar TXT (estimate: 1h) ✅
  - POST /api/sire/generate-txt
  - Input: { tenant_id, date?, date_from?, date_to?, movement_type? }
  - Call generateSIRETXT() from sire-txt-generator.ts
  - Filtrado por fecha/rango y tipo movimiento (E/S/both)
  - Auto-exclusión de colombianos (código 169)
  - Return TXT content + filename + excluded list
  - Files: `src/app/api/sire/generate-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST localhost:3000/api/sire/generate-txt -d '{"tenant_id":"xyz"}'`
  - **Completado:** Diciembre 23, 2025 - 1,408 líneas (API + docs + tests + UI component)

### 3.3 Implement pre-generation validation
- [x] Desarrollar validación pre-exportación (estimate: 1h) ✅
  - Function validateForSIRE(reservation) → ValidationResult
  - Verificar 13 campos completos y no null
  - Validar códigos SIRE (NO ISO) - solo 3, 5, 10, 46
  - Validar formatos de fecha (DD/MM/YYYY estricto)
  - Validar longitudes de campos + caracteres permitidos
  - Return errors/warnings/fieldStatus por reservación
  - Files: `src/lib/sire/sire-validation.ts` (1,125 líneas)
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/sire-validation.test.ts` (50+ tests passing)
  - **Completado:** Diciembre 23, 2025 - Validación exhaustiva + tests de edge cases

### 3.4 Create sire_exports tracking table
- [x] Crear migration y lógica de tracking (estimate: 0.5h) ✅
  - CREATE sire_exports: id, tenant_id, export_date, date_range_from/to, guest_count, txt_filename, txt_content_hash (SHA-256), file_size_bytes, status, etc.
  - Junction table sire_export_guests (trackea guests incluidos por export)
  - Indexes: tenant_id+export_date DESC, status, content_hash
  - RLS policies (tenant isolation)
  - INSERT automático en /api/sire/generate-txt después de generar TXT
  - Files: `migrations/20251205190955_add_sire_exports.sql`, `src/app/api/sire/generate-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `node .claude/db-query.js "SELECT * FROM sire_exports ORDER BY created_at DESC LIMIT 3"`
  - **Completado:** Diciembre 24, 2025 - Migration + INSERT logic implementado

### 3.5 Add download TXT button to UI
- [x] Crear componente de exportación TXT (estimate: 2h) ✅
  - Component SIRETXTDownloader con date range picker
  - 3 modos de filtro: all dates, single date, date range
  - Selector de tipo de movimiento (E/S/both)
  - Trigger export API /api/sire/generate-txt
  - Auto-descarga del TXT generado (si guest_count > 0)
  - Display de excluded guests con razones
  - Files: `src/components/Compliance/SIRETXTDownloader.tsx` (305 líneas)
  - Agent: **@agent-ux-interface**
  - Test: Manual - exportar TXT con date range
  - **Completado:** Diciembre 23, 2025 - UI con mejoras sobre spec original (3 modos de filtro vs 1)

### 3.6 Testing TXT format compliance
- [x] Validar formato TXT contra spec oficial (estimate: 1h) ✅
  - Tests de formato TAB-delimited (13 campos, sin otros delimitadores)
  - Tests de CRLF line endings, uppercase names, DD/MM/YYYY regex estricto
  - Tests de UTF-8 con acentos (García → GARCÍA)
  - Test de ejemplo oficial SIRE (match exacto)
  - Test de códigos SIRE vs ISO (249 vs 840 para USA)
  - Files: `src/lib/sire/__tests__/sire-txt-generator.test.ts` (29 tests passing)
  - Agent: **@agent-backend-developer**
  - Test: `pnpm test src/lib/sire/__tests__/sire-txt-generator.test.ts` (100% passing)
  - **Completado:** Diciembre 24, 2025 - 29 tests (24 originales + 5 críticos nuevos)

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

**Total Tasks:** 41
**Completed:** 17/41 (41.5%)

**Por Fase:**
- FASE 1: 7/7 tareas (100%) ✅ COMPLETADA
- FASE 2: 8/8 tareas (100%) ✅ COMPLETADA (incluye 2.8 Storage bucket)
- FASE 3: 2/6 tareas (33%) ← EN PROGRESO
- FASE 4: 0/7 tareas (0%)
- FASE 5: 0/6 tareas (0%)
- FASE 6: 0/7 tareas (0%)

**Por Agente:**
- @agent-backend-developer: 12/25 tareas completadas (48.0%)
- @agent-ux-interface: 6/10 tareas completadas (60.0%)
- @agent-database-agent: 2/5 tareas (40.0%)
- @agent-deploy-agent: 0/2 tareas (0%)

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

**Última actualización:** Diciembre 23, 2025
**Próximo paso:** FASE 3, Tarea 3.3 - Implement pre-generation validation (estimate: 1h)

### ✨ FASE 2 COMPLETADA (8/8 tareas):
- [x] 2.1: Document upload component ✅
- [x] 2.2: Claude Vision OCR integration ✅
- [x] 2.3: Field extraction and mapping ✅
- [x] 2.4: Document preview modal ✅
- [x] 2.5: OCR API endpoint (Guest JWT auth) ✅
- [x] 2.6: Database migration for document uploads ✅
- [x] 2.7: Integrate document upload into chat interface ✅
- [x] 2.8: Storage bucket setup (sire-documents) ✅

### 🔧 Fixes aplicados (Dic 23, 2025):
- Auth: Supabase Auth → Guest JWT token (cookie/header)
- Form: `files` → `files[]` field name
- Props: `reservationId` agregado a DocumentUpload
- Syntax: className multiline → single line
- Storage: Bucket `sire-documents` creado + RLS policies
- Bucket: Cambiado a público para URLs accesibles

### Resumen FASE 3:
- [x] 3.1: Implement TXT file generator ✅
- [x] 3.2: Create TXT export API endpoint ✅
- [ ] 3.3: Implement pre-generation validation ← SIGUIENTE
- [ ] 3.4: Create sire_exports tracking table
- [ ] 3.5: Add download TXT button to UI
- [ ] 3.6: Testing TXT format compliance
