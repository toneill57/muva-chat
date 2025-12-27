# FASE 1: Backend - Guardar Acompañantes

**Agente:** @agent-backend-developer
**Tareas:** 3
**Dependencias:** Ninguna (primera fase)

---

## 1.1 Agregar parametro guest_order al API /guest/chat

```
@agent-backend-developer

TAREA: Agregar parametro `guest_order` al endpoint POST /api/guest/chat

CONTEXTO:
- Archivo: src/app/api/guest/chat/route.ts
- Linea 97: Actualmente parsea { message, conversation_id, mode, sireData }
- El frontend ya tiene estado `guestOrder` (GuestChatInterface.tsx:197)
- Necesitamos recibir este parametro para saber cual huesped esta registrando datos

CAMBIOS REQUERIDOS:

1. Linea 97 - Agregar guest_order al destructuring:
const { message, conversation_id, mode, sireData, guest_order = 1 } = await request.json()

2. Despues de linea 104 - Validar guest_order:
// Validate guest_order
if (typeof guest_order !== 'number' || guest_order < 1 || !Number.isInteger(guest_order)) {
  return NextResponse.json(
    { error: 'guest_order must be a positive integer' },
    { status: 400 }
  )
}
console.log(`[Guest Chat] Guest order: ${guest_order}`)

3. Linea 609 (seccion request body docs) - Documentar nuevo parametro:
guest_order: 'number (optional, defaults to 1 - which guest is registering: 1=titular, 2+=companions)',

TEST:
- POST /api/guest/chat con body { message: "test", conversation_id: "xxx", guest_order: 2 }
- Verificar log muestra "Guest order: 2"
- POST con guest_order: 0 debe retornar 400
- POST sin guest_order debe usar default 1
```

---

## 1.2 Crear funcion upsert para reservation_guests

```
@agent-backend-developer

TAREA: Crear funcion para INSERT/UPDATE en tabla reservation_guests

CONTEXTO:
- Archivo: src/app/api/guest/chat/route.ts
- Tabla: reservation_guests (existe, migracion 20251205190819)
- Actualmente lineas 293-382 guardan en guest_reservations (solo titular)
- Necesitamos guardar en reservation_guests para TODOS los huespedes

ESQUEMA reservation_guests:
- id: uuid (PK)
- reservation_id: uuid (FK -> guest_reservations.id)
- guest_order: integer (1=titular, 2+=acompañantes)
- given_names, first_surname, second_surname: text
- document_type, document_number: text
- nationality_code, birth_date: text/date
- origin_city_code, destination_city_code: text
- UNIQUE(reservation_id, guest_order)

CAMBIOS REQUERIDOS:

1. Crear funcion helper (antes de POST handler, ~linea 45):

/**
 * Upserts guest SIRE data to reservation_guests table
 * For guest_order=1, also updates guest_reservations for backwards compatibility
 */
async function upsertGuestSireData(
  supabase: any,
  reservationId: string,
  guestOrder: number,
  sireData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const dbData: Record<string, any> = {
      reservation_id: reservationId,
      guest_order: guestOrder,
    }

    // Map extracted fields
    if (sireData.names || sireData.nombres) {
      dbData.given_names = sireData.names || sireData.nombres
    }
    if (sireData.first_surname || sireData.primer_apellido) {
      dbData.first_surname = sireData.first_surname || sireData.primer_apellido
    }
    if (sireData.second_surname !== undefined || sireData.segundo_apellido !== undefined) {
      dbData.second_surname = sireData.second_surname ?? sireData.segundo_apellido ?? null
    }
    if (sireData.document_type_code || sireData.tipo_documento) {
      dbData.document_type = sireData.document_type_code || sireData.tipo_documento
    }
    if (sireData.identification_number || sireData.documento_numero) {
      dbData.document_number = sireData.identification_number || sireData.documento_numero
    }
    if (sireData.nationality_code || sireData.codigo_nacionalidad) {
      dbData.nationality_code = sireData.nationality_code || sireData.codigo_nacionalidad
    }
    if (sireData.birth_date || sireData.fecha_nacimiento) {
      const birthDate = sireData.birth_date || sireData.fecha_nacimiento
      if (birthDate.includes('/')) {
        const [d, m, y] = birthDate.split('/')
        dbData.birth_date = `${y}-${m}-${d}`
      } else {
        dbData.birth_date = birthDate
      }
    }
    if (sireData.origin_place || sireData.lugar_procedencia) {
      dbData.origin_city_code = sireData.origin_place || sireData.lugar_procedencia
    }
    if (sireData.destination_place || sireData.lugar_destino) {
      dbData.destination_city_code = sireData.destination_place || sireData.lugar_destino
    }

    // Upsert to reservation_guests
    const { error: upsertError } = await supabase
      .from('reservation_guests')
      .upsert(dbData, {
        onConflict: 'reservation_id,guest_order',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('[Guest Chat] Failed to upsert reservation_guests:', upsertError)
      return { success: false, error: upsertError.message }
    }

    console.log(`[Guest Chat] Upserted guest ${guestOrder} data to reservation_guests`)

    // For guest_order=1, also update guest_reservations for backwards compatibility
    if (guestOrder === 1) {
      const guestResData: Record<string, any> = {}
      if (dbData.given_names) guestResData.given_names = dbData.given_names
      if (dbData.first_surname) guestResData.first_surname = dbData.first_surname
      if (dbData.second_surname !== undefined) guestResData.second_surname = dbData.second_surname
      if (dbData.document_type) guestResData.document_type = dbData.document_type
      if (dbData.document_number) guestResData.document_number = dbData.document_number
      if (dbData.nationality_code) guestResData.nationality_code = dbData.nationality_code
      if (dbData.birth_date) guestResData.birth_date = dbData.birth_date
      if (dbData.origin_city_code) guestResData.origin_city_code = dbData.origin_city_code
      if (dbData.destination_city_code) guestResData.destination_city_code = dbData.destination_city_code

      if (Object.keys(guestResData).length > 0) {
        await supabase
          .from('guest_reservations')
          .update(guestResData)
          .eq('id', reservationId)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[Guest Chat] Error in upsertGuestSireData:', err)
    return { success: false, error: String(err) }
  }
}

2. Modificar guardado incremental (~linea 295):
// En lugar del UPDATE directo a guest_reservations:
await upsertGuestSireData(supabase, session.reservation_id, guest_order, extractedData)

3. Modificar guardado completo (~linea 387):
// En lugar del UPDATE directo a guest_reservations:
await upsertGuestSireData(supabase, session.reservation_id, guest_order, mergedSireData)

TEST:
- Registrar titular (guest_order=1) -> verificar datos en AMBAS tablas
- Registrar acompañante (guest_order=2) -> verificar datos SOLO en reservation_guests
- SELECT * FROM reservation_guests WHERE reservation_id = 'xxx' ORDER BY guest_order
```

---

## 1.3 Modificar /reservation-sire-data para leer por guest_order

```
@agent-backend-developer

TAREA: Agregar parametro guest_order a GET /api/guest/reservation-sire-data

CONTEXTO:
- Archivo: src/app/api/guest/reservation-sire-data/route.ts
- Actualmente lee de guest_reservations (solo titular)
- Necesitamos leer de reservation_guests segun guest_order

CAMBIOS REQUERIDOS:

1. Parsear guest_order del query string:
export async function GET(request: NextRequest) {
  // ... auth code existente ...

  const url = new URL(request.url)
  const guestOrder = parseInt(url.searchParams.get('guest_order') || '1', 10)

  console.log(`[reservation-sire-data] Loading data for guest_order: ${guestOrder}`)

2. Logica condicional de lectura:
let sireData: Record<string, string> = {}

if (guestOrder === 1) {
  // For titular, read from guest_reservations (backwards compatibility)
  const { data: reservationData } = await supabase
    .from('guest_reservations')
    .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
    .eq('id', session.reservation_id)
    .single()

  if (reservationData) {
    if (reservationData.given_names) sireData.names = reservationData.given_names
    if (reservationData.first_surname) sireData.first_surname = reservationData.first_surname
    if (reservationData.second_surname) sireData.second_surname = reservationData.second_surname
    if (reservationData.document_type) sireData.document_type_code = reservationData.document_type
    if (reservationData.document_number) sireData.identification_number = reservationData.document_number
    if (reservationData.nationality_code) sireData.nationality_code = reservationData.nationality_code
    if (reservationData.birth_date) {
      const [y, m, d] = reservationData.birth_date.split('-')
      sireData.birth_date = `${d}/${m}/${y}`
    }
    if (reservationData.origin_city_code) sireData.origin_place = reservationData.origin_city_code
    if (reservationData.destination_city_code) sireData.destination_place = reservationData.destination_city_code
  }
} else {
  // For companions (guest_order > 1), read from reservation_guests
  const { data: guestData } = await supabase
    .from('reservation_guests')
    .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
    .eq('reservation_id', session.reservation_id)
    .eq('guest_order', guestOrder)
    .single()

  if (guestData) {
    // Same mapping as above...
    if (guestData.given_names) sireData.names = guestData.given_names
    // ... etc
  }
}

return NextResponse.json({ sireData })

TEST:
- GET /api/guest/reservation-sire-data (sin param) -> datos del titular
- GET /api/guest/reservation-sire-data?guest_order=1 -> datos del titular
- GET /api/guest/reservation-sire-data?guest_order=2 -> datos del acompañante #2
```

---

## Checklist

- [ ] 1.1 Agregar guest_order al API /guest/chat
- [ ] 1.2 Crear funcion upsertGuestSireData
- [ ] 1.3 Modificar /reservation-sire-data para leer por guest_order

**Siguiente:** FASE-2-frontend-guest-order.md
