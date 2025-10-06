# FASE 0.1: Investigación de guest_information

**Proyecto:** Guest Chat - Arquitectura y Testing
**Fecha:** Octubre 1, 2025
**Estado:** ✅ Completado
**Duración:** ~15 minutos

---

## 🎯 Objetivo

Determinar si existe la tabla `guest_information` y qué tipo de información contiene, para validar la arquitectura de 3 dominios propuesta en el plan.

---

## ✅ Hallazgos

### 1. Tabla `guest_information` Existe

**Schema:** `hotels`
**Filas:** 96 totales
**Estado:** ✅ Poblada y funcional

#### Estructura de Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| info_id | uuid | PK |
| tenant_id | varchar(50) | FK a tenant (actualmente string, debería ser UUID) |
| property_id | uuid | FK a properties |
| info_type | varchar | Tipo: 'accommodation_operations', 'faq', 'arrival' |
| info_title | varchar | Título del chunk |
| info_content | text | Contenido completo |
| step_order | integer | Orden de presentación |
| is_active | boolean | Flag de activación |
| embedding | vector(3072) | Embedding completo (Tier 3) |
| embedding_balanced | vector(1536) | Embedding balanceado (Tier 2) |
| created_at | timestamptz | Timestamp de creación |
| updated_at | timestamptz | Timestamp de actualización |

**❌ Falta:** `embedding_fast` (1024d) - NO implementado en esta tabla

#### Distribución de Contenido

| info_type | Chunks | Avg Length | Scope |
|-----------|--------|------------|-------|
| accommodation_operations | 90 | 843 chars | **Unit-Specific** (9 unidades) |
| faq | 3 | 815 chars | **Hotel General** |
| arrival | 3 | 792 chars | **Hotel General** |

#### Desglose de Manuales Operativos (90 chunks)

| Manual | Chunks | Scope |
|--------|--------|-------|
| Manual Operativo - One Love | 14 | Solo One Love |
| Manual Operativo - Misty Morning | 13 | Solo Misty Morning |
| Manual Operativo - Natural Mystic | 11 | Solo Natural Mystic |
| Manual Operativo - Sunshine | 10 | Solo Sunshine |
| Manual Operativo - Kaya | 9 | Solo Kaya |
| Manual Operativo - Simmer Highs | 9 | Solo Simmer Highs |
| Manual Operativo - Dreamland | 8 | Solo Dreamland |
| Manual Operativo - Jammin | 8 | Solo Jammin |
| Manual Operativo - Summertime | 8 | Solo Summertime |

#### Contenido de Dominio 2 (Hotel General)

**FAQ (3 chunks):**
- Preguntas sobre precios y disponibilidad
- Política de pago (Bitcoin descuento 21%)
- Menores de edad y bebés
- Checkout y cobros adicionales

**Arrival (3 chunks):**
- Instrucciones de llegada en taxi ($20,000 COP)
- Llegada caminando (15 min desde aeropuerto)
- Dirección: Simmer Down en Sarie Bay

**Ejemplos de contenido:**
```
"¿Cómo es el pago?"
A través de la página web. Para reservas realizadas con más de 15 días...

"Lévame por favor a la posada Simmer Down en Sarie Bay, a la vuelta del supermercado Súper Éxito"
```

### 2. Tabla `accommodation_units_manual` Existe ✅

**Schema:** `public`
**Filas:** 10 (una por unidad)
**Estado:** ✅ Poblada y lista para usar

#### Estructura de Columnas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| unit_id | uuid | PK + FK a accommodation_units |
| manual_content | text | Manual operativo completo |
| detailed_instructions | text | Instrucciones detalladas |
| house_rules_specific | text | Reglas específicas de la unidad |
| emergency_info | text | Información de emergencias |
| wifi_password | text | **Contraseña WiFi** (privado) |
| safe_code | text | **Código caja fuerte** (privado) |
| appliance_guides | jsonb | Guías de electrodomésticos |
| local_tips | text | Tips locales |
| embedding | vector(3072) | Embedding completo (Tier 3) |
| embedding_balanced | vector(1536) | Embedding balanceado (Tier 2) |
| metadata | jsonb | Metadata adicional |
| created_at | timestamptz | Timestamp de creación |
| updated_at | timestamptz | Timestamp de actualización |

**✅ Ventaja:** Tiene campos específicos para datos privados (wifi_password, safe_code)

---

## 🚨 Problema Confirmado

### Código Actual: `conversational-chat-engine.ts:423-452`

```typescript
async function searchGuestInformation(
  embedding: number[],
  guestInfo: GuestSession
): Promise<VectorSearchResult[]> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('match_guest_information_balanced', {
    query_embedding: embedding,
    p_tenant_id: guestInfo.tenant_id,  // ✅ Filtra por tenant
    similarity_threshold: 0.3,
    match_count: 5,
  })
  // ❌ NO filtra por accommodation_unit_id
  // ❌ NO filtra por info_type
}
```

### Función RPC: `match_guest_information_balanced`

```sql
SELECT
  gi.info_id,
  gi.info_title,
  gi.info_content,
  gi.info_type,
  1 - (gi.embedding_balanced <=> query_embedding) as similarity
FROM hotels.guest_information gi
WHERE gi.tenant_id = p_tenant_id
  AND gi.embedding_balanced IS NOT NULL
  AND gi.is_active = true
  AND 1 - (gi.embedding_balanced <=> query_embedding) > similarity_threshold
ORDER BY gi.embedding_balanced <=> query_embedding
LIMIT match_count;
```

**❌ Filtros existentes:**
- tenant_id (correcto)
- is_active = true
- similarity > 0.3

**❌ Filtros faltantes:**
- accommodation_unit_id (para filtrar por unidad del huésped)
- info_type (para separar general vs unit-specific)

### Consecuencia del Problema

**Escenario:**
Roberto Mora está asignado a la unidad "Kaya" y pregunta:
> "¿Cuál es la contraseña del WiFi?"

**Búsqueda actual:**
1. Claude genera embedding de la query
2. Sistema busca en `guest_information` con `tenant_id = Simmerdown`
3. Devuelve top 5 resultados MÁS SIMILARES semánticamente
4. Puede incluir chunks de "Manual Operativo - One Love" si hay similitud

**Resultado:**
❌ Roberto puede recibir información de otras unidades (One Love, Misty Morning, etc.)
❌ Violación de privacidad potencial
❌ Confusión en la respuesta del chat

---

## 🎯 Arquitectura Deseada: 3 Dominios

### Dominio 1: MUVA (Turismo)
- **Tabla:** `muva_content`
- **Scope:** Toda la isla de San Andrés
- **Permiso:** Conditional (solo con `muva_access: true`)
- **Estado:** ✅ Ya implementado correctamente

### Dominio 2: Hotel General (Políticas de Simmerdown)
- **Tabla:** `guest_information` filtrado por `info_type IN ('faq', 'arrival')`
- **Scope:** TODO el hotel (aplica a todos los huéspedes)
- **Permiso:** Siempre accesible
- **Contenido:**
  - FAQ (precios, descuentos, políticas)
  - Arrival (instrucciones de llegada)
  - Check-in/out times
  - Reglas generales del hotel

### Dominio 3: Alojamiento Privado (Unidad del Huésped)
- **Tabla:** `accommodation_units_manual` filtrado por `unit_id = guestInfo.accommodation_unit_id`
- **Scope:** SOLO la unidad asignada
- **Permiso:** Solo el huésped asignado
- **Contenido:**
  - Manual operativo de SU unidad
  - WiFi password privado
  - Código caja fuerte
  - Instrucciones específicas de electrodomésticos

---

## 💡 Soluciones Propuestas

### Opción A: Filtrado Inteligente ⚡ (RÁPIDA)

**Tiempo estimado:** 10-15 minutos
**Complejidad:** Baja

**Implementación:**

1. **Crear `searchHotelGeneralInfo()`**
```typescript
async function searchHotelGeneralInfo(
  embedding: number[],
  tenantId: string
): Promise<VectorSearchResult[]> {
  // Buscar solo FAQ + Arrival en guest_information
  // Nuevo RPC: match_hotel_general_info
}
```

2. **Crear `searchUnitManual()`**
```typescript
async function searchUnitManual(
  embedding: number[],
  unitId: string
): Promise<VectorSearchResult[]> {
  // Buscar en accommodation_units_manual
  // Nuevo RPC: match_unit_manual
}
```

3. **Modificar `executeConversationalSearch()`**
```typescript
const searches = [
  searchAccommodationEnhanced(...),
  searchHotelGeneralInfo(queryEmbedding, tenantId),  // Nuevo
  searchUnitManual(queryEmbedding, unitId),          // Nuevo
  hasMuvaAccess ? searchTourism(...) : Promise.resolve([])
]
```

**Pros:**
- ✅ Sin data migration
- ✅ Implementación inmediata
- ✅ Desbloquea testing rápido

**Contras:**
- ⚠️ `guest_information` sigue mezclando dominios
- ⚠️ Requiere 2 búsquedas en vez de 1 para datos del hotel

---

### Opción B: Refactorización Arquitectural 🏗️ (LIMPIA)

**Tiempo estimado:** 30-45 minutos
**Complejidad:** Media

**Implementación:**

1. **Migrar datos** (90 chunks)
```sql
-- Mover manuales operativos a accommodation_units_manual
INSERT INTO public.accommodation_units_manual (
  unit_id, manual_content, embedding, embedding_balanced
)
SELECT
  au.id,
  gi.info_content,
  gi.embedding,
  gi.embedding_balanced
FROM hotels.guest_information gi
JOIN public.accommodation_units au ON au.name = (
  -- Extraer nombre de unidad del info_title
  REPLACE(gi.info_title, 'Manual Operativo - ', '')
)
WHERE gi.info_type = 'accommodation_operations';

-- Eliminar manuales de guest_information
DELETE FROM hotels.guest_information
WHERE info_type = 'accommodation_operations';
```

2. **Renombrar tabla** (opcional)
```sql
ALTER TABLE hotels.guest_information
RENAME TO hotel_general_information;
```

3. **Actualizar chat engine**
- Usar `hotel_general_information` para FAQ + Arrival
- Usar `accommodation_units_manual` para manuales

**Pros:**
- ✅ Arquitectura limpia y clara
- ✅ Dominios completamente separados
- ✅ Mejor para mantener a largo plazo
- ✅ Reduce riesgo de leaks de información privada

**Contras:**
- ⚠️ Requiere data migration
- ⚠️ Más tiempo de implementación
- ⚠️ Testing más extenso

---

## 📊 Comparación de Opciones

| Criterio | Opción A | Opción B |
|----------|----------|----------|
| Tiempo | 10-15 min | 30-45 min |
| Complejidad | Baja | Media |
| Data Migration | No | Sí |
| Arquitectura | Pragmática | Ideal |
| Testing Required | Mínimo | Extenso |
| Riesgo | Bajo | Medio |
| Mantenibilidad | Buena | Excelente |

---

## 🎯 Recomendación

**Estrategia de 2 Fases:**

1. **FASE 0.2 (Ahora):** Implementar **Opción A** para desbloquear testing inmediato
   - Crear las 2 funciones de búsqueda con filtrado
   - Validar que Roberto Mora solo ve info de Kaya
   - Continuar con FASE 1-4 del plan original

2. **FASE 5 (Futuro):** Implementar **Opción B** como mejora arquitectural
   - Después de completar testing del proyecto
   - Migrar datos en horario de bajo tráfico
   - Refactorizar gradualmente

**Justificación:**
- ✅ Opción A desbloquea el proyecto AHORA (crítico para testing)
- ✅ Opción B se puede hacer después sin bloquear progreso
- ✅ Validamos la arquitectura con datos reales antes de migrar

---

## 📝 Próximos Pasos (FASE 0.2)

### Implementación Opción A

**1. Crear función RPC `match_hotel_general_info`**
```sql
CREATE OR REPLACE FUNCTION match_hotel_general_info(
  query_embedding vector(1536),
  p_tenant_id varchar(50),
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  info_id uuid,
  info_title varchar,
  info_content text,
  info_type varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.info_id,
    gi.info_title,
    gi.info_content,
    gi.info_type,
    1 - (gi.embedding_balanced <=> query_embedding) as similarity
  FROM hotels.guest_information gi
  WHERE gi.tenant_id = p_tenant_id
    AND gi.info_type IN ('faq', 'arrival')  -- FILTRO CLAVE
    AND gi.is_active = true
    AND 1 - (gi.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY gi.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**2. Crear función RPC `match_unit_manual`**
```sql
CREATE OR REPLACE FUNCTION match_unit_manual(
  query_embedding vector(1536),
  p_unit_id uuid,
  similarity_threshold float DEFAULT 0.3,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  unit_id uuid,
  manual_content text,
  detailed_instructions text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.unit_id,
    um.manual_content,
    um.detailed_instructions,
    1 - (um.embedding_balanced <=> query_embedding) as similarity
  FROM public.accommodation_units_manual um
  WHERE um.unit_id = p_unit_id  -- FILTRO CLAVE
    AND 1 - (um.embedding_balanced <=> query_embedding) > similarity_threshold
  ORDER BY um.embedding_balanced <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**3. Modificar `conversational-chat-engine.ts`**
- Agregar `searchHotelGeneralInfo()` function
- Agregar `searchUnitManual()` function
- Actualizar `executeConversationalSearch()` para usar ambas
- Eliminar o deprecar `searchGuestInformation()` antigua

**4. Testing**
- Login como Roberto Mora (Kaya)
- Query: "¿Cuál es la contraseña del WiFi?"
- Verificar que solo recibe info de Kaya (no One Love)
- Verificar que también recibe FAQ + Arrival si es relevante

---

## 📚 Referencias

- **Plan principal:** `/Users/oneill/Sites/apps/InnPilot/plan.md` (líneas 13-71)
- **Chat Engine:** `src/lib/conversational-chat-engine.ts:423-452`
- **Queries ejecutadas:** Ver arriba en sección "Hallazgos"

---

**Autor:** Claude Code
**Revisado por:** @oneill
**Próxima fase:** FASE 0.2 - Implementación Opción A
