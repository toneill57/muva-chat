# TODO - Fixed Layout Migration

**Proyecto:** Fixed Layout Migration
**Fecha:** Octubre 4, 2025
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 1: Migración DevChatMobileDev.tsx 🎯

### 1.1 Modificar wrapper container
- [ ] Eliminar clases flexbox del wrapper (estimate: 15min)
  - Cambiar `className="flex flex-col h-screen bg-white"` a `className="bg-white"`
  - Verificar que `role="main"` se mantiene
  - Files: `src/components/Dev/DevChatMobileDev.tsx` (línea 320)
  - Agent: **ux-interface**
  - Test: Visual check en browser - wrapper debe ser simple div

### 1.2 Migrar messages área a position fixed
- [ ] Reemplazar flex-1 con position fixed (estimate: 45min)
  - Cambiar `className` de messages container
  - Quitar: `flex-1`
  - Agregar: `fixed`
  - Agregar `style` object con top/bottom/left/right
  - Mover padding-top y padding-bottom a inline style
  - Mantener: `overflow-y-auto`, `px-4`, `bg-gradient-to-b`, `overscroll-behavior-contain`, `scroll-smooth`
  - Mantener: event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`)
  - Mantener: ARIA attributes (`role="log"`, `aria-live="polite"`, `aria-atomic="false"`)
  - Files: `src/components/Dev/DevChatMobileDev.tsx` (línea 348)
  - Agent: **ux-interface**
  - Test: npm run dev → abrir /dev-chat-mobile-dev → verificar scroll

### 1.3 Verificar header sin cambios
- [ ] Confirmar que header permanece intacto (estimate: 10min)
  - NO modificar className
  - NO modificar estructura
  - Verificar que sigue siendo `fixed top-0 left-0 right-0 z-50`
  - Files: `src/components/Dev/DevChatMobileDev.tsx` (línea 322)
  - Agent: **ux-interface**
  - Test: Visual check - header debe estar fixed arriba

### 1.4 Verificar input sin cambios
- [ ] Confirmar que input permanece intacto (estimate: 10min)
  - NO modificar className
  - NO modificar estructura
  - Verificar que sigue siendo `fixed bottom-0 left-0 right-0 z-50`
  - Files: `src/components/Dev/DevChatMobileDev.tsx` (línea 482)
  - Agent: **ux-interface**
  - Test: Visual check - input debe estar fixed abajo

### 1.5 Verificar código compilado sin errores
- [ ] Build check y type check (estimate: 10min)
  - Ejecutar: `npm run build`
  - Ejecutar: `npm run type-check` (si existe)
  - Verificar ZERO TypeScript errors
  - Verificar ZERO build warnings
  - Files: Terminal output
  - Agent: **ux-interface**
  - Test: npm run build (debe completar sin errores)

### 1.6 Testing visual básico en dev server
- [ ] Primera validación visual (estimate: 30min)
  - Iniciar dev server: `./scripts/dev-with-keys.sh`
  - Abrir: http://localhost:3000/dev-chat-mobile-dev
  - Verificar: Welcome message visible y centrado
  - Verificar: Header arriba (con safe area)
  - Verificar: Input abajo (con safe area)
  - Verificar: Área de mensajes scrolleable
  - Enviar mensaje de prueba
  - Verificar: Mensaje aparece, scroll automático funciona
  - Files: Browser
  - Agent: **ux-interface**
  - Test: Manual - abrir /dev-chat-mobile-dev en browser

---

## FASE 2: Testing Exhaustivo Dev ⚙️

### 2.1 Testing scroll behavior
- [ ] Validar comportamiento de scroll idéntico (estimate: 15min)
  - Enviar 10+ mensajes para forzar scroll
  - Verificar: Scroll suave (60fps)
  - Verificar: Auto-scroll al nuevo mensaje
  - Verificar: Manual scroll hacia arriba funciona
  - Verificar: Scroll hacia abajo retorna a último mensaje
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Manual scroll testing con 10+ mensajes

### 2.2 Testing pull-to-refresh
- [ ] Validar pull-to-refresh funciona (estimate: 10min)
  - Scroll to top del área de mensajes
  - Pull down 80px+
  - Verificar: Indicador "↓ Ir al inicio" aparece
  - Verificar: Scroll to top se ejecuta
  - Verificar: Indicador desaparece después de 300ms
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Pull down gesture en mensajes área

### 2.3 Testing welcome message positioning
- [ ] Validar mensaje de bienvenida centrado (estimate: 10min)
  - Abrir /dev-chat-mobile-dev (sin mensajes previos)
  - Verificar: Welcome message aparece centrado verticalmente
  - Verificar: Padding-top de 2rem aplicado
  - Verificar: NO queda pegado al header
  - Verificar: NO queda pegado al input
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Limpiar localStorage y recargar página

### 2.4 Testing photo carousel
- [ ] Validar carrusel de fotos funciona (estimate: 10min)
  - Enviar mensaje que devuelva fotos (ej: "apartamentos")
  - Verificar: DevPhotoCarousel renderiza
  - Verificar: Scroll horizontal funciona
  - Verificar: Lazy loading funciona
  - Verificar: Imágenes cargan correctamente
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Enviar "apartamentos" y verificar carousel

### 2.5 Testing suggestion pills
- [ ] Validar suggestion pills clickeables (estimate: 10min)
  - Verificar: Pills aparecen después de respuesta
  - Verificar: Min-height 44px para touch target
  - Verificar: Click popula input field
  - Verificar: Focus en input después de click
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Click en suggestion pill y verificar input

### 2.6 Testing typing dots
- [ ] Validar animación de typing dots (estimate: 5min)
  - Enviar mensaje
  - Verificar: Typing dots aparecen mientras carga
  - Verificar: Animación bounce funciona
  - Verificar: Dots desaparecen cuando llega respuesta
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Enviar mensaje y observar loading state

### 2.7 Testing error banner
- [ ] Validar error banner sticky (estimate: 10min)
  - Forzar error (desconectar red o matar backend)
  - Verificar: Error banner aparece sticky bottom
  - Verificar: Mensaje de error visible
  - Verificar: Botón "Retry" funcional
  - Verificar: Botón "✕" cierra banner
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Desconectar red y enviar mensaje

### 2.8 Testing safe areas en dispositivos iOS
- [ ] Validar safe areas en iPhone (estimate: 20min)
  - Dispositivos: iPhone 15 (430x932), iPhone 14 (390x844)
  - Browser: Safari Mobile
  - Verificar: Header no queda debajo del notch
  - Verificar: Input no queda debajo del home bar
  - Verificar: Área de mensajes calcula altura correcta
  - Verificar: env(safe-area-inset-top) aplicado
  - Verificar: env(safe-area-inset-bottom) aplicado
  - Files: iPhone - Safari
  - Agent: **ux-interface**
  - Test: Abrir en iPhone real o simulator

### 2.9 Testing safe areas en dispositivos Android
- [ ] Validar safe areas en Android (estimate: 15min)
  - Dispositivos: Pixel 8 (412x915), Galaxy S24 (360x800)
  - Browser: Chrome Mobile
  - Verificar: Header spacing correcto
  - Verificar: Input spacing correcto (home bar gesture)
  - Verificar: Área de mensajes altura correcta
  - Files: Android - Chrome
  - Agent: **ux-interface**
  - Test: Abrir en Android real o emulator

### 2.10 Performance testing Lighthouse
- [ ] Medir performance con Lighthouse (estimate: 10min)
  - Abrir Chrome DevTools
  - Run Lighthouse (Mobile)
  - Verificar: Score ≥90
  - Verificar: FCP (First Contentful Paint) <2s
  - Verificar: CLS (Cumulative Layout Shift) <0.1
  - Documentar: Screenshots de resultados
  - Files: Chrome DevTools
  - Agent: **ux-interface**
  - Test: Chrome DevTools → Lighthouse → Mobile

### 2.11 Documentar resultados FASE 2
- [ ] Crear documentación de testing (estimate: 20min)
  - Crear: `docs/fixed-layout-migration/fase-2/TESTS.md`
  - Incluir: Checklist completo de tests
  - Incluir: Screenshots de 4 dispositivos
  - Incluir: Lighthouse report
  - Incluir: Issues encontrados (si los hay)
  - Files: docs/fixed-layout-migration/fase-2/
  - Agent: **ux-interface**
  - Test: Revisar documentación completa

---

## FASE 3: Migración ChatMobile.tsx ✨

### 3.1 Modificar wrapper container (producción)
- [ ] Aplicar mismo cambio que FASE 1.1 (estimate: 10min)
  - Cambiar `className="flex flex-col h-screen bg-white"` a `className="bg-white"`
  - Files: `src/components/Public/ChatMobile.tsx` (línea 320)
  - Agent: **ux-interface**
  - Test: Visual check en browser - wrapper debe ser simple div

### 3.2 Migrar messages área a position fixed (producción)
- [ ] Aplicar mismo cambio que FASE 1.2 (estimate: 30min)
  - EXACTAMENTE los mismos cambios que DevChatMobileDev.tsx
  - Cambiar `className` de messages container
  - Agregar `style` object con top/bottom/left/right
  - Mantener diferencias específicas:
    - localStorage key: `public_chat_session_id` (NO cambiar)
    - API route: `/api/public/chat/stream` (NO cambiar)
    - NO tiene badge "🚧 DEV"
    - Import paths: `../Dev/DevPhotoCarousel`
  - Files: `src/components/Public/ChatMobile.tsx` (línea 348)
  - Agent: **ux-interface**
  - Test: npm run dev → abrir /chat-mobile → verificar scroll

### 3.3 Build check producción
- [ ] Verificar compilación sin errores (estimate: 5min)
  - Ejecutar: `npm run build`
  - Verificar ZERO errors
  - Verificar ZERO warnings
  - Files: Terminal
  - Agent: **ux-interface**
  - Test: npm run build

### 3.4 Testing visual rápido producción
- [ ] Primera validación de ChatMobile.tsx (estimate: 15min)
  - Abrir: http://localhost:3000/chat-mobile
  - Verificar: Layout idéntico a /dev-chat-mobile-dev
  - Verificar: Scroll funciona
  - Verificar: Welcome message centrado
  - Verificar: Safe areas correctas
  - Enviar mensaje de prueba
  - Verificar: API call a `/api/public/chat/stream` funciona
  - Files: Browser - /chat-mobile
  - Agent: **ux-interface**
  - Test: Abrir /chat-mobile en browser

### 3.5 Documentar cambios FASE 3
- [ ] Crear documentación de implementación (estimate: 15min)
  - Crear: `docs/fixed-layout-migration/fase-3/IMPLEMENTATION.md`
  - Crear: `docs/fixed-layout-migration/fase-3/CHANGES.md`
  - Crear: `docs/fixed-layout-migration/fase-3/TESTS.md`
  - Files: docs/fixed-layout-migration/fase-3/
  - Agent: **ux-interface**
  - Test: Revisar documentación

---

## FASE 4: Testing Final + Validación 🎨

### 4.1 Testing de regresión DevChatMobileDev.tsx
- [ ] Checklist completo de funcionalidad (estimate: 20min)
  - Scroll behavior: Suave, 60fps
  - Pull-to-refresh: Trigger at 80px
  - Welcome message: Centrado verticalmente
  - Message rendering: User/assistant, markdown
  - Photo carousel: Horizontal scroll
  - Suggestion pills: Clickeable, min 44px
  - Typing dots: Animación bounce
  - Error banner: Sticky, retry/dismiss
  - Input field: Auto-resize, max 2000 chars
  - Send button: Disabled states correctos
  - New conversation: Limpia mensajes
  - Safe areas: Notch/home bar spacing
  - Files: Browser - /dev-chat-mobile-dev
  - Agent: **ux-interface**
  - Test: Ejecutar checklist completo

### 4.2 Testing de regresión ChatMobile.tsx
- [ ] Checklist completo de funcionalidad (estimate: 20min)
  - EXACTAMENTE el mismo checklist que 4.1
  - Verificar: API calls a `/api/public/` funcionan
  - Verificar: Session persistence con `public_chat_session_id`
  - Verificar: NO tiene badge "🚧 DEV"
  - Files: Browser - /chat-mobile
  - Agent: **ux-interface**
  - Test: Ejecutar checklist completo

### 4.3 Performance comparison
- [ ] Comparar performance antes/después (estimate: 15min)
  - Lighthouse score antes (si existe)
  - Lighthouse score después (debe ser ≥90)
  - FPS scroll antes/después (debe ser 60fps)
  - CLS antes/después (debe ser <0.1)
  - Layout shifts (debe ser 0)
  - Documentar en tabla comparativa
  - Files: Chrome DevTools
  - Agent: **ux-interface**
  - Test: Lighthouse en ambos archivos

### 4.4 Testing cross-browser
- [ ] Validar en múltiples browsers (estimate: 15min)
  - Safari (iOS/macOS)
  - Chrome (Android/Desktop)
  - Firefox (Desktop)
  - Edge (Desktop)
  - Verificar: Comportamiento consistente
  - Documentar: Issues específicos de browser (si los hay)
  - Files: Multiple browsers
  - Agent: **ux-interface**
  - Test: Abrir en 4+ browsers diferentes

### 4.5 Crear documentación final consolidada
- [ ] Documentar implementación completa (estimate: 30min)
  - Crear: `docs/fixed-layout-migration/IMPLEMENTATION.md` (summary)
  - Crear: `docs/fixed-layout-migration/CHANGES.md` (all files)
  - Crear: `docs/fixed-layout-migration/TESTS.md` (consolidated)
  - Crear: `docs/fixed-layout-migration/MIGRATION_GUIDE.md` (future reference)
  - Incluir: Before/after code snippets
  - Incluir: Performance metrics
  - Incluir: Lessons learned
  - Files: docs/fixed-layout-migration/
  - Agent: **ux-interface**
  - Test: Revisar documentación completa

### 4.6 Actualizar TODO.md con checkmarks
- [ ] Marcar tareas completadas (estimate: 10min)
  - Revisar TODAS las tareas de FASE 1-4
  - Marcar con `[x]` SOLO las que pasaron tests
  - Dejar como `[ ]` si no se testearon o fallaron
  - Agregar notas para tests fallidos
  - Files: TODO.md
  - Agent: **ux-interface**
  - Test: Revisar que solo tareas testeadas están marcadas

### 4.7 Code review final
- [ ] Revisión de código por usuario (estimate: 15min)
  - Revisar: src/components/Dev/DevChatMobileDev.tsx
  - Revisar: src/components/Public/ChatMobile.tsx
  - Verificar: Solo cambios de layout (NO lógica)
  - Verificar: Zero breaking changes
  - Aprobar: Listo para commit
  - Files: Git diff
  - Agent: **ux-interface** (presenta para revisión del usuario)
  - Test: git diff --no-pager

---

## 📊 PROGRESO

**Total Tasks:** 28
**Completed:** 0/28 (0%)

**Por Fase:**
- FASE 1: 0/6 tareas (Migración DevChatMobileDev.tsx)
- FASE 2: 0/11 tareas (Testing Exhaustivo Dev)
- FASE 3: 0/5 tareas (Migración ChatMobile.tsx)
- FASE 4: 0/7 tareas (Testing Final + Validación)

**Estimación Total:** ~5 horas
- FASE 1: ~2h
- FASE 2: ~1h
- FASE 3: ~1h
- FASE 4: ~1h

---

**Última actualización:** Octubre 4, 2025
**Estado:** 📋 Planificación completa, listo para ejecutar FASE 1
**Siguiente paso:** Usar prompts de `fixed-layout-migration-prompt-workflow.md`
