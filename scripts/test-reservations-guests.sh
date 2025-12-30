#!/bin/bash

# Test script for /api/reservations/list with guests array
# Verifies that the response includes guests, total_guests, and registered_guests

set -a && source .env.local && set +a

echo "🧪 Testing /api/reservations/list with guests array..."
echo ""

# Get staff token from environment
STAFF_TOKEN="${TEST_STAFF_TOKEN}"
TENANT="${TEST_TENANT:-akelarre}"

if [ -z "$STAFF_TOKEN" ]; then
  echo "❌ TEST_STAFF_TOKEN not found in .env.local"
  echo "Please add TEST_STAFF_TOKEN='your-token-here' to .env.local"
  exit 1
fi

echo "📍 Testing tenant: $TENANT"
echo "🔑 Using staff token: ${STAFF_TOKEN:0:20}..."
echo ""

# Make request
RESPONSE=$(curl -s http://localhost:3000/api/reservations/list \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
  echo "❌ Invalid JSON response"
  echo "$RESPONSE"
  exit 1
fi

# Extract first reservation for inspection
FIRST_RES=$(echo "$RESPONSE" | jq '.data.reservations[0]')

if [ "$FIRST_RES" = "null" ]; then
  echo "⚠️  No reservations found"
  echo ""
  echo "Full response:"
  echo "$RESPONSE" | jq .
  exit 0
fi

echo "✅ Response received successfully"
echo ""

# Check for new fields
HAS_GUESTS=$(echo "$FIRST_RES" | jq 'has("guests")')
HAS_TOTAL=$(echo "$FIRST_RES" | jq 'has("total_guests")')
HAS_REGISTERED=$(echo "$FIRST_RES" | jq 'has("registered_guests")')

echo "📊 First Reservation Structure Check:"
echo "  - guests array: $([ "$HAS_GUESTS" = "true" ] && echo "✅" || echo "❌")"
echo "  - total_guests: $([ "$HAS_TOTAL" = "true" ] && echo "✅" || echo "❌")"
echo "  - registered_guests: $([ "$HAS_REGISTERED" = "true" ] && echo "✅" || echo "❌")"
echo ""

# Show guest details
GUEST_NAME=$(echo "$FIRST_RES" | jq -r '.guest_name')
TOTAL_GUESTS=$(echo "$FIRST_RES" | jq -r '.total_guests')
REGISTERED=$(echo "$FIRST_RES" | jq -r '.registered_guests')
GUESTS_ARRAY=$(echo "$FIRST_RES" | jq '.guests')
GUESTS_COUNT=$(echo "$GUESTS_ARRAY" | jq 'length')

echo "🎯 Guest Information:"
echo "  Reservation: $GUEST_NAME"
echo "  Total Expected: $TOTAL_GUESTS"
echo "  Registered: $REGISTERED"
echo "  Guests in array: $GUESTS_COUNT"
echo ""

if [ "$GUESTS_COUNT" -gt 0 ]; then
  echo "👥 Guests Details:"
  echo "$GUESTS_ARRAY" | jq '.[] | {
    order: .guest_order,
    name: (.given_names + " " + .first_surname),
    complete: .sire_complete
  }'
else
  echo "⚠️  No guests in array (this is OK if no companions registered)"
fi

echo ""
echo "📝 Full First Reservation (condensed):"
echo "$FIRST_RES" | jq '{
  id,
  guest_name,
  check_in_date,
  adults,
  total_guests,
  registered_guests,
  guests: .guests | length
}'

echo ""
echo "✅ Test completed!"
