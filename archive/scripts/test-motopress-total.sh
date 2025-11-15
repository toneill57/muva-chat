#!/bin/bash

TODAY=$(date +%Y-%m-%d)
FUTURE=$(date -v+2y +%Y-%m-%d)
CREDS="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a:cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

echo "🔍 Consultando MotoPress API..."
echo "Filtro: check_in_date >= $TODAY"
echo "Filtro: check_out_date <= $FUTURE"
echo ""

# Hacer request y contar
curl -s "https://tucasaenelmar.com/wp-json/mphb/v1/bookings?check_in_date=${TODAY}&check_out_date=${FUTURE}&accommodation_type=0" \
  -u "${CREDS}" \
  -D /tmp/headers.txt \
  | jq '. | length' > /tmp/count.txt

COUNT=$(cat /tmp/count.txt)

# Ver headers para info de paginación
echo "📊 Resultado:"
echo "Primera página: $COUNT reservas"
echo ""
echo "Headers HTTP (para ver total):"
grep -i "x-wp-total\|link" /tmp/headers.txt

rm /tmp/headers.txt /tmp/count.txt
