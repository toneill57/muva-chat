#!/bin/bash
#
# Test script for Super Admin Content Management APIs
# Tests: upload, list, stats, delete
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (ajustar según ambiente)
BASE_URL="http://localhost:3000"

# Test file path - crear un archivo de prueba
TEST_FILE="/tmp/test-muva-content.md"
TEST_CATEGORY="actividades"

echo -e "${YELLOW}=== Super Admin Content Management API Tests ===${NC}\n"

# Crear archivo de prueba
echo "---
type: tourism-activity
destination:
  schema: public
  table: muva_content
metadata:
  source: test-script
  version: 3.0
---

# Test Activity

Test content for API validation.

## Description

This is a test activity for validating the content upload API.

## Features

- Feature 1
- Feature 2
- Feature 3

## Contact

- Email: test@example.com
- Phone: +57 123 456 7890
" > "$TEST_FILE"

echo -e "${GREEN}✓${NC} Test file created: $TEST_FILE"

# Test 1: Stats (before upload)
echo -e "\n${YELLOW}Test 1: GET /api/super-admin/content/stats${NC}"
STATS_BEFORE=$(curl -s "$BASE_URL/api/super-admin/content/stats")
echo "Stats before: $STATS_BEFORE"

# Test 2: Upload
echo -e "\n${YELLOW}Test 2: POST /api/super-admin/content/upload${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/super-admin/content/upload" \
  -F "file=@$TEST_FILE" \
  -F "category=$TEST_CATEGORY")

echo "Upload response:"
echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Check if upload was successful
if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓${NC} Upload successful"
else
  echo -e "${RED}✗${NC} Upload failed"
  exit 1
fi

# Test 3: Stats (after upload)
echo -e "\n${YELLOW}Test 3: GET /api/super-admin/content/stats (after upload)${NC}"
STATS_AFTER=$(curl -s "$BASE_URL/api/super-admin/content/stats")
echo "Stats after:"
echo "$STATS_AFTER" | jq '.' 2>/dev/null || echo "$STATS_AFTER"

# Test 4: List content
echo -e "\n${YELLOW}Test 4: GET /api/super-admin/content/list${NC}"
LIST_RESPONSE=$(curl -s "$BASE_URL/api/super-admin/content/list?category=$TEST_CATEGORY&limit=5")
echo "List response (first 5 items):"
echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"

# Test 5: Search
echo -e "\n${YELLOW}Test 5: GET /api/super-admin/content/list?search=test${NC}"
SEARCH_RESPONSE=$(curl -s "$BASE_URL/api/super-admin/content/list?search=test&limit=3")
echo "Search response:"
echo "$SEARCH_RESPONSE" | jq '.content[] | {title, category}' 2>/dev/null || echo "$SEARCH_RESPONSE"

# Test 6: Delete (opcional - descomentar si quieres probar delete)
# echo -e "\n${YELLOW}Test 6: DELETE /api/super-admin/content/delete${NC}"
# # Extraer ID del primer item
# CONTENT_ID=$(echo "$LIST_RESPONSE" | jq -r '.content[0].id' 2>/dev/null)
# if [ "$CONTENT_ID" != "null" ] && [ -n "$CONTENT_ID" ]; then
#   DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/super-admin/content/delete?id=$CONTENT_ID")
#   echo "Delete response:"
#   echo "$DELETE_RESPONSE" | jq '.' 2>/dev/null || echo "$DELETE_RESPONSE"
# else
#   echo -e "${YELLOW}⚠${NC} No content ID found, skipping delete test"
# fi

# Cleanup
rm -f "$TEST_FILE"
echo -e "\n${GREEN}✓${NC} Test file cleaned up"

echo -e "\n${GREEN}=== All tests completed ===${NC}"
echo -e "\nNext steps:"
echo "1. Check logs for embeddings processing"
echo "2. Verify content in database: SELECT * FROM muva_content WHERE category='$TEST_CATEGORY' ORDER BY created_at DESC LIMIT 5;"
echo "3. Test frontend integration"
