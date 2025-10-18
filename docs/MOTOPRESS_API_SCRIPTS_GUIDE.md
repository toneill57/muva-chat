# 📚 Guía de Scripts para MotoPress API

## 🎯 Resumen Ejecutivo

Esta guía documenta los scripts desarrollados para extraer reservas de MotoPress Hotel Booking API de manera eficiente. Los scripts están diseñados para ser reutilizables en cualquier instalación de WordPress con MotoPress.

---

## 🔍 Descubrimientos Importantes sobre la API

### Limitaciones de la API de MotoPress

1. **NO funcionan los filtros de fecha** (`after`, `before`, `date_from`)
   - La API ignora estos parámetros
   - Siempre devuelve TODAS las reservas
   - El filtrado debe hacerse localmente

2. **Máximo 100 items por página** (límite de WordPress REST API)

3. **Total de reservas típico**: 4000+ en sistemas activos

4. **Tipos de reservas encontradas**:
   - **Reservas reales de Airbnb**: Tienen URL y teléfono
   - **Bloqueos de calendario**: Muestran "Airbnb (Not available)"
   - **Reservas directas**: Creadas en el sistema local
   - **Anuncios espejo**: Sincronizados de otras plataformas

---

## 📂 Scripts Disponibles

### 1. `export-reservations-dynamic.sh` ⭐ **RECOMENDADO PARA PRODUCCIÓN**

**Propósito**: Script multi-tenant que acepta credenciales como parámetros.

**Características**:
- ✅ Detecta dinámicamente cuántas páginas necesita
- ✅ Funciona con cualquier sitio/credenciales
- ✅ Pregunta confirmación antes de descargar
- ✅ Muestra progreso en tiempo real

**Uso**:
```bash
./export-reservations-dynamic.sh \
  "https://hotel-site.com" \
  "ck_api_key_here" \
  "cs_consumer_secret_here"
```

**Tiempo estimado**: ~30 segundos para 500 reservas

---

### 2. `export-reservations-embed.sh` 📦 **MÁS COMPLETO PERO LENTO**

**Propósito**: Obtiene TODOS los datos incluyendo nombres de habitaciones embebidos.

**Características**:
- ✅ Usa `_embed` para traer datos relacionados
- ✅ Incluye nombres de habitaciones directamente
- ✅ Detecta páginas dinámicamente
- ⚠️ MUY LENTO (2-3 min por página)

**Uso**:
```bash
./export-reservations-embed.sh
```

**Tiempo estimado**: 10-15 minutos para 500 reservas

**Cuándo usarlo**: Cuando necesitas los nombres de las habitaciones y tienes tiempo.

---

### 3. `export-reservations-filtered.sh` 🔍 **FILTRA BLOQUEOS SIN DATOS**

**Propósito**: Excluye reservas "Airbnb (Not available)" que son solo bloqueos.

**Características**:
- ✅ Filtra bloqueos sin información útil
- ✅ Mantiene solo reservas con datos de contacto
- ✅ Muestra estadísticas de filtrado
- ⚠️ El filtro se aplica DESPUÉS de descargar

**Uso**:
```bash
./export-reservations-filtered.sh
```

**Output esperado**:
```
Reservas reales: 120
Bloqueos excluidos: 75
Porcentaje excluido: 38.5%
```

---

### 4. `export-reservations-enhanced.sh` 🚀 **BALANCE VELOCIDAD/COMPLETITUD**

**Propósito**: Obtiene nombres de habitaciones con requests separados.

**Características**:
- ✅ Más rápido que `_embed`
- ✅ Obtiene nombres de habitaciones
- ✅ Genera CSV para Excel
- ✅ Ya probado y funcional

**Uso**:
```bash
./export-reservations-enhanced.sh
```

**Tiempo estimado**: ~45 segundos para 500 reservas

---

## 🔧 Comando Básico One-Liner

Para obtener rápidamente las reservas futuras confirmadas:

```bash
for p in {1..5}; do
  curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=$p&orderby=date&order=desc" \
    -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
done | jq -s 'add' | jq --arg today "$(date +%Y-%m-%d)" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")] | length'
```

---

## 📊 Estructura de Datos de MotoPress

### Reserva Típica de Airbnb
```json
{
  "id": 30245,
  "status": "confirmed",
  "check_in_date": "2025-11-19",
  "check_out_date": "2025-11-23",
  "imported": true,
  "ical_summary": "Reserved",
  "ical_description": "Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMKP3FS3ST\nPhone Number (Last 4 Digits): 0907",
  "reserved_accommodations": [{
    "accommodation": 337,
    "accommodation_type": 335,
    "adults": 2,
    "children": 1
  }]
}
```

### Bloqueo de Calendario (Sin datos útiles)
```json
{
  "id": 30260,
  "imported": true,
  "ical_summary": "Airbnb (Not available)",
  "ical_description": "",
  "reserved_accommodations": [...]
}
```

---

## 🚀 Guía de Implementación

### Para Implementar en un Nuevo Proyecto

1. **Evaluar el volumen de datos**:
   ```bash
   # Verificar total de reservas
   curl -I "https://site.com/wp-json/mphb/v1/bookings?per_page=1" \
     -u "API_KEY:SECRET" | grep "X-WP-Total"
   ```

2. **Elegir el script apropiado**:
   - < 1000 reservas: Usar `export-reservations-enhanced.sh`
   - > 1000 reservas: Considerar caché
   - Multi-tenant: Usar `export-reservations-dynamic.sh`
   - Necesitas filtrar: Usar `export-reservations-filtered.sh`

3. **Configurar credenciales**:
   ```bash
   # En el script o como variables de entorno
   export MOTOPRESS_API_KEY="ck_..."
   export MOTOPRESS_SECRET="cs_..."
   export MOTOPRESS_URL="https://hotel.com"
   ```

4. **Programar ejecución** (si es necesario):
   ```bash
   # Crontab para ejecutar diariamente a las 6 AM
   0 6 * * * /path/to/export-reservations-dynamic.sh
   ```

---

## ⚡ Optimizaciones Recomendadas

### 1. Sistema de Caché (Para > 1000 reservas)

```bash
# Pseudocódigo para implementación con caché
CACHE_FILE="reservations-cache.json"
CACHE_AGE=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0)))

if [ $CACHE_AGE -gt 3600 ]; then  # Caché mayor a 1 hora
  # Descargar fresh
  ./export-reservations-dynamic.sh
  cp output.json "$CACHE_FILE"
else
  # Usar caché
  cp "$CACHE_FILE" output.json
fi
```

### 2. Descarga Incremental

```bash
# Solo descargar páginas recientes
LAST_SYNC=$(cat last-sync-date.txt)
# Filtrar por fecha de creación > LAST_SYNC
```

### 3. Base de Datos Local

```sql
-- SQLite para caché persistente
CREATE TABLE reservations (
  id INTEGER PRIMARY KEY,
  data JSON,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🐛 Troubleshooting

### Problema: "No se pudo conectar con la API"

**Verificar**:
1. URL correcta (con https://)
2. Credenciales válidas
3. Plugin MotoPress activo
4. Permisos de la API key

### Problema: "Descarga muy lenta"

**Soluciones**:
1. NO usar `_embed` a menos que sea necesario
2. Reducir páginas (descargar solo recientes)
3. Implementar caché
4. Ejecutar en horarios de baja carga

### Problema: "Faltan nombres de habitaciones"

**Opciones**:
1. Usar `export-reservations-embed.sh` (lento pero completo)
2. Hacer mapping manual de IDs a nombres
3. Cache de tipos de habitación por separado

---

## 📋 Checklist de Implementación

- [ ] Obtener credenciales de MotoPress (Consumer Key + Secret)
- [ ] Verificar acceso a la API con curl básico
- [ ] Determinar volumen de reservas
- [ ] Elegir script apropiado
- [ ] Configurar filtros si es necesario
- [ ] Implementar caché si > 1000 reservas
- [ ] Programar actualizaciones automáticas
- [ ] Documentar credenciales de forma segura

---

## 🔒 Seguridad

**NUNCA**:
- ❌ Hardcodear credenciales en código versionado
- ❌ Exponer archivos de salida públicamente
- ❌ Compartir logs con credenciales

**SIEMPRE**:
- ✅ Usar variables de entorno para credenciales
- ✅ Restringir permisos de archivos de salida
- ✅ Rotar credenciales periódicamente

---

## 📞 Soporte

Para problemas específicos con estos scripts:

1. Verificar esta documentación
2. Revisar logs de ejecución
3. Probar con curl manual primero
4. Considerar limitaciones de la API documentadas

---

**Última actualización**: Octubre 2025
**Scripts probados con**: MotoPress Hotel Booking 4.x + WordPress 6.x