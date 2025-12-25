# SIRE Auto-Submission - Plan de Implementación

**Proyecto:** SIRE Auto-Submission & Conversational Data Capture
**Fecha Inicio:** Diciembre 4, 2025
**Estado:** 📋 Planificación
**Carpeta Docs:** `docs/sire-auto-submission/`

---

## 🎯 OVERVIEW

### Objetivo Principal
Implementar el **core del proyecto MUVA Chat**: captura automática de los 13 campos SIRE (Migración Colombia) mediante chat conversacional + upload de documentos, con envío automático al sistema oficial SIRE para compliance de turismo colombiano.

### ¿Por qué?
- **Razón de existencia del proyecto**: Este es el problema original que motivó la creación de MUVA Chat
- **Compliance obligatorio**: Todos los hoteles en Colombia DEBEN reportar huéspedes extranjeros a Migración
- **Problema actual**: Proceso manual, tedioso, propenso a errores (formatos incorrectos, códigos equivocados)
- **Oportunidad**: Automatizar 100% del flujo - desde conversación con huésped hasta envío a SIRE

### Alcance MVP
- ✅ Captura conversacional de 13 campos vía chat en lenguaje natural
- ✅ Upload de documentos (pasaporte, visa) con OCR/Vision API para extracción automática
- ✅ Validación completa según reglas oficiales SIRE (códigos, formatos, rangos)
- ✅ Generación de archivos TXT con formato oficial SIRE (para upload manual o automático)
- ✅ Dashboard de monitoreo para staff (status, re-envíos, exportación TXT)
- ⏸️ **Postponed a FASE FUTURA**: Puppeteer automation para upload automático de TXT al portal SIRE
- ⚠️ **Proof of Concept**: Validación con 1-3 hoteles piloto antes de escalar

---

## 📊 ESTADO ACTUAL

### Sistema Existente ✅

**Endpoint `/my-stay` (Funcionando al 100%)**
- Autenticación de huéspedes: check-in date + phone last 4 digits
- Chat interface multi-conversación (`GuestChatInterface.tsx`)
- File upload capability (imágenes/documentos con vision analysis)
- Session management JWT (7-day expiry)
- Multi-tenancy (subdomain-based isolation)

**Infraestructura SIRE (87.5% test coverage)**
- Database: 9 campos SIRE en tabla `guest_reservations`
- Libraries:
  - `src/lib/sire/sire-catalogs.ts` - 250 códigos país + 1,122 ciudades colombianas
  - `src/lib/sire/field-mappers.ts` - Conversational ↔ SIRE mapping
  - `src/lib/sire/sire-automation.ts` - Puppeteer (PLACEHOLDER - selectors provisionales)
- Compliance components:
  - `ComplianceReminder.tsx` - Progress bar 6 campos
  - `ComplianceConfirmation.tsx` - Modal form
  - `ComplianceSuccess.tsx` - Confirmación
- API Endpoints:
  - `POST /api/compliance/submit` - **MOCK MODE** (guarda a DB, no envía a SIRE)
  - `GET /api/sire/guest-data` - Retrieval de datos
  - `GET /api/sire/monthly-export` - Exportación TXT

### Limitaciones Actuales ❌

**Captura de Datos**
- ❌ Chat NO está optimizado para captura de 13 campos (prompts genéricos)
- ❌ NO hay flujo conversacional guiado (progressive disclosure)
- ❌ NO hay extracción automática de documentos (upload existe pero sin OCR)
- ❌ Validación básica (6 campos tracked, faltan 7)

**Envío SIRE**
- ❌ Sistema en MOCK mode (genera referencias falsas `MOCK-SIRE-{timestamp}`)
- ❌ `sire-automation.ts` tiene selectors PLACEHOLDER (no funciona con SIRE real)
- ❌ NO hay gestión de credenciales SIRE por tenant
- ❌ NO hay queue system ni retry logic
- ❌ NO hay captura de confirmation numbers reales

**Monitoreo**
- ❌ NO hay dashboard de admin para ver status de envíos
- ❌ NO hay re-envío manual para fallos
- ❌ NO hay métricas de completeness por hotel
- ❌ NO hay audit trail completo

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia del Huésped

**Escenario Ideal (5-8 minutos total)**

1. **Guest ingresa a `/my-stay`** → Se autentica (check-in + phone)
2. **Claude inicia conversación natural:**
   - "¡Hola! Para completar tu registro de entrada a Colombia, necesito algunos datos. ¿Tienes tu pasaporte a mano?"
3. **Guest opción A - Foto del pasaporte:**
   - Sube foto → OCR extrae 8 campos automáticamente
   - Claude confirma: "Perfecto, veo que eres ciudadano estadounidense, nacido el 25/03/1985..."
4. **Guest opción B - Chat conversacional:**
   - Claude pregunta progresivamente: nombre completo, pasaporte, nacionalidad, fecha nacimiento
   - Validación en tiempo real (formatos, códigos)
5. **Claude completa campos restantes:**
   - Origen/destino (inferido de conversación o pregunta)
   - Tipo documento (detectado: pasaporte)
   - Fecha movimiento (check-in date)
6. **Confirmación visual:**
   - Progress bar 100%
   - "✅ Registro completo - Tu información será enviada automáticamente a Migración Colombia"
7. **Sistema envía a SIRE:**
   - Background job (inmediato o scheduled)
   - Guest recibe confirmación con número de referencia oficial
   - Staff recibe notificación si hay error

### Características Clave

**Conversational Intelligence**
- Progressive disclosure (no abrumar con 13 preguntas a la vez)
- Context-aware (colombianos vs extranjeros para origen/destino)
- Multi-idioma (español, inglés)
- Entity extraction mejorada (nombres, fechas, países en lenguaje natural)

**Document Processing**
- Upload drag & drop
- OCR con Claude Vision API
- Confidence scoring (auto-fill si >90%, manual review si <90%)
- Preview con campos extraídos resaltados

**Auto-Submission**
- Real-time o batch (configurable por tenant)
- Retry logic (3 intentos con exponential backoff)
- Confirmation number capture
- Screenshot/audit trail
- Webhook notifications

**Staff Dashboard**
- View all guests: pending, submitted, confirmed, failed
- Re-submit failed entries
- Export TXT for manual upload (fallback)
- Metrics: % completeness, submission rate, error rate

---

## 📱 TECHNICAL STACK

### Frontend
- **Next.js 15** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** (styling)
- **Shadcn/ui** (components)
- **Claude AI SDK** (chat + vision)

### Backend
- **Next.js API Routes** (serverless functions)
- **Supabase** (PostgreSQL + RLS)
- **Puppeteer** (SIRE automation)
- **Bull** or **Inngest** (job queue - TBD)

### Infrastructure
- **Vercel** (Next.js hosting)
- **Supabase** (database - rama dev/tst/prd)
- **VPS** (Puppeteer runtime - staging/production)
- **GitHub Actions** (CI/CD)

### AI/ML
- **Claude 3.5 Sonnet** (conversational extraction)
- **Claude Vision API** (OCR de documentos)
- **Matryoshka Embeddings** (semantic search - ya implementado)

---

## 🔧 DESARROLLO - FASES

### FASE 1: Enhanced Conversational Capture (8h)

**Objetivo:** Optimizar el flujo de chat para captura de 13 campos SIRE mediante conversación natural y progresiva.

**Entregables:**
- System prompt especializado para captura SIRE
- Progressive disclosure logic (preguntar campos según contexto)
- Real-time validation con feedback visual
- Progress indicator detallado (13/13 campos)
- Entity extraction mejorada para nombres compuestos, fechas en español, países en lenguaje natural

**Archivos a crear:**
- `src/lib/sire/conversational-prompts.ts` - System prompts + question templates
- `src/lib/sire/progressive-disclosure.ts` - Logic para determinar próximo campo a preguntar
- `src/components/Compliance/SireProgressBar.tsx` - Progress indicator 13 campos

**Archivos a modificar:**
- `src/components/Chat/GuestChatInterface.tsx` - Integrar SIRE conversational mode
- `src/lib/compliance-chat-engine.ts` - Mejorar entity extraction
- `src/app/api/guest/chat/route.ts` - Agregar SIRE-specific system prompt

**Testing:**
- Unit tests: `progressive-disclosure.test.ts`
- Integration tests: `sire-chat-flow.test.ts`
- Manual: Captura conversacional de 3 guest profiles (USA, Colombia, España)
- Performance: Chat latency <500ms

**Success Criteria:**
- ✅ Claude hace máximo 5 preguntas para capturar 13 campos (progressive)
- ✅ Validación en tiempo real (códigos, formatos)
- ✅ Progress bar actualiza correctamente
- ✅ Entity extraction funciona en español e inglés

---

### FASE 2: Document Upload + OCR Extraction (10h)

**Objetivo:** Implementar upload de documentos (pasaporte, visa) con extracción automática de campos via Claude Vision API.

**Entregables:**
- Drag & drop upload component
- Claude Vision API integration
- Field extraction from passport/visa images
- Confidence scoring + manual review UI
- Preview modal con campos extraídos resaltados

**Archivos a crear:**
- `src/components/Compliance/DocumentUpload.tsx` - Drag & drop component
- `src/lib/sire/document-ocr.ts` - Claude Vision API calls
- `src/lib/sire/field-extraction.ts` - Parse OCR results → SIRE campos
- `src/components/Compliance/DocumentPreview.tsx` - Preview + extracted fields UI
- `src/app/api/sire/extract-document/route.ts` - OCR API endpoint

**Archivos a modificar:**
- `src/components/Chat/GuestChatInterface.tsx` - Agregar document upload flow
- `src/lib/guest-chat-types.ts` - Agregar DocumentExtractionResult type

**Database Migration:**
```sql
-- migrations/20251204_add_document_uploads.sql
CREATE TABLE sire_document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id VARCHAR NOT NULL,
  document_type VARCHAR(20) NOT NULL, -- 'passport', 'visa', 'cedula'
  file_url TEXT NOT NULL,
  ocr_result JSONB, -- Raw OCR response
  extracted_fields JSONB, -- Mapped to SIRE campos
  confidence_score NUMERIC(3,2), -- 0.00-1.00
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'extracted', 'validated', 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sire_document_uploads_reservation ON sire_document_uploads(reservation_id);
CREATE INDEX idx_sire_document_uploads_status ON sire_document_uploads(status);
```

**Testing:**
- Unit tests: `field-extraction.test.ts`
- Integration tests: `document-ocr.test.ts`
- Manual: Upload 5 sample passports (different countries)
- Performance: OCR latency <3s per document

**Success Criteria:**
- ✅ Upload drag & drop funciona (max 10MB)
- ✅ Claude Vision extrae 8+ campos correctamente (>85% accuracy)
- ✅ Confidence score >0.90 auto-fill, <0.90 manual review
- ✅ Preview modal muestra campos extraídos con highlighting

---

### FASE 3: TXT File Generation (7h)

**Objetivo:** Implementar generador de archivos TXT con formato oficial SIRE para exportación manual o automática.

**Contexto Importante:**
- SIRE NO tiene API moderna - sistema legacy del gobierno colombiano
- Upload se hace mediante archivo TXT con formato específico (delimitado por tabs)
- Un archivo TXT puede contener múltiples huéspedes (1 línea = 1 huésped)
- Formato: `codigo_hotel\tcodigo_ciudad\ttipo_doc\tnumero_id\tcodigo_nacionalidad\tprimer_apellido\tsegundo_apellido\tnombres\ttipo_movimiento\tfecha_movimiento\tlugar_procedencia\tlugar_destino\tfecha_nacimiento`

**Entregables:**
- Generador de TXT con formato oficial SIRE
- Validación pre-generación (13 campos completos)
- API endpoint para exportación TXT
- Tracking de exports en base de datos
- UI para download manual del TXT

**Archivos a crear:**
- `src/lib/sire/sire-txt-generator.ts` - Generador de archivo TXT
- `src/app/api/sire/export-txt/route.ts` - API endpoint para exportar TXT
- `src/lib/sire/sire-validation.ts` - Validación pre-exportación
- `src/components/Admin/SireTxtExport.tsx` - UI para download TXT

**Database Migration:**
```sql
-- migrations/20251204_add_sire_exports.sql
CREATE TABLE sire_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL,
  export_date DATE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  guest_count INTEGER NOT NULL,
  reservation_ids UUID[] NOT NULL,
  status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'downloaded', 'uploaded'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sire_exports_tenant ON sire_exports(tenant_id);
CREATE INDEX idx_sire_exports_date ON sire_exports(export_date DESC);
```

**Testing:**
- Unit tests: TXT format validation (delimiters, field order)
- Integration: Generate TXT con 10 guests, verificar formato
- Manual: Download TXT y verificar apertura en Excel/editor
- Compliance: Validar contra spec oficial SIRE

**Success Criteria:**
- ✅ TXT generado con formato correcto (tabs, sin headers)
- ✅ Validación rechaza guests con campos incompletos
- ✅ Códigos SIRE correctos (NO códigos ISO)
- ✅ Fechas en formato DD/MM/YYYY
- ✅ Staff puede download TXT para upload manual al portal

---

### FASE 4: Submission Workflow & Queue (8h)

**Objetivo:** Implementar sistema de queue para envíos automáticos con retry logic, scheduling, y triggers configurables.

**Entregables:**
- Job queue system (Bull o Inngest)
- Trigger configurables: realtime, scheduled (diario/semanal), manual
- Retry logic con exponential backoff
- Dead-letter queue para errores permanentes
- Webhook notifications

**Archivos a crear:**
- `src/lib/queue/sire-submission-queue.ts` - Queue configuration
- `src/lib/queue/sire-submission-worker.ts` - Worker que ejecuta submissions
- `src/app/api/sire/queue/add/route.ts` - API para agregar job a queue
- `src/app/api/sire/queue/status/[jobId]/route.ts` - API para check status
- `src/lib/webhooks/sire-notifications.ts` - Webhook sender

**Database Migration:**
```sql
-- migrations/20251204_add_submission_queue.sql
CREATE TABLE sire_submission_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES guest_reservations(id) ON DELETE CASCADE,
  tenant_id VARCHAR NOT NULL,
  priority INTEGER DEFAULT 5, -- 1-10, 1=highest
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'dead_letter'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_log JSONB,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sire_queue_status_scheduled ON sire_submission_queue(status, scheduled_at);
CREATE INDEX idx_sire_queue_tenant ON sire_submission_queue(tenant_id);
```

**Testing:**
- Unit tests: `sire-submission-queue.test.ts`
- Integration: Agregar 10 jobs, verificar procesamiento en orden
- Retry logic: Simular fallo, verificar 3 reintentos
- Dead-letter: Verificar job va a dead-letter después de max retries

**Success Criteria:**
- ✅ Queue procesa jobs en orden de prioridad
- ✅ Retry logic funciona (exponential backoff: 1min, 5min, 15min)
- ✅ Dead-letter queue captura errores permanentes
- ✅ Webhook notifications enviadas a staff

---

### FASE 5: Staff Admin Dashboard (10h)

**Objetivo:** Crear dashboard para staff que muestre status de envíos SIRE, permita re-envíos, y exporte TXT para fallback manual.

**Entregables:**
- Lista de guests con status SIRE (pending, submitted, confirmed, failed)
- Filtros: fecha, status, tenant
- Acciones: re-submit, view details, export TXT
- Metrics dashboard: % completeness, submission rate, error rate
- Manual TXT export (formato oficial SIRE)

**Archivos a crear:**
- `src/app/admin/sire/page.tsx` - Dashboard principal
- `src/components/Admin/SireGuestList.tsx` - Lista de guests
- `src/components/Admin/SireMetrics.tsx` - Metrics cards
- `src/components/Admin/SireFilters.tsx` - Filtros
- `src/app/api/sire/admin/guests/route.ts` - API lista guests
- `src/app/api/sire/admin/metrics/route.ts` - API metrics
- `src/app/api/sire/admin/resubmit/route.ts` - API re-envío
- `src/app/api/sire/admin/export-txt/route.ts` - API exportación TXT

**Archivos a modificar:**
- Ninguno (nueva sección admin)

**Database Views:**
```sql
-- migrations/20251204_add_sire_admin_views.sql
CREATE OR REPLACE VIEW v_sire_admin_dashboard AS
SELECT
  gr.id AS reservation_id,
  gr.guest_name,
  gr.document_type,
  gr.document_number,
  gr.check_in_date,
  gr.tenant_id,
  ssl.status AS submission_status,
  ssl.confirmation_number,
  ssl.submitted_at,
  ssl.error_message,
  ssl.retry_count,
  CASE
    WHEN gr.document_type IS NOT NULL
      AND gr.document_number IS NOT NULL
      AND gr.birth_date IS NOT NULL
      AND gr.first_surname IS NOT NULL
      AND gr.given_names IS NOT NULL
      AND gr.nationality_code IS NOT NULL
    THEN 100
    ELSE 0
  END AS completeness_percentage
FROM guest_reservations gr
LEFT JOIN sire_submission_logs ssl ON gr.id = ssl.reservation_id
WHERE gr.status = 'active'
ORDER BY gr.check_in_date DESC;

CREATE OR REPLACE VIEW v_sire_metrics AS
SELECT
  tenant_id,
  COUNT(*) AS total_guests,
  COUNT(CASE WHEN completeness_percentage = 100 THEN 1 END) AS complete_guests,
  COUNT(CASE WHEN submission_status = 'confirmed' THEN 1 END) AS submitted_guests,
  COUNT(CASE WHEN submission_status = 'failed' THEN 1 END) AS failed_guests,
  ROUND(100.0 * COUNT(CASE WHEN completeness_percentage = 100 THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS completeness_rate,
  ROUND(100.0 * COUNT(CASE WHEN submission_status = 'confirmed' THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS submission_rate
FROM v_sire_admin_dashboard
GROUP BY tenant_id;
```

**Testing:**
- Manual: Verificar dashboard con 20 guests en diferentes statuses
- Filtros: Verificar filtrado por fecha, status, tenant
- Re-submit: Verificar re-envío de guest fallido
- Export TXT: Verificar formato oficial SIRE

**Success Criteria:**
- ✅ Dashboard carga <1s con 100+ guests
- ✅ Filtros funcionan correctamente
- ✅ Re-submit exitoso (agrega job a queue)
- ✅ Export TXT formato correcto (validar con spec SIRE)
- ✅ Metrics actualizadas en tiempo real

---

### FASE 6: Testing & Documentation (6h)

**Objetivo:** Testing end-to-end completo, documentación de usuario/técnica, y preparación para pilot.

**Entregables:**
- E2E tests (guest flow + staff flow)
- User documentation (guest + staff)
- Technical documentation (architecture, API, database)
- Pilot checklist
- Rollout plan

**Archivos a crear:**
- `tests/e2e/sire-guest-flow.spec.ts` - Playwright E2E guest
- `tests/e2e/sire-admin-flow.spec.ts` - Playwright E2E admin
- `docs/sire-auto-submission/USER_GUIDE.md` - Guía para guests
- `docs/sire-auto-submission/STAFF_GUIDE.md` - Guía para staff
- `docs/sire-auto-submission/ARCHITECTURE.md` - Architecture diagram
- `docs/sire-auto-submission/API_REFERENCE.md` - API docs
- `docs/sire-auto-submission/PILOT_CHECKLIST.md` - Checklist pilot
- `docs/sire-auto-submission/ROLLOUT_PLAN.md` - Plan de rollout

**Testing:**
- E2E: Guest completa 13 campos via chat → auto-submit → confirmation
- E2E: Guest sube pasaporte → OCR → auto-submit → confirmation
- E2E: Staff ve dashboard → re-submit failed guest → export TXT
- Performance: Load test con 50 concurrent guests
- Security: Penetration testing de credential management

**Success Criteria:**
- ✅ E2E tests pasan 100%
- ✅ Documentation completa (guest, staff, technical)
- ✅ Pilot checklist validado con 1 hotel
- ✅ Performance: <500ms chat, <3s OCR, <10s submission

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Guest puede completar 13 campos via chat conversacional (<5 minutos)
- [ ] Guest puede subir pasaporte y OCR extrae campos automáticamente (>85% accuracy)
- [ ] Sistema envía automáticamente a SIRE y captura confirmation number
- [ ] Staff puede ver dashboard con status de todos los guests
- [ ] Staff puede re-enviar guests fallidos
- [ ] Staff puede exportar TXT para envío manual (fallback)

### Performance
- [ ] Chat latency <500ms
- [ ] OCR latency <3s per document
- [ ] SIRE submission <10s
- [ ] Dashboard load <1s con 100+ guests

### Calidad
- [ ] 90%+ test coverage (unit + integration)
- [ ] E2E tests cubren guest flow + admin flow
- [ ] Zero regression en features existentes
- [ ] Documentation completa (user + technical)

### Security
- [ ] SIRE credentials encrypted at rest
- [ ] PII handling compliant (GDPR/Colombian regulations)
- [ ] Audit trail completo (screenshots, logs)
- [ ] RLS policies para multi-tenancy

### Business
- [ ] 1-3 hoteles pilot exitosos (>80% auto-submission rate)
- [ ] Reducción 90%+ en tiempo de captura manual
- [ ] Zero errores de formato/códigos incorrectos
- [ ] Staff satisfaction >8/10

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal - 30h)
**Responsabilidad:** APIs, business logic, TXT generation, queue system

**Tareas:**
- FASE 1: Enhanced conversational capture (API routes, entity extraction)
- FASE 2: Document OCR endpoints, field extraction logic
- FASE 3: TXT file generation (SIRE official format)
- FASE 4: Queue system implementation (Bull/Inngest)
- FASE 5: Admin API endpoints (guests list, metrics, re-submit, export)
- FASE 6: E2E testing, API documentation

**Archivos:**
- `src/lib/sire/conversational-prompts.ts`
- `src/lib/sire/progressive-disclosure.ts`
- `src/lib/sire/document-ocr.ts`
- `src/lib/sire/field-extraction.ts`
- `src/lib/sire/sire-txt-generator.ts` (FASE 3)
- `src/lib/sire/sire-validation.ts` (FASE 3)
- `src/lib/queue/sire-submission-queue.ts`
- `src/lib/queue/sire-submission-worker.ts`
- `src/app/api/guest/chat/route.ts` (update)
- `src/app/api/sire/extract-document/route.ts`
- `src/app/api/sire/export-txt/route.ts` (FASE 3)
- `src/app/api/sire/queue/**/*`
- `src/app/api/sire/admin/**/*`

---

### 2. **@agent-ux-interface** (Secundario - 20h)
**Responsabilidad:** UI components, chat interface, admin dashboard

**Tareas:**
- FASE 1: SIRE progress bar component
- FASE 2: Document upload component, preview modal
- FASE 3: TXT export button/component
- FASE 5: Admin dashboard, guest list, metrics cards, filters

**Archivos:**
- `src/components/Compliance/SireProgressBar.tsx`
- `src/components/Compliance/DocumentUpload.tsx`
- `src/components/Compliance/DocumentPreview.tsx`
- `src/components/Admin/SireTxtExport.tsx` (FASE 3)
- `src/components/Chat/GuestChatInterface.tsx` (update)
- `src/app/admin/sire/page.tsx`
- `src/components/Admin/SireGuestList.tsx`
- `src/components/Admin/SireMetrics.tsx`
- `src/components/Admin/SireFilters.tsx`

---

### 3. **@agent-database-agent** (Soporte - 4h)
**Responsabilidad:** Database migrations, views, RLS policies

**Tareas:**
- FASE 2: Migration para `sire_document_uploads`
- FASE 3: Migration para `sire_exports` (tracking de archivos TXT generados)
- FASE 4: Migration para `sire_submission_queue`
- FASE 5: Views para admin dashboard

**Archivos:**
- `migrations/20251218_add_document_uploads.sql`
- `migrations/20251218_add_sire_exports.sql`
- `migrations/20251218_add_submission_queue.sql`
- `migrations/20251218_add_sire_admin_views.sql`

---

### 4. **@agent-deploy-agent** (Soporte - 1h)
**Responsabilidad:** Deployment testing

**Tareas:**
- FASE 6: Deploy pilot a TST, luego PRD
- FASE FUTURA: Setup Puppeteer runtime en VPS (si se implementa automation)

**Archivos:**
- Ninguno (infrastructure setup)

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── lib/
│   │   ├── sire/
│   │   │   ├── conversational-prompts.ts     [FASE 1] NEW
│   │   │   ├── progressive-disclosure.ts     [FASE 1] NEW
│   │   │   ├── document-ocr.ts               [FASE 2] NEW
│   │   │   ├── field-extraction.ts           [FASE 2] NEW
│   │   │   ├── sire-txt-generator.ts         [FASE 3] NEW
│   │   │   ├── sire-validation.ts            [FASE 3] NEW
│   │   │   ├── sire-catalogs.ts              [EXISTS]
│   │   │   └── field-mappers.ts              [EXISTS]
│   │   ├── queue/
│   │   │   ├── sire-submission-queue.ts      [FASE 4] NEW
│   │   │   └── sire-submission-worker.ts     [FASE 4] NEW
│   │   └── webhooks/
│   │       └── sire-notifications.ts         [FASE 4] NEW
│   ├── components/
│   │   ├── Compliance/
│   │   │   ├── SireProgressBar.tsx           [FASE 1] NEW
│   │   │   ├── DocumentUpload.tsx            [FASE 2] NEW
│   │   │   ├── DocumentPreview.tsx           [FASE 2] NEW
│   │   │   ├── ComplianceReminder.tsx        [EXISTS]
│   │   │   ├── ComplianceConfirmation.tsx    [EXISTS]
│   │   │   └── ComplianceSuccess.tsx         [EXISTS]
│   │   ├── Chat/
│   │   │   └── GuestChatInterface.tsx        [UPDATE]
│   │   └── Admin/
│   │       ├── SireTxtExport.tsx             [FASE 3] NEW
│   │       ├── SireGuestList.tsx             [FASE 5] NEW
│   │       ├── SireMetrics.tsx               [FASE 5] NEW
│   │       └── SireFilters.tsx               [FASE 5] NEW
│   └── app/
│       ├── api/
│       │   ├── guest/
│       │   │   └── chat/route.ts             [UPDATE]
│       │   └── sire/
│       │       ├── extract-document/route.ts [FASE 2] NEW
│       │       ├── export-txt/route.ts       [FASE 3] NEW
│       │       ├── queue/
│       │       │   ├── add/route.ts          [FASE 4] NEW
│       │       │   └── status/[jobId]/route.ts [FASE 4] NEW
│       │       └── admin/
│       │           ├── guests/route.ts       [FASE 5] NEW
│       │           ├── metrics/route.ts      [FASE 5] NEW
│       │           ├── resubmit/route.ts     [FASE 5] NEW
│       │           └── export-txt/route.ts   [FASE 5] NEW
│       └── admin/
│           └── sire/page.tsx                 [FASE 5] NEW
├── migrations/
│   ├── 20251218_add_document_uploads.sql     [FASE 2] NEW
│   ├── 20251218_add_sire_exports.sql         [FASE 3] NEW
│   ├── 20251218_add_submission_queue.sql     [FASE 4] NEW
│   └── 20251218_add_sire_admin_views.sql     [FASE 5] NEW
├── tests/
│   ├── unit/
│   │   ├── progressive-disclosure.test.ts    [FASE 1] NEW
│   │   ├── field-extraction.test.ts          [FASE 2] NEW
│   │   ├── sire-txt-generator.test.ts        [FASE 3] NEW
│   │   ├── sire-validation.test.ts           [FASE 3] NEW
│   │   └── sire-submission-queue.test.ts     [FASE 4] NEW
│   ├── integration/
│   │   ├── sire-chat-flow.test.ts            [FASE 1] NEW
│   │   └── document-ocr.test.ts              [FASE 2] NEW
│   └── e2e/
│       ├── sire-guest-flow.spec.ts           [FASE 6] NEW
│       └── sire-admin-flow.spec.ts           [FASE 6] NEW
└── docs/
    └── sire-auto-submission/
        ├── fase-1/
        ├── fase-2/
        ├── fase-3/
        ├── fase-4/
        ├── fase-5/
        ├── fase-6/
        ├── USER_GUIDE.md                      [FASE 6] NEW
        ├── STAFF_GUIDE.md                     [FASE 6] NEW
        ├── ARCHITECTURE.md                    [FASE 6] NEW
        ├── API_REFERENCE.md                   [FASE 6] NEW
        ├── PILOT_CHECKLIST.md                 [FASE 6] NEW
        ├── ROLLOUT_PLAN.md                    [FASE 6] NEW
        └── SIRE_PORTAL_GUIDE.md               [FASE 3] NEW
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**SIRE Codes vs ISO (CRÍTICO)**
- ⚠️ **NUNCA usar códigos ISO 3166-1** - SIRE usa códigos propios
- USA: SIRE 249 (NOT ISO 840)
- Colombia: SIRE 169 (NOT ISO 170)
- Usar `sire-catalogs.ts` (oficial) NO `sire-country-mapping.ts` (deprecated)
- Error = 100% rechazo del TXT file

**Date Format (CRÍTICO)**
- ⚠️ **SIEMPRE DD/MM/YYYY** (European format)
- X NUNCA yyyy-mm-dd (ISO 8601)
- X NUNCA mm/dd/yyyy (US format)
- Usar `formatDateToSIRE()` de `sire-catalogs.ts`

**Document Type Codes (Válidos oficiales)**
- 3 = Pasaporte (95% casos)
- 5 = Cédula de Extranjería (3% casos)
- 46 = Carné Diplomático (<1% casos)
- 10 = Documento Extranjero Mercosur/CAN (1% casos)

**Geographic Fields (3 diferentes - NO confundir)**
- `nationality_code` (Campo 5): País de CIUDADANÍA (pasaporte)
- `origin_city_code` (Campo 11): Ciudad/país de PROCEDENCIA antes del hotel
- `destination_city_code` (Campo 12): Ciudad/país de DESTINO después del hotel
- Estos son INDEPENDIENTES (ej: ciudadano USA, procedencia Bogotá, destino Cartagena)

**TXT File Format (CRÍTICO)**
- Delimitador: TAB (`\t`) entre campos
- Sin headers (primera línea = primer huésped)
- Un archivo puede tener múltiples huéspedes (1 línea = 1 guest)
- Encoding: UTF-8 sin BOM
- Line endings: Windows CRLF (`\r\n`) recomendado

**Queue System**
- Considerar Bull (Redis-based) o Inngest (serverless)
- Bull: Más control, requiere Redis en VPS
- Inngest: Más simple, serverless-friendly
- Decisión en FASE 4 según infrastructure availability

**Multi-Tenancy**
- SIRE credentials por tenant (tabla `tenant_registry`)
- RLS policies en todas las tablas nuevas
- Isolation completo (tenant A no ve datos de tenant B)

**Security**
- Credentials SIRE encrypted at rest (use crypto.encrypt)
- PII handling (GDPR compliance)
- Audit trail completo (screenshots, logs, timestamps)
- Rate limiting en OCR endpoint (max 10 requests/min)

**Performance Targets**
- Chat latency: <500ms
- OCR latency: <3s per document
- SIRE submission: <10s
- Dashboard load: <1s con 100+ guests

**Upload Manual al Portal SIRE**
- Staff descarga TXT generado desde admin dashboard
- Staff se loguea manualmente al portal SIRE
- Staff sube archivo TXT mediante interfaz web del portal
- Portal SIRE procesa archivo y devuelve confirmation number

---

## 🔮 FASE FUTURA (OPCIONAL): Puppeteer File Upload Automation

**Estado:** Postponed - Implementar DESPUÉS de validar que captura + TXT generation funcionan correctamente

**Objetivo:** Automatizar el upload de archivos TXT al portal SIRE mediante Puppeteer (navegación web automatizada).

**Por qué postponer:**
- Primero validar que el flujo manual funciona (captura → TXT → upload manual)
- Evitar complejidad innecesaria en MVP
- Puppeteer requiere infraestructura adicional (VPS con Chrome headless)
- Portal SIRE puede cambiar (selectors se rompen)

**Scope cuando se implemente:**
- Login automatizado al portal SIRE con credenciales por tenant
- Navegación al formulario de upload
- Upload del archivo TXT generado
- Captura de confirmation number
- Screenshot para audit trail
- Error handling robusto (portal caído, credenciales incorrectas)

**Archivos a crear (futuro):**
- `src/lib/sire/sire-automation.ts` - Puppeteer automation
- `src/lib/sire/sire-credentials.ts` - Credential encryption
- `scripts/sire/test-submission.ts` - Script de testing manual
- `docs/sire-auto-submission/SIRE_PORTAL_GUIDE.md` - Documentación de selectors

**Infraestructura requerida:**
- VPS con Chrome headless (NO ejecutar en Vercel - timeouts)
- Redis para job queue (Bull)
- Retry logic con exponential backoff
- Dead-letter queue para errores permanentes

**Consideraciones:**
- Portal SIRE es sistema legacy gubernamental (puede ser inestable)
- Selectors pueden cambiar sin previo aviso
- Captchas pueden aparecer (requerir intervención manual)
- Rate limiting del portal desconocido

**Decisión:** Implementar solo cuando el flujo manual esté validado con 3+ hoteles en producción.

---

---

## 📊 RESUMEN EJECUTIVO

**Fases Activas:** 6 fases (FASE 1-6)
**Total Tareas:** 39 tareas
**Duración Estimada:** 49 horas
**Estado:** Listo para desarrollo

**Alcance MVP:**
- ✅ Captura conversacional de 13 campos SIRE (FASE 1)
- ✅ OCR de documentos con Claude Vision (FASE 2)
- ✅ Generación de archivos TXT formato oficial SIRE (FASE 3)
- ✅ Queue system con retry logic (FASE 4)
- ✅ Admin dashboard completo (FASE 5)
- ✅ Testing E2E y documentación (FASE 6)

**Fase Futura (Postponed):**
- Puppeteer automation para upload de TXT al portal SIRE
- Se implementará DESPUÉS de validar MVP con 3+ hoteles en producción
- Estimación: 7 tareas adicionales, 12h

**Desglose por Agente:**
- @agent-backend-developer: 24 tareas (30h)
- @agent-ux-interface: 9 tareas (20h)
- @agent-database-agent: 4 tareas (4h)
- @agent-deploy-agent: 2 tareas (1h)

---

**Última actualización:** Diciembre 18, 2025
**Próximo paso:** Ejecutar FASE 1 - Enhanced Conversational Capture
