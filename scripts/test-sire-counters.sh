#!/bin/bash

# Test SIRE generate-txt endpoint counters
# Verifies that response includes correct breakdown of guests vs lines

echo "=================================="
echo "Testing SIRE TXT Generator Counters"
echo "=================================="
echo ""

# Test configuration
TENANT_ID="muva"
DATE_FROM="2025-12-01"
DATE_TO="2025-12-31"

echo "Request:"
echo "  tenant_id: $TENANT_ID"
echo "  date_from: $DATE_FROM"
echo "  date_to: $DATE_TO"
echo "  movement_type: both"
echo ""

# Make request
RESPONSE=$(curl -s -X POST http://localhost:3000/api/sire/generate-txt \
  -H "Content-Type: application/json" \
  -d "{
    \"tenant_id\": \"$TENANT_ID\",
    \"date_from\": \"$DATE_FROM\",
    \"date_to\": \"$DATE_TO\",
    \"movement_type\": \"both\"
  }")

# Parse response
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
LINE_COUNT=$(echo "$RESPONSE" | jq -r '.line_count')
GUEST_COUNT=$(echo "$RESPONSE" | jq -r '.guest_count')
RESERVATION_COUNT=$(echo "$RESPONSE" | jq -r '.reservation_count')
ENTRY_LINES=$(echo "$RESPONSE" | jq -r '.breakdown.entry_lines')
EXIT_LINES=$(echo "$RESPONSE" | jq -r '.breakdown.exit_lines')
FORMULA=$(echo "$RESPONSE" | jq -r '.breakdown.formula')
EXCLUDED_COUNT=$(echo "$RESPONSE" | jq -r '.excluded_count')

echo "=================================="
echo "Response:"
echo "=================================="
echo ""
echo "Success: $SUCCESS"
echo ""
echo "Counts:"
echo "  Line Count:        $LINE_COUNT"
echo "  Guest Count:       $GUEST_COUNT"
echo "  Reservation Count: $RESERVATION_COUNT"
echo "  Excluded Count:    $EXCLUDED_COUNT"
echo ""
echo "Breakdown:"
echo "  Entry Lines (E):   $ENTRY_LINES"
echo "  Exit Lines (S):    $EXIT_LINES"
echo "  Formula:           $FORMULA"
echo ""

# Validation
echo "=================================="
echo "Validation:"
echo "=================================="
echo ""

TOTAL_CALC=$((ENTRY_LINES + EXIT_LINES))
if [ "$LINE_COUNT" -eq "$TOTAL_CALC" ]; then
  echo "✅ Line count matches entry + exit ($LINE_COUNT = $ENTRY_LINES + $EXIT_LINES)"
else
  echo "❌ Line count mismatch ($LINE_COUNT ≠ $ENTRY_LINES + $EXIT_LINES)"
fi

EXPECTED_LINES=$((GUEST_COUNT * 2))
if [ "$LINE_COUNT" -eq "$EXPECTED_LINES" ]; then
  echo "✅ Line count matches guests x 2 ($LINE_COUNT = $GUEST_COUNT x 2)"
else
  echo "❌ Line count doesn't match guests x 2 ($LINE_COUNT ≠ $GUEST_COUNT x 2)"
fi

if [ "$ENTRY_LINES" -eq "$EXIT_LINES" ]; then
  echo "✅ Entry and exit counts match ($ENTRY_LINES = $EXIT_LINES)"
else
  echo "⚠️  Entry and exit counts differ ($ENTRY_LINES ≠ $EXIT_LINES)"
fi

echo ""
echo "=================================="
echo "Sample TXT Content (first 5 lines):"
echo "=================================="
echo "$RESPONSE" | jq -r '.txt_content' | head -5

echo ""
echo "Done!"
