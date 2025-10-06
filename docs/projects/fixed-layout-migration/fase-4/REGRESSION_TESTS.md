# Fixed Layout Migration - Regression Testing Checklist

**Proyecto:** Fixed Layout Migration - FASE 4
**Fecha:** Octubre 5, 2025
**Objetivo:** Validar que FASE 1-3 no introdujeron regresiones visuales o funcionales

---

## OVERVIEW

Esta checklist contiene **121 tests** para validar que la migración de flexbox a position:fixed no rompió ninguna funcionalidad existente.

**Archivos testeados:**
- `src/components/Dev/DevChatMobileDev.tsx` (61 tests - incluye G5 welcome message glitch fix)
- `src/components/Public/ChatMobile.tsx` (60 tests)

**Dispositivos objetivo:**
- iPhone 15 Pro Max (430×932, notch 59px, home bar 34px)
- iPhone 14 Pro (393×852, notch 54px, home bar 34px)
- Google Pixel 8 Pro (412×915, notch 48px, home bar 0px)
- Samsung Galaxy S24 (360×800, no notch, no home bar)

**Browsers:**
- Safari iOS 17+ (iPhone)
- Chrome Android 120+ (Pixel/Galaxy)
- Chrome Desktop 120+ (DevTools device mode)

---

## CHECKLIST: DevChatMobileDev.tsx (60 tests)

### A. Scroll Behavior (12 tests)

**Setup:** Enviar 10+ mensajes para forzar scroll

- [ ] **A1.** Scroll suave y fluido (60fps)
  - **Cómo:** Scroll rápidamente con dedo/touchpad
  - **Esperado:** Movimiento suave sin stuttering
  - **Dispositivos:** Todos

- [ ] **A2.** Auto-scroll al enviar mensaje nuevo
  - **Cómo:** Enviar mensaje mientras estás scrolled arriba
  - **Esperado:** Scroll automático al último mensaje
  - **Dispositivos:** Todos

- [ ] **A3.** Scroll hacia arriba mantiene posición
  - **Cómo:** Scroll 50% hacia arriba, esperar 5 segundos
  - **Esperado:** Posición NO cambia (no auto-scroll)
  - **Dispositivos:** Todos

- [ ] **A4.** Scroll hacia abajo al final posible
  - **Cómo:** Scroll hasta el último mensaje
  - **Esperado:** Se ve el último mensaje completo + padding-bottom 1rem
  - **Dispositivos:** Todos

- [ ] **A5.** Scroll momentum natural (iOS)
  - **Cómo:** Swipe rápido hacia arriba/abajo (iOS Safari)
  - **Esperado:** Efecto rebote natural de iOS
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **A6.** Overscroll behavior contenido
  - **Cómo:** Pull down past top, pull up past bottom
  - **Esperado:** NO afecta página exterior (overscroll-behavior-contain)
  - **Dispositivos:** Todos

- [ ] **A7.** Scroll no tapa header
  - **Cómo:** Scroll to top, verificar primer mensaje
  - **Esperado:** Header NO tapa ningún mensaje
  - **Dispositivos:** Todos

- [ ] **A8.** Scroll no tapa input
  - **Cómo:** Scroll to bottom, verificar último mensaje
  - **Esperado:** Input NO tapa ningún mensaje
  - **Dispositivos:** Todos

- [ ] **A9.** Keyboard NO rompe scroll (iOS)
  - **Cómo:** Tap input, keyboard aparece
  - **Esperado:** Mensajes siguen scrolleables, NO hay layout shift
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **A10.** Keyboard cierra sin layout shift (iOS)
  - **Cómo:** Abrir keyboard, luego toccar fuera para cerrar
  - **Esperado:** Mensajes área vuelve a tamaño normal sin saltos visuales
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **A11.** Scroll rápido multi-touch suave
  - **Cómo:** Scroll con dos dedos simultáneos (pinch gesture no, solo scroll)
  - **Esperado:** Scroll suave sin glitches
  - **Dispositivos:** Todos

- [ ] **A12.** Scroll con mensajes largos (1000+ caracteres)
  - **Cómo:** Enviar mensaje de 1500 caracteres
  - **Esperado:** Mensaje renderiza completo, scroll funciona normal
  - **Dispositivos:** Todos

---

### B. Pull-to-Refresh (8 tests)

**Setup:** Scroll to top del área de mensajes

- [ ] **B1.** Pull-to-refresh threshold correcto (80px)
  - **Cómo:** Pull down exactamente 80px
  - **Esperado:** Indicador "↓ Ir al inicio" aparece
  - **Dispositivos:** Todos

- [ ] **B2.** Pull-to-refresh NO activa antes de 80px
  - **Cómo:** Pull down 70px
  - **Esperado:** Indicador NO aparece
  - **Dispositivos:** Todos

- [ ] **B3.** Indicador bien posicionado (centrado)
  - **Cómo:** Activar pull-to-refresh
  - **Esperado:** Badge centrado horizontalmente, arriba del primer mensaje
  - **Dispositivos:** Todos

- [ ] **B4.** Scroll to top animado (300ms)
  - **Cómo:** Activar pull-to-refresh desde bottom
  - **Esperado:** Scroll animado suave hacia top
  - **Dispositivos:** Todos

- [ ] **B5.** Indicador desaparece después de 300ms
  - **Cómo:** Activar pull-to-refresh, contar 300ms
  - **Esperado:** Badge desaparece smooth
  - **Dispositivos:** Todos

- [ ] **B6.** Pull-to-refresh NO activa durante scroll medio
  - **Cómo:** Scroll 50% hacia abajo, intentar pull down
  - **Esperado:** Pull-to-refresh NO se activa (solo funciona en top)
  - **Dispositivos:** Todos

- [ ] **B7.** Pull-to-refresh respeta safe area top
  - **Cómo:** Activar pull-to-refresh en iPhone 15
  - **Esperado:** Indicador NO está tapado por notch
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **B8.** Pull gesture cancelable
  - **Cómo:** Pull down 100px, luego scroll up antes de soltar
  - **Esperado:** Pull-to-refresh NO se ejecuta
  - **Dispositivos:** Todos

---

### C. Welcome Message (6 tests)

**Setup:** Nueva conversación (localStorage cleared)

- [ ] **C1.** Welcome message visible al cargar
  - **Cómo:** Abrir /dev-chat-mobile-dev por primera vez
  - **Esperado:** Welcome message "¡Hola! Bienvenido a Simmer Down" visible
  - **Dispositivos:** Todos

- [ ] **C2.** Welcome message centrado verticalmente
  - **Cómo:** Medir distancia top vs bottom
  - **Esperado:** Welcome message aproximadamente centrado (padding-top: 2rem aplicado)
  - **Dispositivos:** Todos

- [ ] **C3.** Welcome message NO se auto-scrollea
  - **Cómo:** Cargar página, esperar 5 segundos
  - **Esperado:** Welcome message sigue en posición centrada (NO scroll al final)
  - **Dispositivos:** Todos

- [ ] **C4.** Welcome message renderiza Markdown
  - **Cómo:** Inspeccionar welcome message
  - **Esperado:** "¡Hola! Bienvenido a Simmer Down" en bold (**texto**)
  - **Dispositivos:** Todos

- [ ] **C5.** Welcome message timestamp visible
  - **Cómo:** Verificar debajo del mensaje
  - **Esperado:** Timestamp "12:34" visible en gray-500
  - **Dispositivos:** Todos

- [ ] **C6.** Welcome message persiste después de scroll
  - **Cómo:** Scroll down, luego scroll to top
  - **Esperado:** Welcome message sigue visible arriba
  - **Dispositivos:** Todos

---

### D. Message Rendering (10 tests)

**Setup:** Enviar 5 mensajes (3 user, 2 assistant)

- [ ] **D1.** User messages alineados derecha
  - **Cómo:** Enviar mensaje
  - **Esperado:** Bubble azul alineado derecha (justify-end)
  - **Dispositivos:** Todos

- [ ] **D2.** Assistant messages alineados izquierda
  - **Cómo:** Recibir respuesta
  - **Esperado:** Bubble blanco alineado izquierda (justify-start)
  - **Dispositivos:** Todos

- [ ] **D3.** User message styling correcto
  - **Cómo:** Inspeccionar mensaje user
  - **Esperado:** bg-blue-500, text-white, rounded-br-sm
  - **Dispositivos:** Todos

- [ ] **D4.** Assistant message styling correcto
  - **Cómo:** Inspeccionar mensaje assistant
  - **Esperado:** bg-white, text-gray-900, border-gray-100
  - **Dispositivos:** Todos

- [ ] **D5.** Markdown renderiza (bold, lists, hr)
  - **Cómo:** Enviar pregunta que genere lista markdown
  - **Esperado:** Listas con bullets, bold text, horizontal rules
  - **Dispositivos:** Todos

- [ ] **D6.** Message max-width 85%
  - **Cómo:** Enviar mensaje corto (10 caracteres)
  - **Esperado:** Bubble NO ocupa 100% del width
  - **Dispositivos:** Todos

- [ ] **D7.** Message entrance animation smooth
  - **Cómo:** Enviar mensaje
  - **Esperado:** Animación fade + slide (300ms ease-out)
  - **Dispositivos:** Todos

- [ ] **D8.** Timestamps visibles (gray-500, 12:34)
  - **Cómo:** Verificar debajo de cada mensaje
  - **Esperado:** Timestamps en formato 12h (es-CO locale)
  - **Dispositivos:** Todos

- [ ] **D9.** Mensajes largos (500+ chars) wrappean
  - **Cómo:** Enviar mensaje de 600 caracteres
  - **Esperado:** Texto wrappea, NO overflow horizontal
  - **Dispositivos:** Todos

- [ ] **D10.** Spacing entre mensajes (space-y-4)
  - **Cómo:** Enviar 3 mensajes consecutivos
  - **Esperado:** Gap 1rem (16px) entre cada mensaje
  - **Dispositivos:** Todos

---

### E. Photo Carousel (8 tests)

**Setup:** Hacer pregunta que retorne photos (e.g., "Show me Suite Oceanfront")

- [ ] **E1.** Photo carousel visible debajo del mensaje
  - **Cómo:** Recibir respuesta con photos
  - **Esperado:** Carousel horizontal debajo del text bubble
  - **Dispositivos:** Todos

- [ ] **E2.** Photos scrolleables horizontalmente
  - **Cómo:** Swipe left/right en carousel
  - **Esperado:** Smooth scroll horizontal entre fotos
  - **Dispositivos:** Todos

- [ ] **E3.** Photo captions visibles (unit_name)
  - **Cómo:** Verificar debajo de cada foto
  - **Esperado:** Caption "Suite Oceanfront" visible
  - **Dispositivos:** Todos

- [ ] **E4.** Photos lazy load correctamente
  - **Cómo:** Network tab → verificar requests
  - **Esperado:** Photos cargan solo cuando son visibles
  - **Dispositivos:** Chrome Desktop

- [ ] **E5.** Photo click abre lightbox (si implementado)
  - **Cómo:** Tap en foto
  - **Esperado:** Lightbox fullscreen (o zoom behavior)
  - **Dispositivos:** Todos

- [ ] **E6.** Multiple carousels en diferentes mensajes
  - **Cómo:** Hacer 2 preguntas que retornen photos
  - **Esperado:** Cada mensaje tiene su propio carousel independiente
  - **Dispositivos:** Todos

- [ ] **E7.** Carousel NO rompe layout en mobile small (360px)
  - **Cómo:** Galaxy S24 (360px width)
  - **Esperado:** Photos visibles, NO overflow
  - **Dispositivos:** Galaxy S24

- [ ] **E8.** Carousel respeta max-width 85%
  - **Cómo:** Medir width del carousel
  - **Esperado:** Carousel NO excede 85% del container
  - **Dispositivos:** Todos

---

### F. Suggestion Pills (8 tests)

**Setup:** Recibir mensaje assistant con suggestions array

- [ ] **F1.** Suggestion pills visibles debajo del mensaje
  - **Cómo:** Verificar debajo del text bubble
  - **Esperado:** Pills en flex-wrap gap-2
  - **Dispositivos:** Todos

- [ ] **F2.** Pill styling correcto (bg-teal-50, border-teal-200)
  - **Cómo:** Inspeccionar pill
  - **Esperado:** Background teal claro, border teal
  - **Dispositivos:** Todos

- [ ] **F3.** Pills clickeables (min-h-44px touch target)
  - **Cómo:** Tap en pill
  - **Esperado:** Input se rellena con suggestion text
  - **Dispositivos:** Todos (mobile)

- [ ] **F4.** Pills wrappean en múltiples líneas
  - **Cómo:** Recibir 5+ suggestions
  - **Esperado:** Pills wrappean, NO overflow horizontal
  - **Dispositivos:** Todos

- [ ] **F5.** Pill hover effect (desktop)
  - **Cómo:** Hover sobre pill en desktop
  - **Esperado:** Background cambia a teal-100
  - **Dispositivos:** Chrome Desktop

- [ ] **F6.** Pill focus visible (keyboard navigation)
  - **Cómo:** Tab hasta pill, verificar focus ring
  - **Esperado:** Focus outline visible
  - **Dispositivos:** Chrome Desktop

- [ ] **F7.** Input se rellena al hacer click
  - **Cómo:** Tap pill
  - **Esperado:** Textarea input muestra suggestion text
  - **Dispositivos:** Todos

- [ ] **F8.** Input recibe focus después de click
  - **Cómo:** Tap pill, verificar cursor
  - **Esperado:** Cursor activo en textarea
  - **Dispositivos:** Todos

---

### G. Typing Dots (5 tests)

**Setup:** Enviar mensaje, observar estado loading

- [ ] **G1.** Typing dots aparecen mientras loading=true
  - **Cómo:** Enviar mensaje, ver respuesta
  - **Esperado:** 3 dots animados (bounce animation)
  - **Dispositivos:** Todos

- [ ] **G2.** Typing dots staggered animation (150ms, 300ms delay)
  - **Cómo:** Inspeccionar dots
  - **Esperado:** Dots NO bouncean simultáneamente
  - **Dispositivos:** Todos

- [ ] **G3.** Typing dots desaparecen al recibir content
  - **Cómo:** Esperar primer chunk SSE
  - **Esperado:** Dots reemplazados por texto
  - **Dispositivos:** Todos

- [ ] **G4.** Typing dots styling (gray-400, 2px × 2px)
  - **Cómo:** Inspeccionar dots
  - **Esperado:** Dots pequeños, gray-400 background
  - **Dispositivos:** Todos

- [ ] **G5.** Welcome message NO muestra typing dots durante loading ⚠️ CRITICAL
  - **Cómo:** Enviar primer mensaje "hola", observar welcome message durante respuesta
  - **Esperado:** Welcome message permanece visible (HTML estático), NO se convierte en dots
  - **Actual (ANTES DEL FIX):** Welcome message flickeaba a dots temporalmente
  - **Fix:** Condición `message.id !== 'welcome'` agregada en línea 391
  - **Dispositivos:** Todos
  - **Nota:** Bug introducido por static extraction (welcome.content=''), fix crítico para UX

---

### H. Error Banner (6 tests)

**Setup:** Forzar error (apagar dev server mientras envías mensaje)

- [ ] **H1.** Error banner visible arriba del input
  - **Cómo:** Trigger error
  - **Esperado:** Banner rojo aparece arriba del input (bottom: calc(80px + safe-area))
  - **Dispositivos:** Todos

- [ ] **H2.** Error message text legible
  - **Cómo:** Leer mensaje de error
  - **Esperado:** Texto "Failed to send message: 500..." visible
  - **Dispositivos:** Todos

- [ ] **H3.** Retry button funcional
  - **Cómo:** Click "Retry"
  - **Esperado:** Input se rellena con último mensaje, error banner desaparece
  - **Dispositivos:** Todos

- [ ] **H4.** Close button (×) funcional
  - **Cómo:** Click "×"
  - **Esperado:** Error banner desaparece
  - **Dispositivos:** Todos

- [ ] **H5.** Error banner NO tapa input
  - **Cómo:** Verificar posición
  - **Esperado:** Banner arriba del input, NO superpuesto
  - **Dispositivos:** Todos

- [ ] **H6.** Error banner respeta safe area bottom
  - **Cómo:** iPhone 15 (home bar 34px)
  - **Esperado:** Banner NO tapado por home bar
  - **Dispositivos:** iPhone 15, iPhone 14

---

### I. Input Field (8 tests)

**Setup:** Focus en textarea input

- [ ] **I1.** Input fixed en bottom
  - **Cómo:** Scroll mensajes, verificar input
  - **Esperado:** Input siempre visible abajo (fixed bottom-0)
  - **Dispositivos:** Todos

- [ ] **I2.** Input respeta safe area bottom (home bar)
  - **Cómo:** iPhone 15 (home bar 34px)
  - **Esperado:** Input NO tapado por home bar
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **I3.** Textarea auto-height (rows=1 default)
  - **Cómo:** Tipear texto corto
  - **Esperado:** Textarea 1 línea de altura
  - **Dispositivos:** Todos

- [ ] **I4.** Textarea expande con texto largo
  - **Cómo:** Tipear 5 líneas de texto
  - **Esperado:** Textarea crece verticalmente (NO scroll interno)
  - **Dispositivos:** Todos

- [ ] **I5.** maxLength 2000 enforced
  - **Cómo:** Copiar/pegar 2100 caracteres
  - **Esperado:** Input trunca a 2000 caracteres
  - **Dispositivos:** Todos

- [ ] **I6.** Enter envía mensaje (sin Shift)
  - **Cómo:** Tipear, presionar Enter
  - **Esperado:** Mensaje enviado, textarea se limpia
  - **Dispositivos:** Chrome Desktop

- [ ] **I7.** Shift+Enter nueva línea
  - **Cómo:** Tipear, presionar Shift+Enter
  - **Esperado:** Nueva línea en textarea (NO envía mensaje)
  - **Dispositivos:** Chrome Desktop

- [ ] **I8.** Placeholder visible cuando vacío
  - **Cómo:** Textarea vacío
  - **Esperado:** Placeholder "Type your message..." visible
  - **Dispositivos:** Todos

---

### J. Send Button (6 tests)

**Setup:** Input field con texto

- [ ] **J1.** Send button fixed en bottom derecha
  - **Cómo:** Verificar posición
  - **Esperado:** Button derecha del textarea (fixed)
  - **Dispositivos:** Todos

- [ ] **J2.** Send button disabled cuando input vacío
  - **Cómo:** Input vacío, verificar button
  - **Esperado:** Button gris (disabled:bg-gray-300)
  - **Dispositivos:** Todos

- [ ] **J3.** Send button enabled con texto
  - **Cómo:** Tipear texto, verificar button
  - **Esperado:** Button gradient teal (enabled)
  - **Dispositivos:** Todos

- [ ] **J4.** Send button touch target 44px × 44px mínimo
  - **Cómo:** Medir button
  - **Esperado:** Width/height 44px (w-11 h-11 = 44px)
  - **Dispositivos:** Todos (mobile)

- [ ] **J5.** Send button click envía mensaje
  - **Cómo:** Tipear, click button
  - **Esperado:** Mensaje enviado, textarea limpiado
  - **Dispositivos:** Todos

- [ ] **J6.** Send button disabled durante loading
  - **Cómo:** Enviar mensaje, verificar button durante stream
  - **Esperado:** Button disabled, cursor-not-allowed
  - **Dispositivos:** Todos

---

### K. New Conversation Button (6 tests)

**Setup:** Conversación existente (messages.length > 1)

- [ ] **K1.** "Nueva conversación" button visible en header
  - **Cómo:** Verificar header derecha
  - **Esperado:** RotateCcw icon button visible
  - **Dispositivos:** Todos

- [ ] **K2.** Button touch target 44px × 44px
  - **Cómo:** Medir button
  - **Esperado:** min-w-44px min-h-44px
  - **Dispositivos:** Todos (mobile)

- [ ] **K3.** Button click limpia conversación
  - **Cómo:** Click button
  - **Esperado:** Mensajes cleared, welcome message aparece
  - **Dispositivos:** Todos

- [ ] **K4.** localStorage cleared
  - **Cómo:** DevTools → Application → localStorage
  - **Esperado:** "dev_chat_session_id" removido
  - **Dispositivos:** Chrome Desktop

- [ ] **K5.** Session cookie expirado (API call)
  - **Cómo:** Network tab → verificar POST /api/dev/reset-session
  - **Esperado:** API call exitoso (200 OK)
  - **Dispositivos:** Chrome Desktop

- [ ] **K6.** Error state cleared
  - **Cómo:** Trigger error, luego click new conversation
  - **Esperado:** Error banner desaparece
  - **Dispositivos:** Todos

---

### L. Safe Areas (iOS/Android) (6 tests)

**Setup:** Dispositivos con notch/home bar

- [ ] **L1.** Header respeta safe-area-inset-top (notch)
  - **Cómo:** iPhone 15 (notch 59px)
  - **Esperado:** Header padding-top incluye notch, content NO tapado
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **L2.** Input respeta safe-area-inset-bottom (home bar)
  - **Cómo:** iPhone 15 (home bar 34px)
  - **Esperado:** Input padding-bottom incluye home bar, content NO tapado
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **L3.** Messages área top offset incluye safe-area-inset-top
  - **Cómo:** iPhone 15, scroll to top
  - **Esperado:** Primer mensaje NO tapado por notch
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **L4.** Messages área bottom offset incluye safe-area-inset-bottom
  - **Cómo:** iPhone 15, scroll to bottom
  - **Esperado:** Último mensaje NO tapado por home bar
  - **Dispositivos:** iPhone 15, iPhone 14

- [ ] **L5.** Landscape mode respeta safe areas
  - **Cómo:** Rotar device a landscape
  - **Esperado:** Safe areas ajustadas (notch left/right)
  - **Dispositivos:** iPhone 15

- [ ] **L6.** Android sin notch/home bar (Galaxy S24)
  - **Cómo:** Galaxy S24
  - **Esperado:** Fallback 0px funciona, layout correcto
  - **Dispositivos:** Galaxy S24

---

## CHECKLIST: ChatMobile.tsx (60 tests)

**NOTA:** Los 60 tests son IDÉNTICOS a DevChatMobileDev.tsx, con estas diferencias:

### Diferencias Intencionales

1. **NO debe tener badge "🚧 DEV"** en header
2. **localStorage key:** `public_chat_session_id` (NO `dev_chat_session_id`)
3. **API route:** `/api/public/chat` (NO `/api/dev/chat`)
4. **Reset API:** `/api/public/reset-session` (NO `/api/dev/reset-session`)

### Ejecutar TODOS los tests A-L

Repetir EXACTAMENTE los mismos 60 tests de DevChatMobileDev.tsx:
- A. Scroll Behavior (12 tests)
- B. Pull-to-Refresh (8 tests)
- C. Welcome Message (6 tests)
- D. Message Rendering (10 tests)
- E. Photo Carousel (8 tests)
- F. Suggestion Pills (8 tests)
- G. Typing Dots (4 tests)
- H. Error Banner (6 tests)
- I. Input Field (8 tests)
- J. Send Button (6 tests)
- K. New Conversation Button (6 tests)
- L. Safe Areas (6 tests)

**URLs de testing:**
- DevChatMobileDev: http://localhost:3000/dev-chat-mobile-dev
- ChatMobile: http://localhost:3000/chat-mobile

---

## RESULTS TABLE

| Test ID | DevChatMobileDev | ChatMobile | Notes |
|---------|------------------|------------|-------|
| A1 | [ ] Pass / [ ] Fail | [ ] Pass / [ ] Fail | |
| A2 | [ ] Pass / [ ] Fail | [ ] Pass / [ ] Fail | |
| A3 | [ ] Pass / [ ] Fail | [ ] Pass / [ ] Fail | |
| ... | ... | ... | ... |
| L6 | [ ] Pass / [ ] Fail | [ ] Pass / [ ] Fail | |

**Summary:**
- Total Tests: 120
- DevChatMobileDev: X/60 passed
- ChatMobile: X/60 passed
- Issues Found: X

---

## CRITICAL ISSUES (If Any)

List any blocking issues here that require immediate fix.

**Format:**
- **Issue ID:** [A1-DevDev]
- **Description:** Scroll stuttering on iPhone 15
- **Severity:** High / Medium / Low
- **Repro Steps:** 1. ... 2. ... 3. ...
- **Expected:** ...
- **Actual:** ...
- **Fix Required:** YES / NO

---

## BUG FIXES DURANTE TESTING

### Fix #1: Welcome Message Loading Dots Glitch (Oct 5, 2025)

**Bug ID:** G5-CRITICAL
**Component:** DevChatMobileDev.tsx (ChatMobile.tsx no afectado)
**Severity:** High - UX issue visible

#### Síntoma
Al enviar el primer mensaje del usuario, el welcome message temporalmente se convertía en "tres puntos de loading" durante ~1-2 segundos, luego volvía a aparecer cuando la respuesta completaba.

#### Causa Raíz
```tsx
// LÍNEA 391 (ANTES DEL FIX):
{!message.content && loading ? (
  // Muestra dots
```

**Problema:** La condición `!message.content` era TRUE para el welcome message porque su `content: ''` (empty string por diseño de static extraction).

**Secuencia del glitch:**
1. Welcome message renderiza OK (content='', muestra static HTML)
2. Usuario envía "hola" → `loading = true`
3. **GLITCH**: Welcome message cumple `!content && loading` → Muestra dots ❌
4. Streaming completa → `loading = false` → Welcome vuelve a HTML estático ✅

#### Solución
```tsx
// LÍNEA 391 (DESPUÉS DEL FIX):
{!message.content && loading && message.id !== 'welcome' ? (
  // Muestra dots solo para mensajes dinámicos
```

**Condición agregada:** `&& message.id !== 'welcome'`

#### Testing
- [x] Welcome message permanece visible durante loading
- [x] Nuevos mensajes assistant siguen mostrando dots correctamente
- [x] Zero regresión en Lighthouse (95/100 mantenido)
- [x] Visual test: Sin flickering observable

#### Archivos Modificados
- `src/components/Dev/DevChatMobileDev.tsx` (1 línea)

#### Commit
```
fix(chat): prevent welcome message from showing loading dots

- Add message.id !== 'welcome' condition to loading dots check
- Fixes glitch where welcome message flickered to dots during loading
- Maintains static HTML rendering for optimal LCP (<1.5s)
```

---

## SIGN-OFF

- [ ] All 121 tests executed (120 original + 1 nuevo G5)
- [ ] DevChatMobileDev: 61/61 passed
- [ ] ChatMobile: 60/60 passed
- [ ] Zero critical issues
- [ ] Bug Fix #1 (G5) validated and documented
- [ ] Ready for production

**Tester:** ___________
**Date:** Oct 5, 2025
**Signature:** ___________
