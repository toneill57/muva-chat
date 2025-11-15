#!/bin/bash

# Test script for GET /api/accommodation-manuals/[unitId]
# Lists all manuals for a specific accommodation unit

set -e

# Configuration
PORT=${PORT:-3001}  # Default to staging
BASE_URL="http://localhost:${PORT}"
SUBDOMAIN="demo"  # Change to your test subdomain

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Testing Manual List API ===${NC}"
echo "Environment: PORT ${PORT}"
echo "Subdomain: ${SUBDOMAIN}"
echo ""

# Get accommodation units first (to find a valid unitId)
echo -e "${BLUE}Step 1: Fetching accommodation units...${NC}"
UNITS_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/motopress/get-units" \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: ${SUBDOMAIN}" \
  -d '{}')

echo "Units response: ${UNITS_RESPONSE}"
echo ""

# Extract first unit ID (adjust this based on your actual response structure)
UNIT_ID=$(echo "${UNITS_RESPONSE}" | jq -r '.units[0].id // empty')

if [ -z "${UNIT_ID}" ]; then
  echo -e "${RED}Error: No units found. Cannot test manual listing.${NC}"
  echo "Please ensure you have accommodation units in the database."
  exit 1
fi

echo -e "${GREEN}Using unit ID: ${UNIT_ID}${NC}"
echo ""

# Test GET endpoint
echo -e "${BLUE}Step 2: Fetching manuals for unit ${UNIT_ID}...${NC}"
RESPONSE=$(curl -s -X GET \
  "${BASE_URL}/api/accommodation-manuals/${UNIT_ID}" \
  -H "x-tenant-subdomain: ${SUBDOMAIN}")

echo "Response:"
echo "${RESPONSE}" | jq '.'
echo ""

# Validate response
SUCCESS=$(echo "${RESPONSE}" | jq -r '.success // false')

if [ "${SUCCESS}" = "true" ]; then
  MANUAL_COUNT=$(echo "${RESPONSE}" | jq -r '.data | length')
  echo -e "${GREEN}✅ Success! Found ${MANUAL_COUNT} manual(s)${NC}"

  if [ "${MANUAL_COUNT}" -gt 0 ]; then
    echo ""
    echo "Manual details:"
    echo "${RESPONSE}" | jq -r '.data[] | "  - \(.filename) (\(.status), \(.chunk_count) chunks)"'
  fi
else
  ERROR=$(echo "${RESPONSE}" | jq -r '.error // "Unknown error"')
  echo -e "${RED}❌ Failed: ${ERROR}${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
