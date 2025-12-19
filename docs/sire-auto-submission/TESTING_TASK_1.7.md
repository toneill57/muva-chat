# Testing Guide: Tarea 1.7 - Integración Botón "Iniciar registro" SIRE

**Fecha:** 2025-12-18
**Tarea:** Integrar botón "Iniciar registro" con modo SIRE progressive disclosure

---

## Cambios Implementados

### 1. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/lib/guest-chat-types.ts` | Removido `mode` prop (ahora es state interno) |
| `src/components/Chat/GuestChatInterface.tsx` | - `mode` convertido de prop a state<br>- Agregado `handleStartSIREMode()`<br>- ComplianceReminder integrado con nuevo handler<br>- Detección automática de conversación SIRE |

### 2. Flujo Implementado

```
Usuario → Click "Iniciar registro" → handleStartSIREMode()
  ↓
1. Crear conversación "📋 Registro SIRE"
  ↓
2. Activar conversación y agregar a lista
  ↓
3. Cambiar mode a 'sire'
  ↓
4. Limpiar state (messages, entities, suggestions)
  ↓
5. Cerrar sidebar móvil
  ↓
6. useEffect de inicialización SIRE dispara
  ↓
7. Mostrar mensaje de bienvenida + primera pregunta
  ↓
8. Usuario responde → progressive disclosure activo
```

---

## Casos de Prueba

### Caso 1: Inicio de SIRE desde cero

**Pre-condición:**
- Usuario logged in en portal guest
- ComplianceReminder visible (status: "No iniciado")

**Pasos:**
1. Observar card "Registro SIRE" en sidebar
2. Verificar badge "No iniciado"
3. Click en botón "Iniciar registro"

**Resultado esperado:**
- ✅ Nueva conversación "📋 Registro SIRE" creada
- ✅ Conversación activada automáticamente
- ✅ SIRE Progress Bar visible (0/13 campos)
- ✅ Mensaje de bienvenida:
  ```
  ¡Bienvenido! Voy a ayudarte a completar tu registro de entrada a Colombia.
  Son solo unas pocas preguntas.

  ¿Podrías compartir el número de tu pasaporte?
  ```
- ✅ Sidebar cerrado (móvil)
- ✅ Input habilitado para responder

---

### Caso 2: Respuesta válida (progressive disclosure)

**Pre-condición:**
- Caso 1 completado (SIRE mode activo)
- Primera pregunta mostrada

**Pasos:**
1. Escribir en input: "AB123456"
2. Presionar Enter o click botón enviar

**Resultado esperado:**
- ✅ Mensaje de usuario visible: "AB123456"
- ✅ Mensaje de confirmación:
  ```
  ✅ identification_number confirmado: **AB123456**
  ```
- ✅ Siguiente pregunta:
  ```
  ¿Cuáles son tus nombres completos (sin apellidos)?
  ```
- ✅ Progress Bar actualizado: 1/13 campos
- ✅ Input limpio y listo para siguiente respuesta

---

### Caso 3: Respuesta inválida (validación)

**Pre-condición:**
- SIRE mode activo
- Pregunta actual: "¿Cuál es tu fecha de nacimiento?"

**Pasos:**
1. Escribir en input: "32/13/2025" (fecha inválida)
2. Presionar Enter

**Resultado esperado:**
- ✅ Mensaje de usuario visible: "32/13/2025"
- ✅ Mensaje de error:
  ```
  ❌ [mensaje de error específico]

  Por favor intenta de nuevo.
  ```
- ✅ Campo NO marcado como completado
- ✅ Progress Bar NO cambia
- ✅ Misma pregunta permanece activa
- ✅ Usuario puede intentar de nuevo

---

### Caso 4: Cambio de conversación (SIRE → General)

**Pre-condición:**
- SIRE mode activo (3 campos completados)
- Otra conversación general existe

**Pasos:**
1. Abrir sidebar
2. Click en conversación general (ej: "¿Dónde está la playa?")

**Resultado esperado:**
- ✅ Conversación general activada
- ✅ Progress Bar DESAPARECE
- ✅ Mode cambia a 'general'
- ✅ Mensajes de conversación general cargados
- ✅ Input funciona en modo normal (sin validación SIRE)

---

### Caso 5: Cambio de conversación (General → SIRE)

**Pre-condición:**
- Mode 'general' activo
- Conversación SIRE existe (3 campos completados)

**Pasos:**
1. Abrir sidebar
2. Click en conversación "📋 Registro SIRE"

**Resultado esperado:**
- ✅ Conversación SIRE activada
- ✅ Progress Bar APARECE (3/13 campos)
- ✅ Mode cambia a 'sire'
- ✅ Mensajes de conversación SIRE cargados
- ✅ Siguiente pregunta visible (campo 4)
- ✅ Input funciona con validación SIRE

---

### Caso 6: Múltiples conversaciones SIRE

**Pre-condición:**
- Usuario tiene 1 conversación SIRE existente

**Pasos:**
1. Ver ComplianceReminder (debe estar visible si SIRE no completo)
2. Click "Iniciar registro" nuevamente

**Resultado esperado:**
- ✅ NUEVA conversación "📋 Registro SIRE" creada
- ✅ Progress Bar muestra 0/13 (nueva conversación independiente)
- ✅ Mensaje de bienvenida desde cero
- ✅ Conversación anterior SIRE sigue existiendo en lista

---

### Caso 7: Completar todos los campos SIRE

**Pre-condición:**
- SIRE mode activo (12/13 campos completados)

**Pasos:**
1. Responder última pregunta
2. Presionar Enter

**Resultado esperado:**
- ✅ Mensaje de confirmación del último campo
- ✅ Mensaje de completado:
  ```
  🎉 ¡Todos los datos han sido capturados! Procesando tu registro...
  ```
- ✅ Progress Bar: 13/13 campos ✅
- ✅ `sireDisclosure.isComplete = true`
- ✅ ComplianceReminder DESAPARECE de sidebar

**Nota:** Tarea 1.6 (envío a API) implementará el procesamiento final.

---

### Caso 8: Responsiveness móvil

**Pre-condición:**
- Viewport 375px (iPhone)

**Pasos:**
1. Abrir sidebar
2. Click "Iniciar registro"

**Resultado esperado:**
- ✅ Sidebar se cierra automáticamente
- ✅ Conversación SIRE visible en fullscreen
- ✅ Progress Bar responsive (ocupa ancho completo)
- ✅ Botón menú hamburguesa visible
- ✅ Input textarea adaptado a móvil

---

## Comandos de Testing

### 1. Build local (verificar TypeScript)
```bash
pnpm run build
```

### 2. Development server
```bash
pnpm run dev
```

### 3. Abrir portal guest
```
http://localhost:3000/demos/my-stay
```

### 4. Login credentials
```
Check-in date: [cualquier fecha futura]
Phone last 4: [últimos 4 dígitos de teléfono de reserva test]
```

---

## Criterios de Éxito

- ✅ Build completa sin errores TypeScript
- ✅ Botón "Iniciar registro" activa modo SIRE
- ✅ Nueva conversación SIRE creada correctamente
- ✅ Progress Bar visible y actualizado
- ✅ Mensaje de bienvenida + primera pregunta aparecen
- ✅ Progressive disclosure funciona (validación + siguiente pregunta)
- ✅ Cambio de conversación actualiza mode correctamente
- ✅ Sidebar móvil se cierra al iniciar SIRE
- ✅ Detección automática de conversación SIRE por título

---

## Notas Técnicas

### Mode Detection
```typescript
// Detección automática por título de conversación
const isSireConversation = selectedConversation?.title?.includes('SIRE')
setMode(isSireConversation ? 'sire' : 'general')
```

### SIRE Hook Conditional
```typescript
// Hook solo se instancia en modo SIRE (optimización)
const sireDisclosure = mode === 'sire' ? useSireProgressiveDisclosure() : null
```

### Welcome Message Trigger
```typescript
// useEffect dispara cuando:
// 1. mode === 'sire'
// 2. messages.length === 0 (conversación vacía)
// 3. sireDisclosure instanciado
// 4. activeConversationId existe
useEffect(() => {
  if (mode === 'sire' && messages.length === 0 && sireDisclosure && activeConversationId) {
    // Agregar mensaje de bienvenida + primera pregunta
  }
}, [mode, messages.length, sireDisclosure, activeConversationId])
```

---

## Troubleshooting

### Problema: Progress Bar no aparece
**Causa:** Mode no cambió a 'sire'
**Fix:** Verificar console logs en `handleStartSIREMode()`, verificar que `setMode('sire')` ejecute

### Problema: Mensaje de bienvenida no aparece
**Causa:** useEffect no dispara
**Fix:** Verificar dependencias de useEffect, verificar que `activeConversationId` esté seteado

### Problema: Validación no funciona
**Causa:** `sireDisclosure` es null
**Fix:** Verificar que `mode === 'sire'` antes de hook condicional

### Problema: ComplianceReminder no desaparece
**Causa:** Datos de reservation no se actualizan
**Fix:** Implementar fetch de reservation data desde DB (tarea futura)

---

**Status:** ✅ Implementación completa
**Build:** ✅ Exitoso (0 errores TypeScript)
**Testing pendiente:** Manual testing en browser

**Siguiente:** Tarea 1.6 - Auto-envío de datos SIRE capturados
