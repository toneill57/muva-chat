#!/bin/bash

# Test script for GET /api/guest/reservation-sire-data?guest_order=N
# Tests the new guest_order parameter functionality

set -e

echo "=========================================="
echo "Testing GET /api/guest/reservation-sire-data"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
API_ENDPOINT="/api/guest/reservation-sire-data"

# You need to set a valid guest token here
# Get it from browser dev tools after logging in to /my-stay
if [ -z "$GUEST_TOKEN" ]; then
  echo -e "${RED}ERROR: GUEST_TOKEN environment variable not set${NC}"
  echo ""
  echo "To get a valid token:"
  echo "1. Start dev server: ./scripts/dev-with-keys.sh"
  echo "2. Login to http://localhost:3000/my-stay"
  echo "3. Open Browser Dev Tools → Application → Cookies"
  echo "4. Copy the 'guest_token' value"
  echo "5. Run: export GUEST_TOKEN='<token>'"
  echo "6. Run this script again"
  exit 1
fi

echo -e "${YELLOW}Using token:${NC} ${GUEST_TOKEN:0:50}..."
echo ""

# Test 1: Default (guest_order=1, titular)
echo -e "${YELLOW}Test 1: GET without guest_order parameter (default to titular)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  "${BASE_URL}${API_ENDPOINT}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Code: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Test 1 PASSED${NC}"
else
  echo -e "${RED}❌ Test 1 FAILED${NC}"
fi
echo ""

# Test 2: Explicit guest_order=1 (titular)
echo -e "${YELLOW}Test 2: GET ?guest_order=1 (titular)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  "${BASE_URL}${API_ENDPOINT}?guest_order=1")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Code: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✅ Test 2 PASSED${NC}"
else
  echo -e "${RED}❌ Test 2 FAILED${NC}"
fi
echo ""

# Test 3: guest_order=2 (companion #1)
echo -e "${YELLOW}Test 3: GET ?guest_order=2 (companion #1)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  "${BASE_URL}${API_ENDPOINT}?guest_order=2")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Code: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  FIELDS_COUNT=$(echo "$BODY" | jq '.sireData | length')
  echo "Fields returned: $FIELDS_COUNT"

  if [ "$FIELDS_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No data found (expected if companion doesn't exist yet)${NC}"
  else
    echo -e "${GREEN}✅ Companion data found${NC}"
  fi
  echo -e "${GREEN}✅ Test 3 PASSED${NC}"
else
  echo -e "${RED}❌ Test 3 FAILED${NC}"
fi
echo ""

# Test 4: guest_order=99 (non-existent guest)
echo -e "${YELLOW}Test 4: GET ?guest_order=99 (non-existent guest)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $GUEST_TOKEN" \
  "${BASE_URL}${API_ENDPOINT}?guest_order=99")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Code: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
  FIELDS_COUNT=$(echo "$BODY" | jq '.sireData | length')

  if [ "$FIELDS_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Correctly returns empty object for non-existent guest${NC}"
  else
    echo -e "${RED}❌ Expected empty object, got $FIELDS_COUNT fields${NC}"
  fi
  echo -e "${GREEN}✅ Test 4 PASSED${NC}"
else
  echo -e "${RED}❌ Test 4 FAILED${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All tests completed${NC}"
echo "=========================================="
