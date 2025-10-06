# PROMPTS EJECUTABLES - Guest Portal Multi-Conversation + Compliance

**Proyecto:** Guest Portal Multi-Conversation Architecture with Integrated Compliance
**Referencias:**
- `plan.md` (1963 líneas) - Plan completo con FASE 3.5 + 3.6
- `TODO.md` (342 líneas) - 95 tareas organizadas
- `guest-portal-compliance-workflow.md` - Este archivo (15 prompts ejecutables)
- `_assets/sire/pasos-para-reportar-al-sire.md` - 13 campos SIRE oficiales

---

## 🎯 CONTEXTO GENERAL (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Guest Portal Multi-Conversation + Compliance Module

⚠️ BLOCKER CRÍTICO: FASE 2.4 Database Migration (4.5-5.5h) - PRÓXIMA PRIORIDAD

Proyecto: Transformar Guest Chat single-conversation en multi-conversation moderna (estilo Claude AI) con compliance integrado (SIRE + TRA).

ARCHIVOS CLAVE:
- side-todo.md → Investigación BLOCKER crítico (1,150 líneas)
- plan.md → Plan completo (1,963 líneas, 7 fases + FASE 2.4)
- TODO.md → Tareas organizadas (342 líneas, 68 tareas activas)
- guest-portal-compliance-workflow.md → Este archivo (prompts ejecutables)

BLOCKER CRÍTICO (Oct 5, 2025):
Sistema tiene DOS tablas de conversaciones activas simultáneamente:
- chat_conversations (legacy): 5 conv, 64 mensajes
- guest_conversations (nuevo): 2 conv, 0 mensajes
- PROBLEMA: Mensajes se guardan en legacy, conversaciones nuevas vacías
- FIX APLICADO: src/app/api/guest/chat/route.ts:122
- PLAN: FASE 2.4 (6 subtareas) - Ver Prompts 2.4.1-2.4.6 abajo

OBJETIVO:
1. ⚠️ PRIMERO: Migrar sistema dual a guest_conversations (FASE 2.4)
2. Sidebar multi-conversaciones (como Staff Chat)
3. Compliance conversacional SIRE + TRA (13 campos oficiales)
4. Subdomain architecture (simmerdown.innpilot.io)
5. Confirmación pre-submit con DOS CAPAS (conversational + SIRE)
6. Staff notifications

STACK:
- Frontend: Next.js 15.5.3, React, Tailwind CSS
- Backend: Node.js 20.x, Supabase PostgreSQL + pgvector
- AI: Anthropic Claude (conversational-chat-engine.ts)
- Embeddings: OpenAI text-embedding-3-large (Matryoshka Tier 1+2)
- Compliance: Puppeteer (SIRE), REST API (TRA MinCIT)
- Infrastructure: Nginx, Let's Encrypt SSL, VPS Hostinger

ESTADO ACTUAL (Oct 5, 2025):
- ✅ FASE 0: Planning completada
- ✅ FASE 0.5: Corrección Campos SIRE COMPLETADA (8 tareas)
- ✅ FASE 1: Subdomain Infrastructure COMPLETADA
- ✅ FASE 2.1-2.3: Multi-Conversation Foundation COMPLETADA
- ⚠️ FASE 2.4: Database Migration (BLOCKER - 6 tareas, 4.5-5.5h)
- ✅ FASE 2.5-2.6: Multi-Modal + Intelligence COMPLETADA
- ✅ FASE 3.1: Compliance Chat Engine COMPLETADO (685 líneas)
- ✅ FASE 3.4: Compliance UI Components COMPLETADO (1,099 líneas)
- ✅ FASE 3.6: Auditoría TODO.md COMPLETADA (~2,950 líneas)
- ⏳ FASE 3.5: Integration End-to-End (BLOQUEADO por 2.4)
- 🔜 FASE 3.2-3.3: SIRE/TRA Real Integration (opcional)
- 🔜 FASE 4-7: Notifications, Testing, SEO, Docs

ARQUITECTURA DOS CAPAS VALIDADA ✅:
- Capa 1 (Conversational): 4 campos user-friendly
  - nombre_completo, numero_pasaporte, pais_texto, proposito_viaje
- Capa 2 (SIRE): 13 campos oficiales auto-generados
  - codigo_hotel, codigo_ciudad, tipo_documento, numero_identificacion,
    codigo_nacionalidad, primer_apellido, segundo_apellido, nombres,
    tipo_movimiento, fecha_movimiento, lugar_procedencia, lugar_destino,
    fecha_nacimiento
- ✅ 13/13 campos SIRE validados en Database, Backend, UI
- ✅ CERO campos dummy como campos SIRE oficiales

PROGRESO:
- Total tareas: 110 (68 activas + 42 completadas)
- Completadas: 42/110 (38.2%)
- Próxima: FASE 2.4.1 - Verificación del Fix (Prompt 2.4.1 abajo)

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

SIGUIENTE: Prompt 2.4 para Database Migration ⚠️ CRÍTICA
```

---

### Prompt 2.4.1: Verificación del Fix - Sistema Dual de Conversaciones ⚠️

**AGENTE:** @agent-backend-developer

**⚠️ BLOCKER CRÍTICO:** Sistema tiene DOS tablas de conversaciones activas simultáneamente

**COPY-PASTE:**

```
TAREA: Verificar que el fix aplicado en src/app/api/guest/chat/route.ts:122 funciona correctamente

⚠️ CONTEXTO CRÍTICO:
- Sistema LEGACY: chat_conversations (5 conv, 64 msg)
- Sistema NUEVO: guest_conversations (2 conv, 0 msg)
- PROBLEMA: Mensajes se guardan en legacy, conversaciones nuevas vacías
- FIX APLICADO: session.guest_id → session.reservation_id (Oct 5, 2025)

ESPECIFICACIONES:

1. Iniciar dev server:
   - cd /Users/oneill/Sites/apps/InnPilot
   - ./scripts/dev-with-keys.sh
   - Verificar servidor corriendo en http://localhost:3000

2. Login como guest:
   - URL: http://localhost:3000/guest-chat/simmerdown
   - Ingresar check-in date (cualquier fecha futura)
   - Ingresar phone last 4 (ej: 1234)
   - Click "Acceder"

3. Crear nueva conversación:
   - Click botón "Nueva conversación" en sidebar
   - Título: "Test Fix Oct 5"
   - Verificar conversación creada

4. Enviar mensaje de prueba:
   - En chat area, escribir: "Hola, probando fix"
   - Presionar Enter
   - **CRÍTICO:** Verificar NO hay error 404
   - **CRÍTICO:** Mensaje debe aparecer en conversación

5. Verificar en logs del servidor:
   - Buscar en terminal: [Guest Chat] Using conversation: {uuid} (validated ownership)
   - Buscar: [Guest Chat] ✅ Request completed in XXXms
   - NO debe haber: Error 404 o "Conversation not found"

6. Verificar en base de datos (Supabase Dashboard):
```sql
SELECT cm.conversation_id, cm.content, cm.created_at, gc.title
FROM chat_messages cm
JOIN guest_conversations gc ON cm.conversation_id = gc.id
WHERE gc.title = 'Test Fix Oct 5'
ORDER BY cm.created_at DESC;
-- Expected: 1 row con "Hola, probando fix"
```

CRITERIOS DE ÉXITO:
✅ Mensaje se guarda en guest_conversations (NO en chat_conversations)
✅ NO hay error 404 en logs
✅ Mensaje visible al cambiar de conversación y volver
✅ Query DB retorna 1 row

ARCHIVOS:
- `src/app/api/guest/chat/route.ts` (línea 122 - fix aplicado)
- `src/lib/guest-auth.ts` (interface GuestSession)

REFERENCIAS:
- Investigación completa: side-todo.md (líneas 260-278)
- Plan técnico: plan.md FASE 2.4.1 (líneas 659-690)
- Tareas detalladas: TODO.md FASE 2.4.1 (líneas 150-176)

SIGUIENTE: Si test PASA → Prompt 2.4.2 para migración datos
         Si test FALLA → Reportar error, revisar fix
```

---

### Prompt 2.4.2: Migración de Datos Legacy → Nuevo Sistema

**AGENTE:** @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Migrar conversaciones y mensajes de chat_conversations a guest_conversations

⚠️ ADVERTENCIA: Hacer backup antes de ejecutar

CONTEXTO:
- Verificación 2.4.1 PASSED ✅
- Sistema legacy tiene 5 conversaciones, 64 mensajes
- Sistema nuevo tiene 2 conversaciones, 0 mensajes
- Objetivo: Migrar TODOS los datos a nuevo sistema

ESPECIFICACIONES:

1. Crear script de migración (45min):
   - Archivo: scripts/migrate-chat-conversations.ts
   - Código:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateChatConversations() {
  console.log('🔄 Iniciando migración de chat_conversations → guest_conversations...')

  // 1. Obtener todas las conversaciones legacy
  const { data: legacyConversations, error: fetchError } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_type', 'guest')

  if (fetchError) {
    console.error('❌ Error al obtener conversaciones legacy:', fetchError)
    return
  }

  console.log(`📊 Encontradas ${legacyConversations.length} conversaciones legacy`)

  // 2. Migrar cada conversación
  for (const legacy of legacyConversations) {
    // Contar mensajes
    const { count: messageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', legacy.id)

    console.log(`📝 Migrando conversación ${legacy.id} (${messageCount} mensajes)...`)

    // Crear en nuevo sistema
    const { data: newConversation, error: insertError } = await supabase
      .from('guest_conversations')
      .insert({
        guest_id: legacy.reservation_id,
        tenant_id: legacy.tenant_id,
        title: `Conversación migrada desde ${new Date(legacy.created_at).toLocaleDateString('es-CO')}`,
        message_count: messageCount || 0,
        created_at: legacy.created_at,
        updated_at: legacy.updated_at,
        last_activity_at: legacy.updated_at
      })
      .select()
      .single()

    if (insertError) {
      console.error(`❌ Error al migrar conversación ${legacy.id}:`, insertError)
      continue
    }

    console.log(`✅ Creada conversación ${newConversation.id}`)

    // Actualizar mensajes para apuntar a nueva conversación
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ conversation_id: newConversation.id })
      .eq('conversation_id', legacy.id)

    if (updateError) {
      console.error(`❌ Error al actualizar mensajes:`, updateError)
      continue
    }

    console.log(`✅ Migrados ${messageCount} mensajes`)

    // Marcar legacy como migrada
    await supabase
      .from('chat_conversations')
      .update({ status: 'migrated', updated_at: new Date().toISOString() })
      .eq('id', legacy.id)
  }

  console.log('🎉 Migración completada')
}

migrateChatConversations().catch(console.error)
```

2. Hacer backup DB (15min):
```bash
pg_dump -h ooaumjzaztmutltifhoq.supabase.co \
  -U postgres \
  -t chat_conversations \
  -t guest_conversations \
  -t chat_messages \
  > backup_guest_chat_$(date +%Y%m%d).sql
```

3. Ejecutar migración (15min):
```bash
NEXT_PUBLIC_SUPABASE_URL="https://ooaumjzaztmutltifhoq.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." \
npx tsx scripts/migrate-chat-conversations.ts
```

CRITERIOS DE ÉXITO:
✅ Script output: "🎉 Migración completada"
✅ 5 conversaciones migradas
✅ 64 mensajes migrados
✅ Query verificación (ver abajo) retorna 64+

TESTING (SQL en Supabase Dashboard):
```sql
-- Conversaciones migradas
SELECT COUNT(*) FROM guest_conversations
WHERE title LIKE 'Conversación migrada%';
-- Expected: 5

-- Mensajes en nuevo sistema
SELECT COUNT(*) FROM chat_messages cm
JOIN guest_conversations gc ON cm.conversation_id = gc.id;
-- Expected: 64+

-- Mensajes en legacy (debe ser 0)
SELECT COUNT(*) FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id;
-- Expected: 0
```

ARCHIVOS:
- Crear: scripts/migrate-chat-conversations.ts
- Crear: backup_guest_chat_YYYYMMDD.sql

REFERENCIAS:
- Plan técnico: plan.md FASE 2.4.2 (líneas 693-767)
- Código ejemplo: side-todo.md (líneas 505-587)

SIGUIENTE: Prompt 2.4.3 para Foreign Keys
```

---

### Prompt 2.4.3: Actualizar Foreign Keys

**AGENTE:** @agent-database-agent

**COPY-PASTE:**

```
TAREA: Crear índice y FK constraint entre chat_messages y guest_conversations

⚠️ PREREQUISITO: Migración 2.4.2 completada ✅

CONTEXTO:
- Migración completa: 64+ mensajes en guest_conversations
- Legacy vacío: 0 mensajes en chat_conversations
- Objetivo: Establecer FK formal para integridad referencial

ESPECIFICACIONES:

1. Verificar NO hay mensajes huérfanos (10min):
```sql
SELECT COUNT(*) as mensajes_huerfanos
FROM chat_messages cm
WHERE NOT EXISTS (
  SELECT 1 FROM guest_conversations gc WHERE gc.id = cm.conversation_id
);
-- Expected: 0
```

2. Crear índice para performance (5min):
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id
ON chat_messages(conversation_id);
```

3. Agregar FK constraint (10min):
```sql
ALTER TABLE chat_messages
ADD CONSTRAINT chat_messages_guest_conversation_fkey
FOREIGN KEY (conversation_id)
REFERENCES guest_conversations(id)
ON DELETE CASCADE;
```

4. Verificar constraint creado (5min):
```sql
SELECT
  conname as constraint_name,
  conrelid::regclass as tabla,
  confrelid::regclass as tabla_referenciada
FROM pg_constraint
WHERE conname = 'chat_messages_guest_conversation_fkey';
-- Expected: 1 row
```

CRITERIOS DE ÉXITO:
✅ Query mensajes huérfanos retorna 0
✅ Índice creado exitosamente
✅ FK constraint aplicado
✅ Query verificación retorna constraint

ARCHIVOS:
- Supabase SQL Editor (ejecutar queries directamente)

REFERENCIAS:
- Plan técnico: plan.md FASE 2.4.3 (líneas 770-793)

SIGUIENTE: Prompt 2.4.4 para actualizar código backend
```

---

### Prompt 2.4.4: Actualizar Código Backend

**AGENTE:** @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Eliminar referencias a chat_conversations en código backend

⚠️ PREREQUISITO: Foreign Keys aplicadas ✅ (Prompt 2.4.3)

CONTEXTO:
- Sistema legacy deprecado
- Nuevo sistema con FK activo
- Objetivo: Limpiar código de referencias obsoletas

ESPECIFICACIONES:

1. Actualizar src/lib/guest-auth.ts (15min):
```typescript
// ELIMINAR campo conversation_id de GuestSession
export interface GuestSession {
  reservation_id: string
  // conversation_id: string  // ← ELIMINAR ESTA LÍNEA
  tenant_id: string
  guest_name: string
  check_in: string
  check_out: string
  reservation_code: string
}
```

2. Actualizar src/app/api/guest/login/route.ts (20min):
   - ELIMINAR creación automática de conversación en chat_conversations
   - MANTENER creación de JWT token con reservation_id
   - Conversación se crea cuando usuario la necesita (POST /api/guest/conversations)

3. Actualizar src/app/api/guest/chat/route.ts (20min):
   - ELIMINAR referencias a session.conversation_id en logs
   - ACTUALIZAR rate limiting para usar session.reservation_id

CÓDIGO ESPERADO:

**src/app/api/guest/login/route.ts:**
```typescript
// ANTES (líneas 45-60 aprox - ELIMINAR BLOQUE)
const { data: conversation } = await supabase
  .from('chat_conversations')
  .insert({
    user_id: reservation.id,
    user_type: 'guest',
    reservation_id: reservation.id,
    tenant_id: tenantId,
  })
  .select()
  .single()

// DESPUÉS (ELIMINAR BLOQUE COMPLETO - conversación se crea en POST /api/guest/conversations)
```

**src/app/api/guest/chat/route.ts:**
```typescript
// ANTES (línea ~76)
console.log(`[Guest Chat] Authenticated guest: ${session.guest_name} (conversation: ${session.conversation_id})`)

// DESPUÉS
console.log(`[Guest Chat] Authenticated guest: ${session.guest_name}`)

// ANTES (línea ~79)
if (!checkRateLimit(session.conversation_id)) {

// DESPUÉS
if (!checkRateLimit(session.reservation_id)) {
```

CRITERIOS DE ÉXITO:
✅ TypeScript compilation sin errores
✅ Login flow funciona sin crear conversación
✅ Chat API funciona con conversation_id como parámetro
✅ NO hay referencias a session.conversation_id

TESTING:
1. npm run build (verificar TypeScript)
2. Login como guest → NO debe crear conversación automáticamente
3. POST /api/guest/conversations → Crea conversación manual
4. POST /api/guest/chat → Funciona con conversation_id param

ARCHIVOS:
- src/lib/guest-auth.ts (modificar interface)
- src/app/api/guest/login/route.ts (eliminar auto-create)
- src/app/api/guest/chat/route.ts (actualizar rate limiting)

REFERENCIAS:
- Plan técnico: plan.md FASE 2.4.4 (líneas 797-827)

SIGUIENTE: Prompt 2.4.5 para testing completo
```

---

### Prompt 2.4.5: Testing Completo - Sistema Multi-Conversación

**AGENTE:** @agent-backend-developer + @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Validar sistema multi-conversación funciona end-to-end

⚠️ PREREQUISITO: Código actualizado ✅ (Prompt 2.4.4)

CONTEXTO:
- Migración completa
- Código limpio de referencias legacy
- Objetivo: Testing exhaustivo multi-conversación

ESPECIFICACIONES:

TEST 1: Login + Primera Conversación (15min)
**AGENTE:** @agent-backend-developer

1. Login como guest:
   - URL: http://localhost:3000/guest-chat/simmerdown
   - Check-in: 2025-10-15
   - Phone: 1234

2. Verificar NO se crea conversación automáticamente:
```sql
SELECT COUNT(*) FROM guest_conversations
WHERE guest_id = '{reservation_id}';
-- Expected: 0 (o las que existían antes)
```

3. Crear primera conversación:
   - Click "Nueva conversación"
   - Título auto-generado
   - Enviar 3 mensajes diferentes

4. Verificar mensajes guardados:
```sql
SELECT cm.content, gc.title
FROM chat_messages cm
JOIN guest_conversations gc ON cm.conversation_id = gc.id
WHERE gc.guest_id = '{reservation_id}'
ORDER BY cm.created_at DESC
LIMIT 3;
-- Expected: 3 rows con los mensajes enviados
```

---

TEST 2: Multi-Conversación (20min)
**AGENTE:** @agent-ux-interface

1. Crear 3 conversaciones diferentes:
   - "Actividades en San Andrés"
   - "Restaurantes"
   - "Mi alojamiento"

2. Enviar mensajes específicos a cada una:
   - Conv 1: "Quiero hacer snorkel"
   - Conv 2: "¿Dónde comer pizza?"
   - Conv 3: "¿A qué hora es el check-out?"

3. Switching entre conversaciones:
   - Click Conv 1 → Verificar mensaje "snorkel" visible
   - Click Conv 2 → Verificar mensaje "pizza" visible
   - Click Conv 3 → Verificar mensaje "check-out" visible

4. Verificar entity tracking funciona:
   - Enviar en Conv 1: "Quiero ir a Johnny Cay"
   - Debe guardar entity: { type: 'place', name: 'Johnny Cay' }

---

TEST 3: Verificación DB Final (15min)
**AGENTE:** @agent-database-agent

```sql
-- 1. NO mensajes en legacy
SELECT COUNT(*) FROM chat_messages cm
JOIN chat_conversations cc ON cm.conversation_id = cc.id;
-- Expected: 0

-- 2. TODOS mensajes en nuevo sistema
SELECT COUNT(*) FROM chat_messages cm
JOIN guest_conversations gc ON cm.conversation_id = gc.id;
-- Expected: 64+ (original + nuevos tests)

-- 3. Verificar message_count correcto
SELECT
  gc.id,
  gc.title,
  gc.message_count,
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = gc.id) as actual_messages
FROM guest_conversations gc
WHERE gc.message_count != (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = gc.id);
-- Expected: 0 rows (counts match)

-- 4. Verificar FK constraint activo
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'chat_messages'::regclass
  AND conname = 'chat_messages_guest_conversation_fkey';
-- Expected: 1 row (type 'f' = foreign key)
```

CRITERIOS DE ÉXITO:
✅ Login NO crea conversación automática
✅ 3 conversaciones creadas manualmente
✅ Mensajes correctos por conversación
✅ Switching funciona sin errores
✅ Entity tracking preservado
✅ Queries DB retornan valores esperados

ARCHIVOS:
- Testing manual en browser
- SQL queries en Supabase Dashboard

REFERENCIAS:
- Plan técnico: plan.md FASE 2.4.5 (líneas 830-860)

SIGUIENTE: Prompt 2.4.6 para limpieza final
```

---

### Prompt 2.4.6: Limpieza Final - Deprecar Sistema Legacy

**AGENTE:** @agent-database-agent + @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Renombrar tabla legacy y actualizar documentación

⚠️ PREREQUISITO: Testing completo PASSED ✅ (Prompt 2.4.5)

CONTEXTO:
- Sistema multi-conversación funcionando 100%
- Legacy vacío (0 mensajes)
- Objetivo: Deprecar tabla legacy, actualizar docs

ESPECIFICACIONES:

1. Renombrar tabla legacy (10min):
**AGENTE:** @agent-database-agent

```sql
-- 1. Renombrar tabla
ALTER TABLE chat_conversations
RENAME TO chat_conversations_legacy_deprecated;

-- 2. Documentar deprecación
COMMENT ON TABLE chat_conversations_legacy_deprecated IS
'DEPRECATED: Migrada a guest_conversations el 2025-10-05.
Migración realizada en FASE 2.4.
NO USAR - Solo mantener 30 días como backup histórico.
Eliminar después de 2025-11-05.';

-- 3. Verificar renombre exitoso
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%chat_conversations%';
-- Expected: chat_conversations_legacy_deprecated
```

2. Actualizar documentación (15min):
**AGENTE:** @agent-backend-developer

**SNAPSHOT.md:**
- Agregar sección "Migraciones Completadas"
- Documentar: chat_conversations → guest_conversations (Oct 5, 2025)
- Estado: Sistema multi-conversación activo

**plan.md:**
- Marcar FASE 2.4 como ✅ COMPLETADA
- Timestamp: (Oct 5, 2025)

**TODO.md:**
- Marcar TODAS las tareas 2.4.1-2.4.6 como [x]
- Actualizar progreso: 27 + 15 = 42/110 (38.2%)

CRITERIOS DE ÉXITO:
✅ Tabla renombrada exitosamente
✅ Comentario aplicado
✅ Query verificación retorna solo legacy_deprecated
✅ Documentación actualizada (3 archivos)

ENTREGABLES:
- Tabla legacy renombrada y documentada
- SNAPSHOT.md actualizado
- plan.md FASE 2.4 marcada ✅
- TODO.md tareas marcadas [x]

ARCHIVOS:
- Supabase SQL Editor (DDL statements)
- SNAPSHOT.md (sección Migraciones)
- plan.md (línea 631 - marcar ✅)
- TODO.md (líneas 141-361 - marcar [x])

REFERENCIAS:
- Plan técnico: plan.md FASE 2.4.6 (líneas 863-880)

SIGUIENTE: Sistema listo para FASE 3.5 Integration End-to-End
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

## 🔗 FASE 3.5: INTEGRATION END-TO-END

### Prompt 3.5.1: Backend API - Compliance Submit

**AGENTE:** @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Crear API endpoint /api/compliance/submit para guardar submissions sin ejecutar SIRE/TRA real

CONTEXTO:
- FASE 3.1 completada: compliance-chat-engine.ts (685 líneas) ✅
- FASE 3.4 completada: UI components (1,099 líneas) ✅
- Database migrations aplicadas: compliance_submissions table ✅
- Objetivo: Conectar UI con backend, guardar en DB con status 'pending'
- SIRE/TRA real se implementará en FASE 3.2-3.3 (opcional)

ESPECIFICACIONES:

## 1. Crear POST /api/compliance/submit

### Request Body:
```typescript
{
  conversationalData: {
    nombre_completo: string          // "Juan Pérez García"
    numero_pasaporte: string         // "AB123456"
    pais_texto: string              // "Colombia"
    proposito_viaje: string         // "Turismo"
  },
  guestId: string,
  reservationId: string,
  conversationId: string
}
```

### Flujo de Procesamiento:

```typescript
// 1. Validar conversational_data (4 campos requeridos)
if (!conversationalData.nombre_completo ||
    !conversationalData.numero_pasaporte ||
    !conversationalData.pais_texto) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
}

// 2. Importar compliance-chat-engine
import { conversationalToSire } from '@/lib/compliance-chat-engine'

// 3. Generar sire_data (13 campos oficiales)
const sireData = conversationalToSire(conversationalData, {
  tenantId: 'simmerdown',
  checkInDate: reservation.check_in_date,
  // ... tenant config
})

// 4. Guardar en compliance_submissions
const submission = await supabase
  .from('compliance_submissions')
  .insert({
    guest_id: guestId,
    tenant_id: tenantId,
    type: 'sire_tra',
    status: 'pending',
    data: {
      conversational_data: conversationalData,
      sire_data: sireData
    },
    submitted_by: guestId,
    submitted_at: new Date().toISOString()
  })
  .select()
  .single()

// 5. Return mock refs (NO ejecutar SIRE/TRA real)
return NextResponse.json({
  success: true,
  submissionId: submission.id,
  mockRefs: {
    sireRef: `MOCK-SIRE-${Date.now()}`,
    traRef: `MOCK-TRA-${Date.now()}`
  },
  timestamp: new Date().toISOString()
}, { status: 201 })
```

### Response Success (201):
```json
{
  "success": true,
  "submissionId": "uuid-123",
  "mockRefs": {
    "sireRef": "MOCK-SIRE-1696824000000",
    "traRef": "MOCK-TRA-1696824000000"
  },
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

### Error Handling:
```typescript
// Validación errors (400)
- Missing required fields
- Invalid passport format
- Invalid country

// Database errors (500)
- Supabase insert failed
- RLS policy violation

// Response structure:
{
  error: string,
  details?: any
}
```

---

ARCHIVOS A CREAR:
- `src/app/api/compliance/submit/route.ts` (~150 líneas)

TESTING:
```bash
# Test manual con curl
curl -X POST http://localhost:3000/api/compliance/submit \
  -H "Content-Type: application/json" \
  -d '{
    "conversationalData": {
      "nombre_completo": "Juan Pérez García",
      "numero_pasaporte": "AB123456",
      "pais_texto": "Colombia",
      "proposito_viaje": "Turismo"
    },
    "guestId": "guest-uuid",
    "reservationId": "reservation-uuid",
    "conversationId": "conversation-uuid"
  }'

# Expected: 201 Created con mockRefs
```

VALIDACIÓN DB:
```sql
-- Verificar submission creada
SELECT id, status, data->>'conversational_data', data->>'sire_data'
FROM compliance_submissions
WHERE guest_id = 'guest-uuid'
ORDER BY submitted_at DESC
LIMIT 1;

-- Expected: 1 row, status = 'pending', data contiene ambas capas
```

SIGUIENTE: Prompt 3.5.2 - Frontend Integration
```

---

### Prompt 3.5.2: Frontend Integration - Wire UI to API

**AGENTE:** @agent-ux-interface

**COPY-PASTE:**

```
TAREA: Conectar ComplianceConfirmation.tsx con POST /api/compliance/submit y manejar success flow

CONTEXTO:
- FASE 3.5.1 completada: API /api/compliance/submit ✅
- ComplianceConfirmation.tsx ya existe (306 líneas)
- ComplianceSuccess.tsx ya existe (193 líneas)
- Objetivo: Wire submit button → API call → success screen

ESPECIFICACIONES:

## 1. Modificar GuestChatInterface.tsx

### Agregar ComplianceReminder en Sidebar:
```tsx
import ComplianceReminder from '@/components/Compliance/ComplianceReminder'

// En sidebar superior (línea ~50)
<div className="h-full flex flex-col">
  {/* ComplianceReminder banner */}
  <ComplianceReminder
    guestId={guestId}
    reservationId={reservationId}
    onStart={() => setShowComplianceModal(true)}
  />

  {/* Resto del sidebar... */}
</div>
```

### Agregar Modal States:
```tsx
const [showComplianceModal, setShowComplianceModal] = useState(false)
const [showComplianceSuccess, setShowComplianceSuccess] = useState(false)
const [submissionData, setSubmissionData] = useState<any>(null)

// Intent detection trigger (desde API response)
useEffect(() => {
  if (chatResponse?.shouldTriggerCompliance) {
    setShowComplianceModal(true)
  }
}, [chatResponse])
```

### Renderizar Modales:
```tsx
{/* ComplianceConfirmation Modal */}
{showComplianceModal && (
  <ComplianceConfirmation
    conversationalData={complianceData?.conversational_data}
    sireData={complianceData?.sire_data}
    onConfirm={handleComplianceSubmit}
    onEdit={handleEditField}
    onCancel={() => setShowComplianceModal(false)}
    isLoading={isSubmitting}
  />
)}

{/* ComplianceSuccess Screen */}
{showComplianceSuccess && submissionData && (
  <ComplianceSuccess
    sireRef={submissionData.mockRefs.sireRef}
    traRef={submissionData.mockRefs.traRef}
    timestamp={submissionData.timestamp}
    onContinue={() => {
      setShowComplianceSuccess(false)
      // Auto-dismiss reminder
      localStorage.setItem('compliance_reminder_dismissed', 'true')
    }}
  />
)}
```

## 2. Modificar ComplianceConfirmation.tsx

### Wire Submit Handler:
```tsx
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)

const handleSubmit = async () => {
  setIsSubmitting(true)
  setError(null)

  try {
    const response = await fetch('/api/compliance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationalData,
        guestId,
        reservationId,
        conversationId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Submission failed')
    }

    const data = await response.json()

    // Success: trigger parent callback
    onConfirm(data)

  } catch (err: any) {
    setError(err.message)
    console.error('Compliance submission error:', err)
  } finally {
    setIsSubmitting(false)
  }
}
```

### Loading State UI:
```tsx
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="px-6 py-3 bg-green-600 text-white rounded-lg disabled:opacity-50"
>
  {isSubmitting ? (
    <span className="flex items-center gap-2">
      <Spinner size="sm" />
      Validando datos...
    </span>
  ) : (
    'Confirmar y Enviar'
  )}
</button>

{/* Error display */}
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-800 text-sm">{error}</p>
  </div>
)}
```

## 3. Modificar ComplianceSuccess.tsx

### Auto-redirect Logic:
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    onContinue()
  }, 5000) // 5 seconds

  return () => clearTimeout(timer)
}, [onContinue])
```

### Display Mock Refs:
```tsx
<div className="space-y-3">
  <div className="p-4 bg-green-50 rounded-lg">
    <p className="text-sm text-gray-600">Referencia SIRE</p>
    <p className="text-lg font-mono font-semibold text-green-700">
      {sireRef}
    </p>
  </div>

  <div className="p-4 bg-blue-50 rounded-lg">
    <p className="text-sm text-gray-600">Referencia TRA</p>
    <p className="text-lg font-mono font-semibold text-blue-700">
      {traRef}
    </p>
  </div>

  <p className="text-xs text-gray-500">
    {new Date(timestamp).toLocaleString('es-CO')}
  </p>
</div>
```

---

ARCHIVOS A MODIFICAR:
- `src/components/Chat/GuestChatInterface.tsx` (~50 líneas agregadas)
- `src/components/Compliance/ComplianceConfirmation.tsx` (~30 líneas agregadas)
- `src/components/Compliance/ComplianceSuccess.tsx` (~10 líneas agregadas)

TESTING:
- [ ] ComplianceReminder visible en sidebar
- [ ] Click "Iniciar registro" abre modal
- [ ] Modal pre-fill con datos correctos
- [ ] Submit button → loading state
- [ ] Success → ComplianceSuccess screen
- [ ] Auto-redirect después de 5s
- [ ] Reminder dismissed (localStorage)
- [ ] Error handling muestra mensaje

SIGUIENTE: Prompt 3.5.3 - Testing End-to-End
```

---

### Prompt 3.5.3: Testing End-to-End - Flujo Completo

**AGENTE:** @agent-backend-developer

**COPY-PASTE:**

```
TAREA: Validar flujo compliance end-to-end desde guest login hasta success screen

TESTING MANUAL:

## 1. Setup Environment

```bash
# Start dev server
./scripts/dev-with-keys.sh

# Verify API keys loaded
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

## 2. Test Flow Paso a Paso

### Paso 1: Guest Login
1. Navigate: http://localhost:3000/guest-chat/simmerdown
2. Enter check-in date, phone last 4 digits
3. Verify login success → chat interface loads

### Paso 2: ComplianceReminder Visible
1. Verify banner visible en sidebar superior
2. Badge: "No iniciado" (red)
3. Button: "Iniciar registro"

### Paso 3: Trigger Compliance Flow
**Opción A: Manual**
1. Click "Iniciar registro" en reminder
2. ComplianceConfirmation modal abre

**Opción B: Intent Detection** (si implementado)
1. Type message: "Quiero hacer el registro de migración"
2. Send message
3. Verify modal opens automatically

### Paso 4: Validar Modal Pre-fill
1. Verify 4 campos conversacionales tienen datos:
   - nombre_completo: [from reservation]
   - numero_pasaporte: [from entity extraction]
   - pais_texto: [from entity extraction]
   - proposito_viaje: [from conversation]

2. Verify sección SIRE colapsable:
   - 13+ campos read-only
   - Badges "auto 🤖"
   - Collapse/expand funciona

### Paso 5: Editar Datos
1. Click campo "nombre_completo"
2. Modify value
3. Verify validation (solo letras)
4. Invalid input → error message inline

### Paso 6: Submit
1. Click "Confirmar y Enviar"
2. Verify loading state: "Validando datos..."
3. Button disabled durante submit

### Paso 7: Verificar Success Screen
1. ComplianceSuccess modal aparece
2. Mock refs visibles:
   - SIRE: MOCK-SIRE-[timestamp]
   - TRA: MOCK-TRA-[timestamp]
3. Confetti animation plays
4. Auto-redirect countdown: 5... 4... 3...

### Paso 8: Validar Post-Submit
1. After redirect → volver a chat
2. ComplianceReminder NO visible (dismissed)
3. localStorage check:
   ```js
   localStorage.getItem('compliance_reminder_dismissed') === 'true'
   ```

### Paso 9: Verificar Database
```sql
SELECT
  id,
  status,
  data->>'conversational_data' as conv_data,
  data->>'sire_data' as sire_data,
  submitted_at
FROM compliance_submissions
WHERE guest_id = '[guest-uuid-from-test]'
ORDER BY submitted_at DESC
LIMIT 1;
```

**Expected:**
- 1 row created
- status: 'pending'
- conv_data: JSON con 4 campos
- sire_data: JSON con 13+ campos
- submitted_at: recent timestamp

## 3. Error Scenarios

### Test Case: Missing Required Field
1. Open modal
2. Clear "nombre_completo"
3. Click submit
4. Verify error: "Missing required fields"

### Test Case: Invalid Passport
1. Enter invalid passport: "123"
2. Click submit
3. Verify validation error inline

### Test Case: Network Error
1. Stop dev server
2. Try submit
3. Verify error handling graceful

## 4. Mobile Testing

1. Resize browser: 375px width (iPhone SE)
2. Repeat Pasos 1-8
3. Verify:
   - Modal fullscreen
   - Stacked layout
   - Touch targets ≥ 44px
   - Scroll works

## 5. Accessibility Testing

1. Tab through modal (keyboard only)
2. Verify focus order logical
3. Enter submits form
4. Esc closes modal (si implementado)

---

CHECKLIST FINAL:

- [ ] ✅ Guest login funciona
- [ ] ✅ ComplianceReminder visible
- [ ] ✅ Modal opens (manual + intent detection)
- [ ] ✅ Pre-fill datos correctos
- [ ] ✅ Validaciones cliente funcionan
- [ ] ✅ Submit API call exitoso
- [ ] ✅ Loading states correctos
- [ ] ✅ Success screen muestra mock refs
- [ ] ✅ Auto-redirect funciona (5s)
- [ ] ✅ Reminder dismissed post-submit
- [ ] ✅ Database submission creada
- [ ] ✅ Error handling graceful
- [ ] ✅ Mobile responsive
- [ ] ✅ Keyboard navigation

SIGUIENTE: Opcional - FASE 3.2 SIRE Puppeteer (si requiere submissions reales)
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

**Última actualización:** 5 de Octubre 2025 (FASE 3.5 + 3.6 agregadas)
**Total prompts:** 15 ejecutables (7 completados: FASE 0.5, 3.1, 3.4, 3.6)
**Próximo:** Prompt 3.5.1 - Backend API Compliance Submit (Integration End-to-End)
