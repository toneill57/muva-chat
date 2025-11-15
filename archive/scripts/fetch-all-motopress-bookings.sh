#!/bin/bash

# ==============================================================================
# MOTOPRESS BOOKING API - SOLUCIÓN ÓPTIMA PARA OBTENER TODAS LAS RESERVAS
# ==============================================================================
#
# Este script obtiene TODAS las reservas de la API de MotoPress de la manera
# más eficiente posible, usando paginación con el máximo de items por página.
#
# Hallazgos clave:
# - Total de reservas: 4000
# - Máximo por página: 100 (límite de WordPress REST API)
# - Páginas necesarias: 40
# - Los filtros de fecha (after, before) NO funcionan correctamente
# - El filtrado debe hacerse localmente después de obtener los datos
# ==============================================================================

# Configuración de la API
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Archivo de salida
OUTPUT_FILE="all-bookings.json"
TODAY=$(date +%Y-%m-%d)

echo -e "${BLUE}=========================================="
echo "   MOTOPRESS BOOKINGS - FETCH ALL"
echo -e "==========================================${NC}"
echo ""

# Función para obtener el total de reservas
get_total_bookings() {
    local headers=$(curl -sI "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}")
    local total=$(echo "$headers" | grep -i "X-WP-Total:" | sed 's/.*: //' | sed 's/[^0-9]*//g' | tr -d '\r')
    echo "$total"
}

# Obtener información inicial
echo -e "${YELLOW}📊 Analizando API...${NC}"
TOTAL=$(get_total_bookings)
TOTAL_PAGES=$((($TOTAL + 99) / 100))  # Ceiling division for 100 items per page

echo -e "Total de reservas: ${GREEN}${TOTAL}${NC}"
echo -e "Páginas necesarias (100 items/página): ${GREEN}${TOTAL_PAGES}${NC}"
echo ""

# Método 1: Obtener TODAS las reservas con paginación
echo -e "${BLUE}=== MÉTODO 1: Obtener TODAS las reservas ===${NC}"
echo -e "${YELLOW}Descargando ${TOTAL_PAGES} páginas...${NC}"
echo ""

# Inicializar archivo JSON con array vacío
echo "[]" > "$OUTPUT_FILE"

# Descargar todas las páginas
for page in $(seq 1 $TOTAL_PAGES); do
    echo -ne "\r${YELLOW}Descargando página ${page}/${TOTAL_PAGES}...${NC}"

    # Descargar página
    RESPONSE=$(curl -s "${BASE_URL}?per_page=100&page=${page}" \
        -u "${API_KEY}:${CONSUMER_SECRET}")

    # Agregar al archivo (merge arrays)
    if [ "$page" -eq 1 ]; then
        echo "$RESPONSE" > "$OUTPUT_FILE"
    else
        # Merge with existing array
        jq -s '.[0] + .[1]' "$OUTPUT_FILE" <(echo "$RESPONSE") > temp.json && mv temp.json "$OUTPUT_FILE"
    fi
done

echo ""
echo -e "${GREEN}✅ Descarga completa!${NC}"
echo ""

# Análisis de las reservas descargadas
echo -e "${BLUE}=== ANÁLISIS DE RESERVAS ===${NC}"
TOTAL_DOWNLOADED=$(jq 'length' "$OUTPUT_FILE")
echo -e "Total descargadas: ${GREEN}${TOTAL_DOWNLOADED}${NC}"

# Filtrar reservas futuras
FUTURE_BOOKINGS=$(jq "[.[] | select(.check_in_date >= \"$TODAY\")]" "$OUTPUT_FILE")
FUTURE_COUNT=$(echo "$FUTURE_BOOKINGS" | jq 'length')
echo -e "Reservas futuras (check-in >= hoy): ${GREEN}${FUTURE_COUNT}${NC}"

# Filtrar reservas futuras confirmadas
FUTURE_CONFIRMED=$(echo "$FUTURE_BOOKINGS" | jq '[.[] | select(.status == "confirmed")]')
FUTURE_CONFIRMED_COUNT=$(echo "$FUTURE_CONFIRMED" | jq 'length')
echo -e "Reservas futuras confirmadas: ${GREEN}${FUTURE_CONFIRMED_COUNT}${NC}"

# Guardar reservas futuras en archivo separado
echo "$FUTURE_BOOKINGS" > "future-bookings.json"
echo "$FUTURE_CONFIRMED" > "future-confirmed-bookings.json"

echo ""
echo -e "${BLUE}=== ARCHIVOS GENERADOS ===${NC}"
echo -e "1. ${GREEN}all-bookings.json${NC} - Todas las reservas (${TOTAL_DOWNLOADED})"
echo -e "2. ${GREEN}future-bookings.json${NC} - Reservas futuras (${FUTURE_COUNT})"
echo -e "3. ${GREEN}future-confirmed-bookings.json${NC} - Reservas futuras confirmadas (${FUTURE_CONFIRMED_COUNT})"

echo ""
echo -e "${BLUE}=== COMANDOS ÓPTIMOS ===${NC}"
echo ""
echo -e "${YELLOW}1. Para obtener TODAS las reservas (con paginación):${NC}"
echo "for page in \$(seq 1 $TOTAL_PAGES); do"
echo "  curl -s \"${BASE_URL}?per_page=100&page=\$page\" \\"
echo "    -u \"${API_KEY}:${CONSUMER_SECRET}\""
echo "done"
echo ""
echo -e "${YELLOW}2. Para obtener las últimas 100 reservas:${NC}"
echo "curl -s \"${BASE_URL}?per_page=100&orderby=date&order=desc\" \\"
echo "  -u \"${API_KEY}:${CONSUMER_SECRET}\""
echo ""
echo -e "${YELLOW}3. Para filtrar reservas futuras (después de descargar):${NC}"
echo "jq '[.[] | select(.check_in_date >= \"$(date +%Y-%m-%d)\")]' all-bookings.json"
echo ""

# Mostrar estadísticas por estado
echo -e "${BLUE}=== ESTADÍSTICAS POR ESTADO ===${NC}"
for status in confirmed pending cancelled completed; do
    COUNT=$(jq "[.[] | select(.status == \"$status\")] | length" "$OUTPUT_FILE")
    echo -e "Estado '$status': ${GREEN}${COUNT}${NC} reservas"
done

echo ""
echo -e "${BLUE}=== PRÓXIMAS 5 RESERVAS ===${NC}"
echo "$FUTURE_CONFIRMED" | jq -r '.[:5] | .[] | "📅 \(.check_in_date) - \(.check_out_date) | ID: \(.id) | Habitación: \(.reserved_accommodations[0].accommodation)"'

echo ""
echo -e "${GREEN}✅ ¡Proceso completado exitosamente!${NC}"
echo ""
echo -e "${YELLOW}NOTA IMPORTANTE:${NC}"
echo "- Los filtros de fecha en la API NO funcionan correctamente"
echo "- Es necesario descargar todas las reservas y filtrar localmente"
echo "- Para producción, considera implementar caché y actualizaciones incrementales"