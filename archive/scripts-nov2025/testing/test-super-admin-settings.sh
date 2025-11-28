#!/bin/bash

# Test Super Admin Settings & Users APIs
# Usage: ./scripts/test-super-admin-settings.sh [token]

BASE_URL="http://localhost:3000"

# Get token from arg or prompt user to login first
TOKEN=${1:-}

if [ -z "$TOKEN" ]; then
  echo "❌ No token provided"
  echo "Usage: ./scripts/test-super-admin-settings.sh <token>"
  echo ""
  echo "Get a token by running: ./scripts/test-super-admin-login.js"
  exit 1
fi

echo "🔐 Using token: ${TOKEN:0:20}..."
echo ""

# ============================================================================
# Test 1: GET settings (first time - should create defaults)
# ============================================================================
echo "📊 Test 1: GET settings (initial - should create defaults)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s "$BASE_URL/api/super-admin/settings" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Verificar que los defaults existan
echo "✅ Expected: { settings: { maintenanceMode: false, globalAnnouncement: '', maxFileSize: 10, defaultModel: 'claude-sonnet-4-5' } }"
echo ""
sleep 1

# ============================================================================
# Test 2: POST settings (update)
# ============================================================================
echo "📝 Test 2: POST settings (update)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s "$BASE_URL/api/super-admin/settings" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenanceMode": true,
    "globalAnnouncement": "System maintenance in progress - limited functionality",
    "maxFileSize": 20,
    "defaultModel": "claude-sonnet-4-5"
  }')

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Verificar success
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
  echo "✅ Settings updated successfully"
else
  echo "❌ Failed to update settings"
fi
echo ""
sleep 1

# ============================================================================
# Test 3: GET settings (verify update)
# ============================================================================
echo "🔍 Test 3: GET settings (verify update)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s "$BASE_URL/api/super-admin/settings" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Verificar que maintenanceMode sea true
MAINTENANCE=$(echo "$RESPONSE" | jq -r '.settings.maintenanceMode')
if [ "$MAINTENANCE" == "true" ]; then
  echo "✅ maintenanceMode correctly set to true"
else
  echo "❌ maintenanceMode not updated (expected true, got: $MAINTENANCE)"
fi
echo ""
sleep 1

# ============================================================================
# Test 4: POST settings (validation errors)
# ============================================================================
echo "⚠️  Test 4: POST settings (validation - should fail)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s "$BASE_URL/api/super-admin/settings" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenanceMode": "invalid",
    "globalAnnouncement": "",
    "maxFileSize": 150,
    "defaultModel": "claude-sonnet-4-5"
  }')

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Verificar que retorne error 400
ERROR=$(echo "$RESPONSE" | jq -r '.error')
if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
  echo "✅ Validation working correctly (rejected invalid input)"
else
  echo "❌ Validation NOT working (should have rejected invalid input)"
fi
echo ""
sleep 1

# ============================================================================
# Test 5: GET super admin users
# ============================================================================
echo "👥 Test 5: GET super admin users"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s "$BASE_URL/api/super-admin/users" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$RESPONSE" | jq .
echo ""

# Verificar que retorne array de usuarios
USERS_COUNT=$(echo "$RESPONSE" | jq -r '.users | length')
echo "✅ Found $USERS_COUNT super admin user(s)"

# Verificar que NO incluya password_hash
HAS_PASSWORD=$(echo "$RESPONSE" | jq -r '.users[0].password_hash')
if [ "$HAS_PASSWORD" == "null" ]; then
  echo "✅ Security: password_hash NOT exposed"
else
  echo "❌ SECURITY ISSUE: password_hash is being returned!"
fi
echo ""
sleep 1

# ============================================================================
# Test 6: PATCH user (update is_active)
# ============================================================================
echo "🔧 Test 6: PATCH user (deactivate user)"
echo "-----------------------------------------------------------"

# Obtener el ID del primer usuario
USER_ID=$(echo "$RESPONSE" | jq -r '.users[0].super_admin_id')

if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  echo "❌ No user ID found to test PATCH"
else
  echo "Testing with user ID: $USER_ID"

  RESPONSE=$(curl -s "$BASE_URL/api/super-admin/users/$USER_ID" \
    -X PATCH \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{ "is_active": false }')

  echo "Response:"
  echo "$RESPONSE" | jq .
  echo ""

  # Verificar success
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
  if [ "$SUCCESS" == "true" ]; then
    echo "✅ User deactivated successfully"

    # Re-activar usuario para no romper el sistema
    echo ""
    echo "🔄 Re-activating user..."
    REACTIVATE=$(curl -s "$BASE_URL/api/super-admin/users/$USER_ID" \
      -X PATCH \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{ "is_active": true }')

    REACTIVATE_SUCCESS=$(echo "$REACTIVATE" | jq -r '.success')
    if [ "$REACTIVATE_SUCCESS" == "true" ]; then
      echo "✅ User re-activated successfully"
    fi
  else
    echo "❌ Failed to deactivate user"
  fi
fi
echo ""

# ============================================================================
# Test 7: Verificar archivo JSON (si se usó fallback)
# ============================================================================
echo "📁 Test 7: Check settings JSON file"
echo "-----------------------------------------------------------"
if [ -f "public/config/settings.json" ]; then
  echo "✅ Settings JSON file exists:"
  cat public/config/settings.json | jq .
else
  echo "ℹ️  Settings JSON file not found (may be using database table)"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "============================================================================"
echo "🎉 API Testing Complete!"
echo "============================================================================"
echo ""
echo "Endpoints tested:"
echo "  ✅ GET  /api/super-admin/settings"
echo "  ✅ POST /api/super-admin/settings"
echo "  ✅ GET  /api/super-admin/users"
echo "  ✅ PATCH /api/super-admin/users/[id]"
echo ""
echo "Next steps:"
echo "  1. Verify all tests passed above"
echo "  2. Check server logs for any errors"
echo "  3. Integrate with frontend Settings component"
echo ""
