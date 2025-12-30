# TODO - Acompañantes SIRE

## 📍 CONTEXTO ACTUAL
<!-- ⚠️ ACTUALIZAR esta sección CADA VEZ que se completan tareas -->

**Proyecto:** Companions SIRE Integration
**Última actualización:** 2025-12-28
**Fase actual:** ✅ PROYECTO COMPLETADO (19/19 tareas)

### Estado del Sistema
<!-- Listar lo que ya funciona - agregar items al completar tareas -->
- ✅ Tabla `reservation_guests` existe (migración 20251205190819)
- ✅ Lógica conversacional multi-guest en `GuestChatInterface.tsx`
- ✅ Estados `guestOrder` y `awaitingAdditionalGuestResponse` funcionando
- ✅ SIRE TXT generator con estructura para N huéspedes
- ✅ Progressive disclosure funcionando para 13 campos
- ✅ API /guest/chat acepta parámetro guest_order (default=1)
- ✅ Función upsertGuestSireData guarda en reservation_guests
- ✅ GET /reservation-sire-data acepta guest_order (1=titular, >1=acompañantes)
- ✅ Frontend envía guest_order en requests SIRE
- ✅ Frontend carga datos existentes por huésped
- ✅ Tarjetas de reservación más compactas (~30% menos altura)
- ✅ Grid responsive optimizado (3/2/1 columnas según viewport)
- ✅ API /reservations/list incluye array de guests con sire_complete
- ✅ Tabs Titular/Acompañantes en tarjetas de reservación
- ✅ Lista de acompañantes con estado SIRE (verde/amarillo)
- ✅ Badge contador "X/Y huéspedes" en header de tarjetas
- ✅ SIRE export lee de reservation_guests (todos los huéspedes, no solo titular)
- ✅ Función mapGuestToSIRE con validación de campos y formateo de fechas
- ✅ Contadores SIRE: uniqueGuests, uniqueReservationIds, breakdown (entry/exit/formula)
- ✅ Badge "X/Y huéspedes" con colores según completitud (verde/amarillo/gris)
- ✅ Copiar datos del titular (nationality, origin, destination) a acompañantes
- ✅ Estados visuales SIRE: Generado (azul), Subido (amarillo), Confirmado (verde)
- ✅ Acciones SIRE: Botones Upload/Confirm con modal para referencia

### Limitaciones Actuales
- ✅ FASE 1 COMPLETADA: Backend listo para guardar/leer datos de acompañantes
- ✅ FASE 2 COMPLETADA: Frontend envía y recibe datos por huésped
- ✅ FASE 3 COMPLETADA: UI Staff tarjetas compactas y responsive
- ✅ FASE 4 COMPLETADA: Tarjetas muestran acompañantes con tabs y badges
- ✅ FASE 5.1 COMPLETADA: Query de export lee reservation_guests (multi-guest)
- ✅ FASE 5.2 COMPLETADA: Función mapGuestToSIRE dedicada implementada
- ✅ FASE 5 COMPLETADA: SIRE export multi-huésped con contadores y breakdown
- ✅ FASE 6 COMPLETADA: Badge progreso + Copiar datos + Estados visuales + Acciones SIRE

### Archivos Clave
<!-- Los archivos más importantes para entender el proyecto -->
- `src/app/api/guest/chat/route.ts` → API principal de chat SIRE
- `src/app/api/guest/reservation-sire-data/route.ts` → API datos SIRE por huésped
- `src/components/Chat/GuestChatInterface.tsx` → UI del huésped
- `src/components/reservations/UnifiedReservationCard.tsx` → Tarjeta de reserva staff
- `src/app/api/reservations/list/route.ts` → API lista reservaciones
- `src/app/api/sire/generate-txt/route.ts` → Generador TXT SIRE
- `src/lib/sire/sire-txt-generator.ts` → Funciones de mapeo SIRE

### Stack
- Next.js 15 + React 19
- Tailwind CSS
- Supabase (PostgreSQL)
- JWT (guest tokens)

**Plan completo:** Ver `plan.md` para arquitectura y especificaciones

---

## FASE 1: Backend - Guardar Acompañantes 🎯

### 1.1 Agregar guest_order al API /guest/chat
- [x] Agregar parámetro `guest_order` al endpoint POST (estimate: 30min) ✅
  - Modificar destructuring del request body
  - Agregar validación de guest_order (entero positivo)
  - Documentar nuevo parámetro
  - Files: `src/app/api/guest/chat/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: POST con guest_order: 2 no falla, POST sin guest_order usa default 1

### 1.2 Crear función upsertGuestSireData
- [x] Crear función para INSERT/UPDATE en tabla reservation_guests (estimate: 45min) ✅
  - Crear función helper `upsertGuestSireData`
  - Mapear campos SIRE a columnas de DB
  - Implementar upsert con onConflict
  - Para guest_order=1, también actualizar guest_reservations
  - Files: `src/app/api/guest/chat/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Titular en ambas tablas, acompañante solo en reservation_guests

### 1.3 Modificar /reservation-sire-data para leer por guest_order
- [x] Agregar query param guest_order a GET (estimate: 30min) ✅
  - Parsear guest_order del query string
  - Lógica condicional: guest_order=1 lee de guest_reservations, >1 de reservation_guests
  - Files: `src/app/api/guest/reservation-sire-data/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: GET sin param retorna titular, GET ?guest_order=2 retorna acompañante

---

## FASE 2: Frontend Guest - Enviar guest_order ⚙️

### 2.1 Enviar guest_order en requests de chat
- [x] Modificar handleSendMessage para enviar guest_order (estimate: 30min) ✅
  - Agregar guest_order al requestBody
  - Agregar también en llamada de guardado incremental
  - Files: `src/components/Chat/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Network tab muestra guest_order en request

### 2.2 Cargar datos existentes según guest_order
- [x] Modificar handleStartSIREMode para cargar datos del huésped actual (estimate: 30min) ✅
  - Modificar fetch de /reservation-sire-data con query param
  - Crear función loadGuestSireData
  - Llamar al cambiar de huésped
  - Files: `src/components/Chat/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Reanudar huésped #2 carga sus datos previos

---

## FASE 3: UI Staff - Tarjetas Compactas ✨

### 3.1 Rediseñar tarjetas más compactas
- [x] Reducir altura de tarjetas ~30% (estimate: 45min) ✅
  - Reducir padding p-6 → p-4
  - Reducir spacing space-y-3 → space-y-2
  - Usar grid de 2 columnas para info principal
  - Reducir tamaño de iconos w-5 → w-4
  - Files: `src/components/reservations/UnifiedReservationCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Comparar altura antes/después

### 3.2 Mejorar responsive del grid
- [x] Ajustar breakpoints del grid contenedor (estimate: 30min) ✅
  - Buscar archivo contenedor en src/app/[tenant]/ o src/components/Staff/
  - Aplicar: 3 cols desktop, 2 cols tablet, 1 col mobile
  - Files: `ReservationsList.tsx`, `reservations-airbnb/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Verificar breakpoints en 1280px+, 768-1279px, <768px

---

## FASE 4: UI Staff - Tab Acompañantes 🎨

### 4.1 Modificar API /reservations/list para incluir acompañantes
- [x] Agregar array de guests al response (estimate: 45min) ✅
  - Agregar interfaces ReservationGuest y campos a ReservationListItem
  - Query a reservation_guests con JOIN
  - Calcular sire_complete por huésped
  - Files: `src/app/api/reservations/list/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Response incluye array guests con todos los huéspedes

### 4.2 Implementar sistema de tabs en tarjeta
- [x] Agregar tabs "Titular" y "Acompañantes" (estimate: 45min) ✅
  - Agregar interface Guest y actualizar UnifiedReservation
  - Agregar estado activeTab
  - Crear UI de tabs
  - Files: `src/components/reservations/UnifiedReservationCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Tabs solo aparecen si hay más de 1 huésped

### 4.3 Crear componente CompanionsList
- [x] Mostrar lista de acompañantes con estado SIRE (estimate: 45min) ✅
  - Crear componente CompanionsList
  - Mostrar nombre, documento, badge de estado SIRE
  - Mensaje para lista vacía
  - Files: `src/components/reservations/UnifiedReservationCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Lista muestra acompañantes con badges verde/amarillo

### 4.4 Agregar badge contador de huéspedes
- [x] Badge "X/Y huéspedes" en header de tarjeta (estimate: 15min) ✅
  - Calcular totalGuests y registeredGuests
  - Badge verde si completo, amarillo si faltan
  - Files: `src/components/reservations/UnifiedReservationCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Badge cambia de color según completitud

---

## FASE 5: SIRE Export Multi-Huésped 🚀

### 5.1 Modificar query de export para leer reservation_guests
- [x] Cambiar query de generate-txt (estimate: 30min) ✅
  - Query a reservation_guests con JOIN a guest_reservations
  - Ajustar filtros de fecha para usar la relación
  - Modificar loop de procesamiento
  - Files: `src/app/api/sire/generate-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: 3 huéspedes extranjeros → 6 líneas
  - Documentation: `docs/companions-sire/FASE-5.1-QUERY-IMPLEMENTATION.md`

### 5.2 Crear función mapGuestToSIRE
- [x] Mapear datos de reservation_guests a formato SIRE (estimate: 30min) ✅
  - Agregar interfaces ReservationGuestData y ReservationMetadata
  - Crear función mapGuestToSIRE
  - Validar campos requeridos
  - Formatear fechas DD/MM/YYYY
  - Files: `src/lib/sire/sire-txt-generator.ts`, `src/app/api/sire/generate-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Cada línea tiene datos correctos del huésped
  - Documentation: `docs/companions-sire/FASE-5.2-IMPLEMENTATION.md`

### 5.3 Actualizar contadores y respuesta
- [x] Ajustar estadísticas en response (estimate: 15min) ✅
  - Calcular uniqueGuests, uniqueReservationIds
  - Agregar breakdown con entry_lines, exit_lines, formula
  - Actualizar tracking en sire_exports
  - Files: `src/app/api/sire/generate-txt/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Response incluye breakdown correcto

---

## FASE 6: Mejoras UX y Validación 🎨

### 6.1 API - Agregar expected_guests y registered_guests
- [x] Modificar API /reservations/list para incluir progreso de huéspedes (estimate: 35min) ✅
  - Calcular expected_guests (adults + children)
  - Contar registered_guests (de reservation_guests)
  - Agregar campo guest_progress_complete (boolean)
  - Files: `src/app/api/reservations/list/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Reserva 2 adults + 1 child → expected_guests: 3

### 6.2 UI - Badge progreso de huéspedes
- [x] Agregar badge "X/Y huéspedes" en tarjetas de staff (estimate: 20min) ✅
  - Crear componente GuestProgressBadge
  - Verde = completo, Amarillo = parcial, Gris = ninguno
  - Files: `src/components/reservations/UnifiedReservationCard.tsx`
  - Agent: **@agent-ux-interface**
  - Test: 2/4 huéspedes → badge amarillo "2/4 huéspedes (50%)"

### 6.3 Chat - Copiar datos del titular
- [x] Ofrecer copiar nationality/origin del titular para acompañantes (estimate: 55min) ✅
  - Guardar datos del titular en ref al completar
  - Preguntar si copiar al iniciar huésped #2+
  - Pre-poblar nationality_code, origin_city_code, destination_city_code
  - Files: `src/components/Chat/GuestChatInterface.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Huésped #2 dice "sí" → 3 campos pre-poblados, salta a documento

### 6.4 SIRE - Estados visuales en historial
- [x] Agregar badges de estado en página /sire (estimate: 30min) ✅
  - Crear ExportStatusBadge (Generado, Subido, Confirmado, Error)
  - Colores: Azul, Amarillo, Verde, Rojo
  - Mostrar sire_reference si existe
  - Files: `src/app/[tenant]/sire/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Export con uploaded_at → badge amarillo "Subido a SIRE"

### 6.5 SIRE - Acciones marcar uploaded/confirmed
- [x] Agregar botones para cambiar estado de exports (estimate: 50min) ✅
  - Botón "Marcar subido" → actualiza uploaded_at
  - Botón "Confirmar" → modal para referencia SIRE
  - Actualizar status y confirmed_at en DB
  - Files: `src/app/[tenant]/sire/page.tsx`
  - Agent: **@agent-ux-interface**
  - Test: Click Confirm → modal → ingresa referencia → badge verde

---

## 📊 PROGRESO
<!-- ⚠️ ACTUALIZAR contadores al completar tareas -->

**Total Tasks:** 19
**Completed:** 19/19 (100%)

**Por Fase:**
- FASE 1: 3/3 tareas (100%) ✅ COMPLETADA
- FASE 2: 2/2 tareas (100%) ✅ COMPLETADA
- FASE 3: 2/2 tareas (100%) ✅ COMPLETADA
- FASE 4: 4/4 tareas (100%) ✅ COMPLETADA
- FASE 5: 3/3 tareas (100%) ✅ COMPLETADA
- FASE 6: 5/5 tareas (100%) ✅ COMPLETADA

---

**Última actualización:** 2025-12-28
