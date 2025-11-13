# TODO - Rediseño UX: Página de Unidades de Alojamiento

**Proyecto:** Accommodation Units Redesign
**Fecha:** 2025-11-09
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0: Setup & Architecture 🎯

### 0.1 Crear estructura de documentación
- [x] Crear carpetas de documentación (estimate: 5min)
  - `docs/accommodation-units-redesign/fase-{1,2,3,4}/`
  - Agent: Manual (planning mode)
  - Test: Verificar que carpetas existen

### 0.2 Crear plan.md
- [x] Documento completo de planificación (estimate: 30min)
  - Incluye: Overview, estado actual/deseado, fases, arquitectura
  - Files: `docs/accommodation-units-redesign/plan.md`
  - Agent: Manual (planning mode)
  - Test: Leer archivo, verificar secciones completas

### 0.3 Crear TODO.md
- [ ] Tareas organizadas por fases (estimate: 20min)
  - Incluye: Tareas, estimaciones, agentes, archivos, tests
  - Files: `docs/accommodation-units-redesign/TODO.md`
  - Agent: Manual (planning mode)
  - Test: Verificar estructura de checkboxes

### 0.4 Crear workflow de prompts
- [ ] accommodation-units-redesign-prompt-workflow.md (estimate: 45min)
  - Incluye: Prompts copy-paste ready para cada tarea
  - Files: `docs/accommodation-units-redesign/accommodation-units-redesign-prompt-workflow.md`
  - Agent: Manual (planning mode)
  - Test: Verificar formato de prompts con @agent-{name}

### 0.5 Actualizar snapshots de agentes
- [ ] Agregar CURRENT PROJECT a snapshots (estimate: 15min)
  - Actualizar `snapshots/ux-interface.md`
  - Actualizar `snapshots/backend-developer.md` (solo si necesario)
  - Agent: Manual (planning mode)
  - Test: Verificar sección "🎯 CURRENT PROJECT" en snapshots

---

## FASE 1: Vista Compacta (Grid + Tabla) ⚙️

### 1.1 Crear componente AccommodationUnitsCompactGrid
- [ ] Card compacta: icono, nombre, tipo, adultos, precio (estimate: 1.5h)
  - Grid responsive: 2-3-4 cols (mobile-tablet-desktop)
  - Hover: shadow, scale, quick actions overlay
  - Click: navegar a página individual (preparar ruta)
  - Files: `src/components/Accommodation/AccommodationUnitsCompactGrid.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Renderiza 9 unidades Simmerdown correctamente

### 1.2 Crear componente AccommodationUnitsTable
- [x] Tabla con 6 columnas: nombre, tipo, capacidad, precio, status, actions (estimate: 1.5h)
  - Responsive: colapsa a cards en mobile (<768px)
  - Sortable headers: click para ordenar
  - Hover row: highlight background
  - Click row: navegar a página individual
  - Files: `src/components/Accommodation/AccommodationUnitsTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabla muestra datos correctos, sorting funciona

### 1.3 Crear componente UnitViewToggle
- [ ] Toggle button: Grid | Table con persistencia localStorage (estimate: 30min)
  - Iconos: LayoutGrid | Table2 (Lucide)
  - Estado: persiste en localStorage key `unit-view-preference`
  - Styling: Button group con estado activo visual
  - Files: `src/components/Accommodation/UnitViewToggle.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Toggle funciona, preferencia persiste al reload

### 1.4 Integrar vistas en página principal
- [ ] Modificar page.tsx para usar toggle y vistas alternativas (estimate: 45min)
  - Importar UnitViewToggle, CompactGrid, Table
  - Estado: `viewMode` controlado por toggle
  - Renderizado condicional: Grid vs Table según viewMode
  - Preservar Quick Stats cards arriba
  - Files: `src/app/[tenant]/accommodations/units/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: http://simmerdown.localhost:3001/accommodations/units muestra vistas correctas

### 1.5 Testing FASE 1
- [x] Validar funcionalidad completa de vistas (completado: 2025-11-10)
  - Grid compacto: ✅ 4-6 datos por card, hover funciona
  - Tabla: ✅ 7 columnas, sorting, responsive
  - Toggle: ✅ Persiste en localStorage, cambia vista correctamente
  - Mobile: ✅ Tabla muestra scroll horizontal con hint
  - Agent: **@agent-ux-interface**
  - Test: ✅ Checklist completo en docs/fase-1/TESTING_CHECKLIST_COMPLETED.md

### 1.6 Documentar FASE 1
- [x] Crear documentación de testing completa (completado: 2025-11-10)
  - Files: ✅ `docs/accommodation-units-redesign/fase-1/TESTING_REPORT.md`
  - Files: ✅ `docs/accommodation-units-redesign/fase-1/ISSUES.md`
  - Files: ✅ `docs/accommodation-units-redesign/fase-1/TESTING_CHECKLIST_COMPLETED.md`
  - Files: ✅ `docs/accommodation-units-redesign/fase-1/EXECUTIVE_SUMMARY.md`
  - Agent: **@agent-ux-interface**
  - Test: ✅ 4 archivos creados con contenido completo

---

## FASE 2: Página Individual de Unidad ✨

### 2.1 Crear ruta dinámica [unitId]
- [ ] Page.tsx para ruta dinámica con server component (estimate: 1h)
  - Ruta: `src/app/[tenant]/accommodations/units/[unitId]/page.tsx`
  - Fetch: getUnitById() server-side
  - 404: notFound() si unit no existe
  - SEO: metadata export con title, description
  - Files: `src/app/[tenant]/accommodations/units/[unitId]/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Navegar a /units/kaya-room (o similar slug)

### 2.2 Crear componente AccommodationUnitDetail
- [ ] Componente detallado con todas las secciones (estimate: 2.5h)
  - Header: Back button + nombre + Edit button
  - Photo Gallery: featured + thumbnails
  - Quick Stats: 2-3 métricas clave
  - Details Grid: capacity, size, view, bed, pricing
  - Description: expandable si muy larga
  - Unique Features: lista bullets
  - Amenities: grid con iconos
  - Technical Info: unit ID, type, sections
  - Embeddings Status: tier 1/2 indicators
  - Files: `src/components/Accommodation/AccommodationUnitDetail.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Muestra TODA la información correctamente

### 2.3 Integrar sistema de manuales en página individual
- [ ] Reusar AccommodationManualsSection sin modificar (estimate: 30min)
  - Importar componente existente
  - Pasar unitId correcto
  - Verificar que funciona igual que antes
  - Files: Modificar `AccommodationUnitDetail.tsx` (agregar sección)
  - Agent: **@agent-ux-interface**
  - Test: Upload, view, delete de manuales funciona

### 2.4 Integrar analytics dashboard en página individual
- [ ] Reusar ManualAnalytics sin modificar (estimate: 15min)
  - Importar componente existente
  - Pasar unitId correcto
  - Verificar que muestra métricas correctas
  - Files: Modificar `AccommodationUnitDetail.tsx` (agregar sección)
  - Agent: **@agent-ux-interface**
  - Test: Analytics muestra datos correctos

### 2.5 Implementar navegación desde lista a detalle
- [ ] Click en unit card/row navega a página individual (estimate: 30min)
  - Usar Next.js Link en CompactGrid y Table
  - Preservar scroll position al regresar
  - Href: `/accommodations/units/${unit.slug}` o similar
  - Files: Modificar `AccommodationUnitsCompactGrid.tsx` y `AccommodationUnitsTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Click → navega, back button → regresa con scroll preservado

### 2.6 (Opcional) Crear endpoint API [unitId]
- [ ] Endpoint optimizado si hay performance issues (estimate: 1h)
  - Solo ejecutar SI filtrado client-side es lento
  - Ruta: `src/app/api/accommodations/units/[unitId]/route.ts`
  - Lógica: Fetch unit específica desde DB
  - Response: Single unit object
  - Files: `src/app/api/accommodations/units/[unitId]/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET /api/accommodations/units/kaya-room retorna unit

### 2.7 Testing FASE 2
- [ ] Validar página individual completa (estimate: 45min)
  - Navegación: lista → detalle → back funciona
  - Información: TODA la data se muestra
  - Manuales: sistema funciona 100%
  - Analytics: dashboard funciona 100%
  - 404: unitId inexistente muestra 404
  - SEO: meta tags correctos
  - Performance: página carga <1s
  - Agent: **@agent-ux-interface**
  - Test: Checklist completo en docs/fase-2/TESTS.md

### 2.8 Documentar FASE 2
- [ ] Crear documentación de implementación (estimate: 20min)
  - Files: `docs/accommodation-units-redesign/fase-2/IMPLEMENTATION.md`
  - Files: `docs/accommodation-units-redesign/fase-2/CHANGES.md`
  - Files: `docs/accommodation-units-redesign/fase-2/TESTS.md`
  - Agent: **@agent-ux-interface**
  - Test: Archivos creados con contenido completo

---

## FASE 3: Filtros, Búsqueda & Quick Actions 🎨

### 3.1 Crear componente UnitSearchBar
- [ ] Barra de búsqueda con debounce 300ms (estimate: 45min)
  - Input con icono de búsqueda
  - Debounce: usar `use-debounce` library
  - Busca en: nombre, tipo, descripción
  - Clear button (X)
  - Keyboard: Enter navega a primer resultado
  - Files: `src/components/Accommodation/UnitSearchBar.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Búsqueda filtra resultados <300ms

### 3.2 Crear componente UnitFilters
- [ ] Panel de filtros multi-criterio (estimate: 1.5h)
  - Filtros: Tipo, Capacidad, Precio, Status, Features
  - UI: Collapsible panel o dropdown
  - Clear all filters button
  - Show count: "Mostrando X de Y unidades"
  - Files: `src/components/Accommodation/UnitFilters.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Filtros funcionan individualmente y combinados

### 3.3 Crear lógica de filtrado y sorting
- [ ] Utility functions para filtrar y ordenar units (estimate: 45min)
  - filterUnits(units, filters): Unit[]
  - sortUnits(units, sortConfig): Unit[]
  - combineFiltersAndSort(): Unit[]
  - Files: `src/lib/utils/unit-filters.ts`
  - Agent: **@agent-ux-interface**
  - Test: Unit tests para lógica de filtrado

### 3.4 Implementar sorting en tabla
- [ ] Headers clickeables para ordenar columnas (estimate: 45min)
  - Click header: toggle asc/desc
  - Visual indicator: chevron icon
  - Estado: sortConfig {field, direction}
  - Apply sorting en render
  - Files: Modificar `AccommodationUnitsTable.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Sorting funciona en todas las columnas

### 3.5 Crear componente UnitQuickActions
- [ ] Botones de acción rápida en hover (estimate: 1h)
  - Acciones: View, Manuals, Analytics, Edit (placeholder)
  - UI: Botones pequeños + tooltips
  - Keyboard: Tab para navegar entre acciones
  - Mobile: Tap en row → expand actions
  - Files: `src/components/Accommodation/UnitQuickActions.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Quick actions funcionan sin navegar a detalle

### 3.6 Integrar filtros y búsqueda en página principal
- [ ] Conectar todos los componentes en page.tsx (estimate: 1h)
  - Estado: searchQuery, filters, sortBy
  - Computed: filteredUnits usando useMemo
  - Renderizar: SearchBar + Filters arriba de lista
  - URL params: sincronizar filtros con query params
  - Files: Modificar `src/app/[tenant]/accommodations/units/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Búsqueda + filtros + sorting funcionan juntos

### 3.7 Responsive: filtros en mobile
- [ ] Drawer/modal para filtros en mobile (<768px) (estimate: 45min)
  - Mobile: Filtros en drawer overlay
  - Desktop: Filtros en sidebar o inline
  - Botón: "Filtros" con badge count de activos
  - Files: Modificar `UnitFilters.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Filtros funcionan en mobile y desktop

### 3.8 Testing FASE 3
- [ ] Validar búsqueda, filtros y quick actions (estimate: 45min)
  - Búsqueda: <300ms, resultados correctos
  - Filtros: combinan con AND logic
  - Sorting: funciona en ambas vistas
  - Quick actions: funcionan sin navegar
  - Count: "X de Y" se actualiza
  - Mobile: drawer funciona, filtros accesibles
  - Agent: **@agent-ux-interface**
  - Test: Checklist completo en docs/fase-3/TESTS.md

### 3.9 Documentar FASE 3
- [ ] Crear documentación de implementación (estimate: 20min)
  - Files: `docs/accommodation-units-redesign/fase-3/IMPLEMENTATION.md`
  - Files: `docs/accommodation-units-redesign/fase-3/CHANGES.md`
  - Files: `docs/accommodation-units-redesign/fase-3/TESTS.md`
  - Agent: **@agent-ux-interface**
  - Test: Archivos creados con contenido completo

---

## FASE 4: Testing, Performance & Refinamiento 🚀

### 4.1 Testing funcional completo
- [ ] Ejecutar checklist completo de funcionalidad (estimate: 1h)
  - Lista compacta: datos correctos
  - Tabla: columnas correctas, sorting
  - Toggle: funciona, persiste
  - Navegación: lista → detalle → back
  - Búsqueda: filtra instantáneamente
  - Filtros: combinan correctamente
  - Quick actions: funcionan
  - Manuales: 100% funcional
  - Analytics: 100% funcional
  - Agent: **@agent-ux-interface**
  - Test: Checklist en docs/fase-4/TESTING_REPORT.md

### 4.2 Testing responsive
- [ ] Validar en mobile, tablet, desktop (estimate: 30min)
  - Mobile (<768px): tabla colapsa, filtros en drawer
  - Tablet (768-1024px): grid 3 cols, tabla funciona
  - Desktop (>1024px): grid 4 cols, tabla completa
  - Touch: gestures funcionan
  - Landscape/Portrait: se adapta
  - Agent: **@agent-ux-interface**
  - Test: Screenshots de cada breakpoint

### 4.3 Testing de accesibilidad
- [ ] Validar WCAG AA compliance (estimate: 45min)
  - Keyboard navigation: Tab, Enter, Esc
  - Screen reader: ARIA labels correctos
  - Focus indicators: visibles
  - Color contrast: >4.5:1
  - Heading hierarchy: h1 → h2 → h3
  - Lighthouse audit: score >90
  - Agent: **@agent-ux-interface**
  - Test: Lighthouse report en docs/fase-4/

### 4.4 Testing de performance
- [ ] Validar métricas de carga y respuesta (estimate: 45min)
  - Lista 9 unidades: <300ms
  - Lista 80 unidades (simular): <500ms
  - Búsqueda: <100ms (con debounce)
  - Filtros: <200ms
  - Navegación a detalle: <500ms
  - Lighthouse Performance: >85
  - Agent: **@agent-ux-interface**
  - Test: Performance report en docs/fase-4/PERFORMANCE_ANALYSIS.md

### 4.5 Optimizaciones de performance
- [ ] Aplicar optimizaciones si necesario (estimate: 1h)
  - Virtual scrolling: si >50 unidades y FPS < 30
  - Lazy loading: imágenes
  - Memoization: filtros, sorting
  - Code splitting: página individual
  - Files: Modificar componentes según análisis
  - Agent: **@agent-ux-interface** + **@agent-backend-developer** (si aplica)
  - Test: Re-run performance tests, validar mejoras

### 4.6 Fix de bugs identificados
- [ ] Resolver todos los bugs encontrados en testing (estimate: 1-2h variable)
  - Listar bugs en ISSUES.md
  - Priorizar: Critical → High → Medium → Low
  - Resolver uno por uno
  - Re-test después de fix
  - Files: Varios según bugs
  - Agent: **@agent-ux-interface**
  - Test: Bug list completa, todos resueltos

### 4.7 Testing de regresiones
- [ ] Validar que no hay regresiones en features existentes (estimate: 30min)
  - Sistema de manuales: upload, view, delete
  - Analytics: tracking, dashboard
  - API endpoints: responden igual
  - Quick Stats: funcionan
  - Embeddings status: visible
  - Agent: **@agent-ux-interface**
  - Test: Regression checklist en docs/fase-4/TESTING_REPORT.md

### 4.8 Build de producción
- [ ] Validar build sin errores TypeScript (estimate: 15min)
  - Ejecutar: `pnpm run build`
  - Resolver errores TypeScript
  - Resolver warnings críticos
  - Validar: build exitoso
  - Agent: **@agent-ux-interface**
  - Test: `pnpm run build` completa sin errores

### 4.9 Crear guía de usuario
- [ ] Documentar cómo usar la nueva interfaz (estimate: 30min)
  - Explicar vistas: Grid vs Tabla
  - Explicar filtros y búsqueda
  - Explicar quick actions
  - Explicar navegación a detalle
  - Screenshots ilustrativos
  - Files: `docs/accommodation-units-redesign/fase-4/USER_GUIDE.md`
  - Agent: **@agent-ux-interface**
  - Test: Guía completa y clara

### 4.10 Crear changelog completo
- [ ] Documentar todos los cambios del proyecto (estimate: 20min)
  - Listar archivos creados
  - Listar archivos modificados
  - Listar archivos deprecados
  - Breaking changes (si aplica)
  - Migration guide (si aplica)
  - Files: `docs/accommodation-units-redesign/fase-4/CHANGES.md`
  - Agent: **@agent-ux-interface**
  - Test: Changelog completo y preciso

### 4.11 Documentar FASE 4
- [ ] Crear documentación final de proyecto (estimate: 20min)
  - Files: `docs/accommodation-units-redesign/fase-4/IMPLEMENTATION.md`
  - Files: `docs/accommodation-units-redesign/fase-4/TESTING_REPORT.md` (ya creado)
  - Files: `docs/accommodation-units-redesign/fase-4/PERFORMANCE_ANALYSIS.md` (ya creado)
  - Agent: **@agent-ux-interface**
  - Test: Archivos completos, proyecto documentado

---

## 📊 PROGRESO

**Total Tasks:** 42
**Completed:** 10/42 (23.8%)

**Por Fase:**
- FASE 0: 2/5 tareas (40%) ⏸ Planificación (parcial)
- FASE 1: 6/6 tareas (100%) ✅ COMPLETADA + Testing
- FASE 2: 0/8 tareas (0%) ⏸ Pendiente
- FASE 3: 0/9 tareas (0%) ⏸ Pendiente
- FASE 4: 2/11 tareas (18.2%) ⚙️ Testing funcional completado

**Tiempo invertido:**
- FASE 0: ~45min (planning parcial)
- FASE 1: ~5h (desarrollo + testing)
- FASE 4 (parcial): ~1.5h (testing funcional)

**Tiempo estimado restante:**
- FASE 2: ~5.5h (desarrollo)
- FASE 3: ~6.5h (desarrollo)
- FASE 4 (restante): ~4.5h (performance + refinamiento)
**Total restante:** ~16.5 horas

---

## 🎯 SIGUIENTE PASO

**FASE 1: ✅ COMPLETADA Y APROBADA**

**Testing Report Generado:**
- ✅ `docs/accommodation-units-redesign/fase-1/TESTING_REPORT.md`
- ✅ `docs/accommodation-units-redesign/fase-1/ISSUES.md`
- ✅ `docs/accommodation-units-redesign/fase-1/TESTING_CHECKLIST_COMPLETED.md`
- ✅ `docs/accommodation-units-redesign/fase-1/EXECUTIVE_SUMMARY.md`

**Resultado del Testing:**
- Pass Rate: 95.3% (82/86 items)
- Bugs Críticos: 0
- Bugs Menores: 2 (no bloqueadores)
- Build: ✅ Exitoso
- Estado: 🟢 APROBADO para merge a `staging`

**Próximo Paso:**
1. Merge a `staging` (usuario decide)
2. Testing manual en navegador (confirmación visual)
3. Comenzar FASE 2 (Página Individual - ya implementada, pendiente testing completo)

---

**Última actualización:** 2025-11-09
**Estado:** FASE 1 en progreso (1/6 tareas completas)
