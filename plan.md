# Fixed Layout Migration - Plan de Implementación

**Proyecto:** Fixed Layout Migration
**Fecha Inicio:** Octubre 4, 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal

Migrar la arquitectura del chat mobile de **flexbox (`flex-1`)** a **`position: fixed`** para preparar el sistema para features avanzadas como header expansible con campos de fecha, tarjetas de fotografía dinámicas, y templates/anuncios complejos.

### ¿Por qué?

- **Header Expansible**: Actualmente el header tiene altura fija (64px). Necesitamos soportar campos de fecha check-in/check-out (40px), filtros dinámicos (30px), y carrusel de fotos (120px) sin romper el scroll del área de mensajes.
- **Keyboard iOS Behavior**: La arquitectura flexbox actual causa problemas de recalculación cuando el keyboard aparece/desaparece. `position: fixed` es más predecible.
- **Cálculos Explícitos**: En lugar de depender de `flex-1` (que calcula automáticamente), queremos control total sobre la altura del área de mensajes mediante cálculos CSS explícitos.
- **Escalabilidad**: Preparar el sistema para agregar componentes dinámicos (tarjetas de anuncios, templates, CTAs) sin efectos secundarios en el layout.

### Alcance

- ✅ Migrar `DevChatMobileDev.tsx` (desarrollo)
- ✅ Migrar `ChatMobile.tsx` (producción)
- ✅ Mantener comportamiento idéntico (scroll, pull-to-refresh, welcome message)
- ✅ Mantener safe areas (notch/home bar iOS/Android)
- ✅ Testing exhaustivo en iPhone 15/14, Pixel 8, Galaxy S24
- ❌ NO agregar features nuevas (solo migración de arquitectura)
- ❌ NO modificar lógica de negocio o API calls

---

## 📊 ESTADO ACTUAL

### Sistema Existente

**Arquitectura Flexbox:**
```tsx
<div className="flex flex-col h-screen">          // ❌ Contenedor flexbox
  <header className="fixed top-0 ...">            // ✅ Header fixed (bien)
  <div className="flex-1 overflow-y-auto ...">    // ❌ Messages con flex-1 (problemático)
  <div className="fixed bottom-0 ...">            // ✅ Input fixed (bien)
```

**Funcionando correctamente:**
- ✅ Header fixed con safe-area-inset-top
- ✅ Input fixed con safe-area-inset-bottom
- ✅ Scroll behavior suave
- ✅ Pull-to-refresh
- ✅ Welcome message positioning
- ✅ Typing dots animation
- ✅ Photo carousel (DevPhotoCarousel)
- ✅ Suggestion pills
- ✅ Error banner sticky

### Limitaciones Actuales

- ❌ **Header NO puede crecer dinámicamente**: Si agregamos campos de fecha (40px) o photo cards (120px), el área de mensajes NO se ajusta automáticamente porque usa `flex-1`.
- ❌ **Keyboard iOS issues**: En algunos casos, cuando el keyboard aparece, el área de mensajes se recalcula incorrectamente.
- ❌ **Dependencia de flexbox**: El cálculo de altura es implícito (`flex-1`), no tenemos control explícito.
- ❌ **Difícil agregar componentes dinámicos**: Templates, anuncios, CTAs en header requieren recalculación manual del área de mensajes.

---

## 🚀 ESTADO DESEADO

### Nueva Arquitectura Fixed

```tsx
<div>                                             // ✅ Simple wrapper (sin flexbox)
  <header className="fixed top-0 ...">            // ✅ FIXED desde top (puede crecer)
    {/* Header puede crecer todo lo necesario */}
    <DateFields />                                // +40px
    <PhotoCards />                                // +120px
    <Templates />                                 // +variable
  </header>

  <main className="fixed" style={{               // ✅ FIXED con cálculo explícito
    top: 'calc(64px + env(safe-area-inset-top))', // Desde abajo del header
    bottom: 'calc(80px + env(safe-area-inset-bottom))', // Hasta arriba del input
    left: 0,
    right: 0,
    overflowY: 'auto'
  }}>
    {messages}
  </main>

  <footer className="fixed bottom-0 ...">        // ✅ FIXED desde bottom (sin cambios)
```

### Nueva Experiencia

**Para el usuario:** Comportamiento idéntico (sin cambios visibles)

**Para el desarrollador:**
- Header puede crecer/encogerse dinámicamente
- Área de mensajes siempre sabe su altura exacta
- Keyboard behavior más predecible
- Fácil agregar componentes dinámicos en el futuro

### Características Clave

- **Altura Explícita**: Área de mensajes calcula su altura usando `top` y `bottom` explícitos
- **Header Variable**: Puede agregar/quitar componentes sin romper scroll
- **Safe Areas**: Mantiene `env(safe-area-inset-top/bottom)` para notch/home bar
- **Zero Breaking Changes**: Mismo comportamiento exacto que versión actual

---

## 📱 TECHNICAL STACK

### Frontend
- **Next.js 14** - App Router
- **React 18** - Client components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling con CSS variables

### Layout Strategy
- **Position Fixed**: Header, Messages, Input
- **CSS Calc**: Altura dinámica con `calc()`
- **CSS Variables**: `env(safe-area-inset-*)` para safe areas
- **No JavaScript**: Toda la altura calculada con CSS puro

---

## 🔧 DESARROLLO - FASES

### FASE 1: Migración DevChatMobileDev.tsx (2h)

**Objetivo:** Migrar archivo de desarrollo a arquitectura fixed sin romper funcionalidad.

**Entregables:**
1. Wrapper sin flexbox (eliminar `flex flex-col h-screen`)
2. Messages área con `position: fixed` y cálculo explícito
3. Mantener header y input sin cambios (ya están fixed)
4. Verificar scroll behavior idéntico
5. Verificar pull-to-refresh funciona
6. Verificar welcome message positioning correcto

**Archivos a modificar:**
- `src/components/Dev/DevChatMobileDev.tsx` (línea 320, 348)

**Cambios específicos:**

**1. Wrapper (línea 320):**
```tsx
// ❌ ANTES
<div className="flex flex-col h-screen bg-white" role="main">

// ✅ DESPUÉS
<div className="bg-white" role="main">
```

**2. Messages área (línea 348):**
```tsx
// ❌ ANTES
<div
  ref={messagesContainerRef}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  className="flex-1 overflow-y-auto px-4 bg-gradient-to-b from-amber-50 to-white pt-[calc(64px+env(safe-area-inset-top)+2rem)] pb-[calc(80px+env(safe-area-inset-bottom)+1rem)] overscroll-behavior-contain scroll-smooth relative"
  role="log"
  aria-live="polite"
  aria-atomic="false"
>

// ✅ DESPUÉS
<div
  ref={messagesContainerRef}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  className="fixed overflow-y-auto px-4 bg-gradient-to-b from-amber-50 to-white overscroll-behavior-contain scroll-smooth"
  style={{
    top: 'calc(64px + env(safe-area-inset-top))',
    bottom: 'calc(80px + env(safe-area-inset-bottom))',
    left: 0,
    right: 0,
    paddingTop: '2rem',
    paddingBottom: '1rem'
  }}
  role="log"
  aria-live="polite"
  aria-atomic="false"
>
```

**3. Header (línea 322) - SIN CAMBIOS:**
```tsx
// ✅ Ya está correcto, NO tocar
<header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white shadow-md pt-[env(safe-area-inset-top)]">
```

**4. Input (línea 482) - SIN CAMBIOS:**
```tsx
// ✅ Ya está correcto, NO tocar
<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
```

**Testing:**
- [ ] iPhone 15: Scroll suave, safe areas correctas
- [ ] iPhone 14: Notch positioning correcto
- [ ] Android Pixel 8: Scroll performance
- [ ] Galaxy S24: Home bar spacing
- [ ] Pull-to-refresh: Debe mostrar "↓ Ir al inicio"
- [ ] Welcome message: Debe aparecer centrado verticalmente
- [ ] Keyboard iOS: Debe comportarse correctamente
- [ ] Typing dots: Animación debe funcionar
- [ ] Photo carousel: Debe scrollear horizontalmente
- [ ] Suggestion pills: Deben ser clickeables (44px min)

---

### FASE 2: Testing Exhaustivo Dev (1h)

**Objetivo:** Validar que CERO funcionalidad se rompió en DevChatMobileDev.tsx

**Entregables:**
1. Checklist completo de funcionalidad
2. Screenshots de iPhone/Android
3. Performance metrics (Lighthouse)
4. Documentación de cualquier issue encontrado

**Testing Manual:**
- [ ] **Scroll behavior**: Identical to before
- [ ] **Pull-to-refresh**: Trigger at 80px, show indicator, scroll to top
- [ ] **Welcome message**: Centered vertically with padding-top
- [ ] **Message rendering**: User right, assistant left, markdown working
- [ ] **Photo carousel**: Horizontal scroll, lazy loading
- [ ] **Suggestion pills**: Clickable, populate input
- [ ] **Typing dots**: Animate while loading
- [ ] **Error banner**: Sticky bottom, retry/dismiss
- [ ] **Input field**: Auto-resize, max 2000 chars
- [ ] **Send button**: Disabled when empty/loading/no tenant
- [ ] **New conversation**: Clears messages, resets session
- [ ] **Safe areas**: Notch/home bar spacing correct

**Testing Devices:**
- [ ] iPhone 15 (430x932) - Safari
- [ ] iPhone 14 (390x844) - Safari
- [ ] Pixel 8 (412x915) - Chrome
- [ ] Galaxy S24 (360x800) - Chrome

**Performance:**
- [ ] Lighthouse Score ≥90
- [ ] 60fps scroll
- [ ] No layout shifts (CLS)

**Archivos a documentar:**
- `docs/fixed-layout-migration/fase-2/TESTS.md`
- `docs/fixed-layout-migration/fase-2/SCREENSHOTS/` (4 devices)

---

### FASE 3: Migración ChatMobile.tsx (1h)

**Objetivo:** Aplicar EXACTAMENTE los mismos cambios a producción.

**Entregables:**
1. ChatMobile.tsx migrado a fixed architecture
2. Código idéntico a DevChatMobileDev.tsx (excepto API routes)
3. Verificación rápida en dev server

**Archivos a modificar:**
- `src/components/Public/ChatMobile.tsx` (línea 320, 348)

**Cambios específicos:**

**EXACTAMENTE IGUALES A FASE 1**, con estas únicas diferencias:

1. **localStorage key**: `public_chat_session_id` (línea 88)
2. **API routes**: `/api/public/chat/stream` (línea 165)
3. **NO tiene badge "🚧 DEV"** en header
4. **Import paths**: `../Dev/DevPhotoCarousel` (línea 8)

**Testing:**
- [ ] Verificar en `/chat-mobile` (producción)
- [ ] Scroll behavior idéntico a dev
- [ ] Safe areas correctas
- [ ] Pull-to-refresh funciona

---

### FASE 4: Testing Final + Validación (1h)

**Objetivo:** Validación completa de ambos archivos (dev + prod) y documentación final.

**Entregables:**
1. Checklist completo de regresión
2. Performance comparison (antes/después)
3. Documentación final en docs/
4. TODO.md actualizado con [x]

**Testing de Regresión:**
- [ ] **DevChatMobileDev.tsx** (`/dev-chat-mobile-dev`):
  - Scroll, pull-to-refresh, welcome message
  - Photo carousel, suggestions, typing dots
  - Error banner, input, send button
  - Safe areas en 4 devices
- [ ] **ChatMobile.tsx** (`/chat-mobile`):
  - Todo lo anterior EXACTAMENTE igual
  - API calls a `/api/public/` funcionando
  - Session persistence con `public_chat_session_id`

**Performance Comparison:**

| Métrica | Antes | Después | Target |
|---------|-------|---------|--------|
| Lighthouse | - | - | ≥90 |
| FPS Scroll | - | - | 60fps |
| CLS | - | - | <0.1 |
| Layout Shift | - | - | 0 |

**Documentación Final:**
- `docs/fixed-layout-migration/IMPLEMENTATION.md` - Resumen completo
- `docs/fixed-layout-migration/CHANGES.md` - Lista de archivos modificados
- `docs/fixed-layout-migration/TESTS.md` - Resultados consolidados
- `docs/fixed-layout-migration/MIGRATION_GUIDE.md` - Guía para futuros cambios

**Checklist de Finalización:**
- [ ] Todos los tests pasan
- [ ] Documentación completa
- [ ] TODO.md actualizado
- [ ] Código revisado por usuario
- [ ] Listo para commit

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Scroll behavior IDÉNTICO a versión anterior
- [ ] Pull-to-refresh funciona en ambos archivos
- [ ] Welcome message positioning correcto
- [ ] Photo carousel funciona
- [ ] Suggestion pills clickeables
- [ ] Typing dots animados
- [ ] Error banner sticky
- [ ] Input auto-resize
- [ ] Send button states correctos
- [ ] New conversation limpia estado

### Performance
- [ ] Lighthouse Score ≥90 (Mobile)
- [ ] 60fps scroll en iPhone/Android
- [ ] CLS (Cumulative Layout Shift) <0.1
- [ ] Zero layout shifts durante scroll
- [ ] Keyboard aparece/desaparece sin jumps

### Accesibilidad
- [ ] Safe areas correctas (notch/home bar)
- [ ] Área clickeable ≥44px (suggestion pills, buttons)
- [ ] ARIA labels presentes
- [ ] Keyboard navigation funcional

### Código
- [ ] Zero breaking changes en lógica de negocio
- [ ] Zero cambios en API calls
- [ ] Zero cambios en state management
- [ ] Solo cambios en layout/CSS

---

## 🤖 AGENTES REQUERIDOS

### 1. **ux-interface** (Principal)

**Responsabilidad:** Implementación completa de la migración de layout.

**Tareas:**
- **FASE 1**: Migrar DevChatMobileDev.tsx a fixed architecture
- **FASE 2**: Testing exhaustivo con checklist y screenshots
- **FASE 3**: Migrar ChatMobile.tsx con mismos cambios
- **FASE 4**: Validación final y documentación

**Archivos:**
- `src/components/Dev/DevChatMobileDev.tsx` (modificar)
- `src/components/Public/ChatMobile.tsx` (modificar)
- `docs/fixed-layout-migration/**` (crear documentación)

**Skills necesarias:**
- CSS positioning (fixed, calc, env)
- React component structure
- Mobile responsive design
- Testing metodología
- Documentación técnica

---

### 2. **deploy-agent** (Opcional)

**Responsabilidad:** Deploy final después de aprobación.

**Tareas:**
- **FASE 4+**: Commit con mensaje descriptivo
- **FASE 4+**: Deploy a Vercel
- **FASE 4+**: Verificación post-deploy

**Archivos:**
- Git commit de cambios aprobados
- Vercel deployment

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── src/
│   └── components/
│       ├── Dev/
│       │   └── DevChatMobileDev.tsx    [MODIFICAR - FASE 1]
│       └── Public/
│           └── ChatMobile.tsx          [MODIFICAR - FASE 3]
├── docs/
│   └── fixed-layout-migration/
│       ├── fase-1/
│       │   ├── IMPLEMENTATION.md
│       │   ├── CHANGES.md
│       │   └── TESTS.md
│       ├── fase-2/
│       │   ├── TESTS.md
│       │   └── SCREENSHOTS/
│       │       ├── iphone15.png
│       │       ├── iphone14.png
│       │       ├── pixel8.png
│       │       └── galaxy-s24.png
│       ├── fase-3/
│       │   ├── IMPLEMENTATION.md
│       │   ├── CHANGES.md
│       │   └── TESTS.md
│       ├── fase-4/
│       │   ├── TESTS.md
│       │   └── PERFORMANCE.md
│       ├── IMPLEMENTATION.md           [Final summary]
│       ├── CHANGES.md                  [All files changed]
│       ├── TESTS.md                    [All tests consolidated]
│       └── MIGRATION_GUIDE.md          [Guide for future changes]
├── plan.md                             [ESTE ARCHIVO]
├── TODO.md                             [Tareas por FASE]
└── fixed-layout-migration-prompt-workflow.md  [Prompts ejecutables]
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

**1. Safe Areas:**
- Mantener `env(safe-area-inset-top)` para notch (iPhone 15/14)
- Mantener `env(safe-area-inset-bottom)` para home bar (iPhone/Android)
- No hardcodear valores, siempre usar CSS variables

**2. Cálculo de Altura:**
- Top del área de mensajes: `calc(64px + env(safe-area-inset-top))`
- Bottom del área de mensajes: `calc(80px + env(safe-area-inset-bottom))`
- 64px = altura del header
- 80px = altura del input área

**3. Padding Interno:**
- Mover `pt-[calc(...+2rem)]` y `pb-[calc(...+1rem)]` a inline style
- Usar `paddingTop: '2rem'` y `paddingBottom: '1rem'`
- Esto evita conflictos con positioning

**4. Z-Index Layers:**
- Header: `z-50`
- Messages: (default, sin z-index)
- Input: `z-50`
- Error banner: `z-40`
- Pull-to-refresh indicator: `z-10`

**5. Testing Crítico:**
- **Welcome message**: DEBE aparecer centrado verticalmente
- **Pull-to-refresh**: DEBE funcionar exactamente igual
- **Scroll suavidad**: DEBE ser 60fps
- **Keyboard iOS**: DEBE comportarse sin jumps

**6. NO Modificar:**
- ❌ Lógica de negocio (`sendMessage`, `handleNewConversation`)
- ❌ API calls (`/api/dev/chat/stream`, `/api/public/chat/stream`)
- ❌ State management (`useState`, `useEffect`)
- ❌ Event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`)
- ❌ Componentes lazy (`ReactMarkdown`, `DevPhotoCarousel`)

**7. Solo Modificar:**
- ✅ Wrapper `className` (quitar `flex flex-col h-screen`)
- ✅ Messages `className` + `style` (cambiar `flex-1` a `fixed`)
- ✅ Nada más

### Preparación para Futuras Features

Una vez completada esta migración, será FÁCIL agregar:

**Header Expansible:**
```tsx
<header className="fixed top-0 ...">
  <div className="h-16">/* Logo/Nav actual */</div>
  <DateFields className="h-10" />  {/* +40px */}
  <PhotoCards className="h-30" />  {/* +120px */}
</header>

<main style={{
  top: 'calc(186px + env(safe-area-inset-top))', // 64+40+120 = 224px
  ...
}}>
```

**Templates Dinámicos:**
```tsx
const headerHeight = 64 + (showDates ? 40 : 0) + (showCards ? 120 : 0);

<main style={{
  top: `calc(${headerHeight}px + env(safe-area-inset-top))`,
  ...
}}>
```

**CSS Variables (futuro):**
```css
--header-base: 64px;
--header-dates: 40px;
--header-cards: 120px;
--header-total: calc(var(--header-base) + var(--header-dates) + var(--header-cards));

top: calc(var(--header-total) + env(safe-area-inset-top));
```

---

**Última actualización:** Octubre 4, 2025
**Próximo paso:** Actualizar TODO.md con tareas específicas
**Estimación total:** 5 horas (FASE 1: 2h, FASE 2: 1h, FASE 3: 1h, FASE 4: 1h)
