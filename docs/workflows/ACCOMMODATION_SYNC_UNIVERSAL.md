# Sincronización Universal de Alojamientos

**Script Universal:** `scripts/sync-accommodations-to-public.ts`
**Destino:** Tabla `accommodation_units_public` (Supabase)
**Formato:** Markdown v3.0 con YAML frontmatter
**Chunking:** Semántico por secciones (7-8 chunks por alojamiento)
**Embeddings:** OpenAI `text-embedding-3-large` (1024d Matryoshka Tier 1)

---

## 🎯 Para Qué Sirve

Este script sincroniza automáticamente los alojamientos de **cualquier hotel/guest house/hostel** desde archivos markdown a la base de datos vectorial para el chat público.

**Casos de uso:**
- ✅ Onboarding de nuevo hotel (Tu Casa Mar, Simmerdown, etc.)
- ✅ Actualizar precios de temporada
- ✅ Agregar/editar amenities
- ✅ Nuevos alojamientos
- ✅ Correcciones de contenido

---

## 📁 Estructura de Archivos Requerida

```
_assets/
├── tucasamar/
│   └── accommodations/
│       └── rooms/
│           ├── serrana-cay.md       (markdown v3.0)
│           ├── queena-reef.md
│           └── ...
├── simmerdown/
│   └── accommodations/
│       ├── rooms/
│       │   ├── natural-mystic.md
│       │   └── ...
│       └── apartments/
│           ├── summertime.md
│           └── ...
└── [nuevo-hotel]/                   ← Agregar nuevo hotel aquí
    └── accommodations/
        └── [tipo]/
            └── [nombre].md
```

**Requisitos:**
1. Carpeta raíz: `_assets/[nombre-tenant]/`
2. Subcarpeta: `accommodations/[tipo]/` (rooms, apartments, suites, etc.)
3. Archivos: Markdown v3.0 con frontmatter YAML completo

---

## 🚀 Comandos de Uso

### Sincronizar TODO (todos los hoteles)
```bash
set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts
```

### Sincronizar un hotel específico
```bash
set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts --tenant simmerdown
```

### Dry run (ver qué haría sin ejecutar)
```bash
set -a && source .env.local && set +a && npx tsx scripts/sync-accommodations-to-public.ts --tenant simmerdown --dry-run
```

---

## 📝 Formato Markdown v3.0 Requerido

### Frontmatter YAML Mínimo

```yaml
---
version: "3.0"
type: "hotel_process"
business_name: "Nombre del Hotel"
business_nit: "900000000-0"
location: "San Andrés, Colombia"
tenant_id: "uuid-del-tenant"
destination:
  schema: "hotels"
  table: "accommodation_units"
document:
  title: "Nombre del Alojamiento"
  description: "Descripción corta"
  category: "accommodations"
  subcategory: "accommodation_unit"
  language: "es"
  tags: ["room", "hotel_name", "san_andres"]
  keywords: ["nombre-slug", "habitacion", "2_personas"]
accommodation:
  unit_type: "room"  # room | apartment | suite
  capacity: 2
  bed_configuration: "2 Camas Sencillas ó 1 matrimonial"
  size_m2: 26
  floor_number: 1
  view_type: "Vista al mar"
  adults: 2
  children: 0
  base_adults: 2
  base_children: 0
  images: ["https://hotel.com/foto.jpg"]
  amenities:
    features: ["wifi", "aire_acondicionado", "smart_tv", "netflix"]
    attributes:
      unit_type_detail: "habitacion_doble_vista_mar"
      category: "couples"
      special_features: ["balcon_privado", "vista_panoramica"]
  pricing:
    base_price_low_season: 280000
    base_price_high_season: 320000
    price_per_person_low: 0
    price_per_person_high: 0
    currency: "COP"
    minimum_stay: 1
  booking:
    check_in_time: "15:00:00"
    check_out_time: "12:00:00"
    day_restrictions: []
  status: "active"
  is_featured: true
  display_order: 1
  categories: []
---
```

### Contenido Markdown con Secciones Semánticas

**CRÍTICO:** Cada sección `## Título {#anchor}` se convierte en un chunk independiente.

```markdown
# Nombre del Alojamiento

## Overview {#overview}

**Q: ¿Qué es este alojamiento?**
**A:** Descripción general del alojamiento...

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad?**
**A:** Detalles completos de la configuración:

- **Capacidad máxima**: 2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: 2 Camas Sencillas ó 1 matrimonial <!-- EXTRAE: bed_configuration -->
- **Tamaño**: 26 metros cuadrados <!-- EXTRAE: size_m2 -->

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas?**
**A:** Información de precios por temporada:

### Temporada Baja
- **2 personas**: $280.000 COP por noche <!-- EXTRAE: base_price_low_season -->

### Temporada Alta
- **2 personas**: $320.000 COP por noche <!-- EXTRAE: base_price_high_season -->

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenidades incluye?**
**A:** Lista completa de amenidades:

- WiFi gratuito <!-- EXTRAE: amenities_list -->
- Aire acondicionado <!-- EXTRAE: amenities_list -->
- Smart TV con Netflix <!-- EXTRAE: amenities_list -->

### Amenities en Texto Completo
WiFi, Aire acondicionado, Smart TV, Netflix, Balcón privado <!-- EXTRAE: unit_amenities -->

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual está disponible?**
**A:** Galería de imágenes y ubicación:

- **Foto principal**: URL de la imagen <!-- EXTRAE: images -->

## Políticas y Configuración del Alojamiento {#politicas-configuracion}

**Q: ¿Cuáles son las políticas?**
**A:** Información de políticas operacionales:

- **Estado operacional**: active <!-- EXTRAE: status -->
- **Destacado**: true <!-- EXTRAE: is_featured -->

## Proceso de Reserva {#proceso-reserva}

**Q: ¿Cómo reservar?**
**A:** Pasos para la reserva:

1. Acceder al sistema de reservas
2. Seleccionar fechas
3. Confirmar disponibilidad
```

---

## 🔄 Qué Hace el Script

### 1. Discovery Automático
- Busca todos los `.md` en `_assets/*/accommodations/**/*.md`
- Agrupa por tenant automáticamente
- Valida formato v3.0

### 2. Extracción de Datos
- Lee frontmatter YAML
- Extrae metadata (18 campos completos)
- Construye objetos: `pricing`, `amenities`, `metadata`

### 3. Chunking Semántico
- Divide por secciones `## Título {#anchor}`
- Clasifica tipo: overview, pricing, amenities, location, policies, booking
- Agrega contexto: `"[Nombre Alojamiento] - [Título Sección]\n\n[Contenido]"`
- Resultado: **7-8 chunks por alojamiento** (vs 1 documento completo)

### 4. Generación de Embeddings
- Modelo: `text-embedding-3-large`
- Dimensiones: 1024 (Matryoshka Tier 1)
- Velocidad: ~1 segundo por chunk
- Costo: ~$0.13 por millón de tokens

### 5. Sync a Base de Datos
- Tabla: `accommodation_units_public` (public schema)
- Operación: UPSERT (INSERT si es nuevo, UPDATE si existe)
- Match por: `tenant_id` + `name` (nombre del chunk)
- Columnas sincronizadas:
  ```typescript
  {
    tenant_id: UUID,
    name: string,              // "Alojamiento - Sección"
    unit_number: string,
    unit_type: string,         // room | apartment | suite
    description: text,         // Contenido completo del chunk
    short_description: string,
    amenities: JSONB,
    pricing: JSONB,
    photos: JSONB,
    metadata: JSONB,
    embedding_fast: vector(1024),
    is_active: boolean,
    is_bookable: boolean
  }
  ```

---

## 📊 Output Esperado

### Sync Exitoso
```
🚀 MUVA Universal Accommodation Sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 Found 15 accommodation files

📊 SIMMERDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   📄 Apartamento Summertime
      Completeness: 100%
      Pricing: COP 215,000
      Amenities: smart_tv, netflix, escritorio de trabajo, wifi...
      Metadata fields: 18
      📦 Chunks: 7 secciones semánticas
      ✅ [1/7] Chunk synced: Overview
      ✅ [2/7] Chunk synced: Capacidad y Configuración
      ✅ [3/7] Chunk synced: Amenidades y Comodidades
      ✅ [4/7] Chunk synced: Tarifas y Precios
      ✅ [5/7] Chunk synced: Información Visual y Ubicación
      ✅ [6/7] Chunk synced: Proceso de Reserva
      ✅ [7/7] Chunk synced: Políticas y Configuración
      ✅ All 7 chunks synced for Apartamento Summertime

════════════════════════════════════════════════════════════
📊 MUVA ACCOMMODATION SYNC - SUMMARY
════════════════════════════════════════════════════════════

📦 SIMMERDOWN (b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf)
   Accommodations: 9
   Total chunks created: 65
   Pricing: 100% (9/9) ✅
   Amenities: 100% (9/9) ✅
   Metadata: 100% (9/9) ✅
   Overall Completeness: 100% ⭐

✅ All accommodations synced successfully!
```

---

## 🎯 Onboarding Nuevo Hotel - Checklist

### 1. Preparación
- [ ] Obtener `tenant_id` del nuevo hotel desde `tenant_registry`
- [ ] Crear carpeta: `_assets/[nombre-hotel]/accommodations/`
- [ ] Definir tipos de alojamiento: `rooms/`, `apartments/`, `suites/`

### 2. Creación de Archivos
- [ ] Crear 1 archivo `.md` por cada alojamiento
- [ ] Copiar template de frontmatter YAML
- [ ] Completar TODOS los campos obligatorios:
  - `version: "3.0"`
  - `tenant_id`
  - `document.title`
  - `accommodation.unit_type`
  - `accommodation.capacity`
  - `accommodation.pricing` (al menos `base_price_low_season`)
  - `accommodation.amenities.features` (mínimo 3)
  - `accommodation.images` (mínimo 1)

### 3. Contenido Markdown
- [ ] Escribir secciones semánticas con estructura Q&A
- [ ] Incluir anchors: `## Título {#anchor}`
- [ ] Agregar marcadores `<!-- EXTRAE: campo -->` para datos críticos
- [ ] Mínimo 5 secciones: Overview, Capacidad, Tarifas, Amenities, Políticas

### 4. Validación Local
- [ ] Dry run: `npx tsx scripts/sync-accommodations-to-public.ts --tenant [nombre] --dry-run`
- [ ] Verificar que encuentra todos los archivos
- [ ] Revisar que Completeness score > 90%
- [ ] Confirmar número de chunks esperado (7-8 por alojamiento)

### 5. Sincronización Real
- [ ] Ejecutar: `npx tsx scripts/sync-accommodations-to-public.ts --tenant [nombre]`
- [ ] Esperar mensaje: `✅ All accommodations synced successfully!`
- [ ] Verificar en Admin Panel: `https://[tenant].muva.chat/admin/knowledge-base`
- [ ] Confirmar chunks visibles en Knowledge Base

### 6. Testing del Chat
- [ ] Abrir: `https://[tenant].muva.chat/`
- [ ] Preguntar: "¿Qué alojamientos tienen disponibles?"
- [ ] Preguntar: "¿Cuál es el precio de [nombre-alojamiento]?"
- [ ] Preguntar: "¿[alojamiento] tiene [amenity específico]?"
- [ ] Verificar que LLM responde con información correcta

---

## 🔧 Troubleshooting

### Error: "Missing tenant_id"
**Causa:** Frontmatter sin campo `tenant_id`
**Solución:** Agregar `tenant_id: "uuid-del-tenant"` en frontmatter

### Error: "not version 3.0"
**Causa:** Archivo con formato v1.0 o v2.0
**Solución:** Actualizar frontmatter a `version: "3.0"`

### Completeness < 90%
**Causa:** Campos faltantes en frontmatter o markdown
**Solución:** Completar campos obligatorios:
- `pricing.base_price_low_season` > 0
- `amenities.features` (mínimo 3)
- `accommodation.size_m2` > 0
- `accommodation.capacity` > 0
- `metadata.unique_features` (mínimo 1)
- `images` (mínimo 1 URL)

### Chunks no aparecen en Knowledge Base
**Causa:** Caché del navegador
**Solución:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) o modo incógnito

### Chat no reconoce información
**Causa:** Embeddings desactualizados o truncados
**Solución:**
1. Re-ejecutar script de sync
2. Verificar que RPC `match_accommodations_public` retorna chunks completos
3. Revisar que `public-chat-engine.ts` NO trunca contenido

---

## 💰 Costos Estimados

### OpenAI Embeddings
- **Modelo:** `text-embedding-3-large`
- **Dimensiones:** 1024
- **Costo:** $0.13 / 1M tokens

**Ejemplo Simmerdown (9 alojamientos, 65 chunks):**
- Tokens promedio por chunk: ~1,200
- Total tokens: 65 × 1,200 = 78,000
- Costo: $0.01 (un centavo de dólar)

**Escalabilidad:**
- 100 alojamientos ≈ 700 chunks ≈ $0.10 USD
- 1,000 alojamientos ≈ 7,000 chunks ≈ $1.00 USD

---

## 📈 Beneficios vs Documentos Completos

### Antes (Documentos Completos)
- ❌ 1 embedding por alojamiento (~7,000 chars)
- ❌ Similarity scores bajos (0.24-0.35)
- ❌ LLM recibe información irrelevante mezclada
- ❌ 17,136 tokens enviados a Claude por query
- ❌ Costo: ~$0.26 por 1,000 queries

### Ahora (Chunking Semántico)
- ✅ 7-8 embeddings por alojamiento (~1,000 chars c/u)
- ✅ Similarity scores altos (0.45-0.65)
- ✅ LLM recibe SOLO secciones relevantes
- ✅ 3,251 tokens enviados a Claude por query (81% reducción)
- ✅ Costo: ~$0.05 por 1,000 queries (80% ahorro)

**Resultado:** Mejor calidad + 80% menos costo

---

## 🔗 Referencias

- **Script:** `scripts/sync-accommodations-to-public.ts`
- **Tabla destino:** `accommodation_units_public` (schema: public)
- **RPC function:** `match_accommodations_public(vector(1024), UUID, FLOAT, INT)`
- **Chat engine:** `src/lib/public-chat-engine.ts`
- **Search engine:** `src/lib/public-chat-search.ts`

---

**Última actualización:** Enero 2025
**Versión:** 1.0.0
**Mantenedor:** MUVA Platform
