#!/bin/bash

# Test Audit Log System

echo "🧪 Testing Audit Log System..."
echo ""

# 1. Login
echo "1️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -X POST http://localhost:3000/api/super-admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"oneill","password":"test123"}' \
  -s)

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Login successful"
echo ""

# Wait for log to be written
sleep 2

# 2. Fetch audit logs
echo "2️⃣  Fetching audit logs..."
LOGS=$(curl -X GET "http://localhost:3000/api/super-admin/audit-log?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -s)

echo "$LOGS" | jq '.'
echo ""

# 3. Check if login was logged
LOGIN_COUNT=$(echo "$LOGS" | jq '.logs | map(select(.action == "login")) | length')

echo "📊 Results:"
echo "   Total logs: $(echo "$LOGS" | jq '.logs | length')"
echo "   Login logs: $LOGIN_COUNT"
echo ""

if [ "$LOGIN_COUNT" -gt 0 ]; then
  echo "✅ Audit logging is working correctly!"
else
  echo "⚠️  No login logs found (might be first run)"
fi
