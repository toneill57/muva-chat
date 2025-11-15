#!/bin/bash

# ==============================================================================
# EXPORTAR RESERVAS CON TODOS LOS DATOS DE AIRBNB
# ==============================================================================

# Configuración
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-completas-${TIMESTAMP}.txt"

echo "=========================================="
echo "EXPORTANDO RESERVAS CON DATOS AIRBNB"
echo "=========================================="
echo ""

# Paso 1: Descargar reservas y nombres de habitaciones en una sola pasada
echo "Descargando reservas y datos de habitaciones..."
{
  for p in {1..5}; do
    echo "Página $p de 5..." >&2
    curl -s "${BASE_URL}/bookings?per_page=100&page=$p&orderby=date&order=desc&_embed" \
      -u "${API_KEY}:${CONSUMER_SECRET}"
  done
} | jq -s 'add' | jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' > reservas-futuras.json

TOTAL=$(jq 'length' reservas-futuras.json)
echo "Total de reservas futuras confirmadas: $TOTAL"
echo ""

# Crear el archivo de salida
{
  echo "============================================"
  echo "REPORTE DE RESERVAS CON DATOS COMPLETOS"
  echo "============================================"
  echo ""
  echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Total: $TOTAL reservas"
  echo ""
  echo "============================================"
  echo ""
} > "$OUTPUT_FILE"

# Procesar cada reserva
echo "Generando reporte detallado..."
jq -r '.[] |
  # Procesar ical_description para extraer URL y teléfono
  (.ical_description // "" |
    if . != "" then
      gsub("\""; "") |
      split("\n") as $lines |
      {
        url: ($lines[0] | if contains("Reservation URL:") then split(": ")[1] else "" end),
        phone: ($lines[1] | if contains("Phone Number") then split(": ")[1] else "" end)
      }
    else
      {url: "", phone: ""}
    end
  ) as $airbnb |

  # Calcular noches (simple)
  ((.check_out_date | split("-") | .[2] | tonumber) -
   (.check_in_date | split("-") | .[2] | tonumber)) as $nights_raw |
  ($nights_raw | if . < 0 then . + 30 else . end) as $nights |

  "=====================================\n" +
  "RESERVA #\(.id)\n" +
  "=====================================\n" +
  "\nINFORMACIÓN BÁSICA:\n" +
  "-------------------\n" +
  "Estado: CONFIRMADA\n" +
  "Check-in:  \(.check_in_date) a las \(.check_in_time)\n" +
  "Check-out: \(.check_out_date) a las \(.check_out_time)\n" +
  "Noches: \($nights)\n" +
  "Habitación ID: \(.reserved_accommodations[0].accommodation)\n" +
  "Tipo ID: \(.reserved_accommodations[0].accommodation_type)\n" +
  "\nHUÉSPEDES:\n" +
  "-----------\n" +
  "Adultos: \(.reserved_accommodations[0].adults)\n" +
  "Niños: \(.reserved_accommodations[0].children)\n" +
  "Total: \(.reserved_accommodations[0].adults + .reserved_accommodations[0].children)\n" +
  "\nDATOS DE RESERVA AIRBNB:\n" +
  "------------------------\n" +
  "Importado de: \(if .imported then "Airbnb/iCal" else "Reserva directa" end)\n" +
  if .ical_summary != "" then "Resumen: \(.ical_summary | gsub("\""; ""))\n" else "" end +
  if $airbnb.url != "" then "URL de reserva: \($airbnb.url)\n" else "" end +
  if $airbnb.phone != "" then "Teléfono (últimos 4): \($airbnb.phone)\n" else "" end +
  if .ical_prodid != "" then "Sistema: \(.ical_prodid)\n" else "" end +
  "\nDATOS DEL CLIENTE:\n" +
  "------------------\n" +
  if .customer.first_name != "" then "Nombre: \(.customer.first_name) \(.customer.last_name)\n" else "Nombre: [No disponible en importación Airbnb]\n" end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "Email: [No disponible en importación Airbnb]\n" end +
  if .customer.phone != "" then "Teléfono completo: \(.customer.phone)\n" else "" end +
  if .customer.country != "" then "País: \(.customer.country)\n" else "" end +
  "\nINFORMACIÓN FINANCIERA:\n" +
  "-----------------------\n" +
  "Precio total: \(.total_price) \(.currency)\n" +
  if .total_price == 0 then "[Precio gestionado por Airbnb]\n" else "" end +
  "\n\n"
' reservas-futuras.json >> "$OUTPUT_FILE"

# Agregar resumen estadístico
{
  echo "============================================"
  echo "RESUMEN ESTADÍSTICO"
  echo "============================================"
  echo ""
  echo "Total de reservas: $TOTAL"
  echo ""

  # Por fuente
  AIRBNB_COUNT=$(jq '[.[] | select(.imported == true)] | length' reservas-futuras.json)
  DIRECT_COUNT=$(jq '[.[] | select(.imported == false)] | length' reservas-futuras.json)
  echo "Por fuente:"
  echo "  Airbnb/iCal: $AIRBNB_COUNT"
  echo "  Reservas directas: $DIRECT_COUNT"
  echo ""

  # Por mes
  echo "Distribución por mes:"
  jq -r '.[].check_in_date' reservas-futuras.json | cut -d'-' -f1,2 | sort | uniq -c | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""

  # Habitaciones más reservadas
  echo "Top 5 habitaciones (por ID):"
  jq -r '.[] | .reserved_accommodations[0].accommodation' reservas-futuras.json | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "  Habitación %s: %d reservas\n", $2, $1}'

  echo ""
  echo "============================================"
} >> "$OUTPUT_FILE"

# Crear también una versión simplificada en formato tabla
echo "Generando tabla resumen..."
{
  printf "%-8s %-12s %-12s %-7s %-8s %-10s %-50s %-15s\n" \
    "ID" "CHECK-IN" "CHECK-OUT" "NOCHES" "HUÉSP." "HAB." "URL AIRBNB" "TELÉFONO"
  echo "--------------------------------------------------------------------------------------------------------"

  jq -r '.[] |
    (.ical_description // "" |
      if . != "" then
        gsub("\""; "") | split("\n") as $lines |
        {
          url: ($lines[0] | if contains("Reservation URL:") then split("/")[-1] else "-" end),
          phone: ($lines[1] | if contains("Phone Number") then split(": ")[1] else "-" end)
        }
      else
        {url: "-", phone: "-"}
      end
    ) as $airbnb |

    ((.check_out_date | split("-") | .[2] | tonumber) -
     (.check_in_date | split("-") | .[2] | tonumber)) as $nights_raw |
    ($nights_raw | if . < 0 then . + 30 else . end) as $nights |

    "\(.id)\t\(.check_in_date)\t\(.check_out_date)\t\($nights)\t\(.reserved_accommodations[0].adults)+\(.reserved_accommodations[0].children)\t\(.reserved_accommodations[0].accommodation)\t\($airbnb.url)\t\($airbnb.phone)"
  ' reservas-futuras.json | \
  while IFS=$'\t' read -r id checkin checkout nights guests room url phone; do
    printf "%-8s %-12s %-12s %-7s %-8s %-10s %-50s %-15s\n" \
      "$id" "$checkin" "$checkout" "$nights" "$guests" "$room" "$url" "$phone"
  done
} > "reservas-tabla-${TIMESTAMP}.txt"

# Limpiar
rm reservas-futuras.json

# Mensaje final
echo ""
echo "✅ Reportes generados exitosamente!"
echo ""
echo "📄 Reporte completo: $OUTPUT_FILE"
echo "📊 Tabla resumen: reservas-tabla-${TIMESTAMP}.txt"
echo ""
echo "Ver reporte completo:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Ver tabla resumen:"
echo "  cat reservas-tabla-${TIMESTAMP}.txt"
echo ""
echo "Buscar reserva específica:"
echo "  grep -A 20 'RESERVA #30245' $OUTPUT_FILE"