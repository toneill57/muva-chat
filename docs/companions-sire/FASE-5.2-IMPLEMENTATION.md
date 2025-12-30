# FASE 5.2 - Implementación mapGuestToSIRE

**Fecha:** 28 de diciembre, 2025
**Tarea:** Crear función dedicada para mapear datos de reservation_guests a formato SIRE
**Estado:** ✅ Completado

---

## 📋 Resumen

Se implementó la función `mapGuestToSIRE()` que mapea datos de la tabla `reservation_guests` (con JOIN a `guest_reservations`) al formato SIRE de 13 campos para generar líneas del archivo TXT.

## 🎯 Cambios Realizados

### 1. Nuevas Interfaces en `src/lib/sire/sire-txt-generator.ts`

Se agregaron dos interfaces TypeScript para tipo-seguridad:

```typescript
/**
 * Guest data from reservation_guests table (with JOIN to guest_reservations)
 */
export interface ReservationGuestData {
  guest_order: number;
  given_names: string | null;
  first_surname: string | null;
  second_surname: string | null;
  document_type: string | null;
  document_number: string | null;
  nationality_code: string | null;
  birth_date: string | null;
  origin_city_code: string | null;
  destination_city_code: string | null;
}

/**
 * Reservation metadata from guest_reservations table
 */
export interface ReservationMetadata {
  id: string;
  check_in_date: string;
  check_out_date: string;
  hotel_sire_code: string;
  hotel_city_code: string;
}
```

### 2. Nueva Función `mapGuestToSIRE()`

Implementación completa de la función de mapeo:

```typescript
export function mapGuestToSIRE(
  guest: ReservationGuestData,
  reservation: ReservationMetadata,
  movementType: 'E' | 'S'
): SIREGuestData | null
```

**Características:**

- **Validación en dos pasos:**
  1. Campos básicos requeridos: `document_number`, `first_surname`, `given_names`
  2. Campos SIRE específicos: `document_type`, `nationality_code`, `birth_date`

- **Logs detallados:**
  - Muestra `guest_order` para debugging
  - Indica exactamente qué campos faltan
  - Warnings diferentes para cada tipo de validación

- **Manejo de fechas:**
  - Tipo E → usa `check_in_date`
  - Tipo S → usa `check_out_date`
  - Formatea usando `formatDateToSIRE()` (DD/MM/YYYY)

- **Valores por defecto:**
  - `segundo_apellido`: cadena vacía si es null
  - `lugar_procedencia`: usa `nationality_code` si `origin_city_code` es null
  - `lugar_destino`: usa `hotel_city_code` si `destination_city_code` es null

### 3. Actualización del API Route `src/app/api/sire/generate-txt/route.ts`

**Cambios en imports:**
```typescript
// Antes:
import { generateSIRETXT, mapReservationToSIRE, SIREGuestData, TenantSIREInfo } from '@/lib/sire/sire-txt-generator';

// Después:
import { generateSIRETXT, mapGuestToSIRE, SIREGuestData } from '@/lib/sire/sire-txt-generator';
```

**Simplificación del loop de procesamiento:**

ANTES (líneas 187-264):
```typescript
// Merge manual de datos
const guestWithDates = {
  ...guest,
  check_in_date: reservation.check_in_date,
  check_out_date: reservation.check_out_date
};

// Construcción de tenantInfo
const tenantInfo: TenantSIREInfo = {
  hotel_sire_code: reservation.hotel_sire_code,
  hotel_city_code: reservation.hotel_city_code
};

// Llamada a mapReservationToSIRE
const sireDataE = mapReservationToSIRE(guestWithDates, tenantInfo, 'E');
```

DESPUÉS:
```typescript
// Llamada directa sin merge manual
const sireDataE = mapGuestToSIRE(guest, reservation, 'E');
```

**Eliminaciones:**
- ❌ Variable `guestWithDates` (ya no necesaria)
- ❌ Variable `tenantInfo` (ya no necesaria)
- ❌ Import de `TenantSIREInfo` (ya no usado)

## 🧪 Validación

### Build Status
```bash
pnpm run build
# ✅ Compiled successfully in 5.4s
```

### Casos de Prueba Cubiertos

1. **Validación de campos requeridos:**
   - ❌ Falta `document_number` → null + warning
   - ❌ Falta `first_surname` → null + warning
   - ❌ Falta `given_names` → null + warning

2. **Validación SIRE específica:**
   - ❌ Falta `document_type` → null + warning
   - ❌ Falta `nationality_code` → null + warning
   - ❌ Falta `birth_date` → null + warning

3. **Validación de fechas de movimiento:**
   - ❌ Tipo E sin `check_in_date` → null + warning
   - ❌ Tipo S sin `check_out_date` → null + warning

4. **Casos exitosos:**
   - ✅ Guest completo tipo E → genera línea con check_in_date
   - ✅ Guest completo tipo S → genera línea con check_out_date
   - ✅ Guest sin `origin_city_code` → usa `nationality_code` (fallback)
   - ✅ Guest sin `destination_city_code` → usa `hotel_city_code` (fallback)

## 📊 Impacto

### Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Código route.ts** | 264 líneas | 249 líneas (-15) |
| **Merge manual** | Requerido (`guestWithDates`) | No requerido |
| **Claridad** | Usa función para tabla antigua | Usa función específica |
| **Mantenibilidad** | Media (merge confuso) | Alta (separación clara) |

### Beneficios

1. **Separación de responsabilidades:**
   - `mapReservationToSIRE()` → para tabla `guest_reservations` (legacy)
   - `mapGuestToSIRE()` → para tabla `reservation_guests` (multi-guest)

2. **Código más limpio:**
   - No más merge manual de objetos
   - Firma de función más clara
   - Menos variables intermedias

3. **Mejor debugging:**
   - Logs incluyen `guest_order` para identificar huéspedes
   - Mensajes de error más específicos
   - Validaciones separadas por tipo

4. **Type-safety:**
   - Interfaces TypeScript dedicadas
   - Validación en tiempo de compilación
   - IntelliSense completo en IDEs

## 🔄 Próximos Pasos

**Tarea 5.3 - Actualizar contadores:**
- Actualizar comentarios en `route.ts` para reflejar lógica multi-guest
- Revisar que `guest_count` y `excluded_count` sean correctos
- Verificar que mensajes de respuesta sean claros

## 📝 Notas Técnicas

### Formato de Fechas
La función usa `formatDateToSIRE()` que:
- Acepta: `YYYY-MM-DD` (formato ISO)
- Retorna: `DD/MM/YYYY` (formato SIRE oficial)

### Validaciones
La función retorna `null` en casos de datos incompletos, permitiendo al caller:
1. Contar huéspedes excluidos
2. Registrar razón de exclusión
3. Continuar procesando otros huéspedes

### Compatibilidad
- ✅ Mantiene `mapReservationToSIRE()` para compatibilidad con código legacy
- ✅ No rompe ninguna funcionalidad existente
- ✅ Permite transición gradual a multi-guest

---

**Próxima tarea:** 5.3 - Actualizar contadores y mensajes
**Progreso FASE 5:** 2/3 tareas completadas (67%)
