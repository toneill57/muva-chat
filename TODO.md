# TODO - WhatsApp Business Integration

**Proyecto:** WhatsApp Business Cloud API Integration
**Fecha:** 2025-10-16
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0: Setup Inicial y Meta Business Configuration <�

### 0.1 Configurar Meta Business Account y WhatsApp Business API
- [ ] Crear/configurar Meta Business Account (estimate: 2h)
  - Acceder a Meta Business Suite (business.facebook.com)
  - Agregar producto "WhatsApp"
  - Verificar n�mero de tel�fono de negocio (SMS)
  - Obtener Phone Number ID
  - Generar Access Token permanente (no test token)
  - Publicar pol�tica de privacidad en URL p�blica
  - Files: N/A (configuraci�n externa)
  - Agent: **Manual** (usuario debe hacer esto)
  - Test: Verificar que Phone Number ID y Access Token funcionan con API test

### 0.2 Crear webhook endpoint b�sico
- [x] Implementar webhook verification y message reception (estimate: 2h)
  - Crear `src/app/api/webhooks/whatsapp/route.ts`
  - Implementar GET handler (webhook verification)
  - Implementar POST handler (message reception stub)
  - Configurar signature verification (HMAC SHA-256)
  - Files: `src/app/api/webhooks/whatsapp/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X GET 'https://simmerdown.muva.chat/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=1234'` � Debe retornar 1234

### 0.3 Crear WhatsApp API client wrapper
- [x] Implementar client TypeScript para Graph API (estimate: 1h)
  - Crear `src/lib/whatsapp/client.ts`
  - Crear `src/lib/whatsapp/types.ts` (interfaces TypeScript)
  - Implementar m�todos: `sendTextMessage`, `verifyWebhookSignature`
  - Configurar base URL y headers
  - Files: `src/lib/whatsapp/client.ts`, `src/lib/whatsapp/types.ts`
  - Agent: **@agent-backend-developer**
  - Test: `await whatsappClient.sendTextMessage('+573001234567', 'Test')` � Verificar mensaje recibido en WhatsApp

### 0.4 Configurar environment variables
- [x] Agregar credenciales WhatsApp a `.env.local` (estimate: 0.5h)
  - Agregar `WHATSAPP_PHONE_NUMBER_ID`
  - Agregar `WHATSAPP_ACCESS_TOKEN`
  - Agregar `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (random string)
  - Agregar `WHATSAPP_BUSINESS_ACCOUNT_ID` (opcional)
  - Files: `.env.local`
  - Agent: **@agent-deploy-agent**
  - Test: `process.env.WHATSAPP_PHONE_NUMBER_ID` debe tener valor

### 0.5 Documentar setup de Meta Business
- [x] Crear gu�a paso a paso para setup (estimate: 0.5h)
  - Crear `docs/whatsapp-business-integration/SETUP_GUIDE.md`
  - Documentar: c�mo crear Business Account, verificar n�mero, obtener tokens
  - Incluir screenshots o enlaces a documentaci�n Meta
  - Files: `docs/whatsapp-business-integration/SETUP_GUIDE.md`
  - Agent: **@agent-backend-developer**
  - Test: Revisar documento, verificar que todos los pasos est�n claros

---

## FASE 1: Core Messaging - Enviar y Recibir �

### 1.1 Implementar webhook message handler
- [ ] Procesar mensajes entrantes de WhatsApp (estimate: 2h)
  - Crear `src/lib/whatsapp/webhook-handler.ts`
  - Parsear payload Meta (extractar: from, text, message_id, timestamp)
  - Validar estructura del payload
  - Manejar diferentes tipos de mensajes (text, image stub)
  - Files: `src/lib/whatsapp/webhook-handler.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar mensaje desde WhatsApp � Verificar logs con `from`, `text`, `message_id`

### 1.2 Implementar tenant identification
- [ ] Identificar tenant desde n�mero WhatsApp (estimate: 1h)
  - Crear mapping: WhatsApp Business Phone � tenant_id
  - Consultar `tenant_registry` o usar config file
  - Fallback: usar tenant por defecto (Simmerdown)
  - Files: `src/lib/whatsapp/utils.ts`
  - Agent: **@agent-backend-developer**
  - Test: Webhook recibe mensaje � Logs muestran `tenant_id: <UUID de Simmerdown>`

### 1.3 Integrar con motor de chat existente
- [ ] Llamar `/api/chat` con mensaje recibido (estimate: 2h)
  - Extraer texto del mensaje WhatsApp
  - Hacer fetch interno a `/api/chat` con `{ question: text, use_context: true }`
  - Manejar errores (timeout, 500)
  - Parsear respuesta
  - Files: `src/lib/whatsapp/messaging.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar "�Tienen piscina?" � Verificar logs muestran llamada a `/api/chat` y respuesta de Claude

### 1.4 Implementar env�o de respuestas
- [ ] Enviar respuesta de Claude a WhatsApp (estimate: 1.5h)
  - Usar `whatsappClient.sendTextMessage(from, aiResponse)`
  - Manejar mensajes largos (>4096 caracteres, truncar o split)
  - Implementar retry con exponential backoff (4^X segundos)
  - Loggear message_id de respuesta
  - Files: `src/lib/whatsapp/messaging.ts`
  - Agent: **@agent-backend-developer**
  - Test: Bot responde mensaje en WhatsApp en <3 segundos

### 1.5 Implementar error handling y retry logic
- [ ] Manejar errores de Graph API (estimate: 1h)
  - Crear `src/lib/whatsapp/error-handler.ts`
  - Implementar retry exponencial (max 3 intentos)
  - Manejar c�digos de error Meta (rate limit 130429, invalid token 190)
  - Loggear errores con contexto (tenant_id, message_id)
  - Files: `src/lib/whatsapp/error-handler.ts`
  - Agent: **@agent-backend-developer**
  - Test: Simular error 500 de Graph API � Verificar 3 reintentos en logs

### 1.6 Implementar helpers de utilidad
- [ ] Crear funciones auxiliares (estimate: 0.5h)
  - Formatear n�mero de tel�fono (+57 300 123 4567 � +573001234567)
  - Validar mensaje (no vac�o, max length)
  - Sanitizar texto (remove emojis problem�ticos si es necesario)
  - Files: `src/lib/whatsapp/utils.ts`
  - Agent: **@agent-backend-developer**
  - Test: `formatPhoneNumber('+57 300 123 4567')` � `'+573001234567'`

---

## FASE 2: Persistencia de Conversaciones (

### 2.1 Crear migration para tablas WhatsApp
- [ ] Dise�ar schema y crear migration SQL (estimate: 2h)
  - Crear `supabase/migrations/20251016_create_whatsapp_tables.sql`
  - Tabla `whatsapp_conversations` (tenant_id, phone, status, timestamps)
  - Tabla `whatsapp_messages` (conversation_id, direction, content, status)
  - �ndices: tenant_id, conversation_id, created_at
  - Unique constraint: (tenant_id, whatsapp_user_phone)
  - Files: `supabase/migrations/20251016_create_whatsapp_tables.sql`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__list_tables` � Verificar `whatsapp_conversations` y `whatsapp_messages` existen

### 2.2 Crear RLS policies para aislamiento multi-tenant
- [ ] Configurar Row Level Security (estimate: 1h)
  - Policy: Tenants solo ven sus propias conversaciones
  - Policy: Messages filtrados por conversation_id de tenant
  - Habilitar RLS en ambas tablas
  - Files: `supabase/migrations/20251016_create_whatsapp_tables.sql` (agregar policies)
  - Agent: **@agent-database-agent**
  - Test: Conectar como tenant A � SELECT conversaciones � Solo ver conversaciones de tenant A

### 2.3 Implementar database operations
- [ ] Crear funciones CRUD para conversaciones (estimate: 2h)
  - Crear `src/lib/whatsapp/db.ts`
  - Funci�n `getOrCreateConversation(tenant_id, phone)`
  - Funci�n `saveMessage(conversation_id, direction, content, metadata)`
  - Funci�n `getConversationMessages(conversation_id, limit)`
  - Usar Supabase client con service role key
  - Files: `src/lib/whatsapp/db.ts`
  - Agent: **@agent-backend-developer**
  - Test: `await getOrCreateConversation('tenant-uuid', '+573001234567')` � Retorna conversation_id

### 2.4 Crear conversation manager
- [ ] Implementar l�gica de gesti�n de conversaciones (estimate: 1.5h)
  - Crear `src/lib/whatsapp/conversation-manager.ts`
  - M�todo `findOrCreateConversation`
  - M�todo `updateLastMessageTime`
  - M�todo `archiveConversation`
  - Files: `src/lib/whatsapp/conversation-manager.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar 2 mensajes al mismo usuario � Verificar se usan la misma conversation_id

### 2.5 Integrar persistencia con webhook handler
- [ ] Guardar mensajes entrantes y salientes (estimate: 1h)
  - Modificar `webhook-handler.ts` para llamar `saveMessage` (inbound)
  - Modificar `messaging.ts` para llamar `saveMessage` (outbound)
  - Actualizar `last_message_at` en conversaci�n
  - Files: `src/lib/whatsapp/webhook-handler.ts`, `src/lib/whatsapp/messaging.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar mensaje WhatsApp � Verificar 2 rows en DB (inbound + outbound)

### 2.6 Crear TypeScript interfaces para DB
- [ ] Definir types para tablas WhatsApp (estimate: 0.5h)
  - Crear `src/types/whatsapp.ts`
  - Interface `WhatsAppConversation`
  - Interface `WhatsAppMessage`
  - Interface `WhatsAppMessageMetadata`
  - Files: `src/types/whatsapp.ts`
  - Agent: **@agent-backend-developer**
  - Test: Import interfaces en db.ts � No hay errores TypeScript

---

## FASE 3: Features Premium - Templates, Botones y Media <�

### 3.1 Crear migration para templates
- [ ] Dise�ar tabla whatsapp_templates (estimate: 1h)
  - Crear `supabase/migrations/20251016_create_whatsapp_templates.sql`
  - Campos: template_name, category, body_text, buttons, status, meta_template_id
  - Constraint: status IN ('pending', 'approved', 'rejected')
  - Files: `supabase/migrations/20251016_create_whatsapp_templates.sql`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__list_tables` � Verificar `whatsapp_templates` existe

### 3.2 Implementar template manager
- [ ] Crear sistema de gesti�n de templates (estimate: 2h)
  - Crear `src/lib/whatsapp/templates.ts`
  - Funci�n `createTemplate(name, category, body, buttons)`
  - Funci�n `sendTemplate(to, template_name, placeholders)`
  - Funci�n `syncTemplatesFromMeta()` (fetch approved templates)
  - Files: `src/lib/whatsapp/templates.ts`
  - Agent: **@agent-backend-developer**
  - Test: `await createTemplate('welcome', 'UTILITY', 'Hola {{1}}!')` � Row en DB

### 3.3 Crear API endpoint para templates
- [ ] CRUD API para gesti�n de templates (estimate: 1.5h)
  - Crear `src/app/api/whatsapp/templates/route.ts`
  - GET: Listar templates por tenant
  - POST: Crear nuevo template
  - PATCH: Actualizar status (approved/rejected)
  - Files: `src/app/api/whatsapp/templates/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `POST /api/whatsapp/templates` � Verificar template creado

### 3.4 Implementar Quick Reply buttons
- [ ] Agregar soporte para botones interactivos (estimate: 1.5h)
  - Crear `src/lib/whatsapp/interactive.ts`
  - Funci�n `sendQuickReplies(to, text, buttons[])`
  - Parsear respuesta de bot�n en webhook (button_reply type)
  - Files: `src/lib/whatsapp/interactive.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar mensaje con 3 botones � Usuario click � Webhook recibe button_reply

### 3.5 Implementar soporte de multimedia
- [ ] Enviar y recibir im�genes/documentos (estimate: 2h)
  - Crear `src/lib/whatsapp/media.ts`
  - Funci�n `uploadMediaToMeta(file)` � media_id
  - Funci�n `sendImage(to, media_id, caption)`
  - Funci�n `downloadMediaFromMeta(media_id)` � Buffer
  - Parsear media en webhook (image, document types)
  - Files: `src/lib/whatsapp/media.ts`
  - Agent: **@agent-backend-developer**
  - Test: Usuario env�a foto � Webhook descarga imagen � Logs muestran tama�o en bytes

### 3.6 Modificar messaging.ts para media support
- [ ] Extender sistema de mensajes (estimate: 1h)
  - Modificar `sendMessage` para aceptar `{ type, content, media_url }`
  - Detectar tipo de mensaje (text vs media)
  - Guardar media_url en `whatsapp_messages.media_url`
  - Files: `src/lib/whatsapp/messaging.ts`
  - Agent: **@agent-backend-developer**
  - Test: `sendMessage(phone, {type: 'image', media_url: 'https://...'})` � Imagen enviada

---

## FASE 4: Staff Dashboard - UI para Gesti�n =�

### 4.1 Crear API endpoint para listar conversaciones
- [ ] GET /api/whatsapp/conversations (estimate: 1h)
  - Crear `src/app/api/whatsapp/conversations/route.ts`
  - Filtrar por tenant_id (RLS autom�tico)
  - Ordenar por `last_message_at DESC`
  - Paginaci�n (limit, offset)
  - Incluir preview del �ltimo mensaje
  - Files: `src/app/api/whatsapp/conversations/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `GET /api/whatsapp/conversations?limit=10` � JSON con array de conversaciones

### 4.2 Crear API endpoint para mensajes de conversaci�n
- [ ] GET /api/whatsapp/conversations/[id]/messages (estimate: 0.5h)
  - Crear `src/app/api/whatsapp/conversations/[id]/messages/route.ts`
  - Filtrar por conversation_id
  - Ordenar por created_at ASC (m�s antiguos primero)
  - Files: `src/app/api/whatsapp/conversations/[id]/messages/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `GET /api/whatsapp/conversations/<uuid>/messages` � JSON con mensajes

### 4.3 Crear API endpoint para env�o manual
- [ ] POST /api/whatsapp/send (estimate: 0.5h)
  - Crear `src/app/api/whatsapp/send/route.ts`
  - Body: `{ conversation_id, content }`
  - Enviar mensaje via Graph API
  - Guardar en DB como outbound
  - Files: `src/app/api/whatsapp/send/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `POST /api/whatsapp/send` � Mensaje enviado a WhatsApp

### 4.4 Crear p�gina lista de conversaciones
- [ ] UI: /staff/whatsapp con lista (estimate: 1.5h)
  - Crear `src/app/(dashboard)/staff/whatsapp/page.tsx`
  - Fetch conversaciones desde API
  - Mostrar: nombre/phone, �ltimo mensaje, timestamp
  - Badge "new" si tiene mensajes no le�dos
  - Click � Navegar a detalle
  - Files: `src/app/(dashboard)/staff/whatsapp/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Navegar a `/staff/whatsapp` � Ver lista de conversaciones

### 4.5 Crear componente ConversationList
- [ ] Componente React reutilizable (estimate: 1h)
  - Crear `src/components/whatsapp/ConversationList.tsx`
  - Props: conversations[], onSelect
  - Auto-refresh cada 10 segundos (polling)
  - Estilo: similar a WhatsApp Web
  - Files: `src/components/whatsapp/ConversationList.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Renderizar componente � Ver lista con auto-refresh

### 4.6 Crear p�gina detalle de conversaci�n
- [ ] UI: /staff/whatsapp/[id] con historial (estimate: 1.5h)
  - Crear `src/app/(dashboard)/staff/whatsapp/[conversation_id]/page.tsx`
  - Fetch mensajes desde API
  - Scroll to bottom autom�tico
  - Diferenciar visualmente: inbound vs outbound
  - Files: `src/app/(dashboard)/staff/whatsapp/[conversation_id]/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Click en conversaci�n � Ver historial completo

### 4.7 Crear componente MessageThread
- [ ] Componente de hilo de mensajes (estimate: 1h)
  - Crear `src/components/whatsapp/MessageThread.tsx`
  - Props: messages[]
  - Burbujas estilo WhatsApp (verde outbound, blanco inbound)
  - Mostrar timestamp, status (enviado/entregado)
  - Files: `src/components/whatsapp/MessageThread.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Renderizar con 10 mensajes � Ver burbujas correctamente

### 4.8 Crear componente SendMessageForm
- [ ] Formulario de env�o manual (estimate: 0.5h)
  - Crear `src/components/whatsapp/SendMessageForm.tsx`
  - Textarea + bot�n enviar
  - POST a `/api/whatsapp/send`
  - Limpiar textarea despu�s de enviar
  - Files: `src/components/whatsapp/SendMessageForm.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Escribir mensaje � Click send � Mensaje aparece en hilo

---

## FASE 5: Analytics y Production Readiness =�

### 5.1 Crear migration para analytics y opt-ins
- [ ] Tablas de m�tricas y compliance (estimate: 1.5h)
  - Crear `supabase/migrations/20251016_create_whatsapp_analytics.sql`
  - Tabla `whatsapp_analytics` (mensajes/d�a, usuarios �nicos, avg response time)
  - Tabla `whatsapp_opt_ins` (tracking de consentimiento)
  - Unique constraint: (tenant_id, date) en analytics
  - Files: `supabase/migrations/20251016_create_whatsapp_analytics.sql`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__list_tables` � Verificar ambas tablas existen

### 5.2 Implementar analytics engine
- [ ] C�lculo de m�tricas agregadas (estimate: 1.5h)
  - Crear `src/lib/whatsapp/analytics.ts`
  - Funci�n `computeDailyMetrics(tenant_id, date)`
  - Query: COUNT mensajes enviados/recibidos
  - Query: COUNT DISTINCT usuarios
  - Query: AVG tiempo respuesta (timestamp outbound - timestamp inbound)
  - Files: `src/lib/whatsapp/analytics.ts`
  - Agent: **@agent-backend-developer**
  - Test: `computeDailyMetrics('tenant-uuid', '2025-10-16')` � JSON con m�tricas

### 5.3 Crear dashboard de analytics
- [ ] UI: /staff/whatsapp/analytics (estimate: 1.5h)
  - Crear `src/app/(dashboard)/staff/whatsapp/analytics/page.tsx`
  - Gr�ficos: mensajes/d�a (�ltimos 30 d�as)
  - KPIs: usuarios �nicos, avg response time, tasa conversi�n
  - Usar biblioteca de gr�ficos (Recharts o similar)
  - Files: `src/app/(dashboard)/staff/whatsapp/analytics/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Navegar a `/staff/whatsapp/analytics` � Ver gr�ficos con datos

### 5.4 Implementar compliance tracking
- [ ] Sistema de opt-in/opt-out (estimate: 1h)
  - Crear `src/lib/whatsapp/compliance.ts`
  - Funci�n `recordOptIn(tenant_id, phone, method)`
  - Funci�n `recordOptOut(tenant_id, phone)` (autom�tico con keyword "STOP")
  - Detectar "STOP" en webhook � Llamar `recordOptOut`
  - Files: `src/lib/whatsapp/compliance.ts`
  - Agent: **@agent-backend-developer**
  - Test: Enviar "STOP" � Row en `whatsapp_opt_ins` con opt_in_status='opted_out'

### 5.5 Implementar monitoring y logging
- [ ] Sistema de observabilidad (estimate: 1h)
  - Crear `src/lib/whatsapp/monitoring.ts`
  - Log estructurado (JSON) con Winston o Pino
  - Trackear: latencia webhook, errores Graph API, mensajes/min
  - Alertas (opcional): webhook fails >5/hour
  - Files: `src/lib/whatsapp/monitoring.ts`
  - Agent: **@agent-backend-developer**
  - Test: Revisar logs � Formato JSON, timestamps, tenant_id presente

### 5.6 Crear documentaci�n de producci�n
- [ ] Checklists y gu�as (estimate: 1h)
  - Crear `docs/whatsapp-business-integration/PRODUCTION_CHECKLIST.md`
  - Crear `docs/whatsapp-business-integration/COMPLIANCE_GUIDE.md`
  - Checklist: SSL, env vars, rate limits, RLS, backups
  - GDPR/LGPD: opt-in, opt-out, data retention, right to access/erasure
  - Files: `docs/whatsapp-business-integration/*.md`
  - Agent: **@agent-backend-developer**
  - Test: Revisar documentos � Verificar completitud

### 5.7 Deploy a producci�n VPS
- [ ] Deployment final (estimate: 1h)
  - Configurar env vars en VPS (`.env.production`)
  - Verificar SSL certificate v�lido (requerido por Meta)
  - Deploy con PM2
  - Registrar webhook URL en Meta Business Suite
  - Files: `.env.production`, VPS config
  - Agent: **@agent-deploy-agent**
  - Test: Enviar mensaje desde WhatsApp producci�n � Recibir respuesta

### 5.8 Smoke tests post-deployment
- [ ] Validaci�n end-to-end (estimate: 0.5h)
  - Test 1: Enviar mensaje � Recibir respuesta en <3 seg
  - Test 2: Verificar mensaje guardado en DB producci�n
  - Test 3: Dashboard staff accesible y muestra conversaci�n
  - Test 4: Enviar "STOP" � Opt-out registrado
  - Files: N/A (testing manual)
  - Agent: **@agent-deploy-agent**
  - Test: Todos los tests pasaron � Marcar como completado

---

## =� PROGRESO

**Total Tasks:** 34
**Completed:** 0/34 (0%)

**Por Fase:**
- FASE 0: 0/5 tareas (Setup Inicial)
- FASE 1: 0/6 tareas (Core Messaging)
- FASE 2: 0/6 tareas (Persistencia)
- FASE 3: 0/6 tareas (Features Premium)
- FASE 4: 0/8 tareas (Staff Dashboard)
- FASE 5: 0/8 tareas (Analytics y Production)

**Estimaci�n Total:** ~40 horas

---

**�ltima actualizaci�n:** 2025-10-16
**Pr�ximo paso:** Ejecutar FASE 0 usando `whatsapp-business-prompt-workflow.md`
