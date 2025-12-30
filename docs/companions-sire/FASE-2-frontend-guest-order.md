# FASE 2: Frontend Guest - Enviar guest_order

**Agente:** @agent-ux-interface
**Tareas:** 2
**Tiempo estimado:** 1h
**Dependencias:** FASE 1 completada

---

## Prompt 2.1: Enviar guest_order en requests de chat

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** FASE 1 completada

**Contexto:**
Modificar handleSendMessage para enviar guest_order al backend, permitiendo identificar qué huésped está registrando datos SIRE.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.1)**

**📊 Contexto de Progreso:**

**Progreso General:** 3/14 tareas completadas (21%)

FASE 1 - Backend ✅ COMPLETADA
FASE 2 - Frontend Guest (Progreso: 0/2)
- [ ] 2.1: Enviar guest_order en requests ← ESTAMOS AQUÍ
- [ ] 2.2: Cargar datos existentes según guest_order

**Estado Actual:**
- Backend acepta guest_order ✓
- Backend guarda en reservation_guests ✓
- Frontend tiene estado guestOrder pero no lo envía

---

**Tareas:**

1. **Modificar handleSendMessage para incluir guest_order** (20min):

   En `src/components/Chat/GuestChatInterface.tsx`, líneas ~993-1003, agregar guest_order al requestBody:

   ```typescript
   const requestBody: any = {
     message: textToSend,
     conversation_id: activeConversationId,
   }

   // Si estamos en modo SIRE, incluir los datos capturados Y guest_order
   if (mode === 'sire') {
     requestBody.mode = 'sire'
     requestBody.sireData = overrideSireData || sireDisclosure.sireData
     requestBody.guest_order = guestOrder  // <-- AGREGAR ESTA LÍNEA
   }
   ```

2. **Agregar guest_order en guardado incremental** (10min):

   En ~línea 882-899, también agregar guest_order:

   ```typescript
   await fetch('/api/guest/chat', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({
       message: textToSend,
       conversation_id: activeConversationId,
       mode: 'sire',
       sireData: updatedSireData,
       guest_order: guestOrder,  // <-- AGREGAR ESTA LÍNEA
     }),
   })
   ```

**Entregables:**
- Payload de chat incluye guest_order
- Guardado incremental también incluye guest_order
- guestOrder se incrementa correctamente al cambiar de huésped

**Criterios de Éxito:**
- ✅ Network tab muestra guest_order en request
- ✅ Titular envía guest_order=1
- ✅ Segundo huésped envía guest_order=2

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 2.1 (Enviar guest_order)?
- Payload incluye guest_order ✓
- Guardado incremental incluye guest_order ✓
- Incremento funciona al cambiar huésped ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 2.1 como completada

2. **Actualizar "📍 CONTEXTO ACTUAL"** - Agregar logro:
   ```markdown
   - ✅ Frontend envía guest_order en requests ← NUEVO
   ```

3. **Informarme del progreso:**
   "✅ Tarea 2.1 completada

   **Progreso FASE 2:** 1/2 tareas completadas (50%)
   - [x] 2.1: Enviar guest_order en requests ✓
   - [ ] 2.2: Cargar datos existentes según guest_order

   **Progreso General:** 4/14 tareas completadas (29%)

   **Siguiente paso:** Prompt 2.2 - Cargar datos existentes según guest_order (30min)"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 2.1)**

---

## Prompt 2.2: Cargar datos existentes según guest_order

**Agente:** `@agent-ux-interface`

**PREREQUISITO:** Prompt 2.1 completado

**Contexto:**
Modificar handleStartSIREMode para cargar datos del huésped actual usando el query param guest_order.

---

🔽 **COPIAR DESDE AQUÍ (Prompt 2.2)**

**📊 Contexto de Progreso:**

**Progreso General:** 4/14 tareas completadas (29%)

FASE 1 - Backend ✅ COMPLETADA
FASE 2 - Frontend Guest (Progreso: 1/2)
- [x] 2.1: Enviar guest_order en requests ✓
- [ ] 2.2: Cargar datos existentes según guest_order ← ESTAMOS AQUÍ

**Estado Actual:**
- Frontend envía guest_order ✓
- Backend lee y guarda por guest_order ✓
- Listo para cargar datos existentes del huésped actual

---

**Tareas:**

1. **Modificar fetch de /reservation-sire-data** (15min):

   En `handleStartSIREMode`, ~línea 531, agregar query param:

   ```typescript
   // 2. Fetch existing SIRE data from reservation (CRITICAL for sync)
   const reservationResponse = await fetch(
     `/api/guest/reservation-sire-data?guest_order=${guestOrder}`,
     {
       headers: {
         Authorization: `Bearer ${token}`,
       },
     }
   )
   ```

2. **Crear función loadGuestSireData** (10min):

   Después de handleStartSIREMode, agregar:

   ```typescript
   /**
    * Loads existing SIRE data for the current guest (used when resuming registration)
    */
   const loadGuestSireData = async (guestOrderToLoad: number) => {
     try {
       const response = await fetch(
         `/api/guest/reservation-sire-data?guest_order=${guestOrderToLoad}`,
         {
           headers: {
             Authorization: `Bearer ${token}`,
           },
         }
       )

       if (response.ok) {
         const data = await response.json()
         if (data.sireData && Object.keys(data.sireData).length > 0) {
           console.log(`[SIRE] Loaded existing data for guest ${guestOrderToLoad}:`, Object.keys(data.sireData))
           sireDisclosure.setAllFields({
             ...sireDisclosure.sireData,  // Keep auto-filled fields
             ...data.sireData
           })
         }
       }
     } catch (err) {
       console.error('[SIRE] Failed to load guest data:', err)
     }
   }
   ```

3. **Llamar loadGuestSireData al cambiar de huésped** (5min):

   En ~línea 790, cuando el usuario dice "sí" para registrar otro huésped:

   ```typescript
   if (isAffirmative) {
     // User wants to register another guest
     awaitingAdditionalGuestRef.current = false
     setAwaitingAdditionalGuestResponse(false)
     const newGuestOrder = guestOrder + 1
     setGuestOrder(newGuestOrder)

     // Reset SIRE disclosure keeping auto-filled fields
     sireDisclosure.reset({
       hotel_code: sireDisclosure.sireData.hotel_code,
       city_code: sireDisclosure.sireData.city_code,
       movement_type: sireDisclosure.sireData.movement_type,
       movement_date: sireDisclosure.sireData.movement_date,
     })

     // Try to load existing data for this guest (if resuming)
     await loadGuestSireData(newGuestOrder)  // <-- AGREGAR

     // Get first question for new guest
     const firstField = getNextFieldToAsk({
       hotel_code: sireDisclosure.sireData.hotel_code,
       // ... resto del código existente
     })

     // ... resto del código existente
   }
   ```

**Entregables:**
- Datos del huésped específico se cargan al iniciar
- Si hay datos previos guardados, se muestran
- Al cambiar de huésped, se cargan sus datos si existen

**Criterios de Éxito:**
- ✅ Reanudar huésped #1 carga sus datos guardados
- ✅ Reanudar huésped #2 carga sus datos guardados
- ✅ Nuevo huésped #3 (sin datos) inicia vacío

**Estimado:** 30min

---

**🔍 Verificación Post-Ejecución:**

Una vez completadas todas las tareas anteriores, pregúntame:

"¿Consideras satisfactoria la ejecución del Prompt 2.2 (Cargar datos según guest_order)?
- Query param en fetch ✓
- Función loadGuestSireData existe ✓
- Se llama al cambiar de huésped ✓"

**Si mi respuesta es "Sí" o "Aprobado":**

1. **Actualizar TODO.md** - Marcar tarea 2.2 como completada y actualizar progreso de FASE

2. **Actualizar "📍 CONTEXTO ACTUAL"**:
   ```markdown
   ### Estado del Sistema
   - ✅ API /guest/chat acepta guest_order
   - ✅ Función upsertGuestSireData guarda en reservation_guests
   - ✅ API /reservation-sire-data lee por guest_order
   - ✅ Frontend envía guest_order en requests
   - ✅ Frontend carga datos existentes por huésped ← NUEVO
   - 🔜 UI Staff tarjetas compactas (FASE 3)

   **Fase actual:** FASE 3 - UI Staff Tarjetas Compactas ← ACTUALIZAR
   ```

3. **Actualizar sección PROGRESO**:
   ```markdown
   - FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
   - FASE 2: 2/2 tareas (100%) ✅ COMPLETADA
   - FASE 3: 0/2 tareas (0%) ← EN PROGRESO
   ```

4. **Informarme del progreso:**
   "✅ FASE 2 COMPLETADA - Todas las tareas marcadas en TODO.md

   **✨ Logros FASE 2:**
   - Frontend envía guest_order en todos los requests SIRE
   - Datos existentes se cargan al reanudar registro
   - Flujo multi-huésped completamente funcional

   **Progreso General:** 5/14 tareas completadas (36%)

   **Siguiente paso:** FASE 3 - UI Staff Tarjetas Compactas (1.5h)
   Prompt 3.1: Rediseñar tarjetas más compactas"

**Si mi respuesta es "No" o tengo observaciones:**
- Preguntar qué necesita ajustarse
- NO marcar como completado
- Iterar hasta aprobación

🔼 **COPIAR HASTA AQUÍ (Prompt 2.2)**

---

## Checklist FASE 2

- [ ] 2.1 Enviar guest_order en requests de chat
- [ ] 2.2 Cargar datos existentes según guest_order

**Anterior:** `FASE-1-backend-guardar.md`
**Siguiente:** `FASE-3-ui-tarjetas-compactas.md`
