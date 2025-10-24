# Documentación de Campos ICS de Airbnb

**Fecha de creación:** 2025-10-23
**Versión:** 1.0
**Propósito:** Documentar todos los campos y estados identificados en los archivos ICS exportados por Airbnb

---

## 📋 Estructura del Archivo ICS

### Encabezado del Calendario
```ics
BEGIN:VCALENDAR
PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN
CALSCALE:GREGORIAN
VERSION:2.0
```

**Campos principales:**
- `PRODID`: Identificador del producto que genera el calendario (siempre "Airbnb Inc//Hosting Calendar 1.0")
- `CALSCALE`: Sistema de calendario (siempre "GREGORIAN")
- `VERSION`: Versión del estándar iCalendar (siempre "2.0")

---

## 📅 Estructura de Eventos (VEVENT)

Cada evento en el calendario ICS de Airbnb contiene los siguientes campos:

### Campos Comunes (presentes en TODOS los eventos)

| Campo | Descripción | Formato | Ejemplo |
|-------|-------------|---------|---------|
| `DTSTAMP` | Timestamp de cuando se generó el evento | `YYYYMMDDTHHMMSSZ` | `20251023T040529Z` |
| `DTSTART` | Fecha de inicio del evento | `VALUE=DATE:YYYYMMDD` | `DTSTART;VALUE=DATE:20251019` |
| `DTEND` | Fecha de fin del evento | `VALUE=DATE:YYYYMMDD` | `DTEND;VALUE=DATE:20251022` |
| `SUMMARY` | Título/estado del evento | Texto | `Reserved` o `Airbnb (Not available)` |
| `UID` | Identificador único del evento | UUID@airbnb.com | `1418fb94e984-90cc2a3b...@airbnb.com` |

### Campos Opcionales (según tipo de evento)

| Campo | Descripción | Presente en | Formato |
|-------|-------------|-------------|---------|
| `DESCRIPTION` | Información adicional de la reserva | Solo en eventos "Reserved" | Multi-línea con `\n` |

---

## 🏷️ Estados de Eventos Identificados

### 1. **Reserved** (Reserva Confirmada)
Indica que la propiedad está reservada para esas fechas.

**Estructura del evento:**
```ics
BEGIN:VEVENT
DTSTAMP:20251023T040529Z
DTSTART;VALUE=DATE:20251019
DTEND;VALUE=DATE:20251022
SUMMARY:Reserved
UID:1418fb94e984-90cc2a3bcdbdba6de239f64ae4ea2fe7@airbnb.com
DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMCH8MD3BQ\n
Phone Number (Last 4 Digits): 0000
END:VEVENT
```

**Datos extraíbles del campo DESCRIPTION:**
- **URL de reserva:** Formato `https://www.airbnb.com/hosting/reservations/details/{CODIGO_RESERVA}`
- **Código de reserva:** Identificador alfanumérico (ej: `HMCH8MD3BQ`)
- **Últimos 4 dígitos del teléfono:** Para identificación del huésped (ej: `0000`)

### 2. **Airbnb (Not available)** (No Disponible)
Indica que la propiedad está bloqueada para esas fechas (no acepta reservas).

**Estructura del evento:**
```ics
BEGIN:VEVENT
DTSTAMP:20251023T040529Z
DTSTART;VALUE=DATE:20251025
DTEND;VALUE=DATE:20251028
SUMMARY:Airbnb (Not available)
UID:7f662ec65913-fd68520c556c7bf043f1c4c7bc8f2dc7@airbnb.com
END:VEVENT
```

**Características:**
- NO incluye campo `DESCRIPTION`
- Puede representar:
  - Bloqueos manuales del host
  - Fechas no disponibles por sincronización con otros calendarios
  - Mantenimiento o limpieza programada
  - Uso personal de la propiedad

---

## 🔑 Patrones de UID Identificados

Los UIDs en Airbnb siguen dos patrones distintos según el tipo de evento:

| Tipo de Evento | Prefijo del UID | Ejemplo |
|----------------|-----------------|---------|
| Reserved | `1418fb94e984-` | `1418fb94e984-90cc2a3b...@airbnb.com` |
| Not available | `7f662ec65913-` | `7f662ec65913-fd68520c...@airbnb.com` |

**Nota:** El prefijo parece ser consistente por tipo de evento, lo que permite identificar rápidamente el tipo sin parsear el SUMMARY.

---

## 📊 Información Adicional Extraíble

### Duración de la Estadía
```javascript
// Cálculo de noches
const startDate = new Date(event.DTSTART);
const endDate = new Date(event.DTEND);
const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
```

### Ocupación del Calendario
- Total de días reservados
- Total de días bloqueados
- Porcentaje de ocupación
- Gaps entre reservas

### Patrones de Reserva
- Días de la semana más populares para check-in/check-out
- Duración promedio de estadía
- Anticipación de reservas (si se compara DTSTAMP con DTSTART)

---

## 🚫 Limitaciones del Formato ICS de Airbnb

### Información NO disponible en el ICS:

1. **Datos del huésped:**
   - Nombre completo
   - Email
   - Número completo de teléfono (solo últimos 4 dígitos)
   - País de origen
   - Cantidad de huéspedes

2. **Información financiera:**
   - Precio de la reserva
   - Comisiones
   - Método de pago
   - Estado del pago

3. **Detalles de la reserva:**
   - Hora exacta de check-in/check-out (solo fechas)
   - Mensajes del huésped
   - Solicitudes especiales
   - Estado de la reserva (confirmada, pendiente, cancelada)

4. **Metadatos del bloqueo:**
   - Razón específica del bloqueo en eventos "Not available"
   - Si es un bloqueo manual o automático
   - Relación con otras propiedades (parent-child)

---

## 🔄 Frecuencia de Actualización

- El campo `DTSTAMP` indica cuándo se generó cada evento
- Airbnb actualiza los feeds ICS regularmente (típicamente cada pocas horas)
- Cambios en reservas se reflejan en el siguiente ciclo de actualización
- Se recomienda sincronizar cada 1-2 horas para mantener datos actualizados

---

## 🛠️ Recomendaciones para Procesamiento

### Parseo con Librerías

**Recomendadas para Node.js/TypeScript:**
1. **node-ical** (v0.21.0) - Más actualizada, soporte async/await
2. **ical.js** - Más establecida, funciona en browser y Node.js
3. **ical-expander** - Para manejo avanzado de recurrencias (aunque Airbnb no usa RRULE)

### Ejemplo de Procesamiento
```typescript
import ical from 'node-ical';

interface AirbnbReservation {
  startDate: Date;
  endDate: Date;
  status: 'reserved' | 'blocked';
  reservationCode?: string;
  phoneLastFour?: string;
  uid: string;
}

async function parseAirbnbCalendar(icsUrl: string): Promise<AirbnbReservation[]> {
  const events = await ical.async.fromURL(icsUrl);
  const reservations: AirbnbReservation[] = [];

  for (const event of Object.values(events)) {
    if (event.type === 'VEVENT') {
      const reservation: AirbnbReservation = {
        startDate: event.start,
        endDate: event.end,
        status: event.summary === 'Reserved' ? 'reserved' : 'blocked',
        uid: event.uid
      };

      // Extraer código de reserva y teléfono si está disponible
      if (event.description) {
        const codeMatch = event.description.match(/details\/([A-Z0-9]+)/);
        const phoneMatch = event.description.match(/Last 4 Digits\): (\d{4})/);

        if (codeMatch) reservation.reservationCode = codeMatch[1];
        if (phoneMatch) reservation.phoneLastFour = phoneMatch[1];
      }

      reservations.push(reservation);
    }
  }

  return reservations;
}
```

---

## 📝 Notas Adicionales

1. **Formato de fechas:** Airbnb usa `VALUE=DATE` (sin hora), lo que significa que los eventos son de día completo
2. **Timezone:** Los eventos no incluyen timezone explícito, se asume la zona horaria de la propiedad
3. **Codificación:** UTF-8, con saltos de línea en DESCRIPTION usando `\n`
4. **Validación:** El UID es único y persistente para cada evento, útil para detectar cambios

---

**Última actualización:** 2025-10-23