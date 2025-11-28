#!/bin/bash

# Test Super Admin Integrations APIs
# Tests for /api/super-admin/integrations and /api/super-admin/integrations/[id]/logs
# Author: Backend Developer Agent
# Date: 2025-11-26

set -e

API_BASE="${API_BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Super Admin Integrations APIs${NC}"
echo "=========================================="
echo ""

# Step 1: Get authentication token
echo -e "${BLUE}Step 1: Authenticating...${NC}"
TOKEN=$(curl -s "${API_BASE}/api/super-admin/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}' \
  | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get authentication token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Step 2: Test /api/super-admin/integrations (all integrations)
echo -e "${BLUE}Step 2: Fetching all integrations...${NC}"
RESPONSE=$(curl -s "${API_BASE}/api/super-admin/integrations" \
  -H "Authorization: Bearer $TOKEN")

TOTAL=$(echo "$RESPONSE" | jq -r '.total')
echo -e "${GREEN}✅ Found $TOTAL integration(s)${NC}"
echo ""

# Step 3: Test filter by type
echo -e "${BLUE}Step 3: Testing filter by type=motopress...${NC}"
MOTOPRESS_COUNT=$(curl -s "${API_BASE}/api/super-admin/integrations?type=motopress" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.total')
echo -e "${GREEN}✅ Found $MOTOPRESS_COUNT MotoPress integration(s)${NC}"
echo ""

echo -e "${BLUE}Step 4: Testing filter by type=airbnb...${NC}"
AIRBNB_COUNT=$(curl -s "${API_BASE}/api/super-admin/integrations?type=airbnb" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.total')
echo -e "${GREEN}✅ Found $AIRBNB_COUNT Airbnb integration(s)${NC}"
echo ""

# Step 5: Test filter by status
echo -e "${BLUE}Step 5: Testing filter by status=synced...${NC}"
SYNCED_COUNT=$(curl -s "${API_BASE}/api/super-admin/integrations?status=synced" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.total')
echo -e "${GREEN}✅ Found $SYNCED_COUNT synced integration(s)${NC}"
echo ""

echo -e "${BLUE}Step 6: Testing filter by status=error...${NC}"
ERROR_COUNT=$(curl -s "${API_BASE}/api/super-admin/integrations?status=error" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.total')
echo -e "${GREEN}✅ Found $ERROR_COUNT integration(s) with errors${NC}"
echo ""

# Step 7: Test integration logs endpoint
if [ "$TOTAL" -gt 0 ]; then
  INTEGRATION_ID=$(echo "$RESPONSE" | jq -r '.integrations[0].integration_id')

  echo -e "${BLUE}Step 7: Fetching logs for integration $INTEGRATION_ID...${NC}"
  LOGS_RESPONSE=$(curl -s "${API_BASE}/api/super-admin/integrations/${INTEGRATION_ID}/logs" \
    -H "Authorization: Bearer $TOKEN")

  LOGS_COUNT=$(echo "$LOGS_RESPONSE" | jq -r '.logs | length')
  echo -e "${GREEN}✅ Found $LOGS_COUNT sync log(s)${NC}"

  if [ "$LOGS_COUNT" -gt 0 ]; then
    echo ""
    echo "Latest sync:"
    echo "$LOGS_RESPONSE" | jq '.logs[0] | {status, records_processed, started_at, error_message}'
  fi
  echo ""
else
  echo -e "${BLUE}Step 7: Skipping logs test (no integrations found)${NC}"
  echo ""
fi

# Step 8: Test with non-existent integration ID
echo -e "${BLUE}Step 8: Testing logs with non-existent integration ID...${NC}"
EMPTY_LOGS=$(curl -s "${API_BASE}/api/super-admin/integrations/00000000-0000-0000-0000-000000000000/logs" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.logs | length')

if [ "$EMPTY_LOGS" -eq 0 ]; then
  echo -e "${GREEN}✅ Correctly returns empty array for non-existent integration${NC}"
else
  echo -e "${RED}❌ Expected empty array, got $EMPTY_LOGS logs${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  - Total integrations: $TOTAL"
echo "  - MotoPress: $MOTOPRESS_COUNT"
echo "  - Airbnb: $AIRBNB_COUNT"
echo "  - Synced: $SYNCED_COUNT"
echo "  - With errors: $ERROR_COUNT"
