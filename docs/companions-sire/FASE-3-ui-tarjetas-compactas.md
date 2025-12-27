# FASE 3: UI Staff - Tarjetas Compactas

**Agente:** @agent-ux-interface
**Tareas:** 2
**Dependencias:** Ninguna (independiente de FASE 1-2)

---

## 3.1 Rediseñar tarjetas mas compactas

```
@agent-ux-interface

TAREA: Rediseñar UnifiedReservationCard para ser mas compacta

CONTEXTO:
- Archivo: src/components/reservations/UnifiedReservationCard.tsx
- Actualmente las tarjetas son muy altas (mucho espaciado vertical)
- Necesitamos reducir altura manteniendo informacion esencial visible

CAMBIOS REQUERIDOS:

1. Reducir padding del contenedor principal (linea 400):
// ANTES:
<div className="p-6">
// DESPUES:
<div className="p-4">

2. Reducir spacing entre secciones (linea 541):
// ANTES:
<div className="space-y-3 mb-4">
// DESPUES:
<div className="space-y-2 mb-3">

3. Usar grid de 2 columnas para info principal (~linea 541):

<div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
  {/* Dates */}
  <div className="flex items-start gap-2">
    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-slate-700">
        {formatDate(checkInDate)} - {formatDate(checkOutDate)}
      </p>
      <p className="text-xs text-slate-500">{nights} noche{nights !== 1 ? 's' : ''}</p>
    </div>
  </div>

  {/* Guests */}
  <div className="flex items-start gap-2">
    <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-slate-700">
        {reservation.adults || 1} adulto{(reservation.adults || 1) !== 1 ? 's' : ''}
        {reservation.children ? `, ${reservation.children} niño${reservation.children !== 1 ? 's' : ''}` : ''}
      </p>
      <p className="text-xs text-slate-500">Huespedes</p>
    </div>
  </div>

  {/* Phone */}
  {!isCalendarBlock && (
    <div className="flex items-start gap-2">
      <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-slate-700">
          {phoneLast4Parsed ? `***-${phoneLast4Parsed}` : 'No disponible'}
        </p>
        <p className="text-xs text-slate-500">Telefono</p>
      </div>
    </div>
  )}

  {/* Price */}
  <div className="flex items-start gap-2">
    <DollarSign className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-sm font-medium text-slate-700">
        {formatPrice(reservation.total_price, reservation.currency)}
      </p>
      <p className="text-xs text-slate-500">Total</p>
    </div>
  </div>
</div>

4. Reducir tamaño de iconos principales:
// Cambiar w-5 h-5 a w-4 h-4 en iconos

5. Hacer secciones colapsables mas compactas:
// Reducir padding de botones de toggle
className="w-full flex items-center justify-between py-1.5 px-2 bg-gray-50..."

TEST:
- Comparar altura antes/despues con misma reserva
- Objetivo: reducir altura en ~30%
- Verificar que toda la informacion esencial sigue visible
- Probar en diferentes anchos de pantalla
```

---

## 3.2 Mejorar responsive del grid

```
@agent-ux-interface

TAREA: Ajustar breakpoints para mejor visualizacion en grid de reservaciones

CONTEXTO:
- La pagina que contiene las tarjetas necesita ajustar el grid
- Buscar archivo contenedor en src/app/[tenant]/ o src/components/Staff/
- Objetivo: 3 cols desktop, 2 cols tablet, 1 col mobile

CAMBIOS REQUERIDOS:

1. Buscar el contenedor del grid de tarjetas (probablemente en ReservationsList o pagina de reservaciones)

2. Modificar o crear el grid:

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {reservations.map(reservation => (
    <UnifiedReservationCard
      key={reservation.id}
      reservation={reservation}
      onDelete={handleDelete}
    />
  ))}
</div>

3. Si el contenedor actual usa flex, cambiar a grid

TEST:
- Desktop (1280px+): 3 columnas
- Tablet (768px-1279px): 2 columnas
- Mobile (<768px): 1 columna
- Verificar que tarjetas no se cortan o desbordan
- Verificar espaciado uniforme entre tarjetas
```

---

## Checklist

- [ ] 3.1 Rediseñar tarjetas mas compactas
- [ ] 3.2 Mejorar responsive del grid

**Anterior:** FASE-2-frontend-guest-order.md
**Siguiente:** FASE-4-ui-tab-acompanantes.md
