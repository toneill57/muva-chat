# VISUAL SPECIFICATIONS - FASE 2.3: Sidebar Multi-Conversation

**Fecha:** 5 de Octubre 2025

---

## LAYOUT DESKTOP (≥1024px)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────┬────────────────────────────────────────┐  │
│  │   SIDEBAR       │         MAIN CHAT AREA                 │  │
│  │   (300px)       │                                        │  │
│  │                 │                                        │  │
│  │ ┌─────────────┐ │  ┌──────────────────────────────────┐ │  │
│  │ │  Nueva      │ │  │  Header (Guest info + Logout)    │ │  │
│  │ │ conversación│ │  └──────────────────────────────────┘ │  │
│  │ └─────────────┘ │                                        │  │
│  │                 │  ┌──────────────────────────────────┐ │  │
│  │ ┌─────────────┐ │  │  Entity Badges (if any)          │ │  │
│  │ │ ☑ Consulta  │ │  └──────────────────────────────────┘ │  │
│  │ │   sobre     │ │                                        │  │
│  │ │   suite     │ │  ┌──────────────────────────────────┐ │  │
│  │ │   2h        │ │  │                                  │ │  │
│  │ └─────────────┘ │  │  Messages Area (scrollable)      │ │  │
│  │                 │  │                                  │ │  │
│  │ ┌─────────────┐ │  │  - User messages (right)         │ │  │
│  │ │   Restauran │ │  │  - Bot messages (left)           │ │  │
│  │ │   tes       │ │  │                                  │ │  │
│  │ │   5m        │ │  │                                  │ │  │
│  │ └─────────────┘ │  └──────────────────────────────────┘ │  │
│  │                 │                                        │  │
│  │ ┌─────────────┐ │  ┌──────────────────────────────────┐ │  │
│  │ │   Actividad │ │  │  Follow-up Suggestions (if any)  │ │  │
│  │ │   es        │ │  └──────────────────────────────────┘ │  │
│  │ │   Ahora     │ │                                        │  │
│  │ └─────────────┘ │  ┌──────────────────────────────────┐ │  │
│  │                 │  │  Input Area (textarea + send btn)│ │  │
│  │ (scroll...)     │  └──────────────────────────────────┘ │  │
│  │                 │                                        │  │
│  └─────────────────┴────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key features:**
- Sidebar always visible (300px width, fixed left)
- Blue border-left-4 on active conversation
- Blue-50 background on active conversation
- Conversations scrollable (if >10 items)
- Main chat area takes remaining space (flex-1)

---

## LAYOUT MOBILE (<1024px)

### Estado CERRADO (default)

```
┌───────────────────────────┐
│  ┌─┐ Header + Guest info  │
│  │☰│  [Name]     [Logout] │
│  └─┘                      │
├───────────────────────────┤
│  Entity Badges (if any)   │
├───────────────────────────┤
│                           │
│  Messages Area            │
│  (fullscreen)             │
│                           │
│  - User messages          │
│  - Bot messages           │
│                           │
├───────────────────────────┤
│  Follow-up Suggestions    │
├───────────────────────────┤
│  Input Area (textarea)    │
└───────────────────────────┘
```

### Estado ABIERTO (click hamburger)

```
┌───────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░│ <- Backdrop (black opacity-50)
│░░┌──────────────┐░░░░░░░░░│
│░░│   SIDEBAR    │░░░░░░░░░│ <- Sidebar overlay (z-50)
│░░│   (300px)    │░░░░░░░░░│
│░░│              │░░░░░░░░░│
│░░│ ┌──────────┐ │░░░░░░░░░│
│░░│ │  Nueva   │ │░░░░░░░░░│
│░░│ │conversac.│ │░░░░░░░░░│
│░░│ └──────────┘ │░░░░░░░░░│
│░░│              │░░░░░░░░░│
│░░│ ┌──────────┐ │░░░░░░░░░│
│░░│ │ Consulta │ │░░░░░░░░░│
│░░│ │  sobre   │ │░░░░░░░░░│
│░░│ │  suite   │ │░░░░░░░░░│
│░░│ └──────────┘ │░░░░░░░░░│
│░░│              │░░░░░░░░░│
│░░│ (scroll...)  │░░░░░░░░░│
│░░│              │░░░░░░░░░│
│░░└──────────────┘░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└───────────────────────────┘
```

**Animation:** Sidebar slides from left (translate-x-0), 300ms duration

**Interactions:**
- Click conversation → Sidebar closes automatically
- Click backdrop → Sidebar closes
- Click X button → Sidebar closes

---

## CONVERSATION ITEM (Sidebar)

### DEFAULT STATE
```
┌──────────────────────────┐
│  Consulta sobre suite    │ <- Title (truncate 1 line)
│  Necesito información... │ <- Last message (truncate 2 lines)
│  🕐 2h                    │ <- Timestamp relativo
└──────────────────────────┘
```

### ACTIVE STATE
```
│ ┌────────────────────────┐  <- border-left-4 blue-600
│ │  Consulta sobre suite  │
│ │  Necesito información..│
│ │  🕐 2h                  │
│ └────────────────────────┘
   ^^^^^^^^^ bg-blue-50
```

### HOVER STATE
```
┌──────────────────────────┐
│  Consulta sobre suite    │
│  Necesito información... │  <- bg-slate-50 (hover)
│  🕐 2h                    │
└──────────────────────────┘
```

---

## NUEVA CONVERSACIÓN BUTTON

### DEFAULT
```
┌────────────────────────────┐
│  + Nueva conversación      │ <- bg-blue-600, text-white
└────────────────────────────┘
```

### HOVER
```
┌────────────────────────────┐
│  + Nueva conversación      │ <- bg-blue-700 (hover)
└────────────────────────────┘
```

### LOADING (creating conversation)
```
┌────────────────────────────┐
│  ⊙ Creando conversación... │ <- spinner + text
└────────────────────────────┘
```

---

## EMPTY STATE (0 conversations)

```
┌──────────────────────────────┐
│                              │
│       ┌─────────────┐        │
│       │             │        │
│       │  💬 (icon)  │        │
│       │             │        │
│       └─────────────┘        │
│                              │
│   No hay conversaciones      │ <- text-slate-700
│                              │
│  Inicia una nueva            │ <- text-slate-500
│  conversación para comenzar  │
│                              │
└──────────────────────────────┘
```

---

## TIMESTAMPS RELATIVOS

| Elapsed Time | Display |
|--------------|---------|
| < 1 minute   | `Ahora` |
| 1-59 minutes | `5m`, `30m`, `59m` |
| 1-23 hours   | `1h`, `2h`, `12h`, `23h` |
| 1-6 days     | `1d`, `2d`, `3d`, `6d` |
| 7+ days      | `oct 5`, `sep 15`, `12 ago` |

**Function:**
```typescript
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
}
```

---

## AUTO-GENERATED TITLE

**Logic:**
- Trigger: Después del primer mensaje del guest
- Source: `textToSend.slice(0, 50)`
- Format: `"Consulta sobre suite..."` (truncate + ellipsis si >50 chars)

**Examples:**

| User first message | Auto-generated title |
|-------------------|---------------------|
| "Hola, ¿dónde está la playa?" | `"Hola, ¿dónde está la playa?"` |
| "Necesito información sobre las actividades turísticas en San Andrés" | `"Necesito información sobre las actividades turísti..."` |
| "Restaurantes" | `"Restaurantes"` |

---

## COLORS

### Sidebar
- Background: `bg-white`
- Border right: `border-slate-200`
- Dividers: `divide-slate-100`

### Conversation item
- Title: `text-slate-900` (font-semibold)
- Last message: `text-slate-600`
- Timestamp: `text-slate-500`

### Active conversation
- Border left: `border-l-blue-600` (4px)
- Background: `bg-blue-50`

### Nueva conversación button
- Default: `bg-blue-600` + `text-white`
- Hover: `bg-blue-700`

### Icons
- Clock: `text-slate-500` (3×3)
- Plus: `text-white` (5×5)
- MessageSquare: `text-slate-300` (16×16, empty state)

---

## ANIMATIONS

### Sidebar drawer (mobile)
```css
.sidebar {
  transition: transform 300ms ease-in-out;
}

.sidebar-closed {
  transform: translateX(-100%);
}

.sidebar-open {
  transform: translateX(0);
}
```

### Backdrop fade-in (mobile)
```css
.backdrop {
  animation: fadeIn 200ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 0.5; }
}
```

### Conversation item hover
```css
.conversation-item {
  transition: background-color 200ms ease;
}

.conversation-item:hover {
  background-color: rgb(248 250 252); /* slate-50 */
}
```

---

## LOADING STATES

### Loading conversations (on mount)
```
┌──────────────────────────┐
│                          │
│       ⊙ (spinner)        │ <- Loader2 icon, animate-spin
│                          │
└──────────────────────────┘
```

### Creating conversation (after click button)
1. Button disabled (opacity-50)
2. Spinner on button
3. Text: "Creando..."

### Switching conversation
1. Messages area clears
2. Loading spinner in center
3. New messages load

---

## ERROR STATES

### Error loading conversations
```
┌──────────────────────────┐
│  ⚠ Error al cargar       │
│     conversaciones       │
│                          │
│  [Reintentar]  button    │
└──────────────────────────┘
```

### Error creating conversation
- Toast notification (top-right)
- Message: "No se pudo crear la conversación"
- Auto-dismiss 3s

---

## ACCESSIBILITY SPECS

### ARIA labels (pending implementation)
```html
<aside role="navigation" aria-label="Conversation list">
  <button aria-label="Nueva conversación">...</button>
  <ul role="list">
    <li role="listitem">
      <button aria-label="Conversación: Consulta sobre suite">...</button>
    </li>
  </ul>
</aside>
```

### Keyboard navigation (pending)
- Tab: Cycle through conversations
- Enter: Select conversation
- Escape: Close mobile sidebar
- Arrow up/down: Navigate list

---

## Z-INDEX LAYERS

```
z-50: Sidebar (mobile)
z-40: Backdrop overlay (mobile)
z-0:  Main chat area
```

---

## TOUCH TARGETS (Mobile)

- Nueva conversación button: 44px height ✅
- Conversation item: Auto height (≥64px typical)
- Hamburger menu button: 44×44px ✅
- Close (X) button: 44×44px ✅

---

## RESPONSIVE BREAKPOINTS

```css
/* Mobile small */
@media (max-width: 640px) {
  .sidebar { width: 100%; } /* Fullscreen drawer */
}

/* Mobile medium */
@media (min-width: 641px) and (max-width: 1023px) {
  .sidebar { width: 300px; } /* Drawer 300px */
}

/* Desktop */
@media (min-width: 1024px) {
  .sidebar { width: 300px; position: relative; } /* Always visible */
}
```

---

## TESTING CHECKLIST VISUAL

### Desktop (Chrome DevTools)
- [ ] Open sidebar (always visible)
- [ ] Click "Nueva conversación" → Creates conversation
- [ ] Active conversation has blue border-left + bg-blue-50
- [ ] Hover conversation → bg-slate-50
- [ ] Timestamps formatted correctly (5m, 2h, etc.)
- [ ] Empty state visible when 0 conversations
- [ ] Scroll works with 10+ conversations

### Mobile (Simulator iOS/Android)
- [ ] Sidebar hidden by default
- [ ] Hamburger button visible top-left
- [ ] Click hamburger → Drawer slides in (300ms)
- [ ] Backdrop visible (black opacity-50)
- [ ] Click conversation → Drawer closes
- [ ] Click backdrop → Drawer closes
- [ ] Touch targets ≥44px (button, items)

### Multi-conversation flow
- [ ] Create 3 conversations
- [ ] Switch between them (messages load)
- [ ] First message generates title
- [ ] Last message preview updates
- [ ] Timestamps update after 1min

---

## SCREENSHOTS NEEDED

1. **Desktop - Sidebar visible**
   - 3 conversations in list
   - Active conversation highlighted
   - Main chat area with messages

2. **Mobile - Sidebar closed**
   - Hamburger menu visible
   - Fullscreen chat

3. **Mobile - Sidebar open**
   - Drawer overlay
   - Backdrop visible
   - Conversations list

4. **Empty state**
   - MessageSquare icon
   - "No hay conversaciones" text

5. **Auto-generated title**
   - Before: "Nueva conversación"
   - After first message: "Consulta sobre suite..."

---

**Status:** Visual specs defined ✅ - Pending screenshots after manual testing
