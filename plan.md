# SIRE Compliance Data Extension - Plan de Implementación

**Proyecto:** SIRE Compliance Data Extension
**Fecha Inicio:** 6 Octubre 2025
**Estado:** 📋 Planificación

---

## 🎯 OVERVIEW

### Objetivo Principal

Extender la tabla `guest_reservations` con los 9 campos SIRE faltantes para cumplir con los requisitos de compliance del Sistema de Información y Registro de Extranjeros (SIRE - Migración Colombia).

### ¿Por qué?

- **Compliance Legal**: SIRE requiere 13 campos obligatorios para reportar huéspedes extranjeros. Actualmente solo tenemos 4/13 campos.
- **Gap Crítico**: El sistema de compliance chat extrae datos del huésped pero NO hay dónde persistirlos en la base de datos.
- **Prevención de Errores**: Sin campos estructurados, los datos quedan solo en `compliance_submissions.data` (JSONB) sin validación ni tipado.
- **Integración**: Los datos de identidad deben estar vinculados a la reserva para auditorías y reportes.

### Alcance

- ✅ Agregar 9 campos SIRE a tabla `guest_reservations`
- ✅ Migración con datos existentes de `compliance_submissions`
- ✅ Actualizar APIs de reservas para incluir campos compliance
- ✅ Modificar compliance chat engine para persistir datos
- ✅ Testing completo (migración + APIs + integración)
- ❌ **NO incluye**: UI para editar datos (se mantiene chat como entrada)
- ❌ **NO incluye**: Cambios en MotoPress sync (campos nullable, no afectan)

---

## 📊 ESTADO ACTUAL

### Sistema Existente

- ✅ Tabla `guest_reservations` con datos básicos de reserva
- ✅ Sistema de compliance chat funcional (extrae datos con Claude)
- ✅ Tabla `compliance_submissions` para tracking de envíos SIRE
- ✅ Mappers conversational→SIRE en `src/lib/sire/field-mappers.ts`
- ✅ 13 campos SIRE documentados en `docs/sire/CODIGOS_OFICIALES.md`

### Limitaciones Actuales

#### 1. Campos SIRE Faltantes en `guest_reservations`

**Campos actuales:**
```typescript
interface Reservation {
  id: string
  tenant_id: string
  reservation_code: string
  guest_name: string              // ✅ Mapeable a SIRE
  guest_email: string | null
  phone_full: string
  phone_last_4: string
  check_in_date: string           // ✅ Mapeable a fecha_movimiento
  check_out_date: string
  status: 'active' | 'cancelled' | 'pending'
  accommodation_unit_id: string | null
  external_booking_id: string | null
  booking_source: string
  total_price: number | null
  currency: string
  created_at: string
  guest_country: string           // ✅ Mapeable a codigo_nacionalidad
}
```

**Campos SIRE obligatorios FALTANTES:**
1. ❌ `document_type` (tipo_documento: 3=Pasaporte, 5=Cédula, 10=PEP, 46=Diplomático)
2. ❌ `document_number` (numero_identificacion: alfanumérico 6-15 chars sin guiones)
3. ❌ `birth_date` (fecha_nacimiento: DATE - almacenado como Date, mostrado DD/MM/YYYY)
4. ❌ `first_surname` (primer_apellido: solo letras incluyendo acentos, máx 50 chars)
5. ❌ `second_surname` (segundo_apellido: solo letras incluyendo acentos, máx 50 chars, PUEDE estar vacío)
6. ❌ `given_names` (nombres: solo letras incluyendo acentos, máx 50 chars)
7. ❌ `nationality_code` (codigo_nacionalidad: código numérico 1-3 dígitos)
8. ❌ `origin_country_code` (lugar_procedencia: código numérico 1-6 dígitos - soporta ISO + DIVIPOLA)
9. ❌ `destination_country_code` (lugar_destino: código numérico 1-6 dígitos - soporta ISO + DIVIPOLA)

#### 2. Gap en Compliance Chat Engine

**Problema:**
- Compliance chat extrae `conversational_data` correctamente
- Mapea a `sire_data` (13 campos) correctamente
- **PERO** solo guarda en `compliance_submissions.data` (JSONB)
- NO persiste en `guest_reservations` → Datos perdidos si submission falla

**Archivo afectado:**
- `src/lib/compliance-chat-engine.ts` - No actualiza reserva con datos extraídos

#### 3. APIs Sin Campos Compliance

**Endpoints afectados:**
- `/api/reservations/list` - No retorna campos SIRE
- `/api/guest/conversations` - No valida si guest tiene datos compliance completos

---

## 🚀 ESTADO DESEADO

### Nueva Experiencia

**Para el Guest:**
- Datos de identidad capturados durante compliance chat quedan vinculados permanentemente a su reserva
- Si vuelve a iniciar sesión, sus datos persisten (no necesita re-llenar)

**Para Staff/Admin:**
- Pueden ver datos compliance del guest desde la reserva
- Auditorías más fáciles (datos estructurados vs JSONB)

**Para el Sistema:**
- Validaciones SIRE en base de datos (tipo de documento válido, formato de pasaporte)
- Datos compliance disponibles para reportes y analytics
- Integridad referencial (CASCADE deletes, constraints)

### Características Clave

1. **Campos SIRE Estructurados**: 9 columnas tipadas en `guest_reservations`
2. **Migración de Datos Existentes**: Poblar desde `compliance_submissions` si existen
3. **Validación en BD**: Constraints para tipos de documento, códigos de país
4. **API Actualizada**: Endpoints retornan campos compliance
5. **Compliance Engine Mejorado**: Persiste datos en reserva + submission

---

## 📱 TECHNICAL STACK

### Backend
- **Database**: PostgreSQL 17.4 (Supabase)
- **ORM/Queries**: Supabase RPC functions
- **Migrations**: Supabase CLI migrations

### Business Logic
- **Field Mapping**: `src/lib/sire/field-mappers.ts` (ya existe)
- **Compliance Engine**: `src/lib/compliance-chat-engine.ts` (a modificar)
- **Validation**: DB constraints + TypeScript validators

### Testing
- **SQL Validation**: Migrations dry-run en dev branch
- **API Testing**: cURL tests para endpoints
- **Integration**: End-to-end compliance flow test

---

## 🔧 DESARROLLO - FASES

### FASE 1: Database Migration (2h)

**Objetivo:** Agregar 9 campos SIRE a `guest_reservations` con validaciones y constraints

**Entregables:**
1. Migración SQL con 9 nuevas columnas
2. Constraints para tipos de documento válidos
3. Índices para búsquedas por documento
4. Script de migración de datos desde `compliance_submissions`

**Archivos a crear/modificar:**
- `supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql` (NUEVO)
- `scripts/migrate-compliance-data-to-reservations.sql` (NUEVO - opcional)

**Campos a agregar:**
```sql
ALTER TABLE public.guest_reservations ADD COLUMN
  -- SIRE Identity Fields
  document_type VARCHAR(2),              -- '3', '5', '10', '46'
  document_number VARCHAR(15),           -- Pasaporte/cédula 6-15 chars (sin guiones)
  birth_date DATE,                       -- Fecha de nacimiento

  -- SIRE Name Fields (separados, con acentos)
  first_surname VARCHAR(50),             -- Primer apellido (MAYÚSCULAS, con acentos)
  second_surname VARCHAR(50),            -- Segundo apellido (opcional, PUEDE estar vacío)
  given_names VARCHAR(50),               -- Nombres (MAYÚSCULAS, con acentos)

  -- SIRE Country Codes (soportan ISO 3166-1 + DIVIPOLA)
  nationality_code VARCHAR(3),           -- Código país nacionalidad 1-3 dígitos (ej: "840")
  origin_country_code VARCHAR(6),        -- País/ciudad procedencia 1-6 dígitos
  destination_country_code VARCHAR(6);   -- País/ciudad destino 1-6 dígitos
```

**Validaciones:**
```sql
-- Constraint: Tipo de documento válido (SOLO 4 códigos oficiales SIRE)
ALTER TABLE guest_reservations ADD CONSTRAINT check_document_type
  CHECK (document_type IS NULL OR document_type IN ('3', '5', '10', '46'));

-- Constraint: Número de documento alfanumérico 6-15 chars (según CODIGOS_OFICIALES.md)
ALTER TABLE guest_reservations ADD CONSTRAINT check_document_number_format
  CHECK (document_number IS NULL OR (LENGTH(document_number) BETWEEN 6 AND 15 AND document_number ~ '^[A-Z0-9]+$'));

-- Constraint: Apellidos solo letras (incluyendo acentos y Ñ), máx 50 chars
ALTER TABLE guest_reservations ADD CONSTRAINT check_first_surname_format
  CHECK (first_surname IS NULL OR first_surname ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

-- Constraint: Segundo apellido (PUEDE estar vacío - regex permite {0,50})
ALTER TABLE guest_reservations ADD CONSTRAINT check_second_surname_format
  CHECK (second_surname IS NULL OR second_surname ~ '^[A-ZÁÉÍÓÚÑ ]{0,50}$');

-- Constraint: Nombres solo letras (incluyendo acentos), máx 50 chars
ALTER TABLE guest_reservations ADD CONSTRAINT check_given_names_format
  CHECK (given_names IS NULL OR given_names ~ '^[A-ZÁÉÍÓÚÑ ]{1,50}$');

-- Constraint: Código nacionalidad numérico 1-3 dígitos (flexibilidad para catálogos futuros)
ALTER TABLE guest_reservations ADD CONSTRAINT check_nationality_code_format
  CHECK (nationality_code IS NULL OR nationality_code ~ '^\d{1,3}$');

-- Constraint: Códigos lugar (procedencia/destino) 1-6 dígitos (soporta ISO + DIVIPOLA)
ALTER TABLE guest_reservations ADD CONSTRAINT check_origin_code_format
  CHECK (origin_country_code IS NULL OR origin_country_code ~ '^\d{1,6}$');

ALTER TABLE guest_reservations ADD CONSTRAINT check_destination_code_format
  CHECK (destination_country_code IS NULL OR destination_country_code ~ '^\d{1,6}$');
```

**Índices:**
```sql
-- Búsquedas por documento (compliance audits)
CREATE INDEX idx_guest_reservations_document ON guest_reservations(document_number) WHERE document_number IS NOT NULL;

-- Búsquedas por nacionalidad (reportes)
CREATE INDEX idx_guest_reservations_nationality ON guest_reservations(nationality_code) WHERE nationality_code IS NOT NULL;
```

**Testing:**
- Verificar que migración aplica sin errores
- Verificar que constraints funcionan (rechaza valores inválidos)
- Verificar que índices se crean correctamente
- Verificar que datos existentes NO se rompen (campos nullable)

---

### FASE 2: Backend Integration (3h)

**Objetivo:** Actualizar compliance engine y APIs para usar nuevos campos SIRE

**Entregables:**
1. Compliance chat engine actualizado (persiste en guest_reservations)
2. API `/api/reservations/list` retorna campos SIRE
3. Función helper para sincronizar compliance_submissions → guest_reservations
4. TypeScript types actualizados

**Archivos a modificar:**

#### 2.1 Update TypeScript Types
- `src/lib/compliance-chat-engine.ts`
  - Líneas ~50-100: Agregar campos SIRE a `GuestReservation` interface
  - Líneas ~200-250: Función `persistComplianceDataToReservation()`

#### 2.2 Update Compliance Engine
- `src/lib/compliance-chat-engine.ts`
  - Función nueva: `updateReservationWithComplianceData()`
  ```typescript
  async function updateReservationWithComplianceData(
    reservationId: string,
    sireData: SIREData
  ): Promise<void> {
    const { data, error } = await supabase
      .from('guest_reservations')
      .update({
        document_type: sireData.tipo_documento,
        document_number: sireData.numero_identificacion,
        birth_date: parseSIREDate(sireData.fecha_nacimiento),
        first_surname: sireData.primer_apellido,
        second_surname: sireData.segundo_apellido,
        given_names: sireData.nombres,
        nationality_code: sireData.codigo_nacionalidad,
        origin_country_code: sireData.lugar_procedencia,
        destination_country_code: sireData.lugar_destino,
      })
      .eq('id', reservationId)

    if (error) throw error
  }
  ```

#### 2.3 Update Reservation API
- `src/app/api/reservations/list/route.ts`
  - Agregar campos SIRE a SELECT query
  - Actualizar return type para incluir campos compliance

#### 2.4 Helper: Sync Script
- `scripts/sync-compliance-to-reservations.ts` (NUEVO)
  - Lee `compliance_submissions` exitosas
  - Actualiza `guest_reservations` con datos SIRE
  - Log de resultados (cuántos actualizados)

**Testing:**
- Test unitario: `parseSIREDate()` convierte DD/MM/YYYY → Date
- Test API: `/api/reservations/list` retorna nuevos campos
- Test integration: Compliance chat → persiste en guest_reservations
- Test script: Sync pobla datos correctamente

---

### FASE 3: Testing & Validation (2h)

**Objetivo:** Validar que todo el flujo compliance funciona end-to-end

**Entregables:**
1. Script de validación SQL (queries para verificar datos)
2. Test end-to-end de compliance flow
3. Documentación de testing results
4. Rollback plan si algo falla

**Archivos a crear:**

#### 3.1 Validation Queries
- `scripts/validate-sire-compliance-data.sql` (NUEVO)
```sql
-- 1. Verificar que campos SIRE existen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'guest_reservations'
  AND column_name IN ('document_type', 'document_number', 'birth_date', ...);

-- 2. Contar reservas con datos compliance completos
SELECT
  COUNT(*) FILTER (WHERE document_number IS NOT NULL) as with_document,
  COUNT(*) FILTER (WHERE birth_date IS NOT NULL) as with_birthdate,
  COUNT(*) FILTER (WHERE first_surname IS NOT NULL) as with_surname,
  COUNT(*) as total_reservations
FROM guest_reservations;

-- 3. Validar formatos (deben pasar constraints)
SELECT id, document_type, document_number
FROM guest_reservations
WHERE document_type IS NOT NULL
  AND document_type NOT IN ('3', '5', '10', '46');
-- Debe retornar 0 rows

-- 4. Verificar migración de datos desde compliance_submissions
SELECT
  gr.id,
  gr.guest_name,
  gr.document_number as reservations_doc,
  cs.data->>'numero_identificacion' as submissions_doc
FROM guest_reservations gr
LEFT JOIN compliance_submissions cs ON cs.guest_id = gr.id
WHERE cs.status = 'success'
  AND gr.document_number IS NULL;
-- Debe retornar 0 rows (todos migrados)
```

#### 3.2 End-to-End Test
- `scripts/test-compliance-flow.ts` (NUEVO)
```typescript
// 1. Crear guest reservation de prueba
// 2. Simular compliance chat (extraer datos)
// 3. Verificar que datos se persisten en guest_reservations
// 4. Verificar que submission también se crea
// 5. Verificar que API retorna datos compliance
// 6. Cleanup: Borrar datos de prueba
```

#### 3.3 Rollback Plan
- `scripts/rollback-sire-fields-migration.sql` (NUEVO)
```sql
-- Si algo falla, revertir migración
ALTER TABLE guest_reservations
  DROP COLUMN IF EXISTS document_type,
  DROP COLUMN IF EXISTS document_number,
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS first_surname,
  DROP COLUMN IF EXISTS second_surname,
  DROP COLUMN IF EXISTS given_names,
  DROP COLUMN IF EXISTS nationality_code,
  DROP COLUMN IF EXISTS origin_country_code,
  DROP COLUMN IF EXISTS destination_country_code;
```

**Testing:**
- ✅ Migración aplica correctamente
- ✅ Constraints validan datos
- ✅ APIs retornan campos nuevos
- ✅ Compliance engine persiste datos
- ✅ Datos existentes migrados desde submissions
- ✅ End-to-end flow funciona

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] 9 campos SIRE agregados a `guest_reservations` con tipos correctos
- [ ] Constraints validan tipos de documento (3, 5, 10, 46)
- [ ] Constraints validan formatos (solo letras en nombres, numérico en códigos)
- [ ] Migración de datos desde `compliance_submissions` completa (100%)
- [ ] Compliance engine actualiza `guest_reservations` al extraer datos
- [ ] API `/api/reservations/list` retorna campos SIRE
- [ ] Guest puede re-autenticarse y ver datos compliance persistidos

### Data Integrity
- [ ] 0 errores en migración SQL
- [ ] 0 datos existentes corruptos (campos nullable protegen data actual)
- [ ] Índices creados correctamente (verificar con `\d guest_reservations`)
- [ ] Foreign keys intactos después de migración

### Performance
- [ ] Migración completa en < 5 segundos (tabla tiene ~150 rows)
- [ ] Queries de API no degradadas (agregar EXPLAIN ANALYZE)
- [ ] Índices mejoran búsquedas por documento (< 10ms)

### Documentation
- [ ] Migración documentada con comentarios SQL
- [ ] TypeScript types actualizados (no errores de compilación)
- [ ] Testing results documentados en `TESTS.md`
- [ ] Rollback plan probado (en dev)

---

## 🤖 AGENTES REQUERIDOS

### 1. **@agent-database-agent** (Principal)

**Responsabilidad:** Migraciones de base de datos, validaciones SQL, constraints

**Tareas:**
- **FASE 1**:
  - Crear migración con 9 campos SIRE
  - Agregar constraints de validación
  - Crear índices para búsquedas
  - Script de migración de datos desde compliance_submissions
  - Aplicar migración en dev
  - Verificar con queries SQL

- **FASE 3**:
  - Crear queries de validación
  - Ejecutar validaciones post-migración
  - Verificar integridad de datos
  - Crear rollback script

**Archivos:**
- `supabase/migrations/20251007000000_add_sire_fields_to_guest_reservations.sql`
- `scripts/migrate-compliance-data-to-reservations.sql`
- `scripts/validate-sire-compliance-data.sql`
- `scripts/rollback-sire-fields-migration.sql`

---

### 2. **@agent-backend-developer** (Secundario)

**Responsabilidad:** Backend integration, APIs, compliance engine updates

**Tareas:**
- **FASE 2**:
  - Actualizar TypeScript types en compliance engine
  - Crear función `updateReservationWithComplianceData()`
  - Modificar API `/api/reservations/list` para retornar campos SIRE
  - Crear helper script para sync compliance → reservations
  - Testing de APIs

- **FASE 3**:
  - Crear test end-to-end de compliance flow
  - Ejecutar tests de integración
  - Validar que APIs funcionan correctamente

**Archivos:**
- `src/lib/compliance-chat-engine.ts`
- `src/app/api/reservations/list/route.ts`
- `scripts/sync-compliance-to-reservations.ts`
- `scripts/test-compliance-flow.ts`

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
/Users/oneill/Sites/apps/InnPilot/
├── supabase/migrations/
│   └── 20251007000000_add_sire_fields_to_guest_reservations.sql (NUEVO)
├── scripts/
│   ├── migrate-compliance-data-to-reservations.sql (NUEVO)
│   ├── validate-sire-compliance-data.sql (NUEVO)
│   ├── rollback-sire-fields-migration.sql (NUEVO)
│   ├── sync-compliance-to-reservations.ts (NUEVO)
│   └── test-compliance-flow.ts (NUEVO)
├── src/lib/
│   └── compliance-chat-engine.ts (MODIFICAR)
├── src/app/api/reservations/list/
│   └── route.ts (MODIFICAR)
└── docs/
    └── sire-compliance-extension/
        ├── fase-1/
        │   ├── IMPLEMENTATION.md
        │   ├── CHANGES.md
        │   ├── TESTS.md
        │   └── ISSUES.md
        ├── fase-2/
        │   └── (same structure)
        └── fase-3/
            └── (same structure)
```

---

## 📝 NOTAS IMPORTANTES

### Consideraciones Técnicas

1. **Campos Nullable**: Todos los campos SIRE son `NULL` por defecto para no romper:
   - Reservas existentes sin datos compliance
   - MotoPress sync (no envía estos campos)
   - Reservas manuales sin compliance

2. **Separación de Nombres**:
   - Actualmente: `guest_name` (texto libre "Juan García Pérez")
   - Nuevo: `first_surname`, `second_surname`, `given_names` (separados)
   - **NO reemplazar** `guest_name` (se mantiene para display)
   - Campos SIRE son adicionales para compliance

3. **Códigos de País y Ciudad**:
   - ✅ Catálogos oficiales SIRE disponibles (Octubre 6, 2025)
   - **Países**: `_assets/sire/codigos-pais.json` (250 países) - Códigos SIRE propietarios, NO ISO 3166-1
   - **Ciudades**: `_assets/sire/ciudades-colombia.json` (1,122 ciudades) - Códigos DIVIPOLA
   - **Helper TS**: `_assets/sire/codigos-sire.ts` (funciones de búsqueda)
   - Mapper actualizado: `src/lib/sire/field-mappers.ts` (usa códigos SIRE correctos)
   - **Referencias**: `docs/sire/CODIGOS_OFICIALES.md`, `docs/sire/FASE_3.1_ESPECIFICACIONES_CORREGIDAS.md`

4. **Migración de Datos Existentes**:
   - Solo migrar desde `compliance_submissions` con `status = 'success'`
   - Si hay múltiples submissions para mismo guest, usar la más reciente
   - Log de cuántos guest_reservations se actualizaron

5. **Compatibilidad con MotoPress**:
   - MotoPress sync NO envía campos SIRE
   - Campos nullable aseguran que sync sigue funcionando
   - Compliance data se llena solo vía compliance chat

6. **Testing en Dev Branch**:
   - Aplicar migración primero en dev branch de Supabase
   - Validar con datos de test
   - Solo después aplicar en producción

---

**Última actualización:** 6 Octubre 2025
**Próximo paso:** Actualizar TODO.md con tareas específicas por fase
