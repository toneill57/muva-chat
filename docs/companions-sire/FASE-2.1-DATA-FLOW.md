# FASE 2.1: Data Flow - guest_order Parameter

**Fecha:** Diciembre 28, 2025

---

## Flujo de Datos: Frontend → Backend → Database

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENT                            │
│                GuestChatInterface.tsx                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ State: guestOrder = 1
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   handleSendMessage()                            │
│                                                                  │
│  1. Construir requestBody:                                       │
│     {                                                            │
│       message: "Juan Pérez",                                     │
│       conversation_id: "uuid-xxx",                               │
│       mode: "sire",                                              │
│       guest_order: 1,  ◄──── ✅ AGREGADO EN FASE 2.1             │
│       sireData: { full_name: "Juan Pérez", ... }                 │
│     }                                                            │
│                                                                  │
│  2. Enviar fetch() a /api/guest/chat                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              │ Authorization: Bearer <token>
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND ENDPOINT                            │
│              /api/guest/chat/route.ts                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Extraer params
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  const {                                                         │
│    message,                                                      │
│    mode,                                                         │
│    sireData,                                                     │
│    guest_order  ◄──── ✅ RECIBIDO DEL FRONTEND                   │
│  } = await req.json()                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Validar mode === 'sire'
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Guardar en reservation_guests                       │
│                                                                  │
│  INSERT INTO reservation_guests (                                │
│    reservation_id,                                               │
│    guest_order,     ◄──── ✅ USADO PARA IDENTIFICAR HUÉSPED      │
│    full_name,                                                    │
│    document_type_code,                                           │
│    ...                                                           │
│  ) VALUES (...)                                                  │
│  ON CONFLICT (reservation_id, guest_order)                       │
│  DO UPDATE SET ...                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
│                   reservation_guests                             │
│                                                                  │
│  reservation_id | guest_order | full_name    | ...              │
│  ---------------|-------------|--------------|-----              │
│  uuid-xxx       | 1           | Juan Pérez   | ...              │
│  uuid-xxx       | 2           | María García | ...              │
│  uuid-yyy       | 1           | Carlos López | ...              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secuencia de Eventos: Registro de 2 Huéspedes

```
FRONTEND STATE          USER ACTION              PAYLOAD SENT              DATABASE
═══════════════════════════════════════════════════════════════════════════════

guestOrder = 1          Usuario entra a /my-stay

                        ↓

                        Sistema detecta 2 huéspedes
                        Muestra formulario SIRE

                        ↓

                        Usuario escribe "Juan Pérez"  {
                                                        guest_order: 1,
                                                        sireData: {
                                                          full_name: "Juan..."
                                                        }
                                                      }

                                                      ↓                       [TITULAR]
                                                                              guest_order: 1
                                                                              full_name: Juan Pérez

                        ↓

                        Usuario escribe "1"           {
                        (tipo documento)                guest_order: 1,
                                                        sireData: {
                                                          full_name: "Juan...",
                                                          document_type: "1"
                                                        }
                                                      }

                                                      ↓                       [TITULAR - UPDATE]
                                                                              guest_order: 1
                                                                              full_name: Juan Pérez
                                                                              document_type_code: 1

                        ... (continúa capturando campos)

                        ↓

guestOrder = 2          Sistema detecta campos completos
(incrementado)          Pregunta por siguiente huésped

                        ↓

                        Usuario escribe "María García" {
                                                         guest_order: 2,
                                                         sireData: {
                                                           full_name: "María..."
                                                         }
                                                       }

                                                       ↓                      [ACOMPAÑANTE]
                                                                              guest_order: 2
                                                                              full_name: María García

                        ↓

                        Usuario escribe "1"           {
                        (tipo documento)                guest_order: 2,
                                                        sireData: {
                                                          full_name: "María...",
                                                          document_type: "1"
                                                        }
                                                      }

                                                      ↓                       [ACOMPAÑANTE - UPDATE]
                                                                              guest_order: 2
                                                                              full_name: María García
                                                                              document_type_code: 1

                        ... (continúa hasta completar todos)
```

---

## Diagrama de Constraint: UNIQUE (reservation_id, guest_order)

```sql
reservation_guests
═══════════════════════════════════════════════════════════════

CONSTRAINT: UNIQUE (reservation_id, guest_order)

┌──────────────────┬──────────────┬──────────────┐
│  reservation_id  │ guest_order  │  full_name   │
├──────────────────┼──────────────┼──────────────┤
│  abc-123         │      1       │ Juan Pérez   │  ✅ OK
│  abc-123         │      2       │ María García │  ✅ OK
│  abc-123         │      1       │ Juan Updated │  ❌ CONFLICT → UPDATE
│  def-456         │      1       │ Carlos López │  ✅ OK (diferente reserva)
└──────────────────┴──────────────┴──────────────┘

Lógica de UPSERT:
- Si existe (reservation_id, guest_order) → UPDATE campos
- Si NO existe → INSERT nuevo registro
```

---

## Casos de Uso

### Caso 1: Registro Inicial (Titular)

```
REQUEST:
{
  "guest_order": 1,
  "sireData": { "full_name": "Juan Pérez" }
}

SQL EJECUTADO:
INSERT INTO reservation_guests (reservation_id, guest_order, full_name)
VALUES ('abc-123', 1, 'Juan Pérez')
ON CONFLICT (reservation_id, guest_order)
DO UPDATE SET full_name = EXCLUDED.full_name

RESULTADO:
1 fila insertada
```

---

### Caso 2: Actualización Incremental (Mismo Huésped)

```
REQUEST:
{
  "guest_order": 1,
  "sireData": {
    "full_name": "Juan Pérez",
    "document_type_code": "1"
  }
}

SQL EJECUTADO:
INSERT INTO reservation_guests (reservation_id, guest_order, full_name, document_type_code)
VALUES ('abc-123', 1, 'Juan Pérez', '1')
ON CONFLICT (reservation_id, guest_order)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  document_type_code = EXCLUDED.document_type_code

RESULTADO:
1 fila actualizada (NO se duplica)
```

---

### Caso 3: Segundo Huésped (Acompañante)

```
REQUEST:
{
  "guest_order": 2,
  "sireData": { "full_name": "María García" }
}

SQL EJECUTADO:
INSERT INTO reservation_guests (reservation_id, guest_order, full_name)
VALUES ('abc-123', 2, 'María García')
ON CONFLICT (reservation_id, guest_order)
DO UPDATE SET full_name = EXCLUDED.full_name

RESULTADO:
1 fila insertada (nuevo registro)
```

---

## Comparación: Antes vs Después

### ANTES de FASE 2.1

```json
// ❌ Backend no sabía a qué huésped pertenecían los datos
{
  "message": "Juan Pérez",
  "mode": "sire",
  "sireData": { "full_name": "Juan Pérez" }
}

// ❌ Backend guardaba en reservation (no en reservation_guests)
// ❌ NO soportaba múltiples huéspedes
```

### DESPUÉS de FASE 2.1

```json
// ✅ Backend sabe exactamente qué huésped está registrando
{
  "message": "Juan Pérez",
  "mode": "sire",
  "guest_order": 1,  // ◄── Identificación explícita
  "sireData": { "full_name": "Juan Pérez" }
}

// ✅ Backend guarda en reservation_guests con guest_order
// ✅ Soporte completo para múltiples huéspedes
// ✅ Cada huésped tiene su propio registro independiente
```

---

## Testing Checkpoints

### 1. Verificar Payload en Network Tab

```javascript
// DevTools → Network → /api/guest/chat → Payload
{
  "guest_order": 1,  // ✅ Debe estar presente
  "sireData": { ... }
}
```

### 2. Verificar Logs del Backend

```bash
# Agregar log temporal en /api/guest/chat/route.ts
console.log('[SIRE] Received guest_order:', guest_order)

# Output esperado:
# [SIRE] Received guest_order: 1  (titular)
# [SIRE] Received guest_order: 2  (acompañante)
```

### 3. Verificar Database

```sql
-- Query de verificación
SELECT
  reservation_id,
  guest_order,
  full_name,
  document_type_code,
  created_at
FROM reservation_guests
WHERE reservation_id = '<reservation-uuid>'
ORDER BY guest_order;

-- Resultado esperado:
-- guest_order | full_name    | created_at
-- 1           | Juan Pérez   | 2025-12-28 10:00
-- 2           | María García | 2025-12-28 10:05
```

---

## Referencias Técnicas

### Estado del Component

```typescript
// GuestChatInterface.tsx - línea 197
const [guestOrder, setGuestOrder] = useState(1)
```

### Construcción del Payload

```typescript
// GuestChatInterface.tsx - línea 998-1004
if (mode === 'sire') {
  requestBody.mode = 'sire'
  requestBody.sireData = overrideSireData || sireDisclosure.sireData
  requestBody.guest_order = guestOrder  // ◄── Agregado en FASE 2.1
}
```

### Guardado Incremental

```typescript
// GuestChatInterface.tsx - línea 889-895
body: JSON.stringify({
  message: textToSend,
  conversation_id: activeConversationId,
  mode: 'sire',
  sireData: updatedSireData,
  guest_order: guestOrder,  // ◄── Agregado en FASE 2.1
}),
```

---

**Status:** ✅ IMPLEMENTADO
**Próximo Paso:** FASE 2.2 - Cargar datos existentes según guest_order al iniciar chat
