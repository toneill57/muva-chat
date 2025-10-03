# TODO - Mobile-First Chat Interface

**Proyecto:** Chat Mobile Fullscreen
**Fecha:** 3 Octubre 2025
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 1: Estructura Base (2-3h) =ñ

### 1.1 Crear página mobile `/chat-mobile`
- [ ] Crear archivo `src/app/chat-mobile/page.tsx` (estimate: 30min)
  - Implementar layout fullscreen básico
  - Viewport meta tags con `viewport-fit=cover`
  - Remover todo contenido marketing/explicativo
  - Solo header + messages + input
  - Files: `src/app/chat-mobile/page.tsx`
  - Agent: **ux-interface**
  - Test: Navegar a http://localhost:3000/chat-mobile

### 1.2 Crear componente DevChatMobile
- [ ] Crear `src/components/Dev/DevChatMobile.tsx` (estimate: 1.5h)
  - Copiar lógica base de `DevChatInterface.tsx`
  - Adaptar de floating bubble a fullscreen layout
  - Header fixed top (60px) con gradient teal
  - Messages area flex-1 scrollable
  - Input area fixed bottom (80px)
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Componente renderiza sin errores

### 1.3 Implementar layout móvil básico
- [ ] Header fijo superior (estimate: 30min)
  - Position fixed, top 0, z-index 50
  - Gradient: `from-teal-500 via-cyan-500 to-teal-600`
  - Título centrado: "Simmer Down Chat"
  - Sin botones minimize/close
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Header permanece fijo al scroll

- [ ] Área de mensajes scrollable (estimate: 30min)
  - Flex-1, overflow-y-auto
  - Padding-top: 76px (60px header + 16px spacing)
  - Padding-bottom: 96px (80px input + 16px spacing)
  - Background gradient: `from-sand-50 to-white`
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Scroll funciona, contenido no queda bajo header/input

- [ ] Input área fijo inferior (estimate: 30min)
  - Position fixed, bottom 0, z-index 50
  - Textarea + Send button (44px × 44px)
  - Border-top sutil
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Input permanece fijo al scroll

### 1.4 Testing visual FASE 1
- [ ] Probar en Chrome DevTools (estimate: 30min)
  - iPhone 15 Pro Max (430×932)
  - iPhone 14 Pro (393×852)
  - Google Pixel 8 Pro (412×915)
  - Samsung Galaxy S24 (360×800)
  - Test: Layout no rompe en ningún viewport
  - Test: Header y input permanecen fijos
  - Test: Messages área scrollea correctamente

---

## FASE 2: Mobile Optimizations (3-4h) <¯

### 2.1 Implementar Safe Areas
- [ ] Safe area top para notch (estimate: 1h)
  - CSS: `padding-top: env(safe-area-inset-top)` en header
  - Ajustar height del messages area
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: iPhone 15 simulator - notch no tapa header

- [ ] Safe area bottom para home bar (estimate: 1h)
  - CSS: `padding-bottom: calc(16px + env(safe-area-inset-bottom))` en input
  - Ajustar height del messages area
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: iPhone 15 simulator - home bar no tapa input

### 2.2 Touch optimization
- [ ] Touch targets e 44px (estimate: 30min)
  - Send button: 44px × 44px mínimo
  - Touch-action: manipulation para mejor responsiveness
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Botones fáciles de tocar en móvil

### 2.3 Scroll behavior
- [ ] Smooth scroll a nuevos mensajes (estimate: 1h)
  - Auto-scroll cuando llega nuevo mensaje
  - `scrollIntoView({ behavior: 'smooth', block: 'end' })`
  - `overscroll-behavior: contain` para prevenir bounce
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Nuevos mensajes aparecen en viewport automáticamente

### 2.4 Keyboard handling
- [ ] Input no tapado por keyboard (estimate: 1h)
  - iOS: Usar `100dvh` en vez de `100vh`
  - Android: Address bar collapse handling
  - Focus input ’ scroll al bottom
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: iOS Safari - keyboard no tapa input
  - Test: Android Chrome - input visible con keyboard

### 2.5 Testing mobile FASE 2
- [ ] Probar safe areas (estimate: 30min)
  - iPhone 15 simulator con notch
  - Landscape mode funcional
  - No overlap en ningún dispositivo
  - Test: Todos los elementos visibles y accesibles

---

## FASE 3: Feature Parity (2-3h) ¡

### 3.1 Portar Streaming SSE
- [ ] Implementar streaming logic (estimate: 1h)
  - Copiar líneas 128-204 de `DevChatInterface.tsx`
  - Fetch con `?stream=true`
  - Server-Sent Events parsing
  - Update message content en tiempo real
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Enviar mensaje ’ respuesta streamea chunk por chunk

### 3.2 Portar Markdown rendering
- [ ] ReactMarkdown + typing dots (estimate: 1h)
  - Copiar líneas 336-366 de `DevChatInterface.tsx`
  - Typing dots cuando `!message.content && loading`
  - ReactMarkdown con remark-gfm
  - Cursor pulsante cuando `loading && message.content`
  - Smooth transitions (150ms)
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Markdown renderiza (headers, lists, bold, links)
  - Test: Typing dots aparecen mientras espera
  - Test: Cursor pulsa mientras streamea

### 3.3 Portar Photo Carousel
- [ ] Implementar carousel de fotos (estimate: 30min)
  - Copiar líneas 362-374 de `DevChatInterface.tsx`
  - Mostrar fotos de `message.sources`
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Fotos se muestran en carousel
  - Test: Carousel scrolleable en móvil

### 3.4 Portar Suggestions
- [ ] Follow-up suggestions clickeables (estimate: 30min)
  - Copiar líneas 386-402 de `DevChatInterface.tsx`
  - Buttons con hover states
  - onClick ’ setInput(suggestion)
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Suggestions clickeables
  - Test: Input se llena con suggestion

### 3.5 Testing features FASE 3
- [ ] Validar todos los features (estimate: 30min)
  - Streaming funciona
  - Markdown renderiza
  - Typing dots + cursor
  - Photos carousel
  - Suggestions clickeables
  - Test: Todo funciona como en DevChatInterface

---

## FASE 4: Polish & Performance (1-2h) (

### 4.1 Animaciones smooth
- [ ] Transitions suaves (estimate: 30min)
  - Message entrance: fade + slide-up (200ms)
  - Typing dots: bounce animation
  - Cursor: pulse animation
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Animaciones suaves, no bruscas

### 4.2 Loading & Error states
- [ ] Error handling visible (estimate: 30min)
  - Error banner con retry button
  - Skeleton loading para messages (opcional)
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: Error muestra banner con retry
  - Test: Retry funciona correctamente

### 4.3 Accessibility
- [ ] A11y compliance (estimate: 1h)
  - ARIA labels en todos los elementos interactivos
  - `role="dialog"` en chat container
  - `aria-live="polite"` para nuevos mensajes
  - Color contrast e 4.5:1
  - Files: `src/components/Dev/DevChatMobile.tsx`
  - Agent: **ux-interface**
  - Test: VoiceOver navigation funciona
  - Test: TalkBack navigation funciona (Android)

### 4.4 Performance check
- [ ] Lighthouse audit (estimate: 30min)
  - Mobile score e 90
  - First Contentful Paint < 1.5s
  - Time to Interactive < 3s
  - Cumulative Layout Shift < 0.1
  - Test: `npm run build && npm start`
  - Test: Lighthouse mobile audit en `/chat-mobile`

### 4.5 Testing final FASE 4
- [ ] Validación completa (estimate: 30min)
  - Slow 3G simulation
  - Offline mode (error handling)
  - Reduced motion support
  - Test: App usable en slow network
  - Test: Errores manejados gracefully
  - Test: `prefers-reduced-motion` respetado

---

## DOCUMENTACIÓN =Ú

### Crear estructura docs
- [ ] Crear carpetas de documentación
  - `docs/chat-mobile/fase-1/`
  - `docs/chat-mobile/fase-2/`
  - `docs/chat-mobile/fase-3/`
  - `docs/chat-mobile/fase-4/`

### Al completar cada FASE
Usar este prompt para documentar:
```
He completado FASE {N}. Necesito:
1. Crear documentación en docs/chat-mobile/fase-{N}/
2. Incluir:
   - IMPLEMENTATION.md (qué se hizo)
   - CHANGES.md (archivos creados/modificados)
   - TESTS.md (tests corridos y resultados)
   - ISSUES.md (problemas si los hay)
3. Actualizar TODO.md marcando con [x] solo las tareas testeadas
```

---

## CRITERIOS DE ÉXITO 

### Funcionalidad Core
- [ ] Ruta `/chat-mobile` accesible
- [ ] Chat fullscreen sin decoración marketing
- [ ] Streaming SSE funcional
- [ ] Markdown rendering completo
- [ ] Typing dots + cursor pulsante
- [ ] Photo carousel
- [ ] Follow-up suggestions

### Mobile UX
- [ ] Safe areas respetadas (notch, home bar)
- [ ] Touch targets e 44px
- [ ] Keyboard no tapa input (iOS/Android)
- [ ] Smooth scroll a nuevos mensajes
- [ ] Landscape mode funcional
- [ ] No bounce scroll (iOS)

### Performance
- [ ] Lighthouse mobile score e 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Cumulative Layout Shift < 0.1

### Accesibilidad
- [ ] VoiceOver navigation OK
- [ ] TalkBack navigation OK
- [ ] ARIA labels completos
- [ ] Color contrast e 4.5:1

### Compatibilidad
- [ ] iPhone 15/14 (Safari iOS 17+)
- [ ] Google Pixel 8 (Chrome Android 14+)
- [ ] Samsung Galaxy S24 (Samsung Internet)
- [ ] Funciona en 360px - 430px width

---

## COMANDOS ÚTILES

```bash
# Desarrollo
npm run dev                  # Iniciar dev server
# Visitar: http://localhost:3000/chat-mobile

# Testing
npm run build               # Build para producción
npm start                   # Probar build
npm run lint                # Linting

# Chrome DevTools
# 1. Abrir DevTools (Cmd+Option+I)
# 2. Toggle device toolbar (Cmd+Shift+M)
# 3. Seleccionar dispositivo (iPhone 15 Pro Max, etc.)
# 4. Reload (Cmd+R)
```

---

**Última actualización**: 3 Octubre 2025
**Siguiente paso**: Ejecutar FASE 1 con **ux-interface** agent
