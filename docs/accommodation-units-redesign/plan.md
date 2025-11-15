# Rediseño UX: Página de Unidades de Alojamiento - Plan de Implementación

**Proyecto:** Accommodation Units Redesign
**Fecha Inicio:** 2025-11-09
**Estado:** 📋 Planificación Completa - Listo para FASE 1

---

## 🎯 OVERVIEW

### Objetivo Principal
Transformar la página `/accommodations/units` de un diseño de tarjetas monolíticas gigantes a una interfaz limpia tipo lista/tabla con navegación a páginas individuales por unidad, optimizada para escalar a 80+ unidades.

### ¿Por qué?
- **Sobrecarga visual:** Cards actuales muestran 9 secciones de información → overwhelming para usuarios
- **Escalabilidad:** 80 habitaciones = 80 cards gigantes = página infinitamente larga (UX terrible)
- **Eficiencia:** Usuario debe scrollear toda la página para encontrar una unidad específica
- **Mobile:** Cards gigantes no funcionan bien en pantallas pequeñas
- **Feedback del usuario:** "Todo es confuso porque es demasiada información en los ojos"

### Alcance
- ✅ Vista principal rediseñada: lista compacta o tabla con información esencial
- ✅ Navegación a páginas individuales por unidad (`/accommodations/units/[unitId]`)
- ✅ Toggle entre vista Grid (compacta) y Lista (tabla)
- ✅ Filtros y búsqueda funcionales
- ✅ Quick actions en hover (sin abrir página)
- ✅ Sistema de manuales integrado en página individual
- ✅ Performance optimizada (virtual scrolling si necesario)
- ✅ Responsive design (mobile, tablet, desktop)
- ❌ NO incluye: edición inline de unidades (fuera de alcance)
- ❌ NO incluye: bulk operations en unidades (puede ser fase futura)

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ `/accommodations/units` funciona con tarjetas gigantes
- ✅ API endpoint `/api/accommodations/units` retorna datos consolidados
- ✅ `AccommodationUnitsGrid.tsx` renderiza cards con 9 secciones
- ✅ Sistema de manuales funcionando (upload, view, analytics)
- ✅ Quick Stats cards (4 métricas globales)
- ✅ SWR caching implementado
- ✅ Matryoshka embeddings status visible

### Limitaciones Actuales
- ❌ **No hay búsqueda/filtrado:** Usuario debe scrollear manualmente
- ❌ **No hay sorting:** Orden fijo desde API
- ❌ **Cards gigantes:** 9 secciones por card = visual cluttered
- ❌ **No escalable:** 80 unidades = página de 50+ pantallas de scroll
- ❌ **Información redundante:** Algunos datos aparecen múltiples veces
- ❌ **No hay vista compacta:** Solo existe vista de cards detalladas
- ❌ **Mobile UX pobre:** Cards colapsan mal en pantallas pequeñas
- ❌ **No hay navegación individual:** Todo en una página monolítica

### Análisis UX Actual (screenshot usuario)
```
┌─────────────────────────────────────┐
│  CARD 1 (GIGANTE)                   │
│  ┌─ Header ─────────────────────┐   │
│  │ Nombre, icono, badge, status │   │
│  ├─ Image ──────────────────────┤   │
│  │ Featured image + gallery     │   │
│  ├─ Grid 3x3 ───────────────────┤   │
│  │ 9 InfoCards (capacity, size, │   │
│  │ pricing, amenities, etc.)    │   │
│  ├─ Description ────────────────┤   │
│  ├─ Features ───────────────────┤   │
│  ├─ Technical ──────────────────┤   │
│  ├─ Embeddings ─────────────────┤   │
│  ├─ Manuals ────────────────────┤   │
│  └─ Analytics ──────────────────┘   │
│  [View Details Button]              │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  CARD 2 (GIGANTE)                   │
│  ... repite estructura ...          │
└─────────────────────────────────────┘
...80 more cards...
```

**Problema:** Usuario debe scrollear 80 cards para encontrar "Kaya Room"

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

#### Vista Principal (Lista/Tabla Compacta)
```
┌─────────────────────────────────────────────────────────────┐
│  [🔍 Search] [Filters ▼] [Grid/List Toggle]                │
├─────────────────────────────────────────────────────────────┤
│  📊 Quick Stats: 9 Units | 7 Featured | 89% Embedded       │
├─────────────────────────────────────────────────────────────┤
│  TABLE VIEW:                                                │
│  ┌──────────┬─────────┬──────────┬──────────┬─────────┐    │
│  │ Nombre   │ Tipo    │ Adultos  │ Precio   │ Actions │    │
│  ├──────────┼─────────┼──────────┼──────────┼─────────┤    │
│  │ 🏠 Kaya  │ Room    │ 2        │ $120     │ 👁 📄 📊 │    │
│  │ 🏠 Jammin│ Room    │ 2        │ $110     │ 👁 📄 📊 │    │
│  │ 🏢 Misty │ Apt     │ 4        │ $180     │ 👁 📄 📊 │    │
│  └──────────┴─────────┴──────────┴──────────┴─────────┘    │
│                                                              │
│  GRID VIEW (COMPACTO):                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │ 🏠 Kaya │ │ 🏠Jammin│ │ 🏢 Misty│                       │
│  │ Room    │ │ Room    │ │ Apt     │                       │
│  │ 2👤 $120│ │ 2👤 $110│ │ 4👤 $180│                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

**Click en "Kaya"** → Navega a `/accommodations/units/kaya-room`

#### Página Individual (`/units/[unitId]`)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Units                                            │
│                                                              │
│  🏠 Kaya Room                                    [Edit]      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│                                                              │
│  📸 Photo Gallery (Featured + 3 more)                       │
│                                                              │
│  📋 Details                                                  │
│  ┌────────────────────────────────────────────────┐         │
│  │ Capacity: 2 adults, 0 children                │         │
│  │ Size: 25m²                                     │         │
│  │ View: Ocean                                    │         │
│  │ Bed: Queen                                     │         │
│  │ Price: $120 (low) / $150 (high)              │         │
│  │ Amenities: 12 items                           │         │
│  └────────────────────────────────────────────────┘         │
│                                                              │
│  📝 Description                                              │
│  Lorem ipsum dolor sit amet...                              │
│                                                              │
│  ✨ Unique Features                                          │
│  • Feature 1                                                │
│  • Feature 2                                                │
│                                                              │
│  🤖 AI Embeddings Status                                     │
│  ✅ Tier 1 (1024d) | ✅ Tier 2 (1536d)                      │
│                                                              │
│  📄 Manuales                                                 │
│  [Sistema completo de manuales aquí]                        │
│                                                              │
│  📊 Analytics                                                │
│  [Dashboard de analytics aquí]                              │
└─────────────────────────────────────────────────────────────┘
```

### Características Clave
- **Vista Dual:** Toggle entre Grid compacto y Tabla
- **Búsqueda instantánea:** Filter por nombre de unidad
- **Filtros avanzados:** Tipo, capacidad, precio, status
- **Sorting dinámico:** Por nombre, precio, capacidad, etc.
- **Quick actions:** Hover sobre unidad → botones de acción rápida
- **Navegación individual:** Click → página dedicada con TODA la info
- **Performance:** Virtual scrolling para 80+ unidades
- **Mobile-friendly:** Tabla colapsa a cards compactas en mobile
- **Accesibilidad:** Keyboard navigation, WCAG AA compliance

---

## 📱 TECHNICAL STACK

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Components:** shadcn/ui (Radix primitives)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State:** React hooks + SWR (caching)
- **Routing:** Next.js dynamic routes (`[unitId]`)

### Backend (sin cambios)
- **API:** `/api/accommodations/units` (existente)
- **Database:** Supabase (`accommodation_units_public`)
- **Caching:** SWR (60s revalidation)

### Componentes Nuevos
1. `AccommodationUnitsTable.tsx` - Vista tabla
2. `AccommodationUnitsCompactGrid.tsx` - Vista grid compacta
3. `UnitViewToggle.tsx` - Switch Lista/Grid
4. `UnitQuickActions.tsx` - Botones hover (view, manuals, analytics)
5. `AccommodationUnitDetail.tsx` - Página individual completa
6. `UnitFilters.tsx` - Panel de filtros
7. `UnitSearchBar.tsx` - Búsqueda

### Componentes a Refactorizar
- `AccommodationUnitsGrid.tsx` → Deprecar o adaptar como base
- `AccommodationManualsSection.tsx` → Reusar en página individual
- `ManualAnalytics.tsx` → Reusar en página individual

---

## 🔧 DESARROLLO - FASES

### FASE 0: Setup & Architecture (30min - 1h)

**Objetivo:** Preparar estructura de proyecto y documentación

**Entregables:**
- ✅ Carpetas de documentación creadas
- ✅ plan.md completado (este archivo)
- ✅ TODO.md con tareas detalladas
- ✅ accommodation-units-redesign-prompt-workflow.md
- ✅ Snapshots de agentes actualizados

**Archivos a crear:**
- `docs/accommodation-units-redesign/plan.md` (este archivo)
- `docs/accommodation-units-redesign/TODO.md`
- `docs/accommodation-units-redesign/accommodation-units-redesign-prompt-workflow.md`
- `docs/accommodation-units-redesign/fase-{1,2,3,4}/` (carpetas)

**Archivos a modificar:**
- `snapshots/ux-interface.md` (agregar CURRENT PROJECT)
- `snapshots/backend-developer.md` (agregar CURRENT PROJECT - solo si necesario)

**Testing:**
- ✅ Estructura de carpetas creada correctamente
- ✅ Archivos markdown válidos
- ✅ Snapshots actualizados sin errores

**Agente:** Manual (Claude Code planning mode)

---

### FASE 1: Vista Compacta (Grid + Tabla) (3-4h)

**Objetivo:** Crear vistas alternativas compactas para lista de unidades

**Entregables:**
- ✅ Componente `AccommodationUnitsCompactGrid.tsx` (cards pequeñas)
- ✅ Componente `AccommodationUnitsTable.tsx` (tabla responsiva)
- ✅ Componente `UnitViewToggle.tsx` (switch Grid/Tabla)
- ✅ Integración en página principal

**Archivos a crear:**
- `src/components/Accommodation/AccommodationUnitsCompactGrid.tsx`
- `src/components/Accommodation/AccommodationUnitsTable.tsx`
- `src/components/Accommodation/UnitViewToggle.tsx`

**Archivos a modificar:**
- `src/app/[tenant]/accommodations/units/page.tsx` (integrar toggle y vistas)

**Especificaciones técnicas:**

#### AccommodationUnitsCompactGrid.tsx
```typescript
// Card compacta: 200x150px aprox
// Muestra: Icono, nombre, tipo, adultos, precio temporada baja
// Hover: Shadow, scale, quick actions overlay
interface CompactUnitCardProps {
  unit: AccommodationUnit
  onClick: () => void // Navegar a página individual
}

// Grid: 2-3-4 cols (mobile-tablet-desktop)
// Responsive: grid-cols-2 md:grid-cols-3 xl:grid-cols-4
```

#### AccommodationUnitsTable.tsx
```typescript
// Tabla con columnas:
// - Nombre (con icono)
// - Tipo (Room/Apartment)
// - Capacidad (adultos + niños)
// - Precio (temporada baja)
// - Status (Active/Inactive badge)
// - Actions (quick action buttons)

// Features:
// - Sortable columns (click header to sort)
// - Hover row highlight
// - Click row → navega a página individual
// - Responsive: colapsa a cards en mobile (<768px)
```

#### UnitViewToggle.tsx
```typescript
// Toggle button: Grid | Table
// Estado persiste en localStorage
// Iconos: Grid (LayoutGrid) | Table (Table2)
```

**Testing:**
- ✅ Grid compacto muestra 4 datos clave por unidad
- ✅ Tabla muestra 6 columnas responsivamente
- ✅ Toggle persiste preferencia en localStorage
- ✅ Click en unidad navega correctamente
- ✅ Responsive: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- ✅ Performance: render de 80 unidades <500ms

**Agente:** @agent-ux-interface

---

### FASE 2: Página Individual de Unidad (4-5h)

**Objetivo:** Crear ruta dinámica y página detallada para cada unidad

**Entregables:**
- ✅ Ruta dinámica `/[tenant]/accommodations/units/[unitId]/page.tsx`
- ✅ Componente `AccommodationUnitDetail.tsx` con toda la información
- ✅ Navegación back to list
- ✅ Sistema de manuales integrado
- ✅ Analytics dashboard integrado

**Archivos a crear:**
- `src/app/[tenant]/accommodations/units/[unitId]/page.tsx`
- `src/components/Accommodation/AccommodationUnitDetail.tsx`
- `src/components/Accommodation/UnitDetailHeader.tsx` (opcional: header con back button)

**Archivos a reusar (sin modificar):**
- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/components/Accommodation/ManualAnalytics.tsx`
- `src/components/Accommodation/ManualContentModal.tsx`

**Especificaciones técnicas:**

#### `/[unitId]/page.tsx` (Server Component)
```typescript
export default async function UnitDetailPage({
  params,
}: {
  params: { tenant: string; unitId: string }
}) {
  // Fetch unit data server-side
  const unit = await getUnitById(params.unitId)

  if (!unit) {
    notFound() // 404 page
  }

  return <AccommodationUnitDetail unit={unit} />
}

// Generate static params for conocidos units (optional ISR)
export async function generateStaticParams() {
  // Fetch all unit IDs
  return [{ unitId: 'kaya-room' }, { unitId: 'jammin-room' }, ...]
}
```

#### AccommodationUnitDetail.tsx (Client Component)
```typescript
// Layout sections (top to bottom):
// 1. Header: Back button + Unit name + Edit button
// 2. Photo Gallery (featured + thumbnails)
// 3. Quick Stats cards (2-3 key metrics)
// 4. Details Grid (capacity, size, view, bed, pricing)
// 5. Description (expandable si es muy larga)
// 6. Unique Features (lista con bullets)
// 7. Amenities (grid con iconos)
// 8. Technical Info (unit ID, type, sections)
// 9. AI Embeddings Status (tier 1/2 indicators)
// 10. Manuales Section (AccommodationManualsSection)
// 11. Analytics Dashboard (ManualAnalytics)

// Progressive disclosure:
// - Collapsible sections para info no crítica
// - Tabs para organizar manuales vs analytics?
```

**API consideraciones:**
- **Opción A:** Usar API existente `/api/accommodations/units` + filter client-side
- **Opción B:** Crear endpoint `/api/accommodations/units/[unitId]` (más eficiente)
- **Recomendación:** Opción A primero (rápido), Opción B si hay issues de performance

**Testing:**
- ✅ Navegación desde lista a página individual funciona
- ✅ Back button regresa a lista manteniendo scroll position
- ✅ Toda la información se muestra correctamente
- ✅ Sistema de manuales funciona igual que antes
- ✅ Analytics dashboard funciona igual que antes
- ✅ 404 page si unitId no existe
- ✅ SEO: meta tags apropiados (title, description)
- ✅ Performance: página carga <1s

**Agente:** @agent-ux-interface (principal) + @agent-backend-developer (solo si se crea endpoint nuevo)

---

### FASE 3: Filtros, Búsqueda & Quick Actions (2-3h)

**Objetivo:** Agregar funcionalidad de búsqueda, filtros y acciones rápidas

**Entregables:**
- ✅ Barra de búsqueda con debounce
- ✅ Panel de filtros multi-criterio
- ✅ Sorting dinámico (columnas clickeables)
- ✅ Quick actions en hover/row

**Archivos a crear:**
- `src/components/Accommodation/UnitSearchBar.tsx`
- `src/components/Accommodation/UnitFilters.tsx`
- `src/components/Accommodation/UnitQuickActions.tsx`

**Archivos a modificar:**
- `src/app/[tenant]/accommodations/units/page.tsx` (integrar filtros y search)
- `src/components/Accommodation/AccommodationUnitsTable.tsx` (agregar sorting)
- `src/components/Accommodation/AccommodationUnitsCompactGrid.tsx` (integrar quick actions)

**Especificaciones técnicas:**

#### UnitSearchBar.tsx
```typescript
// Input con icono de búsqueda
// Debounce: 300ms
// Busca en: nombre, tipo, descripción
// Clear button (X)
// Keyboard: Enter to navigate a primer resultado
```

#### UnitFilters.tsx
```typescript
// Filtros disponibles:
// 1. Tipo: Room | Apartment (checkboxes)
// 2. Capacidad: 1-2 | 3-4 | 5+ adultos (range slider o checkboxes)
// 3. Precio: <$100 | $100-$150 | >$150 (range slider)
// 4. Status: Active | Inactive (toggle)
// 5. Features: Ocean view | Pool access | etc. (multi-select)

// UI: Collapsible panel o dropdown
// Clear all filters button
// Show count: "Mostrando 12 de 80 unidades"
```

#### UnitQuickActions.tsx
```typescript
// Acciones disponibles:
// 1. 👁 View (navegar a página individual)
// 2. 📄 Manuals (abrir modal con lista de manuales)
// 3. 📊 Analytics (abrir modal con stats)
// 4. ✏️ Edit (futuro - placeholder)

// UI: Botones pequeños en hover (tabla) o overlay (grid)
// Tooltips en hover
// Keyboard: Tab para navegar entre acciones
```

**Estado y lógica:**
```typescript
// Estado global (en page.tsx):
const [searchQuery, setSearchQuery] = useState('')
const [filters, setFilters] = useState<UnitFilters>({
  types: [],
  capacityRange: null,
  priceRange: null,
  status: null,
  features: []
})
const [sortBy, setSortBy] = useState<SortConfig>({
  field: 'name',
  direction: 'asc'
})

// Computed:
const filteredUnits = useMemo(() => {
  let result = units

  // Apply search
  if (searchQuery) {
    result = result.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Apply filters
  if (filters.types.length) {
    result = result.filter(u => filters.types.includes(u.type))
  }
  // ... más filtros

  // Apply sorting
  result = sortUnits(result, sortBy)

  return result
}, [units, searchQuery, filters, sortBy])
```

**Testing:**
- ✅ Búsqueda filtra resultados en <300ms
- ✅ Filtros se pueden combinar (AND logic)
- ✅ Clear filters resetea a estado inicial
- ✅ Sorting funciona en ambas vistas (grid y tabla)
- ✅ Quick actions funcionan sin navegar a página individual
- ✅ Count de resultados se actualiza correctamente
- ✅ Keyboard navigation funciona
- ✅ Mobile: filtros colapsan en drawer/modal

**Agente:** @agent-ux-interface

---

### FASE 4: Testing, Performance & Refinamiento (2h)

**Objetivo:** Validar funcionalidad completa, optimizar performance y fix bugs

**Entregables:**
- ✅ Testing completo en staging (http://simmerdown.localhost:3001)
- ✅ Fix de bugs identificados
- ✅ Optimizaciones de performance aplicadas
- ✅ Documentación de testing completada
- ✅ README/Guide de usuario

**Archivos a crear:**
- `docs/accommodation-units-redesign/fase-4/TESTING_REPORT.md`
- `docs/accommodation-units-redesign/fase-4/PERFORMANCE_ANALYSIS.md`
- `docs/accommodation-units-redesign/fase-4/USER_GUIDE.md`
- `docs/accommodation-units-redesign/fase-4/CHANGES.md` (changelog completo)

**Testing checklist:**

#### Funcionalidad
- [ ] Lista compacta muestra datos correctos (9 unidades Simmerdown)
- [ ] Tabla muestra todas las columnas correctamente
- [ ] Toggle Grid/Tabla funciona y persiste preferencia
- [ ] Click en unidad navega a página individual
- [ ] Back button regresa a lista
- [ ] Búsqueda filtra resultados instantáneamente
- [ ] Filtros funcionan individualmente y combinados
- [ ] Sorting funciona en todas las columnas
- [ ] Quick actions abren modals/navegan correctamente
- [ ] Sistema de manuales funciona igual que antes
- [ ] Analytics dashboard funciona igual que antes

#### Responsive Design
- [ ] Mobile (<768px): Tabla colapsa a cards, filtros en drawer
- [ ] Tablet (768-1024px): Grid 3 cols, tabla funciona
- [ ] Desktop (>1024px): Grid 4 cols, tabla completa
- [ ] Touch: Gestures funcionan (swipe, tap)
- [ ] Landscape/Portrait: Se adapta correctamente

#### Performance
- [ ] Lista de 9 unidades carga <300ms
- [ ] Lista de 80 unidades carga <500ms (simular con duplicados)
- [ ] Búsqueda responde <100ms (con debounce)
- [ ] Filtros aplican <200ms
- [ ] Navegación a página individual <500ms
- [ ] Imágenes: lazy loading funciona
- [ ] Virtual scrolling (si >50 unidades): smooth scroll 60fps

#### Accesibilidad
- [ ] Keyboard navigation: Tab, Enter, Esc funcionan
- [ ] Screen reader: ARIA labels correctos
- [ ] Focus indicators: visibles y claros
- [ ] Color contrast: WCAG AA compliance (4.5:1)
- [ ] Heading hierarchy: h1 → h2 → h3 correcto

#### Edge Cases
- [ ] 0 unidades: Empty state
- [ ] 1 unidad: Layout no se rompe
- [ ] 80+ unidades: Performance aceptable
- [ ] Búsqueda sin resultados: Empty state con mensaje
- [ ] Filtros sin resultados: "No se encontraron unidades"
- [ ] Navegación a unitId inexistente: 404 page
- [ ] Imágenes rotas: Fallback placeholder

**Performance optimizations:**

```typescript
// 1. Virtual scrolling (si >50 unidades)
import { useVirtualizer } from '@tanstack/react-virtual'

// 2. Lazy loading de imágenes
<Image loading="lazy" ... />

// 3. Memoization de filtros
const filteredUnits = useMemo(() => ..., [units, filters])

// 4. Debounce de búsqueda
const debouncedSearch = useDebouncedValue(searchQuery, 300)

// 5. Code splitting de página individual
const UnitDetail = dynamic(() => import('@/components/...'), {
  loading: () => <Spinner />
})
```

**Testing:**
- ✅ Todos los tests funcionales pasan
- ✅ Performance cumple métricas (<500ms carga)
- ✅ Accesibilidad: Lighthouse score >90
- ✅ No regresiones en features existentes
- ✅ Build de producción sin errores TypeScript
- ✅ Manual test en navegadores: Chrome, Safari, Firefox

**Agente:** @agent-ux-interface (testing) + @agent-backend-developer (performance si aplica)

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [x] Lista compacta muestra 4-6 datos clave por unidad
- [x] Tabla muestra 6 columnas responsivamente
- [x] Toggle Grid/Tabla funciona y persiste
- [x] Click en unidad navega a `/units/[unitId]`
- [x] Página individual muestra TODA la información (9 secciones actuales)
- [x] Búsqueda filtra instantáneamente (<300ms)
- [x] Filtros multi-criterio funcionan combinados
- [x] Sorting dinámico en columnas de tabla
- [x] Quick actions funcionan sin navegar
- [x] Sistema de manuales integrado sin cambios
- [x] Analytics dashboard integrado sin cambios

### Performance
- [x] Lista de 9 unidades: <300ms
- [x] Lista de 80 unidades: <500ms
- [x] Navegación a página individual: <500ms
- [x] Búsqueda con debounce: <100ms
- [x] Filtros aplican: <200ms
- [x] Lighthouse Performance: >85
- [x] First Contentful Paint: <1.5s
- [x] Time to Interactive: <3s

### Accesibilidad
- [x] WCAG AA compliance: score >90
- [x] Keyboard navigation completa
- [x] Screen reader compatible
- [x] Color contrast ratio: >4.5:1
- [x] Focus indicators visibles

### Responsive
- [x] Mobile (<768px): UI funcional y usable
- [x] Tablet (768-1024px): Optimizado
- [x] Desktop (>1024px): Experiencia completa
- [x] Touch gestures funcionan
- [x] Landscape/Portrait: se adapta

### No Regresiones
- [x] Sistema de manuales: 100% funcional
- [x] Analytics dashboard: 100% funcional
- [x] API endpoints: sin cambios (o backward compatible)
- [x] Quick Stats cards: funcionan igual
- [x] Matryoshka embeddings status: visible

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-ux-interface** (Principal - 90% del trabajo)

**Responsabilidad:** Implementar toda la interfaz de usuario y componentes

**Tareas:**
- **FASE 1:** Crear AccommodationUnitsCompactGrid, AccommodationUnitsTable, UnitViewToggle
- **FASE 2:** Crear página individual `/units/[unitId]` y componente AccommodationUnitDetail
- **FASE 3:** Implementar UnitSearchBar, UnitFilters, UnitQuickActions
- **FASE 4:** Testing completo, fixes de bugs, optimizaciones UI

**Archivos:**
- **Crear:**
  - `src/components/Accommodation/AccommodationUnitsCompactGrid.tsx`
  - `src/components/Accommodation/AccommodationUnitsTable.tsx`
  - `src/components/Accommodation/UnitViewToggle.tsx`
  - `src/app/[tenant]/accommodations/units/[unitId]/page.tsx`
  - `src/components/Accommodation/AccommodationUnitDetail.tsx`
  - `src/components/Accommodation/UnitSearchBar.tsx`
  - `src/components/Accommodation/UnitFilters.tsx`
  - `src/components/Accommodation/UnitQuickActions.tsx`
- **Modificar:**
  - `src/app/[tenant]/accommodations/units/page.tsx`

---

### 2. **@agent-backend-developer** (Secundario - 10% del trabajo, solo si necesario)

**Responsabilidad:** Crear endpoint optimizado para página individual (opcional)

**Tareas:**
- **FASE 2:** (Opcional) Crear endpoint `/api/accommodations/units/[unitId]` si hay performance issues con filtrado client-side
- **FASE 4:** (Opcional) Optimizaciones de API si hay cuellos de botella

**Archivos:**
- **Crear (solo si necesario):**
  - `src/app/api/accommodations/units/[unitId]/route.ts`

**Nota:** Este agente solo se requiere si hay problemas de performance con el approach inicial (filtrar desde `/api/accommodations/units` client-side).

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/muva-chat/
├── src/
│   ├── app/
│   │   └── [tenant]/
│   │       └── accommodations/
│   │           └── units/
│   │               ├── page.tsx (MODIFICAR - integrar vistas, filtros, toggle)
│   │               └── [unitId]/
│   │                   └── page.tsx (CREAR - página individual)
│   ├── components/
│   │   └── Accommodation/
│   │       ├── AccommodationUnitsGrid.tsx (DEPRECAR O REFACTORIZAR)
│   │       ├── AccommodationUnitsCompactGrid.tsx (CREAR)
│   │       ├── AccommodationUnitsTable.tsx (CREAR)
│   │       ├── UnitViewToggle.tsx (CREAR)
│   │       ├── AccommodationUnitDetail.tsx (CREAR)
│   │       ├── UnitSearchBar.tsx (CREAR)
│   │       ├── UnitFilters.tsx (CREAR)
│   │       ├── UnitQuickActions.tsx (CREAR)
│   │       ├── AccommodationManualsSection.tsx (REUSAR - sin cambios)
│   │       ├── ManualAnalytics.tsx (REUSAR - sin cambios)
│   │       └── ManualContentModal.tsx (REUSAR - sin cambios)
│   └── lib/
│       └── utils/
│           └── unit-filters.ts (CREAR - lógica de filtrado y sorting)
└── docs/
    └── accommodation-units-redesign/
        ├── plan.md (ESTE ARCHIVO)
        ├── TODO.md (CREAR)
        ├── accommodation-units-redesign-prompt-workflow.md (CREAR)
        ├── fase-1/
        │   ├── IMPLEMENTATION.md
        │   ├── CHANGES.md
        │   ├── TESTS.md
        │   └── ISSUES.md (si aplica)
        ├── fase-2/
        │   └── (misma estructura)
        ├── fase-3/
        │   └── (misma estructura)
        └── fase-4/
            ├── TESTING_REPORT.md
            ├── PERFORMANCE_ANALYSIS.md
            ├── USER_GUIDE.md
            └── CHANGES.md (changelog completo)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

#### 1. Compatibilidad con sistema actual
- **Sistema de manuales:** DEBE funcionar igual en página individual
- **Analytics:** DEBE funcionar igual sin regresiones
- **API:** NO modificar endpoint `/api/accommodations/units` (solo agregar `/[unitId]` si necesario)
- **SWR caching:** Reusar configuración existente (60s revalidation)

#### 2. Performance con 80+ unidades
- **Opción A (rápida):** Renderizar todas las unidades, confiar en React virtualización
- **Opción B (optimizada):** Implementar virtual scrolling con `@tanstack/react-virtual`
- **Recomendación:** Empezar con Opción A, migrar a Opción B si FPS < 30

#### 3. Routing y SEO
- **Slug format:** `/units/[unitId]` donde `unitId` = slug (ej: `kaya-room`)
- **generateStaticParams:** Opcional (ISR), considerar si >20 unidades
- **Meta tags:** Usar `metadata` export de Next.js 15
- **Canonical URLs:** Importante para SEO

#### 4. Estado y persistencia
- **Toggle preference:** localStorage (`unit-view-preference`)
- **Filtros aplicados:** URL query params (ej: `?type=room&capacity=2-4`)
- **Scroll position:** Preservar al regresar de página individual (Next.js router automático)

#### 5. Mobile considerations
- **Tabla en mobile:** Colapsa a cards verticales (<768px)
- **Filtros en mobile:** Drawer/modal overlay (no sidebar)
- **Touch gestures:** Swipe para navegar entre unidades en página individual?
- **Quick actions:** Tap en row → expand actions (no hover en mobile)

#### 6. Accesibilidad crítica
- **Tabla:** Usar `<table>` semántico, NO divs con grid
- **Sortable headers:** `aria-sort="ascending|descending|none"`
- **Quick actions:** `aria-label` descriptivos
- **Modal focus trap:** Implementar correctamente (Headless UI lo hace)
- **Skip links:** "Skip to unit list" para keyboard users

#### 7. Testing strategy
- **Unit tests:** Lógica de filtrado, sorting
- **Integration tests:** Navegación, API calls
- **E2E tests:** User flows (buscar → filtrar → ver detalle)
- **Visual regression:** Screenshot diffs (Playwright)
- **Performance:** Lighthouse CI en PR

#### 8. Rollout strategy
- **Desarrollo:** http://simmerdown.localhost:3001/accommodations/units
- **Staging:** Validar con 9 unidades reales
- **Feature flag:** Considerar toggle para rollback rápido
- **A/B test:** Opcional - comparar engagement vs diseño actual

---

### Dependencies a agregar (si aplica)

```json
// package.json
{
  "dependencies": {
    "@tanstack/react-virtual": "^3.0.0",  // Solo si virtual scrolling
    "use-debounce": "^10.0.0"            // Para search debounce
  }
}
```

**Nota:** shadcn/ui, Headless UI, Lucide ya están instalados.

---

### Inspiración de diseño

**Referencia:** Airbnb listings, Booking.com search results

**Grid compacto:**
- Muestra: Imagen thumbnail, nombre, tipo, capacidad icono, precio destacado
- Hover: Sombra, escala 1.02, quick actions overlay

**Tabla:**
- Estilo: Minimal, bordes sutiles, hover row background
- Columnas: Left-aligned text, right-aligned numbers
- Sorting: Chevron icon en header, color change al ordenar

**Página individual:**
- Layout: Ancho máximo 1200px, centrado
- Secciones: Separadas con dividers sutiles
- Información: Progressive disclosure (collapsibles para secciones largas)

---

## 🎯 QUICK REFERENCE

### Comandos de desarrollo

```bash
# Desarrollo local (staging)
pnpm run dev:staging
# → http://simmerdown.localhost:3001/accommodations/units

# Build check
pnpm run build

# Type check
pnpm exec tsc --noEmit

# Testing
pnpm run test:ui  # Si configurado
```

### Rutas clave

```
Lista:      /accommodations/units
Individual: /accommodations/units/kaya-room
API:        /api/accommodations/units
API Detail: /api/accommodations/units/kaya-room (opcional)
```

### Archivos críticos a NO modificar

- `src/components/Accommodation/AccommodationManualsSection.tsx`
- `src/components/Accommodation/ManualAnalytics.tsx`
- `src/components/Accommodation/ManualContentModal.tsx`
- `src/lib/manual-processing.ts`
- `src/app/api/accommodation-manuals/` (todos los endpoints)

### Agentes y responsabilidades

| Agente | FASE 1 | FASE 2 | FASE 3 | FASE 4 |
|--------|--------|--------|--------|--------|
| **@agent-ux-interface** | ✅ Grid + Tabla + Toggle | ✅ Página individual | ✅ Filtros + Search + Quick Actions | ✅ Testing + Fixes |
| **@agent-backend-developer** | - | (Opcional) Endpoint `/[unitId]` | - | (Opcional) Optimizaciones |

---

**Última actualización:** 2025-11-09
**Próximo paso:** Crear TODO.md con tareas específicas por fase

---

## 📖 REFERENCIAS

- **Análisis UX actual:** Conversación Claude Code 2025-11-09
- **Sistema de manuales:** `docs/accommodation-manuals/plan.md`
- **Componentes shadcn/ui:** https://ui.shadcn.com/
- **Next.js 15 Routing:** https://nextjs.org/docs/app/building-your-application/routing
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **Plan-project workflow:** `.claude/commands/plan-project.md`
