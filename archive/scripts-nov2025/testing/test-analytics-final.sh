#!/bin/bash

# Test Analytics APIs for Super Admin Dashboard

set -e

BASE_URL="http://localhost:3000"

echo "Getting super admin token..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/super-admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "Token obtained successfully"
echo ""
echo "=================================="
echo "  Analytics APIs Testing"
echo "=================================="
echo ""

echo "Test 1: Usage Analytics (30 days)"
curl -s "$BASE_URL/api/super-admin/analytics/usage" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  Data points: {len(d[\"data\"])} days'); print(f'  First date: {d[\"data\"][0][\"date\"]}'); print(f'  Last date: {d[\"data\"][-1][\"date\"]}')"
echo ""

echo "Test 2: Usage Analytics (7 days)"
curl -s "$BASE_URL/api/super-admin/analytics/usage?days=7" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  Data points: {len(d[\"data\"])} days')"
echo ""

echo "Test 3: Usage Analytics (90 days)"
curl -s "$BASE_URL/api/super-admin/analytics/usage?days=90" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  Data points: {len(d[\"data\"])} days')"
echo ""

echo "Test 4: Top Tenants (30 days)"
curl -s "$BASE_URL/api/super-admin/analytics/top-tenants" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  Tenants: {len(d[\"data\"])}')"
echo ""

echo "Test 5: Top Tenants (90 days)"
curl -s "$BASE_URL/api/super-admin/analytics/top-tenants?days=90" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'  Tenants: {len(d[\"data\"])}')"
echo ""

echo "Test 6: Invalid days parameter"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/super-admin/analytics/usage?days=15" -H "Authorization: Bearer $TOKEN")
echo "  HTTP Status: $HTTP_CODE (expected 400)"
echo ""

echo "=================================="
echo "  All tests completed!"
echo "=================================="
