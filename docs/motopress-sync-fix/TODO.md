# TODO - MotoPress Sync Fix

**Proyecto:** MotoPress Multi-Tenant Sync Fix
**Fecha:** November 19, 2025
**Plan:** Ver `plan.md` para contexto completo

---

## FASE 0: Preparación y Análisis 🔍 ✅ COMPLETADA

### 0.1 Leer código existente de sync-all
- [x] Analizar flujo completo de sync-all/route.ts (estimate: 15min) ✅ COMPLETADO
  - Identificar línea exacta donde se hace fetch de bookings (~línea 176)
  - Verificar estructura de SSE (sendEvent function)
  - Entender error handling existente
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo lectura)
  - **Resultado:** Punto de inserción identificado en línea 174

### 0.2 Verificar disponibilidad de MotoPresSyncManager
- [x] Confirmar que MotoPresSyncManager está disponible y funciona (estimate: 10min) ✅ COMPLETADO
  - Leer MotoPresSyncManager.syncAccommodations() signature
  - Verificar que retorna SyncResult con created/updated/errors
  - Confirmar parámetro forceEmbeddings (debe ser false)
  - Files: `src/lib/integrations/motopress/sync-manager.ts`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo lectura)
  - **Resultado:** MotoPresSyncManager verificado, errors es string[] (no number)

### 0.3 Documentar punto de inserción
- [x] Crear documento de análisis con punto exacto de modificación (estimate: 5min) ✅ COMPLETADO
  - Documentar línea exacta de inserción
  - Listar imports necesarios
  - Crear snippet del código a insertar
  - Files: `docs/motopress-sync-fix/fase-0/ANALYSIS.md`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo documentación)
  - **Resultado:** ANALYSIS.md creado con especificaciones completas

---

## FASE 1: Fix Temporal INDO 🚑 ✅ COMPLETADA

### 1.1 Ejecutar SQL para corregir reserva de INDO
- [x] Actualizar accommodation_unit_id de reserva externa 2432 (estimate: 10min) ✅ COMPLETADO
  - Ejecutar UPDATE en guest_reservations
  - Verificar que accommodation_unit_id ahora tiene valor correcto
  - Documentar estado before (NULL) y after (UUID válido)
  - Files: N/A (solo SQL via MCP)
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - SELECT para verificar update
  - **Resultado:** Reserva actualizada con accommodation_unit_id = 74abf342-dd17-4546-b615-fa20734fd6b9

### 1.2 Poblar junction table para INDO
- [x] Insertar registro en reservation_accommodations (estimate: 10min) ✅ COMPLETADO
  - Ejecutar INSERT basado en guest_reservations
  - Usar public_unit_id correcto (9e7f6476-e585-4295-9e44-0c8efe2a8fa6)
  - Verificar que motopress_type_id = 2427
  - Files: N/A (solo SQL via MCP)
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - SELECT COUNT en reservation_accommodations
  - **Resultado:** Junction table poblada, descubierta arquitectura de 2 tablas (hotels.accommodation_units + accommodation_units_public)

### 1.3 Validar guest chat funciona para INDO
- [x] Verificar que guest chat puede responder sobre alojamientos (estimate: 10min) ✅ COMPLETADO
  - Query final de validación (JOIN guest_reservations + accommodation_units)
  - Documentar resultado con screenshot de query
  - Crear INDO_FIX_RESULTS.md
  - Files: `docs/motopress-sync-fix/fase-1/INDO_FIX_RESULTS.md`
  - Agent: **@agent-database-agent**
  - Test: Manual - Ir a /my-stay de INDO y preguntar sobre habitación
  - **Resultado:** ✅ Guest chat funcionando - Usuario confirma que aparece nombre de habitación

---

## FASE 2: Implementación Fix Sistémico ⚙️ ✅ COMPLETADA

### 2.1 Agregar import de MotoPresSyncManager
- [x] Importar MotoPresSyncManager en sync-all/route.ts (estimate: 5min) ✅ COMPLETADO
  - Agregar en línea 2: `import { MotoPresSyncManager } from '@/lib/integrations/motopress/sync-manager'`
  - Verificar que import no causa errores TypeScript
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm exec tsc --noEmit`

### 2.2 Implementar coordinación de sync
- [x] Insertar código de sync de accommodations antes de fetch bookings (estimate: 1.5h) ✅ COMPLETADO
  - Insertar en línea ~150-176 (antes de "// 3. Fetch ALL bookings")
  - Agregar comentario explicativo con referencia a docs/troubleshooting
  - Implementar SSE event: "Step 1/2: Syncing accommodations first..."
  - Crear instancia de MotoPresSyncManager
  - Llamar syncAccommodations(tenant_id, false)
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm run build`

### 2.3 Agregar error handling para accommodations sync
- [x] Implementar validación si accommodations sync falla (estimate: 30min) ✅ COMPLETADO
  - Verificar accommodationResult.success === false
  - Enviar SSE error event con mensaje claro
  - Cerrar writer y return (NO continuar con reservations)
  - Log error en console
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm exec tsc --noEmit`

### 2.4 Mejorar SSE progress events
- [x] Actualizar eventos SSE para mostrar progreso de ambas fases (estimate: 20min) ✅ COMPLETADO
  - Event: "Step 1/2 Complete: X accommodations synced"
  - Event: "Step 2/2: Now fetching reservations..."
  - Mantener eventos existentes de reservations
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Manual - Ejecutar sync-all y observar eventos SSE en browser

### 2.5 Documentar cambios realizados
- [x] Crear documentación de implementación (estimate: 20min) ✅ COMPLETADO
  - IMPLEMENTATION.md: Qué se implementó
  - CHANGES.md: Archivos modificados con líneas exactas
  - CODE_DIFF.md: Diff del código antes/después
  - Files: `docs/motopress-sync-fix/fase-2/`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo documentación)

---

## FASE 3: Testing Multi-Tenant ✅

### 3.1 Crear tenant de prueba
- [ ] Crear "TestHotel" en tenant_registry (estimate: 15min)
  - INSERT en tenant_registry
  - Configurar integración MotoPress (credentials de prueba)
  - Verificar que tenant aparece en sistema
  - Files: N/A (solo SQL via MCP)
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - SELECT en tenant_registry

### 3.2 Ejecutar sync-all para TestHotel
- [ ] Sincronizar TestHotel usando nuevo código (estimate: 20min)
  - Ejecutar sync-all desde UI con tenant TestHotel
  - Observar SSE events (debe mostrar Step 1/2 y Step 2/2)
  - Verificar que no hay errores en console
  - Documentar número de accommodations y reservations sincronizadas
  - Files: N/A (manual testing)
  - Agent: **@agent-database-agent**
  - Test: Manual - UI sync-all

### 3.3 Validar TestHotel: 0 NULL reservations
- [ ] Verificar que TODAS las reservas tienen accommodation_unit_id (estimate: 10min)
  - Query: COUNT(*) vs COUNT(accommodation_unit_id)
  - Esperado: Diferencia = 0 (ninguna reserva con NULL)
  - Documentar resultado en TESTING_RESULTS.md
  - Files: `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - Query de validación

### 3.4 Validar TestHotel: Junction table completa
- [ ] Verificar que reservation_accommodations está poblada (estimate: 10min)
  - Query: COUNT en reservation_accommodations JOIN guest_reservations
  - Esperado: COUNT >= total_reservations (puede ser mayor si multi-room)
  - Documentar resultado
  - Files: `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - Query de validación

### 3.5 Re-validar Simmer Down
- [ ] Verificar que Simmer Down NO se rompió (estimate: 10min)
  - Query: Contar reservas con/sin accommodation_unit_id
  - Esperado: 101 reservas, TODAS con accommodation_unit_id
  - Documentar que no hay regresión
  - Files: `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`
  - Agent: **@agent-database-agent**
  - Test: `mcp__supabase__execute_sql` - Query de validación

### 3.6 Re-sync INDO con nuevo código
- [ ] Ejecutar sync-all para INDO con código nuevo (estimate: 15min)
  - Ejecutar sync-all desde UI
  - Verificar que NO genera nuevos NULL
  - Query final: Todas las reservas con unit_name válido
  - Documentar que fix sistémico funciona para INDO también
  - Files: `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`
  - Agent: **@agent-database-agent**
  - Test: Manual UI + `mcp__supabase__execute_sql`

### 3.7 Test guest chat manual
- [ ] Validar guest chat funciona para TestHotel (estimate: 10min)
  - Ir a /my-stay de TestHotel
  - Autenticarse con reserva válida
  - Preguntar: "¿Qué tipo de habitación tengo?"
  - Verificar que responde con nombre de accommodation
  - Files: `docs/motopress-sync-fix/fase-3/TESTING_RESULTS.md`
  - Agent: Manual (no agent)
  - Test: Manual - Browser testing

### 3.8 Crear documento de validación SQL
- [ ] Documentar todas las queries de validación usadas (estimate: 10min)
  - Crear VALIDATION_QUERIES.sql con queries completas
  - Incluir queries para NULL detection, junction table, etc.
  - Agregar comentarios explicativos
  - Files: `docs/motopress-sync-fix/fase-3/VALIDATION_QUERIES.sql`
  - Agent: **@agent-database-agent**
  - Test: N/A (solo documentación)

---

## FASE 4: Mejoras Futuras Opcionales 🎨

### 4.1 Agregar validación preventiva en mapper
- [ ] Agregar warnings en bookings-mapper si unit no existe (estimate: 20min)
  - Modificar líneas 166-188 en bookings-mapper.ts
  - Agregar console.warn si accommodationUnitId === null
  - NO cambiar comportamiento (sigue asignando NULL)
  - Solo advertencia para debugging
  - Files: `src/lib/integrations/motopress/bookings-mapper.ts`
  - Agent: **@agent-backend-developer**
  - Test: Ejecutar sync y verificar warnings en logs

### 4.2 Crear script de monitoring
- [ ] Crear monitor-null-reservations.ts para detección proactiva (estimate: 30min)
  - Query: SELECT reservations WHERE accommodation_unit_id IS NULL
  - Alert si COUNT > 0
  - Documentar cómo ejecutar script
  - Files: `scripts/monitor-null-reservations.ts`
  - Agent: **@agent-backend-developer**
  - Test: `pnpm dlx tsx scripts/monitor-null-reservations.ts`

### 4.3 Documentar orden correcto en código
- [ ] Agregar JSDoc en sync-all explicando orden crítico (estimate: 15min)
  - Agregar comentario al inicio de sync-all/route.ts
  - Explicar por qué accommodations van primero
  - Referenciar docs/troubleshooting
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo documentación)

### 4.4 Mejorar UI progress (Opcional)
- [ ] Agregar stage a SSE events para UI progress bar (estimate: 30min)
  - Agregar campo `stage: 'accommodations' | 'reservations'`
  - Agregar campos `current` y `total` (0/2, 1/2, 2/2)
  - Actualizar interface SSEMessage
  - Files: `src/app/api/integrations/motopress/sync-all/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: Manual - Verificar eventos SSE en browser

### 4.5 Crear guía de prevención
- [ ] Documentar mejores prácticas para evitar race conditions (estimate: 15min)
  - Crear PREVENTION_GUIDE.md
  - Listar orden correcto de sync
  - Explicar qué NO hacer
  - Documentar monitoring setup
  - Files: `docs/motopress-sync-fix/fase-4/PREVENTION_GUIDE.md`
  - Agent: **@agent-backend-developer**
  - Test: N/A (solo documentación)

---

## 📊 PROGRESO

**Total Tasks:** 30
**Completed:** 11/30 (37%) ✅

**Por Fase:**
- FASE 0: 3/3 tareas (Preparación) ✅ COMPLETADA
- FASE 1: 3/3 tareas (Fix Temporal) ✅ COMPLETADA
- FASE 2: 5/5 tareas (Implementación) ✅ COMPLETADA
- FASE 3: 0/8 tareas (Testing) ← EN PROGRESO
- FASE 4: 0/5 tareas (Mejoras - Opcional)

**Crítico (FASE 0-3):** 11/19 tareas (58%)
**Opcional (FASE 4):** 0/5 tareas

**✨ Logros hasta ahora:**
- ✅ Código analizado y punto de inserción identificado (línea 174)
- ✅ MotoPresSyncManager verificado y listo para usar
- ✅ INDO fix temporal exitoso - Guest chat funcionando
- ✅ Junction table poblada con arquitectura de 2 tablas documentada
- ✅ Import de MotoPresSyncManager agregado (Tarea 2.1)
- ✅ Coordinación de sync implementada - 29 líneas insertadas (Tarea 2.2)
- ✅ Error handling verificado y completo (Tarea 2.3)
- ✅ SSE events mejorados con progreso Step 1/2 (Tarea 2.4)
- ✅ Documentación completa creada - 657 líneas en 3 archivos (Tarea 2.5)

**🎯 Siguiente:** FASE 3 - Testing Multi-Tenant (8 tareas)

---

**Última actualización:** November 19, 2025 - 37% completado