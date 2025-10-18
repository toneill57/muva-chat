#!/bin/bash

# ==============================================================================
# EXPORTAR TODAS LAS RESERVAS CONFIRMADAS CON DATOS COMPLETOS
# ==============================================================================

# Configuración
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-detalladas-${TIMESTAMP}.txt"
OUTPUT_CSV="reservas-detalladas-${TIMESTAMP}.csv"

echo "=========================================="
echo "EXPORTANDO RESERVAS CON DATOS COMPLETOS"
echo "=========================================="
echo ""

# Paso 1: Descargar las reservas
echo "Descargando reservas..."
{
  for p in {1..5}; do
    echo "Descargando página $p de 5..." >&2
    curl -s "${BASE_URL}/bookings?per_page=100&page=$p&orderby=date&order=desc" \
      -u "${API_KEY}:${CONSUMER_SECRET}"
  done
} | jq -s 'add' > temp-bookings.json
echo ""

# Paso 2: Obtener todos los accommodation_types únicos para mapear nombres
echo "Obteniendo nombres de habitaciones..."
jq -r '[.[].reserved_accommodations[0].accommodation_type] | unique | .[]' temp-bookings.json > temp-types.txt

# Crear un archivo JSON con el mapeo de IDs a nombres
echo "{" > accommodation-names.json
first=true
while read -r type_id; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> accommodation-names.json
  fi

  # Obtener el nombre de cada tipo
  NAME=$(curl -s "${BASE_URL}/accommodation_types/${type_id}" \
    -u "${API_KEY}:${CONSUMER_SECRET}" | jq -r '.title // "Unknown"')

  echo "  \"$type_id\": \"$NAME\"" >> accommodation-names.json
  echo "  Tipo $type_id: $NAME" >&2
done < temp-types.txt
echo "}" >> accommodation-names.json
echo ""

# Paso 3: Filtrar solo las futuras confirmadas
echo "Filtrando reservas futuras confirmadas..."
jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  temp-bookings.json > future-confirmed.json

# Paso 4: Combinar con nombres de habitaciones
jq --slurpfile names accommodation-names.json \
  '[.[] | . + {room_name: $names[0][.reserved_accommodations[0].accommodation_type | tostring]}]' \
  future-confirmed.json > future-with-names.json

# Contar total
TOTAL=$(jq 'length' future-with-names.json)
echo "Total de reservas futuras confirmadas: $TOTAL"
echo ""

# Paso 5: Crear el archivo de salida con formato detallado
echo "Generando reporte detallado..."
{
  echo "============================================"
  echo "REPORTE DETALLADO DE RESERVAS CONFIRMADAS"
  echo "============================================"
  echo ""
  echo "Fecha de generación: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Total de reservas: $TOTAL"
  echo "Período: Desde $TODAY en adelante"
  echo ""
  echo "============================================"
  echo "LISTADO DETALLADO DE RESERVAS"
  echo "============================================"
  echo ""
} > "$OUTPUT_FILE"

# Procesar cada reserva con todos los campos
jq -r '.[] |
  # Extraer URL y teléfono del ical_description
  (.ical_description |
    if . != "" and . != null then
      . | gsub("\""; "") | split("\n") |
      {
        url: (.[0] | if contains("Reservation URL:") then split(": ")[1] else "" end),
        phone: (.[1] | if contains("Phone Number") then split(": ")[1] else "" end)
      }
    else
      {url: "", phone: ""}
    end
  ) as $airbnb |

  # Calcular número de noches
  ((.check_out_date | split("-") | map(tonumber)) as $out |
   (.check_in_date | split("-") | map(tonumber)) as $in |
   # Aproximación simple de días (no exacta pero suficiente para este caso)
   (($out[1] - $in[1]) * 30 + ($out[2] - $in[2]))
  ) as $nights_approx |

  "-------------------------------------------\n" +
  "RESERVA #\(.id)\n" +
  "-------------------------------------------\n" +
  "Estado: \(.status | ascii_upcase)\n" +
  "Habitación: \(.room_name // "ID: \(.reserved_accommodations[0].accommodation)")\n" +
  "Check-in:  \(.check_in_date) (\(.check_in_time))\n" +
  "Check-out: \(.check_out_date) (\(.check_out_time))\n" +
  "Noches: \(if .check_in_date == .check_out_date then "0" else
    ((.check_out_date | split("-")[2] | tonumber) -
     (.check_in_date | split("-")[2] | tonumber)) |
     if . < 0 then . + 30 else . end | tostring
  end)\n" +
  "Huéspedes: \(.reserved_accommodations[0].adults) adultos + \(.reserved_accommodations[0].children) niños\n" +
  "\nDATOS DE IMPORTACIÓN:\n" +
  "Fuente: \(if .imported then "Airbnb/iCal" else "Reserva directa" end)\n" +
  if .ical_summary != "" and .ical_summary != null then "Resumen: \(.ical_summary | gsub("\""; ""))\n" else "" end +
  if $airbnb.url != "" then "URL Airbnb: \($airbnb.url)\n" else "" end +
  if $airbnb.phone != "" then "Teléfono (últimos 4): \($airbnb.phone)\n" else "" end +
  "\nDATOS DEL CLIENTE:\n" +
  if .customer.first_name != "" then "Nombre: \(.customer.first_name) \(.customer.last_name)\n" else "Nombre: No disponible\n" end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "" end +
  if .customer.phone != "" then "Teléfono completo: \(.customer.phone)\n" else "" end +
  if .customer.country != "" then "País: \(.customer.country)\n" else "" end +
  if .customer.city != "" then "Ciudad: \(.customer.city)\n" else "" end +
  "\nDATOS FINANCIEROS:\n" +
  "Precio total: \(.total_price) \(.currency)\n" +
  if .note != "" then "\nNOTAS:\n\(.note)\n" else "" end +
  "\n"
' future-with-names.json >> "$OUTPUT_FILE"

# Paso 6: Generar también un CSV para Excel
echo "Generando archivo CSV..."
{
  echo "ID,Estado,Habitacion,Check-in,Check-out,Noches,Adultos,Niños,Precio,Moneda,Fuente,URL_Airbnb,Telefono_4_digitos,Nombre_Cliente,Email_Cliente"
} > "$OUTPUT_CSV"

jq -r '.[] |
  # Extraer URL y teléfono
  (.ical_description |
    if . != "" and . != null then
      . | gsub("\""; "") | split("\n") |
      {
        url: (.[0] | if contains("Reservation URL:") then split(": ")[1] else "" end),
        phone: (.[1] | if contains("Phone Number") then split(": ")[1] else "" end)
      }
    else
      {url: "", phone: ""}
    end
  ) as $airbnb |

  # Calcular noches (simplificado)
  (if .check_in_date == .check_out_date then "0" else
    ((.check_out_date | split("-")[2] | tonumber) -
     (.check_in_date | split("-")[2] | tonumber)) |
     if . < 0 then . + 30 else . end | tostring
  end) as $nights |

  [
    .id,
    .status,
    (.room_name // "ID: \(.reserved_accommodations[0].accommodation)"),
    .check_in_date,
    .check_out_date,
    $nights,
    .reserved_accommodations[0].adults,
    .reserved_accommodations[0].children,
    .total_price,
    .currency,
    (if .imported then "Airbnb" else "Directa" end),
    $airbnb.url,
    $airbnb.phone,
    "\(.customer.first_name) \(.customer.last_name)" | gsub("^ $"; "N/A"),
    .customer.email
  ] | @csv
' future-with-names.json >> "$OUTPUT_CSV"

# Agregar resumen al archivo de texto
{
  echo ""
  echo "============================================"
  echo "RESUMEN ESTADÍSTICO"
  echo "============================================"
  echo ""
  echo "Total de reservas: $TOTAL"
  echo ""
  echo "Por fuente:"
  echo "  Airbnb/iCal: $(jq '[.[] | select(.imported == true)] | length' future-with-names.json)"
  echo "  Directas: $(jq '[.[] | select(.imported == false)] | length' future-with-names.json)"
  echo ""
  echo "Distribución por mes:"
  jq -r '.[].check_in_date' future-with-names.json | cut -d'-' -f1,2 | sort | uniq -c | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""
  echo "Top 5 habitaciones más reservadas:"
  jq -r '.room_name' future-with-names.json | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""
  echo "============================================"
  echo "FIN DEL REPORTE"
  echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar archivos temporales
rm temp-bookings.json temp-types.txt accommodation-names.json future-confirmed.json future-with-names.json

# Mensaje final
echo "✅ Reportes generados exitosamente!"
echo ""
echo "📄 Archivo de texto: $OUTPUT_FILE"
echo "📊 Archivo CSV: $OUTPUT_CSV"
echo ""
echo "Para ver el reporte completo:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Para abrir el CSV en Excel:"
echo "  open $OUTPUT_CSV"
echo ""
echo "Para buscar una reserva específica:"
echo "  grep 'RESERVA #30245' $OUTPUT_FILE"