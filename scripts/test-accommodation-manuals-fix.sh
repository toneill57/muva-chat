#!/bin/bash

# Test script for Accommodation Manuals 404 Fix
# Tests all endpoints with subdomain to verify the fix works

set -e

HOST="simmerdown.localhost:3001"
BASE_URL="http://localhost:3001"
UNIT_ID="dfe8772e-93ee-5949-8768-b45ec1b04f8a"

echo "================================================"
echo "🧪 Testing Accommodation Manuals Endpoints"
echo "================================================"
echo ""
echo "Environment: STAGING (hoaiwcueleiemeplrurv)"
echo "Host Header: $HOST"
echo "Unit ID: $UNIT_ID"
echo ""

# Test 1: GET manuals list
echo "📋 TEST 1: GET manuals list"
echo "Endpoint: /api/accommodation-manuals/$UNIT_ID"
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: $HOST" "$BASE_URL/api/accommodation-manuals/$UNIT_ID")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS OK"
  COUNT=$(echo "$BODY" | jq '.data | length')
  echo "   Found $COUNT manuals"
else
  echo "❌ Status: $STATUS FAILED"
  echo "   Response: $BODY"
  exit 1
fi
echo ""

# Test 2: GET chunks of first manual
echo "📄 TEST 2: GET chunks of first manual"
MANUAL_ID=$(echo "$BODY" | jq -r '.data[0].id')
echo "Manual ID: $MANUAL_ID"
echo "Endpoint: /api/accommodation-manuals/$UNIT_ID/$MANUAL_ID/chunks"

RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: $HOST" "$BASE_URL/api/accommodation-manuals/$UNIT_ID/$MANUAL_ID/chunks")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$STATUS" = "200" ]; then
  echo "✅ Status: $STATUS OK"
  CHUNK_COUNT=$(echo "$BODY" | jq '.chunks | length')
  echo "   Found $CHUNK_COUNT chunks"
else
  echo "❌ Status: $STATUS FAILED"
  echo "   Response: $BODY"
  exit 1
fi
echo ""

# Test 3: Verify middleware injects subdomain header
echo "🔍 TEST 3: Verify subdomain detection"
echo "Endpoint: /api/test-subdomain"

RESPONSE=$(curl -s -H "Host: $HOST" "$BASE_URL/api/test-subdomain")
SUBDOMAIN=$(echo "$RESPONSE" | jq -r '.subdomain')

if [ "$SUBDOMAIN" = "simmerdown" ]; then
  echo "✅ Subdomain detected: $SUBDOMAIN"
else
  echo "❌ Subdomain detection failed"
  echo "   Expected: simmerdown"
  echo "   Got: $SUBDOMAIN"
  exit 1
fi
echo ""

# Test 4: Verify API routes are NOT rewritten
echo "🔧 TEST 4: Verify API routes bypass rewrite"
echo "Testing that /api/* routes are NOT rewritten to /:subdomain/api/*"

# This test should succeed (200) not fail with 404
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Host: $HOST" "$BASE_URL/api/test-subdomain")
STATUS=$(echo "$RESPONSE" | tail -1)

if [ "$STATUS" = "200" ]; then
  echo "✅ API route accessible (NOT rewritten)"
  echo "   Confirmed: /api/* routes bypass subdomain rewrite"
else
  echo "❌ API route failed (possibly being rewritten)"
  echo "   Status: $STATUS"
  exit 1
fi
echo ""

echo "================================================"
echo "✅ ALL TESTS PASSED"
echo "================================================"
echo ""
echo "Summary:"
echo "  • GET /api/accommodation-manuals/[unitId] → 200 OK"
echo "  • GET /api/accommodation-manuals/[unitId]/[manualId]/chunks → 200 OK"
echo "  • Subdomain detection → Working"
echo "  • API routes bypass rewrite → Working"
echo ""
echo "The 404 fix is working correctly! ✨"
