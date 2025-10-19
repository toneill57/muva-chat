# 📊 Comparación de Scripts de Exportación MotoPress

## 🎯 Resumen Ejecutivo

Existen **3 scripts principales** para exportar reservas de MotoPress, cada uno optimizado para diferentes casos de uso:

---

## 📂 Scripts Disponibles

### 1. `export-reservations-embed.sh` 📦 **DATOS COMPLETOS (Hardcoded)**

```bash
# Uso:
./export-reservations-embed.sh
```

**Características:**
- ✅ **Datos completos** con `_embed` (nombres de habitaciones, imágenes, metadata)
- ❌ **Hardcoded** para `tucasaenelmar.com` únicamente
- ✅ Detecta páginas dinámicamente
- 🐢 **Lento**: 2-3 min por página (~10-15 min para 500 reservas)

**Cuándo usarlo:**
- Solo para Tu Casa en el Mar
- Necesitas nombres completos de habitaciones
- Tienes tiempo para esperar

---

### 2. `export-reservations-dynamic.sh` ⚡ **RÁPIDO (Multi-tenant)**

```bash
# Uso:
./export-reservations-dynamic.sh <SITE_URL> <API_KEY> <CONSUMER_SECRET>

# Ejemplo:
./export-reservations-dynamic.sh \
  "https://hotel-example.com" \
  "ck_xxxxx" \
  "cs_xxxxx"
```

**Características:**
- ✅ **Multi-tenant** (acepta URL y credenciales como parámetros)
- ✅ Detecta páginas dinámicamente
- ✅ Pide confirmación antes de descargar
- ⚡ **Rápido**: ~30 segundos para 500 reservas
- ❌ **Solo IDs** de habitaciones (no nombres)
- ❌ **SIN `_embed`** (datos básicos únicamente)

**Cuándo usarlo:**
- Cualquier sitio MotoPress (multi-tenant)
- Necesitas reportes rápidos
- Solo necesitas IDs (puedes hacer lookup manual de nombres)

---

### 3. `export-reservations-dynamic-embed.sh` ⭐ **COMPLETO Y FLEXIBLE (RECOMENDADO)**

```bash
# Uso:
./export-reservations-dynamic-embed.sh <SITE_URL> <API_KEY> <CONSUMER_SECRET>

# Ejemplo:
./export-reservations-dynamic-embed.sh \
  "https://hotel-example.com" \
  "ck_xxxxx" \
  "cs_xxxxx"
```

**Características:**
- ✅ **Multi-tenant** (acepta URL y credenciales como parámetros)
- ✅ **Datos completos** con `_embed` (nombres de habitaciones, imágenes, metadata)
- ✅ Detecta páginas dinámicamente
- ✅ Pide confirmación antes de descargar
- ✅ Muestra tiempo estimado y progreso en tiempo real
- ✅ Timer de descarga con tiempo restante
- 🐢 **Lento**: 2-3 min por página (pero más rápido que manualmente)

**Cuándo usarlo:**
- **RECOMENDADO** para cualquier sitio MotoPress
- Necesitas datos completos (nombres de habitaciones, tipos, etc.)
- Estás dispuesto a esperar por datos de calidad
- Reportes ejecutivos o análisis completos

---

## 🔍 Comparación Detallada

| Característica | `embed.sh` | `dynamic.sh` | `dynamic-embed.sh` ⭐ |
|----------------|------------|--------------|----------------------|
| **Multi-tenant** | ❌ No | ✅ Sí | ✅ Sí |
| **Acepta parámetros** | ❌ No | ✅ Sí | ✅ Sí |
| **Usa `_embed`** | ✅ Sí | ❌ No | ✅ Sí |
| **Nombres de habitaciones** | ✅ Sí | ❌ No (solo IDs) | ✅ Sí |
| **Tipos de alojamiento** | ✅ Sí | ❌ No | ✅ Sí |
| **Imágenes embebidas** | ✅ Sí | ❌ No | ✅ Sí |
| **Detección dinámica** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Confirmación usuario** | ❌ No | ✅ Sí | ✅ Sí |
| **Estimación de tiempo** | ❌ No | ❌ No | ✅ Sí |
| **Tiempo restante** | ❌ No | ❌ No | ✅ Sí |
| **Velocidad (500 reservas)** | 🐢 10-15 min | ⚡ 30 seg | 🐢 10-15 min |
| **Output con colores** | ❌ No | ✅ Sí | ✅ Sí |
| **Archivos generados** | TXT + CSV | TXT + CSV | TXT + CSV |

---

## 📊 Datos Recopilados

### Datos Básicos (Todos los scripts)
- ID de reserva
- Fechas check-in/check-out
- Estado de la reserva
- Información del cliente (nombre, email, teléfono)
- URL de Airbnb (si aplica)
- Teléfono Airbnb (últimos 4 dígitos)
- Capacidad (adultos, niños)
- Precio total
- Moneda

### Datos Embebidos (Solo `embed.sh` y `dynamic-embed.sh`)
- ✅ **Nombre completo de habitación** (ej: "Rose Cay APARTAMENTO")
- ✅ **Tipo de alojamiento** (ej: "Apartment", "Room")
- ✅ **URLs de imágenes**
- ✅ **Metadata adicional** (descripción, amenities, etc.)

---

## 💡 Recomendaciones de Uso

### Para Reportes Ejecutivos
```bash
# Usa: dynamic-embed.sh ⭐
./export-reservations-dynamic-embed.sh \
  "https://yoursite.com" \
  "ck_your_key" \
  "cs_your_secret"
```
**Razón:** Datos completos con nombres de habitaciones, ideal para presentaciones y análisis detallado.

---

### Para Chequeos Rápidos de Ocupación
```bash
# Usa: dynamic.sh
./export-reservations-dynamic.sh \
  "https://yoursite.com" \
  "ck_your_key" \
  "cs_your_secret"
```
**Razón:** Rápido (30 segundos), suficiente para ver ocupación por fechas e IDs.

---

### Para Tu Casa en el Mar (Solo)
```bash
# Usa: embed.sh
./export-reservations-embed.sh
```
**Razón:** Ya tiene las credenciales hardcoded, no necesitas escribirlas.

---

## 🔧 Diferencia Técnica Clave

### Script SIN `_embed` (dynamic.sh)
```bash
# API Call básico
curl "https://site.com/wp-json/mphb/v1/bookings?per_page=100&page=1"
```

**Response:**
```json
{
  "id": 30245,
  "reserved_accommodations": [{
    "accommodation": 337,           // ❌ Solo ID
    "accommodation_type": 335       // ❌ Solo ID
  }]
}
```

---

### Script CON `_embed` (embed.sh, dynamic-embed.sh)
```bash
# API Call con datos embebidos
curl "https://site.com/wp-json/mphb/v1/bookings?per_page=100&page=1&_embed"
```

**Response:**
```json
{
  "id": 30245,
  "reserved_accommodations": [{
    "accommodation": 337,
    "accommodation_type": 335
  }],
  "_embedded": {
    "accommodations": [{
      "title": "Rose Cay APARTAMENTO"  // ✅ Nombre completo
    }],
    "accommodation_types": [{
      "title": "Apartment"              // ✅ Tipo
    }]
  }
}
```

---

## ⚡ Optimizaciones del `dynamic-embed.sh`

### 1. **Detección Dinámica de Páginas**
```bash
# Hace una petición HEAD para obtener totales
curl -sI "https://site.com/wp-json/mphb/v1/bookings?per_page=1"

# Lee header: X-WP-Total: 4000
# Calcula: PAGES_NEEDED = (4000 + 99) / 100 = 40 páginas
```

### 2. **Confirmación Inteligente**
```bash
✓ Total de reservas en el sistema: 4000
✓ Páginas necesarias (100 items/página): 40
⏱  Tiempo estimado de descarga: ~80 minutos

¿Deseas continuar con la descarga? (s/n):
```

### 3. **Timer en Tiempo Real**
```bash
📥 Descargando página 5 de 40 (con _embed)...
   ✓ Página 5 completada en 127s
   ⏱  Tiempo restante estimado: ~74m 15s
```

---

## 📋 Output Generado

### Archivo TXT (Reporte Detallado)
```
============================================
REPORTE COMPLETO DE RESERVAS - tucasaenelmar
CON DATOS EMBEBIDOS (_embed)
============================================

Sitio: https://tucasaenelmar.com
Fecha de generación: 2025-10-18 13:45:32
Total de reservas en sistema: 4000
Reservas futuras confirmadas: 165
Período: Desde 2025-10-18 en adelante
Tiempo de descarga: 12m 34s

============================================
DETALLE DE RESERVAS
============================================

-------------------------------------------
RESERVA #30245
-------------------------------------------
Check-in:  2025-11-19 (15:00:00)
Check-out: 2025-11-23 (12:00:00)
Noches: 4
Estado: CONFIRMED

ALOJAMIENTO:
Habitación: Rose Cay APARTAMENTO        ← ✅ NOMBRE COMPLETO
Tipo: Apartment                          ← ✅ TIPO
ID Habitación: 337
ID Tipo: 335

HUÉSPEDES:
Adultos: 2
Niños: 1
Total: 3

ORIGEN DE LA RESERVA:
Importado: Sí (Airbnb/iCal)
Resumen: Reserved
URL Airbnb: https://www.airbnb.com/hosting/reservations/details/HMKP3FS3ST
Teléfono (últimos 4): 0907

DATOS DEL CLIENTE:
Nombre: [No disponible]
Email: [No disponible]

PRECIO:
Total: 0 COP
```

### Archivo CSV (Excel-ready)
```csv
ID,Check-in,Check-out,Noches,Adultos,Niños,Habitación,Tipo,Habitación_ID,Precio,Moneda,Fuente,URL_Airbnb,Teléfono
30245,2025-11-19,2025-11-23,4,2,1,"Rose Cay APARTAMENTO","Apartment",337,0,COP,Airbnb,https://www.airbnb.com/...,0907
```

---

## 🎯 Conclusión

**Usa `export-reservations-dynamic-embed.sh` ⭐** para la mayoría de casos:
- ✅ Funciona con cualquier sitio MotoPress
- ✅ Datos completos (nombres, no solo IDs)
- ✅ Progreso en tiempo real
- ✅ Listo para reportes ejecutivos

**Solo usa `dynamic.sh` si:**
- ⚡ Necesitas resultados inmediatos (30 seg)
- 🔢 Solo necesitas IDs para análisis rápido

**Solo usa `embed.sh` si:**
- 🏠 Trabajas exclusivamente con Tu Casa en el Mar
- 💤 No te importa escribir las credenciales cada vez

---

**Última actualización:** Octubre 2025
