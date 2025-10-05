# PROMPTS EJECUTABLES - Guest Portal Multi-Conversation + Compliance

**Proyecto:** Guest Portal Multi-Conversation Architecture with Integrated Compliance
**Referencias:**
- `plan.md` (1720 líneas) - Plan completo
- `TODO.md` (205 líneas) - Tareas organizadas
- `_assets/sire/pasos-para-reportar-al-sire.md` - 13 campos SIRE oficiales

---

## 🎯 CONTEXTO GENERAL (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Guest Portal Multi-Conversation + Compliance Module

Proyecto: Transformar Guest Chat single-conversation en multi-conversation moderna (estilo Claude AI) con compliance integrado (SIRE + TRA).

ARCHIVOS CLAVE:
- plan.md → Plan completo (1720 líneas, 7 fases + FASE 0.5 corrección SIRE)
- TODO.md → Tareas organizadas (205 líneas, limpio)
- guest-portal-compliance-workflow.md → Este archivo (prompts ejecutables)

OBJETIVO:
1. Sidebar multi-conversaciones (como Staff Chat)
2. Compliance conversacional SIRE + TRA (13 campos oficiales)
3. Subdomain architecture (simmerdown.innpilot.io)
4. Confirmación pre-submit
5. Staff notifications

STACK:
- Frontend: Next.js 15.5.3, React, Tailwind CSS
- Backend: Node.js 20.x, Supabase PostgreSQL + pgvector
- AI: Anthropic Claude (conversational-chat-engine.ts)
- Embeddings: OpenAI text-embedding-3-large (Matryoshka Tier 1+2)
- Compliance: Puppeteer (SIRE), REST API (TRA MinCIT)
- Infrastructure: Nginx, Let's Encrypt SSL, VPS Hostinger

ESTADO ACTUAL:
- ✅ FASE 0: Planning completada
- ✅ FASE 1: Subdomain Infrastructure COMPLETADA
- ✅ FASE 0.5: Corrección Campos SIRE COMPLETADA
- 🔜 FASE 2: Multi-Conversation Foundation (PRÓXIMA)
- 🔜 FASE 3: Compliance Module Integration
- 🔜 FASE 4-7: Notifications, Testing, SEO, Docs

DECISIÓN CRÍTICA DESCUBIERTA:
❌ Campos compliance originales eran dummy (pasaporte, país, propósito_viaje)
✅ Campos SIRE REALES: 13 campos obligatorios oficiales
✅ Solución: Estructura de DOS CAPAS (conversational_data + sire_data)

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## ✅ FASE 0.5: CORRECCIÓN CAMPOS SIRE (COMPLETADA)

**Estado:** Todos los prompts 0.5.1-0.5.4 han sido ejecutados exitosamente.

**Entregables:**
- ✅ `AUDITORIA_FASES_1_2.md` (354 líneas)
- ✅ `docs/sire/CODIGOS_OFICIALES.md` (657 líneas)
- ✅ `src/lib/sire/field-mappers.ts` (551 líneas, 9 funciones)
- ✅ `UI_COMPLIANCE_REDESIGN_SPEC.md` (752 líneas)
- ✅ `CORRECCION_CAMPOS_SIRE_REPORT.md` (738 líneas)
- ✅ plan.md FASE 3.1, 3.4 actualizados
- ✅ guest-portal-compliance-workflow.md Prompt 3.1, 3.4 corregidos

**Próximo:** FASE 2.1 - Database Migrations

---

### Prompt 0.5.1: Auditoría y Catálogos SIRE ✅

**AGENTE:** @agent-backend-developer
**ESTADO:** COMPLETADO



```
TAREA: Auditar FASE 1+2 y crear catálogo SIRE oficial

CONTEXTO:
- Se descubrió error: campos compliance definidos son dummy
- Documento oficial: `_assets/sire/pasos-para-reportar-al-sire.md`
- 13 campos SIRE obligatorios documentados

ESPECIFICACIONES:

1. Auditoría FASE 1 (30min):
   - Leer: `docs/deployment/nginx-subdomain.conf`
   - Leer: `docs/deployment/SUBDOMAIN_SETUP_GUIDE.md`
   - Leer: `src/middleware.ts` (líneas 68-136)
   - Leer: `src/lib/tenant-resolver.ts` (líneas 39-92)
   - Verificar: NO hay referencias a campos compliance
   - Documentar en: `AUDITORIA_FASES_1_2.md`

2. Auditoría FASE 2.2 (30min):
   - Leer: `src/app/api/guest/conversations/route.ts`
   - Leer: `src/app/api/guest/conversations/[id]/route.ts`
   - Leer: `src/app/api/guest/chat/history/route.ts`
   - Verificar: NO hay `compliance_data` con estructura incorrecta
   - Documentar en: `AUDITORIA_FASES_1_2.md` (completar)

3. Crear catálogo SIRE (30min):
   - Archivo: `docs/sire/CODIGOS_OFICIALES.md`
   - Contenido:
     - 4 tipos documento (3=Pasaporte, 5=Cédula, 46=Diplomático, 10=Extranjero)
     - Placeholder códigos nacionalidad (TODO investigar MinCIT)
     - Placeholder códigos ciudad (TODO investigar SCH)
     - Formatos validación 13 campos SIRE
     - Errores comunes (5 tipos documentados en pasos-para-reportar-al-sire.md)

ENTREGABLES:
- `AUDITORIA_FASES_1_2.md` (hallazgos)
- `docs/sire/CODIGOS_OFICIALES.md` (catálogo oficial)

TESTING:
- Auditoría completa sin referencias dummy
- Catálogo SIRE listo para usar como referencia

SIGUIENTE: Prompt 0.5.2 para correcciones plan.md y workflow.md
```

---

### Prompt 0.5.2: Corrección Plan y Workflow Backend ✅

**AGENTE:** @agent-backend-developer
**ESTADO:** COMPLETADO

**COPY-PASTE:**

```
TAREA: Corregir plan.md FASE 3 y workflow Prompt 3.1 con campos SIRE reales

CONTEXTO:
- Auditoría completada ✅ (Prompt 0.5.1)
- Catálogo SIRE creado ✅ (docs/sire/CODIGOS_OFICIALES.md)
- Ahora: Actualizar especificaciones con estructura correcta

ESPECIFICACIONES:

1. Actualizar plan.md FASE 3.1 (1h):
   - Archivo: `plan.md` líneas ~666-682
   - Cambiar interface ComplianceContext:
     ```typescript
     // DOS CAPAS (conversational + SIRE oficial)
     interface ComplianceContext {
       conversational_data: {
         nombre_completo: string
         numero_pasaporte: string
         pais_texto: string
         proposito_viaje: string
       }
       sire_data: {
         // 13 campos oficiales SIRE
         codigo_hotel: string
         codigo_ciudad: string
         tipo_documento: '3'|'5'|'46'|'10'
         numero_identificacion: string
         codigo_nacionalidad: string
         primer_apellido: string
         segundo_apellido: string
         nombre_extranjero: string
         tipo_movimiento: 'E'|'S'
         fecha_movimiento: string  // DD/MM/YYYY
         lugar_procedencia: string
         lugar_destino: string
         fecha_nacimiento: string  // DD/MM/YYYY
       }
     }
     ```
   - Actualizar entity extraction patterns
   - Actualizar validaciones SIRE oficiales

2. Actualizar guest-portal-compliance-workflow.md Prompt 3.1 (1.5h):
   - Líneas 1093-1111: Reescribir ComplianceContext
   - Línea 1113: REQUIRED_FIELDS → dos listas (conversational + SIRE)
   - Líneas 1161-1197: Reescribir extractComplianceEntities()
     - Extraer a ambas capas
     - splitFullName() → primer_apellido, segundo_apellido, nombre
     - mapCountryToCode() → pais_texto a codigo_nacionalidad
   - Líneas 1199-1218: Reescribir generateConfirmationMessage()
     - Mostrar datos conversational (user-friendly)
     - Indicar campos SIRE auto-generados
   - Líneas 1230-1254: Reescribir validateComplianceData()
     - Validar 13 campos SIRE según especificaciones oficiales

3. Crear field-mappers.ts (1h):
   - Archivo: `src/lib/sire/field-mappers.ts`
   - Funciones:
     - splitFullName(nombre_completo) → {primer_apellido, segundo_apellido, nombre_extranjero}
     - mapCountryToCode(pais_texto) → codigo_nacionalidad
     - detectDocumentType(numero_pasaporte) → tipo_documento
     - formatDateForSIRE(date) → DD/MM/YYYY
     - validateSIREDateFormat(date) → boolean
     - validateOnlyLetters(text) → boolean
     - validateOnlyNumbers(text) → boolean

4. Corregir migration SQL comentario (15min):
   - Archivo: `supabase/migrations/20251005010100_add_compliance_submissions.sql`
   - Línea 91: Actualizar COMMENT:
     ```sql
     COMMENT ON COLUMN compliance_submissions.data IS 'JSONB con estructura: { conversational_data: {...}, sire_data: { 13 campos oficiales SIRE según docs/sire/CODIGOS_OFICIALES.md } }';
     ```

ENTREGABLES:
- `plan.md` FASE 3.1 corregido
- `guest-portal-compliance-workflow.md` Prompt 3.1 corregido
- `src/lib/sire/field-mappers.ts` creado
- Migration SQL comentario actualizado

TESTING:
- Coherencia plan.md ↔ workflow.md
- Todos mencionan "13 campos SIRE oficiales"
- NO hay referencias a campos dummy

SIGUIENTE: Prompt 0.5.3 para corrección UI specs
```

---

### Prompt 0.5.3: Corrección UI Specs Compliance ✅

**AGENTE:** @agent-ux-interface
**ESTADO:** COMPLETADO

**COPY-PASTE:**

```
TAREA: Corregir workflow Prompt 3.4 con diseño UI de dos capas

CONTEXTO:
- Backend corregido ✅ (Prompt 0.5.2)
- Estructura DOS CAPAS definida (conversational_data + sire_data)
- Ahora: Actualizar specs UI para reflejar nueva estructura

ESPECIFICACIONES:

1. Actualizar guest-portal-compliance-workflow.md Prompt 3.4 (1h):
   - Buscar sección "Prompt 3.4: Compliance UI Components"
   - Actualizar specs ComplianceConfirmation.tsx:

   ```typescript
   interface ComplianceConfirmationProps {
     conversationalData: {
       nombre_completo: string
       numero_pasaporte: string
       pais_texto: string
       proposito_viaje: string
     }
     sireData: {
       // 13 campos SIRE oficiales (auto-generated)
       codigo_hotel: string
       codigo_ciudad: string
       tipo_documento: string
       // ... resto de campos
     }
     onConfirm: () => void
     onEdit: () => void
     onCancel: () => void
   }
   ```

   - Layout componente:
     1. **Sección editable** (conversational_data):
        - Nombre completo ✏️
        - Número pasaporte ✏️
        - País ✏️ (dropdown)
        - Propósito viaje ✏️

     2. **Sección colapsable** "Ver detalles SIRE generados":
        - Read-only (NO editable)
        - Mostrar 13 campos SIRE
        - Badge "auto" en campos generados
        - Highlight mapping: nombre_completo → primer_apellido, segundo_apellido, nombre_extranjero

     3. **Botones:**
        - ✅ "Confirmar y Enviar a SIRE"
        - ✏️ "Editar datos"
        - ❌ "Cancelar"

   - Validaciones UI:
     - Pasaporte: Formato [A-Z]{2}[0-9]{6,9}
     - Nombre completo: Solo letras (sin números)
     - Fecha nacimiento: Selector DD/MM/YYYY
     - País: Dropdown (no texto libre)

2. Actualizar plan.md FASE 3.4 (30min):
   - Líneas ~800-870: Actualizar descripción UI components
   - Incluir diseño de dos capas

3. Crear UI_COMPLIANCE_REDESIGN_SPEC.md (30min):
   - Wireframes/descripción ComplianceConfirmation
   - Validaciones UI listadas
   - Ejemplos visuales (ASCII art o descripción)

ENTREGABLES:
- `guest-portal-compliance-workflow.md` Prompt 3.4 corregido
- `plan.md` FASE 3.4 actualizado
- `UI_COMPLIANCE_REDESIGN_SPEC.md` creado

TESTING:
- Specs UI claras
- Diseño de dos capas documentado
- UX conversacional (NO pedir códigos numéricos al usuario)

SIGUIENTE: Prompt 0.5.4 para generar reporte final
```

---

### Prompt 0.5.4: Reporte Final Corrección SIRE ✅

**AGENTE:** @agent-backend-developer + @agent-ux-interface
**ESTADO:** COMPLETADO

**COPY-PASTE:**

```
TAREA: Generar reporte final de corrección campos SIRE

CONTEXTO:
- Auditoría completada ✅
- Backend corregido ✅
- UI specs corregidas ✅
- Ahora: Documentar TODO lo realizado

ESPECIFICACIONES:

Crear `CORRECCION_CAMPOS_SIRE_REPORT.md` (30min):

## Secciones requeridas:

1. **Resumen Ejecutivo**
   - Problema descubierto (campos dummy vs SIRE oficiales)
   - Impacto (40%+ error rate en producción evitado)
   - Solución implementada (dos capas)

2. **Archivos Auditados**
   - FASE 1: 4 archivos (hallazgos)
   - FASE 2.2: 3 archivos (hallazgos)

3. **Archivos Creados**
   - docs/sire/CODIGOS_OFICIALES.md
   - src/lib/sire/field-mappers.ts
   - AUDITORIA_FASES_1_2.md
   - UI_COMPLIANCE_REDESIGN_SPEC.md

4. **Archivos Modificados**
   - plan.md (FASE 3.1, 3.4)
   - guest-portal-compliance-workflow.md (Prompt 3.1, 3.4)
   - supabase/migrations/.../compliance_submissions.sql (comentario)

5. **Estructura Correcta**
   - Diagram/código mostrando dos capas
   - conversational_data → sire_data mapping

6. **TODOs Pendientes**
   - Catálogo códigos nacionalidad (MinCIT)
   - Catálogo códigos ciudad Colombia (SCH)
   - Catálogo lugares procedencia/destino

7. **Próximos Pasos**
   - FASE 2: Multi-Conversation Foundation
   - FASE 3: Compliance (ya con campos correctos)

ENTREGABLES:
- `CORRECCION_CAMPOS_SIRE_REPORT.md` completo

TESTING:
- Reporte completo y accionable
- Diff de cambios principales incluido
- Timeline próximos pasos claro

FINALIZACIÓN: FASE 0.5 completada ✅
```

---

## 📋 FASE 2: MULTI-CONVERSATION FOUNDATION

### Prompt 2.1: Database Migrations

**AGENTE:** @agent-database-agent

**COPY-PASTE:**

```
TAREA: Crear migrations para guest_conversations y compliance

CONTEXTO:
- Ver plan.md FASE 2.1 para especificaciones completas
- 4 migrations a crear

ESPECIFICACIONES:

1. `supabase/migrations/20251005010000_add_guest_conversations.sql`
   - CREATE TABLE guest_conversations
   - RLS policies (guests own conversations)
   - Indexes (guest_id, tenant_id)

2. `supabase/migrations/20251005010100_add_compliance_submissions.sql`
   - Ya existe, verificar está correcto
   - Comentario JSONB debe mencionar dos capas

3. `supabase/migrations/20251005010200_add_tenant_compliance_credentials.sql`
   - Ya existe, verificar está correcto

4. `supabase/migrations/20251005010300_add_conversation_attachments.sql`
   - CREATE TABLE conversation_attachments
   - For multi-modal file upload

5. `supabase/migrations/20251005010400_add_conversation_intelligence.sql`
   - ALTER guest_conversations add: message_count, compressed_history, favorites, is_archived

ENTREGABLES:
- Migrations creadas/verificadas
- RLS policies correctas
- Comentarios SQL descriptivos

TESTING:
- `npx supabase migration show` → migrations visibles
- Apply locally sin errores

SIGUIENTE: Prompt 2.2 para Backend APIs
```

---

### Prompt 2.2: Backend API - Conversations CRUD

**AGENTE:** @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Crear endpoints CRUD para guest_conversations

CONTEXTO:
- Migrations aplicadas ✅ (Prompt 2.1)
- Patrón: Similar a Staff Chat conversations

ESPECIFICACIONES:

1. POST/GET `/api/guest/conversations` (route.ts):
   - POST: Crear nueva conversación
   - GET: Listar conversaciones del guest
   - Authentication: JWT guest token
   - RLS enforcement

2. PUT/DELETE `/api/guest/conversations/[id]` ([id]/route.ts):
   - PUT: Actualizar título
   - DELETE: Eliminar conversación (CASCADE messages)

3. Modificar `/api/guest/chat/history/route.ts`:
   - Agregar query param: conversation_id
   - Load messages by conversation

ARCHIVOS:
- Crear: `src/app/api/guest/conversations/route.ts`
- Crear: `src/app/api/guest/conversations/[id]/route.ts`
- Modificar: `src/app/api/guest/chat/history/route.ts`

TESTING:
- curl POST → 201 Created
- curl GET → 200 OK con array
- curl PUT → title updates
- curl DELETE → conversation deleted
- RLS: No cross-guest access

SIGUIENTE: Prompt 2.3 para UI components
```

---

### Prompt 2.3: UI Components - Sidebar Multi-Conversation

**AGENTE:** @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Crear ConversationList y refactor GuestChatInterface con sidebar

CONTEXTO:
- APIs creadas ✅ (Prompt 2.2)
- Referencia: `src/components/Staff/ConversationList.tsx`
- Copiar patrón UI del Staff Chat

ESPECIFICACIONES:

1. Crear `ConversationList.tsx`:
   - "Nueva conversación" button
   - Lista conversations
   - Active highlight
   - Timestamps relativos
   - Empty state
   - Mobile responsive (drawer)

2. Refactor `GuestChatInterface.tsx`:
   - Layout: Sidebar (300px desktop) + Chat area
   - Load conversations on mount
   - "Nueva conversación" functionality
   - Conversation switching
   - **MANTENER entity tracking ✅**
   - **MANTENER follow-up suggestions ✅**

ARCHIVOS:
- Crear: `src/components/Chat/ConversationList.tsx`
- Modificar: `src/components/Chat/GuestChatInterface.tsx`

TESTING:
- Sidebar visible
- Create/switch/delete conversations funciona
- Entity tracking funciona
- Follow-ups funcionan
- Mobile responsive

SIGUIENTE: Prompt 2.5 para Multi-Modal file upload
```

---

### Prompt 2.5: Multi-Modal File Upload

**AGENTE:** @agent-backend-developer + @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Implementar subida archivos + Claude Vision API

CONTEXTO:
- Ver plan.md FASE 2.5 para specs completas
- PoC: Photo location recognition + Passport OCR

ESPECIFICACIONES:

1. Supabase Storage setup (30min):
   - Bucket: 'guest-attachments'
   - Max 10MB
   - Formats: image/*, application/pdf
   - RLS policies

2. Claude Vision API (1h):
   - Crear: `src/lib/claude-vision.ts`
   - Function: analyzeImage(imageUrl, prompt)
   - Use cases: Location recognition, Passport OCR

3. Backend API (1h):
   - POST `/api/guest/conversations/[id]/attachments`
   - Upload → Supabase Storage
   - Call Claude Vision if image
   - Extract passport data if document

4. UI (1.5h):
   - Paperclip button
   - File input (hidden)
   - Image preview modal
   - Vision analysis display
   - Loading states

ARCHIVOS:
- Crear: `src/lib/claude-vision.ts`
- Crear: `src/app/api/guest/conversations/[id]/attachments/route.ts`
- Modificar: `src/components/Chat/GuestChatInterface.tsx`

TESTING:
- Upload foto → Vision analysis funciona
- Upload passport → OCR extrae datos
- File stored en Supabase Storage

SIGUIENTE: Prompt 2.6 para Conversation Intelligence
```

---

### Prompt 2.6: Conversation Intelligence

**AGENTE:** @agent-backend-developer + @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Implementar compactación, favoritos, topic suggestions

CONTEXTO:
- Ver plan.md FASE 2.6 para specs completas
- Gestión inteligente de memoria

ESPECIFICACIONES:

1. Crear `guest-conversation-memory.ts` (2h):
   - compactConversationIfNeeded() - umbral 20 mensajes
   - addToFavorites() - places/activities
   - suggestNewConversation() - topic detection

2. Auto-trigger compactación (30min):
   - En POST /api/guest/chat
   - Update message_count

3. UI topic suggestions (1h):
   - Banner: "💡 ¿Crear conversación sobre {tema}?"
   - Buttons: "Sí, crear" | "No, continuar"

4. Cron jobs (1.5h):
   - Auto-archive conversations (30 días)
   - Auto-delete archived (90 días)

ARCHIVOS:
- Crear: `src/lib/guest-conversation-memory.ts`
- Crear: `src/lib/cron/archive-conversations.ts`
- Modificar: `src/app/api/guest/chat/route.ts`
- Modificar: `src/components/Chat/GuestChatInterface.tsx`

TESTING:
- 50 messages → 2 bloques compactados
- Topic mention 2x → suggestion appears
- Cron jobs funcionan

SIGUIENTE: FASE 3 - Compliance Module (usar Prompts 3.1-3.4 CORREGIDOS)
```

---

## 🔒 FASE 3: COMPLIANCE MODULE

### Prompt 3.1: Compliance Chat Engine (CORREGIDO)

**AGENTE:** @agent-backend-developer

**NOTA:** Este prompt ya debe estar CORREGIDO por Prompt 0.5.2 con campos SIRE reales y estructura de dos capas.

---

### Prompt 3.4: Compliance UI Components (CORREGIDO)

**AGENTE:** @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Crear componentes UI para confirmación compliance con arquitectura de dos capas

CONTEXTO:
- Backend implementado con estructura DOS CAPAS (conversational_data + sire_data)
- UX conversacional (NO pedir códigos numéricos al usuario)
- Confirmación pre-submit con edición inline

ESPECIFICACIONES:

## 1. ComplianceConfirmation.tsx - Interface de Dos Capas

### Props Interface:

```typescript
interface ComplianceConfirmationProps {
  // Capa 1: Datos conversacionales (editables por usuario)
  conversationalData: {
    nombre_completo: string          // "Juan Pérez García"
    numero_pasaporte: string         // "AB123456"
    pais_texto: string              // "Colombia"
    proposito_viaje: string         // "Turismo y vacaciones"
  }

  // Capa 2: Datos SIRE oficiales (auto-generados, read-only)
  sireData: {
    // Hotel/Location (auto desde tenant config)
    codigo_hotel: string             // "1234"
    codigo_ciudad: string            // "11001" (Bogotá)
    nombre_hotel: string             // "Simmerdown House"

    // Documento (auto desde conversational)
    tipo_documento: string           // "3" (Pasaporte)
    numero_identificacion: string    // "AB123456"
    fecha_expedicion_documento: string // "01/01/2020"

    // Identidad (auto desde nombre_completo)
    primer_apellido: string          // "Pérez"
    segundo_apellido: string         // "García"
    nombre_extranjero: string        // "Juan"

    // Nacionalidad (auto desde pais_texto)
    codigo_nacionalidad: string      // "840" (USA)
    codigo_pais: string              // "840" (mismo)

    // Fechas/Movimiento
    fecha_nacimiento: string         // "15/05/1990"
    tipo_movimiento: string          // "E" (Entrada)
    fecha_movimiento: string         // "15/12/2024" (check-in)

    // Lugares (auto desde tenant config)
    lugar_procedencia: string        // "11001"
    lugar_destino: string            // "11001"
    codigo_ciudad_residencia: string // "11001"

    // Ocupación (default)
    codigo_ocupacion: string         // "9999" (No especificado)
  }

  onConfirm: () => Promise<void>
  onEdit: (field: keyof ConversationalData, value: string) => void
  onCancel: () => void
  isLoading?: boolean
}
```

### Layout del Componente (3 secciones):

**SECCIÓN 1: Datos Conversacionales (EDITABLE) ✏️**

```tsx
<div className="space-y-4 p-6 bg-white rounded-lg border-2 border-blue-200">
  <h2 className="text-xl font-semibold text-gray-900">
    📝 Confirma tus datos
  </h2>

  {/* Campo nombre_completo */}
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Nombre completo ✏️
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={conversationalData.nombre_completo}
        onChange={(e) => onEdit('nombre_completo', e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        placeholder="Juan Pérez García"
      />
      <button className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
        Editar
      </button>
    </div>
    {/* Validation error */}
    <p className="text-xs text-gray-500">
      Solo letras, espacios y guiones
    </p>
  </div>

  {/* Campo numero_pasaporte */}
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Número de pasaporte ✏️
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={conversationalData.numero_pasaporte}
        onChange={(e) => onEdit('numero_pasaporte', e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        placeholder="AB123456789"
        pattern="[A-Z]{2}[0-9]{6,9}"
      />
      <button className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
        Editar
      </button>
    </div>
    <p className="text-xs text-gray-500">
      Formato: 2 letras + 6-9 dígitos (ej: US123456789)
    </p>
  </div>

  {/* Campo pais_texto (dropdown) */}
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      País de origen ✏️
    </label>
    <div className="flex gap-2">
      <select
        value={conversationalData.pais_texto}
        onChange={(e) => onEdit('pais_texto', e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="Estados Unidos">Estados Unidos</option>
        <option value="Colombia">Colombia</option>
        <option value="España">España</option>
        {/* ... más países */}
      </select>
      <button className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
        Editar
      </button>
    </div>
  </div>

  {/* Campo proposito_viaje */}
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">
      Propósito del viaje ✏️
    </label>
    <div className="flex gap-2">
      <textarea
        value={conversationalData.proposito_viaje}
        onChange={(e) => onEdit('proposito_viaje', e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        placeholder="Turismo y vacaciones"
        rows={2}
        maxLength={200}
      />
      <button className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
        Editar
      </button>
    </div>
    <p className="text-xs text-gray-500">
      Máximo 200 caracteres
    </p>
  </div>
</div>
```

**SECCIÓN 2: Datos SIRE Generados (READ-ONLY, COLAPSABLE) 🔒**

```tsx
<div className="mt-6 space-y-4">
  {/* Collapse trigger */}
  <button
    onClick={() => setShowSireDetails(!showSireDetails)}
    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
  >
    <span className="text-sm font-medium text-gray-700">
      {showSireDetails ? '▼' : '▶'} Ver detalles técnicos SIRE (generados automáticamente)
    </span>
    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
      13 campos oficiales
    </span>
  </button>

  {/* Collapse content */}
  {showSireDetails && (
    <div className="p-6 bg-gray-50 rounded-lg space-y-3 border-l-4 border-blue-500">
      <p className="text-xs text-gray-600 mb-4">
        ℹ️ Estos datos se generan automáticamente basados en tu información conversacional.
        No son editables directamente.
      </p>

      {/* Grupo: Identidad */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Identidad</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Primer apellido</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.primer_apellido}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Segundo apellido</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.segundo_apellido || '(vacío)'}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Nombre</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.nombre_extranjero}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grupo: Documento */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Documento</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Tipo documento</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`${sireData.tipo_documento} (Pasaporte)`}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Número documento</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.numero_identificacion}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grupo: Nacionalidad */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Nacionalidad</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Código país</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`${sireData.codigo_pais} (${conversationalData.pais_texto})`}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grupo: Hotel/Ubicación */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Hotel/Ubicación</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Código hotel</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.codigo_hotel}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Nombre hotel</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.nombre_hotel}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Código ciudad</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.codigo_ciudad}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grupo: Fechas */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase">Fechas</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Fecha expedición doc</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.fecha_expedicion_documento}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Fecha nacimiento</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sireData.fecha_nacimiento}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600">Código ocupación</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={`${sireData.codigo_ocupacion} (No especificado)`}
                disabled
                className="w-full px-2 py-1 text-sm bg-white border border-gray-200 rounded"
              />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                auto 🤖
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-xs text-blue-800">
          💡 <strong>Mapeo automático:</strong> Si corriges tu nombre completo arriba,
          los apellidos y nombre se actualizarán automáticamente aquí.
        </p>
      </div>
    </div>
  )}
</div>
```

**SECCIÓN 3: Botones de Acción**

```tsx
<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
  <button
    onClick={onCancel}
    disabled={isLoading}
    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
  >
    ❌ Cancelar
  </button>

  <button
    onClick={() => setShowSireDetails(false)}
    disabled={isLoading}
    className="px-6 py-3 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition"
  >
    ✏️ Editar datos
  </button>

  <button
    onClick={onConfirm}
    disabled={isLoading}
    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50"
  >
    {isLoading ? (
      <>
        <span className="inline-block animate-spin mr-2">⏳</span>
        Enviando a SIRE...
      </>
    ) : (
      '✅ Confirmar y Enviar a SIRE'
    )}
  </button>
</div>
```

### Validaciones Cliente (UI)

**1. nombre_completo:**
- Regex: `/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/`
- Error: "El nombre solo puede contener letras, espacios, guiones y apóstrofes"
- Min: 3 caracteres
- Max: 100 caracteres

**2. numero_pasaporte:**
- Regex: `/^[A-Z]{2}[0-9]{6,9}$/`
- Error: "Formato inválido. Usa 2 letras mayúsculas + 6-9 dígitos (ej: US123456789)"
- Auto-uppercase input

**3. pais_texto:**
- Dropdown (NO texto libre)
- Lista desde `src/lib/sire/sire-country-mapping.ts`
- Required

**4. proposito_viaje:**
- Texto libre
- Max: 200 caracteres
- NO validación de formato (es contexto adicional, no campo SIRE)

**5. fecha_nacimiento (en sireData, read-only):**
- Formato: DD/MM/YYYY
- Validación backend: Mayor de 18 años
- Si inválida: mostrar error en conversational layer

### Mapeo Visual (Hover Effects)

Cuando usuario hace hover sobre campo conversacional, highlight campos SIRE relacionados:

```tsx
// Hover sobre nombre_completo → highlight
onMouseEnter={() => highlightSireFields(['primer_apellido', 'segundo_apellido', 'nombre_extranjero'])}

// Hover sobre numero_pasaporte → highlight
onMouseEnter={() => highlightSireFields(['tipo_documento', 'numero_identificacion'])}

// Hover sobre pais_texto → highlight
onMouseEnter={() => highlightSireFields(['codigo_pais', 'codigo_nacionalidad'])}
```

Estilo highlight:
```tsx
className={`${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''} ...`}
```

### Estados del Componente

```typescript
type ConfirmationStep =
  | 'review'        // Revisar datos (default)
  | 'edit'          // Editar campo específico
  | 'confirming'    // Enviando a SIRE (loading)
  | 'success'       // Éxito → ComplianceSuccess.tsx
  | 'error'         // Error → mostrar mensaje + retry
```

## 2. ComplianceReminder.tsx (sin cambios)

Mantener diseño original (banner suave, dismissible).

## 3. ComplianceSuccess.tsx (sin cambios)

Mantener diseño original (confetti, reference numbers).

---

ARCHIVOS A CREAR:
- `src/components/Compliance/ComplianceConfirmation.tsx` (~250 líneas)
- `src/components/Compliance/EditableField.tsx` (~50 líneas) - Componente reutilizable
- `src/components/Compliance/SireDataCollapse.tsx` (~150 líneas) - Componente colapsable

ARCHIVOS A MODIFICAR:
- Ninguno (componentes nuevos)

TESTING:
- [ ] Modal confirmación renderiza correctamente
- [ ] Datos conversacionales son editables
- [ ] Validaciones cliente funcionan (regex pasaporte, nombre)
- [ ] Collapse SIRE data expande/colapsa
- [ ] Badges "auto 🤖" visibles
- [ ] Hover mapping funciona (highlight campos relacionados)
- [ ] Botones deshabilitados durante loading
- [ ] Mobile responsive (stacked layout)
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] ARIA labels para screenreaders

SIGUIENTE: Integrar con backend API /api/compliance/submit
```

---

## 📝 NOTAS IMPORTANTES

### Sintaxis de Invocación de Agentes

**CORRECTO:**
- `@agent-backend-developer`
- `@agent-ux-interface`
- `@agent-database-agent`
- `@agent-api-endpoints-mapper`

**INCORRECTO:**
- `@backend-developer` ❌
- `@ux-interface` ❌
- `@database-agent` ❌

### Workflow de Trabajo

1. **Nueva conversación** → Usar "CONTEXTO GENERAL" primero
2. **Ejecutar prompt** → Copy-paste completo del prompt específico
3. **Invocar agente** → Usar sintaxis correcta `@agent-nombre`
4. **Verificar completitud** → Marcar task en TODO.md
5. **Siguiente prompt** → Seguir orden secuencial

### Archivos de Referencia

- `plan.md` - Especificaciones técnicas completas
- `TODO.md` - Estado de tareas (limpio, solo pendientes)
- `_assets/sire/pasos-para-reportar-al-sire.md` - 13 campos SIRE oficiales

---

**Última actualización:** 5 de Octubre 2025 23:30
**Total prompts:** 12 ejecutables (4 completados FASE 0.5)
**Próximo:** Prompt 2.1 - Database Migrations
