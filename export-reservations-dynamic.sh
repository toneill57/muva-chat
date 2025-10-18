#!/bin/bash

# ==============================================================================
# EXPORTAR RESERVAS MOTOPRESS - VERSIÓN DINÁMICA MULTI-TENANT
# ==============================================================================
# Uso: ./export-reservations-dynamic.sh <SITE_URL> <API_KEY> <CONSUMER_SECRET>
# Ejemplo:
#   ./export-reservations-dynamic.sh \
#     "https://tucasaenelmar.com" \
#     "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a" \
#     "cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
# ==============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar parámetros
if [ $# -ne 3 ]; then
    echo -e "${RED}Error: Faltan parámetros${NC}"
    echo ""
    echo "Uso: $0 <SITE_URL> <API_KEY> <CONSUMER_SECRET>"
    echo ""
    echo "Ejemplo:"
    echo "  $0 \"https://tucasaenelmar.com\" \"ck_xxx\" \"cs_xxx\""
    echo ""
    exit 1
fi

# Asignar parámetros a variables
SITE_URL="$1"
API_KEY="$2"
CONSUMER_SECRET="$3"
BASE_URL="${SITE_URL}/wp-json/mphb/v1/bookings"

# Variables de trabajo
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-${TIMESTAMP}.txt"
OUTPUT_CSV="reservas-${TIMESTAMP}.csv"

# Extraer nombre del sitio para el reporte
SITE_NAME=$(echo "$SITE_URL" | sed 's|https\?://||' | sed 's|/.*||' | sed 's|www\.||')

echo -e "${BLUE}=========================================="
echo "   EXPORTADOR DE RESERVAS MOTOPRESS"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Sitio:${NC} $SITE_NAME"
echo -e "${YELLOW}URL:${NC} $SITE_URL"
echo -e "${YELLOW}Fecha:${NC} $TODAY"
echo ""

# Paso 1: DETECTAR DINÁMICAMENTE el número de páginas necesarias
echo -e "${YELLOW}📊 Paso 1: Analizando cantidad de reservas...${NC}"
echo "----------------------------------------"

# Obtener el total de reservas con una petición mínima
HEADERS=$(curl -sI "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: No se pudo conectar con la API${NC}"
    echo "Verifica que:"
    echo "  1. La URL sea correcta: $SITE_URL"
    echo "  2. Las credenciales sean válidas"
    echo "  3. El plugin MotoPress esté activo"
    exit 1
fi

# Extraer total de reservas y páginas
TOTAL_RESERVAS=$(echo "$HEADERS" | grep -i "x-wp-total:" | sed 's/.*: //' | tr -d '\r' | tr -d ' ')
TOTAL_PAGES_1=$(echo "$HEADERS" | grep -i "x-wp-totalpages:" | sed 's/.*: //' | tr -d '\r' | tr -d ' ')

if [ -z "$TOTAL_RESERVAS" ]; then
    echo -e "${RED}Error: No se pudo obtener el total de reservas${NC}"
    echo "Respuesta de la API:"
    echo "$HEADERS" | head -20
    exit 1
fi

# Calcular páginas necesarias con 100 items por página
PAGES_NEEDED=$(( (TOTAL_RESERVAS + 99) / 100 ))

echo -e "${GREEN}✓ Total de reservas en el sistema: $TOTAL_RESERVAS${NC}"
echo -e "${GREEN}✓ Páginas necesarias (100 items/página): $PAGES_NEEDED${NC}"
echo ""

# Preguntar si continuar
echo -e "${YELLOW}¿Deseas continuar con la descarga?${NC}"
echo "Esto descargará $PAGES_NEEDED páginas de datos."
echo -n "Continuar? (s/n): "
read -r CONTINUAR

if [[ ! "$CONTINUAR" =~ ^[Ss]$ ]]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""

# Paso 2: Descargar SOLO las páginas necesarias
echo -e "${YELLOW}📥 Paso 2: Descargando reservas...${NC}"
echo "----------------------------------------"

# Crear archivo temporal para combinar todas las páginas
echo "[]" > temp-all-bookings.json

for page in $(seq 1 $PAGES_NEEDED); do
    echo -ne "\r${YELLOW}Descargando página $page de $PAGES_NEEDED...${NC}"

    # Descargar página
    PAGE_DATA=$(curl -s "${BASE_URL}?per_page=100&page=${page}&orderby=date&order=desc" \
        -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)

    if [ $? -ne 0 ]; then
        echo -e "\n${RED}Error descargando página $page${NC}"
        continue
    fi

    # Guardar página individual (para debug si es necesario)
    echo "$PAGE_DATA" > "temp-page-${page}.json"

    # Verificar que no esté vacía
    ITEMS_IN_PAGE=$(echo "$PAGE_DATA" | jq 'length' 2>/dev/null)

    if [ "$ITEMS_IN_PAGE" = "0" ] || [ -z "$ITEMS_IN_PAGE" ]; then
        echo -e "\n${YELLOW}Página $page vacía, terminando descarga${NC}"
        break
    fi

    # Combinar con el archivo acumulado
    if [ $page -eq 1 ]; then
        echo "$PAGE_DATA" > temp-all-bookings.json
    else
        jq -s '.[0] + .[1]' temp-all-bookings.json "temp-page-${page}.json" > temp-combined.json
        mv temp-combined.json temp-all-bookings.json
    fi

    # Limpiar archivo temporal de página
    rm "temp-page-${page}.json"
done

echo -e "\n${GREEN}✓ Descarga completada${NC}"
echo ""

# Paso 3: Filtrar reservas futuras confirmadas
echo -e "${YELLOW}🔍 Paso 3: Filtrando reservas futuras...${NC}"
echo "----------------------------------------"

jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  temp-all-bookings.json > future-confirmed.json

TOTAL_FUTURE=$(jq 'length' future-confirmed.json)
echo -e "${GREEN}✓ Reservas futuras confirmadas: $TOTAL_FUTURE${NC}"
echo ""

# Paso 4: Generar reporte detallado
echo -e "${YELLOW}📄 Paso 4: Generando reportes...${NC}"
echo "----------------------------------------"

# Encabezado del reporte
{
    echo "============================================"
    echo "REPORTE DE RESERVAS - $SITE_NAME"
    echo "============================================"
    echo ""
    echo "Sitio: $SITE_URL"
    echo "Fecha de generación: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Total de reservas en sistema: $TOTAL_RESERVAS"
    echo "Reservas futuras confirmadas: $TOTAL_FUTURE"
    echo "Período: Desde $TODAY en adelante"
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

  "-------------------------------------------\n" +
  "RESERVA #\(.id)\n" +
  "-------------------------------------------\n" +
  "Check-in:  \(.check_in_date) (\(.check_in_time))\n" +
  "Check-out: \(.check_out_date) (\(.check_out_time))\n" +
  "Noches: \($nights)\n" +
  "Estado: \(.status | ascii_upcase)\n" +
  "\nALOJAMIENTO:\n" +
  "Habitación ID: \(.reserved_accommodations[0].accommodation)\n" +
  "Tipo ID: \(.reserved_accommodations[0].accommodation_type)\n" +
  "\nHUÉSPEDES:\n" +
  "Adultos: \(.reserved_accommodations[0].adults)\n" +
  "Niños: \(.reserved_accommodations[0].children)\n" +
  "Total: \(.reserved_accommodations[0].adults + .reserved_accommodations[0].children)\n" +
  "\nORIGEN DE LA RESERVA:\n" +
  "Importado: \(if .imported then "Sí (Airbnb/iCal)" else "No (Reserva directa)" end)\n" +
  if .ical_summary != "" then "Resumen: \(.ical_summary | gsub("\""; ""))\n" else "" end +
  if $airbnb.url != "" then "URL Airbnb: \($airbnb.url)\n" else "" end +
  if $airbnb.phone != "" then "Teléfono (últimos 4): \($airbnb.phone)\n" else "" end +
  "\nDATOS DEL CLIENTE:\n" +
  if .customer.first_name != "" then
    "Nombre: \(.customer.first_name) \(.customer.last_name)\n"
  else
    "Nombre: [No disponible]\n"
  end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "" end +
  if .customer.phone != "" then "Teléfono: \(.customer.phone)\n" else "" end +
  if .customer.country != "" then "País: \(.customer.country)\n" else "" end +
  "\nPRECIO:\n" +
  "Total: \(.total_price) \(.currency)\n" +
  "\n"
' future-confirmed.json >> "$OUTPUT_FILE"

# Generar CSV
echo "ID,Check-in,Check-out,Noches,Adultos,Niños,Habitación,Precio,Moneda,Fuente,URL_Airbnb,Teléfono" > "$OUTPUT_CSV"

jq -r '.[] |
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
    .reserved_accommodations[0].accommodation,
    .total_price,
    .currency,
    (if .imported then "Airbnb" else "Directa" end),
    $airbnb.url,
    $airbnb.phone
  ] | @csv
' future-confirmed.json >> "$OUTPUT_CSV"

# Agregar resumen estadístico
{
    echo ""
    echo "============================================"
    echo "RESUMEN ESTADÍSTICO"
    echo "============================================"
    echo ""

    # Por fuente
    AIRBNB=$(jq '[.[] | select(.imported == true)] | length' future-confirmed.json)
    DIRECT=$(jq '[.[] | select(.imported == false)] | length' future-confirmed.json)
    echo "Por fuente:"
    echo "  Airbnb/iCal: $AIRBNB"
    echo "  Directas: $DIRECT"
    echo ""

    # Por mes
    echo "Distribución mensual:"
    jq -r '.[].check_in_date' future-confirmed.json | cut -d'-' -f1,2 | sort | uniq -c | \
        awk '{printf "  %s: %d reservas\n", $2, $1}'
    echo ""
    echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar archivos temporales
rm -f temp-all-bookings.json future-confirmed.json temp-page-*.json temp-combined.json 2>/dev/null

# Mensaje final
echo -e "${GREEN}✅ ¡Proceso completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}ARCHIVOS GENERADOS:${NC}"
echo "📄 Reporte detallado: $OUTPUT_FILE"
echo "📊 Archivo CSV: $OUTPUT_CSV"
echo ""
echo -e "${YELLOW}COMANDOS ÚTILES:${NC}"
echo "Ver reporte completo:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Abrir CSV en Excel:"
echo "  open $OUTPUT_CSV"
echo ""
echo "Buscar una reserva:"
echo "  grep -A 20 'RESERVA #' $OUTPUT_FILE"
echo ""
echo -e "${BLUE}=========================================${NC}"