# 📋 PROMPTS PARA WORKFLOW DEL SISTEMA CONVERSACIONAL

> **Propósito**: Prompts optimizados para iniciar conversaciones con Claude Code y agentes especializados
> **Última actualización**: 30 de Septiembre 2025
> **Sistema**: Guest Conversational Chat con memoria persistente

---

## 📑 ÍNDICE DE PROMPTS

### **FASE 1: Core Conversacional (Semanas 1-3)**
1. **Backend Dev** - Guest Authentication System (4-6h)
2. **Backend Dev** - Conversational Engine (12-16h)
3. **Database Agent** - Migrations & Monitoring (6-8h)
4. **UX Agent** - Guest Login & Chat UI (10-14h)
5. **Full Team** - Testing & Validation (8-10h)

### **FASE 2: Enhanced UX (Semanas 4-5)**
6. **UX Agent** - Enhanced UX Features Completo (26-33h)

### **MONITORING & MAINTENANCE**
7. **Database Agent** - Proactive Monitoring (ongoing)
9. **Database Agent** - Database Health / VACUUM FULL (2h) ⚠️ URGENTE

### **QUICK START & SPECIALIZED**
8. **Full Team** - Quick Start Sistema Completo (overview)
10. **Specialized** - MUVA Listings Expansion (6-8h)

---

## 🎯 CÓMO USAR ESTOS PROMPTS

1. **Copia el prompt completo** de la sección relevante
2. **Pega en una nueva conversación** con Claude Code
3. **El agente tendrá todo el contexto** necesario para trabajar autónomamente
4. **Referencias incluidas**: Líneas exactas de archivos para contexto rápido

---

## 1️⃣ BACKEND DEV - Guest Authentication System (FASE 1.1)

**Cuándo usar**: Iniciar FASE 1, implementar login de huéspedes

**Tiempo estimado**: 4-6 horas

**Prompt**:
```
Necesito implementar el Guest Authentication System (FASE 1.1 del sistema conversacional).

CONTEXTO:
- Especificaciones completas: /Users/oneill/Sites/apps/MUVA/plan.md líneas 45-100
- Tareas detalladas: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 23-43
- Sistema: Login de huéspedes con check-in date + últimos 4 dígitos de teléfono

ARCHIVOS A CREAR:
1. /src/app/api/guest/login/route.ts
   - Endpoint POST /api/guest/login
   - Body: { tenant_id, check_in_date, phone_last_4 }
   - Response: { token (JWT), conversation_id, guest_info }

2. /src/lib/guest-auth.ts
   - authenticateGuest() - Validar contra guest_reservations
   - generateGuestToken() - JWT con jose library
   - verifyGuestToken() - JWT verification
   - isTokenExpired() - Expiry check

IMPORTANTE:
- Solo backend/APIs, NO tocar UI (UX Agent maneja componentes visuales)
- JWT payload: { reservation_id, conversation_id, tenant_id }
- Tests unitarios + security tests requeridos

INFRAESTRUCTURA EXISTENTE:
- Tabla: guest_reservations (8 huéspedes activos)
- Tabla: chat_conversations (4 conversaciones listas)
```

---

## 2️⃣ BACKEND DEV - Conversational Engine (FASE 1.2)

**Cuándo usar**: Después de FASE 1.1, implementar core del chat engine

**Tiempo estimado**: 12-16 horas

**Prompt**:
```
Implementar Conversational Chat Engine (FASE 1.2) - Core del sistema conversacional.

CONTEXTO:
- Especificaciones: /Users/oneill/Sites/apps/MUVA/plan.md líneas 140-260
- Tareas: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 47-79
- Engine mantiene contexto conversacional y genera respuestas con Claude Sonnet 3.5

ARCHIVOS A CREAR:

1. /src/app/api/guest/chat/route.ts
   - POST /api/guest/chat
   - JWT authentication middleware
   - Rate limiting
   - Body: { message }
   - Response: { response, entities, followUpSuggestions, sources }

2. /src/lib/conversational-chat-engine.ts
   - generateConversationalResponse() - Main engine
   - loadConversationHistory() - Últimos 10 mensajes
   - extractEntities() - Entity tracking
   - performContextAwareSearch() - Vector search con entity boosting
   - retrieveFullDocument() - Load completo cuando confidence > 0.7
   - generateResponseWithClaude() - Claude Sonnet 3.5 integration
   - generateFollowUpSuggestions() - Sugerir próximas preguntas

3. /src/lib/context-enhancer.ts
   - enhanceQuery() - Expandir queries ambiguas
   - Follow-up detection
   - Query expansion con Claude Haiku (rápido)
   - Entity extraction de historial
   - Confidence scoring

FLUJO DEL ENGINE (ver plan.md líneas 145-171):
1. DECODE TOKEN → conversation_id
2. LOAD HISTORY → Últimos 10 mensajes
3. EXTRACT ENTITIES → ["Blue Life Dive", "buceo"]
4. ENHANCE QUERY → "¿cuánto cuesta?" → "¿cuánto cuesta certificación Blue Life Dive?"
5. VECTOR SEARCH → accommodation_units + muva_content
6. RETRIEVE FULL DOCS → Cuando confidence > 0.7
7. LLM RESPONSE → Claude Sonnet 3.5
8. PERSIST MESSAGES → Save user + assistant
9. RETURN RESPONSE → Natural language + follow-ups

LLM: Claude Sonnet 3.5 ($0.006/query promedio)
Tests: Unit + integration requeridos
```

---

## 3️⃣ DATABASE AGENT - Migrations & Monitoring (FASE 1.3)

**Cuándo usar**: Después de backend crear migrations, validar DB setup

**Tiempo estimado**: 6-8 horas

**Prompt**:
```
Ejecutar y validar Database Migrations para Guest Chat System (FASE 1.3).

REFERENCIA:
- Especificaciones: /Users/oneill/Sites/apps/MUVA/plan.md líneas 306-439
- Tareas: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 83-122
- Instrucciones agente: /Users/oneill/Sites/apps/MUVA/.claude/agents/database-agent.md líneas 13-408

MIGRATIONS A VALIDAR:

1. add_guest_chat_indexes.sql
   - idx_chat_messages_conversation_created
   - idx_chat_messages_metadata_entities (GIN)
   - idx_chat_conversations_reservation
   - idx_guest_reservations_auth

   ACCIÓN: Verificar creación exitosa con query de validación (plan.md líneas 324-350)

2. add_guest_chat_rls.sql
   - RLS Policy: Guests solo ven sus conversaciones
   - RLS Policy: Guests solo ven sus mensajes
   - RLS Policy: Staff ve conversaciones de su tenant

   ACCIÓN: Testear policies con diferentes roles

3. add_get_full_document_function.sql
   - Function: get_full_document(source_file, table_name)
   - Support: muva_content (concat chunks)
   - Support: accommodation_units (full description)

   ACCIÓN: Test de performance (<100ms)

POST-MIGRATION MONITORING:
- Metadata integrity (NULL < 5%)
- Performance baseline (<50ms message retrieval)
- Index usage (>80% utilization)
- Alert setup para anomalías

EJECUTAR QUERIES DE VALIDACIÓN (database-agent.md líneas 125-150)
```

---

## 4️⃣ UX AGENT - Guest Login & Chat UI (FASE 1.4)

**Cuándo usar**: Backend APIs listas, crear interfaz visual completa

**Tiempo estimado**: 10-14 horas

**Prompt**:
```
Crear interfaz visual completa del Guest Chat System (FASE 1.4).

REFERENCIA:
- Especificaciones UX detalladas: /Users/oneill/Sites/apps/MUVA/.claude/agents/ux-interface.md líneas 320-595
- Tareas: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 126-160
- Design specs: /Users/oneill/Sites/apps/MUVA/plan.md líneas 444-570

COMPONENTES A CREAR:

1. /src/components/Chat/GuestLogin.tsx
   FEATURES:
   - Form: Date picker (check-in) + phone input (4 dígitos con mask "•••• XXXX")
   - Validaciones en tiempo real
   - Loading state elegante durante autenticación
   - Error messages claros ("Reserva no encontrada")
   - Soporte multi-idioma (ES/EN)
   - Mobile-first responsive (320-768px)

2. /src/components/Chat/GuestChatInterface.tsx
   LAYOUT (ver ux-interface.md líneas 353-368):
   ┌─────────────────────────────────────┐
   │ Header: [Guest name] [Logout]      │
   ├─────────────────────────────────────┤
   │ Entity Badges: 🤿 Blue Life Dive   │
   ├─────────────────────────────────────┤
   │ Messages Area (scroll auto-bottom) │
   │ [User msg →]    [← Assistant msg]  │
   ├─────────────────────────────────────┤
   │ Follow-up chips: [¿Precio?] [Más?] │
   ├─────────────────────────────────────┤
   │ Input: [Auto-expand textarea] [📤] │
   └─────────────────────────────────────┘

   FEATURES:
   - Message display: User (derecha, azul) vs Assistant (izquierda, gris)
   - Auto-scroll to bottom cuando llega nuevo mensaje
   - Typing indicator animado durante espera
   - Entity badges clickable con animación de entrada
   - Follow-up suggestion chips clickables
   - Input area: Auto-expand textarea (max 5 líneas)
   - Keyboard handling: Enter = send, Shift+Enter = newline
   - History loading: Skeleton screens
   - Error handling: Retry button
   - Accessibility: ARIA labels, keyboard navigation

3. Componentes auxiliares:
   - EntityBadge.tsx (pills con iconos, hover tooltips)
   - FollowUpSuggestions.tsx (horizontal scroll chips)

ANIMACIONES (ver ux-interface.md líneas 430-451):
- Message entrada: translateY(10px) → 0
- Typing indicator: pulsing dots
- Entity badge: scale(0.8) → 1

RESPONSIVE:
- Mobile (320-768px): Sticky input bottom, full-width bubbles
- Tablet (768-1024px): 2-column possible
- Desktop (1024px+): Centered (max-width: 900px)

BACKEND YA CREÓ:
- POST /api/guest/login → { token, conversation_id, guest_info }
- POST /api/guest/chat → { response, entities, followUpSuggestions, sources }
- GET /api/guest/chat/history → { messages }

NO CREAR: Page routing (/src/app/guest-chat/[tenant_id]/page.tsx) - Backend responsibility

QUALITY TARGETS:
- First Contentful Paint: <1.5s
- Message render: <50ms
- Animation: 60fps
- Touch targets: 44x44px min (mobile)
```

---

## 5️⃣ FULL TEAM - Testing & Validation (FASE 1.5)

**Cuándo usar**: Sistema completo implementado, validar todo

**Tiempo estimado**: 8-10 horas

**Prompt**:
```
Validar sistema Guest Chat completo (FASE 1.5) - Testing & Validation.

REFERENCIA: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 164-200

DIVISIÓN DE RESPONSABILIDADES:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND DEV - Unit & Integration Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unit Tests (Coverage >80%):
- guest-auth.ts: Autenticación, JWT generation/verification
- conversational-chat-engine.ts: Entity extraction, query enhancement, follow-ups
- context-enhancer.ts: Follow-up detection, query expansion

Integration Tests (Coverage >70%):
- /api/guest/login: Happy path + error cases (reserva no encontrada, expirada)
- /api/guest/chat: Full conversational flow con context preservation
- Database functions: get_full_document() performance

Setup: Jest + Supertest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UX AGENT - E2E Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

E2E Tests con Playwright:
- Guest login flow completo (date picker + phone input → success)
- Send message + receive response con typing indicator
- Follow-up conversation con context preservation
- Error scenarios:
  * Invalid credentials → Clear error message
  * Network errors → Retry button visible
  * Session expiration → Re-login prompt
- Mobile device testing (viewport 375x667, 414x896)

Setup: Playwright configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE AGENT - Performance & Integrity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validaciones:
- Performance de history queries (<50ms para últimos 10 mensajes)
- Metadata integrity (NULL < 5% de chat_messages.metadata)
- Index usage monitoring (>80% para indexes críticos)
- Alert setup funcional para anomalías

Queries: Ver database-agent.md líneas 152-258

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUCCESS CRITERIA:
✅ All unit tests passing (>80% coverage)
✅ All integration tests passing (>70% coverage)
✅ All E2E tests passing
✅ Performance baselines met
✅ Zero critical bugs
```

---

## 6️⃣ UX AGENT - Enhanced UX Features (FASE 2 COMPLETA)

**Cuándo usar**: FASE 1 completa, mejorar experiencia de usuario

**Tiempo estimado**: 26-33 horas total (4 subsecciones)

**Prompt**:
```
Implementar FASE 2 completa: Enhanced UX Features.

CONTEXTO:
- FASE 2 es COMPLETAMENTE ownership del UX Agent
- Referencias:
  * Agent specs: /Users/oneill/Sites/apps/MUVA/.claude/agents/ux-interface.md líneas 526-533
  * Tareas: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 204-258
  * Plan: /Users/oneill/Sites/apps/MUVA/plan.md líneas 611-684

SUBSECCIÓN 2.1: Follow-up Suggestion System (4-6 horas)
- Algoritmo mejorado basado en entities mencionadas
- UI variations A/B testing
- Visual feedback de click-through rates
Backend necesita: Analytics tracking de clicks

SUBSECCIÓN 2.2: Entity Tracking Display (4-5 horas)
- Badges animados con entrada staggered
- Timeline visual de entidades (qué se habló cuándo)
- Quick jump a mensajes relacionados
- Clear context button con animación
- Hover effects y tooltips

SUBSECCIÓN 2.3: Mobile Optimization (8-10 horas)
UX Agent:
- Voice input UI (Web Speech API)
- Pull-to-refresh gesture y animación
- Offline mode UI (Service Workers)
- Share conversation UI (screenshot/link)
- PWA manifest completo
Backend necesita: Push notifications backend, caching strategy

SUBSECCIÓN 2.4: Rich Media Support (10-12 horas)
UX Agent:
- Image upload UI component (drag-and-drop)
- Gallery display component con lazy loading
- Map integration UI (location display)
- PDF/document preview component
Backend necesita: Claude Vision API, Supabase storage, image processing

PUEDES TRABAJAR EN SUBSECCIONES DE MANERA INDEPENDIENTE O COMPLETA.
```

---

## 7️⃣ DATABASE AGENT - Proactive Monitoring

**Cuándo usar**: Sistema en producción, monitoreo continuo

**Tiempo estimado**: Ongoing (automated)

**Prompt**:
```
Ejecutar monitoring proactivo del Guest Chat System.

REFERENCIA: /Users/oneill/Sites/apps/MUVA/.claude/agents/database-agent.md líneas 152-408

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Validar entity tracking quality (database-agent.md líneas 156-167):
   - Query: Entity coverage por día últimos 7 días
   - ALERT si entity_coverage_pct < 70%

2. Message persistence health (database-agent.md líneas 170-181):
   - Query: NULL metadata count últimas 24 horas
   - ALERT si null_metadata_pct > 5%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEKLY TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Conversation growth trends (database-agent.md líneas 185-199):
   - Query: New conversations + avg messages per conversation
   - Identify growth patterns

2. Performance trending (database-agent.md líneas 202-217):
   - Query: Response times (avg, p95) últimos 7 días
   - ALERT si p95_response_time > 3000ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MONTHLY TASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Message metadata analytics (database-agent.md líneas 220-233):
   - Query: Cost por intent type últimos 30 días
   - Compare con budget proyectado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMMEDIATE ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trigger human intervention si:
- NULL metadata > 5% en nuevos mensajes
- Message persistence failures
- Performance degradation > 50% (p95 > 4.5s)
- Entity tracking quality < 50%
- Index usage < 80% para indexes críticos

EJECUTAR: Health check queries según frecuencia
REPORTAR: Cualquier anomalía detectada
PROACTIVO: Sugerir optimizaciones cuando sea necesario
```

---

## 8️⃣ QUICK START - Sistema Completo (All Phases)

**Cuándo usar**: Iniciar proyecto desde cero, overview completo

**Tiempo estimado**: 5-8 semanas (3 fases)

**Prompt**:
```
Iniciar desarrollo del Sistema Conversacional Guest Chat - Overview completo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Desarrollar asistente AI conversacional con memoria persistente que permita a huéspedes:
- Autenticarse con check-in date + teléfono
- Mantener conversaciones con contexto completo
- Recibir recomendaciones personalizadas (hotel + turismo)
- Continuar conversaciones a través del tiempo

REFERENCIAS COMPLETAS:
- Plan maestro: /Users/oneill/Sites/apps/MUVA/plan.md (1,047 líneas)
- Tareas detalladas: /Users/oneill/Sites/apps/MUVA/TODO.md (605 líneas)
- UX Agent: /Users/oneill/Sites/apps/MUVA/.claude/agents/ux-interface.md
- Database Agent: /Users/oneill/Sites/apps/MUVA/.claude/agents/database-agent.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW RECOMENDADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FASE 1: Core Conversacional (2-3 semanas)
├─ 1.1 Backend: Guest Authentication (4-6h)
├─ 1.2 Backend: Conversational Engine (12-16h)
├─ 1.3 Database Agent: Migrations & Monitoring (6-8h)
├─ 1.4 UX Agent: Guest Login & Chat UI (10-14h)
└─ 1.5 All: Testing & Validation (8-10h)
   Total: 40-54 horas

FASE 2: Enhanced UX (1-2 semanas)
├─ 2.1 UX: Follow-up Suggestions (4-6h)
├─ 2.2 UX: Entity Tracking Display (4-5h)
├─ 2.3 UX: Mobile Optimization (8-10h)
└─ 2.4 UX: Rich Media Support (10-12h)
   Total: 26-33 horas

FASE 3: Intelligence & Integration (2-3 semanas)
├─ 3.1 Backend: Proactive Recommendations (8-10h)
├─ 3.2 Backend: Booking Integration (12-16h)
├─ 3.3 Backend: Multi-language (6-8h)
└─ 3.4 UX+DB+Backend: Staff Dashboard (12-15h)
   Total: 38-49 horas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFRAESTRUCTURA EXISTENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ guest_reservations (8 huéspedes activos)
✅ chat_conversations (4 conversaciones iniciadas)
✅ chat_messages (tabla lista, 0 mensajes)
✅ Embeddings Matryoshka (accommodation + MUVA tourism)
✅ Multi-tenant architecture
✅ Vector search funcionando (10x performance improvement)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODELO LLM & COSTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claude Sonnet 3.5:
- $0.006/query promedio
- $18/mes por tenant (100 queries/día)
- ROI: ~18% del revenue (asumiendo $100/mes por tenant)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPS PARA DESARROLLO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Trabajar en PARALELO cuando sea posible
✅ Backend dev NO toca UI (UX Agent ownership)
✅ Database Agent monitorea proactivamente
✅ Usar prompts específicos de este documento para cada fase
✅ Revisar TODO.md regularmente para tracking
✅ Tests son OBLIGATORIOS (no opcionales)

PRÓXIMO PASO: Usar Prompt #1 (Backend Dev - Guest Authentication System)
```

---

## 9️⃣ MAINTENANCE - Database Health (URGENTE)

**Cuándo usar**: Tablas con dead tuples, performance degradation

**Tiempo estimado**: 2 horas

**Prompt**:
```
Ejecutar Database Health Maintenance - VACUUM FULL (Prioridad #2).

PROBLEMA: Tablas con >75% dead tuples afectando performance

REFERENCIA: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 331-343

EJECUTAR:

1. VACUUM FULL public.muva_content
   - Estado actual: 92% dead tuples (49 dead / 4 live)
   - Impacto esperado: Mejora search performance de MUVA tourism

2. VACUUM FULL public.sire_content
   - Estado actual: 80% dead tuples (33 dead / 8 live)
   - Impacto esperado: Mejora search performance de SIRE compliance

3. VACUUM FULL hotels.guest_information
   - Estado actual: 75% dead tuples (37 dead / 12 live)
   - Impacto esperado: Mejora guest data queries

POST-VACUUM:
- Verificar resultados con pg_stat_user_tables
- Confirmar reducción de dead tuples
- Validar que search performance mejoró
- Schedule VACUUM regular (weekly)

EJECUTAR EN ESTE ORDEN para minimizar downtime.
```

---

## 🔟 SPECIALIZED - MUVA Listings Expansion

**Cuándo usar**: Expandir contenido turístico, procesamiento batch

**Tiempo estimado**: 6-8 horas

**Prompt**:
```
Procesar MUVA Listings pendientes para completar contenido turístico.

ESTADO ACTUAL: 1 listing procesado (Blue Life Dive), 37 listings restantes

REFERENCIA: /Users/oneill/Sites/apps/MUVA/TODO.md líneas 362-443

COMANDO:
node scripts/populate-embeddings.js _assets/muva/listings/[categoria]/[archivo].md

CATEGORÍAS A PROCESAR:

Actividades (11 pendientes):
- banzai-surf-school.md
- buceo-caribe-azul.md
- caribbean-xperience.md
- hans-dive-shop.md
- maria-raigoza.md
- marino-parasail.md
- richie-parasail.md
- sai-xperience.md
- seawolf.md
- yoga-san-andres.md

Restaurantes (6 pendientes):
- aqua.md, bali-smoothies.md, coral-creppes.md
- el-totumasso.md, seaweed.md, tierra-dentro.md

Spots (16 pendientes):
- Ver TODO.md líneas 391-409

Alquileres (3): da-black-almond.md, eco-xtreme-san-andres.md, seawolf-7.md
Nightlife (1): caribbean-nights.md

QUALITY CONTROL POST-PROCESAMIENTO:
- Verificar business_info completo (precio, teléfono, zona, website)
- Confirmar embeddings Tier 1 (1024d) + Tier 3 (3072d) generados
- Validar chunks apropiados (5-7 por documento típico)

TEST SEARCHES:
- "restaurantes en San Andrés"
- "buceo certificación PADI"
- "actividades en Centro"
- "tours económicos"

PROCESAMIENTO RECOMENDADO: Batch por categoría para eficiencia.
```

---

## 📌 NOTAS IMPORTANTES

### **Ownership Labels en Prompts**:
- 🎨 **UX Agent**: Todo UI/UX, animaciones, responsive design
- 🤖 **Database Agent**: Migrations, monitoring, queries, performance
- **Backend Developer**: APIs, auth, engine logic, integrations

### **Referencias Siempre Incluyen**:
- Ruta absoluta del archivo
- Líneas específicas para contexto rápido
- Ownership claro de quién hace qué

### **Trabajo en Paralelo**:
Mientras Backend Dev trabaja en Engine (FASE 1.2), Database Agent puede preparar migrations (FASE 1.3), y luego UX Agent crear UI (FASE 1.4) cuando APIs estén listas.

### **Tests NO Opcionales**:
Cada fase requiere tests según especificaciones. Coverage targets:
- Unit tests: >80%
- Integration tests: >70%
- E2E tests: Critical paths

---

**✅ Todos los prompts están optimizados para copy-paste directo en nuevas conversaciones con Claude Code**
