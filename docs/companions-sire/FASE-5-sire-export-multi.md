# FASE 5: SIRE Export Multi-Huésped

**Agente:** @agent-backend-developer
**Tareas:** 3
**Tiempo estimado:** 1h 15min
**Dependencias:** FASE 1 completada (datos en reservation_guests)

---

## Prompt 5.1: Modificar query de export para leer reservation_guests

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** FASE 1 completada (datos existen en reservation_guests)

**Contexto:**
Cambiar el query de generate-txt para leer de reservation_guests en lugar de guest_reservations, obteniendo TODOS los huéspedes de cada reserva.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 11/14 tareas completadas (79%)

FASE 1-4 ✅ COMPLETADAS
FASE 5 - SIRE Export (Progreso: 0/3)
- [ ] 5.1: Query de reservation_guests ← ESTAMOS AQUÍ
- [ ] 5.2: Crear función mapGuestToSIRE
- [ ] 5.3: Actualizar contadores

**Estado Actual:**
- Datos de huéspedes en reservation_guests ✓
- Export actual solo lee titular de guest_reservations
- Listo para cambiar a multi-huésped

---

**Tareas:**

1. **Crear nuevo query con JOIN** (20min):

   En `src/app/api/sire/generate-txt/route.ts`, ~línea 100:

   ```typescript
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
   ```

2. **Ajustar filtros de fecha** (10min):

   ```typescript
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
   ```

**Entregables:**
- Query retorna todos los huéspedes de todas las reservas
- Incluye fechas check_in/check_out de la reserva
- Excluye huéspedes colombianos

**Criterios de Éxito:**
- ✅ Query retorna array de guests con datos de reservación
- ✅ Cada guest tiene acceso a reservation.check_in_date, etc.
- ✅ Colombianos excluidos por nationality_code

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 5.1 (Query reservation_guests)?
- Query con JOIN funciona ✓
- Filtros de fecha funcionan ✓
- Exclusión de colombianos funciona ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 5.1 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   - ✅ Query SIRE export lee de reservation_guests ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 5.1 completada

   **Progreso FASE 5:** 1/3 tareas completadas (33%)
   - [x] 5.1: Query de reservation_guests ✓
   - [ ] 5.2: Crear función mapGuestToSIRE
   - [ ] 5.3: Actualizar contadores

   **Progreso General:** 12/14 tareas completadas (86%)

   **Siguiente paso:** Prompt 5.2 - Crear función mapGuestToSIRE (30min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 5.1)**

---

## Prompt 5.2: Crear función mapGuestToSIRE

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.1 completado

**Contexto:**
Crear función que mapea datos de reservation_guests al formato SIRE para generar líneas del TXT.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 12/14 tareas completadas (86%)

FASE 5 - SIRE Export (Progreso: 1/3)
- [x] 5.1: Query de reservation_guests ✓
- [ ] 5.2: Crear función mapGuestToSIRE ← ESTAMOS AQUÍ
- [ ] 5.3: Actualizar contadores

**Estado Actual:**
- Query retorna guests con datos de reservación ✓
- Falta función para mapear a formato SIRE
- Listo para implementar mapGuestToSIRE

---

**Tareas:**

1. **Agregar interfaces** (10min):

   En `src/lib/sire/sire-txt-generator.ts`:

   ```typescript
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
   ```

2. **Crear función mapGuestToSIRE** (15min):

   ```typescript
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
   ```

3. **Modificar loop de procesamiento en generate-txt** (5min):

   En `src/app/api/sire/generate-txt/route.ts`, ~línea 170:

   ```typescript
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
   ```

**Entregables:**
- Función mapGuestToSIRE implementada y exportada
- Validación de campos requeridos
- Formato de fechas DD/MM/YYYY
- Integración con loop de procesamiento

**Criterios de Éxito:**
- ✅ 1 huésped extranjero → 2 líneas (E + S)
- ✅ 3 huéspedes extranjeros → 6 líneas
- ✅ Datos correctos en cada línea
- ✅ Huéspedes con datos incompletos se excluyen

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 5.2 (mapGuestToSIRE)?
- Función existe y compila ✓
- Validación de campos funciona ✓
- Formato de fechas correcto ✓
- Loop de procesamiento actualizado ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 5.2 como completada

2. **Informarme del progreso:**
   "✅ Tarea 5.2 completada

   **Progreso FASE 5:** 2/3 tareas completadas (67%)
   - [x] 5.1: Query de reservation_guests ✓
   - [x] 5.2: Crear función mapGuestToSIRE ✓
   - [ ] 5.3: Actualizar contadores

   **Progreso General:** 13/14 tareas completadas (93%)

   **Siguiente paso:** Prompt 5.3 - Actualizar contadores (15min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 5.2)**

---

## Prompt 5.3: Actualizar contadores y respuesta

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 5.2 completado

**Contexto:**
Ajustar los contadores en el response de generate-txt para reflejar correctamente huéspedes vs líneas.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 5.3)**

**📊 Contexto de Progreso:**

**Progreso General:** 13/14 tareas completadas (93%)

FASE 5 - SIRE Export (Progreso: 2/3)
- [x] 5.1-5.2 completados ✓
- [ ] 5.3: Actualizar contadores ← ESTAMOS AQUÍ

**Estado Actual:**
- Query multi-huésped funciona ✓
- Función mapGuestToSIRE funciona ✓
- Contadores aún reflejan estructura antigua
- Listo para ajustar response

---

**Tareas:**

1. **Calcular estadísticas** (10min):

   En `src/app/api/sire/generate-txt/route.ts`, ~línea 280:

   ```typescript
   // Calculate statistics
   const uniqueGuests = new Set(
     sireGuests.map(g => `${g.numeroDocumento}-${g.primerApellido}`)
   )
   const uniqueReservationIds = new Set(
     guests.map((g: any) => g.reservation.id)
   )
   const entryCount = sireGuests.filter(g => g.tipoMovimiento === 'E').length
   const exitCount = sireGuests.filter(g => g.tipoMovimiento === 'S').length
   ```

2. **Actualizar response** (5min):

   ~línea 288:

   ```typescript
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
   ```

3. **Actualizar tracking en sire_exports** (opcional, si existe):

   ```typescript
   const { error: insertError } = await supabase
     .from('sire_exports')
     .insert({
       tenant_id,
       export_date: new Date().toISOString().split('T')[0],
       date_range_from: date_from || date || null,
       date_range_to: date_to || date || null,
       movement_type: movement_type === 'both' ? null : movement_type,
       guest_count: uniqueGuests.size,
       reservation_count: uniqueReservationIds.size,
       excluded_count: excluded.length,
       line_count: result.lineCount,
       txt_filename: result.filename,
       txt_content_hash: contentHash,
       txt_content: result.content,
       file_size_bytes: fileSizeBytes,
       status: 'generated'
     })
   ```

**Entregables:**
- Response incluye breakdown detallado
- Contadores correctos (guests vs lines)
- Fórmula explicativa incluida
- Tracking actualizado

**Criterios de Éxito:**
- ✅ 3 huéspedes genera: guest_count: 3, line_count: 6
- ✅ breakdown.formula: "3 guests x 2 events = 6 lines"
- ✅ entry_lines + exit_lines = line_count

**Estimado:** 15min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 5.3 (Contadores)?
- Estadísticas calculadas ✓
- Response incluye breakdown ✓
- Contadores correctos ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 5.3 como completada y finalizar proyecto

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ API /guest/chat acepta guest_order
   - ✅ Función upsertGuestSireData guarda en reservation_guests
   - ✅ API /reservation-sire-data lee por guest_order
   - ✅ Frontend envía guest_order en requests
   - ✅ Frontend carga datos existentes por huésped
   - ✅ Tarjetas de reservación más compactas
   - ✅ Grid responsive optimizado
   - ✅ API /reservations/list incluye acompañantes
   - ✅ Tabs Titular/Acompañantes en tarjetas
   - ✅ Lista de acompañantes con estado SIRE
   - ✅ Badge contador de huéspedes
   - ✅ SIRE export genera líneas por cada huésped ← NUEVO
   - ✅ Contadores y breakdown actualizados ← NUEVO

   **Proyecto:** ✅ COMPLETADO
   ```

3. **Actualizar sección PROGRESO**:
   ```markdown
   **Total Tasks:** 14
   **Completed:** 14/14 (100%) ✅

   **Por Fase:**
   - FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
   - FASE 2: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 3: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 4: 4/4 tareas (100%) ✅ COMPLETADA
   - FASE 5: 3/3 tareas (100%) ✅ COMPLETADA
   ```

4. **Informarme del progreso:**
   "🎉 PROYECTO COMPLETADO - Acompañantes SIRE Integration

   **Resumen de Logros:**

   **FASE 1 - Backend:** ✅
   - API acepta guest_order
   - Guardado en reservation_guests
   - Lectura por huésped

   **FASE 2 - Frontend Guest:** ✅
   - Envío de guest_order
   - Carga de datos existentes

   **FASE 3 - UI Tarjetas:** ✅
   - Tarjetas 30% más compactas
   - Grid responsive 3/2/1 columnas

   **FASE 4 - Tab Acompañantes:** ✅
   - API incluye guests
   - Tabs Titular/Acompañantes
   - Lista con estado SIRE
   - Badge contador

   **FASE 5 - SIRE Export:** ✅
   - Query multi-huésped
   - Una línea por huésped
   - Contadores actualizados

   **Total:** 14/14 tareas (100%)

   **El sistema ahora:**
   - Guarda datos de acompañantes correctamente
   - Muestra todos los huéspedes en tarjetas de staff
   - Genera TXT SIRE con línea por cada huésped extranjero"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 5.3)**

---

## Checklist FASE 5

- [ ] 5.1 Modificar query de export para leer reservation_guests
- [ ] 5.2 Crear función mapGuestToSIRE
- [ ] 5.3 Actualizar contadores y respuesta

**Anterior:** `FASE-4-ui-tab-acompanantes.md`
**Siguiente:** `FASE-6-mejoras-ux-validacion.md`

---

## Siguiente Paso

Continuar con FASE 6 para agregar:
- Badge "X/Y huéspedes registrados" en tarjetas
- Copiar datos del titular para acompañantes
- Historial de exports con estados visuales

Ver `FASE-6-mejoras-ux-validacion.md` para los prompts.
