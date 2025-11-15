#!/bin/bash

# ==============================================================================
# EXPORTAR RESERVAS CON _embed (DATOS COMPLETOS EMBEBIDOS)
# ==============================================================================
# Este script usa el parámetro _embed que trae TODA la información relacionada
# Es más lento pero más completo - trae los nombres de habitaciones directamente
# ==============================================================================

# Configuración
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-embed-${TIMESTAMP}.txt"
OUTPUT_CSV="reservas-embed-${TIMESTAMP}.csv"

echo "=========================================="
echo "EXPORTANDO RESERVAS CON DATOS EMBEBIDOS"
echo "=========================================="
echo "NOTA: Este proceso es más lento pero más completo"
echo "Incluye nombres de habitaciones directamente de la API"
echo ""

# Paso 1: Detectar dinámicamente el número de páginas necesarias
echo "📊 Analizando cantidad de reservas en el sistema..."
HEADERS=$(curl -sI "${BASE_URL}?per_page=1" -u "${API_KEY}:${CONSUMER_SECRET}" 2>/dev/null)
TOTAL_RESERVAS=$(echo "$HEADERS" | grep -i "x-wp-total:" | sed 's/.*: //' | tr -d '\r' | tr -d ' ')

if [ -z "$TOTAL_RESERVAS" ]; then
    echo "Error: No se pudo obtener el total de reservas"
    exit 1
fi

# Calcular páginas necesarias con 100 items por página
PAGES_NEEDED=$(( (TOTAL_RESERVAS + 99) / 100 ))

echo "Total de reservas en el sistema: $TOTAL_RESERVAS"
echo "Páginas necesarias (100 items/página): $PAGES_NEEDED"
echo ""

# Paso 2: Descargar SOLO las páginas necesarias CON _embed (trae datos relacionados)
echo "Descargando $PAGES_NEEDED páginas con datos embebidos..."
echo "Esto puede tomar 2-3 minutos por página..."
{
  for p in $(seq 1 $PAGES_NEEDED); do
    echo "📥 Descargando página $p de $PAGES_NEEDED (con datos embebidos)..." >&2
    # _embed trae los datos de accommodation_type embebidos
    curl -s "${BASE_URL}?per_page=100&page=$p&orderby=date&order=desc&_embed" \
      -u "${API_KEY}:${CONSUMER_SECRET}"
    echo "   ✓ Página $p completada" >&2
  done
} | jq -s 'add' > temp-embed.json

echo ""
echo "Descarga completada. Procesando datos..."

# Paso 3: Filtrar reservas futuras confirmadas
jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  temp-embed.json > future-embed.json

TOTAL=$(jq 'length' future-embed.json)
echo "Total de reservas futuras confirmadas: $TOTAL"
echo ""

# Paso 4: Crear reporte de texto detallado
echo "Generando reporte detallado..."
{
  echo "============================================"
  echo "REPORTE COMPLETO CON DATOS EMBEBIDOS"
  echo "============================================"
  echo ""
  echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Total: $TOTAL reservas confirmadas"
  echo "Período: Desde $TODAY en adelante"
  echo ""
  echo "============================================"
  echo "DETALLE DE CADA RESERVA"
  echo "============================================"
  echo ""
} > "$OUTPUT_FILE"

# Procesar cada reserva extrayendo TODOS los campos
jq -r '.[] |
  # Extraer datos de Airbnb del ical_description
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
     # Aproximación si cruza meses
     30 - ($in[2] | tonumber) + ($out[2] | tonumber)
   end
  ) as $nights |

  # Obtener nombre de habitación de los datos embebidos (si están disponibles)
  (._embedded.accommodation_type[0].title //
   "Habitación ID: \(.reserved_accommodations[0].accommodation)") as $room_name |

  "========================================\n" +
  "RESERVA #\(.id)\n" +
  "========================================\n" +
  "\n📅 FECHAS Y ESTANCIA:\n" +
  "Check-in:  \(.check_in_date) (\(.check_in_time))\n" +
  "Check-out: \(.check_out_date) (\(.check_out_time))\n" +
  "Noches: \($nights)\n" +
  "Estado: \(.status | ascii_upcase)\n" +
  "\n🏠 ALOJAMIENTO:\n" +
  "Habitación: \($room_name)\n" +
  "ID Habitación: \(.reserved_accommodations[0].accommodation)\n" +
  "ID Tipo: \(.reserved_accommodations[0].accommodation_type)\n" +
  "\n👥 HUÉSPEDES:\n" +
  "Adultos: \(.reserved_accommodations[0].adults)\n" +
  "Niños: \(.reserved_accommodations[0].children)\n" +
  "Total: \(.reserved_accommodations[0].adults + .reserved_accommodations[0].children)\n" +
  "\n🔗 DATOS AIRBNB/ICAL:\n" +
  "Importado: \(if .imported then "Sí (Airbnb/iCal)" else "No (Reserva directa)" end)\n" +
  if .ical_summary != "" then "Resumen: \(.ical_summary | gsub("\""; ""))\n" else "" end +
  if $airbnb.url != "" then "URL Reserva: \($airbnb.url)\n" else "" end +
  if $airbnb.phone != "" then "Teléfono (últimos 4): \($airbnb.phone)\n" else "" end +
  if .ical_prodid != "" then "Sistema origen: \(.ical_prodid)\n" else "" end +
  "\n👤 INFORMACIÓN DEL CLIENTE:\n" +
  if .customer.first_name != "" then
    "Nombre: \(.customer.first_name) \(.customer.last_name)\n"
  else
    "Nombre: [No disponible - Importación Airbnb]\n"
  end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "" end +
  if .customer.phone != "" then "Teléfono directo: \(.customer.phone)\n" else "" end +
  if .customer.country != "" then "País: \(.customer.country)\n" else "" end +
  if .customer.state != "" then "Estado/Provincia: \(.customer.state)\n" else "" end +
  if .customer.city != "" then "Ciudad: \(.customer.city)\n" else "" end +
  if .customer.address1 != "" then "Dirección: \(.customer.address1)\n" else "" end +
  "\n💰 INFORMACIÓN FINANCIERA:\n" +
  "Precio total: \(.total_price) \(.currency)\n" +
  if .total_price == 0 then "[Precio gestionado por plataforma externa]\n" else "" end +
  "\n📝 NOTAS ADICIONALES:\n" +
  if .note != "" then "Nota pública: \(.note)\n" else "" end +
  if (.internal_notes | length) > 0 then
    "Notas internas: \(.internal_notes | join(", "))\n"
  else "" end +
  "\n----------------------------------------\n\n"
' future-embed.json >> "$OUTPUT_FILE"

# Paso 5: Generar CSV para Excel
echo "Generando archivo CSV..."
{
  echo "ID,Estado,Habitacion,Check-in,Check-out,Noches,Adultos,Niños,Total_Huespedes,Precio,Moneda,Fuente,Resumen_Airbnb,URL_Airbnb,Telefono_Airbnb,Nombre_Cliente,Email_Cliente,Telefono_Cliente,Pais,Ciudad"
} > "$OUTPUT_CSV"

jq -r '.[] |
  # Procesar datos de Airbnb
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

  # Obtener nombre de habitación
  (._embedded.accommodation_type[0].title //
   "ID: \(.reserved_accommodations[0].accommodation)") as $room_name |

  # Generar línea CSV
  [
    .id,
    .status,
    $room_name,
    .check_in_date,
    .check_out_date,
    $nights,
    .reserved_accommodations[0].adults,
    .reserved_accommodations[0].children,
    (.reserved_accommodations[0].adults + .reserved_accommodations[0].children),
    .total_price,
    .currency,
    (if .imported then "Airbnb/iCal" else "Directa" end),
    (.ical_summary // "" | gsub("\""; "")),
    $airbnb.url,
    $airbnb.phone,
    "\(.customer.first_name) \(.customer.last_name)" | gsub("^ $"; ""),
    .customer.email,
    .customer.phone,
    .customer.country,
    .customer.city
  ] | @csv
' future-embed.json >> "$OUTPUT_CSV"

# Paso 6: Agregar resumen estadístico
{
  echo ""
  echo "============================================"
  echo "RESUMEN ESTADÍSTICO"
  echo "============================================"
  echo ""
  echo "📊 TOTALES:"
  echo "Total de reservas: $TOTAL"
  echo ""

  # Por fuente
  AIRBNB=$(jq '[.[] | select(.imported == true)] | length' future-embed.json)
  DIRECT=$(jq '[.[] | select(.imported == false)] | length' future-embed.json)
  echo "POR FUENTE:"
  echo "  Airbnb/iCal: $AIRBNB reservas"
  echo "  Directas: $DIRECT reservas"
  echo ""

  # Por mes
  echo "DISTRIBUCIÓN MENSUAL:"
  jq -r '.[].check_in_date' future-embed.json | cut -d'-' -f1,2 | sort | uniq -c | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""

  # Habitaciones más reservadas (con nombres si están disponibles)
  echo "TOP 5 HABITACIONES MÁS RESERVADAS:"
  jq -r '._embedded.accommodation_type[0].title //
         "ID: \(.reserved_accommodations[0].accommodation)"' future-embed.json | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{$1=$1; printf "  %d reservas: %s\n", $1, substr($0, index($0,$2))}'

  echo ""
  echo "============================================"
  echo "FIN DEL REPORTE"
  echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar archivos temporales
rm temp-embed.json future-embed.json

# Mensaje final
echo ""
echo "✅ Reportes con datos embebidos generados exitosamente!"
echo ""
echo "📄 Reporte completo: $OUTPUT_FILE"
echo "📊 Archivo CSV: $OUTPUT_CSV"
echo ""
echo "NOTA: Este reporte incluye los nombres de habitaciones"
echo "obtenidos directamente de la API con _embed"
echo ""
echo "Para ver el reporte:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Para abrir en Excel:"
echo "  open $OUTPUT_CSV"
echo ""
echo "Para buscar una reserva:"
echo "  grep -A 30 'RESERVA #30245' $OUTPUT_FILE"