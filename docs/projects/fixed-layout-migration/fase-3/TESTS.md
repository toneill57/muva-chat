# FASE 3: Testing ChatMobile.tsx

**Fecha:** Octubre 5, 2025
**URL:** http://localhost:3000/chat-mobile
**Archivo:** `src/components/Public/ChatMobile.tsx`

---

## Pre-Testing Checklist

### Build & Compilation ✅
- [x] `npm run build` completado sin errores
- [x] ZERO TypeScript errors
- [x] ZERO build warnings (relacionados con cambios)
- [x] Output size: 7.24 kB (aceptable)

### Dev Server ✅
- [x] `./scripts/dev-with-keys.sh` iniciado correctamente
- [x] Server running on http://localhost:3000
- [x] Middleware compiled successfully
- [x] No runtime errors en consola

---

## Visual Testing Checklist

### 1. Layout Básico

**Verificar en:** http://localhost:3000/chat-mobile

- [ ] **Wrapper container**
  - Inspeccionar elemento root
  - Verificar: `className="bg-white"` (sin flexbox)
  - Verificar: `role="main"`

- [ ] **Header position**
  - Verificar: `position: fixed`
  - Verificar: `top: 0`, `left: 0`, `right: 0`
  - Verificar: `z-index: 50`
  - Verificar: Safe area top aplicado (`pt-[env(safe-area-inset-top)]`)
  - Verificar: NO tiene badge "🚧 DEV" (producción)

- [ ] **Messages área position**
  - Verificar: `position: fixed`
  - Verificar: `top: calc(64px + env(safe-area-inset-top))`
  - Verificar: `bottom: calc(80px + env(safe-area-inset-bottom))`
  - Verificar: `left: 0`, `right: 0`
  - Verificar: `padding-top: 2rem`, `padding-bottom: 1rem`

- [ ] **Input position**
  - Verificar: `position: fixed`
  - Verificar: `bottom: 0`, `left: 0`, `right: 0`
  - Verificar: `z-index: 50`
  - Verificar: Safe area bottom aplicado

---

### 2. Scroll Behavior

- [ ] **Scroll vertical**
  - Enviar 10+ mensajes para forzar scroll
  - Verificar: Scroll suave (60fps target)
  - Verificar: Auto-scroll al nuevo mensaje
  - Verificar: Manual scroll hacia arriba funciona
  - Verificar: Scroll hacia abajo retorna a último mensaje

- [ ] **Pull-to-refresh**
  - Scroll to top del área de mensajes
  - Pull down 80px+ (threshold)
  - Verificar: Indicador "↓ Ir al inicio" aparece
  - Verificar: Scroll to top se ejecuta
  - Verificar: Indicador desaparece después de 300ms

- [ ] **Overscroll behavior**
  - Verificar: `overscroll-behavior-contain` aplicado
  - Verificar: NO bounce excesivo en iOS
  - Verificar: Scroll contenido al área de mensajes

---

### 3. Welcome Message

- [ ] **Posicionamiento inicial**
  - Limpiar localStorage: `localStorage.removeItem('public_chat_session_id')`
  - Recargar página
  - Verificar: Welcome message aparece centrado verticalmente
  - Verificar: Padding-top de 2rem aplicado
  - Verificar: NO queda pegado al header
  - Verificar: NO queda pegado al input

---

### 4. Enviar Mensaje

- [ ] **Input field**
  - Click en input field
  - Verificar: Focus correcto
  - Escribir: "Hola"
  - Verificar: Text aparece en input
  - Verificar: Send button enabled

- [ ] **Send button**
  - Click en send button
  - Verificar: Mensaje aparece en chat (user bubble azul)
  - Verificar: Typing dots aparecen (loading state)
  - Verificar: API call a `/api/public/chat/stream` exitoso
  - Verificar: Respuesta del asistente aparece

- [ ] **API call verification**
  - Abrir Network tab (Chrome DevTools)
  - Enviar mensaje: "Hola"
  - Verificar: POST request a `/api/public/chat/stream`
  - Verificar: Response status 200
  - Verificar: Streaming data recibido

---

### 5. Photo Carousel (si aplica)

- [ ] **DevPhotoCarousel component**
  - Enviar mensaje que devuelva fotos (ej: "apartamentos")
  - Verificar: DevPhotoCarousel renderiza
  - Verificar: Scroll horizontal funciona
  - Verificar: Lazy loading funciona
  - Verificar: Imágenes cargan correctamente
  - Verificar: Click en foto abre preview

---

### 6. Suggestion Pills (si aplica)

- [ ] **Suggestion pills**
  - Verificar: Pills aparecen después de respuesta
  - Verificar: Min-height 44px (touch target)
  - Click en pill
  - Verificar: Texto popula input field
  - Verificar: Focus en input después de click

---

### 7. Typing Dots

- [ ] **Loading state**
  - Enviar mensaje
  - Verificar: Typing dots aparecen mientras carga
  - Verificar: Animación bounce funciona (3 dots)
  - Verificar: Dots desaparecen cuando llega respuesta

---

### 8. Error Handling

- [ ] **Error banner**
  - Forzar error (desconectar red o matar backend)
  - Enviar mensaje
  - Verificar: Error banner aparece sticky bottom
  - Verificar: Mensaje de error visible
  - Verificar: Botón "Retry" funcional
  - Verificar: Botón "✕" cierra banner

---

### 9. Safe Areas (iOS)

**Testing en:** iPhone (real o simulator)

- [ ] **iPhone 15 (430x932)**
  - Browser: Safari Mobile
  - Verificar: Header NO queda debajo del notch
  - Verificar: Input NO queda debajo del home bar
  - Verificar: Área de mensajes calcula altura correcta
  - Verificar: `env(safe-area-inset-top)` aplicado
  - Verificar: `env(safe-area-inset-bottom)` aplicado

- [ ] **iPhone 14 (390x844)**
  - Browser: Safari Mobile
  - Verificar: Mismo checklist que iPhone 15

---

### 10. Safe Areas (Android)

**Testing en:** Android (real o emulator)

- [ ] **Pixel 8 (412x915)**
  - Browser: Chrome Mobile
  - Verificar: Header spacing correcto
  - Verificar: Input spacing correcto (home bar gesture)
  - Verificar: Área de mensajes altura correcta

- [ ] **Galaxy S24 (360x800)**
  - Browser: Chrome Mobile
  - Verificar: Mismo checklist que Pixel 8

---

### 11. Performance (Lighthouse)

**Testing en:** Chrome DevTools

- [ ] **Lighthouse Mobile**
  - Abrir Chrome DevTools
  - Run Lighthouse (Mobile mode)
  - **Targets:**
    - Performance: ≥90
    - FCP (First Contentful Paint): <2s
    - LCP (Largest Contentful Paint): <2.5s
    - CLS (Cumulative Layout Shift): <0.1
    - TBT (Total Blocking Time): <200ms
  - Documentar: Screenshots de resultados

---

### 12. Comparación con DevChatMobileDev.tsx

- [ ] **Side-by-side testing**
  - Abrir: http://localhost:3000/dev-chat-mobile-dev (referencia)
  - Abrir: http://localhost:3000/chat-mobile (producción)
  - Comparar:
    - Layout visual IDÉNTICO (excepto badge "🚧 DEV")
    - Scroll behavior IDÉNTICO
    - Welcome message positioning IDÉNTICO
    - Touch gestures IDÉNTICOS
    - Safe areas IDÉNTICOS

---

## Issues Encontrados

### Issue #1: [Título]
**Severidad:** [Critical / High / Medium / Low]
**Descripción:** [Descripción detallada]
**Steps to reproduce:**
1. [Paso 1]
2. [Paso 2]
**Expected:** [Comportamiento esperado]
**Actual:** [Comportamiento actual]
**Screenshot:** [Si aplica]
**Status:** [Open / Fixed / Won't Fix]

---

## Testing Summary

**Total Tests:** 12 secciones
**Passed:** [ ] / 12
**Failed:** [ ] / 12
**Skipped:** [ ] / 12

**Build Check:** ✅ Pass
**Dev Server:** ✅ Pass
**Visual Testing:** [ ] Pending
**Performance:** [ ] Pending
**Cross-Browser:** [ ] Pending

---

## Próximos Pasos

1. **Ejecutar testing manual completo** (todos los checkboxes)
2. **Documentar issues** (si los hay)
3. **Performance benchmarking** (Lighthouse)
4. **Cross-browser testing** (Safari, Chrome, Firefox, Edge)
5. **Actualizar TODO.md** con checkmarks
6. **FASE 4:** Testing final consolidado

---

**Status:** ✅ Documento creado, testing pendiente
**Siguiente:** Ejecutar checklist completo manualmente
