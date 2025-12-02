#!/bin/bash
# Test Accommodation Manual Upload Endpoint
#
# Usage:
#   ./scripts/test-manual-upload.sh [unitId] [environment]
#
# Example:
#   ./scripts/test-manual-upload.sh e82d0d88-xxxx-xxxx-xxxx-xxxxxxxxxxxx staging

set -e

# Configuration
UNIT_ID="${1:-}"
ENVIRONMENT="${2:-staging}"

# Port mapping
if [ "$ENVIRONMENT" = "staging" ]; then
  PORT=3001
  ENV_NAME="STAGING"
elif [ "$ENVIRONMENT" = "production" ]; then
  PORT=3000
  ENV_NAME="PRODUCTION"
else
  echo "❌ Invalid environment: $ENVIRONMENT (must be 'staging' or 'production')"
  exit 1
fi

# Validate unitId
if [ -z "$UNIT_ID" ]; then
  echo "❌ Error: unitId is required"
  echo ""
  echo "Usage: ./scripts/test-manual-upload.sh [unitId] [environment]"
  echo ""
  echo "To find a unit ID, run:"
  echo "  psql \$DATABASE_URL -c \"SELECT id, name FROM accommodation_units LIMIT 5;\""
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📤 TEST MANUAL UPLOAD ENDPOINT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment: $ENV_NAME (port $PORT)"
echo "Unit ID: $UNIT_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create test manual file
TEST_FILE="/tmp/test-manual-$(date +%s).md"
cat > "$TEST_FILE" << 'EOF'
## WiFi Information

Network Name: TestHotel-Guest
Password: Welcome2024!

The WiFi is available throughout the property. If you experience connection issues, please contact reception.

## Check-in Instructions

Check-in time: 3:00 PM
Check-out time: 11:00 AM

Please bring a valid ID and your booking confirmation. Early check-in may be available upon request.

## Amenities

- Free WiFi
- Air conditioning
- Private bathroom
- Mini-fridge
- Coffee maker
- Safe deposit box
- Smart TV with streaming

## Local Recommendations

### Restaurants
- La Parrilla: Traditional Colombian cuisine (5 min walk)
- Café Central: Coffee and breakfast (2 min walk)
- El Marino: Fresh seafood (10 min walk)

### Activities
- City tour: Daily departures at 9 AM
- Beach: 15 minute walk
- Museum: 20 minute walk

## Emergency Contacts

Reception: +57 300 123 4567
Emergency: 123
Police: 112
Medical: 125
EOF

echo "✅ Test file created: $TEST_FILE"
echo ""

# Upload file
echo "📤 Uploading manual..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "http://localhost:$PORT/api/accommodation-manuals/$UNIT_ID" \
  -F "file=@$TEST_FILE" \
  -H "Accept: application/json")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

# Extract response body (all except last line)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Cleanup
rm -f "$TEST_FILE"
echo "🧹 Cleaned up test file"
echo ""

# Validation
if [ "$HTTP_CODE" = "201" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ TEST PASSED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Extract manual_id for verification
  MANUAL_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null || echo "")

  if [ -n "$MANUAL_ID" ] && [ "$MANUAL_ID" != "null" ]; then
    echo ""
    echo "📊 Verify in database:"
    echo "  SELECT * FROM accommodation_manuals WHERE id = '$MANUAL_ID';"
    echo "  SELECT COUNT(*) FROM accommodation_units_manual_chunks WHERE manual_id = '$MANUAL_ID';"
  fi
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ TEST FAILED (HTTP $HTTP_CODE)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
