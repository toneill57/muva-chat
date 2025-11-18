# Prompt para Validación de Hipótesis: Multi-Tenant Accommodation Data

**Contexto:** MUVA Chat - Multi-tenant platform con arquitectura subdomain-based
**Objetivo:** VALIDAR hipótesis sobre data distribution ANTES de implementar fix
**Modo:** INVESTIGACIÓN READ-ONLY (NO hacer cambios)

---

## 📋 Instrucciones para Nueva Conversación

Copia y pega el siguiente prompt en una conversación NUEVA de Claude Code:

---

# INVESTIGACIÓN: Multi-Tenant Accommodation Data Distribution

## Contexto del Problema

Estoy investigando una hipótesis sobre distribución inconsistente de datos de accommodations en un sistema multi-tenant.

**Síntomas observados:**
1. Booking sync no encuentra accommodation units para tenant "tucasaenelmar"
2. Manual upload muestra FK error pero guarda datos
3. MyStay chat header no muestra nombre del alojamiento

**Hipótesis:**
Los datos de accommodations están divididos entre dos tablas:
- `hotels.accommodation_units` (nueva arquitectura - "source of truth")
- `accommodation_units_public` (tabla legacy/deprecated)

Algunos tenants tienen datos SOLO en `accommodation_units_public`, causando que los RPCs que buscan en `hotels.accommodation_units` fallen.

## Tu Misión

**VALIDAR esta hipótesis** mediante análisis read-only de la base de datos.

**NO implementar soluciones** - solo confirmar o rechazar la hipótesis con evidencia concreta.

---

## Fase 1: Auditoría de Distribución de Datos

### Query 1: Distribución por Tenant

Ejecuta este query para ver cómo están distribuidos los datos:

```sql
SELECT
  tr.slug AS tenant_slug,
  tr.tenant_id,
  tr.razon_social,
  (SELECT COUNT(*)
   FROM hotels.accommodation_units hau
   WHERE hau.tenant_id = tr.tenant_id::varchar) AS hotels_count,
  (SELECT COUNT(*)
   FROM accommodation_units_public aup
   WHERE aup.tenant_id = tr.tenant_id) AS public_count
FROM tenant_registry tr
ORDER BY tr.slug;
```

**Análisis esperado:**
- Si hipótesis CORRECTA → Algunos tenants con `hotels_count=0` pero `public_count>0`
- Si hipótesis INCORRECTA → Todos tenants tienen datos consistentes (ambos o ninguno)

**Documentar:**
- ¿Cuántos tenants tienen datos SOLO en public?
- ¿Cuántos tenants tienen datos en AMBOS?
- ¿Simmerdown está en qué categoría?
- ¿Tucasaenelmar está en qué categoría?

---

### Query 2: Casos Específicos - Simmerdown vs Tucasaenelmar

```sql
-- Simmerdown (tenant que FUNCIONA)
SELECT
  'simmerdown' AS tenant,
  (SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id IN
    (SELECT tenant_id::varchar FROM tenant_registry WHERE slug = 'simmerdown')) AS hotels,
  (SELECT COUNT(*) FROM accommodation_units_public WHERE tenant_id IN
    (SELECT tenant_id FROM tenant_registry WHERE slug = 'simmerdown')) AS public;

-- Tucasaenelmar (tenant que FALLA)
SELECT
  'tucasaenelmar' AS tenant,
  (SELECT COUNT(*) FROM hotels.accommodation_units WHERE tenant_id IN
    (SELECT tenant_id::varchar FROM tenant_registry WHERE slug = 'tucasaenelmar')) AS hotels,
  (SELECT COUNT(*) FROM accommodation_units_public WHERE tenant_id IN
    (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar')) AS public;
```

**Predicción si hipótesis correcta:**
- Simmerdown: `hotels > 0`, `public >= 0`
- Tucasaenelmar: `hotels = 0`, `public > 0`

---

### Query 3: Análisis de Metadata

Verifica si `accommodation_units_public` tiene la estructura necesaria para migrar:

```sql
SELECT
  tenant_id,
  name,
  metadata ? 'motopress_unit_id' AS has_motopress_unit_id,
  metadata ? 'motopress_type_id' AS has_motopress_type_id,
  metadata->>'motopress_unit_id' AS motopress_unit_id_value,
  metadata->>'motopress_type_id' AS motopress_type_id_value
FROM accommodation_units_public
WHERE tenant_id = (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar')
LIMIT 5;
```

**Análisis:**
- ¿Todos los records tienen `motopress_unit_id` en metadata?
- ¿Todos los records tienen `motopress_type_id` en metadata?
- ¿Los valores son integers válidos?

---

## Fase 2: Validación de RPCs

### Test 1: get_accommodation_unit_by_motopress_id

```sql
-- Caso de fallo conocido (tucasaenelmar, motopress_type_id=12419)
SELECT * FROM get_accommodation_unit_by_motopress_id(
  (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar'),
  12419
);
-- Predicción: 0 rows (confirma hipótesis)

-- Caso de éxito (simmerdown - usar un type_id que sepas que existe)
-- Primero obtener un type_id válido:
SELECT (metadata->>'motopress_type_id')::int AS type_id
FROM accommodation_units_public
WHERE tenant_id = (SELECT tenant_id FROM tenant_registry WHERE slug = 'simmerdown')
LIMIT 1;

-- Luego probar el RPC:
SELECT * FROM get_accommodation_unit_by_motopress_id(
  (SELECT tenant_id FROM tenant_registry WHERE slug = 'simmerdown'),
  <type_id_obtenido>
);
-- Predicción: 1+ rows (simmerdown funciona)
```

---

### Test 2: get_accommodation_unit_by_id

```sql
-- Obtener un unit_id de tucasaenelmar que existe en public
SELECT unit_id
FROM accommodation_units_public
WHERE tenant_id = (SELECT tenant_id FROM tenant_registry WHERE slug = 'tucasaenelmar')
LIMIT 1;

-- Probar el RPC
SELECT * FROM get_accommodation_unit_by_id(
  '<unit_id_obtenido>'::uuid,
  (SELECT tenant_id::varchar FROM tenant_registry WHERE slug = 'tucasaenelmar')
);
-- Predicción: 0 rows si lookup primario falla, 1 row si fallback funciona
```

**Documentar:**
- ¿El RPC devuelve resultados?
- ¿Usa el lookup primario (hotels) o el fallback (public)?

---

## Fase 3: Comparación de Esquemas

### Query 4: Estructura de hotels.accommodation_units

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'hotels'
  AND table_name = 'accommodation_units'
ORDER BY ordinal_position;
```

### Query 5: Estructura de accommodation_units_public

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'accommodation_units_public'
ORDER BY ordinal_position;
```

**Análisis:**
- ¿Qué campos están en `hotels` pero NO en `public`?
- ¿`accommodation_units_public.metadata` contiene los campos faltantes?
- ¿Es factible extraer datos de metadata JSONB?

---

## Fase 4: Verificación de FK Constraint

### Query 6: Información del Constraint

```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'accommodation_units_manual_chunks'
  AND tc.constraint_type = 'FOREIGN KEY';
```

**Verificar:**
- ¿El FK `accommodation_unit_id` apunta a `hotels.accommodation_units(id)`?
- ¿Hay otros FKs en esta tabla?

---

## Criterios de Validación

### ✅ Hipótesis CONFIRMADA si:

1. **Data Distribution:**
   - Al menos 1 tenant tiene `hotels_count=0` Y `public_count>0`
   - Tucasaenelmar específicamente cumple esta condición
   - Simmerdown tiene `hotels_count>0`

2. **RPC Failures:**
   - `get_accommodation_unit_by_motopress_id` devuelve 0 rows para tucasaenelmar
   - Mismo RPC devuelve 1+ rows para simmerdown

3. **Schema Compatibility:**
   - `accommodation_units_public.metadata` contiene campos necesarios
   - Mapeo de campos es posible

4. **FK Constraint:**
   - Confirma que apunta a `hotels.accommodation_units`

### ❌ Hipótesis RECHAZADA si:

1. TODOS los tenants tienen datos consistentes (ambos o ninguno)
2. Tucasaenelmar SÍ tiene datos en `hotels.accommodation_units`
3. RPCs funcionan correctamente para tucasaenelmar
4. Simmerdown también falla (problema no es tenant-specific)

---

## Entregables

Al finalizar la investigación, proporciona:

### 1. Resumen Ejecutivo
```
HIPÓTESIS: [CONFIRMADA / RECHAZADA / PARCIALMENTE CONFIRMADA]

EVIDENCIA:
- Tenants con datos solo en public: [número]
- Tenants con datos solo en hotels: [número]
- Tenants con datos en ambos: [número]
- Tenants sin datos: [número]

CASOS ESPECÍFICOS:
- Simmerdown: hotels=[X], public=[Y] → [funciona/no funciona]
- Tucasaenelmar: hotels=[X], public=[Y] → [funciona/no funciona]
```

### 2. Tabla de Distribución
```
| Tenant | hotels_count | public_count | RPC Success | MyStay Header |
|--------|--------------|--------------|-------------|---------------|
| simmerdown | X | Y | ✅/❌ | ✅/❌ |
| tucasaenelmar | X | Y | ✅/❌ | ✅/❌ |
| ... | ... | ... | ... | ... |
```

### 3. Análisis de Metadata
```
- ¿Metadata completo? [SÍ/NO]
- ¿Campos faltantes? [lista]
- ¿Mapeo factible? [SÍ/NO + razón]
```

### 4. Recomendación

**SI HIPÓTESIS CONFIRMADA:**
```
RECOMENDACIÓN: Proceder con migración de datos
RIESGO: [BAJO/MEDIO/ALTO]
CONFIANZA: [ALTA/MEDIA/BAJA]
SIGUIENTE PASO: Diseñar script de migración
```

**SI HIPÓTESIS RECHAZADA:**
```
RECOMENDACIÓN: Re-investigar causa raíz
HALLAZGOS INESPERADOS: [descripción]
SIGUIENTE PASO: [nueva dirección de investigación]
```

---

## Notas Importantes

1. **NO ejecutar ningún comando de escritura** (INSERT, UPDATE, DELETE, ALTER)
2. **NO modificar migraciones existentes**
3. **Usar solo queries SELECT** para validación
4. **Documentar TODO lo que encuentres**, incluso si contradice la hipótesis
5. **Si encuentras algo inesperado**, detente y documéntalo antes de continuar

---

## Herramientas Disponibles

```bash
# MCP Supabase para queries
mcp__supabase__execute_sql

# Lectura de migraciones
Read supabase/migrations/20251117171052_fix_accommodation_lookup_use_hotels_schema.sql
Read supabase/migrations/20251117140000_fix_get_accommodation_unit_by_id_search_path.sql

# Lectura de código relevante
Read src/lib/integrations/motopress/sync-manager.ts
Read src/lib/guest-auth.ts
Read src/lib/integrations/motopress/bookings-mapper.ts
```

---

**RECORDATORIO FINAL:** Tu objetivo es VALIDAR, no SOLUCIONAR. La solución vendrá después de que confirmemos la hipótesis con evidencia sólida.

¿Listo para comenzar la investigación?
