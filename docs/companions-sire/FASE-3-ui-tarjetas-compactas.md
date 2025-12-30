# FASE 3: UI Staff - Tarjetas Compactas

**Agente:** @agent-ux-interface
**Tareas:** 2
**Tiempo estimado:** 1h 15min
**Dependencias:** Ninguna (independiente de FASE 1-2, puede ejecutarse en paralelo)

---

## Prompt 3.1: Rediseñar tarjetas más compactas

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** FASE 2 completada (o puede ejecutarse en paralelo)

**Contexto:**
Reducir la altura de las tarjetas de reservación manteniendo la información esencial visible, para mostrar más tarjetas por pantalla.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 5/14 tareas completadas (36%)

FASE 1 - Backend ✅ COMPLETADA
FASE 2 - Frontend Guest ✅ COMPLETADA
FASE 3 - UI Staff Tarjetas Compactas (Progreso: 0/2)
- [ ] 3.1: Rediseñar tarjetas más compactas ← ESTAMOS AQUÍ
- [ ] 3.2: Mejorar responsive del grid

**Estado Actual:**
- Tarjetas actuales son muy altas (mucho espaciado vertical)
- Información esencial ocupa demasiado espacio
- Listo para rediseño compacto

---

**Tareas:**

1. **Reducir padding y spacing del contenedor principal** (15min):

   En `src/components/reservations/UnifiedReservationCard.tsx`:

   ```typescript
   // ANTES (~línea 400):
   <div className="p-6">

   // DESPUÉS:
   <div className="p-4">
   ```

   ```typescript
   // ANTES (~línea 541):
   <div className="space-y-3 mb-4">

   // DESPUÉS:
   <div className="space-y-2 mb-3">
   ```

2. **Usar grid de 2 columnas para info principal** (20min):

   En ~línea 541, reorganizar información en grid:

   ```tsx
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
         <p className="text-xs text-slate-500">Huéspedes</p>
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
           <p className="text-xs text-slate-500">Teléfono</p>
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
   ```

3. **Reducir tamaño de iconos principales** (5min):

   Cambiar `w-5 h-5` a `w-4 h-4` en todos los iconos de la sección de información.

4. **Hacer secciones colapsables más compactas** (5min):

   ```typescript
   // ANTES:
   className="w-full flex items-center justify-between py-2 px-3 bg-gray-50..."

   // DESPUÉS:
   className="w-full flex items-center justify-between py-1.5 px-2 bg-gray-50..."
   ```

**Entregables:**
- Tarjetas ocupan ~30-40% menos altura
- Información esencial visible sin scroll
- Grid de 2 columnas para mejor uso del espacio
- Aspecto limpio y profesional

**Criterios de Éxito:**
- ✅ Tarjetas visualmente más compactas
- ✅ Info principal visible sin expandir
- ✅ No se pierde funcionalidad
- ✅ Reducción de altura ~30%

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 3.1 (Tarjetas compactas)?
- Padding reducido ✓
- Grid de 2 columnas ✓
- Iconos más pequeños ✓
- ~30% menos altura ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 3.1 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   - ✅ Tarjetas de reservación más compactas ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 3.1 completada

   **Progreso FASE 3:** 1/2 tareas completadas (50%)
   - [x] 3.1: Rediseñar tarjetas más compactas ✓
   - [ ] 3.2: Mejorar responsive del grid

   **Progreso General:** 6/14 tareas completadas (43%)

   **Siguiente paso:** Prompt 3.2 - Mejorar responsive del grid (30min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 3.1)**

---

## Prompt 3.2: Mejorar responsive del grid

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 3.1 completado

**Contexto:**
Ajustar el grid contenedor de tarjetas para mostrar el número óptimo de columnas según el ancho de pantalla.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 3.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 6/14 tareas completadas (43%)

FASE 3 - UI Staff Tarjetas Compactas (Progreso: 1/2)
- [x] 3.1: Rediseñar tarjetas más compactas ✓
- [ ] 3.2: Mejorar responsive del grid ← ESTAMOS AQUÍ

**Estado Actual:**
- Tarjetas más compactas ✓
- Grid contenedor necesita ajuste de breakpoints

---

**Tareas:**

1. **Buscar el archivo contenedor del grid** (5min):

   Buscar en:
   - `src/app/[tenant]/accommodations/reservations-motopress/page.tsx`
   - `src/components/Staff/ReservationsList.tsx`
   - O el archivo que renderiza las tarjetas

2. **Ajustar breakpoints del grid** (20min):

   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
     {reservations.map(reservation => (
       <UnifiedReservationCard
         key={reservation.id}
         reservation={reservation}
         onDelete={handleDelete}
       />
     ))}
   </div>
   ```

3. **Verificar que no se use flex en lugar de grid** (5min):

   Si el contenedor actual usa `flex flex-wrap`, cambiarlo a grid para mejor control de columnas.

**Entregables:**
- 3 columnas en desktop (>1280px)
- 2 columnas en tablet (768-1279px)
- 1 columna en mobile (<768px)
- Espaciado uniforme entre tarjetas

**Criterios de Éxito:**
- ✅ 3 columnas en viewport >1280px (xl)
- ✅ 2 columnas en viewport 768-1279px (md)
- ✅ 1 columna en viewport <768px
- ✅ Tarjetas no se cortan ni desbordan

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 3.2 (Responsive grid)?
- 3 cols desktop ✓
- 2 cols tablet ✓
- 1 col mobile ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 3.2 como completada y actualizar progreso de FASE

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ ... (logros anteriores)
   - ✅ Tarjetas de reservación más compactas
   - ✅ Grid responsive optimizado ← NUEVO
   - 🔜 Tab acompañantes en tarjetas (FASE 4)

   **Fase actual:** FASE 4 - UI Staff Tab Acompañantes ← ACTUALIZAR
   ```

3. **Actualizar sección PROGRESO**:
   ```markdown
   - FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
   - FASE 2: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 3: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 4: 0/4 tareas (0%) ← EN PROGRESO
   ```

4. **Informarme del progreso:**
   "✅ FASE 3 COMPLETADA - Todas las tareas marcadas en TODO.md

   **✨ Logros FASE 3:**
   - Tarjetas ~30% más compactas
   - Grid de 2 columnas para info principal
   - Responsive optimizado (3/2/1 columnas)

   **Progreso General:** 7/14 tareas completadas (50%)

   **Siguiente paso:** FASE 4 - UI Staff Tab Acompañantes (2h)
   Prompt 4.1: Modificar API para incluir acompañantes"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 3.2)**

---

## Checklist FASE 3

- [ ] 3.1 Rediseñar tarjetas más compactas
- [ ] 3.2 Mejorar responsive del grid

**Anterior:** `FASE-2-frontend-guest-order.md`
**Siguiente:** `FASE-4-ui-tab-acompanantes.md`
