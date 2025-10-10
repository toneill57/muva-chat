#!/bin/bash

# SIRE Endpoints Simple Testing Script
# Tests all 5 SIRE REST API endpoints using test data

set -a && source .env.local && set +a

BASE_URL="http://localhost:3000"
RESERVATION_ID="27e3d2b2-7f15-4952-b686-0cfc7aeb3fd5"
TENANT_ID="b5c45f51-a333-4cdf-ba9d-ad0a17bf79bf"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SIRE Endpoints Testing${NC}"
echo "=========================================="
echo -e "Base URL: ${BASE_URL}"
echo "=========================================="
echo ""

# Function to get staff token
get_staff_token() {
  echo -e "${BLUE}🔑 Getting staff token...${NC}"

  TOKEN=$(curl -s -X POST "${BASE_URL}/api/staff/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin_ceo\",\"password\":\"staff123\",\"tenant_id\":\"${TENANT_ID}\"}" \
    --max-time 5 | jq -r '.data.token // empty' 2>/dev/null)

  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo -e "${YELLOW}⚠️  Staff login failed, using direct DB approach${NC}"
    return 1
  else
    echo -e "${GREEN}✅ Token obtained${NC}"
    echo "$TOKEN"
    return 0
  fi
}

# Get token
TOKEN=$(get_staff_token)
if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get auth token. Exiting.${NC}"
  exit 1
fi

echo ""
echo "=========================================="
echo "Running Endpoint Tests"
echo "=========================================="
echo ""

# Test 1: Access Permission
echo -e "${YELLOW}🧪 Test 1: GET /api/sire/access-permission${NC}"
echo "──────────────────────────────────────"
curl -s "${BASE_URL}/api/sire/access-permission" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed"
echo ""
echo ""

# Test 2: Guest Data
echo -e "${YELLOW}🧪 Test 2: GET /api/sire/guest-data${NC}"
echo "──────────────────────────────────────"
echo "Reservation ID: ${RESERVATION_ID}"
curl -s "${BASE_URL}/api/sire/guest-data?reservation_id=${RESERVATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed"
echo ""
echo ""

# Test 3: Data Completeness
echo -e "${YELLOW}🧪 Test 3: GET /api/sire/data-completeness${NC}"
echo "──────────────────────────────────────"
echo "Reservation ID: ${RESERVATION_ID}"
curl -s "${BASE_URL}/api/sire/data-completeness?reservation_id=${RESERVATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed"
echo ""
echo ""

# Test 4: Statistics
echo -e "${YELLOW}🧪 Test 4: GET /api/sire/statistics${NC}"
echo "──────────────────────────────────────"
START_DATE="2025-01-01"
END_DATE="2025-12-31"
echo "Date range: ${START_DATE} to ${END_DATE}"
curl -s "${BASE_URL}/api/sire/statistics?start_date=${START_DATE}&end_date=${END_DATE}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed"
echo ""
echo ""

# Test 5: Monthly Export
echo -e "${YELLOW}🧪 Test 5: GET /api/sire/monthly-export${NC}"
echo "──────────────────────────────────────"
YEAR="2025"
MONTH="9"
echo "Month: ${YEAR}-${MONTH}"
curl -s "${BASE_URL}/api/sire/monthly-export?year=${YEAR}&month=${MONTH}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed"
echo ""
echo ""

echo "=========================================="
echo -e "${GREEN}✅ All tests completed!${NC}"
echo "=========================================="
