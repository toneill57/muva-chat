# 📖 GUÍA COMPLETA: MUVA Template V2.0

**Fecha:** Septiembre 2025
**Template:** `_assets/muva/MUVA_LISTING_TEMPLATE_V2.md`
**Sistema:** MUVA Matryoshka Embeddings + Metadata Optimization

---

## 🎯 INTRODUCCIÓN

Esta guía te ayudará a crear documentos MUVA optimizados para:
- ✅ Búsqueda vectorial ultra-rápida (10x performance)
- ✅ Filtrado granular por subcategoría
- ✅ Tags bilingües semánticos
- ✅ Premium Chat con respuestas conversacionales
- ✅ 0ms latencia adicional en búsquedas

---

## 📚 TABLA DE CONTENIDOS

1. [¿Cuándo Usar Esta Template?](#cuando-usar)
2. [Estructura del Documento](#estructura)
3. [Guía de Subcategorías](#subcategorias)
4. [Estrategia de Tags](#tags-strategy)
5. [Tags vs Keywords](#tags-vs-keywords)
6. [Ejemplos Completos](#ejemplos)
7. [Errores Comunes](#errores-comunes)
8. [Checklist Final](#checklist)

---

## 🎯 ¿CUÁNDO USAR ESTA TEMPLATE? {#cuando-usar}

**Usa MUVA Template V2.0 para:**

✅ **Actividades turísticas** (buceo, surf, parasailing, yoga)
✅ **Spots de playa** (clubes de playa, lugares icónicos)
✅ **Restaurantes** (gastronomía local, internacional, saludable)
✅ **Alquileres** (carros, motos, botes)
✅ **Cultura** (museos, eventos musicales)

**NO uses para:**

❌ **Políticas del hotel** (usa hotel-documentation-template)
❌ **Requisitos SIRE** (usa sire-documentation-template)
❌ **Habitaciones/Unidades** (usa accommodation templates)

---

## 📋 ESTRUCTURA DEL DOCUMENTO {#estructura}

### **Frontmatter YAML** (Metadata)

```yaml
---
version: "2.0"
type: tourism
destination:
  schema: public
  table: muva_content

document:
  title: "NOMBRE EN MAYÚSCULAS"
  description: "Descripción corta"
  category: activities  # ← activities|spots|restaurants|rentals|culture
  subcategory: diving   # ← Ver guía abajo
  language: es
  version: "2.0"
  status: active
  tags: [tag1, tag2, tag3]     # ← 7-11 tags bilingües
  keywords: [kw1, kw2, kw3]    # ← Identidad del negocio

business:
  id: unique-slug
  nombre: NOMBRE OFICIAL
  categoria: Actividad
  horario: "Horarios"
  precio: "Precios"
  contacto: "@instagram"
  telefono: "+573001234567"
  zona: "Centro"
  subzona: "Optional"
---
```

### **Contenido Markdown**

```markdown
# NOMBRE DEL NEGOCIO

## Descripción General
[2-3 párrafos sobre el negocio]

## Servicios Ofrecidos
[Lista de servicios con detalles]

## Información de Contacto
[Teléfono, redes, website]

## Ubicación y Zona
[Características de la zona]

## Recomendaciones para Visitantes
[Tips prácticos]
```

---

## 🗂️ GUÍA COMPLETA DE SUBCATEGORÍAS {#subcategorias}

### **ACTIVITIES** (31 documentos)

| Subcategoría | Cuándo Usar | Ejemplos | Tags Típicos |
|--------------|-------------|----------|--------------|
| `diving` | Escuelas de buceo, certificaciones PADI | Blue Life Dive, Hans Dive Shop | diving, scuba, padi, certification, buceo |
| `surf` | Escuelas de surf, clases de tabla | Banzai Surf School, South Beauty | surf, surfing, lessons, waves, olas |
| `wakeboard_kitesurf` | Deportes extremos acuáticos | Sai Xperience, Caribbean Xperience | wakeboard, kitesurf, wind, extreme |
| `parasailing` | Vuelos en paracaídas sobre el mar | Marino Parasail, Richie Parasail | parasail, flying, aerial, paracaidas |
| `paddleboard` | Stand-up paddle board | Sai Xperience Sunset Tour | paddle_board, sup, calm, sunset |
| `wellness` | Yoga, spa, meditación | Yoga San Andrés | yoga, wellness, meditation, bienestar |
| `multi_activity` | Agencias con múltiples servicios | Seawolf | multi_activity, agency, tours |

**¿Cómo decidir?**
- Buceo profesional con certificación → `diving`
- Surf o aprender a surfear → `surf`
- Actividad con motor/cometa → `wakeboard_kitesurf`
- Vuelo con paracaídas → `parasailing`
- Paddle tranquilo → `paddleboard`
- Bienestar/relajación → `wellness`
- Múltiples actividades → `multi_activity`

### **SPOTS** (15 documentos)

| Subcategoría | Cuándo Usar | Ejemplos | Tags Típicos |
|--------------|-------------|----------|--------------|
| `beach_clubs` | Clubes de playa con comida/bebida/snorkeling | Big Mama, Bobby Rock, Madguana | beach, beach_club, snorkeling, sunset |
| `local_hangouts` | Lugares icónicos locales, autóctonos | Bengue's Place | local, iconic, emblematico, agua_coco |
| `nature_spots` | Jardines, lagunas, miradores naturales | Jardín Botánico, Laguna Big Pond | nature, wildlife, lagoon, mirador |

**¿Cómo decidir?**
- Tiene comida/bebida frente al mar → `beach_clubs`
- Lugar icónico local, tradicional → `local_hangouts`
- Naturaleza, fauna, flora → `nature_spots`

### **RESTAURANTS** (13 documentos)

| Subcategoría | Cuándo Usar | Ejemplos | Tags Típicos |
|--------------|-------------|----------|--------------|
| `gastronomia_internacional` | Cocina internacional, fusion, sushi | Tierra Dentro, Seaweed, Aqua | restaurant, sushi, international, fusion |
| `gastronomia_saludable` | Smoothies, opciones sin gluten, healthy | Bali Smoothies, Coral Crêpes | healthy, smoothies, gluten_free, saludable |
| `gastronomia_local` | Comida típica isleña, autóctona | El Totumasso | local_food, comida_local, authentic |
| `desserts` | Heladerías, postres | Miss Vivi | ice_cream, desserts, postres, heladeria |

**¿Cómo decidir?**
- Sushi, fusion, internacional → `gastronomia_internacional`
- Smoothies, healthy, sin gluten → `gastronomia_saludable`
- Comida típica isleña → `gastronomia_local`
- Solo postres/helados → `desserts`

### **RENTALS** (3 documentos)

| Subcategoría | Cuándo Usar | Ejemplos | Tags Típicos |
|--------------|-------------|----------|--------------|
| `vehicle_rentals` | Alquiler de carros, motos, botes, pontones | Da Black Almond, Seawolf | rentals, vehicles, cars, motorcycles, boats |

### **CULTURE** (2 documentos)

| Subcategoría | Cuándo Usar | Ejemplos | Tags Típicos |
|--------------|-------------|----------|--------------|
| `museums` | Museos, sitios históricos | Casa Museo | museum, history, architecture, cultura |
| `cultural_events` | Eventos musicales, shows en vivo | Caribbean Nights | music, live_music, events, artistas |

---

## 🏷️ ESTRATEGIA DE TAGS SEMÁNTICOS {#tags-strategy}

### **Principios de Tags:**

1. **Bilingüe Obligatorio**
   - SIEMPRE incluir Español + Inglés
   - Ejemplo: `diving` + `buceo`, `beach` + `playa`

2. **Semántico (No Literal)**
   - Tags representan INTENCIÓN DE BÚSQUEDA
   - Ejemplo: Usuario busca "certificación de buceo" → tag `certification`

3. **Normalizado**
   - Formato: `lowercase`, `snake_case`
   - ✅ Correcto: `dive_school`, `agua_coco`, `gluten_free`
   - ❌ Incorrecto: `Dive-School`, `Agua De Coco`, `glutenFree`

4. **Cantidad Óptima: 7-11 tags**
   - Mínimo 7 para cobertura
   - Máximo 11 para evitar spam
   - Balance entre precisión y relevancia

5. **Reutilizables**
   - Tags aplicables a múltiples negocios
   - Ejemplo: `diving` se usa en 4 escuelas de buceo diferentes

### **Taxonomía de Tags por Categoría:**

#### **ACTIVITIES:**
```
# Diving
diving, scuba, padi, certification, dive_school, underwater, buceo, certificacion, centro_buceo, professional

# Surf
surf, surfing, lessons, waves, beach, beginner_friendly, clases_surf, principiantes, water_sports, olas

# Wakeboard/Kitesurf
wakeboard, kitesurf, wind, extreme, adrenaline, deportes_acuaticos, cometa

# Parasailing
parasail, parasailing, flying, aerial, adventure, views, paracaidas, vuelo, altura

# Wellness
yoga, wellness, meditation, relaxation, beach_yoga, bienestar, relajacion, health
```

#### **SPOTS:**
```
# Beach Clubs
beach, beach_club, snorkeling, sunset, local_food, views, atardecer, caretear, playa, chill

# Local Hangouts
local, iconic, emblematico, coconut_water, agua_coco, must_visit

# Nature Spots
nature, wildlife, lagoon, botanical_garden, mirador, naturaleza, fauna, flora
```

#### **RESTAURANTS:**
```
# Internacional
restaurant, sushi, nikkei, japanese, international, fusion, dining

# Saludable
healthy, smoothies, breakfast, gluten_free, fruits, saludable, desayuno, sin_gluten

# Local
local_food, comida_local, authentic, typical, tradicional, islena
```

---

## 🔑 TAGS vs KEYWORDS - Diferencia Clave {#tags-vs-keywords}

### **TAGS** (Semánticos)

**Propósito:** Búsqueda y filtrado eficiente

**Características:**
- ✅ Normalizado (lowercase, snake_case)
- ✅ Bilingüe (Español + Inglés)
- ✅ Semántico (intención de búsqueda)
- ✅ Reutilizable (aplicable a múltiples negocios)

**Ejemplo:**
```yaml
tags: [diving, scuba, padi, certification, dive_school, underwater, buceo, certificacion, centro_buceo, professional]
```

**Uso en sistema:**
```typescript
// Post-filtrado en memoria después de vector search
results.filter(r => r.tags.includes('diving'))
```

### **KEYWORDS** (Identidad)

**Propósito:** Identidad del negocio + metadata específica

**Características:**
- ✅ Específico al negocio
- ✅ Incluye nombres propios y variantes
- ✅ Términos literales del contenido
- ✅ Metadata mixta (precios, zonas)

**Ejemplo:**
```yaml
keywords: [blue-life-dive, blue life dive, centro, $230000, padi, actividad, buceo]
```

**Uso en sistema:**
```typescript
// Incluidos en embeddings para matching exacto
const embedding = generateEmbedding(content + keywords.join(' '))
```

### **Regla de Oro:**

| Aspecto | TAGS | KEYWORDS |
|---------|------|----------|
| **Para** | BÚSQUEDA | IDENTIDAD |
| **Formato** | Normalizado | Literal |
| **Bilingüe** | Siempre | Parcial |
| **En embeddings** | NO | SÍ |
| **Post-filtrado** | SÍ | NO |

---

## 📝 EJEMPLOS COMPLETOS POR CATEGORÍA {#ejemplos}

### **Example 1: Diving School - Blue Life Dive**

```yaml
---
version: "2.0"
type: tourism
destination:
  schema: public
  table: muva_content

document:
  title: "BLUE LIFE DIVE"
  description: "Escuela de buceo profesional con certificaciones PADI y más de 25 años de experiencia en San Andrés"
  category: activities
  subcategory: diving
  language: es
  version: "2.0"
  status: active
  tags: [diving, scuba, padi, certification, dive_school, underwater, buceo, certificacion, centro_buceo, professional]
  keywords: [blue-life-dive, blue life dive, centro, $230000, padi, actividad]

business:
  id: blue-life-dive
  nombre: BLUE LIFE DIVE
  categoria: Actividad
  horario: "Según se reserve"
  precio: "Minicurso: $230,000. Certificaciones varían"
  contacto: "info@bluelifedive.com"
  telefono: "+573174344015"
  website: "https://bluelifedive.com"
  zona: "Centro"
---
```

### **Example 2: Beach Club - Big Mama**

```yaml
---
version: "2.0"
type: tourism
destination:
  schema: public
  table: muva_content

document:
  title: "BIG MAMA"
  description: "Club de playa icónico en Cove con snorkeling, comida isleña y los mejores atardeceres de la isla"
  category: spots
  subcategory: beach_clubs
  language: es
  version: "2.0"
  status: active
  tags: [beach, beach_club, snorkeling, sunset, local_food, views, atardecer, caretear, playa, cove, chill]
  keywords: [big-mama, big mama, spot, cove, hoyo soplador, km9]

business:
  id: big-mama
  nombre: BIG MAMA
  categoria: Spot
  horario: "9am a 7pm"
  precio: "Consultar precios"
  contacto: "@bigmama_km9"
  zona: "Cove"
  subzona: "Cove"
---
```

### **Example 3: Healthy Restaurant - Bali Smoothies**

```yaml
---
version: "2.0"
type: tourism
destination:
  schema: public
  table: muva_content

document:
  title: "BALI SMOOTHIES"
  description: "Restaurante saludable especializado en smoothies, bowls y opciones sin gluten para desayuno y brunch"
  category: restaurants
  subcategory: gastronomia_saludable
  language: es
  version: "2.0"
  status: active
  tags: [restaurant, healthy, smoothies, breakfast, brunch, gluten_free, fruits, saludable, desayuno, sin_gluten]
  keywords: [bali-smoothies, bali, desayuno, breakfast, bowl, smoothie]

business:
  id: bali-smoothies
  nombre: BALI SMOOTHIES
  categoria: Restaurante
  horario: "8am a 3pm"
  precio: "Desde $18,000 COP"
  contacto: "@balismoothiessai"
  telefono: "+573001234567"
  zona: "Centro"
---
```

---

## ❌ ERRORES COMUNES Y CÓMO EVITARLOS {#errores-comunes}

### **Error #1: Subcategory Genérica**

❌ **Incorrecto:**
```yaml
category: activities
subcategory: deportes_acuaticos  # ← Muy genérico
```

✅ **Correcto:**
```yaml
category: activities
subcategory: diving  # ← Específico
```

### **Error #2: Tags No Bilingües**

❌ **Incorrecto:**
```yaml
tags: [diving, scuba, padi, certification, underwater]  # ← Solo inglés
```

✅ **Correcto:**
```yaml
tags: [diving, scuba, padi, certification, underwater, buceo, certificacion, centro_buceo]  # ← Bilingüe
```

### **Error #3: Tags No Normalizados**

❌ **Incorrecto:**
```yaml
tags: [Diving School, PADI Certification, Agua De Coco]  # ← Mayúsculas, espacios
```

✅ **Correcto:**
```yaml
tags: [dive_school, padi_certification, agua_coco]  # ← lowercase, snake_case
```

### **Error #4: Confundir Tags con Keywords**

❌ **Incorrecto:**
```yaml
tags: [blue-life-dive, $230000, 317 434 4015]  # ← Esto va en keywords
keywords: [diving, buceo, underwater]          # ← Esto va en tags
```

✅ **Correcto:**
```yaml
tags: [diving, buceo, underwater, certification]  # ← Semánticos
keywords: [blue-life-dive, $230000, centro]      # ← Específicos
```

### **Error #5: Title No en Mayúsculas**

❌ **Incorrecto:**
```yaml
title: "Blue Life Dive"  # ← Mixed case
```

✅ **Correcto:**
```yaml
title: "BLUE LIFE DIVE"  # ← MAYÚSCULAS
```

---

## ✅ CHECKLIST FINAL {#checklist}

### **Metadata (Frontmatter):**

- [ ] `version: "2.0"` correcto
- [ ] `title` en MAYÚSCULAS
- [ ] `description` concisa (1-2 líneas)
- [ ] `category` correcta (activities/spots/restaurants/rentals/culture)
- [ ] `subcategory` ESPECÍFICA (una de las 17, NO "general")
- [ ] `tags` bilingües (Español + Inglés)
- [ ] `tags` normalizados (lowercase, snake_case)
- [ ] `tags` semánticos (7-11 tags)
- [ ] `keywords` con identidad del negocio

### **Business Info:**

- [ ] `business.id` en slug format (minúsculas-con-guiones)
- [ ] `business.nombre` en MAYÚSCULAS
- [ ] `business.categoria` correcta (Actividad/Restaurante/Spot/Alquiler/Cultura)
- [ ] `business.horario` con información clara
- [ ] `business.precio` con información clara
- [ ] `business.telefono` con código de país (+57)
- [ ] `business.zona` correcta (Centro/San Luis/La Loma/Sound Bay/Cove)

### **Contenido:**

- [ ] Título H1 en MAYÚSCULAS
- [ ] Sección "Descripción General" (2-3 párrafos)
- [ ] Sección "Servicios Ofrecidos" con detalles
- [ ] Sección "Información de Contacto"
- [ ] Sección "Ubicación y Zona"
- [ ] Sección "Recomendaciones para Visitantes"
- [ ] Contenido descriptivo y útil (no solo metadata)

---

## 🚀 PROCESAMIENTO

### **Comando:**

```bash
node scripts/populate-embeddings.js _assets/muva/listings-by-category/tu-archivo.md
```

### **El Sistema:**

1. ✅ Extrae metadata del YAML
2. ✅ Valida campos requeridos
3. ✅ Genera embeddings multi-tier (1024d + 3072d)
4. ✅ Guarda en `public.muva_content`
5. ✅ Aplica subcategory y tags optimizados
6. ✅ Indexa para búsqueda (<15ms)

---

## 📚 RECURSOS ADICIONALES

- **Template:** `_assets/muva/MUVA_LISTING_TEMPLATE_V2.md`
- **Reporte de Metadata:** `docs/METADATA_OPTIMIZATION_REPORT.md`
- **Template Antigua (deprecated):** `_assets/deprecated/muva-listing-template.md`

---

**Guía Version:** 2.0
**Última actualización:** Septiembre 2025
**Sistema:** MUVA Matryoshka Embeddings + Metadata Optimization