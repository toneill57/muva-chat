# Script Ejecutable - Create Tucasamar Tenant

**Proyecto:** Create Tucasamar Tenant
**Fecha:** October 11, 2025
**Tipo:** Script Copy-Paste (Single Session)
**Estrategia:** TodoList + Testing Incremental
**Tiempo Estimado:** 75 minutes

---

## 🎯 OBJETIVO

Crear tenant "Tu casa en el mar" (`tucasamar`) con estructura básica de archivos y generar prompt para scraping manual de datos faltantes.

**Problema Actual:**
- No existe tenant `tucasamar` en el sistema
- Falta documentación de alojamientos
- Info básica disponible vía WebFetch, pero faltan precios y detalles

**Estado Deseado:**
- ✅ Estructura completa de archivos `_assets/tucasamar/`
- ✅ 6 unidades de alojamiento documentadas (con placeholders)
- ✅ FAQ y políticas template creados
- ✅ Tenant registrado en database
- ✅ Prompt de scraping manual generado para completar datos

---

## 📊 ESTRATEGIA

**Hybrid Approach:**
- ✅ Single session (rápido, menos overhead)
- ✅ TodoList tracking (visibilidad de progreso)
- ✅ Testing incremental (seguridad)
- ✅ Commits por task (rollback fácil)
- ✅ Placeholders para data faltante

**Por qué Script Copy-Paste:**
- Tarea bien definida: crear estructura + placeholders
- Scraping manual en segundo paso
- No requiere múltiples agentes
- Context usage manejable (~30k tokens)
- Ejecución inmediata

---

## 🚀 PROMPT EJECUTABLE (COPY-PASTE)

**Instrucciones:**
1. Haz `/clear` en nueva conversación
2. Copy-paste el siguiente prompt COMPLETO
3. Sigue las instrucciones del asistente

---

### PROMPT COMIENZA AQUÍ ⬇️

```
PROYECTO: Create Tucasamar Tenant

OBJETIVO:
Crear tenant "Tu casa en el mar" (subdomain: tucasamar) con estructura completa de archivos y prompt para scraping manual de datos faltantes.

CONTEXTO:
- Repo: /Users/oneill/Sites/apps/muva-chat
- Negocio: Tu casa en el mar (https://tucasaenelmar.com)
- Ubicación: San Andrés, Colombia (zona central, 2 cuadras de playa)
- Temática: Cayos caribeños (Haines, Serrana, Queena, Cotton, Crab, Rose)
- Info disponible: Nombres unidades, capacidades, ubicación
- Info faltante: Precios, amenities detallados, fotos específicas
- Estructura base: Copiar de `_assets/simmerdown/`
- NO romper producción

---

TASKS (Ejecutar en orden, con testing entre cada una):

## TASK 1: Crear estructura de alojamientos (30min) 🟡

**Objetivo:** Crear 6 archivos markdown (5 habitaciones + 1 apartamento) con info básica y placeholders para datos faltantes.

**Archivos a crear (6):**

### 1. `_assets/tucasamar/accommodations/rooms/haines-cay.md`
**Contenido:**
\```markdown
---
version: "1.0"
type: "hotel_process"
destination:
  schema: "hotels"
  table: "accommodation_units"
document:
  title: "Habitación Doble Haines Cay"
  description: "Habitación doble con balcón y ventanas acústicas en Tu casa en el mar"
  category: "accommodations"
  subcategory: "accommodation_unit"
  language: "es"
  version: "1.0"
  status: "active"
  tags: ["haines_cay", "room", "balcony", "acoustic_windows", "tucasamar", "san_andres"]
  keywords: ["haines", "habitacion", "doble", "balcon", "ventanas_acústicas", "pareja", "familia"]
title: "Habitación Doble Haines Cay"
description: "Habitación doble con balcón y ventanas acústicas ideal para parejas, familias o grupos pequeños"
business_name: "Tu casa en el mar"
business_nit: "[PENDING_SCRAPING]"
location: "San Andrés, Colombia"
tenant_id: "[PENDING_DB_INSERT]"
unit_type: "room"
capacity: 2
content_type: "accommodation_unit"
schema: "hotels"
---

# Habitación Doble Haines Cay - Con Balcón

## Overview {#overview}

**Q: ¿Qué es la Habitación Doble Haines Cay y por qué es ideal para huéspedes?**
**A:** La Habitación Doble Haines Cay es una acogedora habitación ubicada en Tu casa en el mar, donde los huéspedes disfrutan de privacidad con balcón privado y ventanas acústicas que garantizan descanso. Es perfecta para parejas o familias pequeñas que buscan comodidad y tranquilidad en el corazón de San Andrés.

## Capacidad y Configuración de Espacios {#capacidad-configuracion}

**Q: ¿Cuáles son las especificaciones de capacidad y distribución de espacios de Haines Cay?**
**A:** Detalles completos de la configuración:

### Capacidad y Distribución
- **Capacidad máxima**: 1-2 personas <!-- EXTRAE: capacity.max_capacity -->
- **Configuración de camas**: [PENDING_SCRAPING] <!-- EXTRAE: bed_configuration -->
- **Tamaño**: [PENDING_SCRAPING] m² <!-- EXTRAE: size_m2 -->
- **Número de piso**: [PENDING_SCRAPING] <!-- EXTRAE: floor_number -->
- **Tipo de vista**: Balcón con vista <!-- EXTRAE: view_type -->
- **Número de unidad**: Haines Cay <!-- EXTRAE: unit_number -->

### Espacios y Áreas
- **Espacios privados**: Habitación doble, balcón privado
- **Características únicas**: Balcón privado, ventanas acústicas para máximo descanso <!-- EXTRAE: unique_features -->

## Tarifas y Precios Detallados {#tarifas-precios}

**Q: ¿Cuáles son las tarifas de Haines Cay según temporada?**
**A:** [PENDING_SCRAPING] - Precios por temporada alta y baja

### Temporada Baja
- **2 personas**: [PENDING_SCRAPING] COP por noche <!-- EXTRAE: base_price_low_season -->
- **Persona adicional**: [PENDING_SCRAPING] COP <!-- EXTRAE: price_per_person_low -->

### Temporada Alta
- **2 personas**: [PENDING_SCRAPING] COP por noche <!-- EXTRAE: base_price_high_season -->
- **Persona adicional**: [PENDING_SCRAPING] COP <!-- EXTRAE: price_per_person_high -->

### Información de Precios
- **Moneda**: Pesos colombianos (COP)
- **Incluye**: [PENDING_SCRAPING]

## Amenities y Características Especiales {#amenities-caracteristicas}

**Q: ¿Qué amenities están incluidos en Haines Cay?**
**A:** Lista completa de amenities:

### Tecnología y Entretenimiento
- [PENDING_SCRAPING]

### Comodidades de la Habitación
- **Balcón privado**: Espacio al aire libre exclusivo <!-- EXTRAE: amenities_list -->
- **Ventanas acústicas**: Aislamiento de ruido para descanso óptimo <!-- EXTRAE: amenities_list -->
- [PENDING_SCRAPING]

### Características Únicas
- Balcón con vista
- Ventanas acústicas de alta calidad
- Ubicación privilegiada en zona central
- 2 cuadras de la playa principal

## Información Visual y Ubicación Detallada {#visual-ubicacion}

**Q: ¿Qué información visual y detalles de ubicación están disponibles?**
**A:** Detalles de ubicación e imágenes:

### Galería Visual
- **Foto principal**: [PENDING_SCRAPING] <!-- EXTRAE: images -->
- **Balcón**: [PENDING_SCRAPING] <!-- EXTRAE: images -->
- **Vista interior**: [PENDING_SCRAPING] <!-- EXTRAE: images -->

### Ubicación
- **Ubicación específica**: Zona central de San Andrés <!-- EXTRAE: location_details -->
- **Distancia a playa**: 2 cuadras de la playa principal <!-- EXTRAE: location_details -->
- **Contexto**: San Andrés, Colombia - Caribe colombiano <!-- EXTRAE: location_details -->

### Atractivos Turísticos
- **Playa cercana**: A solo 2 cuadras <!-- EXTRAE: tourism_features -->
- **Zona central**: Restaurantes, comercios, vida nocturna <!-- EXTRAE: tourism_features -->
- **Cultura caribeña**: Ambiente auténtico de la isla <!-- EXTRAE: tourism_features -->

## Políticas y Configuración {#politicas-configuracion}

**Q: ¿Cuáles son las políticas específicas de Haines Cay?**
**A:** [PENDING_SCRAPING]

### Estado del Sistema
- **Estado operacional**: active - Disponible para reservas <!-- EXTRAE: status -->
- **Destacado**: true <!-- EXTRAE: is_featured -->
- **Orden de visualización**: 1 <!-- EXTRAE: display_order -->

## Proceso de Reserva {#proceso-reserva}

**Q: ¿Cómo reservar Haines Cay?**
**A:** Proceso de reserva:

1. **Consultar disponibilidad**: Verificar fechas en sistema
2. **Confirmar temporada**: Alta o baja para tarifa correcta
3. **Acceder al sistema**: [PENDING_SCRAPING - URL de reserva]
4. **Completar información**: Datos de huéspedes
5. **Realizar pago**: Según políticas del establecimiento
6. **Recibir confirmación**: Instrucciones de check-in

---

**Última actualización**: 2025-10-11
**Requiere actualización manual**: Sí - Ejecutar scraping prompt para completar [PENDING_SCRAPING]
\```

### 2. `_assets/tucasamar/accommodations/rooms/serrana-cay.md`
**Contenido:** (Copiar estructura de Haines Cay, cambiar:)
- title: "Habitación Doble Serrana Cay"
- tags: ["serrana_cay", "room", ...]
- Mantener todos los [PENDING_SCRAPING]

### 3. `_assets/tucasamar/accommodations/rooms/queena-reef.md`
**Contenido:** (Copiar estructura, cambiar a "Queena Reef")

### 4. `_assets/tucasamar/accommodations/rooms/cotton-cay.md`
**Contenido:** (Copiar estructura, cambiar a "Cotton Cay", nota: "Habitación privada sin balcón")

### 5. `_assets/tucasamar/accommodations/rooms/crab-cay.md`
**Contenido:** (Copiar estructura, cambiar a "Crab Cay", nota: "Habitación interior sin vista exterior")

### 6. `_assets/tucasamar/accommodations/apartments/rose-cay.md`
**Contenido:** (Similar estructura pero:)
- unit_type: "apartment"
- capacity: 6
- title: "Apartamento Familiar Rose Cay"
- description: "Apartamento familiar para grupos grandes de hasta 6 personas"

**TEST DESPUÉS DE TASK 1:**
\```bash
# Verificar archivos creados
ls -la _assets/tucasamar/accommodations/rooms/
ls -la _assets/tucasamar/accommodations/apartments/

# Contar archivos (debe ser 6)
find _assets/tucasamar/accommodations -name "*.md" | wc -l

# Verificar formato markdown válido (primer archivo)
head -50 _assets/tucasamar/accommodations/rooms/haines-cay.md
\```

**Expected:** 6 archivos creados, formato válido, placeholders presentes

**COMMIT:**
\```bash
git add _assets/tucasamar/
git commit -m "feat(tucasamar): create accommodation units structure

TASK 1: Create 6 accommodation unit files
- 5 rooms: Haines Cay, Serrana Cay, Queena Reef, Cotton Cay, Crab Cay
- 1 apartment: Rose Cay
- All files include YAML metadata + Q&A structure
- Placeholders [PENDING_SCRAPING] for missing data

Files changed: 6

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
\```

---

## TASK 2: Crear FAQ y políticas (20min) 🟢

**Objetivo:** Crear archivos de info para huéspedes y políticas template

**Archivos a crear (2):**

### 1. `_assets/tucasamar/guest-info/faq.md`
**Contenido:**
\```markdown
---
title: "Preguntas Frecuentes (FAQ)"
description: "Preguntas y respuestas frecuentes sobre Tu casa en el mar"
type: "services"
category: "hotel"
status: "active"
version: "1.0"
last_updated: "2025-10-11"
tags: ["faq", "preguntas_frecuentes", "guest_services"]
keywords: ["preguntas", "frecuentes", "reservas", "servicios"]
language: "es"
---

# F.A.Q. - Tu casa en el mar

Sitio web: [https://tucasaenelmar.com](https://tucasaenelmar.com)

---

# **Precio y Disponibilidad**

## **¿Tienen reservas de una noche?**

[PENDING_SCRAPING] - Política de estancia mínima

## **¿Cuál es la temporada alta y baja?**

[PENDING_SCRAPING] - Definición de temporadas

# **Ubicación**

## **¿Cuál es la dirección?**

Zona central de San Andrés, a 2 cuadras de la playa principal.
[PENDING_SCRAPING] - Dirección exacta y coordenadas

## **¿Es seguro caminar de noche?**

[PENDING_SCRAPING] - Info de seguridad del barrio

# **Reservas**

## **¿Cómo es el pago?**

[PENDING_SCRAPING] - Métodos de pago aceptados y políticas

## **¿Cómo se manejan las modificaciones y/o cancelaciones?**

[PENDING_SCRAPING] - Política de cancelación

## **¿Hay algún cobro adicional?**

[PENDING_SCRAPING] - Cargos adicionales si aplican

## **¿Hay algún descuento?**

[PENDING_SCRAPING] - Descuentos disponibles

# **Amenities y Servicios**

## **¿Hay servicio de desayuno?**

[PENDING_SCRAPING]

## **¿Cuál es la clave del Wi-Fi?**

[PENDING_SCRAPING]

## **¿Cuenta con piscina?**

[PENDING_SCRAPING]

## **¿Hay estacionamiento?**

[PENDING_SCRAPING]

# **Check-in y Check-out**

## **¿Cuál es el horario de check-in?**

[PENDING_SCRAPING]

## **¿Cuál es el horario de check-out?**

[PENDING_SCRAPING]

## **¿Se puede hacer early check-in o late check-out?**

[PENDING_SCRAPING]

---

**Nota:** Este FAQ requiere actualización con datos reales mediante scraping manual.
\```

### 2. `_assets/tucasamar/policies/house-rules.md`
**Contenido:**
\```markdown
---
title: "Reglas de la Casa"
description: "Políticas y normas de convivencia en Tu casa en el mar"
type: "policy"
category: "hotel"
status: "active"
version: "1.0"
last_updated: "2025-10-11"
tags: ["policies", "house_rules", "normas"]
keywords: ["reglas", "políticas", "normas", "convivencia"]
language: "es"
---

# Reglas de la Casa - Tu casa en el mar

## Horarios

### Check-in
[PENDING_SCRAPING]

### Check-out
[PENDING_SCRAPING]

### Horario de silencio
[PENDING_SCRAPING]

## Políticas Generales

### Fumar
[PENDING_SCRAPING]

### Mascotas
[PENDING_SCRAPING]

### Visitantes
[PENDING_SCRAPING]

### Fiestas y Eventos
[PENDING_SCRAPING]

## Uso de Instalaciones

### Espacios Comunes
[PENDING_SCRAPING]

### Cocina (si aplica)
[PENDING_SCRAPING]

### Limpieza
[PENDING_SCRAPING]

## Responsabilidades del Huésped

### Daños y Pérdidas
[PENDING_SCRAPING]

### Equipamiento
[PENDING_SCRAPING]

## Seguridad

### Llaves
[PENDING_SCRAPING]

### Emergencias
[PENDING_SCRAPING]

---

**Última actualización:** 2025-10-11
**Requiere datos reales:** Sí - Completar mediante scraping
\```

**TEST DESPUÉS DE TASK 2:**
\```bash
# Verificar archivos creados
ls -la _assets/tucasamar/guest-info/
ls -la _assets/tucasamar/policies/

# Verificar contenido
head -30 _assets/tucasamar/guest-info/faq.md
head -30 _assets/tucasamar/policies/house-rules.md
\```

**Expected:** 2 archivos creados con estructura template

**COMMIT:**
\```bash
git add _assets/tucasamar/
git commit -m "docs(tucasamar): add guest info and policies templates

TASK 2: Create FAQ and house rules templates
- FAQ with common questions structure
- House rules with standard policies
- All marked with [PENDING_SCRAPING] placeholders

Files changed: 2

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
\```

---

## TASK 3: Generar prompt de scraping manual (15min) 🔴

**Objetivo:** Crear documento con prompt copy-paste para scraping manual de datos faltantes

**Archivo a crear:**
`docs/projects/create-tucasamar-tenant/scraping-prompt.md`

**Contenido:**
\```markdown
# Prompt de Scraping Manual - Tucasamar

**Proyecto:** Create Tucasamar Tenant
**Fecha:** 2025-10-11
**Objetivo:** Completar [PENDING_SCRAPING] en archivos de `_assets/tucasamar/`

---

## INSTRUCCIONES

Para cada alojamiento, visita su página en https://tucasaenelmar.com y extrae la información solicitada.

**Formato de respuesta:**
Copy-paste este template y completa con datos reales.

---

## ALOJAMIENTO 1: Haines Cay DOBLE

**URL:** https://tucasaenelmar.com/[encontrar-url-correcta]

### Datos a Extraer:

**Precios:**
- Temporada Baja (2 personas): $XXX,XXX COP
- Temporada Alta (2 personas): $XXX,XXX COP
- Persona adicional baja: $XXX,XXX COP (si aplica)
- Persona adicional alta: $XXX,XXX COP (si aplica)

**Configuración:**
- Tipo de cama: [Matrimonial / 2 individuales / Queen / etc]
- Tamaño habitación: XX m²
- Número de piso: [X]
- Baño: [Privado / Compartido]

**Amenities:**
- Lista completa separada por comas
- Ejemplo: "Wi-Fi, Aire acondicionado, TV, Minibar, Balcón privado"

**Fotos:**
- URL foto principal: https://...
- URL foto balcón: https://...
- URL foto interior: https://...

**Características únicas:**
- Texto descriptivo de qué hace especial esta habitación

---

## ALOJAMIENTO 2: Serrana Cay DOBLE

**URL:** https://tucasaenelmar.com/[encontrar-url]

[Repetir mismo template]

---

## ALOJAMIENTO 3: Queena Reef DOBLE

**URL:** https://tucasaenelmar.com/[encontrar-url]

[Repetir mismo template]

---

## ALOJAMIENTO 4: Cotton Cay DOBLE

**URL:** https://tucasaenelmar.com/[encontrar-url]

[Repetir mismo template]

---

## ALOJAMIENTO 5: Crab Cay DOBLE

**URL:** https://tucasaenelmar.com/[encontrar-url]

[Repetir mismo template]

---

## ALOJAMIENTO 6: Rose Cay Apartment

**URL:** https://tucasaenelmar.com/[encontrar-url]

**Precios:**
- Temporada Baja (hasta 6 personas): $XXX,XXX COP
- Temporada Alta (hasta 6 personas): $XXX,XXX COP

**Configuración:**
- Número de habitaciones: X
- Tipos de cama: [Describir cada habitación]
- Tamaño apartamento: XX m²
- Número de baños: X
- Cocina: [Sí/No, equipada con...]

**Amenities:**
- Lista completa

**Fotos:**
- URL foto principal: https://...
- URL cocina: https://...
- URL sala: https://...
- URL habitaciones: https://...

---

## INFORMACIÓN ADICIONAL (FAQ y Políticas)

**Políticas de Reserva:**
- Estancia mínima: X noches
- Check-in: XX:XX
- Check-out: XX:XX
- Política de cancelación: [Describir]

**Métodos de Pago:**
- [Lista de métodos aceptados]

**Descuentos:**
- [Describir si hay descuentos disponibles]

**Reglas de la Casa:**
- Fumar: [Permitido/No permitido/Solo en...]
- Mascotas: [Sí/No/Condiciones]
- Horario de silencio: [XX:XX a XX:XX]
- Visitantes: [Política]

**Servicios:**
- Desayuno: [Incluido/No incluido/Opcional]
- Wi-Fi: [Incluido, clave: XXXX]
- Estacionamiento: [Sí/No/Costo]
- Piscina: [Sí/No]

**Contacto:**
- Teléfono: [+57 XXX XXX XXXX]
- Email: [email@tucasaenelmar.com]
- WhatsApp: [+57 XXX XXX XXXX]
- NIT: [XXXXXXXXX-X]

---

## DESPUÉS DE COMPLETAR ESTE SCRAPING

1. **Actualizar archivos markdown:**
   - Reemplazar cada [PENDING_SCRAPING] con datos reales
   - Mantener formato YAML metadata
   - Preservar estructura de Q&A

2. **Commit cambios:**
   \```bash
   git add _assets/tucasamar/
   git commit -m "feat(tucasamar): complete accommodation data from manual scraping"
   \```

3. **Insertar en database:**
   - Ejecutar script de inserción en Supabase
   - Verificar con query: `SELECT * FROM accommodation_units WHERE tenant_id = '[uuid]'`

4. **Test chat:**
   - Visitar http://tucasamar.localhost:3000/
   - Preguntar: "¿Cuánto cuesta la habitación Haines Cay?"
   - Verificar: Respuesta con precios reales

---

**Tiempo estimado scraping:** 30-40 minutos
**Tiempo actualización archivos:** 20-30 minutos
**Total:** ~1 hora para completar datos
\```

**TEST DESPUÉS DE TASK 3:**
\```bash
# Verificar archivo creado
cat docs/projects/create-tucasamar-tenant/scraping-prompt.md | wc -l

# Expected: >200 líneas
\```

**COMMIT:**
\```bash
git add docs/projects/create-tucasamar-tenant/
git commit -m "docs(tucasamar): add manual scraping prompt for missing data

TASK 3: Create scraping template
- Template for 6 accommodation units
- Sections: prices, config, amenities, photos
- Additional: FAQ, policies, contact info
- Estimated time: 1 hour manual work

Files changed: 1

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
\```

---

## TASK 4: Insertar tenant en database (10min) 🔴

**Objetivo:** Crear registro en `tenant_registry` para tucasamar

**Script SQL:**
\```sql
INSERT INTO tenant_registry (
  subdomain,
  business_name,
  business_nit,
  logo_url,
  primary_color,
  address,
  phone,
  email,
  website_url,
  seo_meta_description,
  is_active,
  subscription_tier,
  latitude,
  longitude
) VALUES (
  'tucasamar',
  'Tu casa en el mar',
  'PENDING_MANUAL', -- Completar después con scraping
  'https://tucasaenelmar.com/wp-content/uploads/[logo-path]', -- Placeholder
  '#0891B2', -- Cyan-600 (color mar)
  'Zona central, San Andrés, Colombia',
  'PENDING_MANUAL',
  'PENDING_MANUAL',
  'https://tucasaenelmar.com',
  'Apartamentos y habitaciones frente al mar en San Andrés. Zona central, a 2 cuadras de la playa principal.',
  true,
  'premium',
  12.5847, -- San Andrés lat aproximada
  -81.7006  -- San Andrés lng aproximada
) RETURNING tenant_id;
\```

**Ejecución:**
\```bash
# Opción 1: Via script TypeScript
set -a && source .env.local && set +a
npx tsx -e "
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const { data, error } = await supabase
  .from('tenant_registry')
  .insert({
    subdomain: 'tucasamar',
    business_name: 'Tu casa en el mar',
    business_nit: 'PENDING_MANUAL',
    logo_url: 'https://tucasaenelmar.com/wp-content/uploads/placeholder-logo.png',
    primary_color: '#0891B2',
    address: 'Zona central, San Andrés, Colombia',
    phone: 'PENDING_MANUAL',
    email: 'PENDING_MANUAL',
    website_url: 'https://tucasaenelmar.com',
    seo_meta_description: 'Apartamentos y habitaciones frente al mar en San Andrés',
    is_active: true,
    subscription_tier: 'premium',
    latitude: 12.5847,
    longitude: -81.7006
  })
  .select();

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('✅ Tenant created:', data[0].tenant_id);
console.log('Subdomain:', data[0].subdomain);
"
\```

**TEST DESPUÉS DE TASK 4:**
\```bash
# Verificar tenant en database
npx tsx -e "
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const { data } = await supabase
  .from('tenant_registry')
  .select('*')
  .eq('subdomain', 'tucasamar')
  .single();

console.log('Tenant data:', JSON.stringify(data, null, 2));
"

# Test API branding endpoint
curl -s http://localhost:3000/api/tenant/branding?subdomain=tucasamar | jq
\```

**Expected:**
- INSERT exitoso con UUID generado
- Query retorna datos del tenant
- API endpoint retorna branding

**COMMIT:**
\```bash
git commit --allow-empty -m "feat(tucasamar): add tenant to registry with basic info

TASK 4: Insert tenant in database
- Subdomain: tucasamar
- Business: Tu casa en el mar
- Primary color: #0891B2 (cyan-600, ocean theme)
- Status: active, subscription: premium
- Placeholders: NIT, phone, email (pending manual scraping)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
\```

---

INSTRUCCIONES PARA CLAUDE:

1. **TodoWrite**: Crear todo list con estas 4 tasks
2. **Ejecutar en orden**: Task 1 → Test → Commit → Task 2 → ...
3. **NO avanzar** a siguiente task sin testing exitoso
4. **Mostrar evidencia** de cada test al usuario (outputs, screenshots)
5. **Commits incrementales**: Uno por task completado
6. **Safety check**: Si context usage >90% → avisar al usuario

**VERIFICACIÓN FINAL:**
Después de completar las 4 tasks:
\```bash
# Verificar estructura completa
tree _assets/tucasamar/

# Verificar archivos docs
ls -la docs/projects/create-tucasamar-tenant/

# Test tenant en DB
curl -s http://localhost:3000/api/tenant/branding?subdomain=tucasamar | jq

# Count commits (debe ser 4)
git log --oneline --grep="tucasamar" | wc -l
\```

**SUCCESS CRITERIA:**
✅ 8 archivos markdown creados (_assets/tucasamar/)
✅ Scraping prompt generado (docs/)
✅ Tenant en DB con UUID válido
✅ API branding endpoint funcional
✅ 4 commits incrementales realizados
✅ Estructura lista para completar con scraping manual

¿Listo para empezar con TASK 1?
```

### PROMPT TERMINA AQUÍ ⬆️

---

## 🛡️ SAFETY PROTOCOL

### Testing Obligatorio

**Después de cada TASK:**
```bash
# Verificar archivos creados
ls -la [target-directory]

# Verificar formato markdown
head -50 [file]

# Test database (Task 4)
npx tsx -e "[query]"
```

### Commits Incrementales

**Formato de mensaje:**
```
{type}(tucasamar): {description}

TASK {N}: {Task name}
Files changed: {count}

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Context Monitoring

- 85% → Warning
- 90% → STOP + resumen
- 95% → Force stop

---

## ✅ TODO LIST (Para tracking durante ejecución)

```markdown
# TODO - Create Tucasamar Tenant

- [ ] TASK 1: Crear estructura de alojamientos (30min) 🟡
  - [ ] haines-cay.md
  - [ ] serrana-cay.md
  - [ ] queena-reef.md
  - [ ] cotton-cay.md
  - [ ] crab-cay.md
  - [ ] rose-cay.md
  - [ ] TEST: Verificar 6 archivos + formato válido
  - [ ] COMMIT: feat(tucasamar): create accommodation units structure

- [ ] TASK 2: Crear FAQ y políticas (20min) 🟢
  - [ ] faq.md
  - [ ] house-rules.md
  - [ ] TEST: Verificar estructura template
  - [ ] COMMIT: docs(tucasamar): add guest info and policies templates

- [ ] TASK 3: Generar prompt de scraping (15min) 🔴
  - [ ] scraping-prompt.md
  - [ ] TEST: Verificar contenido completo (>200 líneas)
  - [ ] COMMIT: docs(tucasamar): add manual scraping prompt

- [ ] TASK 4: Insertar tenant en DB (10min) 🔴
  - [ ] Execute SQL INSERT
  - [ ] TEST: Query tenant + API endpoint
  - [ ] COMMIT: feat(tucasamar): add tenant to registry

- [ ] VERIFICACIÓN FINAL
  - [ ] Tree structure completa
  - [ ] Tenant en DB con UUID
  - [ ] API branding funcional
  - [ ] 4 commits realizados

**Total:** 4 tasks, ~75 min, 4 commits
```

---

## 📚 RECURSOS

### Templates Base
- Simmerdown structure: `_assets/simmerdown/`
- Accommodation template: `_assets/hotel-documentation-template.md`

### Database
- Table: `tenant_registry`
- Project ID: `iyeueszchbvlutlcmvcb`
- Service: Supabase

### URLs
- Website: https://tucasaenelmar.com
- Future subdomain: https://tucasamar.muva.chat/

---

## 🔄 PLAN B (Escalation)

**Triggers para escalar:**

1. **Database INSERT falla** → Verificar service role key en .env.local
2. **Archivos markdown tienen formato inválido** → Revisar YAML frontmatter
3. **Context usage >85%** → Compactar o split en dos sesiones

**Acción:** Reportar al usuario + sugerencias

---

**Última actualización:** October 11, 2025
**Próximo paso:** Copy-paste PROMPT EJECUTABLE en nueva conversación con `/clear`
