# Subdomain Chat Experience - Plan de Implementación

**Proyecto:** Subdomain Chat Experience
**Fecha Inicio:** October 11, 2025
**Estado:** 📋 Planificación Completa - Ready for FASE 1
**Duración Estimada:** 26-34 horas (4 fases)

---

## 🎯 OVERVIEW

### Objetivo Principal

Transformar la navegación de MUVA Chat en una experiencia centrada en el chat, donde:

1. **Subdomains de tenants** (simmerdown.muva.chat) → Chat directo fullscreen
2. **Domain principal** (muva.chat) → Super Chat on steroids + Marketplace minimizable

### ¿Por qué?

- ✅ **Conversión inmediata:** Usuario entra al subdomain y YA está conversando
- ✅ **Experiencia inmersiva:** Sin distracciones marketing, directo a vender
- ✅ **Descubrimiento inteligente:** muva.chat como directorio con super chat
- ✅ **Modern UX:** Chat minimizable con marketplace debajo

### Alcance

**FASE 1 (URGENTE):**
- Migrar chat-mobile-dev a subdomains
- Detección automática de subdomain
- Meta tags únicos por tenant

**FASE 2:**
- Super chat en muva.chat
- Búsqueda multi-tenant (todos los tenants + contenido turístico)
- Routing inteligente a subdomains

**FASE 3:**
- Marketplace debajo del chat
- Grid de tenants, mapa Mapbox, destacados
- Header con login/signup + Google OAuth

**FASE 4:**
- Botón minimizar con transición moderna
- Floating chat icon para re-expandir
- LocalStorage state management

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**✅ Lo que funciona:**
- Middleware de subdomain detection (`src/middleware.ts`)
- tenant_registry con datos completos (branding, SEO, contact)
- Chat mobile-dev funcionando (`/chat-mobile-dev`)
- tenant-resolver.ts para subdomain → tenant_id
- 4 tenants registrados (1 real: simmerdown, 3 dummies)

**✅ Infraestructura:**
- Next.js 15 con App Router
- Supabase PostgreSQL
- Vector search (pgvector)
- Matryoshka embeddings (3 tiers)
- PM2 + Nginx en VPS Hostinger

### Limitaciones Actuales

**❌ Subdomains vacíos:**
- https://simmerdown.muva.chat/ → Página vacía
- https://hotel-boutique.muva.chat/ → Página vacía

**❌ Homepage genérico:**
- https://muva.chat/ → Homepage viejo, no centrado en chat

**❌ Chat mobile-dev:**
- Hardcoded a 'simmerdown' (línea 44 en DetectTenantSlug)
- No usa subdomain real del middleware

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Subdomains (tenant-specific):**
```
https://simmerdown.muva.chat/
→ Chat fullscreen directo
→ Header: Logo "Simmer Down Chat"
→ Info específica de Simmerdown
→ Meta tags únicos: "Experience surf lodge in Santa Teresa"
```

**MUVA.chat (marketplace):**
```
https://muva.chat/
→ Super Chat fullscreen (on steroids)
→ Búsqueda en TODO (tenants + turismo)
→ Botón "Minimizar" en esquina
→ Al minimizar → Marketplace slide up:
  - Header con logo + login + counters
  - Grid de tenants (foto, rating, ubicación)
  - Mapa Mapbox con markers
  - Destacados (carrusel/grid/lista)
→ Floating chat icon para re-expandir
```

### Características Clave

**Subdomain Chat:**
- Detección automática desde middleware
- Same plantilla para todos los tenants
- Branding dinámico (logo, color)
- SEO optimizado por tenant

**Super Chat:**
- Búsqueda multi-tenant
- Routing inteligente: "Simmerdown tiene X" → Link
- Mismo componente base que tenant chat
- Capacidades extendidas (comparar, recomendar)

**Marketplace:**
- Grid responsive mobile-first
- Mapa interactivo Mapbox
- Filtros por ciudad (San Andrés por ahora)
- Destacados mezclados (tenants + sitios turísticos)

---

## 📱 TECHNICAL STACK

### Frontend
- **Framework:** Next.js 15.5.3 (App Router)
- **Styling:** Tailwind CSS 3.x
- **UI Components:** Headless UI, Lucide Icons
- **Chat:** Streaming SSE, Markdown rendering
- **Maps:** Mapbox GL JS
- **Auth:** Supabase Auth + Google OAuth

### Backend
- **Database:** Supabase PostgreSQL 17.4.1
- **Vector Search:** pgvector 0.8.0 (HNSW indexes)
- **API Routes:** Next.js API Routes (Edge Runtime)
- **AI:** Claude 3.5 Sonnet (Anthropic)
- **Embeddings:** OpenAI text-embedding-3-large

### Infrastructure
- **Hosting:** VPS Hostinger (Ubuntu 22.04)
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2 (cluster mode)
- **SSL:** Let's Encrypt wildcard
- **CI/CD:** GitHub Actions

---

## 🔧 DESARROLLO - FASES

### FASE 1: Subdomain Chat Migration (6-8h) 🎯 URGENTE

**Objetivo:** Copiar chat-mobile-dev a subdomains con detección automática

**Entregables:**
- `src/components/Tenant/TenantChatPage.tsx`
- `src/app/page.tsx` con routing logic
- `src/lib/subdomain-detector.ts`
- Meta tags dinámicos por tenant

**Archivos a crear:**
```
src/
├── components/
│   └── Tenant/
│       ├── TenantChatPage.tsx    # Copy de DevChatMobileDev
│       └── TenantHeader.tsx      # Header con branding dinámico
├── lib/
│   └── subdomain-detector.ts    # Client-side subdomain helper
└── app/
    └── page.tsx                  # Root page con routing logic
```

**Archivos a modificar:**
```
src/app/layout.tsx               # Meta tags dinámicos
```

**Lógica de routing (page.tsx):**
```typescript
// Si hay subdomain → TenantChatPage
// Si no hay subdomain → Placeholder o Super Chat (FASE 2)

const hostname = headers().get('host')
const subdomain = getSubdomain(hostname)

if (subdomain) {
  return <TenantChatPage subdomain={subdomain} />
}

return <div>MUVA Chat - Coming Soon (FASE 2)</div>
```

**Testing:**
```bash
# Local development
npm run dev
open http://simmerdown.localhost:3000  # → Chat Simmerdown
open http://hotel-boutique.localhost:3000  # → Chat Hotel Boutique
open http://localhost:3000  # → Placeholder

# Production
open https://simmerdown.muva.chat/  # → Chat Simmerdown
open https://hotel-boutique.muva.chat/  # → Chat Hotel Boutique
open https://muva.chat/  # → Placeholder
```

**Success Criteria:**
- [x] simmerdown.muva.chat muestra chat directo
- [x] hotel-boutique.muva.chat muestra chat directo
- [x] Meta tags únicos por tenant (Open Graph, Twitter)
- [x] Branding dinámico (logo, color, nombre)
- [x] /chat-mobile-dev sigue intacto (santo grial)

---

### FASE 2: Super Chat en MUVA.chat (8-10h)

**Objetivo:** Chat on steroids que busca en TODO (tenants + contenido turístico)

**Entregables:**
- `src/components/SuperChat/SuperChatPage.tsx`
- `src/app/api/super-chat/route.ts`
- `src/lib/super-search.ts`

**Archivos a crear:**
```
src/
├── components/
│   └── SuperChat/
│       ├── SuperChatPage.tsx     # Extends TenantChatPage
│       ├── SuperChatHeader.tsx   # Header con logo MUVA
│       └── TenantRecommendation.tsx  # Card para recomendar tenant
├── lib/
│   └── super-search.ts           # Multi-tenant search logic
└── app/
    └── api/
        └── super-chat/
            └── route.ts          # API para super chat
```

**Archivos a modificar:**
```
src/app/page.tsx                 # Renderizar SuperChat si no subdomain
```

**Capacidades del Super Chat:**

1. **Búsqueda Multi-Tenant:**
```typescript
// Buscar en muva_content (742 POIs San Andrés)
const muvaResults = await match_muva_documents(embedding)

// Buscar en todos los tenants
const tenantResults = await Promise.all(
  tenants.map(t => match_hotels_documents(embedding, t.tenant_id))
)
```

2. **Routing Inteligente:**
```markdown
Usuario: "Busco un lugar para surfear"
AI: "¡Perfecto! Simmer Down Guest House en Sarie Bay es ideal para surfistas.
    Ofrecen clases de surf y están a 2 min de la playa.

    [Chatear con Simmer Down →](https://simmerdown.muva.chat/)

    También puedes explorar [otros alojamientos en San Andrés]"
```

3. **Comparación:**
```typescript
// Si usuario pregunta "¿Cuál es mejor X o Y?"
// Mostrar tabla comparativa con:
// - Precio, ubicación, rating
// - Links a cada subdomain
```

**API /api/super-chat:**
```typescript
POST /api/super-chat
{
  message: "Busco alojamiento para surfear",
  session_id: "uuid",
  tenant_id: null  // No tenant = búsqueda global
}

Response (streaming):
- Busca en muva_content
- Busca en todos los tenants
- Genera respuesta con links
- Retorna sources de múltiples tenants
```

**Testing:**
```bash
# Queries de prueba
"Busco alojamiento en San Andrés"
"Quiero hacer surf, ¿qué me recomiendas?"
"¿Cuál es mejor: Simmerdown o Hotel Boutique?"
"Sitios turísticos en San Andrés"
```

**Success Criteria:**
- [x] muva.chat muestra super chat fullscreen
- [x] Busca en muva_content (742 POIs)
- [x] Busca en todos los tenants
- [x] Links a subdomains funcionan
- [x] Comparación de tenants funciona
- [x] Streaming response como tenant chat

---

### FASE 3: Marketplace Debajo (8-10h)

**Objetivo:** Grid de tenants + mapa + destacados (aparece al minimizar chat)

**Entregables:**
- `src/components/Marketplace/`
- Integración con Mapbox GL JS
- Contadores dinámicos
- Grid responsive mobile-first

**Archivos a crear:**
```
src/
├── components/
│   └── Marketplace/
│       ├── MarketplaceHome.tsx      # Container principal
│       ├── MarketplaceHeader.tsx    # Logo + login + counters
│       ├── TenantGrid.tsx           # Grid de tenants
│       ├── TenantCard.tsx           # Card individual
│       ├── TenantMap.tsx            # Mapa Mapbox
│       ├── FeaturedSection.tsx      # Destacados
│       ├── FeaturedCarousel.tsx     # Carrusel
│       ├── FeaturedGrid.tsx         # Grid
│       └── FeaturedList.tsx         # Lista
├── lib/
│   └── mapbox-config.ts             # Mapbox setup
└── app/
    └── api/
        └── marketplace/
            ├── tenants/route.ts     # GET /api/marketplace/tenants
            └── counters/route.ts    # GET /api/marketplace/counters
```

**Archivos a modificar:**
```
src/app/page.tsx                     # Integrar Marketplace con SuperChat
```

**Estructura del Marketplace:**

```tsx
<MarketplaceHome>
  <MarketplaceHeader>
    - Logo MUVA
    - Login / Signup
    - Google OAuth button
    - Counters: "150 alojamientos | 80 restaurantes | 200 spots"
  </MarketplaceHeader>

  <HeroSection>
    - Título: "Descubre alojamientos únicos en San Andrés"
    - Subtitle: "Chatea con AI para encontrar tu lugar perfecto"
  </HeroSection>

  <TenantGrid>
    {tenants.map(tenant => (
      <TenantCard
        - Foto principal
        - Nombre + ubicación
        - Rating (si existe)
        - 2 botones:
          - "Chatear" → Expande super chat filtrado
          - "Ver perfil" → Redirige a subdomain
      />
    ))}
  </TenantGrid>

  <TenantMap>
    - Mapbox GL JS
    - Markers de tenants en San Andrés
    - Click marker → Popup con info + link
  </TenantMap>

  <FeaturedSection mode="carousel" | "grid" | "list">
    - Top 5 sitios turísticos (muva_content)
    - Featured tenants
    - Mezclados
  </FeaturedSection>
</MarketplaceHome>
```

**MarketplaceHeader (simple FASE 1):**
```tsx
<header className="bg-white border-b">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/muva-logo.svg" alt="MUVA" className="h-10" />
        <h1 className="text-2xl font-bold">MUVA</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="text-gray-700 hover:text-gray-900">
          Login
        </button>
        <button className="bg-teal-500 text-white px-4 py-2 rounded-lg">
          Sign up
        </button>
        <button className="border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2">
          <GoogleIcon />
          Google
        </button>
      </div>
    </div>
  </div>
</header>
```

**TenantCard:**
```tsx
<div className="bg-white rounded-xl shadow-md overflow-hidden">
  <img src={tenant.logo_url} className="w-full h-48 object-cover" />

  <div className="p-4">
    <h3 className="text-xl font-bold">{tenant.business_name}</h3>
    <p className="text-gray-600">{tenant.address}</p>

    {tenant.rating && (
      <div className="flex items-center gap-1 mt-2">
        <Star className="w-4 h-4 text-yellow-500" />
        <span>{tenant.rating}</span>
      </div>
    )}

    <div className="flex gap-2 mt-4">
      <button
        onClick={() => expandSuperChat(tenant.tenant_id)}
        className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg"
      >
        Chatear
      </button>
      <a
        href={`https://${tenant.subdomain}.muva.chat/`}
        className="flex-1 border border-gray-300 px-4 py-2 rounded-lg text-center"
      >
        Ver perfil
      </a>
    </div>
  </div>
</div>
```

**TenantMap (Mapbox):**
```tsx
import mapboxgl from 'mapbox-gl'

useEffect(() => {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  const map = new mapboxgl.Map({
    container: mapRef.current,
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-81.7, 12.5],  // San Andrés
    zoom: 12
  })

  tenants.forEach(tenant => {
    const marker = new mapboxgl.Marker({ color: tenant.primary_color })
      .setLngLat([tenant.longitude, tenant.latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(`
          <h3>${tenant.business_name}</h3>
          <p>${tenant.address}</p>
          <a href="https://${tenant.subdomain}.muva.chat/">Chatear</a>
        `)
      )
      .addTo(map)
  })
}, [tenants])
```

**FeaturedSection (3 modos):**
```tsx
// mode="carousel"
<Swiper spaceBetween={20} slidesPerView={1.2}>
  {featured.map(item => <FeaturedCard />)}
</Swiper>

// mode="grid"
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {featured.map(item => <FeaturedCard />)}
</div>

// mode="list"
<div className="space-y-4">
  {featured.map(item => <FeaturedListItem />)}
</div>
```

**API Endpoints:**

```typescript
// GET /api/marketplace/tenants
{
  tenants: [
    {
      tenant_id: "uuid",
      subdomain: "simmerdown",
      business_name: "Simmer Down Guest House",
      logo_url: "https://...",
      address: "Carrera 16 #3-31, Sarie Bay",
      rating: 4.8,
      primary_color: "#3B82F6",
      latitude: 12.5,
      longitude: -81.7
    }
  ]
}

// GET /api/marketplace/counters
{
  accommodations: 4,  // Count from tenant_registry WHERE is_active=true
  restaurants: 0,     // Future
  spots: 742          // Count from muva_content
}
```

**Testing:**
```bash
# Desktop
npm run dev
open http://localhost:3000
# → Super chat fullscreen
# → Scroll down → Ver marketplace

# Mobile
npm run dev
open http://localhost:3000
# → Tap en grid card → Funciona touch
# → Mapa Mapbox → Pan/zoom funciona
# → Featured carousel → Swipe funciona
```

**Success Criteria:**
- [x] Header simple con logo + login/signup
- [x] Grid de tenants responsive mobile-first
- [x] Botón "Chatear" expande super chat filtrado
- [x] Botón "Ver perfil" redirige a subdomain
- [x] Mapa Mapbox con markers funciona
- [x] Click marker → Popup con info
- [x] Featured section en 3 modos (carousel, grid, lista)
- [x] Contadores dinámicos desde DB

---

### FASE 4: Botón Minimizar + Transición (4-6h)

**Objetivo:** Transición moderna chat ↔ marketplace con floating icon

**Entregables:**
- Botón "Minimizar" en super chat
- Transición slide down (Opción B) o fade (Opción C)
- Floating chat icon para re-expandir
- LocalStorage state management

**Archivos a crear:**
```
src/
├── components/
│   └── SuperChat/
│       ├── MinimizeButton.tsx        # Botón en esquina superior derecha
│       ├── FloatingChatIcon.tsx      # Floating icon cuando minimizado
│       └── ChatTransition.tsx        # Wrapper con transición
├── hooks/
│   └── useChatState.ts               # State management (expanded/minimized)
└── lib/
    └── chat-storage.ts               # LocalStorage helpers
```

**Archivos a modificar:**
```
src/components/SuperChat/SuperChatPage.tsx  # Integrar minimize button
src/app/page.tsx                             # Integrar transición
```

**Lógica de estado:**

```typescript
// useChatState.ts
export function useChatState() {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Leer de LocalStorage
    const stored = localStorage.getItem('muva_chat_state')
    return stored ? JSON.parse(stored).isExpanded : true
  })

  const minimize = () => {
    setIsExpanded(false)
    localStorage.setItem('muva_chat_state', JSON.stringify({
      isExpanded: false,
      timestamp: Date.now()
    }))
  }

  const expand = () => {
    setIsExpanded(true)
    localStorage.setItem('muva_chat_state', JSON.stringify({
      isExpanded: true,
      timestamp: Date.now()
    }))
  }

  return { isExpanded, minimize, expand }
}
```

**Opción B: Slide Down Transition**

```tsx
// page.tsx (muva.chat root)
const { isExpanded, minimize, expand } = useChatState()

return (
  <div className="relative h-screen overflow-hidden">
    {/* Super Chat */}
    <div className={`
      absolute inset-0 z-20
      transition-transform duration-300 ease-out
      ${isExpanded ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <SuperChatPage onMinimize={minimize} />
    </div>

    {/* Marketplace */}
    <div className={`
      absolute inset-0 z-10
      transition-opacity duration-300 ease-out
      ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
    `}>
      <MarketplaceHome />
    </div>

    {/* Floating Chat Icon (when minimized) */}
    {!isExpanded && (
      <FloatingChatIcon onClick={expand} />
    )}
  </div>
)
```

**Opción C: Fade Transition**

```tsx
<div className="relative h-screen">
  <div className={`
    absolute inset-0
    transition-opacity duration-300 ease-out
    ${isExpanded ? 'opacity-100 z-20' : 'opacity-0 z-10 pointer-events-none'}
  `}>
    <SuperChatPage onMinimize={minimize} />
  </div>

  <div className={`
    absolute inset-0
    transition-opacity duration-300 ease-out
    ${!isExpanded ? 'opacity-100 z-20' : 'opacity-0 z-10 pointer-events-none'}
  `}>
    <MarketplaceHome />
  </div>

  {!isExpanded && <FloatingChatIcon onClick={expand} />}
</div>
```

**MinimizeButton:**

```tsx
<button
  onClick={onMinimize}
  className="
    fixed top-4 right-4 z-30
    bg-white/90 backdrop-blur-sm
    rounded-full p-3
    shadow-lg hover:shadow-xl
    transition-all duration-200
  "
  aria-label="Minimizar chat"
>
  <ChevronDown className="w-5 h-5 text-gray-700" />
</button>
```

**FloatingChatIcon:**

```tsx
<button
  onClick={onClick}
  className="
    fixed bottom-6 right-6 z-30
    bg-gradient-to-r from-teal-500 to-cyan-600
    text-white
    rounded-full w-14 h-14
    shadow-xl hover:shadow-2xl
    flex items-center justify-center
    transition-all duration-200
    hover:scale-110
    animate-[float_3s_ease-in-out_infinite]
  "
  aria-label="Expandir chat"
>
  <MessageCircle className="w-6 h-6" />

  {/* Pulse indicator */}
  <span className="
    absolute -top-1 -right-1
    w-4 h-4 bg-red-500
    rounded-full
    animate-pulse
  " />
</button>
```

**Animation CSS:**

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

**Testing:**
```bash
# Transición
1. Open muva.chat → Chat expandido
2. Click "Minimizar" → Slide down suave (300ms)
3. Ver marketplace debajo → Opacity 100%
4. Click floating icon → Chat slide up
5. Refresh page → Estado persiste (LocalStorage)

# Edge cases
- Minimizar con mensaje escribiendo → Mantener input
- Minimizar con scroll en chat → Mantener posición
- Mobile → Touch gestures funcionan
```

**Success Criteria:**
- [x] Botón "Minimizar" visible en esquina
- [x] Transición suave (Opción B o C, elegir más moderna)
- [x] Floating chat icon aparece al minimizar
- [x] Click floating → Expande chat
- [x] Estado persiste en LocalStorage
- [x] Transición funciona en mobile
- [x] Input de chat se mantiene al minimizar
- [x] Scroll position se mantiene

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] simmerdown.muva.chat muestra chat directo
- [ ] hotel-boutique.muva.chat muestra chat directo
- [ ] muva.chat muestra super chat fullscreen
- [ ] Super chat busca en muva_content (742 POIs)
- [ ] Super chat busca en todos los tenants
- [ ] Botón "Minimizar" funciona smooth
- [ ] Marketplace aparece al minimizar
- [ ] Floating chat icon re-expande
- [ ] Grid de tenants responsive
- [ ] Mapa Mapbox con markers funciona
- [ ] Featured section en 3 modos
- [ ] Meta tags únicos por tenant
- [ ] /chat-mobile-dev sigue intacto (santo grial)

### Performance
- [ ] LCP < 2.5s en mobile (Core Web Vitals)
- [ ] Chat responde en < 3s
- [ ] Transición minimizar < 300ms
- [ ] Marketplace load < 1.5s
- [ ] Mapa Mapbox load < 2s
- [ ] No layout shift (CLS < 0.1)

### Accesibilidad
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation funciona
- [ ] Screen reader compatible
- [ ] Focus visible en todos los elementos
- [ ] Alt text en imágenes
- [ ] ARIA labels en botones

### SEO
- [ ] Meta tags únicos por tenant
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data (Schema.org)
- [ ] Sitemap.xml con subdomains
- [ ] robots.txt configurado

### Mobile-First
- [ ] Responsive en iPhone 15/14 (390x844)
- [ ] Responsive en Pixel 8 (412x915)
- [ ] Responsive en Galaxy S24 (360x800)
- [ ] Touch gestures funcionan
- [ ] Safe area insets respetados
- [ ] No horizontal scroll

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-ux-interface** (Principal - 90%)

**Responsabilidad:** Todo el frontend y UX

**Tareas por FASE:**

**FASE 1:**
- Crear TenantChatPage component
- Crear TenantHeader component
- Implementar subdomain detection client-side
- Crear page.tsx con routing logic
- Meta tags dinámicos en layout.tsx

**FASE 2:**
- Crear SuperChatPage component
- Crear SuperChatHeader component
- Crear TenantRecommendation card
- Integrar super chat en page.tsx
- Testing de búsqueda multi-tenant

**FASE 3:**
- Crear todos los componentes de Marketplace
- Integrar Mapbox GL JS
- Implementar 3 modos de featured section
- Header con login/signup + Google OAuth
- Grid responsive mobile-first

**FASE 4:**
- Crear MinimizeButton component
- Crear FloatingChatIcon component
- Implementar useChatState hook
- Transición slide/fade (elegir más moderna)
- LocalStorage state management

**Archivos:**
- `src/components/Tenant/*`
- `src/components/SuperChat/*`
- `src/components/Marketplace/*`
- `src/hooks/useChatState.ts`
- `src/lib/subdomain-detector.ts`
- `src/lib/chat-storage.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`

---

### 2. **@agent-backend-developer** (Secundario - 10%)

**Responsabilidad:** APIs y lógica multi-tenant

**Tareas por FASE:**

**FASE 2:**
- Crear `/api/super-chat` endpoint
- Implementar super-search.ts
- Multi-tenant vector search
- Routing logic para links

**FASE 3:**
- Crear `/api/marketplace/tenants` endpoint
- Crear `/api/marketplace/counters` endpoint
- Optimizar queries con RPC functions

**Archivos:**
- `src/app/api/super-chat/route.ts`
- `src/lib/super-search.ts`
- `src/app/api/marketplace/tenants/route.ts`
- `src/app/api/marketplace/counters/route.ts`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── components/
│   │   ├── Tenant/
│   │   │   ├── TenantChatPage.tsx       # FASE 1
│   │   │   └── TenantHeader.tsx         # FASE 1
│   │   ├── SuperChat/
│   │   │   ├── SuperChatPage.tsx        # FASE 2
│   │   │   ├── SuperChatHeader.tsx      # FASE 2
│   │   │   ├── TenantRecommendation.tsx # FASE 2
│   │   │   ├── MinimizeButton.tsx       # FASE 4
│   │   │   ├── FloatingChatIcon.tsx     # FASE 4
│   │   │   └── ChatTransition.tsx       # FASE 4
│   │   ├── Marketplace/
│   │   │   ├── MarketplaceHome.tsx      # FASE 3
│   │   │   ├── MarketplaceHeader.tsx    # FASE 3
│   │   │   ├── TenantGrid.tsx           # FASE 3
│   │   │   ├── TenantCard.tsx           # FASE 3
│   │   │   ├── TenantMap.tsx            # FASE 3
│   │   │   ├── FeaturedSection.tsx      # FASE 3
│   │   │   ├── FeaturedCarousel.tsx     # FASE 3
│   │   │   ├── FeaturedGrid.tsx         # FASE 3
│   │   │   └── FeaturedList.tsx         # FASE 3
│   │   └── Dev/
│   │       └── DevChatMobileDev.tsx     # 🔒 SANTO GRIAL - NO TOCAR
│   ├── hooks/
│   │   └── useChatState.ts              # FASE 4
│   ├── lib/
│   │   ├── subdomain-detector.ts        # FASE 1
│   │   ├── super-search.ts              # FASE 2
│   │   ├── chat-storage.ts              # FASE 4
│   │   └── mapbox-config.ts             # FASE 3
│   └── app/
│       ├── page.tsx                     # FASE 1, 2, 4
│       ├── layout.tsx                   # FASE 1 (meta tags)
│       ├── chat-mobile-dev/
│       │   └── page.tsx                 # 🔒 SANTO GRIAL - NO TOCAR
│       └── api/
│           ├── super-chat/
│           │   └── route.ts             # FASE 2
│           └── marketplace/
│               ├── tenants/route.ts     # FASE 3
│               └── counters/route.ts    # FASE 3
└── docs/
    └── subdomain-chat-experience/
        ├── plan.md                      # Este archivo
        ├── TODO.md                      # Tareas específicas
        ├── subdomain-chat-experience-prompt-workflow.md  # Prompts copy-paste
        ├── fase-1/
        ├── fase-2/
        ├── fase-3/
        └── fase-4/
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Middleware ya existe (✅ Verificado)**
- `src/middleware.ts` detecta subdomain
- Inyecta `x-tenant-subdomain` header
- Set cookie `tenant_subdomain`
- NO necesita modificación

**2. tenant_registry completo (✅ Verificado)**
- Todos los campos necesarios existen
- Branding: logo_url, primary_color
- SEO: seo_meta_description, seo_keywords
- Contact: address, phone, email, social_media_links
- No necesita migraciones nuevas

**3. /chat-mobile-dev es intocable (🔒 SANTO GRIAL)**
- NO modificar `src/app/chat-mobile-dev/page.tsx`
- NO modificar `src/components/Dev/DevChatMobileDev.tsx`
- Solo copiar, nunca editar
- Razón: Es el reference implementation estable

**4. Tenants actuales:**
- Simmerdown (real, premium) - mantener
- hotel-boutique (dummy básico, será real) - mantener
- free-hotel-test (dummy) - borrar después
- xyz (dummy) - borrar después

**5. Mapbox setup:**
```bash
npm install mapbox-gl
# Agregar a .env.local:
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
```

**6. Vector search multi-tenant:**
```typescript
// FASE 2: Super chat debe buscar en múltiples fuentes
const sources = await Promise.all([
  // 1. Contenido turístico general
  match_muva_documents(embedding, 5),

  // 2. Cada tenant activo
  ...tenants.map(t =>
    match_hotels_documents(embedding, 5, t.tenant_id)
  )
])
```

**7. Meta tags por tenant:**
```tsx
// layout.tsx
export async function generateMetadata({ params }) {
  const hostname = headers().get('host')
  const subdomain = getSubdomain(hostname)

  if (!subdomain) {
    return {
      title: 'MUVA Chat - Descubre alojamientos únicos',
      description: 'Chatea con AI para encontrar tu lugar perfecto'
    }
  }

  const tenant = await getTenantBySubdomain(subdomain)

  return {
    title: `${tenant.business_name} - Chat con AI`,
    description: tenant.seo_meta_description,
    keywords: tenant.seo_keywords,
    openGraph: {
      title: tenant.business_name,
      description: tenant.seo_meta_description,
      images: [tenant.logo_url]
    }
  }
}
```

**8. Safe area insets (mobile):**
```css
/* Ya implementado en DevChatMobileDev */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

---

**Última actualización:** October 11, 2025
**Próximo paso:** Crear TODO.md con tareas específicas por fase
