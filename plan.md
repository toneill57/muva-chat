# WhatsApp Business Integration - Plan de Implementación

**Proyecto:** WhatsApp Business Cloud API Integration
**Fecha Inicio:** 2025-10-16
**Estado:** =Ë Planificación

---

## <¯ OVERVIEW

### Objetivo Principal
Integrar WhatsApp Business Cloud API con el sistema de chat existente de MUVA (Simmerdown) para permitir que los clientes interactúen con el chatbot de Claude AI directamente desde WhatsApp, con persistencia de conversaciones, soporte multi-agente, analytics y compliance GDPR/LGPD.

### ¿Por qué?
- **Accesibilidad 24/7**: Los clientes prefieren WhatsApp sobre formularios web (tasa de apertura 98% vs 20% email)
- **Reducción de carga operativa**: Automatización de consultas frecuentes (horarios, amenidades, disponibilidad)
- **Mejor conversión**: WhatsApp tiene 45-60% tasa de conversión vs 2-3% web chat
- **Competitividad**: Meta Verified ya activo - aprovechar inversión existente
- **Escalabilidad**: Hasta 1,000 mensajes/segundo, crecimiento sin límites
- **ROI inmediato**: Primeras 1,000 conversaciones/mes gratis

### Alcance
-  Webhook endpoint para recibir mensajes de WhatsApp
-  Integración con motor Claude AI existente (`/api/chat/route.ts`)
-  Sistema de envío de mensajes (text, media, templates)
-  Persistencia de conversaciones en base de datos
-  Dashboard staff para visualizar/responder conversaciones
-  Sistema de analytics y métricas
-  Soporte para multimedia (imágenes, documentos, ubicación)
-  Templates pre-aprobados por Meta
-  Sistema de opt-in/opt-out (GDPR/LGPD compliant)
-  Multi-tenant (soporte para múltiples tenants)
- L Llamadas de voz (fuera de alcance)
- L WhatsApp Pay (fase futura)
- L Chatbots externos (solo Claude AI interno)

---

## =Ê ESTADO ACTUAL

### Sistema Existente
-  **Chat engine funcional**: `/api/chat/route.ts` con Claude AI + búsqueda vectorial
-  **Multi-tenant architecture**: Subdomain-based isolation (simmerdown.muva.chat)
-  **Knowledge base**: 107 accommodation units con embeddings Matryoshka
-  **Database**: Supabase con RLS policies y tenant isolation
-  **Meta Verified**: Cuenta verificada activa
-  **VPS deployment**: PM2 + Git deployment funcional
-  **Authentication**: Sistema de staff users y guest reservations

### Limitaciones Actuales
- L **Sin WhatsApp integration**: Clientes no pueden chatear por WhatsApp
- L **Sin webhook endpoint**: No hay forma de recibir mensajes externos
- L **Sin conversaciones persistentes**: No hay tabla para chats de WhatsApp
- L **Sin sistema de templates**: No hay mensajes pre-aprobados
- L **Sin dashboard WhatsApp**: Staff no puede ver conversaciones WhatsApp
- L **Sin analytics**: No hay métricas de uso WhatsApp
- L **Sin compliance tracking**: No hay sistema opt-in/opt-out

---

## =€ ESTADO DESEADO

### Nueva Experiencia

**Para Clientes (Guests):**
1. Cliente envía mensaje a número WhatsApp de Simmerdown: "¿Tienen disponibilidad para 2 personas del 15 al 20 de noviembre?"
2. Sistema recibe mensaje vía webhook, identifica tenant (Simmerdown)
3. Motor Claude AI procesa pregunta con conocimiento específico de Simmerdown
4. Respuesta automática en <3 segundos: "¡Hola! Tenemos disponibilidad para 2 personas del 15 al 20 de noviembre. Nuestras unidades disponibles son..."
5. Conversación persiste en DB, se puede retomar en cualquier momento
6. Cliente puede enviar imágenes (ubicación, pasaporte para check-in)
7. Sistema responde con botones interactivos (Quick Replies)

**Para Staff:**
1. Dashboard muestra todas las conversaciones WhatsApp en tiempo real
2. Staff puede ver historial completo de cada conversación
3. Staff puede intervenir manualmente si es necesario
4. Analytics: mensajes/día, tasa de respuesta, temas frecuentes
5. Reportes de conversiones (leads ’ reservas)

### Características Clave
- **Webhook seguro**: Verificación de firma Meta, HTTPS/TLS
- **Mensajes bidireccionales**: Enviar y recibir texto, media, ubicación
- **Templates pre-aprobados**: Mensajes de bienvenida, confirmación, recordatorios
- **Botones interactivos**: Quick Replies para opciones frecuentes
- **Persistencia**: Historial completo en `whatsapp_conversations` + `whatsapp_messages`
- **Multi-tenant**: Aislamiento por tenant_id (Simmerdown, otros tenants futuros)
- **Rate limiting**: Respeto a límites Meta (80-1,000 msg/sec)
- **Error handling**: Retry exponencial, fallbacks, logging detallado
- **Compliance**: Opt-in tracking, opt-out automático, data retention policies
- **Analytics**: Dashboard con KPIs (mensajes enviados/recibidos, tiempo promedio respuesta, conversiones)

---

## =ñ TECHNICAL STACK

### Backend
- **Next.js 15 API Routes**: Webhook endpoint (`/api/webhooks/whatsapp/route.ts`)
- **TypeScript**: Type-safe integration
- **WhatsApp Cloud API**: Meta Graph API v17.0+
- **Claude AI**: Existing chat engine (Anthropic SDK)
- **Supabase**: PostgreSQL + RLS policies

### Database (Nuevas Tablas)
- `whatsapp_conversations`: Conversaciones WhatsApp por tenant
- `whatsapp_messages`: Mensajes individuales con metadata
- `whatsapp_templates`: Templates pre-aprobados por Meta
- `whatsapp_analytics`: Métricas agregadas
- `whatsapp_opt_ins`: Tracking de consentimiento GDPR/LGPD

### External APIs
- **Meta Graph API**: Send/receive WhatsApp messages
- **WhatsApp Cloud API**: Webhook notifications
- **Meta Business Suite**: Template management

### Infrastructure
- **VPS**: Existing deployment (PM2)
- **HTTPS/TLS**: SSL certificate (required by Meta)
- **Environment Variables**: WhatsApp credentials
- **Logging**: Structured logs for debugging

---

## =' DESARROLLO - FASES

### FASE 0: Setup Inicial y Meta Business Configuration (6h)

**Objetivo:** Configurar cuenta WhatsApp Business API, webhook básico, y verificación

**Entregables:**
- Meta Business Account con WhatsApp Business API activo
- Phone Number ID y Access Token obtenidos
- Webhook endpoint básico funcionando (verificación GET + POST)
- Variables de entorno configuradas
- Documentación de credenciales

**Archivos a crear/modificar:**
- **Crear**: `src/app/api/webhooks/whatsapp/route.ts` (webhook endpoint)
- **Crear**: `src/lib/whatsapp/client.ts` (WhatsApp API client wrapper)
- **Crear**: `src/lib/whatsapp/types.ts` (TypeScript types para webhooks)
- **Modificar**: `.env.local` (agregar WhatsApp credentials)
- **Crear**: `docs/whatsapp-business-integration/SETUP_GUIDE.md` (paso a paso Meta setup)

**Testing:**
- Webhook verification (GET) responde correctamente
- Meta envía test message ’ webhook recibe POST
- Logs muestran payload completo
- Signature verification funciona

**Riesgos:**
- Meta puede tardar 1-3 días en aprobar Business Account
- Número de teléfono debe ser verificado (requiere código SMS)
- Política de privacidad debe estar publicada

---

### FASE 1: Core Messaging - Enviar y Recibir (8h)

**Objetivo:** Implementar funcionalidad básica de envío/recepción de mensajes de texto

**Entregables:**
- Sistema recibe mensajes de WhatsApp via webhook
- Sistema envía respuestas automáticas usando Claude AI
- Integración con motor de chat existente (`/api/chat/route.ts`)
- Manejo de errores y retry exponencial
- Logging estructurado

**Archivos a crear/modificar:**
- **Crear**: `src/lib/whatsapp/messaging.ts` (send/receive logic)
- **Crear**: `src/lib/whatsapp/webhook-handler.ts` (procesar payloads)
- **Modificar**: `src/app/api/webhooks/whatsapp/route.ts` (agregar message handling)
- **Crear**: `src/lib/whatsapp/error-handler.ts` (retry logic, error codes)
- **Crear**: `src/lib/whatsapp/utils.ts` (helpers: format phone, validate message)

**Flujo de Datos:**
```
WhatsApp User ’ Meta Webhook ’ POST /api/webhooks/whatsapp
                                      “
                             Extract: from, text, message_id
                                      “
                             Identify tenant (phone number ’ tenant_id)
                                      “
                             Call: /api/chat (existing engine)
                                      “
                             Claude AI generates response
                                      “
                             Send response via Graph API
                                      “
                             Log: message_id, status, timestamp
```

**Testing:**
- Enviar mensaje manual desde WhatsApp ’ Recibir respuesta automática
- Verificar logs: `webhook_received`, `chat_api_called`, `message_sent`
- Validar rate limiting (no exceder 80 msg/sec)
- Test error scenarios: API down, invalid token, timeout

**Dependencias:**
- FASE 0 completada (webhook funcionando)
- Motor de chat existente operacional

---

### FASE 2: Persistencia de Conversaciones (7h)

**Objetivo:** Guardar todas las conversaciones y mensajes en base de datos

**Entregables:**
- Tablas `whatsapp_conversations` y `whatsapp_messages` creadas
- Migrations con RLS policies
- Sistema guarda cada mensaje entrante/saliente
- Relación con `tenant_registry` y `guest_reservations` (opcional)
- Queries optimizados con índices

**Archivos a crear/modificar:**
- **Crear**: `supabase/migrations/20251016_create_whatsapp_tables.sql`
- **Crear**: `src/lib/whatsapp/db.ts` (database operations)
- **Modificar**: `src/lib/whatsapp/webhook-handler.ts` (agregar DB persistence)
- **Crear**: `src/lib/whatsapp/conversation-manager.ts` (CRUD para conversaciones)
- **Crear**: `src/types/whatsapp.ts` (TypeScript interfaces para DB)

**Schema Principal:**
```sql
CREATE TABLE whatsapp_conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_registry(tenant_id),
  whatsapp_user_phone VARCHAR(20) NOT NULL,
  whatsapp_user_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, whatsapp_user_phone)
);

CREATE TABLE whatsapp_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(conversation_id),
  whatsapp_message_id VARCHAR(255) UNIQUE,
  direction VARCHAR(10) NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  content TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Testing:**
- Enviar mensaje ’ Verificar row en `whatsapp_conversations`
- Verificar row en `whatsapp_messages` (direction=inbound)
- Respuesta automática ’ Verificar row (direction=outbound)
- RLS test: Intentar acceder a conversación de otro tenant (debe fallar)

---

### FASE 3: Features Premium - Templates, Botones y Media (9h)

**Objetivo:** Implementar mensajes interactivos, templates pre-aprobados y soporte multimedia

**Entregables:**
- Sistema de templates (crear, aprobar, enviar)
- Quick Reply buttons (opciones rápidas)
- Soporte para imágenes, documentos, ubicación
- Template management API
- Validación de templates antes de enviar

**Archivos a crear/modificar:**
- **Crear**: `supabase/migrations/20251016_create_whatsapp_templates.sql`
- **Crear**: `src/lib/whatsapp/templates.ts` (template manager)
- **Crear**: `src/lib/whatsapp/interactive.ts` (buttons, lists)
- **Crear**: `src/lib/whatsapp/media.ts` (upload/send images, docs)
- **Crear**: `src/app/api/whatsapp/templates/route.ts` (CRUD templates)
- **Modificar**: `src/lib/whatsapp/messaging.ts` (agregar media support)

**Testing:**
- Crear template vía API ’ Verificar row en DB
- Enviar template con placeholders ’ Verificar mensaje formateado
- Click en Quick Reply button ’ Recibir webhook con button_reply
- Enviar imagen desde WhatsApp ’ Descargar y procesar

---

### FASE 4: Staff Dashboard - UI para Gestión (6h)

**Objetivo:** Crear interfaz web para que staff vea y responda conversaciones WhatsApp

**Entregables:**
- Página `/staff/whatsapp` con lista de conversaciones
- Vista de conversación individual con historial completo
- Formulario para responder manualmente
- Filtros: tenant, status, fecha
- Real-time updates (polling)

**Archivos a crear/modificar:**
- **Crear**: `src/app/(dashboard)/staff/whatsapp/page.tsx`
- **Crear**: `src/app/(dashboard)/staff/whatsapp/[conversation_id]/page.tsx`
- **Crear**: `src/components/whatsapp/ConversationList.tsx`
- **Crear**: `src/components/whatsapp/MessageThread.tsx`
- **Crear**: `src/components/whatsapp/SendMessageForm.tsx`
- **Crear**: `src/app/api/whatsapp/conversations/route.ts`

**Testing:**
- Navegar a `/staff/whatsapp` ’ Ver lista de conversaciones
- Click en conversación ’ Ver historial completo
- Enviar mensaje manual ’ Verificar llegada a WhatsApp
- Test RLS: Staff solo ve conversaciones de su tenant

---

### FASE 5: Analytics y Production Readiness (4h)

**Objetivo:** Implementar métricas, compliance tracking y preparar para producción

**Entregables:**
- Dashboard de analytics (mensajes/día, tasa respuesta, conversiones)
- Sistema de opt-in/opt-out (GDPR/LGPD)
- Data retention policies
- Logs estructurados
- Monitoring y alertas
- Documentación final

**Archivos a crear/modificar:**
- **Crear**: `supabase/migrations/20251016_create_whatsapp_analytics.sql`
- **Crear**: `src/app/(dashboard)/staff/whatsapp/analytics/page.tsx`
- **Crear**: `src/lib/whatsapp/analytics.ts`
- **Crear**: `src/lib/whatsapp/compliance.ts`
- **Crear**: `docs/whatsapp-business-integration/PRODUCTION_CHECKLIST.md`
- **Crear**: `docs/whatsapp-business-integration/COMPLIANCE_GUIDE.md`

**Testing:**
- Generar reporte analytics últimos 7 días
- Enviar "STOP" ’ Verificar opt-out en DB
- Simular 100 mensajes/min ’ Verificar rate limiting
- Test GDPR: Exportar datos de usuario

---

##  CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Cliente puede enviar mensaje a WhatsApp y recibir respuesta en <3 segundos
- [ ] Respuesta usa conocimiento específico de Simmerdown
- [ ] Conversaciones persisten en DB
- [ ] Staff puede ver todas las conversaciones desde dashboard
- [ ] Templates pre-aprobados funcionan
- [ ] Botones interactivos funcionan
- [ ] Soporte multimedia funciona
- [ ] Sistema multi-tenant funciona

### Performance
- [ ] Tiempo respuesta bot: <3 segundos (p95)
- [ ] Throughput: 80 mensajes/segundo sostenido
- [ ] Uptime webhook: 99.5%+
- [ ] Latencia DB queries: <100ms (p95)

### Compliance
- [ ] Opt-in tracking implementado
- [ ] Opt-out automático funciona
- [ ] Data retention: 90 días
- [ ] Logs de auditoría completos

### Seguridad
- [ ] Webhook signature verification activo
- [ ] HTTPS/TLS obligatorio
- [ ] RLS policies activas
- [ ] Rate limiting anti-spam

---

## > AGENTES REQUERIDOS

### 1. **@agent-backend-developer** (Principal)
**Responsabilidad:** API endpoints, webhooks, business logic, integración Claude AI

**Tareas:**
- FASE 0: Crear webhook endpoint básico, WhatsApp client wrapper
- FASE 1: Implementar send/receive messaging, integración con `/api/chat`
- FASE 2: Operaciones DB (save messages, fetch conversations)
- FASE 3: Templates, buttons, media handling
- FASE 4: API endpoints para dashboard
- FASE 5: Analytics queries, compliance logic

**Archivos:**
- `src/app/api/webhooks/whatsapp/route.ts`
- `src/lib/whatsapp/*.ts`
- `src/app/api/whatsapp/**/*.ts`

---

### 2. **@agent-database-agent** (Secundario)
**Responsabilidad:** Migrations, RLS policies, índices, monitoring DB

**Tareas:**
- FASE 2: Crear migrations para conversaciones y mensajes
- FASE 2: Configurar RLS policies
- FASE 3: Migration para templates
- FASE 5: Migrations para analytics y opt-ins
- FASE 5: Optimización de índices

**Archivos:**
- `supabase/migrations/*.sql`

---

### 3. **@agent-ux-interface** (Secundario)
**Responsabilidad:** Dashboard UI, componentes React, estilos

**Tareas:**
- FASE 4: Página lista conversaciones
- FASE 4: Página detalle conversación
- FASE 4: Componentes UI
- FASE 5: Analytics dashboard

**Archivos:**
- `src/app/(dashboard)/staff/whatsapp/**/*.tsx`
- `src/components/whatsapp/**/*.tsx`

---

### 4. **@agent-deploy-agent** (Terciario)
**Responsabilidad:** Deployment VPS, environment vars, SSL

**Tareas:**
- FASE 0: Configurar variables de entorno
- FASE 0: Verificar SSL certificate
- FASE 5: Deploy final a producción
- FASE 5: Smoke tests post-deployment

**Archivos:**
- `.env.production`

---

## =Â ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
   src/
      app/
         api/
            webhooks/whatsapp/route.ts
            whatsapp/
                conversations/route.ts
                templates/route.ts
                send/route.ts
         (dashboard)/staff/whatsapp/
             page.tsx
             [conversation_id]/page.tsx
             analytics/page.tsx
      lib/whatsapp/
         client.ts
         messaging.ts
         db.ts
         templates.ts
         analytics.ts
      components/whatsapp/
         ConversationList.tsx
         MessageThread.tsx
         SendMessageForm.tsx
      types/whatsapp.ts
   supabase/migrations/
      20251016_create_whatsapp_tables.sql
      20251016_create_whatsapp_templates.sql
      20251016_create_whatsapp_analytics.sql
   docs/whatsapp-business-integration/
       SETUP_GUIDE.md
       PRODUCTION_CHECKLIST.md
       COMPLIANCE_GUIDE.md
       fase-0/
       fase-1/
       fase-2/
       fase-3/
       fase-4/
       fase-5/
```

---

## =Ý NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Meta Approval Process**
- Business Account: 1-3 días
- Template approval: 24-48 horas
- Display name verification: 1 semana
- Política de privacidad DEBE estar publicada

**2. Rate Limits Meta**
- Initial: 250 conversaciones/24h
- Auto-upgrade hasta 100,000/24h
- Throughput: 80-1,000 msg/sec

**3. Costos**
- Free tier: 1,000 conversaciones/mes
- Después: $0.005-$0.09 USD/conversación

**4. Webhook Requirements**
- HTTPS obligatorio
- Respond GET in <5 sec
- Respond POST in <20 sec
- Verify HMAC signature

**5. Compliance GDPR/LGPD**
- Opt-in explícito
- Opt-out fácil (keyword "STOP")
- Data retention: 90 días recomendado
- Right to access/erasure

**6. Security**
- Rotate tokens cada 90 días
- Never log Access Tokens
- Verify webhook signature SIEMPRE
- RLS policies obligatorias

---

**Última actualización:** 2025-10-16
**Próximo paso:** Crear TODO.md y whatsapp-business-prompt-workflow.md
