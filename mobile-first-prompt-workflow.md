# PROMPTS WORKFLOW - Mobile-First Chat Interface

**Proyecto:** Chat Interface Mobile-First Fullscreen
**Archivos de referencia:** `plan.md` + `TODO.md`

---

## 🎯 Contexto General (Usar SIEMPRE primero en nuevas conversaciones)

```
CONTEXTO DEL PROYECTO: Mobile-First Chat Interface

Estoy trabajando en el proyecto "Mobile-First Chat Interface" para crear una interfaz de chat fullscreen optimizada para móviles.

ARCHIVOS CLAVE:
- plan.md → Plan completo del proyecto (412 líneas)
- TODO.md → Tareas organizadas por fases
- DevChatInterface.tsx → Componente base de referencia

OBJETIVO:
Crear ruta /chat-mobile con interfaz limpia, fullscreen, sin decoración marketing, optimizada para iPhone 15/14, Pixel 8, Galaxy S24.

STACK:
- Next.js 15.5.3 + React 19.1.0
- Tailwind CSS 4
- Claude Sonnet 4.5 (streaming SSE)
- react-markdown v9 + remark-gfm

ESTADO ACTUAL:
- ✅ DevChatInterface.tsx funcional (streaming, markdown, typing dots)
- ✅ /dev-chat-demo con bubble flotante
- 🔜 Crear /chat-mobile fullscreen mobile-first

Por favor, confirma que entiendes el contexto antes de continuar.
```

---

## FASE 1: Estructura Base (2-3h)

### Prompt 1.1: Crear página `/chat-mobile`

```
@ux-interface

TAREA: Crear página mobile-first en /chat-mobile

CONTEXTO:
- Proyecto: Mobile-First Chat Interface (ver plan.md)
- Base de referencia: src/app/dev-chat-demo/page.tsx
- Objetivo: Página fullscreen SIN contenido marketing

ESPECIFICACIONES:
1. Crear: src/app/chat-mobile/page.tsx
2. Layout fullscreen (no hero section, no cards)
3. Viewport meta tag:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
   ```
4. Solo renderizar el componente DevChatMobile (que crearemos después)

CÓDIGO ESPERADO:
```typescript
import DevChatMobile from '@/components/Dev/DevChatMobile'

export default function ChatMobilePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <DevChatMobile />
    </main>
  )
}
```

TEST:
- Navegar a http://localhost:3000/chat-mobile
- Página carga sin errores (aunque componente no existe aún)

SIGUIENTE: Prompt 1.2 para crear DevChatMobile.tsx
```

---

### Prompt 1.2: Crear componente `DevChatMobile.tsx`

```
@ux-interface

TAREA: Crear componente DevChatMobile.tsx con layout fullscreen

CONTEXTO:
- Basado en: src/components/Dev/DevChatInterface.tsx
- Diferencia: Layout fullscreen (no bubble flotante)
- Viewport target: iPhone 15 (430×932), Pixel 8 (412×915), Galaxy S24 (360×800)

ARCHIVOS:
- Leer: src/components/Dev/DevChatInterface.tsx (líneas 1-484)
- Crear: src/components/Dev/DevChatMobile.tsx

ESPECIFICACIONES DE LAYOUT:

1. **Estructura HTML:**
```tsx
<div className="h-screen w-screen flex flex-col bg-white">
  {/* Header fijo */}
  <header className="fixed top-0 left-0 right-0 z-50 h-[60px]">
    ...
  </header>

  {/* Messages scrollable */}
  <div className="flex-1 overflow-y-auto pt-[76px] pb-[96px]">
    ...
  </div>

  {/* Input fijo */}
  <div className="fixed bottom-0 left-0 right-0 z-50">
    ...
  </div>
</div>
```

2. **Header (60px):**
- Gradient: `bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600`
- Título centrado: "Simmer Down Chat"
- Icono bot (opcional)
- SIN botones minimize/close

3. **Messages Area:**
- `pt-[76px]` → 60px header + 16px spacing
- `pb-[96px]` → 80px input + 16px spacing
- Background: `bg-gradient-to-b from-sand-50 to-white`

4. **Input Area:**
- Textarea + Send button (44px × 44px)
- Border-top: `border-gray-200`

COPIAR DE DevChatInterface.tsx:
- useState hooks (lines 44-50)
- useEffect hooks (lines 55-90)
- sendMessage function (básica, sin streaming aún)
- handleKeyDown (lines 206-211)

NO COPIAR (viene en FASE 3):
- Streaming logic (lines 128-204)
- Typing dots (lines 336-342)
- ReactMarkdown (lines 344-366)

TEST:
- Componente renderiza fullscreen
- Header fijo en top
- Input fijo en bottom
- Messages área scrolleable
- Layout no rompe en 360px - 430px

SIGUIENTE: Prompt 1.3 para testing visual
```

---

### Prompt 1.3: Testing visual FASE 1

```
TAREA: Validar layout mobile en Chrome DevTools

PASOS:
1. Abrir http://localhost:3000/chat-mobile
2. Abrir DevTools (Cmd+Option+I)
3. Toggle device toolbar (Cmd+Shift+M)
4. Probar estos viewports:
   - iPhone 15 Pro Max (430×932)
   - iPhone 14 Pro (393×852)
   - Google Pixel 8 Pro (412×915)
   - Samsung Galaxy S24 (360×800)

VALIDACIONES:
- [ ] Header permanece fijo al scroll
- [ ] Input permanece fijo al scroll
- [ ] Messages área scrollea sin problemas
- [ ] Layout no rompe en 360px (más pequeño)
- [ ] No hay overflow horizontal
- [ ] Touch targets del send button ≥ 44px

SI TODO PASA:
→ Marcar TODO.md FASE 1 tareas como [x]
→ Usar Prompt 1.4 para documentar FASE 1

SI HAY ERRORES:
→ Describir el problema
→ Ajustar CSS según sea necesario
```

---

### Prompt 1.4: Documentar FASE 1

```
TAREA: Crear documentación de FASE 1

ARCHIVOS A CREAR:
1. docs/chat-mobile/fase-1/IMPLEMENTATION.md
   - Qué se implementó (página + componente + layout)
   - Estructura del layout (header + messages + input)
   - Decisiones técnicas

2. docs/chat-mobile/fase-1/CHANGES.md
   - Archivos creados:
     - src/app/chat-mobile/page.tsx
     - src/components/Dev/DevChatMobile.tsx
   - Archivos NO modificados (todo nuevo)

3. docs/chat-mobile/fase-1/TESTS.md
   - Tests visuales en Chrome DevTools
   - Viewports probados (iPhone 15, Pixel 8, Galaxy S24)
   - Resultados (✅ todos los tests pasaron)

CONTEXTO:
- Se creó layout fullscreen mobile-first
- Header fijo 60px, Messages flex-1, Input fijo 80px
- Funciona en 360px - 430px width

Marca TODO.md FASE 1.1, 1.2, 1.3, 1.4 como [x] después de crear los archivos.

SIGUIENTE: Prompt 2.1 para FASE 2 (Safe Areas)
```

---

## FASE 2: Mobile Optimizations (3-4h)

### Prompt 2.1: Implementar Safe Areas

```
@ux-interface

TAREA: Implementar safe areas para notch y home bar

CONTEXTO:
- FASE 1 completada (layout básico funcional)
- Ahora: Optimizar para safe areas de iOS/Android
- Target: iPhone 15 (notch + home bar)

ARCHIVOS:
- Modificar: src/components/Dev/DevChatMobile.tsx

CAMBIOS REQUERIDOS:

1. **Safe Area Top (Notch):**
```tsx
// Header
<header className="fixed top-0 left-0 right-0 z-50
                   h-[60px] pt-[env(safe-area-inset-top)]
                   bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600">
  <div className="h-[60px] flex items-center justify-center">
    {/* Content */}
  </div>
</header>
```

2. **Ajustar Messages Padding Top:**
```tsx
// Messages area
<div className="flex-1 overflow-y-auto
                pt-[calc(60px_+_env(safe-area-inset-top)_+_16px)]
                pb-[calc(80px_+_env(safe-area-inset-bottom)_+_16px)]">
```

3. **Safe Area Bottom (Home Bar):**
```tsx
// Input area
<div className="fixed bottom-0 left-0 right-0 z-50
                pb-[env(safe-area-inset-bottom)]">
  {/* Input content con padding-bottom: 16px interno */}
</div>
```

TEST:
- Chrome DevTools → iPhone 15 Pro Max
- Notch no tapa header content
- Home bar no tapa input button
- Messages visibles completamente

SIGUIENTE: Prompt 2.2 para touch optimization
```

---

### Prompt 2.2: Touch Optimization + Scroll Behavior

```
@ux-interface

TAREA: Optimizar touch targets y scroll behavior

ARCHIVOS:
- Modificar: src/components/Dev/DevChatMobile.tsx

CAMBIOS:

1. **Touch Targets ≥ 44px:**
```tsx
// Send button
<button
  className="w-11 h-11 min-w-[44px] min-h-[44px] // 44px touch target
             bg-gradient-to-r from-teal-500 to-cyan-600
             rounded-xl flex items-center justify-center
             touch-manipulation // Better touch response
             active:scale-95 transition-transform"
>
  <Send className="w-5 h-5" />
</button>
```

2. **Smooth Scroll:**
```tsx
// Messages area
<div className="flex-1 overflow-y-auto
                overscroll-behavior-contain // No bounce
                scroll-smooth
                ...">

// Auto-scroll en useEffect
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: 'smooth',
    block: 'end'
  })
}, [messages])
```

3. **Keyboard Handling:**
```tsx
// Main container
<div className="min-h-[100dvh] h-[100dvh] // dvh para keyboard
             w-screen flex flex-col">
```

TEST:
- Touch send button → fácil de presionar
- Nuevos mensajes → auto-scroll smooth
- Abrir keyboard iOS/Android → input visible
- Scroll bounce deshabilitado

SIGUIENTE: Prompt 2.3 para documentar FASE 2
```

---

### Prompt 2.3: Documentar FASE 2

```
TAREA: Crear documentación de FASE 2

ARCHIVOS A CREAR:
1. docs/chat-mobile/fase-2/IMPLEMENTATION.md
   - Safe areas implementadas (notch, home bar)
   - Touch optimization (≥ 44px)
   - Scroll behavior (smooth, auto-scroll, no bounce)
   - Keyboard handling (100dvh)

2. docs/chat-mobile/fase-2/CHANGES.md
   - Modificado: src/components/Dev/DevChatMobile.tsx
   - Cambios CSS: safe-area-inset, touch-manipulation, dvh
   - 15+ líneas modificadas

3. docs/chat-mobile/fase-2/TESTS.md
   - Safe areas: iPhone 15 (notch, home bar OK)
   - Touch: Send button fácil de presionar
   - Scroll: Auto-scroll funciona, no bounce
   - Keyboard: iOS Safari OK, Android Chrome OK

Marca TODO.md FASE 2 tareas como [x] después de crear los archivos.

SIGUIENTE: Prompt 3.1 para FASE 3 (Feature Parity)
```

---

## FASE 3: Feature Parity (2-3h)

### Prompt 3.1: Portar Streaming SSE

```
@ux-interface

TAREA: Implementar streaming Server-Sent Events

CONTEXTO:
- FASE 2 completada (mobile optimizations OK)
- Ahora: Portar streaming de DevChatInterface.tsx
- API endpoint: /api/dev/chat?stream=true

ARCHIVOS:
- Leer: src/components/Dev/DevChatInterface.tsx (líneas 128-204)
- Modificar: src/components/Dev/DevChatMobile.tsx

CÓDIGO A PORTAR:

1. **Streaming Logic (líneas 128-204):**
```tsx
const sendMessage = async () => {
  // ... setup code ...

  // Create placeholder message
  const assistantId = `assistant-${Date.now()}`
  const assistantMessage: Message = {
    id: assistantId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    suggestions: []
  }
  setMessages(prev => [...prev, assistantMessage])

  try {
    // Fetch with streaming
    const response = await fetch('/api/dev/chat?stream=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        session_id: sessionId,
        tenant_id: 'simmerdown'
      })
    })

    // Parse SSE stream
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6))
          if (data.type === 'chunk') {
            fullContent += data.content
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            )
          }
        }
      }
    }

    setLoading(false)
  } catch (err) {
    // Error handling...
  }
}
```

TEST:
- Enviar mensaje
- Respuesta streamea chunk por chunk
- Contenido se actualiza en tiempo real
- Loading state correcto

SIGUIENTE: Prompt 3.2 para markdown + typing dots
```

---

### Prompt 3.2: Portar Markdown + Typing Dots

```
@ux-interface

TAREA: Implementar markdown rendering + typing indicators

ARCHIVOS:
- Leer: src/components/Dev/DevChatInterface.tsx (líneas 5-6, 336-366)
- Modificar: src/components/Dev/DevChatMobile.tsx

IMPORTS NECESARIOS:
```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
```

CÓDIGO A PORTAR (líneas 336-366):

```tsx
{message.role === 'assistant' ? (
  <>
    {!message.content && loading ? (
      // Typing dots while waiting
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    ) : (
      <div className="text-sm leading-relaxed markdown-content transition-opacity duration-150">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 text-gray-900" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 text-gray-900" {...props} />,
            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="ml-2" {...props} />,
            strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
            em: ({node, ...props}) => <em className="italic" {...props} />,
            a: ({node, ...props}) => <a className="text-teal-600 hover:underline" {...props} />,
            code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono" {...props} />,
          }}
        >
          {message.content}
        </ReactMarkdown>
        {loading && message.content && (
          <span className="inline-block w-2 h-4 bg-gray-900 ml-0.5 animate-pulse" />
        )}
      </div>
    )}
  </>
) : (
  // User message (sin cambios)
)}
```

TEST:
- Enviar mensaje → typing dots aparecen
- Stream llega → markdown renderiza
- Headers, lists, bold, links funcionan
- Cursor pulsa mientras streamea

SIGUIENTE: Prompt 3.3 para photos + suggestions
```

---

### Prompt 3.3: Portar Photos Carousel + Suggestions

```
@ux-interface

TAREA: Implementar photo carousel y follow-up suggestions

ARCHIVOS:
- Leer: src/components/Dev/DevChatInterface.tsx (líneas 7-9, 362-402)
- Modificar: src/components/Dev/DevChatMobile.tsx

IMPORTS NECESARIOS:
```tsx
import DevPhotoCarousel from './DevPhotoCarousel'
import DevAvailabilityCTA from './DevAvailabilityCTA'
import DevIntentSummary from './DevIntentSummary'
```

CÓDIGO A PORTAR:

1. **Photo Carousel (líneas 362-374):**
```tsx
{message.role === 'assistant' && message.sources && (
  <>
    {(() => {
      const photos = message.sources
        .filter(s => s.photos && s.photos.length > 0)
        .flatMap(s => s.photos!.map(url => ({
          url,
          caption: s.unit_name
        })))
      return photos.length > 0 ? <DevPhotoCarousel photos={photos} /> : null
    })()}
  </>
)}
```

2. **Suggestions (líneas 386-402):**
```tsx
{message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {message.suggestions.map((suggestion, idx) => (
      <button
        key={idx}
        onClick={() => handleSuggestionClick(suggestion)}
        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100
                   text-teal-700 text-sm rounded-full
                   border border-teal-200
                   transition-all duration-200
                   hover:scale-105 active:scale-95"
      >
        {suggestion}
      </button>
    ))}
  </div>
)}
```

3. **handleSuggestionClick:**
```tsx
const handleSuggestionClick = (suggestion: string) => {
  setInput(suggestion)
  inputRef.current?.focus()
  trackSuggestionClick(suggestion) // Si tienes analytics
}
```

TEST:
- Mensaje con fotos → carousel aparece
- Carousel scrolleable
- Suggestions → clickeables
- Click suggestion → llena input

SIGUIENTE: Prompt 3.4 para documentar FASE 3
```

---

### Prompt 3.4: Documentar FASE 3

```
TAREA: Crear documentación de FASE 3

ARCHIVOS A CREAR:
1. docs/chat-mobile/fase-3/IMPLEMENTATION.md
   - Streaming SSE implementado
   - Markdown rendering (ReactMarkdown + remark-gfm)
   - Typing dots + cursor pulsante
   - Photo carousel
   - Follow-up suggestions

2. docs/chat-mobile/fase-3/CHANGES.md
   - Modificado: src/components/Dev/DevChatMobile.tsx
   - Imports agregados: ReactMarkdown, remarkGfm, DevPhotoCarousel
   - 200+ líneas de código portadas

3. docs/chat-mobile/fase-3/TESTS.md
   - Streaming: ✅ Chunks llegan en tiempo real
   - Markdown: ✅ Headers, lists, bold, links OK
   - Typing dots: ✅ Aparecen mientras espera
   - Cursor: ✅ Pulsa mientras streamea
   - Photos: ✅ Carousel funciona
   - Suggestions: ✅ Clickeables, llenan input

Marca TODO.md FASE 3 tareas como [x] después de crear los archivos.

SIGUIENTE: Prompt 4.1 para FASE 4 (Polish & Performance)
```

---

## FASE 4: Polish & Performance (1-2h)

### Prompt 4.1: Animaciones + Error Handling

```
@ux-interface

TAREA: Añadir animaciones smooth y error handling

ARCHIVOS:
- Modificar: src/components/Dev/DevChatMobile.tsx

CAMBIOS:

1. **Message Entrance Animation:**
```tsx
// En el map de messages
<div
  key={message.id}
  className="flex gap-3 animate-message-in"
  style={{ animationDelay: `${index * 50}ms` }}
>
```

2. **Error Banner (líneas 417-429 de DevChatInterface):**
```tsx
{error && (
  <div className="bg-red-50 border-t border-red-200 p-3 flex items-center justify-between">
    <p className="text-sm text-red-700">{error}</p>
    <button
      onClick={retryLastMessage}
      className="text-sm text-red-600 hover:text-red-800 font-medium underline"
    >
      Retry
    </button>
  </div>
)}
```

3. **Retry Function:**
```tsx
const retryLastMessage = () => {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
  if (lastUserMessage) {
    setInput(lastUserMessage.content)
    setError(null)
  }
}
```

TEST:
- Mensajes aparecen con fade-in smooth
- Simular error (offline) → banner aparece
- Click retry → input se llena con último mensaje

SIGUIENTE: Prompt 4.2 para accessibility
```

---

### Prompt 4.2: Accessibility (A11y)

```
@ux-interface

TAREA: Implementar accessibility compliance

ARCHIVOS:
- Modificar: src/components/Dev/DevChatMobile.tsx

CAMBIOS:

1. **ARIA Labels:**
```tsx
// Main container
<div
  className="..."
  role="main"
  aria-label="Chat conversation"
>

// Messages area
<div
  className="..."
  role="log"
  aria-live="polite"
  aria-atomic="false"
>

// Input
<textarea
  aria-label="Type your message"
  placeholder="Type your message..."
/>

<button
  aria-label="Send message"
  disabled={!input.trim() || loading}
>
```

2. **Focus Management:**
```tsx
// Auto-focus input cuando se monta
useEffect(() => {
  inputRef.current?.focus()
}, [])

// Focus visible states
<button className="... focus:ring-2 focus:ring-teal-500 focus:outline-none">
```

3. **Color Contrast:**
- Verificar que todos los textos tengan contrast ratio ≥ 4.5:1
- Usar herramienta: https://webaim.org/resources/contrastchecker/

TEST:
- VoiceOver (Mac): Cmd+F5 → navegar con tab
- Keyboard navigation: Tab, Enter, Escape funcionan
- Screen reader anuncia nuevos mensajes

SIGUIENTE: Prompt 4.3 para performance check
```

---

### Prompt 4.3: Performance Check (Lighthouse)

```
TAREA: Ejecutar Lighthouse audit y optimizar

PASOS:

1. **Build para producción:**
```bash
npm run build
npm start
```

2. **Lighthouse Audit:**
- Abrir Chrome DevTools
- Tab "Lighthouse"
- Device: Mobile
- Categories: Performance, Accessibility, Best Practices
- Click "Analyze page load"

3. **Métricas Target:**
- Performance: ≥ 90
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1
- Accessibility: ≥ 95

4. **Optimizaciones Comunes:**
- Lazy load DevPhotoCarousel si no está en viewport
- Debounce textarea auto-resize
- Use `will-change: transform` para animaciones
- Preload critical fonts

SI SCORE < 90:
→ Identificar bottlenecks en Lighthouse report
→ Aplicar optimizaciones sugeridas
→ Re-correr audit

SI SCORE ≥ 90:
→ Screenshot del report
→ Guardar en docs/chat-mobile/fase-4/LIGHTHOUSE.png

SIGUIENTE: Prompt 4.4 para documentar FASE 4
```

---

### Prompt 4.4: Documentar FASE 4 (Final)

```
TAREA: Crear documentación final de FASE 4

ARCHIVOS A CREAR:
1. docs/chat-mobile/fase-4/IMPLEMENTATION.md
   - Animaciones smooth (message entrance)
   - Error handling (banner + retry)
   - Accessibility (ARIA, focus, contrast)
   - Performance optimizations

2. docs/chat-mobile/fase-4/CHANGES.md
   - Modificado: src/components/Dev/DevChatMobile.tsx
   - ARIA labels agregados
   - Error banner implementado
   - Animaciones CSS

3. docs/chat-mobile/fase-4/TESTS.md
   - Animaciones: ✅ Smooth, no bruscas
   - Error handling: ✅ Banner + retry OK
   - VoiceOver: ✅ Navigation OK
   - Lighthouse: ✅ Score ≥ 90 (adjuntar screenshot)

4. docs/chat-mobile/fase-4/LIGHTHOUSE.png
   - Screenshot del Lighthouse report

Marca TODO.md FASE 4 tareas como [x] después de crear los archivos.

PROYECTO COMPLETADO ✅
```

---

## 🎯 RESUMEN RÁPIDO - Quick Start

### Nueva conversación? Usa este prompt:

```
CONTEXTO: Mobile-First Chat Interface

Estoy en el proyecto "Mobile-First Chat Interface".

ESTADO ACTUAL:
- Plan completo: plan.md
- Tareas: TODO.md
- Base: DevChatInterface.tsx (funcional)

PRÓXIMA FASE: [INDICAR FASE 1, 2, 3, o 4]

Por favor:
1. Lee mobile-first-prompt-workflow.md
2. Busca el prompt de la FASE que indiqué
3. Ejecuta ese prompt completo

Archivos clave:
- /Users/oneill/Sites/apps/InnPilot/plan.md
- /Users/oneill/Sites/apps/InnPilot/TODO.md
- /Users/oneill/Sites/apps/InnPilot/mobile-first-prompt-workflow.md

¿Listo para comenzar?
```

---

## 📋 CHECKLIST FINAL

Después de completar todas las fases, verificar:

### Funcionalidad
- [ ] Ruta `/chat-mobile` accesible
- [ ] Chat fullscreen sin decoración
- [ ] Streaming SSE funcional
- [ ] Markdown rendering completo
- [ ] Typing dots + cursor pulsante
- [ ] Photo carousel
- [ ] Follow-up suggestions

### Mobile UX
- [ ] Safe areas OK (notch, home bar)
- [ ] Touch targets ≥ 44px
- [ ] Keyboard no tapa input
- [ ] Smooth scroll
- [ ] Landscape mode OK
- [ ] No bounce scroll

### Performance
- [ ] Lighthouse mobile ≥ 90
- [ ] FCP < 1.5s
- [ ] TTI < 3s
- [ ] CLS < 0.1

### Accesibilidad
- [ ] VoiceOver OK
- [ ] TalkBack OK
- [ ] ARIA completo
- [ ] Contrast ≥ 4.5:1

### Compatibilidad
- [ ] iPhone 15/14 OK
- [ ] Pixel 8 OK
- [ ] Galaxy S24 OK
- [ ] 360px - 430px OK

---

**Última actualización:** 3 Octubre 2025
**Versión:** 1.0
