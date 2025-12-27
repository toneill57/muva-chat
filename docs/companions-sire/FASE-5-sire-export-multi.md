# FASE 5: SIRE Export Multi-Huesped

**Agente:** @agent-backend-developer
**Tareas:** 3
**Dependencias:** FASE 1 completada (datos en reservation_guests)

---

## 5.1 Modificar query de export para leer reservation_guests

```
@agent-backend-developer

TAREA: Cambiar query de generate-txt para leer de reservation_guests

CONTEXTO:
- Archivo: src/app/api/sire/generate-txt/route.ts
- Actualmente linea 100 hace SELECT de guest_reservations
- Necesitamos leer de reservation_guests para obtener TODOS los huespedes

CAMBIOS REQUERIDOS:

1. Crear nuevo query que hace JOIN (~linea 100):

// Query reservations with all guests
let query = supabase
  .from('reservation_guests')
  .select(`
    *,
    reservation:guest_reservations!inner(
      id,
      tenant_id,
      check_in_date,
      check_out_date,
      hotel_sire_code,
      hotel_city_code,
      status
    )
  `)
  .eq('reservation.tenant_id', tenant_id)
  .neq('nationality_code', COLOMBIA_SIRE_CODE) // Exclude Colombians
  .in('reservation.status', ['active', 'confirmed', 'pending_payment'])

2. Ajustar filtros de fecha para usar la relacion:

if (test_mode || movement_type === 'both') {
  if (date) {
    query = query.or(`reservation.check_in_date.eq.${date},reservation.check_out_date.eq.${date}`)
  }
} else if (movement_type === 'E') {
  if (date) {
    query = query.eq('reservation.check_in_date', date)
  } else if (date_from || date_to) {
    if (date_from) query = query.gte('reservation.check_in_date', date_from)
    if (date_to) query = query.lte('reservation.check_in_date', date_to)
  }
} else if (movement_type === 'S') {
  if (date) {
    query = query.eq('reservation.check_out_date', date)
  } else if (date_from || date_to) {
    if (date_from) query = query.gte('reservation.check_out_date', date_from)
    if (date_to) query = query.lte('reservation.check_out_date', date_to)
  }
}

const { data: guests, error: queryError } = await query

3. Modificar el loop de procesamiento (~linea 170):

for (const guest of guests) {
  const reservation = guest.reservation

  // Validate that reservation has hotel codes
  if (!reservation.hotel_sire_code || !reservation.hotel_city_code) {
    excluded.push({
      reservation_id: reservation.id,
      guest_name: guest.given_names ? `${guest.given_names} ${guest.first_surname}` : 'Unknown',
      reason: 'Missing hotel_sire_code or hotel_city_code'
    })
    continue
  }

  const guestName = guest.given_names
    ? `${guest.given_names} ${guest.first_surname}`
    : 'Unknown'

  if (generateBothEvents) {
    // Generate E (Entrada) event
    if (reservation.check_in_date) {
      const sireDataE = mapGuestToSIRE(guest, reservation, 'E')
      if (sireDataE) {
        sireGuests.push(sireDataE)
      } else {
        excluded.push({
          reservation_id: reservation.id,
          guest_name: guestName,
          reason: 'Missing required SIRE fields for E event'
        })
      }
    }

    // Generate S (Salida) event
    if (reservation.check_out_date) {
      const sireDataS = mapGuestToSIRE(guest, reservation, 'S')
      if (sireDataS) {
        sireGuests.push(sireDataS)
      }
    }
  } else {
    const sireData = mapGuestToSIRE(guest, reservation, movement_type as 'E' | 'S')
    if (sireData) {
      sireGuests.push(sireData)
    }
  }
}

TEST:
- Reserva con 1 huesped extranjero -> 2 lineas (E + S)
- Reserva con 3 huespedes extranjeros -> 6 lineas (3 E + 3 S)
- Reserva con 2 extranjeros + 1 colombiano -> 4 lineas (solo extranjeros)
```

---

## 5.2 Crear funcion mapGuestToSIRE

```
@agent-backend-developer

TAREA: Crear funcion mapGuestToSIRE para generar datos desde reservation_guests

CONTEXTO:
- Archivo: src/lib/sire/sire-txt-generator.ts
- Actualmente mapReservationToSIRE espera datos de guest_reservations
- Necesitamos nueva funcion que reciba datos de reservation_guests + reservation

CAMBIOS REQUERIDOS:

1. Agregar interfaces para guest data:

interface ReservationGuestData {
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
}

interface ReservationMetadata {
  id: string
  check_in_date: string
  check_out_date: string
  hotel_sire_code: string
  hotel_city_code: string
}

2. Crear funcion mapGuestToSIRE:

export function mapGuestToSIRE(
  guest: ReservationGuestData,
  reservation: ReservationMetadata,
  movementType: 'E' | 'S'
): SIREGuestData | null {
  // Validate required fields
  if (!guest.document_number || !guest.first_surname || !guest.given_names) {
    console.warn(`[SIRE] Guest ${guest.guest_order} missing required fields:`, {
      hasDocNumber: !!guest.document_number,
      hasFirstSurname: !!guest.first_surname,
      hasGivenNames: !!guest.given_names
    })
    return null
  }

  // Determine movement date based on type
  const movementDate = movementType === 'E'
    ? reservation.check_in_date
    : reservation.check_out_date

  // Format date for SIRE (DD/MM/YYYY)
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return ''
    if (dateStr.includes('/')) return dateStr
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  }

  return {
    // Document
    tipoDocumento: guest.document_type || '3',
    numeroDocumento: guest.document_number,

    // Names
    primerApellido: guest.first_surname,
    segundoApellido: guest.second_surname || '',
    nombres: guest.given_names,

    // Personal
    fechaNacimiento: formatDate(guest.birth_date || ''),
    nacionalidad: guest.nationality_code || '',

    // Travel
    paisProcedencia: guest.origin_city_code || '',
    paisDestino: guest.destination_city_code || '',

    // Hotel
    codigoHotel: reservation.hotel_sire_code,
    ciudadHotel: reservation.hotel_city_code,

    // Movement
    tipoMovimiento: movementType,
    fechaMovimiento: formatDate(movementDate),
  }
}

3. Exportar la funcion en el archivo

TEST:
- Generar TXT para dia con 2 reservas (3 huespedes c/u)
- Verificar que genera 12 lineas (6 por reserva: 3 E + 3 S)
- Verificar que cada linea tiene datos correctos del huesped correspondiente
- Verificar formato de fechas DD/MM/YYYY
```

---

## 5.3 Actualizar contadores y respuesta

```
@agent-backend-developer

TAREA: Ajustar contadores en response de generate-txt

CONTEXTO:
- Archivo: src/app/api/sire/generate-txt/route.ts
- Actualmente guest_count cuenta reservas, no huespedes
- Necesitamos mostrar desglose correcto

CAMBIOS REQUERIDOS:

1. Calcular estadisticas antes del return (~linea 280):

// Calculate statistics
const uniqueGuests = new Set(
  sireGuests.map(g => `${g.numeroDocumento}-${g.primerApellido}`)
)
const uniqueReservationIds = new Set(
  guests.map((g: any) => g.reservation.id)
)
const entryCount = sireGuests.filter(g => g.tipoMovimiento === 'E').length
const exitCount = sireGuests.filter(g => g.tipoMovimiento === 'S').length

2. Actualizar el response (~linea 288):

return NextResponse.json({
  success: true,
  txt_content: result.content,
  filename: result.filename,

  // Counts
  line_count: result.lineCount,
  guest_count: uniqueGuests.size,
  reservation_count: uniqueReservationIds.size,

  // Breakdown
  breakdown: {
    entry_lines: entryCount,
    exit_lines: exitCount,
    formula: `${uniqueGuests.size} guests x 2 events = ${result.lineCount} lines`
  },

  // Exclusions
  excluded_count: excluded.length,
  excluded: excluded,

  generated_at: new Date().toISOString()
})

3. Actualizar el tracking en sire_exports (~linea 260):

const { error: insertError } = await supabase
  .from('sire_exports')
  .insert({
    tenant_id,
    export_date: new Date().toISOString().split('T')[0],
    date_range_from: date_from || date || null,
    date_range_to: date_to || date || null,
    movement_type: movement_type === 'both' ? null : movement_type,
    guest_count: uniqueGuests.size,        // <-- Actualizado
    reservation_count: uniqueReservationIds.size,  // <-- Nuevo
    excluded_count: excluded.length,
    line_count: result.lineCount,
    txt_filename: result.filename,
    txt_content_hash: contentHash,
    txt_content: result.content,
    file_size_bytes: fileSizeBytes,
    status: 'generated'
  })

TEST:
- Response debe incluir breakdown claro
- Ejemplo para 3 huespedes:
  - guest_count: 3
  - line_count: 6
  - breakdown.formula: "3 guests x 2 events = 6 lines"
- Verificar entry_lines + exit_lines = line_count
```

---

## Checklist

- [ ] 5.1 Modificar query de export para leer reservation_guests
- [ ] 5.2 Crear funcion mapGuestToSIRE
- [ ] 5.3 Actualizar contadores y respuesta

**Anterior:** FASE-4-ui-tab-acompanantes.md

---

## Fin del Proyecto

Una vez completadas las 5 fases:
- Los acompañantes se guardan correctamente en `reservation_guests`
- El staff puede ver todos los huespedes en las tarjetas
- El export SIRE genera una linea por cada huesped extranjero

Ver `CONTEXTO.md` para referencia del flujo completo.
