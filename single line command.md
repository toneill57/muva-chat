# MotoPress Bookings API - Comandos Optimizados

## COMANDO DEFINITIVO - Pipeline Completo (Una línea)

```bash
for p in {1..5}; do curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=$p&orderby=date&order=desc" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"; done | jq -s 'add' > temp.json && echo "Total reservas futuras confirmadas: $(jq --arg today "$(date +%Y-%m-%d)" '[.[] | select(.check_in_date >= $today and .status == "confirmed")] | length' temp.json)" && echo "" && echo "Proximas 10 reservas:" && jq -r --arg today "$(date +%Y-%m-%d)" '[.[] | select(.check_in_date >= $today and .status == "confirmed")] | .[:10] | .[] | "\(.check_in_date) -> \(.check_out_date) | ID: \(.id) | Hab: \(.reserved_accommodations[0].accommodation) | Huespedes: \(.reserved_accommodations[0].adults)+\(.reserved_accommodations[0].children)"' temp.json && rm temp.json
```

### Que hace:
1. **Descarga** 500 reservas mas recientes (5 paginas x 100)
2. **Combina** todos los JSONs
3. **Filtra** solo futuras confirmadas
4. **Muestra** total + proximas 10 con detalles
5. **Limpia** archivo temporal

### Resultado esperado:
```
Total reservas futuras confirmadas: 195

Proximas 10 reservas:
2025-10-19 -> 2025-10-22 | ID: 30260 | Hab: 322 | Huespedes: 2+1
2025-11-05 -> 2025-11-15 | ID: 30243 | Hab: 337 | Huespedes: 2+1
2025-11-19 -> 2025-11-23 | ID: 30245 | Hab: 337 | Huespedes: 2+1
2025-12-04 -> 2025-12-07 | ID: 30247 | Hab: 337 | Huespedes: 2+1
2025-12-27 -> 2026-01-03 | ID: 30249 | Hab: 337 | Huespedes: 2+1
...
```

---

## 🔥 LATEST COMMAND TO TEST - Próximos 2 años (TODAS: Airbnb + directas)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=1&check_in_date=$(date +%Y-%m-%d)&check_out_date=$(date -v+2y +%Y-%m-%d)&accommodation_type=0" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq 'length'
```

**What it does**: Contar reservas con check-in en próximos 2 años (incluye Airbnb + directas)

---

## COMANDO FINAL - Filtro por fecha (hoy → 2 años)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=1&check_in_date=$(date +%Y-%m-%d)&check_out_date=$(date -v+2y +%Y-%m-%d)&accommodation_type=0" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq 'length'
```

---

## ANTERIOR - Filtro por próximos 2 años

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=1&check_in_date=$(date +%Y-%m-%d)&check_out_date=$(date -v+2y +%Y-%m-%d)&accommodation_type=0" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq 'length'
```

**What it does**:
- Trae reservas con check-in en los **próximos 2 años** (2025-10-18 → 2027-10-18)
- Balance entre completitud y velocidad
- Cubre la mayoría de las reservas reales (pocas personas reservan con >2 años de anticipación)

**Para verificar cuántas páginas totales (búsqueda binaria):**

```bash
# Paso 1: Probar página 30 (punto medio entre 20 y 40)
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=30&check_in_date=$(date +%Y-%m-%d)&check_out_date=$(date -v+2y +%Y-%m-%d)&accommodation_type=0" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq 'length'
```

**Interpretación:**
- Si retorna **100**: Hay más de 3,000 reservas → probar página 35
- Si retorna **0**: Hay entre 2,000-3,000 reservas → probar página 25
- Si retorna **1-99**: Página 30 es la última → Total = ~2,900-3,000 reservas

---

## ANTERIOR - Verificar si filtro status funciona

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100&page=40&status=confirmed&check_in_date=$(date +%Y-%m-%d)&check_out_date=2030-10-18&accommodation_type=0" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq 'length'
```

---

## 🔥 LATEST COMMAND TO TEST - ANTERIOR (sin filtro de status)

```bash
#!/bin/bash
# Script para traer TODAS las reservas futuras (todas las páginas)
TODAY=$(date +%Y-%m-%d)
CREDS="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"

page=1
total=0

while true; do
  count=$(curl -s "${BASE_URL}?per_page=100&page=${page}&check_in_date=${TODAY}&check_out_date=2030-10-18&accommodation_type=0" -u "${CREDS}" | jq 'length')

  echo "Página ${page}: ${count} reservas"
  total=$((total + count))

  if [ "$count" -lt 100 ]; then
    echo "✅ Última página alcanzada"
    echo "📊 TOTAL: ${total} reservas futuras"
    break
  fi

  page=$((page + 1))
done
```

**What it does**:
- Hace loop por TODAS las páginas hasta encontrar una con menos de 100 reservas
- Cuenta el total de reservas futuras
- Muestra progreso página por página
- Se detiene automáticamente cuando ya no hay más

**Para ejecutar:**
1. Copia todo el script
2. Guárdalo como `fetch-all-bookings.sh`
3. Dale permisos: `chmod +x fetch-all-bookings.sh`
4. Ejecuta: `./fetch-all-bookings.sh`

**Output esperado:**
```
Página 1: 100 reservas
Página 2: 100 reservas
Página 3: 100 reservas
...
Página 40: 99 reservas
✅ Última página alcanzada
📊 TOTAL: 3999 reservas futuras
```

---

## Previous Commands (for reference)

### Command 1: Get 5 bookings (no date filter)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=5" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq
```

### Command 2: Get 5 bookings from Sept 18, 2025 onwards (SLOW)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=5&date_from=2025-09-18" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq
```

### Command 3: Get ALL bookings (paginated, oldest first)

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=100" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | jq
```

## Alternative (if jq not installed): Use Python

```bash
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?per_page=5" -u "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9" | python3 -m json.tool
```
