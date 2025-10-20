# Fix Mobile Spacing - iOS Safari Input Gap Issue

## CONTEXTO

Proyecto: MUVA Chat (Next.js 15, TypeScript, Supabase)
Archivo problemático: `src/components/Chat/GuestChatInterface.tsx`
URL de prueba: https://simmerdown.muva.chat/guest-chat
Credenciales test: check-in: 2025-11-24, phone: 6348

## EL PROBLEMA

**Gap blanco HORRIBLE** entre el input de chat y la barra de navegación de Safari en iOS.

- Se ve **ANTES** de que aparezca el keyboard
- Usuario reporta: "impresentable", "me tiene cansado"
- Ya se intentaron 4 fixes diferentes y TODOS fallaron
- Cada intento requiere ~10 minutos de deploy para probar

## INVESTIGACIÓN COMPLETADA (2025)

### ROOT CAUSE IDENTIFICADO:

**`env(safe-area-inset-bottom)` NO se actualiza cuando el keyboard aparece en iOS Safari**

Fuente: https://webventures.rejh.nl/blog/2025/safe-area-inset-bottom-does-not-update/

Esto causa gap porque:
1. Sin keyboard: safe-area-inset-bottom = 0-34px (home indicator)
2. Con keyboard: safe-area-inset-bottom NO cambia → gap visible

### PROBLEMAS EN EL CÓDIGO ACTUAL:

**Línea 944 - Root container:**
```tsx
<div className="flex h-screen bg-gradient...">  // ❌ h-screen = 100vh
```
- `100vh` en iOS Safari es MÁS GRANDE que viewport visible
- Ignora barra de navegación Safari

**Línea 1171 - Main chat area:**
```tsx
<div className="flex flex-col flex-1 h-screen" style={{ height: '100dvh' }}>
```
- ❌ CONFLICTO: `h-screen` (100vh) + `style={{ height: '100dvh' }}`
- Doble declaración contradictoria

**Línea 1387-1388 - Input area:**
```tsx
<div style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
  <div className="px-4 pt-3 pb-0">
```
- ❌ safe-area-inset-bottom causa el gap
- ❌ Padding asimétrico (pt-3 pb-0)

**Líneas 1510-1512 - CSS override:**
```css
.h-screen {
  height: 100vh;
  height: -webkit-fill-available;
}
```
- Inconsistente con 100dvh usado en línea 1171

### SOLUCIONES INVESTIGADAS (2025):

1. **Usar `100dvh` (dynamic viewport height)**
   - Se ajusta automáticamente cuando keyboard aparece (iOS 17.4+)
   - Fuente: Tailwind CSS v3.4+ incluye `h-dvh`, `min-h-dvh`

2. **ELIMINAR `env(safe-area-inset-bottom)` del input**
   - Causa gap innecesario
   - Usar padding fijo en su lugar

3. **Flexbox layout puro:**
   - Messages area: `flex-1` (toma espacio disponible)
   - Input area: `flex-shrink-0` (no se encoge)
   - Fuente: https://stackoverflow.com/questions/33513957/can-it-flexbox-chat-window-with-input-at-the-bottom-chats-scrolling-up

4. **Sticky positioning mejor que fixed en iOS Safari**
   - `position: sticky; bottom: 0;` más confiable con keyboards
   - Fuente: Consenso 2025 de Stack Overflow

## TU TAREA

1. **Lee el archivo completo:** `src/components/Chat/GuestChatInterface.tsx`

2. **Analiza la estructura de layout** (líneas 944-1437):
   - Root container (944)
   - Main chat area (1171)
   - Messages area (1217-1362)
   - Input area (1387-1437)
   - CSS global (1469-1534)

3. **Identifica TODAS las inconsistencias** de height/viewport

4. **Propón una solución COMPLETA** que:
   - ✅ Use `100dvh` correctamente (sin conflictos con h-screen)
   - ✅ Elimine `env(safe-area-inset-bottom)` del input
   - ✅ Use padding simétrico y consistente
   - ✅ Elimine CSS overrides innecesarios
   - ✅ Funcione en iOS Safari con/sin keyboard
   - ✅ Respete home indicator (via 100dvh automático)

5. **ANTES de aplicar cambios:**
   - Explícame EXACTAMENTE qué vas a cambiar y POR QUÉ
   - Muéstrame el diff completo
   - Justifica cada cambio con fuentes/investigación

## RESTRICCIONES

- NO usar `env(safe-area-inset-bottom)` en input area (causa gap)
- NO usar `100vh` (ignora barra Safari en iOS)
- NO hacer fixes iterativos (necesito solución completa de una vez)
- NO asumir que viewport-fit=cover está mal configurado (YA está en layout.tsx)
- NO tocar el header (su safe-area-inset-top está correcto)

## METADATA DEL PROBLEMA

- Commits fallidos previos: 8e26fc6, 021932b, 3120931, d583791
- Layout.tsx viewport config (CORRECTO):
  ```tsx
  export const viewport: Viewport = {
    viewportFit: 'cover'  // ✅ Ya configurado
  }
  ```

## ÉXITO SE DEFINE COMO:

✅ Input pegado a barra Safari (sin gap)
✅ Funciona ANTES de que keyboard aparezca
✅ Funciona DESPUÉS de que keyboard aparece
✅ Respeta home indicator en iPhones
✅ No rompe layout en desktop
✅ No rompe sidebar/header z-index

---

**IMPORTANTE:** El usuario está EXTREMADAMENTE frustrado. Esta es la QUINTA vez intentando arreglar esto. Necesita una solución que FUNCIONE al primer intento, no más iteraciones.
