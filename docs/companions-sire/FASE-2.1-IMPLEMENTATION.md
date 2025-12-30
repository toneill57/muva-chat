# FASE 2.1: Frontend Guest Order Parameter - IMPLEMENTADO

**Fecha:** Diciembre 28, 2025
**Status:** ✅ COMPLETADO
**Duración:** ~25min

---

## Objetivo

Modificar `handleSendMessage` para incluir `guest_order` en todas las requests al backend durante flujo SIRE, permitiendo identificar qué huésped está registrando datos.

---

## Cambios Realizados

### 1. Envío de Mensajes SIRE (línea ~1003)

**Ubicación:** `src/components/Chat/GuestChatInterface.tsx`

**Antes:**
```typescript
if (mode === 'sire') {
  requestBody.mode = 'sire'
  requestBody.sireData = overrideSireData || sireDisclosure.sireData
}
```

**Después:**
```typescript
if (mode === 'sire') {
  requestBody.mode = 'sire'
  requestBody.sireData = overrideSireData || sireDisclosure.sireData
  requestBody.guest_order = guestOrder  // ✅ AGREGADO
}
```

---

### 2. Guardado Incremental (línea ~894)

**Ubicación:** `src/components/Chat/GuestChatInterface.tsx`

**Antes:**
```typescript
body: JSON.stringify({
  message: textToSend,
  conversation_id: activeConversationId,
  mode: 'sire',
  sireData: updatedSireData,
}),
```

**Después:**
```typescript
body: JSON.stringify({
  message: textToSend,
  conversation_id: activeConversationId,
  mode: 'sire',
  sireData: updatedSireData,
  guest_order: guestOrder,  // ✅ AGREGADO
}),
```

---

## Estado del Component

### Variables Relevantes

| Variable | Tipo | Valor Inicial | Uso |
|----------|------|---------------|-----|
| `guestOrder` | `number` | `1` | Identifica orden del huésped (1=titular, 2+=acompañantes) |
| `setGuestOrder` | `Dispatch<SetStateAction<number>>` | - | Incrementa al pasar a siguiente huésped |

**Inicialización (línea 197):**
```typescript
const [guestOrder, setGuestOrder] = useState(1)
```

**Incremento (línea 805):**
```typescript
content: `¡Perfecto! Vamos a registrar al huésped #${guestOrder + 1}.\n\n${firstQuestion}`
```

---

## Payload Enviado al Backend

### Estructura de Request

```json
{
  "message": "Juan Pérez",
  "conversation_id": "uuid-conversation",
  "mode": "sire",
  "guest_order": 1,
  "sireData": {
    "full_name": "Juan Pérez",
    "document_type_code": "1",
    "document_number": "12345678"
    // ... otros campos capturados
  }
}
```

### Validación

**✅ Criterios de Éxito:**
- Titular envía `guest_order: 1`
- Segundo huésped envía `guest_order: 2`
- `guest_order` presente en ambos tipos de envío (normal y guardado incremental)
- Build TypeScript exitoso sin errores

---

## Testing

### Script de Prueba

**Ubicación:** `scripts/test-guest-order-payload.sh`

**Uso:**
```bash
# Ejecutar test
./scripts/test-guest-order-payload.sh

# O con npm
pnpm test:guest-order-payload
```

**Flujo del Test:**
1. Obtener token de guest login
2. Enviar mensaje SIRE con `guest_order: 1` (titular)
3. Enviar mensaje SIRE con `guest_order: 2` (acompañante)
4. Verificar registros en `reservation_guests`

**Resultado Esperado:**
```sql
reservation_id | guest_order | full_name    | created_at
---------------|-------------|--------------|-------------------
uuid-xxx       | 1           | Juan Pérez   | 2025-12-28 10:00
uuid-xxx       | 2           | María García | 2025-12-28 10:01
```

---

## Verificación Manual (Browser DevTools)

### Network Tab

1. Abrir DevTools → Network
2. Filtrar por `/api/guest/chat`
3. Enviar mensaje en modo SIRE
4. Verificar payload:

```json
// Request Payload
{
  "message": "texto del usuario",
  "conversation_id": "...",
  "mode": "sire",
  "guest_order": 1,  // ✅ Debe aparecer aquí
  "sireData": { ... }
}
```

### Console Logs

```javascript
// En handleSendMessage, antes de fetch
console.log('[SIRE] Request payload:', requestBody)

// Verificar:
// requestBody.guest_order === guestOrder (número)
```

---

## Integración con Backend

### Backend Endpoint

**Ruta:** `/api/guest/chat/route.ts`

**Procesamiento:**
```typescript
// Backend recibe
const { message, mode, sireData, guest_order } = await req.json()

if (mode === 'sire' && sireData && guest_order) {
  // Guardar en reservation_guests con guest_order
  await saveGuestData(reservationId, guest_order, sireData)
}
```

**Tabla Destino:** `reservation_guests`

```sql
CREATE TABLE reservation_guests (
  id UUID PRIMARY KEY,
  reservation_id UUID REFERENCES reservations(id),
  guest_order INTEGER NOT NULL,  -- ✅ Usado aquí
  full_name TEXT,
  document_type_code TEXT,
  -- ... otros campos SIRE
  CONSTRAINT unique_reservation_guest_order
    UNIQUE (reservation_id, guest_order)
)
```

---

## Notas de Implementación

### Decisiones de Diseño

1. **guest_order siempre se envía en modo SIRE**
   - Simplifica lógica del backend (no necesita inferir orden)
   - Permite identificación explícita de cada huésped

2. **Valor por defecto: 1**
   - Primer huésped (titular) siempre es `guest_order: 1`
   - Acompañantes son 2, 3, 4...

3. **Mismo campo en ambos tipos de envío**
   - Guardado incremental (campo por campo)
   - Envío completo al finalizar
   - Backend puede usar el mismo handler

### Pendientes

- [ ] Implementar reset de `guestOrder` al cambiar de reservación
- [ ] Agregar validación de `guestOrder > 0`
- [ ] Implementar indicador visual de guest_order en UI (FASE 4)

---

## Referencias

- **Backend:** `src/app/api/guest/chat/route.ts`
- **Component:** `src/components/Chat/GuestChatInterface.tsx`
- **Database:** `supabase/migrations/20241127000000_create_reservation_guests.sql`
- **Fase Anterior:** `docs/companions-sire/FASE-1.3-IMPLEMENTACION.md`
- **Fase Siguiente:** `docs/companions-sire/FASE-2.2-cargar-datos-existentes.md`

---

## Build Status

```bash
$ pnpm run build
✓ Compiled successfully in 6.4s
✓ Type checking passed
✓ Linting skipped
✓ Build completed without errors
```

---

**Estado:** ✅ FASE 2.1 COMPLETADA
**Próximo Paso:** FASE 2.2 - Cargar datos existentes según guest_order
