# FASE 4: UI Staff - Tab Acompañantes

**Agentes:** @agent-backend-developer (4.1) + @agent-ux-interface (4.2, 4.3, 4.4)
**Tareas:** 4
**Tiempo estimado:** 2h 30min
**Dependencias:** FASE 1 completada (datos en reservation_guests)

---

## Prompt 4.1: Modificar API /reservations/list para incluir acompañantes

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** FASE 1 completada

**Contexto:**
Agregar array de guests al response de /api/reservations/list para que las tarjetas puedan mostrar acompañantes.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 7/14 tareas completadas (50%)

FASE 1 - Backend ✅ COMPLETADA
FASE 2 - Frontend Guest ✅ COMPLETADA
FASE 3 - UI Staff Tarjetas ✅ COMPLETADA
FASE 4 - Tab Acompañantes (Progreso: 0/4)
- [ ] 4.1: API incluir acompañantes ← ESTAMOS AQUÍ
- [ ] 4.2: Implementar tabs
- [ ] 4.3: Lista de acompañantes
- [ ] 4.4: Badge contador

**Estado Actual:**
- Datos de acompañantes existen en reservation_guests ✓
- API /reservations/list no incluye acompañantes
- Listo para agregar guests al response

---

**Tareas:**

1. **Agregar interface para guest** (10min):

   En `src/app/api/reservations/list/route.ts`, después de ~línea 70:

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

2. **Agregar campos a ReservationListItem interface** (5min):

   ```typescript
   interface ReservationListItem {
     // ... existing fields ...
     guests: ReservationGuest[]
     total_guests: number
     registered_guests: number
   }
   ```

3. **Hacer query a reservation_guests** (25min):

   Después de obtener reservations (~línea 200):

   ```typescript
   // Get all guests for these reservations
   const reservationIds = reservations.map((r: any) => r.id)
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
   ```

4. **Agregar guests al mapeo de reservations** (5min):

   En el mapeo (~línea 300):

   ```typescript
   const guests = guestsMap.get(res.id) || []
   const totalGuests = res.adults || 1  // Expected from booking
   const registeredGuests = guests.filter(g => g.sire_complete).length

   return {
     // ... existing fields ...
     guests,
     total_guests: totalGuests,
     registered_guests: registeredGuests,
   }
   ```

**Entregables:**
- Response incluye array `guests` para cada reserva
- Incluye `total_guests` y `registered_guests`
- `sire_complete` calculado por huésped

**Criterios de Éxito:**
- ✅ Response incluye array `guests`
- ✅ Cada guest tiene `sire_complete` calculado
- ✅ `registered_guests` cuenta solo huéspedes con SIRE completo
- ✅ Reserva con 3 huéspedes muestra guests.length = 3

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.1 (API con acompañantes)?
- Interface ReservationGuest existe ✓
- Query a reservation_guests funciona ✓
- Response incluye guests array ✓
- sire_complete calculado correctamente ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.1 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   - ✅ API /reservations/list incluye acompañantes ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 4.1 completada

   **Progreso FASE 4:** 1/4 tareas completadas (25%)
   - [x] 4.1: API incluir acompañantes ✓
   - [ ] 4.2: Implementar tabs
   - [ ] 4.3: Lista de acompañantes
   - [ ] 4.4: Badge contador

   **Progreso General:** 8/14 tareas completadas (57%)

   **Siguiente paso:** Prompt 4.2 - Implementar tabs en tarjeta (45min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.1)**

---

## Prompt 4.2: Implementar sistema de tabs en tarjeta

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 4.1 completado

**Contexto:**
Agregar tabs "Titular" y "Acompañantes" a UnifiedReservationCard para navegar entre secciones.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 8/14 tareas completadas (57%)

FASE 4 - Tab Acompañantes (Progreso: 1/4)
- [x] 4.1: API incluir acompañantes ✓
- [ ] 4.2: Implementar tabs ← ESTAMOS AQUÍ
- [ ] 4.3: Lista de acompañantes
- [ ] 4.4: Badge contador

**Estado Actual:**
- API retorna array guests ✓
- Tarjeta no tiene tabs aún
- Listo para implementar UI de tabs

---

**Tareas:**

1. **Agregar interface Guest y actualizar props** (10min):

   En `src/components/reservations/UnifiedReservationCard.tsx`, ~línea 32:

   ```typescript
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
   ```

2. **Agregar estado para tab activo** (5min):

   En ~línea 332:

   ```typescript
   const [activeTab, setActiveTab] = useState<'titular' | 'companions'>('titular')
   ```

3. **Agregar UI de tabs** (25min):

   Antes de la sección SIRE (~línea 612):

   ```tsx
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

       {/* Tab Content - CompanionsList se implementa en tarea 4.3 */}
       {activeTab === 'companions' && (
         <div className="text-sm text-gray-500 italic">
           Lista de acompañantes (próximo prompt)
         </div>
       )}
     </div>
   )}
   ```

**Entregables:**
- Tabs "Titular" y "Acompañantes" visibles
- Estado activo cambia al hacer click
- Tabs solo aparecen si hay más de 1 huésped
- Placeholder para contenido de acompañantes

**Criterios de Éxito:**
- ✅ Tarjeta con 1 huésped: NO muestra tabs
- ✅ Tarjeta con 3 huéspedes: muestra tabs
- ✅ Tab activo cambia correctamente al hacer click
- ✅ Contador muestra "(2)" si hay 2 acompañantes

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.2 (Sistema de tabs)?
- Interface Guest existe ✓
- Estado activeTab funciona ✓
- Tabs visibles solo si >1 huésped ✓
- Contador de acompañantes correcto ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.2 como completada

2. **Informarme del progreso:**
   "✅ Tarea 4.2 completada

   **Progreso FASE 4:** 2/4 tareas completadas (50%)
   - [x] 4.1: API incluir acompañantes ✓
   - [x] 4.2: Implementar tabs ✓
   - [ ] 4.3: Lista de acompañantes
   - [ ] 4.4: Badge contador

   **Progreso General:** 9/14 tareas completadas (64%)

   **Siguiente paso:** Prompt 4.3 - Lista de acompañantes (45min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.2)**

---

## Prompt 4.3: Crear componente CompanionsList

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 4.2 completado

**Contexto:**
Crear el componente que muestra la lista de acompañantes con su estado SIRE.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.3)**

**📊 Contexto de Progreso:**

**Progreso General:** 9/14 tareas completadas (64%)

FASE 4 - Tab Acompañantes (Progreso: 2/4)
- [x] 4.1: API incluir acompañantes ✓
- [x] 4.2: Implementar tabs ✓
- [ ] 4.3: Lista de acompañantes ← ESTAMOS AQUÍ
- [ ] 4.4: Badge contador

**Estado Actual:**
- Tabs funcionan ✓
- Tab "Acompañantes" muestra placeholder
- Listo para implementar lista real

---

**Tareas:**

1. **Crear componente CompanionsList** (40min):

   En `src/components/reservations/UnifiedReservationCard.tsx`, antes del componente principal:

   ```tsx
   function CompanionsList({ guests }: { guests: Guest[] }) {
     if (guests.length === 0) {
       return (
         <p className="text-sm text-gray-500 italic py-4 text-center">
           No hay acompañantes registrados
         </p>
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
               <div>
                 <span className="text-gray-400">Doc:</span>{' '}
                 {guest.document_type || 'N/A'} {guest.document_number || ''}
               </div>
               <div>
                 <span className="text-gray-400">Nacionalidad:</span>{' '}
                 {guest.nationality_code || 'N/A'}
               </div>
             </div>
           </div>
         ))}
       </div>
     )
   }
   ```

2. **Reemplazar placeholder con CompanionsList** (5min):

   Cambiar el placeholder en el tab content:

   ```tsx
   {activeTab === 'companions' && (
     <CompanionsList guests={reservation.guests?.filter(g => g.guest_order > 1) || []} />
   )}
   ```

**Entregables:**
- Componente CompanionsList funcional
- Muestra nombre completo de cada acompañante
- Badge de estado SIRE (verde/amarillo)
- Info de documento y nacionalidad
- Mensaje si no hay acompañantes

**Criterios de Éxito:**
- ✅ Click en "Acompañantes" muestra lista
- ✅ Cada acompañante muestra nombre completo
- ✅ Badge verde si SIRE completo
- ✅ Badge amarillo si SIRE pendiente
- ✅ Lista vacía muestra mensaje apropiado

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.3 (CompanionsList)?
- Componente renderiza correctamente ✓
- Nombre completo visible ✓
- Badges de estado funcionan ✓
- Lista vacía manejada ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.3 como completada

2. **Informarme del progreso:**
   "✅ Tarea 4.3 completada

   **Progreso FASE 4:** 3/4 tareas completadas (75%)
   - [x] 4.1: API incluir acompañantes ✓
   - [x] 4.2: Implementar tabs ✓
   - [x] 4.3: Lista de acompañantes ✓
   - [ ] 4.4: Badge contador

   **Progreso General:** 10/14 tareas completadas (71%)

   **Siguiente paso:** Prompt 4.4 - Badge contador de huéspedes (15min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.3)**

---

## Prompt 4.4: Agregar badge contador de huéspedes

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 4.3 completado

**Contexto:**
Agregar badge "X/Y huéspedes" al header de la tarjeta para mostrar progreso de registro.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 4.4)**

**📊 Contexto de Progreso:**

**Progreso General:** 10/14 tareas completadas (71%)

FASE 4 - Tab Acompañantes (Progreso: 3/4)
- [x] 4.1-4.3 completados ✓
- [ ] 4.4: Badge contador ← ESTAMOS AQUÍ

**Estado Actual:**
- Tabs y lista funcionan ✓
- Falta indicador visual de progreso en header
- Listo para agregar badge

---

**Tareas:**

1. **Calcular estado de huéspedes** (5min):

   En ~línea 358:

   ```typescript
   // Guest registration status
   const totalGuests = reservation.total_guests || reservation.adults || 1
   const registeredGuests = reservation.registered_guests || 0
   const allGuestsRegistered = registeredGuests >= totalGuests
   ```

2. **Agregar badge en header** (10min):

   En la columna de badges (~línea 492, después del badge SIRE):

   ```tsx
   {/* Guests Registration Badge */}
   {totalGuests > 0 && (
     <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${
       allGuestsRegistered
         ? 'bg-green-100 text-green-800 border-green-200'
         : 'bg-yellow-100 text-yellow-800 border-yellow-200'
     }`}>
       <Users className="w-3 h-3" />
       {registeredGuests}/{totalGuests} huéspedes
     </div>
   )}
   ```

**Entregables:**
- Badge muestra "X/Y huéspedes" en header
- Verde si todos registrados
- Amarillo si faltan por registrar
- Icono de usuarios visible

**Criterios de Éxito:**
- ✅ Reserva con 1 adulto, 0 registrados: "0/1 huéspedes" (amarillo)
- ✅ Reserva con 3 adultos, 2 registrados: "2/3 huéspedes" (amarillo)
- ✅ Reserva con 2 adultos, 2 registrados: "2/2 huéspedes" (verde)

**Estimado:** 15min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 4.4 (Badge contador)?
- Badge visible en header ✓
- Contador X/Y correcto ✓
- Color verde cuando completo ✓
- Color amarillo cuando faltan ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 4.4 como completada y actualizar progreso de FASE

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ ... (logros anteriores)
   - ✅ API /reservations/list incluye acompañantes
   - ✅ Tabs Titular/Acompañantes en tarjetas
   - ✅ Lista de acompañantes con estado SIRE
   - ✅ Badge contador de huéspedes ← NUEVO
   - 🔜 SIRE export multi-huésped (FASE 5)

   **Fase actual:** FASE 5 - SIRE Export Multi-Huésped ← ACTUALIZAR
   ```

3. **Actualizar sección PROGRESO**:
   ```markdown
   - FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
   - FASE 2: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 3: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 4: 4/4 tareas (100%) ✅ COMPLETADA
   - FASE 5: 0/3 tareas (0%) ← EN PROGRESO
   ```

4. **Informarme del progreso:**
   "✅ FASE 4 COMPLETADA - Todas las tareas marcadas en TODO.md

   **✨ Logros FASE 4:**
   - API incluye array de guests con estado SIRE
   - Tabs Titular/Acompañantes en tarjetas
   - Lista de acompañantes con badges de estado
   - Badge contador X/Y huéspedes en header

   **Progreso General:** 11/14 tareas completadas (79%)

   **Siguiente paso:** FASE 5 - SIRE Export Multi-Huésped (1.5h)
   Prompt 5.1: Query de reservation_guests"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 4.4)**

---

## Checklist FASE 4

- [ ] 4.1 Modificar API /reservations/list para incluir acompañantes
- [ ] 4.2 Implementar sistema de tabs en tarjeta
- [ ] 4.3 Crear componente CompanionsList
- [ ] 4.4 Agregar badge de contador de huéspedes

**Anterior:** `FASE-3-ui-tarjetas-compactas.md`
**Siguiente:** `FASE-5-sire-export-multi.md`
