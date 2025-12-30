# FASE 1: Backend - Guardar Acompañantes

**Agente:** @agent-backend-developer
**Tareas:** 3
**Tiempo estimado:** 1h 45min
**Dependencias:** Ninguna (primera fase)

---

## Prompt 1.1: Agregar parámetro guest_order al API /guest/chat

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Inicio del proyecto

**Contexto:**
Modificar el endpoint /api/guest/chat para recibir y procesar el parámetro guest_order que indica qué huésped está siendo registrado (1=titular, 2+=acompañantes).

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 0/14 tareas completadas (0%)

FASE 1 - Backend Guardar Acompañantes (Progreso: 0/3)
- [ ] 1.1: Agregar guest_order al request ← ESTAMOS AQUÍ
- [ ] 1.2: Crear función upsertGuestSireData
- [ ] 1.3: Modificar /reservation-sire-data

**Estado Actual:**
- Tabla `reservation_guests` existe ✓
- API /guest/chat guarda en `guest_reservations` (solo titular)
- Listo para agregar soporte multi-huésped

---

**Tareas:**

1. **Agregar parámetro guest_order al request body** (15min):

   En `src/app/api/guest/chat/route.ts`, línea ~97, modificar la interfaz del request:
   ```typescript
   const { message, conversation_id, mode, sireData, guest_order = 1 } = await request.json()
   ```

2. **Validar guest_order** (10min):

   Después de línea 104, agregar validación:
   ```typescript
   // Validate guest_order
   if (typeof guest_order !== 'number' || guest_order < 1 || !Number.isInteger(guest_order)) {
     return NextResponse.json(
       { error: 'guest_order must be a positive integer' },
       { status: 400 }
     )
   }
   console.log(`[Guest Chat] Guest order: ${guest_order}`)
   ```

3. **Documentar nuevo parámetro** (5min):

   En línea ~609 (sección request body docs), agregar:
   ```typescript
   guest_order: 'number (optional, defaults to 1 - which guest is registering: 1=titular, 2+=companions)',
   ```

**Entregables:**
- API acepta parámetro `guest_order` en request body
- Validación de guest_order implementada
- guest_order disponible para uso en lógica de guardado

**Criterios de Éxito:**
- ✅ POST con `guest_order: 2` no falla
- ✅ POST sin guest_order usa default 1
- ✅ POST con `guest_order: 0` retorna error 400
- ✅ Log muestra "Guest order: X"

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.1 (Agregar guest_order)?
- API acepta guest_order ✓
- Validación funciona ✓
- Default es 1 ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.1 como completada:
   ```markdown
   ### 1.1 Agregar guest_order al API /guest/chat
   - [x] Agregar parámetro `guest_order` al endpoint POST (estimate: 30min)
   ```

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   ### Estado del Sistema
   - ✅ API /guest/chat acepta guest_order ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 1.1 completada y marcada en TODO.md

   **Progreso FASE 1:** 1/3 tareas completadas (33%)
   - [x] 1.1: Agregar guest_order al request ✓
   - [ ] 1.2: Crear función upsertGuestSireData
   - [ ] 1.3: Modificar /reservation-sire-data

   **Progreso General:** 1/14 tareas completadas (7%)

   **Siguiente paso:** Prompt 1.2 - Crear función upsertGuestSireData (45min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.1)**

---

## Prompt 1.2: Crear función upsertGuestSireData

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 1.1 completado

**Contexto:**
Crear la lógica para insertar/actualizar datos SIRE en la tabla reservation_guests, con upsert por (reservation_id, guest_order).

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 1/14 tareas completadas (7%)

FASE 1 - Backend Guardar Acompañantes (Progreso: 1/3)
- [x] 1.1: Agregar guest_order al request ✓ COMPLETADO
- [ ] 1.2: Crear función upsertGuestSireData ← ESTAMOS AQUÍ
- [ ] 1.3: Modificar /reservation-sire-data

**Estado Actual:**
- API acepta guest_order ✓
- Listo para implementar guardado en reservation_guests

---

**Tareas:**

1. **Crear función helper upsertGuestSireData** (30min):

   En `src/app/api/guest/chat/route.ts`, antes del POST handler (~línea 45), agregar:

   ```typescript
   /**
    * Upserts guest SIRE data to reservation_guests table
    * For guest_order=1, also updates guest_reservations for backwards compatibility
    */
   async function upsertGuestSireData(
     supabase: any,
     reservationId: string,
     guestOrder: number,
     sireData: Record<string, any>
   ): Promise<{ success: boolean; error?: string }> {
     try {
       const dbData: Record<string, any> = {
         reservation_id: reservationId,
         guest_order: guestOrder,
       }

       // Map extracted fields
       if (sireData.names || sireData.nombres) {
         dbData.given_names = sireData.names || sireData.nombres
       }
       if (sireData.first_surname || sireData.primer_apellido) {
         dbData.first_surname = sireData.first_surname || sireData.primer_apellido
       }
       if (sireData.second_surname !== undefined || sireData.segundo_apellido !== undefined) {
         dbData.second_surname = sireData.second_surname ?? sireData.segundo_apellido ?? null
       }
       if (sireData.document_type_code || sireData.tipo_documento) {
         dbData.document_type = sireData.document_type_code || sireData.tipo_documento
       }
       if (sireData.identification_number || sireData.documento_numero) {
         dbData.document_number = sireData.identification_number || sireData.documento_numero
       }
       if (sireData.nationality_code || sireData.codigo_nacionalidad) {
         dbData.nationality_code = sireData.nationality_code || sireData.codigo_nacionalidad
       }
       if (sireData.birth_date || sireData.fecha_nacimiento) {
         const birthDate = sireData.birth_date || sireData.fecha_nacimiento
         if (birthDate.includes('/')) {
           const [d, m, y] = birthDate.split('/')
           dbData.birth_date = `${y}-${m}-${d}`
         } else {
           dbData.birth_date = birthDate
         }
       }
       if (sireData.origin_place || sireData.lugar_procedencia) {
         dbData.origin_city_code = sireData.origin_place || sireData.lugar_procedencia
       }
       if (sireData.destination_place || sireData.lugar_destino) {
         dbData.destination_city_code = sireData.destination_place || sireData.lugar_destino
       }

       // Upsert to reservation_guests
       const { error: upsertError } = await supabase
         .from('reservation_guests')
         .upsert(dbData, {
           onConflict: 'reservation_id,guest_order',
           ignoreDuplicates: false
         })

       if (upsertError) {
         console.error('[Guest Chat] Failed to upsert reservation_guests:', upsertError)
         return { success: false, error: upsertError.message }
       }

       console.log(`[Guest Chat] Upserted guest ${guestOrder} data to reservation_guests`)

       // For guest_order=1, also update guest_reservations for backwards compatibility
       if (guestOrder === 1) {
         const guestResData: Record<string, any> = {}
         if (dbData.given_names) guestResData.given_names = dbData.given_names
         if (dbData.first_surname) guestResData.first_surname = dbData.first_surname
         if (dbData.second_surname !== undefined) guestResData.second_surname = dbData.second_surname
         if (dbData.document_type) guestResData.document_type = dbData.document_type
         if (dbData.document_number) guestResData.document_number = dbData.document_number
         if (dbData.nationality_code) guestResData.nationality_code = dbData.nationality_code
         if (dbData.birth_date) guestResData.birth_date = dbData.birth_date
         if (dbData.origin_city_code) guestResData.origin_city_code = dbData.origin_city_code
         if (dbData.destination_city_code) guestResData.destination_city_code = dbData.destination_city_code

         if (Object.keys(guestResData).length > 0) {
           await supabase
             .from('guest_reservations')
             .update(guestResData)
             .eq('id', reservationId)
         }
       }

       return { success: true }
     } catch (err) {
       console.error('[Guest Chat] Error in upsertGuestSireData:', err)
       return { success: false, error: String(err) }
     }
   }
   ```

2. **Integrar con guardado incremental** (10min):

   En ~línea 295, modificar para usar la nueva función:
   ```typescript
   // En lugar del UPDATE directo a guest_reservations:
   await upsertGuestSireData(supabase, session.reservation_id, guest_order, extractedData)
   ```

3. **Integrar con guardado completo** (5min):

   En ~línea 387, modificar para usar la nueva función:
   ```typescript
   // En lugar del UPDATE directo a guest_reservations:
   await upsertGuestSireData(supabase, session.reservation_id, guest_order, mergedSireData)
   ```

**Entregables:**
- Función `upsertGuestSireData` implementada
- Upsert funcional (no duplica registros)
- Compatibilidad mantenida para titular

**Criterios de Éxito:**
- ✅ Huésped #1 crea registro en reservation_guests con guest_order=1
- ✅ Huésped #2 crea registro en reservation_guests con guest_order=2
- ✅ Actualizar datos no crea duplicados (usa upsert)
- ✅ Titular también actualiza guest_reservations (backwards compat)

**Estimado:** 45min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.2 (upsertGuestSireData)?
- Función existe y compila ✓
- Upsert funciona sin duplicados ✓
- Titular actualiza ambas tablas ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.2 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   - ✅ Función upsertGuestSireData guarda en reservation_guests ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 1.2 completada

   **Progreso FASE 1:** 2/3 tareas completadas (67%)
   - [x] 1.1: Agregar guest_order al request ✓
   - [x] 1.2: Crear función upsertGuestSireData ✓
   - [ ] 1.3: Modificar /reservation-sire-data

   **Progreso General:** 2/14 tareas completadas (14%)

   **Siguiente paso:** Prompt 1.3 - Modificar /reservation-sire-data (30min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.2)**

---

## Prompt 1.3: Modificar /reservation-sire-data para leer por guest_order

**Agente:** `@agent-backend-developer`

**PREREQUISITO:** Prompt 1.2 completado

**Contexto:**
Agregar parámetro guest_order a GET /api/guest/reservation-sire-data para leer datos del huésped específico.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 1.3)**

**📊 Contexto de Progreso:**

**Progreso General:** 2/14 tareas completadas (14%)

FASE 1 - Backend Guardar Acompañantes (Progreso: 2/3)
- [x] 1.1: Agregar guest_order al request ✓
- [x] 1.2: Crear función upsertGuestSireData ✓
- [ ] 1.3: Modificar /reservation-sire-data ← ESTAMOS AQUÍ

**Estado Actual:**
- API acepta guest_order ✓
- Función de guardado implementada ✓
- Listo para implementar lectura por huésped

---

**Tareas:**

1. **Parsear guest_order del query string** (10min):

   En `src/app/api/guest/reservation-sire-data/route.ts`:
   ```typescript
   export async function GET(request: NextRequest) {
     // ... auth code existente ...

     const url = new URL(request.url)
     const guestOrder = parseInt(url.searchParams.get('guest_order') || '1', 10)

     console.log(`[reservation-sire-data] Loading data for guest_order: ${guestOrder}`)
   ```

2. **Implementar lógica condicional de lectura** (20min):

   ```typescript
   let sireData: Record<string, string> = {}

   if (guestOrder === 1) {
     // For titular, read from guest_reservations (backwards compatibility)
     const { data: reservationData } = await supabase
       .from('guest_reservations')
       .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
       .eq('id', session.reservation_id)
       .single()

     if (reservationData) {
       if (reservationData.given_names) sireData.names = reservationData.given_names
       if (reservationData.first_surname) sireData.first_surname = reservationData.first_surname
       if (reservationData.second_surname) sireData.second_surname = reservationData.second_surname
       if (reservationData.document_type) sireData.document_type_code = reservationData.document_type
       if (reservationData.document_number) sireData.identification_number = reservationData.document_number
       if (reservationData.nationality_code) sireData.nationality_code = reservationData.nationality_code
       if (reservationData.birth_date) {
         const [y, m, d] = reservationData.birth_date.split('-')
         sireData.birth_date = `${d}/${m}/${y}`
       }
       if (reservationData.origin_city_code) sireData.origin_place = reservationData.origin_city_code
       if (reservationData.destination_city_code) sireData.destination_place = reservationData.destination_city_code
     }
   } else {
     // For companions (guest_order > 1), read from reservation_guests
     const { data: guestData } = await supabase
       .from('reservation_guests')
       .select('given_names, first_surname, second_surname, document_type, document_number, nationality_code, birth_date, origin_city_code, destination_city_code')
       .eq('reservation_id', session.reservation_id)
       .eq('guest_order', guestOrder)
       .single()

     if (guestData) {
       if (guestData.given_names) sireData.names = guestData.given_names
       if (guestData.first_surname) sireData.first_surname = guestData.first_surname
       if (guestData.second_surname) sireData.second_surname = guestData.second_surname
       if (guestData.document_type) sireData.document_type_code = guestData.document_type
       if (guestData.document_number) sireData.identification_number = guestData.document_number
       if (guestData.nationality_code) sireData.nationality_code = guestData.nationality_code
       if (guestData.birth_date) {
         const [y, m, d] = guestData.birth_date.split('-')
         sireData.birth_date = `${d}/${m}/${y}`
       }
       if (guestData.origin_city_code) sireData.origin_place = guestData.origin_city_code
       if (guestData.destination_city_code) sireData.destination_place = guestData.destination_city_code
     }
   }

   return NextResponse.json({ sireData })
   ```

**Entregables:**
- Endpoint acepta `?guest_order=N`
- Retorna datos del huésped específico
- Funciona para titular (1) y acompañantes (>1)

**Criterios de Éxito:**
- ✅ GET sin param retorna datos titular (guest_order=1)
- ✅ GET ?guest_order=2 retorna datos de acompañante #2
- ✅ GET ?guest_order=99 retorna objeto vacío (no existe)

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 1.3 (reservation-sire-data)?
- Query param funciona ✓
- Datos correctos por huésped ✓
- Backwards compat con titular ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 1.3 como completada y actualizar progreso de FASE

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ API /guest/chat acepta guest_order
   - ✅ Función upsertGuestSireData guarda en reservation_guests
   - ✅ API /reservation-sire-data lee por guest_order ← NUEVO
   - 🔜 Frontend envía guest_order (FASE 2)

   **Fase actual:** FASE 2 - Frontend Guest ← ACTUALIZAR
   ```

3. **Actualizar sección PROGRESO**:
   ```markdown
   - FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
   - FASE 2: 0/2 tareas (0%) ← EN PROGRESO
   ```

4. **Informarme del progreso:**
   "✅ FASE 1 COMPLETADA - Todas las tareas marcadas en TODO.md

   **✨ Logros FASE 1:**
   - API acepta guest_order para identificar huéspedes
   - Función upsertGuestSireData guarda en reservation_guests
   - API de lectura soporta query param guest_order
   - Backwards compatibility mantenida para titular

   **Progreso General:** 3/14 tareas completadas (21%)

   **Siguiente paso:** FASE 2 - Frontend Guest (1h)
   Prompt 2.1: Enviar guest_order en requests de chat"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 1.3)**

---

## Checklist FASE 1

- [ ] 1.1 Agregar guest_order al API /guest/chat
- [ ] 1.2 Crear función upsertGuestSireData
- [ ] 1.3 Modificar /reservation-sire-data para leer por guest_order

**Siguiente:** `FASE-2-frontend-guest-order.md`
