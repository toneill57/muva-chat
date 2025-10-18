# Pipeline para Agregar Campos de MotoPress a Tarjetas de Accommodations

**Última actualización:** Octubre 2025
**Caso de estudio:** Implementación de `pricing` (precios base de MotoPress Rates API)

---

## 📋 Tabla de Contenidos

1. [Pipeline Completo (7 Pasos)](#pipeline-completo)
2. [Endpoints MotoPress Disponibles](#endpoints-motopress)
3. [Checklist para Nuevos Campos](#checklist)
4. [Campos Disponibles para Expandir](#campos-disponibles)
5. [Troubleshooting Común](#troubleshooting)

---

## 🔄 Pipeline Completo (7 Pasos)

### Caso de Estudio: Campo `pricing`

Este pipeline documenta **exactamente** lo que hicimos para agregar precios de MotoPress a las tarjetas de accommodations.

---

### **Paso 1: Fetch del Endpoint MotoPress**

**Archivo:** `src/lib/integrations/motopress/client.ts`

**Qué hicimos:**
```typescript
// Línea 216-229: Fetch rates desde MotoPress
async getRates(
  page: number = 1,
  perPage: number = 100,
  accommodationTypeId?: number
): Promise<MotoPresApiResponse<MotoPresRate[]>> {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('per_page', perPage.toString())
  if (accommodationTypeId) {
    params.append('accommodation_type_id', accommodationTypeId.toString())
  }
  return this.makeRequest<MotoPresRate[]>(`/rates?${params.toString()}`)
}

// Línea 231-257: Fetch ALL rates con paginación
async getAllRates(): Promise<MotoPresApiResponse<MotoPresRate[]>> {
  const allRates: MotoPresRate[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await this.getRates(page, 100)
    if (response.error) return response

    const rates = response.data || []
    allRates.push(...rates)
    hasMore = rates.length === 100
    page++
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  return { data: allRates, status: 200 }
}
```

**TypeScript Interfaces creadas:**
```typescript
// Línea 39-61: Interfaces para rates
interface MotoPressPriceVariation {
  adults: number
  children: number
  price: number
}

interface MotoPresSeasonPrice {
  priority: number
  season_id: number
  base_price: number
  base_adults: number
  base_children: number
  variations: MotoPressPriceVariation[]
}

interface MotoPresRate {
  id: number
  status: string
  title: string
  description?: string
  accommodation_type_id: number  // 🔑 Key field - links to accommodation
  season_prices: MotoPresSeasonPrice[]
}
```

**⚠️ Importante:**
- MotoPress API devuelve **10 items por defecto** - SIEMPRE usar `per_page=100`
- El parámetro `accommodation_type_id` **NO filtra** - devuelve todos los rates igual
- Por eso usamos `getAllRates()` bulk en vez de fetch individual

---

### **Paso 2: Mapear Datos en data-mapper.ts**

**Archivo:** `src/lib/integrations/motopress/data-mapper.ts`

**Qué hicimos:**
```typescript
// Línea 234-295: Mapper para convertir MotoPress rates a nuestro formato
static mapRatesToPricing(rates: any[]): {
  accommodation_type_id: number
  base_price: number
  base_price_low_season: number      // ✅ NUEVO: Compatible con Markdown
  base_price_high_season: number     // ✅ NUEVO: Compatible con Markdown
  currency: string                    // ✅ NUEVO: Compatible con Markdown
  price_per_person_low: number       // ✅ NUEVO: Compatible con Markdown
  price_per_person_high: number      // ✅ NUEVO: Compatible con Markdown
  minimum_stay: number                // ✅ NUEVO: Compatible con Markdown
  base_adults: number
  base_children: number
  season_id: number
  priority: number
  price_variations: Array<{
    adults: number
    children: number
    price: number
  }>
}[] {
  return rates.map(rate => {
    const seasonPrices = rate.season_prices || []

    // Handle multiple seasons or single season
    let basePriceLow = 0
    let basePriceHigh = 0

    if (seasonPrices.length === 0) {
      basePriceLow = 0
      basePriceHigh = 0
    } else if (seasonPrices.length === 1) {
      // Single season - use same price for both (like Tu Casa Mar)
      basePriceLow = seasonPrices[0].base_price || 0
      basePriceHigh = seasonPrices[0].base_price || 0
    } else {
      // Multiple seasons - find lowest and highest
      const sortedByPrice = [...seasonPrices].sort((a, b) =>
        (a.base_price || 0) - (b.base_price || 0)
      )
      basePriceLow = sortedByPrice[0]?.base_price || 0
      basePriceHigh = sortedByPrice[sortedByPrice.length - 1]?.base_price || 0
    }

    const primarySeason = seasonPrices[0] || {}

    return {
      accommodation_type_id: rate.accommodation_type_id,
      base_price: primarySeason.base_price || 0,
      base_price_low_season: basePriceLow,
      base_price_high_season: basePriceHigh,
      currency: 'COP',
      price_per_person_low: 0,
      price_per_person_high: 0,
      minimum_stay: 1,
      base_adults: primarySeason.base_adults || 2,
      base_children: primarySeason.base_children || 0,
      season_id: primarySeason.season_id || 0,
      priority: primarySeason.priority || 0,
      price_variations: primarySeason.variations || []
    }
  })
}
```

**🎯 Propósito:**
- Extraer campos de MotoPress rates API
- **NUEVO:** Mapear a formato compatible con Markdown sync (`base_price_low_season`, `base_price_high_season`, `currency`)
- Manejar 1 temporada (Tu Casa Mar) o múltiples temporadas (otros tenants)
- Manejar valores por defecto para campos faltantes

---

### **Paso 3: Fetch en Sync y Asignar al Unit Object**

**Archivo:** `src/lib/integrations/motopress/sync-manager.ts`

**Qué hicimos:**

**3a. Fetch rates en bulk (línea 140-160):**
```typescript
const motoPresAccommodations = response.data
console.log(`Retrieved ${motoPresAccommodations.length} accommodations from MotoPress`)

// Fetch all rates (pricing) from MotoPress in bulk
console.log('Fetching rates (pricing) from MotoPress...')
const ratesResponse = await client.getAllRates()

if (ratesResponse.error || !ratesResponse.data) {
  console.warn('⚠️ Failed to fetch rates:', ratesResponse.error)
  // Continue without pricing data
}

const motoPresRates = ratesResponse.data || []
console.log(`Retrieved ${motoPresRates.length} rates from MotoPress`)

// Map rates to pricing by accommodation_type_id
const pricingMap = new Map()
if (motoPresRates.length > 0) {
  const pricingData = MotoPresDataMapper.mapRatesToPricing(motoPresRates)
  pricingData.forEach(pricing => {
    pricingMap.set(pricing.accommodation_type_id, pricing)
  })
  console.log(`📊 Mapped pricing for ${pricingMap.size} accommodations`)
}
```

**3b. Asignar pricing a cada unit (línea 189-215):**
```typescript
// Add hotel_id and pricing to all units
accommodationUnits.forEach(unit => {
  unit.hotel_id = hotelId

  // Add pricing data as JSONB object if available
  const pricing = pricingMap.get(unit.motopress_unit_id)
  if (pricing) {
    unit.pricing = {
      base_price: pricing.base_price,
      base_price_low_season: pricing.base_price_low_season,     // ✅ NUEVO
      base_price_high_season: pricing.base_price_high_season,   // ✅ NUEVO
      currency: pricing.currency,                                // ✅ NUEVO
      price_per_person_low: pricing.price_per_person_low,       // ✅ NUEVO
      price_per_person_high: pricing.price_per_person_high,     // ✅ NUEVO
      minimum_stay: pricing.minimum_stay,                        // ✅ NUEVO
      base_adults: pricing.base_adults,
      base_children: pricing.base_children,
      season_id: pricing.season_id,
      priority: pricing.priority,
      price_variations: pricing.price_variations
    }
    console.log(`💰 Added pricing to ${unit.name}: $${pricing.base_price} COP (Low: $${pricing.base_price_low_season}, High: $${pricing.base_price_high_season})`)
  } else {
    unit.pricing = {}
    console.warn(`⚠️ No pricing found for accommodation_type_id ${unit.motopress_unit_id}`)
  }
})
```

**🔑 Key Insight:**
- Usamos `Map` para lookup rápido por `accommodation_type_id`
- SIEMPRE crear el objeto completo (no campos sueltos)
- Si no hay datos, asignar objeto vacío `{}` (NUNCA dejar undefined)

---

### **Paso 4: Agregar a SQL INSERT y UPDATE**

**Archivo:** `src/lib/integrations/motopress/sync-manager.ts`

**Qué hicimos:**

**4a. INSERT SQL (línea 275-301):**
```typescript
const insertSql = `
  INSERT INTO hotels.accommodation_units (
    id,
    hotel_id, tenant_id, motopress_unit_id, name, description, short_description,
    capacity, bed_configuration, view_type, tourism_features, unique_features,
    images, accommodation_mphb_type, pricing, status, is_featured, display_order, created_at, updated_at
  ) VALUES (
    hotels.generate_deterministic_uuid('${unit.tenant_id}', ${unit.motopress_unit_id}),
    '${unit.hotel_id}',
    '${unit.tenant_id}',
    ${unit.motopress_unit_id},
    '${unit.name?.replace(/'/g, "''")}',
    '${unit.description?.replace(/'/g, "''") || ''}',
    '${unit.short_description?.replace(/'/g, "''") || ''}',
    '${JSON.stringify(unit.capacity)}'::jsonb,
    '${JSON.stringify(unit.bed_configuration)}'::jsonb,
    '${unit.view_type || ''}',
    '${JSON.stringify(unit.tourism_features)}'::jsonb,
    '${JSON.stringify(unit.unique_features)}'::jsonb,
    '${JSON.stringify(unit.images)}'::jsonb,
    '${unit.accommodation_mphb_type || ''}',
    '${JSON.stringify(unit.pricing || {})}'::jsonb,  // 🔑 CRUCIAL: pricing JSONB
    '${unit.status}',
    ${unit.is_featured || false},
    ${unit.display_order || 1},
    NOW(),
    NOW()
  )
`
```

**4b. UPDATE SQL (línea 230-246):**
```typescript
const updateSql = `
  UPDATE hotels.accommodation_units
  SET
    name = '${unit.name?.replace(/'/g, "''")}',
    description = '${unit.description?.replace(/'/g, "''") || ''}',
    short_description = '${unit.short_description?.replace(/'/g, "''") || ''}',
    capacity = '${JSON.stringify(unit.capacity)}'::jsonb,
    bed_configuration = '${JSON.stringify(unit.bed_configuration)}'::jsonb,
    view_type = '${unit.view_type || ''}',
    tourism_features = '${JSON.stringify(unit.tourism_features)}'::jsonb,
    unique_features = '${JSON.stringify(unit.unique_features)}'::jsonb,
    images = '${JSON.stringify(unit.images)}'::jsonb,
    accommodation_mphb_type = '${unit.accommodation_mphb_type || ''}',
    pricing = '${JSON.stringify(unit.pricing || {})}'::jsonb,  // 🔑 CRUCIAL: pricing JSONB
    status = '${unit.status}',
    updated_at = NOW()
  WHERE id = '${existing.id}'
`
```

**⚠️ Importante:**
- Usar `JSON.stringify()` para campos JSONB
- Cast con `::jsonb` en PostgreSQL
- Escape single quotes con `.replace(/'/g, "''")`
- Fallback a `{}` con `|| {}`

---

### **Paso 5: Propagar a Chunks (generateEmbeddingsForUnit)**

**Archivo:** `src/lib/integrations/motopress/sync-manager.ts`

**Qué hicimos (línea 593-601):**
```typescript
const chunkRecord = {
  tenant_id: tenantId,
  name: chunkName,
  unit_number: unit.motopress_unit_id?.toString() || `unit-${i + 1}`,
  unit_type: unit.unit_type || 'accommodation',
  description: chunk.content,
  short_description: unit.short_description || '',
  amenities: unit.amenities_list || [],
  pricing: unit.pricing || {},  // 🔑 CRUCIAL: Asignar pricing a CADA chunk
  photos: unit.images || [],
  metadata: {
    section_type: chunk.sectionType,
    section_title: chunk.sectionTitle,
    original_accommodation: unit.name,
    // ... más metadata
  },
  embedding_fast: embedding_fast,
  embedding: embedding_balanced
}
```

**❌ ERROR COMÚN (lo que NO hacer):**
```typescript
// ❌ MAL - Buscar en campos que no existen
pricing: unit.tourism_features?.price_per_night
  ? {
      base_price: unit.tourism_features.price_per_night,
      // ...
    }
  : {},
```

**✅ CORRECTO:**
```typescript
// ✅ BIEN - Usar el objeto que creamos en Paso 3
pricing: unit.pricing || {},
```

**🎯 Por qué es crucial:**
- Los chunks son lo que se guarda en `accommodation_units_public` view
- Si no asignas el campo aquí, NO llegará a la base de datos
- Cada chunk hereda datos del unit padre

---

### **Paso 6: Leer en API Route**

**Archivo:** `src/app/api/accommodations/units/route.ts`

**Qué hicimos (línea 138-145):**
```typescript
pricing_summary: {
  seasonal_rules: 0,
  hourly_rules: 0,
  base_price_range: chunk.pricing?.base_price ? [
    chunk.pricing.base_price,
    chunk.pricing.base_price
  ] : [0, 0]
},
```

**🔍 Debugging tips:**
- `chunk.pricing` viene de `accommodation_units_public` view
- Verificar que no esté vacío `{}` antes de leer `base_price`
- Usar optional chaining `?.` para evitar errores

**❌ ERROR COMÚN:**
```typescript
// ❌ MAL - Campo directo que no existe
base_price_range: chunk.base_price ? [chunk.base_price, chunk.base_price] : [0, 0]
```

**✅ CORRECTO:**
```typescript
// ✅ BIEN - Leer desde JSONB field
base_price_range: chunk.pricing?.base_price ? [
  chunk.pricing.base_price,
  chunk.pricing.base_price
] : [0, 0]
```

---

### **Paso 7: Mostrar en UI Cards**

**Archivo:** `src/components/Accommodation/AccommodationUnitsGrid.tsx`

**Qué hicimos:**

**7a. TypeScript Interface (línea 65-68):**
```typescript
pricing_summary: {
  seasonal_rules: number
  hourly_rules: number
  base_price_range: number[]  // [min, max]
}
```

**7b. Format Price Helper (línea 225-230):**
```typescript
const formatPrice = (priceRange: number[]) => {
  if (!priceRange || priceRange.length === 0) return 'N/A'
  const min = Math.min(...priceRange)
  const max = Math.max(...priceRange)
  return min === max
    ? `$${min.toLocaleString('es-CO')}`
    : `$${min.toLocaleString('es-CO')} - $${max.toLocaleString('es-CO')}`
}
```

**7c. Display in Card (línea 377-378):**
```typescript
<InfoItem
  label="Precio"
  value={formatPrice(unit.pricing_summary.base_price_range)}
/>
```

**Resultado final:**
- Rose Cay APARTAMENTO: **$700,000**
- Haines Cay DOBLE: **$280,000**
- Crab Cay DOBLE: **$250,000**

---

## 🌐 Endpoints MotoPress Disponibles

### **Endpoints que YA usamos:**

#### 1. `/accommodation_types`
**Método:** GET
**Usado en:** `client.ts:158-164`
**Propósito:** Obtener todos los tipos de alojamiento (habitaciones, apartamentos, etc.)

**Campos importantes que devuelve:**
```typescript
{
  id: number,                    // 🔑 Accommodation ID
  title: string,                 // Nombre
  excerpt: string,               // Descripción limpia (sin HTML)
  description: string,           // Descripción con HTML
  status: "publish" | "draft",
  adults: number,                // Capacidad adultos
  children: number,              // Capacidad niños
  bed_type: string,              // Tipo de cama
  size: number,                  // Tamaño en m²
  view: string,                  // Vista (ej: "al mar", "ciudad")
  amenities: Array<{             // Amenidades
    id: number,
    name: string
  }>,
  images: Array<{                // Imágenes
    id: number,
    src: string,
    title: string,
    alt: string
  }>,
  categories: Array<{            // Categorías
    id: number,
    name: string
  }>
}
```

#### 2. `/rates`
**Método:** GET
**Usado en:** `client.ts:216-229`
**Propósito:** Obtener precios y tarifas por temporada

**Campos importantes que devuelve:**
```typescript
{
  id: number,                    // Rate ID (interno)
  accommodation_type_id: number, // 🔑 Links a accommodation
  title: string,
  status: "publish" | "draft",
  season_prices: Array<{
    season_id: number,
    priority: number,
    base_price: number,          // 💰 Precio base noche
    base_adults: number,         // Adultos incluidos
    base_children: number,       // Niños incluidos
    variations: Array<{          // Variaciones precio
      adults: number,
      children: number,
      price: number
    }>
  }>
}
```

---

### **Endpoints que NO usamos (disponibles):**

#### 3. `/bookings`
**Documentación:** https://motopress.github.io/hotel-booking-rest-api/#/Bookings

**Propósito:** Obtener reservas existentes
**Potencial uso:** Mostrar disponibilidad real, bloquear fechas

**Campos disponibles:**
```typescript
{
  id: number,
  status: "confirmed" | "pending" | "cancelled",
  check_in: string,              // 📅 Fecha check-in
  check_out: string,             // 📅 Fecha check-out
  total_price: number,           // Precio total reserva
  customer: {
    email: string,
    first_name: string,
    last_name: string,
    phone: string
  },
  reserved_rooms: Array<{
    room_type_id: number,        // 🔑 Links a accommodation
    adults: number,
    children: number,
    rate_id: number
  }>
}
```

**Ejemplo implementación:**
```typescript
// En client.ts
async getBookings(
  dateFrom?: string,
  dateTo?: string
): Promise<MotoPresApiResponse<any[]>> {
  const params = new URLSearchParams()
  if (dateFrom) params.append('date_from', dateFrom)
  if (dateTo) params.append('date_to', dateTo)

  const query = params.toString() ? `?${params.toString()}` : ''
  return this.makeRequest<any[]>(`/bookings${query}`)
}
```

#### 4. `/room-types`
**Documentación:** https://motopress.github.io/hotel-booking-rest-api/#/Room-Types

**Propósito:** Obtener unidades físicas individuales
**Diferencia con `/accommodation_types`:** Accommodation type = "Habitación Doble", Room = "Habitación 101"

**Campos disponibles:**
```typescript
{
  id: number,
  title: string,                 // Ej: "Habitación 101"
  accommodation_type_id: number, // 🔑 Links a accommodation type
  status: "enabled" | "disabled"
}
```

---

## ✅ Checklist para Agregar Nuevos Campos

Usa esta checklist cada vez que quieras agregar un nuevo campo de MotoPress a las tarjetas:

### **Pre-requisitos:**
- [ ] Identificar endpoint MotoPress que tiene el campo
- [ ] Verificar estructura del response con curl test
- [ ] Decidir si necesitas fetch adicional o ya está en `/accommodation_types`

### **Paso 1: Fetch (client.ts)**
- [ ] Agregar método `get[Campo]()` si necesitas nuevo endpoint
- [ ] Agregar método `getAll[Campo]()` con paginación si retorna arrays
- [ ] Crear TypeScript interfaces para el response
- [ ] Identificar campo key para linking (ej: `accommodation_type_id`)

### **Paso 2: Mapear (data-mapper.ts)**
- [ ] Crear método `static map[Campo]To[Formato]()`
- [ ] Extraer solo campos necesarios
- [ ] Transformar a estructura interna
- [ ] Manejar valores por defecto

### **Paso 3: Sync (sync-manager.ts)**
- [ ] Fetch datos después de accommodations (línea ~140)
- [ ] Crear `Map` para lookup por ID
- [ ] Asignar a `unit.[campo]` como objeto completo (línea ~190)
- [ ] Log success/warnings

### **Paso 4: SQL (sync-manager.ts)**
- [ ] Agregar campo a INSERT columnas (línea ~276)
- [ ] Agregar valor a INSERT VALUES con `JSON.stringify()` si JSONB (línea ~294)
- [ ] Agregar campo a UPDATE SET (línea ~242)
- [ ] Usar `::jsonb` cast si es JSONB

### **Paso 5: Chunks (sync-manager.ts)**
- [ ] Asignar `unit.[campo]` a `chunkRecord.[campo]` (línea ~601)
- [ ] ⚠️ NO buscar en otros campos, usar directamente `unit.[campo]`
- [ ] Verificar que se asigna a TODOS los chunks

### **Paso 6: API (route.ts)**
- [ ] Leer desde `chunk.[campo]` (línea ~138)
- [ ] Usar optional chaining `?.` si puede ser undefined
- [ ] Formatear para UI (ej: summary, ranges, counts)

### **Paso 7: UI (AccommodationUnitsGrid.tsx)**
- [ ] Agregar a TypeScript interface
- [ ] Crear helper de formato si necesario
- [ ] Agregar `<InfoItem>` a card display
- [ ] Verificar en browser que se muestra correctamente

---

## 🎯 Campos Disponibles para Expandir

### **De `/accommodation_types` (ya fetcheado):**

Estos campos YA llegan en el fetch de accommodations, solo necesitas pasos 2-7:

```typescript
// ✅ YA IMPLEMENTADOS:
- title ✓
- excerpt ✓
- adults ✓
- children ✓
- bed_type ✓
- size ✓
- view ✓
- amenities ✓
- images ✓

// 🆕 DISPONIBLES PARA AGREGAR:
- description (HTML completo)
- status (publish/draft)
- categories (Array<{id, name}>)
- attributes (campos custom)
- featured_media (ID de imagen destacada)
- date (fecha creación)
- modified (fecha última modificación)
```

**Ejemplo: Agregar `categories`**
```typescript
// Paso 3: sync-manager.ts
unit.categories = motoPresData.categories || []

// Paso 4: SQL INSERT
categories,
'${JSON.stringify(unit.categories || [])}'::jsonb,

// Paso 5: Chunks
categories: unit.categories || [],

// Paso 6: API
categories: chunk.categories || []

// Paso 7: UI
<InfoItem
  label="Categoría"
  value={unit.categories.map(c => c.name).join(', ')}
/>
```

---

### **De `/rates` (ya fetcheado):**

Estos campos YA llegan en el fetch de rates, solo necesitas mapearlos:

```typescript
// ✅ YA IMPLEMENTADOS:
- base_price ✓
- base_adults ✓
- base_children ✓
- season_id ✓
- priority ✓
- price_variations ✓

// 🆕 DISPONIBLES PARA AGREGAR:
- title (nombre del rate)
- description (descripción del rate)
- status (activo/inactivo)
```

**Ejemplo: Agregar `rate_title`**
```typescript
// Paso 2: data-mapper.ts
accommodation_type_id: rate.accommodation_type_id,
rate_title: rate.title,  // 🆕 Nuevo campo

// Paso 3: sync-manager.ts
unit.pricing = {
  base_price: pricing.base_price,
  rate_title: pricing.rate_title,  // 🆕
  // ...
}

// Resto igual a pipeline de pricing
```

---

### **De `/bookings` (requiere nuevo fetch):**

Estos campos requieren implementar pasos 1-7 completos:

```typescript
// 🆕 NUEVOS ENDPOINTS NECESARIOS:
- check_in (próximas llegadas)
- check_out (próximas salidas)
- total_price (precio última reserva)
- customer info (datos huésped)
- reserved_rooms (habitaciones reservadas)
```

**Ejemplo: Mostrar "Próxima reserva"**
```typescript
// Paso 1: client.ts
async getUpcomingBookings(accommodationId: number) {
  const today = new Date().toISOString().split('T')[0]
  const response = await this.getBookings(today)

  return response.data?.filter(booking =>
    booking.reserved_rooms.some(room =>
      room.room_type_id === accommodationId
    )
  )
}

// Paso 3: sync-manager.ts
const bookingsResponse = await client.getUpcomingBookings(unit.motopress_unit_id)
unit.next_booking = bookingsResponse?.[0] || null

// Paso 7: UI
{unit.next_booking && (
  <InfoItem
    label="Próxima Reserva"
    value={new Date(unit.next_booking.check_in).toLocaleDateString('es-CO')}
  />
)}
```

---

### **De `/room-types` (requiere nuevo fetch):**

Para mostrar unidades individuales (Habitación 101, 102, etc.):

```typescript
// 🆕 CASOS DE USO:
- Listar unidades físicas disponibles
- Mostrar nombres específicos (no solo "Doble")
- Tracking por habitación individual
```

**Ejemplo: Fetch room units**
```typescript
// Paso 1: client.ts
async getRoomTypes(): Promise<MotoPresApiResponse<any[]>> {
  return this.makeRequest<any[]>('/room-types')
}

// Paso 3: sync-manager.ts
const roomTypesResponse = await client.getRoomTypes()
const roomsByAccommodation = new Map()

roomTypesResponse.data?.forEach(room => {
  if (!roomsByAccommodation.has(room.accommodation_type_id)) {
    roomsByAccommodation.set(room.accommodation_type_id, [])
  }
  roomsByAccommodation.get(room.accommodation_type_id).push(room.title)
})

unit.room_units = roomsByAccommodation.get(unit.motopress_unit_id) || []

// Paso 7: UI
<InfoItem
  label="Unidades"
  value={`${unit.room_units.length} disponibles`}
/>
```

---

## 🐛 Troubleshooting Común

### **Problema 1: Campo aparece vacío `{}` en database**

**Síntomas:**
```typescript
// Query retorna:
{ name: "Haines Cay", pricing: {} }  // ❌ Vacío
```

**Causa:**
- No asignaste el campo en `generateEmbeddingsForUnit` (Paso 5)

**Solución:**
```typescript
// sync-manager.ts línea ~601
const chunkRecord = {
  // ...
  pricing: unit.pricing || {},  // ✅ Asignar aquí
}
```

---

### **Problema 2: Solo 10 items en vez de 16**

**Síntomas:**
```
Retrieved 10 accommodations from MotoPress  // ❌ Faltan 6
```

**Causa:**
- MotoPress API retorna 10 items por defecto
- Falta parámetro `per_page=100`

**Solución:**
```typescript
// client.ts
const apiUrl = `${this.baseUrl}/accommodation_types?per_page=100`  // ✅
```

---

### **Problema 3: Timeout en test-connection**

**Síntomas:**
```
fetch failed: ConnectTimeoutError
```

**Causa:**
- Usando query parameters en vez de Basic Auth
- URL incorrecta con credentials expuestos

**Solución:**
```typescript
// ❌ MAL
const apiUrl = `${baseUrl}/endpoint?consumer_key=${key}&consumer_secret=${secret}`

// ✅ BIEN
const credentials = Buffer.from(`${key}:${secret}`).toString('base64')
const response = await fetch(apiUrl, {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
})
```

---

### **Problema 4: Campo muestra $0 en UI**

**Síntomas:**
```typescript
// Card muestra:
Precio: $0  // ❌ Debería ser $280,000
```

**Debugging checklist:**
```typescript
// 1. Verificar en database
const { data } = await supabase
  .from('accommodation_units_public')
  .select('pricing')
  .limit(1)

console.log(data[0].pricing)
// ✅ Debe tener: { base_price: 280000, ... }
// ❌ Si es {}: Problema en Paso 5 (chunks)

// 2. Verificar en API response
fetch('/api/accommodations/units')
  .then(r => r.json())
  .then(units => console.log(units[0].pricing_summary))
// ✅ Debe tener: { base_price_range: [280000, 280000] }
// ❌ Si es [0, 0]: Problema en Paso 6 (API route)

// 3. Verificar lectura correcta
// API route debe leer:
chunk.pricing?.base_price  // ✅ BIEN
// NO:
chunk.base_price  // ❌ MAL - campo no existe
```

---

### **Problema 5: Error SQL al INSERT/UPDATE**

**Síntomas:**
```
column "pricing" does not exist
```

**Causa:**
- Agregaste campo a VALUES pero no a columnas
- O viceversa

**Solución:**
```typescript
// INSERT debe tener AMBOS:
INSERT INTO hotels.accommodation_units (
  ..., pricing, ...  // ✅ Aquí
) VALUES (
  ..., '${JSON.stringify(unit.pricing)}'::jsonb, ...  // ✅ Y aquí
)

// Orden debe coincidir
```

---

### **Problema 6: Parámetro de filtro no funciona**

**Síntomas:**
```typescript
// Llamamos:
await client.getRates(1, 100, 12458)  // accommodation_type_id=12458

// Pero devuelve TODOS los rates (16) en vez de solo 1
```

**Causa:**
- MotoPress API ignora ciertos parámetros de filtro
- El endpoint `/rates` con `accommodation_type_id` NO filtra

**Solución:**
```typescript
// ❌ NO usar fetch individual
for (const id of ids) {
  const rate = await getRates(1, 100, id)  // Siempre devuelve todos
}

// ✅ Fetch bulk y filtrar en código
const allRates = await getAllRates()
const filtered = allRates.filter(r => r.accommodation_type_id === targetId)
```

---

## 📝 Template para Nuevos Campos

Copia este template cuando vayas a agregar un nuevo campo:

```typescript
// =============================================================================
// NUEVO CAMPO: [NOMBRE_CAMPO]
// Endpoint: /[endpoint]
// Propósito: [descripción]
// =============================================================================

// -----------------------------------------------------------------------------
// PASO 1: FETCH (client.ts)
// -----------------------------------------------------------------------------

// Interface
interface MotoPress[Campo] {
  id: number
  // ... campos del endpoint
}

// Fetch method
async get[Campo](
  page: number = 1,
  perPage: number = 100
): Promise<MotoPresApiResponse<MotoPress[Campo][]>> {
  return this.makeRequest<MotoPress[Campo][]>(`/[endpoint]?page=${page}&per_page=${perPage}`)
}

// Get all with pagination
async getAll[Campo](): Promise<MotoPresApiResponse<MotoPress[Campo][]>> {
  const all: MotoPress[Campo][] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await this.get[Campo](page, 100)
    if (response.error) return response

    const items = response.data || []
    all.push(...items)
    hasMore = items.length === 100
    page++
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  return { data: all, status: 200 }
}

// -----------------------------------------------------------------------------
// PASO 2: MAPEAR (data-mapper.ts)
// -----------------------------------------------------------------------------

static map[Campo]To[Formato](items: any[]): {
  accommodation_type_id: number
  // ... campos mapeados
}[] {
  return items.map(item => {
    return {
      accommodation_type_id: item.accommodation_type_id,
      // ... extraer campos
    }
  })
}

// -----------------------------------------------------------------------------
// PASO 3: SYNC (sync-manager.ts ~línea 140)
// -----------------------------------------------------------------------------

// Fetch
console.log('Fetching [campo] from MotoPress...')
const [campo]Response = await client.getAll[Campo]()

if ([campo]Response.error || ![campo]Response.data) {
  console.warn('⚠️ Failed to fetch [campo]:', [campo]Response.error)
}

const motoPress[Campo] = [campo]Response.data || []
console.log(`Retrieved ${motoPress[Campo].length} [campo] from MotoPress`)

// Map
const [campo]Map = new Map()
if (motoPress[Campo].length > 0) {
  const [campo]Data = MotoPresDataMapper.map[Campo]To[Formato](motoPress[Campo])
  [campo]Data.forEach(item => {
    [campo]Map.set(item.accommodation_type_id, item)
  })
  console.log(`📊 Mapped [campo] for ${[campo]Map.size} accommodations`)
}

// Assign to unit (sync-manager.ts ~línea 190)
accommodationUnits.forEach(unit => {
  const [campo] = [campo]Map.get(unit.motopress_unit_id)
  if ([campo]) {
    unit.[campo] = {
      // ... estructura del campo
    }
    console.log(`✅ Added [campo] to ${unit.name}`)
  } else {
    unit.[campo] = {}
    console.warn(`⚠️ No [campo] found for accommodation_type_id ${unit.motopress_unit_id}`)
  }
})

// -----------------------------------------------------------------------------
// PASO 4: SQL INSERT (sync-manager.ts ~línea 276)
// -----------------------------------------------------------------------------

INSERT INTO hotels.accommodation_units (
  ..., [campo], ...
) VALUES (
  ..., '${JSON.stringify(unit.[campo] || {})}'::jsonb, ...
)

// SQL UPDATE (sync-manager.ts ~línea 242)
UPDATE hotels.accommodation_units
SET
  ...,
  [campo] = '${JSON.stringify(unit.[campo] || {})}'::jsonb,
  ...

// -----------------------------------------------------------------------------
// PASO 5: CHUNKS (sync-manager.ts ~línea 601)
// -----------------------------------------------------------------------------

const chunkRecord = {
  // ...
  [campo]: unit.[campo] || {},
}

// -----------------------------------------------------------------------------
// PASO 6: API (route.ts ~línea 138)
// -----------------------------------------------------------------------------

[campo]_summary: {
  // ... formatear para UI
  field1: chunk.[campo]?.field1 || 'N/A',
  field2: chunk.[campo]?.field2 || 0,
}

// -----------------------------------------------------------------------------
// PASO 7: UI (AccommodationUnitsGrid.tsx)
// -----------------------------------------------------------------------------

// Interface (~línea 65)
interface AccommodationUnit {
  // ...
  [campo]_summary: {
    field1: string
    field2: number
  }
}

// Display (~línea 377)
<InfoItem
  label="[Label]"
  value={unit.[campo]_summary.field1}
/>
```

---

## 🎯 Próximos Campos Recomendados

Basado en lo que hemos aprendido, estos son los campos más útiles para agregar:

### **1. Disponibilidad (de `/bookings`)**
**Complejidad:** Media
**Valor:** Alto
**Use case:** Mostrar "Disponible" / "Reservada" en tarjetas

### **2. Check-in policies (de `/rates` o custom fields)**
**Complejidad:** Baja
**Valor:** Medio
**Use case:** Mostrar "Check-in: 3:00 PM"

### **3. Categorías (de `/accommodation_types`)**
**Complejidad:** Muy Baja (ya está en response)
**Valor:** Bajo
**Use case:** Filtrar por categoría en UI

### **4. Room units count (de `/room-types`)**
**Complejidad:** Media
**Valor:** Alto
**Use case:** "3 habitaciones disponibles de este tipo"

---

## 🎉 Campos Recién Implementados (Octubre 2025)

### 1. **Amenities (Lista Completa)**
**Implementado:** Octubre 2025
**Problema resuelto:** Solo se mostraba 1 amenity en las tarjetas

**Cambios realizados:**
```typescript
// sync-manager.ts línea 622
unit_amenities: unit.amenities_list || [], // Array format for proper mapping

// route.ts línea 152-160
unit_amenities: Array.isArray(chunk.metadata?.unit_amenities)
  ? chunk.metadata.unit_amenities.map((a: string) => ({
      amenity_name: a.trim()
    }))
  : [], // Fallback para legacy data

// AccommodationUnitsGrid.tsx línea 644
<h4 className="font-medium mb-2">Amenities ({selectedUnit.unit_amenities?.length || 0})</h4>
{selectedUnit.unit_amenities?.map((amenity, index) => (
  <div key={index} className="text-sm text-gray-600 flex items-center">
    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
    {amenity.amenity_name}
  </div>
))}
```

**Resultado:** Todas las amenities ahora se muestran en el modal de detalles

---

### 2. **Categories (Clasificación de Alojamiento)**
**Implementado:** Octubre 2025
**Beneficio:** Permite filtrar y clasificar room/apartment/suite

**Cambios realizados:**
```typescript
// data-mapper.ts línea 178
categories: motoPresData.categories || [],

// sync-manager.ts línea 629
categories: unit.categories || []

// route.ts línea 129
categories: chunk.metadata?.categories || [],

// AccommodationUnitsGrid.tsx línea 317-321
{unit.categories && unit.categories.length > 0 && unit.categories.map((cat) => (
  <Badge key={cat.id} variant="secondary" className="bg-green-100 text-green-800 text-xs">
    {cat.name}
  </Badge>
))}
```

**Resultado:** Badges verdes muestran categorías en las tarjetas (ej: "Apartment", "Room")

---

### 3. **Gallery Completa (Todas las Imágenes)**
**Implementado:** Octubre 2025
**Problema resuelto:** Solo se mostraba contador de fotos, no las fotos reales

**Cambios realizados:**
```typescript
// AccommodationUnitsGrid.tsx línea 79
photos: Array<{ url: string; alt?: string; is_primary?: boolean }>

// AccommodationUnitsGrid.tsx línea 602-623
{selectedUnit.photos && selectedUnit.photos.length > 0 && (
  <div className="mb-6">
    <h4 className="font-medium mb-3">Gallery ({selectedUnit.photos.length} photos)</h4>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {selectedUnit.photos.map((photo, index) => (
        <div key={index} className="relative aspect-video bg-gray-100 rounded overflow-hidden group">
          <img
            src={photo.url}
            alt={photo.alt || `Photo ${index + 1}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
            loading="lazy"
          />
          {photo.is_primary && (
            <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Primary
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

**Resultado:** Modal de detalles ahora muestra grid responsive con todas las fotos + hover effect

---

## ✅ Resumen

**Pipeline completo en 7 pasos:**
1. Fetch endpoint MotoPress
2. Mapear datos en data-mapper.ts
3. Asignar a unit object en sync
4. Agregar a SQL INSERT/UPDATE
5. Propagar a chunks
6. Leer en API route
7. Mostrar en UI cards

**Keys to success:**
- ✅ SIEMPRE usar `per_page=100`
- ✅ Crear objetos completos (no campos sueltos)
- ✅ Propagar a chunks en `generateEmbeddingsForUnit`
- ✅ Usar `JSON.stringify()` para JSONB
- ✅ Fallback a `{}` o valores por defecto

**Common pitfalls:**
- ❌ Olvidar asignar en chunks (Paso 5)
- ❌ Buscar en campos incorrectos (`tourism_features.price` vs `pricing.base_price`)
- ❌ No paginar correctamente
- ❌ Usar query params en vez de Basic Auth

---

**¿Preguntas? Revisa esta documentación primero, luego pregunta en el equipo.**

**Última actualización:** Octubre 2025 - Caso de estudio: `pricing` implementation
