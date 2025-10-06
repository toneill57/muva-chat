# TODO - SIRE Compliance Data Extension

**Proyecto:** SIRE Compliance Data Extension
**Fecha:** 6 Octubre 2025
**Plan:** Ver `plan.md` para contexto completo
**Catálogos Oficiales:** ✅ `_assets/sire/codigos-pais.json` (250 países), `_assets/sire/ciudades-colombia.json` (1,122 ciudades)

---

## FASE 1: Database Migration 🎯

### 1.1 Crear migración con 9 campos SIRE
- [ ] Crear migración SQL (estimate: 1h)
  - Agregar 9 columnas a `guest_reservations` (document_type, document_number, birth_date, first_surname, second_surname, given_names, nationality_code, origin_country_code, destination_country_code)
  - Todos los campos nullable (no romper data existente)
  - Tipos de datos correctos según `CODIGOS_OFICIALES.md`:
    - `document_type` VARCHAR(2)
    - `document_number` VARCHAR(15) - máx 15 chars según spec oficial
    - `birth_date` DATE
    - `first_surname` VARCHAR(50) - con acentos, máx 50 chars
    - `second_surname` VARCHAR(50) - con acentos, PUEDE estar vacío
    - `given_names` VARCHAR(50) - con acentos, máx 50 chars
    - `nationality_code` VARCHAR(3) - 1-3 dígitos
    - `origin_country_code` VARCHAR(6) - 1-6 dígitos (soporta DIVIPOLA)
    - `destination_country_code` VARCHAR(6) - 1-6 dígitos (soporta DIVIPOLA)
  - Files: `supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql`
  - Agent: **@agent-database-agent**
  - Test: Aplicar migración en dev branch de Supabase

### 1.2 Agregar constraints de validación
- [ ] Crear constraints para validar formatos SIRE según `CODIGOS_OFICIALES.md` (estimate: 30min)
  - Constraint: `document_type` IN ('3', '5', '10', '46') - SOLO 4 códigos válidos
  - Constraint: `document_number` alfanumérico 6-15 chars (regex `^[A-Z0-9]{6,15}$`)
  - Constraint: `first_surname` solo letras incluyendo acentos, 1-50 chars (regex `^[A-ZÁÉÍÓÚÑ ]{1,50}$`)
  - Constraint: `second_surname` solo letras incluyendo acentos, 0-50 chars (regex `^[A-ZÁÉÍÓÚÑ ]{0,50}$`) - **PUEDE estar vacío**
  - Constraint: `given_names` solo letras incluyendo acentos, 1-50 chars (regex `^[A-ZÁÉÍÓÚÑ ]{1,50}$`)
  - Constraint: `nationality_code` numérico 1-3 dígitos (regex `^\d{1,3}$`)
  - Constraint: `origin_country_code` numérico 1-6 dígitos (regex `^\d{1,6}$`) - soporta ISO + DIVIPOLA
  - Constraint: `destination_country_code` numérico 1-6 dígitos (regex `^\d{1,6}$`) - soporta ISO + DIVIPOLA
  - Files: Same migration file
  - Agent: **@agent-database-agent**
  - Test: Intentar insertar valores inválidos (deben fallar)

### 1.3 Crear índices para búsquedas
- [ ] Agregar índices en campos compliance (estimate: 15min)
  - Índice: `idx_guest_reservations_document` en `document_number` (WHERE NOT NULL)
  - Índice: `idx_guest_reservations_nationality` en `nationality_code` (WHERE NOT NULL)
  - Files: Same migration file
  - Agent: **@agent-database-agent**
  - Test: Verificar índices con `\d guest_reservations` en psql

### 1.4 Script de migración de datos existentes
- [ ] Migrar datos desde compliance_submissions (estimate: 30min)
  - Query para encontrar submissions exitosas con guest_id
  - UPDATE guest_reservations con datos de compliance_submissions.data (JSONB)
  - Parsear JSONB: sire_data.tipo_documento → document_type, etc.
  - Solo migrar donde status = 'success'
  - Log de cuántos registros actualizados
  - Files: `scripts/migrate-compliance-data-to-reservations.sql`
  - Agent: **@agent-database-agent**
  - Test: SELECT count antes/después de migración

---

## FASE 2: Backend Integration ⚙️

### 2.1 Actualizar TypeScript types
- [ ] Extender interface GuestReservation (estimate: 30min)
  - Agregar 9 campos SIRE al type definition
  - Actualizar imports en archivos que usan GuestReservation
  - ⚠️ IMPORTANTE: Usar códigos SIRE de `_assets/sire/codigos-pais.json`, NO ISO 3166-1
  - Referencia: `src/lib/sire/field-mappers.ts` (interface SIREData actualizada)
  - Files: `src/lib/compliance-chat-engine.ts` (líneas ~50-100)
  - Agent: **@agent-backend-developer**
  - Test: `npm run type-check` (no errores)

### 2.2 Función para actualizar reserva con datos compliance
- [ ] Crear `updateReservationWithComplianceData()` (estimate: 1h)
  - Función async que recibe `reservationId` y `sireData`
  - Mapear campos sireData → guest_reservations columns
  - Helper `parseSIREDate(DD/MM/YYYY)` → Date object
  - UPDATE query con Supabase client
  - Error handling y logging
  - ⚠️ USAR: `mapCountryToCode()` de `field-mappers.ts` (actualizado con códigos SIRE)
  - Files: `src/lib/compliance-chat-engine.ts` (nueva función ~50 líneas)
  - Agent: **@agent-backend-developer**
  - Test: Llamar función con datos de prueba, verificar UPDATE en DB

### 2.3 Integrar función en compliance chat flow
- [ ] Modificar compliance engine para persistir en reservations (estimate: 30min)
  - Encontrar dónde se llama `mapConversationalToSIRE()`
  - Después de crear `compliance_submission`, llamar `updateReservationWithComplianceData()`
  - Pasar `reservation_id` y `sire_data` generado
  - Catch errors (no fallar si update falla, solo log)
  - Files: `src/lib/compliance-chat-engine.ts` (modificar función existente)
  - Agent: **@agent-backend-developer**
  - Test: Simular compliance chat, verificar que guest_reservations se actualiza

### 2.4 Actualizar API de reservations
- [ ] Agregar campos SIRE a /api/reservations/list (estimate: 30min)
  - Modificar SELECT query para incluir 9 campos nuevos
  - Actualizar return type (agregar campos al interface)
  - Files: `src/app/api/reservations/list/route.ts`
  - Agent: **@agent-backend-developer**
  - Test: `curl http://localhost:3000/api/reservations/list` y verificar campos en response

### 2.5 Helper script para sync manual
- [ ] Crear script de sincronización compliance → reservations (estimate: 45min)
  - Script TypeScript que lee compliance_submissions
  - Encuentra guest_reservations asociadas
  - Actualiza campos SIRE desde submission.data (JSONB)
  - Log de progreso (X/Y actualizados)
  - Dry-run mode (mostrar cambios sin aplicar)
  - Files: `scripts/sync-compliance-to-reservations.ts`
  - Agent: **@agent-backend-developer**
  - Test: `npx tsx scripts/sync-compliance-to-reservations.ts --dry-run`

---

## FASE 3: Testing & Validation ✨

### 3.1 Queries de validación SQL
- [ ] Crear script con queries de validación (estimate: 30min)
  - Query 1: Verificar que columnas existen con tipos correctos
  - Query 2: Contar reservas con datos compliance (document_number NOT NULL)
  - Query 3: Validar formatos (buscar rows que violen constraints - debe ser 0)
  - Query 4: Verificar migración completa (submissions con datos pero reservations sin datos - debe ser 0)
  - Query 5: Verificar índices creados
  - Files: `scripts/validate-sire-compliance-data.sql`
  - Agent: **@agent-database-agent**
  - Test: Ejecutar todas las queries, verificar resultados esperados

### 3.2 Test end-to-end de compliance flow
- [ ] Crear test de integración completo (estimate: 1h)
  - Paso 1: Crear guest_reservation de prueba (sin datos compliance)
  - Paso 2: Simular compliance chat (extraer conversational_data)
  - Paso 3: Llamar mapConversationalToSIRE() → sire_data
  - Paso 4: Llamar updateReservationWithComplianceData()
  - Paso 5: Verificar que guest_reservations tiene datos SIRE
  - Paso 6: Verificar que compliance_submission también se creó
  - Paso 7: Verificar que API /api/reservations/list retorna datos
  - Paso 8: Cleanup (borrar datos de prueba)
  - Files: `scripts/test-compliance-flow.ts`
  - Agent: **@agent-backend-developer**
  - Test: `npx tsx scripts/test-compliance-flow.ts` (debe pasar todos los pasos)

### 3.3 Validar datos migrados
- [ ] Verificar migración de datos existentes (estimate: 15min)
  - Ejecutar query: SELECT count de reservations con document_number NOT NULL
  - Comparar con count de compliance_submissions con status = 'success'
  - Deben coincidir (o reservations >= submissions)
  - Spot check: 5 reservas aleatorias (verificar que datos son correctos)
  - Files: N/A (queries manuales)
  - Agent: **@agent-database-agent**
  - Test: Queries en psql o Supabase Dashboard

### 3.4 Performance testing
- [ ] Verificar que migración no degradó performance (estimate: 15min)
  - EXPLAIN ANALYZE en `/api/reservations/list` query
  - Verificar que índices se usan (debe aparecer "Index Scan" en explain)
  - Benchmark: Query debe tomar < 50ms (tabla tiene ~150 rows)
  - Files: N/A (ejecutar en psql)
  - Agent: **@agent-database-agent**
  - Test: `EXPLAIN ANALYZE SELECT ... FROM guest_reservations WHERE document_number = 'AB123456';`

### 3.5 Crear rollback script
- [ ] Preparar script de rollback si algo falla (estimate: 15min)
  - DROP COLUMN para cada uno de los 9 campos SIRE
  - DROP INDEX para índices creados
  - Comentarios explicando cuándo usar (solo si migración falla)
  - Files: `scripts/rollback-sire-fields-migration.sql`
  - Agent: **@agent-database-agent**
  - Test: Aplicar rollback en dev branch, verificar que campos desaparecen

### 3.6 Documentar resultados de testing
- [ ] Crear documentación de testing (estimate: 30min)
  - Documento `TESTS.md` en docs/sire-compliance-extension/fase-3/
  - Incluir: Queries ejecutadas, resultados esperados vs actuales
  - Screenshots de Supabase Dashboard (estructura de tabla)
  - Log de test end-to-end (output completo)
  - Performance benchmarks (tiempos de query)
  - Files: `docs/sire-compliance-extension/fase-3/TESTS.md`
  - Agent: **@agent-backend-developer**
  - Test: Revisar documento para completeness

---

## 📊 PROGRESO

**Total Tasks:** 15
**Completed:** 0/15 (0%)

**Por Fase:**
- FASE 1: 0/4 tareas (Database Migration)
- FASE 2: 0/5 tareas (Backend Integration)
- FASE 3: 0/6 tareas (Testing & Validation)

**Tiempo Estimado Total:** ~7 horas
- FASE 1: ~2h 15min
- FASE 2: ~3h 15min
- FASE 3: ~2h 45min

---

**Última actualización:** 6 Octubre 2025
**Estado:** 📋 Planificación completa - Listo para FASE 1
