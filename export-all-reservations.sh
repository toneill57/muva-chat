#!/bin/bash

# ==============================================================================
# EXPORTAR TODAS LAS RESERVAS CONFIRMADAS A ARCHIVO
# ==============================================================================

# Configuración
BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"
TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="reservas-confirmadas-${TIMESTAMP}.txt"

echo "=========================================="
echo "EXPORTANDO RESERVAS CONFIRMADAS"
echo "=========================================="
echo ""

# Paso 1: Descargar las reservas (500 más recientes deberían ser suficientes)
echo "Descargando reservas..."
{
  for p in {1..5}; do
    echo "Descargando página $p de 5..." >&2
    curl -s "${BASE_URL}?per_page=100&page=$p&orderby=date&order=desc" \
      -u "${API_KEY}:${CONSUMER_SECRET}"
  done
} | jq -s 'add' > temp-all.json
echo ""

# Paso 2: Filtrar solo las futuras confirmadas
echo "Filtrando reservas futuras confirmadas..."
jq --arg today "$TODAY" \
  '[.[] | select(.check_in_date >= $today and .status == "confirmed")]' \
  temp-all.json > future-confirmed-export.json

# Paso 3: Contar total
TOTAL=$(jq 'length' future-confirmed-export.json)
echo "Total de reservas futuras confirmadas: $TOTAL"
echo ""

# Paso 4: Crear el archivo de salida con formato bonito
echo "Generando reporte..."
{
  echo "============================================"
  echo "REPORTE DE RESERVAS CONFIRMADAS"
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

# Agregar cada reserva con formato legible
jq -r '.[] |
  "-------------------------------------------\n" +
  "Reserva #\(.id)\n" +
  "Check-in:  \(.check_in_date) (\(.check_in_time))\n" +
  "Check-out: \(.check_out_date) (\(.check_out_time))\n" +
  "Habitación: \(.reserved_accommodations[0].accommodation)\n" +
  "Tipo: \(.reserved_accommodations[0].accommodation_type)\n" +
  "Huéspedes: \(.reserved_accommodations[0].adults) adultos + \(.reserved_accommodations[0].children) niños\n" +
  "Precio total: \(.total_price) \(.currency)\n" +
  "Importado: \(if .imported then "Sí (Airbnb/iCal)" else "No (Reserva directa)" end)\n" +
  if .ical_summary != "" then "Fuente: \(.ical_summary)\n" else "" end +
  if .customer.email != "" then "Email: \(.customer.email)\n" else "" end +
  if .customer.phone != "" then "Teléfono: \(.customer.phone)\n" else "" end +
  if .note != "" then "Nota: \(.note)\n" else "" end
' future-confirmed-export.json >> "$OUTPUT_FILE"

# Agregar resumen al final
{
  echo ""
  echo "============================================"
  echo "RESUMEN ESTADÍSTICO"
  echo "============================================"
  echo ""
  echo "Total de reservas: $TOTAL"
  echo ""
  echo "Distribución por mes:"
  jq -r '.[].check_in_date' future-confirmed-export.json | cut -d'-' -f1,2 | sort | uniq -c | \
    awk '{printf "  %s: %d reservas\n", $2, $1}'
  echo ""
  echo "Top 5 habitaciones más reservadas:"
  jq -r '.[] | .reserved_accommodations[0].accommodation' future-confirmed-export.json | \
    sort | uniq -c | sort -rn | head -5 | \
    awk '{printf "  Habitación %s: %d reservas\n", $2, $1}'
  echo ""
  echo "============================================"
  echo "FIN DEL REPORTE"
  echo "============================================"
} >> "$OUTPUT_FILE"

# Limpiar archivos temporales
rm temp-all.json future-confirmed-export.json

# Mensaje final
echo "✅ Reporte generado exitosamente!"
echo "📄 Archivo: $OUTPUT_FILE"
echo ""
echo "Para ver el archivo:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "Para buscar una reserva específica:"
echo "  grep 'Reserva #30260' $OUTPUT_FILE"