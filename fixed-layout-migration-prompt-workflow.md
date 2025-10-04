# PROMPTS WORKFLOW - Fixed Layout Migration

**Proyecto:** Fixed Layout Migration
**Archivos de referencia:** `plan.md` + `TODO.md`

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Fixed Layout Migration

Estoy trabajando en el proyecto "Fixed Layout Migration" para migrar la arquitectura del chat mobile de flexbox (flex-1) a position: fixed.

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (415 líneas)
- TODO.md → Tareas organizadas por fases (28 tareas)
- fixed-layout-migration-prompt-workflow.md → Este archivo

OBJETIVO:
Preparar el chat mobile para soportar header expansible con campos de fecha, tarjetas de fotografía, y templates dinámicos sin romper el scroll behavior actual.

STACK:
- Next.js 14 + React 18 + TypeScript
- Tailwind CSS con CSS calc() y env() variables
- Position: fixed para Header + Messages + Input
- Safe areas: env(safe-area-inset-top/bottom)

ESTADO ACTUAL:
- ✅ Header y Input ya son position: fixed (correcto)
- ❌ Messages área usa flex-1 (problemático, no permite header expansible)
- 🔜 Migrar a position: fixed con cálculo explícito top/bottom

ARCHIVOS A MODIFICAR:
- src/components/Dev/DevChatMobileDev.tsx (desarrollo)
- src/components/Public/ChatMobile.tsx (producción)

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 1: Migración DevChatMobileDev.tsx (2h)

### Prompt 1.1: Modificar Wrapper y Messages Área

```
para Modificar Wrapper y Messages Área quiero que @ux-interface Migre DevChatMobileDev.tsx de arquitectura flexbox a position: fixed

CONTEXTO:
- Proyecto: Fixed Layout Migration (ver plan.md)
- Archivo base: src/components/Dev/DevChatMobileDev.tsx
- Objetivo: Cambiar wrapper y messages área sin romper funcionalidad

ESPECIFICACIONES:

1. **Wrapper Container (línea ~320)**
   CAMBIAR DE:
   ```tsx
   <div className="flex flex-col h-screen bg-white" role="main">
   ```

   CAMBIAR A:
   ```tsx
   <div className="bg-white" role="main">
   ```

   MANTENER:
   - role="main"
   - bg-white

   ELIMINAR:
   - flex
   - flex-col
   - h-screen

2. **Messages Área (línea ~348)**
   CAMBIAR DE:
   ```tsx
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
   ```

   CAMBIAR A:
   ```tsx
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

   CAMBIOS CRÍTICOS:
   - ELIMINAR: flex-1, pt-[calc(...)], pb-[calc(...)], relative
   - AGREGAR: fixed en className
   - AGREGAR: style object con top, bottom, left, right, paddingTop, paddingBottom
   - MANTENER: ref, event handlers, ARIA attributes, otras clases

   CÁLCULOS:
   - top: 64px (altura header) + env(safe-area-inset-top) para notch
   - bottom: 80px (altura input) + env(safe-area-inset-bottom) para home bar
   - paddingTop: 2rem (espacio superior interno)
   - paddingBottom: 1rem (espacio inferior interno)

3. **Header (línea ~322) - NO MODIFICAR**
   Ya está correcto con position: fixed

4. **Input (línea ~482) - NO MODIFICAR**
   Ya está correcto con position: fixed

CÓDIGO ESPERADO:
Solo dos bloques modificados, el resto sin cambios.

TEST:
1. npm run build (debe compilar sin errores)
2. ./scripts/dev-with-keys.sh
3. Abrir: http://localhost:3000/dev-chat-mobile-dev
4. Verificar: Welcome message visible y centrado
5. Verificar: Scroll funciona suavemente
6. Enviar mensaje y verificar respuesta

SIGUIENTE: Prompt 1.2 para testing exhaustivo
```

---

### Prompt 1.2: Testing Visual Básico FASE 1

```
ahora tu mismo @ux-interface Validaa cambios de FASE 1 con testing visual

CONTEXTO:
Completamos la migración de DevChatMobileDev.tsx. Ahora necesitamos verificar que:
- Zero breaking changes
- Scroll behavior idéntico
- Welcome message positioning correcto
- Safe areas funcionando

ARCHIVOS:
- Modificado: src/components/Dev/DevChatMobileDev.tsx
- Testing: Browser → http://localhost:3000/dev-chat-mobile-dev

CHECKLIST DE VALIDACIÓN:

1. **Build Check**
   - [ ] npm run build completa sin errores
   - [ ] Zero TypeScript errors
   - [ ] Zero warnings

2. **Visual Check - Primera Carga**
   - [ ] Welcome message aparece centrado verticalmente
   - [ ] Header está fixed arriba (con safe area)
   - [ ] Input está fixed abajo (con safe area)
   - [ ] NO hay layout shifts

3. **Scroll Behavior**
   - [ ] Área de mensajes es scrolleable
   - [ ] Scroll suave (no jumpy)
   - [ ] Header permanece fixed al scrollear
   - [ ] Input permanece fixed al scrollear

4. **Interacción Básica**
   - [ ] Input field acepta texto
   - [ ] Send button habilitado con texto
   - [ ] Enviar mensaje funciona
   - [ ] Respuesta del assistant aparece
   - [ ] Auto-scroll al nuevo mensaje
   - [ ] Typing dots animados mientras carga

5. **Safe Areas**
   - [ ] En iPhone: Header no queda debajo del notch
   - [ ] En iPhone: Input no queda debajo del home bar
   - [ ] Espaciado correcto top/bottom

TEST COMMANDS:
```bash
# 1. Build check
npm run build

# 2. Dev server
./scripts/dev-with-keys.sh

# 3. Browser
# Abrir: http://localhost:3000/dev-chat-mobile-dev
# Enviar mensaje: "Hola"
# Verificar respuesta
```

DOCUMENTACIÓN:
Si TODO funciona correctamente:
- Marcar tareas 1.1-1.6 en TODO.md como [x]
- Capturar screenshot de welcome message
- Capturar screenshot después de enviar mensaje

Si HAY ISSUES:
- Documentar en `docs/fixed-layout-migration/fase-1/ISSUES.md`
- NO marcar tareas como [x] hasta resolver

SIGUIENTE: Prompt 2.1 para testing exhaustivo
```

---

## FASE 2: Testing Exhaustivo Dev (1h)

### Prompt 2.1: para el Testing Completo de Funcionalidad, quiero que @ux-interface

TAREA: Ejecutar testing exhaustivo de todas las funcionalidades en DevChatMobileDev.tsx

CONTEXTO:
FASE 1 completada. Ahora necesitamos validar EXHAUSTIVAMENTE que CERO funcionalidad se rompió.

ARCHIVOS:
- Testing: http://localhost:3000/dev-chat-mobile-dev
- Documentar: docs/fixed-layout-migration/fase-2/TESTS.md

CHECKLIST EXHAUSTIVO:

**A. SCROLL BEHAVIOR**
- [ ] Enviar 10+ mensajes para forzar scroll
- [ ] Scroll suave a 60fps (NO jumpy)
- [ ] Auto-scroll al nuevo mensaje
- [ ] Manual scroll hacia arriba funciona
- [ ] Manual scroll hacia abajo retorna a último mensaje
- [ ] Overscroll behavior contenido (no bounce a página)

**B. PULL-TO-REFRESH**
- [ ] Scroll to top del área de mensajes
- [ ] Pull down ~100px
- [ ] Indicador "↓ Ir al inicio" aparece
- [ ] Scroll to top se ejecuta
- [ ] Indicador desaparece después de 300ms

**C. WELCOME MESSAGE POSITIONING**
- [ ] Limpiar localStorage: `localStorage.removeItem('dev_chat_session_id')`
- [ ] Recargar página
- [ ] Welcome message aparece centrado verticalmente
- [ ] Padding-top de 2rem aplicado
- [ ] NO queda pegado al header ni al input

**D. MESSAGE RENDERING**
- [ ] User messages: alineados derecha, fondo azul
- [ ] Assistant messages: alineados izquierda, fondo blanco
- [ ] Markdown rendering funciona (bold, lists, etc.)
- [ ] Timestamps visibles (formato es-CO)
- [ ] Max-width 85% aplicado

**E. PHOTO CAROUSEL**
- [ ] Enviar: "apartamentos" o "alojamientos"
- [ ] DevPhotoCarousel renderiza
- [ ] Scroll horizontal funciona
- [ ] Lazy loading funciona
- [ ] Imágenes cargan correctamente

**F. SUGGESTION PILLS**
- [ ] Pills aparecen después de respuesta
- [ ] Min-height 44px (touch target)
- [ ] Click popula input field
- [ ] Focus en input después de click
- [ ] Wrap correctamente en múltiples líneas

**G. TYPING DOTS**
- [ ] Enviar mensaje
- [ ] Typing dots (3) aparecen
- [ ] Animación bounce con delays (0ms, 150ms, 300ms)
- [ ] Dots desaparecen cuando llega contenido

**H. ERROR BANNER**
- [ ] Matar dev server o desconectar red
- [ ] Enviar mensaje
- [ ] Error banner aparece sticky bottom
- [ ] Mensaje de error visible
- [ ] Botón "Retry" funcional
- [ ] Botón "✕" cierra banner

**I. INPUT FIELD**
- [ ] Acepta texto (max 2000 chars)
- [ ] Auto-resize (hasta max-height)
- [ ] Enter sin Shift envía mensaje
- [ ] Enter con Shift hace newline
- [ ] Placeholder visible cuando vacío

**J. SEND BUTTON**
- [ ] Disabled cuando input vacío
- [ ] Disabled cuando loading
- [ ] Disabled cuando tenantId es null
- [ ] Enabled cuando tiene texto + tenant
- [ ] Click envía mensaje

**K. NEW CONVERSATION**
- [ ] Click en botón RotateCcw (header)
- [ ] Confirmar en prompt
- [ ] Mensajes se limpian
- [ ] Session se resetea
- [ ] Welcome message reaparece

**L. SAFE AREAS**
- [ ] iPhone 15/14: Header no debajo de notch
- [ ] iPhone 15/14: Input no debajo de home bar
- [ ] Android Pixel/Galaxy: Spacing correcto

TEST EXECUTION:
1. Ejecutar TODOS los items del checklist
2. Documentar CADA test en TESTS.md
3. Capturar screenshots de issues (si los hay)
4. Marcar SOLO tests que pasan

DOCUMENTACIÓN:
Crear: `docs/fixed-layout-migration/fase-2/TESTS.md`

Template:
```markdown
# FASE 2: Test Results

**Date:** Oct 4, 2025
**Status:** X/60 tests passing

## A. Scroll Behavior
- [x] 10+ messages scrolling - Passed
- [x] 60fps smooth - Passed
...

## Issues Found
1. [Issue description] - [Resolution]
```

SIGUIENTE: Prompt 2.2 para performance testing
```

---

### Prompt 2.2: Performance Testing con Lighthouse

```
@ux-interface

TAREA: Ejecutar Lighthouse performance testing

CONTEXTO:
Tests funcionales completados. Ahora medir performance objetivamente.

ESPECIFICACIONES:

1. **Lighthouse Mobile**
   - Abrir Chrome DevTools
   - Lighthouse tab → Mobile
   - Categories: Performance, Accessibility, Best Practices
   - Generate report

2. **Métricas Objetivo**
   - Performance Score: ≥90
   - FCP (First Contentful Paint): <2s
   - CLS (Cumulative Layout Shift): <0.1
   - TTI (Time to Interactive): <3s
   - Accessibility Score: ≥90

3. **FPS Testing**
   - Chrome DevTools → Performance tab
   - Record scrolling 10+ messages
   - Verify: 60fps sustained
   - Look for: frame drops, jank

TEST:
```bash
# 1. Dev server running
./scripts/dev-with-keys.sh

# 2. Chrome DevTools
# - Open: http://localhost:3000/dev-chat-mobile-dev
# - F12 → Lighthouse → Mobile → Generate report

# 3. Performance tab
# - Record
# - Scroll up/down
# - Stop
# - Check FPS graph
```

DOCUMENTACIÓN:
Agregar a `docs/fixed-layout-migration/fase-2/TESTS.md`:

```markdown
## Performance Metrics

**Lighthouse Mobile:**
- Performance: XX/100
- Accessibility: XX/100
- Best Practices: XX/100

**Core Web Vitals:**
- FCP: XXXms (target: <2000ms)
- CLS: X.XX (target: <0.1)
- TTI: XXXms (target: <3000ms)

**FPS Scroll:**
- Average: XXfps (target: 60fps)
- Drops: [list if any]

**Screenshot:** [link to Lighthouse report screenshot]
```

SIGUIENTE: Prompt 3.1 para migrar ChatMobile.tsx
```

---

## FASE 3: Migración ChatMobile.tsx (1h)

### Prompt 3.1: Migrar ChatMobile.tsx (Producción)

```
@ux-interface

TAREA: Aplicar EXACTAMENTE los mismos cambios de FASE 1 a ChatMobile.tsx

CONTEXTO:
- DevChatMobileDev.tsx migrado y testeado exitosamente
- Ahora aplicar cambios idénticos a archivo de producción
- Mantener diferencias específicas de producción

ARCHIVOS:
- Modificar: src/components/Public/ChatMobile.tsx
- Referencia: src/components/Dev/DevChatMobileDev.tsx

ESPECIFICACIONES:

1. **Wrapper Container (línea ~320)**
   IDÉNTICO a FASE 1.1:
   ```tsx
   <div className="bg-white" role="main">
   ```

2. **Messages Área (línea ~348)**
   IDÉNTICO a FASE 1.1:
   ```tsx
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

3. **DIFERENCIAS A MANTENER** (NO tocar):
   - localStorage key: `public_chat_session_id` (línea ~88)
   - API route: `/api/public/chat/stream` (línea ~165)
   - NO tiene badge "🚧 DEV" en header
   - Import paths: `../Dev/DevPhotoCarousel` (línea ~8)

4. **Header y Input - NO MODIFICAR**
   Ya están correctos con position: fixed

VERIFICACIÓN:
Después de modificar, comparar con DevChatMobileDev.tsx:
- Wrapper: IDÉNTICO
- Messages área className: IDÉNTICO
- Messages área style: IDÉNTICO
- Diferencias SOLO en: localStorage key, API route, imports, badge

TEST:
```bash
# 1. Build check
npm run build

# 2. Dev server
./scripts/dev-with-keys.sh

# 3. Browser
# Abrir: http://localhost:3000/chat-mobile
# Enviar mensaje: "Hola"
# Verificar: API call a /api/public/chat/stream
```

DOCUMENTACIÓN:
Crear: `docs/fixed-layout-migration/fase-3/IMPLEMENTATION.md`
Crear: `docs/fixed-layout-migration/fase-3/CHANGES.md`
Crear: `docs/fixed-layout-migration/fase-3/TESTS.md`

SIGUIENTE: Prompt 4.1 para testing final
```

---

## FASE 4: Testing Final + Validación (1h)

### Prompt 4.1: Testing de Regresión Completo

```
@ux-interface

TAREA: Ejecutar testing de regresión en AMBOS archivos (dev + prod)

CONTEXTO:
Ambas migraciones completadas. Ahora validar que TODO funciona idénticamente.

ARCHIVOS:
- Testing: /dev-chat-mobile-dev + /chat-mobile
- Documentar: docs/fixed-layout-migration/fase-4/TESTS.md

CHECKLIST DE REGRESIÓN:

**PARTE A: DevChatMobileDev.tsx (/dev-chat-mobile-dev)**
Ejecutar TODAS las verificaciones de FASE 2 (60 items)
- Scroll behavior (6 items)
- Pull-to-refresh (5 items)
- Welcome message (4 items)
- Message rendering (5 items)
- Photo carousel (5 items)
- Suggestion pills (5 items)
- Typing dots (4 items)
- Error banner (5 items)
- Input field (5 items)
- Send button (5 items)
- New conversation (5 items)
- Safe areas (6 items)

**PARTE B: ChatMobile.tsx (/chat-mobile)**
Ejecutar EXACTAMENTE el mismo checklist (60 items)

PLUS:
- [ ] API calls a `/api/public/chat/stream` funcionan
- [ ] Session persistence con `public_chat_session_id`
- [ ] NO aparece badge "🚧 DEV"
- [ ] Import de DevPhotoCarousel funciona

**PARTE C: Cross-Browser Testing**
- [ ] Safari iOS (iPhone 15/14)
- [ ] Chrome Android (Pixel 8, Galaxy S24)
- [ ] Chrome Desktop
- [ ] Safari macOS
- [ ] Firefox Desktop
- [ ] Edge Desktop

**PARTE D: Performance Comparison**

| Archivo | Lighthouse | FPS | CLS |
|---------|-----------|-----|-----|
| DevChatMobileDev.tsx | XX/100 | XXfps | X.XX |
| ChatMobile.tsx | XX/100 | XXfps | X.XX |

TEST EXECUTION:
1. Ejecutar TODAS las verificaciones
2. Documentar CADA test
3. Capturar screenshots comparativos
4. Identificar CUALQUIER diferencia

DOCUMENTACIÓN:
```markdown
# FASE 4: Final Regression Testing

**Date:** Oct 4, 2025
**Status:** X/120 tests passing (60 per file)

## DevChatMobileDev.tsx
[Full checklist results]

## ChatMobile.tsx
[Full checklist results]

## Cross-Browser Results
[Browser compatibility matrix]

## Performance Comparison
[Table with metrics]

## Issues Found
[List any regressions]
```

SIGUIENTE: Prompt 4.2 para documentación final
```

---

### Prompt 4.2: Documentación Final del Proyecto

```
@ux-interface

TAREA: Crear documentación final consolidada del proyecto

CONTEXTO:
Todas las fases completadas. Ahora consolidar documentación para referencia futura.

ARCHIVOS A CREAR:

1. **docs/fixed-layout-migration/IMPLEMENTATION.md**
   ```markdown
   # Fixed Layout Migration - Implementation Summary

   ## Overview
   Successfully migrated chat mobile architecture from flexbox to position: fixed.

   ## Changes Made

   ### DevChatMobileDev.tsx
   - Wrapper: Removed flex/flex-col/h-screen
   - Messages: Changed flex-1 to fixed with explicit top/bottom
   - Result: Header can now expand dynamically

   ### ChatMobile.tsx
   - Identical changes to DevChatMobileDev.tsx
   - Maintained production-specific differences (API routes, localStorage keys)

   ## Before/After Code

   **BEFORE:**
   ```tsx
   <div className="flex flex-col h-screen">
     <div className="flex-1 overflow-y-auto ...">
   ```

   **AFTER:**
   ```tsx
   <div>
     <div className="fixed overflow-y-auto ..." style={{top: '...', bottom: '...'}}>
   ```

   ## Results
   - Zero breaking changes
   - Performance maintained (Lighthouse ≥90)
   - Ready for header expansion features
   ```

2. **docs/fixed-layout-migration/CHANGES.md**
   ```markdown
   # Files Changed

   ## Modified
   - `src/components/Dev/DevChatMobileDev.tsx`
     - Line 320: Wrapper className
     - Line 348: Messages área className + style

   - `src/components/Public/ChatMobile.tsx`
     - Line 320: Wrapper className
     - Line 348: Messages área className + style

   ## Created
   - `plan.md` (415 lines)
   - `TODO.md` (280 lines)
   - `fixed-layout-migration-prompt-workflow.md` (650 lines)
   - `docs/fixed-layout-migration/**` (documentation)

   ## Not Modified
   - Header components (already fixed)
   - Input components (already fixed)
   - Business logic (zero changes)
   - API routes (zero changes)
   - State management (zero changes)
   ```

3. **docs/fixed-layout-migration/TESTS.md**
   ```markdown
   # Consolidated Test Results

   ## Summary
   - Total tests: 120 (60 per file)
   - Passed: X/120
   - Failed: Y/120
   - Coverage: Functionality, Performance, Cross-browser

   ## Functionality Tests
   [Consolidated checklist from FASE 2 + 4]

   ## Performance Tests
   [Lighthouse scores, FPS metrics]

   ## Cross-Browser Tests
   [Compatibility matrix]
   ```

4. **docs/fixed-layout-migration/MIGRATION_GUIDE.md**
   ```markdown
   # Migration Guide for Future Changes

   ## When to Update Layout

   If you need to add components to header:

   1. Add component to header (can expand freely)
   2. Update messages área `top` calculation:
      ```tsx
      top: 'calc(XXpx + env(safe-area-inset-top))'
      ```
      Where XX = total header height

   ## Examples

   ### Adding Date Fields (40px)
   ```tsx
   // Header now: 64px base + 40px dates = 104px
   top: 'calc(104px + env(safe-area-inset-top))'
   ```

   ### Adding Photo Cards (120px)
   ```tsx
   // Header now: 64px + 40px + 120px = 224px
   top: 'calc(224px + env(safe-area-inset-top))'
   ```

   ## Testing Checklist
   - [ ] Welcome message still centered
   - [ ] Scroll still smooth
   - [ ] Pull-to-refresh still works
   - [ ] Safe areas still correct
   ```

ENTREGABLES:
- IMPLEMENTATION.md con before/after code
- CHANGES.md con lista completa de archivos
- TESTS.md consolidado
- MIGRATION_GUIDE.md para futuro

SIGUIENTE: Actualizar TODO.md con [x] en tareas completadas
```

---

### Prompt 4.3: Finalización y Aprobación

```
@ux-interface

TAREA: Preparar código para revisión final del usuario

CONTEXTO:
Proyecto completado. Preparar presentación de cambios para aprobación.

PASOS:

1. **Actualizar TODO.md**
   - Marcar con `[x]` SOLO tareas con tests pasados
   - Actualizar sección PROGRESO
   - Agregar timestamp de finalización

2. **Git Diff Review**
   ```bash
   git diff --no-pager src/components/Dev/DevChatMobileDev.tsx
   git diff --no-pager src/components/Public/ChatMobile.tsx
   ```

   Verificar:
   - Solo cambios de layout (NO lógica)
   - Cambios idénticos en ambos archivos
   - Zero breaking changes

3. **Presentar al Usuario**
   ```markdown
   # Fixed Layout Migration - COMPLETADO ✅

   ## Resumen
   - Archivos modificados: 2
   - Líneas cambiadas: ~20 total
   - Tests ejecutados: 120
   - Tests pasados: X/120
   - Performance: Lighthouse ≥90 ✅

   ## Cambios

   **DevChatMobileDev.tsx:**
   - Wrapper: Eliminado flexbox
   - Messages: Migrado a position: fixed

   **ChatMobile.tsx:**
   - Cambios idénticos
   - Diferencias de producción mantenidas

   ## Testing
   - Funcionalidad: ✅ Zero breaking changes
   - Performance: ✅ Lighthouse ≥90, 60fps scroll
   - Cross-browser: ✅ Safari, Chrome, Firefox, Edge
   - Safe areas: ✅ iPhone/Android correctos

   ## Documentación
   - plan.md (415 líneas)
   - TODO.md (280 líneas)
   - workflow.md (650 líneas)
   - docs/fixed-layout-migration/ (completo)

   ## Próximos Pasos
   1. Revisar cambios de código (git diff)
   2. Aprobar para commit
   3. Commit + deploy (opcional, con @deploy-agent)

   ## Beneficios Logrados
   - ✅ Header puede expandirse dinámicamente
   - ✅ Fácil agregar campos de fecha
   - ✅ Fácil agregar photo cards
   - ✅ Fácil agregar templates
   - ✅ Keyboard iOS más predecible
   - ✅ Cálculos de altura explícitos
   ```

SOLICITAR AL USUARIO:
1. ¿Apruebas los cambios de código?
2. ¿Quieres que cree el commit?
3. ¿Quieres deploy automático con @deploy-agent?

SIGUIENTE: Si aprobado → @deploy-agent para commit + deploy
```

---

## 📋 DOCUMENTACIÓN FINAL

### Prompt: Documentar Proyecto Completo

```
He completado todas las FASES del proyecto Fixed Layout Migration.

Necesito:

1. Crear documentación final en docs/fixed-layout-migration/
   - IMPLEMENTATION.md (resumen ejecutivo)
   - CHANGES.md (lista de archivos modificados)
   - TESTS.md (resultados consolidados de testing)
   - MIGRATION_GUIDE.md (guía para futuros cambios de header)

2. Actualizar TODO.md:
   - Marcar con [x] SOLO tareas que pasaron tests
   - Actualizar sección PROGRESO
   - Agregar timestamp de finalización

3. Preparar resumen ejecutivo para usuario:
   - Archivos modificados
   - Tests ejecutados/pasados
   - Performance metrics
   - Beneficios logrados
   - Git diff limpio

4. Solicitar aprobación final:
   - Revisión de código
   - Autorización para commit
   - Deploy (opcional)

Por favor procede con la documentación final.
```

---

**Última actualización:** Octubre 4, 2025
**Total Prompts:** 11 (Contexto + 4 FASES)
**Formato:** Copy-paste ready, self-contained
