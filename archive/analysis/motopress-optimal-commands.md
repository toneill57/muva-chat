# MotoPress API - Comandos Óptimos para Obtener Reservas

## 🎯 Resumen Ejecutivo

- **Total de reservas**: 4000
- **Máximo por página**: 100 (límite WordPress REST API)
- **Páginas totales necesarias**: 40
- **⚠️ IMPORTANTE**: Los filtros de fecha (`after`, `before`) NO funcionan en la API
- **Solución**: Descargar datos y filtrar localmente con `jq`

## 📊 Datos de la API

```bash
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
```

## 🚀 Comandos Óptimos

### 1️⃣ Obtener las últimas 100 reservas (más recientes)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&orderby=date&order=desc" \
  -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
```

### 2️⃣ Obtener reservas futuras (próximos 2 años) - RECOMENDADO

```bash
# Obtener 300 reservas más recientes y filtrar localmente
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&orderby=date&order=desc" \
  -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | \
  jq --arg today "$(date +%Y-%m-%d)" --arg limit "$(date -d '+2 years' +%Y-%m-%d)" \
    '[.[] | select(.check_in_date >= $today and .check_in_date <= $limit and .status == "confirmed")]'
```

### 3️⃣ Obtener TODAS las reservas (4000 items)

```bash
# Script para obtener todas las páginas
for page in {1..40}; do
  echo "Descargando página $page/40..."
  curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=$page" \
    -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" \
    > "page_$page.json"
done

# Combinar todas las páginas
jq -s 'add' page_*.json > all-bookings.json
```

### 4️⃣ Obtener varias páginas y combinarlas (ejemplo: 5 páginas = 500 reservas)

```bash
# One-liner para obtener y combinar 5 páginas
for p in {1..5}; do curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=$p" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"; done | jq -s 'add'
```

## 🔧 Filtros útiles con jq

### Filtrar por fechas
```bash
# Reservas futuras
jq --arg today "$(date +%Y-%m-%d)" '[.[] | select(.check_in_date >= $today)]' bookings.json

# Reservas en rango específico
jq '[.[] | select(.check_in_date >= "2025-11-01" and .check_in_date <= "2025-12-31")]' bookings.json
```

### Filtrar por estado
```bash
# Solo confirmadas
jq '[.[] | select(.status == "confirmed")]' bookings.json

# Excluir canceladas
jq '[.[] | select(.status != "cancelled")]' bookings.json
```

### Combinación de filtros
```bash
# Futuras confirmadas
jq --arg today "$(date +%Y-%m-%d)" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' bookings.json
```

## 📈 Estadísticas de rendimiento

| Método | Reservas | Requests | Tiempo aprox. |
|--------|----------|----------|---------------|
| Últimas 100 | 100 | 1 | ~2s |
| 300 recientes + filtro | 165 futuras | 3 | ~6s |
| Todas (4000) | 4000 | 40 | ~80s |

## 💡 Recomendaciones

1. **Para uso en producción**: Usar método 2 (300 recientes filtradas)
   - Obtiene ~165 reservas futuras confirmadas
   - Solo 3 requests HTTP
   - Cubre próximos 2 años

2. **Para sincronización completa**: Usar método 3 con caché
   - Descargar todas las reservas 1 vez al día
   - Guardar en caché local
   - Filtrar según necesidad

3. **Para monitoreo en tiempo real**: Usar método 1
   - Obtener últimas 100 cada 5 minutos
   - Detectar nuevas reservas por ID

## ⚠️ Limitaciones conocidas

- No hay filtros de fecha funcionales en la API
- No hay webhook para cambios en tiempo real
- Máximo 100 items por página (límite WordPress)
- El parámetro `status` tampoco funciona como filtro

## 🔄 Script de sincronización sugerido

```bash
#!/bin/bash
# Sincronización diaria de reservas futuras

API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
API_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TWO_YEARS=$(date -d '+2 years' +%Y-%m-%d)

# Obtener 500 reservas más recientes (5 páginas)
echo "Sincronizando reservas..."
{
  for page in {1..5}; do
    curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=$page&orderby=date&order=desc" \
      -u "$API_KEY:$API_SECRET"
  done
} | jq -s 'add' | \
  jq --arg today "$TODAY" --arg limit "$TWO_YEARS" \
    '[.[] | select(.check_in_date >= $today and .check_in_date <= $limit and .status == "confirmed")]' \
  > future-bookings-$(date +%Y%m%d).json

echo "Sincronización completa: $(jq 'length' future-bookings-$(date +%Y%m%d).json) reservas futuras"
```