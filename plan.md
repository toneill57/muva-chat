# Mobile-First Chat Interface - Plan de Implementación

**Proyecto:** Chat Interface Mobile-First Fullscreen
**Fecha Inicio:** 3 Octubre 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal
Crear una interfaz de chat limpia, fullscreen y mobile-first que elimine toda decoración/marketing y se enfoque 100% en la conversación. El chat debe ocupar toda la pantalla y estar optimizado para los dispositivos móviles más populares.

### ¿Por qué?
- **Mobile-First App**: La mayoría de usuarios accederán desde celular
- **UX Limpia**: Eliminar distracciones, enfoque total en el chat
- **Conversión**: Interacción intuitiva sin necesidad de explicaciones
- **Performance**: Aprovechar todos los enhancements actuales (streaming, markdown, typing dots)

### Alcance
- Nueva ruta `/chat-mobile` con interfaz fullscreen
- Soporte para iPhone 15/14, Google Pixel 8, Samsung Galaxy S24
- Mantener TODA la funcionalidad actual (streaming, markdown, photos, suggestions)
- Safe areas para notches, home bars, status bars

---

## 📊 ESTADO ACTUAL

### Sistema Existente
- ✅ **DevChatInterface.tsx** - Chat funcional con streaming, markdown, typing indicators
- ✅ **DevChatEngine** - Motor de chat con Claude Sonnet 4.5
- ✅ **Streaming SSE** - Server-Sent Events para respuestas en tiempo real
- ✅ **Markdown Rendering** - react-markdown v9 + remark-gfm
- ✅ **UX Enhancements** - Typing dots, cursor pulsante, smooth transitions
- ✅ **Ruta actual** - `/dev-chat-demo` con bubble flotante

### Limitaciones Actuales
- ❌ Bubble flotante ocupa poco espacio en móvil
- ❌ Página llena de contenido marketing/explicativo
- ❌ No optimizado para safe areas (notch, home bar)
- ❌ Desktop-first design, móvil como secondary

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia Mobile
```
┌─────────────────────────────┐
│ ← Simmer Down Chat      ⚙️  │ ← Header fijo (60px)
├─────────────────────────────┤
│                             │
│  👤 User message            │
│                             │
│  🤖 Assistant response      │
│     with markdown           │
│     • Bullet points         │
│     **Bold text**           │
│                             │
│  📸 [Photo carousel]        │
│                             │
│  💡 Follow-up suggestions   │
│                             │
│  ↓ scroll ↓                 │
├─────────────────────────────┤
│ Type your message... [→]    │ ← Input fijo (80px)
└─────────────────────────────┘
```

### Características Clave
- **Fullscreen Layout**: Header + Messages + Input (sin decoración)
- **Safe Areas**: Respeta notch (top), home bar (bottom), status bar
- **Touch Optimized**: Tap targets ≥ 44px, smooth scrolling
- **Performance**: Mantiene streaming, markdown, typing indicators
- **Responsive**: 360px (Galaxy) → 430px (iPhone 15 Pro Max)

---

## 📱 TECHNICAL STACK

### Frontend
- **Framework**: Next.js 15.5.3 + React 19.1.0
- **Styling**: Tailwind CSS 4 + custom mobile utilities
- **Layout**: CSS Grid + Flexbox + safe-area-inset
- **Components**: Reutilizar DevChatInterface logic

### Chat Engine (Sin cambios)
- **LLM**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Streaming**: Server-Sent Events (SSE)
- **Markdown**: react-markdown v9 + remark-gfm v4
- **Session**: localStorage para dev_chat_session_id

### Mobile Optimization
- **Viewport Meta**: `width=device-width, initial-scale=1, viewport-fit=cover`
- **Safe Areas**: `env(safe-area-inset-top/bottom/left/right)`
- **Touch**: `touch-action: manipulation` para mejor responsiveness
- **Scroll**: `overscroll-behavior: contain` para prevenir bounce

---

## 🔧 DESARROLLO - FASES

### FASE 1: Estructura Base (2-3h)
**Objetivo**: Crear ruta y componente mobile con layout fullscreen

**Entregables**:
- Nueva ruta `/chat-mobile` funcional
- Componente `DevChatMobile.tsx` con layout mobile
- Header fijo + Messages área + Input fijo
- Funcionalidad básica de chat (sin enhancements aún)

**Archivos a crear**:
- `src/app/chat-mobile/page.tsx`
- `src/components/Dev/DevChatMobile.tsx`

**Testing**:
- Visual en Chrome DevTools (iPhone 15, Pixel 8, Galaxy S24)
- Layout no rompe en 360px - 430px
- Header y input permanecen fijos al scroll

---

### FASE 2: Mobile Optimizations (3-4h)
**Objetivo**: Optimizar para dispositivos móviles reales

**Entregables**:
- Safe areas implementadas (notch, home bar)
- Touch targets ≥ 44px
- Smooth scroll behavior
- Auto-scroll a nuevos mensajes
- Keyboard handling (iOS/Android)

**Cambios**:
- CSS: `padding-top: env(safe-area-inset-top)`
- CSS: `padding-bottom: calc(80px + env(safe-area-inset-bottom))`
- Textarea: Auto-expand con max-height
- Scroll: `scrollIntoView({ behavior: 'smooth', block: 'end' })`

**Testing**:
- iPhone 15 simulator (notch visible, no overlap)
- Android Chrome (keyboard no tapa input)
- Landscape mode funciona
- Home bar no tapa botones

---

### FASE 3: Feature Parity (2-3h)
**Objetivo**: Portar todos los enhancements de DevChatInterface

**Entregables**:
- Streaming SSE funcionando
- Markdown rendering completo
- Typing dots mientras espera
- Cursor pulsante mientras streamea
- Photo carousel
- Follow-up suggestions
- Smooth transitions

**Código a portar** (de DevChatInterface.tsx):
- Líneas 128-204: Streaming logic
- Líneas 336-342: Typing dots conditional
- Líneas 344-366: ReactMarkdown + cursor
- Líneas 362-374: Photo carousel
- Líneas 386-402: Suggestions buttons

**Testing**:
- Enviar mensaje → typing dots aparecen
- Stream llega → cursor pulsa mientras streamea
- Markdown renderiza correctamente
- Photos se muestran en carousel
- Suggestions son clickeables

---

### FASE 4: Polish & Performance (1-2h)
**Objetivo**: Refinamiento final y optimizaciones

**Entregables**:
- Animaciones suaves (200ms transitions)
- Loading states pulidos
- Error handling visible
- Accessibility (aria-labels, roles)
- Performance check (lighthouse)

**Mejoras**:
- Skeleton loading para messages
- Retry button en errores
- `aria-live="polite"` para nuevos mensajes
- Reduce motion support (`prefers-reduced-motion`)

**Testing**:
- Lighthouse mobile score ≥ 90
- VoiceOver/TalkBack navigation
- Slow 3G simulation
- Error scenarios (offline, API fail)

---

## 📏 MOBILE VIEWPORT TARGETS

### Dispositivos Objetivo
| Dispositivo | Width | Height | Ratio | Safe Areas |
|-------------|-------|--------|-------|------------|
| iPhone 15 Pro Max | 430px | 932px | 19.5:9 | Top: 59px, Bottom: 34px |
| iPhone 14 Pro | 393px | 852px | 19.5:9 | Top: 54px, Bottom: 34px |
| Google Pixel 8 Pro | 412px | 915px | 20:9 | Top: 48px, Bottom: 0px |
| Samsung Galaxy S24 | 360px | 800px | 20:9 | Top: 0px, Bottom: 0px |

### Breakpoints
```css
/* Mobile Small (Galaxy S24) */
@media (max-width: 360px) { ... }

/* Mobile Medium (iPhone 14) */
@media (min-width: 361px) and (max-width: 400px) { ... }

/* Mobile Large (iPhone 15 Pro Max) */
@media (min-width: 401px) { ... }
```

---

## 📐 LAYOUT SPECIFICATIONS

### Header (Fixed Top)
```css
.chat-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  padding-top: env(safe-area-inset-top);
  background: linear-gradient(to right, #14b8a6, #06b6d4, #14b8a6);
  z-index: 50;
}
```

**Contenido**:
- Logo/Título centrado
- Icono back (opcional) - izquierda
- Icono settings (opcional) - derecha
- Sin botones minimize/close

### Messages Area (Flex Scroll)
```css
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: calc(60px + 16px); /* header height + spacing */
  padding-bottom: calc(80px + 16px); /* input height + spacing */
  background: linear-gradient(to bottom, #fef3c7, #ffffff);
  overscroll-behavior: contain;
}
```

**Comportamiento**:
- Auto-scroll a nuevos mensajes
- Smooth scroll (`scroll-behavior: smooth`)
- Bounce prevention (`overscroll-behavior: contain`)
- Pull-to-refresh deshabilitado

### Input Area (Fixed Bottom)
```css
.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: white;
  border-top: 1px solid #e5e7eb;
  z-index: 50;
}
```

**Elementos**:
- Textarea auto-expand (max 128px)
- Send button (44px × 44px touch target)
- Character counter (opcional)

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] Ruta `/chat-mobile` accesible
- [ ] Chat fullscreen sin decoración
- [ ] Streaming SSE funcional
- [ ] Markdown rendering completo
- [ ] Typing dots + cursor pulsante
- [ ] Photo carousel
- [ ] Follow-up suggestions

### Mobile UX
- [ ] Safe areas respetadas (notch, home bar)
- [ ] Touch targets ≥ 44px
- [ ] Keyboard no tapa input (iOS/Android)
- [ ] Smooth scroll a nuevos mensajes
- [ ] Landscape mode funcional
- [ ] No bounce scroll (iOS)

### Performance
- [ ] Lighthouse mobile score ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Layout shifts mínimos (CLS < 0.1)

### Accesibilidad
- [ ] VoiceOver/TalkBack navigation
- [ ] ARIA labels en elementos interactivos
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus visible en todos los elementos

### Compatibilidad
- [ ] iPhone 15/14 (Safari iOS 17+)
- [ ] Google Pixel 8 (Chrome Android 14+)
- [ ] Samsung Galaxy S24 (Samsung Internet)
- [ ] Funciona en 360px - 430px width

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── src/
│   ├── app/
│   │   └── chat-mobile/
│   │       └── page.tsx              [CREAR] - Página fullscreen mobile
│   │
│   └── components/
│       └── Dev/
│           ├── DevChatInterface.tsx  [EXISTENTE] - Base de referencia
│           └── DevChatMobile.tsx     [CREAR] - Versión mobile fullscreen
│
├── docs/
│   └── chat-mobile/                  [CREAR] - Documentación del proyecto
│       ├── fase-1/
│       ├── fase-2/
│       ├── fase-3/
│       └── fase-4/
│
├── plan.md                           [ESTE ARCHIVO]
└── TODO.md                           [ACTUALIZAR]
```

---

## 🤖 AGENTES REQUERIDOS

### 1. **ux-interface** (Principal)
**Responsabilidad**: Implementación completa del UI mobile-first

**Tareas**:
- FASE 1: Crear estructura base (page.tsx + DevChatMobile.tsx)
- FASE 2: Implementar mobile optimizations (safe areas, touch targets)
- FASE 3: Portar features (streaming, markdown, photos, suggestions)
- FASE 4: Polish & performance (animaciones, a11y, lighthouse)

**Archivos**:
- `src/app/chat-mobile/page.tsx`
- `src/components/Dev/DevChatMobile.tsx`

### 2. **backend-developer** (Soporte)
**Responsabilidad**: Validar integración con API existente

**Tareas**:
- Verificar `/api/dev/chat?stream=true` funciona con nuevo componente
- Revisar session handling (localStorage)
- Confirmar streaming SSE compatible

**Archivos**:
- `src/app/api/dev/chat/route.ts` (revisar, no modificar)

---

## 📋 NEXT STEPS

1. ✅ **Plan.md creado** - Este archivo
2. 🔜 **TODO.md actualizado** - Tareas específicas por fase
3. 🔜 **Ejecutar FASE 1** - Estructura base
4. 🔜 **Testing FASE 1** - Validar layout mobile
5. 🔜 **Documentar FASE 1** - docs/chat-mobile/fase-1/

---

## 📝 NOTAS IMPORTANTES

### Reutilización de Código
- **DevChatInterface.tsx** es la fuente de verdad
- **DevChatMobile.tsx** debe copiar toda la lógica de chat
- **Diferencia principal**: Layout (fullscreen vs bubble)

### Consideraciones Mobile
- **iOS Safari**: Viewport height cambia con keyboard (`100vh` → `100dvh`)
- **Android Chrome**: Address bar colapsa (usar `min-height: 100dvh`)
- **Safe Areas**: Solo iOS tiene notch/home bar, Android puede variar

### Performance Tips
- Lazy load photo carousel si hay muchas imágenes
- Debounce textarea auto-resize (reduce reflows)
- Use `will-change: transform` para animaciones smooth
- Avoid `box-shadow` en scroll (usa `border` para separadores)

---

**Última actualización**: 3 Octubre 2025
**Próximo paso**: Actualizar TODO.md con tareas específicas
