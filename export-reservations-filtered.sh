#!/bin/bash

# ==============================================================================
# EXPORTAR RESERVAS - VERSION FILTRADA (EXCLUYE BLOQUEOS SIN DATOS)
# ==============================================================================
# Este script excluye las reservas con "Airbnb (Not available)" que son
# bloqueos de calendario sin información útil de huéspedes
# ==============================================================================

# Configuración
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-filtradas-${TIMESTAMP}.txt"
OUTPUT_CSV="reservas-filtradas-${TIMESTAMP}.csv"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "EXPORTANDO RESERVAS (FILTRADAS)"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}NOTA: Este reporte EXCLUYE:${NC}"
echo "- Bloqueos con 'Airbnb (Not available)'"
echo "- Reservas sin datos útiles de contacto"
echo ""

# Paso 1: Detectar dinámicamente el número de páginas necesarias
echo -e "${YELLOW}📊 Paso 1: Analizando sistema...${NC}"
HEADERS=$(curl -sI "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)
TOTAL_RESERVAS=$(echo "$HEADERS" | grep -i "x-wp-total:" | sed 's/.*: //' | tr -d '\r' | tr -d ' ')

if [ -z "$TOTAL_RESERVAS" ]; then
    echo -e "${RED}Error: No se pudo obtener el total de reservas${NC}"
    exit 1
fi

# Calcular páginas necesarias
PAGES_NEEDED=$(( (TOTAL_RESERVAS + 99) / 100 ))

echo "Total de reservas en sistema: $TOTAL_RESERVAS"
echo "Páginas a descargar: $PAGES_NEEDED"
echo ""

# Paso 2: Descargar todas las páginas necesarias
echo -e "${YELLOW}📥 Paso 2: Descargando reservas...${NC}"
{
  for p in $(seq 1 $PAGES_NEEDED); do
    echo -ne "\rDescargando página $p de $PAGES_NEEDED..." >&2
    curl -s "${BASE_URL}?per_page=100&page=$p&orderby=date&order=desc" \
      -u "${API_KEY}:${CONSUMER_SECRET}"
  done
} | jq -s 'add' > temp-all.json

echo -e "\n✅ Descarga completada"
echo ""

# Paso 3: Filtrar reservas (futuras, confirmadas, y SIN "Not available")
echo -e "${YELLOW}🔍 Paso 3: Filtrando reservas...${NC}"

# Primero: futuras y confirmadas
jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  temp-all.json > temp-future.json

TOTAL_FUTURE=$(jq 'length' temp-future.json)
echo "Reservas futuras confirmadas: $TOTAL_FUTURE"

# Segundo: excluir las que tienen "Airbnb (Not available)" O no tienen datos útiles
jq '[.[] | select(
  (.ical_summary == null or .ical_summary == "" or
   (.ical_summary | ascii_downcase | contains("not available") | not)) and
  (
    .imported == false or
    (.ical_description != null and .ical_description != "" and
     (.ical_description | contains("Reservation URL:") or .ical_description | contains("Phone Number")))
  )
)]' temp-future.json > filtered-bookings.json

TOTAL_FILTERED=$(jq 'length' filtered-bookings.json)
EXCLUDED=$((TOTAL_FUTURE - TOTAL_FILTERED))

echo -e "${GREEN}Reservas con datos útiles: $TOTAL_FILTERED${NC}"
echo -e "${YELLOW}Bloqueos excluidos: $EXCLUDED${NC}"
echo ""

# Paso 4: Generar reporte detallado
echo -e "${YELLOW}📄 Paso 4: Generando reportes...${NC}"

# Encabezado
{
  echo "============================================"
  echo "REPORTE DE RESERVAS REALES (FILTRADO)"
  echo "============================================"
  echo ""
  echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Período: Desde $TODAY en adelante"
  echo ""
  echo "ESTADÍSTICAS DE FILTRADO:"
  echo "- Total en sistema: $TOTAL_RESERVAS"
  echo "- Futuras confirmadas: $TOTAL_FUTURE"
  echo "- Con datos útiles: $TOTAL_FILTERED"
  echo "- Bloqueos excluidos: $EXCLUDED"
  echo ""
  echo "============================================"
  echo "DETALLE DE RESERVAS"
  echo "============================================"
  echo ""
} > "$OUTPUT_FILE"

# Procesar cada reserva
jq -r '.[] |
  # Extraer datos de Airbnb si existen
  (.ical_description // "" |
    if . != "" then
      gsub("\""; "") | split("\n") as $lines |
      {
        url: ($lines[0] | if contains("Reservation URL:") then split(": ")[1] else "" end),
        phone: ($lines | map(select(contains("Phone Number"))) | first // "" |
               if . != "" then split(": ")[1] else "" end)
      }
    else
      {url: "", phone: ""}
    end
  ) as $airbnb |

  # Calcular noches
  ((.check_out_date | split("-")) as $out |
   (.check_in_date | split("-")) as $in |
   if $out[1] == $in[1] then
     ($out[2] | tonumber) - ($in[2] | tonumber)
   else
     30 - ($in[2] | tonumber) + ($out[2] | tonumber)
   end
  ) as $nights |

  "========================================\n" +
  "RESERVA #\(.id)\n" +
  "========================================\n" +
  "\n📅 FECHAS:\n" +
  "Check-in:  \(.check_in_date) (\(.check_in_time))\n" +
  "Check-out: \(.check_out_date) (\(.check_out_time))\n" +
  "Noches: \($nights)\n" +
  "\n🏠 HABITACIÓN:\n" +
  "ID Habitación: \(.reserved_accommodations[0].accommodation)\n" +
  "ID Tipo: \(.reserved_accommodations[0].accommodation_type)\n" +
  "\n👥 HUÉSPEDES:\n" +
  "Adultos: \(.reserved_accommodations[0].adults)\n" +
  "Niños: \(.reserved_accommodations[0].children)\n" +
  "Total: \(.reserved_accommodations[0].adults + .reserved_accommodations[0].children)\n" +
  "\n🔗 ORIGEN:\n" +
  if .imported == false then
    "Tipo: RESERVA DIRECTA\n"
  else
    "Tipo: AIRBNB\n" +
    if .ical_summary != "" then "Estado Airbnb: \(.ical_summary | gsub("\""; ""))\n" else "" end +
    if $airbnb.url != "" then "URL: \($airbnb.url)\n" else "" end +
    if $airbnb.phone != "" then "Teléfono: \($airbnb.phone)\n" else "" end
  end +
  "\n👤 CLIENTE:\n" +
  if .customer.first_name != "" then
    "Nombre: \(.customer.first_name) \(.customer.last_name)\n"
  else
    "Nombre: [Pendiente]\n"
  end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "" end +
  if .customer.phone != "" then "Teléfono: \(.customer.phone)\n" else "" end +
  "\n💰 PRECIO: \(.total_price) \(.currency)\n" +
  "\n----------------------------------------\n\n"
' filtered-bookings.json >> "$OUTPUT_FILE"

# Generar CSV
echo "ID,Check-in,Check-out,Noches,Adultos,Niños,Total,Habitación,Tipo,Origen,URL/Código,Teléfono,Cliente,Email" > "$OUTPUT_CSV"

jq -r '.[] |
  (.ical_description // "" |
    if . != "" then
      gsub("\""; "") | split("\n") as $lines |
      {
        url: ($lines[0] | if contains("Reservation URL:") then split("/")[-1] else "" end),
        phone: ($lines | map(select(contains("Phone Number"))) | first // "" |
               if . != "" then split(": ")[1] else "" end)
      }
    else
      {url: "", phone: ""}
    end
  ) as $airbnb |

  ((.check_out_date | split("-")) as $out |
   (.check_in_date | split("-")) as $in |
   if $out[1] == $in[1] then
     ($out[2] | tonumber) - ($in[2] | tonumber)
   else
     30 - ($in[2] | tonumber) + ($out[2] | tonumber)
   end
  ) as $nights |

  [
    .id,
    .check_in_date,
    .check_out_date,
    $nights,
    .reserved_accommodations[0].adults,
    .reserved_accommodations[0].children,
    (.reserved_accommodations[0].adults + .reserved_accommodations[0].children),
    .reserved_accommodations[0].accommodation,
    .reserved_accommodations[0].accommodation_type,
    (if .imported then "Airbnb" else "Directa" end),
    (if .imported then ($airbnb.url // .ical_summary) else "-" end),
    ($airbnb.phone // ""),
    "\(.customer.first_name) \(.customer.last_name)" | gsub("^ $"; "-"),
    .customer.email
  ] | @csv
' filtered-bookings.json >> "$OUTPUT_CSV"

# Agregar resumen
{
  echo ""
  echo "============================================"
  echo "RESUMEN ESTADÍSTICO"
  echo "============================================"
  echo ""

  # Análisis de exclusiones
  echo "ANÁLISIS DE FILTRADO:"
  echo "  Total inicial: $TOTAL_FUTURE reservas"
  echo "  Reservas reales: $TOTAL_FILTERED"
  echo "  Bloqueos excluidos: $EXCLUDED"
  if [ $EXCLUDED -gt 0 ]; then
    PERCENT=$(echo "scale=1; $EXCLUDED * 100 / $TOTAL_FUTURE" | bc)
    echo "  Porcentaje excluido: ${PERCENT}%"
  fi
  echo ""

  # Por origen
  AIRBNB_REAL=$(jq '[.[] | select(.imported == true)] | length' filtered-bookings.json)
  DIRECT=$(jq '[.[] | select(.imported == false)] | length' filtered-bookings.json)
  echo "POR ORIGEN (solo reservas reales):"
  echo "  Airbnb con datos: $AIRBNB_REAL"
  echo "  Reservas directas: $DIRECT"
  echo ""

  # Por mes
  echo "DISTRIBUCIÓN MENSUAL:"
  jq -r '.[].check_in_date' filtered-bookings.json | cut -d'-' -f1,2 | sort | uniq -c | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""

  # Ocupación por habitación
  echo "TOP 5 HABITACIONES:"
  jq -r '.[] | .reserved_accommodations[0].accommodation' filtered-bookings.json | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "  Habitación %s: %d reservas\n", $2, $1}'

  echo ""
  echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar temporales
rm -f temp-all.json temp-future.json filtered-bookings.json

# Mensaje final
echo -e "${GREEN}✅ Proceso completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}ARCHIVOS GENERADOS:${NC}"
echo "📄 Reporte: $OUTPUT_FILE"
echo "📊 CSV: $OUTPUT_CSV"
echo ""
echo -e "${YELLOW}RESUMEN:${NC}"
echo "- Reservas reales exportadas: $TOTAL_FILTERED"
echo "- Bloqueos excluidos: $EXCLUDED"
echo ""
echo "Para ver el reporte:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Para abrir en Excel:"
echo "  open $OUTPUT_CSV"