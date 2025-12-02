# Fix Completo: "Sin nombre" en Tarjetas de Reservas

**Fecha:** 2025-11-08
**Estado:** ✅ RESUELTO
**Ambiente:** Staging (hoaiwcueleiemeplrurv)

---

## 🔴 Problema Original

Las tarjetas de reservas en el dashboard staff mostraban "Sin nombre" en lugar de mostrar los nombres de los alojamientos (Sunshine, Summertime, Kaya, etc.).

### Síntomas

- ✅ Base de datos tenía alojamientos correctamente sincronizados en `hotels.accommodation_units`
- ✅ Reservas se creaban correctamente en `guest_reservations`
- ❌ Tabla `reservation_accommodations` NO se poblaba (0 registros)
- ❌ UI mostraba "Sin nombre" porque no había datos en la junction table

---

## 🔍 Causa Raíz

**TRES errores** apuntaban a la tabla **EQUIVOCADA**:

### Arquitectura de Tablas (Recordatorio)

```
┌─────────────────────────────────────────┐
│ METADATA SYSTEM (Para Staff/Admin)     │
├─────────────────────────────────────────┤
│  hotels.accommodation_units             │
│  - SOURCE OF TRUTH para reservas       │
│  - Contiene: name, price, capacity      │
│  - tenant_id: VARCHAR (importante!)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PUBLIC CHAT SYSTEM (Para Visitantes)   │
├─────────────────────────────────────────┤
│  accommodation_units_public             │
│  - Embeddings para búsqueda semántica  │
│  - Chunks (5-7 por accommodation)       │
│  - NO vincula reservas                  │
└─────────────────────────────────────────┘
```

---

## 🐛 Los 3 Errores Encontrados

### Error #1: FK Constraint Incorrecto

**Problema:**
```sql
-- ❌ INCORRECTO
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
    FOREIGN KEY (accommodation_unit_id)
    REFERENCES public.accommodation_units_public(unit_id);
```

**Solución:**
```sql
-- 1. Drop FK incorrecto
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey;

-- 2. Crear FK correcto
ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
    FOREIGN KEY (accommodation_unit_id)
    REFERENCES hotels.accommodation_units(id)
    ON DELETE CASCADE;
```

**Error detectado:**
```
Key (accommodation_unit_id)=(4c565143-89a5-5e22-a881-2e6c7a40aa4c)
is not present in table "accommodation_units_public"
```

---

### Error #2: RPC Function Incorrecta

**Problema:**
```sql
-- ❌ INCORRECTO - Buscaba en accommodation_units_public
CREATE FUNCTION get_accommodation_units_by_ids(p_unit_ids uuid[])
RETURNS TABLE (...)
AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM public.accommodation_units_public aup  -- ❌ TABLA EQUIVOCADA
  WHERE aup.unit_id = ANY(p_unit_ids);
END;
$$;
```

**Solución:**
```sql
-- ✅ CORRECTO - Buscar en hotels.accommodation_units
DROP FUNCTION IF EXISTS get_accommodation_units_by_ids(uuid[]);

CREATE OR REPLACE FUNCTION get_accommodation_units_by_ids(p_unit_ids uuid[])
RETURNS TABLE (
  id uuid,
  name character varying,
  unit_number character varying,
  unit_type character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  -- ✅ CORRECTO: hotels.accommodation_units
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.unit_number,
    au.unit_type
  FROM hotels.accommodation_units au
  WHERE au.id = ANY(p_unit_ids);
END;
$$;
```

**Impacto:** El API `/api/reservations/list` no podía obtener los nombres de alojamientos para mostrar en la UI.

---

### Error #3: Trigger con Type Mismatch

**Problema:**
```sql
-- ❌ INCORRECTO - Type mismatch: uuid vs varchar
CREATE FUNCTION auto_link_reservation_accommodation()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id uuid;  -- ❌ Declarado como uuid
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.guest_reservations
  WHERE id = NEW.reservation_id;

  SELECT au.id INTO NEW.accommodation_unit_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = v_tenant_id  -- ❌ au.tenant_id es VARCHAR!
    AND au.motopress_type_id = NEW.motopress_type_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Error detectado:**
```
operator does not exist: character varying = uuid
Hint: No operator matches the given name and argument types.
You might need to add explicit type casts.
```

**Causa:** `hotels.accommodation_units.tenant_id` es `VARCHAR`, pero el trigger declaraba `v_tenant_id` como `uuid`.

**Solución:**
```sql
-- ✅ CORRECTO - Tipos compatibles
CREATE OR REPLACE FUNCTION auto_link_reservation_accommodation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id VARCHAR;  -- ✅ Changed from uuid to VARCHAR
BEGIN
  IF NEW.accommodation_unit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.motopress_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cast uuid to VARCHAR para compatibilidad
  SELECT tenant_id::VARCHAR INTO v_tenant_id
  FROM public.guest_reservations
  WHERE id = NEW.reservation_id;

  -- ✅ Ahora ambos son VARCHAR
  SELECT au.id INTO NEW.accommodation_unit_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = v_tenant_id
    AND (
      au.motopress_type_id = NEW.motopress_type_id
      OR au.motopress_unit_id = NEW.motopress_type_id
    )
  LIMIT 1;

  RETURN NEW;
END;
$$;
```

**Impacto:** Todas las inserciones a `reservation_accommodations` fallaban con error 42883, causando que las reservas se guardaran sin vincular alojamientos.

---

## ✅ Solución Completa

### Paso 1: Arreglar FK Constraint
```sql
ALTER TABLE reservation_accommodations
  DROP CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey;

ALTER TABLE reservation_accommodations
  ADD CONSTRAINT reservation_accommodations_accommodation_unit_id_fkey
    FOREIGN KEY (accommodation_unit_id)
    REFERENCES hotels.accommodation_units(id)
    ON DELETE CASCADE;
```

### Paso 2: Arreglar RPC Function
```sql
DROP FUNCTION IF EXISTS get_accommodation_units_by_ids(uuid[]);

CREATE OR REPLACE FUNCTION get_accommodation_units_by_ids(p_unit_ids uuid[])
RETURNS TABLE (
  id uuid,
  name character varying,
  unit_number character varying,
  unit_type character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'hotels', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.name,
    au.unit_number,
    au.unit_type
  FROM hotels.accommodation_units au
  WHERE au.id = ANY(p_unit_ids);
END;
$$;
```

### Paso 3: Arreglar Trigger Function
```sql
CREATE OR REPLACE FUNCTION auto_link_reservation_accommodation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id VARCHAR;
BEGIN
  IF NEW.accommodation_unit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.motopress_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tenant_id::VARCHAR INTO v_tenant_id
  FROM public.guest_reservations
  WHERE id = NEW.reservation_id;

  SELECT au.id INTO NEW.accommodation_unit_id
  FROM hotels.accommodation_units au
  WHERE au.tenant_id = v_tenant_id
    AND (
      au.motopress_type_id = NEW.motopress_type_id
      OR au.motopress_unit_id = NEW.motopress_type_id
    )
  LIMIT 1;

  RETURN NEW;
END;
$$;
```

### Paso 4: Re-sync Reservations
Desde el dashboard staff:
1. Click "Sincronizar reservas"
2. Esperar a que termine el sync
3. Recargar página

---

## 📊 Resultados

### Antes del Fix
- `reservation_accommodations`: **0 registros**
- UI: **"Sin nombre"** en todas las tarjetas
- Errores en logs: FK violation + type mismatch

### Después del Fix
- `reservation_accommodations`: **85+ registros** correctamente vinculados
- UI: **Nombres correctos** (Sunshine, Summertime, Kaya, etc.)
- Sync sin errores: **✅ 93 reservas mapeadas exitosamente**

---

## 🔧 Archivos Modificados

### Base de Datos (via MCP)
1. `reservation_accommodations` FK constraint → `hotels.accommodation_units`
2. `get_accommodation_units_by_ids()` RPC → lee de `hotels.accommodation_units`
3. `auto_link_reservation_accommodation()` trigger → tipos VARCHAR compatibles

### Código (ningún cambio necesario)
- `/src/app/api/reservations/list/route.ts` - Ya estaba correcto
- `/src/components/reservations/UnifiedReservationCard.tsx` - Ya estaba correcto
- `/src/lib/integrations/motopress/bookings-mapper.ts` - Ya procesaba ICS imports

---

## 🎯 Lecciones Aprendidas

### 1. **SIEMPRE verificar constraints y RPCs después de migraciones**

Cuando se cambia arquitectura de tablas, verificar:
- FK constraints apuntan a tablas correctas
- RPC functions leen de tablas correctas
- Triggers usan tipos de datos compatibles

### 2. **No confundir accommodation_units_public con hotels.accommodation_units**

```
❌ accommodation_units_public → Para chat público (embeddings)
✅ hotels.accommodation_units → Para reservas staff (metadata)
```

### 3. **Type casting en PostgreSQL es crítico**

```sql
-- ❌ Error: uuid = varchar
WHERE tenant_id = v_tenant_id

-- ✅ Correcto: varchar = varchar
SELECT tenant_id::VARCHAR INTO v_tenant_id
WHERE tenant_id = v_tenant_id
```

### 4. **Debugging Order**
1. Verificar datos en DB (¿están los accommodations?)
2. Verificar junction table (¿están las vinculaciones?)
3. Verificar FK constraints (¿apuntan a tabla correcta?)
4. Verificar RPCs/triggers (¿leen de tabla correcta?)
5. Verificar frontend (¿renderiza datos correctamente?)

---

## 📚 Referencias

- Ver: `docs/troubleshooting/RESERVATION_NAME_DEBUGGING_GUIDE.md`
- Ver: `src/app/api/reservations/list/route.ts` (líneas 248-265)
- Ver: `src/components/reservations/UnifiedReservationCard.tsx` (líneas 460-478)

---

## ✅ Verificación Final

```sql
-- 1. Verificar FK constraint correcto
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.reservation_accommodations'::regclass
  AND conname LIKE '%accommodation_unit%';
-- Debe mostrar: REFERENCES hotels.accommodation_units(id)

-- 2. Verificar RPC lee de hotels schema
SELECT prosrc
FROM pg_proc
WHERE proname = 'get_accommodation_units_by_ids';
-- Debe contener: FROM hotels.accommodation_units au

-- 3. Verificar trigger con tipos correctos
SELECT prosrc
FROM pg_proc
WHERE proname = 'auto_link_reservation_accommodation';
-- Debe contener: v_tenant_id VARCHAR;

-- 4. Verificar datos en junction table
SELECT COUNT(*) FROM reservation_accommodations;
-- Debe ser > 0

-- 5. Verificar nombres se muestran
SELECT
  gr.guest_name,
  au.name as accommodation_name
FROM guest_reservations gr
JOIN reservation_accommodations ra ON gr.id = ra.reservation_id
JOIN hotels.accommodation_units au ON ra.accommodation_unit_id = au.id
LIMIT 5;
-- Debe mostrar nombres de accommodations
```

---

**Estado:** ✅ COMPLETAMENTE RESUELTO
**Fecha de resolución:** 2025-11-08 14:55 UTC
**Ambiente validado:** Staging (hoaiwcueleiemeplrurv)
