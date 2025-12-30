#!/bin/bash
# Test script to verify guest_order is sent in SIRE chat payloads
# Created: Dec 28, 2025

set -e

echo "========================================"
echo "Test: Verify guest_order in SIRE payloads"
echo "========================================"
echo ""

# Load environment
set -a
source .env.local
set +a

# Get test token (assuming there's a valid reservation)
TENANT="muva"
CHECKIN_DATE="2025-01-15"
PHONE_LAST4="1234"

echo "1. Getting guest token..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/guest/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant\": \"$TENANT\",
    \"checkinDate\": \"$CHECKIN_DATE\",
    \"phoneLast4\": \"$PHONE_LAST4\"
  }")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Token obtained"
echo ""

echo "2. Testing SIRE chat with guest_order=1 (titular)..."
RESPONSE_1=$(curl -s -X POST "http://localhost:3000/api/guest/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Juan Pérez",
    "mode": "sire",
    "guest_order": 1,
    "sireData": {
      "full_name": "Juan Pérez"
    }
  }')

echo "Response for guest_order=1:"
echo "$RESPONSE_1" | jq '.response' || echo "$RESPONSE_1"
echo ""

echo "3. Testing SIRE chat with guest_order=2 (companion)..."
RESPONSE_2=$(curl -s -X POST "http://localhost:3000/api/guest/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "María García",
    "mode": "sire",
    "guest_order": 2,
    "sireData": {
      "full_name": "María García"
    }
  }')

echo "Response for guest_order=2:"
echo "$RESPONSE_2" | jq '.response' || echo "$RESPONSE_2"
echo ""

echo "4. Verifying database records..."
node .claude/db-query.js "
SELECT
  reservation_id,
  guest_order,
  full_name,
  created_at
FROM reservation_guests
WHERE reservation_id IN (
  SELECT id FROM reservations
  WHERE tenant = '$TENANT'
  AND checkin_date = '$CHECKIN_DATE'
  LIMIT 1
)
ORDER BY guest_order
" | head -20

echo ""
echo "========================================"
echo "✅ Test completed"
echo "========================================"
echo ""
echo "Expected results:"
echo "  - guest_order=1 should create/update record for titular"
echo "  - guest_order=2 should create/update record for companion"
echo "  - Both should be linked to same reservation_id"
