#!/bin/bash

BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1/bookings"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

echo "=== 1. Explorando estructura base de la API ==="
echo "Solicitud sin parámetros (default):"
curl -s "${BASE_URL}" -u "${API_KEY}:${CONSUMER_SECRET}" | jq '. | {total_items: length, first_item: .[0] | keys}'

echo -e "\n=== 2. Verificando headers de paginación ==="
curl -sI "${BASE_URL}" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -E "X-WP-Total|X-WP-TotalPages|Link"

echo -e "\n=== 3. Probando con per_page máximo (WordPress permite hasta 100) ==="
curl -s "${BASE_URL}?per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}" | jq 'length'

echo -e "\n=== 4. Obteniendo info de paginación con per_page=100 ==="
curl -sI "${BASE_URL}?per_page=100" -u "${API_KEY}:${CONSUMER_SECRET}" | grep -E "X-WP-Total|X-WP-TotalPages"

echo -e "\n=== 5. Explorando parámetros de filtrado disponibles ==="
echo "Probando filtro por estado (confirmed):"
curl -s "${BASE_URL}?status=confirmed&per_page=5" -u "${API_KEY}:${CONSUMER_SECRET}" | jq 'length'

echo -e "\nProbando filtro por fechas (after):"
TOMORROW=$(date -v +1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
curl -s "${BASE_URL}?after=${TOMORROW}&per_page=5" -u "${API_KEY}:${CONSUMER_SECRET}" | jq 'length'
