# FASE 4.1 - API Include Guests Array

**Fecha:** 2025-12-28
**Tarea:** Agregar array de guests al response de `/api/reservations/list`
**Status:** ✅ COMPLETADO

---

## Cambios Implementados

### 1. Nueva Interface: ReservationGuest

**Archivo:** `src/app/api/reservations/list/route.ts` (línea 17-29)

```typescript
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
```

**Propósito:**
- Define estructura para cada huésped/acompañante
- `sire_complete` calculado dinámicamente (8 campos requeridos)

---

### 2. Actualización de ReservationListItem Interface

**Archivo:** `src/app/api/reservations/list/route.ts` (línea 82-85)

```typescript
// 🆕 NEW: Guest companions array (FASE 4)
guests: ReservationGuest[]
total_guests: number
registered_guests: number
```

**Campos agregados:**
- `guests`: Array completo de huéspedes con datos SIRE
- `total_guests`: Número esperado de huéspedes (del booking)
- `registered_guests`: Cuenta solo huéspedes con SIRE completo

---

### 3. Query a reservation_guests Table

**Archivo:** `src/app/api/reservations/list/route.ts` (línea 236-280)

**Lógica implementada:**
1. Obtener todos los guests para las reservations activas
2. Crear Map<reservation_id, ReservationGuest[]> para lookup eficiente
3. Calcular `sire_complete` para cada guest:
   ```typescript
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
   ```
4. Ordenar por `guest_order` ascendente

**Query Supabase:**
```typescript
const { data: guestsData, error: guestsError } = await supabase
  .from('reservation_guests')
  .select('reservation_id, guest_order, given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
  .in('reservation_id', reservationIds)
  .order('guest_order', { ascending: true })
```

**Performance:**
- Single query para todos los guests (no N+1)
- Map lookup O(1) al construir response

---

### 4. Mapeo de Guests en Response

**Archivo:** `src/app/api/reservations/list/route.ts` (línea 378-424)

**Cálculos agregados:**
```typescript
// Get guests for this reservation
const guests = guestsMap.get(res.id) || []
const totalGuests = res.adults || 1  // Expected from booking
const registeredGuests = guests.filter(g => g.sire_complete).length
```

**Return statement actualizado:**
```typescript
return {
  // ... existing fields ...

  // 🆕 NEW: Guest companions array (FASE 4)
  guests,
  total_guests: totalGuests,
  registered_guests: registeredGuests,

  created_at: res.created_at,
  updated_at: res.updated_at,
}
```

---

## Ejemplo de Response

### Antes (sin guests):
```json
{
  "success": true,
  "data": {
    "total": 1,
    "reservations": [
      {
        "id": "res-123",
        "guest_name": "Juan Perez",
        "adults": 3,
        "children": 0
      }
    ]
  }
}
```

### Después (con guests):
```json
{
  "success": true,
  "data": {
    "total": 1,
    "reservations": [
      {
        "id": "res-123",
        "guest_name": "Juan Perez",
        "adults": 3,
        "children": 0,
        "total_guests": 3,
        "registered_guests": 2,
        "guests": [
          {
            "guest_order": 1,
            "given_names": "JUAN",
            "first_surname": "PEREZ",
            "second_surname": "GOMEZ",
            "document_type": "5",
            "document_number": "1234567890",
            "nationality_code": "169",
            "birth_date": "1980-01-15",
            "origin_city_code": "11001",
            "destination_city_code": "11001",
            "sire_complete": true
          },
          {
            "guest_order": 2,
            "given_names": "MARIA",
            "first_surname": "RODRIGUEZ",
            "second_surname": null,
            "document_type": "3",
            "document_number": "AB123456",
            "nationality_code": "249",
            "birth_date": "1985-05-20",
            "origin_city_code": "249",
            "destination_city_code": "11001",
            "sire_complete": true
          },
          {
            "guest_order": 3,
            "given_names": "PEDRO",
            "first_surname": null,
            "second_surname": null,
            "document_type": null,
            "document_number": null,
            "nationality_code": null,
            "birth_date": null,
            "origin_city_code": null,
            "destination_city_code": null,
            "sire_complete": false
          }
        ]
      }
    ]
  }
}
```

---

## Testing

### Script de Testing
**Archivo:** `scripts/test-reservations-guests.sh`

**Uso:**
```bash
# Asegurar que .env.local tiene TEST_STAFF_TOKEN
./scripts/test-reservations-guests.sh
```

**Validaciones del script:**
1. ✅ Response incluye `guests` array
2. ✅ Response incluye `total_guests` field
3. ✅ Response incluye `registered_guests` field
4. ✅ Cada guest tiene `sire_complete` calculado
5. ✅ Muestra detalles de cada guest (nombre, completitud)

### Testing Manual
```bash
# Usar curl con staff token
curl http://localhost:3000/api/reservations/list \
  -H "Authorization: Bearer <staff-token>" | jq '.data.reservations[0].guests'
```

---

## Criterios de Éxito

### ✅ Completados:

1. **Interface ReservationGuest creada**
   - 11 campos de datos SIRE
   - Campo calculado `sire_complete`

2. **ReservationListItem actualizada**
   - Array `guests` agregado
   - Campos `total_guests` y `registered_guests`

3. **Query a reservation_guests implementada**
   - Single query para todas las reservations
   - Map lookup eficiente
   - Ordenamiento por `guest_order`

4. **Campo sire_complete calculado correctamente**
   - 8 campos requeridos validados
   - Double negation `!!()` para boolean

5. **registered_guests cuenta solo completos**
   - Filter por `sire_complete === true`
   - Refleja estado real de compliance

6. **Build exitoso**
   - `pnpm run build` sin errores
   - TypeScript types correctos

---

## Próximos Pasos

### FASE 4.2 - UI Mostrar Acompañantes
- Mostrar indicador de huéspedes en `UnifiedReservationCard`
- Badge con `registered_guests / total_guests`
- Color según completitud (verde = 100%, amarillo = parcial, rojo = 0%)

### FASE 4.3 - Tab Acompañantes
- Crear nuevo tab en modal de reservations
- Listar todos los guests con su información
- Indicador visual de SIRE completo/incompleto

### FASE 4.4 - Editar Acompañantes
- Formulario para editar datos de guests existentes
- Botón para agregar nuevos guests
- Validación de campos SIRE

---

## Referencias

- **Plan completo:** `docs/companions-sire/plan.md`
- **TODO tracking:** `docs/companions-sire/TODO.md`
- **Frontend update:** Próximamente en `UnifiedReservationCard.tsx`

---

**Tiempo invertido:** ~30 minutos
**Complejidad:** Media (query + cálculos)
**Impacto:** Alto (base para UI de acompañantes)
