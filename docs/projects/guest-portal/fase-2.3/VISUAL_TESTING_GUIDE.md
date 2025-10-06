# Visual Testing Guide - FASE 2.3: UI Multi-Conversation

**Para:** Product Owner / QA Tester
**Tiempo estimado:** 15-20 minutos
**Requisitos:** Chrome DevTools, cuenta guest válida

---

## 🚀 SETUP

### 1. Iniciar servidor de desarrollo
```bash
cd /Users/oneill/Sites/apps/InnPilot
./scripts/dev-with-keys.sh
```

Esperar mensaje: `✓ Ready in Xms`

### 2. Obtener token de guest
**Opción A - Crear nuevo guest:**
1. Visitar: http://localhost:3000/guest-onboarding
2. Completar formulario con:
   - Nombre completo: Test User
   - Email: test@example.com
   - Código acceso: `simmerdown-demo` (o el código del tenant)
3. Copiar token generado

**Opción B - Usar guest existente:**
- Consultar en base de datos `guest_sessions` tabla
- Usar `access_token` válido

### 3. Acceder al Guest Chat
URL: http://localhost:3000/chat?token=YOUR_TOKEN_HERE

Reemplazar `YOUR_TOKEN_HERE` con el token obtenido.

---

## 📱 TEST 1: DESKTOP - SIDEBAR VISIBILITY (5 min)

### Viewport: 1920x1080

**Pasos:**
1. Abrir Chrome DevTools (F12)
2. Responsive mode OFF (Desktop)
3. Verificar sidebar izquierda visible
4. Width: ~300px

**Visual Checklist:**
- [ ] ✅ Sidebar visible a la izquierda (fondo blanco)
- [ ] ✅ "Nueva conversación" button azul con icono +
- [ ] ✅ Lista de conversaciones visible (si existen)
- [ ] ✅ Scroll interno si >10 conversaciones
- [ ] ✅ Chat area a la derecha (flex-1)

**Screenshot requerido:**
- Nombre: `desktop-sidebar-visible.png`
- Focus: Sidebar completo + parte del chat

---

## 🎨 TEST 2: DESKTOP - ACTIVE CONVERSATION HIGHLIGHT (3 min)

**Pasos:**
1. Crear 2-3 conversaciones nuevas
2. Click en una conversación
3. Observar highlight visual

**Visual Checklist:**
- [ ] ✅ Border-left-4 azul (#2563eb) en conversación activa
- [ ] ✅ Background azul claro (bg-blue-50)
- [ ] ✅ Otras conversaciones sin highlight
- [ ] ✅ Título conversación activa en header

**Screenshot requerido:**
- Nombre: `desktop-active-highlight.png`
- Focus: Conversación activa con border azul

---

## 🗑️ TEST 3: DESKTOP - DELETE BUTTON HOVER (3 min)

**Pasos:**
1. Hover mouse sobre una conversación
2. Observar botón delete aparecer (derecha)
3. Click botón delete
4. Verificar confirmación nativa

**Visual Checklist:**
- [ ] ✅ Botón delete invisible por defecto (opacity-0)
- [ ] ✅ Hover → botón delete aparece (opacity-100)
- [ ] ✅ Icono Trash2 color rojo (#dc2626)
- [ ] ✅ Hover botón → background rojo claro (bg-red-100)
- [ ] ✅ Click → confirm dialog "¿Eliminar esta conversación?"

**Screenshot requerido:**
- Nombre: `desktop-delete-hover.png`
- Focus: Conversación con botón delete visible (hover)

---

## 📱 TEST 4: MOBILE - SIDEBAR DRAWER (5 min)

### Viewport: iPhone 14 Pro (393x852)

**Pasos:**
1. Chrome DevTools → Responsive mode
2. Seleccionar "iPhone 14 Pro"
3. Reload página
4. Verificar sidebar oculto

**Visual Checklist:**
- [ ] ✅ Sidebar oculto por defecto (-translate-x-full)
- [ ] ✅ Hamburger button visible (top-left)
- [ ] ✅ Click hamburger → sidebar overlay abre
- [ ] ✅ Backdrop oscuro visible (bg-black/50)
- [ ] ✅ Click backdrop → sidebar cierra
- [ ] ✅ Sidebar width 320px (80% viewport)

**Screenshots requeridos:**
- `mobile-sidebar-closed.png` (sidebar oculto)
- `mobile-sidebar-open.png` (sidebar overlay + backdrop)

---

## 🎯 TEST 5: CREATE/SWITCH/DELETE FLOW (5 min)

**Pasos:**
1. Click "Nueva conversación"
2. Enviar mensaje: "Hola, soy Test User"
3. Esperar respuesta
4. Click "Nueva conversación" again
5. Enviar mensaje: "¿Qué actividades hay?"
6. Switch a primera conversación
7. Verificar mensajes anteriores cargados
8. Delete segunda conversación
9. Verificar primera conversación activa

**Functional Checklist:**
- [ ] ✅ Nueva conversación crea correctamente
- [ ] ✅ Título auto-generado de primer mensaje
- [ ] ✅ Switch conversation carga mensajes
- [ ] ✅ Delete conversation funciona
- [ ] ✅ Auto-switch si activa eliminada
- [ ] ✅ Empty state si no hay conversaciones

**Screenshot requerido:**
- Nombre: `conversation-flow.png`
- Focus: Sidebar con 2+ conversaciones

---

## 🏷️ TEST 6: ENTITY TRACKING PRESERVATION (3 min)

**Pasos:**
1. Crear nueva conversación
2. Enviar: "Mi pasaporte es AB123456"
3. Esperar extracción de entidad
4. Verificar badge "AB123456" aparece
5. Crear segunda conversación
6. Volver a primera
7. Verificar badge persiste

**Visual Checklist:**
- [ ] ✅ Entity badge aparece después de extracción
- [ ] ✅ Badge visible en área superior del chat
- [ ] ✅ Click badge → mensaje "Cuéntame más sobre AB123456"
- [ ] ✅ Badge persiste al cambiar conversación
- [ ] ✅ Badge se carga al volver

**Screenshot requerido:**
- Nombre: `entity-tracking.png`
- Focus: Entity badges área

---

## 💡 TEST 7: FOLLOW-UP SUGGESTIONS (2 min)

**Pasos:**
1. Enviar mensaje que genere follow-ups
2. Ejemplo: "¿Qué hay para hacer en San Andrés?"
3. Esperar respuesta con suggestions
4. Verificar buttons aparecen
5. Click suggestion
6. Verificar mensaje enviado

**Visual Checklist:**
- [ ] ✅ Follow-up buttons aparecen después de respuesta
- [ ] ✅ Buttons estilo pill (rounded-full)
- [ ] ✅ Click button → envía mensaje
- [ ] ✅ Suggestions persisten al cambiar conversación
- [ ] ✅ Suggestions se cargan al volver

**Screenshot requerido:**
- Nombre: `follow-up-suggestions.png`
- Focus: Suggestions buttons área

---

## 🔄 TEST 8: TIMESTAMPS RELATIVOS (2 min)

**Pasos:**
1. Crear conversación
2. Esperar 1 minuto
3. Crear otra conversación
4. Esperar 1 minuto
5. Observar timestamps

**Visual Checklist:**
- [ ] ✅ Timestamp formato: "hace X minutos"
- [ ] ✅ Actualiza correctamente con tiempo
- [ ] ✅ Locale español correcto
- [ ] ✅ Fallback "Recientemente" si error

**Screenshot requerido:**
- Nombre: `timestamps.png`
- Focus: Timestamps en conversaciones

---

## 📊 TEST 9: EMPTY STATE (1 min)

**Pasos:**
1. Eliminar todas las conversaciones
2. Verificar empty state en sidebar

**Visual Checklist:**
- [ ] ✅ Icono MessageSquare (grande, gris)
- [ ] ✅ Texto "No hay conversaciones"
- [ ] ✅ Subtexto "Inicia una nueva conversación..."
- [ ] ✅ Centrado vertical y horizontal

**Screenshot requerido:**
- Nombre: `empty-state.png`
- Focus: Sidebar vacío con mensaje

---

## 🎯 TEST 10: RESPONSIVE BREAKPOINTS (3 min)

**Viewports a testear:**
1. **360px** (Mobile small - Galaxy S24)
2. **393px** (Mobile medium - iPhone 14 Pro)
3. **430px** (Mobile large - iPhone 15 Pro Max)
4. **768px** (Tablet)
5. **1024px** (Desktop)

**Para cada viewport:**
- [ ] Sidebar comportamiento correcto
- [ ] Hamburger visible/oculto según breakpoint
- [ ] Touch targets ≥44px
- [ ] No horizontal scroll
- [ ] Layout no se rompe

**Screenshot requerido:**
- Nombre: `responsive-{width}.png` (5 screenshots)

---

## ✅ ACCEPTANCE CRITERIA CHECKLIST

### Funcionalidad
- [ ] ✅ 46/46 tests manuales PASS
- [ ] ✅ Create conversation funciona
- [ ] ✅ Switch conversation funciona
- [ ] ✅ Delete conversation funciona
- [ ] ✅ Entity tracking preservado
- [ ] ✅ Follow-ups preservados

### UI/UX
- [ ] ✅ Active highlight visible
- [ ] ✅ Delete button hover funciona
- [ ] ✅ Empty state correcto
- [ ] ✅ Timestamps en español
- [ ] ✅ Responsive mobile/desktop

### Performance
- [ ] ✅ Lighthouse Performance ≥90
- [ ] ✅ Lighthouse Accessibility 100
- [ ] ✅ No layout shifts
- [ ] ✅ 60fps animations

---

## 📸 SCREENSHOTS REQUERIDOS (TOTAL: 14)

### Desktop (6)
1. `desktop-sidebar-visible.png`
2. `desktop-active-highlight.png`
3. `desktop-delete-hover.png`
4. `conversation-flow.png`
5. `entity-tracking.png`
6. `follow-up-suggestions.png`

### Mobile (3)
7. `mobile-sidebar-closed.png`
8. `mobile-sidebar-open.png`
9. `timestamps.png`

### General (5)
10. `empty-state.png`
11. `responsive-360.png`
12. `responsive-393.png`
13. `responsive-768.png`
14. `responsive-1024.png`

---

## 🐛 ISSUES A REPORTAR

Si encuentras algún issue, documentar con:

1. **Título:** Descripción breve del issue
2. **Steps to reproduce:** Pasos exactos
3. **Expected behavior:** Comportamiento esperado
4. **Actual behavior:** Comportamiento actual
5. **Screenshot:** Imagen del issue
6. **Environment:**
   - Browser: Chrome X.X
   - Viewport: 1920x1080 (o mobile)
   - OS: macOS / Windows
7. **Severity:** Critical / High / Medium / Low

**Template de issue:**
```markdown
## Issue: [Título]

**Severity:** [Critical/High/Medium/Low]

**Steps to reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected:** [Comportamiento esperado]

**Actual:** [Comportamiento actual]

**Screenshot:** [Adjuntar imagen]

**Environment:**
- Browser: Chrome 120
- Viewport: 1920x1080
- OS: macOS Sonoma
```

---

## ✅ SIGN-OFF

Después de completar todos los tests:

**Tester:** _________________
**Fecha:** _________________
**Status:** [ ] PASS  [ ] FAIL (issues encontrados)

**Notas:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Testing guide creado por:** @ux-interface agent
**Fecha:** 2025-10-05
**Versión:** 1.0
