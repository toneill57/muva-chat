#!/bin/bash

# Test script for Super Admin Metrics endpoint
# Usage: ./scripts/test-metrics-endpoint.sh

set -e

echo "======================================"
echo "Super Admin Metrics Endpoint Test"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Unauthorized request (no token)
echo -e "${YELLOW}Test 1: GET /api/super-admin/metrics without token${NC}"
echo "Expected: 401 Unauthorized"
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/super-admin/metrics)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Received 401 as expected"
  echo "Response: $BODY"
else
  echo -e "${RED}✗ FAIL${NC} - Expected 401, got $HTTP_CODE"
  echo "Response: $BODY"
fi
echo ""

# Test 2: Login and get token
echo -e "${YELLOW}Test 2: POST /api/super-admin/login${NC}"
echo "Attempting login with username: oneill"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}')

LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$LOGIN_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Login successful"
  TOKEN=$(echo "$LOGIN_BODY" | jq -r '.token')
  echo "Token obtained (first 50 chars): ${TOKEN:0:50}..."
else
  echo -e "${RED}✗ FAIL${NC} - Login failed with code $LOGIN_HTTP_CODE"
  echo "Response: $LOGIN_BODY"
  exit 1
fi
echo ""

# Test 3: Get metrics with valid token
echo -e "${YELLOW}Test 3: GET /api/super-admin/metrics with valid token${NC}"
METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3000/api/super-admin/metrics \
  -H "Authorization: Bearer $TOKEN")

METRICS_HTTP_CODE=$(echo "$METRICS_RESPONSE" | tail -n1)
METRICS_BODY=$(echo "$METRICS_RESPONSE" | head -n -1)

if [ "$METRICS_HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC} - Metrics retrieved successfully"
  echo "Response:"
  echo "$METRICS_BODY" | jq .

  # Validate response structure
  echo ""
  echo "Validating response structure..."

  TOTAL_TENANTS=$(echo "$METRICS_BODY" | jq -r '.total_tenants')
  ACTIVE_TENANTS=$(echo "$METRICS_BODY" | jq -r '.active_tenants')
  TOTAL_CONVERSATIONS=$(echo "$METRICS_BODY" | jq -r '.total_conversations_30d')
  ACTIVE_USERS=$(echo "$METRICS_BODY" | jq -r '.active_users_30d')
  MUVA_CONTENT=$(echo "$METRICS_BODY" | jq -r '.muva_content_count')
  LAST_UPDATED=$(echo "$METRICS_BODY" | jq -r '.last_updated')

  if [ "$TOTAL_TENANTS" != "null" ] && [ "$ACTIVE_TENANTS" != "null" ] && \
     [ "$TOTAL_CONVERSATIONS" != "null" ] && [ "$ACTIVE_USERS" != "null" ] && \
     [ "$MUVA_CONTENT" != "null" ] && [ "$LAST_UPDATED" != "null" ]; then
    echo -e "${GREEN}✓ All fields present and valid${NC}"
    echo "  - total_tenants: $TOTAL_TENANTS"
    echo "  - active_tenants: $ACTIVE_TENANTS"
    echo "  - total_conversations_30d: $TOTAL_CONVERSATIONS"
    echo "  - active_users_30d: $ACTIVE_USERS"
    echo "  - muva_content_count: $MUVA_CONTENT"
    echo "  - last_updated: $LAST_UPDATED"
  else
    echo -e "${RED}✗ Some fields are missing or null${NC}"
  fi
else
  echo -e "${RED}✗ FAIL${NC} - Expected 200, got $METRICS_HTTP_CODE"
  echo "Response: $METRICS_BODY"
  exit 1
fi
echo ""

echo "======================================"
echo -e "${GREEN}All tests completed!${NC}"
echo "======================================"
