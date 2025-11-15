#!/bin/bash
# Test script to see FULL structure of accommodation_types API response

BASE_URL="https://tucasaenelmar.com/wp-json/mphb/v1"
API_KEY="ck_a4c1ba2fe37f828d43e0bb9081eb4e4c47cc5b8a"
CONSUMER_SECRET="cs_157e606bb9de3e53ee02e7f10e4fac65ac1086a9"

echo "Fetching accommodation type 10094 (La casa boutique los cedros)..."
echo ""

curl -s "${BASE_URL}/accommodation_types/10094" \
  -u "${API_KEY}:${CONSUMER_SECRET}" \
  | jq '.' > accommodation-10094-full.json

echo "Full response saved to: accommodation-10094-full.json"
echo ""
echo "Meta keys available:"
jq '.meta | keys' accommodation-10094-full.json

echo ""
echo "All top-level keys:"
jq 'keys' accommodation-10094-full.json
