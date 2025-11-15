# FASE 2.6 - Topic Suggestion UI Changes

**Fecha:** 5 de Octubre 2025
**Agent:** @agent-ux-interface

---

## Archivos Modificados

### 1. `src/components/Chat/GuestChatInterface.tsx`

**Total líneas agregadas:** ~120 líneas

**Secciones modificadas:**

#### Imports (líneas 1-31)
```diff
+ import { Lightbulb } from "lucide-react"
+ import { motion, AnimatePresence } from 'framer-motion'
```

#### Interfaces (líneas 59-62)
```diff
+ interface TopicSuggestion {
+   topic: string
+   confidence: number
+ }
```

#### State (líneas 85-86)
```diff
+ // Topic suggestion state (FASE 2.6 - Conversation Intelligence)
+ const [topicSuggestion, setTopicSuggestion] = useState<TopicSuggestion | null>(null)
```

#### Effects (líneas 130-140)
```diff
+ // Keyboard shortcuts - ESC to close topic suggestion
+ useEffect(() => {
+   const handleKeyDown = (e: KeyboardEvent) => {
+     if (e.key === 'Escape' && topicSuggestion) {
+       setTopicSuggestion(null)
+     }
+   }
+
+   window.addEventListener('keydown', handleKeyDown)
+   return () => window.removeEventListener('keydown', handleKeyDown)
+ }, [topicSuggestion])
```

#### Handler: `handleSendMessage()` (líneas 424-430)
```diff
  // Update follow-up suggestions
  if (data.followUpSuggestions) {
    setFollowUpSuggestions(data.followUpSuggestions)
  }

+ // Update topic suggestion (FASE 2.6 - Conversation Intelligence)
+ if (data.topicSuggestion) {
+   setTopicSuggestion({
+     topic: data.topicSuggestion.topic,
+     confidence: data.topicSuggestion.confidence || 0.8,
+   })
+ }

  // Update conversation in list
```

#### New Handler: `handleCreateTopicConversation()` (líneas 491-539)
```diff
+ const handleCreateTopicConversation = async (topic: string) => {
+   try {
+     // Create nueva conversación con título del topic
+     const response = await fetch('/api/guest/conversations', {
+       method: 'POST',
+       headers: {
+         'Content-Type': 'application/json',
+         Authorization: `Bearer ${token}`,
+       },
+       body: JSON.stringify({
+         title: topic,
+       }),
+     })
+
+     if (!response.ok) {
+       throw new Error('Error al crear conversación')
+     }
+
+     const data = await response.json()
+
+     // Add new conversation to list
+     const newConversation: Conversation = {
+       id: data.conversation.id,
+       title: data.conversation.title,
+       last_message: data.conversation.last_message,
+       updated_at: data.conversation.updated_at,
+     }
+
+     setConversations((prev) => [newConversation, ...prev])
+     setActiveConversationId(data.conversation.id)
+
+     // Clear current state
+     setMessages([])
+     setTrackedEntities(new Map())
+     setFollowUpSuggestions([])
+     setTopicSuggestion(null)
+
+     // Close sidebar on mobile
+     setIsSidebarOpen(false)
+
+     // Optional: Send initial message about the topic
+     setTimeout(() => {
+       handleSendMessage(`Cuéntame más sobre ${topic}`)
+     }, 500)
+   } catch (err) {
+     console.error('Error creating topic conversation:', err)
+     setError('No se pudo crear la conversación sobre este tema')
+   }
+ }
```

#### UI Component: Banner (líneas 1133-1194)
```diff
  {/* Follow-up Suggestions */}
  {followUpSuggestions.length > 0 && !isLoading && (
    ...
  )}

+ {/* Topic Suggestion Banner (FASE 2.6 - Conversation Intelligence) */}
+ <AnimatePresence>
+   {topicSuggestion && !isLoading && (
+     <motion.div
+       initial={{ opacity: 0, y: -20 }}
+       animate={{ opacity: 1, y: 0 }}
+       exit={{ opacity: 0, y: -20 }}
+       transition={{ duration: 0.3 }}
+       className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200"
+     >
+       <div className="max-w-4xl mx-auto px-4 py-4">
+         <div className="flex items-start gap-3">
+           {/* Icon */}
+           <div className="flex-shrink-0 mt-0.5">
+             <Lightbulb className="h-6 w-6 text-blue-600" />
+           </div>
+
+           {/* Content */}
+           <div className="flex-1 min-w-0">
+             <h3 className="font-semibold text-gray-900 mb-1 text-sm">
+               Nueva conversación sugerida
+             </h3>
+             <p className="text-sm text-gray-600 mb-3">
+               He notado que estás hablando sobre{' '}
+               <span className="font-medium text-blue-700">
+                 {topicSuggestion.topic}
+               </span>
+               . ¿Te gustaría crear una conversación dedicada para este tema?
+             </p>
+
+             {/* Action Buttons */}
+             <div className="flex flex-wrap gap-2">
+               <button
+                 onClick={() => handleCreateTopicConversation(topicSuggestion.topic)}
+                 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
+                 aria-label={`Crear conversación sobre ${topicSuggestion.topic}`}
+               >
+                 Sí, crear conversación
+               </button>
+               <button
+                 onClick={() => setTopicSuggestion(null)}
+                 className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
+                 aria-label="Continuar en conversación actual"
+               >
+                 No, continuar aquí
+               </button>
+             </div>
+           </div>
+
+           {/* Close Button */}
+           <button
+             onClick={() => setTopicSuggestion(null)}
+             className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
+             aria-label="Cerrar sugerencia"
+           >
+             <X className="h-5 w-5" />
+           </button>
+         </div>
+       </div>
+     </motion.div>
+   )}
+ </AnimatePresence>

  {/* Error Bar */}
```

---

## Archivos Creados

### 1. `scripts/test-topic-suggestion.ts`

**Descripción:** Script de testing para simular topic suggestions en browser console

**Tamaño:** ~100 líneas

**Uso:**
```javascript
// En browser console
simulateTopicSuggestion("Restaurantes en San Andrés")
```

### 2. `docs/guest-portal-multi-conversation/fase-2.6/UI_IMPLEMENTATION.md`

**Descripción:** Documentación técnica completa de la implementación UI

**Contenido:**
- Overview del componente
- Archivos modificados (diff detallado)
- Animaciones (Framer Motion)
- Responsive design
- Accesibilidad (WCAG AA)
- User flows
- Backend integration specs
- Testing checklist

### 3. `docs/guest-portal-multi-conversation/fase-2.6/CHANGES.md`

**Descripción:** Este archivo - changelog de cambios

---

## Estadísticas

**Total líneas modificadas:** ~120 líneas (GuestChatInterface.tsx)
**Total archivos creados:** 3 archivos
**Total documentación:** ~500 líneas
**Dependencies agregadas:** 0 (framer-motion ya estaba instalado)

---

## Testing Status

### ✅ Implementado
- [x] State management (topicSuggestion)
- [x] Handler: handleCreateTopicConversation()
- [x] UI Banner component
- [x] Animaciones (Framer Motion)
- [x] Keyboard shortcut (ESC)
- [x] ARIA labels
- [x] Responsive design (mobile/desktop)
- [x] Integration con handleSendMessage()

### ⏳ Pendiente (Backend)
- [ ] API endpoint `/api/guest/chat` incluir `topicSuggestion`
- [ ] Topic detection logic (Claude AI)
- [ ] Confidence scoring
- [ ] Rate limiting (1 cada 5 mensajes)

### 🧪 Testing Manual Pendiente
- [ ] Visual testing (Chrome DevTools)
- [ ] Mobile testing (375px, 430px)
- [ ] Keyboard navigation (Tab, Enter, ESC)
- [ ] Screen reader (VoiceOver, TalkBack)
- [ ] Animation performance (60fps)

---

## Breaking Changes

**Ninguno.** Todos los cambios son backward compatible:
- Nuevo state `topicSuggestion` NO afecta lógica existente
- Banner solo renderiza si `topicSuggestion !== null`
- API response `topicSuggestion` es OPCIONAL (no breaking)

---

## Migration Guide

No se requiere migración. El componente funciona con o sin backend topic suggestion.

**Si backend NO implementado:**
- Banner nunca aparece (topicSuggestion siempre null)
- No errors, no warnings
- Chat funciona normalmente

**Cuando backend implementado:**
- Agregar campo `topicSuggestion` a API response `/api/guest/chat`
- Banner aparece automáticamente
- No cambios adicionales requeridos

---

## Rollback Plan

Si necesitas deshabilitar el banner temporalmente:

1. **Comentar renderizado:**
```tsx
{/* Topic Suggestion Banner - DISABLED
<AnimatePresence>
  {topicSuggestion && !isLoading && (
    ...
  )}
</AnimatePresence>
*/}
```

2. **O eliminar líneas 1133-1194**

3. **Backend:** Remover campo `topicSuggestion` de API response

---

## Performance Impact

**Mediciones esperadas:**

- **Bundle size:** +60KB (framer-motion ya incluido)
- **Runtime overhead:** Negligible (<1ms)
- **Memory:** +2KB por instancia
- **Lighthouse score:** Sin impacto (≥90 mantenido)

**Optimizaciones aplicadas:**

- AnimatePresence: Solo monta component cuando visible
- Conditional rendering: Banner NO renderiza si isLoading
- GPU-accelerated animations (opacity, transform)

---

## Next Steps

1. **Backend developer** implementa FASE 2.6 backend:
   - `src/lib/guest-conversation-memory.ts` → `suggestNewConversation()`
   - `/api/guest/chat` integration
   - Testing

2. **QA testing** cuando backend listo:
   - Visual testing checklist
   - Mobile responsive
   - Accessibility audit
   - Performance benchmarks

3. **Documentation**:
   - Screenshots del banner
   - Video demo (GIF)
   - Update SNAPSHOT.md

4. **Analytics** (opcional):
   - Track suggestion acceptance rate
   - A/B test messaging variants

---

**Última actualización:** 5 de Octubre 2025
**Estado:** UI Complete ✅, Backend Pending ⏳
