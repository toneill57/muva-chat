#!/bin/bash

# ==============================================================================
# EXPORTAR RESERVAS MOTOPRESS - VERSIÓN DINÁMICA CON DATOS COMPLETOS (_embed)
# ==============================================================================
# Uso: ./export-reservations-dynamic-embed.sh <SITE_URL> <API_KEY> <CONSUMER_SECRET>
#
# Características:
#   ✅ Multi-tenant (acepta URL y credenciales como parámetros)
#   ✅ Detección dinámica de páginas necesarias
#   ✅ Usa _embed para obtener TODOS los datos (nombres de habitaciones, etc.)
#   ✅ Confirmación antes de descargar
#   ✅ Manejo de errores detallado
#   ⚠️ Más lento que la versión sin _embed (2-3 min por página)
#
# Ejemplo:
#   ./export-reservations-dynamic-embed.sh \
#     "https://tucasaenelmar.com" \
#     "ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a" \
#     "cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
# ==============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Extraer nombre del sitio para el reporte y archivos únicos
# Remover http:// o https://
SITE_NAME=$(echo "$SITE_URL" | sed 's|http://||' | sed 's|https://||' | sed 's|/.*||' | sed 's|www\.||')
# Convertir puntos a guiones para nombres de archivo seguros
SITE_SLUG=$(echo "$SITE_NAME" | tr '.' '-')

# Archivos de output y temporales únicos por sitio
OUTPUT_FILE="reservas-${SITE_SLUG}-${TIMESTAMP}.txt"
OUTPUT_CSV="reservas-${SITE_SLUG}-${TIMESTAMP}.csv"
TEMP_ALL="temp-all-bookings-${SITE_SLUG}.json"
TEMP_COMBINED="temp-combined-${SITE_SLUG}.json"

# Limpieza preventiva de archivos temporales de ejecuciones anteriores
echo -e "${CYAN}🧹 Limpiando archivos temporales de ejecuciones anteriores...${NC}"
rm -f temp-page-${SITE_SLUG}-*.json "$TEMP_ALL" "$TEMP_COMBINED" 2>/dev/null
echo -e "${GREEN}✓ Limpieza completada${NC}"
echo ""

# Configurar trap para limpieza automática si el script es interrumpido
cleanup_on_exit() {
    echo ""
    echo -e "${YELLOW}🧹 Limpiando archivos temporales antes de salir...${NC}"
    rm -f temp-page-${SITE_SLUG}-*.json "$TEMP_COMBINED" 2>/dev/null
    echo -e "${GREEN}✓ Limpieza completada${NC}"
}
trap cleanup_on_exit EXIT INT TERM

echo -e "${BLUE}=========================================="
echo "   EXPORTADOR DE RESERVAS MOTOPRESS"
echo "   CON DATOS COMPLETOS (_embed)"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Sitio:${NC} $SITE_NAME"
echo -e "${YELLOW}URL:${NC} $SITE_URL"
echo -e "${YELLOW}Fecha:${NC} $TODAY"
echo -e "${CYAN}Modo:${NC} Datos completos (incluye nombres de habitaciones)"
echo ""

# Paso 1: DETECTAR DINÁMICAMENTE el número de páginas necesarias
echo -e "${YELLOW}📊 Paso 1: Analizando cantidad de reservas...${NC}"
echo "----------------------------------------"

# Obtener el total de reservas con una petición mínima
# Timeout de 30 segundos para la petición inicial
HEADERS=$(curl -sI --max-time 30 --connect-timeout 10 \
    "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)

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

if [ -z "$TOTAL_RESERVAS" ]; then
    echo -e "${RED}Error: No se pudo obtener el total de reservas${NC}"
    echo "Respuesta de la API:"
    echo "$HEADERS" | head -20
    exit 1
fi

# Calcular páginas necesarias con 100 items por página
PAGES_NEEDED=$(( (TOTAL_RESERVAS + 99) / 100 ))

# Estimar tiempo de descarga (2-3 min por página con _embed)
ESTIMATED_TIME=$(( PAGES_NEEDED * 2 ))

echo -e "${GREEN}✓ Total de reservas en el sistema: $TOTAL_RESERVAS${NC}"
echo -e "${GREEN}✓ Páginas necesarias (100 items/página): $PAGES_NEEDED${NC}"
echo -e "${CYAN}⏱  Tiempo estimado de descarga: ~${ESTIMATED_TIME} minutos${NC}"
echo ""

# Preguntar si continuar
echo -e "${YELLOW}⚠️  NOTA: Esta versión usa _embed para obtener datos completos${NC}"
echo "Esto incluye nombres de habitaciones, imágenes y metadata adicional."
echo "El proceso es más lento pero mucho más completo."
echo ""
echo -e "${YELLOW}¿Deseas continuar con la descarga?${NC}"
echo "Esto descargará $PAGES_NEEDED páginas de datos completos (~${ESTIMATED_TIME} min)."
echo -n "Continuar? (s/n): "
read -r CONTINUAR

if [[ ! "$CONTINUAR" =~ ^[Ss]$ ]]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""

# Paso 2: Descargar SOLO las páginas necesarias CON _embed
echo -e "${YELLOW}📥 Paso 2: Descargando reservas con datos completos...${NC}"
echo "----------------------------------------"
echo ""

# Crear archivo temporal para combinar todas las páginas (único por sitio)
echo "[]" > "$TEMP_ALL"

START_TIME=$(date +%s)

for page in $(seq 1 $PAGES_NEEDED); do
    PAGE_START=$(date +%s)

    echo -e "${CYAN}📥 Descargando página $page de $PAGES_NEEDED (con _embed)...${NC}"

    # Sistema de reintentos (máximo 3 intentos para descarga)
    MAX_RETRIES=3
    RETRY_COUNT=0
    DOWNLOAD_SUCCESS=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$DOWNLOAD_SUCCESS" = "false" ]; do
        # Descargar página CON _embed (esto trae TODOS los datos relacionados)
        # Timeout de 120 segundos total, 30 segundos para conectar
        PAGE_DATA=$(curl -s --max-time 120 --connect-timeout 30 \
            "${BASE_URL}?per_page=100&page=${page}&orderby=date&order=desc&_embed" \
            -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)

        if [ $? -ne 0 ]; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}   ⚠ Error en intento $RETRY_COUNT, reintentando en 3s...${NC}"
                sleep 3
            else
                echo -e "${RED}   ✗ Error descargando página $page después de $MAX_RETRIES intentos${NC}"
            fi
            continue
        fi

        # Guardar página individual (para debug si es necesario) - único por sitio
        echo "$PAGE_DATA" > "temp-page-${SITE_SLUG}-${page}.json"

        # Verificar que no esté vacía y que sea JSON válido
        ITEMS_IN_PAGE=$(echo "$PAGE_DATA" | jq 'length' 2>/dev/null)

        if [ "$ITEMS_IN_PAGE" = "0" ] || [ -z "$ITEMS_IN_PAGE" ]; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo -e "${YELLOW}   ⚠ JSON inválido en intento $RETRY_COUNT, reintentando en 3s...${NC}"
                sleep 3
                continue  # Volver al inicio del while para reintentar
            else
                echo -e "${YELLOW}   ⚠ Página $page vacía o JSON inválido después de $MAX_RETRIES intentos, terminando descarga${NC}"
                break 2  # Salir del while y del for
            fi
        else
            # Descarga exitosa
            DOWNLOAD_SUCCESS=true
            if [ $RETRY_COUNT -gt 0 ]; then
                echo -e "${GREEN}   ✓ Descarga exitosa después de $((RETRY_COUNT + 1)) intentos${NC}"
            fi
        fi
    done

    # Si no se pudo descargar después de todos los reintentos, continuar con siguiente página
    if [ "$DOWNLOAD_SUCCESS" = "false" ]; then
        continue
    fi

    # Combinar con el archivo acumulado
    if [ $page -eq 1 ]; then
        echo "$PAGE_DATA" > "$TEMP_ALL"
        if [ $? -ne 0 ]; then
            echo -e "${RED}   ✗ Error al guardar página $page${NC}"
            continue
        fi
    else
        # Verificar que el archivo acumulado existe antes de combinar
        if [ ! -f "$TEMP_ALL" ]; then
            echo -e "${RED}   ✗ Error: archivo acumulado no existe, usando solo página actual${NC}"
            echo "$PAGE_DATA" > "$TEMP_ALL"
        else
            # Combinar con reintentos básicos (máximo 3 intentos)
            MERGE_SUCCESS=false
            MERGE_RETRIES=0
            MAX_MERGE_RETRIES=3

            while [ $MERGE_RETRIES -lt $MAX_MERGE_RETRIES ] && [ "$MERGE_SUCCESS" = "false" ]; do
                # Verificar que el archivo acumulado aún existe antes de intentar combinar
                if [ ! -f "$TEMP_ALL" ]; then
                    echo -e "${RED}   ✗ Error crítico: archivo acumulado desapareció durante la combinación${NC}"
                    echo -e "${YELLOW}   ⚠ Recreando desde página actual${NC}"
                    cp "temp-page-${SITE_SLUG}-${page}.json" "$TEMP_ALL"
                    MERGE_SUCCESS=true
                    break
                fi

                # Intentar combinar (simple, sin backup ni validación compleja)
                jq -s '.[0] + .[1]' "$TEMP_ALL" "temp-page-${SITE_SLUG}-${page}.json" > "$TEMP_COMBINED" 2>/dev/null

                if [ $? -eq 0 ] && [ -f "$TEMP_COMBINED" ] && [ -s "$TEMP_COMBINED" ]; then
                    # Merge exitoso
                    mv "$TEMP_COMBINED" "$TEMP_ALL"
                    MERGE_SUCCESS=true
                    if [ $MERGE_RETRIES -gt 0 ]; then
                        echo -e "${GREEN}   ✓ Combinación exitosa después de $((MERGE_RETRIES + 1)) intentos${NC}"
                    fi
                else
                    # Merge falló, reintentar
                    MERGE_RETRIES=$((MERGE_RETRIES + 1))
                    if [ $MERGE_RETRIES -lt $MAX_MERGE_RETRIES ]; then
                        echo -e "${YELLOW}   ⚠ Error al combinar, reintentando ($MERGE_RETRIES/$MAX_MERGE_RETRIES)...${NC}"
                        sleep 2
                    else
                        echo -e "${YELLOW}   ⚠ Error al combinar página $page después de $MAX_MERGE_RETRIES intentos${NC}"
                    fi
                fi
            done
        fi
    fi

    # Limpiar archivos temporales de página
    rm -f "temp-page-${SITE_SLUG}-${page}.json" "$TEMP_COMBINED" 2>/dev/null

    # Calcular tiempo de la página
    PAGE_END=$(date +%s)
    PAGE_DURATION=$(( PAGE_END - PAGE_START ))

    # Calcular tiempo restante estimado
    REMAINING_PAGES=$(( PAGES_NEEDED - page ))
    ESTIMATED_REMAINING=$(( REMAINING_PAGES * PAGE_DURATION ))
    ESTIMATED_MIN=$(( ESTIMATED_REMAINING / 60 ))
    ESTIMATED_SEC=$(( ESTIMATED_REMAINING % 60 ))

    echo -e "${GREEN}   ✓ Página $page completada en ${PAGE_DURATION}s${NC}"
    if [ $REMAINING_PAGES -gt 0 ]; then
        echo -e "${CYAN}   ⏱  Tiempo restante estimado: ~${ESTIMATED_MIN}m ${ESTIMATED_SEC}s${NC}"
    fi
    echo ""
done

END_TIME=$(date +%s)
TOTAL_DURATION=$(( END_TIME - START_TIME ))
TOTAL_MIN=$(( TOTAL_DURATION / 60 ))
TOTAL_SEC=$(( TOTAL_DURATION % 60 ))

echo -e "${GREEN}✓ Descarga completada en ${TOTAL_MIN}m ${TOTAL_SEC}s${NC}"
echo ""

# Paso 3: Filtrar reservas futuras confirmadas
echo -e "${YELLOW}🔍 Paso 3: Filtrando reservas futuras...${NC}"
echo "----------------------------------------"

jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  "$TEMP_ALL" > "future-confirmed-${SITE_SLUG}.json"

TOTAL_FUTURE=$(jq 'length' "future-confirmed-${SITE_SLUG}.json")
echo -e "${GREEN}✓ Reservas futuras confirmadas: $TOTAL_FUTURE${NC}"
echo ""

# Paso 4: Generar reporte detallado
echo -e "${YELLOW}📄 Paso 4: Generando reportes con datos completos...${NC}"
echo "----------------------------------------"

# Encabezado del reporte
{
    echo "============================================"
    echo "REPORTE COMPLETO DE RESERVAS - $SITE_NAME"
    echo "CON DATOS EMBEBIDOS (_embed)"
    echo "============================================"
    echo ""
    echo "Sitio: $SITE_URL"
    echo "Fecha de generación: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Total de reservas en sistema: $TOTAL_RESERVAS"
    echo "Reservas futuras confirmadas: $TOTAL_FUTURE"
    echo "Período: Desde $TODAY en adelante"
    echo "Tiempo de descarga: ${TOTAL_MIN}m ${TOTAL_SEC}s"
    echo ""
    echo "============================================"
    echo "DETALLE DE RESERVAS"
    echo "============================================"
    echo ""
} > "$OUTPUT_FILE"

# Procesar cada reserva con datos embebidos
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

  # Extraer nombre de habitación de datos embebidos (si existe)
  (._embedded.accommodations[0].title // "N/A") as $room_name |
  (._embedded.accommodation_types[0].title // "N/A") as $room_type |

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
  "Habitación: \($room_name)\n" +
  "Tipo: \($room_type)\n" +
  "ID Habitación: \(.reserved_accommodations[0].accommodation)\n" +
  "ID Tipo: \(.reserved_accommodations[0].accommodation_type)\n" +
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
' "future-confirmed-${SITE_SLUG}.json" >> "$OUTPUT_FILE"

# Generar CSV con datos embebidos
echo "ID,Check-in,Check-out,Noches,Adultos,Niños,Habitación,Tipo,Habitación_ID,Precio,Moneda,Fuente,URL_Airbnb,Teléfono" > "$OUTPUT_CSV"

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

  # Extraer nombres de datos embebidos
  (._embedded.accommodations[0].title // "N/A") as $room_name |
  (._embedded.accommodation_types[0].title // "N/A") as $room_type |

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
    $room_name,
    $room_type,
    .reserved_accommodations[0].accommodation,
    .total_price,
    .currency,
    (if .imported then "Airbnb" else "Directa" end),
    $airbnb.url,
    $airbnb.phone
  ] | @csv
' "future-confirmed-${SITE_SLUG}.json" >> "$OUTPUT_CSV"

# Agregar resumen estadístico
{
    echo ""
    echo "============================================"
    echo "RESUMEN ESTADÍSTICO"
    echo "============================================"
    echo ""

    # Por fuente
    AIRBNB=$(jq '[.[] | select(.imported == true)] | length' "future-confirmed-${SITE_SLUG}.json")
    DIRECT=$(jq '[.[] | select(.imported == false)] | length' "future-confirmed-${SITE_SLUG}.json")
    echo "Por fuente:"
    echo "  Airbnb/iCal: $AIRBNB"
    echo "  Directas: $DIRECT"
    echo ""

    # Por mes
    echo "Distribución mensual:"
    jq -r '.[].check_in_date' "future-confirmed-${SITE_SLUG}.json" | cut -d'-' -f1,2 | sort | uniq -c | \
        awk '{printf "  %s: %d reservas\n", $2, $1}'
    echo ""

    # Por tipo de habitación (usando datos embebidos)
    echo "Por tipo de alojamiento:"
    jq -r '.[].reserved_accommodations[0].accommodation_type' "future-confirmed-${SITE_SLUG}.json" | sort | uniq -c | \
        awk '{printf "  Tipo ID %s: %d reservas\n", $2, $1}'
    echo ""

    echo "============================================"
    echo "INFORMACIÓN DE DESCARGA"
    echo "============================================"
    echo ""
    echo "Páginas descargadas: $PAGES_NEEDED"
    echo "Tiempo total: ${TOTAL_MIN}m ${TOTAL_SEC}s"
    echo "Modo: Datos completos con _embed"
    echo ""
    echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar archivos temporales (específicos de este sitio)
rm -f "$TEMP_ALL" "future-confirmed-${SITE_SLUG}.json" "temp-page-${SITE_SLUG}-"*.json "$TEMP_COMBINED" 2>/dev/null

# Mensaje final
echo -e "${GREEN}✅ ¡Proceso completado exitosamente!${NC}"
echo ""
echo -e "${BLUE}ARCHIVOS GENERADOS:${NC}"
echo "📄 Reporte detallado: $OUTPUT_FILE"
echo "📊 Archivo CSV: $OUTPUT_CSV"
echo ""
echo -e "${CYAN}DATOS INCLUIDOS:${NC}"
echo "✓ Nombres completos de habitaciones (no solo IDs)"
echo "✓ Tipos de alojamiento"
echo "✓ Metadata adicional de _embed"
echo "✓ URLs de Airbnb y teléfonos"
echo "✓ Información completa de clientes"
echo ""
echo -e "${YELLOW}COMANDOS ÚTILES:${NC}"
echo "Ver reporte completo:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Abrir CSV en Excel:"
echo "  open $OUTPUT_CSV"
echo ""
echo "Buscar una reserva:"
echo "  grep -A 25 'RESERVA #' $OUTPUT_FILE"
echo ""
echo "Filtrar por habitación:"
echo "  grep 'Habitación:' $OUTPUT_FILE"
echo ""
echo -e "${BLUE}=========================================${NC}"
