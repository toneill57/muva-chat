# FASE 2: Frontend Guest - Enviar guest_order

**Agente:** @agent-ux-interface
**Tareas:** 2
**Dependencias:** FASE 1 completada

---

## 2.1 Enviar guest_order en requests de chat

```
@agent-ux-interface

TAREA: Modificar handleSendMessage para enviar guest_order al backend

CONTEXTO:
- Archivo: src/components/Chat/GuestChatInterface.tsx
- Estado guestOrder existe en linea 197: const [guestOrder, setGuestOrder] = useState(1)
- handleSendMessage esta en linea 736
- El payload se construye en lineas 993-1003

CAMBIOS REQUERIDOS:

1. Linea 993-1003 - Agregar guest_order al requestBody:

const requestBody: any = {
  message: textToSend,
  conversation_id: activeConversationId,
}

// Si estamos en modo SIRE, incluir los datos capturados Y guest_order
if (mode === 'sire') {
  requestBody.mode = 'sire'
  requestBody.sireData = overrideSireData || sireDisclosure.sireData
  requestBody.guest_order = guestOrder  // <-- AGREGAR ESTA LINEA
}

2. Tambien en la llamada de guardado incremental (~linea 882-899):

await fetch('/api/guest/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    message: textToSend,
    conversation_id: activeConversationId,
    mode: 'sire',
    sireData: updatedSireData,
    guest_order: guestOrder,  // <-- AGREGAR ESTA LINEA
  }),
})

TEST:
- Abrir DevTools > Network
- Iniciar registro SIRE
- Responder primera pregunta
- Verificar que el payload incluye "guest_order": 1
- Completar registro del titular
- Responder "si" para registrar otro huesped
- Verificar que el payload ahora incluye "guest_order": 2
```

---

## 2.2 Cargar datos existentes segun guest_order

```
@agent-ux-interface

TAREA: Modificar handleStartSIREMode para cargar datos del huesped actual

CONTEXTO:
- Archivo: src/components/Chat/GuestChatInterface.tsx
- handleStartSIREMode esta en linea 514
- Actualmente llama a /api/guest/reservation-sire-data sin guest_order (linea 531)
- Cuando el usuario reinicia registro de acompañante, debe cargar sus datos

CAMBIOS REQUERIDOS:

1. Modificar la llamada a reservation-sire-data (~linea 531):

// 2. Fetch existing SIRE data from reservation (CRITICAL for sync)
const reservationResponse = await fetch(
  `/api/guest/reservation-sire-data?guest_order=${guestOrder}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
)

2. Agregar funcion para cargar datos al cambiar de huesped (despues de handleStartSIREMode):

/**
 * Loads existing SIRE data for the current guest (used when resuming registration)
 */
const loadGuestSireData = async (guestOrderToLoad: number) => {
  try {
    const response = await fetch(
      `/api/guest/reservation-sire-data?guest_order=${guestOrderToLoad}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.sireData && Object.keys(data.sireData).length > 0) {
        console.log(`[SIRE] Loaded existing data for guest ${guestOrderToLoad}:`, Object.keys(data.sireData))
        sireDisclosure.setAllFields({
          ...sireDisclosure.sireData,  // Keep auto-filled fields
          ...data.sireData
        })
      }
    }
  } catch (err) {
    console.error('[SIRE] Failed to load guest data:', err)
  }
}

3. Llamar loadGuestSireData cuando se inicia registro de nuevo huesped (~linea 790):

if (isAffirmative) {
  // User wants to register another guest
  awaitingAdditionalGuestRef.current = false
  setAwaitingAdditionalGuestResponse(false)
  const newGuestOrder = guestOrder + 1
  setGuestOrder(newGuestOrder)

  // Reset SIRE disclosure keeping auto-filled fields
  sireDisclosure.reset({
    hotel_code: sireDisclosure.sireData.hotel_code,
    city_code: sireDisclosure.sireData.city_code,
    movement_type: sireDisclosure.sireData.movement_type,
    movement_date: sireDisclosure.sireData.movement_date,
  })

  // Try to load existing data for this guest (if resuming)
  await loadGuestSireData(newGuestOrder)  // <-- AGREGAR

  // Get first question for new guest
  const firstField = getNextFieldToAsk({
    hotel_code: sireDisclosure.sireData.hotel_code,
    // ... resto del codigo existente
  })

  // ... resto del codigo existente
}

TEST:
- Registrar huesped #1 hasta la mitad
- Cerrar sesion
- Volver a entrar
- Iniciar registro SIRE
- Verificar que los datos del titular se cargan automaticamente
- Completar registro del titular
- Registrar huesped #2 hasta la mitad
- Refresh de pagina
- Iniciar nuevo registro SIRE, responder "si" para acompañante
- Verificar que los datos del acompañante #2 se cargan
```

---

## Checklist

- [ ] 2.1 Enviar guest_order en requests de chat
- [ ] 2.2 Cargar datos existentes segun guest_order

**Anterior:** FASE-1-backend-guardar.md
**Siguiente:** FASE-3-ui-tarjetas-compactas.md
