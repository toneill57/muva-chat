#!/bin/bash

# Get example responses from Analytics APIs

BASE_URL="http://localhost:3000"

# Get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/super-admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"rabbitHole0+"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "=== USAGE ANALYTICS (7 days) ==="
curl -s "$BASE_URL/api/super-admin/analytics/usage?days=7" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool | head -35

echo ""
echo "=== TOP TENANTS ==="
curl -s "$BASE_URL/api/super-admin/analytics/top-tenants" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
