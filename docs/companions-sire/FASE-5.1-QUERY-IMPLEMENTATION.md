# FASE 5.1: Query de reservation_guests - IMPLEMENTADO ✅

**Fecha:** 2025-12-28  
**Archivo:** `src/app/api/sire/generate-txt/route.ts`  
**Líneas modificadas:** ~95-258

---

## Cambios Realizados

### 1. Query Principal (líneas 100-148)

**ANTES:**
```typescript
let query = supabase
  .from('guest_reservations')
  .select('*')
  .eq('tenant_id', tenant_id)
  .neq('nationality_code', COLOMBIA_SIRE_CODE);
```

**DESPUÉS:**
```typescript
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
  .neq('nationality_code', COLOMBIA_SIRE_CODE)
  .in('reservation.status', ['active', 'confirmed', 'pending_payment']);
```

**Beneficios:**
- ✅ Lee TODOS los huéspedes (titular + acompañantes)
- ✅ JOIN con guest_reservations para obtener fechas y códigos de hotel
- ✅ Filtra por estado de reservación
- ✅ Excluye colombianos por nationality_code del guest

---

### 2. Filtros de Fecha (líneas 118-146)

**Cambio:** Prefijo `reservation.` en todos los filtros de fecha

**Ejemplos:**
- `check_in_date.eq.${date}` → `reservation.check_in_date.eq.${date}`
- `query.gte('check_in_date', date_from)` → `query.gte('reservation.check_in_date', date_from)`

**Razón:** Las fechas están en el objeto `reservation` del JOIN

---

### 3. Procesamiento de Huéspedes (líneas 181-258)

**ANTES:**
```typescript
for (const reservation of reservations) {
  // ... usar datos del reservation directamente
  const sireData = mapReservationToSIRE(reservation, tenantInfo, eventType);
}
```

**DESPUÉS:**
```typescript
for (const guest of guests) {
  // Extraer reservation del JOIN
  const reservation = guest.reservation;
  
  // Merge guest data con fechas de reservación
  const guestWithDates = {
    ...guest,
    check_in_date: reservation.check_in_date,
    check_out_date: reservation.check_out_date
  };
  
  // Pasar guest (no reservation) a mapReservationToSIRE
  const sireData = mapReservationToSIRE(guestWithDates, tenantInfo, eventType);
}
```

**Beneficios:**
- ✅ Cada guest genera sus propios registros SIRE
- ✅ Datos de guest (nombres, documento) del registro de guest
- ✅ Fechas de check-in/out vienen de la reservación

---

### 4. Actualización de Documentación (líneas 1-45)

**Agregado:**
```typescript
/**
 * MULTI-GUEST SUPPORT:
 * - Reads from reservation_guests table (not guest_reservations)
 * - Includes ALL guests (primary + companions) from each reservation
 * - Each guest generates their own SIRE records
 */
```

---

## Estructura de Datos

### Objeto `guest` retornado por el query:

```typescript
{
  id: string,
  reservation_id: string,
  guest_order: number,
  nationality_code: string,
  document_type: string,
  document_number: string,
  first_surname: string,
  second_surname: string | null,
  given_names: string,
  birth_date: string,
  origin_city_code: string | null,
  destination_city_code: string | null,
  // ... otros campos de reservation_guests
  
  reservation: {
    id: string,
    tenant_id: string,
    check_in_date: string,
    check_out_date: string,
    hotel_sire_code: string,
    hotel_city_code: string,
    status: string
  }
}
```

---

## Testing Realizado

1. ✅ **Build exitoso:** `pnpm run build` - sin errores de TypeScript
2. ✅ **Type checking:** `pnpm exec tsc --noEmit` - sin errores en sire files
3. ✅ **Compatibilidad:** Firma de `mapReservationToSIRE` sin cambios

---

## Impacto

### Cambios de Comportamiento:

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| **Tabla fuente** | `guest_reservations` | `reservation_guests` |
| **Huéspedes incluidos** | Solo titular | Titular + acompañantes |
| **Registros SIRE** | 1 por reserva (o 2 si both) | N por reserva (N = # guests) |
| **Filtrado colombianos** | Por reservation.nationality_code | Por guest.nationality_code |

### Ejemplo Real:

**Reservación con 3 huéspedes (1 titular + 2 acompañantes):**

- **ANTES:** 2 registros SIRE (1 E + 1 S del titular solamente)
- **DESPUÉS:** 6 registros SIRE (1 E + 1 S por cada uno de los 3 huéspedes)

---

## Próximos Pasos (FASE 5.2)

Aunque `mapReservationToSIRE` funciona con el objeto combinado, crear una función dedicada `mapGuestToSIRE` sería más semántico:

```typescript
// Propuesta para FASE 5.2
export function mapGuestToSIRE(
  guest: ReservationGuest,
  reservation: GuestReservation,
  tenantInfo: TenantSIREInfo,
  movementType: 'E' | 'S'
): SIREGuestData | null {
  // Implementación dedicada para multi-guest
}
```

**Beneficios futuros:**
- Firma más clara (guest + reservation separados)
- Mejor tipado TypeScript
- Easier to maintain

---

## Conclusión

✅ **FASE 5.1 COMPLETADA** - El sistema ahora lee y procesa TODOS los huéspedes de cada reservación para exportación SIRE.

**Archivos modificados:**
- `src/app/api/sire/generate-txt/route.ts` (~160 líneas)

**Archivos NO modificados (como se planeó):**
- `src/lib/sire/sire-txt-generator.ts` (mapReservationToSIRE funciona sin cambios)

**Retrocompatibilidad:** ✅ Mantenida - API endpoint y respuesta sin cambios
