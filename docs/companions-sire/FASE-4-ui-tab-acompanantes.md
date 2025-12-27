# FASE 4: UI Staff - Tab Acompañantes

**Agentes:** @agent-backend-developer (4.1) + @agent-ux-interface (4.2, 4.3, 4.4)
**Tareas:** 4
**Dependencias:** FASE 1 completada (datos en reservation_guests)

---

## 4.1 Modificar API /reservations/list para incluir acompañantes

```
@agent-backend-developer

TAREA: Agregar array de guests al response de /api/reservations/list

CONTEXTO:
- Archivo: src/app/api/reservations/list/route.ts
- Actualmente devuelve datos del titular en cada reserva
- Necesitamos incluir array `guests` con todos los huespedes de reservation_guests

CAMBIOS REQUERIDOS:

1. Agregar interface para guest (despues de linea 70):

interface ReservationGuest {
  guest_order: number
  given_names: string | null
  first_surname: string | null
  second_surname: string | null
  document_type: string | null
  document_number: string | null
  nationality_code: string | null
  birth_date: string | null
  origin_city_code: string | null
  destination_city_code: string | null
  sire_complete: boolean  // calculated field
}

2. Agregar campos a ReservationListItem interface (despues de hotel_city_code):

guests: ReservationGuest[]
total_guests: number
registered_guests: number

3. Despues de obtener reservations (~linea 200), hacer query a reservation_guests:

// Get all guests for these reservations
const guestsMap = new Map<string, ReservationGuest[]>()

if (reservationIds.length > 0) {
  const { data: guestsData, error: guestsError } = await supabase
    .from('reservation_guests')
    .select('reservation_id, guest_order, given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
    .in('reservation_id', reservationIds)
    .order('guest_order', { ascending: true })

  if (!guestsError && guestsData) {
    guestsData.forEach((guest: any) => {
      if (!guestsMap.has(guest.reservation_id)) {
        guestsMap.set(guest.reservation_id, [])
      }

      // Calculate if SIRE is complete for this guest
      const sireComplete = !!(
        guest.document_type &&
        guest.document_number &&
        guest.first_surname &&
        guest.given_names &&
        guest.birth_date &&
        guest.nationality_code &&
        guest.origin_city_code &&
        guest.destination_city_code
      )

      guestsMap.get(guest.reservation_id)!.push({
        guest_order: guest.guest_order,
        given_names: guest.given_names,
        first_surname: guest.first_surname,
        second_surname: guest.second_surname,
        document_type: guest.document_type,
        document_number: guest.document_number,
        nationality_code: guest.nationality_code,
        birth_date: guest.birth_date,
        origin_city_code: guest.origin_city_code,
        destination_city_code: guest.destination_city_code,
        sire_complete: sireComplete
      })
    })
    console.log('[reservations-list] Loaded guests for', guestsMap.size, 'reservations')
  }
}

4. En el mapeo de reservations (~linea 300), agregar guests:

const guests = guestsMap.get(res.id) || []
const totalGuests = res.adults || 1  // Expected from booking
const registeredGuests = guests.filter(g => g.sire_complete).length

return {
  // ... existing fields ...
  guests,
  total_guests: totalGuests,
  registered_guests: registeredGuests,
}

TEST:
- GET /api/reservations/list
- Verificar que response incluye array `guests` para cada reserva
- Verificar campos total_guests y registered_guests
- Reserva con 3 huespedes debe mostrar guests.length = 3
```

---

## 4.2 Implementar sistema de tabs en tarjeta

```
@agent-ux-interface

TAREA: Agregar tabs "Titular" y "Acompañantes" a UnifiedReservationCard

CONTEXTO:
- Archivo: src/components/reservations/UnifiedReservationCard.tsx
- Necesitamos tabs para separar datos del titular vs acompañantes
- Interface debe incluir nuevo campo `guests`

CAMBIOS REQUERIDOS:

1. Agregar interface Guest y actualizar UnifiedReservation (~linea 32):

interface Guest {
  guest_order: number
  given_names: string | null
  first_surname: string | null
  second_surname: string | null
  document_type: string | null
  document_number: string | null
  nationality_code: string | null
  birth_date: string | null
  origin_city_code: string | null
  destination_city_code: string | null
  sire_complete: boolean
}

interface UnifiedReservation {
  // ... existing fields ...
  guests?: Guest[]
  total_guests?: number
  registered_guests?: number
}

2. Agregar estado para tab activo (~linea 332):

const [activeTab, setActiveTab] = useState<'titular' | 'companions'>('titular')

3. Agregar tabs antes de la seccion SIRE (~linea 612):

{/* Guest Tabs (only show if there are companions) */}
{reservation.guests && reservation.guests.length > 1 && (
  <div className="border-t border-slate-200 pt-4 mb-4">
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setActiveTab('titular')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeTab === 'titular'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Titular
      </button>
      <button
        onClick={() => setActiveTab('companions')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeTab === 'companions'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Acompañantes ({reservation.guests.length - 1})
      </button>
    </div>

    {/* Tab Content - se implementa en tarea 4.3 */}
    {activeTab === 'companions' && (
      <CompanionsList guests={reservation.guests.filter(g => g.guest_order > 1)} />
    )}
  </div>
)}

TEST:
- Tarjeta con 1 huesped: NO debe mostrar tabs
- Tarjeta con 3 huespedes: debe mostrar tabs
- Tab activo cambia correctamente al hacer click
```

---

## 4.3 Crear componente CompanionsList

```
@agent-ux-interface

TAREA: Crear componente para mostrar lista de acompañantes

CONTEXTO:
- Archivo: src/components/reservations/UnifiedReservationCard.tsx
- Ya tenemos tabs implementados (tarea 4.2)
- Necesitamos el componente que muestra los acompañantes

CAMBIOS REQUERIDOS:

1. Crear componente CompanionsList (antes del componente principal):

function CompanionsList({ guests }: { guests: Guest[] }) {
  if (guests.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No hay acompañantes registrados</p>
    )
  }

  return (
    <div className="space-y-3">
      {guests.map((guest) => (
        <div
          key={guest.guest_order}
          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">
              {guest.given_names || 'Sin nombre'} {guest.first_surname || ''}
              {guest.second_surname ? ` ${guest.second_surname}` : ''}
            </span>
            {guest.sire_complete ? (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                SIRE Completo
              </span>
            ) : (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                SIRE Pendiente
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Doc: {guest.document_type || 'N/A'} {guest.document_number || ''}</div>
            <div>Nacionalidad: {guest.nationality_code || 'N/A'}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

TEST:
- Click en "Acompañantes": debe mostrar lista de acompañantes
- Cada acompañante debe mostrar nombre completo
- Cada acompañante debe mostrar badge de estado SIRE (verde/amarillo)
- Cada acompañante debe mostrar tipo y numero de documento
- Lista vacia debe mostrar mensaje "No hay acompañantes registrados"
```

---

## 4.4 Agregar badge de contador de huespedes

```
@agent-ux-interface

TAREA: Agregar badge "X/Y huespedes registrados" a la tarjeta

CONTEXTO:
- Archivo: src/components/reservations/UnifiedReservationCard.tsx
- Ya tenemos registered_guests y total_guests del API
- Mostrar junto a los otros badges en la parte superior derecha

CAMBIOS REQUERIDOS:

1. Calcular estado de huespedes (~linea 358):

// Guest registration status
const totalGuests = reservation.total_guests || reservation.adults || 1
const registeredGuests = reservation.registered_guests || 0
const allGuestsRegistered = registeredGuests >= totalGuests

2. Agregar badge en la columna de badges (~linea 492, despues del badge SIRE):

{/* Guests Registration Badge */}
{totalGuests > 0 && (
  <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
    allGuestsRegistered
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }`}>
    <Users className="w-3 h-3" />
    {registeredGuests}/{totalGuests} huespedes
  </div>
)}

TEST:
- Reserva con 1 adulto, 0 registrados: "0/1 huespedes" (amarillo)
- Reserva con 3 adultos, 2 registrados: "2/3 huespedes" (amarillo)
- Reserva con 2 adultos, 2 registrados: "2/2 huespedes" (verde)
```

---

## Checklist

- [ ] 4.1 Modificar API /reservations/list para incluir acompañantes
- [ ] 4.2 Implementar sistema de tabs en tarjeta
- [ ] 4.3 Crear componente CompanionsList
- [ ] 4.4 Agregar badge de contador de huespedes

**Anterior:** FASE-3-ui-tarjetas-compactas.md
**Siguiente:** FASE-5-sire-export-multi.md
