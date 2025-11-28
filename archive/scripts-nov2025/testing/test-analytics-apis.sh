#!/bin/bash

# Test Analytics APIs for Super Admin Dashboard
# This script tests the two analytics endpoints with authentication

set -e

BASE_URL="http://localhost:3000"

echo "🔐 Step 1: Getting super admin token..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/super-admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}' | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Login response:"
  curl -s -X POST "$BASE_URL/api/super-admin/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"oneill","password":"rabbitHole0+"}'
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:20}..."

echo ""
echo "📊 Step 2: Testing usage analytics (default 30 days)..."
curl -s "$BASE_URL/api/super-admin/analytics/usage" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "📊 Step 3: Testing usage analytics (7 days)..."
curl -s "$BASE_URL/api/super-admin/analytics/usage?days=7" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

echo ""
echo "📊 Step 4: Testing usage analytics (90 days)..."
curl -s "$BASE_URL/api/super-admin/analytics/usage?days=90" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

echo ""
echo "🏆 Step 5: Testing top tenants (default 30 days)..."
curl -s "$BASE_URL/api/super-admin/analytics/top-tenants" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "🏆 Step 6: Testing top tenants (90 days)..."
curl -s "$BASE_URL/api/super-admin/analytics/top-tenants?days=90" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

echo ""
echo "✅ All tests completed!"
