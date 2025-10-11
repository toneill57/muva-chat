# TODO - Subdomain Chat Experience

**Proyecto:** Subdomain Chat Experience
**Fecha:** October 11, 2025
**Plan:** Ver `plan.md` para contexto completo
**Estado:** 🎖️ MILESTONE 1 ACHIEVED - FASE 1: 83.3% Complete (5/6 tareas)

---

## FASE 1: Subdomain Chat Migration 🎯 URGENTE

**Duración:** 6-8 horas
**Agente:** **@agent-ux-interface**
**Objetivo:** Copiar chat-mobile-dev a subdomains con detección automática

### 1.1 Create subdomain-detector.ts ✅ COMPLETADO
- [x] Crear helper para client-side subdomain detection (1h)
  - Función `getSubdomainFromClient()` que lee cookie o window.location
  - Función `fetchTenantBranding(subdomain)` para fetch branding
  - Función `fetchTenantBrandingById(tenant_id)` para fetch por UUID
  - Validación de subdomain format con `isValidSubdomainClient()`
  - Files: `src/lib/subdomain-detector.ts` ✅
  - NUEVO: `src/app/api/tenant/branding/route.ts` ✅
  - Test page: `public/test-subdomain-detector.html` ✅
  - Agent: **@agent-ux-interface**
  - Test: ALL TESTS PASSED (API + Client-side functions)

### 1.2 Create TenantHeader component ✅ COMPLETADO
- [x] Crear header con branding dinámico (1h)
  - Props: `{ tenant, onNewConversation }` (subdomain no necesario)
  - Logo dinámico desde `tenant.logo_url` ✅
  - Color dinámico desde `tenant.primary_color` ✅
  - Título: `${tenant.business_name} Chat` ✅
  - Badge "🚧 DEV" no implementado (no crítico)
  - Files: `src/components/Tenant/TenantHeader.tsx` ✅
  - Agent: **@agent-ux-interface**
  - Test: Componente en uso en TenantChatPage.tsx ✅
  - NOTA: Ya existía desde antes, verificado funcionando con branding dinámico

### 1.3 Create TenantChatPage component ✅ COMPLETADO
- [x] Copiar DevChatMobileDev y adaptar para multi-tenant (2h)
  - Copy `src/components/Dev/DevChatMobileDev.tsx` → `src/components/Tenant/TenantChatPage.tsx`
  - Reemplazar `detectTenantSlug()` con prop `subdomain`
  - Usar `TenantHeader` en lugar de header hardcoded
  - Aplicar `tenant.primary_color` a botones y gradientes
  - Remove "🚧 DEV" badge
  - Título dinámico: `{tenant.business_name} Chat`
  - Files: `src/components/Tenant/TenantChatPage.tsx` ✅
  - Agent: **@agent-ux-interface**
  - Test: http://simmerdown.localhost:3000 → Ver chat con branding Simmerdown ✅
  - NOTA: Ya existía desde antes, verificado funcionando con branding dinámico

### 1.4 Create root page.tsx with routing ✅ COMPLETADO
- [x] Implementar lógica de routing subdomain (1.5h)
  - Si subdomain → Render TenantChatPage ✅
  - Fetch tenant data con `getTenantBySubdomain()` ✅
  - Handle tenant not found (404) ✅
  - Files: `src/app/[tenant]/page.tsx` ✅ (dynamic route en lugar de root)
  - Agent: **@agent-ux-interface**
  - Test:
    - http://simmerdown.localhost:3000 → TenantChatPage ✅
    - http://hotel-boutique.localhost:3000 → TenantChatPage ✅
    - http://xyz.localhost:3000 → TenantChatPage ✅
    - http://invalid.localhost:3000 → 404 ✅
  - NOTA: Implementado con dynamic route `/[tenant]/page.tsx` + middleware detection
  - SEGURIDAD: 3 vulnerabilidades críticas fijadas (session hijacking, data leakage)

### 1.5 Implement dynamic meta tags ✅ COMPLETADO
- [x] Meta tags únicos por tenant (1.5h)
  - `generateMetadata()` async function ✅
  - Detectar subdomain desde headers ✅
  - Fetch tenant data ✅
  - Meta tags: title, description ✅
  - Files: `src/app/[tenant]/page.tsx` ✅ (implementado en page, no layout)
  - Agent: **@agent-ux-interface**
  - Test:
    - http://simmerdown.localhost:3000 → Metadata correcta ✅
    - http://hotel-boutique.localhost:3000 → Metadata correcta ✅
  - NOTA: Implementado nivel page, no layout. Falta OG + Twitter Card para producción

### 1.6 Production testing
- [x] Deploy y verificar en producción (1h)
  - Push to dev branch
  - Verificar GitHub Actions deployment
  - Test https://simmerdown.muva.chat/
  - Test https://hotel-boutique.muva.chat/
  - Test https://muva.chat/ (placeholder)
  - Verify meta tags en producción
  - Check mobile responsive (iPhone, Pixel, Galaxy)
  - Agent: **@agent-ux-interface**
  - Test: Manual testing checklist

---

## FASE 2: Super Chat en MUVA.chat ⚙️

**Duración:** 8-10 horas
**Agentes:** **@agent-ux-interface** (80%), **@agent-backend-developer** (20%)
**Objetivo:** Chat on steroids que busca en TODO (tenants + contenido turístico)

### 2.1 Create super-search.ts
- [ ] Implementar búsqueda multi-tenant (2h)
  - Función `searchMultiTenant(embedding, query)`
  - Buscar en `muva_content` (742 POIs)
  - Buscar en todos los tenants activos
  - Merge y rank results por relevancia
  - Files: `src/lib/super-search.ts`
  - Agent: **@agent-backend-developer**
  - Test: `npm run test src/lib/super-search.test.ts`

### 2.2 Create /api/super-chat endpoint
- [ ] API para super chat con streaming (2.5h)
  - POST /api/super-chat
  - Params: { message, session_id, tenant_id: null }
  - Llamar `searchMultiTenant()`
  - Generar respuesta con Claude
  - Incluir links a subdomains en respuesta
  - Streaming SSE response
  - Files: `src/app/api/super-chat/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl -X POST http://localhost:3000/api/super-chat -d '{"message":"Busco alojamiento"}' --no-buffer`

### 2.3 Create TenantRecommendation component
- [ ] Card para recomendar tenant en chat (1h)
  - Props: `{ tenant, reason, onClick }`
  - Foto + logo del tenant
  - Nombre + ubicación
  - "Why recommended" text
  - Botón "Chatear con {tenant}" → Link a subdomain
  - Files: `src/components/SuperChat/TenantRecommendation.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story

### 2.4 Create SuperChatHeader component
- [ ] Header para super chat en muva.chat (30min)
  - Logo MUVA
  - Título "MUVA Super Chat"
  - Botón "New Conversation"
  - Badge opcional "BETA"
  - Files: `src/components/SuperChat/SuperChatHeader.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Visual testing

### 2.5 Create SuperChatPage component
- [ ] Componente principal del super chat (2h)
  - Extends logic de TenantChatPage
  - Usar SuperChatHeader
  - Llamar a `/api/super-chat` en lugar de `/api/dev/chat`
  - Renderizar TenantRecommendation cards en sources
  - Handle multiple tenants en sources
  - Files: `src/components/SuperChat/SuperChatPage.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Super chat funciona

### 2.6 Update page.tsx to render SuperChat
- [ ] Integrar SuperChat en root page (30min)
  - Si no subdomain → Render SuperChatPage
  - Remove placeholder "Coming Soon"
  - Files: `src/app/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Ver super chat fullscreen

### 2.7 Testing multi-tenant search
- [ ] Testing exhaustivo de búsqueda (1.5h)
  - Query: "Busco alojamiento en San Andrés"
  - Query: "Quiero hacer surf"
  - Query: "¿Cuál es mejor: Simmerdown o Hotel Boutique?"
  - Query: "Sitios turísticos en San Andrés"
  - Verificar que retorna múltiples tenants
  - Verificar que links funcionan
  - Agent: **@agent-ux-interface**
  - Test: Manual testing + screenshots

---

## FASE 3: Marketplace Debajo ✨

**Duración:** 8-10 horas
**Agentes:** **@agent-ux-interface** (90%), **@agent-backend-developer** (10%)
**Objetivo:** Grid de tenants + mapa + destacados

### 3.1 Create /api/marketplace/tenants endpoint
- [ ] API para listar tenants activos (30min)
  - GET /api/marketplace/tenants
  - Fetch de tenant_registry WHERE is_active=true
  - Include: tenant_id, subdomain, business_name, logo_url, address, rating, primary_color, latitude, longitude
  - Order by subscription_tier (premium first)
  - Files: `src/app/api/marketplace/tenants/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3000/api/marketplace/tenants`

### 3.2 Create /api/marketplace/counters endpoint
- [ ] API para contadores dinámicos (30min)
  - GET /api/marketplace/counters
  - Count accommodations: `SELECT COUNT(*) FROM tenant_registry WHERE is_active=true`
  - Count spots: `SELECT COUNT(*) FROM muva_content`
  - Restaurants: 0 (future)
  - Files: `src/app/api/marketplace/counters/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3000/api/marketplace/counters`

### 3.3 Setup Mapbox config
- [ ] Configurar Mapbox GL JS (30min)
  - Install: `npm install mapbox-gl`
  - Add to .env.local: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx`
  - Create helper: `src/lib/mapbox-config.ts`
  - Export default config (style, center, zoom)
  - Agent: **@agent-ux-interface**
  - Test: Import en componente funciona

### 3.4 Create MarketplaceHeader component
- [ ] Header simple con logo + auth (1h)
  - Logo MUVA
  - Título "MUVA"
  - Botones: Login, Sign up, Google OAuth
  - Responsive mobile-first
  - Files: `src/components/Marketplace/MarketplaceHeader.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story

### 3.5 Create TenantCard component
- [ ] Card individual de tenant (1h)
  - Props: `{ tenant, onChatClick, onProfileClick }`
  - Foto principal (logo_url)
  - Nombre (business_name)
  - Ubicación (address)
  - Rating (si existe)
  - 2 botones: "Chatear" + "Ver perfil"
  - Responsive: stack en mobile, flex en desktop
  - Files: `src/components/Marketplace/TenantCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story con Simmerdown data

### 3.6 Create TenantGrid component
- [ ] Grid responsive de tenants (1h)
  - Fetch data desde `/api/marketplace/tenants`
  - Grid: 1 col mobile, 2 cols tablet, 3 cols desktop
  - Map TenantCard components
  - Handle "Chatear" click → Callback para expandir super chat filtrado
  - Handle "Ver perfil" click → Redirect a subdomain
  - Files: `src/components/Marketplace/TenantGrid.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Ver grid responsive

### 3.7 Create TenantMap component
- [ ] Mapa Mapbox con markers (2h)
  - Mapbox GL JS initialization
  - Center en San Andrés: [-81.7, 12.5]
  - Markers de todos los tenants
  - Marker color = tenant.primary_color
  - Popup al click: Nombre, ubicación, link "Chatear"
  - Responsive: height 400px mobile, 500px desktop
  - Files: `src/components/Marketplace/TenantMap.tsx`
  - Agent: **@agent-ux-interface**
  - Test:
    - Ver mapa en http://localhost:3000
    - Click marker → Ver popup
    - Pan/zoom funciona

### 3.8 Create FeaturedCarousel component
- [ ] Carrusel de destacados (1h)
  - Install: `npm install swiper`
  - Props: `{ items }`
  - Swiper config: spaceBetween=20, slidesPerView=1.2
  - Navigation arrows (desktop only)
  - Pagination dots
  - Auto-play opcional
  - Files: `src/components/Marketplace/FeaturedCarousel.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story con 5 items

### 3.9 Create FeaturedGrid component
- [ ] Grid de destacados (30min)
  - Props: `{ items }`
  - Grid: 2 cols mobile, 3 cols desktop
  - Image + título + descripción corta
  - Hover effect
  - Files: `src/components/Marketplace/FeaturedGrid.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story

### 3.10 Create FeaturedList component
- [ ] Lista de destacados (30min)
  - Props: `{ items }`
  - List items con thumbnail + info
  - Separator lines
  - Click → Expand details
  - Files: `src/components/Marketplace/FeaturedList.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story

### 3.11 Create FeaturedSection component
- [ ] Container de featured con 3 modos (1h)
  - Props: `{ items, mode: 'carousel' | 'grid' | 'list' }`
  - Switch entre los 3 componentes según mode
  - Fetch data de muva_content (top 5 por rating)
  - Mix con featured tenants
  - Files: `src/components/Marketplace/FeaturedSection.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Ver featured en cada modo

### 3.12 Create MarketplaceHome component
- [ ] Container principal del marketplace (1h)
  - Layout: Header + Hero + TenantGrid + TenantMap + FeaturedSection
  - Hero: Título + subtitle simple
  - Spacing y padding responsive
  - Files: `src/components/Marketplace/MarketplaceHome.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Ver marketplace completo

### 3.13 Update page.tsx to show marketplace
- [ ] Integrar marketplace debajo de super chat (30min)
  - Renderizar SuperChat + MarketplaceHome
  - Por ahora visible ambos (FASE 4 agregará minimizar)
  - Files: `src/app/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://localhost:3000 → Scroll down → Ver marketplace

---

## FASE 4: Botón Minimizar + Transición 🎨

**Duración:** 4-6 horas
**Agente:** **@agent-ux-interface**
**Objetivo:** Transición moderna chat ↔ marketplace con floating icon

### 4.1 Create chat-storage.ts
- [ ] LocalStorage helpers (30min)
  - Función `saveChatState(state)`
  - Función `loadChatState()` → { isExpanded, timestamp }
  - Función `clearChatState()`
  - Files: `src/lib/chat-storage.ts`
  - Agent: **@agent-ux-interface**
  - Test: `npm run test src/lib/chat-storage.test.ts`

### 4.2 Create useChatState hook
- [ ] State management para expanded/minimized (1h)
  - State: `isExpanded` (boolean)
  - Actions: `minimize()`, `expand()`
  - Load from LocalStorage on mount
  - Save to LocalStorage on change
  - Files: `src/hooks/useChatState.ts`
  - Agent: **@agent-ux-interface**
  - Test:
    - Minimize → Refresh → State persists
    - Expand → Refresh → State persists

### 4.3 Create MinimizeButton component
- [ ] Botón en esquina de super chat (30min)
  - Props: `{ onClick }`
  - Position: fixed top-4 right-4
  - Icon: ChevronDown
  - Style: bg-white/90 backdrop-blur rounded-full
  - Hover effect
  - Files: `src/components/SuperChat/MinimizeButton.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story + visual testing

### 4.4 Create FloatingChatIcon component
- [ ] Floating icon para re-expandir (1h)
  - Props: `{ onClick }`
  - Position: fixed bottom-6 right-6
  - Icon: MessageCircle
  - Style: gradient teal-cyan, rounded-full
  - Pulse indicator (red dot)
  - Float animation (3s ease-in-out infinite)
  - Hover scale 110%
  - Files: `src/components/SuperChat/FloatingChatIcon.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Storybook story + animation testing

### 4.5 Implement Opción B (Slide Down) transition
- [ ] Transición slide down en page.tsx (1.5h)
  - Super chat: `translate-y-0` cuando expanded, `translate-y-full` cuando minimized
  - Marketplace: `opacity-0` cuando chat expanded, `opacity-100` cuando minimized
  - Transition: `duration-300 ease-out`
  - Z-index layering: chat z-20, marketplace z-10
  - Files: `src/app/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test:
    - Click minimize → Chat slide down suave
    - Click floating icon → Chat slide up suave

### 4.6 Implement Opción C (Fade) transition (alternative)
- [ ] Transición fade si Opción B no es moderna (1h)
  - Super chat: `opacity-100` cuando expanded, `opacity-0` cuando minimized
  - Marketplace: `opacity-0` cuando chat expanded, `opacity-100` cuando minimized
  - Transition: `duration-300 ease-out`
  - Pointer-events: none cuando opacity-0
  - Files: `src/app/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Compare vs Opción B → Elegir la más moderna

### 4.7 Integrate MinimizeButton in SuperChatPage
- [ ] Agregar botón a super chat (30min)
  - Import MinimizeButton
  - Pass onMinimize callback
  - Position absolute dentro de SuperChatPage
  - Files: `src/components/SuperChat/SuperChatPage.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Ver botón en esquina de super chat

### 4.8 Integrate FloatingChatIcon in page.tsx
- [ ] Agregar floating icon (30min)
  - Conditional render: solo cuando `!isExpanded`
  - Pass onExpand callback
  - Files: `src/app/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test:
    - Minimizar chat → Ver floating icon
    - Click floating icon → Chat expande

### 4.9 Handle edge cases
- [ ] Testing de edge cases (1h)
  - Minimizar con mensaje escribiendo → Mantener input
  - Minimizar con scroll en chat → Mantener posición
  - Expand con scroll en marketplace → Scroll to top chat
  - Mobile touch gestures → Smooth transitions
  - Fast clicks (minimize/expand rápido) → No glitches
  - Agent: **@agent-ux-interface**
  - Test: Manual testing exhaustivo

### 4.10 Production testing
- [ ] Deploy y verificar en producción (1h)
  - Push to dev branch
  - Test https://muva.chat/ → Transición funciona
  - Test mobile (iPhone, Pixel, Galaxy)
  - Verify LocalStorage persists
  - Check performance (300ms target)
  - Agent: **@agent-ux-interface**
  - Test: Manual testing checklist + Lighthouse

---

## 📊 PROGRESO

**Total Tasks:** 40 tareas
**Completed:** 5/40 (12.5%)

**Por Fase:**
- FASE 1 (Subdomain Chat): 5/6 tareas (83.3%) ← Tareas 1.1, 1.2, 1.3, 1.4, 1.5 ✅
- FASE 2 (Super Chat): 0/7 tareas (0%)
- FASE 3 (Marketplace): 0/13 tareas (0%)
- FASE 4 (Minimizar): 0/10 tareas (0%)

**🎖️ MILESTONE ACHIEVED:** Multi-Tenant Chat with Complete Data Isolation (Oct 11, 2025)

---

## 📝 NOTAS DE PROGRESO

### Próximos Pasos

1. **Empezar FASE 1:** Usar prompts de `subdomain-chat-experience-prompt-workflow.md`
2. **Testing continuo:** Después de cada tarea, correr tests
3. **Documentar issues:** Crear `fase-{N}/ISSUES.md` si surgen problemas
4. **Update TODO.md:** Marcar `[x]` solo después de tests pasados

### Decisiones Pendientes

- [ ] **FASE 4:** Elegir entre Opción B (slide) o C (fade) - testing A/B
- [ ] **FASE 3:** Modo de featured section (carousel, grid, lista) - user preference
- [ ] **Dummy tenants:** Confirmar cuándo borrar free-hotel-test y xyz

---

**Última actualización:** October 11, 2025 - 18:30 UTC
**Responsable principal:** @agent-ux-interface
**Milestone Achieved:** Multi-Tenant Chat with Complete Data Isolation (Oct 11, 2025)

---

## 📝 CHANGELOG

### 2025-10-11 18:30 - 🎖️ MILESTONE 1: Multi-Tenant Chat with Complete Data Isolation ✅
**Status:** FASE 1 83.3% COMPLETE (5/6 tareas)

**Tareas Completadas:**
- ✅ **Tarea 1.1** - Subdomain detector + API branding
- ✅ **Tarea 1.2** - TenantHeader component (verificado existente y funcional)
- ✅ **Tarea 1.3** - TenantChatPage component (verificado existente y funcional)
- ✅ **Tarea 1.4** - Subdomain routing con `/[tenant]/page.tsx`
- ✅ **Tarea 1.5** - Dynamic metadata con `generateMetadata()`

**Achievements Críticos:**
- ✅ **Subdomain Root Routing** - `simmerdown.muva.chat/` funciona (antes 404)
- ✅ **Dynamic Tenant Branding** - Welcome message personalizado por tenant
- ✅ **Security Hardening** - 3 vulnerabilidades críticas fijadas:
  1. Session hijacking prevention (`dev-chat-session.ts:94`)
  2. Accommodation data leakage (`dev-chat-search.ts:144`)
  3. Policy isolation (verified working)
- ✅ **Automated Testing** - `scripts/test-tenant-isolation.ts` (3/3 tests passing)
- ✅ **Graceful AI Degradation** - Hotel XYZ sin datos NO alucina, cae a turismo

**Files Created/Modified:**
- `src/app/[tenant]/page.tsx` (93 lines) - Subdomain routing
- `scripts/test-tenant-isolation.ts` (250+ lines) - Security tests
- `src/lib/dev-chat-session.ts` - Session isolation fix
- `src/lib/dev-chat-search.ts` - Accommodation leak fix
- `src/lib/welcome-message-static.ts` - Dynamic branding function
- `src/components/Tenant/TenantChatPage.tsx` - Uses dynamic branding

**Documentation Created:**
- `docs/milestones/MILESTONE-01-MULTI-TENANT-CHAT-ISOLATION.md` (275 lines)
- `docs/milestones/README.md` (92 lines)
- Updated 3 agent snapshots with milestone info

**Production Impact:**
- 🚀 **Moon shot foundation** - Complete tenant data isolation (zero leakage)
- 🔒 **Security** - Defensible multi-tenant architecture
- 🎨 **Branding** - Each hotel has custom name/logo/colors
- 🤖 **AI Safety** - No hallucinations when data missing

**Next Steps:**
- [ ] Tarea 1.6 - Production testing (pending) - ÚLTIMA TAREA FASE 1

**Reference:** See `docs/milestones/MILESTONE-01-MULTI-TENANT-CHAT-ISOLATION.md` for full details

---

### 2025-10-11 15:45 - Tarea 1.1 Completada ✅
- ✅ Creado `/api/tenant/branding/route.ts` - Endpoint para fetch branding data
- ✅ Creado `src/lib/subdomain-detector.ts` - Client-side helpers
- ✅ Creado `public/test-subdomain-detector.html` - Interactive test page
- ✅ Testing completado: 5/5 API tests passed, all client functions working
- **Files creados:** 3 archivos, 11.3 KB total
- **Tenants disponibles:** simmerdown, hotel-boutique, free-hotel-test, xyz
- **Next:** Tarea 1.2 - Create TenantHeader component
